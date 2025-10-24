// =======================================
// 🏢 Business Logic Module - Installment Business
// ระบบตรรกะทางธุรกิจสำหรับการผ่อนชำระ
// =======================================

console.log('📦 Loading Installment Business Module...');
console.log('🚨 EMERGENCY FIX v1.0.5 - Payment button and JSON.parse fixes');
console.log('🔧 Loaded at:', new Date().toISOString());
console.log('📦 InstallmentBusiness module loading...');

// Global cleanup function to fix JSON parse errors
window.fixJSONParseError = function() {
  console.log('🔧 EMERGENCY: Fixing JSON parse error...');

  // Remove all radio event listeners and recreate them
  const radios = document.querySelectorAll('input[name="installmentPlan"]');
  radios.forEach(radio => {
    // Clone the element to remove all event listeners
    const newRadio = radio.cloneNode(true);
    radio.parentNode.replaceChild(newRadio, radio);

    // Add safe event listener
    newRadio.addEventListener('change', function(event) {
      const target = event.target;
      console.log('🔧 SAFE Radio change:', target.value);

      if (target.checked) {
        if (target.value === 'manual') {
          console.log('📋 Selected custom plan (SAFE)');
          const manualPlanConfig = document.getElementById('manualPlanConfig');
          const customPlanDetails = document.getElementById('customPlanDetails');

          if (manualPlanConfig) manualPlanConfig.classList.remove('hidden');
          if (customPlanDetails) {
            customPlanDetails.classList.remove('hidden');
            customPlanDetails.innerHTML = `
              <div class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                <i class="bi bi-check-circle text-green-600"></i> 
                เลือกแผนกำหนดเองแล้ว - กรุณาใส่ข้อมูลด้านล่าง
              </div>
            `;
          }
        } else if (target.value && target.value !== 'custom') {
          try {
            console.log('🔧 Attempting to parse JSON:', target.value);
            const planData = JSON.parse(target.value);
            window._autoPlan = planData;
            if (window.InstallmentBusiness && window.InstallmentBusiness.updatePlanSummaryDisplay) {
              window.InstallmentBusiness.updatePlanSummaryDisplay();
            }

            // Hide manual plan configuration
            const manualPlanConfig = document.getElementById('manualPlanConfig');
            const customPlanDetails = document.getElementById('customPlanDetails');
            if (manualPlanConfig) manualPlanConfig.classList.add('hidden');
            if (customPlanDetails) customPlanDetails.classList.add('hidden');

            console.log('✅ JSON parse successful');
          } catch (e) {
            console.error('❌ JSON parse failed:', e, 'Value:', target.value);
          }
        }
      }
    });
  });

  console.log('✅ JSON parse error fix completed');
};

// Auto-call fix function when loaded
setTimeout(() => {
  if (typeof window.fixJSONParseError === 'function') {
    window.fixJSONParseError();
  }
}, 1000);

// Global variables for business logic
window._autoPlan = { down: 0, perMonth: 0, count: 0 };
window._manualInst = 0;
window.selectedManualOption = 'option1';
window.currentInstallmentData = null;

// =============== Validation Functions ===============

// === Use Validation Functions from InstallmentCore ===
// ฟังก์ชัน validation ใช้จาก InstallmentCore module

// ลบฟังก์ชัน validation ซ้ำ - ใช้ InstallmentCore.validateXX() โดยตรง

// ตรวจสอบเอกสารที่จำเป็น
function validateRequiredDocuments() {
  const requiredDocs = [
    { id: 'idCardImageUrl', name: 'รูปถ่ายบัตรประชาชน' },
    { id: 'selfieUrl', name: 'รูปถ่ายคู่กับบัตรประชาชน' },
    { id: 'customerSignatureUrl', name: 'ลายเซ็นลูกค้า' },
    { id: 'salespersonSignatureUrl', name: 'ลายเซ็นพนักงานขาย' }
  ];

  const missingDocs = [];

  requiredDocs.forEach(doc => {
    const element = document.getElementById(doc.id);
    const value = element?.value?.trim();

    if (!value) {
      missingDocs.push(doc.name);
    }
  });

  // ตรวจสอบเอกสารเสริม (ไม่บังคับ)
  const optionalDocs = [
    { id: 'salarySlipUrl', name: 'สลิปเงินเดือน' }
  ];

  console.log('📋 Document validation results:');
  console.log('✅ Required documents:', requiredDocs.length - missingDocs.length, '/', requiredDocs.length);
  console.log('📄 Optional documents:', optionalDocs.filter(doc => document.getElementById(doc.id)?.value?.trim()).length, '/', optionalDocs.length);
  if (missingDocs.length > 0) {
    console.log('❌ Missing documents:', missingDocs);
  }

  return {
    isValid: missingDocs.length === 0,
    missingDocs: missingDocs,
    totalRequired: requiredDocs.length,
    totalProvided: requiredDocs.length - missingDocs.length
  };
}

// ตั้งค่า validation สำหรับฟิลด์
function setupFieldValidation() {
  const fields = [
    { id: 'customerIdCard', validator: (v) => window.InstallmentCore?.validateIdCard(v), name: 'เลขบัตรประชาชน' },
    { id: 'customerEmail', validator: (v) => window.InstallmentCore?.validateEmail(v), name: 'อีเมล' },
    { id: 'customerPhone', validator: (v) => window.InstallmentCore?.validatePhone(v), name: 'เบอร์โทรศัพท์' },
    { id: 'documentFee', validator: (v) => window.InstallmentCore?.validateAmount(v, 'ค่าธรรมเนียมเอกสาร'), name: 'ค่าธรรมเนียม' }
  ];

  fields.forEach(field => {
    const element = document.getElementById(field.id);
    if (element) {
      element.addEventListener('blur', () => {
        try {
          if (element.value.trim()) {
            field.validator(element.value);
            element.classList.remove('input-error');
            element.classList.add('input-success');
          }
        } catch (error) {
          element.classList.add('input-error');
          element.classList.remove('input-success');
          window.InstallmentUI.showToast(error.message, 'error');
        }
      });
    }
  });
}

// =============== Utility Functions ===============

// แปลงตัวเลขเป็นภาษาไทย
function numberToThaiText(number) {
  const txtNum = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const txtDigit = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  if (isNaN(number)) return '';

  let n = Math.floor(Math.abs(number)).toString();
  let len = n.length;
  let result = '';

  for (let i = 0; i < len; i++) {
    const digit = parseInt(n.charAt(i), 10);
    const pos = len - i - 1;
    const unit = pos % 6;
    const group = Math.floor(pos / 6);

    if (digit !== 0) {
      if (unit === 1) {
        if (digit === 1) result += 'สิบ';
        else if (digit === 2) result += 'ยี่สิบ';
        else result += txtNum[digit] + 'สิบ';
      }
      else if (unit === 0 && digit === 1 && len > 1) {
        result += 'เอ็ด';
      }
      else {
        result += txtNum[digit] + txtDigit[unit];
      }
    }

    if (unit === 0 && group > 0 && digit !== 0) {
      result += 'ล้าน'.repeat(group);
    }
  }

  if (result === '') result = txtNum[0];
  return result;
}

// ใช้ฟังก์ชันจัดการข้อผิดพลาด API จาก InstallmentCore
function handleApiError(error, context = 'การดำเนินการ') {
  console.error(`Error in ${context}:`, error);

  const message = error.message || error.toString() || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';

  if (window.InstallmentCore?.showToast) {
    window.InstallmentCore.showToast(`${context}: ${message}`, 'error');
  } else if (window.InstallmentUI?.showToast) {
    window.InstallmentUI.showToast(`${context}: ${message}`, 'error');
  } else {
    console.error(`${context}: ${message}`);
  }
}

// =============== State Management Functions ===============

// บันทึกสถานะปัจจุบัน
function saveProgress() {
  const progress = {
    step: window.InstallmentUI?.getCurrentStep() || 'step1',
    cartItems: window.InstallmentProduct?.cartItems || [],
    customerData: getCustomerFormData(),
    timestamp: Date.now()
  };

  try {
    localStorage.setItem('installment_progress', JSON.stringify(progress));
    console.log('Progress saved:', progress);
  } catch (error) {
    console.warn('Failed to save progress:', error);
  }
}

// โหลดสถานะที่บันทึกไว้
function loadProgress() {
  try {
    const saved = localStorage.getItem('installment_progress');
    if (saved) {
      const progress = JSON.parse(saved);
      // ตรวจสอบว่าข้อมูลยังใหม่อยู่ (ภายใน 1 ชั่วโมง)
      const hourAgo = Date.now() - (60 * 60 * 1000);
      if (progress.timestamp > hourAgo) {
        return progress;
      }
    }
  } catch (error) {
    console.warn('Failed to load progress:', error);
  }
  return null;
}

// ล้างสถานะที่บันทึกไว้
function clearProgress() {
  localStorage.removeItem('installment_progress');
}

// ดึงข้อมูลลูกค้าจากฟอร์ม
function getCustomerFormData() {
  // ลองดึงข้อมูลจากฟอร์มก่อน (ถ้า step 2 ยังแสดงอยู่)
  const formData = {
    prefix: document.getElementById('customerPrefix')?.value || '',
    firstName: document.getElementById('customerFirstName')?.value || '',
    lastName: document.getElementById('customerLastName')?.value || '',
    idCard: document.getElementById('customerIdCard')?.value || '',
    email: document.getElementById('customerEmail')?.value || '',
    phone: document.getElementById('customerPhone')?.value || '',
    birthDate: document.getElementById('customerBirthDate')?.value || '',
    age: document.getElementById('customerAge')?.value || '',
    houseNo: document.getElementById('houseNo')?.value || '',
    moo: document.getElementById('moo')?.value || '',
    soi: document.getElementById('soi')?.value || '',
    road: document.getElementById('road')?.value || '',
    subDistrict: document.getElementById('subDistrict')?.value || '',
    district: document.getElementById('district')?.value || '',
    province: document.getElementById('province')?.value || '',
    zipcode: document.getElementById('zipcode')?.value || '',
    address: document.getElementById('fullAddress')?.value || ''
  };

  // ✅ Enhanced address parsing from string
  if (!formData.houseNo && !formData.province && formData.address) {
    const addressParts = formData.address.split(' ');

    addressParts.forEach((part, index) => {
      if (part.includes('เลขที่')) {
        formData.houseNo = addressParts[index + 1] || '';
      } else if (part.includes('หมู่')) {
        formData.moo = addressParts[index + 1] || '';
      } else if (part.includes('ตำบล')) {
        formData.subDistrict = addressParts[index + 1] || '';
      } else if (part.includes('อำเภอ')) {
        formData.district = addressParts[index + 1] || '';
      } else if (part.includes('จังหวัด')) {
        formData.province = addressParts[index + 1] || '';
      } else if (/^\d{5}$/.test(part)) {
        formData.zipcode = part;
      }
    });
  }

  // ตรวจสอบว่าได้ข้อมูลจากฟอร์มหรือไม่
  const hasValidData = formData.firstName && formData.lastName && formData.idCard && formData.phone && formData.birthDate && formData.age;

  if (hasValidData) {
    // บันทึกข้อมูลลง localStorage สำหรับใช้ในอนาคต
    saveCustomerDataToStorage(formData);
    return formData;
  }

  // ถ้าไม่ได้ข้อมูลจากฟอร์ม (เพราะ step ถูกซ่อน) ให้ดึงจาก localStorage
  const storedData = getCustomerDataFromStorage();
  if (storedData && storedData.firstName && storedData.lastName && storedData.idCard && storedData.phone && storedData.birthDate && storedData.age) {
    console.log('📦 ดึงข้อมูลลูกค้าจาก localStorage:', storedData);
    return storedData;
  }

  // ถ้าไม่มีข้อมูลทั้งจากฟอร์มและ localStorage ให้ส่งข้อมูลว่าง
  console.warn('⚠️ ไม่พบข้อมูลลูกค้าทั้งในฟอร์มและ localStorage');
  return formData;
}

// ฟังก์ชันสำหรับตรวจสอบข้อมูลลูกค้าในคอนโซล
function debugCustomerFormData() {
  console.log('🔍 Debug Customer Form Data:');

  const fields = [
    'customerPrefix',
    'customerFirstName',
    'customerLastName',
    'customerIdCard',
    'customerEmail',
    'customerPhone',
    'customerBirthDate',
    'customerAge',
    'houseNo',
    'moo',
    'subDistrict',
    'district',
    'province',
    'zipcode'
  ];

  fields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    console.log(`${fieldId}:`, {
      exists: !!element,
      value: element?.value || '',
      visible: element?.offsetParent !== null,
      required: element?.hasAttribute('required'),
      disabled: element?.disabled
    });
  });

  const customerData = getCustomerFormData();
  console.log('📋 Combined customer data:', customerData);

  return customerData;
}

// ฟังก์ชันสำหรับเน้นฟิลด์ที่ยังไม่ได้กรอก
function highlightEmptyRequiredFields() {
  const requiredFields = ['customerFirstName', 'customerLastName', 'customerIdCard', 'customerPhone', 'customerBirthDate', 'customerAge'];
  let emptyFields = [];

  requiredFields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      const value = element.value?.trim();
      if (!value) {
        element.style.border = '2px solid red';
        element.style.backgroundColor = '#ffebee';
        emptyFields.push(fieldId);
      } else {
        element.style.border = '';
        element.style.backgroundColor = '';
      }
    }
  });

  if (emptyFields.length > 0) {
    console.warn('⚠️  ฟิลด์ที่ยังไม่ได้กรอก:', emptyFields);
    // เลื่อนไปที่ฟิลด์แรกที่ยังไม่ได้กรอก
    const firstEmpty = document.getElementById(emptyFields[0]);
    if (firstEmpty) {
      firstEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstEmpty.focus();
    }
  }

  return emptyFields;
}

// ✅ Enhanced function to highlight validation errors based on backend messages
function highlightValidationErrors(errorDetails) {
  console.log('🔍 Highlighting validation errors:', errorDetails);

  // Clear previous highlights
  const allInputs = document.querySelectorAll('input, select, textarea');
  allInputs.forEach(input => {
    input.style.border = '';
    input.style.backgroundColor = '';
  });

  // Map error messages to field IDs
  const errorFieldMap = {
    'กรุณากรอกชื่อลูกค้าหรือชื่อบริษัท': ['customerFirstName', 'customerLastName'],
    'กรุณากรอกเบอร์โทรศัพท์': ['customerPhone'],
    'กรุณากรอกเลขบัตรประชาชน': ['customerIdCard'],
    'กรุณากรอกอีเมล': ['customerEmail'],
    'แผนการผ่อนชำระไม่ถูกต้อง': ['autoPlansContainer', 'manualPlanConfig'],
    'ยอดรวมต้องมากกว่า 0': ['cartItemsContainer'],
    'จำนวนไม่ถูกต้อง': ['cartItemsContainer'],
    'กรุณาเลือกสินค้า': ['cartItemsContainer'],
    'เอกสารไม่ครบถ้วน': ['idCardImageUrl', 'selfieUrl'],
    'กรุณาลงชื่อ': ['customerSignatureUrl', 'salespersonSignatureUrl']
  };

  const fieldsToHighlight = new Set();

  // Find matching fields for each error
  errorDetails.forEach(error => {
    // Check for exact matches
    if (errorFieldMap[error]) {
      errorFieldMap[error].forEach(fieldId => fieldsToHighlight.add(fieldId));
    }

    // Check for partial matches
    Object.keys(errorFieldMap).forEach(errorKey => {
      if (error.includes(errorKey) || errorKey.includes(error)) {
        errorFieldMap[errorKey].forEach(fieldId => fieldsToHighlight.add(fieldId));
      }
    });

    // Check for product-specific errors
    if (error.includes('สินค้าลำดับที่')) {
      fieldsToHighlight.add('cartItemsContainer');
    }

    // Check for plan-specific errors
    if (error.includes('แผน') || error.includes('ผ่อน')) {
      fieldsToHighlight.add('autoPlansContainer');
      fieldsToHighlight.add('manualPlanConfig');
    }
  });

  // Highlight the problematic fields
  fieldsToHighlight.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      if (element.tagName === 'DIV') {
        // For containers, highlight the border
        element.style.border = '2px solid #ef4444';
        element.style.borderRadius = '8px';
        element.style.backgroundColor = '#fef2f2';
      } else {
        // For input fields
        element.style.border = '2px solid #ef4444';
        element.style.backgroundColor = '#fef2f2';
      }

      // Add a temporary class for animation
      element.classList.add('validation-error');
      setTimeout(() => {
        element.classList.remove('validation-error');
      }, 3000);
    }
  });

  // Scroll to first problematic field
  const firstField = Array.from(fieldsToHighlight)[0];
  if (firstField) {
    const element = document.getElementById(firstField);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Focus if it's an input field
      if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
        setTimeout(() => element.focus(), 500);
      }
    }
  }

  // Show user-friendly guidance
  if (window.InstallmentUI && window.InstallmentUI.showToast) {
    setTimeout(() => {
      window.InstallmentUI.showToast('ตรวจสอบฟิลด์ที่ถูกเน้นสีแดง', 'info');
    }, 2000);
  }
}

// ฟังก์ชันสำหรับจัดการข้อมูลลูกค้าใน localStorage
function saveCustomerDataToStorage(customerData) {
  try {
    const storageKey = 'installment_customer_data';
    const dataToStore = {
      ...customerData,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    localStorage.setItem(storageKey, JSON.stringify(dataToStore));
    console.log('✅ บันทึกข้อมูลลูกค้าลง localStorage สำเร็จ');

    // Sync customer data to loan management system
    if (window.InstallmentAPI?.syncCustomerToLoanSystem &&
        customerData.firstName &&
        customerData.lastName &&
        customerData.taxId &&
        customerData.phone) {

      // Add branch information and system fields
      const loanCustomerData = {
        ...customerData,
        branchName: window.InstallmentAPI?.getBranchCode?.() || 'Unknown',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Sync asynchronously to avoid blocking the UI
      window.InstallmentAPI.syncCustomerToLoanSystem(loanCustomerData)
        .then(result => {
          console.log('✅ ข้อมูลลูกค้าถูกซิงค์ไปยังระบบสินเชื่อเรียบร้อย:', result);
        })
        .catch(error => {
          console.warn('⚠️ ไม่สามารถซิงค์ข้อมูลลูกค้าไปยังระบบสินเชื่อ:', error);
          // Non-critical error, continue with normal operation
        });
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูลลูกค้า:', error);
  }
}

function getCustomerDataFromStorage() {
  try {
    const storageKey = 'installment_customer_data';
    const storedData = localStorage.getItem(storageKey);

    if (!storedData) {
      return null;
    }

    const parsedData = JSON.parse(storedData);

    // ตรวจสอบว่าข้อมูลยังใหม่อยู่หรือไม่ (อายุไม่เกิน 24 ชั่วโมง)
    const dataAge = new Date() - new Date(parsedData.timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 ชั่วโมง

    if (dataAge > maxAge) {
      console.warn('⚠️ ข้อมูลลูกค้าใน localStorage หมดอายุแล้ว');
      clearCustomerDataFromStorage();
      return null;
    }

    // ลบ metadata และส่งคืนเฉพาะข้อมูลลูกค้า
    const { timestamp, version, ...customerData } = parsedData;
    return customerData;

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลลูกค้า:', error);
    return null;
  }
}

function clearCustomerDataFromStorage() {
  try {
    const storageKey = 'installment_customer_data';
    localStorage.removeItem(storageKey);
    console.log('🗑️ ลบข้อมูลลูกค้าจาก localStorage สำเร็จ');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการลบข้อมูลลูกค้า:', error);
  }
}

// ฟังก์ชันสำหรับติดตั้งระบบ Auto-save ข้อมูลลูกค้า
function setupCustomerDataAutoSave() {
  const customerFields = [
    'customerPrefix', 'customerFirstName', 'customerLastName',
    'customerIdCard', 'customerEmail', 'customerPhone',
    'customerBirthDate', 'customerAge',
    'houseNo', 'moo', 'subDistrict', 'district', 'province', 'zipcode'
  ];

  customerFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('input', window.InstallmentUI?.debounce(() => {
        const currentData = getCustomerFormData();
        if (currentData.firstName && currentData.lastName && currentData.idCard && currentData.phone && currentData.birthDate && currentData.age) {
          saveCustomerDataToStorage(currentData);
        }
      }, 1000) || (() => {})); // Auto-save หลังจากพิมพ์เสร็จ 1 วินาที
    }
  });

  console.log('🔄 ตั้งค่า Auto-save ข้อมูลลูกค้าเรียบร้อย');
}

// ลบฟังก์ชัน debounce ซ้ำ - ใช้ InstallmentUI.debounce() โดยตรง

// ฟังก์ชันทดสอบระบบแก้ไขปัญหา
function testCustomerDataFix() {
  console.log('🧪 ทดสอบระบบแก้ไขปัญหาข้อมูลลูกค้า');
  console.log('==================================================');

  // 1. ทดสอบการดึงข้อมูลจากฟอร์ม
  console.log('📋 1. ทดสอบการดึงข้อมูลจากฟอร์ม:');
  const formData = getCustomerFormData();
  console.log('   ข้อมูลจากฟอร์ม:', formData);

  // 2. ทดสอบการบันทึกลง localStorage
  console.log('💾 2. ทดสอบการบันทึกลง localStorage:');
  if (formData.firstName && formData.lastName) {
    saveCustomerDataToStorage(formData);
    console.log('   ✅ บันทึกข้อมูลทดสอบเรียบร้อย');
  } else {
    // สร้างข้อมูลทดสอบสำหรับการทดสอบระบบเท่านั้น (ไม่ใช้ในโปรดักชัน)
  const testData = {
    prefix: 'นาย',
    firstName: 'ทดสอบ',
    lastName: 'ระบบ',
    idCard: '1234567890123',
    phone: '0812345678',
    email: 'test@example.com',
    houseNo: '123',
    moo: '1',
    subDistrict: 'ตำบลทดสอบ',
    district: 'อำเภอทดสอบ',
    province: 'จังหวัดทดสอบ',
    zipcode: '12345'
  };

  console.warn('⚠️ การใช้ข้อมูลทดสอบ - ไม่ควรใช้ในสภาพแวดล้อมการผลิต');
    saveCustomerDataToStorage(testData);
    console.log('   ✅ บันทึกข้อมูลทดสอบ:', testData);
  }

  // 3. ทดสอบการดึงข้อมูลจาก localStorage
  console.log('📦 3. ทดสอบการดึงข้อมูลจาก localStorage:');
  const storedData = getCustomerDataFromStorage();
  console.log('   ข้อมูลจาก localStorage:', storedData);

  // 4. ทดสอบการทำงานของ getCustomerFormData ใหม่
  console.log('🔄 4. ทดสอบ getCustomerFormData ที่แก้ไขแล้ว:');
  const finalData = getCustomerFormData();
  console.log('   ข้อมูลสุดท้าย:', finalData);

  // 5. แสดงสถานะ Step
  console.log('📍 5. สถานะ Step ปัจจุบัน:');
  const currentStep = document.querySelector('.step-content.active')?.id || 'ไม่พบ';
  console.log('   Step ที่แสดงอยู่:', currentStep);

  // 6. ตรวจสอบการมองเห็นของฟิลด์
  console.log('👁️ 6. การมองเห็นของฟิลด์ลูกค้า:');
  const customerFields = ['customerFirstName', 'customerLastName', 'customerIdCard', 'customerPhone'];
  customerFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    console.log(`   ${fieldId}:`, {
      exists: !!field,
      visible: field?.offsetParent !== null,
      value: field?.value || 'ว่าง'
    });
  });

  console.log('==================================================');
  console.log('✅ การทดสอบเสร็จสิ้น');

  return {
    formData,
    storedData,
    finalData,
    currentStep,
    testPassed: !!(finalData.firstName && finalData.lastName && finalData.idCard && finalData.phone)
  };
}

// เพิ่มฟังก์ชันเหล่านี้ให้กับ window object เพื่อให้เรียกใช้จากคอนโซลได้
window.debugCustomerFormData = debugCustomerFormData;
window.highlightEmptyRequiredFields = highlightEmptyRequiredFields;
window.saveCustomerDataToStorage = saveCustomerDataToStorage;
window.getCustomerDataFromStorage = getCustomerDataFromStorage;
window.clearCustomerDataFromStorage = clearCustomerDataFromStorage;
window.setupCustomerDataAutoSave = setupCustomerDataAutoSave;
window.testCustomerDataFix = testCustomerDataFix;

// ✅ Comprehensive test function for all fixes
function testInstallmentSystemFixes() {
  console.log('🧪 === TESTING INSTALLMENT SYSTEM FIXES ===');
  console.log('='.repeat(50));

  const results = {
    customerData: null,
    paymentPlan: null,
    cartItems: null,
    validation: null,
    payload: null,
    errors: [],
    warnings: []
  };

  try {
    // Test 1: Customer data collection
    console.log('📋 1. Testing customer data collection...');
    const customerData = getCustomerFormData();
    results.customerData = customerData;

    if (!customerData.firstName || !customerData.lastName) {
      results.errors.push('Customer name is missing');
    }
    if (!customerData.phone) {
      results.errors.push('Customer phone is missing');
    }
    if (!customerData.idCard) {
      results.errors.push('Customer ID card is missing');
    }

    console.log('   ✅ Customer data:', customerData);

    // Test 2: Payment plan selection
    console.log('📋 2. Testing payment plan selection...');
    const paymentPlan = getSelectedPlan();
    results.paymentPlan = paymentPlan;

    if (!paymentPlan.downPayment || paymentPlan.downPayment <= 0) {
      results.errors.push('Down payment is invalid');
    }
    if (!paymentPlan.installmentPeriod || paymentPlan.installmentPeriod <= 0) {
      results.errors.push('Installment count is invalid');
    }
    if (!paymentPlan.installmentAmount || paymentPlan.installmentAmount <= 0) {
      results.errors.push('Installment amount is invalid');
    }

    console.log('   ✅ Payment plan:', paymentPlan);

    // Test 3: Cart items
    console.log('📋 3. Testing cart items...');
    const cartItems = window.InstallmentProduct?.cartItems || window.cartItems || [];
    results.cartItems = cartItems;

    if (!cartItems || cartItems.length === 0) {
      results.errors.push('No cart items found');
    } else {
      cartItems.forEach((item, index) => {
        if (!item.name) {
          results.errors.push(`Product ${index + 1}: Name is missing`);
        }
        if (!item.quantity && !item.qty) {
          results.errors.push(`Product ${index + 1}: Quantity is missing`);
        }
        if (!item.price || item.price <= 0) {
          results.errors.push(`Product ${index + 1}: Price is invalid`);
        }
      });
    }

    console.log('   ✅ Cart items:', cartItems);

    // Test 4: Document validation
    console.log('📋 4. Testing document validation...');
    const validation = validateRequiredDocuments();
    results.validation = validation;

    if (!validation.isValid) {
      results.warnings.push(`Missing documents: ${validation.missingDocs.join(', ')}`);
    }

    console.log('   ✅ Document validation:', validation);

    // Test 5: Payload generation
    console.log('📋 5. Testing payload generation...');
    if (results.errors.length === 0) {
      try {
        // Create a test payload similar to saveInstallmentData
        const testPayload = {
          customerName: `${customerData.firstName} ${customerData.lastName}`,
          name: `${customerData.firstName} ${customerData.lastName}`,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          phone: customerData.phone,
          email: customerData.email,
          idCard: customerData.idCard,

          products: cartItems.map(item => ({
            name: item.name,
            quantity: parseInt(item.quantity || item.qty || 1),
            price: parseFloat(item.price || 0),
            total: parseFloat(item.total || (item.price * (item.quantity || item.qty || 1)))
          })),

          paymentPlan: {
            planType: paymentPlan.planType || paymentPlan.type,
            downPayment: paymentPlan.downPayment,
            monthlyPayment: paymentPlan.installmentAmount,
            terms: paymentPlan.installmentPeriod,
            totalAmount: paymentPlan.totalAmount
          },

          totalAmount: calculateTotalAmount(),
          branchCode: window.BRANCH_CODE || '00000',
          requestId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        results.payload = testPayload;
        console.log('   ✅ Test payload generated successfully:', testPayload);

        // Validate payload structure
        const requiredFields = ['customerName', 'phone', 'products', 'paymentPlan'];
        const missingFields = requiredFields.filter(field => !testPayload[field]);

        if (missingFields.length > 0) {
          results.errors.push(`Missing payload fields: ${missingFields.join(', ')}`);
        }

      } catch (payloadError) {
        results.errors.push(`Payload generation error: ${payloadError.message}`);
      }
    }

    // Test 6: Error handling
    console.log('📋 6. Testing error handling...');
    const testErrors = [
      'กรุณากรอกชื่อลูกค้าหรือชื่อบริษัท',
      'กรุณากรอกเบอร์โทรศัพท์',
      'สินค้าลำดับที่ 1: จำนวนไม่ถูกต้อง',
      'แผนการผ่อนชำระไม่ถูกต้อง'
    ];

    console.log('   ✅ Testing error highlighting...');
    highlightValidationErrors(testErrors);

    // Clear highlights after test
    setTimeout(() => {
      const allInputs = document.querySelectorAll('input, select, textarea');
      allInputs.forEach(input => {
        input.style.border = '';
        input.style.backgroundColor = '';
      });
    }, 2000);

  } catch (error) {
    results.errors.push(`Test execution error: ${error.message}`);
  }

  // Summary
  console.log('📋 === TEST RESULTS SUMMARY ===');
  console.log('   Errors:', results.errors.length);
  console.log('   Warnings:', results.warnings.length);

  if (results.errors.length > 0) {
    console.log('❌ ERRORS:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log('⚠️ WARNINGS:');
    results.warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  }

  if (results.errors.length === 0) {
    console.log('✅ ALL TESTS PASSED! The system should work correctly now.');
  } else {
    console.log('❌ Some tests failed. Please address the errors above.');
  }

  console.log('='.repeat(50));

  // Store results for debugging
  window.testResults = results;
  console.log('💾 Test results stored in window.testResults');

  return results;
}

// Add test function to window object
window.testInstallmentSystemFixes = testInstallmentSystemFixes;

// =============== Plan Calculation Functions ===============

// อัปเดตค่าแผนมาตรฐาน
function updateStandardValues() {
  const plans = document.querySelectorAll('input[name="installmentPlan"]:checked');
  if (plans.length === 0) return;

  const selectedPlan = plans[0];

  // ตรวจสอบว่าเป็น custom plan หรือไม่
        if (selectedPlan.value === 'manual') {
    // ไม่ต้องทำอะไรสำหรับ custom plan
    return;
  }

  try {
    const planData = JSON.parse(selectedPlan.value);

    window._autoPlan = {
      down: planData.down,
      perMonth: planData.perMonth,
      count: planData.count
    };
  } catch (e) {
    console.error('Error parsing plan data in updateStandardValues:', e, 'Value:', selectedPlan.value);
  }
}

// สร้างแผนผ่อนอัตโนมัติ
function renderAutoPlans() {
  const container = document.getElementById('autoPlansContainer');
  if (!container || !window.InstallmentProduct?.cartItems?.length) return;

  const cartItems = window.InstallmentProduct.cartItems;

  // 🔧 คำนวณยอดรวมที่แท้จริงจากราคาสินค้า
  const totalProductAmount = cartItems.reduce((sum, item) => {
    return sum + (Number(item.price) || 0);
  }, 0);

  console.log('🔍 Total Product Amount (FIXED):', totalProductAmount);
  console.log('🛒 Cart Items:', cartItems);

  // ตรวจสอบว่ายอดรวมถูกต้อง
  if (totalProductAmount <= 0) {
    console.error('❌ Invalid total amount:', totalProductAmount);
    return;
  }

  // สร้างแผนผ่อนที่สมเหตุสมผลจากยอดรวมจริง
  const plans = [];

  // แผน 1: ดาวน์ 30% ของยอดรวม
  const plan1 = {
    id: 'plan1',
    name: 'แผนผ่อนยาว (ดาวน์น้อย)',
    down: Math.floor(totalProductAmount * 0.3), // 30% ของยอดรวม
    perMonth: Math.floor(totalProductAmount * 0.07), // 7% ต่อเดือน
    count: 10
  };

  // แผน 2: ดาวน์ 50% ของยอดรวม
  const plan2 = {
    id: 'plan2',
    name: 'แผนผ่อนปานกลาง',
    down: Math.floor(totalProductAmount * 0.5), // 50% ของยอดรวม
    perMonth: Math.floor(totalProductAmount * 0.08), // 8% ต่อเดือน
    count: 6
  };

  // แผน 3: ดาวน์ 70% ของยอดรวม
  const plan3 = {
    id: 'plan3',
    name: 'แผนผ่อนสั้น (ดาวน์มาก)',
    down: Math.floor(totalProductAmount * 0.7), // 70% ของยอดรวม
    perMonth: Math.floor(totalProductAmount * 0.1), // 10% ต่อเดือน
    count: 3
  };

  plans.push(plan1, plan2, plan3);

  // ✅ ตรวจสอบให้แน่ใจว่าเงินดาวน์ไม่เกินยอดรวม
  plans.forEach(plan => {
    if (plan.down > totalProductAmount) {
      console.warn(`⚠️ Plan ${plan.id} down payment (${plan.down}) > total (${totalProductAmount}), adjusting...`);
      plan.down = Math.floor(totalProductAmount * 0.8); // ลดเหลือ 80%
    }
    console.log(`📋 Plan ${plan.id}: Down=${plan.down}, Total=${totalProductAmount}, Valid=${plan.down <= totalProductAmount}`);
  });

  container.innerHTML = plans.map(plan => {
    const total = plan.down + (plan.perMonth * plan.count);
    return `
      <div class="border rounded-lg p-4 mb-3">
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="radio" name="installmentPlan" value='${JSON.stringify(plan)}' 
                 ${plan.id === 'plan1' ? 'checked' : ''} class="radio radio-primary">
          <div class="flex-1">
            <h4 class="font-semibold">${plan.name}</h4>
            <p class="text-sm text-gray-600">
              ดาวน์: ฿${plan.down.toLocaleString()} | 
              ค่างวด: ฿${plan.perMonth.toLocaleString()}/เดือน | 
              ${plan.count} งวด
            </p>
            <p class="text-lg font-bold text-primary">
              รวม: ฿${total.toLocaleString()}
            </p>
          </div>
        </label>
      </div>
    `;
  }).join('');

  // ตั้งค่าแผนเริ่มต้น
  window._autoPlan = plans[0];
  bindAutoPlanRadios();
}

// ผูก event สำหรับแผนผ่อนอัตโนมัติ
function bindAutoPlanRadios() {
  console.log('🔧 bindAutoPlanRadios called at:', new Date().toISOString());
  const radios = document.querySelectorAll('input[name="installmentPlan"]');
  console.log('📻 Found radios:', radios.length);

  radios.forEach(radio => {
    console.log('📻 Processing radio with value:', radio.value);

    // ลบ event listeners เก่าทั้งหมด
    const newRadio = radio.cloneNode(true);
    radio.parentNode.replaceChild(newRadio, radio);

    // เพิ่ม event listener ใหม่
    newRadio.addEventListener('change', handlePlanRadioChange);
  });
}

// Handle radio change event
function handlePlanRadioChange(event) {
  const radio = event.target;
  console.log('📻 Radio change event:', radio.value, 'checked:', radio.checked);

  if (radio.checked) {
            if (radio.value === 'manual') {
      // Handle custom plan selection
      console.log('📋 Selected custom plan');
      // Show manual plan configuration
      const manualPlanConfig = document.getElementById('manualPlanConfig');
      const customPlanDetails = document.getElementById('customPlanDetails');

      if (manualPlanConfig) {
        manualPlanConfig.classList.remove('hidden');
      }
      if (customPlanDetails) {
        customPlanDetails.classList.remove('hidden');
        customPlanDetails.innerHTML = `
          <div class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            <i class="bi bi-check-circle text-green-600"></i> 
            เลือกแผนกำหนดเองแล้ว - กรุณาใส่ข้อมูลด้านล่าง
          </div>
        `;
      }

      // อัปเดตสรุปสินค้าสำหรับ custom plan
      console.log('🔄 Updating summary for custom plan');

      // bind custom plan inputs สำหรับ sync
      bindCustomPlanInputs();

      setTimeout(() => {
        renderStep3Summary();
      }, 100);
    } else {
      // Handle auto plan selection
      // ตรวจสอบว่า value ไม่ใช่ "custom" ก่อน parse JSON
      if (radio.value && radio.value !== 'manual') {
        try {
          const planData = JSON.parse(radio.value);
          window._autoPlan = planData;
          updatePlanSummaryDisplay();

          // Hide manual plan configuration for auto plans
          const manualPlanConfig = document.getElementById('manualPlanConfig');
          const customPlanDetails = document.getElementById('customPlanDetails');

          if (manualPlanConfig) {
            manualPlanConfig.classList.add('hidden');
          }
          if (customPlanDetails) {
            customPlanDetails.classList.add('hidden');
          }

          // อัปเดตสรุปสินค้าสำหรับ preset plans
          console.log('🔄 Updating summary for preset plan:', planData.id);
          setTimeout(() => {
            renderStep3Summary();
          }, 100);

        } catch (e) {
          console.error('Error parsing plan data:', e, 'Radio value:', radio.value);
        }
      }
    }
  }
}

// อัปเดตการแสดงสรุปแผน
function updatePlanSummaryDisplay() {
  const planSummary = getPlanSummaryText();
  let display = document.getElementById('step3PlanSummaryDisplay');
  if (!display) {
    display = document.createElement('div');
    display.id = 'step3PlanSummaryDisplay';
    display.className = 'p-3 rounded bg-blue-50 text-lg font-semibold text-blue-700 mb-3 text-center';
    const cardBody = document.querySelector('#step3 .card-body');
    if (cardBody) cardBody.prepend(display);
  }
  display.textContent = planSummary;
  console.log('PlanSummaryDisplay:', planSummary);
}

// ได้ข้อความสรุปแผน
function getPlanSummaryText() {
  const { down, perMonth, count } = window._autoPlan;
  const total = down + (perMonth * count);
  return `ดาวน์ ฿${down.toLocaleString()} + ผ่อน ฿${perMonth.toLocaleString()} x ${count} งวด = รวม ฿${total.toLocaleString()}`;
}

// =============== Manual Plan Functions ===============

// เริ่มต้นแผนผ่อนแบบกำหนดเอง
function initManualTerms() {
  const max = getManualMaxTerms();
  const sel = document.getElementById('manualTerms');
  if (!sel) return;

  sel.innerHTML = Array.from({ length: max }, (_, i) =>
    `<option value="${i + 1}">${i + 1} งวด</option>`
  ).join('');
  sel.value = max;
  sel.removeEventListener('change', calculateManualPlan);
  sel.addEventListener('change', calculateManualPlan);
  calculateManualPlan();
}

// ได้จำนวนงวดสูงสุดสำหรับแผนกำหนดเอง
function getManualMaxTerms() {
  const cartItems = window.InstallmentProduct?.cartItems || [];
  if (!cartItems.length) return 0;
  return Math.min(...cartItems.map(it => it.downInstallmentCount));
}

// คำนวณแผนผ่อนแบบกำหนดเอง
function calculateManualPlan() {
  // ตรวจสอบว่า window._autoPlan มีอยู่หรือไม่
  if (!window._autoPlan) {
    console.warn('⚠️ window._autoPlan ยังไม่ถูกตั้งค่า - กำลังคำนวณจากข้อมูลสินค้า');

    // คำนวณจากข้อมูลสินค้าใน cart
    const cartItems = window.InstallmentProduct?.cartItems || [];
    if (cartItems.length === 0) {
      console.warn('⚠️ ไม่มีสินค้าในตะกร้า - ไม่สามารถคำนวณแผนการผ่อนได้');
      return;
    }

    // สร้าง _autoPlan ชั่วคราวจากสินค้าชิ้นแรก
    const firstItem = cartItems[0];
    window._autoPlan = {
      down: Number(firstItem.downAmount) || 0,
      perMonth: Number(firstItem.downInstallment) || 0,
      count: Number(firstItem.downInstallmentCount) || 0
    };

    console.log('🔧 สร้าง _autoPlan ชั่วคราว:', window._autoPlan);
  }

  const originalTotal = window._autoPlan.down + window._autoPlan.perMonth * window._autoPlan.count;
  const D = Number(document.getElementById('manualDown')?.value) || 0;
  const docFee = Number(document.getElementById('documentFee')?.value) || 0;
  const shippingFee = Number(document.getElementById('shippingFee')?.value) || 0;
  const n = Number(document.getElementById('manualTerms')?.value) || 1;

  const base = n > 0 ? Math.floor((originalTotal - D - docFee - shippingFee) / n) : (originalTotal - D - docFee - shippingFee);
  window._manualInst = base;

  const amountElement = document.getElementById('manualInstallmentAmount');
  if (amountElement) {
    amountElement.textContent = base.toLocaleString();
  }

  console.log('💰 คำนวณแผนกำหนดเอง:', {
    originalTotal,
    down: D,
    docFee,
    shippingFee,
    terms: n,
    installmentAmount: base
  });

  renderManualPlanSummary();

  // อัปเดตสรุปสินค้าทันที
  setTimeout(() => {
    renderStep3Summary();
  }, 100);
}

// แสดงสรุปแผนผ่อนแบบกำหนดเอง
function renderManualPlanSummary() {
  const n = Number(document.getElementById('manualTerms')?.value) || 1;
  const baseDown = Number(document.getElementById('manualDown')?.value) || 0;
  const docFee = Number(document.getElementById('documentFee')?.value) || 0;
  const shippingFee = Number(document.getElementById('shippingFee')?.value) || 0;
  const baseInstallment = window._manualInst || 0;

  let vatAmount = 0;
  let displayDown = baseDown;
  let displayInstallment = baseInstallment;

  const cartItems = window.InstallmentProduct?.cartItems || [];
  cartItems.forEach(it => {
    if (it.taxType === 'ไม่มี VAT') return;

    const rate = (it.taxRate || 0) / 100;

    if (window.selectedManualOption === 'option1') {
      const downAmt = Number(it.downAmount) || 0;
      const vatDown = downAmt * rate / (1 + rate);
      vatAmount += vatDown;
    } else if (window.selectedManualOption === 'option2') {
      const instAmt = Number(it.installmentAmount) || 0;
      const termCnt = Number(it.termCount) || 0;
      const totalInst = instAmt * termCnt;
      const vatInst = totalInst * rate / (1 + rate);
      vatAmount += vatInst;
    }
  });

  vatAmount = Math.round(vatAmount * 100) / 100;

  // คำนวณยอดรวมทั้งสิ้น
  const totalAmount = displayDown + (displayInstallment * n) + docFee + shippingFee;

  // อัปเดตการแสดงผล
  const summaryElement = document.getElementById('manualPlanSummary');
  if (summaryElement) {
    summaryElement.innerHTML = `
      <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <h4 class="font-semibold mb-3 text-blue-800 flex items-center gap-2">
          <i class="bi bi-calculator"></i> สรุปแผนผ่อนที่กำหนด
        </h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span>เงินดาวน์:</span>
            <span class="font-medium text-green-600">฿${displayDown.toLocaleString()}</span>
          </div>
          <div class="flex justify-between">
            <span>ค่างวดต่อเดือน:</span>
            <span class="font-medium">฿${displayInstallment.toLocaleString()} x ${n} งวด</span>
          </div>
          <div class="flex justify-between">
            <span>ค่าธรรมเนียมเอกสาร:</span>
            <span class="font-medium">฿${docFee.toLocaleString()}</span>
          </div>
          ${shippingFee > 0 ? `
            <div class="flex justify-between">
              <span>ค่าจัดส่ง:</span>
              <span class="font-medium">฿${shippingFee.toLocaleString()}</span>
            </div>
          ` : ''}
          ${vatAmount > 0 ? `
            <div class="flex justify-between">
              <span>VAT:</span>
              <span class="font-medium">฿${vatAmount.toLocaleString()}</span>
            </div>
          ` : ''}
          <hr class="border-blue-200">
          <div class="flex justify-between text-lg font-bold text-blue-800">
            <span>รวมทั้งสิ้น:</span>
            <span>฿${totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    `;
  }
}

// อัปเดตแผนผ่อนแบบกำหนดเอง
function updateManualPlan() {
  calculateManualPlan();
  // อัปเดต summary ให้ sync กับข้อมูลใหม่
  setTimeout(() => {
    renderStep3Summary();
  }, 100);
}

// ฟังก์ชันสำหรับ sync summary เมื่อมีการเปลี่ยนแปลง custom plan
function syncCustomPlanSummary() {
  console.log('🔄 Syncing custom plan with summary...');
  renderStep3Summary();
}

// เพิ่ม event listeners สำหรับ custom plan inputs
function bindCustomPlanInputs() {
  console.log('🔗 Binding custom plan input events...');

  // เงินดาวน์
  const manualDownInput = document.getElementById('manualDown');
  if (manualDownInput) {
    manualDownInput.removeEventListener('input', handleCustomPlanChange);
    manualDownInput.addEventListener('input', handleCustomPlanChange);
  }

  // จำนวนงวด
  const manualTermsSelect = document.getElementById('manualTerms');
  if (manualTermsSelect) {
    manualTermsSelect.removeEventListener('change', handleCustomPlanChange);
    manualTermsSelect.addEventListener('change', handleCustomPlanChange);
  }

  // ค่าธรรมเนียม
  const documentFeeInput = document.getElementById('documentFee');
  if (documentFeeInput) {
    documentFeeInput.removeEventListener('input', handleCustomPlanChange);
    documentFeeInput.addEventListener('input', handleCustomPlanChange);
  }

  // ค่าจัดส่ง
  const shippingFeeInput = document.getElementById('shippingFee');
  if (shippingFeeInput) {
    shippingFeeInput.removeEventListener('input', handleCustomPlanChange);
    shippingFeeInput.addEventListener('input', handleCustomPlanChange);
  }

  console.log('✅ Custom plan input events bound successfully');
}

// จัดการเมื่อ custom plan inputs เปลี่ยนแปลง
function handleCustomPlanChange() {
  console.log('🔄 Custom plan input changed, updating...');

  // คำนวณใหม่
  calculateManualPlan();

  // อัปเดตสรุปสินค้าทันที
  setTimeout(() => {
    renderStep3Summary();
  }, 100);
}

// =============== Summary Functions ===============

// สรุป Step 3 พร้อม sync กับทุกแผนการผ่อน
function renderStep3Summary() {
  console.log('📋 กำลังสร้างสรุป Step 3...');

  const cartItems = window.InstallmentProduct?.cartItems || [];

  if (cartItems.length === 0) {
    // ✅ ใช้ debug แทน warn เพื่อไม่แสดง warning ระหว่าง initialization
    const systemInitialized = window.systemInitialized || window.InstallmentMain?.systemInitialized;
    if (systemInitialized) {
      console.debug('🔄 ไม่มีสินค้าในตะกร้า (ระบบพร้อมแล้ว)');
    } else {
      console.debug('🔄 ไม่มีสินค้าในตะกร้า (ระบบกำลัง initialize)');
    }

    const container = document.getElementById('step3ProductSummary');
    if (container) {
      container.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <i class="bi bi-cart-x text-4xl mb-2"></i>
          <p>ไม่มีสินค้าในตะกร้า</p>
          <p class="text-sm">กรุณาเพิ่มสินค้าใน Step 1</p>
        </div>
      `;
    }
    return;
  }

  // ตรวจสอบแผนการผ่อนที่เลือก
  const selectedPlan = document.querySelector('input[name="installmentPlan"]:checked');
  const isCustomPlan = selectedPlan && selectedPlan.value === 'manual';

  // ดึงข้อมูลแผนการผ่อนที่เลือก
  let selectedPlanData = null;
  let planName = 'ยังไม่ได้เลือกแผน';
  let planColor = 'text-gray-600';
  let planBg = '';

  if (selectedPlan) {
    if (isCustomPlan) {
      planName = 'แผนกำหนดเอง';
      planColor = 'text-purple-700';
      planBg = 'bg-purple-100';
    } else {
      try {
        selectedPlanData = JSON.parse(selectedPlan.value);
        switch(selectedPlanData.id) {
          case 'plan1':
            planName = 'แผนผ่อนยาว (ดาวน์น้อย)';
            planColor = 'text-green-700';
            planBg = 'bg-green-100';
            break;
          case 'plan2':
            planName = 'แผนผ่อนปานกลาง';
            planColor = 'text-yellow-700';
            planBg = 'bg-yellow-100';
            break;
          case 'plan3':
            planName = 'แผนผ่อนสั้น (ดาวน์มาก)';
            planColor = 'text-red-700';
            planBg = 'bg-red-100';
            break;
          default:
            planName = 'แผนการผ่อนที่เลือก';
            planColor = 'text-blue-700';
            planBg = 'bg-blue-100';
        }
      } catch (e) {
        console.error('Error parsing plan data:', e);
        planName = 'แผนการผ่อนที่เลือก';
        planColor = 'text-blue-700';
        planBg = 'bg-blue-100';
      }
    }
  }

  // คำนวณส่วนลดจากข้อมูลโปรโมชั่น (ถ้ามี)
  let totalDiscount = 0;
  const appliedPromotions = window.InstallmentProduct?.appliedPromotions || {};

  // คำนวณยอดรวมและส่วนลด
  let grandTotal = 0;

  // ตัวแปรสำหรับสี footer (จะใช้ค่าจากสินค้าตัวสุดท้าย)
  let footerBgColor = 'bg-blue-50/30'; // default color

  let html = `
    <div class="space-y-4">
      <div class="flex items-center gap-2 mb-4">
        <i class="bi bi-basket3 text-blue-600"></i>
        <h3 class="text-lg font-semibold text-blue-800">สรุปรายการสินค้า</h3>
        <span class="text-xs ${planBg} ${planColor} px-2 py-1 rounded-full ml-2">${planName}</span>
      </div>
  `;

  cartItems.forEach(item => {
    const promo = appliedPromotions[item._id];

    let down, inst, terms, base;

    if (isCustomPlan) {
      // ใช้ข้อมูลจาก custom plan form
      const customDown = parseFloat(document.getElementById('manualDown')?.value || 0);
      const customTerms = parseInt(document.getElementById('manualTerms')?.value || 0);
      const customInstallment = parseFloat(document.getElementById('manualInstallmentAmount')?.textContent || 0);

      down = customDown;
      inst = customInstallment;
      terms = customTerms;
      base = down + (inst * terms);

      console.log('🔧 Using custom plan values:', { down, inst, terms, base });
    } else if (selectedPlanData) {
      // ใช้ข้อมูลจาก preset plan ที่เลือก
      down = selectedPlanData.down || 0;
      inst = selectedPlanData.perMonth || 0;
      terms = selectedPlanData.count || 0;
      base = down + (inst * terms);

      console.log('📋 Using selected preset plan values:', {
        planId: selectedPlanData.id,
        down, inst, terms, base
      });
    } else {
      // ใช้ข้อมูลเดิมจาก item (fallback)
      down = Number(item.downAmount) || 0;
      inst = Number(item.downInstallment) || 0;
      terms = Number(item.downInstallmentCount) || 0;
      base = down + inst * terms;

      console.log('📋 Using fallback item values:', { down, inst, terms, base });
    }

    // คำนวณภาษีจากข้อมูลสินค้า
    const taxType = item.taxType || 'ไม่มี VAT';
    const taxRate = item.taxRate || 0;
    let taxAmount = 0;
    let totalWithTax = base;

    if (taxType === 'แยกภาษี') {
      taxAmount = base * (taxRate / 100);
      totalWithTax = base + taxAmount;
    } else if (taxType === 'รวมภาษี') {
      const netAmount = base / (1 + (taxRate / 100));
      taxAmount = base - netAmount;
      totalWithTax = base; // ราคารวมภาษีแล้ว
    } else if (taxType === 'มี VAT') {
      const vat = taxRate > 0 ? taxRate : 7;
      taxAmount = base * (vat / 100);
      totalWithTax = base + taxAmount;
    }

    grandTotal += totalWithTax;

    // เลือกสีตามแผนที่เลือก
    let itemBorderColor = '';
    let itemBgColor = '';
    let priceColor = 'text-blue-600';

    if (isCustomPlan) {
      itemBorderColor = 'border-purple-200';
      itemBgColor = 'bg-purple-50/30';
      priceColor = 'text-purple-600';
    } else if (selectedPlanData) {
      switch(selectedPlanData.id) {
        case 'plan1':
          itemBorderColor = 'border-green-200';
          itemBgColor = 'bg-green-50/30';
          priceColor = 'text-green-600';
          break;
        case 'plan2':
          itemBorderColor = 'border-yellow-200';
          itemBgColor = 'bg-yellow-50/30';
          priceColor = 'text-yellow-600';
          break;
        case 'plan3':
          itemBorderColor = 'border-red-200';
          itemBgColor = 'bg-red-50/30';
          priceColor = 'text-red-600';
          break;
        default:
          itemBorderColor = 'border-blue-200';
          itemBgColor = 'bg-blue-50/30';
          priceColor = 'text-blue-600';
      }
    }

    // ใช้ getImageUrl หรือสร้าง fallback
    const imageUrl = window.InstallmentUI?.getImageUrl ?
      window.InstallmentUI.getImageUrl(item.image) :
      (item.image || '/images/no-image.png');

    html += `
      <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${itemBorderColor} ${itemBgColor}">
        <div class="flex gap-4">
          <img src="${imageUrl}" class="w-20 h-20 rounded-lg object-cover border" 
               onerror="this.src='/images/no-image.png'">
          <div class="flex-1">
            <h4 class="font-semibold text-gray-800 mb-1">${item.name || 'ไม่ระบุชื่อ'}</h4>
            <p class="text-sm text-gray-500 mb-2">IMEI: ${item.imei || 'ไม่ระบุ'}</p>
            <div class="flex items-center justify-between">
              <div class="text-right">
                <p class="text-sm text-gray-600">เงินดาวน์: ฿${down.toLocaleString()}</p>
                <p class="text-sm text-gray-600">ผ่อน: ฿${inst.toLocaleString()} x ${terms} งวด</p>
                <div class="border-t border-gray-200 pt-2 mt-2">
                  <p class="text-sm text-gray-600">ยอดก่อนภาษี: ฿${base.toLocaleString()}</p>
                  ${taxAmount > 0 ? `
                    <p class="text-sm text-blue-600">📊 ${taxType} ${taxRate}%: ฿${taxAmount.toLocaleString()}</p>
                  ` : `
                    <p class="text-sm text-gray-500">📊 ${taxType}</p>
                  `}
                  <p class="text-lg font-bold ${priceColor}">รวมทั้งสิ้น: ฿${totalWithTax.toLocaleString()}</p>
                </div>
                ${selectedPlan ? `<p class="text-xs ${planColor} mt-1"><i class="bi bi-check-circle-fill"></i> ${planName}</p>` : ''}
              </div>
            </div>
            ${promo ? `<span class="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">${promo.name}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  });

  // คำนวณภาษีรวมทั้งหมด
  let totalTaxAmount = 0;
  let totalBaseAmount = 0;

  cartItems.forEach(item => {
    const taxType = item.taxType || 'ไม่มี VAT';
    const taxRate = item.taxRate || 0;

    let down, inst, terms, base;

    if (isCustomPlan) {
      const customDown = parseFloat(document.getElementById('manualDown')?.value || 0);
      const customTerms = parseInt(document.getElementById('manualTerms')?.value || 0);
      const customInstallment = parseFloat(document.getElementById('manualInstallmentAmount')?.textContent || 0);

      down = customDown;
      inst = customInstallment;
      terms = customTerms;
      base = down + (inst * terms);
    } else if (selectedPlanData) {
      down = selectedPlanData.down || 0;
      inst = selectedPlanData.perMonth || 0;
      terms = selectedPlanData.count || 0;
      base = down + (inst * terms);
    } else {
      down = Number(item.downAmount) || 0;
      inst = Number(item.downInstallment) || 0;
      terms = Number(item.downInstallmentCount) || 0;
      base = down + inst * terms;
    }

    totalBaseAmount += base;

    if (taxType === 'แยกภาษี') {
      totalTaxAmount += base * (taxRate / 100);
    } else if (taxType === 'รวมภาษี') {
      const netAmount = base / (1 + (taxRate / 100));
      totalTaxAmount += base - netAmount;
    } else if (taxType === 'มี VAT') {
      const vat = taxRate > 0 ? taxRate : 7;
      totalTaxAmount += base * (vat / 100);
    }
  });

  // เพิ่มค่าธรรมเนียมและค่าจัดส่ง
  const documentFee = parseFloat(document.getElementById('documentFee')?.value || 0);
  const shippingFee = parseFloat(document.getElementById('shippingFee')?.value || 0);
  const totalFees = documentFee + shippingFee;

  // กำหนดสียอดรวมตามแผนที่เลือก
  let totalColor = 'text-blue-600';
  if (isCustomPlan) {
    totalColor = 'text-purple-600';
    footerBgColor = 'bg-purple-50/30';
  } else if (selectedPlanData) {
    switch(selectedPlanData.id) {
      case 'plan1':
        totalColor = 'text-green-600';
        footerBgColor = 'bg-green-50/30';
        break;
      case 'plan2':
        totalColor = 'text-yellow-600';
        footerBgColor = 'bg-yellow-50/30';
        break;
      case 'plan3':
        totalColor = 'text-red-600';
        footerBgColor = 'bg-red-50/30';
        break;
    }
  }
  // footerBgColor จะใช้ค่าเริ่มต้น bg-blue-50/30 หากไม่มีแผนถูกเลือก

  // แสดงยอดรวมและส่วนลด (ถ้ามี)
  html += `
    <div class="border-t pt-4 mt-4">
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex justify-between items-center">
          <span class="text-blue-800 font-medium">ยอดรวมก่อนภาษี:</span>
          <span class="text-lg font-semibold text-blue-600">฿${totalBaseAmount.toLocaleString()}</span>
        </div>
        ${totalTaxAmount > 0 ? `
          <div class="flex justify-between items-center mt-2 pt-2 border-t border-blue-200">
            <span class="text-blue-700 font-medium">📊 ภาษีรวม:</span>
            <span class="text-blue-600 font-semibold">฿${totalTaxAmount.toLocaleString()}</span>
          </div>
        ` : ''}
        <div class="flex justify-between items-center mt-2 pt-2 border-t border-blue-200">
          <span class="text-blue-800 font-medium">ยอดรวมพร้อมภาษี:</span>
          <span class="text-lg font-semibold text-blue-600">฿${grandTotal.toLocaleString()}</span>
        </div>
        ${totalFees > 0 ? `
          <div class="flex justify-between items-center mt-2 pt-2 border-t border-blue-200">
            <span class="text-gray-700">ค่าธรรมเนียมและค่าจัดส่ง:</span>
            <span class="text-gray-600">฿${totalFees.toLocaleString()}</span>
          </div>
        ` : ''}
        ${totalDiscount > 0 ? `
          <div class="flex justify-between items-center mt-2 pt-2 border-t border-blue-200">
            <span class="text-green-600 font-medium">ส่วนลดโปรโมชั่น:</span>
            <span class="text-green-600 font-semibold">-฿${totalDiscount.toLocaleString()}</span>
          </div>
        ` : ''}
        <div class="flex justify-between items-center mt-3 pt-3 border-t-2 border-blue-300">
          <span class="text-blue-800 font-bold text-lg">ยอดรวมทั้งสิ้น:</span>
          <span class="text-xl font-bold ${totalColor}">฿${(grandTotal + totalFees - totalDiscount).toLocaleString()}</span>
        </div>
        ${selectedPlan ? `
          <div class="mt-3 pt-3 border-t border-gray-200 ${footerBgColor} -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
            <div class="text-xs ${planColor} flex items-center gap-1">
              <i class="bi bi-info-circle-fill"></i>
              <span>ยอดรวมนี้คำนวณจาก ${planName} (รวมภาษีจากสินค้า)</span>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  html += `</div>`;

  const container = document.getElementById('step3ProductSummary');
  if (container) {
    container.innerHTML = html;
    console.log('✅ สร้างสรุป Step 3 เสร็จสิ้น - รายการ:', cartItems.length, 'ชิ้น', `(${planName})`);
  } else {
    console.error('❌ ไม่พบ element #step3ProductSummary');
  }
}

// สรุป Step 4 - ✅ Enhanced to collect data from all steps
function renderStep4Summary(orderData) {
  console.log('📋 renderStep4Summary called with:', orderData);

  // ✅ Collect complete data from all steps
  const customerData = getCustomerFormData();
  const cartItems = window.InstallmentProduct?.cartItems || window.cartItems || [];
  const selectedPlan = getSelectedPlan();
  const totalAmount = calculateTotalAmount();

  console.log('📊 Complete Step 4 data:', {
    customerData,
    cartItemsCount: cartItems.length,
    selectedPlan,
    totalAmount,
    orderData
  });

  // ✅ Enhanced customer display name
  const customerDisplayName = customerData.firstName && customerData.lastName
    ? `${customerData.prefix || 'นาย'} ${customerData.firstName} ${customerData.lastName}`
    : orderData?.customerName || 'ลูกค้า';

  // ✅ Enhanced product summary
  const productSummary = cartItems.map(item => ({
    name: item.name || 'สินค้า',
    model: item.model || '',
    price: parseFloat(item.price || 0),
    quantity: parseInt(item.quantity || item.qty || 1),
    total: parseFloat(item.total || (item.price * (item.quantity || item.qty || 1))),
    imei: item.imei || '',
    brand: item.brand || '',
    category: item.category || ''
  }));

  // ✅ Enhanced payment plan display
  const paymentDisplay = {
    planName: selectedPlan.planName || getSelectedPlanName(selectedPlan),
    planType: selectedPlan.planType || selectedPlan.type || 'แผนมาตรฐาน',
    downPayment: selectedPlan.downPayment || 0,
    monthlyPayment: selectedPlan.installmentAmount || 0,
    installmentPeriod: selectedPlan.installmentPeriod || 0,
    totalAmount: selectedPlan.totalAmount || totalAmount || 0,
    interestRate: selectedPlan.interestRate || 0
  };

  // ✅ Enhanced HTML with complete information
  const summaryHtml = `
    <div class="space-y-6">
      <!-- Success Header -->
      <div class="text-center p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200 dark:border-green-700">
        <div class="text-4xl mb-2">🎉</div>
        <h2 class="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">สำเร็จ!</h2>
        <p class="text-lg text-gray-700 dark:text-gray-300">บันทึกข้อมูลการผ่อนชำระเรียบร้อยแล้ว</p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">วันที่: ${new Date().toLocaleDateString('th-TH', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</p>
      </div>
      
      <!-- Customer Information -->
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <h3 class="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
          <i class="bi bi-person-check mr-2"></i>
          ข้อมูลลูกค้า
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-600 dark:text-gray-400">ชื่อ-นามสกุล:</span>
            <div class="font-medium text-blue-700 dark:text-blue-400">${customerDisplayName}</div>
          </div>
          <div>
            <span class="text-gray-600 dark:text-gray-400">เลขบัตรประชาชน:</span>
            <div class="font-mono">${customerData.idCard || 'N/A'}</div>
          </div>
          <div>
            <span class="text-gray-600 dark:text-gray-400">โทรศัพท์:</span>
            <div class="font-mono">${customerData.phone || 'N/A'}</div>
          </div>
          <div>
            <span class="text-gray-600 dark:text-gray-400">อีเมล:</span>
            <div class="font-mono text-blue-600 dark:text-blue-400">${customerData.email || 'ไม่ระบุ'}</div>
          </div>
        </div>
        ${customerData.address ? `
          <div class="mt-3 pt-3 border-t border-blue-200 dark:border-blue-600">
            <span class="text-gray-600 dark:text-gray-400">ที่อยู่:</span>
            <div class="text-sm mt-1">${customerData.address}</div>
          </div>
        ` : ''}
      </div>
      
      <!-- Product Summary -->
      <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
        <h3 class="font-semibold text-purple-800 dark:text-purple-300 mb-3 flex items-center">
          <i class="bi bi-bag-check mr-2"></i>
          รายการสินค้า (${productSummary.length} รายการ)
        </h3>
        <div class="space-y-2">
          ${productSummary.map(item => `
            <div class="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded border">
              <div class="flex-1">
                <div class="font-medium">${item.name}</div>
                ${item.model ? `<div class="text-xs text-gray-500">รุ่น: ${item.model}</div>` : ''}
                ${item.imei ? `<div class="text-xs text-gray-500">IMEI: ${item.imei}</div>` : ''}
                ${item.brand ? `<div class="text-xs text-gray-500">ยี่ห้อ: ${item.brand}</div>` : ''}
              </div>
              <div class="text-right">
                <div class="font-medium">จำนวน: ${item.quantity}</div>
                <div class="text-sm text-gray-600">@฿${item.price.toLocaleString()}</div>
                <div class="font-bold text-purple-600 dark:text-purple-400">฿${item.total.toLocaleString()}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="mt-3 pt-3 border-t border-purple-200 dark:border-purple-600 text-right">
          <div class="text-lg font-bold text-purple-700 dark:text-purple-400">
            รวมทั้งสิ้น: ฿${paymentDisplay.totalAmount.toLocaleString()}
          </div>
        </div>
      </div>
      
      <!-- Payment Plan -->
      <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
        <h3 class="font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center">
          <i class="bi bi-credit-card mr-2"></i>
          แผนการผ่อนชำระ
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div class="bg-white dark:bg-gray-800 p-3 rounded border">
            <div class="text-gray-600 dark:text-gray-400">แผนที่เลือก</div>
            <div class="font-medium text-green-600 dark:text-green-400">${paymentDisplay.planName}</div>
          </div>
          <div class="bg-white dark:bg-gray-800 p-3 rounded border">
            <div class="text-gray-600 dark:text-gray-400">เงินดาวน์</div>
            <div class="font-bold text-blue-600 dark:text-blue-400">฿${paymentDisplay.downPayment.toLocaleString()}</div>
          </div>
          <div class="bg-white dark:bg-gray-800 p-3 rounded border">
            <div class="text-gray-600 dark:text-gray-400">ผ่อนต่อเดือน</div>
            <div class="font-bold text-orange-600 dark:text-orange-400">฿${paymentDisplay.monthlyPayment.toLocaleString()}</div>
          </div>
          <div class="bg-white dark:bg-gray-800 p-3 rounded border">
            <div class="text-gray-600 dark:text-gray-400">จำนวนงวด</div>
            <div class="font-bold text-purple-600 dark:text-purple-400">${paymentDisplay.installmentPeriod} งวด</div>
          </div>
        </div>
        
        <!-- Payment Calculation -->
        <div class="mt-4 p-3 bg-green-100 dark:bg-green-800/30 rounded-lg">
          <div class="text-sm text-green-700 dark:text-green-400">
            <div class="flex justify-between items-center">
              <span>ยอดรวมสินค้า:</span>
              <span class="font-medium">฿${paymentDisplay.totalAmount.toLocaleString()}</span>
            </div>
            <div class="flex justify-between items-center">
              <span>เงินดาวน์:</span>
              <span class="font-medium">฿${paymentDisplay.downPayment.toLocaleString()}</span>
            </div>
            <div class="flex justify-between items-center">
              <span>ยอดผ่อน (${paymentDisplay.installmentPeriod} งวด × ฿${paymentDisplay.monthlyPayment.toLocaleString()}):</span>
              <span class="font-medium">฿${(paymentDisplay.monthlyPayment * paymentDisplay.installmentPeriod).toLocaleString()}</span>
            </div>
            <hr class="my-2 border-green-300 dark:border-green-600">
            <div class="flex justify-between items-center font-bold text-base">
              <span>ยอดรวมทั้งสิ้น:</span>
              <span class="text-green-600 dark:text-green-400">฿${(paymentDisplay.downPayment + (paymentDisplay.monthlyPayment * paymentDisplay.installmentPeriod)).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Transaction Details -->
      <div class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 class="font-semibold text-gray-800 dark:text-gray-300 mb-3 flex items-center">
          <i class="bi bi-receipt mr-2"></i>
          รายละเอียดการทำรายการ
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-600 dark:text-gray-400">หมายเลขสัญญา:</span>
            <div class="font-mono font-medium text-blue-600 dark:text-blue-400">${orderData?.contractNo || orderData?.contract_no || 'กำลังสร้าง...'}</div>
          </div>
          <div>
            <span class="text-gray-600 dark:text-gray-400">หมายเลขใบสั่งซื้อ:</span>
            <div class="font-mono font-medium">${orderData?.orderId || orderData?.order_id || 'กำลังสร้าง...'}</div>
          </div>
          <div>
            <span class="text-gray-600 dark:text-gray-400">สาขา:</span>
            <div class="font-medium">${orderData?.branchCode || window.BRANCH_CODE || 'สาขาหลัก'}</div>
          </div>
          <div>
            <span class="text-gray-600 dark:text-gray-400">พนักงานขาย:</span>
            <div class="font-medium">${orderData?.employeeName || window.currentUser?.name || 'พนักงาน'}</div>
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex flex-wrap gap-3 justify-center">
        <button class="btn btn-primary flex items-center gap-2" onclick="window.InstallmentAPI.downloadQuotationPdf()">
          <i class="bi bi-file-earmark-text"></i>
          ดาวน์โหลดใบเสนอราคา
        </button>
        <button class="btn btn-secondary flex items-center gap-2" onclick="window.InstallmentAPI.downloadInvoicePdf()">
          <i class="bi bi-receipt"></i>
          ดาวน์โหลดใบแจ้งหนี้
        </button>
        <button class="btn btn-success flex items-center gap-2" onclick="window.InstallmentAPI.downloadDownPaymentReceiptPdf()">
          <i class="bi bi-file-earmark-check"></i>
          ดาวน์โหลดใบเสร็จค่าดาวน์
        </button>
        <button class="btn btn-info flex items-center gap-2" onclick="window.InstallmentMain?.createNewOrder()">
          <i class="bi bi-plus-circle"></i>
          สร้างรายการใหม่
        </button>
      </div>
      
      <!-- Next Steps Information -->
      <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
        <h4 class="font-semibold text-yellow-800 dark:text-yellow-300 mb-2 flex items-center">
          <i class="bi bi-lightbulb mr-2"></i>
          ขั้นตอนถัดไป
        </h4>
        <div class="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
          <div>• ลูกค้าจะได้รับอีเมลยืนยันการทำรายการ${customerData.email ? ` ที่ ${customerData.email}` : ''}</div>
          <div>• ดาวน์โหลดเอกสารทั้งหมดเพื่อให้ลูกค้าลงนาม</div>
          <div>• ติดตามการชำระเงินดาวน์และการส่งมอบสินค้า</div>
          <div>• ตั้งการแจ้งเตือนสำหรับการชำระค่างวดรายเดือน</div>
        </div>
      </div>
    </div>
  `;

  const container = document.getElementById('step4Summary');
  if (container) {
    container.innerHTML = summaryHtml;
    console.log('✅ Step 4 summary updated successfully');
  } else {
    console.warn('⚠️ step4Summary container not found');
  }

  // ✅ Also update the main step 4 content if no specific summary container
  const step4Content = document.getElementById('step4Content');
  if (!container && step4Content) {
    step4Content.innerHTML = summaryHtml;
    console.log('✅ Step 4 content updated as fallback');
  }
}

// อัปเดตสรุป Step 2
function updateStep2Summary() {
  const customerData = getCustomerFormData();
  const summaryHtml = `
    <div class="space-y-2">
      <h4 class="font-semibold">ข้อมูลลูกค้า</h4>
      <p>${customerData.prefix} ${customerData.firstName} ${customerData.lastName}</p>
      <p>เลขบัตรประชาชน: ${customerData.idCard}</p>
      <p>โทรศัพท์: ${customerData.phone}</p>
      <p>อีเมล: ${customerData.email}</p>
      <p>ที่อยู่: ${customerData.houseNo} หมู่ ${customerData.moo} 
         ต.${customerData.subDistrict} อ.${customerData.district} 
         จ.${customerData.province} ${customerData.zipcode}</p>
    </div>
  `;

  const container = document.getElementById('step2CustomerSummary');
  if (container) {
    container.innerHTML = summaryHtml;
  }
}

// =============== Receipt Voucher Integration ===============

/**
 * สร้างใบสำคัญรับเงินอัตโนมัติสำหรับ Installment
 * @param {Object} installmentData - ข้อมูล installment ที่สร้างสำเร็จ
 * @param {Object} originalPayload - ข้อมูลต้นฉบับที่ส่งไป API
 */
async function syncInstallmentWithReceiptVoucher(installmentData, originalPayload) {
  try {
    console.log('🧾 เริ่มสร้างใบสำคัญรับเงินสำหรับ Installment...');
    console.log('🔍 Original payload:', originalPayload);
    console.log('🔍 Installment data:', installmentData);

    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('ไม่พบ Token การเข้าสู่ระบบ');
    }

    // ✅ แก้ไขการดึงข้อมูลลูกค้าให้ถูกต้อง
    const customerName = originalPayload.customerName ||
      originalPayload.displayName ||
      originalPayload.fullName ||
      `${originalPayload.firstName || ''} ${originalPayload.lastName || ''}`.trim() ||
      'ลูกค้าผ่อน';

    // ✅ แก้ไขการดึงข้อมูลเงินดาวน์ให้ถูกต้อง
    const downPaymentAmount = originalPayload.downPayment || 0;

    if (downPaymentAmount <= 0) {
      console.log('ℹ️ ไม่มีเงินดาวน์ ข้ามการสร้างใบสำคัญรับเงิน');
      return null;
    }

    // ✅ แก้ไขการดึงข้อมูลสินค้าให้ถูกต้อง
    const products = originalPayload.products || originalPayload.items || [];

    // ✅ แก้ไขข้อมูลให้ตรงกับ MongoDB schema
    const contractNo = installmentData.contract_no || installmentData.contractNo || 'N/A';
    const branchCode = originalPayload.branchCode || window.BRANCH_CODE || '00000';

    // ✅ แก้ไขรูปแบบข้อมูลให้ตรงกับ MongoDB Schema
    const receiptVoucherData = {
      // ข้อมูลพื้นฐาน
      paymentDate: new Date().toISOString().split('T')[0], // ใช้ format YYYY-MM-DD
      receivedFrom: customerName,
      receiptType: 'installment_down_payment',
      paymentMethod: 'cash',

      // จำนวนเงินรวม
      totalAmount: downPaymentAmount,
      vatAmount: 0,

      // ✅ แก้ไข: ส่งข้อมูล branchCode ให้ backend แปลงเป็น ObjectId
      branchCode: branchCode,

      // ✅ แก้ไข: ส่งข้อมูล description และ amount แยกให้ backend สร้าง details
      description: `รับค่าดาวน์การผ่อนชำระ - สัญญาเลขที่ ${contractNo}`,
      amount: downPaymentAmount,

      // บัญชี
      debitAccount: {
        code: '11101',
        name: 'เงินสด'
      },
      creditAccount: {
        code: '21104',
        name: 'เงินรับล่วงหน้า - ค่าดาวน์ผ่อน'
      },

      // หมายเหตุและข้อมูลอ้างอิง
      notes: `รับค่าดาวน์การผ่อนชำระ - สัญญาเลขที่ ${contractNo}`,
      contractNumber: contractNo,

      // ข้อมูลสาขา
      branchName: 'สาขาปัตตานี',

      // ข้อมูลลูกค้าและพนักงาน
      customer: {
        name: customerName,
        customerId: originalPayload.idCard || '',
        phone: originalPayload.phone || '',
        address: originalPayload.address || originalPayload.fullAddress || ''
      },
      createdBy: originalPayload.employeeId || window.currentUser?.id || 'system',
      employeeName: originalPayload.employeeName || window.currentUser?.name || 'พนักงาน',

      // ข้อมูลสำหรับ sync API
      source: 'installment',
      sourceId: contractNo,
      sourceType: 'installment_contract',

      // Metadata สำหรับระบุแหล่งที่มา
      metadata: {
        paymentType: 'down_payment',
        isInstallmentRelated: true,
        contractNo: contractNo,
        customerId: originalPayload.idCard || originalPayload.phone,
        autoCreated: true,
        originalAmount: downPaymentAmount,
        totalContractAmount: originalPayload.totalAmount,
        installmentPeriod: originalPayload.installmentTerms || originalPayload.installmentPeriod,
        installmentAmount: originalPayload.monthlyPayment || originalPayload.installmentAmount,
        customerName: customerName,
        productCount: products.length,
        productSummary: products.map(p => `${p.name || 'สินค้า'} ${p.model ? `รุ่น ${p.model}` : ''}`).join(', ')
      }
    };

    console.log('📋 ข้อมูลใบสำคัญรับเงิน:', receiptVoucherData);

    // ส่งข้อมูลไปสร้างใบสำคัญรับเงิน
    const endpoints = [
      '/api/receipt-vouchers/sync',
      '/api/receipt-voucher/sync',
      '/api/receiptVouchers/sync',
      '/api/receiptVoucher/sync'
    ];

    let response = null;
    let foundEndpoint = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 ลองสร้างใบสำคัญรับเงินผ่าน: ${endpoint}`);
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(receiptVoucherData)
        });

        if (response.status !== 404) {
          foundEndpoint = endpoint;
          break;
        }
      } catch (err) {
        console.log(`❌ ${endpoint} ไม่สามารถเชื่อมต่อได้:`, err.message);
      }
    }

    if (!foundEndpoint || !response) {
      throw new Error('ไม่พบ Receipt Voucher API - ระบบใบสำคัญรับเงินยังไม่พร้อมใช้งาน');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'การสร้างใบสำคัญรับเงินล้มเหลว');
    }

    console.log('✅ สร้างใบสำคัญรับเงินสำเร็จ:', result.data?.documentNumber || 'N/A');

    // ✅ เก็บ receiptVoucherId ไว้ใน installmentData สำหรับการดาวน์โหลด PDF
    if (result.data && result.data._id) {
      installmentData.receiptVoucherId = result.data._id;
      installmentData.receiptVoucherNumber = result.data.documentNumber;

      // ✅ อัปเดตใน window.lastSuccessResponse ด้วย
      if (window.lastSuccessResponse) {
        window.lastSuccessResponse.data.receiptVoucherId = result.data._id;
        window.lastSuccessResponse.data.receiptVoucherNumber = result.data.documentNumber;
      }

      // ✅ อัปเดตใน window.currentInstallmentData ด้วย
      if (window.currentInstallmentData) {
        window.currentInstallmentData.receiptVoucherId = result.data._id;
        window.currentInstallmentData.receiptVoucherNumber = result.data.documentNumber;
      }
    }

    if (window.InstallmentUI && window.InstallmentUI.showToast) {
      window.InstallmentUI.showToast(
        `สร้างใบสำคัญรับเงิน ${result.data?.documentNumber || ''} สำเร็จ`,
        'success'
      );
    }

    return result.data;

  } catch (error) {
    console.error('❌ syncInstallmentWithReceiptVoucher error:', error);
    throw error;
  }
}

// =============== Rate Limiting Variables ===============

// เพิ่มตัวแปร global สำหรับควบคุม rate limiting
let lastSubmissionTime = 0;
const MIN_SUBMISSION_INTERVAL = 3000; // 3 วินาที

// =============== Main Save Function ===============

async function saveInstallmentData() {
  try {
    console.log('💾 เริ่มบันทึกข้อมูลการผ่อนชำระ...');

    // ✅ ตรวจสอบ rate limiting
    const now = Date.now();
    const timeSinceLastSubmission = now - lastSubmissionTime;

    if (timeSinceLastSubmission < MIN_SUBMISSION_INTERVAL) {
      const waitTime = MIN_SUBMISSION_INTERVAL - timeSinceLastSubmission;
      const waitSeconds = Math.ceil(waitTime / 1000);

      console.warn(`⏰ Rate limit triggered. Wait ${waitSeconds} seconds.`);

      if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
        window.LoadingSystem.show({
          message: `⏰ กรุณารอ ${waitSeconds} วินาที ก่อนส่งข้อมูลอีกครั้ง`,
          type: 'warning',
          timeout: waitTime
        });
      }

      return false;
    }

    lastSubmissionTime = now;

    console.log('📊 Current window object status:', {
      cartItems: window.cartItems,
      InstallmentUI: !!window.InstallmentUI,
      InstallmentAPI: !!window.InstallmentAPI,
      InstallmentProduct: !!window.InstallmentProduct
    });

    // แสดง loading ด้วย LoadingSystem v2.0.0
    let loaderId = null;
    if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
      loaderId = window.LoadingSystem.show({
        message: 'กำลังบันทึกข้อมูล...',
        showProgress: true,
        autoProgress: true
      });
    } else if (window.InstallmentUI && window.InstallmentUI.showGlobalLoading) {
      window.InstallmentUI.showGlobalLoading('กำลังบันทึกข้อมูล...');
    }

    // รวบรวมข้อมูล
    const customerData = getCustomerFormData();
    const cartItems = window.InstallmentProduct?.cartItems || window.cartItems || [];
    const selectedPlan = getSelectedPlan();

    console.log('📋 Gathered data:', {
      customerData: customerData,
      cartItemsCount: cartItems.length,
      selectedPlan: selectedPlan
    });

    // Debug: ตรวจสอบข้อมูลลูกค้าที่ได้รับจาก form
    console.log('🔍 Customer data details:', {
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      idCard: customerData.idCard,
      phone: customerData.phone,
      email: customerData.email,
      firstNameElement: document.getElementById('customerFirstName')?.value,
      lastNameElement: document.getElementById('customerLastName')?.value,
      elements: {
        firstNameExists: !!document.getElementById('customerFirstName'),
        lastNameExists: !!document.getElementById('customerLastName'),
        firstNameVisible: document.getElementById('customerFirstName')?.offsetParent !== null,
        lastNameVisible: document.getElementById('customerLastName')?.offsetParent !== null
      }
    });

    if (!customerData || !cartItems.length || !selectedPlan) {
      throw new Error('ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบข้อมูลลูกค้าและสินค้า');
    }

    // ตรวจสอบข้อมูลลูกค้าที่จำเป็น
    if (!customerData.firstName || !customerData.firstName.trim()) {
      throw new Error('กรุณากรอกชื่อลูกค้า');
    }

    if (!customerData.lastName || !customerData.lastName.trim()) {
      throw new Error('กรุณากรอกนามสกุลลูกค้า');
    }

    if (!customerData.phone || !customerData.phone.trim()) {
      throw new Error('กรุณากรอกเบอร์โทรศัพท์');
    }

    if (!customerData.idCard || !customerData.idCard.trim()) {
      throw new Error('กรุณากรอกเลขบัตรประชาชน');
    }

    // ตรวจสอบแผนกำหนดเอง
    if (selectedPlan.type === 'manual' || selectedPlan.planType === 'manual') {
      if (!selectedPlan.downPayment || selectedPlan.downPayment <= 0) {
        throw new Error('กรุณากรอกเงินดาวน์สำหรับแผนกำหนดเอง');
      }
      if (!selectedPlan.installmentPeriod || selectedPlan.installmentPeriod <= 0) {
        throw new Error('กรุณาเลือกจำนวนงวดสำหรับแผนกำหนดเอง');
      }
      if (!selectedPlan.installmentAmount || selectedPlan.installmentAmount <= 0) {
        throw new Error('กรุณาคำนวณค่างวดสำหรับแผนกำหนดเอง');
      }
    }

    // ตรวจสอบเอกสารที่จำเป็น
    const requiredDocuments = validateRequiredDocuments();
    if (!requiredDocuments.isValid) {
      throw new Error(`เอกสารไม่ครบถ้วน: ${requiredDocuments.missingDocs.join(', ')}`);
    }

    // 🔧 FIX: Calculate totalAmount properly
    const cartTotal = cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price || 0);
      const quantity = parseInt(item.quantity || item.qty || 1);
      return sum + (price * quantity);
    }, 0);

    // 🔧 FIX: Ensure we have valid values for critical fields
    const finalTotalAmount = selectedPlan.totalAmount || cartTotal || 0;
    const finalDownPayment = selectedPlan.downPayment || selectedPlan.down || 0;
    const finalMonthlyPayment = selectedPlan.installmentAmount || selectedPlan.perMonth || 0;
    const finalInstallmentCount = selectedPlan.installmentPeriod || selectedPlan.count || 0;
    const finalPlanType = selectedPlan.planType || selectedPlan.type || selectedPlan.id || 'plan1';

    console.log('🔧 FIXED VALUES:', {
      cartTotal,
      finalTotalAmount,
      finalDownPayment,
      finalMonthlyPayment,
      finalInstallmentCount,
      finalPlanType
    });

    // ✅ CRITICAL VALIDATION: ตรวจสอบเงินดาวน์ไม่เกินยอดรวม
    if (finalDownPayment > finalTotalAmount) {
      const errorMsg = `เงินดาวน์ (${finalDownPayment.toLocaleString()}) ไม่สามารถมากกว่ายอดรวม (${finalTotalAmount.toLocaleString()}) ได้`;

      console.error('❌ DOWN PAYMENT VALIDATION FAILED:', {
        downPayment: finalDownPayment,
        totalAmount: finalTotalAmount,
        difference: finalDownPayment - finalTotalAmount
      });

      // แสดงข้อผิดพลาดด้วย LoadingSystem
      if (loaderId && window.LoadingSystem && typeof window.LoadingSystem.hide === 'function') {
        window.LoadingSystem.hide(loaderId);
      }

      if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
        window.LoadingSystem.show({
          message: `❌ ${errorMsg}`,
          type: 'error',
          timeout: 5000
        });
      }

      // แก้ไขอัตโนมัติ
      const correctedDown = Math.floor(finalTotalAmount * 0.8); // 80% ของยอดรวม
      console.log('🔧 Auto-correcting down payment to:', correctedDown);

      // อัปเดตแผนการผ่อน
      if (window._autoPlan) {
        window._autoPlan.down = correctedDown;
        window._autoPlan.downPayment = correctedDown;
      }

      // อัปเดต UI
      renderAutoPlans();

      if (window.LoadingSystem && typeof window.LoadingSystem.show === 'function') {
        window.LoadingSystem.show({
          message: `✅ แก้ไขเงินดาวน์เป็น ${correctedDown.toLocaleString()} บาทแล้ว กรุณาลองใหม่`,
          type: 'success',
          timeout: 3000
        });
      }

      throw new Error(errorMsg);
    }

    console.log('✅ Down payment validation passed:', {
      downPayment: finalDownPayment,
      totalAmount: finalTotalAmount,
      isValid: finalDownPayment <= finalTotalAmount
    });

    // สร้าง payload with enhanced data transformation
    const payload = {
      // ✅ FIXED: Match backend expectations exactly
      customerName: `${customerData.firstName} ${customerData.lastName}`.trim(),
      name: `${customerData.firstName} ${customerData.lastName}`.trim(),
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      fullName: `${customerData.prefix || 'นาย'} ${customerData.firstName} ${customerData.lastName}`.trim(),
      displayName: `${customerData.firstName} ${customerData.lastName}`.trim(),
        prefix: customerData.prefix || 'นาย',
      phone: customerData.phone,
      email: customerData.email || '',
      idCard: customerData.idCard,
      facebookUrl: customerData.facebookUrl || '',
      lineId: customerData.lineId || '',
      latitude: customerData.latitude || '',
      longitude: customerData.longitude || '',
      address: customerData.address || `เลขที่ ${customerData.houseNo || ''} หมู่ ${customerData.moo || ''} ตำบล ${customerData.subDistrict || ''} อำเภอ ${customerData.district || ''} จังหวัด ${customerData.province || ''} ${customerData.zipcode || ''}`.trim(),
      fullAddress: customerData.address || `เลขที่ ${customerData.houseNo || ''} หมู่ ${customerData.moo || ''} ตำบล ${customerData.subDistrict || ''} อำเภอ ${customerData.district || ''} จังหวัด ${customerData.province || ''} ${customerData.zipcode || ''}`.trim(),
          houseNo: customerData.houseNo || '',
          moo: customerData.moo || '',
          soi: customerData.soi || '',
          road: customerData.road || '',
          province: customerData.province || '',
      district: customerData.district || '',
      subDistrict: customerData.subDistrict || '',
      zipcode: customerData.zipcode || '',

      // ✅ Products with correct field names
      products: cartItems.map(item => ({
        name: item.name || '',
        model: item.model || '',
        price: parseFloat(item.price || 0),
        quantity: parseInt(item.quantity || item.qty || 1), // ✅ Use 'quantity' as expected by backend
        total: parseFloat(item.total || (item.price * (item.quantity || item.qty || 1))),
        imei: item.imei || '',
        sku: item.sku || '',
        brand: item.brand || '',
        category: item.category || '',
        taxType: item.taxType || 'รวมภาษี',
        taxRate: parseFloat(item.taxRate || 0),
        netAmount: parseFloat(item.netAmount || item.price || 0),
        taxAmount: parseFloat(item.taxAmount || 0),
        totalWithTax: parseFloat(item.totalWithTax || item.total || (item.price * (item.quantity || item.qty || 1))),
        taxDisplay: item.taxDisplay || 'รวมภาษี 0%'
      })),

      // ✅ FIXED: Add these critical fields at root level
      totalAmount: finalTotalAmount,
      planType: finalPlanType,
      downPayment: finalDownPayment,
      monthlyPayment: finalMonthlyPayment,
      installmentTerms: finalInstallmentCount,

      // ✅ Calculate totals
      productSummary: {
        subtotal: cartTotal,
        tax: 0,
        discount: 0,
        grandTotal: cartTotal
      },
      itemCount: cartItems.length,
      productCount: cartItems.length,
      totalItems: cartItems.length,
      totalQuantity: cartItems.reduce((sum, item) => sum + parseInt(item.quantity || item.qty || 1), 0),

      // ✅ Payment plan with correct format
      paymentPlan: {
        selectedPlan: JSON.stringify({
          id: finalPlanType,
          name: selectedPlan.planName || getSelectedPlanName(selectedPlan),
          down: finalDownPayment,
          perMonth: finalMonthlyPayment,
          count: finalInstallmentCount
        }),
        planType: finalPlanType,
        terms: finalInstallmentCount,
        downPayment: finalDownPayment,
        monthlyPayment: finalMonthlyPayment,
        totalAmount: finalTotalAmount,
        interestRate: selectedPlan.interestRate || 0,
        isCustomPlan: selectedPlan.type === 'manual' || selectedPlan.planType === 'manual',
        planId: finalPlanType,
        planName: selectedPlan.planName || getSelectedPlanName(selectedPlan),
        documentFee: parseFloat(document.getElementById('documentFee')?.value || 500),
        shippingFee: parseFloat(document.getElementById('shippingFee')?.value || 0),
        totalFees: parseFloat(document.getElementById('documentFee')?.value || 500) + parseFloat(document.getElementById('shippingFee')?.value || 0)
      },

      selectedPlan: JSON.stringify({
        id: finalPlanType,
        name: selectedPlan.planName || getSelectedPlanName(selectedPlan),
        down: finalDownPayment,
        perMonth: finalMonthlyPayment,
        count: finalInstallmentCount
      }),

      planDetails: JSON.stringify({
        id: finalPlanType,
        name: selectedPlan.planName || getSelectedPlanName(selectedPlan),
        down: finalDownPayment,
        perMonth: finalMonthlyPayment,
        count: finalInstallmentCount
      }),

      interestRate: selectedPlan.interestRate || 0,
      isCustomPlan: selectedPlan.type === 'manual' || selectedPlan.planType === 'manual',
      documentFee: parseFloat(document.getElementById('documentFee')?.value || 500),
      shippingFee: parseFloat(document.getElementById('shippingFee')?.value || 0),
      totalFees: parseFloat(document.getElementById('documentFee')?.value || 500) + parseFloat(document.getElementById('shippingFee')?.value || 0),

      // ✅ Documents with correct field names
      documents: {
        idCardImage: document.getElementById('idCardImageUrl')?.value || '',
        selfieImage: document.getElementById('selfieUrl')?.value || '',
        salarySlipImage: document.getElementById('salarySlipUrl')?.value || '',
        customerSignature: document.getElementById('customerSignatureUrl')?.value || 'data:,',
        salespersonSignature: document.getElementById('salespersonSignatureUrl')?.value || 'data:,',
        authMethod: 'signature',
        fingerprintData: '',
        emailDocuments: {
          quotation: true,
          invoice: true,
          receipt: true
        },
        hasRequiredDocuments: validateRequiredDocuments().isValid,
        hasSignature: !!(document.getElementById('customerSignatureUrl')?.value || document.getElementById('salespersonSignatureUrl')?.value)
      },

      // ✅ Duplicate document fields for backend compatibility
      idCardImage: document.getElementById('idCardImageUrl')?.value || '',
      selfieImage: document.getElementById('selfieUrl')?.value || '',
      salarySlipImage: document.getElementById('salarySlipUrl')?.value || '',
      customerSignature: document.getElementById('customerSignatureUrl')?.value || 'data:,',
      salespersonSignature: document.getElementById('salespersonSignatureUrl')?.value || 'data:,',
      authMethod: 'signature',
      fingerprintData: '',
      hasRequiredDocuments: validateRequiredDocuments().isValid,
      hasSignature: !!(document.getElementById('customerSignatureUrl')?.value || document.getElementById('salespersonSignatureUrl')?.value),
      emailDocuments: {
        quotation: true,
        invoice: true,
        receipt: true
      },

      // ✅ System information
      branchCode: window.BRANCH_CODE || (window.InstallmentAPI?.getBranchCode ? window.InstallmentAPI.getBranchCode() : '00000'),
      employeeName: window.currentUser?.name || 'พนักงาน',
      employeeId: window.currentUser?.id || window.currentUser?._id || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending',
      type: 'installment',
      source: 'web_form',
      version: '2025.01.09',

      // ✅ FIXED: Add duplicate fields that backend might expect
      cart_items: cartItems.map(item => ({
        name: item.name || '',
        model: item.model || '',
        price: parseFloat(item.price || 0),
        quantity: parseInt(item.quantity || item.qty || 1),
        total: parseFloat(item.total || (item.price * (item.quantity || item.qty || 1))),
        imei: item.imei || '',
        sku: item.sku || '',
        brand: item.brand || '',
        category: item.category || '',
        taxType: item.taxType || 'รวมภาษี',
        taxRate: parseFloat(item.taxRate || 0),
        netAmount: parseFloat(item.netAmount || item.price || 0),
        taxAmount: parseFloat(item.taxAmount || 0),
        totalWithTax: parseFloat(item.totalWithTax || item.total || (item.price * (item.quantity || item.qty || 1))),
        taxDisplay: item.taxDisplay || 'รวมภาษี 0%'
      })),

      items: cartItems.map(item => ({
        name: item.name || '',
        model: item.model || '',
        price: parseFloat(item.price || 0),
        quantity: parseInt(item.quantity || item.qty || 1),
        total: parseFloat(item.total || (item.price * (item.quantity || item.qty || 1))),
        imei: item.imei || '',
        sku: item.sku || '',
        brand: item.brand || '',
        category: item.category || '',
        taxType: item.taxType || 'รวมภาษี',
        taxRate: parseFloat(item.taxRate || 0),
        netAmount: parseFloat(item.netAmount || item.price || 0),
        taxAmount: parseFloat(item.taxAmount || 0),
        totalWithTax: parseFloat(item.totalWithTax || item.total || (item.price * (item.quantity || item.qty || 1))),
        taxDisplay: item.taxDisplay || 'รวมภาษี 0%'
      })),

      cart_summary: {
        total_amount: cartTotal,
        item_count: cartItems.length,
        total_quantity: cartItems.reduce((sum, item) => sum + parseInt(item.quantity || item.qty || 1), 0)
      }
    };

    console.log('📋 FINAL Payload:', {
      customerName: payload.customerName,
      totalAmount: payload.totalAmount,
      planType: payload.planType,
      downPayment: payload.downPayment,
      productsCount: payload.products.length,
      fullPayload: payload
    });

    // 🔧 VALIDATE CRITICAL FIELDS BEFORE SENDING
    if (!payload.totalAmount || payload.totalAmount <= 0) {
      throw new Error('ยอดรวมต้องมากกว่า 0');
    }

    if (!payload.planType) {
      throw new Error('กรุณาเลือกแผนการผ่อนชำระ');
    }

    if (!payload.customerName || payload.customerName.trim() === '') {
      throw new Error('กรุณากรอกชื่อลูกค้า');
    }

    if (!payload.phone || payload.phone.trim() === '') {
      throw new Error('กรุณากรอกเบอร์โทรศัพท์');
    }

    // ส่งข้อมูลไป API พร้อม retry mechanism สำหรับ version conflict
    const token = localStorage.getItem('authToken');
    const maxRetries = 3;
    let retryCount = 0;
    let lastError = null;
    let result = null;

    // ✅ Add unique request ID to prevent false duplicates
    const requestId = `installment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    payload.requestId = requestId;

    // 🔧 PREVENT DUPLICATE CLICKS
    if (window._isSubmittingInstallment) {
      console.warn('⚠️ Already submitting, please wait...');
      if (window.InstallmentUI && window.InstallmentUI.showToast) {
        window.InstallmentUI.showToast('กำลังดำเนินการอยู่ กรุณารอสักครู่', 'warning');
      }
      return;
    }

    window._isSubmittingInstallment = true;

    while (retryCount < maxRetries) {
      try {
        console.log(`🌐 ส่งข้อมูลไป API (ครั้งที่ ${retryCount + 1}/${maxRetries})...`);

        // อัพเดท loading message สำหรับ retry
        if (retryCount > 0 && window.LoadingSystem) {
          window.LoadingSystem.updateMessage(loaderId, `กำลังบันทึกข้อมูล... (ลองใหม่ครั้งที่ ${retryCount + 1})`);
        }

    const response = await fetch('/api/installment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Request-ID': requestId // ✅ Add request ID header
      },
      body: JSON.stringify(payload)
    });

        console.log(`📡 Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.text();
          let parsedError = null;

          try {
            parsedError = JSON.parse(errorData);
          } catch (e) {
            // Keep as text if not JSON
          }

          // ✅ Enhanced error handling for different status codes
          const errorMessage = parsedError?.error || errorData;
          const errorCode = parsedError?.code || null;

          // Handle 429 (Too Many Requests / Duplicate Submission) specifically
          if (response.status === 429) {
            const retryAfter = parsedError?.retryAfter || 30;

            if (errorCode === 'DUPLICATE_SUBMISSION') {
              // This is a duplicate submission error - wait longer before retry
              if (retryCount < maxRetries - 1) {
                console.log(`⚠️ Duplicate submission detected, waiting ${retryAfter} seconds before retry...`);
                lastError = new Error(`การส่งข้อมูลซ้ำ กำลังรอ ${retryAfter} วินาที...`);

                // Update loading message for duplicate submission
                if (window.LoadingSystem) {
                  window.LoadingSystem.updateMessage(loaderId, `ตรวจพบการส่งข้อมูลซ้ำ รอ ${retryAfter} วินาที...`);
                }

                // Wait for the retry period
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));

                retryCount++;
                continue;
              } else {
                // Last retry for duplicate submission
                throw new Error('การส่งข้อมูลซ้ำหลายครั้ง กรุณาลองใหม่อีกครั้งหลังจากผ่านไป 1 นาที');
              }
            } else {
              // Other 429 errors - use exponential backoff
              if (retryCount < maxRetries - 1) {
                console.log(`⚠️ Rate limit exceeded, retrying... (${retryCount + 1}/${maxRetries})`);
                lastError = new Error(`เซิร์ฟเวอร์ไม่สามารถรับคำขอได้ในขณะนี้`);

                const waitTime = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
                await new Promise(resolve => setTimeout(resolve, waitTime));

                retryCount++;
                continue;
              } else {
                throw new Error('เซิร์ฟเวอร์ไม่สามารถรับคำขอได้ในขณะนี้ กรุณาลองใหม่อีกครั้งใน 1 นาที');
              }
            }
          }

          // ตรวจสอบว่าเป็น version conflict หรือไม่
          const isVersionConflict = errorMessage.includes('No matching document found') &&
                                  errorMessage.includes('version') &&
                                  response.status === 500;

          if (isVersionConflict && retryCount < maxRetries - 1) {
            console.log(`⚠️ Version conflict detected, retrying... (${retryCount + 1}/${maxRetries})`);
            lastError = new Error(`Database version conflict: ${errorMessage}`);
            retryCount++;

            // รอ 1-3 วินาทีก่อน retry (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, retryCount), 3000);
            console.log(`⏳ รอ ${waitTime}ms ก่อนลองใหม่...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          // ✅ Enhanced error message for different HTTP status codes
          let friendlyError = errorMessage;
          switch (response.status) {
            case 400:
              friendlyError = `ข้อมูลไม่ถูกต้อง: ${errorMessage}`;
              break;
            case 401:
              friendlyError = 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง';
              break;
            case 403:
              friendlyError = 'ไม่มีสิทธิ์ในการดำเนินการนี้';
              break;
            case 404:
              friendlyError = 'ไม่พบบริการที่ร้องขอ';
              break;
            case 500:
              friendlyError = 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์';
              break;
            default:
              friendlyError = `เกิดข้อผิดพลาด (${response.status}): ${errorMessage}`;
          }

          throw new Error(friendlyError);
        }

        result = await response.json();

    if (!result.success) {
          const errorMessage = result.error || 'บันทึกข้อมูลไม่สำเร็จ';

          // ✅ Enhanced validation error handling
          if (result.code === 'VALIDATION_ERROR' && result.details && Array.isArray(result.details)) {
            console.log('🔍 Validation errors detected:', result.details);

            // Show specific validation errors to user
            if (window.InstallmentUI && window.InstallmentUI.showToast) {
              window.InstallmentUI.showToast('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบ:', 'error');

              // Show each validation error
              result.details.forEach((detail, index) => {
                setTimeout(() => {
                  window.InstallmentUI.showToast(`${index + 1}. ${detail}`, 'warning');
                }, (index + 1) * 1000);
              });
            }

            // Try to highlight problematic fields based on error messages
            highlightValidationErrors(result.details);

            // Return a comprehensive error message
            const detailsText = result.details.join('\n• ');
            throw new Error(`ข้อมูลไม่ถูกต้อง:\n• ${detailsText}`);
          }

          // ตรวจสอบว่าเป็น version conflict หรือไม่
          const isVersionConflict = errorMessage.includes('No matching document found') &&
                                  errorMessage.includes('version');

          if (isVersionConflict && retryCount < maxRetries - 1) {
            console.log(`⚠️ Version conflict in response, retrying... (${retryCount + 1}/${maxRetries})`);
            lastError = new Error(`Database version conflict: ${errorMessage}`);
            retryCount++;

            const waitTime = Math.min(1000 * Math.pow(2, retryCount), 3000);
            console.log(`⏳ รอ ${waitTime}ms ก่อนลองใหม่...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          throw new Error(errorMessage);
        }

        // สำเร็จ - ออกจาก loop
        console.log(`✅ บันทึกข้อมูลสำเร็จในครั้งที่ ${retryCount + 1}`);
        break;

      } catch (error) {
        lastError = error;
        retryCount++;

        console.error(`❌ Attempt ${retryCount} failed:`, error.message);

        if (retryCount >= maxRetries) {
          console.error(`❌ ล้มเหลวทั้งหมด ${maxRetries} ครั้ง`);
          break;
        }

        // รอก่อน retry (แต่ไม่ใช่สำหรับ 429 errors ที่จัดการแยกแล้ว)
        if (!error.message.includes('การส่งข้อมูลซ้ำ') && !error.message.includes('เซิร์ฟเวอร์ไม่สามารถรับคำขอได้')) {
        const waitTime = Math.min(1000 * Math.pow(2, retryCount), 3000);
        console.log(`⏳ รอ ${waitTime}ms ก่อนลองใหม่...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // ถ้าล้มเหลวทั้งหมด
    if (!result) {
      const friendlyMessage = lastError?.message?.includes('version') ?
        'ข้อมูลลูกค้าถูกแก้ไขโดยผู้อื่นขณะนี้ กรุณาลองใหม่อีกครั้ง' :
        lastError?.message || 'บันทึกข้อมูลไม่สำเร็จ';

      throw new Error(friendlyMessage);
    }

    // เก็บข้อมูลผลลัพธ์
    window.currentInstallmentData = result.data;
    window.lastSuccessResponse = result; // เก็บ response สำหรับการดาวน์โหลดและอีเมล

    // ✅ แสดงผลลัพธ์ใน Step 4 with enhanced data collection
    console.log('📋 Updating Step 4 with complete data...');
    console.log('📊 Backend response data:', result.data);

    // ✅ สร้างข้อมูลจำลองสำหรับ Step 4 หากไม่มีจาก backend
    const installmentId = result.data?.id || result.data?._id || `INS-${Date.now()}`;
    const contractNo = result.data?.contractNo || result.data?.contract_no || `CON-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const orderId = result.data?.orderId || result.data?.order_id || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const invoiceId = result.data?.invoiceId || result.data?.invoice_id || `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const receiptId = result.data?.receiptId || result.data?.receipt_id || `REC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // รวบรวมข้อมูลจาก Step 1-3 เพื่อส่งไป Step 4
    const completeStepData = {
      ...result.data,  // ข้อมูลจาก backend
      // ✅ เพิ่มข้อมูลที่จำเป็นสำหรับ Step 4
      id: installmentId,
      _id: installmentId,
      installmentId: installmentId,
      contractNo: contractNo,
      contract_no: contractNo,
      orderId: orderId,
      order_id: orderId,
      invoiceId: invoiceId,
      invoice_id: invoiceId,
      receiptId: receiptId,
      receipt_id: receiptId,

      // ✅ เพิ่มข้อมูล receiptVoucherId ที่จำเป็นสำหรับดาวน์โหลด PDF
      receiptVoucherId: result.data?.receiptVoucherId || `RV-${contractNo}`,
      receipt_voucher_id: result.data?.receipt_voucher_id || `RV-${contractNo}`,

      customerData: getCustomerFormData(),  // ข้อมูลลูกค้าจาก Step 2
      cartItems: window.InstallmentProduct?.cartItems || window.cartItems || [],  // ข้อมูลสินค้าจาก Step 1
      selectedPlan: getSelectedPlan(),  // ข้อมูลแผนการผ่อนจาก Step 3
      branchCode: window.BRANCH_CODE || '00000',
      employeeName: window.currentUser?.name || 'พนักงาน',
      status: 'active',
      createdAt: new Date().toISOString(),
      stepSource: 'complete_save'  // ระบุว่าข้อมูลมาจากการบันทึกครบถ้วน
    };

    // ✅ เก็บข้อมูลที่จำเป็นสำหรับการดาวน์โหลด PDF
    window.currentInstallmentData = completeStepData;
    window.lastSuccessResponse = {
      ...result,
      data: completeStepData
    };

    console.log('📊 Complete step data for Step 4:', completeStepData);

    // ใช้ฟังก์ชันที่ปรับปรุงแล้ว
    if (typeof renderStep4Summary === 'function') {
      renderStep4Summary(completeStepData);
      console.log('✅ Enhanced renderStep4Summary called with complete data');
    } else if (window.InstallmentAPI && window.InstallmentAPI.updateStep4Summary) {
      window.InstallmentAPI.updateStep4Summary(completeStepData);
      console.log('✅ updateStep4Summary called with complete data');
    } else {
      console.warn('⚠️ No Step 4 summary function available');
    }

    // ✅ เพิ่มการเรียกใช้ Step 4 automation สำหรับ PDF และ Email
    console.log('📋 Setting up Step 4 automation timeout...');
    setTimeout(async () => {
      console.log('⏰ Step 4 automation timeout triggered');
      console.log('🔍 Checking function availability:');
      console.log('  - processStep4Automation:', typeof processStep4Automation);
      console.log('  - processPdfDownloadAutomation:', typeof processPdfDownloadAutomation);
      console.log('  - window.processStep4Automation:', typeof window.processStep4Automation);
      console.log('  - window.processPdfDownloadAutomation:', typeof window.processPdfDownloadAutomation);

      // ✅ PRODUCTION MODE: Force email automation immediately after successful save
      console.log('📧 Production Mode: Triggering email automation...');

      // 1. ตรวจสอบอีเมลลูกค้า
      const customerEmail = document.getElementById('customerEmail')?.value?.trim();

      if (customerEmail) {
        console.log('📧 Customer email found:', customerEmail);

        // 2. Auto-select all documents for email
        const emailCheckboxes = [
          { id: 'emailQuotation', checked: true },
          { id: 'emailInvoice', checked: true },
          { id: 'emailReceipt', checked: true }
        ];

        emailCheckboxes.forEach(({ id, checked }) => {
          const checkbox = document.getElementById(id);
          if (checkbox) {
            checkbox.checked = checked;
            console.log(`✅ Auto-selected ${id}`);
          }
        });

        // 3. Force email automation with real data
        try {
          if (typeof window.processEmailAutomation === 'function') {
            console.log('🚀 Triggering processEmailAutomation for production...');

            // Update email automation status to ready
            if (window.InstallmentAPI && window.InstallmentAPI.updateEmailStatus) {
              window.InstallmentAPI.updateEmailStatus('ready', 'เตรียมส่งเอกสารทาง Gmail...');
            }

            const emailResult = await window.processEmailAutomation(4);

            if (emailResult.success) {
              console.log('✅ Production email automation successful');

              // Update UI to show success
              if (window.InstallmentAPI && window.InstallmentAPI.updateEmailStatus) {
                window.InstallmentAPI.updateEmailStatus('success', '✅ ส่งเอกสารทาง Gmail สำเร็จ!');
              }
            } else {
              console.warn('⚠️ Email automation returned false, reason:', emailResult.reason);

              // Update UI to show ready state for manual sending
              if (window.InstallmentAPI && window.InstallmentAPI.updateEmailStatus) {
                window.InstallmentAPI.updateEmailStatus('ready', '📧 พร้อมส่งเอกสารทาง Gmail (ส่งแมนนวล)');
              }
            }
          } else {
            console.warn('⚠️ processEmailAutomation function not available');

            // Fallback: Create manual send button
            const emailContainer = document.querySelector('#step4EmailStatus, [id*="email"]');
            if (emailContainer && !document.getElementById('productionEmailButton')) {
              const sendButton = document.createElement('button');
              sendButton.id = 'productionEmailButton';
              sendButton.className = 'btn btn-success btn-sm mt-2';
              sendButton.innerHTML = '<i class="bi bi-envelope-arrow-up"></i> ส่งเอกสารทาง Gmail';
              sendButton.onclick = () => window.forceStep4Gmail();

              emailContainer.appendChild(sendButton);
              console.log('✅ Production email button created');
            }
          }
        } catch (emailError) {
          console.error('❌ Production email automation failed:', emailError);

          // Show error status
          if (window.InstallmentAPI && window.InstallmentAPI.updateEmailStatus) {
            window.InstallmentAPI.updateEmailStatus('error', `❌ ส่งอีเมลไม่สำเร็จ: ${emailError.message}`);
          }
        }
      } else {
        console.log('⚠️ No customer email provided, skipping email automation');

        // Update UI to show no email
        if (window.InstallmentAPI && window.InstallmentAPI.updateEmailStatus) {
          window.InstallmentAPI.updateEmailStatus('info', '📧 ไม่มีอีเมลลูกค้า - ไม่ส่งเอกสาร');
        }
      }

      // ✅ PRODUCTION MODE: Setup PDF download automation
      if (typeof processStep4Automation === 'function' || typeof window.processStep4Automation === 'function') {
        const automationFunc = processStep4Automation || window.processStep4Automation;
        console.log('🚀 เรียกใช้ processStep4Automation สำหรับ Step 4');
        try {
          await automationFunc();
          console.log('✅ Step 4 automation สำเร็จ');
        } catch (error) {
          console.error('❌ Step 4 automation ล้มเหลว:', error);
          // ถ้า processStep4Automation ล้มเหลว ให้ fallback กลับไปใช้ processPdfDownloadAutomation
          const pdfFunc = processPdfDownloadAutomation || window.processPdfDownloadAutomation;
          if (typeof pdfFunc === 'function') {
            console.log('📄 Fallback: เรียกใช้ processPdfDownloadAutomation');
            try {
              await pdfFunc();
              console.log('✅ PDF automation fallback สำเร็จ');
            } catch (pdfError) {
              console.error('❌ PDF automation fallback ล้มเหลว:', pdfError);
            }
          }
        }
      } else {
        console.warn('⚠️ processStep4Automation ไม่พบ, กำลังใช้ processPdfDownloadAutomation');
        const pdfFunc = processPdfDownloadAutomation || window.processPdfDownloadAutomation;
        if (typeof pdfFunc === 'function') {
          console.log('📄 เรียกใช้ processPdfDownloadAutomation สำหรับ Step 4');
          try {
            await pdfFunc();
            console.log('✅ PDF automation สำเร็จ');
          } catch (error) {
            console.error('❌ PDF automation ล้มเหลว:', error);
          }
        } else {
          console.warn('⚠️ processPdfDownloadAutomation ไม่พบ');
          // ✅ Force create PDF buttons manually as last resort
          console.log('🔧 Manual PDF button creation as last resort...');
          try {
            const pdfContainer = document.getElementById('pdfDownloadButtons');
            if (pdfContainer) {
              pdfContainer.innerHTML = `
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

              const pdfStatusBadge = document.getElementById('pdfStatusBadge');
              if (pdfStatusBadge) {
                pdfStatusBadge.textContent = 'พร้อมดาวน์โหลด';
                pdfStatusBadge.className = 'text-xs px-3 py-1 rounded-full bg-green-100 text-green-800';
              }

              console.log('✅ Manual PDF buttons created successfully');
            }
          } catch (manualError) {
            console.error('❌ Manual PDF button creation failed:', manualError);
          }
        }
      }
    }, 2000); // ✅ Production timing: 2 seconds to ensure data is ready

    // ไปยัง Step 4
    if (window.InstallmentMain && window.InstallmentMain.goToStep) {
      window.InstallmentMain.goToStep(4);
    }

    // แสดงข้อความสำเร็จ
    if (window.InstallmentUI && window.InstallmentUI.showToast) {
      window.InstallmentUI.showToast('บันทึกข้อมูลการผ่อนชำระสำเร็จ!', 'success');
    }

    console.log('✅ บันทึกข้อมูลสำเร็จ:', result.data);

    // ✅ สร้างใบสำคัญรับเงินอัตโนมัติหลังจากสร้าง installment สำเร็จ
    try {
      console.log('🧾 เริ่มสร้างใบสำคัญรับเงิน...');
      const receiptVoucherResult = await syncInstallmentWithReceiptVoucher(completeStepData, payload);

      if (receiptVoucherResult) {
        console.log('✅ สร้างใบสำคัญรับเงินสำเร็จ:', receiptVoucherResult.documentNumber);
      } else {
        console.log('ℹ️ ไม่มีการสร้างใบสำคัญรับเงิน (ไม่มีเงินดาวน์)');
      }

    } catch (receiptError) {
      console.error('⚠️ การสร้างใบสำคัญรับเงินล้มเหลว (แต่ installment สำเร็จแล้ว):', receiptError);

      // ✅ แสดงรายละเอียดข้อผิดพลาดให้ชัดเจน
      const errorMessage = receiptError.message || 'ข้อผิดพลาดไม่ทราบสาเหตุ';

      if (window.InstallmentUI && window.InstallmentUI.showToast) {
        window.InstallmentUI.showToast(
          `บันทึก installment สำเร็จ แต่สร้างใบสำคัญรับเงินไม่ได้: ${errorMessage}`,
          'warning'
        );
      }

      // ✅ ไม่ให้ error นี้หยุดการทำงานของ installment
      console.log('ℹ️ ดำเนินการต่อโดยไม่มีใบสำคัญรับเงิน');
    }

    return result.data;

  } catch (error) {
    console.error('❌ Error saving installment data:', error);

    if (window.InstallmentUI && window.InstallmentUI.showToast) {
      window.InstallmentUI.showToast(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`, 'error');
    }

    throw error;

  } finally {
    // 🔧 RESET SUBMISSION FLAG
    window._isSubmittingInstallment = false;

    // ซ่อน loading ด้วย LoadingSystem v2.0.0
    if (loaderId && window.LoadingSystem && typeof window.LoadingSystem.hide === 'function') {
      window.LoadingSystem.hide(loaderId);
    } else if (window.InstallmentUI && window.InstallmentUI.hideGlobalLoading) {
      window.InstallmentUI.hideGlobalLoading();
    }
  }
}

function getSelectedPlan() {
  console.log('🔍 Getting selected plan...');

  // Check installment plan selection
  const selectedRadio = document.querySelector('input[name="installmentPlan"]:checked');

  if (selectedRadio) {
    console.log('📻 Selected radio value:', selectedRadio.value);

    if (selectedRadio.value === 'manual') {
      // Handle custom plan
      const manualData = {
        type: 'manual',
        planType: 'manual',
        planName: 'แผนกำหนดเอง',
        downPayment: parseFloat(document.getElementById('manualDown')?.value || 0),
        installmentAmount: parseFloat(document.getElementById('manualInstallmentAmount')?.textContent || 0),
        installmentPeriod: parseInt(document.getElementById('manualTerms')?.value || 0),
        interestRate: 0,
        totalAmount: 0
      };

      // Calculate total amount for manual plan
      manualData.totalAmount = manualData.downPayment + (manualData.installmentAmount * manualData.installmentPeriod);

      console.log('📋 Manual plan data:', manualData);
      return manualData;
    } else {
      // Handle other payment plan types (plan1, plan2, plan3)
      // ✅ Enhanced JSON parsing with better error handling
      if (selectedRadio.value && selectedRadio.value !== 'manual') {
        try {
          const planData = JSON.parse(selectedRadio.value);
          console.log('📋 Parsed plan data:', planData);

          const downPayment = parseFloat(planData.down || 0);
          const installmentAmount = parseFloat(planData.perMonth || 0);
          const installmentPeriod = parseInt(planData.count || 0);

          const autoData = {
            type: planData.id || 'plan1',
            planType: planData.id || 'plan1',
            planName: planData.name || getSelectedPlanName({ planType: planData.id || 'plan1' }),
            downPayment: downPayment,
            installmentAmount: installmentAmount,
            installmentPeriod: installmentPeriod,
            interestRate: 0,
            totalAmount: downPayment + (installmentAmount * installmentPeriod)
          };

          console.log('📋 Auto plan data:', autoData);
          return autoData;
        } catch (e) {
          console.error('❌ Error parsing plan data in getSelectedPlan:', e, 'Value:', selectedRadio.value);
          console.warn('⚠️ Falling back to manual plan due to JSON parsing error');
        }
      }
    }
  }

  // ✅ Enhanced fallback: try to get from manual fields or use default
  console.log('⚠️ No radio selected, trying fallback...');

  // Try to get manual plan values from form
  const manualDown = parseFloat(document.getElementById('manualDown')?.value || 0);
  const manualInstallmentAmount = parseFloat(document.getElementById('manualInstallmentAmount')?.textContent || 0);
  const manualTerms = parseInt(document.getElementById('manualTerms')?.value || 0);

  if (manualDown > 0 && manualInstallmentAmount > 0 && manualTerms > 0) {
    const fallbackData = {
    type: 'manual',
    planType: 'manual',
      planName: 'แผนกำหนดเอง',
      downPayment: manualDown,
      installmentAmount: manualInstallmentAmount,
      installmentPeriod: manualTerms,
      interestRate: 0,
      totalAmount: manualDown + (manualInstallmentAmount * manualTerms)
    };

    console.log('📋 Fallback manual plan data:', fallbackData);
    return fallbackData;
  }

  // ✅ Ultimate fallback: create a default plan based on cart total
  const cartTotal = calculateTotalAmount();
  const defaultDownPayment = Math.max(cartTotal * 0.3, 1000); // 30% down payment, minimum 1000
  const remainingAmount = cartTotal - defaultDownPayment;
  const defaultTerms = 12;
  const defaultInstallmentAmount = Math.ceil(remainingAmount / defaultTerms);

  const defaultData = {
    type: 'manual',
    planType: 'manual',
    planName: 'แผนเริ่มต้น',
    downPayment: defaultDownPayment,
    installmentAmount: defaultInstallmentAmount,
    installmentPeriod: defaultTerms,
    interestRate: 0,
    totalAmount: defaultDownPayment + (defaultInstallmentAmount * defaultTerms)
  };

  console.log('📋 Default plan data:', defaultData);
  console.warn('⚠️ Using default plan because no plan was selected');

  return defaultData;
}

// ✅ Helper function to get plan name based on plan type
function getSelectedPlanName(plan) {
  if (plan.type === 'manual' || plan.planType === 'manual') {
    return 'แผนกำหนดเอง';
  }

  const planNames = {
    'plan1': 'แผนผ่อนยาว (ดาวน์น้อย)',
    'plan2': 'แผนผ่อนปานกลาง',
    'plan3': 'แผนผ่อนสั้น (ดาวน์มาก)'
  };

  return planNames[plan.planType || plan.type] || 'แผนผ่อนมาตรฐาน';
}

function calculateTotalAmount() {
  const cartItems = window.InstallmentProduct?.cartItems || window.cartItems || [];

  // ✅ Enhanced total calculation with better logic
  let total = 0;

  // Method 1: Try to get from selected plan
  const selectedPlan = getSelectedPlan();
  if (selectedPlan && selectedPlan.totalAmount > 0) {
    total = selectedPlan.totalAmount;
  } else {
    // Method 2: Calculate from cart items
    total = cartItems.reduce((sum, item) => {
      const price = parseFloat(item.price || 0);
      const quantity = parseInt(item.quantity || item.qty || 1);
      const itemTotal = parseFloat(item.total || (price * quantity));
    return sum + itemTotal;
  }, 0);
  }

  console.log('💰 Calculated total amount:', total, 'from', cartItems.length, 'items');
  return total;
}

// Use formatPrice from InstallmentCore to avoid duplication
// function formatPrice(num) { // REMOVED: Use InstallmentCore.formatPrice instead }

// =============== Debug Functions ===============

// เพิ่มฟังก์ชันสำหรับตรวจสอบข้อมูลก่อนส่ง
window.debugPaymentPlan = function() {
  const selectedPlan = getSelectedPlan();
  const cartItems = window.InstallmentProduct?.cartItems || window.cartItems || [];

  // คำนวณยอดรวมที่แท้จริง
  const totalAmount = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price || 0);
    const quantity = parseInt(item.quantity || item.qty || 1);
    return sum + (price * quantity);
  }, 0);

  console.log('🔍 PAYMENT PLAN DEBUG:');
  console.log('=====================');
  console.log('Cart Items:', cartItems);
  console.log('Total Amount:', totalAmount);
  console.log('Selected Plan:', selectedPlan);
  console.log('Down Payment:', selectedPlan.downPayment || selectedPlan.down || 0);
  console.log('Is Valid:', (selectedPlan.downPayment || selectedPlan.down || 0) <= totalAmount);
  console.log('=====================');

  return {
    cartItems,
    totalAmount,
    selectedPlan,
    downPayment: selectedPlan.downPayment || selectedPlan.down || 0,
    isValid: (selectedPlan.downPayment || selectedPlan.down || 0) <= totalAmount
  };
};

// ฟังก์ชันสำหรับรีเซ็ต rate limiting
window.resetRateLimit = function() {
  lastSubmissionTime = 0;
  console.log('✅ Rate limit reset');
};

// ฟังก์ชันสำหรับทดสอบการคำนวณแผนการผ่อน
window.testPaymentCalculation = function() {
  console.log('🧪 Testing payment calculation...');
  renderAutoPlans();
  return window.debugPaymentPlan();
};

// =============== MODULE EXPORT ===============

// Export InstallmentBusiness module
window.InstallmentBusiness = {
  // Plan calculation functions
  renderAutoPlans,
  updateStandardValues,
  bindAutoPlanRadios,
  handlePlanRadioChange,
  updatePlanSummaryDisplay,
  getPlanSummaryText,

  // Manual plan functions
  initManualTerms,
  getManualMaxTerms,
  calculateManualPlan,
  renderManualPlanSummary,
  updateManualPlan,
  syncCustomPlanSummary,
  bindCustomPlanInputs,
  handleCustomPlanChange,

  // Summary functions
  renderStep3Summary,
  renderStep4Summary,
  updateStep2Summary,

  // Main functions
  saveInstallmentData,
  getSelectedPlan,
  getSelectedPlanName,
  calculateTotalAmount,
  formatPrice,

  // Validation functions
  validateRequiredDocuments,
  setupFieldValidation,

  // State management
  saveProgress,
  loadProgress,
  clearProgress,

  // Debug functions
  debugCustomerFormData,
  highlightEmptyRequiredFields,
  testInstallmentSystemFixes
};

// Make key functions global for HTML inline calls
window.renderStep4Summary = renderStep4Summary;
window.saveInstallmentData = saveInstallmentData;
window.getSelectedPlan = getSelectedPlan;
window.calculateTotalAmount = calculateTotalAmount;

console.log('✅ InstallmentBusiness module exported with renderStep4Summary');