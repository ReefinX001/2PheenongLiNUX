// File: controllers/hr/salaryController.js

const Salary = require('../../models/HR/Salary');
const EmployeeSalary = require('../../models/HR/EmployeeSalary');
const BasicSalary = require('../../models/HR/BasicSalary');
const Employee = require('../../models/HR/Employee');
const User = require('../../models/User/User');

/**
 * GET /api/hr/salaries
 * ดึงข้อมูลค่าจ้าง/เงินเดือนทั้งหมด
 */
exports.getAllSalaries = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { userId, employeeId, page = 1, limit = 10 } = req.query;

    let query = {};

    // Build query based on provided parameters
    if (userId) {
      query.user = userId;
    }

    if (employeeId) {
      // If employeeId is provided, find the user first
      const employee = await Employee.findOne({
        $or: [
          { _id: employeeId },
          { employeeId: employeeId },
          { code: employeeId }
        ]
      });

      if (employee) {
        // Find user associated with this employee
        const user = await User.findOne({ employee: employee._id });
        if (user) {
          query.user = user._id;
        }
      }
    }

    // If no specific user/employee, get all salaries
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const salaries = await Salary.find(query)
      .populate('user', 'username email firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Salary.countDocuments(query);

    return res.json({
      success: true,
      data: salaries,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('getAllSalaries error:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเงินเดือน',
      error: error.message
    });
  }
};

// ================= BASIC SALARY SETUP (STEP 1) =================

/**
 * GET /api/hr/salaries/basic
 * ดึงข้อมูลเงินเดือนพื้นฐานทั้งหมด
 */
exports.getAllBasicSalaries = async (req, res) => {
  try {
    const { page = 1, limit = 10, department, status = 'active' } = req.query;

    let query = { status };
    if (department) {
      query.department = department;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const basicSalaries = await BasicSalary.find(query)
      .populate('user', 'username email firstName lastName')
      .populate('employee', 'name position department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await BasicSalary.countDocuments(query);

    return res.json({
      success: true,
      data: basicSalaries,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('getAllBasicSalaries error:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเงินเดือนพื้นฐาน',
      error: error.message
    });
  }
};

/**
 * GET /api/hr/salaries/basic/:userId
 * ดึงข้อมูลเงินเดือนพื้นฐานของพนักงานคนหนึ่ง
 */
exports.getBasicSalaryByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const basicSalary = await BasicSalary.getBasicSalaryByUser(userId);

    if (!basicSalary) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลเงินเดือนพื้นฐานของพนักงานนี้'
      });
    }

    return res.json({
      success: true,
      data: basicSalary
    });

  } catch (error) {
    console.error('getBasicSalaryByUser error:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเงินเดือนพื้นฐาน',
      error: error.message
    });
  }
};

/**
 * POST /api/hr/salaries/basic
 * สร้างข้อมูลเงินเดือนพื้นฐาน (Step 1)
 */
exports.createBasicSalary = async (req, res) => {
  try {
    console.log('createBasicSalary - Request body:', req.body);

    const {
      userId,
      employeeId,
      employeeName,
      department,
      bankName,
      accountNumber,
      basicSalary,
      startDate,
      notes = ''
    } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!employeeId || !employeeName || !department || !bankName || !accountNumber || !basicSalary || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // ค้นหาพนักงานจาก employeeId
    console.log('Looking for employee with ID:', employeeId);

    // สร้าง query สำหรับค้นหาพนักงาน โดยตรวจสอบว่า employeeId เป็น ObjectId หรือไม่
    let query = {
      $or: [
        { employeeId: employeeId },
        { code: employeeId }
      ]
    };

    // ถ้า employeeId เป็น ObjectId format ให้เพิ่มการค้นหาด้วย _id
    if (employeeId && employeeId.match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: employeeId });
    }

    const employee = await Employee.findOne(query);

    if (!employee) {
      console.log('Employee not found for ID:', employeeId);
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลพนักงานในระบบ'
      });
    }

    console.log('Found employee:', { id: employee._id, employeeId: employee.employeeId, name: employee.name });

    // ค้นหา User ที่เชื่อมกับพนักงานนี้
    const user = await User.findOne({ employee: employee._id });
    if (!user) {
      console.log('User not found for employee ID:', employee._id);
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้งานที่เชื่อมกับพนักงานนี้'
      });
    }

    console.log('Found user:', { id: user._id, username: user.username });

    // ตรวจสอบว่าพนักงานมีข้อมูลพื้นฐานแล้วหรือไม่
    const existingBasicSalary = await BasicSalary.findOne({
      user: user._id,
      status: { $ne: 'terminated' }
    });

    if (existingBasicSalary) {
      return res.status(400).json({
        success: false,
        message: 'พนักงานนี้มีข้อมูลเงินเดือนพื้นฐานแล้ว กรุณาแก้ไขแทน'
      });
    }

    // สร้างข้อมูลเงินเดือนพื้นฐาน
    const basicSalaryData = {
      user: user._id,
      employee: employee._id,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      department: employee.department || department,
      bankName,
      accountNumber,
      basicSalary: parseFloat(basicSalary),
      startDate: new Date(startDate),
      notes,
      createdBy: req.user?.id || user._id
    };

    const newBasicSalary = new BasicSalary(basicSalaryData);
    const savedBasicSalary = await newBasicSalary.save();

    // Populate ข้อมูลเพื่อส่งคืน
    await savedBasicSalary.populate([
      { path: 'user', select: 'username email firstName lastName' },
      { path: 'createdBy', select: 'username firstName lastName' }
    ]);

    return res.status(201).json({
      success: true,
      message: 'บันทึกข้อมูลเงินเดือนพื้นฐานสำเร็จ',
      data: savedBasicSalary
    });

  } catch (error) {
    console.error('createBasicSalary error:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลเงินเดือนพื้นฐาน',
      error: error.message
    });
  }
};

/**
 * PUT /api/hr/salaries/basic/:id
 * แก้ไขข้อมูลเงินเดือนพื้นฐาน
 */
exports.updateBasicSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // เพิ่มข้อมูลผู้แก้ไข
    if (req.user?.id) {
      updateData.updatedBy = req.user.id;
    }

    const basicSalary = await BasicSalary.findById(id);
    if (!basicSalary) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลเงินเดือนพื้นฐาน'
      });
    }

    const updatedBasicSalary = await BasicSalary.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'user', select: 'username email firstName lastName' },
      { path: 'updatedBy', select: 'username firstName lastName' }
    ]);

    return res.json({
      success: true,
      message: 'อัปเดตข้อมูลเงินเดือนพื้นฐานสำเร็จ',
      data: updatedBasicSalary
    });

  } catch (error) {
    console.error('updateBasicSalary error:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลเงินเดือนพื้นฐาน',
      error: error.message
    });
  }
};

// ================= MONTHLY SALARY UPDATES (STEP 2) =================

/**
 * GET /api/hr/salaries/monthly
 * ดึงข้อมูลเงินเดือนรายเดือนทั้งหมด
 */
exports.getAllMonthlySalaries = async (req, res) => {
  try {
    const { page = 1, limit = 10, userId, month, year, department } = req.query;

    let query = { status: 'active' };

    if (userId) {
      query.user = userId;
    }

    if (department) {
      query.department = department;
    }

    if (month && year) {
      query['salaryPeriod.month'] = parseInt(month);
      query['salaryPeriod.year'] = parseInt(year);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const monthlySalaries = await EmployeeSalary.find(query)
      .sort({ 'salaryPeriod.year': -1, 'salaryPeriod.month': -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await EmployeeSalary.countDocuments(query);

    return res.json({
      success: true,
      data: monthlySalaries,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('getAllMonthlySalaries error:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเงินเดือนรายเดือน',
      error: error.message
    });
  }
};

/**
 * GET /api/hr/salaries/monthly/:userId/:year/:month
 * ดึงข้อมูลเงินเดือนรายเดือนของพนักงานในเดือนที่ระบุ
 */
exports.getMonthlySalaryByUserAndPeriod = async (req, res) => {
  try {
    const { userId, year, month } = req.params;

    // ต้องมีข้อมูลพื้นฐานก่อน
    const hasBasicSalary = await BasicSalary.hasBasicSalary(userId);
    if (!hasBasicSalary) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาบันทึกข้อมูลเงินเดือนพื้นฐานก่อน'
      });
    }

    const monthlySalary = await EmployeeSalary.findOne({
      user: userId,
      'salaryPeriod.year': parseInt(year),
      'salaryPeriod.month': parseInt(month)
    });

    return res.json({
      success: true,
      data: monthlySalary
    });

  } catch (error) {
    console.error('getMonthlySalaryByUserAndPeriod error:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเงินเดือนรายเดือน',
      error: error.message
    });
  }
};

/**
 * POST /api/hr/salaries/monthly
 * สร้าง/อัปเดตข้อมูลเงินเดือนรายเดือน (Step 2)
 */
exports.createOrUpdateMonthlySalary = async (req, res) => {
  try {
    const {
      userId,
      year,
      month,
      positionAllowance = 0,
      commission = 0,
      overtimeHours = 0,
      overtimeRate = 55,
      fieldAllowanceType = 'none',
      fieldAllowanceDays = 0,
      notes = ''
    } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!userId || !year || !month) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ userId, year และ month'
      });
    }

    // ตรวจสอบว่ามีข้อมูลพื้นฐานแล้วหรือไม่
    const basicSalary = await BasicSalary.getBasicSalaryByUser(userId);
    if (!basicSalary) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาบันทึกข้อมูลเงินเดือนพื้นฐานก่อน'
      });
    }

    // ตรวจสอบว่ามีข้อมูลเดือนนี้แล้วหรือไม่
    let monthlySalary = await EmployeeSalary.findOne({
      employeeId: basicSalary.employeeId,
      'salaryPeriod.year': parseInt(year),
      'salaryPeriod.month': parseInt(month)
    });

    const salaryData = {
      employeeId: basicSalary.employeeId,
      code: basicSalary.employeeId,
      name: basicSalary.employeeName,
      position: 'พนักงาน', // อาจต้องปรับตามข้อมูลจริง
      department: basicSalary.department,
      baseSalary: basicSalary.basicSalary,
      positionAllowance: parseFloat(positionAllowance),
      commission: parseFloat(commission),
      overtimeHours: parseFloat(overtimeHours),
      overtimeRate: parseFloat(overtimeRate),
      fieldAllowanceType,
      fieldAllowanceDays: parseFloat(fieldAllowanceDays),
      bankName: basicSalary.bankName,
      accountNumber: basicSalary.accountNumber,
      salaryPeriod: {
        month: parseInt(month),
        year: parseInt(year)
      },
      notes,
      createdBy: req.user?.id || userId,
      updatedBy: req.user?.id || userId
    };

    if (monthlySalary) {
      // อัปเดตข้อมูลที่มีอยู่
      monthlySalary = await EmployeeSalary.findByIdAndUpdate(
        monthlySalary._id,
        salaryData,
        { new: true, runValidators: true }
      );

      return res.json({
        success: true,
        message: 'อัปเดตข้อมูลเงินเดือนรายเดือนสำเร็จ',
        data: monthlySalary
      });
    } else {
      // สร้างข้อมูลใหม่
      monthlySalary = new EmployeeSalary(salaryData);
      const savedMonthlySalary = await monthlySalary.save();

      return res.status(201).json({
        success: true,
        message: 'บันทึกข้อมูลเงินเดือนรายเดือนสำเร็จ',
        data: savedMonthlySalary
      });
    }

  } catch (error) {
    console.error('createOrUpdateMonthlySalary error:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลเงินเดือนรายเดือน',
      error: error.message
    });
  }
};

// ================= SALARY HISTORY (STEP 3) =================

/**
 * GET /api/hr/salaries/history/:userId
 * ดึงประวัติเงินเดือนของพนักงาน
 */
exports.getSalaryHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // ตรวจสอบว่ามีข้อมูลพื้นฐานหรือไม่
    const basicSalary = await BasicSalary.getBasicSalaryByUser(userId);
    if (!basicSalary) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลเงินเดือนพื้นฐานของพนักงานนี้'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const history = await EmployeeSalary.find({
      employeeId: basicSalary.employeeId
    })
    .sort({ 'salaryPeriod.year': -1, 'salaryPeriod.month': -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await EmployeeSalary.countDocuments({
      employeeId: basicSalary.employeeId
    });

    return res.json({
      success: true,
      data: {
        basicSalary,
        history,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total: total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('getSalaryHistory error:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติเงินเดือน',
      error: error.message
    });
  }
};

/**
 * GET /api/hr/salaries/summary
 * ดึงข้อมูลสรุปเงินเดือนทั้งหมด
 */
exports.getSalarySummary = async (req, res) => {
  try {
    const { year, month } = req.query;

    let period = null;
    if (year && month) {
      period = { year: parseInt(year), month: parseInt(month) };
    }

    // สรุปข้อมูลพื้นฐาน
    const basicSalarySummary = await BasicSalary.getSummaryByDepartment();

    // สรุปข้อมูลรายเดือน
    const monthlySalarySummary = await EmployeeSalary.getSummary(period);
    const departmentSummary = await EmployeeSalary.getByDepartment(period);

    return res.json({
      success: true,
      data: {
        period,
        basicSalary: basicSalarySummary,
        monthly: monthlySalarySummary,
        byDepartment: departmentSummary
      }
    });

  } catch (error) {
    console.error('getSalarySummary error:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุปเงินเดือน',
      error: error.message
    });
  }
};

// ================= UTILITY FUNCTIONS =================

/**
 * GET /api/hr/salaries/check-basic/:userId
 * ตรวจสอบว่าพนักงานมีข้อมูลพื้นฐานหรือไม่
 */
exports.checkBasicSalary = async (req, res) => {
  try {
    const { userId } = req.params;

    const hasBasicSalary = await BasicSalary.hasBasicSalary(userId);

    return res.json({
      success: true,
      hasBasicSalary
    });

  } catch (error) {
    console.error('checkBasicSalary error:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล',
      error: error.message
    });
  }
};

module.exports = {
  // Original functions
  getAllSalaries: exports.getAllSalaries,

  // Basic Salary (Step 1)
  getAllBasicSalaries: exports.getAllBasicSalaries,
  getBasicSalaryByUser: exports.getBasicSalaryByUser,
  createBasicSalary: exports.createBasicSalary,
  updateBasicSalary: exports.updateBasicSalary,

  // Monthly Salary (Step 2)
  getAllMonthlySalaries: exports.getAllMonthlySalaries,
  getMonthlySalaryByUserAndPeriod: exports.getMonthlySalaryByUserAndPeriod,
  createOrUpdateMonthlySalary: exports.createOrUpdateMonthlySalary,

  // History & Reports (Step 3)
  getSalaryHistory: exports.getSalaryHistory,
  getSalarySummary: exports.getSalarySummary,

  // Utilities
  checkBasicSalary: exports.checkBasicSalary
};
