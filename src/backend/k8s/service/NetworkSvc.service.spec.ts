import { _vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createMockClientService, createService } from '../../../../test/utils/k8s-mocks'
import { NetworkSvcService } from './NetworkSvc.service'

describe('NetworkSvcService', () => {
  let service: NetworkSvcService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getCoreV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: NetworkSvcService,
          useFactory: (clientService: ClientService) => {
            return new NetworkSvcService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<NetworkSvcService>(NetworkSvcService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all services across all namespaces when no namespace specified', async () => {
      const mockServices = [createService('service-1', 'default'), createService('service-2', 'kube-system')]
      mockK8sApi.listServiceForAllNamespaces.mockResolvedValue({
        body: { items: mockServices },
      })

      const result = await service.List()

      expect(result).toEqual(mockServices)
      expect(mockK8sApi.listServiceForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedService).not.toHaveBeenCalled()
    })

    it('should list all services when namespace is "null" string', async () => {
      const mockServices = [createService('service-1')]
      mockK8sApi.listServiceForAllNamespaces.mockResolvedValue({
        body: { items: mockServices },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockServices)
      expect(mockK8sApi.listServiceForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedService).not.toHaveBeenCalled()
    })

    it('should list services in a specific namespace', async () => {
      const mockServices = [createService('service-1', 'default')]
      mockK8sApi.listNamespacedService.mockResolvedValue({
        body: { items: mockServices },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockServices)
      expect(mockK8sApi.listNamespacedService).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listServiceForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all services', async () => {
      const error = new Error('API Error')
      mockK8sApi.listServiceForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced services', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedService.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no services exist', async () => {
      mockK8sApi.listServiceForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list services in kube-system namespace', async () => {
      const mockServices = [createService('kube-dns', 'kube-system')]
      mockK8sApi.listNamespacedService.mockResolvedValue({
        body: { items: mockServices },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockServices)
      expect(mockK8sApi.listNamespacedService).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockServices = [createService('my-service', 'my-namespace-123')]
      mockK8sApi.listNamespacedService.mockResolvedValue({
        body: { items: mockServices },
      })

      const result = await service.List('my-namespace-123')

      expect(result).toEqual(mockServices)
      expect(mockK8sApi.listNamespacedService).toHaveBeenCalledWith('my-namespace-123')
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single service by namespace and name', async () => {
      const mockService = createService('test-service', 'default')
      mockK8sApi.readNamespacedService.mockResolvedValue({
        body: mockService,
      })

      const result = await service.GetOneByNsName('default', 'test-service')

      expect(result).toEqual(mockService)
      expect(mockK8sApi.readNamespacedService).toHaveBeenCalledWith('test-service', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('Service not found')
      mockK8sApi.readNamespacedService.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Service not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedService.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-service')).rejects.toThrow('Namespace does not exist')
    })

    it('should get ClusterIP service', async () => {
      const mockService = createService('cluster-ip-svc', 'default')
      mockService.spec!.type = 'ClusterIP'
      mockK8sApi.readNamespacedService.mockResolvedValue({
        body: mockService,
      })

      const result = await service.GetOneByNsName('default', 'cluster-ip-svc')

      expect(result).toEqual(mockService)
      expect(result.spec?.type).toBe('ClusterIP')
    })

    it('should get NodePort service', async () => {
      const mockService = createService('nodeport-svc', 'default')
      mockService.spec!.type = 'NodePort'
      mockK8sApi.readNamespacedService.mockResolvedValue({
        body: mockService,
      })

      const result = await service.GetOneByNsName('default', 'nodeport-svc')

      expect(result).toEqual(mockService)
      expect(result.spec?.type).toBe('NodePort')
    })

    it('should get LoadBalancer service', async () => {
      const mockService = createService('loadbalancer-svc', 'default')
      mockService.spec!.type = 'LoadBalancer'
      mockK8sApi.readNamespacedService.mockResolvedValue({
        body: mockService,
      })

      const result = await service.GetOneByNsName('default', 'loadbalancer-svc')

      expect(result).toEqual(mockService)
      expect(result.spec?.type).toBe('LoadBalancer')
    })

    it('should handle service names with hyphens and numbers', async () => {
      const mockService = createService('my-service-123', 'default')
      mockK8sApi.readNamespacedService.mockResolvedValue({
        body: mockService,
      })

      const result = await service.GetOneByNsName('default', 'my-service-123')

      expect(result).toEqual(mockService)
      expect(mockK8sApi.readNamespacedService).toHaveBeenCalledWith('my-service-123', 'default')
    })
  })

  describe('Delete', () => {
    it('should delete a service', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedService.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-service', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedService).toHaveBeenCalledWith('test-service', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedService.mockRejectedValue(error)

      await expect(service.Delete('test-service', 'default')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent service', async () => {
      const error = new Error('Service not found')
      mockK8sApi.deleteNamespacedService.mockRejectedValue(error)

      await expect(service.Delete('nonexistent', 'default')).rejects.toThrow('Service not found')
    })

    it('should delete service from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedService.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-service', 'kube-system')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedService).toHaveBeenCalledWith('my-service', 'kube-system')
    })

    it('should handle service with finalizers', async () => {
      const mockResponse = { status: 'Success', metadata: { finalizers: ['kubernetes'] } }
      mockK8sApi.deleteNamespacedService.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('service-with-finalizer', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNamespacedService.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete services')
      mockK8sApi.deleteNamespacedService.mockRejectedValue(error)

      await expect(service.Delete('test-service', 'default')).rejects.toThrow('Forbidden')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s API', async () => {
      const mockServices = [createService('test-service')]
      mockK8sApi.listServiceForAllNamespaces.mockResolvedValue({
        body: { items: mockServices },
      })

      await service.List()

      expect(clientService.getCoreV1Api).toHaveBeenCalled()
    })

    it('should call getCoreV1Api for every operation', async () => {
      mockK8sApi.listServiceForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedService.mockResolvedValue({ body: createService('test') })
      mockK8sApi.deleteNamespacedService.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('test', 'default')

      expect(clientService.getCoreV1Api).toHaveBeenCalledTimes(4)
    })
  })
})
