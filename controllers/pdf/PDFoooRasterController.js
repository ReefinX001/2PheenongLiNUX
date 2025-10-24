/************************************************************
 * PDFoooRasterController.js (แก้ให้ไม่พิมพ์ผ่าน USB โดยตรง)
 *  - สร้างภาพใบเสร็จ (Canvas) แล้วส่งกลับเป็น base64
 *  - ตัดโค้ด escpos.USB(...) ออก
 ************************************************************/
const path = require('path');
const fs = require('fs');
const { createCanvas, registerFont, loadImage } = require('canvas');

// โหลดฟอนต์ไทย (ปรับ path ให้ตรงกับโครงสร้างโปรเจกต์ของคุณ)
const fontPath = path.join(__dirname, '..', '..', 'fonts', 'THSarabunNew.ttf');
// ตรวจสอบ font ก่อน register
if (fs.existsSync(fontPath)) {
  registerFont(fontPath, { family: 'TH Sarabun New' });
  console.log('✅ Font loaded successfully:', fontPath);
} else {
  console.warn('⚠️ Font not found:', fontPath);
  console.warn('   Available directories:');
  try {
    const baseDir = path.join(__dirname, '..', '..');
    const dirs = fs.readdirSync(baseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    console.warn('   ', dirs);
  } catch (e) {
    console.warn('   Could not list directories');
  }
}

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

// ===== เพิ่ม helper functions =====
function coalesce(...vals) {
  for (const v of vals) { if (v !== undefined && v !== null && `${v}`.trim() !== '') return v; }
  return undefined;
}

function buildAddressFromAny(cus) {
  // รองรับทั้งแบบ string เดียว และแบบแยกฟิลด์
  if (!cus) return '-';
  if (typeof cus.address === 'string' && cus.address.trim()) return cus.address.trim();
  const a = cus.address || {};
  const parts = [
    coalesce(a.houseNo, a.no),
    a.moo ? `หมู่ ${a.moo}` : undefined,
    a.subDistrict ? `ต.${a.subDistrict}` : undefined,
    a.district ? `อ.${a.district}` : undefined,
    a.province ? `จ.${a.province}` : undefined,
    a.zipcode || a.postcode
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : '-';
}

function pickSaleDate(order) {
  // รองรับ issueDate/saleDate/createdAt
  return coalesce(order.saleDate, order.issueDate, order.createdAt, order.paymentDate);
}

function pickDocNumber(order, documentType) {
  // ใช้เลขจากฐานข้อมูลก่อนเสมอ
  if (documentType === 'TAX_INVOICE') return coalesce(order.taxInvoiceNumber, order.invoiceNumber);
  return coalesce(order.receiptNumber, order.invoiceNumber);
}

class PDFoooRasterController {
  /**
   * สร้างเลขที่เอกสารใหม่ตามรูปแบบ
   * @param {string} prefix - คำนำหน้า (RE, TX, INV, QT)
   * @returns {string} เลขที่เอกสาร
   */
  static async generateDocumentNumber(prefix = 'RE') {
    const {
      generateReceiptNumber,
      generateInvoiceNumber,
      generateTaxInvoiceNumber
    } = require('../order/InvoiceReceiptController');

    switch (prefix) {
      case 'RE':
        return await generateReceiptNumber();
      case 'INV':
        return await generateInvoiceNumber();
      case 'TX':
        return await generateTaxInvoiceNumber();
      default:
        return await generateReceiptNumber();
    }
  }

  /**
   * สร้างภาพใบเสร็จ (Canvas) แล้วส่งกลับเป็น base64 + fileName
   * ✅ ปรับปรุงให้แยกระหว่างขายสดและขายผ่อน
   */
  static async printReceipt(order) {
    try {
      console.log(`🖨️ (Raster) สร้างภาพใบเสร็จสำหรับออเดอร์: ${order.order_number || order._id}`);
      console.log('📋 Order data received:', {
        paymentMethod: order.paymentMethod,
        downPaymentAmount: order.downPaymentAmount,
        contractNo: order.contractNo,
        receiptType: order.receiptType,
        orderKeys: Object.keys(order)
      });

      // ✅ ตรวจสอบประเภทการขาย - ปรับปรุงให้ครอบคลุมมากขึ้น
      const isInstallment = order.saleType === 'installment' ||
                           order.downPaymentAmount > 0 ||
                           order.contractNo ||
                           order.quotationNumber ||
                           (order.receiptType &&
                            (order.receiptType.includes('installment') ||
                             order.receiptType.includes('down_payment') ||
                             order.receiptType.includes('deposit')));

      const isCashSale = order.paymentMethod === 'cash' && !isInstallment;

      console.log(`💰 การขาย: ${isCashSale ? 'ขายสด (Cash Sale)' : isInstallment ? 'ขายผ่อน/ดาวน์ (Installment)' : 'ไม่ระบุ'}`);

      // ✅ ใช้ Controller ที่เหมาะสม
      if (isCashSale) {
        console.log('🏪 ใช้ CashSalesPDFController สำหรับขายสด');
        try {
          const CashSalesPDFController = require('./CashSalesPDFController');
          return await CashSalesPDFController.printCashSalesReceipt(order);
        } catch (error) {
          console.warn('⚠️ CashSalesPDFController ไม่พร้อม ใช้ระบบเดิม');
          console.error('❌ CashSalesPDFController Error:', error.message);
          // Fall back to original logic
        }
      } else if (isInstallment) {
        console.log('📄 ใช้ InstallmentPDFController สำหรับขายผ่อน');
        try {
          const InstallmentPDFController = require('./InstallmentPDFController');
          return await InstallmentPDFController.printInstallmentReceipt(order);
        } catch (error) {
          console.warn('⚠️ InstallmentPDFController ไม่พร้อม ใช้ระบบเดิม');
          // Fall back to original logic
        }
      }

      // ✅ ระบบเดิม (Fallback)
      console.log('🔄 ใช้ระบบเดิม (Original PDFoooRasterController)');

      // โหลดรูปภาพโลโก้และ QR
      const logoPath    = path.join(__dirname, '..', '..', 'Logo', 'logo.png');
      const qrLeftPath  = path.join(__dirname, '..', '..', 'Logo', 'qrLeft.png');
      const qrRightPath = path.join(__dirname, '..', '..', 'Logo', 'qrRight.png');
      const [logo, qrLeft, qrRight] = await Promise.all([
        loadImage(logoPath),
        loadImage(qrLeftPath),
        loadImage(qrRightPath),
      ]);

      // ใช้เลขเอกสารจากฐานข้อมูลก่อนเสมอ
      let documentType = 'RECEIPT';
      if (order.invoiceType === 'TAX_INVOICE') {
        documentType = 'TAX_INVOICE';
      } else if (order.documentType === 'QUOTATION') {
        documentType = 'QUOTATION';
      } else if (order.documentType === 'INVOICE') {
        documentType = 'INVOICE';
      }

      const displayDocNo = pickDocNumber(order, documentType);
      let invoiceNo;
      if (displayDocNo) {
        invoiceNo = displayDocNo; // มีคำนำหน้ามาแล้ว ใช้เลย
      } else {
        // fallback เดิม
        const documentPrefix = documentType === 'TAX_INVOICE' ? 'TX' : 'RE';
        const rawBase = coalesce(
          order.invoiceNo,
          order.order_number,
          await this.generateDocumentNumber(documentPrefix)
        );

        // 🔧 ตัดคำนำหน้าเดิมทิ้ง ถ้ามี (กัน RE-RE-xxxx / RE-TX-xxxx)
        const base = String(rawBase).replace(/^(RE|TX)-/ig, '');

        invoiceNo = `${documentPrefix}-${base}`;
      }
      console.log('📄 Invoice No to display:', invoiceNo);

      const saleDate = formatThaiDate(pickSaleDate(order));

      // แก้ไขการจัดการชื่อพนักงาน - ใช้ coalesce
      let staffName = coalesce(order.staffName, order.employeeName, order.staff?.name, order.user?.name, order.performed_by, order.salesperson, 'พนักงาน');

      // Debug ข้อมูลที่ละเอียดกว่า
      console.log('👤 Staff name resolution details:', {
        'order.staffName': order.staffName,
        'order.employeeName': order.employeeName,
        'order.staff?.name': order.staff?.name,
        'order.user?.name': order.user?.name,
        'order.performed_by': order.performed_by,
        'order.salesperson': order.salesperson,
        'typeof order.staffName': typeof order.staffName,
        'typeof order.employeeName': typeof order.employeeName,
        'staffName isEmpty': !order.staffName,
        'final staffName': staffName,
        'order keys': Object.keys(order)
      });

      // ถ้าชื่อพนักงานยังเป็น 'พนักงาน' ให้แสดงคำเตือน
      if (staffName === 'พนักงาน') {
        console.warn('⚠️ Using default staff name "พนักงาน" - no staff name provided in order data');
        console.warn('⚠️ Available order data:', JSON.stringify(order, null, 2));
      } else {
        console.log('✅ Staff name resolved successfully:', staffName);
      }

      // ใช้โครงสร้างข้อมูลที่ถูกต้อง - รองรับทั้ง branch object และ string
      const branch = order.branch || {};
      const company = order.company || {};

      // ตรวจสอบข้อมูลสาขา - อาจจะมาเป็น string แทน object
      const branchName = branch.name || order.branchName || 'สำนักงานใหญ่';
      const branchCode = branch.code || order.branchCode || order.branch_code || '00000';
      const branchAddress = branch.address || order.branchAddress || '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000';
      const branchTaxId = branch.taxId || order.branchTaxId || '0945566000616';
      const branchTel = branch.tel || branch.phone || order.branchTel || '09-2427-0769';

      const mainLines = [
        { align: 'center', text: company.name || 'บริษัท 2 พี่น้อง โมบาย จำกัด' },
        { align: 'center', text: `สาขา: ${branchName}${branchCode ? ` รหัสสาขา ${branchCode}` : ''}` },
        ...(branchAddress ? [{ align: 'center', text: branchAddress }] : []),
        { align: 'center', text: `เลขประจำตัวผู้เสียภาษีอากร ${branchTaxId}` },
        { align: 'center', text: `โทร: ${branchTel}` },
        { align: 'center', text: SEPARATOR_LINE },
        { align: 'center', text: order.invoiceType === 'TAX_INVOICE' ? 'ใบกำกับภาษี' : 'ใบเสร็จรับเงิน' },
        { align: 'center', text: SEPARATOR_LINE },
      ];

      // ปรับส่วนข้อมูลลูกค้า - รองรับฟิลด์ first_name/last_name และ address แบบ string
      const customerInfoLines = [
        { align: 'left', text: `เลขที่ : ${invoiceNo}` },
        { align: 'left', text: `วันที่ขาย : ${saleDate}` },
        { align: 'left', text: `พนักงานขาย : ${staffName}` },
      ];

      if (order.customer) {
        const c = order.customer;
        const firstName = coalesce(c.firstName, c.first_name, '');
        const lastName  = coalesce(c.lastName, c.last_name, '');
        const prefix = coalesce(c.prefix, '');

        // สร้างชื่อเต็มให้ถูกต้อง
        let fullName = '';
        if (c.name && c.name !== 'ลูกค้าทั่วไป') {
          fullName = c.name;
        } else if (firstName || lastName) {
          fullName = `${prefix} ${firstName} ${lastName}`.trim();
        } else {
          fullName = 'ลูกค้าทั่วไป';
        }

        customerInfoLines.push(
          { align: 'left', text: `ลูกค้า : ${fullName}` },
          { align: 'left', text: `โทร : ${c.phone || '-'}` },
          { align: 'left', text: `เลขผู้เสียภาษี : ${coalesce(c.taxId, c.companyTaxId, '-')}` },
          { align: 'left', text: `ที่อยู่ : ${buildAddressFromAny(c)}` },
        );
      }
      customerInfoLines.push({ align: 'center', text: SEPARATOR_LINE });

      // ใช้ documentType ที่ประกาศไว้แล้วด้านบน
      const invoiceType = order.invoiceType || 'RECEIPT';
      let tableHeaderLines = [];
      let itemsLines = [];

      if (documentType === 'QUOTATION' || documentType === 'INVOICE') {
        // ใบเสนอราคา/ใบแจ้งหนี้: ชื่อสินค้าพร้อมเลขIMEI และ ค่าเอกสาร
        const colX = { name: 10, imei: 200, price: 460 };
        tableHeaderLines = [
          { text: 'ชื่อสินค้า', x: colX.name },
          { text: 'IMEI',      x: colX.imei },
          { text: 'ราคา',      x: colX.price },
        ];

        itemsLines = (order.items||[]).map(item => {
          return [
            { text: item.name||'-', x: colX.name },
            { text: item.imei||'-', x: colX.imei },
            { text: (item.price||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}), x: colX.price }
          ];
        });

        // เพิ่มรายการค่าเอกสาร
        const documentFee = order.documentFee || 500;
        itemsLines.push([
          { text: 'ค่าเอกสาร', x: colX.name },
          { text: '-', x: colX.imei },
          { text: documentFee.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}), x: colX.price }
        ]);

      } else {
        // ใบเสร็จรับเงิน/ใบกำกับภาษี: ค่าดาวน์ (ชื่อสินค้า+เลขimei) ดาวน์ ร่วม ค่าเอกสาร
        const colX = { name: 10, price: 460 };
        tableHeaderLines = [
          { text: 'รายการ', x: colX.name },
          { text: 'จำนวนเงิน', x: colX.price },
        ];

        const downPayment = order.downPayment || order.total || 0;

        // สร้างรายการสินค้าพร้อม IMEI - แก้ไขการแสดงผล
        let itemsDescription = 'ค่าดาวน์';
        if (order.items && order.items.length > 0) {
          const itemsList = order.items.map(item => {
            let itemName = item.name || 'สินค้า';

            // ทำความสะอาดชื่อสินค้า
            if (itemName.includes('ค่าดาวน์') && itemName.includes('(')) {
              // ดึงชื่อสินค้าจากวงเล็บ
              const match = itemName.match(/\(([^)]+)\)/);
              if (match) {
                let cleanName = match[1];
                // ตัดข้อความที่ไม่ต้องการออก
                cleanName = cleanName
                  .replace(/งานการค้าผ่อนชำระ.*/, '')
                  .replace(/ใบเสร็จ.*/, '')
                  .replace(/ใบกำกับภาษี.*/, '')
                  .replace(/\(IMEI:.*?\)/, '')
                  .trim();

                if (cleanName && !cleanName.includes('งานการค้าผ่อนชำระ')) {
                  itemName = cleanName;
                } else {
                  itemName = 'สินค้า';
                }
              }
            }

            return `${itemName}${item.imei ? ` (${item.imei})` : ''}`;
          }).join(', ');
          itemsDescription = `ค่าดาวน์ (${itemsList})`;
        }

        itemsLines = [
          [
            { text: itemsDescription, x: colX.name },
            { text: downPayment.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}), x: colX.price }
          ]
        ];
      }

      // ✅ แก้จาก it.qty → ใช้ quantity
      const totalQty = (order.items || []).reduce((sum, it) => sum + (coalesce(it.quantity, it.qty, 0) * 1), 0);
      const itemSummaryLine = `รายการ: ${(order.items||[]).length}   จำนวนชิ้น: ${totalQty}`;

      // คำนวณยอดจากรายการสินค้า (สำรองกรณี DB ขาด)
      const itemsSum = (order.items || []).reduce((sum, it) => {
        const qty  = Number(coalesce(it.quantity, it.qty, 1));
        const unit = Number(coalesce(it.unitPrice, it.price, 0));
        const line = Number(coalesce(it.totalPrice, (isFinite(qty)&&isFinite(unit)) ? qty*unit : 0));
        return sum + (isFinite(line) ? line : 0);
      }, 0);

      let subTotal   = order.subTotal;
      const vatAmount  = order.vatAmount||0;
      const discount   = order.discount || 0;

      // แก้ไขปัญหา subTotal = 0.00
      if (!isFinite(subTotal) || subTotal === 0 || subTotal === null || subTotal === undefined) {
        subTotal = itemsSum || order.total || order.totalAmount || 0;
      }

      // ฟังก์ชันดึงค่าธรรมเนียมเอกสารแบบเดียวกับ step4.html
      function getDocumentFee(order) {
        try {
          // ลำดับความสำคัญ: order.docFee -> order.documentFee -> step3Data.docFee -> localStorage -> default 500
          if (order.docFee && order.docFee > 0) {
            return parseFloat(order.docFee);
          }

          if (order.documentFee && order.documentFee > 0) {
            return parseFloat(order.documentFee);
          }

          // ดึงจาก step3Data (ถ้าส่งมาใน order)
          if (order.step3Data?.docFee) {
            return parseFloat(order.step3Data.docFee);
          }

          // Fallback จาก localStorage (ใช้วิธีเดียวกับ step4.html)
          if (typeof localStorage !== 'undefined') {
            const fallbackDocFee = localStorage.getItem('globalDocumentFee') || '500';
            return parseFloat(fallbackDocFee);
          }

          // Default fallback
          return 500;
        } catch (error) {
          console.warn('⚠️ Error getting document fee, using default 500:', error);
          return 500;
        }
      }

      const docFee = getDocumentFee(order);
      const totalAmount = order.total || 0;

      console.log('💰 PDFRaster Document Fee Calculation:', {
        orderDocFee: order.docFee,
        orderDocumentFee: order.documentFee,
        step3DocFee: order.step3Data?.docFee,
        fallbackDocFee: typeof localStorage !== 'undefined' ? localStorage.getItem('globalDocumentFee') : 'N/A',
        finalDocFee: docFee
      });

      // เตรียมสตริงล่วงหน้า เพื่อเรียกใช้ง่าย ๆ
      const subTotalStr    = subTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const vatAmountStr   = vatAmount .toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const discountStr    = discount .toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const docFeeStr      = docFee.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const totalAmountStr = totalAmount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

      // ตรวจสอบว่าเป็น Tax Invoice หรือไม่
      const isTaxDoc = (order.invoiceType === 'TAX_INVOICE') || (documentType === 'TAX_INVOICE');

      const summaryLines = [
        { label: SEPARATOR_LINE, value: '' },
        // ใบกำกับภาษี: แสดงมูลค่าก่อนภาษี + ค่าธรรมเนียม + ภาษี + รวมทั้งสิ้น
        // ใบเสร็จ: แสดงแค่รวมทั้งสิ้น (ไม่แสดงรายละเอียดย่อย)
        ...(isTaxDoc ? [
          { label: 'มูลค่าสินค้าก่อนภาษี', value: subTotalStr },
          // แทรกค่าธรรมเนียมเอกสาร (ถ้ามีค่ามากกว่า 0)
          ...(docFee > 0 ? [{ label: 'ค่าธรรมเนียมเอกสาร', value: docFeeStr }] : []),
          { label: 'ภาษีมูลค่าเพิ่ม', value: vatAmountStr }
        ] : []),
        { label: SEPARATOR_LINE, value: '' },
        ...(discount > 0 ? [{ label: 'ส่วนลด', value: discountStr }] : []),
        { label: 'รวมทั้งสิ้น', value: totalAmountStr },
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
      ctx.font = `${mainFont}px "TH Sarabun New", "THSarabunNew", sans-serif`;
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
      ctx.font = `${noteFont}px "TH Sarabun New", "THSarabunNew", sans-serif`;
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
      const outDir   = path.join(__dirname,'..','..','receipts');
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

  /**
   * แปลงเอกสารจากฐานข้อมูล (Receipt/TaxInvoice) ให้เป็น order ที่ renderer เข้าใจ
   */
  static normalizeFromDbDoc(doc, documentType) {
    if (!doc) return {};

    console.log('🔄 Normalizing document from DB:', {
      _id: doc._id,
      documentType,
      hasCompany: !!doc.company,
      hasBranch: !!doc.branch,
      hasCustomer: !!doc.customer,
      hasItems: !!(doc.items && doc.items.length),
      hasSummary: !!doc.summary,
      hasCalculation: !!doc.calculation
    });

    return {
      // 🆔 เลขเอกสารและข้อมูลเบื้องต้น
      _id: doc._id,
      order_number: doc.receiptNumber || doc.taxInvoiceNumber || doc._id,
      receiptNumber: doc.receiptNumber,
      taxInvoiceNumber: doc.taxInvoiceNumber,
      invoiceNumber: doc.invoiceNumber,
      documentType: doc.documentType || documentType,
      invoiceType: doc.invoiceType || (documentType === 'TAX_INVOICE' ? 'TAX_INVOICE' : 'RECEIPT'),

      // 🏢 ข้อมูลบริษัทและสาขา
      company: doc.company || {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
        taxId: '0945566000616',
        phone: '09-2427-0769'
      },
      branch: doc.branch || {
        name: 'สำนักงานใหญ่',
        code: '00000',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000'
      },
      branchCode: doc.branchCode || doc.branch?.code || '00000',
      branchName: doc.branchName || doc.branch?.name || 'สำนักงานใหญ่',

      // 👤 ข้อมูลพนักงาน
      employeeName: doc.employeeName,
      staffName: doc.staffName,
      staff: doc.staff,
      user: doc.user,
      performed_by: doc.performed_by,
      salesperson: doc.salesperson,

      // 👥 ข้อมูลลูกค้า
      customer: doc.customer || {},

      // 📦 รายการสินค้า
      items: doc.items || [],

      // � ข้อมูลการขายและการผ่อนชำระ
      saleType: doc.saleType,
      receiptType: doc.receiptType,
      contractNo: doc.contractNo,
      quotationNumber: doc.quotationNumber,
      downPaymentAmount: doc.downPaymentAmount,
      paymentMethod: doc.paymentMethod || 'cash',

      // 💵 ข้อมูลการเงิน
      subTotal: coalesce(
        doc.summary?.beforeTax,
        doc.summary?.subtotal,
        doc.subtotal,
        doc.subTotal,
        // คำนวณจากรายการสินค้า
        (doc.items || []).reduce((sum, item) => {
          const qty = Number(item.quantity || item.qty || 1);
          const price = Number(item.unitPrice || item.price || 0);
          return sum + (qty * price);
        }, 0)
      ),

      vatAmount: coalesce(
        doc.summary?.vatAmount,
        doc.vatAmount,
        doc.calculation?.vatAmount,
        0
      ),

      total: coalesce(
        doc.summary?.totalWithTax,
        doc.summary?.total,
        doc.summary?.netTotal,
        doc.totalAmount,
        doc.total,
        // fallback คำนวณ
        (doc.summary?.beforeTax || doc.subtotal || 0) + (doc.summary?.vatAmount || doc.vatAmount || 0)
      ),

      downPayment: coalesce(
        doc.downPaymentAmount,
        doc.downPayment,
        doc.summary?.subtotal,
        0
      ),

      // 📄 ค่าธรรมเนียมเอกสาร
      documentFee: coalesce(
        doc.documentFee,
        doc.docFee,
        doc.summary?.docFee,
        doc.calculation?.documentFee,
        500  // default
      ),

      // 🧾 ข้อมูลภาษี
      vatInclusive: coalesce(
        doc.vatInclusive,
        doc.calculation?.taxType === 'inclusive',
        doc.taxType === 'inclusive',
        false
      ),

      vatRate: coalesce(
        doc.vatRate,
        doc.calculation?.vatRate,
        7
      ),

      hasVatItems: coalesce(
        doc.hasVatItems,
        // ตรวจสอบจากรายการสินค้า
        (doc.items || []).some(item => item.hasVat || item.vatRate > 0),
        false
      ),

      vatDetectionMethod: doc.vatDetectionMethod || 'none',
      taxType: doc.taxType || 'none',

      // 📅 วันที่
      issueDate: doc.issueDate?.$date || doc.issueDate,
      saleDate: doc.saleDate?.$date || doc.saleDate,
      createdAt: doc.createdAt?.$date || doc.createdAt,
      paymentDate: doc.paymentDate?.$date || doc.paymentDate,
      updatedAt: doc.updatedAt?.$date || doc.updatedAt,

      // 📝 หมายเหตุ
      notes: doc.notes,

      // 🔄 ข้อมูลเพิ่มเติม
      __v: doc.__v
    };
  }

  /**
   * ใช้ _id จาก DB แล้วพิมพ์ (ต้องมีโมเดล Receipt/TaxInvoice)
   */
  static async printFromDbById(id, documentType = 'RECEIPT') {
    const useTax = documentType === 'TAX_INVOICE';
    const Model = useTax ? require('../../models/TaxInvoice') : require('../../models/Receipt');
    const doc = await Model.findById(id).lean();
    if (!doc) throw new Error(`${documentType} not found for id ${id}`);
    const order = this.normalizeFromDbDoc(doc, documentType);
    return await this.printReceipt(order);
  }

  /**
   * ใช้เลขเอกสาร RE-xxxx หรือ TX-xxxx แล้วพิมพ์ (ค้นจาก number)
   */
  static async printFromDbByNumber(docNumber) {
    if (!docNumber || typeof docNumber !== 'string') throw new Error('docNumber is required');
    const isTax = docNumber.startsWith('TX-');
    const documentType = isTax ? 'TAX_INVOICE' : 'RECEIPT';
    const Model = isTax ? require('../../models/TaxInvoice') : require('../../models/Receipt');
    const field = isTax ? 'taxInvoiceNumber' : 'receiptNumber';
    const doc = await Model.findOne({ [field]: docNumber }).lean();
    if (!doc) throw new Error(`Document ${docNumber} not found`);
    const order = this.normalizeFromDbDoc(doc, documentType);
    return await this.printReceipt(order);
  }
}

module.exports = PDFoooRasterController;
