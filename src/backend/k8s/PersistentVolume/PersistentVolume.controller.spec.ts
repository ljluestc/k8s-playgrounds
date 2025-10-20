import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { K8sService } from '../k8s.service'
import { PersistentVolumeController } from './PersistentVolume.controller'
import type { PersistentVolumeService } from './PersistentVolume.service'

describe('PersistentVolumeController', () => {
  let controller: PersistentVolumeController
  let k8sService: K8sService
  let persistentVolumeService: PersistentVolumeService

  beforeEach(() => {
    const mockPersistentVolumeService = {
      List: vi.fn(),
      GetOneByName: vi.fn(),
      Delete: vi.fn(),
      Update: vi.fn(),
      Restart: vi.fn(),
      Scale: vi.fn(),
    }

    const mockK8sService = {
      persistentVolumeService: mockPersistentVolumeService,
    }

    // Create controller directly with mocked dependencies
    controller = new PersistentVolumeController(mockK8sService as any, mockPersistentVolumeService as any)
    k8sService = mockK8sService as any
    persistentVolumeService = mockPersistentVolumeService as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('should have k8sService with persistentVolumeService', () => {
    expect(k8sService).toBeDefined()
    expect(persistentVolumeService).toBeDefined()
    expect(persistentVolumeService).toBeDefined()
  })

  describe('List', () => {
    it('should return all persistent volumes', async () => {
      const mockPVs = [
        {
          metadata: { name: 'pv-1' },
          spec: { capacity: { storage: '10Gi' }, accessModes: ['ReadWriteOnce'] },
          status: { phase: 'Available' },
        },
        {
          metadata: { name: 'pv-2' },
          spec: { capacity: { storage: '20Gi' }, accessModes: ['ReadWriteMany'] },
          status: { phase: 'Bound' },
        },
      ]
      vi.spyOn(persistentVolumeService, 'List').mockResolvedValue(mockPVs as any)

      const result = await controller.List()

      expect(result).toEqual(mockPVs)
      expect(persistentVolumeService.List).toHaveBeenCalledWith()
    })

    it('should return empty array when no PVs exist', async () => {
      vi.spyOn(persistentVolumeService, 'List').mockResolvedValue([])

      const result = await controller.List()

      expect(result).toEqual([])
      expect(persistentVolumeService.List).toHaveBeenCalled()
    })

    it('should return PVs with different phases', async () => {
      const mockPVs = [
        {
          metadata: { name: 'pv-available' },
          status: { phase: 'Available' },
        },
        {
          metadata: { name: 'pv-bound' },
          status: { phase: 'Bound' },
        },
        {
          metadata: { name: 'pv-released' },
          status: { phase: 'Released' },
        },
        {
          metadata: { name: 'pv-failed' },
          status: { phase: 'Failed' },
        },
      ]
      vi.spyOn(persistentVolumeService, 'List').mockResolvedValue(mockPVs as any)

      const result = await controller.List()

      expect(result).toEqual(mockPVs)
      expect(result).toHaveLength(4)
    })

    it('should return PVs with different storage classes', async () => {
      const mockPVs = [
        {
          metadata: { name: 'pv-standard' },
          spec: { storageClassName: 'standard' },
        },
        {
          metadata: { name: 'pv-fast' },
          spec: { storageClassName: 'fast-ssd' },
        },
        {
          metadata: { name: 'pv-no-class' },
          spec: {},
        },
      ]
      vi.spyOn(persistentVolumeService, 'List').mockResolvedValue(mockPVs as any)

      const result = await controller.List()

      expect(result).toEqual(mockPVs)
      expect(result).toHaveLength(3)
    })

    it('should return PVs with different access modes', async () => {
      const mockPVs = [
        {
          metadata: { name: 'pv-rwo' },
          spec: { accessModes: ['ReadWriteOnce'] },
        },
        {
          metadata: { name: 'pv-rwx' },
          spec: { accessModes: ['ReadWriteMany'] },
        },
        {
          metadata: { name: 'pv-rox' },
          spec: { accessModes: ['ReadOnlyMany'] },
        },
        {
          metadata: { name: 'pv-multiple' },
          spec: { accessModes: ['ReadWriteOnce', 'ReadOnlyMany'] },
        },
      ]
      vi.spyOn(persistentVolumeService, 'List').mockResolvedValue(mockPVs as any)

      const result = await controller.List()

      expect(result).toEqual(mockPVs)
      expect(result).toHaveLength(4)
    })

    it('should return PVs with different reclaim policies', async () => {
      const mockPVs = [
        {
          metadata: { name: 'pv-retain' },
          spec: { persistentVolumeReclaimPolicy: 'Retain' },
        },
        {
          metadata: { name: 'pv-delete' },
          spec: { persistentVolumeReclaimPolicy: 'Delete' },
        },
        {
          metadata: { name: 'pv-recycle' },
          spec: { persistentVolumeReclaimPolicy: 'Recycle' },
        },
      ]
      vi.spyOn(persistentVolumeService, 'List').mockResolvedValue(mockPVs as any)

      const result = await controller.List()

      expect(result).toEqual(mockPVs)
      expect(result).toHaveLength(3)
    })

    it('should handle errors when listing PVs', async () => {
      const error = new Error('API error')
      vi.spyOn(persistentVolumeService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot list PersistentVolumes')
      vi.spyOn(persistentVolumeService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('Forbidden')
    })

    it('should handle API connection errors', async () => {
      const error = new Error('Connection refused')
      vi.spyOn(persistentVolumeService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('Connection refused')
    })
  })

  describe('GetOneByName', () => {
    it('should return a single PV by name', async () => {
      const mockPV = {
        metadata: { name: 'test-pv' },
        spec: {
          capacity: { storage: '10Gi' },
          accessModes: ['ReadWriteOnce'],
          persistentVolumeReclaimPolicy: 'Retain',
          storageClassName: 'standard',
        },
        status: { phase: 'Available' },
      }
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockResolvedValue(mockPV as any)

      const result = await controller.GetOneByName('test-pv')

      expect(result).toEqual(mockPV)
      expect(persistentVolumeService.GetOneByName).toHaveBeenCalledWith('test-pv')
    })

    it('should return PV with Available phase', async () => {
      const mockPV = {
        metadata: { name: 'pv-available' },
        status: { phase: 'Available' },
      }
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockResolvedValue(mockPV as any)

      const result = await controller.GetOneByName('pv-available')

      expect(result.status.phase).toBe('Available')
    })

    it('should return PV with Bound phase', async () => {
      const mockPV = {
        metadata: { name: 'pv-bound' },
        spec: {
          claimRef: {
            namespace: 'default',
            name: 'test-pvc',
          },
        },
        status: { phase: 'Bound' },
      }
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockResolvedValue(mockPV as any)

      const result = await controller.GetOneByName('pv-bound')

      expect(result.status.phase).toBe('Bound')
      expect(result.spec.claimRef).toBeDefined()
      expect(result.spec.claimRef.name).toBe('test-pvc')
    })

    it('should return PV with Released phase', async () => {
      const mockPV = {
        metadata: { name: 'pv-released' },
        status: { phase: 'Released' },
      }
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockResolvedValue(mockPV as any)

      const result = await controller.GetOneByName('pv-released')

      expect(result.status.phase).toBe('Released')
    })

    it('should return PV with Failed phase', async () => {
      const mockPV = {
        metadata: { name: 'pv-failed' },
        status: {
          phase: 'Failed',
          message: 'Volume provisioning failed',
        },
      }
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockResolvedValue(mockPV as any)

      const result = await controller.GetOneByName('pv-failed')

      expect(result.status.phase).toBe('Failed')
      expect(result.status.message).toBeDefined()
    })

    it('should return PV with NFS volume type', async () => {
      const mockPV = {
        metadata: { name: 'pv-nfs' },
        spec: {
          nfs: {
            server: '192.168.1.100',
            path: '/exports/data',
          },
          accessModes: ['ReadWriteMany'],
        },
      }
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockResolvedValue(mockPV as any)

      const result = await controller.GetOneByName('pv-nfs')

      expect(result.spec.nfs).toBeDefined()
      expect(result.spec.nfs.server).toBe('192.168.1.100')
    })

    it('should return PV with hostPath volume type', async () => {
      const mockPV = {
        metadata: { name: 'pv-hostpath' },
        spec: {
          hostPath: {
            path: '/mnt/data',
            type: 'DirectoryOrCreate',
          },
          accessModes: ['ReadWriteOnce'],
        },
      }
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockResolvedValue(mockPV as any)

      const result = await controller.GetOneByName('pv-hostpath')

      expect(result.spec.hostPath).toBeDefined()
      expect(result.spec.hostPath.path).toBe('/mnt/data')
    })

    it('should return PV with CSI volume type', async () => {
      const mockPV = {
        metadata: { name: 'pv-csi' },
        spec: {
          csi: {
            driver: 'csi.example.com',
            volumeHandle: 'vol-12345',
            fsType: 'ext4',
          },
          accessModes: ['ReadWriteOnce'],
        },
      }
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockResolvedValue(mockPV as any)

      const result = await controller.GetOneByName('pv-csi')

      expect(result.spec.csi).toBeDefined()
      expect(result.spec.csi.driver).toBe('csi.example.com')
    })

    it('should return PV with Retain reclaim policy', async () => {
      const mockPV = {
        metadata: { name: 'pv-retain' },
        spec: { persistentVolumeReclaimPolicy: 'Retain' },
      }
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockResolvedValue(mockPV as any)

      const result = await controller.GetOneByName('pv-retain')

      expect(result.spec.persistentVolumeReclaimPolicy).toBe('Retain')
    })

    it('should return PV with Delete reclaim policy', async () => {
      const mockPV = {
        metadata: { name: 'pv-delete' },
        spec: { persistentVolumeReclaimPolicy: 'Delete' },
      }
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockResolvedValue(mockPV as any)

      const result = await controller.GetOneByName('pv-delete')

      expect(result.spec.persistentVolumeReclaimPolicy).toBe('Delete')
    })

    it('should return PV with storage class', async () => {
      const mockPV = {
        metadata: { name: 'pv-with-class' },
        spec: { storageClassName: 'fast-ssd' },
      }
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockResolvedValue(mockPV as any)

      const result = await controller.GetOneByName('pv-with-class')

      expect(result.spec.storageClassName).toBe('fast-ssd')
    })

    it('should return PV without storage class', async () => {
      const mockPV = {
        metadata: { name: 'pv-no-class' },
        spec: { capacity: { storage: '10Gi' } },
      }
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockResolvedValue(mockPV as any)

      const result = await controller.GetOneByName('pv-no-class')

      expect(result.spec.storageClassName).toBeUndefined()
    })

    it('should handle not found errors', async () => {
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByName('nonexistent')).rejects.toThrow('Not found')
    })

    it('should handle special characters in PV name', async () => {
      const mockPV = { metadata: { name: 'pv-test-123' } }
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockResolvedValue(mockPV as any)

      const result = await controller.GetOneByName('pv-test-123')

      expect(result).toEqual(mockPV)
      expect(persistentVolumeService.GetOneByName).toHaveBeenCalledWith('pv-test-123')
    })

    it('should handle API errors when getting PV', async () => {
      const error = new Error('API error')
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockRejectedValue(error)

      await expect(controller.GetOneByName('test-pv')).rejects.toThrow('API error')
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot get PersistentVolume')
      vi.spyOn(persistentVolumeService, 'GetOneByName').mockRejectedValue(error)

      await expect(controller.GetOneByName('test-pv')).rejects.toThrow('Forbidden')
    })
  })

  describe('Delete', () => {
    it('should delete a single PV', async () => {
      vi.spyOn(persistentVolumeService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['/test-pv']
      const result = await controller.Delete(nsn)

      expect(persistentVolumeService.Delete).toHaveBeenCalledWith('test-pv')
      expect(result).toEqual({})
    })

    it('should delete multiple PVs', async () => {
      vi.spyOn(persistentVolumeService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['/pv-1', '/pv-2', '/pv-3']
      await controller.Delete(nsn)

      expect(persistentVolumeService.Delete).toHaveBeenCalledTimes(3)
      expect(persistentVolumeService.Delete).toHaveBeenCalledWith('pv-1')
      expect(persistentVolumeService.Delete).toHaveBeenCalledWith('pv-2')
      expect(persistentVolumeService.Delete).toHaveBeenCalledWith('pv-3')
    })

    it('should handle empty array', async () => {
      vi.spyOn(persistentVolumeService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(persistentVolumeService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(persistentVolumeService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['/pv-1', '/pv-2', '/pv-3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(persistentVolumeService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle PVs with hyphens in name', async () => {
      vi.spyOn(persistentVolumeService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['/my-pv-name-123']
      await controller.Delete(nsn)

      expect(persistentVolumeService.Delete).toHaveBeenCalledWith('my-pv-name-123')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(persistentVolumeService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['/test-pv']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should handle deletion of bound PV', async () => {
      vi.spyOn(persistentVolumeService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['/pv-bound']
      await controller.Delete(nsn)

      expect(persistentVolumeService.Delete).toHaveBeenCalledWith('pv-bound')
    })

    it('should handle deletion of PV with finalizers', async () => {
      vi.spyOn(persistentVolumeService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['/pv-with-finalizers']
      await controller.Delete(nsn)

      expect(persistentVolumeService.Delete).toHaveBeenCalledWith('pv-with-finalizers')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      vi.spyOn(persistentVolumeService, 'Delete').mockRejectedValue(error)

      const nsn = ['/test-pv']

      // The controller doesn't await individual deletes, so it won't throw
      await controller.Delete(nsn)

      expect(persistentVolumeService.Delete).toHaveBeenCalledWith('test-pv')
    })

    it('should handle permission errors during deletion', async () => {
      const error = new Error('Forbidden: User cannot delete PersistentVolume')
      vi.spyOn(persistentVolumeService, 'Delete').mockRejectedValue(error)

      const nsn = ['/test-pv']

      // The controller doesn't await individual deletes
      await controller.Delete(nsn)

      expect(persistentVolumeService.Delete).toHaveBeenCalledWith('test-pv')
    })

    it('should parse namespace/name format correctly (PV is cluster-scoped)', async () => {
      vi.spyOn(persistentVolumeService, 'Delete').mockResolvedValue(undefined)

      // Even though PVs are cluster-scoped, the format might include a dummy namespace
      const nsn = ['/pv-name']
      await controller.Delete(nsn)

      expect(persistentVolumeService.Delete).toHaveBeenCalledWith('pv-name')
    })

    it('should handle batch deletion of PVs with different phases', async () => {
      vi.spyOn(persistentVolumeService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['/pv-available', '/pv-released', '/pv-failed']
      await controller.Delete(nsn)

      expect(persistentVolumeService.Delete).toHaveBeenCalledTimes(3)
      expect(persistentVolumeService.Delete).toHaveBeenCalledWith('pv-available')
      expect(persistentVolumeService.Delete).toHaveBeenCalledWith('pv-released')
      expect(persistentVolumeService.Delete).toHaveBeenCalledWith('pv-failed')
    })
  })
})
