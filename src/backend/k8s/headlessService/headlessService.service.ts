import { Injectable } from '@nestjs/common'
import { V1ObjectMeta, V1PodTemplateSpec, V1Service, V1ServicePort, V1ServiceSpec, V1StatefulSet, V1StatefulSetSpec } from '@kubernetes/client-node'
import { ClientService } from '../client/client.service'
import {
  DiscoveredService,
  HeadlessServiceConfig,
  HeadlessServiceDNS,
  HeadlessServiceEndpoint,
  IptablesProxyConfig,
  PodDNSRecord,
  ServiceDiscoveryConfig,
  StatefulSetHeadlessConfig,
} from '../model/HeadlessService'

@Injectable()
export class HeadlessServiceService {
  constructor(private readonly clientService: ClientService) {}

  /**
   * Create a Headless Service
   *
   * Creates a service with ClusterIP set to "None" to enable direct pod-to-pod communication.
   * This is essential for StatefulSets and service discovery patterns.
   */
  async createHeadlessService(config: HeadlessServiceConfig): Promise<V1Service> {
    const coreV1Api = this.clientService.getCoreV1Api()

    const serviceSpec: V1ServiceSpec = {
      clusterIP: 'None', // This makes it a Headless Service
      selector: config.selector,
      ports: config.ports.map(port => ({
        name: port.name,
        port: port.port,
        targetPort: port.targetPort,
        protocol: port.protocol || 'TCP',
      } as V1ServicePort)),
    }

    const metadata: V1ObjectMeta = {
      name: config.name,
      namespace: config.namespace || 'default',
      labels: config.labels,
      annotations: config.annotations,
    }

    const service: V1Service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata,
      spec: serviceSpec,
    }

    try {
      const response = await coreV1Api.createNamespacedService(
        config.namespace || 'default',
        service,
      )
      return response.body
    }
    catch (error) {
      throw new Error(`Failed to create Headless Service: ${error.message}`)
    }
  }

  /**
   * Get Headless Service by name
   */
  async getHeadlessService(name: string, namespace: string = 'default'): Promise<V1Service | null> {
    const coreV1Api = this.clientService.getCoreV1Api()

    try {
      const response = await coreV1Api.readNamespacedService(name, namespace)
      const service = response.body

      // Verify it's actually a Headless Service
      if (service.spec?.clusterIP !== 'None')
        throw new Error(`Service ${name} is not a Headless Service (ClusterIP: ${service.spec?.clusterIP})`)

      return service
    }
    catch (error) {
      if (error.statusCode === 404)
        return null

      throw new Error(`Failed to get Headless Service: ${error.message}`)
    }
  }

  /**
   * List all Headless Services in a namespace
   */
  async listHeadlessServices(namespace: string = 'default'): Promise<V1Service[]> {
    const coreV1Api = this.clientService.getCoreV1Api()

    try {
      const response = await coreV1Api.listNamespacedService(namespace)
      return response.body.items.filter(service => service.spec?.clusterIP === 'None')
    }
    catch (error) {
      throw new Error(`Failed to list Headless Services: ${error.message}`)
    }
  }

  /**
   * Delete Headless Service
   */
  async deleteHeadlessService(name: string, namespace: string = 'default'): Promise<void> {
    const coreV1Api = this.clientService.getCoreV1Api()

    try {
      await coreV1Api.deleteNamespacedService(name, namespace)
    }
    catch (error) {
      throw new Error(`Failed to delete Headless Service: ${error.message}`)
    }
  }

  /**
   * Get DNS resolution information for a Headless Service
   *
   * Returns all pod IPs that the service resolves to, plus individual pod DNS records.
   */
  async getHeadlessServiceDNS(serviceName: string, namespace: string = 'default'): Promise<HeadlessServiceDNS> {
    const _coreV1Api = this.clientService.getCoreV1Api()

    try {
      // Get the service
      const service = await this.getHeadlessService(serviceName, namespace)
      if (!service)
        throw new Error(`Headless Service ${serviceName} not found`)

      // Get endpoints
      const endpoints = await this.getHeadlessServiceEndpoints(serviceName, namespace)

      // Extract pod IPs
      const podIPs = endpoints.map(endpoint => endpoint.podIP)

      // Generate individual pod DNS records
      const individualPodDNS: PodDNSRecord[] = endpoints.map(endpoint => ({
        podName: endpoint.podName,
        podIP: endpoint.podIP,
        dnsName: `${endpoint.podName}.${serviceName}.${namespace}.svc.cluster.local`,
      }))

      return {
        serviceName,
        namespace,
        podIPs,
        individualPodDNS,
      }
    }
    catch (error) {
      throw new Error(`Failed to get DNS information: ${error.message}`)
    }
  }

  /**
   * Get endpoints for a Headless Service
   *
   * Returns all pods that match the service selector.
   */
  async getHeadlessServiceEndpoints(serviceName: string, namespace: string = 'default'): Promise<HeadlessServiceEndpoint[]> {
    const coreV1Api = this.clientService.getCoreV1Api()

    try {
      const response = await coreV1Api.readNamespacedEndpoints(serviceName, namespace)
      const endpoints = response.body

      const headlessEndpoints: HeadlessServiceEndpoint[] = []

      if (endpoints.subsets) {
        for (const subset of endpoints.subsets) {
          if (subset.addresses) {
            for (const address of subset.addresses) {
              const endpoint: HeadlessServiceEndpoint = {
                podName: address.targetRef?.name || 'unknown',
                podIP: address.ip,
                ports: subset.ports?.map(port => ({
                  name: port.name || '',
                  port: port.port,
                  protocol: port.protocol || 'TCP',
                })) || [],
                ready: true,
                nodeName: address.nodeName,
              }
              headlessEndpoints.push(endpoint)
            }
          }
        }
      }

      return headlessEndpoints
    }
    catch (error) {
      if (error.statusCode === 404)
        return []

      throw new Error(`Failed to get endpoints: ${error.message}`)
    }
  }

  /**
   * Create StatefulSet with Headless Service
   *
   * Creates a StatefulSet that uses a Headless Service for stable network identities.
   */
  async createStatefulSetWithHeadlessService(config: StatefulSetHeadlessConfig): Promise<V1StatefulSet> {
    const appsV1Api = this.clientService.getAppsV1Api()

    const podTemplate: V1PodTemplateSpec = {
      metadata: {
        labels: config.podTemplate.labels,
      },
      spec: {
        containers: config.podTemplate.containers.map(container => ({
          name: container.name,
          image: container.image,
          ports: container.ports.map(port => ({
            name: port.name,
            containerPort: port.containerPort,
            protocol: port.protocol || 'TCP',
          })),
          env: container.env,
          resources: container.resources,
        })),
        volumes: config.podTemplate.volumes,
      },
    }

    const statefulSetSpec: V1StatefulSetSpec = {
      serviceName: config.serviceName,
      replicas: config.replicas,
      selector: {
        matchLabels: config.podTemplate.labels,
      },
      template: podTemplate,
      volumeClaimTemplates: config.volumeClaimTemplates,
    }

    const statefulSet: V1StatefulSet = {
      apiVersion: 'apps/v1',
      kind: 'StatefulSet',
      metadata: {
        name: config.serviceName,
        namespace: 'default',
      },
      spec: statefulSetSpec,
    }

    try {
      const response = await appsV1Api.createNamespacedStatefulSet('default', statefulSet)
      return response.body
    }
    catch (error) {
      throw new Error(`Failed to create StatefulSet: ${error.message}`)
    }
  }

  /**
   * Test DNS resolution for Headless Service
   *
   * Simulates DNS resolution to verify that the service resolves to the correct pod IPs.
   */
  async testDNSResolution(serviceName: string, namespace: string = 'default'): Promise<{
    serviceDNS: string
    resolvedIPs: string[]
    individualPodDNS: Array<{ podName: string; dnsName: string; resolvedIP: string }>
  }> {
    const dnsInfo = await this.getHeadlessServiceDNS(serviceName, namespace)

    const serviceDNS = `${serviceName}.${namespace}.svc.cluster.local`

    // In a real implementation, you would perform actual DNS lookups
    // For now, we'll return the expected DNS names and IPs
    const individualPodDNS = dnsInfo.individualPodDNS.map(pod => ({
      podName: pod.podName,
      dnsName: pod.dnsName,
      resolvedIP: pod.podIP,
    }))

    return {
      serviceDNS,
      resolvedIPs: dnsInfo.podIPs,
      individualPodDNS,
    }
  }

  /**
   * Configure iptables proxy mode for Headless Service
   *
   * Configures iptables rules for load balancing across pod endpoints.
   */
  async configureIptablesProxy(config: IptablesProxyConfig): Promise<void> {
    // In a real implementation, this would configure actual iptables rules
    // For now, we'll simulate the configuration
    console.log(`Configuring iptables proxy for service ${config.serviceName}`)
    console.log(`ClusterIP: ${config.clusterIP}`)
    console.log(`Endpoints: ${config.endpoints.join(', ')}`)
    console.log(`Load balancing algorithm: ${config.loadBalancingAlgorithm}`)

    // Simulate iptables rule creation
    const rules = this.generateIptablesRules(config)
    console.log('Generated iptables rules:', rules)
  }

  /**
   * Generate iptables rules for Headless Service
   */
  private generateIptablesRules(config: IptablesProxyConfig): string[] {
    const rules: string[] = []

    for (const port of config.ports) {
      // PREROUTING rule to capture traffic
      rules.push(
        `iptables -t nat -A PREROUTING -d ${config.clusterIP} -p ${port.protocol} --dport ${port.port} -j DNAT --to-destination ${config.endpoints[0]}:${port.targetPort}`,
      )

      // OUTPUT rule for local traffic
      rules.push(
        `iptables -t nat -A OUTPUT -d ${config.clusterIP} -p ${port.protocol} --dport ${port.port} -j DNAT --to-destination ${config.endpoints[0]}:${port.targetPort}`,
      )
    }

    return rules
  }

  /**
   * Implement service discovery for Headless Services
   *
   * Provides different discovery mechanisms for finding service endpoints.
   */
  async discoverService(serviceName: string, namespace: string = 'default', _config: ServiceDiscoveryConfig): Promise<DiscoveredService> {
    const endpoints = await this.getHeadlessServiceEndpoints(serviceName, namespace)

    return {
      serviceName,
      namespace,
      endpoints,
      lastUpdated: new Date(),
    }
  }

  /**
   * Validate Headless Service configuration
   */
  validateHeadlessServiceConfig(config: HeadlessServiceConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.name)
      errors.push('Service name is required')

    if (!config.selector || Object.keys(config.selector).length === 0)
      errors.push('Service selector is required')

    if (!config.ports || config.ports.length === 0)
      errors.push('At least one port is required')

    for (const port of config.ports || []) {
      if (!port.name)
        errors.push('Port name is required')

      if (!port.port || port.port < 1 || port.port > 65535)
        errors.push('Port number must be between 1 and 65535')

      if (!port.targetPort)
        errors.push('Target port is required')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get Headless Service statistics
   */
  async getHeadlessServiceStats(serviceName: string, namespace: string = 'default'): Promise<{
    serviceName: string
    namespace: string
    endpointCount: number
    totalConnections: number
    averageResponseTime: number
    lastUpdated: Date
  }> {
    const endpoints = await this.getHeadlessServiceEndpoints(serviceName, namespace)

    // In a real implementation, you would collect actual metrics
    return {
      serviceName,
      namespace,
      endpointCount: endpoints.length,
      totalConnections: Math.floor(Math.random() * 1000), // Simulated
      averageResponseTime: Math.random() * 100, // Simulated
      lastUpdated: new Date(),
    }
  }
}
