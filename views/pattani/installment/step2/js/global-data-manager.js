// ======================= GLOBAL DATA MANAGER =======================

class GlobalDataManager {
  constructor() {
    this.storageKey = 'globalStepData';
    this.stepData = {
      step1: {
        completed: false,
        data: {
          cartItems: [],
          branchCode: this.getBranchCode(),
          selectedProducts: [],
          totalAmount: 0,
          timestamp: null
        }
      },
      step2: {
        completed: false,
        data: {
          customerData: null,
          documentUploads: [],
          authMethod: null,
          signature: null,
          timestamp: null
        }
      },
      step3: {
        completed: false,
        data: {
          installmentPlan: null,
          contractDetails: null,
          approvalStatus: null,
          timestamp: null
        }
      }
    };

    this.loadFromStorage();
  }

  // Get branch code from various sources
  getBranchCode() {
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

  // Load data from localStorage
  loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsedData = JSON.parse(saved);
        this.stepData = { ...this.stepData, ...parsedData };
        console.log('🔄 Global data loaded from storage');
      }
    } catch (error) {
      console.error('Error loading global data:', error);
    }
  }

  // Save data to localStorage
  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.stepData));
      console.log('💾 Global data saved to storage');
    } catch (error) {
      console.error('Error saving global data:', error);
    }
  }

  // Update step data
  updateStepData(stepNumber, data) {
    const stepKey = `step${stepNumber}`;
    if (this.stepData[stepKey]) {
      // Add timestamp
      const updatedData = {
        ...data,
        timestamp: new Date().toISOString()
      };

      this.stepData[stepKey].data = {
        ...this.stepData[stepKey].data,
        ...updatedData
      };

      // Save to storage
      this.saveToStorage();

      console.log(`📝 Step ${stepNumber} data updated:`, updatedData);

      // Trigger custom event for listeners
      window.dispatchEvent(new CustomEvent('stepDataUpdated', {
        detail: { stepNumber, data: this.stepData[stepKey].data }
      }));
    }
  }

  // Get step data
  getStepData(stepNumber) {
    const stepKey = `step${stepNumber}`;
    return this.stepData[stepKey] ? this.stepData[stepKey].data : null;
  }

  // Mark step as completed
  markStepCompleted(stepNumber) {
    const stepKey = `step${stepNumber}`;
    if (this.stepData[stepKey]) {
      this.stepData[stepKey].completed = true;
      this.stepData[stepKey].data.timestamp = new Date().toISOString();
      this.saveToStorage();

      console.log(`✅ Step ${stepNumber} marked as completed`);

      // Trigger completion event
      window.dispatchEvent(new CustomEvent('stepCompleted', {
        detail: { stepNumber }
      }));
    }
  }

  // Check if step is completed
  isStepCompleted(stepNumber) {
    const stepKey = `step${stepNumber}`;
    return this.stepData[stepKey] ? this.stepData[stepKey].completed : false;
  }

  // Get all step data
  getAllStepData() {
    return this.stepData;
  }

  // Clear all data
  clearAllData() {
    localStorage.removeItem(this.storageKey);
    this.stepData = {
      step1: { completed: false, data: { cartItems: [], branchCode: this.getBranchCode(), selectedProducts: [], totalAmount: 0 } },
      step2: { completed: false, data: { customerData: null, documentUploads: [], authMethod: null, signature: null } },
      step3: { completed: false, data: { installmentPlan: null, contractDetails: null, approvalStatus: null } }
    };

    console.log('🗑️ All global data cleared');

    // Trigger clear event
    window.dispatchEvent(new CustomEvent('allDataCleared'));
  }

  // Export data for backup
  exportData() {
    return JSON.stringify(this.stepData, null, 2);
  }

  // Import data from backup
  importData(jsonData) {
    try {
      const importedData = JSON.parse(jsonData);
      this.stepData = { ...this.stepData, ...importedData };
      this.saveToStorage();

      console.log('📥 Data imported successfully');

      // Trigger import event
      window.dispatchEvent(new CustomEvent('dataImported', {
        detail: { data: this.stepData }
      }));

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  // Validate step data integrity
  validateStepData(stepNumber) {
    const data = this.getStepData(stepNumber);
    if (!data) return false;

    switch (stepNumber) {
      case 1:
        return data.cartItems && Array.isArray(data.cartItems) && data.cartItems.length > 0;

      case 2:
        return data.customerData &&
               data.customerData.firstName &&
               data.customerData.lastName &&
               data.customerData.idCard;

      case 3:
        return data.installmentPlan && data.contractDetails;

      default:
        return false;
    }
  }

  // Get progress percentage across all steps
  getOverallProgress() {
    const totalSteps = Object.keys(this.stepData).length;
    const completedSteps = Object.values(this.stepData).filter(step => step.completed).length;
    return Math.round((completedSteps / totalSteps) * 100);
  }

  // Sync with server (placeholder for future implementation)
  async syncWithServer() {
    try {
      // This would sync data with backend API
      console.log('🔄 Syncing with server...');

      // For now, just simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('✅ Sync with server completed');
      return true;
    } catch (error) {
      console.error('❌ Server sync failed:', error);
      return false;
    }
  }
}

// Create global instance
if (!window.globalDataManager) {
  window.globalDataManager = new GlobalDataManager();
  console.log('🌐 Global Data Manager initialized');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GlobalDataManager;
}