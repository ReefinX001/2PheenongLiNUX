/**
 * Email Service for Installment System
 * ส่งเอกสารผ่อนชำระทาง Email
 * @version 1.0.0
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Only show debug info in development mode
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_EMAIL === 'true') {
        console.log('🔧 Initializing Email Transporter...');
        console.log('📋 Environment Check:', {
          GMAIL_USER: process.env.GMAIL_USER ? 'SET' : 'NOT SET',
          GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? 'SET' : 'NOT SET',
          GMAIL_PASS: process.env.GMAIL_PASS ? 'SET (legacy)' : 'NOT SET'
        });
      }

      // Check Gmail App Password configuration first
      if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
          }
        });
        this.isConfigured = true;
        console.log('✅ Gmail SMTP Email service configured for:', process.env.GMAIL_USER);
        return;
      }

      // Check if general SMTP is configured
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        this.isConfigured = true;
        console.log('✅ SMTP Email service configured');
        return;
      }

      // No email configuration found - this is OK for development
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Email service running in mock mode (development)');
      } else {
        console.log('⚠️ No email configuration found, using mock email service');
        console.log('💡 To enable real email, add to .env:');
        console.log('   GMAIL_USER=your-email@gmail.com');
        console.log('   GMAIL_APP_PASSWORD=your_app_password');
      }
      this.isConfigured = false;
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
      this.isConfigured = false;
    }
  }

  async sendInstallmentDocuments(emailData) {
    try {
      const { to, toName, subject, body, attachmentUrls, from, fromName } = emailData;

      console.log('📧 Email service called:', {
        isConfigured: this.isConfigured,
        hasTransporter: !!this.transporter,
        recipient: to
      });

      // Use real SMTP if configured
      if (this.isConfigured && this.transporter) {
        // Real email sending
        const path = require('path');
        const fs = require('fs');
        const attachments = [];

        // Download and prepare attachments
        if (attachmentUrls && attachmentUrls.length > 0) {
          for (let i = 0; i < attachmentUrls.length; i++) {
          const url = attachmentUrls[i];
          let filePath = url;
          let fileContent = null;

          try {
                         if (url.startsWith('http://') || url.startsWith('https://')) {
               // HTTP URL - fetch the file
               const axios = require('axios');
               const response = await axios.get(url, { responseType: 'arraybuffer' });
               if (response.status === 200) {
                 fileContent = Buffer.from(response.data);
               } else {
                 console.warn(`⚠️ Failed to fetch ${url}: ${response.status}`);
                 continue;
               }
            } else if (url.startsWith('/uploads/')) {
              // Relative path - read from file system
              const projectRoot = path.dirname(__dirname);
              filePath = path.join(projectRoot, url.substring(1));
              if (fs.existsSync(filePath)) {
                fileContent = fs.readFileSync(filePath);
              } else {
                console.warn(`⚠️ File not found: ${filePath}`);
                continue;
              }
            } else {
              // Absolute path - read directly
              if (fs.existsSync(filePath)) {
                fileContent = fs.readFileSync(filePath);
              } else {
                console.warn(`⚠️ File not found: ${filePath}`);
                continue;
              }
            }

            if (fileContent) {
              attachments.push({
                filename: `document_${i + 1}.pdf`,
                content: fileContent,
                contentType: 'application/pdf'
              });
            }
          } catch (error) {
            console.warn(`⚠️ Error processing attachment ${url}:`, error.message);
          }
        }
        } // closing bracket for if (attachmentUrls && attachmentUrls.length > 0)

        const mailOptions = {
          from: `"${fromName}" <${from}>`,
          to: `"${toName}" <${to}>`,
          subject: subject,
          text: body,
          html: `<pre>${body}</pre>`,
          attachments: attachments
        };

        const result = await this.transporter.sendMail(mailOptions);

        return {
          success: true,
          messageId: result.messageId,
          method: 'smtp',
          recipient: to,
          attachmentCount: attachmentUrls.length
        };

      } else {
        // Mock email sending for testing
        console.log('📧 Mock Email Sending:');
        console.log('  To:', `"${toName}" <${to}>`);
        console.log('  Subject:', subject);
        console.log('  Body:', body.substring(0, 100) + '...');
        console.log('  Attachments:', attachmentUrls.length, 'files');

        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
          success: true,
          messageId: `mock-${Date.now()}`,
          method: 'mock',
          recipient: to,
          attachmentCount: attachmentUrls.length,
          note: 'This is a mock email for testing purposes'
        };
      }

    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Send receipt email with attachments
   * @param {Object} options - Email options
   * @param {string} options.email - Recipient email
   * @param {string} options.invoiceNo - Invoice number
   * @param {Object} options.customerInfo - Customer information
   * @param {Array} options.attachments - Attachment URLs
   * @returns {Promise<Object>} Send result
   */
  async sendReceiptEmail(options) {
    try {
      const { email, invoiceNo, customerInfo, attachments = [] } = options;

      console.log('📧 Sending receipt email:', {
        to: email,
        invoiceNo,
        attachmentCount: attachments.length
      });

      const subject = `ใบเสร็จรับเงิน ${invoiceNo} - บริษัท 2 พี่น้อง โมบาย จํากัด`;

      const body = `
        <h2>เรียน คุณ${customerInfo.name}</h2>
        <p>ขอบคุณที่ใช้บริการกับเรา</p>
        <p>เอกสารแนบ:</p>
        <ul>
          <li>ใบเสร็จรับเงิน เลขที่ ${invoiceNo}</li>
          <li>ใบเสนอราคา</li>
          <li>ใบแจ้งหนี้</li>
        </ul>
        <p>หากมีข้อสงสัยประการใด กรุณาติดต่อเรา</p>
        <br>
        <p>ขอแสดงความนับถือ</p>
        <p>บริษัท 2 พี่น้อง โมบาย จํากัด</p>
      `;

      // Use the existing sendInstallmentDocuments method
      return await this.sendInstallmentDocuments({
        to: email,
        toName: customerInfo.name || 'ลูกค้า',
        subject: subject,
        body: body,
        attachmentUrls: attachments,
        from: 'noreply@pattani-installment.com',
        fromName: 'ระบบผ่อน Pattani'
      });

    } catch (error) {
      console.error('❌ sendReceiptEmail failed:', error);
      throw error;
    }
  }

  async sendNotification(to, subject, message) {
    try {
      if (this.isConfigured && this.transporter) {
        const mailOptions = {
          from: process.env.EMAIL_FROM || 'noreply@pattani-installment.com',
          to: to,
          subject: subject,
          text: message,
          html: `<p>${message}</p>`
        };

        const result = await this.transporter.sendMail(mailOptions);
        return { success: true, messageId: result.messageId };

      } else {
        console.log('📧 Mock Notification Email:', { to, subject, message });
        return {
          success: true,
          messageId: `mock-notification-${Date.now()}`,
          method: 'mock'
        };
      }

    } catch (error) {
      console.error('❌ Notification email failed:', error);
      throw new Error(`Notification email failed: ${error.message}`);
    }
  }

  isEmailServiceConfigured() {
    return this.isConfigured;
  }
}

// Export singleton instance
module.exports = new EmailService();