// backend/routes/categoryRoutes.js
const express           = require('express');
const router            = express.Router();
const catCtrl           = require('../controllers/categoryController');
const authJWT           = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission');

// Public endpoints for POS/Marketing (only authentication required)
router.get('/public', authJWT, catCtrl.getAll); // Public access for POS/Marketing systems
router.get('/list', authJWT, catCtrl.getAll);   // Alias for compatibility

// Protected endpoints (require specific permissions)
router.use(authJWT);
router.get   ('/',        hasPermission('categories:read'),   catCtrl.getAll);
router.get   ('/:id',     hasPermission('categories:read'),   catCtrl.getById);
router.post  ('/',        hasPermission('categories:create'), catCtrl.create);
router.put   ('/:id',     hasPermission('categories:update'), catCtrl.update);
router.delete('/:id',     hasPermission('categories:delete'), catCtrl.remove);

module.exports = router;
