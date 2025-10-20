import { vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createMockClientService, createStorageClass } from '../../../../test/utils/k8s-mocks'
import { StorageClassService } from './StorageClass.service'

describe('StorageClassService', () => {
  let service: StorageClassService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getStorageV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: StorageClassService,
          useFactory: (clientService: ClientService) => {
            return new StorageClassService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<StorageClassService>(StorageClassService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all storage classes', async () => {
      const mockStorageClasses = [
        createStorageClass('standard', 'kubernetes.io/aws-ebs'),
        createStorageClass('fast-ssd', 'kubernetes.io/gce-pd'),
      ]
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: mockStorageClasses },
      })

      const result = await service.List()

      expect(result).toEqual(mockStorageClasses)
      expect(mockK8sApi.listStorageClass).toHaveBeenCalled()
    })

    it('should handle API errors when listing storage classes', async () => {
      const error = new Error('API Error')
      mockK8sApi.listStorageClass.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should return empty list when no storage classes exist', async () => {
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list storage classes with AWS EBS provisioner', async () => {
      const mockStorageClasses = [
        createStorageClass('aws-ebs-gp2', 'kubernetes.io/aws-ebs', {
          parameters: { type: 'gp2', encrypted: 'true' },
        }),
        createStorageClass('aws-ebs-io1', 'kubernetes.io/aws-ebs', {
          parameters: { type: 'io1', iopsPerGB: '10' },
        }),
      ]
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: mockStorageClasses },
      })

      const result = await service.List()

      expect(result).toEqual(mockStorageClasses)
      expect(result[0].provisioner).toBe('kubernetes.io/aws-ebs')
      expect(result[1].provisioner).toBe('kubernetes.io/aws-ebs')
    })

    it('should list storage classes with GCE PD provisioner', async () => {
      const mockStorageClasses = [
        createStorageClass('gce-pd-standard', 'kubernetes.io/gce-pd', {
          parameters: { type: 'pd-standard' },
        }),
        createStorageClass('gce-pd-ssd', 'kubernetes.io/gce-pd', {
          parameters: { 'type': 'pd-ssd', 'replication-type': 'regional-pd' },
        }),
      ]
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: mockStorageClasses },
      })

      const result = await service.List()

      expect(result).toHaveLength(2)
      expect(result[0].provisioner).toBe('kubernetes.io/gce-pd')
      expect(result[1].parameters['replication-type']).toBe('regional-pd')
    })

    it('should list storage classes with Azure Disk provisioner', async () => {
      const mockStorageClasses = [
        createStorageClass('azure-standard', 'kubernetes.io/azure-disk', {
          parameters: { storageaccounttype: 'Standard_LRS', kind: 'Managed' },
        }),
        createStorageClass('azure-premium', 'kubernetes.io/azure-disk', {
          parameters: { storageaccounttype: 'Premium_LRS', kind: 'Managed' },
        }),
      ]
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: mockStorageClasses },
      })

      const result = await service.List()

      expect(result).toHaveLength(2)
      expect(result[0].provisioner).toBe('kubernetes.io/azure-disk')
      expect(result[1].parameters.storageaccounttype).toBe('Premium_LRS')
    })

    it('should list storage classes with local provisioner', async () => {
      const mockStorageClasses = [
        createStorageClass('local-storage', 'kubernetes.io/no-provisioner', {
          volumeBindingMode: 'WaitForFirstConsumer',
          reclaimPolicy: 'Retain',
        }),
      ]
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: mockStorageClasses },
      })

      const result = await service.List()

      expect(result[0].provisioner).toBe('kubernetes.io/no-provisioner')
      expect(result[0].volumeBindingMode).toBe('WaitForFirstConsumer')
    })

    it('should list storage classes with different reclaim policies', async () => {
      const mockStorageClasses = [
        createStorageClass('sc-delete', 'kubernetes.io/aws-ebs', {
          reclaimPolicy: 'Delete',
        }),
        createStorageClass('sc-retain', 'kubernetes.io/aws-ebs', {
          reclaimPolicy: 'Retain',
        }),
        createStorageClass('sc-recycle', 'kubernetes.io/aws-ebs', {
          reclaimPolicy: 'Recycle',
        }),
      ]
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: mockStorageClasses },
      })

      const result = await service.List()

      expect(result[0].reclaimPolicy).toBe('Delete')
      expect(result[1].reclaimPolicy).toBe('Retain')
      expect(result[2].reclaimPolicy).toBe('Recycle')
    })

    it('should list storage classes with different volume binding modes', async () => {
      const mockStorageClasses = [
        createStorageClass('sc-immediate', 'kubernetes.io/aws-ebs', {
          volumeBindingMode: 'Immediate',
        }),
        createStorageClass('sc-wait', 'kubernetes.io/aws-ebs', {
          volumeBindingMode: 'WaitForFirstConsumer',
        }),
      ]
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: mockStorageClasses },
      })

      const result = await service.List()

      expect(result[0].volumeBindingMode).toBe('Immediate')
      expect(result[1].volumeBindingMode).toBe('WaitForFirstConsumer')
    })

    it('should list storage classes with default annotation', async () => {
      const mockStorageClasses = [
        createStorageClass('default', 'kubernetes.io/aws-ebs', {
          isDefault: true,
        }),
        createStorageClass('standard', 'kubernetes.io/aws-ebs'),
      ]
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: mockStorageClasses },
      })

      const result = await service.List()

      expect(result[0].metadata.annotations['storageclass.kubernetes.io/is-default-class']).toBe('true')
      expect(result[1].metadata.annotations['storageclass.kubernetes.io/is-default-class']).toBeUndefined()
    })

    it('should list storage classes with volume expansion enabled', async () => {
      const mockStorageClasses = [
        createStorageClass('expandable', 'kubernetes.io/aws-ebs', {
          allowVolumeExpansion: true,
        }),
        createStorageClass('non-expandable', 'kubernetes.io/aws-ebs', {
          allowVolumeExpansion: false,
        }),
      ]
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: mockStorageClasses },
      })

      const result = await service.List()

      expect(result[0].allowVolumeExpansion).toBe(true)
      expect(result[1].allowVolumeExpansion).toBe(false)
    })
  })

  describe('GetOneByName', () => {
    it('should get a single storage class by name', async () => {
      const mockStorageClass = createStorageClass('standard', 'kubernetes.io/aws-ebs')
      mockK8sApi.readStorageClass.mockResolvedValue({
        body: mockStorageClass,
      })

      const result = await service.GetOneByName('standard')

      expect(result).toEqual(mockStorageClass)
      expect(mockK8sApi.readStorageClass).toHaveBeenCalledWith('standard')
    })

    it('should handle not found errors', async () => {
      const error = new Error('Storage class not found')
      mockK8sApi.readStorageClass.mockRejectedValue(error)

      await expect(service.GetOneByName('nonexistent')).rejects.toThrow('Storage class not found')
    })

    it('should get AWS EBS storage class with parameters', async () => {
      const mockStorageClass = createStorageClass('aws-ebs-gp2', 'kubernetes.io/aws-ebs', {
        parameters: {
          type: 'gp2',
          encrypted: 'true',
          fsType: 'ext4',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
        },
      })
      mockK8sApi.readStorageClass.mockResolvedValue({
        body: mockStorageClass,
      })

      const result = await service.GetOneByName('aws-ebs-gp2')

      expect(result.provisioner).toBe('kubernetes.io/aws-ebs')
      expect(result.parameters.type).toBe('gp2')
      expect(result.parameters.encrypted).toBe('true')
      expect(result.parameters.fsType).toBe('ext4')
    })

    it('should get GCE PD storage class with regional replication', async () => {
      const mockStorageClass = createStorageClass('gce-pd-regional', 'kubernetes.io/gce-pd', {
        parameters: {
          'type': 'pd-ssd',
          'replication-type': 'regional-pd',
          'zones': 'us-central1-a,us-central1-b',
        },
      })
      mockK8sApi.readStorageClass.mockResolvedValue({
        body: mockStorageClass,
      })

      const result = await service.GetOneByName('gce-pd-regional')

      expect(result.provisioner).toBe('kubernetes.io/gce-pd')
      expect(result.parameters['replication-type']).toBe('regional-pd')
    })

    it('should get Azure Disk storage class with managed disk', async () => {
      const mockStorageClass = createStorageClass('azure-premium', 'kubernetes.io/azure-disk', {
        parameters: {
          storageaccounttype: 'Premium_LRS',
          kind: 'Managed',
          cachingmode: 'ReadOnly',
        },
      })
      mockK8sApi.readStorageClass.mockResolvedValue({
        body: mockStorageClass,
      })

      const result = await service.GetOneByName('azure-premium')

      expect(result.provisioner).toBe('kubernetes.io/azure-disk')
      expect(result.parameters.storageaccounttype).toBe('Premium_LRS')
      expect(result.parameters.kind).toBe('Managed')
    })

    it('should get local storage class with WaitForFirstConsumer', async () => {
      const mockStorageClass = createStorageClass('local-storage', 'kubernetes.io/no-provisioner', {
        volumeBindingMode: 'WaitForFirstConsumer',
        reclaimPolicy: 'Retain',
      })
      mockK8sApi.readStorageClass.mockResolvedValue({
        body: mockStorageClass,
      })

      const result = await service.GetOneByName('local-storage')

      expect(result.provisioner).toBe('kubernetes.io/no-provisioner')
      expect(result.volumeBindingMode).toBe('WaitForFirstConsumer')
      expect(result.reclaimPolicy).toBe('Retain')
    })

    it('should get storage class with Retain reclaim policy', async () => {
      const mockStorageClass = createStorageClass('retain-sc', 'kubernetes.io/aws-ebs', {
        reclaimPolicy: 'Retain',
      })
      mockK8sApi.readStorageClass.mockResolvedValue({
        body: mockStorageClass,
      })

      const result = await service.GetOneByName('retain-sc')

      expect(result.reclaimPolicy).toBe('Retain')
    })

    it('should get storage class with Delete reclaim policy', async () => {
      const mockStorageClass = createStorageClass('delete-sc', 'kubernetes.io/gce-pd', {
        reclaimPolicy: 'Delete',
      })
      mockK8sApi.readStorageClass.mockResolvedValue({
        body: mockStorageClass,
      })

      const result = await service.GetOneByName('delete-sc')

      expect(result.reclaimPolicy).toBe('Delete')
    })

    it('should get default storage class', async () => {
      const mockStorageClass = createStorageClass('default', 'kubernetes.io/aws-ebs', {
        isDefault: true,
      })
      mockK8sApi.readStorageClass.mockResolvedValue({
        body: mockStorageClass,
      })

      const result = await service.GetOneByName('default')

      expect(result.metadata.annotations['storageclass.kubernetes.io/is-default-class']).toBe('true')
    })

    it('should get storage class with volume expansion enabled', async () => {
      const mockStorageClass = createStorageClass('expandable', 'kubernetes.io/aws-ebs', {
        allowVolumeExpansion: true,
      })
      mockK8sApi.readStorageClass.mockResolvedValue({
        body: mockStorageClass,
      })

      const result = await service.GetOneByName('expandable')

      expect(result.allowVolumeExpansion).toBe(true)
    })

    it('should handle special characters in storage class name', async () => {
      const mockStorageClass = createStorageClass('my-custom-sc-123', 'kubernetes.io/aws-ebs')
      mockK8sApi.readStorageClass.mockResolvedValue({
        body: mockStorageClass,
      })

      const result = await service.GetOneByName('my-custom-sc-123')

      expect(result).toEqual(mockStorageClass)
      expect(mockK8sApi.readStorageClass).toHaveBeenCalledWith('my-custom-sc-123')
    })
  })

  describe('Delete', () => {
    it('should delete a storage class', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteStorageClass.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('standard')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteStorageClass).toHaveBeenCalledWith('standard')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteStorageClass.mockRejectedValue(error)

      await expect(service.Delete('test-sc')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent storage class', async () => {
      const error = new Error('Storage class not found')
      mockK8sApi.deleteStorageClass.mockRejectedValue(error)

      await expect(service.Delete('nonexistent')).rejects.toThrow('Storage class not found')
    })

    it('should delete AWS EBS storage class', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteStorageClass.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('aws-ebs-gp2')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteStorageClass).toHaveBeenCalledWith('aws-ebs-gp2')
    })

    it('should delete GCE PD storage class', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteStorageClass.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('gce-pd-ssd')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteStorageClass).toHaveBeenCalledWith('gce-pd-ssd')
    })

    it('should delete Azure Disk storage class', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteStorageClass.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('azure-premium')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteStorageClass).toHaveBeenCalledWith('azure-premium')
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete storage class')
      mockK8sApi.deleteStorageClass.mockRejectedValue(error)

      await expect(service.Delete('test-sc')).rejects.toThrow('Forbidden')
    })

    it('should handle storage class in use', async () => {
      const error = new Error('Storage class is in use by persistent volumes')
      mockK8sApi.deleteStorageClass.mockRejectedValue(error)

      await expect(service.Delete('in-use-sc')).rejects.toThrow('in use')
    })
  })

  describe('SetUniqueDefault', () => {
    it('should set a storage class as unique default', async () => {
      const mockStorageClasses = [
        createStorageClass('standard', 'kubernetes.io/aws-ebs', { isDefault: true }),
        createStorageClass('fast', 'kubernetes.io/aws-ebs'),
      ]
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: mockStorageClasses },
      })
      mockK8sApi.patchStorageClass.mockResolvedValue({
        body: { status: 'Success' },
      })

      await service.SetUniqueDefault('fast')

      // Should cancel default on 'standard' and set default on 'fast'
      expect(mockK8sApi.patchStorageClass).toHaveBeenCalledTimes(2)
      expect(mockK8sApi.patchStorageClass).toHaveBeenCalledWith(
        'standard',
        expect.objectContaining({
          metadata: {
            annotations: {
              'storageclass.kubernetes.io/is-default-class': 'false',
              'kubectl.kubernetes.io/origin': 'k8s-playgrounds',
            },
          },
        }),
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/strategic-merge-patch+json',
            'Accept': 'application/json, */*',
          },
        }),
      )
      expect(mockK8sApi.patchStorageClass).toHaveBeenCalledWith(
        'fast',
        expect.objectContaining({
          metadata: {
            annotations: {
              'storageclass.kubernetes.io/is-default-class': 'true',
              'kubectl.kubernetes.io/origin': 'k8s-playgrounds',
            },
          },
        }),
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/strategic-merge-patch+json',
            'Accept': 'application/json, */*',
          },
        }),
      )
    })

    it('should handle setting default when no previous default exists', async () => {
      const mockStorageClasses = [
        createStorageClass('standard', 'kubernetes.io/aws-ebs'),
        createStorageClass('fast', 'kubernetes.io/aws-ebs'),
      ]
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: mockStorageClasses },
      })
      mockK8sApi.patchStorageClass.mockResolvedValue({
        body: { status: 'Success' },
      })

      await service.SetUniqueDefault('standard')

      // Should only set default on 'standard', no need to cancel others
      expect(mockK8sApi.patchStorageClass).toHaveBeenCalledTimes(2)
    })

    it('should handle multiple previous defaults', async () => {
      const mockStorageClasses = [
        createStorageClass('sc1', 'kubernetes.io/aws-ebs', { isDefault: true }),
        createStorageClass('sc2', 'kubernetes.io/aws-ebs', { isDefault: true }),
        createStorageClass('sc3', 'kubernetes.io/aws-ebs'),
      ]
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: mockStorageClasses },
      })
      mockK8sApi.patchStorageClass.mockResolvedValue({
        body: { status: 'Success' },
      })

      await service.SetUniqueDefault('sc3')

      // Should cancel default on sc1 and sc2, then set default on sc3
      expect(mockK8sApi.patchStorageClass).toHaveBeenCalledTimes(3)
    })
  })

  describe('SetDefault', () => {
    it('should set storage class as default', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.patchStorageClass.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.SetDefault('standard')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.patchStorageClass).toHaveBeenCalledWith(
        'standard',
        {
          metadata: {
            annotations: {
              'storageclass.kubernetes.io/is-default-class': 'true',
              'kubectl.kubernetes.io/origin': 'k8s-playgrounds',
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

    it('should handle errors when setting default', async () => {
      const error = new Error('Patch failed')
      mockK8sApi.patchStorageClass.mockRejectedValue(error)

      await expect(service.SetDefault('standard')).rejects.toThrow('Patch failed')
    })

    it('should set AWS EBS storage class as default', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.patchStorageClass.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.SetDefault('aws-ebs-gp2')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.patchStorageClass).toHaveBeenCalledWith('aws-ebs-gp2', expect.any(Object), expect.any(String), undefined, undefined, undefined, undefined, expect.any(Object))
    })

    it('should handle permission errors when setting default', async () => {
      const error = new Error('Forbidden: User cannot patch storage class')
      mockK8sApi.patchStorageClass.mockRejectedValue(error)

      await expect(service.SetDefault('standard')).rejects.toThrow('Forbidden')
    })
  })

  describe('CancelDefault', () => {
    it('should cancel default annotation on storage class', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.patchStorageClass.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.CancelDefault('standard')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.patchStorageClass).toHaveBeenCalledWith(
        'standard',
        {
          metadata: {
            annotations: {
              'storageclass.kubernetes.io/is-default-class': 'false',
              'kubectl.kubernetes.io/origin': 'k8s-playgrounds',
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

    it('should handle errors when canceling default', async () => {
      const error = new Error('Patch failed')
      mockK8sApi.patchStorageClass.mockRejectedValue(error)

      await expect(service.CancelDefault('standard')).rejects.toThrow('Patch failed')
    })

    it('should cancel default on multiple storage classes', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.patchStorageClass.mockResolvedValue({
        body: mockResponse,
      })

      await service.CancelDefault('sc1')
      await service.CancelDefault('sc2')

      expect(mockK8sApi.patchStorageClass).toHaveBeenCalledTimes(2)
    })

    it('should handle permission errors when canceling default', async () => {
      const error = new Error('Forbidden: User cannot patch storage class')
      mockK8sApi.patchStorageClass.mockRejectedValue(error)

      await expect(service.CancelDefault('standard')).rejects.toThrow('Forbidden')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get Storage V1 API', async () => {
      const mockStorageClasses = [createStorageClass('test-sc')]
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: mockStorageClasses },
      })

      await service.List()

      expect(clientService.getStorageV1Api).toHaveBeenCalled()
    })

    it('should call getStorageV1Api for every operation', async () => {
      mockK8sApi.listStorageClass.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readStorageClass.mockResolvedValue({ body: createStorageClass('test') })
      mockK8sApi.deleteStorageClass.mockResolvedValue({ body: { status: 'Success' } })
      mockK8sApi.patchStorageClass.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByName('test')
      await service.Delete('test')
      await service.SetDefault('test')
      await service.CancelDefault('test')

      expect(clientService.getStorageV1Api).toHaveBeenCalledTimes(6)
    })

    it('should handle API client initialization errors', async () => {
      clientService.getStorageV1Api.mockImplementation(() => {
        throw new Error('Failed to initialize API client')
      })

      await expect(service.List()).rejects.toThrow('Failed to initialize API client')
    })
  })

  describe('Edge Cases', () => {
    it('should handle storage class with minimal configuration', async () => {
      const mockStorageClass = {
        metadata: { name: 'minimal' },
        provisioner: 'kubernetes.io/aws-ebs',
      }
      mockK8sApi.readStorageClass.mockResolvedValue({
        body: mockStorageClass,
      })

      const result = await service.GetOneByName('minimal')

      expect(result.metadata.name).toBe('minimal')
      expect(result.provisioner).toBe('kubernetes.io/aws-ebs')
    })

    it('should handle storage class with complex parameters', async () => {
      const mockStorageClass = createStorageClass('complex', 'kubernetes.io/aws-ebs', {
        parameters: {
          type: 'io2',
          iopsPerGB: '50',
          fsType: 'xfs',
          encrypted: 'true',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678',
          allowAutoIOPSPerGBIncrease: 'true',
        },
        allowVolumeExpansion: true,
        volumeBindingMode: 'WaitForFirstConsumer',
        reclaimPolicy: 'Retain',
      })
      mockK8sApi.readStorageClass.mockResolvedValue({
        body: mockStorageClass,
      })

      const result = await service.GetOneByName('complex')

      expect(result.parameters).toBeDefined()
      expect(Object.keys(result.parameters).length).toBeGreaterThan(3)
    })

    it('should handle storage class with custom provisioner', async () => {
      const mockStorageClass = createStorageClass('custom', 'csi.custom.com', {
        parameters: {
          customParam1: 'value1',
          customParam2: 'value2',
        },
      })
      mockK8sApi.readStorageClass.mockResolvedValue({
        body: mockStorageClass,
      })

      const result = await service.GetOneByName('custom')

      expect(result.provisioner).toBe('csi.custom.com')
    })

    it('should handle concurrent SetUniqueDefault calls', async () => {
      const mockStorageClasses = [
        createStorageClass('sc1'),
        createStorageClass('sc2'),
      ]
      mockK8sApi.listStorageClass.mockResolvedValue({
        body: { items: mockStorageClasses },
      })
      mockK8sApi.patchStorageClass.mockResolvedValue({
        body: { status: 'Success' },
      })

      await Promise.all([
        service.SetUniqueDefault('sc1'),
        service.SetUniqueDefault('sc2'),
      ])

      expect(mockK8sApi.patchStorageClass).toHaveBeenCalled()
    })
  })
})
