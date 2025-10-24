/************************************************************
 * CashSalesPDFController.js - สำหรับขายสดเท่านั้น
 *  - สร้างภาพใบเสร็จขายสด (Canvas) แล้วส่งกลับเป็น base64
 *  - ไม่รองรับผ่อนชำระ/เงินดาวน์/มัดจำ
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

// หมายเหตุสำหรับขายสด
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

// ===== helper: wrap text =====
function wrapTextLines(lines, maxWidth, fontPx) {
  const { createCanvas } = require('canvas');
  const tmp = createCanvas(10,10);
  const ctx = tmp.getContext('2d');
  ctx.font = `${fontPx}px "TH Sarabun New", "THSarabunNew", sans-serif`;
  const out = [];

  for (const line of lines) {
    if (!line?.text) { out.push(line); continue; }
    const text = String(line.text);
    // แบ่งคำตามช่องว่าง ถ้าเป็นไทยล้วนไม่มีช่องว่าง จะตัดตามความกว้างอักษรให้เอง
    const words = text.split(/\s+/);
    let cur = '';

    const pushCur = () => {
      if (cur.trim() !== '') out.push({ ...line, text: cur.trim() });
      cur = '';
    };

    if (words.length === 1) {
      // เคสยาวไม่มีช่องว่าง: เดินตัวอักษร
      let buf = '';
      for (const ch of text) {
        const probe = buf + ch;
        if (ctx.measureText(probe).width <= maxWidth) {
          buf = probe;
        } else {
          out.push({ ...line, text: buf });
          buf = ch;
        }
      }
      if (buf) out.push({ ...line, text: buf });
    } else {
      for (const w of words) {
        const probe = (cur ? cur + ' ' : '') + w;
        if (ctx.measureText(probe).width <= maxWidth) {
          cur = probe;
        } else {
          pushCur();
          // ถ้าคำเดี่ยวเกิน maxWidth ให้ตัดแบบอักษร
          if (ctx.measureText(w).width > maxWidth) {
            let buf = '';
            for (const ch of w) {
              const pw = buf + ch;
              if (ctx.measureText(pw).width <= maxWidth) buf = pw;
              else { out.push({ ...line, text: buf }); buf = ch; }
            }
            cur = buf;
          } else {
            cur = w;
          }
        }
      }
      pushCur();
    }
  }
  return out;
}

class CashSalesPDFController {
  /**
   * สร้างเลขที่เอกสารใหม่สำหรับขายสด
   * @param {string} prefix - คำนำหน้า (CS = Cash Sales, TX = Tax Invoice)
   * @returns {string} เลขที่เอกสาร
   */
  static async generateDocumentNumber(prefix = 'CS') {
    const {
      generateReceiptNumber,
      generateInvoiceNumber,
      generateTaxInvoiceNumber
    } = require('../order/InvoiceReceiptController');

    switch (prefix) {
      case 'CS':
        return await generateReceiptNumber(); // ใบเสร็จขายสด
      case 'TX':
        return await generateTaxInvoiceNumber(); // ใบกำกับภาษีขายสด
      default:
        return await generateReceiptNumber(); // Default ขายสด
    }
  }

  /**
   * สร้างใบเสร็จขายสดเท่านั้น - ไม่รองรับผ่อนชำระ
   * @param {Object} order - ข้อมูลออเดอร์ขายสด
   * @param {string} documentType - 'RECEIPT' หรือ 'TAX_INVOICE'
   * @returns {Object} { base64, fileName }
   */
  static async printCashSalesReceipt(order, documentType = 'RECEIPT') {
    try {
      console.log(`💵 (Cash Sales) สร้างใบเสร็จขายสดสำหรับ: ${order.order_number || order._id}`);

      // ✅ ตรวจสอบว่าเป็นขายสดจริง ๆ
      if (order.paymentMethod && order.paymentMethod !== 'cash') {
        console.warn(`⚠️ Payment method is ${order.paymentMethod}, but processing as cash sale`);
      }

      if (order.downPaymentAmount && order.downPaymentAmount > 0) {
        console.warn('⚠️ Down payment detected, but processing as cash sale');
      }

      if (order.contractNo || order.quotationNumber) {
        console.warn('⚠️ Contract/quotation detected, but processing as cash sale');
      }

      console.log('✅ กำลังสร้างใบเสร็จขายสด (Cash Sales Only)');

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
      const displayDocNo = pickDocNumber(order, documentType);
      let invoiceNo;
      if (displayDocNo) {
        invoiceNo = displayDocNo; // มีคำนำหน้ามาแล้ว ใช้เลย
      } else {
        const documentPrefix = documentType === 'TAX_INVOICE' ? 'TX' : 'RE';
        const rawBase = coalesce(
          order.baseDocumentNumber,
          order.order_number,
          new Date().getFullYear().toString().slice(-2) +
                        (new Date().getMonth() + 1).toString().padStart(2, '0') +
                        new Date().getDate().toString().padStart(2, '0') + '-' +
            Math.floor(Math.random() * 9999).toString().padStart(4, '0')
        );

        // 🔧 ตัดคำนำหน้าเดิมทิ้ง ถ้ามี (กัน RE-RE-xxxx / RE-TX-xxxx)
        const base = String(rawBase).replace(/^(RE|TX)-/ig, '');

        invoiceNo = `${documentPrefix}-${base}`;
      }
      console.log('📄 Invoice No to display:', invoiceNo);

      // ===== ตัดสินว่าเป็น "ใบกำกับภาษี" แน่ ๆ ไหม และบังคับเลขเอกสารให้ตรงชนิด =====
      const docTypeFromFields =
        (order.documentType && String(order.documentType).toUpperCase() === 'TAX_INVOICE') ||
        (order.receiptType && /tax_invoice/i.test(order.receiptType)) ||
        (order.hasVatItems === true) ||
        (order.calculation && String(order.calculation.taxType).toLowerCase() === 'inclusive');

      const docTypeFromNumbers =
        /^TX-/i.test(invoiceNo || '') ||
        /^TX-/i.test(order?.taxInvoiceNumber || '');

      let isTaxDoc = (documentType === 'TAX_INVOICE') || docTypeFromFields || docTypeFromNumbers;

      // ปรับเลขเอกสารให้สอดคล้องกับชนิดเอกสารเสมอ
      if (isTaxDoc) {
        if (order.taxInvoiceNumber && /^TX-/i.test(order.taxInvoiceNumber)) {
          invoiceNo = order.taxInvoiceNumber;
        } else {
          if (/^RE-/i.test(invoiceNo)) invoiceNo = invoiceNo.replace(/^RE-/i, 'TX-');
          if (!/^(RE|TX)-/i.test(invoiceNo)) invoiceNo = `TX-${invoiceNo}`;
        }
      } else {
        if (order.receiptNumber && /^RE-/i.test(order.receiptNumber)) {
          invoiceNo = order.receiptNumber;
        } else {
          if (/^TX-/i.test(invoiceNo)) invoiceNo = invoiceNo.replace(/^TX-/i, 'RE-');
          if (!/^(RE|TX)-/i.test(invoiceNo)) invoiceNo = `RE-${invoiceNo}`;
        }
      }

      console.log('🔎 doc decide =>', { invoiceNo, isTaxDoc, docTypeFromFields, docTypeFromNumbers });

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

      // ปัญหาเลข 4: ดึงข้อมูลสาขาจริงจากฐานข้อมูล
      let branchData = null;
      let company = order.company || {};

      // ดึงข้อมูลสาขาจากฐานข้อมูล - รองรับ 00000 = สำนักงานใหญ่
      try {
        const Branch = require('../../models/Branch');
        const rawBranchCode = coalesce(order.branchCode, order.branch?.code, '00000'); // ให้ 00000 = HQ
        const branchCode = rawBranchCode === '00000' ? '00000' : rawBranchCode;

        branchData = await Branch.findOne({ code: branchCode });
        if (!branchData) {
          console.warn(`⚠️ Branch ${branchCode} not found in database, using default HQ`);
          branchData = {
            name: branchCode === '00000' ? 'สำนักงานใหญ่' : 'สาขาสตูล',
            code: branchCode,
            address: coalesce(order.company?.address, '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000'),
            taxId: coalesce(order.company?.taxId, '0945566000616'),
            phone: coalesce(order.company?.phone, '09-2427-0769'),
          };
        }
      } catch (error) {
        console.error('❌ Error fetching branch data:', error);
        // ใช้ข้อมูล fallback
        branchData = {
          name: 'สำนักงานใหญ่',
          code: '00000',
          address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
          taxId: '0945566000616',
          phone: '09-2427-0769'
        };
      }

      // ใช้ข้อมูลจากฐานข้อมูลเป็นหลัก
      const branchName = branchData.name || order.branchName || 'สาขาหลัก';
      const branchCode = branchData.code || order.branchCode || '';
      const branchAddress = branchData.address || order.branchAddress || '';
      const branchTaxId = branchData.taxId || company.taxId || '0945566000616';
      const branchTel = branchData.phone || company.phone || '09-2427-0769';

      const mainLines = [
        { align: 'center', text: company.name || 'บริษัท 2 พี่น้อง โมบาย จำกัด' },
        { align: 'center', text: `สาขา: ${branchName}${branchCode ? ` รหัสสาขา ${branchCode}` : ''}` },
        ...(branchAddress ? [{ align: 'center', text: branchAddress }] : []),
        { align: 'center', text: `เลขประจำตัวผู้เสียภาษีอากร ${branchTaxId}` },
        { align: 'center', text: `โทร: ${branchTel}` },
        { align: 'center', text: SEPARATOR_LINE },
        { align: 'center', text: isTaxDoc ? 'ใบกำกับภาษี' : 'ใบเสร็จรับเงิน' },
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
        const firstName = coalesce(c.firstName, c.first_name, c.name);
        const lastName  = coalesce(c.lastName, c.last_name, '');
        const fullName  = coalesce(c.fullName, `${coalesce(c.prefix,'')}${firstName ? ' ' + firstName : ''}${lastName ? ' ' + lastName : ''}`.trim());

        customerInfoLines.push(
          { align: 'left', text: `ลูกค้า : ${fullName || '-'}` },
          { align: 'left', text: `โทร : ${c.phone || '-'}` },
          { align: 'left', text: `เลขผู้เสียภาษี : ${coalesce(c.taxId, c.companyTaxId, '-')}` },
          { align: 'left', text: `ที่อยู่ : ${buildAddressFromAny(c)}` },
        );
      }
      customerInfoLines.push({ align: 'center', text: SEPARATOR_LINE });

      // รายการสินค้าสำหรับขายสด (ปรับแก้ปัญหาเลข 2: แก้ตัวอักษรทับ)
      const colX = { name: 10, imei: 250, price: 420 }; // ขยับ IMEI ไปทางขวา และลดตำแหน่งราคา
      let tableHeaderLines = [
        { text: 'ชื่อสินค้า', x: colX.name },
        { text: 'IMEI', x: colX.imei },
        { text: 'ราคา', x: colX.price },
      ];

      const items = order.items || [];

      // คำนวณยอดจากรายการสินค้าไว้ใช้เป็น fallback
      const itemsSum = (order.items || []).reduce((sum, it) => {
        const qty   = Number(coalesce(it.quantity, it.qty, 1));
        const unit  = Number(coalesce(it.unitPrice, it.price, 0));
        const line  = Number(coalesce(it.totalPrice, (isFinite(qty) && isFinite(unit)) ? qty * unit : 0));
        return sum + (isFinite(line) ? line : 0);
      }, 0);

      let itemsLines = [];
      let totalAmount = 0;

      // แสดงรายการสินค้าแต่ละรายการสำหรับขายสด - แก้ไขการคำนวณ quantity
      if (items.length > 0) {
        totalAmount = itemsSum;  // 🔧 ชัวร์ว่าไม่เป็น 0 ถ้ามีรายการ
        itemsLines = items.map(item => {
          const qty   = Number(coalesce(item.quantity, item.qty, 1));
          const price = Number(coalesce(item.unitPrice, item.price, 0));
          const itemTotal = qty * price;

          const itemName = item.name || 'สินค้า';
          const shortName = itemName.length > 28 ? itemName.substring(0, 26) + '..' : itemName;

          return [
            { text: `${shortName} (x${qty})`, x: colX.name },
            { text: coalesce(item.imei, '-') , x: colX.imei },
            { text: itemTotal.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }), x: colX.price }
          ];
        });
      } else {
        totalAmount = Number(coalesce(order.total, order.totalAmount, order.summary?.total, 0));
        itemsLines = [[
            { text: 'ขายสด', x: colX.name },
          { text: '-',     x: colX.imei },
            { text: totalAmount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}), x: colX.price }
        ]];
      }

      // ✅ แก้จาก it.qty → ใช้ quantity
      const totalQty = (order.items || []).reduce((sum, it) => sum + (coalesce(it.quantity, it.qty, 0) * 1), 0);
      const itemSummaryLine = `รายการ: ${(order.items||[]).length}   จำนวนชิ้น: ${totalQty}`;

      // ตัวเลขจากเอกสาร/คอลเลกชัน
      const explicitSub   = coalesce(order.subTotal, order.subtotal, order.summary?.subtotal, order.calculation?.beforeTax);
      const explicitVat   = coalesce(order.vatAmount, order.summary?.vatAmount, order.calculation?.vatAmount);
      const explicitTotal = coalesce(order.total, order.totalAmount, order.summary?.totalWithTax, order.summary?.total, totalAmount);

      // อัตราภาษี
      const vatRate = Number(coalesce(order.vatRate, order.calculation?.vatRate, 7)) || 0;

      // ใช้ itemsSum ที่คำนวณไว้แล้วด้านบน

      let subTotal, vatAmount, finalTotalAmount;

      if (isTaxDoc) {
        // ✅ ใบกำกับภาษี: บังคับมองเป็นยอดรวมภาษี (inclusive) เพื่อให้แสดงภาษีแน่นอน
        finalTotalAmount = Number(explicitTotal || itemsSum || 0);
        const before = vatRate > 0 ? finalTotalAmount / (1 + vatRate/100) : finalTotalAmount;
        subTotal  = Math.round(before * 100) / 100;
        vatAmount = Math.max(0, Math.round((finalTotalAmount - subTotal) * 100) / 100);
      } else {
        // ใบเสร็จ: ใช้ข้อมูลจริง + fallback จากรายการ
        subTotal        = explicitSub;
        vatAmount       = explicitVat ?? 0;
        finalTotalAmount= explicitTotal;

        if (!isFinite(subTotal) || subTotal === 0 || subTotal === null || subTotal === undefined) {
          subTotal = itemsSum || totalAmount || 0;
        }
        if (!isFinite(vatAmount) && vatRate > 0)   vatAmount = Math.round((subTotal * vatRate/100) * 100) / 100;
        if (!isFinite(finalTotalAmount) || !finalTotalAmount) {
          finalTotalAmount = Math.round((subTotal + (vatAmount || 0)) * 100) / 100;
        }
      }

      const subTotalStr      = subTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const vatAmountStr     = vatAmount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const finalTotalAmountStr = finalTotalAmount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const discount = coalesce(order.discount, 0) * 1;
      const discountStr = discount.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

      const summaryLines = [
        { label: SEPARATOR_LINE, value: '' },
        // ใบกำกับภาษี: แสดงมูลค่าก่อนภาษี + ภาษี + รวมทั้งสิ้น
        // ใบเสร็จ: แสดงแค่รวมทั้งสิ้น
        ...(isTaxDoc ? [
          { label: 'มูลค่าสินค้าก่อนภาษี', value: subTotalStr },
          { label: 'ภาษีมูลค่าเพิ่ม', value: vatAmountStr }
        ] : []),
        { label: SEPARATOR_LINE, value: '' },
        ...(discount > 0 ? [{ label: 'ส่วนลด', value: discountStr }] : []),
        { label: 'รวมทั้งสิ้น', value: finalTotalAmountStr },
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
      const mainFont  = 18, lineHeight=26; // ลดขนาดฟอนต์เล็กน้อย
      const noteFont  = 16, noteLineHeight=24;
      const logoW=logo.width, logoH=logo.height;
      const qrW=logoW, qrH=logoH;
      const marginTop=10, marginBelowLogo=20, marginBottom=30, qrBottomMargin=10;

      // หลังเตรียม mainLines และ customerInfoLines แล้ว
      const contentMaxWidth = width - 20; // margin ซ้าย 10 ขวา 10
      const mainWrapped      = wrapTextLines(mainLines,      contentMaxWidth, mainFont);
      const customerWrapped  = wrapTextLines(customerInfoLines, contentMaxWidth, mainFont);

      // wrap ข้อความอื่นๆ ที่อาจยาวเกินไป
      const itemSummaryWrapped = wrapTextLines([{text: itemSummaryLine}], contentMaxWidth, mainFont);
      const noteHeaderWrapped = wrapTextLines([noteHeader], contentMaxWidth, noteFont);
      const noteWrapped = wrapTextLines(noteLines, contentMaxWidth, noteFont);

      // ใช้ mainWrapped / customerWrapped ในการคำนวณ height
      const height =
          marginTop +
          logoH + marginBelowLogo +
          mainWrapped.length*lineHeight +
          customerWrapped.length*lineHeight +
          lineHeight + itemsLines.length*lineHeight +
          lineHeight + // summary separator
          itemSummaryWrapped.length*lineHeight + // item summary (wrapped)
          summaryLines.length*lineHeight +
          noteHeaderWrapped.length*noteLineHeight + // note header (wrapped)
          noteWrapped.length*noteLineHeight + // note lines (wrapped)
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
      // draw main lines (wrapped)
      mainWrapped.forEach(line=>{
        const txt = line.text||'';
        let x = 10;
        if(line.align==='center'){
          const tw = ctx.measureText(txt).width;
          x = (width-tw)/2;
        }
        ctx.fillText(txt, x, y);
        y += lineHeight;
      });

      // draw customer info (wrapped)
      customerWrapped.forEach(line=>{
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

      // วาด itemSummary ที่ wrapped แล้ว
      itemSummaryWrapped.forEach(line => {
        ctx.fillText(line.text || '', 10, y);
        y += lineHeight;
      });

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

      // วาด noteHeader ที่ wrapped แล้ว
      noteHeaderWrapped.forEach(line => {
        let x = 10;
        if (line.align === 'center') {
          const tw = ctx.measureText(line.text).width;
          x = (width - tw) / 2;
        }
        ctx.fillText(line.text || '', x, y);
        y += noteLineHeight;
      });

      // วาด noteLines ที่ wrapped แล้ว
      noteWrapped.forEach(line => {
        let x = 10;
        if (line.align === 'center') {
          const tw = ctx.measureText(line.text).width;
          x = (width - tw) / 2;
        }
        ctx.fillText(line.text || '', x, y);
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
      const buffer = canvas.toBuffer('image/png');
      const docTypeShort = isTaxDoc ? 'tax' : 'receipt';
      const fileName = `cash_sales_${docTypeShort}_${invoiceNo.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      const outDir = path.join(__dirname,'..','..','receipts');
      if(!fs.existsSync(outDir)) fs.mkdirSync(outDir,{recursive:true});
      const outPath = path.join(outDir, fileName);
      fs.writeFileSync(outPath, buffer);

      console.log(`✅ สร้าง${isTaxDoc ? 'ใบกำกับภาษี' : 'ใบเสร็จรับเงิน'}ขายสดสำเร็จ: ${fileName}`);

      const base64 = buffer.toString('base64');
      return { base64, fileName };

    } catch(err) {
      console.error('❌ Error generating cash sales receipt:', err);
      throw err;
    }
  }

  /**
   * สร้างทั้งใบเสร็จรับเงิน (RE) และใบกำกับภาษี (TX) พร้อมกัน เลขเดียวกัน
   * @param {Object} order - ข้อมูลออเดอร์ขายสด
   * @returns {Object} { receipt: {...}, taxInvoice: {...}, baseNumber: string }
   */
  static async printDualReceipts(order) {
    try {
      console.log(`🔄 สร้างทั้งใบเสร็จและใบกำกับภาษีพร้อมกัน สำหรับ: ${order.order_number || order._id}`);

      // สร้างเลขฐานเดียวกัน
      const baseNumber = order.order_number || (new Date().getFullYear().toString().slice(-2) +
                        (new Date().getMonth() + 1).toString().padStart(2, '0') +
                        new Date().getDate().toString().padStart(2, '0') + '-' +
                        Math.floor(Math.random() * 9999).toString().padStart(4, '0'));

      // เพิ่ม baseDocumentNumber เข้าไปใน order
      const orderWithBase = { ...order, baseDocumentNumber: baseNumber };

      // สร้างทั้งสองอย่างพร้อมกัน
      const [receipt, taxInvoice] = await Promise.all([
        this.printCashSalesReceipt(orderWithBase, 'RECEIPT'),
        this.printCashSalesReceipt(orderWithBase, 'TAX_INVOICE')
      ]);

      console.log(`✅ สร้างเอกสารคู่สำเร็จ: RE-${baseNumber} และ TX-${baseNumber}`);

      return {
        receipt,
        taxInvoice,
        baseNumber,
        receiptNumber: `RE-${baseNumber}`,
        taxInvoiceNumber: `TX-${baseNumber}`
      };

    } catch (error) {
      console.error('❌ Error generating dual receipts:', error);
      throw error;
    }
  }

  /**
   * Alias สำหรับ compatibility กับระบบเดิม
   */
  static async printReceipt(order) {
    return await this.printCashSalesReceipt(order);
  }

  /**
   * แปลงเอกสารจากฐานข้อมูล (Receipt/TaxInvoice) ให้เป็น order ที่ renderer เข้าใจ
   */
  static normalizeFromDbDoc(doc, documentType) {
    if (!doc) return {};
    return {
      // doc numbers
      receiptNumber: doc.receiptNumber,
      taxInvoiceNumber: doc.taxInvoiceNumber,

      // party
      company: doc.company || {},
      branchCode: doc.branchCode,
      employeeName: doc.employeeName,

      // customer
      customer: doc.customer,

      // items
      items: doc.items || [],

      // money
      subTotal: doc.summary?.beforeTax || doc.summary?.subtotal || doc.subtotal,
      vatAmount: doc.summary?.vatAmount || doc.vatAmount,
      total:    doc.summary?.totalWithTax || doc.summary?.total || doc.totalAmount,

      // tax flags
      vatInclusive: coalesce(doc.vatInclusive, doc.calculation?.taxType === 'inclusive', doc.taxType === 'inclusive', false),
      vatRate: coalesce(doc.vatRate, doc.calculation?.vatRate, 7),

      // dates
      issueDate: doc.issueDate?.$date || doc.issueDate,
      createdAt: doc.createdAt?.$date || doc.createdAt,
      paymentDate: doc.paymentDate?.$date || doc.paymentDate,
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
    return await this.printCashSalesReceipt(order, documentType);
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
    return await this.printCashSalesReceipt(order, documentType);
  }
}

module.exports = CashSalesPDFController;
