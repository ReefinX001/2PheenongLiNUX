// controllers/POS/paymentVoucherController.js
const PaymentVoucher = require('../../models/POS/PaymentVoucher');
const BranchStock = require('../../models/POS/BranchStock');
const User = require('../../models/User/User');

class PaymentVoucherController {

  // GET /api/pos/payment-vouchers - Get all payment vouchers
  async getAllVouchers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        paymentType,
        startDate,
        endDate,
        search,
        branch
      } = req.query;

      // Build filter
      const filter = {};

      if (status && status !== 'all') {
        filter.status = status;
      }

      if (paymentType && paymentType !== 'all') {
        filter.paymentType = paymentType;
      }

      if (branch && branch !== 'all') {
        filter.branch = branch;
      }

      if (startDate && endDate) {
        filter.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      if (search) {
        filter.$or = [
          { voucherNumber: { $regex: search, $options: 'i' } },
          { payee: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } }
        ];
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const vouchers = await PaymentVoucher.find(filter)
        .populate({
          path: 'createdBy',
          select: 'name username email employee',
          populate: {
            path: 'employee',
            select: 'name employeeId position department'
          }
        })
        .populate({
          path: 'approvedBy',
          select: 'name username email employee',
          populate: {
            path: 'employee',
            select: 'name employeeId position department'
          }
        })
        .populate({
          path: 'paidBy',
          select: 'name username email employee',
          populate: {
            path: 'employee',
            select: 'name employeeId position department'
          }
        })
        .populate('branch', 'name branch_code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const total = await PaymentVoucher.countDocuments(filter);

      // Calculate summary
      const summary = await PaymentVoucher.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            totalVouchers: { $sum: 1 },
            pendingAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'pending'] }, '$totalAmount', 0]
              }
            },
            approvedAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'approved'] }, '$totalAmount', 0]
              }
            },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0]
              }
            }
          }
        }
      ]);

      res.json({
        success: true,
        data: vouchers,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total: total,
          limit: parseInt(limit)
        },
        summary: summary[0] || {
          totalAmount: 0,
          totalVouchers: 0,
          pendingAmount: 0,
          approvedAmount: 0,
          paidAmount: 0
        }
      });

    } catch (error) {
      console.error('Error fetching payment vouchers:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบสำคัญจ่าย',
        error: error.message
      });
    }
  }

  // GET /api/pos/payment-vouchers/:id - Get voucher by ID
  async getVoucherById(req, res) {
    try {
      const voucher = await PaymentVoucher.findById(req.params.id)
        .populate('createdBy', 'name username email')
        .populate('approvedBy', 'name username email')
        .populate('paidBy', 'name username email')
        .populate('branch', 'name branch_code')
        .populate('items.productId', 'name code category');

      if (!voucher) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบสำคัญจ่าย'
        });
      }

      res.json({
        success: true,
        data: voucher
      });

    } catch (error) {
      console.error('Error fetching payment voucher:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบสำคัญจ่าย',
        error: error.message
      });
    }
  }

  // POST /api/pos/payment-vouchers - Create new voucher
  async createVoucher(req, res) {
    try {
      const {
        date,
        paymentType,
        payee,
        items,
        discount = 0,
        discountType = 'amount',
        vatRate = 7,
        taxType = 'exclude_tax',
        paymentMethod,
        paymentDetails,
        notes,
        branch
      } = req.body;

      // Validate required fields
      if (!payee || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'กรุณากรอกข้อมูลผู้รับเงินและรายการสินค้า'
        });
      }

      // Validate and process items
      const processedItems = [];
      for (const item of items) {
        if (!item.productName || !item.quantity || !item.unitPrice) {
          return res.status(400).json({
            success: false,
            message: 'กรุณากรอกข้อมูลรายการสินค้าให้ครบถ้วน'
          });
        }

        processedItems.push({
          productId: item.productId || null,
          productName: item.productName,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          totalPrice: parseFloat(item.quantity) * parseFloat(item.unitPrice),
          description: item.description || ''
        });
      }

      // Calculate totals
      const subtotal = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);

      // Calculate discount amount
      const discountValue = parseFloat(discount) || 0;
      let discountAmount = 0;
      if (discountValue > 0) {
        if (discountType === 'percent') {
          discountAmount = (subtotal * discountValue) / 100;
        } else {
          discountAmount = discountValue;
        }
      }

      const afterDiscount = subtotal - discountAmount;

      // Calculate VAT
      const vatRateValue = parseFloat(vatRate) || 0;
      let vatAmount = 0;
      let totalAmount = afterDiscount;

      if (taxType === 'no_tax') {
        vatAmount = 0;
        totalAmount = afterDiscount;
      } else if (taxType === 'exclude_tax') {
        vatAmount = (afterDiscount * vatRateValue) / 100;
        totalAmount = afterDiscount + vatAmount;
      } else if (taxType === 'include_tax') {
        vatAmount = afterDiscount - (afterDiscount / (1 + vatRateValue / 100));
        totalAmount = afterDiscount;
      }

      // Create voucher
      const voucherData = {
        date: date ? new Date(date) : new Date(),
        paymentType: paymentType || 'expense',
        payee,
        items: processedItems,
        subtotal: Math.round(subtotal * 100) / 100,
        discount: discountValue,
        discountType,
        vatAmount: Math.round(vatAmount * 100) / 100,
        vatRate: vatRateValue,
        taxType,
        totalAmount: Math.round(totalAmount * 100) / 100,
        paymentMethod: paymentMethod || 'cash',
        paymentDetails: paymentDetails || {},
        notes: notes || '',
        branch: branch || req.user?.branch,
        createdBy: req.user.id,
        status: 'draft'
      };

      const voucher = new PaymentVoucher(voucherData);
      await voucher.save();

      // Populate the created voucher
      await voucher.populate('createdBy', 'name username email');
      await voucher.populate('branch', 'name branch_code');

      res.status(201).json({
        success: true,
        message: 'สร้างใบสำคัญจ่ายสำเร็จ',
        data: voucher
      });

    } catch (error) {
      console.error('Error creating payment voucher:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างใบสำคัญจ่าย',
        error: error.message
      });
    }
  }

  // PUT /api/pos/payment-vouchers/:id - Update voucher
  async updateVoucher(req, res) {
    try {
      const voucher = await PaymentVoucher.findById(req.params.id);

      if (!voucher) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบสำคัญจ่าย'
        });
      }

      // Check if voucher can be updated
      if (voucher.status === 'paid' || voucher.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถแก้ไขใบสำคัญจ่ายที่จ่ายเงินแล้วหรือยกเลิกแล้ว'
        });
      }

      const {
        date,
        paymentType,
        payee,
        items,
        discount,
        discountType,
        vatRate,
        taxType,
        paymentMethod,
        paymentDetails,
        notes
      } = req.body;

      // Update fields
      if (date) voucher.date = new Date(date);
      if (paymentType) voucher.paymentType = paymentType;
      if (payee) voucher.payee = payee;

      let processedItems = voucher.items;
      if (items && Array.isArray(items)) {
        // Process items
        processedItems = items.map(item => ({
          productId: item.productId || null,
          productName: item.productName,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          totalPrice: parseFloat(item.quantity) * parseFloat(item.unitPrice),
          description: item.description || ''
        }));
        voucher.items = processedItems;
      }

      if (discount !== undefined) voucher.discount = parseFloat(discount);
      if (discountType) voucher.discountType = discountType;
      if (vatRate !== undefined) voucher.vatRate = parseFloat(vatRate);
      if (taxType) voucher.taxType = taxType;
      if (paymentMethod) voucher.paymentMethod = paymentMethod;
      if (paymentDetails) voucher.paymentDetails = paymentDetails;
      if (notes !== undefined) voucher.notes = notes;

      // Recalculate totals
      const subtotal = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);

      // Calculate discount amount
      const discountValue = voucher.discount || 0;
      let discountAmount = 0;
      if (discountValue > 0) {
        if (voucher.discountType === 'percent') {
          discountAmount = (subtotal * discountValue) / 100;
        } else {
          discountAmount = discountValue;
        }
      }

      const afterDiscount = subtotal - discountAmount;

      // Calculate VAT
      const vatRateValue = voucher.vatRate || 0;
      let vatAmount = 0;
      let totalAmount = afterDiscount;

      if (voucher.taxType === 'no_tax') {
        vatAmount = 0;
        totalAmount = afterDiscount;
      } else if (voucher.taxType === 'exclude_tax') {
        vatAmount = (afterDiscount * vatRateValue) / 100;
        totalAmount = afterDiscount + vatAmount;
      } else if (voucher.taxType === 'include_tax') {
        vatAmount = afterDiscount - (afterDiscount / (1 + vatRateValue / 100));
        totalAmount = afterDiscount;
      }

      // Update calculated fields
      voucher.subtotal = Math.round(subtotal * 100) / 100;
      voucher.vatAmount = Math.round(vatAmount * 100) / 100;
      voucher.totalAmount = Math.round(totalAmount * 100) / 100;

      voucher.updatedBy = req.user.id;

      await voucher.save();

      // Populate the updated voucher
      await voucher.populate('createdBy', 'name username email');
      await voucher.populate('updatedBy', 'name username email');
      await voucher.populate('branch', 'name branch_code');

      res.json({
        success: true,
        message: 'อัปเดตใบสำคัญจ่ายสำเร็จ',
        data: voucher
      });

    } catch (error) {
      console.error('Error updating payment voucher:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตใบสำคัญจ่าย',
        error: error.message
      });
    }
  }

  // PATCH /api/pos/payment-vouchers/:id/approve - Approve voucher
  async approveVoucher(req, res) {
    try {
      const voucher = await PaymentVoucher.findById(req.params.id);

      if (!voucher) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบสำคัญจ่าย'
        });
      }

      if (voucher.status !== 'pending' && voucher.status !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถอนุมัติใบสำคัญจ่ายในสถานะนี้ได้'
        });
      }

      await voucher.approve(req.user.id);

      await voucher.populate('approvedBy', 'name username email');

      res.json({
        success: true,
        message: 'อนุมัติใบสำคัญจ่ายสำเร็จ',
        data: voucher
      });

    } catch (error) {
      console.error('Error approving payment voucher:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอนุมัติใบสำคัญจ่าย',
        error: error.message
      });
    }
  }

  // PATCH /api/pos/payment-vouchers/:id/pay - Mark as paid
  async markAsPaid(req, res) {
    try {
      const voucher = await PaymentVoucher.findById(req.params.id);

      if (!voucher) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบสำคัญจ่าย'
        });
      }

      if (voucher.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถจ่ายเงินใบสำคัญจ่ายที่ยังไม่ได้อนุมัติ'
        });
      }

      await voucher.markAsPaid(req.user.id);

      await voucher.populate('paidBy', 'name username email');

      res.json({
        success: true,
        message: 'บันทึกการจ่ายเงินสำเร็จ',
        data: voucher
      });

    } catch (error) {
      console.error('Error marking payment voucher as paid:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการบันทึกการจ่ายเงิน',
        error: error.message
      });
    }
  }

  // PATCH /api/pos/payment-vouchers/:id/cancel - Cancel voucher
  async cancelVoucher(req, res) {
    try {
      const voucher = await PaymentVoucher.findById(req.params.id);

      if (!voucher) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบสำคัญจ่าย'
        });
      }

      if (voucher.status === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถยกเลิกใบสำคัญจ่ายที่จ่ายเงินแล้ว'
        });
      }

      await voucher.cancel();

      res.json({
        success: true,
        message: 'ยกเลิกใบสำคัญจ่ายสำเร็จ',
        data: voucher
      });

    } catch (error) {
      console.error('Error cancelling payment voucher:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการยกเลิกใบสำคัญจ่าย',
        error: error.message
      });
    }
  }

  // DELETE /api/pos/payment-vouchers/:id - Delete voucher
  async deleteVoucher(req, res) {
    try {
      const voucher = await PaymentVoucher.findById(req.params.id);

      if (!voucher) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบสำคัญจ่าย'
        });
      }

      if (voucher.status === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถลบใบสำคัญจ่ายที่จ่ายเงินแล้ว'
        });
      }

      await PaymentVoucher.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'ลบใบสำคัญจ่ายสำเร็จ'
      });

    } catch (error) {
      console.error('Error deleting payment voucher:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบใบสำคัญจ่าย',
        error: error.message
      });
    }
  }

  // GET /api/pos/payment-vouchers/products - Get products for voucher
  async getProducts(req, res) {
    try {
      const { search, branch } = req.query;

      const filter = {};

      if (branch && branch !== 'all') {
        filter.branch_code = branch;
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { barcode: { $regex: search, $options: 'i' } }
        ];
      }

      const products = await BranchStock.find(filter)
        .select('name code barcode price cost categoryGroup supplier')
        .populate('categoryGroup', 'name')
        .populate('supplier', 'name')
        .limit(50)
        .sort({ name: 1 });

      res.json({
        success: true,
        data: products
      });

    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า',
        error: error.message
      });
    }
  }

}

module.exports = new PaymentVoucherController();
