// frontend-fixes.js
// แก้ไขปัญหาการส่งข้อมูลซ้ำในส่วน Frontend
// Created: 2025-07-08 เพื่อแก้ไขปัญหาจาก log

console.log('🔧 Frontend Double Submission Prevention Fixes');
console.log('==============================================');

// Button state management
class ButtonStateManager {
  constructor() {
    this.buttonStates = new Map();
    this.requestInProgress = new Map();
    this.DEBOUNCE_TIME = 3000; // 3 seconds
  }

  // ตั้งค่าปุ่มเป็น loading state
  setButtonLoading(buttonId, loadingText = 'กำลังดำเนินการ...') {
    const button = document.getElementById(buttonId);
    if (!button) return false;

    // เก็บข้อมูลเดิม
    if (!this.buttonStates.has(buttonId)) {
      this.buttonStates.set(buttonId, {
        originalText: button.textContent || button.innerHTML,
        originalDisabled: button.disabled,
        originalClass: button.className
      });
    }

    // ตั้งค่า loading state
    button.disabled = true;
    button.textContent = loadingText;
    button.classList.add('btn-loading');

    console.log(`🔄 Button ${buttonId} set to loading state`);
    return true;
  }

  // คืนค่าปุ่มเป็นสถานะเดิม
  resetButton(buttonId) {
    const button = document.getElementById(buttonId);
    const originalState = this.buttonStates.get(buttonId);

    if (!button || !originalState) return false;

    button.disabled = originalState.originalDisabled;
    button.textContent = originalState.originalText;
    button.className = originalState.originalClass;

    this.buttonStates.delete(buttonId);
    console.log(`✅ Button ${buttonId} reset to original state`);
    return true;
  }

  // ตรวจสอบว่า request กำลังดำเนินการอยู่หรือไม่
  isRequestInProgress(requestKey) {
    return this.requestInProgress.has(requestKey);
  }

  // ตั้งค่า request เป็น in progress
  setRequestInProgress(requestKey) {
    this.requestInProgress.set(requestKey, Date.now());

    // Auto cleanup after debounce time
    setTimeout(() => {
      this.requestInProgress.delete(requestKey);
    }, this.DEBOUNCE_TIME);
  }

  // ล้าง request in progress
  clearRequestInProgress(requestKey) {
    this.requestInProgress.delete(requestKey);
  }
}

// สร้าง instance สำหรับใช้งาน
const buttonManager = new ButtonStateManager();

// Form submission prevention
class FormSubmissionManager {
  constructor() {
    this.submittedForms = new Set();
    this.COOLDOWN_TIME = 5000; // 5 seconds
  }

  // ตรวจสอบและป้องกันการ submit ซ้ำ
  preventDuplicateSubmission(formId, formData = null) {
    const formKey = this.generateFormKey(formId, formData);

    if (this.submittedForms.has(formKey)) {
      console.warn('⚠️ Duplicate form submission prevented:', formKey);
      return false;
    }

    this.submittedForms.add(formKey);

    // Auto cleanup after cooldown
    setTimeout(() => {
      this.submittedForms.delete(formKey);
      console.log('🧹 Form submission cooldown ended:', formKey);
    }, this.COOLDOWN_TIME);

    console.log('✅ Form submission allowed:', formKey);
    return true;
  }

  // สร้าง key สำหรับ form
  generateFormKey(formId, formData) {
    if (formData) {
      const dataString = JSON.stringify(formData);
      return `${formId}-${this.hashCode(dataString)}`;
    }
    return `${formId}-${Date.now()}`;
  }

  // สร้าง hash code จากข้อมูล
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // ล้าง form submission state
  clearFormSubmission(formId, formData = null) {
    const formKey = this.generateFormKey(formId, formData);
    this.submittedForms.delete(formKey);
  }
}

// สร้าง instance สำหรับใช้งาน
const formManager = new FormSubmissionManager();

// Network request manager
class NetworkRequestManager {
  constructor() {
    this.pendingRequests = new Map();
    this.requestHistory = new Map();
    this.RETRY_DELAY = 2000; // 2 seconds
    this.MAX_RETRIES = 3;
  }

  // ทำ HTTP request พร้อมการป้องกันซ้ำ
  async makeRequest(url, options = {}, requestKey = null) {
    const key = requestKey || this.generateRequestKey(url, options);

    // ตรวจสอบ request ที่กำลังดำเนินการ
    if (this.pendingRequests.has(key)) {
      console.warn('⚠️ Duplicate request prevented:', key);
      throw new Error('คำขอกำลังดำเนินการอยู่ กรุณารอสักครู่');
    }

    try {
      this.pendingRequests.set(key, Date.now());

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': key,
          ...options.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // บันทึกประวัติการส่ง request สำเร็จ
      this.requestHistory.set(key, {
        timestamp: Date.now(),
        success: true,
        response: data
      });

      console.log('✅ Request successful:', key);
      return data;

    } catch (error) {
      console.error('❌ Request failed:', key, error.message);

      // บันทึกประวัติการส่ง request ล้มเหลว
      this.requestHistory.set(key, {
        timestamp: Date.now(),
        success: false,
        error: error.message
      });

      throw error;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  // สร้าง key สำหรับ request
  generateRequestKey(url, options) {
    const method = options.method || 'GET';
    const body = options.body || '';
    const keyData = `${method}-${url}-${body}`;
    return `req-${this.hashCode(keyData)}`;
  }

  // Hash function
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // ตรวจสอบว่า request กำลังดำเนินการ
  isPending(requestKey) {
    return this.pendingRequests.has(requestKey);
  }

  // ดูประวัติ request
  getRequestHistory() {
    return Array.from(this.requestHistory.entries()).map(([key, data]) => ({
      key,
      ...data,
      timeAgo: Date.now() - data.timestamp
    }));
  }
}

// สร้าง instance สำหรับใช้งาน
const networkManager = new NetworkRequestManager();

// Installment submission wrapper
async function submitInstallmentForm(formData, buttonId = 'btnSubmitInstallment') {
  console.log('📋 Starting installment form submission...');

  try {
    // 1. ตรวจสอบ form duplicate
    if (!formManager.preventDuplicateSubmission('installment-form', formData)) {
      throw new Error('กรุณารอสักครู่ก่อนส่งข้อมูลอีกครั้ง');
    }

    // 2. ตั้งค่าปุ่มเป็น loading
    buttonManager.setButtonLoading(buttonId, 'กำลังสร้างสัญญา...');

    // 3. ส่ง request
    const requestKey = `installment-${Date.now()}`;
    const response = await networkManager.makeRequest('/api/installment', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    }, requestKey);

    console.log('✅ Installment submission successful:', response);
    return response;

  } catch (error) {
    console.error('❌ Installment submission failed:', error.message);

    // แสดง error message
    if (typeof window.InstallmentUI !== 'undefined') {
      window.InstallmentUI.showToast(error.message, 'error');
    } else {
      alert(error.message);
    }

    throw error;
  } finally {
    // 4. คืนค่าปุ่ม
    buttonManager.resetButton(buttonId);
  }
}

// Event listener เพื่อป้องกัน double click
function addDoubleClickPrevention() {
  // ป้องกัน double click บนปุ่มสำคัญ
  const importantButtons = [
    'btnSubmitInstallment',
    'btnSaveInstallment',
    'btnCreateContract',
    'btnSubmitForm',
    'submitBtn'
  ];

  importantButtons.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (button) {
      let lastClickTime = 0;
      const DOUBLE_CLICK_THRESHOLD = 2000; // 2 seconds

      button.addEventListener('click', function(e) {
        const now = Date.now();
        if (now - lastClickTime < DOUBLE_CLICK_THRESHOLD) {
          e.preventDefault();
          e.stopPropagation();
          console.warn(`⚠️ Double click prevented on ${buttonId}`);
          return false;
        }
        lastClickTime = now;
      }, true);

      console.log(`🛡️ Double click prevention added to ${buttonId}`);
    }
  });
}

// Form validation และ cleanup
function setupFormValidation() {
  // ป้องกัน multiple form submission
  const forms = document.querySelectorAll('form');

  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      const formId = this.id || 'unknown-form';

      if (!formManager.preventDuplicateSubmission(formId)) {
        e.preventDefault();
        console.warn(`⚠️ Form submission prevented: ${formId}`);
        return false;
      }
    });
  });

  console.log(`🛡️ Form validation setup for ${forms.length} forms`);
}

// Keyboard shortcut prevention
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // ป้องกัน Ctrl+R หรือ F5 during request
    if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
      if (networkManager.pendingRequests.size > 0) {
        e.preventDefault();
        console.warn('⚠️ Page refresh prevented during pending requests');
        alert('กรุณารอให้การดำเนินการเสร็จสิ้นก่อนรีเฟรชหน้า');
        return false;
      }
    }

    // ป้องกัน Enter key spam
    if (e.key === 'Enter') {
      const target = e.target;
      if (target.tagName === 'BUTTON' || target.type === 'submit') {
        const lastEnterTime = target.dataset.lastEnter || 0;
        const now = Date.now();

        if (now - lastEnterTime < 1000) { // 1 second
          e.preventDefault();
          console.warn('⚠️ Enter key spam prevented');
          return false;
        }

        target.dataset.lastEnter = now;
      }
    }
  });
}

// Auto-save prevention during submission
function setupAutoSavePrevention() {
  let submissionInProgress = false;

  // Override auto-save functions during submission
  const originalAutoSave = window.autoSave;

  window.autoSave = function(...args) {
    if (submissionInProgress) {
      console.log('⏸️ Auto-save skipped during submission');
      return;
    }

    if (originalAutoSave) {
      return originalAutoSave.apply(this, args);
    }
  };

  // Hook into submission process
  window.addEventListener('installmentSubmissionStart', () => {
    submissionInProgress = true;
    console.log('🔒 Auto-save disabled during submission');
  });

  window.addEventListener('installmentSubmissionEnd', () => {
    submissionInProgress = false;
    console.log('🔓 Auto-save re-enabled after submission');
  });
}

// Initialize all fixes
function initializeFrontendFixes() {
  console.log('🚀 Initializing Frontend Fixes...');

  addDoubleClickPrevention();
  setupFormValidation();
  setupKeyboardShortcuts();
  setupAutoSavePrevention();

  console.log('✅ Frontend Fixes initialized successfully');
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ButtonStateManager,
    FormSubmissionManager,
    NetworkRequestManager,
    buttonManager,
    formManager,
    networkManager,
    submitInstallmentForm,
    initializeFrontendFixes
  };
} else {
  // For browser use
  window.ButtonStateManager = ButtonStateManager;
  window.FormSubmissionManager = FormSubmissionManager;
  window.NetworkRequestManager = NetworkRequestManager;
  window.buttonManager = buttonManager;
  window.formManager = formManager;
  window.networkManager = networkManager;
  window.submitInstallmentForm = submitInstallmentForm;
  window.initializeFrontendFixes = initializeFrontendFixes;
}

// Auto-initialize when loaded
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFrontendFixes);
  } else {
    initializeFrontendFixes();
  }
}

console.log('✅ Frontend Double Submission Prevention Ready');
console.log('📋 Available functions:');
console.log('  - submitInstallmentForm(formData, buttonId)');
console.log('  - buttonManager.setButtonLoading(buttonId, text)');
console.log('  - formManager.preventDuplicateSubmission(formId, data)');
console.log('  - networkManager.makeRequest(url, options, key)');