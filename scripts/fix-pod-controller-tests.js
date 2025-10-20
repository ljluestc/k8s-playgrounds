const fs = require('node:fs')
const _path = require('node:path')

const filePath = 'src/backend/k8s/pod/pod.controller.spec.ts'

console.log('Fixing pod controller tests...')

let content = fs.readFileSync(filePath, 'utf8')

// Replace all mockK8sService with k8sService
content = content.replace(/mockK8sService/g, 'k8sService')

// Replace K8sMockFactory.createPodList with createPod calls
content = content.replace(/K8sMockFactory\.createPodList\(\d+\)/g, (match) => {
  const count = match.match(/\d+/)[0]
  const pods = []
  for (let i = 1; i <= Number.parseInt(count); i++)
    pods.push(`createPod('pod-${i}', 'default')`)

  return `[${pods.join(', ')}]`
})

// Replace K8sMockFactory.createPod with createPod
content = content.replace(/K8sMockFactory\.createPod\(/g, 'createPod(')

fs.writeFileSync(filePath, content)

console.log('Fixed pod controller tests!')
