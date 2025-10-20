import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NetworkSvcController } from './NetworkSvc.controller'
import type { NetworkSvcService } from './NetworkSvc.service'

describe('NetworkSvcController', () => {
  let controller: NetworkSvcController
  let networkSvcService: NetworkSvcService

  beforeEach(async () => {
    // Create mock NetworkSvcService
    networkSvcService = {
      List: vi.fn(),
      GetOneByNsName: vi.fn(),
      Delete: vi.fn(),
      Update: vi.fn(),
      Restart: vi.fn(),
      Scale: vi.fn(),
    } as any

    // Create controller instance directly
    controller = new NetworkSvcController();
    // Manually inject the service
    (controller as any).k8sService = {
      networkSvcService,
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all services', async () => {
      const mockServices = { items: [] }
      vi.spyOn(networkSvcService, 'List').mockResolvedValue(mockServices as any)

      const result = await controller.List()

      expect(result).toEqual(mockServices)
      expect(networkSvcService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing services', async () => {
      const error = new Error('API error')
      vi.spyOn(networkSvcService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })
  })

  describe('ListByNs', () => {
    it('should return services for a specific namespace', async () => {
      const mockServices = { items: [] }
      const namespace = 'default'
      vi.spyOn(networkSvcService, 'List').mockResolvedValue(mockServices as any)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockServices)
      expect(networkSvcService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      vi.spyOn(networkSvcService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockServices = { items: [] }
      vi.spyOn(networkSvcService, 'List').mockResolvedValue(mockServices as any)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockServices)
      expect(networkSvcService.List).toHaveBeenCalledWith('')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single service', async () => {
      const mockService = {
        metadata: { name: 'test-service', namespace: 'default' },
        spec: { type: 'ClusterIP', ports: [{ port: 80 }] },
      }
      vi.spyOn(networkSvcService, 'GetOneByNsName').mockResolvedValue(mockService as any)

      const result = await controller.GetOneByNsName('default', 'test-service')

      expect(result).toEqual(mockService)
      expect(networkSvcService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-service')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(networkSvcService, 'GetOneByNsName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should handle special characters in service name', async () => {
      const mockService = { metadata: { name: 'test-service-123', namespace: 'default' } }
      vi.spyOn(networkSvcService, 'GetOneByNsName').mockResolvedValue(mockService as any)

      const result = await controller.GetOneByNsName('default', 'test-service-123')

      expect(result).toEqual(mockService)
      expect(networkSvcService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-service-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockService = { metadata: { name: 'test-service', namespace: 'kube-system' } }
      vi.spyOn(networkSvcService, 'GetOneByNsName').mockResolvedValue(mockService as any)

      const result = await controller.GetOneByNsName('kube-system', 'test-service')

      expect(result).toEqual(mockService)
      expect(networkSvcService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-service')
    })
  })

  describe('Delete', () => {
    it('should delete a single service', async () => {
      vi.spyOn(networkSvcService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-service']
      await controller.Delete(nsn)

      expect(networkSvcService.Delete).toHaveBeenCalledWith('test-service', 'default')
    })

    it('should delete multiple services', async () => {
      vi.spyOn(networkSvcService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/service1', 'kube-system/service2', 'default/service3']
      await controller.Delete(nsn)

      expect(networkSvcService.Delete).toHaveBeenCalledTimes(3)
      expect(networkSvcService.Delete).toHaveBeenCalledWith('service1', 'default')
      expect(networkSvcService.Delete).toHaveBeenCalledWith('service2', 'kube-system')
      expect(networkSvcService.Delete).toHaveBeenCalledWith('service3', 'default')
    })

    it('should handle empty array', async () => {
      vi.spyOn(networkSvcService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(networkSvcService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(networkSvcService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/service1', 'default/service2', 'default/service3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(networkSvcService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle services with slashes in namespace/name format', async () => {
      vi.spyOn(networkSvcService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-service-name']
      await controller.Delete(nsn)

      expect(networkSvcService.Delete).toHaveBeenCalledWith('my-service-name', 'my-namespace')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(networkSvcService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-service']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })
  })
})
