package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// AviatrixVpcSpec defines the desired state of AviatrixVpc
type AviatrixVpcSpec struct {
	// CloudType specifies the cloud provider (aws, azure, gcp, oci, etc.)
	CloudType string `json:"cloudType"`
	// AccountName is the cloud account name in Aviatrix Controller
	AccountName string `json:"accountName"`
	// Name is the name of the VPC
	Name string `json:"name"`
	// Region is the region of the VPC
	Region string `json:"region"`
	// CIDR is the CIDR block for the VPC
	CIDR string `json:"cidr"`
	// SubnetSize is the size of subnets
	SubnetSize int `json:"subnetSize,omitempty"`
	// NumOfSubnetPairs is the number of subnet pairs
	NumOfSubnetPairs int `json:"numOfSubnetPairs,omitempty"`
	// EnablePrivateSubnetFiltering enables private subnet filtering
	EnablePrivateSubnetFiltering bool `json:"enablePrivateSubnetFiltering,omitempty"`
	// PrivateSubnetFilteringMode is the private subnet filtering mode
	PrivateSubnetFilteringMode string `json:"privateSubnetFilteringMode,omitempty"`
	// PrivateSubnetFilteringRouteTables is the list of route tables for private subnet filtering
	PrivateSubnetFilteringRouteTables []string `json:"privateSubnetFilteringRouteTables,omitempty"`
	// PrivateSubnetFilteringTags is the list of tags for private subnet filtering
	PrivateSubnetFilteringTags []string `json:"privateSubnetFilteringTags,omitempty"`
	// EnablePublicSubnetFiltering enables public subnet filtering
	EnablePublicSubnetFiltering bool `json:"enablePublicSubnetFiltering,omitempty"`
	// PublicSubnetFilteringMode is the public subnet filtering mode
	PublicSubnetFilteringMode string `json:"publicSubnetFilteringMode,omitempty"`
	// PublicSubnetFilteringRouteTables is the list of route tables for public subnet filtering
	PublicSubnetFilteringRouteTables []string `json:"publicSubnetFilteringRouteTables,omitempty"`
	// PublicSubnetFilteringTags is the list of tags for public subnet filtering
	PublicSubnetFilteringTags []string `json:"publicSubnetFilteringTags,omitempty"`
	// Tags for resource tagging
	Tags map[string]string `json:"tags,omitempty"`
}

// AviatrixVpcStatus defines the observed state of AviatrixVpc
type AviatrixVpcStatus struct {
	// Phase represents the current phase of VPC lifecycle
	Phase string `json:"phase"`
	// State represents the current state of the VPC
	State string `json:"state"`
	// VpcID is the VPC ID
	VpcID string `json:"vpcId,omitempty"`
	// Subnets is the list of subnets
	Subnets []SubnetInfo `json:"subnets,omitempty"`
	// LastUpdated is the timestamp of the last update
	LastUpdated metav1.Time `json:"lastUpdated,omitempty"`
	// Conditions represent the latest available observations of the VPC's state
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

// SubnetInfo defines subnet information
type SubnetInfo struct {
	// SubnetID is the subnet ID
	SubnetID string `json:"subnetId"`
	// CIDR is the subnet CIDR
	CIDR string `json:"cidr"`
	// AvailabilityZone is the availability zone
	AvailabilityZone string `json:"availabilityZone"`
	// Type is the subnet type (public, private)
	Type string `json:"type"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// AviatrixVpc is the Schema for the aviatrixvpcs API
type AviatrixVpc struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AviatrixVpcSpec   `json:"spec,omitempty"`
	Status AviatrixVpcStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AviatrixVpcList contains a list of AviatrixVpc
type AviatrixVpcList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AviatrixVpc `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AviatrixVpc{}, &AviatrixVpcList{})
}
