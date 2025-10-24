/**
 * controllers/SalesDebitNoteController.js - Controller สำหรับจัดการใบเพิ่มหนี้การขาย
 */

const SalesDebitNote = require('../models/SalesDebitNote');
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
 * GET /api/debit-note
 * ดึงรายการใบเพิ่มหนี้ (พร้อม pagination และ filter)
 */
exports.getSalesDebitNotes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      supplier,
      dateFrom,
      dateTo,
      search
    } = req.query;

    // สร้าง filter
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (supplier) {
      filter.customer = supplier; // เปลี่ยนจาก supplier เป็น customer
    }

    if (dateFrom || dateTo) {
      filter.issueDate = {};
      if (dateFrom) filter.issueDate.$gte = new Date(dateFrom);
      if (dateTo) filter.issueDate.$lte = new Date(dateTo);
    }

    if (search) {
      filter.$or = [
        { debitNoteNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { referenceDocument: { $regex: search, $options: 'i' } }
      ];
    }

    // คำนวณ pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ดึงข้อมูล
    const debitNotes = await SalesDebitNote.find(filter)
      .populate('customer', 'customerType individual corporate contactPhone contactEmail')
      .populate('createdBy', 'name username')
      .populate('approvedBy', 'name username')
      .populate('rejectedBy', 'name username')
      .sort({ issueDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Transform data และเพิ่ม displayName manually
    const transformedDebitNotes = debitNotes.map(note => {
      const noteObj = note.toObject();
      noteObj.customer = addCustomerDisplayName(noteObj.customer);
      return noteObj;
    });

    // นับจำนวนทั้งหมด
    const total = await SalesDebitNote.countDocuments(filter);

    // คำนวณสถิติ
    const stats = await SalesDebitNote.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0
    };

    stats.forEach(stat => {
      statusCounts[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: transformedDebitNotes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      counts: statusCounts,
      message: 'Retrieved debit notes successfully'
    });

  } catch (error) {
    console.error('getSalesDebitNotes error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve debit notes'
    });
  }
};

/**
 * GET /api/debit-note/:id
 * ดึงใบเพิ่มหนี้ตาม ID
 */
exports.getSalesDebitNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    const debitNote = await SalesDebitNote.findById(id)
      .populate('customer', 'customerType individual corporate contactPhone contactEmail')
      .populate('createdBy', 'name username')
      .populate('approvedBy', 'name username')
      .populate('rejectedBy', 'name username')
      .populate('branch', 'name address');

    if (!debitNote) {
      return res.status(404).json({
        success: false,
        error: 'Debit note not found'
      });
    }

    // Transform และเพิ่ม displayName manually
    const noteObj = debitNote.toObject();
    noteObj.customer = addCustomerDisplayName(noteObj.customer);

    res.json({
      success: true,
      data: noteObj,
      message: 'Debit note retrieved successfully'
    });

  } catch (error) {
    console.error('getSalesDebitNoteById error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve debit note'
    });
  }
};

/**
 * POST /api/debit-note
 * สร้างใบเพิ่มหนี้ใหม่
 */
exports.createSalesDebitNote = async (req, res) => {
  try {
    console.log('🔍 Received request body:', req.body);

    const {
      customer,
      supplier,
      debitAmount,
      reason,
      reasonText,
      items,
      subtotal,
      vatRate = 7,
      vatAmount,
      totalAmount,
      notes,
      referenceDocument,
      branch,
      relatedProduct
    } = req.body;

    // Support both new simple format and existing detailed format
    let processedData;

    if (customer && debitAmount && reason && reasonText) {
      // New simple format from DebitNoteSimple.html
      const debitAmountValue = parseFloat(debitAmount);
      const calculatedVatAmount = debitAmountValue * (vatRate / 100);
      const calculatedTotalAmount = debitAmountValue + calculatedVatAmount;

      processedData = {
        customer: customer,
        items: [{
          description: `${reason}: ${reasonText}`,
          quantity: 1,
          unitPrice: debitAmountValue,
          amount: debitAmountValue
        }],
        subtotal: debitAmountValue,
        vatAmount: calculatedVatAmount,
        totalAmount: calculatedTotalAmount,
        notes: notes || '',
        relatedProduct: relatedProduct
      };
    } else if (supplier && items && Array.isArray(items) && items.length > 0) {
      // Existing detailed format
      processedData = {
        customer: supplier,
        items,
        subtotal,
        vatAmount,
        totalAmount,
        notes,
        referenceDocument,
        branch,
        relatedProduct
      };
    } else {
      return res.status(400).json({
        success: false,
        error: 'Required fields missing. Please provide either (customer, debitAmount, reason, reasonText) or (supplier, items)'
      });
    }

    // Validate customer exists
    const customerExists = await Customer.findById(processedData.customer);
    if (!customerExists) {
      return res.status(400).json({
        success: false,
        error: 'Customer not found'
      });
    }

    console.log('✅ Customer found:', customerExists.displayName);

    // Generate debit note number
    const today = new Date();
    const year = (today.getFullYear() + 543).toString().slice(-2); // Thai year
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    // Find last debit note number for today
    const lastSalesDebitNote = await SalesDebitNote.findOne({
      debitNoteNumber: { $regex: `^DN-${year}${month}${day}` }
    }).sort({ debitNoteNumber: -1 });

    let sequence = 1;
    if (lastSalesDebitNote) {
      const lastSequence = parseInt(lastSalesDebitNote.debitNoteNumber.slice(-3));
      sequence = lastSequence + 1;
    }

    const debitNoteNumber = `DN-${year}${month}${day}${String(sequence).padStart(3, '0')}`;

    // Create debit note
    const debitNote = new SalesDebitNote({
      debitNoteNumber,
      customer: processedData.customer,
      items: processedData.items,
      subtotal: processedData.subtotal,
      vatRate,
      vatAmount: processedData.vatAmount,
      totalAmount: processedData.totalAmount,
      notes: processedData.notes,
      referenceDocument: processedData.referenceDocument,
      branch: processedData.branch,
      relatedProduct: processedData.relatedProduct,
      createdBy: req.user.id
    });

    await debitNote.save();

    // Populate for response
    await debitNote.populate('customer', 'displayName contactPhone contactEmail individual corporate');
    await debitNote.populate('createdBy', 'name username');

    res.status(201).json({
      success: true,
      data: debitNote,
      message: 'Debit note created successfully'
    });

  } catch (error) {
    console.error('🔴 createSalesDebitNote error:', error);
    console.error('🔴 Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create debit note',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * POST /api/debit-note/:id/approve
 * อนุมัติใบเพิ่มหนี้
 */
exports.approveSalesDebitNote = async (req, res) => {
  try {
    const { id } = req.params;

    const debitNote = await SalesDebitNote.findById(id);
    if (!debitNote) {
      return res.status(404).json({
        success: false,
        error: 'Debit note not found'
      });
    }

    if (debitNote.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending debit notes can be approved'
      });
    }

    await debitNote.approve(req.user.id);

    res.json({
      success: true,
      data: debitNote,
      message: 'Debit note approved successfully'
    });

  } catch (error) {
    console.error('approveSalesDebitNote error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve debit note'
    });
  }
};

/**
 * POST /api/debit-note/:id/reject
 * ปฏิเสธใบเพิ่มหนี้
 */
exports.rejectSalesDebitNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const debitNote = await SalesDebitNote.findById(id);
    if (!debitNote) {
      return res.status(404).json({
        success: false,
        error: 'Debit note not found'
      });
    }

    if (debitNote.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending debit notes can be rejected'
      });
    }

    await debitNote.reject(req.user.id, reason);

    res.json({
      success: true,
      data: debitNote,
      message: 'Debit note rejected successfully'
    });

  } catch (error) {
    console.error('rejectSalesDebitNote error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject debit note'
    });
  }
};

/**
 * DELETE /api/debit-note/:id
 * ยกเลิกใบเพิ่มหนี้
 */
exports.cancelSalesDebitNote = async (req, res) => {
  try {
    const { id } = req.params;

    const debitNote = await SalesDebitNote.findById(id);
    if (!debitNote) {
      return res.status(404).json({
        success: false,
        error: 'Debit note not found'
      });
    }

    if (debitNote.status === 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel approved debit note'
      });
    }

    await debitNote.cancel();

    res.json({
      success: true,
      data: debitNote,
      message: 'Debit note cancelled successfully'
    });

  } catch (error) {
    console.error('cancelSalesDebitNote error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel debit note'
    });
  }
};

/**
 * GET /api/debit-note/stats
 * ดึงสถิติใบเพิ่มหนี้
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
      SalesDebitNote.countDocuments({ status: 'pending' }),
      SalesDebitNote.countDocuments({ status: 'approved' }),
      SalesDebitNote.countDocuments({ status: 'rejected' }),
      SalesDebitNote.countDocuments({ status: 'cancelled' }),
      SalesDebitNote.aggregate([
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
