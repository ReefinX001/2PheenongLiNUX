const PurchaseTaxInvoice = require('../models/PurchaseTaxInvoice');

// Helper function to calculate item amounts
const calculateItemAmounts = (item) => {
  const subtotal = item.quantity * item.unitPrice;
  const discountAmount = item.discount || 0;
  const subtotalAfterDiscount = subtotal - discountAmount;

  let vatAmount = 0;
  let totalAmount = subtotalAfterDiscount;

  if (item.taxType === 'vat') {
    vatAmount = subtotalAfterDiscount * (item.vatRate / 100);
    totalAmount = subtotalAfterDiscount + vatAmount;
  }

  return {
    ...item,
    subtotal,
    vatAmount,
    totalAmount
  };
};

class PurchaseTaxInvoiceController {
  // Create new Purchase Tax Invoice
  async create(req, res) {
    try {
      const data = req.body;

      // Handle supplier data - if supplier is just an ID, fetch full supplier info
      if (data.supplier && typeof data.supplier === 'string') {
        try {
          const Contact = require('../models/contactsModel');
          const supplierData = await Contact.findById(data.supplier);

          if (supplierData) {
            data.supplier = {
              supplierId: supplierData._id,
              name: supplierData.displayName || supplierData.corporate?.companyName || '',
              taxId: supplierData.taxId || '',
              branchCode: supplierData.corporate?.branchCode || '',
              address: supplierData.address?.fullAddress || '',
              phone: supplierData.phone || '',
              email: supplierData.email || ''
            };
          } else {
            return res.status(400).json({
              success: false,
              message: 'ไม่พบข้อมูลผู้ขาย'
            });
          }
        } catch (error) {
          console.error('Error fetching supplier:', error);
          return res.status(400).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ขาย'
          });
        }
      }

      // Transform items to match model schema
      if (data.items && data.items.length > 0) {
        data.items = data.items.map(item => {
          // Handle both 'description' and 'name' fields
          const itemData = {
            name: item.name || item.description || '',
            description: item.description || item.name || '',
            quantity: parseFloat(item.quantity || 0),
            unit: item.unit || 'ชิ้น',
            unitPrice: parseFloat(item.unitPrice || 0),
            discount: parseFloat(item.discount || 0),
            taxType: item.taxType || 'vat',
            vatRate: parseFloat(item.vatRate || 7)
          };

          return calculateItemAmounts(itemData);
        });
      }

      // Generate invoice number if not provided
      if (!data.invoiceNumber) {
        data.invoiceNumber = await PurchaseTaxInvoice.generateInvoiceNumber();
      }

      // Set created by
      if (req.user) {
        data.createdBy = req.user._id || req.user.id;
      }

      const invoice = new PurchaseTaxInvoice(data);
      await invoice.save();

      res.status(201).json({
        success: true,
        message: 'สร้างใบกำกับภาษีซื้อสำเร็จ',
        data: invoice
      });
    } catch (error) {
      console.error('Error creating purchase tax invoice:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างใบกำกับภาษีซื้อ',
        error: error.message
      });
    }
  }

  // Get all Purchase Tax Invoices with pagination and filters
  async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        status = '',
        paymentStatus = '',
        startDate = '',
        endDate = '',
        supplierId = '',
        sortBy = 'issueDate',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      const query = {};

      // Search filter
      if (search) {
        query.$or = [
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { voucherNumber: { $regex: search, $options: 'i' } },
          { 'supplier.name': { $regex: search, $options: 'i' } },
          { 'supplier.taxId': { $regex: search, $options: 'i' } }
        ];
      }

      // Status filter
      if (status) {
        query.status = status;
      }

      // Payment status filter
      if (paymentStatus) {
        query.paymentStatus = paymentStatus;
      }

      // Date range filter
      if (startDate || endDate) {
        query.issueDate = {};
        if (startDate) query.issueDate.$gte = new Date(startDate);
        if (endDate) query.issueDate.$lte = new Date(endDate);
      }

      // Supplier filter
      if (supplierId) {
        query['supplier.supplierId'] = supplierId;
      }

      // Sorting
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const [invoices, total] = await Promise.all([
        PurchaseTaxInvoice.find(query)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .populate('supplier.supplierId', 'name taxId')
          .populate('createdBy', 'name email')
          .lean(),
        PurchaseTaxInvoice.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: invoices,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching purchase tax invoices:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบกำกับภาษีซื้อ',
        error: error.message
      });
    }
  }

  // Get Purchase Tax Invoice by ID
  async getById(req, res) {
    try {
      const { id } = req.params;

      const invoice = await PurchaseTaxInvoice.findById(id)
        .populate('supplier.supplierId')
        .populate('purchaseOrder')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('approvedBy', 'name email');

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบกำกับภาษีซื้อ'
        });
      }

      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      console.error('Error fetching purchase tax invoice:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบกำกับภาษีซื้อ',
        error: error.message
      });
    }
  }

  // Get Purchase Tax Invoice by invoice number
  async getByInvoiceNumber(req, res) {
    try {
      const { invoiceNumber } = req.params;

      const invoice = await PurchaseTaxInvoice.findOne({ invoiceNumber })
        .populate('supplier.supplierId')
        .populate('purchaseOrder')
        .populate('createdBy', 'name email');

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบกำกับภาษีซื้อ'
        });
      }

      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      console.error('Error fetching purchase tax invoice by number:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบกำกับภาษีซื้อ',
        error: error.message
      });
    }
  }

  // Update Purchase Tax Invoice
  async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      // Check if invoice exists
      const invoice = await PurchaseTaxInvoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบกำกับภาษีซื้อ'
        });
      }

      // Check if invoice is editable
      if (invoice.status === 'void' || invoice.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถแก้ไขใบกำกับภาษีซื้อที่ถูกยกเลิกหรือเป็นโมฆะได้'
        });
      }

      // Handle supplier data - if supplier is just an ID, fetch full supplier info
      if (data.supplier && typeof data.supplier === 'string') {
        try {
          const Contact = require('../models/contactsModel');
          const supplierData = await Contact.findById(data.supplier);

          if (supplierData) {
            data.supplier = {
              supplierId: supplierData._id,
              name: supplierData.displayName || supplierData.corporate?.companyName || '',
              taxId: supplierData.taxId || '',
              branchCode: supplierData.corporate?.branchCode || '',
              address: supplierData.address?.fullAddress || '',
              phone: supplierData.phone || '',
              email: supplierData.email || ''
            };
          }
        } catch (error) {
          console.error('Error fetching supplier:', error);
        }
      }

      // Transform items to match model schema
      if (data.items && data.items.length > 0) {
        data.items = data.items.map(item => {
          // Handle both 'description' and 'name' fields
          const itemData = {
            name: item.name || item.description || '',
            description: item.description || item.name || '',
            quantity: parseFloat(item.quantity || 0),
            unit: item.unit || 'ชิ้น',
            unitPrice: parseFloat(item.unitPrice || 0),
            discount: parseFloat(item.discount || 0),
            taxType: item.taxType || 'vat',
            vatRate: parseFloat(item.vatRate || 7)
          };

          return calculateItemAmounts(itemData);
        });
      }

      // Set updated by
      if (req.user) {
        data.updatedBy = req.user._id || req.user.id;
      }

      // Update invoice
      Object.assign(invoice, data);
      await invoice.save();

      res.json({
        success: true,
        message: 'อัพเดทใบกำกับภาษีซื้อสำเร็จ',
        data: invoice
      });
    } catch (error) {
      console.error('Error updating purchase tax invoice:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัพเดทใบกำกับภาษีซื้อ',
        error: error.message
      });
    }
  }

  // Delete Purchase Tax Invoice (soft delete by changing status)
  async delete(req, res) {
    try {
      const { id } = req.params;

      const invoice = await PurchaseTaxInvoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบกำกับภาษีซื้อ'
        });
      }

      // Soft delete by changing status
      invoice.status = 'void';
      if (req.user) {
        invoice.updatedBy = req.user._id || req.user.id;
      }
      await invoice.save();

      res.json({
        success: true,
        message: 'ลบใบกำกับภาษีซื้อสำเร็จ'
      });
    } catch (error) {
      console.error('Error deleting purchase tax invoice:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการลบใบกำกับภาษีซื้อ',
        error: error.message
      });
    }
  }

  // Update payment status
  async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const { paidAmount, paymentDate, paymentMethod, notes } = req.body;

      const invoice = await PurchaseTaxInvoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบกำกับภาษีซื้อ'
        });
      }

      invoice.paidAmount = paidAmount;
      invoice.paymentDate = paymentDate || new Date();
      if (paymentMethod) invoice.paymentMethod = paymentMethod;
      if (notes) invoice.notes = notes;

      if (req.user) {
        invoice.updatedBy = req.user._id || req.user.id;
      }

      await invoice.save();

      res.json({
        success: true,
        message: 'อัพเดทสถานะการชำระเงินสำเร็จ',
        data: invoice
      });
    } catch (error) {
      console.error('Error updating payment:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัพเดทสถานะการชำระเงิน',
        error: error.message
      });
    }
  }

  // Get statistics
  async getStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const dateFilter = {};
      if (startDate || endDate) {
        dateFilter.issueDate = {};
        if (startDate) dateFilter.issueDate.$gte = new Date(startDate);
        if (endDate) dateFilter.issueDate.$lte = new Date(endDate);
      }

      const [
        totalInvoices,
        totalAmount,
        paidInvoices,
        unpaidInvoices,
        overdueInvoices,
        statusBreakdown,
        paymentStatusBreakdown
      ] = await Promise.all([
        PurchaseTaxInvoice.countDocuments({ ...dateFilter, status: { $ne: 'void' } }),
        PurchaseTaxInvoice.aggregate([
          { $match: { ...dateFilter, status: { $ne: 'void' } } },
          { $group: { _id: null, total: { $sum: '$summary.totalAmount' } } }
        ]),
        PurchaseTaxInvoice.countDocuments({ ...dateFilter, paymentStatus: 'paid' }),
        PurchaseTaxInvoice.countDocuments({ ...dateFilter, paymentStatus: 'unpaid' }),
        PurchaseTaxInvoice.countDocuments({ ...dateFilter, paymentStatus: 'overdue' }),
        PurchaseTaxInvoice.aggregate([
          { $match: dateFilter },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        PurchaseTaxInvoice.aggregate([
          { $match: { ...dateFilter, status: { $ne: 'void' } } },
          { $group: { _id: '$paymentStatus', count: { $sum: 1 }, total: { $sum: '$summary.totalAmount' } } }
        ])
      ]);

      res.json({
        success: true,
        data: {
          totalInvoices,
          totalAmount: totalAmount[0]?.total || 0,
          paidInvoices,
          unpaidInvoices,
          overdueInvoices,
          statusBreakdown,
          paymentStatusBreakdown
        }
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ',
        error: error.message
      });
    }
  }

  // Approve invoice
  async approve(req, res) {
    try {
      const { id } = req.params;

      const invoice = await PurchaseTaxInvoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบกำกับภาษีซื้อ'
        });
      }

      invoice.status = 'approved';
      invoice.approvedAt = new Date();
      if (req.user) {
        invoice.approvedBy = req.user._id || req.user.id;
      }

      await invoice.save();

      res.json({
        success: true,
        message: 'อนุมัติใบกำกับภาษีซื้อสำเร็จ',
        data: invoice
      });
    } catch (error) {
      console.error('Error approving invoice:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอนุมัติใบกำกับภาษีซื้อ',
        error: error.message
      });
    }
  }

  // Cancel invoice
  async cancel(req, res) {
    try {
      const { id } = req.params;
      const { cancelReason } = req.body;

      const invoice = await PurchaseTaxInvoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบใบกำกับภาษีซื้อ'
        });
      }

      invoice.status = 'cancelled';
      invoice.cancelReason = cancelReason;
      if (req.user) {
        invoice.updatedBy = req.user._id || req.user.id;
      }

      await invoice.save();

      res.json({
        success: true,
        message: 'ยกเลิกใบกำกับภาษีซื้อสำเร็จ',
        data: invoice
      });
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการยกเลิกใบกำกับภาษีซื้อ',
        error: error.message
      });
    }
  }
}

module.exports = new PurchaseTaxInvoiceController();
