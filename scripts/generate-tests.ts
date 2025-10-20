#!/usr/bin/env ts-node

import * as fs from 'node:fs'
import * as path from 'node:path'

const K8S_RESOURCES = [
  'namespace', 'node', 'event', 'replicaset', 'daemonset', 'statefulset',
  'cronjob', 'job', 'configmap', 'secret', 'priorityclass', 'resourcequota',
  'limitrange', 'hpa', 'pdb', 'endpoint', 'endpointslice', 'service',
  'ingress', 'ingressclass', 'storageclass', 'pv', 'pvc',
  'mutatingwebhook', 'validatingwebhook', 'role', 'rolebinding',
  'clusterrole', 'clusterrolebinding', 'serviceaccount', 'replicationcontroller',
]

interface ResourceConfig {
  name: string
  className: string
  hasNamespace: boolean
  hasList: boolean
  hasDelete: boolean
  hasGetOne: boolean
  customMethods?: string[]
}

const resourceConfigs: Record<string, ResourceConfig> = {
  namespace: { name: 'namespace', className: 'Namespace', hasNamespace: false, hasList: true, hasDelete: true, hasGetOne: true },
  node: { name: 'node', className: 'Node', hasNamespace: false, hasList: true, hasDelete: false, hasGetOne: true, customMethods: ['cordon', 'drain'] },
  event: { name: 'event', className: 'Event', hasNamespace: true, hasList: true, hasDelete: false, hasGetOne: true },
  replicaset: { name: 'replicaset', className: 'ReplicaSet', hasNamespace: true, hasList: true, hasDelete: true, hasGetOne: true },
  daemonset: { name: 'daemonset', className: 'DaemonSet', hasNamespace: true, hasList: true, hasDelete: true, hasGetOne: true },
  statefulset: { name: 'statefulset', className: 'StatefulSet', hasNamespace: true, hasList: true, hasDelete: true, hasGetOne: true, customMethods: ['restart', 'scale'] },
  cronjob: { name: 'cronjob', className: 'CronJob', hasNamespace: true, hasList: true, hasDelete: true, hasGetOne: true, customMethods: ['suspend', 'trigger'] },
  job: { name: 'job', className: 'Job', hasNamespace: true, hasList: true, hasDelete: true, hasGetOne: true },
  configmap: { name: 'configmap', className: 'ConfigMap', hasNamespace: true, hasList: true, hasDelete: true, hasGetOne: true },
  secret: { name: 'secret', className: 'Secret', hasNamespace: true, hasList: true, hasDelete: true, hasGetOne: true },
  service: { name: 'service', className: 'Service', hasNamespace: true, hasList: true, hasDelete: true, hasGetOne: true },
  ingress: { name: 'ingress', className: 'Ingress', hasNamespace: true, hasList: true, hasDelete: true, hasGetOne: true },
}

function generateControllerTest(resource: ResourceConfig): string {
  const serviceName = `${resource.className.toLowerCase()}Service`

  return `import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ${resource.className}Controller } from './${resource.name}.controller';
import { K8sService } from '@backend/k8s/k8s.service';

describe('${resource.className}Controller', () => {
  let controller: ${resource.className}Controller;
  let k8sService: any;

  beforeEach(async () => {
    const mock${resource.className}Service = {
      List: vi.fn(),
      ${resource.hasGetOne ? 'GetOne: vi.fn(),' : ''}
      ${resource.hasDelete ? 'Delete: vi.fn(),' : ''}
      ${resource.customMethods?.map(m => `${m.charAt(0).toUpperCase() + m.slice(1)}: vi.fn(),`).join('\n      ') || ''}
    };

    k8sService = {
      ${serviceName}: mock${resource.className}Service,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [${resource.className}Controller],
      providers: [
        {
          provide: K8sService,
          useValue: k8sService,
        },
      ],
    }).compile();

    controller = module.get<${resource.className}Controller>(${resource.className}Controller);
  });

  describe('List', () => {
    it('should return all ${resource.name}s', async () => {
      const mockData = [{ metadata: { name: 'test-${resource.name}' } }];
      k8sService.${serviceName}.List.mockResolvedValue(mockData);

      const result = await controller.List();

      expect(result).toEqual(mockData);
      expect(k8sService.${serviceName}.List).toHaveBeenCalled();
    });

    it('should handle empty list', async () => {
      k8sService.${serviceName}.List.mockResolvedValue([]);

      const result = await controller.List();

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      k8sService.${serviceName}.List.mockRejectedValue(new Error('API Error'));

      await expect(controller.List()).rejects.toThrow('API Error');
    });
  });

  ${resource.hasNamespace
? `
  describe('ListByNs', () => {
    it('should return ${resource.name}s from specific namespace', async () => {
      const mockData = [{ metadata: { name: 'test-${resource.name}', namespace: 'test-ns' } }];
      k8sService.${serviceName}.List.mockResolvedValue(mockData);

      const result = await controller.ListByNs('test-ns');

      expect(result).toEqual(mockData);
      expect(k8sService.${serviceName}.List).toHaveBeenCalledWith('test-ns');
    });
  });
  `
: ''}

  ${resource.hasGetOne
? `
  describe('GetOne', () => {
    it('should return a specific ${resource.name}', async () => {
      const mockData = { metadata: { name: 'test-${resource.name}' } };
      k8sService.${serviceName}.GetOne.mockResolvedValue(mockData);

      ${resource.hasNamespace
        ? `const result = await controller.GetOneByNsName('test-ns', 'test-${resource.name}');
      expect(k8sService.${serviceName}.GetOne).toHaveBeenCalledWith('test-ns', 'test-${resource.name}');`
        : `const result = await controller.GetOne('test-${resource.name}');
      expect(k8sService.${serviceName}.GetOne).toHaveBeenCalledWith('test-${resource.name}');`}

      expect(result).toEqual(mockData);
    });

    it('should handle not found error', async () => {
      k8sService.${serviceName}.GetOne.mockRejectedValue(new Error('Not found'));

      ${resource.hasNamespace
        ? 'await expect(controller.GetOneByNsName(\'test-ns\', \'nonexistent\')).rejects.toThrow(\'Not found\');'
        : 'await expect(controller.GetOne(\'nonexistent\')).rejects.toThrow(\'Not found\');'}
    });
  });
  `
: ''}

  ${resource.hasDelete
? `
  describe('Delete', () => {
    it('should delete ${resource.name}', async () => {
      k8sService.${serviceName}.Delete.mockResolvedValue({});

      ${resource.hasNamespace
        ? `const result = await controller.Delete(['test-ns/test-${resource.name}']);
      expect(k8sService.${serviceName}.Delete).toHaveBeenCalledWith('test-${resource.name}', 'test-ns');`
        : `const result = await controller.Delete(['test-${resource.name}']);
      expect(k8sService.${serviceName}.Delete).toHaveBeenCalledWith('test-${resource.name}');`}

      expect(result).toBeDefined();
    });

    it('should delete multiple ${resource.name}s', async () => {
      k8sService.${serviceName}.Delete.mockResolvedValue({});

      ${resource.hasNamespace
        ? `await controller.Delete(['ns1/item1', 'ns2/item2']);
      expect(k8sService.${serviceName}.Delete).toHaveBeenCalledTimes(2);`
        : `await controller.Delete(['item1', 'item2']);
      expect(k8sService.${serviceName}.Delete).toHaveBeenCalledTimes(2);`}
    });
  });
  `
: ''}
});
`
}

function generateServiceTest(resource: ResourceConfig): string {
  return `import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ${resource.className}Service } from './${resource.name}.service';
import { ClientService } from '@backend/k8s/client/client.service';
import { NestJSTestHelper } from '../../../../test/utils/nestjs-test.helper';

describe('${resource.className}Service', () => {
  let service: ${resource.className}Service;
  let clientService: any;
  let mockK8sApi: any;

  beforeEach(async () => {
    mockK8sApi = NestJSTestHelper.createMockK8sApi();
    clientService = NestJSTestHelper.createMockClientService(mockK8sApi);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ${resource.className}Service,
        {
          provide: ClientService,
          useValue: clientService,
        },
      ],
    }).compile();

    service = module.get<${resource.className}Service>(${resource.className}Service);
  });

  describe('List', () => {
    it('should list all ${resource.name}s when no namespace specified', async () => {
      const mockData = [{ metadata: { name: 'test-${resource.name}' } }];
      mockK8sApi.list${resource.className}ForAllNamespaces.mockResolvedValue({
        body: { items: mockData },
      });

      const result = await service.List();

      expect(result).toEqual(mockData);
      expect(mockK8sApi.list${resource.className}ForAllNamespaces).toHaveBeenCalled();
    });

    ${resource.hasNamespace
? `
    it('should list ${resource.name}s in specific namespace', async () => {
      const mockData = [{ metadata: { name: 'test-${resource.name}' } }];
      mockK8sApi.listNamespaced${resource.className}.mockResolvedValue({
        body: { items: mockData },
      });

      const result = await service.List('test-ns');

      expect(result).toEqual(mockData);
      expect(mockK8sApi.listNamespaced${resource.className}).toHaveBeenCalledWith('test-ns');
    });
    `
: ''}

    it('should handle empty list', async () => {
      mockK8sApi.list${resource.className}ForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      });

      const result = await service.List();

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockK8sApi.list${resource.className}ForAllNamespaces.mockRejectedValue(new Error('API Error'));

      await expect(service.List()).rejects.toThrow('API Error');
    });
  });

  ${resource.hasGetOne
? `
  describe('GetOne', () => {
    it('should get a specific ${resource.name}', async () => {
      const mockData = { metadata: { name: 'test-${resource.name}' } };
      mockK8sApi.readNamespaced${resource.className}.mockResolvedValue({
        body: mockData,
      });

      ${resource.hasNamespace
        ? `const result = await service.GetOne('test-ns', 'test-${resource.name}');
      expect(mockK8sApi.readNamespaced${resource.className}).toHaveBeenCalledWith('test-${resource.name}', 'test-ns');`
        : `const result = await service.GetOne('test-${resource.name}');
      expect(mockK8sApi.read${resource.className}).toHaveBeenCalledWith('test-${resource.name}');`}

      expect(result).toEqual(mockData);
    });

    it('should handle not found error', async () => {
      mockK8sApi.readNamespaced${resource.className}.mockRejectedValue(new Error('Not found'));

      ${resource.hasNamespace
        ? 'await expect(service.GetOne(\'test-ns\', \'nonexistent\')).rejects.toThrow(\'Not found\');'
        : 'await expect(service.GetOne(\'nonexistent\')).rejects.toThrow(\'Not found\');'}
    });
  });
  `
: ''}

  ${resource.hasDelete
? `
  describe('Delete', () => {
    it('should delete a ${resource.name}', async () => {
      const mockResponse = { kind: '${resource.className}' };
      mockK8sApi.deleteNamespaced${resource.className}.mockResolvedValue({
        body: mockResponse,
      });

      ${resource.hasNamespace
        ? `const result = await service.Delete('test-${resource.name}', 'test-ns');
      expect(mockK8sApi.deleteNamespaced${resource.className}).toHaveBeenCalledWith('test-${resource.name}', 'test-ns');`
        : `const result = await service.Delete('test-${resource.name}');
      expect(mockK8sApi.delete${resource.className}).toHaveBeenCalledWith('test-${resource.name}');`}

      expect(result).toEqual(mockResponse);
    });

    it('should handle delete errors', async () => {
      mockK8sApi.deleteNamespaced${resource.className}.mockRejectedValue(new Error('Delete failed'));

      ${resource.hasNamespace
        ? `await expect(service.Delete('test-${resource.name}', 'test-ns')).rejects.toThrow('Delete failed');`
        : `await expect(service.Delete('test-${resource.name}')).rejects.toThrow('Delete failed');`}
    });
  });
  `
: ''}
});
`
}

function generateTestsForResource(resource: string) {
  const config = resourceConfigs[resource] || {
    name: resource,
    className: resource.charAt(0).toUpperCase() + resource.slice(1),
    hasNamespace: true,
    hasList: true,
    hasDelete: true,
    hasGetOne: true,
  }

  const resourceDir = path.join(__dirname, '..', 'src', 'backend', 'k8s', resource)

  if (!fs.existsSync(resourceDir)) {
    console.log(`⏭️  Skipping ${resource} - directory not found`)
    return
  }

  // Check if controller exists
  const controllerPath = path.join(resourceDir, `${resource}.controller.ts`)
  if (fs.existsSync(controllerPath)) {
    const controllerTestPath = path.join(resourceDir, `${resource}.controller.spec.ts`)
    if (!fs.existsSync(controllerTestPath)) {
      const controllerTest = generateControllerTest(config)
      fs.writeFileSync(controllerTestPath, controllerTest)
      console.log(`✅ Generated ${resource}.controller.spec.ts`)
    }
    else {
      console.log(`⏭️  ${resource}.controller.spec.ts already exists`)
    }
  }

  // Check if service exists
  const servicePath = path.join(resourceDir, `${resource}.service.ts`)
  if (fs.existsSync(servicePath)) {
    const serviceTestPath = path.join(resourceDir, `${resource}.service.spec.ts`)
    if (!fs.existsSync(serviceTestPath)) {
      const serviceTest = generateServiceTest(config)
      fs.writeFileSync(serviceTestPath, serviceTest)
      console.log(`✅ Generated ${resource}.service.spec.ts`)
    }
    else {
      console.log(`⏭️  ${resource}.service.spec.ts already exists`)
    }
  }
}

console.log('🚀 Starting test generation for all K8s resources...\n')

K8S_RESOURCES.forEach((resource) => {
  console.log(`\n📦 Processing ${resource}...`)
  generateTestsForResource(resource)
})

console.log('\n\n✨ Test generation complete!\n')
console.log('📊 Next steps:')
console.log('  1. Run: pnpm install')
console.log('  2. Run: pnpm test:backend')
console.log('  3. Run: pnpm test:coverage')
