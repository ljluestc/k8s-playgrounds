const fs = require('fs');
const path = require('path');

// Find all controller test files
const testFiles = [];
function findTestFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findTestFiles(filePath);
    } else if (file.endsWith('.controller.spec.ts')) {
      testFiles.push(filePath);
    }
  }
}

findTestFiles('src/backend/k8s');

// Fix each test file
for (const filePath of testFiles) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file uses describe/it but doesn't import them
    if (content.includes('describe(') && !content.includes('describe,')) {
      console.log(`Fixing ${filePath}`);
      
      // Find the vitest import
      const vitestMatch = content.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]vitest['"]/);
      if (vitestMatch) {
        const imports = vitestMatch[1].split(',').map(imp => imp.trim());
        
        // Add missing imports
        const requiredImports = ['describe', 'it', 'beforeEach', 'afterEach', 'expect'];
        for (const requiredImport of requiredImports) {
          if (content.includes(`${requiredImport}(`) && !imports.includes(requiredImport)) {
            imports.push(requiredImport);
          }
        }
        
        // Add vi if not already present
        if (!imports.includes('vi')) {
          imports.push('vi');
        }
        
        imports.sort(); // Keep imports alphabetically sorted
        
        const newImport = `import { ${imports.join(', ')} } from 'vitest'`;
        content = content.replace(vitestMatch[0], newImport);
      } else {
        // No vitest import found, add one
        const requiredImports = ['describe', 'it', 'beforeEach', 'afterEach', 'expect', 'vi'];
        const usedImports = [];
        for (const requiredImport of requiredImports) {
          if (content.includes(`${requiredImport}(`)) {
            usedImports.push(requiredImport);
          }
        }
        
        if (usedImports.length > 0) {
          const newImport = `import { ${usedImports.join(', ')} } from 'vitest'\n`;
          content = newImport + content;
        }
      }
      
      // Check if the file uses Test/TestingModule but doesn't import them
      if (content.includes('Test.createTestingModule') && !content.includes('Test,')) {
        const nestjsMatch = content.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]@nestjs\/testing['"]/);
        if (nestjsMatch) {
          const imports = nestjsMatch[1].split(',').map(imp => imp.trim());
          
          // Add missing imports
          const requiredImports = ['Test', 'TestingModule'];
          for (const requiredImport of requiredImports) {
            if (content.includes(requiredImport) && !imports.includes(requiredImport)) {
              imports.push(requiredImport);
            }
          }
          
          imports.sort(); // Keep imports alphabetically sorted
          
          const newImport = `import { ${imports.join(', ')} } from '@nestjs/testing'`;
          content = content.replace(nestjsMatch[0], newImport);
        } else {
          // No @nestjs/testing import found, add one
          const newImport = `import { Test, TestingModule } from '@nestjs/testing'\n`;
          content = newImport + content;
        }
      }
      
      fs.writeFileSync(filePath, content);
      console.log(`  ✅ Fixed imports`);
    } else {
      console.log(`  ⏭️  No describe/it found or already properly imported`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

console.log(`\n✅ Fixed imports in ${testFiles.length} controller test files`);
