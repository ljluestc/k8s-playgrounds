package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"runtime"
	"time"

	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.)
	_ "k8s.io/client-go/plugin/pkg/client/auth"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	k8splaygroundsv1alpha1 "github.com/k8s-playgrounds/operator/api/v1alpha1"
	"github.com/k8s-playgrounds/operator/controllers"
	"github.com/k8s-playgrounds/operator/pkg/features"
	"github.com/k8s-playgrounds/operator/pkg/version"
	//+kubebuilder:scaffold:imports
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))

	utilruntime.Must(k8splaygroundsv1alpha1.AddToScheme(scheme))
	//+kubebuilder:scaffold:scheme
}

func main() {
	var metricsAddr string
	var enableLeaderElection bool
	var probeAddr string
	var featureGates string
	var logLevel string
	var logFormat string

	flag.StringVar(&metricsAddr, "metrics-bind-address", ":8080", "The address the metric endpoint binds to.")
	flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "The address the probe endpoint binds to.")
	flag.BoolVar(&enableLeaderElection, "leader-elect", false,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	flag.StringVar(&featureGates, "feature-gates", "", "A set of key=value pairs that describe feature gates for alpha/experimental features.")
	flag.StringVar(&logLevel, "log-level", "info", "Log level (debug, info, warn, error, fatal, panic).")
	flag.StringVar(&logFormat, "log-format", "json", "Log format (json, console).")
	opts := zap.Options{
		Development: false,
	}
	opts.BindFlags(flag.CommandLine)
	flag.Parse()

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))

	// Parse feature gates
	if err := features.ParseFeatureGates(featureGates); err != nil {
		setupLog.Error(err, "unable to parse feature gates")
		os.Exit(1)
	}

	// Print version information
	setupLog.Info("starting K8s Playgrounds Operator",
		"version", version.Version,
		"git-commit", version.GitCommit,
		"go-version", runtime.Version(),
		"go-arch", runtime.GOARCH,
		"go-os", runtime.GOOS,
	)

	// Print feature gates
	if len(features.FeatureGates) > 0 {
		setupLog.Info("feature gates enabled", "gates", features.FeatureGates)
	}

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme:                 scheme,
		MetricsBindAddress:     metricsAddr,
		Port:                   9443,
		HealthProbeBindAddress: probeAddr,
		LeaderElection:         enableLeaderElection,
		LeaderElectionID:       "k8s-playgrounds-operator.k8s-playgrounds.io",
		// LeaderElectionReleaseOnCancel defines if the leader should step down voluntarily
		// when the Manager ends. This requires the binary to immediately end when the
		// Manager is stopped, otherwise, setting this to true will have no effect.
		LeaderElectionReleaseOnCancel: true,
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		os.Exit(1)
	}

	// Setup controllers
	if err := setupControllers(mgr); err != nil {
		setupLog.Error(err, "unable to setup controllers")
		os.Exit(1)
	}

	// Setup webhooks
	if err := setupWebhooks(mgr); err != nil {
		setupLog.Error(err, "unable to setup webhooks")
		os.Exit(1)
	}

	//+kubebuilder:scaffold:builder

	// Add health checks
	if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up health check")
		os.Exit(1)
	}
	if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up ready check")
		os.Exit(1)
	}

	// Add metrics
	if err := setupMetrics(mgr); err != nil {
		setupLog.Error(err, "unable to setup metrics")
		os.Exit(1)
	}

	setupLog.Info("starting manager")
	if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
		setupLog.Error(err, "problem running manager")
		os.Exit(1)
	}
}

func setupControllers(mgr ctrl.Manager) error {
	// K8sPlaygroundsCluster Controller
	if err := (&controllers.K8sPlaygroundsClusterReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("k8splaygroundscluster-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create K8sPlaygroundsCluster controller: %w", err)
	}

	// HeadlessService Controller
	if err := (&controllers.HeadlessServiceReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("headlessservice-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create HeadlessService controller: %w", err)
	}

	// StatefulSet Controller
	if err := (&controllers.StatefulSetReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("statefulset-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create StatefulSet controller: %w", err)
	}

	// Service Controller
	if err := (&controllers.ServiceReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("service-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create Service controller: %w", err)
	}

	// Pod Controller
	if err := (&controllers.PodReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("pod-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create Pod controller: %w", err)
	}

	// Deployment Controller
	if err := (&controllers.DeploymentReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("deployment-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create Deployment controller: %w", err)
	}

	// ConfigMap Controller
	if err := (&controllers.ConfigMapReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("configmap-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create ConfigMap controller: %w", err)
	}

	// Secret Controller
	if err := (&controllers.SecretReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("secret-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create Secret controller: %w", err)
	}

	// Namespace Controller
	if err := (&controllers.NamespaceReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("namespace-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create Namespace controller: %w", err)
	}

	// NetworkPolicy Controller
	if err := (&controllers.NetworkPolicyReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("networkpolicy-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create NetworkPolicy controller: %w", err)
	}

	// Ingress Controller
	if err := (&controllers.IngressReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("ingress-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create Ingress controller: %w", err)
	}

	// PersistentVolume Controller
	if err := (&controllers.PersistentVolumeReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("persistentvolume-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create PersistentVolume controller: %w", err)
	}

	// Job Controller
	if err := (&controllers.JobReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("job-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create Job controller: %w", err)
	}

	// CronJob Controller
	if err := (&controllers.CronJobReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("cronjob-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create CronJob controller: %w", err)
	}

	// DaemonSet Controller
	if err := (&controllers.DaemonSetReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("daemonset-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create DaemonSet controller: %w", err)
	}

	// ReplicaSet Controller
	if err := (&controllers.ReplicaSetReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("replicaset-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create ReplicaSet controller: %w", err)
	}

	// HorizontalPodAutoscaler Controller
	if err := (&controllers.HorizontalPodAutoscalerReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("horizontalpodautoscaler-controller"),
	}).SetupWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create HorizontalPodAutoscaler controller: %w", err)
	}

	return nil
}

func setupWebhooks(mgr ctrl.Manager) error {
	// K8sPlaygroundsCluster Webhook
	if err := (&k8splaygroundsv1alpha1.K8sPlaygroundsCluster{}).SetupWebhookWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create K8sPlaygroundsCluster webhook: %w", err)
	}

	// HeadlessService Webhook
	if err := (&k8splaygroundsv1alpha1.HeadlessService{}).SetupWebhookWithManager(mgr); err != nil {
		return fmt.Errorf("unable to create HeadlessService webhook: %w", err)
	}

	return nil
}

func setupMetrics(mgr ctrl.Manager) error {
	// Add custom metrics here
	// This would include metrics for:
	// - Service health
	// - Resource usage
	// - Performance metrics
	// - Error rates
	// - Custom business metrics

	return nil
}
