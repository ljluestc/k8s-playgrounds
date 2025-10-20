package controllers

import (
	"context"
	"fmt"
	"time"

	"github.com/go-logr/logr"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	k8splaygroundsv1alpha1 "github.com/k8s-playgrounds/operator/api/v1alpha1"
	"github.com/k8s-playgrounds/operator/pkg/dns"
	"github.com/k8s-playgrounds/operator/pkg/endpoints"
	"github.com/k8s-playgrounds/operator/pkg/iptables"
	"github.com/k8s-playgrounds/operator/pkg/metrics"
	"github.com/k8s-playgrounds/operator/pkg/servicediscovery"
)

// HeadlessServiceReconciler reconciles a HeadlessService object
type HeadlessServiceReconciler struct {
	client.Client
	Scheme   *runtime.Scheme
	Recorder event.Recorder
}

//+kubebuilder:rbac:groups=k8s-playgrounds.io,resources=headlessservices,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=k8s-playgrounds.io,resources=headlessservices/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=k8s-playgrounds.io,resources=headlessservices/finalizers,verbs=update
//+kubebuilder:rbac:groups=core,resources=services;endpoints;pods,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=apps,resources=statefulsets,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=networking.k8s.io,resources=networkpolicies,verbs=get;list;watch;create;update;patch;delete

// Reconcile is part of the main kubernetes reconciliation loop
func (r *HeadlessServiceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := ctrl.LoggerFrom(ctx).WithName("HeadlessServiceReconciler")

	// Fetch the HeadlessService instance
	headlessService := &k8splaygroundsv1alpha1.HeadlessService{}
	if err := r.Get(ctx, req.NamespacedName, headlessService); err != nil {
		if errors.IsNotFound(err) {
			log.Info("HeadlessService not found, ignoring")
			return ctrl.Result{}, nil
		}
		log.Error(err, "unable to fetch HeadlessService")
		return ctrl.Result{}, err
	}

	// Set default values
	if err := r.setDefaults(headlessService); err != nil {
		log.Error(err, "failed to set defaults")
		return ctrl.Result{}, err
	}

	// Add finalizer if not present
	if !controllerutil.ContainsFinalizer(headlessService, k8splaygroundsv1alpha1.HeadlessServiceFinalizer) {
		controllerutil.AddFinalizer(headlessService, k8splaygroundsv1alpha1.HeadlessServiceFinalizer)
		if err := r.Update(ctx, headlessService); err != nil {
			log.Error(err, "failed to add finalizer")
			return ctrl.Result{}, err
		}
	}

	// Handle deletion
	if !headlessService.DeletionTimestamp.IsZero() {
		return r.reconcileDelete(ctx, headlessService, log)
	}

	// Reconcile the headless service
	return r.reconcileHeadlessService(ctx, headlessService, log)
}

// reconcileHeadlessService handles the main reconciliation logic
func (r *HeadlessServiceReconciler) reconcileHeadlessService(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService, log logr.Logger) (ctrl.Result, error) {
	log.Info("reconciling HeadlessService", "name", headlessService.Name, "namespace", headlessService.Namespace)

	// 1. Create or update the underlying Kubernetes Service
	if err := r.reconcileKubernetesService(ctx, headlessService, log); err != nil {
		log.Error(err, "failed to reconcile Kubernetes Service")
		return ctrl.Result{}, err
	}

	// 2. Create or update endpoints
	if err := r.reconcileEndpoints(ctx, headlessService, log); err != nil {
		log.Error(err, "failed to reconcile endpoints")
		return ctrl.Result{}, err
	}

	// 3. Configure DNS resolution
	if err := r.reconcileDNS(ctx, headlessService, log); err != nil {
		log.Error(err, "failed to reconcile DNS")
		return ctrl.Result{}, err
	}

	// 4. Configure service discovery
	if err := r.reconcileServiceDiscovery(ctx, headlessService, log); err != nil {
		log.Error(err, "failed to reconcile service discovery")
		return ctrl.Result{}, err
	}

	// 5. Configure iptables proxy mode
	if err := r.reconcileIptablesProxy(ctx, headlessService, log); err != nil {
		log.Error(err, "failed to reconcile iptables proxy")
		return ctrl.Result{}, err
	}

	// 6. Update status
	if err := r.updateHeadlessServiceStatus(ctx, headlessService, log); err != nil {
		log.Error(err, "failed to update status")
		return ctrl.Result{}, err
	}

	// 7. Update metrics
	metrics.UpdateHeadlessServiceMetrics(headlessService)

	log.Info("successfully reconciled HeadlessService")
	return ctrl.Result{RequeueAfter: time.Minute * 2}, nil
}

// reconcileKubernetesService creates or updates the underlying Kubernetes Service
func (r *HeadlessServiceReconciler) reconcileKubernetesService(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService, log logr.Logger) error {
	// Create the Kubernetes Service object
	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      headlessService.Name,
			Namespace: headlessService.Namespace,
			Labels:    headlessService.Labels,
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
		Spec: corev1.ServiceSpec{
			ClusterIP: "None", // This makes it a Headless Service
			Selector:  headlessService.Spec.Selector,
			Ports:     convertServicePorts(headlessService.Spec.Ports),
		},
	}

	// Set annotations
	if headlessService.Annotations != nil {
		service.Annotations = headlessService.Annotations
	}

	// Create or update the service
	if err := r.Create(ctx, service); err != nil {
		if errors.IsAlreadyExists(err) {
			// Update existing service
			existingService := &corev1.Service{}
			if err := r.Get(ctx, types.NamespacedName{Name: service.Name, Namespace: service.Namespace}, existingService); err != nil {
				return err
			}
			
			// Update the service spec
			existingService.Spec = service.Spec
			existingService.Labels = service.Labels
			existingService.Annotations = service.Annotations
			
			if err := r.Update(ctx, existingService); err != nil {
				return err
			}
		} else {
			return err
		}
	}

	log.Info("successfully reconciled Kubernetes Service", "name", service.Name)
	return nil
}

// reconcileEndpoints manages endpoints for the headless service
func (r *HeadlessServiceReconciler) reconcileEndpoints(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService, log logr.Logger) error {
	endpointManager := endpoints.NewManager(r.Client)
	
	// Get pods that match the selector
	pods, err := endpointManager.GetMatchingPods(ctx, headlessService.Namespace, headlessService.Spec.Selector)
	if err != nil {
		return fmt.Errorf("failed to get matching pods: %w", err)
	}

	// Create or update endpoints
	endpoints, err := endpointManager.CreateEndpoints(ctx, headlessService, pods)
	if err != nil {
		return fmt.Errorf("failed to create endpoints: %w", err)
	}

	// Update status with endpoint information
	headlessService.Status.Endpoints = make([]string, len(endpoints.Subsets[0].Addresses))
	for i, address := range endpoints.Subsets[0].Addresses {
		headlessService.Status.Endpoints[i] = address.IP
	}

	log.Info("successfully reconciled endpoints", "count", len(pods))
	return nil
}

// reconcileDNS configures DNS resolution for the headless service
func (r *HeadlessServiceReconciler) reconcileDNS(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService, log logr.Logger) error {
	if headlessService.Spec.DNS == nil {
		return nil
	}

	dnsManager := dns.NewManager(r.Client)
	
	// Test DNS resolution
	dnsResult, err := dnsManager.TestDNSResolution(ctx, headlessService)
	if err != nil {
		log.Error(err, "DNS resolution test failed")
		headlessService.Status.DNS = &k8splaygroundsv1alpha1.DNSTestResult{
			Success:      false,
			ErrorMessage: err.Error(),
		}
	} else {
		headlessService.Status.DNS = dnsResult
		log.Info("DNS resolution test successful", "serviceDNS", dnsResult.ServiceDNS, "resolvedIPs", len(dnsResult.ResolvedIPs))
	}

	return nil
}

// reconcileServiceDiscovery configures service discovery for the headless service
func (r *HeadlessServiceReconciler) reconcileServiceDiscovery(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService, log logr.Logger) error {
	if headlessService.Spec.ServiceDiscovery == nil {
		return nil
	}

	discoveryManager := servicediscovery.NewManager(r.Client)
	
	// Configure service discovery based on type
	switch headlessService.Spec.ServiceDiscovery.Type {
	case "dns":
		if err := discoveryManager.ConfigureDNSDiscovery(ctx, headlessService); err != nil {
			return fmt.Errorf("failed to configure DNS discovery: %w", err)
		}
	case "api":
		if err := discoveryManager.ConfigureAPIDiscovery(ctx, headlessService); err != nil {
			return fmt.Errorf("failed to configure API discovery: %w", err)
		}
	case "custom":
		if err := discoveryManager.ConfigureCustomDiscovery(ctx, headlessService); err != nil {
			return fmt.Errorf("failed to configure custom discovery: %w", err)
		}
	default:
		return fmt.Errorf("unsupported service discovery type: %s", headlessService.Spec.ServiceDiscovery.Type)
	}

	log.Info("successfully configured service discovery", "type", headlessService.Spec.ServiceDiscovery.Type)
	return nil
}

// reconcileIptablesProxy configures iptables proxy mode for the headless service
func (r *HeadlessServiceReconciler) reconcileIptablesProxy(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService, log logr.Logger) error {
	if headlessService.Spec.IptablesProxy == nil || !headlessService.Spec.IptablesProxy.Enabled {
		return nil
	}

	iptablesManager := iptables.NewManager(r.Client)
	
	// Configure iptables rules for the headless service
	if err := iptablesManager.ConfigureHeadlessService(ctx, headlessService); err != nil {
		return fmt.Errorf("failed to configure iptables proxy: %w", err)
	}

	log.Info("successfully configured iptables proxy", "algorithm", headlessService.Spec.IptablesProxy.LoadBalancingAlgorithm)
	return nil
}

// reconcileDelete handles headless service deletion
func (r *HeadlessServiceReconciler) reconcileDelete(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService, log logr.Logger) (ctrl.Result, error) {
	log.Info("reconciling HeadlessService deletion", "name", headlessService.Name)

	// Clean up iptables rules
	if headlessService.Spec.IptablesProxy != nil && headlessService.Spec.IptablesProxy.Enabled {
		iptablesManager := iptables.NewManager(r.Client)
		if err := iptablesManager.CleanupHeadlessService(ctx, headlessService); err != nil {
			log.Error(err, "failed to cleanup iptables rules")
			return ctrl.Result{RequeueAfter: time.Minute}, nil
		}
	}

	// Clean up service discovery
	if headlessService.Spec.ServiceDiscovery != nil {
		discoveryManager := servicediscovery.NewManager(r.Client)
		if err := discoveryManager.Cleanup(ctx, headlessService); err != nil {
			log.Error(err, "failed to cleanup service discovery")
			return ctrl.Result{RequeueAfter: time.Minute}, nil
		}
	}

	// Remove finalizer
	controllerutil.RemoveFinalizer(headlessService, k8splaygroundsv1alpha1.HeadlessServiceFinalizer)
	if err := r.Update(ctx, headlessService); err != nil {
		log.Error(err, "failed to remove finalizer")
		return ctrl.Result{}, err
	}

	log.Info("successfully deleted HeadlessService")
	return ctrl.Result{}, nil
}

// setDefaults sets default values for the headless service
func (r *HeadlessServiceReconciler) setDefaults(headlessService *k8splaygroundsv1alpha1.HeadlessService) error {
	// Set default namespace if not specified
	if headlessService.Namespace == "" {
		headlessService.Namespace = "default"
	}

	// Set default labels
	if headlessService.Labels == nil {
		headlessService.Labels = make(map[string]string)
	}
	headlessService.Labels["app.kubernetes.io/name"] = "headless-service"
	headlessService.Labels["app.kubernetes.io/instance"] = headlessService.Name

	// Set default DNS configuration
	if headlessService.Spec.DNS == nil {
		headlessService.Spec.DNS = &k8splaygroundsv1alpha1.DNSSpec{
			ClusterDomain: "cluster.local",
			TTL:           30,
		}
	}

	// Set default service discovery configuration
	if headlessService.Spec.ServiceDiscovery == nil {
		headlessService.Spec.ServiceDiscovery = &k8splaygroundsv1alpha1.ServiceDiscoverySpec{
			Type:            "dns",
			RefreshInterval: 30,
		}
	}

	// Set default iptables proxy configuration
	if headlessService.Spec.IptablesProxy == nil {
		headlessService.Spec.IptablesProxy = &k8splaygroundsv1alpha1.IptablesProxySpec{
			Enabled:                true,
			LoadBalancingAlgorithm: "random",
			SessionAffinity:        false,
		}
	}

	return nil
}

// updateHeadlessServiceStatus updates the headless service status
func (r *HeadlessServiceReconciler) updateHeadlessServiceStatus(ctx context.Context, headlessService *k8splaygroundsv1alpha1.HeadlessService, log logr.Logger) error {
	// Determine phase based on status
	phase := "Running"
	ready := true
	message := "HeadlessService is running"

	if headlessService.Status.DNS != nil && !headlessService.Status.DNS.Success {
		phase = "Failed"
		ready = false
		message = "DNS resolution failed"
	}

	if len(headlessService.Status.Endpoints) == 0 {
		phase = "Pending"
		ready = false
		message = "No endpoints available"
	}

	// Update status
	headlessService.Status.Phase = phase
	headlessService.Status.Ready = ready
	headlessService.Status.Message = message

	return r.Status().Update(ctx, headlessService)
}

// convertServicePorts converts HeadlessService ports to Kubernetes Service ports
func convertServicePorts(ports []k8splaygroundsv1alpha1.ServicePort) []corev1.ServicePort {
	servicePorts := make([]corev1.ServicePort, len(ports))
	for i, port := range ports {
		servicePorts[i] = corev1.ServicePort{
			Name:       port.Name,
			Port:       port.Port,
			TargetPort: intstr.FromInt(int(port.TargetPort.IntValue())),
			Protocol:   corev1.Protocol(port.Protocol),
		}
	}
	return servicePorts
}

// SetupWithManager sets up the controller with the Manager
func (r *HeadlessServiceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&k8splaygroundsv1alpha1.HeadlessService{}).
		WithEventFilter(predicate.GenerationChangedPredicate{}).
		Complete(r)
}
