// File: models/UserRole.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserRoleSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,    // เช่น 'admin', 'staff', 'viewer'
    trim: true
  },
  description: {
    type: String,
    default: ''      // คำอธิบาย role
  },
  permissions: [{
    type: String     // ใส่ permission ต่างๆ ตามต้องการ เช่น 'CREATE_ORDER', 'READ_REPORT'
  }],
  // เก็บหน้าที่อนุญาตเข้าฝั่ง UI (module.id ใน allModules)
  allowedPages: {
    type: [String],
    default: []
  },
  // เก็บ ObjectId ของสาขาที่อนุญาตเข้าถึง POS
  allowedBranches: [{
    type: Schema.Types.ObjectId,
    ref: 'Branch'
  }],
  // ฟิลด์สำหรับ soft delete
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  collection: 'userroles',
  timestamps: true
});

// เมธอด soft delete
UserRoleSchema.methods.softDelete = function() {
  this.deleted_at = new Date();
  return this.save();
};

module.exports = mongoose.models.UserRole || mongoose.model('UserRole', UserRoleSchema);
