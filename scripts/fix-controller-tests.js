const { readFileSync, writeFileSync } = require('node:fs')
const _path = require('node:path')
const { glob } = require('glob')

async function fixControllerTests() {
  const controllerTestFiles = glob.sync('src/backend/k8s/**/*.controller.spec.ts')

  for (const filePath of controllerTestFiles) {
    console.log(`Processing ${filePath}...`)

    let content = readFileSync(filePath, 'utf8')

    // Add import for createMockK8sService
    if (!content.includes('createMockK8sService')) {
      content = content.replace(
        /import { K8sService } from '\.\.\/k8s\.service';/,
        `import { K8sService } from '../k8s.service';
import { createMockK8sService } from '../../../test/utils/k8s-mocks';`,
      )
    }

    // Replace the K8sService mock setup
    const mockPattern = /const module: TestingModule = await Test\.createTestingModule\(\{\s*controllers: \[.*?\],\s*providers: \[\s*\{\s*provide: K8sService,\s*useValue: \{[^}]*\}\s*,\s*\}\s*\],\s*\}\)\.compile\(\);/s

    if (mockPattern.test(content)) {
      const controllerMatch = content.match(/controllers: \[(.*?)\]/s)
      const controllerName = controllerMatch ? controllerMatch[1].trim() : 'RoleController'

      content = content.replace(
        mockPattern,
        `const mockK8sService = createMockK8sService();
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [${controllerName}],
      providers: [
        {
          provide: K8sService,
          useValue: mockK8sService,
        },
      ],
    }).compile();`,
      )
    }

    writeFileSync(filePath, content)
    console.log(`Updated ${filePath}`)
  }

  console.log('All controller test files updated!')
}

fixControllerTests().catch(console.error)
