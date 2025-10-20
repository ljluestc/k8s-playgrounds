import { EventEmitter } from 'node:events'

export interface DNSRecord {
  name: string
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'PTR' | 'SRV'
  value: string
  ttl: number
  priority?: number // For MX and SRV records
  weight?: number // For SRV records
  port?: number // For SRV records
}

export interface DNSQuery {
  id: number
  name: string
  type: string
  class: string
}

export interface DNSResponse {
  id: number
  qr: boolean // Query/Response flag
  opcode: number
  aa: boolean // Authoritative Answer
  tc: boolean // Truncated
  rd: boolean // Recursion Desired
  ra: boolean // Recursion Available
  rcode: number // Response Code
  questions: DNSQuery[]
  answers: DNSRecord[]
  authority: DNSRecord[]
  additional: DNSRecord[]
}

export class DNSServer extends EventEmitter {
  private records: Map<string, DNSRecord[]> = new Map()
  private port: number
  private isRunning: boolean = false
  private server: any = null

  constructor(port: number = 53) {
    super()
    this.port = port
    this.initializeDefaultRecords()
  }

  private initializeDefaultRecords(): void {
    // Add some default DNS records
    this.addRecord({
      name: 'example.com',
      type: 'A',
      value: '192.168.1.100',
      ttl: 3600,
    })

    this.addRecord({
      name: 'www.example.com',
      type: 'CNAME',
      value: 'example.com',
      ttl: 3600,
    })

    this.addRecord({
      name: 'example.com',
      type: 'MX',
      value: 'mail.example.com',
      ttl: 3600,
      priority: 10,
    })

    this.addRecord({
      name: 'example.com',
      type: 'TXT',
      value: 'v=spf1 include:_spf.example.com ~all',
      ttl: 3600,
    })

    this.addRecord({
      name: 'example.com',
      type: 'NS',
      value: 'ns1.example.com',
      ttl: 3600,
    })

    this.addRecord({
      name: 'ns1.example.com',
      type: 'A',
      value: '192.168.1.1',
      ttl: 3600,
    })
  }

  public addRecord(record: DNSRecord): void {
    const key = `${record.name}:${record.type}`
    if (!this.records.has(key))
      this.records.set(key, [])

    this.records.get(key)!.push(record)
    this.emit('recordAdded', record)
  }

  public removeRecord(name: string, type: string, value?: string): boolean {
    const key = `${name}:${type}`
    if (!this.records.has(key))
      return false

    const records = this.records.get(key)!
    if (value) {
      const index = records.findIndex(r => r.value === value)
      if (index !== -1) {
        records.splice(index, 1)
        if (records.length === 0)
          this.records.delete(key)

        this.emit('recordRemoved', { name, type, value })
        return true
      }
    }
    else {
      this.records.delete(key)
      this.emit('recordRemoved', { name, type })
      return true
    }
    return false
  }

  public getRecords(name: string, type?: string): DNSRecord[] {
    if (type) {
      const key = `${name}:${type}`
      return this.records.get(key) || []
    }

    const results: DNSRecord[] = []
    for (const [key, records] of this.records) {
      if (key.startsWith(`${name}:`))
        results.push(...records)
    }
    return results
  }

  public query(question: DNSQuery): DNSResponse {
    const records = this.getRecords(question.name, question.type)

    const response: DNSResponse = {
      id: question.id,
      qr: true, // Response
      opcode: 0, // Standard query
      aa: true, // Authoritative
      tc: false, // Not truncated
      rd: question.class === 'IN', // Recursion desired
      ra: true, // Recursion available
      rcode: records.length > 0 ? 0 : 3, // No error or Name Error
      questions: [question],
      answers: records,
      authority: [],
      additional: [],
    }

    this.emit('queryProcessed', { question, response })
    return response
  }

  public async start(): Promise<void> {
    if (this.isRunning)
      throw new Error('DNS server is already running')

    return new Promise((resolve, reject) => {
      try {
        // Simulate DNS server startup
        this.isRunning = true
        this.emit('serverStarted', { port: this.port })
        resolve()
      }
      catch (error) {
        reject(error)
      }
    })
  }

  public async stop(): Promise<void> {
    if (!this.isRunning)
      throw new Error('DNS server is not running')

    return new Promise((resolve) => {
      this.isRunning = false
      this.server = null
      this.emit('serverStopped')
      resolve()
    })
  }

  public isServerRunning(): boolean {
    return this.isRunning
  }

  public getPort(): number {
    return this.port
  }

  public getRecordCount(): number {
    let count = 0
    for (const records of this.records.values())
      count += records.length

    return count
  }

  public clearRecords(): void {
    this.records.clear()
    this.emit('recordsCleared')
  }

  public exportRecords(): DNSRecord[] {
    const allRecords: DNSRecord[] = []
    for (const records of this.records.values())
      allRecords.push(...records)

    return allRecords
  }

  public importRecords(records: DNSRecord[]): void {
    this.clearRecords()
    for (const record of records)
      this.addRecord(record)

    this.emit('recordsImported', { count: records.length })
  }

  public searchRecords(query: string): DNSRecord[] {
    const results: DNSRecord[] = []
    const lowerQuery = query.toLowerCase()

    for (const [key, records] of this.records) {
      const [name, type] = key.split(':')
      if (name.toLowerCase().includes(lowerQuery)
          || type.toLowerCase().includes(lowerQuery)
          || records.some(r => r.value.toLowerCase().includes(lowerQuery)))
        results.push(...records)
    }

    return results
  }

  public getStatistics(): {
    totalRecords: number
    recordTypes: Record<string, number>
    isRunning: boolean
    port: number
  } {
    const recordTypes: Record<string, number> = {}
    let totalRecords = 0

    for (const [key, records] of this.records) {
      const [, type] = key.split(':')
      recordTypes[type] = (recordTypes[type] || 0) + records.length
      totalRecords += records.length
    }

    return {
      totalRecords,
      recordTypes,
      isRunning: this.isRunning,
      port: this.port,
    }
  }
}
