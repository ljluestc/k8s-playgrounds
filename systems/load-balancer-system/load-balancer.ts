import { EventEmitter } from 'node:events'

export interface Server {
  id: string
  host: string
  port: number
  weight: number
  isHealthy: boolean
  responseTime: number
  activeConnections: number
  maxConnections: number
  lastHealthCheck: Date
  metadata?: Record<string, any>
}

export interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections' | 'weighted-round-robin' | 'ip-hash' | 'random'
  healthCheckInterval: number
  healthCheckTimeout: number
  maxRetries: number
  retryDelay: number
  stickySession: boolean
  sessionTimeout: number
  circuitBreaker: boolean
  circuitBreakerThreshold: number
  circuitBreakerTimeout: number
}

export interface HealthCheckResult {
  serverId: string
  isHealthy: boolean
  responseTime: number
  error?: string
  timestamp: Date
}

export interface LoadBalancerStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  activeConnections: number
  serverStats: Array<{
    serverId: string
    requests: number
    successRate: number
    averageResponseTime: number
    activeConnections: number
  }>
}

export class LoadBalancer extends EventEmitter {
  private servers: Map<string, Server> = new Map()
  private currentIndex: number = 0
  private healthCheckInterval?: NodeJS.Timeout
  private sessionMap: Map<string, string> = new Map() // clientId -> serverId
  private requestCounts: Map<string, number> = new Map()
  private successCounts: Map<string, number> = new Map()
  private failureCounts: Map<string, number> = new Map()
  private responseTimes: Map<string, number[]> = new Map()
  private circuitBreakers: Map<string, { failures: number; lastFailure: Date; isOpen: boolean }> = new Map()

  private config: LoadBalancerConfig

  constructor(config: Partial<LoadBalancerConfig> = {}) {
    super()

    this.config = {
      algorithm: 'round-robin',
      healthCheckInterval: 30000, // 30 seconds
      healthCheckTimeout: 5000, // 5 seconds
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      stickySession: false,
      sessionTimeout: 300000, // 5 minutes
      circuitBreaker: false,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000, // 1 minute
      ...config,
    }

    this.startHealthChecks()
  }

  // Server Management
  public addServer(server: Omit<Server, 'isHealthy' | 'responseTime' | 'activeConnections' | 'lastHealthCheck'>): boolean {
    if (this.servers.has(server.id))
      return false

    const newServer: Server = {
      ...server,
      isHealthy: true,
      responseTime: 0,
      activeConnections: 0,
      lastHealthCheck: new Date(),
    }

    this.servers.set(server.id, newServer)
    this.requestCounts.set(server.id, 0)
    this.successCounts.set(server.id, 0)
    this.failureCounts.set(server.id, 0)
    this.responseTimes.set(server.id, [])
    this.circuitBreakers.set(server.id, { failures: 0, lastFailure: new Date(), isOpen: false })

    this.emit('serverAdded', { server: newServer })
    return true
  }

  public removeServer(serverId: string): boolean {
    if (!this.servers.has(serverId))
      return false

    const server = this.servers.get(serverId)
    this.servers.delete(serverId)
    this.requestCounts.delete(serverId)
    this.successCounts.delete(serverId)
    this.failureCounts.delete(serverId)
    this.responseTimes.delete(serverId)
    this.circuitBreakers.delete(serverId)

    // Remove from session map
    for (const [clientId, mappedServerId] of this.sessionMap.entries()) {
      if (mappedServerId === serverId)
        this.sessionMap.delete(clientId)
    }

    this.emit('serverRemoved', { serverId, server })
    return true
  }

  public getServer(serverId: string): Server | undefined {
    return this.servers.get(serverId)
  }

  public getAllServers(): Server[] {
    return Array.from(this.servers.values())
  }

  public getHealthyServers(): Server[] {
    return Array.from(this.servers.values()).filter(server => server.isHealthy)
  }

  // Load Balancing
  public selectServer(clientId?: string): Server | null {
    let healthyServers = this.getHealthyServers()

    // Filter out servers with open circuit breakers
    if (this.config.circuitBreaker)
      healthyServers = healthyServers.filter(server => !this.isCircuitBreakerOpen(server.id))

    if (healthyServers.length === 0) {
      this.emit('noHealthyServers', { clientId })
      return null
    }

    // Check for sticky session
    if (this.config.stickySession && clientId) {
      const mappedServerId = this.sessionMap.get(clientId)
      if (mappedServerId) {
        const server = this.servers.get(mappedServerId)
        if (server && server.isHealthy)
          return server
      }
    }

    let selectedServer: Server

    switch (this.config.algorithm) {
      case 'round-robin':
        selectedServer = this.roundRobinSelection(healthyServers)
        break
      case 'least-connections':
        selectedServer = this.leastConnectionsSelection(healthyServers)
        break
      case 'weighted-round-robin':
        selectedServer = this.weightedRoundRobinSelection(healthyServers)
        break
      case 'ip-hash':
        selectedServer = this.ipHashSelection(healthyServers, clientId || '')
        break
      case 'random':
        selectedServer = this.randomSelection(healthyServers)
        break
      default:
        selectedServer = this.roundRobinSelection(healthyServers)
    }

    // Update session mapping
    if (this.config.stickySession && clientId)
      this.sessionMap.set(clientId, selectedServer.id)

    this.emit('serverSelected', { server: selectedServer, clientId })
    return selectedServer
  }

  private roundRobinSelection(servers: Server[]): Server {
    const server = servers[this.currentIndex % servers.length]
    this.currentIndex = (this.currentIndex + 1) % servers.length
    return server
  }

  private leastConnectionsSelection(servers: Server[]): Server {
    return servers.reduce((min, server) =>
      server.activeConnections < min.activeConnections ? server : min,
    )
  }

  private weightedRoundRobinSelection(servers: Server[]): Server {
    const totalWeight = servers.reduce((sum, server) => sum + server.weight, 0)
    let random = Math.random() * totalWeight

    for (const server of servers) {
      random -= server.weight
      if (random <= 0)
        return server
    }

    return servers[0]
  }

  private ipHashSelection(servers: Server[], clientId: string): Server {
    const hash = this.hashCode(clientId)
    return servers[Math.abs(hash) % servers.length]
  }

  private randomSelection(servers: Server[]): Server {
    return servers[Math.floor(Math.random() * servers.length)]
  }

  private hashCode(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash
  }

  // Request Handling
  public async handleRequest<T>(
    clientId: string,
    request: T,
    requestHandler: (server: Server, request: T) => Promise<any>,
  ): Promise<any> {
    let lastError: Error | null = null
    let lastServerId: string | null = null

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const server = this.selectServer(clientId)

      if (!server)
        throw new Error('No healthy servers available')

      lastServerId = server.id

      try {
        // Increment active connections
        server.activeConnections++
        this.requestCounts.set(server.id, (this.requestCounts.get(server.id) || 0) + 1)

        const startTime = Date.now()
        const result = await requestHandler(server, request)
        const responseTime = Date.now() - startTime

        // Update response time and success count
        this.updateResponseTime(server.id, responseTime)
        this.successCounts.set(server.id, (this.successCounts.get(server.id) || 0) + 1)
        server.responseTime = responseTime

        // Reset circuit breaker on success
        if (this.config.circuitBreaker)
          this.resetCircuitBreaker(server.id)

        this.emit('requestCompleted', {
          serverId: server.id,
          clientId,
          responseTime,
          success: true,
        })

        return result
      }
      catch (error) {
        lastError = error as Error

        this.emit('requestFailed', {
          serverId: server.id,
          clientId,
          error: lastError.message,
          attempt: attempt + 1,
        })

        // Wait before retry
        if (attempt < this.config.maxRetries)
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay))
      }
      finally {
        // Decrement active connections
        server.activeConnections = Math.max(0, server.activeConnections - 1)
      }
    }

    // Update failure count and circuit breaker only once per request
    if (lastServerId) {
      this.failureCounts.set(lastServerId, (this.failureCounts.get(lastServerId) || 0) + 1)

      if (this.config.circuitBreaker)
        this.recordCircuitBreakerFailure(lastServerId)
    }

    throw lastError || new Error('All retry attempts failed')
  }

  // Health Checks
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks()
    }, this.config.healthCheckInterval)
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.servers.values()).map(server =>
      this.checkServerHealth(server),
    )

    const results = await Promise.allSettled(healthCheckPromises)

    results.forEach((result, index) => {
      const server = Array.from(this.servers.values())[index]
      if (result.status === 'fulfilled') {
        this.updateServerHealth(server.id, result.value)
      }
      else {
        this.updateServerHealth(server.id, {
          serverId: server.id,
          isHealthy: false,
          responseTime: 0,
          error: result.reason?.message || 'Unknown error',
          timestamp: new Date(),
        })
      }
    })
  }

  private async checkServerHealth(server: Server): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      // Simulate health check (in real implementation, this would be an actual HTTP request)
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Health check timeout'))
        }, this.config.healthCheckTimeout)

        // Simulate server response
        setTimeout(() => {
          clearTimeout(timeout)
          resolve(true)
        }, Math.random() * 1000) // Random response time up to 1 second
      })

      const responseTime = Date.now() - startTime

      return {
        serverId: server.id,
        isHealthy: true,
        responseTime,
        timestamp: new Date(),
      }
    }
    catch (error) {
      return {
        serverId: server.id,
        isHealthy: false,
        responseTime: Date.now() - startTime,
        error: (error as Error).message,
        timestamp: new Date(),
      }
    }
  }

  private updateServerHealth(serverId: string, result: HealthCheckResult): void {
    const server = this.servers.get(serverId)
    if (!server)
      return

    const wasHealthy = server.isHealthy
    server.isHealthy = result.isHealthy
    server.responseTime = result.responseTime
    server.lastHealthCheck = result.timestamp

    if (wasHealthy !== result.isHealthy) {
      this.emit('serverHealthChanged', {
        serverId,
        isHealthy: result.isHealthy,
        previousHealth: wasHealthy,
        result,
      })
    }
  }

  // Circuit Breaker
  private isCircuitBreakerOpen(serverId: string): boolean {
    const breaker = this.circuitBreakers.get(serverId)
    if (!breaker || !this.config.circuitBreaker)
      return false

    if (breaker.isOpen) {
      const timeSinceLastFailure = Date.now() - breaker.lastFailure.getTime()
      if (timeSinceLastFailure > this.config.circuitBreakerTimeout) {
        breaker.isOpen = false
        breaker.failures = 0
        this.emit('circuitBreakerReset', { serverId })
        return false
      }
      return true
    }

    return false
  }

  private recordCircuitBreakerFailure(serverId: string): void {
    const breaker = this.circuitBreakers.get(serverId)
    if (!breaker)
      return

    breaker.failures++
    breaker.lastFailure = new Date()

    if (breaker.failures >= this.config.circuitBreakerThreshold) {
      breaker.isOpen = true
      this.emit('circuitBreakerOpened', { serverId, failures: breaker.failures })
    }
  }

  private resetCircuitBreaker(serverId: string): void {
    const breaker = this.circuitBreakers.get(serverId)
    if (!breaker)
      return

    breaker.failures = 0
    breaker.isOpen = false
  }

  // Statistics
  private updateResponseTime(serverId: string, responseTime: number): void {
    const times = this.responseTimes.get(serverId) || []
    times.push(responseTime)

    // Keep only last 100 response times
    if (times.length > 100)
      times.shift()

    this.responseTimes.set(serverId, times)
  }

  public getStatistics(): LoadBalancerStats {
    const totalRequests = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0)
    const successfulRequests = Array.from(this.successCounts.values()).reduce((sum, count) => sum + count, 0)
    const failedRequests = Array.from(this.failureCounts.values()).reduce((sum, count) => sum + count, 0)

    const allResponseTimes = Array.from(this.responseTimes.values()).flat()
    const averageResponseTime = allResponseTimes.length > 0
      ? allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length
      : 0

    const activeConnections = Array.from(this.servers.values())
      .reduce((sum, server) => sum + server.activeConnections, 0)

    const serverStats = Array.from(this.servers.values()).map((server) => {
      const requests = this.requestCounts.get(server.id) || 0
      const successes = this.successCounts.get(server.id) || 0
      const _failures = this.failureCounts.get(server.id) || 0
      const responseTimes = this.responseTimes.get(server.id) || []
      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0

      const successRate = requests > 0 ? successes / requests : 0

      return {
        serverId: server.id,
        requests,
        successRate,
        averageResponseTime,
        activeConnections: server.activeConnections,
      }
    })

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      activeConnections,
      serverStats,
    }
  }

  // Configuration
  public updateConfig(newConfig: Partial<LoadBalancerConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Restart health checks if interval changed
    if (newConfig.healthCheckInterval) {
      if (this.healthCheckInterval)
        clearInterval(this.healthCheckInterval)

      this.startHealthChecks()
    }

    this.emit('configUpdated', { config: this.config })
  }

  public getConfig(): LoadBalancerConfig {
    return { ...this.config }
  }

  // Session Management
  public clearSession(clientId: string): boolean {
    return this.sessionMap.delete(clientId)
  }

  public clearAllSessions(): void {
    this.sessionMap.clear()
  }

  public getSessionServer(clientId: string): string | undefined {
    return this.sessionMap.get(clientId)
  }

  // Cleanup
  public destroy(): void {
    if (this.healthCheckInterval)
      clearInterval(this.healthCheckInterval)

    this.servers.clear()
    this.sessionMap.clear()
    this.requestCounts.clear()
    this.successCounts.clear()
    this.failureCounts.clear()
    this.responseTimes.clear()
    this.circuitBreakers.clear()

    this.emit('destroyed')
  }
}
