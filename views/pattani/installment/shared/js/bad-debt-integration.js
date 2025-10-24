/**
 * Bad Debt Integration for Thai Accounting System
 * ===============================================
 *
 * Integrates bad debt checking into the installment flow,
 * particularly for customer validation in step1 and step2.
 *
 * Features:
 * - Real-time bad debt checking
 * - Customer risk assessment
 * - Visual warnings and notifications
 * - Automatic progression control
 * - Thai language feedback
 * - Secure API communication
 *
 * @version 1.0.0
 * @author Thai Accounting System Maintenance Expert
 */

(function(global) {
    'use strict';

    // Import security utilities
    const Security = global.FrontendSecurity || {};
    const XSS = Security.XSSPrevention || {};
    const FormValidator = Security.FormValidator || {};
    const ErrorHandler = Security.ErrorHandler || {};
    const SecureStorage = Security.SecureStorage || {};

    /**
     * Bad debt checking and validation utilities
     */
    const BadDebtIntegration = {
        // Configuration
        config: {
            apiEndpoint: '/api/loan/bad-debt/check',
            cacheTimeout: 300000, // 5 minutes
            maxRetries: 3,
            retryDelay: 1000
        },

        // Cache for bad debt check results
        cache: new Map(),

        /**
         * Check customer bad debt status with caching
         * @param {string} idCard - Customer ID card number
         * @param {boolean} forceRefresh - Force refresh cache
         * @returns {Promise<object>} - Bad debt check result
         */
        checkCustomerBadDebt: async function(idCard, forceRefresh = false) {
            try {
                // Validate ID card first
                const validatedId = FormValidator.validateIdCard(idCard);
                if (!validatedId.isValid) {
                    return {
                        hasError: true,
                        error: validatedId.error,
                        canProceed: false
                    };
                }

                const sanitizedIdCard = validatedId.value;
                const cacheKey = `baddebt_${sanitizedIdCard}`;

                // Check cache first
                if (!forceRefresh && this.cache.has(cacheKey)) {
                    const cached = this.cache.get(cacheKey);
                    if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
                        console.info('🔄 Using cached bad debt result');
                        return cached.data;
                    }
                }

                // Show loading indicator
                this.showLoadingIndicator(true);

                // Make API request with retry logic
                const result = await this.makeApiRequest(sanitizedIdCard);

                // Cache the result
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });

                // Store in secure storage for offline reference
                SecureStorage.setItem(`baddebt_check_${sanitizedIdCard}`, result);

                return result;

            } catch (error) {
                console.error('❌ Bad debt check error:', error);
                return {
                    hasError: true,
                    error: 'ไม่สามารถตรวจสอบข้อมูลหนี้สูญได้ กรุณาลองใหม่อีกครั้ง',
                    canProceed: false
                };
            } finally {
                this.showLoadingIndicator(false);
            }
        },

        /**
         * Make API request with retry logic
         * @param {string} idCard - Sanitized ID card
         * @returns {Promise<object>} - API response
         */
        makeApiRequest: async function(idCard) {
            let lastError = null;

            for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
                try {
                    const response = await fetch(this.config.apiEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({ idCard: idCard })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const result = await response.json();

                    // Validate and sanitize response
                    return this.sanitizeApiResponse(result);

                } catch (error) {
                    lastError = error;
                    console.warn(`⚠️ Bad debt API attempt ${attempt} failed:`, error.message);

                    // Wait before retry (except for last attempt)
                    if (attempt < this.config.maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
                    }
                }
            }

            throw lastError;
        },

        /**
         * Sanitize and validate API response
         * @param {object} response - Raw API response
         * @returns {object} - Sanitized response
         */
        sanitizeApiResponse: function(response) {
            const sanitized = {
                hasError: false,
                hasBadDebt: Boolean(response.hasBadDebt),
                badDebtAmount: Security.FinancialCalculator?.safeParseFloat(response.totalBadDebt) || 0,
                badDebtCount: parseInt(response.badDebtCount) || 0,
                canProceed: Boolean(response.allowOverride !== false),
                warningMessage: XSS.sanitizeInput(response.warningMessage || ''),
                riskLevel: XSS.sanitizeInput(response.riskLevel || 'low'),
                details: Array.isArray(response.details) ? response.details.map(detail => ({
                    contractNo: XSS.sanitizeInput(detail.contractNo || ''),
                    amount: Security.FinancialCalculator?.safeParseFloat(detail.amount) || 0,
                    daysOverdue: parseInt(detail.daysOverdue) || 0,
                    status: XSS.sanitizeInput(detail.status || '')
                })) : []
            };

            // Determine if customer can proceed based on risk level and amount
            if (sanitized.hasBadDebt) {
                if (sanitized.badDebtAmount > 50000 || sanitized.riskLevel === 'high') {
                    sanitized.canProceed = false;
                } else if (sanitized.badDebtAmount > 10000 || sanitized.riskLevel === 'medium') {
                    sanitized.canProceed = true;
                    sanitized.requiresApproval = true;
                }
            }

            return sanitized;
        },

        /**
         * Display bad debt status in UI
         * @param {object} badDebtResult - Bad debt check result
         * @param {HTMLElement} container - Container element
         * @param {object} options - Display options
         */
        displayBadDebtStatus: function(badDebtResult, container, options = {}) {
            if (!container) return;

            // Clear previous content
            container.innerHTML = '';
            container.className = 'bad-debt-status mb-4';

            if (badDebtResult.hasError) {
                this.renderErrorStatus(container, badDebtResult.error);
                return;
            }

            if (badDebtResult.hasBadDebt) {
                this.renderBadDebtWarning(container, badDebtResult, options);
            } else {
                this.renderCleanStatus(container);
            }

            // Add animation
            container.classList.add('animate__animated', 'animate__fadeIn');
        },

        /**
         * Render error status
         * @param {HTMLElement} container - Container element
         * @param {string} error - Error message
         */
        renderErrorStatus: function(container, error) {
            container.innerHTML = `
                <div class="alert alert-error">
                    <div class="flex items-center">
                        <i class="bi bi-exclamation-triangle text-xl mr-3"></i>
                        <div>
                            <h4 class="font-semibold">ไม่สามารถตรวจสอบข้อมูลได้</h4>
                            <p class="text-sm">${XSS.escapeHtml(error)}</p>
                            <button type="button" class="btn btn-sm btn-outline mt-2" onclick="BadDebtIntegration.retryCheck()">
                                <i class="bi bi-arrow-clockwise"></i> ลองใหม่
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Render bad debt warning
         * @param {HTMLElement} container - Container element
         * @param {object} result - Bad debt result
         * @param {object} options - Display options
         */
        renderBadDebtWarning: function(container, result, options) {
            const alertClass = result.canProceed ? 'alert-warning' : 'alert-error';
            const icon = result.canProceed ? 'bi-exclamation-triangle' : 'bi-x-circle';
            const title = result.canProceed ? '⚠️ พบข้อมูลหนี้สูญ' : '❌ ไม่สามารถดำเนินการได้';

            const formattedAmount = Security.FinancialCalculator?.formatCurrency(result.badDebtAmount) ||
                                   `${result.badDebtAmount.toLocaleString()} บาท`;

            let detailsHtml = '';
            if (options.showDetails && result.details.length > 0) {
                detailsHtml = `
                    <div class="mt-3">
                        <h5 class="font-semibold text-sm mb-2">รายละเอียดหนี้สูญ:</h5>
                        <div class="space-y-1">
                            ${result.details.map(detail => `
                                <div class="text-xs bg-white bg-opacity-50 p-2 rounded">
                                    <span class="font-mono">${XSS.escapeHtml(detail.contractNo)}</span> -
                                    ${Security.FinancialCalculator?.formatCurrency(detail.amount) || detail.amount} บาท
                                    (เกินกำหนด ${detail.daysOverdue} วัน)
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="alert ${alertClass}">
                    <div class="flex items-start">
                        <i class="bi ${icon} text-xl mr-3 mt-1"></i>
                        <div class="flex-1">
                            <h4 class="font-semibold">${title}</h4>
                            <p class="mt-1">ลูกค้ารายนี้มีหนี้สูญจำนวน <span class="font-semibold">${formattedAmount}</span>
                               (${result.badDebtCount} รายการ)</p>

                            ${result.warningMessage ? `
                                <p class="text-sm mt-2 opacity-90">${XSS.escapeHtml(result.warningMessage)}</p>
                            ` : ''}

                            ${detailsHtml}

                            ${result.requiresApproval ? `
                                <div class="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900 rounded text-sm">
                                    <i class="bi bi-info-circle"></i>
                                    ต้องได้รับอนุมัติจากผู้จัดการก่อนดำเนินการต่อ
                                </div>
                            ` : ''}

                            ${!result.canProceed ? `
                                <p class="text-sm mt-2 font-semibold">
                                    <i class="bi bi-ban"></i> ไม่สามารถดำเนินการทำสัญญาผ่อนชำระได้
                                </p>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Render clean status (no bad debt)
         * @param {HTMLElement} container - Container element
         */
        renderCleanStatus: function(container) {
            container.innerHTML = `
                <div class="alert alert-success">
                    <div class="flex items-center">
                        <i class="bi bi-check-circle text-xl mr-3"></i>
                        <div>
                            <h4 class="font-semibold">✅ ผ่านการตรวจสอบ</h4>
                            <p class="text-sm">ลูกค้าไม่มีประวัติหนี้สูญ สามารถดำเนินการต่อได้</p>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Show/hide loading indicator
         * @param {boolean} show - Show or hide
         */
        showLoadingIndicator: function(show) {
            let indicator = document.getElementById('badDebtLoadingIndicator');

            if (show) {
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.id = 'badDebtLoadingIndicator';
                    indicator.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50';
                    indicator.innerHTML = `
                        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border">
                            <div class="flex items-center space-x-3">
                                <div class="loading loading-spinner loading-sm"></div>
                                <span class="text-sm">กำลังตรวจสอบข้อมูลหนี้สูญ...</span>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(indicator);
                }
                indicator.style.display = 'block';
            } else {
                if (indicator) {
                    indicator.style.display = 'none';
                }
            }
        },

        /**
         * Auto-check bad debt when ID card is entered
         * @param {HTMLElement} idCardInput - ID card input element
         * @param {HTMLElement} statusContainer - Status display container
         */
        setupAutoCheck: function(idCardInput, statusContainer) {
            if (!idCardInput || !statusContainer) return;

            let checkTimeout = null;

            idCardInput.addEventListener('input', () => {
                // Clear previous timeout
                if (checkTimeout) {
                    clearTimeout(checkTimeout);
                }

                const idCard = idCardInput.value.trim();

                // Clear status if input is empty
                if (!idCard) {
                    statusContainer.innerHTML = '';
                    return;
                }

                // Validate ID card format first
                const validation = FormValidator.validateIdCard(idCard);
                if (!validation.isValid) {
                    // Don't show error immediately, wait for complete input
                    if (idCard.length >= 13) {
                        statusContainer.innerHTML = `
                            <div class="alert alert-warning">
                                <i class="bi bi-exclamation-triangle"></i>
                                <span>${XSS.escapeHtml(validation.error)}</span>
                            </div>
                        `;
                    }
                    return;
                }

                // Auto-check with delay
                checkTimeout = setTimeout(async () => {
                    const result = await this.checkCustomerBadDebt(idCard);
                    this.displayBadDebtStatus(result, statusContainer, { showDetails: true });

                    // Store result for step validation
                    if (window.globalInstallmentManager) {
                        window.globalInstallmentManager.updateStepData('badDebt', {
                            idCard: idCard,
                            result: result,
                            checkedAt: new Date().toISOString()
                        });
                    }
                }, 1000);
            });
        },

        /**
         * Validate step progression based on bad debt status
         * @param {string} idCard - Customer ID card
         * @returns {Promise<object>} - Validation result
         */
        validateStepProgression: async function(idCard) {
            if (!idCard) {
                return { canProceed: false, error: 'กรุณากรอกเลขบัตรประชาชน' };
            }

            const result = await this.checkCustomerBadDebt(idCard);

            if (result.hasError) {
                return { canProceed: false, error: result.error };
            }

            if (result.hasBadDebt && !result.canProceed) {
                return {
                    canProceed: false,
                    error: 'ลูกค้ามีหนี้สูญ ไม่สามารถดำเนินการต่อได้',
                    requiresManagerApproval: false
                };
            }

            if (result.requiresApproval) {
                return {
                    canProceed: true,
                    error: '',
                    requiresManagerApproval: true,
                    warningMessage: 'ต้องได้รับอนุมัติจากผู้จัดการ'
                };
            }

            return { canProceed: true, error: '' };
        },

        /**
         * Clear bad debt cache
         */
        clearCache: function() {
            this.cache.clear();
            console.info('🧹 Bad debt cache cleared');
        },

        /**
         * Retry last bad debt check
         */
        retryCheck: function() {
            const lastIdCard = document.querySelector('input[name="idCard"], #customerIdCard')?.value;
            if (lastIdCard) {
                const statusContainer = document.getElementById('badDebtStatus') ||
                                      document.querySelector('.bad-debt-status');
                if (statusContainer) {
                    this.checkCustomerBadDebt(lastIdCard, true).then(result => {
                        this.displayBadDebtStatus(result, statusContainer, { showDetails: true });
                    });
                }
            }
        },

        /**
         * Initialize bad debt integration
         */
        initialize: function() {
            console.info('🔍 Initializing Bad Debt Integration...');

            // Setup auto-check for common ID card inputs
            const idCardInputs = document.querySelectorAll('input[name="idCard"], #customerIdCard, .id-card-input');
            const statusContainers = document.querySelectorAll('#badDebtStatus, .bad-debt-status');

            idCardInputs.forEach((input, index) => {
                const container = statusContainers[index] || statusContainers[0];
                if (container) {
                    this.setupAutoCheck(input, container);
                }
            });

            // Clear cache periodically
            setInterval(() => {
                this.clearCache();
            }, this.config.cacheTimeout * 2);

            console.info('✅ Bad Debt Integration initialized');
        }
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            BadDebtIntegration.initialize();
        });
    } else {
        BadDebtIntegration.initialize();
    }

    // Export to global scope
    global.BadDebtIntegration = BadDebtIntegration;

    console.info('🔍 Bad Debt Integration v1.0.0 loaded');

})(window);