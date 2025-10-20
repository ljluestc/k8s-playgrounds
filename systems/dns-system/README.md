# DNS System

A comprehensive DNS (Domain Name System) implementation with server, client, and resolver components.

## Features

### DNS Server
- **Record Management**: Add, remove, and query DNS records
- **Multiple Record Types**: Support for A, AAAA, CNAME, MX, TXT, NS, PTR, and SRV records
- **Event-Driven**: Emits events for record changes and queries
- **Statistics**: Get server statistics and record counts
- **Import/Export**: Export and import DNS records
- **Search**: Search records by name, type, or value

### DNS Client
- **Query Support**: Query all standard DNS record types
- **Batch Queries**: Perform multiple queries simultaneously
- **Reverse Lookup**: Perform reverse DNS lookups (PTR records)
- **Health Check**: Check server connectivity
- **Configurable**: Customizable timeout, retries, and server settings
- **Event-Driven**: Emits events for query success/failure

### DNS Resolver
- **Recursive Resolution**: Resolve DNS queries recursively
- **Caching**: Built-in caching with TTL support
- **Root Server Support**: Uses standard root servers
- **Batch Resolution**: Resolve multiple queries efficiently
- **Configurable**: Customizable cache size, timeout, and recursion depth
- **Health Monitoring**: Built-in health check functionality

## Installation

```bash
npm install
```

## Usage

### Basic DNS Server

```typescript
import { DNSServer, DNSRecord } from './dns-server';

const server = new DNSServer(5353);

// Add a DNS record
const record: DNSRecord = {
  name: 'example.com',
  type: 'A',
  value: '192.168.1.100',
  ttl: 3600
};

server.addRecord(record);

// Start the server
await server.start();

// Query records
const response = server.query({
  id: 12345,
  name: 'example.com',
  type: 'A',
  class: 'IN'
});

console.log(response.answers);
```

### DNS Client

```typescript
import { DNSClient } from './dns-client';

const client = new DNSClient({
  server: '8.8.8.8',
  port: 53,
  timeout: 5000,
  retries: 3
});

// Query a single record
const response = await client.query('example.com', 'A');
console.log(response.data);

// Batch queries
const queries = [
  { name: 'example.com', type: 'A' },
  { name: 'google.com', type: 'A' }
];

const responses = await client.batchQuery(queries);
console.log(responses);

// Reverse lookup
const reverseResponse = await client.reverseLookup('8.8.8.8');
console.log(reverseResponse.data);
```

### DNS Resolver

```typescript
import { DNSResolver } from './dns-resolver';

const resolver = new DNSResolver({
  rootServers: ['8.8.8.8', '8.8.4.4'],
  cacheSize: 1000,
  cacheTimeout: 300000,
  maxDepth: 10
});

// Resolve a domain
const records = await resolver.resolve('example.com', 'A');
console.log(records);

// Batch resolution
const queries = [
  { name: 'example.com', type: 'A' },
  { name: 'google.com', type: 'A' }
];

const results = await resolver.batchResolve(queries);
console.log(results);

// Get cache statistics
const stats = resolver.getCacheStats();
console.log(stats);
```

## Record Types

### A Record
```typescript
{
  name: 'example.com',
  type: 'A',
  value: '192.168.1.100',
  ttl: 3600
}
```

### AAAA Record (IPv6)
```typescript
{
  name: 'example.com',
  type: 'AAAA',
  value: '2001:db8::1',
  ttl: 3600
}
```

### CNAME Record
```typescript
{
  name: 'www.example.com',
  type: 'CNAME',
  value: 'example.com',
  ttl: 3600
}
```

### MX Record (Mail Exchange)
```typescript
{
  name: 'example.com',
  type: 'MX',
  value: 'mail.example.com',
  ttl: 3600,
  priority: 10
}
```

### TXT Record
```typescript
{
  name: 'example.com',
  type: 'TXT',
  value: 'v=spf1 include:_spf.example.com ~all',
  ttl: 3600
}
```

### NS Record (Name Server)
```typescript
{
  name: 'example.com',
  type: 'NS',
  value: 'ns1.example.com',
  ttl: 3600
}
```

### PTR Record (Reverse DNS)
```typescript
{
  name: '1.0.0.127.in-addr.arpa',
  type: 'PTR',
  value: 'localhost',
  ttl: 3600
}
```

### SRV Record (Service)
```typescript
{
  name: '_sip._tcp.example.com',
  type: 'SRV',
  value: 'sip.example.com',
  ttl: 3600,
  priority: 10,
  weight: 5,
  port: 5060
}
```

## Events

### DNS Server Events
- `recordAdded`: Emitted when a record is added
- `recordRemoved`: Emitted when a record is removed
- `queryProcessed`: Emitted when a query is processed
- `serverStarted`: Emitted when the server starts
- `serverStopped`: Emitted when the server stops
- `recordsCleared`: Emitted when all records are cleared
- `recordsImported`: Emitted when records are imported

### DNS Client Events
- `querySuccess`: Emitted when a query succeeds
- `queryError`: Emitted when a query fails

### DNS Resolver Events
- `cacheHit`: Emitted when a cache hit occurs
- `cacheMiss`: Emitted when a cache miss occurs
- `resolutionComplete`: Emitted when resolution completes
- `resolutionError`: Emitted when resolution fails
- `cacheCleared`: Emitted when cache is cleared

## Testing

Run the test suite:

```bash
npm test
```

The test suite includes:
- Unit tests for all components
- Integration tests
- Event testing
- Error handling tests
- Performance tests

## Configuration

### DNS Server Configuration
- `port`: Server port (default: 53)

### DNS Client Configuration
- `server`: DNS server address
- `port`: DNS server port (default: 53)
- `timeout`: Query timeout in milliseconds (default: 5000)
- `retries`: Number of retries (default: 3)

### DNS Resolver Configuration
- `rootServers`: Array of root server IPs
- `cacheSize`: Maximum cache size (default: 1000)
- `cacheTimeout`: Cache timeout in milliseconds (default: 300000)
- `maxDepth`: Maximum recursion depth (default: 10)

## Performance

The DNS system is designed for high performance:
- Efficient caching with TTL support
- Batch query support
- Event-driven architecture
- Minimal memory footprint
- Fast record lookups

## License

MIT License
