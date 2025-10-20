
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockK8sService } from '../../../../test/utils/k8s-mocks'

import { RoleBindingController } from './RoleBinding.controller'

describe('RoleBindingController', () => {
  let controller: RoleBindingController
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new RoleBindingController(k8sService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all rolebindings', async () => {
      const mockRoleBindings = { items: [] }
      vi.spyOn(k8sService.roleBindingService, 'List').mockResolvedValue(mockRoleBindings as any)

      const result = await controller.List()

      expect(result).toEqual(mockRoleBindings)
      expect(k8sService.roleBindingService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing rolebindings', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.roleBindingService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })

    it('should list rolebindings across all namespaces', async () => {
      const mockRoleBindings = {
        items: [
          { metadata: { name: 'rb1', namespace: 'default' } },
          { metadata: { name: 'rb2', namespace: 'kube-system' } },
        ],
      }
      vi.spyOn(k8sService.roleBindingService, 'List').mockResolvedValue(mockRoleBindings as any)

      const result = await controller.List()

      expect(result).toEqual(mockRoleBindings)
      expect(k8sService.roleBindingService.List).toHaveBeenCalledWith()
    })
  })

  describe('ListByNs', () => {
    it('should return rolebindings for a specific namespace', async () => {
      const mockRoleBindings = { items: [] }
      const namespace = 'default'
      vi.spyOn(k8sService.roleBindingService, 'List').mockResolvedValue(mockRoleBindings as any)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockRoleBindings)
      expect(k8sService.roleBindingService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      vi.spyOn(k8sService.roleBindingService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockRoleBindings = { items: [] }
      vi.spyOn(k8sService.roleBindingService, 'List').mockResolvedValue(mockRoleBindings as any)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockRoleBindings)
      expect(k8sService.roleBindingService.List).toHaveBeenCalledWith('')
    })

    it('should list rolebindings in kube-system namespace', async () => {
      const mockRoleBindings = {
        items: [
          {
            metadata: { name: 'system-rb', namespace: 'kube-system' },
            roleRef: { kind: 'Role', name: 'system-role' },
          },
        ],
      }
      vi.spyOn(k8sService.roleBindingService, 'List').mockResolvedValue(mockRoleBindings as any)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockRoleBindings)
      expect(k8sService.roleBindingService.List).toHaveBeenCalledWith('kube-system')
    })

    it('should list rolebindings in custom namespace', async () => {
      const mockRoleBindings = {
        items: [
          {
            metadata: { name: 'custom-rb', namespace: 'my-namespace' },
            roleRef: { kind: 'Role', name: 'custom-role' },
          },
        ],
      }
      vi.spyOn(k8sService.roleBindingService, 'List').mockResolvedValue(mockRoleBindings as any)

      const result = await controller.ListByNs('my-namespace')

      expect(result).toEqual(mockRoleBindings)
      expect(k8sService.roleBindingService.List).toHaveBeenCalledWith('my-namespace')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single rolebinding', async () => {
      const mockRoleBinding = {
        metadata: { name: 'test-rb', namespace: 'default' },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name: 'pod-reader',
        },
        subjects: [
          {
            kind: 'User',
            name: 'jane',
            apiGroup: 'rbac.authorization.k8s.io',
          },
        ],
      }
      vi.spyOn(k8sService.roleBindingService, 'GetOneByNsName').mockResolvedValue(mockRoleBinding as any)

      const result = await controller.GetOneByNsName('default', 'test-rb')

      expect(result).toEqual(mockRoleBinding)
      expect(k8sService.roleBindingService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-rb')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.roleBindingService, 'GetOneByNsName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should get rolebinding with User subject', async () => {
      const mockRoleBinding = {
        metadata: { name: 'user-rb', namespace: 'default' },
        roleRef: { kind: 'Role', name: 'developer' },
        subjects: [{ kind: 'User', name: 'john', apiGroup: 'rbac.authorization.k8s.io' }],
      }
      vi.spyOn(k8sService.roleBindingService, 'GetOneByNsName').mockResolvedValue(mockRoleBinding as any)

      const result = await controller.GetOneByNsName('default', 'user-rb')

      expect(result).toEqual(mockRoleBinding)
      expect(result.subjects[0].kind).toBe('User')
    })

    it('should get rolebinding with Group subject', async () => {
      const mockRoleBinding = {
        metadata: { name: 'group-rb', namespace: 'default' },
        roleRef: { kind: 'Role', name: 'viewer' },
        subjects: [{ kind: 'Group', name: 'developers', apiGroup: 'rbac.authorization.k8s.io' }],
      }
      vi.spyOn(k8sService.roleBindingService, 'GetOneByNsName').mockResolvedValue(mockRoleBinding as any)

      const result = await controller.GetOneByNsName('default', 'group-rb')

      expect(result).toEqual(mockRoleBinding)
      expect(result.subjects[0].kind).toBe('Group')
    })

    it('should get rolebinding with ServiceAccount subject', async () => {
      const mockRoleBinding = {
        metadata: { name: 'sa-rb', namespace: 'default' },
        roleRef: { kind: 'Role', name: 'pod-manager' },
        subjects: [{ kind: 'ServiceAccount', name: 'my-sa', namespace: 'default' }],
      }
      vi.spyOn(k8sService.roleBindingService, 'GetOneByNsName').mockResolvedValue(mockRoleBinding as any)

      const result = await controller.GetOneByNsName('default', 'sa-rb')

      expect(result).toEqual(mockRoleBinding)
      expect(result.subjects[0].kind).toBe('ServiceAccount')
    })

    it('should get rolebinding with multiple subjects', async () => {
      const mockRoleBinding = {
        metadata: { name: 'multi-rb', namespace: 'default' },
        roleRef: { kind: 'Role', name: 'editor' },
        subjects: [
          { kind: 'User', name: 'alice', apiGroup: 'rbac.authorization.k8s.io' },
          { kind: 'User', name: 'bob', apiGroup: 'rbac.authorization.k8s.io' },
          { kind: 'ServiceAccount', name: 'app-sa', namespace: 'default' },
        ],
      }
      vi.spyOn(k8sService.roleBindingService, 'GetOneByNsName').mockResolvedValue(mockRoleBinding as any)

      const result = await controller.GetOneByNsName('default', 'multi-rb')

      expect(result).toEqual(mockRoleBinding)
      expect(result.subjects).toHaveLength(3)
    })

    it('should get rolebinding with ClusterRole reference', async () => {
      const mockRoleBinding = {
        metadata: { name: 'cluster-role-rb', namespace: 'default' },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: 'admin',
        },
        subjects: [{ kind: 'User', name: 'admin', apiGroup: 'rbac.authorization.k8s.io' }],
      }
      vi.spyOn(k8sService.roleBindingService, 'GetOneByNsName').mockResolvedValue(mockRoleBinding as any)

      const result = await controller.GetOneByNsName('default', 'cluster-role-rb')

      expect(result).toEqual(mockRoleBinding)
      expect(result.roleRef.kind).toBe('ClusterRole')
    })

    it('should handle special characters in rolebinding name', async () => {
      const mockRoleBinding = { metadata: { name: 'test-rb-123', namespace: 'default' } }
      vi.spyOn(k8sService.roleBindingService, 'GetOneByNsName').mockResolvedValue(mockRoleBinding as any)

      const result = await controller.GetOneByNsName('default', 'test-rb-123')

      expect(result).toEqual(mockRoleBinding)
      expect(k8sService.roleBindingService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-rb-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockRoleBinding = { metadata: { name: 'test-rb', namespace: 'kube-system' } }
      vi.spyOn(k8sService.roleBindingService, 'GetOneByNsName').mockResolvedValue(mockRoleBinding as any)

      const result = await controller.GetOneByNsName('kube-system', 'test-rb')

      expect(result).toEqual(mockRoleBinding)
      expect(k8sService.roleBindingService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-rb')
    })
  })

  describe('Delete', () => {
    it('should delete a single rolebinding', async () => {
      vi.spyOn(k8sService.roleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-rb']
      await controller.Delete(nsn)

      expect(k8sService.roleBindingService.Delete).toHaveBeenCalledWith('test-rb', 'default')
    })

    it('should delete multiple rolebindings', async () => {
      vi.spyOn(k8sService.roleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/rb1', 'kube-system/rb2', 'default/rb3']
      await controller.Delete(nsn)

      expect(k8sService.roleBindingService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.roleBindingService.Delete).toHaveBeenCalledWith('rb1', 'default')
      expect(k8sService.roleBindingService.Delete).toHaveBeenCalledWith('rb2', 'kube-system')
      expect(k8sService.roleBindingService.Delete).toHaveBeenCalledWith('rb3', 'default')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.roleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.roleBindingService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.roleBindingService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/rb1', 'default/rb2', 'default/rb3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.roleBindingService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle rolebindings with slashes in namespace/name format', async () => {
      vi.spyOn(k8sService.roleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-rolebinding-name']
      await controller.Delete(nsn)

      expect(k8sService.roleBindingService.Delete).toHaveBeenCalledWith('my-rolebinding-name', 'my-namespace')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.roleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-rb']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should delete rolebindings from multiple namespaces', async () => {
      vi.spyOn(k8sService.roleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn = [
        'default/user-rb',
        'kube-system/admin-rb',
        'production/app-rb',
        'staging/test-rb',
      ]
      await controller.Delete(nsn)

      expect(k8sService.roleBindingService.Delete).toHaveBeenCalledTimes(4)
      expect(k8sService.roleBindingService.Delete).toHaveBeenCalledWith('user-rb', 'default')
      expect(k8sService.roleBindingService.Delete).toHaveBeenCalledWith('admin-rb', 'kube-system')
      expect(k8sService.roleBindingService.Delete).toHaveBeenCalledWith('app-rb', 'production')
      expect(k8sService.roleBindingService.Delete).toHaveBeenCalledWith('test-rb', 'staging')
    })

    it('should handle deletion of system rolebindings', async () => {
      vi.spyOn(k8sService.roleBindingService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['kube-system/system:controller:token-cleaner']
      await controller.Delete(nsn)

      expect(k8sService.roleBindingService.Delete).toHaveBeenCalledWith('system:controller:token-cleaner', 'kube-system')
    })
  })

  describe('RBAC Scenarios', () => {
    it('should handle rolebinding for pod reader role', async () => {
      const mockRoleBinding = {
        metadata: { name: 'pod-reader-binding', namespace: 'default' },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name: 'pod-reader',
        },
        subjects: [{ kind: 'User', name: 'jane', apiGroup: 'rbac.authorization.k8s.io' }],
      }
      vi.spyOn(k8sService.roleBindingService, 'GetOneByNsName').mockResolvedValue(mockRoleBinding as any)

      const result = await controller.GetOneByNsName('default', 'pod-reader-binding')

      expect(result.roleRef.name).toBe('pod-reader')
      expect(result.subjects[0].name).toBe('jane')
    })

    it('should handle rolebinding for service account', async () => {
      const mockRoleBinding = {
        metadata: { name: 'app-sa-binding', namespace: 'production' },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name: 'deployment-manager',
        },
        subjects: [
          {
            kind: 'ServiceAccount',
            name: 'app-deployer',
            namespace: 'production',
          },
        ],
      }
      vi.spyOn(k8sService.roleBindingService, 'GetOneByNsName').mockResolvedValue(mockRoleBinding as any)

      const result = await controller.GetOneByNsName('production', 'app-sa-binding')

      expect(result.subjects[0].kind).toBe('ServiceAccount')
      expect(result.subjects[0].namespace).toBe('production')
    })

    it('should handle rolebinding for group permissions', async () => {
      const mockRoleBinding = {
        metadata: { name: 'developers-binding', namespace: 'dev' },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name: 'developer-role',
        },
        subjects: [
          {
            kind: 'Group',
            name: 'system:authenticated',
            apiGroup: 'rbac.authorization.k8s.io',
          },
        ],
      }
      vi.spyOn(k8sService.roleBindingService, 'GetOneByNsName').mockResolvedValue(mockRoleBinding as any)

      const result = await controller.GetOneByNsName('dev', 'developers-binding')

      expect(result.subjects[0].kind).toBe('Group')
      expect(result.subjects[0].name).toBe('system:authenticated')
    })
  })
})
