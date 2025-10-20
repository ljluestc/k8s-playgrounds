package servicediscovery

import (
	"context"
	"fmt"
	"time"

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	k8splaygroundsv1alpha1 "github.com/k8s-playgrounds/operator/api/v1alpha1"
)

// Manager handles service discovery operations for headless services
type Manager struct {
	client client.Client
}

// NewManager creates a new service discovery manager
func NewManager(client client.Client) *Manager {
	return &Manager{
		client: client,
	}
}

// ConfigureDNSDiscovery configures DNS-based service discovery
func (m *Manager) ConfigureDNSDiscovery(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	log := logr.FromContextOrDiscard(ctx)
	
	// Create a ConfigMap with DNS discovery configuration
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s-dns-discovery", headlessService.Name),
			Namespace: headlessService.Namespace,
			Labels: map[string]string{
				"app.kubernetes.io/name":     "headless-service-discovery",
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
			"discovery-type":     "dns",
			"service-name":       headlessService.Name,
			"namespace":          headlessService.Namespace,
			"cluster-domain":     headlessService.Spec.DNS.ClusterDomain,
			"refresh-interval":   fmt.Sprintf("%d", headlessService.Spec.ServiceDiscovery.RefreshInterval),
			"dns-server":         headlessService.Spec.DNS.DNSServer,
		},
	}

	if err := m.client.Create(ctx, configMap); err != nil {
		return fmt.Errorf("failed to create DNS discovery ConfigMap: %w", err)
	}

	// Create a service discovery pod
	if err := m.createServiceDiscoveryPod(ctx, headlessService, "dns"); err != nil {
		return fmt.Errorf("failed to create service discovery pod: %w", err)
	}

	log.Info("configured DNS service discovery", "service", headlessService.Name)
	return nil
}

// ConfigureAPIDiscovery configures API-based service discovery
func (m *Manager) ConfigureAPIDiscovery(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	log := logr.FromContextOrDiscard(ctx)
	
	// Create a ConfigMap with API discovery configuration
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s-api-discovery", headlessService.Name),
			Namespace: headlessService.Namespace,
			Labels: map[string]string{
				"app.kubernetes.io/name":     "headless-service-discovery",
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
			"discovery-type":   "api",
			"service-name":     headlessService.Name,
			"namespace":        headlessService.Namespace,
			"refresh-interval": fmt.Sprintf("%d", headlessService.Spec.ServiceDiscovery.RefreshInterval),
			"api-endpoint":     fmt.Sprintf("https://kubernetes.default.svc.cluster.local/api/v1/namespaces/%s/endpoints/%s", headlessService.Namespace, headlessService.Name),
		},
	}

	if err := m.client.Create(ctx, configMap); err != nil {
		return fmt.Errorf("failed to create API discovery ConfigMap: %w", err)
	}

	// Create a service discovery pod
	if err := m.createServiceDiscoveryPod(ctx, headlessService, "api"); err != nil {
		return fmt.Errorf("failed to create service discovery pod: %w", err)
	}

	log.Info("configured API service discovery", "service", headlessService.Name)
	return nil
}

// ConfigureCustomDiscovery configures custom service discovery
func (m *Manager) ConfigureCustomDiscovery(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	log := logr.FromContextOrDiscard(ctx)
	
	// Create a ConfigMap with custom discovery configuration
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s-custom-discovery", headlessService.Name),
			Namespace: headlessService.Namespace,
			Labels: map[string]string{
				"app.kubernetes.io/name":     "headless-service-discovery",
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
			"discovery-type":     "custom",
			"service-name":       headlessService.Name,
			"namespace":          headlessService.Namespace,
			"refresh-interval":   fmt.Sprintf("%d", headlessService.Spec.ServiceDiscovery.RefreshInterval),
			"custom-endpoint":    headlessService.Spec.ServiceDiscovery.CustomEndpoint,
		},
	}

	// Add custom configuration
	for key, value := range headlessService.Spec.ServiceDiscovery.Config {
		configMap.Data[fmt.Sprintf("custom-%s", key)] = value
	}

	if err := m.client.Create(ctx, configMap); err != nil {
		return fmt.Errorf("failed to create custom discovery ConfigMap: %w", err)
	}

	// Create a service discovery pod
	if err := m.createServiceDiscoveryPod(ctx, headlessService, "custom"); err != nil {
		return fmt.Errorf("failed to create service discovery pod: %w", err)
	}

	log.Info("configured custom service discovery", "service", headlessService.Name)
	return nil
}

// createServiceDiscoveryPod creates a pod for service discovery
func (m *Manager) createServiceDiscoveryPod(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService, discoveryType string) error {
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s-discovery-%s", headlessService.Name, discoveryType),
			Namespace: headlessService.Namespace,
			Labels: map[string]string{
				"app.kubernetes.io/name":     "headless-service-discovery",
				"app.kubernetes.io/instance": headlessService.Name,
				"discovery-type":             discoveryType,
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
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{
				{
					Name:  "service-discovery",
					Image: "alpine:3.18",
					Command: []string{"/bin/sh"},
					Args: []string{
						"-c",
						m.getDiscoveryScript(discoveryType, headlessService),
					},
					Env: []corev1.EnvVar{
						{
							Name: "SERVICE_NAME",
							ValueFrom: &corev1.EnvVarSource{
								FieldRef: &corev1.ObjectFieldSelector{
									FieldPath: "metadata.labels['app.kubernetes.io/instance']",
								},
							},
						},
						{
							Name: "NAMESPACE",
							ValueFrom: &corev1.EnvVarSource{
								FieldRef: &corev1.ObjectFieldSelector{
									FieldPath: "metadata.namespace",
								},
							},
						},
					},
					VolumeMounts: []corev1.VolumeMount{
						{
							Name:      "discovery-config",
							MountPath: "/etc/discovery",
							ReadOnly:  true,
						},
					},
					Resources: corev1.ResourceRequirements{
						Requests: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("10m"),
							corev1.ResourceMemory: resource.MustParse("32Mi"),
						},
						Limits: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("100m"),
							corev1.ResourceMemory: resource.MustParse("128Mi"),
						},
					},
				},
			},
			Volumes: []corev1.Volume{
				{
					Name: "discovery-config",
					VolumeSource: corev1.VolumeSource{
						ConfigMap: &corev1.ConfigMapVolumeSource{
							LocalObjectReference: corev1.LocalObjectReference{
								Name: fmt.Sprintf("%s-%s-discovery", headlessService.Name, discoveryType),
							},
						},
					},
				},
			},
			RestartPolicy: corev1.RestartPolicyAlways,
		},
	}

	return m.client.Create(ctx, pod)
}

// getDiscoveryScript returns the appropriate discovery script based on type
func (m *Manager) getDiscoveryScript(discoveryType string, headlessService *k8splaygroundsv1alpha1.HeadlessService) string {
	switch discoveryType {
	case "dns":
		return `
			apk add --no-cache curl jq
			REFRESH_INTERVAL=$(cat /etc/discovery/refresh-interval)
			SERVICE_NAME=$(cat /etc/discovery/service-name)
			NAMESPACE=$(cat /etc/discovery/namespace)
			CLUSTER_DOMAIN=$(cat /etc/discovery/cluster-domain)
			
			while true; do
				echo "Performing DNS discovery for $SERVICE_NAME..."
				nslookup $SERVICE_NAME.$NAMESPACE.svc.$CLUSTER_DOMAIN
				sleep $REFRESH_INTERVAL
			done
		`
	case "api":
		return `
			apk add --no-cache curl jq
			REFRESH_INTERVAL=$(cat /etc/discovery/refresh-interval)
			API_ENDPOINT=$(cat /etc/discovery/api-endpoint)
			
			while true; do
				echo "Performing API discovery..."
				curl -k -H "Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" $API_ENDPOINT | jq '.subsets[].addresses[].ip'
				sleep $REFRESH_INTERVAL
			done
		`
	case "custom":
		return `
			apk add --no-cache curl jq
			REFRESH_INTERVAL=$(cat /etc/discovery/refresh-interval)
			CUSTOM_ENDPOINT=$(cat /etc/discovery/custom-endpoint)
			
			while true; do
				echo "Performing custom discovery..."
				curl -k $CUSTOM_ENDPOINT
				sleep $REFRESH_INTERVAL
			done
		`
	default:
		return "echo 'Unknown discovery type' && sleep 3600"
	}
}

// Cleanup removes service discovery resources
func (m *Manager) Cleanup(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	log := logr.FromContextOrDiscard(ctx)
	
	// Delete discovery pods
	pods := &corev1.PodList{}
	selector := client.MatchingLabels{
		"app.kubernetes.io/name":     "headless-service-discovery",
		"app.kubernetes.io/instance": headlessService.Name,
	}
	namespace := client.InNamespace(headlessService.Namespace)
	
	if err := m.client.List(ctx, pods, selector, namespace); err != nil {
		log.Error(err, "failed to list discovery pods")
	} else {
		for _, pod := range pods.Items {
			if err := m.client.Delete(ctx, &pod); err != nil {
				log.Error(err, "failed to delete discovery pod", "pod", pod.Name)
			}
		}
	}

	// Delete discovery ConfigMaps
	configMaps := &corev1.ConfigMapList{}
	selector = client.MatchingLabels{
		"app.kubernetes.io/name":     "headless-service-discovery",
		"app.kubernetes.io/instance": headlessService.Name,
	}
	
	if err := m.client.List(ctx, configMaps, selector, namespace); err != nil {
		log.Error(err, "failed to list discovery ConfigMaps")
	} else {
		for _, configMap := range configMaps.Items {
			if err := m.client.Delete(ctx, &configMap); err != nil {
				log.Error(err, "failed to delete discovery ConfigMap", "configmap", configMap.Name)
			}
		}
	}

	log.Info("cleaned up service discovery resources", "service", headlessService.Name)
	return nil
}

// ValidateServiceDiscoveryConfiguration validates service discovery configuration
func (m *Manager) ValidateServiceDiscoveryConfiguration(headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	if headlessService.Spec.ServiceDiscovery == nil {
		return fmt.Errorf("service discovery configuration is required")
	}

	if headlessService.Spec.ServiceDiscovery.Type == "" {
		return fmt.Errorf("service discovery type is required")
	}

	validTypes := []string{"dns", "api", "custom"}
	for _, validType := range validTypes {
		if headlessService.Spec.ServiceDiscovery.Type == validType {
			break
		}
		if validType == validTypes[len(validTypes)-1] {
			return fmt.Errorf("invalid service discovery type: %s", headlessService.Spec.ServiceDiscovery.Type)
		}
	}

	if headlessService.Spec.ServiceDiscovery.Type == "custom" && headlessService.Spec.ServiceDiscovery.CustomEndpoint == "" {
		return fmt.Errorf("custom endpoint is required for custom service discovery")
	}

	if headlessService.Spec.ServiceDiscovery.RefreshInterval < 0 {
		return fmt.Errorf("refresh interval must be non-negative")
	}

	return nil
}

// GetDiscoveredEndpoints returns the currently discovered endpoints
func (m *Manager) GetDiscoveredEndpoints(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) ([]string, error) {
	// This would typically read from a shared storage or API
	// For now, we'll return the endpoints from the service
	pods := &corev1.PodList{}
	selector := client.MatchingLabels(headlessService.Spec.Selector)
	namespace := client.InNamespace(headlessService.Namespace)
	
	if err := m.client.List(ctx, pods, selector, namespace); err != nil {
		return nil, err
	}

	var endpoints []string
	for _, pod := range pods.Items {
		if pod.Status.PodIP != "" {
			endpoints = append(endpoints, pod.Status.PodIP)
		}
	}

	return endpoints, nil
}
