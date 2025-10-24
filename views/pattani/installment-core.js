// ========================================
// INSTALLMENT CORE SYSTEM - Pattani Branch
// ระบบผ่อนชำระ สาขาปัตตานี - ไฟล์ JavaScript หลัก
// Version 1.0.1 - Fixed duplicate initialization issue
// ========================================

console.log('📦 Loading Installment Core Module v1.0.1...');

// =========================================
// GLOBAL CONSTANTS AND CONFIGURATION
// =========================================

// Initialize URL parameters first
if (!window.urlParams) {
  window.urlParams = new URLSearchParams(window.location.search);
}

// Branch Code Configuration - Single Source of Truth
window.BRANCH_CODE = window.urlParams.get('branch') || localStorage.getItem('activeBranch') || 'PATTANI';

// Store branch code in localStorage for persistence
if (window.urlParams.has('branch')) {
  localStorage.setItem('activeBranch', window.BRANCH_CODE);
}

// Update page title if branch name is provided
if (window.urlParams.has('name')) {
  document.title = `ระบบผ่อน - ${decodeURIComponent(window.urlParams.get('name'))}`;
}

// Global state variables
let isOnline = navigator.onLine;
let coreInitialized = false;
let installmentSocket = null;

// Global cart items (shared across modules)
window.cartItems = [];

// Memory management
let memoryCleanupInterval = null;
const eventListeners = new Map();

// Performance tracking
let performanceMetrics = {
  moduleLoadTime: 0,
  initTime: 0,
  totalQueries: 0,
  errors: [],
  domQueries: 0,
  cacheHits: 0
};

// =========================================
// DOM CACHE MANAGER FOR PERFORMANCE
// =========================================

class DOMCacheManager {
  constructor() {
    this.cache = new Map();
    this.observers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0
    };
  }

  // Get cached element or query and cache it
  get(elementId) {
    if (this.cache.has(elementId)) {
      this.stats.hits++;
      performanceMetrics.cacheHits++;
      return this.cache.get(elementId);
    }

    const element = document.getElementById(elementId);
    if (element) {
      this.cache.set(elementId, element);
      this.setupObserver(elementId, element);
      this.stats.misses++;
      performanceMetrics.domQueries++;
    }
    return element;
  }

  // Setup mutation observer for element
  setupObserver(elementId, element) {
    if (this.observers.has(elementId)) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if element was removed from DOM
          if (!document.contains(element)) {
            this.invalidate(elementId);
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.set(elementId, observer);
  }

  // Invalidate cached element
  invalidate(elementId) {
    if (this.cache.has(elementId)) {
      this.cache.delete(elementId);
      this.stats.invalidations++;
    }

    const observer = this.observers.get(elementId);
    if (observer) {
      observer.disconnect();
      this.observers.delete(elementId);
    }
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.stats = { hits: 0, misses: 0, invalidations: 0 };
  }

  // Get cache statistics
  getStats() {
    return {
      cacheSize: this.cache.size,
      observerCount: this.observers.size,
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) * 100
    };
  }

  // Preload common elements
  preloadCommonElements() {
    const commonElements = [
      'customerFirstName', 'customerLastName', 'customerIdCard',
      'customerPhone', 'customerEmail', 'customerBirthDate', 'customerAge',
      'level1Grid', 'level2Grid', 'level3Grid', 'cartItems',
      'step1', 'step2', 'step3', 'step4', 'productSearchQuery',
      'btnStep1ToStep2', 'btnStep2ToStep3', 'btnStep3ToStep4',
      'customerSearchResults', 'formProgress', 'connectionStatus'
    ];

    commonElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        this.cache.set(id, element);
        this.setupObserver(id, element);
      }
    });
  }

  // Batch get elements
  getMultiple(elementIds) {
    return elementIds.map(id => this.get(id));
  }
}

// Global DOM cache instance
const domCache = new DOMCacheManager();

// Enhanced getElementById function
function getElementById(elementId) {
  return domCache.get(elementId);
}

console.log(`[InstallmentCore] Using branch code: ${window.BRANCH_CODE}`);

// =========================================
// CORE UTILITY FUNCTIONS - SINGLE SOURCE
// =========================================

/**
 * Get current branch code
 * @returns {string} Branch code
 */
function getBranchCode() {
  return window.BRANCH_CODE;
}

/**
 * Format price with Thai locale
 * @param {number|string} num - Number to format
 * @returns {string} Formatted price
 */
function formatPrice(num) {
  if (typeof num !== 'number') {
    num = parseFloat(num) || 0;
  }
  return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Show toast notification - CENTRAL IMPLEMENTATION
 * @param {string} message - Message to show
 * @param {string} type - Type of toast (info, success, error, warning)
 * @param {Object} options - Additional options
 */
function showToast(message, type = 'info', options = {}) {
  // ✅ ตรวจสอบและสร้าง Toast container หากไม่มี
  ensureToastContainer();

  // Direct call to ToastSystem to avoid circular reference
  if (window.ToastSystem && typeof window.ToastSystem.show === 'function') {
    return window.ToastSystem.show(message, type, options.title || '', options.duration || 5000);
  }
  // ✅ ใช้ Simple Toast System หากไม่มี ToastSystem
  else {
    return showSimpleToast(message, type, options);
  }
}

// ✅ ฟังก์ชันสร้าง Toast container
function ensureToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    // ✅ ตรวจสอบว่า document.body พร้อมใช้งาน
    if (!document.body) {
      console.warn('⚠️ document.body not ready in InstallmentCore, waiting...');

      // รอให้ DOM พร้อมหรือสร้าง container ชั่วคราว
      if (document.readyState === 'loading') {
        // สร้าง temporary container ใน document.documentElement
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        container.style.cssText = `
          position: fixed !important;
          top: 1rem !important;
          right: 1rem !important;
          z-index: 9999 !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0.5rem !important;
          pointer-events: none !important;
          max-width: 300px !important;
        `;

        // แนบเข้ากับ documentElement ชั่วคราว
        try {
          document.documentElement.appendChild(container);
          console.debug('⚠️ Toast container created temporarily on documentElement');

          // ย้ายไปยัง document.body เมื่อพร้อม
          const moveToBody = () => {
            if (document.body && container && container.parentNode === document.documentElement) {
              document.body.appendChild(container);
              console.debug('✅ Toast container moved to document.body');
            }
          };

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', moveToBody);
          } else {
            setTimeout(moveToBody, 100);
          }
        } catch (error) {
          console.error('❌ Failed to create temporary toast container:', error);
    return null;
  }

        return container;
      } else {
        // DOM โหลดแล้วแต่ document.body ยังไม่มี (ไม่น่าเกิดขึ้น)
        console.error('❌ document.body is null despite DOM being loaded (InstallmentCore)');
        return null;
      }
    }

    // สร้าง container ปกติเมื่อ document.body พร้อม
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.style.cssText = `
      position: fixed !important;
      top: 1rem !important;
      right: 1rem !important;
      z-index: 9999 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 0.5rem !important;
      pointer-events: none !important;
      max-width: 300px !important;
    `;

    try {
      document.body.appendChild(container);
      console.debug('✅ Toast container created in InstallmentCore');
    } catch (error) {
      console.error('❌ Failed to create toast container in InstallmentCore:', error);
      return null;
    }
  }
  return container;
}

// ✅ ฟังก์ชันแสดง Toast แบบง่าย
function showSimpleToast(message, type = 'info', options = {}) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  const { title, duration = 3000 } = options;

  const typeClasses = {
    info: 'bg-blue-500 text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-black',
    error: 'bg-red-500 text-white'
  };

  toast.className = `toast ${typeClasses[type] || typeClasses.info}`;
  toast.style.cssText = `
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    pointer-events: auto;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    margin-bottom: 8px;
    min-width: 200px;
  `;

  toast.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="flex: 1;">
        ${title ? `<div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${title}</div>` : ''}
        <div style="font-size: 14px;">${message}</div>
      </div>
      <button style="margin-left: 8px; font-size: 18px; font-weight: bold; background: none; border: none; color: inherit; cursor: pointer; padding: 0; line-height: 1;" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;

  container.appendChild(toast);

  // แสดง Toast
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 10);

  // ซ่อน Toast หลังจากเวลาที่กำหนด
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);

  return toast;
}

// =========================================
// VALIDATION FUNCTIONS - CENTRALIZED
// =========================================

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {boolean} Is valid
 */
function validateRequired(value, fieldName) {
  if (!value || value.toString().trim() === '') {
    throw new Error(`กรุณากรอก${fieldName}`);
  }
  return true;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid
 */
function validateEmail(email) {
  if (!email) return true; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
  }
  return true;
}

/**
 * Validate Thai phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Is valid
 */
function validatePhone(phone) {
  if (!phone) {
    throw new Error('กรุณากรอกหมายเลขโทรศัพท์');
  }

  // Remove spaces and dashes
  const cleanPhone = phone.replace(/[\s-]/g, '');

  // Thai mobile and landline patterns
  const mobilePattern = /^(06|08|09)\d{8}$/;
  const landlinePattern = /^0[2-7]\d{7,8}$/;

  if (!mobilePattern.test(cleanPhone) && !landlinePattern.test(cleanPhone)) {
    throw new Error('หมายเลขโทรศัพท์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย 06, 08, 09 หรือ 02-07)');
  }
  return true;
}

/**
 * Validate Thai national ID card
 * @param {string} idCard - ID card number to validate
 * @returns {boolean} Is valid
 */
function validateIdCard(idCard) {
  if (!idCard || !/^[0-9]{13}$/.test(idCard)) {
    throw new Error('เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก');
  }

  // ✅ ยอมรับเลขบัตรใดก็ได้ที่เป็น 13 หลัก (ไม่ตรวจสอบ checksum)
  console.log('✅ ID card validation: รูปแบบถูกต้อง (13 หลัก)');
  return true;
}

/**
 * Validate amount/number
 * @param {number|string} amount - Amount to validate
 * @param {string} fieldName - Field name for error message
 * @returns {boolean} Is valid
 */
function validateAmount(amount, fieldName = 'จำนวนเงิน') {
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount < 0) {
    throw new Error(`${fieldName}ต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0`);
  }
  return true;
}

// =========================================
// NETWORK STATUS MONITORING
// =========================================

function updateNetworkStatus(online) {
  isOnline = online;
  const statusEl = document.getElementById('connectionStatus');
  const textEl = document.getElementById('connectionText');

  if (statusEl && textEl) {
    statusEl.classList.remove('online', 'offline');
    statusEl.classList.add(online ? 'online' : 'offline');
    textEl.textContent = online ? '🟢 ออนไลน์' : '🔴 ออฟไลน์';
  }

  // Disable/enable form submissions based on network status
  const submitButtons = document.querySelectorAll('button[type="submit"], .btn-submit');
  submitButtons.forEach(btn => {
    btn.disabled = !online;
    if (!online) {
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  });
}

// =========================================
// LOCAL STORAGE UTILITIES
// =========================================

function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
}

function loadFromLocalStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

function removeFromLocalStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
    return false;
  }
}

// =========================================
// SESSION MANAGEMENT
// =========================================

function initializeSession() {
  const sessionId = Date.now().toString();
  const sessionData = {
    id: sessionId,
    branchCode: getBranchCode(),
    startTime: new Date().toISOString(),
    userAgent: navigator.userAgent,
    page: 'installment'
  };

  saveToLocalStorage('installment_session', sessionData);
  window.currentSession = sessionData;

  console.log('📝 Session initialized:', sessionId);
  return sessionData;
}

function getSession() {
  return window.currentSession || loadFromLocalStorage('installment_session');
}

function clearSession() {
  window.currentSession = null;
  removeFromLocalStorage('installment_session');
}

// =========================================
// PERFORMANCE MONITORING
// =========================================

function logPerformance(action, startTime) {
  const endTime = performance.now();
  const duration = endTime - startTime;
  console.log(`⏱️ ${action}: ${duration.toFixed(2)}ms`);

  // Log slow operations
  if (duration > 1000) {
    console.warn(`🐌 Slow operation detected: ${action} took ${duration.toFixed(2)}ms`);
  }
}

// Performance monitoring and analytics
function trackPerformanceMetrics() {
  // Track memory usage
  if (performance.memory) {
    const memoryInfo = {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
    };

    performanceMetrics.memory = memoryInfo;

    // Warn if memory usage is high
    if (memoryInfo.used > 100) {
      console.warn(`🔥 High memory usage: ${memoryInfo.used}MB used`);
    }
  }

  // Track DOM metrics
  const domMetrics = {
    elementCount: document.querySelectorAll('*').length,
    cacheSize: domCache.cache.size,
    cacheHitRate: domCache.getStats().hitRate
  };

  performanceMetrics.dom = domMetrics;

  // Log metrics every 30 seconds
  setTimeout(trackPerformanceMetrics, 30000);
}

// Performance report
function getPerformanceReport() {
  const report = {
    ...performanceMetrics,
    timestamp: new Date().toISOString(),
    domCacheStats: domCache.getStats(),
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };

  return report;
}

// Performance optimization suggestions
function getOptimizationSuggestions() {
  const suggestions = [];
  const stats = domCache.getStats();

  if (stats.hitRate < 50) {
    suggestions.push('DOM Cache hit rate is low (<50%). Consider preloading more elements.');
  }

  if (performanceMetrics.memory && performanceMetrics.memory.used > 100) {
    suggestions.push('Memory usage is high (>100MB). Consider optimizing memory usage.');
  }

  if (performanceMetrics.dom && performanceMetrics.dom.elementCount > 5000) {
    suggestions.push('DOM tree is large (>5000 elements). Consider virtual scrolling or lazy loading.');
  }

  return suggestions;
}

// =========================================
// MEMORY MANAGEMENT
// =========================================

// Enhanced event listener management to prevent memory leaks
function addEventListenerWithCleanup(element, event, handler, options = {}) {
  if (!element) return null;

  const listenerId = `${element.id || 'anonymous'}_${event}_${Date.now()}`;
  element.addEventListener(event, handler, options);

  eventListeners.set(listenerId, {
    element,
    event,
    handler,
    options
  });

  return listenerId;
}

// Remove specific event listener
function removeEventListenerWithCleanup(listenerId) {
  const listener = eventListeners.get(listenerId);
  if (listener) {
    listener.element.removeEventListener(listener.event, listener.handler, listener.options);
    eventListeners.delete(listenerId);
    return true;
  }
  return false;
}

// Clean up all event listeners
function cleanupAllEventListeners() {
  eventListeners.forEach((listener, id) => {
    try {
      listener.element.removeEventListener(listener.event, listener.handler, listener.options);
    } catch (error) {
      console.warn(`Failed to remove event listener ${id}:`, error);
    }
  });
  eventListeners.clear();
  console.log('🧹 All event listeners cleaned up');
}

// Memory cleanup function
function performMemoryCleanup() {
  // Clear DOM cache of invalid elements
  domCache.cache.forEach((element, id) => {
    if (!document.contains(element)) {
      domCache.invalidate(id);
    }
  });

  // Clear expired data from localStorage
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('installment_temp_') || key.startsWith('cache_')) {
        const data = JSON.parse(localStorage.getItem(key));
        if (data.expires && Date.now() > data.expires) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn('Failed to cleanup localStorage:', error);
  }

  // Force garbage collection if available
  if (window.gc) {
    window.gc();
  }

  console.log('🧹 Memory cleanup performed');
}

// Start memory monitoring and cleanup
function startMemoryManagement() {
  if (memoryCleanupInterval) return;

  // Perform cleanup every 5 minutes
  memoryCleanupInterval = setInterval(performMemoryCleanup, 5 * 60 * 1000);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    cleanupAllEventListeners();
    if (memoryCleanupInterval) {
      clearInterval(memoryCleanupInterval);
    }
    domCache.clear();
    console.log('🧹 Memory cleanup on page unload');
  });

  console.log('📊 Memory management started');
}

// Stop memory management
function stopMemoryManagement() {
  if (memoryCleanupInterval) {
    clearInterval(memoryCleanupInterval);
    memoryCleanupInterval = null;
  }
  cleanupAllEventListeners();
  domCache.clear();
  console.log('🛑 Memory management stopped');
}

// =========================================
// ERROR HANDLING
// =========================================

function handleApiError(error, context = 'การดำเนินการ') {
  console.error(`API Error in ${context}:`, error);

  let message = `เกิดข้อผิดพลาดใน${context}`;

  if (error.message) {
    if (error.message.includes('401')) {
      message = 'กรุณาเข้าสู่ระบบใหม่';
      setTimeout(() => {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }, 2000);
    } else if (error.message.includes('403')) {
      message = 'คุณไม่มีสิทธิ์ในการดำเนินการนี้';
    } else if (error.message.includes('404')) {
      message = 'ไม่พบข้อมูลที่ต้องการ';
    } else if (error.message.includes('500')) {
      message = 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์';
    }
  }

  showToast(message, 'error');
  return message;
}

// =========================================
// SOCKET.IO SETUP AND REAL-TIME FEATURES
// =========================================

function initializeSocketIO() {
  if (typeof io === 'function' && !installmentSocket) {
    try {
      installmentSocket = io({
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000
      });

      installmentSocket.on('connect', () => {
        console.log('✅ Socket.IO เชื่อมต่อสำเร็จ');
        showToast('🔗 เชื่อมต่อ real-time สำเร็จ', 'success');
      });

      installmentSocket.on('connect_error', err => {
        console.warn('⚠️ Socket.IO connect error:', err);
        setTimeout(() => {
          if (!installmentSocket.connected) {
            showToast('การเชื่อมต่อ real-time ไม่สำเร็จ ระบบยังใช้งานได้ปกติ', 'warning');
          }
        }, 5000);
      });

      // Real-time price update listener
      installmentSocket.on('updatePricing', handleRealTimePriceUpdate);

      console.log('📡 Real-time pricing update listener พร้อมใช้งาน');
    } catch (error) {
      console.warn('⚠️ Socket.IO initialization error:', error);
    }
  } else if (installmentSocket) {
    console.log('📡 Socket.IO already initialized');
  } else {
    console.warn('Socket.IO script ไม่ได้โหลด — retry after delay');
    setTimeout(initializeSocketIO, 2000);
  }
}

function waitForSocketIOAndInitialize() {
  let attempts = 0;
  const maxAttempts = 10;

  function checkSocketIO() {
    attempts++;

    if (typeof io === 'function') {
      console.log('✅ Socket.IO พร้อมใช้งาน, กำลัง initialize...');
      initializeSocketIO();
    } else if (attempts < maxAttempts) {
      console.log(`⏳ รอ Socket.IO โหลด... (${attempts}/${maxAttempts})`);
      setTimeout(checkSocketIO, 1000);
    } else {
      console.warn('⚠️ Socket.IO ไม่สามารถโหลดได้ หลังจากรอ 10 วินาที');
      console.warn('💡 ระบบจะทำงานโดยไม่มี real-time features');
    }
  }

  checkSocketIO();
}

async function handleRealTimePriceUpdate(data) {
  console.log('📡 ได้รับการแจ้งอัปเดตราคาแบบ real-time:', data);

  showToast('📋 อัปเดตราคาสินค้าใหม่จากระบบลงทะเบียน', 'info');

  setTimeout(async () => {
    console.log('🔄 กำลังโหลดข้อมูลสินค้าใหม่...');

    try {
      // Reload branch installments data
      if (window.InstallmentAPI && window.InstallmentAPI.loadBranchInstallments) {
        await window.InstallmentAPI.loadBranchInstallments();
      }

      // Update current step display
      await updateCurrentStepDisplay();

      // Update cart pricing if needed
      if (window.InstallmentProduct && window.InstallmentProduct.updateCartPricing) {
        window.InstallmentProduct.updateCartPricing();
      }

      console.log('🎯 Real-time price update เสร็จสมบูรณ์');
      showToast('✅ อัปเดตราคาสินค้าเรียบร้อย', 'success');

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการอัปเดตราคา:', error);
      showToast('❌ ไม่สามารถอัปเดตราคาได้', 'error');
    }
  }, 500);
}

async function updateCurrentStepDisplay() {
  const level1Container = document.getElementById('level1Container');
  const level2Container = document.getElementById('level2Container');
  const level3Container = document.getElementById('level3Container');

  if (!level1Container?.classList.contains('hidden')) {
    // Update Level 1
    if (window.InstallmentProduct && window.InstallmentProduct.loadLevel1) {
      await window.InstallmentProduct.loadLevel1();
    }
    console.log('✅ อัปเดต Level 1 เรียบร้อย');
  } else if (!level2Container?.classList.contains('hidden')) {
    // Update Level 2 - based on current brand
    const currentBrand = document.getElementById('level2Title')?.textContent?.replace('รายการของ ', '');
    if (currentBrand && window.InstallmentProduct && window.InstallmentProduct.loadLevel2) {
      window.InstallmentProduct.loadLevel2(currentBrand.toLowerCase(), currentBrand);
    }
    console.log('✅ อัปเดต Level 2 เรียบร้อย');
  } else if (!level3Container?.classList.contains('hidden')) {
    // Update Level 3 - based on current group
    const currentGroup = document.getElementById('level3Title')?.textContent?.replace('รายละเอียดสินค้า: ', '');
    if (currentGroup && window.InstallmentProduct && window.InstallmentProduct.showLevel3Group) {
      window.InstallmentProduct.showLevel3Group(currentGroup);
    }
    console.log('✅ อัปเดต Level 3 เรียบร้อย');
  }
}

// =========================================
// MODULE INITIALIZATION
// =========================================

async function initializeCore() {
  if (coreInitialized) {
    console.warn('⚠️ InstallmentCore already initialized');
    return;
  }

  console.log('🔧 Initializing InstallmentCore module...');
  const startTime = performance.now();

  try {
    // Initialize session
    initializeSession();

    // Set initial network status
    updateNetworkStatus(navigator.onLine);

    // Initialize DOM cache with common elements
    setTimeout(() => {
      domCache.preloadCommonElements();
      console.log('🎯 DOM Cache preloaded with common elements');
    }, 100);

    // Initialize Socket.IO if available
    waitForSocketIOAndInitialize();

    // Start performance monitoring
    setTimeout(() => {
      trackPerformanceMetrics();
      console.log('📊 Performance monitoring started');
    }, 5000);

    // Start memory management
    startMemoryManagement();

    coreInitialized = true;
    performanceMetrics.initTime = performance.now() - startTime;
    console.log('✅ InstallmentCore module initialized successfully');
    console.log(`⏱️ Initialization time: ${performanceMetrics.initTime.toFixed(2)}ms`);

  } catch (error) {
    console.error('❌ Failed to initialize InstallmentCore:', error);
    throw error;
  }
}

// =========================================
// EVENT LISTENERS
// =========================================

// Global Error Handling
window.addEventListener('error', (event) => {
  console.error('🚨 Global Error:', event.error);
  showToast('เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
  showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  event.preventDefault();
});

// Network Status Monitoring
window.addEventListener('online', () => {
  updateNetworkStatus(true);
  showToast('🌐 กลับมาออนไลน์แล้ว', 'success');
});

window.addEventListener('offline', () => {
  updateNetworkStatus(false);
  showToast('📡 ไม่มีการเชื่อมต่ออินเทอร์เน็ต', 'warning');
});

// =========================================
// EXPORT CORE FUNCTIONS
// =========================================

window.InstallmentCore = {
  // Module lifecycle
  initialize: initializeCore,

  // Constants
  BRANCH_CODE: window.BRANCH_CODE,

  // Utility functions
  getBranchCode,
  formatPrice,
  showToast,

  // Validation functions
  validateRequired,
  validateEmail,
  validatePhone,
  validateIdCard,
  validateAmount,

  // Network functions
  updateNetworkStatus,
  isOnline: () => isOnline,

  // Storage functions
  saveToLocalStorage,
  loadFromLocalStorage,
  removeFromLocalStorage,

  // Session functions
  initializeSession,
  getSession,
  clearSession,

  // Performance functions
  logPerformance,
  trackPerformanceMetrics,
  getPerformanceReport,
  getOptimizationSuggestions,

  // Error handling
  handleApiError,

  // Socket.IO functions
  initializeSocketIO,
  waitForSocketIOAndInitialize,
  handleRealTimePriceUpdate,
  updateCurrentStepDisplay,

  // DOM Cache functions (Performance)
  getElementById,
  domCache,
  performanceMetrics,

  // Memory Management functions
  addEventListenerWithCleanup,
  removeEventListenerWithCleanup,
  cleanupAllEventListeners,
  performMemoryCleanup,
  startMemoryManagement,
  stopMemoryManagement,

  // State getters
  get initialized() { return coreInitialized; },
  get isOnline() { return isOnline; },
  get currentBranchCode() { return window.BRANCH_CODE; },
  get socket() { return installmentSocket; }
};

// =========================================
// AUTO-INITIALIZATION - DISABLED
// =========================================

// Auto-initialization disabled to prevent duplicate initialization
// Module will be initialized by module chain in installment_Pattani.html
/*
document.addEventListener('DOMContentLoaded', () => {
  if (!coreInitialized) {
    console.log('🚀 Auto-initializing InstallmentCore...');
    initializeCore().catch(error => {
      console.error('❌ Auto-initialization failed:', error);
    });
  }
});
*/

console.log('✅ Installment Core Module loaded');
console.log('📋 Available functions:', Object.keys(window.InstallmentCore));

// =========================================
// UTILITY FUNCTIONS
// =========================================

// ✅ Debounce function for performance optimization
function debounce(func, wait, immediate = false) {
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

// ✅ Throttle function for performance optimization
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

// ✅ Enhanced getElementById with caching
function getElementById(elementId) {
  return domCache.get(elementId);
}