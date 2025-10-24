// controllers/notificationController.js
const Notification = require('../models/HR/Notification');

// helper ดึง userId
const getUserId = (user) => user._id?.toString() || user.id;

// นับจำนวนแจ้งเตือนที่ยังไม่อ่าน
exports.getUnreadCount = async (req, res) => {
  const io = req.app.get('io');
  try {
    const userId = getUserId(req.user);
    const count  = await Notification.countDocuments({ user: userId, isRead: false });
    return res.json({ success: true, data: { unreadCount: count } });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ดึงแจ้งเตือนทั้งหมด: ถ้าเป็น Admin จะเห็นทั้งหมด
exports.getAll = async (req, res) => {
  const io = req.app.get('io');
  try {
    const userId = getUserId(req.user);
const isAdmin = req.user.role === 'admin' || req.user.role === 'hr';
    const filter = isAdmin ? {} : { user: userId };

    const notifications = await Notification
      .find(filter).limit(100).lean()
      .sort('-createdAt')
      .populate({
        path: 'user',
        select: '_id',
        populate: { path: 'employee', select: 'name position' }
      });

    return res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('getAll notifications error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// สร้างแจ้งเตือนใหม่ (ผูกกับผู้ใช้ที่ล็อกอิน)
exports.create = async (req, res) => {
  const io = req.app.get('io');
  try {
     const loginUserId = getUserId(req.user);
     if (!loginUserId) {
       return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const {
      user,
      type, level = 0, title, message, date,
      fine = 0, actionNeeded = '', department = 'HR', meta = {}
    } = req.body;

        // ตรวจเบื้องต้นว่า form ส่ง user มาไหม
    if (!user) {
      return res.status(400).json({ success: false, error: 'ต้องระบุ user ใน payload' });
    }

    const newNotification = new Notification({
      user: user, type, level, title, message,
      date, fine, actionNeeded, department, meta
    });
    const saved = await newNotification.save();
    io.emit('newnotificationCreated', {
      id: saved._id,
      data: saved
    });

    // populate ก่อนส่งกลับ
    const populated = await Notification.findById(saved._id).lean()
      .populate({
        path: 'user',
        populate: { path: 'employee', select: 'name position' }
      });

    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error('create notification error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ทำเครื่องหมายว่าอ่านแล้ว (เฉพาะของเจ้าของแจ้งเตือน)
exports.markAsRead = async (req, res) => {
  const io = req.app.get('io');
  try {
    const userId = getUserId(req.user);
    const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: userId },   // เฉพาะของตัวเอง
            { isRead: true },
            { new: true }
          );
    io.emit('notificationUpdated', {
      id: notification._id,
      data: notification
    });
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    await notification.populate({
      path: 'user',
      populate: { path: 'employee', select: 'name position' }
    });
    return res.json({ success: true, data: notification });
  } catch (err) {
    console.error('markAsRead error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};


// ลบแจ้งเตือน (เฉพาะของเจ้าของแจ้งเตือน)
exports.remove = async (req, res) => {
  const io = req.app.get('io');
  try {
    const userId = getUserId(req.user);
    const isAdmin = req.user.role === 'admin' || req.user.role === 'hr';
    const filter = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, user: userId };

    const notification = await Notification.findOneAndDelete(filter);
    io.emit('notificationDeleted', {
      id: notification._id,
      data: notification
    });
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    await notification.populate({
      path: 'user',
      populate: { path: 'employee', select: 'name position' }
    });
    return res.json({ success: true, data: notification });
  } catch (err) {
    console.error('remove notification error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};


// อัปเดตเฉพาะฟิลด์ที่อนุญาต (message, isRead, meta)
exports.update = async (req, res) => {
  const io = req.app.get('io');
  try {
    const userId = getUserId(req.user);
    const isAdmin = req.user.role === 'admin' || req.user.role === 'hr';
    const filter = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, user: userId };

    const notification = await Notification.findOne(filter).lean();
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    ['message', 'isRead', 'meta'].forEach(field => {
      if (req.body[field] !== undefined) {
        notification[field] = req.body[field];
      }
    });
    await notification.save();

    io.emit('notificationCreated', {
      id: notification.save()._id,
      data: notification.save()
    });

    await notification.populate({
      path: 'user',
      populate: { path: 'employee', select: 'name position' }
    });
    return res.json({ success: true, data: notification });
  } catch (err) {
    console.error('update notification error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

