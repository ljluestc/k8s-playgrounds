import { vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createMockClientService } from '../../../../test/utils/k8s-mocks'
import { NetworkPolicyService } from './NetworkPolicy.service'

// Helper function to create a network policy
export function createNetworkPolicy(name: string, namespace: string = 'default', overrides: any = {}) {
  return {
    metadata: {
      name,
      namespace,
      creationTimestamp: new Date().toISOString(),
      uid: `networkpolicy-${name}-${namespace}`,
      ...overrides.metadata,
    },
    spec: {
      podSelector: {
        matchLabels: {
          app: 'web',
        },
      },
      policyTypes: ['Ingress', 'Egress'],
      ingress: [
        {
          from: [
            {
              podSelector: {
                matchLabels: {
                  app: 'frontend',
                },
              },
            },
          ],
          ports: [
            {
              protocol: 'TCP',
              port: 80,
            },
          ],
        },
      ],
      egress: [
        {
          to: [
            {
              podSelector: {
                matchLabels: {
                  app: 'backend',
                },
              },
            },
          ],
          ports: [
            {
              protocol: 'TCP',
              port: 3000,
            },
          ],
        },
      ],
      ...overrides.spec,
    },
  }
}

describe('NetworkPolicyService', () => {
  let service: NetworkPolicyService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getNetworkingV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: NetworkPolicyService,
          useFactory: (clientService: ClientService) => {
            return new NetworkPolicyService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<NetworkPolicyService>(NetworkPolicyService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all network policies across all namespaces when no namespace specified', async () => {
      const mockPolicies = [
        createNetworkPolicy('policy-1', 'default'),
        createNetworkPolicy('policy-2', 'kube-system'),
      ]
      mockK8sApi.listNetworkPolicyForAllNamespaces.mockResolvedValue({
        body: { items: mockPolicies },
      })

      const result = await service.List()

      expect(result).toEqual(mockPolicies)
      expect(mockK8sApi.listNetworkPolicyForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedNetworkPolicy).not.toHaveBeenCalled()
    })

    it('should list all network policies when namespace is "null" string', async () => {
      const mockPolicies = [createNetworkPolicy('policy-1')]
      mockK8sApi.listNetworkPolicyForAllNamespaces.mockResolvedValue({
        body: { items: mockPolicies },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockPolicies)
      expect(mockK8sApi.listNetworkPolicyForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedNetworkPolicy).not.toHaveBeenCalled()
    })

    it('should list network policies in a specific namespace', async () => {
      const mockPolicies = [createNetworkPolicy('policy-1', 'default')]
      mockK8sApi.listNamespacedNetworkPolicy.mockResolvedValue({
        body: { items: mockPolicies },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockPolicies)
      expect(mockK8sApi.listNamespacedNetworkPolicy).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listNetworkPolicyForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all policies', async () => {
      const error = new Error('API Error')
      mockK8sApi.listNetworkPolicyForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced policies', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedNetworkPolicy.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no policies exist', async () => {
      mockK8sApi.listNetworkPolicyForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list policies in kube-system namespace', async () => {
      const mockPolicies = [createNetworkPolicy('kube-dns-policy', 'kube-system')]
      mockK8sApi.listNamespacedNetworkPolicy.mockResolvedValue({
        body: { items: mockPolicies },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockPolicies)
      expect(mockK8sApi.listNamespacedNetworkPolicy).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockPolicies = [createNetworkPolicy('my-policy', 'my-namespace-123')]
      mockK8sApi.listNamespacedNetworkPolicy.mockResolvedValue({
        body: { items: mockPolicies },
      })

      const result = await service.List('my-namespace-123')

      expect(result).toEqual(mockPolicies)
      expect(mockK8sApi.listNamespacedNetworkPolicy).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should list multiple policies with different ingress rules', async () => {
      const mockPolicies = [
        createNetworkPolicy('ingress-policy-1', 'default', {
          spec: {
            policyTypes: ['Ingress'],
            ingress: [
              {
                from: [{ podSelector: { matchLabels: { app: 'frontend' } } }],
                ports: [{ protocol: 'TCP', port: 80 }],
              },
            ],
          },
        }),
        createNetworkPolicy('ingress-policy-2', 'default', {
          spec: {
            policyTypes: ['Ingress'],
            ingress: [
              {
                from: [{ namespaceSelector: { matchLabels: { env: 'prod' } } }],
                ports: [{ protocol: 'TCP', port: 443 }],
              },
            ],
          },
        }),
      ]
      mockK8sApi.listNamespacedNetworkPolicy.mockResolvedValue({
        body: { items: mockPolicies },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockPolicies)
      expect(result.length).toBe(2)
    })

    it('should list multiple policies with different egress rules', async () => {
      const mockPolicies = [
        createNetworkPolicy('egress-policy-1', 'default', {
          spec: {
            policyTypes: ['Egress'],
            egress: [
              {
                to: [{ podSelector: { matchLabels: { app: 'database' } } }],
                ports: [{ protocol: 'TCP', port: 5432 }],
              },
            ],
          },
        }),
        createNetworkPolicy('egress-policy-2', 'default', {
          spec: {
            policyTypes: ['Egress'],
            egress: [
              {
                to: [{ namespaceSelector: { matchLabels: { name: 'external' } } }],
                ports: [{ protocol: 'TCP', port: 443 }],
              },
            ],
          },
        }),
      ]
      mockK8sApi.listNamespacedNetworkPolicy.mockResolvedValue({
        body: { items: mockPolicies },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockPolicies)
      expect(result.length).toBe(2)
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single network policy by namespace and name', async () => {
      const mockPolicy = createNetworkPolicy('test-policy', 'default')
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'test-policy')

      expect(result).toEqual(mockPolicy)
      expect(mockK8sApi.readNamespacedNetworkPolicy).toHaveBeenCalledWith('test-policy', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('NetworkPolicy not found')
      mockK8sApi.readNamespacedNetworkPolicy.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('NetworkPolicy not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedNetworkPolicy.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-policy')).rejects.toThrow('Namespace does not exist')
    })

    it('should get network policy with ingress rules only', async () => {
      const mockPolicy = createNetworkPolicy('ingress-only', 'default', {
        spec: {
          policyTypes: ['Ingress'],
          ingress: [
            {
              from: [
                { podSelector: { matchLabels: { app: 'frontend' } } },
                { namespaceSelector: { matchLabels: { env: 'prod' } } },
              ],
              ports: [
                { protocol: 'TCP', port: 80 },
                { protocol: 'TCP', port: 443 },
              ],
            },
          ],
          egress: undefined,
        },
      })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'ingress-only')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.policyTypes).toContain('Ingress')
      expect(result.spec.ingress).toBeDefined()
      expect(result.spec.ingress?.length).toBe(1)
    })

    it('should get network policy with egress rules only', async () => {
      const mockPolicy = createNetworkPolicy('egress-only', 'default', {
        spec: {
          policyTypes: ['Egress'],
          ingress: undefined,
          egress: [
            {
              to: [
                { podSelector: { matchLabels: { app: 'database' } } },
                { namespaceSelector: { matchLabels: { name: 'data' } } },
              ],
              ports: [
                { protocol: 'TCP', port: 5432 },
                { protocol: 'TCP', port: 3306 },
              ],
            },
          ],
        },
      })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'egress-only')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.policyTypes).toContain('Egress')
      expect(result.spec.egress).toBeDefined()
      expect(result.spec.egress?.length).toBe(1)
    })

    it('should get network policy with both ingress and egress rules', async () => {
      const mockPolicy = createNetworkPolicy('combined-policy', 'default', {
        spec: {
          policyTypes: ['Ingress', 'Egress'],
          ingress: [
            {
              from: [{ podSelector: { matchLabels: { app: 'frontend' } } }],
              ports: [{ protocol: 'TCP', port: 8080 }],
            },
          ],
          egress: [
            {
              to: [{ podSelector: { matchLabels: { app: 'backend' } } }],
              ports: [{ protocol: 'TCP', port: 3000 }],
            },
          ],
        },
      })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'combined-policy')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.policyTypes).toContain('Ingress')
      expect(result.spec.policyTypes).toContain('Egress')
      expect(result.spec.ingress).toBeDefined()
      expect(result.spec.egress).toBeDefined()
    })

    it('should get network policy with pod selector', async () => {
      const mockPolicy = createNetworkPolicy('pod-selector-policy', 'default', {
        spec: {
          podSelector: {
            matchLabels: {
              app: 'web',
              tier: 'frontend',
              environment: 'production',
            },
          },
        },
      })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'pod-selector-policy')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.podSelector.matchLabels).toHaveProperty('app', 'web')
      expect(result.spec.podSelector.matchLabels).toHaveProperty('tier', 'frontend')
      expect(result.spec.podSelector.matchLabels).toHaveProperty('environment', 'production')
    })

    it('should get network policy with empty pod selector (select all)', async () => {
      const mockPolicy = createNetworkPolicy('select-all-policy', 'default', {
        spec: {
          podSelector: {},
          policyTypes: ['Ingress'],
        },
      })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'select-all-policy')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.podSelector).toEqual({})
    })

    it('should get network policy with namespace selector', async () => {
      const mockPolicy = createNetworkPolicy('namespace-selector-policy', 'default', {
        spec: {
          policyTypes: ['Ingress'],
          ingress: [
            {
              from: [
                {
                  namespaceSelector: {
                    matchLabels: {
                      environment: 'production',
                      team: 'backend',
                    },
                  },
                },
              ],
            },
          ],
        },
      })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'namespace-selector-policy')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.ingress?.[0].from?.[0]).toHaveProperty('namespaceSelector')
    })

    it('should get network policy with CIDR blocks', async () => {
      const mockPolicy = createNetworkPolicy('cidr-policy', 'default', {
        spec: {
          policyTypes: ['Ingress', 'Egress'],
          ingress: [
            {
              from: [
                {
                  ipBlock: {
                    cidr: '192.168.1.0/24',
                    except: ['192.168.1.5/32'],
                  },
                },
              ],
            },
          ],
          egress: [
            {
              to: [
                {
                  ipBlock: {
                    cidr: '10.0.0.0/8',
                  },
                },
              ],
            },
          ],
        },
      })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'cidr-policy')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.ingress?.[0].from?.[0]).toHaveProperty('ipBlock')
      expect(result.spec.egress?.[0].to?.[0]).toHaveProperty('ipBlock')
    })

    it('should get network policy with multiple ports', async () => {
      const mockPolicy = createNetworkPolicy('multi-port-policy', 'default', {
        spec: {
          policyTypes: ['Ingress'],
          ingress: [
            {
              from: [{ podSelector: { matchLabels: { app: 'frontend' } } }],
              ports: [
                { protocol: 'TCP', port: 80 },
                { protocol: 'TCP', port: 443 },
                { protocol: 'TCP', port: 8080 },
              ],
            },
          ],
        },
      })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'multi-port-policy')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.ingress?.[0].ports?.length).toBe(3)
    })

    it('should get network policy with multiple ingress rules', async () => {
      const mockPolicy = createNetworkPolicy('multi-ingress-policy', 'default', {
        spec: {
          policyTypes: ['Ingress'],
          ingress: [
            {
              from: [{ podSelector: { matchLabels: { app: 'frontend' } } }],
              ports: [{ protocol: 'TCP', port: 80 }],
            },
            {
              from: [{ namespaceSelector: { matchLabels: { env: 'prod' } } }],
              ports: [{ protocol: 'TCP', port: 443 }],
            },
            {
              from: [{ ipBlock: { cidr: '192.168.1.0/24' } }],
            },
          ],
        },
      })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'multi-ingress-policy')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.ingress?.length).toBe(3)
    })

    it('should get network policy with multiple egress rules', async () => {
      const mockPolicy = createNetworkPolicy('multi-egress-policy', 'default', {
        spec: {
          policyTypes: ['Egress'],
          egress: [
            {
              to: [{ podSelector: { matchLabels: { app: 'database' } } }],
              ports: [{ protocol: 'TCP', port: 5432 }],
            },
            {
              to: [{ namespaceSelector: { matchLabels: { name: 'external' } } }],
              ports: [{ protocol: 'TCP', port: 443 }],
            },
            {
              to: [{ ipBlock: { cidr: '10.0.0.0/8' } }],
            },
          ],
        },
      })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'multi-egress-policy')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.egress?.length).toBe(3)
    })

    it('should get network policy with UDP protocol', async () => {
      const mockPolicy = createNetworkPolicy('udp-policy', 'default', {
        spec: {
          policyTypes: ['Ingress'],
          ingress: [
            {
              from: [{ podSelector: { matchLabels: { app: 'dns' } } }],
              ports: [{ protocol: 'UDP', port: 53 }],
            },
          ],
        },
      })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'udp-policy')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.ingress?.[0].ports?.[0].protocol).toBe('UDP')
    })

    it('should get network policy with SCTP protocol', async () => {
      const mockPolicy = createNetworkPolicy('sctp-policy', 'default', {
        spec: {
          policyTypes: ['Ingress'],
          ingress: [
            {
              from: [{ podSelector: { matchLabels: { app: 'telecom' } } }],
              ports: [{ protocol: 'SCTP', port: 3868 }],
            },
          ],
        },
      })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'sctp-policy')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.ingress?.[0].ports?.[0].protocol).toBe('SCTP')
    })

    it('should handle policy names with hyphens and numbers', async () => {
      const mockPolicy = createNetworkPolicy('my-policy-123', 'default')
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'my-policy-123')

      expect(result).toEqual(mockPolicy)
      expect(mockK8sApi.readNamespacedNetworkPolicy).toHaveBeenCalledWith('my-policy-123', 'default')
    })

    it('should get deny-all ingress policy', async () => {
      const mockPolicy = createNetworkPolicy('deny-all-ingress', 'default', {
        spec: {
          podSelector: {},
          policyTypes: ['Ingress'],
          ingress: undefined,
        },
      })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'deny-all-ingress')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.policyTypes).toContain('Ingress')
      expect(result.spec.ingress).toBeUndefined()
    })

    it('should get deny-all egress policy', async () => {
      const mockPolicy = createNetworkPolicy('deny-all-egress', 'default', {
        spec: {
          podSelector: {},
          policyTypes: ['Egress'],
          egress: undefined,
        },
      })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({
        body: mockPolicy,
      })

      const result = await service.GetOneByNsName('default', 'deny-all-egress')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.policyTypes).toContain('Egress')
      expect(result.spec.egress).toBeUndefined()
    })
  })

  describe('Delete', () => {
    it('should delete a network policy', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedNetworkPolicy.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-policy', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedNetworkPolicy).toHaveBeenCalledWith('test-policy', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedNetworkPolicy.mockRejectedValue(error)

      await expect(service.Delete('test-policy', 'default')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent policy', async () => {
      const error = new Error('NetworkPolicy not found')
      mockK8sApi.deleteNamespacedNetworkPolicy.mockRejectedValue(error)

      await expect(service.Delete('nonexistent', 'default')).rejects.toThrow('NetworkPolicy not found')
    })

    it('should delete policy from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedNetworkPolicy.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-policy', 'kube-system')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedNetworkPolicy).toHaveBeenCalledWith('my-policy', 'kube-system')
    })

    it('should handle policy with finalizers', async () => {
      const mockResponse = { status: 'Success', metadata: { finalizers: ['kubernetes'] } }
      mockK8sApi.deleteNamespacedNetworkPolicy.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('policy-with-finalizer', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNamespacedNetworkPolicy.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete network policies')
      mockK8sApi.deleteNamespacedNetworkPolicy.mockRejectedValue(error)

      await expect(service.Delete('test-policy', 'default')).rejects.toThrow('Forbidden')
    })

    it('should delete ingress-only policy', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedNetworkPolicy.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('ingress-only-policy', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedNetworkPolicy).toHaveBeenCalledWith('ingress-only-policy', 'default')
    })

    it('should delete egress-only policy', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedNetworkPolicy.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('egress-only-policy', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedNetworkPolicy).toHaveBeenCalledWith('egress-only-policy', 'default')
    })

    it('should delete deny-all policy', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedNetworkPolicy.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('deny-all', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedNetworkPolicy).toHaveBeenCalledWith('deny-all', 'default')
    })

    it('should delete policy from production namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedNetworkPolicy.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('production-policy', 'production')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedNetworkPolicy).toHaveBeenCalledWith('production-policy', 'production')
    })

    it('should delete policy from staging namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedNetworkPolicy.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('staging-policy', 'staging')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedNetworkPolicy).toHaveBeenCalledWith('staging-policy', 'staging')
    })
  })

  describe('Client Service Integration', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should use ClientService to get K8s API', async () => {
      const mockPolicies = [createNetworkPolicy('test-policy')]
      mockK8sApi.listNetworkPolicyForAllNamespaces.mockResolvedValue({
        body: { items: mockPolicies },
      })

      await service.List()

      expect(clientService.getNetworkingV1Api).toHaveBeenCalled()
    })

    it('should call getNetworkingV1Api for every operation', async () => {
      mockK8sApi.listNetworkPolicyForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedNetworkPolicy.mockResolvedValue({ body: createNetworkPolicy('test') })
      mockK8sApi.deleteNamespacedNetworkPolicy.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('test', 'default')

      expect(clientService.getNetworkingV1Api).toHaveBeenCalledTimes(3)
    })

    it('should handle multiple namespace operations', async () => {
      mockK8sApi.listNamespacedNetworkPolicy.mockResolvedValue({ body: { items: [] } })

      await service.List('default')
      await service.List('kube-system')
      await service.List('production')

      expect(clientService.getNetworkingV1Api).toHaveBeenCalledTimes(3)
      expect(mockK8sApi.listNamespacedNetworkPolicy).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listNamespacedNetworkPolicy).toHaveBeenCalledWith('kube-system')
      expect(mockK8sApi.listNamespacedNetworkPolicy).toHaveBeenCalledWith('production')
    })
  })
})
