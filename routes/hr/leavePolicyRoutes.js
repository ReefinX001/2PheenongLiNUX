// routes/hr/leavePolicyRoutes.js
const express = require('express');
const router = express.Router();
const leavePolicyController = require('../../controllers/hr/leavePolicyController');
const authJWT = require('../../middlewares/authJWT');
const hasPermission = require('../../middlewares/permission');

// Apply authentication middleware to all routes
router.use(authJWT);

// Leave policy routes
router.get('/', leavePolicyController.getCurrentPolicy);
router.get('/history', leavePolicyController.getPolicyHistory);
router.get('/stats', leavePolicyController.getPolicyStats);

// Protected routes (require permissions)
router.post('/', hasPermission('hr:write'), leavePolicyController.createPolicy);
router.put('/:id', hasPermission('hr:write'), leavePolicyController.updatePolicy);
router.delete('/:id', hasPermission('hr:delete'), leavePolicyController.deletePolicy);

module.exports = router;
