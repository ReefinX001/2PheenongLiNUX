// routes/billingInvoices.js (ตัวอย่าง Router)
const express = require('express');
const router = express.Router();
const BillingInvoice = require('../../models/Account/BillingInvoice');

// GET /api/billing-invoices => ดึงรายการบิลทั้งหมด
router.get('/', async (req, res) => {
  try {
    const invoices = await BillingInvoice.find({});
    res.json({ success: true, data: invoices });
  } catch (err) {
    console.error('Error fetching billing invoices:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/billing-invoices/:id => ดึงบิล 1 รายการ
router.get('/:id', async (req, res) => {
  try {
    const invoice = await BillingInvoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'ไม่พบบิล' });
    }
    res.json({ success: true, data: invoice });
  } catch (err) {
    console.error('Error fetching a billing invoice:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/billing-invoices => สร้างบิลใหม่
router.post('/', async (req, res) => {
  try {
    const { invoice_number, total_amount } = req.body;
    // ตรวจสอบฟิลด์ตามต้องการ
    const newInvoice = new BillingInvoice({ invoice_number, total_amount });
    await newInvoice.save();
    res.json({ success: true, data: newInvoice });
  } catch (err) {
    console.error('Error creating a billing invoice:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ฯลฯ
module.exports = router;
