// controllers/branchSupplierController.js

const BranchSupplier = require('../models/Stock/BranchSupplier');

/**
 * POST /api/branch-supplier
 * สร้างความสัมพันธ์ BranchSupplier (ผูก Branch และ Supplier)
 */
exports.createBranchSupplier = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      branch_code,
      supplier_id,
      contract_id,
      order_number,
      status,
      payment_terms,
      delivery_lead_time,
      rating,
      created_by,
      approved_by
    } = req.body;

    if (!branch_code || !supplier_id) {
      return res.status(400).json({ error: 'branch_code and supplier_id are required.' });
    }

    const newBS = new BranchSupplier({
      branch_code,
      supplier_id,
      contract_id: contract_id || '',
      order_number: order_number || '',
      status: status || 'pending',
      payment_terms: payment_terms || '',
      delivery_lead_time: delivery_lead_time || '',
      rating: rating || 0,
      created_by: created_by || null,
      approved_by: approved_by || null
    });

    const savedBS = await newBS.save();

    io.emit('newbsCreated', {
      id: savedBS._id,
      data: savedBS.toObject()
    });



    return res.json({ success: true, data: savedBS.toObject() });
  } catch (err) {
    console.error('createBranchSupplier error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/branch-supplier
 * ดึงรายการทั้งหมด
 */
exports.getAllBranchSuppliers = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate branch_id, supplier_id, created_by, approved_by ตามที่ต้องการ
    const branchSuppliers = await BranchSupplier.find().limit(100).lean()
      .populate('branch_code', 'branch_code name')
      .populate('supplier_id', 'supplier_code supplier_name') // สมมติว่าโมเดล Supplier มีฟิลด์เหล่านี้
      .populate('created_by', 'username')
      .populate('approved_by', 'username')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: branchSuppliers });
  } catch (err) {
    console.error('getAllBranchSuppliers error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/branch-supplier/:id
 * ดึง BranchSupplier ตาม _id
 */
exports.getBranchSupplierById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const branchSupplier = await BranchSupplier.findById(id).lean()
      .populate('branch_code', 'branch_code name')
      .populate('supplier_id', 'supplier_code supplier_name')
      .populate('created_by', 'username')
      .populate('approved_by', 'username')
      // populate virtual items ถ้าต้องการ
      .populate('items'); // ถ้าต้องการดึง items() ด้วย

    if (!branchSupplier) {
      return res.status(404).json({ error: 'BranchSupplier not found' });
    }

    return res.json({ success: true, data: branchSupplier });
  } catch (err) {
    console.error('getBranchSupplierById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/branch-supplier/:id
 * อัปเดตข้อมูล
 */
exports.updateBranchSupplier = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      contract_id,
      order_number,
      status,
      payment_terms,
      delivery_lead_time,
      rating,
      approved_by
      // ฯลฯ
    } = req.body;

    const bs = await BranchSupplier.findById(id);
    if (!bs) {
      return res.status(404).json({ error: 'BranchSupplier not found' });
    }

    if (contract_id !== undefined) bs.contract_id = contract_id;
    if (order_number !== undefined) bs.order_number = order_number;
    if (status !== undefined) bs.status = status;
    if (payment_terms !== undefined) bs.payment_terms = payment_terms;
    if (delivery_lead_time !== undefined) bs.delivery_lead_time = delivery_lead_time;
    if (rating !== undefined) bs.rating = rating;
    if (approved_by !== undefined) bs.approved_by = approved_by;

    const savedBS = await bs.save();

    io.emit('bsCreated', {
      id: savedBS._id,
      data: savedBS.toObject()
    });



    return res.json({ success: true, data: savedBS.toObject() });
  } catch (err) {
    console.error('updateBranchSupplier error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/branch-supplier/:id
 * ลบจริง (ถ้าอยาก Soft Delete ต้องแก้ Schema เช่นมี deleted_at)
 */
exports.deleteBranchSupplier = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const bs = await BranchSupplier.findById(id);
    if (!bs) {
      return res.status(404).json({ error: 'BranchSupplier not found' });
    }

    const bsData = bs.toObject();
    await bs.remove();
    return res.json({ success: true, data: bsData });
  } catch (err) {
    console.error('deleteBranchSupplier error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
