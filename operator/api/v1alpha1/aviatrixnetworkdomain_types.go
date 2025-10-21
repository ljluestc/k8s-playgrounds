package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// AviatrixNetworkDomainSpec defines the desired state of AviatrixNetworkDomain
type AviatrixNetworkDomainSpec struct {
	// Name is the name of the network domain
	Name string `json:"name"`
	// Type is the type of network domain (aws-tgw, azure-vnet, gcp-vpc)
	Type string `json:"type"`
	// AccountName is the cloud account name
	AccountName string `json:"accountName"`
	// Region is the region
	Region string `json:"region"`
	// CIDR is the CIDR block
	CIDR string `json:"cidr"`
	// CloudType is the cloud type
	CloudType string `json:"cloudType"`
	// Tags for resource tagging
	Tags map[string]string `json:"tags,omitempty"`
}

// AviatrixNetworkDomainStatus defines the observed state of AviatrixNetworkDomain
type AviatrixNetworkDomainStatus struct {
	// Phase represents the current phase of network domain lifecycle
	Phase string `json:"phase"`
	// State represents the current state of the network domain
	State string `json:"state"`
	// DomainID is the network domain ID
	DomainID string `json:"domainId,omitempty"`
	// LastUpdated is the timestamp of the last update
	LastUpdated metav1.Time `json:"lastUpdated,omitempty"`
	// Conditions represent the latest available observations of the network domain's state
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// AviatrixNetworkDomain is the Schema for the aviatrixnetworkdomains API
type AviatrixNetworkDomain struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AviatrixNetworkDomainSpec   `json:"spec,omitempty"`
	Status AviatrixNetworkDomainStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AviatrixNetworkDomainList contains a list of AviatrixNetworkDomain
type AviatrixNetworkDomainList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AviatrixNetworkDomain `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AviatrixNetworkDomain{}, &AviatrixNetworkDomainList{})
}
