// controllers/transferController.js

const mongoose = require('mongoose');
const Counter   = require('../../models/POS/Counter');
const Branch    = require('../../models/Account/Branch');
const Transfer  = require('../../models/Stock/Transfer');
const { createTransfer } = require('../../services/transferService');

// generate running no แบบ "DO-680819-001" (DO-YYMMDD-XXX) โดย YY คือ พ.ศ. 2 หลัก
async function generateTransferNo() {
  const now = new Date();
  const yearBE = now.getFullYear() + 543; // แปลงเป็น พ.ศ.
  const year = String(yearBE).slice(-2); // เอา 2 หลักท้าย เช่น 2568 -> 68
  const month = String(now.getMonth() + 1).padStart(2, '0'); // เดือน 01-12
  const day = String(now.getDate()).padStart(2, '0'); // วัน 01-31
  const dateKey = `${year}${month}${day}`; // เช่น 680908 (68=พ.ศ.68, 09=เดือน, 08=วัน)

  const key = `DO-${dateKey}`;
  const reference_value = 'TRANSFER'; // เพิ่ม reference_value

  // หา counter ตาม key และ reference_value
  let doc = await Counter.findOne({ key, reference_value });
  if (!doc) {
    doc = new Counter({
      key,
      reference_value, // เพิ่ม reference_value
      seq: 0
    });
  }
  doc.seq = (Number(doc.seq) || 0) + 1;
  await doc.save();

  const seq3 = String(doc.seq).padStart(3, '0'); // 001, 002, 003...
  return `DO-${dateKey}-${seq3}`; // DO-680819-001
}

// Controller สำหรับ POST /api/transfers
exports.postTransfer = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const {
      fromBranchCode,
      toBranchCode,
      transferDate,
      receiverId,
      senderId, // รองรับ field ใหม่จาก frontend
      note,
      items,
      senderSignature,
      status = 'pending' // สถานะเริ่มต้น: รอโอน
    } = req.body;

    // หา ObjectId ของสาขา
    const fromBranchDoc = await Branch.findOne({ branch_code: fromBranchCode }).lean().select('_id');
    const toBranchDoc   = await Branch.findOne({ branch_code: toBranchCode }).lean().select('_id branch_code');
    if (!fromBranchDoc || !toBranchDoc) {
      return res.status(400).json({ success: false, error: 'สาขาไม่ถูกต้อง' });
    }

    // สร้างเลขที่โอน
    const transferNo = await generateTransferNo();

    // สร้าง transfer document
    const transfer = new Transfer({
      transferNo,
      transferDate: new Date(transferDate),
      fromBranch: fromBranchDoc._id,
      toBranch: toBranchDoc._id,
      sender: senderId || userId, // ใช้ senderId จาก frontend หรือ fallback เป็น userId
      receiver: receiverId,
      items: items,
      status: status, // ใช้สถานะที่ส่งมา (pending-stock)
      senderSignature: senderSignature,
      note: note || '',
      createdBy: userId
    });
    await transfer.save();

    // Emit event ผ่าน Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('newTransferRequest', {
        transferNo: transfer.transferNo,
        transferId: transfer._id,
        fromBranch: fromBranchCode,
        toBranch: toBranchCode,
        status: status
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        _id: transfer._id,
        transferNo: transfer.transferNo,
        transferDate: transfer.transferDate,
        fromBranch: fromBranchCode,
        toBranch: toBranchCode,
        status: status,
        itemCount: items.length
      },
      transferNo: transfer.transferNo,
      transferId: transfer._id,
      message: `สร้างใบโอนสินค้า ${transfer.transferNo} เรียบร้อยแล้ว`
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/transfers/:id/approve-stock
exports.approveStock = async (req, res, next) => {
  try {
    const transferId = req.params.id;
    const userId     = req.user.userId || req.user.id;
    const { signature } = req.body;

    const transfer = await Transfer.findById(transferId).lean();
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลการโอน' });
    }
    if (transfer.status !== 'pending-stock') {
      return res.status(400).json({ success: false, error: 'สถานะไม่ถูกต้อง' });
    }

    transfer.status = 'pending-receive';
    transfer.stockApproverSignature = signature;
    transfer.stockApprover = userId;
    transfer.stockApprovedAt = new Date();
    await transfer.save();

    // TODO: ลดสต๊อกต้นทาง

    const io = req.app.get('io');
    if (io) {
      io.emit('transferApprovedByStock', {
        transferId: transfer._id,
        status: 'pending-receive'
      });
    }

    return res.json({ success: true, message: 'อนุมัติเรียบร้อยแล้ว' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/transfers/:id/receive
exports.receiveTransfer = async (req, res, next) => {
  try {
    const transferId = req.params.id;
    const userId     = req.user.userId || req.user.id;
    const { receiverSignature } = req.body;

    const transfer = await Transfer.findById(transferId).lean();
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลการโอน' });
    }
    if (transfer.status !== 'in-transit' && transfer.status !== 'pending-receive') {
      return res.status(400).json({ success: false, error: 'สถานะไม่ถูกต้อง' });
    }
    if (transfer.receiver.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'คุณไม่ใช่ผู้รับที่ระบุไว้' });
    }

    transfer.status = 'received';
    transfer.receiverSignature = receiverSignature;
    transfer.receivedAt = new Date();
    await transfer.save();

    // TODO: เพิ่มสต๊อกปลายทาง

    const io = req.app.get('io');
    if (io) {
      io.emit('transferCompleted', {
        transferId: transfer._id,
        status: 'completed'
      });
    }

    return res.json({ success: true, message: 'รับสินค้าเรียบร้อยแล้ว' });
  } catch (err) {
    next(err);
  }
};

// POST /api/transfers/:id/reject
exports.rejectTransfer = async (req, res, next) => {
  try {
    const transferId = req.params.id;
    const userId     = req.user.userId || req.user.id;
    const { reason, signature } = req.body;

    const transfer = await Transfer.findById(transferId).lean();
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลการโอน' });
    }
    if (['completed','rejected'].includes(transfer.status)) {
      return res.status(400).json({ success: false, error: 'ไม่สามารถปฏิเสธรายการนี้ได้' });
    }

    transfer.status = 'rejected';
    transfer.rejectionReason = reason;
    transfer.rejectedBy = userId;
    transfer.rejectedAt = new Date();
    transfer.stockApproverSignature = signature;
    await transfer.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('transferRejected', {
        transferId: transfer._id,
        status: 'rejected'
      });
    }

    return res.json({ success: true, message: 'ปฏิเสธการโอนเรียบร้อยแล้ว' });
  } catch (err) {
    next(err);
  }
};

// Controller สำหรับ GET /api/transfers?page=&limit=&filter=&search=
// ดึงประวัติการโอน (pagination + filtering)
exports.getTransfers = async (req, res, next) => {
  try {
    console.log('🔍 getTransfers called with query:', req.query);

    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const filter = req.query.filter || '';
    const search = req.query.search || '';

    console.log('📊 Pagination params:', { page, limit, filter, search });

    // Check if Transfer collection exists and has data
    try {
      const totalCount = await Transfer.countDocuments();
      console.log('📊 Total Transfer documents:', totalCount);

      if (totalCount === 0) {
        console.log('⚠️ No transfer documents found, returning empty result');
        return res.status(200).json({
          success: true,
          data: [],
          total: 0,
          page: page,
          limit: limit,
          totalPages: 0,
          message: 'No transfer data found'
        });
      }
    } catch (countError) {
      console.error('❌ Error counting transfers:', countError);
      // Continue with the query anyway
    }

    // สร้างเงื่อนไขการค้นหา
    let criteria = {};
    if (filter) {
      criteria.status = filter;
    }
    if (search) {
      criteria.$or = [
        { transferNo: new RegExp(search, 'i') },
        // ถ้าต้องการค้นชื่อสาขาเพิ่มเติม อาจต้องใช้ .populate แล้ว match อีกที
      ];
    }

    console.log('🔎 Search criteria:', criteria);

    // นับจำนวนทั้งหมดก่อน pagination
    const total = await Transfer.countDocuments(criteria);
    console.log('📈 Total documents found:', total);

    // ดึงข้อมูล Transfer มาพร้อม paginate และ populate ชื่อสาขา+ผู้ใช้งาน
    console.log('🔄 Executing Transfer.find query...');

    let transfers;
    try {
      // Try with full populate first
      transfers = await Transfer.find(criteria)
        .sort({ transferDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({
          path: 'fromBranch',
          select: 'name branch_code address phone',
          options: { strictPopulate: false }
        })
        .populate({
          path: 'toBranch',
          select: 'name branch_code address phone',
          options: { strictPopulate: false }
        })
        .populate({
          path: 'sender',
          select: 'username fullName firstName lastName email employee',
          populate: {
            path: 'employee',
            select: 'name employeeId position'
          },
          options: { strictPopulate: false }
        })
        .populate({
          path: 'receiver',
          select: 'username fullName firstName lastName email employee',
          populate: {
            path: 'employee',
            select: 'name employeeId position'
          },
          options: { strictPopulate: false }
        })
        .lean();

      console.log('✅ Basic populate successful, found', transfers.length, 'transfers');

    } catch (populateError) {
      console.warn('⚠️ Populate failed, trying basic query:', populateError.message);

      // Fallback: basic query without populate
      transfers = await Transfer.find(criteria)
        .sort({ transferDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      console.log('✅ Basic query successful, found', transfers.length, 'transfers');
    }

    // Transform the transfers data to include direct name fields
    console.log('🔄 Transforming transfer data...');

    const transformedTransfers = transfers.map((transfer, index) => {
      try {
        // Enhanced sender name resolution (prioritize preparedBy for new flow)
        let senderName = 'ไม่ระบุผู้ส่ง';
        if (transfer.preparedBy && typeof transfer.preparedBy === 'object') {
          senderName = transfer.preparedBy.employee?.name ||
                      transfer.preparedBy.fullName ||
                      `${transfer.preparedBy.firstName || ''} ${transfer.preparedBy.lastName || ''}`.trim() ||
                      transfer.preparedBy.username || 'ไม่ระบุผู้ส่ง';
        } else if (transfer.sender && typeof transfer.sender === 'object') {
          senderName = transfer.sender.employee?.name ||
                      transfer.sender.fullName ||
                      `${transfer.sender.firstName || ''} ${transfer.sender.lastName || ''}`.trim() ||
                      transfer.sender.username || 'ไม่ระบุผู้ส่ง';
        }

        // Enhanced receiver name resolution
        let receiverName = 'ไม่ระบุผู้รับ';
        if (transfer.receiver && typeof transfer.receiver === 'object') {
          receiverName = transfer.receiver.employee?.name ||
                        transfer.receiver.fullName ||
                        `${transfer.receiver.firstName || ''} ${transfer.receiver.lastName || ''}`.trim() ||
                        transfer.receiver.username || 'ไม่ระบุผู้รับ';
        }

        return {
          ...transfer,
          senderName,
          receiverName,
          // Add senderId and receiverId for signature permission checks
          senderId: (transfer.preparedBy && typeof transfer.preparedBy === 'object') ? transfer.preparedBy._id :
                   (transfer.sender && typeof transfer.sender === 'object') ? transfer.sender._id : null,
          receiverId: (transfer.receiver && typeof transfer.receiver === 'object') ? transfer.receiver._id : null
        };
      } catch (transformError) {
        console.error(`❌ Error transforming transfer ${index}:`, transformError);
        console.error('Transfer data:', JSON.stringify(transfer, null, 2));

        // Return basic transfer data if transformation fails
        return {
          ...transfer,
          senderName: 'ไม่ระบุผู้ส่ง',
          receiverName: 'ไม่ระบุผู้รับ',
          senderId: null,
          receiverId: null
        };
      }
    });

    console.log('✅ Data transformation completed for', transformedTransfers.length, 'transfers');

    return res.status(200).json({
      success: true,
      data: transformedTransfers,
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('❌ getTransfers error:', err);
    console.error('Error stack:', err.stack);

    // Return detailed error for debugging
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Controller สำหรับ GET /api/transfers/:id
// ดึงรายละเอียดของโอนตาม ID
exports.getTransferById = async (req, res, next) => {
  try {
    const transferId = req.params.id;
    const transfer = await Transfer.findById(transferId)
      .populate('fromBranch', 'name branch_code address phone')
      .populate('toBranch', 'name branch_code address phone')
      .populate({
        path: 'sender',
        select: 'username fullName firstName lastName email employee',
        populate: {
          path: 'employee',
          select: 'name employeeId position email'
        }
      })
      .populate({
        path: 'receiver',
        select: 'username fullName firstName lastName email employee',
        populate: {
          path: 'employee',
          select: 'name employeeId position email'
        }
      })
      .populate({
        path: 'preparedBy',
        select: 'username fullName firstName lastName employee',
        populate: {
          path: 'employee',
          select: 'name position'
        }
      })
      .populate({
        path: 'receivedBy',
        select: 'username fullName firstName lastName employee',
        populate: {
          path: 'employee',
          select: 'name position'
        }
      })
      .populate({
        path: 'cancelledBy',
        select: 'username fullName firstName lastName employee',
        populate: {
          path: 'employee',
          select: 'name position'
        }
      })
      .lean();

    if (!transfer) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลการโอน' });
    }

    // Transform the data to make it easier for frontend to use
    const transformedTransfer = {
      ...transfer,
      // Enhanced sender name resolution (prioritize preparedBy for new flow)
      senderName: transfer.preparedBy?.employee?.name ||
                 transfer.preparedBy?.fullName ||
                 `${transfer.preparedBy?.firstName || ''} ${transfer.preparedBy?.lastName || ''}`.trim() ||
                 transfer.preparedBy?.username ||
                 transfer.sender?.employee?.name ||
                 transfer.sender?.fullName ||
                 `${transfer.sender?.firstName || ''} ${transfer.sender?.lastName || ''}`.trim() ||
                 transfer.sender?.username ||
                 'ไม่ระบุผู้ส่ง',

      // Enhanced receiver name resolution
      receiverName: transfer.receiver?.employee?.name ||
                   transfer.receiver?.fullName ||
                   `${transfer.receiver?.firstName || ''} ${transfer.receiver?.lastName || ''}`.trim() ||
                   transfer.receiver?.username ||
                   'ไม่ระบุผู้รับ',

      // Add IDs for signature permission checks
      senderId: transfer.preparedBy?._id || transfer.sender?._id,
      receiverId: transfer.receiver?._id
    };

    return res.status(200).json({ success: true, data: transformedTransfer });
  } catch (err) {
    next(err);
  }
};

// Controller สำหรับ POST /api/transfers/:id/signature
// บันทึกลายเซ็น
exports.saveSignature = async (req, res, next) => {
  console.log(`🖊️ saveSignature called: ${req.method} /api/transfers/${req.params.id}/signature`);
  console.log('📝 Request body:', req.body);
  console.log('👤 User:', req.user?.userId || req.user?.id);

  try {
    const transferId = req.params.id;
    const userId = req.user.userId || req.user.id;
    const {
      signatureType,
      signatureData,
      signedAt,
      signedBy,
      status,
      receivedAt,
      receivedBy
    } = req.body;

    // Validate input
    if (!signatureType || !signatureData) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุประเภทลายเซ็นและข้อมูลลายเซ็น'
      });
    }

    // Validate signature type - รองรับทั้งแบบเก่าและใหม่
    const validTypes = ['sender', 'stockApprover', 'receiver', 'prepared', 'received'];
    if (!validTypes.includes(signatureType)) {
      return res.status(400).json({
        success: false,
        message: 'ประเภทลายเซ็นไม่ถูกต้อง'
      });
    }

    // Find transfer
    const transfer = await Transfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายการโอนสินค้า'
      });
    }

    // Update signature based on type
    const signatureObject = {
      data: signatureData,
      signedAt: signedAt ? new Date(signedAt) : new Date(),
      signedBy: signedBy || userId
    };

    switch (signatureType) {
      case 'sender':
        transfer.senderSignature = signatureObject;
        break;
      case 'stockApprover':
        transfer.stockApproverSignature = signatureObject;
        transfer.stockApprover = userId;
        transfer.stockApprovedAt = new Date();
        // Update status if needed
        if (transfer.status === 'pending-stock') {
          transfer.status = 'pending-receive';
        }
        break;
      case 'receiver':
      case 'received':
        transfer.receiverSignature = signatureObject;
        transfer.receivedAt = receivedAt ? new Date(receivedAt) : new Date();
        transfer.receivedBy = receivedBy || userId;
        // Update status to completed when receiver signs
        if (status === 'completed' || transfer.status === 'pending-receive' || transfer.status === 'in-transit') {
          transfer.status = 'completed';
        }
        break;
      case 'prepared':
        // สำหรับผู้จัดเตรียม - บันทึกลายเซ็นและเปลี่ยนสถานะเป็น in-transit
        // preparedSignature is a simple String field, not an object
        transfer.preparedSignature = signatureData;  // Just store the base64 string directly
        transfer.preparedAt = signedAt ? new Date(signedAt) : new Date();
        transfer.preparedBy = signedBy || userId;
        if (transfer.status === 'pending') {
          transfer.status = 'in-transit';
        }
        break;
    }

    await transfer.save();

    // Emit socket event if needed
    const io = req.app.get('io');
    if (io) {
      io.emit('transferSignatureUpdated', {
        transferId: transfer._id,
        signatureType,
        status: transfer.status
      });
    }

    console.log(`✅ Signature saved: ${signatureType} for transfer ${transferId}, status: ${transfer.status}`);

    return res.status(200).json({
      success: true,
      message: 'บันทึกลายเซ็นเรียบร้อยแล้ว',
      data: {
        transferId: transfer._id,
        status: transfer.status,
        signatureType: signatureType
      }
    });
  } catch (err) {
    console.error('❌ Error saving signature:', err);
    console.error('❌ Error stack:', err.stack);
    console.error('❌ Error details:', {
      name: err.name,
      message: err.message,
      code: err.code
    });

    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกลายเซ็น',
      error: err.message,
      code: err.code
    });
  }
};

// ผู้จัดเตรียมเซ็น (pending → in-transit)
exports.prepareTransfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { preparedSignature, preparedBy, preparedAt } = req.body;
    const userId = req.user.userId || req.user.id;

    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found.'
      });
    }

    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Transfer must be in pending status to prepare.'
      });
    }

    // Update transfer status and signature
    transfer.status = 'in-transit';
    transfer.preparedSignature = preparedSignature;
    transfer.preparedBy = preparedBy || userId;
    transfer.preparedAt = preparedAt || new Date();

    await transfer.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('transferPrepared', {
        id: transfer._id,
        data: transfer.toObject()
      });
    }

    return res.json({
      success: true,
      data: transfer,
      message: 'Transfer prepared successfully'
    });
  } catch (err) {
    console.error('prepareTransfer error:', err);
    next(err);
  }
};

// ยกเลิกการโอนย้าย
exports.cancelTransfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancelledBy, cancelledAt, reason } = req.body;
    const userId = req.user.userId || req.user.id;

    const transfer = await Transfer.findById(id);
    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: 'Transfer not found.'
      });
    }

    if (transfer.status === 'received' || transfer.status === 'completed' || transfer.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel transfer that is already received or cancelled.'
      });
    }

    // Update transfer status
    transfer.status = 'cancelled';
    transfer.cancelledBy = cancelledBy || userId;
    transfer.cancelledAt = cancelledAt || new Date();
    transfer.cancelReason = reason || 'Cancelled by user';

    await transfer.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('transferCancelled', {
        id: transfer._id,
        data: transfer.toObject()
      });
    }

    return res.json({
      success: true,
      data: transfer,
      message: 'Transfer cancelled successfully'
    });
  } catch (err) {
    console.error('cancelTransfer error:', err);
    next(err);
  }
};

// Controller สำหรับ GET /api/transfers/:id/print
// สร้าง HTML สำหรับพิมพ์ใบโอน
exports.printTransfer = async (req, res, next) => {
  try {
    const transferId = req.params.id;
    console.log('🖨️ Print request for transfer:', transferId);

    // ดึงข้อมูลการโอนพร้อม populate ข้อมูลที่เกี่ยวข้อง
    const transfer = await Transfer.findById(transferId)
      .populate('fromBranch', 'name branch_code address phone')
      .populate('toBranch', 'name branch_code address phone')
      .populate({
        path: 'sender',
        select: 'username fullName firstName lastName email employee',
        populate: {
          path: 'employee',
          select: 'name employeeId position email'
        }
      })
      .populate({
        path: 'receiver',
        select: 'username fullName firstName lastName email employee',
        populate: {
          path: 'employee',
          select: 'name employeeId position email'
        }
      })
      .populate({
        path: 'preparedBy',
        select: 'username fullName firstName lastName employee',
        populate: {
          path: 'employee',
          select: 'name position'
        }
      })
      .populate({
        path: 'receivedBy',
        select: 'username fullName firstName lastName employee',
        populate: {
          path: 'employee',
          select: 'name position'
        }
      })
      .lean();

    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลการโอน'
      });
    }

    // สร้าง HTML สำหรับพิมพ์
    const printHTML = generateTransferPrintHTML(transfer);

    // ส่งกลับ HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(printHTML);

  } catch (err) {
    console.error('printTransfer error:', err);
    next(err);
  }
};

// Helper function สำหรับสร้าง HTML ใบโอน
function generateTransferPrintHTML(transfer) {
  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '0.00';
    return Number(amount).toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // สร้างรายการสินค้า
  let itemsHTML = '';
  if (transfer.items && transfer.items.length > 0) {
    transfer.items.forEach((item, index) => {
      const price = item.price || 0;
      const quantity = item.quantity || 0;
      const total = price * quantity;

      itemsHTML += `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${item.name || '-'}</td>
          <td class="text-center">${item.sku || '-'}</td>
          <td class="text-center">${quantity}</td>
          <td class="text-right">${formatCurrency(price)}</td>
          <td class="text-right">${formatCurrency(total)}</td>
        </tr>
      `;
    });
  } else {
    itemsHTML = '<tr><td colspan="6" class="text-center">ไม่มีรายการสินค้า</td></tr>';
  }

  // คำนวณยอดรวม
  const totalAmount = transfer.items ? transfer.items.reduce((sum, item) => {
    return sum + ((item.price || 0) * (item.quantity || 0));
  }, 0) : 0;

  // ข้อมูลผู้ส่งและผู้รับ
  const senderName = transfer.preparedBy?.employee?.name ||
                    transfer.preparedBy?.fullName ||
                    transfer.sender?.employee?.name ||
                    transfer.sender?.fullName ||
                    'ไม่ระบุผู้ส่ง';

  const receiverName = transfer.receiver?.employee?.name ||
                      transfer.receiver?.fullName ||
                      'ไม่ระบุผู้รับ';

  // สถานะการโอน
  const statusMap = {
    'pending': 'รอดำเนินการ',
    'in-transit': 'กำลังส่ง',
    'pending-receive': 'รอรับสินค้า',
    'completed': 'เสร็จสิ้น',
    'received': 'รับแล้ว',
    'cancelled': 'ยกเลิก',
    'rejected': 'ปฏิเสธ'
  };

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ใบโอนสินค้า ${transfer.transferNo}</title>
      <style>
        @media print {
          @page { margin: 0.5in; }
          body { margin: 0; }
          .no-print { display: none !important; }
        }

        body {
          font-family: 'Sarabun', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 20px;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
        }

        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }

        .header h2 {
          margin: 5px 0 0 0;
          font-size: 18px;
          color: #666;
        }

        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .info-box {
          flex: 1;
          margin-right: 20px;
        }

        .info-box:last-child {
          margin-right: 0;
        }

        .info-box h3 {
          margin: 0 0 10px 0;
          font-size: 16px;
          font-weight: bold;
          color: #333;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }

        .info-row {
          display: flex;
          margin-bottom: 5px;
        }

        .info-label {
          font-weight: bold;
          width: 120px;
          flex-shrink: 0;
        }

        .info-value {
          flex: 1;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }

        .items-table th,
        .items-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }

        .items-table th {
          background-color: #f5f5f5;
          font-weight: bold;
          text-align: center;
        }

        .text-center { text-align: center; }
        .text-right { text-align: right; }

        .summary {
          margin-top: 20px;
          text-align: right;
        }

        .summary-row {
          margin-bottom: 5px;
        }

        .summary-label {
          display: inline-block;
          width: 120px;
          font-weight: bold;
        }

        .summary-value {
          display: inline-block;
          width: 150px;
          text-align: right;
          border-bottom: 1px solid #ddd;
          padding-bottom: 2px;
        }

        .signatures {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
        }

        .signature-box {
          text-align: center;
          width: 200px;
        }

        .signature-line {
          border-bottom: 1px solid #333;
          height: 60px;
          margin-bottom: 10px;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 12px;
        }

        .status-pending { background-color: #fff3cd; color: #856404; }
        .status-in-transit { background-color: #cce7ff; color: #004085; }
        .status-pending-receive { background-color: #f0e68c; color: #333; }
        .status-completed { background-color: #d4edda; color: #155724; }
        .status-received { background-color: #d4edda; color: #155724; }
        .status-cancelled { background-color: #f8d7da; color: #721c24; }
        .status-rejected { background-color: #f8d7da; color: #721c24; }

        .no-print {
          margin-top: 20px;
          text-align: center;
        }

        .print-btn {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
        }

        .print-btn:hover {
          background-color: #0056b3;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ใบโอนสินค้าระหว่างสาขา</h1>
        <h2>Stock Transfer Document</h2>
      </div>

      <div class="info-section">
        <div class="info-box">
          <h3>ข้อมูลการโอน</h3>
          <div class="info-row">
            <span class="info-label">เลขที่โอน:</span>
            <span class="info-value">${transfer.transferNo || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">วันที่โอน:</span>
            <span class="info-value">${formatDate(transfer.transferDate)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">สถานะ:</span>
            <span class="info-value">
              <span class="status-badge status-${transfer.status}">
                ${statusMap[transfer.status] || transfer.status}
              </span>
            </span>
          </div>
        </div>

        <div class="info-box">
          <h3>สาขาต้นทาง</h3>
          <div class="info-row">
            <span class="info-label">ชื่อสาขา:</span>
            <span class="info-value">${transfer.fromBranch?.name || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">รหัสสาขา:</span>
            <span class="info-value">${transfer.fromBranch?.branch_code || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ที่อยู่:</span>
            <span class="info-value">${transfer.fromBranch?.address || '-'}</span>
          </div>
        </div>

        <div class="info-box">
          <h3>สาขาปลายทาง</h3>
          <div class="info-row">
            <span class="info-label">ชื่อสาขา:</span>
            <span class="info-value">${transfer.toBranch?.name || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">รหัสสาขา:</span>
            <span class="info-value">${transfer.toBranch?.branch_code || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ที่อยู่:</span>
            <span class="info-value">${transfer.toBranch?.address || '-'}</span>
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 50px;">ลำดับ</th>
            <th>รายการสินค้า</th>
            <th style="width: 100px;">รหัสสินค้า</th>
            <th style="width: 80px;">จำนวน</th>
            <th style="width: 100px;">ราคาต่อหน่วย</th>
            <th style="width: 120px;">รวม</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-row">
          <span class="summary-label">ยอดรวมทั้งสิ้น:</span>
          <span class="summary-value">${formatCurrency(totalAmount)} บาท</span>
        </div>
      </div>

      ${transfer.note ? `
      <div style="margin-top: 20px;">
        <strong>หมายเหตุ:</strong> ${transfer.note}
      </div>
      ` : ''}

      <div class="signatures">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div>ผู้ส่ง (Sender)</div>
          <div>${senderName}</div>
          <div>วันที่: ${formatDate(transfer.preparedAt)}</div>
        </div>

        <div class="signature-box">
          <div class="signature-line"></div>
          <div>ผู้รับ (Receiver)</div>
          <div>${receiverName}</div>
          <div>วันที่: ${formatDate(transfer.receivedAt)}</div>
        </div>
      </div>

      <div class="no-print">
        <button class="print-btn" onclick="window.print()">
          🖨️ พิมพ์เอกสาร
        </button>
        <button class="print-btn" onclick="window.close()" style="background-color: #6c757d; margin-left: 10px;">
          ❌ ปิดหน้าต่าง
        </button>
      </div>

      <script>
        // Auto print when page loads
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        }
      </script>
    </body>
    </html>
  `;
}
