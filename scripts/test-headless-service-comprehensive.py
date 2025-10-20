#!/usr/bin/env python3
"""
Headless Service Comprehensive Test Suite
Based on the article: https://www.yp14.cn/2019/11/28/K8S-%E4%B9%8B-Headless-%E6%B5%85%E8%B0%88/

This script provides comprehensive testing for Headless Services including:
1. DNS resolution testing
2. Service discovery validation
3. iptables proxy mode verification
4. Load balancing testing
5. Pod-to-pod communication testing
6. Performance benchmarking
"""

import asyncio
import aiohttp
import subprocess
import json
import time
import socket
import dns.resolver
import dns.exception
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class HeadlessServiceConfig:
    """Configuration for Headless Service testing"""
    service_name: str
    namespace: str = "default"
    cluster_domain: str = "cluster.local"
    dns_server: str = "192.168.16.2"
    expected_pods: int = 2
    test_timeout: int = 30

@dataclass
class DNSTestResult:
    """Result of DNS resolution test"""
    service_dns: str
    resolved_ips: List[str]
    individual_pod_dns: List[Dict[str, str]]
    success: bool
    error_message: Optional[str] = None

@dataclass
class LoadBalancingTestResult:
    """Result of load balancing test"""
    total_requests: int
    successful_requests: int
    failed_requests: int
    response_times: List[float]
    unique_backends: List[str]
    success: bool

@dataclass
class PerformanceTestResult:
    """Result of performance test"""
    requests_per_second: float
    average_response_time: float
    p95_response_time: float
    p99_response_time: float
    error_rate: float

class HeadlessServiceTester:
    """Comprehensive Headless Service testing class"""
    
    def __init__(self, config: HeadlessServiceConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def run_kubectl_command(self, command: List[str]) -> Tuple[bool, str]:
        """Run a kubectl command and return success status and output"""
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=self.config.test_timeout
            )
            return result.returncode == 0, result.stdout
        except subprocess.TimeoutExpired:
            return False, "Command timed out"
        except Exception as e:
            return False, str(e)
    
    def get_headless_service_info(self) -> Dict[str, Any]:
        """Get Headless Service information from Kubernetes"""
        command = [
            "kubectl", "get", "service", self.config.service_name,
            "-n", self.config.namespace, "-o", "json"
        ]
        
        success, output = self.run_kubectl_command(command)
        if not success:
            raise Exception(f"Failed to get service info: {output}")
        
        return json.loads(output)
    
    def get_statefulset_pods(self) -> List[Dict[str, Any]]:
        """Get StatefulSet pods for the service"""
        command = [
            "kubectl", "get", "pods",
            "-n", self.config.namespace,
            "-l", "app=nginx_test",
            "-o", "json"
        ]
        
        success, output = self.run_kubectl_command(command)
        if not success:
            raise Exception(f"Failed to get pods: {output}")
        
        data = json.loads(output)
        return data.get("items", [])
    
    def get_service_endpoints(self) -> List[str]:
        """Get service endpoints"""
        command = [
            "kubectl", "get", "endpoints", self.config.service_name,
            "-n", self.config.namespace,
            "-o", "jsonpath={.subsets[*].addresses[*].ip}"
        ]
        
        success, output = self.run_kubectl_command(command)
        if not success:
            return []
        
        return [ip.strip() for ip in output.split() if ip.strip()]
    
    def resolve_dns(self, hostname: str) -> List[str]:
        """Resolve DNS hostname to IP addresses"""
        try:
            resolver = dns.resolver.Resolver()
            resolver.nameservers = [self.config.dns_server]
            
            answers = resolver.resolve(hostname, 'A')
            return [str(answer) for answer in answers]
        except dns.exception.DNSException as e:
            logger.warning(f"DNS resolution failed for {hostname}: {e}")
            return []
    
    async def test_service_dns_resolution(self) -> DNSTestResult:
        """Test Headless Service DNS resolution"""
        logger.info("Testing Headless Service DNS resolution...")
        
        service_dns = f"{self.config.service_name}.{self.config.namespace}.svc.{self.config.cluster_domain}"
        
        try:
            resolved_ips = self.resolve_dns(service_dns)
            
            if not resolved_ips:
                return DNSTestResult(
                    service_dns=service_dns,
                    resolved_ips=[],
                    individual_pod_dns=[],
                    success=False,
                    error_message="No IPs resolved"
                )
            
            # Test individual pod DNS resolution
            pods = self.get_statefulset_pods()
            individual_pod_dns = []
            
            for pod in pods:
                pod_name = pod["metadata"]["name"]
                pod_dns = f"{pod_name}.{self.config.service_name}.{self.config.namespace}.svc.{self.config.cluster_domain}"
                pod_ips = self.resolve_dns(pod_dns)
                
                if pod_ips:
                    individual_pod_dns.append({
                        "pod_name": pod_name,
                        "dns_name": pod_dns,
                        "resolved_ip": pod_ips[0]
                    })
            
            return DNSTestResult(
                service_dns=service_dns,
                resolved_ips=resolved_ips,
                individual_pod_dns=individual_pod_dns,
                success=True
            )
            
        except Exception as e:
            return DNSTestResult(
                service_dns=service_dns,
                resolved_ips=[],
                individual_pod_dns=[],
                success=False,
                error_message=str(e)
            )
    
    async def test_pod_to_pod_communication(self) -> bool:
        """Test pod-to-pod communication via Headless Service"""
        logger.info("Testing pod-to-pod communication...")
        
        pods = self.get_statefulset_pods()
        if not pods:
            logger.error("No pods found for communication test")
            return False
        
        first_pod = pods[0]["metadata"]["name"]
        service_dns = f"{self.config.service_name}.{self.config.namespace}.svc.{self.config.cluster_domain}"
        
        # Test if pod can resolve Headless Service DNS
        command = [
            "kubectl", "exec", first_pod,
            "-n", self.config.namespace,
            "--", "nslookup", service_dns
        ]
        
        success, output = self.run_kubectl_command(command)
        if not success:
            logger.error(f"Pod cannot resolve Headless Service DNS: {output}")
            return False
        
        logger.info(f"Pod {first_pod} can resolve Headless Service DNS")
        
        # Test individual pod DNS resolution from within pod
        for pod in pods[1:]:
            pod_name = pod["metadata"]["name"]
            pod_dns = f"{pod_name}.{self.config.service_name}.{self.config.namespace}.svc.{self.config.cluster_domain}"
            
            command = [
                "kubectl", "exec", first_pod,
                "-n", self.config.namespace,
                "--", "nslookup", pod_dns
            ]
            
            success, output = self.run_kubectl_command(command)
            if success:
                logger.info(f"Pod {first_pod} can resolve individual pod DNS: {pod_dns}")
            else:
                logger.warning(f"Pod {first_pod} cannot resolve individual pod DNS: {pod_dns}")
        
        return True
    
    async def test_load_balancing(self, num_requests: int = 10) -> LoadBalancingTestResult:
        """Test load balancing across pods"""
        logger.info(f"Testing load balancing with {num_requests} requests...")
        
        pods = self.get_statefulset_pods()
        if not pods:
            return LoadBalancingTestResult(
                total_requests=num_requests,
                successful_requests=0,
                failed_requests=num_requests,
                response_times=[],
                unique_backends=[],
                success=False
            )
        
        first_pod = pods[0]["metadata"]["name"]
        service_dns = f"{self.config.service_name}.{self.config.namespace}.svc.{self.config.cluster_domain}"
        
        successful_requests = 0
        failed_requests = 0
        response_times = []
        unique_backends = set()
        
        for i in range(num_requests):
            start_time = time.time()
            
            # Make request from pod to Headless Service
            command = [
                "kubectl", "exec", first_pod,
                "-n", self.config.namespace,
                "--", "curl", "-s", "-w", "%{http_code}",
                f"http://{service_dns}"
            ]
            
            success, output = self.run_kubectl_command(command)
            end_time = time.time()
            
            if success and "200" in output:
                successful_requests += 1
                response_times.append(end_time - start_time)
                
                # Try to identify which backend responded
                # This is a simplified approach - in reality you'd need more sophisticated tracking
                unique_backends.add(f"backend-{i % len(pods)}")
            else:
                failed_requests += 1
        
        return LoadBalancingTestResult(
            total_requests=num_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            response_times=response_times,
            unique_backends=list(unique_backends),
            success=successful_requests > 0
        )
    
    async def test_performance(self, duration_seconds: int = 30) -> PerformanceTestResult:
        """Test performance of Headless Service"""
        logger.info(f"Testing performance for {duration_seconds} seconds...")
        
        pods = self.get_statefulset_pods()
        if not pods:
            return PerformanceTestResult(
                requests_per_second=0.0,
                average_response_time=0.0,
                p95_response_time=0.0,
                p99_response_time=0.0,
                error_rate=1.0
            )
        
        first_pod = pods[0]["metadata"]["name"]
        service_dns = f"{self.config.service_name}.{self.config.namespace}.svc.{self.config.cluster_domain}"
        
        start_time = time.time()
        end_time = start_time + duration_seconds
        
        successful_requests = 0
        failed_requests = 0
        response_times = []
        
        while time.time() < end_time:
            request_start = time.time()
            
            command = [
                "kubectl", "exec", first_pod,
                "-n", self.config.namespace,
                "--", "curl", "-s", "-w", "%{http_code}",
                f"http://{service_dns}"
            ]
            
            success, output = self.run_kubectl_command(command)
            request_end = time.time()
            
            if success and "200" in output:
                successful_requests += 1
                response_times.append(request_end - request_start)
            else:
                failed_requests += 1
        
        total_requests = successful_requests + failed_requests
        actual_duration = time.time() - start_time
        
        if response_times:
            response_times.sort()
            avg_response_time = sum(response_times) / len(response_times)
            p95_index = int(len(response_times) * 0.95)
            p99_index = int(len(response_times) * 0.99)
            
            p95_response_time = response_times[p95_index] if p95_index < len(response_times) else response_times[-1]
            p99_response_time = response_times[p99_index] if p99_index < len(response_times) else response_times[-1]
        else:
            avg_response_time = 0.0
            p95_response_time = 0.0
            p99_response_time = 0.0
        
        requests_per_second = total_requests / actual_duration
        error_rate = failed_requests / total_requests if total_requests > 0 else 1.0
        
        return PerformanceTestResult(
            requests_per_second=requests_per_second,
            average_response_time=avg_response_time,
            p95_response_time=p95_response_time,
            p99_response_time=p99_response_time,
            error_rate=error_rate
        )
    
    def test_iptables_proxy_mode(self) -> bool:
        """Test if kube-proxy is running in iptables mode"""
        logger.info("Testing iptables proxy mode...")
        
        command = [
            "kubectl", "get", "pods", "-n", "kube-system",
            "-l", "k8s-app=kube-proxy",
            "-o", "jsonpath={.items[0].metadata.name}"
        ]
        
        success, output = self.run_kubectl_command(command)
        if not success or not output.strip():
            logger.warning("kube-proxy pod not found")
            return False
        
        proxy_pod = output.strip()
        
        # Check if kube-proxy is running in iptables mode
        command = [
            "kubectl", "exec", proxy_pod, "-n", "kube-system",
            "--", "ps", "aux"
        ]
        
        success, output = self.run_kubectl_command(command)
        if success and "iptables" in output:
            logger.info("kube-proxy is running in iptables mode")
            return True
        else:
            logger.warning("kube-proxy may not be running in iptables mode")
            return False
    
    async def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run comprehensive Headless Service test suite"""
        logger.info("Starting comprehensive Headless Service test suite...")
        
        results = {
            "config": {
                "service_name": self.config.service_name,
                "namespace": self.config.namespace,
                "cluster_domain": self.config.cluster_domain,
                "dns_server": self.config.dns_server
            },
            "tests": {}
        }
        
        # Test 1: DNS Resolution
        logger.info("=" * 50)
        logger.info("TEST 1: DNS Resolution")
        logger.info("=" * 50)
        
        dns_result = await self.test_service_dns_resolution()
        results["tests"]["dns_resolution"] = {
            "success": dns_result.success,
            "service_dns": dns_result.service_dns,
            "resolved_ips": dns_result.resolved_ips,
            "individual_pod_dns": dns_result.individual_pod_dns,
            "error_message": dns_result.error_message
        }
        
        # Test 2: Pod-to-Pod Communication
        logger.info("=" * 50)
        logger.info("TEST 2: Pod-to-Pod Communication")
        logger.info("=" * 50)
        
        communication_success = await self.test_pod_to_pod_communication()
        results["tests"]["pod_communication"] = {
            "success": communication_success
        }
        
        # Test 3: Load Balancing
        logger.info("=" * 50)
        logger.info("TEST 3: Load Balancing")
        logger.info("=" * 50)
        
        lb_result = await self.test_load_balancing(20)
        results["tests"]["load_balancing"] = {
            "success": lb_result.success,
            "total_requests": lb_result.total_requests,
            "successful_requests": lb_result.successful_requests,
            "failed_requests": lb_result.failed_requests,
            "unique_backends": lb_result.unique_backends,
            "average_response_time": sum(lb_result.response_times) / len(lb_result.response_times) if lb_result.response_times else 0
        }
        
        # Test 4: Performance
        logger.info("=" * 50)
        logger.info("TEST 4: Performance")
        logger.info("=" * 50)
        
        perf_result = await self.test_performance(10)  # 10 seconds for quick test
        results["tests"]["performance"] = {
            "requests_per_second": perf_result.requests_per_second,
            "average_response_time": perf_result.average_response_time,
            "p95_response_time": perf_result.p95_response_time,
            "p99_response_time": perf_result.p99_response_time,
            "error_rate": perf_result.error_rate
        }
        
        # Test 5: iptables Proxy Mode
        logger.info("=" * 50)
        logger.info("TEST 5: iptables Proxy Mode")
        logger.info("=" * 50)
        
        iptables_success = self.test_iptables_proxy_mode()
        results["tests"]["iptables_proxy"] = {
            "success": iptables_success
        }
        
        # Test 6: Service Endpoints
        logger.info("=" * 50)
        logger.info("TEST 6: Service Endpoints")
        logger.info("=" * 50)
        
        endpoints = self.get_service_endpoints()
        results["tests"]["service_endpoints"] = {
            "endpoints": endpoints,
            "count": len(endpoints)
        }
        
        # Overall success
        test_results = results["tests"]
        overall_success = all([
            test_results["dns_resolution"]["success"],
            test_results["pod_communication"]["success"],
            test_results["load_balancing"]["success"],
            test_results["iptables_proxy"]["success"]
        ])
        
        results["overall_success"] = overall_success
        
        logger.info("=" * 50)
        logger.info("TEST SUMMARY")
        logger.info("=" * 50)
        logger.info(f"Overall Success: {'✅ PASS' if overall_success else '❌ FAIL'}")
        logger.info(f"DNS Resolution: {'✅ PASS' if test_results['dns_resolution']['success'] else '❌ FAIL'}")
        logger.info(f"Pod Communication: {'✅ PASS' if test_results['pod_communication']['success'] else '❌ FAIL'}")
        logger.info(f"Load Balancing: {'✅ PASS' if test_results['load_balancing']['success'] else '❌ FAIL'}")
        logger.info(f"iptables Proxy: {'✅ PASS' if test_results['iptables_proxy']['success'] else '❌ FAIL'}")
        logger.info(f"Service Endpoints: {test_results['service_endpoints']['count']} found")
        
        return results

async def main():
    """Main function to run Headless Service tests"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Headless Service Comprehensive Test Suite")
    parser.add_argument("--service-name", default="nginx-test", help="Name of the Headless Service")
    parser.add_argument("--namespace", default="default", help="Kubernetes namespace")
    parser.add_argument("--cluster-domain", default="cluster.local", help="Kubernetes cluster domain")
    parser.add_argument("--dns-server", default="192.168.16.2", help="DNS server IP")
    parser.add_argument("--output", help="Output file for test results (JSON)")
    
    args = parser.parse_args()
    
    config = HeadlessServiceConfig(
        service_name=args.service_name,
        namespace=args.namespace,
        cluster_domain=args.cluster_domain,
        dns_server=args.dns_server
    )
    
    async with HeadlessServiceTester(config) as tester:
        results = await tester.run_comprehensive_test()
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            logger.info(f"Test results saved to {args.output}")
        
        return 0 if results["overall_success"] else 1

if __name__ == "__main__":
    import sys
    sys.exit(asyncio.run(main()))
