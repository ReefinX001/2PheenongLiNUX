const Receipt = require('../models/Receipt');

// Receipt Controller
class ReceiptController {

  // สร้าง Receipt ใหม่
  static async create(req, res) {
    try {
      console.log('📋 Creating new Receipt...');
      console.log('📥 Request body:', JSON.stringify(req.body, null, 2));

      const receiptData = req.body;
      const summary = receiptData.summary || {};
      const branchCode = receiptData.branchCode || '00000';
      const customerKey = (receiptData.customer?.taxId || receiptData.customer?.tax_id || receiptData.customer?.phone || '').toString().replace(/\s+/g, '');
      const subtotal = Number(summary.subtotal ?? receiptData.downPaymentAmount ?? 0);
      const docFee = Number(summary.docFee ?? receiptData.documentFee ?? 0);
      const totalWithTax = Number(summary.totalWithTax ?? (subtotal + docFee));
      const stableIdemKey = [
        'installment',
        branchCode,
        receiptData.contractNo || 'N/A',
        customerKey || 'N/A',
        totalWithTax.toFixed(2),
        docFee.toFixed(2),
        subtotal.toFixed(2)
      ].join('|');

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!receiptData.receiptNumber) {
        return res.status(400).json({
          success: false,
          error: 'Receipt Number is required'
        });
      }

      // Comprehensive idempotency checks
      const incomingKey = receiptData.idempotencyKey;
      let existingReceipt = null;

      // 1. Check by incoming idempotencyKey
      if (incomingKey) {
        existingReceipt = await Receipt.findOne({ idempotencyKey: incomingKey });
      }

      // 2. Check by stable idempotencyKey
      if (!existingReceipt) {
        existingReceipt = await Receipt.findOne({ idempotencyKey: stableIdemKey });
      }

      // 3. Check by contractNo for down_payment_receipt
      if (!existingReceipt && receiptData.receiptType === 'down_payment_receipt' && receiptData.contractNo) {
        existingReceipt = await Receipt.findOne({
          contractNo: receiptData.contractNo,
          receiptType: 'down_payment_receipt'
        }).sort({ createdAt: -1 });
      }

      // 4. Check by receipt number (final fallback)
      if (!existingReceipt && receiptData.receiptNumber) {
        existingReceipt = await Receipt.findOne({
          receiptNumber: receiptData.receiptNumber
        });
      }

      if (existingReceipt) {
        return res.status(200).json({
          success: true,
          message: 'Receipt already exists (idempotent)',
          data: existingReceipt
        });
      }

      // Map core fields and set idempotencyKey
      receiptData.idempotencyKey = incomingKey || stableIdemKey;
      receiptData.downPaymentAmount = (typeof receiptData.downPaymentAmount === 'number') ? receiptData.downPaymentAmount : subtotal;
      receiptData.documentFee = (typeof receiptData.documentFee === 'number') ? receiptData.documentFee : docFee;
      receiptData.taxType = receiptData.taxType && receiptData.taxType !== 'none' ? receiptData.taxType : 'inclusive';

      // สร้าง Receipt ใหม่
      const newReceipt = new Receipt(receiptData);
      const savedReceipt = await newReceipt.save();

      console.log('✅ Receipt created successfully:', savedReceipt._id);

      // 🔄 Non-blocking sync to Receipt Voucher System (for legacy route compatibility)
      try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        const payload = {
          source: 'legacy_receipt_api',
          sourceId: savedReceipt._id,
          documentNumber: `RV-${savedReceipt.receiptNumber}`,
          customerName: savedReceipt.customer?.name || 'ลูกค้าทั่วไป',
          totalAmount: savedReceipt.totalAmount,
          netAmount: savedReceipt.netTotal || savedReceipt.totalAmount || 0,
          vatAmount: savedReceipt.vatAmount || 0,
          paymentMethod: savedReceipt.paymentMethod || 'cash',
          description: `ใบเสร็จรับเงิน เลขที่ ${savedReceipt.receiptNumber}`,
          notes: 'สร้างอัตโนมัติจากระบบ Legacy /api/receipt-legacy',
          metadata: {
            documentType: savedReceipt.documentType || 'RECEIPT',
            documentNumber: savedReceipt.receiptNumber,
            branchCode: savedReceipt.branchCode,
            employeeName: savedReceipt.employeeName,
            contractNo: savedReceipt.contractNo,
            quotationNumber: savedReceipt.quotationNumber,
            taxInvoiceNumber: savedReceipt.taxInvoiceNumber,
            items: (savedReceipt.items || []).map(item => ({
              name: item.name || item.product || 'สินค้า',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || ((item.unitPrice || 0) * (item.quantity || 1))
            }))
          }
        };

        // Fire-and-forget
        (async () => {
          try {
            const response = await fetch(`${baseUrl}/api/receipt-vouchers/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify(payload)
            });
            if (!response.ok) {
              console.warn('⚠️ Receipt Voucher sync failed (HTTP):', response.status);
            } else {
              const result = await response.json();
              console.log('🔗 Synced to Receipt Voucher System:', result?.data?.documentNumber || 'OK');
            }
          } catch (syncErr) {
            console.warn('⚠️ Receipt Voucher sync error:', syncErr.message);
          }
        })();
      } catch (outerSyncErr) {
        console.warn('⚠️ Receipt Voucher sync setup error:', outerSyncErr.message);
      }

      res.status(201).json({
        success: true,
        message: 'Receipt created successfully',
        data: savedReceipt
      });

    } catch (error) {
      console.error('❌ Error creating Receipt:', error);

      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.errors
        });
      }

      if (error.code === 11000) {
        if (error.keyPattern && error.keyPattern.idempotencyKey) {
          try {
            const dup = await Receipt.findOne({ idempotencyKey: (receiptData?.idempotencyKey || stableIdemKey) });
            if (dup) {
              return res.status(200).json({ success: true, message: 'Receipt already exists (dup-key)', data: dup });
            }
          } catch {}
        }
        return res.status(409).json({
          success: false,
          error: 'Duplicate Receipt Number'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // ดึง Receipt ทั้งหมด
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 10, branchCode, customerTaxId, receiptType } = req.query;

      const filter = {};
      if (branchCode) filter.branchCode = branchCode;
      if (customerTaxId) filter['customer.taxId'] = customerTaxId;
      if (receiptType) filter.receiptType = receiptType;

      const receipts = await Receipt
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      const total = await Receipt.countDocuments(filter);

      res.json({
        success: true,
        data: receipts,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: receipts.length,
          totalRecords: total
        }
      });

    } catch (error) {
      console.error('❌ Error fetching Receipts:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // ดึง Receipt ตาม ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const receipt = await Receipt.findById(id);

      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      res.json({
        success: true,
        data: receipt
      });

    } catch (error) {
      console.error('❌ Error fetching Receipt:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // ตรวจสอบใบเสร็จซ้ำ
  static async checkDuplicate(req, res) {
    try {
      const { contractNo } = req.query;

      if (!contractNo) {
        return res.status(400).json({
          success: false,
          error: 'Contract number is required'
        });
      }

      // ค้นหาใบเสร็จที่มี contractNo เดียวกัน
      const existingReceipt = await Receipt.findOne({ contractNo });

      if (existingReceipt) {
        return res.json({
          exists: true,
          data: {
            id: existingReceipt._id,
            receiptNumber: existingReceipt.receiptNumber,
            contractNo: existingReceipt.contractNo,
            createdAt: existingReceipt.createdAt
          }
        });
      } else {
        return res.json({
          exists: false
        });
      }
    } catch (error) {
      console.error('Error checking duplicate receipt:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ดึง Receipt ตามเลขที่
  static async getByNumber(req, res) {
    try {
      const { number } = req.params;

      const receipt = await Receipt.findOne({
        receiptNumber: number
      });

      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      res.json({
        success: true,
        data: receipt
      });

    } catch (error) {
      console.error('❌ Error fetching Receipt by number:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // อัปเดต Receipt
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // เพิ่ม updatedAt
      updateData.updatedAt = new Date();

      const updatedReceipt = await Receipt.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedReceipt) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      console.log('✅ Receipt updated successfully:', updatedReceipt._id);

      res.json({
        success: true,
        message: 'Receipt updated successfully',
        data: updatedReceipt
      });

    } catch (error) {
      console.error('❌ Error updating Receipt:', error);

      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // ลบ Receipt
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const deletedReceipt = await Receipt.findByIdAndDelete(id);

      if (!deletedReceipt) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      console.log('✅ Receipt deleted successfully:', deletedReceipt._id);

      res.json({
        success: true,
        message: 'Receipt deleted successfully',
        data: { id: deletedReceipt._id }
      });

    } catch (error) {
      console.error('❌ Error deleting Receipt:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }

  // สถิติ Receipt
  static async getStatistics(req, res) {
    try {
      const { branchCode, startDate, endDate } = req.query;

      const filter = {};
      if (branchCode) filter.branchCode = branchCode;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const stats = await Receipt.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            totalDownPayment: { $sum: '$downPaymentAmount' },
            avgAmount: { $avg: '$totalAmount' }
          }
        }
      ]);

      const byBranch = await Receipt.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$branchCode',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const byReceiptType = await Receipt.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$receiptType',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const byPaymentMethod = await Receipt.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      res.json({
        success: true,
        data: {
          overall: stats[0] || {
            totalCount: 0,
            totalAmount: 0,
            totalDownPayment: 0,
            avgAmount: 0
          },
          byBranch,
          byReceiptType,
          byPaymentMethod
        }
      });

    } catch (error) {
      console.error('❌ Error fetching Receipt statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
}

module.exports = ReceiptController;
