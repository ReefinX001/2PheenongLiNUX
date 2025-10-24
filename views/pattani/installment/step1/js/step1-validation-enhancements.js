/**
 * Step 1 Validation Enhancements for Thai Accounting System
 * =========================================================
 *
 * Comprehensive client-side validation for the product selection step
 * including security measures, financial validation, and user experience improvements.
 *
 * Features:
 * - Product selection validation
 * - Quantity and price validation
 * - Thai Baht precision enforcement
 * - XSS prevention for product data
 * - Real-time validation feedback
 * - Cart management with validation
 *
 * @version 1.0.0
 * @author Thai Accounting System Maintenance Expert
 */

(function(global) {
    'use strict';

    // Import security utilities
    const Security = global.FrontendSecurity || {};
    const XSS = Security.XSSPrevention || {};
    const FinCalc = Security.FinancialCalculator || {};
    const FormValidator = Security.FormValidator || {};
    const ErrorHandler = Security.ErrorHandler || {};

    /**
     * Step 1 product validation utilities
     */
    const Step1Validator = {
        /**
         * Validate product selection
         * @param {object} product - Product data
         * @returns {object} - Validation result
         */
        validateProduct: function(product) {
            if (!product || typeof product !== 'object') {
                return { isValid: false, error: 'ข้อมูลสินค้าไม่ถูกต้อง' };
            }

            // Required fields validation
            const requiredFields = ['id', 'name', 'price'];
            for (const field of requiredFields) {
                if (!product[field]) {
                    return { isValid: false, error: `ข้อมูลสินค้าไม่ครบถ้วน: ${field}` };
                }
            }

            // Validate product name (XSS prevention)
            const nameResult = XSS.validateThaiText(product.name);
            if (!nameResult.isValid) {
                return { isValid: false, error: `ชื่อสินค้าไม่ถูกต้อง: ${nameResult.error}` };
            }

            // Validate price
            const priceResult = FinCalc.validateAmount(product.price);
            if (!priceResult.isValid) {
                return { isValid: false, error: `ราคาสินค้าไม่ถูกต้อง: ${priceResult.error}` };
            }

            // Validate down amount if present
            if (product.downAmount) {
                const downResult = FinCalc.validateAmount(product.downAmount);
                if (!downResult.isValid) {
                    return { isValid: false, error: `ยอดดาวน์ไม่ถูกต้อง: ${downResult.error}` };
                }

                // Down amount should not exceed full price
                if (downResult.value > priceResult.value) {
                    return { isValid: false, error: 'ยอดดาวน์ต้องไม่เกินราคาสินค้า' };
                }
            }

            return { isValid: true, error: '', sanitizedProduct: this.sanitizeProduct(product) };
        },

        /**
         * Validate quantity input
         * @param {string|number} quantity - Quantity value
         * @returns {object} - Validation result
         */
        validateQuantity: function(quantity) {
            const qty = parseInt(quantity);

            if (isNaN(qty) || qty <= 0) {
                return { isValid: false, error: 'จำนวนต้องเป็นตัวเลขที่มากกว่า 0' };
            }

            if (qty > 999) {
                return { isValid: false, error: 'จำนวนไม่ควรเกิน 999 ชิ้น' };
            }

            return { isValid: true, error: '', value: qty };
        },

        /**
         * Sanitize product data to prevent XSS
         * @param {object} product - Product data
         * @returns {object} - Sanitized product data
         */
        sanitizeProduct: function(product) {
            const sanitized = {};

            // Sanitize text fields
            const textFields = ['name', 'brand', 'model', 'description', 'category'];
            for (const field of textFields) {
                if (product[field]) {
                    sanitized[field] = XSS.sanitizeInput(product[field]);
                }
            }

            // Sanitize numeric fields
            const numericFields = ['price', 'downAmount', 'downInstallment', 'downInstallmentCount'];
            for (const field of numericFields) {
                if (product[field] !== undefined) {
                    sanitized[field] = FinCalc.safeParseFloat(product[field]);
                }
            }

            // Copy safe fields directly
            const safeFields = ['id', 'sku', 'barcode', 'quantity'];
            for (const field of safeFields) {
                if (product[field] !== undefined) {
                    sanitized[field] = product[field];
                }
            }

            return sanitized;
        },

        /**
         * Validate cart items
         * @param {Array} cartItems - Array of cart items
         * @returns {object} - Validation result
         */
        validateCart: function(cartItems) {
            if (!Array.isArray(cartItems) || cartItems.length === 0) {
                return { isValid: false, error: 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ' };
            }

            if (cartItems.length > 50) {
                return { isValid: false, error: 'ไม่สามารถเลือกสินค้าเกิน 50 รายการได้' };
            }

            const sanitizedItems = [];
            let totalAmount = 0;

            for (let i = 0; i < cartItems.length; i++) {
                const item = cartItems[i];

                // Validate each product
                const productResult = this.validateProduct(item);
                if (!productResult.isValid) {
                    return { isValid: false, error: `สินค้าลำดับที่ ${i + 1}: ${productResult.error}` };
                }

                // Validate quantity
                const qtyResult = this.validateQuantity(item.quantity);
                if (!qtyResult.isValid) {
                    return { isValid: false, error: `จำนวนสินค้าลำดับที่ ${i + 1}: ${qtyResult.error}` };
                }

                // Calculate item total
                const sanitizedItem = productResult.sanitizedProduct;
                sanitizedItem.quantity = qtyResult.value;

                const itemPrice = sanitizedItem.downAmount || sanitizedItem.price || 0;
                const itemTotal = FinCalc.roundToBaht(itemPrice * sanitizedItem.quantity);
                sanitizedItem.itemTotal = itemTotal;

                totalAmount = FinCalc.roundToBaht(totalAmount + itemTotal);
                sanitizedItems.push(sanitizedItem);
            }

            // Validate total amount
            if (totalAmount <= 0) {
                return { isValid: false, error: 'ยอดรวมสินค้าต้องมากกว่า 0 บาท' };
            }

            if (totalAmount > 10000000) {
                return { isValid: false, error: 'ยอดรวมสินค้าเกินขีดจำกัด (10,000,000 บาท)' };
            }

            return {
                isValid: true,
                error: '',
                sanitizedItems: sanitizedItems,
                totalAmount: totalAmount
            };
        },

        /**
         * Validate installment terms for a product
         * @param {object} installmentData - Installment terms
         * @returns {object} - Validation result
         */
        validateInstallmentTerms: function(installmentData) {
            if (!installmentData) {
                return { isValid: true, error: '' }; // Optional
            }

            const downInstallment = FinCalc.safeParseFloat(installmentData.downInstallment);
            const installmentCount = parseInt(installmentData.downInstallmentCount);

            // Validate down installment amount
            if (downInstallment < 0) {
                return { isValid: false, error: 'ยอดผ่อนต่องวดต้องไม่ติดลบ' };
            }

            if (downInstallment > 999999) {
                return { isValid: false, error: 'ยอดผ่อนต่องวดเกินขีดจำกัด' };
            }

            // Validate installment count
            if (installmentCount < 0 || installmentCount > 120) {
                return { isValid: false, error: 'จำนวนงวดต้องอยู่ระหว่าง 0-120 งวด' };
            }

            return {
                isValid: true,
                error: '',
                sanitizedData: {
                    downInstallment: FinCalc.roundToBaht(downInstallment),
                    downInstallmentCount: installmentCount
                }
            };
        }
    };

    /**
     * Real-time validation for step 1 forms
     */
    const Step1RealTimeValidator = {
        /**
         * Initialize real-time validation
         */
        initialize: function() {
            this.bindQuantityValidation();
            this.bindPriceValidation();
            this.bindProductSelection();
            this.bindCartActions();
        },

        /**
         * Bind quantity input validation
         */
        bindQuantityValidation: function() {
            document.addEventListener('input', function(event) {
                const target = event.target;

                if (target.name === 'quantity' || target.classList.contains('quantity-input')) {
                    const qtyResult = Step1Validator.validateQuantity(target.value);

                    if (!qtyResult.isValid) {
                        target.classList.add('border-red-500');
                        FormValidator.showFieldError(target, qtyResult.error);
                    } else {
                        target.classList.remove('border-red-500');
                        FormValidator.clearFieldError(target);

                        // Update calculations if valid
                        Step1RealTimeValidator.updateItemCalculations(target);
                    }
                }
            });
        },

        /**
         * Bind price input validation
         */
        bindPriceValidation: function() {
            document.addEventListener('input', function(event) {
                const target = event.target;

                if (target.name === 'price' || target.classList.contains('price-input')) {
                    const priceResult = FinCalc.validateAmount(target.value);

                    if (!priceResult.isValid) {
                        target.classList.add('border-red-500');
                        FormValidator.showFieldError(target, priceResult.error);
                    } else {
                        target.classList.remove('border-red-500');
                        FormValidator.clearFieldError(target);

                        // Update price display
                        target.value = FinCalc.formatCurrency(priceResult.value).replace('฿', '');
                        Step1RealTimeValidator.updateItemCalculations(target);
                    }
                }
            });
        },

        /**
         * Bind product selection validation
         */
        bindProductSelection: function() {
            document.addEventListener('change', function(event) {
                const target = event.target;

                if (target.name === 'selectedProduct' || target.classList.contains('product-select')) {
                    const productData = JSON.parse(target.value || '{}');
                    const productResult = Step1Validator.validateProduct(productData);

                    if (!productResult.isValid) {
                        ErrorHandler.showToast(productResult.error, 'error');
                        target.value = '';
                    } else {
                        // Update product display with sanitized data
                        Step1RealTimeValidator.updateProductDisplay(productResult.sanitizedProduct);
                    }
                }
            });
        },

        /**
         * Bind cart action validation
         */
        bindCartActions: function() {
            document.addEventListener('click', function(event) {
                const target = event.target;

                if (target.classList.contains('add-to-cart-btn')) {
                    event.preventDefault();
                    Step1RealTimeValidator.validateAndAddToCart(target);
                }

                if (target.classList.contains('remove-from-cart-btn')) {
                    event.preventDefault();
                    Step1RealTimeValidator.removeFromCart(target);
                }

                if (target.classList.contains('update-cart-btn')) {
                    event.preventDefault();
                    Step1RealTimeValidator.validateAndUpdateCart(target);
                }
            });
        },

        /**
         * Update item calculations
         * @param {HTMLElement} element - Input element
         */
        updateItemCalculations: function(element) {
            const row = element.closest('.product-row, .cart-item');
            if (!row) return;

            const quantityElement = row.querySelector('.quantity-input, [name="quantity"]');
            const priceElement = row.querySelector('.price-input, [name="price"]');
            const totalElement = row.querySelector('.item-total, .total-display');

            if (quantityElement && priceElement && totalElement) {
                const quantity = Step1Validator.validateQuantity(quantityElement.value);
                const price = FinCalc.validateAmount(priceElement.value);

                if (quantity.isValid && price.isValid) {
                    const total = FinCalc.roundToBaht(quantity.value * price.value);
                    totalElement.textContent = FinCalc.formatCurrency(total);

                    // Update cart total
                    this.updateCartTotal();
                }
            }
        },

        /**
         * Update cart total display
         */
        updateCartTotal: function() {
            const cartItems = this.getCartItems();
            const cartResult = Step1Validator.validateCart(cartItems);

            if (cartResult.isValid) {
                const totalElement = document.getElementById('totalAmount');
                if (totalElement) {
                    totalElement.textContent = FinCalc.formatCurrency(cartResult.totalAmount);
                }

                // Update global data
                if (window.globalInstallmentManager) {
                    window.globalInstallmentManager.updateStepData(1, {
                        items: cartResult.sanitizedItems,
                        totalAmount: cartResult.totalAmount,
                        isValid: true
                    });
                }
            }
        },

        /**
         * Validate and add product to cart
         * @param {HTMLElement} button - Add to cart button
         */
        validateAndAddToCart: function(button) {
            const form = button.closest('form, .product-form');
            if (!form) return;

            const formData = new FormData(form);
            const productData = {
                id: formData.get('productId'),
                name: formData.get('productName'),
                price: formData.get('price'),
                downAmount: formData.get('downAmount'),
                quantity: formData.get('quantity'),
                brand: formData.get('brand'),
                model: formData.get('model')
            };

            const productResult = Step1Validator.validateProduct(productData);
            if (!productResult.isValid) {
                ErrorHandler.showToast(productResult.error, 'error');
                return;
            }

            const qtyResult = Step1Validator.validateQuantity(productData.quantity);
            if (!qtyResult.isValid) {
                ErrorHandler.showToast(qtyResult.error, 'error');
                return;
            }

            // Add to cart with sanitized data
            const sanitizedProduct = productResult.sanitizedProduct;
            sanitizedProduct.quantity = qtyResult.value;

            this.addProductToCartUI(sanitizedProduct);
            this.updateCartTotal();

            ErrorHandler.showToast('เพิ่มสินค้าในตะกร้าเรียบร้อย', 'success');
        },

        /**
         * Remove product from cart
         * @param {HTMLElement} button - Remove button
         */
        removeFromCart: function(button) {
            const cartItem = button.closest('.cart-item, .product-row');
            if (cartItem) {
                cartItem.remove();
                this.updateCartTotal();
                ErrorHandler.showToast('ลบสินค้าจากตะกร้าเรียบร้อย', 'info');
            }
        },

        /**
         * Get current cart items from UI
         * @returns {Array} - Cart items
         */
        getCartItems: function() {
            const cartRows = document.querySelectorAll('.cart-item, .product-row[data-product-id]');
            const items = [];

            cartRows.forEach(row => {
                const item = {
                    id: row.dataset.productId,
                    name: row.querySelector('.product-name')?.textContent,
                    price: row.querySelector('.price-input, .price-display')?.value ||
                           row.querySelector('.price-input, .price-display')?.textContent,
                    quantity: row.querySelector('.quantity-input')?.value,
                    downAmount: row.querySelector('.down-amount-input')?.value,
                    brand: row.dataset.brand,
                    model: row.dataset.model
                };

                if (item.id && item.name && item.price && item.quantity) {
                    items.push(item);
                }
            });

            return items;
        },

        /**
         * Add product to cart UI
         * @param {object} product - Sanitized product data
         */
        addProductToCartUI: function(product) {
            const cartContainer = document.getElementById('cartContainer') ||
                                document.querySelector('.cart-items, .selected-products');

            if (!cartContainer) return;

            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item p-4 border rounded-lg mb-2';
            cartItem.dataset.productId = product.id;

            const itemTotal = FinCalc.roundToBaht((product.downAmount || product.price) * product.quantity);

            cartItem.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex-1">
                        <h4 class="font-semibold product-name">${XSS.escapeHtml(product.name)}</h4>
                        ${product.brand ? `<p class="text-sm text-gray-600">${XSS.escapeHtml(product.brand)}</p>` : ''}
                        <div class="flex items-center gap-4 mt-2">
                            <span>จำนวน:</span>
                            <input type="number" class="quantity-input w-20 px-2 py-1 border rounded"
                                   value="${product.quantity}" min="1" max="999">
                            <span>ราคา: ${FinCalc.formatCurrency(product.downAmount || product.price)}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-semibold item-total">${FinCalc.formatCurrency(itemTotal)}</div>
                        <button type="button" class="remove-from-cart-btn btn btn-sm btn-error mt-2">
                            <i class="bi bi-trash"></i> ลบ
                        </button>
                    </div>
                </div>
            `;

            cartContainer.appendChild(cartItem);
        },

        /**
         * Update product display with sanitized data
         * @param {object} product - Sanitized product data
         */
        updateProductDisplay: function(product) {
            const nameElement = document.getElementById('selectedProductName');
            const priceElement = document.getElementById('selectedProductPrice');
            const brandElement = document.getElementById('selectedProductBrand');

            if (nameElement) nameElement.textContent = product.name;
            if (priceElement) priceElement.textContent = FinCalc.formatCurrency(product.price);
            if (brandElement) brandElement.textContent = product.brand || '';
        }
    };

    /**
     * Step 1 navigation and completion validation
     */
    const Step1Navigation = {
        /**
         * Validate step completion before proceeding
         * @returns {object} - Validation result
         */
        validateStepCompletion: function() {
            const cartItems = Step1RealTimeValidator.getCartItems();
            const cartResult = Step1Validator.validateCart(cartItems);

            if (!cartResult.isValid) {
                ErrorHandler.showToast(`ไม่สามารถดำเนินการต่อได้: ${cartResult.error}`, 'error');
                return { canProceed: false, error: cartResult.error };
            }

            // Additional business logic validation
            if (cartResult.totalAmount < 1000) {
                ErrorHandler.showToast('ยอดรวมขั้นต่ำ 1,000 บาท', 'warning');
                return { canProceed: false, error: 'ยอดรวมขั้นต่ำ 1,000 บาท' };
            }

            return {
                canProceed: true,
                error: '',
                data: {
                    items: cartResult.sanitizedItems,
                    totalAmount: cartResult.totalAmount
                }
            };
        },

        /**
         * Handle proceed to next step
         */
        proceedToNextStep: function() {
            const validation = this.validateStepCompletion();

            if (!validation.canProceed) {
                return false;
            }

            // Save data to global manager
            if (window.globalInstallmentManager) {
                window.globalInstallmentManager.updateStepData(1, {
                    ...validation.data,
                    completedAt: new Date().toISOString(),
                    isValid: true
                });
            }

            // Navigate to step 2
            const nextStepUrl = '/views/pattani/installment/step2/step2.html';
            window.location.href = nextStepUrl;

            return true;
        }
    };

    /**
     * Initialize step 1 validation
     */
    function initializeStep1Validation() {
        console.info('🔒 Initializing Step 1 validation...');

        // Initialize real-time validation
        Step1RealTimeValidator.initialize();

        // Bind navigation events
        const nextButton = document.getElementById('nextStepBtn') ||
                          document.querySelector('.next-step-btn, .proceed-btn');

        if (nextButton) {
            nextButton.addEventListener('click', function(event) {
                event.preventDefault();
                Step1Navigation.proceedToNextStep();
            });
        }

        // Load existing cart data if available
        if (window.globalInstallmentManager) {
            const step1Data = window.globalInstallmentManager.getStepData(1);
            if (step1Data && step1Data.items) {
                Step1RealTimeValidator.updateCartTotal();
            }
        }

        console.info('✅ Step 1 validation initialized');
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeStep1Validation);
    } else {
        initializeStep1Validation();
    }

    // Export to global scope
    global.Step1ValidationEnhancements = {
        Validator: Step1Validator,
        RealTimeValidator: Step1RealTimeValidator,
        Navigation: Step1Navigation,
        version: '1.0.0'
    };

    console.info('🔒 Step 1 Validation Enhancements v1.0.0 loaded');

})(window);