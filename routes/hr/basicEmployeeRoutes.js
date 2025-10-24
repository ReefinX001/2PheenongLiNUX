// routes/hr/basicEmployeeRoutes.js
const express = require('express');
const router = express.Router();
const basicEmployeeController = require('../../controllers/hr/basicEmployeeController');
const auth = require('../../middlewares/authJWT');

console.log('🛠️ Loading basic employee routes...');

// Test route (no auth)
router.get('/test', basicEmployeeController.testBasicEmployee);

// Middleware to log all requests to this route
router.use((req, res, next) => {
  console.log(`📍 Basic Employee Route: ${req.method} ${req.path}`);
  console.log('📍 Query:', req.query);
  console.log('📍 Body:', req.body);
  console.log('📍 User:', req.user?.username || 'No user');
  next();
});

// Routes for basic employee management (no auth for testing)
router.get('/', basicEmployeeController.getAllBasicEmployees);
router.get('/:id', basicEmployeeController.getBasicEmployeeById);
router.post('/', basicEmployeeController.createBasicEmployee);
router.put('/:id', basicEmployeeController.updateBasicEmployee);
router.delete('/:id', basicEmployeeController.deleteBasicEmployee);

console.log('✅ Basic employee routes loaded');

module.exports = router;
