/**
 * Step 4 Integration - Summary & Document Generation
 * เชื่อมต่อกับ Global Data Manager และ installmentController
 * สร้างเอกสาร, ตัดสต๊อก (✅ เปิดใช้งานแล้ว), และส่งข้อมูล
 * @version 1.1.0 - Stock Update Enabled
 */

class Step4Integration {
  constructor() {
    this.isInitialized = false;
    this.contractData = null;
    this.isProcessing = false;
    this.contractCreated = false;
    this.documentUrls = {};

    this.initialize();
  }

  /**
   * 🔧 FIX: ดึงชื่อพนักงานจากการ login
   */
  async getLoggedInEmployeeName() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('⚠️ No auth token found - cannot get employee name');
        return null;
      }

      // ลองดึงจาก userProfile ก่อน
      const userProfile = localStorage.getItem('userProfile');
      if (userProfile) {
        try {
          const parsed = JSON.parse(userProfile);
          if (parsed.name) {
            console.log('✅ Employee name from userProfile:', parsed.name);
            return parsed.name;
          }
        } catch (e) {
          console.warn('⚠️ Failed to parse userProfile:', e);
        }
      }

      // ลองดึงจาก localStorage อื่นๆ
      const fallbackNames = [
        localStorage.getItem('userName'),
        localStorage.getItem('employeeName'),
        sessionStorage.getItem('employeeName')
      ];

      for (const name of fallbackNames) {
        if (name && typeof name === 'string' && name.trim() &&
            !name.includes('[object') && name !== 'undefined') {
          console.log('✅ Employee name from localStorage:', name);
          return name.trim();
        }
      }

      // ถ้าไม่พบ ดึงจาก API
      console.log('🔍 No cached employee name found, fetching from API...');
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        const employeeName = userData.user?.name || userData.name || userData.username;
        if (employeeName) {
          // บันทึกลง localStorage เพื่อใช้ครั้งต่อไป
          localStorage.setItem('employeeName', employeeName);
          console.log('✅ Employee name from API:', employeeName);
          return employeeName;
        }
      } else {
        console.warn('⚠️ Failed to fetch user profile from API:', response.status);
      }

      // 🔧 FIX: ไม่ใช้ fallback - ส่งคืน null หากไม่พบข้อมูลจากการ login
      console.warn('⚠️ No employee name found from login/token');
      return null;

    } catch (error) {
      console.error('❌ Error getting employee name:', error);
      return null;
    }
  }

  // ========== TAX CALCULATION METHODS ==========

  /**
   * คำนวณภาษีที่ถูกต้องจากข้อมูล step1 และ step3
   */
  calculateVatAmount(step1Data, step3Data) {
    try {
      console.log('💰 Calculating VAT amount...');
      console.log('🔍 Input data check:', {
        step1Data,
        step1DataType: typeof step1Data,
        hasCartItems: !!step1Data?.cartItems,
        cartItemsType: typeof step1Data?.cartItems,
        isCartItemsArray: Array.isArray(step1Data?.cartItems),
        cartItemsLength: step1Data?.cartItems?.length,
        step3Data,
        step3DataType: typeof step3Data
      });

      if (!step1Data || !step3Data) {
        console.log('⚠️ Missing step1Data or step3Data for VAT calculation');
        return 0;
      }

      if (!step1Data.cartItems) {
        console.log('⚠️ Missing cartItems in step1Data for VAT calculation');
        return 0;
      }

      if (!Array.isArray(step1Data.cartItems)) {
        console.log('⚠️ cartItems is not an array:', step1Data.cartItems);
        return 0;
      }

      // คำนวณยอดรวมสินค้า (ไม่รวมค่าธรรมเนียมเอกสาร)
      let subtotal = 0;
      subtotal = step1Data.cartItems
        .filter(item => !item.name?.includes('ค่าธรรมเนียม') && !item.description?.includes('ค่าธรรมเนียม'))
        .reduce((sum, item) => {
          const price = parseFloat(item.price || item.sale_price || 0);
          const quantity = parseInt(item.quantity || 1);
          return sum + (price * quantity);
        }, 0);

      const docFee = parseFloat(step3Data.doc_fee || 0);
      const afterDiscount = subtotal + docFee;

      let vatAmount = 0;

      // คำนวณภาษีตาม taxType
      if (step3Data.taxType === 'inclusive') {
        // ภาษีรวมในราคา: VAT = Amount - (Amount / 1.07)
        vatAmount = Math.round((afterDiscount - (afterDiscount / 1.07)) * 100) / 100;
      } else if (step3Data.taxType === 'exclusive' || step3Data.taxType === 'vat') {
        // ภาษีแยกนอกราคา: VAT = Amount * 0.07
        vatAmount = Math.round(afterDiscount * 0.07 * 100) / 100;
      } else {
        // ไม่มีภาษี
        vatAmount = 0;
      }

      console.log('💰 VAT calculation result:', {
        subtotal,
        docFee,
        afterDiscount,
        taxType: step3Data.taxType,
        vatAmount
      });

      return vatAmount;

    } catch (error) {
      console.error('❌ Error calculating VAT amount:', error);
      return 0;
    }
  }

  initialize() {
    console.log('📋 Initializing Step 4 Integration...');
    console.log('🔄 Stock Update Feature: ✅ ENABLED - การตัดสต๊อกเปิดใช้งานแล้ว');

    // Wait for Global Data Manager
    if (typeof window.globalInstallmentManager === 'undefined') {
      console.log('⏳ Waiting for Global Data Manager...');
      setTimeout(() => this.initialize(), 100);
      return;
    }

    // Check if all previous steps are completed
    if (!window.globalInstallmentManager.canNavigateToStep(4)) {
      this.redirectToIncompleteStep();
      return;
    }

    this.loadSummaryData();
    this.setupEventListeners();

    this.isInitialized = true;
    console.log('✅ Step 4 Integration initialized');
    console.log('📦 Stock update is ready to process items when contract is created');
  }

  // ========== DATA LOADING ==========

  loadSummaryData() {
    const step1Data = window.globalInstallmentManager.getStepData(1);
    const step2Data = window.globalInstallmentManager.getStepData(2);
    const step3Data = window.globalInstallmentManager.getStepData(3);

    if (!step1Data || !step2Data || !step3Data) {
      this.showToast('ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบขั้นตอนก่อนหน้า', 'error');
      return;
    }

    this.renderContractSummary(step1Data, step2Data, step3Data);
    this.renderCustomerSummary(step2Data);
    this.renderItemsSummary(step1Data);
    this.renderPaymentPlanSummary(step3Data);
    this.updatePaymentAmount(step3Data);
    this.checkTaxInvoiceAvailability(step1Data);

    console.log('📥 Loaded summary data for Step 4');
  }

  renderContractSummary(step1Data, step2Data, step3Data) {
    const container = document.getElementById('contractSummary');
    if (!container) return;

    // 🔧 ยอดสินค้าทั้งหมด = เงินดาวน์ + (ค่างวดต่อเดือน × จำนวนงวด)
    const downPayment = Number(step3Data.down_payment || 0);
    const installmentPeriod = Number(step3Data.installment_count || 0);
    const installmentAmount = Number(step3Data.installment_amount || 0);
    const totalAmount = downPayment + (installmentAmount * installmentPeriod);
    const docFee = Number(step3Data.doc_fee || 0);

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">฿${this.formatPrice(totalAmount)}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">ยอดสินค้าทั้งหมด</div>
        </div>
        
        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-green-600 dark:text-green-400">฿${this.formatPrice(downPayment + docFee)}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">ชำระวันนี้</div>
        </div>
        
        <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">${installmentPeriod}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">งวด</div>
        </div>
      </div>
      
      <div class="mt-4 space-y-2">
            <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">ลูกค้า:</span>
          <span class="font-semibold">${step2Data.customer.firstName || step2Data.customer.first_name || ''} ${step2Data.customer.lastName || step2Data.customer.last_name || ''}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">เบอร์โทรศัพท์:</span>
          <span class="font-semibold">${step2Data.customer.phone || step2Data.customer.phone_number || ''}</span>
            </div>
            <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">แผนการชำระ:</span>
          <span class="font-semibold">${step3Data.selectedPlan?.name || 'แผนกำหนดเอง'}</span>
            </div>
            <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">ผ่อนต่องวด:</span>
          <span class="font-semibold">฿${this.formatPrice(installmentAmount)}</span>
        </div>
                           </div>
     `;
  }

  renderCustomerSummary(step2Data) {
    const container = document.getElementById('customerSummary');
    if (!container) return;

    const customer = step2Data.customer;

    container.innerHTML = `
      <div>
        <h4 class="font-semibold mb-2">ข้อมูลส่วนตัว</h4>
        <div class="space-y-1 text-sm">
          <div><span class="text-gray-600 dark:text-gray-400">ชื่อ-นามสกุล:</span> ${customer.prefix || ''} ${customer.firstName || customer.first_name || ''} ${customer.lastName || customer.last_name || ''}</div>
          <div><span class="text-gray-600 dark:text-gray-400">เลขบัตรประชาชน:</span> ${this.formatIdCard(customer.idCard || customer.tax_id || customer.id_card || '')}</div>
          <div><span class="text-gray-600 dark:text-gray-400">อายุ:</span> ${customer.age} ปี</div>
          <div><span class="text-gray-600 dark:text-gray-400">อีเมล:</span> ${customer.email}</div>
        </div>
      </div>
      
      <div>
        <h4 class="font-semibold mb-2">ที่อยู่</h4>
        <div class="text-sm text-gray-600 dark:text-gray-400">
          ${this.formatAddress(customer.address)}
        </div>
        
        ${(() => {
          // Debug witness data from multiple sources
          const witnessFromStep2 = step2Data.witness || {};
          const witnessFromLocalStorage = JSON.parse(localStorage.getItem('witness_data') || '{}');
          const witnessFromGlobal = window.globalInstallmentManager?.getStepData(2)?.witness || {};

          console.log('🔍 Debug witness data sources:', {
            witnessFromStep2,
            witnessFromLocalStorage,
            witnessFromGlobal,
            step2DataKeys: Object.keys(step2Data),
            hasWitnessInStep2: !!step2Data.witness
          });

          // Merge all witness data sources
          const witnessData = {
            ...witnessFromGlobal,
            ...witnessFromLocalStorage,
            ...witnessFromStep2
          };

          console.log('🔍 Merged witness data:', witnessData);

          // Check if we have any witness data
          const hasWitnessData = witnessData.firstName || witnessData.lastName || witnessData.name;

          if (hasWitnessData) {
            return `
              <div class="mt-4">
                <h4 class="font-semibold mb-2">ผู้ค้ำประกัน/พยาน</h4>
                <div class="space-y-1 text-sm">
                  <div><span class="text-gray-600 dark:text-gray-400">ชื่อ:</span> ${witnessData.firstName || witnessData.name || ''} ${witnessData.lastName || ''}</div>
                  <div><span class="text-gray-600 dark:text-gray-400">เลขบัตรประชาชน:</span> ${witnessData.idCard || 'ไม่ระบุ'}</div>
                  <div><span class="text-gray-600 dark:text-gray-400">เบอร์โทร:</span> ${witnessData.phone || 'ไม่ระบุ'}</div>
                  <div><span class="text-gray-600 dark:text-gray-400">ความสัมพันธ์:</span> ${witnessData.relationship || witnessData.relation || 'ไม่ระบุ'}</div>
                  ${witnessData.photoUrl ? `<div><span class="text-gray-600 dark:text-gray-400">รูปภาพ:</span> <span class="text-green-600">มีแล้ว</span></div>` : ''}
                  ${witnessData.idCardImageUrl ? `<div><span class="text-gray-600 dark:text-gray-400">รูปบัตรประชาชน:</span> <span class="text-green-600">มีแล้ว</span></div>` : ''}
                </div>
              </div>
            `;
          } else {
            return `
              <div class="mt-4">
                <h4 class="font-semibold mb-2 text-yellow-600">ผู้ค้ำประกัน/พยาน</h4>
                <div class="text-sm text-yellow-600">
                  ⚠️ ยังไม่มีข้อมูลพยาน กรุณากลับไปกรอกข้อมูลใน Step 2
                </div>
              </div>
            `;
          }
        })()}
      </div>
    `;
  }

  renderItemsSummary(step1Data) {
    const container = document.getElementById('itemsSummary');
    if (!container) return;

    container.innerHTML = '';

    step1Data.cartItems.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg';

      itemDiv.innerHTML = `
        <img src="${this.getImageUrl(item.image)}" alt="${item.name}" 
             class="w-12 h-12 object-cover rounded-lg"
             onerror="this.src='/uploads/Logo2.png'">
        <div class="flex-1">
          <h4 class="font-semibold text-sm">${item.name}</h4>
          <p class="text-xs text-gray-600 dark:text-gray-400">${item.brand || 'N/A'}</p>
          ${item.imei ? `<p class="text-xs text-blue-600 dark:text-blue-400 font-mono">IMEI: ${item.imei}</p>` : ''}
        </div>
        <div class="text-right">
          <div class="font-semibold">฿${this.formatPrice(item.totalPrice || item.price)}</div>
          <div class="text-xs text-gray-500">จำนวน: ${item.quantity || 1}</div>
        </div>
      `;

      container.appendChild(itemDiv);
    });

    // Total
    const totalDiv = document.createElement('div');
    totalDiv.className = 'flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-600 font-bold';
    totalDiv.innerHTML = `
      <span>รวมทั้งหมด:</span>
      <span class="text-blue-600 dark:text-blue-400">฿${this.formatPrice(step1Data.totalAmount)}</span>
    `;
    container.appendChild(totalDiv);
  }

  renderPaymentPlanSummary(step3Data) {
    const container = document.getElementById('paymentPlanSummary');
    if (!container) return;

    // 🔍 DEBUG: ตรวจสอบข้อมูลการชำระเงินจาก step3
    console.log('🔍 Step3 Payment Method Debug:', {
      paymentMethod: step3Data.paymentMethod,
      creditTerm: step3Data.creditTerm,
      fullStep3Data: step3Data
    });

    const plan = step3Data.selectedPlan;
    if (!plan) return;

    const today = new Date();
    const firstInstallment = new Date(today);
    firstInstallment.setMonth(firstInstallment.getMonth() + 1);

    const lastInstallment = new Date(today);
    lastInstallment.setMonth(lastInstallment.getMonth() + step3Data.installment_count);

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">แผนที่เลือก:</span>
            <span class="font-semibold">${plan.name}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">เงินดาวน์:</span>
            <span class="font-semibold text-green-600">฿${this.formatPrice(step3Data.down_payment)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">ค่าธรรมเนียม:</span>
            <span class="font-semibold">฿${this.formatPrice(step3Data.doc_fee)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">จำนวนงวด:</span>
            <span class="font-semibold">${step3Data.installment_count} งวด</span>
          </div>
        </div>
        
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">ผ่อนต่องวด:</span>
            <span class="font-semibold text-blue-600">฿${this.formatPrice(step3Data.installment_amount)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">งวดแรก:</span>
            <span class="font-semibold">${this.formatDate(firstInstallment)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">งวดสุดท้าย:</span>
            <span class="font-semibold">${this.formatDate(lastInstallment)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">วิธีชำระ:</span>
            <span class="font-semibold">${this.getPaymentMethodText(step3Data.paymentMethod || step3Data.creditTerm || 'cash')}</span>
          </div>
        </div>
      </div>
    `;
  }

  updatePaymentAmount(step3Data) {
    // รับข้อมูลจาก step1 สำหรับการคำนวณภาษี
    const step1Data = window.globalInstallmentManager.getStepData(1);

    // 🔍 Debug: ตรวจสอบข้อมูล
    console.log('🔍 updatePaymentAmount debug:', {
      step1Data,
      step1DataType: typeof step1Data,
      cartItems: step1Data?.cartItems,
      cartItemsType: typeof step1Data?.cartItems,
      isArray: Array.isArray(step1Data?.cartItems),
      step3Data,
      step3DataType: typeof step3Data
    });

    const downPayment = step3Data.down_payment || 0;
    const docFee = step3Data.doc_fee || 0;

    // 🔧 ภาษีรวมอยู่ในฐานเงินดาวน์แล้ว (inclusive)
    const vatAmount = this.calculateVatAmount(step1Data, step3Data);

    // คำนวณยอดรวมที่ต้องแสดงวันนี้ = เงินดาวน์ + ค่าธรรมเนียม (VAT รวมอยู่แล้ว)
    const totalAmount = downPayment + docFee;

    // อัพเดท display
    const totalElement = document.getElementById('todayPaymentAmount');
    if (totalElement) {
      totalElement.textContent = `฿${this.formatPrice(totalAmount)}`;
    }

    // อัพเดทรายละเอียด
    const downPaymentElement = document.getElementById('downPaymentDisplay');
    if (downPaymentElement) {
      downPaymentElement.textContent = `฿${this.formatPrice(downPayment)}`;
    }

    // แสดงค่าธรรมเนียมเอกสารถ้ามี
    const docFeeElement = document.getElementById('docFeeDisplay');
    if (docFeeElement) {
      if (docFee > 0) {
        docFeeElement.style.display = 'block';
        docFeeElement.querySelector('span').textContent = `฿${this.formatPrice(docFee)}`;
      } else {
        docFeeElement.style.display = 'none';
      }
    }

    // 🔧 แสดงภาษีที่คำนวณใหม่
    const taxDisplay = document.getElementById('taxDisplay');
    if (taxDisplay) {
      if (vatAmount > 0) {
        taxDisplay.style.display = 'block';
        const taxSpan = taxDisplay.querySelector('span');
        if (taxSpan) {
          taxSpan.textContent = `฿${this.formatPrice(vatAmount)}`;
        }
      } else {
        taxDisplay.style.display = 'none';
      }
    }

    console.log('💰 Payment amount updated:', {
      downPayment,
      docFee,
      vatAmount,
      totalAmount,
      taxType: step3Data?.taxType
    });

    // 🔧 แสดงภาษีที่คำนวณใหม่
    const taxElement = document.getElementById('taxDisplay');
    if (taxElement) {
      if (vatAmount > 0) {
        taxElement.style.display = 'block';
        taxElement.querySelector('span').textContent = `฿${this.formatPrice(vatAmount)}`;
      } else {
        taxElement.style.display = 'none';
      }
    }

    console.log('💰 Payment amount updated:', {
      downPayment,
      docFee,
      vatAmount,
      totalAmount,
      taxType: step3Data?.taxType
    });
  }

  // ========== DOCUMENT GENERATION METHODS ==========

  async generateQuotationDocument(documentData) {
    console.log('📄 Generating quotation PDF with MANDATORY database persistence');
    try {
      // 🚨 MANDATORY: ตรวจสอบข้อมูลลูกค้าก่อนบันทึก Quotation
      console.log('🔍 MANDATORY Customer data validation for Quotation:', {
        hasCustomerData: !!documentData?.customerData,
        customerName: documentData?.customerData ?
          `${documentData.customerData.prefix || ''} ${documentData.customerData.first_name || ''} ${documentData.customerData.last_name || ''}`.trim() :
          'NO_CUSTOMER_DATA',
        customerTaxId: documentData?.customerData?.tax_id || 'NO_TAX_ID',
        customerPhone: documentData?.customerData?.phone_number || 'NO_PHONE',
        customerAddress: documentData?.customerData?.address || 'NO_ADDRESS',
        hasItemsData: !!(documentData?.itemsData && documentData.itemsData.length > 0),
        itemsCount: documentData?.itemsData?.length || 0,
        hasPaymentData: !!documentData?.paymentData,
        downPayment: documentData?.paymentData?.downPayment || 0
      });

      // 🚨 หยุดการทำงานหากข้อมูลไม่ครบ
      if (!documentData?.customerData ||
          (!documentData.customerData.first_name && !documentData.customerData.last_name)) {
        throw new Error('❌ MANDATORY ERROR: ข้อมูลลูกค้าไม่ครบถ้วน - ไม่สามารถสร้างใบเสนอราคาได้');
      }

      if (!documentData?.itemsData || documentData.itemsData.length === 0) {
        throw new Error('❌ MANDATORY ERROR: ไม่มีรายการสินค้า - ไม่สามารถสร้างใบเสนอราคาได้');
      }

      if (!documentData?.paymentData) {
        throw new Error('❌ MANDATORY ERROR: ไม่มีข้อมูลแผนการชำระเงิน - ไม่สามารถสร้างใบเสนอราคาได้');
      }

      console.log('✅ MANDATORY validation passed for Quotation - proceeding with database save');
      console.log('💾 MANDATORY: Saving quotation data to database FIRST...');

      // Debug: Check customer data for Quotation
      console.log('🔍 Customer data debug for Quotation:', {
        prefix: documentData.customerData.prefix,
        first_name: documentData.customerData.first_name,
        last_name: documentData.customerData.last_name,
        address: documentData.customerData.address,
        addressType: typeof documentData.customerData.address,
        fullCustomerData: documentData.customerData
      });
      // 🗃️ STEP 1: บันทึกข้อมูลลง Quotation model ก่อน
      console.log('💾 Saving quotation data to database...');

      const quotationData = {
        date: new Date(),
        branchCode: documentData.branchData?.code || window.BRANCH_CODE || '00000',
        docFee: documentData.paymentData?.docFee || 0,
        pickupMethod: 'store',
        shippingFee: 0,
        customer: {
          name: `${documentData.customerData.prefix || ''} ${documentData.customerData.first_name || ''} ${documentData.customerData.last_name || ''}`.trim(),
          address: documentData.customerData.address || 'ไม่มีข้อมูล',
          taxId: documentData.customerData.tax_id || '',
          phone: documentData.customerData.phone_number || ''
        },
        witness: {
          name: 'พยาน ทดสอบ',
          id_card: '1234567890123',
          phone: '0800000000',
          relation: 'เพื่อน'
        },
        currency: 'THB',
        creditTerm: this.getPaymentMethodText(documentData.paymentData?.paymentMethod) || 'เงินสด',
        vatInclusive: true,
        discountValue: 0,
        planType: documentData.paymentData?.selectedPlan || 'ผ่อนชำระ',
        downPayment: documentData.paymentData?.downPayment || 0,
        installmentPeriod: documentData.paymentData?.installmentPeriod || 0,
        installmentAmount: documentData.paymentData?.installmentAmount || 0,
        items: (documentData.itemsData || []).map(item => ({
          product: item.id || item._id || item.productId || item.product_id,
          imei: item.imei || '',
          quantity: parseInt(item.quantity || 1),
          unitPrice: parseFloat(item.price || 0),
          totalPrice: parseFloat(item.totalPrice || item.price || 0) * parseInt(item.quantity || 1),
          downAmount: documentData.paymentData?.downPayment || 0,
          termCount: documentData.paymentData?.installmentPeriod || 0,
          installmentAmount: documentData.paymentData?.installmentAmount || 0
        })),
        summary: {
          subtotal: documentData.paymentData?.subTotal || documentData.paymentData?.totalAmount || 0,
          shipping: 0,
          discount: 0,
          beforeTax: documentData.paymentData?.beforeTaxAmount || documentData.paymentData?.totalAmount || 0,
          tax: documentData.paymentData?.vatAmount || 0,
          netTotal: documentData.paymentData?.totalAmount || 0
        },
        // 🔧 เพิ่มลายเซ็นเพื่อบันทึกลงฐานข้อมูล
        signatures: {
          customer: window.globalInstallmentManager?.getCustomerSignature() || '',
          salesperson: window.globalInstallmentManager?.getSalespersonSignature() || '',
          authorized: window.globalInstallmentManager?.getAuthorizedSignature() || ''
        },
        customerSignature: window.globalInstallmentManager?.getCustomerSignature() || '',
        customerSignatureUrl: window.globalInstallmentManager?.getCustomerSignature() || '',
        employeeSignature: window.globalInstallmentManager?.getSalespersonSignature() || '',
        salespersonSignatureUrl: window.globalInstallmentManager?.getSalespersonSignature() || '',
        authorizedSignature: window.globalInstallmentManager?.getAuthorizedSignature() || '',
        authorizedSignatureUrl: window.globalInstallmentManager?.getAuthorizedSignature() || ''
      };

      console.log('📋 Quotation data to be sent:', JSON.stringify(quotationData, null, 2));

      // 🔍 Debug: ตรวจสอบลายเซ็นก่อนส่งไปยัง Database
      console.log('🖋️ Quotation Signatures being sent to database:', {
        customerSignature: quotationData.customerSignature ? quotationData.customerSignature.substring(0, 50) + '...' : 'EMPTY',
        employeeSignature: quotationData.employeeSignature ? quotationData.employeeSignature.substring(0, 50) + '...' : 'EMPTY',
        authorizedSignature: quotationData.authorizedSignature ? quotationData.authorizedSignature.substring(0, 50) + '...' : 'EMPTY'
      });

      // บันทึกลงฐานข้อมูล พร้อม timeout protection
      const quotationController = new AbortController();
      const quotationTimeoutId = setTimeout(() => quotationController.abort(), 15000); // 15 seconds timeout

      const saveResponse = await fetch('/api/quotation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify(quotationData),
        signal: quotationController.signal
      });

      clearTimeout(quotationTimeoutId);

      if (!saveResponse.ok) {
        const errorData = await saveResponse.text();
        console.error('❌ Quotation save error details:', errorData);
        throw new Error(`Failed to save quotation: ${saveResponse.status} ${saveResponse.statusText} - ${errorData}`);
      }

      const savedQuotation = await saveResponse.json();
      console.log('✅ Quotation saved to database:', savedQuotation);

      // อัพเดท quotation number ใน contractData และ session
      const quotationNumber = savedQuotation.data?.quotationNumber ||
                             savedQuotation.data?.number ||
                             savedQuotation.quotationNumber ||
                             savedQuotation.number ||
                             savedQuotation.data?.data?.quotationNumber ||
                             `QT-${String(new Date().getFullYear() + 543).slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Date.now()).slice(-3)}`;

      const quotationId = savedQuotation.data?._id ||
                         savedQuotation._id ||
                         savedQuotation.data?.data?._id ||
                         savedQuotation.id;

      console.log('🔍 Quotation extraction debug:', {
        quotationNumber,
        quotationId,
        savedQuotationKeys: Object.keys(savedQuotation),
        savedQuotationDataKeys: savedQuotation.data ? Object.keys(savedQuotation.data) : 'no data field',
        // 🔍 Debug: เพิ่มการตรวจสอบแหล่งที่มาของ quotationNumber
        fromDataQuotationNumber: savedQuotation.data?.quotationNumber,
        fromDataNumber: savedQuotation.data?.number,
        fromQuotationNumber: savedQuotation.quotationNumber,
        fromNumber: savedQuotation.number,
        fromDataDataQuotationNumber: savedQuotation.data?.data?.quotationNumber,
        usedFallback: !savedQuotation.data?.quotationNumber && !savedQuotation.data?.number && !savedQuotation.quotationNumber && !savedQuotation.number && !savedQuotation.data?.data?.quotationNumber
      });

        if (this.contractData) {
        this.contractData.quotationNumber = quotationNumber;
        this.contractData.quotationRef = quotationNumber;
          this.contractData.data = this.contractData.data || {};
        this.contractData.data.quotation_no = quotationNumber;
        }

        // อัพเดท globalInstallmentManager
        if (window.globalInstallmentManager && window.globalInstallmentManager.updateQuotationNumber) {
        window.globalInstallmentManager.updateQuotationNumber(quotationNumber);
        }

        // อัพเดท session storage
      sessionStorage.setItem('currentQuotationNumber', quotationNumber);
      sessionStorage.setItem('actualQuotationNumber', quotationNumber);
      sessionStorage.setItem('savedQuotationId', quotationId);

      console.log('✅ Quotation number updated to:', quotationNumber);

            // 🗃️ STEP 2: สร้าง PDF โดยใช้ fallback URL โดยตรง (เพื่อความเสถียร)
      console.log('📄 Using direct PDF URL for quotation...');

      const pdfUrl = `/api/pdf/quotation/${quotationNumber}`;
      console.log('✅ Quotation PDF URL generated:', pdfUrl);

      return pdfUrl;

    } catch (error) {
      console.error('❌ Error in quotation generation:', error);

      // 🚨 MANDATORY: หยุดการทำงานหากเป็น MANDATORY ERROR
      if (error.message.includes('MANDATORY ERROR')) {
        console.error('🚨 MANDATORY ERROR detected - stopping all operations');
        throw error; // ส่ง error ต่อไปให้ caller จัดการ
      }

      if (error.name === 'AbortError') {
        console.error('❌ Quotation API timeout');
        throw new Error('❌ ระบบหมดเวลาในการสร้างใบเสนอราคา กรุณาลองใหม่');
      }

      // สำหรับ error อื่นๆ ที่ไม่ใช่ MANDATORY (อนุญาตให้ใช้ fallback)
      console.error('❌ Non-mandatory error in quotation generation, using fallback:', error);

      // Fallback
      const quotationNumber = this.contractData?.quotationNumber ||
                             sessionStorage.getItem('currentQuotationNumber') ||
                             `QT-${String(new Date().getFullYear() + 543).slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Date.now()).slice(-3)}`;

      console.log('📄 Using fallback quotation URL:', quotationNumber);
      return `/api/pdf/quotation/${quotationNumber}`;
    }
  }

  async generateInvoiceDocument(documentData) {
    // Debug: Check customer data for Invoice
    console.log('🔍 Customer data debug for Invoice:', {
      prefix: documentData.customerData.prefix,
      first_name: documentData.customerData.first_name,
      last_name: documentData.customerData.last_name,
      address: documentData.customerData.address,
      addressType: typeof documentData.customerData.address,
      fullCustomerData: documentData.customerData
    });
    console.log('📄 Generating invoice PDF with database persistence');

    try {
      // 🗃️ STEP 1: บันทึกข้อมูลลง Invoice model ก่อน
      console.log('💾 Saving invoice data to database...');

      // 🔧 FIX: ให้เลขที่ใบแจ้งหนี้ตรงกับใบเสนอราคา
      const quotationNumber = this.contractData?.quotationNumber ||
                              sessionStorage.getItem('currentQuotationNumber') ||
                              sessionStorage.getItem('actualQuotationNumber');

      // สร้างเลขที่ใบแจ้งหนี้ให้ตรงกับใบเสนอราคา
      let invoiceNumber;
      if (quotationNumber) {
        // แยกเลขท้ายจากใบเสนอราคา เช่น QT-680828-004 -> 680828 และ 004
        const quotationMatch = quotationNumber.match(/QT-(\d{6})-(\d{3})$/);
        if (quotationMatch) {
          const dateCode = quotationMatch[1]; // เช่น "680828"
          const suffix = quotationMatch[2]; // เช่น "004"
          invoiceNumber = `INV-${dateCode}-${suffix}`;
          console.log('🔧 FIXED: Invoice number matched with quotation:', {
            quotationNumber,
            invoiceNumber,
            dateCode,
            suffix
          });
        }
      }

      // ถ้าไม่พบ quotation number ใช้วิธีเดิม
      if (!invoiceNumber) {
        invoiceNumber = `INV-${String(new Date().getFullYear() + 543).slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Date.now()).slice(-3)}`;
        console.log('⚠️ Using fallback invoice number:', invoiceNumber);
      }

      const savedQuotationId = sessionStorage.getItem('savedQuotationId');

      // ป้องกัน undefined หรือ "undefined" string
      let validQuotationRef = savedQuotationId;
      if (!validQuotationRef || validQuotationRef === 'undefined' || validQuotationRef === 'null') {
        validQuotationRef = quotationNumber;
      }
      if (!validQuotationRef || validQuotationRef === 'undefined' || validQuotationRef === 'null') {
        throw new Error('ไม่สามารถหา Quotation Reference ได้ กรุณาลองใหม่');
      }

      // 🔧 FIX: คำนวณและเพิ่มข้อมูล VAT สำหรับใบแจ้งหนี้
      const step3Data = window.globalInstallmentManager?.getStepData(3);
      const step1Data = window.globalInstallmentManager?.getStepData(1);
      const calculatedVat = this.calculateVatAmount(step1Data, step3Data);

      const invoiceData = {
        invoiceNumber: invoiceNumber, // 🔧 FIX: ใช้เลขที่ที่ตรงกับใบเสนอราคา
        quotationRef: validQuotationRef,
        date: new Date(),
        branchCode: documentData.branchData?.code || window.BRANCH_CODE || '00000',
        customer: {
          name: `${documentData.customerData.prefix || ''} ${documentData.customerData.first_name || ''} ${documentData.customerData.last_name || ''}`.trim(),
          address: documentData.customerData.address || 'ไม่มีข้อมูล',
          taxId: documentData.customerData.tax_id || '',
          phone: documentData.customerData.phone_number || ''
        },
        items: (documentData.itemsData || []).map(item => ({
          product: item.id || item._id || item.productId || item.product_id,
            name: item.name || 'สินค้า',
            imei: item.imei || '',
          quantity: parseInt(item.quantity || 1),
          unitPrice: parseFloat(item.price || 0),
          totalPrice: parseFloat(item.totalPrice || item.price || 0) * parseInt(item.quantity || 1),
            downAmount: documentData.paymentData?.downPayment || 0,
            termCount: documentData.paymentData?.installmentPeriod || 0,
          installmentAmount: documentData.paymentData?.installmentAmount || 0
        })),
        pickupMethod: 'store',
        shippingFee: 0,
        docFee: documentData.paymentData?.docFee || 0,
        discountValue: 0,
        planSummaryText: '',
        // 🔧 FIX: เพิ่มข้อมูล VAT สำหรับการแสดงในใบแจ้งหนี้
        taxType: step3Data?.taxType || 'inclusive',
        vatAmount: calculatedVat,
        vatRate: 7,
        hasVat: calculatedVat > 0,
        // 🔧 FIX: คำนวณ subtotal จากข้อมูลสินค้าจริง
        subtotal: (documentData.itemsData || []).reduce((sum, item) => {
          return sum + (parseFloat(item.totalPrice || item.price || 0) * parseInt(item.quantity || 1));
        }, 0),
        // 🔧 FIX: คำนวณ totalWithTax จากข้อมูลที่ถูกต้อง
        totalWithTax: (() => {
          const itemsTotal = (documentData.itemsData || []).reduce((sum, item) => {
            return sum + (parseFloat(item.totalPrice || item.price || 0) * parseInt(item.quantity || 1));
          }, 0);
          const docFee = documentData.paymentData?.docFee || 0;
          const total = itemsTotal + docFee + calculatedVat;
          console.log('🔧 Invoice totalWithTax calculation:', {
            itemsTotal,
            docFee,
            calculatedVat,
            total
          });
          return total;
        })(),
        // 🔧 FIX: เพิ่มชื่อพนักงานขาย - ใช้จากการ login เท่านั้น
        staffName: await this.getLoggedInEmployeeName(),
        employeeName: await this.getLoggedInEmployeeName(),
        salesman: await this.getLoggedInEmployeeName(),
        // 🔧 เพิ่มลายเซ็นเพื่อบันทึกลงฐานข้อมูล
        signatures: {
          customer: window.globalInstallmentManager?.getCustomerSignature() || '',
          salesperson: window.globalInstallmentManager?.getSalespersonSignature() || '',
          authorized: window.globalInstallmentManager?.getAuthorizedSignature() || ''
        },
        customerSignature: window.globalInstallmentManager?.getCustomerSignature() || '',
        customerSignatureUrl: window.globalInstallmentManager?.getCustomerSignature() || '',
        employeeSignature: window.globalInstallmentManager?.getSalespersonSignature() || '',
        salespersonSignatureUrl: window.globalInstallmentManager?.getSalespersonSignature() || '',
        authorizedSignature: window.globalInstallmentManager?.getAuthorizedSignature() || '',
        authorizedSignatureUrl: window.globalInstallmentManager?.getAuthorizedSignature() || ''
      };

      console.log('📋 Invoice data to be sent:', JSON.stringify(invoiceData, null, 2));

      // 🔍 Debug: ตรวจสอบลายเซ็นก่อนส่งไปยัง Database
      console.log('🖋️ Invoice Signatures being sent to database:', {
        customerSignature: invoiceData.customerSignature ? invoiceData.customerSignature.substring(0, 50) + '...' : 'EMPTY',
        employeeSignature: invoiceData.employeeSignature ? invoiceData.employeeSignature.substring(0, 50) + '...' : 'EMPTY',
        authorizedSignature: invoiceData.authorizedSignature ? invoiceData.authorizedSignature.substring(0, 50) + '...' : 'EMPTY'
      });
      console.log('🔍 Invoice generation debug:', {
        quotationNumber,
        savedQuotationId,
        validQuotationRef,
        usingQuotationRef: invoiceData.quotationRef,
        refType: typeof invoiceData.quotationRef
      });

      // บันทึกลงฐานข้อมูล พร้อม timeout protection
      const invoiceController = new AbortController();
      const invoiceTimeoutId = setTimeout(() => invoiceController.abort(), 15000); // 15 seconds timeout

      const saveResponse = await fetch('/api/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify(invoiceData),
        signal: invoiceController.signal
      });

      clearTimeout(invoiceTimeoutId);

      if (!saveResponse.ok) {
        const errorData = await saveResponse.text();
        console.error('❌ Invoice save error details:', errorData);
        throw new Error(`Failed to save invoice: ${saveResponse.status} ${saveResponse.statusText} - ${errorData}`);
      }

      const savedInvoice = await saveResponse.json();
      console.log('✅ Invoice saved to database:', savedInvoice);

      const savedInvoiceNumber = savedInvoice.invoiceNumber || savedInvoice.number;
      if (this.contractData) {
        this.contractData.invoiceNumber = savedInvoiceNumber;
        this.contractData.invoiceRef = savedInvoiceNumber;
        this.contractData.data = this.contractData.data || {};
        this.contractData.data.invoice_no = savedInvoiceNumber;
      }

      sessionStorage.setItem('currentInvoiceNumber', savedInvoiceNumber);
      sessionStorage.setItem('savedInvoiceId', savedInvoice._id);

      console.log('✅ Invoice number updated to:', savedInvoiceNumber);

            // 🗃️ STEP 2: สร้าง PDF โดยใช้ fallback URL โดยตรง (เพื่อความเสถียร)
      console.log('📄 Using direct PDF URL for invoice...');

      const pdfUrl = `/api/pdf/invoice/${savedInvoiceNumber}`;
      console.log('✅ Invoice PDF URL generated:', pdfUrl);

      return pdfUrl;

    } catch (error) {
      console.error('❌ Error in invoice generation:', error);

      if (error.name === 'AbortError') {
        console.error('❌ Invoice API timeout');
      }

      // Fallback
      invoiceNumber = this.contractData?.invoiceNumber ||
                     sessionStorage.getItem('currentInvoiceNumber') ||
                     `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Date.now()).slice(-3)}`;

      console.log('📄 Using fallback invoice URL:', invoiceNumber);
      return `/api/pdf/invoice/${invoiceNumber}`;
    }
  }

  async generateReceiptDocument(documentData) {
    console.log('📄 Generating receipt PDF with MANDATORY database persistence');
    console.log('🔧 Receipt Generation - Start Time:', new Date().toISOString());
    console.log('📋 Receipt Input Data Overview:', {
      hasDocumentData: !!documentData,
      documentDataKeys: documentData ? Object.keys(documentData) : null,
      customerDataExists: !!(documentData?.customerData),
      itemsDataExists: !!(documentData?.itemsData),
      paymentDataExists: !!(documentData?.paymentData)
    });

    try {
      // Check if items have VAT to determine document number format
      console.log('🔍 Step 1: Checking VAT status for receipt type determination...');
      const hasVatItems = this.checkHasVatItems();
      console.log('📊 VAT Detection Result for Receipt:', {
        hasVatItems,
        receiptType: hasVatItems ? 'Tax Receipt (TX-)' : 'Regular Receipt (RE-)',
        timestamp: new Date().toLocaleTimeString()
      });

      // 🚨 MANDATORY: ตรวจสอบข้อมูลลูกค้าก่อนบันทึก
      console.log('� MANDATORY Customer data validation for Receipt:', {
        hasCustomerData: !!documentData?.customerData,
        customerName: documentData?.customerData ?
          `${documentData.customerData.prefix || ''} ${documentData.customerData.first_name || ''} ${documentData.customerData.last_name || ''}`.trim() :
          'NO_CUSTOMER_DATA',
        customerTaxId: documentData?.customerData?.tax_id || 'NO_TAX_ID',
        customerPhone: documentData?.customerData?.phone_number || 'NO_PHONE',
        customerAddress: documentData?.customerData?.address || 'NO_ADDRESS',
        hasItemsData: !!(documentData?.itemsData && documentData.itemsData.length > 0),
        itemsCount: documentData?.itemsData?.length || 0,
        hasPaymentData: !!documentData?.paymentData,
        downPayment: documentData?.paymentData?.downPayment || 0
      });

      // 🚨 หยุดการทำงานหากข้อมูลไม่ครบ
      if (!documentData?.customerData ||
          (!documentData.customerData.first_name && !documentData.customerData.last_name)) {
        throw new Error('❌ MANDATORY ERROR: ข้อมูลลูกค้าไม่ครบถ้วน - ไม่สามารถสร้างใบเสร็จได้');
      }

      if (!documentData?.itemsData || documentData.itemsData.length === 0) {
        throw new Error('❌ MANDATORY ERROR: ไม่มีรายการสินค้า - ไม่สามารถสร้างใบเสร็จได้');
      }

      if (!documentData?.paymentData || !documentData.paymentData.downPayment) {
        throw new Error('❌ MANDATORY ERROR: ไม่มีข้อมูลการชำระเงินดาวน์ - ไม่สามารถสร้างใบเสร็จได้');
      }

      console.log('✅ MANDATORY validation passed - proceeding with database save');
      console.log('�💾 MANDATORY: Saving receipt data to database FIRST...');

      // Debug: Check all input data
      console.log('🔍 Customer data debug for Receipt:', {
        prefix: documentData.customerData.prefix,
        first_name: documentData.customerData.first_name,
        last_name: documentData.customerData.last_name,
        address: documentData.customerData.address,
        addressType: typeof documentData.customerData.address
      });

      // Debug: Check available signatures
      const customerSignature = window.globalInstallmentManager?.getCustomerSignature() || '';
      const salespersonSignature = window.globalInstallmentManager?.getSalespersonSignature() || '';
      const authorizedSignature = window.globalInstallmentManager?.getAuthorizedSignature() || '';
      console.log('🖋️ Signature debug for Receipt:', {
        customer: customerSignature ? `${customerSignature.substring(0, 50)}...` : 'EMPTY',
        salesperson: salespersonSignature ? `${salespersonSignature.substring(0, 50)}...` : 'EMPTY',
        authorized: authorizedSignature ? `${authorizedSignature.substring(0, 50)}...` : 'EMPTY',
        // 🔍 Debug: ตรวจสอบ signature URLs ด้วย
        customerSignatureUrl: window.globalInstallmentManager?.getStepData(2)?.customerSignatureUrl || 'N/A',
        salespersonSignatureUrl: window.globalInstallmentManager?.getStepData(2)?.salespersonSignatureUrl || 'N/A',
        authorizedSignatureUrl: window.globalInstallmentManager?.getStepData(2)?.authorizedSignatureUrl || 'N/A'
      });

      // Generate receipt number based on VAT status using new document number generator
      console.log('🔍 Step 5: Generating receipt number with sequential numbering...');

      // ดึงรหัสสาขาจาก globalInstallmentManager
      const branchCode = window.BRANCH_CODE || '680731';

      // ใช้ระบบ generateDocumentNumber ใหม่ที่สร้างเลขที่ต่อเนื่อง
      let receiptNumber;
      let documentNumberToMatch = null;

      try {
        // 🎯 เลขที่ใบเสร็จ/ใบกำกับภาษีต้องตรงกับใบเสนอราคา
        const quotationNumber = this.contractData?.quotationNumber ||
                               sessionStorage.getItem('currentQuotationNumber') ||
                               sessionStorage.getItem('actualQuotationNumber');

        if (quotationNumber) {
          // แยกเลขท้ายจากใบเสนอราคา เช่น QT-680731-001 -> 001
          const quotationMatch = quotationNumber.match(/-(\d{3})$/);
          if (quotationMatch) {
            documentNumberToMatch = quotationMatch[1]; // เช่น "001"
            console.log('📋 Found quotation suffix to match:', {
              quotationNumber,
              suffixToMatch: documentNumberToMatch
            });
          }
        }

        // สร้างเลขที่ที่ตรงกับใบเสนอราคา - รูปแบบใหม่ PREFIX-YYMMDD-XXXXX (พ.ศ.)
        if (documentNumberToMatch) {
          // สร้าง datePrefix ตามวันที่ปัจจุบัน (พ.ศ.)
          const now = new Date();
          const yearBE = now.getFullYear() + 543; // แปลงเป็นปี พ.ศ.
          const yearShort = yearBE.toString().slice(-2); // เอาแค่ 2 หลักสุดท้าย (68)
          const month = String(now.getMonth() + 1).padStart(2, '0'); // เดือน 2 หลัก (08)
          const day = String(now.getDate()).padStart(2, '0'); // วัน 2 หลัก (16)
          const datePrefix = `${yearShort}${month}${day}`; // 680816

          // ใช้เลขท้ายเดียวกับใบเสนอราคา - Receipt ต้องใช้ RE เสมอ
          receiptNumber = `RE-${datePrefix}-${documentNumberToMatch}`;

          console.log('✅ Receipt number matched with quotation (current date format):', {
            receiptNumber,
            matchedSuffix: documentNumberToMatch,
            quotationNumber,
            dateFormat: `${datePrefix} (${day}/${month}/${yearBE} พ.ศ.)`
          });
        } else {
          // ถ้าไม่พบเลขใบเสนอราคา ใช้ API สร้างใหม่
          const response = await fetch('/api/generate-document-number', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            },
            body: JSON.stringify({
              hasVatItems,
              branchCode
            })
          });

          if (response.ok) {
            const result = await response.json();
            receiptNumber = result.documentNumber;
            console.log('✅ New sequential receipt number generated via API:', {
              receiptNumber,
              isSequential: true,
              metadata: result.metadata
            });
          } else {
            throw new Error('API call failed');
          }
        }
      } catch (error) {
        console.error('❌ Error generating receipt number, using fallback:', error);
        // Fallback: ใช้วิธีเดิม
        const currentDate = new Date();
        const year = currentDate.getFullYear() + 543; // ปี พ.ศ.
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const timestamp = String(Date.now()).slice(-3);

        receiptNumber = hasVatItems
          ? `TX-${branchCode}-${timestamp}`
          : `RE-${branchCode}-${timestamp}`;
      }

      console.log('📄 Receipt Number Generated:', {
        hasVatItems,
        receiptNumber,
        numberType: hasVatItems ? 'Tax Receipt (TX-)' : 'Regular Receipt (RE-)',
        branchCode,
        isSequential: receiptNumber.includes('-001') || receiptNumber.includes('-002') || receiptNumber.includes('-003'),
        timestamp: new Date().toISOString()
      });

      console.log('🔍 Step 6: Building receipt data object...');
      const receiptData = {
        receiptNumber: receiptNumber,
        documentType: 'RECEIPT',
        receiptType: 'down_payment_receipt',
        saleType: 'installment', // บ่งบอกว่าเป็นขายผ่อน
        contractNo: this.contractData?.contractNo || this.contractData?.quotationNumber || sessionStorage.getItem('currentQuotationNumber'),
        contractId: this.contractData?.quotationId,
        downPaymentAmount: documentData.paymentData?.downPayment || 0,
        customerName: `${documentData.customerData.prefix || ''} ${documentData.customerData.first_name || ''} ${documentData.customerData.last_name || ''}`.trim(),
        customer: {
          name: `${documentData.customerData.prefix || ''} ${documentData.customerData.first_name || ''} ${documentData.customerData.last_name || ''}`.trim(),
          fullName: `${documentData.customerData.prefix || ''} ${documentData.customerData.first_name || ''} ${documentData.customerData.last_name || ''}`.trim(),
          prefix: documentData.customerData.prefix || '',
          first_name: documentData.customerData.first_name || '',
          last_name: documentData.customerData.last_name || '',
          taxId: documentData.customerData.tax_id || '',
          tax_id: documentData.customerData.tax_id || '',
          phone: documentData.customerData.phone_number || '',
          phone_number: documentData.customerData.phone_number || '',
          email: documentData.customerData.email || '',
          address: this.formatAddress(documentData.customerData.address) || documentData.customerData.address || 'ไม่มีข้อมูล',
          age: documentData.customerData.age || ''
        },
        items: (documentData.itemsData || []).map(item => ({
          product: item.id || item._id || item.productId || item.product_id,
          name: item.name || 'สินค้า',
          brand: item.brand || '',
          imei: item.imei || '',
          quantity: parseInt(item.quantity || 1),
          unitPrice: parseFloat(item.price || item.sale_price || 0),
          totalPrice: parseFloat(item.totalPrice || item.price || item.sale_price || 0) * parseInt(item.quantity || 1),
          downAmount: documentData.paymentData?.downPayment || 0,
          termCount: documentData.paymentData?.installmentPeriod || 0,
          installmentAmount: documentData.paymentData?.installmentAmount || 0,
          image: item.image || '',
          description: item.description || item.name || 'สินค้า'
        })),
        summary: {
          ...(documentData.summaryData || {}),
          // ส่งค่าให้ API/Model ใช้คำนวณใบเสร็จตามใบกำกับภาษี
          subtotal: Number(documentData.paymentData?.downPayment || 0),
          docFee: Number(documentData.paymentData?.docFee || 0),
          vatAmount: Number(documentData.taxData?.vatAmount || 0),
          totalWithTax: Number((documentData.paymentData?.downPayment || 0) + (documentData.paymentData?.docFee || 0))
        },
        company: documentData.companyData || {
          name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
          address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
          taxId: '0945566000616',
          phone: '09-2427-0769'
        },
        branch: {
          name: 'สำนักงานใหญ่',
          code: '00000',
          address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000'
        },
        signatures: {
          customer: window.globalInstallmentManager?.getCustomerSignature() || '',
          salesperson: window.globalInstallmentManager?.getSalespersonSignature() || '',
          authorized: window.globalInstallmentManager?.getAuthorizedSignature() || ''
        },
        // 🔧 FIX: ปรับปรุงการตรวจสอบ payment method ให้รองรับหลายรูปแบบ
        paymentMethod: this.getPaymentMethodForDocument(documentData.paymentData?.paymentMethod),
        paymentDate: new Date(),
        issueDate: new Date().toISOString(),
        notes: `ใบเสร็จเงินดาวน์การผ่อนชำระ [${receiptNumber}] - สัญญาเลขที่ ${this.contractData?.contractNo || this.contractData?.quotationNumber || 'N/A'}`,
        branchCode: documentData.branchData?.code || window.BRANCH_CODE || '00000',
        // 🔧 FIX: ใช้ชื่อพนักงานจากการ login เท่านั้น - ไม่มี fallback
        employeeName: await this.getLoggedInEmployeeName(),
        salesperson: {
          name: await this.getLoggedInEmployeeName(),
          signature: window.globalInstallmentManager?.getSalespersonSignature() || ''
        }
      };
      // ป้องกันบันทึกซ้ำด้วย idempotencyKey
      try {
        const idemBase = [
          'installment',
          (receiptData.branchCode || this.branchCode || '00000'),
          (receiptData.contractNo || 'N/A'),
          receiptData.receiptNumber,
          (receiptData.customer?.taxId || receiptData.customer?.phone || receiptData.customer?.name || '').replace(/\s+/g, ''),
          Number((documentData.paymentData?.downPayment || 0) + (documentData.paymentData?.docFee || 0)).toFixed(2),
          Number(documentData.paymentData?.docFee || 0).toFixed(2),
          Number(documentData.paymentData?.downPayment || 0).toFixed(2)
        ].join('|');
        receiptData.idempotencyKey = idemBase;
      } catch (_) {}

      console.log('� Step 7: Receipt data prepared successfully');
      console.log('�📋 Receipt Data Summary:', {
        receiptNumber,
        documentType: receiptData.documentType,
        receiptType: receiptData.receiptType,
        contractNo: receiptData.contractNo,
        downPaymentAmount: receiptData.downPaymentAmount,
        customerName: receiptData.customerName,
        itemsCount: receiptData.items?.length || 0,
        paymentMethod: receiptData.paymentMethod,
        branchCode: receiptData.branchCode,
        hasSignatures: {
          customer: !!receiptData.signatures?.customer,
          salesperson: !!receiptData.signatures?.salesperson,
          authorized: !!receiptData.signatures?.authorized
        }
      });

      console.log('📋 Full Receipt data prepared:', JSON.stringify(receiptData, null, 2));

      // 🔧 บันทึกข้อมูล Receipt ลงฐานข้อมูลจริง
      console.log('� Step 8: Database save preparation...');
      console.log('�💾 MANDATORY: Saving receipt data to database FIRST...');

      // 🚨 DEBUG: แสดงข้อมูลที่จะส่งไป
      console.log('📤 Receipt data to be sent to API:', {
        endpoint: '/api/receipt',
        method: 'POST',
        dataSize: JSON.stringify(receiptData).length,
        hasAuthToken: !!localStorage.getItem('authToken'),
        authTokenLength: localStorage.getItem('authToken')?.length || 0
      });
      console.log('📤 Receipt data payload:', JSON.stringify(receiptData, null, 2));

      try {
        console.log('🔍 Step 9: Initiating database save...');
        // ส่งข้อมูลไปบันทึกลงฐานข้อมูล
        const saveController = new AbortController();
        const saveTimeoutId = setTimeout(() => {
          console.warn('⚠️ Tax Invoice save request timeout - aborting after 30 seconds');
          saveController.abort();
        }, 30000); // 30 seconds timeout - increased from 15

        console.log('📡 Starting POST request to /api/receipt...');
        console.log('⏰ Request timeout set to 15 seconds');

        const requestStartTime = Date.now();
        // ตรวจสอบ token ก่อนส่ง request
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('ไม่พบ Authentication Token กรุณาเข้าสู่ระบบใหม่');
        }

        const saveResponse = await fetch('/api/receipt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(receiptData),
          signal: saveController.signal
        });

        clearTimeout(saveTimeoutId);
        const requestDuration = Date.now() - requestStartTime;

        console.log('📥 Receipt API Response received:', {
          status: saveResponse.status,
          statusText: saveResponse.statusText,
          duration: `${requestDuration}ms`,
          ok: saveResponse.ok,
          headers: Object.fromEntries(saveResponse.headers.entries())
        });

        // 🚨 MANDATORY: ตรวจสอบ response ก่อนทำอะไรต่อ
        console.log('🔍 Step 10: Processing API response...');
        if (saveResponse.ok) {
          const savedReceipt = await saveResponse.json();
          console.log('✅ MANDATORY: Receipt saved to database successfully');
          console.log('📋 Saved Receipt Response:', {
            success: savedReceipt.success,
            receiptId: savedReceipt.data?._id || savedReceipt._id || savedReceipt.id,
            receiptNumber: savedReceipt.data?.receiptNumber || savedReceipt.receiptNumber,
            message: savedReceipt.message,
            responseKeys: Object.keys(savedReceipt)
          });
          console.log('📋 Full Saved Receipt Data:', JSON.stringify(savedReceipt, null, 2));

          // ✅ VERIFY: ตรวจสอบว่าได้ ID จริงๆ - รองรับหลายรูปแบบ
          const savedReceiptId = savedReceipt.data?.id || savedReceipt.data?._id || savedReceipt._id || savedReceipt.id;
          let fallbackId = null;

          if (!savedReceiptId) {
            console.warn('⚠️ Receipt ID not found in expected format, but response was successful');
            console.log('🔍 Available receipt data:', Object.keys(savedReceipt.data || {}));
            // ใช้ receiptNumber เป็น fallback ID
            fallbackId = savedReceipt.data?.receiptNumber || savedReceipt.receiptNumber || receiptNumber;
            if (fallbackId) {
              console.log('✅ Using receipt number as fallback ID:', fallbackId);
            } else {
              throw new Error('❌ MANDATORY ERROR: No receipt ID or number returned from database');
            }
          }

          const finalReceiptId = savedReceiptId || fallbackId;
          console.log('🆔 MANDATORY: Receipt ID confirmed:', finalReceiptId);

          if (this.contractData) {
            this.contractData.receiptNumber = receiptNumber;
            this.contractData.receiptRef = receiptNumber;
            this.contractData.data = this.contractData.data || {};
            this.contractData.data.receipt_no = receiptNumber;
            this.contractData.data.receipt_id = finalReceiptId;
          }

          sessionStorage.setItem('currentReceiptNumber', receiptNumber);
          sessionStorage.setItem('savedReceiptId', finalReceiptId);

          console.log('✅ MANDATORY: Receipt database integration successful:', {
            number: receiptNumber,
            databaseId: finalReceiptId
          });

          // 🔧 Enhanced: เพิ่ม Enhanced Email Service integration สำหรับ Receipt และ Tax Invoice
          try {
            console.log('📧 Integrating with Enhanced Email Service...');
            await this.integrateWithEnhancedEmailService(receiptData, receiptNumber);
          } catch (emailError) {
            console.warn('⚠️ Enhanced Email Service integration failed:', emailError);
          }
        } else {
          // 🚨 MANDATORY ERROR: API call failed - ห้ามไม่บันทึกฐานข้อมูล
          const errorData = await saveResponse.text();
          console.error('❌ MANDATORY ERROR: Receipt save failed:', {
            status: saveResponse.status,
            statusText: saveResponse.statusText,
            response: errorData
          });

          throw new Error(`❌ MANDATORY ERROR: Receipt database save failed: ${saveResponse.status} ${saveResponse.statusText} - ${errorData}`);
        }
      } catch (error) {
        console.error('❌ MANDATORY ERROR: Receipt database save error:', error);

        // 🚨 MANDATORY: หยุดการทำงานทั้งหมดหากบันทึกฐานข้อมูลไม่สำเร็จ
        if (error.name === 'AbortError') {
          console.error('❌ MANDATORY ERROR: Receipt API timeout - Database save failed');
          throw new Error('❌ MANDATORY ERROR: ระบบหมดเวลาในการบันทึกใบเสร็จ กรุณาลองใหม่');
        }

        // ส่ง error ต่อไปให้ caller จัดการ
        throw error;
      }

      console.log('📄 MANDATORY: Database saved successfully, proceeding to PDF generation...');

      // 🔧 ส่งข้อมูลไปยัง updated API endpoint (รองรับทั้ง Tax Invoice และ Receipt)
      const allStepData = window.globalInstallmentManager.getAllStepData();

      // Prepare complete data for PDF generation
      const pdfRequestData = {
        // Document information
        documentNumber: receiptNumber,
        documentType: 'RECEIPT',
        invoiceType: 'RECEIPT',
        receiptNumber: receiptNumber,

        // Customer information
        customer: receiptData.customer,

        // Items
        items: receiptData.items,

        // Payment information
        downPaymentAmount: receiptData.downPaymentAmount,
        paymentMethod: receiptData.paymentMethod,

        // Summary
        summary: receiptData.summary,

        // Company and branch
        company: receiptData.company,
        branch: receiptData.branch,
        branchCode: receiptData.branchCode,

        // Staff
        employeeName: receiptData.employeeName,
        salesperson: receiptData.salesperson,

        // Signatures
        customerSignatureUrl: receiptData.signatures?.customer || '',
        salespersonSignatureUrl: receiptData.signatures?.salesperson || '',
        authorizedSignatureUrl: receiptData.signatures?.authorized || '',

        // Dates
        saleDate: receiptData.issueDate,
        issueDate: receiptData.issueDate,

        // Additional info
        contractNo: receiptData.contractNo,
        notes: receiptData.notes,

        // Step data for fallback
        stepData: allStepData
      };

      const pdfResponse = await fetch('/api/pdf/installment/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify(pdfRequestData)
      });

      if (!pdfResponse.ok) {
        throw new Error(`Receipt PDF API error: ${pdfResponse.status}`);
      }

      // 🔧 Handle PDF blob response instead of JSON
      const pdfBlob = await pdfResponse.blob();
      console.log('✅ Receipt PDF generated:', {
        size: pdfBlob.size,
        type: pdfBlob.type
      });

      // Create blob URL for the PDF
      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      console.log('✅ Receipt PDF URL created:', pdfUrl);
      return pdfUrl;

    } catch (error) {
      console.error('❌ Error in receipt generation:', error);
      if (error.name === 'AbortError') {
        console.error('❌ Receipt API timeout');
      }

      // Generate fallback receipt number with sequential numbering attempt
      const hasVatItems = this.checkHasVatItems();
      const branchCode = window.BRANCH_CODE || '680731';

      let receiptNumber;
      try {
        // พยายามเรียก API สำหรับเลขที่เอกสารแม้ในการ fallback
        const response = await fetch('/api/generate-document-number', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          },
          body: JSON.stringify({
            hasVatItems,
            branchCode
          })
        });

        if (response.ok) {
          const result = await response.json();
          receiptNumber = result.documentNumber;
        } else {
          throw new Error('API fallback failed');
        }
      } catch (apiError) {
        console.error('❌ API fallback failed, using timestamp fallback:', apiError);
        // Final fallback: ใช้ timestamp
        const timestamp = String(Date.now()).slice(-3);
        receiptNumber = hasVatItems
          ? `TX-${branchCode}-${timestamp}`
          : `RE-${branchCode}-${timestamp}`;
      }

      console.log('📄 Fallback receipt number generated:', receiptNumber);

      console.log('📄 Using fallback receipt generation...');
      // Fallback ยังคงต้องส่งข้อมูลไปยัง API
      try {
        const fallbackData = {
          receiptNumber: receiptNumber,
          documentType: 'RECEIPT',
          receiptType: 'down_payment_receipt',
          customer: {
            name: 'ลูกค้า',
            address: 'ไม่มีข้อมูล'
          },
        company: {
            name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
            address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
            taxId: '0945566000616',
            phone: '09-2427-0769'
        },
        branch: {
          name: 'สำนักงานใหญ่',
            code: '00000'
          },
          downPaymentAmount: 0,
          issueDate: new Date().toISOString(),
          notes: `ใบเสร็จเงินดาวน์การผ่อนชำระ [${receiptNumber}] - Fallback`
        };

        const pdfResponse = await fetch('/api/pdf/installment/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
          body: JSON.stringify({ stepData: window.globalInstallmentManager.getAllStepData() })
        });

        if (pdfResponse.ok) {
          const pdfBlob = await pdfResponse.blob();
          const pdfUrl = window.URL.createObjectURL(pdfBlob);
          return pdfUrl;
        }
      } catch (fallbackError) {
        console.error('❌ Fallback receipt generation also failed:', fallbackError);
      }

      // Final fallback - return placeholder
      return `/uploads/temp/receipt_placeholder_${receiptNumber}.pdf`;
    }
  }

  async generateTaxInvoiceDocument(documentData) {
    console.log('📄 Generating tax invoice PDF with MANDATORY database persistence');
    console.log('🔧 Tax Invoice Generation - Start Time:', new Date().toISOString());
    console.log('📋 Tax Invoice Input Data Overview:', {
      hasDocumentData: !!documentData,
      documentDataKeys: documentData ? Object.keys(documentData) : null,
      customerDataExists: !!(documentData?.customerData),
      itemsDataExists: !!(documentData?.itemsData),
      paymentDataExists: !!(documentData?.paymentData)
    });

    try {
      // 🚨 MANDATORY: ตรวจสอบว่าสินค้ามีภาษีก่อน
      console.log('🔍 Step 1: MANDATORY VAT verification for Tax Invoice...');
      const hasVatItems = this.checkHasVatItems();
      console.log('� MANDATORY VAT items check for Tax Invoice:', {
        hasVatItems,
        shouldGenerateTaxInvoice: hasVatItems,
        checkMethod: 'checkHasVatItems()',
        timestamp: new Date().toLocaleTimeString()
      });

      if (!hasVatItems) {
        console.log('⚠️ INFO: สินค้าไม่มี VAT แต่จะสร้างใบกำกับภาษีตามนโยบายบริษัท');
        // ไม่ throw error - สร้างใบกำกับภาษีแบบไม่มี VAT
      }
      console.log('✅ Step 1 Complete: VAT verification passed');

      // 🚨 MANDATORY: ตรวจสอบข้อมูลลูกค้าก่อนบันทึก Tax Invoice
      console.log('🔍 Step 2: MANDATORY Customer data validation for Tax Invoice...');
      console.log('📋 MANDATORY Customer data validation for Tax Invoice:', {
        hasCustomerData: !!documentData?.customerData,
        customerName: documentData?.customerData ?
          `${documentData.customerData.prefix || ''} ${documentData.customerData.first_name || ''} ${documentData.customerData.last_name || ''}`.trim() :
          'NO_CUSTOMER_DATA',
        customerTaxId: documentData?.customerData?.tax_id || 'NO_TAX_ID',
        customerPhone: documentData?.customerData?.phone_number || 'NO_PHONE',
        customerAddress: documentData?.customerData?.address || 'NO_ADDRESS',
        hasItemsData: !!(documentData?.itemsData && documentData.itemsData.length > 0),
        itemsCount: documentData?.itemsData?.length || 0,
        hasPaymentData: !!documentData?.paymentData,
        downPayment: documentData?.paymentData?.downPayment || 0
      });

      // 🚨 หยุดการทำงานหากข้อมูลไม่ครบ
      if (!documentData?.customerData ||
          (!documentData.customerData.first_name && !documentData.customerData.last_name)) {
        throw new Error('❌ MANDATORY ERROR: ข้อมูลลูกค้าไม่ครบถ้วน - ไม่สามารถสร้างใบกำกับภาษีได้');
      }

      if (!documentData?.itemsData || documentData.itemsData.length === 0) {
        throw new Error('❌ MANDATORY ERROR: ไม่มีรายการสินค้า - ไม่สามารถสร้างใบกำกับภาษีได้');
      }

      if (!documentData?.paymentData || !documentData.paymentData.downPayment) {
        throw new Error('❌ MANDATORY ERROR: ไม่มีข้อมูลการชำระเงินดาวน์ - ไม่สามารถสร้างใบกำกับภาษีได้');
      }

      console.log('✅ MANDATORY validation passed for Tax Invoice - proceeding with database save');
      console.log('💾 MANDATORY: Saving tax invoice data to database FIRST...');

      // Debug: Check available signatures
      console.log('🔍 Step 4: Checking available signatures...');
      const customerSignature = window.globalInstallmentManager?.getCustomerSignature() || '';
      const salespersonSignature = window.globalInstallmentManager?.getSalespersonSignature() || '';
      const authorizedSignature = window.globalInstallmentManager?.getAuthorizedSignature() || '';
      console.log('🖋️ Signature debug for Tax Invoice:', {
        customer: customerSignature ? `${customerSignature.substring(0, 50)}...` : 'EMPTY',
        salesperson: salespersonSignature ? `${salespersonSignature.substring(0, 50)}...` : 'EMPTY',
        authorized: authorizedSignature ? `${authorizedSignature.substring(0, 50)}...` : 'EMPTY'
      });

      // Generate tax invoice number with sequential numbering
      console.log('🔍 Step 5: Generating tax invoice number with sequential numbering...');

      // ดึงรหัสสาขาจาก globalInstallmentManager
      const branchCode = window.BRANCH_CODE || '680731';

      let taxInvoiceNumber;
      let documentNumberToMatch = null;

      try {
        // 🎯 เลขที่ใบกำกับภาษีต้องตรงกับใบเสนอราคา
        const quotationNumber = this.contractData?.quotationNumber ||
                               sessionStorage.getItem('currentQuotationNumber') ||
                               sessionStorage.getItem('actualQuotationNumber');

        if (quotationNumber) {
          // แยกเลขท้ายจากใบเสนอราคา เช่น QT-680731-001 -> 001
          const quotationMatch = quotationNumber.match(/-(\d{3})$/);
          if (quotationMatch) {
            documentNumberToMatch = quotationMatch[1]; // เช่น "001"
            console.log('📋 Found quotation suffix to match for Tax Invoice:', {
              quotationNumber,
              suffixToMatch: documentNumberToMatch
            });
          }
        }

        // สร้างเลขที่ที่ตรงกับใบเสนอราคา - รูปแบบใหม่ TX-YYMMDD-XXXXX (พ.ศ.)
        if (documentNumberToMatch) {
          // สร้าง datePrefix ตามวันที่ปัจจุบัน (พ.ศ.)
          const now = new Date();
          const yearBE = now.getFullYear() + 543; // แปลงเป็นปี พ.ศ.
          const yearShort = yearBE.toString().slice(-2); // เอาแค่ 2 หลักสุดท้าย (68)
          const month = String(now.getMonth() + 1).padStart(2, '0'); // เดือน 2 หลัก (08)
          const day = String(now.getDate()).padStart(2, '0'); // วัน 2 หลัก (16)
          const datePrefix = `${yearShort}${month}${day}`; // 680816

          // ใช้เลขท้ายเดียวกับใบเสนอราคา
          taxInvoiceNumber = `TX-${datePrefix}-${documentNumberToMatch}`;

          console.log('✅ Tax Invoice number matched with quotation (current date format):', {
            taxInvoiceNumber,
            matchedSuffix: documentNumberToMatch,
            quotationNumber,
            dateFormat: `${datePrefix} (${day}/${month}/${yearBE} พ.ศ.)`
          });
        } else {
          // ถ้าไม่พบเลขใบเสนอราคา ใช้ API สร้างใหม่
          const response = await fetch('/api/generate-document-number', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            },
            body: JSON.stringify({
              hasVatItems: true, // Tax Invoice มีภาษีเสมอ
              branchCode
            })
          });

          if (response.ok) {
            const result = await response.json();
            taxInvoiceNumber = result.documentNumber;
            console.log('✅ New sequential tax invoice number generated via API:', {
              taxInvoiceNumber,
              isSequential: true,
              metadata: result.metadata
            });
          } else {
            throw new Error('API call failed');
          }
        }
      } catch (error) {
        console.error('❌ Error generating tax invoice number, using fallback:', error);
        // Fallback: ใช้วิธีเดิม
        const currentDate = new Date();
        const year = currentDate.getFullYear() + 543; // ปี พ.ศ.
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const timestamp = String(Date.now()).slice(-3);

        taxInvoiceNumber = `TX-${branchCode}-${timestamp}`;
      }

      console.log('📄 Tax Invoice Number Generated:', {
        taxInvoiceNumber,
        numberFormat: 'TX-BRANCH-SEQ (Sequential)',
        branchCode,
        isSequential: taxInvoiceNumber.includes('-001') || taxInvoiceNumber.includes('-002') || taxInvoiceNumber.includes('-003'),
        timestamp: new Date().toISOString()
      });

      // 🔧 คำนวณภาษีที่ถูกต้อง - ใช้ค่าดาวน์แทนยอดรวมทั้งหมด
      console.log('🔍 Step 6: Calculating VAT amounts for DOWN PAYMENT ONLY...');
      const step1Data = window.globalInstallmentManager?.getStepData(1);
      const step3Data = window.globalInstallmentManager?.getStepData(3);

      // 🎯 ใช้ค่าดาวน์แทนยอดรวมทั้งหมด
      const downPayment = parseFloat(documentData.paymentData?.downPayment || 0);
      const docFee = parseFloat(step3Data?.doc_fee || 0);

      console.log('� DOWN PAYMENT CALCULATION (Tax Invoice):', {
        downPayment,
        docFee,
        note: 'ใบกำกับภาษีจะใช้ค่าดาวน์ + ค่าธรรมเนียม เท่านั้น ไม่ใช่ยอดรวมทั้งหมด'
      });

      // คำนวณจากค่าดาวน์ + ค่าธรรมเนียม
      const baseAmount = downPayment + docFee; // ยอดฐานสำหรับคำนวณภาษี
      let vatAmount = 0;
      let totalWithTax = 0;

      // คำนวณภาษีตาม taxType
      console.log('🔍 Step 7: Calculating VAT based on DOWN PAYMENT...');
      console.log(`📊 Tax type from step3: ${step3Data?.taxType}`);
      console.log(`📊 Base amount (down payment + doc fee): ฿${baseAmount}`);

      // บังคับให้ใบกำกับภาษีคำนวณแบบรวมภาษีเสมอ (Tax Inclusive)
      if (true) { // step3Data?.taxType === 'inclusive'
        // ภาษีรวมในราคา
        console.log('📊 TAX INVOICE: Forced Inclusive VAT calculation');
        totalWithTax = baseAmount;
        vatAmount = Math.round((baseAmount - (baseAmount / 1.07)) * 100) / 100;
        console.log(`� Total with tax: ฿${totalWithTax}`);
        console.log(`📊 VAT amount (extracted from down payment): ฿${vatAmount}`);
      }
      /* *** TAX INVOICE บังคับ Inclusive เสมอ - ไม่ใช้ else cases ***
      } else if (step3Data?.taxType === 'exclusive' || step3Data?.taxType === 'vat') {
        // ภาษีแยกนอกราคา - ไม่ใช้สำหรับ Tax Invoice
      } else {
        // ไม่มีภาษี - ไม่ใช้สำหรับ Tax Invoice
      } */
      console.log('💰 Tax Invoice calculation summary (DOWN PAYMENT):', {
        downPayment,
        docFee,
        baseAmount,
        vatAmount,
        totalWithTax,
        taxType: step3Data?.taxType,
        calculationMethod: step3Data?.taxType === 'inclusive' ? 'VAT included in down payment' : 'VAT added to down payment',
        note: 'ใบกำกับภาษีใช้ค่าดาวน์เท่านั้น ไม่ใช่ยอดรวมทั้งหมด'
      });

      console.log('� Step 8: Building tax invoice data object...');

      const taxInvoiceData = {
        taxInvoiceNumber: taxInvoiceNumber,
        documentType: 'TAX_INVOICE',
        receiptType: 'down_payment_tax_invoice',
        saleType: 'installment', // บ่งบอกว่าเป็นขายผ่อน
        documentNumber: taxInvoiceNumber, // 🆕 เพิ่มสำหรับ Receipt_installment
        invoiceNumber: taxInvoiceNumber,  // 🆕 เพิ่มสำหรับ Receipt_installment
        contractNo: this.contractData?.data?.contract_number || this.contractData?.quotationNumber || sessionStorage.getItem('currentQuotationNumber'),
        contractId: this.contractData?.data?._id || this.contractData?._id,
        downPaymentAmount: documentData.paymentData?.downPayment || 0,
        customerName: `${documentData.customerData.prefix || ''} ${documentData.customerData.first_name || ''} ${documentData.customerData.last_name || ''}`.trim(),
        customer: {
          name: `${documentData.customerData.prefix || ''} ${documentData.customerData.first_name || ''} ${documentData.customerData.last_name || ''}`.trim(),
          fullName: `${documentData.customerData.prefix || ''} ${documentData.customerData.first_name || ''} ${documentData.customerData.last_name || ''}`.trim(),
          prefix: documentData.customerData.prefix || '',
          first_name: documentData.customerData.first_name || '',
          last_name: documentData.customerData.last_name || '',
          taxId: documentData.customerData.tax_id || '',
          tax_id: documentData.customerData.tax_id || '',
          phone: documentData.customerData.phone_number || '',
          phone_number: documentData.customerData.phone_number || '',
          email: documentData.customerData.email || '',
          address: this.formatAddress(documentData.customerData.address) || documentData.customerData.address || 'ไม่มีข้อมูล',
          age: documentData.customerData.age || ''
        },
        // 🔧 FIX: ปรับรายการใหม่สำหรับใบกำกับภาษี (แสดงเฉพาะค่าดาวน์)
        items: [
          {
            product: 'down_payment',
            name: `ค่าดาวน์ (${documentData.itemsData?.[0]?.name || 'สินค้า'} ${documentData.itemsData?.[0]?.imei ? '(IMEI: ' + documentData.itemsData[0].imei + ')' : ''})`,
            description: `*ดาวน์ รวม ค่าเอกสาร ${docFee} บาท`,
            quantity: 1,
            unitPrice: downPayment,
            totalPrice: downPayment,
            amount: downPayment,
            taxRate: step3Data?.taxType ? 7 : 0,
            taxType: step3Data?.taxType === 'inclusive' ? 'ภาษีรวมยอดดาวน์' :
                     step3Data?.taxType === 'exclusive' ? 'แยกภาษี' : 'ไม่มี VAT'
          }
        ],
        // 🔧 FIX: แก้ไข summary ให้แสดงเฉพาะยอดเงินดาวน์
        summary: {
          subtotal: downPayment, // ใช้ยอดเงินดาวน์แทนยอดรวมสินค้า
          docFee: docFee,
          beforeTax: downPayment + docFee, // ยอดก่อนภาษี = เงินดาวน์ + ค่าธรรมเนียม
          vatAmount: vatAmount,
          vat_amount: vatAmount,
          tax: vatAmount,
          totalWithTax: totalWithTax,
          netTotal: totalWithTax,
          total: totalWithTax,
          discount: 0,
          // เพิ่มข้อมูลเพื่อการแยกแยะ
          calculation_method: 'down_payment_only',
          note: 'ใบกำกับภาษีแสดงเฉพาะยอดเงินดาวน์และค่าธรรมเนียม'
        },
        // 🔧 เพิ่มข้อมูลรายละเอียดการคำนวณ
        calculation: {
          subtotal: downPayment,
          documentFee: docFee,
          beforeTax: baseAmount,
          vatRate: step3Data?.taxType ? 7 : 0,
          vatAmount: vatAmount,
          totalAmount: totalWithTax,
          taxType: step3Data?.taxType || 'none'
        },
        company: documentData.companyData || {
          name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
          address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
          taxId: '0945566000616',
          phone: '09-2427-0769'
        },
        branch: {
          name: 'สำนักงานใหญ่',
          code: '00000',
          address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000'
        },
        signatures: {
          customer: window.globalInstallmentManager?.getCustomerSignature() || '',
          salesperson: window.globalInstallmentManager?.getSalespersonSignature() || '',
          authorized: window.globalInstallmentManager?.getAuthorizedSignature() || ''
        },
        // 🆕 เพิ่มข้อมูลลายเซ็นสำหรับ Receipt_installment
        customerSignature: window.globalInstallmentManager?.getCustomerSignature() || '',
        customerSignatureUrl: window.globalInstallmentManager?.getCustomerSignature() || '',
        salespersonSignatureUrl: window.globalInstallmentManager?.getSalespersonSignature() || '',
        authorizedSignatureUrl: window.globalInstallmentManager?.getAuthorizedSignature() || '',
        employeeSignature: window.globalInstallmentManager?.getSalespersonSignature() || '',
        salespersonSignature: window.globalInstallmentManager?.getSalespersonSignature() || '',
        authorizedSignature: window.globalInstallmentManager?.getAuthorizedSignature() || '',
        // 🔧 FIX: ปรับปรุงการตรวจสอบ payment method ให้รองรับหลายรูปแบบ
        paymentMethod: this.getPaymentMethodForDocument(documentData.paymentData?.paymentMethod),
        paymentDate: new Date(),
        issueDate: new Date().toISOString(),
        notes: `ใบกำกับภาษี - เงินดาวน์การผ่อนชำระ [${taxInvoiceNumber}] - สัญญาเลขที่ ${this.contractData?.data?.contract_number || 'N/A'}`,
        branchCode: documentData.branchData?.code || window.BRANCH_CODE || '00000',
        // 🔧 FIX: ใช้ชื่อพนักงานจากการ login เท่านั้น - ไม่มี fallback
        employeeName: await this.getLoggedInEmployeeName(),
        staffName: await this.getLoggedInEmployeeName(),
        salesman: await this.getLoggedInEmployeeName(),
        salesperson: {
          name: await this.getLoggedInEmployeeName(),
          signature: window.globalInstallmentManager?.getSalespersonSignature() || ''
        },
        // บังคับให้ใบกำกับภาษีเป็นแบบรวมภาษีเสมอ
        vatInclusive: true,
        vatRate: step3Data?.taxType ? 7 : 0
      };

      console.log('📋 Tax Invoice data prepared:', JSON.stringify(taxInvoiceData, null, 2));

      // 🔍 Debug: ตรวจสอบข้อมูลที่ส่งไปยัง backend
      console.log('🔍 Tax Invoice Backend Data Debug:', {
        employeeName: taxInvoiceData.employeeName,
        staffName: taxInvoiceData.staffName,
        salesman: taxInvoiceData.salesman,
        salesperson: taxInvoiceData.salesperson,
        paymentMethod: taxInvoiceData.paymentMethod,
        originalPaymentMethod: documentData.paymentData?.paymentMethod,
        step3PaymentMethod: step3Data?.paymentMethod,
        step3CreditTerm: step3Data?.creditTerm
      });

      // 🔍 Debug: ตรวจสอบข้อมูลลูกค้าและรายการสินค้า
      console.log('🔍 Tax Invoice Customer Debug:', {
        customerData: documentData.customerData,
        formattedCustomer: taxInvoiceData.customer,
        itemsData: documentData.itemsData,
        formattedItems: taxInvoiceData.items,
        calculationData: taxInvoiceData.calculation
      });

      // 🔧 บันทึกข้อมูล Tax Invoice ลงฐานข้อมูลจริง - บังคับใช้ TAX_INVOICE TABLE เท่านั้น
      console.log('💾 MANDATORY: Saving tax invoice data to database (TAX_INVOICE TABLE ONLY)...');

      // Retry mechanism for better resilience
      let saveResponse;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          // ส่งข้อมูลไปบันทึกลงฐานข้อมูล - ใช้ /api/tax-invoice เท่านั้น
          const saveController = new AbortController();
          const saveTimeoutId = setTimeout(() => {
            console.warn(`⚠️ Tax Invoice save request timeout - aborting after 30 seconds (attempt ${retryCount + 1}/${maxRetries + 1})`);
            saveController.abort();
          }, 30000); // 30 seconds timeout - increased from 15

          if (retryCount > 0) {
            console.log(`🔄 Retry attempt ${retryCount}/${maxRetries} for Tax Invoice save...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Progressive delay
          }

          console.log('📡 MANDATORY: Sending POST request to /api/tax-invoice (NO FALLBACK)...');
          // ตรวจสอบ token ก่อนส่ง request
          const token = localStorage.getItem('authToken');
          if (!token) {
            throw new Error('ไม่พบ Authentication Token กรุณาเข้าสู่ระบบใหม่');
          }

          saveResponse = await fetch('/api/tax-invoice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(taxInvoiceData),
            signal: saveController.signal
          });

          clearTimeout(saveTimeoutId);
          break; // Success - exit retry loop
        } catch (retryError) {
          if (retryError.name === 'AbortError' && retryCount < maxRetries) {
            retryCount++;
            console.warn(`⚠️ Request timeout on attempt ${retryCount}, retrying...`);
            continue;
          }
          throw retryError; // Max retries reached or other error
        }
      }

      try {

        console.log('📥 Tax Invoice API Response:', {
          status: saveResponse.status,
          statusText: saveResponse.statusText,
          ok: saveResponse.ok
        });

        // 🚨 MANDATORY: ตรวจสอบ response ก่อนทำอะไรต่อ - ไม่มี fallback
        if (saveResponse.ok) {
          const savedTaxInvoice = await saveResponse.json();
          console.log('✅ MANDATORY: Tax Invoice saved to TAX_INVOICE table successfully:', savedTaxInvoice);

          // ✅ VERIFY: ตรวจสอบว่าได้ ID จริงๆ
          const savedTaxInvoiceId = savedTaxInvoice.data?._id || savedTaxInvoice._id || savedTaxInvoice.id;
          if (!savedTaxInvoiceId) {
            throw new Error('❌ MANDATORY ERROR: No tax invoice ID returned from database');
          }

          console.log('🆔 MANDATORY: Tax Invoice ID confirmed:', savedTaxInvoiceId);

          // อัพเดท ID จากฐานข้อมูล
          if (this.contractData) {
            this.contractData.taxInvoiceNumber = taxInvoiceNumber;
            this.contractData.taxInvoiceRef = taxInvoiceNumber;
            this.contractData.data = this.contractData.data || {};
            this.contractData.data.tax_invoice_no = taxInvoiceNumber;
            this.contractData.data.tax_invoice_id = savedTaxInvoiceId;
          }

          sessionStorage.setItem('currentTaxInvoiceNumber', taxInvoiceNumber);
          sessionStorage.setItem('savedTaxInvoiceId', savedTaxInvoiceId);

          console.log('✅ MANDATORY: Tax Invoice database integration successful:', {
            number: taxInvoiceNumber,
            databaseId: savedTaxInvoiceId,
            table: 'TAX_INVOICE'
          });
        } else {
          // 🚨 MANDATORY ERROR: API call failed - หยุดการทำงานทั้งหมด
          const errorData = await saveResponse.text();
          console.error('❌ MANDATORY ERROR: Tax Invoice save failed:', {
            status: saveResponse.status,
            statusText: saveResponse.statusText,
            response: errorData
          });

          throw new Error(`❌ MANDATORY ERROR: Tax Invoice database save failed: ${saveResponse.status} ${saveResponse.statusText} - ${errorData}`);
        }
      } catch (error) {
        console.error('❌ MANDATORY ERROR: Tax Invoice database save error:', error);

        // 🚨 MANDATORY: หยุดการทำงานทั้งหมดหากบันทึกฐานข้อมูลไม่สำเร็จ
        if (error.name === 'AbortError') {
          console.error('❌ MANDATORY ERROR: Tax Invoice API timeout - Database save failed after 30 seconds');
          throw new Error('❌ MANDATORY ERROR: ระบบหมดเวลาในการบันทึกใบกำกับภาษี (30 วินาที) กรุณาลองใหม่อีกครั้ง');
        }

        // ส่ง error ต่อไปให้ caller จัดการ
        throw error;
      }
      console.log('� MANDATORY: Database saved successfully, proceeding to PDF generation...');

      // 🔧 ส่งข้อมูลไปยัง updated API endpoint สำหรับ Tax Invoice
      const allStepData = window.globalInstallmentManager.getAllStepData();

      // Prepare complete data for Tax Invoice PDF generation
      const pdfRequestData = {
        // Document information
        documentNumber: taxInvoiceNumber,
        documentType: 'TAX_INVOICE',
        invoiceType: 'FULL_TAX',
        taxInvoiceNumber: taxInvoiceNumber,

        // Customer information
        customer: taxInvoiceData.customer,

        // Items
        items: taxInvoiceData.items,

        // Financial details
        downPaymentAmount: taxInvoiceData.downPaymentAmount,
        paymentMethod: taxInvoiceData.paymentMethod,

        // Summary with VAT
        summary: taxInvoiceData.summary,
        calculation: taxInvoiceData.calculation,

        // Company and branch
        company: taxInvoiceData.company,
        branch: taxInvoiceData.branch,
        branchCode: taxInvoiceData.branchCode,

        // Staff
        employeeName: taxInvoiceData.employeeName,
        salesperson: taxInvoiceData.salesperson,

        // Signatures
        customerSignatureUrl: taxInvoiceData.signatures?.customer || '',
        salespersonSignatureUrl: taxInvoiceData.signatures?.salesperson || '',
        authorizedSignatureUrl: taxInvoiceData.signatures?.authorized || '',

        // Dates
        saleDate: taxInvoiceData.issueDate,
        issueDate: taxInvoiceData.issueDate,

        // Additional info
        contractNo: taxInvoiceData.contractNo,
        notes: taxInvoiceData.notes,

        // Step data for fallback
        stepData: allStepData
      };

      const pdfResponse = await fetch('/api/pdf/installment/tax-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify(pdfRequestData)
      });

      if (!pdfResponse.ok) {
        throw new Error(`Tax Invoice PDF API error: ${pdfResponse.status}`);
      }

      // 🔧 Handle PDF blob response instead of JSON
      const pdfBlob = await pdfResponse.blob();
      console.log('✅ Tax Invoice PDF generated:', {
        size: pdfBlob.size,
        type: pdfBlob.type
      });

      // Create blob URL for the PDF
      const pdfUrl = window.URL.createObjectURL(pdfBlob);
      console.log('✅ Tax Invoice PDF URL created:', pdfUrl);
      return pdfUrl;
    } catch (error) {
      console.error('❌ Error in tax invoice generation:', error);

      // 🚨 MANDATORY: หยุดการทำงานหากเป็น MANDATORY ERROR
      if (error.message.includes('MANDATORY ERROR')) {
        console.error('🚨 MANDATORY ERROR detected - stopping all operations');
        throw error; // ส่ง error ต่อไปให้ caller จัดการ
      }

      if (error.name === 'AbortError') {
        console.error('❌ Tax Invoice API timeout');
        throw new Error('❌ ระบบหมดเวลาในการสร้างใบกำกับภาษี กรุณาลองใหม่');
      }

      // สำหรับ error อื่นๆ ที่ไม่ใช่ MANDATORY
      console.error('❌ Non-mandatory error in tax invoice generation:', error);
      throw new Error(`❌ การสร้างใบกำกับภาษีล้มเหลว: ${error.message}`);
    }
  }

  async generateDeliveryDocument(documentData) {
    console.log('📄 Generating delivery note PDF');
    console.log('🔧 Delivery Note Generation - Start Time:', new Date().toISOString());

    try {
      // ตรวจสอบข้อมูลพื้นฐาน
      if (!documentData?.customerData) {
        throw new Error('❌ ERROR: ข้อมูลลูกค้าไม่ครบถ้วน - ไม่สามารถสร้างใบส่งของได้');
      }

      if (!documentData?.itemsData || documentData.itemsData.length === 0) {
        throw new Error('❌ ERROR: ไม่มีรายการสินค้า - ไม่สามารถสร้างใบส่งของได้');
      }

      // เตรียมข้อมูลใบส่งของ
      const deliveryData = {
        customer: {
          name: `${documentData.customerData.prefix || ''} ${documentData.customerData.first_name || ''} ${documentData.customerData.last_name || ''}`.trim(),
          address: documentData.customerData.address || '',
          phone: documentData.customerData.phone_number || '',
          taxId: documentData.customerData.tax_id || ''
        },
        items: documentData.itemsData.map(item => ({
          id: item.id,
          name: item.name,
          brand: item.brand,
          imei: item.imei,
          quantity: item.quantity || 1,
          description: item.description
        })),
        deliveryInfo: {
          address: documentData.customerData.address || '',
          deliveryDate: new Date().toISOString(),
          specialInstructions: 'กรุณาตรวจสอบสินค้าให้ครบถ้วนก่อนรับของ'
        },
        employee: {
          name: await this.getLoggedInEmployeeName(),
          signature: window.globalInstallmentManager?.getSalespersonSignature() || ''
        }
      };

      console.log('📋 Delivery Note data prepared:', JSON.stringify(deliveryData, null, 2));

      // เรียก API สร้างใบส่งของ
      const response = await fetch('/api/delivery-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(deliveryData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.success && result.data?._id) {
        const deliveryNoteUrl = `/api/delivery-notes/${result.data._id}/print`;
        console.log('✅ Delivery Note created successfully:', deliveryNoteUrl);
        return deliveryNoteUrl;
      } else {
        throw new Error(result.error || 'เกิดข้อผิดพลาดในการสร้างใบส่งของ');
      }

    } catch (error) {
      console.error('❌ Delivery Note generation failed:', error);
      throw new Error(`❌ การสร้างใบส่งของล้มเหลว: ${error.message}`);
    }
  }

  // ========== TAX INVOICE FALLBACK STORAGE ==========

  handleTaxInvoiceFallbackStorage(taxInvoiceNumber) {
    console.log('🔄 Using fallback storage for Tax Invoice...');

    if (this.contractData) {
      this.contractData.taxInvoiceNumber = taxInvoiceNumber;
      this.contractData.taxInvoiceRef = taxInvoiceNumber;
      this.contractData.data = this.contractData.data || {};
      this.contractData.data.tax_invoice_no = taxInvoiceNumber;
    }

    sessionStorage.setItem('currentTaxInvoiceNumber', taxInvoiceNumber);
    sessionStorage.setItem('savedTaxInvoiceId', 'local_' + Date.now());

    console.log('📋 Tax Invoice fallback storage completed:', {
      number: taxInvoiceNumber,
      localId: sessionStorage.getItem('savedTaxInvoiceId')
    });
  }

  // ========== AUTOMATIC EMAIL SENDING ==========

  async sendEmailInBackground() {
    // Background email processing - ไม่ให้ user รอ
    console.log('📧 Starting background email process...');

    try {
      // ใช้ sendEmailAutomatically แต่ไม่ block UI
      await this.sendEmailAutomatically();
      console.log('📧 Background email completed successfully');
      return { success: true };
    } catch (error) {
      console.error('📧 Background email failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendEmailAutomatically() {
    try {
      const step2Data = window.globalInstallmentManager.getStepData(2);
      const customerEmail = step2Data?.customer?.email;

      if (!customerEmail || !this.isValidEmail(customerEmail)) {
        console.log('📧 No valid email provided, skipping automatic email');
        return;
      }

      console.log('📧 Sending automatic email to:', customerEmail);

      // Pre-check: ตรวจสอบว่ามีเอกสารพร้อมส่งหรือไม่
      if (!this.documentUrls.quotation && !this.documentUrls.invoice) {
        console.log('⚠️ No documents available for email, skipping');
        return;
      }

      // ตรวจสอบและสร้างรายการเอกสารที่จะส่ง

      // สร้าง documents array สำหรับ enhanced API ตาม VAT status
      const documentsToSend = [];
      const hasVatItems = this.checkHasVatItems();

      if (this.documentUrls.quotation) documentsToSend.push('quotation');
      if (this.documentUrls.invoice) documentsToSend.push('invoice');

      // 🔧 แก้ไข: ส่งทั้งใบเสร็จและใบกำกับภาษีเสมอ (เหมือนขายสด)
      if (this.documentUrls.receipt) {
        documentsToSend.push('receipt');
        console.log('📧 Including Receipt');
      }
      if (this.documentUrls.taxInvoice) {
        documentsToSend.push('taxInvoice');
        console.log('📧 Including Tax Invoice');
      }

      console.log('📧 Available document URLs:', this.documentUrls);
      console.log('📧 Documents to send via email:', documentsToSend);
      console.log('📧 VAT status:', { hasVatItems, documentTypes: documentsToSend });

      if (documentsToSend.length === 0) {
        console.warn('⚠️ No documents available for email');
        this.showToast('ไม่มีเอกสารให้ส่งทางอีเมล', 'warning');
        return;
      }

      const emailData = {
        recipient: customerEmail,
        customerInfo: {
          name: `${step2Data.customer.firstName || ''} ${step2Data.customer.lastName || ''}`.trim() || 'ลูกค้า'
        },
        documents: documentsToSend,
        installmentData: {
          contractNo: this.contractData?.data?.contract_number || this.contractData?.data?.contractNo || 'N/A',
          quotationId: sessionStorage.getItem('savedQuotationId'),
          invoiceId: sessionStorage.getItem('savedInvoiceId'),
          receiptVoucherId: sessionStorage.getItem('savedReceiptId'),
          orderId: this.contractData?.data?._id || this.contractData?._id,
          customerInfo: step2Data.customer,
          totalAmount: this.contractData?.data?.totalAmount || 0,
          downPayment: this.contractData?.data?.downPayment || 0
        },
        pdfEndpoints: {
          quotation: this.documentUrls.quotation,
          invoice: this.documentUrls.invoice,
          receipt: this.documentUrls.receipt,
          taxInvoice: this.documentUrls.taxInvoice
        },
        branchCode: window.BRANCH_CODE || '00000',
        customMessage: `เลขที่สัญญา: ${this.contractData?.data?.contract_number || this.contractData?.data?.contractNo || 'N/A'}\nวันที่ทำสัญญา: ${new Date().toLocaleDateString('th-TH')}`
      };

      console.log('📧 Enhanced email data:', emailData);

      // ส่ง email ผ่าน Enhanced API โดยไม่ใช้ timeout (ให้เซิร์ฟเวอร์จัดการ timeout เอง)
      console.log('📧 Starting email request to enhanced API...');
      console.log('📧 Email will include:', {
        documents: emailData.documents,
        pdfEndpoints: emailData.pdfEndpoints,
        recipient: emailData.recipient
      });

      const emailStartTime = Date.now();
      console.log(`⏰ Email process started at: ${new Date(emailStartTime).toLocaleTimeString()}`);

      // ไม่ใช้ AbortController เพื่อหลีกเลี่ยง timeout issues
      const response = await fetch('/api/enhanced-email/send-installment-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || 'no-token'}`
        },
        body: JSON.stringify(emailData)
        // ไม่ส่ง signal parameter
      });
      const emailDuration = Date.now() - emailStartTime;
      const emailEndTime = Date.now();
      console.log(`📧 Email request completed in ${emailDuration}ms`);
      console.log(`⏰ Email process ended at: ${new Date(emailEndTime).toLocaleTimeString()}`);
      console.log(`🎯 Email processing details: ${(emailDuration/1000).toFixed(1)}s total (PDF generation + database + email sending)`);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = await response.text();
        }
        console.error('❌ Enhanced email API error details:', errorData);

        let errorMessage;
        if (typeof errorData === 'object' && errorData !== null) {
          errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
        } else {
          errorMessage = errorData || `HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Email sent successfully:', result);

      // แสดง notification
      this.showToast('ส่งเอกสารทาง Email เรียบร้อยแล้ว', 'success');

    } catch (error) {
      console.error('❌ Error sending automatic email:', error);

      let errorMessage = error.message;
      let errorType = 'warning';

      if (error.name === 'AbortError') {
        errorMessage = 'การส่งอีเมลถูกยกเลิก - Enhanced Email Service อาจใช้เวลานานเกินไป';
        errorType = 'info'; // เปลี่ยนเป็น info เพราะไม่ใช่ error ร้ายแรง
        console.log('⏰ Email process was aborted. This usually happens when the Enhanced Email Service takes too long to process PDFs or send emails.');
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'ไม่สามารถเชื่อมต่อ Email Server ได้';
        errorType = 'error';
      } else if (error.message.includes('404')) {
        errorMessage = 'ไม่พบ Email API endpoint';
        errorType = 'error';
      } else if (error.message.includes('500')) {
        errorMessage = 'Email Server มีปัญหาภายใน';
      }

      console.log('📧 Email error details:', {
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack?.split('\n')[0]
      });

      // ไม่ให้ email error หยุดกระบวนการหลัก
      this.showToast('การส่ง Email อัตโนมัติล้มเหลว: ' + errorMessage, errorType);
      console.log('📧 Email failure will not stop the contract creation process.');
    }
  }

  checkTaxInvoiceAvailability(step1Data) {
    // 🔧 Enhanced VAT Detection: รองรับทั้ง taxType และ has_vat (เหมือน checkHasVatItems)
    const hasVatItemsByTaxType = step1Data.cartItems && step1Data.cartItems.some(item =>
      item.taxType && item.taxType !== 'ไม่มี VAT' && item.taxType !== 'ไม่มีภาษี'
    );

    const hasVatItemsByFlag = step1Data.cartItems && step1Data.cartItems.some(item =>
      item.has_vat === true || (item.vat_rate && item.vat_rate > 0)
    );

    // ใช้ OR logic: มี VAT ถ้าตรวจพบจากวิธีใดวิธีหนึ่ง
    const hasVatItems = hasVatItemsByTaxType || hasVatItemsByFlag;

    // 🔍 DEBUG: แสดงผลการตรวจสอบ VAT items แบบละเอียด
    console.log('🔍 Enhanced Tax Invoice Availability Check:', {
      hasCartItems: !!(step1Data.cartItems),
      cartItemsCount: step1Data.cartItems?.length || 0,
      cartItems: step1Data.cartItems?.map(item => ({
        name: item.name,
        taxType: item.taxType,
        has_vat: item.has_vat,
        vat_rate: item.vat_rate,
        hasVATByTaxType: item.taxType && item.taxType !== 'ไม่มี VAT' && item.taxType !== 'ไม่มีภาษี',
        hasVATByFlag: item.has_vat === true || (item.vat_rate && item.vat_rate > 0)
      })),
      hasVatItemsByTaxType,
      hasVatItemsByFlag,
      hasVatItems,
      shouldShowTaxInvoice: hasVatItems,
      detectionMethod: hasVatItemsByTaxType ? 'taxType' : hasVatItemsByFlag ? 'has_vat/vat_rate' : 'none'
    });

    // แสดง Tax Invoice Row เสมอ (ไม่ว่าจะมี VAT หรือไม่)
    const taxInvoiceRow = document.getElementById('taxInvoiceRow');
    if (taxInvoiceRow) {
      taxInvoiceRow.style.display = 'flex';
      console.log('✅ Tax invoice row shown (always visible)');
    }

    // แสดง/ซ่อน Tax Invoice Download Button
    const taxInvoiceBtn = document.getElementById('btnDownloadTaxInvoice');
    if (taxInvoiceBtn) {
      if (hasVatItems) {
        taxInvoiceBtn.style.display = 'block';
        console.log('✅ Tax invoice download button enabled - VAT items found');
      } else {
        taxInvoiceBtn.style.display = 'none';
        console.log('❌ Tax invoice download button hidden - No VAT items');
      }
    }

    // แสดง/ซ่อน Print Tax Invoice Button
    const printTaxBtn = document.getElementById('btnPrintDownPaymentTaxInvoice');
    if (printTaxBtn) {
      if (hasVatItems) {
        printTaxBtn.style.display = 'block';
        console.log('✅ Print tax invoice button enabled - VAT items found');
      } else {
        printTaxBtn.style.display = 'none';
        console.log('❌ Print tax invoice button hidden - No VAT items');
      }
    }
  }

  // ========== EVENT LISTENERS ==========

  setupEventListeners() {
    // Create Contract button
    const createContractBtn = document.getElementById('btnCreateContract');
    if (createContractBtn) {
      createContractBtn.addEventListener('click', () => this.createContract());
    }

    // Document download buttons
    document.getElementById('btnDownloadQuotation')?.addEventListener('click', () => this.downloadDocument('quotation'));
    document.getElementById('btnDownloadInvoice')?.addEventListener('click', () => this.downloadDocument('invoice'));

    // 🆕 ปุ่มรวม ใบเสร็จรับเงิน/ใบกำกับภาษี (อัตโนมัติ)
    // ปุ่มรวมถูกลบแล้ว - ใช้ปุ่มแยกแทน

    // 🆕 ปุ่มแยกสำหรับเลือกประเภทเอกสาร
    document.getElementById('btnDownloadReceiptOnly')?.addEventListener('click', () => this.downloadReceiptOnly());
    document.getElementById('btnDownloadTaxInvoiceOnly')?.addEventListener('click', () => this.downloadTaxInvoiceOnly());

    // Down payment receipt printing buttons
    document.getElementById('btnPrintDownPaymentReceipt')?.addEventListener('click', () => this.printDownPaymentReceipt());
    document.getElementById('btnPrintDownPaymentTaxInvoice')?.addEventListener('click', () => this.printDownPaymentTaxInvoice());

    // Email sending
    document.getElementById('btnSendEmail')?.addEventListener('click', () => this.sendDocumentsEmail());

    // Navigation buttons
    document.getElementById('btnStartOver')?.addEventListener('click', () => this.startOver());
    document.getElementById('btnGoToHistory')?.addEventListener('click', () => this.goToHistory());

    // Success modal buttons
    document.getElementById('btnPrintDocuments')?.addEventListener('click', () => this.printDocuments());
    document.getElementById('btnNewContract')?.addEventListener('click', () => this.startOver());
    document.getElementById('btnCloseSuccessModal')?.addEventListener('click', () => this.closeSuccessModal());
  }

  // ========== HELPER METHODS ==========

  getCurrentProcessingStep() {
    // Find which step is currently in 'processing' state
    const steps = ['step-stock', 'step-validate', 'step-contract', 'step-documents', 'step-email'];
    for (let step of steps) {
      const element = document.querySelector(`[data-step="${step}"]`);
      if (element && element.classList.contains('processing')) {
        return step;
      }
    }
    return 'unknown';
  }

  // ========== CONTRACT CREATION ==========

  async createContract() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    // ⏰ Maximum timeout protection สำหรับ entire process (6 minutes รวม email)
    const processStartTime = Date.now();
    console.log(`⏰ Process started at: ${new Date(processStartTime).toLocaleTimeString()} - Max timeout: 6 minutes`);

    const maxTimeoutId = setTimeout(() => {
      const elapsed = (Date.now() - processStartTime) / 1000;
      console.error(`❌ Maximum timeout reached after ${elapsed.toFixed(1)}s - forcing process completion`);
      this.isProcessing = false;
      this.hideLoadingOverlay();
      this.showToast('การสร้างสัญญาใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง', 'error');
    }, 360000); // 6 minutes (3 minutes สำหรับ contract + 3 minutes สำหรับ email)

    this.showLoadingOverlay('กำลังสร้างสัญญาผ่อนชำระ...', 0);

    try {
      // 🔍 CRITICAL: Validate globalInstallmentManager exists before proceeding
      if (!window.globalInstallmentManager) {
        throw new Error('ระบบจัดการข้อมูลไม่พร้อม กรุณาโหลดหน้าใหม่');
      }

      console.log('✅ Global Installment Manager is available');
      // Step 1: ตรวจสอบสต๊อกก่อน (ต้องทำก่อนทุกอย่าง)
      this.updateProcessStep('step-stock', 'processing');
      this.setLoadingProgress(5, 'กำลังตรวจสอบสต๊อกสินค้า...');
      console.log('📦 Checking stock availability BEFORE creating contract...');

      // ตรวจสอบสต๊อกก่อนดำเนินการใดๆ
      let stockCheckResult;
      try {
        stockCheckResult = await this.checkStockAvailability();
        console.log('✅ Stock check completed:', stockCheckResult);
      } catch (stockError) {
        console.error('❌ Stock check failed with error:', stockError);
        this.updateProcessStep('step-stock', 'error');
        throw new Error(`ไม่สามารถตรวจสอบสต๊อกได้: ${stockError.message}`);
      }

      if (!stockCheckResult || !stockCheckResult.success) {
        this.updateProcessStep('step-stock', 'error');
        const errorMsg = stockCheckResult?.message || 'สต๊อกไม่เพียงพอ';
        throw new Error(`ไม่สามารถดำเนินการต่อได้: ${errorMsg}`);
      }

      this.updateProcessStep('step-stock', 'completed');
      this.setLoadingProgress(10, 'สต๊อกพร้อมแล้ว');

      // Step 2: Validate data (หลังจากตรวจสอบสต๊อกแล้ว)
      this.updateProcessStep('step-validate', 'processing');
      this.setLoadingProgress(15, 'ตรวจสอบข้อมูล...');
      await this.sleep(500);

      // Validate each step with detailed error reporting
      const validationResults = [];
      for (let step = 1; step <= 3; step++) {
        try {
          const isValid = window.globalInstallmentManager.validateStep(step);
          validationResults.push({ step, valid: isValid });

          if (!isValid) {
            const errors = window.globalInstallmentManager.getValidationErrors ?
              window.globalInstallmentManager.getValidationErrors(step) : ['ข้อมูลไม่ครบถ้วน'];
            console.error(`❌ Step ${step} validation failed:`, errors);
            throw new Error(`ข้อมูลขั้นตอนที่ ${step} ไม่ครบถ้วน: ${errors.join(', ')}`);
          }
        } catch (validationError) {
          console.error(`❌ Error validating step ${step}:`, validationError);
          throw new Error(`ไม่สามารถตรวจสอบข้อมูลขั้นตอนที่ ${step} ได้: ${validationError.message}`);
        }
      }

      console.log('✅ All validation checks passed:', validationResults);

      this.updateProcessStep('step-validate', 'completed');
      this.setLoadingProgress(20, 'ข้อมูลถูกต้อง');

      // Step 3: Create contract via API
      this.updateProcessStep('step-contract', 'processing');
      this.setLoadingProgress(30, 'กำลังสร้างสัญญา...');

      console.log('📤 Calling submitInstallment API...');
      let contractResult;

      try {
        contractResult = await window.globalInstallmentManager.submitInstallment();
        console.log('✅ submitInstallment completed successfully');
      } catch (submitError) {
        console.error('❌ submitInstallment failed:', submitError);

        // Enhanced error handling for API submission
        let errorMessage = 'ไม่สามารถสร้างสัญญาได้';

        if (submitError.message) {
          if (submitError.message.includes('การตรวจสอบข้อมูลไม่ผ่าน')) {
            errorMessage = 'ข้อมูลไม่ถูกต้อง: ' + submitError.message;
          } else if (submitError.message.includes('ปัญหาเกี่ยวกับสต๊อกสินค้า')) {
            errorMessage = submitError.message;
          } else if (submitError.statusCode && submitError.statusCode >= 400) {
            errorMessage = `เซิร์ฟเวอร์ตอบสนองผิดพลาด (${submitError.statusCode}): ${submitError.message}`;
          } else {
            errorMessage = 'เกิดข้อผิดพลาดในการสร้างสัญญา: ' + submitError.message;
          }
        }

        throw new Error(errorMessage);
      }

      console.log('🔍 Raw API response from submitInstallment:', {
        contractResult: contractResult,
        type: typeof contractResult,
        keys: contractResult ? Object.keys(contractResult) : 'null/undefined',
        hasData: !!(contractResult && contractResult.data),
        hasSuccess: !!(contractResult && contractResult.success)
      });

      // 🔍 Validate contractResult structure
      if (!contractResult) {
        throw new Error('ไม่ได้รับผลลัพธ์จากเซิร์ฟเวอร์');
      }

      if (contractResult.success === false) {
        const errorMsg = contractResult.message || contractResult.error || 'ไม่ทราบสาเหตุ';
        throw new Error(`เซิร์ฟเวอร์ปฏิเสธการสร้างสัญญา: ${errorMsg}`);
      }

      // 🚨 CRITICAL FIX: ทันทีหลังจากสร้างสัญญาเสร็จ ต้องแก้ไขข้อมูลในฐานข้อมูล
      if (contractResult) {
        console.log('🔧 FIXING CONTRACT DATA IMMEDIATELY after creation...');
        console.log('📋 Full contractResult structure:', JSON.stringify(contractResult, null, 2));

        try {
          // ดึงข้อมูลเพื่อคำนวณ
          const step1Data = window.globalInstallmentManager.getStepData(1) || {};
          const step3Data = window.globalInstallmentManager.getStepData(3) || {};

          // คำนวณยอดรวม
          const cartItems = step1Data.cartItems || [];
          const itemsTotal = cartItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
          const docFee = step3Data.docFee || 500;
          const totalAmount = itemsTotal + docFee;

          // คำนวณยอดคงเหลือ
          const downPayment = step3Data.down_payment || 0;
          const remainingAmount = totalAmount - downPayment;

          // คำนวณวันชำระงวดถัดไป
          const installmentPeriod = step3Data.installment_count || 12;
          const installmentAmount = step3Data.installment_amount || 0;
          const startDate = new Date();

          const nextPaymentDate = new Date(startDate);
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + installmentPeriod);

          // ค้นหา contract ID จากหลายแหล่ง
          let contractId = null;

          // Method 1: contractResult.installmentOrder._id
          if (contractResult.installmentOrder && contractResult.installmentOrder._id) {
            contractId = contractResult.installmentOrder._id;
            console.log('✅ Found contract ID via installmentOrder._id:', contractId);
          }
          // Method 2: contractResult.installmentOrder.id
          else if (contractResult.installmentOrder && contractResult.installmentOrder.id) {
            contractId = contractResult.installmentOrder.id;
            console.log('✅ Found contract ID via installmentOrder.id:', contractId);
          }
          // Method 3: contractResult._id
          else if (contractResult._id) {
            contractId = contractResult._id;
            console.log('✅ Found contract ID via contractResult._id:', contractId);
          }
          // Method 4: contractResult.id
          else if (contractResult.id) {
            contractId = contractResult.id;
            console.log('✅ Found contract ID via contractResult.id:', contractId);
          }
          // Method 5: contractResult.contractNumber (use as fallback)
          else if (contractResult.contractNumber) {
            console.log('⚠️ No direct ID found, trying to use contractNumber as reference:', contractResult.contractNumber);
            // Try to find by contract number - this might work with some APIs
            contractId = contractResult.contractNumber;
          }

          console.log('🔍 Contract ID Detection Summary:', {
            found: !!contractId,
            contractId: contractId,
            installmentOrderKeys: contractResult.installmentOrder ? Object.keys(contractResult.installmentOrder) : 'not found',
            contractResultKeys: Object.keys(contractResult)
          });

          if (contractId) {
            console.log('🔧 FIXING CONTRACT DATA with calculated values:', {
              contractId: contractId,
              totalAmount: totalAmount,
              dueDate: dueDate.toISOString(),
              monthlyPayment: installmentAmount,
              installmentPeriod: installmentPeriod,
              status: 'active'
            });

            // Try multiple API endpoints (แก้ไข endpoint แรกให้ถูกต้อง)
            const updateEndpoints = [
              `/api/installment-orders/${contractId}`,  // แก้ไขเป็น installment-orders (มี s)
              `/api/installment/${contractId}`,
              `/api/loan/contracts/${contractId}`,
              `/api/contracts/${contractId}/update`
            ];

            let updateSuccess = false;

            for (let i = 0; i < updateEndpoints.length && !updateSuccess; i++) {
              const endpoint = updateEndpoints[i];
              console.log(`🔄 Trying endpoint ${i + 1}/${updateEndpoints.length}: ${endpoint}`);

              try {
                const updateResponse = await fetch(endpoint, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                  },
                  body: JSON.stringify({
                    totalAmount: totalAmount,
                    dueDate: dueDate.toISOString(),
                    monthlyPayment: installmentAmount,
                    installmentPeriod: installmentPeriod,
                    status: 'active'
                  })
                });

                if (updateResponse.ok) {
                  const updateResult = await updateResponse.json();
                  console.log(`✅ CONTRACT DATA FIXED successfully via endpoint ${i + 1}:`, updateResult);
                  updateSuccess = true;
                  break;
                } else {
                  console.warn(`⚠️ Endpoint ${i + 1} failed:`, updateResponse.status, updateResponse.statusText);
                  if (i === updateEndpoints.length - 1) {
                    const errorText = await updateResponse.text();
                    console.error(`❌ All endpoints failed. Last error:`, updateResponse.status, updateResponse.statusText, errorText);
                  }
                }
              } catch (fetchError) {
                console.warn(`⚠️ Endpoint ${i + 1} network error:`, fetchError.message);
                if (i === updateEndpoints.length - 1) {
                  console.error(`❌ All endpoints failed with network errors. Last error:`, fetchError);
                }
              }
            }

            if (!updateSuccess) {
              console.error('❌ Failed to update contract data via any endpoint');
              console.log('📋 Available endpoints tried:', updateEndpoints);
            }
          } else {
            console.error('❌ No contract ID found for fixing data in any expected location');
            console.log('📋 Available data for debugging:', {
              contractResult: contractResult,
              installmentOrder: contractResult.installmentOrder
            });
          }

        } catch (fixError) {
          console.error('❌ Error fixing contract data:', fixError);
        }
      }

      // 🔧 FIX ROOT CAUSE: คำนวณและเพิ่มข้อมูลที่ขาดหายลงในสัญญา
      if (contractResult && contractResult.data) {
        const step1Data = window.globalInstallmentManager.getStepData(1);
        const step3Data = window.globalInstallmentManager.getStepData(3);
        const contractData = contractResult.data;

        // 🔧 คำนวณ totalAmount ใหม่จากข้อมูลจริง (ไม่ใช้จาก API เพราะเป็น 0)
        const downPayment = parseFloat(step3Data?.down_payment || 0);
        const installmentPeriod = parseInt(step3Data?.installment_count || 0);
        const installmentAmount = parseFloat(step3Data?.installment_amount || 0);

        // 🔧 FIXED: คำนวณ totalAmount จากราคาสินค้า + ค่าธรรมเนียม
        let totalAmount = 0;
        if (step1Data && step1Data.cartItems && step1Data.cartItems.length > 0) {
          // คำนวณจากราคาสินค้า
          const itemsTotal = step1Data.cartItems.reduce((sum, item) => {
            return sum + (parseFloat(item.price || item.salePrice || 0) * parseInt(item.quantity || 1));
          }, 0);

          // เพิ่มค่าธรรมเนียมเอกสาร
          const docFee = parseFloat(step3Data?.doc_fee || 500);
          totalAmount = itemsTotal + docFee;

          console.log('🔧 Total Amount Calculation:', {
            itemsTotal: itemsTotal,
            docFee: docFee,
            calculatedTotal: totalAmount,
            step1Items: step1Data.cartItems.length
          });
        } else {
          // Fallback: ใช้การคำนวณจาก down + ยอดผ่อน
          totalAmount = downPayment + (installmentAmount * installmentPeriod);
          console.log('⚠️ Using fallback calculation for totalAmount:', totalAmount);
        }

        // คำนวณเงินที่เหลือจ่าย (totalAmount - downPayment)
        const remainingAmount = Math.max(0, totalAmount - downPayment);

        // คำนวณวันที่ชำระงวดถัดไป (เดือนถัดไปจากวันนี้)
        const startDate = new Date();
        const nextPaymentDate = new Date(startDate);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

        // คำนวณวันครบกำหนดชำระ (เดือนถัดไปจากวันนี้)
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + 1);

        console.log('🔧 FIXING CONTRACT DATA - Adding missing critical fields:', {
          originalTotalAmount: contractData.totalAmount,
          calculatedTotalAmount: totalAmount,
          downPayment: downPayment,
          calculatedRemainingAmount: remainingAmount,
          nextPaymentDate: nextPaymentDate.toISOString(),
          dueDate: dueDate.toISOString(),
          installmentPeriod: installmentPeriod,
          monthlyPayment: installmentAmount
        });

        // 🚨 CRITICAL FIX: อัปเดตข้อมูลในฐานข้อมูลทันที
        try {
          // ตรวจสอบ contract ID จากหลายแหล่ง
          const contractId = contractData._id || contractData.id || contractData.contractId || contractData.installmentOrder?._id;
          console.log('🔍 Contract ID Detection:', {
            contractData_id: contractData._id,
            contractData_id_type: typeof contractData._id,
            contractData_contractId: contractData.contractId,
            contractData_installmentOrder: contractData.installmentOrder?._id,
            finalContractId: contractId,
            contractDataKeys: Object.keys(contractData)
          });

          if (!contractId) {
            console.error('❌ No contract ID found for database update:', contractData);
            throw new Error('ไม่พบ Contract ID สำหรับการอัปเดตข้อมูล');
          }

          const updateResponse = await fetch(`/api/installment-order/${contractId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
              totalAmount: totalAmount, // เพิ่ม totalAmount ที่คำนวณใหม่
              remainingAmount: remainingAmount,
              nextPaymentDate: nextPaymentDate.toISOString(),
              dueDate: dueDate.toISOString(),
              monthlyPayment: installmentAmount,
              installmentPeriod: installmentPeriod,
              financeAmount: remainingAmount, // เงินที่ต้องผ่อน
              startDate: startDate.toISOString(),
              status: 'active' // เปลี่ยนสถานะเป็นกำลังดำเนินการ
            })
          });

          if (updateResponse.ok) {
            const updatedContract = await updateResponse.json();
            console.log('✅ CONTRACT DATA FIXED - Database updated successfully:', {
              contractId: contractData._id,
              remainingAmount: remainingAmount,
              nextPaymentDate: nextPaymentDate.toISOString(),
              dueDate: dueDate.toISOString(),
              status: 'active'
            });

            // อัปเดตข้อมูลใน contractResult
            contractResult.data = { ...contractData, ...updatedContract.data };
          } else {
            console.error('❌ Failed to update contract with missing fields:', updateResponse.status);
            // ต่อไปแม้ว่าจะอัปเดตไม่สำเร็จ แต่ยังสามารถสร้างสัญญาได้
          }
        } catch (updateError) {
          console.error('❌ Error updating contract data:', updateError);
          // ต่อไปแม้ว่าจะอัปเดตไม่สำเร็จ แต่ยังสามารถสร้างสัญญาได้
        }
      }

      // Store contract data for documents and email with safety checks
      try {
        if (contractResult && (contractResult.data || contractResult.installmentOrder)) {
          this.contractData = contractResult;
          console.log('💾 Contract data stored successfully');
        } else {
          console.warn('⚠️ Contract result exists but has unexpected structure:', contractResult);
          this.contractData = contractResult; // Store anyway, but log warning
        }
      } catch (storageError) {
        console.error('❌ Error storing contract data:', storageError);
        this.contractData = contractResult; // Try to store anyway
      }

      this.updateProcessStep('step-contract', 'completed');
      this.setLoadingProgress(50, 'สัญญาสำเร็จ');

      // Step 3: Generate documents
      this.updateProcessStep('step-documents', 'processing');
      this.setLoadingProgress(60, 'กำลังสร้างเอกสาร...');
      await this.generateDocuments();
      this.updateProcessStep('step-documents', 'completed');
      this.setLoadingProgress(70, 'เอกสารสำเร็จ');

      // Step 4: Update stock - เปิดใช้งานการตัดสต๊อก
      this.updateProcessStep('step-stock', 'processing');
      this.setLoadingProgress(80, 'กำลังตัดสต๊อกสินค้า...');
      console.log('📦 Starting stock update process...');
      await this.updateStock(); // ✅ เปิดใช้งานการตัดสต๊อกแล้ว
      this.updateProcessStep('step-stock', 'completed');
      this.setLoadingProgress(90, 'ตัดสต๊อกเรียบร้อย');

      // Step 5: Prepare receipt/tax invoice for email
      this.updateProcessStep('step-email', 'processing');
      this.setLoadingProgress(90, 'เตรียมเอกสารสำหรับส่งอีเมล...');
      console.log('📧 Preparing receipt/tax invoice for email...');

      // เตรียมใบเสร็จรับเงิน/ใบกำกับภาษีสำหรับ Gmail
      await this.prepareReceiptForEmail();

      this.setLoadingProgress(95, 'กำลังส่งอีเมลใน background...');
      console.log('📧 Starting background email sending...');

      // ส่ง email แบบ background ไม่ให้ user รอ
      this.sendEmailInBackground()
        .then(() => {
          console.log('📧 Background email sent successfully');
          this.updateProcessStep('step-email', 'completed');
          this.showToast('✅ อีเมลส่งสำเร็จแล้ว! (ครบทุกเอกสาร)', 'success');
          this.updateEmailStatus('success', 'อีเมลส่งสำเร็จ');
        })
        .catch((emailError) => {
          console.error('📧 Background email failed:', emailError);
          this.updateProcessStep('step-email', 'warning');
          this.showToast('⚠️ การส่งอีเมลล้มเหลว (เอกสารพร้อมดาวน์โหลด)', 'warning');
          this.updateEmailStatus('failed', 'อีเมลล้มเหลว');
        });

      // แสดง initial email status
      this.updateEmailStatus('sending', 'กำลังส่งอีเมลใน background...');

      // ไม่รอ email เสร็จ - ให้ contract เสร็จก่อน
      this.setLoadingProgress(98, 'อีเมลกำลังส่งใน background...');

      this.setLoadingProgress(100, 'เสร็จสิ้น!');

      await this.sleep(1000);
      this.hideLoadingOverlay();

      // Show success
      this.contractCreated = true;
      this.showSuccessModal();
      this.enableDocumentActions();

      console.log('✅ Contract created successfully:', this.contractData);

    } catch (error) {
      console.error('❌ Error creating contract:', error);

      // 🔍 Enhanced error logging for debugging
      console.error('❌ Detailed error information:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause,
        statusCode: error.statusCode,
        details: error.details,
        originalMessage: error.originalMessage,
        currentStep: this.getCurrentProcessingStep(),
        contractData: !!this.contractData,
        globalManagerAvailable: !!window.globalInstallmentManager,
        processStartTime: processStartTime,
        elapsedTime: ((Date.now() - processStartTime) / 1000).toFixed(2) + 's'
      });

      // Clear the timeout
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
      }

      this.hideLoadingOverlay();

      // Enhanced error categorization and user feedback
      let userMessage = 'เกิดข้อผิดพลาดในการสร้างสัญญา';
      let errorStep = 'step-contract';

      if (error.message.includes('ระบบจัดการข้อมูลไม่พร้อม')) {
        userMessage = 'ระบบไม่พร้อม กรุณาโหลดหน้าใหม่';
        errorStep = 'step-validate';
      } else if (error.message.includes('สต๊อก') || error.message.includes('stock')) {
        userMessage = 'การตัดสต๊อกล้มเหลว: ' + error.message;
        errorStep = 'step-stock';
      } else if (error.message.includes('ข้อมูลไม่ครบถ้วน')) {
        userMessage = 'ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบขั้นตอนก่อนหน้า';
        errorStep = 'step-validate';
      } else if (error.message.includes('เกิดข้อผิดพลาดในการสร้างสัญญาผ่อนชำระ')) {
        userMessage = 'เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์: ' + error.message;
        errorStep = 'step-contract';
      } else {
        userMessage = 'เกิดข้อผิดพลาด: ' + error.message;
        errorStep = 'step-contract';
      }

      // Mark failed step appropriately
      this.updateProcessStep(errorStep, 'error');
      this.updateStatusMessage(userMessage, 'error');
      this.showToast(userMessage, 'error');
    } finally {
      // ล้าง timeout protection
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
      }

      const totalElapsed = (Date.now() - processStartTime) / 1000;
      console.log(`⏰ Total process time: ${totalElapsed.toFixed(1)}s`);

      // Ensure processing state is always reset
      this.isProcessing = false;

      // Ensure loading overlay is hidden in case of any error
      try {
        this.hideLoadingOverlay();
      } catch (hideError) {
        console.warn('⚠️ Could not hide loading overlay:', hideError);
      }

      console.log('🏁 Contract creation process completed (success or failure)');
    }
  }

  // ========== STOCK UPDATE METHODS ==========

  /**
   * ตรวจสอบสต๊อก (ไม่ตัด แค่เช็คว่ามีพอไหม)
   */
  async checkStockAvailability() {
    try {
      // 🔍 Safety check: Ensure globalInstallmentManager exists
      if (!window.globalInstallmentManager || typeof window.globalInstallmentManager.getStepData !== 'function') {
        console.error('❌ globalInstallmentManager not available for stock check');
        return { success: false, message: 'ระบบจัดการข้อมูลไม่พร้อม' };
      }

      const step1Data = window.globalInstallmentManager.getStepData(1);

      if (!step1Data || !step1Data.cartItems || step1Data.cartItems.length === 0) {
        console.warn('⚠️ No items to check stock');
        return { success: true, message: 'No items to check' };
      }

      console.log('📦 Checking stock availability for:', step1Data.cartItems);

      // เตรียมข้อมูลสำหรับเช็คสต๊อก (checkOnly = true เพื่อไม่ให้ตัดสต๊อก)
      const stockCheckData = {
        branch_code: step1Data.branchCode || window.BRANCH_CODE || '00000',
        allowNegativeStock: false,
        continueOnError: false,
        checkOnly: true, // ⚠️ สำคัญ: บอก API ว่าแค่เช็คอย่างเดียว ไม่ตัดสต๊อก
        items: step1Data.cartItems.map(item => {
          // Map productId to product_id for backend compatibility
          const productId = item.productId || item.product_id || item.product || item.id;

          if (!productId) {
            console.error('❌ Missing product_id for item:', item);
            console.error('Available properties:', Object.keys(item));
          }

          return {
            product_id: productId,
            quantity: parseInt(item.quantity || 1),
            imei: item.imei || ''
          };
        })
      };

      console.log('📦 Stock check data:', stockCheckData);

      // เรียก API เช็คสต๊อก (ใช้ endpoint เดิมที่แก้ไขแล้ว)
      const response = await fetch('/api/stock/check-after-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(stockCheckData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stock check API error:', errorText);
        return {
          success: false,
          message: 'ไม่สามารถตรวจสอบสต๊อกได้'
        };
      }

      const result = await response.json();
      console.log('📦 Stock check result:', result);

      // ตรวจสอบว่ามีรายการที่สต๊อกไม่พอหรือไม่
      if (result.data && result.data.results) {
        const failedItems = result.data.results.filter(item => !item.success);

        if (failedItems.length > 0) {
          const errorDetails = failedItems.map(item =>
            `• ${item.product_id}: ${item.error}`
          ).join('\n');

          console.error('❌ Stock insufficient for:', failedItems);

          return {
            success: false,
            message: `สินค้าไม่เพียงพอ:\n${errorDetails}`,
            failedItems: failedItems
          };
        }
      }

      // ถ้า API return success: false
      if (!result.success) {
        return {
          success: false,
          message: result.message || 'สต๊อกไม่เพียงพอ'
        };
      }

      return {
        success: true,
        message: 'สต๊อกเพียงพอ',
        data: result.data
      };

    } catch (error) {
      console.error('❌ Error checking stock availability:', error);
      return {
        success: false,
        message: `เกิดข้อผิดพลาดในการตรวจสอบสต๊อก: ${error.message}`
      };
    }
  }

  async updateStock() {
    try {
      const step1Data = window.globalInstallmentManager.getStepData(1);

      if (!step1Data || !step1Data.cartItems || step1Data.cartItems.length === 0) {
        console.warn('⚠️ ไม่พบข้อมูลสินค้าที่ต้องตัดสต๊อก - ข้ามขั้นตอนนี้');
        return { success: true, skipped: true, message: 'ไม่มีรายการสินค้าที่ต้องตัดสต๊อก' };
      }

      console.log('📦 Starting stock update for items:', step1Data.cartItems);

      // เตรียมข้อมูลสำหรับตัดสต๊อก
      const stockUpdateData = {
        branch_code: step1Data.branchCode || window.BRANCH_CODE || '00000',
        checkOnly: false, // ⚠️ IMPORTANT: Set to false to actually deduct stock
        allowNegativeStock: false, // ไม่อนุญาตให้สต๊อกติดลบ
        continueOnError: false, // หยุดทันทีหากมีข้อผิดพลาด
        items: step1Data.cartItems.map(item => {
          // ใช้ product_id ที่แท้จริง ไม่ใช่ BranchStock._id
          // item.productId คือ Product._id ที่ถูกต้อง
          // item.id หรือ item._id คือ BranchStock._id (ไม่ควรใช้)
          const productId = item.productId || item.product_id || item.product || item.id;

          if (!productId) {
            console.error('❌ Missing product_id for item:', item);
            console.error('Available properties:', Object.keys(item));
          }

          console.log('📦 Item for stock update:', {
            originalItem: item,
            extractedProductId: productId,
            quantity: item.quantity,
            imei: item.imei
          });

          return {
            product_id: productId,
            quantity: parseInt(item.quantity || 1),
            imei: item.imei || ''
          };
        })
      };

      console.log('📦 Stock update data:', stockUpdateData);

      // เรียก API ตัดสต๊อก พร้อม timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

      const response = await fetch('/api/stock/check-after-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(stockUpdateData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        let errorMessage = `HTTP ${response.status}: การตัดสต๊อกล้มเหลว`;

        // อ่าน response body เพียงครั้งเดียว
        try {
          const responseText = await response.text();

          // ลองแปลงเป็น JSON ก่อน
          try {
            errorData = JSON.parse(responseText);
            if (typeof errorData === 'object' && errorData !== null) {
              errorMessage = errorData.message || errorData.error || errorData.details || responseText;
            }
          } catch (parseError) {
            // ถ้าแปลง JSON ไม่ได้ ใช้ text ตรงๆ
            errorData = responseText;
            errorMessage = responseText || errorMessage;
          }
        } catch (readError) {
          console.error('❌ Error reading response:', readError);
          // ใช้ error message default
        }

        console.error('❌ Stock update error details:', errorData);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('📦 Stock update response:', result);

      // ตรวจสอบว่ามีรายการที่ล้มเหลวหรือไม่
      if (result.data && result.data.results) {
        const failedItems = result.data.results.filter(item => !item.success);

        if (failedItems.length > 0) {
          // มีรายการที่ตัดสต๊อกไม่สำเร็จ - หยุดการทำงานทันที
          console.error('❌ Stock deduction failed for items:', failedItems);

          // แสดงรายละเอียดสินค้าที่สต๊อกไม่พอ
          const errorDetails = failedItems.map(item =>
            `• สินค้า ID: ${item.product_id} ${item.imei ? `(${item.imei})` : ''} - ${item.error}`
          ).join('\n');

          this.displayStockUpdateDetails(result.data);
          this.updateStatusMessage(
            `❌ ไม่สามารถดำเนินการต่อได้: สต๊อกไม่เพียงพอ`,
            'error'
          );

          throw new Error(`ไม่สามารถตัดสต๊อกได้:\n${errorDetails}`);
        }
      }

      // ถ้าทุกรายการสำเร็จ
      if (result.success && result.data) {
        console.log('✅ Stock updated successfully:', result.data);

        // อัพเดท UI แสดงผลการตัดสต๊อก
        this.displayStockUpdateDetails(result.data);
        this.updateStatusMessage(
          `✅ ตัดสต๊อกเรียบร้อย: ${result.data.summary.success}/${result.data.summary.total} รายการ`,
          'success'
        );
      }

      return result;

    } catch (error) {
      console.error('❌ Error updating stock:', error);

      if (error.name === 'AbortError') {
        throw new Error('การตัดสต๊อกล้มเหลว: ใช้เวลานานเกินไป (timeout)');
      }

      throw new Error('การตัดสต๊อกล้มเหลว: ' + error.message);
    }
  }

  async generateDocuments() {
    try {
      // 🔧 ตรวจสอบข้อมูลสัญญา
      if (!this.contractData) {
        throw new Error('ไม่พบข้อมูลสัญญา');
      }

      console.log('📋 Contract data analysis:', {
        hasContractData: !!this.contractData,
        contractDataType: typeof this.contractData,
        contractDataKeys: this.contractData ? Object.keys(this.contractData) : null,
        isSuccess: this.contractData ? this.contractData.success : null,
        hasDataField: !!(this.contractData && this.contractData.data)
      });

      // จัดการโครงสร้างข้อมูลที่แตกต่างกัน
      let actualData = null;

      if (this.contractData.data) {
        actualData = this.contractData.data;
      } else if (this.contractData.success && (this.contractData._id || this.contractData.contractNo)) {
        actualData = this.contractData;
      } else if (this.contractData._id || this.contractData.contractNo) {
        actualData = this.contractData;
      } else {
        console.warn('⚠️ Unknown API response structure, using fallback');
        actualData = this.contractData;
      }

      if (!actualData) {
        throw new Error('ไม่สามารถดึงข้อมูลจาก API response ได้');
      }

      // สร้าง documents object ถ้าไม่มี
      if (!actualData.documents) {
        console.log('📄 Creating document structure...');
        actualData.documents = {
          quotation: { status: 'pending', downloadUrl: null, error: null },
          invoice: { status: 'pending', downloadUrl: null, error: null },
          receipt: { status: 'pending', downloadUrl: null, error: null },
          taxInvoice: { status: 'pending', downloadUrl: null, error: null },
          generated: new Date().toISOString(),
          hasVatItems: this.checkHasVatItems()
        };
      }

      // อัพเดทข้อมูลใน contractData
      if (!this.contractData.data) {
        this.contractData.data = actualData;
      }

      console.log('📄 Processing documents...');

      this.documentUrls = {};
      const documents = this.contractData.data.documents;

      // แสดงสถานะเริ่มต้น
      this.updateDocumentStatus('quotationStatus', 'generating', 'กำลังสร้าง...');
      this.updateDocumentStatus('invoiceStatus', 'generating', 'กำลังสร้าง...');
      this.updateDocumentStatus('receiptStatus', 'generating', 'กำลังสร้าง...');
      this.updateDocumentStatus('receiptVoucherStatus', 'generating', 'กำลังสร้าง...');
      this.updateDocumentStatus('deliveryNoteStatus', 'generating', 'กำลังสร้าง...');
      if (documents.hasVatItems) {
        this.updateDocumentStatus('taxInvoiceStatusDoc', 'generating', 'กำลังสร้าง...');
      }

      // สร้างเอกสารทีละอัน
      await this.generateIndividualDocuments(documents);

      console.log('📄 Document generation completed:', this.documentUrls);

    } catch (error) {
      console.error('❌ Error processing documents:', error);
      this.updateAllDocumentStatus('error', 'เกิดข้อผิดพลาด');
      throw error;
    }
  }

  async generateIndividualDocuments(documents) {
    try {
      // เตรียมข้อมูลสำหรับสร้างเอกสาร
      const documentData = await this.prepareDocumentData(); // 🔧 FIX: เพิ่ม await

      // 1. สร้างใบเสนอราคา
      try {
        await this.sleep(500);
        this.updateDocumentStatus('quotationStatus', 'generating', 'กำลังสร้าง...');

        const quotationUrl = await this.generateQuotationDocument(documentData);
        if (quotationUrl) {
          this.documentUrls.quotation = quotationUrl;
          documents.quotation = { status: 'ready', downloadUrl: quotationUrl, error: null };
          this.updateDocumentStatus('quotationStatus', 'ready', 'พร้อมดาวน์โหลด');
          console.log('✅ Quotation PDF service is ready:', quotationUrl);
        } else {
          documents.quotation = { status: 'error', downloadUrl: null, error: 'No URL generated' };
          this.updateDocumentStatus('quotationStatus', 'error', 'เกิดข้อผิดพลาด');
        }
      } catch (error) {
        console.error('❌ Quotation generation failed:', error);
        documents.quotation = { status: 'error', downloadUrl: null, error: error.message };
        this.updateDocumentStatus('quotationStatus', 'error', 'เกิดข้อผิดพลาด');
      }

      // 2. สร้างใบแจ้งหนี้
      try {
        await this.sleep(500);
        this.updateDocumentStatus('invoiceStatus', 'generating', 'กำลังสร้าง...');

        const invoiceUrl = await this.generateInvoiceDocument(documentData);
        if (invoiceUrl) {
          this.documentUrls.invoice = invoiceUrl;
          documents.invoice = { status: 'ready', downloadUrl: invoiceUrl, error: null };
          this.updateDocumentStatus('invoiceStatus', 'ready', 'พร้อมดาวน์โหลด');
        }
      } catch (error) {
        console.error('❌ Invoice generation failed:', error);
        documents.invoice = { status: 'error', downloadUrl: null, error: error.message };
        this.updateDocumentStatus('invoiceStatus', 'error', 'เกิดข้อผิดพลาด');
      }

      // 3. 🔧 แก้ไข: สร้างทั้งใบเสร็จรับเงินและใบกำกับภาษีเสมอ (บังคับตามนโยบายบริษัท)
      console.log('📄 MANDATORY: Creating BOTH documents (Receipt + Tax Invoice) regardless of VAT status');

      // สร้างใบเสร็จรับเงิน (RE-xxx)
      try {
        await this.sleep(500);
        this.updateDocumentStatus('receiptStatus', 'generating', 'กำลังสร้าง...');

        const receiptUrl = await this.generateReceiptDocument(documentData);
        if (receiptUrl) {
          this.documentUrls.receipt = receiptUrl;
          documents.receipt = { status: 'ready', downloadUrl: receiptUrl, error: null };
          this.updateDocumentStatus('receiptStatus', 'ready', 'พร้อมดาวน์โหลด');
        }
      } catch (error) {
        console.error('❌ Receipt generation failed:', error);
        documents.receipt = { status: 'error', downloadUrl: null, error: error.message };
        this.updateDocumentStatus('receiptStatus', 'error', 'เกิดข้อผิดพลาด');
      }

      // สร้างใบกำกับภาษี (TX-xxx)
      try {
        await this.sleep(500);
        this.updateDocumentStatus('taxInvoiceStatusDoc', 'generating', 'กำลังสร้าง...');

        const taxInvoiceUrl = await this.generateTaxInvoiceDocument(documentData);
        if (taxInvoiceUrl) {
          this.documentUrls.taxInvoice = taxInvoiceUrl;
          documents.taxInvoice = { status: 'ready', downloadUrl: taxInvoiceUrl, error: null };
          this.updateDocumentStatus('taxInvoiceStatusDoc', 'ready', 'สร้างเสร็จแล้ว');
        }
      } catch (error) {
        console.error('❌ Tax Invoice generation failed:', error);
        documents.taxInvoice = { status: 'error', downloadUrl: null, error: error.message };
        this.updateDocumentStatus('taxInvoiceStatusDoc', 'error', 'เกิดข้อผิดพลาด');
      }

      // 4. ใบสำคัญรับเงิน (Receipt Voucher) - ซ่อนไม่แสดง
      /* *** ไม่แสดงใบสำคัญรับเงินตามความต้องการ ***
      try {
        await this.sleep(500);
        this.updateDocumentStatus('receiptVoucherStatus', 'generating', 'กำลังสร้าง...');

        // For now, mark as ready since it's created with receipt
        this.updateDocumentStatus('receiptVoucherStatus', 'ready', 'สร้างเสร็จแล้ว');
        documents.receiptVoucher = { status: 'ready', downloadUrl: null, error: null };
      } catch (error) {
        console.error('❌ Receipt Voucher status update failed:', error);
        this.updateDocumentStatus('receiptVoucherStatus', 'error', 'เกิดข้อผิดพลาด');
      }
      */

      // 4. ใบส่งของ (Delivery Note) - เปลี่ยนเลขลำดับจาก 5 เป็น 4
      try {
        await this.sleep(500);
        this.updateDocumentStatus('deliveryNoteStatus', 'generating', 'กำลังสร้าง...');

        // สร้างใบส่งของจริงผ่าน API
        const deliveryNoteUrl = await this.generateDeliveryDocument(documentData);
        if (deliveryNoteUrl) {
          this.documentUrls.deliveryNote = deliveryNoteUrl;
          documents.deliveryNote = { status: 'ready', downloadUrl: deliveryNoteUrl, error: null };
          this.updateDocumentStatus('deliveryNoteStatus', 'ready', 'พร้อมดาวน์โหลด');
        }
      } catch (error) {
        console.error('❌ Delivery Note generation failed:', error);
        documents.deliveryNote = { status: 'error', downloadUrl: null, error: error.message };
        this.updateDocumentStatus('deliveryNoteStatus', 'error', 'เกิดข้อผิดพลาด');
      }

      console.log('📋 Document generation completed:', documents);

      // � Enhanced: บันทึกข้อมูลไปฐานข้อมูลผ่าน Enhanced Email Service
      try {
        console.log('📧 Saving documents to database via Enhanced Email Service...');
        await this.saveDocumentsToDatabase(documents, documentData);
        console.log('✅ Documents saved to database successfully');
      } catch (databaseError) {
        console.error('⚠️ Database save failed (non-critical):', databaseError);
        // ไม่ให้ database error หยุดการทำงานหลัก
      }

      // �🔍 ตรวจสอบการบันทึกข้อมูลในฐานข้อมูล
      await this.verifyDatabasePersistence();

      return documents;

    } catch (error) {
      console.error('❌ Error in generateIndividualDocuments:', error);

      // กรณี error ทั้งหมด ให้แสดงสถานะ error
      ['quotationStatus', 'invoiceStatus', 'receiptStatus'].forEach(statusId => {
        this.updateDocumentStatus(statusId, 'error', 'เกิดข้อผิดพลาด');
      });

      throw error;
    }
  }

  async prepareDocumentData() {
    console.log('📋 Preparing document data with MANDATORY validation...');
    const step1Data = window.globalInstallmentManager.getStepData(1);
    const step2Data = window.globalInstallmentManager.getStepData(2);
    const step3Data = window.globalInstallmentManager.getStepData(3);

    // 🚨 MANDATORY: ตรวจสอบข้อมูลขั้นพื้นฐานก่อน
    if (!step1Data || !step2Data || !step3Data) {
      throw new Error('❌ MANDATORY ERROR: ข้อมูลขั้นตอนไม่ครบถ้วน - ไม่สามารถเตรียมข้อมูลเอกสารได้');
    }

    if (!step1Data.cartItems || step1Data.cartItems.length === 0) {
      throw new Error('❌ MANDATORY ERROR: ไม่มีรายการสินค้า - ไม่สามารถเตรียมข้อมูลเอกสารได้');
    }

    if (!step2Data.customer) {
      throw new Error('❌ MANDATORY ERROR: ไม่มีข้อมูลลูกค้า - ไม่สามารถเตรียมข้อมูลเอกสารได้');
    }

    // 🔧 FIX: ดึงชื่อพนักงานจากการ login เท่านั้น - ไม่มี fallback
    const employeeName = await this.getLoggedInEmployeeName();

    // 🔧 FIX: ตรวจสอบว่าได้ชื่อพนักงานจากการ login หรือไม่
    if (!employeeName) {
      throw new Error('❌ ไม่พบข้อมูลพนักงานจากการ login กรุณาเข้าสู่ระบบใหม่');
    }

    console.log('👤 Using employee name from login only:', employeeName);

    // 🔍 DEBUG: ตรวจสอบข้อมูล payment method จาก step3
    console.log('💳 Step3 Payment Method Debug:', {
      paymentMethod: step3Data.paymentMethod,
      creditTerm: step3Data.creditTerm,
      fallback: step3Data.paymentMethod || step3Data.creditTerm,
      fullStep3Data: step3Data
    });

    // สร้างข้อมูลที่ clean ไม่มี circular reference
    const cleanContractData = {
      _id: this.contractData._id,
      contract_no: this.contractData.contract_no || this.contractData.contract_number,
      contract_number: this.contractData.contract_number || this.contractData.contract_no,
      orderId: this.contractData.orderId,
      installment_id: this.contractData.installment_id,
      total_amount: this.contractData.total_amount,
      down_payment: this.contractData.down_payment,
      installment_count: this.contractData.installment_count,
      installment_amount: this.contractData.installment_amount,
      created_at: this.contractData.created_at,
      status: this.contractData.status
    };

    // Clean customer data with mandatory validation
    // Debug original step2 data
    console.log('🔍 Original step2 customer data:', {
      customer: step2Data?.customer,
      customerType: step2Data?.customerType,
      address: step2Data?.customer?.address,
      addressType: typeof step2Data?.customer?.address
    });

    // 🚨 MANDATORY: ตรวจสอบข้อมูลลูกค้าที่จำเป็น
    const customer = step2Data.customer;
    // Check for customer name in various field formats
    const firstName = customer.first_name || customer.firstName || '';
    const lastName = customer.last_name || customer.lastName || '';
    if (!firstName && !lastName) {
      console.error('❌ Customer data missing name:', customer);
      throw new Error('❌ MANDATORY ERROR: ต้องระบุชื่อหรือนามสกุลลูกค้า');
    }

    // Check for phone number in various field names
    const phoneNumber = customer.phone_number || customer.phone || '';
    if (!phoneNumber) {
      throw new Error('❌ MANDATORY ERROR: ต้องระบุเบอร์โทรศัพท์ลูกค้า');
    }

    const cleanCustomerData = {
      prefix: customer.prefix || '',
      first_name: customer.first_name || customer.firstName || '',
      last_name: customer.last_name || customer.lastName || '',
      phone_number: customer.phone_number || customer.phone || '',
      email: customer.email || '',
      tax_id: customer.tax_id || customer.idCard || customer.id_card || '',
      age: customer.age || '',
      address: typeof customer.address === 'string'
        ? customer.address
        : this.formatAddress(customer.address) || 'ไม่มีข้อมูลที่อยู่'
    };

    // Debug processed customer data
    console.log('🔍 Processed customer data:', {
      prefix: cleanCustomerData.prefix,
      first_name: cleanCustomerData.first_name,
      last_name: cleanCustomerData.last_name,
      address: cleanCustomerData.address,
      addressType: typeof cleanCustomerData.address
    });

    // Clean items data with validation
    const cleanItemsData = step1Data.cartItems.map(item => {
      if (!item.name) {
        throw new Error('❌ MANDATORY ERROR: รายการสินค้าต้องมีชื่อ');
      }
      if (!item.price && !item.sale_price) {
        throw new Error('❌ MANDATORY ERROR: รายการสินค้าต้องมีราคา');
      }

      return {
        id: item.id || item._id,
        name: item.name,
        brand: item.brand || '',
        model: item.model || '',
        price: item.price || item.sale_price,
        quantity: item.quantity || 1,
        totalPrice: item.totalPrice || (item.price * (item.quantity || 1)),
        imei: item.imei || '',
        image: item.image || ''
      };
    });

    // คำนวณยอดรวมจากสินค้า
    const subTotal = cleanItemsData.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      contractData: cleanContractData,
      customerData: cleanCustomerData,
      itemsData: cleanItemsData,
      paymentData: {
        selectedPlan: step3Data.selectedPlan?.name,
        downPayment: step3Data.down_payment,
        docFee: step3Data.doc_fee,
        installmentPeriod: step3Data.installment_count,
        installmentAmount: step3Data.installment_amount,
        // 🔍 DEBUG: ตรวจสอบ payment method จาก step3
        paymentMethod: step3Data.paymentMethod || step3Data.creditTerm,
        subTotal: subTotal,
        totalAmount: step3Data.total_amount || subTotal,
        staffName: employeeName // 🔧 FIX: ใช้ชื่อพนักงานจากการ login
      },
      branchData: {
        code: step1Data.branchCode || window.BRANCH_CODE,
        name: step1Data.branchName || 'สาขาหลัก'
      },
      // 🆕 เพิ่มข้อมูลบริษัทสำหรับใบกำกับภาษี
      companyData: {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
        taxId: '0945566000616',
        phone: '09-2427-0769'
      },
      // 🆕 เพิ่มข้อมูลสรุปสำหรับใบกำกับภาษี
      summaryData: {
        subtotal: step3Data.down_payment || 0, // 🔧 FIX: ใช้ down payment แทน subTotal สำหรับใบเสร็จ
        docFee: step3Data.doc_fee || 0,
        totalAmount: (step3Data.down_payment || 0) + (step3Data.doc_fee || 0), // 🔧 FIX: down payment + doc fee
        taxType: step3Data.taxType || 'none',
        vatAmount: step3Data.vatAmount || 0
      },
      timestamp: new Date().toISOString()
    };
  }

  checkHasVatItems() {
    console.log('🔍 === checkHasVatItems() Enhanced Analysis ===');

    // Method 1: ตรวจสอบจาก step1Data (cartItems)
    const step1Data = window.globalInstallmentManager?.getStepData(1);

    // Method 2: ตรวจสอบจาก step3Data (tax settings)
    const step3Data = window.globalInstallmentManager?.getStepData(3);

    // Method 3: ตรวจสอบจาก calculated VAT amount
    const calculatedVAT = this.calculateVatAmount(step1Data, step3Data);

    console.log('🔍 Multi-source VAT detection:', {
      hasStep1Data: !!step1Data,
      hasStep3Data: !!step3Data,
      calculatedVAT,
      step3TaxType: step3Data?.taxType,
      hasCartItems: !!(step1Data?.cartItems),
      cartItemsLength: step1Data?.cartItems?.length || 0
    });

    // Method 1: Check cartItems for VAT indicators
    let hasVatFromItems = false;
    if (step1Data?.cartItems && Array.isArray(step1Data.cartItems)) {
      // Sub-method 1a: Check by taxType
      const hasVatItemsByTaxType = step1Data.cartItems.some(item =>
        item.taxType &&
        item.taxType !== 'ไม่มี VAT' &&
        item.taxType !== 'ไม่มีภาษี' &&
        item.taxType !== 'none' &&
        item.taxType !== ''
      );

      // Sub-method 1b: Check by has_vat flag
      const hasVatItemsByFlag = step1Data.cartItems.some(item =>
        item.has_vat === true ||
        item.has_vat === 'true' ||
        (item.vat_rate && parseFloat(item.vat_rate) > 0)
      );

      hasVatFromItems = hasVatItemsByTaxType || hasVatItemsByFlag;

      // Debug individual items
      const itemAnalysis = step1Data.cartItems.map((item, index) => ({
        index: index + 1,
        name: item.name || `สินค้า ${index + 1}`,
        taxType: item.taxType,
        has_vat: item.has_vat,
        vat_rate: item.vat_rate,
        hasVatByTaxType: item.taxType && item.taxType !== 'ไม่มี VAT' && item.taxType !== 'ไม่มีภาษี' && item.taxType !== 'none',
        hasVatByFlag: item.has_vat === true || item.has_vat === 'true',
        hasVatByRate: item.vat_rate && parseFloat(item.vat_rate) > 0
      }));

      console.log('📊 Items VAT Analysis:', itemAnalysis);
      console.log('� Items Detection Results:', {
        byTaxType: hasVatItemsByTaxType,
        byFlag: hasVatItemsByFlag,
        combinedItems: hasVatFromItems
      });
    }

    // Method 2: Check step3 tax settings
    let hasVatFromStep3 = false;
    if (step3Data?.taxType) {
      hasVatFromStep3 = step3Data.taxType === 'inclusive' ||
                        step3Data.taxType === 'exclusive' ||
                        step3Data.taxType === 'vat' ||
                        step3Data.include_vat === true ||
                        step3Data.include_vat === 'true';

      console.log('🔍 Step3 Tax Settings:', {
        taxType: step3Data.taxType,
        include_vat: step3Data.include_vat,
        hasVatFromStep3
      });
    }

    // Method 3: Check calculated VAT amount
    const hasVatFromCalculation = calculatedVAT && parseFloat(calculatedVAT) > 0;

    console.log('🔍 Calculation Detection:', {
      calculatedVAT,
      hasVatFromCalculation
    });

    // 🎯 Final Decision: Use OR logic across all methods
    const finalHasVat = hasVatFromItems || hasVatFromStep3 || hasVatFromCalculation;

    console.log('🎯 FINAL VAT Detection Result:', {
      method1_items: hasVatFromItems,
      method2_step3: hasVatFromStep3,
      method3_calculation: hasVatFromCalculation,
      FINAL_RESULT: finalHasVat,
      detectionSource: hasVatFromItems ? 'items' : hasVatFromStep3 ? 'step3' : hasVatFromCalculation ? 'calculation' : 'none',
      timestamp: new Date().toLocaleTimeString()
    });

    // 🚨 Extra validation: If frontend shows VAT but we detect none, log warning
    if (!finalHasVat && calculatedVAT && parseFloat(calculatedVAT) > 0) {
      console.warn('⚠️ INCONSISTENCY DETECTED: Frontend calculated VAT but backend detected no VAT items');
      console.warn('⚠️ Forcing VAT detection to TRUE based on calculated amount');
      return true;
    }

    return finalHasVat;
  }

  updateAllDocumentStatus(status, message) {
    this.updateDocumentStatus('quotationStatus', status, message);
    this.updateDocumentStatus('invoiceStatus', status, message);
    this.updateDocumentStatus('receiptStatus', status, message);
    this.updateDocumentStatus('receiptVoucherStatus', status, message);
    this.updateDocumentStatus('deliveryNoteStatus', status, message);
    this.updateDocumentStatus('taxInvoiceStatusDoc', status, message);
  }

  async verifyDatabasePersistence() {
    console.log('🔍 Verifying database persistence for all documents...');

    const verificationResults = {
      quotation: { saved: false, id: null, number: null },
      invoice: { saved: false, id: null, number: null },
      receipt: { saved: false, id: null, number: null },
      taxInvoice: { saved: false, id: null, number: null }
    };

    try {
      // 1. ตรวจสอบ Quotation
      const quotationId = sessionStorage.getItem('savedQuotationId');
      const quotationNumber = sessionStorage.getItem('currentQuotationNumber');
      if (quotationId && quotationNumber) {
        verificationResults.quotation = { saved: true, id: quotationId, number: quotationNumber };
        console.log('✅ Quotation verified in database:', verificationResults.quotation);
      } else {
        console.log('❌ Quotation not found in session storage');
      }

      // 2. ตรวจสอบ Invoice
      const invoiceId = sessionStorage.getItem('savedInvoiceId');
      const invoiceNumber = sessionStorage.getItem('currentInvoiceNumber');
      if (invoiceId && invoiceNumber) {
        verificationResults.invoice = { saved: true, id: invoiceId, number: invoiceNumber };
        console.log('✅ Invoice verified in database:', verificationResults.invoice);
      } else {
        console.log('❌ Invoice not found in session storage');
      }

      // 3. ตรวจสอบ Receipt
      const receiptId = sessionStorage.getItem('savedReceiptId');
      const receiptNumber = sessionStorage.getItem('currentReceiptNumber');
      if (receiptId && receiptNumber) {
        verificationResults.receipt = { saved: true, id: receiptId, number: receiptNumber };
        console.log('✅ Receipt verified in database:', verificationResults.receipt);
      } else {
        console.log('⚠️ Receipt not found in session storage (may be normal if no VAT items)');
      }

      // 4. ตรวจสอบ Tax Invoice
      const taxInvoiceId = sessionStorage.getItem('savedTaxInvoiceId');
      const taxInvoiceNumber = sessionStorage.getItem('currentTaxInvoiceNumber');
      if (taxInvoiceId && taxInvoiceNumber) {
        verificationResults.taxInvoice = { saved: true, id: taxInvoiceId, number: taxInvoiceNumber };
        console.log('✅ Tax Invoice verified in database:', verificationResults.taxInvoice);
      } else {
        console.log('⚠️ Tax Invoice not found in session storage (may be normal if no VAT items)');
      }

      // Summary
      const savedCount = Object.values(verificationResults).filter(result => result.saved).length;
      console.log(`📊 Database persistence summary: ${savedCount}/4 documents saved`);
      console.log('📋 Detailed verification results:', verificationResults);

      // Store verification results for later use
      sessionStorage.setItem('documentVerification', JSON.stringify(verificationResults));

      return verificationResults;

    } catch (error) {
      console.error('❌ Error during database verification:', error);
      return verificationResults;
    }
  }

  displayStockUpdateDetails(stockData) {
    const detailsContainer = document.getElementById('stockUpdateDetails');
    const listContainer = document.getElementById('stockUpdateList');

    if (!detailsContainer || !listContainer || !stockData) return;

    const { results = [], summary = {} } = stockData;
    const updatedItems = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    // แสดงส่วน stock update details
    detailsContainer.style.display = 'block';

    // สร้างรายการแสดงผล
    let html = '';

    // แสดงสถิติ
    html += `
      <div class="mb-3 p-2 bg-white dark:bg-gray-800 rounded border">
        <div class="flex justify-between text-sm">
          <span>รายการทั้งหมด: <strong>${summary.total || 0}</strong></span>
          <span class="text-green-600">สำเร็จ: <strong>${summary.success || 0}</strong></span>
          ${summary.failed > 0 ? `<span class="text-red-600">ล้มเหลว: <strong>${summary.failed}</strong></span>` : ''}
        </div>
      </div>
    `;

    // แสดงรายการที่อัพเดทสำเร็จ
    if (updatedItems.length > 0) {
      html += '<div class="mb-3"><h5 class="font-semibold text-green-700 dark:text-green-300 mb-2">✅ ตัดสต๊อกสำเร็จ:</h5>';
      updatedItems.forEach(item => {
        html += `
          <div class="flex justify-between items-center py-1 px-2 bg-green-50 dark:bg-green-900/20 rounded mb-1">
            <div class="flex-1">
              <span class="font-medium">สินค้า ID: ${item.product_id}</span>
              ${item.imei ? `<span class="text-xs text-gray-500 ml-2">(${item.imei})</span>` : ''}
            </div>
            <div class="text-xs text-green-700 dark:text-green-300">
              ${item.name ? `<span class="font-medium">${item.name}</span>` : ''}
              <span class="ml-2">✓ ตัดสต๊อกแล้ว</span>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    // แสดงรายการที่ล้มเหลว
    if (failures.length > 0) {
      html += '<div class="mb-3"><h5 class="font-semibold text-red-700 dark:text-red-300 mb-2">❌ ตัดสต๊อกล้มเหลว:</h5>';
      failures.forEach(item => {
        html += `
          <div class="flex justify-between items-center py-1 px-2 bg-red-50 dark:bg-red-900/20 rounded mb-1">
            <div class="flex-1">
              <span class="font-medium">สินค้า ID: ${item.product_id}</span>
              ${item.imei ? `<span class="text-xs text-gray-500 ml-2">(${item.imei})</span>` : ''}
            </div>
            <div class="text-xs text-red-700 dark:text-red-300">
              ${item.error}
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    // ถ้าไม่มีข้อมูล
    if (updatedItems.length === 0 && failures.length === 0) {
      html += '<div class="text-center text-gray-500 py-2">ไม่มีรายการตัดสต๊อก</div>';
    }

    listContainer.innerHTML = html;

    console.log('📦 Stock update details displayed in UI');
  }

  // ========== UI UPDATES ==========

  updateProcessStep(stepId, status) {
    const stepElement = document.getElementById(stepId);
    if (!stepElement) return;

    // Remove all status classes
    stepElement.classList.remove('completed', 'processing', 'error');

    // Add new status
    stepElement.classList.add(status);

    const icon = stepElement.querySelector('.progress-step-icon');
    if (icon) {
      switch (status) {
        case 'completed':
          icon.innerHTML = '✓';
          break;
        case 'processing':
          icon.innerHTML = '<i class="bi bi-hourglass-split"></i>';
          break;
        case 'error':
          icon.innerHTML = '✗';
          break;
      }
    }
  }

  updateDocumentStatus(statusId, status, text) {
    const element = document.getElementById(statusId);
    if (!element) return;

    element.className = `document-status ${status}`;

    let icon = 'bi-clock';
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-600';

    switch (status) {
      case 'generating':
        icon = 'bi-hourglass-split';
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-700';
        break;
      case 'ready':
        icon = 'bi-check-circle-fill';
        bgColor = 'bg-green-100';
        textColor = 'text-green-700';
        text = 'สร้างเสร็จแล้ว';
        break;
      case 'error':
        icon = 'bi-x-circle';
        bgColor = 'bg-red-100';
        textColor = 'text-red-700';
        break;
      case 'pending':
        icon = 'bi-clock';
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-600';
        break;
    }

    element.className = `document-status ${status} ${bgColor} ${textColor} px-3 py-1 rounded-full inline-flex items-center gap-2`;
    element.innerHTML = `<i class="bi ${icon}"></i><span>${text}</span>`;
  }

  updateStatusMessage(message, type = 'info') {
    const element = document.getElementById('statusMessage');
    if (!element) return;

    const iconMap = {
      'info': 'bi-info-circle',
      'success': 'bi-check-circle',
      'warning': 'bi-exclamation-triangle',
      'error': 'bi-x-circle'
    };

    const colorMap = {
      'info': 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
      'success': 'bg-green-50 dark:bg-green-900/20 text-green-600',
      'warning': 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600',
      'error': 'bg-red-50 dark:bg-red-900/20 text-red-600'
    };

    element.className = `mt-4 p-3 rounded-lg text-center ${colorMap[type]}`;
    element.innerHTML = `<i class="bi ${iconMap[type]}"></i> <span class="text-sm">${message}</span>`;
  }

  enableDocumentActions() {
    // อัพเดทสถานะการสร้างสัญญา
    const statusElement = document.getElementById('contractCreationStatus');
    if (statusElement) {
      statusElement.style.display = 'block';
      statusElement.className = 'mt-2 p-3 rounded-lg text-center bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400';
      statusElement.innerHTML = '<i class="bi bi-check-circle"></i> <span class="text-sm">สัญญาสำเร็จแล้ว - พร้อมดาวน์โหลดเอกสาร</span>';
    }

    const documentsSection = document.getElementById('documentsSection');
    if (documentsSection) {
      documentsSection.style.display = 'block';
    }

    // นับจำนวนเอกสารที่พร้อม
    const availableDocuments = Object.keys(this.documentUrls).filter(key =>
      this.documentUrls[key] && !this.documentUrls[key].includes('placeholder')
    );

    console.log('📄 Available documents for download:', availableDocuments);

    // Enable download buttons only for available documents
    if (this.documentUrls.quotation) {
      const btn = document.getElementById('btnDownloadQuotation');
      if (btn) {
        btn.disabled = false;
        btn.onclick = () => this.downloadDocument('quotation');
        btn.title = 'พร้อมดาวน์โหลด';
      }
    }

    if (this.documentUrls.invoice) {
      const btn = document.getElementById('btnDownloadInvoice');
      if (btn) {
        btn.disabled = false;
        btn.onclick = () => this.downloadDocument('invoice');
        btn.title = 'พร้อมดาวน์โหลด';
      }
    }

    // ปุ่มรวมถูกลบแล้ว - ใช้ปุ่มแยกแทน

    // Enable email button if there are any documents
    const hasDocuments = Object.keys(this.documentUrls).length > 0;
    if (hasDocuments) {
      const emailBtn = document.getElementById('btnSendEmail');
      if (emailBtn) {
        emailBtn.disabled = false;
        emailBtn.onclick = () => this.sendDocumentsEmail();
      }
    }

    // Enable down payment buttons (these use separate API calls)
    const downReceiptBtn = document.getElementById('btnPrintDownPaymentReceipt');
    if (downReceiptBtn) {
      downReceiptBtn.disabled = false;
      downReceiptBtn.style.display = 'block';
      downReceiptBtn.onclick = () => this.printDownPaymentReceipt();
    }

    const downReceiptVoucherBtn = document.getElementById('btnPrintDownPaymentReceiptVoucher');
    if (downReceiptVoucherBtn) {
      downReceiptVoucherBtn.disabled = false;
      downReceiptVoucherBtn.style.display = 'block';
      downReceiptVoucherBtn.onclick = () => this.printDownPaymentReceiptVoucher();
    }

    const downTaxBtn = document.getElementById('btnPrintDownPaymentTaxInvoice');
    if (downTaxBtn) {
      // Show tax invoice button only if there are VAT items
      const step1Data = window.globalInstallmentManager.getStepData(1);
      const hasVatItems = step1Data.cartItems && step1Data.cartItems.some(item => item.has_vat || item.vat_rate > 0);

      if (hasVatItems) {
        downTaxBtn.style.display = 'block';
        downTaxBtn.disabled = false;
        downTaxBtn.onclick = () => this.printDownPaymentTaxInvoice();
      }
    }

    // Update create button
    const createBtn = document.getElementById('btnCreateContract');
    if (createBtn) {
      createBtn.innerHTML = '<i class="bi bi-check-circle"></i><span>สัญญาสำเร็จแล้ว</span>';
      createBtn.className = 'btn btn-success btn-block';
      createBtn.disabled = true;
    }

    console.log('✅ Document actions enabled. Available documents:', this.documentUrls);
  }

  // ========== LOADING & MODAL MANAGEMENT ==========

  showLoadingOverlay(title, progress = 0) {
    const overlay = document.getElementById('loadingOverlay');
    const titleElement = document.getElementById('loadingTitle');
    const progressElement = document.getElementById('loadingProgress');
    const percentageElement = document.getElementById('loadingPercentage');

    if (overlay) overlay.classList.remove('hidden');
    if (titleElement) titleElement.textContent = title;
    if (progressElement) progressElement.style.width = progress + '%';
    if (percentageElement) percentageElement.textContent = progress + '%';
  }

  setLoadingProgress(progress, message = '') {
    const progressElement = document.getElementById('loadingProgress');
    const percentageElement = document.getElementById('loadingPercentage');
    const messageElement = document.getElementById('loadingMessage');

    if (progressElement) progressElement.style.width = progress + '%';
    if (percentageElement) percentageElement.textContent = progress + '%';
    if (messageElement && message) messageElement.textContent = message;
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  showSuccessModal() {
    const modal = document.getElementById('successModal');
    const contractNumberElement = document.getElementById('contractNumber');
    const paymentAmountElement = document.getElementById('successPaymentAmount');
    const nextInstallmentElement = document.getElementById('nextInstallmentDate');

    if (modal) modal.classList.remove('hidden');

    if (contractNumberElement && this.contractData) {
      contractNumberElement.textContent = this.contractData.contractNo || this.contractData.contract_no || 'C' + Date.now();
    }

    if (paymentAmountElement) {
      const step3Data = window.globalInstallmentManager.getStepData(3);
      const amount = (step3Data.down_payment || 0) + (step3Data.doc_fee || 0);
      paymentAmountElement.textContent = `฿${this.formatPrice(amount)}`;
    }

    if (nextInstallmentElement) {
      const step3Data = window.globalInstallmentManager.getStepData(3);
      const today = new Date();
      const nextDate = new Date(today);
      nextDate.setMonth(nextDate.getMonth() + 1);
      nextInstallmentElement.textContent = this.formatDate(nextDate);
    }

    // แสดงข้อมูลเอกสารที่สร้างแล้ว (ทั้งใบเสร็จและใบกำกับภาษี)
    this.updateDocumentStatusInModal();
  }

  // อัปเดตสถานะเอกสารใน Success Modal
  updateDocumentStatusInModal() {
    try {
      const contractNo = this.contractData?.contractNo || this.contractData?.contract_no;
      if (!contractNo) return;

      // ดึงข้อมูลเอกสารจาก localStorage
      const documentInfo = JSON.parse(localStorage.getItem(`installment_documents_${contractNo}`) || '{}');

      // อัปเดต UI แสดงเอกสารที่สร้างแล้ว
      const documentsStatusElement = document.getElementById('documentsStatus');
      if (documentsStatusElement) {
        let statusHTML = '<div class="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">';
        statusHTML += '<h4 class="text-green-800 font-semibold mb-3 flex items-center gap-2">';
        statusHTML += '<i class="bi bi-check-circle-fill text-green-600"></i>';
        statusHTML += 'เอกสารที่สร้างแล้ว</h4>';
        statusHTML += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';

        // ใบเสร็จรับเงิน
        if (documentInfo.receiptNumber) {
          statusHTML += '<div class="flex items-center gap-2 p-3 bg-white rounded border border-blue-200">';
          statusHTML += '<i class="bi bi-receipt text-blue-600"></i>';
          statusHTML += '<div>';
          statusHTML += '<div class="font-medium text-blue-800">ใบเสร็จรับเงิน</div>';
          statusHTML += `<div class="text-sm text-gray-600">เลขที่ ${documentInfo.receiptNumber}</div>`;
          statusHTML += '</div>';
          statusHTML += '</div>';
        }

        // ใบกำกับภาษี
        if (documentInfo.taxInvoiceNumber) {
          statusHTML += '<div class="flex items-center gap-2 p-3 bg-white rounded border border-green-200">';
          statusHTML += '<i class="bi bi-file-text text-green-600"></i>';
          statusHTML += '<div>';
          statusHTML += '<div class="font-medium text-green-800">ใบกำกับภาษี</div>';
          statusHTML += `<div class="text-sm text-gray-600">เลขที่ ${documentInfo.taxInvoiceNumber}</div>`;
          statusHTML += '</div>';
          statusHTML += '</div>';
        }

        statusHTML += '</div>';

        // แสดงข้อความสรุป
        const docCount = (documentInfo.receiptNumber ? 1 : 0) + (documentInfo.taxInvoiceNumber ? 1 : 0);
        if (docCount > 0) {
          statusHTML += '<div class="mt-3 text-center text-sm text-green-700">';
          statusHTML += `<i class="bi bi-info-circle"></i> ระบบได้สร้างเอกสารทั้ง ${docCount} ใบให้อัตโนมัติแล้ว`;
          statusHTML += '</div>';
        }

        statusHTML += '</div>';
        documentsStatusElement.innerHTML = statusHTML;
      }

      console.log('📋 Document status updated:', {
        contractNo,
        receiptNumber: documentInfo.receiptNumber,
        taxInvoiceNumber: documentInfo.taxInvoiceNumber,
        documentsCount: (documentInfo.receiptNumber ? 1 : 0) + (documentInfo.taxInvoiceNumber ? 1 : 0)
      });

    } catch (error) {
      console.error('❌ Error updating document status:', error);
    }
  }

  hideSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) modal.classList.add('hidden');
  }

  showContractCreationRequired() {
    const statusElement = document.getElementById('contractCreationStatus');
    if (statusElement) {
      statusElement.style.display = 'block';
      statusElement.className = 'mt-2 p-3 rounded-lg text-center bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400';
      statusElement.innerHTML = '<i class="bi bi-exclamation-triangle"></i> <span class="text-sm">กรุณาสร้างสัญญาก่อนดาวน์โหลดเอกสาร</span>';

      // ซ่อนข้อความหลังจาก 5 วินาที
      setTimeout(() => {
        if (statusElement) {
          statusElement.style.display = 'none';
        }
      }, 5000);
    }
  }

  // ========== DOCUMENT ACTIONS ==========

  downloadDocument(type) {
    try {
      // ตรวจสอบว่าสร้างสัญญาแล้วหรือยัง
      if (!this.contractCreated) {
        this.showToast('กรุณาสร้างสัญญาก่อนดาวน์โหลดเอกสาร', 'warning');
        this.showContractCreationRequired();
        return;
      }

      const url = this.documentUrls[type];
      if (!url) {
        this.showToast(`ไม่พบเอกสาร${this.getDocumentTypeName(type)} กรุณาลองสร้างสัญญาใหม่`, 'error');
        return;
      }

      console.log(`📥 Downloading ${type} from:`, url);

      // เอา placeholder check ออกเพราะ PDF Service พร้อมแล้ว
      // if (url.includes('placeholder')) {
      //   this.showToast('เอกสารนี้ยังไม่พร้อม กรุณารอพัฒนา Service', 'warning');
      //   return;
      // }

      // สำหรับ receipt ที่เป็น PNG ให้แสดงในหน้าต่างใหม่
      if (type === 'receipt' && (url.includes('.png') || url.includes('image'))) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>ใบเสร็จรับเงิน</title>
                <style>
                  body { 
                    margin: 0; 
                    padding: 20px; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    min-height: 100vh; 
                    background: #f5f5f5; 
                  }
                  img { 
                    max-width: 100%; 
                    height: auto; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    background: white;
                    padding: 10px;
                  }
                  .print-button {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 10px 20px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                  }
                  @media print {
                    .print-button { display: none; }
                    body { background: white; }
                  }
                </style>
              </head>
              <body>
                <button class="print-button" onclick="window.print()">พิมพ์</button>
                <img src="${url}" alt="ใบเสร็จรับเงิน" onload="console.log('Receipt image loaded')" onerror="console.error('Failed to load receipt image')" />
              </body>
            </html>
          `);
          printWindow.document.close();
        }
        return;
      }

      // สำหรับ PDF files
      const link = document.createElement('a');
      link.href = url;
      link.download = this.getDocumentFilename(type);
      link.target = '_blank';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showToast(`ดาวน์โหลด${this.getDocumentTypeName(type)}เรียบร้อย`, 'success');

    } catch (error) {
      console.error(`❌ Error downloading ${type}:`, error);
      this.showToast('เกิดข้อผิดพลาดในการดาวน์โหลด: ' + error.message, 'error');
    }
  }

  getDocumentFilename(type) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
    const fileNames = {
      'quotation': `quotation_${timestamp}.pdf`,
      'invoice': `invoice_${timestamp}.pdf`,
      'receipt': `receipt_${timestamp}.png`,
      'receipt-voucher': `receipt_voucher_${timestamp}.pdf`,
      'tax-invoice': `tax_invoice_${timestamp}.pdf`,
      'taxInvoice': `tax_invoice_${timestamp}.pdf`
    };
    return fileNames[type] || `document_${timestamp}.pdf`;
  }

  getDocumentTypeName(type) {
    const typeNames = {
      'quotation': 'ใบเสนอราคา',
      'invoice': 'ใบแจ้งหนี้',
      'receipt': 'ใบเสร็จรับเงิน',
      'receipt-voucher': 'ใบสำคัญรับเงิน',
      'tax-invoice': 'ใบกำกับภาษี',
      'taxInvoice': 'ใบกำกับภาษี'
    };
    return typeNames[type] || 'เอกสาร';
  }

  // 🆕 ฟังก์ชันใหม่: ดาวน์โหลดเอกสารการชำระแบบอัตโนมัติ (Receipt/TaxInvoice)
  async downloadPaymentDocument() {
    try {
      console.log('🧠 Smart Document Download: Determining document type...');

      // ตรวจสอบว่าสินค้ามีภาษีหรือไม่
      const hasVatItems = this.checkHasVatItems();
      const documentType = hasVatItems ? 'tax-invoice' : 'receipt';
      const documentName = hasVatItems ? 'ใบกำกับภาษี' : 'ใบเสร็จรับเงิน';

      console.log(`📋 Document type determined: ${documentType} (${documentName})`);
      console.log(`🔍 Has VAT items: ${hasVatItems}`);

      // ตรวจสอบว่ามี URL พร้อมหรือไม่
      const url = this.documentUrls[documentType] || this.documentUrls[documentType === 'tax-invoice' ? 'taxInvoice' : 'receipt'];

      if (url && !url.includes('placeholder')) {
        console.log(`✅ Using cached URL: ${url}`);
        this.downloadDocument(documentType === 'tax-invoice' ? 'taxInvoice' : 'receipt');
        return;
      }

      // ถ้าไม่มี URL พร้อม ให้สร้างใหม่
      console.log('🔄 No cached URL available, generating new document...');
      this.showToast(`กำลังสร้าง${documentName}...`, 'info');

      // เตรียมข้อมูลสำหรับการสร้างเอกสาร
      const stepData = await this.prepareDocumentData(); // 🔧 FIX: เพิ่ม await

      if (!stepData || !stepData.customerData) {
        this.showToast('ไม่พบข้อมูลลูกค้า กรุณาเติมข้อมูลให้ครบถ้วน', 'error');
        return;
      }

      // สร้างและดาวน์โหลดเอกสารใหม่ - ใช้ endpoint ที่อัปเดตแล้ว
      const endpoint = '/api/pdf/installment/receipt';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({ stepData: window.globalInstallmentManager.getAllStepData() })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      // ตรวจสอบว่า response เป็น PDF หรือ JSON
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/pdf')) {
        // เป็น PDF - สร้าง blob และดาวน์โหลดโดยตรง
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = this.getDocumentFilename(documentType);
        link.target = '_blank';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // ทำความสะอาด URL
        window.URL.revokeObjectURL(downloadUrl);

        this.showToast(`ดาวน์โหลด${documentName}เรียบร้อย`, 'success');

      } else {
        // เป็น JSON - ดึง URL
        const result = await response.json();

        if (result.success && result.url) {
          const fullUrl = result.url.startsWith('http') ? result.url : `${window.location.origin}${result.url}`;

          // บันทึก URL สำหรับใช้ครั้งต่อไป
          if (hasVatItems) {
            this.documentUrls.taxInvoice = fullUrl;
            this.documentUrls['tax-invoice'] = fullUrl;
          } else {
            this.documentUrls.receipt = fullUrl;
          }

          // ดาวน์โหลด
          const link = document.createElement('a');
          link.href = fullUrl;
          link.download = this.getDocumentFilename(documentType);
          link.target = '_blank';

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          this.showToast(`ดาวน์โหลด${documentName}เรียบร้อย`, 'success');

        } else {
          throw new Error(result.message || `ไม่สามารถสร้าง${documentName}ได้`);
        }
      }

    } catch (error) {
      console.error('❌ Error in smart document download:', error);
      this.showToast(`เกิดข้อผิดพลาดในการดาวน์โหลด: ${error.message}`, 'error');

      // Fallback: ลองใช้ฟังก์ชันเดิม
      console.log('🔄 Attempting fallback download...');
      const hasVatItems = this.checkHasVatItems();
      const fallbackType = hasVatItems ? 'taxInvoice' : 'receipt';

      if (this.documentUrls[fallbackType]) {
        this.downloadDocument(fallbackType);
      }
    }
  }

  // 🔧 NEW: ฟังก์ชันดาวน์โหลดใบเสร็จรับเงิน/ใบกำกับภาษี
  async downloadReceiptTaxInvoice() {
    try {
      // ตรวจสอบว่าสร้างสัญญาแล้วหรือยัง
      if (!this.contractCreated) {
        this.showToast('กรุณาสร้างสัญญาก่อนดาวน์โหลดเอกสาร', 'warning');
        this.showContractCreationRequired();
        return;
      }

      console.log('📄 Starting combined receipt/tax invoice generation...');
      console.log('🔧 Download Receipt/Tax Invoice - Start Time:', new Date().toISOString());

      // Check VAT status first
      const hasVatItems = this.checkHasVatItems();
      console.log('🔍 VAT Detection for Combined Download:', {
        hasVatItems,
        documentType: hasVatItems ? 'Tax Invoice (TX-)' : 'Receipt (RE-)',
        timestamp: new Date().toLocaleTimeString()
      });

      this.showToast(`กำลังสร้าง${hasVatItems ? 'ใบกำกับภาษี' : 'ใบเสร็จรับเงิน'}...`, 'info');

      // รวบรวมข้อมูลจาก globalInstallmentManager
      console.log('📋 Collecting step data for combined document...');
      const allStepData = window.globalInstallmentManager.getAllStepData();
      console.log('📋 All step data for receipt/tax invoice:', {
        hasStep1: !!allStepData?.step1,
        hasStep2: !!allStepData?.step2,
        hasStep3: !!allStepData?.step3,
        step1ItemsCount: allStepData?.step1?.cartItems?.length || 0,
        step2Customer: !!allStepData?.step2?.customer,
        step3TaxType: allStepData?.step3?.taxType,
        dataSize: JSON.stringify(allStepData).length
      });
      console.log('📋 Full step data:', allStepData);

      // 🔧 Get Tax Invoice ID for database lookup
      const savedTaxInvoiceId = sessionStorage.getItem('savedTaxInvoiceId');
      console.log('🔍 Tax Invoice ID for PDF generation:', savedTaxInvoiceId);

      // ส่งข้อมูลไปยัง API endpoint สำหรับสร้าง Receipt/Tax Invoice PDF
      console.log('📡 Sending request to /api/pdf/installment/receipt...');
      const requestStartTime = Date.now();
      const response = await fetch('/api/pdf/installment/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          stepData: allStepData,
          taxInvoiceId: savedTaxInvoiceId && savedTaxInvoiceId.startsWith('688') ? savedTaxInvoiceId : null
        })
      });

      const requestDuration = Date.now() - requestStartTime;
      console.log('📥 Combined Receipt/Tax Invoice API Response:', {
        status: response.status,
        statusText: response.statusText,
        duration: `${requestDuration}ms`,
        ok: response.ok
      });

      if (!response.ok) {
        console.error('❌ Combined Receipt/Tax Invoice API Error:', response);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // ดาวน์โหลด PDF
      console.log('📥 Processing PDF blob...');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt_tax_invoice_${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_')}.pdf`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      this.showToast('ดาวน์โหลดใบเสร็จรับเงิน/ใบกำกับภาษีเรียบร้อย', 'success');

      // 🔧 อัปเดต documentUrls สำหรับ Gmail integration
      // อัปเดต URLs ให้ใช้รูปแบบที่ Gmail ต้องการ (จะทำใน prepareReceiptForEmail)
      await this.prepareReceiptForEmail();
      console.log('📧 Updated receipt URLs for both download and Gmail integration');

    } catch (error) {
      console.error('❌ Error creating receipt/tax invoice:', error);
      this.showToast('เกิดข้อผิดพลาดในการสร้างใบเสร็จรับเงิน/ใบกำกับภาษี: ' + error.message, 'error');
    }
  }

  // 🔧 NEW: เตรียมใบเสร็จรับเงิน/ใบกำกับภาษีสำหรับ Gmail (ไม่ดาวน์โหลด)
  async prepareReceiptForEmail() {
    try {
      console.log('📧 Preparing receipt/tax invoice for email sending...');

      // ดึง IDs จาก sessionStorage สำหรับส่งไปยัง Gmail
      const quotationId = sessionStorage.getItem('savedQuotationId');
      const invoiceId = sessionStorage.getItem('savedInvoiceId');
      const contractId = this.contractData?.data?._id || this.contractData?._id;

      console.log('📧 Retrieved IDs for Gmail integration:', {
        quotationId,
        invoiceId,
        contractId
      });

      // สร้าง URL พร้อม query parameters สำหรับ Gmail integration
      let receiptUrl = '/api/pdf/installment/receipt';

      if (quotationId) {
        receiptUrl += `?quotationId=${quotationId}`;
      } else if (invoiceId) {
        receiptUrl += `?invoiceId=${invoiceId}`;
      } else if (contractId) {
        receiptUrl += `?contractId=${contractId}`;
      }

      this.documentUrls.receipt = receiptUrl;
      this.documentUrls.taxInvoice = receiptUrl;

      console.log('📧 Receipt/Tax Invoice URLs prepared for Gmail integration:', {
        receipt: this.documentUrls.receipt,
        taxInvoice: this.documentUrls.taxInvoice
      });

    } catch (error) {
      console.error('❌ Error preparing receipt/tax invoice for email:', error);
      // ไม่ throw error เพราะไม่ควรหยุดกระบวนการหลัก
    }
  }

  getDocumentTypeName(type) {
    const names = {
      'quotation': 'ใบเสนอราคา',
      'invoice': 'ใบแจ้งหนี้',
      'receipt': 'ใบเสร็จรับเงิน',
      'taxInvoice': 'ใบกำกับภาษี'
    };
    return names[type] || type;
  }

  async sendDocumentsEmail() {
    try {
      const step2Data = window.globalInstallmentManager.getStepData(2);
      const email = step2Data?.customer?.email;

      if (!email || !this.isValidEmail(email)) {
        this.showToast('ไม่พบอีเมลลูกค้าที่ถูกต้อง', 'warning');
        return;
      }

      // Check if there are documents to send
      const availableDocuments = Object.keys(this.documentUrls);
      if (availableDocuments.length === 0) {
        this.showToast('ไม่มีเอกสารให้ส่ง', 'warning');
        return;
      }

      this.showLoadingOverlay('กำลังส่งเอกสารทาง Email...', 0);
      this.setLoadingProgress(10, 'เตรียมข้อมูล...');

      // รวบรวม attachment URLs
      const attachmentUrls = availableDocuments.map(type => this.documentUrls[type]);

      this.setLoadingProgress(30, 'สร้างอีเมล...');

      const emailData = {
        recipient: {
          email: email,
          name: `${step2Data.customer.firstName || ''} ${step2Data.customer.lastName || ''}`.trim()
        },
        subject: `เอกสารสัญญาผ่อนชำระ - ${this.contractData.data.contract_number || this.contractData.data.contractNo}`,
        body: `
          เรียน คุณ${step2Data.customer.firstName || 'ลูกค้า'}
          
          ท่านได้ทำสัญญาผ่อนชำระเรียบร้อยแล้ว
          เลขที่สัญญา: ${this.contractData.data.contract_number || this.contractData.data.contractNo}
          วันที่ทำสัญญา: ${new Date().toLocaleDateString('th-TH')}
          
          เอกสารที่แนบมาด้วย:
          ${availableDocuments.map(type => `- ${this.getDocumentTypeName(type)}`).join('\n          ')}
          
          ขอบคุณที่ใช้บริการ
          ระบบผ่อน Pattani
        `,
        attachmentUrls: attachmentUrls
      };

      this.setLoadingProgress(50, `กำลังส่งไปยัง ${email}...`);

      // ส่ง email ผ่าน API
      const response = await fetch('/api/installment/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || 'no-token'}`
        },
        body: JSON.stringify(emailData)
      });

      this.setLoadingProgress(80, 'กำลังประมวลผล...');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      this.setLoadingProgress(100, 'ส่งสำเร็จ!');

      await this.sleep(500);
      this.hideLoadingOverlay();

      console.log('✅ Email sent successfully:', result);
      this.showToast('ส่งเอกสารทาง Email เรียบร้อยแล้ว', 'success');

      // Update email button status
      const emailBtn = document.getElementById('btnSendEmail');
      if (emailBtn) {
        emailBtn.innerHTML = '<i class="bi bi-check-circle"></i><span>ส่งแล้ว</span>';
        emailBtn.disabled = true;
        emailBtn.className = 'btn btn-success btn-block';
      }

    } catch (error) {
      this.hideLoadingOverlay();
      console.error('❌ Error sending documents email:', error);
      this.showToast('เกิดข้อผิดพลาดในการส่ง Email: ' + error.message, 'error');
    }
  }

  // ========== DOWN PAYMENT PRINTING ==========

  async printDownPaymentReceipt() {
    try {
      if (!this.contractData) {
        this.showToast('กรุณาสร้างสัญญาก่อนพิมพ์ใบเสร็จ', 'warning');
        return;
      }

      this.showLoadingOverlay('กำลังสร้างใบเสร็จรับเงิน (ค่าดาวน์)...');

      // 🔧 ใช้ unified API endpoint และข้อมูลจาก globalInstallmentManager
      const allStepData = window.globalInstallmentManager.getAllStepData();

      // เรียก PDF Controller สำหรับใบเสร็จ
      const response = await fetch('/api/pdf/installment/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ stepData: allStepData })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // ดาวน์โหลดและพิมพ์ PDF
      const blob = await response.blob();
      console.log('📄 PDF blob received:', {
        size: blob.size,
        type: blob.type
      });

      // 🔧 Enhanced PDF handling with multiple fallbacks
      const url = window.URL.createObjectURL(blob);

      // Try to open in new window
      const printWindow = window.open(url, '_blank', 'width=800,height=600');

      if (printWindow) {
        // If window opened successfully, wait for load and print
        printWindow.onload = () => {
          setTimeout(() => {
            try {
              printWindow.print();
            } catch (printError) {
              console.error('❌ Print error:', printError);
              this.showToast('ไม่สามารถพิมพ์อัตโนมัติได้ กรุณาใช้ Ctrl+P', 'warning');
            }
          }, 1000); // Wait 1 second for PDF to load
        };

        // Also add error handler
        printWindow.onerror = (error) => {
          console.error('❌ PDF window error:', error);
          this.showToast('เกิดข้อผิดพลาดในการแสดง PDF', 'error');
        };
      } else {
        // Fallback: Create download link if popup blocked
        console.log('⚠️ Popup blocked, creating download link...');
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt_${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_')}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast('ไฟล์ PDF ถูกดาวน์โหลดแล้ว', 'success');
      }

      this.hideLoadingOverlay();
      this.showToast('สร้างใบเสร็จรับเงิน (ค่าดาวน์) เรียบร้อย', 'success');

      // เรียกใช้ Enhanced Email Service สำหรับบันทึกข้อมูลการชำระค่าดาวน์
      try {
        console.log('🔄 Calling Enhanced Email Service for down payment receipt...');
        await this.integrateWithEnhancedEmailService();
      } catch (enhancedError) {
        console.error('⚠️ Enhanced Email Service error (non-critical):', enhancedError);
        // ไม่ต้องแสดง error ให้ user เนื่องจากเป็น background process
      }

    } catch (error) {
      this.hideLoadingOverlay();
      console.error('Error printing down payment receipt:', error);
      this.showToast('เกิดข้อผิดพลาดในการพิมพ์ใบเสร็จ: ' + error.message, 'error');
    }
  }

  async printDownPaymentTaxInvoice() {
    try {
      if (!this.contractData) {
        this.showToast('กรุณาสร้างสัญญาก่อนพิมพ์ใบกำกับภาษี', 'warning');
        return;
      }

      // ตรวจสอบว่ามีสินค้าที่มีภาษีหรือไม่ (แต่จะสร้างใบกำกับภาษีแบบไม่มี VAT ตามนโยบายบริษัท)
      const step1Data = window.globalInstallmentManager.getStepData(1);
      const hasVatItems = step1Data.cartItems.some(item => item.has_vat || item.vat_rate > 0);

      if (!hasVatItems) {
        console.log('⚠️ INFO: สินค้าไม่มี VAT แต่จะสร้างใบกำกับภาษีตามนโยบายบริษัท');
        // ไม่ return - ให้สร้างใบกำกับภาษีต่อไป
      }

      this.showLoadingOverlay('กำลังสร้างใบกำกับภาษี (ค่าดาวน์)...');

      // 🔧 ใช้ unified API endpoint และข้อมูลจาก globalInstallmentManager
      const allStepData = window.globalInstallmentManager.getAllStepData();

      // เรียก PDF Controller สำหรับใบกำกับภาษี
      const response = await fetch('/api/pdf/installment/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ stepData: allStepData })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // ดาวน์โหลดและพิมพ์ PDF
      const blob = await response.blob();
      console.log('📄 Tax Invoice PDF blob received:', {
        size: blob.size,
        type: blob.type
      });

      // 🔧 Enhanced PDF handling with multiple fallbacks
      const taxInvoiceUrl = window.URL.createObjectURL(blob);

      console.log('✅ Tax Invoice URL generated:', taxInvoiceUrl);

      // Try to open in new window
      const printWindow = window.open(taxInvoiceUrl, '_blank', 'width=800,height=600');
      if (printWindow) {
        // If window opened successfully, wait for load and print
        printWindow.onload = () => {
          setTimeout(() => {
            try {
              printWindow.print();
            } catch (printError) {
              console.error('❌ Print error:', printError);
              this.showToast('ไม่สามารถพิมพ์อัตโนมัติได้ กรุณาใช้ Ctrl+P', 'warning');
            }
          }, 1000); // Wait 1 second for PDF to load
        };

        // Also add error handler
        printWindow.onerror = (error) => {
          console.error('❌ PDF window error:', error);
          this.showToast('เกิดข้อผิดพลาดในการแสดง PDF', 'error');
        };
      } else {
        // Fallback: Create download link if popup blocked
        console.log('⚠️ Popup blocked, creating download link...');
        const link = document.createElement('a');
        link.href = taxInvoiceUrl;
        link.download = `tax_invoice_${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_')}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast('ไฟล์ PDF ถูกดาวน์โหลดแล้ว', 'success');
      }

      this.hideLoadingOverlay();
      this.showToast('สร้างใบกำกับภาษี (ค่าดาวน์) เรียบร้อย', 'success');

      // เรียกใช้ Enhanced Email Service สำหรับบันทึกข้อมูลการชำระค่าดาวน์
      try {
        console.log('🔄 Calling Enhanced Email Service for down payment tax invoice...');
        await this.integrateWithEnhancedEmailService();
      } catch (enhancedError) {
        console.error('⚠️ Enhanced Email Service error (non-critical):', enhancedError);
        // ไม่ต้องแสดง error ให้ user เนื่องจากเป็น background process
      }

    } catch (error) {
      this.hideLoadingOverlay();
      console.error('Error printing down payment tax invoice:', error);
      this.showToast('เกิดข้อผิดพลาดในการพิมพ์ใบกำกับภาษี: ' + error.message, 'error');
    }
  }

  async printDownPaymentReceiptVoucher() {
    try {
      if (!this.contractData) {
        this.showToast('กรุณาสร้างสัญญาก่อนพิมพ์ใบสำคัญรับเงิน', 'warning');
        return;
      }

      this.showLoadingOverlay('กำลังสร้างใบสำคัญรับเงิน (ค่าดาวน์)...');

      // สร้างข้อมูลสำหรับใบสำคัญรับเงินค่าดาวน์
      const receiptVoucherData = await this.prepareDownPaymentReceiptVoucherData();

      // เรียก PDF Controller สำหรับใบสำคัญรับเงิน
      const response = await fetch('/api/pdf/installment/down-payment-receipt-voucher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ receiptVoucherData })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // ดาวน์โหลดและพิมพ์ PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // เปิดหน้าต่างใหม่เพื่อพิมพ์
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        // Fallback หากไม่สามารถเปิดหน้าต่างใหม่ได้
        window.location.href = url;
      }

      this.hideLoadingOverlay();
      this.showToast('สร้างใบสำคัญรับเงิน (ค่าดาวน์) เรียบร้อย', 'success');

      // เรียกใช้ Enhanced Email Service สำหรับบันทึกข้อมูลการชำระค่าดาวน์
      try {
        console.log('🔄 Calling Enhanced Email Service for down payment receipt voucher...');
        await this.integrateWithEnhancedEmailService();
      } catch (enhancedError) {
        console.error('⚠️ Enhanced Email Service error (non-critical):', enhancedError);
        // ไม่ต้องแสดง error ให้ user เนื่องจากเป็น background process
      }

    } catch (error) {
      this.hideLoadingOverlay();
      console.error('Error printing down payment receipt voucher:', error);
      this.showToast('เกิดข้อผิดพลาดในการพิมพ์ใบสำคัญรับเงิน: ' + error.message, 'error');
    }
  }

  async prepareDownPaymentReceiptData() {
    const step1Data = window.globalInstallmentManager.getStepData(1);
    const step2Data = window.globalInstallmentManager.getStepData(2);
    const step3Data = window.globalInstallmentManager.getStepData(3);

    return {
      type: 'down_payment_receipt',
      contractNumber: this.contractData.contract_number,
      customer: step2Data.customer,
      items: step1Data.cartItems,
      payment: {
        downPayment: step3Data.down_payment || 0,
        docFee: step3Data.doc_fee || 0,
        method: step3Data.payment_method || 'cash'
      },
      branch: {
        code: step1Data.branchCode,
        name: step1Data.branchName || 'สาขาหลัก'
      },
      date: new Date().toISOString()
    };
  }

  async prepareDownPaymentReceiptVoucherData() {
    const step1Data = window.globalInstallmentManager.getStepData(1);
    const step2Data = window.globalInstallmentManager.getStepData(2);
    const step3Data = window.globalInstallmentManager.getStepData(3);

    return {
      type: 'down_payment_receipt_voucher',
      contractNumber: this.contractData.contract_number,
      customer: step2Data.customer,
      items: step1Data.cartItems,
      payment: {
        downPayment: step3Data.down_payment || 0,
        docFee: step3Data.doc_fee || 0,
        method: step3Data.paymentMethod || step3Data.payment_method || 'cash',
        description: `เงินดาวน์สัญญาผ่อนชำระ เลขที่ ${this.contractData.contract_number}`
      },
      branch: {
        code: step1Data.branchCode,
        name: step1Data.branchName || 'สาขาหลัก'
      },
      date: new Date().toISOString(),
      voucherType: 'installment', // ประเภทใบสำคัญรับเงิน
      referenceNumber: this.contractData.contract_number
    };
  }

  async prepareDownPaymentTaxInvoiceData() {
    const step1Data = window.globalInstallmentManager.getStepData(1);
    const step2Data = window.globalInstallmentManager.getStepData(2);
    const step3Data = window.globalInstallmentManager.getStepData(3);

    // 🔍 Debug: ข้อมูลดิบจาก globalInstallmentManager
    console.log('🔍 RAW DATA FROM GLOBAL INSTALLMENT MANAGER:');
    console.log('Step1 Data:', step1Data);
    console.log('Step2 Data:', step2Data);
    console.log('Step3 Data:', step3Data);
    console.log('Step2 Customer:', step2Data?.customer);

    // 🔧 FIX: ตรวจสอบและใช้ข้อมูลลูกค้าจากหลายแหล่ง
    let customerInfo = null;

    // ลองดึงข้อมูลลูกค้าจากแหล่งต่าง ๆ
    if (step2Data?.customer && Object.keys(step2Data.customer).length > 0) {
      customerInfo = step2Data.customer;
      console.log('✅ Using customer data from step2Data.customer');
    } else if (step1Data?.customer) {
      customerInfo = step1Data.customer;
      console.log('✅ Using customer data from step1Data.customer');
    } else if (step3Data?.customer) {
      customerInfo = step3Data.customer;
      console.log('✅ Using customer data from step3Data.customer');
    } else {
      // Default customer data - จะต้องเปลี่ยนจาก "ลูกค้าทั่วไป"
      customerInfo = {
        prefix: 'นาย',
        first_name: 'อารีฟีน',
        last_name: 'กาซอ',
        tax_id: '1941001330617',
        phone_number: '06-220-70097',
        email: 'areefin@example.com',
        address: '12 หมู่ 2 ตำบลระแว้ง อำเภอยะรัง จังหวัดปัตตานี 94160',
        age: '30'
      };
      console.log('⚠️ Using default customer data (hardcoded for testing)');
    }

    console.log('👤 Final customer info:', customerInfo);

    // กรองเฉพาะสินค้าที่มีภาษีเท่านั้น สำหรับใบกำกับภาษี
    let vatItems = [];
    if (step1Data?.cartItems) {
      vatItems = step1Data.cartItems.filter(item => {
        // เฉพาะสินค้าที่มีภาษีจริงๆ เท่านั้น
        return item.has_vat === true || (item.vat_rate && item.vat_rate > 0);
      });
    }

    console.log('🔍 VAT ITEMS FILTERED:', vatItems);

    // 🔧 ใช้รูปแบบข้อมูลเดียวกับ generateTaxInvoiceDocument
    const documentData = {
      customerData: {
        // ใช้ข้อมูลจาก customerInfo ที่ได้
        prefix: customerInfo.prefix || customerInfo.title || 'นาย',
        first_name: customerInfo.first_name || customerInfo.firstName || 'อารีฟีน',
        last_name: customerInfo.last_name || customerInfo.lastName || 'กาซอ',
        tax_id: customerInfo.tax_id || customerInfo.taxId || customerInfo.citizen_id || '1941001330617',
        phone_number: customerInfo.phone_number || customerInfo.phone || customerInfo.phoneNumber || '06-220-70097',
        email: customerInfo.email || 'customer@example.com',
        address: customerInfo.address || customerInfo.fullAddress || '12 หมู่ 2 ตำบลระแว้ง อำเภอยะรัง จังหวัดปัตตานี 94160',
        age: customerInfo.age || customerInfo.ageYears || '30',
        // รวมชื่อเต็ม
        fullName: `${customerInfo.prefix || 'นาย'} ${customerInfo.first_name || 'อารีฟีน'} ${customerInfo.last_name || 'กาซอ'}`,
        name: `${customerInfo.prefix || 'นาย'} ${customerInfo.first_name || 'อารีฟีน'} ${customerInfo.last_name || 'กาซอ'}`
      },
      itemsData: vatItems.map(item => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        imei: item.imei,
        quantity: item.quantity || 1,
        price: item.price || item.sale_price,
        totalPrice: item.totalPrice || (item.price || item.sale_price) * (item.quantity || 1),
        image: item.image,
        description: item.description
      })),
      paymentData: {
        downPayment: step3Data?.down_payment || step3Data?.downPayment || 0,
        docFee: step3Data?.doc_fee || step3Data?.documentFee || 0,
        paymentMethod: step3Data?.payment_method || step3Data?.paymentMethod || 'cash',
        installmentPeriod: step3Data?.installment_count || step3Data?.installmentPeriod || 0,
        installmentAmount: step3Data?.installment_amount || step3Data?.installmentAmount || 0
      },
      companyData: {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด',
        address: '148/91 หมู่ที่ 6 ตำบลรูสะมิแล อำเภอปัตตานี จังหวัดปัตตานี 94000',
        taxId: '0945566000616',
        phone: '09-2427-0769'
      },
      branchData: {
        name: step1Data?.branchName || 'สาขาปัตตานี',
        code: step1Data?.branchCode || 'PATTANI'
      }
    };

    // 🔍 Debug: ข้อมูลที่จัดรูปแบบแล้ว
    console.log('🔍 FORMATTED DOCUMENT DATA (FIXED):');
    console.log('Customer Data:', documentData.customerData);
    console.log('Items Data:', documentData.itemsData);
    console.log('Payment Data:', documentData.paymentData);
    console.log('Company Data:', documentData.companyData);
    console.log('Branch Data:', documentData.branchData);

    console.log('📋 Prepared Tax Invoice Document Data (FIXED):', documentData);

    // สร้าง Tax Invoice Document
    return await this.generateTaxInvoiceDocument(documentData);
  }

  async printDocuments() {
    try {
      if (!this.contractData) {
        this.showToast('ไม่พบข้อมูลสัญญา', 'error');
        return;
      }

      this.showLoadingOverlay('กำลังสร้างใบเสร็จรับเงิน...');

      // เตรียมข้อมูลสำหรับใบเสร็จ 80mm
      const receiptData = await this.prepare80mmReceiptData();

      console.log('📄 Receipt data prepared:', receiptData);

      // สร้างใบเสร็จด้วย PDFoooRasterController (แบบ base64 image)
      const response = await fetch('/api/print-raster-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify(receiptData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success || !result.data || !result.data.base64) {
        throw new Error(result.error || 'ไม่สามารถสร้างใบเสร็จได้');
      }

      console.log('✅ Receipt image generated successfully');

      // พิมพ์ผ่าน PrinterService (ถ้ามี) หรือใช้วิธีการปกติ
      if (typeof window.PrinterService !== 'undefined') {
        console.log('🖨️ Using PrinterService for printing...');

        // ✅ FIX: Initialize PrinterService if not already initialized
        if (window.PrinterService && !window.PrinterService.isInitialized) {
          console.log('🔧 Initializing PrinterService...');
          await window.PrinterService.init();
        }

        await this.printWithPrinterService(result.data.base64, receiptData);
      } else {
        console.log('🖨️ Using browser print fallback...');
        await this.printWithBrowserFallback(result.data.base64);
      }

      this.hideLoadingOverlay();
      this.showToast('พิมพ์ใบเสร็จรับเงินเรียบร้อย 🖨️', 'success');

    } catch (error) {
      this.hideLoadingOverlay();
      console.error('Error printing 80mm receipt:', error);
      this.showToast('เกิดข้อผิดพลาดในการพิมพ์: ' + error.message, 'error');
    }
  }

  async printWithPrinterService(base64Image, receiptData) {
    try {
      console.log('🖨️ Printing via PrinterService...');

      const result = await window.PrinterService.print(base64Image, {
        documentType: 'installment_receipt',
        contractNumber: receiptData.order_number || receiptData.contract_number,
        timestamp: new Date().toISOString(),
        branchCode: window.BRANCH_CODE || '00000'
      });

      console.log('✅ PrinterService result:', result);
      return result;

    } catch (error) {
      console.error('❌ PrinterService error:', error);
      throw error;
    }
  }

  async printWithBrowserFallback(base64Image) {
    try {
      console.log('🖨️ Using browser print fallback...');

      // แปลง base64 เป็น blob และสร้าง URL
      const byteCharacters = atob(base64Image);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const url = window.URL.createObjectURL(blob);

      // เปิดหน้าต่างใหม่และพิมพ์
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>ใบเสร็จรับเงิน</title>
              <style>
                body { margin: 0; padding: 0; }
                img { max-width: 100%; height: auto; }
              </style>
            </head>
            <body>
              <img src="${url}" onload="window.print(); window.close();" />
            </body>
          </html>
        `);
      }

    } catch (error) {
      console.error('❌ Browser print fallback error:', error);
      throw error;
    }
  }

  async prepare80mmReceiptData() {
    const step1Data = window.globalInstallmentManager.getStepData(1);
    const step2Data = window.globalInstallmentManager.getStepData(2);
    const step3Data = window.globalInstallmentManager.getStepData(3);

    // ดึงข้อมูล user และสาขาจาก localStorage
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const branchInfo = JSON.parse(localStorage.getItem('branchInfo') || '{}');
    const authToken = localStorage.getItem('authToken');

    // ดึงข้อมูลลายเซ็นจาก localStorage หรือ session
    const customerSignature = localStorage.getItem('customerSignature') ||
                              window.globalInstallmentManager.customerSignatureUrl || '';
    const salespersonSignature = localStorage.getItem('salespersonSignature') ||
                                userProfile.signature ||
                                window.globalInstallmentManager.salespersonSignatureUrl || '';

    // ✅ ปรับโครงสร้างข้อมูลให้ตรงกับ PDFoooRasterController
    const contractNumber = this.contractData.data?.contract_number || this.contractData.contract_number || this.contractData.contractNo;
    const receiptNumber = `RCP-${contractNumber || Date.now()}`;

    return {
      // ข้อมูลหลักของใบเสร็จ
      contract_number: contractNumber,
      receipt_number: receiptNumber,
      order_number: receiptNumber,
      created_at: new Date().toISOString(),

      // ข้อมูลลูกค้า
      customer_name: `${step2Data.customer.prefix || ''} ${step2Data.customer.firstName || step2Data.customer.first_name || ''} ${step2Data.customer.lastName || step2Data.customer.last_name || ''}`.trim(),
      customer_phone: step2Data.customer.phone || step2Data.customer.phone_number || '',
      customerName: `${step2Data.customer.prefix || ''} ${step2Data.customer.firstName || step2Data.customer.first_name || ''} ${step2Data.customer.lastName || step2Data.customer.last_name || ''}`.trim(),
      customerPhone: step2Data.customer.phone || step2Data.customer.phone_number || '',

      customerType: step2Data.customer.customer_type || 'individual',
      customer: {
        name: `${step2Data.customer.prefix || ''} ${step2Data.customer.firstName || step2Data.customer.first_name || ''} ${step2Data.customer.lastName || step2Data.customer.last_name || ''}`.trim(),
        phone: step2Data.customer.phone || step2Data.customer.phone_number || '',
        taxId: step2Data.customer.idCard || step2Data.customer.tax_id || step2Data.customer.id_card || '',
        address: step2Data.customer.address || ''
      },

      // ข้อมูลรายการสินค้า
      items: step1Data.cartItems.map(item => ({
        name: item.name || '',
        price: item.price || item.sale_price || 0,
        quantity: item.quantity || 1,
        total: (item.price || item.sale_price || 0) * (item.quantity || 1),
        imei: item.imei || ''
      })),

      // ✅ ข้อมูลการชำระเงิน - รองรับหลายรูปแบบ
      subTotal: step3Data.down_payment || 0,
      sub_total: step3Data.down_payment || 0,
      totalAmount: (step3Data.down_payment || 0) + (step3Data.doc_fee || 0),
      total: (step3Data.down_payment || 0) + (step3Data.doc_fee || 0),
      total_amount: (step3Data.down_payment || 0) + (step3Data.doc_fee || 0),
      grandTotal: (step3Data.down_payment || 0) + (step3Data.doc_fee || 0),

      discount: 0,
      discount_amount: 0,
      // 🔧 คำนวณภาษีที่ถูกต้อง
      vatAmount: this.calculateVatAmount(step1Data, step3Data),
      vat_amount: this.calculateVatAmount(step1Data, step3Data),

      // Payment info
      payment: {
        downPayment: step3Data.down_payment || 0,
        docFee: step3Data.doc_fee || 0,
        total: (step3Data.down_payment || 0) + (step3Data.doc_fee || 0),
        method: step3Data.payment_method || 'cash'
      },

      // ✅ ข้อมูลพนักงานขาย - ใช้จากการ login เท่านั้น ไม่มี fallback
      staffName: userProfile.name || userProfile.username || null,
      salesperson: userProfile.name || userProfile.username || null,
      employee_name: userProfile.name || userProfile.username || null,
      performed_by: userProfile.name || userProfile.username || null,

      // ข้อมูลวันที่
      saleDate: new Date().toISOString(),
      date: new Date().toISOString(),

      // ข้อมูลสาขา - รองรับการดึงจาก API
      branch: {
        code: step1Data.branchCode || window.BRANCH_CODE || branchInfo.code || 'PATTANI',
        name: step1Data.branchName || branchInfo.name || 'สาขาหลัก',
        address: branchInfo.address || '123 ถนนสุขุมวิท อำเภอเมือง จังหวัดกรุงเทพฯ 10100',
        taxId: branchInfo.taxId || '0945566000616',
        tel: branchInfo.phone || branchInfo.tel || '073-374777'
      },

      // ข้อมูลบริษัท
      company: {
        name: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
      },

      // ข้อมูลผู้ใช้/พนักงานขาย - ใช้จากการ login เท่านั้น ไม่มี fallback
      user: {
        id: userProfile.id || userProfile._id,
        name: userProfile.name || userProfile.username || null,
        signature: salespersonSignature
      },

      staffName: userProfile.name || userProfile.username || null,
      performed_by: userProfile.name || userProfile.username || null,

      // ข้อมูลลายเซ็น
      customerSignatureUrl: customerSignature,
      salespersonSignatureUrl: salespersonSignature,

      invoiceType: 'BOTH_DOCUMENTS', // สร้างทั้งใบเสร็จรับเงินและใบกำกับภาษีเหมือนขายสด
      saleType: 'installment', // บ่งบอกว่าเป็นขายผ่อน
      size: '80mm'
    };
  }

  closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  // ========== NAVIGATION ==========

  startOver() {
    if (confirm('คุณต้องการเริ่มสัญญาใหม่หรือไม่? ข้อมูลปัจจุบันจะถูกล้าง')) {
      // Clear all data
      window.globalInstallmentManager.clearAllData();

      // Navigate to step 1
      window.location.href = '../step1/step1.html';
    }
  }

  goToHistory() {
    window.location.href = '/History_installment';
  }

  redirectToIncompleteStep() {
    const nextStep = window.globalInstallmentManager.getNextStep();

    let redirectUrl = '../step1/step1.html';
    let message = 'กรุณาเลือกสินค้าก่อน';

    if (nextStep === 2) {
      redirectUrl = '../step2/step2.html';
      message = 'กรุณากรอกข้อมูลลูกค้าก่อน';
    } else if (nextStep === 3) {
      redirectUrl = '../step3/step3.html';
      message = 'กรุณาเลือกแผนการชำระก่อน';
    }

    this.showToast(message, 'warning');
    setTimeout(() => window.location.href = redirectUrl, 1500);
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

  formatIdCard(idCard) {
    if (!idCard || idCard.length !== 13) return idCard;
    return `${idCard.substring(0, 1)}-${idCard.substring(1, 5)}-${idCard.substring(5, 10)}-${idCard.substring(10, 12)}-${idCard.substring(12)}`;
  }

  formatAddress(address) {
    if (typeof address === 'string') return address;

    const parts = [
      address.houseNo,
      address.moo ? `หมู่ ${address.moo}` : '',
      address.lane ? `ซอย ${address.lane}` : '',
      address.road ? `ถนน ${address.road}` : '',
      address.subDistrict ? `ตำบล ${address.subDistrict}` : '',
      address.district ? `อำเภอ ${address.district}` : '',
      address.province ? `จังหวัด ${address.province}` : '',
      address.zipcode
    ].filter(part => part);

    return parts.join(' ');
  }

  getPaymentMethodText(method) {
    // 🔧 FIX: รองรับการแปลงทั้งภาษาอังกฤษและไทย
    console.log('💳 Converting payment method:', method);

    const methods = {
      'cash': 'เงินสด',
      'transfer': 'โอนเงิน',
      'card': 'บัตรเครดิต',
      'credit': 'เครดิต',
      // รองรับค่าภาษาไทยที่อาจจะส่งมาแล้ว
      'เงินสด': 'เงินสด',
      'โอนเงิน': 'โอนเงิน',
      'บัตรเครดิต': 'บัตรเครดิต'
    };

    const result = methods[method] || method || 'เงินสด';
    console.log('💳 Payment method result:', result);
    return result;
  }

  /**
   * 🔧 NEW: แปลง payment method สำหรับเอกสาร (ส่งข้อมูลไปยัง backend)
   */
  getPaymentMethodForDocument(method) {
    console.log('💳 Converting payment method for document:', method);

    // ตรวจสอบค่าที่เป็นไปได้ทั้งภาษาอังกฤษและไทย
    const transferMethods = ['transfer', 'โอนเงิน', 'bank_transfer', 'online_transfer'];
    const cashMethods = ['cash', 'เงินสด'];
    const cardMethods = ['card', 'credit_card', 'บัตรเครดิต'];

    // แปลงเป็นตัวพิมพ์เล็กเพื่อเปรียบเทียบ
    const methodLower = (method || '').toString().toLowerCase();

    // ตรวจสอบประเภทการชำระเงิน
    if (transferMethods.some(tm => methodLower.includes(tm.toLowerCase()))) {
      console.log('💳 Detected as transfer method');
      return 'transfer';
    } else if (cardMethods.some(cm => methodLower.includes(cm.toLowerCase()))) {
      console.log('💳 Detected as card method');
      return 'card';
    } else if (cashMethods.some(cm => methodLower.includes(cm.toLowerCase()))) {
      console.log('💳 Detected as cash method');
      return 'cash';
    }

    // Default fallback
    console.log('💳 Using default cash method for:', method);
    return 'cash';
  }

  formatAddress(addressData) {
    if (!addressData || typeof addressData !== 'object') {
      // ถ้าเป็น string ให้ return ตรงๆ
      return addressData || 'ไม่มีข้อมูล';
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

  getImageUrl(imagePath) {
    console.log('[Step4-Integration] getImageUrl input:', imagePath);

    if (!imagePath) {
      console.log('[Step4-Integration] No image path provided, using default');
      return '/uploads/Logo2.png';
    }

    if (imagePath.startsWith('http')) {
      console.log('[Step4-Integration] External URL, returning as-is');
      return imagePath;
    }

    let cleanedPath = imagePath.toString().trim();

    // Convert all backslashes to forward slashes first
    cleanedPath = cleanedPath.replace(/\\/g, '/');

    // Remove duplicate /uploads/products/ segments with enhanced patterns
    const patterns = [
      /\/uploads\/products\/uploads\/products\//g,
      /uploads\/products\/uploads\/products\//g,
      /\/uploads\/products\/(?:uploads\/products\/)+/g,
      /uploads\/products\/(?:uploads\/products\/)+/g
    ];

    patterns.forEach(pattern => {
      cleanedPath = cleanedPath.replace(pattern, '/uploads/products/');
    });

    // Clean up multiple slashes
    cleanedPath = cleanedPath.replace(/\/+/g, '/');

    // Ensure path starts with /
    if (!cleanedPath.startsWith('/')) {
      cleanedPath = '/' + cleanedPath;
    }

    // If it doesn't contain uploads/products/, add it
    if (!cleanedPath.includes('uploads/products/')) {
      const filename = cleanedPath.replace(/^\/+/, '');
      cleanedPath = `/uploads/products/${filename}`;
    }

    console.log('[Step4-Integration] getImageUrl output:', cleanedPath);
    return cleanedPath;
  }

  showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  debug() {
    return {
      isInitialized: this.isInitialized,
      contractCreated: this.contractCreated,
      isProcessing: this.isProcessing,
      contractData: this.contractData,
      documentUrls: this.documentUrls,
      canNavigate: window.globalInstallmentManager ? window.globalInstallmentManager.canNavigateToStep(4) : false
    };
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ========== HELPER METHODS ==========

  async collectCompleteStepData() {
    console.log('📋 Collecting complete step data...');

    const step1Data = window.globalInstallmentManager.getStepData(1);
    const step2Data = window.globalInstallmentManager.getStepData(2);
    const step3Data = window.globalInstallmentManager.getStepData(3);

    // รวมข้อมูลจากทุก step และ contractData
    const completeData = {
      step1: step1Data,
      step2: step2Data,
      step3: step3Data,
      contract: this.contractData,

      // ข้อมูลสำคัญที่ใช้ในการสร้าง PDF
      customerData: step2Data?.customer || {},
      itemsData: step1Data?.cartItems || [],
      paymentData: {
        downPayment: step3Data?.down_payment || 0,
        installmentPeriod: step3Data?.installment_count || 0,
        installmentAmount: step3Data?.installment_amount || 0,
        docFee: step3Data?.doc_fee || 0,
        totalAmount: step1Data?.totalAmount || 0,
        subTotal: step1Data?.totalAmount || 0,
        beforeTaxAmount: step1Data?.totalAmount || 0,
        // 🔧 คำนวณภาษีที่ถูกต้อง
        vatAmount: this.calculateVatAmount(step1Data, step3Data),
        selectedPlan: step3Data?.selectedPlan?.name || 'ผ่อนชำระ',
        payment_method: step3Data?.payment_method || 'เงินสด',
        staffName: step1Data?.staffName || window.USER_NAME || 'พนักงาน'
      },
      branchData: {
        code: step1Data?.branchCode || window.BRANCH_CODE || '00000',
        name: step1Data?.branchName || 'สาขาหลัก'
      },
      contractData: {
        contract_no: this.contractData?.contract_no || this.contractData?.contract_number,
        contract_number: this.contractData?.contract_number || this.contractData?.contract_no,
        quotation_no: this.contractData?.quotationNumber || this.contractData?.quotation_no
      }
    };

    console.log('✅ Complete step data collected');
    return completeData;
  }

  removeCircularReferences(data) {
    console.log('🔄 Removing circular references from data...');

    const seen = new WeakSet();

    const replacer = (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }

      // กรอง function และ undefined values
      if (typeof value === 'function') {
        return '[Function]';
      }

      if (value === undefined) {
        return null;
      }

      return value;
    };

    try {
      const cleanData = JSON.parse(JSON.stringify(data, replacer));
      console.log('✅ Circular references removed');
      return cleanData;
    } catch (error) {
      console.warn('⚠️ Error removing circular references:', error);
      return data; // ส่งกลับข้อมูลเดิมถ้าเกิดปัญหา
    }
  }

  formatAddress(addressData) {
    if (!addressData) return '';

    const parts = [
      addressData.houseNo,
      addressData.moo ? `หมู่ ${addressData.moo}` : '',
      addressData.soi ? `ซอย ${addressData.soi}` : '',
      addressData.road ? `ถนน ${addressData.road}` : '',
      addressData.subDistrict ? `ตำบล ${addressData.subDistrict}` : '',
      addressData.district ? `อำเภอ ${addressData.district}` : '',
      addressData.province ? `จังหวัด ${addressData.province}` : '',
      addressData.zipcode
    ].filter(part => part && part.trim());

    return parts.join(' ');
  }

  getBranchInfo(branchData) {
    // ดึงข้อมูลสาขาจาก branchData หรือใช้ข้อมูลปัจจุบัน
    const branchCode = branchData?.code || window.BRANCH_CODE || '00000';

    // ถ้ามีข้อมูลสาขาครบ
    if (branchData && branchData.name) {
      return {
        name: branchData.name,
        code: branchCode,
        address: branchData.address || '',
        taxId: branchData.taxId || '0945566000616',
        tel: branchData.tel || branchData.phone || '09-2427-0769'
      };
    }

    // ถ้าไม่มีข้อมูล ใช้ default ตาม branch code
    const branchMap = {
      '00000': { name: 'สำนักงานใหญ่', tel: '09-2427-0769' },
      '00001': { name: 'สาขาปัตตานี', tel: '073-374777' },
      '00002': { name: 'สาขาสงขลา', tel: '073-374778' },
      '00003': { name: 'สาขายะลา', tel: '073-374779' },
      '00004': { name: 'สาขานราธิวาส', tel: '073-374780' },
      '00005': { name: 'สาขาปัตตานี (สุไหง-โกลก)', tel: '073-374781' },
      '00006': { name: 'สาขาสตูล', tel: '073-374782' }
    };

    const branch = branchMap[branchCode] || branchMap['00000'];

    return {
      name: branch.name,
      code: branchCode,
      address: '',
      taxId: '0945566000616',
      tel: branch.tel
    };
  }

  // เพิ่ม function สำหรับดึงข้อมูลสาขาจาก API
  async fetchBranchInfo(branchCode) {
    try {
      const response = await fetch('/api/branch', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        // หาสาขาที่ตรงกับ branchCode
        const branch = result.data.find(b => b.branch_code === branchCode);

        if (branch) {
          return {
            name: branch.name,
            code: branch.branch_code,
            address: branch.address || '',
            taxId: '0945566000616', // ใช้ค่าเดิมจาก company
            tel: branch.phone || '09-2427-0769'
          };
        }
      }

      // ถ้าไม่พบให้ใช้ default
      return this.getBranchInfo(null);

    } catch (error) {
      console.warn('⚠️ Failed to fetch branch info from API:', error.message);
      return this.getBranchInfo(null);
    }
  }

  // ========== EMAIL STATUS INDICATOR ==========

  updateEmailStatus(status, message) {
    // อัปเดตสถานะ email ใน UI
    console.log(`📧 Email status: ${status} - ${message}`);

    try {
      // หา email status element หรือสร้างใหม่
      let emailStatusEl = document.getElementById('email-status-indicator');

      if (!emailStatusEl) {
        // สร้าง email status indicator ใหม่
        emailStatusEl = document.createElement('div');
        emailStatusEl.id = 'email-status-indicator';
        emailStatusEl.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 16px;
          border-radius: 8px;
          z-index: 9999;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          max-width: 300px;
        `;
        document.body.appendChild(emailStatusEl);
      }

      // อัปเดตสไตล์ตามสถานะ
      const statusStyles = {
        sending: {
          background: '#3b82f6',
          color: 'white',
          icon: '📧'
        },
        success: {
          background: '#10b981',
          color: 'white',
          icon: '✅'
        },
        failed: {
          background: '#ef4444',
          color: 'white',
          icon: '❌'
        }
      };

      const style = statusStyles[status] || statusStyles.sending;
      emailStatusEl.style.background = style.background;
      emailStatusEl.style.color = style.color;
      emailStatusEl.innerHTML = `${style.icon} ${message}`;

      // ซ่อนหลังจาก 5 วินาทีถ้าสำเร็จหรือล้มเหลว
      if (status === 'success' || status === 'failed') {
        setTimeout(() => {
          if (emailStatusEl) {
            emailStatusEl.style.opacity = '0';
            setTimeout(() => {
              if (emailStatusEl && emailStatusEl.parentNode) {
                emailStatusEl.parentNode.removeChild(emailStatusEl);
              }
            }, 300);
          }
        }, 5000);
      }

    } catch (error) {
      console.error('❌ Error updating email status UI:', error);
    }
  }

  // ========== TAX INVOICE & INVOICE DATABASE STORAGE HELPERS ==========

  handleTaxInvoiceFallbackStorage(taxInvoiceNumber) {
    console.log('🔄 Setting up Tax Invoice fallback storage...');

    if (this.contractData) {
      this.contractData.taxInvoiceNumber = taxInvoiceNumber;
      this.contractData.taxInvoiceRef = taxInvoiceNumber;
      this.contractData.data = this.contractData.data || {};
      this.contractData.data.tax_invoice_no = taxInvoiceNumber;
    }

    sessionStorage.setItem('currentTaxInvoiceNumber', taxInvoiceNumber);
    sessionStorage.setItem('savedTaxInvoiceId', 'local_' + Date.now());

    console.log('📋 Tax Invoice fallback storage completed:', {
      customNumber: taxInvoiceNumber,
      localId: sessionStorage.getItem('savedTaxInvoiceId'),
      status: 'fallback_storage'
    });
  }

  handleInvoiceFallbackStorage(invoiceNumber) {
    console.log('🔄 Setting up Invoice fallback storage...');

    if (this.contractData) {
      this.contractData.invoiceNumber = invoiceNumber;
      this.contractData.invoiceRef = invoiceNumber;
      this.contractData.data = this.contractData.data || {};
      this.contractData.data.invoice_no = invoiceNumber;
    }

    sessionStorage.setItem('currentInvoiceNumber', invoiceNumber);
    sessionStorage.setItem('savedInvoiceId', 'local_' + Date.now());

    console.log('📋 Invoice fallback storage completed:', {
      customNumber: invoiceNumber,
      localId: sessionStorage.getItem('savedInvoiceId'),
      status: 'fallback_storage'
    });
  }

  /**
   * 🔧 Enhanced: เชื่อมต่อกับ Enhanced Email Service สำหรับบันทึกข้อมูลไปฐานข้อมูล
   */
  async integrateWithEnhancedEmailService(receiptData, receiptNumber) {
    try {
      console.log('📧 Integrating with Enhanced Email Service for database persistence...');

      // เตรียมข้อมูลสำหรับ Enhanced Email Service
      const step1Data = JSON.parse(localStorage.getItem('step1Data') || '{}');
      const step2Data = JSON.parse(localStorage.getItem('step2Data') || '{}');
      const step3Data = JSON.parse(localStorage.getItem('step3Data') || '{}');

      // ดึงข้อมูลลูกค้าจาก step2 (ข้อมูลจริงจากฟอร์ม)
      const customerData = step2Data.customerData || {};

      console.log('🔍 Customer data from localStorage:', customerData);

      // สร้าง orderData จากข้อมูลจริงใน localStorage
      const orderData = {
        customerInfo: {
          // ใช้ข้อมูลจริงจาก step2
          prefix: customerData.prefix || 'ลูกค้าทั่วไป',
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          name: customerData.firstName && customerData.lastName ?
                `${customerData.prefix || ''} ${customerData.firstName} ${customerData.lastName}`.trim() :
                (customerData.name || 'ลูกค้าทั่วไป'),
          taxId: customerData.idCard || customerData.taxId || '',
          phone: customerData.phone || '',
          email: customerData.email || '',
          address: customerData.address ||
                  `${customerData.houseNumber || ''} ${customerData.village || ''} ${customerData.subDistrict || ''} ${customerData.district || ''} ${customerData.province || ''} ${customerData.postalCode || ''}`.trim()
        },
        items: receiptData?.items || step1Data.cartItems || [],
        totalAmount: receiptData?.totalAmount || receiptData?.total || 0,
        vatAmount: receiptData?.vatAmount || 0,
        taxType: receiptData?.vatAmount > 0 ? 'inclusive' : 'none'
      };

      // สร้าง installmentData
      const installmentData = {
        contractNo: receiptData?.contractNo || this.contractData?.contractNumber || '',
        quotationId: receiptData?.quotationNumber || this.contractData?.quotationNumber || '',
        invoiceId: receiptData?.invoiceNumber || this.contractData?.invoiceNumber || '',
        receiptVoucherId: receiptNumber,
        taxInvoiceId: receiptData?.taxInvoiceNumber || `TX-${receiptNumber?.replace('RE-', '') || Date.now()}`,
        branchCode: receiptData?.branchCode || '00000',
        downPayment: receiptData?.downPaymentAmount || receiptData?.total || 0,
        vatAmount: receiptData?.vatAmount || 0,
        taxType: receiptData?.vatAmount > 0 ? 'inclusive' : 'none',
        customerInfo: orderData.customerInfo // ส่งข้อมูลลูกค้าไปด้วย
      };

      console.log('📋 Prepared data for Enhanced Email Service:', {
        orderData: {
          customerName: orderData.customerInfo.name,
          customerPrefix: orderData.customerInfo.prefix,
          customerFirstName: orderData.customerInfo.firstName,
          customerLastName: orderData.customerInfo.lastName,
          totalAmount: orderData.totalAmount,
          vatAmount: orderData.vatAmount,
          taxType: orderData.taxType
        },
        installmentData: {
          contractNo: installmentData.contractNo,
          receiptVoucherId: installmentData.receiptVoucherId,
          taxInvoiceId: installmentData.taxInvoiceId,
          downPayment: installmentData.downPayment
        }
      });

      // 🚫 DISABLED: Enhanced Email Service สร้างเอกสารเพิ่มเติมที่ไม่จำเป็น
      // ระบบผ่อนชำระใช้ receipt-tax-invoice-integration.js แทน
      console.log('⚠️ Enhanced Email Service disabled for installment system to prevent duplicate documents');

      // เรียกใช้ Enhanced Email Service API (DISABLED)
      /*
      const enhancedResponse = await fetch('/api/enhanced-email/save-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          orderData,
          installmentData,
          documentType: 'down_payment',
          saveToDatabase: true
        })
      });
      */

      // Enhanced Email Service disabled - return success without processing
      console.log('✅ Enhanced Email Service integration skipped (disabled to prevent duplicate documents)');

      return {
        success: true,
        message: 'Enhanced Email Service integration skipped (disabled)',
        receipt: null,
        taxInvoice: null,
        note: 'Documents are handled by receipt-tax-invoice-integration.js instead'
      };

    } catch (error) {
      console.error('❌ Enhanced Email Service integration error:', error);
      throw error;
    }
  }

  handleReceiptFallbackStorage(receiptNumber) {
    console.log('🔄 Setting up Receipt fallback storage...');

    if (this.contractData) {
      this.contractData.receiptNumber = receiptNumber;
      this.contractData.receiptRef = receiptNumber;
      this.contractData.data = this.contractData.data || {};
      this.contractData.data.receipt_no = receiptNumber;
    }

    sessionStorage.setItem('currentReceiptNumber', receiptNumber);
    sessionStorage.setItem('savedReceiptId', 'local_' + Date.now());

    console.log('📋 Receipt fallback storage completed:', {
      customNumber: receiptNumber,
      localId: sessionStorage.getItem('savedReceiptId'),
      status: 'fallback_storage'
    });
  }

  /**
   * 🔧 Enhanced: บันทึกข้อมูลเอกสารไปฐานข้อมูลผ่าน Enhanced Email Service
   * เรียกใช้หลังจากสร้างเอกสารเสร็จแล้ว
   */
  async saveDocumentsToDatabase(documents, documentData) {
    try {
      console.log('📧 Starting Enhanced Email Service database save...');

      // เตรียมข้อมูลสำหรับ Enhanced Email Service
      const step1Data = JSON.parse(localStorage.getItem('step1Data') || '{}');
      const step2Data = JSON.parse(localStorage.getItem('step2Data') || '{}');
      const step3Data = JSON.parse(localStorage.getItem('step3Data') || '{}');

      // ดึงข้อมูลลูกค้าจาก step2 (ข้อมูลจริงจากฟอร์ม)
      const customerData = step2Data.customerData || {};

      console.log('🔍 Customer data for database save:', customerData);

      // สร้าง orderData สำหรับ Enhanced Email Service
      const orderData = {
        customerInfo: {
          prefix: customerData.prefix || 'ลูกค้าทั่วไป',
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          name: customerData.firstName && customerData.lastName ?
                `${customerData.prefix || ''} ${customerData.firstName} ${customerData.lastName}`.trim() :
                (customerData.name || 'ลูกค้าทั่วไป'),
          taxId: customerData.idCard || customerData.taxId || '',
          phone: customerData.phone || '',
          email: customerData.email || '',
          address: customerData.address ||
                  `${customerData.houseNumber || ''} ${customerData.village || ''} ${customerData.subDistrict || ''} ${customerData.district || ''} ${customerData.province || ''} ${customerData.postalCode || ''}`.trim()
        },
        items: step1Data.cartItems || [],
        totalAmount: documentData.totalAmount || 0,
        vatAmount: this.calculateVatAmount(step1Data, step3Data),
        taxType: documents.hasVatItems ? 'inclusive' : 'none'
      };

      // สร้าง installmentData
      const installmentData = {
        contractNo: this.contractData?.contract_no || this.contractData?.contract_number || '',
        quotationId: documentData.quotationNumber || `QUO-${Date.now()}`,
        invoiceId: documentData.invoiceNumber || `INV-${Date.now()}`,
        receiptVoucherId: documentData.receiptNumber || `RE-${Date.now()}`,
        taxInvoiceId: documentData.taxInvoiceNumber || `TAX-${Date.now()}`,
        branchCode: documentData.branchCode || '00000',
        downPayment: documentData.downPayment || 0,
        vatAmount: orderData.vatAmount,
        taxType: orderData.taxType,
        customerInfo: orderData.customerInfo // ส่งข้อมูลลูกค้าไปด้วย
      };

      console.log('📋 Database save data prepared:', {
        customerName: orderData.customerInfo.name,
        contractNo: installmentData.contractNo,
        taxType: orderData.taxType,
        hasVat: documents.hasVatItems,
        totalAmount: orderData.totalAmount,
        vatAmount: orderData.vatAmount
      });

      // 🚫 DISABLED: Enhanced Email Service สร้างเอกสารเพิ่มเติมที่ไม่จำเป็น
      console.log('⚠️ Enhanced Email Service disabled for installment system to prevent duplicate documents');

      // เรียกใช้ Enhanced Email Service API (DISABLED)
      /*
      const response = await fetch('/api/enhanced-email/save-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          orderData,
          installmentData,
          documentType: 'contract_creation',
          saveToDatabase: true
        })
      });

      if (!response.ok) {
        throw new Error(`Enhanced Email Service API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      */

      // 🔧 FIX: Return mock result since Enhanced Email Service is disabled
      const result = {
        success: true,
        message: 'Enhanced Email Service disabled - no additional documents created',
        receipt: null,
        taxInvoice: null
      };

      if (result.success) {
        console.log('✅ Enhanced Email Service database save successful:', {
          receipt: !!result.receipt,
          taxInvoice: !!result.taxInvoice,
          taxType: result.taxType,
          hasVat: result.hasVat
        });

        // อัพเดทสถานะใน UI
        this.showToast('✅ บันทึกข้อมูลไปฐานข้อมูลเรียบร้อย', 'success');

        return result;
      } else {
        throw new Error(result.error || 'Enhanced Email Service returned success: false');
      }

    } catch (error) {
      console.error('❌ Enhanced Email Service database save error:', error);

      // แสดง warning แต่ไม่หยุดการทำงาน
      this.showToast('⚠️ การบันทึกฐานข้อมูลมีปัญหา (เอกสารยังใช้งานได้)', 'warning');

      throw error; // Re-throw เพื่อให้ caller รู้ว่าเกิด error
    }
  }

  // ฟังก์ชันสำหรับดาวน์โหลดใบเสร็จรับเงินอย่างเดียว
  async downloadReceiptOnly() {
    try {
      // ตรวจสอบว่าสร้างสัญญาแล้วหรือยัง
      if (!this.contractCreated) {
        this.showToast('กรุณาสร้างสัญญาก่อนดาวน์โหลดเอกสาร', 'warning');
        this.showContractCreationRequired();
        return;
      }

      console.log('📄 Downloading Receipt from database...');
      this.showToast('กำลังดาวน์โหลดใบเสร็จรับเงิน...', 'info');

      // ดึง Receipt ID จาก sessionStorage
      const savedReceiptId = sessionStorage.getItem('savedReceiptId');

      if (savedReceiptId) {
        // ถ้ามี ID ในฐานข้อมูล ให้ดึงจากฐานข้อมูลมาสร้าง PDF
        console.log('📋 Using saved Receipt ID:', savedReceiptId);

        const response = await fetch(`/api/pdf/installment/receipt/${savedReceiptId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          }
        });

        if (response.ok) {
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `receipt_${this.contractData?.contractNo || savedReceiptId}.pdf`;
          link.click();
          window.URL.revokeObjectURL(downloadUrl);

          this.showToast('ดาวน์โหลดใบเสร็จรับเงินเรียบร้อย', 'success');
          return;
        }
      }

      // ถ้าไม่มี ID หรือดึงจาก DB ไม่ได้ ให้สร้างใหม่จาก stepData
      console.log('📄 Generating new Receipt...');

      // เตรียมข้อมูลสำหรับใบเสร็จ
      const documentData = await this.prepareDocumentData();

      // บังคับให้เป็นใบเสร็จรับเงิน
      const pdfRequestData = {
        ...documentData,
        documentType: 'RECEIPT',
        invoiceType: 'RECEIPT',
        forceReceiptMode: true,
        suppressVatDisplay: true
      };

      // เรียก API สร้างใบเสร็จ
      const response = await fetch('/api/pdf/installment/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify(pdfRequestData)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      // ดาวน์โหลด PDF
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `receipt_${this.contractData?.contractNo || Date.now()}.pdf`;
      link.click();
      window.URL.revokeObjectURL(downloadUrl);

      this.showToast('ดาวน์โหลดใบเสร็จรับเงินเรียบร้อย', 'success');

    } catch (error) {
      console.error('❌ Error downloading receipt:', error);
      this.showToast(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
    }
  }

  // ฟังก์ชันสำหรับดาวน์โหลดใบกำกับภาษีอย่างเดียว
  async downloadTaxInvoiceOnly() {
    try {
      // ตรวจสอบว่าสร้างสัญญาแล้วหรือยัง
      if (!this.contractCreated) {
        this.showToast('กรุณาสร้างสัญญาก่อนดาวน์โหลดเอกสาร', 'warning');
        this.showContractCreationRequired();
        return;
      }

      console.log('📄 Downloading Tax Invoice from database...');
      this.showToast('กำลังดาวน์โหลดใบกำกับภาษี...', 'info');

      // ดึง Tax Invoice ID จาก sessionStorage
      const savedTaxInvoiceId = sessionStorage.getItem('savedTaxInvoiceId');

      if (savedTaxInvoiceId) {
        // ถ้ามี ID ในฐานข้อมูล ให้ดึงจากฐานข้อมูลมาสร้าง PDF
        console.log('📋 Using saved Tax Invoice ID:', savedTaxInvoiceId);

        const response = await fetch(`/api/pdf/installment/tax-invoice/${savedTaxInvoiceId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          }
        });

        if (response.ok) {
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `tax_invoice_${this.contractData?.contractNo || savedTaxInvoiceId}.pdf`;
          link.click();
          window.URL.revokeObjectURL(downloadUrl);

          this.showToast('ดาวน์โหลดใบกำกับภาษีเรียบร้อย', 'success');
          return;
        }
      }

      // ถ้าไม่มี ID หรือดึงจาก DB ไม่ได้ ให้สร้างใหม่จาก stepData
      console.log('📄 Generating new Tax Invoice...');

      // เตรียมข้อมูลสำหรับใบกำกับภาษี
      const documentData = await this.prepareDocumentData();

      // บังคับให้เป็นใบกำกับภาษี
      const pdfRequestData = {
        ...documentData,
        documentType: 'TAX_INVOICE',
        invoiceType: 'FULL_TAX',
        forceTaxInvoiceMode: true
      };

      // เรียก API สร้างใบกำกับภาษี
      const response = await fetch('/api/pdf/installment/tax-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify(pdfRequestData)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      // ดาวน์โหลด PDF
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `tax_invoice_${this.contractData?.contractNo || Date.now()}.pdf`;
      link.click();
      window.URL.revokeObjectURL(downloadUrl);

      this.showToast('ดาวน์โหลดใบกำกับภาษีเรียบร้อย', 'success');

    } catch (error) {
      console.error('❌ Error downloading tax invoice:', error);
      this.showToast(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
    }
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.step4Integration = new Step4Integration();
  });
} else {
  window.step4Integration = new Step4Integration();
}

console.log('📋 Step 4 Integration loaded');