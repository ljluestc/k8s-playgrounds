import { vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createMockClientService } from '../../../../test/utils/k8s-mocks'
import { ServiceAccountService } from './ServiceAccount.service'

// Helper function to create service account mock data
export function createServiceAccount(name: string, namespace: string = 'default') {
  return {
    metadata: {
      name,
      namespace,
      creationTimestamp: new Date().toISOString(),
      uid: `serviceaccount-${name}-${namespace}`,
    },
    secrets: [
      {
        name: `${name}-token-abc123`,
      },
    ],
    imagePullSecrets: [],
  }
}

describe('ServiceAccountService', () => {
  let service: ServiceAccountService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getCoreV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ServiceAccountService,
          useFactory: (clientService: ClientService) => {
            return new ServiceAccountService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<ServiceAccountService>(ServiceAccountService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all service accounts across all namespaces when no namespace specified', async () => {
      const mockServiceAccounts = [
        createServiceAccount('sa-1', 'default'),
        createServiceAccount('sa-2', 'kube-system'),
      ]
      mockK8sApi.listServiceAccountForAllNamespaces.mockResolvedValue({
        body: { items: mockServiceAccounts },
      })

      const result = await service.List()

      expect(result).toEqual(mockServiceAccounts)
      expect(mockK8sApi.listServiceAccountForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedServiceAccount).not.toHaveBeenCalled()
    })

    it('should list all service accounts when namespace is "null" string', async () => {
      const mockServiceAccounts = [createServiceAccount('sa-1')]
      mockK8sApi.listServiceAccountForAllNamespaces.mockResolvedValue({
        body: { items: mockServiceAccounts },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockServiceAccounts)
      expect(mockK8sApi.listServiceAccountForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedServiceAccount).not.toHaveBeenCalled()
    })

    it('should list service accounts in a specific namespace', async () => {
      const mockServiceAccounts = [createServiceAccount('sa-1', 'default')]
      mockK8sApi.listNamespacedServiceAccount.mockResolvedValue({
        body: { items: mockServiceAccounts },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockServiceAccounts)
      expect(mockK8sApi.listNamespacedServiceAccount).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listServiceAccountForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all service accounts', async () => {
      const error = new Error('API Error')
      mockK8sApi.listServiceAccountForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced service accounts', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedServiceAccount.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no service accounts exist', async () => {
      mockK8sApi.listServiceAccountForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list service accounts in kube-system namespace', async () => {
      const mockServiceAccounts = [
        createServiceAccount('default', 'kube-system'),
        createServiceAccount('coredns', 'kube-system'),
      ]
      mockK8sApi.listNamespacedServiceAccount.mockResolvedValue({
        body: { items: mockServiceAccounts },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockServiceAccounts)
      expect(mockK8sApi.listNamespacedServiceAccount).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockServiceAccounts = [createServiceAccount('my-sa', 'my-namespace-123')]
      mockK8sApi.listNamespacedServiceAccount.mockResolvedValue({
        body: { items: mockServiceAccounts },
      })

      const result = await service.List('my-namespace-123')

      expect(result).toEqual(mockServiceAccounts)
      expect(mockK8sApi.listNamespacedServiceAccount).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should list service accounts with multiple secrets', async () => {
      const saWithSecrets = createServiceAccount('multi-secret-sa', 'default')
      saWithSecrets.secrets = [
        { name: 'multi-secret-sa-token-abc' },
        { name: 'multi-secret-sa-token-def' },
        { name: 'multi-secret-sa-dockercfg-xyz' },
      ]
      mockK8sApi.listNamespacedServiceAccount.mockResolvedValue({
        body: { items: [saWithSecrets] },
      })

      const result = await service.List('default')

      expect(result).toEqual([saWithSecrets])
      expect(result[0].secrets).toHaveLength(3)
    })

    it('should list service accounts with image pull secrets', async () => {
      const saWithImagePullSecrets = createServiceAccount('registry-sa', 'default')
      saWithImagePullSecrets.imagePullSecrets = [
        { name: 'dockerhub-secret' },
        { name: 'private-registry-secret' },
      ]
      mockK8sApi.listNamespacedServiceAccount.mockResolvedValue({
        body: { items: [saWithImagePullSecrets] },
      })

      const result = await service.List('default')

      expect(result).toEqual([saWithImagePullSecrets])
      expect(result[0].imagePullSecrets).toHaveLength(2)
    })

    it('should list service accounts from multiple namespaces', async () => {
      const mockServiceAccounts = [
        createServiceAccount('app-sa', 'production'),
        createServiceAccount('app-sa', 'staging'),
        createServiceAccount('default', 'default'),
      ]
      mockK8sApi.listServiceAccountForAllNamespaces.mockResolvedValue({
        body: { items: mockServiceAccounts },
      })

      const result = await service.List()

      expect(result).toEqual(mockServiceAccounts)
      expect(result).toHaveLength(3)
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single service account by namespace and name', async () => {
      const mockServiceAccount = createServiceAccount('test-sa', 'default')
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('default', 'test-sa')

      expect(result).toEqual(mockServiceAccount)
      expect(mockK8sApi.readNamespacedServiceAccount).toHaveBeenCalledWith('test-sa', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('ServiceAccount not found')
      mockK8sApi.readNamespacedServiceAccount.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('ServiceAccount not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedServiceAccount.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-sa')).rejects.toThrow('Namespace does not exist')
    })

    it('should get service account with multiple secrets', async () => {
      const mockServiceAccount = createServiceAccount('multi-secret-sa', 'default')
      mockServiceAccount.secrets = [
        { name: 'multi-secret-sa-token-abc' },
        { name: 'multi-secret-sa-token-def' },
        { name: 'multi-secret-sa-dockercfg-xyz' },
      ]
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('default', 'multi-secret-sa')

      expect(result).toEqual(mockServiceAccount)
      expect(result.secrets).toHaveLength(3)
    })

    it('should get service account with image pull secrets', async () => {
      const mockServiceAccount = createServiceAccount('registry-sa', 'default')
      mockServiceAccount.imagePullSecrets = [
        { name: 'dockerhub-secret' },
        { name: 'private-registry-secret' },
        { name: 'gcr-secret' },
      ]
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('default', 'registry-sa')

      expect(result).toEqual(mockServiceAccount)
      expect(result.imagePullSecrets).toHaveLength(3)
    })

    it('should get service account with automountServiceAccountToken set to false', async () => {
      const mockServiceAccount = createServiceAccount('no-automount-sa', 'default');
      (mockServiceAccount as any).automountServiceAccountToken = false
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('default', 'no-automount-sa')

      expect(result).toEqual(mockServiceAccount)
      expect((result as any).automountServiceAccountToken).toBe(false)
    })

    it('should get service account with automountServiceAccountToken set to true', async () => {
      const mockServiceAccount = createServiceAccount('automount-sa', 'default');
      (mockServiceAccount as any).automountServiceAccountToken = true
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('default', 'automount-sa')

      expect(result).toEqual(mockServiceAccount)
      expect((result as any).automountServiceAccountToken).toBe(true)
    })

    it('should get default service account', async () => {
      const mockServiceAccount = createServiceAccount('default', 'default')
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('default', 'default')

      expect(result).toEqual(mockServiceAccount)
      expect(result.metadata.name).toBe('default')
    })

    it('should get service account from kube-system namespace', async () => {
      const mockServiceAccount = createServiceAccount('coredns', 'kube-system')
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('kube-system', 'coredns')

      expect(result).toEqual(mockServiceAccount)
      expect(result.metadata.namespace).toBe('kube-system')
    })

    it('should handle service account names with hyphens and numbers', async () => {
      const mockServiceAccount = createServiceAccount('my-service-account-123', 'default')
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('default', 'my-service-account-123')

      expect(result).toEqual(mockServiceAccount)
      expect(mockK8sApi.readNamespacedServiceAccount).toHaveBeenCalledWith('my-service-account-123', 'default')
    })

    it('should get service account with no secrets', async () => {
      const mockServiceAccount = createServiceAccount('no-secret-sa', 'default')
      mockServiceAccount.secrets = []
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('default', 'no-secret-sa')

      expect(result).toEqual(mockServiceAccount)
      expect(result.secrets).toHaveLength(0)
    })

    it('should get service account with both secrets and image pull secrets', async () => {
      const mockServiceAccount = createServiceAccount('full-sa', 'default')
      mockServiceAccount.secrets = [
        { name: 'full-sa-token-abc' },
      ]
      mockServiceAccount.imagePullSecrets = [
        { name: 'dockerhub-secret' },
        { name: 'gcr-secret' },
      ]
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('default', 'full-sa')

      expect(result).toEqual(mockServiceAccount)
      expect(result.secrets).toHaveLength(1)
      expect(result.imagePullSecrets).toHaveLength(2)
    })

    it('should handle service account in production namespace', async () => {
      const mockServiceAccount = createServiceAccount('prod-app-sa', 'production')
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('production', 'prod-app-sa')

      expect(result).toEqual(mockServiceAccount)
      expect(result.metadata.namespace).toBe('production')
    })
  })

  describe('Delete', () => {
    it('should delete a service account', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedServiceAccount.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-sa', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedServiceAccount).toHaveBeenCalledWith('test-sa', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedServiceAccount.mockRejectedValue(error)

      await expect(service.Delete('test-sa', 'default')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent service account', async () => {
      const error = new Error('ServiceAccount not found')
      mockK8sApi.deleteNamespacedServiceAccount.mockRejectedValue(error)

      await expect(service.Delete('nonexistent', 'default')).rejects.toThrow('ServiceAccount not found')
    })

    it('should delete service account from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedServiceAccount.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-sa', 'kube-system')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedServiceAccount).toHaveBeenCalledWith('my-sa', 'kube-system')
    })

    it('should delete default service account', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedServiceAccount.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('default', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedServiceAccount).toHaveBeenCalledWith('default', 'default')
    })

    it('should handle service account with finalizers', async () => {
      const mockResponse = {
        status: 'Success',
        metadata: {
          finalizers: ['kubernetes.io/service-account-token-secret-cleanup'],
        },
      }
      mockK8sApi.deleteNamespacedServiceAccount.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('sa-with-finalizer', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = {
        status: 'Success',
        metadata: {
          deletionTimestamp: new Date().toISOString(),
        },
      }
      mockK8sApi.deleteNamespacedServiceAccount.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete service accounts')
      mockK8sApi.deleteNamespacedServiceAccount.mockRejectedValue(error)

      await expect(service.Delete('test-sa', 'default')).rejects.toThrow('Forbidden')
    })

    it('should delete service account from production namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedServiceAccount.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('prod-sa', 'production')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedServiceAccount).toHaveBeenCalledWith('prod-sa', 'production')
    })

    it('should delete service account from staging namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedServiceAccount.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('staging-sa', 'staging')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedServiceAccount).toHaveBeenCalledWith('staging-sa', 'staging')
    })

    it('should handle deletion of service account in use', async () => {
      const error = new Error('Service account is in use by pods')
      mockK8sApi.deleteNamespacedServiceAccount.mockRejectedValue(error)

      await expect(service.Delete('in-use-sa', 'default')).rejects.toThrow('Service account is in use')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s API', async () => {
      const mockServiceAccounts = [createServiceAccount('test-sa')]
      mockK8sApi.listServiceAccountForAllNamespaces.mockResolvedValue({
        body: { items: mockServiceAccounts },
      })

      await service.List()

      expect(clientService.getCoreV1Api).toHaveBeenCalled()
    })

    it('should call getCoreV1Api for every operation', async () => {
      mockK8sApi.listServiceAccountForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({ body: createServiceAccount('test') })
      mockK8sApi.deleteNamespacedServiceAccount.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('test', 'default')

      expect(clientService.getCoreV1Api).toHaveBeenCalledTimes(4)
    })

    it('should handle API client errors gracefully', async () => {
      const error = new Error('API client error')
      mockK8sApi.listServiceAccountForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API client error')
    })
  })

  describe('Edge Cases', () => {
    it('should handle service accounts with annotations', async () => {
      const mockServiceAccount = createServiceAccount('annotated-sa', 'default');
      (mockServiceAccount.metadata as any).annotations = {
        'kubernetes.io/service-account.name': 'annotated-sa',
        'custom-annotation': 'custom-value',
      }
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('default', 'annotated-sa')

      expect(result).toEqual(mockServiceAccount)
      expect((result.metadata as any).annotations).toBeDefined()
    })

    it('should handle service accounts with labels', async () => {
      const mockServiceAccount = createServiceAccount('labeled-sa', 'default');
      (mockServiceAccount.metadata as any).labels = {
        app: 'my-app',
        environment: 'production',
      }
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('default', 'labeled-sa')

      expect(result).toEqual(mockServiceAccount)
      expect((result.metadata as any).labels).toBeDefined()
    })

    it('should list service accounts across multiple namespaces with different configurations', async () => {
      const sa1 = createServiceAccount('sa1', 'default')
      const sa2 = createServiceAccount('sa2', 'kube-system');
      (sa2 as any).automountServiceAccountToken = false
      const sa3 = createServiceAccount('sa3', 'production')
      sa3.imagePullSecrets = [{ name: 'registry-secret' }]

      mockK8sApi.listServiceAccountForAllNamespaces.mockResolvedValue({
        body: { items: [sa1, sa2, sa3] },
      })

      const result = await service.List()

      expect(result).toHaveLength(3)
      expect(result[0].metadata.namespace).toBe('default')
      expect(result[1].metadata.namespace).toBe('kube-system')
      expect((result[1] as any).automountServiceAccountToken).toBe(false)
      expect(result[2].imagePullSecrets).toHaveLength(1)
    })

    it('should handle empty secrets array', async () => {
      const mockServiceAccount = createServiceAccount('no-secrets', 'default')
      mockServiceAccount.secrets = []
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('default', 'no-secrets')

      expect(result.secrets).toEqual([])
    })

    it('should handle undefined image pull secrets', async () => {
      const mockServiceAccount = createServiceAccount('no-image-pull', 'default')
      delete (mockServiceAccount as any).imagePullSecrets
      mockK8sApi.readNamespacedServiceAccount.mockResolvedValue({
        body: mockServiceAccount,
      })

      const result = await service.GetOneByNsName('default', 'no-image-pull')

      expect(result.imagePullSecrets).toBeUndefined()
    })
  })
})
