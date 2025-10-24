/**
 * controllers/SalesCreditNoteController.js - Controller สำหรับจัดการใบลดหนี้การขาย
 */

const SalesCreditNote = require('../models/SalesCreditNote');
const Customer = require('../models/Customer/Customer');

/**
 * Helper function to add displayName to customer object
 */
function addCustomerDisplayName(customer) {
  if (!customer) return customer;

  if (customer.customerType === 'individual') {
    const individual = customer.individual || {};
    customer.displayName = `${individual.prefix || ''} ${individual.firstName || ''} ${individual.lastName || ''}`.trim();
  } else if (customer.customerType === 'corporate') {
    const corporate = customer.corporate || {};
    customer.displayName = corporate.companyName || '';
  }

  if (!customer.displayName || customer.displayName === '') {
    customer.displayName = 'ไม่ระบุชื่อ';
  }

  return customer;
}

/**
 * GET /api/sales-credit-notes
 * ดึงรายการใบลดหนี้ (พร้อม pagination และ filter)
 */
exports.getCreditNotes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      customer,
      dateFrom,
      dateTo,
      search
    } = req.query;

    // สร้าง filter
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (customer) {
      filter.customer = customer;
    }

    if (dateFrom || dateTo) {
      filter.issueDate = {};
      if (dateFrom) filter.issueDate.$gte = new Date(dateFrom);
      if (dateTo) filter.issueDate.$lte = new Date(dateTo);
    }

    if (search) {
      filter.$or = [
        { creditNoteNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { referenceDocument: { $regex: search, $options: 'i' } }
      ];
    }

    // คำนวณ pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ดึงข้อมูล
    const creditNotes = await SalesCreditNote.find(filter)
      .populate('customer', 'customerType individual corporate contactPhone contactEmail')
      .populate('createdBy', 'name username')
      .populate('approvedBy', 'name username')
      .populate('rejectedBy', 'name username')
      .sort({ issueDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // นับจำนวนทั้งหมด
    const total = await SalesCreditNote.countDocuments(filter);

    // คำนวณสถิติ
    const stats = await SalesCreditNote.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Transform data และเพิ่ม displayName manually
    const transformedCreditNotes = creditNotes.map(note => {
      const noteObj = note.toObject();
      noteObj.customer = addCustomerDisplayName(noteObj.customer);
      return noteObj;
    });

    const pagination = {
      current: parseInt(page),
      pageSize: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    };

    res.json({
      success: true,
      data: transformedCreditNotes,
      pagination,
      stats
    });

  } catch (error) {
    console.error('getCreditNotes error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get credit notes'
    });
  }
};

/**
 * GET /api/sales-credit-notes/:id
 * ดึงใบลดหนี้ตาม ID
 */
exports.getCreditNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    const creditNote = await SalesCreditNote.findById(id)
      .populate('customer', 'customerType individual corporate contactPhone contactEmail')
      .populate('createdBy', 'name username')
      .populate('approvedBy', 'name username')
      .populate('rejectedBy', 'name username');

    if (!creditNote) {
      return res.status(404).json({
        success: false,
        error: 'Credit note not found'
      });
    }

    // Transform และเพิ่ม displayName manually
    const noteObj = creditNote.toObject();
    noteObj.customer = addCustomerDisplayName(noteObj.customer);

    res.json({
      success: true,
      data: noteObj
    });

  } catch (error) {
    console.error('getCreditNoteById error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get credit note'
    });
  }
};

/**
 * POST /api/sales-credit-notes
 * สร้างใบลดหนี้ใหม่
 */
exports.createCreditNote = async (req, res) => {
  try {
    console.log('🔍 Received credit note request body:', req.body);

    const {
      customer,
      creditAmount,
      reason,
      reasonText,
      notes,
      referenceDocument,
      relatedProduct
    } = req.body;

    // Validate required fields
    if (!customer) {
      return res.status(400).json({
        success: false,
        error: 'Customer is required'
      });
    }

    if (!creditAmount || parseFloat(creditAmount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid credit amount is required'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required'
      });
    }

    if (!reasonText || reasonText.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Reason text is required'
      });
    }

    // Validate customer exists
    const customerExists = await Customer.findById(customer);
    if (!customerExists) {
      return res.status(400).json({
        success: false,
        error: 'Customer not found'
      });
    }

    console.log('✅ Customer found:', customerExists.displayName || customerExists.individual?.firstName);

    const creditAmountValue = parseFloat(creditAmount);

    // สร้างเลขที่ใบลดหนี้อัตโนมัติ
    const today = new Date();
    const year = (today.getFullYear() + 543).toString().slice(-2); // Thai year
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    // Find last credit note number for today
    const lastCreditNote = await SalesCreditNote.findOne({
      creditNoteNumber: { $regex: `^CN-${year}${month}${day}` }
    }).sort({ creditNoteNumber: -1 });

    let sequence = 1;
    if (lastCreditNote) {
      const lastSequence = parseInt(lastCreditNote.creditNoteNumber.slice(-3));
      sequence = lastSequence + 1;
    }

    const creditNoteNumber = `CN-${year}${month}${day}${String(sequence).padStart(3, '0')}`;

    // สร้างรายการ items
    const items = [{
      description: `${reason}: ${reasonText}`,
      quantity: 1,
      unitPrice: creditAmountValue,
      amount: creditAmountValue
    }];

    // คำนวณ VAT (7%)
    const subtotal = creditAmountValue;
    const vatRate = 7;
    const vatAmount = Math.round((subtotal * vatRate / 100) * 100) / 100;
    const totalAmount = subtotal + vatAmount;

    // สร้างใบลดหนี้
    const creditNote = new SalesCreditNote({
      creditNoteNumber,
      customer,
      items,
      subtotal,
      vatRate,
      vatAmount,
      totalAmount,
      reason,
      reasonText,
      notes,
      referenceDocument,
      relatedProduct,
      createdBy: req.user.id
    });

    await creditNote.save();

    // Populate ข้อมูลเพื่อ response
    await creditNote.populate('customer', 'customerType individual corporate contactPhone contactEmail');
    await creditNote.populate('createdBy', 'name username');

    // Transform และเพิ่ม displayName manually
    const noteObj = creditNote.toObject();
    noteObj.customer = addCustomerDisplayName(noteObj.customer);

    res.status(201).json({
      success: true,
      data: noteObj,
      message: 'Credit note created successfully'
    });

  } catch (error) {
    console.error('🔴 createCreditNote error:', error);
    console.error('🔴 Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create credit note',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * POST /api/sales-credit-notes/:id/approve
 * อนุมัติใบลดหนี้
 */
exports.approveCreditNote = async (req, res) => {
  try {
    const { id } = req.params;

    const creditNote = await SalesCreditNote.findById(id);
    if (!creditNote) {
      return res.status(404).json({
        success: false,
        error: 'Credit note not found'
      });
    }

    if (creditNote.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending credit notes can be approved'
      });
    }

    await creditNote.approve(req.user.id);

    res.json({
      success: true,
      data: creditNote,
      message: 'Credit note approved successfully'
    });

  } catch (error) {
    console.error('approveCreditNote error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve credit note'
    });
  }
};

/**
 * POST /api/sales-credit-notes/:id/reject
 * ปฏิเสธใบลดหนี้
 */
exports.rejectCreditNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const creditNote = await SalesCreditNote.findById(id);
    if (!creditNote) {
      return res.status(404).json({
        success: false,
        error: 'Credit note not found'
      });
    }

    if (creditNote.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending credit notes can be rejected'
      });
    }

    await creditNote.reject(req.user.id, reason);

    res.json({
      success: true,
      data: creditNote,
      message: 'Credit note rejected successfully'
    });

  } catch (error) {
    console.error('rejectCreditNote error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject credit note'
    });
  }
};

/**
 * DELETE /api/sales-credit-notes/:id
 * ยกเลิกใบลดหนี้
 */
exports.cancelCreditNote = async (req, res) => {
  try {
    const { id } = req.params;

    const creditNote = await SalesCreditNote.findById(id);
    if (!creditNote) {
      return res.status(404).json({
        success: false,
        error: 'Credit note not found'
      });
    }

    if (creditNote.status === 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel approved credit note'
      });
    }

    await creditNote.cancel();

    res.json({
      success: true,
      data: creditNote,
      message: 'Credit note cancelled successfully'
    });

  } catch (error) {
    console.error('cancelCreditNote error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel credit note'
    });
  }
};

/**
 * GET /api/sales-credit-notes/stats
 * ดึงสถิติใบลดหนี้
 */
exports.getStats = async (req, res) => {
  try {
    const [
      pendingCount,
      approvedCount,
      rejectedCount,
      cancelledCount,
      totalAmountResult
    ] = await Promise.all([
      SalesCreditNote.countDocuments({ status: 'pending' }),
      SalesCreditNote.countDocuments({ status: 'approved' }),
      SalesCreditNote.countDocuments({ status: 'rejected' }),
      SalesCreditNote.countDocuments({ status: 'cancelled' }),
      SalesCreditNote.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;

    const stats = {
      pendingCount,
      approvedCount,
      rejectedCount,
      cancelledCount,
      totalAmount,
      totalCount: pendingCount + approvedCount + rejectedCount + cancelledCount
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get stats'
    });
  }
};