// controllers/PDFooController.js
const PdfPrinter = require('pdfmake');
const path = require('path');
const axios = require('axios');

// กำหนด fonts สำหรับ pdfmake
const fonts = {
  THSarabunNew: {
    normal: path.join(__dirname, '../fonts', 'THSarabunNew.ttf'),
    bold: path.join(__dirname, '../fonts', 'THSarabunNew Bold.ttf'),
    italics: path.join(__dirname, '../fonts', 'THSarabunNew Italic.ttf'),
    bolditalics: path.join(__dirname, '../fonts', 'THSarabunNew BoldItalic.ttf'),
  },
};

// ฟังก์ชันแปลงตัวเลขเป็นข้อความภาษาไทย
function convertNumberToThaiText(number) {
  const numberStr = number.toFixed(2);
  const [integerPart, decimalPart] = numberStr.split('.');
  const txtNumArr = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const txtDigitArr = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  let bahtText = '';

  const intLen = integerPart.length;
  for (let i = 0; i < intLen; i++) {
    const n = parseInt(integerPart.charAt(i));
    if (n !== 0) {
      if (i === intLen - 1 && n === 1 && intLen > 1) {
        bahtText += 'เอ็ด';
      } else if (i === intLen - 2 && n === 2) {
        bahtText += 'ยี่';
      } else if (i === intLen - 2 && n === 1) {
        bahtText += '';
      } else {
        bahtText += txtNumArr[n];
      }
      bahtText += txtDigitArr[intLen - i - 1];
    }
  }
  bahtText += 'บาท';

  if (decimalPart === '00') {
    bahtText += 'ถ้วน';
  } else {
    const decLen = decimalPart.length;
    for (let i = 0; i < decLen; i++) {
      const n = parseInt(decimalPart.charAt(i));
      if (n !== 0) {
        if (i === decLen - 1 && n === 1 && decLen > 1) {
          bahtText += 'เอ็ด';
        } else if (i === decLen - 2 && n === 2) {
          bahtText += 'ยี่';
        } else if (i === decLen - 2 && n === 1) {
          bahtText += '';
        } else {
          bahtText += txtNumArr[n];
        }
        bahtText += txtDigitArr[decLen - i - 1];
      }
    }
    bahtText += 'สตางค์';
  }

  return bahtText;
}

class PDFooController {
  /**
   * สร้างใบรับเงินมัดจำ (Deposit Receipt) เป็น PDF แล้วส่งกลับให้ client
   * URL ตัวอย่าง: POST /api/deposit-receipt/pdf
   */
  static async generatePdf(req, res) {
    try {
      const printer = new PdfPrinter(fonts);
      const data = req.body || {};

      // กำหนดข้อมูลจาก payload - ใช้ข้อมูลจริงจากระบบ
      const receiptNumber = data.receipt_number ||
        `DR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      // ✅ ใช้ข้อมูลจริงจากระบบ - ไม่ใช้ข้อมูลทดสอบ
      const customerName = data.customer_name ||
                          data.customerName ||
                          data.displayName ||
                          `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
                          'ไม่ระบุชื่อลูกค้า';

      const taxNumber = data.customer_tax_number ||
                       data.idCard ||
                       data.customerIdCard ||
                       'ไม่ระบุ';

      const address = data.customer_address ||
                     data.address ||
                     data.fullAddress ||
                     'ไม่ระบุที่อยู่';

      const receiptDate = data.receipt_date || new Date().toISOString().slice(0, 10);

      const tel = data.tel ||
                 data.phone ||
                 data.customerPhone ||
                 'ไม่ระบุ';

      const salesPerson = data.sales_person ||
                         data.employeeName ||
                         data.salesperson ||
                         'พนักงานขาย';

      const email = data.email ||
                   data.customerEmail ||
                   'ไม่ระบุ';

      const paymentMethod = data.payment_method || 'เงินสด';

      // คำนวณยอดรับเงินมัดจำโดยอิงจาก deposit_items (ถ้ามี)
      let depositAmount = 0;
      if (data.deposit_items && Array.isArray(data.deposit_items)) {
        depositAmount = data.deposit_items.reduce((sum, item) => {
          return sum + (parseFloat(item.deposit_amount) || 0);
        }, 0);
      }

      let amountInWords = data.amountInWords;
      if (!amountInWords) {
        amountInWords = convertNumberToThaiText(depositAmount);
      }

      // สร้างตารางสำหรับรายการสินค้ามัดจำ
      let depositItemsTable = [];
      depositItemsTable.push([
        { text: 'สินค้า/บริการ', style: 'tableHeader', alignment: 'center' },
        { text: 'จำนวน (ชิ้น)', style: 'tableHeader', alignment: 'center' },
        { text: 'จำนวนเงิน (บาท)', style: 'tableHeader', alignment: 'center' }
      ]);

      if (data.deposit_items && Array.isArray(data.deposit_items)) {
        data.deposit_items.forEach(item => {
          const itemName = item.item_name || '';
          const quantity = item.quantity || 0;
          const itemAmount = parseFloat(item.deposit_amount) || 0;
          depositItemsTable.push([
            { text: itemName, alignment: 'left' },
            { text: quantity.toString(), alignment: 'center' },
            { text: itemAmount.toFixed(2) + ' บาท', alignment: 'right' }
          ]);
        });
      }

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        defaultStyle: {
          font: 'THSarabunNew',
          fontSize: 14,
        },
        content: [
          // Header: Company Information
          { text: 'บริษัท 2 พี่น้อง โมบาย จำกัด', style: 'header' },
          { text: '148/91 ต.รูสะมิแล, อ.เมือง, จ.ปัตตานี 94000', style: 'subheader' },
          { text: 'เลขที่ผู้เสียภาษี: 1234567890123', style: 'subheader', margin: [0, 0, 0, 10] },
          { text: '\n' },
          // Title: Deposit Receipt
          { text: 'ใบรับเงินมัดจำ (Deposit Receipt)', style: 'title', alignment: 'center' },
          { text: `เลขที่: ${receiptNumber}`, alignment: 'center', margin: [0, 5, 0, 15] },
          // ข้อมูลลูกค้าและพนักงาน (แบ่งเป็นสองคอลัมน์)
          {
            columns: [
              {
                width: '50%',
                stack: [
                  { text: `ชื่อลูกค้า: ${customerName}` },
                  { text: `เลขที่ผู้เสียภาษี: ${taxNumber}` },
                  { text: `ที่อยู่: ${address}` },
                  { text: `เบอร์โทร: ${tel}` }
                ]
              },
              {
                width: '50%',
                stack: [
                  { text: `วันที่ออกใบรับเงิน: ${receiptDate}`, alignment: 'right' },
                  { text: `ชื่อพนักงาน: ${salesPerson}`, alignment: 'right' },
                  { text: `อีเมล์: ${email}`, alignment: 'right' },
                  { text: `ประเภทการรับชำระ: ${paymentMethod}`, alignment: 'right' }
                ]
              }
            ]
          },
          { text: '\n' },
          // แสดงรายการสินค้ามัดจำ (ถ้ามี)
          (data.deposit_items && Array.isArray(data.deposit_items) && data.deposit_items.length > 0) ? {
            text: 'รายการสินค้ามัดจำ',
            style: 'sectionTitle'
          } : {},
          (data.deposit_items && Array.isArray(data.deposit_items) && data.deposit_items.length > 0) ? {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto'],
              body: depositItemsTable
            },
            layout: 'lightHorizontalLines'
          } : {},
          { text: '\n' },
          // สรุปยอด: แสดงยอดรับเงินมัดจำทั้งในรูปแบบตัวเลขและตัวอักษร
          {
            columns: [
              { text: `จำนวนเงิน (ตัวอักษร): ${amountInWords}`, width: '*' },
              {
                width: 'auto',
                table: {
                  body: [
                    [{ text: 'ยอดรับเงินมัดจำ', bold: true }, { text: depositAmount.toFixed(2) + ' บาท', alignment: 'right' }]
                  ]
                },
                layout: 'noBorders'
              }
            ]
          },
          { text: '\n' },
          // ส่วนลายเซ็น
          {
            table: {
              widths: ['*', '*'],
              body: [
                [
                  { text: '_________________________\nผู้รับเงินมัดจำ\nวันที่: __________', alignment: 'center' },
                  { text: '_________________________\nผู้มีอำนาจลงนาม\nวันที่: __________', alignment: 'center' }
                ]
              ]
            },
            layout: 'noBorders',
            margin: [0, 20, 0, 0]
          }
        ],
        styles: {
          header: { fontSize: 16, bold: true, alignment: 'center' },
          subheader: { fontSize: 12, alignment: 'center' },
          title: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
          tableHeader: { bold: true, fontSize: 14, color: 'black' },
          sectionTitle: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] }
        }
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="deposit_receipt.pdf"');
      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error) {
      console.error('Error generating PDF:', error);
      return res.status(500).send('Error generating PDF');
    }
  }

  // ฟังก์ชันดึงรูปจาก URL แล้วแปลงเป็น Base64 (ถ้าจำเป็น)
  static async getBase64ImageFromUrl(imageUrl) {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return 'data:image/png;base64,' + base64;
  }
}

module.exports = PDFooController;
