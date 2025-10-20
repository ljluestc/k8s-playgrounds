#!/usr/bin/env node

const fs = require('node:fs')
const _path = require('node:path')

// Find all service test files
const serviceTestFiles = [
  'src/backend/k8s/service/NetworkSvc.service.spec.ts',
  'src/backend/k8s/ns/ns.service.spec.ts',
  'src/backend/k8s/statefulset/statefulset.service.spec.ts',
  'src/backend/k8s/node/node.service.spec.ts',
  'src/backend/k8s/replicaset/replicaset.service.spec.ts',
  'src/backend/k8s/Role/Role.service.spec.ts',
  'src/backend/k8s/job/job.service.spec.ts',
  'src/backend/k8s/configmap/configmap.service.spec.ts',
  'src/backend/k8s/ingress/ingress.service.spec.ts',
  'src/backend/k8s/daemonset/daemonset.service.spec.ts',
  'src/backend/k8s/ClusterRole/ClusterRole.service.spec.ts',
  'src/backend/k8s/cronjob/cronjob.service.spec.ts',
]

// Find all controller test files
const controllerTestFiles = [
  'src/backend/k8s/statefulset/statefulset.controller.spec.ts',
  'src/backend/k8s/job/job.controller.spec.ts',
  'src/backend/k8s/secret/secret.controller.spec.ts',
  'src/backend/k8s/service/NetworkSvc.controller.spec.ts',
  'src/backend/k8s/ns/ns.controller.spec.ts',
  'src/backend/k8s/node/node.controller.spec.ts',
  'src/backend/k8s/ingress/ingress.controller.spec.ts',
  'src/backend/k8s/daemonset/daemonset.controller.spec.ts',
  'src/backend/k8s/replicaset/replicaset.controller.spec.ts',
  'src/backend/k8s/cronjob/cronjob.controller.spec.ts',
  'src/backend/k8s/Role/Role.controller.spec.ts',
  'src/backend/k8s/configmap/configmap.controller.spec.ts',
  'src/backend/k8s/ClusterRole/ClusterRole.controller.spec.ts',
]

function fixImportPaths(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`)
    return
  }

  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false

  // Fix service test files - they need ../../../../test/utils/k8s-mocks
  if (filePath.includes('.service.spec.ts')) {
    // Fix wrong import path
    if (content.includes('from \'../../../test/utils/k8s-mocks\'')) {
      content = content.replace(
        /from '\.\.\/\.\.\/\.\.\/test\/utils\/k8s-mocks'/g,
        'from \'../../../../test/utils/k8s-mocks\'',
      )
      modified = true
    }

    // Remove duplicate imports
    const lines = content.split('\n')
    const importLines = lines.filter(line => line.includes('from \'../../../../test/utils/k8s-mocks\''))
    if (importLines.length > 1) {
      // Keep only the first import line and merge the imports
      const _firstImport = importLines[0]
      const allImports = []

      importLines.forEach((line) => {
        const match = line.match(/import\s*\{\s*([^}]+)\s*\}\s*from/)
        if (match) {
          const imports = match[1].split(',').map(imp => imp.trim())
          allImports.push(...imports)
        }
      })

      const uniqueImports = [...new Set(allImports)]
      const newImportLine = `import { ${uniqueImports.join(', ')} } from '../../../../test/utils/k8s-mocks';`

      // Remove all old import lines
      content = content.replace(/import\s*\{[^}]*\}\s*from\s*'\.\.\/\.\.\/\.\.\/\.\.\/test\/utils\/k8s-mocks';?\s*\n/g, '')

      // Add the new import line after the other imports
      const lines2 = content.split('\n')
      let insertIndex = 0
      for (let i = 0; i < lines2.length; i++) {
        if (lines2[i].startsWith('import '))
          insertIndex = i + 1
      }
      lines2.splice(insertIndex, 0, newImportLine)
      content = lines2.join('\n')

      modified = true
    }
  }

  // Fix controller test files - they need ../../../test/utils/k8s-mocks
  if (filePath.includes('.controller.spec.ts')) {
    // Fix wrong import path
    if (content.includes('from \'../../../test/utils/k8s-mocks\'')) {
      // This is already correct for controller files
    }
    else if (content.includes('from \'../../../../test/utils/k8s-mocks\'')) {
      content = content.replace(
        /from '\.\.\/\.\.\/\.\.\/\.\.\/test\/utils\/k8s-mocks'/g,
        'from \'../../../test/utils/k8s-mocks\'',
      )
      modified = true
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content)
    console.log(`Fixed imports in: ${filePath}`)
  }
  else {
    console.log(`No changes needed in: ${filePath}`)
  }
}

// Fix all service test files
console.log('Fixing service test files...')
serviceTestFiles.forEach(fixImportPaths)

// Fix all controller test files
console.log('Fixing controller test files...')
controllerTestFiles.forEach(fixImportPaths)

console.log('Done!')
