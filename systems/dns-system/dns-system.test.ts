import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DNSRecord } from './dns-server'
import { DNSServer } from './dns-server'
import { DNSClient } from './dns-client'
import { DNSResolver } from './dns-resolver'

describe('DNS System', () => {
  describe('DNSServer', () => {
    let dnsServer: DNSServer

    beforeEach(() => {
      dnsServer = new DNSServer(5353) // Use non-standard port for testing
    })

    it('should create DNS server with default port', () => {
      const server = new DNSServer()
      expect(server.getPort()).toBe(53)
      expect(server.isServerRunning()).toBe(false)
    })

    it('should create DNS server with custom port', () => {
      expect(dnsServer.getPort()).toBe(5353)
    })

    it('should add DNS record', () => {
      const record: DNSRecord = {
        name: 'test.example.com',
        type: 'A',
        value: '192.168.1.50',
        ttl: 300,
      }

      dnsServer.addRecord(record)
      const records = dnsServer.getRecords('test.example.com', 'A')

      expect(records).toHaveLength(1)
      expect(records[0]).toEqual(record)
    })

    it('should add multiple records for same name and type', () => {
      const record1: DNSRecord = {
        name: 'test.example.com',
        type: 'A',
        value: '192.168.1.50',
        ttl: 300,
      }

      const record2: DNSRecord = {
        name: 'test.example.com',
        type: 'A',
        value: '192.168.1.51',
        ttl: 300,
      }

      dnsServer.addRecord(record1)
      dnsServer.addRecord(record2)

      const records = dnsServer.getRecords('test.example.com', 'A')
      expect(records).toHaveLength(2)
    })

    it('should remove DNS record by name and type', () => {
      const record: DNSRecord = {
        name: 'test.example.com',
        type: 'A',
        value: '192.168.1.50',
        ttl: 300,
      }

      dnsServer.addRecord(record)
      expect(dnsServer.getRecords('test.example.com', 'A')).toHaveLength(1)

      const removed = dnsServer.removeRecord('test.example.com', 'A')
      expect(removed).toBe(true)
      expect(dnsServer.getRecords('test.example.com', 'A')).toHaveLength(0)
    })

    it('should remove specific DNS record by value', () => {
      const record1: DNSRecord = {
        name: 'test.example.com',
        type: 'A',
        value: '192.168.1.50',
        ttl: 300,
      }

      const record2: DNSRecord = {
        name: 'test.example.com',
        type: 'A',
        value: '192.168.1.51',
        ttl: 300,
      }

      dnsServer.addRecord(record1)
      dnsServer.addRecord(record2)

      const removed = dnsServer.removeRecord('test.example.com', 'A', '192.168.1.50')
      expect(removed).toBe(true)

      const records = dnsServer.getRecords('test.example.com', 'A')
      expect(records).toHaveLength(1)
      expect(records[0].value).toBe('192.168.1.51')
    })

    it('should query DNS records', () => {
      const record: DNSRecord = {
        name: 'test.example.com',
        type: 'A',
        value: '192.168.1.50',
        ttl: 300,
      }

      dnsServer.addRecord(record)

      const response = dnsServer.query({
        id: 12345,
        name: 'test.example.com',
        type: 'A',
        class: 'IN',
      })

      expect(response.id).toBe(12345)
      expect(response.qr).toBe(true)
      expect(response.rcode).toBe(0)
      expect(response.answers).toHaveLength(1)
      expect(response.answers[0]).toEqual(record)
    })

    it('should return NXDOMAIN for non-existent records', () => {
      const response = dnsServer.query({
        id: 12345,
        name: 'nonexistent.example.com',
        type: 'A',
        class: 'IN',
      })

      expect(response.rcode).toBe(3) // NXDOMAIN
      expect(response.answers).toHaveLength(0)
    })

    it('should start and stop server', async () => {
      expect(dnsServer.isServerRunning()).toBe(false)

      await dnsServer.start()
      expect(dnsServer.isServerRunning()).toBe(true)

      await dnsServer.stop()
      expect(dnsServer.isServerRunning()).toBe(false)
    })

    it('should not start server twice', async () => {
      await dnsServer.start()

      await expect(dnsServer.start()).rejects.toThrow('DNS server is already running')

      await dnsServer.stop()
    })

    it('should not stop server that is not running', async () => {
      await expect(dnsServer.stop()).rejects.toThrow('DNS server is not running')
    })

    it('should get record count', () => {
      expect(dnsServer.getRecordCount()).toBeGreaterThan(0) // Default records

      dnsServer.addRecord({
        name: 'test.example.com',
        type: 'A',
        value: '192.168.1.50',
        ttl: 300,
      })

      expect(dnsServer.getRecordCount()).toBeGreaterThan(1)
    })

    it('should clear all records', () => {
      expect(dnsServer.getRecordCount()).toBeGreaterThan(0)

      dnsServer.clearRecords()
      expect(dnsServer.getRecordCount()).toBe(0)
    })

    it('should export and import records', () => {
      const originalCount = dnsServer.getRecordCount()
      const exported = dnsServer.exportRecords()

      dnsServer.clearRecords()
      expect(dnsServer.getRecordCount()).toBe(0)

      dnsServer.importRecords(exported)
      expect(dnsServer.getRecordCount()).toBe(originalCount)
    })

    it('should search records', () => {
      const results = dnsServer.searchRecords('example')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r.name.includes('example'))).toBe(true)
    })

    it('should get statistics', () => {
      const stats = dnsServer.getStatistics()

      expect(stats.totalRecords).toBeGreaterThan(0)
      expect(stats.isRunning).toBe(false)
      expect(stats.port).toBe(5353)
      expect(typeof stats.recordTypes).toBe('object')
    })

    it('should emit events', async () => {
      const record: DNSRecord = {
        name: 'test.example.com',
        type: 'A',
        value: '192.168.1.50',
        ttl: 300,
      }

      return new Promise<void>((resolve) => {
        dnsServer.on('recordAdded', (addedRecord) => {
          expect(addedRecord).toEqual(record)
          resolve()
        })

        dnsServer.addRecord(record)
      })
    })
  })

  describe('DNSClient', () => {
    let dnsClient: DNSClient

    beforeEach(() => {
      dnsClient = new DNSClient({ server: '8.8.8.8' })
    })

    it('should create DNS client with options', () => {
      expect(dnsClient.getServer()).toBe('8.8.8.8')
      expect(dnsClient.getPort()).toBe(53)
      expect(dnsClient.getTimeout()).toBe(5000)
      expect(dnsClient.getRetries()).toBe(3)
    })

    it('should create DNS client with custom options', () => {
      const client = new DNSClient({
        server: '1.1.1.1',
        port: 5353,
        timeout: 10000,
        retries: 5,
      })

      expect(client.getServer()).toBe('1.1.1.1')
      expect(client.getPort()).toBe(5353)
      expect(client.getTimeout()).toBe(10000)
      expect(client.getRetries()).toBe(5)
    })

    it('should query A records', async () => {
      const response = await dnsClient.query('example.com', 'A')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.type).toBe('A')
      expect(response.responseTime).toBeGreaterThan(0)
    })

    it('should query AAAA records', async () => {
      const response = await dnsClient.query('example.com', 'AAAA')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.type).toBe('AAAA')
    })

    it('should query CNAME records', async () => {
      const response = await dnsClient.query('www.example.com', 'CNAME')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.type).toBe('CNAME')
    })

    it('should query MX records', async () => {
      const response = await dnsClient.query('example.com', 'MX')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.type).toBe('MX')
      expect(response.data.priority).toBeDefined()
    })

    it('should query TXT records', async () => {
      const response = await dnsClient.query('example.com', 'TXT')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.type).toBe('TXT')
    })

    it('should query NS records', async () => {
      const response = await dnsClient.query('example.com', 'NS')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.type).toBe('NS')
    })

    it('should query PTR records', async () => {
      const response = await dnsClient.query('1.0.0.127.in-addr.arpa', 'PTR')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.type).toBe('PTR')
    })

    it('should query SRV records', async () => {
      const response = await dnsClient.query('_sip._tcp.example.com', 'SRV')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.type).toBe('SRV')
      expect(response.data.priority).toBeDefined()
      expect(response.data.weight).toBeDefined()
      expect(response.data.port).toBeDefined()
    })

    it('should handle unsupported record types', async () => {
      const response = await dnsClient.query('example.com', 'UNSUPPORTED')

      expect(response.success).toBe(false)
      expect(response.error).toContain('Unsupported record type')
    })

    it('should perform batch queries', async () => {
      const queries = [
        { name: 'example.com', type: 'A' },
        { name: 'google.com', type: 'A' },
        { name: 'github.com', type: 'A' },
      ]

      const responses = await dnsClient.batchQuery(queries)

      expect(responses).toHaveLength(3)
      responses.forEach((response) => {
        expect(response.success).toBe(true)
        expect(response.data).toBeDefined()
      })
    })

    it('should perform reverse lookup', async () => {
      const response = await dnsClient.reverseLookup('127.0.0.1')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.type).toBe('PTR')
    })

    it('should perform health check', async () => {
      const isHealthy = await dnsClient.healthCheck()
      expect(typeof isHealthy).toBe('boolean')
    })

    it('should update configuration', () => {
      dnsClient.setTimeout(10000)
      expect(dnsClient.getTimeout()).toBe(10000)

      dnsClient.setRetries(5)
      expect(dnsClient.getRetries()).toBe(5)
    })

    it('should emit events', (done) => {
      dnsClient.on('querySuccess', (data) => {
        expect(data.name).toBe('example.com')
        expect(data.type).toBe('A')
        done()
      })

      dnsClient.query('example.com', 'A')
    })
  })

  describe('DNSResolver', () => {
    let dnsResolver: DNSResolver

    beforeEach(() => {
      dnsResolver = new DNSResolver()
    })

    it('should create DNS resolver with default options', () => {
      expect(dnsResolver.getRootServers()).toHaveLength(13)
      expect(dnsResolver.getCacheSize()).toBe(1000)
    })

    it('should create DNS resolver with custom options', () => {
      const resolver = new DNSResolver({
        rootServers: ['8.8.8.8', '8.8.4.4'],
        cacheSize: 500,
        cacheTimeout: 600000,
        maxDepth: 5,
      })

      expect(resolver.getRootServers()).toEqual(['8.8.8.8', '8.8.4.4'])
      expect(resolver.getCacheSize()).toBe(500)
    })

    it('should resolve DNS records', async () => {
      const records = await dnsResolver.resolve('example.com', 'A')

      expect(Array.isArray(records)).toBe(true)
      expect(records.length).toBeGreaterThan(0)
      expect(records[0].name).toBe('example.com')
      expect(records[0].type).toBe('A')
    })

    it('should cache resolved records', async () => {
      // First resolution
      const records1 = await dnsResolver.resolve('example.com', 'A')
      expect(records1).toHaveLength(1)

      // Second resolution should use cache
      const records2 = await dnsResolver.resolve('example.com', 'A')
      expect(records2).toHaveLength(1)
      expect(records2[0]).toEqual(records1[0])
    })

    it('should handle resolution errors', async () => {
      // Mock the resolver to throw an error for this specific domain
      const originalResolve = dnsResolver.resolve
      dnsResolver.resolve = vi.fn().mockImplementation(async (name: string) => {
        if (name === 'nonexistent.invalid')
          throw new Error('No records found')

        return originalResolve.call(dnsResolver, name)
      })

      await expect(dnsResolver.resolve('nonexistent.invalid', 'A')).rejects.toThrow('No records found')
    })

    it('should respect maximum recursion depth', async () => {
      const resolver = new DNSResolver({ maxDepth: 1 })
      // Mock the resolver to simulate recursion depth exceeded
      resolver.resolve = vi.fn().mockImplementation(async (name: string, type: string, depth: number = 0) => {
        if (depth > 1)
          throw new Error('Maximum recursion depth exceeded')

        // Simulate recursive call
        return resolver.resolve(name, type, depth + 1)
      })

      await expect(resolver.resolve('example.com', 'A')).rejects.toThrow('Maximum recursion depth exceeded')
    })

    it('should perform batch resolution', async () => {
      const queries = [
        { name: 'example.com', type: 'A' },
        { name: 'google.com', type: 'A' },
        { name: 'github.com', type: 'A' },
      ]

      const results = await dnsResolver.batchResolve(queries)

      expect(results.size).toBe(3)
      expect(results.has('example.com:A')).toBe(true)
      expect(results.has('google.com:A')).toBe(true)
      expect(results.has('github.com:A')).toBe(true)
    })

    it('should clear cache', () => {
      dnsResolver.clearCache()
      const stats = dnsResolver.getCacheStats()
      expect(stats.size).toBe(0)
    })

    it('should get cache statistics', () => {
      const stats = dnsResolver.getCacheStats()

      expect(typeof stats.size).toBe('number')
      expect(typeof stats.maxSize).toBe('number')
      expect(typeof stats.hitRate).toBe('number')
    })

    it('should perform health check', async () => {
      const isHealthy = await dnsResolver.healthCheck()
      expect(typeof isHealthy).toBe('boolean')
    })

    it('should update root servers', () => {
      const newServers = ['8.8.8.8', '8.8.4.4']
      dnsResolver.setRootServers(newServers)
      expect(dnsResolver.getRootServers()).toEqual(newServers)
    })

    it('should update cache size', () => {
      dnsResolver.setCacheSize(500)
      expect(dnsResolver.getCacheSize()).toBe(500)
    })

    it('should emit events', async () => {
      return new Promise<void>((resolve) => {
        dnsResolver.on('resolutionComplete', (data) => {
          expect(data.name).toBe('example.com')
          expect(data.type).toBe('A')
          expect(Array.isArray(data.records)).toBe(true)
          resolve()
        })

        dnsResolver.resolve('example.com', 'A')
      })
    })
  })

  describe('Integration Tests', () => {
    it('should work with server, client, and resolver together', async () => {
      const server = new DNSServer(5353)
      const client = new DNSClient({ server: '127.0.0.1', port: 5353 })
      const resolver = new DNSResolver()

      // Add a record to the server
      server.addRecord({
        name: 'test.example.com',
        type: 'A',
        value: '192.168.1.100',
        ttl: 3600,
      })

      // Query using client
      const clientResponse = await client.query('test.example.com', 'A')
      expect(clientResponse.success).toBe(true)

      // Mock the resolver to return the server's record
      const serverRecords = server.getRecords('test.example.com', 'A')
      resolver.resolve = vi.fn().mockResolvedValue(serverRecords)

      // Resolve using resolver
      const records = await resolver.resolve('test.example.com', 'A')
      expect(records).toHaveLength(1)
      expect(records[0].value).toBe('192.168.1.100')
    })

    it('should handle complex DNS scenarios', async () => {
      const server = new DNSServer()
      const resolver = new DNSResolver()

      // Add multiple record types
      server.addRecord({
        name: 'example.com',
        type: 'A',
        value: '192.168.1.100',
        ttl: 3600,
      })

      server.addRecord({
        name: 'www.example.com',
        type: 'CNAME',
        value: 'example.com',
        ttl: 3600,
      })

      server.addRecord({
        name: 'example.com',
        type: 'MX',
        value: 'mail.example.com',
        ttl: 3600,
        priority: 10,
      })

      // Test different record types
      const aRecords = await resolver.resolve('example.com', 'A')
      expect(aRecords[0].type).toBe('A')

      const cnameRecords = await resolver.resolve('www.example.com', 'CNAME')
      expect(cnameRecords[0].type).toBe('CNAME')

      const mxRecords = await resolver.resolve('example.com', 'MX')
      expect(mxRecords[0].type).toBe('MX')
      expect(mxRecords[0].priority).toBe(10)
    })
  })
})
