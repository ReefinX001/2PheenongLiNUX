// models/LoginRequest.js
const mongoose = require('mongoose');

const loginRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  employeeName: String,
  photoUrl: String,  // Added for storing user photo
  reason: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired', 'used'],  // Added 'used' status
    default: 'pending'
  },
  device: String,
  ipAddress: String,
  userAgent: String,
  approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approverName: String,  // เก็บชื่อผู้อนุมัติ
  approverNote: String,
  approvedAt: Date,
  processedAt: Date,  // เวลาที่ดำเนินการ (อนุมัติ/ปฏิเสธ)
  token: String,  // Added for storing the JWT token when approved
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,

  // ข้อมูลเพิ่มเติมสำหรับประวัติ
  loginSuccessAt: Date,  // เวลาที่ login สำเร็จ
  sessionDuration: Number,  // ระยะเวลา session (วินาที)
  logoutAt: Date,  // เวลาที่ logout
  logoutReason: String,  // เหตุผลการ logout

  // ข้อมูลการใช้งาน
  usageCount: { type: Number, default: 0 },  // จำนวนครั้งที่ใช้ token
  lastUsedAt: Date,  // ครั้งสุดท้ายที่ใช้ token

  // Audit trail
  auditLog: [{
    action: String,  // 'created', 'approved', 'rejected', 'used', 'expired'
    performedBy: String,  // user ID หรือ 'system'
    performedAt: { type: Date, default: Date.now },
    details: String,  // รายละเอียดเพิ่มเติม
    ipAddress: String
  }]
});

// Add index for faster queries
// Note: requestId index is automatically created by 'unique: true'
loginRequestSchema.index({ status: 1, expiresAt: 1 });
loginRequestSchema.index({ userId: 1, createdAt: -1 });
loginRequestSchema.index({ createdAt: -1 });  // สำหรับดึงประวัติ
loginRequestSchema.index({ processedAt: -1 });  // สำหรับดึงประวัติที่ดำเนินการแล้ว
loginRequestSchema.index({ approverId: 1, processedAt: -1 });  // สำหรับดูประวัติการอนุมัติ

// Methods
loginRequestSchema.methods.updateStatus = async function(
  status,
  approverId,
  approverName,
  note,
  approverIP
) {
  try {
    // อัปเดตข้อมูลหลัก
    this.status = status;
    this.processedAt = new Date();

    if (status === 'approved' || status === 'rejected') {
      this.approverId = approverId;
      this.approverName = approverName;
      this.approverNote = note;
      this.approvedAt = new Date();
    }

    // เพิ่ม audit log โดยตรง (ไม่เรียก addAuditLog เพื่อหลีกเลี่ยง recursive save)
    this.auditLog.push({
      action: status,
      performedBy: approverId || 'system',
      performedAt: new Date(),
      details: note || `Request ${status} by ${approverName || 'System'}`,
      ipAddress: approverIP || 'unknown'
    });

    await this.save();

    console.log(`✅ Request ${this.requestId} status updated to: ${status}`);

  } catch (error) {
    console.error('❌ Error updating request status:', error);
    throw error;
  }
};

loginRequestSchema.methods.addAuditLog = async function(
  action,
  performedBy,
  details,
  ipAddress
) {
  try {
    this.auditLog.push({
      action,
      performedBy: performedBy || 'system',
      performedAt: new Date(),
      details: details || '',
      ipAddress: ipAddress || 'unknown'
    });

    await this.save();

    console.log(`📝 Audit log added for ${this.requestId}: ${action}`);

  } catch (error) {
    console.error('❌ Error adding audit log:', error);
    throw error;
  }
};

module.exports = mongoose.model('LoginRequest', loginRequestSchema);
