import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { K8sService } from '../k8s.service'
import { NodeController } from './node.controller'

describe('NodeController', () => {
  let controller: NodeController
  let k8sService: K8sService

  beforeEach(() => {
    const mockNodeService = {
      List: vi.fn(),
      GetOneByName: vi.fn(),
      Delete: vi.fn(),
      Cordon: vi.fn(),
      UnCordon: vi.fn(),
    }

    const mockK8sService = {
      nodeService: mockNodeService,
    } as any

    // Create controller directly with mocked dependencies
    controller = new NodeController(mockK8sService)
    k8sService = mockK8sService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all nodes', async () => {
      const mockNodes = [
        {
          metadata: { name: 'node-1' },
          status: { conditions: [{ type: 'Ready', status: 'True' }] },
        },
        {
          metadata: { name: 'node-2' },
          status: { conditions: [{ type: 'Ready', status: 'True' }] },
        },
      ]
      vi.spyOn(k8sService.nodeService, 'List').mockResolvedValue(mockNodes as any)

      const result = await controller.List()

      expect(result).toEqual(mockNodes)
      expect(k8sService.nodeService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing nodes', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.nodeService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })

    it('should return empty array when no nodes exist', async () => {
      vi.spyOn(k8sService.nodeService, 'List').mockResolvedValue([])

      const result = await controller.List()

      expect(result).toEqual([])
    })

    it('should return nodes with various conditions', async () => {
      const mockNodes = [
        {
          metadata: { name: 'ready-node' },
          status: { conditions: [{ type: 'Ready', status: 'True' }] },
        },
        {
          metadata: { name: 'not-ready-node' },
          status: { conditions: [{ type: 'Ready', status: 'False' }] },
        },
        {
          metadata: { name: 'pressure-node' },
          status: {
            conditions: [
              { type: 'Ready', status: 'True' },
              { type: 'MemoryPressure', status: 'True' },
            ],
          },
        },
      ]
      vi.spyOn(k8sService.nodeService, 'List').mockResolvedValue(mockNodes as any)

      const result = await controller.List()

      expect(result).toEqual(mockNodes)
      expect(result).toHaveLength(3)
    })
  })

  describe('GetOneByName', () => {
    it('should return a single node by name', async () => {
      const mockNode = {
        metadata: { name: 'test-node' },
        status: {
          conditions: [{ type: 'Ready', status: 'True' }],
          addresses: [
            { type: 'InternalIP', address: '192.168.1.100' },
            { type: 'Hostname', address: 'test-node' },
          ],
        },
      }
      vi.spyOn(k8sService.nodeService, 'GetOneByName').mockResolvedValue(mockNode as any)

      const result = await controller.GetOneByName('test-node')

      expect(result).toEqual(mockNode)
      expect(k8sService.nodeService.GetOneByName).toHaveBeenCalledWith('test-node')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.nodeService, 'GetOneByName').mockRejectedValue(new Error('Node not found'))

      await expect(controller.GetOneByName('nonexistent')).rejects.toThrow('Node not found')
    })

    it('should handle node with Ready condition', async () => {
      const mockNode = {
        metadata: { name: 'ready-node' },
        status: {
          conditions: [
            { type: 'Ready', status: 'True', reason: 'KubeletReady' },
          ],
        },
      }
      vi.spyOn(k8sService.nodeService, 'GetOneByName').mockResolvedValue(mockNode as any)

      const result = await controller.GetOneByName('ready-node')

      expect(result).toEqual(mockNode)
      expect(result.status?.conditions?.[0].type).toBe('Ready')
      expect(result.status?.conditions?.[0].status).toBe('True')
    })

    it('should handle node with MemoryPressure condition', async () => {
      const mockNode = {
        metadata: { name: 'memory-pressure-node' },
        status: {
          conditions: [
            { type: 'Ready', status: 'True' },
            { type: 'MemoryPressure', status: 'True' },
          ],
        },
      }
      vi.spyOn(k8sService.nodeService, 'GetOneByName').mockResolvedValue(mockNode as any)

      const result = await controller.GetOneByName('memory-pressure-node')

      expect(result).toEqual(mockNode)
      expect(result.status?.conditions?.find(c => c.type === 'MemoryPressure')).toBeDefined()
    })

    it('should handle node with DiskPressure condition', async () => {
      const mockNode = {
        metadata: { name: 'disk-pressure-node' },
        status: {
          conditions: [
            { type: 'Ready', status: 'True' },
            { type: 'DiskPressure', status: 'True' },
          ],
        },
      }
      vi.spyOn(k8sService.nodeService, 'GetOneByName').mockResolvedValue(mockNode as any)

      const result = await controller.GetOneByName('disk-pressure-node')

      expect(result).toEqual(mockNode)
      expect(result.status?.conditions?.find(c => c.type === 'DiskPressure')).toBeDefined()
    })

    it('should handle node with PIDPressure condition', async () => {
      const mockNode = {
        metadata: { name: 'pid-pressure-node' },
        status: {
          conditions: [
            { type: 'Ready', status: 'True' },
            { type: 'PIDPressure', status: 'True' },
          ],
        },
      }
      vi.spyOn(k8sService.nodeService, 'GetOneByName').mockResolvedValue(mockNode as any)

      const result = await controller.GetOneByName('pid-pressure-node')

      expect(result).toEqual(mockNode)
      expect(result.status?.conditions?.find(c => c.type === 'PIDPressure')).toBeDefined()
    })

    it('should handle node with multiple pressure conditions', async () => {
      const mockNode = {
        metadata: { name: 'multi-pressure-node' },
        status: {
          conditions: [
            { type: 'Ready', status: 'False' },
            { type: 'MemoryPressure', status: 'True' },
            { type: 'DiskPressure', status: 'True' },
            { type: 'PIDPressure', status: 'True' },
          ],
        },
      }
      vi.spyOn(k8sService.nodeService, 'GetOneByName').mockResolvedValue(mockNode as any)

      const result = await controller.GetOneByName('multi-pressure-node')

      expect(result).toEqual(mockNode)
      expect(result.status?.conditions).toHaveLength(4)
    })

    it('should handle node with special characters in name', async () => {
      const mockNode = {
        metadata: { name: 'node-123-worker' },
        status: { conditions: [{ type: 'Ready', status: 'True' }] },
      }
      vi.spyOn(k8sService.nodeService, 'GetOneByName').mockResolvedValue(mockNode as any)

      const result = await controller.GetOneByName('node-123-worker')

      expect(result).toEqual(mockNode)
      expect(k8sService.nodeService.GetOneByName).toHaveBeenCalledWith('node-123-worker')
    })
  })

  describe('Delete', () => {
    it('should delete a node', async () => {
      const mockResponse = { status: 'Success' }
      vi.spyOn(k8sService.nodeService, 'Delete').mockResolvedValue(mockResponse as any)

      const result = await controller.Delete('test-node')

      expect(result).toEqual(mockResponse)
      expect(k8sService.nodeService.Delete).toHaveBeenCalledWith('test-node')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      vi.spyOn(k8sService.nodeService, 'Delete').mockRejectedValue(error)

      await expect(controller.Delete('test-node')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent node', async () => {
      const error = new Error('Node not found')
      vi.spyOn(k8sService.nodeService, 'Delete').mockRejectedValue(error)

      await expect(controller.Delete('nonexistent')).rejects.toThrow('Node not found')
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete nodes')
      vi.spyOn(k8sService.nodeService, 'Delete').mockRejectedValue(error)

      await expect(controller.Delete('test-node')).rejects.toThrow('Forbidden')
    })

    it('should delete master node', async () => {
      const mockResponse = { status: 'Success' }
      vi.spyOn(k8sService.nodeService, 'Delete').mockResolvedValue(mockResponse as any)

      const result = await controller.Delete('master-node')

      expect(result).toEqual(mockResponse)
      expect(k8sService.nodeService.Delete).toHaveBeenCalledWith('master-node')
    })

    it('should delete worker node', async () => {
      const mockResponse = { status: 'Success' }
      vi.spyOn(k8sService.nodeService, 'Delete').mockResolvedValue(mockResponse as any)

      const result = await controller.Delete('worker-node')

      expect(result).toEqual(mockResponse)
      expect(k8sService.nodeService.Delete).toHaveBeenCalledWith('worker-node')
    })
  })

  describe('Cordon', () => {
    it('should cordon a node', async () => {
      const mockNode = {
        metadata: { name: 'test-node' },
        spec: { unschedulable: true },
        status: { conditions: [{ type: 'Ready', status: 'True' }] },
      }
      vi.spyOn(k8sService.nodeService, 'Cordon').mockResolvedValue(mockNode as any)

      const result = await controller.Cordon('test-node')

      expect(result).toEqual(mockNode)
      expect(k8sService.nodeService.Cordon).toHaveBeenCalledWith('test-node')
      expect(result.spec?.unschedulable).toBe(true)
    })

    it('should handle cordon errors', async () => {
      const error = new Error('Cordon failed')
      vi.spyOn(k8sService.nodeService, 'Cordon').mockRejectedValue(error)

      await expect(controller.Cordon('test-node')).rejects.toThrow('Cordon failed')
    })

    it('should cordon node that is not ready', async () => {
      const mockNode = {
        metadata: { name: 'not-ready-node' },
        spec: { unschedulable: true },
        status: { conditions: [{ type: 'Ready', status: 'False' }] },
      }
      vi.spyOn(k8sService.nodeService, 'Cordon').mockResolvedValue(mockNode as any)

      const result = await controller.Cordon('not-ready-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBe(true)
    })

    it('should cordon already cordoned node', async () => {
      const mockNode = {
        metadata: { name: 'already-cordoned' },
        spec: { unschedulable: true },
        status: { conditions: [{ type: 'Ready', status: 'True' }] },
      }
      vi.spyOn(k8sService.nodeService, 'Cordon').mockResolvedValue(mockNode as any)

      const result = await controller.Cordon('already-cordoned')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBe(true)
    })

    it('should handle not found errors when cordoning', async () => {
      vi.spyOn(k8sService.nodeService, 'Cordon').mockRejectedValue(new Error('Node not found'))

      await expect(controller.Cordon('nonexistent')).rejects.toThrow('Node not found')
    })

    it('should cordon master node', async () => {
      const mockNode = {
        metadata: { name: 'master-node', labels: { 'node-role.kubernetes.io/master': '' } },
        spec: { unschedulable: true },
        status: { conditions: [{ type: 'Ready', status: 'True' }] },
      }
      vi.spyOn(k8sService.nodeService, 'Cordon').mockResolvedValue(mockNode as any)

      const result = await controller.Cordon('master-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBe(true)
    })

    it('should cordon node with running pods', async () => {
      const mockNode = {
        metadata: { name: 'busy-node' },
        spec: { unschedulable: true },
        status: { conditions: [{ type: 'Ready', status: 'True' }] },
      }
      vi.spyOn(k8sService.nodeService, 'Cordon').mockResolvedValue(mockNode as any)

      const result = await controller.Cordon('busy-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBe(true)
    })
  })

  describe('UnCordon', () => {
    it('should uncordon a node', async () => {
      const mockNode = {
        metadata: { name: 'test-node' },
        spec: { unschedulable: null },
        status: { conditions: [{ type: 'Ready', status: 'True' }] },
      }
      vi.spyOn(k8sService.nodeService, 'UnCordon').mockResolvedValue(mockNode as any)

      const result = await controller.UnCordon('test-node')

      expect(result).toEqual(mockNode)
      expect(k8sService.nodeService.UnCordon).toHaveBeenCalledWith('test-node')
      expect(result.spec?.unschedulable).toBeNull()
    })

    it('should handle uncordon errors', async () => {
      const error = new Error('UnCordon failed')
      vi.spyOn(k8sService.nodeService, 'UnCordon').mockRejectedValue(error)

      await expect(controller.UnCordon('test-node')).rejects.toThrow('UnCordon failed')
    })

    it('should uncordon cordoned node', async () => {
      const mockNode = {
        metadata: { name: 'cordoned-node' },
        spec: { unschedulable: null },
        status: { conditions: [{ type: 'Ready', status: 'True' }] },
      }
      vi.spyOn(k8sService.nodeService, 'UnCordon').mockResolvedValue(mockNode as any)

      const result = await controller.UnCordon('cordoned-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBeNull()
    })

    it('should uncordon already uncordoned node', async () => {
      const mockNode = {
        metadata: { name: 'already-uncordoned' },
        spec: { unschedulable: null },
        status: { conditions: [{ type: 'Ready', status: 'True' }] },
      }
      vi.spyOn(k8sService.nodeService, 'UnCordon').mockResolvedValue(mockNode as any)

      const result = await controller.UnCordon('already-uncordoned')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBeNull()
    })

    it('should handle not found errors when uncordoning', async () => {
      vi.spyOn(k8sService.nodeService, 'UnCordon').mockRejectedValue(new Error('Node not found'))

      await expect(controller.UnCordon('nonexistent')).rejects.toThrow('Node not found')
    })

    it('should uncordon node that is not ready', async () => {
      const mockNode = {
        metadata: { name: 'not-ready-node' },
        spec: { unschedulable: null },
        status: { conditions: [{ type: 'Ready', status: 'False' }] },
      }
      vi.spyOn(k8sService.nodeService, 'UnCordon').mockResolvedValue(mockNode as any)

      const result = await controller.UnCordon('not-ready-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBeNull()
    })

    it('should uncordon master node', async () => {
      const mockNode = {
        metadata: { name: 'master-node', labels: { 'node-role.kubernetes.io/master': '' } },
        spec: { unschedulable: null },
        status: { conditions: [{ type: 'Ready', status: 'True' }] },
      }
      vi.spyOn(k8sService.nodeService, 'UnCordon').mockResolvedValue(mockNode as any)

      const result = await controller.UnCordon('master-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBeNull()
    })

    it('should handle permission errors when uncordoning', async () => {
      const error = new Error('Forbidden: User cannot uncordon nodes')
      vi.spyOn(k8sService.nodeService, 'UnCordon').mockRejectedValue(error)

      await expect(controller.UnCordon('test-node')).rejects.toThrow('Forbidden')
    })
  })
})
