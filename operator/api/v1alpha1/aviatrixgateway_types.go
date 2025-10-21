package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// AviatrixGatewaySpec defines the desired state of AviatrixGateway
type AviatrixGatewaySpec struct {
	// CloudType specifies the cloud provider (aws, azure, gcp, oci, etc.)
	CloudType string `json:"cloudType"`
	// AccountName is the cloud account name in Aviatrix Controller
	AccountName string `json:"accountName"`
	// GwName is the name of the gateway
	GwName string `json:"gwName"`
	// VpcID is the VPC ID where the gateway will be deployed
	VpcID string `json:"vpcId"`
	// VpcRegion is the region of the VPC
	VpcRegion string `json:"vpcRegion"`
	// GwSize is the size of the gateway instance
	GwSize string `json:"gwSize"`
	// Subnet is the subnet for the gateway
	Subnet string `json:"subnet"`
	// EnableNat enables NAT for the gateway
	EnableNat bool `json:"enableNat,omitempty"`
	// EnableVpcDnsServer enables VPC DNS server
	EnableVpcDnsServer bool `json:"enableVpcDnsServer,omitempty"`
	// EnableEncryptVolume enables encryption for the gateway volume
	EnableEncryptVolume bool `json:"enableEncryptVolume,omitempty"`
	// VolumeSize is the size of the gateway volume
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
	// HAGwSize is the size of the HA gateway
	HAGwSize string `json:"haGwSize,omitempty"`
	// HAZone is the availability zone for HA gateway
	HAZone string `json:"haZone,omitempty"`
	// HASubnet is the subnet for HA gateway
	HASubnet string `json:"haSubnet,omitempty"`
	// EnablePeeringHA enables peering HA
	EnablePeeringHA bool `json:"enablePeeringHA,omitempty"`
	// PeeringHASubnet is the subnet for peering HA
	PeeringHASubnet string `json:"peeringHASubnet,omitempty"`
	// PeeringHAZone is the availability zone for peering HA
	PeeringHAZone string `json:"peeringHAZone,omitempty"`
}

// AviatrixGatewayStatus defines the observed state of AviatrixGateway
type AviatrixGatewayStatus struct {
	// Phase represents the current phase of gateway lifecycle
	Phase string `json:"phase"`
	// State represents the current state of the gateway
	State string `json:"state"`
	// PublicIP is the public IP address of the gateway
	PublicIP string `json:"publicIP,omitempty"`
	// PrivateIP is the private IP address of the gateway
	PrivateIP string `json:"privateIP,omitempty"`
	// HAPublicIP is the public IP address of the HA gateway
	HAPublicIP string `json:"haPublicIP,omitempty"`
	// HAPrivateIP is the private IP address of the HA gateway
	HAPrivateIP string `json:"haPrivateIP,omitempty"`
	// InstanceID is the instance ID of the gateway
	InstanceID string `json:"instanceId,omitempty"`
	// HAInstanceID is the instance ID of the HA gateway
	HAInstanceID string `json:"haInstanceId,omitempty"`
	// LastUpdated is the timestamp of the last update
	LastUpdated metav1.Time `json:"lastUpdated,omitempty"`
	// Conditions represent the latest available observations of the gateway's state
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// AviatrixGateway is the Schema for the aviatrixgateways API
type AviatrixGateway struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AviatrixGatewaySpec   `json:"spec,omitempty"`
	Status AviatrixGatewayStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// AviatrixGatewayList contains a list of AviatrixGateway
type AviatrixGatewayList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []AviatrixGateway `json:"items"`
}

func init() {
	SchemeBuilder.Register(&AviatrixGateway{}, &AviatrixGatewayList{})
}
