// File: routes/receipts.js

const express = require('express');
const router = express.Router();
const Order = require('../models/POS/Order');
const PDFoooRasterController = require('../controllers/PDFoooRasterController');
// ↑ เรียกไฟล์ Raster version แทน

// Route สำหรับพิมพ์ใบเสร็จลงเครื่อง ESC/POS (Raster)
router.post('/print/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    // 1) หาออเดอร์จาก DB
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'ไม่พบใบเสร็จสำหรับรหัสที่ระบุ' });
    }

    // 2) เรียกพิมพ์ด้วย PDFoooRasterController
    await PDFoooRasterController.printReceipt(order);

    // ถ้าพิมพ์สำเร็จ
    return res.json({ success: true, message: 'พิมพ์ใบเสร็จ (Raster) สำเร็จ' });
  } catch (error) {
    console.error('❌ Error printing receipt (raster):', error);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการพิมพ์ใบเสร็จ (Raster)' });
  }
});

module.exports = router;
