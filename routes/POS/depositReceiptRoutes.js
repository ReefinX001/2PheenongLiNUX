const express = require('express');
const router = express.Router();
const depositReceiptController = require('../../controllers/POS/depositReceiptController');
const authJWT = require('../../middlewares/authJWT');

// === DepositReceipt Routes (POS System) ===
// Base path: /api/deposit-receipts

// GET /api/deposit-receipts - Get all deposit receipts with filtering
router.get('/', authJWT, depositReceiptController.getAllDepositReceipts);

// GET /api/deposit-receipts/:id - Get specific deposit receipt
router.get('/:id', authJWT, depositReceiptController.getDepositReceiptById);

// POST /api/deposit-receipts - Create new deposit receipt
router.post('/', authJWT, depositReceiptController.createDepositReceipt);

// PUT /api/deposit-receipts/:id - Update deposit receipt
router.put('/:id', authJWT, depositReceiptController.updateDepositReceipt);

// DELETE /api/deposit-receipts/:id - Delete deposit receipt
router.delete('/:id', authJWT, depositReceiptController.deleteDepositReceipt);

// GET /api/deposit-receipts/:id/download - Download deposit receipt PDF
router.get('/:id/download', depositReceiptController.downloadDepositReceiptPdf);

module.exports = router;
