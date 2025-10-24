// controllers/PDFController.js

const PdfPrinter = require('pdfmake');
const path = require('path');
const axios = require('axios');

// 1) กำหนด fonts สำหรับ pdfmake
//    ตรวจสอบว่ามีไฟล์ THSarabunNew.ttf ฯลฯ อยู่ใน my-accounting-app/fonts
//    และชื่อไฟล์ต้องตรงกัน
const fonts = {
  THSarabunNew: {
    normal: path.join(__dirname, '../fonts', 'THSarabunNew.ttf'),
    bold: path.join(__dirname, '../fonts', 'THSarabunNew Bold.ttf'),
    italics: path.join(__dirname, '../fonts', 'THSarabunNew Italic.ttf'),
    bolditalics: path.join(__dirname, '../fonts', 'THSarabunNew BoldItalic.ttf'),
  },
};

class PDFController {
  /**
   * ฟังก์ชันสร้าง PDF และส่งกลับ client
   */
  static async generatePdf(req, res) {
    try {
      const printer = new PdfPrinter(fonts);

      // 2) สร้าง docDefinition ตาม pdfmake
      //    ตัวอย่างสลิป 80mm x 200mm
      const docDefinition = {
        pageSize: { width: 80, height: 200 }, // 80mm x 200mm
        pageMargins: [5, 5, 5, 5],
        defaultStyle: {
          font: 'THSarabunNew',
          fontSize: 14,
        },
        content: [
          {
            alignment: 'center',
            image: await PDFController.getBase64ImageFromUrl(
              'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRcgikN4EAfvCspfB102uyLisotDGU-UJk29w&s'
            ),
            width: 45,
          },
          { text: 'ร้าน 2 พี่น้อง โมบาย', alignment: 'center' },
          { text: '148/91 ต.รูสะมิแล อ.เมือง จ.ปัตตานี 94000', alignment: 'center' },
          { text: 'TAX:1234567890000 (VAT Included)', alignment: 'center' },
          { text: 'เบอร์โทร : 022374777', alignment: 'center' },
          { text: '-------------------------------------------------------------------------------------', alignment: 'center' },
          {
            text: `ใบเสร็จรับเงิน/ใบกำกับภาษีอย่างย่อ\nCA${new Date().getTime()}`,
          },
          '-------------------------------------------------------------------------------------',
          `พนักงานขาย : วินัย ใจดี\nวันที่ : ${new Date().toLocaleString()}`,
          '-------------------------------------------------------------------------------------',
          {
            table: {
              widths: ['*', 40, 40],
              body: [
                [
                  { text: 'สินค้า', bold: true },
                  { text: 'จำนวน', bold: true },
                  { text: 'ราคา', bold: true, alignment: 'right' },
                ],
                ['สินค้า A', '1', { text: '50.00', alignment: 'right' }],
                ['สินค้า B', '1', { text: '30.00', alignment: 'right' }],
                [
                  {
                    text: '-------------------------------------------------------------------------------------',
                    colSpan: 3,
                    alignment: 'center',
                  },
                  '',
                  '',
                ],
                ['ยอดสุทธิ', '2', ''],
                ['', 'รวมเป็นเงิน', { text: '80.00', alignment: 'right' }],
                ['', 'ส่วนลด', { text: '0.00', alignment: 'right' }],
                ['', 'Vat7%', { text: '5.60', alignment: 'right' }],
                [
                  '',
                  { text: 'รวมทั้งสิ้น', bold: true },
                  { text: '85.60', alignment: 'right', bold: true },
                ],
              ],
            },
            layout: 'noBorders',
          },
          '-------------------------------------------------------------------------------------',
          { text: 'หมายเหตุท้ายบิล....', alignment: 'right' },
          { text: 'ขอบคุณที่ใช้บริการ', alignment: 'right' },
        ],
      };

      // 3) สร้าง PDF document
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      // ตั้งค่า Header เพื่อตอบกลับเป็น PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="receipt.pdf"');

      // สตรีม PDF กลับ Browser
      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error) {
      console.error('Error generating PDF:', error);
      return res.status(500).send('Error generating PDF');
    }
  }

  /**
   * ดึงรูปจาก URL แล้วแปลงเป็น Base64 (pdfmake ไม่รองรับ URL ตรง ๆ)
   */
  static async getBase64ImageFromUrl(imageUrl) {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return 'data:image/png;base64,' + base64;
  }
}

module.exports = PDFController;
