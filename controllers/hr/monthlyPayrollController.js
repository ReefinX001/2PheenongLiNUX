// controllers/hr/monthlyPayrollController.js
const MonthlyPayroll = require('../../models/HR/MonthlyPayroll');
const BasicEmployee = require('../../models/HR/BasicEmployee');
const mongoose = require('mongoose');

// Get monthly payrolls by period
exports.getMonthlyPayrolls = async (req, res) => {
  try {
    const { month, year, employeeId, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (employeeId) filter.employeeId = employeeId;

    const payrolls = await MonthlyPayroll.find(filter)
      .sort({ year: -1, month: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await MonthlyPayroll.countDocuments(filter);

    console.log(`📋 Found ${payrolls.length} monthly payrolls for ${month}/${year}`);

    return res.json({
      success: true,
      data: payrolls,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error getting monthly payrolls:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลเงินเดือนรายเดือนได้'
    });
  }
};

// Get monthly payroll by employee and period
exports.getMonthlyPayrollByEmployee = async (req, res) => {
  try {
    console.log('📋 Getting monthly payroll by employee...');
    const { employeeId } = req.params;
    const { month, year } = req.query;

    console.log('📋 Request params:', { employeeId, month, year });

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      console.log('❌ Invalid ObjectId format:', employeeId);
      return res.status(400).json({
        success: false,
        error: 'Invalid employee ID'
      });
    }

    // First find the BasicEmployee by User._id
    const basicEmployee = await BasicEmployee.findOne({ employeeId: employeeId });
    if (!basicEmployee) {
      console.log('❌ Basic employee not found for User ID:', employeeId);
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลพนักงานพื้นฐาน'
      });
    }

    // Then find MonthlyPayroll by BasicEmployee._id
    const filter = { employeeId: basicEmployee._id };
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    console.log('📋 MonthlyPayroll filter:', filter);

    const payroll = await MonthlyPayroll.findOne(filter)
      .lean();

    console.log('📋 Found monthly payroll:', !!payroll);

    return res.json({
      success: true,
      data: payroll
    });
  } catch (error) {
    console.error('❌ Error getting monthly payroll by employee:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลเงินเดือนได้'
    });
  }
};

// Create monthly payroll
exports.createMonthlyPayroll = async (req, res) => {
  try {
    console.log('📝 Creating monthly payroll with data:', req.body);

    const {
      employeeId,
      month,
      year,
      positionAllowance = 0,
      commission = 0,
      fieldDays = 0,
      fieldType = 'none',
      otHours = 0,
      otRate = 55,
      notes
    } = req.body;

    console.log('📝 Extracted monthly payroll data:', {
      employeeId,
      month,
      year,
      positionAllowance,
      commission,
      fieldDays,
      fieldType,
      otHours,
      otRate
    });

    // Validate required fields
    if (!employeeId || !month || !year) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ Employee ID, เดือน และปี',
        missingFields: {
          employeeId: !employeeId,
          month: !month,
          year: !year
        }
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      console.log('❌ Invalid ObjectId format:', employeeId);
      return res.status(400).json({
        success: false,
        error: 'รูปแบบ Employee ID ไม่ถูกต้อง'
      });
    }

    // Check if employee exists in BasicEmployee collection
    const employee = await BasicEmployee.findOne({ employeeId: employeeId });
    if (!employee) {
      console.log('❌ Basic employee not found for employeeId:', employeeId);
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลพนักงานพื้นฐาน กรุณาเพิ่มข้อมูลพื้นฐานก่อน'
      });
    }

    console.log('✅ Basic employee found:', employee.name);
    console.log('📋 Employee IDs mapping:', {
      receivedEmployeeId: employeeId,
      basicEmployeeId: employee._id,
      originalUserEmployeeId: employee.employeeId
    });

    // Check if payroll already exists for this period
    const existing = await MonthlyPayroll.findOne({
      employeeId: employee._id, // Use BasicEmployee._id
      month: parseInt(month),
      year: parseInt(year)
    });

    if (existing) {
      console.log('❌ Monthly payroll already exists for this period');
      return res.status(400).json({
        success: false,
        error: 'มีข้อมูลเงินเดือนสำหรับเดือนนี้แล้ว'
      });
    }

    // Calculate values
    const baseSalary = employee.baseSalary;
    const socialSecurity = Math.round(baseSalary * 0.05);
    const fieldAllowance = fieldDays * (fieldType === 'upper' ? 300 : fieldType === 'lower' ? 200 : 0);
    const otTotal = otHours * otRate;
    const withholdingTax = commission >= 1000 ? Math.round(commission * 0.03) : 0;
    const grossIncome = baseSalary + positionAllowance + commission + fieldAllowance + otTotal;
    const netSalary = grossIncome - socialSecurity - withholdingTax;

    // Create monthly payroll
    const payroll = new MonthlyPayroll({
      employeeId: employee._id, // Use BasicEmployee._id
      month: parseInt(month),
      year: parseInt(year),
      positionAllowance: parseFloat(positionAllowance),
      commission: parseFloat(commission),
      fieldDays: parseInt(fieldDays),
      fieldType,
      fieldAllowance,
      otHours: parseFloat(otHours),
      otRate: parseFloat(otRate),
      otTotal,
      socialSecurity,
      withholdingTax,
      grossIncome,
      netSalary,
      notes,
      createdBy: req.user?.id
    });

    console.log('💾 Creating MonthlyPayroll with data:', payroll.toObject());

    await payroll.save();

    console.log(`✅ Created monthly payroll for ${employee.name} - ${month}/${year}`);

    return res.status(201).json({
      success: true,
      data: payroll,
      message: 'บันทึกข้อมูลเงินเดือนรายเดือนเรียบร้อย'
    });
  } catch (error) {
    console.error('Error creating monthly payroll:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถบันทึกข้อมูลเงินเดือนได้'
    });
  }
};

// Update monthly payroll
exports.updateMonthlyPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payroll ID'
      });
    }

    // Get existing payroll to calculate new values
    const existingPayroll = await MonthlyPayroll.findById(id);
    if (!existingPayroll) {
      console.log('❌ Monthly payroll not found:', id);
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลเงินเดือน'
      });
    }

    // Get basic employee for salary calculation
    const basicEmployee = await BasicEmployee.findById(existingPayroll.employeeId);
    if (!basicEmployee) {
      console.log('❌ Basic employee not found for payroll');
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลพนักงานพื้นฐาน'
      });
    }

    // Recalculate totals if relevant fields changed
    if (updates.positionAllowance !== undefined ||
        updates.commission !== undefined ||
        updates.fieldDays !== undefined ||
        updates.fieldType !== undefined ||
        updates.otHours !== undefined ||
        updates.otRate !== undefined) {

      const baseSalary = basicEmployee.baseSalary;
      const positionAllowance = parseFloat(updates.positionAllowance) || 0;
      const commission = parseFloat(updates.commission) || 0;
      const fieldDays = parseInt(updates.fieldDays) || 0;
      const fieldType = updates.fieldType || 'none';
      const otHours = parseFloat(updates.otHours) || 0;
      const otRate = parseFloat(updates.otRate) || 55;

      const socialSecurity = Math.round(baseSalary * 0.05);
      const fieldAllowance = fieldDays * (fieldType === 'upper' ? 300 : fieldType === 'lower' ? 200 : 0);
      const otTotal = otHours * otRate;
      const withholdingTax = commission >= 1000 ? Math.round(commission * 0.03) : 0;
      const grossIncome = baseSalary + positionAllowance + commission + fieldAllowance + otTotal;
      const netSalary = grossIncome - socialSecurity - withholdingTax;

      // Update calculated fields
      updates.fieldAllowance = fieldAllowance;
      updates.otTotal = otTotal;
      updates.socialSecurity = socialSecurity;
      updates.withholdingTax = withholdingTax;
      updates.grossIncome = grossIncome;
      updates.netSalary = netSalary;
    }

    updates.updatedBy = req.user?.id;

    const payroll = await MonthlyPayroll.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    console.log(`✅ Updated monthly payroll for ${basicEmployee.name}`);

    return res.json({
      success: true,
      data: payroll,
      message: 'อัปเดตข้อมูลเงินเดือนเรียบร้อย'
    });
  } catch (error) {
    console.error('Error updating monthly payroll:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถอัปเดตข้อมูลเงินเดือนได้'
    });
  }
};

// Delete monthly payroll
exports.deleteMonthlyPayroll = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payroll ID'
      });
    }

    const payroll = await MonthlyPayroll.findByIdAndDelete(id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลเงินเดือน'
      });
    }

    // Get employee name for logging
    const basicEmployee = await BasicEmployee.findById(payroll.employeeId);
    const employeeName = basicEmployee ? basicEmployee.name : 'Unknown Employee';

    console.log(`🗑️ Deleted monthly payroll for ${employeeName}`);

    return res.json({
      success: true,
      message: 'ลบข้อมูลเงินเดือนเรียบร้อย'
    });
  } catch (error) {
    console.error('Error deleting monthly payroll:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถลบข้อมูลเงินเดือนได้'
    });
  }
};

// Get payroll summary by period
exports.getPayrollSummary = async (req, res) => {
  try {
    const { month, year } = req.query;

    const summary = await MonthlyPayroll.getSummary(
      month ? parseInt(month) : null,
      year ? parseInt(year) : null
    );

    return res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting payroll summary:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงสรุปข้อมูลเงินเดือนได้'
    });
  }
};
