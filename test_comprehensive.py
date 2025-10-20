#!/usr/bin/env python3
"""
Comprehensive Test Orchestrator for K8s Playgrounds
===================================================

This script provides comprehensive testing for the entire K8s Playgrounds project including:
- Unit tests for all components (TypeScript, Java, Go, Python)
- Integration tests for component interactions
- Performance benchmarking for all algorithms
- Edge case testing for boundary conditions
- UI testing for user interactions
- Automated reporting with detailed metrics

Usage:
    python3 test_comprehensive.py [options]

Options:
    --verbose, -v          Enable verbose output
    --coverage, -c         Generate coverage reports
    --performance, -p      Run performance tests
    --ui, -u              Run UI tests
    --integration, -i     Run integration tests
    --all, -a             Run all test suites
    --report, -r          Generate detailed reports
    --format, -f FORMAT   Output format (json, html, xml)
    --output, -o PATH     Output directory for reports
"""

import asyncio
import json
import os
import subprocess
import sys
import time
import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import xml.etree.ElementTree as ET

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('test_results.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class TestResult:
    """Test result data structure"""
    name: str
    type: str
    status: str  # passed, failed, skipped, error
    duration: float
    message: str
    coverage: Optional[float] = None
    performance_metrics: Optional[Dict[str, Any]] = None
    error_details: Optional[str] = None

@dataclass
class TestSuite:
    """Test suite configuration"""
    name: str
    type: str
    command: str
    working_dir: str
    timeout: int = 300
    coverage_threshold: float = 80.0
    performance_threshold: Optional[Dict[str, float]] = None

class TestOrchestrator:
    """Main test orchestrator class"""
    
    def __init__(self, verbose: bool = False, output_dir: str = "test-reports"):
        self.verbose = verbose
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.results: List[TestResult] = []
        self.start_time = time.time()
        
        # Test suite configurations
        self.test_suites = self._initialize_test_suites()
        
        # Performance benchmarks
        self.performance_benchmarks = {
            "tinyurl": {"max_latency_ms": 100, "min_throughput_rps": 1000},
            "newsfeed": {"max_latency_ms": 200, "min_throughput_rps": 500},
            "google_docs": {"max_latency_ms": 300, "min_throughput_rps": 200},
            "quora": {"max_latency_ms": 150, "min_throughput_rps": 800},
            "load_balancer": {"max_latency_ms": 50, "min_throughput_rps": 2000},
            "monitoring": {"max_latency_ms": 100, "min_throughput_rps": 1000},
            "typeahead": {"max_latency_ms": 50, "min_throughput_rps": 5000},
            "messaging": {"max_latency_ms": 100, "min_throughput_rps": 1000},
            "web_crawler": {"max_latency_ms": 500, "min_throughput_rps": 100},
            "dns": {"max_latency_ms": 10, "min_throughput_rps": 10000}
        }
    
    def _initialize_test_suites(self) -> List[TestSuite]:
        """Initialize all test suite configurations"""
        return [
            # TypeScript/JavaScript Tests
            TestSuite(
                name="Backend Unit Tests",
                type="unit",
                command="npm run test:backend",
                working_dir=".",
                coverage_threshold=90.0
            ),
            TestSuite(
                name="Frontend Unit Tests",
                type="unit",
                command="npm run test:frontend",
                working_dir=".",
                coverage_threshold=85.0
            ),
            TestSuite(
                name="E2E Tests",
                type="e2e",
                command="npm run test:e2e",
                working_dir=".",
                coverage_threshold=80.0
            ),
            TestSuite(
                name="Integration Tests",
                type="integration",
                command="npm run test:integration",
                working_dir=".",
                coverage_threshold=85.0
            ),
            TestSuite(
                name="Performance Tests",
                type="performance",
                command="npm run test:performance",
                working_dir=".",
                coverage_threshold=0.0
            ),
            
            # Java Tests
            TestSuite(
                name="Java Unit Tests",
                type="unit",
                command="mvn test -Pcoverage",
                working_dir=".",
                coverage_threshold=90.0
            ),
            TestSuite(
                name="Java Integration Tests",
                type="integration",
                command="mvn verify -Pcoverage",
                working_dir=".",
                coverage_threshold=85.0
            ),
            
            # Go Tests (Operator)
            TestSuite(
                name="Go Unit Tests",
                type="unit",
                command="go test ./operator/... -v -cover",
                working_dir=".",
                coverage_threshold=90.0
            ),
            TestSuite(
                name="Go Integration Tests",
                type="integration",
                command="go test ./operator/... -tags=integration -v",
                working_dir=".",
                coverage_threshold=85.0
            ),
            
            # System Tests
            TestSuite(
                name="TinyURL System Tests",
                type="system",
                command="npm test systems/tinyurl-system/",
                working_dir=".",
                coverage_threshold=95.0
            ),
            TestSuite(
                name="Newsfeed System Tests",
                type="system",
                command="npm test systems/newsfeed-system/",
                working_dir=".",
                coverage_threshold=95.0
            ),
            TestSuite(
                name="Google Docs System Tests",
                type="system",
                command="npm test systems/google-docs-system/",
                working_dir=".",
                coverage_threshold=95.0
            ),
            TestSuite(
                name="Quora System Tests",
                type="system",
                command="npm test systems/quora-system/",
                working_dir=".",
                coverage_threshold=95.0
            ),
            TestSuite(
                name="Load Balancer System Tests",
                type="system",
                command="npm test systems/load-balancer-system/",
                working_dir=".",
                coverage_threshold=95.0
            ),
            TestSuite(
                name="Monitoring System Tests",
                type="system",
                command="npm test systems/monitoring-system/",
                working_dir=".",
                coverage_threshold=95.0
            ),
            TestSuite(
                name="Typeahead System Tests",
                type="system",
                command="npm test systems/typeahead-system/",
                working_dir=".",
                coverage_threshold=95.0
            ),
            TestSuite(
                name="Messaging System Tests",
                type="system",
                command="npm test systems/messaging-system/",
                working_dir=".",
                coverage_threshold=95.0
            ),
            TestSuite(
                name="Web Crawler System Tests",
                type="system",
                command="npm test systems/web-crawler-system/",
                working_dir=".",
                coverage_threshold=95.0
            ),
            TestSuite(
                name="DNS System Tests",
                type="system",
                command="npm test systems/dns-system/",
                working_dir=".",
                coverage_threshold=95.0
            ),
        ]
    
    async def run_all_tests(self, 
                          include_unit: bool = True,
                          include_integration: bool = True,
                          include_e2e: bool = True,
                          include_performance: bool = True,
                          include_ui: bool = True,
                          include_system: bool = True) -> Dict[str, Any]:
        """Run all test suites based on configuration"""
        logger.info("Starting comprehensive test execution...")
        
        # Filter test suites based on configuration
        filtered_suites = []
        for suite in self.test_suites:
            if suite.type == "unit" and include_unit:
                filtered_suites.append(suite)
            elif suite.type == "integration" and include_integration:
                filtered_suites.append(suite)
            elif suite.type == "e2e" and include_e2e:
                filtered_suites.append(suite)
            elif suite.type == "performance" and include_performance:
                filtered_suites.append(suite)
            elif suite.type == "ui" and include_ui:
                filtered_suites.append(suite)
            elif suite.type == "system" and include_system:
                filtered_suites.append(suite)
        
        # Run tests in parallel where possible
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = []
            for suite in filtered_suites:
                future = executor.submit(self._run_test_suite, suite)
                futures.append(future)
            
            # Wait for all tests to complete
            for future in as_completed(futures):
                try:
                    result = future.result()
                    self.results.append(result)
                except Exception as e:
                    logger.error(f"Test suite failed with exception: {e}")
                    self.results.append(TestResult(
                        name="Unknown",
                        type="error",
                        status="error",
                        duration=0.0,
                        message=str(e),
                        error_details=str(e)
                    ))
        
        # Generate comprehensive report
        return self._generate_comprehensive_report()
    
    def _run_test_suite(self, suite: TestSuite) -> TestResult:
        """Run a single test suite"""
        logger.info(f"Running {suite.name}...")
        start_time = time.time()
        
        try:
            # Change to working directory
            original_dir = os.getcwd()
            os.chdir(suite.working_dir)
            
            # Run the test command
            result = subprocess.run(
                suite.command.split(),
                capture_output=True,
                text=True,
                timeout=suite.timeout
            )
            
            duration = time.time() - start_time
            
            # Parse results based on test type
            if result.returncode == 0:
                status = "passed"
                message = f"{suite.name} completed successfully"
                coverage = self._extract_coverage(result.stdout, suite.type)
            else:
                status = "failed"
                message = f"{suite.name} failed with return code {result.returncode}"
                coverage = None
            
            # Extract performance metrics if applicable
            performance_metrics = None
            if suite.type == "performance":
                performance_metrics = self._extract_performance_metrics(result.stdout)
            
            return TestResult(
                name=suite.name,
                type=suite.type,
                status=status,
                duration=duration,
                message=message,
                coverage=coverage,
                performance_metrics=performance_metrics,
                error_details=result.stderr if result.returncode != 0 else None
            )
            
        except subprocess.TimeoutExpired:
            return TestResult(
                name=suite.name,
                type=suite.type,
                status="error",
                duration=suite.timeout,
                message=f"{suite.name} timed out after {suite.timeout} seconds",
                error_details="Test execution timeout"
            )
        except Exception as e:
            return TestResult(
                name=suite.name,
                type=suite.type,
                status="error",
                duration=time.time() - start_time,
                message=f"{suite.name} failed with exception: {str(e)}",
                error_details=str(e)
            )
        finally:
            os.chdir(original_dir)
    
    def _extract_coverage(self, output: str, test_type: str) -> Optional[float]:
        """Extract coverage percentage from test output"""
        try:
            if "vitest" in output.lower() or "jest" in output.lower():
                # Extract coverage from vitest/jest output
                lines = output.split('\n')
                for line in lines:
                    if "All files" in line and "%" in line:
                        # Extract percentage
                        import re
                        match = re.search(r'(\d+(?:\.\d+)?)%', line)
                        if match:
                            return float(match.group(1))
            elif "mvn" in test_type.lower():
                # Extract coverage from Maven/JaCoCo output
                lines = output.split('\n')
                for line in lines:
                    if "Total" in line and "%" in line:
                        import re
                        match = re.search(r'(\d+(?:\.\d+)?)%', line)
                        if match:
                            return float(match.group(1))
            elif "go test" in test_type.lower():
                # Extract coverage from Go test output
                lines = output.split('\n')
                for line in lines:
                    if "coverage:" in line and "%" in line:
                        import re
                        match = re.search(r'coverage:\s*(\d+(?:\.\d+)?)%', line)
                        if match:
                            return float(match.group(1))
        except Exception as e:
            logger.warning(f"Failed to extract coverage: {e}")
        
        return None
    
    def _extract_performance_metrics(self, output: str) -> Optional[Dict[str, Any]]:
        """Extract performance metrics from test output"""
        try:
            metrics = {}
            lines = output.split('\n')
            
            for line in lines:
                if "latency" in line.lower() or "ms" in line:
                    import re
                    match = re.search(r'(\d+(?:\.\d+)?)\s*ms', line)
                    if match:
                        metrics["latency_ms"] = float(match.group(1))
                
                if "throughput" in line.lower() or "rps" in line:
                    import re
                    match = re.search(r'(\d+(?:\.\d+)?)\s*rps', line)
                    if match:
                        metrics["throughput_rps"] = float(match.group(1))
                
                if "memory" in line.lower() or "mb" in line:
                    import re
                    match = re.search(r'(\d+(?:\.\d+)?)\s*mb', line)
                    if match:
                        metrics["memory_mb"] = float(match.group(1))
            
            return metrics if metrics else None
        except Exception as e:
            logger.warning(f"Failed to extract performance metrics: {e}")
            return None
    
    def _generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_duration = time.time() - self.start_time
        
        # Calculate statistics
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r.status == "passed"])
        failed_tests = len([r for r in self.results if r.status == "failed"])
        error_tests = len([r for r in self.results if r.status == "error"])
        skipped_tests = len([r for r in self.results if r.status == "skipped"])
        
        # Calculate coverage statistics
        coverage_results = [r for r in self.results if r.coverage is not None]
        avg_coverage = sum(r.coverage for r in coverage_results) / len(coverage_results) if coverage_results else 0
        
        # Performance analysis
        performance_results = [r for r in self.results if r.performance_metrics is not None]
        performance_analysis = self._analyze_performance(performance_results)
        
        # Generate report
        report = {
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "errors": error_tests,
                "skipped": skipped_tests,
                "success_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
                "total_duration": total_duration,
                "average_coverage": avg_coverage
            },
            "test_results": [asdict(r) for r in self.results],
            "performance_analysis": performance_analysis,
            "coverage_analysis": self._analyze_coverage(coverage_results),
            "recommendations": self._generate_recommendations(),
            "timestamp": datetime.now().isoformat()
        }
        
        # Save reports
        self._save_reports(report)
        
        return report
    
    def _analyze_performance(self, performance_results: List[TestResult]) -> Dict[str, Any]:
        """Analyze performance test results"""
        analysis = {
            "overall_performance": "good",
            "bottlenecks": [],
            "recommendations": []
        }
        
        for result in performance_results:
            if result.performance_metrics:
                # Check against benchmarks
                system_name = result.name.lower().replace(" system tests", "")
                if system_name in self.performance_benchmarks:
                    benchmark = self.performance_benchmarks[system_name]
                    
                    if "latency_ms" in result.performance_metrics:
                        if result.performance_metrics["latency_ms"] > benchmark["max_latency_ms"]:
                            analysis["bottlenecks"].append(f"{system_name}: High latency ({result.performance_metrics['latency_ms']}ms)")
                    
                    if "throughput_rps" in result.performance_metrics:
                        if result.performance_metrics["throughput_rps"] < benchmark["min_throughput_rps"]:
                            analysis["bottlenecks"].append(f"{system_name}: Low throughput ({result.performance_metrics['throughput_rps']} rps)")
        
        if analysis["bottlenecks"]:
            analysis["overall_performance"] = "needs_improvement"
            analysis["recommendations"].append("Consider optimizing systems with performance bottlenecks")
        
        return analysis
    
    def _analyze_coverage(self, coverage_results: List[TestResult]) -> Dict[str, Any]:
        """Analyze test coverage results"""
        if not coverage_results:
            return {"status": "no_coverage_data", "recommendations": ["Enable coverage reporting"]}
        
        coverage_values = [r.coverage for r in coverage_results if r.coverage is not None]
        avg_coverage = sum(coverage_values) / len(coverage_values)
        min_coverage = min(coverage_values)
        max_coverage = max(coverage_values)
        
        analysis = {
            "average_coverage": avg_coverage,
            "min_coverage": min_coverage,
            "max_coverage": max_coverage,
            "coverage_status": "excellent" if avg_coverage >= 90 else "good" if avg_coverage >= 80 else "needs_improvement",
            "low_coverage_tests": [r.name for r in coverage_results if r.coverage and r.coverage < 80]
        }
        
        return analysis
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        # Coverage recommendations
        low_coverage = [r for r in self.results if r.coverage and r.coverage < 80]
        if low_coverage:
            recommendations.append(f"Improve test coverage for {len(low_coverage)} test suites")
        
        # Performance recommendations
        slow_tests = [r for r in self.results if r.duration > 60]
        if slow_tests:
            recommendations.append(f"Optimize {len(slow_tests)} slow-running tests")
        
        # Error recommendations
        error_tests = [r for r in self.results if r.status == "error"]
        if error_tests:
            recommendations.append(f"Fix {len(error_tests)} test errors")
        
        # General recommendations
        if not recommendations:
            recommendations.append("All tests are performing well!")
        
        return recommendations
    
    def _save_reports(self, report: Dict[str, Any]):
        """Save reports in multiple formats"""
        # JSON report
        with open(self.output_dir / "test_report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        # HTML report
        self._generate_html_report(report)
        
        # XML report (JUnit format)
        self._generate_xml_report(report)
        
        # Summary report
        self._generate_summary_report(report)
    
    def _generate_html_report(self, report: Dict[str, Any]):
        """Generate HTML test report"""
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>K8s Playgrounds Test Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }}
                .metric {{ background-color: #e8f4fd; padding: 15px; border-radius: 5px; text-align: center; }}
                .metric h3 {{ margin: 0; color: #1976d2; }}
                .metric .value {{ font-size: 2em; font-weight: bold; color: #1976d2; }}
                .test-results {{ margin: 20px 0; }}
                .test-item {{ padding: 10px; margin: 5px 0; border-radius: 3px; }}
                .passed {{ background-color: #d4edda; border-left: 4px solid #28a745; }}
                .failed {{ background-color: #f8d7da; border-left: 4px solid #dc3545; }}
                .error {{ background-color: #fff3cd; border-left: 4px solid #ffc107; }}
                .performance {{ background-color: #e2e3e5; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .recommendations {{ background-color: #d1ecf1; padding: 15px; margin: 10px 0; border-radius: 5px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>K8s Playgrounds Comprehensive Test Report</h1>
                <p>Generated on: {report['timestamp']}</p>
            </div>
            
            <div class="summary">
                <div class="metric">
                    <h3>Total Tests</h3>
                    <div class="value">{report['summary']['total_tests']}</div>
                </div>
                <div class="metric">
                    <h3>Passed</h3>
                    <div class="value" style="color: #28a745;">{report['summary']['passed']}</div>
                </div>
                <div class="metric">
                    <h3>Failed</h3>
                    <div class="value" style="color: #dc3545;">{report['summary']['failed']}</div>
                </div>
                <div class="metric">
                    <h3>Success Rate</h3>
                    <div class="value">{report['summary']['success_rate']:.1f}%</div>
                </div>
                <div class="metric">
                    <h3>Avg Coverage</h3>
                    <div class="value">{report['summary']['average_coverage']:.1f}%</div>
                </div>
                <div class="metric">
                    <h3>Duration</h3>
                    <div class="value">{report['summary']['total_duration']:.1f}s</div>
                </div>
            </div>
            
            <div class="test-results">
                <h2>Test Results</h2>
                {"".join([f'<div class="test-item {result["status"]}"><strong>{result["name"]}</strong> - {result["status"].upper()} ({result["duration"]:.2f}s){f" - Coverage: {result["coverage"]:.1f}%" if result["coverage"] else ""}</div>' for result in report['test_results']])}
            </div>
            
            <div class="performance">
                <h2>Performance Analysis</h2>
                <p><strong>Overall Performance:</strong> {report['performance_analysis']['overall_performance']}</p>
                {f"<p><strong>Bottlenecks:</strong> {', '.join(report['performance_analysis']['bottlenecks'])}</p>" if report['performance_analysis']['bottlenecks'] else ""}
            </div>
            
            <div class="recommendations">
                <h2>Recommendations</h2>
                <ul>
                    {"".join([f"<li>{rec}</li>" for rec in report['recommendations']])}
                </ul>
            </div>
        </body>
        </html>
        """
        
        with open(self.output_dir / "test_report.html", "w") as f:
            f.write(html_content)
    
    def _generate_xml_report(self, report: Dict[str, Any]):
        """Generate XML test report (JUnit format)"""
        root = ET.Element("testsuites")
        root.set("name", "K8s Playgrounds Tests")
        root.set("tests", str(report['summary']['total_tests']))
        root.set("failures", str(report['summary']['failed']))
        root.set("errors", str(report['summary']['errors']))
        root.set("time", str(report['summary']['total_duration']))
        
        for result in report['test_results']:
            testsuite = ET.SubElement(root, "testsuite")
            testsuite.set("name", result['name'])
            testsuite.set("tests", "1")
            testsuite.set("failures", "1" if result['status'] == 'failed' else "0")
            testsuite.set("errors", "1" if result['status'] == 'error' else "0")
            testsuite.set("time", str(result['duration']))
            
            testcase = ET.SubElement(testsuite, "testcase")
            testcase.set("name", result['name'])
            testcase.set("time", str(result['duration']))
            
            if result['status'] in ['failed', 'error']:
                failure = ET.SubElement(testcase, "failure")
                failure.set("message", result['message'])
                if result['error_details']:
                    failure.text = result['error_details']
        
        tree = ET.ElementTree(root)
        tree.write(self.output_dir / "test_report.xml", encoding="utf-8", xml_declaration=True)
    
    def _generate_summary_report(self, report: Dict[str, Any]):
        """Generate text summary report"""
        summary = f"""
K8s Playgrounds Test Summary
============================

Generated: {report['timestamp']}
Duration: {report['summary']['total_duration']:.2f} seconds

Test Results:
- Total Tests: {report['summary']['total_tests']}
- Passed: {report['summary']['passed']}
- Failed: {report['summary']['failed']}
- Errors: {report['summary']['errors']}
- Skipped: {report['summary']['skipped']}
- Success Rate: {report['summary']['success_rate']:.1f}%
- Average Coverage: {report['summary']['average_coverage']:.1f}%

Performance Analysis:
- Overall Performance: {report['performance_analysis']['overall_performance']}
"""
        
        if report['performance_analysis']['bottlenecks']:
            summary += f"- Bottlenecks: {', '.join(report['performance_analysis']['bottlenecks'])}\n"
        
        summary += "\nRecommendations:\n"
        for rec in report['recommendations']:
            summary += f"- {rec}\n"
        
        with open(self.output_dir / "test_summary.txt", "w") as f:
            f.write(summary)

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Comprehensive Test Orchestrator for K8s Playgrounds")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose output")
    parser.add_argument("--coverage", "-c", action="store_true", help="Generate coverage reports")
    parser.add_argument("--performance", "-p", action="store_true", help="Run performance tests")
    parser.add_argument("--ui", "-u", action="store_true", help="Run UI tests")
    parser.add_argument("--integration", "-i", action="store_true", help="Run integration tests")
    parser.add_argument("--all", "-a", action="store_true", help="Run all test suites")
    parser.add_argument("--output", "-o", default="test-reports", help="Output directory for reports")
    parser.add_argument("--format", "-f", choices=["json", "html", "xml"], default="html", help="Output format")
    
    args = parser.parse_args()
    
    # Determine which tests to run
    if args.all:
        include_unit = include_integration = include_e2e = include_performance = include_ui = include_system = True
    else:
        include_unit = True  # Always include unit tests
        include_integration = args.integration
        include_e2e = True  # Always include E2E tests
        include_performance = args.performance
        include_ui = args.ui
        include_system = True  # Always include system tests
    
    # Create orchestrator
    orchestrator = TestOrchestrator(verbose=args.verbose, output_dir=args.output)
    
    # Run tests
    try:
        report = asyncio.run(orchestrator.run_all_tests(
            include_unit=include_unit,
            include_integration=include_integration,
            include_e2e=include_e2e,
            include_performance=include_performance,
            include_ui=include_ui,
            include_system=include_system
        ))
        
        # Print summary
        print(f"\nTest Execution Complete!")
        print(f"Total Tests: {report['summary']['total_tests']}")
        print(f"Passed: {report['summary']['passed']}")
        print(f"Failed: {report['summary']['failed']}")
        print(f"Success Rate: {report['summary']['success_rate']:.1f}%")
        print(f"Average Coverage: {report['summary']['average_coverage']:.1f}%")
        print(f"Duration: {report['summary']['total_duration']:.2f} seconds")
        print(f"\nReports saved to: {args.output}/")
        
        # Exit with appropriate code
        if report['summary']['failed'] > 0 or report['summary']['errors'] > 0:
            sys.exit(1)
        else:
            sys.exit(0)
            
    except KeyboardInterrupt:
        print("\nTest execution interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"Test execution failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()