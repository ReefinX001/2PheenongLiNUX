// controllers/transferController.js

const Counter   = require('../../models/POS/Counter');
const Branch    = require('../../models/Account/Branch');
const Transfer  = require('../../models/Stock/Transfer');
const { createTransfer } = require('../../services/transferService');

// generate running no แบบ "TR-YYYYMM-#####-BBBB"
async function generateTransferNo(toBranchCode) {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const key   = `TRANSFER-${year}-${month}`;
  const reference_value = 'INVENTORY'; // เพิ่ม reference_value

  let doc = await Counter.findOne({ key, reference_value });
  if (!doc) {
    doc = new Counter({ key, reference_value, seq: 0 });
  }
  doc.seq = (Number(doc.seq) || 0) + 1;
  await doc.save();

  const seq5 = String(doc.seq).padStart(5, '0');
  const branchCode4 = String(toBranchCode || '').padStart(4, '0');
  return `TR-${year}${month}${seq5}${branchCode4}`;
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
      note,
      items,
      senderSignature
    } = req.body;

    // หา ObjectId ของสาขา
    const fromBranchDoc = await Branch.findOne({ branch_code: fromBranchCode }).lean().select('_id');
    const toBranchDoc   = await Branch.findOne({ branch_code: toBranchCode }).lean().select('_id branch_code');
    if (!fromBranchDoc || !toBranchDoc) {
      return res.status(400).json({ success: false, error: 'สาขาไม่ถูกต้อง' });
    }

    // สร้างเลขที่โอน
    const transferNo = await generateTransferNo(toBranchDoc.branch_code);

    // สร้าง transfer document
    const transfer = new Transfer({
      transferNo,
      transferDate: new Date(transferDate),
      fromBranch: fromBranchDoc._id,
      toBranch: toBranchDoc._id,
      sender: userId,
      receiver: receiverId,
      items: items,
      status: 'pending-stock',
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
        status: 'pending-stock'
      });
    }

    return res.status(201).json({
      success: true,
      transferNo: transfer.transferNo,
      transferId: transfer._id
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

    const transfer = await Transfer.findById(transferId);
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

    const transfer = await Transfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลการโอน' });
    }
    if (transfer.status !== 'pending-receive') {
      return res.status(400).json({ success: false, error: 'สถานะไม่ถูกต้อง' });
    }
    if (transfer.receiver.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'คุณไม่ใช่ผู้รับที่ระบุไว้' });
    }

    transfer.status = 'completed';
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

    const transfer = await Transfer.findById(transferId);
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
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const filter = req.query.filter || '';
    const search = req.query.search || '';

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

    // นับจำนวนทั้งหมดก่อน pagination
    const total = await Transfer.countDocuments(criteria);

    // ดึงข้อมูล Transfer มาพร้อม paginate และ populate ชื่อสาขา+ผู้ใช้งาน
    const transfers = await Transfer.find(criteria)
      .sort({ transferDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('fromBranch', 'name')
      .populate('toBranch', 'name')
      .populate({
        path: 'sender',
        populate: {
          path: 'employee',
          select: 'name'
        }
      })
      .populate({
        path: 'receiver',
        populate: {
          path: 'employee',
          select: 'name'
        }
      })
      .lean();

    // Transform the transfers data to include direct name fields
    const transformedTransfers = transfers.map(transfer => ({
      ...transfer,
      senderName: transfer.sender?.employee?.name || transfer.sender?.username || 'ไม่ระบุผู้ส่ง',
      receiverName: transfer.receiver?.employee?.name || transfer.receiver?.username || 'ไม่ระบุผู้รับ'
    }));

    return res.status(200).json({
      success: true,
      data: transformedTransfers,
      total: total
    });
  } catch (err) {
    next(err);
  }
};

// Controller สำหรับ GET /api/transfers/:id
// ดึงรายละเอียดของโอนตาม ID
exports.getTransferById = async (req, res, next) => {
  try {
    const transferId = req.params.id;
    const transfer = await Transfer.findById(transferId)
      .populate('fromBranch', 'name')
      .populate('toBranch', 'name')
      .populate({
        path: 'sender',
        populate: {
          path: 'employee',
          select: 'name'
        }
      })
      .populate({
        path: 'receiver',
        populate: {
          path: 'employee',
          select: 'name'
        }
      })
      .lean();

    if (!transfer) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลการโอน' });
    }

    // Transform the data to make it easier for frontend to use
    const transformedTransfer = {
      ...transfer,
      // Add direct name fields for easier access
      senderName: transfer.sender?.employee?.name || transfer.sender?.username || 'ไม่ระบุผู้ส่ง',
      receiverName: transfer.receiver?.employee?.name || transfer.receiver?.username || 'ไม่ระบุผู้รับ'
    };

    return res.status(200).json({ success: true, data: transformedTransfer });
  } catch (err) {
    next(err);
  }
};
