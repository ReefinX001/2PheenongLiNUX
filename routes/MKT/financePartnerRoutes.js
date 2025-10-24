// routes/MKT/financePartnerRoutes.js
const express = require('express');
const router = express.Router();
const financePartnerController = require('../../controllers/MKT/financePartnerController');
const authJWT = require('../../middlewares/authJWT');

// Apply authentication middleware to all routes
router.use(authJWT);

// Public routes (for POS/frontend use)
router.get('/active', financePartnerController.getActiveFinancePartners);
router.get('/by-service', financePartnerController.getPartnersByService);

// Statistics routes
router.get('/statistics', financePartnerController.getFinancePartnerStats);
router.get('/stats', financePartnerController.getFinancePartnerStats); // Alias

// CRUD Operations
router.route('/')
  .get(financePartnerController.getAllFinancePartners)    // ดูข้อมูล Finance Partners ทั้งหมด
  .post(financePartnerController.createFinancePartner);   // สร้าง Finance Partner ใหม่

router.route('/:id')
  .get(financePartnerController.getFinancePartnerById)     // ดูข้อมูล Finance Partner ตาม ID
  .patch(financePartnerController.updateFinancePartner)    // อัพเดท Finance Partner
  .put(financePartnerController.updateFinancePartner)      // อัพเดท Finance Partner (full update)
  .delete(financePartnerController.deleteFinancePartner);  // ลบ Finance Partner

// Toggle active status
router.patch('/:id/toggle', financePartnerController.toggleFinancePartner);

// Update statistics (for API integration)
router.patch('/:id/stats', financePartnerController.updateFinancePartnerStats);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Finance Partner Routes Error:', err);
  res.status(500).json({
    status: 'fail',
    message: 'เกิดข้อผิดพลาดในระบบ Finance Partners'
  });
});

module.exports = router;