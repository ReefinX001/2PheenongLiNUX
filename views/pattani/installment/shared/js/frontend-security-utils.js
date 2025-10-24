/**
 * Frontend Security and Validation Utilities for Thai Accounting System
 * ======================================================================
 *
 * Critical frontend security measures and validation utilities
 * for the installment flow (step1-step4) and bad debt integration.
 *
 * Features:
 * - XSS Prevention and Input Sanitization
 * - Financial Calculation Accuracy (Thai Baht precision)
 * - Form Validation with Thai Language Support
 * - localStorage Security and Data Integrity
 * - Bad Debt Integration Utilities
 * - Error Handling and User Feedback
 *
 * @version 1.0.0
 * @author Thai Accounting System Maintenance Expert
 */

(function(global) {
    'use strict';

    // =============================================================================
    // 1. XSS PREVENTION AND INPUT SANITIZATION
    // =============================================================================

    /**
     * Comprehensive XSS prevention utility
     */
    const XSSPrevention = {
        /**
         * Escape HTML characters to prevent XSS attacks
         * @param {string} unsafe - Unsafe string input
         * @returns {string} - Safely escaped string
         */
        escapeHtml: function(unsafe) {
            if (typeof unsafe !== 'string') return '';

            return unsafe
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
                .replace(/\//g, '&#x2F;');
        },

        /**
         * Sanitize input for safe storage and display
         * @param {string} input - User input
         * @returns {string} - Sanitized input
         */
        sanitizeInput: function(input) {
            if (typeof input !== 'string') return '';

            // Remove dangerous patterns
            let sanitized = input
                .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
                .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .replace(/data:text\/html/gi, '');

            // Trim and limit length
            sanitized = sanitized.trim().substring(0, 10000);

            return this.escapeHtml(sanitized);
        },

        /**
         * Validate and sanitize Thai text input
         * @param {string} input - Thai text input
         * @returns {object} - {isValid: boolean, sanitized: string, error: string}
         */
        validateThaiText: function(input) {
            const sanitized = this.sanitizeInput(input);

            // Thai character validation regex
            const thaiRegex = /^[ก-๏\s\w\d\-\.\,\(\)\[\]\/]*$/;

            if (!sanitized) {
                return { isValid: false, sanitized: '', error: 'กรุณากรอกข้อมูล' };
            }

            if (sanitized.length > 500) {
                return { isValid: false, sanitized: '', error: 'ข้อมูลยาวเกินไป (สูงสุด 500 ตัวอักษร)' };
            }

            if (!thaiRegex.test(sanitized)) {
                return { isValid: false, sanitized: '', error: 'กรุณาใช้ตัวอักษรไทย อังกฤษ และตัวเลขเท่านั้น' };
            }

            return { isValid: true, sanitized: sanitized, error: '' };
        },

        /**
         * Safe DOM manipulation without innerHTML
         * @param {HTMLElement} element - Target element
         * @param {string} content - Content to insert
         */
        safeSetTextContent: function(element, content) {
            if (!element) return;

            // Clear existing content
            element.textContent = '';

            // Set safe text content
            element.textContent = this.sanitizeInput(content);
        },

        /**
         * Safe HTML insertion with XSS protection
         * @param {HTMLElement} element - Target element
         * @param {string} html - HTML content
         */
        safeSetInnerHTML: function(element, html) {
            if (!element) return;

            // Create a temporary container
            const temp = document.createElement('div');
            temp.textContent = this.sanitizeInput(html);

            // Clear and append safe content
            element.textContent = '';
            element.appendChild(temp);
        }
    };

    // =============================================================================
    // 2. FINANCIAL CALCULATION ACCURACY (THAI BAHT PRECISION)
    // =============================================================================

    /**
     * Precise financial calculations for Thai Baht
     */
    const FinancialCalculator = {
        /**
         * Round to Thai Baht precision (2 decimal places)
         * @param {number} amount - Amount to round
         * @returns {number} - Rounded amount
         */
        roundToBaht: function(amount) {
            if (typeof amount !== 'number' || isNaN(amount)) return 0;
            return Math.round((amount + Number.EPSILON) * 100) / 100;
        },

        /**
         * Safe number parsing with validation
         * @param {string|number} value - Value to parse
         * @returns {number} - Parsed number or 0
         */
        safeParseFloat: function(value) {
            if (value === null || value === undefined || value === '') return 0;

            // Remove Thai currency symbols and commas
            const cleaned = String(value).replace(/[฿,\s]/g, '');
            const parsed = parseFloat(cleaned);

            return isNaN(parsed) ? 0 : parsed;
        },

        /**
         * Safe integer parsing
         * @param {string|number} value - Value to parse
         * @returns {number} - Parsed integer or 0
         */
        safeParseInt: function(value) {
            if (value === null || value === undefined || value === '') return 0;

            const cleaned = String(value).replace(/[,\s]/g, '');
            const parsed = parseInt(cleaned, 10);

            return isNaN(parsed) ? 0 : parsed;
        },

        /**
         * Calculate percentage with precision
         * @param {number} amount - Base amount
         * @param {number} percentage - Percentage (0-100)
         * @returns {number} - Calculated amount
         */
        calculatePercentage: function(amount, percentage) {
            const baseAmount = this.safeParseFloat(amount);
            const percent = this.safeParseFloat(percentage);

            if (percent < 0 || percent > 100) return 0;

            return this.roundToBaht(baseAmount * (percent / 100));
        },

        /**
         * Calculate VAT (7% in Thailand)
         * @param {number} amount - Amount before VAT
         * @returns {object} - {beforeTax: number, vat: number, total: number}
         */
        calculateVAT: function(amount) {
            const beforeTax = this.safeParseFloat(amount);
            const vat = this.roundToBaht(beforeTax * 0.07);
            const total = this.roundToBaht(beforeTax + vat);

            return { beforeTax, vat, total };
        },

        /**
         * Calculate installment payments with interest
         * @param {number} principal - Principal amount
         * @param {number} annualRate - Annual interest rate (%)
         * @param {number} months - Number of months
         * @returns {object} - Payment calculation results
         */
        calculateInstallment: function(principal, annualRate, months) {
            const p = this.safeParseFloat(principal);
            const r = this.safeParseFloat(annualRate) / 100 / 12; // Monthly rate
            const n = this.safeParseInt(months);

            if (p <= 0 || n <= 0) {
                return { monthlyPayment: 0, totalPayment: 0, totalInterest: 0 };
            }

            if (r === 0) {
                // No interest calculation
                const monthlyPayment = this.roundToBaht(p / n);
                return {
                    monthlyPayment,
                    totalPayment: this.roundToBaht(monthlyPayment * n),
                    totalInterest: 0
                };
            }

            // PMT formula: P * [r(1+r)^n] / [(1+r)^n - 1]
            const factor = Math.pow(1 + r, n);
            const monthlyPayment = this.roundToBaht(p * (r * factor) / (factor - 1));
            const totalPayment = this.roundToBaht(monthlyPayment * n);
            const totalInterest = this.roundToBaht(totalPayment - p);

            return { monthlyPayment, totalPayment, totalInterest };
        },

        /**
         * Format amount as Thai Baht currency
         * @param {number} amount - Amount to format
         * @returns {string} - Formatted currency string
         */
        formatCurrency: function(amount) {
            const num = this.safeParseFloat(amount);
            return new Intl.NumberFormat('th-TH', {
                style: 'currency',
                currency: 'THB',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(num);
        },

        /**
         * Validate monetary amount
         * @param {string|number} amount - Amount to validate
         * @returns {object} - {isValid: boolean, value: number, error: string}
         */
        validateAmount: function(amount) {
            const value = this.safeParseFloat(amount);

            if (value < 0) {
                return { isValid: false, value: 0, error: 'จำนวนเงินต้องไม่ติดลบ' };
            }

            if (value > 999999999) {
                return { isValid: false, value: 0, error: 'จำนวนเงินเกินขีดจำกัด (999,999,999 บาท)' };
            }

            return { isValid: true, value: this.roundToBaht(value), error: '' };
        }
    };

    // =============================================================================
    // 3. LOCALSTORAGE SECURITY AND DATA INTEGRITY
    // =============================================================================

    /**
     * Secure localStorage management
     */
    const SecureStorage = {
        /**
         * Validate and sanitize data before storage
         * @param {any} data - Data to validate
         * @returns {boolean} - Whether data is safe to store
         */
        validateData: function(data) {
            try {
                // Check data size (max 5MB per item)
                const serialized = JSON.stringify(data);
                if (serialized.length > 5 * 1024 * 1024) {
                    console.warn('⚠️ Data too large for localStorage');
                    return false;
                }

                // Check for potentially dangerous content
                if (serialized.includes('<script>') ||
                    serialized.includes('javascript:') ||
                    serialized.includes('data:text/html')) {
                    console.warn('⚠️ Potentially dangerous content detected');
                    return false;
                }

                return true;
            } catch (error) {
                console.error('❌ Data validation error:', error);
                return false;
            }
        },

        /**
         * Safely store data in localStorage
         * @param {string} key - Storage key
         * @param {any} data - Data to store
         * @returns {boolean} - Success status
         */
        setItem: function(key, data) {
            try {
                if (!this.validateData(data)) {
                    console.error('❌ Data validation failed for key:', key);
                    return false;
                }

                const sanitizedKey = XSSPrevention.sanitizeInput(key);
                const timestamp = Date.now();
                const payload = {
                    data: data,
                    timestamp: timestamp,
                    checksum: this.generateChecksum(data)
                };

                localStorage.setItem(sanitizedKey, JSON.stringify(payload));
                return true;
            } catch (error) {
                console.error('❌ localStorage setItem error:', error);
                return false;
            }
        },

        /**
         * Safely retrieve data from localStorage
         * @param {string} key - Storage key
         * @returns {any} - Retrieved data or null
         */
        getItem: function(key) {
            try {
                const sanitizedKey = XSSPrevention.sanitizeInput(key);
                const stored = localStorage.getItem(sanitizedKey);

                if (!stored) return null;

                const payload = JSON.parse(stored);

                // Verify checksum integrity
                if (!this.verifyChecksum(payload.data, payload.checksum)) {
                    console.warn('⚠️ Data integrity check failed for key:', key);
                    this.removeItem(key); // Remove corrupted data
                    return null;
                }

                // Check data age (expire after 24 hours)
                const age = Date.now() - payload.timestamp;
                if (age > 24 * 60 * 60 * 1000) {
                    console.info('ℹ️ Data expired for key:', key);
                    this.removeItem(key);
                    return null;
                }

                return payload.data;
            } catch (error) {
                console.error('❌ localStorage getItem error:', error);
                return null;
            }
        },

        /**
         * Remove item from localStorage
         * @param {string} key - Storage key
         */
        removeItem: function(key) {
            try {
                const sanitizedKey = XSSPrevention.sanitizeInput(key);
                localStorage.removeItem(sanitizedKey);
            } catch (error) {
                console.error('❌ localStorage removeItem error:', error);
            }
        },

        /**
         * Generate simple checksum for data integrity
         * @param {any} data - Data to checksum
         * @returns {string} - Checksum
         */
        generateChecksum: function(data) {
            const str = JSON.stringify(data);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString();
        },

        /**
         * Verify data checksum
         * @param {any} data - Data to verify
         * @param {string} expectedChecksum - Expected checksum
         * @returns {boolean} - Whether checksum matches
         */
        verifyChecksum: function(data, expectedChecksum) {
            return this.generateChecksum(data) === expectedChecksum;
        },

        /**
         * Clean expired and invalid data
         */
        cleanup: function() {
            try {
                const keysToRemove = [];

                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('installment')) {
                        const item = this.getItem(key);
                        if (item === null) {
                            keysToRemove.push(key);
                        }
                    }
                }

                keysToRemove.forEach(key => this.removeItem(key));
                console.info(`🧹 Cleaned ${keysToRemove.length} expired/invalid items`);
            } catch (error) {
                console.error('❌ Storage cleanup error:', error);
            }
        }
    };

    // =============================================================================
    // 4. FORM VALIDATION WITH THAI LANGUAGE SUPPORT
    // =============================================================================

    /**
     * Comprehensive form validation utilities
     */
    const FormValidator = {
        /**
         * Validate Thai ID card number
         * @param {string} idCard - ID card number
         * @returns {object} - Validation result
         */
        validateIdCard: function(idCard) {
            const sanitized = XSSPrevention.sanitizeInput(idCard).replace(/\D/g, '');

            if (!sanitized) {
                return { isValid: false, error: 'กรุณากรอกเลขบัตรประชาชน' };
            }

            if (sanitized.length !== 13) {
                return { isValid: false, error: 'เลขบัตรประชาชนต้องมี 13 หลัก' };
            }

            // Thai ID card checksum validation
            let sum = 0;
            for (let i = 0; i < 12; i++) {
                sum += parseInt(sanitized.charAt(i)) * (13 - i);
            }
            const checksum = (11 - (sum % 11)) % 10;

            if (checksum !== parseInt(sanitized.charAt(12))) {
                return { isValid: false, error: 'รูปแบบเลขบัตรประชาชนไม่ถูกต้อง' };
            }

            return { isValid: true, error: '', value: sanitized };
        },

        /**
         * Validate Thai phone number
         * @param {string} phone - Phone number
         * @returns {object} - Validation result
         */
        validatePhone: function(phone) {
            const sanitized = XSSPrevention.sanitizeInput(phone).replace(/\D/g, '');

            if (!sanitized) {
                return { isValid: false, error: 'กรุณากรอกหมายเลขโทรศัพท์' };
            }

            // Thai mobile patterns: 08x, 09x, 06x (10 digits)
            if (sanitized.length === 10 && /^0[689]/.test(sanitized)) {
                return { isValid: true, error: '', value: sanitized };
            }

            // Thai landline patterns: 0xx (9 digits)
            if (sanitized.length === 9 && /^0[2-7]/.test(sanitized)) {
                return { isValid: true, error: '', value: sanitized };
            }

            return { isValid: false, error: 'รูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง' };
        },

        /**
         * Validate email address
         * @param {string} email - Email address
         * @returns {object} - Validation result
         */
        validateEmail: function(email) {
            const sanitized = XSSPrevention.sanitizeInput(email).toLowerCase().trim();

            if (!sanitized) {
                return { isValid: true, error: '', value: '' }; // Email is optional
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(sanitized)) {
                return { isValid: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' };
            }

            if (sanitized.length > 254) {
                return { isValid: false, error: 'อีเมลยาวเกินไป' };
            }

            return { isValid: true, error: '', value: sanitized };
        },

        /**
         * Validate required field
         * @param {string} value - Field value
         * @param {string} fieldName - Field name for error message
         * @returns {object} - Validation result
         */
        validateRequired: function(value, fieldName) {
            const sanitized = XSSPrevention.sanitizeInput(value).trim();

            if (!sanitized) {
                return { isValid: false, error: `กรุณากรอก${fieldName}` };
            }

            return { isValid: true, error: '', value: sanitized };
        },

        /**
         * Validate form with multiple fields
         * @param {HTMLFormElement} form - Form element
         * @param {object} validationRules - Validation rules
         * @returns {object} - Validation result
         */
        validateForm: function(form, validationRules) {
            const errors = {};
            const values = {};
            let isValid = true;

            for (const fieldName in validationRules) {
                const field = form.querySelector(`[name="${fieldName}"]`);
                if (!field) continue;

                const value = field.value;
                const rules = validationRules[fieldName];
                let fieldValid = true;
                let fieldError = '';

                // Apply validation rules in order
                for (const rule of rules) {
                    const result = rule(value);
                    if (!result.isValid) {
                        fieldValid = false;
                        fieldError = result.error;
                        break;
                    }
                    values[fieldName] = result.value || value;
                }

                if (!fieldValid) {
                    errors[fieldName] = fieldError;
                    isValid = false;

                    // Add visual feedback
                    field.classList.add('border-red-500');
                    this.showFieldError(field, fieldError);
                } else {
                    field.classList.remove('border-red-500');
                    this.clearFieldError(field);
                }
            }

            return { isValid, errors, values };
        },

        /**
         * Show field error message
         * @param {HTMLElement} field - Input field
         * @param {string} error - Error message
         */
        showFieldError: function(field, error) {
            this.clearFieldError(field);

            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error text-red-500 text-sm mt-1';
            errorDiv.textContent = error;

            field.parentNode.appendChild(errorDiv);
        },

        /**
         * Clear field error message
         * @param {HTMLElement} field - Input field
         */
        clearFieldError: function(field) {
            const existingError = field.parentNode.querySelector('.field-error');
            if (existingError) {
                existingError.remove();
            }
        }
    };

    // =============================================================================
    // 5. BAD DEBT INTEGRATION UTILITIES
    // =============================================================================

    /**
     * Bad debt checking and integration utilities
     */
    const BadDebtChecker = {
        /**
         * Check customer bad debt status
         * @param {string} idCard - Customer ID card
         * @returns {Promise<object>} - Bad debt check result
         */
        checkCustomerBadDebt: async function(idCard) {
            try {
                const validatedId = FormValidator.validateIdCard(idCard);
                if (!validatedId.isValid) {
                    return {
                        hasError: true,
                        error: validatedId.error,
                        canProceed: false
                    };
                }

                const response = await fetch('/api/loan/bad-debt/check', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                    },
                    body: JSON.stringify({ idCard: validatedId.value })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();

                return {
                    hasError: false,
                    hasBadDebt: result.hasBadDebt || false,
                    badDebtAmount: FinancialCalculator.safeParseFloat(result.totalBadDebt || 0),
                    badDebtCount: FinancialCalculator.safeParseInt(result.badDebtCount || 0),
                    canProceed: !result.hasBadDebt || result.allowOverride,
                    warningMessage: result.warningMessage || '',
                    details: result.details || []
                };
            } catch (error) {
                console.error('❌ Bad debt check error:', error);
                return {
                    hasError: true,
                    error: 'ไม่สามารถตรวจสอบข้อมูลหนี้สูญได้ กรุณาลองใหม่อีกครั้ง',
                    canProceed: false
                };
            }
        },

        /**
         * Display bad debt warning UI
         * @param {object} badDebtResult - Bad debt check result
         * @param {HTMLElement} container - Container element
         */
        displayBadDebtWarning: function(badDebtResult, container) {
            if (!container) return;

            container.innerHTML = '';

            if (badDebtResult.hasError) {
                container.innerHTML = `
                    <div class="alert alert-error">
                        <i class="bi bi-exclamation-triangle"></i>
                        <span>${XSSPrevention.escapeHtml(badDebtResult.error)}</span>
                    </div>
                `;
                return;
            }

            if (badDebtResult.hasBadDebt) {
                const warningClass = badDebtResult.canProceed ? 'alert-warning' : 'alert-error';
                const icon = badDebtResult.canProceed ? 'bi-exclamation-triangle' : 'bi-x-circle';

                container.innerHTML = `
                    <div class="alert ${warningClass}">
                        <i class="bi ${icon}"></i>
                        <div>
                            <h4 class="font-semibold">⚠️ พบข้อมูลหนี้สูญ</h4>
                            <p>ลูกค้ารายนี้มีหนี้สูญจำนวน ${FinancialCalculator.formatCurrency(badDebtResult.badDebtAmount)}
                               (${badDebtResult.badDebtCount} รายการ)</p>
                            ${badDebtResult.warningMessage ? `<p class="text-sm mt-1">${XSSPrevention.escapeHtml(badDebtResult.warningMessage)}</p>` : ''}
                            ${!badDebtResult.canProceed ? '<p class="text-sm mt-1 font-semibold">❌ ไม่สามารถดำเนินการต่อได้</p>' : ''}
                        </div>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="alert alert-success">
                        <i class="bi bi-check-circle"></i>
                        <span>✅ ลูกค้าไม่มีประวัติหนี้สูญ สามารถดำเนินการต่อได้</span>
                    </div>
                `;
            }
        }
    };

    // =============================================================================
    // 6. ERROR HANDLING AND USER FEEDBACK
    // =============================================================================

    /**
     * Comprehensive error handling and user feedback
     */
    const ErrorHandler = {
        /**
         * Display toast notification
         * @param {string} message - Message to display
         * @param {string} type - Message type (success, error, warning, info)
         */
        showToast: function(message, type = 'info') {
            const sanitizedMessage = XSSPrevention.sanitizeInput(message);

            // Try to use SweetAlert2 if available
            if (typeof Swal !== 'undefined') {
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });

                Toast.fire({
                    icon: type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info',
                    title: sanitizedMessage
                });
            } else {
                // Fallback to console and basic notification
                console.log(`[${type.toUpperCase()}] ${sanitizedMessage}`);
                this.showBasicNotification(sanitizedMessage, type);
            }
        },

        /**
         * Show basic notification fallback
         * @param {string} message - Message to display
         * @param {string} type - Message type
         */
        showBasicNotification: function(message, type) {
            const toast = document.createElement('div');
            toast.className = `toast toast-top toast-end z-50`;

            const alertClass = type === 'error' ? 'alert-error' :
                             type === 'success' ? 'alert-success' :
                             type === 'warning' ? 'alert-warning' : 'alert-info';

            toast.innerHTML = `
                <div class="alert ${alertClass}">
                    <span>${XSSPrevention.escapeHtml(message)}</span>
                </div>
            `;

            document.body.appendChild(toast);

            // Auto remove after 3 seconds
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 3000);
        },

        /**
         * Handle API errors with user-friendly messages
         * @param {Error} error - Error object
         * @param {string} context - Error context
         */
        handleApiError: function(error, context = '') {
            console.error(`❌ API Error${context ? ` (${context})` : ''}:`, error);

            let userMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';

            if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                userMessage = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
            } else if (error.message.includes('401')) {
                userMessage = 'กรุณาเข้าสู่ระบบใหม่';
            } else if (error.message.includes('403')) {
                userMessage = 'คุณไม่มีสิทธิ์ในการดำเนินการนี้';
            } else if (error.message.includes('404')) {
                userMessage = 'ไม่พบข้อมูลที่ต้องการ';
            } else if (error.message.includes('500')) {
                userMessage = 'เซิร์ฟเวอร์มีปัญหา กรุณาติดต่อผู้ดูแลระบบ';
            }

            this.showToast(userMessage, 'error');
        },

        /**
         * Validate step completion and show appropriate feedback
         * @param {number} stepNumber - Step number (1-4)
         * @param {object} stepData - Step data to validate
         * @returns {object} - Validation result
         */
        validateStepCompletion: function(stepNumber, stepData) {
            const validationRules = {
                1: () => this.validateStep1(stepData),
                2: () => this.validateStep2(stepData),
                3: () => this.validateStep3(stepData),
                4: () => this.validateStep4(stepData)
            };

            const validator = validationRules[stepNumber];
            if (!validator) {
                return { isValid: false, error: 'ขั้นตอนไม่ถูกต้อง' };
            }

            return validator();
        },

        validateStep1: function(data) {
            if (!data || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
                return { isValid: false, error: 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ' };
            }

            const totalAmount = data.items.reduce((sum, item) => {
                return sum + (FinancialCalculator.safeParseFloat(item.downAmount || item.price) *
                            FinancialCalculator.safeParseInt(item.quantity));
            }, 0);

            if (totalAmount <= 0) {
                return { isValid: false, error: 'ยอดรวมสินค้าต้องมากกว่า 0 บาท' };
            }

            return { isValid: true, error: '' };
        },

        validateStep2: function(data) {
            if (!data || !data.customer) {
                return { isValid: false, error: 'กรุณากรอกข้อมูลลูกค้า' };
            }

            const required = ['firstName', 'lastName', 'idCard', 'phone'];
            for (const field of required) {
                if (!data.customer[field]) {
                    return { isValid: false, error: `กรุณากรอก${this.getFieldDisplayName(field)}` };
                }
            }

            return { isValid: true, error: '' };
        },

        validateStep3: function(data) {
            if (!data || typeof data.totalWithTax !== 'number' || data.totalWithTax <= 0) {
                return { isValid: false, error: 'ยอดรวมการชำระไม่ถูกต้อง' };
            }

            return { isValid: true, error: '' };
        },

        validateStep4: function(data) {
            if (!data || !data.signatures) {
                return { isValid: false, error: 'กรุณาลงลายเซ็น' };
            }

            return { isValid: true, error: '' };
        },

        getFieldDisplayName: function(field) {
            const names = {
                firstName: 'ชื่อ',
                lastName: 'นามสกุล',
                idCard: 'เลขบัตรประชาชน',
                phone: 'หมายเลขโทรศัพท์',
                email: 'อีเมล'
            };
            return names[field] || field;
        }
    };

    // =============================================================================
    // 7. GLOBAL INITIALIZATION AND EXPORT
    // =============================================================================

    /**
     * Initialize security utilities and perform startup checks
     */
    function initializeSecurity() {
        console.info('🔒 Initializing Frontend Security Utilities...');

        // Cleanup old localStorage data
        SecureStorage.cleanup();

        // Set up global error handlers
        window.addEventListener('error', function(event) {
            ErrorHandler.handleApiError(event.error, 'Global Error Handler');
        });

        window.addEventListener('unhandledrejection', function(event) {
            ErrorHandler.handleApiError(new Error(event.reason), 'Unhandled Promise Rejection');
        });

        console.info('✅ Frontend Security Utilities initialized successfully');
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSecurity);
    } else {
        initializeSecurity();
    }

    // Export to global scope
    global.FrontendSecurity = {
        XSSPrevention,
        FinancialCalculator,
        SecureStorage,
        FormValidator,
        BadDebtChecker,
        ErrorHandler,
        version: '1.0.0'
    };

    console.info('🔒 Frontend Security Utilities v1.0.0 loaded');

})(window);