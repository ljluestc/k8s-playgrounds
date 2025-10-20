import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockK8sService } from '../../../../test/utils/k8s-mocks'

import { StorageClassController } from './StorageClass.controller'

describe('StorageClassController', () => {
  let controller: StorageClassController
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new StorageClassController(k8sService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all storage classes', async () => {
      const mockStorageClasses = [
        {
          metadata: { name: 'standard' },
          provisioner: 'kubernetes.io/aws-ebs',
          reclaimPolicy: 'Delete',
        },
        {
          metadata: { name: 'fast-ssd' },
          provisioner: 'kubernetes.io/gce-pd',
          reclaimPolicy: 'Retain',
        },
      ]
      vi.spyOn(k8sService.storageClassService, 'List').mockResolvedValue(mockStorageClasses as any)

      const result = await controller.List()

      expect(result).toEqual(mockStorageClasses)
      expect(k8sService.storageClassService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing storage classes', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.storageClassService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })

    it('should return empty array when no storage classes exist', async () => {
      vi.spyOn(k8sService.storageClassService, 'List').mockResolvedValue([])

      const result = await controller.List()

      expect(result).toEqual([])
      expect(k8sService.storageClassService.List).toHaveBeenCalledWith()
    })

    it('should list storage classes with different provisioners', async () => {
      const mockStorageClasses = [
        {
          metadata: { name: 'aws-ebs' },
          provisioner: 'kubernetes.io/aws-ebs',
          parameters: { type: 'gp2' },
        },
        {
          metadata: { name: 'gce-pd' },
          provisioner: 'kubernetes.io/gce-pd',
          parameters: { type: 'pd-standard' },
        },
        {
          metadata: { name: 'azure-disk' },
          provisioner: 'kubernetes.io/azure-disk',
          parameters: { storageaccounttype: 'Standard_LRS' },
        },
      ]
      vi.spyOn(k8sService.storageClassService, 'List').mockResolvedValue(mockStorageClasses as any)

      const result = await controller.List()

      expect(result).toEqual(mockStorageClasses)
      expect(result).toHaveLength(3)
    })

    it('should list storage classes with default class annotation', async () => {
      const mockStorageClasses = [
        {
          metadata: {
            name: 'standard',
            annotations: {
              'storageclass.kubernetes.io/is-default-class': 'true',
            },
          },
          provisioner: 'kubernetes.io/aws-ebs',
        },
        {
          metadata: { name: 'fast' },
          provisioner: 'kubernetes.io/aws-ebs',
        },
      ]
      vi.spyOn(k8sService.storageClassService, 'List').mockResolvedValue(mockStorageClasses as any)

      const result = await controller.List()

      expect(result).toEqual(mockStorageClasses)
      expect(result[0].metadata.annotations).toBeDefined()
    })
  })

  describe('GetOneByName', () => {
    it('should return a single storage class by name', async () => {
      const mockStorageClass = {
        metadata: { name: 'standard' },
        provisioner: 'kubernetes.io/aws-ebs',
        reclaimPolicy: 'Delete',
        volumeBindingMode: 'Immediate',
      }
      vi.spyOn(k8sService.storageClassService, 'GetOneByName').mockResolvedValue(mockStorageClass as any)

      const result = await controller.GetOneByName('standard')

      expect(result).toEqual(mockStorageClass)
      expect(k8sService.storageClassService.GetOneByName).toHaveBeenCalledWith('standard')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.storageClassService, 'GetOneByName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByName('nonexistent')).rejects.toThrow('Not found')
    })

    it('should get storage class with AWS EBS provisioner', async () => {
      const mockStorageClass = {
        metadata: { name: 'aws-ebs-gp2' },
        provisioner: 'kubernetes.io/aws-ebs',
        parameters: {
          type: 'gp2',
          encrypted: 'true',
          fsType: 'ext4',
        },
        reclaimPolicy: 'Delete',
      }
      vi.spyOn(k8sService.storageClassService, 'GetOneByName').mockResolvedValue(mockStorageClass as any)

      const result = await controller.GetOneByName('aws-ebs-gp2')

      expect(result).toEqual(mockStorageClass)
      expect(result.provisioner).toBe('kubernetes.io/aws-ebs')
      expect(result.parameters.type).toBe('gp2')
    })

    it('should get storage class with GCE PD provisioner', async () => {
      const mockStorageClass = {
        metadata: { name: 'gce-pd-ssd' },
        provisioner: 'kubernetes.io/gce-pd',
        parameters: {
          'type': 'pd-ssd',
          'replication-type': 'regional-pd',
        },
        reclaimPolicy: 'Retain',
      }
      vi.spyOn(k8sService.storageClassService, 'GetOneByName').mockResolvedValue(mockStorageClass as any)

      const result = await controller.GetOneByName('gce-pd-ssd')

      expect(result).toEqual(mockStorageClass)
      expect(result.provisioner).toBe('kubernetes.io/gce-pd')
    })

    it('should get storage class with Azure Disk provisioner', async () => {
      const mockStorageClass = {
        metadata: { name: 'azure-premium' },
        provisioner: 'kubernetes.io/azure-disk',
        parameters: {
          storageaccounttype: 'Premium_LRS',
          kind: 'Managed',
        },
        reclaimPolicy: 'Delete',
      }
      vi.spyOn(k8sService.storageClassService, 'GetOneByName').mockResolvedValue(mockStorageClass as any)

      const result = await controller.GetOneByName('azure-premium')

      expect(result).toEqual(mockStorageClass)
      expect(result.provisioner).toBe('kubernetes.io/azure-disk')
    })

    it('should get storage class with local provisioner', async () => {
      const mockStorageClass = {
        metadata: { name: 'local-storage' },
        provisioner: 'kubernetes.io/no-provisioner',
        volumeBindingMode: 'WaitForFirstConsumer',
        reclaimPolicy: 'Retain',
      }
      vi.spyOn(k8sService.storageClassService, 'GetOneByName').mockResolvedValue(mockStorageClass as any)

      const result = await controller.GetOneByName('local-storage')

      expect(result).toEqual(mockStorageClass)
      expect(result.volumeBindingMode).toBe('WaitForFirstConsumer')
    })

    it('should get storage class with Retain reclaim policy', async () => {
      const mockStorageClass = {
        metadata: { name: 'retain-storage' },
        provisioner: 'kubernetes.io/aws-ebs',
        reclaimPolicy: 'Retain',
      }
      vi.spyOn(k8sService.storageClassService, 'GetOneByName').mockResolvedValue(mockStorageClass as any)

      const result = await controller.GetOneByName('retain-storage')

      expect(result.reclaimPolicy).toBe('Retain')
    })

    it('should get storage class with Recycle reclaim policy', async () => {
      const mockStorageClass = {
        metadata: { name: 'recycle-storage' },
        provisioner: 'kubernetes.io/aws-ebs',
        reclaimPolicy: 'Recycle',
      }
      vi.spyOn(k8sService.storageClassService, 'GetOneByName').mockResolvedValue(mockStorageClass as any)

      const result = await controller.GetOneByName('recycle-storage')

      expect(result.reclaimPolicy).toBe('Recycle')
    })

    it('should get storage class with WaitForFirstConsumer binding mode', async () => {
      const mockStorageClass = {
        metadata: { name: 'wait-storage' },
        provisioner: 'kubernetes.io/aws-ebs',
        volumeBindingMode: 'WaitForFirstConsumer',
      }
      vi.spyOn(k8sService.storageClassService, 'GetOneByName').mockResolvedValue(mockStorageClass as any)

      const result = await controller.GetOneByName('wait-storage')

      expect(result.volumeBindingMode).toBe('WaitForFirstConsumer')
    })

    it('should get storage class with Immediate binding mode', async () => {
      const mockStorageClass = {
        metadata: { name: 'immediate-storage' },
        provisioner: 'kubernetes.io/gce-pd',
        volumeBindingMode: 'Immediate',
      }
      vi.spyOn(k8sService.storageClassService, 'GetOneByName').mockResolvedValue(mockStorageClass as any)

      const result = await controller.GetOneByName('immediate-storage')

      expect(result.volumeBindingMode).toBe('Immediate')
    })

    it('should get default storage class', async () => {
      const mockStorageClass = {
        metadata: {
          name: 'default',
          annotations: {
            'storageclass.kubernetes.io/is-default-class': 'true',
          },
        },
        provisioner: 'kubernetes.io/aws-ebs',
      }
      vi.spyOn(k8sService.storageClassService, 'GetOneByName').mockResolvedValue(mockStorageClass as any)

      const result = await controller.GetOneByName('default')

      expect(result.metadata.annotations['storageclass.kubernetes.io/is-default-class']).toBe('true')
    })

    it('should handle special characters in storage class name', async () => {
      const mockStorageClass = {
        metadata: { name: 'my-storage-class-123' },
        provisioner: 'kubernetes.io/aws-ebs',
      }
      vi.spyOn(k8sService.storageClassService, 'GetOneByName').mockResolvedValue(mockStorageClass as any)

      const result = await controller.GetOneByName('my-storage-class-123')

      expect(result).toEqual(mockStorageClass)
      expect(k8sService.storageClassService.GetOneByName).toHaveBeenCalledWith('my-storage-class-123')
    })
  })

  describe('Delete', () => {
    it('should delete a single storage class', async () => {
      vi.spyOn(k8sService.storageClassService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['/standard']
      await controller.Delete(nsn)

      expect(k8sService.storageClassService.Delete).toHaveBeenCalledWith('standard')
    })

    it('should delete multiple storage classes', async () => {
      vi.spyOn(k8sService.storageClassService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['/standard', '/fast-ssd', '/slow-hdd']
      await controller.Delete(nsn)

      expect(k8sService.storageClassService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.storageClassService.Delete).toHaveBeenCalledWith('standard')
      expect(k8sService.storageClassService.Delete).toHaveBeenCalledWith('fast-ssd')
      expect(k8sService.storageClassService.Delete).toHaveBeenCalledWith('slow-hdd')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.storageClassService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.storageClassService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.storageClassService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['/sc1', '/sc2', '/sc3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.storageClassService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle storage class with hyphens in name', async () => {
      vi.spyOn(k8sService.storageClassService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['/my-custom-storage-class']
      await controller.Delete(nsn)

      expect(k8sService.storageClassService.Delete).toHaveBeenCalledWith('my-custom-storage-class')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.storageClassService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['/test-storage']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should delete default storage class', async () => {
      vi.spyOn(k8sService.storageClassService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['/default']
      await controller.Delete(nsn)

      expect(k8sService.storageClassService.Delete).toHaveBeenCalledWith('default')
    })

    it('should delete storage classes with different provisioners', async () => {
      vi.spyOn(k8sService.storageClassService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['/aws-ebs-sc', '/gce-pd-sc', '/azure-disk-sc']
      await controller.Delete(nsn)

      expect(k8sService.storageClassService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.storageClassService.Delete).toHaveBeenCalledWith('aws-ebs-sc')
      expect(k8sService.storageClassService.Delete).toHaveBeenCalledWith('gce-pd-sc')
      expect(k8sService.storageClassService.Delete).toHaveBeenCalledWith('azure-disk-sc')
    })
  })

  describe('SetUniqueDefault', () => {
    it('should set a storage class as unique default', async () => {
      const mockResponse = { status: 'Success' }
      vi.spyOn(k8sService.storageClassService, 'SetUniqueDefault').mockResolvedValue(mockResponse as any)

      const result = await controller.SetUniqueDefault('standard')

      expect(result).toEqual(mockResponse)
      expect(k8sService.storageClassService.SetUniqueDefault).toHaveBeenCalledWith('standard')
    })

    it('should handle errors when setting default', async () => {
      const error = new Error('Failed to set default')
      vi.spyOn(k8sService.storageClassService, 'SetUniqueDefault').mockRejectedValue(error)

      await expect(controller.SetUniqueDefault('standard')).rejects.toThrow('Failed to set default')
    })

    it('should handle setting default for non-existent storage class', async () => {
      const error = new Error('Storage class not found')
      vi.spyOn(k8sService.storageClassService, 'SetUniqueDefault').mockRejectedValue(error)

      await expect(controller.SetUniqueDefault('nonexistent')).rejects.toThrow('Storage class not found')
    })

    it('should set AWS EBS storage class as default', async () => {
      const mockResponse = { status: 'Success' }
      vi.spyOn(k8sService.storageClassService, 'SetUniqueDefault').mockResolvedValue(mockResponse as any)

      const result = await controller.SetUniqueDefault('aws-ebs-gp2')

      expect(result).toEqual(mockResponse)
      expect(k8sService.storageClassService.SetUniqueDefault).toHaveBeenCalledWith('aws-ebs-gp2')
    })

    it('should set GCE PD storage class as default', async () => {
      const mockResponse = { status: 'Success' }
      vi.spyOn(k8sService.storageClassService, 'SetUniqueDefault').mockResolvedValue(mockResponse as any)

      const result = await controller.SetUniqueDefault('gce-pd-standard')

      expect(result).toEqual(mockResponse)
      expect(k8sService.storageClassService.SetUniqueDefault).toHaveBeenCalledWith('gce-pd-standard')
    })

    it('should set Azure Disk storage class as default', async () => {
      const mockResponse = { status: 'Success' }
      vi.spyOn(k8sService.storageClassService, 'SetUniqueDefault').mockResolvedValue(mockResponse as any)

      const result = await controller.SetUniqueDefault('azure-disk-premium')

      expect(result).toEqual(mockResponse)
      expect(k8sService.storageClassService.SetUniqueDefault).toHaveBeenCalledWith('azure-disk-premium')
    })

    it('should handle permission errors when setting default', async () => {
      const error = new Error('Forbidden: User cannot modify storage class')
      vi.spyOn(k8sService.storageClassService, 'SetUniqueDefault').mockRejectedValue(error)

      await expect(controller.SetUniqueDefault('standard')).rejects.toThrow('Forbidden')
    })

    it('should handle API timeout when setting default', async () => {
      const error = new Error('Request timeout')
      vi.spyOn(k8sService.storageClassService, 'SetUniqueDefault').mockRejectedValue(error)

      await expect(controller.SetUniqueDefault('standard')).rejects.toThrow('Request timeout')
    })
  })
})
