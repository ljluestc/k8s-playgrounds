
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockK8sService } from '../../../../test/utils/k8s-mocks'

import { ServiceAccountController } from './ServiceAccount.controller'

describe('ServiceAccountController', () => {
  let controller: ServiceAccountController
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new ServiceAccountController(k8sService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all service accounts', async () => {
      const mockServiceAccounts = { items: [] }
      vi.spyOn(k8sService.serviceAccountService, 'List').mockResolvedValue(mockServiceAccounts as any)

      const result = await controller.List()

      expect(result).toEqual(mockServiceAccounts)
      expect(k8sService.serviceAccountService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing service accounts', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.serviceAccountService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })
  })

  describe('ListByNs', () => {
    it('should return service accounts for a specific namespace', async () => {
      const mockServiceAccounts = { items: [] }
      const namespace = 'default'
      vi.spyOn(k8sService.serviceAccountService, 'List').mockResolvedValue(mockServiceAccounts as any)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockServiceAccounts)
      expect(k8sService.serviceAccountService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      vi.spyOn(k8sService.serviceAccountService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockServiceAccounts = { items: [] }
      vi.spyOn(k8sService.serviceAccountService, 'List').mockResolvedValue(mockServiceAccounts as any)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockServiceAccounts)
      expect(k8sService.serviceAccountService.List).toHaveBeenCalledWith('')
    })

    it('should list service accounts in kube-system namespace', async () => {
      const mockServiceAccounts = { items: [] }
      vi.spyOn(k8sService.serviceAccountService, 'List').mockResolvedValue(mockServiceAccounts as any)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockServiceAccounts)
      expect(k8sService.serviceAccountService.List).toHaveBeenCalledWith('kube-system')
    })

    it('should list service accounts in custom namespace', async () => {
      const mockServiceAccounts = { items: [] }
      vi.spyOn(k8sService.serviceAccountService, 'List').mockResolvedValue(mockServiceAccounts as any)

      const result = await controller.ListByNs('my-namespace-123')

      expect(result).toEqual(mockServiceAccounts)
      expect(k8sService.serviceAccountService.List).toHaveBeenCalledWith('my-namespace-123')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single service account', async () => {
      const mockServiceAccount = {
        metadata: { name: 'test-sa', namespace: 'default' },
        secrets: [{ name: 'test-sa-token-abc123' }],
      }
      vi.spyOn(k8sService.serviceAccountService, 'GetOneByNsName').mockResolvedValue(mockServiceAccount as any)

      const result = await controller.GetOneByNsName('default', 'test-sa')

      expect(result).toEqual(mockServiceAccount)
      expect(k8sService.serviceAccountService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-sa')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.serviceAccountService, 'GetOneByNsName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should get service account with secrets', async () => {
      const mockServiceAccount = {
        metadata: { name: 'app-sa', namespace: 'default' },
        secrets: [
          { name: 'app-sa-token-xyz' },
          { name: 'app-sa-dockercfg-123' },
        ],
      }
      vi.spyOn(k8sService.serviceAccountService, 'GetOneByNsName').mockResolvedValue(mockServiceAccount as any)

      const result = await controller.GetOneByNsName('default', 'app-sa')

      expect(result).toEqual(mockServiceAccount)
      expect(result.secrets).toHaveLength(2)
    })

    it('should get service account with image pull secrets', async () => {
      const mockServiceAccount = {
        metadata: { name: 'registry-sa', namespace: 'default' },
        imagePullSecrets: [
          { name: 'dockerhub-secret' },
          { name: 'private-registry-secret' },
        ],
      }
      vi.spyOn(k8sService.serviceAccountService, 'GetOneByNsName').mockResolvedValue(mockServiceAccount as any)

      const result = await controller.GetOneByNsName('default', 'registry-sa')

      expect(result).toEqual(mockServiceAccount)
      expect(result.imagePullSecrets).toHaveLength(2)
    })

    it('should get service account with automountServiceAccountToken set to false', async () => {
      const mockServiceAccount = {
        metadata: { name: 'no-automount-sa', namespace: 'default' },
        automountServiceAccountToken: false,
      }
      vi.spyOn(k8sService.serviceAccountService, 'GetOneByNsName').mockResolvedValue(mockServiceAccount as any)

      const result = await controller.GetOneByNsName('default', 'no-automount-sa')

      expect(result).toEqual(mockServiceAccount)
      expect(result.automountServiceAccountToken).toBe(false)
    })

    it('should get service account with automountServiceAccountToken set to true', async () => {
      const mockServiceAccount = {
        metadata: { name: 'automount-sa', namespace: 'default' },
        automountServiceAccountToken: true,
      }
      vi.spyOn(k8sService.serviceAccountService, 'GetOneByNsName').mockResolvedValue(mockServiceAccount as any)

      const result = await controller.GetOneByNsName('default', 'automount-sa')

      expect(result).toEqual(mockServiceAccount)
      expect(result.automountServiceAccountToken).toBe(true)
    })

    it('should handle special characters in service account name', async () => {
      const mockServiceAccount = { metadata: { name: 'test-sa-123', namespace: 'default' } }
      vi.spyOn(k8sService.serviceAccountService, 'GetOneByNsName').mockResolvedValue(mockServiceAccount as any)

      const result = await controller.GetOneByNsName('default', 'test-sa-123')

      expect(result).toEqual(mockServiceAccount)
      expect(k8sService.serviceAccountService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-sa-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockServiceAccount = { metadata: { name: 'test-sa', namespace: 'kube-system' } }
      vi.spyOn(k8sService.serviceAccountService, 'GetOneByNsName').mockResolvedValue(mockServiceAccount as any)

      const result = await controller.GetOneByNsName('kube-system', 'test-sa')

      expect(result).toEqual(mockServiceAccount)
      expect(k8sService.serviceAccountService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-sa')
    })

    it('should get default service account', async () => {
      const mockServiceAccount = {
        metadata: { name: 'default', namespace: 'default' },
        secrets: [{ name: 'default-token-xyz' }],
      }
      vi.spyOn(k8sService.serviceAccountService, 'GetOneByNsName').mockResolvedValue(mockServiceAccount as any)

      const result = await controller.GetOneByNsName('default', 'default')

      expect(result).toEqual(mockServiceAccount)
      expect(result.metadata.name).toBe('default')
    })
  })

  describe('Delete', () => {
    it('should delete a single service account', async () => {
      vi.spyOn(k8sService.serviceAccountService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-sa']
      await controller.Delete(nsn)

      expect(k8sService.serviceAccountService.Delete).toHaveBeenCalledWith('test-sa', 'default')
    })

    it('should delete multiple service accounts', async () => {
      vi.spyOn(k8sService.serviceAccountService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/sa1', 'kube-system/sa2', 'default/sa3']
      await controller.Delete(nsn)

      expect(k8sService.serviceAccountService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.serviceAccountService.Delete).toHaveBeenCalledWith('sa1', 'default')
      expect(k8sService.serviceAccountService.Delete).toHaveBeenCalledWith('sa2', 'kube-system')
      expect(k8sService.serviceAccountService.Delete).toHaveBeenCalledWith('sa3', 'default')
    })

    it('should delete service accounts from multiple namespaces', async () => {
      vi.spyOn(k8sService.serviceAccountService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/app-sa', 'production/app-sa', 'staging/app-sa']
      await controller.Delete(nsn)

      expect(k8sService.serviceAccountService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.serviceAccountService.Delete).toHaveBeenCalledWith('app-sa', 'default')
      expect(k8sService.serviceAccountService.Delete).toHaveBeenCalledWith('app-sa', 'production')
      expect(k8sService.serviceAccountService.Delete).toHaveBeenCalledWith('app-sa', 'staging')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.serviceAccountService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.serviceAccountService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.serviceAccountService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/sa1', 'default/sa2', 'default/sa3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.serviceAccountService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle service accounts with slashes in namespace/name format', async () => {
      vi.spyOn(k8sService.serviceAccountService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-service-account']
      await controller.Delete(nsn)

      expect(k8sService.serviceAccountService.Delete).toHaveBeenCalledWith('my-service-account', 'my-namespace')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.serviceAccountService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-sa']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should handle deletion of default service account', async () => {
      vi.spyOn(k8sService.serviceAccountService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/default']
      await controller.Delete(nsn)

      expect(k8sService.serviceAccountService.Delete).toHaveBeenCalledWith('default', 'default')
    })

    it('should handle deletion errors gracefully', async () => {
      vi.spyOn(k8sService.serviceAccountService, 'Delete')
        .mockRejectedValue(new Error('Service account is in use'))

      const nsn = ['default/test-sa']

      // Should not throw due to forEach not handling async errors
      await controller.Delete(nsn)

      expect(k8sService.serviceAccountService.Delete).toHaveBeenCalledWith('test-sa', 'default')
    })
  })
})
