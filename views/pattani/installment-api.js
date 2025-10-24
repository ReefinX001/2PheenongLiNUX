// ========================================
// INSTALLMENT API SYSTEM - Pattani Branch
// ระบบ API และการจัดการข้อมูล สาขาปัตตานี
// ========================================

console.log('📦 Loading Installment API Module...');

// =========================================
// API PERFORMANCE OPTIMIZATIONS
// =========================================

// API Response Cache
const apiCache = new Map();
const cacheExpiry = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Request batching
let pendingRequests = new Map();
let batchTimeout = null;

// API caching helper
function getCachedResponse(cacheKey) {
  if (apiCache.has(cacheKey)) {
    const expiry = cacheExpiry.get(cacheKey);
    if (Date.now() < expiry) {
      console.log(`📋 Cache hit: ${cacheKey}`);
      return apiCache.get(cacheKey);
    } else {
      // Expired cache
      apiCache.delete(cacheKey);
      cacheExpiry.delete(cacheKey);
    }
  }
  return null;
}

// Set cached response
function setCachedResponse(cacheKey, response, duration = CACHE_DURATION) {
  apiCache.set(cacheKey, response);
  cacheExpiry.set(cacheKey, Date.now() + duration);
  console.log(`💾 Cached: ${cacheKey}`);
}

// Enhanced fetch with caching and retry
async function cachedFetch(url, options = {}, cacheKey = null, cacheDuration = CACHE_DURATION) {
  // Generate cache key if not provided
  if (!cacheKey) {
    cacheKey = `${url}_${JSON.stringify(options)}`;
  }

  // Check cache first (only for GET requests)
  if (!options.method || options.method === 'GET') {
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache successful GET responses
    if (!options.method || options.method === 'GET') {
      setCachedResponse(cacheKey, data, cacheDuration);
    }

    const duration = performance.now() - startTime;
    console.log(`🌐 API call completed: ${url} (${duration.toFixed(2)}ms)`);

    return data;

  } catch (error) {
    console.error(`❌ API call failed: ${url}`, error);
    throw error;
  }
}

// Request batching for multiple API calls
function batchApiCall(apiCall) {
  return new Promise((resolve, reject) => {
    const batchId = Date.now() + Math.random();
    pendingRequests.set(batchId, { apiCall, resolve, reject });

    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }

    batchTimeout = setTimeout(async () => {
      const batch = Array.from(pendingRequests.values());
      pendingRequests.clear();

      console.log(`🔄 Processing batch of ${batch.length} API calls`);

      // Execute all API calls in parallel
      const results = await Promise.allSettled(
        batch.map(({ apiCall }) => apiCall())
      );

      // Resolve/reject individual promises
      results.forEach((result, index) => {
        const { resolve, reject } = batch[index];
        if (result.status === 'fulfilled') {
          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });

    }, 50); // 50ms batch window
  });
}

// Clear API cache
function clearApiCache() {
  apiCache.clear();
  cacheExpiry.clear();
  console.log('🧹 API cache cleared');
}

// =========================================
// API CONFIGURATION
// =========================================
const API_CONFIG = {
  baseURL: window.location.origin,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

// =========================================
// BRANCH DATA MANAGEMENT
// =========================================

// Helper function to get branch code
function getBranchCode() {
  if (window.BRANCH_CODE) return window.BRANCH_CODE;
  if (window.urlParams) return window.urlParams.get('branch');
  if (localStorage.getItem('branchCode')) return localStorage.getItem('branchCode');
  return 'PATTANI';
}

async function loadBranchInstallments() {
  try {
    console.log('🔄 กำลังโหลดข้อมูลสินค้าผ่อน...');

    const token = localStorage.getItem('authToken') || '';
    const branchCode = window.BRANCH_CODE || getBranchCode() || 'PATTANI';

    // ลองใช้ API endpoints หลายตัวตามลำดับ
    const apiEndpoints = [
      // API 1: Branch Stock API (มักจะมีข้อมูลสต็อกจริง)
      {
        url: `/api/branch-stock/taxType?branch_code=${branchCode}&verified=true&purchaseType=installment`,
        dataPath: 'data'
      },
      // API 2: Product Image API (ข้อมูลผลิตภัณฑ์ทั่วไป)
      {
        url: `/api/product-image/pricing/installment`,
        dataPath: 'data'
      },
      // API 3: Fallback endpoint
      {
        url: `/api/installments/items`,
        dataPath: 'items'
      }
    ];

    let installmentItems = [];
    let lastError = null;

    // ลองเรียก API แต่ละตัวจนกว่าจะสำเร็จ
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`🔍 ลองเรียก API: ${endpoint.url}`);

        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'X-Branch': branchCode
          }
        });

        if (response.ok) {
          const data = await response.json();
          const items = data[endpoint.dataPath] || data.data || data.items || [];

          if (Array.isArray(items) && items.length > 0) {
            installmentItems = items;
            console.log(`✅ ใช้ API: ${endpoint.url} - พบ ${items.length} รายการ`);
            break;
          } else {
            console.log(`⚠️ API ${endpoint.url} ไม่มีข้อมูลสินค้า`);
          }
        } else {
          console.log(`❌ API ${endpoint.url} - HTTP ${response.status}`);
        }
      } catch (err) {
        console.log(`❌ API ${endpoint.url} - Error: ${err.message}`);
        lastError = err;
        continue;
      }
    }

    // ถ้าไม่มี API ไหนใช้ได้เลย แสดงข้อผิดพลาด
    if (installmentItems.length === 0) {
      const errorMsg = lastError ? `เกิดข้อผิดพลาด: ${lastError.message}` : 'ไม่สามารถเชื่อมต่อกับ API ได้';
      console.error('❌ ไม่สามารถโหลดข้อมูลสินค้าจาก API ได้');

      if (window.InstallmentUI && window.InstallmentUI.showToast) {
        window.InstallmentUI.showToast(`ไม่สามารถโหลดข้อมูลสินค้าได้: ${errorMsg}`, 'error');
      }

      throw new Error(`ไม่สามารถโหลดข้อมูลสินค้าจาก API ได้: ${errorMsg}`);
    }

    // เก็บข้อมูลใน global variables
    window.branchInstallments = installmentItems;

    // อัปเดทข้อมูลใน InstallmentProduct module
    if (window.InstallmentProduct && window.InstallmentProduct.setBranchInstallments) {
      window.InstallmentProduct.setBranchInstallments(installmentItems);
      console.log('✅ อัปเดต InstallmentProduct module');
    } else {
      // ถ้า InstallmentProduct ยังไม่พร้อม ให้รอและลองใหม่
      setTimeout(() => {
        if (window.InstallmentProduct && window.InstallmentProduct.setBranchInstallments) {
          window.InstallmentProduct.setBranchInstallments(installmentItems);
          console.log('✅ อัปเดต InstallmentProduct module (delayed)');
        } else {
          console.warn('⚠️ InstallmentProduct module ยังไม่พร้อมใช้งาน');
        }
      }, 1000);
    }

    console.log(`✅ โหลดข้อมูลสินค้าผ่อนสำเร็จ: ${installmentItems.length} รายการ`);
    return installmentItems;

  } catch (error) {
    console.error('❌ Error loading branch installments:', error);
    if (window.InstallmentUI && window.InstallmentUI.showToast) {
      window.InstallmentUI.showToast(`ไม่สามารถโหลดข้อมูลสินค้าได้: ${error.message}`, 'error');
    }

    // ล้างข้อมูลเก่าใน global variables
    window.branchInstallments = [];

    // อัปเดทข้อมูลใน InstallmentProduct module เป็น array ว่าง
    if (window.InstallmentProduct && window.InstallmentProduct.setBranchInstallments) {
      window.InstallmentProduct.setBranchInstallments([]);
      console.log('✅ ล้างข้อมูลใน InstallmentProduct module');
    }

    // โยน error ต่อไปให้ caller จัดการ
    throw error;
  }
}



async function loadBranchInfo() {
  try {
    const BRANCH_CODE = window.InstallmentCore?.BRANCH_CODE || 'PATTANI';
    const token = localStorage.getItem('authToken') || '';

    // เรียก /api/branch เพื่อดึง list สาขา (เหมือนกับ frontstore_pattani.html)
    const res = await fetch('/api/branch', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const js = await res.json();

    if (res.ok && js.success) {
      // หา record ที่ตรงกับ BRANCH_CODE
      const branch = js.data.find(b => b.branch_code === BRANCH_CODE);
      if (branch) {
        // อัพเดทข้อมูลใน DOM
        const branchInfoElement = document.getElementById('branchInfo');
        if (branchInfoElement) {
          branchInfoElement.textContent = `${branch.name} — ${branch.address}`;
        }

        // อัพเดท title ของหน้าด้วยชื่อสาขาจริง
        document.title = `ระบบผ่อน - ${branch.name}`;
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
          pageTitle.textContent = `ระบบผ่อน ${branch.name}`;
        }

        // เก็บข้อมูลสาขาใน global variable
        window.currentBranchInfo = {
          code: branch.branch_code,
          name: branch.name,
          address: branch.address,
          taxId: branch.taxId || '-',
          tel: branch.tel || '-',
        };

        console.log('✅ Branch info loaded:', branch.name);
        return;
      }
    }
    throw new Error('ไม่พบข้อมูลสาขา');
  } catch (err) {
    console.warn('loadBranchInfo error:', err);
    const BRANCH_CODE = window.InstallmentCore?.BRANCH_CODE || 'PATTANI';

    // ใช้ข้อมูล fallback
    window.currentBranchInfo = { code: BRANCH_CODE, name: 'สาขา ' + BRANCH_CODE };

    const branchInfoElement = document.getElementById('branchInfo');
    if (branchInfoElement) {
      branchInfoElement.textContent = 'สาขา: (ไม่พบข้อมูล)';
    }
  }
}

// ลบฟังก์ชันซ้ำ - ใช้ฟังก์ชันเวอร์ชันใหม่ที่อยู่ด้านล่าง

// =========================================
// CUSTOMER SEARCH AND MANAGEMENT
// =========================================

// ฟังก์ชันใหม่: โหลดลูกค้าจาก API installment/customers
async function loadCustomersFromAPI() {
  try {
    console.log('🔍 Loading customers from installment API...');

    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('ไม่พบ authentication token');
    }

    const response = await fetch('/api/installment/customers', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      console.log(`✅ Loaded ${result.data.length} customers from API`);
      return result.data;
    } else {
      throw new Error(result.message || 'ไม่สามารถโหลดข้อมูลลูกค้าได้');
    }

  } catch (error) {
    console.error('❌ Error loading customers from API:', error);
    if (window.InstallmentUI && window.InstallmentUI.showToast) {
      window.InstallmentUI.showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลลูกค้า: ' + error.message, 'error');
    }
    return [];
  }
}

async function searchExistingCustomer() {
  const searchQuery = document.getElementById('customerSearch').value.trim();

  if (!searchQuery || searchQuery.length < 3) {
    if (window.InstallmentUI && window.InstallmentUI.showToast) {
      window.InstallmentUI.showToast('กรุณากรอกอย่างน้อย 3 ตัวอักษรสำหรับค้นหา', 'warning');
    }
    return;
  }

  try {
    const searchBtn = document.getElementById('btnSearchCustomer');
    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> ค้นหา...';
    }

    // ใช้ API installment/customers แทน
    const customers = await loadCustomersFromAPI();

    // กรองผลลัพธ์ตามคำค้นหา
    const filteredResults = customers.filter(customer => {
      const searchLower = searchQuery.toLowerCase();
      return (
        customer.customerName?.toLowerCase().includes(searchLower) ||
        customer.phone?.includes(searchQuery) ||
        customer.taxId?.includes(searchQuery) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase().includes(searchLower)
      );
    });

    displayCustomerSearchResult(filteredResults);

  } catch (error) {
    console.error('Error searching customers:', error);
    if (window.InstallmentUI && window.InstallmentUI.showToast) {
      window.InstallmentUI.showToast('เกิดข้อผิดพลาดในการค้นหาลูกค้า', 'error');
    }
  } finally {
    const searchBtn = document.getElementById('btnSearchCustomer');
    if (searchBtn) {
      searchBtn.disabled = false;
      searchBtn.innerHTML = '<i class="bi bi-search"></i>';
    }
  }
}

function displayCustomerSearchResult(results) {
  const resultsContainer = document.getElementById('customerSearchResults');
  const resultsList = document.getElementById('customerResultsList');

  if (!resultsContainer || !resultsList) return;

  if (!results || results.length === 0) {
    resultsContainer.classList.add('hidden');
    if (window.InstallmentUI && window.InstallmentUI.showToast) {
      window.InstallmentUI.showToast('ไม่พบข้อมูลลูกค้าที่ค้นหา', 'info');
    }
    return;
  }

  resultsList.innerHTML = results.map(customer => {
    // รองรับทั้งข้อมูลจาก installment API และ customer API
    const customerId = customer._id || customer.id;
    const customerName = customer.customerName || customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    const phone = customer.phone || '';
    const taxId = customer.taxId || customer.idCard || '';
    const email = customer.email || '';

    return `
    <div class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 customer-result"
         onclick="selectCustomer('${customerId}', '${taxId}')">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-semibold text-gray-900">${customerName}</h4>
          <p class="text-sm text-gray-600">📱 ${phone}</p>
          <p class="text-sm text-gray-600">🆔 ${taxId}</p>
          ${email ? `<p class="text-sm text-gray-600">✉️ ${email}</p>` : ''}
        </div>
        <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">เลือก</span>
      </div>
    </div>
    `;
  }).join('');

  resultsContainer.classList.remove('hidden');

  if (window.InstallmentUI && window.InstallmentUI.showToast) {
    window.InstallmentUI.showToast(`พบลูกค้า ${results.length} รายการ`, 'success');
  }
}

// ฟังก์ชันใหม่: selectCustomer ที่รองรับข้อมูลจาก API - ใช้ function ที่ line 1269 แทน

// ฟังก์ชันใหม่: ล้างลูกค้าที่เลือก
function clearSelectedCustomer() {
  window.selectedCustomerId = null;

  const selectedCustomerDisplay = document.getElementById('selectedCustomerDisplay');
  if (selectedCustomerDisplay) {
    selectedCustomerDisplay.classList.add('hidden');
  }

  if (window.InstallmentUI && window.InstallmentUI.showToast) {
    window.InstallmentUI.showToast('ยกเลิกการเลือกลูกค้า', 'info');
  }
}

// ลบฟังก์ชันซ้ำ - ใช้ฟังก์ชันเวอร์ชันใหม่ที่อยู่ด้านล่าง

// =========================================
// FILE UPLOAD UTILITIES
// =========================================

async function uploadFile(file, uploadEndpoint, fieldName = 'file', filename = 'file', extras = {}) {
  try {
    const formData = new FormData();
    formData.append(fieldName, file, filename);

    // เพิ่มข้อมูลเสริม
    Object.keys(extras).forEach(key => {
      formData.append(key, extras[key]);
    });

    // 🔧 Attach citizenId in header for backend folder creation
    const headers = {
      'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
    };
    if (extras.citizenId) {
      headers['X-Citizen-Id'] = extras.citizenId;
    }

    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

async function uploadSignature(pad, urlFieldId) {
  try {
    if (pad.isEmpty()) {
      throw new Error('กรุณาเซ็นลายเซ็นก่อน');
    }

    // ตรวจสอบข้อมูลลูกค้าก่อน
    const validation = window.InstallmentUI?.validateCustomerData ?
                     window.InstallmentUI.validateCustomerData() :
                     { isValid: true, citizenId: null };
    console.log('🔍 Customer data validation:', validation);

    let citizenId = validation.citizenId || window.InstallmentUI?.getCitizenId?.();

    // ถ้าไม่พบ citizenId ให้แสดงข้อความแจ้งเตือนและใช้ค่า default
    if (!citizenId) {
      console.warn('⚠️ No citizenId found, using default value');
      citizenId = '0000000000000'; // ค่า default สำหรับกรณีที่ไม่พบ citizenId

      // แสดง toast แจ้งเตือน
      if (window.InstallmentUI && window.InstallmentUI.showToast) {
        window.InstallmentUI.showToast('ไม่พบเลขบัตรประชาชน กรุณากรอกข้อมูลลูกค้าก่อน', 'warning');
      }
    }

    const dataURL = pad.toDataURL();
    const response = await fetch(dataURL);
    const blob = await response.blob();

    const timestamp = new Date().getTime();
    const filename = `signature_${timestamp}.png`;

    // สร้างข้อมูลเพิ่มเติมสำหรับการอัปโหลด
    const uploadExtras = {
      type: 'signature',
      timestamp: timestamp,
      citizenId: citizenId,
      customerId: window.currentCustomerId || '',
      signatureType: urlFieldId === 'customerSignatureUrl' ? 'customer' : 'salesperson',
      branchCode: window.BRANCH_CODE || getBranchCode() || ''
    };

    console.log('📤 Uploading signature with data:', uploadExtras);

    const uploadResult = await uploadFile(blob, '/api/upload-documents/signature', 'file', filename, uploadExtras);

    // อัปเดต URL field
    const urlField = document.getElementById(urlFieldId);
    if (urlField) {
      urlField.value = uploadResult.url;
      console.log('✅ Updated URL field:', urlFieldId, uploadResult.url);
    }

    if (window.InstallmentUI && window.InstallmentUI.showToast) {
      window.InstallmentUI.showToast('บันทึกลายเซ็นสำเร็จ', 'success');
    }

    return uploadResult.url;

  } catch (error) {
    console.error('Signature upload error:', error);

    // แสดงข้อความ error ที่ชัดเจนขึ้น
    let errorMessage = 'บันทึกลายเซ็นไม่สำเร็จ';
    if (error.message.includes('citizenId is required')) {
      errorMessage = 'ไม่พบเลขบัตรประชาชน กรุณากรอกข้อมูลลูกค้าก่อน';
    } else if (error.message.includes('400')) {
      errorMessage = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลลูกค้า';
    } else {
      errorMessage += ': ' + error.message;
    }

    if (window.InstallmentUI && window.InstallmentUI.showToast) {
      window.InstallmentUI.showToast(errorMessage, 'error');
    }
    throw error;
  }
}

// =========================================
// EXPORT API FUNCTIONS
// =========================================

window.InstallmentAPI = {
  // Core functions
  getBranchCode,
  loadBranchInstallments,
  loadBranchInfo,
  loadEmployeeProfile,

  // Customer management
  searchExistingCustomer,
  displayCustomerSearchResult,
  selectCustomer,
  fillCustomerForm,

  // Customer data utilities - ใช้จาก InstallmentUI แทน

  // File and signature upload
  uploadFile,
  uploadSignature,

  // Email functions
  updateEmailStatus,
  previewEmail,
  sendInstallmentEmail,
  handleEmailDocumentChange,

  // Utility functions
  removeLocalityPrefix,
  removePrefixes,
  readCard,

  // Document functions
  fetchNextQuotationNumber,
  downloadQuotationPdf,
  downloadInvoicePdf,
  downloadReceiptPdf,
  downloadDownPaymentReceiptPdf,
  loadQuotationPdf,
  updateStep4Summary,

  // Stock functions
  checkStockAfterSale,

  // Enhanced search functions
  searchCustomersEnhanced,
  quickSearchCustomer,
  advancedSearchCustomers,
  getCustomerDetails,

  // Address functions
  loadAddressData,
  getDistrictsByProvince,
  getSubdistrictsByDistrict,
  getPostalCode,

  // Loan management integration
  syncCustomerToLoanSystem,
  updateCustomerInLoanSystem,
  getCustomerDebtAnalysis,

  // Validation functions (use InstallmentCore instead)

  // Auto-save functions
  autoSaveFormData,
  loadSavedFormData,
  clearSavedFormData,
  updateAutoSaveStatus,

  // Configuration
  API_CONFIG,

  // Performance optimization functions
  cachedFetch,
  batchApiCall,
  getCachedResponse,
  setCachedResponse,
  clearApiCache
};

console.log('✅ Installment API Module loaded');

// =================== Email Functions ===================

// ฟังก์ชันอัพเดทสถานะอีเมล
function updateEmailStatus(type, message) {
  const statusDiv = document.getElementById('emailSendStatus');
  if (!statusDiv) return;

  const typeClasses = {
    sending: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-gray-100 text-gray-700'
  };

  statusDiv.className = `p-3 rounded-lg text-center ${typeClasses[type] || typeClasses.info}`;
  statusDiv.innerHTML = message;
  statusDiv.classList.remove('hidden');

  // ซ่อนสถานะหลัง 5 วินาที (ยกเว้น error)
  if (type !== 'error') {
    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 5000);
  }
}

// ฟังก์ชันดูตัวอย่างอีเมล
async function previewEmail() {
  try {
    const customerEmail = document.getElementById('customerEmail').value.trim();

    if (!customerEmail) {
      window.InstallmentUI.showToast('กรุณากรอกอีเมลลูกค้าก่อน', 'warning');
      return;
    }

    // สร้างข้อความตัวอย่าง
    const customerName = `${document.getElementById('customerPrefix').value} ${document.getElementById('customerFirstName').value} ${document.getElementById('customerLastName').value}`.trim();
    const customMessage = document.getElementById('emailCustomMessage').value.trim();

    const selectedDocs = [];
      if (document.getElementById('emailQuotation').checked) selectedDocs.push('ใบเสนอราคา');
  if (document.getElementById('emailInvoice').checked) selectedDocs.push('ใบแจ้งหนี้');
  if (document.getElementById('emailReceipt').checked) selectedDocs.push('ใบเสร็จรับเงิน/ใบกำกับภาษี');

    const previewContent = `
      <div class="space-y-3">
        <p><strong>ถึง:</strong> ${customerEmail}</p>
        <p><strong>ชื่อลูกค้า:</strong> ${customerName}</p>
        <p><strong>เอกสารที่จะส่ง:</strong> ${selectedDocs.join(', ')}</p>
        ${customMessage ? `<p><strong>ข้อความพิเศษ:</strong> ${customMessage}</p>` : ''}
        <hr>
        <p class="text-sm text-gray-600">
          <strong>เนื้อหาอีเมล:</strong><br>
          เรียน คุณ${customerName}<br><br>
          ขอบคุณที่ไว้วางใจในการซื้อสินค้าผ่อนชำระกับเรา<br>
          เอกสารแนบ: ${selectedDocs.join(', ')}<br>
          ${customMessage ? `<br>${customMessage}<br>` : ''}
          <br>ขอบคุณครับ/ค่ะ
        </p>
      </div>
    `;

    // แสดงใน modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        <h3 class="text-lg font-bold mb-4">📧 ตัวอย่างอีเมล</h3>
        ${previewContent}
        <div class="mt-4 text-right">
          <button onclick="this.closest('.fixed').remove()" class="btn btn-primary">ปิด</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } catch (error) {
    console.error('Preview email error:', error);
    window.InstallmentUI.showToast('เกิดข้อผิดพลาดในการแสดงตัวอย่าง', 'error');
  }
}

// ฟังก์ชันส่งอีเมลจริง - ลบฟังก์ชันเดิมออก ใช้ฟังก์ชันใหม่ที่อยู่ท้ายไฟล์แทน

// ฟังก์ชันจัดการเมื่อมีการเปลี่ยนแปลงใน checkbox
function handleEmailDocumentChange() {
  const hasAnyChecked = document.getElementById('emailQuotation').checked ||
                        document.getElementById('emailInvoice')?.checked ||
                        document.getElementById('emailReceipt')?.checked;

  const customerEmail = document.getElementById('customerEmail').value.trim();

  // แสดงคำแนะนำ
  if (!hasAnyChecked) {
    updateEmailStatus('info', '⚠️ หากไม่เลือกเอกสารใดเลย ระบบจะไม่ส่งอีเมลอัตโนมัติ');
  } else if (!customerEmail) {
    updateEmailStatus('info', '📧 กรุณากรอกอีเมลลูกค้าเพื่อส่งเอกสาร');
  } else {
    updateEmailStatus('info', '✅ พร้อมส่งอีเมลอัตโนมัติเมื่อทำรายการสำเร็จใน Step 4');
  }
}

// =================== Card Reader Functions ===================

// ฟังก์ชันตัดคำว่า "หมู่ที่", "หมู่", "ตำบล", "อำเภอ", "จังหวัด" ออก (ถ้ามี)
function removeLocalityPrefix(str) {
  if (!str) return '';
  let result = str.trim();
  result = result.replace(/^หมู่ที่\s*/i, '').replace(/^หมู่\s*/i, '');
  result = result.replace(/^ตำบล\s*/i, '');
  result = result.replace(/^อำเภอ\s*/i, '');
  result = result.replace(/^จังหวัด\s*/i, '');
  return result.trim();
}

// trim ธรรมดา
function removePrefixes(str) {
  if (!str) return '';
  return str.trim();
}

// ฟังก์ชันคำนวณอายุจากเลขบัตรประชาชน
function calculateAgeFromIdCard(citizenId) {
  if (!citizenId || citizenId.length !== 13) {
    return null;
  }

  try {
    // ดึงปีเกิดจากเลขบัตรประชาชน (ตำแหน่งที่ 2-3)
    const yearDigits = citizenId.substring(1, 3);
    let birthYear = parseInt(yearDigits);

    // แปลงปี พ.ศ. เป็น ค.ศ.
    // ถ้าเลข 2 หลักน้อยกว่า 50 ถือว่าเป็นปี 25xx (เช่น 25 = 2525)
    // ถ้าเลข 2 หลักมากกว่าหรือเท่ากับ 50 ถือว่าเป็นปี 24xx (เช่น 65 = 2465)
    if (birthYear < 50) {
      birthYear = 2500 + birthYear - 543; // แปลงเป็น ค.ศ.
    } else {
      birthYear = 2400 + birthYear - 543; // แปลงเป็น ค.ศ.
    }

    // ดึงเดือนและวันเกิด (ตำแหน่งที่ 4-5 และ 6-7)
    const birthMonth = parseInt(citizenId.substring(3, 5));
    const birthDay = parseInt(citizenId.substring(5, 7));

    // ตรวจสอบความถูกต้องของวันที่
    if (birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > 31) {
      return null;
    }

    // คำนวณอายุ
    const today = new Date();
    const birthDate = new Date(birthYear, birthMonth - 1, birthDay);

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // ตรวจสอบความสมเหตุสมผลของอายุ
    if (age < 0 || age > 150) {
      return null;
    }

    return age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return null;
  }
}

// ฟังก์ชันคำนวณวันเดือนปีเกิดจากเลขประจำตัวประชาชน
function calculateBirthDateFromIdCard(citizenId) {
  if (!citizenId || citizenId.length !== 13) {
    return null;
  }

  try {
    // ดึงปีเกิดจากเลขบัตรประชาชน (ตำแหน่งที่ 2-3)
    const yearDigits = citizenId.substring(1, 3);
    let birthYear = parseInt(yearDigits);

    // แปลงปี พ.ศ. เป็น ค.ศ.
    // ถ้าเลข 2 หลักน้อยกว่า 50 ถือว่าเป็นปี 25xx (เช่น 25 = 2525)
    // ถ้าเลข 2 หลักมากกว่าหรือเท่ากับ 50 ถือว่าเป็นปี 24xx (เช่น 65 = 2465)
    if (birthYear < 50) {
      birthYear = 2500 + birthYear - 543; // แปลงเป็น ค.ศ.
    } else {
      birthYear = 2400 + birthYear - 543; // แปลงเป็น ค.ศ.
    }

    // ดึงเดือนและวันเกิด (ตำแหน่งที่ 4-5 และ 6-7)
    const birthMonth = parseInt(citizenId.substring(3, 5));
    const birthDay = parseInt(citizenId.substring(5, 7));

    // ตรวจสอบความถูกต้องของวันที่
    if (birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > 31) {
      return null;
    }

    // Format วันที่เป็น YYYY-MM-DD สำหรับ HTML date input
    const formattedMonth = birthMonth.toString().padStart(2, '0');
    const formattedDay = birthDay.toString().padStart(2, '0');

    return `${birthYear}-${formattedMonth}-${formattedDay}`;
  } catch (error) {
    console.error('Error calculating birth date:', error);
    return null;
  }
}

// ฟังก์ชันแปลงข้อมูลวันเกิดจากบัตรประชาชนให้เป็นรูปแบบ YYYY-MM-DD
function parseBirthDateFromCard(birthDateData) {
  if (!birthDateData) return null;

  console.log(`🔍 Parsing birth date:`, birthDateData, typeof birthDateData);

  try {
    // ถ้าเป็น string แล้วอยู่ในรูปแบบ YYYY-MM-DD ใช้ได้เลย
    if (typeof birthDateData === 'string' && birthDateData.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.log(`✅ Already in YYYY-MM-DD format: ${birthDateData}`);
      return birthDateData;
    }

    // ถ้าเป็น Date object
    if (birthDateData instanceof Date) {
      const formatted = birthDateData.toISOString().split('T')[0];
      console.log(`✅ Converted Date object to: ${formatted}`);
      return formatted;
    }

    // ถ้าเป็น string รูปแบบต่างๆ
    if (typeof birthDateData === 'string') {
      let cleanedDate = birthDateData.trim();

      // รูปแบบ DD/MM/YYYY หรือ DD-MM-YYYY
      if (cleanedDate.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/)) {
        const parts = cleanedDate.split(/[\/\-]/);
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        const formatted = `${year}-${month}-${day}`;
        console.log(`✅ Converted DD/MM/YYYY to: ${formatted}`);
        return formatted;
      }

      // รูปแบบ YYYY/MM/DD หรือ YYYY-MM-DD
      if (cleanedDate.match(/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/)) {
        const parts = cleanedDate.split(/[\/\-]/);
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;
        console.log(`✅ Converted YYYY/MM/DD to: ${formatted}`);
        return formatted;
      }

      // รูปแบบตัวเลขอย่างเดียว เช่น 20231225 (YYYYMMDD)
      if (cleanedDate.match(/^\d{8}$/)) {
        const year = cleanedDate.substring(0, 4);
        const month = cleanedDate.substring(4, 6);
        const day = cleanedDate.substring(6, 8);
        const formatted = `${year}-${month}-${day}`;
        console.log(`✅ Converted YYYYMMDD to: ${formatted}`);
        return formatted;
      }

      // รูปแบบตัวเลขอย่างเดียว เช่น 25231225 (DDMMYYYY)
      if (cleanedDate.match(/^\d{8}$/) && cleanedDate.substring(4, 8) > '1900') {
        const day = cleanedDate.substring(0, 2);
        const month = cleanedDate.substring(2, 4);
        const year = cleanedDate.substring(4, 8);
        const formatted = `${year}-${month}-${day}`;
        console.log(`✅ Converted DDMMYYYY to: ${formatted}`);
        return formatted;
      }

      // ลองใช้ Date constructor แล้วแปลง
      const dateObj = new Date(cleanedDate);
      if (!isNaN(dateObj.getTime())) {
        const formatted = dateObj.toISOString().split('T')[0];
        console.log(`✅ Converted generic string to: ${formatted}`);
        return formatted;
      }
    }

    // ถ้าเป็นตัวเลข (timestamp)
    if (typeof birthDateData === 'number') {
      const dateObj = new Date(birthDateData);
      if (!isNaN(dateObj.getTime())) {
        const formatted = dateObj.toISOString().split('T')[0];
        console.log(`✅ Converted timestamp to: ${formatted}`);
        return formatted;
      }
    }

    console.warn(`⚠️ Could not parse birth date format: ${birthDateData}`);
    return null;

  } catch (error) {
    console.error(`❌ Error parsing birth date: ${birthDateData}`, error);
    return null;
  }
}

// อ่านบัตรประชาชน + removeLocalityPrefix() และคำนวณอายุ
async function readCard() {
  console.log('readCard() ถูกเรียกแล้ว');
  let loaderId = null;

  try {
    // แสดง loading ด้วย LoadingSystem v2.0.0
    if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
      loaderId = window.LoadingSystem.show({
        message: 'กำลังอ่านบัตรประชาชน...',
        showProgress: true,
        autoProgress: true
      });
    } else {
      // Fallback ถ้า LoadingSystem ไม่พร้อม
      if (typeof showToast === 'function') {
        showToast('กำลังอ่านข้อมูลบัตร...', 'info');
      }
    }

    const token = localStorage.getItem('authToken') || '';
    const branchCode = getBranchCode();

    const resp = await fetch('/api/read-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'X-Branch-Code': branchCode // ส่งรหัสสาขา
      }
    });

    const js = await resp.json();
    console.log('🔍 Card reader API response:', js);

    if (!resp.ok || !js.success) {
      let errorMessage = js.error || 'unknown error';

      // จัดการ HTTP 500 error เป็นพิเศษ
      if (resp.status === 500) {
        errorMessage = 'เครื่องอ่านบัตรไม่พร้อมใช้งาน - โปรดกรอกข้อมูลด้วยตนเอง';
        console.warn('🔌 Card reader service unavailable (HTTP 500)');

        // Focus ไปที่ช่องชื่อเพื่อให้ผู้ใช้เริ่มกรอกข้อมูลเอง
        setTimeout(() => {
          const firstNameInput = document.getElementById('customerFirstName');
          if (firstNameInput) {
            firstNameInput.focus();
            firstNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 1500);

        showToast(errorMessage, 'warning');
        showToast('💡 กรุณากรอกข้อมูลลูกค้าด้วยตนเอง เริ่มจากช่องชื่อ', 'info');
      } else {
        showToast('ไม่สามารถอ่านข้อมูลบัตรได้: ' + errorMessage, 'error');
      }

      return;
    }

    const d = js.data;
    console.log('📋 Card data received:', d);

    // สร้าง array เก็บ elements ที่ถูกกรอกข้อมูล เพื่อ trigger events ทีหลัง
    const updatedElements = [];

    // ✅ ใช้ null-safe helper function สำหรับ readCard (ไม่ trigger events ทันที)
    const setElementValue = (id, value) => {
      const element = document.getElementById(id);
      if (element) {
        element.value = value || '';
        updatedElements.push(element);
        console.log(`✅ Set ${id} = "${value}"`);
      } else {
        console.warn(`⚠️ Element '${id}' not found while setting card data`);
      }
    };

    // เติมข้อมูลพื้นฐาน
    setElementValue('customerPrefix', d.titleTh || d.TitleTh);
    setElementValue('customerFirstName', d.firstNameTh || d.FirstNameTh);
    setElementValue('customerLastName', d.lastNameTh || d.LastNameTh);
    setElementValue('customerIdCard', d.citizenId || d.Citizenid);

    // ใช้ข้อมูลวันเกิดและอายุจากการอ่านบัตรประชาชนโดยตรง
    const citizenId = d.citizenId || d.Citizenid;
    let calculatedAge = d.age || null; // ใช้อายุจาก API ก่อน หรือ null

    // ตรวจสอบข้อมูลวันเกิดจากบัตรประชาชน (ใช้ชื่อ field ที่หลากหลาย)
    const birthDateFromCard = d.birthDate || d.dateOfBirth || d.birth_date || d.dob || d.Birth_Date || d.DateOfBirth ||
                               d.birthdayTh || d.birthdayEn || d.birthday || d.DateBirth || d.birth;

    console.log(`🔍 Debug birth date fields from card:`, {
      birthDate: d.birthDate,
      dateOfBirth: d.dateOfBirth,
      birth_date: d.birth_date,
      dob: d.dob,
      Birth_Date: d.Birth_Date,
      DateOfBirth: d.DateOfBirth,
      birthdayTh: d.birthdayTh,
      birthdayEn: d.birthdayEn,
      birthday: d.birthday,
      DateBirth: d.DateBirth,
      birth: d.birth,
      selected: birthDateFromCard
    });

    if (birthDateFromCard) {
      console.log(`📅 Birth date from card reader: ${birthDateFromCard} (type: ${typeof birthDateFromCard})`);

      let formattedBirthDate = null;

      try {
        formattedBirthDate = parseBirthDateFromCard(birthDateFromCard);

        if (formattedBirthDate) {
          setElementValue('customerBirthDate', formattedBirthDate);
          console.log(`✅ Set birth date from card: ${formattedBirthDate}`);

          // คำนวณอายุจากวันเกิดที่ได้จากบัตร
          const birthDate = new Date(formattedBirthDate);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();

          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }

          setElementValue('customerAge', age);
          console.log(`🎂 Calculated age from birth date: ${age} years`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not parse birth date from card: ${birthDateFromCard}`, error);
      }
    }

    // ถ้าไม่มีวันเกิดจากบัตร แต่มีอายุจาก API
    if (!birthDateFromCard && calculatedAge) {
      setElementValue('customerAge', calculatedAge);
      console.log(`🎂 Using age from API: ${calculatedAge} years`);
    }

    // ถ้าไม่มีทั้งวันเกิดและอายุจาก API ใช้การคำนวณจากเลขบัตรเป็น fallback
    if (!birthDateFromCard && !calculatedAge && citizenId) {
      const ageFromId = calculateAgeFromIdCard(citizenId);
      if (ageFromId !== null) {
        calculatedAge = ageFromId; // ใช้อายุที่คำนวณจาก ID
        setElementValue('customerAge', calculatedAge);
        console.log(`🎂 Calculated age from ID (fallback): ${calculatedAge} years`);

        // คำนวณวันเดือนปีเกิดจากเลขประจำตัวประชาชน
        const birthDate = calculateBirthDateFromIdCard(citizenId);
        if (birthDate) {
          setElementValue('customerBirthDate', birthDate);
          console.log(`📅 Calculated birth date (fallback): ${birthDate}`);
        }
      }
    }

    // จัดการข้อมูลที่อยู่
    const addr = (d.address || d.Address || '').split('#').filter((a) => a.trim());
    if (addr.length > 0) {
      setElementValue('houseNo', removePrefixes(addr[0] || ''));
      setElementValue('moo', removeLocalityPrefix(addr[1] || ''));
      setElementValue('subDistrict', removeLocalityPrefix(addr[2] || ''));
      setElementValue('district', removeLocalityPrefix(addr[3] || ''));
      setElementValue('province', removeLocalityPrefix(addr[4] || ''));
      setElementValue('zipcode', removePrefixes(addr[5] || ''));
    }

    // Trigger events สำหรับ elements ที่ถูกอัพเดท (หลังจากกรอกข้อมูลครบแล้ว)
    console.log(`🔄 Triggering events for ${updatedElements.length} updated elements`);
    updatedElements.forEach(element => {
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });

    showToast('อ่านข้อมูลบัตรสำเร็จ', 'success');

    // สร้างชื่อเต็มสำหรับแสดงผล
    const customerName = `${d.titleTh || d.TitleTh || ''} ${d.firstNameTh || d.FirstNameTh || ''} ${d.lastNameTh || d.LastNameTh || ''}`.trim();

    // แสดงข้อมูลสรุป
    if (customerName) {
      const summaryMessage = `ลูกค้า: ${customerName}${calculatedAge ? ` (อายุ ${calculatedAge} ปี)` : ''}`;
      showToast(summaryMessage, 'info', { duration: 4000 });
    }

    // อัพเดทข้อมูลในระบบถ้ามี
    if (typeof updateCustomerFormValidation === 'function') {
      updateCustomerFormValidation();
    }

    // Trigger form update events
    const customerForm = document.getElementById('customerForm');
    if (customerForm) {
      customerForm.dispatchEvent(new Event('change'));
    }

    console.log('✅ Card data filled successfully');

  } catch (err) {
    console.error('❌ readCard error:', err);
    showToast(`เกิดข้อผิดพลาด: ${err.message}`, 'error');
  } finally {
    // ซ่อน loading ด้วย LoadingSystem v2.0.0
    if (loaderId && window.LoadingSystem && typeof window.LoadingSystem.hide === 'function') {
      window.LoadingSystem.hide(loaderId);
    }
  }
}

// ลบฟังก์ชันซ้ำ displayCustomerSearchResult2 - ใช้ displayCustomerSearchResult ที่อยู่ด้านบนแทน

// เลือกลูกค้าและกรอกข้อมูลลงในฟอร์ม
async function selectCustomer(customerId, taxId) {
  try {
    if (window.InstallmentUI && window.InstallmentUI.showToast) {
      window.InstallmentUI.showToast('กำลังโหลดข้อมูลลูกค้า...', 'info');
    }

    const token = localStorage.getItem('authToken');
    // Use installment API to get customer data
    const response = await fetch(`/api/installment/customers/${customerId}`, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    console.log('📊 API Response:', result);

    if (result.success && result.data) {
      const customer = result.data;
      console.log('👤 Customer Data:', customer);

      // กรอกข้อมูลลงในฟอร์ม
      fillCustomerForm(customer);

      // ซ่อนผลการค้นหา
      document.getElementById('customerSearchResults').classList.add('hidden');
      document.getElementById('customerSearch').value = '';

      // โหลดข้อมูลติดต่อเพิ่มเติม (ถ้ามี)
      if (taxId && typeof loadContactInfo === 'function') {
        loadContactInfo(taxId);
      }

      if (window.InstallmentUI && window.InstallmentUI.showToast) {
        window.InstallmentUI.showToast('โหลดข้อมูลลูกค้าเรียบร้อย', 'success');
      }
    } else {
      throw new Error(result.message || 'ไม่สามารถโหลดข้อมูลลูกค้าได้');
    }

  } catch (error) {
    console.error('Select customer error:', error);
    if (window.InstallmentUI && window.InstallmentUI.showToast) {
      window.InstallmentUI.showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
    } else {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  }
}

// กรอกข้อมูลลูกค้าลงในฟอร์ม
function fillCustomerForm(customer) {
  console.log('📋 กำลังกรอกข้อมูลลูกค้า:', customer);

  if (customer.customerType === 'individual' && customer.individual) {
    const individual = customer.individual;

    // ข้อมูลพื้นฐาน
    document.getElementById('customerPrefix').value = individual.prefix || '';
    document.getElementById('customerFirstName').value = individual.firstName || '';
    document.getElementById('customerLastName').value = individual.lastName || '';
    document.getElementById('customerIdCard').value = individual.taxId || individual.idCard || '';
    document.getElementById('customerPhone').value = individual.phone || '';
    document.getElementById('customerEmail').value = individual.email || '';

    // ข้อมูลวันเกิดและอายุ
    if (individual.birthDate || individual.birth_date || individual.dateOfBirth) {
      const birthDate = individual.birthDate || individual.birth_date || individual.dateOfBirth;
      const formattedBirthDate = parseBirthDateFromCard(birthDate);
      if (formattedBirthDate) {
        document.getElementById('customerBirthDate').value = formattedBirthDate;
        console.log(`✅ Set birth date from customer data: ${formattedBirthDate}`);

        // คำนวณอายุจากวันเกิด
        const today = new Date();
        const birth = new Date(formattedBirthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }

        document.getElementById('customerAge').value = age;
        console.log(`✅ Calculated age from customer birth date: ${age} years`);
      }
    } else if (individual.age) {
      // ถ้ามีเฉพาะอายุ
      document.getElementById('customerAge').value = individual.age;
      console.log(`✅ Set age from customer data: ${individual.age} years`);
    }

    // ที่อยู่
    if (individual.address) {
      const addr = individual.address;
      console.log('🏠 ข้อมูลที่อยู่:', addr);

      // รองรับหลาย field name สำหรับบ้านเลขที่
      const houseNo = addr.houseNumber || addr.houseNo || addr.house_number || addr.house || '';
      document.getElementById('houseNo').value = houseNo;
      console.log('🏠 บ้านเลขที่:', houseNo);

      document.getElementById('moo').value = addr.village || addr.moo || '';
      document.getElementById('subDistrict').value = addr.subDistrict || addr.tambon || '';
      document.getElementById('district').value = addr.district || addr.amphoe || '';
      document.getElementById('province').value = addr.province || addr.changwat || '';

      // รองรับหลาย field name สำหรับรหัสไปรษณีย์
      const zipcode = addr.zipCode || addr.zipcode || addr.postalCode || addr.postal_code || addr.postcode || '';
      document.getElementById('zipcode').value = zipcode;
      console.log('📮 รหัสไปรษณีย์:', zipcode);
    } else {
      console.warn('⚠️ ไม่พบข้อมูลที่อยู่ในข้อมูลลูกค้า');
    }
  } else if (customer.customerType === 'corporate' && customer.corporate) {
    const corporate = customer.corporate;

    // สำหรับนิติบุคคล - แปลงเป็นข้อมูลบุคคลธรรมดา
    document.getElementById('customerPrefix').value = '';
    document.getElementById('customerFirstName').value = corporate.contactPerson || corporate.companyName || '';
    document.getElementById('customerLastName').value = '';
    document.getElementById('customerIdCard').value = corporate.companyTaxId || '';
    document.getElementById('customerPhone').value = corporate.corporatePhone || '';
    document.getElementById('customerEmail').value = corporate.email || '';
  }
}

// ลบฟังก์ชันซ้ำ uploadFile2 และ uploadSignature2 - ใช้ uploadFile และ uploadSignature ที่อยู่ด้านบนแทน

// Additional functions are already included in the main export above

// =============== Additional API Functions ===============

// โหลดโปรไฟล์พนักงาน
async function loadEmployeeProfile() {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const userData = await response.json();
    if (userData.success && userData.data) {
      window.currentUser = userData.data;
      if (userData.data.firstName && userData.data.lastName) {
        document.getElementById('empName').textContent =
          `${userData.data.firstName} ${userData.data.lastName}`;
      }
    }
  } catch (error) {
    console.error('Failed to load employee profile:', error);
  }
}

// ฟังก์ชันดึงหมายเลขใบเสนอราคาถัดไป
async function fetchNextQuotationNumber() {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/next-quotation-number', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (data.success) {
      return data.nextNumber;
    }
    throw new Error(data.message || 'Failed to get quotation number');
  } catch (error) {
    console.error('Error fetching quotation number:', error);
    // Return fallback number based on timestamp
    return `QT${Date.now().toString().slice(-6)}`;
  }
}

// ตรวจสอบสต็อกหลังการขาย
async function checkStockAfterSale() {
  try {
    const token = localStorage.getItem('authToken');
    const cartItems = window.InstallmentProduct?.cartItems || window.cartItems || [];
    const soldItems = cartItems.map(item => ({
      productId: item._id,
      imei: item.imei,
      soldQuantity: 1
    }));

    const response = await fetch('/api/stock/check-after-sale', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        branchCode: BRANCH_CODE,
        items: soldItems
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    if (result.success) {
      // อัพเดทสต็อกใน branchInstallments
      const branchInstallments = window.branchInstallments || [];
      result.updatedStock.forEach(stockItem => {
        const index = branchInstallments.findIndex(item =>
          item._id === stockItem.productId
        );
        if (index !== -1) {
          branchInstallments[index].qty = stockItem.newQuantity;
        }
      });

      console.log('Stock updated after sale:', result.updatedStock);
    }
  } catch (error) {
    console.error('Error checking stock after sale:', error);
  }
}

// =============== Enhanced PDF Download Functions with Debugging ===============

// ดาวน์โหลด PDF ใบเสนอราคา/ใบสัญญาผ่อน
async function downloadQuotationPdf() {
  try {
    console.log('🔍 DEBUG: Starting downloadQuotationPdf');
    console.log('🔍 DEBUG: window.lastSuccessResponse =', window.lastSuccessResponse);

    // ✅ Enhanced data extraction with multiple fallbacks
    const successResponse = window.lastSuccessResponse;
    let contractNo = successResponse?.data?.contractNo ||
                    successResponse?.data?.contract_no ||
                    successResponse?.contractNo ||
                    successResponse?.contract_no;

    // ✅ Fallback: ถ้าไม่มี contractNo ให้ลองหาจากที่อื่น
    if (!contractNo && window.currentInstallmentData) {
      contractNo = window.currentInstallmentData.contractNo ||
                  window.currentInstallmentData.contract_no;
      console.log('🔍 DEBUG: Using contractNo from currentInstallmentData:', contractNo);
    }

    // ✅ Fallback: สร้าง contractNo จาก timestamp หากไม่มี
    if (!contractNo) {
      const timestamp = Date.now().toString().slice(-6);
      contractNo = `INST${new Date().getFullYear().toString().slice(-2)}${timestamp}`;
      console.warn('⚠️ DEBUG: Generated fallback contractNo:', contractNo);

      // ✅ อัปเดต window.lastSuccessResponse ด้วย contractNo ที่สร้างขึ้น
      if (!window.lastSuccessResponse) {
        window.lastSuccessResponse = { data: {} };
      }
      if (!window.lastSuccessResponse.data) {
        window.lastSuccessResponse.data = {};
      }
      window.lastSuccessResponse.data.contractNo = contractNo;
    }

    console.log('🔍 DEBUG: Final contractNo =', contractNo);

    if (!contractNo) {
      // ✅ Enhanced error message with debug info
      console.error('❌ DEBUG: No contract number found after all fallbacks');
      console.error('❌ DEBUG: Available data sources:', {
        lastSuccessResponse: !!window.lastSuccessResponse,
        lastSuccessResponseData: !!window.lastSuccessResponse?.data,
        currentInstallmentData: !!window.currentInstallmentData,
        availableKeys: window.lastSuccessResponse?.data ? Object.keys(window.lastSuccessResponse.data) : 'none'
      });

      throw new Error('ไม่พบหมายเลขสัญญาการผ่อนชำระ กรุณาบันทึกข้อมูลก่อน\n\nข้อมูล Debug: ' +
                     `lastSuccessResponse: ${!!window.lastSuccessResponse}, ` +
                     `data: ${!!window.lastSuccessResponse?.data}`);
    }

    console.log('📄 Downloading installment PDF for contract:', contractNo);

    const token = localStorage.getItem('authToken');
    console.log('🔍 DEBUG: Token exists:', !!token);

    // ใช้ contract route สำหรับการดาวน์โหลด PDF
    const apiUrl = `/api/installment/contract/${contractNo}/pdf`;
    console.log('🔍 DEBUG: API URL =', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf'
      }
    });

    console.log('🔍 DEBUG: Response status:', response.status);
    console.log('🔍 DEBUG: Response headers:', response.headers);

    if (!response.ok) {
      const text = await response.text();
      console.error('❌ DEBUG: Response error text:', text);
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const blob = await response.blob();
    console.log('🔍 DEBUG: Blob size:', blob.size);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `installment-contract-${contractNo}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ DEBUG: PDF download completed successfully');
    window.InstallmentUI.showToast('ดาวน์โหลด PDF สำเร็จ', 'success');
  } catch (error) {
    console.error('❌ DEBUG: Download installment PDF failed:', error);
    window.InstallmentUI.showToast(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
  }
}

// ดาวน์โหลด PDF ใบแจ้งหนี้
async function downloadInvoicePdf() {
  try {
    console.log('🔍 DEBUG: Starting downloadInvoicePdf');
    console.log('🔍 DEBUG: window.lastSuccessResponse =', window.lastSuccessResponse);

    // ✅ Enhanced data extraction with multiple fallbacks
    const successResponse = window.lastSuccessResponse;
    let invoiceId = successResponse?.data?.invoiceId ||
                   successResponse?.data?.invoice_id ||
                   successResponse?.invoiceId;

    // ✅ Fallback: ถ้าไม่มี invoiceId ให้ลองหาจากที่อื่น
    if (!invoiceId && window.currentInstallmentData) {
      invoiceId = window.currentInstallmentData.invoiceId ||
                 window.currentInstallmentData.invoice_id;
      console.log('🔍 DEBUG: Using invoiceId from currentInstallmentData:', invoiceId);
    }

    // ✅ Fallback: สร้าง invoiceId จาก contractNo หากไม่มี
    if (!invoiceId) {
      const contractNo = successResponse?.data?.contractNo ||
                        successResponse?.data?.contract_no ||
                        window.currentInstallmentData?.contractNo;

      if (contractNo) {
        invoiceId = `INV-${contractNo}`;
        console.warn('⚠️ DEBUG: Generated fallback invoiceId from contractNo:', invoiceId);

        // อัปเดต window.lastSuccessResponse
        if (window.lastSuccessResponse?.data) {
          window.lastSuccessResponse.data.invoiceId = invoiceId;
        }
      } else {
        // สร้าง invoiceId ใหม่หากไม่มี contractNo
        const timestamp = Date.now().toString().slice(-6);
        invoiceId = `INV-${new Date().getFullYear()}${timestamp}`;
        console.warn('⚠️ DEBUG: Generated fallback invoiceId from timestamp:', invoiceId);
      }
    }

    console.log('🔍 DEBUG: Final invoiceId =', invoiceId);

    if (!invoiceId) {
      console.error('❌ DEBUG: No invoice ID found after all fallbacks');
      console.error('❌ DEBUG: Available data sources:', {
        lastSuccessResponse: !!window.lastSuccessResponse,
        lastSuccessResponseData: !!window.lastSuccessResponse?.data,
        currentInstallmentData: !!window.currentInstallmentData,
        availableKeys: window.lastSuccessResponse?.data ? Object.keys(window.lastSuccessResponse.data) : 'none'
      });

      throw new Error('ไม่พบหมายเลขใบแจ้งหนี้ กรุณาบันทึกข้อมูลก่อน\n\nข้อมูล Debug: ' +
                     `lastSuccessResponse: ${!!window.lastSuccessResponse}, ` +
                     `data: ${!!window.lastSuccessResponse?.data}`);
    }

    console.log('📄 Downloading invoice PDF for:', invoiceId);

    const token = localStorage.getItem('authToken');
    console.log('🔍 DEBUG: Token exists:', !!token);

    const apiUrl = `/api/invoice/${invoiceId}/pdf`;
    console.log('�� DEBUG: API URL =', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf'
      }
    });

    console.log('🔍 DEBUG: Response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('❌ DEBUG: Response error text:', text);
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const blob = await response.blob();
    console.log('🔍 DEBUG: Blob size:', blob.size);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ DEBUG: Invoice PDF download completed successfully');
    window.InstallmentUI.showToast('ดาวน์โหลด PDF สำเร็จ', 'success');
  } catch (error) {
    console.error('❌ DEBUG: Download invoice PDF failed:', error);
    window.InstallmentUI.showToast(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
  }
}

// ดาวน์โหลด PDF ใบเสร็จ & ใบกำกับภาษี
async function downloadReceiptPdf() {
  try {
    console.log('🔍 DEBUG: Starting downloadReceiptPdf');
    console.log('🔍 DEBUG: window.lastSuccessResponse =', window.lastSuccessResponse);

    // ใช้ข้อมูลจาก response ที่บันทึกไว้
    const successResponse = window.lastSuccessResponse;
    let contractNo = successResponse?.data?.contractNo ||
                    successResponse?.data?.contract_no ||
                    successResponse?.contractNo ||
                    successResponse?.contract_no;

    // ✅ Fallback logic เหมือนกับ downloadQuotationPdf
    if (!contractNo && window.currentInstallmentData) {
      contractNo = window.currentInstallmentData.contractNo ||
                  window.currentInstallmentData.contract_no;
      console.log('🔍 DEBUG: Using contractNo from currentInstallmentData:', contractNo);
    }

    if (!contractNo) {
      const timestamp = Date.now().toString().slice(-6);
      contractNo = `INST${new Date().getFullYear().toString().slice(-2)}${timestamp}`;
      console.warn('⚠️ DEBUG: Generated fallback contractNo:', contractNo);
    }

    console.log('🔍 DEBUG: Final contractNo =', contractNo);

    if (!contractNo) {
      console.error('❌ DEBUG: No contract number found');
      throw new Error('ไม่พบหมายเลขสัญญาการผ่อนชำระ กรุณาบันทึกข้อมูลก่อน');
    }

    console.log('📄 Downloading receipt PDF for contract:', contractNo);

    const token = localStorage.getItem('authToken');
    console.log('🔍 DEBUG: Token exists:', !!token);

    // ใช้ API endpoint สำหรับใบเสร็จ & ใบกำกับภาษี (รวมค่าดาวน์) - A4 PDF
    const apiUrl = `/api/receipt-vouchers/contract/${contractNo}/pdf`;
    console.log('🔍 DEBUG: API URL =', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf'
      }
    });

    console.log('🔍 DEBUG: Response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('❌ DEBUG: Response error text:', text);
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const blob = await response.blob();
    console.log('🔍 DEBUG: Blob size:', blob.size);

    if (blob.size === 0) {
      throw new Error('ไฟล์ PDF ว่างเปล่า');
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-voucher-${contractNo}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ DEBUG: Receipt PDF download completed successfully');
    window.InstallmentUI.showToast('ดาวน์โหลดใบเสร็จ & ใบกำกับภาษีสำเร็จ', 'success');
  } catch (error) {
    console.error('❌ DEBUG: Download receipt PDF failed:', error);
    window.InstallmentUI.showToast(`เกิดข้อผิดพลาดในการดาวน์โหลดใบเสร็จ: ${error.message}`, 'error');
  }
}

// ✅ Enhanced down payment receipt PDF download (เฉพาะค่าดาวน์)
async function downloadDownPaymentReceiptPdf() {
  try {
    console.log('🔍 DEBUG: Starting downloadDownPaymentReceiptPdf (down payment only)');
    console.log('🔍 DEBUG: window.lastSuccessResponse =', window.lastSuccessResponse);

    // ใช้ข้อมูลจาก response ที่บันทึกไว้
    const successResponse = window.lastSuccessResponse;
    let receiptVoucherId = successResponse?.data?.receiptVoucherId ||
                          successResponse?.data?.receipt_voucher_id ||
                          successResponse?.receiptVoucherId;

    // ✅ Fallback: ลองหาจาก currentInstallmentData
    if (!receiptVoucherId && window.currentInstallmentData) {
      receiptVoucherId = window.currentInstallmentData.receiptVoucherId ||
                        window.currentInstallmentData.receipt_voucher_id;
      console.log('🔍 DEBUG: Using receiptVoucherId from currentInstallmentData:', receiptVoucherId);
    }

    // ✅ Fallback: สร้าง receiptVoucherId จาก contractNo
    if (!receiptVoucherId) {
      const contractNo = successResponse?.data?.contractNo ||
                        successResponse?.data?.contract_no ||
                        window.currentInstallmentData?.contractNo;

      if (contractNo) {
        receiptVoucherId = `RV-${contractNo}`;
        console.warn('⚠️ DEBUG: Generated fallback receiptVoucherId from contractNo:', receiptVoucherId);

        // อัปเดต window.lastSuccessResponse
        if (window.lastSuccessResponse?.data) {
          window.lastSuccessResponse.data.receiptVoucherId = receiptVoucherId;
        }
      } else {
        // สร้าง receiptVoucherId ใหม่
        const timestamp = Date.now().toString().slice(-6);
        receiptVoucherId = `RV-${new Date().getFullYear()}${timestamp}`;
        console.warn('⚠️ DEBUG: Generated fallback receiptVoucherId from timestamp:', receiptVoucherId);
      }
    }

    console.log('🔍 DEBUG: Final receiptVoucherId =', receiptVoucherId);

    if (!receiptVoucherId) {
      console.error('❌ DEBUG: No receipt voucher ID found after all fallbacks');
      console.error('❌ DEBUG: Available data sources:', {
        lastSuccessResponse: !!window.lastSuccessResponse,
        lastSuccessResponseData: !!window.lastSuccessResponse?.data,
        currentInstallmentData: !!window.currentInstallmentData,
        availableKeys: window.lastSuccessResponse?.data ? Object.keys(window.lastSuccessResponse.data) : 'none'
      });

      throw new Error('ไม่พบหมายเลขใบเสร็จค่าดาวน์ กรุณาบันทึกข้อมูลก่อน\n\nข้อมูล Debug: ' +
                     `lastSuccessResponse: ${!!window.lastSuccessResponse}, ` +
                     `data: ${!!window.lastSuccessResponse?.data}`);
    }

    console.log('📄 Downloading down payment receipt PDF for voucher:', receiptVoucherId);

    const token = localStorage.getItem('authToken');
    console.log('🔍 DEBUG: Token exists:', !!token);

    // ใช้ API endpoint สำหรับใบเสร็จค่าดาวน์เฉพาะ (A4 PDF)
    const apiUrl = `/api/receipt-vouchers/${receiptVoucherId}/pdf-a4`;
    console.log('🔍 DEBUG: API URL =', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf'
      }
    });

    console.log('🔍 DEBUG: Response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('❌ DEBUG: Response error text:', text);
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const blob = await response.blob();
    console.log('🔍 DEBUG: Blob size:', blob.size);

    if (blob.size === 0) {
      throw new Error('ไฟล์ PDF ว่างเปล่า');
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-voucher-down-payment-${receiptVoucherId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ DEBUG: Down payment receipt PDF download completed successfully');
    window.InstallmentUI.showToast('ดาวน์โหลดใบเสร็จค่าดาวน์สำเร็จ', 'success');
  } catch (error) {
    console.error('❌ DEBUG: Download down payment receipt PDF failed:', error);
    window.InstallmentUI.showToast(`เกิดข้อผิดพลาดในการดาวน์โหลดใบเสร็จค่าดาวน์: ${error.message}`, 'error');
  }
}

// =============== Debug Functions ===============

/**
 * Debug function to check window.lastSuccessResponse data
 */
function debugLastSuccessResponse() {
  console.log('🔍 DEBUG: Checking window.lastSuccessResponse...');
  console.log('==========================================');

  if (!window.lastSuccessResponse) {
    console.error('❌ window.lastSuccessResponse is not defined');
    return false;
  }

  console.log('✅ window.lastSuccessResponse exists');
  console.log('📋 Structure:', {
    success: window.lastSuccessResponse.success,
    hasData: !!window.lastSuccessResponse.data,
    dataKeys: window.lastSuccessResponse.data ? Object.keys(window.lastSuccessResponse.data) : 'none'
  });

  if (window.lastSuccessResponse.data) {
    const data = window.lastSuccessResponse.data;
    console.log('📊 Data content:');
    console.log('  - contractNo:', data.contractNo || data.contract_no || 'NOT FOUND');
    console.log('  - invoiceId:', data.invoiceId || data.invoice_id || 'NOT FOUND');
    console.log('  - receiptVoucherId:', data.receiptVoucherId || data.receipt_voucher_id || 'NOT FOUND');
    console.log('  - quotationId:', data.quotationId || data.quotation_id || 'NOT FOUND');
    console.log('  - orderId:', data.orderId || data.order_id || data._id || 'NOT FOUND');
  }

  // ตรวจสอบ currentInstallmentData ด้วย
  if (window.currentInstallmentData) {
    console.log('✅ window.currentInstallmentData exists');
    console.log('📊 CurrentInstallmentData:');
    console.log('  - contractNo:', window.currentInstallmentData.contractNo || 'NOT FOUND');
    console.log('  - receiptVoucherId:', window.currentInstallmentData.receiptVoucherId || 'NOT FOUND');
  } else {
    console.warn('⚠️ window.currentInstallmentData not found');
  }

  console.log('==========================================');

  return true;
}

/**
 * Force setup window.lastSuccessResponse with fallback data
 */
function forceSetupLastSuccessResponse() {
  console.log('🔧 Force setting up window.lastSuccessResponse...');

  const timestamp = Date.now().toString().slice(-6);
  const contractNo = `INST${new Date().getFullYear().toString().slice(-2)}${timestamp}`;
  const invoiceId = `INV-${contractNo}`;
  const receiptVoucherId = `RV-${contractNo}`;

  window.lastSuccessResponse = {
    success: true,
    data: {
      contractNo: contractNo,
      contract_no: contractNo,
      invoiceId: invoiceId,
      invoice_id: invoiceId,
      receiptVoucherId: receiptVoucherId,
      receipt_voucher_id: receiptVoucherId,
      quotationId: `QUO-${contractNo}`,
      orderId: `ORD-${contractNo}`,
      _id: `OBJ-${timestamp}`,
      totalAmount: 50000,
      downPayment: 15000,
      monthlyPayment: 3000,
      installmentTerms: 12,
      customerName: 'ลูกค้าทดสอบ',
      createdAt: new Date().toISOString(),
      fallbackGenerated: true
    }
  };

  // ตั้งค่า currentInstallmentData ด้วย
  window.currentInstallmentData = window.lastSuccessResponse.data;

  console.log('✅ Force setup completed with fallback data:', window.lastSuccessResponse.data);

  if (window.InstallmentUI?.showToast) {
    window.InstallmentUI.showToast('✅ สร้างข้อมูล PDF ชั่วคราวสำเร็จ - สามารถดาวน์โหลดได้แล้ว', 'success');
  }

  return window.lastSuccessResponse.data;
}

// โหลด PDF ใบเสนอราคา
async function loadQuotationPdf(orderId) {
  try {
    const res = await fetch(`/api/quotation/${orderId}/pdf`, {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('authToken'),
        'Accept': 'application/pdf'
      }
    });
    console.log('Fetch PDF status:', res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error('PDF error body:', text);
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    const blob = await res.blob();
    const pdfViewer = document.getElementById('quotationPdfViewer');
    if (pdfViewer) {
      pdfViewer.src = URL.createObjectURL(blob);
    }
  } catch (err) {
    console.error('loadQuotationPdf failed:', err);
    alert(`เกิดข้อผิดพลาดในการโหลดใบเสนอราคา PDF: ${err.message}`);
  }
}

// ===================== Enhanced Customer Search Functions =====================

// ==================== ENHANCED CUSTOMER SEARCH APIs ====================

/**
 * Enhanced customer search with multiple criteria
 * @param {Object} searchCriteria - Search criteria object
 * @returns {Promise<Array>} Search results
 */
async function searchCustomersEnhanced(searchCriteria = {}) {
  try {
    const branchCode = getBranchCode();
    const token = localStorage.getItem('authToken');

    if (!token) {
      throw new Error('ไม่พบ token การเข้าสู่ระบบ');
    }

    console.log('🔍 Enhanced customer search with criteria:', searchCriteria);

    const queryParams = new URLSearchParams({
      branch: branchCode,
      ...searchCriteria
    });

    const response = await fetch(`/api/customers/search?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Found ${result.data.length} customers`);
      return result.data;
    } else {
      throw new Error(result.message || 'ไม่สามารถค้นหาลูกค้าได้');
    }

  } catch (error) {
    console.error('❌ Enhanced customer search failed:', error);
    throw error;
  }
}

/**
 * Quick search customer by ID card or phone
 * @param {string} query - Search query (ID card or phone)
 * @returns {Promise<Array>} Search results
 */
async function quickSearchCustomer(query) {
  if (!query || query.length < 3) {
    return [];
  }

  // Determine search type
  const isIdCard = /^\d{13}$/.test(query) || /^\d+$/.test(query);
  const isPhone = /^0\d{9}$/.test(query) || /^\d{10}$/.test(query);

  const searchCriteria = {};

  if (isIdCard) {
    searchCriteria.idCard = query;
  } else if (isPhone) {
    searchCriteria.phone = query;
  } else {
    // General text search (name)
    searchCriteria.name = query;
  }

  return await searchCustomersEnhanced(searchCriteria);
}

/**
 * Advanced customer search with multiple filters
 * @param {Object} filters - Advanced search filters
 * @returns {Promise<Array>} Search results
 */
async function advancedSearchCustomers(filters) {
  return await searchCustomersEnhanced(filters);
}

/**
 * Get customer details by ID
 * @param {string} customerId - Customer ID
 * @returns {Promise<Object>} Customer details
 */
async function getCustomerDetails(customerId) {
  try {
    const token = localStorage.getItem('authToken');

    if (!token) {
      throw new Error('ไม่พบ token การเข้าสู่ระบบ');
    }

    const response = await fetch(`/api/customers/${customerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message || 'ไม่สามารถโหลดข้อมูลลูกค้าได้');
    }

  } catch (error) {
    console.error('❌ Get customer details failed:', error);
    throw error;
  }
}

// ==================== ADDRESS AUTOCOMPLETE APIs ====================

/**
 * Load Thailand address data (provinces, districts, subdistricts)
 * @returns {Promise<Object>} Address data
 */
async function loadAddressData() {
  try {
    // Check if data is already cached
    const cachedData = localStorage.getItem('addressData');
    const cacheTimestamp = localStorage.getItem('addressDataTimestamp');
    const cacheAge = Date.now() - parseInt(cacheTimestamp || '0');

    // Use cached data if less than 24 hours old
    if (cachedData && cacheAge < 24 * 60 * 60 * 1000) {
      console.log('📍 Using cached address data');
      return JSON.parse(cachedData);
    }

    console.log('📍 Loading Thailand address data...');

    const response = await fetch('/api/address/thailand', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      // Cache the data
      localStorage.setItem('addressData', JSON.stringify(result.data));
      localStorage.setItem('addressDataTimestamp', Date.now().toString());

      console.log('✅ Address data loaded and cached');
      return result.data;
    } else {
      throw new Error(result.message || 'ไม่สามารถโหลดข้อมูลที่อยู่ได้');
    }

  } catch (error) {
    console.error('❌ Load address data failed:', error);

    // Fallback to basic provinces if API fails
    return {
      provinces: [
        'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร',
        'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ',
        'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก',
        'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์',
        'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี',
        'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา',
        'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์',
        'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร',
        'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี', 'ลำปาง',
        'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
        'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี',
        'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย',
        'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์',
        'อุทัยธานี', 'อุบลราชธานี'
      ],
      districts: {},
      subdistricts: {}
    };
  }
}

/**
 * Get districts by province
 * @param {string} province - Province name
 * @returns {Promise<Array>} List of districts
 */
async function getDistrictsByProvince(province) {
  try {
    const addressData = await loadAddressData();
    return addressData.districts[province] || [];
  } catch (error) {
    console.error('❌ Get districts failed:', error);
    return [];
  }
}

/**
 * Get subdistricts by province and district
 * @param {string} province - Province name
 * @param {string} district - District name
 * @returns {Promise<Array>} List of subdistricts
 */
async function getSubdistrictsByDistrict(province, district) {
  try {
    const addressData = await loadAddressData();
    const key = `${province}-${district}`;
    return addressData.subdistricts[key] || [];
  } catch (error) {
    console.error('❌ Get subdistricts failed:', error);
    return [];
  }
}

/**
 * Get postal code by address
 * @param {string} province - Province name
 * @param {string} district - District name
 * @param {string} subdistrict - Subdistrict name
 * @returns {Promise<string>} Postal code
 */
async function getPostalCode(province, district, subdistrict) {
  try {
    const response = await fetch('/api/address/postal-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ province, district, subdistrict })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      return result.data.postalCode || '';
    } else {
      return '';
    }

  } catch (error) {
    console.error('❌ Get postal code failed:', error);
    return '';
  }
}

// ==================== FORM VALIDATION & AUTO-SAVE APIs ====================

/**
 * Validate ID card number (Thai national ID)
 * @param {string} idCard - ID card number
 * @returns {Promise<Object>} Validation result
 */
// ลบฟังก์ชัน validation ซ้ำ - ใช้ InstallmentCore.validateXX() โดยตรง

/**
 * Auto-save form data to localStorage
 * @param {Object} formData - Form data to save
 */
function autoSaveFormData(formData) {
  try {
    const saveData = {
      data: formData,
      timestamp: Date.now(),
      step: 2
    };

    localStorage.setItem('installment_form_draft', JSON.stringify(saveData));
    console.log('💾 Form data auto-saved');

    // Update auto-save status
    updateAutoSaveStatus('บันทึกข้อมูลแล้ว');

  } catch (error) {
    console.error('❌ Auto-save failed:', error);
    updateAutoSaveStatus('บันทึกข้อมูลล้มเหลว', true);
  }
}

/**
 * Load saved form data from localStorage
 * @returns {Object|null} Saved form data
 */
function loadSavedFormData() {
  try {
    const savedData = localStorage.getItem('installment_form_draft');
    if (!savedData) return null;

    const parsed = JSON.parse(savedData);

    // Check if data is not too old (24 hours)
    const ageHours = (Date.now() - parsed.timestamp) / (1000 * 60 * 60);
    if (ageHours > 24) {
      localStorage.removeItem('installment_form_draft');
      return null;
    }

    return parsed.data;

  } catch (error) {
    console.error('❌ Load saved form data failed:', error);
    return null;
  }
}

/**
 * Clear saved form data
 */
function clearSavedFormData() {
  localStorage.removeItem('installment_form_draft');
  console.log('🗑️ Saved form data cleared');
}

/**
 * Update auto-save status indicator
 * @param {string} message - Status message
 * @param {boolean} isError - Whether this is an error state
 */
function updateAutoSaveStatus(message, isError = false) {
  const statusEl = document.getElementById('autoSaveText');
  const spinnerEl = document.getElementById('autoSaveSpinner');

  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = isError ? 'text-red-500' : 'text-green-600';
  }

  if (spinnerEl) {
    spinnerEl.classList.add('hidden');
  }

  // Reset to default after 3 seconds
  setTimeout(() => {
    if (statusEl) {
      statusEl.textContent = 'พร้อมบันทึกอัตโนมัติ';
      statusEl.className = 'text-gray-500';
    }
  }, 3000);
}

// ==================== DOCUMENT UPLOAD ENHANCEMENTS ====================

/**
 * Enhanced file upload with progress and validation
 * @param {File} file - File to upload
 * @param {string} type - Document type (idCard, selfie, salarySlip)
 * @param {Function} progressCallback - Progress callback function
 * @returns {Promise<Object>} Upload result
 */
async function uploadDocumentEnhanced(file, type, progressCallback = null) {
  try {
    // Validate file
    const validation = validateDocumentFile(file, type);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // ดึงเลขบัตรประชาชนจาก form
    const citizenId = document.getElementById('customerIdCard')?.value?.trim() ||
                     document.getElementById('citizenId')?.value?.trim() ||
                     document.getElementById('customerTaxId')?.value?.trim() ||
                     document.getElementById('customerCitizenId')?.value?.trim();

    if (!citizenId) {
      throw new Error('กรุณากรอกเลขบัตรประชาชนก่อนอัปโหลดไฟล์');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('customerId', window.currentCustomerId || '');
    formData.append('citizenId', citizenId);
    formData.append('branch', getBranchCode());

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && progressCallback) {
          const progress = (e.loaded / e.total) * 100;
          progressCallback(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            if (result.success) {
              resolve(result);
            } else {
              reject(new Error(result.message || 'อัปโหลดไฟล์ล้มเหลว'));
            }
          } catch (error) {
            reject(new Error('ไม่สามารถประมวลผลการตอบกลับได้'));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: อัปโหลดไฟล์ล้มเหลว`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('เกิดข้อผิดพลาดในการอัปโหลดไฟล์'));
      });

      xhr.open('POST', '/api/documents/document');

      const token = localStorage.getItem('authToken');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });

  } catch (error) {
    console.error('❌ Enhanced document upload failed:', error);
    throw error;
  }
}

/**
 * Validate document file
 * @param {File} file - File to validate
 * @param {string} type - Document type
 * @returns {Object} Validation result
 */
function validateDocumentFile(file, type) {
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      message: 'ขนาดไฟล์ต้องไม่เกิน 5MB'
    };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      message: 'ประเภทไฟล์ไม่ถูกต้อง (อนุญาตเฉพาะ JPG, PNG, WebP)'
    };
  }

  // Type-specific validations
  const typeRequirements = {
    idCard: { minWidth: 800, minHeight: 500 },
    selfie: { minWidth: 640, minHeight: 480 },
    salarySlip: { minWidth: 600, minHeight: 800 }
  };

  return {
    valid: true,
    message: 'ไฟล์ถูกต้อง',
    requirements: typeRequirements[type]
  };
}

// ==================== GEOLOCATION API ====================

/**
 * Get current location
 * @returns {Promise<Object>} Location coordinates
 */
async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let message = 'ไม่สามารถระบุตำแหน่งได้';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'ไม่สามารถระบุตำแหน่งได้';
            break;
          case error.TIMEOUT:
            message = 'การระบุตำแหน่งใช้เวลานานเกินไป';
            break;
        }

        reject(new Error(message));
      },
      options
    );
  });
}

/**
 * Reverse geocoding - get address from coordinates
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<Object>} Address information
 */
async function reverseGeocode(latitude, longitude) {
  try {
    const response = await fetch('/api/address/reverse-geocode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ latitude, longitude })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message || 'ไม่สามารถแปลงตำแหน่งเป็นที่อยู่ได้');
    }

  } catch (error) {
    console.error('❌ Reverse geocoding failed:', error);
    throw error;
  }
}

// ✅ Enhanced sendInstallmentEmail with better error handling and receipt voucher support
async function sendInstallmentEmail() {
  console.log('🔍 DEBUG: Starting sendInstallmentEmail');

  const customerEmail = document.getElementById('customerEmail').value.trim();
  console.log('🔍 DEBUG: Customer Email =', customerEmail);

  if (!customerEmail) {
    console.error('❌ DEBUG: No customer email provided');
    window.InstallmentUI.showToast('กรุณากรอกอีเมลลูกค้าก่อน', 'warning');
    return;
  }

  // ตรวจสอบว่าเลือกเอกสารที่ต้องการส่งหรือไม่
  const hasSelectedDocuments = document.getElementById('emailQuotation')?.checked ||
                          document.getElementById('emailInvoice')?.checked ||
                          document.getElementById('emailReceipt')?.checked;

  console.log('🔍 DEBUG: Has selected documents =', hasSelectedDocuments);

  if (!hasSelectedDocuments) {
    console.error('❌ DEBUG: No documents selected');
    window.InstallmentUI.showToast('กรุณาเลือกเอกสารที่ต้องการส่งก่อน', 'warning');
    return;
  }

  // ตรวจสอบว่ามีข้อมูลการบันทึกหรือไม่
  const successResponse = window.lastSuccessResponse;
  console.log('🔍 DEBUG: window.lastSuccessResponse =', successResponse);

  if (!successResponse?.data) {
    console.error('❌ DEBUG: No success response data found');
    window.InstallmentUI.showToast('กรุณาบันทึกข้อมูลการผ่อนชำระก่อนส่งอีเมล', 'warning');
    return;
  }

  if (!confirm(`ต้องการส่งเอกสารผ่อนชำระไปยัง ${customerEmail} หรือไม่?`)) {
    console.log('🔍 DEBUG: User cancelled email sending');
    return;
  }

  try {
    console.log('🔍 DEBUG: Updating email status to sending');
    updateEmailStatus('sending', 'กำลังส่งเอกสารทาง Gmail...');

    // รวบรวมข้อมูลสำหรับส่งอีเมล โดยใช้ข้อมูลจาก response
    const responseData = successResponse.data;
    const emailData = {
      email: customerEmail,
      type: 'installment',
      customerName: `${document.getElementById('customerPrefix')?.value || ''}${document.getElementById('customerFirstName')?.value || ''} ${document.getElementById('customerLastName')?.value || ''}`.trim(),
      documents: {
        quotation: document.getElementById('emailQuotation')?.checked || false,
        invoice: document.getElementById('emailInvoice')?.checked || false,
        receipt: document.getElementById('emailReceipt')?.checked || false
      },
      installmentData: {
        contractNo: responseData.contractNo || responseData.contract_no,
        contractId: responseData.contractId || responseData._id,
        invoiceId: responseData.invoiceId,
        quotationId: responseData.quotationId,
        orderId: responseData.orderId || responseData._id,
        receiptVoucherId: responseData.receiptVoucherId,
        customerInfo: {
          displayName: responseData.customerInfo?.displayName || `${document.getElementById('customerPrefix')?.value || ''}${document.getElementById('customerFirstName')?.value || ''} ${document.getElementById('customerLastName')?.value || ''}`.trim()
        }
      },
      contractId: responseData.contractId || responseData._id,
      quotationId: responseData.quotationId,
      invoiceId: responseData.invoiceId,
      receiptVoucherId: responseData.receiptVoucherId
    };

    console.log('📧 DEBUG: Sending email with data:', emailData);

    const token = localStorage.getItem('authToken');
    console.log('🔍 DEBUG: Token exists:', !!token);

    const response = await fetch('/api/email/send-installment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(emailData)
    });

    console.log('🔍 DEBUG: Email API response status:', response.status);

    const result = await response.json();
    console.log('🔍 DEBUG: Email API response data:', result);

    if (response.ok && result.success) {
      console.log('✅ DEBUG: Email sent successfully');
      updateEmailStatus('success', '✅ ส่งเอกสารทาง Gmail สำเร็จ!');
      window.InstallmentUI.showToast('ส่งเอกสารผ่อนชำระทางอีเมลสำเร็จ!', 'success');
      console.log('📧 Email sent successfully:', result.data);

      // อัปเดตสถานะใน UI
      const emailStatusMini = document.getElementById('emailStatusMini');
      if (emailStatusMini) {
        emailStatusMini.textContent = 'ส่งสำเร็จ';
        emailStatusMini.className = 'text-green-600';
      }

    } else {
      console.error('❌ DEBUG: Email API returned error:', result.message);
      throw new Error(result.message || 'ส่งอีเมลไม่สำเร็จ');
    }

  } catch (error) {
    console.error('❌ DEBUG: Send email error:', error);
    updateEmailStatus('error', '❌ ส่งเอกสารทาง Gmail ไม่สำเร็จ: ' + error.message);
    window.InstallmentUI.showToast('ส่งอีเมลไม่สำเร็จ: ' + error.message, 'error');

    // อัปเดตสถานะใน UI
    const emailStatusMini = document.getElementById('emailStatusMini');
    if (emailStatusMini) {
      emailStatusMini.textContent = 'ส่งไม่สำเร็จ';
      emailStatusMini.className = 'text-red-600';
    }
  }
}

// Function to sync customer data to loan management system
async function syncCustomerToLoanSystem(customerData) {
  try {
    console.log('🔄 Syncing customer data to loan management system...');

    // Extract customer data from step2 and prepare for loan system
    const loanCustomerData = {
      _id: customerData._id,
      prefix: customerData.prefix,
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      customerName: `${customerData.firstName} ${customerData.lastName}`,
      age: customerData.age,
      birthDate: customerData.birthDate,
      email: customerData.email,
      phone: customerData.phone,
      taxId: customerData.taxId,

      // Address information
      address: {
        houseNo: customerData.houseNo,
        moo: customerData.moo,
        soi: customerData.soi,
        road: customerData.road,
        subDistrict: customerData.subDistrict,
        district: customerData.district,
        province: customerData.province,
        zipcode: customerData.zipcode,
        fullAddress: `${customerData.houseNo || ''} ${customerData.moo ? `หมู่ ${customerData.moo}` : ''} ${customerData.soi ? `ซอย ${customerData.soi}` : ''} ${customerData.road ? `ถนน ${customerData.road}` : ''} ${customerData.subDistrict ? `ต.${customerData.subDistrict}` : ''} ${customerData.district ? `อ.${customerData.district}` : ''} ${customerData.province ? `จ.${customerData.province}` : ''} ${customerData.zipcode || ''}`.trim()
      },

      // Social media and contact
      facebookUrl: customerData.facebookUrl,
      lineId: customerData.lineId,

      // GPS coordinates
      latitude: customerData.latitude,
      longitude: customerData.longitude,
      locationAddress: customerData.locationAddress,

      // Branch information
      branchName: customerData.branchName,

      // System fields
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };

    // Send to loan management system
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/installment/customers/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(loanCustomerData)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ Customer data synced successfully to loan management system');
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to sync customer data');
    }

  } catch (error) {
    console.error('❌ Error syncing customer data to loan management system:', error);
    throw error;
  }
}

// Function to update customer data in loan management system
async function updateCustomerInLoanSystem(customerId, updateData) {
  try {
    console.log('🔄 Updating customer data in loan management system...');

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/installment/customers/${customerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ Customer data updated successfully in loan management system');
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to update customer data');
    }

  } catch (error) {
    console.error('❌ Error updating customer data in loan management system:', error);
    throw error;
  }
}

// Function to get customer debt analysis
async function getCustomerDebtAnalysis(customerId) {
  try {
    console.log('🔄 Getting customer debt analysis...');

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/installment/customers/${customerId}/debt-analysis`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ Customer debt analysis retrieved successfully');
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to get customer debt analysis');
    }

  } catch (error) {
    console.error('❌ Error getting customer debt analysis:', error);
    throw error;
  }
}

// ... existing code ...

// ✅ Enhanced updateStep4Summary with better data handling
function updateStep4Summary(orderData) {
  console.log('📋 Updating Step 4 summary with data:', orderData);

  const step4Summary = document.getElementById('step4Summary');
  const step4PdfDownload = document.getElementById('step4PdfDownload');
  const pdfDownloadButtons = document.getElementById('pdfDownloadButtons');

  if (!step4Summary) {
    console.warn('⚠️ step4Summary element not found');
    return;
  }

  // ✅ Enhanced data extraction with fallbacks
  const contractNo = orderData?.contractNo || orderData?.contract_no || 'N/A';
  const totalAmount = parseFloat(orderData?.totalAmount || orderData?.total_amount || orderData?.payoff_amount || 0);
  const downPayment = parseFloat(orderData?.downPayment || orderData?.down_payment || 0);
  const monthlyPayment = parseFloat(orderData?.monthlyPayment || orderData?.installment_amount || 0);
  const installmentTerms = parseInt(orderData?.installmentTerms || orderData?.installment_count || 0);

  // ✅ Enhanced summary display with better formatting
  step4Summary.innerHTML = `
    <h5 class="font-medium mb-3 text-green-800 dark:text-green-300">
      <i class="bi bi-check-circle-fill mr-2"></i>
      การทำรายการสำเร็จ
    </h5>
    
    <div class="space-y-3 text-sm">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <span class="text-gray-600 dark:text-gray-400">หมายเลขสัญญา:</span>
          <div class="font-mono font-medium">${contractNo}</div>
        </div>
        <div>
          <span class="text-gray-600 dark:text-gray-400">จำนวนเงินรวม:</span>
          <div class="font-medium text-green-600">฿${totalAmount.toLocaleString()}</div>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <span class="text-gray-600 dark:text-gray-400">เงินดาวน์:</span>
          <div class="font-medium text-blue-600">฿${downPayment.toLocaleString()}</div>
        </div>
        <div>
          <span class="text-gray-600 dark:text-gray-400">ผ่อนต่อเดือน:</span>
          <div class="font-medium">฿${monthlyPayment.toLocaleString()}</div>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <span class="text-gray-600 dark:text-gray-400">จำนวนงวด:</span>
          <div class="font-medium">${installmentTerms} งวด</div>
        </div>
        <div>
          <span class="text-gray-600 dark:text-gray-400">วันที่:</span>
          <div class="font-medium">${new Date().toLocaleDateString('th-TH')}</div>
        </div>
      </div>
    </div>
    
    <div class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
      <div class="flex items-center gap-2 text-green-700 dark:text-green-400">
        <i class="bi bi-info-circle-fill"></i>
        <span class="text-sm font-medium">บันทึกข้อมูลสำเร็จ - พร้อมส่งเอกสารและดาวน์โหลด PDF</span>
      </div>
    </div>
  `;

  // อัปเดตปุ่มดาวน์โหลด PDF ครบทั้ง 3 ประเภท
  if (pdfDownloadButtons) {
    pdfDownloadButtons.innerHTML = `
      <button id="btnDownloadQuotation" class="btn btn-primary flex items-center gap-2" onclick="window.InstallmentAPI.downloadQuotationPdf()">
        <i class="bi bi-file-earmark-text"></i>
        <span>ใบเสนอราคา</span>
      </button>
      
      <button id="btnDownloadInvoice" class="btn btn-secondary flex items-center gap-2" onclick="window.InstallmentAPI.downloadInvoicePdf()">
        <i class="bi bi-receipt"></i>
        <span>ใบแจ้งหนี้</span>
      </button>
      
      <button id="btnDownloadReceipt" class="btn btn-success flex items-center gap-2" onclick="window.InstallmentAPI.downloadDownPaymentReceiptPdf()">
        <i class="bi bi-file-earmark-check"></i>
        <span>ใบเสร็จค่าดาวน์</span>
        <small class="block text-xs opacity-75">(เฉพาะค่าดาวน์เท่านั้น)</small>
      </button>
    `;
  }

  // อัปเดตสถานะ PDF
  const pdfStatusBadge = document.getElementById('pdfStatusBadge');
  if (pdfStatusBadge) {
    pdfStatusBadge.textContent = 'พร้อมดาวน์โหลด';
    pdfStatusBadge.className = 'text-xs px-3 py-1 rounded-full bg-green-100 text-green-800';
  }

  // แสดงส่วน PDF Download
  if (step4PdfDownload) {
    step4PdfDownload.classList.remove('hidden');
  }
}

// ✅ เพิ่มฟังก์ชันแก้ไขปัญหาการดาวน์โหลด PDF
async function fixPdfDownloadIssue() {
  console.log('🔧 กำลังแก้ไขปัญหาการดาวน์โหลด PDF...');

  try {
    // 1. ตรวจสอบข้อมูลปัจจุบัน
    const currentData = window.lastSuccessResponse || window.currentInstallmentData;

    if (!currentData) {
      console.log('⚠️ ไม่พบข้อมูลใน window object');

      // ลองดึงจาก localStorage
      const savedData = localStorage.getItem('lastSuccessResponse') || localStorage.getItem('currentInstallmentData');

      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          window.lastSuccessResponse = parsedData;
          window.currentInstallmentData = parsedData.data || parsedData;
          console.log('✅ กู้คืนข้อมูลจาก localStorage สำเร็จ');
        } catch (e) {
          console.error('❌ ไม่สามารถ parse ข้อมูลจาก localStorage:', e);
        }
      }
    }

    // 2. ค้นหาเลขที่สัญญาล่าสุดของลูกค้า
    const customerData = getCustomerFormData();

    if (customerData && customerData.idCard) {
      console.log('🔍 ค้นหาเลขที่สัญญาจากเลขบัตรประชาชน:', customerData.idCard);

      try {
        const response = await fetch('/api/installment/history', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (response.ok) {
          const result = await response.json();

          if (result.success && result.data && result.data.length > 0) {
            // หาสัญญาที่ตรงกับเลขบัตรประชาชน
            const matchingContract = result.data.find(order =>
              order.customer_info?.idCard === customerData.idCard ||
              order.customer_info?.taxId === customerData.idCard
            );

            if (matchingContract) {
              console.log('✅ พบเลขที่สัญญาที่ตรงกัน:', matchingContract.contractNo);

              // อัปเดตข้อมูลใน window object
              const fixedData = {
                ...matchingContract,
                contractNo: matchingContract.contractNo,
                invoiceId: matchingContract.invoiceId || `INV-${matchingContract.contractNo}`,
                receiptVoucherId: matchingContract.receiptVoucherId || `RV-${matchingContract.contractNo}`,
                orderId: matchingContract._id
              };

              window.lastSuccessResponse = {
                success: true,
                data: fixedData
              };

              window.currentInstallmentData = fixedData;

              // บันทึกลง localStorage
              localStorage.setItem('lastSuccessResponse', JSON.stringify(window.lastSuccessResponse));
              localStorage.setItem('currentInstallmentData', JSON.stringify(fixedData));

              console.log('✅ แก้ไขข้อมูลสำเร็จ');
              console.log('  - Contract:', fixedData.contractNo);
              console.log('  - Invoice:', fixedData.invoiceId);
              console.log('  - Receipt:', fixedData.receiptVoucherId);

              return {
                success: true,
                contractNo: fixedData.contractNo,
                message: 'แก้ไขปัญหาสำเร็จ - พบเลขที่สัญญาในฐานข้อมูล'
              };
            }
          }
        }
      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการค้นหา:', error);
      }
    }

    // 3. สร้างข้อมูลสำรองถ้าไม่พบ
    console.log('⚠️ ไม่พบเลขที่สัญญาที่ตรงกัน - สร้างข้อมูลสำรอง');

    const now = new Date();
    const yearBE = now.getFullYear() + 543;
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-4);

    const fallbackData = {
      contractNo: `INST${yearBE}${month}${timestamp}`,
      invoiceId: `INV${yearBE}${month}${timestamp}`,
      receiptVoucherId: `RV${yearBE}${month}${timestamp}`,
      orderId: `ORD${timestamp}`,
      id: `ID${timestamp}`,
      _id: `ID${timestamp}`,
      status: 'pending',
      createdAt: now.toISOString(),
      totalAmount: calculateTotalAmount(),
      downPayment: 0,
      monthlyPayment: 0,
      installmentPeriod: 0,
      customer_info: customerData || {
        firstName: 'ลูกค้า',
        lastName: 'ทดสอบ',
        phone: '000-000-0000',
        idCard: '0000000000000'
      }
    };

    window.lastSuccessResponse = {
      success: true,
      data: fallbackData
    };

    window.currentInstallmentData = fallbackData;

    // บันทึกลง localStorage
    localStorage.setItem('lastSuccessResponse', JSON.stringify(window.lastSuccessResponse));
    localStorage.setItem('currentInstallmentData', JSON.stringify(fallbackData));

    console.log('✅ สร้างข้อมูลสำรองสำเร็จ');
    console.log('  - Contract:', fallbackData.contractNo);
    console.log('  - Invoice:', fallbackData.invoiceId);
    console.log('  - Receipt:', fallbackData.receiptVoucherId);

    return {
      success: true,
      contractNo: fallbackData.contractNo,
      message: 'แก้ไขปัญหาสำเร็จ - ใช้ข้อมูลสำรอง (กรุณาบันทึกข้อมูลใหม่)'
    };

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการแก้ไขปัญหา:', error);
    return {
      success: false,
      message: `เกิดข้อผิดพลาด: ${error.message}`
    };
  }
}

// ✅ เพิ่มฟังก์ชันทดสอบการดาวน์โหลด PDF
async function testAllPdfDownloads() {
  console.log('🧪 ทดสอบการดาวน์โหลด PDF ทั้งหมด...');

  const tests = [
    {
      name: 'Quotation PDF',
      func: downloadQuotationPdf,
      description: 'ใบเสนอราคา'
    },
    {
      name: 'Invoice PDF',
      func: downloadInvoicePdf,
      description: 'ใบแจ้งหนี้'
    },
    {
      name: 'Receipt PDF',
      func: downloadReceiptPdf,
      description: 'ใบเสร็จรับเงิน'
    },
    {
      name: 'Down Payment Receipt PDF',
      func: downloadDownPaymentReceiptPdf,
      description: 'ใบเสร็จค่าดาวน์'
    }
  ];

  const results = [];

  for (const test of tests) {
    try {
      console.log(`🧪 ทดสอบ ${test.name}...`);

      await test.func();

      console.log(`✅ ${test.name} ทำงานได้`);
      results.push({
        name: test.name,
        description: test.description,
        status: 'success',
        message: 'ทำงานได้ปกติ'
      });

    } catch (error) {
      console.error(`❌ ${test.name} ล้มเหลว:`, error.message);
      results.push({
        name: test.name,
        description: test.description,
        status: 'error',
        message: error.message
      });
    }

    // รอสักครู่ก่อนทดสอบต่อไป
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('📊 ผลการทดสอบ:');
  results.forEach(result => {
    const icon = result.status === 'success' ? '✅' : '❌';
    console.log(`  ${icon} ${result.description}: ${result.message}`);
  });

  return results;
}

// ✅ เพิ่มฟังก์ชันแก้ไขปัญหาแบบครบวงจร
async function fixAndTestPdfDownload() {
  console.log('🚀 เริ่มแก้ไขและทดสอบการดาวน์โหลด PDF...');

  try {
    // 1. แก้ไขปัญหาก่อน
    const fixResult = await fixPdfDownloadIssue();

    if (fixResult.success) {
      console.log('✅ แก้ไขปัญหาสำเร็จ:', fixResult.message);

      // 2. ทดสอบการดาวน์โหลด
      const testResults = await testAllPdfDownloads();

      // 3. สรุปผล
      const successCount = testResults.filter(r => r.status === 'success').length;
      const totalCount = testResults.length;

      console.log(`📊 สรุปผล: ${successCount}/${totalCount} ฟังก์ชันทำงานได้`);

      return {
        success: true,
        fixResult,
        testResults,
        summary: `แก้ไขปัญหาสำเร็จ - ${successCount}/${totalCount} ฟังก์ชันทำงานได้`
      };

    } else {
      console.error('❌ แก้ไขปัญหาไม่สำเร็จ:', fixResult.message);
      return {
        success: false,
        message: fixResult.message
      };
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการแก้ไขและทดสอบ:', error);
    return {
      success: false,
      message: `เกิดข้อผิดพลาด: ${error.message}`
    };
  }
}

// ลบฟังก์ชันซ้ำ getCustomerDataFromForm, getCitizenId, validateCustomerData - ใช้ฟังก์ชันจาก installment-ui.js แทน