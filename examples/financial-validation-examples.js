// Financial Validation Test Examples
const {
    validateThaiAmount,
    validateThaiTaxId,
    validateInvoiceNumber,
    validateAccountCode,
    ValidationRules
} = require('../middlewares/financialValidation');

// Test function examples
function testFinancialValidation() {
    console.log('🧪 Testing Financial Validation Functions...
');

    // Test Thai amount validation
    try {
        const validAmount = validateThaiAmount(1000.50);
        console.log('✅ Valid amount:', validAmount);
    } catch (error) {
        console.log('❌ Amount validation error:', error.message);
    }

    // Test invalid amount
    try {
        validateThaiAmount(-100);
    } catch (error) {
        console.log('✅ Correctly caught negative amount:', error.message);
    }

    // Test Thai Tax ID validation
    try {
        const validTaxId = validateThaiTaxId('1234567890123');
        console.log('✅ Valid Tax ID:', validTaxId);
    } catch (error) {
        console.log('❌ Tax ID validation error:', error.message);
    }

    // Test invoice number validation
    try {
        const validInvoice = validateInvoiceNumber('IV-2025-000001');
        console.log('✅ Valid invoice number:', validInvoice);
    } catch (error) {
        console.log('❌ Invoice validation error:', error.message);
    }

    // Test account code validation
    try {
        const validAccountCode = validateAccountCode('1-1-001');
        console.log('✅ Valid account code:', validAccountCode);
    } catch (error) {
        console.log('❌ Account code validation error:', error.message);
    }

    console.log('\n🎉 Financial validation tests completed!');
}

// Usage examples for middleware
const express = require('express');
const { validateFinancialData } = require('../middlewares/financialValidation');

// Example route with validation
function createInvoiceRoute() {
    const router = express.Router();

    router.post('/invoice/create',
        validateFinancialData(ValidationRules.invoice),
        (req, res) => {
            // The request data is now validated and sanitized
            const { invoiceNumber, amount, taxAmount, customerId, dueDate } = req.validatedData;

            console.log('Validated invoice data:', {
                invoiceNumber,
                amount,
                taxAmount,
                customerId,
                dueDate
            });

            res.json({
                success: true,
                message: 'Invoice data is valid',
                data: req.validatedData
            });
        }
    );

    return router;
}

// Custom validation example
function createCustomValidationRoute() {
    const router = express.Router();

    const customValidationRules = {
        productCode: {
            type: 'custom',
            required: true,
            validator: (value) => {
                // Custom product code format: PRD-YYYYMMDD-NNN
                const pattern = /^PRD-\d{8}-\d{3}$/;
                if (!pattern.test(value)) {
                    return 'รหัสสินค้าต้องเป็นรูปแบบ PRD-YYYYMMDD-NNN';
                }
                return true;
            }
        },
        discountRate: {
            type: 'percentage',
            required: false
        },
        unitPrice: {
            type: 'amount',
            required: true
        }
    };

    router.post('/product/custom-validation',
        validateFinancialData(customValidationRules),
        (req, res) => {
            res.json({
                success: true,
                message: 'Custom validation passed',
                data: req.validatedData
            });
        }
    );

    return router;
}

module.exports = {
    testFinancialValidation,
    createInvoiceRoute,
    createCustomValidationRoute
};

// Run tests if this file is executed directly
if (require.main === module) {
    testFinancialValidation();
}