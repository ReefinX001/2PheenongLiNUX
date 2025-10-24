/**
 * @file InstallmentPDFController.js
 * @description Enhanced PDF Controller specifically for installment system with complete step1-4 data support
 * @version 2.0.0
 * @date 2025-01-27
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Import existing controllers for backward compatibility
const QuotationPdfController = require('../QuotationPdfController');
const InvoicePdfController = require('../InvoicePdfController');
const A4PDFController = require('./A4PDFController');

// --- Enhanced Configuration for Installment PDFs ---
const INSTALLMENT_CONFIG = {
  page: { size: 'A4', margin: 40 },
  font: {
    name: 'THSarabun', boldName: 'THSarabun-Bold',
    path: path.join(__dirname, '..', '..', 'fonts', 'THSarabunNew.ttf'),
    boldPath: path.join(__dirname, '..', '..', 'fonts', 'THSarabunNew Bold.ttf')
  },
  color: {
    primaryBlue: '#2563eb',
    primaryGreen: '#059669',
    primaryOrange: '#ea580c',
    textHeader: '#FFFFFF',
    textBlack: '#000000',
    textDark: '#1f2937',
    textLight: '#6b7280',
    lineLight: '#e5e7eb',
    lineDark: '#d1d5db',
    bgWhite: '#FFFFFF',
    bgLight: '#f9fafb',
    bgBlue: '#eff6ff',
    bgGreen: '#f0fdf4',
    bgOrange: '#fff7ed'
  },
  sizes: {
    logo: { w: 120, h: 60 },
    heading1: 18,
    heading2: 14,
    heading3: 12,
    textBody: 11,
    textLabel: 10,
    textSmall: 9,
    tableHeader: 11,
    tableRow: 10,
    lineHeight: 1.4
  },
  layout: {
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    tableCols: {
      no: 30,
      desc: 200,
      imei: 120,
      qty: 40,
      unit: 60,
      amount: 80
    }
  }
};

class InstallmentPDFController {

  /**
   * Create Installment Quotation PDF with complete step data
   */
  static async createInstallmentQuotation(stepData) {
    try {
      console.log('📄 Creating Installment Quotation PDF...');

      // Transform step data to order format
      const orderData = this.transformStepDataToOrder(stepData);

      // Create PDF using enhanced quotation controller
      return await this.createEnhancedQuotationPdf(orderData);

    } catch (error) {
      console.error('❌ Error creating installment quotation:', error);
      throw error;
    }
  }

  /**
   * Create Installment Invoice PDF with complete step data
   */
  static async createInstallmentInvoice(stepData) {
    try {
      console.log('📄 Creating Installment Invoice PDF...');

      // Transform step data to order format
      const orderData = this.transformStepDataToOrder(stepData);

      // Create PDF using enhanced invoice controller
      return await this.createEnhancedInvoicePdf(orderData);

    } catch (error) {
      console.error('❌ Error creating installment invoice:', error);
      throw error;
    }
  }

  /**
   * Create Receipt PDF for down payment
   */
  static async createDownPaymentReceipt(stepData) {
    try {
      console.log('📄 Creating Down Payment Receipt PDF...');

      // Transform step data to order format with focus on down payment
      const orderData = this.transformStepDataToOrder(stepData, { focusOnDownPayment: true });

      // Create PDF using A4 controller
      return await A4PDFController.printReceipt(orderData);

    } catch (error) {
      console.error('❌ Error creating down payment receipt:', error);
      throw error;
    }
  }

  /**
   * Create Complete Contract PDF with installment schedule
   */
  static async createInstallmentContract(stepData) {
    try {
      console.log('📄 Creating Installment Contract PDF...');

      const orderData = this.transformStepDataToOrder(stepData);

      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({
            size: INSTALLMENT_CONFIG.page.size,
            margins: INSTALLMENT_CONFIG.layout.margins
          });

          const chunks = [];
          doc.on('data', chunk => chunks.push(chunk));
          doc.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const fileName = `contract_${orderData.order_number}_${Date.now()}.pdf`;
            resolve({ buffer, fileName });
          });

          // Register Thai font
          this.registerThaiFont(doc);

          // Build contract content
          this.buildContractHeader(doc, orderData);
          this.buildContractCustomerInfo(doc, orderData);
          this.buildContractItemsTable(doc, orderData);
          this.buildInstallmentSchedule(doc, orderData);
          this.buildContractTerms(doc, orderData);
          this.buildContractSignatures(doc, orderData);

          doc.end();

        } catch (error) {
          reject(error);
        }
      });

    } catch (error) {
      console.error('❌ Error creating installment contract:', error);
      throw error;
    }
  }

  /**
   * Transform step data to order format that PDF controllers expect
   */
  static transformStepDataToOrder(stepData, options = {}) {
    const { focusOnDownPayment = false } = options;

    console.log('🔄 Transforming step data to order format...', { focusOnDownPayment });

    // === Basic Order Information ===
    const order = {
      _id: this.generateOrderId(),
      order_number: this.generateOrderNumber(),
      invoiceNo: this.generateInvoiceNumber(),
      invoiceType: stepData.documentType === 'TAX_INVOICE' ? 'TAX_INVOICE' : 'RECEIPT',
      saleDate: new Date(),
      createdAt: new Date(),

      // === Staff Information from step data or defaults ===
      staffName: this.extractStaffName(stepData),
      staffId: this.extractStaffId(stepData),
      performed_by: this.extractStaffName(stepData),
      salesperson: this.extractStaffName(stepData),

      // === Customer Information from step2 ===
      customerType: 'individual',
      customer: this.transformCustomerData(stepData.step2),

      // === Branch & Company Information ===
      branch: this.getBranchInfo(stepData.branchInfo),
      company: this.getCompanyInfo(),

      // === Items from step1 ===
      items: this.transformItemsData(stepData.step1, focusOnDownPayment),

      // === Payment calculation ===
      ...this.calculatePaymentAmounts(stepData, focusOnDownPayment),

      // === Signatures ===
      customerSignatureUrl: stepData.customerSignature,
      salespersonSignatureUrl: stepData.salespersonSignature,

      // === Installment specific data ===
      installmentDetails: {
        paymentPlan: stepData.step3 || {},
        schedule: this.generateInstallmentSchedule(stepData),
        terms: this.generateInstallmentTerms(stepData)
      },

      // === Document metadata ===
      documentType: focusOnDownPayment ? 'down_payment_receipt' : 'installment_quotation',
      generatedBy: 'installment_system_v2',
      stepDataIncluded: true
    };

    console.log('✅ Order transformation completed', {
      customerName: order.customer?.firstName + ' ' + order.customer?.lastName,
      itemsCount: order.items?.length || 0,
      totalAmount: order.total || 0,
      downPayment: order.downPayment || 0
    });

    return order;
  }

  /**
   * Enhanced customer data transformation
   */
  static transformCustomerData(step2Data) {
    if (!step2Data) {
      return {
        prefix: 'คุณ',
        firstName: 'ลูกค้า',
        lastName: 'ทั่วไป',
        phone: '-',
        address: { full: '-' }
      };
    }

    return {
      // === Basic customer info ===
      prefix: step2Data.customerPrefix || '',
      firstName: step2Data.customerFirstName || '',
      lastName: step2Data.customerLastName || '',
      fullName: `${step2Data.customerPrefix || ''} ${step2Data.customerFirstName || ''} ${step2Data.customerLastName || ''}`.trim(),

      // === Contact info ===
      phone: step2Data.customerPhone || '',
      email: step2Data.customerEmail || '',
      lineId: step2Data.customerLineId || '',
      facebook: step2Data.customerFacebook || '',

      // === Personal info ===
      idCard: step2Data.customerIdCard || '',
      age: step2Data.customerAge || '',
      birthDate: step2Data.customerBirthDate || '',

      // === Occupation ===
      occupation: step2Data.customerOccupation || '',
      income: parseFloat(step2Data.customerIncome || 0),
      workplace: step2Data.customerWorkplace || '',

      // === Address ===
      address: {
        houseNo: step2Data.houseNo || '',
        moo: step2Data.moo || '',
        soi: step2Data.soi || '',
        road: step2Data.road || '',
        subDistrict: step2Data.subDistrict || '',
        district: step2Data.district || '',
        province: step2Data.province || '',
        zipcode: step2Data.zipcode || '',
        full: this.buildFullAddress(step2Data)
      },

      // === Contact address if different ===
      contactAddress: this.buildContactAddress(step2Data),

      // === Coordinates ===
      coordinates: {
        latitude: step2Data.customerLatitude || '',
        longitude: step2Data.customerLongitude || '',
        mapUrl: step2Data.customerMapUrl || ''
      },

      // === Tax info ===
      taxId: step2Data.customerIdCard || ''
    };
  }

  /**
   * Enhanced items data transformation
   */
  static transformItemsData(step1Data, focusOnDownPayment = false) {
    if (!step1Data || !Array.isArray(step1Data)) {
      return [];
    }

    return step1Data.map((item, index) => {
      const price = parseFloat(item.price || 0);
      const downAmount = parseFloat(item.downAmount || 0);
      const quantity = parseInt(item.quantity || 1);

      return {
        _id: item.id || `item_${index}`,
        name: item.name || 'สินค้า',
        description: `${item.name || 'สินค้า'}${item.brand ? ` (${item.brand})` : ''}`,

        // === Pricing ===
        price: focusOnDownPayment ? downAmount : price,
        originalPrice: price,
        downAmount: downAmount,
        installmentAmount: price - downAmount,

        // === Quantity ===
        qty: quantity,
        unit: 'ชิ้น',

        // === Subtotal ===
        subtotal: focusOnDownPayment ? (downAmount * quantity) : (price * quantity),

        // === Product details ===
        brand: item.brand || '',
        model: item.model || '',
        category: item.category || '',

        // === Installment specific ===
        imei: item.imei || item.barcode || '',
        docFee: parseFloat(item.docFee || 0),

        // === Terms ===
        installmentTerms: {
          downInstallmentCount: parseInt(item.downInstallmentCount || 12),
          payUseInstallment: parseFloat(item.payUseInstallment || 0),
          payUseInstallmentCount: parseInt(item.payUseInstallmentCount || 24),
          pricePayOff: parseFloat(item.pricePayOff || price)
        },

        // === Tax ===
        taxType: item.taxType || 'included',
        taxRate: parseFloat(item.taxRate || 7)
      };
    });
  }

  /**
   * Calculate payment amounts based on step data
   */
  static calculatePaymentAmounts(stepData, focusOnDownPayment = false) {
    const items = stepData.step1 || [];
    const paymentPlan = stepData.step3 || {};

    // Calculate from items
    let subTotal = 0;
    let totalDownPayment = 0;
    let totalInstallmentAmount = 0;

    items.forEach(item => {
      const price = parseFloat(item.price || 0);
      const downAmount = parseFloat(item.downAmount || 0);
      const quantity = parseInt(item.quantity || 1);

      if (focusOnDownPayment) {
        subTotal += downAmount * quantity;
      } else {
        subTotal += price * quantity;
      }

      totalDownPayment += downAmount * quantity;
      totalInstallmentAmount += (price - downAmount) * quantity;
    });

    // Override with payment plan if available
    if (paymentPlan.customDownPayment) {
      totalDownPayment = parseFloat(paymentPlan.customDownPayment);
    }

    if (paymentPlan.customInstallmentAmount) {
      totalInstallmentAmount = parseFloat(paymentPlan.customInstallmentAmount);
    }

    const documentFee = parseFloat(paymentPlan.globalDocumentFee || 500);
    const discount = 0; // No discount for installment
    const vatAmount = this.calculateVAT(subTotal, items);

    const total = focusOnDownPayment ?
      (totalDownPayment + documentFee + vatAmount) :
      (subTotal + documentFee + vatAmount - discount);

    return {
      subTotal,
      discount,
      vatAmount,
      documentFee,
      total,
      downPayment: totalDownPayment,
      installmentAmount: totalInstallmentAmount,
      paymentMethod: paymentPlan.globalPaymentMethod || 'cash',
      installmentCount: parseInt(paymentPlan.customInstallmentCount || 12)
    };
  }

  /**
   * Calculate VAT based on items tax settings
   */
  static calculateVAT(subTotal, items) {
    // Check if any item requires VAT
    const hasVATItems = items.some(item => item.taxType === 'excluded');

    if (hasVATItems) {
      return subTotal * 0.07; // 7% VAT
    }

    return 0; // VAT included in price
  }

  /**
   * Generate installment schedule
   */
  static generateInstallmentSchedule(stepData) {
    const paymentPlan = stepData.step3 || {};
    const installmentCount = parseInt(paymentPlan.customInstallmentCount || 12);
    const installmentAmount = parseFloat(paymentPlan.customInstallmentAmount || 0);

    const schedule = [];
    const startDate = new Date();

    for (let i = 1; i <= installmentCount; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        installmentNumber: i,
        dueDate: dueDate,
        amount: installmentAmount,
        status: 'pending',
        description: `งวดที่ ${i} จาก ${installmentCount}`
      });
    }

    return schedule;
  }

  /**
   * Generate installment terms and conditions
   */
  static generateInstallmentTerms(stepData) {
    return {
      interestRate: 0,
      lateFee: 100,
      gracePeriod: 7,
      warranty: '1 ปี',
      paymentMethod: stepData.step3?.globalPaymentMethod || 'cash',
      conditions: [
        'สินค้ามีประกันเครื่อง 1 ปี',
        'หากตรวจสอบสินค้าแล้วพบว่าเกิดจากระบบซอฟแวร์ภายในเครื่อง',
        'ลูกค้ายินยอมจะรอทางศูนย์ดำเนินการเคลมสินค้า',
        'ระยะเวลาการเคลมสินค้าขึ้นอยู่กับศูนย์',
        'หากเกิดความเสียหายจากการกระทำของลูกค้า เช่น ตก แตก โดนน้ำ ถือว่าประกันสิ้นสุดทันที',
        'การชำระเงินงวดล่าช้าจะมีค่าปรับ 100 บาทต่อวัน',
        'ลูกค้าสามารถชำระเงินก่อนกำหนดได้โดยไม่มีค่าธรรมเนียม'
      ]
    };
  }

  /**
   * Build full address from step2 data
   */
  static buildFullAddress(step2Data) {
    const parts = [
      step2Data.houseNo,
      step2Data.moo ? `ม.${step2Data.moo}` : '',
      step2Data.soi ? `ซ.${step2Data.soi}` : '',
      step2Data.road ? `ถ.${step2Data.road}` : '',
      step2Data.subDistrict ? `ต.${step2Data.subDistrict}` : '',
      step2Data.district ? `อ.${step2Data.district}` : '',
      step2Data.province ? `จ.${step2Data.province}` : '',
      step2Data.zipcode
    ].filter(part => part && part.trim() !== '');

    return parts.join(' ') || '-';
  }

  /**
   * Build contact address if different from main address
   */
  static buildContactAddress(step2Data) {
    if (!step2Data.contactHouseNo) {
      return null; // Use same as main address
    }

    const parts = [
      step2Data.contactHouseNo,
      step2Data.contactMoo ? `ม.${step2Data.contactMoo}` : '',
      step2Data.contactSoi ? `ซ.${step2Data.contactSoi}` : '',
      step2Data.contactRoad ? `ถ.${step2Data.contactRoad}` : '',
      step2Data.contactSubDistrict ? `ต.${step2Data.contactSubDistrict}` : '',
      step2Data.contactDistrict ? `อ.${step2Data.contactDistrict}` : '',
      step2Data.contactProvince ? `จ.${step2Data.contactProvince}` : '',
      step2Data.contactPostalCode
    ].filter(part => part && part.trim() !== '');

    return parts.join(' ') || null;
  }

  /**
   * Extract staff name from various sources
   */
  static extractStaffName(stepData) {
    // Try multiple sources
    return stepData.staffName ||
           stepData.user?.name ||
           stepData.performed_by ||
           localStorage.getItem('currentUser') ||
           'พนักงาน';
  }

  /**
   * Extract staff ID from various sources
   */
  static extractStaffId(stepData) {
    return stepData.staffId ||
           stepData.user?.id ||
           stepData.employee_id ||
           'EMP001';
  }

  /**
   * Get branch information
   */
  static getBranchInfo(branchInfo) {
    const branchCode = window.BRANCH_CODE || branchInfo || 'PATTANI';

    const branchData = {
      'PATTANI': {
        name: 'สาขาปัตตานี',
        code: 'PATTANI',
        address: '123 ถนนปัตตานี จังหวัดปัตตานี 94000',
        tel: '073-374777',
        phone: '073-374777',
        taxId: '0945566000616'
      }
    };

    return branchData[branchCode] || branchData['PATTANI'];
  }

  /**
   * Get company information
   */
  static getCompanyInfo() {
    return {
      name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
      taxId: '0945566000616',
      address: '123 ถนนหลัก จังหวัดปัตตานี 94000',
      phone: '073-374777'
    };
  }

  /**
   * Generate unique order ID
   */
  static generateOrderId() {
    return `INS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate order number
   */
  static generateOrderNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');

    return `INS${year}${month}${day}${random}`;
  }

  /**
   * Generate invoice number
   */
  static generateInvoiceNumber() {
    return this.generateOrderNumber();
  }

  /**
   * Create enhanced quotation PDF using existing controller
   */
  static async createEnhancedQuotationPdf(orderData) {
    try {
      // Use existing QuotationPdfController with enhanced data
      const result = await QuotationPdfController.createQuotationPdf(orderData);

      console.log('✅ Enhanced quotation PDF created successfully');
      return result;

    } catch (error) {
      console.error('❌ Error creating enhanced quotation PDF:', error);
      throw error;
    }
  }

  /**
   * Create enhanced invoice PDF using existing controller
   */
  static async createEnhancedInvoicePdf(orderData) {
    try {
      // Use existing InvoicePdfController with enhanced data
      const result = await InvoicePdfController.createInvoicePdf(orderData);

      console.log('✅ Enhanced invoice PDF created successfully');
      return result;

    } catch (error) {
      console.error('❌ Error creating enhanced invoice PDF:', error);
      throw error;
    }
  }

  // === Contract PDF Building Methods ===

  /**
   * Register Thai font for PDF
   */
  static registerThaiFont(doc) {
    const fontPath = INSTALLMENT_CONFIG.font.path;

    if (fs.existsSync(fontPath)) {
      doc.registerFont('THSarabun', fontPath);
      doc.font('THSarabun');
    } else {
      console.warn('Thai font not found, using default font');
      doc.font('Helvetica');
    }
  }

  /**
   * Build contract header
   */
  static buildContractHeader(doc, orderData) {
    const { width } = doc.page;
    const centerX = width / 2;

    // Company logo (if exists)
    const logoPath = path.join(__dirname, '..', '..', 'Logo', 'logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, centerX - 60, 60, { width: 120 });
      doc.moveDown(3);
    }

    // Title
    doc.fontSize(INSTALLMENT_CONFIG.sizes.heading1)
       .fillColor(INSTALLMENT_CONFIG.color.textBlack)
       .text('สัญญาการผ่อนชำระ', { align: 'center' });

    doc.moveDown(0.5);

    // Contract number and date
    doc.fontSize(INSTALLMENT_CONFIG.sizes.textBody)
       .text(`เลขที่สัญญา: ${orderData.order_number}`, { align: 'center' })
       .text(`วันที่: ${this.formatThaiDate(orderData.saleDate)}`, { align: 'center' });

    doc.moveDown();
  }

  /**
   * Build contract customer information section
   */
  static buildContractCustomerInfo(doc, orderData) {
    const customer = orderData.customer;

    doc.fontSize(INSTALLMENT_CONFIG.sizes.heading2)
       .fillColor(INSTALLMENT_CONFIG.color.textBlack)
       .text('ข้อมูลผู้ซื้อ (ผู้ผ่อนชำระ)', { underline: true });

    doc.moveDown(0.5);

    doc.fontSize(INSTALLMENT_CONFIG.sizes.textBody)
       .fillColor(INSTALLMENT_CONFIG.color.textDark)
       .text(`ชื่อ: ${customer.fullName || `${customer.firstName} ${customer.lastName}`}`)
       .text(`เลขบัตรประชาชน: ${customer.idCard || '-'}`)
       .text(`โทรศัพท์: ${customer.phone || '-'}`)
       .text(`อีเมล: ${customer.email || '-'}`)
       .text(`อาชีพ: ${customer.occupation || '-'}`)
       .text(`รายได้ต่อเดือน: ${customer.income ? customer.income.toLocaleString() + ' บาท' : '-'}`)
       .text(`ที่อยู่: ${customer.address?.full || '-'}`);

    if (customer.contactAddress) {
      doc.text(`ที่อยู่สำหรับติดต่อ: ${customer.contactAddress}`);
    }

    doc.moveDown();
  }

  /**
   * Build contract items table
   */
  static buildContractItemsTable(doc, orderData) {
    doc.fontSize(INSTALLMENT_CONFIG.sizes.heading2)
       .fillColor(INSTALLMENT_CONFIG.color.textBlack)
       .text('รายการสินค้า', { underline: true });

    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = INSTALLMENT_CONFIG.layout.tableCols;

    let currentX = tableLeft;

    doc.fontSize(INSTALLMENT_CONFIG.sizes.tableHeader)
       .fillColor(INSTALLMENT_CONFIG.color.textBlack);

    // Header row
    doc.text('ลำดับ', currentX, tableTop, { width: colWidths.no, align: 'center' });
    currentX += colWidths.no;

    doc.text('รายการสินค้า', currentX, tableTop, { width: colWidths.desc, align: 'center' });
    currentX += colWidths.desc;

    doc.text('IMEI', currentX, tableTop, { width: colWidths.imei, align: 'center' });
    currentX += colWidths.imei;

    doc.text('จำนวน', currentX, tableTop, { width: colWidths.qty, align: 'center' });
    currentX += colWidths.qty;

    doc.text('ราคาต่อหน่วย', currentX, tableTop, { width: colWidths.unit, align: 'center' });
    currentX += colWidths.unit;

    doc.text('รวม', currentX, tableTop, { width: colWidths.amount, align: 'center' });

    // Draw header line
    doc.moveTo(tableLeft, tableTop + 20)
       .lineTo(tableLeft + Object.values(colWidths).reduce((a, b) => a + b, 0), tableTop + 20)
       .stroke();

    // Table rows
    let currentY = tableTop + 30;
    doc.fontSize(INSTALLMENT_CONFIG.sizes.tableRow);

    orderData.items.forEach((item, index) => {
      currentX = tableLeft;

      doc.text(String(index + 1), currentX, currentY, { width: colWidths.no, align: 'center' });
      currentX += colWidths.no;

      doc.text(item.name, currentX, currentY, { width: colWidths.desc });
      currentX += colWidths.desc;

      doc.text(item.imei || '-', currentX, currentY, { width: colWidths.imei, align: 'center' });
      currentX += colWidths.imei;

      doc.text(String(item.qty), currentX, currentY, { width: colWidths.qty, align: 'center' });
      currentX += colWidths.qty;

      doc.text(item.originalPrice.toLocaleString(), currentX, currentY, { width: colWidths.unit, align: 'right' });
      currentX += colWidths.unit;

      doc.text((item.originalPrice * item.qty).toLocaleString(), currentX, currentY, { width: colWidths.amount, align: 'right' });

      currentY += 25;
    });

    // Total line
    doc.moveTo(tableLeft, currentY)
       .lineTo(tableLeft + Object.values(colWidths).reduce((a, b) => a + b, 0), currentY)
       .stroke();

    currentY += 10;

    // Summary
    const summaryX = tableLeft + colWidths.no + colWidths.desc + colWidths.imei;

    doc.text('รวมมูลค่าสินค้า:', summaryX, currentY, { width: colWidths.qty + colWidths.unit, align: 'right' });
    doc.text(orderData.subTotal.toLocaleString() + ' บาท', summaryX + colWidths.qty + colWidths.unit, currentY, { width: colWidths.amount, align: 'right' });

    doc.y = currentY + 30;
  }

  /**
   * Build installment schedule table
   */
  static buildInstallmentSchedule(doc, orderData) {
    doc.fontSize(INSTALLMENT_CONFIG.sizes.heading2)
       .fillColor(INSTALLMENT_CONFIG.color.textBlack)
       .text('ตารางการชำระเงิน', { underline: true });

    doc.moveDown(0.5);

    const schedule = orderData.installmentDetails?.schedule || [];

    // Payment summary
    doc.fontSize(INSTALLMENT_CONFIG.sizes.textBody)
       .text(`เงินดาวน์: ${orderData.downPayment?.toLocaleString() || '0'} บาท`)
       .text(`ยอดผ่อน: ${orderData.installmentAmount?.toLocaleString() || '0'} บาท`)
       .text(`จำนวนงวด: ${orderData.installmentCount || 0} งวด`)
       .text(`ค่างวดละ: ${(orderData.installmentAmount / orderData.installmentCount || 0).toLocaleString()} บาท`);

    doc.moveDown();

    if (schedule.length > 0) {
      // Schedule table header
      const tableTop = doc.y;
      const tableLeft = 50;

      doc.fontSize(INSTALLMENT_CONFIG.sizes.tableHeader)
         .text('งวดที่', tableLeft, tableTop, { width: 50 })
         .text('วันที่ครบกำหนด', tableLeft + 60, tableTop, { width: 150 })
         .text('จำนวนเงิน', tableLeft + 220, tableTop, { width: 100, align: 'right' });

      // Draw header line
      doc.moveTo(tableLeft, tableTop + 20)
         .lineTo(tableLeft + 370, tableTop + 20)
         .stroke();

      let currentY = tableTop + 30;
      doc.fontSize(INSTALLMENT_CONFIG.sizes.tableRow);

      schedule.slice(0, 10).forEach((payment, index) => { // Show first 10 payments
        doc.text(String(payment.installmentNumber), tableLeft, currentY, { width: 50 })
           .text(this.formatThaiDate(payment.dueDate), tableLeft + 60, currentY, { width: 150 })
           .text(payment.amount.toLocaleString() + ' บาท', tableLeft + 220, currentY, { width: 100, align: 'right' });

        currentY += 20;
      });

      if (schedule.length > 10) {
        doc.text('... และอีก ' + (schedule.length - 10) + ' งวด', tableLeft, currentY);
      }
    }

    doc.moveDown();
  }

  /**
   * Build contract terms and conditions
   */
  static buildContractTerms(doc, orderData) {
    doc.fontSize(INSTALLMENT_CONFIG.sizes.heading2)
       .fillColor(INSTALLMENT_CONFIG.color.textBlack)
       .text('เงื่อนไขและข้อตกลง', { underline: true });

    doc.moveDown(0.5);

    const terms = orderData.installmentDetails?.terms?.conditions || [];

    doc.fontSize(INSTALLMENT_CONFIG.sizes.textBody)
       .fillColor(INSTALLMENT_CONFIG.color.textDark);

    terms.forEach((term, index) => {
      doc.text(`${index + 1}. ${term}`, { indent: 20 });
      doc.moveDown(0.3);
    });

    doc.moveDown();
  }

  /**
   * Build contract signatures section
   */
  static buildContractSignatures(doc, orderData) {
    doc.fontSize(INSTALLMENT_CONFIG.sizes.heading2)
       .fillColor(INSTALLMENT_CONFIG.color.textBlack)
       .text('ลายเซ็นและการยืนยัน', { underline: true });

    doc.moveDown();

    const signatureY = doc.y;
    const leftColumn = 70;
    const rightColumn = 350;

    // Customer signature
    doc.fontSize(INSTALLMENT_CONFIG.sizes.textBody)
       .text('ลูกค้า (ผู้ซื้อ)', leftColumn, signatureY);

    // Draw signature line
    doc.moveTo(leftColumn, signatureY + 60)
       .lineTo(leftColumn + 200, signatureY + 60)
       .stroke();

    doc.text(`(${orderData.customer?.fullName || 'ลูกค้า'})`, leftColumn, signatureY + 70, { align: 'center', width: 200 });
    doc.text(`วันที่: ${this.formatThaiDate(new Date())}`, leftColumn, signatureY + 90, { align: 'center', width: 200 });

    // Salesperson signature
    doc.text('พนักงานขาย', rightColumn, signatureY);

    doc.moveTo(rightColumn, signatureY + 60)
       .lineTo(rightColumn + 200, signatureY + 60)
       .stroke();

    doc.text(`(${orderData.staffName || 'พนักงาน'})`, rightColumn, signatureY + 70, { align: 'center', width: 200 });
    doc.text(`วันที่: ${this.formatThaiDate(new Date())}`, rightColumn, signatureY + 90, { align: 'center', width: 200 });
  }

  /**
   * Format date to Thai format
   */
  static formatThaiDate(date) {
    if (!date) return '-';

    try {
      const d = new Date(date);
      return d.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return '-';
    }
  }
}

module.exports = InstallmentPDFController;