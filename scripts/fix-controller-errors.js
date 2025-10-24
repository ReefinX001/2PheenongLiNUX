#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix controller stack trace errors script
class ControllerErrorFixer {
    constructor() {
        this.controllersDir = path.join(__dirname, '..', 'controllers');
        this.fixedFiles = [];
        this.errors = [];
    }

    // Enhanced error handling template
    generateEnhancedErrorHandling() {
        return `
// Enhanced error handling for controllers
const createErrorHandler = (context) => {
    return (error, req, res, additionalInfo = {}) => {
        const isDevelopment = process.env.NODE_ENV === 'development';

        // Comprehensive error logging
        const errorLog = {
            timestamp: new Date().toISOString(),
            context: context,
            method: req?.method,
            path: req?.path,
            query: req?.query,
            params: req?.params,
            body: req?.method === 'POST' || req?.method === 'PUT' ? req?.body : undefined,
            error: {
                message: error.message,
                name: error.name,
                code: error.code,
                stack: isDevelopment ? error.stack : undefined
            },
            user: req?.user ? { id: req.user.id, role: req.user.role } : null,
            additionalInfo: additionalInfo
        };

        console.error(\`🔥 \${context} Error:\`, errorLog);

        // Determine appropriate response based on error type
        let statusCode = 500;
        let userMessage = 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์';

        // Handle specific error types
        if (error.name === 'ValidationError') {
            statusCode = 400;
            userMessage = 'ข้อมูลที่ส่งมาไม่ถูกต้อง';
        } else if (error.name === 'CastError') {
            statusCode = 400;
            userMessage = 'รูปแบบข้อมูลไม่ถูกต้อง';
        } else if (error.name === 'MongoError' || error.name === 'MongoNetworkError') {
            statusCode = 503;
            userMessage = 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้';
        } else if (error.code === 11000) {
            statusCode = 409;
            userMessage = 'ข้อมูลซ้ำ';
        } else if (error.name === 'JsonWebTokenError') {
            statusCode = 401;
            userMessage = 'Token ไม่ถูกต้อง';
        } else if (error.name === 'TokenExpiredError') {
            statusCode = 401;
            userMessage = 'Token หมดอายุ';
        }

        // Send structured error response
        if (res && typeof res.status === 'function') {
            res.status(statusCode).json({
                success: false,
                message: userMessage,
                error: isDevelopment ? error.message : undefined,
                code: error.code || error.name,
                timestamp: new Date().toISOString(),
                requestId: req?.id || generateRequestId()
            });
        }

        // Log to external service if available
        if (typeof logErrorToExternalService === 'function') {
            logErrorToExternalService(errorLog);
        }
    };
};

// Generate unique request ID
function generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Safe async wrapper
function safeAsyncHandler(fn, context = 'Unknown') {
    const errorHandler = createErrorHandler(context);

    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            errorHandler(error, req, res);
        }
    };
}
`;
    }

    // Fix specific controller files
    async fixEmailController() {
        const filePath = path.join(this.controllersDir, 'emailController.js');

        try {
            let content = fs.readFileSync(filePath, 'utf8');

            // Add enhanced error handling
            if (!content.includes('createErrorHandler')) {
                content = this.generateEnhancedErrorHandling() + '\n' + content;
            }

            // Fix specific error handling patterns
            const fixes = [
                {
                    // Replace console.error with enhanced error handling
                    pattern: /console\.error\('❌ Email Controller Error:', error\);/g,
                    replacement: `const emailErrorHandler = createErrorHandler('EmailController');
        emailErrorHandler(error, req, res, { action: 'sendEmail' });`
                },
                {
                    // Replace console.error with enhanced error handling for test email
                    pattern: /console\.error\('❌ Test Email Error:', error\);/g,
                    replacement: `const testEmailErrorHandler = createErrorHandler('TestEmail');
        testEmailErrorHandler(error, req, res, { action: 'testEmail' });`
                },
                {
                    // Replace console.error with enhanced error handling for email status
                    pattern: /console\.error\('❌ Email Status Check Error:', error\);/g,
                    replacement: `const statusErrorHandler = createErrorHandler('EmailStatus');
        statusErrorHandler(error, req, res, { action: 'checkStatus' });`
                },
                {
                    // Replace console.error with enhanced error handling for email preview
                    pattern: /console\.error\('❌ Email Preview Error:', error\);/g,
                    replacement: `const previewErrorHandler = createErrorHandler('EmailPreview');
        previewErrorHandler(error, req, res, { action: 'preview' });`
                },
                {
                    // Replace console.error with enhanced error handling for email stats
                    pattern: /console\.error\('❌ Email Stats Error:', error\);/g,
                    replacement: `const statsErrorHandler = createErrorHandler('EmailStats');
        statsErrorHandler(error, req, res, { action: 'getStats' });`
                }
            ];

            // Apply fixes
            fixes.forEach(fix => {
                content = content.replace(fix.pattern, fix.replacement);
            });

            // Wrap all exported functions with safe async handler
            content = content.replace(
                /exports\.(\w+)\s*=\s*async\s*\(([^)]*)\)\s*=>\s*{/g,
                'exports.$1 = safeAsyncHandler(async ($2) => {'
            );

            fs.writeFileSync(filePath, content, 'utf8');
            this.fixedFiles.push(filePath);

            console.log('✅ Fixed email controller error handling');

        } catch (error) {
            this.errors.push({ file: filePath, error: error.message });
            console.error(`❌ Error fixing ${filePath}:`, error.message);
        }
    }

    // Fix user controller
    async fixUserController() {
        const filePath = path.join(this.controllersDir, 'userController.js');

        try {
            let content = fs.readFileSync(filePath, 'utf8');

            // Add enhanced error handling
            if (!content.includes('createErrorHandler')) {
                content = this.generateEnhancedErrorHandling() + '\n' + content;
            }

            // Fix session error handling
            const sessionErrorFix = `
        // Enhanced session error handling
        const sessionErrorHandler = createErrorHandler('UserSession');
        sessionErrorHandler(sessionError, req, res, {
            action: 'sessionManagement',
            sessionId: req.session?.id,
            userId: req.user?.id
        });`;

            content = content.replace(
                /console\.error\('❌ Stack trace:', sessionError\.stack\);/g,
                sessionErrorFix
            );

            // Wrap all exported functions with safe async handler
            content = content.replace(
                /exports\.(\w+)\s*=\s*async\s*\(([^)]*)\)\s*=>\s*{/g,
                'exports.$1 = safeAsyncHandler(async ($2) => {'
            );

            fs.writeFileSync(filePath, content, 'utf8');
            this.fixedFiles.push(filePath);

            console.log('✅ Fixed user controller error handling');

        } catch (error) {
            this.errors.push({ file: filePath, error: error.message });
            console.error(`❌ Error fixing ${filePath}:`, error.message);
        }
    }

    // Fix trial balance controller
    async fixTrialBalanceController() {
        const filePath = path.join(this.controllersDir, 'trialBalanceController.js');

        try {
            let content = fs.readFileSync(filePath, 'utf8');

            // Add enhanced error handling
            if (!content.includes('createErrorHandler')) {
                content = this.generateEnhancedErrorHandling() + '\n' + content;
            }

            // Fix trial balance errors
            const fixes = [
                {
                    pattern: /console\.error\('Trial Balance Error:', err\);/g,
                    replacement: `const trialBalanceErrorHandler = createErrorHandler('TrialBalance');
        trialBalanceErrorHandler(err, req, res, { action: 'generateTrialBalance' });`
                },
                {
                    pattern: /console\.error\('Trial Balance Summary Error:', err\);/g,
                    replacement: `const summaryErrorHandler = createErrorHandler('TrialBalanceSummary');
        summaryErrorHandler(err, req, res, { action: 'generateSummary' });`
                }
            ];

            // Apply fixes
            fixes.forEach(fix => {
                content = content.replace(fix.pattern, fix.replacement);
            });

            fs.writeFileSync(filePath, content, 'utf8');
            this.fixedFiles.push(filePath);

            console.log('✅ Fixed trial balance controller error handling');

        } catch (error) {
            this.errors.push({ file: filePath, error: error.message });
            console.error(`❌ Error fixing ${filePath}:`, error.message);
        }
    }

    // Fix invoice controllers
    async fixInvoiceControllers() {
        const invoiceFiles = [
            'invoiceController.js',
            path.join('order', 'InvoiceReceiptController.js'),
            path.join('order', 'invoiceController.js')
        ];

        for (const file of invoiceFiles) {
            const filePath = path.join(this.controllersDir, file);

            try {
                if (!fs.existsSync(filePath)) {
                    console.log(`⚠️ File not found: ${filePath}`);
                    continue;
                }

                let content = fs.readFileSync(filePath, 'utf8');

                // Add enhanced error handling
                if (!content.includes('createErrorHandler')) {
                    content = this.generateEnhancedErrorHandling() + '\n' + content;
                }

                // Fix PDF generation errors
                const pdfErrorFix = `
            const pdfErrorHandler = createErrorHandler('PDFGeneration');
            pdfErrorHandler(err, req, res, {
                action: 'generatePDF',
                documentType: 'invoice',
                documentId: req.params?.id || req.body?.id
            });`;

                content = content.replace(
                    /console\.error\("PDF Generate Error:", err\);/g,
                    pdfErrorFix
                );

                fs.writeFileSync(filePath, content, 'utf8');
                this.fixedFiles.push(filePath);

                console.log(`✅ Fixed ${file} error handling`);

            } catch (error) {
                this.errors.push({ file: filePath, error: error.message });
                console.error(`❌ Error fixing ${filePath}:`, error.message);
            }
        }
    }

    // Fix PDF controllers
    async fixPDFControllers() {
        const pdfFiles = [
            path.join('pdf', 'PDFoooRasterController.js'),
            path.join('pdf', 'A4PDFController.js')
        ];

        for (const file of pdfFiles) {
            const filePath = path.join(this.controllersDir, file);

            try {
                if (!fs.existsSync(filePath)) {
                    console.log(`⚠️ File not found: ${filePath}`);
                    continue;
                }

                let content = fs.readFileSync(filePath, 'utf8');

                // Add enhanced error handling
                if (!content.includes('createErrorHandler')) {
                    content = this.generateEnhancedErrorHandling() + '\n' + content;
                }

                // Fix various PDF errors
                const fixes = [
                    {
                        pattern: /console\.error\('❌ CashSalesPDFController Error:', error\.message\);/g,
                        replacement: `const cashSalesErrorHandler = createErrorHandler('CashSalesPDF');
            cashSalesErrorHandler(error, req, res, { action: 'generateCashSalesPDF' });`
                    },
                    {
                        pattern: /console\.error\('❌ A4PDF Error: Invalid order data:', order\);/g,
                        replacement: `const a4PDFErrorHandler = createErrorHandler('A4PDF');
            a4PDFErrorHandler(new Error('Invalid order data'), req, res, {
                action: 'validateOrderData',
                orderData: order
            });`
                    }
                ];

                // Apply fixes
                fixes.forEach(fix => {
                    content = content.replace(fix.pattern, fix.replacement);
                });

                fs.writeFileSync(filePath, content, 'utf8');
                this.fixedFiles.push(filePath);

                console.log(`✅ Fixed ${file} error handling`);

            } catch (error) {
                this.errors.push({ file: filePath, error: error.message });
                console.error(`❌ Error fixing ${filePath}:`, error.message);
            }
        }
    }

    // Fix POS controller
    async fixPOSController() {
        const filePath = path.join(this.controllersDir, 'POS', 'quickSaleController_backup.js');

        try {
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️ File not found: ${filePath}`);
                return;
            }

            let content = fs.readFileSync(filePath, 'utf8');

            // Add enhanced error handling
            if (!content.includes('createErrorHandler')) {
                content = this.generateEnhancedErrorHandling() + '\n' + content;
            }

            // Fix quick sale errors
            const fixes = [
                {
                    pattern: /console\.error\('Quick Sale Error:', error\);/g,
                    replacement: `const quickSaleErrorHandler = createErrorHandler('QuickSale');
        quickSaleErrorHandler(error, req, res, { action: 'processQuickSale' });`
                },
                {
                    pattern: /console\.error\('Get Quick Sale Products Error:', error\);/g,
                    replacement: `const productsErrorHandler = createErrorHandler('QuickSaleProducts');
        productsErrorHandler(error, req, res, { action: 'getProducts' });`
                },
                {
                    pattern: /console\.error\('Get Quick Sale Stats Error:', error\);/g,
                    replacement: `const statsErrorHandler = createErrorHandler('QuickSaleStats');
        statsErrorHandler(error, req, res, { action: 'getStats' });`
                }
            ];

            // Apply fixes
            fixes.forEach(fix => {
                content = content.replace(fix.pattern, fix.replacement);
            });

            fs.writeFileSync(filePath, content, 'utf8');
            this.fixedFiles.push(filePath);

            console.log('✅ Fixed POS controller error handling');

        } catch (error) {
            this.errors.push({ file: filePath, error: error.message });
            console.error(`❌ Error fixing ${filePath}:`, error.message);
        }
    }

    // Fix accounting controllers
    async fixAccountingControllers() {
        const filePath = path.join(this.controllersDir, 'accounting', 'cashFlowController.js');

        try {
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️ File not found: ${filePath}`);
                return;
            }

            let content = fs.readFileSync(filePath, 'utf8');

            // Add enhanced error handling
            if (!content.includes('createErrorHandler')) {
                content = this.generateEnhancedErrorHandling() + '\n' + content;
            }

            // Fix cash flow errors
            const cashFlowErrorFix = `
        const cashFlowErrorHandler = createErrorHandler('CashFlowReport');
        cashFlowErrorHandler(error, req, res, {
            action: 'generateCashFlowReport',
            reportPeriod: req.query?.period || req.body?.period
        });`;

            content = content.replace(
                /console\.error\('Cash Flow Report Error:', error\);/g,
                cashFlowErrorFix
            );

            fs.writeFileSync(filePath, content, 'utf8');
            this.fixedFiles.push(filePath);

            console.log('✅ Fixed accounting controller error handling');

        } catch (error) {
            this.errors.push({ file: filePath, error: error.message });
            console.error(`❌ Error fixing ${filePath}:`, error.message);
        }
    }

    // Main execution function
    async run() {
        console.log('🔧 Starting controller error fixes...\n');

        try {
            await this.fixEmailController();
            await this.fixUserController();
            await this.fixTrialBalanceController();
            await this.fixInvoiceControllers();
            await this.fixPDFControllers();
            await this.fixPOSController();
            await this.fixAccountingControllers();

            // Generate summary report
            console.log('\n📊 Controller Error Fix Summary:');
            console.log(`✅ Successfully fixed: ${this.fixedFiles.length} files`);
            console.log(`❌ Errors encountered: ${this.errors.length} files`);

            if (this.errors.length > 0) {
                console.log('\n❌ Files with errors:');
                this.errors.forEach(({ file, error }) => {
                    console.log(`   - ${path.basename(file)}: ${error}`);
                });
            }

            console.log('\n🎉 Controller error fixes complete!');

        } catch (error) {
            console.error('❌ Critical error during controller fixes:', error);
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const fixer = new ControllerErrorFixer();
    fixer.run();
}

module.exports = ControllerErrorFixer;