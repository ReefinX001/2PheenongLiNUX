// routes/homeRoutes.js
const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// ใช้ controller ในการส่งไฟล์
router.get('/', homeController.getHomePage);

module.exports = router;
