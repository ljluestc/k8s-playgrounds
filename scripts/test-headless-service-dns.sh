#!/bin/bash

# Headless Service DNS Resolution Test Script
# Based on the article: https://www.yp14.cn/2019/11/28/K8S-%E4%B9%8B-Headless-%E6%B5%85%E8%B0%88/
#
# This script demonstrates:
# 1. DNS resolution for Headless Services
# 2. Individual pod DNS resolution
# 3. Service discovery patterns
# 4. iptables proxy verification

set -e

# Configuration
NAMESPACE=${NAMESPACE:-"default"}
SERVICE_NAME=${SERVICE_NAME:-"nginx-test"}
DNS_SERVER=${DNS_SERVER:-"192.168.16.2"}
CLUSTER_DOMAIN=${CLUSTER_DOMAIN:-"cluster.local"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    log_success "kubectl is available"
}

# Check if nslookup is available
check_nslookup() {
    if ! command -v nslookup &> /dev/null; then
        log_error "nslookup is not installed or not in PATH"
        exit 1
    fi
    log_success "nslookup is available"
}

# Check if the Headless Service exists
check_headless_service() {
    log_info "Checking if Headless Service '$SERVICE_NAME' exists in namespace '$NAMESPACE'..."
    
    if kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" &> /dev/null; then
        local cluster_ip=$(kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')
        if [ "$cluster_ip" = "None" ]; then
            log_success "Headless Service '$SERVICE_NAME' found with ClusterIP: None"
        else
            log_error "Service '$SERVICE_NAME' is not a Headless Service (ClusterIP: $cluster_ip)"
            exit 1
        fi
    else
        log_error "Service '$SERVICE_NAME' not found in namespace '$NAMESPACE'"
        exit 1
    fi
}

# Get StatefulSet pods
get_statefulset_pods() {
    log_info "Getting StatefulSet pods for service '$SERVICE_NAME'..."
    
    local pods=$(kubectl get pods -n "$NAMESPACE" -l app=nginx_test -o jsonpath='{.items[*].metadata.name}')
    if [ -z "$pods" ]; then
        log_warning "No StatefulSet pods found for service '$SERVICE_NAME'"
        return 1
    fi
    
    echo "$pods"
    log_success "Found StatefulSet pods: $pods"
}

# Test Headless Service DNS resolution
test_service_dns() {
    log_info "Testing Headless Service DNS resolution..."
    
    local service_dns="$SERVICE_NAME.$NAMESPACE.svc.$CLUSTER_DOMAIN"
    log_info "Resolving: $service_dns"
    
    local resolved_ips=$(nslookup "$service_dns" "$DNS_SERVER" 2>/dev/null | grep -A 10 "Name:" | grep "Address:" | awk '{print $2}' | grep -v "^$" || true)
    
    if [ -n "$resolved_ips" ]; then
        log_success "Service DNS resolution successful:"
        echo "$resolved_ips" | while read -r ip; do
            if [ -n "$ip" ]; then
                echo "  - $ip"
            fi
        done
    else
        log_error "Service DNS resolution failed"
        return 1
    fi
}

# Test individual pod DNS resolution
test_pod_dns() {
    local pods="$1"
    
    if [ -z "$pods" ]; then
        log_warning "No pods to test individual DNS resolution"
        return 1
    fi
    
    log_info "Testing individual pod DNS resolution..."
    
    echo "$pods" | while read -r pod; do
        if [ -n "$pod" ]; then
            local pod_dns="$pod.$SERVICE_NAME.$NAMESPACE.svc.$CLUSTER_DOMAIN"
            log_info "Resolving: $pod_dns"
            
            local pod_ip=$(nslookup "$pod_dns" "$DNS_SERVER" 2>/dev/null | grep -A 5 "Name:" | grep "Address:" | awk '{print $2}' | head -n 1)
            
            if [ -n "$pod_ip" ]; then
                log_success "Pod DNS resolution successful: $pod_dns -> $pod_ip"
            else
                log_error "Pod DNS resolution failed: $pod_dns"
            fi
        fi
    done
}

# Test pod-to-pod communication
test_pod_communication() {
    local pods="$1"
    
    if [ -z "$pods" ]; then
        log_warning "No pods to test communication"
        return 1
    fi
    
    log_info "Testing pod-to-pod communication..."
    
    local first_pod=$(echo "$pods" | awk '{print $1}')
    if [ -n "$first_pod" ]; then
        log_info "Testing communication from pod: $first_pod"
        
        # Test if pod can reach other pods via Headless Service DNS
        local service_dns="$SERVICE_NAME.$NAMESPACE.svc.$CLUSTER_DOMAIN"
        
        if kubectl exec "$first_pod" -n "$NAMESPACE" -- nslookup "$service_dns" &> /dev/null; then
            log_success "Pod can resolve Headless Service DNS: $service_dns"
        else
            log_error "Pod cannot resolve Headless Service DNS: $service_dns"
        fi
        
        # Test if pod can reach other pods via individual pod DNS
        echo "$pods" | while read -r target_pod; do
            if [ -n "$target_pod" ] && [ "$target_pod" != "$first_pod" ]; then
                local target_dns="$target_pod.$SERVICE_NAME.$NAMESPACE.svc.$CLUSTER_DOMAIN"
                
                if kubectl exec "$first_pod" -n "$NAMESPACE" -- nslookup "$target_dns" &> /dev/null; then
                    log_success "Pod can resolve individual pod DNS: $target_dns"
                else
                    log_error "Pod cannot resolve individual pod DNS: $target_dns"
                fi
            fi
        done
    fi
}

# Test iptables proxy mode
test_iptables_proxy() {
    log_info "Testing iptables proxy mode..."
    
    # Check if kube-proxy is running in iptables mode
    local kube_proxy_pods=$(kubectl get pods -n kube-system -l k8s-app=kube-proxy -o jsonpath='{.items[*].metadata.name}')
    
    if [ -n "$kube_proxy_pods" ]; then
        local first_proxy=$(echo "$kube_proxy_pods" | awk '{print $1}')
        log_info "Checking kube-proxy mode in pod: $first_proxy"
        
        if kubectl exec "$first_proxy" -n kube-system -- ps aux | grep -q "iptables"; then
            log_success "kube-proxy is running in iptables mode"
        else
            log_warning "kube-proxy may not be running in iptables mode"
        fi
    else
        log_warning "kube-proxy pods not found"
    fi
}

# Test service endpoints
test_service_endpoints() {
    log_info "Testing service endpoints..."
    
    local endpoints=$(kubectl get endpoints "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}')
    
    if [ -n "$endpoints" ]; then
        log_success "Service endpoints found:"
        echo "$endpoints" | tr ' ' '\n' | while read -r endpoint; do
            if [ -n "$endpoint" ]; then
                echo "  - $endpoint"
            fi
        done
    else
        log_warning "No service endpoints found"
    fi
}

# Test load balancing
test_load_balancing() {
    log_info "Testing load balancing..."
    
    local pods="$1"
    if [ -z "$pods" ]; then
        log_warning "No pods to test load balancing"
        return 1
    fi
    
    local first_pod=$(echo "$pods" | awk '{print $1}')
    if [ -n "$first_pod" ]; then
        log_info "Testing load balancing from pod: $first_pod"
        
        # Test multiple requests to see if they hit different backends
        local service_dns="$SERVICE_NAME.$NAMESPACE.svc.$CLUSTER_DOMAIN"
        
        for i in {1..5}; do
            local response=$(kubectl exec "$first_pod" -n "$NAMESPACE" -- curl -s "http://$service_dns" 2>/dev/null || echo "failed")
            if [ "$response" != "failed" ]; then
                log_success "Request $i successful"
            else
                log_error "Request $i failed"
            fi
        done
    fi
}

# Main test function
main() {
    log_info "Starting Headless Service DNS Resolution Test"
    log_info "Service: $SERVICE_NAME"
    log_info "Namespace: $NAMESPACE"
    log_info "DNS Server: $DNS_SERVER"
    log_info "Cluster Domain: $CLUSTER_DOMAIN"
    echo
    
    # Run all tests
    check_kubectl
    check_nslookup
    check_headless_service
    echo
    
    local pods=$(get_statefulset_pods)
    echo
    
    test_service_dns
    echo
    
    test_pod_dns "$pods"
    echo
    
    test_service_endpoints
    echo
    
    test_pod_communication "$pods"
    echo
    
    test_iptables_proxy
    echo
    
    test_load_balancing "$pods"
    echo
    
    log_success "Headless Service DNS Resolution Test completed!"
}

# Run main function
main "$@"
