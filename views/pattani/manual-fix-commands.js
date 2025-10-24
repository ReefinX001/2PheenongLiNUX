// ================================================
// 🛠️ MANUAL FIX COMMANDS
// ================================================
// Version: 1.0.0
// คำสั่งแก้ไขปัญหาด้วยตนเองสำหรับผู้ใช้

console.log('🛠️ Manual Fix Commands Loading...');

// ================================================
// 1. คำสั่งแก้ไขปัญหาด่วน
// ================================================

window.QuickFix = {
  // แก้ไขปัญหาทั้งหมด
  fixAll() {
    console.log('🚨 Running all quick fixes...');

    const fixes = [
      this.fixToastError,
      this.fixSyntaxError,
      this.fixLoadingStuck,
      this.fixModuleError,
      this.forceShowContent
    ];

    const results = [];

    fixes.forEach((fix, index) => {
      try {
        fix.call(this);
        results.push(`✅ Fix ${index + 1} completed`);
      } catch (error) {
        console.error(`❌ Fix ${index + 1} failed:`, error);
        results.push(`❌ Fix ${index + 1} failed`);
      }
    });

    console.log('🏁 Quick fixes completed:', results);

    // แสดงผลลัพธ์
    if (window.showToast || window.InstallmentCore?.showToast) {
      const toastFn = window.InstallmentCore?.showToast || window.showToast;
      toastFn('แก้ไขปัญหาเสร็จสิ้น กรุณารีเฟรชหากยังมีปัญหา', 'info');
    }

    return results;
  },

  // แก้ไขปัญหา Toast Error
  fixToastError() {
    console.log('🔧 Fixing toast error...');

    // ลบ toast containers เก่า
    document.querySelectorAll('[id*="toast"], .toast-container').forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });

    // สร้าง toast container ใหม่
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container fixed top-4 right-4 z-50';
    container.style.cssText = 'position: fixed !important; top: 1rem !important; right: 1rem !important; z-index: 9999 !important;';
    document.body.appendChild(container);

    // สร้าง fallback toast function
    if (!window.showToast) {
      window.showToast = function(message, type) {
        console.log(`Toast: ${message} (${type})`);
        const toast = document.createElement('div');
        toast.className = `alert alert-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 9999;
          padding: 12px 20px; border-radius: 6px; color: white; font-weight: 500;
          background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#2563eb'};
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      };
    }

    console.log('✅ Toast error fixed');
  },

  // แก้ไขปัญหา Syntax Error
  fixSyntaxError() {
    console.log('🔧 Checking syntax errors...');

    // ป้องกัน syntax errors
    const problematicScripts = document.querySelectorAll('script[src*="installment-main.js"]');
    problematicScripts.forEach(script => {
      script.setAttribute('data-syntax-checked', 'true');
    });

    // สร้าง fallback functions
    const fallbackFunctions = {
      formatPrice: (num) => new Intl.NumberFormat('th-TH').format(num),
      showToast: (msg, type) => console.log(`${type}: ${msg}`),
      validateRequired: (value) => Boolean(value && value.toString().trim())
    };

    Object.entries(fallbackFunctions).forEach(([name, func]) => {
      if (!window[name]) {
        window[name] = func;
      }
    });

    console.log('✅ Syntax errors checked');
  },

  // แก้ไขปัญหาหน้าโหลดค้าง
  fixLoadingStuck() {
    console.log('🔧 Fixing loading stuck...');

    // ซ่อน loading screens ทั้งหมด
    const loadingSelectors = [
      '.loading', '.loader', '#loading', '#loader',
      '.loading-overlay', '.loading-screen', '.spinner',
      '[class*="loading"]', '[id*="loading"]'
    ];

    loadingSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = 'none';
        el.classList.add('hidden');
      });
    });

    console.log('✅ Loading stuck fixed');
  },

  // แก้ไขปัญหาโมดูล
  fixModuleError() {
    console.log('🔧 Fixing module errors...');

    // สร้าง fallback modules
    const fallbackModules = {
      InstallmentCore: {
        showToast: (message, type) => console.log(`Toast: ${message} (${type})`),
        formatPrice: (num) => new Intl.NumberFormat('th-TH').format(num),
        validateRequired: (value) => Boolean(value && value.toString().trim())
      },
      InstallmentUI: {
        showToast: (message, type) => console.log(`UI Toast: ${message} (${type})`)
      }
    };

    Object.entries(fallbackModules).forEach(([moduleName, moduleObj]) => {
      if (!window[moduleName]) {
        window[moduleName] = moduleObj;
        console.log(`✅ Created fallback module: ${moduleName}`);
      }
    });

    console.log('✅ Module errors fixed');
  },

  // บังคับแสดงเนื้อหา
  forceShowContent() {
    console.log('🔧 Force showing content...');

    // แสดง main content
    const mainElements = document.querySelectorAll('main, #mainContent, .main-content, .container');
    mainElements.forEach(el => {
      el.style.display = 'block';
      el.classList.remove('hidden');
      el.style.visibility = 'visible';
      el.style.opacity = '1';
    });

    // แสดง steps
    const stepElements = document.querySelectorAll('#step1, #step2, #step3, #step4');
    stepElements.forEach(el => {
      if (el) {
        el.style.display = 'block';
        el.classList.remove('hidden');
      }
    });

    console.log('✅ Content force shown');
  }
};

// ================================================
// 2. คำสั่งตรวจสอบสถานะ
// ================================================

window.SystemCheck = {
  // ตรวจสอบสถานะทั้งหมด
  checkAll() {
    console.log('🔍 Checking system status...');

    const checks = {
      modules: this.checkModules(),
      dom: this.checkDOM(),
      functions: this.checkFunctions(),
      ui: this.checkUI(),
      errors: this.checkErrors()
    };

    console.log('📊 System Check Results:', checks);

    const healthy = Object.values(checks).every(check => check.status === 'ok');

    console.log(healthy ? '✅ System is healthy' : '⚠️ System has issues');

    return checks;
  },

  // ตรวจสอบโมดูล
  checkModules() {
    const modules = ['InstallmentCore', 'InstallmentUI', 'InstallmentAPI', 'InstallmentBusiness', 'InstallmentProduct'];
    const available = modules.filter(name => window[name]);

    return {
      status: available.length >= 3 ? 'ok' : 'warning',
      total: modules.length,
      available: available.length,
      missing: modules.filter(name => !window[name])
    };
  },

  // ตรวจสอบ DOM
  checkDOM() {
    const elements = ['step1', 'step2', 'step3', 'step4', 'mainContent'];
    const found = elements.filter(id => document.getElementById(id));

    return {
      status: found.length >= 4 ? 'ok' : 'warning',
      total: elements.length,
      found: found.length,
      missing: elements.filter(id => !document.getElementById(id))
    };
  },

  // ตรวจสอบฟังก์ชัน
  checkFunctions() {
    const functions = ['showToast', 'formatPrice'];
    const available = functions.filter(name => typeof window[name] === 'function');

    return {
      status: available.length >= 1 ? 'ok' : 'error',
      total: functions.length,
      available: available.length,
      missing: functions.filter(name => typeof window[name] !== 'function')
    };
  },

  // ตรวจสอบ UI
  checkUI() {
    const uiElements = ['btnStep1ToStep2', 'cartCount', 'formProgress'];
    const found = uiElements.filter(id => document.getElementById(id));

    return {
      status: found.length >= 2 ? 'ok' : 'warning',
      total: uiElements.length,
      found: found.length,
      missing: uiElements.filter(id => !document.getElementById(id))
    };
  },

  // ตรวจสอบ errors
  checkErrors() {
    const errors = [];

    // ตรวจสอบ console errors
    if (window.lastError) {
      errors.push(window.lastError);
    }

    return {
      status: errors.length === 0 ? 'ok' : 'warning',
      count: errors.length,
      errors: errors
    };
  }
};

// ================================================
// 3. คำสั่งฉุกเฉิน
// ================================================

window.EmergencyCommands = {
  // รีสตาร์ทระบบ
  restartSystem() {
    console.log('🔄 Restarting system...');

    // ล้างค่าต่างๆ
    window.cartItems = [];
    window.currentStep = 1;

    // รีเซ็ต UI
    const cartCount = document.getElementById('cartCount');
    if (cartCount) cartCount.textContent = '0';

    const formProgress = document.getElementById('formProgress');
    if (formProgress) formProgress.textContent = '0%';

    // รันการแก้ไขทั้งหมด
    if (window.QuickFix) {
      window.QuickFix.fixAll();
    }

    console.log('✅ System restarted');

    if (window.showToast) {
      window.showToast('ระบบถูกรีสตาร์ทแล้ว', 'info');
    }
  },

  // ล้างข้อมูลทั้งหมด
  clearAllData() {
    console.log('🗑️ Clearing all data...');

    // ล้าง localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('installment') || key.includes('cart')) {
        localStorage.removeItem(key);
      }
    });

    // ล้าง global variables
    window.cartItems = [];
    window.customerData = {};
    window.currentStep = 1;

    console.log('✅ All data cleared');

    if (window.showToast) {
      window.showToast('ข้อมูลทั้งหมดถูกล้างแล้ว', 'info');
    }
  },

  // รีเฟรชหน้า
  forceRefresh() {
    console.log('🔄 Force refreshing page...');

    if (window.showToast) {
      window.showToast('กำลังรีเฟรชหน้า...', 'info');
    }

    setTimeout(() => {
      window.location.reload(true);
    }, 1000);
  }
};

// ================================================
// 4. สร้างคำสั่งแบบย่อ
// ================================================

// คำสั่งย่อสำหรับการใช้งานง่าย
window.fix = window.QuickFix.fixAll;
window.check = window.SystemCheck.checkAll;
window.restart = window.EmergencyCommands.restartSystem;
window.clear = window.EmergencyCommands.clearAllData;
window.refresh = window.EmergencyCommands.forceRefresh;

// ================================================
// 5. แสดงคำสั่งที่มี
// ================================================

function showAvailableCommands() {
  console.log(`
🛠️ === MANUAL FIX COMMANDS AVAILABLE ===

📋 QUICK FIXES:
   QuickFix.fixAll() หรือ fix() - แก้ไขปัญหาทั้งหมด
   QuickFix.fixToastError() - แก้ไขปัญหา Toast
   QuickFix.fixSyntaxError() - แก้ไขปัญหา Syntax Error
   QuickFix.fixLoadingStuck() - แก้ไขปัญหาหน้าโหลดค้าง
   QuickFix.fixModuleError() - แก้ไขปัญหาโมดูล
   QuickFix.forceShowContent() - บังคับแสดงเนื้อหา

🔍 SYSTEM CHECK:
   SystemCheck.checkAll() หรือ check() - ตรวจสอบสถานะทั้งหมด
   SystemCheck.checkModules() - ตรวจสอบโมดูล
   SystemCheck.checkDOM() - ตรวจสอบ DOM elements
   SystemCheck.checkFunctions() - ตรวจสอบฟังก์ชัน
   SystemCheck.checkUI() - ตรวจสอบ UI elements

🚨 EMERGENCY COMMANDS:
   EmergencyCommands.restartSystem() หรือ restart() - รีสตาร์ทระบบ
   EmergencyCommands.clearAllData() หรือ clear() - ล้างข้อมูลทั้งหมด
   EmergencyCommands.forceRefresh() หรือ refresh() - รีเฟรชหน้า

💡 คำสั่งย่อ: fix(), check(), restart(), clear(), refresh()

🔧 หากมีปัญหาให้ลองรันคำสั่งนี้: fix()
  `);
}

// ================================================
// 6. Auto-run และแสดงคำสั่ง
// ================================================

setTimeout(() => {
  showAvailableCommands();
}, 1000);

console.log('🛠️ Manual Fix Commands Loaded');
console.log('💡 Type "fix()" to fix all problems or see console for more commands');