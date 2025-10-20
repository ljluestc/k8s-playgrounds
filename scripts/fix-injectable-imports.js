const fs = require('fs');
const path = require('path');

// Find all controller files
const controllerFiles = [];
function findControllerFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findControllerFiles(filePath);
    } else if (file.endsWith('.controller.ts')) {
      controllerFiles.push(filePath);
    }
  }
}

findControllerFiles('src/backend/k8s');

// Fix each controller file
for (const filePath of controllerFiles) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file uses @Injectable() but doesn't import Injectable
    if (content.includes('@Injectable()') && !content.includes('Injectable,')) {
      console.log(`Fixing ${filePath}`);
      
      // Find the import statement from @nestjs/common
      const importMatch = content.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]@nestjs\/common['"]/);
      if (importMatch) {
        const imports = importMatch[1].split(',').map(imp => imp.trim());
        
        // Add Injectable if not already present
        if (!imports.includes('Injectable')) {
          imports.push('Injectable');
          imports.sort(); // Keep imports alphabetically sorted
          
          const newImport = `import {\n  ${imports.join(',\n  ')}\n} from '@nestjs/common'`;
          content = content.replace(importMatch[0], newImport);
          
          fs.writeFileSync(filePath, content);
          console.log(`  ✅ Added Injectable import`);
        } else {
          console.log(`  ⏭️  Injectable already imported`);
        }
      } else {
        console.log(`  ❌ No @nestjs/common import found`);
      }
    } else {
      console.log(`  ⏭️  No @Injectable() decorator found or Injectable already imported`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

console.log(`\n✅ Fixed Injectable imports in ${controllerFiles.length} controller files`);
