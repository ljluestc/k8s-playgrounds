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
)

// AviatrixGatewayReconciler reconciles a AviatrixGateway object
type AviatrixGatewayReconciler struct {
	client.Client
	Scheme         *runtime.Scheme
	AviatrixClient *aviatrix.Client
	CloudManager   *cloud.Manager
}

//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixgateways,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixgateways/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixgateways/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *AviatrixGatewayReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// Fetch the AviatrixGateway instance
	gateway := &aviatrixv1alpha1.AviatrixGateway{}
	err := r.Get(ctx, req.NamespacedName, gateway)
	if err != nil {
		if client.IgnoreNotFound(err) != nil {
			logger.Error(err, "unable to fetch AviatrixGateway")
			return ctrl.Result{}, err
		}
		// Request object not found, could have been deleted after reconcile request.
		logger.Info("AviatrixGateway resource not found. Ignoring since object must be deleted.")
		return ctrl.Result{}, nil
	}

	// Update status
	gateway.Status.Phase = "Reconciling"
	gateway.Status.State = "Creating"
	gateway.Status.LastUpdated = metav1.Now()

	// Create gateway
	if err := r.createGateway(ctx, gateway); err != nil {
		logger.Error(err, "failed to create gateway")
		gateway.Status.Phase = "Failed"
		gateway.Status.State = "Error"
		r.Status().Update(ctx, gateway)
		return ctrl.Result{}, err
	}

	// Get gateway information
	gatewayInfo, err := r.CloudManager.GetGateway(gateway.Spec.GwName)
	if err != nil {
		logger.Error(err, "failed to get gateway information")
		gateway.Status.Phase = "Failed"
		gateway.Status.State = "Error"
		r.Status().Update(ctx, gateway)
		return ctrl.Result{}, err
	}

	// Update status with gateway information
	gateway.Status.Phase = "Ready"
	gateway.Status.State = "Active"
	if publicIP, ok := gatewayInfo["public_ip"].(string); ok {
		gateway.Status.PublicIP = publicIP
	}
	if privateIP, ok := gatewayInfo["private_ip"].(string); ok {
		gateway.Status.PrivateIP = privateIP
	}
	if instanceID, ok := gatewayInfo["instance_id"].(string); ok {
		gateway.Status.InstanceID = instanceID
	}

	if err := r.Status().Update(ctx, gateway); err != nil {
		logger.Error(err, "failed to update AviatrixGateway status")
		return ctrl.Result{}, err
	}

	logger.Info("AviatrixGateway reconciled successfully")
	return ctrl.Result{}, nil
}

// createGateway creates the gateway
func (r *AviatrixGatewayReconciler) createGateway(ctx context.Context, gateway *aviatrixv1alpha1.AviatrixGateway) error {
	logger := log.FromContext(ctx)

	// Create gateway using cloud manager
	err := r.CloudManager.CreateGateway(
		gateway.Spec.GwName,
		gateway.Spec.CloudType,
		gateway.Spec.AccountName,
		gateway.Spec.VpcID,
		gateway.Spec.VpcRegion,
		gateway.Spec.GwSize,
		gateway.Spec.Subnet,
	)
	if err != nil {
		return fmt.Errorf("failed to create gateway: %w", err)
	}

	logger.Info("Successfully created gateway", "gwName", gateway.Spec.GwName)
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *AviatrixGatewayReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&aviatrixv1alpha1.AviatrixGateway{}).
		Complete(r)
}
