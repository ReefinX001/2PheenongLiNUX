/**
 * @file InstallmentDocumentController.js
 * @description Controller สำหรับสร้างเอกสารต่างๆ ในระบบผ่อนชำระ Pattani
 * @version 1.0.0
 * @date 2025-01-27
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class InstallmentDocumentController {
  constructor() {
    this.fontPath = path.join(__dirname, '../../fonts/');
    this.logoPath = path.join(__dirname, '../../Logo/');
    this.uploadPath = path.join(__dirname, '../../uploads/');
  }

  /**
   * สร้างสัญญาผ่อนชำระ (Installment Contract)
   */
  async generateInstallmentContract(req, res) {
    try {
      console.log('📄 Generating Installment Contract...');

      const {
        // Step 1: Product Data
        selectedProducts, downAmount, downInstallment, creditThreshold,
        productType, taxType, taxRate, payUseInstallment, pricePayOff, docFee,

        // Step 2: Customer Data
        prefix, firstName, lastName, age, occupation, income, workplace,
        houseNo, moo, soi, road, province, district, subDistrict, zipcode,
        coordinates, latitude, longitude, phone, email,
        idCardImageUrl, selfieUrl, customerSignatureUrl, salespersonSignatureUrl,

        // Step 3: Payment Plan
        customDownPayment, customInstallmentCount, globalPaymentMethod,
        globalDocumentFee, paymentSchedule, totalInterest, totalAmount,

        // Step 4: Contract Terms
        contractTerms, specialConditions, witnessInfo, approvalStatus,
        contractNumber, contractDate, salesPersonInfo
      } = req.body;

      // Create PDF document
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const filename = `installment_contract_${contractNumber || Date.now()}.pdf`;
      const filepath = path.join(this.uploadPath, 'contracts', filename);

      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(filepath), { recursive: true });

      // Create write stream
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Register fonts
      try {
        doc.registerFont('THSarabun', path.join(this.fontPath, 'THSarabunNew.ttf'));
        doc.registerFont('THSarabun-Bold', path.join(this.fontPath, 'THSarabunNew Bold.ttf'));
      } catch (fontError) {
        console.warn('⚠️ Font not found, using default font');
      }

      // === HEADER SECTION ===
      await this.addContractHeader(doc, contractNumber, contractDate);

      // === COMPANY INFO ===
      await this.addCompanyInfo(doc);

      // === CUSTOMER INFO (From Step 2) ===
      await this.addCustomerInfo(doc, {
        prefix, firstName, lastName, age, occupation, income, workplace,
        houseNo, moo, soi, road, province, district, subDistrict, zipcode,
        phone, email, idCardImageUrl
      });

      // === PRODUCT INFO (From Step 1) ===
      await this.addProductInfo(doc, {
        selectedProducts, productType, taxType, taxRate
      });

      // === PAYMENT TERMS (From Step 1 & 3) ===
      await this.addPaymentTerms(doc, {
        downAmount, downInstallment, customDownPayment, customInstallmentCount,
        globalPaymentMethod, docFee, globalDocumentFee, paymentSchedule,
        totalInterest, totalAmount, pricePayOff
      });

      // === CONTRACT TERMS (From Step 4) ===
      await this.addContractTerms(doc, contractTerms, specialConditions);

      // === SIGNATURES ===
      await this.addSignatureSection(doc, {
        customerSignatureUrl, salespersonSignatureUrl, salesPersonInfo, witnessInfo
      });

      // Finalize PDF
      doc.end();

      // Wait for file to be written
      await new Promise((resolve) => stream.on('finish', resolve));

      res.json({
        success: true,
        message: 'สร้างสัญญาผ่อนชำระสำเร็จ',
        filename: filename,
        filepath: `/uploads/contracts/${filename}`,
        data: {
          contractNumber,
          customerName: `${prefix}${firstName} ${lastName}`,
          totalAmount,
          installmentCount: customInstallmentCount
        }
      });

    } catch (error) {
      console.error('❌ Error generating installment contract:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างสัญญา',
        error: error.message
      });
    }
  }

  /**
   * สร้างใบเสนอราคา (Quotation) จากข้อมูล Step 1-3
   */
  async generateQuotation(req, res) {
    try {
      console.log('📋 Generating Enhanced Quotation...');

      const quotationData = req.body;
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const filename = `quotation_${Date.now()}.pdf`;
      const filepath = path.join(this.uploadPath, 'quotations', filename);

      await fs.promises.mkdir(path.dirname(filepath), { recursive: true });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // === QUOTATION HEADER ===
      doc.fontSize(20).font('THSarabun-Bold').text('ใบเสนอราคา', 250, 50);
      doc.fontSize(12).font('THSarabun')
        .text(`เลขที่: ${quotationData.quotationNumber || 'QT' + Date.now()}`, 400, 80);
      doc.text(`วันที่: ${new Date().toLocaleDateString('th-TH')}`, 400, 95);

      let yPos = 140;

      // === CUSTOMER INFO ===
      if (quotationData.firstName) {
        doc.fontSize(14).font('THSarabun-Bold').text('ข้อมูลลูกค้า', 50, yPos);
        yPos += 25;

        doc.fontSize(12).font('THSarabun')
          .text(`ชื่อ: ${quotationData.prefix || ''}${quotationData.firstName} ${quotationData.lastName}`, 50, yPos)
          .text(`อายุ: ${quotationData.age || 'ไม่ระบุ'} ปี`, 300, yPos);
        yPos += 20;

        doc.text(`โทรศัพท์: ${quotationData.phone || 'ไม่ระบุ'}`, 50, yPos)
          .text(`อาชีพ: ${quotationData.occupation || 'ไม่ระบุ'}`, 300, yPos);
        yPos += 20;

        // Address from Step 2
        const fullAddress = `${quotationData.houseNo || ''} หมู่ ${quotationData.moo || ''} ${quotationData.soi || ''} ${quotationData.road || ''} ${quotationData.subDistrict || ''} ${quotationData.district || ''} ${quotationData.province || ''} ${quotationData.zipcode || ''}`.trim();
        if (fullAddress) {
          doc.text(`ที่อยู่: ${fullAddress}`, 50, yPos);
          yPos += 20;
        }

        yPos += 15;
      }

      // === PRODUCT DETAILS ===
      doc.fontSize(14).font('THSarabun-Bold').text('รายการสินค้า', 50, yPos);
      yPos += 25;

      // Table headers
      doc.fontSize(12).font('THSarabun-Bold')
        .text('ลำดับ', 50, yPos)
        .text('รายการ', 90, yPos)
        .text('จำนวน', 300, yPos)
        .text('ราคาต่อหน่วย', 360, yPos)
        .text('รวม', 450, yPos);

      yPos += 20;
      doc.moveTo(50, yPos).lineTo(500, yPos).stroke();
      yPos += 10;

      let totalPrice = 0;
      const products = quotationData.selectedProducts || [];

      products.forEach((product, index) => {
        const itemTotal = (product.quantity || 1) * (product.unitPrice || product.price || 0);
        totalPrice += itemTotal;

        doc.fontSize(11).font('THSarabun')
          .text((index + 1).toString(), 50, yPos)
          .text(product.productName || product.name || 'ไม่ระบุ', 90, yPos)
          .text((product.quantity || 1).toString(), 300, yPos)
          .text((product.unitPrice || product.price || 0).toLocaleString(), 360, yPos)
          .text(itemTotal.toLocaleString(), 450, yPos);

        yPos += 18;

        // Add IMEI if available
        if (product.imei) {
          doc.fontSize(10).font('THSarabun').text(`IMEI: ${product.imei}`, 90, yPos);
          yPos += 15;
        }
      });

      // === PAYMENT SUMMARY ===
      yPos += 10;
      doc.moveTo(300, yPos).lineTo(500, yPos).stroke();
      yPos += 15;

      doc.fontSize(12).font('THSarabun-Bold')
        .text('ราคารวม:', 350, yPos)
        .text(totalPrice.toLocaleString() + ' บาท', 430, yPos);
      yPos += 20;

      // Add tax if specified
      if (quotationData.taxRate) {
        const taxAmount = totalPrice * (quotationData.taxRate / 100);
        doc.font('THSarabun')
          .text(`ภาษี (${quotationData.taxRate}%):`, 350, yPos)
          .text(taxAmount.toLocaleString() + ' บาท', 430, yPos);
        yPos += 20;
        totalPrice += taxAmount;
      }

      // === INSTALLMENT OPTIONS ===
      if (quotationData.customDownPayment || quotationData.customInstallmentCount) {
        yPos += 15;
        doc.fontSize(14).font('THSarabun-Bold').text('เงื่อนไขการผ่อนชำระ', 50, yPos);
        yPos += 25;

        if (quotationData.customDownPayment) {
          doc.fontSize(12).font('THSarabun')
            .text(`เงินดาวน์: ${quotationData.customDownPayment.toLocaleString()} บาท`, 50, yPos);
          yPos += 20;
        }

        if (quotationData.customInstallmentCount) {
          doc.text(`ผ่อนชำระ: ${quotationData.customInstallmentCount} งวด`, 50, yPos);
          yPos += 20;
        }

        if (quotationData.globalPaymentMethod) {
          doc.text(`วิธีการชำระ: ${quotationData.globalPaymentMethod}`, 50, yPos);
          yPos += 20;
        }
      }

      // === FOOTER ===
      yPos += 30;
      doc.fontSize(11).font('THSarabun')
        .text('หมายเหตุ: ใบเสนอราคานี้มีอายุ 30 วัน นับจากวันที่ออกเอกสาร', 50, yPos)
        .text('ราคาดังกล่าวยังไม่รวมค่าขนส่งและค่าติดตั้ง', 50, yPos + 15);

      doc.end();
      await new Promise((resolve) => stream.on('finish', resolve));

      res.json({
        success: true,
        message: 'สร้างใบเสนอราคาสำเร็จ',
        filename: filename,
        filepath: `/uploads/quotations/${filename}`,
        totalAmount: totalPrice
      });

    } catch (error) {
      console.error('❌ Error generating quotation:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างใบเสนอราคา',
        error: error.message
      });
    }
  }

  /**
   * สร้างตารางผ่อนชำระ
   */
  async generatePaymentSchedule(req, res) {
    try {
      console.log('📅 Generating Payment Schedule...');

      const scheduleData = req.body;
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const filename = `payment_schedule_${Date.now()}.pdf`;
      const filepath = path.join(this.uploadPath, 'schedules', filename);

      await fs.promises.mkdir(path.dirname(filepath), { recursive: true });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // === HEADER ===
      doc.fontSize(18).font('THSarabun-Bold').text('ตารางการผ่อนชำระ', 200, 50);

      let yPos = 100;

      // === CUSTOMER & CONTRACT INFO ===
      doc.fontSize(12).font('THSarabun')
        .text(`สัญญาเลขที่: ${scheduleData.contractNumber || 'ไม่ระบุ'}`, 50, yPos)
        .text(`ลูกค้า: ${scheduleData.customerName || 'ไม่ระบุ'}`, 300, yPos);
      yPos += 20;

      doc.text(`ยอดเงินรวม: ${(scheduleData.totalAmount || 0).toLocaleString()} บาท`, 50, yPos)
        .text(`จำนวนงวด: ${scheduleData.installmentCount || 0} งวด`, 300, yPos);
      yPos += 30;

      // === PAYMENT TABLE ===
      doc.fontSize(11).font('THSarabun-Bold')
        .text('งวดที่', 50, yPos)
        .text('วันที่ครบกำหนด', 120, yPos)
        .text('ยอดเงินต้น', 220, yPos)
        .text('ดอกเบี้ย', 300, yPos)
        .text('ยอดชำระ', 380, yPos)
        .text('คงเหลือ', 450, yPos);

      yPos += 20;
      doc.moveTo(50, yPos).lineTo(520, yPos).stroke();
      yPos += 10;

      // Payment schedule rows
      const schedule = scheduleData.paymentSchedule || [];
      schedule.forEach((payment, index) => {
        doc.fontSize(10).font('THSarabun')
          .text((index + 1).toString(), 50, yPos)
          .text(payment.dueDate || 'ไม่ระบุ', 120, yPos)
          .text((payment.principal || 0).toLocaleString(), 220, yPos)
          .text((payment.interest || 0).toLocaleString(), 300, yPos)
          .text((payment.totalPayment || 0).toLocaleString(), 380, yPos)
          .text((payment.balance || 0).toLocaleString(), 450, yPos);

        yPos += 18;

        // Add new page if needed
        if (yPos > 750) {
          doc.addPage();
          yPos = 50;
        }
      });

      doc.end();
      await new Promise((resolve) => stream.on('finish', resolve));

      res.json({
        success: true,
        message: 'สร้างตารางการผ่อนชำระสำเร็จ',
        filename: filename,
        filepath: `/uploads/schedules/${filename}`
      });

    } catch (error) {
      console.error('❌ Error generating payment schedule:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างตารางการผ่อนชำระ',
        error: error.message
      });
    }
  }

  // === HELPER METHODS ===

  async addContractHeader(doc, contractNumber, contractDate) {
    // Add logo if exists
    const logoPath = path.join(this.logoPath, 'logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 30, { width: 80 });
    }

    doc.fontSize(20).font('THSarabun-Bold').text('สัญญาผ่อนชำระ', 250, 50);
    doc.fontSize(12).font('THSarabun')
      .text(`เลขที่สัญญา: ${contractNumber || 'ไม่ระบุ'}`, 350, 80)
      .text(`วันที่: ${contractDate || new Date().toLocaleDateString('th-TH')}`, 350, 95);
  }

  async addCompanyInfo(doc) {
    let yPos = 130;
    doc.fontSize(14).font('THSarabun-Bold').text('ข้อมูลบริษัท', 50, yPos);
    yPos += 25;

    doc.fontSize(12).font('THSarabun')
      .text('บริษัท ปัตตานี อีเลคโทรนิค จำกัด', 50, yPos)
      .text('123/45 หมู่ 2 ถนนชลประทาน', 50, yPos + 15)
      .text('ตำบลสะบารัง อำเภอเมืองปัตตานี จังหวัดปัตตานี 94000', 50, yPos + 30)
      .text('โทร: 073-123456', 50, yPos + 45);

    return yPos + 70;
  }

  async addCustomerInfo(doc, customerData) {
    let yPos = 250;
    doc.fontSize(14).font('THSarabun-Bold').text('ข้อมูลผู้เช่าซื้อ', 50, yPos);
    yPos += 25;

    // Personal info
    doc.fontSize(12).font('THSarabun')
      .text(`ชื่อ: ${customerData.prefix || ''}${customerData.firstName} ${customerData.lastName}`, 50, yPos)
      .text(`อายุ: ${customerData.age || 'ไม่ระบุ'} ปี`, 350, yPos);
    yPos += 20;

    doc.text(`อาชีพ: ${customerData.occupation || 'ไม่ระบุ'}`, 50, yPos)
      .text(`รายได้: ${(customerData.income || 0).toLocaleString()} บาท`, 350, yPos);
    yPos += 20;

    // Address
    const fullAddress = `${customerData.houseNo || ''} หมู่ ${customerData.moo || ''} ${customerData.soi || ''} ${customerData.road || ''} ${customerData.subDistrict || ''} ${customerData.district || ''} ${customerData.province || ''} ${customerData.zipcode || ''}`.trim();
    doc.text(`ที่อยู่: ${fullAddress}`, 50, yPos);
    yPos += 20;

    doc.text(`โทรศัพท์: ${customerData.phone || 'ไม่ระบุ'}`, 50, yPos)
      .text(`อีเมล: ${customerData.email || 'ไม่ระบุ'}`, 350, yPos);

    return yPos + 40;
  }

  async addProductInfo(doc, productData) {
    let yPos = 400;
    doc.fontSize(14).font('THSarabun-Bold').text('รายการสินค้า', 50, yPos);
    yPos += 25;

    const products = productData.selectedProducts || [];
    products.forEach((product, index) => {
      doc.fontSize(12).font('THSarabun')
        .text(`${index + 1}. ${product.productName || product.name || 'ไม่ระบุ'}`, 50, yPos)
        .text(`ราคา: ${(product.price || 0).toLocaleString()} บาท`, 350, yPos);
      yPos += 18;

      if (product.imei) {
        doc.fontSize(10).text(`   IMEI: ${product.imei}`, 50, yPos);
        yPos += 15;
      }
    });

    return yPos + 20;
  }

  async addPaymentTerms(doc, paymentData) {
    let yPos = 520;
    doc.fontSize(14).font('THSarabun-Bold').text('เงื่อนไขการชำระเงิน', 50, yPos);
    yPos += 25;

    doc.fontSize(12).font('THSarabun')
      .text(`เงินดาวน์: ${(paymentData.downAmount || paymentData.customDownPayment || 0).toLocaleString()} บาท`, 50, yPos)
      .text(`จำนวนงวด: ${paymentData.customInstallmentCount || 0} งวด`, 350, yPos);
    yPos += 20;

    doc.text(`ยอดเงินรวม: ${(paymentData.totalAmount || 0).toLocaleString()} บาท`, 50, yPos)
      .text(`ค่าธรรมเนียม: ${(paymentData.docFee || paymentData.globalDocumentFee || 0).toLocaleString()} บาท`, 350, yPos);

    return yPos + 40;
  }

  async addContractTerms(doc, contractTerms, specialConditions) {
    let yPos = 620;
    doc.fontSize(14).font('THSarabun-Bold').text('ข้อกำหนดและเงื่อนไข', 50, yPos);
    yPos += 25;

    if (contractTerms) {
      doc.fontSize(11).font('THSarabun').text(contractTerms, 50, yPos, { width: 500 });
    } else {
      doc.fontSize(11).font('THSarabun').text('1. ผู้เช่าซื้อต้องชำระเงินตามกำหนดในแต่ละงวด', 50, yPos)
        .text('2. หากผิดนัดชำระเงินเกิน 3 งวด บริษัทมีสิทธิยึดสินค้าคืน', 50, yPos + 15)
        .text('3. สินค้าทุกชิ้นมีการรับประกันตามเงื่อนไขของผู้ผลิต', 50, yPos + 30);
    }

    return yPos + 80;
  }

  async addSignatureSection(doc, signatureData) {
    let yPos = 750;

    // Customer signature
    doc.fontSize(12).font('THSarabun').text('ลายเซ็นผู้เช่าซื้อ', 80, yPos);
    doc.moveTo(50, yPos + 40).lineTo(200, yPos + 40).stroke();
    doc.text('วันที่ ........................', 70, yPos + 50);

    // Salesperson signature
    doc.text('ลายเซ็นพนักงานขาย', 350, yPos);
    doc.moveTo(320, yPos + 40).lineTo(470, yPos + 40).stroke();
    doc.text('วันที่ ........................', 340, yPos + 50);

    if (signatureData.salesPersonInfo) {
      doc.fontSize(10).text(`(${signatureData.salesPersonInfo.name || 'ไม่ระบุ'})`, 350, yPos + 65);
    }
  }
}

module.exports = new InstallmentDocumentController();