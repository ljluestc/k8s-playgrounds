const fs = require('node:fs')
const _path = require('node:path')

const controllerTestFiles = [
  'src/backend/k8s/PersistentVolumeClaim/PersistentVolumeClaim.controller.spec.ts',
  'src/backend/k8s/ns/ns.controller.spec.ts',
  'src/backend/k8s/deployment/deployment.controller.spec.ts',
  'src/backend/k8s/service/NetworkSvc.controller.spec.ts',
  'src/backend/k8s/secret/secret.controller.spec.ts',
  'src/backend/k8s/ClusterRole/ClusterRole.controller.spec.ts',
  'src/backend/k8s/cronjob/cronjob.controller.spec.ts',
  'src/backend/k8s/Role/Role.controller.spec.ts',
  'src/backend/k8s/statefulset/statefulset.controller.spec.ts',
  'src/backend/k8s/configmap/configmap.controller.spec.ts',
  'src/backend/k8s/node/node.controller.spec.ts',
  'src/backend/k8s/job/job.controller.spec.ts',
  'src/backend/k8s/replicaset/replicaset.controller.spec.ts',
  'src/backend/k8s/daemonset/daemonset.controller.spec.ts',
  'src/backend/k8s/ingress/ingress.controller.spec.ts',
  'src/backend/k8s/event/event.controller.spec.ts',
  'src/backend/k8s/endpoint/Endpoint.controller.spec.ts',
  'src/backend/k8s/EndpointSlice/EndpointSlice.controller.spec.ts',
  'src/backend/k8s/horizontalpodautoscaler/HorizontalPodAutoscaler.controller.spec.ts',
  'src/backend/k8s/ingressClass/IngressClass.controller.spec.ts',
  'src/backend/k8s/limitrange/limitrange.controller.spec.ts',
  'src/backend/k8s/networkPolicy/NetworkPolicy.controller.spec.ts',
  'src/backend/k8s/priorityclass/priorityclass.controller.spec.ts',
  'src/backend/k8s/replicationController/replication.controller.spec.ts',
  'src/backend/k8s/resourcequota/resourcequota.controller.spec.ts',
  'src/backend/k8s/ServiceAccount/ServiceAccount.controller.spec.ts',
  'src/backend/k8s/shell/Shell.controller.spec.ts',
  'src/backend/k8s/storageClass/StorageClass.controller.spec.ts',
  'src/backend/k8s/ClusterRoleBinding/ClusterRoleBinding.controller.spec.ts',
  'src/backend/k8s/RoleBinding/RoleBinding.controller.spec.ts',
  'src/backend/k8s/PodDisruptionBudget/PodDisruptionBudget.controller.spec.ts',
  'src/backend/k8s/MutatingWebhook/MutatingWebhook.controller.spec.ts',
  'src/backend/k8s/ValidatingWebhook/ValidatingWebhook.controller.spec.ts',
  'src/backend/k8s/Counter/counter.controller.spec.ts',
  'src/backend/k8s/client/client.controller.spec.ts',
]

console.log('Fixing all controller tests...')

controllerTestFiles.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    console.log(`Processing ${filePath}...`)

    let content = fs.readFileSync(filePath, 'utf8')

    // Skip if already using direct instantiation
    if (content.includes('new ') && content.includes('Controller(')) {
      console.log(`Skipping ${filePath} - already using direct instantiation`)
      return
    }

    // Remove Test, TestingModule imports
    content = content.replace(/import { Test, TestingModule } from '@nestjs\/testing';\n?/g, '')

    // Remove createMockK8sService import
    content = content.replace(/import { createMockK8sService } from '[^']+';\n?/g, '')

    // Remove K8sMockFactory imports
    content = content.replace(/import { K8sMockFactory } from '[^']+';\n?/g, '')

    // Add createPod import if not present
    if (!content.includes('createPod') && content.includes('K8sMockFactory')) {
      content = content.replace(
        /import { vi } from "vitest";/,
        'import { vi } from "vitest";\nimport { createPod } from \'../../../../test/utils/k8s-mocks\';',
      )
    }

    // Replace beforeEach with direct instantiation pattern
    content = content.replace(
      /beforeEach\(async \(\) => \{[\s\S]*?const module: TestingModule = await Test\.createTestingModule\(\{[\s\S]*?\}\.compile\(\);\s*[\s\S]*?\}\s*\);/g,
      (_match) => {
        // Extract service name from the file path
        const serviceName = filePath.match(/\/([^/]+)\/[^/]+\.controller\.spec\.ts$/)[1]
        const serviceProperty = `${serviceName.charAt(0).toLowerCase() + serviceName.slice(1)}Service`

        return `beforeEach(() => {
    const mock${serviceName}Service = {
      List: vi.fn(),
      GetOne: vi.fn(),
      GetOneByNsName: vi.fn(),
      Delete: vi.fn(),
      Update: vi.fn(),
      Restart: vi.fn(),
      Scale: vi.fn(),
    };

    const mockK8sService = {
      ${serviceProperty}: mock${serviceName}Service,
    } as any;

    // Create controller directly with mocked dependencies
    controller = new ${serviceName}Controller(mockK8sService);
    k8sService = mockK8sService;
  });`
      },
    )

    // Replace K8sMockFactory references with createPod
    content = content.replace(/K8sMockFactory\.createPodList\(\d+\)/g, (match) => {
      const count = match.match(/\d+/)[0]
      const pods = []
      for (let i = 1; i <= Number.parseInt(count); i++)
        pods.push(`createPod('pod-${i}', 'default')`)

      return `[${pods.join(', ')}]`
    })

    content = content.replace(/K8sMockFactory\.createPod\(/g, 'createPod(')

    // Replace mockK8sService with k8sService in test bodies
    content = content.replace(/mockK8sService\./g, 'k8sService.')

    fs.writeFileSync(filePath, content)
    console.log(`Fixed ${filePath}`)
  }
  else {
    console.log(`File not found: ${filePath}`)
  }
})

console.log('Done fixing controller tests!')
