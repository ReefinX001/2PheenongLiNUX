// routes/journalRoutes.js
const express = require('express');
const router = express.Router();
const journalController = require('../../controllers/journalController');

// GET /api/journals => ดึงทั้งหมด
router.get('/', journalController.getAllJournals);

// GET /api/journals/:id => ดึงตามไอดี
router.get('/:id', journalController.getJournalById);

// POST /api/journals => สร้างใหม่
router.post('/', journalController.createJournal);

// PATCH/PUT /api/journals/:id => อัปเดต
router.patch('/:id', journalController.updateJournal);  // หรือ .put('/:id', ...)

// DELETE /api/journals/:id => ลบ
router.delete('/:id', journalController.deleteJournal);

module.exports = router;
