// Step 2 Integration Module
console.log('🔧 Step 2 Integration Module loaded');

const Step2Integration = {
  initialized: false,

  // Initialize
  init: function() {
    if (this.initialized) {
      console.log('⚠️ Step 2 Integration already initialized');
      return;
    }

    console.log('🚀 Initializing Step 2 Integration');
    this.initialized = true;

    // Load dependencies
    this.loadDependencies();

    // Setup event listeners
    this.setupEventListeners();

    // Initialize components
    this.initializeComponents();
  },

  // Load dependencies
  loadDependencies: function() {
    // Check for required global objects
    const required = [
      'GlobalDataManager',
      'LoadingSystem',
      'CommonUtils'
    ];

    required.forEach(dep => {
      if (!window[dep]) {
        console.warn(`⚠️ Missing dependency: ${dep}`);
      } else {
        console.log(`✅ ${dep} available`);
      }
    });
  },

  // Setup event listeners
  setupEventListeners: function() {
    // Next button
    const nextBtn = document.getElementById('nextStep');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.handleNextStep());
    }

    // Previous button
    const prevBtn = document.getElementById('previousStep');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.handlePreviousStep());
    }

    // Save button
    const saveBtn = document.getElementById('saveData');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveCurrentData());
    }
  },

  // Initialize components
  initializeComponents: function() {
    // Initialize sub-components if they exist
    if (window.CustomerSearchManager) {
      console.log('🔍 Customer Search Manager available');
    }

    if (window.DocumentUploadHandler) {
      console.log('📄 Document Upload Handler available');
    }

    if (window.FormProgressManager) {
      console.log('📈 Form Progress Manager available');
    }
  },

  // Handle next step
  handleNextStep: function() {
    console.log('➡️ Moving to next step');

    // Validate current step
    if (!this.validateStep2()) {
      return;
    }

    // Save data
    this.saveCurrentData();

    // Navigate to step 3
    if (window.FormProgressManager) {
      window.FormProgressManager.nextStep();
    } else {
      window.location.href = '../step3/step3.html' + window.location.search;
    }
  },

  // Handle previous step
  handlePreviousStep: function() {
    console.log('⬅️ Moving to previous step');

    // Save current data
    this.saveCurrentData();

    // Navigate to step 1
    if (window.FormProgressManager) {
      window.FormProgressManager.previousStep();
    } else {
      window.location.href = '../step1/step1.html' + window.location.search;
    }
  },

  // Validate step 2
  validateStep2: function() {
    console.log('✔️ Validating Step 2 data');

    const required = [
      { id: 'customerName', label: 'ชื่อลูกค้า' },
      { id: 'customerPhone', label: 'เบอร์โทรศัพท์' },
      { id: 'customerIdCard', label: 'เลขบัตรประชาชน' }
    ];

    for (const field of required) {
      const element = document.getElementById(field.id);
      if (!element || !element.value.trim()) {
        alert(`กรุณากรอก${field.label}`);
        if (element) element.focus();
        return false;
      }
    }

    // Validate phone number
    const phone = document.getElementById('customerPhone').value;
    if (window.CommonUtils && !window.CommonUtils.validatePhone(phone)) {
      alert('เบอร์โทรศัพท์ไม่ถูกต้อง');
      return false;
    }

    // Validate ID card
    const idCard = document.getElementById('customerIdCard').value;
    if (window.CommonUtils && !window.CommonUtils.validateThaiID(idCard)) {
      alert('เลขบัตรประชาชนไม่ถูกต้อง');
      return false;
    }

    return true;
  },

  // Save current data
  saveCurrentData: function() {
    console.log('💾 Saving Step 2 data');

    const data = {
      customerName: document.getElementById('customerName')?.value,
      customerPhone: document.getElementById('customerPhone')?.value,
      customerIdCard: document.getElementById('customerIdCard')?.value,
      customerAddress: document.getElementById('customerAddress')?.value,
      customerEmail: document.getElementById('customerEmail')?.value,
      customerCoordinates: document.getElementById('customerCoordinates')?.value,
      customerMapUrl: document.getElementById('customerMapUrl')?.value,
      salesperson: document.getElementById('salesperson')?.value,
      timestamp: new Date().toISOString()
    };

    // Save to GlobalDataManager
    if (window.GlobalDataManager) {
      window.GlobalDataManager.setCustomerData(data);
    }

    // Save to FormProgressManager
    if (window.FormProgressManager) {
      window.FormProgressManager.saveProgress(2, data);
    }

    // Also save to localStorage as backup
    localStorage.setItem('step2Data', JSON.stringify(data));

    console.log('✅ Step 2 data saved:', data);
  },

  // Load saved data
  loadSavedData: function() {
    console.log('📦 Loading saved Step 2 data');

    let data = null;

    // Try to load from GlobalDataManager first
    if (window.GlobalDataManager) {
      data = window.GlobalDataManager.getCustomerData();
    }

    // Fallback to FormProgressManager
    if (!data && window.FormProgressManager) {
      data = window.FormProgressManager.getStepData(2);
    }

    // Final fallback to localStorage
    if (!data) {
      const stored = localStorage.getItem('step2Data');
      if (stored) {
        try {
          data = JSON.parse(stored);
        } catch (error) {
          console.error('Error parsing stored data:', error);
        }
      }
    }

    // Fill form with saved data
    if (data) {
      console.log('✅ Found saved data:', data);
      Object.entries(data).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element && value) {
          element.value = value;
        }
      });
    }
  }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    Step2Integration.init();
    Step2Integration.loadSavedData();
  });
} else {
  Step2Integration.init();
  Step2Integration.loadSavedData();
}

// Export
window.Step2Integration = Step2Integration;