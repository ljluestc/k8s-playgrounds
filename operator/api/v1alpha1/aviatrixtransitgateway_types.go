package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// AviatrixTransitGatewaySpec defines the desired state of AviatrixTransitGateway
type AviatrixTransitGatewaySpec struct {
	// CloudType specifies the cloud provider (aws, azure, gcp, oci, etc.)
	CloudType string `json:"cloudType"`
	// AccountName is the cloud account name in Aviatrix Controller
	AccountName string `json:"accountName"`
	// GwName is the name of the transit gateway
	GwName string `json:"gwName"`
	// VpcID is the VPC ID where the transit gateway will be deployed
	VpcID string `json:"vpcId"`
	// VpcRegion is the region of the VPC
	VpcRegion string `json:"vpcRegion"`
	// GwSize is the size of the transit gateway instance
	GwSize string `json:"gwSize"`
	// Subnet is the subnet for the transit gateway
	Subnet string `json:"subnet"`
	// EnableNat enables NAT for the transit gateway
	EnableNat bool `json:"enableNat,omitempty"`
	// EnableVpcDnsServer enables VPC DNS server
	EnableVpcDnsServer bool `json:"enableVpcDnsServer,omitempty"`
	// EnableEncryptVolume enables encryption for the transit gateway volume
	EnableEncryptVolume bool `json:"enableEncryptVolume,omitempty"`
	// VolumeSize is the size of the transit gateway volume
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
	// HAGwSize is the size of the HA transit gateway
	HAGwSize string `json:"haGwSize,omitempty"`
	// HAZone is the availability zone for HA transit gateway
	HAZone string `json:"haZone,omitempty"`
	// HASubnet is the subnet for HA transit gateway
	HASubnet string `json:"haSubnet,omitempty"`
	// EnablePeeringHA enables peering HA
	EnablePeeringHA bool `json:"enablePeeringHA,omitempty"`
	// PeeringHASubnet is the subnet for peering HA
	PeeringHASubnet string `json:"peeringHASubnet,omitempty"`
	// PeeringHAZone is the availability zone for peering HA
	PeeringHAZone string `json:"peeringHAZone,omitempty"`
	// EnableActiveMesh enables active mesh
	EnableActiveMesh bool `json:"enableActiveMesh,omitempty"`
	// EnableLearnedCidrsApproval enables learned CIDR approval
	EnableLearnedCidrsApproval bool `json:"enableLearnedCidrsApproval,omitempty"`
	// ApprovedLearnedCidrs is the list of approved learned CIDRs
	ApprovedLearnedCidrs []string `json:"approvedLearnedCidrs,omitempty"`
	// TransitBgpManualAdvertiseCidrs is the list of manually advertised CIDRs
	TransitBgpManualAdvertiseCidrs []string `json:"transitBgpManualAdvertiseCidrs,omitempty"`
	// EnableTransitBgp enables transit BGP
	EnableTransitBgp bool `json:"enableTransitBgp,omitempty"`
	// BgpLanCidr is the BGP LAN CIDR
	BgpLanCidr string `json:"bgpLanCidr,omitempty"`
	// BgpLanVpcID is the BGP LAN VPC ID
	BgpLanVpcID string `json:"bgpLanVpcId,omitempty"`
	// EnableBgpLan enables BGP LAN
	EnableBgpLan bool `json:"enableBgpLan,omitempty"`
	// EnableSegmentation enables segmentation
	EnableSegmentation bool `json:"enableSegmentation,omitempty"`
	// EnableFireNet enables FireNet
	EnableFireNet bool `json:"enableFireNet,omitempty"`
	// EnableGatewayLoadBalancer enables gateway load balancer
	EnableGatewayLoadBalancer bool `json:"enableGatewayLoadBalancer,omitempty"`
	// EnableMulticast enables multicast
	EnableMulticast bool `json:"enableMulticast,omitempty"`
	// MulticastSubnet is the multicast subnet
	MulticastSubnet string `json:"multicastSubnet,omitempty"`
	// MulticastVpcID is the multicast VPC ID
	MulticastVpcID string `json:"multicastVpcId,omitempty"`
	// MulticastZone is the multicast zone
	MulticastZone string `json:"multicastZone,omitempty"`
	// EnableMulticastInterfaces enables multicast interfaces
	EnableMulticastInterfaces bool `json:"enableMulticastInterfaces,omitempty"`
	// MulticastInterfaces is the list of multicast interfaces
	MulticastInterfaces []MulticastInterface `json:"multicastInterfaces,omitempty"`
}

// MulticastInterface defines a multicast interface
type MulticastInterface struct {
	// SubnetID is the subnet ID for the multicast interface
	SubnetID string `json:"subnetId"`
	// VpcID is the VPC ID for the multicast interface
	VpcID string `json:"vpcId"`
}

// AviatrixTransitGatewayStatus defines the observed state of AviatrixTransitGateway
type AviatrixTransitGatewayStatus struct {
	// Phase represents the current phase of transit gateway lifecycle
	Phase string `json:"phase"`
	// State represents the current state of the transit gateway
	State string `json:"state"`
	// PublicIP is the public IP address of the transit gateway
	PublicIP string `json:"publicIP,omitempty"`
	// PrivateIP is the private IP address of the transit gateway
	PrivateIP string `json:"privateIP,omitempty"`
	// HAPublicIP is the public IP address of the HA transit gateway
	HAPublicIP string `json:"haPublicIP,omitempty"`
	// HAPrivateIP is the private IP address of the HA transit gateway
	HAPrivateIP string `json:"haPrivateIP,omitempty"`
	// InstanceID is the instance ID of the transit gateway
	InstanceID string `json:"instanceId,omitempty"`
	// HAInstanceID is the instance ID of the HA transit gateway
	HAInstanceID string `json:"haInstanceId,omitempty"`
	// LastUpdated is the timestamp of the last update
	LastUpdated metav1.Time `json:"lastUpdated,omitempty"`
	// Conditions represent the latest available observations of the transit gateway's state
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// AviatrixTransitGateway is the Schema for the aviatrixtransitgateways API
type AviatrixTransitGateway struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AviatrixTransitGatewaySpec   `json:"spec,omitempty"`
	Status AviatrixTransitGatewayStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AviatrixTransitGatewayList contains a list of AviatrixTransitGateway
type AviatrixTransitGatewayList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AviatrixTransitGateway `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AviatrixTransitGateway{}, &AviatrixTransitGatewayList{})
}
