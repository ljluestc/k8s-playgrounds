const fs = require('node:fs')

// List of controller test files that need to be fixed
const testFiles = [
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
    const controllerName = pathParts[pathParts.length - 2] // e.g., ServiceAccount

    // Replace the specific pattern
    const oldPattern = `let k8sService: K8sService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [${controllerName}Controller],
      providers: [
        {
          provide: K8sService,
          useValue: {
            ${controllerName.charAt(0).toLowerCase() + controllerName.slice(1)}Service: {
              List: vi.fn(),
              GetOneByNsName: vi.fn(),
              Delete: vi.fn(),
            },
          },
        },
      ],
    }).compile()

    controller = module.get<${controllerName}Controller>(${controllerName}Controller)
    k8sService = module.get<K8sService>(K8sService)
  })`

    const newPattern = `let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new ${controllerName}Controller(k8sService)
  })`

    content = content.replace(oldPattern, newPattern)

    fs.writeFileSync(filePath, content)
    console.log('  ✅ Fixed to use createMockK8sService')
  }
  catch (error) {
    console.error(`Error processing ${filePath}:`, error.message)
  }
}

console.log(`\n✅ Fixed ${testFiles.length} controller test files`)
