// controllers/hr/basicEmployeeController.js
const mongoose = require('mongoose');
const BasicEmployee = require('../../models/HR/BasicEmployee');
const User = require('../../models/User/User');

console.log('🔧 BasicEmployee Controller: Models loaded successfully');

// Test endpoint
exports.testBasicEmployee = async (req, res) => {
  try {
    console.log('🧪 Testing basic employee endpoint');
    return res.json({
      success: true,
      message: 'Basic employee endpoint is working',
      timestamp: new Date(),
      models: {
        BasicEmployee: !!BasicEmployee,
        User: !!User
      }
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error.message
    });
  }
};

// Get all basic employees
exports.getAllBasicEmployees = async (req, res) => {
  try {
    console.log('📋 Getting all basic employees...');
    const { page = 1, limit = 50, department, status = 'active' } = req.query;

    const filter = { status };
    if (department) filter.department = department;

    const employees = await BasicEmployee.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    console.log(`📋 Found ${employees.length} basic employees in database`);

    const total = await BasicEmployee.countDocuments(filter);

    console.log(`📋 Found ${employees.length} basic employees`);

    return res.json({
      success: true,
      data: employees,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error getting basic employees:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลพนักงานได้'
    });
  }
};

// Get basic employee by ID
exports.getBasicEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid employee ID'
      });
    }

    const employee = await BasicEmployee.findById(id)
      .populate('employeeId', 'username email')
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลพนักงาน'
      });
    }

    return res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Error getting basic employee by ID:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลพนักงานได้'
    });
  }
};

// Create basic employee
exports.createBasicEmployee = async (req, res) => {
  try {
    console.log('📝 Creating basic employee with data:', req.body);

    // Extract all possible field names from the request
    const {
      employeeSelect, // This is the actual employeeId from form
      employeeId,     // This might be hidden field
      name,
      code,
      position,
      department,
      bankName,
      accountNumber,
      baseSalary,
      startDate
    } = req.body;

    console.log('📝 All request body keys:', Object.keys(req.body));
    console.log('📝 Raw request body:', req.body);

    // Use employeeSelect as the actual employeeId if available
    const actualEmployeeId = employeeSelect || employeeId;

    console.log('📝 Extracted data:', {
      actualEmployeeId,
      name,
      code,
      position,
      department,
      bankName,
      accountNumber,
      baseSalary,
      startDate
    });

    // Validate required fields with detailed logging
    const validationErrors = [];
    const validationDetails = {
      actualEmployeeId: { value: actualEmployeeId, valid: !!actualEmployeeId },
      name: { value: name, valid: !!(name && name.trim() !== '' && name !== 'ไม่ระบุชื่อ') },
      department: { value: department, valid: !!department },
      bankName: { value: bankName, valid: !!bankName },
      accountNumber: { value: accountNumber, valid: !!accountNumber },
      baseSalary: { value: baseSalary, valid: !!(baseSalary && !isNaN(baseSalary) && baseSalary > 0) },
      startDate: { value: startDate, valid: !!startDate }
    };

    if (!actualEmployeeId) validationErrors.push('employeeId missing');
    if (!name || name.trim() === '' || name === 'ไม่ระบุชื่อ') validationErrors.push('name missing or invalid');
    if (!department) validationErrors.push('department missing');
    if (!bankName) validationErrors.push('bankName missing');
    if (!accountNumber) validationErrors.push('accountNumber missing');
    if (!baseSalary || isNaN(baseSalary) || baseSalary <= 0) validationErrors.push('baseSalary missing or invalid');
    if (!startDate) validationErrors.push('startDate missing');

    console.log('🔍 Validation details:', validationDetails);

    if (validationErrors.length > 0) {
      console.log('❌ Validation failed:', validationErrors);
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        validationErrors,
        validationDetails,
        receivedData: req.body
      });
    }

    // Check if employee already exists
    const existing = await BasicEmployee.findOne({ employeeId: actualEmployeeId });
    if (existing) {
      console.log('❌ Employee already exists:', actualEmployeeId);
      return res.status(400).json({
        success: false,
        error: 'พนักงานคนนี้มีข้อมูลพื้นฐานแล้ว'
      });
    }

    // Verify employee exists in User model
    if (!mongoose.Types.ObjectId.isValid(actualEmployeeId)) {
      console.log('❌ Invalid ObjectId format:', actualEmployeeId);
      return res.status(400).json({
        success: false,
        error: 'รูปแบบ ID ไม่ถูกต้อง'
      });
    }

    const user = await User.findById(actualEmployeeId);
    if (!user) {
      console.log('❌ User not found:', actualEmployeeId);
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลผู้ใช้งาน'
      });
    }

    console.log('✅ User found:', user.username);

    // Create basic employee
    const employeeData = {
      employeeId: actualEmployeeId,
      name: name.trim(),
      code: code || `EMP${Date.now()}`,
      position: position || 'พนักงาน',
      department: department.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      baseSalary: parseFloat(baseSalary),
      startDate: new Date(startDate),
      createdBy: req.user?.id
    };

    console.log('💾 Creating BasicEmployee with data:', employeeData);

    const basicEmployee = new BasicEmployee(employeeData);

    console.log('💾 Basic employee object created, attempting to save...');

    await basicEmployee.save();

    console.log('✅ Basic employee saved successfully');

    console.log(`✅ Created basic employee: ${name} (${basicEmployee.code})`);

    return res.status(201).json({
      success: true,
      data: basicEmployee,
      message: 'บันทึกข้อมูลพื้นฐานพนักงานเรียบร้อย'
    });
  } catch (error) {
    console.error('❌ Error creating basic employee:', error);
    console.error('Error stack:', error.stack);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'รหัสพนักงานหรือ ID ซ้ำ',
        details: error.keyPattern
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ถูกต้อง',
        details: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถบันทึกข้อมูลได้',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update basic employee
exports.updateBasicEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid employee ID'
      });
    }

    // Add updatedBy field
    updates.updatedBy = req.user?.id;

    const employee = await BasicEmployee.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลพนักงาน'
      });
    }

    console.log(`✅ Updated basic employee: ${employee.name} (${employee.code})`);

    return res.json({
      success: true,
      data: employee,
      message: 'อัปเดตข้อมูลพื้นฐานเรียบร้อย'
    });
  } catch (error) {
    console.error('Error updating basic employee:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถอัปเดตข้อมูลได้'
    });
  }
};

// Delete basic employee
exports.deleteBasicEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid employee ID'
      });
    }

    const employee = await BasicEmployee.findByIdAndDelete(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลพนักงาน'
      });
    }

    console.log(`🗑️ Deleted basic employee: ${employee.name} (${employee.code})`);

    return res.json({
      success: true,
      message: 'ลบข้อมูลพนักงานเรียบร้อย'
    });
  } catch (error) {
    console.error('Error deleting basic employee:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถลบข้อมูลได้'
    });
  }
};
