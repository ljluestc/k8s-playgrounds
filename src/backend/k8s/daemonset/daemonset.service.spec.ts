import { _vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createDaemonSet, createMockClientService } from '../../../../test/utils/k8s-mocks'
import { DaemonSetService } from './daemonset.service'

describe('DaemonSetService', () => {
  let service: DaemonSetService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getAppsV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DaemonSetService,
          useFactory: (clientService: ClientService) => {
            return new DaemonSetService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<DaemonSetService>(DaemonSetService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all daemonsets across all namespaces when no namespace specified', async () => {
      const mockDaemonSets = [createDaemonSet('daemonset-1', 'default'), createDaemonSet('daemonset-2', 'kube-system')]
      mockK8sApi.listDaemonSetForAllNamespaces.mockResolvedValue({
        body: { items: mockDaemonSets },
      })

      const result = await service.List()

      expect(result).toEqual(mockDaemonSets)
      expect(mockK8sApi.listDaemonSetForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedDaemonSet).not.toHaveBeenCalled()
    })

    it('should list all daemonsets when namespace is "null" string', async () => {
      const mockDaemonSets = [createDaemonSet('daemonset-1')]
      mockK8sApi.listDaemonSetForAllNamespaces.mockResolvedValue({
        body: { items: mockDaemonSets },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockDaemonSets)
      expect(mockK8sApi.listDaemonSetForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedDaemonSet).not.toHaveBeenCalled()
    })

    it('should list daemonsets in a specific namespace', async () => {
      const mockDaemonSets = [createDaemonSet('daemonset-1', 'default')]
      mockK8sApi.listNamespacedDaemonSet.mockResolvedValue({
        body: { items: mockDaemonSets },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockDaemonSets)
      expect(mockK8sApi.listNamespacedDaemonSet).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listDaemonSetForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all daemonsets', async () => {
      const error = new Error('API Error')
      mockK8sApi.listDaemonSetForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced daemonsets', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedDaemonSet.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no daemonsets exist', async () => {
      mockK8sApi.listDaemonSetForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list daemonsets in kube-system namespace', async () => {
      const mockDaemonSets = [createDaemonSet('kube-proxy', 'kube-system')]
      mockK8sApi.listNamespacedDaemonSet.mockResolvedValue({
        body: { items: mockDaemonSets },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockDaemonSets)
      expect(mockK8sApi.listNamespacedDaemonSet).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockDaemonSets = [createDaemonSet('my-daemonset', 'my-namespace-123')]
      mockK8sApi.listNamespacedDaemonSet.mockResolvedValue({
        body: { items: mockDaemonSets },
      })

      const result = await service.List('my-namespace-123')

      expect(result).toEqual(mockDaemonSets)
      expect(mockK8sApi.listNamespacedDaemonSet).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should list daemonsets across multiple namespaces', async () => {
      const mockDaemonSets = [
        createDaemonSet('kube-proxy', 'kube-system'),
        createDaemonSet('node-exporter', 'monitoring'),
        createDaemonSet('fluentd', 'logging'),
      ]
      mockK8sApi.listDaemonSetForAllNamespaces.mockResolvedValue({
        body: { items: mockDaemonSets },
      })

      const result = await service.List()

      expect(result).toEqual(mockDaemonSets)
      expect(result).toHaveLength(3)
    })

    it('should list daemonsets in monitoring namespace', async () => {
      const mockDaemonSets = [createDaemonSet('node-exporter', 'monitoring')]
      mockK8sApi.listNamespacedDaemonSet.mockResolvedValue({
        body: { items: mockDaemonSets },
      })

      const result = await service.List('monitoring')

      expect(result).toEqual(mockDaemonSets)
      expect(mockK8sApi.listNamespacedDaemonSet).toHaveBeenCalledWith('monitoring')
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single daemonset by namespace and name', async () => {
      const mockDaemonSet = createDaemonSet('test-daemonset', 'default')
      mockK8sApi.readNamespacedDaemonSet.mockResolvedValue({
        body: mockDaemonSet,
      })

      const result = await service.GetOneByNsName('default', 'test-daemonset')

      expect(result).toEqual(mockDaemonSet)
      expect(mockK8sApi.readNamespacedDaemonSet).toHaveBeenCalledWith('test-daemonset', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('DaemonSet not found')
      mockK8sApi.readNamespacedDaemonSet.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('DaemonSet not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedDaemonSet.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-daemonset')).rejects.toThrow('Namespace does not exist')
    })

    it('should get kube-proxy daemonset', async () => {
      const mockDaemonSet = createDaemonSet('kube-proxy', 'kube-system')
      mockK8sApi.readNamespacedDaemonSet.mockResolvedValue({
        body: mockDaemonSet,
      })

      const result = await service.GetOneByNsName('kube-system', 'kube-proxy')

      expect(result).toEqual(mockDaemonSet)
      expect(result.metadata?.name).toBe('kube-proxy')
      expect(result.metadata?.namespace).toBe('kube-system')
    })

    it('should get node-exporter daemonset from monitoring namespace', async () => {
      const mockDaemonSet = createDaemonSet('node-exporter', 'monitoring')
      mockK8sApi.readNamespacedDaemonSet.mockResolvedValue({
        body: mockDaemonSet,
      })

      const result = await service.GetOneByNsName('monitoring', 'node-exporter')

      expect(result).toEqual(mockDaemonSet)
      expect(result.metadata?.name).toBe('node-exporter')
      expect(result.metadata?.namespace).toBe('monitoring')
    })

    it('should handle daemonset names with hyphens and numbers', async () => {
      const mockDaemonSet = createDaemonSet('my-daemonset-123', 'default')
      mockK8sApi.readNamespacedDaemonSet.mockResolvedValue({
        body: mockDaemonSet,
      })

      const result = await service.GetOneByNsName('default', 'my-daemonset-123')

      expect(result).toEqual(mockDaemonSet)
      expect(mockK8sApi.readNamespacedDaemonSet).toHaveBeenCalledWith('my-daemonset-123', 'default')
    })

    it('should get daemonset with status information', async () => {
      const mockDaemonSet = createDaemonSet('status-daemonset', 'default')
      mockDaemonSet.status = {
        numberReady: 5,
        desiredNumberScheduled: 5,
        currentNumberScheduled: 5,
        numberAvailable: 5,
      }
      mockK8sApi.readNamespacedDaemonSet.mockResolvedValue({
        body: mockDaemonSet,
      })

      const result = await service.GetOneByNsName('default', 'status-daemonset')

      expect(result).toEqual(mockDaemonSet)
      expect(result.status?.numberReady).toBe(5)
      expect(result.status?.desiredNumberScheduled).toBe(5)
    })

    it('should handle API errors when getting daemonset', async () => {
      const error = new Error('Forbidden: User cannot get daemonsets')
      mockK8sApi.readNamespacedDaemonSet.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'test-daemonset')).rejects.toThrow('Forbidden')
    })

    it('should get fluentd daemonset from logging namespace', async () => {
      const mockDaemonSet = createDaemonSet('fluentd', 'logging')
      mockK8sApi.readNamespacedDaemonSet.mockResolvedValue({
        body: mockDaemonSet,
      })

      const result = await service.GetOneByNsName('logging', 'fluentd')

      expect(result).toEqual(mockDaemonSet)
      expect(mockK8sApi.readNamespacedDaemonSet).toHaveBeenCalledWith('fluentd', 'logging')
    })
  })

  describe('Delete', () => {
    it('should delete a daemonset', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedDaemonSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('default', 'test-daemonset')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedDaemonSet).toHaveBeenCalledWith('test-daemonset', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedDaemonSet.mockRejectedValue(error)

      await expect(service.Delete('default', 'test-daemonset')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent daemonset', async () => {
      const error = new Error('DaemonSet not found')
      mockK8sApi.deleteNamespacedDaemonSet.mockRejectedValue(error)

      await expect(service.Delete('default', 'nonexistent')).rejects.toThrow('DaemonSet not found')
    })

    it('should delete daemonset from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedDaemonSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('kube-system', 'my-daemonset')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedDaemonSet).toHaveBeenCalledWith('my-daemonset', 'kube-system')
    })

    it('should handle daemonset with finalizers', async () => {
      const mockResponse = { status: 'Success', metadata: { finalizers: ['kubernetes'] } }
      mockK8sApi.deleteNamespacedDaemonSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('default', 'daemonset-with-finalizer')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNamespacedDaemonSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('default', 'graceful-delete')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete daemonsets')
      mockK8sApi.deleteNamespacedDaemonSet.mockRejectedValue(error)

      await expect(service.Delete('default', 'test-daemonset')).rejects.toThrow('Forbidden')
    })

    it('should delete node-exporter from monitoring namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedDaemonSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('monitoring', 'node-exporter')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedDaemonSet).toHaveBeenCalledWith('node-exporter', 'monitoring')
    })

    it('should handle timeout during deletion', async () => {
      const error = new Error('Request timeout')
      mockK8sApi.deleteNamespacedDaemonSet.mockRejectedValue(error)

      await expect(service.Delete('default', 'test-daemonset')).rejects.toThrow('Request timeout')
    })
  })

  describe('Restart', () => {
    it('should restart a daemonset by patching annotations', async () => {
      const mockDaemonSet = createDaemonSet('test-daemonset', 'default')
      mockDaemonSet.spec!.template!.metadata = {
        annotations: {
          'kubectl.kubernetes.io/restartedAt': expect.any(String),
          'kubectl.kubernetes.io/origin': 'k8s-playgrounds',
        },
      }
      mockK8sApi.patchNamespacedDaemonSet.mockResolvedValue({
        body: mockDaemonSet,
      })

      const result = await service.Restart('default', 'test-daemonset')

      expect(result).toEqual(mockDaemonSet)
      expect(mockK8sApi.patchNamespacedDaemonSet).toHaveBeenCalledWith(
        'test-daemonset',
        'default',
        {
          spec: {
            template: {
              metadata: {
                annotations: {
                  'kubectl.kubernetes.io/restartedAt': expect.any(Object),
                  'kubectl.kubernetes.io/origin': 'k8s-playgrounds',
                },
              },
            },
          },
        },
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': 'application/strategic-merge-patch+json',
            'Accept': 'application/json, */*',
          },
        },
      )
    })

    it('should handle restart errors', async () => {
      const error = new Error('Restart failed')
      mockK8sApi.patchNamespacedDaemonSet.mockRejectedValue(error)

      await expect(service.Restart('default', 'test-daemonset')).rejects.toThrow('Restart failed')
    })

    it('should restart daemonset in kube-system namespace', async () => {
      const mockDaemonSet = createDaemonSet('kube-proxy', 'kube-system')
      mockK8sApi.patchNamespacedDaemonSet.mockResolvedValue({
        body: mockDaemonSet,
      })

      const result = await service.Restart('kube-system', 'kube-proxy')

      expect(result).toEqual(mockDaemonSet)
      expect(mockK8sApi.patchNamespacedDaemonSet).toHaveBeenCalledWith(
        'kube-proxy',
        'kube-system',
        expect.any(Object),
        expect.any(String),
        undefined,
        undefined,
        undefined,
        undefined,
        expect.any(Object),
      )
    })

    it('should handle not found errors on restart', async () => {
      const error = new Error('DaemonSet not found')
      mockK8sApi.patchNamespacedDaemonSet.mockRejectedValue(error)

      await expect(service.Restart('default', 'nonexistent')).rejects.toThrow('DaemonSet not found')
    })

    it('should restart node-exporter in monitoring namespace', async () => {
      const mockDaemonSet = createDaemonSet('node-exporter', 'monitoring')
      mockK8sApi.patchNamespacedDaemonSet.mockResolvedValue({
        body: mockDaemonSet,
      })

      const result = await service.Restart('monitoring', 'node-exporter')

      expect(result).toEqual(mockDaemonSet)
      expect(mockK8sApi.patchNamespacedDaemonSet).toHaveBeenCalledWith(
        'node-exporter',
        'monitoring',
        expect.any(Object),
        expect.any(String),
        undefined,
        undefined,
        undefined,
        undefined,
        expect.any(Object),
      )
    })

    it('should use strategic merge patch content type', async () => {
      const mockDaemonSet = createDaemonSet('test-daemonset', 'default')
      mockK8sApi.patchNamespacedDaemonSet.mockResolvedValue({
        body: mockDaemonSet,
      })

      await service.Restart('default', 'test-daemonset')

      const callArgs = mockK8sApi.patchNamespacedDaemonSet.mock.calls[0]
      const headers = callArgs[8]
      expect(headers.headers['Content-Type']).toBe('application/strategic-merge-patch+json')
      expect(headers.headers['Accept']).toBe('application/json, */*')
    })

    it('should handle permission errors on restart', async () => {
      const error = new Error('Forbidden: User cannot patch daemonsets')
      mockK8sApi.patchNamespacedDaemonSet.mockRejectedValue(error)

      await expect(service.Restart('default', 'test-daemonset')).rejects.toThrow('Forbidden')
    })

    it('should restart fluentd daemonset in logging namespace', async () => {
      const mockDaemonSet = createDaemonSet('fluentd', 'logging')
      mockK8sApi.patchNamespacedDaemonSet.mockResolvedValue({
        body: mockDaemonSet,
      })

      const result = await service.Restart('logging', 'fluentd')

      expect(result).toEqual(mockDaemonSet)
      expect(mockK8sApi.patchNamespacedDaemonSet).toHaveBeenCalledWith(
        'fluentd',
        'logging',
        expect.any(Object),
        expect.any(String),
        undefined,
        undefined,
        undefined,
        undefined,
        expect.any(Object),
      )
    })

    it('should add k8s-playgrounds origin annotation on restart', async () => {
      const mockDaemonSet = createDaemonSet('test-daemonset', 'default')
      mockK8sApi.patchNamespacedDaemonSet.mockResolvedValue({
        body: mockDaemonSet,
      })

      await service.Restart('default', 'test-daemonset')

      const callArgs = mockK8sApi.patchNamespacedDaemonSet.mock.calls[0]
      const patchBody = callArgs[2]
      expect(patchBody.spec.template.metadata.annotations['kubectl.kubernetes.io/origin']).toBe('k8s-playgrounds')
    })

    it('should handle invalid namespace on restart', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.patchNamespacedDaemonSet.mockRejectedValue(error)

      await expect(service.Restart('invalid-ns', 'test-daemonset')).rejects.toThrow('Namespace does not exist')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s API', async () => {
      const mockDaemonSets = [createDaemonSet('test-daemonset')]
      mockK8sApi.listDaemonSetForAllNamespaces.mockResolvedValue({
        body: { items: mockDaemonSets },
      })

      await service.List()

      expect(clientService.getAppsV1Api).toHaveBeenCalled()
    })

    it('should call getAppsV1Api for every operation', async () => {
      mockK8sApi.listDaemonSetForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedDaemonSet.mockResolvedValue({ body: createDaemonSet('test') })
      mockK8sApi.deleteNamespacedDaemonSet.mockResolvedValue({ body: { status: 'Success' } })
      mockK8sApi.patchNamespacedDaemonSet.mockResolvedValue({ body: createDaemonSet('test') })

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('default', 'test')
      await service.Restart('default', 'test')

      expect(clientService.getAppsV1Api).toHaveBeenCalledTimes(5)
    })

    it('should use AppsV1Api for all daemonset operations', async () => {
      const mockDaemonSet = createDaemonSet('test-daemonset', 'default')
      mockK8sApi.listDaemonSetForAllNamespaces.mockResolvedValue({ body: { items: [mockDaemonSet] } })
      mockK8sApi.readNamespacedDaemonSet.mockResolvedValue({ body: mockDaemonSet })
      mockK8sApi.deleteNamespacedDaemonSet.mockResolvedValue({ body: { status: 'Success' } })
      mockK8sApi.patchNamespacedDaemonSet.mockResolvedValue({ body: mockDaemonSet })

      await service.List()
      await service.GetOneByNsName('default', 'test-daemonset')
      await service.Delete('default', 'test-daemonset')
      await service.Restart('default', 'test-daemonset')

      expect(clientService.getAppsV1Api).toHaveBeenCalledTimes(5)
      expect(mockK8sApi.listDaemonSetForAllNamespaces).toHaveBeenCalledTimes(1)
      expect(mockK8sApi.readNamespacedDaemonSet).toHaveBeenCalledTimes(1)
      expect(mockK8sApi.deleteNamespacedDaemonSet).toHaveBeenCalledTimes(1)
      expect(mockK8sApi.patchNamespacedDaemonSet).toHaveBeenCalledTimes(1)
    })
  })
})
