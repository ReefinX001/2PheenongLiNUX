// routes/bankAccounts.js
const express = require('express');
const router = express.Router();
const BankAccount = require('../models/Account/BankAccount');

// (1) GET /api/bank-accounts => ดึงบัญชีทั้งหมด
router.get('/', async (req, res) => {
  try {
    const accounts = await BankAccount.find({});
    res.json({ success: true, data: accounts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// (2) GET /api/bank-accounts/:id => ดึงบัญชี 1 รายการ
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const account = await BankAccount.findById(id);
    if (!account) {
      return res.status(404).json({ success: false, error: 'ไม่พบบัญชีธนาคาร' });
    }
    res.json({ success: true, data: account });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// (3) POST /api/bank-accounts => สร้างบัญชีใหม่
router.post('/', async (req, res) => {
  try {
    const { bankName, accountNumber, accountName } = req.body;
    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุ bankName, accountNumber, accountName' });
    }
    const newAcc = new BankAccount({ bankName, accountNumber, accountName });
    await newAcc.save();
    res.json({ success: true, data: newAcc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// (4) PUT /api/bank-accounts/:id => แก้ไขบัญชี
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { bankName, accountNumber, accountName } = req.body;
    const acc = await BankAccount.findById(id);
    if (!acc) {
      return res.status(404).json({ success: false, error: 'ไม่พบบัญชีธนาคาร' });
    }
    if (bankName) acc.bankName = bankName;
    if (accountNumber) acc.accountNumber = accountNumber;
    if (accountName) acc.accountName = accountName;

    await acc.save();
    res.json({ success: true, data: acc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// (5) DELETE /api/bank-accounts/:id => ลบบัญชี
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await BankAccount.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'ไม่พบบัญชีธนาคาร' });
    }
    res.json({ success: true, data: deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

module.exports = router;
