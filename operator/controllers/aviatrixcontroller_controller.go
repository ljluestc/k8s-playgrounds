package controllers

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/runtime"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	aviatrixv1alpha1 "aviatrix-operator/api/v1alpha1"
	"aviatrix-operator/pkg/aviatrix"
	"aviatrix-operator/pkg/cloud"
	"aviatrix-operator/pkg/network"
	"aviatrix-operator/pkg/security"
)

// AviatrixControllerReconciler reconciles a AviatrixController object
type AviatrixControllerReconciler struct {
	client.Client
	Scheme         *runtime.Scheme
	AviatrixClient *aviatrix.Client
	CloudManager   *cloud.Manager
	NetworkManager *network.Manager
	SecurityManager *security.Manager
}

//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixcontrollers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixcontrollers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixcontrollers/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *AviatrixControllerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// Fetch the AviatrixController instance
	controller := &aviatrixv1alpha1.AviatrixController{}
	err := r.Get(ctx, req.NamespacedName, controller)
	if err != nil {
		if client.IgnoreNotFound(err) != nil {
			logger.Error(err, "unable to fetch AviatrixController")
			return ctrl.Result{}, err
		}
		// Request object not found, could have been deleted after reconcile request.
		logger.Info("AviatrixController resource not found. Ignoring since object must be deleted.")
		return ctrl.Result{}, nil
	}

	// Update status
	controller.Status.Phase = "Reconciling"
	controller.Status.State = "Active"
	controller.Status.LastUpdated = metav1.Now()

	// Set up Aviatrix Controller connection
	if err := r.setupAviatrixController(ctx, controller); err != nil {
		logger.Error(err, "failed to setup Aviatrix Controller")
		controller.Status.Phase = "Failed"
		controller.Status.State = "Error"
		r.Status().Update(ctx, controller)
		return ctrl.Result{}, err
	}

	// Validate cloud account
	if err := r.validateCloudAccount(ctx, controller); err != nil {
		logger.Error(err, "failed to validate cloud account")
		controller.Status.Phase = "Failed"
		controller.Status.State = "Error"
		r.Status().Update(ctx, controller)
		return ctrl.Result{}, err
	}

	// Update status to ready
	controller.Status.Phase = "Ready"
	controller.Status.State = "Active"
	controller.Status.Version = controller.Spec.Version

	if err := r.Status().Update(ctx, controller); err != nil {
		logger.Error(err, "failed to update AviatrixController status")
		return ctrl.Result{}, err
	}

	logger.Info("AviatrixController reconciled successfully")
	return ctrl.Result{}, nil
}

// setupAviatrixController sets up the Aviatrix Controller connection
func (r *AviatrixControllerReconciler) setupAviatrixController(ctx context.Context, controller *aviatrixv1alpha1.AviatrixController) error {
	logger := log.FromContext(ctx)

	// Test connection to Aviatrix Controller
	if err := r.AviatrixClient.Login(); err != nil {
		return fmt.Errorf("failed to connect to Aviatrix Controller: %w", err)
	}

	logger.Info("Successfully connected to Aviatrix Controller", "controllerIP", controller.Spec.ControllerIP)
	return nil
}

// validateCloudAccount validates the cloud account
func (r *AviatrixControllerReconciler) validateCloudAccount(ctx context.Context, controller *aviatrixv1alpha1.AviatrixController) error {
	logger := log.FromContext(ctx)

	// Validate cloud account
	if err := r.CloudManager.ValidateCloudAccount(controller.Spec.AccountName, controller.Spec.CloudType); err != nil {
		return fmt.Errorf("failed to validate cloud account: %w", err)
	}

	logger.Info("Successfully validated cloud account", "accountName", controller.Spec.AccountName, "cloudType", controller.Spec.CloudType)
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *AviatrixControllerReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&aviatrixv1alpha1.AviatrixController{}).
		Complete(r)
}
