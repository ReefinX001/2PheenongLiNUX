// controllers/system/maintenanceController.js
const { syncBranchStockFromProductData, checkSyncStatus } = require('../../scripts/sync-branchstock-from-product-html');

// GET /api/system/check-branchstock-cost
exports.checkBranchStockCost = async (req, res) => {
  try {
    console.log('🔍 API: ตรวจสอบสถานะ BranchStock cost...');

    const status = await checkBranchStockCostStatus();

    res.json({
      success: true,
      message: 'ตรวจสอบสถานะเสร็จสิ้น',
      data: status
    });

  } catch (error) {
    console.error('❌ API Error checkBranchStockCost:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ',
      details: error.message
    });
  }
};

// POST /api/system/fix-branchstock-cost
exports.fixBranchStockCost = async (req, res) => {
  try {
    console.log('🔧 API: เริ่มการแก้ไข BranchStock cost...');

    // รันการแก้ไข
    const result = await fixExistingBranchStockCost();

    res.json({
      success: true,
      message: 'แก้ไข cost ใน BranchStock เสร็จสิ้น',
      data: result
    });

  } catch (error) {
    console.error('❌ API Error fixBranchStockCost:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการแก้ไข cost',
      details: error.message
    });
  }
};

// GET /api/system/check-product-html-sync
exports.checkProductHtmlSync = async (req, res) => {
  try {
    console.log('🔍 API: ตรวจสอบสถานะ Product HTML sync...');

    const status = await checkSyncStatus();

    res.json({
      success: true,
      message: 'ตรวจสอบสถานะ Product HTML sync เสร็จสิ้น',
      data: status
    });

  } catch (error) {
    console.error('❌ API Error checkProductHtmlSync:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ Product HTML sync',
      details: error.message
    });
  }
};

// POST /api/system/sync-branchstock-from-product-html
exports.syncBranchStockFromProductHtml = async (req, res) => {
  try {
    console.log('🔧 API: เริ่มการซิงค์ BranchStock จาก Product HTML...');

    await syncBranchStockFromProductData();

    res.json({
      success: true,
      message: 'ซิงค์ BranchStock จาก Product HTML สำเร็จ'
    });

  } catch (error) {
    console.error('❌ API Error syncBranchStockFromProductHtml:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการซิงค์ BranchStock จาก Product HTML',
      details: error.message
    });
  }
};