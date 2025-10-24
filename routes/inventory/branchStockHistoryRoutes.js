const express = require('express');
const router = express.Router();
const branchStockHistoryController = require('../../controllers/branchStockHistoryController');

// POST /api/branch-stock-history => บันทึกประวัติสินค้าเข้า/ออก
router.post('/', branchStockHistoryController.createHistory);

// GET /api/branch-stock-history/out-items
router.get('/out-items', branchStockHistoryController.getOutItems);

// ============= เพิ่ม route ใหม่ที่นี่ =============
// GET /api/branch-stock-history/without-receipt => ดึงรายการที่ยังไม่มีใบสำคัญรับเงิน
router.get('/without-receipt', async (req, res) => {
    try {
        const BranchStockHistory = require('../../models/POS/BranchStockHistory'); // แก้ path ตามโครงสร้างจริง

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

module.exports = router;
