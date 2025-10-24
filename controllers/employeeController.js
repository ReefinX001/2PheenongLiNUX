const mongoose = require('mongoose');
const Employee = require('../models/HR/Employee');

// เพิ่มฟังก์ชันนี้ก่อน createEmployee
async function generateUniqueEmployeeId(session = null) {
  let attempts = 0;
  const maxAttempts = 100; // ป้องกันวนลูปไม่รู้จบ

  while (attempts < maxAttempts) {
    // หาเลขล่าสุด
    const query = Employee
      .findOne({ deleted_at: null }).lean()
      .sort({ employeeId: -1 })
      .select('employeeId');

    if (session) {
      query.session(session);
    }

    const last = await query;

    let num = 1;
    if (last?.employeeId) {
      const m = last.employeeId.match(/EMP(\d+)/);
      if (m) num = parseInt(m[1]) + 1;
    }

    const candidateId = `EMP${String(num).padStart(3, '0')}`;

    // ตรวจสอบว่ามีอยู่แล้วหรือไม่
    const existsQuery = Employee.findOne({ employeeId: candidateId }).lean();
    if (session) {
      existsQuery.session(session);
    }

    const exists = await existsQuery;

    if (!exists) {
      return candidateId; // ไม่ซ้ำ ใช้ได้
    }

    // ถ้าซ้ำ จะวนลูปไปเรื่อยๆ โดยเลข num จะเพิ่มขึ้นอัตโนมัติในรอบถัดไป
    attempts++;
  }

  throw new Error('ไม่สามารถสร้างรหัสพนักงานที่ไม่ซ้ำได้ หลังจากพยายาม ' + maxAttempts + ' ครั้ง');
}

// สร้างพนักงานใหม่
exports.createEmployee = async (req, res, next) => {
  const io = req.app.get('io');
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
    const {
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone,
      employeeId, // รับจาก frontend (ถ้ามี)
        email,
        citizenId,
        phone,
      ...rest
    } = req.validatedBody;

      // === ตรวจสอบข้อมูลซ้ำก่อนบันทึก ===
      const duplicateChecks = await Promise.all([
        // ตรวจสอบอีเมลซ้ำ (ยกเว้นที่ถูกลบแล้ว)
        Employee.findOne({
          email: email.toLowerCase(),
          deleted_at: null
        }).session(session),

        // ตรวจสอบเลขบัตรประชาชนซ้ำ
        Employee.findOne({
          citizenId: citizenId,
          deleted_at: null
        }).session(session),

        // ตรวจสอบเบอร์โทรซ้ำ
        Employee.findOne({
          phone: phone,
          deleted_at: null
        }).session(session)
      ]);

      const [existingEmail, existingCitizenId, existingPhone] = duplicateChecks;

      if (existingEmail) {
        throw new Error(`อีเมล ${email} ถูกใช้งานแล้วโดยพนักงาน: ${existingEmail.name} (${existingEmail.employeeId})`);
      }

      if (existingCitizenId) {
        throw new Error(`เลขบัตรประชาชน ${citizenId} ถูกใช้งานแล้วโดยพนักงาน: ${existingCitizenId.name} (${existingCitizenId.employeeId})`);
      }

      if (existingPhone) {
        throw new Error(`เบอร์โทร ${phone} ถูกใช้งานแล้วโดยพนักงาน: ${existingPhone.name} (${existingPhone.employeeId})`);
      }

      // === สร้าง employeeId ที่ไม่ซ้ำ ===
    let finalEmployeeId = employeeId;

    if (!finalEmployeeId) {
      // สร้างใหม่พร้อมตรวจสอบความซ้ำซ้อน
        finalEmployeeId = await generateUniqueEmployeeId(session);
    } else {
      // ถ้า frontend ส่งมา ก็ตรวจสอบว่าซ้ำหรือไม่
        const exists = await Employee.findOne({
          employeeId: finalEmployeeId
        }).session(session);

      if (exists) {
        // ถ้าซ้ำ ให้สร้างใหม่
          finalEmployeeId = await generateUniqueEmployeeId(session);
      }
    }

      // === เตรียมข้อมูลสำหรับบันทึก ===
      const data = {
        ...rest,
        employeeId: finalEmployeeId,
        email: email.toLowerCase(), // normalize email
        citizenId,
        phone
      };

    // ถ้ามีไฟล์รูป ให้เซ็ต image path
    if (req.file) {
      data.imageUrl = `/uploads/employees/${req.file.filename}`;
    }

    // รวม emergencyContact เป็น nested object
    data.emergencyContact = {
      name:     emergencyContactName || '',
      relation: emergencyContactRelationship || '',
      phone:    emergencyContactPhone || ''
    };

      // === บันทึกข้อมูล ===
    const emp = new Employee(data);
      const savedEmp = await emp.save({ session });

      // === ส่งข้อมูลผ่าน Socket.IO ===
    io.emit('empCreated', {
      id: savedEmp._id,
      data: savedEmp
    });

      // === ส่งผลลัพธ์กลับ ===
    res.status(201).json({
      success: true,
      message: `เพิ่มพนักงานใหม่สำเร็จ (รหัส: ${savedEmp.employeeId})`,
      data: savedEmp
      });
    });
  } catch (err) {
    console.error('Create employee error:', err);

    // ลบไฟล์ที่อัพโหลดไว้หากเกิด error
    if (req.file) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '..', 'uploads', 'employees', req.file.filename);

      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting uploaded file:', unlinkErr);
        } else {
          // console.log('Deleted uploaded file due to transaction failure');
        }
      });
    }

    // ส่ง error ที่เป็นมิตรกับผู้ใช้
    if (err.message && err.message.includes('ถูกใช้งานแล้ว')) {
      return res.status(400).json({
        success: false,
        message: err.message,
        error: 'DUPLICATE_DATA'
      });
    }

    // MongoDB duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const value = err.keyValue[field];
      return res.status(400).json({
        success: false,
        message: `${field === 'email' ? 'อีเมล' : field === 'citizenId' ? 'เลขบัตรประชาชน' : field === 'phone' ? 'เบอร์โทร' : field} "${value}" ถูกใช้งานแล้ว`,
        error: 'DUPLICATE_KEY'
      });
    }

    next(err);
  } finally {
    await session.endSession();
  }
};

// ดึงรายชื่อพนักงาน (เฉพาะที่ยังไม่ลบเชิงตรรกะ)
exports.getEmployees = async (req, res, next) => {
  const io = req.app.get('io');
  try {
    const list = await Employee.find({ deleted_at: null }).limit(100).lean().sort('-createdAt');
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};

// ดึงพนักงานตาม ID
exports.getEmployeeById = async (req, res, next) => {
  const io = req.app.get('io');
  try {
    const emp = await Employee.findOne({ _id: req.params.id, deleted_at: null }).lean();
    if (!emp) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: emp });
  } catch (err) {
    next(err);
  }
};

// อัพเดทข้อมูลพนักงาน
exports.updateEmployee = async (req, res, next) => {
  const io = req.app.get('io');
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
    const {
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone,
        email,
        citizenId,
        phone,
      ...rest
    } = req.validatedBody;

      // ตรวจสอบว่าพนักงานมีอยู่จริง
      const currentEmployee = await Employee.findOne({
        _id: req.params.id,
        deleted_at: null
      }).session(session);

      if (!currentEmployee) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลพนักงาน'
        });
      }

      // === ตรวจสอบข้อมูลซ้ำ (ยกเว้นพนักงานคนเดิม) ===
      if (email || citizenId || phone) {
        const duplicateChecks = [];

        if (email && email !== currentEmployee.email) {
          duplicateChecks.push(
            Employee.findOne({
              email: email.toLowerCase(),
              deleted_at: null,
              _id: { $ne: req.params.id }
            }).session(session)
          );
        }

        if (citizenId && citizenId !== currentEmployee.citizenId) {
          duplicateChecks.push(
            Employee.findOne({
              citizenId: citizenId,
              deleted_at: null,
              _id: { $ne: req.params.id }
            }).session(session)
          );
        }

        if (phone && phone !== currentEmployee.phone) {
          duplicateChecks.push(
            Employee.findOne({
              phone: phone,
              deleted_at: null,
              _id: { $ne: req.params.id }
            }).session(session)
          );
        }

        if (duplicateChecks.length > 0) {
          const results = await Promise.all(duplicateChecks);

          let errorIndex = 0;
          if (email && email !== currentEmployee.email && results[errorIndex]) {
            const existing = results[errorIndex];
            throw new Error(`อีเมล ${email} ถูกใช้งานแล้วโดยพนักงาน: ${existing.name} (${existing.employeeId})`);
          }
          if (email && email !== currentEmployee.email) errorIndex++;

          if (citizenId && citizenId !== currentEmployee.citizenId && results[errorIndex]) {
            const existing = results[errorIndex];
            throw new Error(`เลขบัตรประชาชน ${citizenId} ถูกใช้งานแล้วโดยพนักงาน: ${existing.name} (${existing.employeeId})`);
          }
          if (citizenId && citizenId !== currentEmployee.citizenId) errorIndex++;

          if (phone && phone !== currentEmployee.phone && results[errorIndex]) {
            const existing = results[errorIndex];
            throw new Error(`เบอร์โทร ${phone} ถูกใช้งานแล้วโดยพนักงาน: ${existing.name} (${existing.employeeId})`);
          }
        }
      }

      // === เตรียมข้อมูลสำหรับอัปเดต ===
    const update = { ...rest };

      if (email) update.email = email.toLowerCase();
      if (citizenId) update.citizenId = citizenId;
      if (phone) update.phone = phone;

    // ถ้ามีไฟล์รูปใหม่ ให้อัปเดต image
      if (req.file) {
      update.imageUrl = `/uploads/employees/${req.file.filename}`;
    }

    // ถ้าส่ง emergency contact มา ให้รวมเป็น nested object
    if (
      emergencyContactName !== undefined ||
      emergencyContactRelationship !== undefined ||
      emergencyContactPhone !== undefined
    ) {
      update.emergencyContact = {
          ...currentEmployee.emergencyContact,
        ...(emergencyContactName !== undefined && { name: emergencyContactName }),
        ...(emergencyContactRelationship !== undefined && { relation: emergencyContactRelationship }),
        ...(emergencyContactPhone !== undefined && { phone: emergencyContactPhone }),
      };
    }

      // === อัปเดตข้อมูล ===
    const emp = await Employee.findOneAndUpdate(
            { _id: req.params.id, deleted_at: null },
            update,
        { new: true, runValidators: true, session }
          );

      // === ส่งข้อมูลผ่าน Socket.IO ===
    io.emit('employeeUpdated', {
      id: emp._id,
      data: emp
    });

      // === ส่งผลลัพธ์กลับ ===
      res.json({
        success: true,
        message: 'อัปเดตข้อมูลพนักงานสำเร็จ',
        data: emp
      });
    });
  } catch (err) {
    console.error('Update employee error:', err);

    // ลบไฟล์ที่อัพโหลดไว้หากเกิด error
    if (req.file) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '..', 'uploads', 'employees', req.file.filename);

      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting uploaded file:', unlinkErr);
        } else {
          // console.log('Deleted uploaded file due to transaction failure');
        }
      });
    }

    // ส่ง error ที่เป็นมิตรกับผู้ใช้
    if (err.message && err.message.includes('ถูกใช้งานแล้ว')) {
      return res.status(400).json({
        success: false,
        message: err.message,
        error: 'DUPLICATE_DATA'
      });
    }

    // MongoDB duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const value = err.keyValue[field];
      return res.status(400).json({
        success: false,
        message: `${field === 'email' ? 'อีเมล' : field === 'citizenId' ? 'เลขบัตรประชาชน' : field === 'phone' ? 'เบอร์โทร' : field} "${value}" ถูกใช้งานแล้ว`,
        error: 'DUPLICATE_KEY'
      });
    }

    next(err);
  } finally {
    await session.endSession();
  }
};

// Soft Delete
// controllers/employeeController.js

// Soft Delete
exports.deleteEmployee = async (req, res, next) => {
  const io = req.app.get('io');
  try {
    // 1) หาเอกสารก่อน
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ success: false, error: 'Not found' });

    // 2) ติ๊กวันที่ลบ แต่ไม่ตรวจ validation ฟิลด์อื่นๆ
    emp.deleted_at = new Date();
    await emp.save({ validateBeforeSave: false });

    io.emit('employeeDeleted', {
      id: emp._id,
      data: emp
    });

    // 3) ตอบกลับ
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/employees/reset-auto-increment
 * รีเซ็ตตัวนับ employeeCode ให้เริ่มจากค่าใหม่
 */
exports.resetAutoIncrement = async (req, res) => {
  try {
    // หา employeeCode ที่มากที่สุด
    const maxEmployee = await Employee
      .findOne({}).lean()
      .sort({ employeeCode: -1 })
      .select('employeeCode');

    const nextCode = maxEmployee ? maxEmployee.employeeCode + 1 : 1;

    // Reset counter ใน collection ของ mongoose-sequence
    await mongoose.connection.db.collection('counters').updateOne(
      { id: 'employeeCode' },
      { $set: { seq: nextCode } },
      { upsert: true }
    );

    res.json({
      success: true,
      message: `Reset auto-increment to ${nextCode}`
    });
  } catch (error) {
    console.error('resetAutoIncrement error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ── เพิ่ม: ฟังก์ชันดึงรหัสพนักงานถัดไป ────────────────────────
// แก้ไข getNextEmployeeCode ให้ตรวจสอบความซ้ำซ้อนด้วย
exports.getNextEmployeeCode = async (req, res, next) => {
  try {
    const nextCode = await generateUniqueEmployeeId();
    res.json({ success: true, nextCode });
  } catch (err) {
    next(err);
  }
};

// ดึงข้อมูลโปรไฟล์พนักงาน
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'ไม่พบข้อมูลผู้ใช้งาน'
      });
    }

    console.log('🔍 Getting profile for userId:', userId);

    // Import User model to find employee reference
    const User = require('../models/User/User');

    // ค้นหา User และ populate ข้อมูล employee
    const user = await User.findById(userId)
      .populate('employee')
      .lean();

    if (!user) {
      console.log('❌ User not found for userId:', userId);
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลผู้ใช้งาน'
      });
    }

    let employee = user.employee;

    // ถ้าไม่มี employee linked ให้ลองหาจากฐานข้อมูลตาม email หรือ name
    if (!employee) {
      console.log('⚠️ No employee linked to user, trying to find by email or name...');

      // ลองหาจาก email ตรงกัน
      if (user.email) {
        employee = await Employee.findOne({
          email: user.email,
          deleted_at: null
        }).lean();
      }

      // ถ้ายังไม่พบ ให้ส่งข้อมูลพนักงานตัวแรกที่มี (สำหรับการ debug)
      if (!employee) {
        console.log('⚠️ Employee not found by email, returning first employee for debugging');
        employee = await Employee.findOne({
          deleted_at: null
        }).lean();
      }

      if (!employee) {
        console.log('❌ No employees found in database');
        return res.status(404).json({
          success: false,
          error: 'ไม่พบข้อมูลพนักงานในระบบ'
        });
      }
    }

    console.log('✅ Found employee for profile:', {
      id: employee._id,
      employeeId: employee.employeeId,
      name: employee.name
    });

    // ลบข้อมูลที่อ่อนไหว
    const profileData = {
      _id: employee._id,
      employeeId: employee.employeeId,
      name: employee.name,
      position: employee.position,
      department: employee.department,
      branch: employee.branch,
      email: employee.email,
      phone: employee.phone,
      imageUrl: employee.imageUrl,
      photoUrl: employee.imageUrl, // alias for compatibility
      hireDate: employee.hireDate,
      startDate: employee.startDate,
      status: employee.status || 'active'
    };

    res.json({
      success: true,
      data: profileData
    });
  } catch (err) {
    console.error('❌ Error in getProfile:', err);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้'
    });
  }
};

// ดึงข้อมูลพนักงานโดยใช้ userId
exports.getEmployeeByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ userId'
      });
    }

    console.log('🔍 Looking for employee with userId:', userId);

    // Import User model to find employee reference
    const User = require('../models/User/User');

    // ค้นหา User ก่อน แล้ว populate ข้อมูล employee
    const user = await User.findById(userId)
      .populate('employee')
      .lean();

    if (!user) {
      console.log('❌ User not found for userId:', userId);
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลผู้ใช้งาน'
      });
    }

    if (!user.employee) {
      console.log('❌ Employee not linked to user:', userId);
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลพนักงานที่เชื่อมโยงกับผู้ใช้งานนี้'
      });
    }

    const employee = user.employee;

    console.log('✅ Employee found:', {
      id: employee._id,
      employeeId: employee.employeeId,
      name: employee.name,
      imageUrl: employee.imageUrl
    });

    // ส่งข้อมูลพนักงานพร้อมรูปโปรไฟล์
    const employeeData = {
      _id: employee._id,
      employeeId: employee.employeeId,
      name: employee.name,
      position: employee.position,
      department: employee.department,
      branch: employee.branch,
      branchId: employee.branchId,
      branchName: employee.branchName,
      email: employee.email,
      phone: employee.phone,
      imageUrl: employee.imageUrl,
      photoUrl: employee.imageUrl, // alias
      avatar: employee.imageUrl,   // alias
      photo: employee.imageUrl,    // alias
      profileImage: employee.imageUrl, // alias
      image: employee.imageUrl,    // alias
      hireDate: employee.hireDate,
      startDate: employee.hireDate || employee.startDate, // alias
      joinDate: employee.hireDate || employee.startDate,  // alias
      status: employee.status || 'active',
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt
    };

    res.json({
      success: true,
      data: employeeData
    });
  } catch (err) {
    console.error('❌ Error in getEmployeeByUserId:', err);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลพนักงานได้'
    });
  }
};

