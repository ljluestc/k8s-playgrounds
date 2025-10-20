#!/usr/bin/env node

const fs = require('node:fs')
const _path = require('node:path')

// Service test files that need fixing
const serviceFiles = [
  'src/backend/k8s/deployment/deployment.service.spec.ts',
  'src/backend/k8s/configmap/configmap.service.spec.ts',
  'src/backend/k8s/ns/ns.service.spec.ts',
  'src/backend/k8s/node/node.service.spec.ts',
  'src/backend/k8s/replicaset/replicaset.service.spec.ts',
  'src/backend/k8s/Role/Role.service.spec.ts',
  'src/backend/k8s/job/job.service.spec.ts',
  'src/backend/k8s/ingress/ingress.service.spec.ts',
  'src/backend/k8s/daemonset/daemonset.service.spec.ts',
  'src/backend/k8s/ClusterRole/ClusterRole.service.spec.ts',
  'src/backend/k8s/cronjob/cronjob.service.spec.ts',
  'src/backend/k8s/statefulset/statefulset.service.spec.ts',
  'src/backend/k8s/service/NetworkSvc.service.spec.ts',
]

function fixServiceTestFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`)
    return
  }

  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false

  // Extract service name from file path
  const pathParts = filePath.split('/')
  const serviceName = pathParts[pathParts.length - 2] // e.g., 'deployment' from 'deployment.service.spec.ts'
  const ServiceClass = `${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)}Service`

  // Fix the service type in module.get
  if (content.includes('module.get<SecretService>(SecretService)')) {
    content = content.replace(
      /module\.get<SecretService>\(SecretService\)/g,
      `module.get<${ServiceClass}>(${ServiceClass})`,
    )
    modified = true
  }

  // Fix the service variable type
  if (content.includes('let service: SecretService;')) {
    content = content.replace(
      /let service: SecretService;/g,
      `let service: ${ServiceClass};`,
    )
    modified = true
  }

  // Add the service provider to the test module
  if (content.includes('providers: [')) {
    // Check if the service is already provided
    if (!content.includes(`provide: ${ServiceClass}`)) {
      // Find the providers array and add the service provider
      const providersMatch = content.match(/providers:\s*\[([\s\S]*?)\]/)
      if (providersMatch) {
        const _providersContent = providersMatch[1]
        const newProvider = `        {
          provide: ${ServiceClass},
          useFactory: (clientService: ClientService) => {
            return new ${ServiceClass}(clientService);
          },
          inject: [ClientService],
        },`

        content = content.replace(
          /providers:\s*\[/,
          `providers: [\n${newProvider}`,
        )
        modified = true
      }
    }
  }

  // Add mockK8sApi setup
  if (content.includes('const mockClientService = createMockClientService();')) {
    if (!content.includes('mockK8sApi = mockClientService.getCoreV1Api();')) {
      content = content.replace(
        /const mockClientService = createMockClientService\(\);/g,
        `const mockClientService = createMockClientService();
    mockK8sApi = mockClientService.getCoreV1Api();`,
      )
      modified = true
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content)
    console.log(`Fixed service types in: ${filePath}`)
  }
  else {
    console.log(`No changes needed in: ${filePath}`)
  }
}

// Fix all service test files
console.log('Fixing service test files...')
serviceFiles.forEach(fixServiceTestFile)

console.log('Done!')
