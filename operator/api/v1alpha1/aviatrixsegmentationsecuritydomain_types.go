package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// AviatrixSegmentationSecurityDomainSpec defines the desired state of AviatrixSegmentationSecurityDomain
type AviatrixSegmentationSecurityDomainSpec struct {
	// Name is the name of the segmentation security domain
	Name string `json:"name"`
	// Type is the type of segmentation security domain
	Type string `json:"type"`
	// Tags for resource tagging
	Tags map[string]string `json:"tags,omitempty"`
}

// AviatrixSegmentationSecurityDomainStatus defines the observed state of AviatrixSegmentationSecurityDomain
type AviatrixSegmentationSecurityDomainStatus struct {
	// Phase represents the current phase of segmentation security domain lifecycle
	Phase string `json:"phase"`
	// State represents the current state of the segmentation security domain
	State string `json:"state"`
	// DomainID is the segmentation security domain ID
	DomainID string `json:"domainId,omitempty"`
	// LastUpdated is the timestamp of the last update
	LastUpdated metav1.Time `json:"lastUpdated,omitempty"`
	// Conditions represent the latest available observations of the segmentation security domain's state
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// AviatrixSegmentationSecurityDomain is the Schema for the aviatrixsegmentationsecuritydomains API
type AviatrixSegmentationSecurityDomain struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AviatrixSegmentationSecurityDomainSpec   `json:"spec,omitempty"`
	Status AviatrixSegmentationSecurityDomainStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AviatrixSegmentationSecurityDomainList contains a list of AviatrixSegmentationSecurityDomain
type AviatrixSegmentationSecurityDomainList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AviatrixSegmentationSecurityDomain `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AviatrixSegmentationSecurityDomain{}, &AviatrixSegmentationSecurityDomainList{})
}
