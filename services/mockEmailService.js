/**
 * Mock Email Service สำหรับการทดสอบ
 * จำลองการส่งอีเมลโดยไม่ต้องใช้ credentials จริง
 */

class MockEmailService {
  constructor() {
    this.isInitialized = true;
    console.log('🎭 Mock Email Service initialized');
  }

  async initialize() {
    // จำลองการ initialize
    return Promise.resolve();
  }

  async verifyConnection() {
    // จำลองการตรวจสอบการเชื่อมต่อ
    return {
      success: true,
      message: 'Mock Email Service is ready'
    };
  }

  async sendReceiptEmail(options = {}) {
    const {
      orderId,
      invoiceNo,
      email,
      customerName = 'ลูกค้า',
      generatePDF = true,
      cartItems = [],
      totals = {},
      pdfSettings = {}
    } = options;

    console.log('🎭 Mock: Simulating email send...');

    if (!email || !orderId || !invoiceNo) {
      throw new Error('Missing required parameters: email, orderId, invoiceNo');
    }

    // จำลองการสร้าง PDF
    let attachments = [];
    let pdfGenerated = false;
    let totalFileSize = 0;

    if (generatePDF && cartItems.length > 0) {
      try {
        console.log('🎭 Mock: Generating PDF attachment...');

        const pdfFormat = pdfSettings.format || 'A4';

        if (pdfFormat === 'A4') {
          // ใช้ A4PDFController จริง
          console.log('📄 Mock: Using real A4PDFController for PDF generation');
          const A4PDFController = require('../controllers/pdf/A4PDFController');

          const orderData = {
            order_number: invoiceNo,
            invoiceNo: invoiceNo,
            saleDate: new Date(),
            staffName: options.staffName || 'พนักงานทดสอบ',
            staffDate: new Date(),
            invoiceType: options.documents?.taxInvoice && totals.vatAmount > 0 ? 'TAX_INVOICE' : 'RECEIPT',

            branch: {
              name: options.branchCode === 'PATTANI' ? 'ปัตตานี' : options.branchCode || 'สำนักงานใหญ่',
              code: options.branchCode || '00000',
              address: 'ที่อยู่สาขาทดสอบ',
              taxId: '0945566000616',
              tel: '073-374777'
            },

            company: {
              name: process.env.COMPANY_NAME || 'บริษัท 2 พี่น้อง โมบาย จำกัด'
            },

            customerType: options.customerInfo?.companyName ? 'corporate' : 'individual',
            customer: options.customerInfo || {
              prefix: '',
              firstName: customerName.split(' ')[0] || '',
              lastName: customerName.split(' ').slice(1).join(' ') || '',
              phone: options.customerInfo?.phone || '',
              taxId: options.customerInfo?.taxId || ''
            },

            items: cartItems.map(item => ({
              name: item.name || 'สินค้า',
              imei: item.imei || '',
              price: item.price || 0,
              qty: item.qty || 1
            })),

            subTotal: totals.subTotal || 0,
            vatAmount: totals.vatAmount || 0,
            discount: totals.discountAmount || 0,
            total: totals.total || 0
          };

          const pdfResult = await A4PDFController.printReceipt(orderData);

          attachments.push({
            filename: pdfResult.fileName,
            size: `${Math.round(pdfResult.buffer.length / 1024)}KB`,
            type: 'application/pdf'
          });

          totalFileSize = pdfResult.buffer.length;
          pdfGenerated = true;

          console.log(`✅ Mock: Generated real A4 PDF: ${pdfResult.fileName}`);

          // สร้างใบกำกับภาษี (ถ้าต้องการ)
          if (options.documents?.taxInvoice && totals.vatAmount > 0) {
            const taxInvoiceData = {
              ...orderData,
              invoiceType: 'TAX_INVOICE',
              order_number: `TAX_${invoiceNo}`,
              invoiceNo: `TAX_${invoiceNo}`
            };

            const taxResult = await A4PDFController.printReceipt(taxInvoiceData);

            attachments.push({
              filename: taxResult.fileName.replace('receipt_', 'tax_invoice_'),
              size: `${Math.round(taxResult.buffer.length / 1024)}KB`,
              type: 'application/pdf'
            });

            totalFileSize += taxResult.buffer.length;
            console.log(`✅ Mock: Generated real A4 tax invoice PDF`);
          }

        } else {
          // จำลอง Traditional PDF
          console.log('📄 Mock: Simulating traditional PDF generation');
          attachments.push({
            filename: `receipt_${invoiceNo}.pdf`,
            size: '85KB',
            type: 'application/pdf'
          });
          totalFileSize = 87040; // 85KB
          pdfGenerated = true;
        }

      } catch (pdfError) {
        console.error('🎭 Mock: PDF generation failed:', pdfError.message);
        // ไม่ให้ PDF error หยุดการส่งอีเมล
      }
    }

    // จำลองการส่งอีเมล
    await this.simulateEmailSending();

    const mockResult = {
      success: true,
      messageId: this.generateMockMessageId(),
      orderId,
      invoiceNo,
      recipient: email,
      sentAt: new Date().toISOString(),
      attachments,
      pdfGenerated,
      totalFileSize
    };

    console.log(`✅ Mock: Email "sent" successfully to ${email}`);
    console.log(`📎 Mock: Attachments: ${attachments.length} files`);
    console.log(`📊 Mock: Total size: ${Math.round(totalFileSize / 1024)}KB`);

    return mockResult;
  }

  async sendTestEmail(email) {
    console.log('🎭 Mock: Simulating test email send...');

    if (!email) {
      throw new Error('Email is required');
    }

    await this.simulateEmailSending(1000); // เร็วกว่าสำหรับ test email

    return {
      success: true,
      messageId: this.generateMockMessageId(),
      recipient: email
    };
  }

  async sendInstallmentDocuments(data) {
    console.log('🎭 Mock: Simulating installment documents email...');

    const { customer, documents } = data;

    if (!customer?.email) {
      throw new Error('Customer email is required');
    }

    await this.simulateEmailSending();

    return {
      success: true,
      messageId: this.generateMockMessageId(),
      recipient: customer.email,
      documents: documents || []
    };
  }

  // Helper methods
  async simulateEmailSending(delay = 2000) {
    // จำลองความล่าช้าในการส่งอีเมล
    console.log('🎭 Mock: Processing email...');
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  generateMockMessageId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `mock-${timestamp}-${random}@test.local`;
  }

  // เมทอดสำหรับ compatibility กับ EmailService จริง
  generateEmailContent(options) {
    return `
      <div>
        <h2>🎭 Mock Email Content</h2>
        <p>This is a mock email for testing purposes.</p>
        <p>Customer: ${options.customer?.name || 'Test Customer'}</p>
        <p>Documents: ${options.documents?.join(', ') || 'None'}</p>
      </div>
    `;
  }

  generateReceiptTemplate(options) {
    return `
      <div>
        <h1>🎭 Mock Receipt Email</h1>
        <p>Order ID: ${options.orderId}</p>
        <p>Invoice No: ${options.invoiceNo}</p>
        <p>Customer: ${options.customerName}</p>
        <p>This is a mock email template for testing.</p>
      </div>
    `;
  }

  static numberToThaiText(amount) {
    return `${amount.toLocaleString('th-TH')} บาท (Mock)`;
  }

  static formatThaiDate(date) {
    return new Intl.DateTimeFormat('th-TH').format(new Date(date));
  }
}

module.exports = new MockEmailService();