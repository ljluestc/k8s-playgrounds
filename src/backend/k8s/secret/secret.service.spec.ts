import { Buffer } from 'node:buffer'
import { _vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { JsonDataWrap } from '@backend/model/JsonDataWrap'
import { ClientService } from '../client/client.service'
import { createMockClientService, createSecret } from '../../../../test/utils/k8s-mocks'
import { SecretService } from './secret.service'

describe('SecretService', () => {
  let service: SecretService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getCoreV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SecretService,
          useFactory: (clientService: ClientService) => {
            return new SecretService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<SecretService>(SecretService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all secrets across all namespaces when no namespace specified', async () => {
      const mockSecrets = [createSecret('secret-1', 'default'), createSecret('secret-2', 'kube-system')]
      mockK8sApi.listSecretForAllNamespaces.mockResolvedValue({
        body: { items: mockSecrets },
      })

      const result = await service.List()

      expect(result).toEqual(mockSecrets)
      expect(mockK8sApi.listSecretForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedSecret).not.toHaveBeenCalled()
    })

    it('should list all secrets when namespace is "null" string', async () => {
      const mockSecrets = [createSecret('secret-1')]
      mockK8sApi.listSecretForAllNamespaces.mockResolvedValue({
        body: { items: mockSecrets },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockSecrets)
      expect(mockK8sApi.listSecretForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedSecret).not.toHaveBeenCalled()
    })

    it('should list secrets in a specific namespace', async () => {
      const mockSecrets = [createSecret('secret-1', 'default')]
      mockK8sApi.listNamespacedSecret.mockResolvedValue({
        body: { items: mockSecrets },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockSecrets)
      expect(mockK8sApi.listNamespacedSecret).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listSecretForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all secrets', async () => {
      const error = new Error('API Error')
      mockK8sApi.listSecretForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced secrets', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedSecret.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no secrets exist', async () => {
      mockK8sApi.listSecretForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list secrets in kube-system namespace', async () => {
      const mockSecrets = [createSecret('kube-dns-token', 'kube-system')]
      mockK8sApi.listNamespacedSecret.mockResolvedValue({
        body: { items: mockSecrets },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockSecrets)
      expect(mockK8sApi.listNamespacedSecret).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockSecrets = [createSecret('my-secret', 'my-namespace-123')]
      mockK8sApi.listNamespacedSecret.mockResolvedValue({
        body: { items: mockSecrets },
      })

      const result = await service.List('my-namespace-123')

      expect(result).toEqual(mockSecrets)
      expect(mockK8sApi.listNamespacedSecret).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should list Opaque secrets', async () => {
      const mockSecret = createSecret('opaque-secret', 'default')
      mockSecret.type = 'Opaque'
      mockK8sApi.listNamespacedSecret.mockResolvedValue({
        body: { items: [mockSecret] },
      })

      const result = await service.List('default')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('Opaque')
    })

    it('should list TLS secrets', async () => {
      const mockSecret = createSecret('tls-secret', 'default')
      mockSecret.type = 'kubernetes.io/tls'
      mockSecret.data = {
        'tls.crt': Buffer.from('certificate').toString('base64'),
        'tls.key': Buffer.from('key').toString('base64'),
      }
      mockK8sApi.listNamespacedSecret.mockResolvedValue({
        body: { items: [mockSecret] },
      })

      const result = await service.List('default')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('kubernetes.io/tls')
      expect(result[0].data).toHaveProperty('tls.crt')
      expect(result[0].data).toHaveProperty('tls.key')
    })

    it('should list Docker config secrets', async () => {
      const mockSecret = createSecret('docker-secret', 'default')
      mockSecret.type = 'kubernetes.io/dockerconfigjson'
      mockSecret.data = {
        '.dockerconfigjson': Buffer.from('{"auths":{}}').toString('base64'),
      }
      mockK8sApi.listNamespacedSecret.mockResolvedValue({
        body: { items: [mockSecret] },
      })

      const result = await service.List('default')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('kubernetes.io/dockerconfigjson')
      expect(result[0].data).toHaveProperty('.dockerconfigjson')
    })

    it('should list ServiceAccount token secrets', async () => {
      const mockSecret = createSecret('sa-token', 'default')
      mockSecret.type = 'kubernetes.io/service-account-token'
      mockSecret.data = {
        'token': Buffer.from('token123').toString('base64'),
        'ca.crt': Buffer.from('ca-cert').toString('base64'),
      }
      mockK8sApi.listNamespacedSecret.mockResolvedValue({
        body: { items: [mockSecret] },
      })

      const result = await service.List('default')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('kubernetes.io/service-account-token')
      expect(result[0].data).toHaveProperty('token')
      expect(result[0].data).toHaveProperty('ca.crt')
    })

    it('should list secrets with multiple data keys', async () => {
      const mockSecret = createSecret('multi-key-secret', 'default')
      mockSecret.data = {
        username: Buffer.from('admin').toString('base64'),
        password: Buffer.from('password123').toString('base64'),
        apiKey: Buffer.from('api-key-value').toString('base64'),
        database: Buffer.from('mongodb').toString('base64'),
      }
      mockK8sApi.listNamespacedSecret.mockResolvedValue({
        body: { items: [mockSecret] },
      })

      const result = await service.List('default')

      expect(result).toHaveLength(1)
      expect(Object.keys(result[0].data!)).toHaveLength(4)
    })

    it('should list secrets from multiple namespaces', async () => {
      const mockSecrets = [
        createSecret('secret-1', 'default'),
        createSecret('secret-2', 'kube-system'),
        createSecret('secret-3', 'production'),
        createSecret('secret-4', 'staging'),
      ]
      mockK8sApi.listSecretForAllNamespaces.mockResolvedValue({
        body: { items: mockSecrets },
      })

      const result = await service.List()

      expect(result).toHaveLength(4)
      expect(result.map(s => s.metadata?.namespace)).toContain('default')
      expect(result.map(s => s.metadata?.namespace)).toContain('kube-system')
      expect(result.map(s => s.metadata?.namespace)).toContain('production')
      expect(result.map(s => s.metadata?.namespace)).toContain('staging')
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single secret by namespace and name', async () => {
      const mockSecret = createSecret('test-secret', 'default')
      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      const result = await service.GetOneByNsName('default', 'test-secret')

      expect(result).toEqual(mockSecret)
      expect(mockK8sApi.readNamespacedSecret).toHaveBeenCalledWith('test-secret', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('Secret not found')
      mockK8sApi.readNamespacedSecret.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Secret not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedSecret.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-secret')).rejects.toThrow('Namespace does not exist')
    })

    it('should get Opaque secret', async () => {
      const mockSecret = createSecret('opaque-secret', 'default')
      mockSecret.type = 'Opaque'
      mockSecret.data = {
        username: Buffer.from('admin').toString('base64'),
        password: Buffer.from('secret123').toString('base64'),
      }
      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      const result = await service.GetOneByNsName('default', 'opaque-secret')

      expect(result).toEqual(mockSecret)
      expect(result.type).toBe('Opaque')
      expect(result.data).toHaveProperty('username')
      expect(result.data).toHaveProperty('password')
    })

    it('should get TLS secret', async () => {
      const mockSecret = createSecret('tls-secret', 'default')
      mockSecret.type = 'kubernetes.io/tls'
      mockSecret.data = {
        'tls.crt': Buffer.from('-----BEGIN CERTIFICATE-----').toString('base64'),
        'tls.key': Buffer.from('-----BEGIN PRIVATE KEY-----').toString('base64'),
      }
      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      const result = await service.GetOneByNsName('default', 'tls-secret')

      expect(result).toEqual(mockSecret)
      expect(result.type).toBe('kubernetes.io/tls')
      expect(result.data).toHaveProperty('tls.crt')
      expect(result.data).toHaveProperty('tls.key')
    })

    it('should get Docker config secret', async () => {
      const dockerConfig = { auths: { 'https://index.docker.io/v1/': { auth: 'dXNlcjpwYXNz' } } }
      const mockSecret = createSecret('docker-secret', 'default')
      mockSecret.type = 'kubernetes.io/dockerconfigjson'
      mockSecret.data = {
        '.dockerconfigjson': Buffer.from(JSON.stringify(dockerConfig)).toString('base64'),
      }
      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      const result = await service.GetOneByNsName('default', 'docker-secret')

      expect(result).toEqual(mockSecret)
      expect(result.type).toBe('kubernetes.io/dockerconfigjson')
      expect(result.data).toHaveProperty('.dockerconfigjson')
    })

    it('should get ServiceAccount token secret', async () => {
      const mockSecret = createSecret('sa-token-secret', 'default')
      mockSecret.type = 'kubernetes.io/service-account-token'
      mockSecret.data = {
        'token': Buffer.from('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9').toString('base64'),
        'ca.crt': Buffer.from('-----BEGIN CERTIFICATE-----').toString('base64'),
        'namespace': Buffer.from('default').toString('base64'),
      }
      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      const result = await service.GetOneByNsName('default', 'sa-token-secret')

      expect(result).toEqual(mockSecret)
      expect(result.type).toBe('kubernetes.io/service-account-token')
      expect(result.data).toHaveProperty('token')
      expect(result.data).toHaveProperty('ca.crt')
      expect(result.data).toHaveProperty('namespace')
    })

    it('should get basic-auth secret', async () => {
      const mockSecret = createSecret('basic-auth-secret', 'default')
      mockSecret.type = 'kubernetes.io/basic-auth'
      mockSecret.data = {
        username: Buffer.from('admin').toString('base64'),
        password: Buffer.from('password123').toString('base64'),
      }
      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      const result = await service.GetOneByNsName('default', 'basic-auth-secret')

      expect(result).toEqual(mockSecret)
      expect(result.type).toBe('kubernetes.io/basic-auth')
      expect(result.data).toHaveProperty('username')
      expect(result.data).toHaveProperty('password')
    })

    it('should get SSH auth secret', async () => {
      const mockSecret = createSecret('ssh-auth-secret', 'default')
      mockSecret.type = 'kubernetes.io/ssh-auth'
      mockSecret.data = {
        'ssh-privatekey': Buffer.from('-----BEGIN RSA PRIVATE KEY-----').toString('base64'),
      }
      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      const result = await service.GetOneByNsName('default', 'ssh-auth-secret')

      expect(result).toEqual(mockSecret)
      expect(result.type).toBe('kubernetes.io/ssh-auth')
      expect(result.data).toHaveProperty('ssh-privatekey')
    })

    it('should handle secret names with hyphens and numbers', async () => {
      const mockSecret = createSecret('my-secret-123', 'default')
      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      const result = await service.GetOneByNsName('default', 'my-secret-123')

      expect(result).toEqual(mockSecret)
      expect(mockK8sApi.readNamespacedSecret).toHaveBeenCalledWith('my-secret-123', 'default')
    })

    it('should handle secret with empty data', async () => {
      const mockSecret = createSecret('empty-secret', 'default')
      mockSecret.data = {}
      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      const result = await service.GetOneByNsName('default', 'empty-secret')

      expect(result).toEqual(mockSecret)
      expect(Object.keys(result.data!)).toHaveLength(0)
    })

    it('should verify base64 encoding in returned data', async () => {
      const plainTextValue = 'mySecretValue123'
      const base64Value = Buffer.from(plainTextValue).toString('base64')
      const mockSecret = createSecret('encoded-secret', 'default')
      mockSecret.data = { secretKey: base64Value }
      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      const result = await service.GetOneByNsName('default', 'encoded-secret')

      expect(result.data!.secretKey).toBe(base64Value)
      expect(Buffer.from(result.data!.secretKey!, 'base64').toString()).toBe(plainTextValue)
    })
  })

  describe('Delete', () => {
    it('should delete a secret', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedSecret.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('default', 'test-secret')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedSecret).toHaveBeenCalledWith('test-secret', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedSecret.mockRejectedValue(error)

      await expect(service.Delete('default', 'test-secret')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent secret', async () => {
      const error = new Error('Secret not found')
      mockK8sApi.deleteNamespacedSecret.mockRejectedValue(error)

      await expect(service.Delete('default', 'nonexistent')).rejects.toThrow('Secret not found')
    })

    it('should delete secret from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedSecret.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('kube-system', 'my-secret')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedSecret).toHaveBeenCalledWith('my-secret', 'kube-system')
    })

    it('should handle secret with finalizers', async () => {
      const mockResponse = { status: 'Success', metadata: { finalizers: ['kubernetes'] } }
      mockK8sApi.deleteNamespacedSecret.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('default', 'secret-with-finalizer')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNamespacedSecret.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('default', 'graceful-delete')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete secrets')
      mockK8sApi.deleteNamespacedSecret.mockRejectedValue(error)

      await expect(service.Delete('default', 'test-secret')).rejects.toThrow('Forbidden')
    })

    it('should delete TLS secret', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedSecret.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('default', 'tls-secret')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedSecret).toHaveBeenCalledWith('tls-secret', 'default')
    })

    it('should delete Docker config secret', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedSecret.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('default', 'docker-registry')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedSecret).toHaveBeenCalledWith('docker-registry', 'default')
    })

    it('should delete ServiceAccount token secret', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedSecret.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('default', 'default-token-abc123')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedSecret).toHaveBeenCalledWith('default-token-abc123', 'default')
    })
  })

  describe('Update', () => {
    it('should update a secret key', async () => {
      const mockSecret = createSecret('test-secret', 'default')
      mockSecret.data = {
        username: Buffer.from('admin').toString('base64'),
        password: Buffer.from('oldPassword').toString('base64'),
      }

      const newPasswordBase64 = Buffer.from('newPassword123').toString('base64')
      const data: JsonDataWrap<string> = { data: newPasswordBase64 }

      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      const updatedSecret = { ...mockSecret }
      updatedSecret.data!.password = newPasswordBase64

      mockK8sApi.replaceNamespacedSecret.mockResolvedValue({
        body: updatedSecret,
      })

      const _result = await service.Update('default', 'test-secret', 'password', data)

      expect(mockK8sApi.readNamespacedSecret).toHaveBeenCalledWith('test-secret', 'default')
      expect(mockK8sApi.replaceNamespacedSecret).toHaveBeenCalledWith(
        'test-secret',
        'default',
        expect.objectContaining({
          data: expect.objectContaining({
            password: newPasswordBase64,
          }),
        }),
      )
    })

    it('should handle update errors', async () => {
      const data: JsonDataWrap<string> = { data: 'bmV3VmFsdWU=' }
      const error = new Error('Update failed')
      mockK8sApi.readNamespacedSecret.mockRejectedValue(error)

      await expect(service.Update('default', 'test-secret', 'key', data)).rejects.toThrow('Update failed')
    })

    it('should handle not found secret during update', async () => {
      const data: JsonDataWrap<string> = { data: 'dmFsdWU=' }
      mockK8sApi.readNamespacedSecret.mockRejectedValue(new Error('Secret not found'))

      await expect(service.Update('default', 'nonexistent', 'key', data)).rejects.toThrow('Secret not found')
    })

    it('should update existing key in secret data', async () => {
      const mockSecret = createSecret('test-secret', 'default')
      mockSecret.data = {
        existingKey: 'b2xkVmFsdWU=',
      }

      const newValue = 'bmV3VmFsdWU='
      const data: JsonDataWrap<string> = { data: newValue }

      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      mockK8sApi.replaceNamespacedSecret.mockResolvedValue({
        body: { ...mockSecret, data: { existingKey: newValue } },
      })

      await service.Update('default', 'test-secret', 'existingKey', data)

      expect(mockK8sApi.replaceNamespacedSecret).toHaveBeenCalledWith(
        'test-secret',
        'default',
        expect.objectContaining({
          data: { existingKey: newValue },
        }),
      )
    })

    it('should add new key to secret data', async () => {
      const mockSecret = createSecret('test-secret', 'default')
      mockSecret.data = {
        existingKey: 'ZXhpc3RpbmdWYWx1ZQ==',
      }

      const newValue = 'bmV3VmFsdWU='
      const data: JsonDataWrap<string> = { data: newValue }

      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      mockK8sApi.replaceNamespacedSecret.mockResolvedValue({
        body: { ...mockSecret, data: { existingKey: 'ZXhpc3RpbmdWYWx1ZQ==', newKey: newValue } },
      })

      await service.Update('default', 'test-secret', 'newKey', data)

      expect(mockK8sApi.replaceNamespacedSecret).toHaveBeenCalledWith(
        'test-secret',
        'default',
        expect.objectContaining({
          data: expect.objectContaining({
            existingKey: 'ZXhpc3RpbmdWYWx1ZQ==',
            newKey: newValue,
          }),
        }),
      )
    })

    it('should update TLS certificate', async () => {
      const mockSecret = createSecret('tls-secret', 'default')
      mockSecret.type = 'kubernetes.io/tls'
      mockSecret.data = {
        'tls.crt': Buffer.from('old-cert').toString('base64'),
        'tls.key': Buffer.from('old-key').toString('base64'),
      }

      const newCert = Buffer.from('new-cert').toString('base64')
      const data: JsonDataWrap<string> = { data: newCert }

      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      mockK8sApi.replaceNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      await service.Update('default', 'tls-secret', 'tls.crt', data)

      expect(mockK8sApi.replaceNamespacedSecret).toHaveBeenCalledWith(
        'tls-secret',
        'default',
        expect.objectContaining({
          data: expect.objectContaining({
            'tls.crt': newCert,
          }),
        }),
      )
    })

    it('should update Docker config json', async () => {
      const mockSecret = createSecret('docker-secret', 'default')
      mockSecret.type = 'kubernetes.io/dockerconfigjson'
      mockSecret.data = {
        '.dockerconfigjson': Buffer.from('{"auths":{}}').toString('base64'),
      }

      const newConfig = Buffer.from('{"auths":{"registry.io":{"auth":"xyz"}}}').toString('base64')
      const data: JsonDataWrap<string> = { data: newConfig }

      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      mockK8sApi.replaceNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      await service.Update('default', 'docker-secret', '.dockerconfigjson', data)

      expect(mockK8sApi.replaceNamespacedSecret).toHaveBeenCalledWith(
        'docker-secret',
        'default',
        expect.objectContaining({
          data: expect.objectContaining({
            '.dockerconfigjson': newConfig,
          }),
        }),
      )
    })

    it('should update secret in different namespace', async () => {
      const mockSecret = createSecret('secret', 'production')
      mockSecret.data = { apiKey: 'b2xkS2V5' }

      const newKey = 'bmV3S2V5'
      const data: JsonDataWrap<string> = { data: newKey }

      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      mockK8sApi.replaceNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      await service.Update('production', 'secret', 'apiKey', data)

      expect(mockK8sApi.readNamespacedSecret).toHaveBeenCalledWith('secret', 'production')
      expect(mockK8sApi.replaceNamespacedSecret).toHaveBeenCalledWith('secret', 'production', expect.any(Object))
    })

    it('should handle permission errors during update', async () => {
      const mockSecret = createSecret('test-secret', 'default')
      const data: JsonDataWrap<string> = { data: 'dmFsdWU=' }

      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      mockK8sApi.replaceNamespacedSecret.mockRejectedValue(new Error('Forbidden'))

      await expect(service.Update('default', 'test-secret', 'key', data)).rejects.toThrow('Forbidden')
    })

    it('should update with empty string value', async () => {
      const mockSecret = createSecret('test-secret', 'default')
      mockSecret.data = { key: 'dmFsdWU=' }

      const data: JsonDataWrap<string> = { data: '' }

      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      mockK8sApi.replaceNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      await service.Update('default', 'test-secret', 'key', data)

      expect(mockK8sApi.replaceNamespacedSecret).toHaveBeenCalledWith(
        'test-secret',
        'default',
        expect.objectContaining({
          data: expect.objectContaining({
            key: '',
          }),
        }),
      )
    })

    it('should preserve other keys when updating one key', async () => {
      const mockSecret = createSecret('multi-key-secret', 'default')
      mockSecret.data = {
        username: Buffer.from('admin').toString('base64'),
        password: Buffer.from('oldPass').toString('base64'),
        apiKey: Buffer.from('key123').toString('base64'),
      }

      const newPassword = Buffer.from('newPass').toString('base64')
      const data: JsonDataWrap<string> = { data: newPassword }

      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      mockK8sApi.replaceNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      await service.Update('default', 'multi-key-secret', 'password', data)

      expect(mockK8sApi.replaceNamespacedSecret).toHaveBeenCalledWith(
        'multi-key-secret',
        'default',
        expect.objectContaining({
          data: expect.objectContaining({
            username: Buffer.from('admin').toString('base64'),
            password: newPassword,
            apiKey: Buffer.from('key123').toString('base64'),
          }),
        }),
      )
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s API', async () => {
      const mockSecrets = [createSecret('test-secret')]
      mockK8sApi.listSecretForAllNamespaces.mockResolvedValue({
        body: { items: mockSecrets },
      })

      await service.List()

      expect(clientService.getCoreV1Api).toHaveBeenCalled()
    })

    it('should call getCoreV1Api for every operation', async () => {
      const mockSecret = createSecret('test', 'default')
      mockSecret.data = { key: 'dmFsdWU=' }

      mockK8sApi.listSecretForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedSecret.mockResolvedValue({ body: mockSecret })
      mockK8sApi.deleteNamespacedSecret.mockResolvedValue({ body: { status: 'Success' } })
      mockK8sApi.replaceNamespacedSecret.mockResolvedValue({ body: mockSecret })

      const data: JsonDataWrap<string> = { data: 'bmV3VmFsdWU=' }

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('default', 'test')
      await service.Update('default', 'test', 'key', data)

      expect(clientService.getCoreV1Api).toHaveBeenCalledTimes(6) // 4 operations + 1 read inside Update + 1 setup call
    })

    it('should handle API client errors gracefully', async () => {
      clientService.getCoreV1Api.mockImplementation(() => {
        throw new Error('API client initialization failed')
      })

      await expect(service.List()).rejects.toThrow('API client initialization failed')
    })
  })

  describe('Base64 Encoding Edge Cases', () => {
    it('should handle binary data in base64', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE])
      const mockSecret = createSecret('binary-secret', 'default')
      mockSecret.data = {
        binaryKey: binaryData.toString('base64'),
      }

      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      const result = await service.GetOneByNsName('default', 'binary-secret')

      expect(result.data!.binaryKey).toBe(binaryData.toString('base64'))
      expect(Buffer.from(result.data!.binaryKey!, 'base64')).toEqual(binaryData)
    })

    it('should handle UTF-8 characters in base64', async () => {
      const utf8Text = 'Hello 世界 🌍'
      const mockSecret = createSecret('utf8-secret', 'default')
      mockSecret.data = {
        message: Buffer.from(utf8Text, 'utf8').toString('base64'),
      }

      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      const result = await service.GetOneByNsName('default', 'utf8-secret')

      expect(Buffer.from(result.data!.message!, 'base64').toString('utf8')).toBe(utf8Text)
    })

    it('should handle large base64 encoded data', async () => {
      const largeData = 'A'.repeat(10000)
      const mockSecret = createSecret('large-secret', 'default')
      mockSecret.data = {
        largeKey: Buffer.from(largeData).toString('base64'),
      }

      mockK8sApi.readNamespacedSecret.mockResolvedValue({
        body: mockSecret,
      })

      const result = await service.GetOneByNsName('default', 'large-secret')

      expect(Buffer.from(result.data!.largeKey!, 'base64').toString()).toBe(largeData)
    })
  })

  describe('Multiple Namespace Operations', () => {
    it('should handle operations across multiple namespaces', async () => {
      const namespaces = ['default', 'kube-system', 'production', 'staging']

      for (const ns of namespaces) {
        const mockSecrets = [createSecret(`secret-in-${ns}`, ns)]
        mockK8sApi.listNamespacedSecret.mockResolvedValue({
          body: { items: mockSecrets },
        })

        const result = await service.List(ns)
        expect(result).toHaveLength(1)
        expect(result[0].metadata?.namespace).toBe(ns)
      }

      expect(mockK8sApi.listNamespacedSecret).toHaveBeenCalledTimes(4)
    })

    it('should get secrets from different namespaces', async () => {
      const secret1 = createSecret('secret1', 'default')
      const secret2 = createSecret('secret2', 'production')

      mockK8sApi.readNamespacedSecret
        .mockResolvedValueOnce({ body: secret1 })
        .mockResolvedValueOnce({ body: secret2 })

      const result1 = await service.GetOneByNsName('default', 'secret1')
      const result2 = await service.GetOneByNsName('production', 'secret2')

      expect(result1.metadata?.namespace).toBe('default')
      expect(result2.metadata?.namespace).toBe('production')
    })
  })
})
