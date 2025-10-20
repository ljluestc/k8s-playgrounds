import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { K8sService } from '../k8s.service'
import { IngressController } from './ingress.controller'

describe('IngressController', () => {
  let controller: IngressController
  let k8sService: K8sService

  beforeEach(() => {
    const mockIngressService = {
      List: vi.fn(),
      GetOneByNsName: vi.fn(),
      Delete: vi.fn(),
    }

    const mockK8sService = {
      ingressService: mockIngressService,
    } as any

    // Create controller directly with mocked dependencies
    controller = new IngressController(mockK8sService)
    k8sService = mockK8sService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all ingresses', async () => {
      const mockIngresses = { items: [] }
      vi.spyOn(k8sService.ingressService, 'List').mockResolvedValue(mockIngresses as any)

      const result = await controller.List()

      expect(result).toEqual(mockIngresses)
      expect(k8sService.ingressService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing ingresses', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.ingressService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })
  })

  describe('ListByNs', () => {
    it('should return ingresses for a specific namespace', async () => {
      const mockIngresses = { items: [] }
      const namespace = 'default'
      vi.spyOn(k8sService.ingressService, 'List').mockResolvedValue(mockIngresses as any)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockIngresses)
      expect(k8sService.ingressService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      vi.spyOn(k8sService.ingressService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockIngresses = { items: [] }
      vi.spyOn(k8sService.ingressService, 'List').mockResolvedValue(mockIngresses as any)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockIngresses)
      expect(k8sService.ingressService.List).toHaveBeenCalledWith('')
    })

    it('should list ingresses in kube-system namespace', async () => {
      const mockIngresses = { items: [] }
      vi.spyOn(k8sService.ingressService, 'List').mockResolvedValue(mockIngresses as any)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockIngresses)
      expect(k8sService.ingressService.List).toHaveBeenCalledWith('kube-system')
    })

    it('should list ingresses in custom namespace', async () => {
      const mockIngresses = { items: [] }
      vi.spyOn(k8sService.ingressService, 'List').mockResolvedValue(mockIngresses as any)

      const result = await controller.ListByNs('production')

      expect(result).toEqual(mockIngresses)
      expect(k8sService.ingressService.List).toHaveBeenCalledWith('production')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single ingress', async () => {
      const mockIngress = {
        metadata: { name: 'test-ingress', namespace: 'default' },
        spec: {
          rules: [{
            host: 'example.com',
            http: {
              paths: [{
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: { name: 'test-service', port: { number: 80 } },
                },
              }],
            },
          }],
        },
      }
      vi.spyOn(k8sService.ingressService, 'GetOneByNsName').mockResolvedValue(mockIngress as any)

      const result = await controller.GetOneByNsName('default', 'test-ingress')

      expect(result).toEqual(mockIngress)
      expect(k8sService.ingressService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-ingress')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.ingressService, 'GetOneByNsName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should handle special characters in ingress name', async () => {
      const mockIngress = { metadata: { name: 'test-ingress-123', namespace: 'default' } }
      vi.spyOn(k8sService.ingressService, 'GetOneByNsName').mockResolvedValue(mockIngress as any)

      const result = await controller.GetOneByNsName('default', 'test-ingress-123')

      expect(result).toEqual(mockIngress)
      expect(k8sService.ingressService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-ingress-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockIngress = { metadata: { name: 'test-ingress', namespace: 'kube-system' } }
      vi.spyOn(k8sService.ingressService, 'GetOneByNsName').mockResolvedValue(mockIngress as any)

      const result = await controller.GetOneByNsName('kube-system', 'test-ingress')

      expect(result).toEqual(mockIngress)
      expect(k8sService.ingressService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-ingress')
    })

    it('should get ingress with TLS configuration', async () => {
      const mockIngress = {
        metadata: { name: 'secure-ingress', namespace: 'default' },
        spec: {
          tls: [{
            hosts: ['example.com'],
            secretName: 'tls-secret',
          }],
          rules: [{
            host: 'example.com',
            http: {
              paths: [{
                path: '/',
                pathType: 'Prefix',
                backend: {
                  service: { name: 'test-service', port: { number: 443 } },
                },
              }],
            },
          }],
        },
      }
      vi.spyOn(k8sService.ingressService, 'GetOneByNsName').mockResolvedValue(mockIngress as any)

      const result = await controller.GetOneByNsName('default', 'secure-ingress')

      expect(result).toEqual(mockIngress)
      expect(result.spec.tls).toBeDefined()
      expect(result.spec.tls[0].secretName).toBe('tls-secret')
    })

    it('should get ingress with multiple rules', async () => {
      const mockIngress = {
        metadata: { name: 'multi-host-ingress', namespace: 'default' },
        spec: {
          rules: [
            {
              host: 'api.example.com',
              http: { paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name: 'api-service', port: { number: 80 } } } }] },
            },
            {
              host: 'web.example.com',
              http: { paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name: 'web-service', port: { number: 80 } } } }] },
            },
          ],
        },
      }
      vi.spyOn(k8sService.ingressService, 'GetOneByNsName').mockResolvedValue(mockIngress as any)

      const result = await controller.GetOneByNsName('default', 'multi-host-ingress')

      expect(result).toEqual(mockIngress)
      expect(result.spec.rules).toHaveLength(2)
    })

    it('should get ingress with IngressClass annotation', async () => {
      const mockIngress = {
        metadata: {
          name: 'nginx-ingress',
          namespace: 'default',
          annotations: {
            'kubernetes.io/ingress.class': 'nginx',
          },
        },
        spec: {
          rules: [{
            host: 'example.com',
            http: { paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name: 'test-service', port: { number: 80 } } } }] },
          }],
        },
      }
      vi.spyOn(k8sService.ingressService, 'GetOneByNsName').mockResolvedValue(mockIngress as any)

      const result = await controller.GetOneByNsName('default', 'nginx-ingress')

      expect(result).toEqual(mockIngress)
      expect(result.metadata.annotations['kubernetes.io/ingress.class']).toBe('nginx')
    })

    it('should get ingress with IngressClassName field', async () => {
      const mockIngress = {
        metadata: { name: 'class-ingress', namespace: 'default' },
        spec: {
          ingressClassName: 'nginx',
          rules: [{
            host: 'example.com',
            http: { paths: [{ path: '/', pathType: 'Prefix', backend: { service: { name: 'test-service', port: { number: 80 } } } }] },
          }],
        },
      }
      vi.spyOn(k8sService.ingressService, 'GetOneByNsName').mockResolvedValue(mockIngress as any)

      const result = await controller.GetOneByNsName('default', 'class-ingress')

      expect(result).toEqual(mockIngress)
      expect(result.spec.ingressClassName).toBe('nginx')
    })

    it('should get ingress with path-based routing', async () => {
      const mockIngress = {
        metadata: { name: 'path-ingress', namespace: 'default' },
        spec: {
          rules: [{
            host: 'example.com',
            http: {
              paths: [
                { path: '/api', pathType: 'Prefix', backend: { service: { name: 'api-service', port: { number: 8080 } } } },
                { path: '/web', pathType: 'Prefix', backend: { service: { name: 'web-service', port: { number: 3000 } } } },
              ],
            },
          }],
        },
      }
      vi.spyOn(k8sService.ingressService, 'GetOneByNsName').mockResolvedValue(mockIngress as any)

      const result = await controller.GetOneByNsName('default', 'path-ingress')

      expect(result).toEqual(mockIngress)
      expect(result.spec.rules[0].http.paths).toHaveLength(2)
    })
  })

  describe('Delete', () => {
    it('should delete a single ingress', async () => {
      vi.spyOn(k8sService.ingressService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-ingress']
      await controller.Delete(nsn)

      expect(k8sService.ingressService.Delete).toHaveBeenCalledWith('test-ingress', 'default')
    })

    it('should delete multiple ingresses', async () => {
      vi.spyOn(k8sService.ingressService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/ingress1', 'kube-system/ingress2', 'default/ingress3']
      await controller.Delete(nsn)

      expect(k8sService.ingressService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.ingressService.Delete).toHaveBeenCalledWith('ingress1', 'default')
      expect(k8sService.ingressService.Delete).toHaveBeenCalledWith('ingress2', 'kube-system')
      expect(k8sService.ingressService.Delete).toHaveBeenCalledWith('ingress3', 'default')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.ingressService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.ingressService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.ingressService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/ingress1', 'default/ingress2', 'default/ingress3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.ingressService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle ingresses with slashes in namespace/name format', async () => {
      vi.spyOn(k8sService.ingressService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-ingress-name']
      await controller.Delete(nsn)

      expect(k8sService.ingressService.Delete).toHaveBeenCalledWith('my-ingress-name', 'my-namespace')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.ingressService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-ingress']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should delete ingresses from multiple namespaces', async () => {
      vi.spyOn(k8sService.ingressService, 'Delete').mockResolvedValue(undefined)

      const nsn = [
        'production/api-ingress',
        'staging/web-ingress',
        'development/test-ingress',
      ]
      await controller.Delete(nsn)

      expect(k8sService.ingressService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.ingressService.Delete).toHaveBeenCalledWith('api-ingress', 'production')
      expect(k8sService.ingressService.Delete).toHaveBeenCalledWith('web-ingress', 'staging')
      expect(k8sService.ingressService.Delete).toHaveBeenCalledWith('test-ingress', 'development')
    })

    it('should handle deletion of ingress with TLS configuration', async () => {
      vi.spyOn(k8sService.ingressService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/secure-ingress']
      await controller.Delete(nsn)

      expect(k8sService.ingressService.Delete).toHaveBeenCalledWith('secure-ingress', 'default')
    })

    it('should handle deletion errors for specific ingresses', async () => {
      vi.spyOn(k8sService.ingressService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Ingress not found'))

      const nsn = ['default/existing-ingress', 'default/nonexistent-ingress']

      // Should continue despite error
      await controller.Delete(nsn)

      expect(k8sService.ingressService.Delete).toHaveBeenCalledTimes(2)
    })
  })
})
