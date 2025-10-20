const fs = require('node:fs')

// List of controller test files that need to be fixed
const testFiles = [
  'src/backend/k8s/RoleBinding/RoleBinding.controller.spec.ts',
  'src/backend/k8s/ServiceAccount/ServiceAccount.controller.spec.ts',
  'src/backend/k8s/cronjob/cronjob.controller.spec.ts',
  'src/backend/k8s/daemonset/daemonset.controller.spec.ts',
  'src/backend/k8s/horizontalpodautoscaler/HorizontalPodAutoscaler.controller.spec.ts',
  'src/backend/k8s/replicaset/replicaset.controller.spec.ts',
  'src/backend/k8s/statefulset/statefulset.controller.spec.ts',
  'src/backend/k8s/storageClass/StorageClass.controller.spec.ts',
]

// Fix each test file
for (const filePath of testFiles) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')

    console.log(`Fixing ${filePath}`)

    // Extract the controller name from the file path
    const pathParts = filePath.split('/')
    const controllerName = pathParts[pathParts.length - 2] // e.g., RoleBinding

    // Remove unused imports
    content = content.replace(/import type { TestingModule } from '@nestjs\/testing'\n/g, '')
    content = content.replace(/import { Test, TestingModule } from '@nestjs\/testing'\n/g, '')
    content = content.replace(/import { K8sService } from '\.\.\/k8s\.service'\n/g, '')

    // Clean up extra empty lines
    content = content.replace(/\n\n\n+/g, '\n\n')

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
