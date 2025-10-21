package controllers

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	aviatrixv1alpha1 "aviatrix-operator/api/v1alpha1"
	"aviatrix-operator/pkg/aviatrix"
	"aviatrix-operator/pkg/security"
)

// AviatrixSegmentationSecurityDomainReconciler reconciles a AviatrixSegmentationSecurityDomain object
type AviatrixSegmentationSecurityDomainReconciler struct {
	client.Client
	Scheme         *runtime.Scheme
	AviatrixClient *aviatrix.Client
	SecurityManager *security.Manager
}

//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixsegmentationsecuritydomains,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixsegmentationsecuritydomains/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=aviatrix.k8s.io,resources=aviatrixsegmentationsecuritydomains/finalizers,verbs=update

func (r *AviatrixSegmentationSecurityDomainReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = log.FromContext(ctx)
	// TODO: Implement segmentation security domain reconciliation logic
	return ctrl.Result{}, nil
}

func (r *AviatrixSegmentationSecurityDomainReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&aviatrixv1alpha1.AviatrixSegmentationSecurityDomain{}).
		Complete(r)
}
