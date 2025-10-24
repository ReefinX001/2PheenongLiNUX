/**
 * Step 2 Integration - Customer Data & Documents
 * เชื่อมต่อกับ Global Data Manager และ quotationController
 * @version 1.0.0
 */

class Step2Integration {
  constructor() {
    this.isInitialized = false;
    this.customerData = {};
    this.documentData = {};
    this.validationErrors = [];

    this.initialize();
  }

  initialize() {
    console.log('📋 Initializing Step 2 Integration...');

    // Wait for Global Data Manager
    if (typeof window.globalInstallmentManager === 'undefined') {
      console.log('⏳ Waiting for Global Data Manager...');
      setTimeout(() => this.initialize(), 100);
      return;
    }

    this.setupFormValidation();
    this.setupEventListeners();
    this.loadExistingData();
    this.setupDocumentManager();

    this.isInitialized = true;
    console.log('✅ Step 2 Integration initialized');
  }

  // ========== FORM VALIDATION ==========

  setupFormValidation() {
    // ✅ Enhanced form validation with Thai language support
    const requiredFields = [
      {
        id: 'customerFirstName',
        message: 'กรุณากรอกชื่อ',
        validator: (value) => {
          if (!value || value.trim().length < 1) return { isValid: false, message: 'กรุณากรอกชื่อ' };
          if (value.trim().length < 2) return { isValid: false, message: 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร' };
          return { isValid: true, message: 'ชื่อถูกต้อง' };
        }
      },
      {
        id: 'customerLastName',
        message: 'กรุณากรอกนามสกุล',
        validator: (value) => {
          if (!value || value.trim().length < 1) return { isValid: false, message: 'กรุณากรอกนามสกุล' };
          if (value.trim().length < 2) return { isValid: false, message: 'นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร' };
          return { isValid: true, message: 'นามสกุลถูกต้อง' };
        }
      },
      {
        id: 'customerPhone',
        message: 'กรุณากรอกเบอร์โทรศัพท์',
        validator: (value) => typeof validateThaiPhoneNumber === 'function' ? validateThaiPhoneNumber(value) : { isValid: true, message: '' }
      },
      {
        id: 'customerIdCard',
        message: 'กรุณากรอกเลขบัตรประชาชน',
        validator: (value) => typeof validateIdCard === 'function' ? validateIdCard(value) : { isValid: true, message: '' }
      },
      {
        id: 'customerEmail',
        message: 'รูปแบบอีเมลไม่ถูกต้อง',
        validator: (value) => typeof validateThaiEmail === 'function' ? validateThaiEmail(value) : { isValid: true, message: '' }
      }
    ];

    requiredFields.forEach(field => {
      const element = document.getElementById(field.id);
      if (element) {
        // Enhanced event listeners with improved validation
        if (field.id === 'customerIdCard') {
          element.addEventListener('blur', () => {
            setTimeout(() => this.validateFieldWithFeedback(field.id, field), 100);
          });
          element.addEventListener('input', () => {
            this.clearFieldError(field.id);
            // Continuous validation for ID card
            setTimeout(() => this.validateFieldWithFeedback(field.id, field, true), 150);
          });
        } else if (field.id === 'customerPhone') {
          element.addEventListener('blur', () => {
            setTimeout(() => this.validateFieldWithFeedback(field.id, field), 100);
          });
          element.addEventListener('input', () => {
            this.clearFieldError(field.id);
          });
        } else {
          element.addEventListener('blur', () => this.validateFieldWithFeedback(field.id, field));
          element.addEventListener('input', () => this.clearFieldError(field.id));
        }
      }
    });

    // Age calculation from birth date
    const birthDateField = document.getElementById('customerBirthDate');
    if (birthDateField) {
      birthDateField.addEventListener('change', () => this.calculateAge());
    }

    // Same address checkbox
    const sameAddressCheckbox = document.getElementById('useSameAddress');
    if (sameAddressCheckbox) {
      sameAddressCheckbox.addEventListener('change', () => this.handleSameAddressChange());
    }
  }

  // ✅ Enhanced validation method with proper feedback
  validateFieldWithFeedback(fieldId, fieldConfig, isRealTime = false) {
    const element = document.getElementById(fieldId);
    if (!element) return true;

    const value = element.value.trim();

    // Use custom validator if available
    if (fieldConfig.validator && typeof fieldConfig.validator === 'function') {
      const validation = fieldConfig.validator(value);

      if (!validation.isValid) {
        this.showFieldError(fieldId, validation.message);
        return false;
      } else {
        this.clearFieldError(fieldId);
        // Show success message for important fields (not real-time)
        if (!isRealTime && (fieldId === 'customerIdCard' || fieldId === 'customerPhone')) {
          this.showFieldSuccess(fieldId, validation.message);
        }
        return true;
      }
    }

    // Fallback to legacy validation
    return this.validateField(fieldId, fieldConfig);
  }

  validateField(fieldId, fieldConfig) {
    const element = document.getElementById(fieldId);
    if (!element) return true;

    const value = element.value.trim();
    let isValid = true;
    let errorMessage = '';

    // Required validation
    if (!value) {
      isValid = false;
      errorMessage = fieldConfig.message;
    }
    // Pattern validation with special handling for formatted fields
    else if (fieldConfig.pattern) {
      let testValue = value;

      // For ID Card and Phone, remove formatting characters before validation
      if (fieldId === 'customerIdCard' || fieldId === 'customerPhone') {
        testValue = value.replace(/\D/g, ''); // Remove non-digits
      }

      if (!fieldConfig.pattern.test(testValue)) {
        isValid = false;
        errorMessage = fieldConfig.message;
      }
    }

    // Show/hide error
    if (!isValid) {
      this.showFieldError(fieldId, errorMessage);
    } else {
      this.clearFieldError(fieldId);
    }

    return isValid;
  }

  showFieldError(fieldId, message) {
    const element = document.getElementById(fieldId);
    if (!element) return;

    // Clear existing error first
    this.clearFieldError(fieldId);

    // Add error class to the input
    element.classList.add('input-error', 'border-red-500');

    // Find the parent form group or create wrapper
    const parentNode = element.parentNode;

    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-red-500 text-xs mt-1 field-error';
    errorDiv.id = `${fieldId}-error`;
    errorDiv.textContent = message;

    // Insert error message after the field or its wrapper
    if (parentNode.classList.contains('relative')) {
      parentNode.parentNode.insertBefore(errorDiv, parentNode.nextSibling);
    } else {
      parentNode.insertBefore(errorDiv, element.nextSibling);
    }

    console.log(`⚠️ Validation error for ${fieldId}: ${message}`);
  }

  clearFieldError(fieldId) {
    const element = document.getElementById(fieldId);
    if (element) {
      // Remove error classes
      element.classList.remove('input-error', 'border-red-500');

      // Remove success classes too
      element.classList.remove('input-success', 'border-green-500');

      // Remove error and success messages
      const errorElement = document.getElementById(`${fieldId}-error`);
      if (errorElement) {
        errorElement.remove();
      }

      const successElement = document.getElementById(`${fieldId}-success`);
      if (successElement) {
        successElement.remove();
      }

      // Also look for error/success messages with class
      const messageElements = element.parentNode.parentNode.querySelectorAll('.field-error, .field-success');
      messageElements.forEach(el => {
        if (el.id.startsWith(fieldId)) {
          el.remove();
        }
      });

      console.log(`✅ Cleared validation messages for ${fieldId}`);
    }
  }

  // ✅ New method to show success feedback
  showFieldSuccess(fieldId, message) {
    const element = document.getElementById(fieldId);
    if (!element) return;

    // Clear existing messages first
    this.clearFieldError(fieldId);

    // Add success class to the input
    element.classList.add('input-success', 'border-green-500');

    // Find the parent form group
    const parentNode = element.parentNode;

    // Create success message element
    const successDiv = document.createElement('div');
    successDiv.className = 'text-green-600 text-xs mt-1 field-success';
    successDiv.id = `${fieldId}-success`;
    successDiv.innerHTML = `<i class="bi bi-check-circle mr-1"></i>${message}`;

    // Insert success message after the field or its wrapper
    if (parentNode.classList.contains('relative')) {
      parentNode.parentNode.insertBefore(successDiv, parentNode.nextSibling);
    } else {
      parentNode.insertBefore(successDiv, element.nextSibling);
    }

    console.log(`✅ Validation success for ${fieldId}: ${message}`);
  }

  calculateAge() {
    const birthDateField = document.getElementById('customerBirthDate');
    const ageField = document.getElementById('customerAge');

    if (!birthDateField || !ageField || !birthDateField.value) return;

    const birthDate = new Date(birthDateField.value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    ageField.value = age > 0 ? age : '';

    // Trigger save to Global Data Manager
    this.saveCustomerData();
  }

  handleSameAddressChange() {
    const checkbox = document.getElementById('useSameAddress');
    const contactAddressSection = document.getElementById('contactAddressSection');

    if (!checkbox || !contactAddressSection) return;

    if (checkbox.checked) {
      // Hide contact address section
      contactAddressSection.style.display = 'none';
      this.copyMainAddressToContact();
    } else {
      // Show contact address section
      contactAddressSection.style.display = 'block';
      this.clearContactAddress();
    }

    this.saveCustomerData();
  }

  copyMainAddressToContact() {
    const mainFields = ['houseNo', 'moo', 'soi', 'road', 'province', 'district', 'subDistrict', 'zipcode'];

    mainFields.forEach(field => {
      const mainElement = document.getElementById(field);
      const contactElement = document.getElementById(`contact${field.charAt(0).toUpperCase() + field.slice(1)}`);

      if (mainElement && contactElement) {
        contactElement.value = mainElement.value;
      }
    });
  }

  clearContactAddress() {
    const contactFields = ['contactHouseNo', 'contactMoo', 'contactSoi', 'contactRoad', 'contactProvince', 'contactDistrict', 'contactSubDistrict', 'contactPostalCode'];

    contactFields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = '';
      }
    });
  }

  // ========== EVENT LISTENERS ==========

  setupEventListeners() {
    // Form field changes
    const formFields = [
      'customerPrefix', 'customerFirstName', 'customerLastName', 'customerPhone', 'customerEmail',
      'customerFacebook', 'customerLineId', 'customerBirthDate', 'customerAge', 'customerIdCard',
      'customerOccupation', 'customerIncome', 'customerWorkplace',
      'houseNo', 'moo', 'soi', 'road', 'province', 'district', 'subDistrict', 'zipcode',
      'contactHouseNo', 'contactMoo', 'contactSoi', 'contactRoad', 'contactProvince', 'contactDistrict', 'contactSubDistrict', 'contactPostalCode',
      'witnessName', 'witnessIdCard', 'witnessPhone', 'witnessRelation'
    ];

    formFields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.addEventListener('input', () => this.saveCustomerData());
        element.addEventListener('change', () => this.saveCustomerData());
      }
    });

    // Step navigation
    const nextButton = document.getElementById('btnStep2ToStep3');
    if (nextButton) {
      nextButton.addEventListener('click', () => this.proceedToStep3());
    }

    const prevButton = document.getElementById('btnStep2ToStep1');
    if (prevButton) {
      prevButton.addEventListener('click', () => this.goBackToStep1());
    }

    // Document upload events
    document.addEventListener('documentUploaded', (event) => {
      this.handleDocumentUpload(event.detail);
    });

    // Global Data Manager events
    document.addEventListener('installmentStepChanged', (event) => {
      if (event.detail.stepNumber === 2) {
        this.updateNavigationButtons();
      }
    });
  }

  // ========== DATA MANAGEMENT ==========

  loadExistingData() {
    if (!window.globalInstallmentManager) return;

    const step2Data = window.globalInstallmentManager.getStepData(2);
    if (!step2Data) return;

    console.log('📥 Loading existing Step 2 data:', step2Data);

    // Load customer data
    if (step2Data.customer) {
      this.populateCustomerForm(step2Data.customer);
    }

    // Load witness data
    if (step2Data.witness) {
      this.populateWitnessForm(step2Data.witness);
    }

    // Load document status
    if (step2Data.attachments) {
      this.updateDocumentStatus(step2Data.attachments);
    }

    this.updateNavigationButtons();
  }

  populateCustomerForm(customerData) {
    const fieldMapping = {
      'customerPrefix': customerData.prefix,
      'customerFirstName': customerData.first_name,
      'customerLastName': customerData.last_name,
      'customerPhone': customerData.phone_number,
      'customerEmail': customerData.email,
      'customerBirthDate': customerData.birth_date,
      'customerAge': customerData.age,
      'customerIdCard': customerData.tax_id,
      'customerOccupation': customerData.occupation,
      'customerIncome': customerData.income,
      'customerWorkplace': customerData.workplace
    };

    Object.entries(fieldMapping).forEach(([fieldId, value]) => {
      const element = document.getElementById(fieldId);
      if (element && value) {
        element.value = value;
      }
    });

    // Address data
    if (customerData.address) {
      const addressMapping = {
        'houseNo': customerData.address.houseNo,
        'moo': customerData.address.moo,
        'soi': customerData.address.lane,
        'road': customerData.address.road,
        'province': customerData.address.province,
        'district': customerData.address.district,
        'subDistrict': customerData.address.subDistrict,
        'zipcode': customerData.address.zipcode
      };

      Object.entries(addressMapping).forEach(([fieldId, value]) => {
        const element = document.getElementById(fieldId);
        if (element && value) {
          element.value = value;
        }
      });
    }

    // Contact address data
    if (customerData.contactAddress) {
      const useSameAddress = customerData.contactAddress.useSameAddress;
      const checkbox = document.getElementById('useSameAddress');
      if (checkbox) {
        checkbox.checked = useSameAddress;
        this.handleSameAddressChange();
      }

      if (!useSameAddress) {
        const contactMapping = {
          'contactHouseNo': customerData.contactAddress.houseNo,
          'contactMoo': customerData.contactAddress.moo,
          'contactSoi': customerData.contactAddress.lane,
          'contactRoad': customerData.contactAddress.road,
          'contactProvince': customerData.contactAddress.province,
          'contactDistrict': customerData.contactAddress.district,
          'contactSubDistrict': customerData.contactAddress.subDistrict,
          'contactPostalCode': customerData.contactAddress.zipcode
        };

        Object.entries(contactMapping).forEach(([fieldId, value]) => {
          const element = document.getElementById(fieldId);
          if (element && value) {
            element.value = value;
          }
        });
      }
    }
  }

  populateWitnessForm(witnessData) {
    const fieldMapping = {
      'witnessName': witnessData.name,
      'witnessIdCard': witnessData.id_card,
      'witnessPhone': witnessData.phone,
      'witnessRelation': witnessData.relation
    };

    Object.entries(fieldMapping).forEach(([fieldId, value]) => {
      const element = document.getElementById(fieldId);
      if (element && value) {
        element.value = value;
      }
    });
  }

  saveCustomerData() {
    if (!window.globalInstallmentManager) return;

    const customerData = this.gatherCustomerData();
    const witnessData = this.gatherWitnessData();

    // Get attachment data
    const attachments = this.gatherAttachmentData();

    window.globalInstallmentManager.updateStepData(2, {
      customer: customerData,
      witness: witnessData,
      attachments: attachments,
      customerType: 'individual' // TODO: Add support for corporate
    });

    this.updateNavigationButtons();

    // Dispatch event to sync with FormProgressManager
    document.dispatchEvent(new CustomEvent('installmentDataUpdated', {
      detail: { step: 2, data: customerData }
    }));
  }

  gatherCustomerData() {
    const getValue = (id) => {
      const element = document.getElementById(id);
      return element ? element.value.trim() : '';
    };

    const checkbox = document.getElementById('useSameAddress');
    const useSameAddress = checkbox ? checkbox.checked : false;

    // Get authentication method
    const authMethodRadio = document.querySelector('input[name="customerAuthMethod"]:checked');
    const authMethod = authMethodRadio ? authMethodRadio.value : 'signature';

    return {
      prefix: getValue('customerPrefix'),
      gender: getValue('customerGender'),
      firstName: getValue('customerFirstName'),
      lastName: getValue('customerLastName'),
      phone: getValue('customerPhone'),
      email: getValue('customerEmail'),
      lineId: getValue('customerLineId'),
      facebook: getValue('customerFacebook'),
      birthDate: getValue('customerBirthDate'),
      age: getValue('customerAge'),
      idCard: getValue('customerIdCard'),
      occupation: getValue('customerOccupation'),
      income: getValue('customerIncome'),
      workplace: getValue('customerWorkplace'),
      authMethod: authMethod,
      coordinates: getValue('customerCoordinates'),
      latitude: getValue('customerLatitude'),
      longitude: getValue('customerLongitude'),
      mapUrl: getValue('customerMapUrl'),
      address: {
        houseNo: getValue('houseNo'),
        moo: getValue('moo'),
        soi: getValue('soi'),
        road: getValue('road'),
        province: getValue('province'),
        district: getValue('district'),
        subDistrict: getValue('subDistrict'),
        zipcode: getValue('zipcode')
      },
      contactAddress: {
        useSameAddress: useSameAddress,
        houseNo: useSameAddress ? getValue('houseNo') : getValue('contactHouseNo'),
        moo: useSameAddress ? getValue('moo') : getValue('contactMoo'),
        lane: useSameAddress ? getValue('soi') : getValue('contactSoi'),
        road: useSameAddress ? getValue('road') : getValue('contactRoad'),
        province: useSameAddress ? getValue('province') : getValue('contactProvince'),
        district: useSameAddress ? getValue('district') : getValue('contactDistrict'),
        subDistrict: useSameAddress ? getValue('subDistrict') : getValue('contactSubDistrict'),
        zipcode: useSameAddress ? getValue('zipcode') : getValue('contactPostalCode')
      }
    };
  }

  gatherWitnessData() {
    const getValue = (id) => {
      const element = document.getElementById(id);
      return element ? element.value.trim() : '';
    };

    return {
      name: getValue('witnessName'),
      id_card: getValue('witnessIdCard'),
      phone: getValue('witnessPhone'),
      relation: getValue('witnessRelation')
    };
  }

  gatherAttachmentData() {
    // Get document uploads from localStorage or documentManager
    const attachments = {};

    // ID Card
    const idCardUrl = localStorage.getItem('customer_idCard_url') ||
                     localStorage.getItem('idCard_url');
    if (idCardUrl) {
      attachments.idCard = {
        url: idCardUrl,
        uploadedAt: new Date().toISOString()
      };
    }

    // Selfie
    const selfieUrl = localStorage.getItem('customer_selfie_url') ||
                     localStorage.getItem('selfie_url');
    if (selfieUrl) {
      attachments.selfie = {
        url: selfieUrl,
        uploadedAt: new Date().toISOString()
      };
    }

    // Salary Slip
    const salarySlipUrl = localStorage.getItem('customer_salarySlip_url') ||
                         localStorage.getItem('salarySlip_url');
    if (salarySlipUrl) {
      attachments.salarySlip = {
        url: salarySlipUrl,
        uploadedAt: new Date().toISOString()
      };
    }

    // Customer Signature
    const customerSignatureUrl = localStorage.getItem('customerSignature_url') ||
                                localStorage.getItem('customerSignature');
    if (customerSignatureUrl) {
      attachments.customerSignature = {
        url: customerSignatureUrl,
        uploadedAt: new Date().toISOString()
      };
    }

    // Salesperson Signature
    const salespersonSignatureUrl = localStorage.getItem('salespersonSignature_url') ||
                                   localStorage.getItem('salespersonSignature');
    if (salespersonSignatureUrl) {
      attachments.salespersonSignature = {
        url: salespersonSignatureUrl,
        uploadedAt: new Date().toISOString()
      };
    }

    return attachments;
  }

  // ========== DOCUMENT MANAGEMENT ==========

  setupDocumentManager() {
    // Connect with existing document manager
    if (window.documentManager) {
      console.log('📄 Connected to existing Document Manager');
    } else {
      console.warn('⚠️ Document Manager not found');
    }
  }

  handleDocumentUpload(documentInfo) {
    if (!window.globalInstallmentManager) return;

    const currentAttachments = window.globalInstallmentManager.getStepData(2)?.attachments || {};

    // Update attachment data
    const updatedAttachments = {
      ...currentAttachments,
      [documentInfo.type]: documentInfo.url || documentInfo.data
    };

    window.globalInstallmentManager.updateStepData(2, {
      attachments: updatedAttachments
    });

    this.updateNavigationButtons();
    console.log(`📎 Document uploaded: ${documentInfo.type}`);
  }

  updateDocumentStatus(attachments) {
    // Update document status indicators
    const documentTypes = ['id_card_image', 'selfie_image', 'income_slip', 'customer_signature', 'salesperson_signature'];

    documentTypes.forEach(type => {
      const statusElement = document.getElementById(`${type.replace('_', '')}Status`);
      if (statusElement && attachments[type]) {
        statusElement.textContent = 'เสร็จสิ้น';
        statusElement.className = 'status-badge badge-success';
      }
    });
  }

  // ========== NAVIGATION ==========

  updateNavigationButtons() {
    if (!window.globalInstallmentManager) return;

    const isStep2Valid = window.globalInstallmentManager.validateStep(2);
    const nextButton = document.getElementById('btnStep2ToStep3');

    if (nextButton) {
      nextButton.disabled = !isStep2Valid;

      if (isStep2Valid) {
        nextButton.innerHTML = '<i class="bi bi-arrow-right mr-2"></i>ไปขั้นตอนถัดไป (เลือกแผนการชำระ)';
        nextButton.className = 'btn btn-primary btn-block';
      } else {
        const errors = window.globalInstallmentManager.getValidationErrors(2);
        nextButton.innerHTML = '<i class="bi bi-exclamation-circle mr-2"></i>กรุณากรอกข้อมูลให้ครบถ้วน';
        nextButton.className = 'btn btn-secondary btn-block';
        nextButton.title = errors.join(', ');
      }
    }
  }

  proceedToStep3() {
    if (!window.globalInstallmentManager) return;

    // Final validation
    if (!window.globalInstallmentManager.validateStep(2)) {
      const errors = window.globalInstallmentManager.getValidationErrors(2);
      this.showToast(errors[0] || 'กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
      return;
    }

    // Save final data
    this.saveCustomerData();

    // Complete step 2
    if (window.globalInstallmentManager.completeStep(2)) {
      console.log('✅ Step 2 completed, proceeding to Step 3');
      window.location.href = '/step3';
    } else {
      this.showToast('ไม่สามารถดำเนินการต่อได้ กรุณาตรวจสอบข้อมูล', 'error');
    }
  }

  goBackToStep1() {
    // Save current data before leaving
    this.saveCustomerData();
    window.location.href = '/step1';
  }

  // ========== UTILITY ==========

  showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
      alert(message);
    }
  }

  validateAllFields() {
    const requiredFields = [
      { id: 'customerFirstName', message: 'กรุณากรอกชื่อ' },
      { id: 'customerLastName', message: 'กรุณากรอกนามสกุล' },
      { id: 'customerPhone', message: 'กรุณากรอกเบอร์โทรศัพท์ 10 หลัก', pattern: /^[0-9]{9,10}$/ },
      { id: 'customerIdCard', message: 'กรุณากรอกเลขบัตรประชาชน 13 หลัก', pattern: /^[0-9]{13}$/ }
    ];

    let allValid = true;

    requiredFields.forEach(field => {
      if (!this.validateField(field.id, field)) {
        allValid = false;
      }
    });

    return allValid;
  }

  // Clear all validation errors
  clearAllErrors() {
    const allFields = [
      'customerFirstName', 'customerLastName', 'customerPhone',
      'customerIdCard', 'customerEmail', 'customerBirthDate'
    ];

    allFields.forEach(fieldId => {
      this.clearFieldError(fieldId);
    });

    console.log('🧹 Cleared all validation errors');
  }

  // Force revalidation of all fields
  revalidateAllFields() {
    this.clearAllErrors();

    setTimeout(() => {
      const isValid = this.validateAllFields();
      console.log(`🔍 Revalidation result: ${isValid ? 'Valid' : 'Invalid'}`);

      // Trigger FormProgressManager update
      if (window.formProgressManager) {
        window.formProgressManager.refresh();
      }

      return isValid;
    }, 100);
  }

  debug() {
    return {
      isInitialized: this.isInitialized,
      customerData: this.gatherCustomerData(),
      witnessData: this.gatherWitnessData(),
      validationErrors: window.globalInstallmentManager ? window.globalInstallmentManager.getValidationErrors(2) : [],
      isStep2Valid: window.globalInstallmentManager ? window.globalInstallmentManager.validateStep(2) : false
    };
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.step2Integration = new Step2Integration();
  });
} else {
  window.step2Integration = new Step2Integration();
}

console.log('📋 Step 2 Integration loaded');