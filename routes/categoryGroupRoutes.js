const express = require('express');
const router = express.Router();
const categoryGroupController = require('../controllers/categoryGroupController');

// GET /api/category-group
router.get('/', categoryGroupController.getAllCategoryGroups);

// Create a new category group
router.post('/', categoryGroupController.createCategoryGroup);

// Get category group by ID
router.get('/:id', categoryGroupController.getCategoryGroupById);

// Update a category group
router.patch('/:id', categoryGroupController.updateCategoryGroup);

// Delete a category group
router.delete('/:id', categoryGroupController.deleteCategoryGroup);

module.exports = router;
