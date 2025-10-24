/**
 * Global Data Manager for 4-Step Installment System
 * จัดการข้อมูลระหว่าง 4 steps และเชื่อมต่อกับ quotationController
 * @version 1.4.0 - FIXED address object to string conversion
 * @updated 2024-01-29 - Added missing setStep method
 */

// Prevent duplicate loading
if (typeof window.GlobalInstallmentDataManager !== 'undefined') {
  console.warn('GlobalInstallmentDataManager already loaded, skipping duplicate load');
} else {

class GlobalInstallmentDataManager {
  constructor() {
    this.currentStep = 1;
    this.isInitialized = false;

    // รูปแบบข้อมูลตาม quotationController structure
    this.data = {
      // Step 1: Product Selection Data
      step1: {
        completed: false,
        data: {
          cartItems: [],
          selectedProducts: [],
          totalAmount: 0,
          subTotal: 0,
          branchCode: window.BRANCH_CODE || null,
          salespersonId: null, // Will be populated during loadFromStorage
          salespersonName: null // Will be populated during loadFromStorage
        }
      },

      // Step 2: Customer Data & Documents
      step2: {
        completed: false,
        data: {
          customer: {
            prefix: '',
            gender: '',
            first_name: '',
            last_name: '',
            phone_number: '',
            email: '',
            line_id: '',
            facebook: '',
            birth_date: '',
            age: '',
            tax_id: '',
            coordinates: '',
            latitude: '',
            longitude: '',
            mapUrl: '',
            address: {
              houseNo: '',
              moo: '',
              lane: '',
              road: '',
              subDistrict: '',
              district: '',
              province: '',
              zipcode: ''
            },
            contactAddress: {
              useSameAddress: true,
              houseNo: '',
              moo: '',
              lane: '',
              road: '',
              subDistrict: '',
              district: '',
              province: '',
              zipcode: ''
            }
          },
          witness: {
            name: '',
            id_card: '',
            phone: '',
            relation: ''
          },
          attachments: {
            id_card_image: '',
            selfie_image: '',
            income_slip: '',
            customer_signature: '',
            salesperson_signature: ''
          },
          customerType: 'individual' // individual, corporate
        }
      },

      // Step 3: Payment Plan Selection
      step3: {
        completed: false,
        data: {
          plan_type: '', // recommended, custom
          down_payment: 0,
          installment_count: 0,
          installment_amount: 0,
          credit_amount: 0,
          payoff_amount: 0,
          doc_fee: 0,
          credit_term: '',
          selectedPlan: null,
          paymentMethod: 'cash', // cash, transfer, card
          taxType: '', // inclusive, exclusive, none
          documentType: '', // ใบเสร็จรับเงิน, ใบกำกับภาษี
          vatAmount: 0,
          beforeTaxAmount: 0
        }
      },

      // Step 4: Summary & Document Generation
      step4: {
        completed: false,
        data: {
          quotation_no: '',
          contract_no: '',
          invoice_no: '',
          total_amount: 0,
          total_text: '',
          quotation_terms: '',
          documents: {
            quotation: null,
            invoice: null,
            receipt: null,
            taxInvoice: null
          },
          emailSent: false,
          stockDeducted: false,
          transactionCompleted: false
        }
      }
    };

    this.validationRules = {
      step1: [
        { field: 'cartItems', required: true, minLength: 1, message: 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ' },
        { field: 'branchCode', required: true, message: 'ข้อมูลสาขาไม่ถูกต้อง' }
      ],
      step2: [
        { field: 'customer.firstName', required: false, message: 'กรุณากรอกชื่อ' },
        { field: 'customer.lastName', required: false, message: 'กรุณากรอกนามสกุล' },
        { field: 'customer.phone', required: false, pattern: /^[0-9\-\s\(\)\.]{9,15}$/, message: 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง' },
        { field: 'customer.taxId', required: false, pattern: /^[0-9]{13}$/, message: 'กรุณากรอกเลขบัตรประชาชนให้ถูกต้อง' }
      ],
      step3: [
        { field: 'plan_type', required: true, message: 'กรุณาเลือกแผนการชำระเงิน' },
        { field: 'down_payment', required: true, min: 1, message: 'กรุณาระบุจำนวนเงินดาวน์' },
        { field: 'installment_count', required: true, min: 1, message: 'กรุณาระบุจำนวนงวด' }
      ],
      step4: []
    };

    this.initialize();
  }

  initialize() {
    console.log('📋 Initializing Global Installment Data Manager...');

    // Initialize branch info FIRST (so window.BRANCH_CODE is available)
    this.initializeBranchInfo();

    // Then load from storage (which can now use window.BRANCH_CODE)
    this.loadFromStorage();

    this.setupEventListeners();
    this.isInitialized = true;

    console.log('✅ Global Installment Data Manager initialized with branch:', window.BRANCH_CODE);
  }

  /**
   * Initialize branch information from URL parameters
   */
  initializeBranchInfo() {
    try {
      // Initialize URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      window.urlParams = urlParams;

      const branchFromUrl = urlParams.get('branch');
      const nameFromUrl = urlParams.get('name');

      // Set global branch code with priority: URL > localStorage
      window.BRANCH_CODE = branchFromUrl ||
                          localStorage.getItem('activeBranch');

      // Store branch name if available
      if (nameFromUrl) {
        window.BRANCH_NAME = decodeURIComponent(nameFromUrl);
        localStorage.setItem('activeBranchName', window.BRANCH_NAME);
      } else {
        window.BRANCH_NAME = localStorage.getItem('activeBranchName') ||
                            `สาขา ${window.BRANCH_CODE}`;
      }

      // Persist to localStorage
      localStorage.setItem('activeBranch', window.BRANCH_CODE);

      console.log('🏢 Global Data Manager - Branch Info initialized:', {
        code: window.BRANCH_CODE,
        name: window.BRANCH_NAME,
        source: branchFromUrl ? 'URL' : 'localStorage/default',
        urlParams: window.location.search
      });

    } catch (error) {
      console.error('❌ Global Data Manager - Error initializing branch info:', error);
      console.error('❌ กรุณาเลือกสาขาจากหน้าหลักก่อนเข้าใช้ระบบผ่อน');
      // ไม่ตั้งค่า default - ต้องเลือกสาขาจาก frontstore_index.html
    }
  }

  // ========== DATA MANAGEMENT ==========

  loadFromStorage() {
    try {
      // Load from localStorage
      const savedData = localStorage.getItem('installmentData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        this.data = { ...this.data, ...parsed };
      }

      // Load legacy data from step1
      const cartItems = this.getStorageItem('cartItems', []);
      const cartData = this.getStorageItem('cartData', []);
      const selectedProducts = this.getStorageItem('step1_selectedProducts', []);

      if (cartItems.length > 0 || cartData.length > 0 || selectedProducts.length > 0) {
        this.data.step1.data.cartItems = cartItems.length > 0 ? cartItems : (cartData.length > 0 ? cartData : selectedProducts);
        this.data.step1.data.selectedProducts = this.data.step1.data.cartItems.map(item => ({
          id: item.id,
          imei: item.imei,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1
        }));
        this.data.step1.data.totalAmount = this.data.step1.data.cartItems.reduce((sum, item) => sum + (item.totalPrice || item.price), 0);
        this.data.step1.completed = this.data.step1.data.cartItems.length > 0;
      }

      // Load branch info (use global BRANCH_CODE from URL if available)
      this.data.step1.data.branchCode = window.BRANCH_CODE || this.getStorageItem('activeBranch', null);

      // ✅ FIX: Get salesperson data from multiple possible storage locations
      const userInfo = this.getStorageItem('userInfo', null);
      this.data.step1.data.salespersonId = userInfo?.id || this.getStorageItem('userId', null) || this.getStorageItem('user_id', null);
      this.data.step1.data.salespersonName = userInfo?.name || userInfo?.username || this.getStorageItem('userName', null) || this.getStorageItem('user_name', null);

      // If salesperson data is still missing, fetch it from the API
      if (!this.data.step1.data.salespersonId || !this.data.step1.data.salespersonName) {
        console.log('⚠️ Salesperson data is missing, will fetch from API when needed');
        this.ensureSalespersonData();
      }

      console.log('📥 Loaded installment data from storage:', {
        step1Items: this.data.step1.data.cartItems.length,
        step1Completed: this.data.step1.completed,
        branchCode: this.data.step1.data.branchCode,
        windowBranchCode: window.BRANCH_CODE,
        urlParams: window.location.search
      });

    } catch (error) {
      console.error('❌ Error loading installment data from storage:', error);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('installmentData', JSON.stringify(this.data));

      // Save to legacy keys for backward compatibility
      localStorage.setItem('cartItems', JSON.stringify(this.data.step1.data.cartItems));
      localStorage.setItem('cartData', JSON.stringify(this.data.step1.data.cartItems));
      localStorage.setItem('step1_selectedProducts', JSON.stringify(this.data.step1.data.cartItems));

      console.log('💾 Saved installment data to storage');
    } catch (error) {
      console.error('❌ Error saving installment data to storage:', error);
    }
  }

  getStorageItem(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  // ========== STEP DATA MANAGEMENT ==========

  updateStepData(stepNumber, data) {
    const stepKey = `step${stepNumber}`;

    // 🔍 DEBUG: Log what data is being saved
    console.log(`🔍 [DEBUG] updateStepData(${stepNumber}) called`);
    console.log(`🔍 [DEBUG] incoming data:`, JSON.stringify(data, null, 2));
    console.log(`🔍 [DEBUG] existing data:`, JSON.stringify(this.data[stepKey]?.data, null, 2));

    if (this.data[stepKey]) {
      this.data[stepKey].data = { ...this.data[stepKey].data, ...data };
      this.saveToStorage();
      this.validateStep(stepNumber);
      this.notifyStepChange(stepNumber);

      // 🔍 DEBUG: Log merged result
      console.log(`� [DEBUG] merged result:`, JSON.stringify(this.data[stepKey].data, null, 2));
      console.log(`�📝 Updated step${stepNumber} data:`, data);
    } else {
      console.log(`❌ [DEBUG] No step container found for step${stepNumber}`);
    }
  }

  getStepData(stepNumber) {
    const stepKey = `step${stepNumber}`;
    const result = this.data[stepKey] ? this.data[stepKey].data : null;

    // 🔍 DEBUG: Log what data is being retrieved
    console.log(`🔍 [DEBUG] getStepData(${stepNumber}) called`);
    console.log(`🔍 [DEBUG] stepKey: ${stepKey}`);
    console.log(`🔍 [DEBUG] raw data exists: ${!!this.data[stepKey]}`);
    console.log(`🔍 [DEBUG] result data:`, JSON.stringify(result, null, 2));

    if (stepNumber === 2 && result) {
      console.log(`🔍 [DEBUG] Step 2 customer data check:`);
      console.log(`   - Has customer: ${!!result.customer}`);
      console.log(`   - Has customer.first_name: ${!!result.customer?.first_name}`);
      console.log(`   - Has customer.last_name: ${!!result.customer?.last_name}`);
      console.log(`   - Has customer.phone_number: ${!!result.customer?.phone_number}`);
      console.log(`   - Has customer.address: ${!!result.customer?.address}`);
      console.log(`   - Has witness: ${!!result.witness}`);
      console.log(`   - Has attachments: ${!!result.attachments}`);
    }

    return result;
  }

  // ✅ Alias for updateStepData for compatibility
  setStepData(stepNumber, data) {
    return this.updateStepData(stepNumber, data);
  }

  completeStep(stepNumber) {
    const stepKey = `step${stepNumber}`;
    if (this.data[stepKey] && this.validateStep(stepNumber)) {
      this.data[stepKey].completed = true;
      this.saveToStorage();
      this.notifyStepChange(stepNumber);
      console.log(`✅ Step ${stepNumber} completed`);
      return true;
    }
    return false;
  }

  isStepCompleted(stepNumber) {
    const stepKey = `step${stepNumber}`;
    return this.data[stepKey] ? this.data[stepKey].completed : false;
  }

  // ========== VALIDATION ==========

  validateStep(stepNumber) {
    // Flexible validation - always pass but log warnings
    const rules = this.validationRules[`step${stepNumber}`] || [];
    const stepData = this.getStepData(stepNumber);

    if (!stepData) {
      console.warn(`⚠️ No data for step ${stepNumber}, but allowing progression`);
      return true; // Allow progression even without data
    }

    let hasWarnings = false;

    for (const rule of rules) {
      const value = this.getNestedValue(stepData, rule.field);

      // Required validation (silent for step 2 development)
      if (rule.required && (!value || (Array.isArray(value) && value.length === 0))) {
        if (stepNumber !== 2) {
          console.warn(`⚠️ Missing required field step${stepNumber}.${rule.field}: ${rule.message}`);
        }
        hasWarnings = true;
      }

      // Pattern validation (warn but don't block)
      if (rule.pattern && value && !rule.pattern.test(value)) {
        console.info(`ℹ️ Validation info for step${stepNumber}.${rule.field}: ${rule.message}`);
        hasWarnings = true;
      }

      // MinLength validation (warn but don't block)
      if (rule.minLength && Array.isArray(value) && value.length < rule.minLength) {
        console.warn(`⚠️ MinLength validation warning for step${stepNumber}.${rule.field}: ${rule.message}`);
        hasWarnings = true;
      }

      // Min value validation (warn but don't block)
      if (rule.min && value < rule.min) {
        console.warn(`⚠️ Min value validation warning for step${stepNumber}.${rule.field}: ${rule.message}`);
        hasWarnings = true;
      }
    }

    if (hasWarnings) {
      console.log(`🔓 Step ${stepNumber} has validation warnings but allowing progression (flexible mode)`);
    } else {
      console.log(`✅ Step ${stepNumber} validation passed`);
    }

    return true; // Always allow progression
  }

  getValidationErrors(stepNumber) {
    const rules = this.validationRules[`step${stepNumber}`] || [];
    const stepData = this.getStepData(stepNumber);
    const errors = [];

    if (!stepData) return ['ไม่พบข้อมูลของขั้นตอนนี้'];

    for (const rule of rules) {
      const value = this.getNestedValue(stepData, rule.field);

      if (rule.required && (!value || (Array.isArray(value) && value.length === 0))) {
        errors.push(rule.message);
      } else if (rule.pattern && value && !rule.pattern.test(value)) {
        errors.push(rule.message);
      } else if (rule.minLength && Array.isArray(value) && value.length < rule.minLength) {
        errors.push(rule.message);
      } else if (rule.min && value < rule.min) {
        errors.push(rule.message);
      }
    }

    return errors;
  }

  getNestedValue(obj, path) {
    // Special handling for attachments - check multiple sources
    if (path.startsWith('attachments.')) {
      const attachmentType = path.split('.')[1]; // e.g., 'id_card_image', 'selfie_image', 'customer_signature'

      // Get value from nested object first
      const nestedValue = path.split('.').reduce((current, key) => current && current[key], obj);
      if (nestedValue) return nestedValue;

      // Check localStorage for different attachment types
      let localStorageKey = '';
      switch(attachmentType) {
        case 'id_card_image':
          localStorageKey = 'customer_idCard_url'; // Check server URL first
          break;
        case 'selfie_image':
          localStorageKey = 'customer_selfie_url'; // Check server URL first
          break;
        case 'customer_signature':
          localStorageKey = 'customerSignature_url'; // Check server URL first
          break;
      }

      // Try server URL first, then base64 fallback
      let value = localStorage.getItem(localStorageKey);
      if (value) {
        console.log(`📁 Found ${attachmentType} server URL in localStorage:`, localStorageKey);
        return value;
      }

      // Fallback to base64 versions
      switch(attachmentType) {
        case 'id_card_image':
          value = localStorage.getItem('customer_idCard') || localStorage.getItem('idCardImage');
          break;
        case 'selfie_image':
          value = localStorage.getItem('customer_selfie') || localStorage.getItem('selfieImage');
          break;
        case 'customer_signature':
          value = localStorage.getItem('customerSignature');
          break;
      }

      if (value) {
        console.log(`📱 Found ${attachmentType} base64 in localStorage`);
        return value;
      }

      // Check hidden input fields as last resort
      switch(attachmentType) {
        case 'id_card_image':
          const idCardInput = document.getElementById('idCardImageUrl');
          if (idCardInput && idCardInput.value) return idCardInput.value;
          break;
        case 'customer_signature':
          const signatureInput = document.getElementById('customerSignatureUrl');
          if (signatureInput && signatureInput.value) return signatureInput.value;
          break;
      }

      console.log(`❌ No ${attachmentType} found in any source`);
      return null;
    }

    // Standard nested value access for non-attachment fields
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  // ========== PROGRESS TRACKING ==========

  getProgressPercentage() {
    const completedSteps = Object.values(this.data).filter(step => step.completed).length;
    return (completedSteps / 4) * 100;
  }

  getNextStep() {
    // Return the current step + 1, or 4 if we're at the end
    // This provides guidance but doesn't block progression
    const currentStep = this.currentStep || 1;
    const nextStep = Math.min(currentStep + 1, 4);
    console.log(`📍 Suggested next step: ${nextStep} (flexible navigation enabled)`);
    return nextStep;

    // Original strict logic (commented out):
    // for (let i = 1; i <= 4; i++) {
    //   if (!this.isStepCompleted(i)) {
    //     return i;
    //   }
    // }
    // return 4; // All completed
  }

  canNavigateToStep(stepNumber) {
    // Always allow flexible navigation - no strict validation
    console.log(`🔓 Flexible navigation: allowing access to Step ${stepNumber}`);
    return true;

    // Original strict validation (commented out):
    // // Can always go to step 1
    // if (stepNumber === 1) return true;
    //
    // // For other steps, check if previous step is completed
    // for (let i = 1; i < stepNumber; i++) {
    //   if (!this.isStepCompleted(i)) {
    //     return false;
    //   }
    // }
    //
    // return true;
  }

  // ✅ เพิ่ม setStep method ที่หายไป - VERSION 1.4.0
  setStep(stepNumber) {
    console.log(`🎯 Setting current step to: ${stepNumber} [v1.4.0]`);
    this.currentStep = stepNumber;
    this.saveToStorage();
    return this;
  }

  // ========== DATA TRANSFORMATION FOR API ==========

  // NEW METHOD: Get quotation data for PDF generation
  getQuotationData() {
    console.log('🔍 Getting quotation data from global manager...');

    const step1Data = this.getStepData(1);
    const step2Data = this.getStepData(2);
    const step3Data = this.getStepData(3);

    if (!step1Data || !step2Data || !step3Data) {
      throw new Error('ข้อมูลไม่ครบถ้วนสำหรับการสร้าง quotation data');
    }

    // Calculate totals consistently - แยกค่าสินค้าและค่าธรรมเนียมเอกสารอย่างชัดเจน
    const items = step1Data.cartItems || [];
    let docFee = parseFloat(step3Data.docFee || step3Data.documentFee || 220); // ✅ ใช้ 220 ตามข้อมูลจริงล่าสุด

    // ✅ FIX: Calculate item subtotal โดยใช้ราคาสินค้าโดยตรง (ไม่รวมค่าธรรมเนียม)
    const itemSubtotal = items.reduce((sum, item) => {
      const itemPrice = parseFloat(item.price || item.sale_price || 0);
      const quantity = parseInt(item.quantity || 1);
      console.log('📦 Item pricing debug:', {
        name: item.name,
        originalPrice: item.price,
        salePrice: item.sale_price,
        usedPrice: itemPrice, // ✅ ควรเป็น 31,000 สำหรับ iPad
        quantity: quantity,
        itemTotal: itemPrice * quantity
      });
      return sum + (itemPrice * quantity);
    }, 0);

    // ✅ FIX: docFee แยกต่างหาก - ไม่รวมในราคาสินค้า
    console.log('💰 Pricing breakdown (FIXED):', {
      itemSubtotal: itemSubtotal, // ✅ ควรเป็น 31,000 (iPad เพียงอย่างเดียว)
      docFee: docFee, // ✅ ควรเป็น 120 (ค่าธรรมเนียมเอกสาร)
      beforeDocFee: itemSubtotal,
      afterDocFee: itemSubtotal + docFee // ✅ ควรเป็น 31,120
    });

    // รวมสินค้า + ค่าธรรมเนียม = subtotal (ก่อน VAT)
    const subTotal = itemSubtotal + docFee;

    // ✅ คำนวณ VAT แบบสอดคล้อง - ตรวจสอบว่ามีสินค้าที่มี VAT หรือไม่
    let vatAmount = 0;
    let totalAmount = subTotal;

    const hasVatItems = items.some(item => item.has_vat === true || item.vat_rate > 0);

    if (hasVatItems) {
      // มีสินค้าที่มี VAT - คำนวณ VAT 7% จาก subtotal
      vatAmount = Math.round(subTotal * 0.07 * 100) / 100; // ปัดทศนิยม 2 ตำแหน่ง
      totalAmount = subTotal + vatAmount;
      console.log('💰 VAT Calculation - มีสินค้าที่มี VAT:', {
        subTotal,
        vatRate: '7%',
        vatAmount,
        totalAmount
      });
    } else {
      // ไม่มีสินค้าที่มี VAT - ไม่คิด VAT
      vatAmount = 0;
      totalAmount = subTotal;
      console.log('💰 VAT Calculation - ไม่มีสินค้าที่มี VAT:', {
        subTotal,
        vatAmount: 0,
        totalAmount
      });
    }

    console.log('💰 Quotation pricing calculation (FIXED & CONSISTENT):', {
      itemSubtotal: itemSubtotal, // ✅ ราคาสินค้าอย่างเดียว (iPad: 31,000)
      docFee: docFee,             // ✅ ค่าธรรมเนียมแยกต่างหาก (120)
      subTotal: subTotal,         // ✅ รวมก่อน VAT (31,120)
      hasVatItems: hasVatItems,   // มีสินค้าที่มี VAT หรือไม่
      vatAmount: vatAmount,       // VAT amount (ถ้ามี)
      totalAmount: totalAmount,   // ✅ รวมสุดท้าย (31,240 ถ้ามี VAT หรือ 31,120 ถ้าไม่มี VAT)
      calculation: `${itemSubtotal} (items) + ${docFee} (docFee) ${hasVatItems ? `+ ${vatAmount} (VAT 7%)` : '(no VAT)'} = ${totalAmount}`,
      itemsBreakdown: items.map(item => ({
        name: item.name,
        originalPrice: item.price,
        salePrice: item.sale_price,
        usedPrice: parseFloat(item.price || item.sale_price || 0), // ✅ ราคาที่ใช้จริง
        quantity: item.quantity,
        lineTotal: parseFloat(item.price || item.sale_price || 0) * parseInt(item.quantity || 1),
        has_vat: item.has_vat || false,
        vat_rate: item.vat_rate || 0
      }))
    });

    console.log('🔍 ITEMS DEBUG - Final prices for PDF generation (FIXED):', {
      step1ItemsRaw: items.map(item => ({
        name: item.name,
        originalPrice: item.price,          // ✅ ควรเป็น 31000 สำหรับ iPad
        salePrice: item.sale_price,
        quantity: item.quantity,
        imei: item.imei,
        totalBeforeProcessing: item.totalPrice || (item.price * item.quantity)
      })),
      docFeeDetails: {
        fromStep3DocFee: step3Data.docFee,
        fromStep3DocumentFee: step3Data.documentFee,
        finalDocFee: docFee,                // ✅ ควรเป็น 120
        source: step3Data.docFee ? 'step3.docFee' : (step3Data.documentFee ? 'step3.documentFee' : 'default-120')
      },
      calculationSummary: {
        itemSubtotal: itemSubtotal,         // ✅ ควรเป็น 31000 (iPad เท่านั้น)
        plusDocFee: docFee,                 // ✅ ควรเป็น 120
        equalsSubTotal: subTotal,           // ✅ ควรเป็น 31120
        plusVAT: vatAmount,                 // ถ้ามี VAT
        equalsTotalAmount: totalAmount      // ✅ ควรเป็น 31240 (ถ้ามี VAT) หรือ 31120 (ถ้าไม่มี VAT)
      }
    });

    // Customer data transformation - แก้ไขการแสดงที่อยู่
    const customerData = step2Data.customer || {};
    // 🔍 DEBUG: ตรวจสอบข้อมูลลูกค้าก่อนแปลง
    console.log('🔍 CUSTOMER DATA DEBUG (global-data-manager):', {
      originalCustomerData: customerData,
      taxIdSources: {
        idNumber: customerData.idNumber,
        idCard: customerData.idCard,
        tax_id: customerData.tax_id,
        taxId: customerData.taxId
      },
      addressSources: {
        address: customerData.address,
        addressType: typeof customerData.address
      }
    });

    const transformedCustomer = {
      prefix: customerData.prefix || '',
      first_name: customerData.firstName || customerData.first_name || '',
      last_name: customerData.lastName || customerData.last_name || '',
      phone_number: customerData.phoneNumber || customerData.phone_number || customerData.phone || '',
      email: customerData.email || '',
      tax_id: customerData.idNumber || customerData.idCard || customerData.tax_id || customerData.taxId || '',
      address: customerData.address || {}
    };

    console.log('🔍 TRANSFORMED CUSTOMER DEBUG:', {
      transformedCustomer,
      finalTaxId: transformedCustomer.tax_id,
      finalAddress: transformedCustomer.address
    });

    // ✅ แก้ไขการแสดงที่อยู่ - ต้องเป็น string ไม่ใช่ object
    const fullAddress = this.formatAddress(transformedCustomer.address);

    // สร้าง Quotation Number ที่เป็นมาตรฐาน - ใช้ session storage เพื่อให้เลขที่เดียวกัน
    let quotationNumber = sessionStorage.getItem('currentQuotationNumber');

    // ✅ FIX: ใช้เลขเดิมถ้ามี ไม่สร้างใหม่โดยไม่จำเป็น
    if (!quotationNumber) {
      // ✅ FIX: ใช้ backend API เพื่อสร้างเลขใบเสนอราคาตามลำดับ
      // แทนการสุ่ม - จะเรียกใช้ใน submitInstallment แล้วส่งมาพร้อมข้อมูล
      const currentDate = new Date();
      const year = currentDate.getFullYear() + 543; // ปี พ.ศ.
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');

      // ✅ ใช้ timestamp เป็น placeholder เพื่อหลีกเลี่ยงการซ้ำ - backend จะสร้างเลขจริง
      const timestamp = Date.now();
      quotationNumber = `QT-${year.toString().slice(-2)}${month}${day}-${timestamp}`;
      sessionStorage.setItem('currentQuotationNumber', quotationNumber);
      console.log('📄 Generated placeholder quotation number (backend will create actual):', quotationNumber);
    } else {
      console.log('📄 Using existing quotation number from session:', quotationNumber);
    }

    return {
      quotationNumber: quotationNumber,
      number: quotationNumber,
      quotationNo: quotationNumber,
      documentNumber: quotationNumber,
      branchCode: window.BRANCH_CODE || step1Data.branchCode || '00000',
      salesperson: step1Data.salespersonId || 'default-salesperson',
      salespersonName: step1Data.salespersonName || 'อารีฟีน กาซอ',
      customer: {
        name: `${transformedCustomer.prefix} ${transformedCustomer.first_name} ${transformedCustomer.last_name}`.trim(),
        first_name: transformedCustomer.first_name,
        last_name: transformedCustomer.last_name,
        phone: transformedCustomer.phone_number,
        phone_number: transformedCustomer.phone_number,
        email: transformedCustomer.email,
        taxId: transformedCustomer.tax_id,
        tax_id: transformedCustomer.tax_id,
        address: transformedCustomer.address,
        fullAddress: fullAddress, // ✅ ใช้ string ที่จัดรูปแบบแล้ว
        prefix: transformedCustomer.prefix
      },
      // รายการสินค้า - แสดงราคาจริงของสินค้า (ไม่รวมค่าธรรมเนียม)
      items: [
        // สินค้าจริง - ✅ ใช้ price เป็นหลัก เพราะ BranchStock ไม่มีฟิลด์ sale_price
        ...items.map(item => ({
          product: item.productId || item.product_id,
          name: item.name,
          description: `${item.name}${item.imei ? '\nIMEI: ' + item.imei : ''}`,
          qty: parseInt(item.quantity || 1),
          quantity: parseInt(item.quantity || 1),
          price: parseFloat(item.price || 0), // ✅ ใช้ price เป็นหลัก (จาก BranchStock)
          sale_price: parseFloat(item.price || 0), // ✅ ใช้ price เป็น sale_price เพื่อความสอดคล้อง
          unitPrice: parseFloat(item.price || 0),
          totalPrice: parseFloat(item.price || 0) * parseInt(item.quantity || 1),
          amount: parseFloat(item.price || 0) * parseInt(item.quantity || 1),
          imei: item.imei || '',
          model: item.model || '',
          brand: item.brand || '',
          category: item.category || '',
          discount: 0,
          // ✅ เพิ่มข้อมูล VAT status สำหรับ backend
          has_vat: item.has_vat || false,
          vat_rate: item.vat_rate || 0
        })),
        // ✅ ค่าธรรมเนียมเอกสารเป็นรายการแยก - เพียงรายการเดียว
        {
          product: 'document-fee',
          name: 'ค่าธรรมเนียมเอกสาร',
          description: 'ค่าธรรมเนียมในการจัดทำเอกสารผ่อนชำระ',
          qty: 1,
          quantity: 1,
          price: parseFloat(docFee), // ✅ ใช้ price เป็นหลัก
          sale_price: parseFloat(docFee), // ✅ ใช้ price เป็น sale_price เพื่อความสอดคล้อง
          unitPrice: parseFloat(docFee),
          totalPrice: parseFloat(docFee),
          amount: parseFloat(docFee),
          imei: '',
          model: '',
          brand: '',
          category: 'service',
          discount: 0,
          has_vat: false, // ค่าธรรมเนียมไม่มี VAT
          vat_rate: 0
        }
      ],
      // ✅ เพิ่มข้อมูลสำหรับ backend ตรวจสอบ VAT
      hasVatItems: hasVatItems,
      vatCalculationMethod: hasVatItems ? 'auto_7_percent' : 'none',
      summary: {
        subtotal: itemSubtotal,  // เฉพาะสินค้า
        subTotal: itemSubtotal,
        docFee: docFee,         // ค่าธรรมเนียมแยก
        beforeTax: subTotal,    // รวมก่อน VAT (สินค้า + ค่าธรรมเนียม)
        tax: vatAmount,
        vatAmount: vatAmount,
        netTotal: totalAmount,  // รวมสุดท้าย
        grandTotal: totalAmount,
        totalAmount: totalAmount
      },
      // Root level financial data
      subTotal: itemSubtotal,  // เฉพาะสินค้า (ตามมาตรฐาน)
      docFee: docFee,
      totalAmount: totalAmount,
      grandTotal: totalAmount,
      vatAmount: vatAmount,
      vatTotal: vatAmount,
      // Installment data
      installment_count: parseInt(step3Data.installment_count) || 1,
      installmentPeriod: parseInt(step3Data.installment_count) || 1,
      down_payment: parseFloat(step3Data.down_payment) || 0,
      downPayment: parseFloat(step3Data.down_payment) || 0,
      installment_amount: parseFloat(step3Data.installment_amount) || 0,
      installmentAmount: parseFloat(step3Data.installment_amount) || 0,

      // ✅ FIX: เพิ่ม quotationNumber จาก session storage หรือ this.quotationNumber
      quotationNumber: this.quotationNumber || sessionStorage.getItem('currentQuotationNumber') || sessionStorage.getItem('actualQuotationNumber'),
      quotationNo: this.quotationNumber || sessionStorage.getItem('currentQuotationNumber') || sessionStorage.getItem('actualQuotationNumber'),
      number: this.quotationNumber || sessionStorage.getItem('currentQuotationNumber') || sessionStorage.getItem('actualQuotationNumber'),
      documentNumber: this.quotationNumber || sessionStorage.getItem('currentQuotationNumber') || sessionStorage.getItem('actualQuotationNumber')
    };

      // ✅ DEBUG: แสดงข้อมูล quotationNumber ที่จะส่งไป
  const finalQuotationNumber = this.quotationNumber || sessionStorage.getItem('currentQuotationNumber') || sessionStorage.getItem('actualQuotationNumber');
  console.log('🔍 QuotationData Debug - quotationNumber info:', {
    'this.quotationNumber': this.quotationNumber,
    'sessionStorage.currentQuotationNumber': sessionStorage.getItem('currentQuotationNumber'),
    'sessionStorage.actualQuotationNumber': sessionStorage.getItem('actualQuotationNumber'),
    'finalQuotationNumber': finalQuotationNumber,
    'willSendToInvoice': !!finalQuotationNumber
  });

  // ✅ ENHANCED DEBUG: แสดงข้อมูล return object
  console.log('🔍 QuotationData Debug - Return Object Keys:', {
    quotationNumber: finalQuotationNumber,
    quotationNo: finalQuotationNumber,
    number: finalQuotationNumber,
    itemsCount: items.length,
    totalAmount: totalAmount,
    subTotal: itemSubtotal,
    docFee: docFee
  });

    return result;
  }

  async getInstallmentPayload() {
    try {
      console.log('🔧 Creating installment payload with real authentication data...');

      // Get real salesperson data first
      const realSalespersonData = await this.getRealSalespersonData();
      console.log('👤 Real salesperson data retrieved:', realSalespersonData);

      // Validate salesperson data
      if (!realSalespersonData.id || !realSalespersonData.name) {
        throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      }

      // Transform data to match quotationController.createQuotation format

      // 🔍 DEBUG: Log step data retrieval in getInstallmentPayload
      const step1Data = this.getStepData(1);
      const step2Data = this.getStepData(2);
      const step3Data = this.getStepData(3);

      console.log('🔍 [DEBUG] getInstallmentPayload - Step data retrieved:');
      console.log('   Step 1 data:', !!step1Data ? 'EXISTS' : 'MISSING');
      console.log('   Step 2 data:', !!step2Data ? 'EXISTS' : 'MISSING');
      console.log('   Step 3 data:', !!step3Data ? 'EXISTS' : 'MISSING');

    if (step2Data) {
      console.log('🔍 [DEBUG] Step 2 detailed check:');
      console.log('   Customer object:', !!step2Data.customer);
      console.log('   Customer first_name:', step2Data.customer?.first_name || 'MISSING');
      console.log('   Customer last_name:', step2Data.customer?.last_name || 'MISSING');
      console.log('   Customer phone:', step2Data.customer?.phone_number || 'MISSING');
      console.log('   Customer email:', step2Data.customer?.email || 'MISSING');
      console.log('   Customer address:', !!step2Data.customer?.address);
      console.log('   Witness data:', !!step2Data.witness);
      console.log('   Attachments:', !!step2Data.attachments);
    } else {
      console.log('❌ [DEBUG] Step 2 data is null/undefined!');
    }

    if (!step1Data || !step2Data || !step3Data) {
      console.error('❌ [DEBUG] Missing required step data for payload creation');
      throw new Error('ข้อมูลไม่ครบถ้วนสำหรับการสร้าง contract');
    }

    // ✅ FIX: เรียก getQuotationData() ครั้งเดียวเพื่อให้ข้อมูลสอดคล้องกัน
    const quotationData = this.getQuotationData();
    console.log('📋 Generated quotation data for payload:', {
      quotationNumber: quotationData.quotationNumber,
      hasItems: quotationData.items?.length > 0,
      hasSummary: !!quotationData.summary,
      itemsCount: quotationData.items?.length
    });

    // Get current branch code for stock validation
    const currentBranchCode = window.BRANCH_CODE || step1Data.branchCode || '00000';

    // Transform items with proper field mapping and branch information
    const items = step1Data.cartItems.map(item => {
      // ✅ ดึงชื่อสินค้าจากหลายแหล่งข้อมูล
      const productName = item.productName || item.name || item.title || item.description || 'สินค้า';

      console.log('🏷️ Product name mapping:', {
        originalName: item.name,
        productName: item.productName,
        title: item.title,
        description: item.description,
        finalName: productName,
        imei: item.imei
      });

      return {
        productId: item.id || item.product || item.productId,
        product_id: item.id || item.product || item.productId,
        product: item.id || item.product || item.productId,
        name: productName, // ✅ ใช้ชื่อที่ได้จากการ mapping
        description: productName, // ✅ เพิ่ม description สำหรับ PDF controllers
        productName: productName, // ✅ เพิ่ม productName field
        brand: item.brand || 'N/A',
        price: parseFloat(item.price) || 0,
        sale_price: parseFloat(item.price) || 0, // ✅ FIX: เพิ่ม sale_price สำหรับ backend
        qty: parseInt(item.quantity) || 1,
        quantity: parseInt(item.quantity) || 1,
        unitPrice: parseFloat(item.price) || 0,
        totalPrice: parseFloat(item.totalPrice) || (parseFloat(item.price) * parseInt(item.quantity)),
        amount: parseFloat(item.totalPrice) || (parseFloat(item.price) * parseInt(item.quantity)), // ✅ เพิ่ม amount สำหรับ PDF
        imei: item.imei || '',
        stockType: item.stockType || 'imei',
        has_vat: item.has_vat || true, // ✅ FIX: Default to true for Thai businesses (most items subject to VAT)
        vat_rate: item.vat_rate || 7, // ✅ FIX: Default to 7% VAT rate for Thailand
        taxType: item.taxType || 'มี VAT', // ✅ FIX: Default to 'มี VAT' for tax invoice functionality
        // Add branch information for stock validation
        branch_code: currentBranchCode,
        stockId: item.stockId || item._id || null,
        originalBranch: item.branch_code || currentBranchCode
      };
    });

    console.log('🏪 Items with branch info:', {
      currentBranch: currentBranchCode,
      itemsCount: items.length,
      items: items.map(item => ({
        name: item.name,
        imei: item.imei,
        branch_code: item.branch_code,
        stockId: item.stockId,
        originalBranch: item.originalBranch
      }))
    });

    // Fix customer data mapping - ensure backend field names
    const customerData = step2Data.customer || {};

    // Helper function to generate or fix tax ID for testing
    const ensureValidTaxId = (taxId) => {
      if (!taxId || taxId.length === 0) {
        // Return empty string if no tax ID
        return '';
      }

      // Remove non-digits
      const digitsOnly = taxId.replace(/\D/g, '');

      // Return the digits as is without padding
      return digitsOnly;
    };

    // Helper function to ensure valid phone number
    const ensureValidPhone = (phone) => {
      if (!phone || phone.length === 0) {
        return '';
      }

      // Remove non-digits
      const digitsOnly = phone.replace(/\D/g, '');

      if (digitsOnly.length >= 9 && digitsOnly.length <= 10) {
        return digitsOnly;
      } else {
        // Return as is if not valid length
        return digitsOnly;
      }
    };

    // ✅ เพิ่ม debug logging สำหรับข้อมูลลูกค้า
    console.log('🔍 Customer Data Debug:', {
      step2Data: step2Data,
      customerData: customerData,
      step2Customer: step2Data.customer,
      hasFirstName: !!(customerData.firstName || customerData.first_name),
      hasLastName: !!(customerData.lastName || customerData.last_name),
      hasPhone: !!(customerData.phoneNumber || customerData.phone_number || customerData.phone),
      hasTaxId: !!(customerData.tax_id || customerData.taxId || customerData.idCard),
      hasAddress: !!customerData.address
    });

    // ✅ RAW TAX ID DEBUG - ตรวจสอบค่าเลขบัตรก่อนประมวลผล
    console.log('🔍 RAW TAX ID DEBUG:', {
      originalTaxId: customerData.tax_id,
      alternativeTaxId: customerData.taxId,
      idCard: customerData.idCard,
      willProcessAs: customerData.tax_id || customerData.taxId || customerData.idCard,
      type: typeof (customerData.tax_id || customerData.taxId || customerData.idCard)
    });

    // ✅ Function to clean names and prevent repetitive characters
    const cleanName = (name) => {
      if (!name || typeof name !== 'string') return name;

      console.log('🧹 Cleaning name:', {
        original: name,
        type: typeof name,
        length: name.length
      });

      // Remove excessive repetitive characters (เก็บแค่ 2 ตัวซ้ำสำหรับตัวอักษรไทย/อังกฤษ)
      const cleaned = name.replace(/([ก-๏a-zA-Z])\1{2,}/g, '$1$1');

      console.log('🧹 Name cleaned:', {
        original: name,
        cleaned: cleaned,
        changed: name !== cleaned
      });

      return cleaned;
    };

    const transformedCustomer = {
      prefix: customerData.prefix || customerData.title || '',
      first_name: cleanName(customerData.firstName || customerData.first_name || ''),
      last_name: cleanName(customerData.lastName || customerData.last_name || ''),
      phone_number: ensureValidPhone(customerData.phoneNumber || customerData.phone_number || customerData.phone),
      email: customerData.email || '',
      birth_date: customerData.birthDate || customerData.birth_date || '',
      age: customerData.age || '',
      tax_id: ensureValidTaxId(customerData.tax_id || customerData.taxId || customerData.idCard),
      invoice_no: customerData.invoice_no || '',
      address: this.formatAddress(customerData.address) || '',
      contactAddress: this.formatAddress(customerData.contactAddress) || '',
      // Corporate fields
      companyName: customerData.companyName || '',
      companyTaxId: customerData.companyTaxId || '',
      contactPerson: customerData.contactPerson || '',
      corporatePhone: customerData.corporatePhone || '',
      corporateEmail: customerData.corporateEmail || '',
    };

    // ✅ Debug transformed customer
    console.log('🔍 Transformed Customer:', transformedCustomer);

    // ✅ FIX: Merge witness data from multiple sources (step2Data + localStorage)
    const witnessFromStep2 = step2Data.witness || {};
    const witnessFromLocalStorage = JSON.parse(localStorage.getItem('witness_data') || '{}');

    console.log('🔍 Witness data sources for payload:', {
      witnessFromStep2,
      witnessFromLocalStorage,
      hasLocalStorageData: !!witnessFromLocalStorage.firstName || !!witnessFromLocalStorage.lastName
    });

    // Merge witness data (localStorage takes priority for name/relation fields)
    const witnessData = {
      ...witnessFromStep2,
      ...witnessFromLocalStorage
    };

    console.log('🔄 Merged witness data for payload:', witnessData);

    // Safely handle firstName and lastName concatenation
    const safeFirstName = (witnessData.firstName && witnessData.firstName !== 'undefined') ? witnessData.firstName.trim() : '';
    const safeLastName = (witnessData.lastName && witnessData.lastName !== 'undefined') ? witnessData.lastName.trim() : '';

    const constructedName = safeFirstName && safeLastName ?
                           `${safeFirstName} ${safeLastName}`.trim() :
                           safeFirstName || safeLastName || '';

    const transformedWitness = {
      name: witnessData.name || constructedName || '',
      id_card: ensureValidTaxId(witnessData.id_card || witnessData.idCard),
      phone: ensureValidPhone(witnessData.phone),
      relation: witnessData.relation || witnessData.relationship || ''
    };

    console.log('🎯 Final transformed witness for backend payload:', transformedWitness);

    // Enhanced attachments data collection from multiple sources
    const attachmentsData = step2Data.attachments || {};

    // Helper function to get attachment data with fallbacks
    const getAttachmentData = (type) => {
      // Check step2Data first
      if (attachmentsData[type]) return attachmentsData[type];

      // Check localStorage for server URLs
      let serverUrl = '';
      let base64Data = '';

      switch(type) {
        case 'id_card_image':
          serverUrl = localStorage.getItem('customer_idCard_url') || localStorage.getItem('idCardImageUrl');
          base64Data = localStorage.getItem('customer_idCard') || localStorage.getItem('idCardImage');
          // Check hidden input
          const idCardInput = document.getElementById('idCardImageUrl');
          if (!serverUrl && !base64Data && idCardInput) {
            return idCardInput.value;
          }
          break;
        case 'selfie_image':
          serverUrl = localStorage.getItem('customer_selfie_url');
          base64Data = localStorage.getItem('customer_selfie') || localStorage.getItem('selfieImage');
          break;
        case 'customer_signature':
          serverUrl = localStorage.getItem('customerSignature_url');
          base64Data = localStorage.getItem('customerSignature');
          // Check hidden input
          const signatureInput = document.getElementById('customerSignatureUrl');
          if (!serverUrl && !base64Data && signatureInput) {
            return signatureInput.value;
          }
          break;
      }

      // Prefer server URL over base64
      const result = serverUrl || base64Data || null;
      if (result) {
        console.log(`📁 Found ${type}:`, { hasServerUrl: !!serverUrl, hasBase64: !!base64Data });
      }
      return result;
    };

    const transformedAttachments = {
      id_card_image: getAttachmentData('id_card_image') || '',
      selfie_image: getAttachmentData('selfie_image') || '',
      income_slip: attachmentsData.income_slip || '',
      customer_signature: getAttachmentData('customer_signature') || '',
      salesperson_signature: attachmentsData.salesperson_signature || ''
    };

    console.log('📋 Transformed attachments data:', {
      id_card_image: transformedAttachments.id_card_image ? 'Found' : 'Missing',
      selfie_image: transformedAttachments.selfie_image ? 'Found' : 'Missing',
      customer_signature: transformedAttachments.customer_signature ? 'Found' : 'Missing',
      sources: {
        localStorage_urls: {
          idCard: !!localStorage.getItem('customer_idCard_url'),
          selfie: !!localStorage.getItem('customer_selfie_url'),
          signature: !!localStorage.getItem('customerSignature_url')
        },
        localStorage_base64: {
          idCard: !!localStorage.getItem('customer_idCard'),
          selfie: !!localStorage.getItem('customer_selfie'),
          signature: !!localStorage.getItem('customerSignature')
        }
      }
    });

        console.log('🔧 Customer data transformation:', {
      original: {
        tax_id: customerData.tax_id || customerData.taxId || customerData.idCard,
        phone: customerData.phoneNumber || customerData.phone_number || customerData.phone,
        address: customerData.address
      },
      transformed: {
        tax_id: transformedCustomer.tax_id,
        phone_number: transformedCustomer.phone_number,
        address: transformedCustomer.address,
        addressType: typeof transformedCustomer.address
      }
    });

    // Note: transformedWitness and transformedAttachments are already defined above

    // ✅ เพิ่มข้อมูลภาษี (VAT) และส่วนลดจาก step3 (ใช้ step3Data ที่ประกาศไว้แล้ว)
    // Calculate VAT consistently based on down payment context (for day-of-contract receipt)
    const downPayment = parseFloat(step3Data.down_payment || 0);
    // Reuse docFee declared at line 578, update with step3 data
    docFee = parseFloat(step3Data.docFee || step3Data.doc_fee || step3Data.documentFee || 500);
    const downPaymentWithFee = downPayment + docFee;

    // Calculate VAT for down payment receipt (this is what customer pays today)
    let downPaymentVatAmount = 0;
    if (step3Data.taxType === 'inclusive') {
      // Inclusive VAT: VAT = Amount - (Amount / 1.07)
      downPaymentVatAmount = Math.round((downPaymentWithFee - (downPaymentWithFee / 1.07)) * 100) / 100;
    } else if (step3Data.taxType === 'exclusive' || step3Data.taxType === 'vat') {
      // Exclusive VAT: VAT = Amount * 0.07
      downPaymentVatAmount = Math.round(downPaymentWithFee * 0.07 * 100) / 100;
    }

    const taxInfo = {
      taxType: step3Data.taxType || 'none',
      // Use consistent VAT calculation for down payment context
      vatAmount: downPaymentVatAmount,
      beforeTaxAmount: step3Data.taxType === 'inclusive' ? (downPaymentWithFee / 1.07) : downPaymentWithFee,
      totalWithTax: downPaymentWithFee,
      // 🔧 FIX: เพิ่มข้อมูลสำหรับใบเสร็จและใบกำกับภาษี (ใช้ยอดดาวน์ + ค่าธรรมเนียม)
      receiptAmount: downPaymentWithFee, // ใบเสร็จแสดงยอดดาวน์ + ค่าธรรมเนียม
      taxInvoiceAmount: downPaymentWithFee, // ใบกำกับภาษีแสดงยอดดาวน์ + ค่าธรรมเนียม
      documentType: step3Data.documentType || 'ใบเสร็จรับเงิน',
      // เพิ่มข้อมูล payment method จาก step3
      paymentMethod: step3Data.paymentMethod || 'cash',
      // ✅ เพิ่มข้อมูลส่วนลด
      discount: parseFloat(step3Data.discount || 0),
      discountType: step3Data.discountType || 'amount',
      actualDiscount: step3Data.discountType === 'percent'
        ? (totalPrice * parseFloat(step3Data.discount || 0)) / 100
        : parseFloat(step3Data.discount || 0),
      // Add debug info for consistency checking
      calculationContext: 'downPayment',
      downPaymentBase: downPayment,
      docFeeIncluded: docFee,
      totalCalculationBase: downPaymentWithFee
    };

    console.log('💰 Tax Info from Step3:', taxInfo);

    // ✅ Validate financial calculations for accuracy
    this.validateFinancialCalculations(step1Data, step3Data, taxInfo);

    // Calculate totals
    const subTotal = step1Data.totalAmount || items.reduce((sum, item) => sum + item.totalPrice, 0);
    // docFee is already declared above at line 1193, so we reuse it here
    const totalAmount = subTotal + docFee;

    // 🔧 Fix plan_type mapping - convert frontend values to backend values
    let mappedPlanType = step3Data.plan_type;
    if (step3Data.plan_type === 'recommended') {
      // Map recommended plans to specific plan numbers based on selected plan
      const selectedPlan = step3Data.selectedPlan;
      if (selectedPlan) {
        if (selectedPlan.id === 'plan_min_down') {
          mappedPlanType = 'plan1';
        } else if (selectedPlan.id === 'plan_balanced') {
          mappedPlanType = 'plan2';
        } else if (selectedPlan.id === 'plan_high_down') {
          mappedPlanType = 'plan3';
        } else {
          mappedPlanType = 'plan2'; // Default to plan2 for unknown recommended plans
        }
      } else {
        mappedPlanType = 'plan2'; // Default for recommended without specific plan
      }
    } else if (step3Data.plan_type === 'custom') {
      mappedPlanType = 'manual'; // Custom plans become 'manual'
    } else {
      // If already a valid backend value, keep it
      const validTypes = ['plan1', 'plan2', 'plan3', 'manual'];
      if (!validTypes.includes(step3Data.plan_type)) {
        mappedPlanType = 'plan2'; // Default fallback
      }
    }

    console.log('🔄 Plan type mapping:', {
      original: step3Data.plan_type,
      mapped: mappedPlanType,
      selectedPlanId: step3Data.selectedPlan?.id
    });

    // Validate required fields - แก้ไขให้ใช้ค่า default ถ้าไม่มีข้อมูล
    if (!transformedCustomer.first_name) {
      console.warn('⚠️ Customer first_name is missing, using default value');
      transformedCustomer.first_name = 'ลูกค้า'; // ใช้ค่า default
    }

    if (!transformedCustomer.last_name) {
      console.warn('⚠️ Customer last_name is missing, using default value');
      transformedCustomer.last_name = 'ทั่วไป'; // ใช้ค่า default
    }

    if (!transformedCustomer.phone_number) {
      console.warn('⚠️ Customer phone_number is missing, using default value');
      transformedCustomer.phone_number = '0000000000'; // ใช้ค่า default
    }

    if (!transformedCustomer.tax_id) {
      console.warn('⚠️ Customer tax_id is missing, using default value');
      transformedCustomer.tax_id = '0000000000000'; // ใช้ค่า default
    }

    if (items.length === 0) {
      throw new Error('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');
    }

    if (!mappedPlanType) {
      throw new Error('กรุณาเลือกประเภทแผนการผ่อน');
    }

    // Clean nationalId - ลบขีดออกให้เหลือแค่ตัวเลข 13 หลัก
    let cleanNationalId = (transformedCustomer.tax_id || transformedCustomer.idCard || '').replace(/-/g, '');

    // Validate and fix nationalId format
    if (cleanNationalId && (cleanNationalId.length !== 13 || !/^\d{13}$/.test(cleanNationalId))) {
      console.warn('⚠️ Invalid nationalId format:', {
        original: transformedCustomer.tax_id,
        cleaned: cleanNationalId,
        length: cleanNationalId.length,
        isNumeric: /^\d+$/.test(cleanNationalId)
      });

      // Try to fix by padding or truncating
      if (cleanNationalId.length < 13 && cleanNationalId.length > 0) {
        cleanNationalId = cleanNationalId.padStart(13, '0');
        console.log('🔧 Padded nationalId:', cleanNationalId);
      } else if (cleanNationalId.length > 13) {
        cleanNationalId = cleanNationalId.substring(0, 13);
        console.log('🔧 Truncated nationalId:', cleanNationalId);
      }
    }

    // Final validation
    if (cleanNationalId && !/^\d{13}$/.test(cleanNationalId)) {
      console.error('❌ National ID still invalid after cleanup:', {
        value: cleanNationalId,
        type: typeof cleanNationalId,
        length: cleanNationalId.length,
        isNumeric: /^\d+$/.test(cleanNationalId)
      });
      throw new Error('เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบข้อมูล');
    }

    // Ensure string format
    cleanNationalId = String(cleanNationalId || '');

    console.log('✅ Final nationalId validation:', {
      value: cleanNationalId,
      type: typeof cleanNationalId,
      length: cleanNationalId.length,
      isValid: /^\d{13}$/.test(cleanNationalId)
    });

    // ✅ FIX: Create payload in the exact format expected by installmentController.createInstallment
    const payload = {
      // Items array - format expected by controller
      items: items.map(item => ({
        id: item.productId || item.product_id || item.stockId,
        productId: item.productId || item.product_id || item.stockId,
        name: item.name,
        brand: item.brand || '',
        price: parseFloat(item.price) || 0,
        quantity: parseInt(item.quantity) || 1,
        totalPrice: parseFloat(item.totalPrice) || (parseFloat(item.price) * parseInt(item.quantity)),
        imei: item.imei || '',
        stockType: item.stockType || 'imei',
        barcode: item.barcode || ''
      })),

      // Customer object - format expected by controller
      customer: {
        prefix: transformedCustomer.prefix || '',
        firstName: transformedCustomer.first_name || '',
        lastName: transformedCustomer.last_name || '',
        phone: transformedCustomer.phone_number || '',
        email: transformedCustomer.email || '',
        birthDate: transformedCustomer.birth_date || '',
        age: transformedCustomer.age || '',
        taxId: cleanNationalId || '',
        address: {
          houseNo: transformedCustomer.address?.houseNo || '',
          moo: transformedCustomer.address?.moo || '',
          lane: transformedCustomer.address?.lane || '',
          road: transformedCustomer.address?.road || '',
          subDistrict: transformedCustomer.address?.subDistrict || '',
          district: transformedCustomer.address?.district || '',
          province: transformedCustomer.address?.province || '',
          zipcode: transformedCustomer.address?.zipcode || ''
        }
      },

      // Branch code
      branch_code: window.BRANCH_CODE || step1Data.branchCode || '00000',

      // Installment plan object - format expected by controller
      installment_plan: {
        type: mappedPlanType || 'manual',
        downPayment: parseFloat(step3Data.down_payment) || 0,
        installmentPeriod: parseInt(step3Data.installment_count) || 1,
        installmentAmount: parseFloat(step3Data.installment_amount) || 0,
        creditAmount: parseFloat(step3Data.credit_amount) || 0,
        totalAmount: totalAmount,
        selectedPlan: step3Data.selectedPlan || {}
      },

      // Payment object - format expected by controller
      payment: {
        method: step3Data.paymentMethod || 'cash',
        downPayment: parseFloat(step3Data.down_payment) || 0,
        docFee: docFee || 500
      },

      // Customer type
      customer_type: step2Data.customerType || 'individual',

      // Attachments object - format expected by controller
      attachments: transformedAttachments,

      // Witness data
      witness: transformedWitness,

      // Additional salesperson data for record keeping
      salesperson_id: realSalespersonData.id,
      salesperson_name: realSalespersonData.name,

      // User info for created_by field
      user: {
        id: realSalespersonData.id,
        name: realSalespersonData.name
      }
    };

    console.log('🔍 Transformed payload for API:', {
      customerFirstName: payload.customer.firstName,
      customerPhone: payload.customer.phone,
      customerTaxId: payload.customer.taxId,
      itemsCount: payload.items.length,
      installmentPlanType: payload.installment_plan.type,
      branchCode: payload.branch_code,
      salespersonId: payload.salesperson_id,
      salespersonName: payload.salesperson_name,
      paymentMethod: payload.payment.method,
      downPayment: payload.installment_plan.downPayment,
      totalAmount: payload.installment_plan.totalAmount
    });

    console.log('🏢 Branch code debug:', {
      windowBranchCode: window.BRANCH_CODE,
      step1BranchCode: step1Data.branchCode,
      finalBranchCode: payload.branch_code,
      urlParams: window.location.search
    });

    console.log('✅ Validation check - Customer data ready:', {
      taxIdLength: payload.customer.taxId?.length || 0,
      phoneLength: payload.customer.phone?.length || 0,
      hasFirstName: !!payload.customer.firstName,
      hasLastName: !!payload.customer.lastName,
      witnessName: payload.witness?.firstName + ' ' + payload.witness?.lastName,
      attachmentCount: Object.keys(payload.attachments).filter(key => payload.attachments[key]).length,
      paymentMethod: payload.payment.method,
      planType: payload.installment_plan.type
    });

    console.log('🔍 Stock validation info:', {
      targetBranch: payload.branch_code,
      itemsWithIMEI: payload.items.filter(item => item.imei).length,
      allItemsData: payload.items.map(item => ({
        name: item.name,
        imei: item.imei || 'N/A',
        productId: item.productId || 'N/A'
      }))
    });

    return payload;

    } catch (error) {
      console.error('❌ Error creating installment payload:', error);
      throw error;
    }
  }

  numberToText(number) {
    // Convert number to Thai text (simplified version)
    const bahtText = new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(number);

    return `${bahtText} บาทถ้วน`;
  }

  // ========== EVENT HANDLING ==========

  setupEventListeners() {
    // Listen for step changes
    document.addEventListener('stepChanged', (event) => {
      this.currentStep = event.detail.step;
      console.log(`📍 Current step changed to: ${this.currentStep}`);
    });

    // Listen for page beforeunload
    window.addEventListener('beforeunload', () => {
      this.saveToStorage();
    });
  }

  notifyStepChange(stepNumber) {
    const event = new CustomEvent('installmentStepChanged', {
      detail: {
        stepNumber,
        stepData: this.data[`step${stepNumber}`],
        isCompleted: this.isStepCompleted(stepNumber),
        progress: this.getProgressPercentage(),
        nextStep: this.getNextStep()
      }
    });
    document.dispatchEvent(event);
  }

  // ========== AUTHENTICATION DATA INTEGRATION ==========

  async fetchUserDataFromAPI() {
    console.log('🌐 Fetching user data from API...');

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('No auth token found');
    }

    try {
      // เรียก API /api/users/me โดยตรง
      const response = await fetch('/api/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ API response received:', result);

      // รองรับหลาย response structure: {user: ...} หรือ {data: ...}
      const user = result.user || result.data;

      if ((result.success && user) || user) {

        // สร้างข้อมูลผู้ใช้ที่สมบูรณ์
        const userData = {
          id: user._id || user.id,
          username: user.username,
          userName: user.userName || user.user_name || user.username, // เพิ่ม userName field
          role: user.role,
          firstName: user.firstName || user.first_name,
          lastName: user.lastName || user.last_name,
          fullName: user.fullName || user.full_name ||
                   (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null) ||
                   (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : null),
          displayName: user.displayName || user.display_name,
          name: user.name || user.Name, // เพิ่ม name field
          email: user.email,
          phone: user.phone,
          branchCode: user.branchCode || user.branch_code,
          branchName: user.branchName || user.branch_name,
          department: user.department,
          position: user.position,
          status: user.status,
          isActive: user.isActive || user.is_active
        };

        console.log('📋 Processed user data:', userData);
        return userData;
      } else {
        throw new Error('Invalid API response structure');
      }

    } catch (error) {
      console.error('❌ API fetch error:', error.message);
      throw error;
    }
  }

  // ✅ NEW: Ensure salesperson data is available in step1
  async ensureSalespersonData() {
    try {
      console.log('🔄 Ensuring salesperson data is available...');
      const salespersonData = await this.getRealSalespersonData();

      if (salespersonData && salespersonData.id && salespersonData.name) {
        // Update step1 data with salesperson information
        this.data.step1.data.salespersonId = salespersonData.id;
        this.data.step1.data.salespersonName = salespersonData.name;

        // Save to storage
        this.saveToStorage();

        console.log('✅ Salesperson data updated in step1:', {
          id: salespersonData.id,
          name: salespersonData.name
        });
      } else {
        console.warn('⚠️ Could not fetch salesperson data');
      }
    } catch (error) {
      console.error('❌ Error ensuring salesperson data:', error);
    }
  }

  // ✅ NEW: Validate financial calculations for accuracy and compliance
  validateFinancialCalculations(step1Data, step3Data, taxInfo) {
    try {
      console.log('🧮 Validating financial calculations...');

      const productPrice = parseFloat(step1Data.totalAmount || 0);
      const downPayment = parseFloat(step3Data.down_payment || 0);
      const installmentAmount = parseFloat(step3Data.installment_amount || 0);
      const installmentCount = parseInt(step3Data.installment_count || 0);
      // Use docFee already declared at line 578
      const localDocFee = parseFloat(step3Data.doc_fee || 500);
      const creditAmount = parseFloat(step3Data.credit_amount || 0);

      // ✅ Validation 1: Down payment should not exceed product price
      if (downPayment > productPrice) {
        console.error('❌ Financial validation error: Down payment exceeds product price');
        throw new Error('เงินดาวน์ไม่สามารถมากกว่าราคาสินค้าได้');
      }

      // ✅ Validation 2: Credit amount calculation
      const expectedCreditAmount = productPrice - downPayment;
      const creditDifference = Math.abs(creditAmount - expectedCreditAmount);
      if (creditDifference > 1) { // Allow 1 baht tolerance for rounding
        console.warn('⚠️ Credit amount mismatch:', {
          expected: expectedCreditAmount,
          actual: creditAmount,
          difference: creditDifference
        });
      }

      // ✅ Validation 3: Total payment validation
      const totalInstallmentPayments = installmentAmount * installmentCount;
      const totalAmountPaid = downPayment + totalInstallmentPayments;
      const totalInterest = totalAmountPaid - productPrice;

      console.log('💰 Financial validation results:', {
        productPrice,
        downPayment,
        expectedCreditAmount,
        actualCreditAmount: creditAmount,
        installmentAmount,
        installmentCount,
        totalInstallmentPayments,
        totalAmountPaid,
        totalInterest,
        interestRate: productPrice > 0 ? ((totalInterest / productPrice) * 100).toFixed(2) + '%' : '0%'
      });

      // ✅ Validation 4: Interest rate reasonability check (should be reasonable for Thai market)
      if (productPrice > 0) {
        const interestRate = (totalInterest / productPrice) * 100;
        if (interestRate < 0) {
          console.error('❌ Financial validation error: Negative interest rate detected');
          throw new Error('อัตราดอกเบี้ยไม่สามารถติดลบได้');
        }
        if (interestRate > 36) { // Thai legal maximum for installment purchases
          console.warn('⚠️ High interest rate detected:', interestRate.toFixed(2) + '%');
        }
      }

      // ✅ Validation 5: VAT calculation accuracy
      const downPaymentWithFee = downPayment + localDocFee;
      let expectedVAT = 0;
      if (taxInfo.taxType === 'inclusive') {
        expectedVAT = Math.round((downPaymentWithFee - (downPaymentWithFee / 1.07)) * 100) / 100;
      } else if (taxInfo.taxType === 'exclusive' || taxInfo.taxType === 'vat') {
        expectedVAT = Math.round(downPaymentWithFee * 0.07 * 100) / 100;
      }

      const vatDifference = Math.abs(taxInfo.vatAmount - expectedVAT);
      if (vatDifference > 0.01) { // Allow 1 satang tolerance
        console.warn('⚠️ VAT calculation mismatch:', {
          expected: expectedVAT,
          actual: taxInfo.vatAmount,
          difference: vatDifference,
          taxType: taxInfo.taxType,
          base: downPaymentWithFee
        });
      }

      // ✅ Validation 6: Minimum payment validation
      if (installmentCount > 0 && installmentAmount < 100) {
        console.warn('⚠️ Very low installment amount detected:', installmentAmount);
      }

      console.log('✅ Financial calculations validated successfully');

    } catch (error) {
      console.error('❌ Financial validation error:', error);
      throw error; // Re-throw validation errors as they indicate serious issues
    }
  }

  async getRealSalespersonData() {
    console.log('🔍 Getting real salesperson data from authentication...');

    let userInfo = {};
    let branchInfo = {};

    // ลำดับความสำคัญ: localStorage (manual setting) > JWT Token > API fallback
    try {
      // ดึงข้อมูลจาก localStorage ก่อน (เพราะอาจมีชื่อจริงที่ตั้งไว้แล้ว)
      const storedUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const storedBranchInfo = JSON.parse(localStorage.getItem('branchInfo') || '{}');

      console.log('💾 localStorage userInfo:', storedUserInfo);
      console.log('💾 localStorage branchInfo:', storedBranchInfo);

      // ถ้าใน localStorage มีชื่อจริงแล้ว (ไม่ใช่ username) และไม่ใช่การตั้งค่าชั่วคราว
      const hasRealName = storedUserInfo.name &&
                         storedUserInfo.name !== storedUserInfo.username &&
                         storedUserInfo.name !== 'admin';

      // พยายามดึงข้อมูลจาก API ก่อนเสมอ เพื่อดูว่ามีชื่อจริงจาก API หรือไม่
      try {
        const apiUserData = await this.fetchUserDataFromAPI();
        console.log('✅ Successfully fetched user data from API');

        // ตรวจสอบว่า API มีชื่อจริงไหม (ไม่ใช่แค่ username)
        const apiHasRealName = apiUserData.name &&
                             apiUserData.name !== apiUserData.username &&
                             apiUserData.name !== 'admin';

        if (apiHasRealName) {
          console.log('🌟 API has real name, using API data:', apiUserData.name);
          // อัปเดต localStorage ด้วยข้อมูลจาก API
          localStorage.setItem('userInfo', JSON.stringify(apiUserData));
          console.log('💾 Updated localStorage with API data');
          userInfo = apiUserData;
        } else if (hasRealName) {
          console.log('✅ Found real name in localStorage, using it:', storedUserInfo.name);
          // ใช้ข้อมูลจาก localStorage เป็นหลัก
          userInfo = {
            id: storedUserInfo.id || storedUserInfo.user_id,
            name: storedUserInfo.name,
            username: storedUserInfo.username,
            userName: storedUserInfo.userName || storedUserInfo.name,
            branch_code: storedUserInfo.branch_code || storedBranchInfo.code || storedBranchInfo.branch_code,
            role: storedUserInfo.role
          };
        } else {
          console.log('⚠️ Neither API nor localStorage has real name, using available data');
          userInfo = apiUserData;
        }

      } catch (apiError) {
        console.log('⚠️ API fetch failed, using localStorage/JWT:', apiError.message);

        if (hasRealName) {
          console.log('✅ Found real name in localStorage, using it:', storedUserInfo.name);
          userInfo = {
            id: storedUserInfo.id || storedUserInfo.user_id,
            name: storedUserInfo.name,
            username: storedUserInfo.username,
            userName: storedUserInfo.userName || storedUserInfo.name,
            branch_code: storedUserInfo.branch_code || storedBranchInfo.code || storedBranchInfo.branch_code,
            role: storedUserInfo.role
          };
        } else {
          console.log('⚠️ No real name in localStorage, using stored data');
          userInfo = storedUserInfo;
        }
      }

      // ถ้ายังไม่มีข้อมูลเพียงพอ ให้ดึงจาก JWT
      const authToken = localStorage.getItem('authToken');
      if (authToken && !userInfo.id) {
        const tokenParts = authToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('🔑 JWT Payload as fallback:', payload);

          userInfo = {
            id: payload.id || payload.user_id || payload.userId || payload.sub,
            name: userInfo.name || payload.name || payload.fullName || payload.displayName || payload.username,
            username: payload.username || payload.user_name,
            userName: userInfo.userName || userInfo.name || payload.username,
            branch_code: userInfo.branch_code || payload.branch_code || payload.branchCode,
            role: payload.role
          };
        }
      }

      // สร้างชื่อเต็มจากข้อมูลที่มี (ถ้ายังไม่มี)
      if (!userInfo.name || userInfo.name === userInfo.username) {
        const storedUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        // ลองรวมชื่อจาก firstName/lastName
        if (storedUserInfo.firstName && storedUserInfo.lastName) {
          userInfo.name = `${storedUserInfo.firstName} ${storedUserInfo.lastName}`;
        } else if (storedUserInfo.first_name && storedUserInfo.last_name) {
          userInfo.name = `${storedUserInfo.first_name} ${storedUserInfo.last_name}`;
        } else if (storedUserInfo.fullName) {
          userInfo.name = storedUserInfo.fullName;
        } else if (storedUserInfo.displayName) {
          userInfo.name = storedUserInfo.displayName;
        } else if (userInfo.username) {
          userInfo.name = userInfo.username;
        }
      }

      // ถ้ายังไม่มี branch_code ให้ใช้ค่าเริ่มต้น
      if (!userInfo.branch_code) {
        userInfo.branch_code = userInfo.branchCode || window.BRANCH_CODE || 'MAIN';
      }

      // ดึงลายเซ็นจาก step3
      const step3Data = this.getStepData(3);
      const signature = step3Data?.signature || '';

      const result = {
        id: userInfo.id,
        name: userInfo.name,
        username: userInfo.username,
        branch_code: userInfo.branch_code,
        signature: signature,
        role: userInfo.role
      };

      console.log('📊 Final salesperson data:', result);

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!result.id) {
        throw new Error('ไม่พบ User ID กรุณาเข้าสู่ระบบใหม่');
      }

      if (!result.name && !result.username) {
        throw new Error('ไม่พบข้อมูลชื่อผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      }

      return result;

    } catch (e) {
      console.error('❌ Error retrieving salesperson data:', e);
      throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้ได้ กรุณาเข้าสู่ระบบใหม่');
    }
  }

  // ========== API INTEGRATION ==========

  async submitInstallment() {
    let payload = null; // Declare payload outside try block for error handling

    try {
      console.log('📤 Submitting installment contract...');

      // ✅ FIX: ล้าง quotation/contract related storage ทั้งหมดก่อนเริ่มสร้างสัญญาใหม่
      // เพื่อป้องกัน duplicate key error จากการใช้เลขเดิม
      sessionStorage.removeItem('currentQuotationNumber');
      sessionStorage.removeItem('quotationNumber');
      sessionStorage.removeItem('quotation_no');
      sessionStorage.removeItem('lastQuotationNumber');
      localStorage.removeItem('currentQuotationNumber');
      localStorage.removeItem('quotationNumber');
      localStorage.removeItem('quotation_no');
      localStorage.removeItem('lastQuotationNumber');
      console.log('🧹 Cleared all quotation/contract related storage before creating new contract');

      // Validate all steps
      for (let i = 1; i <= 3; i++) {
        if (!this.validateStep(i)) {
          const errors = this.getValidationErrors(i);
          throw new Error(`ข้อมูลขั้นตอนที่ ${i} ไม่ครบถ้วน: ${errors.join(', ')}`);
        }
      }

      // Pre-validate stock before creating payload
      console.log('🔍 Pre-validating stock availability...');
      const stockValidation = await this.validateItemsStock();
      if (!stockValidation.valid) {
        console.error('🏪 Stock validation failed:', stockValidation.errors);
        throw new Error(`ปัญหาเกี่ยวกับสต๊อกสินค้า:\n\n${stockValidation.errors.join('\n')}`);
      }

      payload = await this.getInstallmentPayload();

      // เพิ่มข้อมูลการจองสต็อกหากมี
      if (this.data.step2?.data?.hasStockReservation && this.data.step2?.data?.stockReservation) {
        payload.stockReservation = this.data.step2.data.stockReservation;
        payload.hasStockReservation = true;
        console.log('🔒 Adding stock reservation to payload:', this.data.step2.data.stockReservation);
      }

      // เพิ่มข้อมูลจาก deposit navigation data
      if (this.data.step2?.data?.depositNavigationData) {
        payload.depositNavigationData = this.data.step2.data.depositNavigationData;
        console.log('📦 Adding deposit navigation data to payload');
      }

      console.log('📋 Installment payload:', payload);

      console.log('🔍 Payment method debug:', {
        stepPaymentMethod: this.data.step3?.data?.paymentMethod || 'cash',
        payloadPaymentMethod: payload.payment_method,
        payloadPaymentInfo: payload.paymentInfo,
        purchaseType: payload.purchase_type,
        transactionType: payload.transaction_type,
        note: 'Using cash/credit to avoid enum validation errors'
      });

      // ✅ Debug signatures in payload
      console.log('🖋️ Signatures debug in payload:', {
        customerSignature: !!payload.customerSignature,
        customerSignatureUrl: !!payload.customerSignatureUrl,
        salespersonSignature: !!payload.salespersonSignature,
        salespersonSignatureUrl: !!payload.salespersonSignatureUrl,
        authorizedSignature: !!payload.authorizedSignature,
        authorizedSignatureUrl: !!payload.authorizedSignatureUrl,
        customerSignatureValue: payload.customerSignature?.substring(0, 50) + '...' || 'null',
        salespersonSignatureValue: payload.salespersonSignature?.substring(0, 50) + '...' || 'null'
      });

      // 🔍 Debug: ตรวจสอบข้อมูลสำคัญ
      console.log('🔍 Validation check (using installment API):');
      console.log('  Customer data:', payload.customer);
      console.log('  Customer ID Card:', payload.customer?.customerIdCard);
      console.log('  Customer Address:', payload.customer?.customerAddress);
      console.log('  Tax ID:', payload.customer?.taxId);
      console.log('  Items count:', payload.items?.length || 0);
      console.log('  Plan type:', payload.plan_type);
      console.log('  PlanType (camelCase):', payload.planType);
      console.log('  Date:', payload.date);
      console.log('  Down payment:', payload.down_payment);
      console.log('  Installment count:', payload.installment_count);
      console.log('  Branch code:', payload.branch_code);

      // 📋 Debug: Complete customer data structure
      console.log('📋 Complete Customer Data Structure:', {
        customerIdCard: payload.customer?.customerIdCard,
        customerAddress: payload.customer?.customerAddress,
        taxId: payload.customer?.taxId,
        nationalId: payload.nationalId,
        nationalIdLength: payload.nationalId?.length,
        nationalIdIsNumeric: /^\d+$/.test(payload.nationalId || ''),
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone
      });

      // ✅ Validate critical fields before API call
      const validationErrors = [];

      if (!payload.nationalId || payload.nationalId.length !== 13 || !/^\d{13}$/.test(payload.nationalId)) {
        validationErrors.push(`Invalid nationalId: '${payload.nationalId}' (length: ${payload.nationalId?.length})`);
      }

      if (!payload.firstName) {
        validationErrors.push('Missing firstName');
      }

      if (!payload.lastName) {
        validationErrors.push('Missing lastName');
      }

      if (!payload.phone || payload.phone.length < 9) {
        validationErrors.push(`Invalid phone: '${payload.phone}'`);
      }

      if (validationErrors.length > 0) {
        console.error('❌ Validation errors before API call:', validationErrors);
        throw new Error(`การตรวจสอบข้อมูลไม่ผ่าน: ${validationErrors.join(', ')}`);
      }

      console.log('✅ Pre-API validation passed');

      // ✅ Clean payload of any potential problematic fields before sending
      const cleanPayload = { ...payload };

      // Remove any points-related data that might cause enum validation errors
      delete cleanPayload.points;

      // Ensure customer object doesn't have problematic nested data
      if (cleanPayload.customer) {
        delete cleanPayload.customer.points;
        delete cleanPayload.customer.history;
      }

      // Clean customerData object
      if (cleanPayload.customerData) {
        delete cleanPayload.customerData.points;
        delete cleanPayload.customerData.history;
      }

      // Remove any undefined or null values at root level
      Object.keys(cleanPayload).forEach(key => {
        if (cleanPayload[key] === undefined || cleanPayload[key] === null) {
          delete cleanPayload[key];
        }
      });

      console.log('🧹 Cleaned payload for API submission');

      // ✅ Final validation and logging before API call
      console.log('🔍 Final payload validation before API call:');
      console.log('  nationalId:', cleanPayload.nationalId, '(type:', typeof cleanPayload.nationalId, ', length:', cleanPayload.nationalId?.length, ')');
      console.log('  nationalId regex test:', /^\d{13}$/.test(cleanPayload.nationalId || ''));
      console.log('  firstName:', cleanPayload.firstName);
      console.log('  lastName:', cleanPayload.lastName);
      console.log('  phone:', cleanPayload.phone);
      console.log('  Has points field:', !!cleanPayload.points);
      console.log('  Has customer.points field:', !!cleanPayload.customer?.points);
      console.log('  Has customerData.points field:', !!cleanPayload.customerData?.points);

      // 🔍 Deep scan for any points or referenceType references
      const payloadStr = JSON.stringify(cleanPayload);
      const hasPointsRef = payloadStr.includes('points');
      const hasReferenceTypeRef = payloadStr.includes('referenceType');
      const hasHistoryRef = payloadStr.includes('history');

      console.log('🔍 Deep payload scan:', {
        hasPointsReference: hasPointsRef,
        hasReferenceTypeReference: hasReferenceTypeRef,
        hasHistoryReference: hasHistoryRef,
        payloadSize: payloadStr.length
      });

      if (hasPointsRef || hasReferenceTypeRef || hasHistoryRef) {
        console.warn('⚠️ Found problematic references in payload!');
        // Find and log the context of these references
        if (hasPointsRef) {
          const pointsIndex = payloadStr.indexOf('points');
          console.warn('Points reference found at position:', pointsIndex);
          console.warn('Context:', payloadStr.substring(Math.max(0, pointsIndex - 50), pointsIndex + 100));
        }
        if (hasReferenceTypeRef) {
          const refIndex = payloadStr.indexOf('referenceType');
          console.warn('ReferenceType reference found at position:', refIndex);
          console.warn('Context:', payloadStr.substring(Math.max(0, refIndex - 50), refIndex + 100));
        }
      }

      // 📤 Transform payload to match server expectations

      // The server expects only these 3 required fields:
      // - customerId (MongoDB ObjectId)
      // - productId (MongoDB ObjectId)
      // - totalAmount (Number)

      // For now, we need to create/find the customer first, then use the customerId
      // Since this is a complex transformation, let's extract the required fields from the payload

      // ✅ Step 1: Find or create customer
      let customerId = cleanPayload.customer?.id || cleanPayload.customer?._id || null;

      if (!customerId) {
        console.log('👤 No existing customerId found, searching for existing customer first...');

        const taxId = cleanPayload.nationalId || cleanPayload.customer?.tax_id || cleanPayload.customer?.taxId || '';
        const phone = cleanPayload.phone || cleanPayload.customer?.phone_number || cleanPayload.customer?.phoneNumber || '';

        // ✅ Step 1a: Search for existing customer by tax ID or phone
        if (taxId || phone) {
          const searchQuery = taxId || phone;
          console.log('🔍 Searching for existing customer with:', { taxId, phone, searchQuery });

          const searchResponse = await fetch(`/api/customers/search?q=${encodeURIComponent(searchQuery)}&limit=1`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken') || 'no-token'}`
            }
          });

          if (searchResponse.ok) {
            const searchResult = await searchResponse.json();
            console.log('🔍 Customer search result:', searchResult);

            if (searchResult.data && searchResult.data.length > 0) {
              customerId = searchResult.data[0]._id;
              console.log('✅ Found existing customer with ID:', customerId);
            } else {
              console.log('🔍 No existing customer found, will create new one');
            }
          } else {
            console.warn('⚠️ Customer search failed, will attempt to create new customer');
          }
        }

        // ✅ Step 1b: Create customer if not found
        if (!customerId) {
          console.log('👤 Creating new customer...');

          const customerData = {
            customerType: 'individual', // Assume individual for installment customers
            individual: {
              prefix: cleanPayload.customer?.prefix || cleanPayload.customer?.title || '',
              firstName: cleanPayload.firstName || cleanPayload.customer?.firstName || cleanPayload.customer?.first_name || '',
              lastName: cleanPayload.lastName || cleanPayload.customer?.lastName || cleanPayload.customer?.last_name || '',
              taxId: taxId,
              phone: phone,
              email: cleanPayload.customer?.email || '',
              birthDate: cleanPayload.customer?.birthDate || cleanPayload.customer?.birth_date || '',
              address: this.formatAddress(cleanPayload.customer?.address) || ''
            },
            branchCode: cleanPayload.branch_code || cleanPayload.branchCode || '00000',
            status: 'active'
          };

          console.log('👤 Creating customer with data:', customerData);

          const customerResponse = await fetch('/api/customers/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken') || 'no-token'}`
            },
            body: JSON.stringify(customerData)
          });

          if (!customerResponse.ok) {
            const customerError = await customerResponse.json().catch(() => null);
            console.error('❌ Failed to create customer:', customerError);

            // If customer already exists (duplicate tax ID), try to search again
            if (customerError?.message?.includes('เลขประจำตัวผู้เสียภาษี') || customerError?.message?.includes('duplicate')) {
              console.log('🔄 Customer already exists, searching again...');

              const retrySearchResponse = await fetch(`/api/customers/search?q=${encodeURIComponent(taxId)}&limit=1`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('authToken') || 'no-token'}`
                }
              });

              if (retrySearchResponse.ok) {
                const retryResult = await retrySearchResponse.json();
                if (retryResult.data && retryResult.data.length > 0) {
                  customerId = retryResult.data[0]._id;
                  console.log('✅ Found existing customer on retry with ID:', customerId);
                }
              }

              if (!customerId) {
                throw new Error('พบข้อมูลลูกค้าในระบบแต่ไม่สามารถค้นหาได้');
              }
            } else {
              throw new Error('ไม่สามารถสร้างข้อมูลลูกค้าได้: ' + (customerError?.message || customerResponse.statusText));
            }
          } else {
            const customerResult = await customerResponse.json();
            customerId = customerResult.data?._id || customerResult._id;

            if (!customerId) {
              console.error('❌ Customer creation succeeded but no ID returned:', customerResult);
              throw new Error('สร้างลูกค้าสำเร็จแต่ไม่ได้รับรหัสลูกค้า');
            }

            console.log('✅ Customer created successfully with ID:', customerId);
          }
        }
      } else {
        console.log('👤 Using existing customerId:', customerId);
      }

      // ✅ Step 2: Prepare installment payload with all required fields
      const installmentMonths = parseInt(cleanPayload.installment_count || cleanPayload.installmentPeriod || 12);
      const totalAmount = parseFloat(cleanPayload.total_amount || cleanPayload.totalAmount || cleanPayload.grand_total || 0);
      const downPayment = parseFloat(cleanPayload.down_payment || cleanPayload.downPayment || 0);
      const financeAmount = totalAmount - downPayment;
      const interestRate = 0; // Assuming 0% interest for now
      const totalInterest = (financeAmount * interestRate) / 100;
      const monthlyPayment = financeAmount / installmentMonths;

      // Calculate dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(startDate.getMonth() + installmentMonths);

      // Get current user ID for createdBy from JWT token
      const userId = window.authHelper?.getUserIdFromToken() || this.getUserIdFromToken();

      // 🔍 Debug: Check if we got userId
      console.log('🔍 Debug userId:', userId);

      // Fallback: Try to get userId from userInfo in step4.html
      // ✅ Using the correct payload format from getInstallmentPayload() instead of creating transformedPayload
      console.log('📋 Ready to submit installment with correct payload format');

      // ✅ Validate the payload format for installmentController.createInstallment
      const installmentValidationErrors = [];

      if (!payload.items || payload.items.length === 0) {
        installmentValidationErrors.push('items array is required');
      }

      if (!payload.customer || !payload.customer.firstName || !payload.customer.lastName) {
        installmentValidationErrors.push('customer object with firstName and lastName is required');
      }

      if (!payload.branch_code) {
        installmentValidationErrors.push('branch_code is required');
      }

      if (!payload.installment_plan || !payload.installment_plan.type) {
        installmentValidationErrors.push('installment_plan object with type is required');
      }

      if (!payload.payment || !payload.payment.method) {
        installmentValidationErrors.push('payment object with method is required');
      }

      if (!payload.customer_type) {
        installmentValidationErrors.push('customer_type is required');
      }

      // Additional validation for financial calculations
      if (!payload.installment_plan.downPayment || payload.installment_plan.downPayment < 0) {
        installmentValidationErrors.push('downPayment must be greater than or equal to 0');
      }

      if (!payload.installment_plan.installmentAmount || payload.installment_plan.installmentAmount <= 0) {
        installmentValidationErrors.push('installmentAmount must be greater than 0');
      }

      if (!payload.installment_plan.installmentPeriod || payload.installment_plan.installmentPeriod <= 0) {
        installmentValidationErrors.push('installmentPeriod must be greater than 0');
      }

      if (installmentValidationErrors.length > 0) {
        console.error('❌ Installment validation errors:', installmentValidationErrors);
        throw new Error(`ข้อมูลไม่ครบถ้วนสำหรับสร้างสัญญา: ${installmentValidationErrors.join(', ')}`);
      }

      console.log('✅ All installment required fields validated successfully');

      // ✅ FIX: Call the correct installment API endpoint with enhanced error handling and retry mechanism
      let response;
      let fetchError = null;
      const MAX_RETRIES = 5; // เพิ่มจาก 3 เป็น 5 attempts
      const RETRY_DELAY = 3000; // เพิ่มจาก 2 เป็น 3 วินาที

      // Retry function with exponential backoff
      const retryableApiCall = async (attemptNumber = 1) => {
        try {
          console.log(`📡 Sending request to /api/installment/create... (attempt ${attemptNumber}/${MAX_RETRIES})`);

          const response = await fetch('/api/installment/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken') || 'no-token'}`
            },
            body: JSON.stringify(payload),
            // Add timeout and signal for better error handling - เพิ่ม timeout เป็น 120 วินาที
            signal: AbortSignal.timeout(120000) // 120 second timeout สำหรับ complex operations
          });

          // If we get a 504 and haven't exhausted retries, retry
          if (response.status === 504 && attemptNumber < MAX_RETRIES) {
            console.log(`⏳ Got 504 timeout, retrying in ${RETRY_DELAY * attemptNumber}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attemptNumber));
            return retryableApiCall(attemptNumber + 1);
          }

          return response;
        } catch (networkError) {
          if (attemptNumber < MAX_RETRIES && (
              networkError.name === 'AbortError' ||
              networkError.message.includes('timeout') ||
              networkError.message.includes('fetch')
            )) {
            console.log(`⏳ Network error, retrying in ${RETRY_DELAY * attemptNumber}ms...`, networkError.message);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attemptNumber));
            return retryableApiCall(attemptNumber + 1);
          }
          throw networkError;
        }
      };

      try {
        response = await retryableApiCall();
      } catch (networkError) {
        fetchError = networkError;
        console.error('❌ Network/Fetch error after all retries:', networkError);

        // Enhanced error handling for different types of network errors
        if (networkError.name === 'AbortError') {
          throw new Error('⏰ การเชื่อมต่อหมดเวลา (120 วินาที) - การสร้างสัญญาอาจใช้เวลานานกว่าปกติ กรุณาตรวจสอบสถานะสัญญาและลองใหม่อีกครั้ง');
        } else if (networkError.name === 'TypeError' && networkError.message.includes('fetch')) {
          throw new Error('🌐 ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง');
        } else if (networkError.message.includes('timeout')) {
          throw new Error('⏱️ เซิร์ฟเวอร์ใช้เวลาประมวลผลนานเกินไป กรุณารอสักครู่แล้วตรวจสอบสถานะสัญญา หากยังไม่มีข้อมูลให้ลองสร้างใหม่');
        } else {
          throw new Error(`💥 เกิดข้อผิดพลาดในการเชื่อมต่อ: ${networkError.message} - กรุณาลองใหม่อีกครั้ง`);
        }
      }

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        // 🔍 Enhanced error logging
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails = null;

        try {
          // Read response once to avoid "body stream already read" error
          const responseText = await response.text();
          console.error('❌ Raw server response:', responseText);

          try {
            // Try to parse as JSON first
            const errorData = JSON.parse(responseText);
            errorDetails = errorData;
            errorMessage = errorData.message || errorData.error || errorMessage;

            // Log specific error details for debugging
            if (errorData.validationErrors) {
              console.error('❌ Validation errors:', errorData.validationErrors);
            }
            if (errorData.stack) {
              console.error('❌ Server stack trace:', errorData.stack);
            }
          } catch (jsonParseError) {
            // If response is not JSON (like HTML error page), use raw text
            console.error('❌ Response is not JSON, using raw text:', jsonParseError);
            errorMessage = responseText || errorMessage;
          }

        } catch (readError) {
          console.error('❌ Could not read response:', readError);
          errorMessage = `Network error: ${readError.message}`;
        }

        // Create detailed error for debugging with improved user messaging
        let userFriendlyMessage = errorMessage;

        // Provide better user messages for common error codes
        switch (response.status) {
          case 400:
            userFriendlyMessage = 'ข้อมูลที่ส่งไม่ถูกต้อง กรุณาตรวจสอบข้อมูลอีกครั้ง';
            if (errorDetails?.errors?.length > 0) {
              userFriendlyMessage += '\nรายละเอียด: ' + errorDetails.errors.join(', ');
            }
            break;
          case 401:
            userFriendlyMessage = 'ไม่มีสิทธิ์เข้าใช้งาน กรุณาเข้าสู่ระบบใหม่';
            break;
          case 403:
            userFriendlyMessage = 'ไม่มีสิทธิ์ในการดำเนินการนี้';
            break;
          case 404:
            userFriendlyMessage = 'ไม่พบบริการที่ต้องการ กรุณาติดต่อผู้ดูแลระบบ';
            break;
          case 504:
            userFriendlyMessage = '⏰ เซิร์ฟเวอร์ใช้เวลานานเกินไป - การสร้างสัญญาอาจสำเร็จแล้ว กรุณาตรวจสอบรายการสัญญาในระบบ หากยังไม่มีข้อมูลให้ลองสร้างใหม่อีกครั้ง';
            break;
          case 503:
            userFriendlyMessage = '🔧 ระบบกำลังปรับปรุง กรุณาลองใหม่อีกครั้งในอีกสักครู่';
            break;
          case 409:
            userFriendlyMessage = 'ข้อมูลซ้ำกับที่มีอยู่แล้วในระบบ';
            break;
          case 422:
            userFriendlyMessage = 'ข้อมูลไม่สมบูรณ์ กรุณากรอกข้อมูลให้ครบถ้วน';
            break;
          case 500:
            userFriendlyMessage = 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ';
            break;
          case 502:
          case 503:
          case 504:
            userFriendlyMessage = 'เซิร์ฟเวอร์ไม่พร้อมให้บริการ กรุณาลองใหม่อีกครั้งในภายหลัง';
            break;
          default:
            userFriendlyMessage = `เกิดข้อผิดพลาดในการสร้างสัญญาผ่อนชำระ (รหัสข้อผิดพลาด: ${response.status})`;
        }

        const detailedError = new Error(userFriendlyMessage);
        detailedError.statusCode = response.status;
        detailedError.details = errorDetails;
        detailedError.originalMessage = errorMessage;
        detailedError.userFriendly = true;

        console.error('❌ Complete error details:', {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage,
          userFriendlyMessage,
          details: errorDetails,
          url: response.url
        });

        throw detailedError;
      }

      const result = await response.json();

      if (result.success) {
        // Update step4 data with contract information
        this.updateStepData(4, {
          quotation_no: result.data.quotationNo || result.data.quotation_no,
          contract_no: result.data.contractNo || result.data.contract_no,
          invoice_no: result.data.invoiceNo || result.data.invoice_no,
          total_amount: payload.total_amount,
          total_text: payload.total_text,
          stockDeducted: true,
          transactionCompleted: true
        });

        this.completeStep(4);

        // ✅ FIX: ล้าง quotation number จาก sessionStorage หลังสร้างสัญญาสำเร็จ
        // เพื่อให้สร้างเลขใหม่สำหรับสัญญาถัดไป
        sessionStorage.removeItem('currentQuotationNumber');
        console.log('🧹 Cleared quotation number from sessionStorage for next contract');

        console.log('✅ Installment contract created successfully:', result.data);

        // จัดการการจองสต็อกหลังสร้างสัญญาสำเร็จ
        if (result.data.hasStockReservation && result.data.stockReservation) {
          console.log('🔒 Stock reservation was processed:', result.data.stockReservation);

          if (result.data.stockReservation.success) {
            console.log('✅ Stock deducted successfully for reserved item');

            // แจ้งเตือนผู้ใช้
            if (typeof showToast === 'function') {
              showToast(
                `ตัดสต็อกสินค้าที่จองสำเร็จ: ${result.data.stockReservation.stock?.productName}`,
                'success'
              );
            }
          } else {
            console.warn('⚠️ Stock reservation processing failed:', result.data.stockReservation.error);

            if (typeof showToast === 'function') {
              showToast(
                `ไม่สามารถตัดสต็อกสินค้าที่จองได้: ${result.data.stockReservation.error}`,
                'warning'
              );
            }
          }
        }

        // 🧾 สร้างใบเสร็จ/ใบกำกับภาษีสำหรับเงินดาวน์อัตโนมัติ
        try {
          if (window.installmentReceiptTaxInvoiceManager) {
            console.log('🔗 Creating receipt/tax invoice for down payment...');

            const contractData = {
              contractNo: result.data.contractNo || result.data.contract_no,
              quotationNo: result.data.quotationNo || result.data.quotation_no,
              customer: payload.customer,
              items: payload.items,
              staffName: payload.staff_name || payload.employeeName
            };

            // 🔍 DEBUG: ตรวจสอบข้อมูลที่ส่งไปยัง receipt-tax-invoice-integration
            console.log('🔍 CONTRACT DATA DEBUG (sending to receipt-tax-invoice):', {
              contractData,
              customerData: payload.customer,
              customerTaxId: payload.customer?.tax_id || payload.customer?.taxId,
              customerAddress: payload.customer?.address
            });

            const installmentData = {
              downPayment: payload.down_payment,
              totalPrice: payload.total_amount,
              installmentAmount: payload.installment_amount,
              installmentPeriod: payload.installment_count,
              paymentMethod: payload.payment_method || 'cash',
              docFee: payload.doc_fee || 500 // เพิ่ม docFee สำหรับการสร้างเอกสาร
            };

            const integrationResult = await window.installmentReceiptTaxInvoiceManager.integrateWithInstallmentSystem(
              contractData,
              installmentData
            );

            if (integrationResult.success) {
              console.log('✅ Receipt/Tax Invoice integration completed successfully');

              // เพิ่มข้อมูลเอกสารลงใน result
              result.data.documentInfo = integrationResult.document;
            } else {
              console.warn('⚠️ Receipt/Tax Invoice integration failed:', integrationResult.error);
            }
          } else {
            console.warn('⚠️ installmentReceiptTaxInvoiceManager not found, skipping document creation');
          }
        } catch (integrationError) {
          console.warn('⚠️ Receipt/Tax Invoice integration error (non-blocking):', integrationError);
          // ไม่ให้ error ของ document integration ขัดขวางการสร้างสัญญา
        }

        return result.data;
      } else {
        throw new Error(result.message || 'Failed to create installment contract');
      }

    } catch (error) {
      console.error('❌ Error submitting installment:', error);

      // Print debug information for troubleshooting
      console.group('🔍 Debug Information for Error Analysis:');
      this.printDebugInfo();
      console.groupEnd();

      // Enhanced error handling for specific error types
      const errorMessage = error.message || error.toString();

      if (errorMessage.includes('ไม่พบสต๊อก') || errorMessage.includes('stock')) {
        console.error('🏪 Stock-related error detected:', {
          currentBranch: window.BRANCH_CODE,
          payloadBranch: payload?.branch_code,
          itemsCount: payload?.items?.length || 0,
          errorMessage: errorMessage
        });

        // Provide helpful error message
        const stockError = new Error(`สินค้าที่เลือกไม่มีในสาขา ${window.BRANCH_CODE || 'ปัจจุบัน'}\n\nกรุณา:\n1. เลือกสินค้าใหม่ที่มีสต๊อกในสาขานี้\n2. หรือเปลี่ยนไปสาขาที่มีสินค้านี้\n\nรายละเอียด: ${errorMessage}`);
        stockError.type = 'STOCK_ERROR';
        throw stockError;
      }

      if (errorMessage.includes('validation failed') || errorMessage.includes('enum')) {
        const validationError = new Error(`ข้อมูลไม่ถูกต้องตามรูปแบบที่กำหนด\n\nรายละเอียด: ${errorMessage}`);
        validationError.type = 'VALIDATION_ERROR';
        throw validationError;
      }

      // For other errors, throw as-is
      throw error;
    }
  }

  // ========== STOCK VALIDATION ==========

  async validateItemsStock(branchCode = null) {
    try {
      const targetBranch = branchCode || window.BRANCH_CODE || '00000';
      const step1Data = this.getStepData(1);

      if (!step1Data?.cartItems?.length) {
        return { valid: false, errors: ['ไม่มีสินค้าในตะกร้า'] };
      }

      const errors = [];
      const validItems = [];

      for (const item of step1Data.cartItems) {
        if (item.imei && item.imei !== '') {
          // For IMEI products, check if IMEI exists in target branch
          if (item.branch_code && item.branch_code !== targetBranch) {
            errors.push(`${item.name} (IMEI: ${item.imei}) อยู่ในสาขา ${item.branch_code} ไม่ใช่สาขา ${targetBranch}`);
          } else {
            validItems.push(item);
          }
        } else {
          // For non-IMEI products, assume they're available
          validItems.push(item);
        }
      }

      console.log('🔍 Stock validation result:', {
        targetBranch,
        totalItems: step1Data.cartItems.length,
        validItems: validItems.length,
        errors: errors.length,
        errorDetails: errors
      });

      return {
        valid: errors.length === 0,
        errors,
        validItems,
        targetBranch
      };

    } catch (error) {
      console.error('❌ Error validating stock:', error);
      return {
        valid: false,
        errors: [`เกิดข้อผิดพลาดในการตรวจสอบสต๊อก: ${error.message}`]
      };
    }
  }

  // ========== DEBUG HELPERS ==========

  // 🔧 NEW: ฟังก์ชันสำหรับดึงข้อมูลทั้งหมด (สำหรับ PDF generation และ Gmail)
  getAllStepData() {
    return {
      step1: this.getStepData(1),
      step2: this.getStepData(2),
      step3: this.getStepData(3),
      step4: this.getStepData(4) || {},
      // เพิ่มข้อมูลเสริม
      signatures: {
        customer: localStorage.getItem('customerSignature') || '',
        salesperson: localStorage.getItem('salespersonSignature') || '',
        authorized: localStorage.getItem('authorizedSignature') || ''
      },
      branchCode: window.BRANCH_CODE || '00000',
      currentBranch: window.BRANCH_CODE,
      quotationNumber: this.quotationNumber,
      invoiceNumber: this.invoiceNumber
    };
  }

  getDebugInfo() {
    return {
      currentBranch: window.BRANCH_CODE,
      urlParams: window.location.search,
      step1Data: this.getStepData(1),
      step2Data: this.getStepData(2),
      step3Data: this.getStepData(3),
      localStorage: {
        activeBranch: localStorage.getItem('activeBranch'),
        activeBranchName: localStorage.getItem('activeBranchName'),
        installmentData: localStorage.getItem('installmentData') ? 'exists' : 'not found'
      }
    };
  }

  // ✅ FIX: เพิ่มฟังก์ชันอัพเดท quotation number หลังจากที่ backend สร้างเสร็จ
  updateQuotationNumber(newQuotationNumber) {
    try {
      console.log('🔄 Updating quotation number from', this.quotationNumber, 'to', newQuotationNumber);

      // อัพเดท quotation number หลัก
      this.quotationNumber = newQuotationNumber;

      // อัพเดท session storage
      sessionStorage.setItem('currentQuotationNumber', newQuotationNumber);
      sessionStorage.setItem('actualQuotationNumber', newQuotationNumber);

      // อัพเดท quotation data ที่มีอยู่
      if (this.quotationData) {
        this.quotationData.quotationNumber = newQuotationNumber;
        this.quotationData.quotationNo = newQuotationNumber;
        this.quotationData.number = newQuotationNumber;
        this.quotationData.documentNumber = newQuotationNumber;
      }

      console.log('✅ Quotation number updated successfully:', newQuotationNumber);
      console.log('📊 Updated quotation data:', this.quotationData);

      return true;
    } catch (error) {
      console.error('❌ Error updating quotation number:', error);
      return false;
    }
  }

  printDebugInfo() {
    const debug = this.getDebugInfo();
    console.table({
      'Current Branch': debug.currentBranch,
      'URL Branch': new URLSearchParams(window.location.search).get('branch'),
      'Cart Items': debug.step1Data?.cartItems?.length || 0,
      'Customer Name': `${debug.step2Data?.customer?.first_name || ''} ${debug.step2Data?.customer?.last_name || ''}`.trim(),
      'Payment Plan': debug.step3Data?.plan_type || 'none',
      'Down Payment': debug.step3Data?.down_payment || 0
    });

    if (debug.step1Data?.cartItems?.length > 0) {
      console.group('🛒 Cart Items Details:');
      debug.step1Data.cartItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}`, {
          imei: item.imei || 'N/A',
          price: item.price,
          branch: item.branch_code || 'unknown',
          stockId: item.stockId || item._id || 'N/A'
        });
      });
      console.groupEnd();
    }

    return debug;
  }

  // ========== UTILITY METHODS ==========

  formatAddress(addressData) {
    if (!addressData || typeof addressData !== 'object') {
      return 'ไม่มีข้อมูล';
    }

    const parts = [];

    if (addressData.houseNo) parts.push(`เลขที่ ${addressData.houseNo}`);
    if (addressData.moo) parts.push(`หมู่ ${addressData.moo}`);
    if (addressData.lane || addressData.soi) parts.push(`ซอย ${addressData.lane || addressData.soi}`);
    if (addressData.road || addressData.street) parts.push(`ถนน ${addressData.road || addressData.street}`);
    if (addressData.subDistrict) parts.push(`ตำบล ${addressData.subDistrict}`);
    if (addressData.district) parts.push(`อำเภอ ${addressData.district}`);
    if (addressData.province) parts.push(`จังหวัด ${addressData.province}`);
    if (addressData.zipcode || addressData.postalCode) parts.push(`รหัสไปรษณีย์ ${addressData.zipcode || addressData.postalCode}`);

    return parts.length > 0 ? parts.join(' ') : 'ไม่มีข้อมูล';
  }

  /**
   * Extract user ID from JWT token
   * @returns {string|null} User ID from token or null if not found
   */
  getUserIdFromToken() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('⚠️ No auth token found in localStorage');
        return null;
      }

      // Decode JWT token (simple base64 decode of payload)
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('⚠️ Invalid JWT token format');
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));
      console.log('🔍 JWT Payload debug:', payload);
      const userId = payload.userId || payload.id || payload.sub || payload._id || payload.user_id;

      if (!userId) {
        console.warn('⚠️ No userId found in JWT token payload');
        return null;
      }

      console.log('✅ Successfully extracted userId from JWT token:', userId);
      return userId;
    } catch (error) {
      console.error('❌ Error decoding JWT token:', error);
      return null;
    }
  }

  clearAllData() {
    // ✅ FIX: Get current user info when clearing data
    const userInfo = this.getStorageItem('userInfo', null);
    const currentUserId = userInfo?.id || this.getStorageItem('userId', null);
    const currentUserName = userInfo?.name || userInfo?.username || this.getStorageItem('userName', null);

    this.data = {
      step1: { completed: false, data: { cartItems: [], selectedProducts: [], totalAmount: 0, subTotal: 0, branchCode: window.BRANCH_CODE || null, salespersonId: currentUserId, salespersonName: currentUserName } },
      step2: { completed: false, data: { customer: {}, witness: {}, attachments: {}, customerType: 'individual' } },
      step3: { completed: false, data: { plan_type: '', down_payment: 0, installment_count: 0, installment_amount: 0, credit_amount: 0, payoff_amount: 0, doc_fee: 0, credit_term: '', selectedPlan: null, paymentMethod: 'cash' } },
      step4: { completed: false, data: { quotation_no: '', contract_no: '', invoice_no: '', total_amount: 0, total_text: '', quotation_terms: '', documents: {}, emailSent: false, stockDeducted: false, transactionCompleted: false } }
    };

    // Clear localStorage
    ['installmentData', 'cartItems', 'cartData', 'step1_selectedProducts', 'customerData', 'paymentPlan'].forEach(key => {
      localStorage.removeItem(key);
    });

    this.saveToStorage();
    console.log('🗑️ All installment data cleared');
  }

  debug() {
    return {
      currentStep: this.currentStep,
      isInitialized: this.isInitialized,
      progress: this.getProgressPercentage(),
      completedSteps: Object.entries(this.data).filter(([key, value]) => value.completed).map(([key]) => key),
      nextStep: this.getNextStep(),
      dataSize: JSON.stringify(this.data).length,
      validationErrors: {
        step1: this.getValidationErrors(1),
        step2: this.getValidationErrors(2),
        step3: this.getValidationErrors(3),
        step4: this.getValidationErrors(4)
      }
    };
  }

  // ✅ เพิ่มฟังก์ชันดึงลายเซ็นลูกค้า
  getCustomerSignature(step2Data) {
    // ลำดับความสำคัญในการดึงลายเซ็นลูกค้า:
    // 1. จาก step2Data (global manager)
    // 2. จาก localStorage
    // 3. จาก DOM element

    let customerSignature = step2Data?.customerSignature ||
                           step2Data?.customerSignatureUrl ||
                           localStorage.getItem('customerSignature') ||
                           localStorage.getItem('customerSignatureUrl') ||
                           '';

    // ถ้าไม่เจอ ลองดึงจาก DOM element ของ step2 (ถ้าหน้ายังโหลดอยู่)
    if (!customerSignature) {
      try {
        const customerSignatureInput = document.getElementById('customerSignatureUrl');
        if (customerSignatureInput && customerSignatureInput.value) {
          customerSignature = customerSignatureInput.value;
        }
      } catch (e) {
        console.warn('Could not access step2 DOM elements:', e);
      }
    }

    console.log('🖋️ GlobalManager getCustomerSignature:', {
      step2Data: step2Data?.customerSignature,
      step2SignatureUrl: step2Data?.customerSignatureUrl,
      localStorage: localStorage.getItem('customerSignatureUrl'),
      result: customerSignature
    });

    // ✅ FIX: Return empty string instead of undefined to prevent errors
    return customerSignature || '';
  }

  // ✅ เพิ่มฟังก์ชันดึงลายเซ็นพนักงาน
  getSalespersonSignature(step1Data) {
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const step2Data = this.getStepData(2);

    // ลำดับความสำคัญในการดึงลายเซ็นพนักงาน:
    // 1. จาก step2Data (global manager)
    // 2. จาก localStorage
    // 3. จาก userProfile
    // 4. จาก DOM element

    let salespersonSignature = step2Data?.salespersonSignature ||
                              step2Data?.salespersonSignatureUrl ||
                              localStorage.getItem('salespersonSignature') ||
                              localStorage.getItem('salespersonSignatureUrl') ||
                              userProfile.signature ||
                              '';

    // ถ้าไม่เจอ ลองดึงจาก DOM element ของ step2 (ถ้าหน้ายังโหลดอยู่)
    if (!salespersonSignature) {
      try {
        const salespersonSignatureInput = document.getElementById('salespersonSignatureUrl');
        if (salespersonSignatureInput && salespersonSignatureInput.value) {
          salespersonSignature = salespersonSignatureInput.value;
        }
      } catch (e) {
        console.warn('Could not access step2 DOM elements:', e);
      }
    }

    console.log('🖋️ GlobalManager getSalespersonSignature:', {
      step2Data: step2Data?.salespersonSignature,
      step2SignatureUrl: step2Data?.salespersonSignatureUrl,
      localStorage: localStorage.getItem('salespersonSignatureUrl'),
      userProfile: userProfile.signature,
      result: salespersonSignature
    });

    return salespersonSignature;
  }

  // ✅ เพิ่มฟังก์ชันดึงลายเซ็นผู้มีอำนาจ (authorized person)
  getAuthorizedSignature(step1Data) {
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const step2Data = this.getStepData(2);

    // ลำดับความสำคัญในการดึงลายเซ็นผู้มีอำนาจ:
    // 1. จาก step2Data (authorized signature specific)
    // 2. จาก localStorage (authorized signature)
    // 3. จาก salesperson signature (fallback)
    // 4. จาก userProfile

    let authorizedSignature = step2Data?.authorizedSignature ||
                             step2Data?.authorizedSignatureUrl ||
                             localStorage.getItem('authorizedSignature') ||
                             localStorage.getItem('authorizedSignatureUrl') ||
                             step2Data?.salespersonSignature ||
                             step2Data?.salespersonSignatureUrl ||
                             localStorage.getItem('salespersonSignature') ||
                             localStorage.getItem('salespersonSignatureUrl') ||
                             userProfile.signature ||
                             '';

    // ถ้าไม่เจอ ลองดึงจาก DOM element ของ step2 (ถ้าหน้ายังโหลดอยู่)
    if (!authorizedSignature) {
      try {
        const authorizedSignatureInput = document.getElementById('authorizedSignatureUrl') ||
                                        document.getElementById('salespersonSignatureUrl');
        if (authorizedSignatureInput && authorizedSignatureInput.value) {
          authorizedSignature = authorizedSignatureInput.value;
        }
      } catch (e) {
        console.warn('Could not access step2 DOM elements for authorized signature:', e);
      }
    }

    console.log('🖋️ GlobalManager getAuthorizedSignature:', {
      step2Data: step2Data?.authorizedSignature,
      step2AuthorizedUrl: step2Data?.authorizedSignatureUrl,
      localStorage: localStorage.getItem('authorizedSignatureUrl'),
      fallbackSalesperson: step2Data?.salespersonSignature,
      userProfile: userProfile.signature,
      result: authorizedSignature
    });

    return authorizedSignature;
  }
}

// Initialize global instance
window.GlobalInstallmentDataManager = GlobalInstallmentDataManager;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.globalInstallmentManager) {
      window.globalInstallmentManager = new GlobalInstallmentDataManager();
    }
    // Add alias for backward compatibility
    window.globalDataManager = window.globalInstallmentManager;
  });
} else {
  if (!window.globalInstallmentManager) {
    window.globalInstallmentManager = new GlobalInstallmentDataManager();
  }
  // Add alias for backward compatibility
  window.globalDataManager = window.globalInstallmentManager;
}

// Debug function for Global Data Manager
window.debugGlobalDataManager = function() {
  console.log('=== GLOBAL DATA MANAGER DEBUG ===');

  if (!window.globalInstallmentManager) {
    console.log('❌ Global Data Manager not found');
    return;
  }

  try {
    console.log('🌐 Global Data Manager Status:');
    console.log('  Initialized:', window.globalInstallmentManager.isInitialized);
    console.log('  Current Step:', window.globalInstallmentManager.currentStep);
    console.log('  Flexible Navigation:', true);

    for (let i = 1; i <= 4; i++) {
      const stepData = window.globalInstallmentManager.getStepData(i);
      const isCompleted = window.globalInstallmentManager.isStepCompleted(i);
      const canNavigate = window.globalInstallmentManager.canNavigateToStep(i);

      console.log(`Step ${i}:`, {
        hasData: !!stepData,
        completed: isCompleted,
        canNavigate: canNavigate,
        dataKeys: stepData ? Object.keys(stepData) : []
      });
    }

    console.log('Next suggested step:', window.globalInstallmentManager.getNextStep());
    console.log('Progress:', window.globalInstallmentManager.getProgressPercentage() + '%');

  } catch (error) {
    console.error('❌ Error debugging Global Data Manager:', error);
  }

  console.log('=== END GLOBAL DATA MANAGER DEBUG ===');
};

// Additional debug functions for stock issues
window.debugStockIssues = function() {
  console.log('🏪 Stock Debug Helper');
  const manager = window.globalInstallmentManager;

  if (manager) {
    const debug = manager.printDebugInfo();

    console.group('💡 Troubleshooting Suggestions:');

    if (!debug.currentBranch) {
      console.warn('⚠️  Branch code not set! Please ensure you access from proper URL with branch parameter.');
    }

    if (debug.step1Data?.cartItems?.length > 0) {
      const itemsWithDifferentBranch = debug.step1Data.cartItems.filter(item =>
        item.branch_code && item.branch_code !== debug.currentBranch
      );

      if (itemsWithDifferentBranch.length > 0) {
        console.error('🚨 Found items from different branches:');
        itemsWithDifferentBranch.forEach(item => {
          console.log(`- ${item.name} (IMEI: ${item.imei}) is from branch ${item.branch_code}, but current branch is ${debug.currentBranch}`);
        });
        console.log('\n💡 Solutions:');
        console.log('1. Go back to Step 1 and select products from current branch');
        console.log('2. Or change to the branch that has these products');
      } else {
        console.log('✅ All items appear to be from current branch');
      }
    }

    console.groupEnd();
    return debug;
  }

  return null;
};

window.validateCurrentStock = async function() {
  const manager = window.globalInstallmentManager;
  if (manager) {
    const result = await manager.validateItemsStock();
    console.log('🔍 Stock Validation Result:', result);
    return result;
  }
  return null;
};



  console.log('📋 Global Installment Data Manager loaded with flexible navigation [v1.9.2 - PDF Fixes: Invoice Number Format + Payment Method + Address + VAT Display]');
console.log('✅ setStep method available:', typeof window.GlobalInstallmentDataManager?.prototype?.setStep);
console.log('💡 Debug functions available:');
console.log('  - debugGlobalDataManager() - Show all data');
console.log('  - debugStockIssues() - Analyze stock problems');
console.log('  - validateCurrentStock() - Check stock availability');

} // End of duplicate loading check