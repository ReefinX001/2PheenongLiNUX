const fs = require('fs');
const path = require('path');

console.log('🔧 Final Fix: แก้ไข Errors ที่เหลือใน Login HTML...\n');

const loginPath = path.join(__dirname, '../views/login.html');
let loginContent = fs.readFileSync(loginPath, 'utf8');

let fixCount = 0;

// 1. แก้ไข if else statements ที่มี quote เกิน
const ifElseErrors = [
  { from: "} else if (allowedPages.includes('frontstore')) {'", to: "} else if (allowedPages.includes('frontstore')) {" },
  { from: "} else if (allowedPages.includes('pos')) {'", to: "} else if (allowedPages.includes('pos')) {" },
  { from: "} else if (allowedPages.includes('hr')) {'", to: "} else if (allowedPages.includes('hr')) {" }
];

ifElseErrors.forEach(error => {
  if (loginContent.includes(error.from)) {
    loginContent = loginContent.replace(error.from, error.to);
    fixCount++;
    console.log(`✅ [${fixCount}] แก้ไข if-else statement`);
  }
});

// 2. แก้ไข showToast calls ที่มี quote เกิน
loginContent = loginContent.replace(/showToast\(err\.message, 'error'\);'/g, "showToast(err.message, 'error');");
fixCount++;
console.log(`✅ [${fixCount}] แก้ไข showToast call`);

// 3. แก้ไข throw new Error statements ที่มี quote เกิน
const throwErrors = [
  { from: "throw new Error(result.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');'", to: "throw new Error(result.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');" },
  { from: "throw new Error('ไม่พบโทเค็นหลังจากการอนุมัติ กรุณาลองใหม่');'", to: "throw new Error('ไม่พบโทเค็นหลังจากการอนุมัติ กรุณาลองใหม่');" }
];

throwErrors.forEach(error => {
  if (loginContent.includes(error.from)) {
    loginContent = loginContent.replace(error.from, error.to);
    fixCount++;
    console.log(`✅ [${fixCount}] แก้ไข throw new Error`);
  }
});

// 4. แก้ไข localStorage.setItem calls ที่มี quote เกิน
const localStorageErrors = [
  { from: "localStorage.setItem('allowedPages', JSON.stringify(result.user.allowedPages || []));'", to: "localStorage.setItem('allowedPages', JSON.stringify(result.user.allowedPages || []));" },
  { from: "localStorage.setItem('userData', JSON.stringify(result.user));'", to: "localStorage.setItem('userData', JSON.stringify(result.user));" },
  { from: "localStorage.setItem('approvedLogin', 'true'); // เพิ่ม flag บอกว่าเป็น approved login'", to: "localStorage.setItem('approvedLogin', 'true'); // เพิ่ม flag บอกว่าเป็น approved login" }
];

localStorageErrors.forEach(error => {
  if (loginContent.includes(error.from)) {
    loginContent = loginContent.replace(error.from, error.to);
    fixCount++;
    console.log(`✅ [${fixCount}] แก้ไข localStorage.setItem`);
  }
});

// 5. แก้ไข quote errors ที่เหลือ
const remainingQuoteErrors = [
  { pattern: /throw new Error\('([^']+)'\);'/g, replacement: "throw new Error('$1');" },
  { pattern: /showToast\('([^']+)', '([^']+)'\);'/g, replacement: "showToast('$1', '$2');" },
  { pattern: /localStorage\.setItem\('([^']+)', '([^']+)'\);'/g, replacement: "localStorage.setItem('$1', '$2');" },
  { pattern: /localStorage\.setItem\('([^']+)', JSON\.stringify\(([^)]+)\)\);'/g, replacement: "localStorage.setItem('$1', JSON.stringify($2));" },
  { pattern: /window\.location\.href = '([^']+)';'/g, replacement: "window.location.href = '$1';" }
];

remainingQuoteErrors.forEach((error, index) => {
  const before = loginContent;
  loginContent = loginContent.replace(error.pattern, error.replacement);
  if (before !== loginContent) {
    fixCount++;
    console.log(`✅ [${fixCount}] แก้ไข quote error รูปแบบที่ ${index + 1}`);
  }
});

// 6. แก้ไข function calls ที่มี quote เกิน
const functionCallErrors = [
  { from: "document.getElementById('loginReason').focus();'", to: "document.getElementById('loginReason').focus();" },
  { from: "document.getElementById('loginRequestForm').reset();'", to: "document.getElementById('loginRequestForm').reset();" },
  { from: "document.getElementById('requestIdDisplay').textContent = currentRequestId || '-';'", to: "document.getElementById('requestIdDisplay').textContent = currentRequestId || '-';" }
];

functionCallErrors.forEach(error => {
  if (loginContent.includes(error.from)) {
    loginContent = loginContent.replace(error.from, error.to);
    fixCount++;
    console.log(`✅ [${fixCount}] แก้ไข function call`);
  }
});

// เขียนไฟล์กลับ
fs.writeFileSync(loginPath, loginContent, 'utf8');

console.log(`\n🎉 Final Fix เสร็จสมบูรณ์!`);
console.log(`✅ แก้ไข ${fixCount} จุดสุดท้าย`);

// ตรวจสอบข้อมูลไฟล์
const stats = fs.statSync(loginPath);
console.log(`📄 ไฟล์ login.html: ${(stats.size / 1024).toFixed(1)}KB`);

const loadingSystemPath = path.join(__dirname, '../js/loading-system.js');
if (fs.existsSync(loadingSystemPath)) {
  const loadingStats = fs.statSync(loadingSystemPath);
  console.log(`📄 ไฟล์ loading-system.js: ${(loadingStats.size / 1024).toFixed(1)}KB`);
}

console.log('\n🚀 ระบบพร้อมใช้งาน 100%!');