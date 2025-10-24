// routes/hr/bonusRoutes.js
const express = require('express');
const router = express.Router();

// Import the real bonus controller and auth middleware
const bonusController = require('../../controllers/hr/bonusController');
const auth = require('../../middlewares/authJWT');

// Routes with authentication
router.get('/', auth, bonusController.getAllBonuses);              // GET /api/hr/bonus
router.get('/summary/stats', auth, bonusController.getBonusSummary); // GET /api/hr/bonus/summary/stats
router.get('/employee/:employeeId/payroll', auth, bonusController.getEmployeePayrollBonuses); // GET /api/hr/bonus/employee/:employeeId/payroll
router.get('/:id', auth, bonusController.getBonusById);            // GET /api/hr/bonus/:id
router.post('/', auth, bonusController.createBonus);              // POST /api/hr/bonus
router.post('/sales', auth, bonusController.createSalesBonus);     // POST /api/hr/bonus/sales
router.put('/:id', auth, bonusController.updateBonus);            // PUT /api/hr/bonus/:id
router.put('/:id/approve', auth, bonusController.approveBonus);    // PUT /api/hr/bonus/:id/approve
router.put('/:id/pay', auth, bonusController.markBonusAsPaid);     // PUT /api/hr/bonus/:id/pay
router.delete('/:id', auth, bonusController.deleteBonus);         // DELETE /api/hr/bonus/:id

module.exports = router;