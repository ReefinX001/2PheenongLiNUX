// ======================= UTILITY FUNCTIONS =======================

// Toast notification system with collision prevention
function showToast(message, type = 'info', duration = 3000) {
  // Prevent duplicate showToast if already exists globally
  if (window.showToast !== showToast && typeof window.showToast === 'function') {
    return window.showToast(message, type, duration);
  }

  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast-notification, .toast');
  existingToasts.forEach(toast => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  });

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast-notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;

  // Set toast style based on type
  const styles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-500 text-white'
  };

  toast.className += ` ${styles[type] || styles.info}`;

  // Set toast content with safe message handling
  const safeMessage = String(message || 'แจ้งเตือน').replace(/[<>]/g, '');
  toast.innerHTML = `
    <div class="flex items-center gap-2">
      <i class="bi bi-${getToastIcon(type)}"></i>
      <span>${safeMessage}</span>
    </div>
  `;

  // Add to document
  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-x-full');
  }, 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

function getToastIcon(type) {
  const icons = {
    success: 'check-circle-fill',
    error: 'x-circle-fill',
    warning: 'exclamation-triangle-fill',
    info: 'info-circle-fill'
  };
  return icons[type] || icons.info;
}

// Loading System
const LoadingSystem = {
  show(options = {}) {
    const { message = 'กำลังโหลด...', overlay = true } = options;

    // Remove existing loader
    this.hide();

    // Create loader
    const loader = document.createElement('div');
    loader.id = 'loadingOverlay';
    loader.className = `fixed inset-0 z-50 flex items-center justify-center ${overlay ? 'bg-black bg-opacity-50' : ''}`;

    loader.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex items-center gap-3">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span class="text-gray-700 dark:text-gray-300">${message}</span>
      </div>
    `;

    document.body.appendChild(loader);
    return loader;
  },

  hide(loader = null) {
    const element = loader || document.getElementById('loadingOverlay');
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  },

  init() {
    console.log('✅ Loading System initialized');
  }
};

// Format functions
function formatPrice(price) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0
  }).format(price || 0);
}

function formatNumber(number, decimals = 0) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number || 0);
}

function formatDate(date, options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  return new Intl.DateTimeFormat('th-TH', { ...defaultOptions, ...options })
    .format(new Date(date));
}

// Validation helpers
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  const phoneRegex = /^[0-9]{10}$/;
  const cleanPhone = phone.replace(/\D/g, '');
  return phoneRegex.test(cleanPhone);
}

function validateIdCard(idCard) {
  // Remove dashes
  const cleanId = idCard.replace(/-/g, '');

  // Check length
  if (cleanId.length !== 13) return false;

  // Check if all digits
  if (!/^\d{13}$/.test(cleanId)) return false;

  // Thai ID card checksum validation
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanId.charAt(i)) * (13 - i);
  }

  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? (1 - remainder) : (11 - remainder);

  return checkDigit === parseInt(cleanId.charAt(12));
}

// DOM helpers
function createElement(tag, className = '', innerHTML = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (innerHTML) element.innerHTML = innerHTML;
  return element;
}

function getElement(selector) {
  return document.querySelector(selector);
}

function getElements(selector) {
  return document.querySelectorAll(selector);
}

// Storage helpers
function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Storage error:', error);
    return false;
  }
}

function getStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Storage error:', error);
    return defaultValue;
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Storage error:', error);
    return false;
  }
}

// Debounce function
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

// Throttle function
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Random ID generator
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Export to global scope
window.showToast = showToast;
window.LoadingSystem = LoadingSystem;
window.formatPrice = formatPrice;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
window.validateIdCard = validateIdCard;
window.createElement = createElement;
window.getElement = getElement;
window.getElements = getElements;
window.setStorage = setStorage;
window.getStorage = getStorage;
window.removeStorage = removeStorage;
window.debounce = debounce;
window.throttle = throttle;
window.generateId = generateId;