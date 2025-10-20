import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { V1Service, V1StatefulSet } from '@kubernetes/client-node'
import type {
  HeadlessServiceConfig,
  ServiceDiscoveryConfig,
  StatefulSetHeadlessConfig,
} from '../model/HeadlessService'
import { HeadlessServiceController } from './headlessService.controller'

describe('HeadlessServiceController', () => {
  let controller: HeadlessServiceController
  let mockHeadlessServiceService: any

  beforeEach(() => {
    mockHeadlessServiceService = {
      createHeadlessService: vi.fn(),
      getHeadlessService: vi.fn(),
      listHeadlessServices: vi.fn(),
      deleteHeadlessService: vi.fn(),
      getHeadlessServiceDNS: vi.fn(),
      getHeadlessServiceEndpoints: vi.fn(),
      testDNSResolution: vi.fn(),
      createStatefulSetWithHeadlessService: vi.fn(),
      configureIptablesProxy: vi.fn(),
      discoverService: vi.fn(),
      getHeadlessServiceStats: vi.fn(),
      validateHeadlessServiceConfig: vi.fn(),
    }

    controller = new HeadlessServiceController(mockHeadlessServiceService)
  })

  describe('createHeadlessService', () => {
    it('should create Headless Service successfully', async () => {
      const config: HeadlessServiceConfig = {
        name: 'nginx-test',
        namespace: 'default',
        labels: { app: 'nginx_test' },
        selector: { app: 'nginx_test' },
        ports: [{ name: 'web', port: 80, targetPort: 80 }],
      }

      const mockService: V1Service = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: 'nginx-test', namespace: 'default' },
        spec: { clusterIP: 'None', selector: { app: 'nginx_test' } },
      }

      mockHeadlessServiceService.validateHeadlessServiceConfig.mockReturnValue({ valid: true, errors: [] })
      mockHeadlessServiceService.createHeadlessService.mockResolvedValue(mockService)

      const result = await controller.createHeadlessService(config)

      expect(result.success).toBe(true)
      expect(result.service).toEqual(mockService)
      expect(result.message).toBe('Headless Service \'nginx-test\' created successfully')
    })

    it('should return error for invalid configuration', async () => {
      const config: HeadlessServiceConfig = {
        name: '',
        selector: { app: 'nginx' },
        ports: [{ name: 'web', port: 80, targetPort: 80 }],
      }

      mockHeadlessServiceService.validateHeadlessServiceConfig.mockReturnValue({
        valid: false,
        errors: ['Service name is required'],
      })

      await expect(controller.createHeadlessService(config)).rejects.toThrow()
    })
  })

  describe('getHeadlessService', () => {
    it('should return Headless Service when found', async () => {
      const mockService: V1Service = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: 'nginx-test', namespace: 'default' },
        spec: { clusterIP: 'None' },
      }

      mockHeadlessServiceService.getHeadlessService.mockResolvedValue(mockService)

      const result = await controller.getHeadlessService('nginx-test', 'default')

      expect(result.success).toBe(true)
      expect(result.service).toEqual(mockService)
      expect(result.message).toBe('Headless Service \'nginx-test\' found')
    })

    it('should return not found message when service does not exist', async () => {
      mockHeadlessServiceService.getHeadlessService.mockResolvedValue(null)

      const result = await controller.getHeadlessService('nonexistent', 'default')

      expect(result.success).toBe(true)
      expect(result.service).toBeNull()
      expect(result.message).toBe('Headless Service \'nonexistent\' not found')
    })
  })

  describe('listHeadlessServices', () => {
    it('should return list of Headless Services', async () => {
      const mockServices = [
        { metadata: { name: 'service-1' }, spec: { clusterIP: 'None' } },
        { metadata: { name: 'service-2' }, spec: { clusterIP: 'None' } },
      ]

      mockHeadlessServiceService.listHeadlessServices.mockResolvedValue(mockServices)

      const result = await controller.listHeadlessServices('default')

      expect(result.success).toBe(true)
      expect(result.services).toEqual(mockServices)
      expect(result.count).toBe(2)
      expect(result.message).toBe('Found 2 Headless Services')
    })
  })

  describe('deleteHeadlessService', () => {
    it('should delete Headless Service successfully', async () => {
      mockHeadlessServiceService.deleteHeadlessService.mockResolvedValue(undefined)

      const result = await controller.deleteHeadlessService('nginx-test', 'default')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Headless Service \'nginx-test\' deleted successfully')
    })
  })

  describe('getHeadlessServiceDNS', () => {
    it('should return DNS information', async () => {
      const mockDNS = {
        serviceName: 'nginx-test',
        namespace: 'default',
        podIPs: ['192.168.1.10', '192.168.1.11'],
        individualPodDNS: [
          {
            podName: 'nginx-web-0',
            podIP: '192.168.1.10',
            dnsName: 'nginx-web-0.nginx-test.default.svc.cluster.local',
          },
        ],
      }

      mockHeadlessServiceService.getHeadlessServiceDNS.mockResolvedValue(mockDNS)

      const result = await controller.getHeadlessServiceDNS('nginx-test', 'default')

      expect(result.success).toBe(true)
      expect(result.dns).toEqual(mockDNS)
      expect(result.message).toBe('DNS information for Headless Service \'nginx-test\' retrieved')
    })
  })

  describe('getHeadlessServiceEndpoints', () => {
    it('should return endpoints for Headless Service', async () => {
      const mockEndpoints = [
        {
          podName: 'nginx-web-0',
          podIP: '192.168.1.10',
          ports: [{ name: 'web', port: 80, protocol: 'TCP' }],
          ready: true,
        },
      ]

      mockHeadlessServiceService.getHeadlessServiceEndpoints.mockResolvedValue(mockEndpoints)

      const result = await controller.getHeadlessServiceEndpoints('nginx-test', 'default')

      expect(result.success).toBe(true)
      expect(result.endpoints).toEqual(mockEndpoints)
      expect(result.count).toBe(1)
      expect(result.message).toBe('Found 1 endpoints for Headless Service \'nginx-test\'')
    })
  })

  describe('testDNSResolution', () => {
    it('should return DNS resolution test results', async () => {
      const mockDNSTest = {
        serviceDNS: 'nginx-test.default.svc.cluster.local',
        resolvedIPs: ['192.168.1.10'],
        individualPodDNS: [
          {
            podName: 'nginx-web-0',
            dnsName: 'nginx-web-0.nginx-test.default.svc.cluster.local',
            resolvedIP: '192.168.1.10',
          },
        ],
      }

      mockHeadlessServiceService.testDNSResolution.mockResolvedValue(mockDNSTest)

      const result = await controller.testDNSResolution('nginx-test', 'default')

      expect(result.success).toBe(true)
      expect(result.dnsTest).toEqual(mockDNSTest)
      expect(result.message).toBe('DNS resolution test completed for Headless Service \'nginx-test\'')
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
              ports: [{ name: 'web', containerPort: 80 }],
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
        },
      }

      mockHeadlessServiceService.createStatefulSetWithHeadlessService.mockResolvedValue(mockStatefulSet)

      const result = await controller.createStatefulSetWithHeadlessService(config)

      expect(result.success).toBe(true)
      expect(result.statefulSet).toEqual(mockStatefulSet)
      expect(result.message).toBe('StatefulSet \'nginx-test\' created with Headless Service')
    })
  })

  describe('configureIptablesProxy', () => {
    it('should configure iptables proxy mode', async () => {
      const config = {
        clusterIP: 'None',
        ports: [{ name: 'web', port: 80, targetPort: 80, protocol: 'TCP' }],
        endpoints: ['192.168.1.10:80'],
        loadBalancingAlgorithm: 'random' as const,
      }

      mockHeadlessServiceService.configureIptablesProxy.mockResolvedValue(undefined)

      const result = await controller.configureIptablesProxy('nginx-test', config)

      expect(result.success).toBe(true)
      expect(result.message).toBe('iptables proxy configured for Headless Service \'nginx-test\'')
    })
  })

  describe('discoverService', () => {
    it('should discover service using specified method', async () => {
      const config: ServiceDiscoveryConfig = {
        discoveryType: 'dns',
        dnsServer: '192.168.16.2',
      }

      const mockDiscovery = {
        serviceName: 'nginx-test',
        namespace: 'default',
        endpoints: [
          {
            podName: 'nginx-web-0',
            podIP: '192.168.1.10',
            ports: [{ name: 'web', port: 80, protocol: 'TCP' }],
            ready: true,
          },
        ],
        lastUpdated: new Date(),
      }

      mockHeadlessServiceService.discoverService.mockResolvedValue(mockDiscovery)

      const result = await controller.discoverService('nginx-test', config, 'default')

      expect(result.success).toBe(true)
      expect(result.discovery).toEqual(mockDiscovery)
      expect(result.message).toBe('Service discovery completed for \'nginx-test\' using dns method')
    })
  })

  describe('getHeadlessServiceStats', () => {
    it('should return service statistics', async () => {
      const mockStats = {
        serviceName: 'nginx-test',
        namespace: 'default',
        endpointCount: 2,
        totalConnections: 150,
        averageResponseTime: 25.5,
        lastUpdated: new Date(),
      }

      mockHeadlessServiceService.getHeadlessServiceStats.mockResolvedValue(mockStats)

      const result = await controller.getHeadlessServiceStats('nginx-test', 'default')

      expect(result.success).toBe(true)
      expect(result.stats).toEqual(mockStats)
      expect(result.message).toBe('Statistics retrieved for Headless Service \'nginx-test\'')
    })
  })

  describe('validateHeadlessServiceConfig', () => {
    it('should validate configuration successfully', async () => {
      const config: HeadlessServiceConfig = {
        name: 'nginx-test',
        selector: { app: 'nginx' },
        ports: [{ name: 'web', port: 80, targetPort: 80 }],
      }

      mockHeadlessServiceService.validateHeadlessServiceConfig.mockReturnValue({
        valid: true,
        errors: [],
      })

      const result = await controller.validateHeadlessServiceConfig(config)

      expect(result.success).toBe(true)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.message).toBe('Configuration is valid')
    })

    it('should return validation errors', async () => {
      const config: HeadlessServiceConfig = {
        name: '',
        selector: {},
        ports: [],
      }

      mockHeadlessServiceService.validateHeadlessServiceConfig.mockReturnValue({
        valid: false,
        errors: ['Service name is required', 'Service selector is required', 'At least one port is required'],
      })

      const result = await controller.validateHeadlessServiceConfig(config)

      expect(result.success).toBe(true)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(3)
      expect(result.message).toBe('Configuration has 3 errors')
    })
  })
})
