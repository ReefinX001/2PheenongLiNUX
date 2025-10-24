// routes/hr/commissionRoutes.js
const express = require('express');
const router = express.Router();

// Import the real commission controller and auth middleware
const commissionController = require('../../controllers/hr/commissionController');
const auth = require('../../middlewares/authJWT');

// Routes with authentication
router.get('/', auth, commissionController.getAllCommissions);                    // GET /api/hr/commission
router.get('/employee/:employeeId', auth, commissionController.getEmployeeCommissions); // GET /api/hr/commission/employee/:employeeId
router.get('/realtime', auth, commissionController.getRealtimeCommissions);       // GET /api/hr/commission/realtime
router.get('/history', auth, commissionController.getCommissionHistory);         // GET /api/hr/commission/history
router.get('/summary', auth, commissionController.getCommissionSummary);         // GET /api/hr/commission/summary
router.get('/:id', auth, commissionController.getCommissionById);                // GET /api/hr/commission/:id
router.post('/', auth, commissionController.upsertCommission);                   // POST /api/hr/commission
router.post('/add-sale', auth, commissionController.addSaleToCommission);        // POST /api/hr/commission/add-sale
router.post('/:id/approve', auth, commissionController.approveCommission);       // POST /api/hr/commission/:id/approve
router.post('/:id/pay', auth, commissionController.payCommission);               // POST /api/hr/commission/:id/pay

module.exports = router;