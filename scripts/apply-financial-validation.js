#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Apply financial validation to routes script
class FinancialValidationApplier {
    constructor() {
        this.routesDir = path.join(__dirname, '..', 'routes');
        this.controllersDir = path.join(__dirname, '..', 'controllers');
        this.modifiedFiles = [];
        this.errors = [];
    }

    // Generate import statement for financial validation
    generateImportStatement() {
        return `const { validateFinancialData, ValidationRules } = require('../middlewares/financialValidation');`;
    }

    // Find and update route files
    async updateRouteFiles() {
        const routeFiles = [
            'invoiceRoutes.js',
            'paymentRoutes.js',
            'expenseRoutes.js',
            'productRoutes.js',
            'customerRoutes.js',
            'chartOfAccountsRoutes.js',
            'orderRoutes.js',
            'purchaseOrderRoutes.js',
            'quotationRoutes.js'
        ];

        for (const fileName of routeFiles) {
            const filePath = path.join(this.routesDir, fileName);

            try {
                if (!fs.existsSync(filePath)) {
                    console.log(`⚠️ Route file not found: ${fileName}`);
                    continue;
                }

                let content = fs.readFileSync(filePath, 'utf8');

                // Add import statement if not present
                if (!content.includes('financialValidation')) {
                    const importStatement = this.generateImportStatement();

                    // Find the first require statement and add our import after it
                    const firstRequireIndex = content.indexOf('require(');
                    if (firstRequireIndex !== -1) {
                        const lineEnd = content.indexOf('\n', firstRequireIndex);
                        content = content.slice(0, lineEnd + 1) + importStatement + '\n' + content.slice(lineEnd + 1);
                    } else {
                        content = importStatement + '\n' + content;
                    }
                }

                // Apply validation to specific route patterns
                content = this.applyValidationToRoutes(content, fileName);

                fs.writeFileSync(filePath, content, 'utf8');
                this.modifiedFiles.push(fileName);

                console.log(`✅ Applied financial validation to: ${fileName}`);

            } catch (error) {
                this.errors.push({ file: fileName, error: error.message });
                console.error(`❌ Error processing ${fileName}:`, error.message);
            }
        }
    }

    // Apply validation to specific route patterns
    applyValidationToRoutes(content, fileName) {
        const routeMappings = {
            'invoiceRoutes.js': {
                patterns: [
                    { pattern: /router\.post\(['"]\/create['"]/, validation: 'ValidationRules.invoice' },
                    { pattern: /router\.put\(['"]\/update\/:\w+['"]/, validation: 'ValidationRules.invoice' },
                    { pattern: /router\.post\(['"]\/['"]/, validation: 'ValidationRules.invoice' }
                ]
            },
            'paymentRoutes.js': {
                patterns: [
                    { pattern: /router\.post\(['"]\/create['"]/, validation: 'ValidationRules.payment' },
                    { pattern: /router\.post\(['"]\/process['"]/, validation: 'ValidationRules.payment' },
                    { pattern: /router\.put\(['"]\/update\/:\w+['"]/, validation: 'ValidationRules.payment' }
                ]
            },
            'expenseRoutes.js': {
                patterns: [
                    { pattern: /router\.post\(['"]\/create['"]/, validation: 'ValidationRules.expense' },
                    { pattern: /router\.post\(['"]\/['"]/, validation: 'ValidationRules.expense' },
                    { pattern: /router\.put\(['"]\/update\/:\w+['"]/, validation: 'ValidationRules.expense' }
                ]
            },
            'productRoutes.js': {
                patterns: [
                    { pattern: /router\.post\(['"]\/create['"]/, validation: 'ValidationRules.product' },
                    { pattern: /router\.post\(['"]\/add['"]/, validation: 'ValidationRules.product' },
                    { pattern: /router\.put\(['"]\/update\/:\w+['"]/, validation: 'ValidationRules.product' }
                ]
            },
            'customerRoutes.js': {
                patterns: [
                    { pattern: /router\.post\(['"]\/create['"]/, validation: 'ValidationRules.customer' },
                    { pattern: /router\.post\(['"]\/register['"]/, validation: 'ValidationRules.customer' },
                    { pattern: /router\.put\(['"]\/update\/:\w+['"]/, validation: 'ValidationRules.customer' }
                ]
            },
            'chartOfAccountsRoutes.js': {
                patterns: [
                    { pattern: /router\.post\(['"]\/create['"]/, validation: 'ValidationRules.chartOfAccounts' },
                    { pattern: /router\.post\(['"]\/add['"]/, validation: 'ValidationRules.chartOfAccounts' },
                    { pattern: /router\.put\(['"]\/update\/:\w+['"]/, validation: 'ValidationRules.chartOfAccounts' }
                ]
            }
        };

        const mapping = routeMappings[fileName];
        if (!mapping) return content;

        mapping.patterns.forEach(({ pattern, validation }) => {
            // Find routes that match the pattern and add validation middleware
            content = content.replace(
                new RegExp(`(${pattern.source}),\\s*([^,\\)]+)`, 'g'),
                `$1, validateFinancialData(${validation}), $2`
            );

            // Also handle routes without existing middleware
            content = content.replace(
                new RegExp(`(${pattern.source})([^,]*)(,\\s*[^\\)]+\\))`, 'g'),
                (match, routeStart, routeMiddle, routeEnd) => {
                    if (!match.includes('validateFinancialData')) {
                        return `${routeStart}, validateFinancialData(${validation})${routeEnd}`;
                    }
                    return match;
                }
            );
        });

        return content;
    }

    // Update specific controller files with validation examples
    async updateControllerFiles() {
        const controllerUpdates = [
            {
                file: 'invoiceController.js',
                validations: [
                    'validateThaiAmount',
                    'validateInvoiceNumber',
                    'validateAccountingPeriod'
                ]
            },
            {
                file: 'expenseController.js',
                validations: [
                    'validateThaiAmount',
                    'validateAccountCode'
                ]
            },
            {
                file: 'paymentController.js',
                validations: [
                    'validateThaiAmount',
                    'validateThaiAccountNumber'
                ]
            }
        ];

        for (const update of controllerUpdates) {
            const filePath = path.join(this.controllersDir, update.file);

            try {
                if (!fs.existsSync(filePath)) {
                    console.log(`⚠️ Controller file not found: ${update.file}`);
                    continue;
                }

                let content = fs.readFileSync(filePath, 'utf8');

                // Add import statement for validation functions
                const importStatement = `const { ${update.validations.join(', ')} } = require('../middlewares/financialValidation');`;

                if (!content.includes('financialValidation')) {
                    // Find the first require statement and add our import after it
                    const firstRequireIndex = content.indexOf('require(');
                    if (firstRequireIndex !== -1) {
                        const lineEnd = content.indexOf('\n', firstRequireIndex);
                        content = content.slice(0, lineEnd + 1) + importStatement + '\n' + content.slice(lineEnd + 1);
                    } else {
                        content = importStatement + '\n' + content;
                    }

                    fs.writeFileSync(filePath, content, 'utf8');
                    this.modifiedFiles.push(update.file);

                    console.log(`✅ Added validation imports to: ${update.file}`);
                }

            } catch (error) {
                this.errors.push({ file: update.file, error: error.message });
                console.error(`❌ Error processing ${update.file}:`, error.message);
            }
        }
    }

    // Create validation test examples
    createValidationTests() {
        const testContent = `// Financial Validation Test Examples
const {
    validateThaiAmount,
    validateThaiTaxId,
    validateInvoiceNumber,
    validateAccountCode,
    ValidationRules
} = require('../middlewares/financialValidation');

// Test function examples
function testFinancialValidation() {
    console.log('🧪 Testing Financial Validation Functions...\n');

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

    console.log('\\n🎉 Financial validation tests completed!');
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
                const pattern = /^PRD-\\d{8}-\\d{3}$/;
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
}`;

        const testFilePath = path.join(__dirname, '..', 'examples', 'financial-validation-examples.js');

        // Ensure examples directory exists
        const examplesDir = path.dirname(testFilePath);
        if (!fs.existsSync(examplesDir)) {
            fs.mkdirSync(examplesDir, { recursive: true });
        }

        fs.writeFileSync(testFilePath, testContent, 'utf8');
        console.log('✅ Created financial validation examples file');
    }

    // Main execution function
    async run() {
        console.log('🔧 Applying financial validation to routes and controllers...\n');

        try {
            await this.updateRouteFiles();
            await this.updateControllerFiles();
            this.createValidationTests();

            // Generate summary report
            console.log('\n📊 Financial Validation Application Summary:');
            console.log(`✅ Successfully modified: ${this.modifiedFiles.length} files`);
            console.log(`❌ Errors encountered: ${this.errors.length} files`);

            if (this.modifiedFiles.length > 0) {
                console.log('\n✅ Modified files:');
                this.modifiedFiles.forEach(file => {
                    console.log(`   - ${file}`);
                });
            }

            if (this.errors.length > 0) {
                console.log('\n❌ Files with errors:');
                this.errors.forEach(({ file, error }) => {
                    console.log(`   - ${file}: ${error}`);
                });
            }

            console.log('\n📋 Features Added:');
            console.log('   ✓ Thai Baht amount validation (with proper decimal handling)');
            console.log('   ✓ Thai Tax ID validation (with checksum algorithm)');
            console.log('   ✓ Invoice number format validation');
            console.log('   ✓ Chart of accounts code validation');
            console.log('   ✓ Thai bank account number validation');
            console.log('   ✓ Percentage validation (0-100%)');
            console.log('   ✓ Quantity validation (with decimal limit)');
            console.log('   ✓ Accounting period validation');
            console.log('   ✓ Custom validation rules support');
            console.log('   ✓ Comprehensive error messages in Thai');

            console.log('\n🎉 Financial validation application complete!');

        } catch (error) {
            console.error('❌ Critical error during financial validation application:', error);
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const applier = new FinancialValidationApplier();
    applier.run();
}

module.exports = FinancialValidationApplier;