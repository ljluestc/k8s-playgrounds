import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockK8sService } from '../../../../test/utils/k8s-mocks'

import { RoleController } from './Role.controller'

describe('RoleController', () => {
  let controller: RoleController
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new RoleController(k8sService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all roles across all namespaces', async () => {
      const mockRoles = { items: [] }
      vi.spyOn(k8sService.roleService, 'List').mockResolvedValue(mockRoles as any)

      const result = await controller.List()

      expect(result).toEqual(mockRoles)
      expect(k8sService.roleService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing all roles', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.roleService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })

    it('should handle permission errors when listing roles', async () => {
      const error = new Error('Forbidden: User cannot list roles')
      vi.spyOn(k8sService.roleService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('Forbidden')
    })

    it('should return empty items when no roles exist', async () => {
      const mockRoles = { items: [] }
      vi.spyOn(k8sService.roleService, 'List').mockResolvedValue(mockRoles as any)

      const result = await controller.List()

      expect(result).toEqual(mockRoles)
      expect(result.items).toHaveLength(0)
    })
  })

  describe('ListByNs', () => {
    it('should return roles for a specific namespace', async () => {
      const mockRoles = { items: [] }
      const namespace = 'default'
      vi.spyOn(k8sService.roleService, 'List').mockResolvedValue(mockRoles as any)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockRoles)
      expect(k8sService.roleService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      vi.spyOn(k8sService.roleService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockRoles = { items: [] }
      vi.spyOn(k8sService.roleService, 'List').mockResolvedValue(mockRoles as any)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockRoles)
      expect(k8sService.roleService.List).toHaveBeenCalledWith('')
    })

    it('should list roles in kube-system namespace', async () => {
      const mockRoles = { items: [] }
      vi.spyOn(k8sService.roleService, 'List').mockResolvedValue(mockRoles as any)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockRoles)
      expect(k8sService.roleService.List).toHaveBeenCalledWith('kube-system')
    })

    it('should handle roles in custom namespace', async () => {
      const mockRoles = { items: [] }
      vi.spyOn(k8sService.roleService, 'List').mockResolvedValue(mockRoles as any)

      const result = await controller.ListByNs('my-custom-namespace')

      expect(result).toEqual(mockRoles)
      expect(k8sService.roleService.List).toHaveBeenCalledWith('my-custom-namespace')
    })

    it('should handle namespace with special characters', async () => {
      const mockRoles = { items: [] }
      vi.spyOn(k8sService.roleService, 'List').mockResolvedValue(mockRoles as any)

      const result = await controller.ListByNs('my-namespace-123')

      expect(result).toEqual(mockRoles)
      expect(k8sService.roleService.List).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should handle null namespace string', async () => {
      const mockRoles = { items: [] }
      vi.spyOn(k8sService.roleService, 'List').mockResolvedValue(mockRoles as any)

      const result = await controller.ListByNs('null')

      expect(result).toEqual(mockRoles)
      expect(k8sService.roleService.List).toHaveBeenCalledWith('null')
    })

    it('should handle namespace not found error', async () => {
      const error = new Error('Namespace not found')
      vi.spyOn(k8sService.roleService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('nonexistent-ns')).rejects.toThrow('Namespace not found')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single role by namespace and name', async () => {
      const mockRole = {
        metadata: { name: 'test-role', namespace: 'default' },
        rules: [{ apiGroups: [''], resources: ['pods'], verbs: ['get', 'list'] }],
      }
      vi.spyOn(k8sService.roleService, 'GetOneByNsName').mockResolvedValue(mockRole as any)

      const result = await controller.GetOneByNsName('default', 'test-role')

      expect(result).toEqual(mockRole)
      expect(k8sService.roleService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-role')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.roleService, 'GetOneByNsName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should handle special characters in role name', async () => {
      const mockRole = { metadata: { name: 'test-role-123', namespace: 'default' } }
      vi.spyOn(k8sService.roleService, 'GetOneByNsName').mockResolvedValue(mockRole as any)

      const result = await controller.GetOneByNsName('default', 'test-role-123')

      expect(result).toEqual(mockRole)
      expect(k8sService.roleService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-role-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockRole = { metadata: { name: 'test-role', namespace: 'kube-system' } }
      vi.spyOn(k8sService.roleService, 'GetOneByNsName').mockResolvedValue(mockRole as any)

      const result = await controller.GetOneByNsName('kube-system', 'test-role')

      expect(result).toEqual(mockRole)
      expect(k8sService.roleService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-role')
    })

    it('should get role with multiple RBAC rules', async () => {
      const mockRole = {
        metadata: { name: 'complex-role', namespace: 'default' },
        rules: [
          { apiGroups: [''], resources: ['pods'], verbs: ['get', 'list', 'watch'] },
          { apiGroups: ['apps'], resources: ['deployments'], verbs: ['get', 'list'] },
          { apiGroups: [''], resources: ['services'], verbs: ['get'] },
        ],
      }
      vi.spyOn(k8sService.roleService, 'GetOneByNsName').mockResolvedValue(mockRole as any)

      const result = await controller.GetOneByNsName('default', 'complex-role')

      expect(result).toEqual(mockRole)
      expect(result.rules).toHaveLength(3)
    })

    it('should get role with wildcard permissions', async () => {
      const mockRole = {
        metadata: { name: 'admin-role', namespace: 'default' },
        rules: [
          { apiGroups: ['*'], resources: ['*'], verbs: ['*'] },
        ],
      }
      vi.spyOn(k8sService.roleService, 'GetOneByNsName').mockResolvedValue(mockRole as any)

      const result = await controller.GetOneByNsName('default', 'admin-role')

      expect(result).toEqual(mockRole)
      expect(result.rules[0].verbs).toContain('*')
    })

    it('should handle role with resourceNames', async () => {
      const mockRole = {
        metadata: { name: 'specific-role', namespace: 'default' },
        rules: [
          {
            apiGroups: [''],
            resources: ['pods'],
            verbs: ['get'],
            resourceNames: ['my-specific-pod'],
          },
        ],
      }
      vi.spyOn(k8sService.roleService, 'GetOneByNsName').mockResolvedValue(mockRole as any)

      const result = await controller.GetOneByNsName('default', 'specific-role')

      expect(result).toEqual(mockRole)
      expect(result.rules[0].resourceNames).toContain('my-specific-pod')
    })

    it('should handle permission denied errors', async () => {
      const error = new Error('Forbidden: User cannot read roles')
      vi.spyOn(k8sService.roleService, 'GetOneByNsName').mockRejectedValue(error)

      await expect(controller.GetOneByNsName('default', 'test-role')).rejects.toThrow('Forbidden')
    })
  })

  describe('Delete', () => {
    it('should delete a single role', async () => {
      vi.spyOn(k8sService.roleService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-role']
      await controller.Delete(nsn)

      expect(k8sService.roleService.Delete).toHaveBeenCalledWith('test-role', 'default')
    })

    it('should delete multiple roles', async () => {
      vi.spyOn(k8sService.roleService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/role1', 'kube-system/role2', 'default/role3']
      await controller.Delete(nsn)

      expect(k8sService.roleService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.roleService.Delete).toHaveBeenCalledWith('role1', 'default')
      expect(k8sService.roleService.Delete).toHaveBeenCalledWith('role2', 'kube-system')
      expect(k8sService.roleService.Delete).toHaveBeenCalledWith('role3', 'default')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.roleService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.roleService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.roleService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/role1', 'default/role2', 'default/role3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.roleService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle roles with slashes in namespace/name format', async () => {
      vi.spyOn(k8sService.roleService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-role-name']
      await controller.Delete(nsn)

      expect(k8sService.roleService.Delete).toHaveBeenCalledWith('my-role-name', 'my-namespace')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.roleService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-role']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should delete roles from multiple namespaces', async () => {
      vi.spyOn(k8sService.roleService, 'Delete').mockResolvedValue(undefined)

      const nsn = [
        'default/reader-role',
        'kube-system/admin-role',
        'production/editor-role',
        'staging/viewer-role',
      ]
      await controller.Delete(nsn)

      expect(k8sService.roleService.Delete).toHaveBeenCalledTimes(4)
      expect(k8sService.roleService.Delete).toHaveBeenCalledWith('reader-role', 'default')
      expect(k8sService.roleService.Delete).toHaveBeenCalledWith('admin-role', 'kube-system')
      expect(k8sService.roleService.Delete).toHaveBeenCalledWith('editor-role', 'production')
      expect(k8sService.roleService.Delete).toHaveBeenCalledWith('viewer-role', 'staging')
    })

    it('should handle deletion of roles with complex names', async () => {
      vi.spyOn(k8sService.roleService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace-123/my-role-name-456']
      await controller.Delete(nsn)

      expect(k8sService.roleService.Delete).toHaveBeenCalledWith('my-role-name-456', 'my-namespace-123')
    })

    it('should handle permission errors during deletion', async () => {
      const error = new Error('Forbidden: User cannot delete roles')
      vi.spyOn(k8sService.roleService, 'Delete').mockRejectedValue(error)

      const nsn = ['default/test-role']

      // Should not throw, but the error will be raised by the service
      await controller.Delete(nsn)

      expect(k8sService.roleService.Delete).toHaveBeenCalledWith('test-role', 'default')
    })

    it('should handle deletion of non-existent role', async () => {
      const error = new Error('Role not found')
      vi.spyOn(k8sService.roleService, 'Delete').mockRejectedValue(error)

      const nsn = ['default/nonexistent-role']

      // Should not throw, continues with deletion attempt
      await controller.Delete(nsn)

      expect(k8sService.roleService.Delete).toHaveBeenCalledWith('nonexistent-role', 'default')
    })

    it('should delete single role and return empty object', async () => {
      vi.spyOn(k8sService.roleService, 'Delete').mockResolvedValue({ status: 'Success' } as any)

      const nsn = ['default/test-role']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.roleService.Delete).toHaveBeenCalledTimes(1)
    })
  })

  describe('Integration scenarios', () => {
    it('should handle listing and deleting roles in sequence', async () => {
      const mockRoles = { items: [{ metadata: { name: 'role1', namespace: 'default' } }] }
      vi.spyOn(k8sService.roleService, 'List').mockResolvedValue(mockRoles as any)
      vi.spyOn(k8sService.roleService, 'Delete').mockResolvedValue(undefined)

      const listResult = await controller.List()
      expect(listResult.items).toHaveLength(1)

      await controller.Delete(['default/role1'])
      expect(k8sService.roleService.Delete).toHaveBeenCalledWith('role1', 'default')
    })

    it('should handle getting role details after listing', async () => {
      const mockRoles = { items: [{ metadata: { name: 'test-role', namespace: 'default' } }] }
      const mockRole = {
        metadata: { name: 'test-role', namespace: 'default' },
        rules: [{ apiGroups: [''], resources: ['pods'], verbs: ['get'] }],
      }

      vi.spyOn(k8sService.roleService, 'List').mockResolvedValue(mockRoles as any)
      vi.spyOn(k8sService.roleService, 'GetOneByNsName').mockResolvedValue(mockRole as any)

      await controller.ListByNs('default')
      const result = await controller.GetOneByNsName('default', 'test-role')

      expect(result).toEqual(mockRole)
    })

    it('should handle role operations across multiple namespaces', async () => {
      vi.spyOn(k8sService.roleService, 'List').mockResolvedValue({ items: [] } as any)

      await controller.ListByNs('default')
      await controller.ListByNs('kube-system')
      await controller.ListByNs('production')

      expect(k8sService.roleService.List).toHaveBeenCalledTimes(3)
      expect(k8sService.roleService.List).toHaveBeenCalledWith('default')
      expect(k8sService.roleService.List).toHaveBeenCalledWith('kube-system')
      expect(k8sService.roleService.List).toHaveBeenCalledWith('production')
    })
  })
})
