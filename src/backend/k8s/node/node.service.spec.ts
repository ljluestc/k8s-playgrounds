import { vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createMockClientService, createNode } from '../../../../test/utils/k8s-mocks'
import { NodeService } from './node.service'

describe('NodeService', () => {
  let service: NodeService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getCoreV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: NodeService,
          useFactory: (clientService: ClientService) => {
            return new NodeService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<NodeService>(NodeService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all nodes', async () => {
      const mockNodes = [createNode('node-1'), createNode('node-2'), createNode('node-3')]
      mockK8sApi.listNode.mockResolvedValue({
        body: { items: mockNodes },
      })

      const result = await service.List()

      expect(result).toEqual(mockNodes)
      expect(mockK8sApi.listNode).toHaveBeenCalled()
    })

    it('should handle API errors when listing nodes', async () => {
      const error = new Error('API Error')
      mockK8sApi.listNode.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should return empty list when no nodes exist', async () => {
      mockK8sApi.listNode.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list nodes with Ready condition', async () => {
      const mockNodes = [createNode('ready-node-1'), createNode('ready-node-2')]
      mockNodes.forEach((node) => {
        node.status!.conditions = [{ type: 'Ready', status: 'True', reason: 'KubeletReady', message: 'kubelet is ready' }]
      })
      mockK8sApi.listNode.mockResolvedValue({
        body: { items: mockNodes },
      })

      const result = await service.List()

      expect(result).toEqual(mockNodes)
      expect(result.every(node => node.status?.conditions?.some(c => c.type === 'Ready'))).toBe(true)
    })

    it('should list nodes with various conditions', async () => {
      const mockNodes = [
        createNode('ready-node'),
        createNode('not-ready-node'),
        createNode('pressure-node'),
      ]
      mockNodes[0].status!.conditions = [{ type: 'Ready', status: 'True' }]
      mockNodes[1].status!.conditions = [{ type: 'Ready', status: 'False' }]
      mockNodes[2].status!.conditions = [
        { type: 'Ready', status: 'True' },
        { type: 'MemoryPressure', status: 'True' },
        { type: 'DiskPressure', status: 'True' },
      ]
      mockK8sApi.listNode.mockResolvedValue({
        body: { items: mockNodes },
      })

      const result = await service.List()

      expect(result).toEqual(mockNodes)
      expect(result).toHaveLength(3)
    })

    it('should list nodes with MemoryPressure condition', async () => {
      const mockNode = createNode('memory-pressure-node')
      mockNode.status!.conditions = [
        { type: 'Ready', status: 'True' },
        { type: 'MemoryPressure', status: 'True', reason: 'KubeletHasInsufficientMemory' },
      ]
      mockK8sApi.listNode.mockResolvedValue({
        body: { items: [mockNode] },
      })

      const result = await service.List()

      expect(result).toHaveLength(1)
      expect(result[0].status?.conditions?.find(c => c.type === 'MemoryPressure')).toBeDefined()
    })

    it('should list nodes with DiskPressure condition', async () => {
      const mockNode = createNode('disk-pressure-node')
      mockNode.status!.conditions = [
        { type: 'Ready', status: 'True' },
        { type: 'DiskPressure', status: 'True', reason: 'KubeletHasDiskPressure' },
      ]
      mockK8sApi.listNode.mockResolvedValue({
        body: { items: [mockNode] },
      })

      const result = await service.List()

      expect(result).toHaveLength(1)
      expect(result[0].status?.conditions?.find(c => c.type === 'DiskPressure')).toBeDefined()
    })

    it('should list nodes with PIDPressure condition', async () => {
      const mockNode = createNode('pid-pressure-node')
      mockNode.status!.conditions = [
        { type: 'Ready', status: 'True' },
        { type: 'PIDPressure', status: 'True', reason: 'KubeletHasSufficientPID' },
      ]
      mockK8sApi.listNode.mockResolvedValue({
        body: { items: [mockNode] },
      })

      const result = await service.List()

      expect(result).toHaveLength(1)
      expect(result[0].status?.conditions?.find(c => c.type === 'PIDPressure')).toBeDefined()
    })

    it('should list nodes with master role', async () => {
      const masterNode = createNode('master-node')
      masterNode.metadata!.labels = {
        'node-role.kubernetes.io/master': '',
        'kubernetes.io/hostname': 'master-node',
      }
      mockK8sApi.listNode.mockResolvedValue({
        body: { items: [masterNode] },
      })

      const result = await service.List()

      expect(result).toHaveLength(1)
      expect(result[0].metadata?.labels?.['node-role.kubernetes.io/master']).toBeDefined()
    })

    it('should list nodes with worker role', async () => {
      const workerNode = createNode('worker-node')
      workerNode.metadata!.labels = {
        'node-role.kubernetes.io/worker': '',
        'kubernetes.io/hostname': 'worker-node',
      }
      mockK8sApi.listNode.mockResolvedValue({
        body: { items: [workerNode] },
      })

      const result = await service.List()

      expect(result).toHaveLength(1)
      expect(result[0].metadata?.labels?.['node-role.kubernetes.io/worker']).toBeDefined()
    })

    it('should list nodes with cordoned status', async () => {
      const cordonedNode = createNode('cordoned-node')
      cordonedNode.spec!.unschedulable = true
      mockK8sApi.listNode.mockResolvedValue({
        body: { items: [cordonedNode] },
      })

      const result = await service.List()

      expect(result).toHaveLength(1)
      expect(result[0].spec?.unschedulable).toBe(true)
    })

    it('should list nodes with various addresses', async () => {
      const mockNode = createNode('full-node')
      mockNode.status!.addresses = [
        { type: 'InternalIP', address: '192.168.1.100' },
        { type: 'ExternalIP', address: '203.0.113.1' },
        { type: 'Hostname', address: 'full-node' },
      ]
      mockK8sApi.listNode.mockResolvedValue({
        body: { items: [mockNode] },
      })

      const result = await service.List()

      expect(result).toHaveLength(1)
      expect(result[0].status?.addresses).toHaveLength(3)
    })
  })

  describe('GetOneByName', () => {
    it('should get a single node by name', async () => {
      const mockNode = createNode('test-node')
      mockK8sApi.readNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.GetOneByName('test-node')

      expect(result).toEqual(mockNode)
      expect(mockK8sApi.readNode).toHaveBeenCalledWith('test-node')
    })

    it('should handle not found errors', async () => {
      const error = new Error('Node not found')
      mockK8sApi.readNode.mockRejectedValue(error)

      await expect(service.GetOneByName('nonexistent')).rejects.toThrow('Node not found')
    })

    it('should get node with Ready condition', async () => {
      const mockNode = createNode('ready-node')
      mockNode.status!.conditions = [
        { type: 'Ready', status: 'True', reason: 'KubeletReady', message: 'kubelet is ready' },
      ]
      mockK8sApi.readNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.GetOneByName('ready-node')

      expect(result).toEqual(mockNode)
      expect(result.status?.conditions?.[0].type).toBe('Ready')
      expect(result.status?.conditions?.[0].status).toBe('True')
    })

    it('should get node with NotReady condition', async () => {
      const mockNode = createNode('not-ready-node')
      mockNode.status!.conditions = [
        { type: 'Ready', status: 'False', reason: 'KubeletNotReady', message: 'kubelet is not ready' },
      ]
      mockK8sApi.readNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.GetOneByName('not-ready-node')

      expect(result).toEqual(mockNode)
      expect(result.status?.conditions?.[0].status).toBe('False')
    })

    it('should get node with MemoryPressure condition', async () => {
      const mockNode = createNode('memory-pressure-node')
      mockNode.status!.conditions = [
        { type: 'Ready', status: 'True' },
        { type: 'MemoryPressure', status: 'True', reason: 'KubeletHasInsufficientMemory' },
      ]
      mockK8sApi.readNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.GetOneByName('memory-pressure-node')

      expect(result).toEqual(mockNode)
      expect(result.status?.conditions?.find(c => c.type === 'MemoryPressure')).toBeDefined()
      expect(result.status?.conditions?.find(c => c.type === 'MemoryPressure')?.status).toBe('True')
    })

    it('should get node with DiskPressure condition', async () => {
      const mockNode = createNode('disk-pressure-node')
      mockNode.status!.conditions = [
        { type: 'Ready', status: 'True' },
        { type: 'DiskPressure', status: 'True', reason: 'KubeletHasDiskPressure' },
      ]
      mockK8sApi.readNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.GetOneByName('disk-pressure-node')

      expect(result).toEqual(mockNode)
      expect(result.status?.conditions?.find(c => c.type === 'DiskPressure')).toBeDefined()
      expect(result.status?.conditions?.find(c => c.type === 'DiskPressure')?.status).toBe('True')
    })

    it('should get node with PIDPressure condition', async () => {
      const mockNode = createNode('pid-pressure-node')
      mockNode.status!.conditions = [
        { type: 'Ready', status: 'True' },
        { type: 'PIDPressure', status: 'True', reason: 'KubeletHasSufficientPID' },
      ]
      mockK8sApi.readNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.GetOneByName('pid-pressure-node')

      expect(result).toEqual(mockNode)
      expect(result.status?.conditions?.find(c => c.type === 'PIDPressure')).toBeDefined()
      expect(result.status?.conditions?.find(c => c.type === 'PIDPressure')?.status).toBe('True')
    })

    it('should get node with multiple pressure conditions', async () => {
      const mockNode = createNode('multi-pressure-node')
      mockNode.status!.conditions = [
        { type: 'Ready', status: 'False' },
        { type: 'MemoryPressure', status: 'True' },
        { type: 'DiskPressure', status: 'True' },
        { type: 'PIDPressure', status: 'True' },
      ]
      mockK8sApi.readNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.GetOneByName('multi-pressure-node')

      expect(result).toEqual(mockNode)
      expect(result.status?.conditions).toHaveLength(4)
      expect(result.status?.conditions?.filter(c => c.status === 'True')).toHaveLength(3)
    })

    it('should get master node', async () => {
      const mockNode = createNode('master-node')
      mockNode.metadata!.labels = {
        'node-role.kubernetes.io/master': '',
        'kubernetes.io/hostname': 'master-node',
      }
      mockK8sApi.readNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.GetOneByName('master-node')

      expect(result).toEqual(mockNode)
      expect(result.metadata?.labels?.['node-role.kubernetes.io/master']).toBeDefined()
    })

    it('should get worker node', async () => {
      const mockNode = createNode('worker-node')
      mockNode.metadata!.labels = {
        'node-role.kubernetes.io/worker': '',
        'kubernetes.io/hostname': 'worker-node',
      }
      mockK8sApi.readNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.GetOneByName('worker-node')

      expect(result).toEqual(mockNode)
      expect(result.metadata?.labels?.['node-role.kubernetes.io/worker']).toBeDefined()
    })

    it('should get cordoned node', async () => {
      const mockNode = createNode('cordoned-node')
      mockNode.spec!.unschedulable = true
      mockK8sApi.readNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.GetOneByName('cordoned-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBe(true)
    })

    it('should get node with resource information', async () => {
      const mockNode = createNode('resource-node')
      mockNode.status!.capacity = {
        cpu: '4',
        memory: '8Gi',
        pods: '110',
      }
      mockNode.status!.allocatable = {
        cpu: '3.5',
        memory: '7.5Gi',
        pods: '110',
      }
      mockK8sApi.readNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.GetOneByName('resource-node')

      expect(result).toEqual(mockNode)
      expect(result.status?.capacity).toBeDefined()
      expect(result.status?.allocatable).toBeDefined()
    })

    it('should get node with special characters in name', async () => {
      const mockNode = createNode('node-123-worker')
      mockK8sApi.readNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.GetOneByName('node-123-worker')

      expect(result).toEqual(mockNode)
      expect(mockK8sApi.readNode).toHaveBeenCalledWith('node-123-worker')
    })
  })

  describe('Delete', () => {
    it('should delete a node', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNode.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-node')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNode).toHaveBeenCalledWith('test-node')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNode.mockRejectedValue(error)

      await expect(service.Delete('test-node')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent node', async () => {
      const error = new Error('Node not found')
      mockK8sApi.deleteNode.mockRejectedValue(error)

      await expect(service.Delete('nonexistent')).rejects.toThrow('Node not found')
    })

    it('should delete master node', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNode.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('master-node')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNode).toHaveBeenCalledWith('master-node')
    })

    it('should delete worker node', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNode.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('worker-node')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNode).toHaveBeenCalledWith('worker-node')
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNode.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete nodes')
      mockK8sApi.deleteNode.mockRejectedValue(error)

      await expect(service.Delete('test-node')).rejects.toThrow('Forbidden')
    })

    it('should delete cordoned node', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNode.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('cordoned-node')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNode).toHaveBeenCalledWith('cordoned-node')
    })
  })

  describe('Cordon', () => {
    it('should cordon a node', async () => {
      const mockNode = createNode('test-node')
      mockNode.spec!.unschedulable = true
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.Cordon('test-node')

      expect(result).toEqual(mockNode)
      expect(mockK8sApi.patchNode).toHaveBeenCalledWith(
        'test-node',
        { spec: { unschedulable: true } },
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': 'application/strategic-merge-patch+json',
            'Accept': 'application/json, */*',
          },
        },
      )
    })

    it('should handle cordon errors', async () => {
      const error = new Error('Cordon failed')
      mockK8sApi.patchNode.mockRejectedValue(error)

      await expect(service.Cordon('test-node')).rejects.toThrow('Cordon failed')
    })

    it('should cordon node with Ready condition', async () => {
      const mockNode = createNode('ready-node')
      mockNode.spec!.unschedulable = true
      mockNode.status!.conditions = [{ type: 'Ready', status: 'True' }]
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.Cordon('ready-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBe(true)
    })

    it('should cordon node that is not ready', async () => {
      const mockNode = createNode('not-ready-node')
      mockNode.spec!.unschedulable = true
      mockNode.status!.conditions = [{ type: 'Ready', status: 'False' }]
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.Cordon('not-ready-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBe(true)
    })

    it('should cordon already cordoned node', async () => {
      const mockNode = createNode('already-cordoned')
      mockNode.spec!.unschedulable = true
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.Cordon('already-cordoned')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBe(true)
    })

    it('should handle not found errors when cordoning', async () => {
      const error = new Error('Node not found')
      mockK8sApi.patchNode.mockRejectedValue(error)

      await expect(service.Cordon('nonexistent')).rejects.toThrow('Node not found')
    })

    it('should cordon master node', async () => {
      const mockNode = createNode('master-node')
      mockNode.spec!.unschedulable = true
      mockNode.metadata!.labels = { 'node-role.kubernetes.io/master': '' }
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.Cordon('master-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBe(true)
    })

    it('should cordon worker node', async () => {
      const mockNode = createNode('worker-node')
      mockNode.spec!.unschedulable = true
      mockNode.metadata!.labels = { 'node-role.kubernetes.io/worker': '' }
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.Cordon('worker-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBe(true)
    })

    it('should cordon node with pressure conditions', async () => {
      const mockNode = createNode('pressure-node')
      mockNode.spec!.unschedulable = true
      mockNode.status!.conditions = [
        { type: 'Ready', status: 'True' },
        { type: 'MemoryPressure', status: 'True' },
        { type: 'DiskPressure', status: 'True' },
      ]
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.Cordon('pressure-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBe(true)
    })

    it('should use correct patch headers', async () => {
      const mockNode = createNode('test-node')
      mockNode.spec!.unschedulable = true
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      await service.Cordon('test-node')

      expect(mockK8sApi.patchNode).toHaveBeenCalledWith(
        'test-node',
        expect.objectContaining({
          spec: expect.objectContaining({
            unschedulable: true,
          }),
        }),
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/strategic-merge-patch+json',
            'Accept': 'application/json, */*',
          }),
        }),
      )
    })

    it('should handle permission errors when cordoning', async () => {
      const error = new Error('Forbidden: User cannot cordon nodes')
      mockK8sApi.patchNode.mockRejectedValue(error)

      await expect(service.Cordon('test-node')).rejects.toThrow('Forbidden')
    })
  })

  describe('UnCordon', () => {
    it('should uncordon a node', async () => {
      const mockNode = createNode('test-node')
      mockNode.spec!.unschedulable = null
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.UnCordon('test-node')

      expect(result).toEqual(mockNode)
      expect(mockK8sApi.patchNode).toHaveBeenCalledWith(
        'test-node',
        { spec: { unschedulable: null } },
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': 'application/strategic-merge-patch+json',
            'Accept': 'application/json, */*',
          },
        },
      )
    })

    it('should handle uncordon errors', async () => {
      const error = new Error('UnCordon failed')
      mockK8sApi.patchNode.mockRejectedValue(error)

      await expect(service.UnCordon('test-node')).rejects.toThrow('UnCordon failed')
    })

    it('should uncordon cordoned node', async () => {
      const mockNode = createNode('cordoned-node')
      mockNode.spec!.unschedulable = null
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.UnCordon('cordoned-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBeNull()
    })

    it('should uncordon already uncordoned node', async () => {
      const mockNode = createNode('already-uncordoned')
      mockNode.spec!.unschedulable = null
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.UnCordon('already-uncordoned')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBeNull()
    })

    it('should handle not found errors when uncordoning', async () => {
      const error = new Error('Node not found')
      mockK8sApi.patchNode.mockRejectedValue(error)

      await expect(service.UnCordon('nonexistent')).rejects.toThrow('Node not found')
    })

    it('should uncordon node that is not ready', async () => {
      const mockNode = createNode('not-ready-node')
      mockNode.spec!.unschedulable = null
      mockNode.status!.conditions = [{ type: 'Ready', status: 'False' }]
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.UnCordon('not-ready-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBeNull()
    })

    it('should uncordon master node', async () => {
      const mockNode = createNode('master-node')
      mockNode.spec!.unschedulable = null
      mockNode.metadata!.labels = { 'node-role.kubernetes.io/master': '' }
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.UnCordon('master-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBeNull()
    })

    it('should uncordon worker node', async () => {
      const mockNode = createNode('worker-node')
      mockNode.spec!.unschedulable = null
      mockNode.metadata!.labels = { 'node-role.kubernetes.io/worker': '' }
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.UnCordon('worker-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBeNull()
    })

    it('should uncordon node with pressure conditions', async () => {
      const mockNode = createNode('pressure-node')
      mockNode.spec!.unschedulable = null
      mockNode.status!.conditions = [
        { type: 'Ready', status: 'True' },
        { type: 'MemoryPressure', status: 'True' },
      ]
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      const result = await service.UnCordon('pressure-node')

      expect(result).toEqual(mockNode)
      expect(result.spec?.unschedulable).toBeNull()
    })

    it('should use correct patch headers', async () => {
      const mockNode = createNode('test-node')
      mockNode.spec!.unschedulable = null
      mockK8sApi.patchNode.mockResolvedValue({
        body: mockNode,
      })

      await service.UnCordon('test-node')

      expect(mockK8sApi.patchNode).toHaveBeenCalledWith(
        'test-node',
        expect.objectContaining({
          spec: expect.objectContaining({
            unschedulable: null,
          }),
        }),
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/strategic-merge-patch+json',
            'Accept': 'application/json, */*',
          }),
        }),
      )
    })

    it('should handle permission errors when uncordoning', async () => {
      const error = new Error('Forbidden: User cannot uncordon nodes')
      mockK8sApi.patchNode.mockRejectedValue(error)

      await expect(service.UnCordon('test-node')).rejects.toThrow('Forbidden')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s API', async () => {
      const mockNodes = [createNode('test-node')]
      mockK8sApi.listNode.mockResolvedValue({
        body: { items: mockNodes },
      })

      await service.List()

      expect(clientService.getCoreV1Api).toHaveBeenCalled()
    })

    it('should call getCoreV1Api for every operation', async () => {
      const mockNode = createNode('test-node')
      mockK8sApi.listNode.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNode.mockResolvedValue({ body: mockNode })
      mockK8sApi.deleteNode.mockResolvedValue({ body: { status: 'Success' } })
      mockK8sApi.patchNode.mockResolvedValue({ body: mockNode })

      await service.List()
      await service.GetOneByName('test-node')
      await service.Delete('test-node')
      await service.Cordon('test-node')
      await service.UnCordon('test-node')

      expect(clientService.getCoreV1Api).toHaveBeenCalledTimes(6)
    })

    it('should handle client service errors', async () => {
      const error = new Error('Failed to get API client')
      clientService.getCoreV1Api.mockImplementation(() => {
        throw error
      })

      await expect(service.List()).rejects.toThrow('Failed to get API client')
    })
  })
})
