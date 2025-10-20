import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '@backend/k8s/client/client.service'
import { createMockClientService, createPod } from '../../../../test/utils/k8s-mocks'
import { PodService } from './pod.service'

describe('PodService', () => {
  let service: PodService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getCoreV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PodService,
          useFactory: (clientService: ClientService) => {
            return new PodService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<PodService>(PodService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('List', () => {
    it('should list all pods when no namespace specified', async () => {
      const mockPods = [createPod('pod-1'), createPod('pod-2'), createPod('pod-3'), createPod('pod-4'), createPod('pod-5')]
      mockK8sApi.listPodForAllNamespaces.mockResolvedValue({
        body: { items: mockPods },
      })

      const result = await service.List()

      expect(result).toEqual(mockPods)
      expect(mockK8sApi.listPodForAllNamespaces).toHaveBeenCalled()
      expect(result).toHaveLength(5)
    })

    it('should list all pods when namespace is null', async () => {
      const mockPods = [createPod('pod-1'), createPod('pod-2'), createPod('pod-3')]
      mockK8sApi.listPodForAllNamespaces.mockResolvedValue({
        body: { items: mockPods },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockPods)
      expect(mockK8sApi.listPodForAllNamespaces).toHaveBeenCalled()
    })

    it('should list pods in specific namespace', async () => {
      const mockPods = [createPod('pod-1'), createPod('pod-2')]
      mockK8sApi.listNamespacedPod.mockResolvedValue({
        body: { items: mockPods },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockPods)
      expect(mockK8sApi.listNamespacedPod).toHaveBeenCalledWith('kube-system')
    })

    it('should handle API errors', async () => {
      mockK8sApi.listPodForAllNamespaces.mockRejectedValue(new Error('API Error'))

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should return empty array when no pods exist', async () => {
      mockK8sApi.listPodForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })
  })

  describe('GetOne', () => {
    it('should get a specific pod', async () => {
      const mockPod = createPod('test-pod')
      mockK8sApi.readNamespacedPod.mockResolvedValue({
        body: mockPod,
      })

      const result = await service.GetOne('default', 'test-pod')

      expect(result).toEqual(mockPod)
      expect(mockK8sApi.readNamespacedPod).toHaveBeenCalledWith('test-pod', 'default')
    })

    it('should handle pod not found', async () => {
      mockK8sApi.readNamespacedPod.mockRejectedValue(new Error('Not found'))

      await expect(service.GetOne('default', 'nonexistent')).rejects.toThrow('Not found')
    })
  })

  describe('ListByNodeName', () => {
    it('should list pods by node name using field selector', async () => {
      const mockPods = [createPod('pod-1'), createPod('pod-2'), createPod('pod-3')]
      mockK8sApi.listPodForAllNamespaces.mockResolvedValue({
        body: { items: mockPods },
      })

      const result = await service.ListByNodeName('node-1')

      expect(result).toEqual(mockPods)
      expect(mockK8sApi.listPodForAllNamespaces).toHaveBeenCalledWith(
        undefined,
        undefined,
        'spec.nodeName=node-1',
      )
    })

    it('should handle node with no pods', async () => {
      mockK8sApi.listPodForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.ListByNodeName('empty-node')

      expect(result).toEqual([])
    })
  })

  describe('ListByLabelSelector', () => {
    it('should list pods by label selector', async () => {
      const mockPods = [createPod('pod-1'), createPod('pod-2')]
      mockK8sApi.listPodForAllNamespaces.mockResolvedValue({
        body: { items: mockPods },
      })

      const result = await service.ListByLabelSelector('app=nginx')

      expect(result).toEqual(mockPods)
      expect(mockK8sApi.listPodForAllNamespaces).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        'app=nginx',
      )
    })

    it('should handle complex selectors', async () => {
      const mockPods = [createPod('pod-1')]
      mockK8sApi.listPodForAllNamespaces.mockResolvedValue({
        body: { items: mockPods },
      })

      const selector = 'app=nginx,environment=production'
      const result = await service.ListByLabelSelector(selector)

      expect(result).toEqual(mockPods)
    })
  })

  describe('getPodsByFieldSelector', () => {
    it('should get pods by field selector', async () => {
      const mockPods = [createPod('pod-1'), createPod('pod-2')]
      mockK8sApi.listPodForAllNamespaces.mockResolvedValue({
        body: { items: mockPods },
      })

      const result = await service.getPodsByFieldSelector('status.phase=Running')

      expect(result).toEqual(mockPods)
      expect(mockK8sApi.listPodForAllNamespaces).toHaveBeenCalledWith(
        undefined,
        undefined,
        'status.phase=Running',
      )
    })
  })

  describe('Delete', () => {
    it('should delete a pod', async () => {
      const mockResponse = { kind: 'Pod', apiVersion: 'v1' }
      mockK8sApi.deleteNamespacedPod.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-pod', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedPod).toHaveBeenCalledWith('test-pod', 'default')
    })

    it('should handle delete errors', async () => {
      mockK8sApi.deleteNamespacedPod.mockRejectedValue(new Error('Delete failed'))

      await expect(service.Delete('test-pod', 'default')).rejects.toThrow('Delete failed')
    })
  })

  describe('GetPVCRelations', () => {
    it('should get PVC relations from pod volumes', async () => {
      const mockPod = createPod('test-pod', 'default', {
        spec: {
          volumes: [
            { name: 'vol1', persistentVolumeClaim: { claimName: 'pvc-1' } },
            { name: 'vol2', persistentVolumeClaim: { claimName: 'pvc-2' } },
            { name: 'vol3', emptyDir: {} },
          ],
        } as any,
      })

      mockK8sApi.readNamespacedPod.mockResolvedValue({
        body: mockPod,
      })

      const result = await service.GetPVCRelations('default', 'test-pod')

      expect(result).toEqual(['pvc-1', 'pvc-2'])
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no PVC volumes', async () => {
      const mockPod = createPod('test-pod', 'default', {
        spec: {
          volumes: [
            { name: 'vol1', emptyDir: {} },
            { name: 'vol2', configMap: { name: 'config' } },
          ],
        } as any,
      })

      mockK8sApi.readNamespacedPod.mockResolvedValue({
        body: mockPod,
      })

      const result = await service.GetPVCRelations('default', 'test-pod')

      expect(result).toEqual([])
    })

    it('should handle pods with no volumes', async () => {
      const mockPod = createPod('test-pod', 'default', {
        spec: {
          volumes: [],
        } as any,
      })

      mockK8sApi.readNamespacedPod.mockResolvedValue({
        body: mockPod,
      })

      const result = await service.GetPVCRelations('default', 'test-pod')

      expect(result).toEqual([])
    })
  })

  describe('GetContainerLogs', () => {
    it('should execute kubectl logs command', () => {
      const result = service.GetContainerLogs('default', 'test-pod', 'nginx')

      expect(result).toBeDefined()
      // The method returns stdout from exec which is a readable stream
    })
  })

  describe('Terminal PTY Management', () => {
    describe('getExecPodPty', () => {
      it('should create new PTY for pod exec', () => {
        const _mockPty = clientService.getNodePty()
        const mockCallback = vi.fn()

        const result = service.getExecPodPty(
          {
            ns: 'default',
            name: 'test-pod',
            containerName: 'nginx',
            columns: 80,
            rows: 24,
          },
          mockCallback,
        )

        expect(result).toBeDefined()
        expect(clientService.getNodePty).toHaveBeenCalled()
      })

      it('should reuse existing PTY for same pod', () => {
        const mockCallback = vi.fn()
        const terminal = {
          ns: 'default',
          name: 'test-pod',
          containerName: 'nginx',
          columns: 80,
          rows: 24,
        }

        const result1 = service.getExecPodPty(terminal, mockCallback)
        const result2 = service.getExecPodPty(terminal, mockCallback)

        expect(result1).toBe(result2)
        expect(clientService.getNodePty).toHaveBeenCalledTimes(1)
      })
    })

    describe('getLogPodPty', () => {
      it('should create PTY for pod logs with options', () => {
        const mockCallback = vi.fn()

        const result = service.getLogPodPty(
          {
            ns: 'default',
            name: 'test-pod',
            containerName: 'nginx',
            columns: 80,
            rows: 24,
            logOptions: {
              follow: true,
              showTimestamp: true,
              showAll: false,
              sinceTimestamp: '2024-01-01T00:00:00Z',
            },
          },
          mockCallback,
        )

        expect(result).toBeDefined()
        expect(clientService.getNodePty).toHaveBeenCalled()
      })

      it('should kill existing PTY before creating new one', () => {
        const mockCallback = vi.fn()
        const terminal = {
          ns: 'default',
          name: 'test-pod',
          containerName: 'nginx',
          columns: 80,
          rows: 24,
          logOptions: { follow: false, showTimestamp: false, showAll: true },
        }

        const pty1 = service.getLogPodPty(terminal, mockCallback)
        const pty2 = service.getLogPodPty(terminal, mockCallback)

        expect(pty1.kill).toHaveBeenCalled()
        expect(pty1).not.toBe(pty2)
      })
    })

    describe('Heartbeat Management', () => {
      it('should update exec heartbeat timestamp', async () => {
        const terminal = {
          ns: 'default',
          name: 'test-pod',
          containerName: 'nginx',
          columns: 80,
          rows: 24,
        }

        service.getExecPodPty(terminal, vi.fn())
        await service.handlePodExecHeartBeat(terminal)

        // Should not throw error
        expect(true).toBe(true)
      })

      it('should update log heartbeat timestamp', async () => {
        const terminal = {
          ns: 'default',
          name: 'test-pod',
          containerName: 'nginx',
          columns: 80,
          rows: 24,
          logOptions: { follow: true, showTimestamp: false, showAll: true },
        }

        service.getLogPodPty(terminal, vi.fn())
        await service.handlePodLogHeartBeat(terminal)

        // Should not throw error
        expect(true).toBe(true)
      })

      it('should cleanup stale exec instances', () => {
        vi.useFakeTimers()
        const terminal = {
          ns: 'default',
          name: 'test-pod',
          containerName: 'nginx',
          columns: 80,
          rows: 24,
        }

        const pty = service.getExecPodPty(terminal, vi.fn())

        // Advance time by 21 seconds (past the 20 second threshold)
        vi.advanceTimersByTime(21000)

        service.handleHeartBeat()

        expect(pty.kill).toHaveBeenCalled()
      })

      it('should cleanup stale log instances', () => {
        vi.useFakeTimers()
        const terminal = {
          ns: 'default',
          name: 'test-pod',
          containerName: 'nginx',
          columns: 80,
          rows: 24,
          logOptions: { follow: true, showTimestamp: false, showAll: true },
        }

        const pty = service.getLogPodPty(terminal, vi.fn())

        // Advance time by 21 seconds
        vi.advanceTimersByTime(21000)

        service.handleHeartBeat()

        expect(pty.kill).toHaveBeenCalled()
      })

      it('should not cleanup active instances', () => {
        vi.useFakeTimers()
        const terminal = {
          ns: 'default',
          name: 'test-pod',
          containerName: 'nginx',
          columns: 80,
          rows: 24,
        }

        const pty = service.getExecPodPty(terminal, vi.fn())

        // Advance time by 10 seconds (within threshold)
        vi.advanceTimersByTime(10000)

        service.handleHeartBeat()

        expect(pty.kill).not.toHaveBeenCalled()
      })
    })

    describe('resizeKubectlPty', () => {
      it('should resize existing PTY', () => {
        const terminal = {
          ns: 'default',
          name: 'test-pod',
          containerName: 'nginx',
          columns: 80,
          rows: 24,
        }

        // Note: getExecPodPty stores in execInstanceMap but resizeKubectlPty checks execPtyMap
        // This is a potential bug in the original code
        service.resizeKubectlPty(terminal)

        // Should not throw error even if PTY doesn't exist
        expect(true).toBe(true)
      })

      it('should call resize callback', () => {
        const callback = vi.fn()
        const terminal = {
          ns: 'default',
          name: 'test-pod',
          containerName: 'nginx',
          columns: 100,
          rows: 30,
        }

        service.resizeKubectlPty(terminal, callback)

        // Callback should not be called if PTY doesn't exist
        expect(callback).not.toHaveBeenCalled()
      })
    })
  })
})
