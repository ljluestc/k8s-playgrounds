# Load Balancer System

A comprehensive load balancing system with multiple algorithms, health checking, circuit breaker patterns, and sticky sessions.

## Features

### Core Functionality
- **Multiple Load Balancing Algorithms**: Round-robin, least-connections, weighted-round-robin, IP-hash, and random
- **Health Checking**: Automatic health monitoring with configurable intervals and timeouts
- **Circuit Breaker**: Automatic failure detection and recovery
- **Sticky Sessions**: Session affinity for consistent server selection
- **Request Retry**: Automatic retry with exponential backoff
- **Statistics Tracking**: Comprehensive metrics and monitoring
- **Event System**: Real-time events for monitoring and alerting

### Advanced Features
- **Server Management**: Add, remove, and configure servers dynamically
- **Connection Tracking**: Monitor active connections per server
- **Response Time Monitoring**: Track and analyze response times
- **Configuration Management**: Runtime configuration updates
- **Session Management**: Client session tracking and cleanup
- **Circuit Breaker Patterns**: Automatic failure isolation and recovery

## Architecture

### Core Classes

#### LoadBalancer
- Main load balancer class
- Manages servers and load balancing algorithms
- Handles health checks and circuit breakers
- Provides statistics and monitoring

#### Server
- Represents a backend server
- Tracks health status and performance metrics
- Manages connection limits and weights

#### LoadBalancerConfig
- Configuration options for the load balancer
- Algorithm selection and parameters
- Health check and retry settings
- Circuit breaker configuration

## Usage

### Basic Setup

```typescript
import { LoadBalancer } from './load-balancer';

const loadBalancer = new LoadBalancer({
  algorithm: 'round-robin',
  healthCheckInterval: 30000,
  healthCheckTimeout: 5000,
  maxRetries: 3,
  retryDelay: 1000,
  stickySession: false,
  circuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000
});
```

### Server Management

```typescript
// Add a server
const server = loadBalancer.addServer({
  id: 'server1',
  host: '192.168.1.1',
  port: 8080,
  weight: 1,
  maxConnections: 100,
  metadata: { region: 'us-east-1' }
});

// Get server information
const server = loadBalancer.getServer('server1');

// Get all servers
const servers = loadBalancer.getAllServers();

// Get only healthy servers
const healthyServers = loadBalancer.getHealthyServers();

// Remove a server
loadBalancer.removeServer('server1');
```

### Load Balancing

```typescript
// Select a server using the configured algorithm
const server = loadBalancer.selectServer('client-id');

// Handle a request with automatic retry and error handling
const result = await loadBalancer.handleRequest(
  'client-id',
  requestData,
  async (server, request) => {
    // Your request handling logic
    return await makeRequest(server, request);
  }
);
```

### Health Checking

```typescript
// Health checks run automatically, but you can also trigger them manually
const loadBalancer = new LoadBalancer({
  healthCheckInterval: 30000, // Check every 30 seconds
  healthCheckTimeout: 5000    // 5 second timeout
});

// Listen for health change events
loadBalancer.on('serverHealthChanged', (data) => {
  console.log(`Server ${data.serverId} is now ${data.isHealthy ? 'healthy' : 'unhealthy'}`);
});
```

### Circuit Breaker

```typescript
const loadBalancer = new LoadBalancer({
  circuitBreaker: true,
  circuitBreakerThreshold: 5,    // Open after 5 failures
  circuitBreakerTimeout: 60000   // Reset after 1 minute
});

// Listen for circuit breaker events
loadBalancer.on('circuitBreakerOpened', (data) => {
  console.log(`Circuit breaker opened for server ${data.serverId}`);
});

loadBalancer.on('circuitBreakerReset', (data) => {
  console.log(`Circuit breaker reset for server ${data.serverId}`);
});
```

### Sticky Sessions

```typescript
const loadBalancer = new LoadBalancer({
  stickySession: true,
  sessionTimeout: 300000 // 5 minutes
});

// Same client will always get the same server
const server1 = loadBalancer.selectServer('client-123');
const server2 = loadBalancer.selectServer('client-123');
// server1.id === server2.id

// Clear a specific session
loadBalancer.clearSession('client-123');

// Clear all sessions
loadBalancer.clearAllSessions();
```

### Statistics and Monitoring

```typescript
// Get comprehensive statistics
const stats = loadBalancer.getStatistics();

console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Successful requests: ${stats.successfulRequests}`);
console.log(`Failed requests: ${stats.failedRequests}`);
console.log(`Average response time: ${stats.averageResponseTime}ms`);
console.log(`Active connections: ${stats.activeConnections}`);

// Server-specific statistics
stats.serverStats.forEach(serverStat => {
  console.log(`Server ${serverStat.serverId}:`);
  console.log(`  Requests: ${serverStat.requests}`);
  console.log(`  Success rate: ${serverStat.successRate * 100}%`);
  console.log(`  Average response time: ${serverStat.averageResponseTime}ms`);
  console.log(`  Active connections: ${serverStat.activeConnections}`);
});
```

### Configuration Management

```typescript
// Update configuration at runtime
loadBalancer.updateConfig({
  algorithm: 'least-connections',
  maxRetries: 5,
  retryDelay: 2000
});

// Get current configuration
const config = loadBalancer.getConfig();
console.log('Current algorithm:', config.algorithm);
```

### Event Handling

```typescript
// Listen for various events
loadBalancer.on('serverAdded', (data) => {
  console.log(`Server ${data.server.id} added`);
});

loadBalancer.on('serverRemoved', (data) => {
  console.log(`Server ${data.serverId} removed`);
});

loadBalancer.on('serverSelected', (data) => {
  console.log(`Server ${data.server.id} selected for client ${data.clientId}`);
});

loadBalancer.on('requestCompleted', (data) => {
  console.log(`Request completed on server ${data.serverId} in ${data.responseTime}ms`);
});

loadBalancer.on('requestFailed', (data) => {
  console.log(`Request failed on server ${data.serverId}: ${data.error}`);
});

loadBalancer.on('noHealthyServers', (data) => {
  console.log('No healthy servers available');
});
```

## Load Balancing Algorithms

### Round Robin
Distributes requests evenly across all healthy servers in a circular fashion.

```typescript
const loadBalancer = new LoadBalancer({ algorithm: 'round-robin' });
```

### Least Connections
Routes requests to the server with the fewest active connections.

```typescript
const loadBalancer = new LoadBalancer({ algorithm: 'least-connections' });
```

### Weighted Round Robin
Distributes requests based on server weights, with higher weights receiving more requests.

```typescript
const loadBalancer = new LoadBalancer({ algorithm: 'weighted-round-robin' });

// Add servers with different weights
loadBalancer.addServer({ id: 's1', host: '1.1.1.1', port: 80, weight: 1, maxConnections: 100 });
loadBalancer.addServer({ id: 's2', host: '1.1.1.2', port: 80, weight: 3, maxConnections: 100 });
// s2 will receive 3x more requests than s1
```

### IP Hash
Uses client IP hash to consistently route the same client to the same server.

```typescript
const loadBalancer = new LoadBalancer({ algorithm: 'ip-hash' });
```

### Random
Randomly selects a server from the pool of healthy servers.

```typescript
const loadBalancer = new LoadBalancer({ algorithm: 'random' });
```

## Configuration Options

```typescript
interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections' | 'weighted-round-robin' | 'ip-hash' | 'random';
  healthCheckInterval: number;        // Health check interval in ms
  healthCheckTimeout: number;         // Health check timeout in ms
  maxRetries: number;                 // Maximum retry attempts
  retryDelay: number;                 // Delay between retries in ms
  stickySession: boolean;             // Enable sticky sessions
  sessionTimeout: number;             // Session timeout in ms
  circuitBreaker: boolean;            // Enable circuit breaker
  circuitBreakerThreshold: number;    // Failures before opening circuit
  circuitBreakerTimeout: number;      // Circuit breaker reset timeout in ms
}
```

## Health Checking

The load balancer automatically performs health checks on all servers at regular intervals. Health checks:

- Run asynchronously without blocking requests
- Use configurable timeouts
- Track response times
- Update server health status
- Emit events for health changes

## Circuit Breaker Pattern

The circuit breaker pattern helps prevent cascading failures by:

- Monitoring request failures
- Opening the circuit after threshold failures
- Blocking requests to failing servers
- Automatically resetting after timeout
- Providing fallback behavior

## Error Handling

The load balancer provides comprehensive error handling:

- Automatic retry with configurable attempts
- Circuit breaker for failing servers
- Graceful degradation when servers are unavailable
- Detailed error reporting and logging
- Event-driven error notifications

## Performance Considerations

- Efficient server selection algorithms
- Minimal overhead for health checks
- Optimized data structures for fast lookups
- Memory-efficient statistics tracking
- Asynchronous request handling

## Testing

The system includes comprehensive tests covering:

- All load balancing algorithms
- Health checking functionality
- Circuit breaker patterns
- Sticky session management
- Request handling and retry logic
- Statistics and monitoring
- Event system
- Configuration management
- Error handling scenarios

Run tests with:

```bash
npm test systems/load-balancer-system/load-balancer.test.ts
```

## Event System

The load balancer emits events for all major operations:

- `serverAdded` - When a server is added
- `serverRemoved` - When a server is removed
- `serverSelected` - When a server is selected for a request
- `serverHealthChanged` - When server health status changes
- `requestCompleted` - When a request completes successfully
- `requestFailed` - When a request fails
- `noHealthyServers` - When no healthy servers are available
- `circuitBreakerOpened` - When circuit breaker opens
- `circuitBreakerReset` - When circuit breaker resets
- `configUpdated` - When configuration is updated
- `destroyed` - When load balancer is destroyed

## Future Enhancements

- Advanced health check strategies
- Load balancing based on server metrics
- Geographic load balancing
- Advanced circuit breaker patterns
- Request queuing and throttling
- Advanced statistics and analytics
- Integration with monitoring systems
- Support for different protocols
- Advanced session management
- Load balancing policies and rules
