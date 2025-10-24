// File: controllers/PDFStockController.js
const PdfPrinter = require('pdfmake');
const path = require('path');

// 1) กำหนดฟอนต์ที่ใช้ใน PDF (ตรวจสอบ path ของไฟล์ฟอนต์ให้ถูกต้อง)
const fonts = {
  THSarabunNew: {
    normal: path.join(__dirname, '../fonts', 'THSarabunNew.ttf'),
    bold: path.join(__dirname, '../fonts', 'THSarabunNew Bold.ttf'),
    italics: path.join(__dirname, '../fonts', 'THSarabunNew Italic.ttf'),
    bolditalics: path.join(__dirname, '../fonts', 'THSarabunNew BoldItalic.ttf'),
  },
};

class PDFStockController {
  /**
   * (1) generateStockInPdf
   * สร้าง PDF สำหรับสินค้าเข้า (Stock IN)
   * รับ req.body.inRecords: array ของข้อมูลรายการสินค้าเข้า
   */
  static async generateStockInPdf(req, res) {
    try {
      const printer = new PdfPrinter(fonts);

      // อ่านข้อมูล inRecords จาก body
      const data = req.body || {};
      const inRecords = Array.isArray(data.inRecords) ? data.inRecords : [];

      if (inRecords.length === 0) {
        throw new Error('ไม่มีข้อมูลสินค้าเข้า');
      }

      // สร้างตาราง (tableBody) สำหรับสินค้าเข้า
      let tableBody = [];
      tableBody.push([
        { text: 'วันที่ทำรายการ', style: 'tableHeader', alignment: 'center' },
        { text: 'สาขา',           style: 'tableHeader', alignment: 'center' },
        { text: 'สินค้า',         style: 'tableHeader', alignment: 'center' },
        { text: 'จำนวน',          style: 'tableHeader', alignment: 'center' },
        { text: 'สต๊อกคงเหลือ',   style: 'tableHeader', alignment: 'center' },
        { text: 'เหตุผล/หมายเหตุ', style: 'tableHeader', alignment: 'center' },
        { text: 'ผู้สแกน',        style: 'tableHeader', alignment: 'center' },
        { text: 'ผู้ตรวจสอบ',     style: 'tableHeader', alignment: 'center' }
      ]);

      // เติมข้อมูลในตาราง
      inRecords.forEach(record => {
        const dateStr = new Date(record.performed_at).toLocaleString('th-TH');
        tableBody.push([
          { text: dateStr, alignment: 'center' },
          { text: record.branch_name || '-', alignment: 'center' },
          { text: record.product_name || '-', alignment: 'center' },
          { text: record.quantity?.toString() || '0', alignment: 'right' },
          { text: record.stock_value?.toString() || '0', alignment: 'right' },
          { text: record.reason || '-', alignment: 'left' },
          { text: record.scanned_by || '-', alignment: 'center' },
          { text: record.verified_by || '-', alignment: 'center' }
        ]);
      });

      // docDefinition สำหรับ pdfmake
      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        defaultStyle: {
          font: 'THSarabunNew',
          fontSize: 14
        },
        content: [
          { text: 'รายงานสินค้าเข้า', style: 'header', alignment: 'center' },
          { text: '\n' },
          {
            table: {
              headerRows: 1,
              widths: ['auto', 'auto', '*', 'auto', 'auto', '*', 'auto', 'auto'],
              body: tableBody
            },
            layout: 'lightHorizontalLines'
          }
        ],
        styles: {
          header: { fontSize: 18, bold: true },
          tableHeader: { bold: true, fontSize: 14, color: 'black' }
        }
      };

      // สร้าง PDF และส่งกลับ
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="stock-in.pdf"');
      pdfDoc.pipe(res);
      pdfDoc.end();

    } catch (error) {
      console.error('Error generating stock in PDF:', error);
      res.status(500).send('Error generating PDF');
    }
  }

  /**
   * (2) generatePdfFromHistory
   * สร้าง PDF สำหรับประวัติสินค้าเข้า/ออก
   * รับ req.body.inRecords และ req.body.outRecords
   */
  static async generatePdfFromHistory(req, res) {
    try {
      const printer = new PdfPrinter(fonts);
      const data = req.body || {};

      // อ่าน inRecords/outRecords
      const inRecords = Array.isArray(data.inRecords) ? data.inRecords : [];
      const outRecords = Array.isArray(data.outRecords) ? data.outRecords : [];

      if (inRecords.length === 0 && outRecords.length === 0) {
        throw new Error('ไม่มีข้อมูลสินค้าเข้า/ออก');
      }

      // สร้างตารางสินค้าเข้า
      let inTableBody = [];
      inTableBody.push([
        { text: 'วันที่ทำรายการ', style: 'tableHeader', alignment: 'center' },
        { text: 'สาขา',           style: 'tableHeader', alignment: 'center' },
        { text: 'สินค้า',         style: 'tableHeader', alignment: 'center' },
        { text: 'จำนวน',          style: 'tableHeader', alignment: 'center' },
        { text: 'สต๊อกคงเหลือ',   style: 'tableHeader', alignment: 'center' },
        { text: 'เหตุผล/หมายเหตุ', style: 'tableHeader', alignment: 'center' },
      ]);
      inRecords.forEach(record => {
        const dateStr = new Date(record.performed_at).toLocaleString('th-TH');
        inTableBody.push([
          { text: dateStr, alignment: 'center' },
          { text: record.branch_name || '-', alignment: 'center' },
          { text: record.product_name || '-', alignment: 'center' },
          { text: record.quantity?.toString() || '0', alignment: 'right' },
          { text: record.stock_value?.toString() || '0', alignment: 'right' },
          { text: record.reason || '-', alignment: 'left' }
        ]);
      });

      // สร้างตารางสินค้าออก
      let outTableBody = [];
      outTableBody.push([
        { text: 'วันที่ทำรายการ', style: 'tableHeader', alignment: 'center' },
        { text: 'สาขา',           style: 'tableHeader', alignment: 'center' },
        { text: 'สินค้า',         style: 'tableHeader', alignment: 'center' },
        { text: 'จำนวน',          style: 'tableHeader', alignment: 'center' },
        { text: 'สต๊อกคงเหลือ',   style: 'tableHeader', alignment: 'center' },
        { text: 'เหตุผล/หมายเหตุ', style: 'tableHeader', alignment: 'center' },
        { text: 'ลูกค้า',         style: 'tableHeader', alignment: 'center' },
      ]);
      outRecords.forEach(record => {
        const dateStr = new Date(record.performed_at).toLocaleString('th-TH');
        outTableBody.push([
          { text: dateStr, alignment: 'center' },
          { text: record.branch_name || '-', alignment: 'center' },
          { text: record.product_name || '-', alignment: 'center' },
          { text: record.quantity?.toString() || '0', alignment: 'right' },
          { text: record.stock_value?.toString() || '0', alignment: 'right' },
          { text: record.reason || '-', alignment: 'left' },
          { text: record.customer || '-', alignment: 'center' }
        ]);
      });

      // สร้าง docDefinition
      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        defaultStyle: {
          font: 'THSarabunNew',
          fontSize: 14
        },
        content: [
          { text: 'รายงานประวัติสินค้าเข้า/ออก', style: 'header', alignment: 'center' },
          { text: '\n' },
          { text: 'สินค้าเข้า', style: 'subheader', margin: [0, 0, 0, 5] },
          {
            table: {
              headerRows: 1,
              widths: ['auto', 'auto', '*', 'auto', 'auto', '*'],
              body: inTableBody
            },
            layout: 'lightHorizontalLines'
          },
          { text: '\n' },
          { text: 'สินค้าออก', style: 'subheader', margin: [0, 0, 0, 5] },
          {
            table: {
              headerRows: 1,
              widths: ['auto', 'auto', '*', 'auto', 'auto', '*', 'auto'],
              body: outTableBody
            },
            layout: 'lightHorizontalLines'
          }
        ],
        styles: {
          header: { fontSize: 18, bold: true },
          subheader: { fontSize: 16, bold: true },
          tableHeader: { bold: true, fontSize: 14, color: 'black' }
        }
      };

      // สร้าง PDF และส่งกลับ
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="stock-history.pdf"');
      pdfDoc.pipe(res);
      pdfDoc.end();

    } catch (error) {
      console.error('Error generating PDF from history:', error);
      res.status(500).send('Error generating PDF');
    }
  }
}

// ต้อง export class นี้ ให้ไฟล์ routes สามารถเรียกได้
module.exports = PDFStockController;
