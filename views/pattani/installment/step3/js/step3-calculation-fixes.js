/**
 * Step 3 Calculation Fixes for Thai Accounting System
 * ===================================================
 *
 * This file contains fixes for floating-point calculation errors and
 * precision issues in the step3 installment calculations.
 *
 * Key Features:
 * - Thai Baht precision (2 decimal places)
 * - Safe mathematical operations to prevent floating-point errors
 * - VAT calculation fixes (7% Thai VAT)
 * - Discount calculation fixes
 * - Payment amount calculation fixes
 *
 * @version 1.0.0
 * @author Thai Accounting System Maintenance Expert
 */

(function(global) {
    'use strict';

    // Include the security utilities if available
    const SecurityUtils = global.FrontendSecurity || {};
    const FinCalc = SecurityUtils.FinancialCalculator || {};

    /**
     * Enhanced financial calculator with Thai Baht precision
     */
    const Step3Calculator = {
        /**
         * Round to Thai Baht precision using proper rounding
         * @param {number} amount - Amount to round
         * @returns {number} - Rounded amount
         */
        roundToBaht: function(amount) {
            if (typeof amount !== 'number' || isNaN(amount)) return 0;
            // Use epsilon to handle floating-point precision issues
            return Math.round((amount + Number.EPSILON) * 100) / 100;
        },

        /**
         * Safe parseFloat with Thai currency formatting support
         * @param {string|number} value - Value to parse
         * @returns {number} - Parsed number
         */
        safeParseFloat: function(value) {
            if (value === null || value === undefined || value === '') return 0;

            // Remove Thai currency symbols, commas, and spaces
            const cleaned = String(value).replace(/[฿,\s]/g, '');
            const parsed = parseFloat(cleaned);

            return isNaN(parsed) ? 0 : parsed;
        },

        /**
         * Calculate VAT with proper precision (Thai VAT = 7%)
         * @param {number} amount - Base amount
         * @param {string} vatType - 'inclusive' or 'exclusive' or 'none'
         * @returns {object} - {beforeTax, vat, total, documentType}
         */
        calculateVAT: function(amount, vatType) {
            const baseAmount = this.safeParseFloat(amount);
            let beforeTax, vat, total, documentType;

            switch (vatType) {
                case 'inclusive':
                    // Amount includes VAT - extract VAT from total
                    total = this.roundToBaht(baseAmount);
                    beforeTax = this.roundToBaht(total / 1.07);
                    vat = this.roundToBaht(total - beforeTax);
                    documentType = 'ใบกำกับภาษี (รวมภาษี)';
                    break;

                case 'exclusive':
                    // Add VAT to base amount
                    beforeTax = this.roundToBaht(baseAmount);
                    vat = this.roundToBaht(beforeTax * 0.07);
                    total = this.roundToBaht(beforeTax + vat);
                    documentType = 'ใบกำกับภาษี';
                    break;

                case 'none':
                default:
                    // No VAT
                    beforeTax = this.roundToBaht(baseAmount);
                    vat = 0;
                    total = this.roundToBaht(baseAmount);
                    documentType = 'ใบเสร็จรับเงิน';
                    break;
            }

            return { beforeTax, vat, total, documentType };
        },

        /**
         * Calculate discount with proper precision
         * @param {number} subtotal - Subtotal amount
         * @param {number} discountValue - Discount value
         * @param {string} discountType - 'amount' or 'percentage'
         * @returns {object} - {discountAmount, finalAmount}
         */
        calculateDiscount: function(subtotal, discountValue, discountType) {
            const baseAmount = this.safeParseFloat(subtotal);
            const discount = this.safeParseFloat(discountValue);
            let discountAmount = 0;

            if (discountType === 'percentage') {
                // Percentage discount
                if (discount >= 0 && discount <= 100) {
                    discountAmount = this.roundToBaht(baseAmount * (discount / 100));
                }
            } else {
                // Fixed amount discount
                discountAmount = Math.min(discount, baseAmount);
                discountAmount = Math.max(0, discountAmount);
                discountAmount = this.roundToBaht(discountAmount);
            }

            const finalAmount = this.roundToBaht(baseAmount - discountAmount);

            return {
                discountAmount: discountAmount,
                finalAmount: Math.max(0, finalAmount)
            };
        },

        /**
         * Calculate total amount from cart items with proper precision
         * @param {Array} items - Cart items
         * @returns {number} - Total amount
         */
        calculateCartTotal: function(items) {
            if (!Array.isArray(items)) return 0;

            return items.reduce((sum, item) => {
                const quantity = parseInt(item.quantity || 1);
                const downAmount = this.safeParseFloat(item.downAmount || item.price || 0);
                const itemTotal = this.roundToBaht(downAmount * quantity);
                return this.roundToBaht(sum + itemTotal);
            }, 0);
        },

        /**
         * Calculate mixed payment totals
         * @param {object} payments - Payment amounts {cash, transfer, card}
         * @returns {object} - {total, breakdown}
         */
        calculateMixedPayment: function(payments) {
            const cash = this.safeParseFloat(payments.cash || 0);
            const transfer = this.safeParseFloat(payments.transfer || 0);
            const card = this.safeParseFloat(payments.card || 0);

            const total = this.roundToBaht(cash + transfer + card);

            return {
                total: total,
                breakdown: {
                    cash: this.roundToBaht(cash),
                    transfer: this.roundToBaht(transfer),
                    card: this.roundToBaht(card)
                }
            };
        },

        /**
         * Calculate payment today amount (down payment + document fee)
         * @param {number} totalAmount - Total amount
         * @param {number} documentFee - Document fee
         * @param {number} downPaymentPercentage - Down payment percentage (default 30%)
         * @returns {object} - Payment calculation result
         */
        calculatePaymentToday: function(totalAmount, documentFee, downPaymentPercentage = 30) {
            const total = this.safeParseFloat(totalAmount);
            const docFee = this.safeParseFloat(documentFee);
            const downPercent = this.safeParseFloat(downPaymentPercentage);

            const downPayment = this.roundToBaht(total * (downPercent / 100));
            const payToday = this.roundToBaht(downPayment + docFee);

            return {
                downPayment: downPayment,
                documentFee: this.roundToBaht(docFee),
                payToday: payToday,
                remainingAmount: this.roundToBaht(total - downPayment)
            };
        },

        /**
         * Format currency for display
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
         * Format number with Thai locale
         * @param {number} amount - Amount to format
         * @returns {string} - Formatted number string
         */
        formatNumber: function(amount) {
            const num = this.safeParseFloat(amount);
            return num.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
    };

    /**
     * Enhanced UI update functions for step3
     */
    const Step3UIUpdater = {
        /**
         * Update total amount display with proper formatting
         * @param {number} amount - Amount to display
         */
        updateTotalAmount: function(amount) {
            const element = document.getElementById('totalAmount');
            if (element) {
                const formatted = Step3Calculator.formatCurrency(amount);
                element.textContent = formatted;
            }
        },

        /**
         * Update tax calculation preview with safe values
         * @param {object} taxCalc - Tax calculation result
         */
        updateTaxPreview: function(taxCalc) {
            const elements = {
                'calcBeforeTax': taxCalc.beforeTax,
                'calcVatAmount': taxCalc.vat,
                'calcTotalAmount': taxCalc.total
            };

            for (const [elementId, value] of Object.entries(elements)) {
                const element = document.getElementById(elementId);
                if (element) {
                    element.textContent = Step3Calculator.formatCurrency(value);
                }
            }

            // Show/hide VAT rows based on whether VAT is applicable
            const vatRows = ['taxInfoRow', 'vatAmountRow'];
            vatRows.forEach(rowId => {
                const row = document.getElementById(rowId);
                if (row) {
                    row.style.display = taxCalc.vat > 0 ? 'flex' : 'none';
                }
            });
        },

        /**
         * Update payment today display
         * @param {object} paymentCalc - Payment calculation result
         */
        updatePaymentToday: function(paymentCalc) {
            const payTodayElement = document.getElementById('payTodayAmount');
            if (payTodayElement) {
                payTodayElement.textContent = Step3Calculator.formatCurrency(paymentCalc.payToday);
            }

            // Update individual components if elements exist
            const components = {
                'calcDownPayment': paymentCalc.downPayment,
                'calcDocFee': paymentCalc.documentFee,
                'calcCreditAmount': paymentCalc.remainingAmount
            };

            for (const [elementId, value] of Object.entries(components)) {
                const element = document.getElementById(elementId);
                if (element) {
                    element.textContent = Step3Calculator.formatCurrency(value);
                }
            }
        },

        /**
         * Update mixed payment display
         * @param {object} mixedPayment - Mixed payment calculation result
         */
        updateMixedPayment: function(mixedPayment) {
            const totalElement = document.getElementById('mixedTotalAmount');
            if (totalElement) {
                totalElement.textContent = Step3Calculator.formatCurrency(mixedPayment.total);
            }

            // Update breakdown if elements exist
            const breakdown = mixedPayment.breakdown;
            const breakdownElements = {
                'mixedCashDisplay': breakdown.cash,
                'mixedTransferDisplay': breakdown.transfer,
                'mixedCardDisplay': breakdown.card
            };

            for (const [elementId, value] of Object.entries(breakdownElements)) {
                const element = document.getElementById(elementId);
                if (element) {
                    element.textContent = Step3Calculator.formatCurrency(value);
                }
            }
        },

        /**
         * Update subtotal display with proper discount calculation
         * @param {number} subtotal - Subtotal amount
         * @param {object} discount - Discount calculation result
         */
        updateSubtotalWithDiscount: function(subtotal, discount) {
            const subtotalElement = document.getElementById('calcSubTotal');
            if (subtotalElement) {
                subtotalElement.textContent = Step3Calculator.formatCurrency(subtotal);
            }

            // Update discount display if elements exist
            const discountElement = document.getElementById('calcDiscountAmount');
            if (discountElement) {
                discountElement.textContent = `−${Step3Calculator.formatCurrency(discount.discountAmount)}`;
            }

            // Update final amount
            const finalElement = document.getElementById('calcFinalAmount');
            if (finalElement) {
                finalElement.textContent = Step3Calculator.formatCurrency(discount.finalAmount);
            }
        }
    };

    /**
     * Fix existing calculation functions by overriding them
     */
    function fixExistingCalculations() {
        // Override updateDiscount function if it exists
        if (typeof window.updateDiscount === 'function') {
            const originalUpdateDiscount = window.updateDiscount;
            window.updateDiscount = function() {
                try {
                    // Get current values
                    const discountInput = document.getElementById('globalDiscount');
                    const discountType = document.querySelector('input[name="discountType"]:checked')?.value || 'amount';
                    const discountValue = Step3Calculator.safeParseFloat(discountInput?.value || '0');

                    // Get subtotal from step1 data
                    const step1Data = window.globalInstallmentManager?.getStepData(1);
                    const subtotal = Step3Calculator.calculateCartTotal(step1Data?.items || []);

                    // Calculate discount with proper precision
                    const discountResult = Step3Calculator.calculateDiscount(subtotal, discountValue, discountType);

                    // Update UI
                    Step3UIUpdater.updateSubtotalWithDiscount(subtotal, discountResult);

                    // Update global data
                    if (window.globalInstallmentManager) {
                        const currentStep3Data = window.globalInstallmentManager.getStepData(3) || {};
                        window.globalInstallmentManager.updateStepData(3, {
                            ...currentStep3Data,
                            subtotal: subtotal,
                            discount: {
                                type: discountType,
                                value: discountValue,
                                amount: discountResult.discountAmount
                            },
                            finalAmount: discountResult.finalAmount
                        });
                    }

                    console.info('✅ Discount calculation fixed and updated');
                } catch (error) {
                    console.error('❌ Error in fixed updateDiscount:', error);
                    // Fallback to original function
                    originalUpdateDiscount.apply(this, arguments);
                }
            };
        }

        // Override updateMixedPaymentTotal function if it exists
        if (typeof window.updateMixedPaymentTotal === 'function') {
            const originalUpdateMixed = window.updateMixedPaymentTotal;
            window.updateMixedPaymentTotal = function() {
                try {
                    const payments = {
                        cash: document.getElementById('mixedCashAmount')?.value || 0,
                        transfer: document.getElementById('mixedTransferAmount')?.value || 0,
                        card: document.getElementById('mixedCardAmount')?.value || 0
                    };

                    const mixedResult = Step3Calculator.calculateMixedPayment(payments);
                    Step3UIUpdater.updateMixedPayment(mixedResult);

                    console.info('✅ Mixed payment calculation fixed and updated');
                } catch (error) {
                    console.error('❌ Error in fixed updateMixedPaymentTotal:', error);
                    originalUpdateMixed.apply(this, arguments);
                }
            };
        }

        // Fix VAT calculation if the function exists
        if (typeof window.TaxCalculator !== 'undefined' && window.TaxCalculator.updateCalculatorWithTax) {
            const originalTaxUpdate = window.TaxCalculator.updateCalculatorWithTax;
            window.TaxCalculator.updateCalculatorWithTax = function(taxType) {
                try {
                    const totalAmountElement = document.getElementById('totalAmount');
                    const currentTotal = Step3Calculator.safeParseFloat(
                        totalAmountElement?.textContent?.replace(/[฿,]/g, '') || '0'
                    );

                    const taxResult = Step3Calculator.calculateVAT(currentTotal, taxType);
                    Step3UIUpdater.updateTaxPreview(taxResult);

                    // Update global data
                    if (window.globalInstallmentManager) {
                        const currentStep3Data = window.globalInstallmentManager.getStepData(3) || {};
                        window.globalInstallmentManager.updateStepData(3, {
                            ...currentStep3Data,
                            taxType: taxType,
                            beforeTax: taxResult.beforeTax,
                            vat: taxResult.vat,
                            totalWithTax: taxResult.total,
                            documentType: taxResult.documentType
                        });
                    }

                    console.info('✅ VAT calculation fixed and updated');
                } catch (error) {
                    console.error('❌ Error in fixed VAT calculation:', error);
                    originalTaxUpdate.apply(this, arguments);
                }
            };
        }

        // Fix the payment today calculation
        if (typeof window.updatePayTodayAmount === 'function') {
            const originalPayToday = window.updatePayTodayAmount;
            window.updatePayTodayAmount = function() {
                try {
                    const documentFee = Step3Calculator.safeParseFloat(
                        document.getElementById('globalDocumentFee')?.value || '500'
                    );

                    const step3Data = window.globalInstallmentManager?.getStepData(3);
                    const totalWithTax = Step3Calculator.safeParseFloat(step3Data?.totalWithTax || 0);

                    const paymentResult = Step3Calculator.calculatePaymentToday(totalWithTax, documentFee);
                    Step3UIUpdater.updatePaymentToday(paymentResult);

                    console.info('✅ Payment today calculation fixed and updated');
                } catch (error) {
                    console.error('❌ Error in fixed updatePayTodayAmount:', error);
                    originalPayToday.apply(this, arguments);
                }
            };
        }
    }

    /**
     * Initialize calculation fixes
     */
    function initializeCalculationFixes() {
        console.info('🔧 Initializing Step 3 calculation fixes...');

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(fixExistingCalculations, 100);
            });
        } else {
            setTimeout(fixExistingCalculations, 100);
        }

        // Add input event listeners for real-time validation
        document.addEventListener('input', function(event) {
            const target = event.target;

            // Fix numeric inputs to prevent invalid values
            if (target.type === 'number' || target.classList.contains('numeric-input')) {
                const value = Step3Calculator.safeParseFloat(target.value);
                if (value < 0) {
                    target.value = '0';
                    if (SecurityUtils.ErrorHandler) {
                        SecurityUtils.ErrorHandler.showToast('ค่าต้องไม่ติดลบ', 'warning');
                    }
                }
            }

            // Fix currency inputs
            if (target.classList.contains('currency-input')) {
                const value = Step3Calculator.safeParseFloat(target.value);
                const formatted = Step3Calculator.formatNumber(value);
                // Don't update while user is typing
                if (!target.matches(':focus')) {
                    target.value = formatted;
                }
            }
        });

        console.info('✅ Step 3 calculation fixes initialized');
    }

    // Export to global scope
    global.Step3CalculationFixes = {
        Calculator: Step3Calculator,
        UIUpdater: Step3UIUpdater,
        initialize: initializeCalculationFixes,
        version: '1.0.0'
    };

    // Auto-initialize
    initializeCalculationFixes();

    console.info('🔧 Step 3 Calculation Fixes v1.0.0 loaded');

})(window);