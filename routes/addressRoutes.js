const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');

// ✅ GET /api/address/thailand => ดึงข้อมูลจังหวัด อำเภอ ตำบล
router.get('/thailand', addressController.getThailandData);

// ✅ GET /api/address/postal-code => ดึงรหัสไปรษณีย์
router.get('/postal-code', addressController.getPostalCode);

// ✅ POST /api/address/reverse-geocode => แปลงพิกัดเป็นที่อยู่
router.post('/reverse-geocode', addressController.reverseGeocode);

module.exports = router;