// controllers/contractNotificationController.js

const ContractNotification = require('../models/Load/ContractNotification');

/**
 * POST /api/contract-notification
 * สร้าง Notification ใหม่ สำหรับ Contract
 */
exports.createNotification = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { contract_id, notification_type, message, is_read } = req.body;

    if (!contract_id) {
      return res.status(400).json({ error: 'contract_id is required.' });
    }

    const newNotif = new ContractNotification({
      contract_id,
      notification_type: notification_type || '',
      message: message || '',
      is_read: is_read || false
    });

    await newNotif.save();

    io.emit('newnotifCreated', {
      id: newNotif.save()._id,
      data: newNotif.save()
    });



    return res.json({ success: true, data: newNotif });
  } catch (err) {
    console.error('createNotification error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-notification
 * ดึง Notification ทั้งหมด
 */
exports.getAllNotifications = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate contract ถ้าต้องการ
    const notifications = await ContractNotification.find().limit(100).lean()
      .populate('contract_id', 'contract_number status')
      .sort({ _id: -1 }); // หรือจะ sort ตาม requirement จริง

    return res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('getAllNotifications error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-notification/contract/:contractId
 * ดึง Notification เฉพาะสัญญา (contract_id)
 */
exports.getNotificationsByContract = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { contractId } = req.params;
    const notifications = await ContractNotification.find({ contract_id: contractId }).limit(100).lean()
      .sort({ _id: -1 });
    return res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('getNotificationsByContract error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-notification/:id
 * ดึง Notification ตาม _id
 */
exports.getNotificationById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const notif = await ContractNotification.findById(id).lean()
      .populate('contract_id', 'contract_number');
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    return res.json({ success: true, data: notif });
  } catch (err) {
    console.error('getNotificationById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/contract-notification/:id
 * อัปเดต Notification (เช่นเปลี่ยน message หรือ is_read)
 */
exports.updateNotification = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { notification_type, message, is_read } = req.body;

    const notif = await ContractNotification.findById(id).lean();
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification_type !== undefined) notif.notification_type = notification_type;
    if (message !== undefined) notif.message = message;
    if (is_read !== undefined) notif.is_read = is_read;

    await notif.save();

    io.emit('notifCreated', {
      id: notif.save()._id,
      data: notif.save()
    });



    return res.json({ success: true, data: notif });
  } catch (err) {
    console.error('updateNotification error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/contract-notification/:id
 * ลบ Notification ออกจาก DB จริง
 */
exports.deleteNotification = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const notif = await ContractNotification.findById(id).lean();
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notif.remove();
    return res.json({ success: true, data: notif });
  } catch (err) {
    console.error('deleteNotification error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
