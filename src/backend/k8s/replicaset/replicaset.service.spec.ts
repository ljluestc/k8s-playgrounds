import { _vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createMockClientService, createReplicaSet } from '../../../../test/utils/k8s-mocks'
import { ReplicaSetService } from './replicaset.service'

describe('ReplicaSetService', () => {
  let service: ReplicaSetService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getAppsV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ReplicaSetService,
          useFactory: (clientService: ClientService) => {
            return new ReplicaSetService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<ReplicaSetService>(ReplicaSetService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all replicasets across all namespaces when no namespace specified', async () => {
      const mockReplicaSets = [createReplicaSet('rs-1', 'default'), createReplicaSet('rs-2', 'kube-system')]
      mockK8sApi.listReplicaSetForAllNamespaces.mockResolvedValue({
        body: { items: mockReplicaSets },
      })

      const result = await service.List()

      expect(result).toEqual(mockReplicaSets)
      expect(mockK8sApi.listReplicaSetForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedReplicaSet).not.toHaveBeenCalled()
    })

    it('should list all replicasets when namespace is "null" string', async () => {
      const mockReplicaSets = [createReplicaSet('rs-1')]
      mockK8sApi.listReplicaSetForAllNamespaces.mockResolvedValue({
        body: { items: mockReplicaSets },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockReplicaSets)
      expect(mockK8sApi.listReplicaSetForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedReplicaSet).not.toHaveBeenCalled()
    })

    it('should list replicasets in a specific namespace', async () => {
      const mockReplicaSets = [createReplicaSet('rs-1', 'default')]
      mockK8sApi.listNamespacedReplicaSet.mockResolvedValue({
        body: { items: mockReplicaSets },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockReplicaSets)
      expect(mockK8sApi.listNamespacedReplicaSet).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listReplicaSetForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all replicasets', async () => {
      const error = new Error('API Error')
      mockK8sApi.listReplicaSetForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced replicasets', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedReplicaSet.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no replicasets exist', async () => {
      mockK8sApi.listReplicaSetForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list replicasets in kube-system namespace', async () => {
      const mockReplicaSets = [createReplicaSet('coredns-rs', 'kube-system')]
      mockK8sApi.listNamespacedReplicaSet.mockResolvedValue({
        body: { items: mockReplicaSets },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockReplicaSets)
      expect(mockK8sApi.listNamespacedReplicaSet).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockReplicaSets = [createReplicaSet('my-rs', 'my-namespace-123')]
      mockK8sApi.listNamespacedReplicaSet.mockResolvedValue({
        body: { items: mockReplicaSets },
      })

      const result = await service.List('my-namespace-123')

      expect(result).toEqual(mockReplicaSets)
      expect(mockK8sApi.listNamespacedReplicaSet).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should list replicasets with various replica counts', async () => {
      const rs1 = createReplicaSet('rs-1', 'default')
      rs1.spec!.replicas = 0
      const rs2 = createReplicaSet('rs-2', 'default')
      rs2.spec!.replicas = 5
      const rs3 = createReplicaSet('rs-3', 'default')
      rs3.spec!.replicas = 100

      const mockReplicaSets = [rs1, rs2, rs3]
      mockK8sApi.listNamespacedReplicaSet.mockResolvedValue({
        body: { items: mockReplicaSets },
      })

      const result = await service.List('default')

      expect(result).toHaveLength(3)
      expect(result[0].spec?.replicas).toBe(0)
      expect(result[1].spec?.replicas).toBe(5)
      expect(result[2].spec?.replicas).toBe(100)
    })

    it('should list replicasets with different statuses', async () => {
      const rs1 = createReplicaSet('rs-1', 'default')
      rs1.status = { replicas: 3, readyReplicas: 3, availableReplicas: 3 }

      const rs2 = createReplicaSet('rs-2', 'default')
      rs2.status = { replicas: 5, readyReplicas: 2, availableReplicas: 2 }

      const mockReplicaSets = [rs1, rs2]
      mockK8sApi.listReplicaSetForAllNamespaces.mockResolvedValue({
        body: { items: mockReplicaSets },
      })

      const result = await service.List()

      expect(result).toHaveLength(2)
      expect(result[0].status?.readyReplicas).toBe(3)
      expect(result[1].status?.readyReplicas).toBe(2)
    })

    it('should handle undefined namespace parameter', async () => {
      const mockReplicaSets = [createReplicaSet('rs-1')]
      mockK8sApi.listReplicaSetForAllNamespaces.mockResolvedValue({
        body: { items: mockReplicaSets },
      })

      const result = await service.List(undefined)

      expect(result).toEqual(mockReplicaSets)
      expect(mockK8sApi.listReplicaSetForAllNamespaces).toHaveBeenCalled()
    })

    it('should list replicasets owned by deployments', async () => {
      const rs = createReplicaSet('my-deployment-abc123', 'default')
      rs.metadata!.ownerReferences = [{
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'my-deployment',
        uid: 'deployment-uid',
        controller: true,
      }]

      mockK8sApi.listNamespacedReplicaSet.mockResolvedValue({
        body: { items: [rs] },
      })

      const result = await service.List('default')

      expect(result).toHaveLength(1)
      expect(result[0].metadata?.ownerReferences).toBeDefined()
      expect(result[0].metadata?.ownerReferences?.[0].kind).toBe('Deployment')
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single replicaset by namespace and name', async () => {
      const mockReplicaSet = createReplicaSet('test-rs', 'default')
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'test-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(mockK8sApi.readNamespacedReplicaSet).toHaveBeenCalledWith('test-rs', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('ReplicaSet not found')
      mockK8sApi.readNamespacedReplicaSet.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('ReplicaSet not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedReplicaSet.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-rs')).rejects.toThrow('Namespace does not exist')
    })

    it('should get replicaset with zero replicas', async () => {
      const mockReplicaSet = createReplicaSet('scaled-down-rs', 'default')
      mockReplicaSet.spec!.replicas = 0
      mockReplicaSet.status = { replicas: 0, readyReplicas: 0, availableReplicas: 0 }
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'scaled-down-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(result.spec?.replicas).toBe(0)
      expect(result.status?.replicas).toBe(0)
    })

    it('should get replicaset with high replica count', async () => {
      const mockReplicaSet = createReplicaSet('high-scale-rs', 'default')
      mockReplicaSet.spec!.replicas = 100
      mockReplicaSet.status = { replicas: 100, readyReplicas: 100, availableReplicas: 100 }
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'high-scale-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(result.spec?.replicas).toBe(100)
      expect(result.status?.replicas).toBe(100)
    })

    it('should get replicaset with partially ready replicas', async () => {
      const mockReplicaSet = createReplicaSet('partial-rs', 'default')
      mockReplicaSet.spec!.replicas = 5
      mockReplicaSet.status = { replicas: 5, readyReplicas: 3, availableReplicas: 3 }
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'partial-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(result.spec?.replicas).toBe(5)
      expect(result.status?.readyReplicas).toBe(3)
    })

    it('should handle replicaset names with hyphens and numbers', async () => {
      const mockReplicaSet = createReplicaSet('my-rs-123', 'default')
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'my-rs-123')

      expect(result).toEqual(mockReplicaSet)
      expect(mockK8sApi.readNamespacedReplicaSet).toHaveBeenCalledWith('my-rs-123', 'default')
    })

    it('should get replicaset owned by deployment', async () => {
      const mockReplicaSet = createReplicaSet('my-deployment-abc123', 'default')
      mockReplicaSet.metadata!.ownerReferences = [{
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'my-deployment',
        uid: 'deployment-uid',
        controller: true,
      }]
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'my-deployment-abc123')

      expect(result).toEqual(mockReplicaSet)
      expect(result.metadata?.ownerReferences).toBeDefined()
      expect(result.metadata?.ownerReferences?.[0].kind).toBe('Deployment')
    })

    it('should get replicaset from production namespace', async () => {
      const mockReplicaSet = createReplicaSet('prod-rs', 'production')
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('production', 'prod-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(result.metadata?.namespace).toBe('production')
    })

    it('should get replicaset with complex selector', async () => {
      const mockReplicaSet = createReplicaSet('complex-rs', 'default')
      mockReplicaSet.spec!.selector = {
        matchLabels: {
          app: 'myapp',
          tier: 'frontend',
          version: 'v2',
        },
      }
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'complex-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(result.spec?.selector?.matchLabels).toHaveProperty('app', 'myapp')
      expect(result.spec?.selector?.matchLabels).toHaveProperty('tier', 'frontend')
    })

    it('should get replicaset with scaling in progress', async () => {
      const mockReplicaSet = createReplicaSet('scaling-rs', 'default')
      mockReplicaSet.spec!.replicas = 10
      mockReplicaSet.status = { replicas: 7, readyReplicas: 5, availableReplicas: 5 }
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'scaling-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(result.spec?.replicas).toBeGreaterThan(result.status?.replicas || 0)
    })

    it('should handle API errors with proper error messages', async () => {
      const error = new Error('Internal server error')
      mockK8sApi.readNamespacedReplicaSet.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'test-rs')).rejects.toThrow('Internal server error')
    })
  })

  describe('Delete', () => {
    it('should delete a replicaset', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedReplicaSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-rs', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedReplicaSet).toHaveBeenCalledWith('test-rs', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedReplicaSet.mockRejectedValue(error)

      await expect(service.Delete('test-rs', 'default')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent replicaset', async () => {
      const error = new Error('ReplicaSet not found')
      mockK8sApi.deleteNamespacedReplicaSet.mockRejectedValue(error)

      await expect(service.Delete('nonexistent', 'default')).rejects.toThrow('ReplicaSet not found')
    })

    it('should delete replicaset from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedReplicaSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-rs', 'kube-system')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedReplicaSet).toHaveBeenCalledWith('my-rs', 'kube-system')
    })

    it('should handle replicaset with finalizers', async () => {
      const mockResponse = { status: 'Success', metadata: { finalizers: ['kubernetes'] } }
      mockK8sApi.deleteNamespacedReplicaSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('rs-with-finalizer', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNamespacedReplicaSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete replicasets')
      mockK8sApi.deleteNamespacedReplicaSet.mockRejectedValue(error)

      await expect(service.Delete('test-rs', 'default')).rejects.toThrow('Forbidden')
    })

    it('should delete replicaset from production namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedReplicaSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('prod-rs', 'production')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedReplicaSet).toHaveBeenCalledWith('prod-rs', 'production')
    })

    it('should handle deletion of replicaset owned by deployment', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedReplicaSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-deployment-abc123', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedReplicaSet).toHaveBeenCalledWith('my-deployment-abc123', 'default')
    })

    it('should handle concurrent deletion attempts', async () => {
      const error = new Error('Conflict: ReplicaSet is being deleted')
      mockK8sApi.deleteNamespacedReplicaSet.mockRejectedValue(error)

      await expect(service.Delete('deleting-rs', 'default')).rejects.toThrow('Conflict')
    })

    it('should delete replicaset with complex name', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedReplicaSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-app-v2-1234567890-abcdef', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedReplicaSet).toHaveBeenCalledWith('my-app-v2-1234567890-abcdef', 'default')
    })

    it('should handle network errors during deletion', async () => {
      const error = new Error('Network timeout')
      mockK8sApi.deleteNamespacedReplicaSet.mockRejectedValue(error)

      await expect(service.Delete('test-rs', 'default')).rejects.toThrow('Network timeout')
    })

    it('should handle deletion of scaled-down replicaset', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedReplicaSet.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('scaled-down-rs', 'default')

      expect(result).toEqual(mockResponse)
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s API', async () => {
      const mockReplicaSets = [createReplicaSet('test-rs')]
      mockK8sApi.listReplicaSetForAllNamespaces.mockResolvedValue({
        body: { items: mockReplicaSets },
      })

      await service.List()

      expect(clientService.getAppsV1Api).toHaveBeenCalled()
    })

    it('should call getAppsV1Api for every operation', async () => {
      mockK8sApi.listReplicaSetForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({ body: createReplicaSet('test') })
      mockK8sApi.deleteNamespacedReplicaSet.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('test', 'default')

      expect(clientService.getAppsV1Api).toHaveBeenCalledTimes(4)
    })

    it('should use AppsV1Api for all replicaset operations', async () => {
      mockK8sApi.listNamespacedReplicaSet.mockResolvedValue({ body: { items: [] } })

      await service.List('default')

      expect(clientService.getAppsV1Api).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedReplicaSet).toHaveBeenCalledWith('default')
    })
  })

  describe('Edge Cases', () => {
    it('should handle replicaset with no status', async () => {
      const mockReplicaSet = createReplicaSet('no-status-rs', 'default')
      delete mockReplicaSet.status
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'no-status-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(result.status).toBeUndefined()
    })

    it('should handle replicaset with missing replica counts in status', async () => {
      const mockReplicaSet = createReplicaSet('incomplete-status-rs', 'default')
      mockReplicaSet.status = { replicas: 5 }
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'incomplete-status-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(result.status?.replicas).toBe(5)
      expect(result.status?.readyReplicas).toBeUndefined()
    })

    it('should list replicasets when some have errors in status', async () => {
      const rs1 = createReplicaSet('rs-1', 'default')
      const rs2 = createReplicaSet('rs-2', 'default')
      rs2.status = { replicas: 0, readyReplicas: 0, conditions: [{ type: 'ReplicaFailure', status: 'True' } as any] }

      mockK8sApi.listNamespacedReplicaSet.mockResolvedValue({
        body: { items: [rs1, rs2] },
      })

      const result = await service.List('default')

      expect(result).toHaveLength(2)
    })

    it('should handle very long replicaset names', async () => {
      const longName = 'a'.repeat(253)
      const mockReplicaSet = createReplicaSet(longName, 'default')
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', longName)

      expect(result).toEqual(mockReplicaSet)
      expect(mockK8sApi.readNamespacedReplicaSet).toHaveBeenCalledWith(longName, 'default')
    })

    it('should handle replicaset with annotations', async () => {
      const mockReplicaSet = createReplicaSet('annotated-rs', 'default')
      mockReplicaSet.metadata!.annotations = {
        'deployment.kubernetes.io/revision': '3',
        'custom-annotation': 'value',
      }
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'annotated-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(result.metadata?.annotations).toBeDefined()
    })

    it('should handle replicaset with multiple owner references', async () => {
      const mockReplicaSet = createReplicaSet('multi-owner-rs', 'default')
      mockReplicaSet.metadata!.ownerReferences = [
        { apiVersion: 'apps/v1', kind: 'Deployment', name: 'deployment-1', uid: 'uid-1' },
        { apiVersion: 'apps/v1', kind: 'Deployment', name: 'deployment-2', uid: 'uid-2' },
      ]
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'multi-owner-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(result.metadata?.ownerReferences).toHaveLength(2)
    })
  })

  describe('Scaling Scenarios', () => {
    it('should handle replicaset being scaled up', async () => {
      const mockReplicaSet = createReplicaSet('scaling-up-rs', 'default')
      mockReplicaSet.spec!.replicas = 10
      mockReplicaSet.status = { replicas: 5, readyReplicas: 5, availableReplicas: 5 }
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'scaling-up-rs')

      expect(result.spec?.replicas).toBe(10)
      expect(result.status?.replicas).toBe(5)
    })

    it('should handle replicaset being scaled down', async () => {
      const mockReplicaSet = createReplicaSet('scaling-down-rs', 'default')
      mockReplicaSet.spec!.replicas = 2
      mockReplicaSet.status = { replicas: 5, readyReplicas: 5, availableReplicas: 5 }
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'scaling-down-rs')

      expect(result.spec?.replicas).toBe(2)
      expect(result.status?.replicas).toBe(5)
    })

    it('should handle replicaset scaled to zero', async () => {
      const mockReplicaSet = createReplicaSet('zero-replica-rs', 'default')
      mockReplicaSet.spec!.replicas = 0
      mockReplicaSet.status = { replicas: 0, readyReplicas: 0, availableReplicas: 0 }
      mockK8sApi.readNamespacedReplicaSet.mockResolvedValue({
        body: mockReplicaSet,
      })

      const result = await service.GetOneByNsName('default', 'zero-replica-rs')

      expect(result.spec?.replicas).toBe(0)
      expect(result.status?.replicas).toBe(0)
    })

    it('should list replicasets with various scaling states', async () => {
      const rs1 = createReplicaSet('stable-rs', 'default')
      rs1.spec!.replicas = 3
      rs1.status = { replicas: 3, readyReplicas: 3 }

      const rs2 = createReplicaSet('scaling-up-rs', 'default')
      rs2.spec!.replicas = 10
      rs2.status = { replicas: 5, readyReplicas: 5 }

      const rs3 = createReplicaSet('scaled-down-rs', 'default')
      rs3.spec!.replicas = 0
      rs3.status = { replicas: 0, readyReplicas: 0 }

      mockK8sApi.listNamespacedReplicaSet.mockResolvedValue({
        body: { items: [rs1, rs2, rs3] },
      })

      const result = await service.List('default')

      expect(result).toHaveLength(3)
      expect(result[0].spec?.replicas).toBe(3)
      expect(result[1].spec?.replicas).toBe(10)
      expect(result[2].spec?.replicas).toBe(0)
    })
  })
})
