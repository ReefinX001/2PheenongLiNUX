// routes/employeeSalaryRoutes.js
const express = require('express');
const router = express.Router();
const EmployeeSalary = require('../models/HR/EmployeeSalary');
const Employee = require('../models/HR/Employee');

// GET /api/employee-salaries - ดึงรายการเงินเดือนพนักงาน
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      department,
      status = 'active',
      month,
      year,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (department && department !== 'all') {
      filter.department = department;
    }

    if (month && year) {
      filter['salaryPeriod.month'] = parseInt(month);
      filter['salaryPeriod.year'] = parseInt(year);
    } else {
      // Default to current month/year
      const now = new Date();
      filter['salaryPeriod.month'] = now.getMonth() + 1;
      filter['salaryPeriod.year'] = now.getFullYear();
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const salaries = await EmployeeSalary.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email');

    // Get total count
    const total = await EmployeeSalary.countDocuments(filter);

    // Get summary
    const summary = await EmployeeSalary.getSummary({
      month: filter['salaryPeriod.month'],
      year: filter['salaryPeriod.year']
    });

    res.json({
      success: true,
      data: salaries,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total: total,
        limit: parseInt(limit)
      },
      summary: summary
    });

  } catch (error) {
    console.error('Error fetching employee salaries:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเงินเดือน',
      error: error.message
    });
  }
});

// GET /api/employee-salaries/:id - ดึงข้อมูลเงินเดือนตาม ID
router.get('/:id', async (req, res) => {
  try {
    const salary = await EmployeeSalary.findById(req.params.id)
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email');

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลเงินเดือน'
      });
    }

    res.json({
      success: true,
      data: salary
    });

  } catch (error) {
    console.error('Error fetching employee salary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเงินเดือน',
      error: error.message
    });
  }
});

// POST /api/employee-salaries - สร้างข้อมูลเงินเดือนใหม่
router.post('/', async (req, res) => {
  try {
    const {
      empCode,
      empName,
      position,
      department,
      baseSalary,
      positionAllowance = 0,
      fieldAllowanceType = 'none',
      fieldAllowanceDays = 0,
      overtimeHours = 0,
      overtimeRate = 55,
      overtime = 0,
      commission = 0,
      socialSecurity = 750,
      withholdingTax = 0,
      bankName = '',
      accountNumber = '',
      month,
      year,
      notes = ''
    } = req.body;

    // Validate required fields
    if (!empCode || !empName || !position || !department || !baseSalary) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลที่จำเป็น: รหัส, ชื่อ, ตำแหน่ง, แผนก, และเงินเดือนพื้นฐาน'
      });
    }

    // ตรวจสอบว่ามีข้อมูลเงินเดือนของเดือนนี้อยู่แล้วหรือไม่
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const existingSalary = await EmployeeSalary.findOne({
      code: empCode,
      'salaryPeriod.month': currentMonth,
      'salaryPeriod.year': currentYear
    });

    if (existingSalary) {
      return res.status(400).json({
        success: false,
        message: `พนักงาน ${empCode} มีข้อมูลเงินเดือนสำหรับเดือน ${currentMonth}/${currentYear} แล้ว`
      });
    }

    // สร้างข้อมูลเงินเดือนใหม่
    const salaryData = {
      employeeId: empCode, // ใช้ code เป็น employeeId
      code: empCode,
      name: empName,
      position: position,
      department: department,
      baseSalary: parseFloat(baseSalary),
      positionAllowance: parseFloat(positionAllowance),
      fieldAllowanceType: fieldAllowanceType,
      fieldAllowanceDays: parseFloat(fieldAllowanceDays),
      overtimeHours: parseFloat(overtimeHours),
      overtimeRate: parseFloat(overtimeRate),
      overtime: parseFloat(overtime),
      commission: parseFloat(commission),
      socialSecurity: parseFloat(socialSecurity),
      withholdingTax: parseFloat(withholdingTax),
      bankName: bankName,
      accountNumber: accountNumber,
      salaryPeriod: {
        month: currentMonth,
        year: currentYear
      },
      notes: notes,
      createdBy: req.user?.id || null
    };

    const newSalary = new EmployeeSalary(salaryData);
    const savedSalary = await newSalary.save();

    res.status(201).json({
      success: true,
      message: 'บันทึกข้อมูลเงินเดือนสำเร็จ',
      data: savedSalary
    });

  } catch (error) {
    console.error('Error creating employee salary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลเงินเดือน',
      error: error.message
    });
  }
});

// PUT /api/employee-salaries/:id - แก้ไขข้อมูลเงินเดือน
router.put('/:id', async (req, res) => {
  try {
    const salary = await EmployeeSalary.findById(req.params.id);

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลเงินเดือน'
      });
    }

    // Update fields
    const updateData = { ...req.body };
    updateData.updatedBy = req.user?.id || null;

    const updatedSalary = await EmployeeSalary.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลเงินเดือนสำเร็จ',
      data: updatedSalary
    });

  } catch (error) {
    console.error('Error updating employee salary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลเงินเดือน',
      error: error.message
    });
  }
});

// DELETE /api/employee-salaries/:id - ลบข้อมูลเงินเดือน
router.delete('/:id', async (req, res) => {
  try {
    const salary = await EmployeeSalary.findById(req.params.id);

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลเงินเดือน'
      });
    }

    await EmployeeSalary.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'ลบข้อมูลเงินเดือนสำเร็จ'
    });

  } catch (error) {
    console.error('Error deleting employee salary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบข้อมูลเงินเดือน',
      error: error.message
    });
  }
});

// GET /api/employee-salaries/summary/stats - ดึงสถิติสรุป
router.get('/summary/stats', async (req, res) => {
  try {
    const { month, year } = req.query;

    const period = month && year ? {
      month: parseInt(month),
      year: parseInt(year)
    } : null;

    const summary = await EmployeeSalary.getSummary(period);
    const departmentStats = await EmployeeSalary.getByDepartment(period);

    res.json({
      success: true,
      data: {
        summary: summary,
        departmentStats: departmentStats
      }
    });

  } catch (error) {
    console.error('Error getting salary summary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุป',
      error: error.message
    });
  }
});

// POST /api/employee-salaries/bulk-import - นำเข้าข้อมูลจำนวนมาก
router.post('/bulk-import', async (req, res) => {
  try {
    const { employees, month, year, skipDuplicates = true, updateExisting = false } = req.body;

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาส่งข้อมูลพนักงานในรูปแบบ array'
      });
    }

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const result = {
      total: employees.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (const [index, empData] of employees.entries()) {
      try {
        // ตรวจสอบข้อมูลที่จำเป็น
        if (!empData.code || !empData.name || !empData.position || !empData.department || !empData.baseSalary) {
          throw new Error('ขาดข้อมูลที่จำเป็น');
        }

        // ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
        const existingSalary = await EmployeeSalary.findOne({
          code: empData.code,
          'salaryPeriod.month': currentMonth,
          'salaryPeriod.year': currentYear
        });

        if (existingSalary) {
          if (updateExisting) {
            // อัปเดตข้อมูลที่มีอยู่
            await EmployeeSalary.findByIdAndUpdate(existingSalary._id, {
              ...empData,
              updatedBy: req.user?.id || null
            });
            result.updated++;
          } else if (skipDuplicates) {
            // ข้ามข้อมูลซ้ำ
            result.skipped++;
          } else {
            throw new Error(`พนักงาน ${empData.code} มีข้อมูลอยู่แล้ว`);
          }
        } else {
          // สร้างข้อมูลใหม่
          const salaryData = {
            employeeId: empData.code,
            code: empData.code,
            name: empData.name,
            position: empData.position,
            department: empData.department,
            baseSalary: parseFloat(empData.baseSalary || 0),
            positionAllowance: parseFloat(empData.positionAllowance || 0),
            fieldAllowanceType: empData.fieldAllowanceType || 'none',
            fieldAllowanceDays: parseFloat(empData.fieldAllowanceDays || 0),
            overtimeHours: parseFloat(empData.overtimeHours || 0),
            overtimeRate: parseFloat(empData.overtimeRate || 55),
            overtime: parseFloat(empData.overtime || 0),
            commission: parseFloat(empData.commission || 0),
            socialSecurity: parseFloat(empData.socialSecurity || 750),
            withholdingTax: parseFloat(empData.withholdingTax || 0),
            bankName: empData.bankName || '',
            accountNumber: empData.accountNumber || '',
            salaryPeriod: {
              month: currentMonth,
              year: currentYear
            },
            notes: empData.notes || '',
            createdBy: req.user?.id || null
          };

          const newSalary = new EmployeeSalary(salaryData);
          await newSalary.save();
          result.imported++;
        }

      } catch (error) {
        result.errors.push(`แถวที่ ${index + 1}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: 'นำเข้าข้อมูลเสร็จสิ้น',
      data: result
    });

  } catch (error) {
    console.error('Error bulk importing salaries:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล',
      error: error.message
    });
  }
});

module.exports = router;
