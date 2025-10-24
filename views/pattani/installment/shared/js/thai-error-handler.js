/**
 * Thai Error Handler for Thai Accounting System
 * =============================================
 *
 * Comprehensive error handling system with Thai language support,
 * user-friendly messaging, and proper error logging for the installment flow.
 *
 * Features:
 * - Thai language error messages
 * - Context-aware error handling
 * - User-friendly notifications
 * - Error categorization and logging
 * - Retry mechanisms
 * - Recovery suggestions
 * - Accessibility support
 *
 * @version 1.0.0
 * @author Thai Accounting System Maintenance Expert
 */

(function(global) {
    'use strict';

    // Import security utilities
    const Security = global.FrontendSecurity || {};
    const XSS = Security.XSSPrevention || {};

    /**
     * Thai error messages dictionary
     */
    const ThaiErrorMessages = {
        // Network and API errors
        network: {
            offline: 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต กรุณาตรวจสอบการเชื่อมต่อ',
            timeout: 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง',
            serverError: 'เซิร์ฟเวอร์มีปัญหา กรุณาติดต่อผู้ดูแลระบบ',
            notFound: 'ไม่พบข้อมูลที่ต้องการ',
            unauthorized: 'กรุณาเข้าสู่ระบบใหม่',
            forbidden: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้',
            badRequest: 'ข้อมูลที่ส่งไปไม่ถูกต้อง',
            conflict: 'ข้อมูลขัดแย้งกับที่มีอยู่ในระบบ'
        },

        // Validation errors
        validation: {
            required: 'กรุณากรอกข้อมูลในช่องนี้',
            invalidFormat: 'รูปแบบข้อมูลไม่ถูกต้อง',
            tooShort: 'ข้อมูลสั้นเกินไป',
            tooLong: 'ข้อมูลยาวเกินไป',
            invalidNumber: 'กรุณากรอกตัวเลขที่ถูกต้อง',
            invalidEmail: 'รูปแบบอีเมลไม่ถูกต้อง',
            invalidPhone: 'รูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง',
            invalidIdCard: 'รูปแบบเลขบัตรประชาชนไม่ถูกต้อง',
            passwordMismatch: 'รหัสผ่านไม่ตรงกัน',
            weakPassword: 'รหัสผ่านไม่ปลอดภัย',
            negativeNumber: 'ตัวเลขต้องไม่ติดลบ',
            invalidDate: 'วันที่ไม่ถูกต้อง',
            futureDate: 'วันที่ต้องไม่เป็นอนาคต',
            pastDate: 'วันที่ต้องไม่เป็นอดีต'
        },

        // Business logic errors
        business: {
            insufficientFunds: 'ยอดเงินไม่เพียงพอ',
            quotaExceeded: 'เกินขีดจำกัดที่กำหนด',
            duplicateEntry: 'ข้อมูลซ้ำกับที่มีอยู่แล้ว',
            invalidOperation: 'ไม่สามารถดำเนินการนี้ได้',
            businessRuleViolation: 'ไม่เป็นไปตามกฎทางธุรกิจ',
            accountLocked: 'บัญชีถูกล็อก',
            operationNotAllowed: 'ไม่อนุญาตให้ทำการดำเนินการนี้',
            timeExpired: 'หมดเวลาในการดำเนินการ',
            badDebtFound: 'พบประวัติหนี้สูญ ไม่สามารถดำเนินการต่อได้',
            documentRequired: 'กรุณาแนบเอกสารที่จำเป็น'
        },

        // System errors
        system: {
            generalError: 'เกิดข้อผิดพลาดในระบบ',
            databaseError: 'เกิดข้อผิดพลาดฐานข้อมูล',
            fileUploadError: 'ไม่สามารถอัพโหลดไฟล์ได้',
            storageError: 'ไม่สามารถบันทึกข้อมูลได้',
            memoryError: 'หน่วยความจำไม่เพียงพอ',
            configError: 'การตั้งค่าระบบไม่ถูกต้อง',
            serviceUnavailable: 'บริการไม่สามารถใช้งานได้ในขณะนี้',
            maintenanceMode: 'ระบบอยู่ในช่วงปรับปรุง',
            versionMismatch: 'เวอร์ชั่นไม่ตรงกัน กรุณาโหลดหน้าใหม่'
        },

        // Security errors
        security: {
            sessionExpired: 'หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่',
            invalidToken: 'รหัสยืนยันไม่ถูกต้อง',
            csrfError: 'การตรวจสอบความปลอดภัยล้มเหลว',
            rateLimitExceeded: 'ใช้งานเกินขีดจำกัด กรุณารอสักครู่',
            suspiciousActivity: 'พบกิจกรรมที่น่าสงสัย',
            accountCompromised: 'บัญชีอาจถูกบุกรุก กรุณาติดต่อผู้ดูแล',
            maliciousContent: 'พบเนื้อหาที่อาจเป็นอันตราย',
            xssAttempt: 'พบความพยายามโจมตี XSS'
        },

        // File and media errors
        file: {
            fileTooLarge: 'ไฟล์มีขนาดใหญ่เกินไป',
            invalidFileType: 'ประเภทไฟล์ไม่ถูกต้อง',
            corruptedFile: 'ไฟล์เสียหาย',
            uploadFailed: 'การอัพโหลดไฟล์ล้มเหลว',
            downloadFailed: 'การดาวน์โหลดไฟล์ล้มเหลว',
            fileNotFound: 'ไม่พบไฟล์ที่ต้องการ',
            storageQuotaExceeded: 'พื้นที่จัดเก็บไฟล์เต็ม'
        },

        // Payment and financial errors
        payment: {
            paymentFailed: 'การชำระเงินล้มเหลว',
            insufficientBalance: 'ยอดเงินคงเหลือไม่เพียงพอ',
            invalidPaymentMethod: 'วิธีการชำระเงินไม่ถูกต้อง',
            paymentTimeout: 'หมดเวลาการชำระเงิน',
            transactionDeclined: 'ธุรกรรมถูกปฏิเสธ',
            duplicateTransaction: 'ธุรกรรมซ้ำ',
            invalidAmount: 'จำนวนเงินไม่ถูกต้อง',
            currencyMismatch: 'สกุลเงินไม่ตรงกัน'
        }
    };

    /**
     * Error recovery suggestions
     */
    const RecoverySuggestions = {
        network: [
            'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
            'ลองโหลดหน้าเว็บใหม่',
            'รอสักครู่แล้วลองใหม่',
            'ติดต่อผู้ดูแลเครือข่าย'
        ],
        validation: [
            'ตรวจสอบข้อมูลที่กรอก',
            'อ่านคำแนะนำการกรอกข้อมูล',
            'ลองใช้รูปแบบข้อมูลอื่น',
            'ติดต่อเจ้าหน้าที่เพื่อขอความช่วยเหลือ'
        ],
        business: [
            'ตรวจสอบเงื่อนไขทางธุรกิจ',
            'ปรับปรุงข้อมูลให้ครบถ้วน',
            'ติดต่อเจ้าหน้าที่เพื่อขออนุมัติ',
            'อ่านคู่มือการใช้งาน'
        ],
        system: [
            'รอสักครู่แล้วลองใหม่',
            'โหลดหน้าเว็บใหม่',
            'ลบแคชของเบราว์เซอร์',
            'ติดต่อผู้ดูแลระบบ'
        ],
        security: [
            'เข้าสู่ระบบใหม่',
            'ตรวจสอบรหัสผ่าน',
            'รอสักครู่แล้วลองใหม่',
            'ติดต่อผู้ดูแลระบบหากปัญหายังคงมีอยู่'
        ]
    };

    /**
     * Enhanced Thai error handler
     */
    const ThaiErrorHandler = {
        // Configuration
        config: {
            showStackTrace: false,
            logToConsole: true,
            logToServer: false,
            maxErrorHistory: 50,
            autoRetryAttempts: 3,
            retryDelay: 1000,
            notificationDuration: 5000
        },

        // Error history for debugging
        errorHistory: [],

        /**
         * Categorize error based on type and context
         * @param {Error|string} error - Error object or message
         * @param {string} context - Error context
         * @returns {object} - Error category info
         */
        categorizeError: function(error, context = '') {
            const errorMessage = typeof error === 'string' ? error : error.message || error.toString();
            const errorLower = errorMessage.toLowerCase();

            // Network errors
            if (errorLower.includes('network') || errorLower.includes('fetch') ||
                errorLower.includes('connection') || errorLower.includes('timeout')) {
                return { category: 'network', severity: 'medium' };
            }

            // HTTP status errors
            if (errorLower.includes('401') || errorLower.includes('unauthorized')) {
                return { category: 'security', type: 'unauthorized', severity: 'high' };
            }

            if (errorLower.includes('403') || errorLower.includes('forbidden')) {
                return { category: 'security', type: 'forbidden', severity: 'high' };
            }

            if (errorLower.includes('404') || errorLower.includes('not found')) {
                return { category: 'network', type: 'notFound', severity: 'low' };
            }

            if (errorLower.includes('500') || errorLower.includes('server error')) {
                return { category: 'system', type: 'serverError', severity: 'high' };
            }

            // Validation errors
            if (errorLower.includes('validation') || errorLower.includes('invalid') ||
                errorLower.includes('required') || errorLower.includes('format')) {
                return { category: 'validation', severity: 'low' };
            }

            // Business logic errors
            if (errorLower.includes('bad debt') || errorLower.includes('หนี้สูญ')) {
                return { category: 'business', type: 'badDebtFound', severity: 'high' };
            }

            if (errorLower.includes('quota') || errorLower.includes('limit') ||
                errorLower.includes('exceeded') || errorLower.includes('เกิน')) {
                return { category: 'business', type: 'quotaExceeded', severity: 'medium' };
            }

            // File errors
            if (errorLower.includes('file') || errorLower.includes('upload') ||
                errorLower.includes('download') || errorLower.includes('ไฟล์')) {
                return { category: 'file', severity: 'medium' };
            }

            // Payment errors
            if (errorLower.includes('payment') || errorLower.includes('transaction') ||
                errorLower.includes('ชำระ') || errorLower.includes('ธุรกรรม')) {
                return { category: 'payment', severity: 'high' };
            }

            // Security errors
            if (errorLower.includes('xss') || errorLower.includes('csrf') ||
                errorLower.includes('malicious') || errorLower.includes('suspicious')) {
                return { category: 'security', severity: 'critical' };
            }

            // Default to system error
            return { category: 'system', type: 'generalError', severity: 'medium' };
        },

        /**
         * Get appropriate Thai error message
         * @param {object} errorInfo - Error categorization info
         * @param {Error|string} originalError - Original error
         * @returns {string} - Thai error message
         */
        getThaiErrorMessage: function(errorInfo, originalError) {
            const category = errorInfo.category;
            const type = errorInfo.type || 'generalError';

            // Get message from dictionary
            let message = ThaiErrorMessages[category]?.[type] ||
                         ThaiErrorMessages.system.generalError;

            // Add context-specific information
            if (typeof originalError === 'object' && originalError.details) {
                message += ` (รายละเอียด: ${XSS.sanitizeInput(originalError.details)})`;
            }

            return message;
        },

        /**
         * Get recovery suggestions based on error category
         * @param {string} category - Error category
         * @returns {Array} - Array of recovery suggestions
         */
        getRecoverySuggestions: function(category) {
            return RecoverySuggestions[category] || RecoverySuggestions.system;
        },

        /**
         * Show error notification with Thai message
         * @param {Error|string} error - Error object or message
         * @param {object} options - Notification options
         */
        showErrorNotification: function(error, options = {}) {
            const errorInfo = this.categorizeError(error, options.context);
            const thaiMessage = this.getThaiErrorMessage(errorInfo, error);

            const notificationOptions = {
                title: this.getSeverityTitle(errorInfo.severity),
                message: thaiMessage,
                type: this.getSeverityType(errorInfo.severity),
                duration: options.duration || this.config.notificationDuration,
                showSuggestions: options.showSuggestions !== false,
                allowRetry: options.allowRetry && errorInfo.category !== 'validation',
                retryCallback: options.retryCallback
            };

            this.renderNotification(notificationOptions);
        },

        /**
         * Get severity title in Thai
         * @param {string} severity - Error severity
         * @returns {string} - Thai severity title
         */
        getSeverityTitle: function(severity) {
            const titles = {
                low: 'ข้อมูลไม่ถูกต้อง',
                medium: 'เกิดข้อผิดพลาด',
                high: 'เกิดข้อผิดพลาดร้ายแรง',
                critical: 'เกิดข้อผิดพลาดวิกฤติ'
            };
            return titles[severity] || titles.medium;
        },

        /**
         * Get severity type for notification styling
         * @param {string} severity - Error severity
         * @returns {string} - Notification type
         */
        getSeverityType: function(severity) {
            const types = {
                low: 'warning',
                medium: 'error',
                high: 'error',
                critical: 'error'
            };
            return types[severity] || 'error';
        },

        /**
         * Render error notification UI
         * @param {object} options - Notification options
         */
        renderNotification: function(options) {
            // Try SweetAlert2 first
            if (typeof Swal !== 'undefined') {
                this.renderSweetAlertNotification(options);
                return;
            }

            // Fallback to custom notification
            this.renderCustomNotification(options);
        },

        /**
         * Render notification using SweetAlert2
         * @param {object} options - Notification options
         */
        renderSweetAlertNotification: function(options) {
            const swalConfig = {
                title: options.title,
                text: options.message,
                icon: options.type,
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: 'thai-error-popup',
                    title: 'thai-error-title',
                    content: 'thai-error-content'
                }
            };

            // Add suggestions if enabled
            if (options.showSuggestions) {
                const errorInfo = this.categorizeError(options.message);
                const suggestions = this.getRecoverySuggestions(errorInfo.category);

                swalConfig.html = `
                    <p class="mb-4">${XSS.escapeHtml(options.message)}</p>
                    <div class="text-left">
                        <h4 class="font-semibold mb-2">💡 แนะนำการแก้ไข:</h4>
                        <ul class="list-disc list-inside space-y-1 text-sm">
                            ${suggestions.map(suggestion => `
                                <li>${XSS.escapeHtml(suggestion)}</li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }

            // Add retry button if enabled
            if (options.allowRetry && options.retryCallback) {
                swalConfig.showCancelButton = true;
                swalConfig.cancelButtonText = '🔄 ลองใหม่';
                swalConfig.reverseButtons = true;
            }

            Swal.fire(swalConfig).then((result) => {
                if (result.dismiss === Swal.DismissReason.cancel && options.retryCallback) {
                    options.retryCallback();
                }
            });
        },

        /**
         * Render custom notification fallback
         * @param {object} options - Notification options
         */
        renderCustomNotification: function(options) {
            // Remove existing notification
            const existing = document.getElementById('thaiErrorNotification');
            if (existing) {
                existing.remove();
            }

            // Create notification element
            const notification = document.createElement('div');
            notification.id = 'thaiErrorNotification';
            notification.className = `
                fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg
                animate__animated animate__fadeInRight
                ${options.type === 'error' ? 'bg-red-100 border-red-500 text-red-800' :
                  options.type === 'warning' ? 'bg-yellow-100 border-yellow-500 text-yellow-800' :
                  'bg-blue-100 border-blue-500 text-blue-800'}
                border-l-4
            `;

            let suggestionsHtml = '';
            if (options.showSuggestions) {
                const errorInfo = this.categorizeError(options.message);
                const suggestions = this.getRecoverySuggestions(errorInfo.category);

                suggestionsHtml = `
                    <div class="mt-3 pt-3 border-t border-gray-300">
                        <h5 class="font-semibold text-sm mb-2">💡 แนะนำการแก้ไข:</h5>
                        <ul class="list-disc list-inside space-y-1 text-xs">
                            ${suggestions.map(suggestion => `
                                <li>${XSS.escapeHtml(suggestion)}</li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }

            let retryButtonHtml = '';
            if (options.allowRetry && options.retryCallback) {
                retryButtonHtml = `
                    <button type="button" class="btn-retry mt-3 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                        🔄 ลองใหม่
                    </button>
                `;
            }

            notification.innerHTML = `
                <div class="flex items-start">
                    <div class="flex-1">
                        <h4 class="font-semibold text-sm">${XSS.escapeHtml(options.title)}</h4>
                        <p class="text-sm mt-1">${XSS.escapeHtml(options.message)}</p>
                        ${suggestionsHtml}
                        ${retryButtonHtml}
                    </div>
                    <button type="button" class="btn-close ml-2 text-gray-500 hover:text-gray-700">
                        <i class="bi bi-x text-lg"></i>
                    </button>
                </div>
            `;

            // Add event listeners
            notification.querySelector('.btn-close').addEventListener('click', () => {
                notification.classList.add('animate__fadeOutRight');
                setTimeout(() => notification.remove(), 300);
            });

            if (options.allowRetry && options.retryCallback) {
                notification.querySelector('.btn-retry').addEventListener('click', () => {
                    notification.remove();
                    options.retryCallback();
                });
            }

            // Auto-remove after duration
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.add('animate__fadeOutRight');
                    setTimeout(() => notification.remove(), 300);
                }
            }, options.duration);

            document.body.appendChild(notification);
        },

        /**
         * Log error for debugging and monitoring
         * @param {Error|string} error - Error to log
         * @param {object} context - Error context
         */
        logError: function(error, context = {}) {
            const errorInfo = this.categorizeError(error, context.area);
            const logEntry = {
                timestamp: new Date().toISOString(),
                message: typeof error === 'string' ? error : error.message,
                stack: typeof error === 'object' ? error.stack : undefined,
                category: errorInfo.category,
                severity: errorInfo.severity,
                context: context,
                url: window.location.href,
                userAgent: navigator.userAgent
            };

            // Add to history
            this.errorHistory.unshift(logEntry);
            if (this.errorHistory.length > this.config.maxErrorHistory) {
                this.errorHistory.pop();
            }

            // Console logging
            if (this.config.logToConsole) {
                const logMethod = errorInfo.severity === 'critical' ? 'error' :
                                errorInfo.severity === 'high' ? 'error' :
                                errorInfo.severity === 'medium' ? 'warn' : 'info';

                console[logMethod]('🚨 Thai Error Handler:', logEntry);
            }

            // Server logging (if enabled)
            if (this.config.logToServer) {
                this.sendErrorToServer(logEntry);
            }
        },

        /**
         * Send error to server for monitoring
         * @param {object} logEntry - Error log entry
         */
        sendErrorToServer: function(logEntry) {
            try {
                fetch('/api/system/log-error', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                    },
                    body: JSON.stringify(logEntry)
                }).catch(serverError => {
                    console.warn('⚠️ Failed to send error to server:', serverError);
                });
            } catch (sendError) {
                console.warn('⚠️ Error in sendErrorToServer:', sendError);
            }
        },

        /**
         * Handle API errors with automatic retry
         * @param {Error} error - API error
         * @param {function} retryFunction - Function to retry
         * @param {object} options - Retry options
         * @returns {Promise} - Retry promise
         */
        handleApiError: async function(error, retryFunction, options = {}) {
            const maxAttempts = options.maxAttempts || this.config.autoRetryAttempts;
            const delay = options.delay || this.config.retryDelay;
            const context = options.context || 'API';

            this.logError(error, { area: context, operation: 'API_CALL' });

            // Check if error is retryable
            const errorInfo = this.categorizeError(error);
            const retryableCategories = ['network', 'system'];

            if (!retryableCategories.includes(errorInfo.category) || maxAttempts <= 1) {
                this.showErrorNotification(error, { context });
                throw error;
            }

            // Retry logic
            for (let attempt = 2; attempt <= maxAttempts; attempt++) {
                try {
                    console.info(`🔄 Retrying API call (attempt ${attempt}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                    return await retryFunction();
                } catch (retryError) {
                    console.warn(`⚠️ Retry attempt ${attempt} failed:`, retryError.message);

                    if (attempt === maxAttempts) {
                        this.showErrorNotification(retryError, {
                            context,
                            showSuggestions: true
                        });
                        throw retryError;
                    }
                }
            }
        },

        /**
         * Handle form validation errors
         * @param {object} validationErrors - Validation errors object
         * @param {HTMLFormElement} form - Form element
         */
        handleValidationErrors: function(validationErrors, form) {
            if (!validationErrors || typeof validationErrors !== 'object') return;

            for (const [fieldName, error] of Object.entries(validationErrors)) {
                const field = form.querySelector(`[name="${fieldName}"]`);
                if (field) {
                    // Add error styling
                    field.classList.add('border-red-500', 'focus:border-red-500');

                    // Show error message
                    this.showFieldError(field, error);
                }
            }

            // Focus on first error field
            const firstErrorField = form.querySelector('.border-red-500');
            if (firstErrorField) {
                firstErrorField.focus();
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        /**
         * Show field-specific error message
         * @param {HTMLElement} field - Input field
         * @param {string} error - Error message
         */
        showFieldError: function(field, error) {
            // Remove existing error
            this.clearFieldError(field);

            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error text-red-500 text-sm mt-1';
            errorDiv.textContent = XSS.sanitizeInput(error);

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
            field.classList.remove('border-red-500', 'focus:border-red-500');
        },

        /**
         * Get error history for debugging
         * @returns {Array} - Error history
         */
        getErrorHistory: function() {
            return this.errorHistory;
        },

        /**
         * Clear error history
         */
        clearErrorHistory: function() {
            this.errorHistory = [];
            console.info('🧹 Error history cleared');
        },

        /**
         * Initialize Thai error handler
         */
        initialize: function() {
            console.info('🚨 Initializing Thai Error Handler...');

            // Global error handlers
            window.addEventListener('error', (event) => {
                this.logError(event.error || event.message, {
                    area: 'GLOBAL',
                    operation: 'SCRIPT_ERROR',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                this.logError(new Error(event.reason), {
                    area: 'GLOBAL',
                    operation: 'UNHANDLED_PROMISE_REJECTION'
                });
            });

            console.info('✅ Thai Error Handler initialized');
        }
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            ThaiErrorHandler.initialize();
        });
    } else {
        ThaiErrorHandler.initialize();
    }

    // Export to global scope
    global.ThaiErrorHandler = ThaiErrorHandler;

    console.info('🚨 Thai Error Handler v1.0.0 loaded');

})(window);