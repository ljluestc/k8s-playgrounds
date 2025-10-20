import { EventEmitter } from 'node:events'
import { DNSClient } from './dns-client'
import type { DNSRecord } from './dns-server'

export interface ResolverOptions {
  rootServers?: string[]
  cacheSize?: number
  cacheTimeout?: number
  maxDepth?: number
}

export interface CacheEntry {
  record: DNSRecord
  timestamp: number
  ttl: number
}

export class DNSResolver extends EventEmitter {
  private cache: Map<string, CacheEntry> = new Map()
  private rootServers: string[]
  private cacheSize: number
  private cacheTimeout: number
  private maxDepth: number
  private clients: Map<string, DNSClient> = new Map()

  constructor(options: ResolverOptions = {}) {
    super()
    this.rootServers = options.rootServers || [
      '198.41.0.4', // a.root-servers.net
      '199.9.14.201', // b.root-servers.net
      '192.33.4.12', // c.root-servers.net
      '199.7.91.13', // d.root-servers.net
      '192.203.230.10', // e.root-servers.net
      '192.5.5.241', // f.root-servers.net
      '192.112.36.4', // g.root-servers.net
      '198.97.190.53', // h.root-servers.net
      '192.36.148.17', // i.root-servers.net
      '192.58.128.30', // j.root-servers.net
      '193.0.14.129', // k.root-servers.net
      '199.7.83.42', // l.root-servers.net
      '202.12.27.33', // m.root-servers.net
    ]
    this.cacheSize = options.cacheSize || 1000
    this.cacheTimeout = options.cacheTimeout || 300000 // 5 minutes
    this.maxDepth = options.maxDepth || 10
  }

  public async resolve(name: string, type: string = 'A', depth: number = 0): Promise<DNSRecord[]> {
    if (depth > this.maxDepth)
      throw new Error('Maximum recursion depth exceeded')

    const cacheKey = `${name}:${type}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      this.emit('cacheHit', { name, type, records: cached })
      return cached
    }

    this.emit('cacheMiss', { name, type })

    try {
      const records = await this.performResolution(name, type, depth)
      this.addToCache(cacheKey, records)
      this.emit('resolutionComplete', { name, type, records })
      return records
    }
    catch (error) {
      this.emit('resolutionError', { name, type, error })
      throw error
    }
  }

  private async performResolution(name: string, type: string, _depth: number): Promise<DNSRecord[]> {
    const domain = this.extractDomain(name)
    const tld = this.extractTLD(domain)

    // Try root servers first
    for (const rootServer of this.rootServers) {
      try {
        const client = this.getClient(rootServer)
        const response = await client.query(name, type)

        if (response.success && response.data) {
          const records = Array.isArray(response.data) ? response.data : [response.data]
          return records.map(record => this.normalizeRecord(record))
        }
      }
      catch (error) {
        this.emit('rootServerError', { server: rootServer, error })
        continue
      }
    }

    // If root servers don't have the answer, try TLD servers
    const tldServers = await this.getTLDServers(tld)
    for (const server of tldServers) {
      try {
        const client = this.getClient(server)
        const response = await client.query(name, type)

        if (response.success && response.data) {
          const records = Array.isArray(response.data) ? response.data : [response.data]
          return records.map(record => this.normalizeRecord(record))
        }
      }
      catch (error) {
        this.emit('tldServerError', { server, error })
        continue
      }
    }

    // If TLD servers don't have the answer, try authoritative servers
    const authServers = await this.getAuthoritativeServers(domain)
    for (const server of authServers) {
      try {
        const client = this.getClient(server)
        const response = await client.query(name, type)

        if (response.success && response.data) {
          const records = Array.isArray(response.data) ? response.data : [response.data]
          return records.map(record => this.normalizeRecord(record))
        }
      }
      catch (error) {
        this.emit('authServerError', { server, error })
        continue
      }
    }

    throw new Error(`No records found for ${name} of type ${type}`)
  }

  private extractDomain(name: string): string {
    const parts = name.split('.')
    if (parts.length < 2)
      return name

    return parts.slice(-2).join('.')
  }

  private extractTLD(domain: string): string {
    const parts = domain.split('.')
    return parts[parts.length - 1]
  }

  private async getTLDServers(tld: string): Promise<string[]> {
    // Simulate TLD server discovery
    const tldServers: Record<string, string[]> = {
      com: ['198.41.0.4', '199.9.14.201'],
      org: ['199.7.91.13', '192.5.5.241'],
      net: ['192.33.4.12', '199.7.83.42'],
      edu: ['192.36.148.17', '192.58.128.30'],
      gov: ['192.5.5.241', '192.33.4.12'],
    }

    return tldServers[tld] || this.rootServers.slice(0, 2)
  }

  private async getAuthoritativeServers(domain: string): Promise<string[]> {
    // Simulate authoritative server discovery
    const authServers: Record<string, string[]> = {
      'example.com': ['192.168.1.1', '192.168.1.2'],
      'google.com': ['8.8.8.8', '8.8.4.4'],
      'github.com': ['140.82.112.4', '140.82.112.5'],
    }

    return authServers[domain] || ['8.8.8.8', '8.8.4.4']
  }

  private getClient(server: string): DNSClient {
    if (!this.clients.has(server)) {
      const client = new DNSClient({ server, port: 53 })
      this.clients.set(server, client)
    }
    return this.clients.get(server)!
  }

  private normalizeRecord(record: any): DNSRecord {
    return {
      name: record.name,
      type: record.type,
      value: record.value,
      ttl: record.ttl || 3600,
      priority: record.priority,
      weight: record.weight,
      port: record.port,
    }
  }

  private getFromCache(key: string): DNSRecord[] | null {
    const entry = this.cache.get(key)
    if (!entry)
      return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key)
      return null
    }

    return [entry.record]
  }

  private addToCache(key: string, records: DNSRecord[]): void {
    if (this.cache.size >= this.cacheSize)
      this.evictOldestCacheEntry()

    for (const record of records) {
      const entry: CacheEntry = {
        record,
        timestamp: Date.now(),
        ttl: record.ttl,
      }
      this.cache.set(`${key}:${record.value}`, entry)
    }
  }

  private evictOldestCacheEntry(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey)
      this.cache.delete(oldestKey)
  }

  public clearCache(): void {
    this.cache.clear()
    this.emit('cacheCleared')
  }

  public getCacheStats(): {
    size: number
    maxSize: number
    hitRate: number
  } {
    return {
      size: this.cache.size,
      maxSize: this.cacheSize,
      hitRate: 0.85, // Simulated hit rate
    }
  }

  public async batchResolve(queries: Array<{ name: string; type: string }>): Promise<Map<string, DNSRecord[]>> {
    const results = new Map<string, DNSRecord[]>()
    const promises = queries.map(async (query) => {
      try {
        const records = await this.resolve(query.name, query.type)
        results.set(`${query.name}:${query.type}`, records)
      }
      catch (error) {
        results.set(`${query.name}:${query.type}`, [])
      }
    })

    await Promise.all(promises)
    return results
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.resolve('example.com', 'A')
      return true
    }
    catch {
      return false
    }
  }

  public getRootServers(): string[] {
    return [...this.rootServers]
  }

  public setRootServers(servers: string[]): void {
    this.rootServers = [...servers]
  }

  public getCacheSize(): number {
    return this.cacheSize
  }

  public setCacheSize(size: number): void {
    this.cacheSize = size
  }
}
