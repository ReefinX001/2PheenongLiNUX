#!/usr/bin/env node

/**
 * Fix All Syntax Errors
 * แก้ไข syntax errors ในไฟล์ HTML ทั้งหมด
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 แก้ไข Syntax Errors ในไฟล์ทั้งหมด...\n');

let totalFiles = 0;
let fixedFiles = 0;
let totalFixes = 0;

// ฟังก์ชันแก้ไขไฟล์แต่ละไฟล์
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fixes = 0;

    // Common syntax fixes
    const fixRules = [
      // Fix Swal.const syntax error
      {
        from: /Swal\.const loaderId = LoadingSystem\.show\(/g,
        to: 'const loaderId = LoadingSystem.show(',
        desc: 'Fix Swal.const syntax error'
      },

      // Fix extra single quotes at end of lines
      {
        from: /(\w+\.classList\.\w+\([^)]+\));'/g,
        to: '$1;',
        desc: 'Fix classList method quotes'
      },
      {
        from: /(localStorage\.setItem\([^)]+\));'/g,
        to: '$1;',
        desc: 'Fix localStorage quotes'
      },
      {
        from: /(const \w+ = [^;]+);'/g,
        to: '$1;',
        desc: 'Fix const declaration quotes'
      },
      {
        from: /(socket\.emit\([^)]+\));'/g,
        to: '$1;',
        desc: 'Fix socket.emit quotes'
      },
      {
        from: /(\w+\.textContent = [^;]+);'/g,
        to: '$1;',
        desc: 'Fix textContent quotes'
      },
      {
        from: /(document\.getElementById\([^)]+\));'/g,
        to: '$1;',
        desc: 'Fix getElementById quotes'
      },

      // Fix CSS quotes
      {
        from: "font-family: 'Prompt', 'Poppins', sans-serif;'",
        to: "font-family: 'Prompt', 'Poppins', sans-serif;",
        desc: 'Fix font-family quote'
      },
      {
        from: "content: '';'",
        to: "content: '';",
        desc: 'Fix content quote'
      },

      // Fix onclick quotes
      {
        from: /onclick="([^"]+)"'/g,
        to: 'onclick="$1"',
        desc: 'Fix onclick quotes'
      },

      // Fix if statement quotes
      {
        from: /if \([^)]+\) \{'/g,
        to: function(match) { return match.slice(0, -1); },
        desc: 'Fix if statement quotes'
      },

      // Fix method call quotes
      {
        from: /(\w+\.[a-zA-Z]+\([^)]*\));'/g,
        to: '$1;',
        desc: 'Fix method call quotes'
      }
    ];

    // Apply fixes
    fixRules.forEach(rule => {
      const beforeLength = content.length;
      if (typeof rule.from === 'string') {
        content = content.replace(new RegExp(rule.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), rule.to);
      } else {
        content = content.replace(rule.from, rule.to);
      }
      const afterLength = content.length;

      if (beforeLength !== afterLength) {
        fixes++;
      }
    });

    // Check if LoadingSystem is used but includes are missing
    if (content.includes('LoadingSystem.') && !content.includes('loading-system.js')) {
      const headIndex = content.indexOf('</head>');
      if (headIndex !== -1) {
        const jsInclude = '\n  <!-- Loading System -->\n  <script src="/js/loading-system.js"></script>\n\n';
        content = content.slice(0, headIndex) + jsInclude + content.slice(headIndex);
        fixes++;
        console.log(`   + Added LoadingSystem include`);
      }
    }

    // Save if there were changes
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      fixedFiles++;
      totalFixes += fixes;
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)} (${fixes} fixes)`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// หาไฟล์ HTML ทั้งหมด
const htmlFiles = glob.sync('views/**/*.html');
totalFiles = htmlFiles.length;

console.log(`📁 พบไฟล์ HTML: ${totalFiles} ไฟล์\n`);

// แก้ไขไฟล์ทีละไฟล์
htmlFiles.forEach((file, index) => {
  if (index < 50) { // จำกัดเพื่อไม่ให้ใช้เวลานาน
    fixFile(path.resolve(file));
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 สรุปผลการแก้ไข:');
console.log(`📂 ไฟล์ทั้งหมด:      ${totalFiles}`);
console.log(`🔧 ไฟล์ที่แก้ไข:     ${fixedFiles}`);
console.log(`✨ จำนวน fixes:      ${totalFixes}`);
console.log('='.repeat(60));

if (fixedFiles > 0) {
  console.log('\n💡 คำแนะนำ:');
  console.log('1. ทดสอบหน้าเว็บในเบราว์เซอร์');
  console.log('2. ตรวจสอบ Console errors');
  console.log('3. ทดสอบ LoadingSystem: test-loading.html');
  console.log('4. รีเฟรชหน้าเว็บหลังจากแก้ไข');
} else {
  console.log('\n✨ ไม่พบปัญหาที่ต้องแก้ไข');
}