#!/usr/bin/env node

const fs = require('node:fs')

const filePath = 'src/backend/k8s/pod/pod.service.spec.ts'

if (!fs.existsSync(filePath)) {
  console.log(`File not found: ${filePath}`)
  process.exit(1)
}

let content = fs.readFileSync(filePath, 'utf8')

// Replace K8sMockFactory.createPodList(n) with array of createPod calls
content = content.replace(
  /K8sMockFactory\.createPodList\((\d+)\)/g,
  (match, count) => {
    const pods = []
    for (let i = 1; i <= Number.parseInt(count); i++)
      pods.push(`createPod('pod-${i}')`)

    return `[${pods.join(', ')}]`
  },
)

// Replace K8sMockFactory.createPod() with createPod('test-pod')
content = content.replace(
  /K8sMockFactory\.createPod\(\)/g,
  'createPod(\'test-pod\')',
)

// Replace K8sMockFactory.createPod({...}) with createPod('test-pod', 'default', {...})
content = content.replace(
  /K8sMockFactory\.createPod\(\{([^}]+)\}\)/g,
  'createPod(\'test-pod\', \'default\', {$1})',
)

fs.writeFileSync(filePath, content)
console.log(`Fixed K8sMockFactory calls in: ${filePath}`)
