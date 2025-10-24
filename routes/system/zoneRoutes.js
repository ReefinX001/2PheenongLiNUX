const express = require('express');
const router  = express.Router();
const {
  getAll,
  getOne,
  create,
  update,
  remove
} = require('../../controllers/zoneController');
const authJWT       = require('../../middlewares/authJWT');
const hasPermission = require('../../middlewares/permission');

// ดูรายการพื้นที่เช็คอิน
router.get('/', authJWT, hasPermission('view_zones'), getAll);

// ดูพื้นที่เดี่ยว
router.get('/:id', authJWT, hasPermission('view_zones'), getOne);

// สร้างพื้นที่ใหม่
router.post('/', authJWT, hasPermission('create_zones'), create);

// แก้ไขพื้นที่
router.patch('/:id', authJWT, hasPermission('edit_zones'), update);

// ลบพื้นที่
router.delete('/:id', authJWT, hasPermission('delete_zones'), remove);

module.exports = router;
