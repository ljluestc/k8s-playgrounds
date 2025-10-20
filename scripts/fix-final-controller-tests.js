const fs = require('node:fs')

// List of controller test files that need to be fixed
const testFiles = [
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

    // Replace the variable type
    content = content.replace(/let k8sService: K8sService/g, 'let k8sService: any')

    // Replace the beforeEach setup - this is a more generic approach
    const beforeEachMatch = content.match(/beforeEach\(async \(\) => \{\s*const module: TestingModule = await Test\.createTestingModule\(\{[^}]+\}\)\.compile\(\)\s*controller = module\.get<[^>]+>\([^)]+\)\s*k8sService = module\.get<K8sService>\(K8sService\)\s*\}/s)

    if (beforeEachMatch) {
      // Extract controller name from the file path
      const pathParts = filePath.split('/')
      const controllerName = pathParts[pathParts.length - 2] // e.g., DaemonSet

      const newBeforeEach = `beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new ${controllerName}Controller(k8sService)
  })`

      content = content.replace(beforeEachMatch[0], newBeforeEach)
    }

    fs.writeFileSync(filePath, content)
    console.log('  ✅ Fixed to use createMockK8sService')
  }
  catch (error) {
    console.error(`Error processing ${filePath}:`, error.message)
  }
}

console.log(`\n✅ Fixed ${testFiles.length} controller test files`)
