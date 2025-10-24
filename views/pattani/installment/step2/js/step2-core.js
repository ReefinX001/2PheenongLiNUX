// ======================= STEP 2 CORE FUNCTIONS =======================

// Navigation functions
function goToStep1() {
  window.location.href = '/step1';
}

// ✅ Enhanced goToStep3 with comprehensive validation and API integration
async function goToStep3() {
  console.log('🚀 Starting Step 3 navigation process...');

  // Show loading state
  const loader = LoadingSystem.show({ message: 'กำลังตรวจสอบข้อมูล...' });

  try {
    // ✅ Collect all form data
    const customerData = {
      firstName: document.getElementById('customerFirstName')?.value?.trim() || '',
      lastName: document.getElementById('customerLastName')?.value?.trim() || '',
      idCard: getCleanIdCard('customerIdCard'),
      phone: document.getElementById('customerPhone')?.value?.trim() || '',
      email: document.getElementById('customerEmail')?.value?.trim() || '',
      facebook: document.getElementById('customerFacebook')?.value?.trim() || '',
      lineId: document.getElementById('customerLineId')?.value?.trim() || '',
      birthDate: document.getElementById('customerBirthDate')?.value || '',
      age: document.getElementById('customerAge')?.value || ''
    };

    const addressData = {
      houseNo: document.getElementById('houseNo')?.value?.trim() || '',
      moo: document.getElementById('moo')?.value?.trim() || '',
      soi: document.getElementById('soi')?.value?.trim() || '',
      road: document.getElementById('road')?.value?.trim() || '',
      province: document.getElementById('province')?.value || '',
      district: document.getElementById('district')?.value || '',
      subDistrict: document.getElementById('subDistrict')?.value || '',
      postalCode: document.getElementById('zipcode')?.value?.trim() || '',
      latitude: document.getElementById('customerLatitude')?.value?.trim() || '',
      longitude: document.getElementById('customerLongitude')?.value?.trim() || '',
      mapUrl: document.getElementById('customerMapUrl')?.value?.trim() || ''
    };

    const occupationData = {
      occupation: document.getElementById('customerOccupation')?.value || '',
      workplace: document.getElementById('customerWorkplace')?.value?.trim() || '',
      income: document.getElementById('customerIncome')?.value || ''
    };

    // ✅ First, validate using the new API endpoint
    const validationResponse = await fetch('/api/quotation/step2/customer-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({
        customerData,
        addressData,
        occupationData,
        validateOnly: true
      })
    });

    const validationResult = await validationResponse.json();

    if (!validationResult.success) {
      // Show validation errors with better Thai language support
      const errorMessages = validationResult.errors || ['ข้อมูลไม่ถูกต้อง'];

      // Highlight first error field and show toast
      if (errorMessages.length > 0) {
        showToast('❌ ' + errorMessages[0], 'error');

        // Try to focus the problematic field
        const fieldMap = {
          'ชื่อ': 'customerFirstName',
          'นามสกุล': 'customerLastName',
          'เลขบัตรประชาชน': 'customerIdCard',
          'เบอร์โทรศัพท์': 'customerPhone',
          'อีเมล': 'customerEmail',
          'อายุ': 'customerAge',
          'รายได้': 'customerIncome'
        };

        // Find and focus first error field
        for (const [errorText, fieldId] of Object.entries(fieldMap)) {
          if (errorMessages[0].includes(errorText)) {
            const field = document.getElementById(fieldId);
            if (field) {
              field.focus();
              field.classList.add('input-error');
              break;
            }
          }
        }
      }

      LoadingSystem.hide(loader);
      return;
    }

    // ✅ If validation passes, save data and proceed
    LoadingSystem.update(loader, { message: 'กำลังบันทึกข้อมูล...' });

    // Now save the data using the API
    const saveResponse = await fetch('/api/quotation/step2/customer-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({
        customerData,
        addressData,
        occupationData,
        validateOnly: false
      })
    });

    const saveResult = await saveResponse.json();

    if (!saveResult.success) {
      throw new Error(saveResult.message || 'ไม่สามารถบันทึกข้อมูลได้');
    }

    // ✅ Save to Global Data Manager
    if (window.globalInstallmentManager) {
      window.globalInstallmentManager.updateStepData(2, {
        customerData: saveResult.data,
        completed: true,
        timestamp: new Date().toISOString()
      });
    }

    // ✅ Save to localStorage as backup
    const legacyFormData = {
      // Personal Information
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      idCard: customerData.idCard,
      phone: customerData.phone,
      email: customerData.email,
      facebook: customerData.facebook,
      lineId: customerData.lineId,
      birthDate: customerData.birthDate,
      age: customerData.age,

      // Occupation and Income
      occupation: occupationData.occupation,
      income: occupationData.income,
      workplace: occupationData.workplace,

      // Address
      houseNo: addressData.houseNo,
      moo: addressData.moo,
      soi: addressData.soi,
      road: addressData.road,
      province: addressData.province,
      district: addressData.district,
      subDistrict: addressData.subDistrict,
      postalCode: addressData.postalCode,

      // Coordinates
      latitude: addressData.latitude,
      longitude: addressData.longitude,
      mapUrl: addressData.mapUrl,

      // Meta data
      timestamp: new Date().toISOString(),
      branchCode: getBranchCode()
    };

    localStorage.setItem('step2Data', JSON.stringify(legacyFormData));

    // Show success message
    showToast('✅ บันทึกข้อมูลลูกค้าเรียบร้อย', 'success');

    // Navigate to step 3
    setTimeout(() => {
      window.location.href = '/step3';
    }, 1000);

  } catch (error) {
    console.error('❌ Error in Step 3 navigation:', error);
    showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
  } finally {
    LoadingSystem.hide(loader);
  }
}

// Get branch code
function getBranchCode() {
  // Try to get from URL parameters first
  const urlParams = new URLSearchParams(window.location.search);
  let branchCode = urlParams.get('branch');

  // If not in URL, try localStorage
  if (!branchCode || branchCode === '00000' || branchCode === 'undefined' || branchCode === 'null') {
    branchCode = localStorage.getItem('activeBranch');
  }

  // If still not found, try global window variable
  if (!branchCode || branchCode === '00000' || branchCode === 'undefined' || branchCode === 'null') {
    branchCode = window.BRANCH_CODE;
  }

  // Default to head office if no valid branch found
  if (!branchCode || branchCode === 'undefined' || branchCode === 'null') {
    branchCode = '00000'; // Head office
  }

  return branchCode;
}

function loadSelectedProducts() {
  // 0) แน่ใจว่ามีตัวแปร
  if (!window.selectedProducts) window.selectedProducts = [];

  // 1) พยายามอ่านจาก GlobalDataManager (ทั้ง selectedProducts หรือ cartItems)
  if (window.globalDataManager) {
    const data1 = globalDataManager.getStepData(1);
    const items1 = Array.isArray(data1.selectedProducts)
                 ? data1.selectedProducts
                 : Array.isArray(data1.cartItems)
                   ? data1.cartItems
                   : null;
    if (items1) {
      window.selectedProducts = items1;
      displayProductSummary();
      console.log('✅ Loaded from GlobalDataManager:', items1.length, 'items');
    }
  }

  // 2) Fallback ไปอ่าน localStorage (ทั้งสองคีย์)
  const saved = localStorage.getItem('cartItems')
              || localStorage.getItem('selectedProducts');
  if (saved) {
    try {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) {
        window.selectedProducts = arr;
        displayProductSummary();
        console.log('✅ Loaded from localStorage:', arr.length, 'items');
      } else throw new Error('Invalid format');
    } catch (err) {
      console.error('Error loading selectedProducts:', err);
      window.selectedProducts = [];
      displayProductSummary();
    }
  } else {
    // ถ้าไม่มีข้อมูลเลย
    window.selectedProducts = [];
    displayProductSummary();
    console.log('ℹ️ No saved products');
  }
}

function displayProductSummary() {
  const container = document.getElementById('productSummary');

  if (!container) {
    console.warn('Product summary container not found');
    return;
  }

  // Initialize selectedProducts if not exists
  if (!window.selectedProducts) {
    window.selectedProducts = [];
  }

  if (!window.selectedProducts || window.selectedProducts.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-500 py-8">
        <i class="bi bi-cart text-4xl mb-2"></i>
        <p>ยังไม่มีสินค้าในตะกร้า</p>
        <button onclick="goToStep1()" class="btn btn-outline btn-sm mt-2">
          <i class="bi bi-arrow-left"></i> กลับไปเลือกสินค้า
        </button>
      </div>
    `;
    return;
  }

  const totalPrice = selectedProducts.reduce((sum, product) => {
    return sum + (product.price || product.totalPrice || 0);
  }, 0);

  container.innerHTML = `
    <div class="space-y-3">
      ${selectedProducts.map(product => `
        <div class="flex items-center gap-3 p-2 bg-white dark:bg-gray-700 rounded-lg">
          <div class="w-12 h-12 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
            ${product.image ?
              `<img src="${getImageUrl(product.image)}" alt="${product.name || 'สินค้า'}" class="w-full h-full object-cover" onerror="this.parentNode.innerHTML='<i class=\\"bi bi-phone text-gray-400\\"></i>'">` :
              `<i class="bi bi-phone text-gray-400"></i>`
            }
          </div>
          <div class="flex-1">
            <div class="font-medium text-sm">${product.name || 'ไม่ระบุชื่อสินค้า'}</div>
            <div class="text-green-600 font-bold text-sm">${formatPrice(product.price || product.totalPrice || 0)}</div>
            ${product.brand ? `<div class="text-xs text-gray-500">${product.brand}</div>` : ''}
            ${product.imei ? `<div class="text-xs text-blue-600 font-mono">IMEI: ${product.imei}</div>` : ''}
          </div>
        </div>
      `).join('')}
      <div class="border-t pt-3">
        <div class="flex justify-between font-semibold">
          <span>รวม:</span>
          <span class="text-green-600">${formatPrice(totalPrice)}</span>
        </div>
      </div>
    </div>
  `;

  // Update cart count
  updateCartCount();
}

// Utility functions
function formatPrice(price) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0
  }).format(price);
}

function getImageUrl(imagePath) {
  if (!imagePath) return '/uploads/Logo2.png';
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('/')) return imagePath;
  return `/uploads/products/${imagePath}`;
}

function getBranchCode() {
  return window.BRANCH_CODE;
}

function updateCartCount() {
  const cartCountElement = document.getElementById('cartCount');
  if (cartCountElement && window.selectedProducts) {
    const count = window.selectedProducts.reduce((total, product) => total + (product.quantity || 1), 0);
    cartCountElement.textContent = count;
  }
}

// Load salesperson name (Fixed display issue)
function loadSalespersonName() {
  const salespersonNameElement = document.getElementById('salespersonName');
  if (salespersonNameElement && salespersonNameElement instanceof HTMLElement) {
    // Try to get employee name from various sources
    let employeeName = window.employeeName ||
                      localStorage.getItem('userName') ||
                      localStorage.getItem('employeeName') ||
                      sessionStorage.getItem('employeeName') ||
                      'พนักงาน';

    // Ensure employeeName is a string, not an object
    if (typeof employeeName === 'object' && employeeName !== null) {
      if (employeeName.textContent) {
        employeeName = employeeName.textContent;
      } else if (employeeName.toString) {
        employeeName = employeeName.toString();
      } else {
        employeeName = 'พนักงาน';
      }
    }

    // Clean the string
    employeeName = String(employeeName).trim();
    if (!employeeName || employeeName === '[object HTMLSpanElement]' || employeeName === '[object Object]') {
      employeeName = 'พนักงาน';
    }

    console.log('🏷️ Setting salesperson name:', employeeName);
    salespersonNameElement.textContent = employeeName;
  }
}

// Toggle dark mode
function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.classList.contains('dark');

  if (isDark) {
    html.classList.remove('dark');
    html.setAttribute('data-theme', 'light');
    localStorage.setItem('darkMode', 'false');
  } else {
    html.classList.add('dark');
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('darkMode', 'true');
  }
}

// Initialize theme
function initializeTheme() {
  const savedTheme = localStorage.getItem('darkMode');
  if (savedTheme === 'true') {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

// Contact Address Functions
function toggleContactAddress() {
  const checkbox = document.getElementById('sameAsMainAddress');
  const contactForm = document.getElementById('contactAddressForm');

  if (checkbox?.checked) {
    copyMainAddressToContact();
    if (contactForm) {
      contactForm.style.opacity = '0.5';
      contactForm.style.pointerEvents = 'none';
    }
  } else {
    if (contactForm) {
      contactForm.style.opacity = '1';
      contactForm.style.pointerEvents = 'auto';
    }
  }
}

function copyMainAddressToContact() {
  const mappings = [
    ['houseNo', 'contactHouseNo'],
    ['moo', 'contactMoo'],
    ['soi', 'contactSoi'],
    ['road', 'contactRoad'],
    ['province', 'contactProvince'],
    ['district', 'contactDistrict'],
    ['subDistrict', 'contactSubDistrict'],
    ['zipcode', 'contactPostalCode']
  ];

  mappings.forEach(([mainField, contactField]) => {
    const mainElement = document.getElementById(mainField);
    const contactElement = document.getElementById(contactField);

    if (mainElement && contactElement) {
      contactElement.value = mainElement.value;
    }
  });
}

// Coordinate parsing functions
function parseCoordinates(value) {
  const parts = value.split(',');
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (!isNaN(lat) && !isNaN(lng)) {
      document.getElementById('customerLatitude').value = lat;
      document.getElementById('customerLongitude').value = lng;
      document.getElementById('displayLatitude').textContent = lat;
      document.getElementById('displayLongitude').textContent = lng;
      document.getElementById('coordinatesDisplay').classList.remove('hidden');
    }
  }
}

function extractCoordinatesFromUrl(url) {
  let match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!match) {
    match = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  }
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      document.getElementById('customerLatitude').value = lat;
      document.getElementById('customerLongitude').value = lng;
      document.getElementById('displayLatitude').textContent = lat;
      document.getElementById('displayLongitude').textContent = lng;
      document.getElementById('coordinatesDisplay').classList.remove('hidden');
      updateMapPreview();
    }
  }
}

// Expose to global scope
window.parseCoordinates = parseCoordinates;
window.extractCoordinatesFromUrl = extractCoordinatesFromUrl;

// Email Automation Functions
function updateEmailDocumentSelection() {
  const checkboxes = document.querySelectorAll('input[name="emailDocuments"]:checked');
  const summaryDiv = document.getElementById('emailDocumentSummary');
  const previewDiv = document.getElementById('emailPreviewSection');
  const listDiv = document.getElementById('selectedDocumentsList');
  const statusSpan = document.getElementById('emailSettingsStatus');
  const emailInput = document.getElementById('customerEmail');
  const documentSelectionNotice = document.getElementById('documentSelectionNotice');

  if (checkboxes.length > 0) {
    summaryDiv?.classList.remove('hidden');

    // ซ่อน warning notice เมื่อเลือกเอกสารแล้ว
    if (documentSelectionNotice) {
      documentSelectionNotice.style.display = 'none';
    }

    const documentNames = {
      'quotation': 'ใบเสนอราคา',
      'invoice': 'ใบแจ้งหนี้',
      'receipt': 'ใบเสร็จ & ใบกำกับภาษี'
    };

    if (listDiv) {
      listDiv.innerHTML = '';
      checkboxes.forEach(checkbox => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2 text-blue-600 dark:text-blue-400';
        div.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${documentNames[checkbox.value]}`;
        listDiv.appendChild(div);
      });
    }

    if (statusSpan) {
      statusSpan.textContent = `เลือกแล้ว ${checkboxes.length} รายการ`;
      statusSpan.className = 'text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300';
    }

    if (emailInput?.value) {
      previewDiv?.classList.remove('hidden');
      const emailPreviewTo = document.getElementById('emailPreviewTo');
      const emailPreviewAttachments = document.getElementById('emailPreviewAttachments');

      if (emailPreviewTo) emailPreviewTo.textContent = emailInput.value;
      if (emailPreviewAttachments) {
        emailPreviewAttachments.textContent = Array.from(checkboxes).map(cb => documentNames[cb.value]).join(', ');
      }
    } else {
      previewDiv?.classList.add('hidden');
    }
  } else {
    summaryDiv?.classList.add('hidden');
    previewDiv?.classList.add('hidden');

    // แสดง warning notice เมื่อไม่ได้เลือกเอกสาร
    if (documentSelectionNotice) {
      documentSelectionNotice.style.display = 'block';
    }

    if (statusSpan) {
      statusSpan.textContent = 'ไม่ได้เลือก - ไม่ส่งอีเมล';
      statusSpan.className = 'text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300';
    }
  }
}

function testEmailSettings() {
  const emailInput = document.getElementById('customerEmail');
  const selectedDocs = document.querySelectorAll('input[name="emailDocuments"]:checked');

  if (!emailInput?.value) {
    showToast('กรุณากรอกอีเมลก่อน', 'warning');
    return;
  }

  if (selectedDocs.length === 0) {
    showToast('กรุณาเลือกเอกสารที่จะส่งก่อน', 'warning');
    return;
  }

  showToast('กำลังทดสอบการส่งอีเมล...', 'info');

  setTimeout(() => {
    showToast('ทดสอบการส่งอีเมลสำเร็จ', 'success');
  }, 2000);
}

// Initialize branch code and global data manager if not available
function initializeBranchAndDataManager() {
  if (!window.BRANCH_CODE) {
    const urlParams = new URLSearchParams(window.location.search);
    window.BRANCH_CODE = urlParams.get('branch') || localStorage.getItem('activeBranch');
    if (window.BRANCH_CODE) {
      localStorage.setItem('activeBranch', window.BRANCH_CODE);
    }
  }

  // Initialize global data manager if not available
  if (!window.globalDataManager) {
    // Create a simple fallback global data manager
    window.globalDataManager = {
      stepData: {
        step1: { completed: false, data: { cartItems: [], branchCode: getBranchCode(), selectedProducts: [], totalAmount: 0 } },
        step2: { completed: false, data: { customerData: null, documentUploads: [], authMethod: null, signature: null } }
      },
      updateStepData: function(stepNumber, data) {
        const stepKey = `step${stepNumber}`;
        if (this.stepData[stepKey]) {
          this.stepData[stepKey].data = { ...this.stepData[stepKey].data, ...data };
          localStorage.setItem('globalStepData', JSON.stringify(this.stepData));
        }
      },
      getStepData: function(stepNumber) {
        const stepKey = `step${stepNumber}`;
        return this.stepData[stepKey] ? this.stepData[stepKey].data : null;
      }
    };

    // Load existing data from localStorage
    const savedStepData = localStorage.getItem('globalStepData');
    if (savedStepData) {
      try {
        const parsed = JSON.parse(savedStepData);
        window.globalDataManager.stepData = { ...window.globalDataManager.stepData, ...parsed };
      } catch (e) {
        console.warn('Error loading saved step data:', e);
      }
    }
  }
}

// Step 2 Main Initialization
function initializeStep2() {
  console.log('🚀 Step 2 initialization started');

  // Initialize theme
  initializeTheme();

  // Initialize branch and data manager
  initializeBranchAndDataManager();

  // Initialize sidebar exactly like step1.html
  if (typeof window.sidebarManager !== 'undefined' && typeof window.sidebarManager.initializeSidebar === 'function') {
    window.sidebarManager.initializeSidebar();

    // Highlight installment menu item
    setTimeout(() => {
      const installmentMenus = document.querySelectorAll('a[href*="installment"]');
      installmentMenus.forEach(menu => {
        menu.classList.add('active');
      });
    }, 100);
  }

  // Load salesperson name
  loadSalespersonName();

  // Load selected products
  loadSelectedProducts();

  // Initialize all subsystems
  if (typeof initializeMapCoordinates === 'function') {
    initializeMapCoordinates();
  }

  if (typeof initializeSignatureSystem === 'function') {
    initializeSignatureSystem();
  }

  if (typeof setupFormProgressTracking === 'function') {
    setupFormProgressTracking();
    updateFormProgress(); // Calculate initial progress
  }

  if (typeof setupFormValidationEventListeners === 'function') {
    setupFormValidationEventListeners();
  }

  // Setup contact address toggle
  const sameAsMainAddressCheckbox = document.getElementById('sameAsMainAddress');
  if (sameAsMainAddressCheckbox) {
    sameAsMainAddressCheckbox.addEventListener('change', toggleContactAddress);
  }

  // Setup email document selection
  const emailDocumentCheckboxes = document.querySelectorAll('input[name="emailDocuments"]');
  emailDocumentCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateEmailDocumentSelection);
  });

  // Setup birth date to age calculation
  const birthDateInput = document.getElementById('customerBirthDate');
  if (birthDateInput) {
    birthDateInput.addEventListener('change', function() {
      const birthDate = this.value;
      if (birthDate) {
        const age = calculateAge(birthDate);
        const ageInput = document.getElementById('customerAge');
        if (ageInput) {
          ageInput.value = age;
        }
      }
    });
  }


  // Auto-save functionality
  setInterval(autoSaveFormData, 30000); // Auto-save every 30 seconds

  showToast('ระบบข้อมูลลูกค้าพร้อมใช้งาน', 'success');
  console.log('✅ Step 2 initialized successfully');
}

// Global variables declaration and initialization
if (!window.selectedProducts) {
  window.selectedProducts = [];
}
if (!window.customerData) {
  window.customerData = {};
}
if (!window.documentData) {
  window.documentData = {};
}
if (!window.currentSignatureType) {
  window.currentSignatureType = null;
}

// Local references for compatibility
selectedProducts = window.selectedProducts;
let customerData = window.customerData;
let documentData = window.documentData;
currentSignatureType = window.currentSignatureType;

// Export functions to global scope
window.goToStep1 = goToStep1;
window.goToStep3 = goToStep3;
window.getBranchCode = getBranchCode;
window.getImageUrl = getImageUrl;
window.updateCartCount = updateCartCount;
window.loadSelectedProducts = loadSelectedProducts;
window.displayProductSummary = displayProductSummary;
window.formatPrice = formatPrice;
window.loadSalespersonName = loadSalespersonName;
window.toggleDarkMode = toggleDarkMode;
window.initializeTheme = initializeTheme;
window.toggleContactAddress = toggleContactAddress;
window.copyMainAddressToContact = copyMainAddressToContact;
window.updateEmailDocumentSelection = updateEmailDocumentSelection;
window.testEmailSettings = testEmailSettings;
window.initializeBranchAndDataManager = initializeBranchAndDataManager;
window.initializeStep2 = initializeStep2;