const PdfPrinter = require('pdfmake');
const path = require('path');
const fs = require('fs');

// กำหนด fonts สำหรับ pdfmake (ใช้ fonts ที่มีอยู่แล้ว)
const fonts = {
  THSarabunNew: {
    normal: path.join(__dirname, '../fonts', 'THSarabunNew.ttf'),
    bold: path.join(__dirname, '../fonts', 'THSarabunNew Bold.ttf'),
    italics: path.join(__dirname, '../fonts', 'THSarabunNew Italic.ttf'),
    bolditalics: path.join(__dirname, '../fonts', 'THSarabunNew BoldItalic.ttf'),
  },
};

class ReceiptPDFService {
  constructor() {
    this.printer = new PdfPrinter(fonts);
  }

  /**
   * สร้าง PDF ใบเสร็จจากข้อมูล order
   * @param {Object} orderData - ข้อมูล order จาก POS
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generateReceiptPDF(orderData) {
    try {
      console.log('📄 Generating PDF receipt for order:', orderData.orderId);

      const {
        orderId,
        invoiceNo,
        customerInfo,
        cartItems,
        totals,
        paymentMethod,
        branchCode,
        staffName,
        createdAt,
        pdfSettings = {}
      } = orderData;

      // สร้าง document definition สำหรับ A4
      const docDefinition = this.createA4ReceiptDefinition({
        orderId,
        invoiceNo,
        customerInfo,
        cartItems,
        totals,
        paymentMethod,
        branchCode,
        staffName,
        createdAt,
        pdfSettings
      });

      // สร้าง PDF
      const pdfDoc = this.printer.createPdfKitDocument(docDefinition);

      // แปลง PDF เป็น Buffer
      const pdfBuffer = await this.pdfToBuffer(pdfDoc);

      console.log('✅ PDF receipt generated successfully, size:', pdfBuffer.length, 'bytes');

      return pdfBuffer;

    } catch (error) {
      console.error('❌ Error generating PDF receipt:', error);
      throw new Error(`Failed to generate PDF receipt: ${error.message}`);
    }
  }

  /**
   * สร้าง document definition สำหรับใบเสร็จ A4
   */
  createA4ReceiptDefinition(data) {
    const {
      invoiceNo,
      customerInfo,
      cartItems,
      totals,
      paymentMethod,
      branchCode,
      staffName,
      createdAt,
      pdfSettings
    } = data;

    // จัดรูปแบบวันที่
    const thaiDate = this.formatThaiDate(createdAt || new Date());

    // ข้อมูลบริษัท
    const companyInfo = this.getCompanyInfo(branchCode);

    // สร้างตารางสินค้า
    const itemsTable = this.createItemsTable(cartItems || []);

    // สร้างส่วนสรุปยอดเงิน
    const summaryTable = this.createSummaryTable(totals || {});

    return {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 60, 40, 60],
      defaultStyle: {
        font: 'THSarabunNew',
        fontSize: 14,
        lineHeight: 1.3,
      },
      content: [
        // Header - ข้อมูลบริษัท
        {
          columns: [
            {
              width: '60%',
              stack: [
                { text: companyInfo.name, style: 'companyName' },
                { text: companyInfo.address, style: 'companyAddress' },
                { text: `เลขประจำตัวผู้เสียภาษี: ${companyInfo.taxId}`, style: 'companyInfo' },
                { text: `โทร: ${companyInfo.phone}`, style: 'companyInfo' },
              ]
            },
            {
              width: '40%',
              stack: [
                { text: 'ใบเสร็จรับเงิน/ใบกำกับภาษี', style: 'receiptTitle', alignment: 'right' },
                { text: `เลขที่: ${invoiceNo}`, style: 'receiptNo', alignment: 'right' },
                { text: `วันที่: ${thaiDate}`, style: 'receiptDate', alignment: 'right' },
                { text: `สาขา: ${branchCode}`, style: 'branchInfo', alignment: 'right' },
              ]
            }
          ]
        },

        // Divider
        { text: '', marginTop: 20, marginBottom: 10 },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }] },
        { text: '', marginBottom: 10 },

        // ข้อมูลลูกค้า
        this.createCustomerSection(customerInfo),

        { text: '', marginTop: 15, marginBottom: 15 },

        // ตารางสินค้า
        itemsTable,

        { text: '', marginTop: 20, marginBottom: 10 },

        // สรุปยอดเงิน
        summaryTable,

        { text: '', marginTop: 30 },

        // ข้อมูลการชำระเงิน
        this.createPaymentSection(paymentMethod, totals.total || 0),

        { text: '', marginTop: 30 },

        // Footer
        this.createFooterSection(staffName, pdfSettings),

        // QR Code (ถ้าต้องการ)
        ...(pdfSettings.includeQRCode ? [this.createQRCodeSection(invoiceNo)] : [])
      ],
      styles: this.getPDFStyles()
    };
  }

  /**
   * สร้างส่วนข้อมูลลูกค้า
   */
  createCustomerSection(customerInfo) {
    if (!customerInfo) {
      return { text: 'ลูกค้าทั่วไป', style: 'customerInfo' };
    }

    const fullName = customerInfo.firstName && customerInfo.lastName
      ? `${customerInfo.prefix || ''}${customerInfo.firstName} ${customerInfo.lastName}`.trim()
      : customerInfo.name || 'ลูกค้าทั่วไป';

    const address = customerInfo.address
      ? `${customerInfo.address.houseNo || ''} หมู่ ${customerInfo.address.moo || ''} ต.${customerInfo.address.subDistrict || ''} อ.${customerInfo.address.district || ''} จ.${customerInfo.address.province || ''} ${customerInfo.address.zipcode || ''}`.trim()
      : '';

    return {
      stack: [
        { text: 'ลูกค้า:', style: 'sectionHeader' },
        { text: fullName, style: 'customerName', marginLeft: 20 },
        ...(customerInfo.phone ? [{ text: `โทร: ${customerInfo.phone}`, style: 'customerInfo', marginLeft: 20 }] : []),
        ...(customerInfo.email ? [{ text: `อีเมล: ${customerInfo.email}`, style: 'customerInfo', marginLeft: 20 }] : []),
        ...(address ? [{ text: `ที่อยู่: ${address}`, style: 'customerInfo', marginLeft: 20 }] : []),
        ...(customerInfo.taxId ? [{ text: `เลขประจำตัวผู้เสียภาษี: ${customerInfo.taxId}`, style: 'customerInfo', marginLeft: 20 }] : [])
      ]
    };
  }

  /**
   * สร้างตารางรายการสินค้า
   */
  createItemsTable(cartItems) {
    const tableBody = [
      // Header
      [
        { text: 'ลำดับ', style: 'tableHeader', alignment: 'center' },
        { text: 'รายการสินค้า', style: 'tableHeader' },
        { text: 'จำนวน', style: 'tableHeader', alignment: 'center' },
        { text: 'ราคาต่อหน่วย', style: 'tableHeader', alignment: 'right' },
        { text: 'รวมเป็นเงิน', style: 'tableHeader', alignment: 'right' }
      ]
    ];

    // รายการสินค้า
    cartItems.forEach((item, index) => {
      const lineTotal = (item.price || 0) * (item.qty || 1);

      tableBody.push([
        { text: (index + 1).toString(), alignment: 'center' },
        {
          stack: [
            { text: item.name || 'สินค้า', style: 'itemName' },
            ...(item.imei ? [{ text: `IMEI: ${item.imei}`, style: 'itemDetail' }] : []),
            ...(item.taxType ? [{ text: `ภาษี: ${item.taxType}`, style: 'itemDetail' }] : [])
          ]
        },
        { text: (item.qty || 1).toString(), alignment: 'center' },
        { text: this.formatCurrency(item.price || 0), alignment: 'right' },
        { text: this.formatCurrency(lineTotal), alignment: 'right' }
      ]);
    });

    return {
      table: {
        headerRows: 1,
        widths: [30, '*', 50, 80, 80],
        body: tableBody
      },
      layout: {
        fillColor: function(rowIndex) {
          return rowIndex === 0 ? '#f0f0f0' : null;
        },
        hLineWidth: function(i, node) {
          return i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5;
        },
        vLineWidth: function() {
          return 0.5;
        }
      }
    };
  }

  /**
   * สร้างตารางสรุปยอดเงิน
   */
  createSummaryTable(totals) {
    const summaryRows = [];

    // ยอดรวมก่อนภาษี
    if (totals.subTotal) {
      summaryRows.push([
        { text: 'ยอดรวมก่อนภาษี', style: 'summaryLabel' },
        { text: this.formatCurrency(totals.subTotal), style: 'summaryValue', alignment: 'right' }
      ]);
    }

    // ส่วนลด
    if (totals.discountAmount && totals.discountAmount > 0) {
      summaryRows.push([
        { text: 'ส่วนลด', style: 'summaryLabel' },
        { text: `- ${this.formatCurrency(totals.discountAmount)}`, style: 'summaryValue', alignment: 'right' }
      ]);
    }

    // ส่วนลดโปรโมชั่น
    if (totals.promotionDiscount && totals.promotionDiscount > 0) {
      summaryRows.push([
        { text: 'ส่วนลดโปรโมชั่น', style: 'summaryLabel' },
        { text: `- ${this.formatCurrency(totals.promotionDiscount)}`, style: 'summaryValue', alignment: 'right' }
      ]);
    }

    // ภาษีมูลค่าเพิ่ม
    if (totals.vatAmount && totals.vatAmount > 0) {
      summaryRows.push([
        { text: 'ภาษีมูลค่าเพิ่ม 7%', style: 'summaryLabel' },
        { text: this.formatCurrency(totals.vatAmount), style: 'summaryValue', alignment: 'right' }
      ]);
    }

    // ยอดรวมสุทธิ
    summaryRows.push([
      { text: 'ยอดรวมสุทธิ', style: 'summaryTotal' },
      { text: this.formatCurrency(totals.total || 0), style: 'summaryTotal', alignment: 'right' }
    ]);

    return {
      table: {
        widths: ['*', 120],
        body: summaryRows
      },
      layout: 'noBorders',
      alignment: 'right',
      width: 250
    };
  }

  /**
   * สร้างส่วนข้อมูลการชำระเงิน
   */
  createPaymentSection(paymentMethod, totalAmount) {
    const paymentMethodText = {
      'cash': 'เงินสด',
      'transfer': 'โอนเงิน',
      'credit_card': 'บัตรเครดิต',
      'mobile_banking': 'Mobile Banking'
    }[paymentMethod] || paymentMethod || 'เงินสด';

    const totalInWords = this.numberToThaiText(totalAmount);

    return {
      stack: [
        { text: 'วิธีการชำระเงิน:', style: 'sectionHeader' },
        { text: paymentMethodText, style: 'paymentMethod', marginLeft: 20 },
        { text: '', marginTop: 10 },
        { text: `จำนวนเงิน: ${totalInWords}`, style: 'totalInWords' }
      ]
    };
  }

  /**
   * สร้างส่วน Footer
   */
  createFooterSection(staffName, pdfSettings) {
    return {
      columns: [
        {
          width: '50%',
          stack: [
            { text: 'ลงชื่อ ผู้รับเงิน', style: 'signatureLabel' },
            { text: '', margin: [0, 30, 0, 0] },
            { text: `( ${staffName || 'พนักงาน'} )`, style: 'signatureName', alignment: 'center' }
          ]
        },
        {
          width: '50%',
          stack: [
            { text: 'ลงชื่อ ผู้ซื้อ', style: 'signatureLabel' },
            { text: '', margin: [0, 30, 0, 0] },
            { text: '( .............................. )', style: 'signatureName', alignment: 'center' }
          ]
        }
      ],
      marginTop: 30
    };
  }

  /**
   * สร้างส่วน QR Code
   */
  createQRCodeSection(invoiceNo) {
    return {
      qr: `Receipt: ${invoiceNo}`,
      fit: 100,
      alignment: 'center',
      marginTop: 20
    };
  }

  /**
   * กำหนด styles สำหรับ PDF
   */
  getPDFStyles() {
    return {
      companyName: {
        fontSize: 18,
        bold: true,
        color: '#1e40af'
      },
      companyAddress: {
        fontSize: 12,
        color: '#6b7280'
      },
      companyInfo: {
        fontSize: 11,
        color: '#6b7280'
      },
      receiptTitle: {
        fontSize: 16,
        bold: true,
        color: '#dc2626'
      },
      receiptNo: {
        fontSize: 14,
        bold: true
      },
      receiptDate: {
        fontSize: 12
      },
      branchInfo: {
        fontSize: 11,
        color: '#6b7280'
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        marginBottom: 5
      },
      customerName: {
        fontSize: 13,
        bold: true
      },
      customerInfo: {
        fontSize: 11,
        color: '#374151'
      },
      tableHeader: {
        fontSize: 12,
        bold: true,
        fillColor: '#f3f4f6'
      },
      itemName: {
        fontSize: 12,
        bold: true
      },
      itemDetail: {
        fontSize: 10,
        color: '#6b7280'
      },
      summaryLabel: {
        fontSize: 12,
        alignment: 'right'
      },
      summaryValue: {
        fontSize: 12
      },
      summaryTotal: {
        fontSize: 14,
        bold: true
      },
      paymentMethod: {
        fontSize: 13,
        bold: true
      },
      totalInWords: {
        fontSize: 12,
        italics: true,
        color: '#374151'
      },
      signatureLabel: {
        fontSize: 11,
        alignment: 'center'
      },
      signatureName: {
        fontSize: 12,
        alignment: 'center'
      }
    };
  }

  /**
   * ข้อมูลบริษัท
   */
  getCompanyInfo(branchCode) {
    // TODO: ดึงข้อมูลจากฐานข้อมูลตาม branchCode
    return {
      name: process.env.COMPANY_NAME || 'ร้าน 2 พี่น้อง โมบาย',
      address: '148/91 ต.รูสะมิแล อ.เมือง จ.ปัตตานี 94000',
      taxId: process.env.COMPANY_TAX_ID || '1234567890123',
      phone: process.env.COMPANY_PHONE || '073-374777'
    };
  }

  /**
   * จัดรูปแบบเงิน
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  /**
   * จัดรูปแบบวันที่แบบไทย
   */
  formatThaiDate(date) {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  /**
   * แปลงจำนวนเงินเป็นตัวหนังสือ
   */
  numberToThaiText(amount) {
    // สำหรับการพัฒนาจริง ควรใช้ library เช่น thai-baht-text
    if (amount === 0) return 'ศูนย์บาทถ้วน';

    const baht = Math.floor(amount);
    const satang = Math.round((amount - baht) * 100);

    let result = `${baht.toLocaleString('th-TH')} บาท`;
    if (satang > 0) {
      result += ` ${satang} สตางค์`;
    } else {
      result += 'ถ้วน';
    }

    return result;
  }

  /**
   * แปลง PDF Document เป็น Buffer
   */
  async pdfToBuffer(pdfDoc) {
    return new Promise((resolve, reject) => {
      const chunks = [];

      pdfDoc.on('data', chunk => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);

      pdfDoc.end();
    });
  }
}

module.exports = new ReceiptPDFService();