// ========================================
// INSTALLMENT PDF INTEGRATION - Pattani Branch
// ระบบบูรณาการ PDF และเอกสาร สาขาปัตตานี
// Uses correct backend controllers: A4PDFController, QuotationPdfController, InvoicePdfController
// ========================================

console.log('📄 Loading Installment PDF Integration Module...');

// =========================================
// PDF CONTROLLER CONFIGURATION
// =========================================

const PDF_CONTROLLERS = {
  A4PDF: '/api/pdf/a4',
  QUOTATION: '/api/pdf/quotation',
  INVOICE: '/api/pdf/invoice',
  RECEIPT_VOUCHER: '/api/receipt-vouchers',
  DOCUMENT_DOWNLOAD: '/api/documents/download'
};

// PDF generation endpoints with correct controller usage - FIXED
const PDF_ENDPOINTS = {
  // Receipt Voucher endpoints (A4PDFController through receiptVoucherRoutes - ที่มีจริง)
  receiptByVoucherId: (voucherId) => `/api/receipt-vouchers/${voucherId}/pdf-a4`,
  receiptByContractNo: (contractNo) => `/api/receipt-vouchers/contract/${contractNo}/pdf`,
  receiptByDocumentNo: (docNo) => `/api/receipt-vouchers/document/${docNo}/pdf-a4`,

  // Quotation PDF endpoints (ใช้ระบบที่มีจริง)
  quotationById: (quotationId) => `/api/quotations/${quotationId}/pdf`,
  quotationByReceiptId: (receiptId) => `/api/receipt/${receiptId}/pdf`,

  // Invoice PDF endpoints (ใช้ระบบที่มีจริง)
  invoiceById: (invoiceId) => `/api/receipt/${invoiceId}/pdf`,
  invoiceByReceiptId: (receiptId) => `/api/receipt/${receiptId}/pdf`,

  // Fallback endpoint สำหรับทุกประเภท
  receiptGeneral: (id) => `/api/receipt/${id}/pdf`
};

// =========================================
// ENHANCED PDF DOWNLOAD FUNCTIONS
// =========================================

/**
 * Download Quotation PDF using QuotationPdfController
 * @param {Object} options - Download options
 * @returns {Promise<void>}
 */
async function downloadQuotationPdfEnhanced(options = {}) {
  try {
    console.log('📄 Starting enhanced quotation PDF download...');

    // Get data from multiple sources with fallbacks
    const dataSource = options.dataSource || getInstallmentDataSource();
    const quotationId = extractQuotationId(dataSource);
    const contractNo = extractContractNo(dataSource);

    if (!quotationId && !contractNo) {
      throw new Error('ไม่พบหมายเลขใบเสนอราคาหรือเลขสัญญา');
    }

    console.log('📄 Quotation PDF data:', { quotationId, contractNo });

    // Try different endpoints in order of preference - ใช้ endpoints ที่มีจริง
    const endpoints = [
      quotationId ? PDF_ENDPOINTS.quotationById(quotationId) : null,
      contractNo ? PDF_ENDPOINTS.quotationByReceiptId(contractNo) : null,
      contractNo ? PDF_ENDPOINTS.receiptGeneral(contractNo) : null
    ].filter(Boolean);

    const pdfData = await downloadPdfWithFallback(endpoints, 'quotation');

    // Download the PDF
    downloadPdfBlob(pdfData.blob, `quotation-${quotationId || contractNo}.pdf`);

    console.log('✅ Quotation PDF download completed successfully');
    showToastNotification('ดาวน์โหลดใบเสนอราคาสำเร็จ', 'success');

  } catch (error) {
    console.error('❌ Enhanced quotation PDF download failed:', error);
    showToastNotification(`เกิดข้อผิดพลาดในการดาวน์โหลดใบเสนอราคา: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Download Invoice PDF using InvoicePdfController
 * @param {Object} options - Download options
 * @returns {Promise<void>}
 */
async function downloadInvoicePdfEnhanced(options = {}) {
  try {
    console.log('📄 Starting enhanced invoice PDF download...');

    // Get data from multiple sources with fallbacks
    const dataSource = options.dataSource || getInstallmentDataSource();
    const invoiceId = extractInvoiceId(dataSource);
    const contractNo = extractContractNo(dataSource);

    if (!invoiceId && !contractNo) {
      throw new Error('ไม่พบหมายเลขใบแจ้งหนี้หรือเลขสัญญา');
    }

    console.log('📄 Invoice PDF data:', { invoiceId, contractNo });

    // Try different endpoints in order of preference - ใช้ endpoints ที่มีจริง
    const endpoints = [
      invoiceId ? PDF_ENDPOINTS.invoiceById(invoiceId) : null,
      contractNo ? PDF_ENDPOINTS.invoiceByReceiptId(contractNo) : null,
      contractNo ? PDF_ENDPOINTS.receiptGeneral(contractNo) : null
    ].filter(Boolean);

    const pdfData = await downloadPdfWithFallback(endpoints, 'invoice');

    // Download the PDF
    downloadPdfBlob(pdfData.blob, `invoice-${invoiceId || contractNo}.pdf`);

    console.log('✅ Invoice PDF download completed successfully');
    showToastNotification('ดาวน์โหลดใบแจ้งหนี้สำเร็จ', 'success');

  } catch (error) {
    console.error('❌ Enhanced invoice PDF download failed:', error);
    showToastNotification(`เกิดข้อผิดพลาดในการดาวน์โหลดใบแจ้งหนี้: ${error.message}`, 'error');
    throw error;
  }
}



/**
 * Download Receipt/Tax Invoice PDF using A4PDFController
 * @param {Object} options - Download options
 * @returns {Promise<void>}
 */
async function downloadReceiptPdfEnhanced(options = {}) {
  try {
    console.log('📄 Starting enhanced receipt PDF download...');

    // Get data from multiple sources with fallbacks
    const dataSource = options.dataSource || getInstallmentDataSource();
    const receiptVoucherId = extractReceiptVoucherId(dataSource);
    const contractNo = extractContractNo(dataSource);
    const documentNo = extractDocumentNo(dataSource);

    if (!receiptVoucherId && !contractNo && !documentNo) {
      throw new Error('ไม่พบหมายเลขใบเสร็จ, เลขสัญญา หรือเลขที่เอกสาร');
    }

    console.log('📄 Receipt PDF data:', { receiptVoucherId, contractNo, documentNo });

    // Try different endpoints in order of preference - ใช้ endpoints ที่มีจริง
    const endpoints = [
      receiptVoucherId ? PDF_ENDPOINTS.receiptByVoucherId(receiptVoucherId) : null,
      contractNo ? PDF_ENDPOINTS.receiptByContractNo(contractNo) : null,
      documentNo ? PDF_ENDPOINTS.receiptByDocumentNo(documentNo) : null,
      contractNo ? PDF_ENDPOINTS.receiptGeneral(contractNo) : null,
      documentNo ? PDF_ENDPOINTS.receiptGeneral(documentNo) : null
    ].filter(Boolean);

    const pdfData = await downloadPdfWithFallback(endpoints, 'receipt');

    // Download the PDF
    downloadPdfBlob(pdfData.blob, `receipt-${receiptVoucherId || contractNo || documentNo}.pdf`);

    console.log('✅ Receipt PDF download completed successfully');
    showToastNotification('ดาวน์โหลดใบเสร็จสำเร็จ', 'success');

  } catch (error) {
    console.error('❌ Enhanced receipt PDF download failed:', error);
    showToastNotification(`เกิดข้อผิดพลาดในการดาวน์โหลดใบเสร็จ: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Download all PDF documents at once
 * @param {Object} options - Download options
 * @returns {Promise<void>}
 */
async function downloadAllPdfs(options = {}) {
  try {
    console.log('📄 Starting download of all PDF documents...');

    const results = [];
    const downloads = [
      { name: 'quotation', func: downloadQuotationPdfEnhanced, label: 'ใบเสนอราคา' },
      { name: 'invoice', func: downloadInvoicePdfEnhanced, label: 'ใบแจ้งหนี้' },
      { name: 'receipt', func: downloadReceiptPdfEnhanced, label: 'ใบเสร็จ' }
    ];

    for (const download of downloads) {
      try {
        console.log(`📄 Downloading ${download.label}...`);
        await download.func(options);
        results.push({ name: download.name, status: 'success', label: download.label });

        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Failed to download ${download.label}:`, error);
        results.push({
          name: download.name,
          status: 'error',
          label: download.label,
          error: error.message
        });
      }
    }

    // Show summary
    const successCount = results.filter(r => r.status === 'success').length;
    const totalCount = results.length;

    if (successCount === totalCount) {
      showToastNotification(`ดาวน์โหลดเอกสารทั้งหมดสำเร็จ (${successCount}/${totalCount})`, 'success');
    } else {
      showToastNotification(`ดาวน์โหลดสำเร็จ ${successCount}/${totalCount} เอกสาร`, 'warning');
    }

    console.log('📊 Download results:', results);
    return results;

  } catch (error) {
    console.error('❌ Download all PDFs failed:', error);
    showToastNotification(`เกิดข้อผิดพลาดในการดาวน์โหลดเอกสาร: ${error.message}`, 'error');
    throw error;
  }
}

// =========================================
// GMAIL EMAIL INTEGRATION
// =========================================

/**
 * Send installment documents via Gmail with correct PDF attachments
 * @param {Object} emailOptions - Email configuration
 * @returns {Promise<Object>} Send result
 */
async function sendInstallmentEmailEnhanced(emailOptions = {}) {
  try {
    console.log('📧 Starting enhanced installment email sending...');

    // Get recipient email
    const recipientEmail = emailOptions.email ||
                          document.getElementById('customerEmail')?.value?.trim() ||
                          await promptForEmail();

    if (!recipientEmail) {
      throw new Error('กรุณาระบุอีเมลผู้รับ');
    }

    // Get selected documents
    const selectedDocs = getSelectedEmailDocuments();
    if (selectedDocs.length === 0) {
      throw new Error('กรุณาเลือกเอกสารที่ต้องการส่ง');
    }

    console.log('📧 Email config:', {
      recipient: recipientEmail,
      documents: selectedDocs
    });

    // Get installment data
    const dataSource = getInstallmentDataSource();
    const customerData = getCustomerDataFromForm();

    // Prepare email data with correct controller endpoints
    const emailData = {
      recipient: recipientEmail,
      customerInfo: {
        name: `${customerData.customerPrefix || ''} ${customerData.customerFirstName || ''} ${customerData.customerLastName || ''}`.trim(),
        email: recipientEmail
      },
      documents: selectedDocs,
      installmentData: {
        contractNo: extractContractNo(dataSource),
        quotationId: extractQuotationId(dataSource),
        invoiceId: extractInvoiceId(dataSource),
        receiptVoucherId: extractReceiptVoucherId(dataSource),
        orderId: extractOrderId(dataSource)
      },
      pdfEndpoints: {
        quotation: PDF_ENDPOINTS.quotationById(extractQuotationId(dataSource)),
        invoice: PDF_ENDPOINTS.invoiceById(extractInvoiceId(dataSource)),
        receipt: PDF_ENDPOINTS.receiptByVoucherId(extractReceiptVoucherId(dataSource))
      },
      branchCode: getBranchCode(),
      customMessage: emailOptions.customMessage ||
                     document.getElementById('emailCustomMessage')?.value?.trim() || ''
    };

    console.log('📧 Sending email with data:', emailData);

    // Show loading status
    updateEmailStatus('sending', 'กำลังส่งเอกสารทาง Gmail...');

    // Send email via enhanced email service
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/enhanced-email/send-installment-enhanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}: การส่งอีเมลล้มเหลว`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ Enhanced email sent successfully:', result);
      updateEmailStatus('success', '✅ ส่งเอกสารทาง Gmail สำเร็จ!');
      showToastNotification('ส่งเอกสารผ่อนชำระทางอีเมลสำเร็จ!', 'success');

      // Update UI status
      updateEmailStatusIndicators('success');

      return result;
    } else {
      throw new Error(result.message || 'ส่งอีเมลไม่สำเร็จ');
    }

  } catch (error) {
    console.error('❌ Enhanced email sending failed:', error);
    updateEmailStatus('error', `❌ ส่งเอกสารทาง Gmail ไม่สำเร็จ: ${error.message}`);
    showToastNotification(`ส่งอีเมลไม่สำเร็จ: ${error.message}`, 'error');

    // Update UI status
    updateEmailStatusIndicators('error');

    throw error;
  }
}

// =========================================
// STEP 4 AUTOMATION WITH CORRECT CONTROLLERS
// =========================================

/**
 * Process Step 4 automation with enhanced PDF and email integration
 * @returns {Promise<Object>} Automation result
 */
async function processStep4AutomationEnhanced() {
  try {
    console.log('🚀 Starting enhanced Step 4 automation...');

    const results = {
      downPaymentReceipt: null,
      emailResult: null,
      pdfResult: null,
      success: false,
      errors: []
    };

    // 1. Create Down Payment Receipt (using A4PDFController)
    try {
      console.log('📄 Step 1: Creating down payment receipt...');
      results.downPaymentReceipt = await createDownPaymentReceiptEnhanced();
      console.log('✅ Down payment receipt created successfully');
    } catch (error) {
      console.warn('⚠️ Down payment receipt creation failed:', error.message);
      results.errors.push(`Receipt: ${error.message}`);
    }

    // 2. Setup PDF Download Buttons (with correct controller endpoints)
    try {
      console.log('📄 Step 2: Setting up PDF download automation...');
      results.pdfResult = await setupPdfDownloadButtonsEnhanced();
      console.log('✅ PDF download automation completed successfully');
    } catch (error) {
      console.warn('⚠️ PDF download automation failed:', error.message);
      results.errors.push(`PDF: ${error.message}`);
    }

    // 3. Process Email Automation (with enhanced attachments)
    try {
      console.log('📧 Step 3: Processing email automation...');
      results.emailResult = await processEmailAutomationEnhanced();
      console.log('✅ Email automation completed successfully');
    } catch (error) {
      console.warn('⚠️ Email automation failed:', error.message);
      results.errors.push(`Email: ${error.message}`);
    }

    // 4. Update final status
    if (results.errors.length === 0) {
      results.success = true;
      updateStep4Status('success', null, results.downPaymentReceipt);
      showToastNotification('Step 4 automation completed successfully', 'success');
    } else {
      updateStep4Status('partial-success', results.errors.join(', '), results.downPaymentReceipt);
      showToastNotification(`Step 4 completed with some issues: ${results.errors.length} errors`, 'warning');
    }

    console.log('📊 Step 4 automation results:', results);
    return results;

  } catch (error) {
    console.error('❌ Enhanced Step 4 automation failed:', error);
    updateStep4Status('error', error.message);
    showToastNotification(`Step 4 automation failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Create down payment receipt using A4PDFController
 * @returns {Promise<Object>} Receipt creation result
 */
async function createDownPaymentReceiptEnhanced() {
  try {
    console.log('📄 Creating enhanced down payment receipt...');

    // Get current installment data
    const dataSource = getInstallmentDataSource();
    const customerData = getCustomerDataFromForm();

    // Prepare receipt data for A4PDFController
    const receiptData = {
      type: 'down_payment',
      contractNo: extractContractNo(dataSource),
      customerId: extractCustomerId(dataSource),
      branchId: extractBranchId(dataSource),
      amount: extractDownPaymentAmount(dataSource),
      customerInfo: {
        name: `${customerData.customerPrefix || ''} ${customerData.customerFirstName || ''} ${customerData.customerLastName || ''}`.trim(),
        idCard: customerData.customerIdCard || customerData.citizenId,
        phone: customerData.customerPhone,
        email: customerData.customerEmail
      },
      items: extractCartItems(dataSource),
      paymentMethod: 'cash', // Default to cash for down payment
      details: [
        {
          description: 'เงินดาวน์การผ่อนชำระ',
          amount: extractDownPaymentAmount(dataSource),
          quantity: 1
        }
      ]
    };

    console.log('📄 Receipt data for A4PDFController:', receiptData);

    // Call A4PDFController to create receipt
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/receipt-vouchers/create-down-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(receiptData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}: สร้างใบเสร็จไม่สำเร็จ`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ Enhanced down payment receipt created:', result);

      // Update installment data with receipt info
      updateInstallmentDataWithReceipt(result.data);

      return result.data;
    } else {
      throw new Error(result.message || 'สร้างใบเสร็จไม่สำเร็จ');
    }

  } catch (error) {
    console.error('❌ Enhanced down payment receipt creation failed:', error);
    throw error;
  }
}

/**
 * Setup PDF download buttons with correct controller endpoints
 * @returns {Promise<Object>} Setup result
 */
async function setupPdfDownloadButtonsEnhanced() {
  try {
    console.log('📄 Setting up enhanced PDF download buttons...');

    const pdfContainer = document.getElementById('pdfDownloadButtons');
    if (!pdfContainer) {
      throw new Error('PDF download container not found');
    }

    // Get current data for button configuration
    const dataSource = getInstallmentDataSource();
    const hasQuotation = !!extractQuotationId(dataSource);
    const hasInvoice = !!extractInvoiceId(dataSource);
    const hasReceipt = !!extractReceiptVoucherId(dataSource);

    console.log('📄 PDF availability:', { hasQuotation, hasInvoice, hasReceipt });

    // Create enhanced PDF buttons with correct controller calls
    pdfContainer.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button id="btnDownloadQuotationEnhanced" 
                class="btn btn-primary flex items-center justify-center gap-2 ${!hasQuotation ? 'opacity-50' : ''}" 
                onclick="window.InstallmentPDF.downloadQuotationPdfEnhanced()"
                ${!hasQuotation ? 'disabled title="ไม่พบข้อมูลใบเสนอราคา"' : ''}>
          <i class="bi bi-file-earmark-text"></i>
          <span>ใบเสนอราคา</span>
          <small class="block text-xs opacity-75">(QuotationPdfController)</small>
        </button>
        
        <button id="btnDownloadInvoiceEnhanced" 
                class="btn btn-secondary flex items-center justify-center gap-2 ${!hasInvoice ? 'opacity-50' : ''}" 
                onclick="window.InstallmentPDF.downloadInvoicePdfEnhanced()"
                ${!hasInvoice ? 'disabled title="ไม่พบข้อมูลใบแจ้งหนี้"' : ''}>
          <i class="bi bi-receipt"></i>
          <span>ใบแจ้งหนี้</span>
          <small class="block text-xs opacity-75">(InvoicePdfController)</small>
        </button>
        
        <button id="btnDownloadReceiptEnhanced" 
                class="btn btn-success flex items-center justify-center gap-2 ${!hasReceipt ? 'opacity-50' : ''}" 
                onclick="window.InstallmentPDF.downloadReceiptPdfEnhanced()"
                ${!hasReceipt ? 'disabled title="ไม่พบข้อมูลใบเสร็จ"' : ''}>
          <i class="bi bi-file-earmark-check"></i>
          <span>ใบเสร็จ/ใบกำกับ</span>
          <small class="block text-xs opacity-75">(A4PDFController)</small>
        </button>
      </div>
      
      <div class="mt-3 text-center">
        <button id="btnDownloadAllPdfs" 
                class="btn btn-outline btn-sm"
                onclick="window.InstallmentPDF.downloadAllPdfs()">
          <i class="bi bi-download"></i>
          ดาวน์โหลดทั้งหมด
        </button>
      </div>
    `;

    // Update PDF status
    updatePdfStatusIndicators('ready');

    console.log('✅ Enhanced PDF download buttons setup completed');
    return { success: true, hasQuotation, hasInvoice, hasReceipt };

  } catch (error) {
    console.error('❌ Enhanced PDF setup failed:', error);
    throw error;
  }
}

/**
 * Process email automation with enhanced attachments
 * @returns {Promise<Object>} Email automation result
 */
async function processEmailAutomationEnhanced() {
  try {
    console.log('📧 Processing enhanced email automation...');

    // Check if email automation is needed
    const customerEmail = document.getElementById('customerEmail')?.value?.trim();
    const hasSelectedDocs = getSelectedEmailDocuments().length > 0;

    if (!customerEmail || !hasSelectedDocs) {
      console.log('📧 Email automation skipped - no email or no documents selected');
      return { success: true, skipped: true, reason: 'No email or documents selected' };
    }

    // Send enhanced email
    const emailResult = await sendInstallmentEmailEnhanced({
      email: customerEmail
    });

    console.log('✅ Enhanced email automation completed');
    return emailResult;

  } catch (error) {
    console.error('❌ Enhanced email automation failed:', error);
    throw error;
  }
}

// =========================================
// UTILITY FUNCTIONS
// =========================================

/**
 * Get installment data from multiple sources
 * @returns {Object} Installment data
 */
function getInstallmentDataSource() {
  // Get data from multiple sources with proper fallback - ENHANCED
  const lastResponse = window.lastSuccessResponse?.data ||
                      window.lastSuccessResponse?.parsedResponse?.data ||
                      window.lastSuccessResponse || {};
  const currentData = window.currentInstallmentData || {};
  const installmentData = window.installmentData || {};

  console.log('🔍 Data Source Debug:', {
    lastResponse,
    currentData,
    installmentData
  });

  // Merge all data sources with better extraction
  return {
    ...installmentData,
    ...currentData,
    ...lastResponse,

    // Enhanced contract number extraction
    contractNo: lastResponse?.contractNo ||
                lastResponse?.contract_no ||
                lastResponse?.data?.contractNo ||
                lastResponse?.data?.contract_no ||
                currentData?.contractNo ||
                currentData?.contract_no ||
                installmentData?.contractNo ||
                null,

    // Enhanced invoice ID extraction
    invoiceId: lastResponse?.invoiceId ||
               lastResponse?.invoice_id ||
               lastResponse?.data?.invoiceId ||
               lastResponse?.data?.invoice_id ||
               currentData?.invoiceId ||
               null,

    // Enhanced receipt voucher ID extraction
    receiptVoucherId: lastResponse?.receiptVoucherId ||
                      lastResponse?.receipt_voucher_id ||
                      lastResponse?.data?.receiptVoucherId ||
                      lastResponse?.data?.receipt_voucher_id ||
                      currentData?.receiptVoucherId ||
                      null,

    // Enhanced quotation ID extraction
    quotationId: lastResponse?.quotationId ||
                 lastResponse?.quotation_id ||
                 lastResponse?.data?.quotationId ||
                 lastResponse?.data?.quotation_id ||
                 currentData?.quotationId ||
                 null,

    // Enhanced document number extraction
    documentNo: lastResponse?.documentNo ||
                lastResponse?.document_no ||
                lastResponse?.documentNumber ||
                lastResponse?.data?.documentNo ||
                lastResponse?.data?.documentNumber ||
                currentData?.documentNo ||
                null
  };
}

/**
 * Extract quotation ID from data source
 * @param {Object} dataSource - Data source object
 * @returns {string|null} Quotation ID
 */
function extractQuotationId(dataSource) {
  return dataSource.quotationId ||
         dataSource.quotation_id ||
         dataSource.id ||
         null;
}

/**
 * Extract invoice ID from data source
 * @param {Object} dataSource - Data source object
 * @returns {string|null} Invoice ID
 */
function extractInvoiceId(dataSource) {
  return dataSource.invoiceId ||
         dataSource.invoice_id ||
         dataSource.id ||
         null;
}

/**
 * Extract receipt voucher ID from data source
 * @param {Object} dataSource - Data source object
 * @returns {string|null} Receipt voucher ID
 */
function extractReceiptVoucherId(dataSource) {
  return dataSource.receiptVoucherId ||
         dataSource.receipt_voucher_id ||
         dataSource.voucherId ||
         null;
}

/**
 * Extract contract number from data source
 * @param {Object} dataSource - Data source object
 * @returns {string|null} Contract number
 */
function extractContractNo(dataSource) {
  return dataSource.contractNo ||
         dataSource.contract_no ||
         dataSource.contractNumber ||
         window.lastSuccessResponse?.data?.contractNo ||
         window.lastSuccessResponse?.data?.contract_no ||
         window.lastSuccessResponse?.parsedResponse?.data?.contractNo ||
         window.lastSuccessResponse?.parsedResponse?.data?.contract_no ||
         null;
}

/**
 * Extract order ID from data source
 * @param {Object} dataSource - Data source object
 * @returns {string|null} Order ID
 */
function extractOrderId(dataSource) {
  return dataSource.orderId ||
         dataSource.order_id ||
         dataSource._id ||
         dataSource.id ||
         null;
}

/**
 * Extract document number from data source
 * @param {Object} dataSource - Data source object
 * @returns {string|null} Document number
 */
function extractDocumentNo(dataSource) {
  return dataSource.documentNo ||
         dataSource.document_no ||
         dataSource.documentNumber ||
         null;
}

/**
 * Extract customer ID from data source
 * @param {Object} dataSource - Data source object
 * @returns {string|null} Customer ID
 */
function extractCustomerId(dataSource) {
  return dataSource.customerId ||
         dataSource.customer_id ||
         window.currentCustomerId ||
         null;
}

/**
 * Extract branch ID from data source
 * @param {Object} dataSource - Data source object
 * @returns {string|null} Branch ID
 */
function extractBranchId(dataSource) {
  return dataSource.branchId ||
         dataSource.branch_id ||
         window.currentBranchId ||
         null;
}

/**
 * Extract down payment amount from data source
 * @param {Object} dataSource - Data source object
 * @returns {number} Down payment amount
 */
function extractDownPaymentAmount(dataSource) {
  return parseFloat(dataSource.downPayment ||
                   dataSource.down_payment ||
                   dataSource.downPaymentAmount ||
                   0);
}

/**
 * Extract cart items from data source
 * @param {Object} dataSource - Data source object
 * @returns {Array} Cart items
 */
function extractCartItems(dataSource) {
  return dataSource.cartItems ||
         dataSource.cart_items ||
         dataSource.items ||
         window.cartItems ||
         [];
}

/**
 * Download PDF with fallback endpoints
 * @param {Array} endpoints - List of endpoints to try
 * @param {string} docType - Document type for logging
 * @returns {Promise<Object>} PDF data
 */
async function downloadPdfWithFallback(endpoints, docType) {
  const token = localStorage.getItem('authToken');
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      console.log(`📄 Trying ${docType} PDF endpoint: ${endpoint}`);

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) {
          console.log(`✅ ${docType} PDF downloaded successfully from: ${endpoint}`);
          return { blob, endpoint };
        } else {
          throw new Error('PDF file is empty');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.warn(`⚠️ ${docType} PDF endpoint failed: ${endpoint} - ${error.message}`);
      lastError = error;
      continue;
    }
  }

  throw new Error(`All ${docType} PDF endpoints failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Download PDF blob as file
 * @param {Blob} blob - PDF blob
 * @param {string} filename - File name
 */
function downloadPdfBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get selected email documents
 * @returns {Array} Selected document types
 */
function getSelectedEmailDocuments() {
  const selected = [];

  if (document.getElementById('emailQuotation')?.checked) {
    selected.push('quotation');
  }
  if (document.getElementById('emailInvoice')?.checked) {
    selected.push('invoice');
  }
  if (document.getElementById('emailReceipt')?.checked) {
    selected.push('receipt');
  }

  return selected;
}

/**
 * Prompt user for email address
 * @returns {Promise<string|null>} Email address
 */
async function promptForEmail() {
  return new Promise((resolve) => {
    const email = prompt('กรุณากรอกอีเมลผู้รับ:');
    resolve(email?.trim() || null);
  });
}

/**
 * Get customer data from form
 * @returns {Object} Customer data
 */
function getCustomerDataFromForm() {
  return {
    customerPrefix: document.getElementById('customerPrefix')?.value || '',
    customerFirstName: document.getElementById('customerFirstName')?.value || '',
    customerLastName: document.getElementById('customerLastName')?.value || '',
    customerIdCard: document.getElementById('customerIdCard')?.value || '',
    citizenId: document.getElementById('citizenId')?.value || '',
    customerPhone: document.getElementById('customerPhone')?.value || '',
    customerEmail: document.getElementById('customerEmail')?.value || ''
  };
}

/**
 * Get branch code
 * @returns {string} Branch code
 */
function getBranchCode() {
  return window.BRANCH_CODE ||
         window.InstallmentCore?.BRANCH_CODE ||
         'PATTANI';
}

/**
 * Update email status display
 * @param {string} type - Status type
 * @param {string} message - Status message
 */
function updateEmailStatus(type, message) {
  if (window.InstallmentAPI?.updateEmailStatus) {
    window.InstallmentAPI.updateEmailStatus(type, message);
  } else {
    console.log(`Email Status [${type}]: ${message}`);
  }
}

/**
 * Update email status indicators
 * @param {string} status - Status (success, error, sending)
 */
function updateEmailStatusIndicators(status) {
  const indicators = ['emailStatusMini', 'step4EmailStatus'];

  indicators.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      switch (status) {
        case 'success':
          element.textContent = 'ส่งสำเร็จ';
          element.className = 'text-green-600';
          break;
        case 'error':
          element.textContent = 'ส่งไม่สำเร็จ';
          element.className = 'text-red-600';
          break;
        case 'sending':
          element.textContent = 'กำลังส่ง...';
          element.className = 'text-blue-600';
          break;
      }
    }
  });
}

/**
 * Update PDF status indicators
 * @param {string} status - Status (ready, generating, error)
 */
function updatePdfStatusIndicators(status) {
  const indicators = ['pdfStatusBadge', 'pdfStatusMini'];

  indicators.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      switch (status) {
        case 'ready':
          element.textContent = 'พร้อมดาวน์โหลด';
          element.className = 'text-xs px-3 py-1 rounded-full bg-green-100 text-green-800';
          break;
        case 'generating':
          element.textContent = 'กำลังสร้าง...';
          element.className = 'text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800';
          break;
        case 'error':
          element.textContent = 'เกิดข้อผิดพลาด';
          element.className = 'text-xs px-3 py-1 rounded-full bg-red-100 text-red-800';
          break;
      }
    }
  });
}

/**
 * Update Step 4 status
 * @param {string} status - Status type
 * @param {string} message - Status message
 * @param {Object} receiptData - Receipt data
 */
function updateStep4Status(status, message, receiptData) {
  if (window.updateStep4Status) {
    window.updateStep4Status(status, message, receiptData);
  } else {
    console.log(`Step 4 Status [${status}]: ${message}`);
  }
}

/**
 * Update installment data with receipt information
 * @param {Object} receiptData - Receipt data
 */
function updateInstallmentDataWithReceipt(receiptData) {
  if (window.lastSuccessResponse?.data) {
    window.lastSuccessResponse.data.receiptVoucherId = receiptData.id || receiptData._id;
    window.lastSuccessResponse.data.receiptDocumentNo = receiptData.documentNo;
  }

  if (window.currentInstallmentData) {
    window.currentInstallmentData.receiptVoucherId = receiptData.id || receiptData._id;
    window.currentInstallmentData.receiptDocumentNo = receiptData.documentNo;
  }

  console.log('✅ Updated installment data with receipt info:', receiptData);
}

// =========================================
// MODULE EXPORTS
// =========================================

// Export enhanced PDF integration functions
window.InstallmentPDFIntegration = {
  // Enhanced PDF download functions with shorter names for button usage
  downloadQuotationPDF: downloadQuotationPdfEnhanced,
  downloadInvoicePDF: downloadInvoicePdfEnhanced,
  downloadReceiptPDF: downloadReceiptPdfEnhanced,
  downloadAllPdfs,

  // Enhanced email functions
  sendEnhancedEmail: sendInstallmentEmailEnhanced,

  // Enhanced automation functions
  processStep4AutomationEnhanced,
  createDownPaymentReceiptEnhanced,
  setupPdfDownloadButtonsEnhanced,
  processEmailAutomationEnhanced,

  // Utility functions
  getInstallmentDataSource,
  extractQuotationId,
  extractInvoiceId,
  extractReceiptVoucherId,
  extractContractNo,
  extractOrderId,
  downloadPdfWithFallback,
  downloadPdfBlob,
  getSelectedEmailDocuments,

  // Configuration
  PDF_CONTROLLERS,
  PDF_ENDPOINTS
};

// Backward compatibility: also export as InstallmentPDF
window.InstallmentPDF = window.InstallmentPDFIntegration;

// Also attach to InstallmentAPI for backward compatibility
if (window.InstallmentAPI) {
  // Enhanced versions replace legacy versions
  window.InstallmentAPI.downloadQuotationPdf = downloadQuotationPdfEnhanced;
  window.InstallmentAPI.downloadInvoicePdf = downloadInvoicePdfEnhanced;
  window.InstallmentAPI.downloadReceiptPdf = downloadReceiptPdfEnhanced;
  window.InstallmentAPI.downloadDownPaymentReceiptPdf = downloadReceiptPdfEnhanced;
  window.InstallmentAPI.sendInstallmentEmail = sendInstallmentEmailEnhanced;

  // New enhanced functions
  window.InstallmentAPI.downloadAllPdfs = downloadAllPdfs;
  window.InstallmentAPI.processStep4AutomationEnhanced = processStep4AutomationEnhanced;
}

console.log('✅ Installment PDF Integration Module loaded with correct backend controllers');
console.log('📄 Available PDF Controllers:', PDF_CONTROLLERS);
console.log('🔗 Available PDF Endpoints:', Object.keys(PDF_ENDPOINTS));
