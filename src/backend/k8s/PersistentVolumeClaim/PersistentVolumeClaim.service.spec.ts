import { vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createMockClientService } from '../../../../test/utils/k8s-mocks'
import { PersistentVolumeClaimService } from './PersistentVolumeClaim.service'

// Helper function to create a PersistentVolumeClaim object
export function createPersistentVolumeClaim(name: string, namespace: string = 'default', overrides: any = {}) {
  return {
    metadata: {
      name,
      namespace,
      creationTimestamp: new Date().toISOString(),
      uid: `pvc-${name}-${namespace}`,
      ...overrides.metadata,
    },
    spec: {
      accessModes: ['ReadWriteOnce'],
      resources: {
        requests: {
          storage: '10Gi',
        },
      },
      storageClassName: 'standard',
      volumeMode: 'Filesystem',
      ...overrides.spec,
    },
    status: {
      phase: 'Bound',
      ...overrides.status,
    },
  }
}

describe('PersistentVolumeClaimService', () => {
  let service: PersistentVolumeClaimService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getCoreV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PersistentVolumeClaimService,
          useFactory: (clientService: ClientService) => {
            return new PersistentVolumeClaimService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<PersistentVolumeClaimService>(PersistentVolumeClaimService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all PVCs across all namespaces when no namespace specified', async () => {
      const mockPVCs = [
        createPersistentVolumeClaim('pvc-1', 'default'),
        createPersistentVolumeClaim('pvc-2', 'kube-system'),
      ]
      mockK8sApi.listPersistentVolumeClaimForAllNamespaces.mockResolvedValue({
        body: { items: mockPVCs },
      })

      const result = await service.List()

      expect(result).toEqual(mockPVCs)
      expect(mockK8sApi.listPersistentVolumeClaimForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedPersistentVolumeClaim).not.toHaveBeenCalled()
    })

    it('should list all PVCs when namespace is "null" string', async () => {
      const mockPVCs = [createPersistentVolumeClaim('pvc-1')]
      mockK8sApi.listPersistentVolumeClaimForAllNamespaces.mockResolvedValue({
        body: { items: mockPVCs },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockPVCs)
      expect(mockK8sApi.listPersistentVolumeClaimForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedPersistentVolumeClaim).not.toHaveBeenCalled()
    })

    it('should list PVCs in a specific namespace', async () => {
      const mockPVCs = [createPersistentVolumeClaim('pvc-1', 'default')]
      mockK8sApi.listNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: { items: mockPVCs },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockPVCs)
      expect(mockK8sApi.listNamespacedPersistentVolumeClaim).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listPersistentVolumeClaimForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all PVCs', async () => {
      const error = new Error('API Error')
      mockK8sApi.listPersistentVolumeClaimForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced PVCs', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedPersistentVolumeClaim.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no PVCs exist', async () => {
      mockK8sApi.listPersistentVolumeClaimForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list PVCs in kube-system namespace', async () => {
      const mockPVCs = [createPersistentVolumeClaim('system-pvc', 'kube-system')]
      mockK8sApi.listNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: { items: mockPVCs },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockPVCs)
      expect(mockK8sApi.listNamespacedPersistentVolumeClaim).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockPVCs = [createPersistentVolumeClaim('my-pvc', 'my-storage-namespace-123')]
      mockK8sApi.listNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: { items: mockPVCs },
      })

      const result = await service.List('my-storage-namespace-123')

      expect(result).toEqual(mockPVCs)
      expect(mockK8sApi.listNamespacedPersistentVolumeClaim).toHaveBeenCalledWith('my-storage-namespace-123')
    })

    it('should list PVCs with different phases', async () => {
      const mockPVCs = [
        createPersistentVolumeClaim('bound-pvc', 'default', { status: { phase: 'Bound' } }),
        createPersistentVolumeClaim('pending-pvc', 'default', { status: { phase: 'Pending' } }),
        createPersistentVolumeClaim('lost-pvc', 'default', { status: { phase: 'Lost' } }),
      ]
      mockK8sApi.listNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: { items: mockPVCs },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockPVCs)
      expect(result).toHaveLength(3)
    })

    it('should list PVCs with different access modes', async () => {
      const mockPVCs = [
        createPersistentVolumeClaim('rwo-pvc', 'default', { spec: { accessModes: ['ReadWriteOnce'] } }),
        createPersistentVolumeClaim('rom-pvc', 'default', { spec: { accessModes: ['ReadOnlyMany'] } }),
        createPersistentVolumeClaim('rwm-pvc', 'default', { spec: { accessModes: ['ReadWriteMany'] } }),
      ]
      mockK8sApi.listNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: { items: mockPVCs },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockPVCs)
      expect(result[0].spec.accessModes).toContain('ReadWriteOnce')
      expect(result[1].spec.accessModes).toContain('ReadOnlyMany')
      expect(result[2].spec.accessModes).toContain('ReadWriteMany')
    })

    it('should list PVCs with different volume modes', async () => {
      const mockPVCs = [
        createPersistentVolumeClaim('fs-pvc', 'default', { spec: { volumeMode: 'Filesystem' } }),
        createPersistentVolumeClaim('block-pvc', 'default', { spec: { volumeMode: 'Block' } }),
      ]
      mockK8sApi.listNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: { items: mockPVCs },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockPVCs)
      expect(result[0].spec.volumeMode).toBe('Filesystem')
      expect(result[1].spec.volumeMode).toBe('Block')
    })

    it('should list PVCs with different storage classes', async () => {
      const mockPVCs = [
        createPersistentVolumeClaim('standard-pvc', 'default', { spec: { storageClassName: 'standard' } }),
        createPersistentVolumeClaim('fast-pvc', 'default', { spec: { storageClassName: 'fast-ssd' } }),
        createPersistentVolumeClaim('slow-pvc', 'default', { spec: { storageClassName: 'slow-hdd' } }),
      ]
      mockK8sApi.listNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: { items: mockPVCs },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockPVCs)
      expect(result[0].spec.storageClassName).toBe('standard')
      expect(result[1].spec.storageClassName).toBe('fast-ssd')
      expect(result[2].spec.storageClassName).toBe('slow-hdd')
    })

    it('should list PVCs with different storage sizes', async () => {
      const mockPVCs = [
        createPersistentVolumeClaim('small-pvc', 'default', { spec: { resources: { requests: { storage: '1Gi' } } } }),
        createPersistentVolumeClaim('medium-pvc', 'default', { spec: { resources: { requests: { storage: '10Gi' } } } }),
        createPersistentVolumeClaim('large-pvc', 'default', { spec: { resources: { requests: { storage: '100Gi' } } } }),
      ]
      mockK8sApi.listNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: { items: mockPVCs },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockPVCs)
      expect(result[0].spec.resources.requests.storage).toBe('1Gi')
      expect(result[1].spec.resources.requests.storage).toBe('10Gi')
      expect(result[2].spec.resources.requests.storage).toBe('100Gi')
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single PVC by namespace and name', async () => {
      const mockPVC = createPersistentVolumeClaim('test-pvc', 'default')
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'test-pvc')

      expect(result).toEqual(mockPVC)
      expect(mockK8sApi.readNamespacedPersistentVolumeClaim).toHaveBeenCalledWith('test-pvc', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('PVC not found')
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('PVC not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-pvc')).rejects.toThrow('Namespace does not exist')
    })

    it('should get PVC with Pending phase', async () => {
      const mockPVC = createPersistentVolumeClaim('pending-pvc', 'default', { status: { phase: 'Pending' } })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'pending-pvc')

      expect(result).toEqual(mockPVC)
      expect(result.status?.phase).toBe('Pending')
    })

    it('should get PVC with Bound phase', async () => {
      const mockPVC = createPersistentVolumeClaim('bound-pvc', 'default', { status: { phase: 'Bound' } })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'bound-pvc')

      expect(result).toEqual(mockPVC)
      expect(result.status?.phase).toBe('Bound')
    })

    it('should get PVC with Lost phase', async () => {
      const mockPVC = createPersistentVolumeClaim('lost-pvc', 'default', { status: { phase: 'Lost' } })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'lost-pvc')

      expect(result).toEqual(mockPVC)
      expect(result.status?.phase).toBe('Lost')
    })

    it('should get PVC with ReadWriteOnce access mode', async () => {
      const mockPVC = createPersistentVolumeClaim('rwo-pvc', 'default', { spec: { accessModes: ['ReadWriteOnce'] } })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'rwo-pvc')

      expect(result).toEqual(mockPVC)
      expect(result.spec?.accessModes).toContain('ReadWriteOnce')
    })

    it('should get PVC with ReadOnlyMany access mode', async () => {
      const mockPVC = createPersistentVolumeClaim('rom-pvc', 'default', { spec: { accessModes: ['ReadOnlyMany'] } })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'rom-pvc')

      expect(result).toEqual(mockPVC)
      expect(result.spec?.accessModes).toContain('ReadOnlyMany')
    })

    it('should get PVC with ReadWriteMany access mode', async () => {
      const mockPVC = createPersistentVolumeClaim('rwm-pvc', 'default', { spec: { accessModes: ['ReadWriteMany'] } })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'rwm-pvc')

      expect(result).toEqual(mockPVC)
      expect(result.spec?.accessModes).toContain('ReadWriteMany')
    })

    it('should get PVC with multiple access modes', async () => {
      const mockPVC = createPersistentVolumeClaim('multi-access-pvc', 'default', {
        spec: { accessModes: ['ReadWriteOnce', 'ReadOnlyMany'] },
      })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'multi-access-pvc')

      expect(result.spec?.accessModes).toHaveLength(2)
      expect(result.spec?.accessModes).toContain('ReadWriteOnce')
      expect(result.spec?.accessModes).toContain('ReadOnlyMany')
    })

    it('should get PVC with Filesystem volume mode', async () => {
      const mockPVC = createPersistentVolumeClaim('fs-pvc', 'default', { spec: { volumeMode: 'Filesystem' } })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'fs-pvc')

      expect(result).toEqual(mockPVC)
      expect(result.spec?.volumeMode).toBe('Filesystem')
    })

    it('should get PVC with Block volume mode', async () => {
      const mockPVC = createPersistentVolumeClaim('block-pvc', 'default', { spec: { volumeMode: 'Block' } })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'block-pvc')

      expect(result).toEqual(mockPVC)
      expect(result.spec?.volumeMode).toBe('Block')
    })

    it('should get PVC with standard storage class', async () => {
      const mockPVC = createPersistentVolumeClaim('standard-pvc', 'default', { spec: { storageClassName: 'standard' } })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'standard-pvc')

      expect(result.spec?.storageClassName).toBe('standard')
    })

    it('should get PVC with fast-ssd storage class', async () => {
      const mockPVC = createPersistentVolumeClaim('fast-pvc', 'default', { spec: { storageClassName: 'fast-ssd' } })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'fast-pvc')

      expect(result.spec?.storageClassName).toBe('fast-ssd')
    })

    it('should get PVC without storage class', async () => {
      const mockPVC = createPersistentVolumeClaim('no-sc-pvc', 'default', { spec: { storageClassName: '' } })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'no-sc-pvc')

      expect(result.spec?.storageClassName).toBe('')
    })

    it('should handle PVC names with hyphens and numbers', async () => {
      const mockPVC = createPersistentVolumeClaim('my-pvc-123', 'default')
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'my-pvc-123')

      expect(result).toEqual(mockPVC)
      expect(mockK8sApi.readNamespacedPersistentVolumeClaim).toHaveBeenCalledWith('my-pvc-123', 'default')
    })

    it('should get PVC with volume name', async () => {
      const mockPVC = createPersistentVolumeClaim('named-vol-pvc', 'default', { spec: { volumeName: 'pv-vol-123' } })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'named-vol-pvc')

      expect(result.spec?.volumeName).toBe('pv-vol-123')
    })

    it('should get PVC with selector', async () => {
      const mockPVC = createPersistentVolumeClaim('selector-pvc', 'default', {
        spec: {
          selector: {
            matchLabels: {
              type: 'ssd',
              environment: 'production',
            },
          },
        },
      })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'selector-pvc')

      expect(result.spec?.selector?.matchLabels).toEqual({ type: 'ssd', environment: 'production' })
    })

    it('should get PVC from different namespaces', async () => {
      const mockPVC1 = createPersistentVolumeClaim('pvc-1', 'production')
      const mockPVC2 = createPersistentVolumeClaim('pvc-2', 'staging')

      mockK8sApi.readNamespacedPersistentVolumeClaim
        .mockResolvedValueOnce({ body: mockPVC1 })
        .mockResolvedValueOnce({ body: mockPVC2 })

      const result1 = await service.GetOneByNsName('production', 'pvc-1')
      const result2 = await service.GetOneByNsName('staging', 'pvc-2')

      expect(result1.metadata.namespace).toBe('production')
      expect(result2.metadata.namespace).toBe('staging')
    })
  })

  describe('Delete', () => {
    it('should delete a PVC', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-pvc', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith('test-pvc', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedPersistentVolumeClaim.mockRejectedValue(error)

      await expect(service.Delete('test-pvc', 'default')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent PVC', async () => {
      const error = new Error('PVC not found')
      mockK8sApi.deleteNamespacedPersistentVolumeClaim.mockRejectedValue(error)

      await expect(service.Delete('nonexistent', 'default')).rejects.toThrow('PVC not found')
    })

    it('should delete PVC from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-pvc', 'kube-system')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith('my-pvc', 'kube-system')
    })

    it('should handle PVC with finalizers', async () => {
      const mockResponse = { status: 'Success', metadata: { finalizers: ['kubernetes.io/pvc-protection'] } }
      mockK8sApi.deleteNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('pvc-with-finalizer', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete PVCs')
      mockK8sApi.deleteNamespacedPersistentVolumeClaim.mockRejectedValue(error)

      await expect(service.Delete('test-pvc', 'default')).rejects.toThrow('Forbidden')
    })

    it('should handle deletion of PVC in use', async () => {
      const error = new Error('PVC is in use by pod')
      mockK8sApi.deleteNamespacedPersistentVolumeClaim.mockRejectedValue(error)

      await expect(service.Delete('in-use-pvc', 'default')).rejects.toThrow('PVC is in use by pod')
    })

    it('should delete PVCs from different namespaces', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockResponse,
      })

      await service.Delete('pvc-1', 'production')
      await service.Delete('pvc-2', 'staging')
      await service.Delete('pvc-3', 'development')

      expect(mockK8sApi.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledTimes(3)
      expect(mockK8sApi.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith('pvc-1', 'production')
      expect(mockK8sApi.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith('pvc-2', 'staging')
      expect(mockK8sApi.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith('pvc-3', 'development')
    })

    it('should handle deletion with propagation policy', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-pvc', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle timeout errors during deletion', async () => {
      const error = new Error('Request timeout')
      mockK8sApi.deleteNamespacedPersistentVolumeClaim.mockRejectedValue(error)

      await expect(service.Delete('test-pvc', 'default')).rejects.toThrow('Request timeout')
    })

    it('should handle API server errors during deletion', async () => {
      const error = new Error('Internal server error')
      mockK8sApi.deleteNamespacedPersistentVolumeClaim.mockRejectedValue(error)

      await expect(service.Delete('test-pvc', 'default')).rejects.toThrow('Internal server error')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s API', async () => {
      const mockPVCs = [createPersistentVolumeClaim('test-pvc')]
      mockK8sApi.listPersistentVolumeClaimForAllNamespaces.mockResolvedValue({
        body: { items: mockPVCs },
      })

      await service.List()

      expect(clientService.getCoreV1Api).toHaveBeenCalled()
    })

    it('should call getCoreV1Api for every operation', async () => {
      mockK8sApi.listPersistentVolumeClaimForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({ body: createPersistentVolumeClaim('test') })
      mockK8sApi.deleteNamespacedPersistentVolumeClaim.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('test', 'default')

      expect(clientService.getCoreV1Api).toHaveBeenCalledTimes(4)
    })

    it('should handle multiple concurrent operations', async () => {
      mockK8sApi.listNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: { items: [createPersistentVolumeClaim('test')] },
      })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: createPersistentVolumeClaim('test'),
      })

      await Promise.all([
        service.List('default'),
        service.List('kube-system'),
        service.GetOneByNsName('default', 'test'),
      ])

      expect(clientService.getCoreV1Api).toHaveBeenCalledTimes(4)
    })
  })

  describe('Edge Cases', () => {
    it('should handle PVC with very large storage request', async () => {
      const mockPVC = createPersistentVolumeClaim('large-pvc', 'default', {
        spec: { resources: { requests: { storage: '10Ti' } } },
      })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'large-pvc')

      expect(result.spec?.resources?.requests?.storage).toBe('10Ti')
    })

    it('should handle PVC with annotations', async () => {
      const mockPVC = createPersistentVolumeClaim('annotated-pvc', 'default', {
        metadata: {
          annotations: {
            'volume.beta.kubernetes.io/storage-provisioner': 'kubernetes.io/aws-ebs',
            'pv.kubernetes.io/bind-completed': 'yes',
            'pv.kubernetes.io/bound-by-controller': 'yes',
          },
        },
      })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'annotated-pvc')

      expect(result.metadata?.annotations).toBeDefined()
      expect(result.metadata?.annotations?.['volume.beta.kubernetes.io/storage-provisioner']).toBe('kubernetes.io/aws-ebs')
    })

    it('should handle PVC with labels', async () => {
      const mockPVC = createPersistentVolumeClaim('labeled-pvc', 'default', {
        metadata: {
          labels: {
            app: 'database',
            environment: 'production',
            tier: 'storage',
          },
        },
      })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'labeled-pvc')

      expect(result.metadata?.labels).toBeDefined()
      expect(result.metadata?.labels?.app).toBe('database')
      expect(result.metadata?.labels?.environment).toBe('production')
      expect(result.metadata?.labels?.tier).toBe('storage')
    })

    it('should handle PVC with data source', async () => {
      const mockPVC = createPersistentVolumeClaim('datasource-pvc', 'default', {
        spec: {
          dataSource: {
            name: 'source-pvc',
            kind: 'PersistentVolumeClaim',
          },
        },
      })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'datasource-pvc')

      expect(result.spec?.dataSource).toBeDefined()
      expect(result.spec?.dataSource?.name).toBe('source-pvc')
      expect(result.spec?.dataSource?.kind).toBe('PersistentVolumeClaim')
    })

    it('should handle PVC with conditions in status', async () => {
      const mockPVC = createPersistentVolumeClaim('conditional-pvc', 'default', {
        status: {
          phase: 'Bound',
          conditions: [
            {
              type: 'Resizing',
              status: 'True',
              lastTransitionTime: new Date().toISOString(),
            },
          ],
        },
      })
      mockK8sApi.readNamespacedPersistentVolumeClaim.mockResolvedValue({
        body: mockPVC,
      })

      const result = await service.GetOneByNsName('default', 'conditional-pvc')

      expect(result.status?.conditions).toBeDefined()
      expect(result.status?.conditions?.[0].type).toBe('Resizing')
    })
  })
})
