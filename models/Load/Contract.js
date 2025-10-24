// models/Contract.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

// สร้าง Schema สำหรับ Contract
const contractSchema = new Schema(
  {
    customer_id: {
      type: Schema.Types.ObjectId,
      ref: 'Customer', // ชื่อโมเดล Customer
      required: true,
    },
    contract_number: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, default: null },
    total_amount: { type: Number, default: 0 },
    penalty_fee: { type: Number, default: 0 },
    status: { type: String, default: 'active' },

    // SoftDelete: ถ้า deleted_at != null => ถือว่าถูกลบ
    deleted_at: { type: Date, default: null },
  },
  {
    collection: 'tb_contracts', // ชื่อ collection ตรงกับตารางใน Laravel
    timestamps: true,          // สร้างฟิลด์ createdAt, updatedAt
  }
);

/**
 * ฟังก์ชัน Soft Delete (คล้าย use SoftDeletes ใน Laravel)
 * เซ็ต deleted_at = Date.now() แทนการลบจริง
 */
contractSchema.methods.softDelete = function () {
  this.deleted_at = new Date();
  return this.save();
};

/**
 * Virtual Relationships:
 * จำลอง hasMany ใน Laravel ด้วย Virtual Populate ของ Mongoose
 */

// installments
contractSchema.virtual('installments', {
  ref: 'Installment',       // ชื่อโมเดลลูก (models/Installment.js)
  localField: '_id',        // ฟิลด์ใน Contract
  foreignField: 'contract_id' // ฟิลด์ใน Installment
});

// paymentLogs
contractSchema.virtual('paymentLogs', {
  ref: 'PaymentLog',
  localField: '_id',
  foreignField: 'contract_id',
});

// attachments
contractSchema.virtual('attachments', {
  ref: 'ContractAttachment',
  localField: '_id',
  foreignField: 'contract_id',
});

// notifications
contractSchema.virtual('notifications', {
  ref: 'ContractNotification',
  localField: '_id',
  foreignField: 'contract_id',
});

// adjustments
contractSchema.virtual('adjustments', {
  ref: 'ContractAdjustment',
  localField: '_id',
  foreignField: 'contract_id',
});

// overdueNotifications
contractSchema.virtual('overdueNotifications', {
  ref: 'ContractOverdueNotification',
  localField: '_id',
  foreignField: 'contract_id',
});

// ส่งค่า virtuals ออกเวลาทำ JSON/Object
contractSchema.set('toObject', { virtuals: true });
contractSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Contract', contractSchema);
