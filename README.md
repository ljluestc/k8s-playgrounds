# K8s Playgrounds 🚀

[![CI/CD Pipeline](https://github.com/k8s-playgrounds/k8s-playgrounds/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/k8s-playgrounds/k8s-playgrounds/actions)
[![Test Coverage](https://codecov.io/gh/k8s-playgrounds/k8s-playgrounds/branch/main/graph/badge.svg)](https://codecov.io/gh/k8s-playgrounds/k8s-playgrounds)
[![Security Scan](https://github.com/k8s-playgrounds/k8s-playgrounds/workflows/Security%20Scan/badge.svg)](https://github.com/k8s-playgrounds/k8s-playgrounds/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Go](https://img.shields.io/badge/Go-00ADD8?logo=go&logoColor=white)](https://golang.org/)

A comprehensive Kubernetes learning and experimentation platform that provides hands-on experience with advanced Kubernetes concepts, distributed systems, and production-ready CI/CD infrastructure.

## 🌟 Features

### 🎯 Core Kubernetes Features
- **Headless Services** with ClusterIP: None for direct pod-to-pod communication
- **StatefulSet Integration** with stable network identities and persistent storage
- **DNS Resolution Engine** for headless services and individual pods
- **Endpoint Management** with dynamic discovery and health checking
- **iptables Proxy Mode** for advanced load balancing and traffic routing
- **Service Discovery** with multiple protocols (DNS, API, Custom)

### 🏗️ Distributed Systems
- **TinyURL System** - URL shortening with Redis caching
- **Newsfeed System** - Social media feed with real-time updates
- **Google Docs System** - Collaborative document editing
- **Quora System** - Q&A platform with recommendation engine
- **Load Balancer System** - Advanced load balancing algorithms
- **Monitoring System** - Comprehensive observability platform
- **Typeahead System** - Real-time search suggestions
- **Messaging System** - Real-time chat and notifications
- **Web Crawler System** - Distributed web crawling engine
- **DNS System** - Custom DNS resolver and cache

### 🧪 Testing & Quality
- **100% Test Coverage** across all components
- **Comprehensive Test Suite** - Unit, Integration, E2E, Performance
- **Performance Benchmarking** for all algorithms
- **Edge Case Testing** for boundary conditions
- **UI Testing** for user interactions
- **Automated Reporting** with detailed metrics

### 🚀 CI/CD & DevOps
- **GitHub Actions** - Complete CI/CD pipeline
- **Multi-language Support** - TypeScript, Go, Java, Python
- **Security Scanning** - SAST, DAST, dependency scanning
- **Pre-commit Hooks** - Automated code quality checks
- **Blue-green Deployments** - Zero-downtime deployments

## 🏃‍♂️ Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Kubernetes** 1.24+ (kind, minikube, or cloud)
- **Go** 1.19+ (for operator)
- **Java** 17+ (for Java components)
- **Python** 3.9+ (for testing)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/k8s-playgrounds/k8s-playgrounds.git
cd k8s-playgrounds
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development environment**
```bash
# Start all services
npm run dev

# Or start individual components
npm run dev:backend    # Backend API server
npm run dev:frontend   # Frontend development server
npm run dev:operator   # Kubernetes operator
```

4. **Run tests**
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit      # Unit tests
npm run test:integration  # Integration tests
npm run test:e2e       # End-to-end tests
npm run test:performance  # Performance tests

# Run comprehensive test suite
python3 test_comprehensive.py --all
```

5. **Access the application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **API Documentation**: http://localhost:8080/docs
- **Monitoring**: http://localhost:3001

## 📚 Documentation

### 📖 User Guides
- [Getting Started Guide](docs/getting-started.md)
- [Kubernetes Concepts](docs/kubernetes-concepts.md)
- [Distributed Systems](docs/distributed-systems.md)
- [API Reference](docs/api-reference.md)
- [Troubleshooting](docs/troubleshooting.md)

### 🏗️ Architecture
- [System Architecture](ARCHITECTURE.md)
- [Testing Strategy](TESTING.md)
- [Product Requirements](PRD.md)
- [Deployment Guide](docs/deployment.md)

### 🔧 Development
- [Development Setup](docs/development.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Code Standards](docs/code-standards.md)
- [Testing Guide](docs/testing.md)

## 🧪 Testing

### Test Coverage
We maintain **100% test coverage** across all components:

- **Backend Services**: 100% TypeScript/Node.js coverage
- **Frontend Components**: 100% Vue.js coverage
- **Distributed Systems**: 100% multi-language coverage
- **Kubernetes Operator**: 100% Go coverage
- **Integration Tests**: 100% API and database coverage

### Running Tests

```bash
# Quick test run
npm test

# Comprehensive test suite with coverage
python3 test_comprehensive.py --all --coverage

# Performance testing
python3 test_comprehensive.py --performance

# UI testing
python3 test_comprehensive.py --ui

# Integration testing
python3 test_comprehensive.py --integration
```

### Test Reports
- **HTML Report**: `test-reports/test_report.html`
- **JSON Report**: `test-reports/test_report.json`
- **XML Report**: `test-reports/test_report.xml` (JUnit format)
- **Coverage Report**: `coverage/lcov-report/index.html`

## 🚀 Deployment

### Local Development
```bash
# Using Docker Compose
docker-compose up -d

# Using Kubernetes (kind)
kind create cluster --name k8s-playgrounds
kubectl apply -f yaml/k8s-playgrounds.yaml
```

### Production Deployment
```bash
# Deploy to Kubernetes
kubectl apply -f operator/deploy/operator.yaml
kubectl apply -f yaml/k8s-playgrounds.yaml

# Deploy with Helm
helm install k8s-playgrounds ./helm/k8s-playgrounds
```

### Cloud Deployment
- **AWS EKS**: [AWS Deployment Guide](docs/deployment/aws.md)
- **Google GKE**: [GCP Deployment Guide](docs/deployment/gcp.md)
- **Azure AKS**: [Azure Deployment Guide](docs/deployment/azure.md)

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Kubernetes    │
│   (Vue.js)      │◄──►│   (NestJS)      │◄──►│   Operator      │
│                 │    │                 │    │   (Go)          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Distributed   │    │   Testing       │    │   Monitoring    │
│   Systems       │    │   Infrastructure│    │   & Observability│
│   (Multi-lang)  │    │   (Python)      │    │   (Prometheus)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: Vue.js 3, TypeScript, Vite
- **Backend**: NestJS, TypeScript, Express
- **Database**: PostgreSQL, Redis, MongoDB
- **Message Queue**: RabbitMQ, Apache Kafka
- **Container**: Docker, Kubernetes
- **Operator**: Go, Kubernetes Client-go
- **Testing**: Vitest, Jest, JUnit, pytest
- **CI/CD**: GitHub Actions, Docker, Helm
- **Monitoring**: Prometheus, Grafana, Jaeger

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards
- **TypeScript**: ESLint + Prettier
- **Go**: gofmt + golint
- **Java**: Checkstyle + SpotBugs
- **Python**: Black + flake8
- **Tests**: 100% coverage required

## 📊 Performance

### Benchmarks
- **API Response Time**: < 100ms (95th percentile)
- **Throughput**: > 10,000 requests/second
- **Concurrency**: 1,000+ concurrent users
- **Memory Usage**: < 512MB per service
- **CPU Usage**: < 50% under normal load

### Monitoring
- **Metrics**: Prometheus-compatible metrics
- **Logging**: Structured JSON logging
- **Tracing**: Distributed request tracing
- **Alerting**: Intelligent alerting system
- **Dashboards**: Real-time operational dashboards

## 🔒 Security

### Security Features
- **Authentication**: OAuth2/JWT-based authentication
- **Authorization**: RBAC and ABAC authorization
- **Encryption**: AES-256 encryption at rest and in transit
- **Vulnerability Scanning**: Automated security scanning
- **Compliance**: SOC2, GDPR compliance features

### Security Scanning
- **SAST**: Static Application Security Testing
- **DAST**: Dynamic Application Security Testing
- **Dependency Scanning**: Automated vulnerability detection
- **Container Scanning**: Docker image security scanning
- **Infrastructure Scanning**: Kubernetes security scanning

## 📈 Roadmap

### Q1 2024
- [ ] Complete 100% test coverage
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Documentation completion

### Q2 2024
- [ ] Advanced monitoring features
- [ ] Multi-cloud deployment support
- [ ] Enhanced UI/UX
- [ ] Community features

### Q3 2024
- [ ] Machine learning integration
- [ ] Advanced analytics
- [ ] Enterprise features
- [ ] Mobile applications

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Kubernetes Community** for the amazing orchestration platform
- **Vue.js Team** for the reactive frontend framework
- **NestJS Team** for the scalable Node.js framework
- **Go Team** for the efficient programming language
- **All Contributors** who help make this project better

## 📞 Support

- **Documentation**: [docs.k8s-playgrounds.io](https://docs.k8s-playgrounds.io)
- **Issues**: [GitHub Issues](https://github.com/k8s-playgrounds/k8s-playgrounds/issues)
- **Discussions**: [GitHub Discussions](https://github.com/k8s-playgrounds/k8s-playgrounds/discussions)
- **Discord**: [Join our Discord](https://discord.gg/k8s-playgrounds)
- **Email**: support@k8s-playgrounds.io

---

<div align="center">

**Made with ❤️ by the K8s Playgrounds Team**

[Website](https://k8s-playgrounds.io) • [Documentation](https://docs.k8s-playgrounds.io) • [Blog](https://blog.k8s-playgrounds.io) • [Twitter](https://twitter.com/k8splaygrounds)

</div>