const express = require('express');
const router = express.Router();
const contactsController = require('../controllers/contactsController');

// POST /api/contacts => เพิ่มผู้ติดต่อ
router.post('/', contactsController.createContact);
// GET /api/contacts => ดึงรายชื่อผู้ติดต่อ
router.get('/', contactsController.getAllContacts);

module.exports = router;
