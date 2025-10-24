// routes/hr/overtimeRoutes.js
const express = require('express');
const router = express.Router();
const overtimeController = require('../../controllers/hr/overtimeController');
const authJWT = require('../../middlewares/authJWT');
const { rateLimiters, validateInput } = require('../../middlewares/security');

// Apply authentication and security middleware
router.use(authJWT);
router.use(validateInput);
router.use(rateLimiters.general);

// Overtime routes
router.get('/', overtimeController.getAllOvertimes);
router.get('/pending-approvals', overtimeController.getPendingApprovals);
router.get('/my-history', overtimeController.getMyOvertimeHistory);
router.get('/:id', overtimeController.getOvertimeById);

router.post('/', rateLimiters.modify, overtimeController.createOvertimeRequest);
router.post('/:id/approve', rateLimiters.modify, overtimeController.approveOvertime);
router.post('/:id/reject', rateLimiters.modify, overtimeController.rejectOvertime);
router.post('/:id/start', rateLimiters.modify, overtimeController.startOvertimeWork);
router.post('/:id/end', rateLimiters.modify, overtimeController.endOvertimeWork);

router.put('/:id', rateLimiters.modify, overtimeController.updateOvertimeRequest);
router.delete('/:id', rateLimiters.modify, overtimeController.deleteOvertimeRequest);

module.exports = router;