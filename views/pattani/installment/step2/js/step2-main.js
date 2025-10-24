// ======================= STEP 2 MAIN COORDINATOR =======================

// Global managers
let documentManager;
let customerSearchManager;
let emailAutomationManager;
let formProgressManager;

// Main initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Step 2 Main Coordinator starting...');

  // Initialize theme first
  if (typeof initializeTheme === 'function') {
    initializeTheme();
  } else {
    // Fallback theme initialization
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'true') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  // Initialize loading system
  if (typeof LoadingSystem !== 'undefined' && LoadingSystem.init) {
    LoadingSystem.init();
  }

  // Initialize sidebar
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

  // Initialize managers
  initializeManagers();

  // Initialize cart manager and display products
  if (typeof cartManager !== 'undefined') {
    cartManager.displayCartSummary();
  } else if (typeof loadSelectedProducts === 'function') {
    loadSelectedProducts();
  }

  // Initialize form validation listeners
  if (typeof setupFormValidationEventListeners === 'function') {
    setupFormValidationEventListeners();
  }

  // Initialize map coordinates
  if (typeof initializeMapCoordinates === 'function') {
    initializeMapCoordinates();
  }

  // Initialize signature system
  if (typeof initializeSignatureSystem === 'function') {
    initializeSignatureSystem();
  }

  // Initialize step 2 core functions
  if (typeof initializeStep2 === 'function') {
    initializeStep2();
  }

  // Setup main navigation buttons
  setupMainNavigationButtons();

  // Setup form progress tracking
  if (typeof setupFormProgressTracking === 'function') {
    setupFormProgressTracking();
    if (typeof updateFormProgress === 'function') {
      updateFormProgress();
    }
  }

  // Load salesperson name
  if (typeof loadSalespersonName === 'function') {
    loadSalespersonName();
  }

  // Setup auto-save functionality
  setInterval(autoSaveFormData, 30000);

  console.log('✅ Step 2 main systems initialized');
});

// Setup main navigation buttons
function setupMainNavigationButtons() {
  // Next step button
  const btnStep2ToStep3 = document.getElementById('btnStep2ToStep3');
  if (btnStep2ToStep3) {
    btnStep2ToStep3.addEventListener('click', function() {
      if (typeof goToStep3 === 'function') {
        goToStep3();
      } else {
        console.error('goToStep3 function not found');
        showToast('ฟังก์ชันไปขั้นตอนถัดไปไม่พร้อมใช้งาน', 'error');
      }
    });
  }

  // Back button
  const backButtons = document.querySelectorAll('[onclick*="goToStep1"]');
  backButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      if (typeof goToStep1 === 'function') {
        goToStep1();
      } else {
        window.location.href = '/step1';
      }
    });
  });
}

// Auto-save form data periodically
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

  try {
    localStorage.setItem('step2_autoSave', JSON.stringify(formData));
    console.log('📝 Form auto-saved at', new Date().toLocaleTimeString());
  } catch (error) {
    console.error('Auto-save error:', error);
  }
}

// Load auto-saved data if available
function loadAutoSavedData() {
  try {
    const saved = localStorage.getItem('step2_autoSave');
    if (saved) {
      const data = JSON.parse(saved);

      // Load data back to form
      Object.keys(data).forEach(key => {
        if (key !== 'lastSaved') {
          const element = document.getElementById(key);
          if (element && data[key]) {
            element.value = data[key];
            // Trigger change event for validation
            element.dispatchEvent(new Event('change'));
          }
        }
      });

      console.log('📁 Auto-saved data loaded from', data.lastSaved);
      showToast('โหลดข้อมูลที่บันทึกไว้แล้ว', 'info');
    }
  } catch (error) {
    console.error('Error loading auto-saved data:', error);
  }
}

// Initialize auto-saved data loading on page load
window.addEventListener('load', function() {
  setTimeout(loadAutoSavedData, 1000); // Load after other initializations
});

// Initialize all managers
function initializeManagers() {
  console.log('🔧 Initializing Step 2 Managers...');

  // Initialize Document Manager
  if (typeof DocumentManager !== 'undefined') {
    documentManager = new DocumentManager();
    documentManager.initialize();
    window.documentManager = documentManager;
    console.log('✅ Document Manager initialized');
  }

  // Initialize Customer Search Manager
  if (typeof CustomerSearchManager !== 'undefined') {
    customerSearchManager = new CustomerSearchManager();
    customerSearchManager.initialize();
    window.customerSearchManager = customerSearchManager;
    console.log('✅ Customer Search Manager initialized');
  }

  // Initialize Email Automation Manager
  if (typeof EmailAutomationManager !== 'undefined') {
    emailAutomationManager = new EmailAutomationManager();
    emailAutomationManager.initialize();
    window.emailAutomationManager = emailAutomationManager;
    console.log('✅ Email Automation Manager initialized');
  }

  // Initialize Form Progress Manager
  if (typeof FormProgressManager !== 'undefined') {
    formProgressManager = new FormProgressManager();
    formProgressManager.initialize();
    window.formProgressManager = formProgressManager;
    console.log('✅ Form Progress Manager initialized');
  }

  console.log('🎉 All managers initialized successfully');
}

// Export main functions
window.autoSaveFormData = autoSaveFormData;
window.loadAutoSavedData = loadAutoSavedData;
window.setupMainNavigationButtons = setupMainNavigationButtons;
window.initializeManagers = initializeManagers;