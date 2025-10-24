/**
 * Client-Side Stock Form Validation for Thai Accounting System
 *
 * Features:
 * - Real-time validation with Thai error messages
 * - Visual feedback for form fields
 * - Business logic validation
 * - IMEI and barcode validation
 * - Integration with enhanced Socket.IO client
 *
 * @version 1.0.0
 * @author Thai Accounting System
 */

class StockFormValidator {
  constructor() {
    this.validationRules = {
      // Required fields validation
      required: {
        'branch_code': 'กรุณาเลือกสาขา',
        'name': 'กรุณากรอกชื่อสินค้า',
        'brand': 'กรุณากรอกยี่ห้อ',
        'model': 'กรุณากรอกรุ่น',
        'quantity': 'กรุณากรอกจำนวน',
        'price': 'กรุณากรอกราคา',
        'cost': 'กรุณากรอกต้นทุน'
      },

      // Number validation ranges
      numbers: {
        'quantity': { min: 0, max: 999999, integer: true },
        'price': { min: 0, max: 9999999 },
        'cost': { min: 0, max: 9999999 }
      },

      // String length validation
      strings: {
        'name': { min: 1, max: 200 },
        'brand': { min: 1, max: 100 },
        'model': { min: 1, max: 100 },
        'po_number': { max: 50 },
        'invoice_number': { max: 50 },
        'supplier': { max: 200 },
        'notes': { max: 1000 }
      },

      // Pattern validation
      patterns: {
        'imei': /^\d{15}$/,
        'barcode': /^[A-Za-z0-9\-_]{8,50}$/,
        'email': /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      }
    };

    this.initializeValidation();
  }

  /**
   * Initialize form validation for all stock forms
   */
  initializeValidation() {
    this.setupFormValidation();
    this.setupRealTimeValidation();
    this.initializeErrorDisplay();
  }

  /**
   * Setup form submission validation
   */
  setupFormValidation() {
    // Find all stock forms
    const stockForms = document.querySelectorAll('form[data-stock-form]');

    stockForms.forEach(form => {
      form.addEventListener('submit', (e) => {
        const isValid = this.validateForm(form);
        if (!isValid) {
          e.preventDefault();
          this.showValidationSummary(form);
        }
      });
    });

    // General forms that might be stock-related
    const generalForms = document.querySelectorAll('form');
    generalForms.forEach(form => {
      if (this.isStockForm(form)) {
        form.addEventListener('submit', (e) => {
          const isValid = this.validateForm(form);
          if (!isValid) {
            e.preventDefault();
            this.showValidationSummary(form);
          }
        });
      }
    });
  }

  /**
   * Setup real-time validation
   */
  setupRealTimeValidation() {
    // Validate on input events
    document.addEventListener('input', (e) => {
      if (this.isStockField(e.target)) {
        this.validateField(e.target);
      }
    });

    // Validate on blur events
    document.addEventListener('blur', (e) => {
      if (this.isStockField(e.target)) {
        this.validateField(e.target, true);
      }
    }, true);

    // Special validation for numeric fields
    document.addEventListener('keypress', (e) => {
      if (this.isNumericField(e.target)) {
        this.handleNumericInput(e);
      }
    });
  }

  /**
   * Initialize error display elements
   */
  initializeErrorDisplay() {
    // Add CSS for validation styling if not present
    if (!document.getElementById('stock-validation-styles')) {
      const styles = document.createElement('style');
      styles.id = 'stock-validation-styles';
      styles.textContent = `
        .field-error {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 1px #ef4444 !important;
        }
        .field-warning {
          border-color: #f59e0b !important;
          box-shadow: 0 0 0 1px #f59e0b !important;
        }
        .field-success {
          border-color: #10b981 !important;
          box-shadow: 0 0 0 1px #10b981 !important;
        }
        .validation-message {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          font-family: 'Sarabun', sans-serif;
        }
        .validation-error {
          color: #ef4444;
        }
        .validation-warning {
          color: #f59e0b;
        }
        .validation-success {
          color: #10b981;
        }
        .validation-summary {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          font-family: 'Sarabun', sans-serif;
        }
        .validation-summary h4 {
          color: #dc2626;
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
        }
        .validation-summary ul {
          margin: 0;
          padding-left: 20px;
          color: #7f1d1d;
        }
        .validation-summary li {
          margin-bottom: 4px;
        }
        .loading-validation {
          opacity: 0.6;
          pointer-events: none;
        }
        .form-group.loading::after {
          content: "กำลังตรวจสอบ...";
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          color: #6b7280;
          font-family: 'Sarabun', sans-serif;
        }
      `;
      document.head.appendChild(styles);
    }
  }

  /**
   * Check if a form is stock-related
   */
  isStockForm(form) {
    const stockIndicators = [
      'stock', 'branch-stock', 'inventory', 'product',
      'branch_code', 'imei', 'barcode'
    ];

    // Check form attributes
    if (form.hasAttribute('data-stock-form')) return true;

    // Check form ID or class
    const formIdentifier = (form.id + ' ' + form.className).toLowerCase();
    if (stockIndicators.some(indicator => formIdentifier.includes(indicator))) {
      return true;
    }

    // Check for stock-related fields
    const stockFields = form.querySelectorAll('input[name*="branch"], input[name*="stock"], input[name*="imei"], input[name*="barcode"], input[name*="quantity"]');
    return stockFields.length > 0;
  }

  /**
   * Check if a field is stock-related
   */
  isStockField(field) {
    const stockFieldNames = [
      'branch_code', 'name', 'brand', 'model', 'quantity',
      'price', 'cost', 'imei', 'barcode', 'po_number',
      'invoice_number', 'supplier', 'notes'
    ];

    return stockFieldNames.includes(field.name) ||
           stockFieldNames.some(name => field.name && field.name.includes(name));
  }

  /**
   * Check if a field is numeric
   */
  isNumericField(field) {
    const numericFields = ['quantity', 'price', 'cost'];
    return numericFields.includes(field.name) ||
           field.type === 'number' ||
           field.classList.contains('numeric-input');
  }

  /**
   * Handle numeric input validation
   */
  handleNumericInput(e) {
    const char = String.fromCharCode(e.which);
    const field = e.target;
    const value = field.value;

    // Allow control characters
    if (e.which < 32) return;

    // For integer fields, only allow digits
    if (field.name === 'quantity') {
      if (!/\d/.test(char)) {
        e.preventDefault();
        this.showFieldMessage(field, 'จำนวนต้องเป็นตัวเลขเท่านั้น', 'error');
      }
      return;
    }

    // For decimal fields, allow digits and one decimal point
    if (['price', 'cost'].includes(field.name)) {
      if (!/[\d.]/.test(char)) {
        e.preventDefault();
        this.showFieldMessage(field, 'กรุณากรอกตัวเลขเท่านั้น', 'error');
        return;
      }

      // Only allow one decimal point
      if (char === '.' && value.includes('.')) {
        e.preventDefault();
        this.showFieldMessage(field, 'สามารถใส่จุดทศนิยมได้เพียงจุดเดียว', 'error');
      }
    }
  }

  /**
   * Validate entire form
   */
  validateForm(form) {
    let isValid = true;
    const errors = [];

    // Get all stock-related fields in the form
    const fields = form.querySelectorAll('input, select, textarea');

    fields.forEach(field => {
      if (this.isStockField(field)) {
        const fieldValidation = this.validateField(field, true);
        if (!fieldValidation.isValid) {
          isValid = false;
          errors.push(...fieldValidation.errors);
        }
      }
    });

    // Business logic validation
    const businessValidation = this.validateBusinessLogic(form);
    if (!businessValidation.isValid) {
      isValid = false;
      errors.push(...businessValidation.errors);
    }

    // IMEI uniqueness validation (if applicable)
    this.validateIMEIUniqueness(form);

    return isValid;
  }

  /**
   * Validate individual field
   */
  validateField(field, showMessages = false) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const fieldName = field.name;
    const value = field.value;

    // Clear previous validation state
    this.clearFieldValidation(field);

    // Required field validation
    if (this.isRequiredField(field) && (!value || value.trim() === '')) {
      result.isValid = false;
      result.errors.push(this.validationRules.required[fieldName] || `กรุณากรอก${this.getThaiFieldName(fieldName)}`);
    }

    // Skip other validations if field is empty and not required
    if (!value || value.trim() === '') {
      if (showMessages) {
        this.applyFieldValidation(field, result);
      }
      return result;
    }

    // String length validation
    if (this.validationRules.strings[fieldName]) {
      const stringRule = this.validationRules.strings[fieldName];
      const trimmedValue = value.trim();

      if (stringRule.min && trimmedValue.length < stringRule.min) {
        result.isValid = false;
        result.errors.push(`${this.getThaiFieldName(fieldName)}ต้องมีอย่างน้อย ${stringRule.min} ตัวอักษร`);
      }

      if (stringRule.max && trimmedValue.length > stringRule.max) {
        result.isValid = false;
        result.errors.push(`${this.getThaiFieldName(fieldName)}ต้องไม่เกิน ${stringRule.max} ตัวอักษร`);
      }
    }

    // Number validation
    if (this.validationRules.numbers[fieldName]) {
      const numberRule = this.validationRules.numbers[fieldName];
      const numValue = parseFloat(value);

      if (isNaN(numValue)) {
        result.isValid = false;
        result.errors.push(`${this.getThaiFieldName(fieldName)}ต้องเป็นตัวเลข`);
      } else {
        if (numberRule.integer && !Number.isInteger(numValue)) {
          result.isValid = false;
          result.errors.push(`${this.getThaiFieldName(fieldName)}ต้องเป็นจำนวนเต็ม`);
        }

        if (numValue < numberRule.min) {
          result.isValid = false;
          if (fieldName === 'quantity') {
            result.errors.push('จำนวนต้องมากกว่าหรือเท่ากับ 0');
          } else if (fieldName === 'price') {
            result.errors.push('ราคาต้องมากกว่า 0 บาท');
          } else if (fieldName === 'cost') {
            result.errors.push('ต้นทุนต้องมากกว่าหรือเท่ากับ 0 บาท');
          } else {
            result.errors.push(`${this.getThaiFieldName(fieldName)}ต้องมากกว่าหรือเท่ากับ ${numberRule.min}`);
          }
        }

        if (numValue > numberRule.max) {
          result.isValid = false;
          if (fieldName === 'quantity') {
            result.errors.push('จำนวนไม่สามารถเกิน 999,999 ชิ้น');
          } else if (fieldName === 'price') {
            result.errors.push('ราคาไม่สามารถเกิน 9,999,999 บาท');
          } else if (fieldName === 'cost') {
            result.errors.push('ต้นทุนไม่สามารถเกิน 9,999,999 บาท');
          } else {
            result.errors.push(`${this.getThaiFieldName(fieldName)}ต้องไม่เกิน ${numberRule.max}`);
          }
        }
      }
    }

    // Pattern validation
    if (this.validationRules.patterns[fieldName]) {
      const pattern = this.validationRules.patterns[fieldName];
      if (!pattern.test(value)) {
        result.isValid = false;
        if (fieldName === 'imei') {
          result.errors.push('หมายเลข IMEI ไม่ถูกต้อง (ต้องเป็นตัวเลข 15 หลัก)');
        } else if (fieldName === 'barcode') {
          result.errors.push('บาร์โค้ดไม่ถูกต้อง');
        } else if (fieldName === 'email') {
          result.errors.push('รูปแบบอีเมลไม่ถูกต้อง');
        }
      }
    }

    // IMEI checksum validation
    if (fieldName === 'imei' && value.length === 15) {
      if (!this.validateIMEIChecksum(value)) {
        result.isValid = false;
        result.errors.push('หมายเลข IMEI ไม่ถูกต้อง (ตรวจสอบ checksum ไม่ผ่าน)');
      }
    }

    if (showMessages) {
      this.applyFieldValidation(field, result);
    }

    return result;
  }

  /**
   * Validate business logic
   */
  validateBusinessLogic(form) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Price vs Cost validation
    const priceField = form.querySelector('[name="price"]');
    const costField = form.querySelector('[name="cost"]');

    if (priceField && costField && priceField.value && costField.value) {
      const price = parseFloat(priceField.value);
      const cost = parseFloat(costField.value);

      if (!isNaN(price) && !isNaN(cost) && price < cost) {
        result.warnings.push('ราคาขายต้องมากกว่าต้นทุน');
        this.showFieldMessage(priceField, 'ราคาขายต้องมากกว่าต้นทุน', 'warning');
      }
    }

    // Transfer validation (same branch)
    const fromBranchField = form.querySelector('[name="transfer_from"]');
    const toBranchField = form.querySelector('[name="transfer_to"]');

    if (fromBranchField && toBranchField && fromBranchField.value && toBranchField.value) {
      if (fromBranchField.value === toBranchField.value) {
        result.isValid = false;
        result.errors.push('ไม่สามารถโอนสต็อกภายในสาขาเดียวกันได้');
        this.showFieldMessage(toBranchField, 'ไม่สามารถโอนสต็อกภายในสาขาเดียวกันได้', 'error');
      }
    }

    return result;
  }

  /**
   * Validate IMEI uniqueness (async)
   */
  async validateIMEIUniqueness(form) {
    const imeiField = form.querySelector('[name="imei"]');
    if (!imeiField || !imeiField.value) return;

    const imei = imeiField.value;
    if (imei.length !== 15) return;

    try {
      // Show loading state
      this.showFieldMessage(imeiField, 'กำลังตรวจสอบ IMEI...', 'info');

      const response = await fetch('/api/stock/check-imei', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('authToken') || ''
        },
        body: JSON.stringify({ imei: imei })
      });

      const data = await response.json();

      if (data.exists) {
        this.showFieldMessage(imeiField, 'หมายเลข IMEI นี้มีอยู่แล้วในระบบ', 'error');
        imeiField.classList.add('field-error');
      } else {
        this.showFieldMessage(imeiField, 'หมายเลข IMEI ใช้ได้', 'success');
        imeiField.classList.add('field-success');
      }
    } catch (error) {
      console.error('IMEI validation error:', error);
      this.showFieldMessage(imeiField, 'ไม่สามารถตรวจสอบ IMEI ได้ในขณะนี้', 'warning');
    }
  }

  /**
   * IMEI checksum validation using Luhn algorithm
   */
  validateIMEIChecksum(imei) {
    let sum = 0;
    let shouldDouble = false;

    // Start from rightmost digit (excluding check digit)
    for (let i = imei.length - 2; i >= 0; i--) {
      let digit = parseInt(imei[i]);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit = digit % 10 + 1;
        }
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    const checkDigit = parseInt(imei[imei.length - 1]);
    const calculatedCheckDigit = (10 - (sum % 10)) % 10;

    return checkDigit === calculatedCheckDigit;
  }

  /**
   * Check if field is required
   */
  isRequiredField(field) {
    return field.hasAttribute('required') ||
           field.classList.contains('required') ||
           this.validationRules.required.hasOwnProperty(field.name);
  }

  /**
   * Get Thai field name
   */
  getThaiFieldName(fieldName) {
    const fieldNames = {
      'branch_code': 'รหัสสาขา',
      'name': 'ชื่อสินค้า',
      'brand': 'ยี่ห้อ',
      'model': 'รุ่น',
      'quantity': 'จำนวน',
      'price': 'ราคา',
      'cost': 'ต้นทุน',
      'imei': 'หมายเลข IMEI',
      'barcode': 'บาร์โค้ด',
      'supplier': 'ผู้จำหน่าย',
      'po_number': 'เลขที่ใบสั่งซื้อ',
      'invoice_number': 'เลขที่ใบกำกับภาษี',
      'notes': 'หมายเหตุ'
    };

    return fieldNames[fieldName] || fieldName;
  }

  /**
   * Apply field validation styling and messages
   */
  applyFieldValidation(field, result) {
    this.clearFieldValidation(field);

    if (!result.isValid) {
      field.classList.add('field-error');
      if (result.errors.length > 0) {
        this.showFieldMessage(field, result.errors[0], 'error');
      }
    } else if (result.warnings.length > 0) {
      field.classList.add('field-warning');
      this.showFieldMessage(field, result.warnings[0], 'warning');
    } else {
      field.classList.add('field-success');
    }
  }

  /**
   * Clear field validation state
   */
  clearFieldValidation(field) {
    field.classList.remove('field-error', 'field-warning', 'field-success');
    this.clearFieldMessage(field);
  }

  /**
   * Show field validation message
   */
  showFieldMessage(field, message, type) {
    this.clearFieldMessage(field);

    const messageElement = document.createElement('span');
    messageElement.className = `validation-message validation-${type}`;
    messageElement.textContent = message;
    messageElement.setAttribute('data-validation-message', 'true');

    // Insert after the field or its wrapper
    const parent = field.parentNode;
    parent.insertBefore(messageElement, field.nextSibling);
  }

  /**
   * Clear field validation message
   */
  clearFieldMessage(field) {
    const parent = field.parentNode;
    const existingMessage = parent.querySelector('[data-validation-message="true"]');
    if (existingMessage) {
      existingMessage.remove();
    }
  }

  /**
   * Show validation summary
   */
  showValidationSummary(form) {
    // Remove existing summary
    const existingSummary = form.querySelector('.validation-summary');
    if (existingSummary) {
      existingSummary.remove();
    }

    // Collect all error messages
    const errorMessages = [];
    const errorFields = form.querySelectorAll('.field-error');

    errorFields.forEach(field => {
      const message = field.parentNode.querySelector('.validation-error');
      if (message) {
        errorMessages.push(message.textContent);
      }
    });

    if (errorMessages.length === 0) return;

    // Create summary element
    const summary = document.createElement('div');
    summary.className = 'validation-summary';
    summary.innerHTML = `
      <h4>กรุณาแก้ไขข้อผิดพลาดต่อไปนี้:</h4>
      <ul>
        ${errorMessages.map(msg => `<li>${msg}</li>`).join('')}
      </ul>
    `;

    // Insert at the top of the form
    form.insertBefore(summary, form.firstChild);

    // Scroll to summary
    summary.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Format number input with Thai thousand separators
   */
  formatThaiNumber(input) {
    let value = input.value.replace(/,/g, '');
    if (!isNaN(value) && value !== '') {
      input.value = parseFloat(value).toLocaleString('th-TH');
    }
  }

  /**
   * Auto-format IMEI input
   */
  formatIMEI(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 15) {
      value = value.substring(0, 15);
    }
    input.value = value;
  }
}

// Initialize stock form validation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.stockFormValidator = new StockFormValidator();

  // Add format helpers to global scope
  window.formatThaiNumber = (input) => window.stockFormValidator.formatThaiNumber(input);
  window.formatIMEI = (input) => window.stockFormValidator.formatIMEI(input);
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StockFormValidator;
}