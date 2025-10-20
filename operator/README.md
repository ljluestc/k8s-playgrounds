# K8s Playgrounds Operator

A comprehensive Kubernetes operator for managing all services in the K8s Playgrounds repository, inspired by the [ScyllaDB Operator](https://github.com/ljluestc/scylla-operator) and implementing features from the [Aviatrix Terraform Provider](https://registry.terraform.io/providers/AviatrixSystems/aviatrix).

## Features

### Core Services Management
- **Headless Services** with ClusterIP: None
- **StatefulSet Integration** with stable network identities
- **DNS Resolution** for Headless Services and individual pods
- **Endpoint Management** for service discovery
- **iptables Proxy Mode** for service routing
- **Service Discovery** mechanisms

### Advanced Features
- **Multi-zone cluster deployment**
- **Auto-scaling** (up and down)
- **Monitoring** with Prometheus and Grafana
- **Dead node replacement**
- **Version upgrades**
- **Backup and restore**
- **Auto-healing**
- **Security scanning**
- **Performance optimization**

### Supported Services
- Pod Management
- Service Management (including Headless Services)
- StatefulSet Management
- Deployment Management
- ConfigMap Management
- Secret Management
- Namespace Management
- NetworkPolicy Management
- Ingress Management
- PersistentVolume Management
- Job and CronJob Management
- DaemonSet Management
- ReplicaSet Management
- HorizontalPodAutoscaler Management

## Architecture

The operator follows the Kubernetes Operator pattern with:
- **Custom Resource Definitions (CRDs)**
- **Controllers** for each service type
- **Reconcilers** for desired state management
- **Webhooks** for validation and mutation
- **Metrics** and monitoring
- **Event handling**

## Quick Start

### Prerequisites
- Kubernetes 1.19+
- Go 1.19+
- Docker
- kubectl

### Installation

1. **Deploy the operator:**
```bash
kubectl apply -f deploy/operator.yaml
```

2. **Create a service cluster:**
```bash
kubectl apply -f examples/headless-service-cluster.yaml
```

3. **Monitor the deployment:**
```bash
kubectl get k8splaygroundsclusters
kubectl describe k8splaygroundscluster my-cluster
```

## Documentation

- [API Reference](docs/api-reference.md)
- [User Guide](docs/user-guide.md)
- [Developer Guide](docs/developer-guide.md)
- [Troubleshooting](docs/troubleshooting.md)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

Apache 2.0 License - see [LICENSE](LICENSE) for details.
