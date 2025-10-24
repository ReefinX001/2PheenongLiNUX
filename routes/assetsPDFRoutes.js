// assetsPDFRoutes.js
// Router สำหรับ API endpoints ที่เกี่ยวกับการสร้าง PDF ของสินทรัพย์

const express = require('express');
const router = express.Router();
const {
  generateAssetsListPDF,
  generateSingleAssetPDF
} = require('../controllers/assetsPDFController');

/**
 * @route   POST /api/assets/pdf/list
 * @desc    Generate PDF for assets list from provided data
 * @access  Public
 * @body    { storeName, reportTitle, assets: [{...}], preparedBy }
 * @query   download=1 to force download, otherwise inline display
 */
router.post('/list', generateAssetsListPDF);

/**
 * @route   GET /api/assets/pdf/list
 * @desc    Generate PDF for assets list (sample data)
 * @access  Public
 * @query   download=1 to force download, otherwise inline display
 */
router.get('/list', generateAssetsListPDF);

/**
 * @route   POST /api/assets/pdf/single
 * @desc    Generate PDF for a single asset from provided data
 * @access  Public
 * @body    { storeName, assetCode, name, category, status, ... }
 * @query   download=1 to force download, otherwise inline display
 */
router.post('/single', generateSingleAssetPDF);

/**
 * @route   GET /api/assets/pdf/single
 * @desc    Generate PDF for a single asset (sample data)
 * @access  Public
 * @query   download=1 to force download, otherwise inline display
 */
router.get('/single', generateSingleAssetPDF);

/**
 * @route   POST /api/assets/pdf/custom
 * @desc    Generate custom PDF with filtered assets
 * @access  Private
 * @body    { status, category, dateFrom, dateTo, sortBy, sortOrder }
 */
router.post('/custom', async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const path = require('path');
    const dayjs = require('dayjs');
    const Asset = require('../models/Account/Asset');

    // Build query from request body
    const query = {};
    const { status, category, dateFrom, dateTo, sortBy = 'purchaseDate', sortOrder = 'desc' } = req.body;

    if (status && status !== 'all') {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (dateFrom || dateTo) {
      query.purchaseDate = {};
      if (dateFrom) query.purchaseDate.$gte = new Date(dateFrom);
      if (dateTo) query.purchaseDate.$lte = new Date(dateTo);
    }

    // Fetch filtered assets
    const assets = await Asset.find(query)
      .populate('category')
      .sort(`${sortOrder === 'desc' ? '-' : ''}${sortBy}`);

    // Use the same PDF generation logic as generateAssetsListPDF
    // but with filtered data
    const doc = new PDFDocument({
      size: 'A4',
      margin: 36,
      layout: 'landscape'
    });

    // Register Thai fonts
    try {
      const th = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansThai-Regular.ttf');
      const thb = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansThai-Bold.ttf');
      doc.registerFont('thai', th);
      doc.registerFont('thaib', thb);
      doc._thai = 'thai';
      doc._thaiBold = 'thaib';
      doc.font('thai');
    } catch (e) {
      doc._thai = null;
      doc._thaiBold = null;
      doc.font('Helvetica');
    }

    res.setHeader('Content-Type', 'application/pdf');
    const filename = `assets-custom-${dayjs().format('YYYYMMDD-HHmmss')}.pdf`;
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;
    let x = doc.page.margins.left;
    let y = doc.page.margins.top;

    // Header
    doc.font(doc._thaiBold || 'Helvetica-Bold').fontSize(16).text('รายงานสินทรัพย์ (กำหนดเอง)', x, y, { align: 'center', width: contentWidth });
    y += 25;

    // Filter info
    doc.fontSize(9).font(doc._thai || 'Helvetica');
    let filterText = 'เงื่อนไข: ';
    if (status && status !== 'all') filterText += `สถานะ: ${status} `;
    if (category) filterText += `ประเภท: ${category} `;
    if (dateFrom) filterText += `ตั้งแต่: ${dayjs(dateFrom).format('DD/MM/YYYY')} `;
    if (dateTo) filterText += `ถึง: ${dayjs(dateTo).format('DD/MM/YYYY')} `;
    doc.text(filterText, x, y);
    y += 15;

    doc.text(`พิมพ์เมื่อ: ${dayjs().format('DD/MM/YYYY HH:mm')} น.`, x, y, { align: 'right', width: contentWidth });
    y += 20;

    // Continue with table generation...
    // (Similar to generateAssetsListPDF but with filtered data)

    // Table headers
    const colWidths = [30, 80, 120, 100, 70, 80, 80, 80, 80];
    const headH = 24;

    doc.fillColor('#f3f4f6').rect(x, y, contentWidth, headH).fill();
    doc.fillColor('#000000');

    // Draw borders
    let cx = x;
    colWidths.forEach(w => {
      doc.rect(cx, y, w, headH).stroke();
      cx += w;
    });

    const heads = ['ลำดับ', 'รหัสสินทรัพย์', 'ชื่อสินทรัพย์', 'ประเภท', 'สถานะ', 'วันที่ซื้อ', 'ราคาที่ซื้อ', 'ค่าเสื่อมสะสม', 'มูลค่าทางบัญชี'];
    cx = x;
    doc.fontSize(9).font(doc._thaiBold || 'Helvetica-Bold');
    heads.forEach((h, i) => {
      const align = i >= 5 ? 'right' : 'left';
      doc.text(h, cx + 4, y + 7, { width: colWidths[i] - 8, align });
      cx += colWidths[i];
    });

    // Table rows
    doc.font(doc._thai || 'Helvetica').fontSize(8);
    let rowY = y + headH;
    const rowH = 20;
    let totalPurchasePrice = 0;
    let totalDepreciation = 0;
    let totalBookValue = 0;

    assets.forEach((asset, index) => {
      // Check if we need a new page
      if (rowY + rowH > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        rowY = doc.page.margins.top;

        // Redraw headers on new page
        doc.fillColor('#f3f4f6').rect(x, rowY, contentWidth, headH).fill();
        doc.fillColor('#000000');

        cx = x;
        colWidths.forEach(w => {
          doc.rect(cx, rowY, w, headH).stroke();
          cx += w;
        });

        cx = x;
        doc.fontSize(9).font(doc._thaiBold || 'Helvetica-Bold');
        heads.forEach((h, i) => {
          const align = i >= 5 ? 'right' : 'left';
          doc.text(h, cx + 4, rowY + 7, { width: colWidths[i] - 8, align });
          cx += colWidths[i];
        });
        doc.font(doc._thai || 'Helvetica').fontSize(8);
        rowY += headH;
      }

      // Draw row
      cx = x;
      colWidths.forEach(w => {
        doc.rect(cx, rowY, w, rowH).stroke();
        cx += w;
      });

      cx = x;
      doc.text(String(index + 1), cx + 4, rowY + 6, { width: colWidths[0] - 8 });
      cx += colWidths[0];
      doc.text(asset.assetCode || '-', cx + 4, rowY + 6, { width: colWidths[1] - 8 });
      cx += colWidths[1];
      doc.text(asset.name || '-', cx + 4, rowY + 6, { width: colWidths[2] - 8 });
      cx += colWidths[2];
      doc.text(asset.category?.name || '-', cx + 4, rowY + 6, { width: colWidths[3] - 8 });
      cx += colWidths[3];

      // Status with color
      const statusColors = {
        'active': '#10b981',
        'inactive': '#6b7280',
        'disposed': '#ef4444',
        'sold': '#3b82f6'
      };
      const statusTexts = {
        'active': 'ใช้งานอยู่',
        'inactive': 'ไม่ใช้งาน',
        'disposed': 'จำหน่ายแล้ว',
        'sold': 'ขายแล้ว'
      };
      doc.fillColor(statusColors[asset.status] || '#6b7280');
      doc.text(statusTexts[asset.status] || asset.status, cx + 4, rowY + 6, { width: colWidths[4] - 8 });
      doc.fillColor('#000000');
      cx += colWidths[4];

      const formatDate = (date) => {
        if (!date) return '-';
        return dayjs(date).format('DD/MM/YYYY');
      };

      const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return '0.00';
        return Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      doc.text(formatDate(asset.purchaseDate), cx + 4, rowY + 6, { width: colWidths[5] - 8, align: 'right' });
      cx += colWidths[5];
      doc.text(formatCurrency(asset.totalPrice || asset.purchasePrice), cx + 4, rowY + 6, { width: colWidths[6] - 8, align: 'right' });
      cx += colWidths[6];
      doc.text(formatCurrency(asset.accumulatedDepreciation || 0), cx + 4, rowY + 6, { width: colWidths[7] - 8, align: 'right' });
      cx += colWidths[7];
      doc.text(formatCurrency(asset.bookValue || asset.totalPrice), cx + 4, rowY + 6, { width: colWidths[8] - 8, align: 'right' });

      // Sum totals
      totalPurchasePrice += Number(asset.totalPrice || asset.purchasePrice || 0);
      totalDepreciation += Number(asset.accumulatedDepreciation || 0);
      totalBookValue += Number(asset.bookValue || asset.totalPrice || 0);

      rowY += rowH;
    });

    // Total row
    doc.fillColor('#e0f2fe').rect(x, rowY, contentWidth, rowH).fill();
    doc.fillColor('#000000');
    cx = x;
    colWidths.forEach(w => {
      doc.rect(cx, rowY, w, rowH).stroke();
      cx += w;
    });

    doc.font(doc._thaiBold || 'Helvetica-Bold');
    doc.text('รวมทั้งหมด', x + 4, rowY + 6, { width: colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] - 8 });

    const formatCurrency = (amount) => {
      return Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    cx = x + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5];
    doc.text(formatCurrency(totalPurchasePrice), cx + 4, rowY + 6, { width: colWidths[6] - 8, align: 'right' });
    cx += colWidths[6];
    doc.text(formatCurrency(totalDepreciation), cx + 4, rowY + 6, { width: colWidths[7] - 8, align: 'right' });
    cx += colWidths[7];
    doc.text(formatCurrency(totalBookValue), cx + 4, rowY + 6, { width: colWidths[8] - 8, align: 'right' });

    // Summary
    y = rowY + rowH + 20;
    doc.fontSize(10);
    doc.text(`จำนวนสินทรัพย์ทั้งหมด: ${assets.length} รายการ`, x, y);

    doc.end();

  } catch (error) {
    console.error('Error generating custom assets PDF:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้าง PDF' });
  }
});

module.exports = router;