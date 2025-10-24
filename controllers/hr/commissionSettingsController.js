const CommissionSettings = require('../../models/HR/commissionSettingsModel');
const mongoose = require('mongoose');

// ดึงการตั้งค่าค่าคอมมิชชั่นทั้งหมด
exports.getAllSettings = async (req, res) => {
  try {
    const settings = await CommissionSettings.find()
      .populate('createdBy', 'name')
      .populate('applicableEmployees.employeeId', 'name position')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching commission settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ดึงการตั้งค่าที่ใช้งานอยู่
exports.getActiveSettings = async (req, res) => {
  try {
    const currentDate = new Date();

    const settings = await CommissionSettings.find({
      isActive: true,
      effectiveDate: { $lte: currentDate },
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: currentDate } }
      ]
    })
    .populate('applicableEmployees.employeeId', 'name position')
    .lean();

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching active settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ดึงการตั้งค่าตาม ID
exports.getSettingById = async (req, res) => {
  try {
    const setting = await CommissionSettings.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('applicableEmployees.employeeId', 'name position')
      .populate('approvalSettings.approvers', 'name');

    if (!setting) {
      return res.status(404).json({ success: false, error: 'Setting not found' });
    }

    res.json({ success: true, data: setting });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// สร้างการตั้งค่าใหม่
exports.createSetting = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const settingData = req.body;
    settingData.createdBy = req.user?.id || req.body.createdBy;

    // ตรวจสอบชื่อซ้ำ
    const existing = await CommissionSettings.findOne({ name: settingData.name });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Setting name already exists'
      });
    }

    const setting = new CommissionSettings(settingData);
    await setting.save({ session });

    await session.commitTransaction();

    // ส่ง socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('commissionSettingCreated', {
        id: setting._id,
        name: setting.name
      });
    }

    res.status(201).json({ success: true, data: setting });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating setting:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    session.endSession();
  }
};

// อัพเดทการตั้งค่า
exports.updateSetting = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const updateData = req.body;

    const setting = await CommissionSettings.findById(id).session(session);
    if (!setting) {
      return res.status(404).json({ success: false, error: 'Setting not found' });
    }

    // เก็บประวัติการเปลี่ยนแปลง
    const previousValues = setting.toObject();
    delete previousValues.history;

    setting.history.push({
      modifiedBy: req.user?.id || req.body.modifiedBy,
      modifiedDate: new Date(),
      changes: JSON.stringify(updateData),
      previousValues
    });

    // อัพเดทค่า
    Object.assign(setting, updateData);
    await setting.save({ session });

    await session.commitTransaction();

    // ส่ง socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('commissionSettingUpdated', {
        id: setting._id,
        name: setting.name
      });
    }

    res.json({ success: true, data: setting });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating setting:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    session.endSession();
  }
};

// ลบการตั้งค่า
exports.deleteSetting = async (req, res) => {
  try {
    const { id } = req.params;

    const setting = await CommissionSettings.findById(id);
    if (!setting) {
      return res.status(404).json({ success: false, error: 'Setting not found' });
    }

    // ทำการ soft delete โดยการ deactivate
    setting.isActive = false;
    setting.expiryDate = new Date();
    await setting.save();

    // ส่ง socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('commissionSettingDeleted', {
        id: setting._id,
        name: setting.name
      });
    }

    res.json({ success: true, message: 'Setting deactivated successfully' });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// คำนวณค่าคอมมิชชั่นตามการตั้งค่า
exports.calculateCommission = async (req, res) => {
  try {
    const { settingId, saleAmount, saleType, productCategory, employeeId } = req.body;

    let setting;

    if (settingId) {
      setting = await CommissionSettings.findById(settingId);
    } else {
      // หาการตั้งค่าที่เหมาะสมสำหรับพนักงาน
      setting = await CommissionSettings.findOne({
        isActive: true,
        $or: [
          { 'applicableEmployees.employeeId': employeeId },
          { applicableEmployees: { $size: 0 } }
        ]
      });
    }

    if (!setting) {
      return res.status(404).json({
        success: false,
        error: 'No applicable commission setting found'
      });
    }

    const commission = setting.calculateCommission(saleAmount, saleType, productCategory);

    res.json({
      success: true,
      data: {
        settingName: setting.name,
        saleAmount,
        commissionAmount: commission,
        commissionRate: (commission / saleAmount) * 100
      }
    });
  } catch (error) {
    console.error('Error calculating commission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ดึงการตั้งค่าสำหรับพนักงานคนหนึ่ง
exports.getEmployeeSettings = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const currentDate = new Date();

    const settings = await CommissionSettings.find({
      isActive: true,
      effectiveDate: { $lte: currentDate },
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: currentDate } }
      ],
      $or: [
        { 'applicableEmployees.employeeId': employeeId },
        { applicableEmployees: { $size: 0 } } // การตั้งค่าที่ใช้กับทุกคน
      ]
    }).lean();

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching employee settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ทดสอบการตั้งค่า
exports.testSetting = async (req, res) => {
  try {
    const { settingId, testCases } = req.body;

    const setting = await CommissionSettings.findById(settingId);
    if (!setting) {
      return res.status(404).json({ success: false, error: 'Setting not found' });
    }

    const results = testCases.map(testCase => {
      const commission = setting.calculateCommission(
        testCase.saleAmount,
        testCase.saleType,
        testCase.productCategory
      );

      return {
        ...testCase,
        calculatedCommission: commission,
        commissionRate: (commission / testCase.saleAmount) * 100
      };
    });

    res.json({
      success: true,
      data: {
        settingName: setting.name,
        testResults: results
      }
    });
  } catch (error) {
    console.error('Error testing setting:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};