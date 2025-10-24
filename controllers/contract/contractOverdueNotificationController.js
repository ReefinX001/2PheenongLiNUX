// controllers/contractOverdueNotificationController.js

const ContractOverdueNotification = require('../models/Load/ContractOverdueNotification');

/**
 * POST /api/contract-overdue-notification
 * สร้าง Overdue Notification ใหม่ (แจ้งเตือนค่างวดค้าง)
 */
exports.createOverdueNotification = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { contract_id, installment_id, notification_date, status, message } = req.body;

    if (!contract_id || !installment_id) {
      return res.status(400).json({
        error: 'contract_id and installment_id are required.'
      });
    }

    const newNotif = new ContractOverdueNotification({
      contract_id,
      installment_id,
      notification_date: notification_date ? new Date(notification_date) : new Date(),
      status: status || '',
      message: message || ''
    });

    await newNotif.save();

    io.emit('newnotifCreated', {
      id: newNotif.save()._id,
      data: newNotif.save()
    });



    return res.json({ success: true, data: newNotif });
  } catch (err) {
    console.error('createOverdueNotification error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-overdue-notification
 * ดึงรายการ Overdue Notification ทั้งหมด
 */
exports.getAllOverdueNotifications = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate contract_id, installment_id ตามต้องการ
    const notifications = await ContractOverdueNotification.find().limit(100).lean()
      .populate('contract_id', 'contract_number status')
      .populate('installment_id', 'installment_number due_date')
      .sort({ notification_date: -1 });

    return res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('getAllOverdueNotifications error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-overdue-notification/contract/:contractId
 * ดึงรายการเฉพาะ contract_id
 */
exports.getOverdueNotificationsByContract = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { contractId } = req.params;
    const notifications = await ContractOverdueNotification.find({ contract_id: contractId }).limit(100).lean()
      .populate('installment_id', 'installment_number due_date')
      .sort({ notification_date: -1 });

    return res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('getOverdueNotificationsByContract error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/contract-overdue-notification/:id
 * ดึง Overdue Notification ตาม _id
 */
exports.getOverdueNotificationById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const notif = await ContractOverdueNotification.findById(id).lean()
      .populate('contract_id', 'contract_number')
      .populate('installment_id', 'installment_number due_date');
    if (!notif) {
      return res.status(404).json({ error: 'Overdue Notification not found' });
    }
    return res.json({ success: true, data: notif });
  } catch (err) {
    console.error('getOverdueNotificationById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/contract-overdue-notification/:id
 * อัปเดตข้อมูลบางส่วน (เช่น status, message)
 */
exports.updateOverdueNotification = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const { notification_date, status, message } = req.body;

    const notif = await ContractOverdueNotification.findById(id).lean();
    if (!notif) {
      return res.status(404).json({ error: 'Overdue Notification not found' });
    }

    if (notification_date !== undefined) notif.notification_date = new Date(notification_date);
    if (status !== undefined) notif.status = status;
    if (message !== undefined) notif.message = message;

    await notif.save();

    io.emit('notifCreated', {
      id: notif.save()._id,
      data: notif.save()
    });



    return res.json({ success: true, data: notif });
  } catch (err) {
    console.error('updateOverdueNotification error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/contract-overdue-notification/:id
 * ลบรายการออกจาก DB จริง
 */
exports.deleteOverdueNotification = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const notif = await ContractOverdueNotification.findById(id).lean();
    if (!notif) {
      return res.status(404).json({ error: 'Overdue Notification not found' });
    }

    await notif.remove();
    return res.json({ success: true, data: notif });
  } catch (err) {
    console.error('deleteOverdueNotification error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
