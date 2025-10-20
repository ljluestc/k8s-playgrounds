import { vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createClusterRoleBinding, createMockClientService } from '../../../../test/utils/k8s-mocks'
import { ClusterRoleBindingService } from './ClusterRoleBinding.service'

describe('ClusterRoleBindingService', () => {
  let service: ClusterRoleBindingService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getRbacAuthorizationV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ClusterRoleBindingService,
          useFactory: (clientService: ClientService) => {
            return new ClusterRoleBindingService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<ClusterRoleBindingService>(ClusterRoleBindingService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all cluster role bindings', async () => {
      const mockBindings = [
        createClusterRoleBinding('cluster-admin-binding'),
        createClusterRoleBinding('view-binding'),
      ]
      mockK8sApi.listClusterRoleBinding.mockResolvedValue({
        body: { items: mockBindings },
      })

      const result = await service.List()

      expect(result).toEqual(mockBindings)
      expect(mockK8sApi.listClusterRoleBinding).toHaveBeenCalled()
    })

    it('should return empty list when no cluster role bindings exist', async () => {
      mockK8sApi.listClusterRoleBinding.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
      expect(mockK8sApi.listClusterRoleBinding).toHaveBeenCalled()
    })

    it('should handle API errors when listing', async () => {
      const error = new Error('API Error')
      mockK8sApi.listClusterRoleBinding.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should list system cluster role bindings', async () => {
      const mockBindings = [
        createClusterRoleBinding('system:kube-scheduler', {
          roleRef: { name: 'system:kube-scheduler' },
        }),
        createClusterRoleBinding('system:kube-controller-manager', {
          roleRef: { name: 'system:kube-controller-manager' },
        }),
      ]
      mockK8sApi.listClusterRoleBinding.mockResolvedValue({
        body: { items: mockBindings },
      })

      const result = await service.List()

      expect(result).toHaveLength(2)
      expect(result[0].metadata.name).toMatch(/^system:/)
      expect(result[1].metadata.name).toMatch(/^system:/)
    })

    it('should list bindings with User subjects', async () => {
      const mockBindings = [
        createClusterRoleBinding('user-binding', {
          subjects: [
            {
              kind: 'User',
              name: 'alice',
              apiGroup: 'rbac.authorization.k8s.io',
            },
          ],
        }),
      ]
      mockK8sApi.listClusterRoleBinding.mockResolvedValue({
        body: { items: mockBindings },
      })

      const result = await service.List()

      expect(result[0].subjects[0].kind).toBe('User')
      expect(result[0].subjects[0].name).toBe('alice')
    })

    it('should list bindings with Group subjects', async () => {
      const mockBindings = [
        createClusterRoleBinding('group-binding', {
          subjects: [
            {
              kind: 'Group',
              name: 'system:masters',
              apiGroup: 'rbac.authorization.k8s.io',
            },
          ],
        }),
      ]
      mockK8sApi.listClusterRoleBinding.mockResolvedValue({
        body: { items: mockBindings },
      })

      const result = await service.List()

      expect(result[0].subjects[0].kind).toBe('Group')
      expect(result[0].subjects[0].name).toBe('system:masters')
    })

    it('should list bindings with ServiceAccount subjects', async () => {
      const mockBindings = [
        createClusterRoleBinding('sa-binding', {
          subjects: [
            {
              kind: 'ServiceAccount',
              name: 'default',
              namespace: 'kube-system',
            },
          ],
        }),
      ]
      mockK8sApi.listClusterRoleBinding.mockResolvedValue({
        body: { items: mockBindings },
      })

      const result = await service.List()

      expect(result[0].subjects[0].kind).toBe('ServiceAccount')
      expect(result[0].subjects[0].namespace).toBe('kube-system')
    })

    it('should list bindings with multiple subjects', async () => {
      const mockBindings = [
        createClusterRoleBinding('multi-subject-binding', {
          subjects: [
            { kind: 'User', name: 'alice', apiGroup: 'rbac.authorization.k8s.io' },
            { kind: 'Group', name: 'developers', apiGroup: 'rbac.authorization.k8s.io' },
            { kind: 'ServiceAccount', name: 'sa1', namespace: 'default' },
          ],
        }),
      ]
      mockK8sApi.listClusterRoleBinding.mockResolvedValue({
        body: { items: mockBindings },
      })

      const result = await service.List()

      expect(result[0].subjects).toHaveLength(3)
      expect(result[0].subjects[0].kind).toBe('User')
      expect(result[0].subjects[1].kind).toBe('Group')
      expect(result[0].subjects[2].kind).toBe('ServiceAccount')
    })

    it('should list bindings for different cluster roles', async () => {
      const mockBindings = [
        createClusterRoleBinding('admin-binding', {
          roleRef: { name: 'cluster-admin' },
        }),
        createClusterRoleBinding('view-binding', {
          roleRef: { name: 'view' },
        }),
        createClusterRoleBinding('edit-binding', {
          roleRef: { name: 'edit' },
        }),
      ]
      mockK8sApi.listClusterRoleBinding.mockResolvedValue({
        body: { items: mockBindings },
      })

      const result = await service.List()

      expect(result).toHaveLength(3)
      expect(result[0].roleRef.name).toBe('cluster-admin')
      expect(result[1].roleRef.name).toBe('view')
      expect(result[2].roleRef.name).toBe('edit')
    })

    it('should handle large number of cluster role bindings', async () => {
      const mockBindings = Array.from({ length: 100 }, (_, i) =>
        createClusterRoleBinding(`binding-${i}`),
      )
      mockK8sApi.listClusterRoleBinding.mockResolvedValue({
        body: { items: mockBindings },
      })

      const result = await service.List()

      expect(result).toHaveLength(100)
    })

    it('should list bindings with custom roles', async () => {
      const mockBindings = [
        createClusterRoleBinding('custom-binding', {
          roleRef: { name: 'my-custom-role' },
        }),
      ]
      mockK8sApi.listClusterRoleBinding.mockResolvedValue({
        body: { items: mockBindings },
      })

      const result = await service.List()

      expect(result[0].roleRef.name).toBe('my-custom-role')
    })
  })

  describe('GetOneByName', () => {
    it('should get a single cluster role binding by name', async () => {
      const mockBinding = createClusterRoleBinding('cluster-admin-binding')
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('cluster-admin-binding')

      expect(result).toEqual(mockBinding)
      expect(mockK8sApi.readClusterRoleBinding).toHaveBeenCalledWith('cluster-admin-binding')
    })

    it('should handle not found errors', async () => {
      const error = new Error('ClusterRoleBinding not found')
      mockK8sApi.readClusterRoleBinding.mockRejectedValue(error)

      await expect(service.GetOneByName('nonexistent')).rejects.toThrow('ClusterRoleBinding not found')
    })

    it('should get binding with User subject', async () => {
      const mockBinding = createClusterRoleBinding('user-binding', {
        subjects: [
          {
            kind: 'User',
            name: 'alice',
            apiGroup: 'rbac.authorization.k8s.io',
          },
        ],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('user-binding')

      expect(result.subjects[0].kind).toBe('User')
      expect(result.subjects[0].name).toBe('alice')
    })

    it('should get binding with Group subject', async () => {
      const mockBinding = createClusterRoleBinding('group-binding', {
        subjects: [
          {
            kind: 'Group',
            name: 'system:masters',
            apiGroup: 'rbac.authorization.k8s.io',
          },
        ],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('group-binding')

      expect(result.subjects[0].kind).toBe('Group')
      expect(result.subjects[0].name).toBe('system:masters')
    })

    it('should get binding with ServiceAccount subject', async () => {
      const mockBinding = createClusterRoleBinding('sa-binding', {
        subjects: [
          {
            kind: 'ServiceAccount',
            name: 'default',
            namespace: 'kube-system',
          },
        ],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('sa-binding')

      expect(result.subjects[0].kind).toBe('ServiceAccount')
      expect(result.subjects[0].name).toBe('default')
      expect(result.subjects[0].namespace).toBe('kube-system')
    })

    it('should get binding with multiple subjects', async () => {
      const mockBinding = createClusterRoleBinding('multi-binding', {
        subjects: [
          { kind: 'User', name: 'alice', apiGroup: 'rbac.authorization.k8s.io' },
          { kind: 'Group', name: 'developers', apiGroup: 'rbac.authorization.k8s.io' },
          { kind: 'ServiceAccount', name: 'sa1', namespace: 'default' },
        ],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('multi-binding')

      expect(result.subjects).toHaveLength(3)
    })

    it('should get system cluster role binding', async () => {
      const mockBinding = createClusterRoleBinding('system:kube-scheduler', {
        roleRef: { name: 'system:kube-scheduler' },
        subjects: [
          {
            kind: 'User',
            name: 'system:kube-scheduler',
            apiGroup: 'rbac.authorization.k8s.io',
          },
        ],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('system:kube-scheduler')

      expect(result.metadata.name).toBe('system:kube-scheduler')
      expect(result.roleRef.name).toBe('system:kube-scheduler')
    })

    it('should get binding for cluster-admin role', async () => {
      const mockBinding = createClusterRoleBinding('admin-binding', {
        roleRef: { name: 'cluster-admin' },
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('admin-binding')

      expect(result.roleRef.name).toBe('cluster-admin')
    })

    it('should get binding for view role', async () => {
      const mockBinding = createClusterRoleBinding('view-binding', {
        roleRef: { name: 'view' },
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('view-binding')

      expect(result.roleRef.name).toBe('view')
    })

    it('should get binding for edit role', async () => {
      const mockBinding = createClusterRoleBinding('edit-binding', {
        roleRef: { name: 'edit' },
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('edit-binding')

      expect(result.roleRef.name).toBe('edit')
    })

    it('should get binding with custom cluster role', async () => {
      const mockBinding = createClusterRoleBinding('custom-binding', {
        roleRef: { name: 'my-custom-role' },
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('custom-binding')

      expect(result.roleRef.name).toBe('my-custom-role')
    })

    it('should handle binding names with special characters', async () => {
      const mockBinding = createClusterRoleBinding('my-binding-123')
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('my-binding-123')

      expect(result.metadata.name).toBe('my-binding-123')
    })

    it('should verify ClusterRoleRef has correct apiGroup', async () => {
      const mockBinding = createClusterRoleBinding('test-binding')
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('test-binding')

      expect(result.roleRef.apiGroup).toBe('rbac.authorization.k8s.io')
    })

    it('should verify ClusterRoleRef has correct kind', async () => {
      const mockBinding = createClusterRoleBinding('test-binding')
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('test-binding')

      expect(result.roleRef.kind).toBe('ClusterRole')
    })
  })

  describe('Delete', () => {
    it('should delete a cluster role binding', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteClusterRoleBinding.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-binding')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteClusterRoleBinding).toHaveBeenCalledWith('test-binding')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteClusterRoleBinding.mockRejectedValue(error)

      await expect(service.Delete('test-binding')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent binding', async () => {
      const error = new Error('ClusterRoleBinding not found')
      mockK8sApi.deleteClusterRoleBinding.mockRejectedValue(error)

      await expect(service.Delete('nonexistent')).rejects.toThrow('ClusterRoleBinding not found')
    })

    it('should delete system cluster role binding', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteClusterRoleBinding.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('system:kube-scheduler')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteClusterRoleBinding).toHaveBeenCalledWith('system:kube-scheduler')
    })

    it('should delete binding with special characters in name', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteClusterRoleBinding.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-custom-binding:v1')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteClusterRoleBinding).toHaveBeenCalledWith('my-custom-binding:v1')
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete cluster role bindings')
      mockK8sApi.deleteClusterRoleBinding.mockRejectedValue(error)

      await expect(service.Delete('protected-binding')).rejects.toThrow('Forbidden')
    })

    it('should handle API server errors during deletion', async () => {
      const error = new Error('Internal server error')
      mockK8sApi.deleteClusterRoleBinding.mockRejectedValue(error)

      await expect(service.Delete('test-binding')).rejects.toThrow('Internal server error')
    })

    it('should delete binding for cluster-admin role', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteClusterRoleBinding.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('cluster-admin-binding')

      expect(result).toEqual(mockResponse)
    })

    it('should delete binding for view role', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteClusterRoleBinding.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('view-binding')

      expect(result).toEqual(mockResponse)
    })

    it('should delete binding for edit role', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteClusterRoleBinding.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('edit-binding')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = {
        status: 'Success',
        metadata: { deletionTimestamp: new Date().toISOString() },
      }
      mockK8sApi.deleteClusterRoleBinding.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete')

      expect(result).toEqual(mockResponse)
      expect(result.metadata.deletionTimestamp).toBeDefined()
    })

    it('should handle deletion with finalizers', async () => {
      const mockResponse = {
        status: 'Success',
        metadata: { finalizers: ['kubernetes'] },
      }
      mockK8sApi.deleteClusterRoleBinding.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('binding-with-finalizer')

      expect(result).toEqual(mockResponse)
    })
  })

  describe('RBAC Scenarios', () => {
    it('should handle binding for pod reader role', async () => {
      const mockBinding = createClusterRoleBinding('pod-reader-binding', {
        roleRef: { name: 'pod-reader' },
        subjects: [{ kind: 'User', name: 'jane', apiGroup: 'rbac.authorization.k8s.io' }],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('pod-reader-binding')

      expect(result.roleRef.name).toBe('pod-reader')
      expect(result.subjects[0].name).toBe('jane')
    })

    it('should handle binding for namespace admin across all namespaces', async () => {
      const mockBinding = createClusterRoleBinding('namespace-admin-binding', {
        roleRef: { name: 'admin' },
        subjects: [{ kind: 'Group', name: 'namespace-admins', apiGroup: 'rbac.authorization.k8s.io' }],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('namespace-admin-binding')

      expect(result.roleRef.name).toBe('admin')
      expect(result.subjects[0].kind).toBe('Group')
    })

    it('should handle binding for CI/CD service account', async () => {
      const mockBinding = createClusterRoleBinding('cicd-binding', {
        roleRef: { name: 'cluster-admin' },
        subjects: [
          {
            kind: 'ServiceAccount',
            name: 'cicd-bot',
            namespace: 'cicd',
          },
        ],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('cicd-binding')

      expect(result.subjects[0].kind).toBe('ServiceAccount')
      expect(result.subjects[0].namespace).toBe('cicd')
    })

    it('should handle binding for monitoring service accounts', async () => {
      const mockBinding = createClusterRoleBinding('monitoring-binding', {
        roleRef: { name: 'view' },
        subjects: [
          {
            kind: 'ServiceAccount',
            name: 'prometheus',
            namespace: 'monitoring',
          },
        ],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('monitoring-binding')

      expect(result.subjects[0].name).toBe('prometheus')
      expect(result.subjects[0].namespace).toBe('monitoring')
    })

    it('should handle binding with mixed subject types', async () => {
      const mockBinding = createClusterRoleBinding('mixed-binding', {
        subjects: [
          { kind: 'User', name: 'admin', apiGroup: 'rbac.authorization.k8s.io' },
          { kind: 'Group', name: 'admins', apiGroup: 'rbac.authorization.k8s.io' },
          { kind: 'ServiceAccount', name: 'admin-sa', namespace: 'kube-system' },
        ],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('mixed-binding')

      const subjectKinds = result.subjects.map((s: any) => s.kind)
      expect(subjectKinds).toContain('User')
      expect(subjectKinds).toContain('Group')
      expect(subjectKinds).toContain('ServiceAccount')
    })
  })

  describe('ClusterRoleRef Validation', () => {
    it('should validate roleRef has apiGroup', async () => {
      const mockBinding = createClusterRoleBinding('test-binding')
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('test-binding')

      expect(result.roleRef).toHaveProperty('apiGroup')
      expect(result.roleRef.apiGroup).toBe('rbac.authorization.k8s.io')
    })

    it('should validate roleRef has kind ClusterRole', async () => {
      const mockBinding = createClusterRoleBinding('test-binding')
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('test-binding')

      expect(result.roleRef.kind).toBe('ClusterRole')
    })

    it('should validate roleRef has name', async () => {
      const mockBinding = createClusterRoleBinding('test-binding', {
        roleRef: { name: 'custom-role' },
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('test-binding')

      expect(result.roleRef).toHaveProperty('name')
      expect(result.roleRef.name).toBe('custom-role')
    })

    it('should handle roleRef to built-in roles', async () => {
      const builtInRoles = ['cluster-admin', 'admin', 'edit', 'view']

      for (const roleName of builtInRoles) {
        const mockBinding = createClusterRoleBinding(`${roleName}-binding`, {
          roleRef: { name: roleName },
        })
        mockK8sApi.readClusterRoleBinding.mockResolvedValue({
          body: mockBinding,
        })

        const result = await service.GetOneByName(`${roleName}-binding`)
        expect(result.roleRef.name).toBe(roleName)
      }
    })

    it('should handle roleRef to system roles', async () => {
      const mockBinding = createClusterRoleBinding('system-binding', {
        roleRef: { name: 'system:node' },
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('system-binding')

      expect(result.roleRef.name).toMatch(/^system:/)
    })
  })

  describe('Subjects Validation', () => {
    it('should validate User subject has required fields', async () => {
      const mockBinding = createClusterRoleBinding('user-binding', {
        subjects: [
          {
            kind: 'User',
            name: 'alice',
            apiGroup: 'rbac.authorization.k8s.io',
          },
        ],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('user-binding')

      expect(result.subjects[0]).toHaveProperty('kind', 'User')
      expect(result.subjects[0]).toHaveProperty('name', 'alice')
      expect(result.subjects[0]).toHaveProperty('apiGroup', 'rbac.authorization.k8s.io')
    })

    it('should validate Group subject has required fields', async () => {
      const mockBinding = createClusterRoleBinding('group-binding', {
        subjects: [
          {
            kind: 'Group',
            name: 'developers',
            apiGroup: 'rbac.authorization.k8s.io',
          },
        ],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('group-binding')

      expect(result.subjects[0]).toHaveProperty('kind', 'Group')
      expect(result.subjects[0]).toHaveProperty('name', 'developers')
      expect(result.subjects[0]).toHaveProperty('apiGroup', 'rbac.authorization.k8s.io')
    })

    it('should validate ServiceAccount subject has required fields', async () => {
      const mockBinding = createClusterRoleBinding('sa-binding', {
        subjects: [
          {
            kind: 'ServiceAccount',
            name: 'default',
            namespace: 'default',
          },
        ],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('sa-binding')

      expect(result.subjects[0]).toHaveProperty('kind', 'ServiceAccount')
      expect(result.subjects[0]).toHaveProperty('name', 'default')
      expect(result.subjects[0]).toHaveProperty('namespace', 'default')
    })

    it('should handle empty subjects array', async () => {
      const mockBinding = createClusterRoleBinding('no-subjects-binding', {
        subjects: [],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('no-subjects-binding')

      expect(result.subjects).toEqual([])
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get RbacAuthorizationV1Api', async () => {
      const mockBindings = [createClusterRoleBinding('test-binding')]
      mockK8sApi.listClusterRoleBinding.mockResolvedValue({
        body: { items: mockBindings },
      })

      await service.List()

      expect(clientService.getRbacAuthorizationV1Api).toHaveBeenCalled()
    })

    it('should call getRbacAuthorizationV1Api for every operation', async () => {
      mockK8sApi.listClusterRoleBinding.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({ body: createClusterRoleBinding('test') })
      mockK8sApi.deleteClusterRoleBinding.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByName('test')
      await service.Delete('test')

      expect(clientService.getRbacAuthorizationV1Api).toHaveBeenCalledTimes(4)
    })
  })

  describe('System Bindings', () => {
    it('should handle system:node binding', async () => {
      const mockBinding = createClusterRoleBinding('system:node', {
        roleRef: { name: 'system:node' },
        subjects: [{ kind: 'User', name: 'system:node', apiGroup: 'rbac.authorization.k8s.io' }],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('system:node')

      expect(result.metadata.name).toBe('system:node')
      expect(result.roleRef.name).toBe('system:node')
    })

    it('should handle system:kube-dns binding', async () => {
      const mockBinding = createClusterRoleBinding('system:kube-dns', {
        roleRef: { name: 'system:kube-dns' },
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('system:kube-dns')

      expect(result.metadata.name).toBe('system:kube-dns')
    })

    it('should handle system:discovery binding', async () => {
      const mockBinding = createClusterRoleBinding('system:discovery', {
        roleRef: { name: 'system:discovery' },
        subjects: [{ kind: 'Group', name: 'system:authenticated', apiGroup: 'rbac.authorization.k8s.io' }],
      })
      mockK8sApi.readClusterRoleBinding.mockResolvedValue({
        body: mockBinding,
      })

      const result = await service.GetOneByName('system:discovery')

      expect(result.subjects[0].kind).toBe('Group')
      expect(result.subjects[0].name).toBe('system:authenticated')
    })

    it('should list multiple system bindings', async () => {
      const mockBindings = [
        createClusterRoleBinding('system:kube-scheduler'),
        createClusterRoleBinding('system:kube-controller-manager'),
        createClusterRoleBinding('system:node'),
      ]
      mockK8sApi.listClusterRoleBinding.mockResolvedValue({
        body: { items: mockBindings },
      })

      const result = await service.List()

      expect(result).toHaveLength(3)
      result.forEach((binding: any) => {
        expect(binding.metadata.name).toMatch(/^system:/)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API timeout errors', async () => {
      const error = new Error('Request timeout')
      mockK8sApi.listClusterRoleBinding.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('Request timeout')
    })

    it('should handle unauthorized access errors', async () => {
      const error = new Error('Unauthorized')
      mockK8sApi.readClusterRoleBinding.mockRejectedValue(error)

      await expect(service.GetOneByName('admin-binding')).rejects.toThrow('Unauthorized')
    })

    it('should handle network errors', async () => {
      const error = new Error('Network error: ECONNREFUSED')
      mockK8sApi.listClusterRoleBinding.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('Network error')
    })

    it('should handle malformed responses', async () => {
      mockK8sApi.listClusterRoleBinding.mockResolvedValue({
        body: null,
      })

      await expect(service.List()).rejects.toThrow()
    })

    it('should handle API server unavailable', async () => {
      const error = new Error('Service Unavailable')
      mockK8sApi.readClusterRoleBinding.mockRejectedValue(error)

      await expect(service.GetOneByName('test-binding')).rejects.toThrow('Service Unavailable')
    })

    it('should handle conflict errors during deletion', async () => {
      const error = new Error('Conflict: Resource is being deleted')
      mockK8sApi.deleteClusterRoleBinding.mockRejectedValue(error)

      await expect(service.Delete('conflicted-binding')).rejects.toThrow('Conflict')
    })

    it('should handle invalid resource version errors', async () => {
      const error = new Error('Invalid resource version')
      mockK8sApi.readClusterRoleBinding.mockRejectedValue(error)

      await expect(service.GetOneByName('test-binding')).rejects.toThrow('Invalid resource version')
    })
  })
})
