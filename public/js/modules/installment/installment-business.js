// Installment Business Logic Module
// Handles business operations for installment processing

// Centralized document validation logic
function validateInstallmentDocuments(documents = {}) {
  console.log('📋 Validating installment documents...');

  const requiredDocs = [
    { key: 'idCardImage', label: 'รูปบัตรประชาชน' },
    { key: 'selfieImage', label: 'รูปถ่ายหน้าพร้อมบัตร' },
    { key: 'customerSignature', label: 'ลายเซ็นลูกค้า' },
    { key: 'salespersonSignature', label: 'ลายเซ็นพนักงาน' }
  ];

  const optionalDocs = [
    { key: 'salarySlipImage', label: 'สลิปเงินเดือน' }
  ];

  const missing = [];
  const present = [];

  // Check required documents
  requiredDocs.forEach(doc => {
    if (!documents[doc.key]) {
      missing.push(doc.label);
    } else {
      present.push(doc.label);
    }
  });

  // Count optional documents
  let optionalCount = 0;
  optionalDocs.forEach(doc => {
    if (documents[doc.key]) {
      optionalCount++;
      present.push(`${doc.label} (optional)`);
    }
  });

  const isValid = missing.length === 0;

  console.log('📋 Document validation results:');
  console.log(`✅ Required documents: ${requiredDocs.length - missing.length} / ${requiredDocs.length}`);
  console.log(`📄 Optional documents: ${optionalCount} / ${optionalDocs.length}`);

  if (missing.length > 0) {
    console.log('❌ Missing documents:', missing.join(', '));
  }

  return {
    isValid,
    missing,
    present,
    requiredCount: requiredDocs.length - missing.length,
    totalRequired: requiredDocs.length,
    optionalCount,
    totalOptional: optionalDocs.length
  };
}

// Generate a unique client fingerprint for duplicate detection
function generateClientFingerprint() {
  const data = {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    timestamp: Math.floor(Date.now() / 1000) // Round to seconds
  };
  return btoa(JSON.stringify(data));
}

// Enhanced error handling with field highlighting
function highlightValidationErrors(errors) {
  console.log('🎨 Highlighting validation errors...');

  // Clear previous highlights
  document.querySelectorAll('.validation-error').forEach(el => {
    el.classList.remove('validation-error');
  });

  // Field mapping for common validation errors
  const errorFieldMap = {
    'ชื่อลูกค้า': ['customerName', 'firstName', 'lastName'],
    'เบอร์โทรศัพท์': ['customerPhone', 'phone'],
    'สินค้า': ['productList', 'cartItems'],
    'แผนการผ่อน': ['installmentPlan', 'paymentPlan'],
    'จำนวน': ['quantity', 'qty']
  };

  errors.forEach(error => {
    // Find matching fields
    Object.keys(errorFieldMap).forEach(keyword => {
      if (error.includes(keyword)) {
        errorFieldMap[keyword].forEach(fieldId => {
          const field = document.getElementById(fieldId);
          if (field) {
            field.classList.add('validation-error');

            // Add error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error-message';
            errorDiv.textContent = error;
            field.parentElement.appendChild(errorDiv);

            // Remove error message after 5 seconds
            setTimeout(() => errorDiv.remove(), 5000);
          }
        });
      }
    });
  });
}

// Main function to save installment data with enhanced error handling
async function saveInstallmentData(installmentData) {
  console.log('💾 Saving installment data with enhanced error handling...');

  try {
    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found. Please login again.');
    }

    // Create unique request ID for duplicate detection
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Transform data to backend format (snake_case)
    const transformToBackendFormat = (data) => {
      console.log('🔄 Transforming data to backend format...');

      // Extract plan details
      let planType = 'plan1';
      let downPayment = 0;
      let monthlyPayment = 0;
      let installmentCount = 12;

      if (data.paymentPlan) {
        planType = data.paymentPlan.planType || data.planType || 'plan1';
        downPayment = data.paymentPlan.downPayment || data.downPayment || 0;
        monthlyPayment = data.paymentPlan.monthlyPayment || data.monthlyPayment || 0;
        installmentCount = data.paymentPlan.terms || data.installmentTerms || 12;
      }

      // Transform products to items with qty field
      const items = (data.products || data.cart_items || data.items || []).map(item => ({
        productId: item.productId || item.product_id || item.id,
        name: item.name || '',
        qty: parseInt(item.quantity || item.qty || 1), // Use qty instead of quantity
        price: parseFloat(item.price || 0),
        imei: item.imei || '',
        // Backend expects these fields
        downAmount: item.downAmount || 0,
        downInstallmentCount: installmentCount,
        downInstallment: monthlyPayment,
        creditThreshold: item.creditThreshold || 0,
        payUseInstallmentCount: installmentCount,
        payUseInstallment: monthlyPayment,
        pricePayOff: parseFloat(item.total || item.price || 0),
        promotion: item.promotion || null,
        itemDiscount: item.itemDiscount || 0
      }));

      // Calculate totals
      const subTotal = data.totalAmount || 0;
      const totalAmount = subTotal + (data.documentFee || 0) + (data.shippingFee || 0);

      return {
        // Items array (backend expects 'items', not 'products')
        items: items,

        // Customer object with snake_case fields
        customer: {
          prefix: data.prefix || '',
          first_name: data.firstName || '',
          last_name: data.lastName || '',
          phone_number: data.phone || '',
          email: data.email || '',
          tax_id: data.idCard || '',
          address: {
            houseNo: data.houseNo || '',
            moo: data.moo || '',
            soi: data.soi || '',
            road: data.road || '',
            subDistrict: data.subDistrict || '',
            district: data.district || '',
            province: data.province || '',
            zipcode: data.zipcode || ''
          },
          contactAddress: {
            useSameAddress: true,
            houseNo: data.houseNo || '',
            moo: data.moo || '',
            lane: data.soi || '',
            road: data.road || '',
            subDistrict: data.subDistrict || '',
            district: data.district || '',
            province: data.province || '',
            zipcode: data.zipcode || ''
          },
          invoice_no: `INV${Date.now()}`
        },

        // Customer type
        customer_type: 'individual',

        // Payment plan with snake_case
        plan_type: planType,
        down_payment: downPayment,
        installment_count: installmentCount,
        installment_amount: monthlyPayment,
        credit_amount: totalAmount - downPayment,
        payoff_amount: totalAmount,

        // Amounts
        sub_total: subTotal,
        total_amount: totalAmount,
        doc_fee: data.documentFee || 0,

        // Documents/attachments
        attachments: {
          id_card_image: data.documents?.idCardImage || '',
          selfie_image: data.documents?.selfieImage || '',
          income_slip: data.documents?.salarySlipImage || '',
          customer_signature: data.documents?.customerSignature || '',
          salesperson_signature: data.documents?.salespersonSignature || '',
          authorized_signature: data.documents?.authorizedSignature || ''
        },

        // Witness (if any)
        witness: data.witness || {},

        // Branch and metadata
        branch_code: data.branchCode || getBranchCode(),
        salesperson_id: data.salespersonId || null,

        // Quotation info
        quotation_no: data.quotationNo || '',
        quotation_terms: `ผ่อนชำระ ${installmentCount} งวด`,

        // Other fields
        appliedPromotions: data.appliedPromotions || [],
        promotionDiscount: data.promotionDiscount || 0,
        skipStockDeduction: false,
        payoffContract: false,

        // Request tracking
        requestId: requestId
      };
    };

    // Transform data to backend format
    const backendPayload = transformToBackendFormat(installmentData);

    console.log('📤 BACKEND PAYLOAD (SNAKE_CASE FORMAT):', backendPayload);
    console.log('🔍 Key fields check:');
    console.log('  - items:', backendPayload.items.length);
    console.log('  - customer.first_name:', backendPayload.customer.first_name);
    console.log('  - customer.phone_number:', backendPayload.customer.phone_number);
    console.log('  - plan_type:', backendPayload.plan_type);
    console.log('  - total_amount:', backendPayload.total_amount);

    // Store for debugging
    window.lastPayloadSent = backendPayload;

    // Send to backend
    console.log('🌐 === SENDING REQUEST TO BACKEND ===');

    const response = await fetch('/api/installment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Request-ID': requestId
      },
      body: JSON.stringify(backendPayload)
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', responseText);
      responseData = { error: 'Invalid response format' };
    }

    if (!response.ok) {
      console.error('Backend error:', responseData);

      // บิลด์ error object พร้อม metadata เพื่อให้ layer บนจับได้ง่าย
      const err = new Error(responseData.error || 'Failed to save installment data');
      err.code = responseData.code || (response.status === 429 ? 'DUPLICATE_SUBMISSION' : undefined);
      err.retryAfter = responseData.retryAfter || undefined;

      // จัดการ 429 Too Many Requests
      if (err.code === 'DUPLICATE_SUBMISSION') {
        err.message = responseData.error || `กรุณารอ ${err.retryAfter || 30} วินาทีก่อนส่งข้อมูลอีกครั้ง`;
      }

      // จัดการ Validation error พร้อม field highlight
      if (response.status === 400 && responseData.details) {
        highlightValidationErrors(responseData.details);
        err.message = responseData.details.join('\n');
      }

      throw err;
    }

    console.log('✅ Installment saved successfully:', responseData);
    return responseData;

  } catch (error) {
    console.error('❌ Error saving installment data:', error);
    throw error;
  }
}

// Helper function to get branch code
function getBranchCode() {
  // Try multiple sources for branch code
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('branch') ||
         localStorage.getItem('branchCode') ||
         window.branchCode ||
         '00000'; // Default branch code
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    saveInstallmentData,
    validateInstallmentDocuments,
    generateClientFingerprint,
    highlightValidationErrors,
    getBranchCode
  };
} else {
  // For browser use
  window.InstallmentBusiness = {
    saveInstallmentData,
    validateInstallmentDocuments,
    generateClientFingerprint,
    highlightValidationErrors,
    getBranchCode
  };
}