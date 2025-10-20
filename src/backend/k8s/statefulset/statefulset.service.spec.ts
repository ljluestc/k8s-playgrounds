import { vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import moment from 'moment/moment'
import { ClientService } from '../client/client.service'
import { createMockClientService, createStatefulSet } from '../../../../test/utils/k8s-mocks'
import { StatefulSetService } from './statefulset.service'

describe('StatefulSetService', () => {
  let service: StatefulSetService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getAppsV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: StatefulSetService,
          useFactory: (clientService: ClientService) => {
            return new StatefulSetService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<StatefulSetService>(StatefulSetService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all statefulsets across all namespaces when no namespace specified', async () => {
      const mockStatefulSets = [createStatefulSet('statefulset-1', 'default'), createStatefulSet('statefulset-2', 'kube-system')]
      mockK8sApi.listStatefulSetForAllNamespaces.mockResolvedValue({
        body: { items: mockStatefulSets },
      })

      const result = await service.List()

      expect(result).toEqual(mockStatefulSets)
      expect(mockK8sApi.listStatefulSetForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedStatefulSet).not.toHaveBeenCalled()
    })

    it('should list all statefulsets when namespace is "null" string', async () => {
      const mockStatefulSets = [createStatefulSet('statefulset-1')]
      mockK8sApi.listStatefulSetForAllNamespaces.mockResolvedValue({
        body: { items: mockStatefulSets },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockStatefulSets)
      expect(mockK8sApi.listStatefulSetForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedStatefulSet).not.toHaveBeenCalled()
    })

    it('should list statefulsets in a specific namespace', async () => {
      const mockStatefulSets = [createStatefulSet('statefulset-1', 'default')]
      mockK8sApi.listNamespacedStatefulSet.mockResolvedValue({
        body: { items: mockStatefulSets },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockStatefulSets)
      expect(mockK8sApi.listNamespacedStatefulSet).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listStatefulSetForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all statefulsets', async () => {
      const error = new Error('API Error')
      mockK8sApi.listStatefulSetForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced statefulsets', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedStatefulSet.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no statefulsets exist', async () => {
      mockK8sApi.listStatefulSetForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list statefulsets in kube-system namespace', async () => {
      const mockStatefulSets = [createStatefulSet('kube-dns', 'kube-system')]
      mockK8sApi.listNamespacedStatefulSet.mockResolvedValue({
        body: { items: mockStatefulSets },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockStatefulSets)
      expect(mockK8sApi.listNamespacedStatefulSet).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockStatefulSets = [createStatefulSet('my-statefulset', 'my-namespace-123')]
      mockK8sApi.listNamespacedStatefulSet.mockResolvedValue({
        body: { items: mockStatefulSets },
      })

      const result = await service.List('my-namespace-123')

      expect(result).toEqual(mockStatefulSets)
      expect(mockK8sApi.listNamespacedStatefulSet).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should list multiple statefulsets across different namespaces', async () => {
      const mockStatefulSets = [
        createStatefulSet('web-statefulset', 'default'),
        createStatefulSet('db-statefulset', 'production'),
        createStatefulSet('cache-statefulset', 'staging'),
      ]
      mockK8sApi.listStatefulSetForAllNamespaces.mockResolvedValue({
        body: { items: mockStatefulSets },
      })

      const result = await service.List()

      expect(result).toEqual(mockStatefulSets)
      expect(result.length).toBe(3)
    })

    it('should handle undefined namespace parameter', async () => {
      const mockStatefulSets = [createStatefulSet('statefulset-1')]
      mockK8sApi.listStatefulSetForAllNamespaces.mockResolvedValue({
        body: { items: mockStatefulSets },
      })

      const result = await service.List(undefined)

      expect(result).toEqual(mockStatefulSets)
      expect(mockK8sApi.listStatefulSetForAllNamespaces).toHaveBeenCalled()
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single statefulset by namespace and name', async () => {
      const mockStatefulSet = createStatefulSet('test-statefulset', 'default')
      mockK8sApi.readNamespacedStatefulSet.mockResolvedValue({
        body: mockStatefulSet,
      })

      const result = await service.GetOneByNsName('default', 'test-statefulset')

      expect(result).toEqual(mockStatefulSet)
      expect(mockK8sApi.readNamespacedStatefulSet).toHaveBeenCalledWith('test-statefulset', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('StatefulSet not found')
      mockK8sApi.readNamespacedStatefulSet.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('StatefulSet not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedStatefulSet.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-statefulset')).rejects.toThrow('Namespace does not exist')
    })

    it('should get statefulset with specific replicas', async () => {
      const mockStatefulSet = createStatefulSet('replica-statefulset', 'default')
      mockStatefulSet.spec!.replicas = 5
      mockK8sApi.readNamespacedStatefulSet.mockResolvedValue({
        body: mockStatefulSet,
      })

      const result = await service.GetOneByNsName('default', 'replica-statefulset')

      expect(result).toEqual(mockStatefulSet)
      expect(result.spec?.replicas).toBe(5)
    })

    it('should get statefulset with volumeClaimTemplates', async () => {
      const mockStatefulSet = createStatefulSet('pvc-statefulset', 'default')
      mockStatefulSet.spec!.volumeClaimTemplates = [
        {
          metadata: { name: 'data' },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: { requests: { storage: '10Gi' } },
          },
        } as any,
      ]
      mockK8sApi.readNamespacedStatefulSet.mockResolvedValue({
        body: mockStatefulSet,
      })

      const result = await service.GetOneByNsName('default', 'pvc-statefulset')

      expect(result).toEqual(mockStatefulSet)
      expect(result.spec?.volumeClaimTemplates).toHaveLength(1)
    })

    it('should handle statefulset names with hyphens and numbers', async () => {
      const mockStatefulSet = createStatefulSet('my-statefulset-123', 'default')
      mockK8sApi.readNamespacedStatefulSet.mockResolvedValue({
        body: mockStatefulSet,
      })

      const result = await service.GetOneByNsName('default', 'my-statefulset-123')

      expect(result).toEqual(mockStatefulSet)
      expect(mockK8sApi.readNamespacedStatefulSet).toHaveBeenCalledWith('my-statefulset-123', 'default')
    })

    it('should get statefulset from production namespace', async () => {
      const mockStatefulSet = createStatefulSet('db-statefulset', 'production')
      mockK8sApi.readNamespacedStatefulSet.mockResolvedValue({
        body: mockStatefulSet,
      })

      const result = await service.GetOneByNsName('production', 'db-statefulset')

      expect(result).toEqual(mockStatefulSet)
      expect(result.metadata?.namespace).toBe('production')
    })

    it('should get statefulset with status information', async () => {
      const mockStatefulSet = createStatefulSet('status-statefulset', 'default')
      mockStatefulSet.status = {
        replicas: 3,
        readyReplicas: 3,
        currentReplicas: 3,
        updatedReplicas: 3,
        currentRevision: 'status-statefulset-abc123',
        updateRevision: 'status-statefulset-abc123',
      }
      mockK8sApi.readNamespacedStatefulSet.mockResolvedValue({
        body: mockStatefulSet,
      })

      const result = await service.GetOneByNsName('default', 'status-statefulset')

      expect(result).toEqual(mockStatefulSet)
      expect(result.status?.replicas).toBe(3)
      expect(result.status?.readyReplicas).toBe(3)
    })
  })

  describe('Delete', () => {
    it('should delete a statefulset', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedStatefulSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-statefulset', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedStatefulSet).toHaveBeenCalledWith('test-statefulset', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedStatefulSet.mockRejectedValue(error)

      await expect(service.Delete('test-statefulset', 'default')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent statefulset', async () => {
      const error = new Error('StatefulSet not found')
      mockK8sApi.deleteNamespacedStatefulSet.mockRejectedValue(error)

      await expect(service.Delete('nonexistent', 'default')).rejects.toThrow('StatefulSet not found')
    })

    it('should delete statefulset from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedStatefulSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-statefulset', 'kube-system')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedStatefulSet).toHaveBeenCalledWith('my-statefulset', 'kube-system')
    })

    it('should handle statefulset with finalizers', async () => {
      const mockResponse = { status: 'Success', metadata: { finalizers: ['kubernetes'] } }
      mockK8sApi.deleteNamespacedStatefulSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('statefulset-with-finalizer', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNamespacedStatefulSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete statefulsets')
      mockK8sApi.deleteNamespacedStatefulSet.mockRejectedValue(error)

      await expect(service.Delete('test-statefulset', 'default')).rejects.toThrow('Forbidden')
    })

    it('should delete statefulset from production namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedStatefulSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('db-statefulset', 'production')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedStatefulSet).toHaveBeenCalledWith('db-statefulset', 'production')
    })

    it('should handle cascade deletion', async () => {
      const mockResponse = {
        status: 'Success',
        metadata: {
          name: 'test-statefulset',
          deletionGracePeriodSeconds: 30,
        },
      }
      mockK8sApi.deleteNamespacedStatefulSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-statefulset', 'default')

      expect(result).toEqual(mockResponse)
    })
  })

  describe('Scale', () => {
    it('should scale a statefulset to specified replicas', async () => {
      const mockScaledStatefulSet = {
        spec: { replicas: 5 },
        metadata: { name: 'test-statefulset', namespace: 'default' },
      }
      mockK8sApi.patchNamespacedStatefulSetScale.mockResolvedValue({
        body: mockScaledStatefulSet,
      })

      const result = await service.Scale('default', 'test-statefulset', 5)

      expect(result).toEqual(mockScaledStatefulSet)
      expect(mockK8sApi.patchNamespacedStatefulSetScale).toHaveBeenCalledWith(
        'test-statefulset',
        'default',
        { spec: { replicas: 5 } },
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': 'application/merge-patch+json',
            'Accept': 'application/json, */*',
          },
        },
      )
    })

    it('should scale down to zero replicas', async () => {
      const mockScaledStatefulSet = {
        spec: { replicas: 0 },
        metadata: { name: 'test-statefulset', namespace: 'default' },
      }
      mockK8sApi.patchNamespacedStatefulSetScale.mockResolvedValue({
        body: mockScaledStatefulSet,
      })

      const result = await service.Scale('default', 'test-statefulset', 0)

      expect(result).toEqual(mockScaledStatefulSet)
      expect(mockK8sApi.patchNamespacedStatefulSetScale).toHaveBeenCalledWith(
        'test-statefulset',
        'default',
        { spec: { replicas: 0 } },
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/merge-patch+json',
          }),
        }),
      )
    })

    it('should scale up to large number of replicas', async () => {
      const mockScaledStatefulSet = {
        spec: { replicas: 100 },
        metadata: { name: 'test-statefulset', namespace: 'default' },
      }
      mockK8sApi.patchNamespacedStatefulSetScale.mockResolvedValue({
        body: mockScaledStatefulSet,
      })

      const result = await service.Scale('default', 'test-statefulset', 100)

      expect(result).toEqual(mockScaledStatefulSet)
      expect(mockK8sApi.patchNamespacedStatefulSetScale).toHaveBeenCalledWith(
        'test-statefulset',
        'default',
        { spec: { replicas: 100 } },
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        expect.any(Object),
      )
    })

    it('should handle scaling errors', async () => {
      const error = new Error('Scaling failed')
      mockK8sApi.patchNamespacedStatefulSetScale.mockRejectedValue(error)

      await expect(service.Scale('default', 'test-statefulset', 5)).rejects.toThrow('Scaling failed')
    })

    it('should handle not found errors when scaling', async () => {
      const error = new Error('StatefulSet not found')
      mockK8sApi.patchNamespacedStatefulSetScale.mockRejectedValue(error)

      await expect(service.Scale('default', 'nonexistent', 3)).rejects.toThrow('StatefulSet not found')
    })

    it('should scale statefulset in production namespace', async () => {
      const mockScaledStatefulSet = {
        spec: { replicas: 10 },
        metadata: { name: 'db-statefulset', namespace: 'production' },
      }
      mockK8sApi.patchNamespacedStatefulSetScale.mockResolvedValue({
        body: mockScaledStatefulSet,
      })

      const result = await service.Scale('production', 'db-statefulset', 10)

      expect(result).toEqual(mockScaledStatefulSet)
      expect(mockK8sApi.patchNamespacedStatefulSetScale).toHaveBeenCalledWith(
        'db-statefulset',
        'production',
        { spec: { replicas: 10 } },
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        expect.any(Object),
      )
    })

    it('should convert string replicas to number', async () => {
      const mockScaledStatefulSet = {
        spec: { replicas: 7 },
        metadata: { name: 'test-statefulset', namespace: 'default' },
      }
      mockK8sApi.patchNamespacedStatefulSetScale.mockResolvedValue({
        body: mockScaledStatefulSet,
      })

      const result = await service.Scale('default', 'test-statefulset', '7' as any)

      expect(result).toEqual(mockScaledStatefulSet)
      expect(mockK8sApi.patchNamespacedStatefulSetScale).toHaveBeenCalledWith(
        'test-statefulset',
        'default',
        { spec: { replicas: 7 } },
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        expect.any(Object),
      )
    })

    it('should use correct Content-Type header for merge-patch', async () => {
      const mockScaledStatefulSet = { spec: { replicas: 3 } }
      mockK8sApi.patchNamespacedStatefulSetScale.mockResolvedValue({
        body: mockScaledStatefulSet,
      })

      await service.Scale('default', 'test-statefulset', 3)

      const callArgs = mockK8sApi.patchNamespacedStatefulSetScale.mock.calls[0]
      const headers = callArgs[8].headers

      expect(headers['Content-Type']).toBe('application/merge-patch+json')
      expect(headers['Accept']).toBe('application/json, */*')
    })

    it('should handle permission errors when scaling', async () => {
      const error = new Error('Forbidden: User cannot patch statefulsets/scale')
      mockK8sApi.patchNamespacedStatefulSetScale.mockRejectedValue(error)

      await expect(service.Scale('default', 'test-statefulset', 5)).rejects.toThrow('Forbidden')
    })
  })

  describe('Restart', () => {
    beforeEach(() => {
      vi.spyOn(moment, 'now' as any).mockReturnValue('2024-01-15T10:30:00Z')
    })

    it('should restart a statefulset', async () => {
      const mockRestartedStatefulSet = {
        metadata: { name: 'test-statefulset', namespace: 'default' },
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
      }
      mockK8sApi.patchNamespacedStatefulSet.mockResolvedValue({
        body: mockRestartedStatefulSet,
      })

      const result = await service.Restart('default', 'test-statefulset')

      expect(result).toEqual(mockRestartedStatefulSet)
      expect(mockK8sApi.patchNamespacedStatefulSet).toHaveBeenCalledWith(
        'test-statefulset',
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
      mockK8sApi.patchNamespacedStatefulSet.mockRejectedValue(error)

      await expect(service.Restart('default', 'test-statefulset')).rejects.toThrow('Restart failed')
    })

    it('should restart statefulset in custom namespace', async () => {
      const mockRestartedStatefulSet = {
        metadata: { name: 'db-statefulset', namespace: 'production' },
      }
      mockK8sApi.patchNamespacedStatefulSet.mockResolvedValue({
        body: mockRestartedStatefulSet,
      })

      const result = await service.Restart('production', 'db-statefulset')

      expect(result).toEqual(mockRestartedStatefulSet)
      expect(mockK8sApi.patchNamespacedStatefulSet).toHaveBeenCalledWith(
        'db-statefulset',
        'production',
        expect.any(Object),
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        expect.any(Object),
      )
    })

    it('should handle not found errors when restarting', async () => {
      const error = new Error('StatefulSet not found')
      mockK8sApi.patchNamespacedStatefulSet.mockRejectedValue(error)

      await expect(service.Restart('default', 'nonexistent')).rejects.toThrow('StatefulSet not found')
    })

    it('should use correct Content-Type header for strategic-merge-patch', async () => {
      const mockRestartedStatefulSet = { metadata: { name: 'test-statefulset' } }
      mockK8sApi.patchNamespacedStatefulSet.mockResolvedValue({
        body: mockRestartedStatefulSet,
      })

      await service.Restart('default', 'test-statefulset')

      const callArgs = mockK8sApi.patchNamespacedStatefulSet.mock.calls[0]
      const headers = callArgs[8].headers

      expect(headers['Content-Type']).toBe('application/strategic-merge-patch+json')
      expect(headers['Accept']).toBe('application/json, */*')
    })

    it('should include origin annotation in restart', async () => {
      const mockRestartedStatefulSet = { metadata: { name: 'test-statefulset' } }
      mockK8sApi.patchNamespacedStatefulSet.mockResolvedValue({
        body: mockRestartedStatefulSet,
      })

      await service.Restart('default', 'test-statefulset')

      const callArgs = mockK8sApi.patchNamespacedStatefulSet.mock.calls[0]
      const patch = callArgs[2]

      expect(patch.spec.template.metadata.annotations['kubectl.kubernetes.io/origin']).toBe('k8s-playgrounds')
    })

    it('should include restartedAt timestamp in restart', async () => {
      const mockRestartedStatefulSet = { metadata: { name: 'test-statefulset' } }
      mockK8sApi.patchNamespacedStatefulSet.mockResolvedValue({
        body: mockRestartedStatefulSet,
      })

      await service.Restart('default', 'test-statefulset')

      const callArgs = mockK8sApi.patchNamespacedStatefulSet.mock.calls[0]
      const patch = callArgs[2]

      expect(patch.spec.template.metadata.annotations['kubectl.kubernetes.io/restartedAt']).toBeDefined()
    })

    it('should handle permission errors when restarting', async () => {
      const error = new Error('Forbidden: User cannot patch statefulsets')
      mockK8sApi.patchNamespacedStatefulSet.mockRejectedValue(error)

      await expect(service.Restart('default', 'test-statefulset')).rejects.toThrow('Forbidden')
    })

    it('should handle API server errors during restart', async () => {
      const error = new Error('API server unavailable')
      mockK8sApi.patchNamespacedStatefulSet.mockRejectedValue(error)

      await expect(service.Restart('default', 'test-statefulset')).rejects.toThrow('API server unavailable')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s API', async () => {
      const mockStatefulSets = [createStatefulSet('test-statefulset')]
      mockK8sApi.listStatefulSetForAllNamespaces.mockResolvedValue({
        body: { items: mockStatefulSets },
      })

      await service.List()

      expect(clientService.getAppsV1Api).toHaveBeenCalled()
    })

    it('should call getAppsV1Api for every operation', async () => {
      mockK8sApi.listStatefulSetForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedStatefulSet.mockResolvedValue({ body: createStatefulSet('test') })
      mockK8sApi.deleteNamespacedStatefulSet.mockResolvedValue({ body: { status: 'Success' } })
      mockK8sApi.patchNamespacedStatefulSetScale.mockResolvedValue({ body: { spec: { replicas: 3 } } })
      mockK8sApi.patchNamespacedStatefulSet.mockResolvedValue({ body: { metadata: { name: 'test' } } })

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('test', 'default')
      await service.Scale('default', 'test', 3)
      await service.Restart('default', 'test')

      expect(clientService.getAppsV1Api).toHaveBeenCalledTimes(6)
    })

    it('should use AppsV1Api for all statefulset operations', async () => {
      mockK8sApi.listNamespacedStatefulSet.mockResolvedValue({ body: { items: [] } })

      await service.List('default')

      expect(clientService.getAppsV1Api).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedStatefulSet).toHaveBeenCalledWith('default')
    })
  })

  describe('Edge Cases', () => {
    it('should handle statefulsets with zero replicas', async () => {
      const mockStatefulSet = createStatefulSet('zero-replica-statefulset', 'default')
      mockStatefulSet.spec!.replicas = 0
      mockK8sApi.readNamespacedStatefulSet.mockResolvedValue({
        body: mockStatefulSet,
      })

      const result = await service.GetOneByNsName('default', 'zero-replica-statefulset')

      expect(result.spec?.replicas).toBe(0)
    })

    it('should handle statefulsets with long names', async () => {
      const longName = 'this-is-a-very-long-statefulset-name-that-is-still-valid-in-kubernetes-123'
      const mockStatefulSet = createStatefulSet(longName, 'default')
      mockK8sApi.readNamespacedStatefulSet.mockResolvedValue({
        body: mockStatefulSet,
      })

      const result = await service.GetOneByNsName('default', longName)

      expect(result.metadata?.name).toBe(longName)
    })

    it('should handle concurrent list operations', async () => {
      const mockStatefulSets1 = [createStatefulSet('statefulset-1', 'default')]
      const mockStatefulSets2 = [createStatefulSet('statefulset-2', 'production')]

      mockK8sApi.listNamespacedStatefulSet
        .mockResolvedValueOnce({ body: { items: mockStatefulSets1 } })
        .mockResolvedValueOnce({ body: { items: mockStatefulSets2 } })

      const [result1, result2] = await Promise.all([
        service.List('default'),
        service.List('production'),
      ])

      expect(result1).toEqual(mockStatefulSets1)
      expect(result2).toEqual(mockStatefulSets2)
    })

    it('should handle statefulsets with updateStrategy', async () => {
      const mockStatefulSet = createStatefulSet('rolling-update-statefulset', 'default')
      mockStatefulSet.spec!.updateStrategy = {
        type: 'RollingUpdate',
        rollingUpdate: { partition: 0 },
      }
      mockK8sApi.readNamespacedStatefulSet.mockResolvedValue({
        body: mockStatefulSet,
      })

      const result = await service.GetOneByNsName('default', 'rolling-update-statefulset')

      expect(result.spec?.updateStrategy?.type).toBe('RollingUpdate')
    })

    it('should handle statefulsets with podManagementPolicy', async () => {
      const mockStatefulSet = createStatefulSet('parallel-statefulset', 'default')
      mockStatefulSet.spec!.podManagementPolicy = 'Parallel'
      mockK8sApi.readNamespacedStatefulSet.mockResolvedValue({
        body: mockStatefulSet,
      })

      const result = await service.GetOneByNsName('default', 'parallel-statefulset')

      expect(result.spec?.podManagementPolicy).toBe('Parallel')
    })
  })
})
