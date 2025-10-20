package dns

import (
	"context"
	"fmt"
	"net"
	"strings"

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"

	k8splaygroundsv1alpha1 "github.com/k8s-playgrounds/operator/api/v1alpha1"
)

// Manager handles DNS operations for headless services
type Manager struct {
	client client.Client
}

// NewManager creates a new DNS manager
func NewManager(client client.Client) *Manager {
	return &Manager{
		client: client,
	}
}

// TestDNSResolution tests DNS resolution for a headless service
func (m *Manager) TestDNSResolution(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) (*k8splaygroundsv1alpha1.DNSTestResult, error) {
	log := logr.FromContextOrDiscard(ctx)
	
	// Construct service DNS name
	serviceDNS := fmt.Sprintf("%s.%s.svc.%s",
		headlessService.Name,
		headlessService.Namespace,
		headlessService.Spec.DNS.ClusterDomain)

	// Get DNS server
	dnsServer := headlessService.Spec.DNS.DNSServer
	if dnsServer == "" {
		dnsServer = "8.8.8.8" // Default to Google DNS
	}

	// Test service DNS resolution
	resolvedIPs, err := m.resolveDNS(serviceDNS, dnsServer)
	if err != nil {
		return &k8splaygroundsv1alpha1.DNSTestResult{
			ServiceDNS:   serviceDNS,
			ResolvedIPs:  []string{},
			Success:      false,
			ErrorMessage: err.Error(),
		}, nil
	}

	// Test individual pod DNS resolution
	individualPodDNS, err := m.testIndividualPodDNS(ctx, headlessService, dnsServer)
	if err != nil {
		log.Error(err, "failed to test individual pod DNS")
	}

	return &k8splaygroundsv1alpha1.DNSTestResult{
		ServiceDNS:       serviceDNS,
		ResolvedIPs:      resolvedIPs,
		IndividualPodDNS: individualPodDNS,
		Success:          true,
	}, nil
}

// resolveDNS resolves a hostname to IP addresses
func (m *Manager) resolveDNS(hostname, dnsServer string) ([]string, error) {
	// Create a custom resolver
	resolver := &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			d := net.Dialer{}
			return d.DialContext(ctx, network, dnsServer+":53")
		},
	}

	// Resolve the hostname
	ips, err := resolver.LookupIPAddr(context.Background(), hostname)
	if err != nil {
		return nil, err
	}

	// Convert to string slice
	result := make([]string, len(ips))
	for i, ip := range ips {
		result[i] = ip.IP.String()
	}

	return result, nil
}

// testIndividualPodDNS tests DNS resolution for individual pods
func (m *Manager) testIndividualPodDNS(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService, dnsServer string) ([]k8splaygroundsv1alpha1.PodDNSRecord, error) {
	// Get pods that match the selector
	pods := &corev1.PodList{}
	selector := client.MatchingLabels(headlessService.Spec.Selector)
	namespace := client.InNamespace(headlessService.Namespace)
	
	if err := m.client.List(ctx, pods, selector, namespace); err != nil {
		return nil, err
	}

	var podDNSRecords []k8splaygroundsv1alpha1.PodDNSRecord
	
	for _, pod := range pods.Items {
		// Construct individual pod DNS name
		podDNS := fmt.Sprintf("%s.%s.%s.svc.%s",
			pod.Name,
			headlessService.Name,
			headlessService.Namespace,
			headlessService.Spec.DNS.ClusterDomain)

		// Resolve pod DNS
		resolvedIPs, err := m.resolveDNS(podDNS, dnsServer)
		if err != nil {
			continue // Skip failed resolutions
		}

		if len(resolvedIPs) > 0 {
			podDNSRecords = append(podDNSRecords, k8splaygroundsv1alpha1.PodDNSRecord{
				PodName: pod.Name,
				PodIP:   pod.Status.PodIP,
				DNSName: podDNS,
			})
		}
	}

	return podDNSRecords, nil
}

// ConfigureDNSConfigMap creates a ConfigMap with DNS configuration
func (m *Manager) ConfigureDNSConfigMap(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s-dns-config", headlessService.Name),
			Namespace: headlessService.Namespace,
			Labels: map[string]string{
				"app.kubernetes.io/name":     "headless-service-dns",
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
			"service-dns": fmt.Sprintf("%s.%s.svc.%s",
				headlessService.Name,
				headlessService.Namespace,
				headlessService.Spec.DNS.ClusterDomain),
			"cluster-domain": headlessService.Spec.DNS.ClusterDomain,
			"dns-server":     headlessService.Spec.DNS.DNSServer,
			"ttl":            fmt.Sprintf("%d", headlessService.Spec.DNS.TTL),
		},
	}

	// Create or update the ConfigMap
	if err := m.client.Create(ctx, configMap); err != nil {
		if !strings.Contains(err.Error(), "already exists") {
			return err
		}
		// Update existing ConfigMap
		existingConfigMap := &corev1.ConfigMap{}
		if err := m.client.Get(ctx, types.NamespacedName{Name: configMap.Name, Namespace: configMap.Namespace}, existingConfigMap); err != nil {
			return err
		}
		existingConfigMap.Data = configMap.Data
		return m.client.Update(ctx, existingConfigMap)
	}

	return nil
}

// ValidateDNSConfiguration validates DNS configuration
func (m *Manager) ValidateDNSConfiguration(headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	if headlessService.Spec.DNS == nil {
		return fmt.Errorf("DNS configuration is required")
	}

	if headlessService.Spec.DNS.ClusterDomain == "" {
		return fmt.Errorf("cluster domain is required")
	}

	if headlessService.Spec.DNS.TTL < 0 {
		return fmt.Errorf("TTL must be non-negative")
	}

	return nil
}

// GetServiceEndpoints returns the endpoints for a headless service
func (m *Manager) GetServiceEndpoints(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) ([]string, error) {
	// Get the endpoints for the service
	endpoints := &corev1.Endpoints{}
	if err := m.client.Get(ctx, types.NamespacedName{
		Name:      headlessService.Name,
		Namespace: headlessService.Namespace,
	}, endpoints); err != nil {
		return nil, err
	}

	var endpointIPs []string
	for _, subset := range endpoints.Subsets {
		for _, address := range subset.Addresses {
			endpointIPs = append(endpointIPs, address.IP)
		}
	}

	return endpointIPs, nil
}

// CreateDNSTestPod creates a pod for testing DNS resolution
func (m *Manager) CreateDNSTestPod(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s-dns-test", headlessService.Name),
			Namespace: headlessService.Namespace,
			Labels: map[string]string{
				"app.kubernetes.io/name":     "dns-test",
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
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{
				{
					Name:    "dns-test",
					Image:   "busybox:1.35",
					Command: []string{"sleep", "3600"},
				},
			},
			RestartPolicy: corev1.RestartPolicyNever,
		},
	}

	return m.client.Create(ctx, pod)
}

// CleanupDNSTestPod cleans up the DNS test pod
func (m *Manager) CleanupDNSTestPod(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      fmt.Sprintf("%s-dns-test", headlessService.Name),
			Namespace: headlessService.Namespace,
		},
	}

	return m.client.Delete(ctx, pod)
}
