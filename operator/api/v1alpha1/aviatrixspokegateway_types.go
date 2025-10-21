package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// AviatrixSpokeGatewaySpec defines the desired state of AviatrixSpokeGateway
type AviatrixSpokeGatewaySpec struct {
	// CloudType specifies the cloud provider (aws, azure, gcp, oci, etc.)
	CloudType string `json:"cloudType"`
	// AccountName is the cloud account name in Aviatrix Controller
	AccountName string `json:"accountName"`
	// GwName is the name of the spoke gateway
	GwName string `json:"gwName"`
	// VpcID is the VPC ID where the spoke gateway will be deployed
	VpcID string `json:"vpcId"`
	// VpcRegion is the region of the VPC
	VpcRegion string `json:"vpcRegion"`
	// GwSize is the size of the spoke gateway instance
	GwSize string `json:"gwSize"`
	// Subnet is the subnet for the spoke gateway
	Subnet string `json:"subnet"`
	// EnableNat enables NAT for the spoke gateway
	EnableNat bool `json:"enableNat,omitempty"`
	// EnableVpcDnsServer enables VPC DNS server
	EnableVpcDnsServer bool `json:"enableVpcDnsServer,omitempty"`
	// EnableEncryptVolume enables encryption for the spoke gateway volume
	EnableEncryptVolume bool `json:"enableEncryptVolume,omitempty"`
	// VolumeSize is the size of the spoke gateway volume
	VolumeSize int `json:"volumeSize,omitempty"`
	// EnableMonitorSubnets enables monitoring of subnets
	EnableMonitorSubnets bool `json:"enableMonitorSubnets,omitempty"`
	// EnablePublicSubnetFiltering enables public subnet filtering
	EnablePublicSubnetFiltering bool `json:"enablePublicSubnetFiltering,omitempty"`
	// EnablePrivateOob enables private out-of-band management
	EnablePrivateOob bool `json:"enablePrivateOob,omitempty"`
	// OobManagementSubnet is the out-of-band management subnet
	OobManagementSubnet string `json:"oobManagementSubnet,omitempty"`
	// OobAvailabilityZone is the out-of-band availability zone
	OobAvailabilityZone string `json:"oobAvailabilityZone,omitempty"`
	// Tags for resource tagging
	Tags map[string]string `json:"tags,omitempty"`
	// HAEnabled enables high availability
	HAEnabled bool `json:"haEnabled,omitempty"`
	// HAGwSize is the size of the HA spoke gateway
	HAGwSize string `json:"haGwSize,omitempty"`
	// HAZone is the availability zone for HA spoke gateway
	HAZone string `json:"haZone,omitempty"`
	// HASubnet is the subnet for HA spoke gateway
	HASubnet string `json:"haSubnet,omitempty"`
	// EnablePeeringHA enables peering HA
	EnablePeeringHA bool `json:"enablePeeringHA,omitempty"`
	// PeeringHASubnet is the subnet for peering HA
	PeeringHASubnet string `json:"peeringHASubnet,omitempty"`
	// PeeringHAZone is the availability zone for peering HA
	PeeringHAZone string `json:"peeringHAZone,omitempty"`
	// TransitGw is the transit gateway to attach to
	TransitGw string `json:"transitGw,omitempty"`
	// EnableActiveMesh enables active mesh
	EnableActiveMesh bool `json:"enableActiveMesh,omitempty"`
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
	// BgpLanVpcID is the BGP LAN VPC ID
	BgpLanVpcID string `json:"bgpLanVpcId,omitempty"`
	// EnableBgpLan enables BGP LAN
	EnableBgpLan bool `json:"enableBgpLan,omitempty"`
}

// AviatrixSpokeGatewayStatus defines the observed state of AviatrixSpokeGateway
type AviatrixSpokeGatewayStatus struct {
	// Phase represents the current phase of spoke gateway lifecycle
	Phase string `json:"phase"`
	// State represents the current state of the spoke gateway
	State string `json:"state"`
	// PublicIP is the public IP address of the spoke gateway
	PublicIP string `json:"publicIP,omitempty"`
	// PrivateIP is the private IP address of the spoke gateway
	PrivateIP string `json:"privateIP,omitempty"`
	// HAPublicIP is the public IP address of the HA spoke gateway
	HAPublicIP string `json:"haPublicIP,omitempty"`
	// HAPrivateIP is the private IP address of the HA spoke gateway
	HAPrivateIP string `json:"haPrivateIP,omitempty"`
	// InstanceID is the instance ID of the spoke gateway
	InstanceID string `json:"instanceId,omitempty"`
	// HAInstanceID is the instance ID of the HA spoke gateway
	HAInstanceID string `json:"haInstanceId,omitempty"`
	// LastUpdated is the timestamp of the last update
	LastUpdated metav1.Time `json:"lastUpdated,omitempty"`
	// Conditions represent the latest available observations of the spoke gateway's state
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// AviatrixSpokeGateway is the Schema for the aviatrixspokegateways API
type AviatrixSpokeGateway struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AviatrixSpokeGatewaySpec   `json:"spec,omitempty"`
	Status AviatrixSpokeGatewayStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AviatrixSpokeGatewayList contains a list of AviatrixSpokeGateway
type AviatrixSpokeGatewayList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AviatrixSpokeGateway `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AviatrixSpokeGateway{}, &AviatrixSpokeGatewayList{})
}
