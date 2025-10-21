const fs = require('node:fs')
// const path = require('node:path') // Unused import removed

// List of controller files with syntax errors
const controllerFiles = [
  'src/backend/k8s/PodDisruptionBudget/PodDisruptionBudget.controller.ts',
  'src/backend/k8s/horizontalpodautoscaler/HorizontalPodAutoscaler.controller.ts',
  'src/backend/k8s/resourcequota/resourcequota.controller.ts',
  'src/backend/k8s/MutatingWebhook/MutatingWebhook.controller.ts',
  'src/backend/k8s/ingressClass/IngressClass.controller.ts',
  'src/backend/k8s/event/event.controller.ts',
  'src/backend/k8s/replicationController/replication.controller.ts',
  'src/backend/k8s/priorityclass/priorityclass.controller.ts',
  'src/backend/k8s/EndpointSlice/EndpointSlice.controller.ts',
  'src/backend/k8s/cronjob/cronjob.controller.ts',
  'src/backend/k8s/ValidatingWebhook/ValidatingWebhook.controller.ts',
  'src/backend/k8s/shell/Shell.controller.ts',
  'src/backend/k8s/replicaset/replicaset.controller.ts',
  'src/backend/k8s/RoleBinding/RoleBinding.controller.ts',
  'src/backend/k8s/endpoint/Endpoint.controller.ts',
  'src/backend/k8s/daemonset/daemonset.controller.ts',
  'src/backend/k8s/limitrange/limitrange.controller.ts',
  'src/backend/k8s/client/client.controller.ts',
  'src/backend/k8s/statefulset/statefulset.controller.ts',
  'src/backend/k8s/ServiceAccount/ServiceAccount.controller.ts',
]

// Fix each controller file
for (const filePath of controllerFiles) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')

    console.log(`Fixing ${filePath}`)

    // Fix the syntax error by removing the leading comma
    content = content.replace(/import\s*{\s*,\s*/g, 'import {\n  ')

    // Clean up any extra commas and format properly
    content = content.replace(/,\s*,\s*/g, ', ')
    content = content.replace(/,\s*}/g, '\n}')

    fs.writeFileSync(filePath, content)
    console.log('  ✅ Fixed syntax error')
  }
  catch (error) {
    console.error(`Error processing ${filePath}:`, error.message)
  }
}

console.log(`\n✅ Fixed syntax errors in ${controllerFiles.length} controller files`)
