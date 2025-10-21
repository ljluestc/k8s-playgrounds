# Aviatrix Kubernetes Operator

A comprehensive Kubernetes operator for managing Aviatrix networking and security resources, inspired by the [ScyllaDB operator](https://github.com/ljluestc/scylla-operator) architecture and implementing features from the [Aviatrix Terraform provider](https://registry.terraform.io/providers/AviatrixSystems/aviatrix/latest/docs).

## 🚀 Overview

The Aviatrix Kubernetes Operator provides a Kubernetes-native way to manage Aviatrix networking infrastructure, including gateways, VPCs, firewalls, network domains, and microsegmentation policies. It follows the operator pattern established by successful projects like the ScyllaDB operator, providing declarative management of complex networking resources.

## ✨ Features

### Core Aviatrix Resources
- **AviatrixController**: Manage Aviatrix Controller instances
- **AviatrixGateway**: Deploy and manage Aviatrix gateways
- **AviatrixSpokeGateway**: Manage spoke gateways with transit connectivity
- **AviatrixTransitGateway**: Deploy transit gateways for hub-and-spoke topologies
- **AviatrixVpc**: Create and manage VPCs across cloud providers
- **AviatrixFirewall**: Configure firewall rules and policies
- **AviatrixNetworkDomain**: Manage network domains for segmentation
- **AviatrixSegmentationSecurityDomain**: Implement network segmentation
- **AviatrixMicrosegPolicy**: Define microsegmentation policies
- **AviatrixEdgeGateway**: Deploy edge gateways for on-premises connectivity

### Advanced Networking Features
- **Multi-Cloud Support**: AWS, Azure, GCP, OCI, and other cloud providers
- **Transit Gateway Peering**: Connect transit gateways across regions and clouds
- **Spoke Gateway Management**: Automated spoke-to-transit attachments
- **BGP Configuration**: Advanced BGP routing and policy management
- **Active Mesh**: Enable active mesh networking
- **Multicast Support**: Configure multicast networking
- **FireNet Integration**: Deploy and manage FireNet instances

### Security and Segmentation
- **Network Segmentation**: Implement zero-trust network segmentation
- **Microsegmentation**: Define granular security policies
- **Firewall Management**: Comprehensive firewall rule management
- **Security Groups**: Manage security groups and policies
- **Policy Enforcement**: Automated policy enforcement and compliance

### Edge and On-Premises
- **Edge Gateway Deployment**: Deploy gateways at edge locations
- **Site Management**: Manage edge sites and connectivity
- **BGP LAN Configuration**: Configure BGP LAN networking
- **Learned CIDR Management**: Manage learned CIDR advertisements

## 🏗️ Architecture

The operator follows the standard Kubernetes operator pattern with the following components:

### Custom Resource Definitions (CRDs)
- **aviatrixcontrollers.aviatrix.k8s.io**: Controller management
- **aviatrixgateways.aviatrix.k8s.io**: Gateway management
- **aviatrixspokegateways.aviatrix.k8s.io**: Spoke gateway management
- **aviatrixtransitgateways.aviatrix.k8s.io**: Transit gateway management
- **aviatrixvpcs.aviatrix.k8s.io**: VPC management
- **aviatrixfirewalls.aviatrix.k8s.io**: Firewall management
- **aviatrixnetworkdomains.aviatrix.k8s.io**: Network domain management
- **aviatrixsegmentationsecuritydomains.aviatrix.k8s.io**: Segmentation domains
- **aviatrixmicrosegpolicies.aviatrix.k8s.io**: Microsegmentation policies
- **aviatrixedgegateways.aviatrix.k8s.io**: Edge gateway management

### Controllers and Reconcilers
Each CRD has a corresponding controller that implements the reconciliation loop:
- **AviatrixControllerReconciler**: Manages controller lifecycle
- **AviatrixGatewayReconciler**: Handles gateway operations
- **AviatrixSpokeGatewayReconciler**: Manages spoke gateways
- **AviatrixTransitGatewayReconciler**: Handles transit gateways
- **AviatrixVpcReconciler**: Manages VPC lifecycle
- **AviatrixFirewallReconciler**: Handles firewall rules
- **AviatrixNetworkDomainReconciler**: Manages network domains
- **AviatrixSegmentationSecurityDomainReconciler**: Handles segmentation
- **AviatrixMicrosegPolicyReconciler**: Manages microsegmentation
- **AviatrixEdgeGatewayReconciler**: Handles edge gateways

### Manager Packages
- **Cloud Manager**: Handles cloud provider operations
- **Network Manager**: Manages networking configurations
- **Security Manager**: Handles security and segmentation

## 🛠️ Installation

### Prerequisites
- Kubernetes cluster (v1.19+)
- Aviatrix Controller access
- kubectl configured

### Deploy the Operator

1. **Install CRDs**:
```bash
kubectl apply -f deploy/crds/
```

2. **Deploy the Operator**:
```bash
kubectl apply -f deploy/operator.yaml
```

3. **Create Controller Secret**:
```bash
kubectl create secret generic aviatrix-controller-secret \
  --from-literal=controller-ip=YOUR_CONTROLLER_IP \
  --from-literal=username=YOUR_USERNAME \
  --from-literal=password=YOUR_PASSWORD \
  -n aviatrix-system
```

## 📖 Usage Examples

### Deploy an Aviatrix Controller

```yaml
apiVersion: aviatrix.k8s.io/v1alpha1
kind: AviatrixController
metadata:
  name: aviatrix-controller
  namespace: default
spec:
  controllerIP: 10.0.0.100
  username: admin
  password: password123
  version: '6.8'
  cloudType: aws
  accountName: aws-account
  region: us-west-2
  cidr: 10.0.0.0/16
  instanceSize: t3.medium
  enableHA: false
  tags:
    environment: production
    team: networking
```

### Deploy a Transit Gateway

```yaml
apiVersion: aviatrix.k8s.io/v1alpha1
kind: AviatrixTransitGateway
metadata:
  name: transit-gateway
  namespace: default
spec:
  cloudType: aws
  accountName: aws-account
  gwName: transit-gateway
  vpcId: vpc-12345678
  vpcRegion: us-west-2
  gwSize: t3.large
  subnet: subnet-12345678
  enableNat: true
  enableActiveMesh: true
  enableTransitBgp: true
  enableSegmentation: true
  enableFireNet: false
  haEnabled: true
  haGwSize: t3.large
  haZone: us-west-2b
  haSubnet: subnet-87654321
  tags:
    environment: production
    team: networking
```

### Deploy a Spoke Gateway

```yaml
apiVersion: aviatrix.k8s.io/v1alpha1
kind: AviatrixSpokeGateway
metadata:
  name: spoke-gateway
  namespace: default
spec:
  cloudType: aws
  accountName: aws-account
  gwName: spoke-gateway
  vpcId: vpc-87654321
  vpcRegion: us-west-2
  gwSize: t3.medium
  subnet: subnet-87654321
  enableNat: true
  transitGw: transit-gateway
  enableActiveMesh: true
  enableLearnedCidrsApproval: true
  approvedLearnedCidrs:
    - 10.1.0.0/16
    - 10.2.0.0/16
  enableSpokeBgp: true
  bgpLanCidr: 10.100.0.0/24
  enableBgpLan: true
  haEnabled: true
  haGwSize: t3.medium
  haZone: us-west-2b
  haSubnet: subnet-87654322
  tags:
    environment: production
    team: networking
```

### Configure Firewall Rules

```yaml
apiVersion: aviatrix.k8s.io/v1alpha1
kind: AviatrixFirewall
metadata:
  name: gateway-firewall
  namespace: default
spec:
  gwName: spoke-gateway
  basePolicy: allow-all
  baseLogEnabled: true
  rules:
    - protocol: tcp
      srcIp: 10.1.0.0/16
      dstIp: 10.2.0.0/16
      port: '80'
      action: allow
      logEnabled: true
      description: Allow HTTP traffic between subnets
    - protocol: tcp
      srcIp: 10.1.0.0/16
      dstIp: 10.2.0.0/16
      port: '443'
      action: allow
      logEnabled: true
      description: Allow HTTPS traffic between subnets
    - protocol: all
      srcIp: 0.0.0.0/0
      dstIp: 0.0.0.0/0
      port: all
      action: deny
      logEnabled: true
      description: Deny all other traffic
  tags:
    environment: production
    team: security
```

### Create Network Domain

```yaml
apiVersion: aviatrix.k8s.io/v1alpha1
kind: AviatrixNetworkDomain
metadata:
  name: production-domain
  namespace: default
spec:
  name: production-domain
  type: aws-tgw
  accountName: aws-account
  region: us-west-2
  cidr: 10.0.0.0/16
  cloudType: aws
  tags:
    environment: production
    team: networking
```

### Define Microsegmentation Policy

```yaml
apiVersion: aviatrix.k8s.io/v1alpha1
kind: AviatrixMicrosegPolicy
metadata:
  name: web-to-db-policy
  namespace: default
spec:
  name: web-to-db-policy
  description: Allow web servers to access database
  source:
    type: subnet
    value: 10.1.0.0/16
  destination:
    type: subnet
    value: 10.2.0.0/16
  action: allow
  port: '3306'
  protocol: tcp
  logEnabled: true
  tags:
    environment: production
    team: security
```

## 🧪 Testing

The operator includes comprehensive tests:

```bash
# Run unit tests
go test ./...

# Run integration tests
go test ./controllers/...

# Run with coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## 🔧 Development

### Prerequisites
- Go 1.21+
- Kubernetes 1.19+
- kubebuilder
- controller-gen

### Building

```bash
# Build the operator
go build -o bin/manager cmd/manager/main.go

# Build Docker image
docker build -t aviatrix-operator:latest .
```

### Code Generation

```bash
# Generate CRDs
make manifests

# Generate code
make generate
```

## 📚 API Reference

### AviatrixController

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| controllerIP | string | Yes | IP address of Aviatrix Controller |
| username | string | Yes | Username for authentication |
| password | string | Yes | Password for authentication |
| version | string | No | Controller version |
| cloudType | string | Yes | Cloud provider type |
| accountName | string | Yes | Cloud account name |
| region | string | Yes | Deployment region |
| cidr | string | Yes | VPC CIDR block |
| instanceSize | string | Yes | Instance size |
| enableHA | bool | No | Enable high availability |
| tags | map[string]string | No | Resource tags |

### AviatrixGateway

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cloudType | string | Yes | Cloud provider type |
| accountName | string | Yes | Cloud account name |
| gwName | string | Yes | Gateway name |
| vpcId | string | Yes | VPC ID |
| vpcRegion | string | Yes | VPC region |
| gwSize | string | Yes | Gateway size |
| subnet | string | Yes | Subnet for gateway |
| enableNat | bool | No | Enable NAT |
| enableVpcDnsServer | bool | No | Enable VPC DNS server |
| enableEncryptVolume | bool | No | Enable volume encryption |
| volumeSize | int | No | Volume size in GB |
| haEnabled | bool | No | Enable high availability |
| haGwSize | string | No | HA gateway size |
| haZone | string | No | HA availability zone |
| haSubnet | string | No | HA subnet |
| tags | map[string]string | No | Resource tags |

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Operator Documentation](https://aviatrix-operator.docs.io)
- **Issues**: [GitHub Issues](https://github.com/aviatrix-operator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/aviatrix-operator/discussions)
- **Slack**: [#aviatrix-operator](https://aviatrix.slack.com/channels/aviatrix-operator)

## 🙏 Acknowledgments

- Inspired by the [ScyllaDB operator](https://github.com/ljluestc/scylla-operator) architecture
- Features based on the [Aviatrix Terraform provider](https://registry.terraform.io/providers/AviatrixSystems/aviatrix/latest/docs)
- Built with [kubebuilder](https://kubebuilder.io/) and [controller-runtime](https://github.com/kubernetes-sigs/controller-runtime)