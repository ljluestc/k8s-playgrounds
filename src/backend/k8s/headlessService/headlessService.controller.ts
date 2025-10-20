import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Query } from '@nestjs/common'
import { V1Service, V1StatefulSet } from '@kubernetes/client-node'
import {
  DiscoveredService,
  HeadlessServiceConfig,
  HeadlessServiceDNS,
  HeadlessServiceEndpoint,
  IptablesProxyConfig,
  ServiceDiscoveryConfig,
  StatefulSetHeadlessConfig,
} from '../model/HeadlessService'
import { HeadlessServiceService } from './headlessService.service'

@Controller('api/headless-services')
export class HeadlessServiceController {
  constructor(private readonly headlessServiceService: HeadlessServiceService) {}

  /**
   * Create a Headless Service
   *
   * POST /api/headless-services
   *
   * Creates a new Headless Service with ClusterIP set to "None".
   * This enables direct pod-to-pod communication without load balancing.
   */
  @Post()
  async createHeadlessService(@Body() config: HeadlessServiceConfig): Promise<{
    success: boolean
    service: V1Service
    message: string
  }> {
    try {
      // Validate configuration
      const validation = this.headlessServiceService.validateHeadlessServiceConfig(config)
      if (!validation.valid) {
        throw new HttpException(
          `Invalid configuration: ${validation.errors.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        )
      }

      const service = await this.headlessServiceService.createHeadlessService(config)

      return {
        success: true,
        service,
        message: `Headless Service '${config.name}' created successfully`,
      }
    }
    catch (error) {
      throw new HttpException(
        `Failed to create Headless Service: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Get Headless Service by name
   *
   * GET /api/headless-services/:name
   */
  @Get(':name')
  async getHeadlessService(
    @Param('name') name: string,
    @Query('namespace') namespace: string = 'default',
  ): Promise<{
    success: boolean
    service: V1Service | null
    message: string
  }> {
    try {
      const service = await this.headlessServiceService.getHeadlessService(name, namespace)

      return {
        success: true,
        service,
        message: service ? `Headless Service '${name}' found` : `Headless Service '${name}' not found`,
      }
    }
    catch (error) {
      throw new HttpException(
        `Failed to get Headless Service: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * List all Headless Services
   *
   * GET /api/headless-services
   */
  @Get()
  async listHeadlessServices(
    @Query('namespace') namespace: string = 'default',
  ): Promise<{
    success: boolean
    services: V1Service[]
    count: number
    message: string
  }> {
    try {
      const services = await this.headlessServiceService.listHeadlessServices(namespace)

      return {
        success: true,
        services,
        count: services.length,
        message: `Found ${services.length} Headless Services`,
      }
    }
    catch (error) {
      throw new HttpException(
        `Failed to list Headless Services: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Delete Headless Service
   *
   * DELETE /api/headless-services/:name
   */
  @Delete(':name')
  async deleteHeadlessService(
    @Param('name') name: string,
    @Query('namespace') namespace: string = 'default',
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      await this.headlessServiceService.deleteHeadlessService(name, namespace)

      return {
        success: true,
        message: `Headless Service '${name}' deleted successfully`,
      }
    }
    catch (error) {
      throw new HttpException(
        `Failed to delete Headless Service: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Get DNS resolution information
   *
   * GET /api/headless-services/:name/dns
   */
  @Get(':name/dns')
  async getHeadlessServiceDNS(
    @Param('name') name: string,
    @Query('namespace') namespace: string = 'default',
  ): Promise<{
    success: boolean
    dns: HeadlessServiceDNS
    message: string
  }> {
    try {
      const dns = await this.headlessServiceService.getHeadlessServiceDNS(name, namespace)

      return {
        success: true,
        dns,
        message: `DNS information for Headless Service '${name}' retrieved`,
      }
    }
    catch (error) {
      throw new HttpException(
        `Failed to get DNS information: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Get endpoints for Headless Service
   *
   * GET /api/headless-services/:name/endpoints
   */
  @Get(':name/endpoints')
  async getHeadlessServiceEndpoints(
    @Param('name') name: string,
    @Query('namespace') namespace: string = 'default',
  ): Promise<{
    success: boolean
    endpoints: HeadlessServiceEndpoint[]
    count: number
    message: string
  }> {
    try {
      const endpoints = await this.headlessServiceService.getHeadlessServiceEndpoints(name, namespace)

      return {
        success: true,
        endpoints,
        count: endpoints.length,
        message: `Found ${endpoints.length} endpoints for Headless Service '${name}'`,
      }
    }
    catch (error) {
      throw new HttpException(
        `Failed to get endpoints: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Test DNS resolution
   *
   * GET /api/headless-services/:name/test-dns
   */
  @Get(':name/test-dns')
  async testDNSResolution(
    @Param('name') name: string,
    @Query('namespace') namespace: string = 'default',
  ): Promise<{
    success: boolean
    dnsTest: {
      serviceDNS: string
      resolvedIPs: string[]
      individualPodDNS: Array<{ podName: string; dnsName: string; resolvedIP: string }>
    }
    message: string
  }> {
    try {
      const dnsTest = await this.headlessServiceService.testDNSResolution(name, namespace)

      return {
        success: true,
        dnsTest,
        message: `DNS resolution test completed for Headless Service '${name}'`,
      }
    }
    catch (error) {
      throw new HttpException(
        `Failed to test DNS resolution: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Create StatefulSet with Headless Service
   *
   * POST /api/headless-services/statefulset
   */
  @Post('statefulset')
  async createStatefulSetWithHeadlessService(@Body() config: StatefulSetHeadlessConfig): Promise<{
    success: boolean
    statefulSet: V1StatefulSet
    message: string
  }> {
    try {
      const statefulSet = await this.headlessServiceService.createStatefulSetWithHeadlessService(config)

      return {
        success: true,
        statefulSet,
        message: `StatefulSet '${config.serviceName}' created with Headless Service`,
      }
    }
    catch (error) {
      throw new HttpException(
        `Failed to create StatefulSet: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Configure iptables proxy mode
   *
   * POST /api/headless-services/:name/iptables
   */
  @Post(':name/iptables')
  async configureIptablesProxy(
    @Param('name') name: string,
    @Body() config: Omit<IptablesProxyConfig, 'serviceName'>,
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const iptablesConfig: IptablesProxyConfig = {
        ...config,
        serviceName: name,
      }

      await this.headlessServiceService.configureIptablesProxy(iptablesConfig)

      return {
        success: true,
        message: `iptables proxy configured for Headless Service '${name}'`,
      }
    }
    catch (error) {
      throw new HttpException(
        `Failed to configure iptables proxy: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Discover service endpoints
   *
   * POST /api/headless-services/:name/discover
   */
  @Post(':name/discover')
  async discoverService(
    @Param('name') name: string,
    @Body() config: ServiceDiscoveryConfig,
    @Query('namespace') namespace: string = 'default',
  ): Promise<{
    success: boolean
    discovery: DiscoveredService
    message: string
  }> {
    try {
      const discovery = await this.headlessServiceService.discoverService(name, namespace, config)

      return {
        success: true,
        discovery,
        message: `Service discovery completed for '${name}' using ${config.discoveryType} method`,
      }
    }
    catch (error) {
      throw new HttpException(
        `Failed to discover service: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Get Headless Service statistics
   *
   * GET /api/headless-services/:name/stats
   */
  @Get(':name/stats')
  async getHeadlessServiceStats(
    @Param('name') name: string,
    @Query('namespace') namespace: string = 'default',
  ): Promise<{
    success: boolean
    stats: {
      serviceName: string
      namespace: string
      endpointCount: number
      totalConnections: number
      averageResponseTime: number
      lastUpdated: Date
    }
    message: string
  }> {
    try {
      const stats = await this.headlessServiceService.getHeadlessServiceStats(name, namespace)

      return {
        success: true,
        stats,
        message: `Statistics retrieved for Headless Service '${name}'`,
      }
    }
    catch (error) {
      throw new HttpException(
        `Failed to get statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Validate Headless Service configuration
   *
   * POST /api/headless-services/validate
   */
  @Post('validate')
  async validateHeadlessServiceConfig(@Body() config: HeadlessServiceConfig): Promise<{
    success: boolean
    valid: boolean
    errors: string[]
    message: string
  }> {
    try {
      const validation = this.headlessServiceService.validateHeadlessServiceConfig(config)

      return {
        success: true,
        valid: validation.valid,
        errors: validation.errors,
        message: validation.valid
          ? 'Configuration is valid'
          : `Configuration has ${validation.errors.length} errors`,
      }
    }
    catch (error) {
      throw new HttpException(
        `Failed to validate configuration: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}
