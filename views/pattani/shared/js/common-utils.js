// Common Utility Functions
const CommonUtils = {
  // Format number with thousand separators
  formatNumber: function(num) {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  // Format Thai Baht currency
  formatCurrency: function(amount) {
    if (amount === null || amount === undefined) return '฿0.00';
    return '฿' + this.formatNumber(amount);
  },

  // Parse number from formatted string
  parseNumber: function(str) {
    if (!str) return 0;
    return parseFloat(str.toString().replace(/,/g, ''));
  },

  // Format Thai date
  formatThaiDate: function(date) {
    if (!date) return '';
    const d = new Date(date);
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok'
    };
    return d.toLocaleDateString('th-TH', options);
  },

  // Convert Buddhist year to Gregorian
  buddhistToGregorian: function(buddhistYear) {
    return parseInt(buddhistYear) - 543;
  },

  // Convert Gregorian year to Buddhist
  gregorianToBuddhist: function(gregorianYear) {
    return parseInt(gregorianYear) + 543;
  },

  // Validate Thai ID card
  validateThaiID: function(id) {
    if (!id || id.length !== 13) return false;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(id[i]) * (13 - i);
    }

    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseInt(id[12]);
  },

  // Validate phone number
  validatePhone: function(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return /^(06|08|09)\d{8}$/.test(cleaned);
  },

  // Validate email
  validateEmail: function(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  // Show alert message
  showAlert: function(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      min-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
      alertDiv.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
  },

  // Get URL parameter
  getUrlParam: function(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  },

  // Store data in localStorage
  setStorage: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage error:', e);
      return false;
    }
  },

  // Get data from localStorage
  getStorage: function(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Storage error:', e);
      return null;
    }
  },

  // Remove from localStorage
  removeStorage: function(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Storage error:', e);
      return false;
    }
  },

  // Debounce function
  debounce: function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Deep clone object
  deepClone: function(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (obj instanceof Object) {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  },

  // Calculate percentage
  calculatePercentage: function(value, total) {
    if (!total || total === 0) return 0;
    return ((value / total) * 100).toFixed(2);
  },

  // Generate unique ID
  generateUniqueId: function(prefix = '') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return prefix + timestamp + random;
  }
};

// Make available globally
window.CommonUtils = CommonUtils;

// Add CSS animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);