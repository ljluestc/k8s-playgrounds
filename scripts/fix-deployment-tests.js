#!/usr/bin/env node

const fs = require('node:fs')

const filePath = 'src/backend/k8s/deployment/deployment.service.spec.ts'

if (!fs.existsSync(filePath)) {
  console.log(`File not found: ${filePath}`)
  process.exit(1)
}

let content = fs.readFileSync(filePath, 'utf8')

// Replace K8sMockFactory.createDeploymentList(n) with array of createDeployment calls
content = content.replace(
  /K8sMockFactory\.createDeploymentList\((\d+)\)/g,
  (match, count) => {
    const deployments = []
    for (let i = 1; i <= Number.parseInt(count); i++)
      deployments.push(`createDeployment('deployment-${i}')`)

    return `[${deployments.join(', ')}]`
  },
)

// Replace K8sMockFactory.createDeployment() with createDeployment('test-deployment')
content = content.replace(
  /K8sMockFactory\.createDeployment\(\)/g,
  'createDeployment(\'test-deployment\')',
)

// Replace K8sMockFactory.createDeployment({...}) with createDeployment('test-deployment', 'default', {...})
content = content.replace(
  /K8sMockFactory\.createDeployment\(\{([^}]+)\}\)/g,
  'createDeployment(\'test-deployment\', \'default\', {$1})',
)

fs.writeFileSync(filePath, content)
console.log(`Fixed K8sMockFactory calls in: ${filePath}`)
