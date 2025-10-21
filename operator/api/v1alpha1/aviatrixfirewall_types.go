package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// AviatrixFirewallSpec defines the desired state of AviatrixFirewall
type AviatrixFirewallSpec struct {
	// GwName is the name of the gateway
	GwName string `json:"gwName"`
	// BasePolicy is the base policy (allow-all, deny-all)
	BasePolicy string `json:"basePolicy"`
	// BaseLogEnabled enables base logging
	BaseLogEnabled bool `json:"baseLogEnabled,omitempty"`
	// Rules is the list of firewall rules
	Rules []FirewallRule `json:"rules,omitempty"`
	// Tags for resource tagging
	Tags map[string]string `json:"tags,omitempty"`
}

// FirewallRule defines a firewall rule
type FirewallRule struct {
	// Protocol is the protocol (tcp, udp, icmp, all)
	Protocol string `json:"protocol"`
	// SrcIP is the source IP address
	SrcIP string `json:"srcIp"`
	// DstIP is the destination IP address
	DstIP string `json:"dstIp"`
	// Port is the port number
	Port string `json:"port"`
	// Action is the action (allow, deny)
	Action string `json:"action"`
	// LogEnabled enables logging for this rule
	LogEnabled bool `json:"logEnabled,omitempty"`
	// Description is the description of the rule
	Description string `json:"description,omitempty"`
}

// AviatrixFirewallStatus defines the observed state of AviatrixFirewall
type AviatrixFirewallStatus struct {
	// Phase represents the current phase of firewall lifecycle
	Phase string `json:"phase"`
	// State represents the current state of the firewall
	State string `json:"state"`
	// RuleCount is the number of rules
	RuleCount int `json:"ruleCount,omitempty"`
	// LastUpdated is the timestamp of the last update
	LastUpdated metav1.Time `json:"lastUpdated,omitempty"`
	// Conditions represent the latest available observations of the firewall's state
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// AviatrixFirewall is the Schema for the aviatrixfirewalls API
type AviatrixFirewall struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AviatrixFirewallSpec   `json:"spec,omitempty"`
	Status AviatrixFirewallStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AviatrixFirewallList contains a list of AviatrixFirewall
type AviatrixFirewallList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AviatrixFirewall `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AviatrixFirewall{}, &AviatrixFirewallList{})
}
