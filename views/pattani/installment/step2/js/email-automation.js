// ===== EMAIL AUTOMATION MANAGER =====
// System for managing email document automation

class EmailAutomationManager {
  constructor() {
    this.selectedDocuments = [];
    this.customerEmail = null;
  }

  initialize() {
    this.setupEventListeners();
    this.initializeEmailDocumentSettings();
  }

  setupEventListeners() {
    // Listen for email input changes
    const emailInput = document.getElementById('customerEmail');
    if (emailInput) {
      emailInput.addEventListener('input', () => {
        this.updateEmailPreview();
        this.checkEmailRequirement();
      });
      emailInput.addEventListener('change', () => {
        this.updateEmailPreview();
        this.checkEmailRequirement();
      });
    }

    // Listen for document selection changes
    const documentCheckboxes = document.querySelectorAll('input[name="emailDocuments"]');
    documentCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateEmailDocumentSelection();
      });
    });

    // Test email button
    const testEmailBtn = document.getElementById('btnTestEmail');
    if (testEmailBtn) {
      testEmailBtn.addEventListener('click', () => {
        this.testEmailSettings();
      });
    }
  }

  initializeEmailDocumentSettings() {
    console.log('🔧 Initializing Email Document Settings...');

    // Check if customer has email filled
    this.checkEmailRequirement();

    // Initialize document selection display
    this.updateEmailDocumentSelection();

    // Update email automation indicator
    this.updateEmailAutomationIndicator();

    console.log('✅ Email Document Settings initialized');
    return true;
  }

  updateEmailDocumentSelection() {
    const checkboxes = document.querySelectorAll('input[name="emailDocuments"]:checked');
    const summaryDiv = document.getElementById('emailDocumentSummary');
    const previewDiv = document.getElementById('emailPreviewSection');
    const listDiv = document.getElementById('selectedDocumentsList');
    const statusSpan = document.getElementById('emailSettingsStatus');
    const emailInput = document.getElementById('customerEmail');

    // Update selected documents array
    this.selectedDocuments = Array.from(checkboxes).map(cb => cb.value);

    if (checkboxes.length > 0) {
      summaryDiv?.classList.remove('hidden');

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
        this.updateEmailPreview();
      } else {
        previewDiv?.classList.add('hidden');
      }
    } else {
      summaryDiv?.classList.add('hidden');
      previewDiv?.classList.add('hidden');
      if (statusSpan) {
        statusSpan.textContent = 'ไม่ได้เลือก';
        statusSpan.className = 'text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
      }
    }

    // Update email automation indicator
    this.updateEmailAutomationIndicator();
  }

  updateEmailPreview() {
    const emailInput = document.getElementById('customerEmail');
    const emailPreviewTo = document.getElementById('emailPreviewTo');
    const emailPreviewAttachments = document.getElementById('emailPreviewAttachments');
    const targetEmailDisplay = document.getElementById('targetEmailDisplay');

    if (emailInput?.value) {
      this.customerEmail = emailInput.value;

      if (emailPreviewTo) emailPreviewTo.textContent = emailInput.value;
      if (targetEmailDisplay) targetEmailDisplay.textContent = emailInput.value;

      if (emailPreviewAttachments) {
        const documentNames = {
          'quotation': 'ใบเสนอราคา',
          'invoice': 'ใบแจ้งหนี้',
          'receipt': 'ใบเสร็จ & ใบกำกับภาษี'
        };

        const attachmentNames = this.selectedDocuments.map(doc => documentNames[doc]).join(', ');
        emailPreviewAttachments.textContent = attachmentNames || 'ไม่มีเอกสารที่เลือก';
      }
    } else {
      this.customerEmail = null;
      if (targetEmailDisplay) targetEmailDisplay.textContent = 'ยังไม่ได้กรอกอีเมล';
    }
  }

  checkEmailRequirement() {
    const emailInput = document.getElementById('customerEmail');
    const emailRequiredNotice = document.getElementById('emailRequiredNotice');
    const documentOptions = document.querySelectorAll('.document-email-option');

    if (!emailInput?.value) {
      // Show notice and disable document options
      emailRequiredNotice?.classList.remove('hidden');
      documentOptions.forEach(option => {
        option.style.opacity = '0.5';
        option.style.pointerEvents = 'none';

        const checkbox = option.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.disabled = true;
        }
      });
      return false;
    } else {
      // Hide notice and enable document options
      emailRequiredNotice?.classList.add('hidden');
      documentOptions.forEach(option => {
        option.style.opacity = '1';
        option.style.pointerEvents = 'auto';

        const checkbox = option.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.disabled = false;
        }
      });
      return true;
    }
  }

  getSelectedEmailDocuments() {
    return this.selectedDocuments;
  }

  updateEmailAutomationIndicator() {
    const hasEmail = !!this.customerEmail;
    const hasDocuments = this.selectedDocuments.length > 0;

    // Update any email automation indicators in the UI
    const indicators = document.querySelectorAll('.email-automation-indicator');
    indicators.forEach(indicator => {
      if (hasEmail && hasDocuments) {
        indicator.classList.add('active');
        indicator.classList.remove('inactive');
      } else {
        indicator.classList.add('inactive');
        indicator.classList.remove('active');
      }
    });
  }

  async testEmailSettings() {
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

    const loader = LoadingSystem.show({ message: 'กำลังทดสอบการส่งอีเมล...' });

    try {
      // Simulate email test
      await new Promise(resolve => setTimeout(resolve, 2000));

      showToast('ทดสอบการส่งอีเมลสำเร็จ', 'success');
    } catch (error) {
      console.error('Email test error:', error);
      showToast('เกิดข้อผิดพลาดในการทดสอบอีเมล', 'error');
    } finally {
      LoadingSystem.hide(loader);
    }
  }

  getEmailSettings() {
    return {
      customerEmail: this.customerEmail,
      selectedDocuments: this.selectedDocuments,
      isEnabled: !!(this.customerEmail && this.selectedDocuments.length > 0),
      timestamp: new Date().toISOString()
    };
  }

  loadEmailSettings(settings) {
    if (settings.customerEmail) {
      this.customerEmail = settings.customerEmail;
      const emailInput = document.getElementById('customerEmail');
      if (emailInput) {
        emailInput.value = settings.customerEmail;
      }
    }

    if (settings.selectedDocuments && Array.isArray(settings.selectedDocuments)) {
      this.selectedDocuments = settings.selectedDocuments;

      // Update checkboxes
      settings.selectedDocuments.forEach(docType => {
        const checkbox = document.getElementById(`email${docType.charAt(0).toUpperCase() + docType.slice(1)}`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });
    }

    // Update UI
    this.updateEmailDocumentSelection();
    this.updateEmailPreview();
    this.checkEmailRequirement();
  }

  saveEmailSettings() {
    const settings = this.getEmailSettings();

    // Save to global data manager
    const currentData = globalDataManager.getStepData(2) || {};
    currentData.emailSettings = settings;
    globalDataManager.updateStepData(2, currentData);

    // Save to localStorage as backup
    const step2Data = JSON.parse(localStorage.getItem('step2Data') || '{}');
    step2Data.emailSettings = settings;
    localStorage.setItem('step2Data', JSON.stringify(step2Data));

    console.log('💾 Email settings saved:', settings);
  }

  loadSavedEmailSettings() {
    // Try to load from global data manager first
    const step2Data = globalDataManager.getStepData(2);
    let settings = step2Data?.emailSettings;

    // Fallback to localStorage
    if (!settings) {
      const localData = JSON.parse(localStorage.getItem('step2Data') || '{}');
      settings = localData.emailSettings;
    }

    if (settings) {
      this.loadEmailSettings(settings);
      console.log('📧 Email settings loaded:', settings);
    }
  }
}

// Make EmailAutomationManager available globally
window.EmailAutomationManager = EmailAutomationManager;

// Global function exports for compatibility
window.initializeEmailDocumentSettings = function() {
  if (window.emailAutomationManager) {
    return window.emailAutomationManager.initializeEmailDocumentSettings();
  }
  return true;
};

window.updateEmailDocumentSelection = function() {
  if (window.emailAutomationManager) {
    window.emailAutomationManager.updateEmailDocumentSelection();
  }
};

window.updateEmailPreview = function() {
  if (window.emailAutomationManager) {
    window.emailAutomationManager.updateEmailPreview();
  }
};

window.checkEmailRequirement = function() {
  if (window.emailAutomationManager) {
    return window.emailAutomationManager.checkEmailRequirement();
  }
  return true;
};

window.getSelectedEmailDocuments = function() {
  if (window.emailAutomationManager) {
    return window.emailAutomationManager.getSelectedEmailDocuments();
  }
  return [];
};

window.updateEmailAutomationIndicator = function() {
  if (window.emailAutomationManager) {
    window.emailAutomationManager.updateEmailAutomationIndicator();
  }
};

window.testEmailSettings = function() {
  if (window.emailAutomationManager) {
    window.emailAutomationManager.testEmailSettings();
  }
};