const path = require('path');
const PdfPrinter = require('pdfmake');
const BranchStockHistory = require('../models/POS/BranchStockHistory'); // ดึงข้อมูลจาก BranchStockHistory

// ข้อความหมายเหตุ (ตัวอย่าง: เงื่อนไขการเคลม)
const NOTE_LINES = [
  'สินค้ามีประกันเครื่อง 1 ปี หากตรวจสอบสินค้าแล้ว',
  'พบว่าเกิดจากระบบซอฟแวร์ภายในเครื่อง',
  'ลูกค้ายินยอมจะรอทางศูนย์เคลมสินค้า',
  'โดยระยะเวลาการเคลมสินค้าขึ้นอยู่กับศูนย์',
  'และหากเกิดความเสียหายจากการกระทำของลูกค้า',
  'เช่น ตก แตก โดนน้ำ เป็นต้น ถือว่าประกันสิ้นสุดทันที'
];

// เส้นคั่น
const SEPARATOR_LINE = '________________________________________';

/**
 * ฟังก์ชันแปลงวันที่ให้เป็นรูปแบบไทย (DD/MM/BBBB)
 */
function formatThaiDate(dateInput) {
  if (!dateInput) return '-';
  const dateObj = new Date(dateInput);
  if (!isNaN(dateObj)) {
    return dateObj.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  return '-';
}

// ตั้งค่าฟอนต์ pdfmake (ปรับ path ให้ตรงกับ fonts ของโปรเจกต์)
const fonts = {
  THSarabunNew: {
    normal: path.join(__dirname, '../fonts', 'THSarabunNew.ttf'),
    bold: path.join(__dirname, '../fonts', 'THSarabunNew Bold.ttf'),
    italics: path.join(__dirname, '../fonts', 'THSarabunNew Italic.ttf'),
    bolditalics: path.join(__dirname, '../fonts', 'THSarabunNew BoldItalic.ttf'),
  },
};

class PDFOutReceiptController {
  /**
   * GET /api/pdf/out-receipt?order_id=xxxx
   * สร้าง/แสดง PDF ใบเสร็จ (สินค้าออก) โดยอิงข้อมูลจาก BranchStockHistory
   */
  static async generateOutReceipt(req, res) {
    try {
      const { order_id } = req.query;
      if (!order_id) {
        return res.status(400).send('กรุณาระบุ order_id');
      }

      // 1) ค้นหาเอกสาร BranchStockHistory ที่มี order_id ตรงกับที่ส่งมา
      const doc = await BranchStockHistory.findOne({ order_id }).lean();
      if (!doc) {
        return res.status(404).send(`ไม่พบ BranchStockHistory ที่มี order_id=${order_id}`);
      }

      // 2) ดึงข้อมูลที่ต้องใช้ในการออกใบเสร็จ
      const {
        items = [],
        staff_name = 'พนักงาน',
        sale_date,
        discount = 0,       // สมมติระบบบันทึกส่วนลดไว้
        vat_amount = 0,     // สมมติระบบบันทึก VAT ไว้
        total_amount = 0,   // ถ้าระบบบันทึก total ไว้
        net_amount = 0,
        sub_total = 0,      // ถ้าระบบบันทึก sub_total ไว้
        invoice_no = 'RV-XXXX0001',
        customer_info = {},
      } = doc;

      // (2.1) แปลงวันที่ขาย
      const saleDateFormatted = formatThaiDate(sale_date);

      // (2.2) เตรียมตารางสินค้า (6 คอลัมน์: ชื่อ, รุ่น, สี, ความจุ, IMEI, ราคา)
      const itemTableBody = [];
      itemTableBody.push([
        { text: 'ชื่อสินค้า', alignment: 'center', style: 'tableHeader' },
        { text: 'รุ่น',      alignment: 'center', style: 'tableHeader' },
        { text: 'สี',        alignment: 'center', style: 'tableHeader' },
        { text: 'ความจุ',    alignment: 'center', style: 'tableHeader' },
        { text: 'IMEI',      alignment: 'center', style: 'tableHeader' },
        { text: 'ราคา',      alignment: 'center', style: 'tableHeader' },
      ]);

      // ตัวอย่าง: คำนวณ Subtotal ใหม่จากรายการสินค้า
      let computedSubTotal = 0;
      items.forEach((it) => {
        const priceVal = parseFloat(it.price) || 0;
        computedSubTotal += priceVal; // ถ้ามี qty ให้คูณเพิ่ม

        itemTableBody.push([
          { text: it.name     || '-', alignment: 'left' },
          { text: it.model    || '-', alignment: 'left' },
          { text: it.color    || '-', alignment: 'left' },
          { text: it.capacity || '-', alignment: 'left' },
          { text: it.imei     || '-', alignment: 'left' },
          {
            text: priceVal.toLocaleString('en-US', { minimumFractionDigits: 2 }),
            alignment: 'right',
          },
        ]);
      });

      // (2.3) สรุปยอด
      // - ใช้ค่าที่ระบบบันทึกไว้อย่าง discount, vat_amount
      // - แต่คำนวณ subtotal ใหม่จากรายการ (computedSubTotal)
      // - net_amount และ total_amount จะถูกคำนวณใหม่ (หรือใช้ค่าจาก doc ก็ได้)
      const discountVal = parseFloat(discount) || 0;
      const netVal = computedSubTotal - discountVal; // มูลค่าหลังหักส่วนลด
      const vatVal = parseFloat(vat_amount) || 0;    // ถ้าระบบคำนวณ vat เก็บไว้แล้ว
      const totalVal = netVal + vatVal;              // ยอดสุทธิ (net + vat)

      // สร้าง summaryLines ใหม่ (กรณีอยากแสดงลำดับการคำนวณชัดเจน)
      const summaryLines = [
        { label: 'รวมมูลค่าสินค้า', value: computedSubTotal.toLocaleString() },
        { label: 'ส่วนลด',          value: discountVal.toLocaleString() },
        { label: 'สุทธิ',           value: netVal.toLocaleString() },
        { label: 'ภาษีมูลค่าเพิ่ม', value: vatVal.toLocaleString() },
        { label: 'รวมทั้งสิ้น',     value: totalVal.toLocaleString() },
      ];

      // (2.4) ข้อมูลลูกค้า
      const addr = customer_info.address || {};
      const fullAddr = `ที่อยู่ : ${addr.houseNo || '-'} ม.${addr.moo || '-'} `
        + `ต.${addr.subDistrict || '-'} อ.${addr.district || '-'} `
        + `จ.${addr.province || '-'} ${addr.zipcode || '-'}`;

      // สร้าง lines สำหรับส่วนข้อมูลลูกค้า
      const customerLines = [
        `เลขที่ : ${invoice_no}`,
        `วันที่ขาย : ${saleDateFormatted}`,
        `พนักงานขาย : ${staff_name}`,
        `ลูกค้า : ${customer_info.prefix || ''} ${customer_info.firstName || ''} ${customer_info.lastName || ''}`,
        `โทร : ${customer_info.phone || '-'}`,
        `เลขผู้เสียภาษี : ${customer_info.taxId || '-'}`,
        fullAddr,
      ];

      // 3) สร้าง docDefinition สำหรับ pdfmake
      const printer = new PdfPrinter(fonts);
      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 60],
        defaultStyle: {
          font: 'THSarabunNew',
          fontSize: 14,
        },
        content: [
          // ส่วนหัวบริษัท
          {
            stack: [
              'บริษัท 2 พี่น้อง โมบาย จำกัด',
              '148/91 หมู่ที่ 6 ต.รูสะมิแล อ.เมือง จ.ปัตตานี 94000 (สาขาใหญ่)',
              'เลขประจำตัวผู้เสียภาษี 0945566000616 (VAT INCLUDED)',
              'โทร: 09-2427-0769',
            ].map((l) => ({ text: l, alignment: 'center' })),
            margin: [0, 0, 0, 10],
          },
          { text: SEPARATOR_LINE, alignment: 'center' },
          {
            text: 'ใบเสร็จรับเงิน/ใบกำกับภาษี (สินค้าออก)',
            style: 'title',
            alignment: 'center',
          },
          { text: SEPARATOR_LINE, alignment: 'center', margin: [0, 5, 0, 10] },

          // ข้อมูลลูกค้า
          {
            stack: customerLines.map((line) => ({ text: line })),
            margin: [0, 0, 0, 10],
          },

          // ตารางสินค้า
          {
            table: {
              headerRows: 1,
              widths: ['*', '*', '*', '*', '*', 'auto'], // 6 คอลัมน์
              body: itemTableBody,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 10],
          },

          // สรุปยอด
          {
            table: {
              widths: ['*', 'auto'],
              body: [
                [
                  {
                    text: 'สรุปยอด',
                    colSpan: 2,
                    alignment: 'center',
                    style: 'tableHeader',
                  },
                  {},
                ],
                ...summaryLines.map((sl) => [
                  { text: sl.label, alignment: 'left' },
                  { text: sl.value, alignment: 'right' },
                ]),
              ],
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 10],
          },

          // หมายเหตุ
          {
            text: 'หมายเหตุ:',
            style: 'subTitle',
            alignment: 'center',
            margin: [0, 0, 0, 5],
          },
          {
            stack: NOTE_LINES.map((n) => ({ text: n, alignment: 'center' })),
            margin: [0, 0, 0, 10],
          },

          // ลายเซ็น
          {
            stack: [
              SEPARATOR_LINE,
              `( ${staff_name} )`,
              `วันที่: ${formatThaiDate(new Date())}`,
            ].map((line) => ({ text: line, alignment: 'center' })),
            margin: [0, 10, 0, 0],
          },
        ],
        styles: {
          title: { fontSize: 18, bold: true },
          subTitle: { fontSize: 16, bold: true },
          tableHeader: { bold: true, fontSize: 14, color: 'black' },
        },
      };

      // 4) สร้าง PDF แล้วส่งกลับ (inline)
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="out-receipt.pdf"');
      pdfDoc.pipe(res);
      pdfDoc.end();

    } catch (err) {
      console.error("Error generating 'สินค้าออก' PDF:", err);
      return res.status(500).send('Error generating PDF');
    }
  }
}

module.exports = PDFOutReceiptController;
