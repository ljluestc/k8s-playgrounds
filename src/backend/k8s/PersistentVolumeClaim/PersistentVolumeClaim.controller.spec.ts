import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockK8sService } from '../../../../test/utils/k8s-mocks'
import { PersistentVolumeClaimController } from './PersistentVolumeClaim.controller'

describe('PersistentVolumeClaimController', () => {
  let controller: PersistentVolumeClaimController
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new PersistentVolumeClaimController(k8sService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all PVCs', async () => {
      const mockPVCs = { items: [] }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'List').mockResolvedValue(mockPVCs as any)

      const result = await controller.List()

      expect(result).toEqual(mockPVCs)
      expect(k8sService.persistentVolumeClaimService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing PVCs', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.persistentVolumeClaimService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })

    it('should return empty array when no PVCs exist', async () => {
      const mockPVCs = { items: [] }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'List').mockResolvedValue(mockPVCs as any)

      const result = await controller.List()

      expect(result).toEqual(mockPVCs)
      expect(result.items).toHaveLength(0)
    })
  })

  describe('ListByNs', () => {
    it('should return PVCs for a specific namespace', async () => {
      const mockPVCs = { items: [] }
      const namespace = 'default'
      vi.spyOn(k8sService.persistentVolumeClaimService, 'List').mockResolvedValue(mockPVCs as any)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockPVCs)
      expect(k8sService.persistentVolumeClaimService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      vi.spyOn(k8sService.persistentVolumeClaimService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockPVCs = { items: [] }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'List').mockResolvedValue(mockPVCs as any)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockPVCs)
      expect(k8sService.persistentVolumeClaimService.List).toHaveBeenCalledWith('')
    })

    it('should handle "null" string namespace', async () => {
      const mockPVCs = { items: [] }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'List').mockResolvedValue(mockPVCs as any)

      const result = await controller.ListByNs('null')

      expect(result).toEqual(mockPVCs)
      expect(k8sService.persistentVolumeClaimService.List).toHaveBeenCalledWith('null')
    })

    it('should list PVCs in kube-system namespace', async () => {
      const mockPVCs = { items: [] }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'List').mockResolvedValue(mockPVCs as any)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockPVCs)
      expect(k8sService.persistentVolumeClaimService.List).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockPVCs = { items: [] }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'List').mockResolvedValue(mockPVCs as any)

      const result = await controller.ListByNs('my-storage-namespace-123')

      expect(result).toEqual(mockPVCs)
      expect(k8sService.persistentVolumeClaimService.List).toHaveBeenCalledWith('my-storage-namespace-123')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single PVC', async () => {
      const mockPVC = {
        metadata: { name: 'test-pvc', namespace: 'default' },
        spec: {
          accessModes: ['ReadWriteOnce'],
          resources: { requests: { storage: '10Gi' } },
          storageClassName: 'standard',
        },
        status: { phase: 'Bound' },
      }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'GetOneByNsName').mockResolvedValue(mockPVC as any)

      const result = await controller.GetOneByNsName('default', 'test-pvc')

      expect(result).toEqual(mockPVC)
      expect(k8sService.persistentVolumeClaimService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-pvc')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.persistentVolumeClaimService, 'GetOneByNsName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should handle special characters in PVC name', async () => {
      const mockPVC = { metadata: { name: 'test-pvc-123', namespace: 'default' } }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'GetOneByNsName').mockResolvedValue(mockPVC as any)

      const result = await controller.GetOneByNsName('default', 'test-pvc-123')

      expect(result).toEqual(mockPVC)
      expect(k8sService.persistentVolumeClaimService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-pvc-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockPVC = { metadata: { name: 'test-pvc', namespace: 'kube-system' } }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'GetOneByNsName').mockResolvedValue(mockPVC as any)

      const result = await controller.GetOneByNsName('kube-system', 'test-pvc')

      expect(result).toEqual(mockPVC)
      expect(k8sService.persistentVolumeClaimService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-pvc')
    })

    it('should get PVC with Pending phase', async () => {
      const mockPVC = {
        metadata: { name: 'pending-pvc', namespace: 'default' },
        status: { phase: 'Pending' },
      }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'GetOneByNsName').mockResolvedValue(mockPVC as any)

      const result = await controller.GetOneByNsName('default', 'pending-pvc')

      expect(result).toEqual(mockPVC)
      expect(result.status?.phase).toBe('Pending')
    })

    it('should get PVC with Bound phase', async () => {
      const mockPVC = {
        metadata: { name: 'bound-pvc', namespace: 'default' },
        status: { phase: 'Bound' },
      }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'GetOneByNsName').mockResolvedValue(mockPVC as any)

      const result = await controller.GetOneByNsName('default', 'bound-pvc')

      expect(result).toEqual(mockPVC)
      expect(result.status?.phase).toBe('Bound')
    })

    it('should get PVC with Lost phase', async () => {
      const mockPVC = {
        metadata: { name: 'lost-pvc', namespace: 'default' },
        status: { phase: 'Lost' },
      }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'GetOneByNsName').mockResolvedValue(mockPVC as any)

      const result = await controller.GetOneByNsName('default', 'lost-pvc')

      expect(result).toEqual(mockPVC)
      expect(result.status?.phase).toBe('Lost')
    })

    it('should get PVC with ReadWriteOnce access mode', async () => {
      const mockPVC = {
        metadata: { name: 'rwo-pvc', namespace: 'default' },
        spec: { accessModes: ['ReadWriteOnce'] },
      }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'GetOneByNsName').mockResolvedValue(mockPVC as any)

      const result = await controller.GetOneByNsName('default', 'rwo-pvc')

      expect(result.spec?.accessModes).toContain('ReadWriteOnce')
    })

    it('should get PVC with ReadOnlyMany access mode', async () => {
      const mockPVC = {
        metadata: { name: 'rom-pvc', namespace: 'default' },
        spec: { accessModes: ['ReadOnlyMany'] },
      }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'GetOneByNsName').mockResolvedValue(mockPVC as any)

      const result = await controller.GetOneByNsName('default', 'rom-pvc')

      expect(result.spec?.accessModes).toContain('ReadOnlyMany')
    })

    it('should get PVC with ReadWriteMany access mode', async () => {
      const mockPVC = {
        metadata: { name: 'rwm-pvc', namespace: 'default' },
        spec: { accessModes: ['ReadWriteMany'] },
      }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'GetOneByNsName').mockResolvedValue(mockPVC as any)

      const result = await controller.GetOneByNsName('default', 'rwm-pvc')

      expect(result.spec?.accessModes).toContain('ReadWriteMany')
    })

    it('should get PVC with Filesystem volume mode', async () => {
      const mockPVC = {
        metadata: { name: 'filesystem-pvc', namespace: 'default' },
        spec: { volumeMode: 'Filesystem' },
      }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'GetOneByNsName').mockResolvedValue(mockPVC as any)

      const result = await controller.GetOneByNsName('default', 'filesystem-pvc')

      expect(result.spec?.volumeMode).toBe('Filesystem')
    })

    it('should get PVC with Block volume mode', async () => {
      const mockPVC = {
        metadata: { name: 'block-pvc', namespace: 'default' },
        spec: { volumeMode: 'Block' },
      }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'GetOneByNsName').mockResolvedValue(mockPVC as any)

      const result = await controller.GetOneByNsName('default', 'block-pvc')

      expect(result.spec?.volumeMode).toBe('Block')
    })

    it('should get PVC with storage class', async () => {
      const mockPVC = {
        metadata: { name: 'sc-pvc', namespace: 'default' },
        spec: { storageClassName: 'fast-ssd' },
      }
      vi.spyOn(k8sService.persistentVolumeClaimService, 'GetOneByNsName').mockResolvedValue(mockPVC as any)

      const result = await controller.GetOneByNsName('default', 'sc-pvc')

      expect(result.spec?.storageClassName).toBe('fast-ssd')
    })
  })

  describe('Delete', () => {
    it('should delete a single PVC', async () => {
      vi.spyOn(k8sService.persistentVolumeClaimService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-pvc']
      await controller.Delete(nsn)

      expect(k8sService.persistentVolumeClaimService.Delete).toHaveBeenCalledWith('test-pvc', 'default')
    })

    it('should delete multiple PVCs', async () => {
      vi.spyOn(k8sService.persistentVolumeClaimService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/pvc1', 'kube-system/pvc2', 'default/pvc3']
      await controller.Delete(nsn)

      expect(k8sService.persistentVolumeClaimService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.persistentVolumeClaimService.Delete).toHaveBeenCalledWith('pvc1', 'default')
      expect(k8sService.persistentVolumeClaimService.Delete).toHaveBeenCalledWith('pvc2', 'kube-system')
      expect(k8sService.persistentVolumeClaimService.Delete).toHaveBeenCalledWith('pvc3', 'default')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.persistentVolumeClaimService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.persistentVolumeClaimService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.persistentVolumeClaimService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/pvc1', 'default/pvc2', 'default/pvc3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.persistentVolumeClaimService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle PVCs with slashes in namespace/name format', async () => {
      vi.spyOn(k8sService.persistentVolumeClaimService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-pvc-name']
      await controller.Delete(nsn)

      expect(k8sService.persistentVolumeClaimService.Delete).toHaveBeenCalledWith('my-pvc-name', 'my-namespace')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.persistentVolumeClaimService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-pvc']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should delete PVCs from different namespaces', async () => {
      vi.spyOn(k8sService.persistentVolumeClaimService, 'Delete').mockResolvedValue(undefined)

      const nsn = [
        'production/data-pvc',
        'staging/data-pvc',
        'development/data-pvc',
      ]
      await controller.Delete(nsn)

      expect(k8sService.persistentVolumeClaimService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.persistentVolumeClaimService.Delete).toHaveBeenCalledWith('data-pvc', 'production')
      expect(k8sService.persistentVolumeClaimService.Delete).toHaveBeenCalledWith('data-pvc', 'staging')
      expect(k8sService.persistentVolumeClaimService.Delete).toHaveBeenCalledWith('data-pvc', 'development')
    })

    it('should handle deletion errors gracefully', async () => {
      vi.spyOn(k8sService.persistentVolumeClaimService, 'Delete')
        .mockRejectedValueOnce(new Error('PVC in use'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/in-use-pvc', 'default/free-pvc']

      // Should continue despite error
      await controller.Delete(nsn)

      expect(k8sService.persistentVolumeClaimService.Delete).toHaveBeenCalledTimes(2)
    })

    it('should handle PVCs with finalizers during deletion', async () => {
      vi.spyOn(k8sService.persistentVolumeClaimService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/pvc-with-finalizer']
      await controller.Delete(nsn)

      expect(k8sService.persistentVolumeClaimService.Delete).toHaveBeenCalledWith('pvc-with-finalizer', 'default')
    })
  })
})
