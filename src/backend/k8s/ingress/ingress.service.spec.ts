import { vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createIngress, createMockClientService } from '../../../../test/utils/k8s-mocks'
import { IngressService } from './ingress.service'

describe('IngressService', () => {
  let service: IngressService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getNetworkingV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: IngressService,
          useFactory: (clientService: ClientService) => {
            return new IngressService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<IngressService>(IngressService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all ingresses across all namespaces when no namespace specified', async () => {
      const mockIngresses = [createIngress('ingress-1', 'default'), createIngress('ingress-2', 'kube-system')]
      mockK8sApi.listIngressForAllNamespaces.mockResolvedValue({
        body: { items: mockIngresses },
      })

      const result = await service.List()

      expect(result).toEqual(mockIngresses)
      expect(mockK8sApi.listIngressForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedIngress).not.toHaveBeenCalled()
    })

    it('should list all ingresses when namespace is "null" string', async () => {
      const mockIngresses = [createIngress('ingress-1')]
      mockK8sApi.listIngressForAllNamespaces.mockResolvedValue({
        body: { items: mockIngresses },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockIngresses)
      expect(mockK8sApi.listIngressForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedIngress).not.toHaveBeenCalled()
    })

    it('should list ingresses in a specific namespace', async () => {
      const mockIngresses = [createIngress('ingress-1', 'default')]
      mockK8sApi.listNamespacedIngress.mockResolvedValue({
        body: { items: mockIngresses },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockIngresses)
      expect(mockK8sApi.listNamespacedIngress).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listIngressForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all ingresses', async () => {
      const error = new Error('API Error')
      mockK8sApi.listIngressForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced ingresses', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedIngress.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no ingresses exist', async () => {
      mockK8sApi.listIngressForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list ingresses in kube-system namespace', async () => {
      const mockIngresses = [createIngress('system-ingress', 'kube-system')]
      mockK8sApi.listNamespacedIngress.mockResolvedValue({
        body: { items: mockIngresses },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockIngresses)
      expect(mockK8sApi.listNamespacedIngress).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockIngresses = [createIngress('my-ingress', 'my-namespace-123')]
      mockK8sApi.listNamespacedIngress.mockResolvedValue({
        body: { items: mockIngresses },
      })

      const result = await service.List('my-namespace-123')

      expect(result).toEqual(mockIngresses)
      expect(mockK8sApi.listNamespacedIngress).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should list ingresses in production namespace', async () => {
      const mockIngresses = [
        createIngress('api-ingress', 'production'),
        createIngress('web-ingress', 'production'),
      ]
      mockK8sApi.listNamespacedIngress.mockResolvedValue({
        body: { items: mockIngresses },
      })

      const result = await service.List('production')

      expect(result).toEqual(mockIngresses)
      expect(result).toHaveLength(2)
      expect(mockK8sApi.listNamespacedIngress).toHaveBeenCalledWith('production')
    })

    it('should handle ingresses with multiple rules', async () => {
      const mockIngress = createIngress('multi-rule-ingress', 'default')
      mockIngress.spec!.rules = [
        {
          host: 'api.example.com',
          http: {
            paths: [{
              path: '/',
              pathType: 'Prefix',
              backend: {
                service: { name: 'api-service', port: { number: 80 } },
              },
            }],
          },
        },
        {
          host: 'web.example.com',
          http: {
            paths: [{
              path: '/',
              pathType: 'Prefix',
              backend: {
                service: { name: 'web-service', port: { number: 80 } },
              },
            }],
          },
        },
      ]
      mockK8sApi.listNamespacedIngress.mockResolvedValue({
        body: { items: [mockIngress] },
      })

      const result = await service.List('default')

      expect(result).toHaveLength(1)
      expect(result[0].spec?.rules).toHaveLength(2)
    })

    it('should handle ingresses with TLS configuration', async () => {
      const mockIngress = createIngress('tls-ingress', 'default')
      mockIngress.spec!.tls = [{
        hosts: ['secure.example.com'],
        secretName: 'tls-secret',
      }]
      mockK8sApi.listNamespacedIngress.mockResolvedValue({
        body: { items: [mockIngress] },
      })

      const result = await service.List('default')

      expect(result).toHaveLength(1)
      expect(result[0].spec?.tls).toBeDefined()
      expect(result[0].spec?.tls?.[0].secretName).toBe('tls-secret')
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single ingress by namespace and name', async () => {
      const mockIngress = createIngress('test-ingress', 'default')
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'test-ingress')

      expect(result).toEqual(mockIngress)
      expect(mockK8sApi.readNamespacedIngress).toHaveBeenCalledWith('test-ingress', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('Ingress not found')
      mockK8sApi.readNamespacedIngress.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Ingress not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedIngress.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-ingress')).rejects.toThrow('Namespace does not exist')
    })

    it('should get ingress with basic HTTP rule', async () => {
      const mockIngress = createIngress('http-ingress', 'default')
      mockIngress.spec!.rules = [{
        host: 'example.com',
        http: {
          paths: [{
            path: '/',
            pathType: 'Prefix',
            backend: {
              service: { name: 'backend-service', port: { number: 8080 } },
            },
          }],
        },
      }]
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'http-ingress')

      expect(result).toEqual(mockIngress)
      expect(result.spec?.rules?.[0].host).toBe('example.com')
      expect(result.spec?.rules?.[0].http?.paths?.[0].backend.service?.port?.number).toBe(8080)
    })

    it('should get ingress with TLS configuration', async () => {
      const mockIngress = createIngress('tls-ingress', 'default')
      mockIngress.spec!.tls = [{
        hosts: ['secure.example.com'],
        secretName: 'example-tls-secret',
      }]
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'tls-ingress')

      expect(result).toEqual(mockIngress)
      expect(result.spec?.tls).toBeDefined()
      expect(result.spec?.tls?.[0].secretName).toBe('example-tls-secret')
      expect(result.spec?.tls?.[0].hosts).toContain('secure.example.com')
    })

    it('should get ingress with multiple TLS configurations', async () => {
      const mockIngress = createIngress('multi-tls-ingress', 'default')
      mockIngress.spec!.tls = [
        {
          hosts: ['api.example.com'],
          secretName: 'api-tls-secret',
        },
        {
          hosts: ['web.example.com'],
          secretName: 'web-tls-secret',
        },
      ]
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'multi-tls-ingress')

      expect(result.spec?.tls).toHaveLength(2)
      expect(result.spec?.tls?.[0].secretName).toBe('api-tls-secret')
      expect(result.spec?.tls?.[1].secretName).toBe('web-tls-secret')
    })

    it('should get ingress with path-based routing', async () => {
      const mockIngress = createIngress('path-ingress', 'default')
      mockIngress.spec!.rules = [{
        host: 'example.com',
        http: {
          paths: [
            {
              path: '/api',
              pathType: 'Prefix',
              backend: { service: { name: 'api-service', port: { number: 8080 } } },
            },
            {
              path: '/web',
              pathType: 'Prefix',
              backend: { service: { name: 'web-service', port: { number: 3000 } } },
            },
          ],
        },
      }]
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'path-ingress')

      expect(result.spec?.rules?.[0].http?.paths).toHaveLength(2)
      expect(result.spec?.rules?.[0].http?.paths?.[0].path).toBe('/api')
      expect(result.spec?.rules?.[0].http?.paths?.[1].path).toBe('/web')
    })

    it('should get ingress with Exact pathType', async () => {
      const mockIngress = createIngress('exact-path-ingress', 'default')
      mockIngress.spec!.rules = [{
        host: 'example.com',
        http: {
          paths: [{
            path: '/api/v1/users',
            pathType: 'Exact',
            backend: { service: { name: 'user-service', port: { number: 8080 } } },
          }],
        },
      }]
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'exact-path-ingress')

      expect(result.spec?.rules?.[0].http?.paths?.[0].pathType).toBe('Exact')
      expect(result.spec?.rules?.[0].http?.paths?.[0].path).toBe('/api/v1/users')
    })

    it('should get ingress with IngressClassName', async () => {
      const mockIngress = createIngress('nginx-class-ingress', 'default')
      mockIngress.spec!.ingressClassName = 'nginx'
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'nginx-class-ingress')

      expect(result.spec?.ingressClassName).toBe('nginx')
    })

    it('should get ingress with legacy IngressClass annotation', async () => {
      const mockIngress = createIngress('legacy-class-ingress', 'default')
      if (!mockIngress.metadata!.annotations)
        mockIngress.metadata!.annotations = {}

      mockIngress.metadata!.annotations['kubernetes.io/ingress.class'] = 'nginx'
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'legacy-class-ingress')

      expect(result.metadata?.annotations?.['kubernetes.io/ingress.class']).toBe('nginx')
    })

    it('should get ingress with custom annotations', async () => {
      const mockIngress = createIngress('annotated-ingress', 'default')
      mockIngress.metadata!.annotations = {
        'nginx.ingress.kubernetes.io/rewrite-target': '/',
        'nginx.ingress.kubernetes.io/ssl-redirect': 'true',
        'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
      }
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'annotated-ingress')

      expect(result.metadata?.annotations?.['nginx.ingress.kubernetes.io/rewrite-target']).toBe('/')
      expect(result.metadata?.annotations?.['nginx.ingress.kubernetes.io/ssl-redirect']).toBe('true')
      expect(result.metadata?.annotations?.['cert-manager.io/cluster-issuer']).toBe('letsencrypt-prod')
    })

    it('should get ingress with multiple hosts', async () => {
      const mockIngress = createIngress('multi-host-ingress', 'default')
      mockIngress.spec!.rules = [
        {
          host: 'api.example.com',
          http: {
            paths: [{
              path: '/',
              pathType: 'Prefix',
              backend: { service: { name: 'api-service', port: { number: 80 } } },
            }],
          },
        },
        {
          host: 'web.example.com',
          http: {
            paths: [{
              path: '/',
              pathType: 'Prefix',
              backend: { service: { name: 'web-service', port: { number: 80 } } },
            }],
          },
        },
      ]
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'multi-host-ingress')

      expect(result.spec?.rules).toHaveLength(2)
      expect(result.spec?.rules?.[0].host).toBe('api.example.com')
      expect(result.spec?.rules?.[1].host).toBe('web.example.com')
    })

    it('should get ingress with named service port', async () => {
      const mockIngress = createIngress('named-port-ingress', 'default')
      mockIngress.spec!.rules = [{
        host: 'example.com',
        http: {
          paths: [{
            path: '/',
            pathType: 'Prefix',
            backend: {
              service: { name: 'backend-service', port: { name: 'http' } },
            },
          }],
        },
      }]
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'named-port-ingress')

      expect(result.spec?.rules?.[0].http?.paths?.[0].backend.service?.port?.name).toBe('http')
    })

    it('should get ingress with default backend', async () => {
      const mockIngress = createIngress('default-backend-ingress', 'default')
      mockIngress.spec!.defaultBackend = {
        service: {
          name: 'default-backend',
          port: { number: 80 },
        },
      }
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'default-backend-ingress')

      expect(result.spec?.defaultBackend).toBeDefined()
      expect(result.spec?.defaultBackend?.service?.name).toBe('default-backend')
    })

    it('should handle ingress names with hyphens and numbers', async () => {
      const mockIngress = createIngress('my-ingress-123', 'default')
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'my-ingress-123')

      expect(result).toEqual(mockIngress)
      expect(mockK8sApi.readNamespacedIngress).toHaveBeenCalledWith('my-ingress-123', 'default')
    })

    it('should handle ingress in different namespace', async () => {
      const mockIngress = createIngress('staging-ingress', 'staging')
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('staging', 'staging-ingress')

      expect(result.metadata?.namespace).toBe('staging')
      expect(mockK8sApi.readNamespacedIngress).toHaveBeenCalledWith('staging-ingress', 'staging')
    })

    it('should get ingress with ImplementationSpecific pathType', async () => {
      const mockIngress = createIngress('impl-path-ingress', 'default')
      mockIngress.spec!.rules = [{
        host: 'example.com',
        http: {
          paths: [{
            path: '/.*',
            pathType: 'ImplementationSpecific',
            backend: { service: { name: 'regex-service', port: { number: 8080 } } },
          }],
        },
      }]
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'impl-path-ingress')

      expect(result.spec?.rules?.[0].http?.paths?.[0].pathType).toBe('ImplementationSpecific')
    })
  })

  describe('Delete', () => {
    it('should delete an ingress', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedIngress.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-ingress', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedIngress).toHaveBeenCalledWith('test-ingress', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedIngress.mockRejectedValue(error)

      await expect(service.Delete('test-ingress', 'default')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent ingress', async () => {
      const error = new Error('Ingress not found')
      mockK8sApi.deleteNamespacedIngress.mockRejectedValue(error)

      await expect(service.Delete('nonexistent', 'default')).rejects.toThrow('Ingress not found')
    })

    it('should delete ingress from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedIngress.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-ingress', 'kube-system')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedIngress).toHaveBeenCalledWith('my-ingress', 'kube-system')
    })

    it('should handle ingress with finalizers', async () => {
      const mockResponse = { status: 'Success', metadata: { finalizers: ['kubernetes'] } }
      mockK8sApi.deleteNamespacedIngress.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('ingress-with-finalizer', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNamespacedIngress.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete ingresses')
      mockK8sApi.deleteNamespacedIngress.mockRejectedValue(error)

      await expect(service.Delete('test-ingress', 'default')).rejects.toThrow('Forbidden')
    })

    it('should delete ingress from production namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedIngress.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('api-ingress', 'production')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedIngress).toHaveBeenCalledWith('api-ingress', 'production')
    })

    it('should delete ingress with TLS configuration', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedIngress.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('tls-ingress', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedIngress).toHaveBeenCalledWith('tls-ingress', 'default')
    })

    it('should handle deletion of ingress with multiple rules', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedIngress.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('multi-rule-ingress', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle namespace not found error', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.deleteNamespacedIngress.mockRejectedValue(error)

      await expect(service.Delete('test-ingress', 'invalid-namespace')).rejects.toThrow('Namespace does not exist')
    })

    it('should handle conflict errors during deletion', async () => {
      const error = new Error('Conflict: Resource version mismatch')
      mockK8sApi.deleteNamespacedIngress.mockRejectedValue(error)

      await expect(service.Delete('test-ingress', 'default')).rejects.toThrow('Conflict')
    })

    it('should delete ingress with custom IngressClass', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedIngress.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('nginx-ingress', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedIngress).toHaveBeenCalledWith('nginx-ingress', 'default')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s API', async () => {
      const mockIngresses = [createIngress('test-ingress')]
      mockK8sApi.listIngressForAllNamespaces.mockResolvedValue({
        body: { items: mockIngresses },
      })

      await service.List()

      expect(clientService.getNetworkingV1Api).toHaveBeenCalled()
    })

    it('should call getNetworkingV1Api for every operation', async () => {
      mockK8sApi.listIngressForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedIngress.mockResolvedValue({ body: createIngress('test') })
      mockK8sApi.deleteNamespacedIngress.mockResolvedValue({ body: { status: 'Success' } })

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('test', 'default')

      expect(clientService.getNetworkingV1Api).toHaveBeenCalledTimes(4)
    })

    it('should use NetworkingV1Api for listing all ingresses', async () => {
      mockK8sApi.listIngressForAllNamespaces.mockResolvedValue({ body: { items: [] } })

      await service.List()

      expect(clientService.getNetworkingV1Api).toHaveBeenCalled()
      expect(mockK8sApi.listIngressForAllNamespaces).toHaveBeenCalled()
    })

    it('should use NetworkingV1Api for namespaced listing', async () => {
      mockK8sApi.listNamespacedIngress.mockResolvedValue({ body: { items: [] } })

      await service.List('default')

      expect(clientService.getNetworkingV1Api).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedIngress).toHaveBeenCalledWith('default')
    })

    it('should use NetworkingV1Api for reading single ingress', async () => {
      mockK8sApi.readNamespacedIngress.mockResolvedValue({ body: createIngress('test') })

      await service.GetOneByNsName('default', 'test')

      expect(clientService.getNetworkingV1Api).toHaveBeenCalled()
      expect(mockK8sApi.readNamespacedIngress).toHaveBeenCalledWith('test', 'default')
    })

    it('should use NetworkingV1Api for deletion', async () => {
      mockK8sApi.deleteNamespacedIngress.mockResolvedValue({ body: { status: 'Success' } })

      await service.Delete('test', 'default')

      expect(clientService.getNetworkingV1Api).toHaveBeenCalled()
      expect(mockK8sApi.deleteNamespacedIngress).toHaveBeenCalledWith('test', 'default')
    })
  })

  describe('Edge Cases', () => {
    it('should handle ingress with no rules', async () => {
      const mockIngress = createIngress('no-rules-ingress', 'default')
      mockIngress.spec!.rules = []
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'no-rules-ingress')

      expect(result.spec?.rules).toEqual([])
    })

    it('should handle ingress with undefined spec', async () => {
      const mockIngress = createIngress('undefined-spec-ingress', 'default')
      mockIngress.spec = undefined
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'undefined-spec-ingress')

      expect(result.spec).toBeUndefined()
    })

    it('should handle empty TLS array', async () => {
      const mockIngress = createIngress('empty-tls-ingress', 'default')
      mockIngress.spec!.tls = []
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'empty-tls-ingress')

      expect(result.spec?.tls).toEqual([])
    })

    it('should handle ingress with wildcard host', async () => {
      const mockIngress = createIngress('wildcard-ingress', 'default')
      mockIngress.spec!.rules = [{
        host: '*.example.com',
        http: {
          paths: [{
            path: '/',
            pathType: 'Prefix',
            backend: { service: { name: 'wildcard-service', port: { number: 80 } } },
          }],
        },
      }]
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'wildcard-ingress')

      expect(result.spec?.rules?.[0].host).toBe('*.example.com')
    })

    it('should handle ingress with no host specified', async () => {
      const mockIngress = createIngress('no-host-ingress', 'default')
      mockIngress.spec!.rules = [{
        http: {
          paths: [{
            path: '/',
            pathType: 'Prefix',
            backend: { service: { name: 'default-service', port: { number: 80 } } },
          }],
        },
      }]
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', 'no-host-ingress')

      expect(result.spec?.rules?.[0].host).toBeUndefined()
    })

    it('should handle very long ingress names', async () => {
      const longName = 'very-long-ingress-name-that-is-still-valid-in-kubernetes-but-quite-lengthy'
      const mockIngress = createIngress(longName, 'default')
      mockK8sApi.readNamespacedIngress.mockResolvedValue({
        body: mockIngress,
      })

      const result = await service.GetOneByNsName('default', longName)

      expect(result.metadata?.name).toBe(longName)
    })

    it('should handle API timeout errors', async () => {
      const error = new Error('Request timeout')
      mockK8sApi.listIngressForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('Request timeout')
    })

    it('should handle network errors', async () => {
      const error = new Error('Network unreachable')
      mockK8sApi.readNamespacedIngress.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'test-ingress')).rejects.toThrow('Network unreachable')
    })
  })
})
