// controllers/authController.js
const User = require('../models/User/User');
const bcrypt = require('bcrypt');

// Change password endpoint
exports.changePassword = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { username, currentPassword, newPassword } = req.body;

    // Validate input
    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านใหม่ไม่เป็นไปตามข้อกำหนด (ต้องมีอย่างน้อย 8 ตัวอักษร มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข)'
      });
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านเก่า'
      });
    }

    // Find user
    const user = await User.findOne({ username }).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้งานนี้ในระบบ'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.checkPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'รหัสผ่านเก่าไม่ถูกต้อง'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log the password change
    // console.log(`Password changed for user: ${username} at ${new Date()}`);

    // Emit socket event for security notification
    if (io) {
      io.emit('passwordChanged', {
        username,
        timestamp: new Date(),
        message: 'รหัสผ่านได้รับการเปลี่ยนแปลง'
      });
    }

    res.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ'
    });

  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง'
    });
  }
};

exports.logout = async (req, res) => {
  const io = req.app.get('io');
  try {
    // ถ้าใช้ JWT แบบ stateless อาจไม่ต้องทำอะไรเพิ่มเติม
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

