// File: controllers/generateReceiptImage.js
// ✅ ฟังก์ชัน generateReceiptImage ที่หายไป พร้อม email functionality

const generateReceiptImage = async (req, res) => {
  try {
    console.log('🖼️ Generating receipt image with data:', req.body);

    const {
      orderId,
      documentType = 'receipt',
      documentId,
      documentNumber,
      originalData,
      sendEmail = false,
      emailData = null
    } = req.body;

    // รองรับทั้ง legacy (orderId) และใหม่ (Receipt/TaxInvoice data)
    if (!orderId && !originalData) {
      return res.status(400).json({
        success: false,
        error: 'Missing orderId or originalData parameter'
      });
    }

    // ถ้ามี originalData ให้ใช้ API ใหม่
    if (originalData) {
      console.log('📄 Using new Receipt/TaxInvoice data path...');

      // Import PDF controller for POS image generation
      const PDFoooRasterController = require('./pdf/PDFoooRasterController');

      // Convert Receipt/TaxInvoice data to order format for POS image generation
      const orderData = {
        _id: documentId,
        order_number: documentNumber || originalData?.invoice_no || documentId,
        invoiceType: documentType === 'TAX_INVOICE' ? 'TAX_INVOICE' : 'RECEIPT_ONLY',
        documentType: documentType,
        saleDate: (
          originalData?.issueDate ||
          originalData?.performed_at ||
          originalData?.sale_date ||
          new Date()
        ),
        employeeName: (
          originalData?.employeeName ||
          originalData?.staff_name ||
          originalData?.employee_name ||
          originalData?.user_name ||
          originalData?.created_by_name ||
          originalData?.performedBy ||
          'พนักงาน'
        ),
        customer: originalData?.customer || originalData?.customerInfo || originalData?.corporateInfo || {},
        items: originalData?.items || [],
        totalAmount: (
          originalData?.totalAmount ||
          originalData?.summary?.totalWithTax ||
          originalData?.total_amount ||
          originalData?.net_amount ||
          0
        ),
        subTotal: originalData?.subTotal || originalData?.summary?.subTotal || originalData?.sub_total || 0,
        vatAmount: originalData?.vatAmount || originalData?.summary?.vatAmount || originalData?.vat_amount || 0,
        discount: originalData?.discount || 0,
        paymentMethod: originalData?.paymentMethod || originalData?.payment_method || 'cash',
        branch: originalData?.branch || {},
        company: originalData?.company || {}
      };

      // Generate POS image
      // ✅ Fix: Use the correct method name
      const result = await PDFoooRasterController.printReceipt(orderData);

      // ✅ Fix: Use the correct field name from printReceipt result
      if (!result || !result.base64) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate POS image'
        });
      }

      return res.json({
        success: true,
        base64Data: result.base64, // ✅ Fix: Use correct field name
        fileName: result.fileName,
        documentType: documentType,
        documentNumber: documentNumber,
        generatedAt: new Date().toISOString()
      });
    }

    // ใช้ A4PDFController สร้าง PDF และแปลงเป็นรูป
    const A4PDFController = require('./pdf/A4PDFController');

    // สร้าง PDF buffer
    const pdfResult = await A4PDFController.generateA4PDF({
      body: {
        order_id: orderId,
        documentType: documentType,
        outputFormat: 'buffer' // ขอ buffer แทนไฟล์
      }
    });

    if (!pdfResult.success) {
      throw new Error(pdfResult.error || 'Failed to generate PDF');
    }

    // ข้อมูลผลลัพธ์พื้นฐาน
    const responseData = {
      imageUrl: pdfResult.pdfUrl || null,
      pdfBuffer: pdfResult.pdfBuffer ? pdfResult.pdfBuffer.toString('base64') : null,
      documentType: documentType,
      orderId: orderId,
      emailSent: false
    };

    // 📧 ส่งอีเมลถ้าร้องขอ
    if (sendEmail && emailData && emailData.to) {
      console.log('📧 Attempting to send email...');

      try {
        const emailResult = await A4PDFController.sendPDFByEmail(
          emailData,
          pdfResult.pdfBuffer,
          `receipt_${orderId}_${new Date().toISOString().split('T')[0]}.pdf`
        );

        responseData.emailSent = emailResult.success;
        responseData.emailResult = emailResult;

        if (emailResult.success) {
          console.log('✅ Email sent successfully:', emailResult.messageId);
        } else {
          console.error('❌ Email sending failed:', emailResult.error);
        }

      } catch (emailError) {
        console.error('❌ Email error:', emailError);
        responseData.emailError = emailError.message;
      }
    }

    // ส่งกลับผลลัพธ์
    return res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error in generateReceiptImage:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate receipt image'
    });
  }
};

module.exports = generateReceiptImage;
