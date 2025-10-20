import { _vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createMockClientService, createRoleBinding } from '../../../../test/utils/k8s-mocks'
import { RoleBindingService } from './RoleBinding.service'

describe('RoleBindingService', () => {
  let service: RoleBindingService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getRbacAuthorizationV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RoleBindingService,
          useFactory: (clientService: ClientService) => {
            return new RoleBindingService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<RoleBindingService>(RoleBindingService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all rolebindings across all namespaces when no namespace specified', async () => {
      const mockRoleBindings = [
        createRoleBinding('rb-1', 'default'),
        createRoleBinding('rb-2', 'kube-system'),
      ]
      mockK8sApi.listRoleBindingForAllNamespaces.mockResolvedValue({
        body: { items: mockRoleBindings },
      })

      const result = await service.List()

      expect(result).toEqual(mockRoleBindings)
      expect(mockK8sApi.listRoleBindingForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedRoleBinding).not.toHaveBeenCalled()
    })

    it('should list all rolebindings when namespace is "null" string', async () => {
      const mockRoleBindings = [createRoleBinding('rb-1')]
      mockK8sApi.listRoleBindingForAllNamespaces.mockResolvedValue({
        body: { items: mockRoleBindings },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockRoleBindings)
      expect(mockK8sApi.listRoleBindingForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedRoleBinding).not.toHaveBeenCalled()
    })

    it('should list rolebindings in a specific namespace', async () => {
      const mockRoleBindings = [createRoleBinding('rb-1', 'default')]
      mockK8sApi.listNamespacedRoleBinding.mockResolvedValue({
        body: { items: mockRoleBindings },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockRoleBindings)
      expect(mockK8sApi.listNamespacedRoleBinding).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listRoleBindingForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all rolebindings', async () => {
      const error = new Error('API Error')
      mockK8sApi.listRoleBindingForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced rolebindings', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedRoleBinding.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no rolebindings exist', async () => {
      mockK8sApi.listRoleBindingForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list rolebindings in kube-system namespace', async () => {
      const mockRoleBindings = [createRoleBinding('system-rb', 'kube-system')]
      mockK8sApi.listNamespacedRoleBinding.mockResolvedValue({
        body: { items: mockRoleBindings },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockRoleBindings)
      expect(mockK8sApi.listNamespacedRoleBinding).toHaveBeenCalledWith('kube-system')
    })

    it('should list rolebindings with User subjects', async () => {
      const mockRoleBindings = [
        createRoleBinding('user-rb', 'default', {
          subjects: [
            { kind: 'User', name: 'alice', apiGroup: 'rbac.authorization.k8s.io' },
          ],
        }),
      ]
      mockK8sApi.listNamespacedRoleBinding.mockResolvedValue({
        body: { items: mockRoleBindings },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockRoleBindings)
      expect(result[0].subjects[0].kind).toBe('User')
    })

    it('should list rolebindings with Group subjects', async () => {
      const mockRoleBindings = [
        createRoleBinding('group-rb', 'default', {
          subjects: [
            { kind: 'Group', name: 'developers', apiGroup: 'rbac.authorization.k8s.io' },
          ],
        }),
      ]
      mockK8sApi.listNamespacedRoleBinding.mockResolvedValue({
        body: { items: mockRoleBindings },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockRoleBindings)
      expect(result[0].subjects[0].kind).toBe('Group')
    })

    it('should list rolebindings with ServiceAccount subjects', async () => {
      const mockRoleBindings = [
        createRoleBinding('sa-rb', 'default', {
          subjects: [
            { kind: 'ServiceAccount', name: 'app-sa', namespace: 'default' },
          ],
        }),
      ]
      mockK8sApi.listNamespacedRoleBinding.mockResolvedValue({
        body: { items: mockRoleBindings },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockRoleBindings)
      expect(result[0].subjects[0].kind).toBe('ServiceAccount')
    })

    it('should list rolebindings with ClusterRole references', async () => {
      const mockRoleBindings = [
        createRoleBinding('cluster-role-rb', 'default', {
          roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'ClusterRole',
            name: 'view',
          },
        }),
      ]
      mockK8sApi.listNamespacedRoleBinding.mockResolvedValue({
        body: { items: mockRoleBindings },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockRoleBindings)
      expect(result[0].roleRef.kind).toBe('ClusterRole')
    })

    it('should handle multiple namespaces correctly', async () => {
      const namespace1 = [createRoleBinding('rb-1', 'ns1')]
      const namespace2 = [createRoleBinding('rb-2', 'ns2')]

      mockK8sApi.listNamespacedRoleBinding
        .mockResolvedValueOnce({ body: { items: namespace1 } })
        .mockResolvedValueOnce({ body: { items: namespace2 } })

      const result1 = await service.List('ns1')
      const result2 = await service.List('ns2')

      expect(result1).toEqual(namespace1)
      expect(result2).toEqual(namespace2)
      expect(mockK8sApi.listNamespacedRoleBinding).toHaveBeenCalledTimes(2)
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single rolebinding by namespace and name', async () => {
      const mockRoleBinding = createRoleBinding('test-rb', 'default')
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('default', 'test-rb')

      expect(result).toEqual(mockRoleBinding)
      expect(mockK8sApi.readNamespacedRoleBinding).toHaveBeenCalledWith('test-rb', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('RoleBinding not found')
      mockK8sApi.readNamespacedRoleBinding.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('RoleBinding not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedRoleBinding.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-rb')).rejects.toThrow('Namespace does not exist')
    })

    it('should get rolebinding with User subject', async () => {
      const mockRoleBinding = createRoleBinding('user-rb', 'default', {
        subjects: [
          { kind: 'User', name: 'john', apiGroup: 'rbac.authorization.k8s.io' },
        ],
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('default', 'user-rb')

      expect(result).toEqual(mockRoleBinding)
      expect(result.subjects[0].kind).toBe('User')
      expect(result.subjects[0].name).toBe('john')
    })

    it('should get rolebinding with Group subject', async () => {
      const mockRoleBinding = createRoleBinding('group-rb', 'default', {
        subjects: [
          { kind: 'Group', name: 'system:authenticated', apiGroup: 'rbac.authorization.k8s.io' },
        ],
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('default', 'group-rb')

      expect(result).toEqual(mockRoleBinding)
      expect(result.subjects[0].kind).toBe('Group')
      expect(result.subjects[0].name).toBe('system:authenticated')
    })

    it('should get rolebinding with ServiceAccount subject', async () => {
      const mockRoleBinding = createRoleBinding('sa-rb', 'production', {
        subjects: [
          { kind: 'ServiceAccount', name: 'deployer-sa', namespace: 'production' },
        ],
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('production', 'sa-rb')

      expect(result).toEqual(mockRoleBinding)
      expect(result.subjects[0].kind).toBe('ServiceAccount')
      expect(result.subjects[0].namespace).toBe('production')
    })

    it('should get rolebinding with multiple subjects', async () => {
      const mockRoleBinding = createRoleBinding('multi-rb', 'default', {
        subjects: [
          { kind: 'User', name: 'alice', apiGroup: 'rbac.authorization.k8s.io' },
          { kind: 'User', name: 'bob', apiGroup: 'rbac.authorization.k8s.io' },
          { kind: 'Group', name: 'developers', apiGroup: 'rbac.authorization.k8s.io' },
          { kind: 'ServiceAccount', name: 'app-sa', namespace: 'default' },
        ],
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('default', 'multi-rb')

      expect(result).toEqual(mockRoleBinding)
      expect(result.subjects).toHaveLength(4)
      expect(result.subjects[0].kind).toBe('User')
      expect(result.subjects[2].kind).toBe('Group')
      expect(result.subjects[3].kind).toBe('ServiceAccount')
    })

    it('should get rolebinding referencing Role', async () => {
      const mockRoleBinding = createRoleBinding('role-rb', 'default', {
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name: 'pod-reader',
        },
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('default', 'role-rb')

      expect(result).toEqual(mockRoleBinding)
      expect(result.roleRef.kind).toBe('Role')
      expect(result.roleRef.name).toBe('pod-reader')
    })

    it('should get rolebinding referencing ClusterRole', async () => {
      const mockRoleBinding = createRoleBinding('cluster-role-rb', 'default', {
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: 'view',
        },
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('default', 'cluster-role-rb')

      expect(result).toEqual(mockRoleBinding)
      expect(result.roleRef.kind).toBe('ClusterRole')
      expect(result.roleRef.name).toBe('view')
    })

    it('should validate roleRef has required fields', async () => {
      const mockRoleBinding = createRoleBinding('valid-rb', 'default')
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('default', 'valid-rb')

      expect(result.roleRef).toHaveProperty('apiGroup')
      expect(result.roleRef).toHaveProperty('kind')
      expect(result.roleRef).toHaveProperty('name')
    })

    it('should handle rolebinding names with hyphens and numbers', async () => {
      const mockRoleBinding = createRoleBinding('my-rb-123', 'default')
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('default', 'my-rb-123')

      expect(result).toEqual(mockRoleBinding)
      expect(mockK8sApi.readNamespacedRoleBinding).toHaveBeenCalledWith('my-rb-123', 'default')
    })

    it('should handle system rolebindings', async () => {
      const mockRoleBinding = createRoleBinding('system:controller:token-cleaner', 'kube-system', {
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: 'system:controller:token-cleaner',
        },
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('kube-system', 'system:controller:token-cleaner')

      expect(result).toEqual(mockRoleBinding)
      expect(result.metadata.name).toContain('system:controller')
    })
  })

  describe('Delete', () => {
    it('should delete a rolebinding', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedRoleBinding.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-rb', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedRoleBinding).toHaveBeenCalledWith('test-rb', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedRoleBinding.mockRejectedValue(error)

      await expect(service.Delete('test-rb', 'default')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent rolebinding', async () => {
      const error = new Error('RoleBinding not found')
      mockK8sApi.deleteNamespacedRoleBinding.mockRejectedValue(error)

      await expect(service.Delete('nonexistent', 'default')).rejects.toThrow('RoleBinding not found')
    })

    it('should delete rolebinding from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedRoleBinding.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-rb', 'kube-system')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedRoleBinding).toHaveBeenCalledWith('my-rb', 'kube-system')
    })

    it('should handle rolebinding with finalizers', async () => {
      const mockResponse = { status: 'Success', metadata: { finalizers: ['kubernetes'] } }
      mockK8sApi.deleteNamespacedRoleBinding.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('rb-with-finalizer', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNamespacedRoleBinding.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete rolebindings')
      mockK8sApi.deleteNamespacedRoleBinding.mockRejectedValue(error)

      await expect(service.Delete('test-rb', 'default')).rejects.toThrow('Forbidden')
    })

    it('should delete rolebinding from production namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedRoleBinding.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('prod-rb', 'production')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedRoleBinding).toHaveBeenCalledWith('prod-rb', 'production')
    })

    it('should handle deleting multiple rolebindings sequentially', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedRoleBinding.mockResolvedValue({
        body: mockResponse,
      })

      await service.Delete('rb1', 'default')
      await service.Delete('rb2', 'default')
      await service.Delete('rb3', 'kube-system')

      expect(mockK8sApi.deleteNamespacedRoleBinding).toHaveBeenCalledTimes(3)
      expect(mockK8sApi.deleteNamespacedRoleBinding).toHaveBeenCalledWith('rb1', 'default')
      expect(mockK8sApi.deleteNamespacedRoleBinding).toHaveBeenCalledWith('rb2', 'default')
      expect(mockK8sApi.deleteNamespacedRoleBinding).toHaveBeenCalledWith('rb3', 'kube-system')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s RBAC API', async () => {
      const mockRoleBindings = [createRoleBinding('test-rb')]
      mockK8sApi.listRoleBindingForAllNamespaces.mockResolvedValue({
        body: { items: mockRoleBindings },
      })

      await service.List()

      expect(clientService.getRbacAuthorizationV1Api).toHaveBeenCalled()
    })

    it('should call getRbacAuthorizationV1Api for every operation', async () => {
      mockK8sApi.listRoleBindingForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({ body: createRoleBinding('test') })
      mockK8sApi.deleteNamespacedRoleBinding.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('test', 'default')

      expect(clientService.getRbacAuthorizationV1Api).toHaveBeenCalledTimes(4)
    })
  })

  describe('RBAC Binding Scenarios', () => {
    it('should handle pod-reader rolebinding scenario', async () => {
      const mockRoleBinding = createRoleBinding('pod-reader-binding', 'default', {
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name: 'pod-reader',
        },
        subjects: [
          { kind: 'User', name: 'jane', apiGroup: 'rbac.authorization.k8s.io' },
        ],
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('default', 'pod-reader-binding')

      expect(result.roleRef.name).toBe('pod-reader')
      expect(result.subjects[0].kind).toBe('User')
      expect(result.subjects[0].name).toBe('jane')
    })

    it('should handle deployment-manager rolebinding with service account', async () => {
      const mockRoleBinding = createRoleBinding('deployment-manager-binding', 'production', {
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name: 'deployment-manager',
        },
        subjects: [
          { kind: 'ServiceAccount', name: 'ci-deployer', namespace: 'production' },
        ],
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('production', 'deployment-manager-binding')

      expect(result.roleRef.name).toBe('deployment-manager')
      expect(result.subjects[0].kind).toBe('ServiceAccount')
      expect(result.subjects[0].name).toBe('ci-deployer')
    })

    it('should handle admin rolebinding with ClusterRole', async () => {
      const mockRoleBinding = createRoleBinding('namespace-admin', 'team-a', {
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: 'admin',
        },
        subjects: [
          { kind: 'User', name: 'team-lead', apiGroup: 'rbac.authorization.k8s.io' },
        ],
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('team-a', 'namespace-admin')

      expect(result.roleRef.kind).toBe('ClusterRole')
      expect(result.roleRef.name).toBe('admin')
    })

    it('should handle view rolebinding for group', async () => {
      const mockRoleBinding = createRoleBinding('viewers-binding', 'default', {
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: 'view',
        },
        subjects: [
          { kind: 'Group', name: 'team-viewers', apiGroup: 'rbac.authorization.k8s.io' },
        ],
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('default', 'viewers-binding')

      expect(result.roleRef.name).toBe('view')
      expect(result.subjects[0].kind).toBe('Group')
      expect(result.subjects[0].name).toBe('team-viewers')
    })

    it('should handle edit rolebinding with multiple users', async () => {
      const mockRoleBinding = createRoleBinding('editors-binding', 'development', {
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: 'edit',
        },
        subjects: [
          { kind: 'User', name: 'alice', apiGroup: 'rbac.authorization.k8s.io' },
          { kind: 'User', name: 'bob', apiGroup: 'rbac.authorization.k8s.io' },
          { kind: 'User', name: 'charlie', apiGroup: 'rbac.authorization.k8s.io' },
        ],
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('development', 'editors-binding')

      expect(result.roleRef.name).toBe('edit')
      expect(result.subjects).toHaveLength(3)
      expect(result.subjects.every(s => s.kind === 'User')).toBe(true)
    })

    it('should handle cross-namespace service account binding', async () => {
      const mockRoleBinding = createRoleBinding('cross-ns-binding', 'target-namespace', {
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name: 'secret-reader',
        },
        subjects: [
          { kind: 'ServiceAccount', name: 'external-sa', namespace: 'source-namespace' },
        ],
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('target-namespace', 'cross-ns-binding')

      expect(result.metadata.namespace).toBe('target-namespace')
      expect(result.subjects[0].namespace).toBe('source-namespace')
    })

    it('should handle system:authenticated group binding', async () => {
      const mockRoleBinding = createRoleBinding('authenticated-users', 'default', {
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: 'view',
        },
        subjects: [
          { kind: 'Group', name: 'system:authenticated', apiGroup: 'rbac.authorization.k8s.io' },
        ],
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('default', 'authenticated-users')

      expect(result.subjects[0].kind).toBe('Group')
      expect(result.subjects[0].name).toBe('system:authenticated')
    })

    it('should handle mixed subject types binding', async () => {
      const mockRoleBinding = createRoleBinding('mixed-binding', 'production', {
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name: 'custom-role',
        },
        subjects: [
          { kind: 'User', name: 'admin', apiGroup: 'rbac.authorization.k8s.io' },
          { kind: 'Group', name: 'ops-team', apiGroup: 'rbac.authorization.k8s.io' },
          { kind: 'ServiceAccount', name: 'automation-sa', namespace: 'production' },
        ],
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('production', 'mixed-binding')

      expect(result.subjects).toHaveLength(3)
      expect(result.subjects[0].kind).toBe('User')
      expect(result.subjects[1].kind).toBe('Group')
      expect(result.subjects[2].kind).toBe('ServiceAccount')
    })
  })

  describe('RoleRef Validation Scenarios', () => {
    it('should validate roleRef with Role kind', async () => {
      const mockRoleBinding = createRoleBinding('role-ref-test', 'default', {
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name: 'test-role',
        },
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('default', 'role-ref-test')

      expect(result.roleRef.apiGroup).toBe('rbac.authorization.k8s.io')
      expect(result.roleRef.kind).toBe('Role')
      expect(result.roleRef.name).toBe('test-role')
    })

    it('should validate roleRef with ClusterRole kind', async () => {
      const mockRoleBinding = createRoleBinding('cluster-role-ref-test', 'default', {
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'ClusterRole',
          name: 'cluster-admin',
        },
      })
      mockK8sApi.readNamespacedRoleBinding.mockResolvedValue({
        body: mockRoleBinding,
      })

      const result = await service.GetOneByNsName('default', 'cluster-role-ref-test')

      expect(result.roleRef.apiGroup).toBe('rbac.authorization.k8s.io')
      expect(result.roleRef.kind).toBe('ClusterRole')
      expect(result.roleRef.name).toBe('cluster-admin')
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 Not Found error', async () => {
      const error = new Error('rolebindings.rbac.authorization.k8s.io "nonexistent" not found')
      mockK8sApi.readNamespacedRoleBinding.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('not found')
    })

    it('should handle 403 Forbidden error', async () => {
      const error = new Error('rolebindings.rbac.authorization.k8s.io is forbidden')
      mockK8sApi.listRoleBindingForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('forbidden')
    })

    it('should handle 401 Unauthorized error', async () => {
      const error = new Error('Unauthorized')
      mockK8sApi.deleteNamespacedRoleBinding.mockRejectedValue(error)

      await expect(service.Delete('test-rb', 'default')).rejects.toThrow('Unauthorized')
    })

    it('should handle network errors', async () => {
      const error = new Error('Network error: ECONNREFUSED')
      mockK8sApi.listNamespacedRoleBinding.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Network error')
    })

    it('should handle timeout errors', async () => {
      const error = new Error('Request timeout')
      mockK8sApi.readNamespacedRoleBinding.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'test-rb')).rejects.toThrow('timeout')
    })
  })
})
