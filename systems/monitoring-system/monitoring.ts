import { EventEmitter } from 'node:events'

export interface Metric {
  id: string
  name: string
  value: number
  timestamp: Date
  tags: Record<string, string>
  metadata?: Record<string, any>
}

export interface Alert {
  id: string
  name: string
  description: string
  condition: string
  threshold: number
  operator: '>' | '<' | '>=' | '<=' | '==' | '!='
  severity: 'low' | 'medium' | 'high' | 'critical'
  isActive: boolean
  createdAt: Date
  lastTriggered?: Date
  metadata?: Record<string, any>
}

export interface AlertInstance {
  id: string
  alertId: string
  triggeredAt: Date
  resolvedAt?: Date
  severity: string
  message: string
  value: number
  threshold: number
  isResolved: boolean
  metadata?: Record<string, any>
}

export interface Dashboard {
  id: string
  name: string
  description: string
  widgets: Widget[]
  layout: DashboardLayout
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, any>
}

export interface Widget {
  id: string
  type: 'chart' | 'gauge' | 'table' | 'text' | 'metric'
  title: string
  config: WidgetConfig
  position: { x: number; y: number; width: number; height: number }
  metadata?: Record<string, any>
}

export interface WidgetConfig {
  metricName?: string
  chartType?: 'line' | 'bar' | 'pie' | 'area'
  timeRange?: string
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count'
  filters?: Record<string, string>
  refreshInterval?: number
  [key: string]: any
}

export interface DashboardLayout {
  columns: number
  rows: number
  cellSize: { width: number; height: number }
}

export interface MonitoringConfig {
  retentionPeriod: number // days
  alertCheckInterval: number // milliseconds
  metricBufferSize: number
  maxAlerts: number
  enableRealTime: boolean
  enableHistoricalData: boolean
  enableAlerting: boolean
  enableDashboards: boolean
}

export interface MonitoringStats {
  totalMetrics: number
  totalAlerts: number
  activeAlerts: number
  totalDashboards: number
  metricsPerSecond: number
  averageResponseTime: number
  uptime: number
  lastUpdate: Date
}

export class MonitoringSystem extends EventEmitter {
  private metrics: Map<string, Metric[]> = new Map()
  private alerts: Map<string, Alert> = new Map()
  private alertInstances: Map<string, AlertInstance> = new Map()
  private dashboards: Map<string, Dashboard> = new Map()
  private alertCheckInterval?: NodeJS.Timeout
  private config: MonitoringConfig
  private startTime: Date

  constructor(config: Partial<MonitoringConfig> = {}) {
    super()

    this.config = {
      retentionPeriod: 30, // 30 days
      alertCheckInterval: 5000, // 5 seconds
      metricBufferSize: 1000,
      maxAlerts: 1000,
      enableRealTime: true,
      enableHistoricalData: true,
      enableAlerting: true,
      enableDashboards: true,
      ...config,
    }

    this.startTime = new Date()
    this.startAlertChecking()
    this.initializeDefaultData()
  }

  // Metric Management
  public recordMetric(metric: Omit<Metric, 'timestamp'>): Metric {
    const fullMetric: Metric = {
      ...metric,
      timestamp: new Date(),
    }

    if (!this.metrics.has(metric.name))
      this.metrics.set(metric.name, [])

    const metricList = this.metrics.get(metric.name)!
    metricList.push(fullMetric)

    // Maintain buffer size
    if (metricList.length > this.config.metricBufferSize)
      metricList.shift()

    this.emit('metricRecorded', { metric: fullMetric })
    return fullMetric
  }

  public getMetrics(metricName: string, timeRange?: { start: Date; end: Date }): Metric[] {
    const metricList = this.metrics.get(metricName) || []

    if (!timeRange)
      return [...metricList]

    return metricList.filter(metric =>
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end,
    )
  }

  public getLatestMetric(metricName: string): Metric | undefined {
    const metricList = this.metrics.get(metricName) || []
    return metricList[metricList.length - 1]
  }

  public getMetricNames(): string[] {
    return Array.from(this.metrics.keys())
  }

  public deleteMetric(metricName: string): boolean {
    return this.metrics.delete(metricName)
  }

  // Alert Management
  public createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'isActive' | 'lastTriggered'>): Alert {
    const fullAlert: Alert = {
      ...alert,
      id: this.generateId(),
      createdAt: new Date(),
      isActive: true,
      lastTriggered: undefined,
    }

    if (this.alerts.size >= this.config.maxAlerts)
      throw new Error('Maximum number of alerts reached')

    this.alerts.set(fullAlert.id, fullAlert)
    this.emit('alertCreated', { alert: fullAlert })
    return fullAlert
  }

  public getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId)
  }

  public getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values())
  }

  public updateAlert(alertId: string, updates: Partial<Alert>): Alert | null {
    const alert = this.alerts.get(alertId)
    if (!alert)
      return null

    const updatedAlert = { ...alert, ...updates }
    this.alerts.set(alertId, updatedAlert)
    this.emit('alertUpdated', { alert: updatedAlert })
    return updatedAlert
  }

  public deleteAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert)
      return false

    this.alerts.delete(alertId)
    this.emit('alertDeleted', { alertId, alert })
    return true
  }

  public toggleAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert)
      return false

    alert.isActive = !alert.isActive
    this.alerts.set(alertId, alert)
    this.emit('alertToggled', { alertId, isActive: alert.isActive })
    return true
  }

  // Alert Instance Management
  public getAlertInstances(alertId?: string): AlertInstance[] {
    const instances = Array.from(this.alertInstances.values())

    if (alertId)
      return instances.filter(instance => instance.alertId === alertId)

    return instances
  }

  public getActiveAlertInstances(): AlertInstance[] {
    return Array.from(this.alertInstances.values()).filter(instance => !instance.isResolved)
  }

  public resolveAlertInstance(instanceId: string): boolean {
    const instance = this.alertInstances.get(instanceId)
    if (!instance || instance.isResolved)
      return false

    instance.isResolved = true
    instance.resolvedAt = new Date()
    this.alertInstances.set(instanceId, instance)
    this.emit('alertInstanceResolved', { instance })
    return true
  }

  // Dashboard Management
  public createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Dashboard {
    const fullDashboard: Dashboard = {
      ...dashboard,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.dashboards.set(fullDashboard.id, fullDashboard)
    this.emit('dashboardCreated', { dashboard: fullDashboard })
    return fullDashboard
  }

  public getDashboard(dashboardId: string): Dashboard | undefined {
    return this.dashboards.get(dashboardId)
  }

  public getAllDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values())
  }

  public updateDashboard(dashboardId: string, updates: Partial<Dashboard>): Dashboard | null {
    const dashboard = this.dashboards.get(dashboardId)
    if (!dashboard)
      return null

    const updatedDashboard = {
      ...dashboard,
      ...updates,
      updatedAt: new Date(),
    }
    this.dashboards.set(dashboardId, updatedDashboard)
    this.emit('dashboardUpdated', { dashboard: updatedDashboard })
    return updatedDashboard
  }

  public deleteDashboard(dashboardId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId)
    if (!dashboard)
      return false

    this.dashboards.delete(dashboardId)
    this.emit('dashboardDeleted', { dashboardId, dashboard })
    return true
  }

  // Widget Management
  public addWidget(dashboardId: string, widget: Omit<Widget, 'id'>): Widget | null {
    const dashboard = this.dashboards.get(dashboardId)
    if (!dashboard)
      return null

    const fullWidget: Widget = {
      ...widget,
      id: this.generateId(),
    }

    dashboard.widgets.push(fullWidget)
    this.dashboards.set(dashboardId, dashboard)
    this.emit('widgetAdded', { dashboardId, widget: fullWidget })
    return fullWidget
  }

  public updateWidget(dashboardId: string, widgetId: string, updates: Partial<Widget>): Widget | null {
    const dashboard = this.dashboards.get(dashboardId)
    if (!dashboard)
      return null

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId)
    if (widgetIndex === -1)
      return null

    const updatedWidget = { ...dashboard.widgets[widgetIndex], ...updates }
    dashboard.widgets[widgetIndex] = updatedWidget
    this.dashboards.set(dashboardId, dashboard)
    this.emit('widgetUpdated', { dashboardId, widgetId, widget: updatedWidget })
    return updatedWidget
  }

  public removeWidget(dashboardId: string, widgetId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId)
    if (!dashboard)
      return false

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId)
    if (widgetIndex === -1)
      return false

    const widget = dashboard.widgets[widgetIndex]
    dashboard.widgets.splice(widgetIndex, 1)
    this.dashboards.set(dashboardId, dashboard)
    this.emit('widgetRemoved', { dashboardId, widgetId, widget })
    return true
  }

  // Alert Checking
  private startAlertChecking(): void {
    if (!this.config.enableAlerting)
      return

    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts()
    }, this.config.alertCheckInterval)
  }

  private checkAlerts(): void {
    const activeAlerts = Array.from(this.alerts.values()).filter(alert => alert.isActive)

    for (const alert of activeAlerts)
      this.checkAlert(alert)
  }

  private checkAlert(alert: Alert): void {
    try {
      const metricName = this.extractMetricName(alert.condition)
      const latestMetric = this.getLatestMetric(metricName)

      if (!latestMetric)
        return

      const shouldTrigger = this.evaluateCondition(latestMetric.value, alert.operator, alert.threshold)

      if (shouldTrigger)
        this.triggerAlert(alert, latestMetric)
    }
    catch (error) {
      this.emit('alertCheckError', { alertId: alert.id, error: (error as Error).message })
    }
  }

  private extractMetricName(condition: string): string {
    // Extract metric name from condition like "cpu_usage > 80"
    const match = condition.match(/(\w+)/)
    return match ? match[1] : condition
  }

  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold
      case '<': return value < threshold
      case '>=': return value >= threshold
      case '<=': return value <= threshold
      case '==': return value === threshold
      case '!=': return value !== threshold
      default: return false
    }
  }

  private triggerAlert(alert: Alert, metric: Metric): void {
    const instanceId = this.generateId()
    const instance: AlertInstance = {
      id: instanceId,
      alertId: alert.id,
      triggeredAt: new Date(),
      severity: alert.severity,
      message: `${alert.name}: ${metric.value} ${alert.operator} ${alert.threshold}`,
      value: metric.value,
      threshold: alert.threshold,
      isResolved: false,
      metadata: {
        metricName: metric.name,
        metricTags: metric.tags,
        alertCondition: alert.condition,
      },
    }

    this.alertInstances.set(instanceId, instance)
    alert.lastTriggered = new Date()
    this.alerts.set(alert.id, alert)

    this.emit('alertTriggered', { alert, instance, metric })
  }

  // Statistics and Analytics
  public getStatistics(): MonitoringStats {
    const totalMetrics = Array.from(this.metrics.values()).reduce((sum, metrics) => sum + metrics.length, 0)
    const totalAlerts = this.alerts.size
    const activeAlerts = Array.from(this.alerts.values()).filter(alert => alert.isActive).length
    const totalDashboards = this.dashboards.size

    const now = new Date()
    const uptime = now.getTime() - this.startTime.getTime()

    return {
      totalMetrics,
      totalAlerts,
      activeAlerts,
      totalDashboards,
      metricsPerSecond: this.calculateMetricsPerSecond(),
      averageResponseTime: this.calculateAverageResponseTime(),
      uptime,
      lastUpdate: now,
    }
  }

  private calculateMetricsPerSecond(): number {
    const now = new Date()
    const oneSecondAgo = new Date(now.getTime() - 1000)

    let count = 0
    for (const metrics of this.metrics.values())
      count += metrics.filter(m => m.timestamp >= oneSecondAgo).length

    return count
  }

  private calculateAverageResponseTime(): number {
    const responseTimeMetrics = this.getMetrics('response_time')
    if (responseTimeMetrics.length === 0)
      return 0

    const sum = responseTimeMetrics.reduce((acc, metric) => acc + metric.value, 0)
    return sum / responseTimeMetrics.length
  }

  // Data Aggregation
  public aggregateMetrics(metricName: string, timeRange: { start: Date; end: Date }, aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count'): number {
    const metrics = this.getMetrics(metricName, timeRange)

    if (metrics.length === 0)
      return 0

    switch (aggregation) {
      case 'sum':
        return metrics.reduce((sum, metric) => sum + metric.value, 0)
      case 'avg':
        return metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length
      case 'min':
        return Math.min(...metrics.map(m => m.value))
      case 'max':
        return Math.max(...metrics.map(m => m.value))
      case 'count':
        return metrics.length
      default:
        return 0
    }
  }

  // Configuration Management
  public updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Restart alert checking if interval changed
    if (newConfig.alertCheckInterval) {
      if (this.alertCheckInterval)
        clearInterval(this.alertCheckInterval)

      this.startAlertChecking()
    }

    this.emit('configUpdated', { config: this.config })
  }

  public getConfig(): MonitoringConfig {
    return { ...this.config }
  }

  // Data Cleanup
  public cleanupOldData(): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionPeriod)

    for (const [metricName, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(metric => metric.timestamp >= cutoffDate)
      this.metrics.set(metricName, filteredMetrics)
    }

    this.emit('dataCleanupCompleted', { cutoffDate })
  }

  // Utility Methods
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private initializeDefaultData(): void {
    // Create some default alerts
    this.createAlert({
      name: 'High CPU Usage',
      description: 'Alert when CPU usage exceeds 80%',
      condition: 'cpu_usage',
      threshold: 80,
      operator: '>',
      severity: 'high',
    })

    this.createAlert({
      name: 'Low Memory',
      description: 'Alert when available memory is below 1GB',
      condition: 'available_memory',
      threshold: 1024,
      operator: '<',
      severity: 'medium',
    })

    // Create a default dashboard
    this.createDashboard({
      name: 'System Overview',
      description: 'Default system monitoring dashboard',
      widgets: [],
      layout: {
        columns: 4,
        rows: 3,
        cellSize: { width: 200, height: 150 },
      },
      isPublic: true,
    })
  }

  // Cleanup
  public destroy(): void {
    if (this.alertCheckInterval)
      clearInterval(this.alertCheckInterval)

    this.metrics.clear()
    this.alerts.clear()
    this.alertInstances.clear()
    this.dashboards.clear()

    this.emit('destroyed')
  }
}
