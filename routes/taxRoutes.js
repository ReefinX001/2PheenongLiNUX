/**
 * Tax Routes - API endpoints for tax calculations and management
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authJWT');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const CashSale = require('../models/POS/CashSale');

/**
 * GET /api/tax/calculations
 * Get tax calculations and summaries
 */
router.get('/calculations', authenticateToken, async (req, res) => {
  try {
    console.log('🧮 Getting tax calculations...');

    const {
      period = 'monthly',
      year,
      month,
      taxType = 'all',
      format = 'summary'
    } = req.query;

    const currentDate = new Date();
    let startDate, endDate;

    // Calculate date range
    if (period === 'yearly') {
      const targetYear = year ? parseInt(year) : currentDate.getFullYear();
      startDate = new Date(targetYear, 0, 1);
      endDate = new Date(targetYear + 1, 0, 1);
    } else if (period === 'monthly') {
      const targetYear = year ? parseInt(year) : currentDate.getFullYear();
      const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
      startDate = new Date(targetYear, targetMonth, 1);
      endDate = new Date(targetYear, targetMonth + 1, 1);
    } else {
      // Default to current month
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }

    console.log(`📅 Calculating taxes from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Get installment orders for VAT calculation
    const [installmentOrders, cashSales] = await Promise.all([
      InstallmentOrder.find({
        createdAt: { $gte: startDate, $lt: endDate },
        status: { $ne: 'cancelled' }
      }).populate('customer').lean(),

      CashSale.find({
        createdAt: { $gte: startDate, $lt: endDate },
        status: { $ne: 'cancelled' }
      }).populate('customerId').lean()
    ]);

    console.log(`📊 Found ${installmentOrders.length} installment orders and ${cashSales.length} cash sales`);

    // Calculate tax summaries
    let vatCollected = 0;
    let vatPayable = 0;
    let withholdingTax = 0;
    let corporateIncomeTax = 0;
    let totalTaxableAmount = 0;

    const taxDetails = [];

    // Process installment orders
    installmentOrders.forEach(order => {
      const totalAmount = order.finalTotalAmount || order.totalAmount || 0;
      const vatAmount = Math.round(totalAmount * 0.07); // 7% VAT

      vatCollected += vatAmount;
      totalTaxableAmount += totalAmount;

      if (format === 'detailed') {
        taxDetails.push({
          id: order._id,
          type: 'installment',
          documentNo: order.contractNo,
          customerName: order.customer ?
            (order.customer.customerType === 'individual'
              ? `${order.customer.individual?.firstName || ''} ${order.customer.individual?.lastName || ''}`.trim()
              : order.customer.corporate?.companyName || 'บริษัท')
            : (order.customer_info ? `${order.customer_info.firstName || ''} ${order.customer_info.lastName || ''}`.trim() : 'ไม่ระบุ'),
          taxableAmount: totalAmount,
          vatAmount: vatAmount,
          withholdingTax: 0, // Usually 0 for installment sales
          date: order.createdAt,
          status: order.status
        });
      }
    });

    // Process cash sales
    cashSales.forEach(sale => {
      const totalAmount = sale.totalAmount || 0;
      const vatAmount = Math.round(totalAmount * 0.07);

      vatCollected += vatAmount;
      totalTaxableAmount += totalAmount;

      if (format === 'detailed') {
        taxDetails.push({
          id: sale._id,
          type: 'cash_sale',
          documentNo: sale.receiptNumber || sale.saleNumber,
          customerName: sale.customerId ?
            (sale.customerId.customerType === 'individual'
              ? `${sale.customerId.individual?.firstName || ''} ${sale.customerId.individual?.lastName || ''}`.trim()
              : sale.customerId.corporate?.companyName || 'บริษัท')
            : sale.customer?.name || 'ลูกค้าทั่วไป',
          taxableAmount: totalAmount,
          vatAmount: vatAmount,
          withholdingTax: 0,
          date: sale.createdAt,
          status: sale.status
        });
      }
    });

    // Calculate estimated corporate income tax (simplified)
    const grossProfit = totalTaxableAmount * 0.3; // Assume 30% gross profit margin
    corporateIncomeTax = Math.round(grossProfit * 0.20); // 20% corporate tax rate

    const taxSummary = {
      period: period,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: new Date(endDate.getTime() - 1).toISOString().split('T')[0]
      },
      totals: {
        totalTransactions: installmentOrders.length + cashSales.length,
        totalTaxableAmount: Math.round(totalTaxableAmount),
        vatCollected: Math.round(vatCollected),
        vatPayable: Math.round(vatPayable),
        withholdingTax: Math.round(withholdingTax),
        corporateIncomeTax: Math.round(corporateIncomeTax),
        netTaxPayable: Math.round(vatCollected + corporateIncomeTax - withholdingTax)
      },
      breakdown: {
        installmentSales: {
          count: installmentOrders.length,
          amount: installmentOrders.reduce((sum, o) => sum + (o.finalTotalAmount || o.totalAmount || 0), 0),
          vat: Math.round(installmentOrders.reduce((sum, o) => sum + ((o.finalTotalAmount || o.totalAmount || 0) * 0.07), 0))
        },
        cashSales: {
          count: cashSales.length,
          amount: cashSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
          vat: Math.round(cashSales.reduce((sum, s) => sum + ((s.totalAmount || 0) * 0.07), 0))
        }
      }
    };

    if (format === 'detailed') {
      taxSummary.details = taxDetails.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    console.log(`✅ Generated tax calculations for ${taxSummary.totals.totalTransactions} transactions`);

    res.json({
      success: true,
      data: taxSummary
    });

  } catch (error) {
    console.error('❌ Error calculating taxes:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการคำนวณภาษี',
      error: error.message
    });
  }
});

/**
 * GET /api/tax/vat-report
 * Generate VAT report
 */
router.get('/vat-report', authenticateToken, async (req, res) => {
  try {
    const { month, year, format = 'json' } = req.query;

    const targetDate = new Date();
    if (year) targetDate.setFullYear(parseInt(year));
    if (month) targetDate.setMonth(parseInt(month) - 1);

    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);

    // Get all sales data
    const [installments, cashSales] = await Promise.all([
      InstallmentOrder.find({
        createdAt: { $gte: startDate, $lt: endDate },
        status: { $ne: 'cancelled' }
      }).populate('customer').lean(),

      CashSale.find({
        createdAt: { $gte: startDate, $lt: endDate },
        status: { $ne: 'cancelled' }
      }).populate('customerId').lean()
    ]);

    const vatReport = {
      reportPeriod: {
        month: targetDate.getMonth() + 1,
        year: targetDate.getFullYear(),
        monthName: targetDate.toLocaleDateString('th-TH', { month: 'long' })
      },
      summary: {
        totalSales: 0,
        totalVat: 0,
        totalTransactions: installments.length + cashSales.length
      },
      details: []
    };

    // Process all transactions
    const allTransactions = [
      ...installments.map(order => ({
        date: order.createdAt,
        type: 'ขายผ่อน',
        documentNo: order.contractNo,
        customerName: order.customer ?
          (order.customer.customerType === 'individual'
            ? `${order.customer.individual?.firstName || ''} ${order.customer.individual?.lastName || ''}`.trim()
            : order.customer.corporate?.companyName || 'บริษัท')
          : 'ไม่ระบุ',
        customerTaxId: order.customer ?
          (order.customer.customerType === 'individual'
            ? order.customer.individual?.taxId
            : order.customer.corporate?.companyTaxId)
          : '',
        amount: order.finalTotalAmount || order.totalAmount || 0,
        vat: Math.round((order.finalTotalAmount || order.totalAmount || 0) * 0.07)
      })),
      ...cashSales.map(sale => ({
        date: sale.createdAt,
        type: 'ขายสด',
        documentNo: sale.receiptNumber || sale.saleNumber,
        customerName: sale.customerId ?
          (sale.customerId.customerType === 'individual'
            ? `${sale.customerId.individual?.firstName || ''} ${sale.customerId.individual?.lastName || ''}`.trim()
            : sale.customerId.corporate?.companyName || 'บริษัท')
          : sale.customer?.name || 'ลูกค้าทั่วไป',
        customerTaxId: sale.customerId ?
          (sale.customerId.customerType === 'individual'
            ? sale.customerId.individual?.taxId
            : sale.customerId.corporate?.companyTaxId)
          : '',
        amount: sale.totalAmount || 0,
        vat: Math.round((sale.totalAmount || 0) * 0.07)
      }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    vatReport.details = allTransactions;
    vatReport.summary.totalSales = allTransactions.reduce((sum, t) => sum + t.amount, 0);
    vatReport.summary.totalVat = allTransactions.reduce((sum, t) => sum + t.vat, 0);

    if (format === 'csv') {
      const csv = generateVATCSV(vatReport);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="vat-report-${year || targetDate.getFullYear()}-${month || (targetDate.getMonth() + 1)}.csv"`);
      res.send('\uFEFF' + csv); // Add BOM for UTF-8
    } else {
      res.json({
        success: true,
        data: vatReport
      });
    }

  } catch (error) {
    console.error('❌ Error generating VAT report:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างรายงาน VAT',
      error: error.message
    });
  }
});

function generateVATCSV(vatReport) {
  const headers = [
    'วันที่',
    'ประเภท',
    'เลขที่เอกสาร',
    'ชื่อลูกค้า',
    'เลขประจำตัวผู้เสียภาษี',
    'มูลค่าสินค้า',
    'ภาษีมูลค่าเพิ่ม'
  ];

  const rows = vatReport.details.map(detail => [
    new Date(detail.date).toLocaleDateString('th-TH'),
    detail.type,
    detail.documentNo,
    detail.customerName,
    detail.customerTaxId || '-',
    detail.amount,
    detail.vat
  ]);

  // Add summary row
  rows.push([
    '',
    '',
    '',
    'รวมทั้งสิ้น',
    '',
    vatReport.summary.totalSales,
    vatReport.summary.totalVat
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

module.exports = router;