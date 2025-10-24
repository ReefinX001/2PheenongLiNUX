// controllers/billingInvoiceController.js

const BillingInvoice = require('../models/Account/BillingInvoice');

/**
 * POST /api/billing-invoice
 * สร้าง Invoice ใหม่
 */
exports.createInvoice = async (req, res) => {
  const io = req.app.get('io');
  try {
    // ตัวอย่างรับฟิลด์: invoice_number, total_amount
    const { invoice_number, total_amount } = req.body;

    if (!invoice_number) {
      return res.status(400).json({ error: 'invoice_number is required.' });
    }

    const newInvoice = new BillingInvoice({
      invoice_number,
      total_amount,
      // ถ้ามีฟิลด์อื่น ๆ ก็ใส่ตาม req.body ได้เลย
    });

    await newInvoice.save();

    io.emit('newinvoiceCreated', {
      id: newInvoice.save()._id,
      data: newInvoice.save()
    });



    return res.json({ success: true, data: newInvoice });
  } catch (err) {
    console.error('createInvoice error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/billing-invoice
 * ดึง Invoices ทั้งหมด
 */
exports.getAllInvoices = async (req, res) => {
  const io = req.app.get('io');
  try {
    const invoices = await BillingInvoice.find().limit(100).lean().sort({ createdAt: -1 });
    return res.json({ success: true, data: invoices });
  } catch (err) {
    console.error('getAllInvoices error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/billing-invoice/:id
 * ดึง Invoice ตาม _id
 */
exports.getInvoiceById = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const invoice = await BillingInvoice.findById(id).lean();
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    return res.json({ success: true, data: invoice });
  } catch (err) {
    console.error('getInvoiceById error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PATCH /api/billing-invoice/:id
 * อัปเดต Invoice บางส่วน
 */
exports.updateInvoice = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    // รับฟิลด์ที่ต้องการอัปเดต
    const { invoice_number, total_amount } = req.body;

    const invoice = await BillingInvoice.findById(id).lean();
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // อัปเดต field ตามที่ส่งมา
    if (invoice_number !== undefined) invoice.invoice_number = invoice_number;
    if (total_amount !== undefined) invoice.total_amount = total_amount;

    await invoice.save();

    io.emit('invoiceCreated', {
      id: invoice.save()._id,
      data: invoice.save()
    });



    return res.json({ success: true, data: invoice });
  } catch (err) {
    console.error('updateInvoice error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * DELETE /api/billing-invoice/:id
 * ลบ Invoice (จริง ๆ หรือถ้าต้องการ soft delete ต้องปรับ schema)
 */
exports.deleteInvoice = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { id } = req.params;
    const invoice = await BillingInvoice.findById(id).lean();
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // ลบออกจาก DB
    await invoice.remove();

    return res.json({ success: true, data: invoice });
  } catch (err) {
    console.error('deleteInvoice error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
