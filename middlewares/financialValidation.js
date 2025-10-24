// Financial Data Validation Middleware
const { createValidationError } = require('./errorHandler');

/**
 * Comprehensive financial data validation middleware
 * This middleware validates financial amounts, dates, and other critical accounting data
 */

// Thai Baht amount validation
function validateThaiAmount(amount, fieldName = 'amount') {
    if (amount === null || amount === undefined) {
        throw createValidationError(`${fieldName} เป็นข้อมูลที่จำเป็น`, fieldName);
    }

    const numAmount = parseFloat(amount);

    if (isNaN(numAmount)) {
        throw createValidationError(`${fieldName} ต้องเป็นตัวเลข`, fieldName);
    }

    if (numAmount < 0) {
        throw createValidationError(`${fieldName} ต้องเป็นจำนวนเงินที่มากกว่าหรือเท่ากับ 0`, fieldName);
    }

    // Maximum amount limit for Thai Baht (999,999,999.99)
    if (numAmount > 999999999.99) {
        throw createValidationError(`${fieldName} เกินจำนวนสูงสุดที่อนุญาต (999,999,999.99 บาท)`, fieldName);
    }

    // Check decimal places (Thai Baht has 2 decimal places max)
    const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
        throw createValidationError(`${fieldName} มีทศนิยมเกิน 2 ตำแหน่ง`, fieldName);
    }

    return numAmount;
}

// Validate percentage values
function validatePercentage(percentage, fieldName = 'percentage') {
    const numPercentage = parseFloat(percentage);

    if (isNaN(numPercentage)) {
        throw createValidationError(`${fieldName} ต้องเป็นตัวเลข`, fieldName);
    }

    if (numPercentage < 0 || numPercentage > 100) {
        throw createValidationError(`${fieldName} ต้องอยู่ระหว่าง 0-100`, fieldName);
    }

    return numPercentage;
}

// Validate Thai tax ID (13 digits)
function validateThaiTaxId(taxId, fieldName = 'taxId') {
    if (!taxId) {
        throw createValidationError(`${fieldName} เป็นข้อมูลที่จำเป็น`, fieldName);
    }

    // Remove any non-numeric characters
    const cleanTaxId = taxId.toString().replace(/\D/g, '');

    if (cleanTaxId.length !== 13) {
        throw createValidationError(`${fieldName} ต้องเป็นเลข 13 หลัก`, fieldName);
    }

    // Thai tax ID validation algorithm
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cleanTaxId[i]) * (13 - i);
    }

    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;

    if (parseInt(cleanTaxId[12]) !== checkDigit) {
        throw createValidationError(`${fieldName} ไม่ถูกต้อง`, fieldName);
    }

    return cleanTaxId;
}

// Validate accounting period dates
function validateAccountingPeriod(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
        throw createValidationError('วันที่เริ่มต้นไม่ถูกต้อง', 'startDate');
    }

    if (isNaN(end.getTime())) {
        throw createValidationError('วันที่สิ้นสุดไม่ถูกต้อง', 'endDate');
    }

    if (start >= end) {
        throw createValidationError('วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด', 'period');
    }

    // Check if period is not too long (max 1 year)
    const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > oneYearInMs) {
        throw createValidationError('ช่วงเวลาบัญชีต้องไม่เกิน 1 ปี', 'period');
    }

    return { start, end };
}

// Validate chart of accounts code
function validateAccountCode(code, fieldName = 'accountCode') {
    if (!code) {
        throw createValidationError(`${fieldName} เป็นข้อมูลที่จำเป็น`, fieldName);
    }

    // Thai accounting code format: 1-2-001 (asset), 2-1-001 (liability), etc.
    const accountCodePattern = /^[1-5]-[1-9]-\d{3}$/;

    if (!accountCodePattern.test(code)) {
        throw createValidationError(`${fieldName} รูปแบบไม่ถูกต้อง (ตัวอย่าง: 1-1-001)`, fieldName);
    }

    return code;
}

// Validate Thai bank account number
function validateThaiAccountNumber(accountNumber, fieldName = 'accountNumber') {
    if (!accountNumber) {
        throw createValidationError(`${fieldName} เป็นข้อมูลที่จำเป็น`, fieldName);
    }

    const cleanAccountNumber = accountNumber.toString().replace(/\D/g, '');

    // Thai bank account numbers are typically 10-12 digits
    if (cleanAccountNumber.length < 10 || cleanAccountNumber.length > 12) {
        throw createValidationError(`${fieldName} ต้องเป็นเลข 10-12 หลัก`, fieldName);
    }

    return cleanAccountNumber;
}

// Validate invoice number format
function validateInvoiceNumber(invoiceNumber, fieldName = 'invoiceNumber') {
    if (!invoiceNumber) {
        throw createValidationError(`${fieldName} เป็นข้อมูลที่จำเป็น`, fieldName);
    }

    // Thai invoice format: IV-YYYY-NNNNNN or custom format
    const invoicePattern = /^[A-Z]{2,3}-\d{4}-\d{6}$/;

    if (!invoicePattern.test(invoiceNumber)) {
        throw createValidationError(`${fieldName} รูปแบบไม่ถูกต้อง (ตัวอย่าง: IV-2025-000001)`, fieldName);
    }

    return invoiceNumber;
}

// Validate quantity (must be positive number with max 3 decimal places)
function validateQuantity(quantity, fieldName = 'quantity') {
    const numQuantity = parseFloat(quantity);

    if (isNaN(numQuantity)) {
        throw createValidationError(`${fieldName} ต้องเป็นตัวเลข`, fieldName);
    }

    if (numQuantity <= 0) {
        throw createValidationError(`${fieldName} ต้องมากกว่า 0`, fieldName);
    }

    if (numQuantity > 999999) {
        throw createValidationError(`${fieldName} เกินจำนวนสูงสุดที่อนุญาต`, fieldName);
    }

    // Check decimal places (max 3 for quantity)
    const decimalPlaces = (numQuantity.toString().split('.')[1] || '').length;
    if (decimalPlaces > 3) {
        throw createValidationError(`${fieldName} มีทศนิยมเกิน 3 ตำแหน่ง`, fieldName);
    }

    return numQuantity;
}

// Main financial validation middleware
function validateFinancialData(validationRules = {}) {
    return (req, res, next) => {
        try {
            const data = { ...req.body, ...req.query, ...req.params };

            // Apply validation rules
            Object.keys(validationRules).forEach(field => {
                const rule = validationRules[field];
                const value = data[field];

                // Skip validation if field is optional and not provided
                if (!rule.required && (value === undefined || value === null || value === '')) {
                    return;
                }

                // Required field check
                if (rule.required && (value === undefined || value === null || value === '')) {
                    throw createValidationError(`${field} เป็นข้อมูลที่จำเป็น`, field);
                }

                // Apply specific validation based on rule type
                switch (rule.type) {
                    case 'amount':
                        data[field] = validateThaiAmount(value, field);
                        break;

                    case 'percentage':
                        data[field] = validatePercentage(value, field);
                        break;

                    case 'taxId':
                        data[field] = validateThaiTaxId(value, field);
                        break;

                    case 'accountCode':
                        data[field] = validateAccountCode(value, field);
                        break;

                    case 'accountNumber':
                        data[field] = validateThaiAccountNumber(value, field);
                        break;

                    case 'invoiceNumber':
                        data[field] = validateInvoiceNumber(value, field);
                        break;

                    case 'quantity':
                        data[field] = validateQuantity(value, field);
                        break;

                    case 'date':
                        const date = new Date(value);
                        if (isNaN(date.getTime())) {
                            throw createValidationError(`${field} ไม่ใช่วันที่ที่ถูกต้อง`, field);
                        }
                        data[field] = date;
                        break;

                    case 'string':
                        if (typeof value !== 'string' || value.trim() === '') {
                            throw createValidationError(`${field} ต้องเป็นข้อความ`, field);
                        }
                        if (rule.maxLength && value.length > rule.maxLength) {
                            throw createValidationError(`${field} ยาวเกิน ${rule.maxLength} ตัวอักษร`, field);
                        }
                        if (rule.minLength && value.length < rule.minLength) {
                            throw createValidationError(`${field} สั้นเกินไป (ต้องการอย่างน้อย ${rule.minLength} ตัวอักษร)`, field);
                        }
                        data[field] = value.trim();
                        break;

                    case 'email':
                        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailPattern.test(value)) {
                            throw createValidationError(`${field} รูปแบบอีเมลไม่ถูกต้อง`, field);
                        }
                        break;

                    case 'custom':
                        if (rule.validator && typeof rule.validator === 'function') {
                            const result = rule.validator(value, field);
                            if (result !== true) {
                                throw createValidationError(result || `${field} ไม่ถูกต้อง`, field);
                            }
                        }
                        break;
                }
            });

            // Validate accounting period if both start and end dates are present
            if (data.startDate && data.endDate) {
                validateAccountingPeriod(data.startDate, data.endDate);
            }

            // Update request data with validated values
            req.body = { ...req.body, ...data };
            req.validatedData = data;

            next();

        } catch (error) {
            next(error);
        }
    };
}

// Pre-defined validation rules for common financial forms
const ValidationRules = {
    // Invoice validation
    invoice: {
        invoiceNumber: { type: 'invoiceNumber', required: true },
        amount: { type: 'amount', required: true },
        taxAmount: { type: 'amount', required: false },
        customerId: { type: 'string', required: true },
        dueDate: { type: 'date', required: true }
    },

    // Payment validation
    payment: {
        amount: { type: 'amount', required: true },
        paymentMethod: { type: 'string', required: true },
        accountNumber: { type: 'accountNumber', required: false },
        referenceNumber: { type: 'string', required: false }
    },

    // Expense validation
    expense: {
        amount: { type: 'amount', required: true },
        category: { type: 'string', required: true },
        description: { type: 'string', required: true, maxLength: 500 },
        expenseDate: { type: 'date', required: true }
    },

    // Product validation
    product: {
        name: { type: 'string', required: true, maxLength: 200 },
        price: { type: 'amount', required: true },
        quantity: { type: 'quantity', required: true },
        categoryId: { type: 'string', required: true }
    },

    // Customer validation
    customer: {
        name: { type: 'string', required: true, maxLength: 100 },
        email: { type: 'email', required: false },
        taxId: { type: 'taxId', required: false },
        phone: { type: 'string', required: false, maxLength: 20 }
    },

    // Chart of accounts validation
    chartOfAccounts: {
        code: { type: 'accountCode', required: true },
        name: { type: 'string', required: true, maxLength: 100 },
        type: { type: 'string', required: true },
        parentCode: { type: 'accountCode', required: false }
    }
};

module.exports = {
    validateFinancialData,
    validateThaiAmount,
    validatePercentage,
    validateThaiTaxId,
    validateAccountingPeriod,
    validateAccountCode,
    validateThaiAccountNumber,
    validateInvoiceNumber,
    validateQuantity,
    ValidationRules
};