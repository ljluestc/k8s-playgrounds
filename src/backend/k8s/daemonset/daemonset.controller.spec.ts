import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockK8sService } from '../../../../test/utils/k8s-mocks'

import { DaemonSetController } from './daemonset.controller'

describe('DaemonSetController', () => {
  let controller: DaemonSetController
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new DaemonSetController(k8sService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all daemonsets', async () => {
      const mockDaemonSets = { items: [] }
      vi.spyOn(k8sService.daemonSetService, 'List').mockResolvedValue(mockDaemonSets as any)

      const result = await controller.List()

      expect(result).toEqual(mockDaemonSets)
      expect(k8sService.daemonSetService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing daemonsets', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.daemonSetService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })
  })

  describe('ListByNs', () => {
    it('should return daemonsets for a specific namespace', async () => {
      const mockDaemonSets = { items: [] }
      const namespace = 'default'
      vi.spyOn(k8sService.daemonSetService, 'List').mockResolvedValue(mockDaemonSets as any)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockDaemonSets)
      expect(k8sService.daemonSetService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      vi.spyOn(k8sService.daemonSetService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockDaemonSets = { items: [] }
      vi.spyOn(k8sService.daemonSetService, 'List').mockResolvedValue(mockDaemonSets as any)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockDaemonSets)
      expect(k8sService.daemonSetService.List).toHaveBeenCalledWith('')
    })

    it('should list daemonsets in kube-system namespace', async () => {
      const mockDaemonSets = { items: [] }
      vi.spyOn(k8sService.daemonSetService, 'List').mockResolvedValue(mockDaemonSets as any)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockDaemonSets)
      expect(k8sService.daemonSetService.List).toHaveBeenCalledWith('kube-system')
    })

    it('should handle custom namespace names', async () => {
      const mockDaemonSets = { items: [] }
      vi.spyOn(k8sService.daemonSetService, 'List').mockResolvedValue(mockDaemonSets as any)

      const result = await controller.ListByNs('monitoring-system')

      expect(result).toEqual(mockDaemonSets)
      expect(k8sService.daemonSetService.List).toHaveBeenCalledWith('monitoring-system')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single daemonset', async () => {
      const mockDaemonSet = {
        metadata: { name: 'test-daemonset', namespace: 'default' },
        spec: { selector: { matchLabels: { app: 'test' } } },
      }
      vi.spyOn(k8sService.daemonSetService, 'GetOneByNsName').mockResolvedValue(mockDaemonSet as any)

      const result = await controller.GetOneByNsName('default', 'test-daemonset')

      expect(result).toEqual(mockDaemonSet)
      expect(k8sService.daemonSetService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-daemonset')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.daemonSetService, 'GetOneByNsName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should handle special characters in daemonset name', async () => {
      const mockDaemonSet = { metadata: { name: 'test-daemonset-123', namespace: 'default' } }
      vi.spyOn(k8sService.daemonSetService, 'GetOneByNsName').mockResolvedValue(mockDaemonSet as any)

      const result = await controller.GetOneByNsName('default', 'test-daemonset-123')

      expect(result).toEqual(mockDaemonSet)
      expect(k8sService.daemonSetService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-daemonset-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockDaemonSet = { metadata: { name: 'test-daemonset', namespace: 'kube-system' } }
      vi.spyOn(k8sService.daemonSetService, 'GetOneByNsName').mockResolvedValue(mockDaemonSet as any)

      const result = await controller.GetOneByNsName('kube-system', 'test-daemonset')

      expect(result).toEqual(mockDaemonSet)
      expect(k8sService.daemonSetService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-daemonset')
    })

    it('should get daemonset from monitoring namespace', async () => {
      const mockDaemonSet = { metadata: { name: 'node-exporter', namespace: 'monitoring' } }
      vi.spyOn(k8sService.daemonSetService, 'GetOneByNsName').mockResolvedValue(mockDaemonSet as any)

      const result = await controller.GetOneByNsName('monitoring', 'node-exporter')

      expect(result).toEqual(mockDaemonSet)
      expect(k8sService.daemonSetService.GetOneByNsName).toHaveBeenCalledWith('monitoring', 'node-exporter')
    })
  })

  describe('Delete', () => {
    it('should delete a single daemonset', async () => {
      vi.spyOn(k8sService.daemonSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-daemonset']
      await controller.Delete(nsn)

      expect(k8sService.daemonSetService.Delete).toHaveBeenCalledWith('default', 'test-daemonset')
    })

    it('should delete multiple daemonsets', async () => {
      vi.spyOn(k8sService.daemonSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/daemonset1', 'kube-system/daemonset2', 'default/daemonset3']
      await controller.Delete(nsn)

      expect(k8sService.daemonSetService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.daemonSetService.Delete).toHaveBeenCalledWith('default', 'daemonset1')
      expect(k8sService.daemonSetService.Delete).toHaveBeenCalledWith('kube-system', 'daemonset2')
      expect(k8sService.daemonSetService.Delete).toHaveBeenCalledWith('default', 'daemonset3')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.daemonSetService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.daemonSetService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.daemonSetService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/daemonset1', 'default/daemonset2', 'default/daemonset3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.daemonSetService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle daemonsets with slashes in namespace/name format', async () => {
      vi.spyOn(k8sService.daemonSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-daemonset-name']
      await controller.Delete(nsn)

      expect(k8sService.daemonSetService.Delete).toHaveBeenCalledWith('my-namespace', 'my-daemonset-name')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.daemonSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-daemonset']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should delete daemonsets from multiple namespaces', async () => {
      vi.spyOn(k8sService.daemonSetService, 'Delete').mockResolvedValue(undefined)

      const nsn = [
        'default/app-daemonset',
        'kube-system/kube-proxy',
        'monitoring/node-exporter',
        'logging/fluentd',
      ]
      await controller.Delete(nsn)

      expect(k8sService.daemonSetService.Delete).toHaveBeenCalledTimes(4)
      expect(k8sService.daemonSetService.Delete).toHaveBeenCalledWith('default', 'app-daemonset')
      expect(k8sService.daemonSetService.Delete).toHaveBeenCalledWith('kube-system', 'kube-proxy')
      expect(k8sService.daemonSetService.Delete).toHaveBeenCalledWith('monitoring', 'node-exporter')
      expect(k8sService.daemonSetService.Delete).toHaveBeenCalledWith('logging', 'fluentd')
    })
  })

  describe('Restart', () => {
    it('should restart a daemonset', async () => {
      const mockDaemonSet = {
        metadata: { name: 'test-daemonset', namespace: 'default' },
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
      vi.spyOn(k8sService.daemonSetService, 'Restart').mockResolvedValue(mockDaemonSet as any)

      const result = await controller.Restart('default', 'test-daemonset')

      expect(result).toEqual(mockDaemonSet)
      expect(k8sService.daemonSetService.Restart).toHaveBeenCalledWith('default', 'test-daemonset')
    })

    it('should handle restart errors', async () => {
      const error = new Error('Restart failed')
      vi.spyOn(k8sService.daemonSetService, 'Restart').mockRejectedValue(error)

      await expect(controller.Restart('default', 'test-daemonset')).rejects.toThrow('Restart failed')
    })

    it('should restart daemonset in different namespace', async () => {
      const mockDaemonSet = { metadata: { name: 'kube-proxy', namespace: 'kube-system' } }
      vi.spyOn(k8sService.daemonSetService, 'Restart').mockResolvedValue(mockDaemonSet as any)

      const result = await controller.Restart('kube-system', 'kube-proxy')

      expect(result).toEqual(mockDaemonSet)
      expect(k8sService.daemonSetService.Restart).toHaveBeenCalledWith('kube-system', 'kube-proxy')
    })

    it('should handle not found errors on restart', async () => {
      vi.spyOn(k8sService.daemonSetService, 'Restart').mockRejectedValue(new Error('DaemonSet not found'))

      await expect(controller.Restart('default', 'nonexistent')).rejects.toThrow('DaemonSet not found')
    })

    it('should restart daemonset with special characters in name', async () => {
      const mockDaemonSet = { metadata: { name: 'my-daemonset-123', namespace: 'default' } }
      vi.spyOn(k8sService.daemonSetService, 'Restart').mockResolvedValue(mockDaemonSet as any)

      const result = await controller.Restart('default', 'my-daemonset-123')

      expect(result).toEqual(mockDaemonSet)
      expect(k8sService.daemonSetService.Restart).toHaveBeenCalledWith('default', 'my-daemonset-123')
    })

    it('should restart node-exporter daemonset', async () => {
      const mockDaemonSet = { metadata: { name: 'node-exporter', namespace: 'monitoring' } }
      vi.spyOn(k8sService.daemonSetService, 'Restart').mockResolvedValue(mockDaemonSet as any)

      const result = await controller.Restart('monitoring', 'node-exporter')

      expect(result).toEqual(mockDaemonSet)
      expect(k8sService.daemonSetService.Restart).toHaveBeenCalledWith('monitoring', 'node-exporter')
    })

    it('should handle permission errors on restart', async () => {
      const error = new Error('Forbidden: User cannot patch daemonsets')
      vi.spyOn(k8sService.daemonSetService, 'Restart').mockRejectedValue(error)

      await expect(controller.Restart('default', 'test-daemonset')).rejects.toThrow('Forbidden')
    })
  })
})
