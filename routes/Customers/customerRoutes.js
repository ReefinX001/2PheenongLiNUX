// routes/customerRoutes.js

const express = require('express');
const router = express.Router();
const customerController = require('../../controllers/Customers/customerController');
const authJWT = require('../../middlewares/authJWT');

// Mock validators และ upload ถ้ายังไม่มี
const validateCustomer = (req, res, next) => next(); // mock validator

// Mock upload middleware
const upload = {
  single: (fieldName) => (req, res, next) => {
    req.file = null; // mock file
    next();
  },
  array: (fieldName, maxCount) => (req, res, next) => {
    req.files = []; // mock files array
    next();
  }
};

// Middleware สำหรับทุก routes
router.use(authJWT);

// *** เปลี่ยนลำดับ routes ให้ specific routes อยู่ก่อน general routes ***

// CashSale Routes (ย้ายขึ้นมาก่อน)
router.get('/cash-sales/identifier/:identifier', customerController.getCustomerCashSalesByIdentifier);
router.get('/cash-sales/summary', customerController.getCashSalesSummaryByType);
router.get('/cash-sales/duplicates', customerController.findDuplicateCustomersInCashSales);

// Reports (ย้ายขึ้นมาก่อน)
router.get('/reports/summary', checkFunction(customerController.getCustomerSummary));
router.get('/reports/new-customers', checkFunction(customerController.getNewCustomers));
router.get('/reports/top-customers', checkFunction(customerController.getTopCustomers));

// Export
router.get('/export/excel', customerController.exportCustomersToExcel);

// Bulk Operations
router.post('/bulk/import', checkFunction(customerController.bulkImport));
router.post('/bulk/export', checkFunction(customerController.exportCustomers));

// Search & Lookup Routes
router.get('/search', customerController.searchCustomers);
router.get('/lookup/:identifier', customerController.lookupCustomer);
router.get('/check-status/:identifier', customerController.checkCustomerStatus);
router.post('/verify', customerController.verifyCustomer);

// CRUD Routes
router.get('/', customerController.getAllCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', validateCustomer, customerController.createCustomer);
router.put('/:id', validateCustomer, customerController.updateCustomer);
router.delete('/:id', customerController.softDeleteCustomer);

// Customer specific routes
router.post('/:id/restore', customerController.restoreCustomer);
router.get('/:id/profile', customerController.getCustomerProfile);
router.get('/:id/purchase-history', customerController.getPurchaseHistory);
router.get('/:id/installment-info', customerController.getInstallmentInfo);
router.get('/:id/statistics', customerController.getCustomerStatistics);
router.post('/:id/update-statistics', customerController.updateCustomerStatistics);

// New required routes
router.get('/:id/loans', customerController.getCustomerLoans);
router.get('/:id/installments', customerController.getCustomerInstallments);

// Document Management
router.post('/:id/documents', upload.array('documents', 10), customerController.uploadCustomerDocuments);
router.get('/:id/documents', customerController.getCustomerDocuments);
router.delete('/:id/documents/:documentId', customerController.deleteCustomerDocument);

// Profile Image
router.post('/:id/profile-image', upload.single('profileImage'), customerController.uploadCustomerProfileImage);

// Notes & Tags (ใช้ checkFunction เพื่อป้องกัน error)
router.post('/:id/notes', checkFunction(customerController.addNote));
router.get('/:id/notes', checkFunction(customerController.getNotes));
router.post('/:id/tags', checkFunction(customerController.addTags));
router.delete('/:id/tags/:tag', checkFunction(customerController.removeTag));

// Credit & Loyalty (ใช้ checkFunction เพื่อป้องกัน error)
router.get('/:id/credit-info', checkFunction(customerController.getCreditInfo));
router.post('/:id/credit-limit', checkFunction(customerController.updateCreditLimit));
router.get('/:id/loyalty-points', checkFunction(customerController.getLoyaltyPoints));
router.post('/:id/loyalty-points', checkFunction(customerController.updateLoyaltyPoints));

// CashSale Routes ที่เกี่ยวกับ customer ID
router.post('/:customerId/cash-sales', customerController.createCashSaleForCustomer);
router.post('/:customerId/cash-sales/:cashSaleId/link', customerController.linkCashSaleToCustomer);

// เพิ่ม endpoint สำหรับบันทึกข้อมูลติดต่อ
router.post('/contact', authJWT, async (req, res) => {
  try {
    const { customerId, facebook, line, mapLocation } = req.body;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ customerId'
      });
    }

    // ตรวจสอบว่ามีข้อมูลอย่างน้อย 1 ช่อง
    if (!facebook && !line && !mapLocation) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลติดต่ออย่างน้อย 1 ช่อง'
      });
    }

    // ตรวจสอบและบันทึกข้อมูล
    const Customer = require('../../models/Customer/Customer');
    const customer = await Customer.findOneAndUpdate(
      {
        $or: [
          { 'individual.idCard': customerId },
          { 'corporate.taxId': customerId }
        ]
      },
      {
        $set: {
          'socialContacts.facebook': facebook || '',
          'socialContacts.line': line || '',
          'socialContacts.mapLocation': mapLocation || '',
          'socialContacts.updatedAt': new Date()
        }
      },
      {
        new: true,
        upsert: false
      }
    );

    if (!customer) {
      // ถ้าไม่เจอลูกค้า อาจจะสร้างข้อมูลใหม่หรือส่งข้อความแจ้งเตือน
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า กรุณาบันทึกข้อมูลพื้นฐานก่อน'
      });
    }

    res.json({
      success: true,
      message: 'บันทึกข้อมูลติดต่อเรียบร้อย',
      data: {
        customerId: customerId,
        socialContacts: customer.socialContacts
      }
    });

  } catch (error) {
    console.error('Error saving customer contact:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ: ' + error.message
    });
  }
});

// เพิ่ม endpoint สำหรับดึงข้อมูลติดต่อ
router.get('/contact/:customerId', authJWT, async (req, res) => {
  try {
    const { customerId } = req.params;

    const Customer = require('../../models/Customer/Customer');
    const customer = await Customer.findOne({
      $or: [
        { 'individual.idCard': customerId },
        { 'corporate.taxId': customerId }
      ]
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลลูกค้า'
      });
    }

    res.json({
      success: true,
      data: {
        customerId: customerId,
        socialContacts: customer.socialContacts || {}
      }
    });

  } catch (error) {
    console.error('Error fetching customer contact:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในระบบ: ' + error.message
    });
  }
});

// Helper function เพื่อตรวจสอบว่า function มีอยู่หรือไม่
function checkFunction(fn) {
  if (typeof fn === 'function') {
    return fn;
  }
  // Return mock function ถ้าไม่มี
  return (req, res) => {
    res.status(501).json({
      success: false,
      message: 'ฟังก์ชันนี้ยังไม่ได้ implement'
    });
  };
}

module.exports = router;
