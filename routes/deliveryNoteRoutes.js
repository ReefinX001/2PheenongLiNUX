const express = require('express');
const router = express.Router();
const DeliveryNoteController = require('../controllers/DeliveryNoteController');

// /api/delivery-notes

// GET /api/delivery-notes - Get all delivery notes with filtering
router.get('/', DeliveryNoteController.getDeliveryNotes);

// GET /api/delivery-notes/:id - Get specific delivery note
router.get('/:id', DeliveryNoteController.getDeliveryNoteById);

// POST /api/delivery-notes - Create new delivery note
router.post('/', DeliveryNoteController.createDeliveryNote);

// POST /api/delivery-notes/from-deposit/:depositReceiptId - Create from deposit receipt
router.post('/from-deposit/:depositReceiptId', DeliveryNoteController.createFromDepositReceipt);

// PATCH /api/delivery-notes/:id/status - Update delivery status
router.patch('/:id/status', DeliveryNoteController.updateDeliveryStatus);

// GET /api/delivery-notes/:id/print - Print delivery note PDF
router.get('/:id/print', DeliveryNoteController.printDeliveryNote);

module.exports = router;