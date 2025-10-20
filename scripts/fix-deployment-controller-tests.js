const fs = require('node:fs')
const _path = require('node:path')

const filePath = 'src/backend/k8s/deployment/deployment.controller.spec.ts'

console.log('Fixing deployment controller tests...')

let content = fs.readFileSync(filePath, 'utf8')

// Replace K8sMockFactory.createDeploymentList with createDeployment calls
content = content.replace(/K8sMockFactory\.createDeploymentList\(\d+\)/g, (match) => {
  const count = match.match(/\d+/)[0]
  const deployments = []
  for (let i = 1; i <= Number.parseInt(count); i++)
    deployments.push(`createDeployment('deployment-${i}', 'default')`)

  return `[${deployments.join(', ')}]`
})

// Replace K8sMockFactory.createDeployment with createDeployment
content = content.replace(/K8sMockFactory\.createDeployment\(/g, 'createDeployment(')

// Replace mockK8sService with k8sService
content = content.replace(/mockK8sService/g, 'k8sService')

fs.writeFileSync(filePath, content)

console.log('Fixed deployment controller tests!')
