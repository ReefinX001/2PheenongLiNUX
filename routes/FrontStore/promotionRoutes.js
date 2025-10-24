const express = require('express');
const router = express.Router();
const promotionController = require('../../controllers/FrontStore/promotionController');
const authJWT = require('../../middlewares/authJWT');

// Public routes (for frontend)
router.get('/active', promotionController.getActive);
router.post('/:id/click', promotionController.incrementClick);

// Admin routes (temporarily without auth for development)
// TODO: Add proper admin authentication
// router.use(authJWT); // Apply authentication to all routes below

// Get all promotions with pagination and filters
router.get('/', promotionController.getAll);

// Get promotion by ID
router.get('/:id', promotionController.getById);

// Create new promotion (with file upload)
router.post('/',
  promotionController.uploadImage,
  promotionController.create
);

// Update promotion (with file upload)
router.put('/:id',
  promotionController.uploadImage,
  promotionController.update
);

// Delete promotion
router.delete('/:id', promotionController.delete);

// Reorder promotions
router.post('/reorder', promotionController.reorder);

module.exports = router;
