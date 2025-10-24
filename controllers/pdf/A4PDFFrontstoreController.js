const A4PDFController = require('./A4PDFController');

/**
 * A4PDFFrontstoreController
 * แปลง payload จากหน้าขายสด (frontstore_pattani.html) ให้เป็นรูปแบบ order ที่ A4PDFController รองรับ
 * แล้วสร้างไฟล์ A4 PDF (Receipt/TaxInvoice)
 */
class A4PDFFrontstoreController {
  /**
   * แปลง payload จาก frontstore ให้เป็นรูปแบบ order สำหรับ A4PDFController
   * @param {object} payload - ข้อมูลจาก frontstore
   * @param {('RECEIPT'|'TAX_INVOICE'|'auto')} documentType
   * @returns {object} order
   */
  static mapFrontstoreToOrder(payload = {}, documentType = 'auto') {
    const items = Array.isArray(payload.items) ? payload.items : (payload.cartItems || []);
    const isInstallment = Boolean(
      payload.isInstallment === true ||
      payload.saleMode === 'installment' ||
      (typeof payload.receiptType === 'string' && payload.receiptType.includes('installment')) ||
      (typeof payload.receiptType === 'string' && payload.receiptType.includes('down_payment'))
    );
    const isCashSale = !isInstallment;

    // ตรวจสอบประเภทภาษีจากรายการสินค้า หรือ flag ใน payload
    const hasVat = items.some((i) => {
      const t = i?.taxType || i?.vatType || payload?.taxType;
      return t === 'รวมภาษี' || t === 'แยกภาษี' || t === 'VAT_INCLUDED' || t === 'VAT_EXCLUDED';
    });

    const isTaxInvoice = documentType === 'TAX_INVOICE' || (documentType === 'auto' && hasVat);

    // หน้านี้ต้องไม่แสดงรายการดาวน์ ไม่ว่า payload จะส่งอะไรมาก็ตาม
    const filteredItems = items.filter((i) => {
      const name = (i?.name || i?.productName || i?.description || '').toString();
      const category = (i?.category || '').toString();
      const desc = (i?.description || '').toString();
      const looksLikeDownPayment =
        /ค่าดาวน์|ดาวน์/i.test(name) ||
        /ค่าดาวน์|ดาวน์/i.test(desc) ||
        /down[_-]?payment/i.test(name) ||
        /down[_-]?payment/i.test(desc) ||
        /down[_-]?payment/i.test(category) ||
        i?.isDownPayment === true;
      return !looksLikeDownPayment;
    });

    const order = {
      _id: payload._id || payload.orderId || payload.invoiceId || null,
      order_number: payload.invoiceNo || payload.orderNo || payload.order_number || payload.documentNumber || '',
      invoiceNo: payload.invoiceNo || payload.orderNo || payload.documentNumber || '',
      saleDate: payload.saleDate || payload.issueDate || payload.createdAt || new Date(),
      staffName:
        payload.staffName || payload.staff_name || payload.employee_name || payload.user_name || payload.created_by_name || 'พนักงาน',
      branch: payload.branch || payload.branchInfo || {
        name: payload.branchName || 'สำนักงานใหญ่',
        code: payload.branchCode || payload.branch?.code || payload.branch_code || '00000',
        address: payload.branchAddress || '',
        phone: payload.branchPhone || ''
      },
      company: payload.company || {
        name: payload.companyName || 'บริษัท',
        taxId: payload.companyTaxId || payload.taxId || payload.tax_id || '',
        address: payload.companyAddress || '',
        phone: payload.companyPhone || ''
      },
      customerType: payload.customerType || (payload.corporate ? 'corporate' : 'individual'),
      customer: payload.customer || payload.customerInfo || {},
      corporate: payload.corporate || payload.corporateInfo || {},
      items: filteredItems.map((i) => ({
        name: i.name || i.productName || i.description || '',
        imei: i.imei || i.serial || '',
        qty: Number(i.qty || i.quantity || 1),
        price: Number(i.price || i.unitPrice || 0),
        taxType: i.taxType || i.vatType || payload.taxType || (hasVat ? 'รวมภาษี' : 'ไม่มีภาษี')
      })),
      subTotal:
        Number(
          payload.subTotal ?? payload.sub_total ?? payload.summary?.subTotal ?? payload.summary?.subtotal ?? 0
        ),
      discount: Number(payload.discount ?? payload.summary?.discount ?? 0),
      vatAmount: Number(payload.vatAmount ?? payload.summary?.vatAmount ?? 0),
      total: Number(
        payload.total ?? payload.total_amount ?? payload.net_amount ?? payload.summary?.totalWithTax ?? 0
      ),
      downPayment: Number(
        payload.downPayment ?? payload.summary?.downPayment ?? payload.total ?? payload.total_amount ?? 0
      ),
      documentFee: Number(payload.documentFee ?? payload.summary?.docFee ?? 0),
      documentType: isTaxInvoice ? 'TAX_INVOICE' : 'RECEIPT',
      invoiceType: isTaxInvoice ? 'TAX_INVOICE' : 'RECEIPT_ONLY',
      type: isTaxInvoice ? 'tax_invoice' : 'receipt',
      vatIncluded: hasVat,
      paymentMethod: payload.paymentMethod || payload.payment_method || 'cash',
      notes: payload.notes || payload.remark || ''
    };

    // คำนวณยอดสรุปใหม่สำหรับขายสด เมื่อค่าที่ส่งมายังไม่ครบ/ไม่สอดคล้อง
    try {
      const computedSubTotal = order.items.reduce((sum, it) => sum + (Number(it.qty) * Number(it.price)), 0);
      if (!(order.subTotal > 0)) order.subTotal = Number(computedSubTotal.toFixed(2));
      if (!(order.total > 0)) {
        // ถ้ามี vatAmount ให้บวกเพิ่ม ไม่งั้นใช้ subTotal
        const total = order.subTotal + (order.vatAmount || 0) - (order.discount || 0);
        order.total = Number(total.toFixed(2));
      }
    } catch {}

    // สำหรับขายสด บังคับไม่ให้มีค่าดาวน์/ค่าธรรมเนียมใน PDF
    if (isCashSale) {
      order.downPayment = 0;
      order.documentFee = 0;
    }

    // Ensure minimal required values
    if (!order.order_number) {
      const prefix = isTaxInvoice ? 'TI' : 'RE';
      order.order_number = `${prefix}-${Date.now()}`;
      order.invoiceNo = order.invoiceNo || order.order_number;
    }
    // Normalize date
    const d = new Date(order.saleDate);
    if (isNaN(d.getTime())) {
      order.saleDate = new Date();
    }
    // Ensure customer name exists
    if (!order.customer || (Object.keys(order.customer).length === 0 && order.customer.constructor === Object)) {
      order.customer = { name: 'ลูกค้าทั่วไป' };
    } else if (!order.customer.name && order.customer.fullName) {
      order.customer.name = order.customer.fullName;
    }
    // For tax invoice, ensure company name at least
    if (isTaxInvoice && (!order.company || !order.company.name)) {
      order.company = { ...(order.company || {}), name: 'บริษัท' };
    }

    return order;
  }

  /**
   * สร้าง A4 PDF ใบเสร็จจาก frontstore payload
   */
  static async createReceiptFromFrontstore(payload) {
    const order = this.mapFrontstoreToOrder(payload, 'RECEIPT');
    return A4PDFController.printReceipt(order);
  }

  /**
   * สร้าง A4 PDF ใบกำกับภาษีจาก frontstore payload
   */
  static async createTaxInvoiceFromFrontstore(payload) {
    const order = this.mapFrontstoreToOrder(payload, 'TAX_INVOICE');
    return A4PDFController.printReceipt(order);
  }
}

module.exports = A4PDFFrontstoreController;


