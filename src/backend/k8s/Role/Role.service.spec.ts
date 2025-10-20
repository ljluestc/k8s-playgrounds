import { _vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createMockClientService, createRole } from '../../../../test/utils/k8s-mocks'
import { RoleService } from './Role.service'

describe('RoleService', () => {
  let service: RoleService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getRbacAuthorizationV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RoleService,
          useFactory: (clientService: ClientService) => {
            return new RoleService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<RoleService>(RoleService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all roles across all namespaces when no namespace specified', async () => {
      const mockRoles = [createRole('role-1', 'default'), createRole('role-2', 'kube-system')]
      mockK8sApi.listRoleForAllNamespaces.mockResolvedValue({
        body: { items: mockRoles },
      })

      const result = await service.List()

      expect(result).toEqual(mockRoles)
      expect(mockK8sApi.listRoleForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedRole).not.toHaveBeenCalled()
    })

    it('should list all roles when namespace is "null" string', async () => {
      const mockRoles = [createRole('role-1')]
      mockK8sApi.listRoleForAllNamespaces.mockResolvedValue({
        body: { items: mockRoles },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockRoles)
      expect(mockK8sApi.listRoleForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedRole).not.toHaveBeenCalled()
    })

    it('should list roles in a specific namespace', async () => {
      const mockRoles = [createRole('role-1', 'default')]
      mockK8sApi.listNamespacedRole.mockResolvedValue({
        body: { items: mockRoles },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockRoles)
      expect(mockK8sApi.listNamespacedRole).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listRoleForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all roles', async () => {
      const error = new Error('API Error')
      mockK8sApi.listRoleForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced roles', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedRole.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no roles exist', async () => {
      mockK8sApi.listRoleForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list roles in kube-system namespace', async () => {
      const mockRoles = [createRole('system-role', 'kube-system')]
      mockK8sApi.listNamespacedRole.mockResolvedValue({
        body: { items: mockRoles },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockRoles)
      expect(mockK8sApi.listNamespacedRole).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockRoles = [createRole('my-role', 'my-namespace-123')]
      mockK8sApi.listNamespacedRole.mockResolvedValue({
        body: { items: mockRoles },
      })

      const result = await service.List('my-namespace-123')

      expect(result).toEqual(mockRoles)
      expect(mockK8sApi.listNamespacedRole).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should list multiple roles with different RBAC rules', async () => {
      const mockRoles = [
        createRole('reader-role', 'default'),
        createRole('writer-role', 'default'),
        createRole('admin-role', 'default'),
      ]
      mockRoles[0].rules = [{ apiGroups: [''], resources: ['pods'], verbs: ['get', 'list'] }]
      mockRoles[1].rules = [{ apiGroups: [''], resources: ['pods'], verbs: ['get', 'list', 'create'] }]
      mockRoles[2].rules = [{ apiGroups: ['*'], resources: ['*'], verbs: ['*'] }]

      mockK8sApi.listNamespacedRole.mockResolvedValue({
        body: { items: mockRoles },
      })

      const result = await service.List('default')

      expect(result).toHaveLength(3)
      expect(result[0].rules![0].verbs).toContain('get')
      expect(result[1].rules![0].verbs).toContain('create')
      expect(result[2].rules![0].verbs).toContain('*')
    })

    it('should handle undefined namespace parameter', async () => {
      const mockRoles = [createRole('role-1')]
      mockK8sApi.listRoleForAllNamespaces.mockResolvedValue({
        body: { items: mockRoles },
      })

      const result = await service.List(undefined)

      expect(result).toEqual(mockRoles)
      expect(mockK8sApi.listRoleForAllNamespaces).toHaveBeenCalled()
    })

    it('should list roles from multiple API groups', async () => {
      const mockRoles = [createRole('multi-group-role', 'default')]
      mockRoles[0].rules = [
        { apiGroups: [''], resources: ['pods'], verbs: ['get', 'list'] },
        { apiGroups: ['apps'], resources: ['deployments'], verbs: ['get', 'list'] },
        { apiGroups: ['batch'], resources: ['jobs'], verbs: ['get', 'list'] },
      ]

      mockK8sApi.listNamespacedRole.mockResolvedValue({
        body: { items: mockRoles },
      })

      const result = await service.List('default')

      expect(result[0].rules).toHaveLength(3)
      expect(result[0].rules![0].apiGroups).toContain('')
      expect(result[0].rules![1].apiGroups).toContain('apps')
      expect(result[0].rules![2].apiGroups).toContain('batch')
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single role by namespace and name', async () => {
      const mockRole = createRole('test-role', 'default')
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: mockRole,
      })

      const result = await service.GetOneByNsName('default', 'test-role')

      expect(result).toEqual(mockRole)
      expect(mockK8sApi.readNamespacedRole).toHaveBeenCalledWith('test-role', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('Role not found')
      mockK8sApi.readNamespacedRole.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Role not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedRole.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-role')).rejects.toThrow('Namespace does not exist')
    })

    it('should get role with basic pod permissions', async () => {
      const mockRole = createRole('pod-reader', 'default')
      mockRole.rules = [
        { apiGroups: [''], resources: ['pods'], verbs: ['get', 'list', 'watch'] },
      ]
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: mockRole,
      })

      const result = await service.GetOneByNsName('default', 'pod-reader')

      expect(result).toEqual(mockRole)
      expect(result.rules![0].resources).toContain('pods')
      expect(result.rules![0].verbs).toHaveLength(3)
    })

    it('should get role with multiple resource types', async () => {
      const mockRole = createRole('multi-resource-role', 'default')
      mockRole.rules = [
        { apiGroups: [''], resources: ['pods', 'services', 'configmaps'], verbs: ['get', 'list'] },
      ]
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: mockRole,
      })

      const result = await service.GetOneByNsName('default', 'multi-resource-role')

      expect(result.rules![0].resources).toHaveLength(3)
      expect(result.rules![0].resources).toContain('pods')
      expect(result.rules![0].resources).toContain('services')
      expect(result.rules![0].resources).toContain('configmaps')
    })

    it('should get role with deployment permissions', async () => {
      const mockRole = createRole('deployment-manager', 'default')
      mockRole.rules = [
        { apiGroups: ['apps'], resources: ['deployments'], verbs: ['get', 'list', 'create', 'update', 'delete'] },
      ]
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: mockRole,
      })

      const result = await service.GetOneByNsName('default', 'deployment-manager')

      expect(result.rules![0].apiGroups).toContain('apps')
      expect(result.rules![0].resources).toContain('deployments')
      expect(result.rules![0].verbs).toContain('create')
      expect(result.rules![0].verbs).toContain('delete')
    })

    it('should get role with wildcard permissions', async () => {
      const mockRole = createRole('admin-role', 'default')
      mockRole.rules = [
        { apiGroups: ['*'], resources: ['*'], verbs: ['*'] },
      ]
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: mockRole,
      })

      const result = await service.GetOneByNsName('default', 'admin-role')

      expect(result.rules![0].apiGroups).toContain('*')
      expect(result.rules![0].resources).toContain('*')
      expect(result.rules![0].verbs).toContain('*')
    })

    it('should get role with resourceNames specified', async () => {
      const mockRole = createRole('specific-pod-role', 'default')
      mockRole.rules = [
        {
          apiGroups: [''],
          resources: ['pods'],
          verbs: ['get', 'update'],
          resourceNames: ['my-specific-pod', 'another-pod'],
        },
      ]
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: mockRole,
      })

      const result = await service.GetOneByNsName('default', 'specific-pod-role')

      expect(result.rules![0].resourceNames).toHaveLength(2)
      expect(result.rules![0].resourceNames).toContain('my-specific-pod')
    })

    it('should handle role names with hyphens and numbers', async () => {
      const mockRole = createRole('my-role-123', 'default')
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: mockRole,
      })

      const result = await service.GetOneByNsName('default', 'my-role-123')

      expect(result).toEqual(mockRole)
      expect(mockK8sApi.readNamespacedRole).toHaveBeenCalledWith('my-role-123', 'default')
    })

    it('should get role with complex multi-rule permissions', async () => {
      const mockRole = createRole('complex-role', 'production')
      mockRole.rules = [
        { apiGroups: [''], resources: ['pods'], verbs: ['get', 'list', 'watch'] },
        { apiGroups: [''], resources: ['services'], verbs: ['get', 'list'] },
        { apiGroups: ['apps'], resources: ['deployments', 'replicasets'], verbs: ['get', 'list', 'watch'] },
        { apiGroups: ['batch'], resources: ['jobs', 'cronjobs'], verbs: ['get', 'list'] },
      ]
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: mockRole,
      })

      const result = await service.GetOneByNsName('production', 'complex-role')

      expect(result.rules).toHaveLength(4)
      expect(result.rules![2].resources).toContain('deployments')
      expect(result.rules![3].resources).toContain('cronjobs')
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot read roles')
      mockK8sApi.readNamespacedRole.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'test-role')).rejects.toThrow('Forbidden')
    })

    it('should get role with subresource permissions', async () => {
      const mockRole = createRole('pod-logs-reader', 'default')
      mockRole.rules = [
        { apiGroups: [''], resources: ['pods/log', 'pods/status'], verbs: ['get'] },
      ]
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: mockRole,
      })

      const result = await service.GetOneByNsName('default', 'pod-logs-reader')

      expect(result.rules![0].resources).toContain('pods/log')
      expect(result.rules![0].resources).toContain('pods/status')
    })

    it('should get role from kube-system namespace', async () => {
      const mockRole = createRole('system-role', 'kube-system')
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: mockRole,
      })

      const result = await service.GetOneByNsName('kube-system', 'system-role')

      expect(result.metadata?.namespace).toBe('kube-system')
      expect(mockK8sApi.readNamespacedRole).toHaveBeenCalledWith('system-role', 'kube-system')
    })
  })

  describe('Delete', () => {
    it('should delete a role', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedRole.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-role', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedRole).toHaveBeenCalledWith('test-role', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedRole.mockRejectedValue(error)

      await expect(service.Delete('test-role', 'default')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent role', async () => {
      const error = new Error('Role not found')
      mockK8sApi.deleteNamespacedRole.mockRejectedValue(error)

      await expect(service.Delete('nonexistent', 'default')).rejects.toThrow('Role not found')
    })

    it('should delete role from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedRole.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-role', 'kube-system')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedRole).toHaveBeenCalledWith('my-role', 'kube-system')
    })

    it('should handle role with finalizers', async () => {
      const mockResponse = { status: 'Success', metadata: { finalizers: ['kubernetes'] } }
      mockK8sApi.deleteNamespacedRole.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('role-with-finalizer', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNamespacedRole.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete roles')
      mockK8sApi.deleteNamespacedRole.mockRejectedValue(error)

      await expect(service.Delete('test-role', 'default')).rejects.toThrow('Forbidden')
    })

    it('should delete role from production namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedRole.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('production-role', 'production')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedRole).toHaveBeenCalledWith('production-role', 'production')
    })

    it('should handle deletion with special role names', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedRole.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-role-123-test', 'my-namespace-456')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedRole).toHaveBeenCalledWith('my-role-123-test', 'my-namespace-456')
    })

    it('should handle namespace not found during deletion', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.deleteNamespacedRole.mockRejectedValue(error)

      await expect(service.Delete('test-role', 'nonexistent-ns')).rejects.toThrow('Namespace not found')
    })

    it('should return deletion response body', async () => {
      const mockResponse = {
        kind: 'Status',
        apiVersion: 'v1',
        metadata: {},
        status: 'Success',
        details: {
          name: 'test-role',
          kind: 'roles',
          uid: 'role-uid-123',
        },
      }
      mockK8sApi.deleteNamespacedRole.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-role', 'default')

      expect(result.status).toBe('Success')
      expect(result.details?.name).toBe('test-role')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s RBAC API', async () => {
      const mockRoles = [createRole('test-role')]
      mockK8sApi.listRoleForAllNamespaces.mockResolvedValue({
        body: { items: mockRoles },
      })

      await service.List()

      expect(clientService.getRbacAuthorizationV1Api).toHaveBeenCalled()
    })

    it('should call getRbacAuthorizationV1Api for every operation', async () => {
      mockK8sApi.listRoleForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedRole.mockResolvedValue({ body: createRole('test') })
      mockK8sApi.deleteNamespacedRole.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('test', 'default')

      expect(clientService.getRbacAuthorizationV1Api).toHaveBeenCalledTimes(4)
    })

    it('should use correct API client for RBAC operations', async () => {
      const mockRoles = [createRole('rbac-role')]
      mockK8sApi.listNamespacedRole.mockResolvedValue({
        body: { items: mockRoles },
      })

      await service.List('default')

      expect(clientService.getRbacAuthorizationV1Api).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedRole).toHaveBeenCalled()
    })
  })

  describe('RBAC Rules Validation', () => {
    it('should handle roles with empty rules array', async () => {
      const mockRole = createRole('empty-role', 'default')
      mockRole.rules = []
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: mockRole,
      })

      const result = await service.GetOneByNsName('default', 'empty-role')

      expect(result.rules).toEqual([])
    })

    it('should list roles with various API groups', async () => {
      const mockRoles = [
        createRole('core-role', 'default'),
        createRole('apps-role', 'default'),
        createRole('networking-role', 'default'),
      ]
      mockRoles[0].rules = [{ apiGroups: [''], resources: ['pods'], verbs: ['get'] }]
      mockRoles[1].rules = [{ apiGroups: ['apps'], resources: ['deployments'], verbs: ['get'] }]
      mockRoles[2].rules = [{ apiGroups: ['networking.k8s.io'], resources: ['ingresses'], verbs: ['get'] }]

      mockK8sApi.listNamespacedRole.mockResolvedValue({
        body: { items: mockRoles },
      })

      const result = await service.List('default')

      expect(result).toHaveLength(3)
      expect(result[0].rules![0].apiGroups).toContain('')
      expect(result[1].rules![0].apiGroups).toContain('apps')
      expect(result[2].rules![0].apiGroups).toContain('networking.k8s.io')
    })

    it('should handle roles with nonResourceURLs', async () => {
      const mockRole = createRole('metrics-role', 'default')
      mockRole.rules = [
        { apiGroups: [''], nonResourceURLs: ['/metrics', '/healthz'], verbs: ['get'] },
      ]
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: mockRole,
      })

      const result = await service.GetOneByNsName('default', 'metrics-role')

      expect(result.rules![0].nonResourceURLs).toContain('/metrics')
      expect(result.rules![0].nonResourceURLs).toContain('/healthz')
    })

    it('should handle roles with all CRUD verbs', async () => {
      const mockRole = createRole('crud-role', 'default')
      mockRole.rules = [
        {
          apiGroups: [''],
          resources: ['configmaps'],
          verbs: ['create', 'get', 'list', 'update', 'patch', 'delete', 'watch'],
        },
      ]
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: mockRole,
      })

      const result = await service.GetOneByNsName('default', 'crud-role')

      expect(result.rules![0].verbs).toContain('create')
      expect(result.rules![0].verbs).toContain('update')
      expect(result.rules![0].verbs).toContain('patch')
      expect(result.rules![0].verbs).toContain('delete')
      expect(result.rules![0].verbs).toHaveLength(7)
    })
  })

  describe('Namespace-scoped operations', () => {
    it('should verify roles are namespace-scoped', async () => {
      const mockRole = createRole('namespace-scoped-role', 'my-namespace')
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: mockRole,
      })

      const result = await service.GetOneByNsName('my-namespace', 'namespace-scoped-role')

      expect(result.metadata?.namespace).toBe('my-namespace')
      expect(result.kind).toBe('Role')
    })

    it('should list roles in multiple namespaces separately', async () => {
      const defaultRoles = [createRole('role-1', 'default')]
      const systemRoles = [createRole('role-2', 'kube-system')]

      mockK8sApi.listNamespacedRole
        .mockResolvedValueOnce({ body: { items: defaultRoles } })
        .mockResolvedValueOnce({ body: { items: systemRoles } })

      const defaultResult = await service.List('default')
      const systemResult = await service.List('kube-system')

      expect(defaultResult).toEqual(defaultRoles)
      expect(systemResult).toEqual(systemRoles)
      expect(mockK8sApi.listNamespacedRole).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listNamespacedRole).toHaveBeenCalledWith('kube-system')
    })

    it('should handle roles across staging and production namespaces', async () => {
      const stagingRoles = [createRole('staging-role', 'staging')]
      const productionRoles = [createRole('production-role', 'production')]

      mockK8sApi.listNamespacedRole
        .mockResolvedValueOnce({ body: { items: stagingRoles } })
        .mockResolvedValueOnce({ body: { items: productionRoles } })

      const stagingResult = await service.List('staging')
      const productionResult = await service.List('production')

      expect(stagingResult[0].metadata?.namespace).toBe('staging')
      expect(productionResult[0].metadata?.namespace).toBe('production')
    })
  })

  describe('Error handling edge cases', () => {
    it('should handle API connection errors', async () => {
      const error = new Error('Connection refused')
      mockK8sApi.listRoleForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('Connection refused')
    })

    it('should handle timeout errors', async () => {
      const error = new Error('Request timeout')
      mockK8sApi.readNamespacedRole.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'test-role')).rejects.toThrow('Request timeout')
    })

    it('should handle unauthorized access errors', async () => {
      const error = new Error('Unauthorized')
      mockK8sApi.listNamespacedRole.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Unauthorized')
    })

    it('should handle malformed role data', async () => {
      mockK8sApi.readNamespacedRole.mockResolvedValue({
        body: null,
      })

      const result = await service.GetOneByNsName('default', 'test-role')

      expect(result).toBeNull()
    })
  })
})
