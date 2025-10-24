// controllers/contractAttachmentController.js

const ContractAttachment = require('../models/Load/ContractAttachment');

/**
 * POST /api/contract-attachment
 * สร้าง ContractAttachment ใหม่ (เพิ่มไฟล์แนบให้ Contract)
 */
exports.createAttachment = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { contract_id, file_path, file_type } = req.body;

    if (!contract_id) {
      return res.status(400).json({ error: 'contract_id is required.' });
    }

    // ตัวอย่าง: คุณอาจต้องอัปโหลดไฟล์จริงด้วย Multer แล้วได้ path
    // มาบันทึกใน file_path ก็ได้

    const newAttachment = new ContractAttachment({
      contract_id,
      file_path: file_path || '',
      file_type: file_type || '',
      uploaded_at: new Date() // หรือเอาค่าจาก client
    });

    await newAttachment.save();

    io.emit('newattachmentCreated', {
      id: newAttachment.save()._id,
      data: newAttachment.save()
    });



    return res.json({ success: true, data: newAttachment });
  } catch (err) {
    console.error('createAttachment error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-attachment
 * ดึง Attachments ทั้งหมด
 */
exports.getAllAttachments = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate contract ถ้าต้องการ
    const attachments = await ContractAttachment.find().limit(100).lean()
      .populate('contract_id', 'contract_number status')
      .sort({ uploaded_at: -1 });

    return res.json({ success: true, data: attachments });
  } catch (err) {
    console.error('getAllAttachments error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-attachment/contract/:contractId
 * ดึง Attachments เฉพาะ contract_id
 */
exports.getAttachmentsByContract = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { contractId } = req.params;
    const attachments = await ContractAttachment.find({ contract_id: contractId }).limit(100).lean()
      .sort({ uploaded_at: -1 });
    return res.json({ success: true, data: attachments });
  } catch (err) {
    console.error('getAttachmentsByContract error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-attachment/:id
 * ดึง Attachment ตาม _id
 */
exports.getAttachmentById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const attachment = await ContractAttachment.findById(id).lean()
      .populate('contract_id', 'contract_number');
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    return res.json({ success: true, data: attachment });
  } catch (err) {
    console.error('getAttachmentById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * (Optional) PATCH /api/contract-attachment/:id
 * อัปเดตข้อมูลไฟล์แนบ เช่น path, file_type
 */
exports.updateAttachment = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { file_path, file_type } = req.body;

    const attachment = await ContractAttachment.findById(id).lean();
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    if (file_path !== undefined) attachment.file_path = file_path;
    if (file_type !== undefined) attachment.file_type = file_type;

    // จะเปลี่ยน uploaded_at เป็นปัจจุบันหรือไม่ขึ้นอยู่กับ logic
    // attachment.uploaded_at = new Date();

    await attachment.save();

    io.emit('attachmentCreated', {
      id: attachment.save()._id,
      data: attachment.save()
    });



    return res.json({ success: true, data: attachment });
  } catch (err) {
    console.error('updateAttachment error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/contract-attachment/:id
 * ลบไฟล์แนบออกจาก DB (ถ้าต้องการ)
 */
exports.deleteAttachment = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const attachment = await ContractAttachment.findById(id).lean();
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // ถ้าคุณเก็บไฟล์จริงในโฟลเดอร์ อาจต้องลบไฟล์จริงด้วย (fs.unlinkSync)
    // fs.unlinkSync(attachment.file_path);

    await attachment.remove();
    return res.json({ success: true, data: attachment });
  } catch (err) {
    console.error('deleteAttachment error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
