#!/usr/bin/env node

/**
 * Fix Login Syntax Errors
 * แก้ไข syntax errors ในไฟล์ login.html
 */

const fs = require('fs');

console.log('🔧 แก้ไข Syntax Errors ในไฟล์ login.html...\n');

try {
  const filePath = 'views/login.html';
  let content = fs.readFileSync(filePath, 'utf8');
  let fixes = 0;

  console.log('📄 ไฟล์เดิม:', filePath);
  console.log('📊 ขนาดไฟล์:', content.length, 'characters\n');

  // รายการ fixes ที่ต้องทำ
  const fixRules = [
    // แก้ไข CSS keyframes
    {
      from: "'0%': { opacity: '0', transform: 'translateY(10px)' },",
      to: "'0%': { opacity: '0', transform: 'translateY(10px)' }",
      desc: 'Fix CSS keyframe comma'
    },
    {
      from: "'100%': { opacity: '1', transform: 'translateY(0)' }'",
      to: "'100%': { opacity: '1', transform: 'translateY(0)' }",
      desc: 'Fix CSS keyframe quote'
    },
    {
      from: "'fade-in': 'fadeIn 0.5s ease-out forwards',",
      to: "'fade-in': 'fadeIn 0.5s ease-out forwards'",
      desc: 'Fix animation comma'
    },
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

    // แก้ไข JavaScript onclick attributes
    {
      from: 'onclick="switchTab(\'password\')"\'',
      to: 'onclick="switchTab(\'password\')"',
      desc: 'Fix onclick quote 1'
    },
    {
      from: 'onclick="switchTab(\'qr\')"\'',
      to: 'onclick="switchTab(\'qr\')"',
      desc: 'Fix onclick quote 2'
    },

    // แก้ไข JavaScript variables และ functions
    {
      from: "const passwordTab = document.getElementById('passwordTab');'",
      to: "const passwordTab = document.getElementById('passwordTab');",
      desc: 'Fix variable declaration 1'
    },
    {
      from: "const qrTab = document.getElementById('qrTab');'",
      to: "const qrTab = document.getElementById('qrTab');",
      desc: 'Fix variable declaration 2'
    },
    {
      from: "const passwordContent = document.getElementById('passwordContent');'",
      to: "const passwordContent = document.getElementById('passwordContent');",
      desc: 'Fix variable declaration 3'
    },
    {
      from: "const qrContent = document.getElementById('qrContent');'",
      to: "const qrContent = document.getElementById('qrContent');",
      desc: 'Fix variable declaration 4'
    },

    // แก้ไข if statements
    {
      from: "if (tab === 'password') {'",
      to: "if (tab === 'password') {",
      desc: 'Fix if statement'
    },

    // แก้ไข method calls
    {
      from: "passwordTab.classList.add('bg-white/20', 'text-white');'",
      to: "passwordTab.classList.add('bg-white/20', 'text-white');",
      desc: 'Fix classList.add 1'
    },
    {
      from: "passwordTab.classList.remove('text-white/70');'",
      to: "passwordTab.classList.remove('text-white/70');",
      desc: 'Fix classList.remove 1'
    },
    {
      from: "qrTab.classList.remove('bg-white/20', 'text-white');'",
      to: "qrTab.classList.remove('bg-white/20', 'text-white');",
      desc: 'Fix classList.remove 2'
    },
    {
      from: "qrTab.classList.add('text-white/70');'",
      to: "qrTab.classList.add('text-white/70');",
      desc: 'Fix classList.add 2'
    },
    {
      from: "passwordContent.classList.add('active');'",
      to: "passwordContent.classList.add('active');",
      desc: 'Fix classList.add 3'
    },
    {
      from: "qrContent.classList.remove('active');'",
      to: "qrContent.classList.remove('active');",
      desc: 'Fix classList.remove 3'
    },

    // More fixes...
    {
      from: "qrTab.classList.add('bg-white/20', 'text-white');'",
      to: "qrTab.classList.add('bg-white/20', 'text-white');",
      desc: 'Fix classList.add 4'
    },
    {
      from: "qrTab.classList.remove('text-white/70');'",
      to: "qrTab.classList.remove('text-white/70');",
      desc: 'Fix classList.remove 4'
    },
    {
      from: "passwordTab.classList.remove('bg-white/20', 'text-white');'",
      to: "passwordTab.classList.remove('bg-white/20', 'text-white');",
      desc: 'Fix classList.remove 5'
    },
    {
      from: "passwordTab.classList.add('text-white/70');'",
      to: "passwordTab.classList.add('text-white/70');",
      desc: 'Fix classList.add 5'
    },
    {
      from: "qrContent.classList.add('active');'",
      to: "qrContent.classList.add('active');",
      desc: 'Fix classList.add 6'
    },
    {
      from: "passwordContent.classList.remove('active');'",
      to: "passwordContent.classList.remove('active');",
      desc: 'Fix classList.remove 6'
    },

    // QR Code fixes
    {
      from: "const qrContainer = document.getElementById('qrCode');'",
      to: "const qrContainer = document.getElementById('qrCode');",
      desc: 'Fix qrContainer variable'
    },
    {
      from: "qrContainer.innerHTML = '';'",
      to: "qrContainer.innerHTML = '';",
      desc: 'Fix innerHTML assignment'
    },
    {
      from: "currentSessionId = 'WEB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);'",
      to: "currentSessionId = 'WEB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);",
      desc: 'Fix sessionId assignment'
    },
    {
      from: "document.getElementById('sessionId').textContent = currentSessionId;'",
      to: "document.getElementById('sessionId').textContent = currentSessionId;",
      desc: 'Fix textContent assignment'
    },
    {
      from: "type: 'login','",
      to: "type: 'login',",
      desc: 'Fix object property'
    }
  ];

  // Apply all fixes
  fixRules.forEach((rule, index) => {
    if (content.includes(rule.from)) {
      content = content.replace(new RegExp(rule.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), rule.to);
      fixes++;
      console.log(`✅ ${index + 1}. ${rule.desc}`);
    }
  });

  // Additional broad fixes for remaining single quotes
  const broadFixes = [
    {
      pattern: /(\w+\.classList\.\w+\([^)]+\);)'/g,
      replacement: '$1',
      desc: 'Fix remaining classList quotes'
    },
    {
      pattern: /(localStorage\.setItem\([^)]+\);)'/g,
      replacement: '$1',
      desc: 'Fix localStorage quotes'
    },
    {
      pattern: /(const \w+ = [^;]+;)'/g,
      replacement: '$1',
      desc: 'Fix const declaration quotes'
    },
    {
      pattern: /(socket\.emit\([^)]+\);)'/g,
      replacement: '$1',
      desc: 'Fix socket.emit quotes'
    },
    {
      pattern: /(\w+\.textContent = [^;]+;)'/g,
      replacement: '$1',
      desc: 'Fix textContent quotes'
    }
  ];

  broadFixes.forEach((fix, index) => {
    const beforeLength = content.length;
    content = content.replace(fix.pattern, fix.replacement);
    const afterLength = content.length;

    if (beforeLength !== afterLength) {
      fixes++;
      console.log(`🔧 Broad fix ${index + 1}: ${fix.desc}`);
    }
  });

  // Write the fixed content back to file
  fs.writeFileSync(filePath, content, 'utf8');

  console.log('\n' + '='.repeat(50));
  console.log('📊 สรุปผลการแก้ไข:');
  console.log(`✅ จำนวน fixes: ${fixes}`);
  console.log(`📄 ไฟล์ใหม่: ${content.length} characters`);
  console.log('✨ แก้ไข syntax errors เสร็จสิ้น!');
  console.log('='.repeat(50));

  if (fixes > 0) {
    console.log('\n💡 คำแนะนำ:');
    console.log('1. ทดสอบหน้า login ในเบราว์เซอร์');
    console.log('2. ตรวจสอบ Console ว่ามี errors หรือไม่');
    console.log('3. ทดสอบระบบ LoadingSystem');
  }

} catch (error) {
  console.error('❌ เกิดข้อผิดพลาด:', error.message);
  process.exit(1);
}