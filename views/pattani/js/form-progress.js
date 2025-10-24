// Form Progress Manager
console.log('📈 Form Progress Manager loaded');

const FormProgressManager = {
  currentStep: 1,
  totalSteps: 4,
  stepData: {},

  // Initialize
  init: function() {
    console.log('🔧 Initializing Form Progress Manager');
    this.loadProgress();
    this.updateUI();
  },

  // Save progress
  saveProgress: function(step, data) {
    this.stepData[step] = data;
    localStorage.setItem('formProgress', JSON.stringify({
      currentStep: this.currentStep,
      stepData: this.stepData,
      timestamp: new Date().toISOString()
    }));
    console.log(`✅ Progress saved for step ${step}`);
  },

  // Load progress
  loadProgress: function() {
    const saved = localStorage.getItem('formProgress');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.currentStep = data.currentStep || 1;
        this.stepData = data.stepData || {};
        console.log('📦 Progress loaded:', data);
      } catch (error) {
        console.error('❌ Error loading progress:', error);
      }
    }
  },

  // Update UI
  updateUI: function() {
    // Update step indicators
    for (let i = 1; i <= this.totalSteps; i++) {
      const stepElement = document.querySelector(`[data-step="${i}"]`);
      if (stepElement) {
        stepElement.classList.remove('active', 'completed');

        if (i < this.currentStep) {
          stepElement.classList.add('completed');
        } else if (i === this.currentStep) {
          stepElement.classList.add('active');
        }
      }
    }

    // Update progress bar
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
      const percentage = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  },

  // Go to step
  goToStep: function(step) {
    if (step < 1 || step > this.totalSteps) {
      console.error('❌ Invalid step number:', step);
      return;
    }

    this.currentStep = step;
    this.updateUI();

    // Navigate to step page
    const baseUrl = window.location.pathname.split('/').slice(0, -2).join('/');
    const stepUrl = `${baseUrl}/step${step}/step${step}.html`;

    // Preserve query parameters
    const params = new URLSearchParams(window.location.search);
    if (params.toString()) {
      window.location.href = stepUrl + '?' + params.toString();
    } else {
      window.location.href = stepUrl;
    }
  },

  // Next step
  nextStep: function() {
    if (this.currentStep < this.totalSteps) {
      this.goToStep(this.currentStep + 1);
    }
  },

  // Previous step
  previousStep: function() {
    if (this.currentStep > 1) {
      this.goToStep(this.currentStep - 1);
    }
  },

  // Reset progress
  resetProgress: function() {
    this.currentStep = 1;
    this.stepData = {};
    localStorage.removeItem('formProgress');
    console.log('🔄 Progress reset');
    this.updateUI();
  },

  // Get step data
  getStepData: function(step) {
    return this.stepData[step] || {};
  },

  // Get all data
  getAllData: function() {
    return this.stepData;
  },

  // Validate current step
  validateCurrentStep: function() {
    // Add validation logic based on current step
    const validators = {
      1: () => this.validateStep1(),
      2: () => this.validateStep2(),
      3: () => this.validateStep3(),
      4: () => this.validateStep4()
    };

    const validator = validators[this.currentStep];
    return validator ? validator() : true;
  },

  // Step 1 validation
  validateStep1: function() {
    const products = window.GlobalDataManager?.getSelectedProducts();
    if (!products || products.length === 0) {
      alert('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');
      return false;
    }
    return true;
  },

  // Step 2 validation
  validateStep2: function() {
    const customerName = document.getElementById('customerName')?.value;
    const customerPhone = document.getElementById('customerPhone')?.value;

    if (!customerName || !customerPhone) {
      alert('กรุณากรอกข้อมูลลูกค้าให้ครบถ้วน');
      return false;
    }
    return true;
  },

  // Step 3 validation
  validateStep3: function() {
    const downPayment = document.getElementById('downPayment')?.value;
    const installmentMonths = document.getElementById('installmentMonths')?.value;

    if (!downPayment || !installmentMonths) {
      alert('กรุณากรอกข้อมูลการผ่อนชำระให้ครบถ้วน');
      return false;
    }
    return true;
  },

  // Step 4 validation
  validateStep4: function() {
    // Final confirmation step, usually always valid
    return true;
  }
};

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    FormProgressManager.init();
  });
} else {
  FormProgressManager.init();
}

// Export
window.FormProgressManager = FormProgressManager;