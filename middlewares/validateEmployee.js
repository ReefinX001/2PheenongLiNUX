// File: middlewares/validateEmployee.js

const Joi = require('joi');

// Schema สำหรับสร้าง Employee ให้ตรงกับ name attribute ในฟอร์ม
const createEmployeeSchema = Joi.object({
  // รองรับ employeeId ที่สร้างจากระบบ หรือใช้ employeeCode แทนก็ได้
  employeeId:                   Joi.string().alphanum().optional().allow(''),
  // หรือสลับใช้ employeeCode:   Joi.string().alphanum().optional().allow(''),
  name:                         Joi.string().trim().required(),               // ชื่อ-นามสกุล
  email:                        Joi.string().email().required(),              // อีเมล
  citizenId:                    Joi.string().pattern(/^\d{13}$/).required(),  // เลขบัตรประชาชน 13 หลัก
  birthDate:                    Joi.date().required(),                         // วันเกิด
  phone:                        Joi.string().pattern(/^0\d{9}$/).required(),   // เบอร์โทร 0XXXXXXXXX
  address:                      Joi.string().trim().required(),               // ที่อยู่
  position:                     Joi.string().trim().required(),               // ตำแหน่ง
  department:                   Joi.string().trim().required(),               // แผนก
  startDate:                    Joi.date().required(),                         // วันที่เริ่มงาน
  salary:                       Joi.number().required(),                       // เงินเดือน
  branch:                       Joi.string().trim().default('HEAD_OFFICE'),   // สาขา (ค่าเริ่มต้น)
  image:                        Joi.any().optional(),                          // ไฟล์รูปภาพ (upload.single('image'))
  emergencyContactName:         Joi.string().trim().required(),               // ชื่อผู้ติดต่อฉุกเฉิน
  emergencyContactRelationship: Joi.string().trim().required(),               // ความสัมพันธ์
  emergencyContactPhone:        Joi.string().pattern(/^0\d{9}$/).required()    // เบอร์โทรฉุกเฉิน
});

// Schema สำหรับอัปเดต Employee (ทุก field optional แต่ต้องมีอย่างน้อย 1 ฟิลด์)
const updateEmployeeSchema = Joi.object({
  employeeCode:                 Joi.string().alphanum().optional(),           // *** เปลี่ยนจาก employeeId เป็น employeeCode ***
  name:                         Joi.string().trim().optional(),
  email:                        Joi.string().email().optional(),
  citizenId:                    Joi.string().pattern(/^\d{13}$/).optional(),
  birthDate:                    Joi.date().optional(),
  phone:                        Joi.string().pattern(/^0\d{9}$/).optional(),
  address:                      Joi.string().trim().optional(),
  position:                     Joi.string().trim().optional(),
  department:                   Joi.string().trim().optional(),
  startDate:                    Joi.date().optional(),
  salary:                       Joi.number().optional(),
  branch:                       Joi.string().trim().optional(),
  image:                        Joi.any().optional(),
  emergencyContactName:         Joi.string().trim().optional(),
  emergencyContactRelationship: Joi.string().trim().optional(),
  emergencyContactPhone:        Joi.string().pattern(/^0\d{9}$/).optional()
})
.min(1); // ต้องส่งมาอย่างน้อย 1 ฟิลด์

// middleware ตรวจสอบ body เมื่อสร้างพนักงานใหม่
exports.employeeCreate = (req, res, next) => {
  const { error, value } = createEmployeeSchema.validate(req.body, { stripUnknown: true });
  if (error) {
     console.error('Validation error (createEmployee):', error.details);
    return res.status(400).json({ success: false, error: error.details });
  }
  req.validatedBody = value;
  next();
};

// Schema สำหรับ Virtual Employee (CEO/Admin)
const createVirtualEmployeeSchema = Joi.object({
  employeeId: Joi.string().alphanum().optional().allow(''),
  name: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  position: Joi.string().trim().default('CEO'),
  department: Joi.string().trim().default('Management'),
  // ฟิลด์ที่จำเป็นแต่ใช้ค่าเริ่มต้น
  citizenId: Joi.string().default('0000000000000'),
  birthDate: Joi.date().default(new Date('1990-01-01')),
  phone: Joi.string().default('0000000000'),
  address: Joi.string().default('Head Office'),
  startDate: Joi.date().default(new Date()),
  salary: Joi.number().default(0),
  branch: Joi.string().default('HEAD_OFFICE'),
  emergencyContactName: Joi.string().default('N/A'),
  emergencyContactRelationship: Joi.string().default('N/A'),
  emergencyContactPhone: Joi.string().default('0000000000'),
  image: Joi.any().optional()
});

// middleware ตรวจสอบ body เมื่ออัปเดตพนักงาน
exports.employeeUpdate = (req, res, next) => {
  const { error, value } = updateEmployeeSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({ success: false, error: error.details });
  }
  req.validatedBody = value;
  next();
};

// middleware สำหรับ Virtual Employee
exports.virtualEmployeeCreate = (req, res, next) => {
  const { error, value } = createVirtualEmployeeSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    console.error('Validation error (createVirtualEmployee):', error.details);
    return res.status(400).json({ success: false, error: error.details });
  }
  req.validatedBody = value;
  next();
};
