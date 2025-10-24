// ========================================
// INSTALLMENT MAIN SYSTEM - Pattani Branch
// ระบบผ่อนชำระหลัก สาขาปัตตานี
// ========================================

console.log('📦 Loading Installment Main Module...');

// ==================== PERFORMANCE OPTIMIZATIONS ====================

// ✅ Preload critical modules as soon as possible
(function fastPreloader() {
  console.log('⚡ Starting fast preloader...');

  // Set critical globals immediately
  window.BRANCH_CODE = window.BRANCH_CODE || 'PATTANI';
  window.systemReady = false;
  window.moduleLoadStartTime = Date.now();

  // ✅ Immediate DOM ready check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('⚡ DOM ready, starting fast initialization...');
      setTimeout(initializeSystem, 100); // Delay to allow other scripts to load
    });
  } else {
    // DOM already ready
    console.log('⚡ DOM already ready, starting immediate initialization...');
    setTimeout(initializeSystem, 50);
  }

  // ✅ Performance monitoring
  window.performanceMonitor = {
    start: Date.now(),
    checkModuleLoadTime: () => {
      const elapsed = Date.now() - window.moduleLoadStartTime;
      console.log(`📊 Module load time: ${elapsed}ms`);
      return elapsed;
    },
    logPerformance: () => {
      const totalTime = Date.now() - window.performanceMonitor.start;
      const moduleTime = window.performanceMonitor.checkModuleLoadTime();
      console.log(`📊 Performance Report:
        Total time: ${totalTime}ms
        Module load: ${moduleTime}ms
        Remaining: ${totalTime - moduleTime}ms`);
    }
  };

})();

// ✅ Quick system status check
window.quickStatusCheck = function() {
  const status = checkModulesStatus();
  const elapsed = Date.now() - window.moduleLoadStartTime;

  console.log(`⚡ Quick Status (${elapsed}ms elapsed):
    Modules ready: ${status.readyCount}/${status.totalModules}
    System ready: ${window.systemReady ? 'Yes' : 'No'}`);

  return {
    modulesReady: status.readyCount >= 4,
    systemReady: window.systemReady,
    elapsedTime: elapsed
  };
};

// ==================== END PERFORMANCE OPTIMIZATIONS ====================

// =========================================
// PERFORMANCE OPTIMIZATION UTILITIES
// =========================================

// Use centralized debounce function from InstallmentUI module
function debounce(func, wait, immediate = false) {
  // Use centralized debounce from InstallmentUI if available
  if (window.InstallmentUI && window.InstallmentUI.debounce) {
    // InstallmentUI.debounce doesn't support immediate execution
    // So we'll fall back to local implementation for immediate execution
    if (immediate) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          timeout = null;
          if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
      };
    } else {
      return window.InstallmentUI.debounce(func, wait);
    }
  }

  // Fallback implementation
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

// Throttle function for high-frequency events
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Enhanced getElementById using DOM cache
function getElementById(elementId) {
  if (window.InstallmentCore && window.InstallmentCore.getElementById) {
    return window.InstallmentCore.getElementById(elementId);
  }
  return document.getElementById(elementId);
}

// Batch DOM operations utility
function batchDOMOperations(operations) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      operations.forEach(op => op());
      resolve();
    });
  });
}

// Performance monitoring wrapper
function measurePerformance(name, fn) {
  return async function(...args) {
    const start = performance.now();
    const result = await fn.apply(this, args);
    const duration = performance.now() - start;

    if (window.InstallmentCore && window.InstallmentCore.performanceMetrics) {
      window.InstallmentCore.performanceMetrics.totalQueries++;
    }

    if (duration > 100) {
      console.warn(`🐌 Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    }

    return result;
  };
}

// =========================================
// GLOBALS AND CONSTANTS
// =========================================

// Flag to prevent multiple initialization
let systemInitialized = false;

// ===== SUBMISSION CONTROL =====
let isSubmitting = false;

// =========================================
// MAIN SYSTEM INITIALIZATION
// =========================================

// ✅ Wait for modules to load before continuing
async function waitForModules() {
  const maxAttempts = 100;
  const waitTime = 100;
  let attempts = 0;

  console.log('⏳ Waiting for required modules to load...');

  while (attempts < maxAttempts) {
    // ตรวจสอบว่า modules พร้อมหรือยัง
    const coreReady = typeof window.InstallmentCore !== 'undefined';
    const apiReady = typeof window.InstallmentAPI !== 'undefined';
    const uiReady = typeof window.InstallmentUI !== 'undefined';
    const productReady = typeof window.InstallmentProduct !== 'undefined';
    const businessReady = typeof window.InstallmentBusiness !== 'undefined';

    if (coreReady && apiReady && uiReady && productReady && businessReady) {
      console.log('✅ All required modules loaded successfully');
      return true;
    }

    // แสดง progress ทุก 10 attempts
    if (attempts % 10 === 0) {
      console.log(`⏳ Waiting for modules... (${attempts + 1}/${maxAttempts})`, {
        core: coreReady,
        api: apiReady,
        ui: uiReady,
        product: productReady,
        business: businessReady
      });
    }

    await new Promise(resolve => setTimeout(resolve, waitTime));
    attempts++;
  }

  // ถ้า timeout ให้ลองทำงานต่อไปแต่แสดง warning
  console.warn('⚠️ Module loading timeout, but continuing...');
  return false;
}

// ✅ ป้องกันการเรียกซ้ำ - เรียกเพียงครั้งเดียว
(function initializeOnce() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeSystem, 100);
    });
  } else {
    // DOM already loaded
    setTimeout(initializeSystem, 50);
}
})();

// ✅ Helper function เพื่อตรวจสอบสถานะ modules
function checkModulesStatus() {
  const checks = {
    core: typeof window.InstallmentCore !== 'undefined' && window.InstallmentCore?.initialized,
    api: typeof window.InstallmentAPI !== 'undefined',
    ui: typeof window.InstallmentUI !== 'undefined',
    product: typeof window.InstallmentProduct !== 'undefined',
    business: typeof window.InstallmentBusiness !== 'undefined',
    pdf: typeof window.InstallmentPDFIntegration !== 'undefined'
  };

  const readyCount = Object.values(checks).filter(Boolean).length;
  const totalModules = Object.keys(checks).length;

  return { checks, readyCount, totalModules };
}

// ✅ Enhanced system initialization with better duplicate prevention
async function initializeSystem() {
  // ✅ ป้องกันการเรียกซ้ำที่แข็งแกร่งขึ้น
  if (systemInitialized) {
    console.log('⚠️ System already initialized, skipping duplicate call');
    return { success: true, message: 'System already initialized' };
  }

  // ✅ ป้องกันการเรียกพร้อมกัน
  if (window.systemInitializing) {
    console.log('⚠️ System initialization in progress, waiting...');
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (systemInitialized) {
          clearInterval(checkInterval);
          resolve({ success: true, message: 'System initialized by another call' });
        }
      }, 100);
    });
  }

  console.log('⚡ Starting system initialization...');

  try {
    // ✅ ตั้งค่า flag เพื่อป้องกันการเรียกพร้อมกัน
    window.systemInitializing = true;

    // ✅ ใช้ Promise.race เพื่อไม่ให้ module loading block ระบบนาน
    const modulesPromise = waitForModules();
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(false), 5000)); // 5 วินาที timeout

    const modulesReady = await Promise.race([modulesPromise, timeoutPromise]);

    if (!modulesReady) {
      console.warn('⚠️ Module loading timeout, starting recovery...');
      await recoverMissingModules();
    }

    // ✅ ตั้งค่า flag หลักเพื่อป้องกันการเรียกซ้ำ
    systemInitialized = true;

    // ✅ Initialize core systems
    await initializeCoreComponents();

    // ✅ Setup event listeners (with protection)
    setupEventListeners();

    // ✅ Initialize UI components
    initializeUIComponents();

    // ✅ Load initial data
    await loadInitialData();

    // ✅ Performance monitoring
    if (window.InstallmentCore?.trackPerformanceMetrics) {
      window.InstallmentCore.trackPerformanceMetrics();
    }

    console.log('✅ System initialization completed successfully');

    return { success: true, message: 'System initialized successfully' };

  } catch (error) {
    console.error('❌ System initialization failed:', error);

    // ✅ Reset flags on error
    systemInitialized = false;
    window.systemInitializing = false;

    // ✅ Show error recovery
    showProductLoadError();

    return { success: false, message: 'System initialization failed', error };

  } finally {
    // ✅ Reset กไฟล์ initialization flag
    window.systemInitializing = false;
  }
}

function showProductLoadError() {
  const level1Container = document.getElementById('level1Items');
  if (level1Container) {
    level1Container.innerHTML = `
      <div class="col-span-full">
        <div class="text-center p-8 bg-red-50 rounded-lg border border-red-200">
          <div class="text-4xl mb-4">❌</div>
          <h3 class="text-lg font-bold text-red-800 mb-2">ไม่สามารถโหลดข้อมูลสินค้าได้</h3>
          <p class="text-red-600 mb-4">กรุณาตรวจสอบ:</p>
          <ul class="text-left text-red-600 mb-4 inline-block">
            <li>• การเชื่อมต่ออินเทอร์เน็ต</li>
            <li>• ระบบ API ทำงานปกติหรือไม่</li>
            <li>• การตั้งค่า authentication</li>
          </ul>
          <button onclick="location.reload()" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            รีเฟรชหน้า
          </button>
        </div>
      </div>
    `;
  }
}

// =========================================
// EVENT LISTENERS SETUP
// =========================================

// ✅ Flag เพื่อป้องกันการเพิ่ม event listeners ซ้ำ
let eventListenersSetup = false;

function setupEventListeners() {
  // ✅ ป้องกันการเพิ่ม event listeners ซ้ำ
  if (eventListenersSetup) {
    console.log('⚠️ Event listeners already setup, skipping duplicate setup');
    return;
  }

  console.log('🔧 Setting up event listeners...');

  // ✅ ตั้งค่า flag
  eventListenersSetup = true;

  // Step navigation buttons
  setupStepButtons();

  // Product search
  setupProductSearch();

  // Customer management
  setupCustomerManagement();

  // Barcode scanner
  setupBarcodeScanner();

  // Form validation
  setupFormValidation();

  // Contact address management
  setupContactAddressHandlers();

  // Birth date and age handlers
      // setupBirthDateHandler จะถูกเรียกจาก installment-ui.js แทน

  // Card reader events
  setupCardReaderEvents();

  // Quick actions
  setupQuickActions();

  console.log('✅ Event listeners setup complete');
}

function setupStepButtons() {
  // Use cached elements for better performance
  const stepButtons = [
    { id: 'btnStep1ToStep2', action: () => validateStep1() && goToStep(2) },
    { id: 'btnStep2ToStep3', action: () => validateStep2() && goToStep(3) },
    { id: 'btnStep3ToStep4', action: () => {
      if (validateStep3()) {
        saveInstallmentData().catch(error => showToast(error.message, 'error'));
      }
    } },
    { id: 'btnBackToLevel1', action: () => window.InstallmentProduct?.backToLevel1() },
    { id: 'btnBackToLevel2', action: () => window.InstallmentProduct?.backToLevel2() }
  ];

  stepButtons.forEach(({ id, action }) => {
    const button = getElementById(id);
    if (button && !button.hasAttribute('data-listener-added')) {
      button.addEventListener('click', action);
      button.setAttribute('data-listener-added', 'true');
    }
  });

  console.log('✅ Step navigation buttons setup');
}

function setupProductSearch() {
  const searchBtn = getElementById('btnProductSearch');
  const resetBtn = getElementById('btnProductReset');
  const searchInput = getElementById('productSearchQuery');

  // Use debounced search for better performance
  const debouncedSearch = debounce(performProductSearch, 300);

  if (searchBtn && !searchBtn.hasAttribute('data-listener-added')) {
    searchBtn.addEventListener('click', debouncedSearch);
    searchBtn.setAttribute('data-listener-added', 'true');
  }

  if (resetBtn && !resetBtn.hasAttribute('data-listener-added')) {
    resetBtn.addEventListener('click', resetProductSearch);
    resetBtn.setAttribute('data-listener-added', 'true');
  }

  if (searchInput && !searchInput.hasAttribute('data-listener-added')) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        debouncedSearch();
      }
    });

    // Add real-time search with debouncing
    searchInput.addEventListener('input', debounce((e) => {
      if (e.target.value.length >= 2) {
        debouncedSearch();
      }
    }, 500));

    searchInput.setAttribute('data-listener-added', 'true');
  }

  console.log('✅ Product search setup');
}

function performProductSearch() {
  // Use enhanced search if available, fallback to regular search
  if (window.InstallmentProduct && window.InstallmentProduct.searchItemsEnhanced) {
    window.InstallmentProduct.searchItemsEnhanced();
  } else if (window.InstallmentProduct && window.InstallmentProduct.searchItems) {
    window.InstallmentProduct.searchItems();
  } else {
    console.warn('InstallmentProduct search methods not available');
  }
}

function resetProductSearch() {
  if (window.InstallmentProduct && window.InstallmentProduct.resetSearch) {
    window.InstallmentProduct.resetSearch();
  } else {
    console.warn('InstallmentProduct.resetSearch not available');
  }
}

function setupCustomerManagement() {
  const searchBtn = document.getElementById('btnCustomerSearch');
  const searchInput = document.getElementById('customerSearch');
  const readCardBtn = document.getElementById('btnReadCard');

  if (searchBtn && !searchBtn.hasAttribute('data-listener-added')) {
    searchBtn.addEventListener('click', performCustomerSearch);
    searchBtn.setAttribute('data-listener-added', 'true');
  }

  if (searchInput && !searchInput.hasAttribute('data-listener-added')) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performCustomerSearch();
      }
    });
    searchInput.setAttribute('data-listener-added', 'true');
  }

  if (readCardBtn && !readCardBtn.hasAttribute('data-listener-added')) {
    readCardBtn.addEventListener('click', () => {
      if (window.InstallmentAPI && window.InstallmentAPI.readCard) {
        window.InstallmentAPI.readCard();
      } else {
        console.warn('InstallmentAPI.readCard not available');
      }
    });
    readCardBtn.setAttribute('data-listener-added', 'true');
  }

  console.log('✅ Customer management setup');
}

function performCustomerSearch() {
  if (window.InstallmentAPI && window.InstallmentAPI.searchExistingCustomer) {
    window.InstallmentAPI.searchExistingCustomer();
  } else {
    console.warn('InstallmentAPI.searchExistingCustomer not available');
  }
}

function setupBarcodeScanner() {
  const barcodeInput = document.getElementById('manualBarcodeInput');
  const barcodeBtn = document.getElementById('btnAddBarcode');

  if (barcodeInput && !barcodeInput.hasAttribute('data-listener-added')) {
    barcodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addProductByBarcode();
      }
    });
    barcodeInput.setAttribute('data-listener-added', 'true');
  }

  if (barcodeBtn && !barcodeBtn.hasAttribute('data-listener-added')) {
    barcodeBtn.addEventListener('click', addProductByBarcode);
    barcodeBtn.setAttribute('data-listener-added', 'true');
  }

  console.log('✅ Barcode scanner setup');
}

function addProductByBarcode() {
  const barcodeInput = document.getElementById('manualBarcodeInput');
  const barcode = barcodeInput?.value?.trim();

  if (!barcode) {
    showToast('กรุณากรอกบาร์โค้ดหรือ IMEI', 'warning');
    return;
  }

  if (window.InstallmentProduct && window.InstallmentProduct.findAndAddToCartByBarcode) {
    window.InstallmentProduct.findAndAddToCartByBarcode(barcode);
    barcodeInput.value = '';
  } else {
    console.warn('InstallmentProduct.findAndAddToCartByBarcode not available');
  }
}

function setupFormValidation() {
  // Real-time validation for key fields
  const fieldsToValidate = [
    { id: 'customerIdCard', validator: (value) => window.InstallmentCore?.validateIdCard(value) },
    { id: 'customerPhone', validator: (value) => window.InstallmentCore?.validatePhone(value) },
    { id: 'customerEmail', validator: (value) => window.InstallmentCore?.validateEmail(value) }
  ];

  fieldsToValidate.forEach(field => {
    const element = getElementById(field.id);
    if (element && field.validator && !element.hasAttribute('data-listener-added')) {
      // Debounced validation for better performance
      const debouncedValidator = debounce(() => {
        if (element.value.trim()) {
          try {
            field.validator(element.value);
            element.classList.remove('input-error');
            element.classList.add('input-success');
          } catch (error) {
            element.classList.add('input-error');
            element.classList.remove('input-success');
            showToast(error.message, 'error');
          }
        }
      }, 300);

      element.addEventListener('blur', debouncedValidator);

      element.addEventListener('input', throttle(() => {
        element.classList.remove('input-error', 'input-success');
      }, 100));

      element.setAttribute('data-listener-added', 'true');
    }
  });

  console.log('✅ Form validation setup');
}

// ฟังก์ชัน setupBirthDateHandler ถูกย้ายไปอยู่ใน installment-ui.js แล้ว
// เพื่อหลีกเลี่ยงการ duplicate event listeners

function setupCardReaderEvents() {
  // ตรวจสอบว่ามี event listener ติดอยู่แล้วหรือไม่
  const readCardBtn = getElementById('btnReadCard');

  if (readCardBtn && !readCardBtn.hasAttribute('data-listener-added')) {
    // Prevent multiple clicks with debouncing
    const handleCardRead = debounce(async function() {
      try {
        // Disable button and show loading
        if (window.InstallmentUI && window.InstallmentUI.disableCardReader) {
          window.InstallmentUI.disableCardReader();
        }

        // Call the card reader API with performance monitoring
        await measurePerformance('cardReader', async () => {
          await window.InstallmentAPI.readCard();
        })();

        // Re-enable button
        if (window.InstallmentUI && window.InstallmentUI.enableCardReader) {
          window.InstallmentUI.enableCardReader();
        }

      } catch (error) {
        console.error('❌ Card reader error:', error);
        showToast('เกิดข้อผิดพลาดในการอ่านบัตร', 'error');

        // Re-enable button
        if (window.InstallmentUI && window.InstallmentUI.enableCardReader) {
          window.InstallmentUI.enableCardReader();
        }
      }
    }, 1000);

    readCardBtn.addEventListener('click', handleCardRead);
    readCardBtn.setAttribute('data-listener-added', 'true');

    console.log('✅ Card reader events setup (first time)');
  } else {
    console.log('⚠️ Card reader events already initialized');
  }
}

function calculateAgeFromBirthDate(birthDate) {
  if (!birthDate) return null;

  const today = new Date();
  const birth = new Date(birthDate);

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

// =========================================
// CONTACT ADDRESS MANAGEMENT
// =========================================

function toggleContactAddress() {
  const checkbox = document.getElementById('sameAsMainAddress');
  const contactForm = document.getElementById('contactAddressForm');
  const comparison = document.getElementById('addressComparison');

  console.log('🔄 toggleContactAddress called, checked:', checkbox?.checked);

  if (checkbox && checkbox.checked) {
    // Show contact address form with readonly fields
    if (contactForm) {
      contactForm.style.display = 'block';
    }

    // Copy main address to contact address first
    copyMainToContactAddress();

    // Make contact address fields readonly
    setContactAddressReadonly(true);

    if (comparison) {
      comparison.classList.add('hidden');
    }

    if (window.InstallmentUI && window.InstallmentUI.showToast) {
      window.InstallmentUI.showToast('ใช้ที่อยู่ปัจจุบันเป็นที่อยู่สามารถติดต่อได้', 'info', { duration: 2000 });
    } else {
      console.log('ใช้ที่อยู่ปัจจุบันเป็นที่อยู่สามารถติดต่อได้');
    }
  } else {
    // Show contact address form with editable fields
    if (contactForm) {
      contactForm.style.display = 'block';
    }

    // Make contact address fields editable
    setContactAddressReadonly(false);

    // Clear contact address fields
    clearContactAddress();

    if (window.InstallmentUI && window.InstallmentUI.showToast) {
      window.InstallmentUI.showToast('กรุณากรอกที่อยู่สามารถติดต่อได้แยกต่างหาก', 'info', { duration: 2000 });
    } else {
      console.log('กรุณากรอกที่อยู่สามารถติดต่อได้แยกต่างหาก');
    }
  }
}

function setContactAddressReadonly(readonly) {
  const contactFields = [
    'contactHouseNo', 'contactMoo', 'contactSoi', 'contactRoad',
    'contactProvince', 'contactDistrict', 'contactSubDistrict', 'contactZipcode'
  ];

  contactFields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.readOnly = readonly;
      if (readonly) {
        element.classList.add('bg-gray-100', 'cursor-not-allowed');
        element.style.backgroundColor = '#f3f4f6';
      } else {
        element.classList.remove('bg-gray-100', 'cursor-not-allowed');
        element.style.backgroundColor = '';
      }
    }
  });
}

function copyMainToContactAddress() {
  console.log('📋 copyMainToContactAddress called');

  const mainFields = [
    { main: 'houseNo', contact: 'contactHouseNo' },
    { main: 'moo', contact: 'contactMoo' },
    { main: 'soi', contact: 'contactSoi' },
    { main: 'road', contact: 'contactRoad' },
    { main: 'province', contact: 'contactProvince' },
    { main: 'district', contact: 'contactDistrict' },
    { main: 'subDistrict', contact: 'contactSubDistrict' },
    { main: 'zipcode', contact: 'contactZipcode' }
  ];

  let copiedCount = 0;

  mainFields.forEach(({ main, contact }) => {
    const mainElement = document.getElementById(main);
    const contactElement = document.getElementById(contact);

    if (mainElement && contactElement) {
      const value = mainElement.value.trim();
      contactElement.value = value;
      if (value) {
        copiedCount++;
        console.log(`✅ Copied ${main} (${value}) -> ${contact}`);
      }
    } else {
      console.warn(`⚠️ Element not found: ${main} or ${contact}`);
    }
  });

  console.log(`📊 Total fields copied: ${copiedCount}/${mainFields.length}`);

  // Update preview
  updateContactAddressPreview();
}

function clearContactAddress() {
  const contactFields = [
    'contactHouseNo', 'contactMoo', 'contactSoi', 'contactRoad',
    'contactProvince', 'contactDistrict', 'contactSubDistrict', 'contactZipcode'
  ];

  contactFields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.value = '';

      // Re-enable dropdowns
      if (fieldId === 'contactProvince') {
        element.disabled = false;
      } else if (fieldId === 'contactDistrict' || fieldId === 'contactSubDistrict') {
        element.disabled = true;
      }
    }
  });

  // Hide previews
  const preview = document.getElementById('contactAddressPreview');
  const comparison = document.getElementById('addressComparison');

  if (preview) preview.classList.add('hidden');
  if (comparison) comparison.classList.add('hidden');
}

function updateContactAddressPreview() {
  const preview = document.getElementById('contactAddressPreview');
  const previewText = document.getElementById('contactAddressPreviewText');

  if (!preview || !previewText) return;

  const addressParts = [];

  // Get contact address values
  const houseNo = document.getElementById('contactHouseNo')?.value;
  const moo = document.getElementById('contactMoo')?.value;
  const soi = document.getElementById('contactSoi')?.value;
  const road = document.getElementById('contactRoad')?.value;
  const subDistrict = document.getElementById('contactSubDistrict')?.value;
  const district = document.getElementById('contactDistrict')?.value;
  const province = document.getElementById('contactProvince')?.value;
  const zipcode = document.getElementById('contactZipcode')?.value;

  // Build address string
  if (houseNo) addressParts.push(`บ้านเลขที่ ${houseNo}`);
  if (moo) addressParts.push(`หมู่ที่ ${moo}`);
  if (soi) addressParts.push(`ซอย ${soi}`);
  if (road) addressParts.push(`ถนน ${road}`);
  if (subDistrict) addressParts.push(`ตำบล ${subDistrict}`);
  if (district) addressParts.push(`อำเภอ ${district}`);
  if (province) addressParts.push(`จังหวัด ${province}`);
  if (zipcode) addressParts.push(zipcode);

  if (addressParts.length > 0) {
    previewText.textContent = addressParts.join(' ');
    preview.classList.remove('hidden');

    // Show comparison if both addresses have data
    showAddressComparison();
  } else {
    preview.classList.add('hidden');
  }
}

function showAddressComparison() {
  const comparison = document.getElementById('addressComparison');
  const mainComparison = document.getElementById('mainAddressComparison');
  const contactComparison = document.getElementById('contactAddressComparison');

  if (!comparison || !mainComparison || !contactComparison) return;

  // Get main address
  const mainAddressParts = [];
  const mainHouseNo = document.getElementById('houseNo')?.value;
  const mainMoo = document.getElementById('moo')?.value;
  const mainSoi = document.getElementById('soi')?.value;
  const mainRoad = document.getElementById('road')?.value;
  const mainSubDistrict = document.getElementById('subDistrict')?.value;
  const mainDistrict = document.getElementById('district')?.value;
  const mainProvince = document.getElementById('province')?.value;
  const mainZipcode = document.getElementById('zipcode')?.value;

  if (mainHouseNo) mainAddressParts.push(`บ้านเลขที่ ${mainHouseNo}`);
  if (mainMoo) mainAddressParts.push(`หมู่ที่ ${mainMoo}`);
  if (mainSoi) mainAddressParts.push(`ซอย ${mainSoi}`);
  if (mainRoad) mainAddressParts.push(`ถนน ${mainRoad}`);
  if (mainSubDistrict) mainAddressParts.push(`ตำบล ${mainSubDistrict}`);
  if (mainDistrict) mainAddressParts.push(`อำเภอ ${mainDistrict}`);
  if (mainProvince) mainAddressParts.push(`จังหวัด ${mainProvince}`);
  if (mainZipcode) mainAddressParts.push(mainZipcode);

  // Get contact address
  const contactAddressParts = [];
  const contactHouseNo = document.getElementById('contactHouseNo')?.value;
  const contactMoo = document.getElementById('contactMoo')?.value;
  const contactSoi = document.getElementById('contactSoi')?.value;
  const contactRoad = document.getElementById('contactRoad')?.value;
  const contactSubDistrict = document.getElementById('contactSubDistrict')?.value;
  const contactDistrict = document.getElementById('contactDistrict')?.value;
  const contactProvince = document.getElementById('contactProvince')?.value;
  const contactZipcode = document.getElementById('contactZipcode')?.value;

  if (contactHouseNo) contactAddressParts.push(`บ้านเลขที่ ${contactHouseNo}`);
  if (contactMoo) contactAddressParts.push(`หมู่ที่ ${contactMoo}`);
  if (contactSoi) contactAddressParts.push(`ซอย ${contactSoi}`);
  if (contactRoad) contactAddressParts.push(`ถนน ${contactRoad}`);
  if (contactSubDistrict) contactAddressParts.push(`ตำบล ${contactSubDistrict}`);
  if (contactDistrict) contactAddressParts.push(`อำเภอ ${contactDistrict}`);
  if (contactProvince) contactAddressParts.push(`จังหวัด ${contactProvince}`);
  if (contactZipcode) contactAddressParts.push(contactZipcode);

  // Show comparison only if both addresses have data and are different
  if (mainAddressParts.length > 0 && contactAddressParts.length > 0) {
    const mainAddress = mainAddressParts.join(' ');
    const contactAddress = contactAddressParts.join(' ');

    if (mainAddress !== contactAddress) {
      mainComparison.textContent = mainAddress || 'ยังไม่ได้กรอก';
      contactComparison.textContent = contactAddress || 'ยังไม่ได้กรอก';
      comparison.classList.remove('hidden');
    } else {
      comparison.classList.add('hidden');
    }
  }
}

// Event handlers for contact address management
function setupContactAddressHandlers() {
  console.log('🔧 Setting up contact address handlers...');

  // ตรวจสอบและเพิ่ม checkbox handler
  const checkbox = document.getElementById('sameAsMainAddress');
  if (checkbox && !checkbox.hasAttribute('data-listener-added')) {
    checkbox.addEventListener('change', toggleContactAddress);
    checkbox.setAttribute('data-listener-added', 'true');
  }

  // ตรวจสอบและเพิ่ม handlers สำหรับ real-time update
  const contactAddressFields = [
    'contactHouseNo', 'contactMoo', 'contactSoi', 'contactRoad',
    'contactProvince', 'contactDistrict', 'contactSubDistrict', 'contactZipcode'
  ];

  let foundFields = 0;

  contactAddressFields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element && !element.hasAttribute('data-listener-added')) {
      element.addEventListener('input', debounce(updateContactAddressPreview, 300));
      element.setAttribute('data-listener-added', 'true');
      foundFields++;
    } else if (element) {
      foundFields++;
    } else {
      console.warn(`⚠️ Contact address field not found: ${fieldId}`);
    }
  });

  console.log(`📊 Contact address fields found: ${foundFields}/${contactAddressFields.length}`);
  console.log('✅ Contact address handlers setup complete');
}

// Get current location (placeholder - implement actual geolocation)
async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
}

function setupQuickActions() {
  const quickActionsBtn = document.getElementById('quickActionsBtn');
  const quickActionsDropdown = document.getElementById('quickActionsDropdown');

  if (quickActionsBtn && quickActionsDropdown && !quickActionsBtn.hasAttribute('data-listener-added')) {
    quickActionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      quickActionsDropdown.classList.toggle('hidden');
    });

    quickActionsBtn.setAttribute('data-listener-added', 'true');
  }

  // ตรวจสอบว่าไม่ได้เพิ่ม document listener ซ้ำ
  if (!window.quickActionsListenerAdded) {
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (quickActionsBtn && quickActionsDropdown &&
          !quickActionsBtn.contains(e.target) && !quickActionsDropdown.contains(e.target)) {
        quickActionsDropdown.classList.add('hidden');
      }
    });

    window.quickActionsListenerAdded = true;
  }

  console.log('✅ Quick actions setup');
}

function initializeUIComponents() {
  // Initialize cart display
  updateCartDisplay();

  // Initialize step display - กู้คืนสถานะ step ปัจจุบัน หรือเริ่มต้นที่ step 1
  const activeStep = document.querySelector('.step-content.active');
  if (!activeStep) {
    const currentStep = getCurrentStepFromStorage();
    console.log(`🔄 No active step found, initializing to step ${currentStep}`);
    goToStep(currentStep);
  } else {
    console.log('✅ Active step found, skipping goToStep initialization');
  }

  // Initialize connection status
  updateConnectionStatus();

  // Initialize document handlers (camera and signature)
  if (window.InstallmentUI && window.InstallmentUI.initializeDocumentHandlers) {
    try {
      window.InstallmentUI.initializeDocumentHandlers();
      console.log('✅ Document handlers initialized');
    } catch (error) {
      console.error('❌ Failed to initialize document handlers:', error);
    }
  }

  // Initialize signature pads
  if (window.InstallmentUI && window.InstallmentUI.initializeSignaturePads) {
    try {
      setTimeout(() => {
        window.InstallmentUI.initializeSignaturePads();
        console.log('✅ Signature pads initialized');
      }, 1000); // รอให้ DOM โหลดเสร็จก่อน
    } catch (error) {
      console.error('❌ Failed to initialize signature pads:', error);
    }
  }

  console.log('✅ UI components initialized');
}

// =========================================
// STEP STATE MANAGEMENT
// =========================================

// บันทึกสถานะ step ปัจจุบัน
function saveCurrentStep(stepNumber) {
  try {
    localStorage.setItem('installment_current_step', stepNumber.toString());
    console.log(`💾 Saved current step: ${stepNumber}`);
  } catch (error) {
    console.warn('⚠️ Failed to save current step:', error);
  }
}

// กู้คืนสถานะ step ปัจจุบัน
function getCurrentStepFromStorage() {
  try {
    const savedStep = localStorage.getItem('installment_current_step');
    return savedStep ? parseInt(savedStep) : 1;
  } catch (error) {
    console.warn('⚠️ Failed to get current step from storage:', error);
    return 1;
  }
}

// ลบสถานะ step ที่บันทึกไว้
function clearCurrentStepFromStorage() {
  try {
    localStorage.removeItem('installment_current_step');
    console.log('🗑️ Cleared current step from storage');
  } catch (error) {
    console.warn('⚠️ Failed to clear current step from storage:', error);
  }
}

// =========================================
// STEP MANAGEMENT
// =========================================

function goToStep(stepNumber) {
  console.log(`🔄 เปลี่ยนไปขั้นตอนที่ ${stepNumber}`);

  // บันทึกสถานะ step ปัจจุบัน
  saveCurrentStep(stepNumber);

  // ซ่อน step content ทั้งหมด
  document.querySelectorAll('.step-content').forEach(content => {
    content.classList.remove('active');
    content.style.display = 'none';
  });

  // แสดง step ที่ต้องการ
  const targetStep = document.getElementById(`step${stepNumber}`);
  if (targetStep) {
    targetStep.classList.add('active');
    targetStep.style.display = 'block';
  }

  // อัปเดต stepper visual
  updateStepperDisplay(stepNumber);

  // จัดการเฉพาะแต่ละ step
  handleStepChange(stepNumber);

  // ประกาศให้ screen reader ฟัง
  announceToScreenReader(`เข้าสู่ขั้นตอนที่ ${stepNumber}`);
}

function updateStepperDisplay(currentStep) {
  document.querySelectorAll('.step').forEach((step, index) => {
    const stepNumber = index + 1;
    step.classList.remove('active', 'completed');

    if (stepNumber === currentStep) {
      step.classList.add('active');
    } else if (stepNumber < currentStep) {
      step.classList.add('completed');
    }
  });
}

function handleStepChange(stepNumber) {
  switch(stepNumber) {
    case 1:
      // Reset และ focus
      resetProductSearch();
      setTimeout(() => {
        const barcodeInput = document.getElementById('manualBarcodeInput');
        if (barcodeInput) barcodeInput.focus();
      }, 100);
      break;

    case 2:
      // อัปเดตการแสดงผลในตะกร้า
      updateCartDisplay();
      setTimeout(() => {
        const customerSearch = document.getElementById('customerSearch');
        if (customerSearch) customerSearch.focus();
      }, 100);
      break;

    case 3:
      // แสดงสรุปและแผนการผ่อน
      updateStep3Display();
      break;

    case 4:
      // แสดงขอบคุณ (ไม่แสดง confirm dialog อัตโนมัติ)
      showToast('🎉 บันทึกข้อมูลการผ่อนชำระเรียบร้อยแล้ว', 'success');

      // Render Step 4 Summary with payment plan
      if (window.InstallmentBusiness && window.InstallmentBusiness.renderStep4Summary) {
        console.log('📊 Calling renderStep4Summary from InstallmentBusiness');
        window.InstallmentBusiness.renderStep4Summary(window.lastSuccessResponse || {});
      } else if (window.renderStep4Summary) {
        console.log('📊 Calling global renderStep4Summary');
        window.renderStep4Summary(window.lastSuccessResponse || {});
      } else {
        console.warn('⚠️ renderStep4Summary function not found');
      }

      // Call processStep4Automation for PDF buttons and email
      if (window.processStep4Automation) {
        setTimeout(() => {
          window.processStep4Automation();
        }, 1000);
      }
      break;
  }
}

// =========================================
// VALIDATION FUNCTIONS
// =========================================

function validateStep1() {
  // ตรวจสอบว่ามีสินค้าในตะกร้าหรือไม่
  const cartItems = window.cartItems || [];

  if (cartItems.length === 0) {
    showToast('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ', 'warning');
    return false;
  }

  console.log('✅ Step 1 validation passed');
  return true;
}

function validateStep2() {
  // ตรวจสอบข้อมูลลูกค้า
  const requiredFields = [
    { id: 'customerFirstName', name: 'ชื่อ' },
    { id: 'customerLastName', name: 'นามสกุล' },
    { id: 'customerIdCard', name: 'เลขบัตรประชาชน' },
    { id: 'customerPhone', name: 'เบอร์โทรศัพท์' },
    { id: 'customerBirthDate', name: 'วันเดือนปีเกิด' },
    { id: 'customerAge', name: 'อายุ' }
  ];

  for (const field of requiredFields) {
    const element = document.getElementById(field.id);
    if (!element || !element.value.trim()) {
      showToast(`กรุณากรอก${field.name}`, 'warning');
      element?.focus();
      return false;
    }
  }

  // ตรวจสอบรูปแบบข้อมูล
  try {
    const idCard = document.getElementById('customerIdCard').value;
    const phone = document.getElementById('customerPhone').value;
    const email = document.getElementById('customerEmail').value;

    if (idCard && window.InstallmentCore) window.InstallmentCore.validateIdCard(idCard);
    if (phone && window.InstallmentCore) window.InstallmentCore.validatePhone(phone);
    if (email && window.InstallmentCore) window.InstallmentCore.validateEmail(email);

  } catch (error) {
    showToast(error.message, 'error');
    return false;
  }

  // ตรวจสอบที่อยู่ปัจจุบัน
  const requiredAddressFields = [
    { id: 'houseNo', name: 'บ้านเลขที่' },
    { id: 'province', name: 'จังหวัด' },
    { id: 'district', name: 'อำเภอ/เขต' },
    { id: 'subDistrict', name: 'ตำบล/แขวง' }
  ];

  for (const field of requiredAddressFields) {
    const element = document.getElementById(field.id);
    if (!element || !element.value.trim()) {
      showToast(`กรุณากรอก${field.name}`, 'warning');
      element?.focus();
      return false;
    }
  }

  // ตรวจสอบที่อยู่สามารถติดต่อได้
  const sameAsMainAddress = document.getElementById('sameAsMainAddress')?.checked;

  if (!sameAsMainAddress) {
    // ถ้าไม่ใช่ที่อยู่เดียวกัน ต้องตรวจสอบที่อยู่สามารถติดต่อได้
    const requiredContactAddressFields = [
      { id: 'contactHouseNo', name: 'บ้านเลขที่ (ที่อยู่สามารถติดต่อได้)' },
      { id: 'contactProvince', name: 'จังหวัด (ที่อยู่สามารถติดต่อได้)' },
      { id: 'contactDistrict', name: 'อำเภอ/เขต (ที่อยู่สามารถติดต่อได้)' },
      { id: 'contactSubDistrict', name: 'ตำบล/แขวง (ที่อยู่สามารถติดต่อได้)' }
    ];

    for (const field of requiredContactAddressFields) {
      const element = document.getElementById(field.id);
      if (!element || !element.value.trim()) {
        showToast(`กรุณากรอก${field.name}`, 'warning');
        element?.focus();
        return false;
      }
    }
  }

  console.log('✅ Step 2 validation passed');
  return true;
}

function validateStep3() {
  console.log('🔍 Validating Step 3...');

  // ตรวจสอบแผนการผ่อน
  const hasSelectedPlan = document.querySelector('input[name="installmentPlan"]:checked');

  if (!hasSelectedPlan) {
    showToast('กรุณาเลือกแผนการผ่อนชำระ', 'warning');
    return false;
  }

  // ตรวจสอบเอกสารที่จำเป็น
  console.log('📋 Checking required documents...');

  if (window.InstallmentBusiness && window.InstallmentBusiness.validateRequiredDocuments) {
    try {
      const docValidation = window.InstallmentBusiness.validateRequiredDocuments();

      if (!docValidation.isValid) {
        const missingCount = docValidation.missingDocs.length;
        const totalRequired = docValidation.totalRequired;

        showToast(
          `เอกสารไม่ครบถ้วน (${docValidation.totalProvided}/${totalRequired})\n` +
          `ขาดหาย: ${docValidation.missingDocs.join(', ')}`,
          'warning'
        );

        // Scroll to documents section
        const documentsSection = document.getElementById('documentsSection');
        if (documentsSection) {
          documentsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return false;
      }

      console.log(`✅ Documents validation passed (${docValidation.totalProvided}/${docValidation.totalRequired})`);

    } catch (error) {
      console.error('❌ Document validation failed:', error);
      showToast('เกิดข้อผิดพลาดในการตรวจสอบเอกสาร: ' + error.message, 'error');
      return false;
    }
  } else {
    console.warn('⚠️ InstallmentBusiness.validateRequiredDocuments not available - skipping document validation');
  }

  console.log('✅ Step 3 validation passed completely');
  return true;
}

// =========================================
// UTILITY FUNCTIONS
// =========================================

function updateCartDisplay() {
  if (window.InstallmentProduct && window.InstallmentProduct.renderCart) {
    window.InstallmentProduct.renderCart();
  }

  if (window.InstallmentProduct && window.InstallmentProduct.updateCartCount) {
    window.InstallmentProduct.updateCartCount();
  }

  if (window.InstallmentProduct && window.InstallmentProduct.updateStep1Button) {
    window.InstallmentProduct.updateStep1Button();
  }
}

function updateStep3Display() {
  console.log('🔄 Updating Step 3 Display...');

  // แสดงสรุปสินค้าใน Step 3
  if (window.InstallmentBusiness && window.InstallmentBusiness.renderStep3Summary) {
    window.InstallmentBusiness.renderStep3Summary();
  }

  // สร้างแผนการผ่อนอัตโนมัติจากสินค้าใน Step 1
  if (window.InstallmentBusiness && window.InstallmentBusiness.renderAutoPlans) {
    window.InstallmentBusiness.renderAutoPlans();
  }

  // เริ่มต้นแผนการผ่อนแบบกำหนดเอง
  if (window.InstallmentBusiness && window.InstallmentBusiness.initManualTerms) {
    window.InstallmentBusiness.initManualTerms();
  }

  // อัปเดตสรุปแผนการผ่อน
  if (window.InstallmentBusiness && window.InstallmentBusiness.updatePlanSummaryDisplay) {
    window.InstallmentBusiness.updatePlanSummaryDisplay();
  }

  console.log('✅ Step 3 Display updated successfully');
}

function updateConnectionStatus() {
  // อัปเดตสถานะการเชื่อมต่อ
  const statusEl = document.getElementById('connectionStatus');
  const textEl = document.getElementById('connectionText');

  if (statusEl && textEl) {
    statusEl.classList.remove('online', 'partial', 'offline');
    statusEl.classList.add('online');
    textEl.textContent = '🟢 ออนไลน์';
  }
}

function resetAllData() {
  // รีเซ็ตข้อมูลทั้งหมด
  if (window.InstallmentProduct && window.InstallmentProduct.clearCart) {
    window.InstallmentProduct.clearCart();
  }

  // รีเซ็ตฟอร์มลูกค้า
  const form = document.querySelector('#step2 form') || document.querySelector('form');
  if (form) {
    form.reset();
  }

  // รีเซ็ต UI
  document.querySelectorAll('.input-error, .input-success').forEach(el => {
    el.classList.remove('input-error', 'input-success');
  });

  // รีเซ็ตข้อมูลเอกสาร
  if (window.InstallmentUI && window.InstallmentUI.clearDocumentData) {
    window.InstallmentUI.clearDocumentData();
  }

  // รีเซ็ต global variables
  window.currentInstallmentData = null;
  window.lastSuccessResponse = null;

  // ล้างสถานะ step ที่บันทึกไว้
  clearCurrentStepFromStorage();
}

function createNewOrder() {
  // ฟังก์ชันสำหรับปุ่ม "สร้างรายการใหม่" ใน Step 4
  if (confirm('ต้องการสร้างรายการใหม่หรือไม่?\n\nข้อมูลปัจจุบันจะถูกล้างทั้งหมด')) {
    console.log('🔄 สร้างรายการใหม่...');
    showToast('กำลังเตรียมรายการใหม่...', 'info');

    // รีเซ็ตข้อมูลทั้งหมด
    resetAllData();

    // กลับไป Step 1
    setTimeout(() => {
      goToStep(1);
      showToast('เริ่มรายการใหม่เรียบร้อย', 'success');
    }, 500);
  }
}

function announceToScreenReader(message) {
  if (window.InstallmentUI && window.InstallmentUI.announceToScreenReader) {
    window.InstallmentUI.announceToScreenReader(message);
  }
}

// ลบฟังก์ชัน showToast ซ้ำ - ใช้ InstallmentCore.showToast() โดยตรง
// ลบฟังก์ชัน validation ซ้ำ - ใช้ InstallmentCore.validateXX() โดยตรง

// ✅ Enhanced saveInstallmentData with better validation
async function saveInstallmentData() {
  if (isSubmitting) return false; // block duplicate clicks
  isSubmitting = true;
  const payBtn = document.getElementById('btnStep3ToStep4');
  if (payBtn) payBtn.disabled = true;

  // Show global loading overlay
  let loaderId = null;
  if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
    loaderId = window.LoadingSystem.show({
      message: 'กำลังบันทึกข้อมูล...',
      showProgress: true,
      autoProgress: true
    });
  }

  try {
    console.log('💾 Enhanced save installment data starting...');

    // Pre-save validation
    if (!validateStep3()) {
      console.error('❌ Step 3 validation failed');
      return false;
    }
    // ===== PRE-IMEI DUPLICATE CHECK =====
    try {
      const imeiItem = (window.cartItems || []).find(it => it.imei);
      if (imeiItem && imeiItem.imei) {
        const checkRes = await fetch(`/api/imei/check?imei=${encodeURIComponent(imeiItem.imei)}`);
        if (checkRes.ok) {
          const checkJs = await checkRes.json();
          if (checkJs && checkJs.code === 'IMEI_ALREADY_IN_USE') {
            throw Object.assign(new Error(`อุปกรณ์นี้เคยทำสัญญาแล้ว (เลขที่ ${checkJs.conflictContract})`), {
              code: 'IMEI_ALREADY_IN_USE',
              conflictContract: checkJs.conflictContract
            });
          }
        }
      }
    } catch (preErr) {
      showToast(preErr.message, 'warning');
      return false;
    }

    if (window.InstallmentBusiness && window.InstallmentBusiness.saveInstallmentData) {
      const result = await window.InstallmentBusiness.saveInstallmentData();

      if (result) {
        console.log('✅ Enhanced save completed successfully');
        showToast('บันทึกข้อมูลการผ่อนชำระสำเร็จ!', 'success');

        // Auto navigate to step 4
        setTimeout(() => {
          goToStep(4);
        }, 1000);

        return result;
      }
    } else {
      console.warn('InstallmentBusiness.saveInstallmentData not available');
      showToast('ระบบยังไม่พร้อม กรุณาลองใหม่อีกครั้ง', 'warning');
      return false;
    }

  } catch (error) {
    console.error('❌ Enhanced save installment data failed:', error);

    if (error.code === 'DUPLICATE_SUBMISSION') {
      const wait = (error.retryAfter || 30);
      showToast(`การส่งข้อมูลซ้ำ กรุณารอ ${wait} วินาที`, 'warning');
      // keep button disabled until wait time elapsed
      setTimeout(() => {
        if (payBtn) payBtn.disabled = false;
      }, wait * 1000);
    } else if (error.code === 'IMEI_ALREADY_IN_USE') {
      showToast(error.message, 'warning');
    } else {
      showToast(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`, 'error');
    }
    return false;
  } finally {
    if (loaderId && window.LoadingSystem && typeof window.LoadingSystem.hide === 'function') {
      window.LoadingSystem.hide(loaderId);
    }
    isSubmitting = false;
    if (payBtn && !payBtn.disabled) {
      // already re-enabled
    } else if (payBtn && !payBtn.disabled) {
      payBtn.disabled = false;
    }
  }
}

// =========================================
// GLOBAL ERROR HANDLING
// =========================================

window.addEventListener('error', (event) => {
  console.error('🚨 Global JavaScript Error:', event.error);
  showToast('เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
  showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  event.preventDefault();
});

// ล้างสถานะ step เมื่อออกจากหน้าเว็บ
window.addEventListener('beforeunload', () => {
  clearCurrentStepFromStorage();
  console.log('🧹 Cleared step state on page unload');
});

// =========================================
// EXPORT MAIN FUNCTIONS
// =========================================

window.InstallmentMain = {
  initialize: initializeSystem,
  goToStep,
  validateStep1,
  validateStep2,
  validateStep3,
  updateCartDisplay,
  updateStep3Display,
  resetAllData,
  createNewOrder,
  performProductSearch,
  resetProductSearch,
  performCustomerSearch,
  addProductByBarcode,
  waitForModules,
  // Step state management
  saveCurrentStep,
  getCurrentStepFromStorage,
  clearCurrentStepFromStorage,
  // Contact Address Functions
  toggleContactAddress,
  copyMainToContactAddress,
  clearContactAddress,
  updateContactAddressPreview,
  showAddressComparison,
  setContactAddressReadonly,
  // System state
  get systemInitialized() { return systemInitialized; }
};

// =========================================
// EXPOSE FUNCTIONS FOR HTML INLINE EVENTS
// =========================================

// เปิดเผยฟังก์ชันสำหรับการเรียกใช้จาก HTML onchange, onclick เป็นต้น
window.toggleContactAddress = toggleContactAddress;
window.copyMainToContactAddress = copyMainToContactAddress;
window.clearContactAddress = clearContactAddress;
window.updateContactAddressPreview = updateContactAddressPreview;
window.setContactAddressReadonly = setContactAddressReadonly;

// เปิดเผยฟังก์ชันอื่น ๆ ที่จำเป็น (หลีกเลี่ยงการซ้ำ)
window.getElementById = getElementById;
// Note: showToast now uses InstallmentCore.showToast to avoid duplication
window.showToast = showToast;
// Note: debounce uses InstallmentUI.debounce when available
window.debounce = debounce;
window.throttle = throttle;

console.log('✅ Installment Main Module loaded');
console.log('📋 Available functions:', Object.keys(window.InstallmentMain));



// ✅ เพิ่ม Recovery Mechanism สำหรับ modules ที่หายไป
async function recoverMissingModules() {
  console.log('⚡ Fast recovery of missing modules...');

  const missingModules = [];
  const moduleStatus = checkModulesStatus();

  // ✅ ใช้ Object-based approach เพื่อความเร็ว
  const fallbackModules = {
    InstallmentCore: () => ({
      showToast: (msg, type) => console.log(`Toast [${type}]: ${msg}`),
      formatPrice: (num) => Number(num).toLocaleString(),
      validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      validatePhone: (phone) => /^0\d{9}$/.test(phone.replace(/\D/g, '')),
      validateIdCard: (id) => /^\d{13}$/.test(id),
      getBranchCode: () => window.BRANCH_CODE || 'PATTANI',
      initialized: true
    }),

    InstallmentUI: () => ({
      showToast: window.InstallmentCore?.showToast || ((msg, type) => console.log(`Toast [${type}]: ${msg}`)),
      getCurrentStep: () => {
        const active = document.querySelector('.step-content.active');
        return active ? parseInt(active.id.replace('step', '')) : 1;
      },
      showLoading: () => {},
      hideLoading: () => {}
    }),

    InstallmentProduct: () => ({
      cartItems: [],
      getCartItems: () => window.cartItems || [],
      renderCart: () => console.log('Cart render fallback'),
      updateCartCount: () => console.log('Cart count update fallback'),
      addToCart: () => console.log('Add to cart fallback')
    }),

    InstallmentAPI: () => ({
      loadBranchInfo: async () => console.log('Branch info load fallback'),
      loadBranchInstallments: async () => console.log('Branch installments load fallback'),
      saveInstallmentData: async () => ({ success: false, message: 'API fallback mode' })
    }),

    InstallmentBusiness: () => ({
      validateForm: () => true,
      getCurrentStep: () => 1,
      goToStep: (step) => console.log(`Navigate to step ${step} (fallback)`)
    }),

    InstallmentPDFIntegration: () => ({
      downloadQuotationPDF: async () => console.log('PDF download fallback'),
      downloadInvoicePDF: async () => console.log('PDF download fallback'),
      downloadReceiptPDF: async () => console.log('PDF download fallback')
    })
  };

  // ✅ เช็คและสร้าง fallback modules แบบ parallel
  Object.entries(fallbackModules).forEach(([moduleName, createFallback]) => {
    if (typeof window[moduleName] === 'undefined') {
      missingModules.push(moduleName);
      window[moduleName] = createFallback();
      console.debug(`✅ ${moduleName} fallback created (normal operation)`);
    }
  });

  // ✅ Create email-related function fallbacks
  const emailFunctions = {
    initializeEmailDocumentSettings: () => {
      try {
        console.log('🔄 Running initializeEmailDocumentSettings fallback...');

        const customerEmailInput = document.getElementById('customerEmail');
        if (customerEmailInput) {
          customerEmailInput.addEventListener('input', function() {
            if (typeof updateEmailPreview === 'function') updateEmailPreview();
            if (typeof checkEmailRequirement === 'function') checkEmailRequirement();
          });

          customerEmailInput.addEventListener('blur', function() {
            if (typeof updateEmailPreview === 'function') updateEmailPreview();
            if (typeof checkEmailRequirement === 'function') checkEmailRequirement();
          });
          console.log('✅ Email input listeners attached (fallback)');
        }

        const checkboxes = document.querySelectorAll('input[name="emailDocuments"]');
        checkboxes.forEach(checkbox => {
          checkbox.addEventListener('change', function() {
            if (typeof updateEmailDocumentSelection === 'function') updateEmailDocumentSelection();
            if (typeof checkEmailRequirement === 'function') checkEmailRequirement();

            try {
              if (typeof getSelectedEmailDocuments === 'function') {
                window.selectedEmailDocuments = getSelectedEmailDocuments();
                console.log('📧 Saved selected documents (fallback):', window.selectedEmailDocuments);
              }
            } catch (e) {
              console.warn('⚠️ Could not save selected documents in fallback:', e);
            }
          });
        });
        console.log(`✅ ${checkboxes.length} email document checkboxes initialized (fallback)`);
        console.log('✅ Email document settings initialized (fallback mode)');
        return true;
      } catch (error) {
        console.error('❌ Error in initializeEmailDocumentSettings fallback:', error);
        return false;
      }
    },

    updateEmailDocumentSelection: () => {
      console.log('📧 updateEmailDocumentSelection fallback called');
    },

    updateEmailPreview: () => {
      console.log('📧 updateEmailPreview fallback called');
    },

    checkEmailRequirement: () => {
      console.log('📧 checkEmailRequirement fallback called');
      return true;
    },

    getSelectedEmailDocuments: () => {
      const checkboxes = document.querySelectorAll('input[name="emailDocuments"]:checked');
      const selected = Array.from(checkboxes).map(cb => cb.value);
      console.log('📧 getSelectedEmailDocuments fallback:', selected);
      return selected;
    },

    getEmailCheckboxes: () => {
      const checkboxes = document.querySelectorAll('input[name="emailDocuments"]');
      console.log('📧 getEmailCheckboxes fallback:', checkboxes.length);
      return checkboxes;
    },

    updateEmailAutomationIndicator: () => {
      console.log('📧 updateEmailAutomationIndicator fallback called');
    }
  };

  // Create email function fallbacks if missing
  Object.entries(emailFunctions).forEach(([funcName, fallbackFunc]) => {
    if (typeof window[funcName] !== 'function') {
      window[funcName] = fallbackFunc;
      console.debug(`✅ ${funcName} fallback created (normal operation)`);
      missingModules.push(funcName);
    }
  });

  if (missingModules.length > 0) {
    console.debug(`⚡ Fast fallbacks created for: ${missingModules.join(', ')}`);

    // แสดง toast แจ้งผู้ใช้แบบไม่รอ (เฉพาะ modules หลัก)
    const mainModules = missingModules.filter(mod =>
      ['InstallmentCore', 'InstallmentAPI', 'InstallmentUI', 'InstallmentBusiness', 'InstallmentProduct'].includes(mod)
    );

    if (mainModules.length > 0) {
    setTimeout(() => {
      if (window.InstallmentCore?.showToast) {
        window.InstallmentCore.showToast(
            `ระบบใช้โหมดสำรอง (${mainModules.length} modules)`,
            'info',
          'โหมดสำรอง',
            2000
        );
      }
    }, 100);
    }

    return { recovered: true, modules: missingModules };
  }

  console.log('✅ All modules available, no recovery needed');
  return { recovered: false, modules: [] };
}

// เรียกใช้ recovery mechanism ทันทีที่โหลดสคริปต์
recoverMissingModules().then(recovered => {
  if (recovered && recovered.recovered) {
    console.debug('🔧 Recovery process completed - ระบบพร้อมใช้งานในโหมดสำรอง');
  } else {
    console.debug('✅ ระบบพร้อมใช้งานปกติ');
  }
}).catch(error => {
  console.error('❌ Recovery mechanism failed:', error);
});

// ลบฟังก์ชัน showToast ซ้ำ - ใช้ InstallmentCore.showToast() โดยตรง
// ลบฟังก์ชัน validation ซ้ำ - ใช้ InstallmentCore.validateXX() โดยตรง

// ✅ Emergency Toast System - แก้ไข Toast container not found
function ensureToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    // ✅ ตรวจสอบว่า document.body พร้อมใช้งาน
    if (!document.body) {
      console.warn('⚠️ document.body not ready, waiting...');

      // รอให้ DOM พร้อมหรือสร้าง container ชั่วคราว
      if (document.readyState === 'loading') {
        // สร้าง temporary container ใน document.documentElement
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container fixed top-4 right-4 z-50 space-y-2 pointer-events-none';
        container.style.cssText = `
          position: fixed !important;
          top: 1rem !important;
          right: 1rem !important;
          z-index: 9999 !important;
          max-width: 400px !important;
          pointer-events: none !important;
        `;

        // แนบเข้ากับ documentElement ชั่วคราว
        document.documentElement.appendChild(container);
        console.log('⚠️ Toast container created temporarily (document.body not ready)');

        // ย้ายไปยัง document.body เมื่อพร้อม
        const moveToBody = () => {
          if (document.body && container && container.parentNode === document.documentElement) {
            document.body.appendChild(container);
            console.log('✅ Toast container moved to document.body');
          }
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', moveToBody);
        } else {
          setTimeout(moveToBody, 100);
        }

        return container;
      } else {
        // DOM โหลดแล้วแต่ document.body ยังไม่มี (ไม่น่าเกิดขึ้น)
        console.error('❌ document.body is null despite DOM being loaded');
        return null;
      }
    }

    // สร้าง container ปกติเมื่อ document.body พร้อม
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container fixed top-4 right-4 z-50 space-y-2 pointer-events-none';
    container.style.cssText = `
      position: fixed !important;
      top: 1rem !important;
      right: 1rem !important;
      z-index: 9999 !important;
      max-width: 400px !important;
      pointer-events: none !important;
    `;

    try {
      document.body.appendChild(container);
      console.log('✅ Toast container created');
    } catch (error) {
      console.error('❌ Failed to create toast container:', error);
      return null;
    }
  }
  return container;
}

// ✅ Emergency ToastSystem
if (!window.ToastSystem) {
  window.ToastSystem = {
    show: function(message, type = 'info', title = '', duration = 5000) {
      try {
        const container = ensureToastContainer();

        // ✅ ตรวจสอบว่า container พร้อมใช้งาน
        if (!container) {
          console.warn('⚠️ Toast container not available, using console fallback');
          console.log(`Toast [${type}]: ${title ? title + ' - ' : ''}${message}`);
          return null;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} bg-white border rounded-lg shadow-lg p-4 mb-2 pointer-events-auto opacity-0 translate-x-full transition-all duration-300`;

        const iconMap = {
          success: '✅',
          error: '❌',
          warning: '⚠️',
          info: 'ℹ️'
        };

        const colorMap = {
          success: 'border-green-200 bg-green-50',
          error: 'border-red-200 bg-red-50',
          warning: 'border-yellow-200 bg-yellow-50',
          info: 'border-blue-200 bg-blue-50'
        };

        toast.className += ` ${colorMap[type] || colorMap.info}`;

        toast.innerHTML = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 18px;">
              ${iconMap[type] || iconMap.info}
            </div>
            <div style="flex: 1;">
              ${title ? `<div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${title}</div>` : ''}
              <div style="font-size: 14px; color: #374151;">${message}</div>
            </div>
            <button style="color: #9CA3AF; hover:color: #6B7280; font-size: 18px; background: none; border: none; cursor: pointer; padding: 0; line-height: 1;" onclick="this.parentElement.parentElement.remove()">
              ×
            </button>
          </div>
        `;

        // ✅ ป้องกัน appendChild error
        try {
          container.appendChild(toast);
        } catch (appendError) {
          console.error('❌ Failed to append toast to container:', appendError);
          console.log(`Toast [${type}]: ${title ? title + ' - ' : ''}${message}`);
          return null;
        }

        // Animate in
        setTimeout(() => {
          if (toast && toast.classList) {
            toast.classList.remove('opacity-0', 'translate-x-full');
          }
        }, 10);

        // Auto remove
        setTimeout(() => {
          if (toast && toast.parentNode) {
            toast.classList.add('opacity-0', 'translate-x-full');
            setTimeout(() => {
              if (toast && toast.parentNode) {
                toast.parentNode.removeChild(toast);
              }
            }, 300);
          }
        }, duration);

        return toast;

      } catch (error) {
        console.error('❌ ToastSystem.show error:', error);
        console.log(`Toast [${type}]: ${title ? title + ' - ' : ''}${message}`);
        return null;
      }
    }
  };
  console.log('✅ Emergency ToastSystem created');
}

// ✅ Central showToast function to avoid duplication
function showToast(message, type = 'info', title = null, duration = 3000) {
  try {
    // ✅ ป้องกัน error ในการแสดง toast
    if (!message) {
      console.warn('⚠️ showToast called with empty message');
      return null;
    }

    // ✅ ใช้ Emergency ToastSystem ถ้าไม่มี ToastSystem
    if (window.ToastSystem?.show) {
      return window.ToastSystem.show(message, type, title, duration);
    } else if (window.InstallmentCore?.showToast) {
      return window.InstallmentCore.showToast(message, type, { title, duration });
    } else if (window.InstallmentUI?.showToast) {
      return window.InstallmentUI.showToast(message, type, { title, duration });
    } else {
      // Final fallback - แสดงใน console
      console.log(`Toast [${type}]: ${title ? title + ' - ' : ''}${message}`);
      return null;
    }
  } catch (error) {
    console.error('❌ showToast error:', error);
    console.log(`Toast [${type}]: ${title ? title + ' - ' : ''}${message}`);
    return null;
  }
}

// ✅ Initialize core components
async function initializeCoreComponents() {
  console.log('🔧 Initializing core components...');

  // Initialize InstallmentCore first
  if (window.InstallmentCore?.initializeCore) {
    await window.InstallmentCore.initializeCore();
  }

  // Initialize API connections
  if (window.InstallmentAPI?.initialize) {
    await window.InstallmentAPI.initialize();
  }

  // Initialize Business Logic
  if (window.InstallmentBusiness?.initialize) {
    await window.InstallmentBusiness.initialize();
  }

  // Initialize UI components
  if (window.InstallmentUI?.initialize) {
    await window.InstallmentUI.initialize();
  }

  console.log('✅ Core components initialized');
}

// ✅ Load initial data
async function loadInitialData() {
  console.log('📊 Loading initial data...');

  try {
    // Load branch data
    if (window.InstallmentAPI?.loadBranchInfo) {
      await window.InstallmentAPI.loadBranchInfo();
    }

    // Load address data
    if (window.InstallmentAPI?.loadAddressData) {
      await window.InstallmentAPI.loadAddressData();
    }

    // Load product data
    if (window.InstallmentProduct?.loadLevel1) {
      await window.InstallmentProduct.loadLevel1();
    }

    // Load saved progress
    if (window.InstallmentBusiness?.loadProgress) {
      window.InstallmentBusiness.loadProgress();
    }

    console.log('✅ Initial data loaded');

  } catch (error) {
    console.error('⚠️ Error loading initial data:', error);
    // Don't fail the entire initialization for data loading errors
  }
}