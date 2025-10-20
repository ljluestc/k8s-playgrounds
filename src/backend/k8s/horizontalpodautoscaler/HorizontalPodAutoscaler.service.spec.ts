import { vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createHorizontalPodAutoscaler, createMockClientService } from '../../../../test/utils/k8s-mocks'
import { HorizontalPodAutoscalerService } from './HorizontalPodAutoscaler.service'

describe('HorizontalPodAutoscalerService', () => {
  let service: HorizontalPodAutoscalerService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getAutoScalingV2Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: HorizontalPodAutoscalerService,
          useFactory: (clientService: ClientService) => {
            return new HorizontalPodAutoscalerService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<HorizontalPodAutoscalerService>(HorizontalPodAutoscalerService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all HPAs across all namespaces when no namespace specified', async () => {
      const mockHPAs = [
        createHorizontalPodAutoscaler('hpa-1', 'default'),
        createHorizontalPodAutoscaler('hpa-2', 'kube-system'),
      ]
      mockK8sApi.listHorizontalPodAutoscalerForAllNamespaces.mockResolvedValue({
        body: { items: mockHPAs },
      })

      const result = await service.List()

      expect(result).toEqual(mockHPAs)
      expect(mockK8sApi.listHorizontalPodAutoscalerForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedHorizontalPodAutoscaler).not.toHaveBeenCalled()
    })

    it('should list all HPAs when namespace is "null" string', async () => {
      const mockHPAs = [createHorizontalPodAutoscaler('hpa-1')]
      mockK8sApi.listHorizontalPodAutoscalerForAllNamespaces.mockResolvedValue({
        body: { items: mockHPAs },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockHPAs)
      expect(mockK8sApi.listHorizontalPodAutoscalerForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedHorizontalPodAutoscaler).not.toHaveBeenCalled()
    })

    it('should list HPAs in a specific namespace', async () => {
      const mockHPAs = [createHorizontalPodAutoscaler('hpa-1', 'default')]
      mockK8sApi.listNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: { items: mockHPAs },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockHPAs)
      expect(mockK8sApi.listNamespacedHorizontalPodAutoscaler).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listHorizontalPodAutoscalerForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all HPAs', async () => {
      const error = new Error('API Error')
      mockK8sApi.listHorizontalPodAutoscalerForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced HPAs', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedHorizontalPodAutoscaler.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no HPAs exist', async () => {
      mockK8sApi.listHorizontalPodAutoscalerForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list HPAs in kube-system namespace', async () => {
      const mockHPAs = [createHorizontalPodAutoscaler('metrics-server-hpa', 'kube-system')]
      mockK8sApi.listNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: { items: mockHPAs },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockHPAs)
      expect(mockK8sApi.listNamespacedHorizontalPodAutoscaler).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockHPAs = [createHorizontalPodAutoscaler('my-hpa', 'my-namespace-123')]
      mockK8sApi.listNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: { items: mockHPAs },
      })

      const result = await service.List('my-namespace-123')

      expect(result).toEqual(mockHPAs)
      expect(mockK8sApi.listNamespacedHorizontalPodAutoscaler).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should list HPAs in production namespace', async () => {
      const mockHPAs = [createHorizontalPodAutoscaler('web-hpa', 'production')]
      mockK8sApi.listNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: { items: mockHPAs },
      })

      const result = await service.List('production')

      expect(result).toEqual(mockHPAs)
      expect(mockK8sApi.listNamespacedHorizontalPodAutoscaler).toHaveBeenCalledWith('production')
    })

    it('should list multiple HPAs with different configurations', async () => {
      const mockHPAs = [
        createHorizontalPodAutoscaler('cpu-hpa', 'default'),
        createHorizontalPodAutoscaler('memory-hpa', 'default'),
        createHorizontalPodAutoscaler('custom-hpa', 'default'),
      ]
      mockK8sApi.listNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: { items: mockHPAs },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockHPAs)
      expect(result.length).toBe(3)
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single HPA by namespace and name', async () => {
      const mockHPA = createHorizontalPodAutoscaler('test-hpa', 'default')
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'test-hpa')

      expect(result).toEqual(mockHPA)
      expect(mockK8sApi.readNamespacedHorizontalPodAutoscaler).toHaveBeenCalledWith('test-hpa', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('HPA not found')
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('HPA not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-hpa')).rejects.toThrow('Namespace does not exist')
    })

    it('should get HPA targeting Deployment', async () => {
      const targetRef = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'web-app',
      }
      const mockHPA = createHorizontalPodAutoscaler('deployment-hpa', 'default', targetRef)
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'deployment-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.scaleTargetRef.kind).toBe('Deployment')
      expect(result.spec?.scaleTargetRef.name).toBe('web-app')
    })

    it('should get HPA targeting StatefulSet', async () => {
      const targetRef = {
        apiVersion: 'apps/v1',
        kind: 'StatefulSet',
        name: 'database',
      }
      const mockHPA = createHorizontalPodAutoscaler('statefulset-hpa', 'default', targetRef)
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'statefulset-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.scaleTargetRef.kind).toBe('StatefulSet')
      expect(result.spec?.scaleTargetRef.name).toBe('database')
    })

    it('should get HPA with min/max replicas configuration', async () => {
      const mockHPA = createHorizontalPodAutoscaler('scaling-hpa', 'default')
      mockHPA.spec.minReplicas = 2
      mockHPA.spec.maxReplicas = 20
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'scaling-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.minReplicas).toBe(2)
      expect(result.spec?.maxReplicas).toBe(20)
    })

    it('should get HPA with CPU utilization metric', async () => {
      const mockHPA = createHorizontalPodAutoscaler('cpu-hpa', 'default')
      mockHPA.spec.metrics = [
        {
          type: 'Resource',
          resource: {
            name: 'cpu',
            target: {
              type: 'Utilization',
              averageUtilization: 80,
            },
          },
        },
      ]
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'cpu-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.metrics?.[0].resource?.name).toBe('cpu')
      expect(result.spec?.metrics?.[0].resource?.target.averageUtilization).toBe(80)
    })

    it('should get HPA with memory utilization metric', async () => {
      const mockHPA = createHorizontalPodAutoscaler('memory-hpa', 'default')
      mockHPA.spec.metrics = [
        {
          type: 'Resource',
          resource: {
            name: 'memory',
            target: {
              type: 'Utilization',
              averageUtilization: 70,
            },
          },
        },
      ]
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'memory-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.metrics?.[0].resource?.name).toBe('memory')
      expect(result.spec?.metrics?.[0].resource?.target.averageUtilization).toBe(70)
    })

    it('should get HPA with multiple metrics (CPU and memory)', async () => {
      const mockHPA = createHorizontalPodAutoscaler('multi-metric-hpa', 'default')
      mockHPA.spec.metrics = [
        {
          type: 'Resource',
          resource: {
            name: 'cpu',
            target: {
              type: 'Utilization',
              averageUtilization: 80,
            },
          },
        },
        {
          type: 'Resource',
          resource: {
            name: 'memory',
            target: {
              type: 'Utilization',
              averageUtilization: 70,
            },
          },
        },
      ]
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'multi-metric-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.metrics?.length).toBe(2)
    })

    it('should get HPA with custom metric', async () => {
      const mockHPA = createHorizontalPodAutoscaler('custom-hpa', 'default')
      mockHPA.spec.metrics = [
        {
          type: 'Pods',
          pods: {
            metric: {
              name: 'http_requests_per_second',
            },
            target: {
              type: 'AverageValue',
              averageValue: '1000',
            },
          },
        },
      ]
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'custom-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.metrics?.[0].type).toBe('Pods')
      expect(result.spec?.metrics?.[0].pods?.metric.name).toBe('http_requests_per_second')
    })

    it('should get HPA with external metric', async () => {
      const mockHPA = createHorizontalPodAutoscaler('external-hpa', 'default')
      mockHPA.spec.metrics = [
        {
          type: 'External',
          external: {
            metric: {
              name: 'queue_messages_ready',
              selector: {
                matchLabels: {
                  queue: 'worker_tasks',
                },
              },
            },
            target: {
              type: 'AverageValue',
              averageValue: '30',
            },
          },
        },
      ]
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'external-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.metrics?.[0].type).toBe('External')
      expect(result.spec?.metrics?.[0].external?.metric.name).toBe('queue_messages_ready')
    })

    it('should get HPA with scaling behavior configuration', async () => {
      const mockHPA = createHorizontalPodAutoscaler('behavior-hpa', 'default')
      mockHPA.spec.behavior = {
        scaleDown: {
          stabilizationWindowSeconds: 300,
          policies: [
            {
              type: 'Percent',
              value: 100,
              periodSeconds: 15,
            },
          ],
        },
        scaleUp: {
          stabilizationWindowSeconds: 0,
          policies: [
            {
              type: 'Percent',
              value: 100,
              periodSeconds: 15,
            },
            {
              type: 'Pods',
              value: 4,
              periodSeconds: 15,
            },
          ],
          selectPolicy: 'Max',
        },
      }
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'behavior-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.behavior?.scaleDown?.stabilizationWindowSeconds).toBe(300)
      expect(result.spec?.behavior?.scaleUp?.policies?.length).toBe(2)
    })

    it('should get HPA with current status metrics', async () => {
      const mockHPA = createHorizontalPodAutoscaler('status-hpa', 'default')
      mockHPA.status.currentReplicas = 5
      mockHPA.status.desiredReplicas = 7
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'status-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.status?.currentReplicas).toBe(5)
      expect(result.status?.desiredReplicas).toBe(7)
    })

    it('should handle HPA names with hyphens and numbers', async () => {
      const mockHPA = createHorizontalPodAutoscaler('my-hpa-123', 'default')
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'my-hpa-123')

      expect(result).toEqual(mockHPA)
      expect(mockK8sApi.readNamespacedHorizontalPodAutoscaler).toHaveBeenCalledWith('my-hpa-123', 'default')
    })
  })

  describe('Delete', () => {
    it('should delete an HPA', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-hpa', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedHorizontalPodAutoscaler).toHaveBeenCalledWith('test-hpa', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedHorizontalPodAutoscaler.mockRejectedValue(error)

      await expect(service.Delete('test-hpa', 'default')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent HPA', async () => {
      const error = new Error('HPA not found')
      mockK8sApi.deleteNamespacedHorizontalPodAutoscaler.mockRejectedValue(error)

      await expect(service.Delete('nonexistent', 'default')).rejects.toThrow('HPA not found')
    })

    it('should delete HPA from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-hpa', 'kube-system')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedHorizontalPodAutoscaler).toHaveBeenCalledWith('my-hpa', 'kube-system')
    })

    it('should handle HPA with finalizers', async () => {
      const mockResponse = { status: 'Success', metadata: { finalizers: ['kubernetes'] } }
      mockK8sApi.deleteNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('hpa-with-finalizer', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete HPAs')
      mockK8sApi.deleteNamespacedHorizontalPodAutoscaler.mockRejectedValue(error)

      await expect(service.Delete('test-hpa', 'default')).rejects.toThrow('Forbidden')
    })

    it('should delete HPA from production namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('web-hpa', 'production')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedHorizontalPodAutoscaler).toHaveBeenCalledWith('web-hpa', 'production')
    })

    it('should delete HPA from staging namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('api-hpa', 'staging')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedHorizontalPodAutoscaler).toHaveBeenCalledWith('api-hpa', 'staging')
    })

    it('should handle invalid namespace during deletion', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.deleteNamespacedHorizontalPodAutoscaler.mockRejectedValue(error)

      await expect(service.Delete('test-hpa', 'invalid-namespace')).rejects.toThrow('Namespace does not exist')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get AutoScaling V2 API', async () => {
      const mockHPAs = [createHorizontalPodAutoscaler('test-hpa')]
      mockK8sApi.listHorizontalPodAutoscalerForAllNamespaces.mockResolvedValue({
        body: { items: mockHPAs },
      })

      await service.List()

      expect(clientService.getAutoScalingV2Api).toHaveBeenCalled()
    })

    it('should call getAutoScalingV2Api for every operation', async () => {
      mockK8sApi.listHorizontalPodAutoscalerForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({ body: createHorizontalPodAutoscaler('test') })
      mockK8sApi.deleteNamespacedHorizontalPodAutoscaler.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('test', 'default')

      expect(clientService.getAutoScalingV2Api).toHaveBeenCalledTimes(4)
    })

    it('should handle API client errors', async () => {
      const error = new Error('Unable to get AutoScaling API')
      clientService.getAutoScalingV2Api.mockImplementation(() => {
        throw error
      })

      await expect(service.List()).rejects.toThrow('Unable to get AutoScaling API')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle HPA with no metrics defined', async () => {
      const mockHPA = createHorizontalPodAutoscaler('no-metrics-hpa', 'default')
      mockHPA.spec.metrics = []
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'no-metrics-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.metrics?.length).toBe(0)
    })

    it('should handle HPA with only minReplicas set', async () => {
      const mockHPA = createHorizontalPodAutoscaler('min-only-hpa', 'default')
      mockHPA.spec.minReplicas = 1
      mockHPA.spec.maxReplicas = 10
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'min-only-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.minReplicas).toBe(1)
    })

    it('should handle HPA targeting ReplicationController', async () => {
      const targetRef = {
        apiVersion: 'v1',
        kind: 'ReplicationController',
        name: 'legacy-app',
      }
      const mockHPA = createHorizontalPodAutoscaler('rc-hpa', 'default', targetRef)
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockResolvedValue({
        body: mockHPA,
      })

      const result = await service.GetOneByNsName('default', 'rc-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.scaleTargetRef.kind).toBe('ReplicationController')
    })

    it('should handle timeout errors', async () => {
      const error = new Error('Request timeout')
      mockK8sApi.listHorizontalPodAutoscalerForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('Request timeout')
    })

    it('should handle network errors', async () => {
      const error = new Error('Network error')
      mockK8sApi.readNamespacedHorizontalPodAutoscaler.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'test-hpa')).rejects.toThrow('Network error')
    })

    it('should handle unauthorized errors', async () => {
      const error = new Error('Unauthorized')
      mockK8sApi.listNamespacedHorizontalPodAutoscaler.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Unauthorized')
    })

    it('should handle API server unavailable', async () => {
      const error = new Error('API server unavailable')
      mockK8sApi.deleteNamespacedHorizontalPodAutoscaler.mockRejectedValue(error)

      await expect(service.Delete('test-hpa', 'default')).rejects.toThrow('API server unavailable')
    })
  })
})
