const fs = require('node:fs')
// const path = require('node:path') // Unused import removed

// List of controller test files that need to be fixed
const testFiles = [
  'src/backend/k8s/storageClass/StorageClass.controller.spec.ts',
  'src/backend/k8s/horizontalpodautoscaler/HorizontalPodAutoscaler.controller.spec.ts',
  'src/backend/k8s/ClusterRoleBinding/ClusterRoleBinding.controller.spec.ts',
  'src/backend/k8s/cronjob/cronjob.controller.spec.ts',
  'src/backend/k8s/Role/Role.controller.spec.ts',
  'src/backend/k8s/replicaset/replicaset.controller.spec.ts',
  'src/backend/k8s/RoleBinding/RoleBinding.controller.spec.ts',
  'src/backend/k8s/daemonset/daemonset.controller.spec.ts',
  'src/backend/k8s/statefulset/statefulset.controller.spec.ts',
  'src/backend/k8s/ServiceAccount/ServiceAccount.controller.spec.ts',
  'src/backend/k8s/job/job.controller.spec.ts',
]

// Fix each test file
for (const filePath of testFiles) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')

    console.log(`Fixing ${filePath}`)

    // Extract the controller name from the file path
    const pathParts = filePath.split('/')
    const controllerName = pathParts[pathParts.length - 2] // e.g., Role

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

    // Find the vitest import line and add the new import after it
    const vitestMatch = content.match(/import\s*{\s*[^}]+\s*}\s*from\s*['"]vitest['"]/)
    if (vitestMatch)
      content = content.replace(vitestMatch[0], `${vitestMatch[0]}\n${newImports}`)

    // Replace the test setup
    const oldSetupRegex = /describe\([^)]+\s*{\s*let\s+controller:[^;]+;\s*let\s+k8sService:[^;]+;\s*beforeEach\(async\s*\(\)\s*=>\s*{\s*const\s+module:\s*TestingModule\s*=\s*await\s+Test\.createTestingModule\(\{[^}]+\}\)\.compile\(\)\s*controller\s*=\s*module\.get<[^>]+>\([^)]+\)\s*k8sService\s*=\s*module\.get<K8sService>\(K8sService\)\s*}\)/s

    const newSetup = `describe('${controllerName}Controller', () => {
  let controller: ${controllerName}Controller
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new ${controllerName}Controller(k8sService)
  })`

    content = content.replace(oldSetupRegex, newSetup)

    // Remove the old provider setup
    content = content.replace(
      /providers:\s*\[\s*\{\s*provide:\s*K8sService,\s*useValue:\s*\{[^}]+\}\s*,\s*\}\s*\]/s,
      '',
    )

    fs.writeFileSync(filePath, content)
    console.log('  ✅ Fixed to use createMockK8sService')
  }
  catch (error) {
    console.error(`Error processing ${filePath}:`, error.message)
  }
}

console.log(`\n✅ Fixed ${testFiles.length} controller test files`)
