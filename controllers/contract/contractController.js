// controllers/contractController.js

const Contract = require('../../models/Load/Contract');

/**
 * POST /api/contract
 * สร้าง Contract ใหม่
 */
exports.createContract = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      customer_id,
      contract_number,
      start_date,
      end_date,
      total_amount,
      penalty_fee,
      status,
    } = req.body;

    // ตรวจสอบ field จำเป็น
    if (!customer_id || !contract_number || !start_date) {
      return res.status(400).json({
        error: 'customer_id, contract_number, and start_date are required.',
      });
    }

    const newContract = new Contract({
      customer_id,
      contract_number,
      start_date: new Date(start_date),
      end_date: end_date ? new Date(end_date) : null,
      total_amount: total_amount || 0,
      penalty_fee: penalty_fee || 0,
      status: status || 'active',
      deleted_at: null,
    });

    await newContract.save();

    io.emit('newcontractCreated', {
      id: newContract._id,
      data: newContract
    });



    return res.json({ success: true, data: newContract });
  } catch (err) {
    console.error('createContract error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract
 * ดึง Contracts ทั้งหมดที่ยังไม่ถูกลบ (deleted_at = null)
 */
exports.getAllContracts = async (req, res) => {
  const io = req.app.get('io');
  try {
    const contracts = await Contract.find({ deleted_at: null }).limit(100).lean()
      .populate('customer_id', 'name email') // สมมติ populate บาง field ของโมเดล Customer
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: contracts });
  } catch (err) {
    console.error('getAllContracts error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract/:id
 * ดึง Contract ตาม _id (ที่ยังไม่ถูกลบ)
 */
exports.getContractById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const contract = await Contract.findOne({ _id: id, deleted_at: null }).lean()
      .populate('customer_id', 'name email')
      // populate virtual ถ้าต้องการ, เช่น installments, paymentLogs
      // .populate('installments')
      // .populate('paymentLogs')
      .exec();

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found or deleted' });
    }
    return res.json({ success: true, data: contract });
  } catch (err) {
    console.error('getContractById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/contract/:id
 * อัปเดตข้อมูลบางส่วน (เช่น total_amount, penalty_fee, status)
 */
exports.updateContract = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const {
      contract_number,
      start_date,
      end_date,
      total_amount,
      penalty_fee,
      status
    } = req.body;

    const contract = await Contract.findOne({ _id: id, deleted_at: null }).lean();
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found or deleted' });
    }

    if (contract_number !== undefined) contract.contract_number = contract_number;
    if (start_date !== undefined) contract.start_date = new Date(start_date);
    if (end_date !== undefined) contract.end_date = new Date(end_date);
    if (total_amount !== undefined) contract.total_amount = total_amount;
    if (penalty_fee !== undefined) contract.penalty_fee = penalty_fee;
    if (status !== undefined) contract.status = status;

    await contract.save();

    io.emit('contractCreated', {
      id: contract.save()._id,
      data: contract.save()
    });


    return res.json({ success: true, data: contract });
  } catch (err) {
    console.error('updateContract error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/contract/:id
 * Soft Delete (set deleted_at = now())
 */
exports.deleteContract = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const contract = await Contract.findOne({ _id: id, deleted_at: null }).lean();
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found or already deleted' });
    }

    // เรียกฟังก์ชัน softDelete()
    await contract.softDelete();
    return res.json({ success: true, data: contract });
  } catch (err) {
    console.error('deleteContract error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * (Optional) Force Delete ออกจาก DB จริง ๆ
 * DELETE /api/contract/:id/force
 */
exports.forceDeleteContract = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const contract = await Contract.findById(id).lean();
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    await contract.remove();
    return res.json({ success: true, data: contract });
  } catch (err) {
    console.error('forceDeleteContract error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
