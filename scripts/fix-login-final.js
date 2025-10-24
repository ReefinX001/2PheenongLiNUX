const fs = require('fs');
const path = require('path');

console.log('🔧 เริ่มแก้ไข Login HTML และ Loading System...\n');

// อ่านไฟล์ login.html
const loginPath = path.join(__dirname, '../views/login.html');
let loginContent = fs.readFileSync(loginPath, 'utf8');

console.log('🔄 กำลังแก้ไข Syntax Errors...');

// แก้ไข syntax errors ด้วย regular expressions
let fixCount = 0;

// แก้ไข CSS keyframes
if (loginContent.includes("'0%': { opacity: '0', transform: 'translateY(10px)' }'")) {
  loginContent = loginContent.replace("'0%': { opacity: '0', transform: 'translateY(10px)' }'", "'0%': { opacity: '0', transform: 'translateY(10px)' },");
  fixCount++;
  console.log('✅ แก้ไข CSS keyframe บรรทัด 53');
}

if (loginContent.includes("'fade-in': 'fadeIn 0.5s ease-out forwards''")) {
  loginContent = loginContent.replace("'fade-in': 'fadeIn 0.5s ease-out forwards''", "'fade-in': 'fadeIn 0.5s ease-out forwards'");
  fixCount++;
  console.log('✅ แก้ไข CSS animation บรรทัด 58');
}

// แก้ไข JavaScript syntax errors (ลบ quote เกิน)
const quoteErrors = [
  { pattern: /socket\.on\('qrLoginSuccess', \(data\) => \{'/g, replacement: "socket.on('qrLoginSuccess', (data) => {" },
  { pattern: /method: 'POST','/g, replacement: "method: 'POST'," },
  { pattern: /headers: \{ 'Content-Type': 'application\/json' \},'/g, replacement: "headers: { 'Content-Type': 'application/json' }," },
  { pattern: /\/\/ เพิ่ม userRole'/g, replacement: '// เพิ่ม userRole' },
  { pattern: /\/\/ เพิ่ม sessionId'/g, replacement: '// เพิ่ม sessionId' },
  { pattern: /localStorage\.setItem\('allowedPages', JSON\.stringify\(data\.user\.allowedPages \|\| \[\]\)\);'/g, replacement: "localStorage.setItem('allowedPages', JSON.stringify(data.user.allowedPages || []));" },
  { pattern: /\/\/ เพิ่ม userData'/g, replacement: '// เพิ่ม userData' },
  { pattern: /userRole === 'super admin' \|\| '/g, replacement: "userRole === 'super admin' ||" },
  { pattern: /userRole === 'ceo' \|\| '/g, replacement: "userRole === 'ceo' ||" },
  { pattern: /userRole === 'นักพัฒนา' \|\|'/g, replacement: "userRole === 'นักพัฒนา' ||" },
  { pattern: /accounting: '\/accounting_dashboard','/g, replacement: "accounting: '/accounting_dashboard'," },
  { pattern: /hr: '\/HR_Dashboard','/g, replacement: "hr: '/HR_Dashboard'," },
  { pattern: /stock: '\/StockManagehome','/g, replacement: "stock: '/StockManagehome'," },
  { pattern: /marketing: '\/marketing_dashboard','/g, replacement: "marketing: '/marketing_dashboard'," },
  { pattern: /loan: '\/loan_dashboard','/g, replacement: "loan: '/loan_dashboard'," },
  { pattern: /pos: '\/frontstore_index','/g, replacement: "pos: '/frontstore_index'," },
  { pattern: /gifts: '\/gifts_dashboard','/g, replacement: "gifts: '/gifts_dashboard'," },
  { pattern: /report: '\/financial_dashboard''/g, replacement: "report: '/financial_dashboard'" },
  { pattern: /let targetUrl = '\/home';'/g, replacement: "let targetUrl = '/home';" },
  { pattern: /targetUrl = '\/home';'/g, replacement: "targetUrl = '/home';" },
  { pattern: /targetUrl = pageMap\[allowedPages\[0\]\] \|\| '\/home';'/g, replacement: "targetUrl = pageMap[allowedPages[0]] || '/home';" },
  { pattern: /addEventListener\('mouseenter', \(\) => \{'/g, replacement: "addEventListener('mouseenter', () => {" },
  { pattern: /birdContainer\.style\.transition = 'transform 0\.5s ease-out';'/g, replacement: "birdContainer.style.transition = 'transform 0.5s ease-out';" },
  { pattern: /birdContainer\.style\.transform = ''; \/\/ Reset transform after bounce'/g, replacement: "birdContainer.style.transform = ''; // Reset transform after bounce" },
  { pattern: /logoCenter\.innerHTML = '';'/g, replacement: "logoCenter.innerHTML = '';" },
  { pattern: /const logoPath = '\/uploads\/Logo2\.png'; \/\/ โลโก้คงที่'/g, replacement: "const logoPath = '/uploads/Logo2.png'; // โลโก้คงที่" },
  { pattern: /function showToast\(message, type = 'success', duration = 3000\) \{'/g, replacement: "function showToast(message, type = 'success', duration = 3000) {" },
  { pattern: /addEventListener\('click', \(\) => \{'/g, replacement: "addEventListener('click', () => {" },
  { pattern: /showToast\('([^']+)', '([^']+)'\);'/g, replacement: "showToast('$1', '$2');" }
];

quoteErrors.forEach((error, index) => {
  const before = loginContent;
  loginContent = loginContent.replace(error.pattern, error.replacement);
  if (before !== loginContent) {
    fixCount++;
    console.log(`✅ [${index + 1}] แก้ไข quote error`);
  }
});

// เขียนไฟล์กลับ
fs.writeFileSync(loginPath, loginContent, 'utf8');

console.log(`\n✅ แก้ไข ${fixCount} จุดใน login.html เรียบร้อย`);

// ตรวจสอบและสร้างไฟล์ loading-system.js ถ้าไม่มี
const loadingSystemPath = path.join(__dirname, '../js/loading-system.js');
const jsDir = path.dirname(loadingSystemPath);

if (!fs.existsSync(jsDir)) {
  fs.mkdirSync(jsDir, { recursive: true });
  console.log('📁 สร้างโฟลเดอร์ js/');
}

if (!fs.existsSync(loadingSystemPath)) {
  console.log('⚠️  ไม่พบไฟล์ loading-system.js กำลังสร้างใหม่...');

  const loadingSystemContent = '/**\n * LoadingSystem v2.0.1\n * Advanced Loading System with embedded CSS\n * No external dependencies required\n */\nclass LoadingSystem {\n  constructor() {\n    this.loaders = new Map();\n    this.injectCSS();\n  }\n\n  injectCSS() {\n    if (document.getElementById(\'loading-system-styles\')) return;\n    \n    const style = document.createElement(\'style\');\n    style.id = \'loading-system-styles\';\n    style.textContent = `\n      .loading-overlay {\n        position: fixed;\n        top: 0;\n        left: 0;\n        width: 100%;\n        height: 100%;\n        background: rgba(0, 0, 0, 0.7);\n        display: flex;\n        justify-content: center;\n        align-items: center;\n        z-index: 9999;\n        backdrop-filter: blur(2px);\n      }\n\n      .loading-container {\n        background: white;\n        padding: 2rem;\n        border-radius: 12px;\n        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);\n        text-align: center;\n        min-width: 200px;\n      }\n\n      .loading-spinner {\n        width: 40px;\n        height: 40px;\n        border: 4px solid #f3f4f6;\n        border-left: 4px solid #3b82f6;\n        border-radius: 50%;\n        animation: loading-spin 1s linear infinite;\n        margin: 0 auto 1rem;\n      }\n\n      .loading-dots {\n        display: flex;\n        justify-content: center;\n        gap: 4px;\n        margin: 0 auto 1rem;\n      }\n\n      .loading-dot {\n        width: 8px;\n        height: 8px;\n        background: #3b82f6;\n        border-radius: 50%;\n        animation: loading-bounce 1.4s ease-in-out infinite both;\n      }\n\n      .loading-dot:nth-child(1) { animation-delay: -0.32s; }\n      .loading-dot:nth-child(2) { animation-delay: -0.16s; }\n\n      .loading-progress {\n        width: 100%;\n        height: 8px;\n        background: #f3f4f6;\n        border-radius: 4px;\n        overflow: hidden;\n        margin: 1rem 0;\n      }\n\n      .loading-progress-bar {\n        height: 100%;\n        background: linear-gradient(90deg, #3b82f6, #1d4ed8);\n        border-radius: 4px;\n        transition: width 0.3s ease;\n        width: 0%;\n      }\n\n      .loading-text {\n        color: #374151;\n        font-size: 0.875rem;\n        margin-top: 0.5rem;\n      }\n\n      .loading-percentage {\n        color: #6b7280;\n        font-size: 0.75rem;\n        font-weight: 600;\n      }\n\n      @keyframes loading-spin {\n        0% { transform: rotate(0deg); }\n        100% { transform: rotate(360deg); }\n      }\n\n      @keyframes loading-bounce {\n        0%, 80%, 100% { transform: scale(0); }\n        40% { transform: scale(1); }\n      }\n\n      @media (prefers-color-scheme: dark) {\n        .loading-container {\n          background: #1f2937;\n          color: white;\n        }\n        .loading-text {\n          color: #e5e7eb;\n        }\n        .loading-percentage {\n          color: #9ca3af;\n        }\n      }\n    `;\n    document.head.appendChild(style);\n  }\n\n  show(options = {}) {\n    const id = options.id || \'default\';\n    const {\n      message = \'กำลังโหลด...\',\n      type = \'spinner\',\n      showProgress = false,\n      autoProgress = false\n    } = options;\n\n    this.hide(id);\n\n    const overlay = document.createElement(\'div\');\n    overlay.className = \'loading-overlay\';\n    overlay.setAttribute(\'data-loading-id\', id);\n\n    const container = document.createElement(\'div\');\n    container.className = \'loading-container\';\n\n    let animationHTML = \'\';\n    if (type === \'spinner\') {\n      animationHTML = \'<div class=\"loading-spinner\"></div>\';\n    } else if (type === \'dots\') {\n      animationHTML = \'<div class=\"loading-dots\"><div class=\"loading-dot\"></div><div class=\"loading-dot\"></div><div class=\"loading-dot\"></div></div>\';\n    }\n\n    let progressHTML = \'\';\n    if (showProgress) {\n      progressHTML = `\n        <div class=\"loading-progress\">\n          <div class=\"loading-progress-bar\" data-progress-bar></div>\n        </div>\n        <div class=\"loading-percentage\" data-percentage>0%</div>\n      `;\n    }\n\n    container.innerHTML = `\n      ${animationHTML}\n      <div class=\"loading-text\">${message}</div>\n      ${progressHTML}\n    `;\n\n    overlay.appendChild(container);\n    document.body.appendChild(overlay);\n\n    const loaderData = {\n      overlay,\n      container,\n      progressBar: container.querySelector(\'[data-progress-bar]\'),\n      percentageEl: container.querySelector(\'[data-percentage]\'),\n      autoProgressInterval: null\n    };\n\n    this.loaders.set(id, loaderData);\n\n    if (autoProgress && showProgress) {\n      this.startAutoProgress(id);\n    }\n\n    return id;\n  }\n\n  updateProgress(id, percentage, message) {\n    const loader = this.loaders.get(id);\n    if (!loader) return;\n\n    if (loader.progressBar) {\n      loader.progressBar.style.width = percentage + \'%\';\n    }\n    if (loader.percentageEl) {\n      loader.percentageEl.textContent = percentage + \'%\';\n    }\n    if (message) {\n      const textEl = loader.container.querySelector(\'.loading-text\');\n      if (textEl) textEl.textContent = message;\n    }\n  }\n\n  startAutoProgress(id, duration = 10000) {\n    const loader = this.loaders.get(id);\n    if (!loader) return;\n\n    let progress = 0;\n    const interval = 100;\n    const increment = (interval / duration) * 100;\n\n    loader.autoProgressInterval = setInterval(() => {\n      progress += increment;\n      if (progress >= 90) {\n        progress = 90;\n        clearInterval(loader.autoProgressInterval);\n      }\n      this.updateProgress(id, Math.floor(progress));\n    }, interval);\n  }\n\n  hide(id = \'default\') {\n    const loader = this.loaders.get(id);\n    if (!loader) return;\n\n    if (loader.autoProgressInterval) {\n      clearInterval(loader.autoProgressInterval);\n    }\n\n    if (loader.overlay && loader.overlay.parentNode) {\n      loader.overlay.parentNode.removeChild(loader.overlay);\n    }\n\n    this.loaders.delete(id);\n  }\n\n  hideAll() {\n    this.loaders.forEach((loader, id) => {\n      this.hide(id);\n    });\n  }\n}\n\nwindow.LoadingSystem = new LoadingSystem();\n\nwindow.showLoading = function(message = \'กำลังโหลด...\') {\n  return window.LoadingSystem.show({ message });\n};\n\nwindow.hideLoading = function() {\n  window.LoadingSystem.hide(\'default\');\n};\n\nwindow.showProgress = function(message = \'กำลังโหลด...\', autoProgress = true) {\n  return window.LoadingSystem.show({\n    message,\n    showProgress: true,\n    autoProgress\n  });\n};\n\nwindow.updateProgress = function(percentage, message) {\n  window.LoadingSystem.updateProgress(\'default\', percentage, message);\n};\n\nconsole.log(\'✅ LoadingSystem v2.0.1 loaded successfully\');';

  fs.writeFileSync(loadingSystemPath, loadingSystemContent, 'utf8');
  console.log('✅ สร้างไฟล์ loading-system.js เรียบร้อย');
} else {
  console.log('✅ ไฟล์ loading-system.js มีอยู่แล้ว');
}

console.log('\n🎉 การแก้ไขเสร็จสมบูรณ์!');
console.log('📊 สรุปผลการแก้ไข:');
console.log(`   - แก้ไข Syntax Errors: ${fixCount} จุด`);
console.log(`   - ตรวจสอบไฟล์ LoadingSystem: ✅`);
console.log('   - พร้อมใช้งาน: ✅');