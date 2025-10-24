const emailService = require('../services/emailService');

class EmailController {

  // ส่งอีเมลเอกสารผ่อนชำระ
  async sendInstallmentDocuments(req, res) {
    try {
      // รองรับทั้งรูปแบบเก่าและใหม่
      let emailData, customerEmail, documentsToSend, customMessage;

      // ตรวจสอบว่าเป็นรูปแบบใหม่จาก Frontend หรือไม่
      if (req.body.email && req.body.type === 'installment' && req.body.installmentData) {
        // รูปแบบใหม่จาก Frontend
        console.log('📧 ตรวจพบข้อมูลอีเมลรูปแบบใหม่จาก Frontend');

        emailData = req.body;
        customerEmail = emailData.email;
        customMessage = emailData.customMessage || '';

        // แปลง documents object เป็น array (รองรับ 3 ประเภท)
        documentsToSend = [];
        if (emailData.documents && typeof emailData.documents === 'object') {
          if (emailData.documents.quotation) documentsToSend.push('quotation');
          if (emailData.documents.invoice) documentsToSend.push('invoice');
          if (emailData.documents.receipt) documentsToSend.push('receipt');
        }

      } else {
        // รูปแบบเก่า (Legacy)
        console.log('📧 ใช้รูปแบบอีเมลเดิม (Legacy)');

        const { customer, documents, customMessage: msg, quotationId, invoiceId, contractId, branchCode } = req.body;

        if (!customer || !customer.email) {
          return res.status(400).json({
            success: false,
            message: 'ข้อมูลลูกค้าหรืออีเมลไม่ครบถ้วน'
          });
        }

        customerEmail = customer.email;
        documentsToSend = documents;
        customMessage = msg || '';
        emailData = { customer, quotationId, invoiceId, contractId, branchCode };
      }

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!customerEmail) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบข้อมูลอีเมลลูกค้า'
        });
      }

      if (!documentsToSend || documentsToSend.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาเลือกเอกสารที่จะส่ง'
        });
      }

      // ตรวจสอบรูปแบบอีเมล
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        return res.status(400).json({
          success: false,
          message: 'รูปแบบอีเมลไม่ถูกต้อง'
        });
      }

      // เตรียมข้อมูลสำหรับ emailService
      const serviceData = {
        customer: emailData.customer || {
          name: emailData.customerName || 'ลูกค้า',
          email: customerEmail
        },
        documents: documentsToSend,
        customMessage,
        quotationId: emailData.quotationId || `QT${Date.now()}`,
        invoiceId: emailData.invoiceId || `IV${Date.now()}`,
        contractId: emailData.contractId || `CT${Date.now()}`,
        branchCode: emailData.branchCode || 'PATTANI',
        installmentData: emailData.installmentData || null
      };

      console.log('📧 ส่งข้อมูลไปยัง emailService:', {
        customerEmail,
        documents: documentsToSend,
        quotationId: serviceData.quotationId,
        invoiceId: serviceData.invoiceId,
        contractId: serviceData.contractId
      });

      // ส่งอีเมล
      const result = await emailService.sendInstallmentDocuments(serviceData);

      // บันทึก log การส่งอีเมล
      console.log(`📧 Email sent to ${customerEmail}:`, {
        documents: documentsToSend,
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
        branchCode: serviceData.branchCode,
        userId: req.user?.id || 'unknown'
      });

      res.json({
        success: true,
        message: 'ส่งอีเมลสำเร็จ',
        data: {
          messageId: result.messageId,
          recipient: result.recipient || customerEmail,
          documentsCount: (result.documents && result.documents.length) || documentsToSend.length,
          documents: documentsToSend,
          sentAt: new Date().toISOString(),
          quotationId: serviceData.quotationId,
          invoiceId: serviceData.invoiceId,
          contractId: serviceData.contractId
        }
      });

    } catch (error) {
      console.error('❌ Email Controller Error:', error);

      // จัดการ error แยกตามประเภท
      let statusCode = 500;
      let message = 'เกิดข้อผิดพลาดในการส่งอีเมล';

      if (error.message.includes('not initialized')) {
        statusCode = 503;
        message = 'ระบบอีเมลยังไม่พร้อมใช้งาน';
      } else if (error.message.includes('Invalid email')) {
        statusCode = 400;
        message = 'รูปแบบอีเมลไม่ถูกต้อง';
      } else if (error.message.includes('Authentication')) {
        statusCode = 401;
        message = 'การยืนยันตัวตนอีเมลล้มเหลว';
      }

      res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ทดสอบส่งอีเมล
  async sendTestEmail(req, res) {
    try {
      const { email, type } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาระบุอีเมลที่จะทดสอบ'
        });
      }

      // ตรวจสอบรูปแบบอีเมล
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'รูปแบบอีเมลไม่ถูกต้อง'
        });
      }

      const result = await emailService.sendTestEmail(email);

      console.log(`🧪 Test email sent to ${email}:`, {
        messageId: result.messageId,
        type: type || 'general',
        timestamp: new Date().toISOString(),
        userId: req.user?.id || 'unknown'
      });

      res.json({
        success: true,
        message: 'ส่งอีเมลทดสอบสำเร็จ',
        data: {
          messageId: result.messageId,
          recipient: result.recipient,
          sentAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Test Email Error:', error);

      res.status(500).json({
        success: false,
        message: 'ส่งอีเมลทดสอบไม่สำเร็จ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ตรวจสอบสถานะการเชื่อมต่ออีเมล
  async checkEmailStatus(req, res) {
    try {
      const status = await emailService.verifyConnection();

      res.json({
        success: true,
        message: 'ตรวจสอบสถานะสำเร็จ',
        data: {
          emailServiceReady: status.success,
          details: status.message || status.error,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV
        }
      });

    } catch (error) {
      console.error('❌ Email Status Check Error:', error);

      res.status(500).json({
        success: false,
        message: 'ตรวจสอบสถานะไม่สำเร็จ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ดูตัวอย่างอีเมล (Preview)
  async previewEmail(req, res) {
    try {
      const { customer, documents, customMessage, quotationId, invoiceId, contractId } = req.body;

      if (!customer || !customer.email) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลลูกค้าไม่ครบถ้วน'
        });
      }

      if (!documents || documents.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาเลือกเอกสารที่จะส่ง'
        });
      }

      // สร้างเนื้อหาอีเมลตัวอย่าง
      const emailContent = emailService.generateEmailContent({
        customer,
        documents,
        customMessage,
        quotationId: quotationId || 'QT-PREVIEW-' + Date.now(),
        invoiceId: invoiceId || 'IV-PREVIEW-' + Date.now(),
        contractId: contractId || 'CT-PREVIEW-' + Date.now()
      });

      res.json({
        success: true,
        message: 'สร้างตัวอย่างอีเมลสำเร็จ',
        data: {
          preview: emailContent,
          recipient: customer.email,
          documents: documents,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Email Preview Error:', error);

      res.status(500).json({
        success: false,
        message: 'สร้างตัวอย่างอีเมลไม่สำเร็จ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ดูสถิติการส่งอีเมล (อนาคต)
  async getEmailStats(req, res) {
    try {
      // TODO: Implement email statistics from database
      // สำหรับตอนนี้ให้ข้อมูลตัวอย่าง

      const stats = {
        today: {
          sent: 0,
          failed: 0,
          pending: 0
        },
        thisWeek: {
          sent: 0,
          failed: 0,
          pending: 0
        },
        thisMonth: {
          sent: 0,
          failed: 0,
          pending: 0
        },
        lastUpdated: new Date().toISOString()
      };

      res.json({
        success: true,
        message: 'ดึงสถิติอีเมลสำเร็จ',
        data: stats
      });

    } catch (error) {
      console.error('❌ Email Stats Error:', error);

      res.status(500).json({
        success: false,
        message: 'ดึงสถิติอีเมลไม่สำเร็จ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ตั้งค่าการแจ้งเตือนอีเมล (อนาคต)
  async updateEmailSettings(req, res) {
    try {
      const { autoSend, templates, notifications } = req.body;

      // TODO: Implement email settings update
      // บันทึกการตั้งค่าลงในฐานข้อมูลหรือไฟล์ config

      res.json({
        success: true,
        message: 'อัพเดทการตั้งค่าอีเมลสำเร็จ',
        data: {
          autoSend: autoSend || false,
          templates: templates || {},
          notifications: notifications || {},
          updatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Email Settings Update Error:', error);

      res.status(500).json({
        success: false,
        message: 'อัพเดทการตั้งค่าอีเมลไม่สำเร็จ',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ส่งอีเมลใบเสร็จ POS พร้อม PDF
  async sendReceiptEmail(req, res) {
    try {
      const {
        orderId,
        invoiceNo,
        email,
        customerName,
        type,
        documents,
        // ข้อมูลเพิ่มเติมสำหรับสร้าง PDF
        customerInfo,
        cartItems,
        totals,
        paymentMethod,
        branchCode,
        staffName,
        generatePDF = true,
        pdfSettings = {},
        format,
        pageSize,
        orientation,
        quality,
        attachments: attachmentSettings
      } = req.body;

      console.log('📧 Receipt email request:', {
        orderId,
        invoiceNo,
        email,
        customerName,
        generatePDF,
        hasCartItems: !!(cartItems && cartItems.length),
        hasTotals: !!totals,
        format,
        pageSize
      });

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!email || !orderId || !invoiceNo) {
        return res.status(400).json({
          success: false,
          message: 'ข้อมูลไม่ครบถ้วน (ต้องการ email, orderId, invoiceNo)'
        });
      }

      // ตรวจสอบรูปแบบอีเมล
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'รูปแบบอีเมลไม่ถูกต้อง'
        });
      }

      // ตรวจสอบว่าสำหรับการสร้าง PDF ต้องมีข้อมูลครบ
      if (generatePDF && (!cartItems || cartItems.length === 0)) {
        console.warn('📧 PDF generation requested but no cart items provided');
        // ไม่ให้ error แต่จะส่งแบบไม่มี PDF
      }

      // เตรียมข้อมูลสำหรับ emailService
      const emailData = {
        orderId,
        invoiceNo,
        email,
        customerName: customerName || 'ลูกค้า',
        type: type || 'receipt',
        documents: documents || { receipt: true, taxInvoice: false },

        // ข้อมูลเพิ่มเติมสำหรับ PDF
        customerInfo: customerInfo || (customerName ? { name: customerName } : null),
        cartItems: cartItems || [],
        totals: totals || {},
        paymentMethod: paymentMethod || 'cash',
        branchCode: branchCode || 'MAIN',
        staffName: staffName || 'พนักงาน',
        generatePDF: generatePDF && format === 'pdf',

        // การตั้งค่า PDF จาก frontend
        pdfSettings: {
          includeQRCode: pdfSettings.includeQRCode !== false,
          includeBarcode: pdfSettings.includeBarcode !== false,
          colorPrint: pdfSettings.colorPrint !== false,
          ...pdfSettings,
          // Override จากข้อมูล request
          format: format || 'pdf',
          pageSize: pageSize || 'A4',
          orientation: orientation || 'portrait',
          quality: quality || 'high'
        }
      };

      // ส่งอีเมล
      console.log('📤 Sending email with data size:', JSON.stringify(emailData).length, 'characters');

      const result = await emailService.sendReceiptEmail(emailData);

      // บันทึก log การส่งอีเมล
      console.log(`📧 Receipt email sent to ${email}:`, {
        orderId,
        invoiceNo,
        messageId: result.messageId,
        pdfGenerated: result.pdfGenerated,
        attachmentCount: result.attachments?.length || 0,
        totalFileSize: result.totalFileSize || 0,
        timestamp: new Date().toISOString(),
        userId: req.user?.id || 'unknown'
      });

      res.json({
        success: true,
        message: 'ส่งใบเสร็จทางอีเมลสำเร็จ',
        data: {
          messageId: result.messageId,
          recipient: result.recipient,
          orderId: result.orderId,
          invoiceNo: result.invoiceNo,
          sentAt: result.sentAt,
          // ข้อมูลเกี่ยวกับ PDF
          pdfGenerated: result.pdfGenerated || false,
          attachments: result.attachments || [],
          totalFileSize: result.totalFileSize || 0,
          // การตั้งค่าที่ใช้
          settings: {
            format: emailData.pdfSettings.format,
            pageSize: emailData.pdfSettings.pageSize,
            orientation: emailData.pdfSettings.orientation,
            quality: emailData.pdfSettings.quality
          }
        }
      });

    } catch (error) {
      console.error('❌ Receipt Email Error:', error);

      // จัดการ error ต่างๆ
      let statusCode = 500;
      let message = 'ส่งใบเสร็จทางอีเมลไม่สำเร็จ';

      if (error.message.includes('not initialized')) {
        statusCode = 503;
        message = 'ระบบอีเมลยังไม่พร้อมใช้งาน กรุณาตรวจสอบการตั้งค่า';
      } else if (error.message.includes('Invalid email')) {
        statusCode = 400;
        message = 'รูปแบบอีเมลไม่ถูกต้อง';
      } else if (error.message.includes('Authentication')) {
        statusCode = 401;
        message = 'การยืนยันตัวตนอีเมลล้มเหลว';
      } else if (error.message.includes('PDF')) {
        statusCode = 500;
        message = 'เกิดข้อผิดพลาดในการสร้าง PDF - ส่งอีเมลธรรมดาแทน';
      }

      res.status(statusCode).json({
        success: false,
        message: message,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ทดสอบการเชื่อมต่ออีเมล (สำหรับ frontend ใหม่)
  async testConnection(req, res) {
    try {
      console.log('🧪 Testing email connection...');

      const { testMode, customerEmail, selectedDocuments, branchCode, employeeName } = req.body;

      // ตรวจสอบการเชื่อมต่อระบบอีเมล
      const status = await emailService.verifyConnection();

      if (!status.success) {
        return res.status(503).json({
          success: false,
          message: 'ระบบอีเมลไม่พร้อมใช้งาน',
          error: status.error || status.message,
          details: {
            testMode,
            timestamp: new Date().toISOString()
          }
        });
      }

      // ตรวจสอบข้อมูลที่ส่งมา
      if (customerEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerEmail)) {
          return res.status(400).json({
            success: false,
            message: 'รูปแบบอีเมลไม่ถูกต้อง',
            details: { customerEmail }
          });
        }
      }

      // หากเป็นโหมดทดสอบ ส่งอีเมลทดสอบจริง
      let testResult = null;
      if (testMode && customerEmail) {
        try {
          testResult = await emailService.sendTestEmail(customerEmail);
        } catch (testError) {
          console.warn('⚠️ Test email failed but connection is OK:', testError.message);
          // ไม่ให้ error หากส่งทดสอบไม่ได้ แต่การเชื่อมต่อโอเค
        }
      }

      console.log('✅ Email connection test successful:', {
        customerEmail,
        selectedDocuments: selectedDocuments?.length || 0,
        branchCode,
        employeeName,
        testEmailSent: !!testResult
      });

      res.json({
        success: true,
        message: 'ระบบอีเมลพร้อมใช้งาน',
        data: {
          connectionStatus: 'active',
          serviceReady: true,
          testEmailSent: !!testResult,
          testResult,
          configuration: {
            emailServiceType: status.serviceType || 'Gmail',
            fromEmail: process.env.GMAIL_USER || 'not-configured',
            companyName: process.env.COMPANY_NAME || 'ระบบผ่อนชำระ'
          },
          request: {
            testMode,
            customerEmail,
            documentsSelected: selectedDocuments?.length || 0,
            branchCode,
            employeeName
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Email connection test failed:', error);

      res.status(500).json({
        success: false,
        message: 'ทดสอบการเชื่อมต่ออีเมลล้มเหลว',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        details: {
          timestamp: new Date().toISOString(),
          errorType: error.name || 'UnknownError'
        }
      });
    }
  }

  // ส่งเอกสารผ่าน Gmail (สำหรับ frontend ใหม่)
  async sendDocument(req, res) {
    try {
      console.log('📧 Sending document via Gmail...');

      const {
        step,
        documentType,
        customerEmail,
        customerData,
        productData,
        documentName,
        branchCode,
        employeeName,
        timestamp
      } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!customerEmail) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบข้อมูลอีเมลลูกค้า'
        });
      }

      if (!documentType) {
        return res.status(400).json({
          success: false,
          message: 'ไม่พบประเภทเอกสารที่จะส่ง'
        });
      }

      // ตรวจสอบรูปแบบอีเมล
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        return res.status(400).json({
          success: false,
          message: 'รูปแบบอีเมลไม่ถูกต้อง'
        });
      }

      // เตรียมข้อมูลสำหรับส่งอีเมล
      const emailData = {
        step: step || 3,
        documentType,
        customer: {
          email: customerEmail,
          name: customerData?.fullName || `${customerData?.firstName || ''} ${customerData?.lastName || ''}`.trim() || 'ลูกค้า',
          phone: customerData?.phone || '',
          idCard: customerData?.idCard || '',
          address: customerData?.fullAddress || ''
        },
        products: productData?.products || [],
        totals: productData?.summary || {
          subtotal: productData?.totalAmount || 0,
          tax: (productData?.totalAmount || 0) * 0.07,
          grandTotal: (productData?.totalAmount || 0) * 1.07
        },
        documents: [documentType],
        branchCode: branchCode || 'PATTANI',
        employeeName: employeeName || 'พนักงาน',
        customMessage: `ส่งจาก Step ${step} โดย ${employeeName || 'พนักงาน'}`,
        metadata: {
          step,
          sentAt: timestamp || new Date().toISOString(),
          system: 'Pattani Installment System'
        }
      };

      console.log('📤 Email data prepared:', {
        customerEmail,
        documentType,
        documentName,
        step,
        productCount: emailData.products.length,
        totalAmount: emailData.totals.grandTotal
      });

      // ส่งอีเมลผ่าน emailService
      const result = await emailService.sendInstallmentDocuments(emailData);

      // บันทึก log การส่งอีเมล
      console.log(`📧 Document email sent to ${customerEmail}:`, {
        documentType,
        documentName,
        step,
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
        branchCode,
        employeeName,
        userId: req.user?.id || 'unknown'
      });

      res.json({
        success: true,
        message: `ส่ง${documentName}ไปยัง ${customerEmail} สำเร็จ`,
        data: {
          messageId: result.messageId,
          recipient: result.recipient || customerEmail,
          documentType,
          documentName,
          step,
          sentAt: new Date().toISOString(),
          customer: {
            email: customerEmail,
            name: emailData.customer.name
          },
          documents: {
            sent: [documentType],
            count: 1
          },
          metadata: {
            branchCode,
            employeeName,
            system: 'Pattani Installment System',
            version: '2.0'
          }
        }
      });

    } catch (error) {
      console.error('❌ Document email sending failed:', error);

      // จัดการ error แยกตามประเภท
      let statusCode = 500;
      let message = 'ส่งเอกสารทางอีเมลไม่สำเร็จ';

      if (error.message.includes('not initialized')) {
        statusCode = 503;
        message = 'ระบบอีเมลยังไม่พร้อมใช้งาน';
      } else if (error.message.includes('Invalid email')) {
        statusCode = 400;
        message = 'รูปแบบอีเมลไม่ถูกต้อง';
      } else if (error.message.includes('Authentication')) {
        statusCode = 401;
        message = 'การยืนยันตัวตนอีเมลล้มเหลว';
      } else if (error.message.includes('Quota')) {
        statusCode = 429;
        message = 'เกินขีดจำกัดการส่งอีเมล กรุณาลองใหม่ภายหลัง';
      }

      res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        details: {
          documentType: req.body.documentType,
          customerEmail: req.body.customerEmail,
          step: req.body.step,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

module.exports = new EmailController();