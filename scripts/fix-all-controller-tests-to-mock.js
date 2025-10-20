const fs = require('node:fs')
const path = require('node:path')

// Find all controller test files
const testFiles = []
function findTestFiles(dir) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory())
      findTestFiles(filePath)
    else if (file.endsWith('.controller.spec.ts'))
      testFiles.push(filePath)
  }
}

findTestFiles('src/backend/k8s')

// Fix each test file
for (const filePath of testFiles) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')

    // Check if the file uses Test.createTestingModule (NestJS approach)
    if (content.includes('Test.createTestingModule')) {
      console.log(`Fixing ${filePath}`)

      // Extract the controller name from the file path
      const pathParts = filePath.split('/')
      const controllerName = pathParts[pathParts.length - 2] // e.g., ClusterRole
      const _controllerFileName = pathParts[pathParts.length - 1].replace('.spec.ts', '.ts') // e.g., ClusterRole.controller.ts

      // Extract the service name (e.g., clusterRoleService)
      const _serviceName = `${controllerName.charAt(0).toLowerCase() + controllerName.slice(1)}Service`

      // Replace the imports
      content = content.replace(
        /import\s*{\s*Test,\s*TestingModule\s*}\s*from\s*['"]@nestjs\/testing['"]/g,
        '',
      )
      content = content.replace(
        /import\s*{\s*K8sService\s*}\s*from\s*['"]\.\.\/k8s\.service['"]/g,
        '',
      )

      // Add the new imports
      const newImports = 'import { createMockK8sService } from \'../../../../test/utils/k8s-mocks\''
      content = content.replace(
        /import\s*{\s*beforeEach,\s*describe,\s*it,\s*vi\s*}\s*from\s*['"]vitest['"]/,
        `import { beforeEach, describe, it, vi } from 'vitest'\n${newImports}`,
      )

      // Replace the test setup
      const oldSetup = /describe\([^)]+\s*{\s*let\s+controller:[^;]+;\s*let\s+k8sService:[^;]+;\s*beforeEach\(async\s*\(\)\s*=>\s*{\s*const\s+module:\s*TestingModule\s*=\s*await\s+Test\.createTestingModule\(\{[^}]+\}\)\.compile\(\)\s*controller\s*=\s*module\.get<[^>]+>\([^)]+\)\s*k8sService\s*=\s*module\.get<K8sService>\(K8sService\)\s*}\)/s

      const newSetup = `describe('${controllerName}Controller', () => {
  let controller: ${controllerName}Controller
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new ${controllerName}Controller(k8sService)
  })`

      content = content.replace(oldSetup, newSetup)

      // Remove the old provider setup
      content = content.replace(
        /providers:\s*\[\s*\{\s*provide:\s*K8sService,\s*useValue:\s*\{[^}]+\}\s*,\s*\}\s*\]/s,
        '',
      )

      fs.writeFileSync(filePath, content)
      console.log('  ✅ Fixed to use createMockK8sService')
    }
    else {
      console.log('  ⏭️  Already using direct instantiation or no NestJS setup found')
    }
  }
  catch (error) {
    console.error(`Error processing ${filePath}:`, error.message)
  }
}

console.log(`\n✅ Fixed ${testFiles.length} controller test files`)
