#!/usr/bin/env ts-node

/**
 * Automated Test Generator
 *
 * Generates comprehensive unit tests for:
 * - Backend controllers (K8s resources)
 * - Backend services (K8s resources)
 * - Backend utilities
 * - Frontend Vue components
 *
 * Uses templates based on existing Pod and Deployment tests
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

interface ResourceConfig {
  name: string
  className: string
  varName: string
  hasNamespace: boolean
  apiGroup: string
  apiVersion: string
  kind: string
}

class TestGenerator {
  private projectRoot: string
  private templatesGenerated: number = 0

  constructor() {
    this.projectRoot = path.resolve(__dirname, '..')
  }

  /**
   * Main generation method
   */
  async generate() {
    console.log('🔧 Automated Test Generator\n')
    console.log('='.repeat(80))

    try {
      await this.generateBackendControllerTests()
      await this.generateBackendServiceTests()
      await this.generateBackendUtilityTests()
      await this.generateFrontendComponentTests()

      console.log(`\n${'='.repeat(80)}`)
      console.log(`✅ Generated ${this.templatesGenerated} test files`)
    }
    catch (error) {
      console.error('\n❌ Test generation failed:', error)
      process.exit(1)
    }
  }

  /**
   * Generate backend controller tests
   */
  private async generateBackendControllerTests() {
    console.log('\n📝 Generating Backend Controller Tests...\n')

    const resources = this.getK8sResources()

    for (const resource of resources) {
      const controllerPath = this.findControllerFile(resource)

      if (!controllerPath) {
        console.log(`  ⚠️  Controller not found for ${resource.name}`)
        continue
      }

      const testPath = controllerPath.replace(/\.ts$/, '.spec.ts')

      if (fs.existsSync(testPath)) {
        console.log(`  ⏭️  ${resource.name} controller test already exists`)
        continue
      }

      const testContent = this.generateControllerTestContent(resource)
      fs.writeFileSync(testPath, testContent)

      console.log(`  ✅ Generated ${path.relative(this.projectRoot, testPath)}`)
      this.templatesGenerated++
    }
  }

  /**
   * Generate backend service tests
   */
  private async generateBackendServiceTests() {
    console.log('\n📝 Generating Backend Service Tests...\n')

    const resources = this.getK8sResources()

    for (const resource of resources) {
      const servicePath = this.findServiceFile(resource)

      if (!servicePath) {
        console.log(`  ⚠️  Service not found for ${resource.name}`)
        continue
      }

      const testPath = servicePath.replace(/\.ts$/, '.spec.ts')

      if (fs.existsSync(testPath)) {
        console.log(`  ⏭️  ${resource.name} service test already exists`)
        continue
      }

      const testContent = this.generateServiceTestContent(resource)
      fs.writeFileSync(testPath, testContent)

      console.log(`  ✅ Generated ${path.relative(this.projectRoot, testPath)}`)
      this.templatesGenerated++
    }
  }

  /**
   * Generate backend utility tests
   */
  private async generateBackendUtilityTests() {
    console.log('\n📝 Generating Backend Utility Tests...\n')

    const utilities = [
      'yamlUtils',
      'TimerUtils',
      'timeAge',
      'WorkloadArray',
      'SelectorUtils',
      'base64Util',
    ]

    for (const util of utilities) {
      const utilPath = path.join(this.projectRoot, 'src/backend/utils', `${util}.ts`)

      if (!fs.existsSync(utilPath)) {
        console.log(`  ⚠️  Utility not found: ${util}`)
        continue
      }

      const testPath = utilPath.replace(/\.ts$/, '.spec.ts')

      if (fs.existsSync(testPath)) {
        console.log(`  ⏭️  ${util} test already exists`)
        continue
      }

      const testContent = this.generateUtilityTestContent(util)
      fs.writeFileSync(testPath, testContent)

      console.log(`  ✅ Generated ${path.relative(this.projectRoot, testPath)}`)
      this.templatesGenerated++
    }
  }

  /**
   * Generate frontend component tests
   */
  private async generateFrontendComponentTests() {
    console.log('\n📝 Generating Frontend Component Tests...\n')

    const componentsDir = path.join(this.projectRoot, 'src/frontend/components')
    const vueFiles = this.findVueFiles(componentsDir)

    let generated = 0
    let skipped = 0

    for (const vueFile of vueFiles) {
      const testPath = vueFile.replace(/\.vue$/, '.spec.ts')

      if (fs.existsSync(testPath)) {
        skipped++
        continue
      }

      const componentName = path.basename(vueFile, '.vue')
      const testContent = this.generateVueComponentTestContent(componentName)
      fs.writeFileSync(testPath, testContent)

      generated++
      this.templatesGenerated++

      // Only log first 10 to avoid spam
      if (generated <= 10)
        console.log(`  ✅ Generated ${path.relative(this.projectRoot, testPath)}`)
    }

    console.log(`  ✅ Generated ${generated} component tests (${skipped} already exist)`)
  }

  /**
   * Find Vue files recursively
   */
  private findVueFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir)

    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)

      if (stat.isDirectory())
        this.findVueFiles(filePath, fileList)
      else if (file.endsWith('.vue'))
        fileList.push(filePath)
    }

    return fileList
  }

  /**
   * Get list of K8s resources to generate tests for
   */
  private getK8sResources(): ResourceConfig[] {
    return [
      {
        name: 'Service',
        className: 'NetworkSvcService',
        varName: 'networkSvc',
        hasNamespace: true,
        apiGroup: 'core',
        apiVersion: 'v1',
        kind: 'Service',
      },
      {
        name: 'StatefulSet',
        className: 'StatefulSetService',
        varName: 'statefulSet',
        hasNamespace: true,
        apiGroup: 'apps',
        apiVersion: 'v1',
        kind: 'StatefulSet',
      },
      {
        name: 'DaemonSet',
        className: 'DaemonSetService',
        varName: 'daemonSet',
        hasNamespace: true,
        apiGroup: 'apps',
        apiVersion: 'v1',
        kind: 'DaemonSet',
      },
      {
        name: 'Job',
        className: 'JobService',
        varName: 'job',
        hasNamespace: true,
        apiGroup: 'batch',
        apiVersion: 'v1',
        kind: 'Job',
      },
      {
        name: 'CronJob',
        className: 'CronJobService',
        varName: 'cronJob',
        hasNamespace: true,
        apiGroup: 'batch',
        apiVersion: 'v1',
        kind: 'CronJob',
      },
      {
        name: 'ReplicaSet',
        className: 'ReplicaSetService',
        varName: 'replicaSet',
        hasNamespace: true,
        apiGroup: 'apps',
        apiVersion: 'v1',
        kind: 'ReplicaSet',
      },
      {
        name: 'ReplicationController',
        className: 'ReplicationControllerService',
        varName: 'replicationController',
        hasNamespace: true,
        apiGroup: 'core',
        apiVersion: 'v1',
        kind: 'ReplicationController',
      },
      {
        name: 'Ingress',
        className: 'IngressService',
        varName: 'ingress',
        hasNamespace: true,
        apiGroup: 'networking.k8s.io',
        apiVersion: 'v1',
        kind: 'Ingress',
      },
      {
        name: 'ConfigMap',
        className: 'ConfigMapService',
        varName: 'configMap',
        hasNamespace: true,
        apiGroup: 'core',
        apiVersion: 'v1',
        kind: 'ConfigMap',
      },
      {
        name: 'Secret',
        className: 'SecretService',
        varName: 'secret',
        hasNamespace: true,
        apiGroup: 'core',
        apiVersion: 'v1',
        kind: 'Secret',
      },
      {
        name: 'Namespace',
        className: 'NsService',
        varName: 'namespace',
        hasNamespace: false,
        apiGroup: 'core',
        apiVersion: 'v1',
        kind: 'Namespace',
      },
      {
        name: 'Node',
        className: 'NodeService',
        varName: 'node',
        hasNamespace: false,
        apiGroup: 'core',
        apiVersion: 'v1',
        kind: 'Node',
      },
      // Add more resources as needed
    ]
  }

  /**
   * Find controller file for a resource
   */
  private findControllerFile(resource: ResourceConfig): string | null {
    const k8sDir = path.join(this.projectRoot, 'src/backend/k8s')
    const possiblePaths = [
      path.join(k8sDir, resource.name.toLowerCase(), `${resource.name.toLowerCase()}.controller.ts`),
      path.join(k8sDir, resource.varName, `${resource.varName}.controller.ts`),
      path.join(k8sDir, resource.name, `${resource.name}.controller.ts`),
    ]

    for (const p of possiblePaths) {
      if (fs.existsSync(p))
        return p
    }

    return null
  }

  /**
   * Find service file for a resource
   */
  private findServiceFile(resource: ResourceConfig): string | null {
    const k8sDir = path.join(this.projectRoot, 'src/backend/k8s')
    const possiblePaths = [
      path.join(k8sDir, resource.name.toLowerCase(), `${resource.name.toLowerCase()}.service.ts`),
      path.join(k8sDir, resource.varName, `${resource.varName}.service.ts`),
      path.join(k8sDir, resource.name, `${resource.name}.service.ts`),
    ]

    for (const p of possiblePaths) {
      if (fs.existsSync(p))
        return p
    }

    return null
  }

  /**
   * Generate controller test content
   */
  private generateControllerTestContent(resource: ResourceConfig): string {
    return `import { Test, TestingModule } from '@nestjs/testing';
import { ${resource.className.replace('Service', 'Controller')} } from './${resource.varName}.controller';
import { K8sService } from '../k8s.service';

describe('${resource.className.replace('Service', 'Controller')}', () => {
  let controller: ${resource.className.replace('Service', 'Controller')};
  let k8sService: K8sService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [${resource.className.replace('Service', 'Controller')}],
      providers: [
        {
          provide: K8sService,
          useValue: {
            ${resource.varName}: {
              List: jest.fn(),
              GetOneByNsName: jest.fn(),
              Delete: jest.fn(),
              Update: jest.fn(),
              Create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<${resource.className.replace('Service', 'Controller')}>(${resource.className.replace('Service', 'Controller')});
    k8sService = module.get<K8sService>(K8sService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should return all ${resource.name.toLowerCase()}s', async () => {
      const mockList = { items: [] };
      jest.spyOn(k8sService.${resource.varName}, 'List').mockResolvedValue(mockList as any);

      const result = await controller.list();

      expect(result).toEqual(mockList);
      expect(k8sService.${resource.varName}.List).toHaveBeenCalled();
    });

    ${resource.hasNamespace
? `it('should return ${resource.name.toLowerCase()}s for a specific namespace', async () => {
      const mockList = { items: [] };
      const namespace = 'default';
      jest.spyOn(k8sService.${resource.varName}, 'List').mockResolvedValue(mockList as any);

      const result = await controller.listByNs(namespace);

      expect(result).toEqual(mockList);
      expect(k8sService.${resource.varName}.List).toHaveBeenCalledWith(namespace);
    });`
: ''}

    it('should handle errors when listing ${resource.name.toLowerCase()}s', async () => {
      const error = new Error('API error');
      jest.spyOn(k8sService.${resource.varName}, 'List').mockRejectedValue(error);

      await expect(controller.list()).rejects.toThrow('API error');
    });
  });

  ${resource.hasNamespace
? `describe('getOne', () => {
    it('should return a single ${resource.name.toLowerCase()}', async () => {
      const mock${resource.name} = { metadata: { name: 'test-${resource.varName}', namespace: 'default' } };
      jest.spyOn(k8sService.${resource.varName}, 'GetOneByNsName').mockResolvedValue(mock${resource.name} as any);

      const result = await controller.getOne('default', 'test-${resource.varName}');

      expect(result).toEqual(mock${resource.name});
      expect(k8sService.${resource.varName}.GetOneByNsName).toHaveBeenCalledWith('default', 'test-${resource.varName}');
    });

    it('should handle not found errors', async () => {
      jest.spyOn(k8sService.${resource.varName}, 'GetOneByNsName').mockRejectedValue(new Error('Not found'));

      await expect(controller.getOne('default', 'nonexistent')).rejects.toThrow('Not found');
    });
  });`
: ''}

  ${resource.hasNamespace
? `describe('delete', () => {
    it('should delete a ${resource.name.toLowerCase()}', async () => {
      jest.spyOn(k8sService.${resource.varName}, 'Delete').mockResolvedValue(undefined);

      await controller.delete({ ns: 'default', name: 'test-${resource.varName}' });

      expect(k8sService.${resource.varName}.Delete).toHaveBeenCalledWith('default', 'test-${resource.varName}');
    });

    it('should handle deletion errors', async () => {
      jest.spyOn(k8sService.${resource.varName}, 'Delete').mockRejectedValue(new Error('Delete failed'));

      await expect(controller.delete({ ns: 'default', name: 'test-${resource.varName}' })).rejects.toThrow('Delete failed');
    });
  });`
: ''}

  // Add more test cases as needed for specific controller methods
});
`
  }

  /**
   * Generate service test content
   */
  private generateServiceTestContent(resource: ResourceConfig): string {
    return `import { Test, TestingModule } from '@nestjs/testing';
import { ${resource.className} } from './${resource.varName}.service';
import { ClientService } from '../client/client.service';
import { create${resource.name} } from '../../../../test/utils/k8s-mocks';

describe('${resource.className}', () => {
  let service: ${resource.className};
  let clientService: any;
  let mockK8sApi: any;

  beforeEach(async () => {
    mockK8sApi = {
      list${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}: jest.fn(),
      read${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}: jest.fn(),
      delete${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}: jest.fn(),
      patch${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}: jest.fn(),
      create${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}: jest.fn(),
      replace${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}: jest.fn(),
    };

    clientService = {
      getClient: jest.fn().mockReturnValue({
        ${resource.apiGroup === 'core'
? 'coreV1Api'
          : resource.apiGroup === 'apps'
? 'appsV1Api'
          : resource.apiGroup === 'batch'
? 'batchV1Api'
          : resource.apiGroup === 'networking.k8s.io'
? 'networkingV1Api'
          : 'customObjectsApi'}: mockK8sApi,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ${resource.className},
        {
          provide: ClientService,
          useValue: clientService,
        },
      ],
    }).compile();

    service = module.get<${resource.className}>(${resource.className});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('List', () => {
    it('should list all ${resource.name.toLowerCase()}s', async () => {
      const mock${resource.name}s = [create${resource.name}('${resource.varName}-1')${resource.hasNamespace ? ', \'default\'' : ''}];
      mockK8sApi.list${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}.mockResolvedValue({
        body: { items: mock${resource.name}s },
      });

      const result = await service.List();

      expect(result.items).toEqual(mock${resource.name}s);
      expect(mockK8sApi.list${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}).toHaveBeenCalled();
    });

    ${resource.hasNamespace
? `it('should list ${resource.name.toLowerCase()}s in a specific namespace', async () => {
      const mock${resource.name}s = [create${resource.name}('${resource.varName}-1', 'test-ns')];
      mockK8sApi.list${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}.mockResolvedValue({
        body: { items: mock${resource.name}s },
      });

      const result = await service.List('test-ns');

      expect(result.items).toEqual(mock${resource.name}s);
      expect(mockK8sApi.list${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}).toHaveBeenCalledWith('test-ns');
    });`
: ''}

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockK8sApi.list${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}.mockRejectedValue(error);

      await expect(service.List()).rejects.toThrow('API Error');
    });

    it('should return empty list when no ${resource.name.toLowerCase()}s exist', async () => {
      mockK8sApi.list${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}.mockResolvedValue({
        body: { items: [] },
      });

      const result = await service.List();

      expect(result.items).toEqual([]);
    });
  });

  ${resource.hasNamespace
? `describe('GetOneByNsName', () => {
    it('should get a single ${resource.name.toLowerCase()}', async () => {
      const mock${resource.name} = create${resource.name}('${resource.varName}-1', 'default');
      mockK8sApi.read${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}.mockResolvedValue({
        body: mock${resource.name},
      });

      const result = await service.GetOneByNsName('default', '${resource.varName}-1');

      expect(result).toEqual(mock${resource.name});
      expect(mockK8sApi.read${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}).toHaveBeenCalledWith('${resource.varName}-1', 'default');
    });

    it('should handle not found errors', async () => {
      const error = new Error('Not found');
      mockK8sApi.read${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}.mockRejectedValue(error);

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found');
    });

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace');
      mockK8sApi.read${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}.mockRejectedValue(error);

      await expect(service.GetOneByNsName('invalid', '${resource.varName}-1')).rejects.toThrow('Invalid namespace');
    });
  });`
: ''}

  ${resource.hasNamespace
? `describe('Delete', () => {
    it('should delete a ${resource.name.toLowerCase()}', async () => {
      mockK8sApi.delete${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}.mockResolvedValue({
        body: { status: 'Success' },
      });

      await service.Delete('default', '${resource.varName}-1');

      expect(mockK8sApi.delete${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}).toHaveBeenCalledWith('${resource.varName}-1', 'default');
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed');
      mockK8sApi.delete${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}.mockRejectedValue(error);

      await expect(service.Delete('default', '${resource.varName}-1')).rejects.toThrow('Delete failed');
    });

    it('should handle already deleted ${resource.name.toLowerCase()}s', async () => {
      const error = new Error('Not found');
      mockK8sApi.delete${resource.hasNamespace ? 'Namespaced' : ''}${resource.name}.mockRejectedValue(error);

      await expect(service.Delete('default', 'nonexistent')).rejects.toThrow('Not found');
    });
  });`
: ''}

  // Add more test cases for specific service methods like:
  // - Create
  // - Update/Patch
  // - Scale (if applicable)
  // - Restart (if applicable)
  // - Custom operations
});
`
  }

  /**
   * Generate utility test content
   */
  private generateUtilityTestContent(utilName: string): string {
    return `import { describe, it, expect } from 'vitest';
import * as ${utilName} from './${utilName}';

describe('${utilName}', () => {
  it('should be defined', () => {
    expect(${utilName}).toBeDefined();
  });

  // TODO: Add specific tests for ${utilName} functions
  // Example test structure:
  //
  // describe('functionName', () => {
  //   it('should handle normal input', () => {
  //     const result = ${utilName}.functionName(input);
  //     expect(result).toEqual(expected);
  //   });
  //
  //   it('should handle edge cases', () => {
  //     // Test edge cases
  //   });
  //
  //   it('should handle errors', () => {
  //     // Test error handling
  //   });
  // });
});
`
  }

  /**
   * Generate Vue component test content
   */
  private generateVueComponentTestContent(componentName: string): string {
    return `import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import ${componentName} from './${componentName}.vue';

describe('${componentName}', () => {
  let wrapper: VueWrapper<any>;

  beforeEach(() => {
    wrapper = mount(${componentName}, {
      props: {
        // Add props as needed
      },
      global: {
        stubs: {
          // Stub child components if needed
        },
        mocks: {
          // Mock injected dependencies
        },
      },
    });
  });

  it('should render correctly', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('should display correct content', () => {
    // Test component content
    // Example: expect(wrapper.text()).toContain('expected text');
  });

  it('should handle user interactions', async () => {
    // Test user interactions
    // Example:
    // const button = wrapper.find('button');
    // await button.trigger('click');
    // expect(wrapper.emitted()).toHaveProperty('event-name');
  });

  it('should emit events correctly', async () => {
    // Test event emission
  });

  it('should call API services when needed', () => {
    // Test service calls
  });

  it('should handle loading state', () => {
    // Test loading states
  });

  it('should handle error state', () => {
    // Test error handling
  });

  it('should handle empty state', () => {
    // Test empty states
  });

  // Add component-specific tests

  afterEach(() => {
    wrapper.unmount();
  });
});
`
  }
}

// Run generator
if (require.main === module) {
  const generator = new TestGenerator()
  generator.generate().catch(console.error)
}

export default TestGenerator
