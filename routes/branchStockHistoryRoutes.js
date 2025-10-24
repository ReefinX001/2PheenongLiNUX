const express = require('express');
const router = express.Router();
const branchStockHistoryController = require('../controllers/branchStockHistoryController');

// POST /api/branch-stock-history => บันทึกประวัติสินค้าเข้า/ออก
router.post('/', branchStockHistoryController.createHistory);

// GET /api/branch-stock-history/out-items
router.get('/out-items', branchStockHistoryController.getOutItems);

// ============= เพิ่ม route ใหม่ที่นี่ =============
// GET /api/branch-stock-history/without-receipt => ดึงรายการที่ยังไม่มีใบสำคัญรับเงิน
router.get('/without-receipt', async (req, res) => {
    try {
        const BranchStockHistory = require('../models/POS/BranchStockHistory'); // แก้ path ตามโครงสร้างจริง

        const query = {
            change_type: 'OUT',
            hasReceiptVoucher: { $ne: true },
            reason: { $in: ['ขาย POS', 'ขายแบบผ่อน', 'บริการ'] }
        };

        // เพิ่มการกรองตาม branch_code ถ้ามี
        if (req.query.branch_code) {
            query.branch_code = req.query.branch_code;
        }

        // เพิ่มการกรองตามวันที่ถ้ามี
        if (req.query.start_date || req.query.end_date) {
            query.performed_at = {};
            if (req.query.start_date) {
                query.performed_at.$gte = new Date(req.query.start_date);
            }
            if (req.query.end_date) {
                const endDate = new Date(req.query.end_date);
                endDate.setHours(23, 59, 59, 999);
                query.performed_at.$lte = endDate;
            }
        }

        const limit = parseInt(req.query.limit) || 100;

        const items = await BranchStockHistory.find(query)
            .populate('performed_by', 'name email')
            .limit(limit)
            .sort({ performed_at: -1 })
            .lean();

        // Format response data
        const formattedItems = items.map(item => ({
            _id: item._id,
            invoice_no: item.invoice_no,
            reason: item.reason,
            net_amount: item.net_amount || item.total_amount || 0,
            total_amount: item.total_amount || 0,
            performed_at: item.performed_at,
            branch_code: item.branch_code,
            staff_name: item.staff_name || item.performed_by?.name,
            customer_name: item.customerInfo?.firstName
                ? `${item.customerInfo.firstName} ${item.customerInfo.lastName || ''}`.trim()
                : item.corporateInfo?.companyName || 'ลูกค้าทั่วไป',
            customerType: item.customerType,
            customerInfo: item.customerInfo,
            corporateInfo: item.corporateInfo,
            items: item.items || []
        }));

        res.json({
            success: true,
            data: formattedItems,
            total: formattedItems.length
        });

    } catch (error) {
        console.error('Error fetching items without receipt:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// ================================================

// GET /api/branch-stock-history => ดึงประวัติทั้งหมด
router.get('/', branchStockHistoryController.getAllHistory);

// GET /api/branch-stock-history/branch/:branchId => ประวัติของสาขา
router.get('/branch/:branchId', branchStockHistoryController.getHistoryByBranch);

// GET /api/branch-stock-history/product/:productId => ประวัติของสินค้าตัวเดียว
router.get('/product/:productId', branchStockHistoryController.getHistoryByProduct);

// DELETE /api/branch-stock-history/:id => ลบประวัติตาม _id
router.delete('/:id', branchStockHistoryController.deleteHistory);

// GET /api/branch-stock-history/stock-summary => สรุปยอด IN/OUT
router.get('/stock-summary', branchStockHistoryController.getStockSummary);

// GET /api/branch-stock-history/in-po-numbers => ดึงข้อมูล poNumber ของรายการสินค้าเข้า (IN)
router.get('/in-po-numbers', branchStockHistoryController.getInPoNumbers);

// GET /api/branch-stock-history/in-invoice-numbers => ดึง invoiceNumber ของสินค้าเข้า (IN)
router.get('/in-invoice-numbers', branchStockHistoryController.getInInvoiceNumbers);

// GET /api/branch-stock-history/out-invoice-nos => ดึง invoice_no ของสินค้าออก (OUT)
router.get('/out-invoice-nos', branchStockHistoryController.getOutInvoiceNos);

router.get('/out-Price', branchStockHistoryController.getOutPrice);
router.get('/in-cost', branchStockHistoryController.getincost);

// NEW: GET /api/branch-stock-history/sales-revenue => ดึงยอดขาย (รายได้)
router.get('/sales-revenue', branchStockHistoryController.getSalesRevenue);

// NEW: GET /api/branch-stock-history/export-pdf => Export PDF จากข้อมูลจริง
router.get('/export-pdf', branchStockHistoryController.exportPdf);

// NEW: GET /api/branch-stock-history/tax-pn50 => จัดการภาษี/ภวด.51,50
router.get('/tax-pn50', branchStockHistoryController.taxPn50);

// NEW: GET /api/branch-stock-history/tax-pnd1 => จัดการ ภงด. 1,3,53
router.get('/tax-pnd1', branchStockHistoryController.taxPnD1);

// NEW: GET /api/branch-stock-history/tax-pn30 => จัดการ ภพ.30
router.get('/tax-pn30', branchStockHistoryController.taxPn30);

// ==================== BOXSET HISTORY ROUTES ====================

// GET /api/branch-stock-history/boxset => ดึงประวัติการทำงานของ Boxset
router.get('/boxset', async (req, res) => {
    try {
        const BranchStockHistory = require('../models/POS/BranchStockHistory');
        const { branch_code, start_date, end_date, action_type, limit = 50 } = req.query;

        // Build query filter
        const query = {
            $or: [
                { 'details.action': { $regex: 'boxset', $options: 'i' } },
                { reason: { $regex: 'boxset', $options: 'i' } },
                { reference_type: { $regex: 'boxset', $options: 'i' } }
            ]
        };

        // Add branch filter
        if (branch_code) {
            query.branch_code = branch_code;
        }

        // Add date range filter
        if (start_date || end_date) {
            query.performed_at = {};
            if (start_date) {
                query.performed_at.$gte = new Date(start_date);
            }
            if (end_date) {
                const endDate = new Date(end_date);
                endDate.setHours(23, 59, 59, 999);
                query.performed_at.$lte = endDate;
            }
        }

        // Add action type filter
        if (action_type) {
            if (action_type === 'creation') {
                query['details.action'] = 'boxset_creation';
            } else if (action_type === 'sale') {
                query['details.action'] = { $in: ['boxset_cash_sale', 'boxset_installment_sale'] };
            }
        }

        const histories = await BranchStockHistory.find(query)
            .populate('performed_by', 'name email')
            .sort({ performed_at: -1 })
            .limit(parseInt(limit))
            .lean();

        // Format response data with boxset-specific information
        const formattedHistories = histories.map(history => ({
            _id: history._id,
            product_name: history.product_name,
            branch_code: history.branch_code,
            change_type: history.change_type,
            quantity_before: history.quantity_before,
            quantity_after: history.quantity_after,
            quantity_changed: history.quantity_changed,
            price_per_unit: history.price_per_unit,
            cost_per_unit: history.cost_per_unit,
            total_amount: history.total_amount,
            total_cost: history.total_cost,
            reason: history.reason,
            reference_id: history.reference_id,
            reference_type: history.reference_type,
            performed_at: history.performed_at,
            performed_by: history.performed_by,
            // Boxset-specific details
            boxset_info: {
                boxsetId: history.details?.boxsetId,
                boxsetName: history.details?.boxsetName,
                action: history.details?.action,
                products: history.details?.boxsetProducts || []
            }
        }));

        res.json({
            success: true,
            data: formattedHistories,
            total: formattedHistories.length,
            query_info: {
                branch_code,
                start_date,
                end_date,
                action_type,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error fetching boxset history:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/branch-stock-history/boxset/:boxsetId => ประวัติของ Boxset เฉพาะ
router.get('/boxset/:boxsetId', async (req, res) => {
    try {
        const BranchStockHistory = require('../models/POS/BranchStockHistory');
        const { boxsetId } = req.params;
        const { limit = 20 } = req.query;

        const histories = await BranchStockHistory.find({
            'details.boxsetId': boxsetId
        })
        .populate('performed_by', 'name email')
        .sort({ performed_at: -1 })
        .limit(parseInt(limit))
        .lean();

        // Calculate boxset statistics
        const stats = {
            total_transactions: histories.length,
            total_sales: 0,
            total_revenue: 0,
            total_cost: 0,
            creation_date: null,
            last_activity: null
        };

        histories.forEach(history => {
            if (history.change_type === 'OUT' && history.details?.action?.includes('sale')) {
                stats.total_sales += history.quantity_changed;
                stats.total_revenue += history.total_amount || 0;
                stats.total_cost += history.total_cost || 0;
            }

            if (history.details?.action === 'boxset_creation') {
                stats.creation_date = history.performed_at;
            }

            if (!stats.last_activity || history.performed_at > stats.last_activity) {
                stats.last_activity = history.performed_at;
            }
        });

        res.json({
            success: true,
            data: {
                boxsetId,
                histories,
                statistics: stats
            }
        });

    } catch (error) {
        console.error('Error fetching boxset specific history:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// POST /api/branch-stock-history/boxset-sale => บันทึกประวัติการขาย Boxset
router.post('/boxset-sale', async (req, res) => {
    try {
        const BranchStockHistory = require('../models/POS/BranchStockHistory');
        const {
            boxsetId,
            boxsetName,
            branchCode,
            saleType, // 'cash' หรือ 'installment'
            quantity = 1,
            totalAmount,
            totalCost,
            contractNumber,
            customerInfo,
            performedBy,
            details = {}
        } = req.body;

        // Validation
        if (!boxsetId || !boxsetName || !branchCode || !saleType || !totalAmount) {
            return res.status(400).json({
                success: false,
                message: 'ข้อมูลไม่ครบถ้วน: boxsetId, boxsetName, branchCode, saleType, totalAmount ต้องระบุทั้งหมด'
            });
        }

        // Create history record
        const historyData = {
            product_id: boxsetId,
            product_name: boxsetName,
            branch_code: branchCode,
            change_type: 'OUT',
            quantity_before: quantity, // จะต้องดึงจากข้อมูลจริง
            quantity_after: 0,
            quantity_changed: quantity,
            price_per_unit: totalAmount / quantity,
            cost_per_unit: totalCost ? (totalCost / quantity) : 0,
            total_amount: totalAmount,
            total_cost: totalCost || 0,
            reason: saleType === 'cash' ? 'ขาย POS (Boxset)' : 'ขายแบบผ่อน (Boxset)',
            reference_id: contractNumber || `BOXSET_${Date.now()}`,
            reference_type: saleType === 'cash' ? 'boxset_cash_sale' : 'boxset_installment_sale',
            performed_by: performedBy,
            performed_at: new Date(),
            customerInfo: customerInfo,
            details: {
                ...details,
                boxsetId: boxsetId,
                boxsetName: boxsetName,
                saleType: saleType,
                action: saleType === 'cash' ? 'boxset_cash_sale' : 'boxset_installment_sale'
            }
        };

        const history = new BranchStockHistory(historyData);
        const savedHistory = await history.save();

        res.json({
            success: true,
            message: 'บันทึกประวัติการขาย Boxset เรียบร้อยแล้ว',
            data: savedHistory
        });

    } catch (error) {
        console.error('Error creating boxset sale history:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /api/branch-stock-history/boxset-summary => สรุปยอดขาย Boxset
router.get('/boxset-summary', async (req, res) => {
    try {
        const BranchStockHistory = require('../models/POS/BranchStockHistory');
        const { branch_code, start_date, end_date } = req.query;

        // Build aggregation pipeline
        const matchStage = {
            change_type: 'OUT',
            'details.action': { $in: ['boxset_cash_sale', 'boxset_installment_sale'] }
        };

        if (branch_code) {
            matchStage.branch_code = branch_code;
        }

        if (start_date || end_date) {
            matchStage.performed_at = {};
            if (start_date) {
                matchStage.performed_at.$gte = new Date(start_date);
            }
            if (end_date) {
                const endDate = new Date(end_date);
                endDate.setHours(23, 59, 59, 999);
                matchStage.performed_at.$lte = endDate;
            }
        }

        const summary = await BranchStockHistory.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    total_boxsets_sold: { $sum: '$quantity_changed' },
                    total_revenue: { $sum: '$total_amount' },
                    total_cost: { $sum: '$total_cost' },
                    cash_sales: {
                        $sum: {
                            $cond: [{ $eq: ['$details.saleType', 'cash'] }, '$quantity_changed', 0]
                        }
                    },
                    installment_sales: {
                        $sum: {
                            $cond: [{ $eq: ['$details.saleType', 'installment'] }, '$quantity_changed', 0]
                        }
                    },
                    cash_revenue: {
                        $sum: {
                            $cond: [{ $eq: ['$details.saleType', 'cash'] }, '$total_amount', 0]
                        }
                    },
                    installment_revenue: {
                        $sum: {
                            $cond: [{ $eq: ['$details.saleType', 'installment'] }, '$total_amount', 0]
                        }
                    }
                }
            }
        ]);

        const result = summary[0] || {
            total_boxsets_sold: 0,
            total_revenue: 0,
            total_cost: 0,
            cash_sales: 0,
            installment_sales: 0,
            cash_revenue: 0,
            installment_revenue: 0
        };

        // Calculate profit
        result.total_profit = result.total_revenue - result.total_cost;
        result.profit_margin = result.total_revenue > 0 ?
            ((result.total_profit / result.total_revenue) * 100).toFixed(2) : 0;

        res.json({
            success: true,
            data: result,
            period: {
                start_date,
                end_date,
                branch_code
            }
        });

    } catch (error) {
        console.error('Error generating boxset summary:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
