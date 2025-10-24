// File: models/Supplier.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const supplierSchema = new Schema(
  {
    // ข้อมูลพื้นฐาน
    name: { type: String, required: true },
    code: { type: String, required: true },      // รหัสซัพพลายเออร์

    // ข้อมูลภาษี
    taxId: { type: String, default: '' },
    branchCode: { type: String, default: '' },   // รหัสสาขา

    // ข้อมูลผู้ติดต่อ
    contact: { type: String, default: '' },      // ชื่อผู้ติดต่อหรือเบอร์โทร (legacy field)
    contactPerson: { type: String, default: '' }, // ชื่อผู้ติดต่อ
    position: { type: String, default: '' },      // ตำแหน่ง

    // ข้อมูลการติดต่อ
    phone: { type: String, default: '' },
    mobile: { type: String, default: '' },        // เบอร์มือถือ
    fax: { type: String, default: '' },           // แฟกซ์
    email: { type: String, default: '' },
    website: { type: String, default: '' },       // เว็บไซต์

    // ที่อยู่
    address: { type: String, default: '' },
    subDistrict: { type: String, default: '' },   // ตำบล/แขวง
    district: { type: String, default: '' },      // อำเภอ/เขต
    province: { type: String, default: '' },      // จังหวัด
    postalCode: { type: String, default: '' },    // รหัสไปรษณีย์

    // ข้อมูลการเงิน
    creditDays: { type: Number, default: 0 },     // จำนวนวันเครดิต
    creditLimit: { type: Number, default: 0 },    // วงเงินเครดิต
    paymentType: { type: String, default: '' },   // ประเภทการชำระเงิน

    // ข้อมูลธนาคาร
    bankAccount: { type: String, default: '' },   // เลขบัญชีธนาคาร
    bankName: { type: String, default: '' },      // ชื่อธนาคาร
    bankBranch: { type: String, default: '' },    // สาขาธนาคาร

    // อื่นๆ
    notes: { type: String, default: '' },         // หมายเหตุ
    remark: { type: String, default: '' },        // หมายเหตุเพิ่มเติม
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }, // สถานะการใช้งาน

    // SoftDelete: ถ้า deleted_at != null ถือว่าถูกลบ
    deleted_at: { type: Date, default: null },
  },
  {
    collection: 'tb_pi_suppliers',
    timestamps: true, // สร้าง createdAt, updatedAt
  }
);

// ฟังก์ชัน softDelete => ตั้งค่า deleted_at = Date.now()
supplierSchema.methods.softDelete = function () {
  this.deleted_at = new Date();
  return this.save();
};

supplierSchema.set('toObject', { virtuals: true });
supplierSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Supplier', supplierSchema);
