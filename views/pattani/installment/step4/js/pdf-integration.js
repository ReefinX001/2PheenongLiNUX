/**
 * PDF Integration for Step 4
 * ระบบสร้างเอกสาร PDF จากข้อมูล step1-4 ที่ครบถ้วน
 * @version 2.0.0
 * @date 2025-01-27
 */

class Step4PDFIntegration {
  constructor() {
    this.dataIntegration = null;
    this.loadingSystem = window.LoadingSystem;
    this.initialized = false;
  }

  /**
   * Initialize PDF integration system
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Step 4 PDF Integration...');

      // Load PDF Data Integration module
      if (typeof PDFDataIntegration !== 'undefined') {
        this.dataIntegration = new PDFDataIntegration();
        console.log('✅ PDF Data Integration loaded');
      } else {
        console.warn('⚠️ PDF Data Integration not available, using fallback');
        this.dataIntegration = new FallbackDataIntegration();
      }

      this.initialized = true;
      console.log('✅ Step 4 PDF Integration initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing PDF integration:', error);
      throw error;
    }
  }

  /**
   * Generate Installment Quotation PDF
   */
  async generateQuotationPDF() {
    try {
      if (!this.initialized) await this.initialize();

      const loader = this.loadingSystem?.show({
        message: 'กำลังสร้างใบเสนอราคา...',
        showProgress: true
      });

      console.log('📄 Generating quotation PDF...');

      // Collect and transform step data
      const stepData = await this.dataIntegration.collectAllStepData();

      this.loadingSystem?.updateProgress(loader, 30);
      this.loadingSystem?.updateMessage(loader, 'กำลังประมวลผลข้อมูล...');

      // Create PDF via API
      const response = await fetch('/api/pdf/installment/quotation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ stepData })
      });

      this.loadingSystem?.updateProgress(loader, 70);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      this.loadingSystem?.updateProgress(loader, 90);
      this.loadingSystem?.updateMessage(loader, 'กำลังดาวน์โหลดไฟล์...');

      const blob = await response.blob();
      const filename = this.getFilename('quotation');

      this.loadingSystem?.updateProgress(loader, 100);
      this.loadingSystem?.hide(loader);

      // Download file
      this.downloadBlob(blob, filename);

      console.log('✅ Quotation PDF generated successfully');
      this.showToast('สร้างใบเสนอราคาสำเร็จ', 'success');

      return { success: true, filename };

    } catch (error) {
      console.error('❌ Error generating quotation PDF:', error);
      this.showToast('เกิดข้อผิดพลาดในการสร้างใบเสนอราคา: ' + error.message, 'error');
      throw error;
    }
  }

  /**
   * Generate Installment Invoice PDF
   */
  async generateInvoicePDF() {
    try {
      if (!this.initialized) await this.initialize();

      const loader = this.loadingSystem?.show({
        message: 'กำลังสร้างใบแจ้งหนี้...',
        showProgress: true
      });

      console.log('📄 Generating invoice PDF...');

      // Collect and transform step data
      const stepData = await this.dataIntegration.collectAllStepData();

      this.loadingSystem?.updateProgress(loader, 30);
      this.loadingSystem?.updateMessage(loader, 'กำลังประมวลผลข้อมูล...');

      // Create PDF via API
      const response = await fetch('/api/pdf/installment/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ stepData })
      });

      this.loadingSystem?.updateProgress(loader, 70);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      this.loadingSystem?.updateProgress(loader, 90);
      this.loadingSystem?.updateMessage(loader, 'กำลังดาวน์โหลดไฟล์...');

      const blob = await response.blob();
      const filename = this.getFilename('invoice');

      this.loadingSystem?.updateProgress(loader, 100);
      this.loadingSystem?.hide(loader);

      // Download file
      this.downloadBlob(blob, filename);

      console.log('✅ Invoice PDF generated successfully');
      this.showToast('สร้างใบแจ้งหนี้สำเร็จ', 'success');

      return { success: true, filename };

    } catch (error) {
      console.error('❌ Error generating invoice PDF:', error);
      this.showToast('เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้: ' + error.message, 'error');
      throw error;
    }
  }

  /**
   * Generate Down Payment Receipt PDF
   */
  async generateDownPaymentReceiptPDF() {
    try {
      if (!this.initialized) await this.initialize();

      const loader = this.loadingSystem?.show({
        message: 'กำลังสร้างใบเสร็จรับเงิน (ค่าดาวน์)...',
        showProgress: true
      });

      console.log('📄 Generating down payment receipt PDF...');

      // Collect and transform step data
      const stepData = await this.dataIntegration.collectAllStepData();

      this.loadingSystem?.updateProgress(loader, 30);
      this.loadingSystem?.updateMessage(loader, 'กำลังประมวลผลข้อมูล...');

      // Create PDF via API
      const response = await fetch('/api/pdf/installment/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          stepData,
          options: { focusOnDownPayment: true }
        })
      });

      this.loadingSystem?.updateProgress(loader, 70);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      this.loadingSystem?.updateProgress(loader, 90);
      this.loadingSystem?.updateMessage(loader, 'กำลังดาวน์โหลดไฟล์...');

      const blob = await response.blob();
      const filename = this.getFilename('receipt_downpayment');

      this.loadingSystem?.updateProgress(loader, 100);
      this.loadingSystem?.hide(loader);

      // Download file
      this.downloadBlob(blob, filename);

      console.log('✅ Down payment receipt PDF generated successfully');
      this.showToast('สร้างใบเสร็จรับเงิน (ค่าดาวน์) สำเร็จ', 'success');

      return { success: true, filename };

    } catch (error) {
      console.error('❌ Error generating down payment receipt PDF:', error);
      this.showToast('เกิดข้อผิดพลาดในการสร้างใบเสร็จรับเงิน: ' + error.message, 'error');
      throw error;
    }
  }

  /**
   * Generate Complete Installment Contract PDF
   */
  async generateContractPDF() {
    try {
      if (!this.initialized) await this.initialize();

      const loader = this.loadingSystem?.show({
        message: 'กำลังสร้างสัญญาผ่อนชำระ...',
        showProgress: true
      });

      console.log('📄 Generating installment contract PDF...');

      // Collect and transform step data
      const stepData = await this.dataIntegration.collectAllStepData();

      this.loadingSystem?.updateProgress(loader, 30);
      this.loadingSystem?.updateMessage(loader, 'กำลังประมวลผลข้อมูล...');

      // Create PDF via API
      const response = await fetch('/api/pdf/installment/contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ stepData })
      });

      this.loadingSystem?.updateProgress(loader, 70);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      this.loadingSystem?.updateProgress(loader, 90);
      this.loadingSystem?.updateMessage(loader, 'กำลังดาวน์โหลดไฟล์...');

      const blob = await response.blob();
      const filename = this.getFilename('contract');

      this.loadingSystem?.updateProgress(loader, 100);
      this.loadingSystem?.hide(loader);

      // Download file
      this.downloadBlob(blob, filename);

      console.log('✅ Contract PDF generated successfully');
      this.showToast('สร้างสัญญาผ่อนชำระสำเร็จ', 'success');

      return { success: true, filename };

    } catch (error) {
      console.error('❌ Error generating contract PDF:', error);
      this.showToast('เกิดข้อผิดพลาดในการสร้างสัญญาผ่อนชำระ: ' + error.message, 'error');
      throw error;
    }
  }

  /**
   * Generate all documents at once
   */
  async generateAllDocuments() {
    try {
      const loader = this.loadingSystem?.show({
        message: 'กำลังสร้างเอกสารทั้งหมด...',
        showProgress: true
      });

      console.log('📄 Generating all installment documents...');

      const results = {};

      // Generate quotation
      this.loadingSystem?.updateMessage(loader, 'กำลังสร้างใบเสนอราคา...');
      this.loadingSystem?.updateProgress(loader, 20);
      results.quotation = await this.generateQuotationPDF();

      // Generate invoice
      this.loadingSystem?.updateMessage(loader, 'กำลังสร้างใบแจ้งหนี้...');
      this.loadingSystem?.updateProgress(loader, 40);
      results.invoice = await this.generateInvoicePDF();

      // Generate receipt
      this.loadingSystem?.updateMessage(loader, 'กำลังสร้างใบเสร็จรับเงิน...');
      this.loadingSystem?.updateProgress(loader, 60);
      results.receipt = await this.generateDownPaymentReceiptPDF();

      // Generate contract
      this.loadingSystem?.updateMessage(loader, 'กำลังสร้างสัญญาผ่อนชำระ...');
      this.loadingSystem?.updateProgress(loader, 80);
      results.contract = await this.generateContractPDF();

      this.loadingSystem?.updateProgress(loader, 100);
      this.loadingSystem?.hide(loader);

      console.log('✅ All documents generated successfully');
      this.showToast('สร้างเอกสารทั้งหมดสำเร็จ', 'success');

      return results;

    } catch (error) {
      console.error('❌ Error generating all documents:', error);
      this.showToast('เกิดข้อผิดพลาดในการสร้างเอกสาร: ' + error.message, 'error');
      throw error;
    }
  }

  /**
   * Print document using printer service
   */
  async printDocument(documentType) {
    try {
      if (!this.initialized) await this.initialize();

      const loader = this.loadingSystem?.show({
        message: `กำลังพิมพ์${this.getDocumentTypeName(documentType)}...`
      });

      console.log(`🖨️ Printing ${documentType}...`);

      // Collect and transform step data
      const stepData = await this.dataIntegration.collectAllStepData();

      // Print via API
      const response = await fetch(`/api/print/installment/${documentType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          stepData,
          branchCode: window.BRANCH_CODE || 'PATTANI'
        })
      });

      if (!response.ok) {
        throw new Error(`Print API Error: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();

      this.loadingSystem?.hide(loader);

      if (result.success) {
        console.log(`✅ ${documentType} printed successfully`);
        this.showToast(`พิมพ์${this.getDocumentTypeName(documentType)}สำเร็จ`, 'success');
      } else {
        throw new Error(result.message || 'Print failed');
      }

      return result;

    } catch (error) {
      console.error(`❌ Error printing ${documentType}:`, error);
      this.showToast(`เกิดข้อผิดพลาดในการพิมพ์: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Send documents via email
   */
  async sendDocumentsEmail() {
    try {
      if (!this.initialized) await this.initialize();

      const loader = this.loadingSystem?.show({
        message: 'กำลังส่งเอกสารทาง Email...',
        showProgress: true
      });

      console.log('📧 Sending documents via email...');

      // Collect step data including email settings
      const stepData = await this.dataIntegration.collectAllStepData();

      this.loadingSystem?.updateProgress(loader, 30);

      // Check if customer has email
      if (!stepData.step2?.customerEmail) {
        throw new Error('ไม่พบอีเมลลูกค้า กรุณากรอกอีเมลในขั้นตอนที่ 2');
      }

      // Send via API
      const response = await fetch('/api/email/installment/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ stepData })
      });

      this.loadingSystem?.updateProgress(loader, 70);

      if (!response.ok) {
        throw new Error(`Email API Error: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();

      this.loadingSystem?.updateProgress(loader, 100);
      this.loadingSystem?.hide(loader);

      if (result.success) {
        console.log('✅ Documents sent via email successfully');
        this.showToast(`ส่งเอกสารทาง Email ไปยัง ${stepData.step2.customerEmail} สำเร็จ`, 'success');
      } else {
        throw new Error(result.message || 'Email sending failed');
      }

      return result;

    } catch (error) {
      console.error('❌ Error sending documents email:', error);
      this.showToast(`เกิดข้อผิดพลาดในการส่งอีเมล: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Get filename for document
   */
  getFilename(type) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
    const branchCode = window.BRANCH_CODE || 'PATTANI';

    const typeNames = {
      'quotation': 'quotation',
      'invoice': 'invoice',
      'receipt_downpayment': 'receipt_down',
      'contract': 'contract'
    };

    const typeName = typeNames[type] || type;
    return `${typeName}_${branchCode}_${timestamp}.pdf`;
  }

  /**
   * Get document type display name
   */
  getDocumentTypeName(type) {
    const names = {
      'quotation': 'ใบเสนอราคา',
      'invoice': 'ใบแจ้งหนี้',
      'receipt': 'ใบเสร็จรับเงิน',
      'contract': 'สัญญาผ่อนชำระ'
    };

    return names[type] || type;
  }

  /**
   * Download blob as file
   */
  downloadBlob(blob, filename) {
    try {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      console.log(`📥 File downloaded: ${filename}`);

    } catch (error) {
      console.error('❌ Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    if (typeof showToast === 'function') {
      showToast(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  /**
   * Debug method to check step data
   */
  async debugStepData() {
    try {
      if (!this.initialized) await this.initialize();

      const stepData = await this.dataIntegration.collectAllStepData();

      console.log('🔍 Debug Step Data:', {
        step1: stepData.step1 ? `${stepData.step1.length} items` : 'Missing',
        step2: stepData.step2 ? 'Found customer data' : 'Missing',
        step3: stepData.step3 ? 'Found payment plan' : 'Missing',
        step4: stepData.step4 ? 'Found contract data' : 'Missing',
        signatures: stepData.customerSignature ? 'Found signatures' : 'Missing',
        rawData: stepData
      });

      return stepData;

    } catch (error) {
      console.error('❌ Error debugging step data:', error);
      return null;
    }
  }
}

/**
 * Fallback data integration for when PDFDataIntegration is not available
 */
class FallbackDataIntegration {
  async collectAllStepData() {
    console.warn('⚠️ Using fallback data integration');

    return {
      step1: JSON.parse(localStorage.getItem('cartItems') || '[]'),
      step2: JSON.parse(localStorage.getItem('customerData') || 'null'),
      step3: JSON.parse(localStorage.getItem('paymentPlan') || 'null'),
      step4: JSON.parse(localStorage.getItem('contractData') || 'null'),
      customerSignature: localStorage.getItem('customerSignature'),
      salespersonSignature: localStorage.getItem('salespersonSignature')
    };
  }
}

// Export for global use
window.Step4PDFIntegration = Step4PDFIntegration;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  if (!window.step4PDFIntegration) {
    window.step4PDFIntegration = new Step4PDFIntegration();
    console.log('🚀 Step 4 PDF Integration ready for use');
  }
});