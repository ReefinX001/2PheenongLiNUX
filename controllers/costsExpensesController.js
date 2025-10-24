const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const InstallmentOrder = require('../models/Installment/InstallmentOrder');
const Customer = require('../models/Customer/Customer');
const CostsExpenses = require('../models/CostsExpenses');
const BadDebtController = require('./badDebtController');

// Input sanitization utilities
class SecurityUtils {
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>"'&]/g, (match) => {
      const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
      return entities[match] || match;
    }).trim();
  }

  static validateAmount(amount) {
    const num = Number(amount);
    if (isNaN(num) || num < 0 || num > 999999999) {
      throw new Error('จำนวนเงินไม่ถูกต้อง');
    }
    return Number(num.toFixed(2));
  }

  static validateDate(dateString) {
    if (!dateString) throw new Error('วันที่ไม่ถูกต้อง');
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('รูปแบบวันที่ไม่ถูกต้อง');
    }
    return date;
  }

  static validateObjectId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('รหัสไม่ถูกต้อง');
    }
    return id;
  }

  static validateCostType(type) {
    const validTypes = [
      'downpayment', 'financial', 'installment_start', 'installment_end',
      'tax', 'debt_collection', 'debt_recovery', 'legal_fee',
      'collection_agency', 'asset_recovery', 'administrative',
      'contract_processing', 'expense'
    ];
    if (!validTypes.includes(type)) {
      throw new Error('ประเภทค่าใช้จ่ายไม่ถูกต้อง');
    }
    return type;
  }
}

class CostsExpensesController {

  // -----------------------------------------------------
  // GET /api/costs-expenses
  // ดึงข้อมูลต้นทุนและค่าใช้จ่าย
  // -----------------------------------------------------
  static async getCostsExpenses(req, res) {
    try {
      console.log('🔍 Getting costs and expenses data...');

      // ดึงข้อมูลจาก CostsExpenses model (manual entries)
      const manualCosts = await CostsExpenses.find({})
        .sort({ date: -1 })
        .lean();

      console.log(`📊 Found ${manualCosts.length} manual cost entries`);

      // ดึงข้อมูล InstallmentOrder เพื่อคำนวณต้นทุนและค่าใช้จ่าย
      const orders = await InstallmentOrder.find({})
        .populate('customer')
        .sort({ createdAt: -1 })
        .lean();

      console.log(`📊 Found ${orders.length} installment orders for costs calculation`);

      // แปลงข้อมูลเป็นรายการต้นทุนและค่าใช้จ่าย
      const costsExpenses = [];

      // เพิ่มข้อมูลจาก manual entries
      manualCosts.forEach(cost => {
        costsExpenses.push({
          _id: cost._id.toString(),
          documentNumber: cost.documentNumber || `EX-${new Date(cost.date).getFullYear()}${String(new Date(cost.date).getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
          date: cost.date,
          supplier: {
            name: cost.supplierName || cost.description || 'ไม่ระบุ'
          },
          items: [{
            description: cost.description || 'ค่าใช้จ่ายทั่วไป',
            quantity: 1,
            unitPrice: cost.amount || 0
          }],
          totalBeforeTax: cost.amount || 0,
          totalNet: cost.amount || 0,
          status: cost.status || 'approved',
          type: cost.type,
          note: cost.note || '',
          isManualEntry: true
        });
      });

      orders.forEach(order => {
        // ข้อมูลลูกค้า
        let customerName = 'ไม่ระบุ';
        if (order.customer) {
          const customer = order.customer;
          if (customer.customerType === 'individual') {
            customerName = `${customer.individual?.firstName || ''} ${customer.individual?.lastName || ''}`.trim();
          } else {
            customerName = customer.corporate?.companyName || 'บริษัท';
          }
        } else if (order.customer_info) {
          customerName = `${order.customer_info.firstName || ''} ${order.customer_info.lastName || ''}`.trim();
        }

        const productName = order.items?.[0]?.name || 'ไม่ระบุ';
        const contractValue = order.finalTotalAmount || order.totalAmount || 0;

        // 1. เงินดาวน์/จอง/มัดจำ
        if (order.downPayment > 0) {
          costsExpenses.push({
            _id: `${order._id}_down`,
            documentNumber: order.contractNo || `EX-${new Date(order.createdAt).getFullYear()}${String(new Date(order.createdAt).getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
            date: order.createdAt,
            supplier: {
              name: customerName
            },
            items: [{
              description: `เงินดาวน์ ${productName}`,
              quantity: 1,
              unitPrice: order.downPayment
            }],
            totalBeforeTax: order.downPayment,
            totalNet: order.downPayment,
            status: 'approved',
            type: 'downpayment',
            note: `ลูกค้า: ${customerName}, สัญญา: ${order.contractNo}`,
            orderId: order._id,
            contractNo: order.contractNo
          });
        }

        // 2. ต้นทุนทางการเงิน (ค่าธรรมเนียมเอกสาร)
        if (order.docFee && order.docFee > 0) {
          costsExpenses.push({
            _id: `${order._id}_doc`,
            documentNumber: `DOC-${order.contractNo || new Date(order.createdAt).getFullYear()}`,
            date: order.createdAt,
            supplier: {
              name: 'ค่าธรรมเนียมเอกสาร'
            },
            items: [{
              description: `ค่าธรรมเนียมเอกสาร ${productName}`,
              quantity: 1,
              unitPrice: order.docFee
            }],
            totalBeforeTax: order.docFee,
            totalNet: order.docFee,
            status: 'approved',
            type: 'financial',
            note: `สัญญา: ${order.contractNo}`,
            orderId: order._id,
            contractNo: order.contractNo
          });
        }

        // 3. ต้นทุนขายผ่อนชำระ (ต้นงวด)
        const installmentCost = contractValue - (order.downPayment || 0);
        if (installmentCost > 0) {
          costsExpenses.push({
            _id: `${order._id}_installment`,
            documentNumber: `INS-${order.contractNo || new Date(order.createdAt).getFullYear()}`,
            date: order.createdAt,
            supplier: {
              name: customerName
            },
            items: [{
              description: `ต้นทุนขายผ่อน ${productName}`,
              quantity: 1,
              unitPrice: installmentCost
            }],
            totalBeforeTax: installmentCost,
            totalNet: installmentCost,
            status: 'pending',
            type: 'installment_start',
            note: `ต้นงวด - สัญญา: ${order.contractNo}, ${order.installmentCount || 12} งวด`,
            orderId: order._id,
            contractNo: order.contractNo
          });
        }

        // 4. ภาษีขายยังไม่ถึงกำหนด
        const taxAmount = Math.round(contractValue * 0.07);
        if (!order.taxPaymentDate && taxAmount > 0) {
          const dueDate = new Date(order.createdAt);
          dueDate.setDate(dueDate.getDate() + 30);

          if (dueDate >= new Date()) {
            costsExpenses.push({
              _id: `${order._id}_tax`,
              documentNumber: `TAX-${order.contractNo || new Date(order.createdAt).getFullYear()}`,
              date: order.createdAt,
              supplier: {
                name: 'ภาษีขาย'
              },
              items: [{
                description: `ภาษีขาย ${productName}`,
                quantity: 1,
                unitPrice: taxAmount
              }],
              totalBeforeTax: taxAmount,
              totalNet: taxAmount,
              status: 'pending',
              type: 'tax',
              note: `ยังไม่ถึงกำหนดชำระ - สัญญา: ${order.contractNo}`,
              orderId: order._id,
              contractNo: order.contractNo
            });
          }
        }
      });

      // เรียงลำดับตามวันที่ล่าสุดก่อน
      costsExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

      console.log(`✅ Processed ${costsExpenses.length} costs and expenses records successfully`);

      return res.json({
        success: true,
        data: costsExpenses,
        summary: {
          total: costsExpenses.length,
          downpayment: costsExpenses.filter(c => c.type === 'downpayment').length,
          financial: costsExpenses.filter(c => c.type === 'financial').length,
          installment: costsExpenses.filter(c => c.type.startsWith('installment')).length,
          tax: costsExpenses.filter(c => c.type === 'tax').length,
          totalAmount: costsExpenses.reduce((sum, c) => sum + c.amount, 0)
        }
      });

    } catch (err) {
      console.error('❌ Error in getCostsExpenses:', err);
      return res.status(500).json({
        success: false,
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }

  // -----------------------------------------------------
  // GET /api/costs-expenses/summary
  // ดึงข้อมูลสรุปต้นทุนและค่าใช้จ่าย
  // -----------------------------------------------------
  static async getSummary(req, res) {
    try {
      console.log('🔍 Getting costs and expenses summary...');

      const { period = 'monthly', year, month } = req.query;
      const currentDate = new Date();

      // กำหนด date range ตามรอบเวลาที่เลือก
      let startDate, endDate;

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

      console.log(`📅 Analyzing costs from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

      // ดึงข้อมูล InstallmentOrder ในช่วงเวลาที่กำหนด
      const orders = await InstallmentOrder.find({
        createdAt: { $gte: startDate, $lt: endDate }
      }).populate('customer').lean();

      console.log(`📊 Found ${orders.length} orders in the specified period`);

      // คำนวณสรุปต้นทุนและค่าใช้จ่ายแต่ละประเภท
      const summary = {
        period: period,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: new Date(endDate.getTime() - 1).toISOString().split('T')[0]
        },
        totals: {
          totalOrders: orders.length,
          totalRevenue: 0,
          downpayments: {
            count: 0,
            amount: 0
          },
          financialCosts: {
            count: 0,
            amount: 0
          },
          installmentCosts: {
            count: 0,
            amount: 0
          },
          taxLiabilities: {
            count: 0,
            amount: 0
          },
          totalCosts: 0,
          netProfit: 0
        },
        breakdown: {
          byType: {},
          byBranch: {},
          topContracts: []
        }
      };

      // Process each order
      orders.forEach(order => {
        const contractValue = order.finalTotalAmount || order.totalAmount || 0;
        summary.totals.totalRevenue += contractValue;

        // เงินดาวน์
        if (order.downPayment > 0) {
          summary.totals.downpayments.count += 1;
          summary.totals.downpayments.amount += order.downPayment;
        }

        // ต้นทุนทางการเงิน (ค่าธรรมเนียม)
        if (order.docFee && order.docFee > 0) {
          summary.totals.financialCosts.count += 1;
          summary.totals.financialCosts.amount += order.docFee;
        }

        // ต้นทุนขายผ่อน
        const installmentCost = contractValue - (order.downPayment || 0);
        if (installmentCost > 0) {
          summary.totals.installmentCosts.count += 1;
          summary.totals.installmentCosts.amount += installmentCost;
        }

        // ภาษีขาย
        const taxAmount = Math.round(contractValue * 0.07);
        if (taxAmount > 0) {
          summary.totals.taxLiabilities.count += 1;
          summary.totals.taxLiabilities.amount += taxAmount;
        }

        // Breakdown by branch
        const branchCode = order.branch_code || 'unknown';
        if (!summary.breakdown.byBranch[branchCode]) {
          summary.breakdown.byBranch[branchCode] = {
            orders: 0,
            revenue: 0,
            costs: 0
          };
        }
        summary.breakdown.byBranch[branchCode].orders += 1;
        summary.breakdown.byBranch[branchCode].revenue += contractValue;
        summary.breakdown.byBranch[branchCode].costs += (order.downPayment || 0) + (order.docFee || 0) + installmentCost + taxAmount;

        // Top contracts by value
        summary.breakdown.topContracts.push({
          contractNo: order.contractNo,
          customerName: order.customer ?
            (order.customer.customerType === 'individual'
              ? `${order.customer.individual?.firstName || ''} ${order.customer.individual?.lastName || ''}`.trim()
              : order.customer.corporate?.companyName || 'บริษัท')
            : (order.customer_info ? `${order.customer_info.firstName || ''} ${order.customer_info.lastName || ''}`.trim() : 'ไม่ระบุ'),
          totalAmount: contractValue,
          downPayment: order.downPayment || 0,
          docFee: order.docFee || 0,
          date: order.createdAt
        });
      });

      // คำนวณค่ารวม
      summary.totals.totalCosts =
        summary.totals.downpayments.amount +
        summary.totals.financialCosts.amount +
        summary.totals.installmentCosts.amount +
        summary.totals.taxLiabilities.amount;

      summary.totals.netProfit = summary.totals.totalRevenue - summary.totals.totalCosts;

      // เรียงลำดับ topContracts
      summary.breakdown.topContracts.sort((a, b) => b.totalAmount - a.totalAmount);
      summary.breakdown.topContracts = summary.breakdown.topContracts.slice(0, 10);

      // สร้าง breakdown by type
      summary.breakdown.byType = {
        'เงินดาวน์/จอง/มัดจำ': {
          count: summary.totals.downpayments.count,
          amount: summary.totals.downpayments.amount,
          percentage: summary.totals.totalCosts > 0 ?
            (summary.totals.downpayments.amount / summary.totals.totalCosts * 100).toFixed(2) : 0
        },
        'ต้นทุนทางการเงิน': {
          count: summary.totals.financialCosts.count,
          amount: summary.totals.financialCosts.amount,
          percentage: summary.totals.totalCosts > 0 ?
            (summary.totals.financialCosts.amount / summary.totals.totalCosts * 100).toFixed(2) : 0
        },
        'ต้นทุนขายผ่อน': {
          count: summary.totals.installmentCosts.count,
          amount: summary.totals.installmentCosts.amount,
          percentage: summary.totals.totalCosts > 0 ?
            (summary.totals.installmentCosts.amount / summary.totals.totalCosts * 100).toFixed(2) : 0
        },
        'ภาษีขาย': {
          count: summary.totals.taxLiabilities.count,
          amount: summary.totals.taxLiabilities.amount,
          percentage: summary.totals.totalCosts > 0 ?
            (summary.totals.taxLiabilities.amount / summary.totals.totalCosts * 100).toFixed(2) : 0
        }
      };

      console.log(`✅ Generated costs summary for ${orders.length} orders`);

      return res.json({
        success: true,
        data: summary
      });

    } catch (err) {
      console.error('❌ Error in getSummary:', err);
      return res.status(500).json({
        success: false,
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }

  // -----------------------------------------------------
  // POST /api/costs-expenses
  // เพิ่มรายการต้นทุนและค่าใช้จ่ายใหม่
  // -----------------------------------------------------
  static async addCostExpense(req, res) {
    try {
      // Validate request body size and structure
      if (Object.keys(req.body).length > 20) {
        return res.status(400).json({
          success: false,
          error: 'ข้อมูลมีขนาดใหญ่เกินไป'
        });
      }

      // Handle both old format and new format from expense_record.html
      const rawData = req.body;
      const {
        // New format from expense_record.html
        documentNumber,
        taxInvoiceNumber,
        issueDate,
        dueDate,
        supplier,
        items,
        totalBeforeTax,
        vatAmount,
        totalNet,
        vatRate,
        status,
        // Old format fallback
        type,
        description,
        amount,
        date,
        note
      } = rawData;

      console.log(`🔍 Adding new cost expense:`, req.body);

      // Handle new format from expense_record.html with validation
      if (supplier && items) {
        // Validate and sanitize supplier data
        if (!supplier.name || typeof supplier.name !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'ข้อมูลผู้ขายไม่ถูกต้อง'
          });
        }

        // Validate items array
        if (!Array.isArray(items) || items.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'ข้อมูลรายการไม่ถูกต้อง'
          });
        }

        // Validate amounts
        const validatedTotalNet = SecurityUtils.validateAmount(totalNet || totalBeforeTax || 0);
        const validatedVatAmount = SecurityUtils.validateAmount(vatAmount || 0);
        const validatedVatRate = SecurityUtils.validateAmount(vatRate || 0);

        // Validate date
        const validatedDate = issueDate ? SecurityUtils.validateDate(issueDate) : new Date();
        const validatedDueDate = dueDate ? SecurityUtils.validateDate(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // บันทึกข้อมูลในรูปแบบที่รองรับทั้งสองระบบ
        const newCostExpense = new CostsExpenses({
          documentNumber: SecurityUtils.sanitizeInput(documentNumber) || `EX-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
          taxInvoiceNumber: SecurityUtils.sanitizeInput(taxInvoiceNumber) || '',
          date: validatedDate,
          dueDate: validatedDueDate,
          supplierName: SecurityUtils.sanitizeInput(supplier.name),
          description: SecurityUtils.sanitizeInput(items[0]?.description || 'ค่าใช้จ่ายทั่วไป'),
          amount: validatedTotalNet,
          type: 'expense',
          status: SecurityUtils.sanitizeInput(status) || 'pending',
          note: SecurityUtils.sanitizeInput(note) || SecurityUtils.sanitizeInput(items.map(i => i.description).join(', ')),
          vatRate: validatedVatRate,
          vatAmount: validatedVatAmount,
          createdBy: req.user?._id || req.userId || new mongoose.Types.ObjectId()
        });

        const savedCost = await newCostExpense.save();

        console.log(`✅ Cost expense added with ID: ${savedCost._id}`);

        // Return in the format expected by expense_record.html
        return res.json({
          success: true,
          message: 'เพิ่มรายการค่าใช้จ่ายสำเร็จ',
          data: {
            _id: savedCost._id.toString(),
            documentNumber: savedCost.documentNumber,
            taxInvoiceNumber: savedCost.taxInvoiceNumber,
            date: savedCost.date,
            supplier: {
              name: savedCost.supplierName
            },
            items: items || [{
              description: savedCost.description,
              quantity: 1,
              unitPrice: savedCost.amount
            }],
            totalBeforeTax: totalBeforeTax || savedCost.amount,
            totalNet: savedCost.amount,
            status: savedCost.status,
            isManualEntry: true
          }
        });
      }
      // Handle old format with enhanced validation
      else if (type || description || amount) {
        // Validate required fields for old format
        if (!description || !amount || !date) {
          return res.status(400).json({
            success: false,
            error: 'กรุณากรอกข้อมูลให้ครบถ้วน (รายละเอียด, จำนวนเงิน, วันที่)'
          });
        }

        // Validate and sanitize input data
        const validatedType = SecurityUtils.validateCostType(type || 'expense');
        const validatedAmount = SecurityUtils.validateAmount(amount);
        const validatedDate = SecurityUtils.validateDate(date);
        const sanitizedDescription = SecurityUtils.sanitizeInput(description);
        const sanitizedNote = SecurityUtils.sanitizeInput(note || '');

        // Additional validation for description length
        if (sanitizedDescription.length > 500) {
          return res.status(400).json({
            success: false,
            error: 'รายละเอียดยาวเกินไป (500 ตัวอักษร)'
          });
        }

        const newCostExpense = new CostsExpenses({
          type: validatedType,
          description: sanitizedDescription,
          amount: validatedAmount,
          date: validatedDate,
          note: sanitizedNote,
          status: 'approved',
          createdBy: req.user?._id || req.userId || new mongoose.Types.ObjectId()
        });

        const savedCost = await newCostExpense.save();

        console.log(`✅ Cost expense added: ${description} with ID: ${savedCost._id}`);

        return res.json({
          success: true,
          message: 'เพิ่มรายการต้นทุนและค่าใช้จ่ายสำเร็จ',
          data: {
            _id: savedCost._id.toString(),
            type: savedCost.type,
            description: savedCost.description,
            amount: savedCost.amount,
            date: savedCost.date,
            note: savedCost.note,
            status: savedCost.status,
            isManualEntry: true
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'กรุณากรอกข้อมูลให้ครบถ้วน'
        });
      }

    } catch (err) {
      console.error('❌ Error in addCostExpense:', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  // -----------------------------------------------------
  // DELETE /api/costs-expenses/:id
  // ลบรายการต้นทุนและค่าใช้จ่าย
  // -----------------------------------------------------
  static async deleteCostExpense(req, res) {
    try {
      const { id } = req.params;

      // Validate and sanitize ID parameter
      if (!id || typeof id !== 'string' || id.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'รหัสรายการไม่ถูกต้อง'
        });
      }

      const sanitizedId = SecurityUtils.sanitizeInput(id);
      console.log(`🔍 Deleting cost expense: ${sanitizedId}`);

      // Check user permissions (if user context available)
      if (req.user && req.user.role && !['admin', 'manager', 'accountant'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'คุณไม่มีสิทธิ์ในการลบข้อมูลนี้'
        });
      }

      // ตรวจสอบว่าเป็น ObjectId ที่ถูกต้อง
      if (mongoose.Types.ObjectId.isValid(sanitizedId)) {
        // Check if record exists and user has permission to delete it
        const existingRecord = await CostsExpenses.findById(sanitizedId);
        if (!existingRecord) {
          return res.status(404).json({
            success: false,
            error: 'ไม่พบรายการที่ต้องการลบ'
          });
        }

        // Additional check for critical records
        if (existingRecord.status === 'locked' || existingRecord.isSystemGenerated) {
          return res.status(400).json({
            success: false,
            error: 'ไม่สามารถลบรายการนี้ได้ (ระบบล็อคหรือสร้างโดยระบบ)'
          });
        }

        // ลบจากฐานข้อมูล
        const deleted = await CostsExpenses.findByIdAndDelete(sanitizedId);

        if (deleted) {
          console.log(`✅ Cost expense deleted: ${sanitizedId}`);
          return res.json({
            success: true,
            message: 'ลบรายการสำเร็จ'
          });
        } else {
          return res.status(404).json({
            success: false,
            error: 'ไม่พบรายการที่ต้องการลบ'
          });
        }
      } else if (sanitizedId.includes('_')) {
        // ไม่สามารถลบข้อมูลที่สร้างจาก InstallmentOrder ได้
        return res.status(400).json({
          success: false,
          error: 'ไม่สามารถลบรายการที่สร้างจากระบบอัตโนมัติได้'
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'รหัสรายการไม่ถูกต้อง'
        });
      }

    } catch (err) {
      console.error('❌ Error in deleteCostExpense:', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  // -----------------------------------------------------
  // GET /api/costs-expenses/export
  // ส่งออกรายงานต้นทุนและค่าใช้จ่าย
  // -----------------------------------------------------
  static async exportCostsExpenses(req, res) {
    try {
      console.log('🔍 Exporting costs and expenses report...');

      // ดึงข้อมูลต้นทุนและค่าใช้จ่าย
      const mockReq = { query: {} };
      const mockRes = { json: (data) => data };

      const costsResponse = await CostsExpensesController.getCostsExpenses(mockReq, mockRes);

      if (!costsResponse.success) {
        throw new Error('ไม่สามารถดึงข้อมูลได้');
      }

      const data = costsResponse.data;

      // สร้าง CSV content
      const headers = ['วันที่', 'รายการ', 'ประเภท', 'จำนวนเงิน', 'หมายเหตุ'];
      const typeLabels = {
        downpayment: 'เงินดาวน์/จอง/มัดจำ',
        financial: 'ต้นทุนทางการเงิน',
        installment_start: 'ต้นทุนขายผ่อน - ต้นงวด',
        installment_end: 'ต้นทุนขายผ่อน - ปลายงวด',
        tax: 'ภาษีขายยังไม่ถึงกำหนด'
      };

      const csvContent = [
        headers.join(','),
        ...data.map(item => [
          item.date,
          `"${item.description}"`,
          `"${typeLabels[item.type] || item.type}"`,
          item.amount,
          `"${item.note || '-'}"`
        ].join(','))
      ].join('\n');

      // Add BOM for UTF-8 CSV
      const csvWithBOM = '\uFEFF' + csvContent;

      console.log(`✅ Exported ${data.length} costs and expenses records`);

      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="costs_expenses_${new Date().toISOString().split('T')[0]}.csv"`
      });

      return res.send(csvWithBOM);

    } catch (err) {
      console.error('❌ Error in exportCostsExpenses:', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  // -----------------------------------------------------
  // GET /api/costs-expenses/debt-collection
  // ดึงข้อมูลต้นทุนการติดตามหนี้
  // -----------------------------------------------------
  static async getDebtCollectionCosts(req, res) {
    try {
      console.log('🔍 Getting debt collection costs...');

      const {
        contractId,
        stage,
        startDate,
        endDate,
        customerId,
        includeContractCosts = true
      } = req.query;

      let query = {
        type: { $in: ['debt_collection', 'debt_recovery', 'legal_fee', 'collection_agency', 'asset_recovery'] }
      };

      // Filter by contract if specified
      if (contractId) {
        query.relatedContract = contractId;
      }

      // Filter by customer if specified
      if (customerId) {
        query.customerId = customerId;
      }

      // Filter by collection stage if specified
      if (stage) {
        query.debtCollectionStage = stage;
      }

      // Filter by date range if specified
      if (startDate && endDate) {
        query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }

      // Get debt collection costs
      const debtCosts = await CostsExpenses.find(query)
        .populate('relatedContract', 'contractNo finalTotalAmount')
        .populate('customerId', 'individual.firstName individual.lastName corporate.companyName')
        .sort({ date: -1 })
        .lean();

      console.log(`📊 Found ${debtCosts.length} debt collection cost records`);

      // Transform data for frontend
      const transformedCosts = debtCosts.map(cost => ({
        _id: cost._id.toString(),
        type: cost.type,
        description: cost.description,
        amount: Math.max(0, cost.amount || 0),
        date: cost.date,
        note: cost.note || '',
        contractNo: cost.contractNo || cost.relatedContract?.contractNo,
        customerId: cost.customerId?._id,
        customerName: cost.customerId ?
          (cost.customerId.individual ?
            `${cost.customerId.individual.firstName || ''} ${cost.customerId.individual.lastName || ''}`.trim() :
            cost.customerId.corporate?.companyName || 'ไม่ระบุ') : 'ไม่ระบุ',
        debtCollectionStage: cost.debtCollectionStage,
        collectionAgency: cost.collectionAgency,
        legalProceedingDetails: cost.legalProceedingDetails,
        assetRecoveryDetails: cost.assetRecoveryDetails,
        documentNumber: cost.documentNumber,
        isDebtRelated: true
      }));

      // Calculate summary statistics
      const summary = {
        totalRecords: transformedCosts.length,
        totalAmount: transformedCosts.reduce((sum, cost) => sum + (cost.amount || 0), 0),
        byStage: {},
        byType: {},
        averageCostPerCase: 0
      };

      // Group by stage
      transformedCosts.forEach(cost => {
        const stage = cost.debtCollectionStage || 'unknown';
        const type = cost.type || 'unknown';

        if (!summary.byStage[stage]) {
          summary.byStage[stage] = { count: 0, amount: 0 };
        }
        summary.byStage[stage].count += 1;
        summary.byStage[stage].amount += cost.amount || 0;

        if (!summary.byType[type]) {
          summary.byType[type] = { count: 0, amount: 0 };
        }
        summary.byType[type].count += 1;
        summary.byType[type].amount += cost.amount || 0;
      });

      // Calculate average cost per case
      const uniqueContracts = new Set(transformedCosts.map(c => c.contractNo).filter(Boolean));
      summary.averageCostPerCase = uniqueContracts.size > 0 ?
        summary.totalAmount / uniqueContracts.size : 0;

      return res.json({
        success: true,
        data: transformedCosts,
        summary,
        metadata: {
          query: { contractId, stage, startDate, endDate, customerId },
          includeContractCosts,
          generatedAt: new Date()
        }
      });

    } catch (err) {
      console.error('❌ Error in getDebtCollectionCosts:', err);
      return res.status(500).json({
        success: false,
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }

  // -----------------------------------------------------
  // POST /api/costs-expenses/debt-collection
  // เพิ่มต้นทุนการติดตามหนี้
  // -----------------------------------------------------
  static async addDebtCollectionCost(req, res) {
    try {
      console.log('🔍 Adding debt collection cost:', req.body);

      const {
        contractId,
        contractNo,
        customerId,
        type,
        stage,
        amount,
        description,
        note,
        collectionAgency,
        legalDetails,
        assetRecovery
      } = req.body;

      // Validate required fields
      if (!contractId || !type || !amount || !description) {
        return res.status(400).json({
          success: false,
          error: 'กรุณากรอกข้อมูลให้ครบถ้วน (สัญญา, ประเภท, จำนวนเงิน, รายละเอียด)'
        });
      }

      // Validate contract exists
      const contract = await InstallmentOrder.findById(contractId);
      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบสัญญาที่ระบุ'
        });
      }

      // Create debt collection expense using model method
      const expense = await CostsExpenses.createDebtCollectionExpense({
        contractId,
        contractNo: contractNo || contract.contractNo,
        customerId: customerId || contract.customer,
        stage,
        type,
        amount,
        description,
        note,
        createdBy: req.user?._id || req.userId,
        collectionAgency,
        legalDetails,
        assetRecovery
      });

      console.log(`✅ Debt collection cost added with ID: ${expense._id}`);

      return res.json({
        success: true,
        message: 'เพิ่มต้นทุนการติดตามหนี้สำเร็จ',
        data: {
          _id: expense._id.toString(),
          type: expense.type,
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
          contractNo: expense.contractNo,
          debtCollectionStage: expense.debtCollectionStage,
          documentNumber: expense.documentNumber
        }
      });

    } catch (err) {
      console.error('❌ Error in addDebtCollectionCost:', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  // -----------------------------------------------------
  // GET /api/costs-expenses/contract/:contractId
  // ดึงต้นทุนทั้งหมดที่เกี่ยวข้องกับสัญญา
  // -----------------------------------------------------
  static async getContractCosts(req, res) {
    try {
      const { contractId } = req.params;

      console.log(`🔍 Getting all costs for contract: ${contractId}`);

      // Validate contract exists
      const contract = await InstallmentOrder.findById(contractId)
        .populate('customer')
        .lean();

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'ไม่พบสัญญาที่ระบุ'
        });
      }

      // Get all manual costs related to this contract
      const manualCosts = await CostsExpenses.find({ relatedContract: contractId })
        .sort({ date: -1 })
        .lean();

      // Get auto-generated costs from installment system
      const autoGeneratedCosts = [];

      // 1. Down payment cost
      if (contract.downPayment > 0) {
        autoGeneratedCosts.push({
          _id: `${contract._id}_down`,
          type: 'downpayment',
          description: `เงินดาวน์ ${contract.items?.[0]?.name || 'ไม่ระบุ'}`,
          amount: contract.downPayment,
          date: contract.createdAt,
          note: `สัญญา: ${contract.contractNo}`,
          isAutoGenerated: true
        });
      }

      // 2. Document fee (financial cost)
      if (contract.docFee && contract.docFee > 0) {
        autoGeneratedCosts.push({
          _id: `${contract._id}_doc`,
          type: 'financial',
          description: `ค่าธรรมเนียมเอกสาร ${contract.items?.[0]?.name || 'ไม่ระบุ'}`,
          amount: contract.docFee,
          date: contract.createdAt,
          note: `สัญญา: ${contract.contractNo}`,
          isAutoGenerated: true
        });
      }

      // 3. Installment cost
      const installmentCost = (contract.finalTotalAmount || contract.totalAmount || 0) - (contract.downPayment || 0);
      if (installmentCost > 0) {
        autoGeneratedCosts.push({
          _id: `${contract._id}_installment`,
          type: 'installment_start',
          description: `ต้นทุนขายผ่อน ${contract.items?.[0]?.name || 'ไม่ระบุ'}`,
          amount: installmentCost,
          date: contract.createdAt,
          note: `ต้นงวด - สัญญา: ${contract.contractNo}`,
          isAutoGenerated: true
        });
      }

      // Combine all costs
      const allCosts = [
        ...manualCosts.map(cost => ({
          ...cost,
          _id: cost._id.toString(),
          isAutoGenerated: false,
          isManualEntry: true
        })),
        ...autoGeneratedCosts
      ];

      // Sort by date
      allCosts.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Calculate summary
      const summary = {
        contractNo: contract.contractNo,
        totalCosts: allCosts.reduce((sum, cost) => sum + (cost.amount || 0), 0),
        costBreakdown: {
          downpayment: allCosts.filter(c => c.type === 'downpayment').reduce((sum, c) => sum + (c.amount || 0), 0),
          financial: allCosts.filter(c => c.type === 'financial').reduce((sum, c) => sum + (c.amount || 0), 0),
          installment: allCosts.filter(c => c.type.startsWith('installment')).reduce((sum, c) => sum + (c.amount || 0), 0),
          debtCollection: allCosts.filter(c => ['debt_collection', 'debt_recovery', 'legal_fee'].includes(c.type)).reduce((sum, c) => sum + (c.amount || 0), 0)
        },
        manualEntries: manualCosts.length,
        autoGenerated: autoGeneratedCosts.length
      };

      console.log(`✅ Found ${allCosts.length} costs for contract ${contract.contractNo}`);

      return res.json({
        success: true,
        data: allCosts,
        contract: {
          _id: contract._id,
          contractNo: contract.contractNo,
          totalAmount: contract.finalTotalAmount || contract.totalAmount,
          customerName: contract.customer ?
            (contract.customer.individual ?
              `${contract.customer.individual.firstName || ''} ${contract.customer.individual.lastName || ''}`.trim() :
              contract.customer.corporate?.companyName || 'ไม่ระบุ') : 'ไม่ระบุ'
        },
        summary
      });

    } catch (err) {
      console.error('❌ Error in getContractCosts:', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  // -----------------------------------------------------
  // GET /api/costs-expenses/debt-collection/summary
  // สรุปต้นทุนการติดตามหนี้
  // -----------------------------------------------------
  static async getDebtCollectionSummary(req, res) {
    try {
      console.log('🔍 Getting debt collection summary...');

      const { period = 'monthly', year, month } = req.query;
      const currentDate = new Date();

      // กำหนด date range
      let startDate, endDate;

      if (period === 'yearly') {
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();
        startDate = new Date(targetYear, 0, 1);
        endDate = new Date(targetYear + 1, 0, 1);
      } else {
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();
        const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
        startDate = new Date(targetYear, targetMonth, 1);
        endDate = new Date(targetYear, targetMonth + 1, 1);
      }

      // Get debt collection costs
      const debtCosts = await CostsExpenses.find({
        type: { $in: ['debt_collection', 'debt_recovery', 'legal_fee', 'collection_agency', 'asset_recovery'] },
        date: { $gte: startDate, $lt: endDate }
      }).lean();

      // Calculate summary
      const summary = {
        period,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: new Date(endDate.getTime() - 1).toISOString().split('T')[0]
        },
        totals: {
          totalCases: new Set(debtCosts.map(c => c.relatedContract).filter(Boolean)).size,
          totalCosts: debtCosts.reduce((sum, c) => sum + (c.amount || 0), 0),
          totalActivities: debtCosts.length,
          averageCostPerCase: 0
        },
        byStage: {},
        byType: {},
        trends: {}
      };

      // Calculate averages
      summary.totals.averageCostPerCase = summary.totals.totalCases > 0 ?
        summary.totals.totalCosts / summary.totals.totalCases : 0;

      // Group by stage
      debtCosts.forEach(cost => {
        const stage = cost.debtCollectionStage || 'unknown';
        const type = cost.type || 'unknown';

        if (!summary.byStage[stage]) {
          summary.byStage[stage] = { count: 0, amount: 0 };
        }
        summary.byStage[stage].count += 1;
        summary.byStage[stage].amount += cost.amount || 0;

        if (!summary.byType[type]) {
          summary.byType[type] = { count: 0, amount: 0 };
        }
        summary.byType[type].count += 1;
        summary.byType[type].amount += cost.amount || 0;
      });

      console.log(`✅ Generated debt collection summary for ${summary.totals.totalCases} cases`);

      return res.json({
        success: true,
        data: summary
      });

    } catch (err) {
      console.error('❌ Error in getDebtCollectionSummary:', err);
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
}

module.exports = CostsExpensesController;