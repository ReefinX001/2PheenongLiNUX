/**
 * Installment Flow Integration for Thai Accounting System
 * =======================================================
 *
 * Master integration file that ties together all frontend enhancements
 * for the installment flow (step1-step4) with comprehensive validation,
 * security, and user experience improvements.
 *
 * Features:
 * - Step-by-step validation coordination
 * - Thai Baht precision formatting
 * - Navigation flow control
 * - Data persistence and integrity
 * - Progress tracking and feedback
 * - Accessibility improvements
 * - Mobile responsiveness
 *
 * @version 1.0.0
 * @author Thai Accounting System Maintenance Expert
 */

(function(global) {
    'use strict';

    // Import all security and validation utilities
    const Security = global.FrontendSecurity || {};
    const BadDebt = global.BadDebtIntegration || {};
    const Storage = global.LocalStorageValidator || {};
    const ErrorHandler = global.ThaiErrorHandler || {};
    const Step3Fixes = global.Step3CalculationFixes || {};

    /**
     * Thai Baht precision formatting and validation
     */
    const ThaiCurrencyManager = {
        /**
         * Format number as Thai Baht with proper precision
         * @param {number} amount - Amount to format
         * @param {object} options - Formatting options
         * @returns {string} - Formatted currency string
         */
        formatBaht: function(amount, options = {}) {
            const num = Security.FinancialCalculator?.safeParseFloat(amount) || parseFloat(amount) || 0;

            const formatOptions = {
                style: 'currency',
                currency: 'THB',
                minimumFractionDigits: options.precision || 2,
                maximumFractionDigits: options.precision || 2,
                currencyDisplay: options.symbol || 'symbol'
            };

            try {
                return new Intl.NumberFormat('th-TH', formatOptions).format(num);
            } catch (error) {
                // Fallback formatting
                return `฿${num.toFixed(options.precision || 2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
            }
        },

        /**
         * Format number without currency symbol
         * @param {number} amount - Amount to format
         * @param {number} precision - Decimal precision
         * @returns {string} - Formatted number string
         */
        formatNumber: function(amount, precision = 2) {
            const num = Security.FinancialCalculator?.safeParseFloat(amount) || parseFloat(amount) || 0;

            try {
                return new Intl.NumberFormat('th-TH', {
                    minimumFractionDigits: precision,
                    maximumFractionDigits: precision
                }).format(num);
            } catch (error) {
                return num.toFixed(precision).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            }
        },

        /**
         * Parse Thai formatted currency to number
         * @param {string} formatted - Formatted currency string
         * @returns {number} - Parsed number
         */
        parseBaht: function(formatted) {
            if (!formatted) return 0;

            // Remove Thai currency symbols and formatting
            const cleaned = String(formatted)
                .replace(/[฿,\s]/g, '')
                .replace(/[^\d.-]/g, '');

            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        },

        /**
         * Validate Thai Baht amount
         * @param {string|number} amount - Amount to validate
         * @returns {object} - Validation result
         */
        validateBahtAmount: function(amount) {
            const num = this.parseBaht(amount);

            if (num < 0) {
                return { isValid: false, error: 'จำนวนเงินต้องไม่ติดลบ', value: 0 };
            }

            if (num > 999999999.99) {
                return { isValid: false, error: 'จำนวนเงินเกินขีดจำกัด (999,999,999.99 บาท)', value: 0 };
            }

            // Check decimal precision (max 2 places for Thai Baht)
            const decimalStr = String(num).split('.')[1];
            if (decimalStr && decimalStr.length > 2) {
                return { isValid: false, error: 'จำนวนเงินมีทศนิยมเกิน 2 ตำแหน่ง', value: 0 };
            }

            return { isValid: true, error: '', value: Math.round(num * 100) / 100 };
        },

        /**
         * Auto-format currency inputs in real-time
         * @param {HTMLElement} input - Input element
         */
        setupCurrencyInput: function(input) {
            if (!input) return;

            let lastValue = '';

            input.addEventListener('input', (event) => {
                const cursorPosition = input.selectionStart;
                const value = input.value;

                // Parse and validate
                const validation = this.validateBahtAmount(value);

                if (validation.isValid && value !== lastValue) {
                    // Format the value
                    const formatted = this.formatNumber(validation.value);
                    input.value = formatted;
                    lastValue = formatted;

                    // Restore cursor position approximately
                    const newPosition = Math.min(cursorPosition, formatted.length);
                    setTimeout(() => {
                        input.setSelectionRange(newPosition, newPosition);
                    }, 0);
                } else if (!validation.isValid && value) {
                    // Show validation error
                    input.classList.add('border-red-500');
                    if (Security.FormValidator?.showFieldError) {
                        Security.FormValidator.showFieldError(input, validation.error);
                    }
                } else {
                    input.classList.remove('border-red-500');
                    if (Security.FormValidator?.clearFieldError) {
                        Security.FormValidator.clearFieldError(input);
                    }
                }
            });

            input.addEventListener('blur', () => {
                const validation = this.validateBahtAmount(input.value);
                if (validation.isValid) {
                    input.value = this.formatNumber(validation.value);
                }
            });
        },

        /**
         * Setup all currency inputs in the document
         */
        initializeCurrencyInputs: function() {
            const currencyInputs = document.querySelectorAll(
                'input[type="number"][data-currency="THB"], ' +
                'input.currency-input, ' +
                'input[name*="amount"], ' +
                'input[name*="price"], ' +
                'input[name*="fee"]'
            );

            currencyInputs.forEach(input => {
                this.setupCurrencyInput(input);
            });
        }
    };

    /**
     * Navigation flow control and validation
     */
    const NavigationController = {
        currentStep: 1,
        maxCompletedStep: 0,

        /**
         * Initialize navigation controller
         */
        initialize: function() {
            this.detectCurrentStep();
            this.setupNavigationEvents();
            this.updateProgressIndicator();
        },

        /**
         * Detect current step from URL
         */
        detectCurrentStep: function() {
            const path = window.location.pathname;

            if (path.includes('step1')) this.currentStep = 1;
            else if (path.includes('step2')) this.currentStep = 2;
            else if (path.includes('step3')) this.currentStep = 3;
            else if (path.includes('step4')) this.currentStep = 4;

            // Load progress from storage
            const savedProgress = Storage?.getItem('installment_progress');
            if (savedProgress) {
                this.maxCompletedStep = savedProgress.maxCompletedStep || 0;
            }
        },

        /**
         * Setup navigation event listeners
         */
        setupNavigationEvents: function() {
            // Next button handlers
            document.addEventListener('click', (event) => {
                if (event.target.matches('.next-step-btn, .proceed-btn, #nextStepBtn')) {
                    event.preventDefault();
                    this.handleNextStep();
                }

                if (event.target.matches('.prev-step-btn, .back-btn, #prevStepBtn')) {
                    event.preventDefault();
                    this.handlePreviousStep();
                }

                if (event.target.matches('.step-nav-btn')) {
                    event.preventDefault();
                    const targetStep = parseInt(event.target.dataset.step);
                    this.navigateToStep(targetStep);
                }
            });

            // Prevent accidental navigation
            window.addEventListener('beforeunload', (event) => {
                if (this.hasUnsavedChanges()) {
                    event.preventDefault();
                    event.returnValue = 'คุณมีข้อมูลที่ยังไม่ได้บันทึก หากออกจากหน้านี้ข้อมูลจะหายไป';
                }
            });
        },

        /**
         * Handle next step navigation
         */
        handleNextStep: async function() {
            const validation = await this.validateCurrentStep();

            if (!validation.canProceed) {
                ErrorHandler?.showErrorNotification(validation.error, {
                    context: `Step ${this.currentStep} Validation`
                });
                return;
            }

            // Save current step data
            this.saveStepData(this.currentStep, validation.data);

            // Update progress
            this.maxCompletedStep = Math.max(this.maxCompletedStep, this.currentStep);
            this.saveProgress();

            // Navigate to next step
            const nextStep = this.currentStep + 1;
            if (nextStep <= 4) {
                this.navigateToStep(nextStep);
            } else {
                this.handleFlowCompletion();
            }
        },

        /**
         * Handle previous step navigation
         */
        handlePreviousStep: function() {
            const prevStep = this.currentStep - 1;
            if (prevStep >= 1) {
                this.navigateToStep(prevStep);
            }
        },

        /**
         * Navigate to specific step
         * @param {number} stepNumber - Target step number
         */
        navigateToStep: function(stepNumber) {
            if (stepNumber < 1 || stepNumber > 4) return;

            // Check if step is accessible
            if (stepNumber > this.maxCompletedStep + 1) {
                ErrorHandler?.showErrorNotification(
                    'กรุณาดำเนินการตามลำดับขั้นตอน',
                    { context: 'Navigation' }
                );
                return;
            }

            // Build URL
            const stepUrls = {
                1: '/views/pattani/installment/step1/step1.html',
                2: '/views/pattani/installment/step2/step2.html',
                3: '/views/pattani/installment/step3/step3.html',
                4: '/views/pattani/installment/step4/step4.html'
            };

            window.location.href = stepUrls[stepNumber];
        },

        /**
         * Validate current step
         * @returns {Promise<object>} - Validation result
         */
        validateCurrentStep: async function() {
            switch (this.currentStep) {
                case 1:
                    return this.validateStep1();
                case 2:
                    return this.validateStep2();
                case 3:
                    return this.validateStep3();
                case 4:
                    return this.validateStep4();
                default:
                    return { canProceed: false, error: 'ขั้นตอนไม่ถูกต้อง' };
            }
        },

        /**
         * Validate step 1 (product selection)
         * @returns {object} - Validation result
         */
        validateStep1: function() {
            if (global.Step1ValidationEnhancements?.Navigation?.validateStepCompletion) {
                return global.Step1ValidationEnhancements.Navigation.validateStepCompletion();
            }

            // Fallback validation
            const cartData = Storage?.getItem('cartItems') || [];
            if (!Array.isArray(cartData) || cartData.length === 0) {
                return { canProceed: false, error: 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ' };
            }

            const totalAmount = cartData.reduce((sum, item) => {
                return sum + (ThaiCurrencyManager.parseBaht(item.price) * parseInt(item.quantity || 1));
            }, 0);

            if (totalAmount < 1000) {
                return { canProceed: false, error: 'ยอดรวมขั้นต่ำ 1,000 บาท' };
            }

            return { canProceed: true, data: { items: cartData, totalAmount } };
        },

        /**
         * Validate step 2 (customer information)
         * @returns {Promise<object>} - Validation result
         */
        validateStep2: async function() {
            const customerData = Storage?.getItem('customer_data') || {};

            // Basic required fields
            const requiredFields = ['firstName', 'lastName', 'idCard', 'phone'];
            for (const field of requiredFields) {
                if (!customerData[field]) {
                    return { canProceed: false, error: `กรุณากรอก${this.getFieldDisplayName(field)}` };
                }
            }

            // Validate ID card format
            if (Security.FormValidator?.validateIdCard) {
                const idValidation = Security.FormValidator.validateIdCard(customerData.idCard);
                if (!idValidation.isValid) {
                    return { canProceed: false, error: idValidation.error };
                }
            }

            // Check bad debt if integration is available
            if (BadDebt?.validateStepProgression) {
                const badDebtResult = await BadDebt.validateStepProgression(customerData.idCard);
                if (!badDebtResult.canProceed) {
                    return { canProceed: false, error: badDebtResult.error };
                }

                if (badDebtResult.requiresManagerApproval) {
                    return {
                        canProceed: true,
                        requiresApproval: true,
                        warningMessage: badDebtResult.warningMessage,
                        data: customerData
                    };
                }
            }

            return { canProceed: true, data: customerData };
        },

        /**
         * Validate step 3 (payment terms)
         * @returns {object} - Validation result
         */
        validateStep3: function() {
            const step3Data = Storage?.getItem('step3_data') || {};

            if (!step3Data.totalWithTax || step3Data.totalWithTax <= 0) {
                return { canProceed: false, error: 'ยอดรวมการชำระไม่ถูกต้อง' };
            }

            // Validate payment method selection
            if (!step3Data.paymentMethod) {
                return { canProceed: false, error: 'กรุณาเลือกวิธีการชำระเงิน' };
            }

            // Validate document fee
            const docFee = ThaiCurrencyManager.parseBaht(step3Data.documentFee);
            if (docFee < 0 || docFee > 10000) {
                return { canProceed: false, error: 'ค่าธรรมเนียมเอกสารไม่ถูกต้อง' };
            }

            return { canProceed: true, data: step3Data };
        },

        /**
         * Validate step 4 (confirmation)
         * @returns {object} - Validation result
         */
        validateStep4: function() {
            const signatures = Storage?.getItem('signatures') || {};

            if (!signatures.customer) {
                return { canProceed: false, error: 'กรุณาลงลายเซ็นลูกค้า' };
            }

            if (!signatures.employee) {
                return { canProceed: false, error: 'กรุณาลงลายเซ็นพนักงาน' };
            }

            return { canProceed: true, data: { signatures } };
        },

        /**
         * Get display name for form fields
         * @param {string} field - Field name
         * @returns {string} - Display name in Thai
         */
        getFieldDisplayName: function(field) {
            const names = {
                firstName: 'ชื่อ',
                lastName: 'นามสกุล',
                idCard: 'เลขบัตรประชาชน',
                phone: 'หมายเลขโทรศัพท์',
                email: 'อีเมล',
                address: 'ที่อยู่'
            };
            return names[field] || field;
        },

        /**
         * Save step data to storage
         * @param {number} stepNumber - Step number
         * @param {object} data - Step data
         */
        saveStepData: function(stepNumber, data) {
            if (!Storage?.setItem) return;

            const stepKey = `step${stepNumber}_data`;
            Storage.setItem(stepKey, data);

            // Update global installment data
            const installmentData = Storage.getItem('installmentData') || {};
            installmentData[`step${stepNumber}`] = {
                data: data,
                completed: true,
                completedAt: new Date().toISOString()
            };
            Storage.setItem('installmentData', installmentData);
        },

        /**
         * Save navigation progress
         */
        saveProgress: function() {
            if (!Storage?.setItem) return;

            Storage.setItem('installment_progress', {
                currentStep: this.currentStep,
                maxCompletedStep: this.maxCompletedStep,
                lastUpdate: new Date().toISOString()
            });
        },

        /**
         * Check for unsaved changes
         * @returns {boolean} - Whether there are unsaved changes
         */
        hasUnsavedChanges: function() {
            // Check for form changes (basic implementation)
            const forms = document.querySelectorAll('form');
            for (const form of forms) {
                if (form.classList.contains('dirty') || form.dataset.dirty === 'true') {
                    return true;
                }
            }
            return false;
        },

        /**
         * Handle flow completion
         */
        handleFlowCompletion: function() {
            console.info('🎉 Installment flow completed!');

            // Clear temporary data
            this.cleanup();

            // Navigate to success page or dashboard
            window.location.href = '/views/pattani/installment/success.html';
        },

        /**
         * Update progress indicator UI
         */
        updateProgressIndicator: function() {
            const steps = document.querySelectorAll('.step, .step-item');

            steps.forEach((step, index) => {
                const stepNumber = index + 1;

                if (stepNumber < this.currentStep || stepNumber <= this.maxCompletedStep) {
                    step.classList.add('completed');
                    step.classList.remove('active', 'pending');
                } else if (stepNumber === this.currentStep) {
                    step.classList.add('active');
                    step.classList.remove('completed', 'pending');
                } else {
                    step.classList.add('pending');
                    step.classList.remove('completed', 'active');
                }
            });
        },

        /**
         * Cleanup temporary data
         */
        cleanup: function() {
            const tempKeys = [
                'step1_temp', 'step2_temp', 'step3_temp', 'step4_temp',
                'form_dirty', 'validation_errors'
            ];

            tempKeys.forEach(key => {
                if (Storage?.removeItem) {
                    Storage.removeItem(key);
                }
            });
        }
    };

    /**
     * Accessibility improvements
     */
    const AccessibilityManager = {
        /**
         * Initialize accessibility features
         */
        initialize: function() {
            this.setupKeyboardNavigation();
            this.setupScreenReaderSupport();
            this.setupFocusManagement();
            this.setupHighContrast();
        },

        /**
         * Setup keyboard navigation
         */
        setupKeyboardNavigation: function() {
            document.addEventListener('keydown', (event) => {
                // Alt + N for next step
                if (event.altKey && event.key === 'n') {
                    event.preventDefault();
                    const nextBtn = document.querySelector('.next-step-btn, #nextStepBtn');
                    if (nextBtn) nextBtn.click();
                }

                // Alt + P for previous step
                if (event.altKey && event.key === 'p') {
                    event.preventDefault();
                    const prevBtn = document.querySelector('.prev-step-btn, #prevStepBtn');
                    if (prevBtn) prevBtn.click();
                }

                // Escape to close modals
                if (event.key === 'Escape') {
                    const modal = document.querySelector('.modal.modal-open');
                    if (modal) {
                        modal.classList.remove('modal-open');
                    }
                }
            });
        },

        /**
         * Setup screen reader support
         */
        setupScreenReaderSupport: function() {
            // Add ARIA labels to form fields
            const inputs = document.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
                    const label = document.querySelector(`label[for="${input.id}"]`);
                    if (label) {
                        input.setAttribute('aria-labelledby', label.id || `label-${input.id}`);
                        if (!label.id) label.id = `label-${input.id}`;
                    }
                }
            });

            // Add ARIA live regions for dynamic updates
            if (!document.getElementById('aria-live-region')) {
                const liveRegion = document.createElement('div');
                liveRegion.id = 'aria-live-region';
                liveRegion.setAttribute('aria-live', 'polite');
                liveRegion.className = 'sr-only';
                document.body.appendChild(liveRegion);
            }
        },

        /**
         * Setup focus management
         */
        setupFocusManagement: function() {
            // Focus on first input when page loads
            const firstInput = document.querySelector('input:not([type="hidden"]), select, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }

            // Manage focus for modals
            document.addEventListener('click', (event) => {
                if (event.target.matches('[data-modal-open]')) {
                    const modalId = event.target.dataset.modalOpen;
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        setTimeout(() => {
                            const firstFocusable = modal.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
                            if (firstFocusable) firstFocusable.focus();
                        }, 100);
                    }
                }
            });
        },

        /**
         * Setup high contrast support
         */
        setupHighContrast: function() {
            // Detect high contrast mode
            if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
                document.body.classList.add('high-contrast');
            }

            // Toggle high contrast
            const toggleHighContrast = () => {
                document.body.classList.toggle('high-contrast');
                localStorage.setItem('high-contrast', document.body.classList.contains('high-contrast'));
            };

            // Restore saved preference
            if (localStorage.getItem('high-contrast') === 'true') {
                document.body.classList.add('high-contrast');
            }

            // Add keyboard shortcut (Alt + C)
            document.addEventListener('keydown', (event) => {
                if (event.altKey && event.key === 'c') {
                    event.preventDefault();
                    toggleHighContrast();
                }
            });
        },

        /**
         * Announce message to screen readers
         * @param {string} message - Message to announce
         */
        announceToScreenReader: function(message) {
            const liveRegion = document.getElementById('aria-live-region');
            if (liveRegion) {
                liveRegion.textContent = message;
                setTimeout(() => {
                    liveRegion.textContent = '';
                }, 3000);
            }
        }
    };

    /**
     * Main integration controller
     */
    const InstallmentFlowIntegration = {
        /**
         * Initialize all components
         */
        initialize: function() {
            console.info('🚀 Initializing Installment Flow Integration...');

            // Initialize components in order
            ThaiCurrencyManager.initializeCurrencyInputs();
            NavigationController.initialize();
            AccessibilityManager.initialize();

            // Setup global event handlers
            this.setupGlobalEvents();

            // Setup form change tracking
            this.setupFormTracking();

            // Initialize responsive features
            this.setupResponsiveFeatures();

            console.info('✅ Installment Flow Integration initialized');
        },

        /**
         * Setup global event handlers
         */
        setupGlobalEvents: function() {
            // Form submission handling
            document.addEventListener('submit', (event) => {
                const form = event.target;
                if (form.classList.contains('installment-form')) {
                    event.preventDefault();
                    this.handleFormSubmission(form);
                }
            });

            // Real-time validation
            document.addEventListener('input', (event) => {
                const input = event.target;
                if (input.dataset.validate) {
                    this.validateField(input);
                }
            });
        },

        /**
         * Setup form change tracking
         */
        setupFormTracking: function() {
            const forms = document.querySelectorAll('form');

            forms.forEach(form => {
                const inputs = form.querySelectorAll('input, select, textarea');

                inputs.forEach(input => {
                    input.addEventListener('change', () => {
                        form.dataset.dirty = 'true';
                        form.classList.add('dirty');
                    });
                });
            });
        },

        /**
         * Setup responsive features
         */
        setupResponsiveFeatures: function() {
            // Mobile-specific adjustments
            if (window.innerWidth < 768) {
                document.body.classList.add('mobile-layout');

                // Adjust input types for mobile
                const numberInputs = document.querySelectorAll('input[type="number"]');
                numberInputs.forEach(input => {
                    input.setAttribute('inputmode', 'decimal');
                });
            }

            // Handle orientation changes
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    NavigationController.updateProgressIndicator();
                }, 100);
            });
        },

        /**
         * Handle form submission
         * @param {HTMLFormElement} form - Form element
         */
        handleFormSubmission: async function(form) {
            // Show loading
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn?.textContent;

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> กำลังดำเนินการ...';
            }

            try {
                // Validate form
                const validation = await this.validateForm(form);

                if (!validation.isValid) {
                    ErrorHandler?.handleValidationErrors(validation.errors, form);
                    return;
                }

                // Process form based on current step
                await this.processStepForm(NavigationController.currentStep, validation.data);

            } catch (error) {
                ErrorHandler?.handleApiError(error, () => this.handleFormSubmission(form), {
                    context: 'Form Submission'
                });
            } finally {
                // Restore button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        },

        /**
         * Validate form
         * @param {HTMLFormElement} form - Form to validate
         * @returns {Promise<object>} - Validation result
         */
        validateForm: async function(form) {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            const errors = {};

            // Apply validation rules based on current step
            const stepValidation = await NavigationController.validateCurrentStep();

            return {
                isValid: stepValidation.canProceed,
                errors: stepValidation.canProceed ? {} : { general: stepValidation.error },
                data: stepValidation.data || data
            };
        },

        /**
         * Process step-specific form
         * @param {number} step - Current step
         * @param {object} data - Form data
         */
        processStepForm: async function(step, data) {
            switch (step) {
                case 1:
                    await this.processStep1(data);
                    break;
                case 2:
                    await this.processStep2(data);
                    break;
                case 3:
                    await this.processStep3(data);
                    break;
                case 4:
                    await this.processStep4(data);
                    break;
            }
        },

        /**
         * Process step 1 data
         * @param {object} data - Step 1 data
         */
        processStep1: async function(data) {
            // Save cart data
            if (Storage?.setItem) {
                Storage.setItem('cartItems', data.items);
                Storage.setItem('step1_data', data);
            }

            // Proceed to next step
            NavigationController.handleNextStep();
        },

        /**
         * Process step 2 data
         * @param {object} data - Step 2 data
         */
        processStep2: async function(data) {
            // Save customer data
            if (Storage?.setItem) {
                Storage.setItem('customer_data', data);
                Storage.setItem('step2_data', data);
            }

            // Proceed to next step
            NavigationController.handleNextStep();
        },

        /**
         * Process step 3 data
         * @param {object} data - Step 3 data
         */
        processStep3: async function(data) {
            // Save payment terms
            if (Storage?.setItem) {
                Storage.setItem('step3_data', data);
            }

            // Proceed to next step
            NavigationController.handleNextStep();
        },

        /**
         * Process step 4 data
         * @param {object} data - Step 4 data
         */
        processStep4: async function(data) {
            // Submit final contract
            await this.submitInstallmentContract(data);
        },

        /**
         * Submit installment contract
         * @param {object} contractData - Complete contract data
         */
        submitInstallmentContract: async function(contractData) {
            // Collect all step data
            const allData = {
                step1: Storage?.getItem('step1_data'),
                step2: Storage?.getItem('step2_data'),
                step3: Storage?.getItem('step3_data'),
                step4: contractData,
                submittedAt: new Date().toISOString()
            };

            // Submit to server
            const response = await fetch('/api/installment/create-contract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                },
                body: JSON.stringify(allData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Success handling
            ErrorHandler?.showErrorNotification('สร้างสัญญาผ่อนชำระสำเร็จ', {
                type: 'success',
                context: 'Contract Creation'
            });

            // Complete the flow
            NavigationController.handleFlowCompletion();
        },

        /**
         * Validate individual field
         * @param {HTMLElement} field - Field to validate
         */
        validateField: function(field) {
            const value = field.value;
            const validationType = field.dataset.validate;

            let validation = { isValid: true, error: '' };

            switch (validationType) {
                case 'required':
                    validation = Security.FormValidator?.validateRequired(value, field.name) ||
                                { isValid: value.trim() !== '', error: 'กรุณากรอกข้อมูล' };
                    break;

                case 'idcard':
                    validation = Security.FormValidator?.validateIdCard(value) ||
                                { isValid: true, error: '' };
                    break;

                case 'phone':
                    validation = Security.FormValidator?.validatePhone(value) ||
                                { isValid: true, error: '' };
                    break;

                case 'email':
                    validation = Security.FormValidator?.validateEmail(value) ||
                                { isValid: true, error: '' };
                    break;

                case 'currency':
                    validation = ThaiCurrencyManager.validateBahtAmount(value);
                    break;
            }

            // Update field UI
            if (validation.isValid) {
                field.classList.remove('border-red-500');
                Security.FormValidator?.clearFieldError(field);
            } else {
                field.classList.add('border-red-500');
                Security.FormValidator?.showFieldError(field, validation.error);
            }
        }
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            InstallmentFlowIntegration.initialize();
        });
    } else {
        InstallmentFlowIntegration.initialize();
    }

    // Export to global scope
    global.InstallmentFlowIntegration = InstallmentFlowIntegration;
    global.ThaiCurrencyManager = ThaiCurrencyManager;
    global.NavigationController = NavigationController;
    global.AccessibilityManager = AccessibilityManager;

    console.info('🚀 Installment Flow Integration v1.0.0 loaded');

})(window);