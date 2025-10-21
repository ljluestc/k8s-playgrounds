package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// AviatrixEdgeGatewaySpec defines the desired state of AviatrixEdgeGateway
type AviatrixEdgeGatewaySpec struct {
	// GwName is the name of the edge gateway
	GwName string `json:"gwName"`
	// SiteID is the site ID
	SiteID string `json:"siteId"`
	// GwSize is the size of the edge gateway
	GwSize string `json:"gwSize"`
	// EnableNat enables NAT
	EnableNat bool `json:"enableNat,omitempty"`
	// EnableLearnedCidrsApproval enables learned CIDR approval
	EnableLearnedCidrsApproval bool `json:"enableLearnedCidrsApproval,omitempty"`
	// ApprovedLearnedCidrs is the list of approved learned CIDRs
	ApprovedLearnedCidrs []string `json:"approvedLearnedCidrs,omitempty"`
	// SpokeBgpManualAdvertiseCidrs is the list of manually advertised CIDRs
	SpokeBgpManualAdvertiseCidrs []string `json:"spokeBgpManualAdvertiseCidrs,omitempty"`
	// EnableSpokeBgp enables spoke BGP
	EnableSpokeBgp bool `json:"enableSpokeBgp,omitempty"`
	// BgpLanCidr is the BGP LAN CIDR
	BgpLanCidr string `json:"bgpLanCidr,omitempty"`
	// EnableBgpLan enables BGP LAN
	EnableBgpLan bool `json:"enableBgpLan,omitempty"`
	// EnableActiveMesh enables active mesh
	EnableActiveMesh bool `json:"enableActiveMesh,omitempty"`
	// Tags for resource tagging
	Tags map[string]string `json:"tags,omitempty"`
}

// AviatrixEdgeGatewayStatus defines the observed state of AviatrixEdgeGateway
type AviatrixEdgeGatewayStatus struct {
	// Phase represents the current phase of edge gateway lifecycle
	Phase string `json:"phase"`
	// State represents the current state of the edge gateway
	State string `json:"state"`
	// PublicIP is the public IP address of the edge gateway
	PublicIP string `json:"publicIP,omitempty"`
	// PrivateIP is the private IP address of the edge gateway
	PrivateIP string `json:"privateIP,omitempty"`
	// InstanceID is the instance ID of the edge gateway
	InstanceID string `json:"instanceId,omitempty"`
	// LastUpdated is the timestamp of the last update
	LastUpdated metav1.Time `json:"lastUpdated,omitempty"`
	// Conditions represent the latest available observations of the edge gateway's state
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// AviatrixEdgeGateway is the Schema for the aviatrixedgegateways API
type AviatrixEdgeGateway struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AviatrixEdgeGatewaySpec   `json:"spec,omitempty"`
	Status AviatrixEdgeGatewayStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AviatrixEdgeGatewayList contains a list of AviatrixEdgeGateway
type AviatrixEdgeGatewayList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AviatrixEdgeGateway `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AviatrixEdgeGateway{}, &AviatrixEdgeGatewayList{})
}
