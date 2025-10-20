
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockK8sService } from '../../../../test/utils/k8s-mocks'

import { ReplicaSetController } from './replicaset.controller'

describe('ReplicaSetController', () => {
  let controller: ReplicaSetController
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new ReplicaSetController(k8sService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all replicasets', async () => {
      const mockReplicaSets = { items: [] }
      vi.spyOn(k8sService.replicaSetService, 'List').mockResolvedValue(mockReplicaSets as any)

      const result = await controller.List()

      expect(result).toEqual(mockReplicaSets)
      expect(k8sService.replicaSetService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing replicasets', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.replicaSetService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })

    it('should return empty list when no replicasets exist', async () => {
      const mockReplicaSets = { items: [] }
      vi.spyOn(k8sService.replicaSetService, 'List').mockResolvedValue(mockReplicaSets as any)

      const result = await controller.List()

      expect(result).toEqual(mockReplicaSets)
      expect(result.items).toHaveLength(0)
    })

    it('should return multiple replicasets across namespaces', async () => {
      const mockReplicaSets = {
        items: [
          { metadata: { name: 'rs-1', namespace: 'default' } },
          { metadata: { name: 'rs-2', namespace: 'kube-system' } },
          { metadata: { name: 'rs-3', namespace: 'default' } },
        ],
      }
      vi.spyOn(k8sService.replicaSetService, 'List').mockResolvedValue(mockReplicaSets as any)

      const result = await controller.List()

      expect(result.items).toHaveLength(3)
      expect(k8sService.replicaSetService.List).toHaveBeenCalledWith()
    })
  })

  describe('ListByNs', () => {
    it('should return replicasets for a specific namespace', async () => {
      const mockReplicaSets = { items: [] }
      const namespace = 'default'
      vi.spyOn(k8sService.replicaSetService, 'List').mockResolvedValue(mockReplicaSets as any)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockReplicaSets)
      expect(k8sService.replicaSetService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      vi.spyOn(k8sService.replicaSetService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockReplicaSets = { items: [] }
      vi.spyOn(k8sService.replicaSetService, 'List').mockResolvedValue(mockReplicaSets as any)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockReplicaSets)
      expect(k8sService.replicaSetService.List).toHaveBeenCalledWith('')
    })

    it('should return replicasets from kube-system namespace', async () => {
      const mockReplicaSets = {
        items: [
          { metadata: { name: 'coredns-rs', namespace: 'kube-system' } },
        ],
      }
      vi.spyOn(k8sService.replicaSetService, 'List').mockResolvedValue(mockReplicaSets as any)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockReplicaSets)
      expect(result.items).toHaveLength(1)
      expect(k8sService.replicaSetService.List).toHaveBeenCalledWith('kube-system')
    })

    it('should handle namespace with special characters', async () => {
      const mockReplicaSets = { items: [] }
      vi.spyOn(k8sService.replicaSetService, 'List').mockResolvedValue(mockReplicaSets as any)

      const result = await controller.ListByNs('my-namespace-123')

      expect(result).toEqual(mockReplicaSets)
      expect(k8sService.replicaSetService.List).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should return only replicasets in specified namespace', async () => {
      const mockReplicaSets = {
        items: [
          { metadata: { name: 'rs-1', namespace: 'production' } },
          { metadata: { name: 'rs-2', namespace: 'production' } },
        ],
      }
      vi.spyOn(k8sService.replicaSetService, 'List').mockResolvedValue(mockReplicaSets as any)

      const result = await controller.ListByNs('production')

      expect(result.items).toHaveLength(2)
      expect(result.items.every((rs: any) => rs.metadata.namespace === 'production')).toBe(true)
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single replicaset', async () => {
      const mockReplicaSet = {
        metadata: { name: 'test-rs', namespace: 'default' },
        spec: { replicas: 3, selector: { matchLabels: { app: 'test' } } },
        status: { replicas: 3, readyReplicas: 3 },
      }
      vi.spyOn(k8sService.replicaSetService, 'GetOneByNsName').mockResolvedValue(mockReplicaSet as any)

      const result = await controller.GetOneByNsName('default', 'test-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(k8sService.replicaSetService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-rs')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.replicaSetService, 'GetOneByNsName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should handle special characters in replicaset name', async () => {
      const mockReplicaSet = { metadata: { name: 'test-rs-123', namespace: 'default' } }
      vi.spyOn(k8sService.replicaSetService, 'GetOneByNsName').mockResolvedValue(mockReplicaSet as any)

      const result = await controller.GetOneByNsName('default', 'test-rs-123')

      expect(result).toEqual(mockReplicaSet)
      expect(k8sService.replicaSetService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-rs-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockReplicaSet = { metadata: { name: 'test-rs', namespace: 'kube-system' } }
      vi.spyOn(k8sService.replicaSetService, 'GetOneByNsName').mockResolvedValue(mockReplicaSet as any)

      const result = await controller.GetOneByNsName('kube-system', 'test-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(k8sService.replicaSetService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-rs')
    })

    it('should return replicaset with zero replicas', async () => {
      const mockReplicaSet = {
        metadata: { name: 'scaled-down-rs', namespace: 'default' },
        spec: { replicas: 0 },
        status: { replicas: 0, readyReplicas: 0 },
      }
      vi.spyOn(k8sService.replicaSetService, 'GetOneByNsName').mockResolvedValue(mockReplicaSet as any)

      const result = await controller.GetOneByNsName('default', 'scaled-down-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(result.spec.replicas).toBe(0)
    })

    it('should return replicaset with high replica count', async () => {
      const mockReplicaSet = {
        metadata: { name: 'high-scale-rs', namespace: 'default' },
        spec: { replicas: 100 },
        status: { replicas: 100, readyReplicas: 95 },
      }
      vi.spyOn(k8sService.replicaSetService, 'GetOneByNsName').mockResolvedValue(mockReplicaSet as any)

      const result = await controller.GetOneByNsName('default', 'high-scale-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(result.spec.replicas).toBe(100)
    })

    it('should return replicaset with unready replicas', async () => {
      const mockReplicaSet = {
        metadata: { name: 'partial-rs', namespace: 'default' },
        spec: { replicas: 5 },
        status: { replicas: 5, readyReplicas: 3, availableReplicas: 3 },
      }
      vi.spyOn(k8sService.replicaSetService, 'GetOneByNsName').mockResolvedValue(mockReplicaSet as any)

      const result = await controller.GetOneByNsName('default', 'partial-rs')

      expect(result).toEqual(mockReplicaSet)
      expect(result.status.replicas).toBe(5)
      expect(result.status.readyReplicas).toBe(3)
    })

    it('should handle replicaset owned by deployment', async () => {
      const mockReplicaSet = {
        metadata: {
          name: 'my-deployment-abc123',
          namespace: 'default',
          ownerReferences: [{
            kind: 'Deployment',
            name: 'my-deployment',
            controller: true,
          }],
        },
        spec: { replicas: 3 },
      }
      vi.spyOn(k8sService.replicaSetService, 'GetOneByNsName').mockResolvedValue(mockReplicaSet as any)

      const result = await controller.GetOneByNsName('default', 'my-deployment-abc123')

      expect(result).toEqual(mockReplicaSet)
      expect(result.metadata.ownerReferences).toBeDefined()
    })
  })

  describe('Delete', () => {
    it('should delete a single replicaset', async () => {
      vi.spyOn(k8sService.replicaSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-rs']
      await controller.Delete(nsn)

      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledWith('test-rs', 'default')
    })

    it('should delete multiple replicasets', async () => {
      vi.spyOn(k8sService.replicaSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/rs1', 'kube-system/rs2', 'default/rs3']
      await controller.Delete(nsn)

      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledWith('rs1', 'default')
      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledWith('rs2', 'kube-system')
      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledWith('rs3', 'default')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.replicaSetService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.replicaSetService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.replicaSetService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/rs1', 'default/rs2', 'default/rs3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle replicasets with slashes in namespace/name format', async () => {
      vi.spyOn(k8sService.replicaSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-rs-name']
      await controller.Delete(nsn)

      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledWith('my-rs-name', 'my-namespace')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.replicaSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-rs']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should delete replicasets from multiple namespaces', async () => {
      vi.spyOn(k8sService.replicaSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = [
        'default/rs1',
        'production/rs2',
        'staging/rs3',
        'kube-system/rs4',
      ]
      await controller.Delete(nsn)

      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledTimes(4)
      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledWith('rs1', 'default')
      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledWith('rs2', 'production')
      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledWith('rs3', 'staging')
      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledWith('rs4', 'kube-system')
    })

    it('should handle deletion of replicaset with complex name', async () => {
      vi.spyOn(k8sService.replicaSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/my-deployment-1234567890-abcdef']
      await controller.Delete(nsn)

      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledWith('my-deployment-1234567890-abcdef', 'default')
    })

    it('should handle concurrent deletion requests', async () => {
      vi.spyOn(k8sService.replicaSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/rs1', 'default/rs2', 'default/rs3', 'default/rs4', 'default/rs5']
      await controller.Delete(nsn)

      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledTimes(5)
    })

    it('should handle deletion with partial failures', async () => {
      vi.spyOn(k8sService.replicaSetService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/rs1', 'default/rs2', 'default/rs3', 'default/rs4', 'default/rs5']

      await controller.Delete(nsn)

      expect(k8sService.replicaSetService.Delete).toHaveBeenCalledTimes(5)
    })
  })
})
