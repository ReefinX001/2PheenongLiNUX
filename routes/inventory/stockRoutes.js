const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const stockController = require('../../controllers/inventory/stockController');
const authJWT = require('../../middlewares/authJWT');
const hasPermission = require('../../middlewares/permission');
const { auditLogger, trackDataChanges } = require('../../middlewares/auditLogger');
const { rateLimiters } = require('../../middlewares/security');
const Stock = require('../../models/Stock/Stock');

// Validation rules
const stockValidation = {
  create: [
    body('product').isMongoId().withMessage('Invalid product ID'),
    body('branch').isMongoId().withMessage('Invalid branch ID'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),
    body('minQuantity').optional().isInt({ min: 0 }).withMessage('Min quantity must be a positive integer'),
    body('maxQuantity').optional().isInt({ min: 1 }).withMessage('Max quantity must be at least 1')
  ],
  update: [
    body('type').isIn(['add', 'subtract', 'adjust']).withMessage('Invalid operation type'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),
    body('reference').optional().trim().isLength({ max: 200 }).withMessage('Reference too long'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes too long')
  ],
  transfer: [
    body('fromBranch').isMongoId().withMessage('Invalid source branch ID'),
    body('toBranch').isMongoId().withMessage('Invalid destination branch ID'),
    body('product').isMongoId().withMessage('Invalid product ID'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes too long')
  ],
  query: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
    query('branch').optional().isMongoId().withMessage('Invalid branch ID'),
    query('status').optional().isIn(['normal', 'low', 'out', 'overstock']).withMessage('Invalid status')
  ]
};

// Error handler for validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Routes with authentication, permission, and audit logging

// Get all stocks
router.get('/',
  authJWT,
  auditLogger('Stock'),
  stockValidation.query,
  handleValidationErrors,
  stockController.getAllStocks
);

// Get single stock
router.get('/:id',
  authJWT,
  auditLogger('Stock'),
  param('id').isMongoId().withMessage('Invalid stock ID'),
  handleValidationErrors,
  stockController.getStock
);

// Create new stock (admin/manager only)
router.post('/',
  authJWT,
  hasPermission(['admin', 'manager']),
  rateLimiters.modify,
  auditLogger('Stock'),
  stockValidation.create,
  handleValidationErrors,
  stockController.createStock
);

// Update stock quantity
router.put('/:id',
  authJWT,
  hasPermission(['admin', 'manager', 'staff']),
  rateLimiters.modify,
  auditLogger('Stock'),
  trackDataChanges(Stock),
  param('id').isMongoId().withMessage('Invalid stock ID'),
  stockValidation.update,
  handleValidationErrors,
  stockController.updateStock
);

// Transfer stock between branches
router.post('/transfer',
  authJWT,
  hasPermission(['admin', 'manager']),
  rateLimiters.modify,
  auditLogger('Stock'),
  stockValidation.transfer,
  handleValidationErrors,
  stockController.transferStock
);

// Get stock history
router.get('/:id/history',
  authJWT,
  auditLogger('StockHistory'),
  param('id').isMongoId().withMessage('Invalid stock ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  handleValidationErrors,
  stockController.getStockHistory
);

// Delete stock (soft delete, admin only)
router.delete('/:id',
  authJWT,
  hasPermission(['admin']),
  rateLimiters.modify,
  auditLogger('Stock'),
  param('id').isMongoId().withMessage('Invalid stock ID'),
  body('reason').trim().notEmpty().withMessage('Deletion reason is required'),
  handleValidationErrors,
  stockController.deleteStock
);

// Export stock report
router.get('/export/:format',
  authJWT,
  hasPermission(['admin', 'manager']),
  auditLogger('Stock'),
  param('format').isIn(['csv', 'excel', 'pdf']).withMessage('Invalid export format'),
  handleValidationErrors,
  async (req, res) => {
    // Export logic will be implemented separately
    res.status(501).json({
      success: false,
      error: 'Export feature not implemented yet'
    });
  }
);

module.exports = router;
