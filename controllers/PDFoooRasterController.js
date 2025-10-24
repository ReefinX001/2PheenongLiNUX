/************************************************************
 * PDFoooRasterController.js (แก้ให้ไม่พิมพ์ผ่าน USB โดยตรง)
 *  - สร้างภาพใบเสร็จ (Canvas) แล้วส่งกลับเป็น base64
 *  - ตัดโค้ด escpos.USB(...) ออก
 ************************************************************/
const path = require('path');
const fs = require('fs');
const { createCanvas, registerFont, loadImage } = require('canvas');

// โหลดฟอนต์ไทย (ปรับ path ให้ตรงกับโครงสร้างโปรเจกต์ของคุณ)
const fontPath = path.join(__dirname, '..', 'fonts', 'THSarabunNew.ttf');
registerFont(fontPath, { family: 'THSarabunNew' });

// หมายเหตุที่ต้องการให้จัดกึ่งกลาง
const NOTE_LINES = [
  'สินค้ามีประกันเครื่อง 1 ปี หากตรวจสอบสินค้าแล้ว',
  'พบว่าเกิดจากระบบซอฟแวร์ภายในเครื่อง',
  'ลูกค้ายินยอมจะรอทางศูนย์ดำเนินการเคลมสินค้า',
  'โดยระยะเวลาการเคลมสินค้าขึ้นอยู่กับศูนย์',
  'และหากเกิดความเสียหายจากการกระทำของลูกค้า',
  'เช่น ตก แตก โดนน้ำ เป็นต้น ถือว่าประกันสิ้นสุดทันที'
];

// เส้นคั่น
const SEPARATOR_LINE = '________________________________________';

/**
 * ฟังก์ชันแปลงสตริง/Date ให้เป็นสตริงวันที่แบบไทย (DD/MM/BBBB)
 */
function formatThaiDate(dateInput) {
  if (!dateInput) return '-';
  let dateObj;
  if (dateInput instanceof Date && !isNaN(dateInput)) {
    dateObj = dateInput;
  } else {
    dateObj = new Date(dateInput);
    if (isNaN(dateObj)) {
      const parts = String(dateInput).split('/');
      if (parts.length === 3) {
        let [d, m, y] = parts.map(x => parseInt(x, 10));
        if (y > 2400) y -= 543;
        dateObj = new Date(y, m - 1, d);
      }
    }
  }
  if (isNaN(dateObj)) return 'Invalid Date';
  return dateObj.toLocaleDateString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

class PDFoooRasterController {
  /**
   * สร้างภาพใบเสร็จ (Canvas) แล้วส่งกลับเป็น base64 + fileName
   */
  static async printReceipt(order) {
    try {
      // console.log(`🖨️ (Raster) สร้างภาพใบเสร็จสำหรับออเดอร์: ${order.order_number || order._id}`);
      // console.log('Order data received:', order); // เพิ่ม log เพื่อ debug

      // โหลดรูปภาพโลโก้และ QR
      const logoPath    = path.join(__dirname, '..', 'Logo', 'logo.png');
      const qrLeftPath  = path.join(__dirname, '..', 'Logo', 'qrLeft.png');
      const qrRightPath = path.join(__dirname, '..', 'Logo', 'qrRight.png');
      const [logo, qrLeft, qrRight] = await Promise.all([
        loadImage(logoPath),
        loadImage(qrLeftPath),
        loadImage(qrRightPath),
      ]);

      // แก้ไขบรรทัดนี้ - ใช้ order.invoiceNo หรือ order.order_number
      const invoiceNo = order.invoiceNo || order.order_number || '';
      // console.log('Invoice No to display:', invoiceNo); // เพิ่ม log

      const saleDate  = order.saleDate ? formatThaiDate(order.saleDate) : '-';
      const staffName = order.staffName || 'พนักงาน';

      // ใช้โครงสร้างข้อมูลที่ถูกต้อง
      const branch = order.branch || {};
      const company = order.company || {};

      const mainLines = [
        { align: 'center', text: company.name || 'บริษัท 2 พี่น้อง โมบาย จำกัด' },
        ...(branch.name ? [{ align: 'center', text: `สาขา: ${branch.name} รหัสสาขา ${branch.code || '-'}` }] : []),
        ...(branch.address ? [{ align: 'center', text: branch.address }] : []),
        { align: 'center', text: `เลขประจำตัวผู้เสียภาษีอากร ${branch.taxId || '0945566000616'}` },
        { align: 'center', text: `โทร: ${branch.tel || '09-2427-0769'}` },
        { align: 'center', text: SEPARATOR_LINE },
        { align: 'center', text: order.invoiceType === 'TAX_INVOICE' ? 'ใบกำกับภาษี/ใบเสร็จรับเงิน' : 'ใบเสร็จรับเงิน' },
        { align: 'center', text: SEPARATOR_LINE },
      ];

      // ปรับส่วนข้อมูลลูกค้า
      const customerInfoLines = [
        { align: 'left', text: `เลขที่ : ${invoiceNo}` },   // ← แสดงเลขที่ใบเสร็จที่นี่
        { align: 'left', text: `วันที่ขาย : ${saleDate}` },
        { align: 'left', text: `พนักงานขาย : ${staffName}` },
      ];
      if (order.customerType === 'individual' && order.customer) {
        const c = order.customer;
        const fullAddr = `ที่อยู่ : ${c.address?.houseNo||'-'} ม.${c.address?.moo||'-'} ต.${c.address?.subDistrict||'-'} ` +
                         `อ.${c.address?.district||'-'} จ.${c.address?.province||'-'} ${c.address?.zipcode||'-'}`;
        customerInfoLines.push(
          { align: 'left', text: `ลูกค้า : ${c.prefix||''} ${c.firstName||''} ${c.lastName||''}` },
          { align: 'left', text: `โทร : ${c.phone||'-'}` },
          { align: 'left', text: `เลขผู้เสียภาษี : ${c.taxId||'-'}` },
          { align: 'left', text: fullAddr }
        );
      } else if (order.customerType === 'corporate' && order.customer) {
        const c = order.customer;
        customerInfoLines.push(
          { align: 'left', text: `บริษัท : ${c.companyName||'-'}` },
          { align: 'left', text: `เลขทะเบียนนิติบุคคล : ${c.companyTaxId||'-'}` },
          { align: 'left', text: `ผู้ติดต่อ : ${c.contactPerson||'-'}` },
          { align: 'left', text: `โทร : ${c.corporatePhone||'-'}` },
          { align: 'left', text: `ที่อยู่ : ${c.companyAddress||'-'}` }
        );
      }
      customerInfoLines.push({ align: 'center', text: SEPARATOR_LINE });

      const colX = { name: 10, imei: 330, price: 460 };
      const tableHeaderLines = [
        { text: 'ชื่อสินค้า', x: colX.name },
        { text: 'IMEI',      x: colX.imei },
        { text: 'ราคาเต็ม',   x: colX.price },
      ];

      const itemsLines = (order.items||[]).map(item => {
        return [
          { text: item.name||'-', x: colX.name },
          { text: item.imei||'-', x: colX.imei },
          { text: (item.price||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}), x: colX.price }
        ];
      });

      const totalQty = (order.items||[]).reduce((sum,it)=>sum+(it.qty||0),0);
      const itemSummaryLine = `รายการ: ${(order.items||[]).length}   จำนวนชิ้น: ${totalQty}`;

      const subTotal   = order.subTotal || 0;
      const vatAmount  = order.vatAmount||0;
      const discount   = order.discount || 0;
      const totalAmount= order.total     || 0;

      // เตรียมสตริงล่วงหน้า เพื่อเรียกใช้ง่าย ๆ
      const subTotalStr    = subTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const vatAmountStr   = vatAmount .toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const discountStr    = discount .toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const totalAmountStr = totalAmount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

      // ถ้าเป็น TAX_INVOICE ให้แสดงบรรทัดภาษี
      const summaryLines = [
        { label: SEPARATOR_LINE,      value: '' },
        { label: 'รวมมูลค่าสินค้า',   value: subTotalStr    },
        // แทรกภาษีเฉพาะกรณี TAX_INVOICE
        ...(order.invoiceType === 'TAX_INVOICE'
          ? [{ label: 'ภาษีมูลค่าเพิ่ม', value: vatAmountStr }]
          : []
        ),
        { label: SEPARATOR_LINE,      value: '' },
        { label: 'ส่วนลด',            value: discountStr    },
        { label: 'รวมทั้งสิ้น',      value: totalAmountStr },
      ];

      const noteHeader    = { align:'center', text:'หมายเหตุ:' };
      const noteLines     = NOTE_LINES.map(t=>({align:'center',text:t}));
      const signatureDate = order.staffDate||order.saleDate;
      const signatureLines= [
        { align:'center', text:'________________________________' },
        { align:'center', text:`( ${staffName} )` },
        { align:'center', text:`วันที่: ${formatThaiDate(signatureDate)}` },
      ];

      // คำนวณขนาด canvas
      const width = 576;
      const mainFont  = 20, lineHeight=28;
      const noteFont  = 16, noteLineHeight=26;
      const logoW=logo.width, logoH=logo.height;
      const qrW=logoW, qrH=logoH;
      const marginTop=10, marginBelowLogo=20, marginBottom=30, qrBottomMargin=10;

      const height =
          marginTop +
          logoH + marginBelowLogo +
          mainLines.length*lineHeight +
          customerInfoLines.length*lineHeight +
          lineHeight + itemsLines.length*lineHeight +
          lineHeight + // summary separator
          summaryLines.length*lineHeight +
          noteLineHeight + noteLines.length*noteLineHeight +
          signatureLines.length*noteLineHeight +
          qrH + qrBottomMargin +
          marginBottom;

      const canvas = createCanvas(width, height);
      const ctx    = canvas.getContext('2d');

      // background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0,0,width,height);

      let y = marginTop;
      // draw logo
      const logoX = (width-logoW)/2;
      ctx.drawImage(logo, logoX, y, logoW, logoH);
      y += logoH + marginBelowLogo;

      // draw mainLines
      ctx.font = `${mainFont}px "THSarabunNew"`;
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'top';
      mainLines.forEach(line=>{
        const txt = line.text||'';
        let x = 10;
        if(line.align==='center'){
          const tw = ctx.measureText(txt).width;
          x = (width-tw)/2;
        }
        ctx.fillText(txt, x, y);
        y += lineHeight;
      });

      // draw customer info
      customerInfoLines.forEach(line=>{
        const txt = line.text||'';
        let x = 10;
        if(line.align==='center'){
          const tw = ctx.measureText(txt).width;
          x = (width-tw)/2;
        }
        ctx.fillText(txt, x, y);
        y += lineHeight;
      });

      // draw table header
      tableHeaderLines.forEach(h=>{
        ctx.fillText(h.text, h.x, y);
      });
      y += lineHeight;

      // draw items
      itemsLines.forEach(row=>{
        row.forEach((col,idx)=>{
          ctx.fillText(col.text, col.x, y);
        });
        y += lineHeight;
      });

      // separator + summary lines
      ctx.fillText(SEPARATOR_LINE, 10, y); y+=lineHeight;
      ctx.fillText(itemSummaryLine, 10, y); y+= lineHeight;

      summaryLines.forEach(({label,value})=>{
        if(label===SEPARATOR_LINE){
          ctx.fillText(label, 10, y);
        } else {
          ctx.fillText(label, 10, y);
          const vw = ctx.measureText(value).width;
          ctx.fillText(value, width - vw - 10, y);
        }
        y += lineHeight;
      });

      // note
      ctx.font = `${noteFont}px "THSarabunNew"`;
      ctx.fillText(noteHeader.text, 10, y); y += noteLineHeight;
      noteLines.forEach(n=>{
        const tw = ctx.measureText(n.text).width;
        const x = (width - tw)/2;
        ctx.fillText(n.text, x, y);
        y += noteLineHeight;
      });

      // signature
      signatureLines.forEach(sig=>{
        const tw = ctx.measureText(sig.text).width;
        const x = (width - tw)/2;
        ctx.fillText(sig.text, x, y);
        y += noteLineHeight;
      });

      // draw QR
      const qrY = height - qrH - qrBottomMargin;
      ctx.drawImage(qrLeft, 45, qrY, qrW, qrH);
      ctx.drawImage(qrRight, width-qrW-45, qrY, qrW, qrH);

      // สร้าง buffer, เขียนไฟล์, คืน base64+fileName
      const buffer   = canvas.toBuffer('image/png');
      const fileName = `receipt_${order.order_number||order._id}.png`;
      const outDir   = path.join(__dirname,'..','receipts');
      if(!fs.existsSync(outDir)) fs.mkdirSync(outDir,{recursive:true});
      const outPath  = path.join(outDir, fileName);
      fs.writeFileSync(outPath, buffer);

      // console.log(`สร้างไฟล์ภาพใบเสร็จ: ${outPath}`);

      const base64 = buffer.toString('base64');
      return { base64, fileName };

    } catch(err) {
      console.error('Error in PDFoooRasterController.printReceipt:', err);
      throw err;
    }
  }
}

module.exports = PDFoooRasterController;
