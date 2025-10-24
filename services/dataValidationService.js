/**
 * Data Validation Service
 * Ensures only real data is used throughout the application
 * Removes mock data fallbacks and provides proper empty states
 * @version 1.0.0
 */

class DataValidationService {

  /**
   * Validate customer data and ensure no mock data is present
   * @param {Object} customerData - Customer data to validate
   * @returns {Object} Validation result
   */
  static validateCustomerData(customerData) {
    if (!customerData) {
      return {
        isValid: false,
        error: 'Customer data is required',
        data: this.getEmptyCustomerData()
      };
    }

    // Check for mock data indicators
    const mockIndicators = [
      'test', 'mock', 'sample', 'demo', 'example',
      'fake', 'dummy', 'placeholder', 'ทดสอบ', 'จำลอง'
    ];

    const customerName = this.getCustomerName(customerData);
    const phone = customerData.individual?.phone || customerData.corporate?.phone || '';

    // Check if data contains mock indicators
    const hasMockData = mockIndicators.some(indicator =>
      customerName.toLowerCase().includes(indicator) ||
      phone.toLowerCase().includes(indicator)
    );

    if (hasMockData) {
      return {
        isValid: false,
        error: 'Mock or test data detected in customer information',
        data: this.getEmptyCustomerData()
      };
    }

    // Validate required fields
    const errors = [];

    if (!customerName || customerName.trim().length === 0) {
      errors.push('Customer name is required');
    }

    if (!phone || phone.trim().length === 0) {
      errors.push('Customer phone is required');
    } else if (!/^[0-9+\-\s()]{8,15}$/.test(phone.replace(/\s+/g, ''))) {
      errors.push('Invalid phone number format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? customerData : this.getEmptyCustomerData()
    };
  }

  /**
   * Validate installment order data
   * @param {Object} orderData - Order data to validate
   * @returns {Object} Validation result
   */
  static validateInstallmentOrderData(orderData) {
    if (!orderData) {
      return {
        isValid: false,
        error: 'Order data is required',
        data: this.getEmptyOrderData()
      };
    }

    const errors = [];

    // Validate contract number isn't mock
    if (orderData.contractNo) {
      const mockPatterns = ['TEST', 'MOCK', 'DEMO', 'SAMPLE', '00000', '99999'];
      if (mockPatterns.some(pattern => orderData.contractNo.includes(pattern))) {
        errors.push('Mock contract number detected');
      }
    }

    // Validate amounts are realistic
    if (orderData.totalAmount) {
      if (orderData.totalAmount <= 0) {
        errors.push('Total amount must be greater than 0');
      }
      if (orderData.totalAmount > 10000000) { // 10 million threshold
        errors.push('Total amount seems unrealistic');
      }
    }

    // Validate monthly payment is realistic
    if (orderData.monthlyPayment) {
      if (orderData.monthlyPayment <= 0) {
        errors.push('Monthly payment must be greater than 0');
      }
      if (orderData.monthlyPayment > 500000) { // 500k threshold
        errors.push('Monthly payment seems unrealistic');
      }
    }

    // Validate installment terms
    if (orderData.installmentMonths) {
      if (orderData.installmentMonths <= 0 || orderData.installmentMonths > 120) {
        errors.push('Installment months must be between 1 and 120');
      }
    }

    // Validate items aren't mock
    if (orderData.items && Array.isArray(orderData.items)) {
      orderData.items.forEach((item, index) => {
        if (item.name && /test|mock|demo|sample/i.test(item.name)) {
          errors.push(`Item ${index + 1} appears to be mock data`);
        }
        if (item.imei && /000000|111111|999999/i.test(item.imei)) {
          errors.push(`Item ${index + 1} has mock IMEI number`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? orderData : this.getEmptyOrderData()
    };
  }

  /**
   * Validate payment data
   * @param {Object} paymentData - Payment data to validate
   * @returns {Object} Validation result
   */
  static validatePaymentData(paymentData) {
    if (!paymentData) {
      return {
        isValid: false,
        error: 'Payment data is required',
        data: this.getEmptyPaymentData()
      };
    }

    const errors = [];

    // Validate amount
    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    if (paymentData.amount > 1000000) { // 1 million threshold
      errors.push('Payment amount seems unrealistic');
    }

    // Validate payment method
    const validPaymentMethods = ['cash', 'bank_transfer', 'credit_card', 'check', 'online'];
    if (!paymentData.paymentMethod || !validPaymentMethods.includes(paymentData.paymentMethod)) {
      errors.push('Invalid payment method');
    }

    // Validate payment date
    if (paymentData.paymentDate) {
      const paymentDate = new Date(paymentData.paymentDate);
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const oneMonthFuture = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

      if (paymentDate < oneYearAgo || paymentDate > oneMonthFuture) {
        errors.push('Payment date must be within reasonable range');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? paymentData : this.getEmptyPaymentData()
    };
  }

  /**
   * Clean data array by removing mock entries
   * @param {Array} dataArray - Array of data to clean
   * @param {string} dataType - Type of data (customer, order, payment)
   * @returns {Array} Cleaned data array
   */
  static cleanDataArray(dataArray, dataType) {
    if (!Array.isArray(dataArray)) {
      return [];
    }

    return dataArray.filter(item => {
      let validation;

      switch (dataType) {
        case 'customer':
          validation = this.validateCustomerData(item);
          break;
        case 'order':
          validation = this.validateInstallmentOrderData(item);
          break;
        case 'payment':
          validation = this.validatePaymentData(item);
          break;
        default:
          validation = { isValid: true };
      }

      return validation.isValid;
    });
  }

  /**
   * Get proper empty state for when no real data exists
   * @param {string} dataType - Type of data
   * @returns {Object} Empty state data
   */
  static getEmptyState(dataType) {
    switch (dataType) {
      case 'customers':
        return {
          data: [],
          message: 'ไม่มีข้อมูลลูกค้า',
          total: 0,
          isEmpty: true
        };
      case 'orders':
        return {
          data: [],
          message: 'ไม่มีข้อมูลคำสั่งซื้อ',
          total: 0,
          isEmpty: true
        };
      case 'payments':
        return {
          data: [],
          message: 'ไม่มีข้อมูลการชำระเงิน',
          total: 0,
          isEmpty: true
        };
      case 'statistics':
        return {
          totalAmount: 0,
          totalCount: 0,
          averageAmount: 0,
          isEmpty: true,
          message: 'ไม่มีข้อมูลสถิติ'
        };
      default:
        return {
          data: null,
          message: 'ไม่มีข้อมูล',
          isEmpty: true
        };
    }
  }

  /**
   * Validate and clean response data before sending to client
   * @param {*} data - Response data
   * @param {string} dataType - Type of data
   * @returns {*} Cleaned response data
   */
  static cleanResponseData(data, dataType) {
    if (!data) {
      return this.getEmptyState(dataType);
    }

    // If it's an array, clean each item
    if (Array.isArray(data)) {
      const cleanedData = this.cleanDataArray(data, dataType);
      return cleanedData.length > 0 ? cleanedData : this.getEmptyState(dataType);
    }

    // If it's a single object, validate it
    let validation;
    switch (dataType) {
      case 'customer':
        validation = this.validateCustomerData(data);
        break;
      case 'order':
        validation = this.validateInstallmentOrderData(data);
        break;
      case 'payment':
        validation = this.validatePaymentData(data);
        break;
      default:
        return data; // Return as-is for unknown types
    }

    return validation.isValid ? data : this.getEmptyState(dataType);
  }

  /**
   * Check if data contains suspicious patterns that indicate mock/test data
   * @param {*} data - Data to check
   * @returns {boolean} True if suspicious patterns found
   */
  static hasSuspiciousPatterns(data) {
    const suspiciousPatterns = [
      /test.*user/i,
      /mock.*data/i,
      /sample.*data/i,
      /demo.*account/i,
      /000000000/,
      /111111111/,
      /999999999/,
      /12345678/,
      /00000000/,
      /example\.com/i,
      /test\.com/i,
      /mock\.com/i
    ];

    const dataString = JSON.stringify(data);
    return suspiciousPatterns.some(pattern => pattern.test(dataString));
  }

  // Helper methods for empty data structures

  static getEmptyCustomerData() {
    return {
      customerType: 'individual',
      individual: {
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        address: ''
      },
      corporate: {
        companyName: '',
        taxId: '',
        phone: '',
        email: '',
        address: ''
      }
    };
  }

  static getEmptyOrderData() {
    return {
      contractNo: '',
      totalAmount: 0,
      monthlyPayment: 0,
      installmentMonths: 0,
      downPayment: 0,
      items: [],
      status: 'pending'
    };
  }

  static getEmptyPaymentData() {
    return {
      amount: 0,
      paymentMethod: 'cash',
      paymentDate: new Date(),
      notes: ''
    };
  }

  /**
   * Get customer name from customer data
   * @param {Object} customerData - Customer data
   * @returns {string} Customer name
   */
  static getCustomerName(customerData) {
    if (customerData.customerType === 'individual') {
      return `${customerData.individual?.firstName || ''} ${customerData.individual?.lastName || ''}`.trim();
    } else if (customerData.customerType === 'corporate') {
      return customerData.corporate?.companyName || '';
    }
    return '';
  }

  /**
   * Sanitize text input to prevent injection attacks
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text
   */
  static sanitizeText(text) {
    if (typeof text !== 'string') return text;

    // Remove potentially harmful characters
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Validate and sanitize entire request body
   * @param {Object} body - Request body
   * @returns {Object} Sanitized body
   */
  static sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') return body;

    const sanitized = {};

    Object.keys(body).forEach(key => {
      const value = body[key];

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeText(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'string' ? this.sanitizeText(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeRequestBody(value);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }
}

module.exports = DataValidationService;