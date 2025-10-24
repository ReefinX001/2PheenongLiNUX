const express = require('express');
const router = express.Router();
const productController = require('../../controllers/FrontStore/productController');
const errorHandler = require('../../middlewares/frontStoreErrorHandler');

// Product routes
router.get('/', productController.getAll);
router.get('/active', productController.getActive);
router.get('/:id', productController.getById);
router.post('/', productController.create);
router.put('/:id', productController.update);
router.delete('/:id', productController.delete);

// Error handler for this route
router.use(errorHandler);

module.exports = router;
