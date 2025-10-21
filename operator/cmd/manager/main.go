package main

import (
	"flag"
	"os"

	// Import all Kubernetes client auth plugins (e.g., Azure, GCP, OIDC, etc.)
	// to ensure that exec-entrypoint and run can make use of them.
	_ "k8s.io/client-go/plugin/pkg/client/auth"

	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	aviatrixv1alpha1 "aviatrix-operator/api/v1alpha1"
	"aviatrix-operator/controllers"
	"aviatrix-operator/pkg/aviatrix"
	"aviatrix-operator/pkg/cloud"
	"aviatrix-operator/pkg/network"
	"aviatrix-operator/pkg/security"
	//+kubebuilder:scaffold:imports
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))

	utilruntime.Must(aviatrixv1alpha1.AddToScheme(scheme))
	//+kubebuilder:scaffold:scheme
}

func main() {
	var metricsAddr string
	var enableLeaderElection bool
	var probeAddr string
	var aviatrixControllerIP string
	var aviatrixUsername string
	var aviatrixPassword string
	
	flag.StringVar(&metricsAddr, "metrics-bind-address", ":8080", "The address the metric endpoint binds to.")
	flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "The address the probe endpoint binds to.")
	flag.BoolVar(&enableLeaderElection, "leader-elect", false,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	flag.StringVar(&aviatrixControllerIP, "aviatrix-controller-ip", "", "Aviatrix Controller IP address")
	flag.StringVar(&aviatrixUsername, "aviatrix-username", "", "Aviatrix Controller username")
	flag.StringVar(&aviatrixPassword, "aviatrix-password", "", "Aviatrix Controller password")
	
	opts := zap.Options{
		Development: true,
	}
	opts.BindFlags(flag.CommandLine)
	flag.Parse()

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))

	// Initialize Aviatrix client
	aviatrixClient, err := aviatrix.NewClient(aviatrixControllerIP, aviatrixUsername, aviatrixPassword)
	if err != nil {
		setupLog.Error(err, "unable to create Aviatrix client")
		os.Exit(1)
	}

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme:                 scheme,
		MetricsBindAddress:     metricsAddr,
		Port:                   9443,
		HealthProbeBindAddress: probeAddr,
		LeaderElection:         enableLeaderElection,
		LeaderElectionID:       "aviatrix-operator.k8s.io",
		// LeaderElectionReleaseOnCancel: true,
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		os.Exit(1)
	}

	// Initialize managers
	cloudManager := cloud.NewManager(aviatrixClient)
	networkManager := network.NewManager(aviatrixClient)
	securityManager := security.NewManager(aviatrixClient)

	// Setup controllers
	if err = (&controllers.AviatrixControllerReconciler{
		Client:         mgr.GetClient(),
		Scheme:         mgr.GetScheme(),
		AviatrixClient: aviatrixClient,
		CloudManager:   cloudManager,
		NetworkManager: networkManager,
		SecurityManager: securityManager,
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "AviatrixController")
		os.Exit(1)
	}

	if err = (&controllers.AviatrixGatewayReconciler{
		Client:         mgr.GetClient(),
		Scheme:         mgr.GetScheme(),
		AviatrixClient: aviatrixClient,
		CloudManager:   cloudManager,
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "AviatrixGateway")
		os.Exit(1)
	}

	if err = (&controllers.AviatrixSpokeGatewayReconciler{
		Client:         mgr.GetClient(),
		Scheme:         mgr.GetScheme(),
		AviatrixClient: aviatrixClient,
		CloudManager:   cloudManager,
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "AviatrixSpokeGateway")
		os.Exit(1)
	}

	if err = (&controllers.AviatrixTransitGatewayReconciler{
		Client:         mgr.GetClient(),
		Scheme:         mgr.GetScheme(),
		AviatrixClient: aviatrixClient,
		CloudManager:   cloudManager,
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "AviatrixTransitGateway")
		os.Exit(1)
	}

	if err = (&controllers.AviatrixVpcReconciler{
		Client:         mgr.GetClient(),
		Scheme:         mgr.GetScheme(),
		AviatrixClient: aviatrixClient,
		CloudManager:   cloudManager,
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "AviatrixVpc")
		os.Exit(1)
	}

	if err = (&controllers.AviatrixFirewallReconciler{
		Client:         mgr.GetClient(),
		Scheme:         mgr.GetScheme(),
		AviatrixClient: aviatrixClient,
		SecurityManager: securityManager,
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "AviatrixFirewall")
		os.Exit(1)
	}

	if err = (&controllers.AviatrixNetworkDomainReconciler{
		Client:         mgr.GetClient(),
		Scheme:         mgr.GetScheme(),
		AviatrixClient: aviatrixClient,
		NetworkManager: networkManager,
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "AviatrixNetworkDomain")
		os.Exit(1)
	}

	if err = (&controllers.AviatrixSegmentationSecurityDomainReconciler{
		Client:         mgr.GetClient(),
		Scheme:         mgr.GetScheme(),
		AviatrixClient: aviatrixClient,
		SecurityManager: securityManager,
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "AviatrixSegmentationSecurityDomain")
		os.Exit(1)
	}

	if err = (&controllers.AviatrixMicrosegPolicyReconciler{
		Client:         mgr.GetClient(),
		Scheme:         mgr.GetScheme(),
		AviatrixClient: aviatrixClient,
		SecurityManager: securityManager,
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "AviatrixMicrosegPolicy")
		os.Exit(1)
	}

	if err = (&controllers.AviatrixEdgeGatewayReconciler{
		Client:         mgr.GetClient(),
		Scheme:         mgr.GetScheme(),
		AviatrixClient: aviatrixClient,
		CloudManager:   cloudManager,
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "AviatrixEdgeGateway")
		os.Exit(1)
	}

	//+kubebuilder:scaffold:builder

	if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up health check")
		os.Exit(1)
	}
	if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up ready check")
		os.Exit(1)
	}

	setupLog.Info("starting manager")
	if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
		setupLog.Error(err, "problem running manager")
		os.Exit(1)
	}
}