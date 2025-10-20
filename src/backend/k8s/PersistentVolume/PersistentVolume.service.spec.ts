import { vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createMockClientService } from '../../../../test/utils/k8s-mocks'
import { PersistentVolumeService } from './PersistentVolume.service'

// Helper function to create PersistentVolume test data
export function createPersistentVolume(name: string, overrides: any = {}) {
  return {
    metadata: {
      name,
      creationTimestamp: new Date().toISOString(),
      uid: `pv-${name}`,
    },
    spec: {
      capacity: {
        storage: '10Gi',
      },
      accessModes: ['ReadWriteOnce'],
      persistentVolumeReclaimPolicy: 'Retain',
      storageClassName: 'standard',
      ...overrides.spec,
    },
    status: {
      phase: 'Available',
      ...overrides.status,
    },
  }
}

describe('PersistentVolumeService', () => {
  let service: PersistentVolumeService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getCoreV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PersistentVolumeService,
          useFactory: (clientService: ClientService) => {
            return new PersistentVolumeService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<PersistentVolumeService>(PersistentVolumeService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all persistent volumes', async () => {
      const mockPVs = [
        createPersistentVolume('pv-1'),
        createPersistentVolume('pv-2'),
      ]
      mockK8sApi.listPersistentVolume.mockResolvedValue({
        body: { items: mockPVs },
      })

      const result = await service.List()

      expect(result).toEqual(mockPVs)
      expect(mockK8sApi.listPersistentVolume).toHaveBeenCalled()
    })

    it('should return empty list when no PVs exist', async () => {
      mockK8sApi.listPersistentVolume.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list PVs with Available phase', async () => {
      const mockPVs = [
        createPersistentVolume('pv-available', {
          status: { phase: 'Available' },
        }),
      ]
      mockK8sApi.listPersistentVolume.mockResolvedValue({
        body: { items: mockPVs },
      })

      const result = await service.List()

      expect(result).toEqual(mockPVs)
      expect(result[0].status.phase).toBe('Available')
    })

    it('should list PVs with Bound phase', async () => {
      const mockPVs = [
        createPersistentVolume('pv-bound', {
          status: { phase: 'Bound' },
          spec: {
            claimRef: {
              namespace: 'default',
              name: 'test-pvc',
            },
          },
        }),
      ]
      mockK8sApi.listPersistentVolume.mockResolvedValue({
        body: { items: mockPVs },
      })

      const result = await service.List()

      expect(result).toEqual(mockPVs)
      expect(result[0].status.phase).toBe('Bound')
      expect(result[0].spec.claimRef).toBeDefined()
    })

    it('should list PVs with Released phase', async () => {
      const mockPVs = [
        createPersistentVolume('pv-released', {
          status: { phase: 'Released' },
        }),
      ]
      mockK8sApi.listPersistentVolume.mockResolvedValue({
        body: { items: mockPVs },
      })

      const result = await service.List()

      expect(result).toEqual(mockPVs)
      expect(result[0].status.phase).toBe('Released')
    })

    it('should list PVs with Failed phase', async () => {
      const mockPVs = [
        createPersistentVolume('pv-failed', {
          status: {
            phase: 'Failed',
            message: 'Volume provisioning failed',
          },
        }),
      ]
      mockK8sApi.listPersistentVolume.mockResolvedValue({
        body: { items: mockPVs },
      })

      const result = await service.List()

      expect(result).toEqual(mockPVs)
      expect(result[0].status.phase).toBe('Failed')
      expect(result[0].status.message).toBeDefined()
    })

    it('should list PVs with different access modes', async () => {
      const mockPVs = [
        createPersistentVolume('pv-rwo', {
          spec: { accessModes: ['ReadWriteOnce'] },
        }),
        createPersistentVolume('pv-rwx', {
          spec: { accessModes: ['ReadWriteMany'] },
        }),
        createPersistentVolume('pv-rox', {
          spec: { accessModes: ['ReadOnlyMany'] },
        }),
      ]
      mockK8sApi.listPersistentVolume.mockResolvedValue({
        body: { items: mockPVs },
      })

      const result = await service.List()

      expect(result).toEqual(mockPVs)
      expect(result[0].spec.accessModes).toContain('ReadWriteOnce')
      expect(result[1].spec.accessModes).toContain('ReadWriteMany')
      expect(result[2].spec.accessModes).toContain('ReadOnlyMany')
    })

    it('should list PVs with different storage classes', async () => {
      const mockPVs = [
        createPersistentVolume('pv-standard', {
          spec: { storageClassName: 'standard' },
        }),
        createPersistentVolume('pv-fast', {
          spec: { storageClassName: 'fast-ssd' },
        }),
        createPersistentVolume('pv-slow', {
          spec: { storageClassName: 'slow-hdd' },
        }),
      ]
      mockK8sApi.listPersistentVolume.mockResolvedValue({
        body: { items: mockPVs },
      })

      const result = await service.List()

      expect(result).toEqual(mockPVs)
      expect(result[0].spec.storageClassName).toBe('standard')
      expect(result[1].spec.storageClassName).toBe('fast-ssd')
      expect(result[2].spec.storageClassName).toBe('slow-hdd')
    })

    it('should list PVs with different reclaim policies', async () => {
      const mockPVs = [
        createPersistentVolume('pv-retain', {
          spec: { persistentVolumeReclaimPolicy: 'Retain' },
        }),
        createPersistentVolume('pv-delete', {
          spec: { persistentVolumeReclaimPolicy: 'Delete' },
        }),
        createPersistentVolume('pv-recycle', {
          spec: { persistentVolumeReclaimPolicy: 'Recycle' },
        }),
      ]
      mockK8sApi.listPersistentVolume.mockResolvedValue({
        body: { items: mockPVs },
      })

      const result = await service.List()

      expect(result).toEqual(mockPVs)
      expect(result[0].spec.persistentVolumeReclaimPolicy).toBe('Retain')
      expect(result[1].spec.persistentVolumeReclaimPolicy).toBe('Delete')
      expect(result[2].spec.persistentVolumeReclaimPolicy).toBe('Recycle')
    })

    it('should list PVs with NFS volume type', async () => {
      const mockPVs = [
        createPersistentVolume('pv-nfs', {
          spec: {
            nfs: {
              server: '192.168.1.100',
              path: '/exports/data',
            },
          },
        }),
      ]
      mockK8sApi.listPersistentVolume.mockResolvedValue({
        body: { items: mockPVs },
      })

      const result = await service.List()

      expect(result).toEqual(mockPVs)
      expect(result[0].spec.nfs).toBeDefined()
      expect(result[0].spec.nfs.server).toBe('192.168.1.100')
      expect(result[0].spec.nfs.path).toBe('/exports/data')
    })

    it('should list PVs with hostPath volume type', async () => {
      const mockPVs = [
        createPersistentVolume('pv-hostpath', {
          spec: {
            hostPath: {
              path: '/mnt/data',
              type: 'DirectoryOrCreate',
            },
          },
        }),
      ]
      mockK8sApi.listPersistentVolume.mockResolvedValue({
        body: { items: mockPVs },
      })

      const result = await service.List()

      expect(result).toEqual(mockPVs)
      expect(result[0].spec.hostPath).toBeDefined()
      expect(result[0].spec.hostPath.path).toBe('/mnt/data')
    })

    it('should list PVs with CSI volume type', async () => {
      const mockPVs = [
        createPersistentVolume('pv-csi', {
          spec: {
            csi: {
              driver: 'csi.example.com',
              volumeHandle: 'vol-12345',
              fsType: 'ext4',
            },
          },
        }),
      ]
      mockK8sApi.listPersistentVolume.mockResolvedValue({
        body: { items: mockPVs },
      })

      const result = await service.List()

      expect(result).toEqual(mockPVs)
      expect(result[0].spec.csi).toBeDefined()
      expect(result[0].spec.csi.driver).toBe('csi.example.com')
      expect(result[0].spec.csi.volumeHandle).toBe('vol-12345')
    })

    it('should list PVs with different capacities', async () => {
      const mockPVs = [
        createPersistentVolume('pv-small', {
          spec: { capacity: { storage: '1Gi' } },
        }),
        createPersistentVolume('pv-medium', {
          spec: { capacity: { storage: '10Gi' } },
        }),
        createPersistentVolume('pv-large', {
          spec: { capacity: { storage: '100Gi' } },
        }),
      ]
      mockK8sApi.listPersistentVolume.mockResolvedValue({
        body: { items: mockPVs },
      })

      const result = await service.List()

      expect(result).toEqual(mockPVs)
      expect(result[0].spec.capacity.storage).toBe('1Gi')
      expect(result[1].spec.capacity.storage).toBe('10Gi')
      expect(result[2].spec.capacity.storage).toBe('100Gi')
    })

    it('should handle API errors when listing PVs', async () => {
      const error = new Error('API Error')
      mockK8sApi.listPersistentVolume.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot list PersistentVolumes')
      mockK8sApi.listPersistentVolume.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('Forbidden')
    })

    it('should handle connection errors', async () => {
      const error = new Error('Connection refused')
      mockK8sApi.listPersistentVolume.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('Connection refused')
    })
  })

  describe('GetOneByName', () => {
    it('should get a single PV by name', async () => {
      const mockPV = createPersistentVolume('test-pv')
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('test-pv')

      expect(result).toEqual(mockPV)
      expect(mockK8sApi.readPersistentVolume).toHaveBeenCalledWith('test-pv')
    })

    it('should get PV with Available phase', async () => {
      const mockPV = createPersistentVolume('pv-available', {
        status: { phase: 'Available' },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-available')

      expect(result).toEqual(mockPV)
      expect(result.status.phase).toBe('Available')
    })

    it('should get PV with Bound phase', async () => {
      const mockPV = createPersistentVolume('pv-bound', {
        status: { phase: 'Bound' },
        spec: {
          claimRef: {
            namespace: 'default',
            name: 'test-pvc',
            uid: 'pvc-12345',
          },
        },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-bound')

      expect(result).toEqual(mockPV)
      expect(result.status.phase).toBe('Bound')
      expect(result.spec.claimRef).toBeDefined()
      expect(result.spec.claimRef.name).toBe('test-pvc')
      expect(result.spec.claimRef.namespace).toBe('default')
    })

    it('should get PV with Released phase', async () => {
      const mockPV = createPersistentVolume('pv-released', {
        status: { phase: 'Released' },
        spec: {
          claimRef: {
            namespace: 'default',
            name: 'deleted-pvc',
          },
        },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-released')

      expect(result).toEqual(mockPV)
      expect(result.status.phase).toBe('Released')
    })

    it('should get PV with Failed phase', async () => {
      const mockPV = createPersistentVolume('pv-failed', {
        status: {
          phase: 'Failed',
          message: 'Volume provisioning failed',
          reason: 'ProvisioningFailed',
        },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-failed')

      expect(result).toEqual(mockPV)
      expect(result.status.phase).toBe('Failed')
      expect(result.status.message).toBe('Volume provisioning failed')
      expect(result.status.reason).toBe('ProvisioningFailed')
    })

    it('should get PV with ReadWriteOnce access mode', async () => {
      const mockPV = createPersistentVolume('pv-rwo', {
        spec: { accessModes: ['ReadWriteOnce'] },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-rwo')

      expect(result.spec.accessModes).toContain('ReadWriteOnce')
    })

    it('should get PV with ReadWriteMany access mode', async () => {
      const mockPV = createPersistentVolume('pv-rwx', {
        spec: { accessModes: ['ReadWriteMany'] },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-rwx')

      expect(result.spec.accessModes).toContain('ReadWriteMany')
    })

    it('should get PV with ReadOnlyMany access mode', async () => {
      const mockPV = createPersistentVolume('pv-rox', {
        spec: { accessModes: ['ReadOnlyMany'] },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-rox')

      expect(result.spec.accessModes).toContain('ReadOnlyMany')
    })

    it('should get PV with multiple access modes', async () => {
      const mockPV = createPersistentVolume('pv-multi', {
        spec: { accessModes: ['ReadWriteOnce', 'ReadOnlyMany'] },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-multi')

      expect(result.spec.accessModes).toContain('ReadWriteOnce')
      expect(result.spec.accessModes).toContain('ReadOnlyMany')
    })

    it('should get PV with Retain reclaim policy', async () => {
      const mockPV = createPersistentVolume('pv-retain', {
        spec: { persistentVolumeReclaimPolicy: 'Retain' },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-retain')

      expect(result.spec.persistentVolumeReclaimPolicy).toBe('Retain')
    })

    it('should get PV with Delete reclaim policy', async () => {
      const mockPV = createPersistentVolume('pv-delete', {
        spec: { persistentVolumeReclaimPolicy: 'Delete' },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-delete')

      expect(result.spec.persistentVolumeReclaimPolicy).toBe('Delete')
    })

    it('should get PV with storage class', async () => {
      const mockPV = createPersistentVolume('pv-with-class', {
        spec: { storageClassName: 'fast-ssd' },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-with-class')

      expect(result.spec.storageClassName).toBe('fast-ssd')
    })

    it('should get PV with NFS volume', async () => {
      const mockPV = createPersistentVolume('pv-nfs', {
        spec: {
          nfs: {
            server: '192.168.1.100',
            path: '/exports/data',
            readOnly: false,
          },
        },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-nfs')

      expect(result.spec.nfs).toBeDefined()
      expect(result.spec.nfs.server).toBe('192.168.1.100')
      expect(result.spec.nfs.path).toBe('/exports/data')
    })

    it('should get PV with hostPath volume', async () => {
      const mockPV = createPersistentVolume('pv-hostpath', {
        spec: {
          hostPath: {
            path: '/mnt/data',
            type: 'DirectoryOrCreate',
          },
        },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-hostpath')

      expect(result.spec.hostPath).toBeDefined()
      expect(result.spec.hostPath.path).toBe('/mnt/data')
      expect(result.spec.hostPath.type).toBe('DirectoryOrCreate')
    })

    it('should get PV with CSI volume', async () => {
      const mockPV = createPersistentVolume('pv-csi', {
        spec: {
          csi: {
            driver: 'csi.example.com',
            volumeHandle: 'vol-12345',
            fsType: 'ext4',
            volumeAttributes: {
              storage: 'premium',
            },
          },
        },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-csi')

      expect(result.spec.csi).toBeDefined()
      expect(result.spec.csi.driver).toBe('csi.example.com')
      expect(result.spec.csi.volumeHandle).toBe('vol-12345')
      expect(result.spec.csi.fsType).toBe('ext4')
    })

    it('should get PV with AWS EBS volume', async () => {
      const mockPV = createPersistentVolume('pv-ebs', {
        spec: {
          awsElasticBlockStore: {
            volumeID: 'vol-12345',
            fsType: 'ext4',
          },
        },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-ebs')

      expect(result.spec.awsElasticBlockStore).toBeDefined()
      expect(result.spec.awsElasticBlockStore.volumeID).toBe('vol-12345')
    })

    it('should get PV with node affinity', async () => {
      const mockPV = createPersistentVolume('pv-affinity', {
        spec: {
          nodeAffinity: {
            required: {
              nodeSelectorTerms: [
                {
                  matchExpressions: [
                    {
                      key: 'kubernetes.io/hostname',
                      operator: 'In',
                      values: ['node-1'],
                    },
                  ],
                },
              ],
            },
          },
        },
      })
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-affinity')

      expect(result.spec.nodeAffinity).toBeDefined()
    })

    it('should handle not found errors', async () => {
      const error = new Error('PersistentVolume not found')
      mockK8sApi.readPersistentVolume.mockRejectedValue(error)

      await expect(service.GetOneByName('nonexistent')).rejects.toThrow('PersistentVolume not found')
    })

    it('should handle API errors', async () => {
      const error = new Error('API error')
      mockK8sApi.readPersistentVolume.mockRejectedValue(error)

      await expect(service.GetOneByName('test-pv')).rejects.toThrow('API error')
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot get PersistentVolume')
      mockK8sApi.readPersistentVolume.mockRejectedValue(error)

      await expect(service.GetOneByName('test-pv')).rejects.toThrow('Forbidden')
    })

    it('should handle special characters in PV name', async () => {
      const mockPV = createPersistentVolume('pv-test-123')
      mockK8sApi.readPersistentVolume.mockResolvedValue({
        body: mockPV,
      })

      const result = await service.GetOneByName('pv-test-123')

      expect(result).toEqual(mockPV)
      expect(mockK8sApi.readPersistentVolume).toHaveBeenCalledWith('pv-test-123')
    })
  })

  describe('Delete', () => {
    it('should delete a PV', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deletePersistentVolume.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-pv')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deletePersistentVolume).toHaveBeenCalledWith('test-pv')
    })

    it('should delete PV with Available phase', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deletePersistentVolume.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('pv-available')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deletePersistentVolume).toHaveBeenCalledWith('pv-available')
    })

    it('should delete PV with Bound phase', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deletePersistentVolume.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('pv-bound')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deletePersistentVolume).toHaveBeenCalledWith('pv-bound')
    })

    it('should delete PV with Released phase', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deletePersistentVolume.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('pv-released')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deletePersistentVolume).toHaveBeenCalledWith('pv-released')
    })

    it('should delete PV with Failed phase', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deletePersistentVolume.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('pv-failed')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deletePersistentVolume).toHaveBeenCalledWith('pv-failed')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deletePersistentVolume.mockRejectedValue(error)

      await expect(service.Delete('test-pv')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent PV', async () => {
      const error = new Error('PersistentVolume not found')
      mockK8sApi.deletePersistentVolume.mockRejectedValue(error)

      await expect(service.Delete('nonexistent')).rejects.toThrow('PersistentVolume not found')
    })

    it('should handle PV with finalizers', async () => {
      const mockResponse = {
        status: 'Success',
        metadata: {
          finalizers: ['kubernetes.io/pv-protection'],
          deletionTimestamp: new Date().toISOString(),
        },
      }
      mockK8sApi.deletePersistentVolume.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('pv-with-finalizer')

      expect(result).toEqual(mockResponse)
      expect(result.metadata.finalizers).toBeDefined()
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = {
        status: 'Success',
        metadata: { deletionTimestamp: new Date().toISOString() },
      }
      mockK8sApi.deletePersistentVolume.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete PersistentVolume')
      mockK8sApi.deletePersistentVolume.mockRejectedValue(error)

      await expect(service.Delete('test-pv')).rejects.toThrow('Forbidden')
    })

    it('should handle PV with Retain policy deletion', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deletePersistentVolume.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('pv-retain')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deletePersistentVolume).toHaveBeenCalledWith('pv-retain')
    })

    it('should handle PV with Delete policy deletion', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deletePersistentVolume.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('pv-delete')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deletePersistentVolume).toHaveBeenCalledWith('pv-delete')
    })

    it('should handle deletion with special characters in name', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deletePersistentVolume.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('pv-test-123')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deletePersistentVolume).toHaveBeenCalledWith('pv-test-123')
    })

    it('should handle conflict errors during deletion', async () => {
      const error = new Error('Conflict: PersistentVolume is being modified')
      mockK8sApi.deletePersistentVolume.mockRejectedValue(error)

      await expect(service.Delete('test-pv')).rejects.toThrow('Conflict')
    })

    it('should handle timeout errors during deletion', async () => {
      const error = new Error('Timeout: Request timed out')
      mockK8sApi.deletePersistentVolume.mockRejectedValue(error)

      await expect(service.Delete('test-pv')).rejects.toThrow('Timeout')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s API', async () => {
      const mockPVs = [createPersistentVolume('test-pv')]
      mockK8sApi.listPersistentVolume.mockResolvedValue({
        body: { items: mockPVs },
      })

      await service.List()

      expect(clientService.getCoreV1Api).toHaveBeenCalled()
    })

    it('should call getCoreV1Api for every operation', async () => {
      mockK8sApi.listPersistentVolume.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readPersistentVolume.mockResolvedValue({ body: createPersistentVolume('test') })
      mockK8sApi.deletePersistentVolume.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByName('test')
      await service.Delete('test')

      expect(clientService.getCoreV1Api).toHaveBeenCalledTimes(4)
    })

    it('should handle API client initialization errors', async () => {
      clientService.getCoreV1Api.mockImplementationOnce(() => {
        throw new Error('Failed to initialize API client')
      })

      await expect(service.List()).rejects.toThrow('Failed to initialize API client')
    })
  })
})
