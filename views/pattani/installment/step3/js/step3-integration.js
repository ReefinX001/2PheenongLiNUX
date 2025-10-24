/**
 * Step 3 Integration - Payment Plan Selection
 * เชื่อมต่อกับ Global Data Manager และ quotationController
 * @version 1.0.0
 */

class Step3Integration {
  constructor() {
    this.isInitialized = false;
    this.cartItems = [];
    this.totalAmount = 0;
    this.selectedPlan = null;
    this.recommendedPlans = [];
    this.customPlan = null;

    this.initialize();
  }

  initialize() {
    console.log('📋 Initializing Step 3 Integration...');

    // Wait for Global Data Manager
    if (typeof window.globalInstallmentManager === 'undefined') {
      console.log('⏳ Waiting for Global Data Manager...');
      setTimeout(() => this.initialize(), 100);
      return;
    }

    // Skip strict step completion check - allow flexible navigation
    console.log('🔓 Flexible navigation enabled - no strict step validation');

    this.loadOrderData();
    this.updateInstallmentInputs();
    this.generateRecommendedPlans();
    this.setupEventListeners();
    this.setupCustomPlanForm();

    this.isInitialized = true;
    console.log('✅ Step 3 Integration initialized - unified plan selection interface');
  }

  // ========== DATA LOADING ==========

  getTotalDownPayment() {
    return this.totalAmount; // ใช้ totalAmount ที่คำนวณจากยอดทั้งหมด (downAmount + ผ่อน × จำนวนงวด)
  }

  getGlobalDocumentFee() {
    const feeElement = document.getElementById('globalDocumentFee');
    return feeElement ? parseFloat(feeElement.value) || 500 : 500;
  }

  getProductInfo() {
    return {
      maxInstallmentMonths: this.getMaxInstallmentMonths(),
      taxInfo: this.getTaxInfo(),
      totalBeforeTax: this.getTotalBeforeTax(),
      totalTaxAmount: this.getTotalTaxAmount()
    };
  }

  getMaxInstallmentMonths() {
    if (this.cartItems.length === 0) return 36; // Default if no products

    const maxMonths = Math.max(...this.cartItems.map(item =>
      item.installmentMonths || item.maxInstallmentMonths || 36
    ));

    return Math.min(maxMonths, 36); // Cap at 36 months
  }

  getTaxInfo() {
    if (this.cartItems.length === 0) return { hasVat: false, documentType: 'ใบเสร็จรับเงิน' };

    const hasVatProducts = this.cartItems.some(item =>
      item.taxType && item.taxType !== 'ไม่มี VAT' && (item.taxRate || 0) > 0
    );

    return {
      hasVat: hasVatProducts,
      documentType: hasVatProducts ? 'ใบกำกับภาษี' : 'ใบเสร็จรับเงิน',
      vatTypes: [...new Set(this.cartItems.map(item => item.taxType || 'ไม่มี VAT'))].filter(type => type !== 'ไม่มี VAT'),
      combinedTaxRate: hasVatProducts ? 7 : 0 // รวมภาษีทั้งก้อน 7%
    };
  }

  getTotalBeforeTax() {
    const taxInfo = this.getTaxInfo();

    if (!taxInfo.hasVat) {
      return this.totalAmount;
    }

    // หากมีสินค้าที่มีภาษี จะรวมภาษีทั้งก้อน 7%
    // คำนวณราคาก่อนภาษีจากยอดรวม
    return this.totalAmount / (1 + (taxInfo.combinedTaxRate / 100));
  }

  getTotalTaxAmount() {
    const taxInfo = this.getTaxInfo();

    if (!taxInfo.hasVat) {
      return 0;
    }

    // หากมีสินค้าที่มีภาษี จะรวมภาษีทั้งก้อน 7%
    const beforeTax = this.getTotalBeforeTax();
    return this.totalAmount - beforeTax;
  }

  loadOrderData() {
    const step1Data = window.globalInstallmentManager.getStepData(1);

    // Try to load cart data from multiple sources with fallback
    if (!step1Data || !step1Data.cartItems || step1Data.cartItems.length === 0) {
      console.warn('⚠️ No cart data found in Step 1, trying alternative sources...');

      // Try loading from localStorage
      const possibleSources = [
        'cartData',
        'cartItems',
        'step1_selectedProducts',
        'selectedProducts'
      ];

      let foundData = false;
      for (const source of possibleSources) {
        try {
          const data = localStorage.getItem(source);
          if (data) {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`📦 Found cart data in ${source}:`, parsed.length, 'items');
              this.cartItems = parsed;
              // ✅ ใช้ยอดทั้งหมด (downAmount + ผ่อน × จำนวนงวด) สำหรับการคำนวณผ่อนชำระ
              this.totalAmount = parsed.reduce((sum, item) => {
                const quantity = item.quantity || 1;
                const downAmount = parseFloat(item.downAmount || 0);
                const downInstallment = parseFloat(item.downInstallment || 0);
                const downInstallmentCount = parseInt(item.downInstallmentCount || 0);
                const totalPrice = (downAmount + (downInstallment * downInstallmentCount)) * quantity;
                return sum + totalPrice;
              }, 0);
              foundData = true;
              break;
            }
          }
        } catch (error) {
          console.warn(`❌ Error parsing ${source}:`, error);
        }
      }

      if (!foundData) {
        console.warn('⚠️ No cart data found anywhere, showing empty state');
        this.showToast('ไม่พบข้อมูลสินค้า สามารถเลือกแผนการชำระได้ แต่แนะนำให้กลับไปเลือกสินค้าก่อน', 'warning');

        // Set default empty cart
        this.cartItems = [];
        this.totalAmount = 0;

        // Show placeholder in order summary
        this.renderEmptyOrderSummary();
        this.updateCalculatorDisplay();
        return;
      }
    } else {
      this.cartItems = step1Data.cartItems;
      // ✅ ใช้ยอดทั้งหมด (downAmount + ผ่อน × จำนวนงวด) สำหรับการคำนวณผ่อนชำระ
      this.totalAmount = step1Data.totalDownAmount || this.cartItems.reduce((sum, item) => {
        const quantity = item.quantity || 1;
        const downAmount = parseFloat(item.downAmount || 0);
        const downInstallment = parseFloat(item.downInstallment || 0);
        const downInstallmentCount = parseInt(item.downInstallmentCount || 0);
        const totalPrice = (downAmount + (downInstallment * downInstallmentCount)) * quantity;
        return sum + totalPrice;
      }, 0);
    }

    this.renderOrderSummary();
    this.updateCalculatorDisplay();

    // Load existing plan if any
    const step3Data = window.globalInstallmentManager.getStepData(3);
    if (step3Data && step3Data.selectedPlan) {
      this.selectedPlan = step3Data.selectedPlan;
      this.updateSelectedPlanDisplay();
    }

    console.log('📥 Loaded order data:', {
      items: this.cartItems.length,
      totalAmount: this.totalAmount
    });
  }

  renderOrderSummary() {
    const container = document.getElementById('orderSummary');
    if (!container) return;

    container.innerHTML = '';

    this.cartItems.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg';

      itemDiv.innerHTML = `
        <img src="${this.getImageUrl(item.image)}" alt="${item.name}" 
             class="w-16 h-16 object-cover rounded-lg"
             onerror="this.src='/uploads/Logo2.png'">
        <div class="flex-1">
          <h4 class="font-semibold">${item.name}</h4>
          <p class="text-sm text-gray-600 dark:text-gray-400">${item.brand || 'N/A'}</p>
          ${item.imei ? `<p class="text-xs text-blue-600 dark:text-blue-400 font-mono">IMEI: ${item.imei}</p>` : ''}
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">ผ่อน</span>
            ${item.downAmount > 0 ? `<span class="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">ดาวน์ขั้นต่ำ ฿${this.formatPrice(item.downAmount)}</span>` : ''}
          </div>
        </div>
        <div class="text-right">
          <div class="font-semibold text-blue-600">
            ดาวน์ ฿${this.formatPrice((item.downAmount || 0) * (item.quantity || 1))}
          </div>
          <div class="text-sm text-gray-500">
            จำนวน: ${item.quantity || 1}
          </div>
          <div class="text-xs text-green-600">
            ระบบผ่อนชำระ
          </div>
        </div>
      `;

      container.appendChild(itemDiv);
    });

    // Update total amount display
    const totalAmountElement = document.getElementById('totalAmount');
    const totalDownAmountElement = document.getElementById('totalDownAmount');

    if (totalAmountElement) {
      totalAmountElement.textContent = `฿${this.formatPrice(this.totalAmount)}`;
    }

    if (totalDownAmountElement) {
      totalDownAmountElement.textContent = `฿${this.formatPrice(this.totalAmount)}`;
    }
  }

  renderEmptyOrderSummary() {
    const container = document.getElementById('orderSummary');
    if (!container) return;

    container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-8 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
        <i class="bi bi-cart-x text-5xl text-gray-400 mb-4"></i>
        <h3 class="font-bold text-lg text-gray-800 dark:text-gray-200 mb-2">ไม่พบข้อมูลสินค้า</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          คุณสามารถเลือกแผนการชำระได้ แต่แนะนำให้กลับไปเลือกสินค้าก่อน
        </p>
        <a href="/step1" class="btn btn-primary">
          <i class="bi bi-arrow-left mr-2"></i> กลับไปเลือกสินค้า
        </a>
      </div>
    `;
  }

  // ========== UI UPDATES ==========

  // Remove handlePlanTypeChange function since we show both sections now

  updateInstallmentInputs() {
    const maxMonths = this.getMaxInstallmentMonths();

    // Update max installment input
    const installmentInput = document.getElementById('customInstallmentCount');
    if (installmentInput) {
      installmentInput.max = maxMonths;
    }

    // Update max months display
    const maxMonthsDisplay = document.getElementById('maxInstallmentMonths');
    if (maxMonthsDisplay) {
      maxMonthsDisplay.textContent = `${maxMonths} งวด`;
    }

    // Update minimum down payment display
    this.updateMinDownPayment();

    console.log(`📊 Updated installment inputs: max ${maxMonths} months`);
  }

  renderCustomPlanResult() {
    const resultsContainer = document.getElementById('customPlanResults');
    if (!resultsContainer || !this.customPlan) return;

    resultsContainer.innerHTML = `
      <div class="payment-plan-card selected custom-plan-result">
        <div class="payment-plan-header">
          <input type="radio" name="paymentPlan" value="custom_plan" class="radio radio-primary" checked>
          <div class="payment-plan-title">
            <h4>${this.customPlan.name}</h4>
            <p class="text-sm text-gray-600">${this.customPlan.description}</p>
          </div>
          <div class="payment-plan-badge bg-blue-600 text-white">กำหนดเอง</div>
        </div>
        
        <div class="payment-plan-details">
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div class="text-sm text-gray-600">เงินดาวน์</div>
              <div class="text-lg font-bold text-blue-600">฿${this.formatPrice(this.customPlan.downPayment)}</div>
            </div>
            <div>
              <div class="text-sm text-gray-600">ผ่อนต่องวด</div>
              <div class="text-lg font-bold text-green-600">฿${this.formatPrice(this.customPlan.installmentAmount)}</div>
            </div>
          </div>
          
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span>จำนวนงวด:</span>
              <span class="font-medium">${this.customPlan.installmentPeriod} งวด</span>
            </div>
            <div class="flex justify-between">
              <span>วิธีการชำระ:</span>
              <span class="font-medium">${this.getPaymentMethodText(this.customPlan.paymentMethod)}</span>
            </div>
            <div class="flex justify-between">
              <span>ค่าธรรมเนียม:</span>
              <span class="font-medium">฿${this.formatPrice(this.customPlan.docFee)}</span>
            </div>
            <div class="flex justify-between border-t pt-2 font-semibold">
              <span>ยอดรวมทั้งสิ้น:</span>
              <span class="text-blue-600">฿${this.formatPrice(this.customPlan.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    resultsContainer.style.display = 'block';
    console.log('🎯 Custom plan result rendered');
  }

  getPaymentMethodText(method) {
    const methods = {
      'cash': 'เงินสด',
      'transfer': 'โอนเงิน',
      'card': 'บัตรเครดิต'
    };
    return methods[method] || method;
  }

  // ========== RECOMMENDED PLANS ==========

  generateRecommendedPlans() {
    this.recommendedPlans = [];

    // Get global document fee
    const globalDocFee = this.getGlobalDocumentFee();

    // Handle case where no products are selected
    if (this.totalAmount <= 0) {
      console.warn('⚠️ Total amount is 0, generating demo plans for testing');
      this.generateDemoPlans();
      return;
    }

    // ✅ คำนวณแผนการชำระจากยอดสินค้าทั้งหมด (totalAmount = 27,300)
    // ไม่ใช่เพียงเงินดาวน์ขั้นต่ำ (downAmount = 5,700)
    const totalProductValue = this.totalAmount; // ยอดสินค้าทั้งหมด

    // Plan 1: ดาวน์ขั้นต่ำ - ดาวน์ 50% ของยอดสินค้า ผ่อน 50%
    const minDown = totalProductValue * 0.5; // 50% ของ 27,300 = 13,650
    const minCredit = totalProductValue * 0.5; // 50% ของ 27,300 = 13,650

    this.recommendedPlans.push({
      id: 'plan_min_down',
      name: 'ดาวน์ขั้นต่ำ',
      description: 'ดาวน์ 50% ผ่อน 50% เป็น 12 งวด',
      downPayment: minDown,
      installmentPeriod: 12,
      docFee: globalDocFee,
      creditAmount: minCredit,
      payoffAmount: minCredit + globalDocFee,
      installmentAmount: (minCredit + globalDocFee) / 12,
      totalAmount: totalProductValue + globalDocFee,
      recommended: false,
      color: 'blue'
    });

    // Plan 2: แผนสมดุล - ดาวน์ 70% ของยอดสินค้า ผ่อน 30%
    const balancedDown = totalProductValue * 0.7; // 70% ของ 27,300 = 19,110
    const balancedCredit = totalProductValue * 0.3; // 30% ของ 27,300 = 8,190

    this.recommendedPlans.push({
      id: 'plan_balanced',
      name: 'แผนสมดุล',
      description: 'แนะนำ! ดาวน์ 70% ผ่อน 30% เป็น 9 งวด',
      downPayment: balancedDown,
      installmentPeriod: 9,
      docFee: globalDocFee,
      creditAmount: balancedCredit,
      payoffAmount: balancedCredit + globalDocFee,
      installmentAmount: (balancedCredit + globalDocFee) / 9,
      totalAmount: totalProductValue + globalDocFee,
      recommended: true,
      color: 'green'
    });

    // Plan 3: ดาวน์สูง - ดาวน์ 80% ของยอดสินค้า ผ่อน 20%
    const highDown = totalProductValue * 0.8; // 80% ของ 27,300 = 21,840
    const highCredit = totalProductValue * 0.2; // 20% ของ 27,300 = 5,460

    this.recommendedPlans.push({
      id: 'plan_high_down',
      name: 'ดาวน์สูง',
      description: 'ดาวน์ 80% ผ่อน 20% เป็น 6 งวด',
      downPayment: highDown,
      installmentPeriod: 6,
      docFee: globalDocFee,
      creditAmount: highCredit,
      payoffAmount: highCredit + globalDocFee,
      installmentAmount: (highCredit + globalDocFee) / 6,
      totalAmount: totalProductValue + globalDocFee,
      recommended: false,
      color: 'purple'
    });

    this.renderRecommendedPlans();

    // Update minimum down payment display (50% ของยอดสินค้าทั้งหมด)
    const minDownElement = document.getElementById('minDownPayment');
    if (minDownElement) {
      const minDownAmount = this.totalAmount * 0.5; // 50% ของยอดสินค้า
      minDownElement.textContent = `฿${this.formatPrice(minDownAmount)}`;
    }

    // Update UI components with product information
    this.updateCalculatorDisplay();
  }

  generateDemoPlans() {
    console.log('📋 Generating demo payment plans for testing');

    // Get global document fee
    const globalDocFee = this.getGlobalDocumentFee();

    // Demo plans with fixed amounts for testing
    const demoAmount = 10000; // 10,000 baht for demo

    this.recommendedPlans = [
      {
        id: 'demo_plan_1',
        name: 'ดาวน์ขั้นต่ำ',
        description: 'แผนสำหรับทดสอบระบบ - ดาวน์ 50% ผ่อน 50%',
        downPayment: 5000, // 50% ของ 10,000
        installmentPeriod: 12,
        docFee: globalDocFee,
        creditAmount: 5000, // 50% ของ 10,000
        payoffAmount: 5000 + globalDocFee,
        installmentAmount: (5000 + globalDocFee) / 12,
        totalAmount: 10000 + globalDocFee,
        recommended: false,
        color: 'blue'
      },
      {
        id: 'demo_plan_2',
        name: 'แผนสมดุล',
        description: 'แผนสำหรับทดสอบระบบ - แนะนำ ดาวน์ 70% ผ่อน 30%',
        downPayment: 7000, // 70% ของ 10,000
        installmentPeriod: 9,
        docFee: globalDocFee,
        creditAmount: 3000, // 30% ของ 10,000
        payoffAmount: 3000 + globalDocFee,
        installmentAmount: (3000 + globalDocFee) / 9,
        totalAmount: 10000 + globalDocFee,
        recommended: true,
        color: 'green'
      },
      {
        id: 'demo_plan_3',
        name: 'ดาวน์สูง',
        description: 'แผนสำหรับทดสอบระบบ - ดาวน์ 80% ผ่อน 20%',
        downPayment: 8000, // 80% ของ 10,000
        installmentPeriod: 6,
        docFee: globalDocFee,
        creditAmount: 2000, // 20% ของ 10,000
        payoffAmount: 2000 + globalDocFee,
        installmentAmount: (2000 + globalDocFee) / 6,
        totalAmount: 10000 + globalDocFee,
        recommended: false,
        color: 'purple'
      }
    ];

    // Override total amount for demo
    this.totalAmount = demoAmount;

    this.renderRecommendedPlans();
    this.updateCalculatorDisplay();

    // Update UI to show demo mode
    const totalAmountElement = document.getElementById('totalAmount');
    if (totalAmountElement) {
      totalAmountElement.innerHTML = `
        <span class="text-orange-600">฿${this.formatPrice(demoAmount)}</span>
        <span class="text-xs text-orange-500 ml-2">(โหมดทดสอบ)</span>
      `;
    }

    // Show demo notice
    this.showToast('กำลังใช้โหมดทดสอบ - สามารถเลือกแผนการชำระได้', 'info');
  }

  renderRecommendedPlans() {
    const container = document.getElementById('recommendedPlans');
    if (!container) return;

    container.innerHTML = '';

    this.recommendedPlans.forEach(plan => {
      const planCard = document.createElement('div');
      planCard.className = `payment-plan-card ${plan.recommended ? 'recommended' : ''} cursor-pointer transition-all hover:shadow-lg border-2 border-gray-200 bg-white rounded-xl p-4 hover:border-${plan.color}-300 hover:shadow-xl`;
      planCard.dataset.planId = plan.id;

      const colorClass = {
        'blue': 'text-blue-600 bg-blue-100',
        'green': 'text-green-600 bg-green-100',
        'purple': 'text-purple-600 bg-purple-100'
      }[plan.color] || 'text-blue-600 bg-blue-100';

      const colorEmoji = {
        'blue': '🔵',
        'green': '🟢',
        'purple': '🟣'
      }[plan.color] || '🔵';

      planCard.innerHTML = `
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <h4 class="font-bold text-lg flex items-center gap-2">
              ${colorEmoji} ${plan.name}
              ${plan.recommended ? '<span class="text-xs bg-green-500 text-white px-2 py-1 rounded-full ml-2">แนะนำ</span>' : ''}
            </h4>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${plan.description}</p>
          </div>
          <div class="plan-selection-indicator" style="display: none;">
            <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <i class="bi bi-check text-white text-sm"></i>
            </div>
          </div>
        </div>
        
        <div class="space-y-2 mb-4">
          <div class="flex justify-between">
            <span class="text-sm">เงินดาวน์:</span>
            <span class="font-semibold text-${plan.color}-600">฿${this.formatPrice(plan.downPayment)}</span>
          </div>
          ${plan.creditAmount > 0 ? `
            <div class="flex justify-between">
              <span class="text-sm">ยอดค้าง:</span>
              <span class="text-sm text-gray-600">฿${this.formatPrice(plan.creditAmount)}</span>
            </div>
            ${plan.installmentPeriod > 0 ? `
              <div class="flex justify-between">
                <span class="text-sm">ผ่อน:</span>
                <span class="font-semibold">${plan.installmentPeriod} งวด</span>
              </div>
            ` : ''}
            ${plan.installmentAmount > 0 ? `
              <div class="flex justify-between">
                <span class="text-sm">ต่องวด:</span>
                <span class="font-semibold">฿${this.formatPrice(plan.installmentAmount)}</span>
              </div>
            ` : ''}
          ` : ''}
          <div class="flex justify-between">
            <span class="text-sm">ค่าธรรมเนียม:</span>
            <span class="text-sm">฿${this.formatPrice(plan.docFee)}</span>
          </div>
          <div class="flex justify-between border-t pt-2">
            <span class="text-sm font-semibold">รวมทั้งสิ้น:</span>
            <span class="font-bold text-lg">฿${this.formatPrice(plan.totalAmount)}</span>
          </div>
        </div>
        
        <div class="text-center">
          <div class="text-xs text-gray-500 mt-1">
            ชำระวันนี้ ฿${this.formatPrice(plan.downPayment + plan.docFee)}
          </div>
        </div>
      `;

      // Add click event listener to entire card
      planCard.addEventListener('click', () => {
        this.selectPlan(plan.id);
      });

      container.appendChild(planCard);
    });

    // 🆕 Add Custom Plan Card at the end
    this.renderCustomPlanCard(container);
  }

  // 🆕 New method to render custom plan card alongside recommended plans
  renderCustomPlanCard(container) {
    const customPlanCard = document.createElement('div');
    customPlanCard.className = `payment-plan-card custom-plan-card cursor-pointer transition-all hover:shadow-lg border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 hover:border-red-300 hover:shadow-xl`;
    customPlanCard.dataset.planId = 'custom_plan_selector';

    customPlanCard.innerHTML = `
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <h4 class="font-bold text-lg flex items-center gap-2">
            🔧 แผนกำหนดเอง
          </h4>
          <p class="text-sm text-red-600 mt-1">สร้างแผนการชำระตามต้องการ</p>
        </div>
        <div class="plan-selection-indicator" style="display: none;">
          <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <i class="bi bi-check text-white text-sm"></i>
          </div>
        </div>
      </div>
      
      <div class="space-y-2 mb-4">
        <div class="flex justify-between">
          <span class="text-sm">เงินดาวน์:</span>
          <span class="font-semibold text-red-600">ปรับแต่งได้</span>
        </div>
        <div class="flex justify-between">
          <span class="text-sm">จำนวนงวด:</span>
          <span class="font-semibold text-red-600">1-36 งวด</span>
        </div>
        <div class="flex justify-between">
          <span class="text-sm">ผ่อนต่องวด:</span>
          <span class="font-semibold text-red-600">คำนวณอัตโนมัติ</span>
        </div>
        <div class="flex justify-between">
          <span class="text-sm">ค่าธรรมเนียม:</span>
          <span class="text-sm">฿${this.formatPrice(this.getGlobalDocumentFee())}</span>
        </div>
        <div class="flex justify-between border-t pt-2">
          <span class="text-sm font-semibold">รวมทั้งสิ้น:</span>
          <span class="font-bold text-lg text-red-700">ตามที่กำหนด</span>
        </div>
      </div>
      
      <div class="text-center">
        <div class="text-xs text-red-600 mt-1 font-medium">
          ✨ คลิกเพื่อสร้างแผนของคุณ
        </div>
      </div>
    `;

    // Add click event listener to entire card
    customPlanCard.addEventListener('click', () => {
      this.openCustomPlanModal();
    });

    container.appendChild(customPlanCard);
  }

  // 🆕 Update custom plan preview in real-time (Legacy - not used with modal)
  updateCustomPlanPreview() {
    // This function is kept for backward compatibility but not used with modal interface
    console.log('⚠️ updateCustomPlanPreview is deprecated, use modal interface instead');
  }

  // ========== CUSTOM PLAN MODAL ==========

  openCustomPlanModal() {
    this.createCustomPlanModal();
    const modal = document.getElementById('customPlanModal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden'; // Prevent body scroll

      // Focus on first input
      setTimeout(() => {
        const firstInput = modal.querySelector('#modalCustomDownPayment');
        if (firstInput) firstInput.focus();
      }, 100);
    }
  }

  closeCustomPlanModal() {
    const modal = document.getElementById('customPlanModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto'; // Restore body scroll

      // Clear form
      this.clearCustomPlanForm();
    }
  }

  createCustomPlanModal() {
    // Check if modal already exists
    if (document.getElementById('customPlanModal')) return;

    const totalDownAmount = this.totalAmount;
    const minDownPayment = totalDownAmount * 0.5;
    const maxMonths = this.getMaxInstallmentMonths();
    const docFee = this.getGlobalDocumentFee();

    const modal = document.createElement('div');
    modal.id = 'customPlanModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🔧</span>
            <div>
              <h3 class="text-lg font-bold text-gray-900">แผนกำหนดเอง</h3>
              <p class="text-sm text-gray-600">สร้างแผนการชำระตามต้องการ</p>
            </div>
          </div>
          <button onclick="window.step3Integration?.closeCustomPlanModal()" 
                  class="text-gray-400 hover:text-gray-600 transition-colors">
            <i class="bi bi-x-lg text-xl"></i>
          </button>
        </div>
        
        <!-- Content -->
        <div class="p-6 space-y-4">
          <!-- Info Card -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <i class="bi bi-info-circle text-blue-600"></i>
              <span class="font-medium text-blue-800">ข้อมูลสำคัญ</span>
            </div>
            <div class="text-sm text-blue-700 space-y-1">
              <div>• ยอดรวมสินค้า: <strong>฿${this.formatPrice(totalDownAmount)}</strong></div>
              <div>• เงินดาวน์: <strong>กำหนดเท่าไหร่ก็ได้</strong></div>
              <div>• จำนวนงวดสูงสุด: <strong>${maxMonths} งวด</strong> (อิงจากสินค้า)</div>
              <div>• ค่าธรรมเนียมเอกสาร: <strong>฿${this.formatPrice(docFee)}</strong></div>
            </div>
          </div>
          
          <!-- Form -->
          <form id="customPlanForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                เงินดาวน์ (บาท) <span class="text-red-500">*</span>
              </label>
              <input type="number" id="modalCustomDownPayment" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                     placeholder="กำหนดเท่าไหร่ก็ได้" 
                     min="1" max="${totalDownAmount}" step="100">
              <div class="text-xs text-gray-500 mt-1">
                กำหนดยอดเงินดาวน์ตามต้องการ (ขั้นต่ำ ฿1 ถึง ฿${this.formatPrice(totalDownAmount)})
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  จำนวนงวด <span class="text-red-500">*</span>
                </label>
                <input type="number" id="modalCustomInstallmentCount" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                       placeholder="เช่น 12" min="1" max="${maxMonths}" step="1">
                <div class="text-xs text-gray-500 mt-1">อิงจากสินค้า 1 ถึง ${maxMonths} งวด</div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  ผ่อนต่องวด (บาท) <span class="text-green-600">อัตโนมัติ</span>
                </label>
                <input type="number" id="modalCustomInstallmentAmount" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
                       placeholder="จะแสดงอัตโนมัติ" readonly>
                <div class="text-xs text-green-600 mt-1">คำนวณอัตโนมัติ</div>
              </div>
            </div>
            
            <!-- Calculation Tip -->
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div class="flex items-center gap-2 mb-1">
                <i class="bi bi-lightbulb text-yellow-600"></i>
                <span class="text-sm font-medium text-yellow-800">วิธีใช้</span>
              </div>
              <div class="text-xs text-yellow-700">
                1. กรอกเงินดาวน์ตามต้องการ<br>
                2. เลือกจำนวนงวด (อิงจากสินค้า)<br>
                3. ระบบจะคำนวณยอดผ่อนต่องวดอัตโนมัติ
              </div>
            </div>
            
            <!-- Preview Result -->
            <div id="modalCustomPlanResult" class="bg-green-50 border border-green-200 rounded-lg p-4" style="display: none;">
              <div class="flex items-center gap-2 mb-3">
                <i class="bi bi-check-circle text-green-600"></i>
                <span class="font-medium text-green-800">ผลการคำนวณ</span>
              </div>
              <div id="modalCustomPlanDetails" class="space-y-2 text-sm"></div>
            </div>
          </form>
        </div>
        
        <!-- Footer -->
        <div class="flex gap-3 p-6 border-t border-gray-200">
          <button type="button" onclick="window.step3Integration?.closeCustomPlanModal()" 
                  class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            ยกเลิก
          </button>
          <button type="button" onclick="window.step3Integration?.confirmCustomPlan()" 
                  id="confirmCustomPlanBtn"
                  class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled>
            ยืนยันและเลือกแผนนี้
          </button>
        </div>
      </div>
    `;

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeCustomPlanModal();
      }
    });

    document.body.appendChild(modal);

    // Add event listeners for real-time calculation
    setTimeout(() => {
      const inputs = ['modalCustomDownPayment', 'modalCustomInstallmentCount']; // เอา modalCustomInstallmentAmount ออกเพราะเป็น readonly
      inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
          input.addEventListener('input', () => {
            this.calculateModalCustomPlan();
          });
        }
      });
    }, 100);
  }

  calculateModalCustomPlan() {
    const downPayment = parseFloat(document.getElementById('modalCustomDownPayment')?.value) || 0;
    const installmentPeriod = parseInt(document.getElementById('modalCustomInstallmentCount')?.value) || 0;

    const resultDiv = document.getElementById('modalCustomPlanResult');
    const detailsDiv = document.getElementById('modalCustomPlanDetails');
    const confirmBtn = document.getElementById('confirmCustomPlanBtn');

    if (!resultDiv || !detailsDiv || !confirmBtn) return;

    const totalDownAmount = this.totalAmount;
    const maxMonths = this.getMaxInstallmentMonths();
    const docFee = this.getGlobalDocumentFee();

    // 🔧 แก้ไขตามความต้องการ: เงินดาวน์กำหนดเท่าไหร่ก็ได้, จำนวนงวดอิงจากสินค้า, ผ่อนต่องวดแสดงอัตโนมัติ
    let calculatedInstallmentAmount = 0;

    // คำนวณยอดผ่อนต่องวดอัตโนมัติ เมื่อมีเงินดาวน์และจำนวนงวด
    if (downPayment > 0 && installmentPeriod > 0) {
      // 🔧 FIX: ยอดที่ต้องผ่อน = ยอดรวมสินค้า - เงินดาวน์ (ไม่รวมค่าธรรมเนียม)
      const remainingAmount = totalDownAmount - downPayment;
      calculatedInstallmentAmount = remainingAmount / installmentPeriod;

      // อัพเดทช่องผ่อนต่องวดให้แสดงผลอัตโนมัติ
      document.getElementById('modalCustomInstallmentAmount').value = calculatedInstallmentAmount.toFixed(2);
    }

    // Validation - เงินดาวน์ต้องมากกว่า 0 และไม่เกินยอดรวม, จำนวนงวดต้องไม่เกินสูงสุด
    const isValid = downPayment > 0 &&
                   downPayment <= totalDownAmount &&
                   installmentPeriod > 0 &&
                   installmentPeriod <= maxMonths &&
                   calculatedInstallmentAmount > 0;

    if (isValid) {
      const creditAmount = totalDownAmount - downPayment;
      const totalAmount = totalDownAmount + docFee; // ยอดรวมทั้งสิ้น = ยอดสินค้า + ค่าธรรมเนียม

      detailsDiv.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <div class="flex justify-between">
              <span>เงินดาวน์:</span>
              <span class="font-medium text-red-700">฿${this.formatPrice(downPayment)}</span>
            </div>
            <div class="flex justify-between">
              <span>จำนวนงวด:</span>
              <span class="font-medium">${installmentPeriod} งวด</span>
            </div>
            <div class="flex justify-between">
              <span>ผ่อนต่องวด:</span>
              <span class="font-medium text-green-700">฿${this.formatPrice(calculatedInstallmentAmount)}</span>
            </div>
          </div>
          
          <div class="space-y-1">
            <div class="flex justify-between">
              <span>ยอดผ่อนรวม:</span>
              <span class="font-medium">฿${this.formatPrice(creditAmount)}</span>
            </div>
            <div class="flex justify-between">
              <span>ค่าธรรมเนียม:</span>
              <span class="font-medium">฿${this.formatPrice(docFee)}</span>
            </div>
            <div class="flex justify-between font-semibold border-t pt-1">
              <span>ยอดรวมทั้งสิ้น:</span>
              <span class="text-green-700">฿${this.formatPrice(totalAmount)}</span>
            </div>
          </div>
        </div>
        
        <div class="mt-3 p-2 bg-orange-50 rounded border border-orange-200">
          <div class="flex justify-between font-bold text-orange-700">
            <span>ชำระวันนี้:</span>
            <span>฿${this.formatPrice(downPayment + docFee)}</span>
          </div>
          <div class="text-xs text-orange-600 mt-1">(เงินดาวน์ + ค่าธรรมเนียมเอกสาร)</div>
        </div>
      `;

      resultDiv.style.display = 'block';
      confirmBtn.disabled = false;

      // Store the calculated plan temporarily
      this.tempCustomPlan = {
        id: 'custom_plan',
        name: 'แผนกำหนดเอง',
        type: 'custom',
        description: `ดาวน์ ${this.formatPrice(downPayment)} ผ่อน ${installmentPeriod} งวด งวดละ ${this.formatPrice(calculatedInstallmentAmount)}`,
        downPayment: downPayment,
        installmentPeriod: installmentPeriod,
        installmentAmount: calculatedInstallmentAmount,
        docFee: docFee,
        creditAmount: creditAmount,
        totalAmount: totalAmount,
        paymentMethod: 'transfer',
        recommended: false,
        color: 'red'
      };

    } else {
      resultDiv.style.display = 'none';
      confirmBtn.disabled = true;
      this.tempCustomPlan = null;
    }
  }

  confirmCustomPlan() {
    if (!this.tempCustomPlan) return;

    // Set the custom plan
    this.customPlan = this.tempCustomPlan;

    // Select the custom plan
    this.selectPlan('custom_plan');

    // Close modal
    this.closeCustomPlanModal();

    // Show success message
    this.showToast('สร้างและเลือกแผนกำหนดเองเรียบร้อย', 'success');
  }

  clearCustomPlanForm() {
    const inputs = ['modalCustomDownPayment', 'modalCustomInstallmentCount']; // เอา modalCustomInstallmentAmount ออกเพราะเป็น readonly
    inputs.forEach(inputId => {
      const input = document.getElementById(inputId);
      if (input) {
        input.value = '';
        input.style.borderColor = '';
      }
    });

    // เคลียร์ช่อง modalCustomInstallmentAmount แยกต่างหาก
    const installmentAmountInput = document.getElementById('modalCustomInstallmentAmount');
    if (installmentAmountInput) {
      installmentAmountInput.value = '';
    }

    const resultDiv = document.getElementById('modalCustomPlanResult');
    if (resultDiv) resultDiv.style.display = 'none';

    const confirmBtn = document.getElementById('confirmCustomPlanBtn');
    if (confirmBtn) confirmBtn.disabled = true;

    this.tempCustomPlan = null;
  }

  selectPlan(planId) {
    let selectedPlan = null;

    // ตรวจสอบว่าเป็นแผนกำหนดเองหรือไม่
    if (planId === 'custom_plan' && this.customPlan) {
      selectedPlan = this.customPlan;
    } else if (planId === 'custom_plan_selector') {
      // เมื่อคลิกที่การ์ดแผนกำหนดเอง ให้เปิด modal
      this.openCustomPlanModal();
      return;
    } else {
      // หาแผนแนะนำ
      selectedPlan = this.recommendedPlans?.find(p => p.id === planId);
      if (!selectedPlan) return;
    }

    // ลบการเลือกก่อนหน้า
    document.querySelectorAll('.payment-plan-card').forEach(card => {
      card.classList.remove('selected');
      const indicator = card.querySelector('.plan-selection-indicator');
      if (indicator) indicator.style.display = 'none';
    });

    // เพิ่มการเลือกให้การ์ดที่ถูกคลิก
    let selectedCard = null;
    if (planId === 'custom_plan') {
      // สำหรับแผนกำหนดเอง ให้เลือกการ์ดของแผนกำหนดเอง
      selectedCard = document.querySelector('[data-plan-id="custom_plan_selector"]');
    } else {
      selectedCard = document.querySelector(`[data-plan-id="${planId}"]`);
    }

    if (selectedCard) {
      selectedCard.classList.add('selected');
      const indicator = selectedCard.querySelector('.plan-selection-indicator');
      if (indicator) indicator.style.display = 'block';
    }

    this.selectedPlan = selectedPlan;
    this.updateCalculatorWithPlan(selectedPlan);
    this.updateSelectedPlanDisplay();
    this.showPaymentMethodSection();
    this.saveSelectedPlan();

    // แสดง notification
    const planType = selectedPlan.type === 'custom' ? 'แผนกำหนดเอง' : 'แผนแนะนำ';
    this.showToast(`เลือก${planType}: ${selectedPlan.name}`, 'success');

    console.log(`✅ Selected plan: ${selectedPlan.name} (${selectedPlan.type || 'recommended'})`);
  }

  updateCalculatorWithPlan(plan) {
    // ✅ แสดงการคำนวณที่ถูกต้องตามแผนที่เลือก
    document.getElementById('calcSubTotal').textContent = `฿${this.formatPrice(this.totalAmount)}`;
    document.getElementById('calcDownPayment').textContent = `฿${this.formatPrice(plan.downPayment)}`;
    document.getElementById('calcCreditAmount').textContent = `฿${this.formatPrice(plan.creditAmount)}`;
    document.getElementById('calcDocFee').textContent = `฿${this.formatPrice(plan.docFee)}`;
    document.getElementById('calcInstallmentCount').textContent = `${plan.installmentPeriod} งวด`;
    document.getElementById('calcTotalAmount').textContent = `฿${this.formatPrice(plan.totalAmount)}`;
    document.getElementById('calcInstallmentAmount').textContent = `฿${this.formatPrice(plan.installmentAmount)}`;

    // Payment schedule - คำนวณยอดชำระวันนี้
    const payTodayAmount = plan.downPayment + plan.docFee;
    document.getElementById('payTodayAmount').textContent = `฿${this.formatPrice(payTodayAmount)}`;

    // คำนวณวันที่งวดแรกและงวดสุดท้าย
    if (plan.creditAmount > 0) {
      const today = new Date();
      const firstInstallment = new Date(today);
      firstInstallment.setMonth(firstInstallment.getMonth() + 1);

      const lastInstallment = new Date(today);
      lastInstallment.setMonth(lastInstallment.getMonth() + plan.installmentPeriod);

      document.getElementById('firstInstallmentDate').textContent = this.formatDate(firstInstallment);
      document.getElementById('lastInstallmentDate').textContent = this.formatDate(lastInstallment);
    } else {
      // ถ้าไม่มียอดค้าง (ชำระเต็มจำนวน)
      document.getElementById('firstInstallmentDate').textContent = 'ไม่มี';
      document.getElementById('lastInstallmentDate').textContent = 'ไม่มี';
    }
  }

  updateSelectedPlanDisplay() {
    const summaryContainer = document.getElementById('selectedPlanSummary');
    const detailsContainer = document.getElementById('selectedPlanDetails');

    if (!summaryContainer || !detailsContainer) return;

    if (this.selectedPlan) {
      summaryContainer.style.display = 'block';

      const planTypeLabel = this.selectedPlan.type === 'custom' ? 'กำหนดเอง' : 'แนะนำ';
      const planTypeIcon = this.selectedPlan.type === 'custom' ? '🔧' : '⭐';
      const planTypeColor = this.selectedPlan.type === 'custom' ? 'text-red-800 bg-red-50 border-red-200' : 'text-green-800 bg-green-50 border-green-200';

      detailsContainer.innerHTML = `
        <div class="${planTypeColor} border rounded-lg p-4">
          <h4 class="font-semibold mb-2 flex items-center gap-2">
            <span class="text-lg">${planTypeIcon}</span>
            ${this.selectedPlan.name} 
            <span class="text-xs px-2 py-1 rounded-full border ${planTypeColor}">${planTypeLabel}</span>
          </h4>
          <p class="text-sm mb-3 opacity-75">${this.selectedPlan.description}</p>
          
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="space-y-2">
              <div class="flex justify-between">
                <span>เงินดาวน์:</span>
                <span class="font-semibold">฿${this.formatPrice(this.selectedPlan.downPayment)}</span>
              </div>
              <div class="flex justify-between">
                <span>จำนวนงวด:</span>
                <span class="font-semibold">${this.selectedPlan.installmentPeriod} งวด</span>
              </div>
              <div class="flex justify-between">
                <span>ผ่อนต่องวด:</span>
                <span class="font-semibold">฿${this.formatPrice(this.selectedPlan.installmentAmount)}</span>
              </div>
            </div>
            
            <div class="space-y-2">
              <div class="flex justify-between">
                <span>ยอดผ่อนรวม:</span>
                <span class="font-semibold">฿${this.formatPrice(this.selectedPlan.creditAmount)}</span>
              </div>
              <div class="flex justify-between">
                <span>ค่าธรรมเนียม:</span>
                <span class="font-semibold">฿${this.formatPrice(this.selectedPlan.docFee)}</span>
              </div>
              <div class="flex justify-between">
                <span>ยอดรวมทั้งสิ้น:</span>
                <span class="font-semibold">฿${this.formatPrice(this.selectedPlan.totalAmount)}</span>
              </div>
            </div>
          </div>
          
          <div class="mt-3 pt-3 border-t ${planTypeColor.includes('red') ? 'border-red-200' : 'border-green-200'}">
            <div class="flex justify-between items-center">
              <span class="font-medium">ชำระวันนี้:</span>
              <span class="font-bold text-lg ${planTypeColor.includes('red') ? 'text-red-700' : 'text-green-700'}">
                ฿${this.formatPrice(this.selectedPlan.downPayment + this.selectedPlan.docFee)}
              </span>
            </div>
            <div class="text-xs opacity-75 mt-1">
              (เงินดาวน์ + ค่าธรรมเนียมเอกสาร)
            </div>
          </div>
        </div>
      `;
    } else {
      summaryContainer.style.display = 'none';
    }

    this.updateNavigationButtons();
  }

  // ========== CUSTOM PLAN ==========

  setupCustomPlanForm() {
    const customForm = document.getElementById('customPlanForm');

    if (!customForm) return;

    // อัปเดตขั้นต่ำดาวน์
    this.updateMinDownPayment();

    // Auto-calculation event handlers
    const downPaymentField = document.getElementById('customDownPayment');
    const installmentPeriodField = document.getElementById('customInstallmentCount');
    const installmentAmountField = document.getElementById('customInstallmentAmount');

    if (downPaymentField) {
      downPaymentField.addEventListener('input', () => this.handleCustomPlanInput('downPayment'));
    }

    if (installmentPeriodField) {
      installmentPeriodField.addEventListener('input', () => this.handleCustomPlanInput('installmentPeriod'));
    }

    if (installmentAmountField) {
      installmentAmountField.addEventListener('input', () => this.handleCustomPlanInput('installmentAmount'));
    }

    // Payment method selection handlers
    const paymentMethodRadios = document.querySelectorAll('input[name="globalPaymentMethod"]');
    paymentMethodRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (this.selectedPlan) {
          this.selectedPlan.paymentMethod = radio.value;
          this.saveSelectedPlan();
          console.log(`💳 Payment method changed to: ${radio.value}`);
        }
      });
    });

    console.log('✅ Custom plan form setup complete');
  }

  updateMinDownPayment() {
    const totalDown = this.getTotalDownPayment();
    const minDownPayment = totalDown * 0.5; // 50% ของยอดก้อนทั้งหมด

    const minDownElement = document.getElementById('minDownPayment');
    if (minDownElement) {
      minDownElement.textContent = `฿${minDownPayment.toLocaleString()}`;
    }

    const customDownInput = document.getElementById('customDownPayment');
    if (customDownInput) {
      customDownInput.setAttribute('min', minDownPayment);
      customDownInput.placeholder = `อย่างน้อย ${minDownPayment.toLocaleString()} บาท`;
    }

    console.log(`📊 Updated minimum down payment: ฿${minDownPayment.toLocaleString()}`);
  }

  handleCustomPlanInput(changedField) {
    const downPayment = parseFloat(document.getElementById('customDownPayment').value) || 0;
    const installmentPeriod = parseInt(document.getElementById('customInstallmentCount').value) || 0;
    const installmentAmount = parseFloat(document.getElementById('customInstallmentAmount').value) || 0;

    if (this.totalAmount <= 0) return; // ไม่มีข้อมูลสินค้า

    const docFee = this.getGlobalDocumentFee();
    const maxMonths = this.getMaxInstallmentMonths();

    // ✅ คำนวณจากยอดก้อนทั้งหมดของดาวน์ (ขั้นต่ำ + งวด + ผ่อน)
    const totalDownAmount = this.totalAmount; // ยอดก้อนทั้งหมด

    // ตรวจสอบขั้นต่ำ: ต้องชำระดาวน์อย่างน้อย 50% ของยอดก้อนทั้งหมด
    const minDownPayment = totalDownAmount * 0.5; // ขั้นต่ำ 50%
    const maxDownPayment = totalDownAmount; // สูงสุดคือทั้งหมด

    // คำนวณตามที่เปลี่ยน
    if (changedField === 'downPayment' && downPayment >= minDownPayment && installmentPeriod > 0) {
      // คำนวณ installmentAmount จากส่วนที่เหลือ
      const remainingAmount = totalDownAmount - downPayment; // ยอดที่เหลือนำไปผ่อน
      const payoffAmount = remainingAmount + docFee;
      const calculatedInstallmentAmount = payoffAmount / installmentPeriod;

      document.getElementById('customInstallmentAmount').value = calculatedInstallmentAmount.toFixed(2);
      this.createCustomPlan();

    } else if (changedField === 'installmentPeriod' && downPayment >= minDownPayment && installmentPeriod > 0 && installmentPeriod <= maxMonths) {
      // คำนวณ installmentAmount จากส่วนที่เหลือ
      const remainingAmount = totalDownAmount - downPayment;
      const payoffAmount = remainingAmount + docFee;
      const calculatedInstallmentAmount = payoffAmount / installmentPeriod;

      document.getElementById('customInstallmentAmount').value = calculatedInstallmentAmount.toFixed(2);
      this.createCustomPlan();

    } else if (changedField === 'installmentAmount' && installmentAmount > 0 && downPayment >= minDownPayment) {
      // คำนวณ installmentPeriod จากส่วนที่เหลือ
      const remainingAmount = totalDownAmount - downPayment;
      const payoffAmount = remainingAmount + docFee;
      const calculatedInstallmentCount = Math.round(payoffAmount / installmentAmount);

      if (calculatedInstallmentCount > 0 && calculatedInstallmentCount <= maxMonths) {
        document.getElementById('customInstallmentCount').value = calculatedInstallmentCount;
        this.createCustomPlan();
      }
    }
  }

  createCustomPlan() {
    const downPayment = parseFloat(document.getElementById('customDownPayment').value) || 0;
    const installmentPeriod = parseInt(document.getElementById('customInstallmentCount').value) || 0;
    const installmentAmount = parseFloat(document.getElementById('customInstallmentAmount').value) || 0;

    if (downPayment < 0 || installmentPeriod <= 0 || installmentAmount <= 0) {
      // Hide custom plan result
      const resultDiv = document.getElementById('customPlanResult');
      if (resultDiv) resultDiv.style.display = 'none';
      return;
    }

    const docFee = this.getGlobalDocumentFee();

    // ✅ คำนวณจากยอดสินค้าทั้งหมด (totalAmount = 27,300)
    const totalProductValue = this.totalAmount; // ยอดสินค้าทั้งหมด
    const minDownPayment = totalProductValue * 0.5; // ขั้นต่ำ 50% ของยอดสินค้า
    const remainingAmount = totalProductValue - downPayment; // ยอดที่เหลือนำไปผ่อน
    const creditAmount = Math.max(0, remainingAmount); // ยอดที่จะผ่อน
    const payoffAmount = creditAmount + docFee;
    const totalAmount = totalProductValue + docFee; // ยอดรวมทั้งสิ้น (ยอดสินค้า + ค่าธรรมเนียม)

    // ตรวจสอบความถูกต้อง
    if (downPayment < minDownPayment) {
      document.getElementById('customDownPayment').style.borderColor = '#ef4444';
      this.showToast(`ดาวน์ขั้นต่ำ ฿${this.formatPrice(minDownPayment)} (50% ของยอดสินค้าทั้งหมด)`, 'warning');
      const resultDiv = document.getElementById('customPlanResult');
      if (resultDiv) resultDiv.style.display = 'none';
      return;
    } else if (downPayment > totalProductValue) {
      document.getElementById('customDownPayment').style.borderColor = '#ef4444';
      this.showToast(`ดาวน์สูงสุด ฿${this.formatPrice(totalProductValue)} (100% ของยอดสินค้าทั้งหมด)`, 'warning');
      const resultDiv = document.getElementById('customPlanResult');
      if (resultDiv) resultDiv.style.display = 'none';
      return;
    } else {
      document.getElementById('customDownPayment').style.borderColor = '';
    }

    const maxMonths = this.getMaxInstallmentMonths();
    if (installmentPeriod > maxMonths) {
      document.getElementById('customInstallmentCount').style.borderColor = '#ef4444';
      const resultDiv = document.getElementById('customPlanResult');
      if (resultDiv) resultDiv.style.display = 'none';
      return;
    } else {
      document.getElementById('customInstallmentCount').style.borderColor = '';
    }

    this.customPlan = {
      id: 'custom_plan',
      name: 'แผนกำหนดเอง',
      type: 'custom',
      description: `ดาวน์ ${this.formatPrice(downPayment)} ผ่อน ${installmentPeriod} งวด งวดละ ${this.formatPrice(installmentAmount)}`,
      downPayment: downPayment,
      installmentPeriod: installmentPeriod,
      installmentAmount: installmentAmount,
      docFee: docFee,
      creditAmount: creditAmount,
      payoffAmount: payoffAmount,
      totalAmount: totalAmount,
      paymentMethod: 'transfer', // default
      recommended: false,
      color: 'red'
    };

    // แสดงผลลัพธ์ใน Custom Plan Card แทน
    this.updateCustomPlanResult();

    console.log('🎯 Custom plan created:', this.customPlan);
    this.showToast('สร้างแผนกำหนดเองสำเร็จ กดปุ่ม "เลือกแผนนี้" เพื่อเลือกใช้', 'success');
  }

  // 🆕 Update custom plan result display
  updateCustomPlanResult() {
    if (!this.customPlan) return;

    const resultDiv = document.getElementById('customPlanResult');
    const detailsDiv = document.getElementById('customPlanDetails');

    if (!resultDiv || !detailsDiv) return;

    const plan = this.customPlan;
    detailsDiv.innerHTML = `
      <div class="flex justify-between">
        <span>เงินดาวน์:</span>
        <span class="font-medium text-red-700">฿${this.formatPrice(plan.downPayment)}</span>
      </div>
      <div class="flex justify-between">
        <span>ผ่อน ${plan.installmentPeriod} งวด:</span>
        <span class="font-medium text-red-700">฿${this.formatPrice(plan.installmentAmount)}/งวด</span>
      </div>
      <div class="flex justify-between">
        <span>ยอดผ่อนรวม:</span>
        <span class="font-medium">฿${this.formatPrice(plan.creditAmount)}</span>
      </div>
      <div class="flex justify-between">
        <span>ค่าธรรมเนียม:</span>
        <span class="font-medium">฿${this.formatPrice(plan.docFee)}</span>
      </div>
      <div class="flex justify-between border-t pt-1 font-semibold">
        <span>ยอดรวมทั้งสิ้น:</span>
        <span class="text-green-700">฿${this.formatPrice(plan.totalAmount)}</span>
      </div>
      <div class="flex justify-between mt-2 p-2 bg-yellow-50 rounded">
        <span class="text-sm">ชำระวันนี้:</span>
        <span class="font-bold text-orange-600">฿${this.formatPrice(plan.downPayment + plan.docFee)}</span>
      </div>
    `;

    resultDiv.style.display = 'block';
  }

  showPaymentMethodSection() {
    const paymentMethodSection = document.getElementById('paymentMethodSection');
    if (paymentMethodSection) {
      paymentMethodSection.style.display = 'block';

      // Scroll to payment method section
      paymentMethodSection.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  hidePaymentMethodSection() {
    const paymentMethodSection = document.getElementById('paymentMethodSection');
    if (paymentMethodSection) {
      paymentMethodSection.style.display = 'none';
    }
  }





  clearCustomPlan() {
    document.getElementById('customDownPayment').value = '';
    document.getElementById('customInstallmentCount').value = '';
    document.getElementById('customInstallmentAmount').value = '';

    // Reset border colors
    document.getElementById('customDownPayment').style.borderColor = '';
    document.getElementById('customInstallmentCount').style.borderColor = '';
    document.getElementById('customInstallmentAmount').style.borderColor = '';

    // Hide custom plan result
    const customPlanResult = document.getElementById('customPlanResult');
    if (customPlanResult) {
      customPlanResult.style.display = 'none';
    }

    // Hide custom plan results
    const customResults = document.getElementById('customPlanResults');
    if (customResults) {
      customResults.style.display = 'none';
    }

    // Hide custom plan card
    this.hideCustomPlanCard();

    // Clear custom plan data
    this.customPlan = null;

    console.log('🧹 Custom plan cleared');
  }

  // ========== DATA PERSISTENCE ==========

  saveSelectedPlan() {
    if (!this.selectedPlan || !window.globalInstallmentManager) return;

    // ดึงข้อมูล taxType ที่มีอยู่แล้ว (ถ้ามี)
    const existingStep3Data = window.globalInstallmentManager.getStepData(3) || {};

    // ✅ FIX: ดึงข้อมูล payment method จาก radio button ที่เลือกใน step3.html
    const selectedPaymentMethod = document.querySelector('input[name="globalPaymentMethod"]:checked')?.value || 'cash';
    console.log('💳 Step3 saveSelectedPlan - Payment Method:', {
      selectedPaymentMethod,
      selectedPlan_paymentMethod: this.selectedPlan.paymentMethod,
      existingPaymentMethod: existingStep3Data.paymentMethod
    });

    window.globalInstallmentManager.updateStepData(3, {
      plan_type: this.selectedPlan.type,
      down_payment: this.selectedPlan.downPayment,
      installment_count: this.selectedPlan.installmentPeriod,
      installment_amount: this.selectedPlan.installmentAmount,
      credit_amount: this.selectedPlan.creditAmount,
      payoff_amount: this.selectedPlan.payoffAmount,
      doc_fee: this.selectedPlan.docFee,
      credit_term: `${this.selectedPlan.installmentPeriod} เดือน`,
      selectedPlan: this.selectedPlan,
      paymentMethod: selectedPaymentMethod,
      // ✅ เพิ่มข้อมูลที่สำคัญสำหรับการคำนวณดาวน์เพย์เมนต์
      totalDownAmount: this.totalAmount, // ยอดเงินดาวน์รวมจาก step1
      minimumDownAmount: this.totalAmount, // ยอดดาวน์ขั้นต่ำ
      // รักษาข้อมูล tax ที่มีอยู่แล้ว
      taxType: existingStep3Data.taxType || 'none',
      documentType: existingStep3Data.documentType || 'ใบเสร็จรับเงิน',
      vatAmount: existingStep3Data.vatAmount || 0,
      beforeTaxAmount: existingStep3Data.beforeTaxAmount || this.selectedPlan.downPayment,
      totalWithTax: existingStep3Data.totalWithTax || this.selectedPlan.downPayment
    });
  }

  // ========== EVENT LISTENERS ==========

  setupEventListeners() {
    // Remove plan type radio button handlers since we no longer have them

    // Global document fee change handler
    const globalDocFeeField = document.getElementById('globalDocumentFee');
    if (globalDocFeeField) {
      globalDocFeeField.addEventListener('input', () => {
        // Regenerate recommended plans when document fee changes
        this.generateRecommendedPlans();
        // Recalculate custom plan if active
        if (this.customPlan) {
          this.createCustomPlan();
        }
        // Update calculator display
        this.updateCalculatorDisplay();
      });
    }

    // Navigation buttons
    const nextButton = document.getElementById('btnStep3ToStep4');
    const prevButton = document.getElementById('btnStep3ToStep2');

    if (nextButton) {
      nextButton.addEventListener('click', () => this.proceedToStep4());
    }

    if (prevButton) {
      prevButton.addEventListener('click', () => this.goBackToStep2());
    }

    // Global Data Manager events
    document.addEventListener('installmentStepChanged', (event) => {
      if (event.detail.stepNumber === 3) {
        this.updateNavigationButtons();
      }
    });
  }

  updateNavigationButtons() {
    const nextButton = document.getElementById('btnStep3ToStep4');

    if (nextButton) {
      const hasSelectedPlan = this.selectedPlan !== null;
      nextButton.disabled = !hasSelectedPlan;

      if (hasSelectedPlan) {
        nextButton.innerHTML = '<i class="bi bi-arrow-right mr-2"></i>ไปขั้นตอนถัดไป (สรุปและชำระเงิน)';
        nextButton.className = 'btn btn-primary btn-block';
      } else {
        nextButton.innerHTML = '<i class="bi bi-exclamation-circle mr-2"></i>กรุณาเลือกแผนการชำระ';
        nextButton.className = 'btn btn-secondary btn-block';
      }
    }
  }

  updateCalculatorDisplay() {
    // ✅ ใช้ยอด down payment ที่ถูกต้อง - เฉพาะระบบผ่อนชำระ
    const displayAmount = this.totalAmount > 0 ? this.totalAmount : 10000; // Use demo amount if no total
    const productInfo = this.getProductInfo();
    const globalDocFee = this.getGlobalDocumentFee();

    // Update basic calculation fields - แสดงยอด down payment แทน cash price
    document.getElementById('calcSubTotal').textContent = `฿${this.formatPrice(displayAmount)}`;
    document.getElementById('calcDownPayment').textContent = `฿${this.formatPrice(displayAmount)}`; // ยอดดาวน์ขั้นต่ำ
    document.getElementById('calcCreditAmount').textContent = '฿0.00'; // ไม่มียอดค้าง เมื่อยังไม่เลือกแผน
    document.getElementById('calcDocFee').textContent = `฿${this.formatPrice(globalDocFee)}`;
    document.getElementById('calcInstallmentCount').textContent = '0 งวด';
    document.getElementById('calcTotalAmount').textContent = `฿${this.formatPrice(displayAmount + globalDocFee)}`;
    document.getElementById('calcInstallmentAmount').textContent = '฿0.00';
    document.getElementById('payTodayAmount').textContent = `฿${this.formatPrice(displayAmount + globalDocFee)}`;
    document.getElementById('firstInstallmentDate').textContent = '-';
    document.getElementById('lastInstallmentDate').textContent = '-';

    // Update tax information
    this.updateTaxDisplay(productInfo);

    // Update total amount display with demo indicator if needed
    const totalAmountElement = document.getElementById('totalAmount');
    if (totalAmountElement && this.totalAmount <= 0) {
      totalAmountElement.innerHTML = `
        <span class="text-orange-600">฿${this.formatPrice(displayAmount)}</span>
        <span class="text-xs text-orange-500 ml-2">(โหมดทดสอบ)</span>
      `;
    }
  }

  updateTaxDisplay(productInfo) {
    const taxInfoRow = document.getElementById('taxInfoRow');
    const vatAmountRow = document.getElementById('vatAmountRow');
    const documentTypeElement = document.getElementById('documentType');
    const vatTypesInfo = document.getElementById('vatTypesInfo');
    const vatTypesElement = document.getElementById('vatTypes');

    if (productInfo.taxInfo.hasVat) {
      // Show tax information
      taxInfoRow.style.display = 'flex';
      vatAmountRow.style.display = 'flex';
      vatTypesInfo.style.display = 'flex';

      document.getElementById('calcBeforeTax').textContent = `฿${this.formatPrice(productInfo.totalBeforeTax)}`;
      document.getElementById('calcVatAmount').textContent = `฿${this.formatPrice(productInfo.totalTaxAmount)}`;
      vatTypesElement.textContent = `รวมภาษี ${productInfo.taxInfo.combinedTaxRate}%`;
    } else {
      // Hide tax information
      taxInfoRow.style.display = 'none';
      vatAmountRow.style.display = 'none';
      vatTypesInfo.style.display = 'none';
    }

    // Update document type
    if (documentTypeElement) {
      documentTypeElement.textContent = productInfo.taxInfo.documentType;
      documentTypeElement.className = productInfo.taxInfo.hasVat ?
        'font-semibold text-purple-600' : 'font-semibold text-blue-600';
    }

    console.log('📊 Tax display updated:', {
      hasVat: productInfo.taxInfo.hasVat,
      documentType: productInfo.taxInfo.documentType,
      beforeTax: productInfo.totalBeforeTax,
      taxAmount: productInfo.totalTaxAmount,
      combinedTaxRate: productInfo.taxInfo.combinedTaxRate
    });
  }

  // ========== NAVIGATION ==========

  proceedToStep4() {
    if (!this.selectedPlan) {
      this.showToast('กรุณาเลือกแผนการชำระ', 'warning');
      return;
    }

    // Final validation
    if (!window.globalInstallmentManager.validateStep(3)) {
      const errors = window.globalInstallmentManager.getValidationErrors(3);
      this.showToast(errors[0] || 'ข้อมูลไม่ครบถ้วน', 'error');
      return;
    }

    // Complete step 3
    if (window.globalInstallmentManager.completeStep(3)) {
      console.log('✅ Step 3 completed, proceeding to Step 4');
      window.location.href = '/step4';
    } else {
      this.showToast('ไม่สามารถดำเนินการต่อได้ กรุณาตรวจสอบข้อมูล', 'error');
    }
  }

  goBackToStep2() {
    window.location.href = '/step2';
  }

  redirectToIncompleteStep() {
    const nextStep = window.globalInstallmentManager.getNextStep();

    if (nextStep === 1) {
      this.showToast('กรุณาเลือกสินค้าก่อน', 'warning');
      setTimeout(() => window.location.href = '/step1', 1500);
    } else if (nextStep === 2) {
      this.showToast('กรุณากรอกข้อมูลลูกค้าก่อน', 'warning');
      setTimeout(() => window.location.href = '/step2', 1500);
    }
  }

  // ========== UTILITY FUNCTIONS ==========

  formatPrice(amount) {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  }

  formatDate(date) {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  getImageUrl(imagePath) {
    if (!imagePath) return '/uploads/Logo2.png';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/')) return imagePath;
    return `/uploads/products/${imagePath}`;
  }

  showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  debug() {
    return {
      isInitialized: this.isInitialized,
      cartItems: this.cartItems.length,
      totalAmount: this.totalAmount,
      selectedPlan: this.selectedPlan,
      recommendedPlans: this.recommendedPlans.length,
      customPlan: this.customPlan,
      canNavigate: window.globalInstallmentManager ? window.globalInstallmentManager.canNavigateToStep(3) : false
    };
  }
}

// Step3Integration class is ready for manual initialization
// Initialization will be handled in the HTML file

console.log('📋 Step 3 Integration loaded - v1.4.0 (Custom plan modal: Click-to-configure interface)');