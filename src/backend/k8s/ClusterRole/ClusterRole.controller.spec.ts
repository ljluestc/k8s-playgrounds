import { beforeEach, describe, it, vi } from 'vitest'
import { ClusterRoleController } from './ClusterRole.controller'
import { createMockK8sService } from '../../../../test/utils/k8s-mocks'

describe('ClusterRoleController', () => {
  let controller: ClusterRoleController
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new ClusterRoleController(k8sService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all cluster roles', async () => {
      const mockClusterRoles = [
        { metadata: { name: 'cluster-admin' } },
        { metadata: { name: 'view' } },
      ]
      vi.spyOn(k8sService.clusterRoleService, 'List').mockResolvedValue(mockClusterRoles as any)

      const result = await controller.List()

      expect(result).toEqual(mockClusterRoles)
      expect(k8sService.clusterRoleService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing cluster roles', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.clusterRoleService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })

    it('should return empty array when no cluster roles exist', async () => {
      vi.spyOn(k8sService.clusterRoleService, 'List').mockResolvedValue([])

      const result = await controller.List()

      expect(result).toEqual([])
      expect(k8sService.clusterRoleService.List).toHaveBeenCalled()
    })

    it('should handle permission errors when listing cluster roles', async () => {
      const error = new Error('Forbidden: User cannot list cluster roles')
      vi.spyOn(k8sService.clusterRoleService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('Forbidden')
    })

    it('should return system cluster roles', async () => {
      const mockClusterRoles = [
        { metadata: { name: 'system:controller:node-controller' } },
        { metadata: { name: 'system:node' } },
      ]
      vi.spyOn(k8sService.clusterRoleService, 'List').mockResolvedValue(mockClusterRoles as any)

      const result = await controller.List()

      expect(result).toEqual(mockClusterRoles)
      expect(result).toHaveLength(2)
    })
  })

  describe('GetOneByName', () => {
    it('should return a single cluster role by name', async () => {
      const mockClusterRole = {
        metadata: { name: 'cluster-admin' },
        rules: [
          {
            apiGroups: ['*'],
            resources: ['*'],
            verbs: ['*'],
          },
        ],
      }
      vi.spyOn(k8sService.clusterRoleService, 'GetOneByName').mockResolvedValue(mockClusterRole as any)

      const result = await controller.GetOneByName('cluster-admin')

      expect(result).toEqual(mockClusterRole)
      expect(k8sService.clusterRoleService.GetOneByName).toHaveBeenCalledWith('cluster-admin')
    })

    it('should handle not found errors', async () => {
      const error = new Error('ClusterRole not found')
      vi.spyOn(k8sService.clusterRoleService, 'GetOneByName').mockRejectedValue(error)

      await expect(controller.GetOneByName('nonexistent')).rejects.toThrow('ClusterRole not found')
    })

    it('should get cluster role with multiple rules', async () => {
      const mockClusterRole = {
        metadata: { name: 'view' },
        rules: [
          {
            apiGroups: [''],
            resources: ['pods', 'services'],
            verbs: ['get', 'list', 'watch'],
          },
          {
            apiGroups: ['apps'],
            resources: ['deployments'],
            verbs: ['get', 'list'],
          },
        ],
      }
      vi.spyOn(k8sService.clusterRoleService, 'GetOneByName').mockResolvedValue(mockClusterRole as any)

      const result = await controller.GetOneByName('view')

      expect(result).toEqual(mockClusterRole)
      expect(result.rules).toHaveLength(2)
    })

    it('should handle special characters in cluster role name', async () => {
      const mockClusterRole = {
        metadata: { name: 'system:controller:node-controller' },
        rules: [],
      }
      vi.spyOn(k8sService.clusterRoleService, 'GetOneByName').mockResolvedValue(mockClusterRole as any)

      const result = await controller.GetOneByName('system:controller:node-controller')

      expect(result).toEqual(mockClusterRole)
      expect(k8sService.clusterRoleService.GetOneByName).toHaveBeenCalledWith('system:controller:node-controller')
    })

    it('should get cluster role with wildcard permissions', async () => {
      const mockClusterRole = {
        metadata: { name: 'cluster-admin' },
        rules: [
          {
            apiGroups: ['*'],
            resources: ['*'],
            verbs: ['*'],
          },
        ],
      }
      vi.spyOn(k8sService.clusterRoleService, 'GetOneByName').mockResolvedValue(mockClusterRole as any)

      const result = await controller.GetOneByName('cluster-admin')

      expect(result).toEqual(mockClusterRole)
      expect(result.rules[0].apiGroups).toContain('*')
      expect(result.rules[0].resources).toContain('*')
      expect(result.rules[0].verbs).toContain('*')
    })

    it('should get cluster role with specific resource names', async () => {
      const mockClusterRole = {
        metadata: { name: 'specific-resource-role' },
        rules: [
          {
            apiGroups: [''],
            resources: ['configmaps'],
            resourceNames: ['my-config'],
            verbs: ['get'],
          },
        ],
      }
      vi.spyOn(k8sService.clusterRoleService, 'GetOneByName').mockResolvedValue(mockClusterRole as any)

      const result = await controller.GetOneByName('specific-resource-role')

      expect(result).toEqual(mockClusterRole)
      expect(result.rules[0].resourceNames).toContain('my-config')
    })

    it('should get cluster role with non-resource URLs', async () => {
      const mockClusterRole = {
        metadata: { name: 'non-resource-role' },
        rules: [
          {
            nonResourceURLs: ['/healthz', '/metrics'],
            verbs: ['get'],
          },
        ],
      }
      vi.spyOn(k8sService.clusterRoleService, 'GetOneByName').mockResolvedValue(mockClusterRole as any)

      const result = await controller.GetOneByName('non-resource-role')

      expect(result).toEqual(mockClusterRole)
      expect(result.rules[0].nonResourceURLs).toEqual(['/healthz', '/metrics'])
    })

    it('should handle API errors', async () => {
      const error = new Error('API connection failed')
      vi.spyOn(k8sService.clusterRoleService, 'GetOneByName').mockRejectedValue(error)

      await expect(controller.GetOneByName('test-role')).rejects.toThrow('API connection failed')
    })
  })

  describe('Delete', () => {
    it('should delete a single cluster role', async () => {
      vi.spyOn(k8sService.clusterRoleService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['cluster/cluster-admin']
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleService.Delete).toHaveBeenCalledWith('cluster-admin')
    })

    it('should delete multiple cluster roles', async () => {
      vi.spyOn(k8sService.clusterRoleService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['cluster/role1', 'cluster/role2', 'cluster/role3']
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.clusterRoleService.Delete).toHaveBeenCalledWith('role1')
      expect(k8sService.clusterRoleService.Delete).toHaveBeenCalledWith('role2')
      expect(k8sService.clusterRoleService.Delete).toHaveBeenCalledWith('role3')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.clusterRoleService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.clusterRoleService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.clusterRoleService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['cluster/role1', 'cluster/role2', 'cluster/role3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle cluster roles with slashes in format', async () => {
      vi.spyOn(k8sService.clusterRoleService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['cluster/my-cluster-role']
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleService.Delete).toHaveBeenCalledWith('my-cluster-role')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.clusterRoleService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['cluster/test-role']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should delete system cluster role', async () => {
      vi.spyOn(k8sService.clusterRoleService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['cluster/system:node']
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleService.Delete).toHaveBeenCalledWith('system:node')
    })

    it('should handle deletion with special characters', async () => {
      vi.spyOn(k8sService.clusterRoleService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['cluster/system:controller:node-controller']
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleService.Delete).toHaveBeenCalledWith('system:controller:node-controller')
    })

    it('should handle protected cluster role deletion error', async () => {
      const error = new Error('Cannot delete system cluster role')
      vi.spyOn(k8sService.clusterRoleService, 'Delete').mockRejectedValue(error)

      const nsn = ['cluster/cluster-admin']

      // Should not throw, just continues
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleService.Delete).toHaveBeenCalledWith('cluster-admin')
    })

    it('should handle permission errors during deletion', async () => {
      const error = new Error('Forbidden: User cannot delete cluster roles')
      vi.spyOn(k8sService.clusterRoleService, 'Delete').mockRejectedValue(error)

      const nsn = ['cluster/custom-role']

      // Should not throw
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleService.Delete).toHaveBeenCalledWith('custom-role')
    })

    it('should parse namespace/name format correctly', async () => {
      vi.spyOn(k8sService.clusterRoleService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['anything/actual-role-name']
      await controller.Delete(nsn)

      // Should use the second part after split
      expect(k8sService.clusterRoleService.Delete).toHaveBeenCalledWith('actual-role-name')
    })

    it('should delete multiple roles with mixed names', async () => {
      vi.spyOn(k8sService.clusterRoleService, 'Delete').mockResolvedValue(undefined)

      const nsn = [
        'cluster/cluster-admin',
        'cluster/view',
        'cluster/system:node',
        'cluster/custom-role-123',
      ]
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleService.Delete).toHaveBeenCalledTimes(4)
      expect(k8sService.clusterRoleService.Delete).toHaveBeenNthCalledWith(1, 'cluster-admin')
      expect(k8sService.clusterRoleService.Delete).toHaveBeenNthCalledWith(2, 'view')
      expect(k8sService.clusterRoleService.Delete).toHaveBeenNthCalledWith(3, 'system:node')
      expect(k8sService.clusterRoleService.Delete).toHaveBeenNthCalledWith(4, 'custom-role-123')
    })
  })
})
