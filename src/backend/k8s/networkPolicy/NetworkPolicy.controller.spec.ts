import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NetworkPolicyController } from './NetworkPolicy.controller'

describe('NetworkPolicyController', () => {
  let controller: NetworkPolicyController
  let k8sService: any

  beforeEach(async () => {
    const mockNetworkPolicyService = {
      List: vi.fn(),
      GetOneByNsName: vi.fn(),
      Delete: vi.fn(),
    }

    k8sService = {
      networkPolicyService: mockNetworkPolicyService,
    } as any

    controller = new NetworkPolicyController(k8sService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all network policies', async () => {
      const mockPolicies = { items: [] }
      k8sService.networkPolicyService.List.mockResolvedValue(mockPolicies)

      const result = await controller.List()

      expect(result).toEqual(mockPolicies)
      expect(k8sService.networkPolicyService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing network policies', async () => {
      const error = new Error('API error')
      k8sService.networkPolicyService.List.mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })
  })

  describe('ListByNs', () => {
    it('should return network policies for a specific namespace', async () => {
      const mockPolicies = { items: [] }
      const namespace = 'default'
      k8sService.networkPolicyService.List.mockResolvedValue(mockPolicies)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockPolicies)
      expect(k8sService.networkPolicyService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      k8sService.networkPolicyService.List.mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockPolicies = { items: [] }
      k8sService.networkPolicyService.List.mockResolvedValue(mockPolicies)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockPolicies)
      expect(k8sService.networkPolicyService.List).toHaveBeenCalledWith('')
    })

    it('should list policies in kube-system namespace', async () => {
      const mockPolicies = { items: [] }
      k8sService.networkPolicyService.List.mockResolvedValue(mockPolicies)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockPolicies)
      expect(k8sService.networkPolicyService.List).toHaveBeenCalledWith('kube-system')
    })

    it('should handle namespace with special characters', async () => {
      const mockPolicies = { items: [] }
      k8sService.networkPolicyService.List.mockResolvedValue(mockPolicies)

      const result = await controller.ListByNs('my-namespace-123')

      expect(result).toEqual(mockPolicies)
      expect(k8sService.networkPolicyService.List).toHaveBeenCalledWith('my-namespace-123')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single network policy', async () => {
      const mockPolicy = {
        metadata: { name: 'test-policy', namespace: 'default' },
        spec: {
          podSelector: { matchLabels: { app: 'web' } },
          policyTypes: ['Ingress', 'Egress'],
        },
      }
      k8sService.networkPolicyService.GetOneByNsName.mockResolvedValue(mockPolicy)

      const result = await controller.GetOneByNsName('default', 'test-policy')

      expect(result).toEqual(mockPolicy)
      expect(k8sService.networkPolicyService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-policy')
    })

    it('should return network policy with ingress rules', async () => {
      const mockPolicy = {
        metadata: { name: 'ingress-policy', namespace: 'default' },
        spec: {
          podSelector: { matchLabels: { app: 'web' } },
          policyTypes: ['Ingress'],
          ingress: [
            {
              from: [{ podSelector: { matchLabels: { app: 'backend' } } }],
              ports: [{ protocol: 'TCP', port: 80 }],
            },
          ],
        },
      }
      k8sService.networkPolicyService.GetOneByNsName.mockResolvedValue(mockPolicy)

      const result = await controller.GetOneByNsName('default', 'ingress-policy')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.ingress).toBeDefined()
      expect(result.spec.ingress?.length).toBe(1)
    })

    it('should return network policy with egress rules', async () => {
      const mockPolicy = {
        metadata: { name: 'egress-policy', namespace: 'default' },
        spec: {
          podSelector: { matchLabels: { app: 'web' } },
          policyTypes: ['Egress'],
          egress: [
            {
              to: [{ podSelector: { matchLabels: { app: 'database' } } }],
              ports: [{ protocol: 'TCP', port: 5432 }],
            },
          ],
        },
      }
      k8sService.networkPolicyService.GetOneByNsName.mockResolvedValue(mockPolicy)

      const result = await controller.GetOneByNsName('default', 'egress-policy')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.egress).toBeDefined()
      expect(result.spec.egress?.length).toBe(1)
    })

    it('should return network policy with namespace selector', async () => {
      const mockPolicy = {
        metadata: { name: 'ns-policy', namespace: 'default' },
        spec: {
          podSelector: { matchLabels: { app: 'web' } },
          policyTypes: ['Ingress'],
          ingress: [
            {
              from: [{ namespaceSelector: { matchLabels: { env: 'prod' } } }],
            },
          ],
        },
      }
      k8sService.networkPolicyService.GetOneByNsName.mockResolvedValue(mockPolicy)

      const result = await controller.GetOneByNsName('default', 'ns-policy')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.ingress?.[0].from?.[0]).toHaveProperty('namespaceSelector')
    })

    it('should handle not found errors', async () => {
      k8sService.networkPolicyService.GetOneByNsName.mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should handle special characters in policy name', async () => {
      const mockPolicy = { metadata: { name: 'test-policy-123', namespace: 'default' } }
      k8sService.networkPolicyService.GetOneByNsName.mockResolvedValue(mockPolicy)

      const result = await controller.GetOneByNsName('default', 'test-policy-123')

      expect(result).toEqual(mockPolicy)
      expect(k8sService.networkPolicyService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-policy-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockPolicy = { metadata: { name: 'test-policy', namespace: 'kube-system' } }
      k8sService.networkPolicyService.GetOneByNsName.mockResolvedValue(mockPolicy)

      const result = await controller.GetOneByNsName('kube-system', 'test-policy')

      expect(result).toEqual(mockPolicy)
      expect(k8sService.networkPolicyService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-policy')
    })

    it('should return network policy with both ingress and egress rules', async () => {
      const mockPolicy = {
        metadata: { name: 'combined-policy', namespace: 'default' },
        spec: {
          podSelector: { matchLabels: { app: 'web' } },
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
      }
      k8sService.networkPolicyService.GetOneByNsName.mockResolvedValue(mockPolicy)

      const result = await controller.GetOneByNsName('default', 'combined-policy')

      expect(result).toEqual(mockPolicy)
      expect(result.spec.ingress).toBeDefined()
      expect(result.spec.egress).toBeDefined()
    })
  })

  describe('Delete', () => {
    it('should delete a single network policy', async () => {
      k8sService.networkPolicyService.Delete.mockResolvedValue(undefined)

      const nsn = ['default/test-policy']
      await controller.Delete(nsn)

      expect(k8sService.networkPolicyService.Delete).toHaveBeenCalledWith('test-policy', 'default')
    })

    it('should delete multiple network policies', async () => {
      k8sService.networkPolicyService.Delete.mockResolvedValue(undefined)

      const nsn = ['default/policy1', 'kube-system/policy2', 'default/policy3']
      await controller.Delete(nsn)

      expect(k8sService.networkPolicyService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.networkPolicyService.Delete).toHaveBeenCalledWith('policy1', 'default')
      expect(k8sService.networkPolicyService.Delete).toHaveBeenCalledWith('policy2', 'kube-system')
      expect(k8sService.networkPolicyService.Delete).toHaveBeenCalledWith('policy3', 'default')
    })

    it('should handle empty array', async () => {
      k8sService.networkPolicyService.Delete.mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.networkPolicyService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      k8sService.networkPolicyService.Delete
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/policy1', 'default/policy2', 'default/policy3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.networkPolicyService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle network policies with slashes in namespace/name format', async () => {
      k8sService.networkPolicyService.Delete.mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-policy-name']
      await controller.Delete(nsn)

      expect(k8sService.networkPolicyService.Delete).toHaveBeenCalledWith('my-policy-name', 'my-namespace')
    })

    it('should return empty object after deletion', async () => {
      k8sService.networkPolicyService.Delete.mockResolvedValue(undefined)

      const nsn = ['default/test-policy']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should delete policies from multiple namespaces', async () => {
      k8sService.networkPolicyService.Delete.mockResolvedValue(undefined)

      const nsn = [
        'default/ingress-policy',
        'kube-system/egress-policy',
        'production/deny-all-policy',
        'staging/allow-frontend-policy',
      ]
      await controller.Delete(nsn)

      expect(k8sService.networkPolicyService.Delete).toHaveBeenCalledTimes(4)
      expect(k8sService.networkPolicyService.Delete).toHaveBeenCalledWith('ingress-policy', 'default')
      expect(k8sService.networkPolicyService.Delete).toHaveBeenCalledWith('egress-policy', 'kube-system')
      expect(k8sService.networkPolicyService.Delete).toHaveBeenCalledWith('deny-all-policy', 'production')
      expect(k8sService.networkPolicyService.Delete).toHaveBeenCalledWith('allow-frontend-policy', 'staging')
    })

    it('should handle deletion of policies with complex names', async () => {
      k8sService.networkPolicyService.Delete.mockResolvedValue(undefined)

      const nsn = ['default/allow-ingress-from-frontend-to-backend-v2']
      await controller.Delete(nsn)

      expect(k8sService.networkPolicyService.Delete).toHaveBeenCalledWith('allow-ingress-from-frontend-to-backend-v2', 'default')
    })
  })
})
