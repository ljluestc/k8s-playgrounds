const fs = require('node:fs')
const _path = require('node:path')

const controllerFiles = [
  'src/backend/k8s/PersistentVolumeClaim/PersistentVolumeClaim.controller.ts',
  'src/backend/k8s/PodDisruptionBudget/PodDisruptionBudget.controller.ts',
  'src/backend/k8s/storageClass/StorageClass.controller.ts',
  'src/backend/k8s/ns/ns.controller.ts',
  'src/backend/k8s/horizontalpodautoscaler/HorizontalPodAutoscaler.controller.ts',
  'src/backend/k8s/resourcequota/resourcequota.controller.ts',
  'src/backend/k8s/deployment/deployment.controller.ts',
  'src/backend/k8s/MutatingWebhook/MutatingWebhook.controller.ts',
  'src/backend/k8s/ingressClass/IngressClass.controller.ts',
  'src/backend/k8s/event/event.controller.ts',
  'src/backend/k8s/service/NetworkSvc.controller.ts',
  'src/backend/k8s/secret/secret.controller.ts',
  'src/backend/k8s/replicationController/replication.controller.ts',
  'src/backend/k8s/networkPolicy/NetworkPolicy.controller.ts',
  'src/backend/k8s/ClusterRole/ClusterRole.controller.ts',
  'src/backend/k8s/ClusterRoleBinding/ClusterRoleBinding.controller.ts',
  'src/backend/k8s/priorityclass/priorityclass.controller.ts',
  'src/backend/k8s/Counter/counter.controller.ts',
  'src/backend/k8s/EndpointSlice/EndpointSlice.controller.ts',
  'src/backend/k8s/cronjob/cronjob.controller.ts',
  'src/backend/k8s/ValidatingWebhook/ValidatingWebhook.controller.ts',
  'src/backend/k8s/Role/Role.controller.ts',
  'src/backend/k8s/shell/Shell.controller.ts',
  'src/backend/k8s/replicaset/replicaset.controller.ts',
  'src/backend/k8s/RoleBinding/RoleBinding.controller.ts',
  'src/backend/k8s/endpoint/Endpoint.controller.ts',
  'src/backend/k8s/daemonset/daemonset.controller.ts',
  'src/backend/k8s/limitrange/limitrange.controller.ts',
  'src/backend/k8s/node/node.controller.ts',
  'src/backend/k8s/client/client.controller.ts',
  'src/backend/k8s/ingress/ingress.controller.ts',
  'src/backend/k8s/statefulset/statefulset.controller.ts',
  'src/backend/k8s/ServiceAccount/ServiceAccount.controller.ts',
  'src/backend/k8s/configmap/configmap.controller.ts',
  'src/backend/k8s/job/job.controller.ts',
]

console.log('Adding @Injectable decorator to controllers...')

controllerFiles.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8')

    // Check if @Injectable is already present
    if (content.includes('@Injectable')) {
      console.log(`Skipping ${filePath} - already has @Injectable`)
      return
    }

    // Add Injectable to imports
    content = content.replace(
      /import { ([^}]+) } from '@nestjs\/common'/,
      (match, imports) => {
        if (imports.includes('Injectable'))
          return match

        return `import { ${imports}, Injectable } from '@nestjs/common'`
      },
    )

    // Add @Injectable decorator before @Controller
    content = content.replace(
      /@Controller\(/,
      '@Injectable()\n@Controller(',
    )

    fs.writeFileSync(filePath, content)
    console.log(`Added @Injectable to ${filePath}`)
  }
  else {
    console.log(`File not found: ${filePath}`)
  }
})

console.log('Done adding @Injectable decorators!')
