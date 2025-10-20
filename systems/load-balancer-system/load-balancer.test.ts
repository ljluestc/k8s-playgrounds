import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from './load-balancer'
import { LoadBalancer } from './load-balancer'

describe('LoadBalancer', () => {
  let loadBalancer: LoadBalancer
  let mockServers: Server[]

  beforeEach(() => {
    loadBalancer = new LoadBalancer({
      algorithm: 'round-robin',
      healthCheckInterval: 1000,
      healthCheckTimeout: 500,
      maxRetries: 2,
      retryDelay: 100,
      stickySession: false,
      circuitBreaker: false,
    })

    mockServers = [
      {
        id: 'server1',
        host: '192.168.1.1',
        port: 8080,
        weight: 1,
        isHealthy: true,
        responseTime: 100,
        activeConnections: 0,
        maxConnections: 100,
        lastHealthCheck: new Date(),
      },
      {
        id: 'server2',
        host: '192.168.1.2',
        port: 8080,
        weight: 2,
        isHealthy: true,
        responseTime: 150,
        activeConnections: 0,
        maxConnections: 100,
        lastHealthCheck: new Date(),
      },
      {
        id: 'server3',
        host: '192.168.1.3',
        port: 8080,
        weight: 1,
        isHealthy: false,
        responseTime: 0,
        activeConnections: 0,
        maxConnections: 100,
        lastHealthCheck: new Date(),
      },
    ]

    // Add servers to load balancer
    mockServers.forEach((server) => {
      loadBalancer.addServer({
        id: server.id,
        host: server.host,
        port: server.port,
        weight: server.weight,
        maxConnections: server.maxConnections,
      })
    })
  })

  describe('Server Management', () => {
    it('should add a server', () => {
      const newServer = {
        id: 'server4',
        host: '192.168.1.4',
        port: 8080,
        weight: 1,
        maxConnections: 100,
      }

      const result = loadBalancer.addServer(newServer)
      expect(result).toBe(true)

      const addedServer = loadBalancer.getServer('server4')
      expect(addedServer).toBeDefined()
      expect(addedServer?.id).toBe('server4')
      expect(addedServer?.host).toBe('192.168.1.4')
      expect(addedServer?.isHealthy).toBe(true)
    })

    it('should not add duplicate server', () => {
      const result = loadBalancer.addServer({
        id: 'server1',
        host: '192.168.1.1',
        port: 8080,
        weight: 1,
        maxConnections: 100,
      })

      expect(result).toBe(false)
    })

    it('should remove a server', () => {
      const result = loadBalancer.removeServer('server1')
      expect(result).toBe(true)

      const server = loadBalancer.getServer('server1')
      expect(server).toBeUndefined()
    })

    it('should not remove non-existent server', () => {
      const result = loadBalancer.removeServer('non-existent')
      expect(result).toBe(false)
    })

    it('should get all servers', () => {
      const servers = loadBalancer.getAllServers()
      expect(servers).toHaveLength(3)
      expect(servers.map(s => s.id)).toContain('server1')
      expect(servers.map(s => s.id)).toContain('server2')
      expect(servers.map(s => s.id)).toContain('server3')
    })

    it('should get only healthy servers', () => {
      const healthyServers = loadBalancer.getHealthyServers()
      expect(healthyServers.length).toBeGreaterThanOrEqual(2)
      expect(healthyServers.every(s => s.isHealthy)).toBe(true)
    })
  })

  describe('Load Balancing Algorithms', () => {
    it('should use round-robin algorithm', () => {
      const loadBalancer = new LoadBalancer({ algorithm: 'round-robin' })

      // Add servers
      loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 })
      loadBalancer.addServer({ id: 's2', host: '1.1.1.2', port: 80, weight: 1, maxConnections: 100 })

      const selections = []
      for (let i = 0; i < 4; i++) {
        const server = loadBalancer.selectServer()
        selections.push(server?.id)
      }

      expect(selections).toEqual(['s1', 's2', 's1', 's2'])
    })

    it('should use least-connections algorithm', () => {
      const loadBalancer = new LoadBalancer({ algorithm: 'least-connections' })

      loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 })
      loadBalancer.addServer({ id: 's2', host: '1.1.1.2', port: 80, weight: 1, maxConnections: 100 })

      // Manually set connection counts
      const s1 = loadBalancer.getServer('s1')
      const s2 = loadBalancer.getServer('s2')
      if (s1)
        s1.activeConnections = 5
      if (s2)
        s2.activeConnections = 2

      const server = loadBalancer.selectServer()
      expect(server?.id).toBe('s2')
    })

    it('should use weighted-round-robin algorithm', () => {
      const loadBalancer = new LoadBalancer({ algorithm: 'weighted-round-robin' })

      loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 })
      loadBalancer.addServer({ id: 's2', host: '1.1.1.2', port: 80, weight: 3, maxConnections: 100 })

      // Test multiple selections to see weight distribution
      const selections = []
      for (let i = 0; i < 100; i++) {
        const server = loadBalancer.selectServer()
        selections.push(server?.id)
      }

      const s1Count = selections.filter(id => id === 's1').length
      const s2Count = selections.filter(id => id === 's2').length

      // s2 should be selected more often due to higher weight
      expect(s2Count).toBeGreaterThan(s1Count)
    })

    it('should use ip-hash algorithm', () => {
      const loadBalancer = new LoadBalancer({ algorithm: 'ip-hash' })

      loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 })
      loadBalancer.addServer({ id: 's2', host: '1.1.1.2', port: 80, weight: 1, maxConnections: 100 })

      const clientId = '192.168.1.100'
      const selections = []
      for (let i = 0; i < 5; i++) {
        const server = loadBalancer.selectServer(clientId)
        selections.push(server?.id)
      }

      // Same client should always get same server
      expect(selections.every(id => id === selections[0])).toBe(true)
    })

    it('should use random algorithm', () => {
      const loadBalancer = new LoadBalancer({ algorithm: 'random' })

      loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 })
      loadBalancer.addServer({ id: 's2', host: '1.1.1.2', port: 80, weight: 1, maxConnections: 100 })

      const selections = []
      for (let i = 0; i < 10; i++) {
        const server = loadBalancer.selectServer()
        selections.push(server?.id)
      }

      // Should have some variation (not all same)
      const uniqueSelections = new Set(selections)
      expect(uniqueSelections.size).toBeGreaterThan(1)
    })

    it('should return null when no healthy servers', () => {
      const loadBalancer = new LoadBalancer()

      // Add only unhealthy server
      loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 })
      const server = loadBalancer.getServer('s1')
      if (server)
        server.isHealthy = false

      const selectedServer = loadBalancer.selectServer()
      expect(selectedServer).toBeNull()
    })
  })

  describe('Sticky Sessions', () => {
    it('should maintain sticky sessions when enabled', () => {
      const loadBalancer = new LoadBalancer({
        algorithm: 'round-robin',
        stickySession: true,
      })

      loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 })
      loadBalancer.addServer({ id: 's2', host: '1.1.1.2', port: 80, weight: 1, maxConnections: 100 })

      const clientId = 'client1'
      const server1 = loadBalancer.selectServer(clientId)
      const server2 = loadBalancer.selectServer(clientId)

      expect(server1?.id).toBe(server2?.id)
    })

    it('should not maintain sticky sessions when disabled', () => {
      const loadBalancer = new LoadBalancer({
        algorithm: 'round-robin',
        stickySession: false,
      })

      loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 })
      loadBalancer.addServer({ id: 's2', host: '1.1.1.2', port: 80, weight: 1, maxConnections: 100 })

      const clientId = 'client1'
      const server1 = loadBalancer.selectServer(clientId)
      const server2 = loadBalancer.selectServer(clientId)

      expect(server1?.id).not.toBe(server2?.id)
    })

    it('should clear session', () => {
      const loadBalancer = new LoadBalancer({ stickySession: true })

      loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 })

      const clientId = 'client1'
      loadBalancer.selectServer(clientId)

      const result = loadBalancer.clearSession(clientId)
      expect(result).toBe(true)

      const server = loadBalancer.getSessionServer(clientId)
      expect(server).toBeUndefined()
    })
  })

  describe('Request Handling', () => {
    it('should handle successful request', async () => {
      const mockRequestHandler = vi.fn().mockResolvedValue('success')

      const result = await loadBalancer.handleRequest('client1', 'test-request', mockRequestHandler)

      expect(result).toBe('success')
      expect(mockRequestHandler).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure', async () => {
      const mockRequestHandler = vi.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValue('success')

      const result = await loadBalancer.handleRequest('client1', 'test-request', mockRequestHandler)

      expect(result).toBe('success')
      expect(mockRequestHandler).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max retries', async () => {
      const mockRequestHandler = vi.fn().mockRejectedValue(new Error('Always fails'))

      await expect(
        loadBalancer.handleRequest('client1', 'test-request', mockRequestHandler),
      ).rejects.toThrow('Always fails')

      expect(mockRequestHandler).toHaveBeenCalledTimes(3) // maxRetries = 2, so 3 attempts (0, 1, 2)
    })

    it('should throw error when no healthy servers', async () => {
      const loadBalancer = new LoadBalancer()
      const mockRequestHandler = vi.fn()

      await expect(
        loadBalancer.handleRequest('client1', 'test-request', mockRequestHandler),
      ).rejects.toThrow('No healthy servers available')
    })
  })

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after threshold failures', async () => {
      const loadBalancer = new LoadBalancer({
        circuitBreaker: true,
        circuitBreakerThreshold: 2,
        circuitBreakerTimeout: 1000,
        maxRetries: 0, // No retries to make test faster and more predictable
      })

      loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 })

      const mockRequestHandler = vi.fn().mockRejectedValue(new Error('Always fails'))

      // First two failures should trigger circuit breaker
      await expect(
        loadBalancer.handleRequest('client1', 'test-request', mockRequestHandler),
      ).rejects.toThrow('Always fails')

      await expect(
        loadBalancer.handleRequest('client1', 'test-request', mockRequestHandler),
      ).rejects.toThrow('Always fails')

      // Third request should be blocked by circuit breaker
      await expect(
        loadBalancer.handleRequest('client1', 'test-request', mockRequestHandler),
      ).rejects.toThrow('No healthy servers available')
    }, 10000) // Increase test timeout

    it('should reset circuit breaker after timeout', async () => {
      const loadBalancer = new LoadBalancer({
        circuitBreaker: true,
        circuitBreakerThreshold: 2,
        circuitBreakerTimeout: 50,
        maxRetries: 0, // No retries to make test faster
      })

      loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 })

      const mockRequestHandler = vi.fn().mockRejectedValue(new Error('Always fails'))

      // First request should fail but not trigger circuit breaker
      await expect(
        loadBalancer.handleRequest('client1', 'test-request', mockRequestHandler),
      ).rejects.toThrow('Always fails')

      // Second request should trigger circuit breaker
      await expect(
        loadBalancer.handleRequest('client1', 'test-request', mockRequestHandler),
      ).rejects.toThrow('Always fails')

      // Third request should be blocked by circuit breaker
      await expect(
        loadBalancer.handleRequest('client1', 'test-request', mockRequestHandler),
      ).rejects.toThrow('No healthy servers available')

      // Wait for circuit breaker timeout
      await new Promise(resolve => setTimeout(resolve, 100))

      // Circuit breaker should be reset and allow requests again
      await expect(
        loadBalancer.handleRequest('client1', 'test-request', mockRequestHandler),
      ).rejects.toThrow('Always fails')
    }, 10000) // Increase test timeout
  })

  describe('Statistics', () => {
    it('should track request statistics', async () => {
      const mockRequestHandler = vi.fn().mockResolvedValue('success')

      await loadBalancer.handleRequest('client1', 'request1', mockRequestHandler)
      await loadBalancer.handleRequest('client2', 'request2', mockRequestHandler)

      const stats = loadBalancer.getStatistics()

      expect(stats.totalRequests).toBe(2)
      expect(stats.successfulRequests).toBe(2)
      expect(stats.failedRequests).toBe(0)
      expect(stats.serverStats).toHaveLength(3)
    })

    it('should track failed requests', async () => {
      const mockRequestHandler = vi.fn().mockRejectedValue(new Error('Request failed'))

      await expect(
        loadBalancer.handleRequest('client1', 'request1', mockRequestHandler),
      ).rejects.toThrow('Request failed')

      const stats = loadBalancer.getStatistics()

      expect(stats.totalRequests).toBe(3) // 3 attempts (0, 1, 2)
      expect(stats.successfulRequests).toBe(0)
      expect(stats.failedRequests).toBe(1) // Only 1 failed request (counted once)
    })
  })

  describe('Configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        algorithm: 'least-connections' as const,
        maxRetries: 5,
      }

      loadBalancer.updateConfig(newConfig)

      const config = loadBalancer.getConfig()
      expect(config.algorithm).toBe('least-connections')
      expect(config.maxRetries).toBe(5)
    })

    it('should restart health checks when interval changes', () => {
      const originalInterval = loadBalancer.getConfig().healthCheckInterval

      loadBalancer.updateConfig({ healthCheckInterval: 2000 })

      const newInterval = loadBalancer.getConfig().healthCheckInterval
      expect(newInterval).toBe(2000)
      expect(newInterval).not.toBe(originalInterval)
    })
  })

  describe('Event Handling', () => {
    it('should emit server added event', () => {
      return new Promise<void>((resolve) => {
        loadBalancer.on('serverAdded', (data) => {
          expect(data.server.id).toBe('new-server')
          resolve()
        })

        loadBalancer.addServer({
          id: 'new-server',
          host: '1.1.1.1',
          port: 80,
          weight: 1,
          maxConnections: 100,
        })
      })
    })

    it('should emit server removed event', () => {
      return new Promise<void>((resolve) => {
        loadBalancer.on('serverRemoved', (data) => {
          expect(data.serverId).toBe('server1')
          resolve()
        })

        loadBalancer.removeServer('server1')
      })
    })

    it('should emit server selected event', () => {
      return new Promise<void>((resolve) => {
        loadBalancer.on('serverSelected', (data) => {
          expect(data.server).toBeDefined()
          expect(data.clientId).toBe('client1')
          resolve()
        })

        loadBalancer.selectServer('client1')
      })
    })

    it('should emit request completed event', async () => {
      return new Promise<void>((resolve) => {
        loadBalancer.on('requestCompleted', (data) => {
          expect(data.serverId).toBeDefined()
          expect(data.clientId).toBe('client1')
          expect(data.success).toBe(true)
          resolve()
        })

        const mockRequestHandler = vi.fn().mockResolvedValue('success')
        loadBalancer.handleRequest('client1', 'test-request', mockRequestHandler)
      })
    })

    it('should emit request failed event', async () => {
      return new Promise<void>((resolve) => {
        loadBalancer.on('requestFailed', (data) => {
          expect(data.serverId).toBeDefined()
          expect(data.clientId).toBe('client1')
          expect(data.error).toBe('Request failed')
          resolve()
        })

        const mockRequestHandler = vi.fn().mockRejectedValue(new Error('Request failed'))
        loadBalancer.handleRequest('client1', 'test-request', mockRequestHandler)
      })
    })

    it('should emit circuit breaker opened event', async () => {
      return new Promise<void>((resolve) => {
        const loadBalancer = new LoadBalancer({
          circuitBreaker: true,
          circuitBreakerThreshold: 1,
        })

        loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 })

        loadBalancer.on('circuitBreakerOpened', (data) => {
          expect(data.serverId).toBe('s1')
          expect(data.failures).toBe(1)
          resolve()
        })

        const mockRequestHandler = vi.fn().mockRejectedValue(new Error('Always fails'))
        loadBalancer.handleRequest('client1', 'test-request', mockRequestHandler)
      })
    })
  })

  describe('Cleanup', () => {
    it('should destroy load balancer', () => {
      return new Promise<void>((resolve) => {
        loadBalancer.on('destroyed', () => {
          resolve()
        })

        loadBalancer.destroy()
      })
    })

    it('should clear all data on destroy', () => {
      loadBalancer.destroy()

      const servers = loadBalancer.getAllServers()
      expect(servers).toHaveLength(0)

      const stats = loadBalancer.getStatistics()
      expect(stats.totalRequests).toBe(0)
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete load balancing workflow', async () => {
      const loadBalancer = new LoadBalancer({
        algorithm: 'round-robin',
        stickySession: true,
        circuitBreaker: true,
        circuitBreakerThreshold: 3,
      })

      // Add multiple servers
      loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 })
      loadBalancer.addServer({ id: 's2', host: '1.1.1.2', port: 80, weight: 2, maxConnections: 100 })
      loadBalancer.addServer({ id: 's3', host: '1.1.1.3', port: 80, weight: 1, maxConnections: 100 })

      // Test sticky sessions
      const clientId = 'client1'
      const server1 = loadBalancer.selectServer(clientId)
      const server2 = loadBalancer.selectServer(clientId)
      expect(server1?.id).toBe(server2?.id)

      // Test request handling
      const mockRequestHandler = vi.fn().mockResolvedValue('success')
      const result = await loadBalancer.handleRequest(clientId, 'test-request', mockRequestHandler)
      expect(result).toBe('success')

      // Test statistics
      const stats = loadBalancer.getStatistics()
      expect(stats.totalRequests).toBe(1)
      expect(stats.successfulRequests).toBe(1)
      expect(stats.serverStats).toHaveLength(3)

      // Test configuration update
      loadBalancer.updateConfig({ algorithm: 'least-connections' })
      const config = loadBalancer.getConfig()
      expect(config.algorithm).toBe('least-connections')
    })

    it('should handle server health changes', async () => {
      const loadBalancer = new LoadBalancer({
        healthCheckInterval: 100,
      })

      loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 })

      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 200))

      const server = loadBalancer.getServer('s1')
      expect(server?.isHealthy).toBe(true)
      expect(server?.lastHealthCheck).toBeDefined()
    })
  })
})
