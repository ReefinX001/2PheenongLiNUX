/**
 * Data Transformer Utility
 * Handles data format conversion between systems and naming conventions
 * @version 1.0.0
 */

const moment = require('moment');

class DataTransformer {
  /**
   * Convert object keys between camelCase and snake_case
   */
  static convertCaseFormat(obj, targetFormat = 'camelCase') {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertCaseFormat(item, targetFormat));
    }

    const converted = {};

    for (const [key, value] of Object.entries(obj)) {
      let newKey = key;

      if (targetFormat === 'snake_case') {
        // Convert camelCase to snake_case
        newKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      } else if (targetFormat === 'camelCase') {
        // Convert snake_case to camelCase
        newKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
      }

      // Recursively convert nested objects
      if (value && typeof value === 'object' && !moment.isMoment(value) && !(value instanceof Date)) {
        converted[newKey] = this.convertCaseFormat(value, targetFormat);
      } else {
        converted[newKey] = value;
      }
    }

    return converted;
  }

  /**
   * Convert data from installment system to loan system format
   */
  static installmentToLoanFormat(installmentData) {
    if (!installmentData) return null;

    const data = Array.isArray(installmentData) ? installmentData : [installmentData];

    const converted = data.map(item => {
      // Calculate derived fields
      const totalAmount = Math.max(0, item.finalTotalAmount || item.totalAmount || 0);
      const paidAmount = Math.max(0, item.paidAmount || 0);
      const remainingAmount = Math.max(0, totalAmount - paidAmount);
      const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

      // Map customer info
      const customerInfo = item.customer_info || item.customerInfo || {};
      const customerName = customerInfo.firstName && customerInfo.lastName
        ? `${customerInfo.firstName} ${customerInfo.lastName}`.trim()
        : customerInfo.fullName || 'ไม่ระบุ';

      return {
        // Core identification
        loanId: item._id || item.id,
        contractNumber: item.contractNo || item.contract_no,
        loanType: 'installment_purchase',

        // Customer information
        customerId: item.customer,
        customerName: customerName,
        customerPhone: customerInfo.phone || '',
        customerEmail: customerInfo.email || '',
        customerAddress: this._formatAddress(customerInfo.address),

        // Financial details
        principalAmount: totalAmount,
        loanAmount: totalAmount,
        disbursedAmount: item.downPayment || 0,
        outstandingBalance: remainingAmount,
        totalInterest: 0, // Installment system doesn't separate interest

        // Payment terms
        termInMonths: item.installmentCount || 0,
        monthlyPayment: item.monthlyPayment || 0,
        interestRate: 0,

        // Status and dates
        status: this._mapInstallmentStatus(item.status),
        applicationDate: item.createdAt,
        approvalDate: item.status === 'approved' ? item.createdAt : null,
        disbursementDate: item.createdAt,
        maturityDate: item.dueDate,
        lastPaymentDate: this._getLastPaymentDate(item.payments),
        nextDueDate: item.dueDate,

        // Progress tracking
        paymentsCount: (item.payments || []).length,
        remainingPayments: Math.max(0, (item.installmentCount || 0) - (item.payments || []).length),
        paymentProgress: Math.round(progress * 100) / 100,

        // Risk assessment
        daysPastDue: this._calculateDaysPastDue(item.dueDate),
        riskRating: this._assessRiskRating(item),

        // Additional details
        purpose: this._extractPurpose(item.items),
        collateral: this._formatCollateral(item.items),
        branchCode: item.branch_code || item.branchCode,
        officerName: item.salesperson?.name || item.staffName || '',

        // System metadata
        sourceSystem: 'installment',
        lastUpdated: item.updatedAt || item.updated_at,

        // Original data reference
        originalData: {
          installmentOrderId: item._id,
          planType: item.planType || item.plan_type,
          installmentType: item.installmentType || item.installment_type
        }
      };
    });

    return Array.isArray(installmentData) ? converted : converted[0];
  }

  /**
   * Convert data from loan system to installment system format
   */
  static loanToInstallmentFormat(loanData) {
    if (!loanData) return null;

    const data = Array.isArray(loanData) ? loanData : [loanData];

    const converted = data.map(item => {
      return {
        // Core fields
        _id: item.loanId || item.id,
        contractNo: item.contractNumber || item.contract_number,
        planType: 'loan_integration',
        installmentType: 'pay-as-you-go',

        // Customer mapping
        customer: item.customerId || item.customer_id,
        customer_info: {
          firstName: this._extractFirstName(item.customerName),
          lastName: this._extractLastName(item.customerName),
          phone: item.customerPhone || item.customer_phone,
          email: item.customerEmail || item.customer_email,
          address: this._parseAddress(item.customerAddress)
        },

        // Financial mapping
        totalAmount: item.loanAmount || item.principal_amount || 0,
        paidAmount: (item.loanAmount || 0) - (item.outstandingBalance || 0),
        downPayment: item.disbursedAmount || 0,
        monthlyPayment: item.monthlyPayment || item.monthly_payment || 0,
        installmentCount: item.termInMonths || item.term_months || 0,

        // Status and dates
        status: this._mapLoanStatus(item.status),
        dueDate: item.nextDueDate || item.next_due_date || item.maturityDate,
        createdAt: item.applicationDate || item.application_date,
        updatedAt: item.lastUpdated || item.last_updated,

        // Additional fields
        branch_code: item.branchCode || item.branch_code,
        staffName: item.officerName || item.officer_name || '',

        // System metadata
        sourceSystem: 'loan',
        originalLoanId: item.loanId || item.id
      };
    });

    return Array.isArray(loanData) ? converted : converted[0];
  }

  /**
   * Standardize date formats across systems
   */
  static standardizeDates(obj, dateFields = ['createdAt', 'updatedAt', 'dueDate', 'completedDate']) {
    if (!obj) return obj;

    const standardized = { ...obj };

    dateFields.forEach(field => {
      if (standardized[field]) {
        const date = moment(standardized[field]);
        if (date.isValid()) {
          standardized[field] = date.toDate();
          // Also add formatted versions
          standardized[`${field}_formatted`] = date.format('YYYY-MM-DD HH:mm:ss');
          standardized[`${field}_display`] = date.format('DD/MM/YYYY');
        }
      }
    });

    return standardized;
  }

  /**
   * Standardize currency and amount formatting
   */
  static standardizeAmounts(obj, amountFields = ['totalAmount', 'paidAmount', 'remainingAmount', 'monthlyPayment']) {
    if (!obj) return obj;

    const standardized = { ...obj };

    amountFields.forEach(field => {
      if (standardized[field] !== undefined && standardized[field] !== null) {
        // Ensure amounts are positive numbers
        const amount = parseFloat(standardized[field]) || 0;
        standardized[field] = Math.max(0, amount);

        // Add formatted versions
        standardized[`${field}_formatted`] = this.formatCurrency(amount);
        standardized[`${field}_display`] = this.formatCurrencyDisplay(amount);
      }
    });

    return standardized;
  }

  /**
   * Unify status values between systems
   */
  static unifyStatus(status, fromSystem = 'installment') {
    const statusMappings = {
      installment: {
        'pending': 'pending_approval',
        'approved': 'approved',
        'active': 'active',
        'ongoing': 'active',
        'completed': 'fully_paid',
        'cancelled': 'cancelled',
        'rejected': 'rejected'
      },
      loan: {
        'pending_approval': 'pending',
        'approved': 'approved',
        'active': 'active',
        'disbursed': 'active',
        'fully_paid': 'completed',
        'cancelled': 'cancelled',
        'rejected': 'rejected',
        'defaulted': 'overdue'
      }
    };

    const mapping = statusMappings[fromSystem];
    return mapping ? mapping[status] || status : status;
  }

  /**
   * Transform pagination data between systems
   */
  static transformPagination(paginationData, format = 'standard') {
    if (!paginationData) return null;

    const standard = {
      page: parseInt(paginationData.page || paginationData.current_page || 1),
      limit: parseInt(paginationData.limit || paginationData.per_page || 20),
      total: parseInt(paginationData.total || paginationData.total_items || 0),
      pages: parseInt(paginationData.pages || paginationData.total_pages || 0)
    };

    if (format === 'snake_case') {
      return {
        current_page: standard.page,
        per_page: standard.limit,
        total_items: standard.total,
        total_pages: standard.pages,
        has_next: standard.page < standard.pages,
        has_prev: standard.page > 1
      };
    }

    return {
      ...standard,
      hasNext: standard.page < standard.pages,
      hasPrev: standard.page > 1
    };
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount, currency = 'THB') {
    if (typeof amount !== 'number') {
      amount = parseFloat(amount) || 0;
    }

    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format currency for display without symbol
   */
  static formatCurrencyDisplay(amount) {
    if (typeof amount !== 'number') {
      amount = parseFloat(amount) || 0;
    }

    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Validate and clean data before transformation
   */
  static validateAndClean(data, schema = {}) {
    if (!data) return null;

    const cleaned = {};

    Object.entries(data).forEach(([key, value]) => {
      // Skip null, undefined, or empty string values unless explicitly allowed
      if (value === null || value === undefined || value === '') {
        if (schema[key]?.allowEmpty) {
          cleaned[key] = value;
        }
        return;
      }

      // Apply type validation if schema is provided
      if (schema[key]) {
        const { type, min, max, pattern } = schema[key];

        switch (type) {
          case 'number':
            const num = parseFloat(value);
            if (!isNaN(num)) {
              cleaned[key] = min !== undefined ? Math.max(min, num) : num;
              if (max !== undefined) {
                cleaned[key] = Math.min(max, cleaned[key]);
              }
            }
            break;

          case 'string':
            const str = String(value).trim();
            if (pattern && !pattern.test(str)) {
              break; // Skip invalid patterns
            }
            cleaned[key] = str;
            break;

          case 'date':
            const date = moment(value);
            if (date.isValid()) {
              cleaned[key] = date.toDate();
            }
            break;

          default:
            cleaned[key] = value;
        }
      } else {
        cleaned[key] = value;
      }
    });

    return cleaned;
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  static _formatAddress(address) {
    if (!address) return '';

    const parts = [
      address.houseNo || address.house_no,
      address.moo,
      address.lane,
      address.road,
      address.subDistrict || address.sub_district,
      address.district,
      address.province,
      address.zipcode || address.zip_code
    ].filter(part => part && part.trim());

    return parts.join(' ').trim();
  }

  static _parseAddress(addressString) {
    if (!addressString) return {};

    // Simple address parsing - can be enhanced based on requirements
    const parts = addressString.split(' ');
    return {
      houseNo: parts[0] || '',
      subDistrict: parts[1] || '',
      district: parts[2] || '',
      province: parts[3] || '',
      zipcode: parts[parts.length - 1] || ''
    };
  }

  static _mapInstallmentStatus(status) {
    const mapping = {
      'pending': 'pending_approval',
      'approved': 'approved',
      'active': 'active',
      'ongoing': 'active',
      'completed': 'fully_paid',
      'cancelled': 'cancelled',
      'rejected': 'rejected'
    };
    return mapping[status] || status;
  }

  static _mapLoanStatus(status) {
    const mapping = {
      'pending_approval': 'pending',
      'approved': 'approved',
      'active': 'active',
      'disbursed': 'active',
      'fully_paid': 'completed',
      'cancelled': 'cancelled',
      'rejected': 'rejected',
      'defaulted': 'overdue'
    };
    return mapping[status] || status;
  }

  static _getLastPaymentDate(payments) {
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return null;
    }

    const sorted = payments
      .filter(p => p.payDate || p.paymentDate)
      .sort((a, b) => {
        const dateA = moment(a.payDate || a.paymentDate);
        const dateB = moment(b.payDate || b.paymentDate);
        return dateB.diff(dateA);
      });

    return sorted.length > 0 ? sorted[0].payDate || sorted[0].paymentDate : null;
  }

  static _calculateDaysPastDue(dueDate) {
    if (!dueDate) return 0;

    const due = moment(dueDate);
    const now = moment();

    if (now.isAfter(due)) {
      return now.diff(due, 'days');
    }

    return 0;
  }

  static _assessRiskRating(item) {
    const daysPastDue = this._calculateDaysPastDue(item.dueDate);
    const totalAmount = item.totalAmount || item.finalTotalAmount || 0;
    const paidAmount = item.paidAmount || 0;
    const paymentRatio = totalAmount > 0 ? paidAmount / totalAmount : 0;

    if (daysPastDue > 90 || paymentRatio < 0.3) return 'high';
    if (daysPastDue > 60 || paymentRatio < 0.5) return 'medium';
    if (daysPastDue > 30 || paymentRatio < 0.7) return 'low';
    return 'minimal';
  }

  static _extractPurpose(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return 'ผ่อนชำระสินค้า';
    }

    const productNames = items.map(item => item.name).filter(name => name);
    return productNames.length > 0 ? productNames.join(', ') : 'ผ่อนชำระสินค้า';
  }

  static _formatCollateral(items) {
    if (!items || !Array.isArray(items)) return [];

    return items.map(item => ({
      type: 'product',
      description: item.name || 'ไม่ระบุ',
      quantity: item.qty || 1,
      value: item.downAmount || 0,
      serialNumber: item.imei || '',
      condition: 'new'
    }));
  }

  static _extractFirstName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    return parts[0] || '';
  }

  static _extractLastName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    return parts.slice(1).join(' ') || '';
  }
}

module.exports = DataTransformer;