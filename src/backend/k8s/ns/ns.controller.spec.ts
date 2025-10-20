import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { K8sService } from '../k8s.service'
import { NsController } from './ns.controller'

describe('NsController', () => {
  let controller: NsController
  let k8sService: K8sService

  beforeEach(() => {
    const mockNsService = {
      List: vi.fn(),
      GetOneByName: vi.fn(),
      Delete: vi.fn(),
    }

    const mockK8sService = {
      nsService: mockNsService,
    } as any

    // Create controller directly with mocked dependencies
    controller = new NsController(mockK8sService)
    k8sService = mockK8sService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all namespaces', async () => {
      const mockNamespaces = [
        { metadata: { name: 'default' }, status: { phase: 'Active' } },
        { metadata: { name: 'kube-system' }, status: { phase: 'Active' } },
        { metadata: { name: 'kube-public' }, status: { phase: 'Active' } },
      ]
      vi.spyOn(k8sService.nsService, 'List').mockResolvedValue(mockNamespaces as any)

      const result = await controller.List()

      expect(result).toEqual(mockNamespaces)
      expect(k8sService.nsService.List).toHaveBeenCalledWith()
    })

    it('should return system namespaces', async () => {
      const mockNamespaces = [
        { metadata: { name: 'default' }, status: { phase: 'Active' } },
        { metadata: { name: 'kube-system' }, status: { phase: 'Active' } },
        { metadata: { name: 'kube-public' }, status: { phase: 'Active' } },
        { metadata: { name: 'kube-node-lease' }, status: { phase: 'Active' } },
      ]
      vi.spyOn(k8sService.nsService, 'List').mockResolvedValue(mockNamespaces as any)

      const result = await controller.List()

      expect(result).toEqual(mockNamespaces)
      expect(result).toHaveLength(4)
    })

    it('should return namespaces with different phases', async () => {
      const mockNamespaces = [
        { metadata: { name: 'active-ns' }, status: { phase: 'Active' } },
        { metadata: { name: 'terminating-ns' }, status: { phase: 'Terminating' } },
      ]
      vi.spyOn(k8sService.nsService, 'List').mockResolvedValue(mockNamespaces as any)

      const result = await controller.List()

      expect(result).toEqual(mockNamespaces)
      expect(result[0].status.phase).toBe('Active')
      expect(result[1].status.phase).toBe('Terminating')
    })

    it('should handle errors when listing namespaces', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.nsService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })

    it('should return empty list when no namespaces exist', async () => {
      vi.spyOn(k8sService.nsService, 'List').mockResolvedValue([])

      const result = await controller.List()

      expect(result).toEqual([])
      expect(k8sService.nsService.List).toHaveBeenCalledWith()
    })

    it('should handle API timeout errors', async () => {
      const error = new Error('Request timeout')
      vi.spyOn(k8sService.nsService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('Request timeout')
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot list namespaces')
      vi.spyOn(k8sService.nsService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('Forbidden')
    })
  })

  describe('GetOneByName', () => {
    it('should return a single namespace by name', async () => {
      const mockNamespace = {
        metadata: { name: 'test-namespace' },
        status: { phase: 'Active' },
      }
      vi.spyOn(k8sService.nsService, 'GetOneByName').mockResolvedValue(mockNamespace as any)

      const result = await controller.GetOneByName('test-namespace')

      expect(result).toEqual(mockNamespace)
      expect(k8sService.nsService.GetOneByName).toHaveBeenCalledWith('test-namespace')
    })

    it('should return default namespace', async () => {
      const mockNamespace = {
        metadata: { name: 'default' },
        status: { phase: 'Active' },
      }
      vi.spyOn(k8sService.nsService, 'GetOneByName').mockResolvedValue(mockNamespace as any)

      const result = await controller.GetOneByName('default')

      expect(result).toEqual(mockNamespace)
      expect(result.metadata.name).toBe('default')
    })

    it('should return kube-system namespace', async () => {
      const mockNamespace = {
        metadata: { name: 'kube-system' },
        status: { phase: 'Active' },
      }
      vi.spyOn(k8sService.nsService, 'GetOneByName').mockResolvedValue(mockNamespace as any)

      const result = await controller.GetOneByName('kube-system')

      expect(result).toEqual(mockNamespace)
      expect(result.metadata.name).toBe('kube-system')
    })

    it('should return kube-public namespace', async () => {
      const mockNamespace = {
        metadata: { name: 'kube-public' },
        status: { phase: 'Active' },
      }
      vi.spyOn(k8sService.nsService, 'GetOneByName').mockResolvedValue(mockNamespace as any)

      const result = await controller.GetOneByName('kube-public')

      expect(result).toEqual(mockNamespace)
      expect(result.metadata.name).toBe('kube-public')
    })

    it('should return namespace in Terminating phase', async () => {
      const mockNamespace = {
        metadata: {
          name: 'terminating-ns',
          deletionTimestamp: new Date().toISOString(),
        },
        status: { phase: 'Terminating' },
      }
      vi.spyOn(k8sService.nsService, 'GetOneByName').mockResolvedValue(mockNamespace as any)

      const result = await controller.GetOneByName('terminating-ns')

      expect(result).toEqual(mockNamespace)
      expect(result.status.phase).toBe('Terminating')
      expect(result.metadata.deletionTimestamp).toBeDefined()
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.nsService, 'GetOneByName').mockRejectedValue(new Error('Namespace not found'))

      await expect(controller.GetOneByName('nonexistent')).rejects.toThrow('Namespace not found')
    })

    it('should handle special characters in namespace name', async () => {
      const mockNamespace = {
        metadata: { name: 'my-namespace-123' },
        status: { phase: 'Active' },
      }
      vi.spyOn(k8sService.nsService, 'GetOneByName').mockResolvedValue(mockNamespace as any)

      const result = await controller.GetOneByName('my-namespace-123')

      expect(result).toEqual(mockNamespace)
      expect(k8sService.nsService.GetOneByName).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should handle namespace with labels and annotations', async () => {
      const mockNamespace = {
        metadata: {
          name: 'labeled-ns',
          labels: { env: 'production', team: 'backend' },
          annotations: { description: 'Production namespace' },
        },
        status: { phase: 'Active' },
      }
      vi.spyOn(k8sService.nsService, 'GetOneByName').mockResolvedValue(mockNamespace as any)

      const result = await controller.GetOneByName('labeled-ns')

      expect(result).toEqual(mockNamespace)
      expect(result.metadata.labels).toBeDefined()
      expect(result.metadata.annotations).toBeDefined()
    })

    it('should handle API errors', async () => {
      const error = new Error('API communication error')
      vi.spyOn(k8sService.nsService, 'GetOneByName').mockRejectedValue(error)

      await expect(controller.GetOneByName('test-namespace')).rejects.toThrow('API communication error')
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot read namespace')
      vi.spyOn(k8sService.nsService, 'GetOneByName').mockRejectedValue(error)

      await expect(controller.GetOneByName('test-namespace')).rejects.toThrow('Forbidden')
    })
  })

  describe('Delete', () => {
    it('should delete a single namespace', async () => {
      vi.spyOn(k8sService.nsService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['Namespace/test-namespace']
      await controller.Delete(nsn)

      expect(k8sService.nsService.Delete).toHaveBeenCalledWith('test-namespace')
    })

    it('should delete multiple namespaces', async () => {
      vi.spyOn(k8sService.nsService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['Namespace/ns1', 'Namespace/ns2', 'Namespace/ns3']
      await controller.Delete(nsn)

      expect(k8sService.nsService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.nsService.Delete).toHaveBeenCalledWith('ns1')
      expect(k8sService.nsService.Delete).toHaveBeenCalledWith('ns2')
      expect(k8sService.nsService.Delete).toHaveBeenCalledWith('ns3')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.nsService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.nsService.Delete).not.toHaveBeenCalled()
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.nsService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['Namespace/test-namespace']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.nsService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['Namespace/ns1', 'Namespace/ns2', 'Namespace/ns3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.nsService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle namespace name with hyphens', async () => {
      vi.spyOn(k8sService.nsService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['Namespace/my-test-namespace']
      await controller.Delete(nsn)

      expect(k8sService.nsService.Delete).toHaveBeenCalledWith('my-test-namespace')
    })

    it('should handle namespace name with numbers', async () => {
      vi.spyOn(k8sService.nsService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['Namespace/namespace-123']
      await controller.Delete(nsn)

      expect(k8sService.nsService.Delete).toHaveBeenCalledWith('namespace-123')
    })

    it('should delete system namespace (edge case)', async () => {
      vi.spyOn(k8sService.nsService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['Namespace/kube-system']
      await controller.Delete(nsn)

      expect(k8sService.nsService.Delete).toHaveBeenCalledWith('kube-system')
    })

    it('should handle deletion of default namespace (edge case)', async () => {
      vi.spyOn(k8sService.nsService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['Namespace/default']
      await controller.Delete(nsn)

      expect(k8sService.nsService.Delete).toHaveBeenCalledWith('default')
    })

    it('should handle namespace format variations', async () => {
      vi.spyOn(k8sService.nsService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['Namespace/test-ns']
      await controller.Delete(nsn)

      expect(k8sService.nsService.Delete).toHaveBeenCalledWith('test-ns')
    })

    it('should handle permission errors during deletion', async () => {
      const error = new Error('Forbidden: User cannot delete namespaces')
      vi.spyOn(k8sService.nsService, 'Delete').mockRejectedValue(error)

      const nsn = ['Namespace/test-namespace']

      // Should not throw, continues silently
      await controller.Delete(nsn)

      expect(k8sService.nsService.Delete).toHaveBeenCalledWith('test-namespace')
    })

    it('should handle deletion of terminating namespace', async () => {
      const error = new Error('Namespace is already being deleted')
      vi.spyOn(k8sService.nsService, 'Delete').mockRejectedValue(error)

      const nsn = ['Namespace/terminating-ns']

      // Should not throw
      await controller.Delete(nsn)

      expect(k8sService.nsService.Delete).toHaveBeenCalledWith('terminating-ns')
    })

    it('should handle concurrent deletions', async () => {
      vi.spyOn(k8sService.nsService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['Namespace/ns1', 'Namespace/ns2', 'Namespace/ns3', 'Namespace/ns4', 'Namespace/ns5']
      await controller.Delete(nsn)

      expect(k8sService.nsService.Delete).toHaveBeenCalledTimes(5)
    })

    it('should parse namespace resource identifier correctly', async () => {
      vi.spyOn(k8sService.nsService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['Namespace/my-namespace']
      await controller.Delete(nsn)

      // Verify the split logic works correctly
      expect(k8sService.nsService.Delete).toHaveBeenCalledWith('my-namespace')
    })
  })
})
