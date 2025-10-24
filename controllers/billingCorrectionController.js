// controllers/billingCorrectionController.js

const BillingCorrection = require('../models/Account/BillingCorrection');

/**
 * POST /api/billing-correction
 * สร้าง Correction ใหม่
 */
exports.createCorrection = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { invoice_id, field_name, old_value, new_value, corrected_by } = req.body;

    if (!invoice_id || !field_name || !corrected_by) {
      return res.status(400).json({
        error: 'invoice_id, field_name, and corrected_by are required.',
      });
    }

    const correction = new BillingCorrection({
      invoice_id,
      field_name,
      old_value,
      new_value,
      corrected_by,
      corrected_at: new Date(),
    });

    await correction.save();

    io.emit('correctionCreated', {
      id: correction.save()._id,
      data: correction.save()
    });



    return res.json({ success: true, data: correction });
  } catch (err) {
    console.error('createCorrection error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/billing-correction
 * ดึง BillingCorrections ทั้งหมด
 */
exports.getAllCorrections = async (req, res) => {
  const io = req.app.get('io');
  try {
    // populate invoice_id, corrected_by ตามต้องการ
    const corrections = await BillingCorrection.find({}).limit(100).lean()
      .populate('invoice_id', 'invoice_number')   // ถ้าต้องการฟิลด์จากโมเดล Invoice
      .populate('corrected_by', 'username')       // ถ้าต้องการฟิลด์จากโมเดล User
      .sort({ corrected_at: -1 });

    return res.json({ success: true, data: corrections });
  } catch (err) {
    console.error('getAllCorrections error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/billing-correction/invoice/:invoiceId
 * ดึง Correction เฉพาะ invoice_id
 */
exports.getCorrectionsByInvoice = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { invoiceId } = req.params;
    const corrections = await BillingCorrection.find({ invoice_id: invoiceId }).limit(100).lean()
      .populate('corrected_by', 'username')
      .sort({ corrected_at: -1 });

    return res.json({ success: true, data: corrections });
  } catch (err) {
    console.error('getCorrectionsByInvoice error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
