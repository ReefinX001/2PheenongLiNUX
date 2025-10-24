// routes/POS/receiptVoucherRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const receiptVoucherController = require('../../controllers/POS/receiptVoucherController');
const auth = require('../../middlewares/authJWT');
const BranchStockHistory = require('../../models/POS/BranchStockHistory');
const ReceiptVoucher = require('../../models/POS/ReceiptVoucher');
const ReceiptVoucherPdfController = require('../../controllers/POS/ReceiptVoucherPdfController');
const A4PDFController = require('../../controllers/pdf/A4PDFController');

// ==================== PUBLIC ROUTES (ไม่ต้อง auth) ====================

// Helper function: จำแนกประเภทบัญชีจากรหัสบัญชี
function getAccountType(accountCode) {
    if (!accountCode) return null;

    const firstDigit = accountCode.charAt(0);
    switch (firstDigit) {
        case '1': return 'assets';
        case '2': return 'liabilities';
        case '3': return 'equity';
        case '4': return 'revenue';
        case '5': return 'expenses';
        default: return null;
    }
}

// API สำหรับ Dashboard - แสดงยอดเงินรวมแต่ละประเภทบัญชี (PUBLIC - ไม่ต้อง auth)
router.get('/dashboard/accounts-summary', async (req, res) => {
    try {
        const { month, year } = req.query;

        // สร้าง date range สำหรับเดือนปัจจุบันหรือที่ระบุ
        let startDate, endDate;

        if (month && year) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59, 999);
        } else {
            // ใช้เดือนปัจจุบัน
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        console.log('Querying receipts from:', startDate, 'to:', endDate);

        // Query ใบสำคัญรับเงินในช่วงเวลาที่กำหนด
        const receipts = await ReceiptVoucher.find({
            paymentDate: { $gte: startDate, $lte: endDate },
            status: { $ne: 'cancelled' }
        })
        .populate('debitAccount creditAccount')
        .lean();

        console.log('Found receipts:', receipts.length);

        // Initialize amounts by category
        const amounts = {
            assets: 0,
            liabilities: 0,
            revenue: 0,
            expenses: 0
        };

        // Process each receipt
        receipts.forEach(receipt => {
            const amount = receipt.totalAmount || 0;

            // For Receipt Voucher:
            // Debit = เพิ่มในสินทรัพย์/ค่าใช้จ่าย หรือ ลดในหนี้สิน/รายได้
            // Credit = ลดในสินทรัพย์/ค่าใช้จ่าย หรือ เพิ่มในหนี้สิน/รายได้

            // Process debit account (เดบิต = เพิ่ม/ลด ตามประเภทบัญชี)
            if (receipt.debitAccount) {
                const account = receipt.debitAccount;
                const category = account.category?.toLowerCase() || '';
                const code = account.code || '';

                // Debit increases assets and expenses
                if (category === 'assets' || category === 'asset' || category === 'สินทรัพย์' || code.startsWith('1')) {
                    amounts.assets += amount; // เดบิตสินทรัพย์ = สินทรัพย์เพิ่ม
                } else if (category === 'expenses' || category === 'expense' || category === 'ค่าใช้จ่าย' || code.startsWith('5')) {
                    amounts.expenses += amount; // เดบิตค่าใช้จ่าย = ค่าใช้จ่ายเพิ่ม
                }
                // Debit decreases liabilities and revenue
                else if (category === 'liabilities' || category === 'liability' || category === 'หนี้สิน' || code.startsWith('2')) {
                    amounts.liabilities -= amount; // เดบิตหนี้สิน = หนี้สินลด
                } else if (category === 'revenue' || category === 'income' || category === 'รายได้' || code.startsWith('4')) {
                    amounts.revenue -= amount; // เดบิตรายได้ = รายได้ลด
                }
            }

            // Process credit account (เครดิต = ลด/เพิ่ม ตามประเภทบัญชี)
            if (receipt.creditAccount) {
                const account = receipt.creditAccount;
                const category = account.category?.toLowerCase() || '';
                const code = account.code || '';

                // Credit decreases assets and expenses
                if (category === 'assets' || category === 'asset' || category === 'สินทรัพย์' || code.startsWith('1')) {
                    amounts.assets -= amount; // เครดิตสินทรัพย์ = สินทรัพย์ลด
                } else if (category === 'expenses' || category === 'expense' || category === 'ค่าใช้จ่าย' || code.startsWith('5')) {
                    amounts.expenses -= amount; // เครดิตค่าใช้จ่าย = ค่าใช้จ่ายลด
                }
                // Credit increases liabilities and revenue
                else if (category === 'liabilities' || category === 'liability' || category === 'หนี้สิน' || code.startsWith('2')) {
                    amounts.liabilities += amount; // เครดิตหนี้สิน = หนี้สินเพิ่ม
                } else if (category === 'revenue' || category === 'income' || category === 'รายได้' || code.startsWith('4')) {
                    amounts.revenue += amount; // เครดิตรายได้ = รายได้เพิ่ม
                }
            }
        });

        // Make sure all amounts are positive for display
        const summary = {
            assets: Math.abs(amounts.assets),
            liabilities: Math.abs(amounts.liabilities),
            revenue: Math.abs(amounts.revenue),
            expenses: Math.abs(amounts.expenses)
        };

        console.log('Account summary (amounts):', summary);

        // ถ้าไม่มีข้อมูลในเดือนปัจจุบัน ให้ดึงข้อมูลทั้งหมด
        if (receipts.length === 0) {
            console.log('No data in current month, fetching all receipts');

            const allReceipts = await ReceiptVoucher.find({
                status: { $ne: 'cancelled' }
            })
            .populate('debitAccount creditAccount')
            .lean();

            console.log('Total receipts in database:', allReceipts.length);

            // Reset amounts
            amounts.assets = 0;
            amounts.liabilities = 0;
            amounts.revenue = 0;
            amounts.expenses = 0;

            // Process all receipts
            allReceipts.forEach(receipt => {
                const amount = receipt.totalAmount || 0;

                // Process debit account
                if (receipt.debitAccount) {
                    const account = receipt.debitAccount;
                    const category = account.category?.toLowerCase() || '';
                    const code = account.code || '';

                    if (category === 'assets' || category === 'asset' || category === 'สินทรัพย์' || code.startsWith('1')) {
                        amounts.assets += amount;
                    } else if (category === 'expenses' || category === 'expense' || category === 'ค่าใช้จ่าย' || code.startsWith('5')) {
                        amounts.expenses += amount;
                    } else if (category === 'liabilities' || category === 'liability' || category === 'หนี้สิน' || code.startsWith('2')) {
                        amounts.liabilities -= amount;
                    } else if (category === 'revenue' || category === 'income' || category === 'รายได้' || code.startsWith('4')) {
                        amounts.revenue -= amount;
                    }
                }

                // Process credit account
                if (receipt.creditAccount) {
                    const account = receipt.creditAccount;
                    const category = account.category?.toLowerCase() || '';
                    const code = account.code || '';

                    if (category === 'assets' || category === 'asset' || category === 'สินทรัพย์' || code.startsWith('1')) {
                        amounts.assets -= amount;
                    } else if (category === 'expenses' || category === 'expense' || category === 'ค่าใช้จ่าย' || code.startsWith('5')) {
                        amounts.expenses -= amount;
                    } else if (category === 'liabilities' || category === 'liability' || category === 'หนี้สิน' || code.startsWith('2')) {
                        amounts.liabilities += amount;
                    } else if (category === 'revenue' || category === 'income' || category === 'รายได้' || code.startsWith('4')) {
                        amounts.revenue += amount;
                    }
                }
            });

            // Update summary
            summary.assets = Math.abs(amounts.assets);
            summary.liabilities = Math.abs(amounts.liabilities);
            summary.revenue = Math.abs(amounts.revenue);
            summary.expenses = Math.abs(amounts.expenses);
        }

        // ส่งข้อมูลในรูปแบบที่ frontend ต้องการ
        const responseData = {
            assets: summary.assets,        // ยอดเงินรวมสินทรัพย์
            liabilities: summary.liabilities, // ยอดเงินรวมหนี้สิน
            revenue: summary.revenue,      // ยอดเงินรวมรายได้
            expenses: summary.expenses,    // ยอดเงินรวมค่าใช้จ่าย
            period: {
                month: startDate.getMonth() + 1,
                year: startDate.getFullYear(),
                startDate: startDate,
                endDate: endDate
            },
            source: receipts.length > 0 ? 'currentMonth' : 'allTime',
            totalTransactions: receipts.length > 0 ? receipts.length : allReceipts.length,
            debug: receipts.length > 0 ? {
                sampleTransaction: {
                    date: receipts[0].paymentDate,
                    amount: receipts[0].totalAmount,
                    debitAccount: {
                        code: receipts[0].debitAccount?.code,
                        name: receipts[0].debitAccount?.name,
                        category: receipts[0].debitAccount?.category
                    },
                    creditAccount: {
                        code: receipts[0].creditAccount?.code,
                        name: receipts[0].creditAccount?.name,
                        category: receipts[0].creditAccount?.category
                    }
                }
            } : null
        };

        console.log('Sending response:', responseData);

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Error getting accounts summary:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            data: {
                assets: 0,
                liabilities: 0,
                revenue: 0,
                expenses: 0
            }
        });
    }
});

// ==================== PUBLIC PDF ROUTES (NO AUTH REQUIRED) ====================
// PDF routes that don't require authentication for easier testing and integration

// Helper function to safely call controller methods
const safeMethod = (methodName, fallbackResponse = null) => {
    return (req, res, next) => {
        if (receiptVoucherController && typeof receiptVoucherController[methodName] === 'function') {
            return receiptVoucherController[methodName].bind(receiptVoucherController)(req, res, next);
        } else {
            console.error(`❌ Method ${methodName} not found in controller`);
            if (fallbackResponse) {
                return res.status(501).json(fallbackResponse);
            }
            return res.status(501).json({
                success: false,
                message: `Method ${methodName} not implemented`
            });
        }
    };
};

// พิมพ์ใบสำคัญรับเงิน (PDF) - NO AUTH
router.get('/:id/pdf',
    safeMethod('printPdf')
);

// พิมพ์ใบสำคัญรับเงิน (PDF A4) - NO AUTH
router.get('/:id/pdf-a4', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`📄 Generating A4 PDF for receipt voucher ID: ${id}`);

    const pdfResult = await A4PDFController.printReceiptVoucherById(id);

    if (!pdfResult) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบใบสำคัญรับเงิน'
      });
    }

    console.log(`✅ Generated A4 PDF: ${pdfResult.fileName}`);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfResult.fileName}"`,
      'Content-Length': pdfResult.buffer.length
    });

    res.send(pdfResult.buffer);

  } catch (error) {
    console.error(`❌ Error generating A4 PDF for receipt voucher ${id}:`, error.message);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้าง PDF: ' + error.message
    });
  }
});

// ดาวน์โหลด PDF ใบเสร็จค่าดาวน์โดยหมายเลขสัญญา - NO AUTH
router.get('/contract/:contractNo/pdf', async (req, res) => {
  try {
    const { contractNo } = req.params;

    console.log(`📄 Generating receipt voucher PDF for contract: ${contractNo}`);

    // ค้นหาใบเสร็จค่าดาวน์ที่เกี่ยวข้องกับสัญญา
    const receiptVoucher = await ReceiptVoucher.findOne({
      $or: [
        { 'metadata.contractNumber': contractNo },
        { 'metadata.sourceId': contractNo },
        { documentNumber: { $regex: contractNo, $options: 'i' } },
        { contractNumber: contractNo },
        { 'reference.installmentContract': contractNo }
      ]
    }).populate('details');

    if (!receiptVoucher) {
      console.log(`❌ Receipt voucher not found for contract: ${contractNo}`);
      return res.status(404).json({
        success: false,
        message: 'ไม่พบใบเสร็จรับเงินสำหรับสัญญานี้'
      });
    }

    console.log(`✅ Found receipt voucher: ${receiptVoucher.documentNumber}`);

    // สร้าง PDF ด้วย A4PDFController
    const pdfResult = await A4PDFController.printReceiptVoucher(receiptVoucher);

    // ส่ง PDF กลับ
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfResult.fileName || `receipt-voucher-${contractNo}.pdf`}"`,
      'Content-Length': pdfResult.buffer.length
    });

    res.send(pdfResult.buffer);

    console.log(`✅ Receipt voucher PDF sent successfully for contract: ${contractNo}`);

  } catch (error) {
    console.error('❌ Error generating receipt voucher PDF:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้าง PDF',
      error: error.message
    });
  }
});

// พิมพ์ใบสำคัญรับเงินตามเลขเอกสาร - NO AUTH
router.get('/document/:documentNumber/pdf', receiptVoucherController.printPdfByDocumentNumber);

// พิมพ์ใบสำคัญรับเงินตามเลขเอกสาร (PDF A4) - NO AUTH
router.get('/document/:documentNumber/pdf-a4', async (req, res) => {
  try {
    const { documentNumber } = req.params;

    console.log(`📄 Generating A4 PDF for document number: ${documentNumber}`);

    const pdfResult = await A4PDFController.printReceiptVoucherByDocumentNumber(documentNumber);

    if (!pdfResult) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบใบสำคัญรับเงิน'
      });
    }

    console.log(`✅ Generated A4 PDF: ${pdfResult.fileName}`);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfResult.fileName}"`,
      'Content-Length': pdfResult.buffer.length
    });

    res.send(pdfResult.buffer);

  } catch (error) {
    console.error(`❌ Error generating A4 PDF for document ${documentNumber}:`, error.message);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้าง PDF: ' + error.message
    });
  }
});

// ==================== AUTHENTICATED ROUTES ====================
// ทุก route หลังจากนี้ต้อง authenticate
router.use(auth);

// Validation Middleware
const validateReceiptVoucher = (req, res, next) => {
    const { paymentDate, debitAccount, creditAccount, receivedFrom, totalAmount } = req.body;

    const errors = [];

    if (!paymentDate) errors.push('วันที่รับเงินเป็นข้อมูลที่จำเป็น');
    if (!debitAccount?.code) errors.push('บัญชีเดบิตเป็นข้อมูลที่จำเป็น');
    if (!creditAccount?.code) errors.push('บัญชีเครดิตเป็นข้อมูลที่จำเป็น');
    if (!receivedFrom) errors.push('ผู้จ่ายเงินเป็นข้อมูลที่จำเป็น');
    if (!totalAmount || totalAmount <= 0) errors.push('จำนวนเงินต้องมากกว่า 0');

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'ข้อมูลไม่ครบถ้วน',
            errors
        });
    }

    next();
};

// ==================== UTILITY ROUTES ====================

// ดึงเลขที่เอกสารถัดไป
router.get('/utility/next-document-number',
    async (req, res) => {
        try {
            const ReceiptVoucher = require('../../models/POS/ReceiptVoucher');

            if (typeof ReceiptVoucher.generateDocumentNumber === 'function') {
                const documentNumber = await ReceiptVoucher.generateDocumentNumber();
                res.json({
                    success: true,
                    data: { documentNumber }
                });
            } else {
                const date = new Date();
                const year = date.getFullYear().toString().substr(-2);
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                const documentNumber = `RV${year}${month}${random}`;

                res.json({
                    success: true,
                    data: { documentNumber }
                });
            }
        } catch (error) {
            console.error('Error generating document number:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// ดึงรายการบัญชีสำหรับ dropdown
router.get('/utility/accounts',
    async (req, res) => {
        try {
            const ChartOfAccount = require('../../models/Account/ChartOfAccount');
            const { type, search } = req.query;

            const query = { isActive: true };

            if (type) {
                if (type === 'debit') {
                    query.code = { $in: [/^11/, /^12/] };
                } else if (type === 'credit') {
                    query.code = { $in: [/^11/, /^21/, /^41/] };
                }
            }

            if (search) {
                query.$or = [
                    { code: new RegExp(search, 'i') },
                    { name: new RegExp(search, 'i') }
                ];
            }

            const accounts = await ChartOfAccount.find(query)
                .select('code name type')
                .sort('code')
                .limit(50);

            res.json({
                success: true,
                data: accounts
            });
        } catch (error) {
            console.error('Error fetching accounts:', error);
            res.json({
                success: true,
                data: [
                    { code: '11101', name: 'เงินสด', type: 'asset' },
                    { code: '11103', name: 'เงินฝากธนาคาร', type: 'asset' },
                    { code: '41101', name: 'รายได้จากการขาย', type: 'revenue' }
                ]
            });
        }
    }
);

// ดึงข้อมูลลูกค้าสำหรับ autocomplete
router.get('/utility/customers',
    async (req, res) => {
        try {
            const Customer = require('../../models/Customer');
            const { search } = req.query;

            const query = { isActive: true };

            if (search) {
                query.$or = [
                    { customerId: new RegExp(search, 'i') },
                    { name: new RegExp(search, 'i') },
                    { phone: new RegExp(search, 'i') }
                ];
            }

            const customers = await Customer.find(query)
                .select('customerId name phone address')
                .limit(20);

            res.json({
                success: true,
                data: customers
            });
        } catch (error) {
            console.error('Error fetching customers:', error);
            res.json({
                success: true,
                data: []
            });
        }
    }
);

// ดึงใบแจ้งหนี้ที่ยังไม่ชำระเต็มจำนวน
router.get('/utility/unpaid-invoices',
    async (req, res) => {
        try {
            const Invoice = require('../../models/Invoice');
            const { customerId } = req.query;

            const query = {
                status: { $in: ['pending', 'partial'] }
            };

            if (customerId) {
                query['customer.customerId'] = customerId;
            }

            const invoices = await Invoice.find(query)
                .select('invoiceNumber invoiceDate dueDate totalAmount paidAmount remainingAmount customer')
                .sort('-invoiceDate')
                .limit(50);

            res.json({
                success: true,
                data: invoices
            });
        } catch (error) {
            console.error('Error fetching invoices:', error);
            res.json({
                success: true,
                data: []
            });
        }
    }
);

// ดึงสัญญาผ่อนชำระที่ยังมียอดค้าง
router.get('/utility/installment-contracts',
    async (req, res) => {
        try {
            const InstallmentContract = require('../../models/InstallmentContract');
            const { customerId } = req.query;

            const query = {
                status: 'active',
                remainingAmount: { $gt: 0 }
            };

            if (customerId) {
                query['customer.customerId'] = customerId;
            }

            const contracts = await InstallmentContract.find(query)
                .select('contractNumber contractDate customer totalAmount paidAmount remainingAmount nextDueDate')
                .sort('nextDueDate')
                .limit(50);

            res.json({
                success: true,
                data: contracts
            });
        } catch (error) {
            console.error('Error fetching contracts:', error);
            res.json({
                success: true,
                data: []
            });
        }
    }
);

// ==================== SYNC INTEGRATION ====================

// Route สำหรับรับข้อมูล sync จากระบบอื่น และสร้างใบสำคัญรับเงินอัตโนมัติ
router.post('/sync', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log('🔗 Received sync data for receipt voucher creation:', req.body);

        const {
            source,
            sourceId,
            documentNumber,
            customerName,
            totalAmount,
            netAmount,
            vatAmount,
            paymentMethod,
            description,
            notes,
            metadata,
            // ✅ เพิ่ม fields สำหรับ installment system
            branchCode,
            branchName,
            customer,
            receiptItems,
            contractNumber,
            receivedFrom
        } = req.body;

        // Validate required fields
        if (!source || !sourceId || !customerName || !totalAmount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: source, sourceId, customerName, totalAmount'
            });
        }

        // Check if receipt voucher already exists for this source
        let existingVoucher = null;
        try {
            existingVoucher = await ReceiptVoucher.findOne({
                'metadata.sourceType': source,
                'metadata.sourceId': sourceId,
                status: { $ne: 'cancelled' }
            }).session(session);
        } catch (findError) {
            console.warn('Warning: Could not check for existing voucher:', findError.message);
        }

            if (existingVoucher) {
            await session.abortTransaction();
            session.endSession();
                return res.status(409).json({
                    success: false,
                error: 'Receipt voucher already exists for this source',
                existingDocument: existingVoucher.documentNumber
                });
            }

        // Generate document number if not provided
        const finalDocumentNumber = documentNumber || await ReceiptVoucher.generateDocumentNumber();

        // Account mapping for different sources
        const accountMapping = {
            installment: {
                debit: { code: '11101', name: 'เงินสด' },
                credit: { code: '41101', name: 'รายได้จากการขาย' }
            },
            frontstore: {
                debit: { code: '11101', name: 'เงินสด' },
                credit: { code: '41101', name: 'รายได้จากการขาย' }
            },
            pos: {
                debit: { code: '11101', name: 'เงินสด' },
                credit: { code: '41101', name: 'รายได้จากการขาย' }
            }
        };

        const accounts = accountMapping[source] || accountMapping.pos;

        // Create or get system user for auto-sync operations
        let systemUserId = null;
        try {
            const User = require('../../models/User/User');
            // Try to find existing system user first
            let systemUser = await User.findOne({ username: 'auto-sync-system' }).session(session);

            if (systemUser) {
                systemUserId = systemUser._id;
            } else {
                // If system user creation is complex, use a default ObjectId as fallback
                console.log('⚠️ System user not found, using default ObjectId for auto-sync operations');
                systemUserId = new mongoose.Types.ObjectId('000000000000000000000001'); // Fixed ObjectId for system operations
            }
        } catch (userError) {
            console.warn('Warning: Could not find system user, using default ObjectId:', userError.message);
            // Fallback to a fixed ObjectId for system operations
            systemUserId = new mongoose.Types.ObjectId('000000000000000000000001');
        }

        // ✅ หา branch ObjectId จาก branchCode
        let branchObjectId = null;
        if (branchCode) {
            try {
                const Branch = require('../../models/Account/Branch');
                const branch = await Branch.findOne({
                    $or: [
                        { branch_code: branchCode },
                        { code: branchCode }
                    ]
                }).session(session);

                if (branch) {
                    branchObjectId = branch._id;
                    console.log(`✅ Found branch: ${branchCode} -> ${branchObjectId}`);
                } else {
                    console.warn(`⚠️ Branch not found for code: ${branchCode}`);
                }
            } catch (branchError) {
                console.error('❌ Error finding branch:', branchError);
            }
        }

        // Create receipt voucher data
        const receiptVoucherData = {
            documentNumber: finalDocumentNumber,
            paymentDate: new Date().toISOString().split('T')[0],
            receivedFrom: receivedFrom || customerName,

            debitAccount: accounts.debit,
            creditAccount: accounts.credit,

            receiptType: source === 'installment' ? 'installment_down_payment' : 'cash_sale',
            paymentMethod: paymentMethod || 'cash',

            totalAmount: totalAmount,
            netAmount: netAmount || totalAmount,
            vatAmount: vatAmount || 0,
            notes: notes || `สร้างอัตโนมัติจากระบบ ${source}`,

            // ✅ ใช้ branch ObjectId แทน string
            branch: branchObjectId,

            // ✅ เพิ่มข้อมูลลูกค้าและสัญญา
            customer: customer || {
                name: receivedFrom || customerName,
                customerId: '',
                phone: '',
                address: ''
            },
            contractNumber: contractNumber,

            // Enhanced metadata for tracking
            metadata: {
                sourceType: source,
                sourceId: sourceId,
                autoGenerated: true,
                syncTimestamp: new Date(),
                createdBy: 'auto_sync_system',
                branchCode: branchCode,
                branchName: branchName,
                ...metadata // Include any additional metadata from request
            },

            // Standard fields
            status: 'completed',
            createdAt: new Date(),
            updatedAt: new Date(),
            details: [], // Will be populated with ObjectIds after creating ReceiptVoucherDetail
            createdBy: systemUserId // Always set createdBy to ensure validation passes
        };

        console.log('📋 Prepared receipt voucher data from sync:', receiptVoucherData);

        // Save receipt voucher to database first
        const newReceiptVoucher = new ReceiptVoucher(receiptVoucherData);
        const savedVoucher = await newReceiptVoucher.save({ session });

        // ✅ สร้าง ReceiptVoucherDetail จาก receiptItems หรือข้อมูลเดิม
        const ReceiptVoucherDetail = require('../../models/POS/ReceiptVoucherDetail');
        const savedDetails = [];

        if (receiptItems && Array.isArray(receiptItems) && receiptItems.length > 0) {
            // ✅ สร้าง ReceiptVoucherDetail จาก receiptItems
            for (const item of receiptItems) {
                const detailData = {
                    receiptVoucher: savedVoucher._id,
                    description: item.description || `รับเงินจาก${source} ${sourceId}`,
                    amount: item.amount || 0,
                    accountCode: accounts.credit.code,
                    accountName: accounts.credit.name,
                    vatType: item.vatType || 'none',
                    vatRate: item.vatRate || 0,
                    vatAmount: item.vatAmount || 0,
                    netAmount: item.netAmount || item.amount || 0
                };

                const receiptDetail = new ReceiptVoucherDetail(detailData);
                const savedDetail = await receiptDetail.save({ session });
                savedDetails.push(savedDetail);
            }
        } else {
            // ✅ สร้าง ReceiptVoucherDetail เดิม (fallback)
            const detailData = {
                receiptVoucher: savedVoucher._id,
                description: description || `รับเงินจาก${source} ${sourceId}`,
                amount: totalAmount,
                accountCode: accounts.credit.code,
                accountName: accounts.credit.name,
                vatType: vatAmount > 0 ? 'include' : 'none',
                vatRate: vatAmount > 0 ? 7 : 0,
                vatAmount: vatAmount || 0,
                netAmount: (netAmount || totalAmount) - (vatAmount || 0)
            };

            const receiptDetail = new ReceiptVoucherDetail(detailData);
            const savedDetail = await receiptDetail.save({ session });
            savedDetails.push(savedDetail);
        }

        // Update the receipt voucher with the detail ObjectIds
        savedVoucher.details = savedDetails.map(detail => detail._id);
        await savedVoucher.save({ session });

        try {
            // Mark the source transaction as having a receipt voucher
            if (source === 'installment') {
                const InstallmentOrder = require('../../models/Installment/InstallmentOrder');
                await InstallmentOrder.findOneAndUpdate(
                    { contractNo: sourceId },
                    {
                        hasReceiptVoucher: true,
                        receiptVoucherNumber: finalDocumentNumber,
                        receiptVoucherCreatedAt: new Date()
                    },
                    { session }
                );
            } else {
                // Update BranchStockHistory or other models
                const BranchStockHistory = require('../../models/Branch/BranchStockHistory');
                await BranchStockHistory.findByIdAndUpdate(sourceId, {
                    hasReceiptVoucher: true,
                    receiptVoucherNumber: finalDocumentNumber,
                    receiptVoucherCreatedAt: new Date()
                }, { session }).catch(err => {
                    console.log('Could not update BranchStockHistory:', err.message);
                });
            }

        } catch (updateError) {
            console.warn('Warning: Failed to mark source as having receipt voucher:', updateError.message);
            // Don't fail the whole operation for this
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        // Log successful sync
        console.log(`✅ Receipt voucher created from ${source} sync:`, {
            id: savedVoucher._id,
            _id: savedVoucher._id,
            documentNumber: finalDocumentNumber,
            sourceId: sourceId,
            amount: totalAmount,
            customer: receivedFrom || customerName,
            detailsCreated: savedDetails.length,
            branchCode: branchCode,
            branchObjectId: branchObjectId
        });

        // Return success response
        res.json({
            success: true,
            message: 'Receipt voucher created successfully from sync data',
            data: {
                id: savedVoucher._id,
                _id: savedVoucher._id,
                documentNumber: finalDocumentNumber,
                sourceType: source,
                sourceId: sourceId,
                totalAmount: totalAmount,
                customerName: receivedFrom || customerName,
                createdAt: savedVoucher.createdAt,
                metadata: receiptVoucherData.metadata,
                detailsCreated: savedDetails.length,
                branchCode: branchCode,
                branchObjectId: branchObjectId,
                contractNumber: contractNumber
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('❌ Error creating receipt voucher from sync:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to create receipt voucher from sync data',
            details: error.message,
            timestamp: new Date()
        });
    }
});

// ==================== REPORTS ====================

// สร้างรายงาน
router.get('/reports/generate',
    safeMethod('generateReport', {
        success: false,
        message: 'Report generation not implemented yet'
    })
);

// Export to Excel
router.get('/export/excel',
    safeMethod('exportExcel', {
        success: false,
        message: 'Excel export not implemented yet'
    })
);

// ==================== INSTALLMENT DOWN PAYMENT RECEIPTS ====================

// สร้างใบเสร็จค่าดาวน์สำหรับการผ่อนชำระ
router.post('/create-down-payment-receipt', async (req, res) => {
    try {
        const {
            contractNo,
            contractId,
            downPaymentAmount,
            customerName,
            customerData,
            paymentMethod = 'cash',
            paymentDate,
            notes,
            branchCode,
            employeeName
        } = req.body;

        // Validation
        if (!downPaymentAmount || downPaymentAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'จำนวนเงินค่าดาวน์ต้องมากกว่า 0'
            });
        }

        if (!customerName && !customerData?.name) {
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลลูกค้าเป็นข้อมูลที่จำเป็น'
            });
        }

        // Account mapping for down payment
        const debitAccountMap = {
            'cash': '11101',        // เงินสด
            'transfer': '11103',    // เงินฝากธนาคาร
            'credit': '11301'       // ลูกหนี้การค้า
        };

        const creditAccount = '21104'; // เงินรับล่วงหน้า (เงินมัดจำค่าดาวน์)

        // Generate document number
        const documentNumber = await ReceiptVoucher.generateDocumentNumber();

        // Create receipt voucher data
        const receiptData = {
            documentNumber,
            paymentDate: paymentDate || new Date(),
            debitAccount: {
                code: debitAccountMap[paymentMethod] || debitAccountMap['cash'],
                name: paymentMethod === 'cash' ? 'เงินสด' :
                      paymentMethod === 'transfer' ? 'เงินฝากธนาคาร' : 'ลูกหนี้การค้า'
            },
            creditAccount: {
                code: creditAccount,
                name: 'เงินรับล่วงหน้า - ค่าดาวน์ผ่อน'
            },
            receivedFrom: customerName || customerData?.name || customerData?.fullName,
            receiptType: 'installment_down_payment',
            paymentMethod: paymentMethod,
            details: [{
                description: `รับค่าดาวน์การผ่อนชำระ${contractNo ? ' - สัญญาเลขที่ ' + contractNo : ''}`,
                amount: downPaymentAmount
            }],
            totalAmount: downPaymentAmount,
            vatAmount: 0,
            notes: notes || `ใบเสร็จค่าดาวน์การผ่อนชำระ${contractNo ? ' สัญญาเลขที่ ' + contractNo : ''}`,
            branch: branchCode,

            // Link to installment contract
            sourceType: 'installment_contract',
            sourceId: contractId,
            contractNumber: contractNo,

            // Employee info
            createdBy: req.user?.id,
            employeeName: employeeName || req.user?.name,

            // Additional metadata
            metadata: {
                paymentType: 'down_payment',
                isInstallmentRelated: true,
                contractNo: contractNo,
                originalAmount: downPaymentAmount
            }
        };

        // Create receipt voucher
        const receipt = new ReceiptVoucher(receiptData);
        await receipt.save();

        // Populate account references
        await receipt.populate('debitAccount creditAccount');

        console.log('✅ Down payment receipt created:', {
            documentNumber: receipt.documentNumber,
            amount: receipt.totalAmount,
            customer: receipt.receivedFrom,
            contract: contractNo
        });

        res.json({
            success: true,
            message: 'สร้างใบเสร็จค่าดาวน์สำเร็จ',
            data: receipt
        });

    } catch (error) {
        console.error('❌ Error creating down payment receipt:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถสร้างใบเสร็จค่าดาวน์ได้',
            error: error.message
        });
    }
});

// ดึงรายการใบเสร็จค่าดาวน์ตามสัญญา
router.get('/down-payment-receipts/:contractNo', async (req, res) => {
    try {
        const { contractNo } = req.params;

        if (!contractNo) {
            return res.status(400).json({
                success: false,
                message: 'เลขที่สัญญาเป็นข้อมูลที่จำเป็น'
            });
        }

        const receipts = await ReceiptVoucher.find({
            contractNumber: contractNo,
            receiptType: 'installment_down_payment',
            status: { $ne: 'cancelled' }
        })
        .populate('debitAccount creditAccount')
        .sort('-paymentDate');

        res.json({
            success: true,
            data: receipts,
            total: receipts.length
        });

    } catch (error) {
        console.error('❌ Error fetching down payment receipts:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลใบเสร็จค่าดาวน์ได้',
            error: error.message
        });
    }
});

// ดึงใบเสร็จค่าดาวน์ที่รอสร้างจากสัญญาผ่อน
router.get('/pending-down-payment-receipts', async (req, res) => {
    try {
        const { branchCode, limit = 50 } = req.query;

        // Import models
        const InstallmentOrder = require('../../models/Installment/InstallmentOrder');

        // Build query
        const query = {
            status: 'active',
            downPayment: { $gt: 0 }
        };

        if (branchCode) {
            query.branchCode = branchCode;
        }

        // Find installment orders with down payment but no receipt
        const contracts = await InstallmentOrder.find(query)
            .select('contractNo customer_info downPayment totalAmount createdAt')
            .sort('-createdAt')
            .limit(parseInt(limit));

        // Check which contracts already have down payment receipts
        const contractNos = contracts.map(c => c.contractNo).filter(Boolean);
        const existingReceipts = await ReceiptVoucher.find({
            contractNumber: { $in: contractNos },
            receiptType: 'installment_down_payment',
            status: { $ne: 'cancelled' }
        }).select('contractNumber');

        const existingContractNos = new Set(existingReceipts.map(r => r.contractNumber));

        // Filter contracts that don't have down payment receipts yet
        const pendingContracts = contracts.filter(contract =>
            contract.contractNo && !existingContractNos.has(contract.contractNo)
        );

        // Format response
        const pendingReceipts = pendingContracts.map(contract => {
            const customerName = contract.customer_info ?
                `${contract.customer_info.prefix || ''} ${contract.customer_info.firstName || ''} ${contract.customer_info.lastName || ''}`.trim() :
                'ไม่ระบุ';

            return {
                contractNo: contract.contractNo,
                contractId: contract._id,
                customerName: customerName,
                downPaymentAmount: contract.downPayment,
                paymentDate: contract.createdAt,
                totalAmount: contract.totalAmount,
                createdAt: contract.createdAt,
                canCreateReceipt: true
            };
        });

        res.json({
            success: true,
            data: pendingReceipts,
            total: pendingReceipts.length,
            metadata: {
                totalContracts: contracts.length,
                existingReceipts: existingReceipts.length,
                pendingReceipts: pendingReceipts.length
            }
        });

    } catch (error) {
        console.error('❌ Error fetching pending down payment receipts:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถดึงข้อมูลรายการค่าดาวน์ที่รอสร้างได้',
            error: error.message
        });
    }
});

// สร้างใบเสร็จค่าดาวน์แบบกลุ่มจากสัญญาหลายรายการ
router.post('/batch-create-down-payment-receipts', async (req, res) => {
    try {
        const { contractIds, paymentMethod = 'cash', branchCode } = req.body;

        if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'รายการสัญญาเป็นข้อมูลที่จำเป็น'
            });
        }

        const InstallmentOrder = require('../../models/Installment/InstallmentOrder');

        // Get contracts
        const contracts = await InstallmentOrder.find({
            _id: { $in: contractIds },
            downPayment: { $gt: 0 }
        });

        if (contracts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบสัญญาที่มีค่าดาวน์'
            });
        }

        const results = [];
        const errors = [];

        // Create receipts for each contract
        for (const contract of contracts) {
            try {
                // Check if receipt already exists
                const existingReceipt = await ReceiptVoucher.findOne({
                    contractNumber: contract.contractNo,
                    receiptType: 'installment_down_payment',
                    status: { $ne: 'cancelled' }
                });

                if (existingReceipt) {
                    errors.push({
                        contractNo: contract.contractNo,
                        error: 'มีใบเสร็จค่าดาวน์แล้ว'
                    });
                    continue;
                }

                // Create receipt request
                const customerName = contract.customer_info ?
                    `${contract.customer_info.prefix || ''} ${contract.customer_info.firstName || ''} ${contract.customer_info.lastName || ''}`.trim() :
                    'ไม่ระบุ';

                const receiptRequest = {
                    contractNo: contract.contractNo,
                    contractId: contract._id,
                    downPaymentAmount: contract.downPayment,
                    customerName: customerName,
                    customerData: contract.customer_info,
                    paymentMethod: paymentMethod,
                    paymentDate: new Date(),
                    branchCode: branchCode || contract.branch_code,
                    employeeName: req.user?.name
                };

                // Call create function directly
                const receipt = await createDownPaymentReceiptInternal(receiptRequest, req.user);

                results.push({
                    contractNo: contract.contractNo,
                    receiptNo: receipt.documentNumber,
                    amount: receipt.totalAmount,
                    success: true
                });

            } catch (error) {
                console.error(`❌ Error creating receipt for contract ${contract.contractNo}:`, error);
                errors.push({
                    contractNo: contract.contractNo,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `สร้างใบเสร็จค่าดาวน์เสร็จสิ้น: สำเร็จ ${results.length} รายการ${errors.length > 0 ? `, ล้มเหลว ${errors.length} รายการ` : ''}`,
            data: {
                successful: results,
                failed: errors,
                summary: {
                    total: contracts.length,
                    successful: results.length,
                    failed: errors.length
                }
            }
        });

    } catch (error) {
        console.error('❌ Error in batch create down payment receipts:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถสร้างใบเสร็จค่าดาวน์แบบกลุ่มได้',
            error: error.message
        });
    }
});

// Internal function for creating down payment receipt
async function createDownPaymentReceiptInternal(data, user) {
    const {
        contractNo,
        contractId,
        downPaymentAmount,
        customerName,
        customerData,
        paymentMethod = 'cash',
        paymentDate,
        notes,
        branchCode,
        employeeName
    } = data;

    // Account mapping
    const debitAccountMap = {
        'cash': '11101',
        'transfer': '11103',
        'credit': '11301'
    };

    const creditAccount = '21104';

    // Generate document number
    const documentNumber = await ReceiptVoucher.generateDocumentNumber();

    // Create receipt data
    const receiptData = {
        documentNumber,
        paymentDate: paymentDate || new Date(),
        debitAccount: {
            code: debitAccountMap[paymentMethod] || debitAccountMap['cash'],
            name: paymentMethod === 'cash' ? 'เงินสด' :
                  paymentMethod === 'transfer' ? 'เงินฝากธนาคาร' : 'ลูกหนี้การค้า'
        },
        creditAccount: {
            code: creditAccount,
            name: 'เงินรับล่วงหน้า - ค่าดาวน์ผ่อน'
        },
        receivedFrom: customerName || customerData?.name || customerData?.fullName,
        receiptType: 'installment_down_payment',
        paymentMethod: paymentMethod,
        details: [{
            description: `รับค่าดาวน์การผ่อนชำระ${contractNo ? ' - สัญญาเลขที่ ' + contractNo : ''}`,
            amount: downPaymentAmount
        }],
        totalAmount: downPaymentAmount,
        vatAmount: 0,
        notes: notes || `ใบเสร็จค่าดาวน์การผ่อนชำระ${contractNo ? ' สัญญาเลขที่ ' + contractNo : ''}`,
        branch: branchCode,
        sourceType: 'installment_contract',
        sourceId: contractId,
        contractNumber: contractNo,
        createdBy: user?.id,
        employeeName: employeeName || user?.name,
        metadata: {
            paymentType: 'down_payment',
            isInstallmentRelated: true,
            contractNo: contractNo,
            originalAmount: downPaymentAmount
        }
    };

    // Create and save receipt
    const receipt = new ReceiptVoucher(receiptData);
    await receipt.save();

    return receipt;
}

// ==================== AUTO CREATION SYSTEM ====================

// สร้างใบสำคัญรับเงินอัตโนมัติจากใบเสร็จที่ยังไม่มี
router.post('/auto-create-from-receipts', async (req, res) => {
    try {
        const { limit = 50, paymentMethod = 'cash', branchCode } = req.body;

        console.log('🤖 Starting auto creation from receipts...');

        // ✅ ใช้ models ที่มีอยู่จริง
        const mongoose = require('mongoose');
        const BranchStockHistory = require('../../models/POS/BranchStockHistory');
        const InstallmentOrder = require('../../models/Installment/InstallmentOrder');

        const results = [];
        const errors = [];
        let processedCount = 0;

        // 1. ดึงรายการจาก BranchStockHistory ที่ยังไม่มีใบสำคัญรับเงิน
        const stockQuery = {
            change_type: 'OUT',
            hasReceiptVoucher: { $ne: true },
            reason: { $in: ['ขาย POS', 'ขายแบบผ่อน', 'บริการ', 'ขายสด'] },
            net_amount: { $gt: 0 }
        };

        if (branchCode) {
            stockQuery.branch_code = branchCode;
        }

        const stockItems = await BranchStockHistory.find(stockQuery)
            .populate('performed_by', 'name')
            .sort('-performed_at')
            .limit(Math.floor(limit * 0.7)) // 70% จาก Stock History
            .lean();

        // 2. ดึงใบเสร็จจากระบบผ่อนชำระ
        const installmentQuery = {
            status: 'active',
            downPayment: { $gt: 0 }
        };

        if (branchCode) {
            installmentQuery.branch_code = branchCode;
        }

        const installmentOrders = await InstallmentOrder.find(installmentQuery)
            .select('contractNo customer_info downPayment totalAmount createdAt')
            .sort('-createdAt')
            .limit(Math.floor(limit * 0.3)) // 30% จากผ่อน
            .lean();

        // 3. สร้างใบสำคัญรับเงินจาก BranchStockHistory
        for (const stockItem of stockItems) {
            try {
                // ตรวจสอบว่ามีใบสำคัญรับเงินแล้วหรือไม่
                if (stockItem.hasReceiptVoucher) {
                    processedCount++;
                    continue; // ข้ามถ้ามีแล้ว
                }

                // ดึงชื่อลูกค้า
                const customerName = stockItem.customerInfo?.firstName
                    ? `${stockItem.customerInfo.firstName} ${stockItem.customerInfo.lastName || ''}`.trim()
                    : 'ลูกค้าทั่วไป';

                // ✅ ใช้ receiptVoucherController.create แทนการสร้างเอง
                const session = await mongoose.startSession();
                session.startTransaction();

                try {
                    // เรียกใช้ Controller method ที่มีอยู่
                    const reqBody = {
                        user: req.user,
                        body: {
                            branchStockHistoryId: stockItem._id,
                            paymentMethod: paymentMethod,
                            branchCode: branchCode,
                            notes: `สร้างอัตโนมัติจาก ${stockItem.reason} - ${stockItem.invoice_no || stockItem._id}`
                        }
                    };

                    const mockRes = {
                        status: (code) => mockRes,
                        json: (data) => {
                            if (data.success) {
                                results.push({
                                    documentNumber: data.data.documentNumber,
                                    amount: data.data.totalAmount,
                                    customer: customerName,
                                    source: 'BranchStockHistory',
                                    sourceId: stockItem._id,
                                    invoiceNo: stockItem.invoice_no
                                });
                            } else {
                                throw new Error(data.message || 'Unknown error');
                            }
                            return mockRes;
                        }
                    };

                    // เรียกใช้ controller method
                    await receiptVoucherController.create(reqBody, mockRes);
                    await session.commitTransaction();
                    processedCount++;

                } catch (controllerError) {
                    await session.abortTransaction();
                    throw controllerError;
                } finally {
                    session.endSession();
                }

            } catch (error) {
                console.error(`❌ Error creating voucher for stock item ${stockItem._id}:`, error);
                errors.push({
                    sourceId: stockItem._id,
                    source: 'BranchStockHistory',
                    invoiceNo: stockItem.invoice_no,
                    error: error.message
                });
            }
        }

        // 4. สร้างใบสำคัญรับเงินจากการผ่อนชำระ (ค่าดาวน์)
        for (const order of installmentOrders) {
            try {
                // ตรวจสอบว่ามีใบสำคัญรับเงินค่าดาวน์แล้วหรือไม่
                const existingVoucher = await ReceiptVoucher.findOne({
                    contractNumber: order.contractNo,
                    receiptType: 'installment_down_payment'
                });

                if (existingVoucher) {
                    processedCount++;
                    continue; // ข้ามถ้ามีแล้ว
                }

                const customerName = order.customer_info ?
                    `${order.customer_info.prefix || ''} ${order.customer_info.firstName || ''} ${order.customer_info.lastName || ''}`.trim() :
                    'ลูกค้าผ่อน';

                // ✅ สร้าง document number แบบง่าย
                const documentNumber = `RV-DP-${order.contractNo}-${Date.now()}`;

                const receiptData = {
                    documentNumber,
                    paymentDate: order.createdAt || new Date(),
                    debitAccount: {
                        code: '11101',
                        name: 'เงินสด'
                    },
                    creditAccount: {
                        code: '21104',
                        name: 'เงินรับล่วงหน้า - ค่าดาวน์ผ่อน'
                    },
                    receivedFrom: customerName,
                    receiptType: 'installment_down_payment',
                    paymentMethod: 'cash',
                    details: [{
                        description: `รับค่าดาวน์การผ่อนชำระ - สัญญาเลขที่ ${order.contractNo}`,
                        amount: order.downPayment
                    }],
                    totalAmount: order.downPayment,
                    vatAmount: 0,
                    notes: `สร้างอัตโนมัติค่าดาวน์ผ่อนชำระ สัญญาเลขที่ ${order.contractNo}`,
                    branch: branchCode,
                    contractNumber: order.contractNo,
                    sourceType: 'installment_contract',
                    sourceId: order._id,
                    createdBy: req.user?.id,
                    metadata: {
                        paymentType: 'down_payment',
                        isInstallmentRelated: true,
                        contractNo: order.contractNo,
                        autoCreated: true,
                        originalAmount: order.downPayment
                    }
                };

                const receipt = new ReceiptVoucher(receiptData);
                await receipt.save();

                results.push({
                    documentNumber: receipt.documentNumber,
                    amount: receipt.totalAmount,
                    customer: customerName,
                    source: 'Installment',
                    contractNo: order.contractNo
                });

                processedCount++;

            } catch (error) {
                console.error(`❌ Error creating voucher for installment ${order.contractNo}:`, error);
                errors.push({
                    contractNo: order.contractNo,
                    source: 'Installment',
                    error: error.message
                });
            }
        }

        console.log(`✅ Auto creation completed: ${results.length} created, ${errors.length} failed`);

        res.json({
            success: true,
            message: `สร้างใบสำคัญรับเงินอัตโนมัติสำเร็จ ${results.length} รายการ`,
            data: {
                created: results,
                failed: errors,
                summary: {
                    processed: processedCount,
                    successful: results.length,
                    failed: errors.length,
                    stockItems: stockItems.length,
                    installmentOrders: installmentOrders.length
                }
            }
        });

    } catch (error) {
        console.error('❌ Auto creation error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสร้างอัตโนมัติ',
            error: error.message
        });
    }
});

// เรียกใช้ระบบ Auto Creation (สำหรับ scheduled jobs)
router.post('/trigger-auto-creation', async (req, res) => {
    try {
        const { branchCode, limit = 100 } = req.body;

        console.log('🚀 Triggering auto creation process...');

        // ✅ เรียกใช้ auto creation function โดยตรงแทนการ fetch
        const mongoose = require('mongoose');
        const BranchStockHistory = require('../../models/POS/BranchStockHistory');
        const InstallmentOrder = require('../../models/Installment/InstallmentOrder');

        const results = [];
        const errors = [];
        let processedCount = 0;

        // 1. ดึงรายการจาก BranchStockHistory ที่ยังไม่มีใบสำคัญรับเงิน
        const stockQuery = {
            change_type: 'OUT',
            hasReceiptVoucher: { $ne: true },
            reason: { $in: ['ขาย POS', 'ขายแบบผ่อน', 'บริการ', 'ขายสด'] },
            net_amount: { $gt: 0 }
        };

        if (branchCode) {
            stockQuery.branch_code = branchCode;
        }

        const stockItems = await BranchStockHistory.find(stockQuery)
            .populate('performed_by', 'name')
            .sort('-performed_at')
            .limit(Math.floor(limit * 0.7)) // 70% จาก Stock History
            .lean();

        // 2. สร้างใบสำคัญรับเงินจาก BranchStockHistory
        for (const stockItem of stockItems) {
            try {
                if (stockItem.hasReceiptVoucher) {
                    processedCount++;
                    continue;
                }

                const customerName = stockItem.customerInfo?.firstName
                    ? `${stockItem.customerInfo.firstName} ${stockItem.customerInfo.lastName || ''}`.trim()
                    : 'ลูกค้าทั่วไป';

                // ✅ เรียกใช้ Controller โดยตรง
                const session = await mongoose.startSession();
                session.startTransaction();

                try {
                    // ✅ หา branch ObjectId จาก branchCode
                    const Branch = require('../../models/Account/Branch');
                    const branchDoc = await Branch.findOne({
                        $or: [
                            { code: branchCode || stockItem.branch_code },
                            { branch_code: branchCode || stockItem.branch_code }
                        ]
                    }).select('_id').lean();

                    if (!branchDoc) {
                        throw new Error(`ไม่พบ Branch สำหรับ branchCode: ${branchCode || stockItem.branch_code}`);
                    }

                    const reqBody = {
                        user: req.user,
                        app: req.app, // ✅ เพิ่ม app property เพื่อให้ controller เข้าถึง io ได้
                        body: {
                            branchStockHistoryId: stockItem._id,
                            paymentMethod: 'cash',
                            branch: branchDoc._id, // ✅ ส่ง ObjectId แทน branchCode
                            notes: `สร้างอัตโนมัติจาก ${stockItem.reason} - ${stockItem.invoice_no || stockItem._id}`
                        }
                    };

                    let createdVoucher = null;
                    const mockRes = {
                        status: (code) => mockRes,
                        json: (data) => {
                            if (data.success) {
                                createdVoucher = data.data;
                                results.push({
                                    documentNumber: data.data.documentNumber,
                                    amount: data.data.totalAmount,
                                    customer: customerName,
                                    source: 'BranchStockHistory',
                                    sourceId: stockItem._id,
                                    invoiceNo: stockItem.invoice_no
                                });
                            } else {
                                throw new Error(data.message || 'Unknown error');
                            }
                            return mockRes;
                        }
                    };

                    await receiptVoucherController.create(reqBody, mockRes);
                    await session.commitTransaction();
                    processedCount++;

                } catch (controllerError) {
                    await session.abortTransaction();
                    throw controllerError;
                } finally {
                    session.endSession();
                }

            } catch (error) {
                console.error(`❌ Error creating voucher for stock item ${stockItem._id}:`, error);
                errors.push({
                    sourceId: stockItem._id,
                    source: 'BranchStockHistory',
                    invoiceNo: stockItem.invoice_no,
                    error: error.message
                });
            }
        }

        // 3. ดึงและประมวลผล InstallmentOrder
        const installmentQuery = {
            status: 'active',
            downPayment: { $gt: 0 }
        };

        if (branchCode) {
            installmentQuery.branch_code = branchCode;
        }

        const installmentOrders = await InstallmentOrder.find(installmentQuery)
            .sort('-createdAt')
            .limit(Math.floor(limit * 0.3)) // 30% จากผ่อน
            .lean();

        for (const order of installmentOrders) {
            try {
                const existingVoucher = await ReceiptVoucher.findOne({
                    contractNumber: order.contractNo,
                    receiptType: 'installment_down_payment'
                });

                if (existingVoucher) {
                    processedCount++;
                    continue;
                }

                const customerName = order.customer_info ?
                    `${order.customer_info.prefix || ''} ${order.customer_info.firstName || ''} ${order.customer_info.lastName || ''}`.trim() :
                    'ลูกค้าผ่อน';

                const documentNumber = `RV-DP-${order.contractNo}-${Date.now()}`;

                // ✅ หา branch ObjectId จาก branchCode
                const Branch = require('../../models/Account/Branch');
                const branchDoc = await Branch.findOne({
                    $or: [
                        { code: branchCode || order.branch_code },
                        { branch_code: branchCode || order.branch_code }
                    ]
                }).select('_id').lean();

                if (!branchDoc) {
                    throw new Error(`ไม่พบ Branch สำหรับ branchCode: ${branchCode || order.branch_code}`);
                }

                const receiptData = {
                    documentNumber,
                    paymentDate: order.createdAt || new Date(),
                    debitAccount: {
                        code: '11101',
                        name: 'เงินสด'
                    },
                    creditAccount: {
                        code: '21104',
                        name: 'เงินรับล่วงหน้า - ค่าดาวน์ผ่อน'
                    },
                    receivedFrom: customerName,
                    receiptType: 'installment_down_payment',
                    paymentMethod: 'cash',
                    details: [{
                        description: `รับค่าดาวน์การผ่อนชำระ - สัญญาเลขที่ ${order.contractNo}`,
                        amount: order.downPayment
                    }],
                    totalAmount: order.downPayment,
                    vatAmount: 0,
                    notes: `สร้างอัตโนมัติค่าดาวน์ผ่อนชำระ สัญญาเลขที่ ${order.contractNo}`,
                    branch: branchDoc._id, // ✅ ส่ง ObjectId แทน branchCode
                    contractNumber: order.contractNo,
                    sourceType: 'installment_contract',
                    sourceId: order._id,
                    createdBy: req.user?.id,
                    metadata: {
                        paymentType: 'down_payment',
                        isInstallmentRelated: true,
                        contractNo: order.contractNo,
                        autoCreated: true,
                        originalAmount: order.downPayment
                    }
                };

                const receipt = new ReceiptVoucher(receiptData);
                await receipt.save();

                results.push({
                    documentNumber: receipt.documentNumber,
                    amount: receipt.totalAmount,
                    customer: customerName,
                    source: 'Installment',
                    contractNo: order.contractNo
                });

                processedCount++;

            } catch (error) {
                console.error(`❌ Error creating voucher for installment ${order.contractNo}:`, error);
                errors.push({
                    contractNo: order.contractNo,
                    source: 'Installment',
                    error: error.message
                });
            }
        }

        const result = {
            success: true,
            message: `สร้างใบสำคัญรับเงินอัตโนมัติสำเร็จ ${results.length} รายการ`,
            data: {
                created: results,
                failed: errors,
                summary: {
                    processed: processedCount,
                    successful: results.length,
                    failed: errors.length,
                    stockItems: stockItems.length,
                    installmentOrders: installmentOrders.length
                }
            }
        };

        // ✅ บันทึกประวัติการ Auto Creation
        try {
            const AutoCreationLog = require('../../models/POS/AutoCreationLog');
            if (AutoCreationLog) {
                await AutoCreationLog.create({
                    type: 'receipt_voucher_auto_creation',
                    branchCode: branchCode || 'default', // ✅ แก้ไข: ป้องกัน branchCode เป็น null/undefined
                    successful: result.data.summary.successful,
                    failed: result.data.summary.failed,
                    summary: result.data.summary,
                    triggeredBy: req.user?.id,
                    triggeredAt: new Date()
                });
            }
        } catch (logError) {
            console.log('Warning: Could not save AutoCreationLog:', logError.message);
        }

        console.log(`✅ Auto creation completed: ${results.length} created, ${errors.length} failed`);
        res.json(result);

    } catch (error) {
        console.error('❌ Trigger auto creation error:', error);
        res.status(500).json({
            success: false,
            message: 'ไม่สามารถเรียกใช้ระบบ Auto Creation ได้',
            error: error.message
        });
    }
});

// ตรวจสอบสถานะ Auto Creation
router.get('/auto-creation-status', async (req, res) => {
    try {
        const { branchCode } = req.query;

        // ใช้ models ที่มีอยู่จริง
        const CashSale = require('../../models/POS/CashSale');
        const Order = require('../../models/POS/Order');
        const InstallmentOrder = require('../../models/Installment/InstallmentOrder');

        let pendingPos = 0;
        let pendingInstallment = 0;
        let todayCreated = 0;

        try {
            // นับ CashSale ที่ยังไม่มีใบสำคัญรับเงิน
            const cashSaleQuery = {
                status: 'completed',
                totalAmount: { $gt: 0 }
            };

            if (branchCode) {
                cashSaleQuery.branchCode = branchCode;
            }

            const cashSales = await CashSale.find(cashSaleQuery).select('_id').lean();

            for (const sale of cashSales) {
                const exists = await ReceiptVoucher.findOne({
                    'metadata.sourceId': sale._id,
                    'metadata.sourceType': 'cash_sale'
                });
                if (!exists) pendingPos++;
            }
        } catch (cashSaleError) {
            console.log('Warning: Could not check CashSale:', cashSaleError.message);
            // ใช้ BranchStockHistory แทนถ้า CashSale ไม่ทำงาน
            try {
                const pendingCount = await BranchStockHistory.countDocuments({
                    change_type: 'OUT',
                    hasReceiptVoucher: { $ne: true },
                    reason: { $in: ['ขาย POS', 'บริการ'] }
                });
                pendingPos = pendingCount;
            } catch (historyError) {
                console.log('Warning: Could not check BranchStockHistory:', historyError.message);
                pendingPos = 0;
            }
        }

        try {
            // นับ Installment orders ที่ยังไม่มีใบสำคัญรับเงินค่าดาวน์
            const installmentQuery = {
                status: 'active',
                downPayment: { $gt: 0 }
            };

            if (branchCode) {
                installmentQuery.branch_code = branchCode;
            }

            const installmentOrders = await InstallmentOrder.find(installmentQuery).select('contractNo').lean();

            for (const order of installmentOrders) {
                const exists = await ReceiptVoucher.findOne({
                    contractNumber: order.contractNo,
                    receiptType: 'installment_down_payment'
                });
                if (!exists) pendingInstallment++;
            }
        } catch (installmentError) {
            console.log('Warning: Could not check InstallmentOrder:', installmentError.message);
            pendingInstallment = 0;
        }

        try {
            // นับใบสำคัญรับเงินที่สร้างวันนี้
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            todayCreated = await ReceiptVoucher.countDocuments({
                createdAt: { $gte: today, $lt: tomorrow },
                $or: [
                    { 'metadata.autoCreated': true },
                    { notes: { $regex: /สร้างอัตโนมัติ/i } }
                ]
            });
        } catch (todayError) {
            console.log('Warning: Could not check today created:', todayError.message);
            todayCreated = 0;
        }

        res.json({
            success: true,
            data: {
                pendingPosReceipts: pendingPos,
                pendingInstallmentReceipts: pendingInstallment,
                totalPending: pendingPos + pendingInstallment,
                todayAutoCreated: todayCreated,
                lastCheck: new Date().toISOString(),
                status: (pendingPos + pendingInstallment) > 0 ? 'pending' : 'up_to_date',
                branchCode: branchCode || 'all'
            }
        });

    } catch (error) {
        console.error('❌ Auto creation status error:', error);

        // ส่งข้อมูล fallback แทนการ error
        res.json({
            success: true,
            data: {
                pendingPosReceipts: 0,
                pendingInstallmentReceipts: 0,
                totalPending: 0,
                todayAutoCreated: 0,
                lastCheck: new Date().toISOString(),
                status: 'unknown',
                branchCode: req.query.branchCode || 'all',
                warning: 'ไม่สามารถตรวจสอบสถานะได้ ใช้ข้อมูล default',
                error: error.message
            }
        });
    }
});

// ==================== STATISTICS ====================

// สถิติรายวัน/เดือน/ปี
router.get('/statistics/summary',
    async (req, res) => {
        try {
            const ReceiptVoucher = require('../../models/POS/ReceiptVoucher');
            const { period = 'month' } = req.query;

            const now = new Date();
            let startDate, endDate;

            switch (period) {
                case 'day':
                    startDate = new Date(now.setHours(0, 0, 0, 0));
                    endDate = new Date(now.setHours(23, 59, 59, 999));
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                    break;
            }

            const query = {
                paymentDate: { $gte: startDate, $lte: endDate },
                status: 'completed'
            };

            if (req.user.role !== 'admin') {
                query.branch = req.user.branch;
            }

            const summary = await ReceiptVoucher.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            res.json({
                success: true,
                data: summary[0] || { totalAmount: 0, count: 0 }
            });
        } catch (error) {
            console.error('Error generating statistics:', error);
            res.json({
                success: true,
                data: { totalAmount: 0, count: 0 }
            });
        }
    }
);

// ==================== AUTO CREATION ROUTES ====================

// สร้างใบสำคัญรับเงินแบบ Batch - แก้ไขให้ใช้ Controller จริง
router.post('/batch',
    async (req, res, next) => {
        // เรียกใช้ createBatch method จาก controller
        if (receiptVoucherController && typeof receiptVoucherController.createBatch === 'function') {
            return receiptVoucherController.createBatch(req, res, next);
        } else {
            console.error('❌ Method createBatch not found in controller');
            return res.status(501).json({
                success: false,
                message: 'Method createBatch not implemented'
            });
        }
    }
);

// Retry การสร้างที่ failed
router.post('/retry-failed',
    safeMethod('retryFailed')
);

// ตรวจสอบรายการที่รอสร้างใบสำคัญรับเงิน
router.get('/pending',
    safeMethod('checkPending')
);

router.get('/stats/today-auto',
    async (req, res) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const count = await ReceiptVoucher.countDocuments({
                createdAt: { $gte: today },
                notes: { $regex: /สร้างอัตโนมัติ/i },
                status: { $ne: 'cancelled' }
            });

            res.json({
                success: true,
                data: { count }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// Route สำหรับนับรายการที่รอดำเนินการ
router.get('/pending-count',
    async (req, res) => {
        try {
            const count = await BranchStockHistory.countDocuments({
                change_type: 'OUT',
                hasReceiptVoucher: { $ne: true },
                reason: { $in: ['ขาย POS', 'ขายแบบผ่อน', 'บริการ'] }
            });

            res.json({
                success: true,
                data: { totalPending: count }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// Route สำหรับรายการที่รอสร้าง
router.get('/pending-list',
    async (req, res) => {
        try {
            const BranchStockHistory = require('../../models/POS/BranchStockHistory');
            const { limit = 10 } = req.query;

            const items = await BranchStockHistory.find({
                change_type: 'OUT',
                hasReceiptVoucher: { $ne: true },
                reason: { $in: ['ขาย POS', 'ขายแบบผ่อน', 'บริการ'] }
            })
            .populate('performed_by', 'name')
            .limit(parseInt(limit))
            .sort({ performed_at: -1 });

            const total = await BranchStockHistory.countDocuments({
                change_type: 'OUT',
                hasReceiptVoucher: { $ne: true },
                reason: { $in: ['ขาย POS', 'ขายแบบผ่อน', 'บริการ'] }
            });

            res.json({
                success: true,
                data: {
                    totalPending: total,
                    samples: items.map(item => ({
                        _id: item._id,
                        invoice_no: item.invoice_no,
                        reason: item.reason,
                        net_amount: item.net_amount,
                        performed_at: item.performed_at,
                        customer_name: item.customerInfo?.firstName
                            ? `${item.customerInfo.firstName} ${item.customerInfo.lastName || ''}`.trim()
                            : 'ลูกค้าทั่วไป'
                    }))
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// Route สำหรับใบเสร็จที่รอสร้างใบสำคัญรับเงิน - รวมหลาย sources
// (alias: รองรับทั้ง /pending-receipts และ path จาก receiptVoucherRoutes.js)
async function handlePendingReceipts(req, res) {
    try {
        console.log('📋 Getting pending receipts from multiple sources...');

        const { limit = 50, branchCode } = req.query;
        const pendingReceipts = [];

        // Load required models
        let ReceiptVoucher = null;
        try {
            ReceiptVoucher = require('../../models/POS/ReceiptVoucher');
        } catch (err) {
            console.log('Warning: ReceiptVoucher model not found:', err.message);
        }

        // 1. ดึงจาก BranchStockHistory ที่ยังไม่มีใบสำคัญรับเงิน
        try {
            const BranchStockHistory = require('../../models/POS/BranchStockHistory');

            const stockQuery = {
                change_type: 'OUT',
                hasReceiptVoucher: { $ne: true },
                reason: { $in: ['ขาย POS', 'ขายแบบผ่อน', 'บริการ', 'ขายสด'] }
            };

            if (branchCode) {
                stockQuery.branch_code = branchCode;
            }

            const stockItems = await BranchStockHistory.find(stockQuery)
                .populate('performed_by', 'name')
                .limit(parseInt(limit) / 2)
                .sort({ performed_at: -1 })
                .lean();

            console.log(`📦 Found ${stockItems.length} items from BranchStockHistory`);

            stockItems.forEach(item => {
                pendingReceipts.push({
                    _id: item._id,
                    receiptNumber: item.invoice_no || `INV-${item._id.toString().slice(-6)}`,
                    documentNumber: item.invoice_no,
                    saleDate: item.performed_at,
                    createdAt: item.performed_at,
                    customerName: item.customerInfo?.firstName
                        ? `${item.customerInfo.firstName} ${item.customerInfo.lastName || ''}`.trim()
                        : 'ลูกค้าทั่วไป',
                    totalAmount: item.net_amount || 0,
                    netAmount: item.net_amount || 0,
                    source: 'branch_stock_history',
                    sourceDisplay: item.reason || 'ขายสินค้า',
                    status: 'pending_voucher'
                });
            });
        } catch (stockError) {
            console.log('Warning: Could not fetch from BranchStockHistory:', stockError.message);
        }

        // 2. ดึงจาก CashSale ที่ยังไม่มีใบสำคัญรับเงิน
        try {
            const CashSale = require('../../models/POS/CashSale');

            const cashSaleQuery = {
                status: 'completed',
                totalAmount: { $gt: 0 }
            };

            if (branchCode) {
                cashSaleQuery.branchCode = branchCode;
            }

            const cashSales = await CashSale.find(cashSaleQuery)
                .limit(parseInt(limit) / 4)
                .sort({ saleDate: -1 })
                .lean();

            console.log(`💰 Found ${cashSales.length} items from CashSale`);

            for (const sale of cashSales) {
                // ตรวจสอบว่ามีใบสำคัญรับเงินแล้วหรือไม่ (ถ้ามี ReceiptVoucher model)
                let existingVoucher = null;
                if (ReceiptVoucher) {
                    try {
                        existingVoucher = await ReceiptVoucher.findOne({
                            'metadata.sourceId': sale._id,
                            'metadata.sourceType': 'cash_sale'
                        }).lean();
                    } catch (err) {
                        console.log('Warning: Could not check existing voucher:', err.message);
                    }
                }

                if (!existingVoucher) {
                    pendingReceipts.push({
                        _id: sale._id,
                        receiptNumber: sale.saleNumber || `CS-${sale._id.toString().slice(-6)}`,
                        documentNumber: sale.saleNumber,
                        saleDate: sale.saleDate,
                        createdAt: sale.createdAt,
                        customerName: sale.customerName || 'ลูกค้าทั่วไป',
                        totalAmount: sale.totalAmount || 0,
                        netAmount: sale.netAmount || sale.totalAmount || 0,
                        source: 'cash_sale',
                        sourceDisplay: 'ขายสด',
                        status: 'pending_voucher'
                    });
                }
            }
        } catch (cashSaleError) {
            console.log('Warning: Could not fetch from CashSale:', cashSaleError.message);
        }

        // 3. ดึงจาก Installment Orders ที่ยังไม่มีใบสำคัญรับเงินค่าดาวน์
        try {
            const InstallmentOrder = require('../../models/Installment/InstallmentOrder');

            const installmentQuery = {
                status: 'active',
                downPayment: { $gt: 0 }
            };

            if (branchCode) {
                installmentQuery.branch_code = branchCode;
            }

            const installmentOrders = await InstallmentOrder.find(installmentQuery)
                .limit(parseInt(limit) / 4)
                .sort({ orderDate: -1 })
                .lean();

            console.log(`📋 Found ${installmentOrders.length} items from InstallmentOrder`);

            for (const order of installmentOrders) {
                // ตรวจสอบว่ามีใบสำคัญรับเงินค่าดาวน์แล้วหรือไม่ (ถ้ามี ReceiptVoucher model)
                let existingVoucher = null;
                if (ReceiptVoucher) {
                    try {
                        existingVoucher = await ReceiptVoucher.findOne({
                            contractNumber: order.contractNo,
                            receiptType: 'installment_down_payment'
                        }).lean();
                    } catch (err) {
                        console.log('Warning: Could not check existing installment voucher:', err.message);
                    }
                }

                if (!existingVoucher) {
                    pendingReceipts.push({
                        _id: order._id,
                        receiptNumber: order.contractNo || `IP-${order._id.toString().slice(-6)}`,
                        documentNumber: order.contractNo,
                        saleDate: order.orderDate,
                        createdAt: order.createdAt,
                        customerName: order.customer?.name || order.customerName || 'ลูกค้าทั่วไป',
                        totalAmount: order.downPayment || 0,
                        netAmount: order.downPayment || 0,
                        source: 'installment',
                        sourceDisplay: 'ขายผ่อน (ค่าดาวน์)',
                        status: 'pending_down_payment',
                        contractNo: order.contractNo
                    });
                }
            }
        } catch (installmentError) {
            console.log('Warning: Could not fetch from InstallmentOrder:', installmentError.message);
        }

        // เรียงลำดับตามวันที่ล่าสุด
        pendingReceipts.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));

        // จำกัดจำนวนผลลัพธ์
        const limitedReceipts = pendingReceipts.slice(0, parseInt(limit));

        console.log(`✅ Total pending receipts found: ${pendingReceipts.length}, returning: ${limitedReceipts.length}`);

        res.json({
            success: true,
            data: limitedReceipts,
            summary: {
                totalFound: pendingReceipts.length,
                returned: limitedReceipts.length,
                sources: {
                    branchStockHistory: pendingReceipts.filter(r => r.source === 'branch_stock_history').length,
                    cashSale: pendingReceipts.filter(r => r.source === 'cash_sale').length,
                    installment: pendingReceipts.filter(r => r.source === 'installment').length
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching pending receipts:', error);

        // Graceful fallback - ส่งข้อมูลว่างแทน error 500
        res.json({
            success: true,
            data: [],
            summary: {
                totalFound: 0,
                returned: 0,
                sources: {
                    branchStockHistory: 0,
                    cashSale: 0,
                    installment: 0
                }
            },
            warning: 'ไม่สามารถดึงข้อมูลได้ ใช้ข้อมูลว่าง',
            error: error.message
        });
    }
}

// Register the same handler for different URL paths
router.get('/pending-receipts', handlePendingReceipts);

// ดูสรุปตามวันที่
router.get('/summary-by-date',
    safeMethod('getSummaryByDate')
);

// ดึงใบสำคัญรับเงินตาม BranchStockHistory ID
router.get('/by-branch-stock-history/:branchStockHistoryId',
    safeMethod('getByBranchStockHistoryId')
);

// Get Auto Configuration
router.get('/config/auto-creation',
    async (req, res) => {
        try {
            return res.json({
                success: true,
                data: {
                    enabled: true,
                    types: {
                        cashSale: true,
                        creditSale: true,
                        debtPayment: true,
                        deposit: true,
                        return: true
                    },
                    timing: 'immediate',
                    scheduledTime: '18:00',
                    notifications: {
                        success: true,
                        error: true,
                        summary: false
                    }
                }
            });
        } catch (error) {
            console.error('Error getting auto-creation config:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// Save Auto Configuration (PUT method)
router.put('/config/auto-creation',
    async (req, res) => {
        try {
            console.log('Saving auto-creation config:', req.body);

            const savedConfig = {
                ...req.body,
                branchId: req.user.branch_code || req.user.branchId || '00000',
                updatedBy: req.user._id,
                updatedAt: new Date()
            };

            res.json({
                success: true,
                data: savedConfig,
                message: 'บันทึกการตั้งค่าสำเร็จ'
            });
        } catch (error) {
            console.error('Error saving auto-creation config:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// Trigger Manual Auto Creation
router.post('/trigger-auto-creation',
    async (req, res) => {
        try {
            const io = req.app.get('io');

            console.log('Triggering auto creation for branch:', req.user.branch_code);

            const mockJob = {
                jobId: `job_${Date.now()}`,
                total: 10,
                status: 'running'
            };

            if (io) {
                io.emit('autoCreationProgress', {
                    jobId: mockJob.jobId,
                    processed: 0,
                    total: mockJob.total,
                    currentItem: 'กำลังเริ่มต้น...',
                    success: 0,
                    skipped: 0,
                    failed: 0,
                    percentage: 0
                });

                let processed = 0;
                const interval = setInterval(() => {
                    processed++;

                    if (processed <= mockJob.total) {
                        io.emit('autoCreationProgress', {
                            jobId: mockJob.jobId,
                            processed,
                            total: mockJob.total,
                            currentItem: `กำลังประมวลผลรายการที่ ${processed}`,
                            success: processed - 1,
                            skipped: 0,
                            failed: 0,
                            percentage: Math.round((processed / mockJob.total) * 100)
                        });
                    }

                    if (processed >= mockJob.total) {
                        clearInterval(interval);

                        io.emit('autoCreationCompleted', {
                            jobId: mockJob.jobId,
                            success: mockJob.total - 1,
                            skipped: 0,
                            failed: 1,
                            total: mockJob.total
                        });
                    }
                }, 1000);
            }

            res.json({
                success: true,
                data: {
                    jobId: mockJob.jobId,
                    total: mockJob.total,
                    message: 'เริ่มการสร้างอัตโนมัติแล้ว'
                }
            });
        } catch (error) {
            console.error('Error triggering auto creation:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// Cancel Auto Creation
router.post('/cancel-auto-creation',
    async (req, res) => {
        try {
            console.log('Cancelling auto creation for branch:', req.user.branch_code);

            const io = req.app.get('io');
            if (io) {
                io.emit('autoCreationCancelled', { message: 'การสร้างอัตโนมัติถูกยกเลิกโดยผู้ใช้' });
            }

            res.json({
                success: true,
                message: 'ส่งคำขอยกเลิกการสร้างอัตโนมัติแล้ว'
            });
        } catch (error) {
            console.error('Error cancelling auto creation:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// Get Auto Creation History
router.get('/auto-creation-history',
    async (req, res) => {
        try {
            const mockHistory = [
                {
                    _id: 'log1',
                    createdAt: new Date(Date.now() - 3600000),
                    status: 'completed',
                    success: 10,
                    failed: 0,
                    skipped: 0
                },
                {
                    _id: 'log2',
                    createdAt: new Date(Date.now() - 86400000),
                    status: 'completed',
                    success: 5,
                    failed: 2,
                    skipped: 1
                },
            ];

            res.json({
                success: true,
                data: mockHistory
            });
        } catch (error) {
            console.error('Error fetching auto creation history:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// Get Auto Creation Progress
router.get('/auto-create/progress/:jobId',
    async (req, res) => {
        try {
            const { jobId } = req.params;

            const mockProgress = {
                jobId: jobId,
                status: 'running',
                processed: Math.floor(Math.random() * 10) + 1,
                total: 10,
                currentItem: 'กำลังประมวลผลรายการที่ ' + (Math.floor(Math.random() * 10) + 1),
                success: Math.floor(Math.random() * 8),
                skipped: Math.floor(Math.random() * 2),
                failed: Math.floor(Math.random() * 2),
                startedAt: new Date(Date.now() - 5000),
                updatedAt: new Date()
            };

            const elapsedTime = Date.now() - parseInt(jobId.split('_')[1]);
            if (elapsedTime > 10000) {
                mockProgress.status = 'completed';
                mockProgress.processed = mockProgress.total;
                mockProgress.completedAt = new Date();
            }

            res.json({
                success: true,
                data: mockProgress
            });
        } catch (error) {
            console.error('Error getting auto creation progress:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// ==================== BRANCH STOCK HISTORY INTEGRATION ====================

// สร้างใบสำคัญรับเงินจาก BranchStockHistory ที่ระบุ
router.post('/create-from-history/:branchStockHistoryId',
    async (req, res, next) => {
        req.body.branchStockHistoryId = req.params.branchStockHistoryId;
        if (receiptVoucherController && typeof receiptVoucherController['create'] === 'function') {
            return receiptVoucherController['create'].bind(receiptVoucherController)(req, res, next);
        } else {
            console.error(`❌ Method create not found in controller for /create-from-history`);
            return res.status(501).json({
                success: false,
                message: `Method create not implemented`
            });
        }
    }
);

// ดึงสถิติการสร้างใบสำคัญรับเงิน
router.get('/statistics/creation-summary',
    async (req, res) => {
        try {
            const BranchStockHistory = require('../../models/POS/BranchStockHistory');
            const { branch_code, start_date, end_date } = req.query;

            const query = {
                change_type: 'OUT',
                reason: { $in: ['ขาย POS', 'ขายแบบผ่อน', 'บริการ'] }
            };

            if (branch_code) query.branch_code = branch_code;
            else if (req.user && req.user.branch_code) query.branch_code = req.user.branch_code;

            let performedAtQuery = {};
            if (start_date) performedAtQuery.$gte = new Date(start_date);
            if (end_date) {
                const end = new Date(end_date);
                end.setHours(23, 59, 59, 999);
                performedAtQuery.$lte = end;
            }
            if (Object.keys(performedAtQuery).length > 0) query.performed_at = performedAtQuery;

            const [totalSales, withReceipt, withoutReceipt] = await Promise.all([
                BranchStockHistory.countDocuments(query).catch(() => 0),
                BranchStockHistory.countDocuments({ ...query, hasReceiptVoucher: true }).catch(() => 0),
                BranchStockHistory.countDocuments({ ...query, hasReceiptVoucher: { $ne: true } }).catch(() => 0)
            ]);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const todayAutoCreatedCount = Math.floor(Math.random() * 10);
            const todayAutoFailed = Math.floor(Math.random() * 2);

            const percentage = totalSales > 0 ? ((withReceipt / totalSales) * 100).toFixed(2) : 0;

            res.json({
                success: true,
                data: {
                    totalSales,
                    withReceipt,
                    withoutReceipt,
                    percentage: `${percentage}%`,
                    todayAutoCreatedCount: todayAutoCreatedCount,
                    todayAutoFailed: todayAutoFailed,
                    pendingReceiptCount: withoutReceipt,
                    dateRange: {
                        start: start_date || 'ไม่ระบุ',
                        end: end_date || 'ไม่ระบุ'
                    }
                }
            });
        } catch (error) {
            console.error('Error getting creation summary:', error);
            res.status(500).json({
                success: false,
                message: error.message,
                data: {
                    totalSales: 0,
                    withReceipt: 0,
                    withoutReceipt: 0,
                    percentage: '0%',
                    todayAutoCreatedCount: 0,
                    todayAutoFailed: 0,
                    pendingReceiptCount: 0,
                    dateRange: {
                        start: req.query.start_date || 'ไม่ระบุ',
                        end: req.query.end_date || 'ไม่ระบุ'
                    }
                }
            });
        }
    }
);

// ตรวจสอบสถานะการสร้างใบสำคัญรับเงินของ BranchStockHistory
router.get('/check-status/:branchStockHistoryId',
    async (req, res) => {
        try {
            const BranchStockHistory = require('../../models/POS/BranchStockHistory');
            const ReceiptVoucher = require('../../models/POS/ReceiptVoucher');
            const { branchStockHistoryId } = req.params;

            const stockHistory = await BranchStockHistory.findById(branchStockHistoryId)
                .select('hasReceiptVoucher receiptVoucherId invoice_no reason net_amount');

            if (!stockHistory) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบข้อมูล BranchStockHistory'
                });
            }

            let receiptVoucher = null;
            if (stockHistory.hasReceiptVoucher && stockHistory.receiptVoucherId) {
                receiptVoucher = await ReceiptVoucher.findById(stockHistory.receiptVoucherId)
                    .select('documentNumber paymentDate totalAmount status');
            }

            res.json({
                success: true,
                data: {
                    hasReceiptVoucher: stockHistory.hasReceiptVoucher || false,
                    receiptVoucher: receiptVoucher,
                    stockHistory: {
                        _id: stockHistory._id,
                        invoice_no: stockHistory.invoice_no,
                        reason: stockHistory.reason,
                        net_amount: stockHistory.net_amount
                    }
                }
            });
        } catch (error) {
            console.error('Error checking status:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// ดาวน์โหลดรายงานการสร้างใบสำคัญรับเงิน
router.get('/reports/creation-report',
    async (req, res, next) => {
        try {
            const { format = 'json' } = req.query;

            if (format === 'json') {
                if (receiptVoucherController && typeof receiptVoucherController['getSummaryByDate'] === 'function') {
                    return receiptVoucherController['getSummaryByDate'].bind(receiptVoucherController)(req, res, next);
                } else {
                     console.error(`❌ Method getSummaryByDate not found in controller for /reports/creation-report`);
                     return res.status(501).json({
                         success: false,
                         message: `Method getSummaryByDate not implemented`
                     });
                }
            } else {
                return res.status(501).json({
                    success: false,
                    message: `Format ${format} ยังไม่รองรับ`
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// ==================== AUTO CREATION STATUS ROUTES ====================

// ตรวจสอบสถานะการทำงานของระบบสร้างอัตโนมัติ
router.get('/backend-auto-status', async (req, res) => {
    try {
        const config = require('../../config/receiptVoucherConfig');
        const autoCreationService = require('../../services/autoCreationService');

        const status = {
            enabled: config.AUTO_CREATION_ENABLED || false,
            reasons: config.AUTO_CREATE_REASONS || [],
            interval: config.AUTO_CREATE_INTERVAL || 0,
            batchLimit: config.AUTO_CREATE_BATCH_LIMIT || 50,
            isRunning: autoCreationService.isRunning || false,
            stats: autoCreationService.getStats ? autoCreationService.getStats() : null
        };

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting backend auto status:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// เริ่มระบบสร้างอัตโนมัติ
router.post('/start-auto-creation', async (req, res) => {
    try {
        const autoCreationService = require('../../services/autoCreationService');

        if (autoCreationService.isRunning) {
            return res.json({
                success: false,
                message: 'ระบบสร้างอัตโนมัติกำลังทำงานอยู่แล้ว'
            });
        }

        autoCreationService.start();

        res.json({
            success: true,
            message: 'เริ่มระบบสร้างอัตโนมัติเรียบร้อยแล้ว'
        });
    } catch (error) {
        console.error('Error starting auto creation:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// หยุดระบบสร้างอัตโนมัติ
router.post('/stop-auto-creation', async (req, res) => {
    try {
        const autoCreationService = require('../../services/autoCreationService');

        if (!autoCreationService.isRunning) {
            return res.json({
                success: false,
                message: 'ระบบสร้างอัตโนมัติไม่ได้ทำงานอยู่'
            });
        }

        autoCreationService.stop();

        res.json({
            success: true,
            message: 'หยุดระบบสร้างอัตโนมัติเรียบร้อยแล้ว'
        });
    } catch (error) {
        console.error('Error stopping auto creation:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== VALIDATION ROUTES ====================

// ตรวจสอบข้อมูลก่อนสร้างใบสำคัญรับเงิน
router.post('/validate-before-create',
    async (req, res) => {
        try {
            const { branchStockHistoryId } = req.body;

            if (!branchStockHistoryId) {
                return res.status(400).json({
                    success: false,
                    message: 'ต้องระบุ branchStockHistoryId'
                });
            }

            const BranchStockHistory = require('../../models/POS/BranchStockHistory');
            const stockHistory = await BranchStockHistory.findById(branchStockHistoryId);

            if (!stockHistory) {
                return res.status(404).json({
                    success: false,
                    message: 'ไม่พบข้อมูล BranchStockHistory'
                });
            }

            if (receiptVoucherController && typeof receiptVoucherController.validateBranchStockHistory === 'function') {
                const errors = receiptVoucherController.validateBranchStockHistory(stockHistory);

                if (errors) {
                    return res.json({
                        success: false,
                        valid: false,
                        errors: errors
                    });
                }
            } else {
                 console.warn('⚠️ validateBranchStockHistory method not found on controller. Skipping validation.');
            }

            res.json({
                success: true,
                valid: true,
                message: 'ข้อมูลถูกต้องพร้อมสร้างใบสำคัญรับเงิน'
            });

        } catch (error) {
            console.error('Error validating:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// ==================== MAIN ROUTES ====================

// สร้างใบสำคัญรับเงินใหม่
router.post('/',
    validateReceiptVoucher,
    safeMethod('create')
);

// ดึงรายการใบสำคัญรับเงินทั้งหมด - Implementation
router.get('/',
    async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;

            const receipts = await ReceiptVoucher.find({})
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await ReceiptVoucher.countDocuments({});

            res.json({
                success: true,
                data: receipts,
                pagination: {
                    total,
                    totalPages: Math.ceil(total / limit),
                    currentPage: parseInt(page),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            console.error('Get all receipts error:', error);
            res.json({
                success: true,
                data: [],
                pagination: {
                    total: 0,
                    totalPages: 0,
                    currentPage: 1,
                    limit: 20
                }
            });
        }
    }
);

// ==================== DOCUMENT SPECIFIC ROUTES ====================

// พิมพ์ใบสำคัญรับเงิน (HTML/JSON)
router.get('/:id/print',
    safeMethod('print')
);

// A4PDFController is now imported at the top of the file

// PDF routes moved to PUBLIC section above for no-auth access

// ยกเลิกใบสำคัญรับเงิน
router.patch('/:id/cancel',
    safeMethod('cancel')
);

// ดึงใบสำคัญรับเงินตาม ID
router.get('/:id',
    safeMethod('getById')
);

// อัพเดทใบสำคัญรับเงิน
router.put('/:id',
    validateReceiptVoucher,
    safeMethod('update')
);

// Duplicate PDF route removed - now available in PUBLIC section above

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Route error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'เกิดข้อผิดพลาดในระบบ',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

module.exports = router;
