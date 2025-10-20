import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockK8sService } from '../../../../test/utils/k8s-mocks'
import { ClusterRoleBindingController } from './ClusterRoleBinding.controller'

describe('ClusterRoleBindingController', () => {
  let controller: ClusterRoleBindingController
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new ClusterRoleBindingController(k8sService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all cluster role bindings', async () => {
      const mockBindings = [
        { metadata: { name: 'cluster-admin-binding' } },
        { metadata: { name: 'view-binding' } },
      ]
      vi.spyOn(k8sService.clusterRoleBindingService, 'List').mockResolvedValue(mockBindings as any)

      const result = await controller.List()

      expect(result).toEqual(mockBindings)
      expect(k8sService.clusterRoleBindingService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing cluster role bindings', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.clusterRoleBindingService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })

    it('should return empty array when no cluster role bindings exist', async () => {
      vi.spyOn(k8sService.clusterRoleBindingService, 'List').mockResolvedValue([])

      const result = await controller.List()

      expect(result).toEqual([])
      expect(k8sService.clusterRoleBindingService.List).toHaveBeenCalled()
    })

    it('should list system cluster role bindings', async () => {
      const mockBindings = [
        { metadata: { name: 'system:kube-scheduler' } },
        { metadata: { name: 'system:kube-controller-manager' } },
      ]
      vi.spyOn(k8sService.clusterRoleBindingService, 'List').mockResolvedValue(mockBindings as any)

      const result = await controller.List()

      expect(result).toEqual(mockBindings)
      expect(result).toHaveLength(2)
    })

    it('should list custom cluster role bindings', async () => {
      const mockBindings = [
        { metadata: { name: 'custom-admin-binding' } },
        { metadata: { name: 'custom-viewer-binding' } },
      ]
      vi.spyOn(k8sService.clusterRoleBindingService, 'List').mockResolvedValue(mockBindings as any)

      const result = await controller.List()

      expect(result).toEqual(mockBindings)
    })
  })

  describe('GetOneByName', () => {
    it('should return a single cluster role binding by name', async () => {
      const mockBinding = {
        metadata: { name: 'cluster-admin-binding' },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: 'cluster-admin',
        },
        subjects: [
          {
            kind: 'User',
            name: 'admin',
            apiGroup: 'rbac.authorization.k8s.io',
          },
        ],
      }
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockResolvedValue(mockBinding as any)

      const result = await controller.GetOneByName('cluster-admin-binding')

      expect(result).toEqual(mockBinding)
      expect(k8sService.clusterRoleBindingService.GetOneByName).toHaveBeenCalledWith('cluster-admin-binding')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByName('nonexistent')).rejects.toThrow('Not found')
    })

    it('should get cluster role binding with User subject', async () => {
      const mockBinding = {
        metadata: { name: 'user-binding' },
        roleRef: { kind: 'ClusterRole', name: 'view' },
        subjects: [{ kind: 'User', name: 'jane' }],
      }
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockResolvedValue(mockBinding as any)

      const result = await controller.GetOneByName('user-binding')

      expect(result).toEqual(mockBinding)
      expect(result.subjects[0].kind).toBe('User')
    })

    it('should get cluster role binding with Group subject', async () => {
      const mockBinding = {
        metadata: { name: 'group-binding' },
        roleRef: { kind: 'ClusterRole', name: 'edit' },
        subjects: [{ kind: 'Group', name: 'developers' }],
      }
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockResolvedValue(mockBinding as any)

      const result = await controller.GetOneByName('group-binding')

      expect(result).toEqual(mockBinding)
      expect(result.subjects[0].kind).toBe('Group')
    })

    it('should get cluster role binding with ServiceAccount subject', async () => {
      const mockBinding = {
        metadata: { name: 'sa-binding' },
        roleRef: { kind: 'ClusterRole', name: 'cluster-admin' },
        subjects: [
          {
            kind: 'ServiceAccount',
            name: 'default',
            namespace: 'kube-system',
          },
        ],
      }
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockResolvedValue(mockBinding as any)

      const result = await controller.GetOneByName('sa-binding')

      expect(result).toEqual(mockBinding)
      expect(result.subjects[0].kind).toBe('ServiceAccount')
      expect(result.subjects[0].namespace).toBe('kube-system')
    })

    it('should get cluster role binding with multiple subjects', async () => {
      const mockBinding = {
        metadata: { name: 'multi-subject-binding' },
        roleRef: { kind: 'ClusterRole', name: 'view' },
        subjects: [
          { kind: 'User', name: 'alice' },
          { kind: 'Group', name: 'developers' },
          { kind: 'ServiceAccount', name: 'sa1', namespace: 'default' },
        ],
      }
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockResolvedValue(mockBinding as any)

      const result = await controller.GetOneByName('multi-subject-binding')

      expect(result.subjects).toHaveLength(3)
      expect(result.subjects[0].kind).toBe('User')
      expect(result.subjects[1].kind).toBe('Group')
      expect(result.subjects[2].kind).toBe('ServiceAccount')
    })

    it('should get system cluster role binding', async () => {
      const mockBinding = {
        metadata: { name: 'system:kube-scheduler' },
        roleRef: { kind: 'ClusterRole', name: 'system:kube-scheduler' },
        subjects: [{ kind: 'User', name: 'system:kube-scheduler' }],
      }
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockResolvedValue(mockBinding as any)

      const result = await controller.GetOneByName('system:kube-scheduler')

      expect(result.metadata.name).toBe('system:kube-scheduler')
    })

    it('should handle special characters in binding name', async () => {
      const mockBinding = {
        metadata: { name: 'my-cluster-binding-123' },
        roleRef: { kind: 'ClusterRole', name: 'admin' },
      }
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockResolvedValue(mockBinding as any)

      const result = await controller.GetOneByName('my-cluster-binding-123')

      expect(result).toEqual(mockBinding)
      expect(k8sService.clusterRoleBindingService.GetOneByName).toHaveBeenCalledWith('my-cluster-binding-123')
    })
  })

  describe('Delete', () => {
    it('should delete a single cluster role binding', async () => {
      vi.spyOn(k8sService.clusterRoleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['null/cluster-admin-binding']
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleBindingService.Delete).toHaveBeenCalledWith('cluster-admin-binding')
    })

    it('should delete multiple cluster role bindings', async () => {
      vi.spyOn(k8sService.clusterRoleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['null/binding1', 'null/binding2', 'null/binding3']
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleBindingService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.clusterRoleBindingService.Delete).toHaveBeenCalledWith('binding1')
      expect(k8sService.clusterRoleBindingService.Delete).toHaveBeenCalledWith('binding2')
      expect(k8sService.clusterRoleBindingService.Delete).toHaveBeenCalledWith('binding3')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.clusterRoleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.clusterRoleBindingService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.clusterRoleBindingService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['null/binding1', 'null/binding2', 'null/binding3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleBindingService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.clusterRoleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['null/test-binding']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should handle deletion of system bindings', async () => {
      vi.spyOn(k8sService.clusterRoleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['null/system:kube-scheduler']
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleBindingService.Delete).toHaveBeenCalledWith('system:kube-scheduler')
    })

    it('should handle bindings with hyphens and colons', async () => {
      vi.spyOn(k8sService.clusterRoleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['null/my-custom-binding:v1']
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleBindingService.Delete).toHaveBeenCalledWith('my-custom-binding:v1')
    })

    it('should parse cluster-scoped resource format correctly', async () => {
      vi.spyOn(k8sService.clusterRoleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['clusterwide/admin-binding']
      await controller.Delete(nsn)

      // For cluster-scoped resources, name is after the slash
      expect(k8sService.clusterRoleBindingService.Delete).toHaveBeenCalledWith('admin-binding')
    })

    it('should handle permission denied errors', async () => {
      const error = new Error('Forbidden: insufficient permissions')
      vi.spyOn(k8sService.clusterRoleBindingService, 'Delete').mockRejectedValue(error)

      const nsn = ['null/protected-binding']

      // Should continue even if permission denied
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleBindingService.Delete).toHaveBeenCalledWith('protected-binding')
    })

    it('should handle deletion of bindings with special RBAC roles', async () => {
      vi.spyOn(k8sService.clusterRoleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn = [
        'null/cluster-admin-binding',
        'null/view-binding',
        'null/edit-binding',
      ]
      await controller.Delete(nsn)

      expect(k8sService.clusterRoleBindingService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.clusterRoleBindingService.Delete).toHaveBeenCalledWith('cluster-admin-binding')
      expect(k8sService.clusterRoleBindingService.Delete).toHaveBeenCalledWith('view-binding')
      expect(k8sService.clusterRoleBindingService.Delete).toHaveBeenCalledWith('edit-binding')
    })
  })

  describe('RBAC Scenarios', () => {
    it('should handle bindings for cluster-admin role', async () => {
      const mockBinding = {
        metadata: { name: 'cluster-admin-binding' },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: 'cluster-admin',
        },
        subjects: [{ kind: 'User', name: 'admin' }],
      }
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockResolvedValue(mockBinding as any)

      const result = await controller.GetOneByName('cluster-admin-binding')

      expect(result.roleRef.name).toBe('cluster-admin')
    })

    it('should handle bindings for view role', async () => {
      const mockBinding = {
        metadata: { name: 'view-binding' },
        roleRef: { kind: 'ClusterRole', name: 'view' },
        subjects: [{ kind: 'Group', name: 'viewers' }],
      }
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockResolvedValue(mockBinding as any)

      const result = await controller.GetOneByName('view-binding')

      expect(result.roleRef.name).toBe('view')
    })

    it('should handle bindings for edit role', async () => {
      const mockBinding = {
        metadata: { name: 'edit-binding' },
        roleRef: { kind: 'ClusterRole', name: 'edit' },
        subjects: [{ kind: 'Group', name: 'editors' }],
      }
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockResolvedValue(mockBinding as any)

      const result = await controller.GetOneByName('edit-binding')

      expect(result.roleRef.name).toBe('edit')
    })

    it('should handle bindings with custom roles', async () => {
      const mockBinding = {
        metadata: { name: 'custom-binding' },
        roleRef: { kind: 'ClusterRole', name: 'my-custom-role' },
        subjects: [{ kind: 'ServiceAccount', name: 'my-sa', namespace: 'default' }],
      }
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockResolvedValue(mockBinding as any)

      const result = await controller.GetOneByName('custom-binding')

      expect(result.roleRef.name).toBe('my-custom-role')
    })
  })

  describe('ClusterRoleRef Validation', () => {
    it('should retrieve binding with valid ClusterRole reference', async () => {
      const mockBinding = {
        metadata: { name: 'valid-binding' },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: 'admin',
        },
      }
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockResolvedValue(mockBinding as any)

      const result = await controller.GetOneByName('valid-binding')

      expect(result.roleRef.apiGroup).toBe('rbac.authorization.k8s.io')
      expect(result.roleRef.kind).toBe('ClusterRole')
    })

    it('should handle bindings referencing system roles', async () => {
      const mockBinding = {
        metadata: { name: 'system-binding' },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: 'system:node',
        },
        subjects: [{ kind: 'User', name: 'system:node' }],
      }
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockResolvedValue(mockBinding as any)

      const result = await controller.GetOneByName('system-binding')

      expect(result.roleRef.name).toMatch(/^system:/)
    })
  })

  describe('Error Handling', () => {
    it('should handle API timeout errors', async () => {
      const error = new Error('Request timeout')
      vi.spyOn(k8sService.clusterRoleBindingService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('Request timeout')
    })

    it('should handle unauthorized access errors', async () => {
      const error = new Error('Unauthorized')
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockRejectedValue(error)

      await expect(controller.GetOneByName('admin-binding')).rejects.toThrow('Unauthorized')
    })

    it('should handle malformed binding names gracefully', async () => {
      const error = new Error('Invalid resource name')
      vi.spyOn(k8sService.clusterRoleBindingService, 'GetOneByName').mockRejectedValue(error)

      await expect(controller.GetOneByName('invalid@name')).rejects.toThrow('Invalid resource name')
    })

    it('should handle network errors during list', async () => {
      const error = new Error('Network error: ECONNREFUSED')
      vi.spyOn(k8sService.clusterRoleBindingService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('Network error')
    })

    it('should handle invalid API responses', async () => {
      vi.spyOn(k8sService.clusterRoleBindingService, 'List').mockResolvedValue(null as any)

      const result = await controller.List()

      expect(result).toBeNull()
    })
  })
})
