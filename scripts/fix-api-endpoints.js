#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix API endpoint errors script
class APIErrorFixer {
    constructor() {
        this.controllersDir = path.join(__dirname, '..', 'controllers');
        this.routesDir = path.join(__dirname, '..', 'routes');
        this.fixedFiles = [];
        this.errors = [];
    }

    // Enhanced error handling wrapper
    generateErrorHandling() {
        return `
// Enhanced error handling middleware
function handleControllerError(error, req, res, context = '') {
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Log error with context
    const errorLog = {
        timestamp: new Date().toISOString(),
        context: context,
        method: req.method,
        path: req.path,
        query: req.query,
        params: req.params,
        error: {
            message: error.message,
            name: error.name,
            stack: isDevelopment ? error.stack : undefined
        },
        user: req.user ? { id: req.user.id, role: req.user.role } : null
    };

    console.error('🔥 Controller Error:', errorLog);

    // Determine error type and response
    let statusCode = 500;
    let userMessage = 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์';

    if (error.name === 'ValidationError') {
        statusCode = 400;
        userMessage = 'ข้อมูลที่ส่งมาไม่ถูกต้อง';
    } else if (error.name === 'CastError') {
        statusCode = 400;
        userMessage = 'รูปแบบข้อมูลไม่ถูกต้อง';
    } else if (error.name === 'MongoNetworkError') {
        statusCode = 503;
        userMessage = 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้';
    } else if (error.code === 11000) {
        statusCode = 409;
        userMessage = 'ข้อมูลซ้ำ';
    }

    // Send response
    res.status(statusCode).json({
        success: false,
        message: userMessage,
        error: isDevelopment ? error.message : undefined,
        timestamp: new Date().toISOString(),
        requestId: req.id || generateRequestId()
    });
}

// Generate unique request ID
function generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Async wrapper for controllers
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Validation helper
function validateRequired(data, requiredFields) {
    const missing = [];

    for (const field of requiredFields) {
        if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
            missing.push(field);
        }
    }

    if (missing.length > 0) {
        throw new Error(\`ข้อมูลที่จำเป็น: \${missing.join(', ')}\`);
    }
}

// Financial amount validation
function validateFinancialAmount(amount, fieldName = 'amount') {
    const num = parseFloat(amount);
    if (isNaN(num)) {
        throw new Error(\`\${fieldName} ต้องเป็นตัวเลข\`);
    }
    if (num < 0) {
        throw new Error(\`\${fieldName} ต้องเป็นจำนวนเงินที่มากกว่าหรือเท่ากับ 0\`);
    }
    if (num > 999999999.99) {
        throw new Error(\`\${fieldName} เกินจำนวนสูงสุดที่อนุญาต\`);
    }
    return num;
}

// Date validation
function validateDate(dateString, fieldName = 'date') {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error(\`\${fieldName} ไม่ใช่วันที่ที่ถูกต้อง\`);
    }
    return date;
}
`;
    }

    // Fix branch stock history controller
    async fixBranchStockHistoryController() {
        const filePath = path.join(this.controllersDir, 'branchStockHistoryController.js');

        try {
            let content = fs.readFileSync(filePath, 'utf8');

            // Add error handling imports if not present
            if (!content.includes('handleControllerError')) {
                const errorHandling = this.generateErrorHandling();

                // Insert after the initial require statements
                const insertPoint = content.indexOf('const mongoose = require');
                if (insertPoint !== -1) {
                    content = content.slice(0, insertPoint) + errorHandling + '\n' + content.slice(insertPoint);
                } else {
                    content = errorHandling + '\n' + content;
                }
            }

            // Fix specific API endpoints that return 500 errors
            const fixes = [
                {
                    // Fix tax-pn50 endpoint
                    pattern: /exports\.getTaxPN50\s*=\s*async\s*\([^)]*\)\s*=>\s*{[^}]*}/s,
                    replacement: `exports.getTaxPN50 = asyncHandler(async (req, res) => {
    try {
        const { branch_code } = req.query;

        validateRequired(req.query, ['branch_code']);

        const pipeline = [
            {
                $match: {
                    type: 'ขายสินค้า',
                    ...(branch_code !== 'all' ? { branch_code } : {})
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $multiply: ['$quantity', '$sell_price'] } }
                }
            }
        ];

        const result = await BranchStockHistory.aggregate(pipeline);
        const total = result.length > 0 ? result[0].total : 0;

        res.json({
            success: true,
            data: {
                tax_pn50: total * 0.01, // 1% tax
                total_sales: total
            }
        });

    } catch (error) {
        handleControllerError(error, req, res, 'getTaxPN50');
    }
})`
                },
                {
                    // Fix sales-revenue endpoint
                    pattern: /exports\.getSalesRevenue\s*=\s*async\s*\([^)]*\)\s*=>\s*{[^}]*}/s,
                    replacement: `exports.getSalesRevenue = asyncHandler(async (req, res) => {
    try {
        const { start_date, end_date, branch_code } = req.query;

        const matchConditions = {
            type: 'ขายสินค้า'
        };

        if (start_date && end_date) {
            matchConditions.created_at = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            };
        }

        if (branch_code && branch_code !== 'all') {
            matchConditions.branch_code = branch_code;
        }

        const result = await BranchStockHistory.aggregate([
            { $match: matchConditions },
            {
                $group: {
                    _id: null,
                    total_revenue: { $sum: { $multiply: ['$quantity', '$sell_price'] } },
                    total_quantity: { $sum: '$quantity' },
                    transaction_count: { $sum: 1 }
                }
            }
        ]);

        const data = result.length > 0 ? result[0] : {
            total_revenue: 0,
            total_quantity: 0,
            transaction_count: 0
        };

        res.json({
            success: true,
            data: data
        });

    } catch (error) {
        handleControllerError(error, req, res, 'getSalesRevenue');
    }
})`
                },
                {
                    // Fix tax-pn30 endpoint
                    pattern: /exports\.getTaxPN30\s*=\s*async\s*\([^)]*\)\s*=>\s*{[^}]*}/s,
                    replacement: `exports.getTaxPN30 = asyncHandler(async (req, res) => {
    try {
        const { branch_code } = req.query;

        const matchConditions = {
            type: 'ขายสินค้า'
        };

        if (branch_code && branch_code !== 'all') {
            matchConditions.branch_code = branch_code;
        }

        const result = await BranchStockHistory.aggregate([
            { $match: matchConditions },
            {
                $group: {
                    _id: '$product_id',
                    total_sold: { $sum: '$quantity' },
                    total_revenue: { $sum: { $multiply: ['$quantity', '$sell_price'] } }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $group: {
                    _id: null,
                    withholding_tax: { $sum: { $multiply: ['$total_revenue', 0.03] } }, // 3% withholding tax
                    total_before_tax: { $sum: '$total_revenue' }
                }
            }
        ]);

        const data = result.length > 0 ? result[0] : {
            withholding_tax: 0,
            total_before_tax: 0
        };

        res.json({
            success: true,
            data: data
        });

    } catch (error) {
        handleControllerError(error, req, res, 'getTaxPN30');
    }
})`
                },
                {
                    // Fix tax-pnd1 endpoint
                    pattern: /exports\.getTaxPND1\s*=\s*async\s*\([^)]*\)\s*=>\s*{[^}]*}/s,
                    replacement: `exports.getTaxPND1 = asyncHandler(async (req, res) => {
    try {
        const { branch_code } = req.query;

        const matchConditions = {
            type: { $in: ['เงินเดือน', 'ค่าจ้าง', 'โบนัส'] }
        };

        if (branch_code && branch_code !== 'all') {
            matchConditions.branch_code = branch_code;
        }

        const result = await BranchStockHistory.aggregate([
            { $match: matchConditions },
            {
                $group: {
                    _id: null,
                    total_salary: { $sum: '$amount' },
                    total_tax: { $sum: { $multiply: ['$amount', 0.05] } } // 5% personal income tax
                }
            }
        ]);

        const data = result.length > 0 ? result[0] : {
            total_salary: 0,
            total_tax: 0
        };

        res.json({
            success: true,
            data: data
        });

    } catch (error) {
        handleControllerError(error, req, res, 'getTaxPND1');
    }
})`
                }
            ];

            // Apply fixes
            fixes.forEach(fix => {
                if (fix.pattern.test(content)) {
                    content = content.replace(fix.pattern, fix.replacement);
                }
            });

            // Write back to file
            fs.writeFileSync(filePath, content, 'utf8');
            this.fixedFiles.push(filePath);

            console.log('✅ Fixed branch stock history controller API endpoints');

        } catch (error) {
            this.errors.push({ file: filePath, error: error.message });
            console.error(`❌ Error fixing ${filePath}:`, error.message);
        }
    }

    // Fix expense controller
    async fixExpenseController() {
        const filePath = path.join(this.controllersDir, 'expenseController.js');

        try {
            let content = fs.readFileSync(filePath, 'utf8');

            // Add error handling if not present
            if (!content.includes('handleControllerError')) {
                const errorHandling = this.generateErrorHandling();
                content = errorHandling + '\n' + content;
            }

            // Fix common expense controller issues
            const fixes = [
                {
                    // Fix getAllExpenses endpoint
                    pattern: /(exports\.getAllExpenses\s*=\s*async\s*\([^)]*\)\s*=>\s*{)/,
                    replacement: `$1
    try {
        const { start_date, end_date, category, branch_code } = req.query;

        const filter = {};

        if (start_date && end_date) {
            filter.date = {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            };
        }

        if (category) {
            filter.category = category;
        }

        if (branch_code && branch_code !== 'all') {
            filter.branch_code = branch_code;
        }

        const expenses = await Expense.find(filter)
            .populate('category', 'name')
            .populate('supplier', 'name')
            .sort({ date: -1 });

        res.json({
            success: true,
            data: expenses,
            total: expenses.length
        });

    } catch (error) {
        handleControllerError(error, req, res, 'getAllExpenses');
    }`
                }
            ];

            // Apply fixes
            fixes.forEach(fix => {
                content = content.replace(fix.pattern, fix.replacement);
            });

            // Write back to file
            fs.writeFileSync(filePath, content, 'utf8');
            this.fixedFiles.push(filePath);

            console.log('✅ Fixed expense controller API endpoints');

        } catch (error) {
            this.errors.push({ file: filePath, error: error.message });
            console.error(`❌ Error fixing ${filePath}:`, error.message);
        }
    }

    // Fix user controller login issues
    async fixUserController() {
        const filePath = path.join(this.controllersDir, 'userController.js');

        try {
            let content = fs.readFileSync(filePath, 'utf8');

            // Add error handling if not present
            if (!content.includes('handleControllerError')) {
                const errorHandling = this.generateErrorHandling();
                content = errorHandling + '\n' + content;
            }

            // Fix login endpoint
            const loginFix = `
exports.login = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        validateRequired(req.body, ['email', 'password']);

        // Find user by email
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        // Check if user is active
        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'บัญชีผู้ใช้ถูกระงับ กรุณาติดต่อผู้ดูแลระบบ'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET || 'default-secret',
            { expiresIn: '24h' }
        );

        // Update last login
        await User.findByIdAndUpdate(user._id, {
            last_login: new Date(),
            $inc: { login_count: 1 }
        });

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            data: {
                user: userResponse,
                token: token
            }
        });

    } catch (error) {
        handleControllerError(error, req, res, 'login');
    }
});`;

            // Replace existing login function if it exists
            if (content.includes('exports.login')) {
                content = content.replace(
                    /exports\.login\s*=\s*async\s*\([^}]*}[\s\S]*?(?=exports\.|$)/,
                    loginFix + '\n\n'
                );
            } else {
                content += '\n\n' + loginFix;
            }

            // Write back to file
            fs.writeFileSync(filePath, content, 'utf8');
            this.fixedFiles.push(filePath);

            console.log('✅ Fixed user controller login endpoint');

        } catch (error) {
            this.errors.push({ file: filePath, error: error.message });
            console.error(`❌ Error fixing ${filePath}:`, error.message);
        }
    }

    // Main execution function
    async run() {
        console.log('🔧 Starting API endpoint fixes...\n');

        try {
            await this.fixBranchStockHistoryController();
            await this.fixExpenseController();
            await this.fixUserController();

            // Generate summary report
            console.log('\n📊 API Fix Summary:');
            console.log(`✅ Successfully fixed: ${this.fixedFiles.length} files`);
            console.log(`❌ Errors encountered: ${this.errors.length} files`);

            if (this.errors.length > 0) {
                console.log('\n❌ Files with errors:');
                this.errors.forEach(({ file, error }) => {
                    console.log(`   - ${path.basename(file)}: ${error}`);
                });
            }

            console.log('\n🎉 API endpoint fixes complete!');

        } catch (error) {
            console.error('❌ Critical error during API fixes:', error);
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const fixer = new APIErrorFixer();
    fixer.run();
}

module.exports = APIErrorFixer;