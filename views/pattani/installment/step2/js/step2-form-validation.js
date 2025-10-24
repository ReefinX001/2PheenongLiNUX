// ======================= STEP 2 FORM VALIDATION FUNCTIONS =======================

// Format ID Card number (แก้ไขปัญหาไม่สามารถป้อนเลขตัวสุดท้ายได้)
function formatIdCard(input) {
  // เก็บ cursor position ไว้
  const cursorPosition = input.selectionStart;

  // ลบอักขระที่ไม่ใช่ตัวเลขออก
  let value = input.value.replace(/\D/g, '');

  // จำกัดจำนวนตัวเลขไม่เกิน 13 หลัก
  if (value.length > 13) {
    value = value.substring(0, 13);
  }

  // ถ้าไม่มีตัวเลขเลย ให้ clear ทั้งหมด
  if (value.length === 0) {
    input.value = '';
    return;
  }

  // Format เป็นรูปแบบ 0-0000-00000-00-0
  let formatted = '';
  if (value.length >= 1) {
    formatted = value.substring(0, 1);
  }
  if (value.length >= 2) {
    formatted += '-' + value.substring(1, 5);
  }
  if (value.length >= 6) {
    formatted += '-' + value.substring(5, 10);
  }
  if (value.length >= 11) {
    formatted += '-' + value.substring(10, 12);
  }
  if (value.length >= 13) {
    formatted += '-' + value.substring(12, 13);
  }

  // อัปเดตค่าใน input
  input.value = formatted;

  // คำนวณ cursor position ใหม่
  let newCursorPosition = cursorPosition;
  const oldLength = input.value.length;
  const newLength = formatted.length;

  if (newLength > oldLength) {
    // เพิ่มเครื่องหมาย - แล้ว ให้เลื่อน cursor
    newCursorPosition += (newLength - oldLength);
  }

  // จำกัด cursor position ไม่ให้เกินความยาวของ string
  newCursorPosition = Math.min(newCursorPosition, formatted.length);

  // ตั้งค่า cursor position ใหม่
  input.setSelectionRange(newCursorPosition, newCursorPosition);
}

// ✅ Enhanced Thai ID Card validation (สูตรการตรวจสอบเลขบัตรประชาชนไทย)
function validateIdCard(idCard) {
  // ลบเครื่องหมาย - และช่องว่างออก
  const cleanId = idCard.replace(/[-\s]/g, '');

  // ตรวจสอบความยาว
  if (cleanId.length !== 13) {
    return {
      isValid: false,
      message: 'เลขบัตรประชาชนต้องมี 13 หลัก'
    };
  }

  // ตรวจสอบว่าเป็นตัวเลขทั้งหมด
  if (!/^\d{13}$/.test(cleanId)) {
    return {
      isValid: false,
      message: 'เลขบัตรประชาชนต้องเป็นตัวเลขเท่านั้น'
    };
  }

  // ตรวจสอบรูปแบบพิเศษที่ไม่ถูกต้อง
  if (/^0{13}$|^1{13}$|^2{13}$|^3{13}$|^4{13}$|^5{13}$|^6{13}$|^7{13}$|^8{13}$|^9{13}$/.test(cleanId)) {
    return {
      isValid: false,
      message: 'เลขบัตรประชาชนไม่ถูกต้อง'
    };
  }

  // สูตรการตรวจสอบเลขบัตรประชาชนไทย
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanId.charAt(i)) * (13 - i);
  }

  const remainder = sum % 11;
  let checkDigit;

  if (remainder < 2) {
    checkDigit = 1 - remainder;
  } else {
    checkDigit = 11 - remainder;
  }

  // ตรวจสอบหลักสุดท้าย
  const isValidChecksum = checkDigit === parseInt(cleanId.charAt(12));

  return {
    isValid: isValidChecksum,
    message: isValidChecksum ? 'เลขบัตรประชาชนถูกต้อง' : 'เลขบัตรประชาชนไม่ถูกต้อง'
  };
}

// ✅ Enhanced validation with UI feedback
function validateAndShowIdCardStatus(input) {
  const validation = validateIdCard(input.value);

  // ลบ class เก่า
  input.classList.remove('tax-id-valid', 'tax-id-invalid');

  // ลบข้อความ error เก่า
  const errorElement = input.parentElement.querySelector('.validation-message');
  if (errorElement) {
    errorElement.remove();
  }

  // ถ้ามีการป้อนข้อมูลและครบ 13 หลัก
  const cleanValue = input.value.replace(/[-\s]/g, '');
  if (cleanValue.length === 13) {
    if (validation.isValid) {
      input.classList.add('tax-id-valid');
      showValidationMessage(input, validation.message, 'success');
      if (typeof showToast === 'function') {
        showToast('✅ ' + validation.message, 'success');
      }
    } else {
      input.classList.add('tax-id-invalid');
      showValidationMessage(input, validation.message, 'error');
      if (typeof showToast === 'function') {
        showToast('❌ ' + validation.message, 'error');
      }
    }
  } else if (cleanValue.length > 0) {
    showValidationMessage(input, 'เลขบัตรประชาชนต้องมี 13 หลัก', 'error');
  }

  return validation.isValid;
}

// ✅ Helper function to show validation messages
function showValidationMessage(input, message, type) {
  // ลบข้อความเก่า
  const existingMessage = input.parentElement.querySelector('.validation-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  // สร้างข้อความใหม่
  const messageElement = document.createElement('div');
  messageElement.className = `validation-message ${type}`;
  messageElement.style.fontSize = '0.875rem';
  messageElement.style.marginTop = '0.25rem';
  messageElement.style.color = type === 'error' ? '#ef4444' : '#10b981';
  messageElement.textContent = message;

  // แสดงข้อความใต้ input
  input.parentElement.appendChild(messageElement);
}

// ✅ Enhanced Thai phone number validation
function validateThaiPhoneNumber(phoneNumber) {
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  // ตรวจสอบความยาว
  if (cleanPhone.length < 9 || cleanPhone.length > 10) {
    return {
      isValid: false,
      message: 'เบอร์โทรศัพท์ต้องมี 9-10 หลัก'
    };
  }

  // ตรวจสอบรูปแบบเบอร์โทรไทย
  const mobilePatterns = [
    /^0[6-9]\d{8}$/, // เบอร์มือถือ 06x, 07x, 08x, 09x
    /^0[2-5]\d{7,8}$/ // เบอร์บ้าน 02x, 03x, 04x, 05x
  ];

  const isValidPattern = mobilePatterns.some(pattern => pattern.test(cleanPhone));

  if (!isValidPattern) {
    return {
      isValid: false,
      message: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'
    };
  }

  return {
    isValid: true,
    message: 'เบอร์โทรศัพท์ถูกต้อง'
  };
}

// ✅ Enhanced email validation for Thai users
function validateThaiEmail(email) {
  if (!email) {
    return {
      isValid: true,
      message: '' // อีเมลไม่บังคับ
    };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return {
      isValid: false,
      message: 'รูปแบบอีเมลไม่ถูกต้อง'
    };
  }

  // ตรวจสอบการใช้อักขระไทยในอีเมล (ไม่แนะนำ)
  if (/[\u0E00-\u0E7F]/.test(email)) {
    return {
      isValid: false,
      message: 'อีเมลไม่ควรมีอักษรไทย'
    };
  }

  return {
    isValid: true,
    message: 'อีเมลถูกต้อง'
  };
}

// ✅ Enhanced form auto-save functionality
function setupAutoSave() {
  const formFields = [
    'customerFirstName', 'customerLastName', 'customerIdCard', 'customerPhone',
    'customerEmail', 'customerBirthDate', 'customerAge', 'customerOccupation',
    'customerIncome', 'customerWorkplace', 'houseNo', 'moo', 'soi', 'road',
    'province', 'district', 'subDistrict', 'zipcode'
  ];

  formFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('blur', () => {
        saveFormData();
      });
    }
  });

  // Auto-save every 30 seconds
  setInterval(() => {
    saveFormData();
  }, 30000);
}

// ✅ Save form data to localStorage
function saveFormData() {
  try {
    const formData = {
      customerFirstName: document.getElementById('customerFirstName')?.value || '',
      customerLastName: document.getElementById('customerLastName')?.value || '',
      customerIdCard: document.getElementById('customerIdCard')?.value || '',
      customerPhone: document.getElementById('customerPhone')?.value || '',
      customerEmail: document.getElementById('customerEmail')?.value || '',
      customerBirthDate: document.getElementById('customerBirthDate')?.value || '',
      customerAge: document.getElementById('customerAge')?.value || '',
      customerOccupation: document.getElementById('customerOccupation')?.value || '',
      customerIncome: document.getElementById('customerIncome')?.value || '',
      customerWorkplace: document.getElementById('customerWorkplace')?.value || '',
      houseNo: document.getElementById('houseNo')?.value || '',
      moo: document.getElementById('moo')?.value || '',
      soi: document.getElementById('soi')?.value || '',
      road: document.getElementById('road')?.value || '',
      province: document.getElementById('province')?.value || '',
      district: document.getElementById('district')?.value || '',
      subDistrict: document.getElementById('subDistrict')?.value || '',
      zipcode: document.getElementById('zipcode')?.value || '',
      savedAt: new Date().toISOString()
    };

    localStorage.setItem('step2FormData', JSON.stringify(formData));
    console.log('📄 Form data auto-saved');

  } catch (error) {
    console.error('❌ Error saving form data:', error);
  }
}

// ✅ Load saved form data
function loadSavedFormData() {
  try {
    const savedData = localStorage.getItem('step2FormData');
    if (!savedData) return;

    const formData = JSON.parse(savedData);

    // Only restore if saved within last 24 hours
    const savedTime = new Date(formData.savedAt);
    const now = new Date();
    const hoursDiff = (now - savedTime) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      localStorage.removeItem('step2FormData');
      return;
    }

    // Restore form values
    Object.keys(formData).forEach(key => {
      if (key !== 'savedAt') {
        const field = document.getElementById(key);
        if (field && formData[key]) {
          field.value = formData[key];

          // Trigger validation for specific fields
          if (key === 'customerIdCard' && typeof formatIdCard === 'function') {
            formatIdCard(field);
          }
        }
      }
    });

    console.log('✅ Restored saved form data');

    // Show notification
    if (typeof showToast === 'function') {
      showToast('📝 คืนค่าข้อมูลที่บันทึกไว้', 'info');
    }

  } catch (error) {
    console.error('❌ Error loading saved form data:', error);
    localStorage.removeItem('step2FormData');
  }
}

// ✅ Thai language format helpers
function formatThaiCurrency(amount) {
  if (!amount || isNaN(amount)) return '0 บาท';

  const number = parseFloat(amount);
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(number);
}

// ✅ Thai date formatter
function formatThaiDate(date) {
  if (!date) return '';

  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return date;
  }
}

// ✅ Initialize all validation and auto-save on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  // Setup auto-save
  setTimeout(() => {
    setupAutoSave();
    loadSavedFormData();
  }, 1000);

  // Setup ID card formatting
  const idCardField = document.getElementById('customerIdCard');
  if (idCardField) {
    idCardField.addEventListener('input', function() {
      formatIdCard(this);
    });

    idCardField.addEventListener('blur', function() {
      validateAndShowIdCardStatus(this);
    });
  }

  // Setup phone number validation
  const phoneField = document.getElementById('customerPhone');
  if (phoneField) {
    phoneField.addEventListener('blur', function() {
      const validation = validateThaiPhoneNumber(this.value);
      if (validation.isValid) {
        showValidationMessage(this, validation.message, 'success');
      } else if (this.value.trim()) {
        showValidationMessage(this, validation.message, 'error');
      }
    });
  }

  // Setup email validation
  const emailField = document.getElementById('customerEmail');
  if (emailField) {
    emailField.addEventListener('blur', function() {
      if (this.value.trim()) {
        const validation = validateThaiEmail(this.value);
        if (validation.isValid) {
          showValidationMessage(this, validation.message, 'success');
        } else {
          showValidationMessage(this, validation.message, 'error');
        }
      }
    });
  }

  console.log('✅ Enhanced form validation and auto-save initialized');
});

// Calculate age from birth date
function calculateAge(birthDate) {
  if (!birthDate) return '';

  const birth = new Date(birthDate);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

// Validate age (ต้องอายุ 18-80 ปี)
function validateAge(age) {
  const numAge = parseInt(age);
  return numAge >= 18 && numAge <= 80;
}

// Format phone number (Thai format)
function formatPhoneNumber(input) {
  let value = input.value.replace(/\D/g, '');

  // จำกัดความยาวไม่เกิน 10 หลัก
  if (value.length > 10) {
    value = value.substring(0, 10);
  }

  // Format เป็น 000-000-0000
  if (value.length >= 6) {
    value = value.substring(0, 3) + '-' + value.substring(3, 6) + '-' + value.substring(6);
  } else if (value.length >= 3) {
    value = value.substring(0, 3) + '-' + value.substring(3);
  }

  input.value = value;
}

// Validate email
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Auto-save form data
function autoSaveFormData() {
  const formData = {
    customerFirstName: document.getElementById('customerFirstName')?.value || '',
    customerLastName: document.getElementById('customerLastName')?.value || '',
    customerIdCard: document.getElementById('customerIdCard')?.value || '',
    customerPhone: document.getElementById('customerPhone')?.value || '',
    customerEmail: document.getElementById('customerEmail')?.value || '',
    customerBirthDate: document.getElementById('customerBirthDate')?.value || '',
    customerAge: document.getElementById('customerAge')?.value || '',
    customerOccupation: document.getElementById('customerOccupation')?.value || '',
    customerIncome: document.getElementById('customerIncome')?.value || '',
    lastSaved: new Date().toISOString()
  };

  localStorage.setItem('step2_autoSave', JSON.stringify(formData));
}

// Load auto-saved form data
function loadAutoSavedData() {
  const saved = localStorage.getItem('step2_autoSave');
  if (saved) {
    try {
      const data = JSON.parse(saved);

      // โหลดข้อมูลกลับมา
      Object.keys(data).forEach(key => {
        if (key !== 'lastSaved') {
          const element = document.getElementById(key);
          if (element && data[key]) {
            element.value = data[key];
          }
        }
      });

      console.log('Auto-saved data loaded:', data.lastSaved);
    } catch (error) {
      console.error('Error loading auto-saved data:', error);
    }
  }
}

// Form progress tracking
function calculateFormProgress() {
  const requiredFields = [
    'customerFirstName',
    'customerLastName',
    'customerIdCard',
    'customerPhone',
    'customerBirthDate',
    'customerAge',
    'customerOccupation',
    'customerIncome',
    'houseNo',
    'province',
    'district',
    'subDistrict',
    'zipcode'
  ];

  let filledFields = 0;

  requiredFields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element && element.value.trim()) {
      filledFields++;
    }
  });

  return Math.round((filledFields / requiredFields.length) * 100);
}

function updateFormProgress() {
  const progress = calculateFormProgress();
  const progressBar = document.querySelector('.form-progress-bar');
  const progressText = document.getElementById('formProgressText');

  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }

  if (progressText) {
    progressText.textContent = `${progress}%`;
  }

  // เปลี่ยนสีตามความคืบหน้า
  if (progressBar) {
    if (progress < 30) {
      progressBar.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
    } else if (progress < 70) {
      progressBar.style.background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
    } else {
      progressBar.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
    }
  }
}

function setupFormProgressTracking() {
  const requiredFields = [
    'customerFirstName',
    'customerLastName',
    'customerIdCard',
    'customerPhone',
    'customerBirthDate',
    'customerAge',
    'customerOccupation',
    'customerIncome',
    'houseNo',
    'province',
    'district',
    'subDistrict',
    'zipcode'
  ];

  requiredFields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.addEventListener('input', updateFormProgress);
      element.addEventListener('change', updateFormProgress);
    }
  });
}

// Helper function to get clean ID card number
function getCleanIdCard(fieldId) {
  const element = document.getElementById(fieldId);
  if (element) {
    return element.value.replace(/-/g, '');
  }
  return '';
}

// Helper function to get validated ID card
function getValidatedIdCard(fieldId) {
  const cleanId = getCleanIdCard(fieldId);
  if (cleanId && validateIdCard(cleanId)) {
    return cleanId;
  }
  return null;
}

// Setup form validation event listeners
function setupFormValidationEventListeners() {
  // ID Card formatting and validation
  const idCardInput = document.getElementById('customerIdCard');
  if (idCardInput) {
    idCardInput.addEventListener('input', function() {
      formatIdCard(this);
    });

    idCardInput.addEventListener('blur', function() {
      validateAndShowIdCardStatus(this);
    });
  }

  // Phone number formatting
  const phoneInput = document.getElementById('customerPhone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function() {
      formatPhoneNumber(this);
    });
  }

  // Email validation
  const emailInput = document.getElementById('customerEmail');
  if (emailInput) {
    emailInput.addEventListener('blur', function() {
      if (this.value && !validateEmail(this.value)) {
        showToast('รูปแบบอีเมลไม่ถูกต้อง', 'warning');
        this.classList.add('border-red-500');
      } else {
        this.classList.remove('border-red-500');
      }
    });
  }

  // Age validation
  const ageInput = document.getElementById('customerAge');
  if (ageInput) {
    ageInput.addEventListener('input', function() {
      const age = parseInt(this.value);
      this.classList.remove('age-validation-success', 'age-validation-error');

      if (age && validateAge(age)) {
        this.classList.add('age-validation-success');
      } else if (this.value) {
        this.classList.add('age-validation-error');
      }
    });
  }

  console.log('✅ Form validation event listeners setup');
}

// Export functions to global scope
window.formatIdCard = formatIdCard;
window.validateIdCard = validateIdCard;
window.validateAndShowIdCardStatus = validateAndShowIdCardStatus;
window.calculateAge = calculateAge;
window.validateAge = validateAge;
window.formatPhoneNumber = formatPhoneNumber;
window.validateEmail = validateEmail;
window.autoSaveFormData = autoSaveFormData;
window.loadAutoSavedData = loadAutoSavedData;
window.calculateFormProgress = calculateFormProgress;
window.updateFormProgress = updateFormProgress;
window.setupFormProgressTracking = setupFormProgressTracking;
window.getCleanIdCard = getCleanIdCard;
window.getValidatedIdCard = getValidatedIdCard;
window.setupFormValidationEventListeners = setupFormValidationEventListeners;