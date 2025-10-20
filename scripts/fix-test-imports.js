#!/usr/bin/env node

const fs = require('node:fs')
const glob = require('glob')

// Find all test files that import from the wrong path
const testFiles = glob.sync('src/**/*.spec.ts')

console.log(`Found ${testFiles.length} test files to check...`)

let fixedCount = 0

testFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8')

  // Fix the import path for k8s-mocks
  if (content.includes('from \'../../../test/utils/k8s-mocks\'')) {
    const fixedContent = content.replace(
      'from \'../../../test/utils/k8s-mocks\'',
      'from \'../../../../test/utils/k8s-mocks\'',
    )

    fs.writeFileSync(file, fixedContent)
    console.log(`Fixed import path in ${file}`)
    fixedCount++
  }

  // Fix the import path for nestjs-test.helper
  if (content.includes('from \'../../../test/utils/nestjs-test.helper\'')) {
    const fixedContent = content.replace(
      'from \'../../../test/utils/nestjs-test.helper\'',
      'from \'../../../../test/utils/nestjs-test.helper\'',
    )

    fs.writeFileSync(file, fixedContent)
    console.log(`Fixed import path in ${file}`)
    fixedCount++
  }
})

console.log(`Fixed ${fixedCount} files`)
