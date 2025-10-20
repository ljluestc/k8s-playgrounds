import { vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createClusterRole, createMockClientService } from '../../../../test/utils/k8s-mocks'
import { ClusterRoleService } from './ClusterRole.service'

describe('ClusterRoleService', () => {
  let service: ClusterRoleService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getRbacAuthorizationV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ClusterRoleService,
          useFactory: (clientService: ClientService) => {
            return new ClusterRoleService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<ClusterRoleService>(ClusterRoleService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all cluster roles', async () => {
      const mockClusterRoles = [
        createClusterRole('cluster-admin'),
        createClusterRole('view'),
        createClusterRole('edit'),
      ]
      mockK8sApi.listClusterRole.mockResolvedValue({
        body: { items: mockClusterRoles },
      })

      const result = await service.List()

      expect(result).toEqual(mockClusterRoles)
      expect(mockK8sApi.listClusterRole).toHaveBeenCalled()
    })

    it('should handle API errors when listing cluster roles', async () => {
      const error = new Error('API Error')
      mockK8sApi.listClusterRole.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should return empty list when no cluster roles exist', async () => {
      mockK8sApi.listClusterRole.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list system cluster roles', async () => {
      const mockClusterRoles = [
        createClusterRole('system:node'),
        createClusterRole('system:controller:node-controller'),
      ]
      mockK8sApi.listClusterRole.mockResolvedValue({
        body: { items: mockClusterRoles },
      })

      const result = await service.List()

      expect(result).toEqual(mockClusterRoles)
      expect(result).toHaveLength(2)
    })

    it('should list cluster roles with various rule configurations', async () => {
      const mockClusterRoles = [
        {
          ...createClusterRole('full-access'),
          rules: [
            {
              apiGroups: ['*'],
              resources: ['*'],
              verbs: ['*'],
            },
          ],
        },
        {
          ...createClusterRole('read-only'),
          rules: [
            {
              apiGroups: [''],
              resources: ['pods', 'services'],
              verbs: ['get', 'list', 'watch'],
            },
          ],
        },
      ]
      mockK8sApi.listClusterRole.mockResolvedValue({
        body: { items: mockClusterRoles },
      })

      const result = await service.List()

      expect(result).toHaveLength(2)
      expect(result[0].rules[0].verbs).toContain('*')
      expect(result[1].rules[0].verbs).toContain('get')
    })

    it('should handle connection timeout errors', async () => {
      const error = new Error('Connection timeout')
      mockK8sApi.listClusterRole.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('Connection timeout')
    })

    it('should handle unauthorized errors', async () => {
      const error = new Error('Unauthorized')
      mockK8sApi.listClusterRole.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('Unauthorized')
    })

    it('should list cluster roles with aggregation rules', async () => {
      const mockClusterRoles = [
        {
          ...createClusterRole('aggregated-role'),
          aggregationRule: {
            clusterRoleSelectors: [
              {
                matchLabels: {
                  'rbac.example.com/aggregate-to-monitoring': 'true',
                },
              },
            ],
          },
          rules: [],
        },
      ]
      mockK8sApi.listClusterRole.mockResolvedValue({
        body: { items: mockClusterRoles },
      })

      const result = await service.List()

      expect(result).toHaveLength(1)
      expect(result[0].aggregationRule).toBeDefined()
    })
  })

  describe('GetOneByName', () => {
    it('should get a single cluster role by name', async () => {
      const mockClusterRole = createClusterRole('cluster-admin')
      mockK8sApi.readClusterRole.mockResolvedValue({
        body: mockClusterRole,
      })

      const result = await service.GetOneByName('cluster-admin')

      expect(result).toEqual(mockClusterRole)
      expect(mockK8sApi.readClusterRole).toHaveBeenCalledWith('cluster-admin')
    })

    it('should handle not found errors', async () => {
      const error = new Error('ClusterRole not found')
      mockK8sApi.readClusterRole.mockRejectedValue(error)

      await expect(service.GetOneByName('nonexistent')).rejects.toThrow('ClusterRole not found')
    })

    it('should get cluster role with wildcard permissions', async () => {
      const mockClusterRole = {
        ...createClusterRole('cluster-admin'),
        rules: [
          {
            apiGroups: ['*'],
            resources: ['*'],
            verbs: ['*'],
          },
        ],
      }
      mockK8sApi.readClusterRole.mockResolvedValue({
        body: mockClusterRole,
      })

      const result = await service.GetOneByName('cluster-admin')

      expect(result).toEqual(mockClusterRole)
      expect(result.rules[0].apiGroups).toContain('*')
      expect(result.rules[0].resources).toContain('*')
      expect(result.rules[0].verbs).toContain('*')
    })

    it('should get cluster role with specific API groups', async () => {
      const mockClusterRole = {
        ...createClusterRole('apps-admin'),
        rules: [
          {
            apiGroups: ['apps', 'extensions'],
            resources: ['deployments', 'statefulsets', 'daemonsets'],
            verbs: ['get', 'list', 'watch', 'create', 'update', 'delete'],
          },
        ],
      }
      mockK8sApi.readClusterRole.mockResolvedValue({
        body: mockClusterRole,
      })

      const result = await service.GetOneByName('apps-admin')

      expect(result.rules[0].apiGroups).toContain('apps')
      expect(result.rules[0].apiGroups).toContain('extensions')
      expect(result.rules[0].resources).toContain('deployments')
    })

    it('should get cluster role with core API group', async () => {
      const mockClusterRole = {
        ...createClusterRole('pod-reader'),
        rules: [
          {
            apiGroups: [''],
            resources: ['pods'],
            verbs: ['get', 'list', 'watch'],
          },
        ],
      }
      mockK8sApi.readClusterRole.mockResolvedValue({
        body: mockClusterRole,
      })

      const result = await service.GetOneByName('pod-reader')

      expect(result.rules[0].apiGroups).toContain('')
      expect(result.rules[0].resources).toContain('pods')
    })

    it('should get cluster role with multiple rules', async () => {
      const mockClusterRole = {
        ...createClusterRole('multi-rule'),
        rules: [
          {
            apiGroups: [''],
            resources: ['pods'],
            verbs: ['get', 'list'],
          },
          {
            apiGroups: ['apps'],
            resources: ['deployments'],
            verbs: ['get', 'list'],
          },
          {
            apiGroups: ['batch'],
            resources: ['jobs', 'cronjobs'],
            verbs: ['get', 'list', 'watch'],
          },
        ],
      }
      mockK8sApi.readClusterRole.mockResolvedValue({
        body: mockClusterRole,
      })

      const result = await service.GetOneByName('multi-rule')

      expect(result.rules).toHaveLength(3)
      expect(result.rules[0].resources).toContain('pods')
      expect(result.rules[1].resources).toContain('deployments')
      expect(result.rules[2].resources).toContain('jobs')
    })

    it('should get cluster role with resource names restriction', async () => {
      const mockClusterRole = {
        ...createClusterRole('specific-configmap-reader'),
        rules: [
          {
            apiGroups: [''],
            resources: ['configmaps'],
            resourceNames: ['my-config', 'app-config'],
            verbs: ['get'],
          },
        ],
      }
      mockK8sApi.readClusterRole.mockResolvedValue({
        body: mockClusterRole,
      })

      const result = await service.GetOneByName('specific-configmap-reader')

      expect(result.rules[0].resourceNames).toContain('my-config')
      expect(result.rules[0].resourceNames).toContain('app-config')
    })

    it('should get cluster role with non-resource URLs', async () => {
      const mockClusterRole = {
        ...createClusterRole('metrics-reader'),
        rules: [
          {
            nonResourceURLs: ['/healthz', '/metrics', '/apis/*'],
            verbs: ['get'],
          },
        ],
      }
      mockK8sApi.readClusterRole.mockResolvedValue({
        body: mockClusterRole,
      })

      const result = await service.GetOneByName('metrics-reader')

      expect(result.rules[0].nonResourceURLs).toContain('/healthz')
      expect(result.rules[0].nonResourceURLs).toContain('/metrics')
    })

    it('should handle system cluster role names with colons', async () => {
      const mockClusterRole = createClusterRole('system:controller:node-controller')
      mockK8sApi.readClusterRole.mockResolvedValue({
        body: mockClusterRole,
      })

      const result = await service.GetOneByName('system:controller:node-controller')

      expect(result.metadata?.name).toBe('system:controller:node-controller')
      expect(mockK8sApi.readClusterRole).toHaveBeenCalledWith('system:controller:node-controller')
    })

    it('should get cluster role with subresources', async () => {
      const mockClusterRole = {
        ...createClusterRole('pod-log-reader'),
        rules: [
          {
            apiGroups: [''],
            resources: ['pods/log', 'pods/status'],
            verbs: ['get'],
          },
        ],
      }
      mockK8sApi.readClusterRole.mockResolvedValue({
        body: mockClusterRole,
      })

      const result = await service.GetOneByName('pod-log-reader')

      expect(result.rules[0].resources).toContain('pods/log')
      expect(result.rules[0].resources).toContain('pods/status')
    })

    it('should get cluster role with labels and annotations', async () => {
      const mockClusterRole = {
        ...createClusterRole('labeled-role'),
        metadata: {
          name: 'labeled-role',
          labels: {
            app: 'myapp',
            env: 'production',
          },
          annotations: {
            description: 'Role for production environment',
          },
        },
      }
      mockK8sApi.readClusterRole.mockResolvedValue({
        body: mockClusterRole,
      })

      const result = await service.GetOneByName('labeled-role')

      expect(result.metadata?.labels).toEqual({
        app: 'myapp',
        env: 'production',
      })
      expect(result.metadata?.annotations).toHaveProperty('description')
    })

    it('should handle API errors', async () => {
      const error = new Error('API connection failed')
      mockK8sApi.readClusterRole.mockRejectedValue(error)

      await expect(service.GetOneByName('test-role')).rejects.toThrow('API connection failed')
    })

    it('should get cluster role with verb variations', async () => {
      const mockClusterRole = {
        ...createClusterRole('full-crud'),
        rules: [
          {
            apiGroups: [''],
            resources: ['secrets'],
            verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete', 'deletecollection'],
          },
        ],
      }
      mockK8sApi.readClusterRole.mockResolvedValue({
        body: mockClusterRole,
      })

      const result = await service.GetOneByName('full-crud')

      expect(result.rules[0].verbs).toContain('patch')
      expect(result.rules[0].verbs).toContain('deletecollection')
      expect(result.rules[0].verbs).toHaveLength(8)
    })
  })

  describe('Delete', () => {
    it('should delete a cluster role', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteClusterRole.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-role')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteClusterRole).toHaveBeenCalledWith('test-role')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteClusterRole.mockRejectedValue(error)

      await expect(service.Delete('test-role')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent cluster role', async () => {
      const error = new Error('ClusterRole not found')
      mockK8sApi.deleteClusterRole.mockRejectedValue(error)

      await expect(service.Delete('nonexistent')).rejects.toThrow('ClusterRole not found')
    })

    it('should delete system cluster role', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteClusterRole.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('system:node')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteClusterRole).toHaveBeenCalledWith('system:node')
    })

    it('should handle cluster role with finalizers', async () => {
      const mockResponse = {
        status: 'Success',
        metadata: {
          name: 'role-with-finalizer',
          finalizers: ['kubernetes'],
        },
      }
      mockK8sApi.deleteClusterRole.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('role-with-finalizer')

      expect(result).toEqual(mockResponse)
      expect(result.metadata?.finalizers).toContain('kubernetes')
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = {
        status: 'Success',
        metadata: {
          name: 'graceful-delete',
          deletionTimestamp: new Date().toISOString(),
        },
      }
      mockK8sApi.deleteClusterRole.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete')

      expect(result).toEqual(mockResponse)
      expect(result.metadata?.deletionTimestamp).toBeDefined()
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete cluster roles')
      mockK8sApi.deleteClusterRole.mockRejectedValue(error)

      await expect(service.Delete('test-role')).rejects.toThrow('Forbidden')
    })

    it('should delete cluster role with special characters', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteClusterRole.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('system:controller:node-controller')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteClusterRole).toHaveBeenCalledWith('system:controller:node-controller')
    })

    it('should handle protected cluster role deletion', async () => {
      const error = new Error('Cannot delete protected system cluster role')
      mockK8sApi.deleteClusterRole.mockRejectedValue(error)

      await expect(service.Delete('cluster-admin')).rejects.toThrow('Cannot delete protected system cluster role')
    })

    it('should handle deletion of cluster role with active bindings warning', async () => {
      const mockResponse = {
        status: 'Success',
        metadata: {
          name: 'role-with-bindings',
          annotations: {
            'kubernetes.io/warning': 'This cluster role has active bindings',
          },
        },
      }
      mockK8sApi.deleteClusterRole.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('role-with-bindings')

      expect(result).toEqual(mockResponse)
    })

    it('should handle API server errors during deletion', async () => {
      const error = new Error('Internal server error')
      mockK8sApi.deleteClusterRole.mockRejectedValue(error)

      await expect(service.Delete('test-role')).rejects.toThrow('Internal server error')
    })

    it('should delete multiple different cluster roles sequentially', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteClusterRole.mockResolvedValue({
        body: mockResponse,
      })

      await service.Delete('role1')
      await service.Delete('role2')
      await service.Delete('role3')

      expect(mockK8sApi.deleteClusterRole).toHaveBeenCalledTimes(3)
      expect(mockK8sApi.deleteClusterRole).toHaveBeenNthCalledWith(1, 'role1')
      expect(mockK8sApi.deleteClusterRole).toHaveBeenNthCalledWith(2, 'role2')
      expect(mockK8sApi.deleteClusterRole).toHaveBeenNthCalledWith(3, 'role3')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get RbacAuthorization API', async () => {
      const mockClusterRoles = [createClusterRole('test-role')]
      mockK8sApi.listClusterRole.mockResolvedValue({
        body: { items: mockClusterRoles },
      })

      await service.List()

      expect(clientService.getRbacAuthorizationV1Api).toHaveBeenCalled()
    })

    it('should call getRbacAuthorizationV1Api for every operation', async () => {
      mockK8sApi.listClusterRole.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readClusterRole.mockResolvedValue({ body: createClusterRole('test') })
      mockK8sApi.deleteClusterRole.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByName('test')
      await service.Delete('test')

      expect(clientService.getRbacAuthorizationV1Api).toHaveBeenCalledTimes(4)
    })

    it('should use the same API instance for batch operations', async () => {
      mockK8sApi.listClusterRole.mockResolvedValue({ body: { items: [] } })

      await service.List()
      await service.List()

      expect(clientService.getRbacAuthorizationV1Api).toHaveBeenCalledTimes(3)
    })
  })

  describe('RBAC Rules Validation', () => {
    it('should handle cluster role with empty rules array', async () => {
      const mockClusterRole = {
        ...createClusterRole('no-rules'),
        rules: [],
      }
      mockK8sApi.readClusterRole.mockResolvedValue({
        body: mockClusterRole,
      })

      const result = await service.GetOneByName('no-rules')

      expect(result.rules).toEqual([])
    })

    it('should list cluster roles with various API groups', async () => {
      const mockClusterRoles = [
        {
          ...createClusterRole('core-resources'),
          rules: [{ apiGroups: [''], resources: ['pods', 'services'], verbs: ['get'] }],
        },
        {
          ...createClusterRole('apps-resources'),
          rules: [{ apiGroups: ['apps'], resources: ['deployments'], verbs: ['get'] }],
        },
        {
          ...createClusterRole('networking-resources'),
          rules: [{ apiGroups: ['networking.k8s.io'], resources: ['ingresses'], verbs: ['get'] }],
        },
        {
          ...createClusterRole('rbac-resources'),
          rules: [{ apiGroups: ['rbac.authorization.k8s.io'], resources: ['roles'], verbs: ['get'] }],
        },
      ]
      mockK8sApi.listClusterRole.mockResolvedValue({
        body: { items: mockClusterRoles },
      })

      const result = await service.List()

      expect(result).toHaveLength(4)
      expect(result[0].rules[0].apiGroups).toContain('')
      expect(result[1].rules[0].apiGroups).toContain('apps')
      expect(result[2].rules[0].apiGroups).toContain('networking.k8s.io')
      expect(result[3].rules[0].apiGroups).toContain('rbac.authorization.k8s.io')
    })

    it('should handle cluster role with complex verb combinations', async () => {
      const mockClusterRole = {
        ...createClusterRole('complex-verbs'),
        rules: [
          {
            apiGroups: [''],
            resources: ['pods'],
            verbs: ['get', 'list', 'watch'],
          },
          {
            apiGroups: [''],
            resources: ['pods/exec'],
            verbs: ['create'],
          },
          {
            apiGroups: [''],
            resources: ['pods/log'],
            verbs: ['get'],
          },
        ],
      }
      mockK8sApi.readClusterRole.mockResolvedValue({
        body: mockClusterRole,
      })

      const result = await service.GetOneByName('complex-verbs')

      expect(result.rules[0].verbs).toEqual(['get', 'list', 'watch'])
      expect(result.rules[1].verbs).toEqual(['create'])
      expect(result.rules[2].verbs).toEqual(['get'])
    })
  })
})
