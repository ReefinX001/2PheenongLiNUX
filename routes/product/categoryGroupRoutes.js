const express = require('express');
const router = express.Router();
const categoryGroupController = require('../../controllers/categoryGroupController');

// GET /api/category-group
router.get('/', categoryGroupController.getAllCategoryGroups);

module.exports = router;
