package iptables

import (
	"context"
	"fmt"
	"strings"

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	k8splaygroundsv1alpha1 "github.com/k8s-playgrounds/operator/api/v1alpha1"
)

// Manager handles iptables operations for headless services
type Manager struct {
	client client.Client
}

// NewManager creates a new iptables manager
func NewManager(client client.Client) *Manager {
	return &Manager{
		client: client,
	}
}

// ConfigureHeadlessService configures iptables rules for a headless service
func (m *Manager) ConfigureHeadlessService(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	log := logr.FromContextOrDiscard(ctx)
	
	if headlessService.Spec.IptablesProxy == nil || !headlessService.Spec.IptablesProxy.Enabled {
		log.Info("iptables proxy is disabled, skipping configuration")
		return nil
	}

	// Get the service endpoints
	endpointIPs, err := m.getServiceEndpoints(ctx, headlessService)
	if err != nil {
		return fmt.Errorf("failed to get service endpoints: %w", err)
	}

	if len(endpointIPs) == 0 {
		log.Info("no endpoints found, skipping iptables configuration")
		return nil
	}

	// Generate iptables rules
	rules := m.generateIptablesRules(headlessService, endpointIPs)

	// Create a ConfigMap with the iptables rules
	if err := m.createIptablesConfigMap(ctx, headlessService, rules); err != nil {
		return fmt.Errorf("failed to create iptables ConfigMap: %w", err)
	}

	// Create a DaemonSet to apply the iptables rules
	if err := m.createIptablesDaemonSet(ctx, headlessService); err != nil {
		return fmt.Errorf("failed to create iptables DaemonSet: %w", err)
	}

	log.Info("successfully configured iptables proxy", 
		"service", headlessService.Name,
		"endpoints", len(endpointIPs),
		"algorithm", headlessService.Spec.IptablesProxy.LoadBalancingAlgorithm)

	return nil
}

// getServiceEndpoints returns the IP addresses of service endpoints
func (m *Manager) getServiceEndpoints(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) ([]string, error) {
	// Get pods that match the selector
	pods := &corev1.PodList{}
	selector := client.MatchingLabels(headlessService.Spec.Selector)
	namespace := client.InNamespace(headlessService.Namespace)
	
	if err := m.client.List(ctx, pods, selector, namespace); err != nil {
		return nil, err
	}

	var endpointIPs []string
	for _, pod := range pods.Items {
		if pod.Status.PodIP != "" {
			endpointIPs = append(endpointIPs, pod.Status.PodIP)
		}
	}

	return endpointIPs, nil
}

// generateIptablesRules generates iptables rules for the headless service
func (m *Manager) generateIptablesRules(headlessService *k8splaygroundsv1alpha1.HeadlessService, endpointIPs []string) []string {
	var rules []string
	
	// Service DNS name
	serviceDNS := fmt.Sprintf("%s.%s.svc.cluster.local", headlessService.Name, headlessService.Namespace)
	
	// Generate rules for each port
	for _, port := range headlessService.Spec.Ports {
		// PREROUTING rule to capture traffic
		rule := fmt.Sprintf("iptables -t nat -A PREROUTING -d %s -p %s --dport %d -j DNAT --to-destination %s:%d",
			serviceDNS,
			strings.ToLower(port.Protocol),
			port.Port,
			endpointIPs[0], // Use first endpoint for now
			port.TargetPort.IntValue())
		rules = append(rules, rule)
		
		// OUTPUT rule for local traffic
		rule = fmt.Sprintf("iptables -t nat -A OUTPUT -d %s -p %s --dport %d -j DNAT --to-destination %s:%d",
			serviceDNS,
			strings.ToLower(port.Protocol),
			port.Port,
			endpointIPs[0], // Use first endpoint for now
			port.TargetPort.IntValue())
		rules = append(rules, rule)
		
		// Load balancing rules based on algorithm
		switch headlessService.Spec.IptablesProxy.LoadBalancingAlgorithm {
		case "round-robin":
			rules = append(rules, m.generateRoundRobinRules(serviceDNS, port, endpointIPs)...)
		case "least-connections":
			rules = append(rules, m.generateLeastConnectionsRules(serviceDNS, port, endpointIPs)...)
		case "random":
		default:
			rules = append(rules, m.generateRandomRules(serviceDNS, port, endpointIPs)...)
		}
	}

	return rules
}

// generateRoundRobinRules generates round-robin load balancing rules
func (m *Manager) generateRoundRobinRules(serviceDNS string, port k8splaygroundsv1alpha1.ServicePort, endpointIPs []string) []string {
	var rules []string
	
	// Create a chain for round-robin
	chainName := fmt.Sprintf("ROUND_ROBIN_%s_%d", strings.ToUpper(serviceDNS), port.Port)
	rules = append(rules, fmt.Sprintf("iptables -t nat -N %s", chainName))
	
	// Add rules for each endpoint
	for i, endpointIP := range endpointIPs {
		rule := fmt.Sprintf("iptables -t nat -A %s -m statistic --mode nth --every %d --packet 0 -j DNAT --to-destination %s:%d",
			chainName,
			len(endpointIPs),
			endpointIP,
			port.TargetPort.IntValue())
		rules = append(rules, rule)
	}
	
	// Default rule
	rules = append(rules, fmt.Sprintf("iptables -t nat -A %s -j DNAT --to-destination %s:%d",
		chainName,
		endpointIPs[0],
		port.TargetPort.IntValue()))
	
	return rules
}

// generateLeastConnectionsRules generates least-connections load balancing rules
func (m *Manager) generateLeastConnectionsRules(serviceDNS string, port k8splaygroundsv1alpha1.ServicePort, endpointIPs []string) []string {
	var rules []string
	
	// Create a chain for least connections
	chainName := fmt.Sprintf("LEAST_CONN_%s_%d", strings.ToUpper(serviceDNS), port.Port)
	rules = append(rules, fmt.Sprintf("iptables -t nat -N %s", chainName))
	
	// Add rules for each endpoint with connection tracking
	for _, endpointIP := range endpointIPs {
		rule := fmt.Sprintf("iptables -t nat -A %s -m conntrack --ctstate NEW -j DNAT --to-destination %s:%d",
			chainName,
			endpointIP,
			port.TargetPort.IntValue())
		rules = append(rules, rule)
	}
	
	return rules
}

// generateRandomRules generates random load balancing rules
func (m *Manager) generateRandomRules(serviceDNS string, port k8splaygroundsv1alpha1.ServicePort, endpointIPs []string) []string {
	var rules []string
	
	// Create a chain for random selection
	chainName := fmt.Sprintf("RANDOM_%s_%d", strings.ToUpper(serviceDNS), port.Port)
	rules = append(rules, fmt.Sprintf("iptables -t nat -N %s", chainName))
	
	// Add rules for each endpoint with random probability
	for i, endpointIP := range endpointIPs {
		probability := 1.0 / float64(len(endpointIPs))
		rule := fmt.Sprintf("iptables -t nat -A %s -m random --probability %.3f -j DNAT --to-destination %s:%d",
			chainName,
			probability,
			endpointIP,
			port.TargetPort.IntValue())
		rules = append(rules, rule)
	}
	
	return rules
}

// createIptablesConfigMap creates a ConfigMap with iptables rules
func (m *Manager) createIptablesConfigMap(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService, rules []string) error {
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s-iptables-rules", headlessService.Name),
			Namespace: headlessService.Namespace,
			Labels: map[string]string{
				"app.kubernetes.io/name":     "headless-service-iptables",
				"app.kubernetes.io/instance": headlessService.Name,
			},
			OwnerReferences: []metav1.OwnerReference{
				{
					APIVersion: headlessService.APIVersion,
					Kind:       headlessService.Kind,
					Name:       headlessService.Name,
					UID:        headlessService.UID,
					Controller: &[]bool{true}[0],
				},
			},
		},
		Data: map[string]string{
			"rules.sh": strings.Join(rules, "\n"),
			"service":   headlessService.Name,
			"namespace": headlessService.Namespace,
		},
	}

	return m.client.Create(ctx, configMap)
}

// createIptablesDaemonSet creates a DaemonSet to apply iptables rules
func (m *Manager) createIptablesDaemonSet(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	daemonSet := &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s-iptables", headlessService.Name),
			Namespace: headlessService.Namespace,
			Labels: map[string]string{
				"app.kubernetes.io/name":     "headless-service-iptables",
				"app.kubernetes.io/instance": headlessService.Name,
			},
			OwnerReferences: []metav1.OwnerReference{
				{
					APIVersion: headlessService.APIVersion,
					Kind:       headlessService.Kind,
					Name:       headlessService.Name,
					UID:        headlessService.UID,
					Controller: &[]bool{true}[0],
				},
			},
		},
		Spec: appsv1.DaemonSetSpec{
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app.kubernetes.io/name":     "headless-service-iptables",
					"app.kubernetes.io/instance": headlessService.Name,
				},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app.kubernetes.io/name":     "headless-service-iptables",
						"app.kubernetes.io/instance": headlessService.Name,
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "iptables-manager",
							Image: "alpine:3.18",
							Command: []string{"/bin/sh"},
							Args: []string{
								"-c",
								"apk add --no-cache iptables && /iptables-rules/rules.sh && sleep infinity",
							},
							VolumeMounts: []corev1.VolumeMount{
								{
									Name:      "iptables-rules",
									MountPath: "/iptables-rules",
									ReadOnly:  true,
								},
							},
							SecurityContext: &corev1.SecurityContext{
								Privileged: &[]bool{true}[0],
								Capabilities: &corev1.Capabilities{
									Add: []corev1.Capability{"NET_ADMIN"},
								},
							},
						},
					},
					Volumes: []corev1.Volume{
						{
							Name: "iptables-rules",
							VolumeSource: corev1.VolumeSource{
								ConfigMap: &corev1.ConfigMapVolumeSource{
									LocalObjectReference: corev1.LocalObjectReference{
										Name: fmt.Sprintf("%s-iptables-rules", headlessService.Name),
									},
								},
							},
						},
					},
					HostNetwork: true,
					Tolerations: []corev1.Toleration{
						{
							Effect: corev1.TaintEffectNoSchedule,
						},
					},
				},
			},
		},
	}

	return m.client.Create(ctx, daemonSet)
}

// CleanupHeadlessService removes iptables rules for a headless service
func (m *Manager) CleanupHeadlessService(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	log := logr.FromContextOrDiscard(ctx)
	
	// Delete the DaemonSet
	daemonSet := &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s-iptables", headlessService.Name),
			Namespace: headlessService.Namespace,
		},
	}
	
	if err := m.client.Delete(ctx, daemonSet); err != nil {
		log.Error(err, "failed to delete iptables DaemonSet")
	}

	// Delete the ConfigMap
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s-iptables-rules", headlessService.Name),
			Namespace: headlessService.Namespace,
		},
	}
	
	if err := m.client.Delete(ctx, configMap); err != nil {
		log.Error(err, "failed to delete iptables ConfigMap")
	}

	log.Info("cleaned up iptables rules", "service", headlessService.Name)
	return nil
}

// ValidateIptablesConfiguration validates iptables configuration
func (m *Manager) ValidateIptablesConfiguration(headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	if headlessService.Spec.IptablesProxy == nil {
		return fmt.Errorf("iptables proxy configuration is required")
	}

	if headlessService.Spec.IptablesProxy.LoadBalancingAlgorithm == "" {
		return fmt.Errorf("load balancing algorithm is required")
	}

	validAlgorithms := []string{"random", "round-robin", "least-connections"}
	for _, algorithm := range validAlgorithms {
		if headlessService.Spec.IptablesProxy.LoadBalancingAlgorithm == algorithm {
			return nil
		}
	}

	return fmt.Errorf("invalid load balancing algorithm: %s", headlessService.Spec.IptablesProxy.LoadBalancingAlgorithm)
}
