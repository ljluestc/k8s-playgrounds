package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// AviatrixMicrosegPolicySpec defines the desired state of AviatrixMicrosegPolicy
type AviatrixMicrosegPolicySpec struct {
	// Name is the name of the microsegmentation policy
	Name string `json:"name"`
	// Description is the description of the policy
	Description string `json:"description,omitempty"`
	// Source is the source of the policy
	Source PolicyEndpoint `json:"source"`
	// Destination is the destination of the policy
	Destination PolicyEndpoint `json:"destination"`
	// Action is the action (allow, deny)
	Action string `json:"action"`
	// Port is the port number
	Port string `json:"port"`
	// Protocol is the protocol (tcp, udp, icmp, all)
	Protocol string `json:"protocol"`
	// LogEnabled enables logging
	LogEnabled bool `json:"logEnabled,omitempty"`
	// Tags for resource tagging
	Tags map[string]string `json:"tags,omitempty"`
}

// PolicyEndpoint defines a policy endpoint
type PolicyEndpoint struct {
	// Type is the type of endpoint (subnet, tag, instance)
	Type string `json:"type"`
	// Value is the value of the endpoint
	Value string `json:"value"`
	// Region is the region (for instance type)
	Region string `json:"region,omitempty"`
	// VpcID is the VPC ID (for instance type)
	VpcID string `json:"vpcId,omitempty"`
}

// AviatrixMicrosegPolicyStatus defines the observed state of AviatrixMicrosegPolicy
type AviatrixMicrosegPolicyStatus struct {
	// Phase represents the current phase of microsegmentation policy lifecycle
	Phase string `json:"phase"`
	// State represents the current state of the microsegmentation policy
	State string `json:"state"`
	// PolicyID is the microsegmentation policy ID
	PolicyID string `json:"policyId,omitempty"`
	// LastUpdated is the timestamp of the last update
	LastUpdated metav1.Time `json:"lastUpdated,omitempty"`
	// Conditions represent the latest available observations of the microsegmentation policy's state
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// AviatrixMicrosegPolicy is the Schema for the aviatrixmicrosegpolicies API
type AviatrixMicrosegPolicy struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AviatrixMicrosegPolicySpec   `json:"spec,omitempty"`
	Status AviatrixMicrosegPolicyStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AviatrixMicrosegPolicyList contains a list of AviatrixMicrosegPolicy
type AviatrixMicrosegPolicyList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AviatrixMicrosegPolicy `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AviatrixMicrosegPolicy{}, &AviatrixMicrosegPolicyList{})
}
