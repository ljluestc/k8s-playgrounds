package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags at the top of the file.

// AviatrixControllerSpec defines the desired state of AviatrixController
type AviatrixControllerSpec struct {
	// INSERT CUSTOM FIELDS - desired state of controller
	// Important: Run "make generate" to regenerate code after modifying this file

	// ControllerIP is the IP address of the Aviatrix Controller
	ControllerIP string `json:"controllerIP"`
	// Username for Aviatrix Controller authentication
	Username string `json:"username"`
	// Password for Aviatrix Controller authentication
	Password string `json:"password"`
	// Version of the Aviatrix Controller
	Version string `json:"version,omitempty"`
	// CloudType specifies the cloud provider (aws, azure, gcp, oci, etc.)
	CloudType string `json:"cloudType"`
	// AccountName is the cloud account name in Aviatrix Controller
	AccountName string `json:"accountName"`
	// Region where the controller is deployed
	Region string `json:"region"`
	// CIDR for the controller VPC
	CIDR string `json:"cidr"`
	// InstanceSize for the controller instance
	InstanceSize string `json:"instanceSize"`
	// EnableHA enables high availability for the controller
	EnableHA bool `json:"enableHA,omitempty"`
	// Tags for resource tagging
	Tags map[string]string `json:"tags,omitempty"`
}

// AviatrixControllerStatus defines the observed state of AviatrixController
type AviatrixControllerStatus struct {
	// INSERT CUSTOM FIELDS - observed state of controller
	// Important: Run "make generate" to regenerate code after modifying this file

	// Phase represents the current phase of controller lifecycle
	Phase string `json:"phase"`
	// State represents the current state of the controller
	State string `json:"state"`
	// PublicIP is the public IP address of the controller
	PublicIP string `json:"publicIP,omitempty"`
	// PrivateIP is the private IP address of the controller
	PrivateIP string `json:"privateIP,omitempty"`
	// Version is the current version of the controller
	Version string `json:"version,omitempty"`
	// LastUpdated is the timestamp of the last update
	LastUpdated metav1.Time `json:"lastUpdated,omitempty"`
	// Conditions represent the latest available observations of the controller's state
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// AviatrixController is the Schema for the aviatrixcontrollers API
type AviatrixController struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AviatrixControllerSpec   `json:"spec,omitempty"`
	Status AviatrixControllerStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AviatrixControllerList contains a list of AviatrixController
type AviatrixControllerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AviatrixController `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AviatrixController{}, &AviatrixControllerList{})
}
