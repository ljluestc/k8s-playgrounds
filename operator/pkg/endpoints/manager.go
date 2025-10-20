package endpoints

import (
	"context"
	"fmt"

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"

	k8splaygroundsv1alpha1 "github.com/k8s-playgrounds/operator/api/v1alpha1"
)

// Manager handles endpoint operations for headless services
type Manager struct {
	client client.Client
}

// NewManager creates a new endpoints manager
func NewManager(client client.Client) *Manager {
	return &Manager{
		client: client,
	}
}

// GetMatchingPods returns pods that match the headless service selector
func (m *Manager) GetMatchingPods(ctx context.Context, namespace string, selector map[string]string) ([]corev1.Pod, error) {
	log := logr.FromContextOrDiscard(ctx)
	
	pods := &corev1.PodList{}
	selectorClient := client.MatchingLabels(selector)
	namespaceClient := client.InNamespace(namespace)
	
	if err := m.client.List(ctx, pods, selectorClient, namespaceClient); err != nil {
		return nil, fmt.Errorf("failed to list pods: %w", err)
	}

	log.Info("found matching pods", "count", len(pods.Items), "selector", selector)
	return pods.Items, nil
}

// CreateEndpoints creates or updates endpoints for a headless service
func (m *Manager) CreateEndpoints(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService, pods []corev1.Pod) (*corev1.Endpoints, error) {
	log := logr.FromContextOrDiscard(ctx)
	
	// Create endpoint addresses from pods
	var addresses []corev1.EndpointAddress
	for _, pod := range pods {
		if pod.Status.PodIP == "" {
			continue // Skip pods without IP
		}
		
		address := corev1.EndpointAddress{
			IP: pod.Status.PodIP,
			TargetRef: &corev1.ObjectReference{
				Kind:      "Pod",
				Namespace: pod.Namespace,
				Name:      pod.Name,
				UID:       pod.UID,
			},
		}
		
		// Add node name if available
		if pod.Spec.NodeName != "" {
			address.NodeName = &pod.Spec.NodeName
		}
		
		addresses = append(addresses, address)
	}

	// Create endpoint ports from service ports
	var ports []corev1.EndpointPort
	for _, servicePort := range headlessService.Spec.Ports {
		port := corev1.EndpointPort{
			Name:     servicePort.Name,
			Port:     servicePort.Port,
			Protocol: corev1.Protocol(servicePort.Protocol),
		}
		ports = append(ports, port)
	}

	// Create the endpoints object
	endpoints := &corev1.Endpoints{
		ObjectMeta: metav1.ObjectMeta{
			Name:      headlessService.Name,
			Namespace: headlessService.Namespace,
			Labels: map[string]string{
				"app.kubernetes.io/name":     "headless-service-endpoints",
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
		Subsets: []corev1.EndpointSubset{
			{
				Addresses: addresses,
				Ports:     ports,
			},
		},
	}

	// Check if endpoints already exist
	existingEndpoints := &corev1.Endpoints{}
	err := m.client.Get(ctx, types.NamespacedName{
		Name:      endpoints.Name,
		Namespace: endpoints.Namespace,
	}, existingEndpoints)

	if err != nil {
		// Create new endpoints
		if err := m.client.Create(ctx, endpoints); err != nil {
			return nil, fmt.Errorf("failed to create endpoints: %w", err)
		}
		log.Info("created new endpoints", "name", endpoints.Name, "addresses", len(addresses))
	} else {
		// Update existing endpoints
		existingEndpoints.Subsets = endpoints.Subsets
		existingEndpoints.Labels = endpoints.Labels
		
		if err := m.client.Update(ctx, existingEndpoints); err != nil {
			return nil, fmt.Errorf("failed to update endpoints: %w", err)
		}
		log.Info("updated existing endpoints", "name", endpoints.Name, "addresses", len(addresses))
	}

	return endpoints, nil
}

// GetEndpoints returns the current endpoints for a headless service
func (m *Manager) GetEndpoints(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) (*corev1.Endpoints, error) {
	endpoints := &corev1.Endpoints{}
	if err := m.client.Get(ctx, types.NamespacedName{
		Name:      headlessService.Name,
		Namespace: headlessService.Namespace,
	}, endpoints); err != nil {
		return nil, err
	}
	return endpoints, nil
}

// GetEndpointIPs returns the IP addresses of endpoints
func (m *Manager) GetEndpointIPs(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) ([]string, error) {
	endpoints, err := m.GetEndpoints(ctx, headlessService)
	if err != nil {
		return nil, err
	}

	var ips []string
	for _, subset := range endpoints.Subsets {
		for _, address := range subset.Addresses {
			ips = append(ips, address.IP)
		}
	}

	return ips, nil
}

// IsEndpointReady checks if an endpoint is ready
func (m *Manager) IsEndpointReady(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService, podIP string) (bool, error) {
	endpoints, err := m.GetEndpoints(ctx, headlessService)
	if err != nil {
		return false, err
	}

	for _, subset := range endpoints.Subsets {
		for _, address := range subset.Addresses {
			if address.IP == podIP {
				return true, nil
			}
		}
	}

	return false, nil
}

// UpdateEndpointStatus updates the status of an endpoint
func (m *Manager) UpdateEndpointStatus(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService, podIP string, ready bool) error {
	endpoints, err := m.GetEndpoints(ctx, headlessService)
	if err != nil {
		return err
	}

	// Find and update the endpoint
	for i, subset := range endpoints.Subsets {
		for j, address := range subset.Addresses {
			if address.IP == podIP {
				if ready {
					// Move to ready addresses
					endpoints.Subsets[i].Addresses = append(endpoints.Subsets[i].Addresses, address)
					// Remove from not ready addresses
					endpoints.Subsets[i].NotReadyAddresses = append(
						endpoints.Subsets[i].NotReadyAddresses[:j],
						endpoints.Subsets[i].NotReadyAddresses[j+1:]...,
					)
				} else {
					// Move to not ready addresses
					endpoints.Subsets[i].NotReadyAddresses = append(endpoints.Subsets[i].NotReadyAddresses, address)
					// Remove from ready addresses
					endpoints.Subsets[i].Addresses = append(
						endpoints.Subsets[i].Addresses[:j],
						endpoints.Subsets[i].Addresses[j+1:]...,
					)
				}
				break
			}
		}
	}

	return m.client.Update(ctx, endpoints)
}

// CleanupEndpoints removes endpoints for a headless service
func (m *Manager) CleanupEndpoints(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	endpoints := &corev1.Endpoints{
		ObjectMeta: metav1.ObjectMeta{
			Name:      headlessService.Name,
			Namespace: headlessService.Namespace,
		},
	}

	return m.client.Delete(ctx, endpoints)
}

// WatchEndpoints creates a watcher for endpoint changes
func (m *Manager) WatchEndpoints(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) (<-chan corev1.Endpoints, error) {
	// This would typically use a controller-runtime watcher
	// For now, we'll return a simple channel
	ch := make(chan corev1.Endpoints, 1)
	
	go func() {
		defer close(ch)
		
		// Poll for changes every 30 seconds
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				endpoints, err := m.GetEndpoints(ctx, headlessService)
				if err != nil {
					continue
				}
				
				select {
				case ch <- *endpoints:
				case <-ctx.Done():
					return
				}
			}
		}
	}()
	
	return ch, nil
}

// ValidateEndpoints validates that endpoints are properly configured
func (m *Manager) ValidateEndpoints(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	endpoints, err := m.GetEndpoints(ctx, headlessService)
	if err != nil {
		return fmt.Errorf("failed to get endpoints: %w", err)
	}

	if len(endpoints.Subsets) == 0 {
		return fmt.Errorf("no endpoint subsets found")
	}

	subset := endpoints.Subsets[0]
	if len(subset.Addresses) == 0 {
		return fmt.Errorf("no endpoint addresses found")
	}

	if len(subset.Ports) == 0 {
		return fmt.Errorf("no endpoint ports found")
	}

	// Validate that all required ports are present
	requiredPorts := make(map[string]bool)
	for _, servicePort := range headlessService.Spec.Ports {
		requiredPorts[servicePort.Name] = true
	}

	for _, port := range subset.Ports {
		if requiredPorts[port.Name] {
			requiredPorts[port.Name] = false
		}
	}

	for portName, required := range requiredPorts {
		if required {
			return fmt.Errorf("required port %s not found in endpoints", portName)
		}
	}

	return nil
}
