const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/FrontStore/categoryController');
const authJWT = require('../../middlewares/authJWT');

// Public routes (for frontend)
router.get('/active', categoryController.getActive);

// Admin routes (temporarily without auth for development)
// TODO: Add proper admin authentication
// router.use(authJWT); // Apply authentication to all routes below

// Get all categories with pagination and filters
router.get('/', categoryController.getAll);

// Get category by ID
router.get('/:id', categoryController.getById);

// Create new category (with file upload)
router.post('/',
  categoryController.uploadIcon,
  categoryController.create
);

// Update category (with file upload)
router.put('/:id',
  categoryController.uploadIcon,
  categoryController.update
);

// Delete category
router.delete('/:id', categoryController.delete);

// Reorder categories
router.post('/reorder', categoryController.reorder);

module.exports = router;
