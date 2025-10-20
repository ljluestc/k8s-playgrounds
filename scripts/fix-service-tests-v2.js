const { readFileSync, writeFileSync } = require('node:fs')
const { glob } = require('glob')

async function fixServiceTests() {
  const serviceTestFiles = glob.sync('src/backend/k8s/**/*.service.spec.ts')

  for (const filePath of serviceTestFiles) {
    console.log(`Processing ${filePath}...`)

    let content = readFileSync(filePath, 'utf8')

    // Add imports for helper functions
    if (!content.includes('createMockClientService')) {
      // Determine which helper functions are needed based on the service type
      const serviceType = filePath.split('/').pop().split('.')[0].replace('.service', '')
      const helperImports = []

      if (serviceType.includes('secret'))
        helperImports.push('createSecret')

      if (serviceType.includes('statefulset'))
        helperImports.push('createStatefulSet')

      if (serviceType.includes('deployment'))
        helperImports.push('createDeployment')

      if (serviceType.includes('pod'))
        helperImports.push('createPod')

      if (serviceType.includes('service') || serviceType.includes('NetworkSvc'))
        helperImports.push('createService')

      if (serviceType.includes('configmap'))
        helperImports.push('createConfigMap')

      if (serviceType.includes('role'))
        helperImports.push('createRole')

      if (serviceType.includes('cronjob'))
        helperImports.push('createCronJob')

      if (serviceType.includes('daemonset'))
        helperImports.push('createDaemonSet')

      if (serviceType.includes('job'))
        helperImports.push('createJob')

      if (serviceType.includes('replicaset'))
        helperImports.push('createReplicaSet')

      if (serviceType.includes('node'))
        helperImports.push('createNode')

      if (serviceType.includes('ns') || serviceType.includes('namespace'))
        helperImports.push('createNamespace')

      if (serviceType.includes('event'))
        helperImports.push('createEvent')

      if (helperImports.length > 0) {
        const importStatement = `import { createMockClientService, ${helperImports.join(', ')} } from '../../../test/utils/k8s-mocks';`
        content = content.replace(
          /import { ClientService } from '\.\.\/client\/client\.service';/,
          `import { ClientService } from '../client/client.service';
${importStatement}`,
        )
      }
      else {
        const importStatement = 'import { createMockClientService } from \'../../../test/utils/k8s-mocks\';'
        content = content.replace(
          /import { ClientService } from '\.\.\/client\/client\.service';/,
          `import { ClientService } from '../client/client.service';
${importStatement}`,
        )
      }
    }

    // Replace the entire beforeEach block to use createMockClientService
    const beforeEachPattern = /beforeEach\(async \(\) => \{[\s\S]*?\}\);/

    if (beforeEachPattern.test(content)) {
      content = content.replace(
        beforeEachPattern,
        `beforeEach(async () => {
    const mockClientService = createMockClientService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile();

    service = module.get<SecretService>(SecretService);
    clientService = mockClientService;
  });`,
      )
    }

    writeFileSync(filePath, content)
    console.log(`Updated ${filePath}`)
  }

  console.log('All service test files updated!')
}

fixServiceTests().catch(console.error)
