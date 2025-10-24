// routes/reviewRoutes.js
const express = require('express');
const router  = express.Router();
const reviewController = require('../controllers/reviewController');

// ต้องตรงกับ exports.getAll ด้านบน
router.get('/', reviewController.getAll);

module.exports = router;
