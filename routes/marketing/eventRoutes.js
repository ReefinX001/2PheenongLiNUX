// routes/eventRoutes.js
const express = require('express');
const router  = express.Router();
const {
  getAll,
  create,
  update,
  remove
} = require('../../controllers/eventController');

// ดูรายการเหตุการณ์ทั้งหมด
router.get('/', getAll);

// สร้างเหตุการณ์ใหม่
router.post('/', create);

// แก้ไขเหตุการณ์
router.patch('/:id', update);

// ลบเหตุการณ์
router.delete('/:id', remove);

module.exports = router;
