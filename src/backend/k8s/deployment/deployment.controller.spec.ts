import { beforeEach, describe, expect, it } from 'vitest'
import { createDeployment } from '../../../../test/utils/k8s-mocks'
import { DeploymentController } from './deployment.controller'

describe('DeploymentController', () => {
  let controller: DeploymentController
  let k8sService: any

  beforeEach(async () => {
    const mockDeploymentService = {
      List: vi.fn(),
      Delete: vi.fn(),
      Restart: vi.fn(),
      Scale: vi.fn(),
      GetOneByNsName: vi.fn(),
    }

    k8sService = {
      deploymentService: mockDeploymentService,
    } as any

    controller = new DeploymentController(k8sService)
  })

  describe('List', () => {
    it('should return all deployments', async () => {
      const mockDeployments = [createDeployment('deployment-1', 'default'), createDeployment('deployment-2', 'default'), createDeployment('deployment-3', 'default'), createDeployment('deployment-4', 'default'), createDeployment('deployment-5', 'default'), createDeployment('deployment-6', 'default'), createDeployment('deployment-7', 'default'), createDeployment('deployment-8', 'default')]
      k8sService.deploymentService.List.mockResolvedValue(mockDeployments)

      const result = await controller.List()

      expect(result).toEqual(mockDeployments)
      expect(k8sService.deploymentService.List).toHaveBeenCalledWith()
    })

    it('should handle empty deployment list', async () => {
      k8sService.deploymentService.List.mockResolvedValue([])

      const result = await controller.List()

      expect(result).toEqual([])
    })
  })

  describe('ListByNs', () => {
    it('should return deployments from specific namespace', async () => {
      const mockDeployments = [createDeployment('deployment-1', 'default'), createDeployment('deployment-2', 'default'), createDeployment('deployment-3', 'default'), createDeployment('deployment-4', 'default'), createDeployment('deployment-5', 'default'), createDeployment('deployment-6', 'default'), createDeployment('deployment-7', 'default'), createDeployment('deployment-8', 'default')]
      k8sService.deploymentService.List.mockResolvedValue(mockDeployments)

      const result = await controller.ListByNs('production')

      expect(result).toEqual(mockDeployments)
      expect(k8sService.deploymentService.List).toHaveBeenCalledWith('production')
    })
  })

  describe('Delete', () => {
    it('should delete single deployment', async () => {
      k8sService.deploymentService.Delete.mockResolvedValue({})

      const result = await controller.Delete(['default/nginx-deployment'])

      expect(result).toEqual({})
      expect(k8sService.deploymentService.Delete).toHaveBeenCalledWith('default', 'nginx-deployment')
    })

    it('should delete multiple deployments', async () => {
      k8sService.deploymentService.Delete.mockResolvedValue({})

      await controller.Delete([
        'default/deploy-1',
        'kube-system/deploy-2',
      ])

      expect(k8sService.deploymentService.Delete).toHaveBeenCalledTimes(2)
    })
  })

  describe('Restart', () => {
    it('should restart deployment', async () => {
      const mockDeployment = createDeployment()
      k8sService.deploymentService.Restart.mockResolvedValue(mockDeployment)

      const result = await controller.Restart('default', 'nginx-deployment')

      expect(result).toEqual(mockDeployment)
      expect(k8sService.deploymentService.Restart).toHaveBeenCalledWith('default', 'nginx-deployment')
    })
  })

  describe('Scale', () => {
    it('should scale deployment to specified replicas', async () => {
      const mockDeployment = createDeployment()
      k8sService.deploymentService.Scale.mockResolvedValue(mockDeployment)

      const result = await controller.Scale('default', 'nginx-deployment', '5')

      expect(result).toEqual(mockDeployment)
      expect(k8sService.deploymentService.Scale).toHaveBeenCalledWith('default', 'nginx-deployment', '5')
    })

    it('should scale down to 0 replicas', async () => {
      const mockDeployment = createDeployment({ spec: { replicas: 0 } as any })
      k8sService.deploymentService.Scale.mockResolvedValue(mockDeployment)

      const result = await controller.Scale('default', 'nginx-deployment', '0')

      expect(result).toEqual(mockDeployment)
      expect(k8sService.deploymentService.Scale).toHaveBeenCalledWith('default', 'nginx-deployment', '0')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return specific deployment', async () => {
      const mockDeployment = createDeployment()
      k8sService.deploymentService.GetOneByNsName.mockResolvedValue(mockDeployment)

      const result = await controller.GetOneByNsName('default', 'nginx-deployment')

      expect(result).toEqual(mockDeployment)
      expect(k8sService.deploymentService.GetOneByNsName).toHaveBeenCalledWith('default', 'nginx-deployment')
    })
  })
})
