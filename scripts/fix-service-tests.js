const { readFileSync, writeFileSync } = require('node:fs')
const { glob } = require('glob')

async function fixServiceTests() {
  const serviceTestFiles = glob.sync('src/backend/k8s/**/*.service.spec.ts')

  for (const filePath of serviceTestFiles) {
    console.log(`Processing ${filePath}...`)

    let content = readFileSync(filePath, 'utf8')

    // Add import for createMockClientService
    if (!content.includes('createMockClientService')) {
      content = content.replace(
        /import { ClientService } from '\.\.\/client\/client\.service';/,
        `import { ClientService } from '../client/client.service';
import { createMockClientService } from '../../../test/utils/k8s-mocks';`,
      )
    }

    // Replace the ClientService mock setup
    const mockPattern = /const module: TestingModule = await Test\.createTestingModule\(\{\s*providers: \[\s*\{\s*provide: ClientService,\s*useValue: \{[^}]*\}\s*,\s*\}\s*\],\s*\}\)\.compile\(\);/s

    if (mockPattern.test(content)) {
      content = content.replace(
        mockPattern,
        `const mockClientService = createMockClientService();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile();`,
      )
    }

    writeFileSync(filePath, content)
    console.log(`Updated ${filePath}`)
  }

  console.log('All service test files updated!')
}

fixServiceTests().catch(console.error)
