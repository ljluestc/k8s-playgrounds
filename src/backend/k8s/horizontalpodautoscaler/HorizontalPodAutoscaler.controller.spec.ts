import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockK8sService } from '../../../../test/utils/k8s-mocks'

import { HorizontalPodAutoscalerController } from './HorizontalPodAutoscaler.controller'

describe('HorizontalPodAutoscalerController', () => {
  let controller: HorizontalPodAutoscalerController
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new HorizontalPodAutoscalerController(k8sService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all horizontal pod autoscalers', async () => {
      const mockHPAs = { items: [] }
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'List').mockResolvedValue(mockHPAs as any)

      const result = await controller.List()

      expect(result).toEqual(mockHPAs)
      expect(k8sService.horizontalPodAutoscalerService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing HPAs', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })
  })

  describe('ListByNs', () => {
    it('should return HPAs for a specific namespace', async () => {
      const mockHPAs = { items: [] }
      const namespace = 'default'
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'List').mockResolvedValue(mockHPAs as any)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockHPAs)
      expect(k8sService.horizontalPodAutoscalerService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockHPAs = { items: [] }
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'List').mockResolvedValue(mockHPAs as any)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockHPAs)
      expect(k8sService.horizontalPodAutoscalerService.List).toHaveBeenCalledWith('')
    })

    it('should list HPAs in kube-system namespace', async () => {
      const mockHPAs = { items: [] }
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'List').mockResolvedValue(mockHPAs as any)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockHPAs)
      expect(k8sService.horizontalPodAutoscalerService.List).toHaveBeenCalledWith('kube-system')
    })

    it('should list HPAs in production namespace', async () => {
      const mockHPAs = { items: [] }
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'List').mockResolvedValue(mockHPAs as any)

      const result = await controller.ListByNs('production')

      expect(result).toEqual(mockHPAs)
      expect(k8sService.horizontalPodAutoscalerService.List).toHaveBeenCalledWith('production')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single HPA', async () => {
      const mockHPA = {
        metadata: { name: 'test-hpa', namespace: 'default' },
        spec: {
          minReplicas: 1,
          maxReplicas: 10,
          scaleTargetRef: {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            name: 'test-deployment',
          },
        },
      }
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'GetOneByNsName').mockResolvedValue(mockHPA as any)

      const result = await controller.GetOneByNsName('default', 'test-hpa')

      expect(result).toEqual(mockHPA)
      expect(k8sService.horizontalPodAutoscalerService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-hpa')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'GetOneByNsName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should handle special characters in HPA name', async () => {
      const mockHPA = { metadata: { name: 'test-hpa-123', namespace: 'default' } }
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'GetOneByNsName').mockResolvedValue(mockHPA as any)

      const result = await controller.GetOneByNsName('default', 'test-hpa-123')

      expect(result).toEqual(mockHPA)
      expect(k8sService.horizontalPodAutoscalerService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-hpa-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockHPA = { metadata: { name: 'test-hpa', namespace: 'kube-system' } }
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'GetOneByNsName').mockResolvedValue(mockHPA as any)

      const result = await controller.GetOneByNsName('kube-system', 'test-hpa')

      expect(result).toEqual(mockHPA)
      expect(k8sService.horizontalPodAutoscalerService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-hpa')
    })

    it('should get HPA targeting Deployment', async () => {
      const mockHPA = {
        metadata: { name: 'deployment-hpa', namespace: 'default' },
        spec: {
          scaleTargetRef: {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            name: 'web-app',
          },
          minReplicas: 2,
          maxReplicas: 20,
        },
      }
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'GetOneByNsName').mockResolvedValue(mockHPA as any)

      const result = await controller.GetOneByNsName('default', 'deployment-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.scaleTargetRef.kind).toBe('Deployment')
    })

    it('should get HPA targeting StatefulSet', async () => {
      const mockHPA = {
        metadata: { name: 'statefulset-hpa', namespace: 'default' },
        spec: {
          scaleTargetRef: {
            apiVersion: 'apps/v1',
            kind: 'StatefulSet',
            name: 'database',
          },
          minReplicas: 3,
          maxReplicas: 15,
        },
      }
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'GetOneByNsName').mockResolvedValue(mockHPA as any)

      const result = await controller.GetOneByNsName('default', 'statefulset-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.scaleTargetRef.kind).toBe('StatefulSet')
    })

    it('should get HPA with CPU metric', async () => {
      const mockHPA = {
        metadata: { name: 'cpu-hpa', namespace: 'default' },
        spec: {
          metrics: [
            {
              type: 'Resource',
              resource: {
                name: 'cpu',
                target: {
                  type: 'Utilization',
                  averageUtilization: 80,
                },
              },
            },
          ],
        },
      }
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'GetOneByNsName').mockResolvedValue(mockHPA as any)

      const result = await controller.GetOneByNsName('default', 'cpu-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.metrics?.[0].resource?.name).toBe('cpu')
    })

    it('should get HPA with memory metric', async () => {
      const mockHPA = {
        metadata: { name: 'memory-hpa', namespace: 'default' },
        spec: {
          metrics: [
            {
              type: 'Resource',
              resource: {
                name: 'memory',
                target: {
                  type: 'Utilization',
                  averageUtilization: 70,
                },
              },
            },
          ],
        },
      }
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'GetOneByNsName').mockResolvedValue(mockHPA as any)

      const result = await controller.GetOneByNsName('default', 'memory-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.metrics?.[0].resource?.name).toBe('memory')
    })

    it('should get HPA with multiple metrics', async () => {
      const mockHPA = {
        metadata: { name: 'multi-metric-hpa', namespace: 'default' },
        spec: {
          metrics: [
            {
              type: 'Resource',
              resource: {
                name: 'cpu',
                target: {
                  type: 'Utilization',
                  averageUtilization: 80,
                },
              },
            },
            {
              type: 'Resource',
              resource: {
                name: 'memory',
                target: {
                  type: 'Utilization',
                  averageUtilization: 70,
                },
              },
            },
          ],
        },
      }
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'GetOneByNsName').mockResolvedValue(mockHPA as any)

      const result = await controller.GetOneByNsName('default', 'multi-metric-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.metrics?.length).toBe(2)
    })

    it('should get HPA with custom metric', async () => {
      const mockHPA = {
        metadata: { name: 'custom-hpa', namespace: 'default' },
        spec: {
          metrics: [
            {
              type: 'Pods',
              pods: {
                metric: {
                  name: 'http_requests_per_second',
                },
                target: {
                  type: 'AverageValue',
                  averageValue: '1000',
                },
              },
            },
          ],
        },
      }
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'GetOneByNsName').mockResolvedValue(mockHPA as any)

      const result = await controller.GetOneByNsName('default', 'custom-hpa')

      expect(result).toEqual(mockHPA)
      expect(result.spec?.metrics?.[0].type).toBe('Pods')
    })
  })

  describe('Delete', () => {
    it('should delete a single HPA', async () => {
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-hpa']
      await controller.Delete(nsn)

      expect(k8sService.horizontalPodAutoscalerService.Delete).toHaveBeenCalledWith('test-hpa', 'default')
    })

    it('should delete multiple HPAs', async () => {
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/hpa1', 'kube-system/hpa2', 'default/hpa3']
      await controller.Delete(nsn)

      expect(k8sService.horizontalPodAutoscalerService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.horizontalPodAutoscalerService.Delete).toHaveBeenCalledWith('hpa1', 'default')
      expect(k8sService.horizontalPodAutoscalerService.Delete).toHaveBeenCalledWith('hpa2', 'kube-system')
      expect(k8sService.horizontalPodAutoscalerService.Delete).toHaveBeenCalledWith('hpa3', 'default')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.horizontalPodAutoscalerService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/hpa1', 'default/hpa2', 'default/hpa3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.horizontalPodAutoscalerService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle HPAs with slashes in namespace/name format', async () => {
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-hpa-name']
      await controller.Delete(nsn)

      expect(k8sService.horizontalPodAutoscalerService.Delete).toHaveBeenCalledWith('my-hpa-name', 'my-namespace')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-hpa']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should delete HPAs from different namespaces', async () => {
      vi.spyOn(k8sService.horizontalPodAutoscalerService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['production/web-hpa', 'staging/api-hpa', 'development/worker-hpa']
      await controller.Delete(nsn)

      expect(k8sService.horizontalPodAutoscalerService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.horizontalPodAutoscalerService.Delete).toHaveBeenCalledWith('web-hpa', 'production')
      expect(k8sService.horizontalPodAutoscalerService.Delete).toHaveBeenCalledWith('api-hpa', 'staging')
      expect(k8sService.horizontalPodAutoscalerService.Delete).toHaveBeenCalledWith('worker-hpa', 'development')
    })
  })
})
