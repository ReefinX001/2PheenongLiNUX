// controllers/hr/bonusController.js
const mongoose = require('mongoose');

// Try to load models with error handling
let Bonus, User;
try {
  Bonus = require('../../models/HR/Bonus');
  console.log('✅ Bonus model loaded');
} catch (error) {
  console.error('❌ Error loading Bonus model:', error);
}

try {
  User = require('../../models/User/User');
  console.log('✅ User model loaded for bonus controller');
} catch (error) {
  console.error('❌ Error loading User model for bonus controller:', error);
}

// Helper function to resolve employee ID to User ObjectId
async function resolveEmployeeId(employeeIdInput) {
  if (!employeeIdInput) return null;

  // If it's already a valid ObjectId, return it
  if (mongoose.Types.ObjectId.isValid(employeeIdInput) && employeeIdInput.length === 24) {
    return employeeIdInput;
  }

  // If it's a string like "EMP048", find the User by employee.employeeId
  try {
    const Employee = require('../../models/HR/Employee');
    const employee = await Employee.findOne({ employeeId: employeeIdInput });
    if (employee) {
      // Find User that references this employee
      const user = await User.findOne({ employee: employee._id });
      if (user) {
        return user._id;
      }
    }

    console.warn(`⚠️ Could not resolve employee ID: ${employeeIdInput}`);
    return null; // Return null instead of throwing error
  } catch (error) {
    console.error(`❌ Error resolving employee ID ${employeeIdInput}:`, error);
    return null; // Return null instead of throwing error
  }
}

// Get all bonuses
exports.getAllBonuses = async (req, res) => {
  try {
    console.log('📋 Getting all bonuses...');

    // Check if models are available
    if (!Bonus) {
      console.log('⚠️ Bonus model not available, returning empty result');
      return res.json({
        success: true,
        data: [],
        bonuses: [],
        message: 'Bonus model not available - returning empty results'
      });
    }

    const {
      page = 1,
      limit = 50,
      employeeId,
      type,
      status,
      month,
      year,
      department
    } = req.query;

    const filter = {};

    // Handle employeeId with proper resolution
    if (employeeId) {
      const resolvedId = await resolveEmployeeId(employeeId);
      if (resolvedId) {
        filter.employeeId = resolvedId;
      } else {
        console.warn('⚠️ Could not resolve employee ID, skipping filter:', employeeId);
        // Skip filtering by employeeId if can't resolve, don't return error
      }
    }

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (month) filter['period.month'] = parseInt(month);
    if (year) filter['period.year'] = parseInt(year);

    const bonuses = await Bonus.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Bonus.countDocuments(filter);

    console.log(`📋 Found ${bonuses.length} bonuses`);

    return res.json({
      success: true,
      data: bonuses,
      bonuses: bonuses, // Alternative key for frontend compatibility
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error getting bonuses:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลโบนัสได้'
    });
  }
};

// Get bonus by ID
exports.getBonusById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bonus ID'
      });
    }

    const bonus = await Bonus.findById(id)
      .lean();

    if (!bonus) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลโบนัส'
      });
    }

    return res.json({
      success: true,
      data: bonus
    });
  } catch (error) {
    console.error('Error getting bonus by ID:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลโบนัสได้'
    });
  }
};

// Create bonus
exports.createBonus = async (req, res) => {
  try {
    const {
      employeeId,
      type,
      amount,
      date,
      description,
      status = 'pending'
    } = req.body;

    // Validate required fields
    if (!employeeId || !type || !amount || !date || !description) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // Resolve employee ID and verify employee exists
    const resolvedEmployeeId = await resolveEmployeeId(employeeId);
    if (!resolvedEmployeeId) {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถระบุตัวตนพนักงานได้'
      });
    }

    const user = await User.findById(resolvedEmployeeId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลพนักงาน'
      });
    }

    // Get type name mapping
    const typeNames = {
      'performance': 'โบนัสผลงาน',
      'festival': 'โบนัสเทศกาล',
      'annual': 'โบนัสประจำปี',
      'sales': 'โบนัสยอดขาย',
      'special': 'โบนัสพิเศษ',
      'other': 'อื่นๆ'
    };

    // Ensure type has a proper typeName
    const bonusTypeName = typeNames[type] || type || 'ไม่ระบุประเภท';

    // Get employee info separately if needed
    let employeeName = user.username;
    let department = '';
    let position = '';

    try {
      // Try to get employee info if User has employee reference
      if (user.employee) {
        const Employee = require('../../models/HR/Employee');
        const employee = await Employee.findById(user.employee);
        if (employee) {
          employeeName = employee.name || user.username;
          department = employee.department || '';
          position = employee.position || '';
        }
      }
    } catch (empError) {
      console.warn('⚠️ Could not load employee details, using user info:', empError.message);
    }

    // Create bonus
    const bonus = new Bonus({
      employeeId: resolvedEmployeeId,
      employeeName,
      type: type || 'other',
      typeName: bonusTypeName,
      amount: parseFloat(amount),
      date: new Date(date),
      description,
      status,
      department,
      position,
      createdBy: req.user?.id
    });

    await bonus.save();

    console.log(`✅ Created bonus for ${bonus.employeeName}: ${formatCurrency(bonus.amount)}`);

    return res.status(201).json({
      success: true,
      data: bonus,
      message: 'บันทึกข้อมูลโบนัสเรียบร้อย'
    });
  } catch (error) {
    console.error('Error creating bonus:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถบันทึกข้อมูลโบนัสได้'
    });
  }
};

// Update bonus
exports.updateBonus = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bonus ID'
      });
    }

    updates.updatedBy = req.user?.id;

    const bonus = await Bonus.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!bonus) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลโบนัส'
      });
    }

    console.log(`✅ Updated bonus for ${bonus.employeeName}`);

    return res.json({
      success: true,
      data: bonus,
      message: 'อัปเดตข้อมูลโบนัสเรียบร้อย'
    });
  } catch (error) {
    console.error('Error updating bonus:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถอัปเดตข้อมูลโบนัสได้'
    });
  }
};

// Delete bonus
exports.deleteBonus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bonus ID'
      });
    }

    const bonus = await Bonus.findByIdAndDelete(id);

    if (!bonus) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลโบนัส'
      });
    }

    console.log(`🗑️ Deleted bonus for ${bonus.employeeName}`);

    return res.json({
      success: true,
      message: 'ลบข้อมูลโบนัสเรียบร้อย'
    });
  } catch (error) {
    console.error('Error deleting bonus:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถลบข้อมูลโบนัสได้'
    });
  }
};

// Get bonus summary
exports.getBonusSummary = async (req, res) => {
  try {
    const { employeeId, month, year, type, status } = req.query;

    const filters = {};

    // Handle employeeId with proper resolution
    if (employeeId) {
      const resolvedId = await resolveEmployeeId(employeeId);
      if (resolvedId) {
        filters.employeeId = resolvedId;
      } else {
        console.warn('⚠️ Could not resolve employee ID for summary, skipping filter:', employeeId);
        // Skip filtering by employeeId if can't resolve
      }
    }

    if (month) filters.month = parseInt(month);
    if (year) filters.year = parseInt(year);
    if (type) filters.type = type;
    if (status) filters.status = status;

    const summary = await Bonus.getSummary(filters);

    return res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting bonus summary:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงสรุปข้อมูลโบนัสได้'
    });
  }
};

// Get bonuses for specific employee and period (for payroll integration)
exports.getEmployeePayrollBonuses = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    // Resolve employee ID
    const resolvedEmployeeId = await resolveEmployeeId(employeeId);
    if (!resolvedEmployeeId) {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถระบุตัวตนพนักงานได้'
      });
    }

    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const bonuses = await Bonus.getPayrollBonuses(resolvedEmployeeId, currentMonth, currentYear);
    const totalAmount = await Bonus.calculatePayrollBonusTotal(resolvedEmployeeId, currentMonth, currentYear);

    console.log(`📊 Found ${bonuses.length} payroll bonuses for employee ${employeeId}, total: ฿${totalAmount.toLocaleString()}`);

    return res.json({
      success: true,
      data: {
        bonuses,
        totalAmount,
        period: {
          month: currentMonth,
          year: currentYear
        }
      }
    });
  } catch (error) {
    console.error('Error getting employee payroll bonuses:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลโบนัสสำหรับเงินเดือนได้'
    });
  }
};

// Create sales bonus automatically
exports.createSalesBonus = async (req, res) => {
  try {
    const { employeeId, salesAmount, commissionRate = 0.05, description } = req.body;

    if (!employeeId || !salesAmount || salesAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ Employee ID และยอดขายที่ถูกต้อง'
      });
    }

    // Resolve employee ID
    const resolvedEmployeeId = await resolveEmployeeId(employeeId);
    if (!resolvedEmployeeId) {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถระบุตัวตนพนักงานได้'
      });
    }

    const bonus = await Bonus.autoApproveSalesBonus(resolvedEmployeeId, salesAmount, commissionRate);

    if (!bonus) {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถสร้างโบนัสยอดขายได้'
      });
    }

    // Override description if provided
    if (description) {
      bonus.description = description;
      await bonus.save();
    }

    console.log(`💰 Auto-created sales bonus for ${bonus.employeeName}: ${formatCurrency(bonus.amount)}`);

    return res.status(201).json({
      success: true,
      data: bonus,
      message: 'สร้างโบนัสยอดขายอัตโนมัติเรียบร้อย'
    });
  } catch (error) {
    console.error('Error creating sales bonus:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถสร้างโบนัสยอดขายได้'
    });
  }
};

// Approve bonus (update status to approved)
exports.approveBonus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bonus ID'
      });
    }

    const bonus = await Bonus.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBy: userId,
        approvedDate: new Date(),
        updatedBy: userId
      },
      { new: true, runValidators: true }
    ).populate('employeeId', 'username employee');

    if (!bonus) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลโบนัส'
      });
    }

    console.log(`✅ Approved bonus for ${bonus.employeeName}: ${formatCurrency(bonus.amount)}`);

    return res.json({
      success: true,
      data: bonus,
      message: 'อนุมัติโบนัสเรียบร้อย'
    });
  } catch (error) {
    console.error('Error approving bonus:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถอนุมัติโบนัสได้'
    });
  }
};

// Mark bonus as paid
exports.markBonusAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentReference } = req.body;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bonus ID'
      });
    }

    const bonus = await Bonus.findByIdAndUpdate(
      id,
      {
        status: 'paid',
        paidDate: new Date(),
        paymentMethod,
        paymentReference,
        updatedBy: userId
      },
      { new: true, runValidators: true }
    ).populate('employeeId', 'username employee');

    if (!bonus) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบข้อมูลโบนัส'
      });
    }

    console.log(`💳 Marked bonus as paid for ${bonus.employeeName}: ${formatCurrency(bonus.amount)}`);

    return res.json({
      success: true,
      data: bonus,
      message: 'บันทึกการจ่ายโบนัสเรียบร้อย'
    });
  } catch (error) {
    console.error('Error marking bonus as paid:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถบันทึกการจ่ายโบนัสได้'
    });
  }
};

// Helper function to format currency (server-side)
function formatCurrency(amount) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(amount || 0);
}