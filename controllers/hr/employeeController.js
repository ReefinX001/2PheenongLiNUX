const mongoose = require('mongoose');
const Employee = require('../../models/HR/Employee');

// ปรับปรุงฟังก์ชันสร้าง employeeId ให้ป้องกัน race condition
async function generateUniqueEmployeeId(session = null) {
  try {
    // Find the highest existing employeeId and increment
    const query = Employee.findOne({}, { employeeId: 1 }, {
      sort: { employeeId: -1 },
      lean: true
    });

    if (session) {
      query.session(session);
    }

    const lastEmployee = await query;
    let nextNumber = 1;

    if (lastEmployee && lastEmployee.employeeId) {
      // Extract number from EMP001 format
      const match = lastEmployee.employeeId.match(/EMP(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const employeeId = `EMP${String(nextNumber).padStart(3, '0')}`;

    // Double-check ว่าไม่ซ้ำ (เผื่อมีการ manual insert)
    const existsQuery = Employee.findOne({ employeeId }, { _id: 1 }, { lean: true });
    if (session) {
      existsQuery.session(session);
    }

    const exists = await existsQuery;

    if (exists) {
      // ถ้าซ้ำ ให้เรียกซ้ำ (recursive)
      console.warn(`Employee ID ${employeeId} already exists, generating new one...`);
      return await generateUniqueEmployeeId(session);
    }

    return employeeId;
  } catch (error) {
    console.error('Error generating unique employee ID:', error);

    // Fallback: ใช้ timestamp + random
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `EMP${timestamp}${random}`.substring(0, 10); // จำกัดความยาว
  }
}

// สร้างพนักงานใหม่
exports.createEmployee = async (req, res, next) => {
  const io = req.app.get('io');
  const session = await mongoose.startSession();

  // Enhanced logging
  const requestId = req.headers['x-request-id'] || Date.now().toString();
  console.log(`[${requestId}] Creating new employee - User: ${req.user?.username || 'Unknown'}`);

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
      data.createdBy = req.user?.id || req.user?._id;
    const emp = new Employee(data);
      const savedEmp = await emp.save({ session });

      console.log(`[${requestId}] Employee created successfully: ${savedEmp.employeeId}`);

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
    console.error(`[${requestId}] Create employee error:`, err);

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

    // Enhanced error handling
    if (err.message && err.message.includes('ถูกใช้งานแล้ว')) {
      console.warn(`[${requestId}] Duplicate data detected: ${err.message}`);
      return res.status(400).json({
        success: false,
        message: err.message,
        error: 'DUPLICATE_DATA',
        code: 'EMP_DUPLICATE'
      });
    }

    // MongoDB duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const value = err.keyValue[field];
      const errorMsg = `${field === 'email' ? 'อีเมล' : field === 'citizenId' ? 'เลขบัตรประชาชน' : field === 'phone' ? 'เบอร์โทร' : field} "${value}" ถูกใช้งานแล้ว`;

      console.warn(`[${requestId}] MongoDB duplicate key error: ${errorMsg}`);
      return res.status(400).json({
        success: false,
        message: errorMsg,
        error: 'DUPLICATE_KEY',
        code: 'EMP_DUPLICATE_KEY'
      });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      console.warn(`[${requestId}] Validation error: ${validationErrors.join(', ')}`);
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        error: 'VALIDATION_ERROR',
        code: 'EMP_VALIDATION',
        details: validationErrors
      });
    }

    // Log unexpected errors
    console.error(`[${requestId}] Unexpected error:`, {
      message: err.message,
      stack: err.stack,
      code: err.code
    });

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
    let emp;
    const id = req.params.id;

    // Handle 'current' parameter - get from JWT token
    if (id === 'current') {
      // Try to get user ID from JWT token or session
      const userId = req.user?.id || req.user?.userId || req.headers['x-user-id'];

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
          message: 'ไม่พบข้อมูลผู้ใช้งาน'
        });
      }

      // Try to find by userId first, then by _id
      emp = await Employee.findOne({
        $or: [
          { userId: userId },
          { _id: userId }
        ],
        deleted_at: null
      }).lean();
    } else {
      // Regular ID lookup
      emp = await Employee.findOne({ _id: id, deleted_at: null }).lean();
    }

    if (!emp) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'ไม่พบข้อมูลพนักงาน'
      });
    }

    // Calculate work experience and additional data
    const now = new Date();
    let workExperience = { years: 0, months: 0, days: 0 };
    let totalWorkDays = 0;

    if (emp.startDate) {
      const startDate = new Date(emp.startDate);
      const diffTime = Math.abs(now - startDate);
      totalWorkDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      workExperience.years = Math.floor(totalWorkDays / 365);
      const remainingDays = totalWorkDays % 365;
      workExperience.months = Math.floor(remainingDays / 30);
      workExperience.days = remainingDays % 30;
    }

    // Add computed fields
    const enhancedEmployee = {
      ...emp,
      workExperience,
      totalWorkDays,
      hireDate: emp.startDate, // Alias for compatibility
      joinDate: emp.startDate, // Alias for compatibility
      branchName: emp.branch || 'สำนักงานใหญ่'
    };

    res.json({
      success: true,
      data: enhancedEmployee,
      message: 'Employee data retrieved successfully'
    });
  } catch (err) {
    console.error('Error fetching employee:', err);
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

    // Enhanced error handling
    if (err.message && err.message.includes('ถูกใช้งานแล้ว')) {
      console.warn(`[${requestId}] Duplicate data detected: ${err.message}`);
      return res.status(400).json({
        success: false,
        message: err.message,
        error: 'DUPLICATE_DATA',
        code: 'EMP_DUPLICATE'
      });
    }

    // MongoDB duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const value = err.keyValue[field];
      const errorMsg = `${field === 'email' ? 'อีเมล' : field === 'citizenId' ? 'เลขบัตรประชาชน' : field === 'phone' ? 'เบอร์โทร' : field} "${value}" ถูกใช้งานแล้ว`;

      console.warn(`[${requestId}] MongoDB duplicate key error: ${errorMsg}`);
      return res.status(400).json({
        success: false,
        message: errorMsg,
        error: 'DUPLICATE_KEY',
        code: 'EMP_DUPLICATE_KEY'
      });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      console.warn(`[${requestId}] Validation error: ${validationErrors.join(', ')}`);
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        error: 'VALIDATION_ERROR',
        code: 'EMP_VALIDATION',
        details: validationErrors
      });
    }

    // Log unexpected errors
    console.error(`[${requestId}] Unexpected error:`, {
      message: err.message,
      stack: err.stack,
      code: err.code
    });

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
    const emp = await Employee.findById(req.params.id).lean();
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

