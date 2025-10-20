import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { V1Endpoints, V1Service, V1StatefulSet } from '@kubernetes/client-node'
import { createMockClientService } from '../../../../test/utils/k8s-mocks'
import type {
  HeadlessServiceConfig,
  HeadlessServiceEndpoint,
  IptablesProxyConfig,
  ServiceDiscoveryConfig,
  StatefulSetHeadlessConfig,
} from '../model/HeadlessService'
import { HeadlessServiceService } from './headlessService.service'

describe('HeadlessServiceService', () => {
  let service: HeadlessServiceService
  let mockClientService: any
  let mockK8sApi: any

  beforeEach(() => {
    mockK8sApi = {
      createNamespacedService: vi.fn(),
      readNamespacedService: vi.fn(),
      listNamespacedService: vi.fn(),
      deleteNamespacedService: vi.fn(),
      readNamespacedEndpoints: vi.fn(),
      createNamespacedStatefulSet: vi.fn(),
    }

    mockClientService = createMockClientService()
    mockClientService.getCoreV1Api.mockReturnValue(mockK8sApi)
    mockClientService.getAppsV1Api.mockReturnValue(mockK8sApi)

    service = new HeadlessServiceService(mockClientService)
  })

  describe('createHeadlessService', () => {
    it('should create a Headless Service with ClusterIP None', async () => {
      const config: HeadlessServiceConfig = {
        name: 'nginx-test',
        namespace: 'default',
        labels: { app: 'nginx_test' },
        selector: { app: 'nginx_test' },
        ports: [
          {
            name: 'nginx-web',
            port: 80,
            targetPort: 80,
            protocol: 'TCP',
          },
        ],
      }

      const mockService: V1Service = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: 'nginx-test',
          namespace: 'default',
          labels: { app: 'nginx_test' },
        },
        spec: {
          clusterIP: 'None',
          selector: { app: 'nginx_test' },
          ports: [
            {
              name: 'nginx-web',
              port: 80,
              targetPort: 80,
              protocol: 'TCP',
            },
          ],
        },
      }

      mockK8sApi.createNamespacedService.mockResolvedValue({ body: mockService })

      const result = await service.createHeadlessService(config)

      expect(result).toEqual(mockService)
      expect(mockK8sApi.createNamespacedService).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          spec: expect.objectContaining({
            clusterIP: 'None',
          }),
        }),
      )
    })

    it('should throw error when service creation fails', async () => {
      const config: HeadlessServiceConfig = {
        name: 'nginx-test',
        selector: { app: 'nginx_test' },
        ports: [{ name: 'web', port: 80, targetPort: 80 }],
      }

      mockK8sApi.createNamespacedService.mockRejectedValue(new Error('API Error'))

      await expect(service.createHeadlessService(config)).rejects.toThrow(
        'Failed to create Headless Service: API Error',
      )
    })
  })

  describe('getHeadlessService', () => {
    it('should return Headless Service when found', async () => {
      const mockService: V1Service = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: 'nginx-test', namespace: 'default' },
        spec: { clusterIP: 'None', selector: { app: 'nginx' } },
      }

      mockK8sApi.readNamespacedService.mockResolvedValue({ body: mockService })

      const result = await service.getHeadlessService('nginx-test', 'default')

      expect(result).toEqual(mockService)
      expect(mockK8sApi.readNamespacedService).toHaveBeenCalledWith('nginx-test', 'default')
    })

    it('should return null when service not found', async () => {
      mockK8sApi.readNamespacedService.mockRejectedValue({ statusCode: 404 })

      const result = await service.getHeadlessService('nonexistent', 'default')

      expect(result).toBeNull()
    })

    it('should throw error when service is not Headless', async () => {
      const mockService: V1Service = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: 'nginx-test', namespace: 'default' },
        spec: { clusterIP: '10.96.0.1', selector: { app: 'nginx' } },
      }

      mockK8sApi.readNamespacedService.mockResolvedValue({ body: mockService })

      await expect(service.getHeadlessService('nginx-test', 'default')).rejects.toThrow(
        'Service nginx-test is not a Headless Service (ClusterIP: 10.96.0.1)',
      )
    })
  })

  describe('listHeadlessServices', () => {
    it('should return only Headless Services', async () => {
      const mockServices = [
        {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: { name: 'headless-1' },
          spec: { clusterIP: 'None' },
        },
        {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: { name: 'regular-1' },
          spec: { clusterIP: '10.96.0.1' },
        },
        {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: { name: 'headless-2' },
          spec: { clusterIP: 'None' },
        },
      ]

      mockK8sApi.listNamespacedService.mockResolvedValue({ body: { items: mockServices } })

      const result = await service.listHeadlessServices('default')

      expect(result).toHaveLength(2)
      expect(result[0].metadata.name).toBe('headless-1')
      expect(result[1].metadata.name).toBe('headless-2')
    })
  })

  describe('getHeadlessServiceDNS', () => {
    it('should return DNS information for Headless Service', async () => {
      const mockService: V1Service = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: 'nginx-test', namespace: 'default' },
        spec: { clusterIP: 'None', selector: { app: 'nginx' } },
      }

      const mockEndpoints: V1Endpoints = {
        apiVersion: 'v1',
        kind: 'Endpoints',
        metadata: { name: 'nginx-test', namespace: 'default' },
        subsets: [
          {
            addresses: [
              { ip: '192.168.1.10', targetRef: { name: 'nginx-web-0' } },
              { ip: '192.168.1.11', targetRef: { name: 'nginx-web-1' } },
            ],
            ports: [
              { name: 'web', port: 80, protocol: 'TCP' },
            ],
          },
        ],
      }

      mockK8sApi.readNamespacedService.mockResolvedValue({ body: mockService })
      mockK8sApi.readNamespacedEndpoints.mockResolvedValue({ body: mockEndpoints })

      const result = await service.getHeadlessServiceDNS('nginx-test', 'default')

      expect(result).toEqual({
        serviceName: 'nginx-test',
        namespace: 'default',
        podIPs: ['192.168.1.10', '192.168.1.11'],
        individualPodDNS: [
          {
            podName: 'nginx-web-0',
            podIP: '192.168.1.10',
            dnsName: 'nginx-web-0.nginx-test.default.svc.cluster.local',
          },
          {
            podName: 'nginx-web-1',
            podIP: '192.168.1.11',
            dnsName: 'nginx-web-1.nginx-test.default.svc.cluster.local',
          },
        ],
      })
    })
  })

  describe('getHeadlessServiceEndpoints', () => {
    it('should return endpoints for Headless Service', async () => {
      const mockEndpoints: V1Endpoints = {
        apiVersion: 'v1',
        kind: 'Endpoints',
        metadata: { name: 'nginx-test', namespace: 'default' },
        subsets: [
          {
            addresses: [
              {
                ip: '192.168.1.10',
                targetRef: { name: 'nginx-web-0' },
                nodeName: 'node-1',
              },
            ],
            ports: [
              { name: 'web', port: 80, protocol: 'TCP' },
            ],
          },
        ],
      }

      mockK8sApi.readNamespacedEndpoints.mockResolvedValue({ body: mockEndpoints })

      const result = await service.getHeadlessServiceEndpoints('nginx-test', 'default')

      expect(result).toEqual([
        {
          podName: 'nginx-web-0',
          podIP: '192.168.1.10',
          ports: [{ name: 'web', port: 80, protocol: 'TCP' }],
          ready: true,
          nodeName: 'node-1',
        },
      ])
    })

    it('should return empty array when no endpoints found', async () => {
      mockK8sApi.readNamespacedEndpoints.mockRejectedValue({ statusCode: 404 })

      const result = await service.getHeadlessServiceEndpoints('nginx-test', 'default')

      expect(result).toEqual([])
    })
  })

  describe('createStatefulSetWithHeadlessService', () => {
    it('should create StatefulSet with Headless Service', async () => {
      const config: StatefulSetHeadlessConfig = {
        serviceName: 'nginx-test',
        replicas: 2,
        podTemplate: {
          labels: { app: 'nginx_test' },
          containers: [
            {
              name: 'nginx-test',
              image: 'nginx:1.11',
              ports: [{ name: 'nginx-web', containerPort: 80 }],
            },
          ],
        },
      }

      const mockStatefulSet: V1StatefulSet = {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        metadata: { name: 'nginx-test', namespace: 'default' },
        spec: {
          serviceName: 'nginx-test',
          replicas: 2,
          selector: { matchLabels: { app: 'nginx_test' } },
          template: {
            metadata: { labels: { app: 'nginx_test' } },
            spec: {
              containers: [
                {
                  name: 'nginx-test',
                  image: 'nginx:1.11',
                  ports: [{ name: 'nginx-web', containerPort: 80, protocol: 'TCP' }],
                },
              ],
            },
          },
        },
      }

      mockK8sApi.createNamespacedStatefulSet.mockResolvedValue({ body: mockStatefulSet })

      const result = await service.createStatefulSetWithHeadlessService(config)

      expect(result).toEqual(mockStatefulSet)
      expect(mockK8sApi.createNamespacedStatefulSet).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          spec: expect.objectContaining({
            serviceName: 'nginx-test',
            replicas: 2,
          }),
        }),
      )
    })
  })

  describe('testDNSResolution', () => {
    it('should return DNS resolution test results', async () => {
      const mockService: V1Service = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: 'nginx-test', namespace: 'default' },
        spec: { clusterIP: 'None', selector: { app: 'nginx' } },
      }

      const mockEndpoints: V1Endpoints = {
        apiVersion: 'v1',
        kind: 'Endpoints',
        metadata: { name: 'nginx-test', namespace: 'default' },
        subsets: [
          {
            addresses: [
              { ip: '192.168.1.10', targetRef: { name: 'nginx-web-0' } },
            ],
            ports: [{ name: 'web', port: 80, protocol: 'TCP' }],
          },
        ],
      }

      mockK8sApi.readNamespacedService.mockResolvedValue({ body: mockService })
      mockK8sApi.readNamespacedEndpoints.mockResolvedValue({ body: mockEndpoints })

      const result = await service.testDNSResolution('nginx-test', 'default')

      expect(result).toEqual({
        serviceDNS: 'nginx-test.default.svc.cluster.local',
        resolvedIPs: ['192.168.1.10'],
        individualPodDNS: [
          {
            podName: 'nginx-web-0',
            dnsName: 'nginx-web-0.nginx-test.default.svc.cluster.local',
            resolvedIP: '192.168.1.10',
          },
        ],
      })
    })
  })

  describe('configureIptablesProxy', () => {
    it('should configure iptables proxy mode', async () => {
      const config: IptablesProxyConfig = {
        serviceName: 'nginx-test',
        clusterIP: 'None',
        ports: [{ name: 'web', port: 80, targetPort: 80, protocol: 'TCP' }],
        endpoints: ['192.168.1.10:80', '192.168.1.11:80'],
        loadBalancingAlgorithm: 'random',
      }

      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await service.configureIptablesProxy(config)

      expect(consoleSpy).toHaveBeenCalledWith('Configuring iptables proxy for service nginx-test')
      expect(consoleSpy).toHaveBeenCalledWith('ClusterIP: None')
      expect(consoleSpy).toHaveBeenCalledWith('Endpoints: 192.168.1.10:80, 192.168.1.11:80')
      expect(consoleSpy).toHaveBeenCalledWith('Load balancing algorithm: random')

      consoleSpy.mockRestore()
    })
  })

  describe('discoverService', () => {
    it('should discover service using DNS method', async () => {
      const config: ServiceDiscoveryConfig = {
        discoveryType: 'dns',
        dnsServer: '192.168.16.2',
      }

      const _mockEndpoints: HeadlessServiceEndpoint[] = [
        {
          podName: 'nginx-web-0',
          podIP: '192.168.1.10',
          ports: [{ name: 'web', port: 80, protocol: 'TCP' }],
          ready: true,
        },
      ]

      mockK8sApi.readNamespacedEndpoints.mockResolvedValue({
        body: {
          subsets: [
            {
              addresses: [
                { ip: '192.168.1.10', targetRef: { name: 'nginx-web-0' } },
              ],
              ports: [{ name: 'web', port: 80, protocol: 'TCP' }],
            },
          ],
        },
      })

      const result = await service.discoverService('nginx-test', 'default', config)

      expect(result.serviceName).toBe('nginx-test')
      expect(result.namespace).toBe('default')
      expect(result.endpoints).toHaveLength(1)
      expect(result.endpoints[0].podName).toBe('nginx-web-0')
      expect(result.lastUpdated).toBeInstanceOf(Date)
    })
  })

  describe('validateHeadlessServiceConfig', () => {
    it('should validate correct configuration', () => {
      const config: HeadlessServiceConfig = {
        name: 'nginx-test',
        selector: { app: 'nginx' },
        ports: [{ name: 'web', port: 80, targetPort: 80 }],
      }

      const result = service.validateHeadlessServiceConfig(config)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing service name', () => {
      const config: HeadlessServiceConfig = {
        name: '',
        selector: { app: 'nginx' },
        ports: [{ name: 'web', port: 80, targetPort: 80 }],
      }

      const result = service.validateHeadlessServiceConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Service name is required')
    })

    it('should detect missing selector', () => {
      const config: HeadlessServiceConfig = {
        name: 'nginx-test',
        selector: {},
        ports: [{ name: 'web', port: 80, targetPort: 80 }],
      }

      const result = service.validateHeadlessServiceConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Service selector is required')
    })

    it('should detect invalid port number', () => {
      const config: HeadlessServiceConfig = {
        name: 'nginx-test',
        selector: { app: 'nginx' },
        ports: [{ name: 'web', port: 0, targetPort: 80 }],
      }

      const result = service.validateHeadlessServiceConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Port number must be between 1 and 65535')
    })
  })

  describe('getHeadlessServiceStats', () => {
    it('should return service statistics', async () => {
      const mockEndpoints: V1Endpoints = {
        apiVersion: 'v1',
        kind: 'Endpoints',
        metadata: { name: 'nginx-test', namespace: 'default' },
        subsets: [
          {
            addresses: [
              { ip: '192.168.1.10', targetRef: { name: 'nginx-web-0' } },
              { ip: '192.168.1.11', targetRef: { name: 'nginx-web-1' } },
            ],
            ports: [{ name: 'web', port: 80, protocol: 'TCP' }],
          },
        ],
      }

      mockK8sApi.readNamespacedEndpoints.mockResolvedValue({ body: mockEndpoints })

      const result = await service.getHeadlessServiceStats('nginx-test', 'default')

      expect(result.serviceName).toBe('nginx-test')
      expect(result.namespace).toBe('default')
      expect(result.endpointCount).toBe(2)
      expect(typeof result.totalConnections).toBe('number')
      expect(typeof result.averageResponseTime).toBe('number')
      expect(result.lastUpdated).toBeInstanceOf(Date)
    })
  })
})
