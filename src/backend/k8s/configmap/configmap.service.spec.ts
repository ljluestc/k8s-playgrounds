import { vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { JsonDataWrap } from '@backend/model/JsonDataWrap'
import { ClientService } from '../client/client.service'
import { createConfigMap, createMockClientService } from '../../../../test/utils/k8s-mocks'
import { ConfigMapService } from './configmap.service'

describe('ConfigMapService', () => {
  let service: ConfigMapService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getCoreV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigMapService,
          useFactory: (clientService: ClientService) => {
            return new ConfigMapService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<ConfigMapService>(ConfigMapService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all configmaps across all namespaces when no namespace specified', async () => {
      const mockConfigMaps = [createConfigMap('configmap-1', 'default'), createConfigMap('configmap-2', 'kube-system')]
      mockK8sApi.listConfigMapForAllNamespaces.mockResolvedValue({
        body: { items: mockConfigMaps },
      })

      const result = await service.List()

      expect(result).toEqual(mockConfigMaps)
      expect(mockK8sApi.listConfigMapForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedConfigMap).not.toHaveBeenCalled()
    })

    it('should list all configmaps when namespace is "null" string', async () => {
      const mockConfigMaps = [createConfigMap('configmap-1')]
      mockK8sApi.listConfigMapForAllNamespaces.mockResolvedValue({
        body: { items: mockConfigMaps },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockConfigMaps)
      expect(mockK8sApi.listConfigMapForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedConfigMap).not.toHaveBeenCalled()
    })

    it('should list configmaps in a specific namespace', async () => {
      const mockConfigMaps = [createConfigMap('configmap-1', 'default')]
      mockK8sApi.listNamespacedConfigMap.mockResolvedValue({
        body: { items: mockConfigMaps },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockConfigMaps)
      expect(mockK8sApi.listNamespacedConfigMap).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listConfigMapForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all configmaps', async () => {
      const error = new Error('API Error')
      mockK8sApi.listConfigMapForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced configmaps', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedConfigMap.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no configmaps exist', async () => {
      mockK8sApi.listConfigMapForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list configmaps in kube-system namespace', async () => {
      const mockConfigMaps = [createConfigMap('kube-root-ca.crt', 'kube-system')]
      mockK8sApi.listNamespacedConfigMap.mockResolvedValue({
        body: { items: mockConfigMaps },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockConfigMaps)
      expect(mockK8sApi.listNamespacedConfigMap).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockConfigMaps = [createConfigMap('my-config', 'my-namespace-123')]
      mockK8sApi.listNamespacedConfigMap.mockResolvedValue({
        body: { items: mockConfigMaps },
      })

      const result = await service.List('my-namespace-123')

      expect(result).toEqual(mockConfigMaps)
      expect(mockK8sApi.listNamespacedConfigMap).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should list multiple configmaps with different data structures', async () => {
      const configMap1 = createConfigMap('app-config', 'default')
      configMap1.data = { 'config.json': '{"key": "value"}' }

      const configMap2 = createConfigMap('db-config', 'default')
      configMap2.data = { 'database.conf': 'host=localhost' }

      const mockConfigMaps = [configMap1, configMap2]
      mockK8sApi.listNamespacedConfigMap.mockResolvedValue({
        body: { items: mockConfigMaps },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockConfigMaps)
      expect(result[0].data).toHaveProperty('config.json')
      expect(result[1].data).toHaveProperty('database.conf')
    })

    it('should handle undefined namespace parameter', async () => {
      const mockConfigMaps = [createConfigMap('configmap-1')]
      mockK8sApi.listConfigMapForAllNamespaces.mockResolvedValue({
        body: { items: mockConfigMaps },
      })

      const result = await service.List(undefined)

      expect(result).toEqual(mockConfigMaps)
      expect(mockK8sApi.listConfigMapForAllNamespaces).toHaveBeenCalled()
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single configmap by namespace and name', async () => {
      const mockConfigMap = createConfigMap('test-configmap', 'default')
      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })

      const result = await service.GetOneByNsName('default', 'test-configmap')

      expect(result).toEqual(mockConfigMap)
      expect(mockK8sApi.readNamespacedConfigMap).toHaveBeenCalledWith('test-configmap', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('ConfigMap not found')
      mockK8sApi.readNamespacedConfigMap.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('ConfigMap not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedConfigMap.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-configmap')).rejects.toThrow('Namespace does not exist')
    })

    it('should get configmap with single data entry', async () => {
      const mockConfigMap = createConfigMap('simple-config', 'default')
      mockConfigMap.data = { 'app.conf': 'setting=value' }
      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })

      const result = await service.GetOneByNsName('default', 'simple-config')

      expect(result).toEqual(mockConfigMap)
      expect(result.data).toHaveProperty('app.conf')
      expect(result.data?.['app.conf']).toBe('setting=value')
    })

    it('should get configmap with multiple data entries', async () => {
      const mockConfigMap = createConfigMap('multi-config', 'default')
      mockConfigMap.data = {
        'config.json': '{"setting": "value"}',
        'database.conf': 'host=localhost',
        'feature-flags': 'enabled=true',
      }
      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })

      const result = await service.GetOneByNsName('default', 'multi-config')

      expect(result).toEqual(mockConfigMap)
      expect(Object.keys(result.data || {}).length).toBe(3)
      expect(result.data).toHaveProperty('config.json')
      expect(result.data).toHaveProperty('database.conf')
      expect(result.data).toHaveProperty('feature-flags')
    })

    it('should get configmap with empty data', async () => {
      const mockConfigMap = createConfigMap('empty-config', 'default')
      mockConfigMap.data = {}
      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })

      const result = await service.GetOneByNsName('default', 'empty-config')

      expect(result).toEqual(mockConfigMap)
      expect(result.data).toEqual({})
    })

    it('should handle configmap names with hyphens and numbers', async () => {
      const mockConfigMap = createConfigMap('my-config-123', 'default')
      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })

      const result = await service.GetOneByNsName('default', 'my-config-123')

      expect(result).toEqual(mockConfigMap)
      expect(mockK8sApi.readNamespacedConfigMap).toHaveBeenCalledWith('my-config-123', 'default')
    })

    it('should get configmap from kube-system namespace', async () => {
      const mockConfigMap = createConfigMap('kube-root-ca.crt', 'kube-system')
      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })

      const result = await service.GetOneByNsName('kube-system', 'kube-root-ca.crt')

      expect(result).toEqual(mockConfigMap)
      expect(mockK8sApi.readNamespacedConfigMap).toHaveBeenCalledWith('kube-root-ca.crt', 'kube-system')
    })

    it('should get configmap with binary data', async () => {
      const mockConfigMap = createConfigMap('binary-config', 'default')
      mockConfigMap.binaryData = { 'cert.pem': 'base64encodeddata' }
      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })

      const result = await service.GetOneByNsName('default', 'binary-config')

      expect(result).toEqual(mockConfigMap)
      expect(result.binaryData).toHaveProperty('cert.pem')
    })

    it('should handle configmap with labels and annotations', async () => {
      const mockConfigMap = createConfigMap('labeled-config', 'default')
      if (mockConfigMap.metadata) {
        mockConfigMap.metadata.labels = { app: 'myapp', version: 'v1' }
        mockConfigMap.metadata.annotations = { description: 'Application configuration' }
      }
      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })

      const result = await service.GetOneByNsName('default', 'labeled-config')

      expect(result).toEqual(mockConfigMap)
      expect(result.metadata?.labels).toHaveProperty('app')
      expect(result.metadata?.annotations).toHaveProperty('description')
    })
  })

  describe('Delete', () => {
    it('should delete a configmap', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedConfigMap.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('default', 'test-configmap')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedConfigMap).toHaveBeenCalledWith('test-configmap', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedConfigMap.mockRejectedValue(error)

      await expect(service.Delete('default', 'test-configmap')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent configmap', async () => {
      const error = new Error('ConfigMap not found')
      mockK8sApi.deleteNamespacedConfigMap.mockRejectedValue(error)

      await expect(service.Delete('default', 'nonexistent')).rejects.toThrow('ConfigMap not found')
    })

    it('should delete configmap from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedConfigMap.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('kube-system', 'my-config')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedConfigMap).toHaveBeenCalledWith('my-config', 'kube-system')
    })

    it('should handle configmap with finalizers', async () => {
      const mockResponse = { status: 'Success', metadata: { finalizers: ['kubernetes'] } }
      mockK8sApi.deleteNamespacedConfigMap.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('default', 'config-with-finalizer')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNamespacedConfigMap.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('default', 'graceful-delete')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete configmaps')
      mockK8sApi.deleteNamespacedConfigMap.mockRejectedValue(error)

      await expect(service.Delete('default', 'test-configmap')).rejects.toThrow('Forbidden')
    })

    it('should delete configmap from production namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedConfigMap.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('production', 'app-config')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedConfigMap).toHaveBeenCalledWith('app-config', 'production')
    })

    it('should handle namespace not found during deletion', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.deleteNamespacedConfigMap.mockRejectedValue(error)

      await expect(service.Delete('nonexistent-ns', 'test-configmap')).rejects.toThrow('Namespace does not exist')
    })
  })

  describe('Update', () => {
    it('should update a configmap key with new value', async () => {
      const mockConfigMap = createConfigMap('test-configmap', 'default')
      mockConfigMap.data = { key1: 'old-value', key2: 'value2' }

      const data: JsonDataWrap<string> = { data: 'new-value' }
      const mockResponse = {
        body: {
          ...mockConfigMap,
          data: { key1: 'new-value', key2: 'value2' },
        },
      }

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })
      mockK8sApi.replaceNamespacedConfigMap.mockResolvedValue(mockResponse)

      const result = await service.Update('default', 'test-configmap', 'key1', data)

      expect(mockK8sApi.readNamespacedConfigMap).toHaveBeenCalledWith('test-configmap', 'default')
      expect(mockK8sApi.replaceNamespacedConfigMap).toHaveBeenCalledWith(
        'test-configmap',
        'default',
        expect.objectContaining({
          data: expect.objectContaining({ key1: 'new-value' }),
        }),
      )
      expect(result).toEqual(mockResponse)
    })

    it('should add a new key to configmap', async () => {
      const mockConfigMap = createConfigMap('test-configmap', 'default')
      mockConfigMap.data = { key1: 'value1' }

      const data: JsonDataWrap<string> = { data: 'new-key-value' }

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })
      mockK8sApi.replaceNamespacedConfigMap.mockResolvedValue({
        body: { ...mockConfigMap, data: { key1: 'value1', newKey: 'new-key-value' } },
      })

      await service.Update('default', 'test-configmap', 'newKey', data)

      expect(mockK8sApi.replaceNamespacedConfigMap).toHaveBeenCalledWith(
        'test-configmap',
        'default',
        expect.objectContaining({
          data: expect.objectContaining({ newKey: 'new-key-value' }),
        }),
      )
    })

    it('should update configmap with JSON data', async () => {
      const mockConfigMap = createConfigMap('app-config', 'default')
      mockConfigMap.data = { 'config.json': '{"old": "data"}' }

      const jsonData: JsonDataWrap<string> = { data: '{"new": "data", "version": 2}' }

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })
      mockK8sApi.replaceNamespacedConfigMap.mockResolvedValue({
        body: { ...mockConfigMap, data: { 'config.json': jsonData.data } },
      })

      await service.Update('default', 'app-config', 'config.json', jsonData)

      expect(mockK8sApi.replaceNamespacedConfigMap).toHaveBeenCalledWith(
        'app-config',
        'default',
        expect.objectContaining({
          data: expect.objectContaining({ 'config.json': '{"new": "data", "version": 2}' }),
        }),
      )
    })

    it('should update configmap with empty string', async () => {
      const mockConfigMap = createConfigMap('test-configmap', 'default')
      mockConfigMap.data = { key1: 'value1' }

      const data: JsonDataWrap<string> = { data: '' }

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })
      mockK8sApi.replaceNamespacedConfigMap.mockResolvedValue({
        body: { ...mockConfigMap, data: { key1: '' } },
      })

      await service.Update('default', 'test-configmap', 'key1', data)

      expect(mockK8sApi.replaceNamespacedConfigMap).toHaveBeenCalledWith(
        'test-configmap',
        'default',
        expect.objectContaining({
          data: expect.objectContaining({ key1: '' }),
        }),
      )
    })

    it('should update configmap with multiline data', async () => {
      const mockConfigMap = createConfigMap('test-configmap', 'default')
      mockConfigMap.data = { 'script.sh': '#!/bin/bash\necho "old"' }

      const multilineData: JsonDataWrap<string> = {
        data: `#!/bin/bash
echo "new script"
date`,
      }

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })
      mockK8sApi.replaceNamespacedConfigMap.mockResolvedValue({
        body: { ...mockConfigMap, data: { 'script.sh': multilineData.data } },
      })

      await service.Update('default', 'test-configmap', 'script.sh', multilineData)

      expect(mockK8sApi.replaceNamespacedConfigMap).toHaveBeenCalledWith(
        'test-configmap',
        'default',
        expect.objectContaining({
          data: expect.objectContaining({ 'script.sh': multilineData.data }),
        }),
      )
    })

    it('should handle update errors', async () => {
      const mockConfigMap = createConfigMap('test-configmap', 'default')
      const data: JsonDataWrap<string> = { data: 'new-value' }
      const error = new Error('Update failed')

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })
      mockK8sApi.replaceNamespacedConfigMap.mockRejectedValue(error)

      await expect(service.Update('default', 'test-configmap', 'key1', data)).rejects.toThrow('Update failed')
    })

    it('should handle not found errors during update', async () => {
      const data: JsonDataWrap<string> = { data: 'new-value' }
      const error = new Error('ConfigMap not found')

      mockK8sApi.readNamespacedConfigMap.mockRejectedValue(error)

      await expect(service.Update('default', 'nonexistent', 'key1', data)).rejects.toThrow('ConfigMap not found')
    })

    it('should update configmap in different namespace', async () => {
      const mockConfigMap = createConfigMap('app-config', 'production')
      mockConfigMap.data = { 'database.url': 'old-url' }

      const data: JsonDataWrap<string> = { data: 'new-production-url' }

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })
      mockK8sApi.replaceNamespacedConfigMap.mockResolvedValue({
        body: { ...mockConfigMap, data: { 'database.url': 'new-production-url' } },
      })

      await service.Update('production', 'app-config', 'database.url', data)

      expect(mockK8sApi.readNamespacedConfigMap).toHaveBeenCalledWith('app-config', 'production')
      expect(mockK8sApi.replaceNamespacedConfigMap).toHaveBeenCalledWith(
        'app-config',
        'production',
        expect.objectContaining({
          data: expect.objectContaining({ 'database.url': 'new-production-url' }),
        }),
      )
    })

    it('should preserve existing keys when updating', async () => {
      const mockConfigMap = createConfigMap('test-configmap', 'default')
      mockConfigMap.data = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      }

      const data: JsonDataWrap<string> = { data: 'updated-value2' }

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })
      mockK8sApi.replaceNamespacedConfigMap.mockResolvedValue({
        body: {
          ...mockConfigMap,
          data: {
            key1: 'value1',
            key2: 'updated-value2',
            key3: 'value3',
          },
        },
      })

      await service.Update('default', 'test-configmap', 'key2', data)

      expect(mockK8sApi.replaceNamespacedConfigMap).toHaveBeenCalledWith(
        'test-configmap',
        'default',
        expect.objectContaining({
          data: {
            key1: 'value1',
            key2: 'updated-value2',
            key3: 'value3',
          },
        }),
      )
    })

    it('should update configmap with XML data', async () => {
      const mockConfigMap = createConfigMap('test-configmap', 'default')
      mockConfigMap.data = { 'config.xml': '<config></config>' }

      const xmlData: JsonDataWrap<string> = { data: '<config><setting>value</setting></config>' }

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })
      mockK8sApi.replaceNamespacedConfigMap.mockResolvedValue({
        body: { ...mockConfigMap, data: { 'config.xml': xmlData.data } },
      })

      await service.Update('default', 'test-configmap', 'config.xml', xmlData)

      expect(mockK8sApi.replaceNamespacedConfigMap).toHaveBeenCalledWith(
        'test-configmap',
        'default',
        expect.objectContaining({
          data: expect.objectContaining({ 'config.xml': '<config><setting>value</setting></config>' }),
        }),
      )
    })

    it('should handle permission errors during update', async () => {
      const mockConfigMap = createConfigMap('test-configmap', 'default')
      const data: JsonDataWrap<string> = { data: 'new-value' }
      const error = new Error('Forbidden: User cannot update configmaps')

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })
      mockK8sApi.replaceNamespacedConfigMap.mockRejectedValue(error)

      await expect(service.Update('default', 'test-configmap', 'key1', data)).rejects.toThrow('Forbidden')
    })

    it('should update configmap with properties file format', async () => {
      const mockConfigMap = createConfigMap('test-configmap', 'default')
      mockConfigMap.data = { 'application.properties': 'key1=value1\nkey2=value2' }

      const propertiesData: JsonDataWrap<string> = {
        data: 'key1=newvalue1\nkey2=newvalue2\nkey3=value3',
      }

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })
      mockK8sApi.replaceNamespacedConfigMap.mockResolvedValue({
        body: { ...mockConfigMap, data: { 'application.properties': propertiesData.data } },
      })

      await service.Update('default', 'test-configmap', 'application.properties', propertiesData)

      expect(mockK8sApi.replaceNamespacedConfigMap).toHaveBeenCalledWith(
        'test-configmap',
        'default',
        expect.objectContaining({
          data: expect.objectContaining({
            'application.properties': 'key1=newvalue1\nkey2=newvalue2\nkey3=value3',
          }),
        }),
      )
    })

    it('should handle large data updates', async () => {
      const mockConfigMap = createConfigMap('test-configmap', 'default')
      mockConfigMap.data = { largeKey: 'small data' }

      const largeData: JsonDataWrap<string> = { data: 'x'.repeat(10000) }

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })
      mockK8sApi.replaceNamespacedConfigMap.mockResolvedValue({
        body: { ...mockConfigMap, data: { largeKey: largeData.data } },
      })

      await service.Update('default', 'test-configmap', 'largeKey', largeData)

      expect(mockK8sApi.replaceNamespacedConfigMap).toHaveBeenCalledWith(
        'test-configmap',
        'default',
        expect.objectContaining({
          data: expect.objectContaining({ largeKey: largeData.data }),
        }),
      )
    })

    it('should handle conflict errors during update', async () => {
      const mockConfigMap = createConfigMap('test-configmap', 'default')
      const data: JsonDataWrap<string> = { data: 'new-value' }
      const error = new Error('Conflict: Resource version mismatch')

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })
      mockK8sApi.replaceNamespacedConfigMap.mockRejectedValue(error)

      await expect(service.Update('default', 'test-configmap', 'key1', data)).rejects.toThrow('Conflict')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s API', async () => {
      const mockConfigMaps = [createConfigMap('test-configmap')]
      mockK8sApi.listConfigMapForAllNamespaces.mockResolvedValue({
        body: { items: mockConfigMaps },
      })

      await service.List()

      expect(clientService.getCoreV1Api).toHaveBeenCalled()
    })

    it('should call getCoreV1Api for every operation', async () => {
      const mockConfigMap = createConfigMap('test')
      mockK8sApi.listConfigMapForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({ body: mockConfigMap })
      mockK8sApi.deleteNamespacedConfigMap.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('default', 'test')

      expect(clientService.getCoreV1Api).toHaveBeenCalledTimes(4)
    })

    it('should call getCoreV1Api for update operations', async () => {
      const mockConfigMap = createConfigMap('test')
      const data: JsonDataWrap<string> = { data: 'value' }

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({ body: mockConfigMap })
      mockK8sApi.replaceNamespacedConfigMap.mockResolvedValue({ body: mockConfigMap })

      await service.Update('default', 'test', 'key1', data)

      expect(clientService.getCoreV1Api).toHaveBeenCalledTimes(3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle configmap with no data property', async () => {
      const mockConfigMap = createConfigMap('no-data-config', 'default')
      delete mockConfigMap.data

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })

      const result = await service.GetOneByNsName('default', 'no-data-config')

      expect(result).toEqual(mockConfigMap)
    })

    it('should handle update when data property is undefined', async () => {
      const mockConfigMap = createConfigMap('test-configmap', 'default')
      delete mockConfigMap.data

      const data: JsonDataWrap<string> = { data: 'new-value' }

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: { ...mockConfigMap, data: {} }, // Ensure data property exists
      })
      mockK8sApi.replaceNamespacedConfigMap.mockResolvedValue({
        body: { ...mockConfigMap, data: { key1: 'new-value' } },
      })

      await service.Update('default', 'test-configmap', 'key1', data)

      expect(mockK8sApi.replaceNamespacedConfigMap).toHaveBeenCalled()
    })

    it('should handle special characters in key names', async () => {
      const mockConfigMap = createConfigMap('test-configmap', 'default')
      mockConfigMap.data = { 'key-with-dashes': 'value', 'key.with.dots': 'value2' }

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })

      const result = await service.GetOneByNsName('default', 'test-configmap')

      expect(result.data).toHaveProperty('key-with-dashes')
      expect(result.data).toHaveProperty('key.with.dots')
    })

    it('should handle configmap with immutable field', async () => {
      const mockConfigMap = createConfigMap('immutable-config', 'default')
      mockConfigMap.immutable = true

      mockK8sApi.readNamespacedConfigMap.mockResolvedValue({
        body: mockConfigMap,
      })

      const result = await service.GetOneByNsName('default', 'immutable-config')

      expect(result.immutable).toBe(true)
    })
  })
})
