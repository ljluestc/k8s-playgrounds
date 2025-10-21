package controllers

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	aviatrixv1alpha1 "aviatrix-operator/api/v1alpha1"
	"aviatrix-operator/pkg/aviatrix"
	"aviatrix-operator/pkg/cloud"
)

// AviatrixEdgeGatewayReconciler reconciles a AviatrixEdgeGateway object
type AviatrixEdgeGatewayReconciler struct {
	client.Client
	Scheme         *runtime.Scheme
	AviatrixClient *aviatrix.Client
	CloudManager   *cloud.Manager
}

//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixedgegateways,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixedgegateways/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixedgegateways/finalizers,verbs=update

func (r *AviatrixEdgeGatewayReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = log.FromContext(ctx)
	// TODO: Implement edge gateway reconciliation logic
	return ctrl.Result{}, nil
}

func (r *AviatrixEdgeGatewayReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&aviatrixv1alpha1.AviatrixEdgeGateway{}).
		Complete(r)
}
