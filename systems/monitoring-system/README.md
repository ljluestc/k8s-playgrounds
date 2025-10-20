# Monitoring System

A comprehensive monitoring and alerting system with metrics collection, alert management, dashboard creation, and real-time monitoring capabilities.

## Features

### Core Functionality
- **Metrics Collection**: Record and store time-series metrics with tags and metadata
- **Alert Management**: Create, update, and manage alerts with configurable conditions
- **Dashboard Creation**: Build interactive dashboards with various widget types
- **Real-time Monitoring**: Live monitoring with configurable check intervals
- **Data Aggregation**: Aggregate metrics with sum, average, min, max, and count operations
- **Historical Data**: Store and query historical metrics with time range filtering
- **Event System**: Real-time events for monitoring and alerting

### Advanced Features
- **Alert Instances**: Track and manage alert trigger instances
- **Widget Management**: Add, update, and remove widgets from dashboards
- **Data Cleanup**: Automatic cleanup of old data based on retention policies
- **Configuration Management**: Runtime configuration updates
- **Statistics and Analytics**: Comprehensive monitoring statistics
- **Multiple Alert Severities**: Low, medium, high, and critical alert levels
- **Flexible Conditions**: Support for various comparison operators

## Architecture

### Core Classes

#### MonitoringSystem
- Main monitoring system class
- Manages metrics, alerts, dashboards, and widgets
- Handles alert checking and event emission
- Provides statistics and analytics

#### Metric
- Represents a time-series data point
- Contains value, timestamp, tags, and metadata
- Supports filtering and aggregation

#### Alert
- Defines alert conditions and thresholds
- Supports multiple severity levels
- Configurable operators and conditions

#### Dashboard
- Container for monitoring widgets
- Configurable layout and positioning
- Public/private visibility settings

#### Widget
- Individual monitoring components
- Various types: charts, gauges, tables, text, metrics
- Configurable refresh intervals and filters

## Usage

### Basic Setup

```typescript
import { MonitoringSystem } from './monitoring';

const monitoring = new MonitoringSystem({
  retentionPeriod: 30, // 30 days
  alertCheckInterval: 5000, // 5 seconds
  metricBufferSize: 1000,
  maxAlerts: 1000,
  enableRealTime: true,
  enableHistoricalData: true,
  enableAlerting: true,
  enableDashboards: true
});
```

### Metrics Collection

```typescript
// Record a metric
const metric = monitoring.recordMetric({
  id: 'cpu-usage-001',
  name: 'cpu_usage',
  value: 75.5,
  tags: { 
    host: 'server1', 
    service: 'web',
    environment: 'production' 
  },
  metadata: { 
    unit: 'percentage',
    source: 'system' 
  }
});

// Get metrics by name
const metrics = monitoring.getMetrics('cpu_usage');

// Get metrics within time range
const recentMetrics = monitoring.getMetrics('cpu_usage', {
  start: new Date(Date.now() - 3600000), // 1 hour ago
  end: new Date()
});

// Get latest metric
const latest = monitoring.getLatestMetric('cpu_usage');

// Get all metric names
const metricNames = monitoring.getMetricNames();
```

### Alert Management

```typescript
// Create an alert
const alert = monitoring.createAlert({
  name: 'High CPU Usage',
  description: 'Alert when CPU usage exceeds 80%',
  condition: 'cpu_usage > 80',
  threshold: 80,
  operator: '>',
  severity: 'high',
  metadata: { 
    team: 'infrastructure',
    escalation: 'pagerduty' 
  }
});

// Get alert by ID
const alert = monitoring.getAlert('alert-id');

// Get all alerts
const alerts = monitoring.getAllAlerts();

// Update alert
monitoring.updateAlert('alert-id', {
  threshold: 90,
  severity: 'critical'
});

// Toggle alert active state
monitoring.toggleAlert('alert-id');

// Delete alert
monitoring.deleteAlert('alert-id');
```

### Alert Instances

```typescript
// Get alert instances
const instances = monitoring.getAlertInstances('alert-id');

// Get active alert instances
const activeInstances = monitoring.getActiveAlertInstances();

// Resolve alert instance
monitoring.resolveAlertInstance('instance-id');
```

### Dashboard Management

```typescript
// Create a dashboard
const dashboard = monitoring.createDashboard({
  name: 'System Overview',
  description: 'Main system monitoring dashboard',
  widgets: [],
  layout: {
    columns: 4,
    rows: 3,
    cellSize: { width: 200, height: 150 }
  },
  isPublic: true,
  metadata: { 
    owner: 'team-infrastructure',
    category: 'system' 
  }
});

// Get dashboard by ID
const dashboard = monitoring.getDashboard('dashboard-id');

// Get all dashboards
const dashboards = monitoring.getAllDashboards();

// Update dashboard
monitoring.updateDashboard('dashboard-id', {
  name: 'Updated Dashboard',
  isPublic: false
});

// Delete dashboard
monitoring.deleteDashboard('dashboard-id');
```

### Widget Management

```typescript
// Add widget to dashboard
const widget = monitoring.addWidget('dashboard-id', {
  type: 'chart',
  title: 'CPU Usage Over Time',
  config: {
    metricName: 'cpu_usage',
    chartType: 'line',
    timeRange: '1h',
    aggregation: 'avg',
    filters: { host: 'server1' },
    refreshInterval: 5000
  },
  position: { x: 0, y: 0, width: 2, height: 1 },
  metadata: { 
    color: '#ff6b6b',
    showLegend: true 
  }
});

// Update widget
monitoring.updateWidget('dashboard-id', 'widget-id', {
  title: 'Updated CPU Usage',
  config: { chartType: 'bar' }
});

// Remove widget
monitoring.removeWidget('dashboard-id', 'widget-id');
```

### Data Aggregation

```typescript
// Aggregate metrics
const timeRange = {
  start: new Date(Date.now() - 3600000), // 1 hour ago
  end: new Date()
};

const sum = monitoring.aggregateMetrics('cpu_usage', timeRange, 'sum');
const avg = monitoring.aggregateMetrics('cpu_usage', timeRange, 'avg');
const min = monitoring.aggregateMetrics('cpu_usage', timeRange, 'min');
const max = monitoring.aggregateMetrics('cpu_usage', timeRange, 'max');
const count = monitoring.aggregateMetrics('cpu_usage', timeRange, 'count');
```

### Statistics and Analytics

```typescript
// Get monitoring statistics
const stats = monitoring.getStatistics();

console.log(`Total metrics: ${stats.totalMetrics}`);
console.log(`Total alerts: ${stats.totalAlerts}`);
console.log(`Active alerts: ${stats.activeAlerts}`);
console.log(`Total dashboards: ${stats.totalDashboards}`);
console.log(`Metrics per second: ${stats.metricsPerSecond}`);
console.log(`Average response time: ${stats.averageResponseTime}ms`);
console.log(`Uptime: ${stats.uptime}ms`);
```

### Configuration Management

```typescript
// Update configuration
monitoring.updateConfig({
  retentionPeriod: 14, // 14 days
  alertCheckInterval: 2000, // 2 seconds
  metricBufferSize: 500,
  maxAlerts: 500
});

// Get current configuration
const config = monitoring.getConfig();
console.log('Current config:', config);
```

### Data Cleanup

```typescript
// Cleanup old data
monitoring.cleanupOldData();
```

### Event Handling

```typescript
// Listen for events
monitoring.on('metricRecorded', (data) => {
  console.log('New metric recorded:', data.metric);
});

monitoring.on('alertCreated', (data) => {
  console.log('New alert created:', data.alert);
});

monitoring.on('alertTriggered', (data) => {
  console.log('Alert triggered:', data.alert.name);
  console.log('Metric value:', data.metric.value);
  console.log('Instance:', data.instance);
});

monitoring.on('dashboardCreated', (data) => {
  console.log('New dashboard created:', data.dashboard);
});

monitoring.on('widgetAdded', (data) => {
  console.log('Widget added to dashboard:', data.widget);
});

monitoring.on('alertInstanceResolved', (data) => {
  console.log('Alert instance resolved:', data.instance);
});
```

## Widget Types

### Chart Widget
```typescript
{
  type: 'chart',
  title: 'CPU Usage Over Time',
  config: {
    metricName: 'cpu_usage',
    chartType: 'line', // 'line' | 'bar' | 'pie' | 'area'
    timeRange: '1h',
    aggregation: 'avg',
    filters: { host: 'server1' },
    refreshInterval: 5000
  }
}
```

### Gauge Widget
```typescript
{
  type: 'gauge',
  title: 'Current CPU Usage',
  config: {
    metricName: 'cpu_usage',
    min: 0,
    max: 100,
    thresholds: [
      { value: 80, color: 'orange' },
      { value: 90, color: 'red' }
    ]
  }
}
```

### Table Widget
```typescript
{
  type: 'table',
  title: 'Server Status',
  config: {
    metricName: 'server_status',
    columns: ['host', 'status', 'uptime'],
    sortBy: 'uptime',
    sortOrder: 'desc'
  }
}
```

### Text Widget
```typescript
{
  type: 'text',
  title: 'System Status',
  config: {
    content: 'All systems operational',
    fontSize: '16px',
    color: '#28a745',
    backgroundColor: '#f8f9fa'
  }
}
```

### Metric Widget
```typescript
{
  type: 'metric',
  title: 'Current CPU Usage',
  config: {
    metricName: 'cpu_usage',
    format: 'percentage',
    precision: 1,
    trend: true
  }
}
```

## Alert Conditions

The system supports various alert conditions:

```typescript
// Greater than
{ condition: 'cpu_usage > 80', operator: '>', threshold: 80 }

// Less than
{ condition: 'memory_usage < 1024', operator: '<', threshold: 1024 }

// Greater than or equal
{ condition: 'disk_usage >= 90', operator: '>=', threshold: 90 }

// Less than or equal
{ condition: 'response_time <= 1000', operator: '<=', threshold: 1000 }

// Equal to
{ condition: 'status == 0', operator: '==', threshold: 0 }

// Not equal to
{ condition: 'status != 200', operator: '!=', threshold: 200 }
```

## Configuration Options

```typescript
interface MonitoringConfig {
  retentionPeriod: number;        // Data retention in days
  alertCheckInterval: number;     // Alert check interval in ms
  metricBufferSize: number;       // Max metrics per name in memory
  maxAlerts: number;             // Maximum number of alerts
  enableRealTime: boolean;       // Enable real-time monitoring
  enableHistoricalData: boolean; // Enable historical data storage
  enableAlerting: boolean;       // Enable alert checking
  enableDashboards: boolean;     // Enable dashboard functionality
}
```

## Performance Considerations

- Efficient metric storage with configurable buffer sizes
- Optimized alert checking with configurable intervals
- Memory-efficient data structures
- Automatic cleanup of old data
- Event-driven architecture for real-time updates

## Testing

The system includes comprehensive tests covering:

- Metric recording and retrieval
- Alert creation and management
- Dashboard and widget management
- Alert triggering and resolution
- Data aggregation and statistics
- Event handling
- Configuration management
- Data cleanup
- Integration workflows

Run tests with:

```bash
npm test systems/monitoring-system/monitoring.test.ts
```

## Event System

The monitoring system emits events for all major operations:

- `metricRecorded` - When a new metric is recorded
- `alertCreated` - When a new alert is created
- `alertUpdated` - When an alert is updated
- `alertDeleted` - When an alert is deleted
- `alertToggled` - When an alert is enabled/disabled
- `alertTriggered` - When an alert condition is met
- `alertInstanceResolved` - When an alert instance is resolved
- `dashboardCreated` - When a new dashboard is created
- `dashboardUpdated` - When a dashboard is updated
- `dashboardDeleted` - When a dashboard is deleted
- `widgetAdded` - When a widget is added to a dashboard
- `widgetUpdated` - When a widget is updated
- `widgetRemoved` - When a widget is removed
- `dataCleanupCompleted` - When data cleanup is completed
- `configUpdated` - When configuration is updated
- `destroyed` - When the monitoring system is destroyed

## Future Enhancements

- Advanced alert conditions with complex expressions
- Alert escalation and notification channels
- Custom widget types and plugins
- Data export and import functionality
- Advanced analytics and machine learning
- Integration with external monitoring systems
- Real-time collaboration on dashboards
- Advanced data visualization options
- Performance optimization and scaling
- Multi-tenant support
