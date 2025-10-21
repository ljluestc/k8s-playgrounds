package controllers

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	aviatrixv1alpha1 "aviatrix-operator/api/v1alpha1"
	"aviatrix-operator/pkg/aviatrix"
	"aviatrix-operator/pkg/network"
)

// AviatrixNetworkDomainReconciler reconciles a AviatrixNetworkDomain object
type AviatrixNetworkDomainReconciler struct {
	client.Client
	Scheme         *runtime.Scheme
	AviatrixClient *aviatrix.Client
	NetworkManager *network.Manager
}

//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixnetworkdomains,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixnetworkdomains/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixnetworkdomains/finalizers,verbs=update

func (r *AviatrixNetworkDomainReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = log.FromContext(ctx)
	// TODO: Implement network domain reconciliation logic
	return ctrl.Result{}, nil
}

func (r *AviatrixNetworkDomainReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&aviatrixv1alpha1.AviatrixNetworkDomain{}).
		Complete(r)
}
