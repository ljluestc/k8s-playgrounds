import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { JsonDataWrap } from '@backend/model/JsonDataWrap'
import type { K8sService } from '../k8s.service'
import { ConfigmapController } from './configmap.controller'

describe('ConfigmapController', () => {
  let controller: ConfigmapController
  let k8sService: K8sService

  beforeEach(() => {
    const mockConfigMapService = {
      List: vi.fn(),
      GetOneByNsName: vi.fn(),
      Delete: vi.fn(),
      Update: vi.fn(),
    }

    const mockK8sService = {
      configMapService: mockConfigMapService,
    } as any

    // Create controller directly with mocked dependencies
    controller = new ConfigmapController(mockK8sService)
    k8sService = mockK8sService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all configmaps', async () => {
      const mockConfigMaps = { items: [] }
      vi.spyOn(k8sService.configMapService, 'List').mockResolvedValue(mockConfigMaps as any)

      const result = await controller.List()

      expect(result).toEqual(mockConfigMaps)
      expect(k8sService.configMapService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing configmaps', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.configMapService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })
  })

  describe('ListByNs', () => {
    it('should return configmaps for a specific namespace', async () => {
      const mockConfigMaps = { items: [] }
      const namespace = 'default'
      vi.spyOn(k8sService.configMapService, 'List').mockResolvedValue(mockConfigMaps as any)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockConfigMaps)
      expect(k8sService.configMapService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      vi.spyOn(k8sService.configMapService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockConfigMaps = { items: [] }
      vi.spyOn(k8sService.configMapService, 'List').mockResolvedValue(mockConfigMaps as any)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockConfigMaps)
      expect(k8sService.configMapService.List).toHaveBeenCalledWith('')
    })

    it('should list configmaps in kube-system namespace', async () => {
      const mockConfigMaps = { items: [] }
      vi.spyOn(k8sService.configMapService, 'List').mockResolvedValue(mockConfigMaps as any)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockConfigMaps)
      expect(k8sService.configMapService.List).toHaveBeenCalledWith('kube-system')
    })

    it('should handle namespace with special characters', async () => {
      const mockConfigMaps = { items: [] }
      vi.spyOn(k8sService.configMapService, 'List').mockResolvedValue(mockConfigMaps as any)

      const result = await controller.ListByNs('my-namespace-123')

      expect(result).toEqual(mockConfigMaps)
      expect(k8sService.configMapService.List).toHaveBeenCalledWith('my-namespace-123')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single configmap', async () => {
      const mockConfigMap = {
        metadata: { name: 'test-configmap', namespace: 'default' },
        data: { key1: 'value1', key2: 'value2' },
      }
      vi.spyOn(k8sService.configMapService, 'GetOneByNsName').mockResolvedValue(mockConfigMap as any)

      const result = await controller.GetOneByNsName('default', 'test-configmap')

      expect(result).toEqual(mockConfigMap)
      expect(k8sService.configMapService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-configmap')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.configMapService, 'GetOneByNsName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should handle special characters in configmap name', async () => {
      const mockConfigMap = { metadata: { name: 'test-configmap-123', namespace: 'default' } }
      vi.spyOn(k8sService.configMapService, 'GetOneByNsName').mockResolvedValue(mockConfigMap as any)

      const result = await controller.GetOneByNsName('default', 'test-configmap-123')

      expect(result).toEqual(mockConfigMap)
      expect(k8sService.configMapService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-configmap-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockConfigMap = { metadata: { name: 'test-configmap', namespace: 'kube-system' } }
      vi.spyOn(k8sService.configMapService, 'GetOneByNsName').mockResolvedValue(mockConfigMap as any)

      const result = await controller.GetOneByNsName('kube-system', 'test-configmap')

      expect(result).toEqual(mockConfigMap)
      expect(k8sService.configMapService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-configmap')
    })

    it('should return configmap with multiple data entries', async () => {
      const mockConfigMap = {
        metadata: { name: 'app-config', namespace: 'default' },
        data: {
          'config.json': '{"key": "value"}',
          'database.conf': 'host=localhost',
          'feature-flags': 'enabled=true',
        },
      }
      vi.spyOn(k8sService.configMapService, 'GetOneByNsName').mockResolvedValue(mockConfigMap as any)

      const result = await controller.GetOneByNsName('default', 'app-config')

      expect(result).toEqual(mockConfigMap)
      expect(result.data).toHaveProperty('config.json')
      expect(result.data).toHaveProperty('database.conf')
      expect(result.data).toHaveProperty('feature-flags')
    })

    it('should return configmap with empty data', async () => {
      const mockConfigMap = {
        metadata: { name: 'empty-configmap', namespace: 'default' },
        data: {},
      }
      vi.spyOn(k8sService.configMapService, 'GetOneByNsName').mockResolvedValue(mockConfigMap as any)

      const result = await controller.GetOneByNsName('default', 'empty-configmap')

      expect(result).toEqual(mockConfigMap)
      expect(result.data).toEqual({})
    })
  })

  describe('Delete', () => {
    it('should delete a single configmap', async () => {
      vi.spyOn(k8sService.configMapService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-configmap']
      await controller.Delete(nsn)

      expect(k8sService.configMapService.Delete).toHaveBeenCalledWith('default', 'test-configmap')
    })

    it('should delete multiple configmaps', async () => {
      vi.spyOn(k8sService.configMapService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/configmap1', 'kube-system/configmap2', 'default/configmap3']
      await controller.Delete(nsn)

      expect(k8sService.configMapService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.configMapService.Delete).toHaveBeenCalledWith('default', 'configmap1')
      expect(k8sService.configMapService.Delete).toHaveBeenCalledWith('kube-system', 'configmap2')
      expect(k8sService.configMapService.Delete).toHaveBeenCalledWith('default', 'configmap3')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.configMapService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.configMapService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.configMapService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/configmap1', 'default/configmap2', 'default/configmap3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.configMapService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle configmaps with slashes in namespace/name format', async () => {
      vi.spyOn(k8sService.configMapService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-configmap-name']
      await controller.Delete(nsn)

      expect(k8sService.configMapService.Delete).toHaveBeenCalledWith('my-namespace', 'my-configmap-name')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.configMapService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-configmap']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should delete configmaps from different namespaces', async () => {
      vi.spyOn(k8sService.configMapService, 'Delete').mockResolvedValue(undefined)

      const nsn = [
        'default/app-config',
        'kube-system/kube-root-ca.crt',
        'production/db-config',
        'staging/app-settings',
      ]
      await controller.Delete(nsn)

      expect(k8sService.configMapService.Delete).toHaveBeenCalledTimes(4)
      expect(k8sService.configMapService.Delete).toHaveBeenCalledWith('default', 'app-config')
      expect(k8sService.configMapService.Delete).toHaveBeenCalledWith('kube-system', 'kube-root-ca.crt')
      expect(k8sService.configMapService.Delete).toHaveBeenCalledWith('production', 'db-config')
      expect(k8sService.configMapService.Delete).toHaveBeenCalledWith('staging', 'app-settings')
    })
  })

  describe('Update', () => {
    it('should update a configmap key', async () => {
      const data: JsonDataWrap<string> = { data: 'new-value' }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.configMapService, 'Update').mockResolvedValue(mockResponse as any)

      const result = await controller.Update(data, 'default', 'test-configmap', 'key1')

      expect(result).toEqual(mockResponse)
      expect(k8sService.configMapService.Update).toHaveBeenCalledWith('default', 'test-configmap', 'key1', data)
    })

    it('should update configmap with JSON data', async () => {
      const jsonData: JsonDataWrap<string> = { data: '{"setting": "enabled", "timeout": 30}' }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.configMapService, 'Update').mockResolvedValue(mockResponse as any)

      const result = await controller.Update(jsonData, 'default', 'app-config', 'config.json')

      expect(result).toEqual(mockResponse)
      expect(k8sService.configMapService.Update).toHaveBeenCalledWith('default', 'app-config', 'config.json', jsonData)
    })

    it('should update configmap with empty string', async () => {
      const data: JsonDataWrap<string> = { data: '' }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.configMapService, 'Update').mockResolvedValue(mockResponse as any)

      const result = await controller.Update(data, 'default', 'test-configmap', 'key1')

      expect(result).toEqual(mockResponse)
      expect(k8sService.configMapService.Update).toHaveBeenCalledWith('default', 'test-configmap', 'key1', data)
    })

    it('should update configmap with multiline data', async () => {
      const multilineData: JsonDataWrap<string> = {
        data: `line1
line2
line3`,
      }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.configMapService, 'Update').mockResolvedValue(mockResponse as any)

      const result = await controller.Update(multilineData, 'default', 'test-configmap', 'script.sh')

      expect(result).toEqual(mockResponse)
      expect(k8sService.configMapService.Update).toHaveBeenCalledWith('default', 'test-configmap', 'script.sh', multilineData)
    })

    it('should handle update errors', async () => {
      const data: JsonDataWrap<string> = { data: 'new-value' }
      const error = new Error('Update failed')
      vi.spyOn(k8sService.configMapService, 'Update').mockRejectedValue(error)

      await expect(controller.Update(data, 'default', 'test-configmap', 'key1')).rejects.toThrow('Update failed')
    })

    it('should handle not found errors during update', async () => {
      const data: JsonDataWrap<string> = { data: 'new-value' }
      const error = new Error('ConfigMap not found')
      vi.spyOn(k8sService.configMapService, 'Update').mockRejectedValue(error)

      await expect(controller.Update(data, 'default', 'nonexistent', 'key1')).rejects.toThrow('ConfigMap not found')
    })

    it('should update configmap in different namespace', async () => {
      const data: JsonDataWrap<string> = { data: 'production-value' }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.configMapService, 'Update').mockResolvedValue(mockResponse as any)

      const result = await controller.Update(data, 'production', 'app-config', 'database.url')

      expect(result).toEqual(mockResponse)
      expect(k8sService.configMapService.Update).toHaveBeenCalledWith('production', 'app-config', 'database.url', data)
    })

    it('should update configmap with special characters in key', async () => {
      const data: JsonDataWrap<string> = { data: 'value' }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.configMapService, 'Update').mockResolvedValue(mockResponse as any)

      const result = await controller.Update(data, 'default', 'test-configmap', 'config.properties')

      expect(result).toEqual(mockResponse)
      expect(k8sService.configMapService.Update).toHaveBeenCalledWith('default', 'test-configmap', 'config.properties', data)
    })

    it('should update configmap with large data', async () => {
      const largeData: JsonDataWrap<string> = { data: 'x'.repeat(10000) }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.configMapService, 'Update').mockResolvedValue(mockResponse as any)

      const result = await controller.Update(largeData, 'default', 'test-configmap', 'large-key')

      expect(result).toEqual(mockResponse)
      expect(k8sService.configMapService.Update).toHaveBeenCalledWith('default', 'test-configmap', 'large-key', largeData)
    })

    it('should update configmap with XML data', async () => {
      const xmlData: JsonDataWrap<string> = { data: '<config><setting>value</setting></config>' }
      const mockResponse = { body: { status: 'Success' } }
      vi.spyOn(k8sService.configMapService, 'Update').mockResolvedValue(mockResponse as any)

      const result = await controller.Update(xmlData, 'default', 'test-configmap', 'config.xml')

      expect(result).toEqual(mockResponse)
      expect(k8sService.configMapService.Update).toHaveBeenCalledWith('default', 'test-configmap', 'config.xml', xmlData)
    })

    it('should handle permission errors during update', async () => {
      const data: JsonDataWrap<string> = { data: 'new-value' }
      const error = new Error('Forbidden: User cannot update configmaps')
      vi.spyOn(k8sService.configMapService, 'Update').mockRejectedValue(error)

      await expect(controller.Update(data, 'default', 'test-configmap', 'key1')).rejects.toThrow('Forbidden')
    })
  })
})
