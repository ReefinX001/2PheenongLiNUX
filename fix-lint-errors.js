const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Getting list of files with Unterminated string errors...');

// Get lint output
let lintOutput;
try {
  execSync('npm run lint', { encoding: 'utf-8', stdio: 'pipe' });
} catch (error) {
  lintOutput = error.stdout || error.stderr;
}

// Parse errors
const errorPattern = /^(.+\.(?:html|js))[\s\S]*?(\d+):(\d+)\s+error\s+Parsing error: Unterminated string constant/gm;
const errors = [];
let match;

while ((match = errorPattern.exec(lintOutput)) !== null) {
  const [, filePath, line] = match;
  errors.push({ file: filePath.trim(), line: parseInt(line) });
}

console.log(`Found ${errors.length} unterminated string errors`);

// Group by file
const fileErrors = {};
errors.forEach(({ file, line }) => {
  if (!fileErrors[file]) fileErrors[file] = [];
  fileErrors[file].push(line);
});

let fixedCount = 0;

// Fix each file
Object.entries(fileErrors).forEach(([file, lines]) => {
  const fullPath = path.resolve(file);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;
    const contentLines = content.split('\n');

    // Sort lines in descending order to avoid line number shifts
    lines.sort((a, b) => b - a);

    lines.forEach(lineNum => {
      const lineIndex = lineNum - 1;
      if (lineIndex >= 0 && lineIndex < contentLines.length) {
        let line = contentLines[lineIndex];

        // Pattern 1: Remove trailing quote after arrow function: () => {' -> () => {
        line = line.replace(/(\(\s*\)\s*=>\s*\{)'/g, '$1');
        line = line.replace(/(\([^)]*\)\s*=>\s*\{)'/g, '$1');
        line = line.replace(/(function\s*\([^)]*\)\s*\{)'/g, '$1');

        // Pattern 2: Remove trailing quote and comma after string: 'text', -> 'text'
        line = line.replace(/(['"])([^'"]*)\1,'/g, "$1$2$1");

        // Pattern 3: Remove duplicate quotes: 'text'' -> 'text'
        line = line.replace(/(['"])([^'"]*)\1'/g, "$1$2$1");

        // Pattern 4: Remove trailing quote after semicolon: );' -> );
        line = line.replace(/\);'/g, ');');

        // Pattern 5: Remove trailing quote after closing bracket: ],' -> ]
        line = line.replace(/\],'/g, ']');

        // Pattern 6: Remove trailing quote after statement: .method();' -> .method();
        line = line.replace(/;'/g, ';');

        contentLines[lineIndex] = line;
      }
    });

    const newContent = contentLines.join('\n');

    if (newContent !== originalContent) {
      fs.writeFileSync(fullPath, newContent, 'utf-8');
      fixedCount++;
      console.log(`✅ Fixed ${file} (${lines.length} issues)`);
    }
  } catch (error) {
    console.log(`❌ Error fixing ${file}:`, error.message);
  }
});

console.log(`\n✨ Fixed ${fixedCount} files`);
console.log('\n🔄 Running lint again to check results...');

try {
  execSync('npm run lint', { encoding: 'utf-8', stdio: 'inherit' });
} catch (error) {
  // Lint will exit with error code if there are still issues
}
