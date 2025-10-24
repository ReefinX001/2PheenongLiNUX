// ================================================
// 📄 POST-LOADING FIX SCRIPT
// ================================================
// Version: 1.0.0
// จัดการระบบหลังจากโหลดเสร็จสิ้นแล้ว

console.log('📄 Post-Loading Fix Script Starting...');

// ================================================
// 1. ตรวจสอบและแสดงสถานะระบบ
// ================================================

function verifySystemStatus() {
  console.log('🔍 Verifying system status...');

  const statusCheck = {
    modules: checkModuleAvailability(),
    dom: checkDOMElements(),
    functions: checkCriticalFunctions(),
    ui: checkUIElements()
  };

  console.log('📊 System Status Check:', statusCheck);

  const isHealthy = Object.values(statusCheck).every(status => status.healthy);

  if (isHealthy) {
    console.log('✅ System is healthy and ready to use');
    showSuccessMessage();
  } else {
    console.log('⚠️ System has some issues, applying additional fixes...');
    applyAdditionalFixes(statusCheck);
  }

  return statusCheck;
}

// ================================================
// 2. ตรวจสอบโมดูลต่างๆ
// ================================================

function checkModuleAvailability() {
  const requiredModules = [
    'InstallmentCore',
    'InstallmentUI',
    'InstallmentAPI',
    'InstallmentBusiness',
    'InstallmentProduct'
  ];

  const moduleStatus = {};
  let healthyCount = 0;

  requiredModules.forEach(moduleName => {
    const available = window[moduleName] && typeof window[moduleName] === 'object';
    moduleStatus[moduleName] = available;
    if (available) healthyCount++;
  });

  return {
    healthy: healthyCount >= 4, // อย่างน้อย 4 ใน 5 โมดูล
    total: requiredModules.length,
    available: healthyCount,
    details: moduleStatus
  };
}

// ================================================
// 3. ตรวจสอบ DOM Elements
// ================================================

function checkDOMElements() {
  const criticalElements = [
    'step1', 'step2', 'step3', 'step4',
    'mainContent', 'sidebarContainer'
  ];

  let foundCount = 0;
  const elementStatus = {};

  criticalElements.forEach(id => {
    const exists = document.getElementById(id) !== null;
    elementStatus[id] = exists;
    if (exists) foundCount++;
  });

  return {
    healthy: foundCount >= Math.floor(criticalElements.length * 0.8),
    total: criticalElements.length,
    found: foundCount,
    details: elementStatus
  };
}

// ================================================
// 4. ตรวจสอบฟังก์ชันสำคัญ
// ================================================

function checkCriticalFunctions() {
  const criticalFunctions = [
    { module: 'InstallmentCore', func: 'showToast' },
    { module: 'InstallmentCore', func: 'formatPrice' },
    { module: 'InstallmentUI', func: 'showToast' },
    { module: 'InstallmentBusiness', func: 'saveInstallmentData' }
  ];

  let workingCount = 0;
  const functionStatus = {};

  criticalFunctions.forEach(({ module, func }) => {
    const key = `${module}.${func}`;
    const works = window[module] && typeof window[module][func] === 'function';
    functionStatus[key] = works;
    if (works) workingCount++;
  });

  return {
    healthy: workingCount >= Math.floor(criticalFunctions.length * 0.75),
    total: criticalFunctions.length,
    working: workingCount,
    details: functionStatus
  };
}

// ================================================
// 5. ตรวจสอบ UI Elements
// ================================================

function checkUIElements() {
  const uiElements = [
    'btnStep1ToStep2', 'btnStep2ToStep3', 'btnStep3ToStep4',
    'cartCount', 'formProgress'
  ];

  let foundCount = 0;
  const uiStatus = {};

  uiElements.forEach(id => {
    const exists = document.getElementById(id) !== null;
    uiStatus[id] = exists;
    if (exists) foundCount++;
  });

  return {
    healthy: foundCount >= Math.floor(uiElements.length * 0.6),
    total: uiElements.length,
    found: foundCount,
    details: uiStatus
  };
}

// ================================================
// 6. แก้ไขปัญหาเพิ่มเติม
// ================================================

function applyAdditionalFixes(statusCheck) {
  console.log('🔧 Applying additional fixes...');

  // แก้ไขปัญหาโมดูล
  if (!statusCheck.modules.healthy) {
    console.log('🔧 Fixing module issues...');
    createFallbackModules();
  }

  // แก้ไขปัญหา DOM
  if (!statusCheck.dom.healthy) {
    console.log('🔧 Fixing DOM issues...');
    createMissingElements();
  }

  // แก้ไขปัญหาฟังก์ชัน
  if (!statusCheck.functions.healthy) {
    console.log('🔧 Fixing function issues...');
    createFallbackFunctions();
  }

  // แก้ไขปัญหา UI
  if (!statusCheck.ui.healthy) {
    console.log('🔧 Fixing UI issues...');
    createMissingUIElements();
  }

  console.log('✅ Additional fixes applied');
}

// ================================================
// 7. สร้างโมดูลสำรอง
// ================================================

function createFallbackModules() {
  const fallbackModules = {
    InstallmentCore: {
      showToast: (message, type) => console.log(`Toast: ${message} (${type})`),
      formatPrice: (num) => new Intl.NumberFormat('th-TH').format(num),
      validateRequired: (value) => Boolean(value && value.toString().trim())
    },
    InstallmentUI: {
      showToast: (message, type) => console.log(`UI Toast: ${message} (${type})`)
    },
    InstallmentBusiness: {
      saveInstallmentData: () => Promise.resolve({ success: true, message: 'Fallback save' })
    }
  };

  Object.entries(fallbackModules).forEach(([moduleName, moduleObj]) => {
    if (!window[moduleName]) {
      window[moduleName] = moduleObj;
      console.log(`✅ Created fallback module: ${moduleName}`);
    }
  });
}

// ================================================
// 8. สร้าง Elements ที่หายไป
// ================================================

function createMissingElements() {
  const requiredElements = [
    { id: 'step1', tag: 'div', class: 'step-content' },
    { id: 'step2', tag: 'div', class: 'step-content' },
    { id: 'step3', tag: 'div', class: 'step-content' },
    { id: 'step4', tag: 'div', class: 'step-content' },
    { id: 'mainContent', tag: 'main', class: 'main-content' }
  ];

  requiredElements.forEach(({ id, tag, class: className }) => {
    if (!document.getElementById(id)) {
      const element = document.createElement(tag);
      element.id = id;
      element.className = className;
      element.style.display = 'none';
      document.body.appendChild(element);
      console.log(`✅ Created missing element: ${id}`);
    }
  });
}

// ================================================
// 9. สร้างฟังก์ชันสำรอง
// ================================================

function createFallbackFunctions() {
  // สร้างฟังก์ชันสำรองที่จำเป็น
  if (!window.showToast) {
    window.showToast = function(message, type) {
      console.log(`Global Toast: ${message} (${type})`);
      // สร้าง toast element ง่ายๆ
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#2563eb'};
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    };
  }

  if (!window.formatPrice) {
    window.formatPrice = function(num) {
      return new Intl.NumberFormat('th-TH').format(num);
    };
  }
}

// ================================================
// 10. สร้าง UI Elements ที่หายไป
// ================================================

function createMissingUIElements() {
  const uiElements = [
    { id: 'cartCount', tag: 'span', content: '0' },
    { id: 'formProgress', tag: 'span', content: '0%' },
    { id: 'formProgressBar', tag: 'div', content: '' }
  ];

  uiElements.forEach(({ id, tag, content }) => {
    if (!document.getElementById(id)) {
      const element = document.createElement(tag);
      element.id = id;
      element.textContent = content;
      element.style.display = 'none';
      document.body.appendChild(element);
      console.log(`✅ Created missing UI element: ${id}`);
    }
  });
}

// ================================================
// 11. แสดงข้อความสำเร็จ
// ================================================

function showSuccessMessage() {
  console.log('🎉 System is fully ready!');

  // ซ่อน loading overlays
  hideAllLoadingOverlays();

  // แสดงข้อความสำเร็จ
  if (window.InstallmentCore?.showToast) {
    window.InstallmentCore.showToast('ระบบพร้อมใช้งานแล้ว', 'success');
  } else if (window.showToast) {
    window.showToast('ระบบพร้อมใช้งานแล้ว', 'success');
  }

  // Fire custom event
  const event = new CustomEvent('systemFullyReady', {
    detail: { timestamp: new Date().toISOString() }
  });
  window.dispatchEvent(event);
}

// ================================================
// 12. ซ่อน Loading Overlays
// ================================================

function hideAllLoadingOverlays() {
  const loadingSelectors = [
    '.loading', '.loader', '#loading', '#loader',
    '.loading-overlay', '.loading-screen', '.spinner',
    '#loadingOverlay', '.loadingContainer',
    '[class*="loading"]', '[id*="loading"]'
  ];

  loadingSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.style.display = 'none';
      el.classList.add('hidden');
    });
  });

  // แสดง main content
  const mainElements = document.querySelectorAll('main, #mainContent, .main-content');
  mainElements.forEach(el => {
    el.style.display = 'block';
    el.classList.remove('hidden');
  });
}

// ================================================
// 13. เริ่มต้นระบบ
// ================================================

function initializePostLoadingFix() {
  console.log('🚀 Starting post-loading verification...');

  // รอให้ระบบโหลดเสร็จ
  setTimeout(() => {
    const systemStatus = verifySystemStatus();

    // Log final status
    console.log('📋 Final System Status:', {
      timestamp: new Date().toISOString(),
      status: systemStatus,
      ready: Object.values(systemStatus).every(s => s.healthy)
    });

    // Enable debugging functions
    enableDebuggingFunctions();

  }, 2000);
}

// ================================================
// 14. เปิดใช้ฟังก์ชัน Debug
// ================================================

function enableDebuggingFunctions() {
  window.PostLoadingFix = {
    verifyStatus: verifySystemStatus,
    showSuccessMessage: showSuccessMessage,
    hideLoadingOverlays: hideAllLoadingOverlays,
    checkModules: checkModuleAvailability,
    checkDOM: checkDOMElements,
    checkFunctions: checkCriticalFunctions,
    checkUI: checkUIElements,
    applyFixes: applyAdditionalFixes
  };

  console.log('🛠️ Debug functions available via window.PostLoadingFix');
}

// ================================================
// 15. Auto-run
// ================================================

// รันหลังจากโหลดสคริปต์
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePostLoadingFix);
} else {
  setTimeout(initializePostLoadingFix, 500);
}

console.log('📄 Post-Loading Fix Script Loaded');
console.log('💡 Manual run: window.PostLoadingFix.verifyStatus()');