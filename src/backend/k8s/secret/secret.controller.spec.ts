import { Buffer } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { JsonDataWrap } from '@backend/model/JsonDataWrap'
import type { K8sService } from '../k8s.service'
import { SecretController } from './secret.controller'

describe('SecretController', () => {
  let controller: SecretController
  let k8sService: K8sService

  beforeEach(() => {
    const mockSecretService = {
      List: vi.fn(),
      GetOneByNsName: vi.fn(),
      Delete: vi.fn(),
      Update: vi.fn(),
    }

    const mockK8sService = {
      secretService: mockSecretService,
    } as any

    // Create controller directly with mocked dependencies
    controller = new SecretController(mockK8sService)
    k8sService = mockK8sService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all secrets', async () => {
      const mockSecrets = { items: [] }
      vi.spyOn(k8sService.secretService, 'List').mockResolvedValue(mockSecrets as any)

      const result = await controller.List()

      expect(result).toEqual(mockSecrets)
      expect(k8sService.secretService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing secrets', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.secretService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })

    it('should return secrets from all namespaces', async () => {
      const mockSecrets = {
        items: [
          { metadata: { name: 'secret1', namespace: 'default' } },
          { metadata: { name: 'secret2', namespace: 'kube-system' } },
        ],
      }
      vi.spyOn(k8sService.secretService, 'List').mockResolvedValue(mockSecrets as any)

      const result = await controller.List()

      expect(result).toEqual(mockSecrets)
      expect(k8sService.secretService.List).toHaveBeenCalledWith()
    })

    it('should handle empty secret list', async () => {
      const mockSecrets = { items: [] }
      vi.spyOn(k8sService.secretService, 'List').mockResolvedValue(mockSecrets as any)

      const result = await controller.List()

      expect(result).toEqual(mockSecrets)
      expect(result.items).toHaveLength(0)
    })
  })

  describe('ListByNs', () => {
    it('should return secrets for a specific namespace', async () => {
      const mockSecrets = { items: [] }
      const namespace = 'default'
      vi.spyOn(k8sService.secretService, 'List').mockResolvedValue(mockSecrets as any)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockSecrets)
      expect(k8sService.secretService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      vi.spyOn(k8sService.secretService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockSecrets = { items: [] }
      vi.spyOn(k8sService.secretService, 'List').mockResolvedValue(mockSecrets as any)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockSecrets)
      expect(k8sService.secretService.List).toHaveBeenCalledWith('')
    })

    it('should list secrets in kube-system namespace', async () => {
      const mockSecrets = {
        items: [
          { metadata: { name: 'system-secret', namespace: 'kube-system' } },
        ],
      }
      vi.spyOn(k8sService.secretService, 'List').mockResolvedValue(mockSecrets as any)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockSecrets)
      expect(k8sService.secretService.List).toHaveBeenCalledWith('kube-system')
    })

    it('should handle namespace with special characters', async () => {
      const mockSecrets = { items: [] }
      vi.spyOn(k8sService.secretService, 'List').mockResolvedValue(mockSecrets as any)

      const result = await controller.ListByNs('my-namespace-123')

      expect(result).toEqual(mockSecrets)
      expect(k8sService.secretService.List).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should return only secrets from specified namespace', async () => {
      const mockSecrets = {
        items: [
          { metadata: { name: 'secret1', namespace: 'production' } },
          { metadata: { name: 'secret2', namespace: 'production' } },
        ],
      }
      vi.spyOn(k8sService.secretService, 'List').mockResolvedValue(mockSecrets as any)

      const result = await controller.ListByNs('production')

      expect(result).toEqual(mockSecrets)
      expect(result.items.every((s: any) => s.metadata.namespace === 'production')).toBe(true)
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single secret', async () => {
      const mockSecret = {
        metadata: { name: 'test-secret', namespace: 'default' },
        type: 'Opaque',
        data: { username: 'YWRtaW4=' },
      }
      vi.spyOn(k8sService.secretService, 'GetOneByNsName').mockResolvedValue(mockSecret as any)

      const result = await controller.GetOneByNsName('default', 'test-secret')

      expect(result).toEqual(mockSecret)
      expect(k8sService.secretService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-secret')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.secretService, 'GetOneByNsName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should handle special characters in secret name', async () => {
      const mockSecret = { metadata: { name: 'test-secret-123', namespace: 'default' } }
      vi.spyOn(k8sService.secretService, 'GetOneByNsName').mockResolvedValue(mockSecret as any)

      const result = await controller.GetOneByNsName('default', 'test-secret-123')

      expect(result).toEqual(mockSecret)
      expect(k8sService.secretService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-secret-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockSecret = { metadata: { name: 'test-secret', namespace: 'kube-system' } }
      vi.spyOn(k8sService.secretService, 'GetOneByNsName').mockResolvedValue(mockSecret as any)

      const result = await controller.GetOneByNsName('kube-system', 'test-secret')

      expect(result).toEqual(mockSecret)
      expect(k8sService.secretService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-secret')
    })

    it('should get Opaque secret', async () => {
      const mockSecret = {
        metadata: { name: 'opaque-secret', namespace: 'default' },
        type: 'Opaque',
        data: { key1: 'dmFsdWUx', key2: 'dmFsdWUy' },
      }
      vi.spyOn(k8sService.secretService, 'GetOneByNsName').mockResolvedValue(mockSecret as any)

      const result = await controller.GetOneByNsName('default', 'opaque-secret')

      expect(result).toEqual(mockSecret)
      expect(result.type).toBe('Opaque')
    })

    it('should get TLS secret', async () => {
      const mockSecret = {
        metadata: { name: 'tls-secret', namespace: 'default' },
        type: 'kubernetes.io/tls',
        data: { 'tls.crt': 'Y2VydGlmaWNhdGU=', 'tls.key': 'a2V5' },
      }
      vi.spyOn(k8sService.secretService, 'GetOneByNsName').mockResolvedValue(mockSecret as any)

      const result = await controller.GetOneByNsName('default', 'tls-secret')

      expect(result).toEqual(mockSecret)
      expect(result.type).toBe('kubernetes.io/tls')
    })

    it('should get Docker config secret', async () => {
      const mockSecret = {
        metadata: { name: 'docker-secret', namespace: 'default' },
        type: 'kubernetes.io/dockerconfigjson',
        data: { '.dockerconfigjson': 'eyJhdXRocyI6e319' },
      }
      vi.spyOn(k8sService.secretService, 'GetOneByNsName').mockResolvedValue(mockSecret as any)

      const result = await controller.GetOneByNsName('default', 'docker-secret')

      expect(result).toEqual(mockSecret)
      expect(result.type).toBe('kubernetes.io/dockerconfigjson')
    })

    it('should get ServiceAccount token secret', async () => {
      const mockSecret = {
        metadata: { name: 'sa-token-secret', namespace: 'default' },
        type: 'kubernetes.io/service-account-token',
        data: { 'token': 'dG9rZW4=', 'ca.crt': 'Y2E=' },
      }
      vi.spyOn(k8sService.secretService, 'GetOneByNsName').mockResolvedValue(mockSecret as any)

      const result = await controller.GetOneByNsName('default', 'sa-token-secret')

      expect(result).toEqual(mockSecret)
      expect(result.type).toBe('kubernetes.io/service-account-token')
    })

    it('should handle secret with base64 encoded data', async () => {
      const mockSecret = {
        metadata: { name: 'encoded-secret', namespace: 'default' },
        type: 'Opaque',
        data: { password: Buffer.from('secret123').toString('base64') },
      }
      vi.spyOn(k8sService.secretService, 'GetOneByNsName').mockResolvedValue(mockSecret as any)

      const result = await controller.GetOneByNsName('default', 'encoded-secret')

      expect(result).toEqual(mockSecret)
      expect(result.data.password).toBe(Buffer.from('secret123').toString('base64'))
    })

    it('should handle secret with multiple data keys', async () => {
      const mockSecret = {
        metadata: { name: 'multi-key-secret', namespace: 'default' },
        type: 'Opaque',
        data: {
          username: 'dXNlcm5hbWU=',
          password: 'cGFzc3dvcmQ=',
          apiKey: 'YXBpS2V5',
        },
      }
      vi.spyOn(k8sService.secretService, 'GetOneByNsName').mockResolvedValue(mockSecret as any)

      const result = await controller.GetOneByNsName('default', 'multi-key-secret')

      expect(result).toEqual(mockSecret)
      expect(Object.keys(result.data)).toHaveLength(3)
    })
  })

  describe('Update', () => {
    it('should update a secret key', async () => {
      const data: JsonDataWrap<string> = { data: 'bmV3VmFsdWU=' }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.secretService, 'Update').mockResolvedValue(mockResponse as any)

      const result = await controller.Update(data, 'default', 'test-secret', 'password')

      expect(result).toEqual(mockResponse)
      expect(k8sService.secretService.Update).toHaveBeenCalledWith('default', 'test-secret', 'password', data)
    })

    it('should handle update errors', async () => {
      const data: JsonDataWrap<string> = { data: 'bmV3VmFsdWU=' }
      const error = new Error('Update failed')
      vi.spyOn(k8sService.secretService, 'Update').mockRejectedValue(error)

      await expect(controller.Update(data, 'default', 'test-secret', 'password')).rejects.toThrow('Update failed')
    })

    it('should update with base64 encoded value', async () => {
      const newValue = Buffer.from('newPassword123').toString('base64')
      const data: JsonDataWrap<string> = { data: newValue }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.secretService, 'Update').mockResolvedValue(mockResponse as any)

      const result = await controller.Update(data, 'default', 'my-secret', 'password')

      expect(result).toEqual(mockResponse)
      expect(k8sService.secretService.Update).toHaveBeenCalledWith('default', 'my-secret', 'password', data)
    })

    it('should update secret in different namespace', async () => {
      const data: JsonDataWrap<string> = { data: 'dXBkYXRlZFZhbHVl' }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.secretService, 'Update').mockResolvedValue(mockResponse as any)

      const result = await controller.Update(data, 'kube-system', 'system-secret', 'apiKey')

      expect(result).toEqual(mockResponse)
      expect(k8sService.secretService.Update).toHaveBeenCalledWith('kube-system', 'system-secret', 'apiKey', data)
    })

    it('should update multiple times', async () => {
      const data1: JsonDataWrap<string> = { data: 'dmFsdWUx' }
      const data2: JsonDataWrap<string> = { data: 'dmFsdWUy' }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.secretService, 'Update').mockResolvedValue(mockResponse as any)

      await controller.Update(data1, 'default', 'test-secret', 'key1')
      await controller.Update(data2, 'default', 'test-secret', 'key2')

      expect(k8sService.secretService.Update).toHaveBeenCalledTimes(2)
      expect(k8sService.secretService.Update).toHaveBeenNthCalledWith(1, 'default', 'test-secret', 'key1', data1)
      expect(k8sService.secretService.Update).toHaveBeenNthCalledWith(2, 'default', 'test-secret', 'key2', data2)
    })

    it('should handle not found secret during update', async () => {
      const data: JsonDataWrap<string> = { data: 'dmFsdWU=' }
      vi.spyOn(k8sService.secretService, 'Update').mockRejectedValue(new Error('Secret not found'))

      await expect(controller.Update(data, 'default', 'nonexistent', 'key')).rejects.toThrow('Secret not found')
    })

    it('should update TLS certificate data', async () => {
      const certData = Buffer.from('-----BEGIN CERTIFICATE-----').toString('base64')
      const data: JsonDataWrap<string> = { data: certData }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.secretService, 'Update').mockResolvedValue(mockResponse as any)

      const result = await controller.Update(data, 'default', 'tls-secret', 'tls.crt')

      expect(result).toEqual(mockResponse)
      expect(k8sService.secretService.Update).toHaveBeenCalledWith('default', 'tls-secret', 'tls.crt', data)
    })

    it('should update docker config json', async () => {
      const dockerConfig = Buffer.from('{"auths":{}}').toString('base64')
      const data: JsonDataWrap<string> = { data: dockerConfig }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.secretService, 'Update').mockResolvedValue(mockResponse as any)

      const result = await controller.Update(data, 'default', 'docker-secret', '.dockerconfigjson')

      expect(result).toEqual(mockResponse)
      expect(k8sService.secretService.Update).toHaveBeenCalledWith('default', 'docker-secret', '.dockerconfigjson', data)
    })

    it('should handle permission errors during update', async () => {
      const data: JsonDataWrap<string> = { data: 'dmFsdWU=' }
      vi.spyOn(k8sService.secretService, 'Update').mockRejectedValue(new Error('Forbidden'))

      await expect(controller.Update(data, 'default', 'test-secret', 'key')).rejects.toThrow('Forbidden')
    })

    it('should update with empty string value', async () => {
      const data: JsonDataWrap<string> = { data: '' }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.secretService, 'Update').mockResolvedValue(mockResponse as any)

      const result = await controller.Update(data, 'default', 'test-secret', 'emptyKey')

      expect(result).toEqual(mockResponse)
      expect(k8sService.secretService.Update).toHaveBeenCalledWith('default', 'test-secret', 'emptyKey', data)
    })
  })

  describe('Delete', () => {
    it('should delete a single secret', async () => {
      vi.spyOn(k8sService.secretService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-secret']
      await controller.Delete(nsn)

      expect(k8sService.secretService.Delete).toHaveBeenCalledWith('default', 'test-secret')
    })

    it('should delete multiple secrets', async () => {
      vi.spyOn(k8sService.secretService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/secret1', 'kube-system/secret2', 'default/secret3']
      await controller.Delete(nsn)

      expect(k8sService.secretService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.secretService.Delete).toHaveBeenCalledWith('default', 'secret1')
      expect(k8sService.secretService.Delete).toHaveBeenCalledWith('kube-system', 'secret2')
      expect(k8sService.secretService.Delete).toHaveBeenCalledWith('default', 'secret3')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.secretService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.secretService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.secretService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/secret1', 'default/secret2', 'default/secret3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.secretService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle secrets with slashes in namespace/name format', async () => {
      vi.spyOn(k8sService.secretService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-secret-name']
      await controller.Delete(nsn)

      expect(k8sService.secretService.Delete).toHaveBeenCalledWith('my-namespace', 'my-secret-name')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.secretService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-secret']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should delete secrets from multiple namespaces', async () => {
      vi.spyOn(k8sService.secretService, 'Delete').mockResolvedValue(undefined)

      const nsn = [
        'default/secret1',
        'kube-system/secret2',
        'production/secret3',
        'staging/secret4',
      ]
      await controller.Delete(nsn)

      expect(k8sService.secretService.Delete).toHaveBeenCalledTimes(4)
      expect(k8sService.secretService.Delete).toHaveBeenCalledWith('default', 'secret1')
      expect(k8sService.secretService.Delete).toHaveBeenCalledWith('kube-system', 'secret2')
      expect(k8sService.secretService.Delete).toHaveBeenCalledWith('production', 'secret3')
      expect(k8sService.secretService.Delete).toHaveBeenCalledWith('staging', 'secret4')
    })

    it('should delete TLS secrets', async () => {
      vi.spyOn(k8sService.secretService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/tls-secret']
      await controller.Delete(nsn)

      expect(k8sService.secretService.Delete).toHaveBeenCalledWith('default', 'tls-secret')
    })

    it('should delete Docker config secrets', async () => {
      vi.spyOn(k8sService.secretService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/docker-registry-secret']
      await controller.Delete(nsn)

      expect(k8sService.secretService.Delete).toHaveBeenCalledWith('default', 'docker-registry-secret')
    })

    it('should delete ServiceAccount token secrets', async () => {
      vi.spyOn(k8sService.secretService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/sa-token-secret']
      await controller.Delete(nsn)

      expect(k8sService.secretService.Delete).toHaveBeenCalledWith('default', 'sa-token-secret')
    })

    it('should handle deletion of secrets with special names', async () => {
      vi.spyOn(k8sService.secretService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/my-secret-123-test']
      await controller.Delete(nsn)

      expect(k8sService.secretService.Delete).toHaveBeenCalledWith('default', 'my-secret-123-test')
    })
  })
})
