// routes/eventRoutes.js
const express = require('express');
const router  = express.Router();
const {
  getAll,
  create,
  update,
  remove
} = require('../controllers/eventController');

// Authentication middleware - commented out for testing
// const authJWT = require('../middlewares/authJWT');
// router.use(authJWT);

// Debug middleware for POST requests
router.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log('🔍 Event POST Request Debug:');
    console.log('  - Headers:', req.headers);
    console.log('  - Body:', req.body);
    console.log('  - Content-Type:', req.get('content-type'));
    console.log('  - Body type:', typeof req.body);
    console.log('  - Body keys:', Object.keys(req.body || {}));
  }
  next();
});

// ดูรายการเหตุการณ์ทั้งหมด
router.get('/', getAll);

// สร้างเหตุการณ์ใหม่
router.post('/', create);

// แก้ไขเหตุการณ์
router.patch('/:id', update);

// ลบเหตุการณ์
router.delete('/:id', remove);

module.exports = router;
