/************************************************************
 * A4PDFController.js - Production Ready with QuotationPDF Layout
 * สร้าง PDF ขนาด A4 จากข้อมูลออเดอร์ (รูปแบบเหมือน QuotationPdfController)
 * อัปเดตให้เหมือนกับ QuotationPdfController และ InvoicePdfController
 ************************************************************/
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const http = require('http');
const https = require('https');

// เพิ่ม imports สำหรับโมเดลต่าง ๆ เหมือน QuotationPdfController
const mongoose = require('mongoose');
const Order = require('../../models/POS/Order');
const OrderItem = require('../../models/POS/OrderItem');
const Customer = require('../../models/Customer/Customer');
const Branch = require('../../models/Account/Branch');
const CashSale = require('../../models/POS/CashSale');
const InstallmentOrder = require('../../models/Installment/InstallmentOrder');
// const InstallmentCustomer = require('../../models/Installment/InstallmentCustomer'); // ลบแล้ว - ไม่ใช่ main flow
const ReceiptVoucher = require('../../models/POS/ReceiptVoucher');
const ReceiptVoucherDetail = require('../../models/POS/ReceiptVoucherDetail');

// 🆕 เพิ่ม imports สำหรับ TaxInvoice และ Receipt models
const TaxInvoice = require('../../models/TaxInvoice');
const Receipt = require('../../models/Receipt');

// เพิ่ม thai-baht-text library เหมือน QuotationPdfController
const bahtText = require('thai-baht-text');

// 🔧 เพิ่ม EmailService สำหรับส่งเอกสารทาง Gmail
const EmailService = require('../../services/emailService');

function toThaiBahtText(n) {
  // Validate input เพื่อป้องกัน error
  if (n === null || n === undefined || n === '' || isNaN(n)) {
    console.warn('⚠️ Invalid input for toThaiBahtText:', n, 'using default 0');
    return bahtText(0);
  }

  // Convert to number if it's a string
  const num = typeof n === 'string' ? parseFloat(n) : n;

  if (isNaN(num)) {
    console.warn('⚠️ Cannot convert to number for toThaiBahtText:', n, 'using default 0');
    return bahtText(0);
  }

  return bahtText(num);
}

// ===== CONFIG เหมือน QuotationPdfController =====
const CONFIG = {
  page: { size: 'A4', margin: 40 },
  font: {
    name: 'THSarabun', boldName: 'THSarabun-Bold',
    path: path.join(__dirname, '..', '..', 'fonts', 'THSarabunNew.ttf'),
    boldPath: path.join(__dirname, '..', '..', 'fonts', 'THSarabunNew Bold.ttf')
  },
  color: {
    primaryBlue: '#3498DB',
    textHeader: '#FFFFFF',
    textBlack: '#000000',
    textDark: '#222222',
    textLight: '#555555',
    lineLight: '#E0E0E0',
    lineDark: '#CCCCCC',
    sigLine: '#888888',
    bgWhite: '#FFFFFF',
    bgAccent: '#3498DB'
  },
  sizes: {
    logo: { w: 145 },
    heading1: 20,
    heading2: 14,
    heading3: 14,
    textBody: 13,
    textLabel: 11,
    textSmall: 10,
    tableHeader: 12,
    tableRow: 12,
    lineSpacing: 1.4
  },
  layout: {
    tableCols: {
      no: 35,
      desc: 225,
      qty: 45,
      unit: 70,
      disc: 55,
      amt: 85
    }
  }
};

// ===== HELPER FUNCTIONS เหมือน QuotationPdfController =====
function ensureNumberData(value, fallback = 0) {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
}

function ensureHeight(value, fallback = 10) {
    const num = Number(value);
    return isNaN(num) || num <= 0 ? fallback : num;
}

async function loadImageBuffer(url) {
  if (!url) return null;

  // --- 0) ถ้าเป็นไฟล์บนดิสก์ (absolute path หรือ path ในโฟลเดอร์ uploads) ---
  const filePath = path.normalize(url);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }

  // --- 0.1) ถ้าเป็นชื่อไฟล์ในโฟลเดอร์ uploads ของโปรเจกต์ ---
  const uploadFilePath = path.join(process.cwd(), 'uploads', path.basename(url));
  if (fs.existsSync(uploadFilePath)) {
    return fs.readFileSync(uploadFilePath);
  }

  // --- 1) Data URI ---
  if (url.startsWith('data:image')) {
    const base64 = url.split(',')[1];
    return Buffer.from(base64, 'base64');
  }

  // --- 2) HTTP(S) URL ---
  if (/^https?:\/\//.test(url)) {
    const client = url.startsWith('https://') ? https : http;
    return new Promise(resolve => {
      client.get(url, res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', () => resolve(null));
    });
  }

  // --- 3) โฟลเดอร์ public ใน project root ---
  const projectRoot = process.cwd();
  const relPath     = url.replace(/^\/+/, '');
  const tryPaths    = [
    path.join(projectRoot, 'public', relPath),
    path.join(projectRoot,         relPath),
  ];
  for (const p of tryPaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p);
    }
  }

  console.warn('loadImageBuffer: file not found at any of:\n' +
    tryPaths.map(p => `  • ${p}`).join('\n'));
  return null;
}

function formatThaiDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    // วัน เดือน พ.ศ.
    const day = date.getDate();
    const month = date.toLocaleDateString('th-TH', {month: 'long'});
    // ปี พ.ศ. (เพิ่ม 543 จาก ค.ศ.)
    const thaiYear = date.getFullYear() + 543;

    return `${day} ${month} ${thaiYear}`;
  } catch (e) {
    return '-';
  }
}

class A4PDFController {

  /**
   * โหลดลายเซ็นจาก Data URL หรือ file path
   * @param {string} signatureData - Data URL หรือ file path
   * @returns {Buffer|null} Buffer ของรูปภาพหรือ null
   */
  static async loadSignatureBuffer(signatureData) {
    if (!signatureData) return null;

    try {
      // ตรวจสอบว่าเป็น Data URL หรือไม่
      if (typeof signatureData === 'string' && signatureData.startsWith('data:image/')) {
        // แปลง Data URL เป็น Buffer
        const base64Data = signatureData.replace(/^data:image\/[a-z]+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
      } else if (typeof signatureData === 'string') {
        // ใช้ loadImageBuffer สำหรับ file path
        return await loadImageBuffer(signatureData);
      } else {
        // ถ้าเป็น Buffer อยู่แล้ว ให้ return ตรงๆ
        return Buffer.isBuffer(signatureData) ? signatureData : null;
      }
    } catch (error) {
      let displayData;
      if (typeof signatureData === 'string') {
        displayData = signatureData.length > 50 ? signatureData.substring(0, 50) + '...' : signatureData;
      } else if (Buffer.isBuffer(signatureData)) {
        displayData = `Buffer(${signatureData.length} bytes)`;
      } else {
        displayData = typeof signatureData;
      }
      console.warn(`⚠️ Cannot load signature: ${displayData}`, error.message);
      return null;
    }
  }

  /**
   * สร้างเลขที่เอกสารใหม่ตามรูปแบบ ใช้ฟังก์ชันจาก InvoiceReceiptController
   * @param {string} prefix - คำนำหน้า (RE, TX, INV, QT)
   * @returns {Promise<string>} เลขที่เอกสาร
   */
  static async generateDocumentNumber(prefix = 'RE') {
    try {
      console.log(`📄 Generating document number with prefix: ${prefix}`);

      // ใช้ DocumentNumberSystem สำหรับสร้างเลขที่เอกสารทั้งหมด
      const DocumentNumberSystem = require('../../utils/DocumentNumberSystem');

      let documentNumber;
      switch (prefix) {
        case 'QT':
          documentNumber = await DocumentNumberSystem.generateQuotationNumber();
          break;
        case 'INV':
          documentNumber = await DocumentNumberSystem.generateInvoiceNumber();
          break;
        case 'TX':
          documentNumber = await DocumentNumberSystem.generateTaxInvoiceNumber();
          break;
        case 'RE':
        default:
          documentNumber = await DocumentNumberSystem.generateReceiptNumber();
          break;
      }

      console.log(`📄 Generated document number: ${documentNumber} (prefix: ${prefix})`);
      return documentNumber;

    } catch (error) {
      console.error('❌ Error generating document number:', error);

      // Fallback: ใช้รูปแบบเดียวกับ InvoiceReceiptController
      const now = new Date();
      const thaiYear = (now.getFullYear() + 543).toString().slice(-2);
      const MM = String(now.getMonth() + 1).padStart(2, '0');
      const DD = String(now.getDate()).padStart(2, '0');
      const randomSeq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');

      const fallbackNumber = `${prefix}-${thaiYear}${MM}${DD}${randomSeq}`;
      console.log(`📄 Fallback document number: ${fallbackNumber}`);
      return fallbackNumber;
    }
  }

  /**
   * ฟังก์ชันหลักสำหรับสร้าง PDF เหมือน QuotationPdfController.createQuotationPdf
   * @param {Object} order - ข้อมูลออเดอร์
   * @returns {Promise<Object>} ผลลัพธ์ PDF {buffer, fileName}
   */
  static async createReceiptPdf(order) {
    console.log('🧾 A4PDFController.createReceiptPdf() called with order:', {
      _id: order?._id,
      order_number: order?.order_number,
      documentType: order?.documentType,
      quotationData: !!order?.quotationData,
      quotationNumber: order?.quotationNumber,
      hasCustomer: !!order?.customer,
      hasItems: Array.isArray(order?.items) && order?.items.length > 0,
      downPayment: order?.downPayment,
      subTotal: order?.subTotal,
      totalAmount: order?.totalAmount
    });

    // 🔍 Enhanced Debug: ตรวจสอบข้อมูลที่ส่งเข้ามา
    if (order?.customer) {
      console.log('👤 A4PDF Customer data received:', {
        name: order.customer.name,
        firstName: order.customer.firstName,
        lastName: order.customer.lastName,
        phone: order.customer.phone,
        taxId: order.customer.taxId,
        address: order.customer.address,
        customerType: order.customerType
      });
    } else {
      console.warn('⚠️ A4PDF: No customer data received');
    }

    if (order?.paymentData || order?.downPayment !== undefined) {
      console.log('💰 A4PDF Payment data received:', {
        downPayment: order.downPayment,
        paymentDataDownPayment: order.paymentData?.downPayment,
        subTotal: order.subTotal,
        totalAmount: order.totalAmount,
        total: order.total,
        docFee: order.docFee
      });
    } else {
      console.warn('⚠️ A4PDF: No payment/financial data received');
    }

    try {
      // ✅ Enhanced: Validate input data
      if (!order || typeof order !== 'object') {
        const error = new Error('Missing or invalid order data');
        console.error('❌ A4PDF Error: Invalid order data:', order);
        throw error;
      }

      // === ✅ Enhanced: อิงข้อมูลจากใบเสนอราคาเหมือน InvoicePdfController ===
      if (order.quotationData) {
        console.log('🧾 A4PDF อิงข้อมูลจากใบเสนอราคา:', {
          quotationNumber: order.quotationData.quotationNumber || order.quotationData.number,
          hasCustomer: !!order.quotationData.customer,
          hasItems: Array.isArray(order.quotationData.items) && order.quotationData.items.length > 0,
          hasFinancialData: !!(order.quotationData.subTotal || order.quotationData.totalAmount)
        });

        // อิงข้อมูลลูกค้าจากใบเสนอราคา - Enhanced mapping
        if (order.quotationData.customer) {
          const quotationCustomer = order.quotationData.customer;
          order.customer = {
            ...order.customer,
            ...quotationCustomer,
            // Enhanced field mapping for A4PDF
            name: quotationCustomer.name || `${quotationCustomer.first_name || ''} ${quotationCustomer.last_name || ''}`.trim(),
            firstName: quotationCustomer.firstName || quotationCustomer.first_name,
            lastName: quotationCustomer.lastName || quotationCustomer.last_name,
            phone: quotationCustomer.phone || quotationCustomer.phone_number,
            taxId: quotationCustomer.taxId || quotationCustomer.tax_id,
            email: quotationCustomer.email,
            address: quotationCustomer.address || quotationCustomer.fullAddress,
            // Additional fields for installment customers
            prefix: quotationCustomer.prefix,
            age: quotationCustomer.age,
            birth_date: quotationCustomer.birth_date
          };
          console.log('✅ A4PDF Enhanced customer sync from quotation:', {
            name: order.customer.name,
            phone: order.customer.phone,
            taxId: order.customer.taxId
          });
        }

        // อิงรายการสินค้าจากใบเสนอราคา - Enhanced mapping
        if (order.quotationData.items && order.quotationData.items.length > 0) {
          console.log('📦 A4PDF Enhanced item sync from quotation:', {
            existingItems: order.items?.length || 0,
            quotationItems: order.quotationData.items.length
          });

          // 🔧 FIX: Enhanced item mapping with installment-specific fields
          order.items = order.quotationData.items.map((quotationItem, index) => {
            const mappedItem = {
              ...quotationItem,
              // Standard field mapping
              description: quotationItem.description || quotationItem.name || `สินค้า ${index + 1}`,
              quantity: quotationItem.quantity || quotationItem.qty || 1,
              unitPrice: ensureNumberData(quotationItem.unitPrice || quotationItem.price, 0),
              totalPrice: ensureNumberData(quotationItem.totalPrice || quotationItem.amount ||
                         (quotationItem.unitPrice * quotationItem.quantity), 0),
              amount: ensureNumberData(quotationItem.amount || quotationItem.totalPrice ||
                     (quotationItem.unitPrice * quotationItem.quantity), 0),

              // Installment-specific fields
              imei: quotationItem.imei || '',
              model: quotationItem.model || '',
              brand: quotationItem.brand || '',
              category: quotationItem.category || '',

              // Price protection
              _originalPrice: quotationItem.unitPrice || quotationItem.price,
              _fromQuotation: true,

              // Document fee handling for installment items
              docFee: quotationItem.docFee || 0
            };

            // Recalculate amount if needed
            if (!mappedItem.amount || mappedItem.amount === 0) {
              mappedItem.amount = mappedItem.unitPrice * mappedItem.quantity;
              mappedItem.totalPrice = mappedItem.amount;
            }

            return mappedItem;
          });

          console.log('✅ A4PDF Enhanced items synced with original prices from quotation:',
            order.items.map(item => ({
              description: item.description,
              imei: item.imei || 'N/A',
              unitPrice: item.unitPrice,
              amount: item.amount
            }))
          );
        }

        // ✅ Enhanced: อิงเลข Quotation No. แบบครบถ้วน
        const quotationNumber = order.quotationData.quotationNumber ||
                               order.quotationData.number ||
                               order.quotationData.quotationNo ||
                               order.quotationData.documentNumber;
        if (quotationNumber) {
          order.quotationNumber = quotationNumber;
          order.quotationNo = quotationNumber;
          order.number = quotationNumber;
          console.log('📋 A4PDF Enhanced sync quotation number:', quotationNumber);
        } else {
          console.warn('⚠️ A4PDF: No quotation number found in quotationData');
        }

        // ✅ Enhanced: อิงข้อมูลการเงินจากใบเสนอราคาทั้งหมด
        if (order.quotationData.subTotal !== undefined) {
          order.subTotal = order.quotationData.subTotal;
          console.log('✅ A4PDF Synced subTotal:', order.subTotal);
        }
        if (order.quotationData.totalAmount !== undefined) {
          order.totalAmount = order.quotationData.totalAmount;
        }
        if (order.quotationData.grandTotal !== undefined) {
          order.grandTotal = order.quotationData.grandTotal;
          console.log('✅ A4PDF Synced grandTotal:', order.grandTotal);
        }
        if (order.quotationData.vatTotal !== undefined) {
          order.vatTotal = order.quotationData.vatTotal;
          console.log('✅ A4PDF Synced vatTotal:', order.vatTotal);
        }
        if (order.quotationData.vatAmount !== undefined) {
          order.vatAmount = order.quotationData.vatAmount;
        }
        if (order.quotationData.docFee !== undefined) {
          order.docFee = order.quotationData.docFee;
          console.log('✅ A4PDF Synced docFee:', order.docFee);
        }
        if (order.quotationData.shippingFee !== undefined) {
          order.shippingFee = order.quotationData.shippingFee;
        }
        if (order.quotationData.discount !== undefined) {
          order.discount = order.quotationData.discount;
        }
        if (order.quotationData.afterDiscount !== undefined) {
          order.afterDiscount = order.quotationData.afterDiscount;
        }

        // ✅ Enhanced: อิงข้อมูลภาษีจากใบเสนอราคา
        if (order.quotationData.taxType) {
          order.taxType = order.quotationData.taxType;
          console.log('✅ A4PDF Synced taxType:', order.taxType);
        }
        if (order.quotationData.taxRate !== undefined) {
          order.taxRate = order.quotationData.taxRate;
        }

        // ✅ Enhanced: อิงข้อมูล summary จากใบเสนอราคา
        if (order.quotationData.summary) {
          order.summary = { ...order.summary, ...order.quotationData.summary };
          console.log('✅ A4PDF Synced summary:', order.summary);
        }

        // ✅ Enhanced: อิงข้อมูลพนักงานขาย
        if (order.quotationData.salespersonName && !order.salesperson?.name) {
          if (!order.salesperson) order.salesperson = {};
          order.salesperson.name = order.quotationData.salespersonName;
        }

        // ✅ Enhanced: อิงข้อมูลเงื่อนไขการชำระ
        if (order.quotationData.creditTerm && !order.creditTerm) {
          order.creditTerm = order.quotationData.creditTerm;
        }

        console.log('✅ A4PDF Enhanced quotation data sync completed:', {
          quotationNumber: order.quotationNumber,
          hasCustomer: !!order.customer,
          itemsCount: order.items?.length || 0,
          subTotal: order.subTotal,
          vatTotal: order.vatTotal,
          grandTotal: order.grandTotal,
          taxType: order.taxType,
          docFee: order.docFee
        });
      } else {
        console.log('ℹ️ A4PDF: No quotationData provided, using original order data');
      }

      // ✅ Enhanced: ตรวจสอบและแก้ไข documentType สำหรับใบแจ้งหนี้
      if (!order.documentType) {
        order.documentType = 'RECEIPT';
      }

      // 🔧 เคารพ forceDocumentType parameter ก่อนการตรวจสอบอื่นๆ
      if (order.forceDocumentType) {
        console.log('🔧 A4PDF: Using forceDocumentType:', order.forceDocumentType);
        order.documentType = order.forceDocumentType;
        order.invoiceType = order.forceDocumentType;

        // ปรับ VAT ตาม documentType ที่บังคับ
        if (order.forceDocumentType === 'RECEIPT') {
          order.vatAmount = 0;
          order.vatTotal = 0;
          order.taxType = 'no_vat';
          console.log('🔧 A4PDF: Forced RECEIPT mode - VAT cleared');
        } else if (order.forceDocumentType === 'TAX_INVOICE') {
          // ให้แสดงภาษีตามข้อมูลเดิม
          console.log('🔧 A4PDF: Forced TAX_INVOICE mode - VAT preserved');
        }
      } else {
        // ถ้าเป็นการสร้างใบแจ้งหนี้จากใบเสนอราคา
        if (order.quotationData && order.createInvoice) {
          order.documentType = 'INVOICE';
          console.log('📄 A4PDF: Set documentType to INVOICE (from quotation)');
        }

        // ตรวจสอบ taxType เพื่อกำหนด documentType ให้ถูกต้อง (เฉพาะเมื่อไม่มี forceDocumentType)
        if (order.taxType === 'inclusive' || order.taxType === 'exclusive') {
          if (order.documentType !== 'INVOICE') {
            order.documentType = 'TAX_INVOICE';
          }
        }
      }

      console.log(`📄 สร้าง PDF A4 สำหรับ documentType: ${order.documentType}`);
      console.log(`📄 สร้าง PDF A4 สำหรับออเดอร์: ${order?.order_number || order?._id || 'unknown'}`);

      // === ✅ Enhanced: ปรับปรุงการ Normalize และ Validate ข้อมูล ===

      // Normalize order data เหมือน QuotationPdfController
      order.customer    = order.customer    || order.customerInfo || {};
      order.salesperson = order.salesperson || { name: order.staffName || order.employeeName };
      order.items       = Array.isArray(order.items) ? order.items : [{ description: 'รายการ', amount: order.totalAmount || 0, quantity: 1 }];
      order.branch      = order.branch      || {
        name: 'สำนักงานใหญ่',
        code: '00000',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
        taxId: '0945566000616',
        phone: '09-2427-0769'
      };
      order.company     = order.company     || { name: 'บริษัท 2 พี่น้อง โมบาย จำกัด' };

      // ✅ Enhanced: ปรับปรุงการจัดการข้อมูลลูกค้าให้ครบถ้วน พร้อม Enhanced Email Service integration
      if (order.customer && !order.customer.name) {
        const firstName = order.customer.firstName || order.customer.first_name || '';
        const lastName = order.customer.lastName || order.customer.last_name || '';
        const prefix = order.customer.prefix || '';
        let customerName = `${prefix} ${firstName} ${lastName}`.trim();

        // 🔧 Enhanced: ใช้ Enhanced Email Service สำหรับ customer data override
        if (!customerName) {
          try {
            // ลองดึงข้อมูลจาก Enhanced Email Service
            if (order.orderData?.customerInfo?.name) {
              customerName = order.orderData.customerInfo.name;
              console.log('✅ A4PDF: Using Enhanced Email Service customer name:', customerName);
            } else if (order.installmentData?.customerName) {
              customerName = order.installmentData.customerName;
              console.log('✅ A4PDF: Using installment customer name:', customerName);
            } else {
              // Use actual customer data when available
              console.log('⚠️ A4PDF: Customer name not available, keeping original data');
            }
          } catch (error) {
            console.warn('⚠️ A4PDF: Enhanced customer data not available, keeping original data');
          }
        }

        order.customer.name = customerName;
      }

      // ✅ Enhanced: ปรับปรุงการจัดการข้อมูลการเงิน
      if (!order.subTotal && !order.totalAmount && !order.downPayment) {
        console.warn('⚠️ A4PDF: No financial data found, using default values');
        order.subTotal = 0;
        order.totalAmount = 0;
        order.downPayment = 0;
      }

      // ใช้ค่าที่มีอยู่หรือค่าเริ่มต้น
      const subTotal = ensureNumberData(order.subTotal || order.totalAmount || order.downPayment || 0);
      const vatTotal = ensureNumberData(order.vatAmount || order.vatTotal || 0);
      const docFee = ensureNumberData(order.docFee ?? order.documentFee ?? 0); // 🔧 ไม่มี fallback 500
      const grandTotal = subTotal + vatTotal + docFee;

      // อัปเดตข้อมูลการเงิน
      order.subTotal = subTotal;
      order.vatTotal = vatTotal;
      order.docFee = docFee;
      order.grandTotal = grandTotal;
      order.amountInWords = toThaiBahtText(grandTotal);

      console.log('💰 A4PDF Enhanced Financial calculation:', {
        subTotal: order.subTotal,
        vatTotal: order.vatTotal,
        docFee: order.docFee,
        grandTotal: order.grandTotal,
        downPayment: order.downPayment,
        totalAmount: order.totalAmount
      });

      // ✅ Enhanced: Validate financial data
      if (order.grandTotal <= 0) {
        console.warn('⚠️ A4PDF: Invalid grand total, using fallback calculation');
        order.grandTotal = Math.max(order.subTotal || 0, order.totalAmount || 0, order.downPayment || 0, 500);
        order.amountInWords = toThaiBahtText(order.grandTotal);
      }

      // เรียกใช้ printReceipt ที่มีอยู่แล้ว
      console.log('🚀 A4PDF: Starting PDF generation...');
      const result = await this.printReceipt(order);

      console.log('✅ A4PDF: PDF generation completed successfully:', {
        fileName: result?.fileName,
        bufferSize: result?.buffer?.length,
        documentType: order.documentType
      });

      // ปรับให้ return รูปแบบเหมือน QuotationPdfController
      return result;

    } catch (err) {
      console.error('❌ Error in A4PDFController.createReceiptPdf:', {
        message: err.message,
        stack: err.stack,
        orderData: {
          _id: order?._id,
          documentType: order?.documentType,
          hasQuotationData: !!order?.quotationData,
          quotationNumber: order?.quotationNumber
        }
      });
      throw err;
    }
  }

  /**
   * 🆕 สร้าง PDF ใบกำกับภาษีจาก TaxInvoice model
   * @param {string} taxInvoiceId - ID ของ TaxInvoice หรือ tax invoice number
   * @returns {Promise<Object>} ผลลัพธ์ PDF {buffer, fileName}
   */
  static async createTaxInvoicePdf(taxInvoiceId) {
    console.log('🧾 Creating Tax Invoice PDF for ID:', taxInvoiceId);

    try {
      // ดึงข้อมูล TaxInvoice จากฐานข้อมูล
      let taxInvoice;

      // ลองหาด้วย _id ก่อน
      if (mongoose.Types.ObjectId.isValid(taxInvoiceId)) {
        taxInvoice = await TaxInvoice.findById(taxInvoiceId);
      }

      // ถ้าหาไม่เจอ ลองหาด้วย taxInvoiceNumber
      if (!taxInvoice) {
        taxInvoice = await TaxInvoice.findOne({ taxInvoiceNumber: taxInvoiceId });
      }

      if (!taxInvoice) {
        throw new Error(`Tax Invoice not found: ${taxInvoiceId}`);
      }

      console.log('✅ Tax Invoice found:', {
        _id: taxInvoice._id,
        taxInvoiceNumber: taxInvoice.taxInvoiceNumber,
        customerName: taxInvoice.customer?.name,
        totalAmount: taxInvoice.summary?.totalWithTax
      });

      // แปลงข้อมูล TaxInvoice เป็นรูปแบบที่ createReceiptPdf ต้องการ
      const orderData = this._convertTaxInvoiceToOrder(taxInvoice);

      return await this.createReceiptPdf(orderData);

    } catch (error) {
      console.error('❌ Error creating Tax Invoice PDF:', error);
      throw error;
    }
  }

  /**
   * 🆕 สร้าง PDF ใบกำกับภาษีจาก TaxInvoice model (สำหรับ History_installment.html)
   * @param {string} taxInvoiceId - ID ของ TaxInvoice หรือ taxInvoiceNumber
   * @returns {Promise<Buffer>} PDF buffer พร้อมใช้งาน
   */
  static async createTaxInvoicePdfFromModel(taxInvoiceId) {
    console.log('🧾 Creating Tax Invoice PDF from model for ID:', taxInvoiceId);

    try {
      // ใช้ createTaxInvoicePdf ที่มีอยู่แล้ว
      const result = await this.createTaxInvoicePdf(taxInvoiceId);

      // คืนค่าเป็น buffer พร้อมใช้งาน (ให้สอดคล้องกับ createReceiptPdfFromModel)
      return result.buffer;

    } catch (error) {
      console.error('❌ Error creating Tax Invoice PDF from model:', error);
      throw error;
    }
  }

  /**
   * 🆕 สร้าง PDF ใบเสร็จจาก Receipt model
   * @param {string} receiptId - ID ของ Receipt หรือ receipt number
   * @returns {Promise<Object>} ผลลัพธ์ PDF {buffer, fileName}
   */
  /**
   * 🆕 สร้าง PDF ใบเสร็จจาก BranchStockHistory (สำหรับ HistoryReceipt.html)
   * @param {string} historyId - ID ของ BranchStockHistory
   * @returns {Object} ผลลัพธ์การสร้าง PDF
   */
  static async createReceiptPdfFromHistory(historyId) {
    console.log('🧾 Creating Receipt PDF from History ID:', historyId);

    try {
      // ดึงข้อมูลจาก BranchStockHistory
      const BranchStockHistory = require('../../models/POS/BranchStockHistory');
      const historyData = await BranchStockHistory.findById(historyId).lean();

      if (!historyData) {
        throw new Error(`ไม่พบข้อมูลประวัติสำหรับ ID: ${historyId}`);
      }

      if (historyData.change_type !== 'OUT' || historyData.reason !== 'ขาย POS') {
        throw new Error('ไม่ใช่รายการขาย POS');
      }

      // ดึงข้อมูลสาขา
      const Branch = require('../../models/Account/Branch');
      const branchData = await Branch.findOne({
        branch_code: historyData.branch_code
      }).lean();

      // กรองรายการที่เป็น "ค่าดาวน์" ออกจากรายการขายสด (POS History ถือเป็นขายสด)
      const downPaymentRegex = /(ค่าดาวน์|\bดาวน์\b|down[_\- ]?payment)/i;
      const rawItems = Array.isArray(historyData.items) ? historyData.items : [];
      const filteredItems = rawItems.filter((item) => {
        const name = (item?.name || item?.description || '').toString();
        const category = (item?.category || '').toString();
        const isDown = downPaymentRegex.test(name) || downPaymentRegex.test(category) || item?.isDownPayment === true;
        return !isDown;
      });

      // แปลงข้อมูลให้ตรงกับรูปแบบที่ต้องการ
      const formattedData = {
        _id: historyId,
        order_number: historyData.invoice_no || historyId,
        quotationNumber: historyData.invoice_no || historyId,
        invoiceNo: historyData.invoice_no,
        saleDate: historyData.sale_date || historyData.performed_at,
        staffName: historyData.staff_name || historyData.staffName || historyData.performed_by || 'พนักงาน',

        // ข้อมูลสาขา
        branch: {
          name: branchData?.name || 'สาขา',
          code: historyData.branch_code,
          address: branchData?.address || '',
          taxId: branchData?.taxId || '0945566000616',
          tel: branchData?.phone || branchData?.tel || '09-2427-0769'
        },

        // ข้อมูลบริษัท
        company: {
          name: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
        },

        // ข้อมูลลูกค้า
        customerType: historyData.customerType || 'individual',
        customer: historyData.customerInfo || {},
        corporate: historyData.corporateInfo || {},

        // รายการสินค้า (ตัดค่าดาวน์ออก)
        items: filteredItems.map(item => ({
          name: item.name || '',
          model: item.model || '',
          brand: item.brand || '',
          imei: item.imei || '',
          qty: item.qty || 1,
          price: item.price || 0,
          cost: item.cost || 0,
          taxType: item.taxType || historyData.taxType || 'ไม่มีภาษี'
        })),

        // ยอดเงิน (ใช้ยอดจากระบบเดิมเพื่อให้ตรงกับการชำระจริง)
        subTotal: historyData.sub_total || 0,
        discount: historyData.discount || 0,
        vatAmount: historyData.vat_amount || 0,
        total: historyData.total_amount || historyData.net_amount || 0,
        // ขายสดไม่ใช่ดาวน์: กำหนดเป็น 0 เพื่อไม่ให้แสดงเป็นบรรทัดดาวน์
        downPayment: 0,
        documentFee: historyData.document_fee || 0,

        // กำหนดประเภทเอกสาร
        documentType: 'RECEIPT',
        invoiceType: historyData.taxType === 'รวมภาษี' || historyData.taxType === 'แยกภาษี' ? 'TAX_INVOICE' : 'RECEIPT_ONLY',

        // ข้อมูลเพิ่มเติม
        paymentMethod: historyData.payment_method || 'cash',
        notes: `สร้างจากประวัติการขาย POS - ${new Date().toLocaleString('th-TH')}`
      };

      console.log(`✅ Converted history data for PDF generation`);
      console.log(`📄 Document type: ${formattedData.invoiceType}`);

      // สร้าง PDF โดยใช้ createReceiptPdf
      return await this.createReceiptPdf(formattedData);

    } catch (error) {
      console.error('❌ Error in createReceiptPdfFromHistory:', error);
      throw new Error(`ไม่สามารถสร้าง PDF จากประวัติได้: ${error.message}`);
    }
  }

  static async createReceiptPdfFromModel(receiptId) {
    console.log('🧾 Creating Receipt PDF for ID:', receiptId);

    try {
      // ดึงข้อมูล Receipt จากฐานข้อมูล
      let receipt;

      // ลองหาด้วย _id ก่อน
      if (mongoose.Types.ObjectId.isValid(receiptId)) {
        receipt = await Receipt.findById(receiptId);
      }

      // ถ้าหาไม่เจอ ลองหาด้วย receiptNumber
      if (!receipt) {
        receipt = await Receipt.findOne({ receiptNumber: receiptId });
      }

      if (!receipt) {
        throw new Error(`Receipt not found: ${receiptId}`);
      }

      console.log('✅ Receipt found:', {
        _id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        customerName: receipt.customer?.name,
        totalAmount: receipt.summary?.totalAmount
      });

      // แปลงข้อมูล Receipt เป็นรูปแบบที่ createReceiptPdf ต้องการ
      const orderData = this._convertReceiptToOrder(receipt);

      const result = await this.createReceiptPdf(orderData);

      // คืนค่าเป็น buffer พร้อมใช้งาน (ให้สอดคล้องกับการใช้งานใน pdfRoutes.js)
      return result.buffer;

    } catch (error) {
      console.error('❌ Error creating Receipt PDF:', error);
      throw error;
    }
  }

  /**
   * สร้าง PDF ใบเสร็จ A4 แล้วส่งกลับเป็น buffer + fileName (รูปแบบเหมือน QuotationPdfController)
   * *** ฟังก์ชันนี้เป็นฟังก์ชันเดิมที่มีอยู่แล้ว เพียงแต่ปรับปรุงเล็กน้อย ***
   */
  static async printReceipt(order) {
    console.log('🧾 A4PDFController.printReceipt() called with order:', order);

    try {
      // ฟังก์ชันดึงค่าธรรมเนียมเอกสารแบบเดียวกับ step4.html
      function getDocumentFee(order) {
        try {
          // 🔧 ใช้ค่า docFee จาก order โดยตรง (รองรับ 0 บาท)
          if (order.docFee !== undefined && order.docFee !== null) {
            return ensureNumberData(order.docFee);
          }

          if (order.documentFee !== undefined && order.documentFee !== null) {
            return ensureNumberData(order.documentFee);
          }

          // ดึงจาก step3Data (ถ้าส่งมาใน order)
          if (order.step3Data?.docFee !== undefined) {
            return ensureNumberData(order.step3Data.docFee);
          }

          // ⚠️ ไม่มี fallback - แสดง warning
          console.warn('⚠️ A4PDF: DocFee not provided! Please ensure user enters document fee in step3.');
          return undefined;
        } catch (error) {
          console.warn('⚠️ Error getting document fee, using default 500:', error);
          return 500;
        }
      }

      console.log(`📄 สร้าง PDF A4 สำหรับออเดอร์: ${order?.order_number || order?._id || 'unknown'}`);

      // ตรวจสอบข้อมูลพื้นฐาน
      if (!order || typeof order !== 'object') {
        throw new Error('Missing required order information');
      }

      // Normalize order data
      order.customer    = order.customer    || {};
      // ปรับปรุงการจัดการชื่อพนักงาน - ใช้ข้อมูลจริงเท่านั้น ไม่มี fallback
      const staffName = order.staffName || order.employeeName || order.salesperson?.name;
      order.salesperson = order.salesperson || { name: staffName };
      // ใช้ข้อมูลจริงจาก staffName ถ้ามี
      if (order.staffName) {
        order.salesperson.name = order.staffName;
      }
      order.items       = Array.isArray(order.items) ? order.items : [{ description: 'รายการ', amount: order.totalAmount || 0, quantity: 1 }];
      order.branch      = order.branch      || {
        name: 'สำนักงานใหญ่',
        code: '00000',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
        taxId: '0945566000616',
        phone: '09-2427-0769'
      };
      order.company     = order.company     || { name: 'บริษัท 2 พี่น้อง โมบาย จำกัด' };

      console.log('🖋️ A4PDF Signature Data:', {
        customer: order.customerSignature ? 'Data URL' : (order.customerSignatureUrl ? 'URL' : 'None'),
        salesperson: order.employeeSignature ? 'Data URL' : (order.salespersonSignatureUrl ? 'URL' : 'None'),
        authorized: order.authorizedSignature ? 'Data URL' : (order.authorizedSignatureUrl ? 'URL' : 'None')
      });

      // 🔍 Debug: ตรวจสอบข้อมูลลายเซ็นที่ได้รับจาก Frontend
      console.log('🔍 A4PDF Raw signature data received:', {
        customerSignature: order.customerSignature ? order.customerSignature.substring(0, 50) + '...' : 'NULL',
        employeeSignature: order.employeeSignature ? order.employeeSignature.substring(0, 50) + '...' : 'NULL',
        authorizedSignature: order.authorizedSignature ? order.authorizedSignature.substring(0, 50) + '...' : 'NULL',
        customerSignatureUrl: order.customerSignatureUrl || 'NULL',
        salespersonSignatureUrl: order.salespersonSignatureUrl || 'NULL',
        authorizedSignatureUrl: order.authorizedSignatureUrl || 'NULL'
      });

      // โหลดลายเซ็นจาก Data URL หรือ file path
      const [custBuf, salesBuf, authBuf, companyStampBuf] = await Promise.all([
        this.loadSignatureBuffer(order.customerSignature || order.customerSignatureUrl).catch(() => null),
        this.loadSignatureBuffer(order.employeeSignature || order.salespersonSignatureUrl).catch(() => null),
        this.loadSignatureBuffer(order.authorizedSignature || order.authorizedSignatureUrl).catch(() => null),
        loadImageBuffer('/uploads/S__15892486-Photoroom.png').catch(() => null), // โลโก้ประทับตรา
      ]);

      console.log('🖋️ A4PDF Signature Buffers:', {
        customer: custBuf ? 'OK' : 'NULL',
        salesperson: salesBuf ? 'OK' : 'NULL',
        authorized: authBuf ? 'OK' : 'NULL',
        companyStamp: companyStampBuf ? 'OK' : 'NULL'
      });

      // เก็บลง order เพื่อให้ส่วนลายเซ็นอ่านได้
      order.customer.signature    = custBuf;
      order.salesperson.signature = salesBuf;
      order.authorizedSignature   = authBuf;
      order.companyStamp          = companyStampBuf;

      // กำหนดพาธสำหรับรูปภาพ (เหมือน QuotationPdfController)
      const logoPath = path.join(__dirname, '..', '..', 'Logo', 'Logo2png.png');

      // Generate document number first (outside Promise to use await)
      // กำหนด prefix ตามประเภทเอกสารที่ต้องการ
      let documentPrefix = 'RE'; // ใบเสร็จรับเงิน (default)
      let forceShowVAT = false; // บังคับแสดงภาษี

      // ตรวจสอบว่าต้องการสร้างเอกสารประเภทไหน
      const hasVAT = order.vatTotal > 0 ||
                     order.summary?.tax > 0 ||
                     order.taxType === 'vat' ||
                     order.taxType === 'inclusive';

      if (order.type === 'tax_invoice' || order.documentType === 'TAX_INVOICE' || order.invoiceType === 'TAX_INVOICE') {
        documentPrefix = 'TX'; // ใบกำกับภาษี
        forceShowVAT = true; // บังคับแสดงภาษีในใบกำกับภาษี
      } else if (order.type === 'receipt' || order.documentType === 'RECEIPT' || order.invoiceType === 'RECEIPT_ONLY') {
        documentPrefix = 'RE'; // ใบเสร็จรับเงิน
        forceShowVAT = false; // ไม่แสดงภาษีในใบเสร็จ
      } else if (order.documentType === 'QUOTATION') {
        documentPrefix = 'QT'; // ใบเสนอราคา
      } else if (order.documentType === 'INVOICE') {
        documentPrefix = 'INV'; // ใบแจ้งหนี้
      } else {
        // ถ้าไม่ระบุ ให้ดูจากการมีภาษี (แบบเดิม)
        if (hasVAT) {
          documentPrefix = 'TX'; // ใบกำกับภาษี
          forceShowVAT = true;
        }
      }

      console.log('🏷️ Document prefix determined:', {
        hasVAT,
        vatTotal: order.vatTotal,
        summaryTax: order.summary?.tax,
        taxType: order.taxType,
        documentPrefix
      });

      // ใช้เลขที่เอกสารที่มีอยู่แล้ว หรือสร้างใหม่
      let generatedInvoiceNo = order.invoiceNo || order.order_number;

      // ตรวจสอบและใช้เลขที่เอกสารที่ถูกต้องตามประเภท
      if (order.type === 'tax_invoice' || order.documentType === 'TAX_INVOICE') {
        // สำหรับใบกำกับภาษี ใช้ taxInvoiceNumber
        generatedInvoiceNo = order.taxInvoiceNumber || generatedInvoiceNo;
      } else if (order.type === 'receipt' || order.documentType === 'RECEIPT') {
        // สำหรับใบเสร็จ ใช้ receiptNumber
        generatedInvoiceNo = order.receiptNumber || generatedInvoiceNo;
      }

      console.log('📋 Document number resolution:', {
        'order.type': order.type,
        'order.documentType': order.documentType,
        'order.invoiceNo': order.invoiceNo,
        'order.taxInvoiceNumber': order.taxInvoiceNumber,
        'order.receiptNumber': order.receiptNumber,
        'generatedInvoiceNo': generatedInvoiceNo
      });

      if (!generatedInvoiceNo || generatedInvoiceNo.startsWith('INST')) {
        // สร้างเลขที่เอกสารใหม่ตามรูปแบบ PREFIX-YYMMDDSSS
        generatedInvoiceNo = await this.generateDocumentNumber(documentPrefix);
      }

      // Debug: ตรวจสอบข้อมูล taxType ที่ได้รับ
      console.log('🔍 A4PDF Tax Debug:', {
        taxType: order.taxType,
        documentType: order.documentType,
        docFee: order.docFee,
        staffName: order.staffName,
        salesperson: order.salesperson,
        originalData: {
          taxType: order.taxType,
          vatAmount: order.vatAmount,
          docFee: order.docFee,
          staffName: order.staffName
        }
      });

      // 1) คำนวณ Subtotal, VAT, GrandTotal ก่อนเข้า Promise โดยใช้ข้อมูลจาก taxType
      let printSubTotal = ensureNumberData(order.subTotal || order.subtotal || order.downPayment || order.total);
      let printVatTotal = 0;
      let printDocFee = getDocumentFee(order);

      // ถ้าเป็นใบเสร็จรับเงิน ไม่แสดงภาษี
      if (!forceShowVAT) {
        printVatTotal = 0;
      }

      console.log('💰 A4PDF Document Fee Calculation:', {
        orderDocFee: order.docFee,
        orderDocumentFee: order.documentFee,
        step3DocFee: order.step3Data?.docFee,
        fallbackDocFee: typeof localStorage !== 'undefined' ? localStorage.getItem('globalDocumentFee') : 'N/A',
        finalDocFee: printDocFee
      });

      // 🔧 FIX: ใช้ข้อมูลที่ sync มาจากใบเสนอราคาแทนการคำนวณใหม่
      if (order.quotationData && (order.vatTotal !== undefined || order.summary?.tax !== undefined)) {
        console.log('💰 A4PDF: ใช้ข้อมูล VAT ที่ sync มาจากใบเสนอราคา');
        printVatTotal = order.vatTotal || order.summary?.tax || 0;
        printSubTotal = order.subTotal || printSubTotal;
        if (order.grandTotal !== undefined) {
          // ถ้ามี grandTotal จากใบเสนอราคา ให้ใช้ค่านั้น
          order.grandTotal = order.grandTotal;
        } else {
          order.grandTotal = printSubTotal + printVatTotal + printDocFee;
        }
      } else {
        console.log('💰 A4PDF: คำนวณ VAT ใหม่เนื่องจากไม่มีข้อมูลใบเสนอราคา');
        // คำนวณภาษีตาม taxType ที่เลือกใน step3 (เฉพาะกรณีไม่มีใบเสนอราคา)
        if (forceShowVAT) {
          // สำหรับใบกำกับภาษี - แสดงภาษี
          if (order.taxType === 'inclusive') {
            // ราคารวมภาษีแล้ว - แยกภาษีออก
            const totalWithVat = printSubTotal;
            printSubTotal = totalWithVat / 1.07;
            printVatTotal = totalWithVat - printSubTotal;
          } else if (order.taxType === 'exclusive') {
            // 🔧 ใช้ค่าจาก step3 แทนการคำนวณ hardcode
            if (order.vatAmount !== undefined) {
              printVatTotal = order.vatAmount;
            } else {
              // Fallback: คำนวณแบบเดิม
              printVatTotal = printSubTotal * 0.07;
            }
          } else {
            // ถ้าไม่ระบุแต่บังคับแสดงภาษี ให้คำนวณ 7%
            printVatTotal = printSubTotal * 0.07;
          }
        } else {
          // สำหรับใบเสร็จรับเงิน - ไม่แสดงภาษี
          printVatTotal = 0;
        }
        order.grandTotal = printSubTotal + printVatTotal + printDocFee;
      }

      order.subTotal = printSubTotal;
      order.vatTotal = printVatTotal;
      order.docFee = printDocFee;
      // grandTotal ถูกกำหนดแล้วในส่วนการคำนวณข้างต้น

      // ตรวจสอบและแก้ไข grandTotal ถ้าไม่ถูกต้อง
      if (!order.grandTotal || isNaN(order.grandTotal) || order.grandTotal <= 0) {
        console.warn('⚠️ A4PDF: Invalid grand total, using fallback calculation');
        order.grandTotal = Math.max(order.subTotal || 0, order.totalAmount || 0, order.downPayment || 0, 500);
      }

      order.amountInWords = toThaiBahtText(order.grandTotal);

      // Debug: แสดงข้อมูลสุดท้ายก่อนสร้าง PDF
      console.log('📊 A4PDF Final order data:', {
        type: order.type,
        documentType: order.documentType,
        invoiceType: order.invoiceType,
        forceShowVAT: forceShowVAT,
        generatedInvoiceNo: generatedInvoiceNo,
        customer: order.customer?.name || 'ไม่ระบุ',
        itemsCount: order.items?.length || 0,
        subTotal: order.subTotal,
        vatTotal: order.vatTotal,
        grandTotal: order.grandTotal,
        docFee: order.docFee
      });

      // โครงสร้างแบบ QuotationPdfController
      return new Promise((resolve, reject) => {
        try {
          // --- Font Setup ---
          let boldFontPath = CONFIG.font.boldPath;
          let boldFontName = CONFIG.font.boldName;
          if (!fs.existsSync(CONFIG.font.path)) {
            console.error(`❌ Font not found: ${CONFIG.font.path}`);
            return reject(new Error(`Font not found: ${CONFIG.font.path}`));
          }
          if (!fs.existsSync(boldFontPath)) {
            boldFontName = CONFIG.font.name;
            boldFontPath = CONFIG.font.path;
          }

          // สร้าง PDF document ขนาด A4
          const doc = new PDFDocument({
            size: CONFIG.page.size,
            margins: { top: 20, bottom: 40, left: 40, right: 40 },
            autoFirstPage: true
          });

          const { width: W, height: H } = doc.page;
          let margins = doc.page.margins;

          // Check margins object
          if (!margins || typeof margins.top !== 'number' || typeof margins.bottom !== 'number' || typeof margins.left !== 'number' || typeof margins.right !== 'number') {
               const defaultMargins = { top: 50, bottom: 50, left: 50, right: 50 };
               margins = {
                  top: typeof margins?.top === 'number' ? margins.top : defaultMargins.top,
                  bottom: typeof margins?.bottom === 'number' ? margins.bottom : defaultMargins.bottom,
                  left: typeof margins?.left === 'number' ? margins.left : defaultMargins.left,
                  right: typeof margins?.right === 'number' ? margins.right : defaultMargins.right,
               };
               if (typeof margins.top !== 'number' || typeof margins.bottom !== 'number' || typeof margins.left !== 'number' || typeof margins.right !== 'number') {
                  return reject(new Error('Invalid page margins received and failed to construct valid margins.'));
               }
          }

          // Check W, H
          if (typeof W !== 'number' || typeof H !== 'number' || isNaN(W) || isNaN(H) || W <= 0 || H <= 0) {
               return reject(new Error(`Invalid page dimensions: Width=${W}, Height=${H}`));
          }

          const bodyW = W - margins.left - margins.right;
          if (isNaN(bodyW) || bodyW <= 0) {
              return reject(new Error(`Calculated invalid body width: ${bodyW}`));
          }

          // --- Buffer ---
          const chunks = [];
          doc.on('data', chunks.push.bind(chunks));
          doc.on('end', () => {
              const buffer = Buffer.concat(chunks);
              const receiptNum = order?.order_number || order?._id || Date.now();
              const fileName = `REC-${receiptNum}.pdf`;
              resolve({ buffer, fileName });
          });
          doc.on('error', (err) => {
              console.error('A4PDF stream error:', err);
              reject(err);
          });

          // --- Register Fonts ---
          doc.registerFont(CONFIG.font.name, CONFIG.font.path);
          doc.registerFont(boldFontName, boldFontPath);
          doc.font(CONFIG.font.name); // Set default

          // --- Drawing เหมือน QuotationPdfController ---
          let y = margins.top;

          // Normalize order data
          order = order || {};
          order.customer = order.customer || {};
          order.company = order.company || {};
          order.items = Array.isArray(order.items) ? order.items : [];
          order.issueDateFormatted = order.issueDate ? formatThaiDate(order.issueDate) : formatThaiDate(new Date());

          // ใช้เลขที่เอกสารที่สร้างไว้แล้ว
          const invoiceNo = generatedInvoiceNo;
          const saleDate = order.saleDate ? formatThaiDate(order.saleDate) : formatThaiDate(new Date());
          const staffName = order.staffName; // ใช้ข้อมูลจริงเท่านั้น ไม่มี fallback
          const branch = order.branch || {};
          const company = order.company || {};

          // 1. Header
          y = this._drawHeader(doc, order, margins, W, y, logoPath, company, branch);

          // 2. Customer/Receipt Info
          y = this._drawCustomerAndReceiptInfo(doc, order, margins, bodyW, y + 5, invoiceNo, saleDate, staffName);

          // 3. Items Table
          y = this._drawItemsTable(doc, order, margins, bodyW, y + 10, H) + 10;

          // 4. Summary ฝั่งขวา
          y = this._drawSummary(doc, order, margins, bodyW, y);

          // 5. วาดกล่องจำนวนเงินคำไทย
          this._drawAmountInWords(doc, order, margins, bodyW, y);

          // 6. วาดลายเซ็นก่อน (ปรับเลื่อนลงอีก 60)
          const signatureOffset = 80;    // ขยับ signature ลงอีก 40pt (เพิ่มจาก 40 เป็น 80)
          const sigY = y + signatureOffset;
          this._drawSignatures(doc, order, margins, bodyW, sigY);
          // 7. เลื่อน Y ลงหลังบล็อกลายเซ็น (ปรับเลื่อนเงื่อนไขลงอีก 40)
          const sigBlockH = 68;
 const paddingBetween = 30;      // ขยับช่องว่างระหว่างบล็อก เพิ่มเป็น 30pt (เพิ่มจาก 20)
 const termsOffset = 40;         // ขยับเงื่อนไขลงอีก 40pt (เพิ่มจาก 30)
          const termsY = sigY + sigBlockH + paddingBetween + termsOffset;
          // 8. วาดข้อกำหนดและเงื่อนไขใต้ลายเซ็น
          this._drawTerms(doc, order, margins, bodyW, termsY);
          // 9. สุดท้ายวาด Footer
          this._drawPageFooter(doc, margins, W, H);

              doc.end();

        } catch (err) {
          console.error('Error in A4PDFController.printReceipt:', err);
          reject(err);
        }
      });

    } catch (err) {
      console.error('Error in A4PDFController.printReceipt:', err);
      throw err;
    }
  }

  /** @private วาดหัวเอกสาร (รูปแบบเหมือน QuotationPdfController) */
  static _drawHeader(doc, order, margins, pageW, startY, logoPath, company, branch) {
    const fullW = pageW - margins.left - margins.right;
    const logoW = CONFIG.sizes.logo.w; // ใช้ขนาดเดียวกับ QuotationPdfController (145px)
    let logoH = 0;

    // 1) วาดโลโก้ฝั่งซ้ายสุด
    if (fs.existsSync(logoPath)) {
      try {
        const img = doc.openImage(logoPath);
        if (img && img.width && img.height) {
          logoH = (img.height * logoW) / img.width;
        } else {
          logoH = logoW * 0.6; // สัดส่วนประมาณ
        }
        doc.image(logoPath, margins.left, startY, { width: logoW });
      } catch (logoError) {
        console.warn('⚠️ ไม่สามารถโหลดโลโก้ได้:', logoError.message);
        logoH = 60; // ความสูงสำรอง
      }
    } else {
      console.warn('⚠️ ไม่พบไฟล์โลโก้:', logoPath);
      logoH = 60; // ความสูงสำรอง
    }

    // 2) กำหนดชื่อเอกสารตาม taxType และ documentType
    let titleText = 'RECEIPT';
    let thaiTitleText = 'ใบเสร็จรับเงิน';

    console.log('📋 Document type determination:', {
      'order.type': order.type,
      'order.documentType': order.documentType,
      'order.invoiceType': order.invoiceType,
      'order.taxType': order.taxType
    });

    // กำหนดตามประเภทเอกสารที่ร้องขอ (ลำดับความสำคัญ: documentType > type > invoiceType > taxType)
    if (order.documentType === 'TAX_INVOICE') {
      titleText = 'TAX INVOICE';
      thaiTitleText = 'ใบกำกับภาษี';
    } else if (order.documentType === 'RECEIPT') {
      titleText = 'RECEIPT';
      thaiTitleText = 'ใบเสร็จรับเงิน';
    } else if (order.type === 'tax_invoice') {
      titleText = 'TAX INVOICE';
      thaiTitleText = 'ใบกำกับภาษี';
    } else if (order.type === 'receipt') {
      titleText = 'RECEIPT';
      thaiTitleText = 'ใบเสร็จรับเงิน';
    } else if (order.documentType === 'QUOTATION') {
      titleText = 'QUOTATION';
      thaiTitleText = 'ใบเสนอราคา';
    } else if (order.documentType === 'INVOICE') {
      titleText = 'INVOICE';
      thaiTitleText = 'ใบแจ้งหนี้';
    } else if (order.invoiceType === 'TAX_INVOICE') {
      titleText = 'TAX INVOICE';
      thaiTitleText = 'ใบกำกับภาษี';
    } else if (order.invoiceType === 'RECEIPT_ONLY') {
      titleText = 'RECEIPT';
      thaiTitleText = 'ใบเสร็จรับเงิน';
    } else {
      // สำหรับกรณีไม่ระบุ ให้ดูจาก taxType (แบบเดิม)
      if (order.taxType === 'inclusive' || order.taxType === 'exclusive') {
        // มีภาษี = ใบกำกับภาษี
        titleText = 'TAX INVOICE';
        thaiTitleText = 'ใบกำกับภาษี';
      } else {
        // ไม่มีภาษี = ใบเสร็จรับเงิน
        titleText = 'RECEIPT';
        thaiTitleText = 'ใบเสร็จรับเงิน';
      }
    }

    console.log('📋 Final document title:', {
      titleText,
      thaiTitleText,
      determinedBy: order.type ? 'order.type' : (order.documentType ? 'order.documentType' : 'default/taxType')
    });

    // 3) วาด title ชิดขวาสุด (เลื่อนลง 30px)
    const titleFont = CONFIG.font.boldName; // ใช้ฟอนต์ที่ลงทะเบียนไว้แล้ว
    const titleSize = CONFIG.sizes.heading1;
    doc.font(titleFont).fontSize(titleSize);
    let titleW = doc.widthOfString(titleText);

    // ป้องกัน NaN
    if (isNaN(titleW) || !titleW) {
      titleW = titleText.length * 10; // fallback width estimate สำหรับฟอนต์ไทย
      console.warn('⚠️ titleW is NaN, using fallback:', titleW);
    }

    const TITLE_OFFSET = 30;

    // วาดชื่อเอกสารภาษาอังกฤษ
    doc.fillColor(CONFIG.color.primaryBlue)
       .text(
         titleText,
         margins.left + fullW - titleW,
         startY + TITLE_OFFSET
       );

    // วาดชื่อเอกสารภาษาไทย (ใต้ภาษาอังกฤษ)
    doc.font(CONFIG.font.boldName).fontSize(ensureNumberData(CONFIG.sizes.textTitle, 14));
    let thaiTitleW = doc.widthOfString(thaiTitleText);

    if (isNaN(thaiTitleW) || !thaiTitleW) {
      thaiTitleW = thaiTitleText.length * 8; // fallback width estimate สำหรับฟอนต์ไทย
    }

    // ป้องกัน NaN ในการคำนวณตำแหน่ง
    const thaiTitleX = ensureNumberData(margins.left, 50) + ensureNumberData(fullW, 500) - ensureNumberData(thaiTitleW, 100);
    const thaiTitleY = ensureNumberData(startY, 50) + ensureNumberData(TITLE_OFFSET, 30) + ensureNumberData(CONFIG.sizes.heading1, 18) + 5;

    doc.fillColor(CONFIG.color.primaryBlue)
       .text(
         thaiTitleText,
         thaiTitleX,
         thaiTitleY
       );

    // 4) คำนวณพื้นที่ตรงกลาง ระหว่างโลโก้กับ title
    const padding = 10;
    const compX = margins.left + logoW + padding;
    const compW = fullW - logoW - padding - titleW - padding;

    // 5) สร้างบรรทัดข้อมูลบริษัท
    const lines = [
      { text: company?.name || 'บริษัท 2 พี่น้อง โมบาย จำกัด',
        opts: { font: CONFIG.font.boldName, fontSize: CONFIG.sizes.heading2 } },
      ...(branch.name
        ? [{ text: `สาขา: ${branch.name} รหัสสาขา ${branch.code || '-'}`,
             opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } }]
        : []),
      ...(branch.address
        ? [{ text: branch.address, opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } }]
        : []),
      { text: `เลขประจำตัวผู้เสียภาษีอากร ${branch.taxId || '0945566000616'}`,
        opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } },
      { text: `โทร: ${branch.tel || branch.phone || '09-2427-0769'}`,
        opts: { font: CONFIG.font.name, fontSize: CONFIG.sizes.textBody } },
    ];

    // 6) วาดแต่ละบรรทัดในคอลัมน์ตรงกลาง ให้ชิดซ้าย
    let y = startY;
    lines.forEach(({ text, opts }) => {
      doc
        .font(opts.font)
        .fontSize(opts.fontSize)
        .fillColor(CONFIG.color.textDark)
        .text(text, compX, y, { width: compW, align: 'left' });
      y += doc.currentLineHeight(true) * CONFIG.sizes.lineSpacing;
    });

    // 7) คืนค่า Y ให้ส่วนถัดไปเริ่มใต้บล็อกนี้
    return Math.max(startY + logoH, y) + 10;
  }

  /** @private วาดข้อมูลลูกค้าและใบเสร็จ (รูปแบบเหมือน QuotationPdfController) */
  static _drawCustomerAndReceiptInfo(doc, order, margins, bodyW, startY, invoiceNo, saleDate, staffName) {
    // 🔧 FIX: เพิ่ม debug logs เพื่อตรวจสอบข้อมูลที่รับมา
    console.log('🔍 A4PDF _drawCustomerAndReceiptInfo - Received order data:', {
      customer: order.customer,
      customerInfo: order.customerInfo,
      downPayment: order.downPayment,
      subTotal: order.subTotal,
      totalAmount: order.totalAmount,
      total: order.total,
      items: order.items ? order.items.map(item => ({ name: item.name, amount: item.amount, price: item.price })) : 'No items'
    });

    const lineSpacing = CONFIG.sizes.lineSpacing;
    const leftColX = margins.left;
    const leftColW = bodyW * 0.55 - 10;
    const rightColX = margins.left + bodyW * 0.55 + 10;
    const rightColW = bodyW * 0.45 - 10;
    const labelW = 75;
    const valueIndent = 5;
    let leftY = startY;
    let rightY = startY;

    // 🔧 FIX: แสดงข้อมูลลูกค้าสำหรับเอกสาร installment
    // ตรวจสอบว่าเป็น installment document หรือไม่
    const isInstallmentDoc = order.saleType === 'installment' || order.receiptType?.includes('installment') || order.contractNo;

    // 🔧 FORCE SHOW: แสดงข้อมูลลูกค้าสำหรับทุกเอกสาร installment ที่มีข้อมูลลูกค้า
    if ((isInstallmentDoc || order.customer) && order.customer) {
      console.log('📋 Showing customer information for installment document');
      console.log('🔍 Customer data available:', {
        name: order.customer.name,
        taxId: order.customer.taxId,
        phone: order.customer.phone,
        address: order.customer.address
      });

      // แสดงข้อมูลลูกค้าสำหรับ installment
      const customerFields = [
        {
          label: 'ลูกค้า',
          labelEn: 'Customer',
          value: order.customer.name || order.customer.fullName || 'ไม่ระบุ'
        },
        {
          label: 'เลขประจำตัวผู้เสียภาษี',
          labelEn: 'Tax ID',
          value: order.customer.taxId || order.customer.tax_id || 'ไม่ระบุ'
        },
        {
          label: 'เบอร์โทรศัพท์',
          labelEn: 'Phone',
          value: order.customer.phone || order.customer.phone_number || 'ไม่ระบุ'
        },
        {
          label: 'ที่อยู่',
          labelEn: 'Address',
          value: order.customer.address || 'ไม่ระบุ'
        }
      ];

      // วาดข้อมูลลูกค้า
      customerFields.forEach(field => {
        const fieldStartY = leftY;
        const labelText = field.label + ' :';

        // วาดป้ายกำกับ
        doc.font('./fonts/THSarabunNew.ttf')
           .fontSize(CONFIG.sizes.textLabel)
           .fillColor(CONFIG.color.textDark)
           .text(labelText, leftColX, leftY, {
             width: labelW,
             align: 'left'
           });

        // ป้ายกำกับภาษาอังกฤษ (เล็กกว่า)
        doc.font('./fonts/THSarabunNew.ttf')
           .fontSize(CONFIG.sizes.textSmall)
           .fillColor(CONFIG.color.textLight)
           .text(field.labelEn, leftColX, leftY + 12, {
             width: labelW,
             align: 'left'
           });

        // วาดค่า - 🔧 FIX: ปรับการจัดวางที่อยู่ให้ขึ้นบรรทัดใหม่
        const valueText = field.value || 'ไม่ระบุ';
        const isAddress = field.label === 'ที่อยู่';

        if (isAddress) {
          // สำหรับที่อยู่: แยกข้อความตามคำสำคัญและขึ้นบรรทัดใหม่
          const addressParts = valueText.split(/(\s+หมู่ที่\s+|\s+ตำบล\s+|\s+อำเภอ\s+|\s+จังหวัด\s+)/);
          let currentAddressY = leftY;
          let addressLine = '';

          addressParts.forEach((part, index) => {
            if (part.includes('หมู่ที่') || part.includes('ตำบล') || part.includes('อำเภอ') || part.includes('จังหวัด')) {
              // ขึ้นบรรทัดใหม่ก่อนหน้าคำสำคัญเหล่านี้
              if (addressLine.trim()) {
                doc.font('./fonts/THSarabunNew.ttf')
                   .fontSize(CONFIG.sizes.textBody)
                   .fillColor(CONFIG.color.textBlack)
                   .text(addressLine.trim(), leftColX + labelW + valueIndent, currentAddressY, {
                     width: leftColW - labelW - valueIndent,
                     align: 'left'
                   });
                currentAddressY += 15;
                addressLine = '';
              }
            }
            addressLine += part;
          });

          // วาดบรรทัดสุดท้าย
          if (addressLine.trim()) {
            doc.font('./fonts/THSarabunNew.ttf')
               .fontSize(CONFIG.sizes.textBody)
               .fillColor(CONFIG.color.textBlack)
               .text(addressLine.trim(), leftColX + labelW + valueIndent, currentAddressY, {
                 width: leftColW - labelW - valueIndent,
                 align: 'left'
               });
          }

          leftY = currentAddressY + 25;
        } else {
          // สำหรับข้อมูลอื่น ๆ: แสดงปกติ
          doc.font('./fonts/THSarabunNew.ttf')
             .fontSize(CONFIG.sizes.textBody)
             .fillColor(CONFIG.color.textBlack)
             .text(valueText, leftColX + labelW + valueIndent, leftY, {
               width: leftColW - labelW - valueIndent,
               align: 'left'
             });
          leftY += 25;
        }
      });

      leftY += 10; // เพิ่มระยะห่าง
    } else {
      console.log('🙈 Customer information hidden for non-installment document');
    }

    // ปรับฟิลด์ตามประเภทเอกสาร
    let documentFields = [];

    if (order.documentType === 'INVOICE') {
      // สำหรับใบแจ้งหนี้ - แสดงเหมือน InvoicePdfController
      documentFields = [
        {
          label:    'เลขที่ใบเสนอราคา',
          labelEn:  'Quotation No.',
          value:    order.quotationNumber || order.quotationNo || order.number || '-'
        },
        {
          label:    'วันที่ออกใบแจ้งหนี้',
          labelEn:  'Issue Date',
          value:    saleDate || new Date().toLocaleDateString('th-TH')
        },
        {
          label:   'เงื่อนไขการชำระ',
          labelEn: 'Credit Term',
          value:   order.creditTerm || order.paymentMethod || 'ไม่ระบุ'
        },
        {
          label:   'พนักงานขาย',
          labelEn: 'Salesman',
          value:   order.employeeName || order.staffName || order.salesperson?.name || ''
        }
      ];
    } else {
      // สำหรับใบเสร็จ/ใบกำกับภาษี - แสดงแบบเดิม
      documentFields = [
      {
        label:   'เลขที่',
        labelEn: 'Receipt No.',
        value:   invoiceNo || '-'
      },
      {
        label:   'วันที่',
        labelEn: 'Issue Date',
        value:   saleDate || new Date().toLocaleDateString('th-TH')
      },
      {
        label:   'การชำระเงิน',
        labelEn: 'Payment Method',
        value:   order.paymentMethod || order.creditTerm || 'เงินสด'
      },
      {
        label:   'พนักงานขาย',
        labelEn: 'Salesman',
        value:   order.employeeName || order.staffName || order.salesperson?.name || ''
      }
    ];
    }

    const receiptFields = documentFields;

    receiptFields.forEach(field => {
      const fieldStartY = rightY;
      const labelText = field.label + ' :';
      doc.font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textBlack);
      doc.text(labelText, rightColX, rightY, { width: labelW + 5 });
      let labelH1 = ensureHeight(doc.heightOfString(labelText, { width: labelW + 5 }) * 0.8);
      let currentLabelY = rightY + labelH1;
      doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel).fillColor(CONFIG.color.textLight);
      doc.text(field.labelEn, rightColX, currentLabelY, { width: labelW });
      let labelH2 = ensureHeight(doc.heightOfString(field.labelEn, { width: labelW }));
      const labelBlockHeight = (currentLabelY - fieldStartY) + labelH2;

      doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textBody).fillColor(CONFIG.color.textDark);
      const valueX = rightColX + labelW + 5 + valueIndent;
      const valueW = rightColW - labelW - 5 - valueIndent;
      const valueStr = String(field.value);
      doc.text(valueStr, valueX, fieldStartY, { width: valueW });
      const valueHeight = ensureHeight(doc.heightOfString(valueStr, { width: valueW }));
      rightY = fieldStartY + Math.max(labelBlockHeight, valueHeight) + (CONFIG.sizes.textBody * lineSpacing * 0.7);
    });

    const bottomY = Math.max(leftY, rightY);
    if (isNaN(bottomY)) { console.error('bottomY in Customer/Receipt Info is NaN!'); return startY + 120; }
    doc.moveTo(margins.left, bottomY + 5).lineTo(margins.left + bodyW, bottomY + 5).strokeColor(CONFIG.color.lineLight).lineWidth(0.5).stroke();
    return bottomY + 10;
  }

  /** @private วาดตารางรายการสินค้า (รูปแบบเหมือน QuotationPdfController) */
  static _drawItemsTable(doc, order, margins, bodyW, startY, pageH) {
    const leftX = margins.left;
    const headerH = 30;
    const cols = { ...CONFIG.layout.tableCols };
    let currentY = startY;

    const padH = 5;
    const defaultPadV = 4;

    // ตรวจสอบประเภทเอกสาร
    const documentType = order.documentType || 'RECEIPT';
    const invoiceType = order.invoiceType || 'RECEIPT';

    // --- Header row ---
    doc.rect(leftX, currentY, bodyW, headerH).fill(CONFIG.color.bgAccent);

    let headers;
    if (documentType === 'QUOTATION' || documentType === 'INVOICE' || order.useItemizedLayout === true) {
      // ใบเสนอราคา/ใบแจ้งหนี้: แสดงตารางแบบเต็ม
      headers = [
        { th: 'ลำดับ',            en: 'No',           key: 'no',    align: 'center' },
        { th: 'รายการ',           en: 'Description',  key: 'desc',  align: 'left'   },
        { th: 'จำนวน',            en: 'Quantity',     key: 'qty',   align: 'center' },
        { th: 'ราคา/หน่วย',       en: 'Unit Price',   key: 'unit',  align: 'right'  },
        { th: 'ส่วนลด',           en: 'Discount',     key: 'disc',  align: 'right'  },
        { th: 'จำนวนเงิน (บาท)',  en: 'Amount',       key: 'amt',   align: 'right'  }
      ];
    } else {
      // ใบเสร็จรับเงิน/ใบกำกับภาษี: แสดงตารางแบบง่าย
      headers = [
        { th: 'ลำดับ',            en: 'No',           key: 'no',    align: 'center' },
        { th: 'รายการ',           en: 'Description',  key: 'desc',  align: 'left'   },
        { th: 'จำนวนเงิน (บาท)',  en: 'Amount',       key: 'amt',   align: 'right'  }
      ];
      // ปรับ columns สำหรับแบบง่าย
      cols.desc = bodyW - cols.no - cols.amt;
      cols.qty = 0;
      cols.unit = 0;
      cols.disc = 0;
    }

    let currentX = leftX;
    const headerPaddingV = 5;
    const thY = currentY + headerPaddingV;
    const enY = thY + CONFIG.sizes.tableHeader * 0.9 + 2;
    doc.fillColor(CONFIG.color.textHeader);

    headers.forEach(h => {
      const colWidth = cols[h.key];
      if (colWidth > 0) {
        doc
          .font(CONFIG.font.boldName).fontSize(CONFIG.sizes.textBody)
          .text(
            h.th,
            currentX + padH,
            thY,
            { width: colWidth - 2*padH, align: h.align }
          );
        doc
          .font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel)
          .text(
            h.en,
            currentX + padH,
            enY,
            { width: colWidth - 2*padH, align: h.align }
          );
        currentX += colWidth;
      }
    });

    currentY += headerH;
    doc.moveTo(leftX, currentY).lineTo(leftX + bodyW, currentY).strokeColor(CONFIG.color.lineDark).lineWidth(0.7).stroke();

    // --- Data rows ---
      doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.tableRow)
         .fillColor(CONFIG.color.textDark);

    if (documentType === 'QUOTATION' || documentType === 'INVOICE') {
      // ใบเสนอราคา/ใบแจ้งหนี้: แสดงรายการสินค้าแบบละเอียด
      order.items.forEach((item, i) => {
        const desc = item.description || item.name || '-';

        doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.tableRow);
        const descW = cols.desc - 2 * padH;
        const descHeight = doc.heightOfString(desc, { width: descW });

        let imeiHeight = 0;
        if (item.imei) {
          doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.textLabel);
          imeiHeight = doc.heightOfString(`IMEI: ${item.imei}`, { width: descW });
        }

        const contentH = descHeight + imeiHeight;
        const rowH = Math.max(26, contentH + defaultPadV * 2);

        const qty   = ensureNumberData(item.quantity || item.qty || 1);
        const unit  = ensureNumberData(item.unitPrice || item.price || 0);
        const disc  = ensureNumberData(item.discount || 0);
        const amt   = ensureNumberData(item.amount || (qty * unit - disc));

        const y = currentY + (rowH - contentH) / 2;

        let x = leftX;
        doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.tableRow).fillColor(CONFIG.color.textDark);
        doc.text(i + 1, x, y, { width: cols.no, align: 'center' });
        x += cols.no;

        const descX = x + padH;
        doc
          .font(CONFIG.font.name)
          .fontSize(CONFIG.sizes.tableRow)
          .fillColor(CONFIG.color.textDark)
          .text(desc, descX, y, {
            width: descW,
            align: 'left'
          });

        if (item.imei) {
          const imeiY = y + descHeight;
          doc
            .font(CONFIG.font.name)
            .fontSize(CONFIG.sizes.textLabel)
            .fillColor(CONFIG.color.textLight)
            .text(`IMEI: ${item.imei}`, descX, imeiY, {
              width: descW,
              align: 'left'
            });
        }
        x += cols.desc;

        doc.font(CONFIG.font.name).fontSize(CONFIG.sizes.tableRow).fillColor(CONFIG.color.textDark);
        doc.text(qty, x, y, { width: cols.qty, align: 'center' });
        x += cols.qty;

        doc.text(unit.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
          width: cols.unit - padH, align: 'right'
        });
        x += cols.unit;

        doc.text(disc.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
          width: cols.disc - padH, align: 'right'
        });
        x += cols.disc;

        doc.text(amt.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
          width: cols.amt - padH, align: 'right'
        });

        currentY += rowH;
        doc.moveTo(leftX, currentY)
           .lineTo(leftX + bodyW, currentY)
       .strokeColor(CONFIG.color.lineLight)
           .lineWidth(0.5)
       .stroke();
      });

      // เพิ่มรายการค่าเอกสาร
      const docFee = ensureNumberData(order.docFee ?? order.documentFee ?? 0); // 🔧 ไม่มี fallback 500
      if (docFee > 0) {
        let x = leftX;
        const rowH = 26;
        const y = currentY + defaultPadV;

        doc.text(order.items.length + 1, x, y, { width: cols.no, align: 'center' });
        x += cols.no;

        doc.text('ค่าธรรมเนียมเอกสาร', x + padH, y, {
          width: cols.desc - 2 * padH, align: 'left'
        });
        x += cols.desc;

        doc.text('1', x, y, { width: cols.qty, align: 'center' });
        x += cols.qty;

        doc.text(
          docFee.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          x, y,
          { width: cols.unit - padH, align: 'right' }
        );
        x += cols.unit;

        doc.text('-', x, y, { width: cols.disc, align: 'right' });
        x += cols.disc;

        doc.text(docFee.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
          width: cols.amt - padH, align: 'right'
        });
        currentY += rowH;
        doc.moveTo(leftX, currentY)
           .lineTo(leftX + bodyW, currentY)
       .strokeColor(CONFIG.color.lineLight)
           .lineWidth(0.5)
       .stroke();
      }

    } else {
      // ใบเสร็จรับเงิน/ใบกำกับภาษี: แสดงแบบง่าย
      const rowH = 26;
      const y = currentY + defaultPadV;
      // 🔧 FIX: ปรับปรุงการดึงยอดเงินดาวน์ให้ครอบคลุมทุกแหล่งข้อมูล
      const downPayment = order.downPayment ||
                         order.subTotal ||
                         order.totalAmount ||
                         order.total ||
                         order.grandTotal ||
                         (order.items && order.items.length > 0 ? order.items[0].amount || order.items[0].price : 0) ||
                         0;

      // 🔧 FIX: เพิ่ม debug logs เพื่อตรวจสอบการคำนวณยอดเงิน
      const finalDownPayment = downPayment; // 🔧 สร้างตัวแปรสำหรับใช้ใน map function

      console.log('🔍 A4PDF _drawItemsTable - Payment calculation:', {
        orderDownPayment: order.downPayment,
        orderSubTotal: order.subTotal,
        orderTotalAmount: order.totalAmount,
        orderTotal: order.total,
        orderGrandTotal: order.grandTotal,
        firstItemAmount: order.items && order.items.length > 0 ? order.items[0].amount : 'No items',
        finalDownPayment: finalDownPayment
      });

      // สร้างรายการสินค้าพร้อม IMEI - แสดงชื่อสินค้าจริงสำหรับ installment
      let itemsDescription = '';

      // 🔧 ปรับปรุงการแสดงรายการสินค้าสำหรับ installment - แยกตามประเภทเอกสาร
      const isInstallmentDoc = order.saleType === 'installment' || order.receiptType?.includes('installment') || order.contractNo;
      const isTaxInvoice = order.documentType === 'TAX_INVOICE';
      const isReceipt = order.documentType === 'RECEIPT';

      if (isInstallmentDoc && order.items && order.items.length > 0) {
        console.log('📋 Processing installment items for display...');

        const itemsList = order.items.map(item => {
          let itemName = item.name || item.description || 'สินค้า';
          let itemAmount = item.amount || item.totalPrice || item.price || 0;

          console.log('🔍 Processing item:', {
            name: itemName,
            description: item.description,
            amount: itemAmount,
            documentType: order.documentType
          });

          // แยกชื่อสินค้าจากข้อความ "ค่าดาวน์"
          if (itemName.includes('ค่าดาวน์')) {
            // รูปแบบ: "ค่าดาวน์ (IPAD GEN10 256GB PINK (IMEI: SHPVPG3HJY9))" -> "IPAD GEN10 256GB PINK"

            // ลองดึงข้อความในวงเล็บแรกหลัง "ค่าดาวน์"
            const mainMatch = itemName.match(/ค่าดาวน์\s*\((.*)\)/);
            if (mainMatch) {
              let productInfo = mainMatch[1].trim();

              // ถ้ามี IMEI ในวงเล็บซ้อน ให้ตัดออก
              // เช่น "IPAD GEN10 256GB PINK (IMEI: SHPVPG3HJY9)" -> "IPAD GEN10 256GB PINK"
              productInfo = productInfo.replace(/\s*\(IMEI:.*?\)\s*$/, '').trim();

              // ตรวจสอบว่าเป็นชื่อสินค้าจริงหรือไม่
              if (productInfo &&
                  !productInfo.includes('งานการค้าผ่อนชำระ') &&
                  !productInfo.includes('ใบเสร็จ') &&
                  !productInfo.includes('ใบกำกับภาษี') &&
                  productInfo.length >= 3) {
                itemName = productInfo;
                console.log('✅ Extracted product name from down payment:', itemName);
              } else {
                itemName = 'ค่าดาวน์';
              }
            } else {
              itemName = 'ค่าดาวน์';
            }
          }

          // ถ้าชื่อสินค้ายังเป็น "down_payment" หรือ generic ให้ลองหาจากที่อื่น
          if (itemName === 'down_payment' || itemName === 'สินค้า') {
            // ลองหาจาก description อีกครั้ง
            const fallbackName = item.description || item.name;
            itemName = fallbackName || 'ค่าดาวน์';
          }

          // 🔧 FIX: แยกการแสดงราคาตามประเภทเอกสาร
          if (isReceipt) {
            // ใบเสร็จ: แสดงเฉพาะค่าดาวน์ 500 บาท
            itemAmount = finalDownPayment;
            console.log('💰 Receipt - showing down payment amount:', itemAmount);
          } else if (isTaxInvoice) {
            // ใบกำกับภาษี: แสดงราคา 10,500 บาท (ก่อน VAT แต่รวมค่าธรรมเนียม)
            itemAmount = (order.subTotal || 0) + (order.docFee || 0);
            if (itemAmount === 0) {
              // fallback: ใช้ยอดรวมก่อน VAT
              itemAmount = finalDownPayment;
            }
            console.log('💰 Tax Invoice - showing subtotal + docFee (before VAT):', itemAmount);
          }

          console.log('✅ Cleaned item name:', itemName);
          console.log('📄 Final item:', { name: itemName, amount: itemAmount });

          return {
            name: `${itemName}${item.imei ? ` (IMEI: ${item.imei})` : ''}`,
            amount: itemAmount
          };
        });

        itemsDescription = itemsList.map(item => item.name).join(', ');

      } else if (order.items && order.items.length > 0) {
        // สำหรับ order ปกติ
        const itemsList = order.items.map(item => {
          let itemName = item.name || item.description || 'สินค้า';
          console.log('📄 Final item name:', itemName);
          return `${itemName}${item.imei ? ` (IMEI: ${item.imei})` : ''}`;
        });
        itemsDescription = itemsList.join(', ');
      }

      // ถ้ายังไม่มีชื่อสินค้า ให้ใช้ค่าเริ่มต้น
      if (!itemsDescription || itemsDescription.trim() === '') {
        itemsDescription = 'ยอดรวมสินค้า';
      }

      // 🔧 FIX: แสดงยอดเงินที่ถูกต้องตามประเภทเอกสาร
      let displayAmount = downPayment;
      if (isReceipt && order.downPaymentAmount) {
        // ใบเสร็จ: แสดงค่าดาวน์ 500 บาท
        displayAmount = order.downPaymentAmount;
        console.log('💰 Receipt - displaying down payment amount:', displayAmount);
      } else if (isTaxInvoice) {
        // ใบกำกับภาษี: แสดงราคาเต็มของสินค้า รวมค่าธรรมเนียม (ก่อน VAT)
        // 10,500 = subtotal + docFee = 10,000 + 500
        displayAmount = (order.summary?.subtotal || 0) + (order.summary?.docFee || 0);
        if (displayAmount === 0) {
          // fallback: ใช้ยอดรวมหัก VAT
          displayAmount = (order.summary?.totalWithTax || 0) - (order.summary?.vatAmount || 0);
        }
        console.log('💰 Tax Invoice - displaying full product price + docFee (before VAT):', displayAmount);
      }

      let x = leftX;
      doc.text('1', x, y, { width: cols.no, align: 'center' });
      x += cols.no;

      doc.text(itemsDescription, x + padH, y, {
        width: cols.desc - 2 * padH, align: 'left'
      });
      x += cols.desc;

      doc.text(displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }), x, y, {
        width: cols.amt - padH, align: 'right'
      });

      currentY += rowH;
      doc.moveTo(leftX, currentY)
         .lineTo(leftX + bodyW, currentY)
       .strokeColor(CONFIG.color.lineLight)
         .lineWidth(0.5)
       .stroke();

      // หมายเหตุ: แสดงค่าเอกสารเฉพาะเมื่อมีจริง (> 0)
      const documentFee = order.documentFee ?? order.docFee ?? 0; // 🔧 ไม่มี fallback 500
      if (ensureNumberData(documentFee) > 0) {
        currentY += 10;
        doc.font(CONFIG.font.name)
             .fontSize(CONFIG.sizes.textSmall)
             .fillColor(CONFIG.color.textLight)
             .text(`*ค่าเอกสาร ${documentFee.toLocaleString('th-TH')} บาท`, leftX + padH, currentY);
        currentY += 15;
      }
    }

    return currentY;
  }

  /** @private วาดสรุปยอดและจำนวนเงินตัวอักษร */
  static _drawSummaryAndAmountInWords(doc, order, margins, bodyW, startY) {
    console.log('📊 Drawing summary and amount in words...');

    const rightAlign = margins.left + bodyW;
    const lineHeight = 18;
    const summaryWidth = 200;
    let currentY = startY;

    // 🔧 ปรับปรุงการคำนวณยอดรวม สำหรับ installment
    let subtotal, docFee, discount, afterDiscount, vatAmount, finalTotal;

    // ตรวจสอบว่าเป็น installment document หรือไม่
    const isInstallmentDoc = order.saleType === 'installment' || order.receiptType?.includes('installment') || order.contractNo;

    if (isInstallmentDoc) {
      // สำหรับ installment: ใช้ข้อมูลจาก summary หรือ calculation โดยตรง
      console.log('💰 Processing installment document totals...');

      // 🔧 FIX: ใช้ข้อมูลเดียวกันสำหรับทั้งใบเสร็จและใบกำกับภาษี
      // ลำดับความสำคัญ: summary > calculation > fallback
      subtotal = parseFloat(order.summary?.subtotal) ||
                parseFloat(order.calculation?.subtotal) ||
                parseFloat(order.subTotal) || 0;

      docFee = parseFloat(order.summary?.docFee) ||
               parseFloat(order.calculation?.documentFee) ||
               parseFloat(order.docFee) || 0;

      discount = parseFloat(order.summary?.discount) ||
                parseFloat(order.calculation?.discount) ||
                parseFloat(order.discount) || 0;

      afterDiscount = parseFloat(order.summary?.beforeTax) ||
                     parseFloat(order.calculation?.beforeTax) ||
                     (subtotal + docFee - discount);

      vatAmount = parseFloat(order.summary?.vatAmount) ||
                 parseFloat(order.calculation?.vatAmount) ||
                 parseFloat(order.vatAmount) || 0;

      finalTotal = parseFloat(order.summary?.totalWithTax) ||
                  parseFloat(order.calculation?.totalAmount) ||
                  parseFloat(order.summary?.total) ||
                  parseFloat(order.totalWithTax) ||
                  parseFloat(order.totalAmount) ||
                  parseFloat(order.total) || 0;

      // 🔧 FIX: ถ้ายังไม่มียอดรวม ลองใช้จาก downPaymentAmount (สำหรับใบเสร็จ)
      if (finalTotal === 0 && order.downPaymentAmount) {
        finalTotal = parseFloat(order.downPaymentAmount);
        // คำนวณ subtotal ย้อนหลัง (ตัดค่าธรรมเนียมและ VAT ออก)
        if (vatAmount > 0) {
          // มี VAT: ตัด VAT และค่าธรรมเนียมออก
          subtotal = finalTotal - vatAmount - docFee;
          afterDiscount = finalTotal - vatAmount;
        } else {
          // ไม่มี VAT: ตัดค่าธรรมเนียมออก
          subtotal = finalTotal - docFee;
          afterDiscount = finalTotal;
        }
      }

      // 🔧 FIX: สำหรับใบกำกับภาษี - ตรวจสอบว่าเป็น Tax Invoice หรือไม่
      const isTaxInvoice = order.documentType === 'TAX_INVOICE';
      const isReceipt = order.documentType === 'RECEIPT';

      if (isTaxInvoice) {
        // ใบกำกับภาษี: ราคาเต็ม = 10,000 + VAT 7% = 700 + ค่าธรรมเนียม 500 = 11,200
        // แต่ในกรณีนี้รวม = 11,000 ดังนั้น subtotal = 10,000, VAT = 700, docFee = 500

        // คำนวณใหม่จากยอดรวมสุดท้าย 11,000
        if (finalTotal > 0) {
          // ตัดค่าธรรมเนียมออกก่อน: 11,000 - 500 = 10,500
          const totalBeforeDocFee = finalTotal - docFee;
          // คำนวณ subtotal และ VAT จากยอดนี้: 10,500 / 1.07 = 9,813.08
          subtotal = Math.round((totalBeforeDocFee / 1.07) * 100) / 100;
          // VAT = 9,813.08 * 0.07 = 686.92
          vatAmount = Math.round((subtotal * 0.07) * 100) / 100;
          // afterDiscount = subtotal + docFee = 9,813.08 + 500 = 10,313.08
          afterDiscount = subtotal + docFee;
        }
        console.log('💰 Tax Invoice calculation - VAT included properly');
      } else if (isReceipt) {
        // ใบเสร็จ: แสดงเฉพาะเงินดาวน์ 500 บาท ไม่มี VAT ไม่มีค่าธรรมเนียม
        if (order.downPaymentAmount && order.downPaymentAmount > 0) {
          finalTotal = parseFloat(order.downPaymentAmount); // 500
          subtotal = finalTotal; // 500 (ไม่มีค่าธรรมเนียมในใบเสร็จ)
          afterDiscount = finalTotal; // 500
          docFee = 0; // ใบเสร็จไม่มีค่าธรรมเนียม
          vatAmount = 0; // ใบเสร็จไม่มี VAT
        }
        console.log('💰 Receipt calculation - down payment only, no fees');
      }

      console.log('💰 Installment totals:', {
        subtotal, docFee, discount, afterDiscount, vatAmount, finalTotal,
        fromSummary: !!order.summary,
        fromCalculation: !!order.calculation,
        fromDownPayment: !!order.downPaymentAmount,
        documentType: order.documentType,
        isTaxInvoice: isTaxInvoice
      });

    } else {
      // สำหรับ order ปกติ: คำนวณจาก items
      subtotal = Array.isArray(order.items)
        ? order.items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || parseFloat(item.amount) || parseFloat(item.price) || 0), 0)
        : parseFloat(order.subTotal) || parseFloat(order.total) || 0;

      docFee = parseFloat(order.docFee) || 0;
      discount = parseFloat(order.discount) || 0;
      afterDiscount = subtotal + docFee - discount;
      vatAmount = parseFloat(order.vatAmount) || 0;
      finalTotal = parseFloat(order.totalWithTax) || afterDiscount;
    }

    // Fallback: คำนวณภาษีเฉพาะเมื่อไม่มีข้อมูลจาก step3
    if (!vatAmount && !order.totalWithTax && order.taxType) {
      console.warn('⚠️ A4PDF: No step3 tax data found, calculating manually...');
      if (order.taxType === 'inclusive') {
        // ราคารวมภาษีแล้ว - แยกภาษีออก
        vatAmount = Math.round((afterDiscount / 1.07) * 0.07 * 100) / 100;
        finalTotal = afterDiscount; // ราคาเดิมคือราคารวมภาษีแล้ว
      } else if (order.taxType === 'exclusive' || order.taxType === 'vat') {
        // ราคาไม่รวมภาษี - เพิ่มภาษี 7%
        vatAmount = Math.round(afterDiscount * 0.07 * 100) / 100;
        finalTotal = afterDiscount + vatAmount;
      } else {
        // ไม่มีภาษี
        vatAmount = 0;
        finalTotal = afterDiscount;
      }
    }

    // สร้าง summary data
    const summaryItems = [
      { label: 'รวมเงิน', value: subtotal, format: 'currency' },
      { label: 'ค่าธรรมเนียมเอกสาร', value: docFee, format: 'currency' },
      { label: 'ส่วนลด', value: discount, format: 'currency' },
      { label: 'ยอดรวมหลังหักส่วนลด', value: afterDiscount, format: 'currency', separator: true }
    ];

    // เพิ่มภาษีถ้ามี
    if (vatAmount > 0) {
      summaryItems.push({
        label: 'ภาษีมูลค่าเพิ่ม 7%',
        value: vatAmount,
        format: 'currency'
      });
    }

    // ราคารวมทั้งหมด (สุดท้าย)
    summaryItems.push({
      label: 'ราคารวมทั้งหมด',
      value: finalTotal,
      format: 'currency',
      bold: true,
      separator: true
    });

    console.log('💰 A4PDF summary calculation:', {
      subtotal,
      docFee,
      discount,
      afterDiscount,
      vatAmount,
      finalTotal,
      taxType: order.taxType
    });

    // วาดรายการสรุป
    summaryItems.forEach((item, index) => {
      if (item.separator && index > 0) {
        currentY += 5;
        doc.moveTo(rightAlign - summaryWidth, currentY)
           .lineTo(rightAlign, currentY)
           .stroke();
        currentY += 10;
      }

      const fontSize = item.bold ? 12 : 10;
      const fontWeight = item.bold ? 'bold' : 'normal';

      // ป้ายกำกับ
      doc.font('./fonts/THSarabunNew.ttf')
         .fontSize(fontSize)
         .text(item.label, rightAlign - summaryWidth, currentY, {
           width: summaryWidth - 80,
           align: 'left'
         });

      // จำนวนเงิน
      const valueText = item.format === 'currency'
        ? `฿${item.value.toLocaleString('th-TH', {minimumFractionDigits: 2})}`
        : item.value.toString();

      doc.font(fontWeight === 'bold' ? './fonts/THSarabunNew Bold.ttf' : './fonts/THSarabunNew.ttf')
         .text(valueText, rightAlign - 75, currentY, {
           width: 75,
           align: 'right'
         });

      currentY += lineHeight;
    });

    // เส้นขีดใต้สุดท้าย
    currentY += 5;
    doc.moveTo(rightAlign - summaryWidth, currentY)
       .lineTo(rightAlign, currentY)
       .lineWidth(2)
       .stroke()
       .lineWidth(1);

    currentY += 20;

    // จำนวนเงินตัวอักษร
    const amountInWords = this.convertNumberToThaiWords(finalTotal);

    doc.font('./fonts/THSarabunNew Bold.ttf')
       .fontSize(11)
       .fillColor('#000000')
       .text('จำนวนเงิน (ตัวอักษร):', margins.left, currentY);

    currentY += 20;

    doc.font('./fonts/THSarabunNew.ttf')
       .fontSize(10)
       .text(`${amountInWords}`, margins.left, currentY, {
         width: bodyW,
         align: 'left'
       });

    return currentY + 30;
  }

  /** @private วาดหมายเหตุ */
  static _drawNotes(doc, margins, bodyW, startY) {
    // ลบข้อความ "ขอบคุณที่ใช้บริการ - Thank you for your business" ออก

    console.log('📝 Drawing notes section...');

    let currentY = startY;

    // เพิ่มหมายเหตุทั่วไป (ถ้ามี)
    doc.font('./fonts/THSarabunNew Bold.ttf')
       .fontSize(10)
       .fillColor('#374151')
       .text('หมายเหตุ:', margins.left, currentY);

    currentY += 15;

    const notes = [
      '• กรุณาเก็บใบเสร็จนี้ไว้เป็นหลักฐานการชำระเงิน',
      '• สินค้าที่จำหน่ายแล้วไม่สามารถคืนหรือเปลี่ยนได้',
    ];

    notes.forEach(note => {
      doc.font('./fonts/THSarabunNew.ttf')
         .fontSize(9)
         .fillColor('#6B7280')
         .text(note, margins.left, currentY);
      currentY += 12;
    });

    return currentY + 10;
  }

  /** @private วาดส่วนลายเซ็น (รูปแบบเหมือน QuotationPdfController) */
  static _drawSignatures(doc, order, margins, bodyW, startY) {
    const sigBlockH = 68; // ลดจาก 70 เป็น 68 เพื่อไม่ให้หลุดหน้า
    const colW = bodyW / 3;
    const sigLineW = colW * 0.8;
    const sigLineXOffset = (colW - sigLineW) / 2;
    const lineY = startY + 18; // ลดจาก 20 เป็น 18
    const imgH = 45; // คงเดิม
    const imgPad = 6; // ลดจาก 8 เป็น 6

    const colsData = [
      { label: 'ลูกค้า',        labelEn: 'Customer Signature',   key: 'customer.signature' },
      { label: 'พนักงานขาย',     labelEn: 'Salesperson',          key: 'salesperson.signature' },
      { label: 'ผู้อนุมัติ',      labelEn: 'Authorized Signature', key: 'companyStamp' }
    ];

    const currentDateThai = formatThaiDate(new Date().toISOString());

    colsData.forEach((col, i) => {
      const x0 = margins.left + colW * i;
      const sigBuffer = col.key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), order);

      const imgX = x0 + sigLineXOffset;
      const imgY = lineY - imgH - imgPad;

      let signatureDrawn = false;
      if (Buffer.isBuffer(sigBuffer)) {
        try {
          doc.image(sigBuffer, imgX, imgY, { fit: [sigLineW, imgH], align: 'center', valign: 'bottom' });
          signatureDrawn = true;
        } catch (e) {
          console.warn(`⚠️ Error drawing signature ${col.label}:`, e.message);
        }
      }

      if (!signatureDrawn) {
        const lineX = x0 + sigLineXOffset;
        doc.moveTo(lineX, lineY)
           .lineTo(lineX + sigLineW, lineY)
           .strokeColor(CONFIG.color.sigLine)
           .stroke();
      }

      let textY = lineY + imgPad + 3; // ลดระยะห่างจากเส้นเป็น 3
      doc
        .font(CONFIG.font.boldName)
        .fontSize(CONFIG.sizes.textLabel)
        .fillColor(CONFIG.color.textDark)
        .text(col.label, x0, textY, { width: colW, align: 'center' });

      textY += 10; // ลดกลับเป็น 10
      doc
        .font(CONFIG.font.name)
        .fontSize(CONFIG.sizes.textSmall)
        .fillColor(CONFIG.color.textLight)
        .text(col.labelEn, x0, textY, { width: colW, align: 'center' });

      textY += 10; // ลดกลับเป็น 10
      doc
        .font(CONFIG.font.name)
        .fontSize(CONFIG.sizes.textSmall)
        .fillColor(CONFIG.color.textLight)
        .text(currentDateThai, x0, textY, { width: colW, align: 'center' });
    });

    // วาดเส้นคั่นระหว่างคอลัมน์
    doc.save()
       .moveTo(margins.left + colW, startY + 5)
       .lineTo(margins.left + colW, startY + sigBlockH - 5)
       .moveTo(margins.left + 2*colW, startY + 5)
       .lineTo(margins.left + 2*colW, startY + sigBlockH - 5)
       .strokeColor(CONFIG.color.lineLight)
       .lineWidth(0.5)
       .stroke()
       .restore();
  }



  /** @private จัดรูปแบบที่อยู่ */
  static _formatAddress(address) {
    if (!address) return '-';
    if (typeof address === 'string') return address;

    // รองรับฟิลด์ที่อาจมีชื่อต่างกัน
    const parts = [
      address.houseNo || address.house_no || address.address_no,
      address.moo || address.village_no ? `หมู่ ${address.moo || address.village_no}` : '',
      address.lane || address.soi ? `ซอย ${address.lane || address.soi}` : '',
      address.road || address.street ? `ถนน ${address.road || address.street}` : '',
      address.subDistrict || address.sub_district || address.tambon ? `ตำบล ${address.subDistrict || address.sub_district || address.tambon}` : '',
      address.district || address.amphoe ? `อำเภอ ${address.district || address.amphoe}` : '',
      address.province || address.changwat ? `จังหวัด ${address.province || address.changwat}` : '',
      address.zipcode || address.zip_code || address.postal_code
    ].filter(part => part && part.toString().trim());

    return parts.length > 0 ? parts.join(' ') : '-';
  }

  /**
   * สร้างข้อมูลตัวอย่างสำหรับทดสอบ
   */
  static createSampleOrder(overrides = {}) {
    return {
      order_number: 'REC-' + Date.now(),
      invoiceNo: 'INV-' + Date.now(),
      saleDate: new Date(),
      staffName: 'ทดสอบ พนักงาน',
      invoiceType: 'RECEIPT',
      customerType: 'individual',
      customer: {
        prefix: '',
        firstName: '',
        lastName: '',
        phone: '',
        taxId: '',
        address: {
          houseNo: '123',
          moo: '5',
          lane: 'ซอยทดสอบ',
          road: 'ถนนทดสอบ',
          subDistrict: 'ตำบลทดสอบ',
          district: 'อำเภอทดสอบ',
          province: 'จังหวัดทดสอบ',
          zipcode: '12345'
        }
      },
      company: {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
      },
      branch: {
        name: 'สาขาทดสอบ',
        code: '00000',
        address: 'สาขา: สำนักงานใหญ่ รหัสสาขา 00000\n148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
        taxId: '0945566000616',
        tel: '09-2427-0769'
      },
      items: [
        {
          name: 'Samsung Galaxy A55 5G',
          imei: '123456789012345',
          price: 15990,
          qty: 1
        },
        {
          name: 'ฟิล์มกันรอย',
          imei: '',
          price: 290,
          qty: 1
        }
      ],
      subTotal: 16280,
      vatAmount: 0,
      discount: 0,
      total: 16280,
      ...overrides
    };
  }

  /**
   * ดึงข้อมูลออเดอร์จริงจากฐานข้อมูลสำหรับสร้าง PDF
   * @param {string} orderId - ID ของออเดอร์
   * @param {string} orderType - ประเภทออเดอร์ ('cashSale', 'order', 'installment')
   * @returns {Object} ข้อมูลออเดอร์ที่จัดรูปแบบสำหรับสร้าง PDF
   */
  static async getOrderForPDF(orderId, orderType = 'order') {
    try {
      console.log(`🔍 ดึงข้อมูลออเดอร์: ${orderId}, ประเภท: ${orderType}`);

      let orderData = null;
      let customerData = null;
      let branchData = null;

      switch (orderType.toLowerCase()) {
        case 'cashsale':
          orderData = await CashSale.findById(orderId).populate('customer salesperson');
          if (orderData && orderData.customer) {
            customerData = orderData.customer;
          }
          break;

        case 'installment':
          try {
            orderData = await InstallmentOrder.findById(orderId).populate('customer');
            if (orderData && orderData.customer) {
              customerData = orderData.customer; // ได้จาก populate แล้ว
            } else if (orderData) {
              // Fallback: ใช้ข้อมูลจาก customer_info
              console.warn('⚠️ ไม่มีข้อมูล customer populated, ใช้ customer_info แทน');
              customerData = null; // จะใช้ customer_info ใน formatOrderForPDF
            }
          } catch (populateError) {
            console.error('❌ Populate customer error:', populateError.message);
            // Fallback: ดึงข้อมูลโดยไม่ populate
            orderData = await InstallmentOrder.findById(orderId);
            customerData = null; // จะใช้ customer_info ใน formatOrderForPDF
          }
          break;

        case 'order':
        default:
          orderData = await Order.findById(orderId).populate('customer_id');
          if (orderData) {
            // ดึงรายการสินค้า
            orderData.items = await OrderItem.find({ order_id: orderId });
            // ดึงข้อมูลลูกค้า
            if (orderData.customer_id) {
              customerData = await Customer.findById(orderData.customer_id);
            }
          }
          break;
      }

      if (!orderData) {
        throw new Error(`ไม่พบข้อมูลออเดอร์ ID: ${orderId}`);
      }

      // ดึงข้อมูลสาขา
      const branchCode = orderData.branch_code || orderData.branchCode || '00001';
      branchData = await Branch.findOne({ branch_code: branchCode });

      // แปลงข้อมูลให้อยู่ในรูปแบบที่ PDF สามารถใช้ได้
      const formattedOrder = await this.formatOrderForPDF(orderData, customerData, branchData, orderType);

      console.log(`✅ ดึงข้อมูลออเดอร์สำเร็จ: ${orderId}`);
      return formattedOrder;

    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์: ${error.message}`);
      throw error;
    }
  }

  /**
   * จัดรูปแบบข้อมูลออเดอร์ให้พร้อมสำหรับสร้าง PDF
   */
  static async formatOrderForPDF(orderData, customerData, branchData, orderType) {
    try {
      // ข้อมูลพื้นฐานของออเดอร์
      const formattedOrder = {
        _id: orderData._id,
        order_number: orderData.order_number || orderData.invoiceNo || orderData.contractNo || `${orderType.toUpperCase()}_${orderData._id}`,
        invoiceNo: orderData.invoiceNo || orderData.order_number || orderData.contractNo,
        invoiceType: orderData.invoiceType || 'RECEIPT',
        saleDate: orderData.soldAt || orderData.order_date || orderData.createdAt || new Date(),
        staffName: orderData.staffName || orderData.employeeName || orderData.salesman || orderData.salesperson?.name || '',
        staffDate: orderData.soldAt || orderData.order_date || orderData.createdAt || new Date(),
      };

      // ข้อมูลสาขา
      if (branchData) {
        formattedOrder.branch = {
          name: branchData.name,
          code: branchData.branch_code,
          address: branchData.address,
          taxId: '0945566000616', // ค่าเริ่มต้น
          tel: branchData.phone || '09-2427-0769'
        };
      } else {
        // ข้อมูลสาขาเริ่มต้น
        formattedOrder.branch = {
          name: 'สำนักงานใหญ่',
          code: '00000',
          address: 'สาขา: สำนักงานใหญ่ รหัสสาขา 00000\n148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
          taxId: '0945566000616',
          tel: '09-2427-0769'
        };
      }

      // ข้อมูลบริษัท
      formattedOrder.company = {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
      };

      // ข้อมูลลูกค้า
      if (customerData) {
        if (orderType === 'installment') {
          // สำหรับ InstallmentOrder
          formattedOrder.customerType = customerData.customerType || 'individual';
          if (formattedOrder.customerType === 'individual') {
            formattedOrder.customer = {
              prefix: customerData.prefix || orderData.customer_info?.prefix || 'นาย',
              firstName: customerData.firstName || orderData.customer_info?.firstName || customerData.first_name || '',
              lastName: customerData.lastName || orderData.customer_info?.lastName || customerData.last_name || '',
              phone: orderData.customer_info?.phone || customerData.phone_number,
              taxId: orderData.customer_info?.taxId || customerData.tax_id,
              address: orderData.customer_info?.address || customerData.address || {}
            };
          }
        } else {
          // สำหรับ CashSale และ Order
          formattedOrder.customerType = customerData.customerType || orderData.customerType || 'individual';

          if (formattedOrder.customerType === 'individual') {
            const individual = customerData.individual || orderData.individual || {};
            formattedOrder.customer = {
              prefix: individual.prefix || 'นาย',
              firstName: individual.firstName || '',
              lastName: individual.lastName || '',
              phone: individual.phone || '',
              taxId: individual.taxId || '',
              address: individual.address || {}
            };
          } else if (formattedOrder.customerType === 'corporate') {
            const corporate = customerData.corporate || orderData.corporate || {};
            formattedOrder.customer = {
              companyName: corporate.companyName || '',
              companyTaxId: corporate.companyTaxId || '',
              contactPerson: corporate.contactPerson || '',
              corporatePhone: corporate.corporatePhone || '',
              companyAddress: corporate.companyAddress || ''
            };
          }
        }
      } else {
        // ✅ Fallback: ใช้ข้อมูลจาก customer_info ของ InstallmentOrder
        if (orderType === 'installment' && orderData.customer_info) {
          formattedOrder.customerType = 'individual';
          formattedOrder.customer = {
            prefix: orderData.customer_info.prefix || 'นาย',
            firstName: orderData.customer_info.firstName || '',
            lastName: orderData.customer_info.lastName || '',
            phone: orderData.customer_info.phone || '',
            taxId: orderData.customer_info.taxId || '',
            address: orderData.customer_info.address || {}
          };
          console.log('✅ ใช้ข้อมูลจาก customer_info fallback');
        } else {
          // ข้อมูลลูกค้าเริ่มต้น
          formattedOrder.customerType = 'individual';
          formattedOrder.customer = {
            prefix: '',
            firstName: '',
            lastName: '',
            phone: '',
            taxId: '',
            address: {}
          };
        }
      }

      // ข้อมูลรายการสินค้า
      formattedOrder.items = [];

      if (orderType === 'installment' && orderData.items) {
        // สำหรับ InstallmentOrder
        formattedOrder.items = orderData.items.map(item => ({
          name: item.name || 'สินค้า',
          imei: item.imei || '-',
          price: item.pricePayOff || item.downAmount || 0,
          qty: item.qty || 1
        }));
      } else if (orderType === 'cashsale' && orderData.items) {
        // สำหรับ CashSale
        formattedOrder.items = orderData.items.map(item => ({
          name: item.name || 'สินค้า',
          imei: '-', // CashSale อาจไม่มี IMEI
          price: item.price || 0,
          qty: item.quantity || 1
        }));
      } else if (orderData.items) {
        // สำหรับ Order
        formattedOrder.items = orderData.items.map(item => ({
          name: item.name || 'สินค้า',
          imei: item.imei || '-',
          price: item.price || 0,
          qty: item.quantity || 1
        }));
      }

      // คำนวณยอดรวม
      if (orderType === 'installment') {
        formattedOrder.subTotal = orderData.subTotal || orderData.totalAmount || 0;
        formattedOrder.discount = orderData.promotionDiscount || 0;
        formattedOrder.total = orderData.finalTotalAmount || orderData.totalAmount || 0;
        formattedOrder.vatAmount = 0; // ผ่อนไม่มีภาษี
      } else if (orderType === 'cashsale') {
        formattedOrder.subTotal = orderData.subTotal || 0;
        formattedOrder.discount = orderData.discount || orderData.promotionDiscount || 0;
        formattedOrder.total = orderData.totalAmount || 0;
        formattedOrder.vatAmount = orderData.vatAmount || 0;
      } else {
        // Order
        formattedOrder.subTotal = orderData.total_amount || 0;
        formattedOrder.discount = orderData.discount || 0;
        formattedOrder.total = orderData.total_amount || 0;
        formattedOrder.vatAmount = orderData.tax_amount || 0;
      }

      // หากไม่มีรายการสินค้า ให้ใช้ยอดรวมเป็นราคาของสินค้าเดียว
      if (formattedOrder.items.length === 0 && formattedOrder.total > 0) {
        formattedOrder.items = [{
          name: 'รายการขาย',
          imei: '-',
          price: formattedOrder.total,
          qty: 1
        }];
      }

      // เพิ่มข้อมูลลายเซ็นและพนักงานขาย
      if (orderType === 'installment') {
        // ข้อมูลพนักงานขาย - ใช้ข้อมูลจริงเท่านั้น ไม่มี fallback
        formattedOrder.staffName = orderData.staffName || orderData.salesperson?.name;

        // ชื่อลูกค้าสำหรับลายเซ็น
        let customerName = '';
        if (formattedOrder.customerType === 'individual') {
          customerName = `${formattedOrder.customer.prefix || ''} ${formattedOrder.customer.firstName || ''} ${formattedOrder.customer.lastName || ''}`.trim();
        } else if (formattedOrder.customerType === 'corporate') {
          customerName = formattedOrder.customer.companyName || '';
        }

        // ข้อมูลลายเซ็น
        formattedOrder.customerSignatureUrl = orderData.customerSignatureUrl;
        formattedOrder.salespersonSignatureUrl = orderData.salespersonSignatureUrl;
        formattedOrder.authorizedSignatureUrl = orderData.authorizedSignatureUrl;

        // เตรียมข้อมูลสำหรับ PDF signatures
        formattedOrder.customer = formattedOrder.customer || {};
        formattedOrder.customer.name = customerName;

        formattedOrder.salesperson = {
          name: formattedOrder.staffName,
          signature: orderData.salespersonSignatureUrl
        };
      }

      return formattedOrder;

    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการจัดรูปแบบข้อมูล:', error.message);
      throw error;
    }
  }

  /**
   * สร้าง PDF จาก Order ID โดยตรง
   * @param {string} orderId - ID ของออเดอร์
   * @param {string} orderType - ประเภทออเดอร์ ('cashSale', 'order', 'installment')
   */
  static async printReceiptById(orderId, orderType = 'order') {
    try {
      const orderData = await this.getOrderForPDF(orderId, orderType);
      return await this.printReceipt(orderData);
    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดในการสร้าง PDF สำหรับออเดอร์ ${orderId}:`, error.message);
      throw error;
    }
  }

  /**
   * ค้นหาออเดอร์จากเลขที่เอกสาร
   * @param {string} documentNumber - เลขที่เอกสาร (invoice number, contract number, etc.)
   * @returns {Object} ข้อมูลออเดอร์และประเภท
   */
  static async findOrderByDocumentNumber(documentNumber) {
    try {
      console.log(`🔍 ค้นหาออเดอร์จากเลขที่เอกสาร: ${documentNumber}`);

      // ค้นหาใน CashSale
      let order = await CashSale.findOne({ invoiceNo: documentNumber });
      if (order) {
        return { order, orderType: 'cashsale' };
      }

      // ค้นหาใน InstallmentOrder
      order = await InstallmentOrder.findOne({ contractNo: documentNumber });
      if (order) {
        return { order, orderType: 'installment' };
      }

      // ค้นหาใน Order
      order = await Order.findOne({ order_number: documentNumber });
      if (order) {
        return { order, orderType: 'order' };
      }

      throw new Error(`ไม่พบออเดอร์ที่มีเลขที่เอกสาร: ${documentNumber}`);

    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดในการค้นหาออเดอร์: ${error.message}`);
      throw error;
    }
  }

  /**
   * สร้าง PDF จากเลขที่เอกสาร
   * @param {string} documentNumber - เลขที่เอกสาร
   */
  static async printReceiptByDocumentNumber(documentNumber) {
    try {
      const { order, orderType } = await this.findOrderByDocumentNumber(documentNumber);
      return await this.printReceiptById(order._id, orderType);
    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดในการสร้าง PDF สำหรับเลขที่เอกสาร ${documentNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * สร้าง PDF ใบเสร็จรับเงิน/ใบกำกับภาษี สำหรับ ReceiptVoucher (ระบบผ่อนชำระ)
   * @param {Object} receiptVoucher - ข้อมูล ReceiptVoucher
   * @returns {Promise<Object>} ผลลัพธ์ PDF
   */
  static async printReceiptVoucher(receiptVoucher) {
    try {
      console.log(`📄 สร้าง PDF ใบเสร็จรับเงิน สำหรับ ReceiptVoucher: ${receiptVoucher.documentNumber}`);

      // กำหนดพาธสำหรับรูปภาพ (เหมือน QuotationPdfController)
      const logoPath = path.join(__dirname, '..', '..', 'Logo', 'Logo2png.png');

      // สร้าง PDF document ขนาด A4
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // เตรียมข้อมูล
      const documentNumber = receiptVoucher.documentNumber || '';
      const paymentDate = receiptVoucher.paymentDate ? formatThaiDate(receiptVoucher.paymentDate) : formatThaiDate(new Date());
      const receivedFrom = receiptVoucher.receivedFrom || '';
      const totalAmount = receiptVoucher.totalAmount || 0;
      const paymentMethod = receiptVoucher.paymentMethod || 'transfer';
      const receiptType = receiptVoucher.receiptType || 'installment_down_payment';

      // ข้อมูลสาขา
      const branchData = receiptVoucher.branch || {};

      // ข้อมูลลูกค้า
      const customerData = receiptVoucher.customer || {};
      const customerInfo = receiptVoucher.customerInfo || {};
      const customerType = receiptVoucher.customerType || 'individual';

      // ลงทะเบียนฟอนต์ไทย
      const fontPath = path.join(__dirname, '..', '..', 'fonts', 'THSarabunNew.ttf');
      if (fs.existsSync(fontPath)) {
        doc.registerFont('THSarabunNew', fontPath);
        doc.font('THSarabunNew');
        console.log('✅ โหลดฟอนต์ไทยสำเร็จ');
      } else {
        console.warn('❌ ไม่พบฟอนต์ไทย:', fontPath);
        doc.font('Helvetica');
      }

      // หัวเอกสาร - โลโก้
      if (fs.existsSync(logoPath)) {
        try {
          const logoSize = 80;
          doc.image(logoPath, (doc.page.width - logoSize) / 2, doc.y, { width: logoSize });
          doc.moveDown(2);
          console.log('✅ โหลดโลโก้สำเร็จ');
        } catch (logoError) {
          console.warn('⚠️ ไม่สามารถโหลดโลโก้ได้:', logoError.message);
          doc.moveDown(1);
        }
      } else {
        console.warn('⚠️ ไม่พบไฟล์โลโก้:', logoPath);
        doc.moveDown(1);
      }

      // ข้อมูลบริษัท
      doc.fontSize(18)
         .text('บริษัท 2 พี่น้อง โมบาย จำกัด', { align: 'center' });

      doc.moveDown(0.5);

      if (branchData.name) {
        doc.fontSize(14)
           .text(`สาขา: ${branchData.name} รหัสสาขา ${branchData.code || '00001'}`, { align: 'center' });
      }

      if (branchData.address) {
        doc.fontSize(12)
           .text(branchData.address, { align: 'center' });
      }

      doc.fontSize(12)
         .text(`เลขประจำตัวผู้เสียภาษีอากร ${branchData.taxId || '0945566000616'}`, { align: 'center' })
         .text(`โทร: ${branchData.phone || '09-2427-0769'}`, { align: 'center' });

      doc.moveDown(1);

      // เส้นคั่น
      doc.moveTo(70, doc.y)
         .lineTo(520, doc.y)
         .stroke();

      doc.moveDown(0.5);

      // ประเภทใบเสร็จ
      let documentTitle = 'ใบเสร็จรับเงิน';
      if (receiptType === 'installment_down_payment') {
        documentTitle = 'ใบเสร็จรับเงิน (ค่าดาวน์ผ่อนชำระ)';
      } else if (receiptType === 'installment') {
        documentTitle = 'ใบเสร็จรับเงิน (ค่างวดผ่อนชำระ)';
      } else if (customerType === 'corporate') {
        documentTitle = 'ใบกำกับภาษี/ใบเสร็จรับเงิน';
      }

      doc.fontSize(18)
         .text(documentTitle, { align: 'center' });

      doc.moveDown(0.5);

      // เส้นคั่น
      doc.moveTo(70, doc.y)
         .lineTo(520, doc.y)
         .stroke();

      doc.moveDown();

      // ข้อมูลการขายและลูกค้าแบบ 2 คอลัมน์
      const leftColumn = 70;
      const rightColumn = 320;
      const currentY = doc.y;

      // คอลัมน์ซ้าย - ข้อมูลการขาย
      doc.fontSize(12);
      doc.text(`เลขที่:`, leftColumn, currentY)
         .text(`วันที่รับเงิน:`, leftColumn, currentY + 20)
         .text(`วิธีการชำระ:`, leftColumn, currentY + 40)
         .text(`ประเภทใบเสร็จ:`, leftColumn, currentY + 60);

      const paymentMethodThai = {
        'cash': 'เงินสด',
        'transfer': 'โอนเงิน',
        'cheque': 'เช็ค',
        'credit_card': 'บัตรเครดิต',
        'e_wallet': 'กระเป๋าเงินอิเล็กทรอนิกส์'
      };

      const receiptTypeThai = {
        'installment_down_payment': 'ค่าดาวน์ผ่อนชำระ',
        'installment': 'ค่างวดผ่อนชำระ',
        'cash_sale': 'ขายเงินสด',
        'service': 'ค่าบริการ',
        'deposit': 'เงินมัดจำ',
        'other': 'อื่นๆ'
      };

      // 🔧 DEBUG: ตรวจสอบค่าที่จะแสดงใน PDF
      console.log('📄 PDF Display Values:', {
        paymentMethod: paymentMethod,
        paymentMethodThai: paymentMethodThai[paymentMethod],
        finalPaymentDisplay: paymentMethodThai[paymentMethod] || paymentMethod,
        documentNumber: documentNumber,
        paymentDate: paymentDate
      });

      doc.text(`${documentNumber}`, leftColumn + 80, currentY)
         .text(`${paymentDate}`, leftColumn + 80, currentY + 20)
         .text(`${paymentMethodThai[paymentMethod] || paymentMethod}`, leftColumn + 80, currentY + 40)
         .text(`${receiptTypeThai[receiptType] || receiptType}`, leftColumn + 80, currentY + 60);

      // คอลัมน์ขวา - ข้อมูลลูกค้า
      if (customerType === 'individual') {
        const individual = customerInfo.individual || customerInfo || {};
        const customerName = `${individual.prefix || ''} ${individual.firstName || ''} ${individual.lastName || ''}`.trim() || customerData.name || receivedFrom;
        const customerAddress = individual.address || customerData.address || '';
        const customerPhone = individual.phone || customerData.phone || '';
        const customerTaxId = individual.taxId || customerData.taxId || '';

        // 🔍 DEBUG: ตรวจสอบข้อมูลลูกค้าใน individual case
        console.log('🔍 A4PDF INDIVIDUAL DEBUG - Customer data processing:', {
          individual,
          customerData,
          finalCustomerName: customerName,
          finalCustomerTaxId: customerTaxId,
          finalCustomerAddress: customerAddress,
          finalCustomerPhone: customerPhone
        });

        doc.text(`ลูกค้า:`, rightColumn, currentY)
           .text(`โทร:`, rightColumn, currentY + 20)
           .text(`เลขผู้เสียภาษี:`, rightColumn, currentY + 40)
           .text(`ที่อยู่:`, rightColumn, currentY + 60);

        doc.text(`${customerName}`, rightColumn + 80, currentY)
           .text(`${customerPhone || '-'}`, rightColumn + 80, currentY + 20)
           .text(`${customerTaxId || '-'}`, rightColumn + 80, currentY + 40)
           .text(`${customerAddress || '-'}`, rightColumn + 80, currentY + 60, { width: 200 });

        doc.y = currentY + 100;
      } else if (customerType === 'corporate') {
        const corporate = customerInfo.corporate || customerInfo || {};
        const companyName = corporate.companyName || customerData.name || receivedFrom;
        const companyTaxId = corporate.companyTaxId || customerData.taxId || '';
        const contactPerson = corporate.contactPerson || '';
        const corporatePhone = corporate.corporatePhone || customerData.phone || '';
        const companyAddress = corporate.companyAddress || customerData.address || '';

        doc.text(`บริษัท:`, rightColumn, currentY)
           .text(`เลขทะเบียน:`, rightColumn, currentY + 20)
           .text(`ผู้ติดต่อ:`, rightColumn, currentY + 40)
           .text(`โทร:`, rightColumn, currentY + 60)
           .text(`ที่อยู่:`, rightColumn, currentY + 80);

        doc.text(`${companyName}`, rightColumn + 80, currentY)
           .text(`${companyTaxId}`, rightColumn + 80, currentY + 20)
           .text(`${contactPerson || '-'}`, rightColumn + 80, currentY + 40)
           .text(`${corporatePhone || '-'}`, rightColumn + 80, currentY + 60)
           .text(`${companyAddress || '-'}`, rightColumn + 80, currentY + 80, { width: 200 });

        doc.y = currentY + 120;
      } else {
        // 🔍 DEBUG: ตรวจสอบข้อมูลลูกค้าใน fallback case
        console.log('🔍 A4PDF FALLBACK DEBUG - Customer data received:', {
          customerData,
          receivedFrom,
          customerDataName: customerData.name,
          customerDataTaxId: customerData.taxId,
          customerDataAddress: customerData.address,
          customerDataPhone: customerData.phone
        });

        // ใช้ข้อมูลเดียวกับ individual สำหรับ fallback
        const fallbackName = customerData.name || receivedFrom;
        const fallbackPhone = customerData.phone || '-';
        const fallbackTaxId = customerData.taxId || '-';
        const fallbackAddress = customerData.address || '-';

        doc.text(`ลูกค้า:`, rightColumn, currentY)
           .text(`โทร:`, rightColumn, currentY + 20)
           .text(`เลขผู้เสียภาษี:`, rightColumn, currentY + 40)
           .text(`ที่อยู่:`, rightColumn, currentY + 60);

        doc.text(`${fallbackName}`, rightColumn + 80, currentY)
           .text(`${fallbackPhone}`, rightColumn + 80, currentY + 20)
           .text(`${fallbackTaxId}`, rightColumn + 80, currentY + 40)
           .text(`${fallbackAddress}`, rightColumn + 80, currentY + 60);

        doc.y = currentY + 100;
      }

      doc.moveDown();
      doc.text('________________________________________', { align: 'center' });

      // ตารางรายละเอียด
      doc.moveDown();
      const tableTop = doc.y;
      const descriptionX = leftColumn;
      const quantityX = 350;
      const amountX = 450;

      // เส้นขีดบน
      doc.moveTo(leftColumn, tableTop)
         .lineTo(520, tableTop)
         .stroke();

      // หัวตาราง
      doc.fontSize(14)
         .text('รายละเอียด', descriptionX, tableTop + 10)
         .text('จำนวน', quantityX, tableTop + 10)
         .text('จำนวนเงิน', amountX, tableTop + 10);

      // เส้นขีดใต้หัวตาราง
      doc.moveTo(leftColumn, tableTop + 30)
         .lineTo(520, tableTop + 30)
         .stroke();

      doc.y = tableTop + 40;

      // รายการสินค้า/บริการ
      if (receiptVoucher.items && receiptVoucher.items.length > 0) {
        receiptVoucher.items.forEach((item, index) => {
          const itemY = doc.y;
          doc.fontSize(12)
             .text(item.name || item.description || 'รายการ', descriptionX, itemY, { width: 250 })
             .text((item.quantity || 1).toString(), quantityX, itemY, { align: 'center', width: 80 })
             .text((item.amount || 0).toLocaleString('en-US', {
               minimumFractionDigits: 2,
               maximumFractionDigits: 2
             }), amountX, itemY, { align: 'right', width: 70 });

          doc.y = itemY + 20;
        });
      } else {
        // ใช้ข้อมูลจาก ReceiptVoucher โดยตรง
        const itemY = doc.y;
        let itemDescription = 'รายการรับเงิน';

        if (receiptType === 'installment_down_payment') {
          itemDescription = 'ค่าดาวน์ผ่อนชำระ';
        } else if (receiptType === 'installment') {
          itemDescription = 'ค่างวดผ่อนชำระ';
        } else if (receiptVoucher.reference?.installmentContract) {
          itemDescription = `ค่าดาวน์ผ่อนชำระ - สัญญาเลขที่ ${receiptVoucher.reference.installmentContract}`;
        }

        doc.fontSize(12)
           .text(itemDescription, descriptionX, itemY, { width: 250 })
           .text('1', quantityX, itemY, { align: 'center', width: 80 })
           .text(totalAmount.toLocaleString('en-US', {
             minimumFractionDigits: 2,
             maximumFractionDigits: 2
           }), amountX, itemY, { align: 'right', width: 70 });

        doc.y = itemY + 20;
      }

      // เส้นขีดล่าง
      const tableBottomY = doc.y + 5;
      doc.moveTo(leftColumn, tableBottomY)
         .lineTo(520, tableBottomY)
         .stroke();

      doc.y = tableBottomY + 20;

      // สรุปยอด
      const summaryLabelX = 350;
      const summaryValueX = 480;

      doc.fontSize(16);

      // รวมทั้งสิ้น
      doc.text('รวมทั้งสิ้น', summaryLabelX, doc.y)
         .text(totalAmount.toLocaleString('en-US', {
           minimumFractionDigits: 2,
           maximumFractionDigits: 2
         }), summaryValueX, doc.y, { align: 'right', width: 70 });

      doc.moveDown();

      // จำนวนเงินตัวอักษร
      doc.fontSize(14);
      const amountInWords = this.convertNumberToThaiWords(totalAmount);
      doc.text(`จำนวนเงิน (ตัวอักษร): ${amountInWords}`, leftColumn, doc.y);

      // ข้อมูลบัญชีธนาคาร (ถ้ามี)
      if (paymentMethod === 'transfer' && receiptVoucher.bankAccount) {
        doc.moveDown(1);
        doc.fontSize(12);
        doc.text(`ธนาคาร: ${receiptVoucher.bankAccount.bankName || '-'}`, leftColumn, doc.y);
        doc.text(`เลขที่บัญชี: ${receiptVoucher.bankAccount.accountNumber || '-'}`, leftColumn, doc.y + 15);
        doc.text(`ชื่อบัญชี: ${receiptVoucher.bankAccount.accountName || '-'}`, leftColumn, doc.y + 30);
        doc.y += 45;
      }

      // หมายเหตุ
      if (receiptVoucher.notes) {
        doc.moveDown(1);
        doc.fontSize(12);
        doc.text(`หมายเหตุ: ${receiptVoucher.notes}`, leftColumn, doc.y);
      }

      // ส่วนลายเซ็น
      doc.moveDown(3);

      // แบ่งเป็น 2 คอลัมน์สำหรับลายเซ็น
      const leftSignatureX = 100;
      const rightSignatureX = 350;
      const signatureLineLength = 150;
      const signatureY = doc.y;

      // เส้นขีดสำหรับลายเซ็น
      doc.moveTo(leftSignatureX, signatureY + 40)
         .lineTo(leftSignatureX + signatureLineLength, signatureY + 40)
         .stroke();

      doc.moveTo(rightSignatureX, signatureY + 40)
         .lineTo(rightSignatureX + signatureLineLength, signatureY + 40)
         .stroke();

      // ข้อความใต้ลายเซ็น
      doc.y = signatureY + 55;
      doc.fontSize(12);

      doc.text(`(ลายเซ็นผู้รับเงิน)`, leftSignatureX, doc.y, { width: signatureLineLength, align: 'center' })
         .text(`(ลายเซ็นผู้จ่ายเงิน)`, rightSignatureX, doc.y, { width: signatureLineLength, align: 'center' });

      doc.moveDown(0.5);
      doc.text(`พนักงาน`, leftSignatureX, doc.y, { width: signatureLineLength, align: 'center' })
         .text(`${receivedFrom}`, rightSignatureX, doc.y, { width: signatureLineLength, align: 'center' });

      doc.moveDown(0.5);
      doc.text(`วันที่: ${paymentDate}`, leftSignatureX, doc.y, { width: signatureLineLength + 200, align: 'center' });



      // สร้าง buffer และบันทึกไฟล์
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          try {
            const pdfBuffer = Buffer.concat(buffers);
            const fileName = `receipt_voucher_${receiptVoucher.documentNumber || receiptVoucher._id || Date.now()}.pdf`;
            const outDir = path.join(__dirname, '..', '..', 'receipts');

            if (!fs.existsSync(outDir)) {
              fs.mkdirSync(outDir, { recursive: true });
            }

            const outPath = path.join(outDir, fileName);
            fs.writeFileSync(outPath, pdfBuffer);

            const fileSizeKB = Math.round(pdfBuffer.length / 1024);
            console.log(`✅ สร้างไฟล์ PDF ใบเสร็จรับเงิน: ${outPath} (${fileSizeKB}KB)`);

            resolve({
              buffer: pdfBuffer,
              fileName: fileName,
              filePath: outPath,
              fileSize: pdfBuffer.length
            });
          } catch (error) {
            reject(error);
          }
        });

        doc.on('error', reject);
        doc.end();
      });

    } catch (err) {
      console.error('Error in A4PDFController.printReceiptVoucher:', err);
      throw err;
    }
  }

  /**
   * สร้าง PDF จาก ReceiptVoucher ID
   * @param {string} receiptVoucherId - ID ของ ReceiptVoucher
   * @returns {Promise<Object>} ผลลัพธ์ PDF
   */
  static async printReceiptVoucherById(receiptVoucherId) {
    try {
      console.log(`🔍 ดึงข้อมูล ReceiptVoucher ID: ${receiptVoucherId}`);

      const receiptVoucher = await ReceiptVoucher.findById(receiptVoucherId)
        .populate('branch')
        .populate('details')
        .populate('createdBy');

      if (!receiptVoucher) {
        throw new Error(`ไม่พบข้อมูล ReceiptVoucher ID: ${receiptVoucherId}`);
      }

      // อัปเดตจำนวนการพิมพ์
      receiptVoucher.printCount = (receiptVoucher.printCount || 0) + 1;
      receiptVoucher.lastPrintedAt = new Date();
      await receiptVoucher.save();

      return await this.printReceiptVoucher(receiptVoucher);

    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดในการสร้าง PDF สำหรับ ReceiptVoucher ${receiptVoucherId}:`, error.message);
      throw error;
    }
  }

  /**
   * ค้นหา ReceiptVoucher จากเลขที่เอกสาร
   * @param {string} documentNumber - เลขที่เอกสาร
   * @returns {Promise<Object>} ReceiptVoucher
   */
  static async findReceiptVoucherByDocumentNumber(documentNumber) {
    try {
      console.log(`🔍 ค้นหา ReceiptVoucher จากเลขที่เอกสาร: ${documentNumber}`);

      const receiptVoucher = await ReceiptVoucher.findOne({ documentNumber })
        .populate('branch')
        .populate('details')
        .populate('createdBy');

      if (!receiptVoucher) {
        throw new Error(`ไม่พบ ReceiptVoucher ที่มีเลขที่เอกสาร: ${documentNumber}`);
      }

      return receiptVoucher;

    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดในการค้นหา ReceiptVoucher: ${error.message}`);
      throw error;
    }
  }

  /**
   * สร้าง PDF จากเลขที่เอกสาร ReceiptVoucher
   * @param {string} documentNumber - เลขที่เอกสาร
   * @returns {Promise<Object>} ผลลัพธ์ PDF
   */
  static async printReceiptVoucherByDocumentNumber(documentNumber) {
    try {
      const receiptVoucher = await this.findReceiptVoucherByDocumentNumber(documentNumber);
      return await this.printReceiptVoucher(receiptVoucher);
    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดในการสร้าง PDF สำหรับเลขที่เอกสาร ${documentNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * ค้นหา ReceiptVoucher จากเลขสัญญาผ่อนชำระ
   * @param {string} contractNumber - เลขสัญญาผ่อนชำระ
   * @returns {Promise<Object>} ReceiptVoucher
   */
  static async findReceiptVoucherByContractNumber(contractNumber) {
    try {
      console.log(`🔍 ค้นหา ReceiptVoucher จากเลขสัญญาผ่อนชำระ: ${contractNumber}`);

      const receiptVoucher = await ReceiptVoucher.findOne({
        $or: [
          { 'reference.installmentContract': contractNumber },
          { 'metadata.contractNumber': contractNumber },
          { 'metadata.sourceId': contractNumber }
        ]
      })
        .populate('branch')
        .populate('details')
        .populate('createdBy');

      if (!receiptVoucher) {
        throw new Error(`ไม่พบ ReceiptVoucher ที่เกี่ยวข้องกับสัญญาเลขที่: ${contractNumber}`);
      }

      return receiptVoucher;

    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดในการค้นหา ReceiptVoucher: ${error.message}`);
      throw error;
    }
  }

  /**
   * สร้าง PDF จากเลขสัญญาผ่อนชำระ
   * @param {string} contractNumber - เลขสัญญาผ่อนชำระ
   * @returns {Promise<Object>} ผลลัพธ์ PDF
   */
  static async printReceiptVoucherByContractNumber(contractNumber) {
    try {
      const receiptVoucher = await this.findReceiptVoucherByContractNumber(contractNumber);
      return await this.printReceiptVoucher(receiptVoucher);
    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดในการสร้าง PDF สำหรับสัญญาเลขที่ ${contractNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * แปลงตัวเลขเป็นคำอ่านภาษาไทย
   * @param {number} number - ตัวเลขที่ต้องการแปลง
   * @returns {string} คำอ่านภาษาไทย
   */
  static convertNumberToThaiWords(number) {
    const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const tens = ['', '', 'ยี่', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const places = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    if (number === 0) return 'ศูนย์บาทถ้วน';
    if (number < 0) return 'ลบ' + this.convertNumberToThaiWords(-number);

    const [integerPart, decimalPart] = number.toString().split('.');
    let result = '';

    // ส่วนจำนวนเต็ม
    if (integerPart && parseInt(integerPart) > 0) {
      result += this.convertIntegerToThaiWords(parseInt(integerPart)) + 'บาท';
    }

    // ส่วนทศนิยม
    if (decimalPart && parseInt(decimalPart) > 0) {
      const satangValue = parseInt(decimalPart.padEnd(2, '0').substr(0, 2));
      result += this.convertIntegerToThaiWords(satangValue) + 'สตางค์';
    } else {
      result += 'ถ้วน';
    }

    return result;
  }

  /**
   * แปลงจำนวนเต็มเป็นคำอ่านภาษาไทย
   * @param {number} number - จำนวนเต็ม
   * @returns {string} คำอ่านภาษาไทย
   */
  static convertIntegerToThaiWords(number) {
    if (number === 0) return '';

    const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const tens = ['', '', 'ยี่', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const places = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    let result = '';
    const digits = number.toString().split('').reverse();

    for (let i = 0; i < digits.length; i++) {
      const digit = parseInt(digits[i]);

      if (digit === 0) continue;

      if (i === 1) { // หลักสิบ
        if (digit === 1) {
          result = 'สิบ' + result;
        } else if (digit === 2) {
          result = 'ยี่สิบ' + result;
        } else {
          result = ones[digit] + 'สิบ' + result;
        }
      } else if (i === 0) { // หลักหน่วย
        if (digits[1] && parseInt(digits[1]) > 0 && digit === 1) {
          result = 'เอ็ด' + result;
        } else {
          result = ones[digit] + result;
        }
      } else { // หลักอื่นๆ
        result = ones[digit] + places[i] + result;
      }
    }

    return result;
  }

  /** @private วาด Summary ฝั่งขวา (เหมือน QuotationPdfController) */
  static _drawSummary(doc, order, margins, bodyW, startY) {
    const summaryW = 180;
    const summaryX = margins.left + bodyW - summaryW;
    let y = startY;

    // กรอบสรุปยอด
    const summaryH = 80;
    doc.rect(summaryX, y, summaryW, summaryH)
       .stroke();

    // หัวข้อ "สรุปยอดรวม"
    doc.font(CONFIG.font.boldName)
       .fontSize(CONFIG.sizes.heading3)
       .fillColor(CONFIG.color.textDark)
       .text('สรุปยอดรวม', summaryX + 10, y + 8);

    y += 25;

    // รายละเอียดยอด
    const labelX = summaryX + 10;
    const valueX = summaryX + summaryW - 10;

    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.textBody);

    // ยอดรวม - แยกตามประเภทเอกสาร
    let displaySubTotal = ensureNumberData(order.subTotal);
    const isReceipt = order.documentType === 'RECEIPT' || order.type === 'receipt';
    const isTaxInvoice = order.documentType === 'TAX_INVOICE' || order.type === 'tax_invoice';

    if (isReceipt) {
      // ใบเสร็จ: แสดงเงินดาวน์ 500 บาท
      displaySubTotal = ensureNumberData(order.downPaymentAmount || order.downPayment || 500);
      console.log('📄 Receipt subtotal display:', displaySubTotal);
    } else if (isTaxInvoice) {
      // ใบกำกับภาษี: แสดง subtotal ที่คำนวณแล้ว
      console.log('📄 Tax Invoice subtotal display:', displaySubTotal);
    }

    doc.text('ยอดรวม:', labelX, y)
       .text(`${displaySubTotal.toFixed(2)}`, valueX - 60, y, { width: 50, align: 'right' });
    y += 15;

    // VAT (ถ้ามีและเป็นใบกำกับภาษี)
    const vatTotal = ensureNumberData(order.vatTotal);
    const shouldShowVAT = vatTotal > 0 && (
      order.type === 'tax_invoice' ||
      order.documentType === 'TAX_INVOICE' ||
      order.invoiceType === 'TAX_INVOICE' ||
      (order.taxType === 'inclusive' || order.taxType === 'exclusive')
    );

    // แต่ถ้าเป็นใบเสร็จรับเงิน ไม่แสดงภาษี
    const isReceiptOnly = order.type === 'receipt' ||
                          order.documentType === 'RECEIPT' ||
                          order.invoiceType === 'RECEIPT_ONLY';

    if (shouldShowVAT && !isReceiptOnly) {
      doc.text('ภาษีมูลค่าเพิ่ม 7%:', labelX, y)
         .text(`${vatTotal.toFixed(2)}`, valueX - 60, y, { width: 50, align: 'right' });
      y += 15;
    }

    // ค่าธรรมเนียม (ถ้ามี)
    const docFee = ensureNumberData(order.docFee);
    if (docFee > 0) {
      doc.text('ค่าธรรมเนียม:', labelX, y)
         .text(`${docFee.toFixed(2)}`, valueX - 60, y, { width: 50, align: 'right' });
      y += 15;
    }

    // เส้นคั่น
    doc.moveTo(labelX, y)
       .lineTo(valueX - 10, y)
       .stroke();
    y += 5;

    // ยอดชำระสุทธิ
    const grandTotal = ensureNumberData(order.grandTotal);
    doc.font(CONFIG.font.boldName)
       .fontSize(CONFIG.sizes.heading3)
       .text('ยอดชำระสุทธิ:', labelX, y)
       .text(`${grandTotal.toFixed(2)}`, valueX - 60, y, { width: 50, align: 'right' });

    return y + 25;
  }

  /** @private วาดกล่องจำนวนเงินคำไทย (เหมือน QuotationPdfController) */
  static _drawAmountInWords(doc, order, margins, bodyW, startY) {
    const boxW = bodyW;
    const boxH = 25;
    const boxX = margins.left;
    const boxY = startY + 10;

    // กรอบ
    doc.rect(boxX, boxY, boxW, boxH)
       .stroke();

    // ข้อความ
    doc.font(CONFIG.font.name)
       .fontSize(CONFIG.sizes.textBody)
       .fillColor(CONFIG.color.textDark)
       .text(`จำนวนเงิน (ตัวหนังสือ): ${order.amountInWords || 'ศูนย์บาทถ้วน'}`,
             boxX + 10, boxY + 8);
  }



  /** @private วาดข้อกำหนดและเงื่อนไข (เหมือน QuotationPdfController) */
  static _drawTerms(doc, order, margins, bodyW, startY) {
    let currentY = startY;

    // ข้อความเงื่อนไขแบบใหม่ (ข้อความเดียวแบบกระชับ)
    const termsText = order.termsText ||
`สินค้ามีประกันเครื่อง 1 ปี หากตรวจสอบสินค้าแล้ว พบว่าเกิดจากระบบซอฟแวร์ภายในเครื่อง ลูกค้ายินยอมจะรอทางศูนย์ดำเนินการเคลมสินค้า โดยระยะเวลาการเคลมสินค้าขึ้นอยู่กับศูนย์ และหากเกิดความเสียหายจากการกระทำของลูกค้า เช่น ตก แตก โดนน้ำ เป็นต้น ถือว่าประกันสิ้นสุดทันที`;

    const termOpts = {
      width: bodyW,
      lineGap: 2,
      align: 'justify' // จัดเนื้อหาให้เรียบร้อย
    };

    doc
      .font(CONFIG.font.name)
      .fontSize(CONFIG.sizes.textSmall) // ใช้ฟอนต์เล็กลง
      .fillColor(CONFIG.color.textDark)
      .text(termsText, margins.left, currentY, termOpts);

    // คำนวณความสูงที่ใช้จริง (แบบกระชับ)
    const termsHeight = doc.heightOfString(termsText, termOpts);
    currentY += Math.min(termsHeight, 30); // จำกัดความสูงไม่เกิน 30 point

    return currentY;
  }

  /** @private วาดส่วนท้ายหน้า (เหมือน QuotationPdfController) */
  static _drawPageFooter(doc, margins, pageW, pageH) {
    // ลบข้อความ "ขอบคุณที่ใช้บริการ - Thank you for your business" ตามคำขอ
    // const footerY = pageH - margins.bottom + 10;
    // const footerText = "ขอบคุณที่ใช้บริการ - Thank you for your business";

    // doc.font(CONFIG.font.name)
    //    .fontSize(CONFIG.sizes.textSmall)
    //    .fillColor(CONFIG.color.textLight)
    //    .text(footerText, margins.left, footerY, {
    //      width: pageW - margins.left - margins.right,
    //      align: 'center'
    //    });
  }

  /**
   * 🆕 แปลงข้อมูล TaxInvoice เป็นรูปแบบ order สำหรับสร้าง PDF
   * @private
   */
  static _convertTaxInvoiceToOrder(taxInvoice) {
    console.log('🔄 Converting TaxInvoice to order format');

    // 🔍 DEBUG: ตรวจสอบข้อมูลที่ได้รับจาก frontend
    console.log('📊 Tax Invoice Data from Frontend:', {
      employeeName: taxInvoice.employeeName,
      staffName: taxInvoice.staffName,
      salesman: taxInvoice.salesman,
      salesperson: taxInvoice.salesperson,
      paymentMethod: taxInvoice.paymentMethod,
      taxInvoiceNumber: taxInvoice.taxInvoiceNumber,
      // 🔧 เพิ่มข้อมูลสำหรับระบบผ่อน
      saleType: taxInvoice.saleType,
      receiptType: taxInvoice.receiptType,
      contractNo: taxInvoice.contractNo,
      downPaymentAmount: taxInvoice.downPaymentAmount,
      quotationNumber: taxInvoice.quotationNumber
    });

    // 🔧 ปรับปรุงการแปลงข้อมูลให้ครบถ้วนตามฐานข้อมูล
    const result = {
      _id: taxInvoice._id,
      order_number: taxInvoice.taxInvoiceNumber,
      invoiceNo: taxInvoice.taxInvoiceNumber,
      documentType: 'TAX_INVOICE',
      receiptType: taxInvoice.receiptType || 'down_payment_tax_invoice',
      saleDate: taxInvoice.issueDate || taxInvoice.createdAt,

      // ข้อมูลลูกค้า - ใช้ข้อมูลจากฐานข้อมูลโดยตรง
      customer: {
        name: taxInvoice.customer?.name ||
              taxInvoice.customer?.fullName ||
              `${taxInvoice.customer?.prefix || ''} ${taxInvoice.customer?.first_name || ''} ${taxInvoice.customer?.last_name || ''}`.trim() ||
              'ลูกค้าทั่วไป',
        firstName: taxInvoice.customer?.first_name,
        lastName: taxInvoice.customer?.last_name,
        prefix: taxInvoice.customer?.prefix,
        fullName: taxInvoice.customer?.fullName,
        phone: taxInvoice.customer?.phone || taxInvoice.customer?.phone_number,
        taxId: taxInvoice.customer?.taxId || taxInvoice.customer?.tax_id,
        email: taxInvoice.customer?.email,
        address: taxInvoice.customer?.address || 'ไม่ระบุที่อยู่',
        age: taxInvoice.customer?.age
      },

      // รายการสินค้า - ปรับปรุงให้แสดงข้อมูลครบ
      items: (taxInvoice.items || []).map(item => ({
        name: item.name || 'สินค้า',
        brand: item.brand,
        imei: item.imei,
        price: item.unitPrice,
        qty: item.quantity,
        amount: item.totalPrice,
        totalPrice: item.totalPrice,
        description: item.description,
        product: item.product,
        hasVat: item.hasVat,
        vatRate: item.vatRate
      })),

      // 🔧 ข้อมูลการเงิน - ใช้ข้อมูลจาก summary และ calculation อย่างสอดคล้องกัน
      // เพื่อให้ใบเสร็จและใบกำกับภาษีแสดงยอดเงินเหมือนกัน
      summary: {
        subtotal: taxInvoice.summary?.subtotal || taxInvoice.calculation?.subtotal || 0,
        docFee: taxInvoice.summary?.docFee || taxInvoice.calculation?.documentFee || 0,
        discount: taxInvoice.summary?.discount || taxInvoice.calculation?.discount || 0,
        beforeTax: taxInvoice.summary?.beforeTax || taxInvoice.calculation?.beforeTax || 0,
        vatAmount: taxInvoice.summary?.vatAmount || taxInvoice.calculation?.vatAmount || 0,
        totalWithTax: taxInvoice.summary?.totalWithTax || taxInvoice.calculation?.totalAmount || 0,
        total: taxInvoice.summary?.total || taxInvoice.summary?.totalWithTax || 0
      },
      calculation: {
        subtotal: taxInvoice.calculation?.subtotal || taxInvoice.summary?.subtotal || 0,
        documentFee: taxInvoice.calculation?.documentFee || taxInvoice.summary?.docFee || 0,
        discount: taxInvoice.calculation?.discount || taxInvoice.summary?.discount || 0,
        beforeTax: taxInvoice.calculation?.beforeTax || taxInvoice.summary?.beforeTax || 0,
        vatAmount: taxInvoice.calculation?.vatAmount || taxInvoice.summary?.vatAmount || 0,
        totalAmount: taxInvoice.calculation?.totalAmount || taxInvoice.summary?.totalWithTax || 0,
        taxType: taxInvoice.calculation?.taxType || (taxInvoice.vatInclusive ? 'inclusive' : 'exclusive')
      },
      subTotal: taxInvoice.summary?.subtotal || taxInvoice.calculation?.subtotal || 0,
      docFee: taxInvoice.summary?.docFee || taxInvoice.calculation?.documentFee || 0,
      beforeTax: taxInvoice.summary?.beforeTax || taxInvoice.calculation?.beforeTax || 0,
      vatAmount: taxInvoice.summary?.vatAmount || taxInvoice.calculation?.vatAmount || 0,
      total: taxInvoice.summary?.totalWithTax || taxInvoice.calculation?.totalAmount || 0,
      totalAmount: taxInvoice.summary?.totalWithTax || taxInvoice.calculation?.totalAmount || 0,
      totalWithTax: taxInvoice.summary?.totalWithTax || taxInvoice.calculation?.totalAmount || 0,
      netTotal: taxInvoice.summary?.netTotal || 0,

      // สำหรับระบบผ่อน: เงินดาวน์
      downPayment: taxInvoice.downPaymentAmount || 0,
      downPaymentAmount: taxInvoice.downPaymentAmount || 0,

      // ข้อมูลภาษี
      taxType: taxInvoice.calculation?.taxType || (taxInvoice.vatInclusive ? 'inclusive' : 'exclusive'),
      vatInclusive: taxInvoice.vatInclusive,
      vatRate: taxInvoice.vatRate || 7,
      hasVatItems: taxInvoice.hasVatItems,

      // ข้อมูลการชำระเงิน
      paymentMethod: this._translatePaymentMethod(taxInvoice.paymentMethod),
      paymentDate: taxInvoice.paymentDate,

      // ข้อมูลสัญญา
      contractNo: taxInvoice.contractNo,
      quotationNumber: taxInvoice.quotationNumber,
      invoiceNumber: taxInvoice.invoiceNumber,

      // ข้อมูลบริษัท - ใช้ข้อมูลจากฐานข้อมูลโดยตรง
      company: taxInvoice.company || {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
        taxId: '0945566000616',
        phone: '09-2427-0769'
      },

      // ข้อมูลสาขา - ใช้ข้อมูลจากฐานข้อมูลโดยตรง
      branch: taxInvoice.branch || {
        name: 'สำนักงานใหญ่',
        code: taxInvoice.branchCode || '00000',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000'
      },

      // ข้อมูลภาษี
      taxType: taxInvoice.calculation?.taxType || (taxInvoice.vatInclusive ? 'inclusive' : 'exclusive'),
      vatInclusive: taxInvoice.vatInclusive,
      vatRate: taxInvoice.vatRate || 7,
      hasVatItems: taxInvoice.hasVatItems,

      // ข้อมูลการชำระเงิน
      paymentMethod: this._translatePaymentMethod(taxInvoice.paymentMethod),
      paymentDate: taxInvoice.paymentDate,

      // ข้อมูลสัญญา
      contractNo: taxInvoice.contractNo,
      quotationNumber: taxInvoice.quotationNumber,
      invoiceNumber: taxInvoice.invoiceNumber,

      // ข้อมูลบริษัท - ใช้ข้อมูลจากฐานข้อมูลโดยตรง
      company: taxInvoice.company || {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
        taxId: '0945566000616',
        phone: '09-2427-0769'
      },

      // ข้อมูลสาขา - ใช้ข้อมูลจากฐานข้อมูลโดยตรง
      branch: taxInvoice.branch || {
        name: 'สำนักงานใหญ่',
        code: taxInvoice.branchCode || '00000',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000'
      },

      // ข้อมูลพนักงาน
      staffName: taxInvoice.employeeName,
      employeeName: taxInvoice.employeeName,
      salesman: taxInvoice.employeeName,

      // หมายเหตุ
      notes: taxInvoice.notes
    };

    // 🔧 FIX: ตรวจสอบว่าพบข้อมูลพนักงานหรือไม่
    const employeeName = result.employeeName;
    if (!employeeName) {
      console.warn('⚠️ Tax Invoice: ไม่พบข้อมูลพนักงานจากการ login - โปรดตรวจสอบการ login');
      console.warn('⚠️ Tax Invoice PDF จะแสดงเป็นช่องว่างหรือ "ไม่ระบุ" สำหรับชื่อพนักงาน');
    } else {
      console.log('👤 Tax Invoice employee from login:', employeeName);
    }

    // 🔧 DEBUG: ตรวจสอบข้อมูลที่จะแสดงใน PDF
    console.log('📄 Tax Invoice PDF Data for display:', {
      staffName: result.staffName,
      employeeName: result.employeeName,
      paymentMethod: result.paymentMethod,
      originalPaymentMethod: taxInvoice.paymentMethod
    });

    return result;
  }

  /**
   * 🆕 แปลงข้อมูล Receipt เป็นรูปแบบ order สำหรับสร้าง PDF
   * @private
   */
  static _convertReceiptToOrder(receipt) {
    console.log('🔄 Converting Receipt to order format');

    // 🔍 DEBUG: ตรวจสอบข้อมูลที่ได้รับจาก frontend
    console.log('📋 Receipt Data from Frontend:', {
      employeeName: receipt.employeeName,
      staffName: receipt.staffName,
      salesman: receipt.salesman,
      salesperson: receipt.salesperson,
      paymentMethod: receipt.paymentMethod,
      receiptNumber: receipt.receiptNumber,
      // 🔧 เพิ่มข้อมูลสำหรับระบบผ่อน
      saleType: receipt.saleType,
      receiptType: receipt.receiptType,
      contractNo: receipt.contractNo,
      downPaymentAmount: receipt.downPaymentAmount,
      quotationNumber: receipt.quotationNumber
    });

    // 🔧 ปรับปรุงการแปลงข้อมูลให้ครบถ้วนตามฐานข้อมูล
    const result = {
      _id: receipt._id,
      order_number: receipt.receiptNumber,
      invoiceNo: receipt.receiptNumber,
      documentType: 'RECEIPT',
      receiptType: receipt.receiptType || 'down_payment_receipt',
      saleDate: receipt.issueDate || receipt.createdAt,

      // ข้อมูลลูกค้า - ใช้ข้อมูลจากฐานข้อมูลโดยตรง
      customer: {
        name: receipt.customer?.name ||
              receipt.customer?.fullName ||
              `${receipt.customer?.prefix || ''} ${receipt.customer?.first_name || ''} ${receipt.customer?.last_name || ''}`.trim() ||
              'ลูกค้าทั่วไป',
        firstName: receipt.customer?.first_name,
        lastName: receipt.customer?.last_name,
        prefix: receipt.customer?.prefix,
        fullName: receipt.customer?.fullName,
        phone: receipt.customer?.phone || receipt.customer?.phone_number,
        taxId: receipt.customer?.taxId || receipt.customer?.tax_id,
        email: receipt.customer?.email,
        address: receipt.customer?.address || 'ไม่ระบุที่อยู่',
        age: receipt.customer?.age
      },

      // รายการสินค้า - ปรับปรุงให้แสดงข้อมูลครบ
      items: (receipt.items || []).map(item => ({
        name: item.name || 'สินค้า',
        brand: item.brand,
        imei: item.imei,
        price: item.unitPrice,
        qty: item.quantity,
        amount: item.totalPrice,
        totalPrice: item.totalPrice,
        description: item.description,
        product: item.product
      })),

      // 🔧 ข้อมูลการเงิน - ให้สอดคล้องกับ TaxInvoice ที่เกี่ยวข้อง
      // สำหรับ Receipt ควรจะแสดงยอดเงินเดียวกันกับ TaxInvoice ที่เกี่ยวข้อง
      summary: {
        subtotal: receipt.summary?.subtotal || receipt.calculation?.subtotal || 0,
        docFee: receipt.summary?.docFee || receipt.calculation?.documentFee || receipt.documentFee || 0,
        discount: receipt.summary?.discount || receipt.calculation?.discount || 0,
        beforeTax: receipt.summary?.beforeTax || receipt.calculation?.beforeTax || 0,
        vatAmount: 0, // Receipt ไม่มี VAT
        totalWithTax: receipt.summary?.totalAmount || receipt.calculation?.totalAmount || 0,
        total: receipt.summary?.totalAmount || receipt.calculation?.totalAmount || 0
      },
      calculation: {
        subtotal: receipt.calculation?.subtotal || receipt.summary?.subtotal || 0,
        documentFee: receipt.calculation?.documentFee || receipt.summary?.docFee || receipt.documentFee || 0,
        discount: receipt.calculation?.discount || receipt.summary?.discount || 0,
        beforeTax: receipt.calculation?.beforeTax || receipt.summary?.beforeTax || 0,
        vatAmount: 0, // Receipt ไม่มี VAT
        totalAmount: receipt.calculation?.totalAmount || receipt.summary?.totalAmount || 0,
        taxType: 'none'
      },
      subTotal: receipt.summary?.subtotal || receipt.calculation?.subtotal || 0,
      docFee: receipt.summary?.docFee || receipt.calculation?.documentFee || receipt.documentFee || 0,
      beforeTax: receipt.summary?.beforeTax || receipt.calculation?.beforeTax || 0,
      vatAmount: 0, // Receipt ไม่มี VAT
      total: receipt.summary?.totalAmount || receipt.calculation?.totalAmount || 0,
      totalAmount: receipt.summary?.totalAmount || receipt.calculation?.totalAmount || 0,
      totalWithTax: receipt.summary?.totalAmount || receipt.calculation?.totalAmount || 0,
      netTotal: receipt.summary?.totalAmount || receipt.calculation?.totalAmount || 0,

      // สำหรับระบบผ่อน: เงินดาวน์
      downPayment: receipt.downPaymentAmount || 0,
      downPaymentAmount: receipt.downPaymentAmount || 0,

      // ข้อมูลภาษี (Receipt ปกติไม่มี VAT)
      taxType: receipt.taxType || 'none',
      vatInclusive: receipt.vatInclusive || false,
      vatRate: receipt.vatRate || 0,
      hasVatItems: receipt.hasVatItems || false,

      // ข้อมูลการชำระเงิน
      paymentMethod: this._translatePaymentMethod(receipt.paymentMethod),
      paymentDate: receipt.paymentDate,

      // ข้อมูลสัญญา
      contractNo: receipt.contractNo,
      quotationNumber: receipt.quotationNumber,
      invoiceNumber: receipt.invoiceNumber,
      taxInvoiceNumber: receipt.taxInvoiceNumber,

      // ข้อมูลบริษัท - ใช้ข้อมูลจากฐานข้อมูลโดยตรง
      company: receipt.company || {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
        taxId: '0945566000616',
        phone: '09-2427-0769'
      },

      // ข้อมูลสาขา - ใช้ข้อมูลจากฐานข้อมูลโดยตรง
      branch: receipt.branch || {
        name: 'สำนักงานใหญ่',
        code: receipt.branchCode || '00000',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000'
      },

      // ข้อมูลพนักงาน
      staffName: receipt.employeeName,
      employeeName: receipt.employeeName,
      salesman: receipt.employeeName,

      // หมายเหตุ
      notes: receipt.notes
    };

    // 🔧 FIX: ตรวจสอบว่าพบข้อมูลพนักงานหรือไม่
    const employeeName = result.employeeName;
    if (!employeeName) {
      console.warn('⚠️ Receipt: ไม่พบข้อมูลพนักงานจากการ login - โปรดตรวจสอบการ login');
      console.warn('⚠️ Receipt PDF จะแสดงเป็นช่องว่างหรือ "ไม่ระบุ" สำหรับชื่อพนักงาน');
    } else {
      console.log('👤 Receipt employee from login:', employeeName);
    }

    // 🔧 DEBUG: ตรวจสอบข้อมูลที่จะแสดงใน PDF
    console.log('📄 Receipt PDF Data for display:', {
      staffName: result.staffName,
      employeeName: result.employeeName,
      paymentMethod: result.paymentMethod,
      originalPaymentMethod: receipt.paymentMethod
    });

    return result;
  }

  /**
   * 🆕 สร้าง PDF จาก document number (ใบกำกับภาษีหรือใบเสร็จ)
   * @param {string} documentNumber - เลขที่เอกสาร
   * @param {string} documentType - ประเภทเอกสาร ('taxinvoice' หรือ 'receipt')
   * @returns {Promise<Object>} ผลลัพธ์ PDF
   */
  static async createPdfByDocumentNumber(documentNumber, documentType = 'auto') {
    console.log(`🧾 Creating PDF for document: ${documentNumber}, type: ${documentType}`);

    try {
      if (documentType === 'taxinvoice' || (documentType === 'auto' && documentNumber.startsWith('TX-'))) {
        // สร้าง Tax Invoice PDF
        return await this.createTaxInvoicePdf(documentNumber);
      } else if (documentType === 'receipt' || (documentType === 'auto' && documentNumber.startsWith('RE-'))) {
        // สร้าง Receipt PDF
        return await this.createReceiptPdfFromModel(documentNumber);
      } else {
        // ลองหาทั้งสองประเภท
        try {
          return await this.createTaxInvoicePdf(documentNumber);
        } catch (error) {
          console.log('Tax Invoice not found, trying Receipt...');
          return await this.createReceiptPdfFromModel(documentNumber);
        }
      }
    } catch (error) {
      console.error('❌ Error creating PDF by document number:', error);
      throw error;
    }
  }

  /**
   * 🆕 ค้นหาเอกสารจากหมายเลขเอกสาร
   * @param {string} documentNumber - เลขที่เอกสาร
   * @returns {Promise<Object>} ข้อมูลเอกสารและประเภท
   */
  static async findDocumentByNumber(documentNumber) {
    console.log(`🔍 Finding document by number: ${documentNumber}`);

    try {
      // ลองหา TaxInvoice ก่อน
      const taxInvoice = await TaxInvoice.findOne({ taxInvoiceNumber: documentNumber });
      if (taxInvoice) {
        return {
          document: taxInvoice,
          type: 'taxinvoice',
          model: 'TaxInvoice'
        };
      }

      // ลองหา Receipt
      const receipt = await Receipt.findOne({ receiptNumber: documentNumber });
      if (receipt) {
        return {
          document: receipt,
          type: 'receipt',
          model: 'Receipt'
        };
      }

      throw new Error(`Document not found: ${documentNumber}`);

    } catch (error) {
      console.error('❌ Error finding document:', error);
      throw error;
    }
  }
  static _getEnhancedCustomerName(order) {
    // ลำดับความสำคัญในการหาชื่อลูกค้า
    let customerName = '';

    // 1. ลองดึงจาก order.customer หรือ order.customerInfo
    if (order.customer?.name) {
      customerName = order.customer.name;
    } else if (order.customerInfo?.name) {
      customerName = order.customerInfo.name;
    } else {
      // 2. สร้างชื่อจาก prefix + firstName + lastName
      const parts = [];

      // จาก order.customer
      if (order.customer?.prefix) parts.push(order.customer.prefix);
      if (order.customer?.firstName) parts.push(order.customer.firstName);
      if (order.customer?.lastName) parts.push(order.customer.lastName);

      // หรือจาก order.customerInfo
      if (!parts.length && order.customerInfo) {
        if (order.customerInfo.prefix) parts.push(order.customerInfo.prefix);
        if (order.customerInfo.firstName) parts.push(order.customerInfo.firstName);
        if (order.customerInfo.lastName) parts.push(order.customerInfo.lastName);
      }

      customerName = parts.join(' ').trim();
    }

    // 3. ถ้ายังไม่มีชื่อหรือเป็น "ลูกค้าทั่วไป" ให้ลองหาจากแหล่งอื่น
    if (!customerName || customerName === 'ลูกค้าทั่วไป') {
      try {
        // ลองดึงข้อมูลจาก Enhanced Email Service integration
        if (order.orderData?.customerInfo?.name && order.orderData.customerInfo.name !== 'ลูกค้าทั่วไป') {
          console.log('✅ A4PDF: Using Enhanced Email Service customer name:', order.orderData.customerInfo.name);
          return order.orderData.customerInfo.name;
        }

        if (order.installmentData?.customerName && order.installmentData.customerName !== 'ลูกค้าทั่วไป') {
          console.log('✅ A4PDF: Using installment customer name:', order.installmentData.customerName);
          return order.installmentData.customerName;
        }

        // ลองดึงข้อมูลจาก localStorage (ผ่าน global variables ถ้ามี)
        if (typeof globalInstallmentManager !== 'undefined') {
          const step2Data = globalInstallmentManager.getStepData(2);
          if (step2Data?.customerData) {
            const customer = step2Data.customerData;
            const fullName = `${customer.prefix || ''} ${customer.firstName || ''} ${customer.lastName || ''}`.trim();
            if (fullName && fullName !== 'ลูกค้าทั่วไป') {
              console.log('✅ A4PDF: Using localStorage customer name:', fullName);
              return fullName;
            }
          }
        }

        // Default fallback - ใช้ "ลูกค้าทั่วไป" แทนข้อมูลคงที่
        console.log('⚠️ A4PDF: No customer data found, using default "ลูกค้าทั่วไป"');
        return 'ลูกค้าทั่วไป';

      } catch (error) {
        console.warn('⚠️ A4PDF: Error getting customer data, using default:', error.message);
        return 'ลูกค้าทั่วไป';
      }
    }

    console.log('✅ A4PDF: Using customer name:', customerName);
    return customerName;
  }

  /**
   * 🆕 แปลงข้อมูลวิธีการชำระเงินจากภาษาอังกฤษเป็นภาษาไทย
   * @private
   */
  static _translatePaymentMethod(paymentMethod) {
    if (!paymentMethod) return 'เงินสด'; // Default เป็นเงินสด

    const paymentMapping = {
      'transfer': 'โอนเงิน',
      'cash': 'เงินสด',
      'credit': 'เครดิต',
      'debit': 'เดบิต',
      'check': 'เช็ค',
      'installment': 'ผ่อนชำระ',
      'ไม่ระบุ': 'เงินสด', // แปลง "ไม่ระบุ" เป็น "เงินสด"
      '': 'เงินสด' // กรณีข้อความว่าง
    };

    // แปลงให้เป็นตัวพิมพ์เล็กเพื่อ mapping
    const normalizedMethod = paymentMethod.toString().toLowerCase();

    const translated = paymentMapping[normalizedMethod] || paymentMapping[paymentMethod] || 'เงินสด';
    console.log(`💳 Payment method translation: ${paymentMethod} → ${translated}`);

    return translated;
  }

  /**
   * 📧 ส่งเอกสาร PDF ทาง Gmail
   * @static
   * @param {Object} emailData - ข้อมูลการส่งอีเมล
   * @param {string} emailData.to - อีเมลผู้รับ
   * @param {string} emailData.subject - หัวเรื่อง
   * @param {string} emailData.body - เนื้อหาอีเมล
   * @param {Buffer} pdfBuffer - ข้อมูล PDF ในรูปแบบ Buffer
   * @param {string} filename - ชื่อไฟล์ PDF
   * @returns {Promise<Object>} ผลลัพธ์การส่งอีเมล
   */
  static async sendPDFByEmail(emailData, pdfBuffer, filename) {
    try {
      console.log('📧 Starting PDF email sending process...');

      // สร้าง instance ของ EmailService
      const emailService = new EmailService();

      // ตรวจสอบการกำหนดค่าอีเมล
      if (!emailService.isConfigured) {
        throw new Error('Email service is not configured. Please check environment variables.');
      }

      // เตรียมข้อมูลการส่งอีเมล
      const mailOptions = {
        to: emailData.to,
        subject: emailData.subject || 'เอกสารใบเสร็จรับเงิน',
        text: emailData.body || 'เอกสารใบเสร็จรับเงินตามไฟล์แนบ',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>เอกสารใบเสร็จรับเงิน</h2>
            <p>${emailData.body || 'กรุณาดูรายละเอียดในไฟล์แนบ'}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              ระบบบัญชีอัตโนมัติ - 2Pheenong Accounting System
            </p>
          </div>
        `,
        attachments: [
          {
            filename: filename || 'receipt.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      console.log('📤 Sending email to:', emailData.to);

      // ส่งอีเมล
      const result = await emailService.sendMail(mailOptions);

      console.log('✅ PDF email sent successfully:', result.messageId);

      return {
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully'
      };

    } catch (error) {
      console.error('❌ Error sending PDF email:', error);

      return {
        success: false,
        error: error.message,
        message: 'Failed to send email'
      };
    }
  }

  /**
   * 📄 สร้างและส่ง PDF Receipt ทาง Email
   * @static
   * @param {string} orderId - Order ID
   * @param {Object} emailData - ข้อมูลการส่งอีเมล
   * @returns {Promise<Object>} ผลลัพธ์การสร้างและส่ง PDF
   */
  static async generateAndEmailReceipt(orderId, emailData) {
    try {
      console.log('📄 Generating and emailing receipt for order:', orderId);

      // สร้าง PDF Buffer
      const pdfBuffer = await this.generatePDFBuffer(orderId);

      if (!pdfBuffer) {
        throw new Error('Failed to generate PDF buffer');
      }

      // สร้างชื่อไฟล์
      const filename = `receipt_${orderId}_${new Date().toISOString().split('T')[0]}.pdf`;

      // ส่งอีเมล
      const emailResult = await this.sendPDFByEmail(emailData, pdfBuffer, filename);

      return {
        success: emailResult.success,
        pdfGenerated: true,
        emailSent: emailResult.success,
        messageId: emailResult.messageId,
        filename: filename,
        message: emailResult.success ? 'PDF generated and email sent successfully' : emailResult.message,
        error: emailResult.error
      };

    } catch (error) {
      console.error('❌ Error in generateAndEmailReceipt:', error);

      return {
        success: false,
        pdfGenerated: false,
        emailSent: false,
        message: 'Failed to generate PDF or send email',
        error: error.message
      };
    }
  }
}

module.exports = A4PDFController;