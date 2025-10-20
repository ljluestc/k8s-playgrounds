
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockK8sService } from '../../../../test/utils/k8s-mocks'

import { StatefulSetController } from './statefulset.controller'

describe('StatefulSetController', () => {
  let controller: StatefulSetController
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new StatefulSetController(k8sService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all statefulsets', async () => {
      const mockStatefulSets = { items: [] }
      vi.spyOn(k8sService.statefulSetService, 'List').mockResolvedValue(mockStatefulSets as any)

      const result = await controller.List()

      expect(result).toEqual(mockStatefulSets)
      expect(k8sService.statefulSetService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing statefulsets', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.statefulSetService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })
  })

  describe('ListByNs', () => {
    it('should return statefulsets for a specific namespace', async () => {
      const mockStatefulSets = { items: [] }
      const namespace = 'default'
      vi.spyOn(k8sService.statefulSetService, 'List').mockResolvedValue(mockStatefulSets as any)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockStatefulSets)
      expect(k8sService.statefulSetService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      vi.spyOn(k8sService.statefulSetService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockStatefulSets = { items: [] }
      vi.spyOn(k8sService.statefulSetService, 'List').mockResolvedValue(mockStatefulSets as any)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockStatefulSets)
      expect(k8sService.statefulSetService.List).toHaveBeenCalledWith('')
    })

    it('should list statefulsets in kube-system namespace', async () => {
      const mockStatefulSets = { items: [] }
      vi.spyOn(k8sService.statefulSetService, 'List').mockResolvedValue(mockStatefulSets as any)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockStatefulSets)
      expect(k8sService.statefulSetService.List).toHaveBeenCalledWith('kube-system')
    })

    it('should list statefulsets in custom namespace', async () => {
      const mockStatefulSets = { items: [] }
      vi.spyOn(k8sService.statefulSetService, 'List').mockResolvedValue(mockStatefulSets as any)

      const result = await controller.ListByNs('my-namespace-123')

      expect(result).toEqual(mockStatefulSets)
      expect(k8sService.statefulSetService.List).toHaveBeenCalledWith('my-namespace-123')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single statefulset', async () => {
      const mockStatefulSet = {
        metadata: { name: 'test-statefulset', namespace: 'default' },
        spec: { serviceName: 'test-service', replicas: 3 },
      }
      vi.spyOn(k8sService.statefulSetService, 'GetOneByNsName').mockResolvedValue(mockStatefulSet as any)

      const result = await controller.GetOneByNsName('default', 'test-statefulset')

      expect(result).toEqual(mockStatefulSet)
      expect(k8sService.statefulSetService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-statefulset')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.statefulSetService, 'GetOneByNsName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should handle special characters in statefulset name', async () => {
      const mockStatefulSet = { metadata: { name: 'test-statefulset-123', namespace: 'default' } }
      vi.spyOn(k8sService.statefulSetService, 'GetOneByNsName').mockResolvedValue(mockStatefulSet as any)

      const result = await controller.GetOneByNsName('default', 'test-statefulset-123')

      expect(result).toEqual(mockStatefulSet)
      expect(k8sService.statefulSetService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-statefulset-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockStatefulSet = { metadata: { name: 'test-statefulset', namespace: 'kube-system' } }
      vi.spyOn(k8sService.statefulSetService, 'GetOneByNsName').mockResolvedValue(mockStatefulSet as any)

      const result = await controller.GetOneByNsName('kube-system', 'test-statefulset')

      expect(result).toEqual(mockStatefulSet)
      expect(k8sService.statefulSetService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-statefulset')
    })

    it('should get statefulset from multiple namespaces', async () => {
      const mockStatefulSet1 = { metadata: { name: 'statefulset-1', namespace: 'default' } }
      const mockStatefulSet2 = { metadata: { name: 'statefulset-2', namespace: 'production' } }

      vi.spyOn(k8sService.statefulSetService, 'GetOneByNsName')
        .mockResolvedValueOnce(mockStatefulSet1 as any)
        .mockResolvedValueOnce(mockStatefulSet2 as any)

      const result1 = await controller.GetOneByNsName('default', 'statefulset-1')
      const result2 = await controller.GetOneByNsName('production', 'statefulset-2')

      expect(result1).toEqual(mockStatefulSet1)
      expect(result2).toEqual(mockStatefulSet2)
      expect(k8sService.statefulSetService.GetOneByNsName).toHaveBeenCalledTimes(2)
    })
  })

  describe('Delete', () => {
    it('should delete a single statefulset', async () => {
      vi.spyOn(k8sService.statefulSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-statefulset']
      await controller.Delete(nsn)

      expect(k8sService.statefulSetService.Delete).toHaveBeenCalledWith('test-statefulset', 'default')
    })

    it('should delete multiple statefulsets', async () => {
      vi.spyOn(k8sService.statefulSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/statefulset1', 'kube-system/statefulset2', 'default/statefulset3']
      await controller.Delete(nsn)

      expect(k8sService.statefulSetService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.statefulSetService.Delete).toHaveBeenCalledWith('statefulset1', 'default')
      expect(k8sService.statefulSetService.Delete).toHaveBeenCalledWith('statefulset2', 'kube-system')
      expect(k8sService.statefulSetService.Delete).toHaveBeenCalledWith('statefulset3', 'default')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.statefulSetService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.statefulSetService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.statefulSetService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/statefulset1', 'default/statefulset2', 'default/statefulset3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.statefulSetService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle statefulsets with slashes in namespace/name format', async () => {
      vi.spyOn(k8sService.statefulSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-statefulset-name']
      await controller.Delete(nsn)

      expect(k8sService.statefulSetService.Delete).toHaveBeenCalledWith('my-statefulset-name', 'my-namespace')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.statefulSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-statefulset']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should delete statefulsets across multiple namespaces', async () => {
      vi.spyOn(k8sService.statefulSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/app-statefulset', 'production/db-statefulset', 'staging/cache-statefulset']
      await controller.Delete(nsn)

      expect(k8sService.statefulSetService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.statefulSetService.Delete).toHaveBeenCalledWith('app-statefulset', 'default')
      expect(k8sService.statefulSetService.Delete).toHaveBeenCalledWith('db-statefulset', 'production')
      expect(k8sService.statefulSetService.Delete).toHaveBeenCalledWith('cache-statefulset', 'staging')
    })
  })

  describe('Scale', () => {
    it('should scale a statefulset to specified replicas', async () => {
      const mockScaledStatefulSet = {
        metadata: { name: 'test-statefulset', namespace: 'default' },
        spec: { replicas: 5 },
      }
      vi.spyOn(k8sService.statefulSetService, 'Scale').mockResolvedValue(mockScaledStatefulSet as any)

      const result = await controller.Scale('default', 'test-statefulset', 5)

      expect(result).toEqual(mockScaledStatefulSet)
      expect(k8sService.statefulSetService.Scale).toHaveBeenCalledWith('default', 'test-statefulset', 5)
    })

    it('should scale down to zero replicas', async () => {
      const mockScaledStatefulSet = {
        metadata: { name: 'test-statefulset', namespace: 'default' },
        spec: { replicas: 0 },
      }
      vi.spyOn(k8sService.statefulSetService, 'Scale').mockResolvedValue(mockScaledStatefulSet as any)

      const result = await controller.Scale('default', 'test-statefulset', 0)

      expect(result).toEqual(mockScaledStatefulSet)
      expect(k8sService.statefulSetService.Scale).toHaveBeenCalledWith('default', 'test-statefulset', 0)
    })

    it('should scale up to large number of replicas', async () => {
      const mockScaledStatefulSet = {
        metadata: { name: 'test-statefulset', namespace: 'default' },
        spec: { replicas: 100 },
      }
      vi.spyOn(k8sService.statefulSetService, 'Scale').mockResolvedValue(mockScaledStatefulSet as any)

      const result = await controller.Scale('default', 'test-statefulset', 100)

      expect(result).toEqual(mockScaledStatefulSet)
      expect(k8sService.statefulSetService.Scale).toHaveBeenCalledWith('default', 'test-statefulset', 100)
    })

    it('should handle scaling errors', async () => {
      const error = new Error('Scaling failed')
      vi.spyOn(k8sService.statefulSetService, 'Scale').mockRejectedValue(error)

      await expect(controller.Scale('default', 'test-statefulset', 5)).rejects.toThrow('Scaling failed')
    })

    it('should scale statefulset in custom namespace', async () => {
      const mockScaledStatefulSet = {
        metadata: { name: 'db-statefulset', namespace: 'production' },
        spec: { replicas: 10 },
      }
      vi.spyOn(k8sService.statefulSetService, 'Scale').mockResolvedValue(mockScaledStatefulSet as any)

      const result = await controller.Scale('production', 'db-statefulset', 10)

      expect(result).toEqual(mockScaledStatefulSet)
      expect(k8sService.statefulSetService.Scale).toHaveBeenCalledWith('production', 'db-statefulset', 10)
    })

    it('should handle not found errors when scaling', async () => {
      vi.spyOn(k8sService.statefulSetService, 'Scale').mockRejectedValue(new Error('StatefulSet not found'))

      await expect(controller.Scale('default', 'nonexistent', 3)).rejects.toThrow('StatefulSet not found')
    })

    it('should handle permission errors when scaling', async () => {
      const error = new Error('Forbidden: User cannot scale statefulsets')
      vi.spyOn(k8sService.statefulSetService, 'Scale').mockRejectedValue(error)

      await expect(controller.Scale('default', 'test-statefulset', 5)).rejects.toThrow('Forbidden')
    })
  })

  describe('Restart', () => {
    it('should restart a statefulset', async () => {
      const mockRestartedStatefulSet = {
        metadata: { name: 'test-statefulset', namespace: 'default' },
        spec: {
          template: {
            metadata: {
              annotations: {
                'kubectl.kubernetes.io/restartedAt': expect.any(String),
                'kubectl.kubernetes.io/origin': 'k8s-playgrounds',
              },
            },
          },
        },
      }
      vi.spyOn(k8sService.statefulSetService, 'Restart').mockResolvedValue(mockRestartedStatefulSet as any)

      const result = await controller.Restart('default', 'test-statefulset')

      expect(result).toEqual(mockRestartedStatefulSet)
      expect(k8sService.statefulSetService.Restart).toHaveBeenCalledWith('default', 'test-statefulset')
    })

    it('should handle restart errors', async () => {
      const error = new Error('Restart failed')
      vi.spyOn(k8sService.statefulSetService, 'Restart').mockRejectedValue(error)

      await expect(controller.Restart('default', 'test-statefulset')).rejects.toThrow('Restart failed')
    })

    it('should restart statefulset in custom namespace', async () => {
      const mockRestartedStatefulSet = {
        metadata: { name: 'db-statefulset', namespace: 'production' },
      }
      vi.spyOn(k8sService.statefulSetService, 'Restart').mockResolvedValue(mockRestartedStatefulSet as any)

      const result = await controller.Restart('production', 'db-statefulset')

      expect(result).toEqual(mockRestartedStatefulSet)
      expect(k8sService.statefulSetService.Restart).toHaveBeenCalledWith('production', 'db-statefulset')
    })

    it('should handle not found errors when restarting', async () => {
      vi.spyOn(k8sService.statefulSetService, 'Restart').mockRejectedValue(new Error('StatefulSet not found'))

      await expect(controller.Restart('default', 'nonexistent')).rejects.toThrow('StatefulSet not found')
    })

    it('should handle permission errors when restarting', async () => {
      const error = new Error('Forbidden: User cannot update statefulsets')
      vi.spyOn(k8sService.statefulSetService, 'Restart').mockRejectedValue(error)

      await expect(controller.Restart('default', 'test-statefulset')).rejects.toThrow('Forbidden')
    })

    it('should restart multiple statefulsets sequentially', async () => {
      const mockRestartedStatefulSet1 = { metadata: { name: 'statefulset-1', namespace: 'default' } }
      const mockRestartedStatefulSet2 = { metadata: { name: 'statefulset-2', namespace: 'default' } }

      vi.spyOn(k8sService.statefulSetService, 'Restart')
        .mockResolvedValueOnce(mockRestartedStatefulSet1 as any)
        .mockResolvedValueOnce(mockRestartedStatefulSet2 as any)

      const result1 = await controller.Restart('default', 'statefulset-1')
      const result2 = await controller.Restart('default', 'statefulset-2')

      expect(result1).toEqual(mockRestartedStatefulSet1)
      expect(result2).toEqual(mockRestartedStatefulSet2)
      expect(k8sService.statefulSetService.Restart).toHaveBeenCalledTimes(2)
    })
  })
})
