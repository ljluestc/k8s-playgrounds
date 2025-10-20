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
	"github.com/k8s-playgrounds/operator/pkg/features"
	"github.com/k8s-playgrounds/operator/pkg/health"
	"github.com/k8s-playgrounds/operator/pkg/metrics"
	"github.com/k8s-playgrounds/operator/pkg/reconciler"
)

// K8sPlaygroundsClusterReconciler reconciles a K8sPlaygroundsCluster object
type K8sPlaygroundsClusterReconciler struct {
	client.Client
	Scheme   *runtime.Scheme
	Recorder event.Recorder
}

//+kubebuilder:rbac:groups=k8s-playgrounds.io,resources=k8splaygroundsclusters,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=k8s-playgrounds.io,resources=k8splaygroundsclusters/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=k8s-playgrounds.io,resources=k8splaygroundsclusters/finalizers,verbs=update
//+kubebuilder:rbac:groups=apps,resources=deployments;statefulsets;daemonsets;replicasets,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=pods;services;configmaps;secrets;namespaces;persistentvolumes;persistentvolumeclaims,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=networking.k8s.io,resources=networkpolicies;ingresses,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=batch,resources=jobs;cronjobs,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=autoscaling,resources=horizontalpodautoscalers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=roles;rolebindings;clusterroles;clusterrolebindings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=policy,resources=podsecuritypolicies,verbs=get;list;watch;create;update;patch;delete

// Reconcile is part of the main kubernetes reconciliation loop
func (r *K8sPlaygroundsClusterReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := ctrl.LoggerFrom(ctx).WithName("K8sPlaygroundsClusterReconciler")

	// Fetch the K8sPlaygroundsCluster instance
	cluster := &k8splaygroundsv1alpha1.K8sPlaygroundsCluster{}
	if err := r.Get(ctx, req.NamespacedName, cluster); err != nil {
		if errors.IsNotFound(err) {
			log.Info("K8sPlaygroundsCluster not found, ignoring")
			return ctrl.Result{}, nil
		}
		log.Error(err, "unable to fetch K8sPlaygroundsCluster")
		return ctrl.Result{}, err
	}

	// Set default values
	if err := r.setDefaults(cluster); err != nil {
		log.Error(err, "failed to set defaults")
		return ctrl.Result{}, err
	}

	// Add finalizer if not present
	if !controllerutil.ContainsFinalizer(cluster, k8splaygroundsv1alpha1.K8sPlaygroundsClusterFinalizer) {
		controllerutil.AddFinalizer(cluster, k8splaygroundsv1alpha1.K8sPlaygroundsClusterFinalizer)
		if err := r.Update(ctx, cluster); err != nil {
			log.Error(err, "failed to add finalizer")
			return ctrl.Result{}, err
		}
	}

	// Handle deletion
	if !cluster.DeletionTimestamp.IsZero() {
		return r.reconcileDelete(ctx, cluster, log)
	}

	// Reconcile the cluster
	return r.reconcileCluster(ctx, cluster, log)
}

// reconcileCluster handles the main reconciliation logic
func (r *K8sPlaygroundsClusterReconciler) reconcileCluster(ctx context.Context, cluster *k8splaygroundsv1alpha1.K8sPlaygroundsCluster, log logr.Logger) (ctrl.Result, error) {
	log.Info("reconciling K8sPlaygroundsCluster", "name", cluster.Name, "namespace", cluster.Namespace)

	// Update status to indicate reconciliation is in progress
	if err := r.updateClusterStatus(ctx, cluster, k8splaygroundsv1alpha1.ClusterPhaseUpdating, "Reconciling cluster"); err != nil {
		log.Error(err, "failed to update cluster status")
		return ctrl.Result{}, err
	}

	// Create reconciler for different resource types
	reconcilers := []reconciler.Reconciler{
		reconciler.NewNamespaceReconciler(r.Client, r.Scheme),
		reconciler.NewServiceReconciler(r.Client, r.Scheme),
		reconciler.NewHeadlessServiceReconciler(r.Client, r.Scheme),
		reconciler.NewStatefulSetReconciler(r.Client, r.Scheme),
		reconciler.NewDeploymentReconciler(r.Client, r.Scheme),
		reconciler.NewConfigMapReconciler(r.Client, r.Scheme),
		reconciler.NewSecretReconciler(r.Client, r.Scheme),
		reconciler.NewNetworkPolicyReconciler(r.Client, r.Scheme),
		reconciler.NewIngressReconciler(r.Client, r.Scheme),
		reconciler.NewPersistentVolumeReconciler(r.Client, r.Scheme),
		reconciler.NewJobReconciler(r.Client, r.Scheme),
		reconciler.NewCronJobReconciler(r.Client, r.Scheme),
		reconciler.NewDaemonSetReconciler(r.Client, r.Scheme),
		reconciler.NewReplicaSetReconciler(r.Client, r.Scheme),
		reconciler.NewHorizontalPodAutoscalerReconciler(r.Client, r.Scheme),
	}

	// Add monitoring reconciler if enabled
	if cluster.Spec.Monitoring != nil && cluster.Spec.Monitoring.Enabled {
		reconcilers = append(reconcilers, reconciler.NewMonitoringReconciler(r.Client, r.Scheme))
	}

	// Add security reconciler if enabled
	if cluster.Spec.Security != nil && cluster.Spec.Security.Enabled {
		reconcilers = append(reconcilers, reconciler.NewSecurityReconciler(r.Client, r.Scheme))
	}

	// Add backup reconciler if enabled
	if cluster.Spec.Backup != nil && cluster.Spec.Backup.Enabled {
		reconcilers = append(reconcilers, reconciler.NewBackupReconciler(r.Client, r.Scheme))
	}

	// Add auto-healing reconciler if enabled
	if cluster.Spec.AutoHealing != nil && cluster.Spec.AutoHealing.Enabled {
		reconcilers = append(reconcilers, reconciler.NewAutoHealingReconciler(r.Client, r.Scheme))
	}

	// Add performance reconciler if enabled
	if cluster.Spec.Performance != nil && cluster.Spec.Performance.Enabled {
		reconcilers = append(reconcilers, reconciler.NewPerformanceReconciler(r.Client, r.Scheme))
	}

	// Execute all reconcilers
	var reconcileErrors []error
	for _, reconciler := range reconcilers {
		if err := reconciler.Reconcile(ctx, cluster); err != nil {
			log.Error(err, "reconciler failed", "type", fmt.Sprintf("%T", reconciler))
			reconcileErrors = append(reconcileErrors, err)
		}
	}

	// Check if any reconcilers failed
	if len(reconcileErrors) > 0 {
		log.Error(fmt.Errorf("reconciliation failed"), "multiple reconcilers failed", "errors", reconcileErrors)
		if err := r.updateClusterStatus(ctx, cluster, k8splaygroundsv1alpha1.ClusterPhaseFailed, "Reconciliation failed"); err != nil {
			log.Error(err, "failed to update cluster status")
		}
		return ctrl.Result{RequeueAfter: time.Minute}, nil
	}

	// Update cluster health
	clusterHealth, err := r.checkClusterHealth(ctx, cluster)
	if err != nil {
		log.Error(err, "failed to check cluster health")
		return ctrl.Result{}, err
	}

	// Update status based on health
	phase := k8splaygroundsv1alpha1.ClusterPhaseRunning
	message := "Cluster is running"
	if clusterHealth != k8splaygroundsv1alpha1.ClusterHealthHealthy {
		phase = k8splaygroundsv1alpha1.ClusterPhaseFailed
		message = "Cluster is unhealthy"
	}

	if err := r.updateClusterStatus(ctx, cluster, phase, message); err != nil {
		log.Error(err, "failed to update cluster status")
		return ctrl.Result{}, err
	}

	// Update metrics
	metrics.UpdateClusterMetrics(cluster)

	log.Info("successfully reconciled K8sPlaygroundsCluster")
	return ctrl.Result{RequeueAfter: time.Minute * 5}, nil
}

// reconcileDelete handles cluster deletion
func (r *K8sPlaygroundsClusterReconciler) reconcileDelete(ctx context.Context, cluster *k8splaygroundsv1alpha1.K8sPlaygroundsCluster, log logr.Logger) (ctrl.Result, error) {
	log.Info("reconciling K8sPlaygroundsCluster deletion", "name", cluster.Name)

	// Update status to indicate deletion is in progress
	if err := r.updateClusterStatus(ctx, cluster, k8splaygroundsv1alpha1.ClusterPhaseDeleting, "Deleting cluster"); err != nil {
		log.Error(err, "failed to update cluster status")
		return ctrl.Result{}, err
	}

	// Clean up resources in reverse order
	cleanupReconcilers := []reconciler.Reconciler{
		reconciler.NewHorizontalPodAutoscalerReconciler(r.Client, r.Scheme),
		reconciler.NewReplicaSetReconciler(r.Client, r.Scheme),
		reconciler.NewDaemonSetReconciler(r.Client, r.Scheme),
		reconciler.NewCronJobReconciler(r.Client, r.Scheme),
		reconciler.NewJobReconciler(r.Client, r.Scheme),
		reconciler.NewPersistentVolumeReconciler(r.Client, r.Scheme),
		reconciler.NewIngressReconciler(r.Client, r.Scheme),
		reconciler.NewNetworkPolicyReconciler(r.Client, r.Scheme),
		reconciler.NewSecretReconciler(r.Client, r.Scheme),
		reconciler.NewConfigMapReconciler(r.Client, r.Scheme),
		reconciler.NewDeploymentReconciler(r.Client, r.Scheme),
		reconciler.NewStatefulSetReconciler(r.Client, r.Scheme),
		reconciler.NewHeadlessServiceReconciler(r.Client, r.Scheme),
		reconciler.NewServiceReconciler(r.Client, r.Scheme),
		reconciler.NewNamespaceReconciler(r.Client, r.Scheme),
	}

	// Execute cleanup reconcilers
	var cleanupErrors []error
	for _, reconciler := range cleanupReconcilers {
		if err := reconciler.Cleanup(ctx, cluster); err != nil {
			log.Error(err, "cleanup reconciler failed", "type", fmt.Sprintf("%T", reconciler))
			cleanupErrors = append(cleanupErrors, err)
		}
	}

	// Check if cleanup is complete
	if len(cleanupErrors) > 0 {
		log.Error(fmt.Errorf("cleanup failed"), "multiple cleanup reconcilers failed", "errors", cleanupErrors)
		return ctrl.Result{RequeueAfter: time.Minute}, nil
	}

	// Remove finalizer
	controllerutil.RemoveFinalizer(cluster, k8splaygroundsv1alpha1.K8sPlaygroundsClusterFinalizer)
	if err := r.Update(ctx, cluster); err != nil {
		log.Error(err, "failed to remove finalizer")
		return ctrl.Result{}, err
	}

	log.Info("successfully deleted K8sPlaygroundsCluster")
	return ctrl.Result{}, nil
}

// setDefaults sets default values for the cluster
func (r *K8sPlaygroundsClusterReconciler) setDefaults(cluster *k8splaygroundsv1alpha1.K8sPlaygroundsCluster) error {
	// Set default version if not specified
	if cluster.Spec.Version == "" {
		cluster.Spec.Version = "latest"
	}

	// Set default replicas if not specified
	if cluster.Spec.Replicas == 0 {
		cluster.Spec.Replicas = 3
	}

	// Set default namespace if not specified
	if cluster.Namespace == "" {
		cluster.Namespace = "default"
	}

	// Set default labels
	if cluster.Labels == nil {
		cluster.Labels = make(map[string]string)
	}
	cluster.Labels["app.kubernetes.io/name"] = "k8s-playgrounds-cluster"
	cluster.Labels["app.kubernetes.io/instance"] = cluster.Name
	cluster.Labels["app.kubernetes.io/version"] = cluster.Spec.Version

	return nil
}

// updateClusterStatus updates the cluster status
func (r *K8sPlaygroundsClusterReconciler) updateClusterStatus(ctx context.Context, cluster *k8splaygroundsv1alpha1.K8sPlaygroundsCluster, phase k8splaygroundsv1alpha1.ClusterPhase, message string) error {
	cluster.Status.Phase = phase
	cluster.Status.LastUpdated = metav1.Now()
	cluster.Status.Version = cluster.Spec.Version

	// Add condition
	condition := k8splaygroundsv1alpha1.ClusterCondition{
		Type:               k8splaygroundsv1alpha1.ClusterConditionReady,
		Status:             metav1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		Reason:             string(phase),
		Message:            message,
	}

	// Update or add condition
	found := false
	for i, c := range cluster.Status.Conditions {
		if c.Type == condition.Type {
			cluster.Status.Conditions[i] = condition
			found = true
			break
		}
	}
	if !found {
		cluster.Status.Conditions = append(cluster.Status.Conditions, condition)
	}

	return r.Status().Update(ctx, cluster)
}

// checkClusterHealth checks the overall health of the cluster
func (r *K8sPlaygroundsClusterReconciler) checkClusterHealth(ctx context.Context, cluster *k8splaygroundsv1alpha1.K8sPlaygroundsCluster) (k8splaygroundsv1alpha1.ClusterHealth, error) {
	// Check if all required resources are healthy
	healthChecker := health.NewClusterHealthChecker(r.Client)
	return healthChecker.CheckHealth(ctx, cluster)
}

// SetupWithManager sets up the controller with the Manager
func (r *K8sPlaygroundsClusterReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&k8splaygroundsv1alpha1.K8sPlaygroundsCluster{}).
		WithEventFilter(predicate.GenerationChangedPredicate{}).
		Complete(r)
}
