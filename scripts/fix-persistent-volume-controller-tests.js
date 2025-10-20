const fs = require('node:fs')
const _path = require('node:path')

const filePath = 'src/backend/k8s/PersistentVolume/PersistentVolume.controller.spec.ts'

console.log('Fixing PersistentVolume controller tests...')

let content = fs.readFileSync(filePath, 'utf8')

// Replace all k8sService.persistentVolumeService with persistentVolumeService
content = content.replace(/k8sService\.persistentVolumeService/g, 'persistentVolumeService')

// Replace vi.spyOn patterns
content = content.replace(/vi\.spyOn\(k8sService\.persistentVolumeService, '(\w+)'\)/g, 'persistentVolumeService.$1')

// Replace expect patterns
content = content.replace(/expect\(k8sService\.persistentVolumeService\.(\w+)\)/g, 'expect(persistentVolumeService.$1)')

fs.writeFileSync(filePath, content)

console.log('Fixed PersistentVolume controller tests!')
