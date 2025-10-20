import { beforeEach, describe, expect, it } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '@backend/k8s/client/client.service'
import { createDeployment, createMockClientService } from '../../../../test/utils/k8s-mocks'
import { DeploymentService } from './deployment.service'

describe('DeploymentService', () => {
  let service: DeploymentService
  let _clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getAppsV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DeploymentService,
          useFactory: (clientService: ClientService) => {
            return new DeploymentService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<DeploymentService>(DeploymentService)
    _clientService = mockClientService
  })

  describe('List', () => {
    it('should list all deployments when no namespace specified', async () => {
      const mockDeployments = [createDeployment('deployment-1'), createDeployment('deployment-2'), createDeployment('deployment-3'), createDeployment('deployment-4'), createDeployment('deployment-5')]
      mockK8sApi.listDeploymentForAllNamespaces.mockResolvedValue({
        body: { items: mockDeployments },
      })

      const _result = await service.List()

      expect(_result).toEqual(mockDeployments)
      expect(mockK8sApi.listDeploymentForAllNamespaces).toHaveBeenCalled()
    })

    it('should list all deployments when namespace is null', async () => {
      const mockDeployments = [createDeployment('deployment-1'), createDeployment('deployment-2'), createDeployment('deployment-3')]
      mockK8sApi.listDeploymentForAllNamespaces.mockResolvedValue({
        body: { items: mockDeployments },
      })

      const _result = await service.List('null')

      expect(_result).toEqual(mockDeployments)
    })

    it('should list deployments in specific namespace', async () => {
      const mockDeployments = [createDeployment('deployment-1'), createDeployment('deployment-2')]
      mockK8sApi.listNamespacedDeployment.mockResolvedValue({
        body: { items: mockDeployments },
      })

      const _result = await service.List('production')

      expect(_result).toEqual(mockDeployments)
      expect(mockK8sApi.listNamespacedDeployment).toHaveBeenCalledWith('production')
    })
  })

  describe('Delete', () => {
    it('should delete a deployment', async () => {
      const mockResponse = { kind: 'Deployment', apiVersion: 'apps/v1' }
      mockK8sApi.deleteNamespacedDeployment.mockResolvedValue({
        body: mockResponse,
      })

      const _result = await service.Delete('default', 'nginx-deployment')

      expect(_result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedDeployment).toHaveBeenCalledWith('nginx-deployment', 'default')
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a specific deployment', async () => {
      const mockDeployment = createDeployment('test-deployment')
      mockK8sApi.readNamespacedDeployment.mockResolvedValue({
        body: mockDeployment,
      })

      const _result = await service.GetOneByNsName('default', 'nginx-deployment')

      expect(_result).toEqual(mockDeployment)
      expect(mockK8sApi.readNamespacedDeployment).toHaveBeenCalledWith('nginx-deployment', 'default')
    })
  })

  describe('Restart', () => {
    it('should restart deployment with proper annotations', async () => {
      const mockDeployment = createDeployment('test-deployment')
      mockK8sApi.patchNamespacedDeployment.mockResolvedValue({
        body: mockDeployment,
      })

      const _result = await service.Restart('default', 'nginx-deployment')

      expect(_result).toEqual(mockDeployment)
      expect(mockK8sApi.patchNamespacedDeployment).toHaveBeenCalled()

      const callArgs = mockK8sApi.patchNamespacedDeployment.mock.calls[0]
      expect(callArgs[0]).toBe('nginx-deployment')
      expect(callArgs[1]).toBe('default')
      expect(callArgs[2].spec.template.metadata.annotations['kubectl.kubernetes.io/origin']).toBe('k8s-playgrounds')
      expect(callArgs[8].headers['Content-Type']).toBe('application/strategic-merge-patch+json')
    })
  })

  describe('Scale', () => {
    it('should scale deployment to specified replicas', async () => {
      const mockDeployment = createDeployment('test-deployment', 'default', { spec: { replicas: 5 } as any })
      mockK8sApi.patchNamespacedDeploymentScale.mockResolvedValue({
        body: mockDeployment,
      })

      const _result = await service.Scale('default', 'nginx-deployment', '5')

      expect(_result).toEqual(mockDeployment)
      expect(mockK8sApi.patchNamespacedDeploymentScale).toHaveBeenCalled()

      const callArgs = mockK8sApi.patchNamespacedDeploymentScale.mock.calls[0]
      expect(callArgs[0]).toBe('nginx-deployment')
      expect(callArgs[1]).toBe('default')
      expect(callArgs[2].spec.replicas).toBe(5)
      expect(callArgs[8].headers['Content-Type']).toBe('application/merge-patch+json')
    })

    it('should scale to 0 replicas', async () => {
      const mockDeployment = createDeployment('test-deployment', 'default', { spec: { replicas: 0 } as any })
      mockK8sApi.patchNamespacedDeploymentScale.mockResolvedValue({
        body: mockDeployment,
      })

      const _result = await service.Scale('default', 'nginx-deployment', '0')

      const callArgs = mockK8sApi.patchNamespacedDeploymentScale.mock.calls[0]
      expect(callArgs[2].spec.replicas).toBe(0)
    })

    it('should parse string replicas to number', async () => {
      mockK8sApi.patchNamespacedDeploymentScale.mockResolvedValue({
        body: createDeployment('test-deployment'),
      })

      await service.Scale('default', 'nginx-deployment', '10')

      const callArgs = mockK8sApi.patchNamespacedDeploymentScale.mock.calls[0]
      expect(callArgs[2].spec.replicas).toBe(10)
      expect(typeof callArgs[2].spec.replicas).toBe('number')
    })
  })
})
