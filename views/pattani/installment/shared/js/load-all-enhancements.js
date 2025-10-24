/**
 * Load All Frontend Enhancements for Thai Accounting System
 * =========================================================
 *
 * This file loads all the frontend enhancement utilities in the correct order
 * for the installment flow. Include this file in your HTML files to get all
 * the security, validation, and user experience improvements.
 *
 * @version 1.0.0
 * @author Thai Accounting System Maintenance Expert
 */

(function() {
    'use strict';

    console.info('📦 Loading Thai Accounting Frontend Enhancements...');

    /**
     * List of enhancement scripts to load in order
     */
    const enhancementScripts = [
        // Core security and validation utilities (must load first)
        '/views/pattani/installment/shared/js/frontend-security-utils.js',

        // Calculation fixes for step 3
        '/views/pattani/installment/step3/js/step3-calculation-fixes.js',

        // localStorage validation and integrity
        '/views/pattani/installment/shared/js/localstorage-validation.js',

        // Thai error handling
        '/views/pattani/installment/shared/js/thai-error-handler.js',

        // Bad debt integration
        '/views/pattani/installment/shared/js/bad-debt-integration.js',

        // Step-specific validations (load only for relevant steps)
        ...(window.location.pathname.includes('step1') ? ['/views/pattani/installment/step1/js/step1-validation-enhancements.js'] : []),

        // Main integration controller (must load last)
        '/views/pattani/installment/shared/js/installment-flow-integration.js'
    ];

    /**
     * Load script dynamically
     * @param {string} src - Script source URL
     * @returns {Promise} - Promise that resolves when script loads
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            if (document.querySelector(`script[src="${src}"]`)) {
                console.info(`✅ Script already loaded: ${src}`);
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Ensure scripts load in order

            script.onload = () => {
                console.info(`✅ Loaded: ${src}`);
                resolve();
            };

            script.onerror = () => {
                console.warn(`⚠️ Failed to load: ${src}`);
                reject(new Error(`Failed to load script: ${src}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Load all enhancement scripts sequentially
     */
    async function loadAllEnhancements() {
        try {
            for (const scriptSrc of enhancementScripts) {
                await loadScript(scriptSrc);
            }

            console.info('🎉 All frontend enhancements loaded successfully!');

            // Dispatch custom event to notify that enhancements are ready
            const event = new CustomEvent('installmentEnhancementsLoaded', {
                detail: {
                    version: '1.0.0',
                    loadedScripts: enhancementScripts.length,
                    timestamp: new Date().toISOString()
                }
            });

            document.dispatchEvent(event);

        } catch (error) {
            console.error('❌ Error loading frontend enhancements:', error);

            // Show user-friendly error message
            const errorMessage = 'ไม่สามารถโหลดระบบตรวจสอบข้อมูลได้ กรุณาโหลดหน้าใหม่';

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'เกิดข้อผิดพลาด',
                    text: errorMessage,
                    icon: 'warning',
                    confirmButtonText: 'โหลดหน้าใหม่',
                    allowOutsideClick: false
                }).then(() => {
                    window.location.reload();
                });
            } else {
                alert(errorMessage);
                window.location.reload();
            }
        }
    }

    /**
     * Initialize loading based on document state
     */
    function initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadAllEnhancements);
        } else {
            loadAllEnhancements();
        }
    }

    // Start loading
    initialize();

    /**
     * Utility function to check if enhancements are loaded
     * @returns {boolean} - Whether all enhancements are loaded
     */
    window.areInstallmentEnhancementsLoaded = function() {
        return !!(
            window.FrontendSecurity &&
            window.LocalStorageValidator &&
            window.ThaiErrorHandler &&
            window.BadDebtIntegration &&
            window.InstallmentFlowIntegration
        );
    };

    /**
     * Utility function to get enhancement status
     * @returns {object} - Status of all enhancements
     */
    window.getInstallmentEnhancementStatus = function() {
        return {
            core: !!window.FrontendSecurity,
            calculations: !!window.Step3CalculationFixes,
            storage: !!window.LocalStorageValidator,
            errors: !!window.ThaiErrorHandler,
            badDebt: !!window.BadDebtIntegration,
            step1Validation: !!window.Step1ValidationEnhancements,
            integration: !!window.InstallmentFlowIntegration,
            currency: !!window.ThaiCurrencyManager,
            navigation: !!window.NavigationController,
            accessibility: !!window.AccessibilityManager
        };
    };

    console.info('📦 Enhancement loader initialized');

})();