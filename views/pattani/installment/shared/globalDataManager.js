// Global Data Manager for Installment System
// Shared across all steps to ensure data consistency

class GlobalDataManager {
  constructor(currentStep = 1) {
    this.currentStep = currentStep;
    this.stepData = {
      step1: {
        completed: false,
        data: {
          cartItems: [],
          branchCode: null,
          selectedProducts: [],
          totalAmount: 0 // ยอดดาวน์รวม (ไม่ใช่ราคาสด)
        }
      },
      step2: {
        completed: false,
        data: {
          customerData: null,
          documentUploads: [],
          authMethod: null,
          signature: null
        }
      },
      step3: {
        completed: false,
        data: {
          paymentPlan: null,
          downPayment: 0,
          paymentMethod: null,
          selectedPlan: null,
          customTerms: null
        }
      },
      step4: {
        completed: false,
        data: {
          transactionResult: null,
          documentGenerated: false,
          emailSent: false,
          completionStatus: null
        }
      }
    };

    this.loadFromStorage();
  }

  // Load data from localStorage
  loadFromStorage() {
    const savedData = localStorage.getItem('globalStepData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        this.stepData = { ...this.stepData, ...parsed };
      } catch (e) {
        console.warn('Error loading saved step data:', e);
      }
    }

    // Load individual step data with fallback
    this.stepData.step1.data.cartItems = this.getStorageItem('cartItems', []);
    this.stepData.step1.data.branchCode = this.getStorageItem('activeBranch', '00000');
    this.stepData.step2.data.customerData = this.getStorageItem('customerData', null);
    this.stepData.step3.data.paymentPlan = this.getStorageItem('paymentPlan', null);
    this.stepData.step4.data.transactionResult = this.getStorageItem('transactionResult', null);

    this.updateStepCompletionStatus();
  }

  // Save data to localStorage
  saveToStorage() {
    localStorage.setItem('globalStepData', JSON.stringify(this.stepData));
  }

  // Get item from localStorage with fallback
  getStorageItem(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  // Update step data
  updateStepData(stepNumber, data) {
    const stepKey = `step${stepNumber}`;
    if (this.stepData[stepKey]) {
      this.stepData[stepKey].data = { ...this.stepData[stepKey].data, ...data };
      this.saveToStorage();
      this.updateStepCompletionStatus();
      this.notifyStepChange(stepNumber);

      console.log(`✅ Step ${stepNumber} data updated:`, data);
    }
  }

  // Get step data
  getStepData(stepNumber) {
    const stepKey = `step${stepNumber}`;
    return this.stepData[stepKey] ? this.stepData[stepKey].data : null;
  }

  // Mark step as completed
  completeStep(stepNumber) {
    const stepKey = `step${stepNumber}`;
    if (this.stepData[stepKey]) {
      this.stepData[stepKey].completed = true;
      this.saveToStorage();
      this.updateStepCompletionStatus();
      this.notifyStepChange(stepNumber);

      console.log(`✅ Step ${stepNumber} completed`);
    }
  }

  // Check if step is completed
  isStepCompleted(stepNumber) {
    const stepKey = `step${stepNumber}`;
    return this.stepData[stepKey] ? this.stepData[stepKey].completed : false;
  }

  // Validate step requirements
  validateStepRequirements(stepNumber) {
    switch (stepNumber) {
      case 1:
        return this.stepData.step1.data.cartItems.length > 0;
      case 2:
        return this.isStepCompleted(1) && this.stepData.step2.data.customerData !== null;
      case 3:
        return this.isStepCompleted(2) && this.stepData.step3.data.paymentPlan !== null;
      case 4:
        return this.isStepCompleted(3);
      default:
        return false;
    }
  }

  // Get validation errors for step
  getStepValidationErrors(stepNumber) {
    const errors = [];

    switch (stepNumber) {
      case 1:
        if (this.stepData.step1.data.cartItems.length === 0) {
          errors.push('กรุณาเลือกสินค้าผ่อนอย่างน้อย 1 รายการ');
        }
        break;
      case 2:
        if (!this.isStepCompleted(1)) {
          errors.push('กรุณาเลือกสินค้าผ่อนก่อน');
        }
        if (!this.stepData.step2.data.customerData) {
          errors.push('กรุณากรอกข้อมูลลูกค้า');
        }
        break;
      case 3:
        if (!this.isStepCompleted(2)) {
          errors.push('กรุณาเลือกสินค้าผ่อนและกรอกข้อมูลลูกค้าก่อน');
        }
        if (!this.stepData.step3.data.paymentPlan) {
          errors.push('กรุณาเลือกแผนการชำระเงิน');
        }
        break;
      case 4:
        if (!this.isStepCompleted(3)) {
          errors.push('กรุณาทำให้ขั้นตอนก่อนหน้าเสร็จสิ้น');
        }
        break;
    }

    return errors;
  }

  // Update step completion status based on data
  updateStepCompletionStatus() {
    this.stepData.step1.completed = this.stepData.step1.data.cartItems.length > 0;
    this.stepData.step2.completed = this.stepData.step2.data.customerData !== null;
    this.stepData.step3.completed = this.stepData.step3.data.paymentPlan !== null;
    this.stepData.step4.completed = this.stepData.step4.data.transactionResult !== null;
  }

  // Notify other components about step changes
  notifyStepChange(stepNumber) {
    const event = new CustomEvent('stepDataChanged', {
      detail: { stepNumber, stepData: this.stepData }
    });
    document.dispatchEvent(event);
  }

  // Get progress percentage
  getProgressPercentage() {
    const completedSteps = Object.values(this.stepData).filter(step => step.completed).length;
    return (completedSteps / 4) * 100;
  }

  // Get next available step
  getNextStep() {
    for (let i = 1; i <= 4; i++) {
      if (!this.isStepCompleted(i)) {
        return i;
      }
    }
    return 4; // All completed
  }

  // Clear all data
  clearAllData() {
    this.stepData = {
      step1: {
        completed: false,
        data: {
          cartItems: [],
          branchCode: null,
          selectedProducts: [],
          totalAmount: 0 // ยอดดาวน์รวม (ไม่ใช่ราคาสด)
        }
      },
      step2: { completed: false, data: { customerData: null, documentUploads: [], authMethod: null, signature: null } },
      step3: { completed: false, data: { paymentPlan: null, downPayment: 0, paymentMethod: null, selectedPlan: null, customTerms: null } },
      step4: { completed: false, data: { transactionResult: null, documentGenerated: false, emailSent: false, completionStatus: null } }
    };

    // Clear localStorage
    ['cartItems', 'customerData', 'paymentPlan', 'transactionResult', 'customerFormData', 'globalStepData'].forEach(key => {
      localStorage.removeItem(key);
    });

    this.saveToStorage();
    this.notifyStepChange(0); // Notify all steps

    console.log('🧹 All installment data cleared');
  }

  // Get comprehensive data for API submission with PDF-compatible format
  getComprehensiveData() {
    const step1Data = this.stepData.step1.data;
    const step2Data = this.stepData.step2.data;
    const step3Data = this.stepData.step3.data;

    // Calculate totals - ใช้ยอดดาวน์ (ไม่ใช่ราคาสด)
    const downPaymentSubTotal = step1Data.totalAmount || 0; // ยอดดาวน์รวมจาก step1
    const docFee = step3Data.paymentPlan?.docFee || 0;
    const totalDownAmount = downPaymentSubTotal + docFee; // ยอดดาวน์รวม + ค่าธรรมเนียม

    // Enhanced customer data mapping for PDF compatibility
    const customerData = step2Data.customerData || {};
    const transformedCustomer = {
      name: customerData.name || `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim(),
      firstName: customerData.firstName || customerData.first_name,
      lastName: customerData.lastName || customerData.last_name,
      first_name: customerData.firstName || customerData.first_name,
      last_name: customerData.lastName || customerData.last_name,
      phone: customerData.phone || customerData.phone_number,
      phone_number: customerData.phone || customerData.phone_number,
      email: customerData.email || '',
      taxId: customerData.taxId || customerData.tax_id,
      tax_id: customerData.taxId || customerData.tax_id,
      address: customerData.address || {},
      fullAddress: this.formatAddress(customerData.address),
      // Additional fields for installment
      prefix: customerData.prefix || '',
      age: customerData.age || '',
      birth_date: customerData.birth_date || ''
    };

    // Enhanced items mapping for PDF compatibility - ใช้ข้อมูลดาวน์ (ไม่ใช่ราคาสด)
    const transformedItems = step1Data.cartItems.map((item, index) => ({
      product: item.id || item.productId,
      productId: item.id || item.productId,
      name: item.name,
      description: item.name || `สินค้า ${index + 1}`,
      qty: item.quantity || 1,
      quantity: item.quantity || 1,
      price: item.downAmount || 0, // ใช้ดาวน์แทนราคาสด
      unitPrice: item.downAmount || 0, // ราคาต่อหน่วยเป็นดาวน์
      originalPrice: item.price || 0, // เก็บราคาสดไว้เป็น reference
      totalPrice: item.totalPrice || (item.downAmount * item.quantity), // ยอดรวมจากดาวน์
      amount: item.totalPrice || (item.downAmount * item.quantity),
      imei: item.imei || '',
      model: item.model || '',
      brand: item.brand || '',
      category: item.category || '',
      // Installment specific data
      downAmount: item.downAmount || 0,
      downInstallment: item.downInstallment || 0,
      downInstallmentCount: item.downInstallmentCount || 0,
      docFee: docFee || 0
    }));

    return {
      // Customer data
      customer: transformedCustomer,
      customerData: transformedCustomer,

      // Items
      items: transformedItems,
      cartItems: transformedItems,

      // Payment plan
      paymentPlan: step3Data.paymentPlan,
      downPayment: step3Data.paymentPlan?.downPayment || 0,
      installmentPeriod: step3Data.paymentPlan?.installmentPeriod || 1,
      installmentAmount: step3Data.paymentPlan?.installmentAmount || 0,

      // Financial summary - ข้อมูลการเงินจากดาวน์ (ไม่ใช่ราคาสด)
      subTotal: downPaymentSubTotal, // ยอดดาวน์รวม (ไม่รวมค่าธรรมเนียม)
      docFee: docFee,
      totalAmount: totalDownAmount, // ยอดดาวน์รวม + ค่าธรรมเนียม
      grandTotal: totalDownAmount,

      // Branch and salesperson
      branchCode: step1Data.branchCode,
      salesperson: localStorage.getItem('userId'),
      salespersonName: localStorage.getItem('userName'),

      // Enhanced quotationData for PDF compatibility
      quotationData: {
        quotationNumber: window.currentContractData?.quotationId || window.currentContractData?.contract_number || '',
        number: window.currentContractData?.quotationId || window.currentContractData?.contract_number || '',
        branchCode: step1Data.branchCode,
        salesperson: localStorage.getItem('userId'),
        salespersonName: localStorage.getItem('userName'),
        customer: transformedCustomer,
        items: transformedItems,
        subTotal: downPaymentSubTotal, // ยอดดาวน์รวม
        totalAmount: totalDownAmount, // ยอดดาวน์รวม + ค่าธรรมเนียม
        grandTotal: totalDownAmount,
        docFee: docFee,
        summary: {
          subtotal: downPaymentSubTotal, // ยอดดาวน์รวม
          subTotal: downPaymentSubTotal,
          netTotal: totalDownAmount, // ยอดดาวน์รวม + ค่าธรรมเนียม
          grandTotal: totalDownAmount,
          totalAmount: totalDownAmount
        },
        // Installment specific fields
        installment_count: step3Data.paymentPlan?.installmentPeriod || 1,
        installmentPeriod: step3Data.paymentPlan?.installmentPeriod || 1,
        down_payment: step3Data.paymentPlan?.downPayment || 0,
        downPayment: step3Data.paymentPlan?.downPayment || 0,
        installment_amount: step3Data.paymentPlan?.installmentAmount || 0,
        installmentAmount: step3Data.paymentPlan?.installmentAmount || 0
      }
    };
  }

  // Helper method for address formatting
  formatAddress(addressData) {
    if (!addressData || typeof addressData !== 'object') {
      return 'ไม่มีข้อมูล';
    }

    const parts = [];
    if (addressData.houseNo) parts.push(`เลขที่ ${addressData.houseNo}`);
    if (addressData.moo) parts.push(`หมู่ ${addressData.moo}`);
    if (addressData.lane) parts.push(`ซอย ${addressData.lane}`);
    if (addressData.road) parts.push(`ถนน ${addressData.road}`);
    if (addressData.subDistrict) parts.push(`ตำบล ${addressData.subDistrict}`);
    if (addressData.district) parts.push(`อำเภอ ${addressData.district}`);
    if (addressData.province) parts.push(`จังหวัด ${addressData.province}`);
    if (addressData.zipcode) parts.push(`รหัสไปรษณีย์ ${addressData.zipcode}`);

    return parts.length > 0 ? parts.join(' ') : 'ไม่มีข้อมูล';
  }

  // Export all data for debugging or backup
  exportAllData() {
    return {
      stepData: this.stepData,
      localStorage: {
        cartItems: this.getStorageItem('cartItems', []),
        customerData: this.getStorageItem('customerData', null),
        paymentPlan: this.getStorageItem('paymentPlan', null),
        transactionResult: this.getStorageItem('transactionResult', null)
      },
      exportedAt: new Date().toISOString()
    };
  }

  // Import data from backup
  importData(data) {
    if (data && data.stepData) {
      this.stepData = data.stepData;
      this.saveToStorage();

      // Also save to individual localStorage keys
      if (data.localStorage) {
        Object.entries(data.localStorage).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            localStorage.setItem(key, JSON.stringify(value));
          }
        });
      }

      this.notifyStepChange(0); // Notify all steps
      console.log('📥 Data imported successfully');
      return true;
    }
    return false;
  }
}

// Initialize and make globally available
window.GlobalDataManager = GlobalDataManager;

// Auto-initialize if not already done
if (!window.globalDataManager) {
  window.globalDataManager = new GlobalDataManager();
}

console.log('🔗 Global Data Manager loaded');