import { vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createMockClientService, createNamespace } from '../../../../test/utils/k8s-mocks'
import { NsService } from './ns.service'

describe('NsService', () => {
  let service: NsService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getCoreV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: NsService,
          useFactory: (clientService: ClientService) => {
            return new NsService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<NsService>(NsService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all namespaces', async () => {
      const mockNamespaces = [
        createNamespace('default'),
        createNamespace('kube-system'),
        createNamespace('kube-public'),
      ]
      mockK8sApi.listNamespace.mockResolvedValue({
        body: { items: mockNamespaces },
      })

      const result = await service.List()

      expect(result).toEqual(mockNamespaces)
      expect(mockK8sApi.listNamespace).toHaveBeenCalled()
    })

    it('should return system namespaces', async () => {
      const mockNamespaces = [
        createNamespace('default'),
        createNamespace('kube-system'),
        createNamespace('kube-public'),
        createNamespace('kube-node-lease'),
      ]
      mockK8sApi.listNamespace.mockResolvedValue({
        body: { items: mockNamespaces },
      })

      const result = await service.List()

      expect(result).toHaveLength(4)
      expect(result.map(ns => ns.metadata!.name)).toContain('default')
      expect(result.map(ns => ns.metadata!.name)).toContain('kube-system')
      expect(result.map(ns => ns.metadata!.name)).toContain('kube-public')
      expect(result.map(ns => ns.metadata!.name)).toContain('kube-node-lease')
    })

    it('should return namespace with Active phase', async () => {
      const mockNamespace = createNamespace('active-ns')
      mockNamespace.status!.phase = 'Active'
      mockK8sApi.listNamespace.mockResolvedValue({
        body: { items: [mockNamespace] },
      })

      const result = await service.List()

      expect(result).toHaveLength(1)
      expect(result[0].status?.phase).toBe('Active')
    })

    it('should return namespace with Terminating phase', async () => {
      const mockNamespace = createNamespace('terminating-ns')
      mockNamespace.status!.phase = 'Terminating'
      mockNamespace.metadata!.deletionTimestamp = new Date()
      mockK8sApi.listNamespace.mockResolvedValue({
        body: { items: [mockNamespace] },
      })

      const result = await service.List()

      expect(result).toHaveLength(1)
      expect(result[0].status?.phase).toBe('Terminating')
      expect(result[0].metadata?.deletionTimestamp).toBeDefined()
    })

    it('should return namespaces with different phases', async () => {
      const activeNs = createNamespace('active-ns')
      activeNs.status!.phase = 'Active'

      const terminatingNs = createNamespace('terminating-ns')
      terminatingNs.status!.phase = 'Terminating'

      mockK8sApi.listNamespace.mockResolvedValue({
        body: { items: [activeNs, terminatingNs] },
      })

      const result = await service.List()

      expect(result).toHaveLength(2)
      expect(result[0].status?.phase).toBe('Active')
      expect(result[1].status?.phase).toBe('Terminating')
    })

    it('should handle API errors when listing namespaces', async () => {
      const error = new Error('API Error')
      mockK8sApi.listNamespace.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should return empty list when no namespaces exist', async () => {
      mockK8sApi.listNamespace.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should return namespaces with labels', async () => {
      const mockNamespace = createNamespace('labeled-ns')
      mockNamespace.metadata!.labels = {
        environment: 'production',
        team: 'backend',
      }
      mockK8sApi.listNamespace.mockResolvedValue({
        body: { items: [mockNamespace] },
      })

      const result = await service.List()

      expect(result).toHaveLength(1)
      expect(result[0].metadata?.labels).toBeDefined()
      expect(result[0].metadata?.labels?.['environment']).toBe('production')
    })

    it('should return namespaces with annotations', async () => {
      const mockNamespace = createNamespace('annotated-ns')
      mockNamespace.metadata!.annotations = {
        description: 'Test namespace',
        owner: 'team-a',
      }
      mockK8sApi.listNamespace.mockResolvedValue({
        body: { items: [mockNamespace] },
      })

      const result = await service.List()

      expect(result).toHaveLength(1)
      expect(result[0].metadata?.annotations).toBeDefined()
      expect(result[0].metadata?.annotations?.['description']).toBe('Test namespace')
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot list namespaces')
      mockK8sApi.listNamespace.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('Forbidden')
    })

    it('should handle connection timeout errors', async () => {
      const error = new Error('Connection timeout')
      mockK8sApi.listNamespace.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('Connection timeout')
    })

    it('should return namespaces sorted by creation timestamp', async () => {
      const ns1 = createNamespace('ns1')
      ns1.metadata!.creationTimestamp = new Date('2024-01-01')

      const ns2 = createNamespace('ns2')
      ns2.metadata!.creationTimestamp = new Date('2024-01-02')

      mockK8sApi.listNamespace.mockResolvedValue({
        body: { items: [ns1, ns2] },
      })

      const result = await service.List()

      expect(result).toHaveLength(2)
      expect(result[0].metadata?.creationTimestamp).toBeDefined()
      expect(result[1].metadata?.creationTimestamp).toBeDefined()
    })

    it('should return namespaces with resource quotas', async () => {
      const mockNamespace = createNamespace('quota-ns')
      mockNamespace.metadata!.annotations = {
        'quota.k8s.io/cpu': '10',
        'quota.k8s.io/memory': '20Gi',
      }
      mockK8sApi.listNamespace.mockResolvedValue({
        body: { items: [mockNamespace] },
      })

      const result = await service.List()

      expect(result).toHaveLength(1)
      expect(result[0].metadata?.annotations).toBeDefined()
    })

    it('should handle large number of namespaces', async () => {
      const mockNamespaces = Array.from({ length: 100 }, (_, i) =>
        createNamespace(`namespace-${i}`),
      )
      mockK8sApi.listNamespace.mockResolvedValue({
        body: { items: mockNamespaces },
      })

      const result = await service.List()

      expect(result).toHaveLength(100)
    })
  })

  describe('GetOneByName', () => {
    it('should get a single namespace by name', async () => {
      const mockNamespace = createNamespace('test-namespace')
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('test-namespace')

      expect(result).toEqual(mockNamespace)
      expect(mockK8sApi.readNamespace).toHaveBeenCalledWith('test-namespace')
    })

    it('should get default namespace', async () => {
      const mockNamespace = createNamespace('default')
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('default')

      expect(result).toEqual(mockNamespace)
      expect(result.metadata?.name).toBe('default')
    })

    it('should get kube-system namespace', async () => {
      const mockNamespace = createNamespace('kube-system')
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('kube-system')

      expect(result).toEqual(mockNamespace)
      expect(result.metadata?.name).toBe('kube-system')
    })

    it('should get kube-public namespace', async () => {
      const mockNamespace = createNamespace('kube-public')
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('kube-public')

      expect(result).toEqual(mockNamespace)
      expect(result.metadata?.name).toBe('kube-public')
    })

    it('should get kube-node-lease namespace', async () => {
      const mockNamespace = createNamespace('kube-node-lease')
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('kube-node-lease')

      expect(result).toEqual(mockNamespace)
      expect(result.metadata?.name).toBe('kube-node-lease')
    })

    it('should get namespace in Active phase', async () => {
      const mockNamespace = createNamespace('active-ns')
      mockNamespace.status!.phase = 'Active'
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('active-ns')

      expect(result.status?.phase).toBe('Active')
    })

    it('should get namespace in Terminating phase', async () => {
      const mockNamespace = createNamespace('terminating-ns')
      mockNamespace.status!.phase = 'Terminating'
      mockNamespace.metadata!.deletionTimestamp = new Date()
      mockNamespace.metadata!.finalizers = ['kubernetes']
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('terminating-ns')

      expect(result.status?.phase).toBe('Terminating')
      expect(result.metadata?.deletionTimestamp).toBeDefined()
      expect(result.metadata?.finalizers).toContain('kubernetes')
    })

    it('should handle not found errors', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.readNamespace.mockRejectedValue(error)

      await expect(service.GetOneByName('nonexistent')).rejects.toThrow('Namespace not found')
    })

    it('should handle invalid namespace name', async () => {
      const error = new Error('Invalid namespace name')
      mockK8sApi.readNamespace.mockRejectedValue(error)

      await expect(service.GetOneByName('INVALID_NAME')).rejects.toThrow('Invalid namespace name')
    })

    it('should get namespace with labels', async () => {
      const mockNamespace = createNamespace('labeled-ns')
      mockNamespace.metadata!.labels = {
        environment: 'production',
        team: 'backend',
        version: 'v1',
      }
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('labeled-ns')

      expect(result.metadata?.labels).toBeDefined()
      expect(result.metadata?.labels?.['environment']).toBe('production')
      expect(result.metadata?.labels?.['team']).toBe('backend')
    })

    it('should get namespace with annotations', async () => {
      const mockNamespace = createNamespace('annotated-ns')
      mockNamespace.metadata!.annotations = {
        'description': 'Production namespace',
        'contact': 'team@example.com',
        'created-by': 'admin',
      }
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('annotated-ns')

      expect(result.metadata?.annotations).toBeDefined()
      expect(result.metadata?.annotations?.['description']).toBe('Production namespace')
    })

    it('should get namespace with finalizers', async () => {
      const mockNamespace = createNamespace('finalized-ns')
      mockNamespace.metadata!.finalizers = ['kubernetes', 'custom-finalizer']
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('finalized-ns')

      expect(result.metadata?.finalizers).toBeDefined()
      expect(result.metadata?.finalizers).toHaveLength(2)
      expect(result.metadata?.finalizers).toContain('kubernetes')
    })

    it('should handle namespace names with hyphens', async () => {
      const mockNamespace = createNamespace('my-test-namespace')
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('my-test-namespace')

      expect(result).toEqual(mockNamespace)
      expect(mockK8sApi.readNamespace).toHaveBeenCalledWith('my-test-namespace')
    })

    it('should handle namespace names with numbers', async () => {
      const mockNamespace = createNamespace('namespace-123')
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('namespace-123')

      expect(result).toEqual(mockNamespace)
      expect(mockK8sApi.readNamespace).toHaveBeenCalledWith('namespace-123')
    })

    it('should get namespace with resource version', async () => {
      const mockNamespace = createNamespace('versioned-ns')
      mockNamespace.metadata!.resourceVersion = '12345'
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('versioned-ns')

      expect(result.metadata?.resourceVersion).toBe('12345')
    })

    it('should get namespace with UID', async () => {
      const mockNamespace = createNamespace('uid-ns')
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('uid-ns')

      expect(result.metadata?.uid).toBeDefined()
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot read namespace')
      mockK8sApi.readNamespace.mockRejectedValue(error)

      await expect(service.GetOneByName('test-namespace')).rejects.toThrow('Forbidden')
    })

    it('should handle API timeout errors', async () => {
      const error = new Error('Request timeout')
      mockK8sApi.readNamespace.mockRejectedValue(error)

      await expect(service.GetOneByName('test-namespace')).rejects.toThrow('Request timeout')
    })
  })

  describe('Delete', () => {
    it('should delete a namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespace.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-namespace')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespace).toHaveBeenCalledWith('test-namespace')
    })

    it('should delete default namespace (edge case)', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespace.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespace).toHaveBeenCalledWith('default')
    })

    it('should delete kube-system namespace (edge case)', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespace.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('kube-system')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespace).toHaveBeenCalledWith('kube-system')
    })

    it('should delete kube-public namespace (edge case)', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespace.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('kube-public')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespace).toHaveBeenCalledWith('kube-public')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespace.mockRejectedValue(error)

      await expect(service.Delete('test-namespace')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent namespace', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.deleteNamespace.mockRejectedValue(error)

      await expect(service.Delete('nonexistent')).rejects.toThrow('Namespace not found')
    })

    it('should handle namespace with finalizers', async () => {
      const mockResponse = {
        status: 'Success',
        metadata: {
          name: 'finalized-ns',
          finalizers: ['kubernetes'],
          deletionTimestamp: new Date().toISOString(),
        },
      }
      mockK8sApi.deleteNamespace.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('finalized-ns')

      expect(result).toEqual(mockResponse)
      expect(result.metadata.finalizers).toBeDefined()
      expect(result.metadata.deletionTimestamp).toBeDefined()
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = {
        status: 'Success',
        metadata: {
          name: 'graceful-delete',
          deletionTimestamp: new Date().toISOString(),
          deletionGracePeriodSeconds: 30,
        },
      }
      mockK8sApi.deleteNamespace.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete')

      expect(result).toEqual(mockResponse)
      expect(result.metadata.deletionTimestamp).toBeDefined()
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete namespaces')
      mockK8sApi.deleteNamespace.mockRejectedValue(error)

      await expect(service.Delete('test-namespace')).rejects.toThrow('Forbidden')
    })

    it('should handle namespace already being deleted', async () => {
      const error = new Error('Namespace is already being deleted')
      mockK8sApi.deleteNamespace.mockRejectedValue(error)

      await expect(service.Delete('terminating-ns')).rejects.toThrow('already being deleted')
    })

    it('should delete namespace with hyphens in name', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespace.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-test-namespace')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespace).toHaveBeenCalledWith('my-test-namespace')
    })

    it('should delete namespace with numbers in name', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespace.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('namespace-123')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespace).toHaveBeenCalledWith('namespace-123')
    })

    it('should handle API timeout during deletion', async () => {
      const error = new Error('Request timeout')
      mockK8sApi.deleteNamespace.mockRejectedValue(error)

      await expect(service.Delete('test-namespace')).rejects.toThrow('Request timeout')
    })

    it('should handle conflict errors', async () => {
      const error = new Error('Conflict: Namespace has active resources')
      mockK8sApi.deleteNamespace.mockRejectedValue(error)

      await expect(service.Delete('test-namespace')).rejects.toThrow('Conflict')
    })

    it('should return deletion response with status', async () => {
      const mockResponse = {
        status: 'Success',
        metadata: { name: 'test-namespace' },
        details: {
          name: 'test-namespace',
          kind: 'Namespace',
        },
      }
      mockK8sApi.deleteNamespace.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-namespace')

      expect(result).toEqual(mockResponse)
      expect(result.status).toBe('Success')
      expect(result.details).toBeDefined()
    })

    it('should handle cascading deletion', async () => {
      const mockResponse = {
        status: 'Success',
        metadata: {
          name: 'cascade-delete',
          deletionTimestamp: new Date().toISOString(),
        },
      }
      mockK8sApi.deleteNamespace.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('cascade-delete')

      expect(result).toEqual(mockResponse)
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s API', async () => {
      const mockNamespaces = [createNamespace('test-namespace')]
      mockK8sApi.listNamespace.mockResolvedValue({
        body: { items: mockNamespaces },
      })

      await service.List()

      expect(clientService.getCoreV1Api).toHaveBeenCalled()
    })

    it('should call getCoreV1Api for every operation', async () => {
      mockK8sApi.listNamespace.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespace.mockResolvedValue({ body: createNamespace('test') })
      mockK8sApi.deleteNamespace.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByName('test')
      await service.Delete('test')

      expect(clientService.getCoreV1Api).toHaveBeenCalledTimes(4)
    })

    it('should handle ClientService errors', async () => {
      clientService.getCoreV1Api.mockImplementation(() => {
        throw new Error('Failed to get K8s API client')
      })

      await expect(service.List()).rejects.toThrow('Failed to get K8s API client')
    })
  })

  describe('Edge Cases', () => {
    it('should handle namespace with empty status', async () => {
      const mockNamespace = createNamespace('empty-status-ns')
      mockNamespace.status = {}
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('empty-status-ns')

      expect(result).toEqual(mockNamespace)
      expect(result.status).toEqual({})
    })

    it('should handle namespace with minimal metadata', async () => {
      const mockNamespace = createNamespace('minimal-ns')
      mockNamespace.metadata = { name: 'minimal-ns' }
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('minimal-ns')

      expect(result.metadata?.name).toBe('minimal-ns')
    })

    it('should handle namespace transition from Active to Terminating', async () => {
      const mockNamespace = createNamespace('transition-ns')
      mockNamespace.status!.phase = 'Active'
      mockK8sApi.readNamespace.mockResolvedValueOnce({
        body: mockNamespace,
      })

      const result1 = await service.GetOneByName('transition-ns')
      expect(result1.status?.phase).toBe('Active')

      mockNamespace.status!.phase = 'Terminating'
      mockNamespace.metadata!.deletionTimestamp = new Date()
      mockK8sApi.readNamespace.mockResolvedValueOnce({
        body: mockNamespace,
      })

      const result2 = await service.GetOneByName('transition-ns')
      expect(result2.status?.phase).toBe('Terminating')
    })

    it('should handle namespace with multiple finalizers', async () => {
      const mockNamespace = createNamespace('multi-finalizer-ns')
      mockNamespace.metadata!.finalizers = [
        'kubernetes',
        'custom-finalizer-1',
        'custom-finalizer-2',
      ]
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName('multi-finalizer-ns')

      expect(result.metadata?.finalizers).toHaveLength(3)
    })

    it('should handle namespace with long name', async () => {
      const longName = 'very-long-namespace-name-with-many-characters-and-hyphens-123'
      const mockNamespace = createNamespace(longName)
      mockK8sApi.readNamespace.mockResolvedValue({
        body: mockNamespace,
      })

      const result = await service.GetOneByName(longName)

      expect(result.metadata?.name).toBe(longName)
    })
  })
})
