import { Readable } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { K8sService } from '@backend/k8s/k8s.service'
import { StreamableFile } from '@nestjs/common'
import { createPod } from '../../../../test/utils/k8s-mocks'
import { PodController } from './pod.controller'

describe('PodController', () => {
  let controller: PodController
  let k8sService: K8sService

  beforeEach(() => {
    const mockPodService = {
      List: vi.fn(),
      GetOne: vi.fn(),
      ListByNodeName: vi.fn(),
      ListByLabelSelector: vi.fn(),
      Delete: vi.fn(),
      GetContainerLogs: vi.fn(),
    }

    const mockK8sService = {
      podService: mockPodService,
    } as any

    // Create controller directly with mocked dependencies
    controller = new PodController(mockK8sService)
    k8sService = mockK8sService
  })

  describe('List', () => {
    it('should return all pods', async () => {
      const mockPods = [
        createPod('pod-1', 'default'),
        createPod('pod-2', 'default'),
        createPod('pod-3', 'default'),
        createPod('pod-4', 'default'),
        createPod('pod-5', 'default'),
      ]
      k8sService.podService.List.mockResolvedValue(mockPods)

      const result = await controller.List()

      expect(result).toEqual(mockPods)
      expect(k8sService.podService.List).toHaveBeenCalledWith()
      expect(result).toHaveLength(5)
    })

    it('should handle empty pod list', async () => {
      k8sService.podService.List.mockResolvedValue([])

      const result = await controller.List()

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('should handle service errors', async () => {
      k8sService.podService.List.mockRejectedValue(new Error('API Error'))

      await expect(controller.List()).rejects.toThrow('API Error')
    })
  })

  describe('ListByNs', () => {
    it('should return pods from specific namespace', async () => {
      const mockPods = [createPod('pod-1', 'default'), createPod('pod-2', 'default'), createPod('pod-3', 'default'), createPod('pod-4', 'default'), createPod('pod-5', 'default'), createPod('pod-6', 'default'), createPod('pod-7', 'default'), createPod('pod-8', 'default')]
      k8sService.podService.List.mockResolvedValue(mockPods)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockPods)
      expect(k8sService.podService.List).toHaveBeenCalledWith('kube-system')
    })

    it('should handle namespace with no pods', async () => {
      k8sService.podService.List.mockResolvedValue([])

      const result = await controller.ListByNs('empty-ns')

      expect(result).toEqual([])
    })

    it('should handle special characters in namespace', async () => {
      const mockPods = [createPod('pod-1', 'default'), createPod('pod-2', 'default'), createPod('pod-3', 'default'), createPod('pod-4', 'default'), createPod('pod-5', 'default'), createPod('pod-6', 'default'), createPod('pod-7', 'default'), createPod('pod-8', 'default')]
      k8sService.podService.List.mockResolvedValue(mockPods)

      const result = await controller.ListByNs('my-namespace-123')

      expect(result).toEqual(mockPods)
      expect(k8sService.podService.List).toHaveBeenCalledWith('my-namespace-123')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a specific pod', async () => {
      const mockPod = createPod()
      k8sService.podService.GetOne.mockResolvedValue(mockPod)

      const result = await controller.GetOneByNsName('default', 'test-pod')

      expect(result).toEqual(mockPod)
      expect(k8sService.podService.GetOne).toHaveBeenCalledWith('default', 'test-pod')
    })

    it('should handle pod not found', async () => {
      k8sService.podService.GetOne.mockRejectedValue(new Error('Pod not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent'))
        .rejects.toThrow('Pod not found')
    })

    it('should handle invalid namespace', async () => {
      k8sService.podService.GetOne.mockRejectedValue(new Error('Namespace not found'))

      await expect(controller.GetOneByNsName('invalid-ns', 'test-pod'))
        .rejects.toThrow('Namespace not found')
    })
  })

  describe('ListByNodeName', () => {
    it('should return pods on specific node', async () => {
      const mockPods = [createPod('pod-1', 'default'), createPod('pod-2', 'default'), createPod('pod-3', 'default'), createPod('pod-4', 'default'), createPod('pod-5', 'default'), createPod('pod-6', 'default'), createPod('pod-7', 'default'), createPod('pod-8', 'default')]
      k8sService.podService.ListByNodeName.mockResolvedValue(mockPods)

      const result = await controller.ListByNodeName('node-1')

      expect(result).toEqual(mockPods)
      expect(k8sService.podService.ListByNodeName).toHaveBeenCalledWith('node-1')
    })

    it('should handle node with no pods', async () => {
      k8sService.podService.ListByNodeName.mockResolvedValue([])

      const result = await controller.ListByNodeName('empty-node')

      expect(result).toEqual([])
    })
  })

  describe('ListByLabelSelector', () => {
    it('should return pods matching label selector', async () => {
      const mockPods = [createPod('pod-1', 'default'), createPod('pod-2', 'default'), createPod('pod-3', 'default'), createPod('pod-4', 'default'), createPod('pod-5', 'default'), createPod('pod-6', 'default'), createPod('pod-7', 'default'), createPod('pod-8', 'default')]
      k8sService.podService.ListByLabelSelector.mockResolvedValue(mockPods)

      const result = await controller.ListByLabelSelector('app=nginx')

      expect(result).toEqual(mockPods)
      expect(k8sService.podService.ListByLabelSelector).toHaveBeenCalledWith('app=nginx')
    })

    it('should handle complex label selectors', async () => {
      const mockPods = [createPod('pod-1', 'default'), createPod('pod-2', 'default'), createPod('pod-3', 'default'), createPod('pod-4', 'default'), createPod('pod-5', 'default'), createPod('pod-6', 'default'), createPod('pod-7', 'default'), createPod('pod-8', 'default')]
      k8sService.podService.ListByLabelSelector.mockResolvedValue(mockPods)

      const selector = 'app=nginx,environment=production'
      const result = await controller.ListByLabelSelector(selector)

      expect(result).toEqual(mockPods)
      expect(k8sService.podService.ListByLabelSelector).toHaveBeenCalledWith(selector)
    })

    it('should handle no matching pods', async () => {
      k8sService.podService.ListByLabelSelector.mockResolvedValue([])

      const result = await controller.ListByLabelSelector('app=nonexistent')

      expect(result).toEqual([])
    })
  })

  describe('Delete', () => {
    it('should delete single pod', async () => {
      k8sService.podService.Delete.mockResolvedValue({})

      const result = await controller.Delete(['default/test-pod'])

      expect(result).toBe('ok')
      expect(k8sService.podService.Delete).toHaveBeenCalledWith('test-pod', 'default')
      expect(k8sService.podService.Delete).toHaveBeenCalledTimes(1)
    })

    it('should delete multiple pods', async () => {
      k8sService.podService.Delete.mockResolvedValue({})

      const result = await controller.Delete([
        'default/pod-1',
        'kube-system/pod-2',
        'default/pod-3',
      ])

      expect(result).toBe('ok')
      expect(k8sService.podService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.podService.Delete).toHaveBeenCalledWith('pod-1', 'default')
      expect(k8sService.podService.Delete).toHaveBeenCalledWith('pod-2', 'kube-system')
      expect(k8sService.podService.Delete).toHaveBeenCalledWith('pod-3', 'default')
    })

    it('should handle empty array', async () => {
      const result = await controller.Delete([])

      expect(result).toBe('ok')
      expect(k8sService.podService.Delete).not.toHaveBeenCalled()
    })

    it('should handle delete with namespace containing slash', async () => {
      k8sService.podService.Delete.mockResolvedValue({})

      const result = await controller.Delete(['my-ns/my-pod/extra'])

      expect(result).toBe('ok')
      // Note: split('/') splits on all slashes, so 'my-ns/my-pod/extra' becomes ['my-ns', 'my-pod', 'extra']
      // ns = nsname[0] = 'my-ns', name = nsname[1] = 'my-pod'
      expect(k8sService.podService.Delete).toHaveBeenCalledWith('my-pod', 'my-ns')
    })
  })

  describe('GetContainerLogs', () => {
    it('should return container logs as StreamableFile', () => {
      const mockStream = new Readable()
      mockStream.push('log line 1\n')
      mockStream.push('log line 2\n')
      mockStream.push(null)

      k8sService.podService.GetContainerLogs.mockReturnValue(mockStream)

      const result = controller.GetContainerLogs('default', 'test-pod', 'nginx')

      expect(result).toBeInstanceOf(StreamableFile)
      expect(k8sService.podService.GetContainerLogs).toHaveBeenCalledWith(
        'default',
        'test-pod',
        'nginx',
      )
    })

    it('should handle different container names', () => {
      const mockStream = new Readable()
      k8sService.podService.GetContainerLogs.mockReturnValue(mockStream)

      const result = controller.GetContainerLogs('kube-system', 'coredns', 'coredns-container')

      expect(result).toBeInstanceOf(StreamableFile)
      expect(k8sService.podService.GetContainerLogs).toHaveBeenCalledWith(
        'kube-system',
        'coredns',
        'coredns-container',
      )
    })
  })

  describe('GetContainerLogsUrl', () => {
    it('should return container logs URL', () => {
      const mockRequest = {
        headers: {
          host: 'localhost:3007',
        },
      } as any

      const result = controller.GetContainerLogsUrl('default', 'test-pod', 'nginx', mockRequest)

      expect(result).toBe('http://localhost:3007/k8s/Pod/log/file/default/test-pod/nginx')
    })

    it('should handle different hosts', () => {
      const mockRequest = {
        headers: {
          host: 'k8s-playground.example.com',
        },
      } as any

      const result = controller.GetContainerLogsUrl('prod', 'app-pod', 'app', mockRequest)

      expect(result).toBe('http://k8s-playground.example.com/k8s/Pod/log/file/prod/app-pod/app')
    })

    it('should handle special characters in parameters', () => {
      const mockRequest = {
        headers: {
          host: 'localhost:3007',
        },
      } as any

      const result = controller.GetContainerLogsUrl('my-ns-123', 'pod-name-456', 'container-789', mockRequest)

      expect(result).toBe('http://localhost:3007/k8s/Pod/log/file/my-ns-123/pod-name-456/container-789')
    })
  })
})
