/**
 * Test Data Sync - ตรวจสอบการ sync ข้อมูลระหว่าง Step 1-4 และ backend
 * รันใน browser console: testDataSync()
 */

function testDataSync() {
  console.log('🔍 ===== TESTING DATA SYNC =====');

  // 1. ตรวจสอบ Step 1 Data
  console.log('\n📋 Step 1 Data:');
  const step1Sources = [
    'cartData',
    'cartItems',
    'step1_selectedProducts',
    'selectedProducts'
  ];

  let step1Data = null;
  for (const source of step1Sources) {
    try {
      const data = localStorage.getItem(source);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`✅ Found Step 1 data in ${source}:`, parsed);
          step1Data = parsed;
          break;
        }
      }
    } catch (error) {
      console.warn(`❌ Error parsing ${source}:`, error);
    }
  }

  if (!step1Data) {
    console.warn('⚠️ No Step 1 data found');
  }

  // 2. ตรวจสอบ Global Data Manager
  console.log('\n🌐 Global Data Manager:');
  if (typeof window.globalInstallmentManager !== 'undefined') {
    console.log('✅ Global Data Manager available');

    for (let step = 1; step <= 4; step++) {
      const stepData = window.globalInstallmentManager.getStepData(step);
      console.log(`📍 Step ${step} data:`, stepData);

      const isCompleted = window.globalInstallmentManager.isStepCompleted(step);
      console.log(`📍 Step ${step} completed: ${isCompleted}`);
    }

    // ทดสอบ navigation
    for (let step = 1; step <= 4; step++) {
      const canNavigate = window.globalInstallmentManager.canNavigateToStep(step);
      console.log(`🚪 Can navigate to Step ${step}: ${canNavigate}`);
    }
  } else {
    console.warn('❌ Global Data Manager not available');
  }

  // 3. ตรวจสอบ Step 3 Integration
  console.log('\n📊 Step 3 Integration:');
  if (typeof window.step3Integration !== 'undefined') {
    console.log('✅ Step 3 Integration available');
    console.log('📍 Cart Items:', window.step3Integration.cartItems);
    console.log('📍 Total Amount:', window.step3Integration.totalAmount);
    console.log('📍 Selected Plan:', window.step3Integration.selectedPlan);
    console.log('📍 Custom Plan:', window.step3Integration.customPlan);

    // ทดสอบ product info
    const productInfo = window.step3Integration.getProductInfo();
    console.log('📍 Product Info:', productInfo);
  } else {
    console.warn('❌ Step 3 Integration not available');
  }

  // 4. ตรวจสอบ localStorage Keys
  console.log('\n🗄️ All localStorage Keys:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes('step') || key.includes('installment') || key.includes('cart') || key.includes('plan')) {
      try {
        const value = localStorage.getItem(key);
        console.log(`📦 ${key}:`, JSON.parse(value));
      } catch (error) {
        console.log(`📦 ${key}:`, localStorage.getItem(key));
      }
    }
  }

  // 5. ตรวจสอบ Backend Connection
  console.log('\n🌐 Backend Connection Test:');
  testBackendConnection();

  // 6. ตรวจสอบ Form Elements
  console.log('\n📝 Form Elements Status:');
  const formElements = [
    'globalDocumentFee',
    'customDownPayment',
    'customInstallmentCount',
    'customInstallmentAmount'
  ];

  formElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      console.log(`✅ ${id}: ${element.value || 'empty'}`);
    } else {
      console.warn(`❌ ${id}: not found`);
    }
  });

  // 7. ตรวจสอบ Payment Method Selection
  console.log('\n💳 Payment Method:');
  const paymentMethodRadios = document.querySelectorAll('input[name="globalPaymentMethod"]');
  const selectedPaymentMethod = Array.from(paymentMethodRadios).find(radio => radio.checked);
  if (selectedPaymentMethod) {
    console.log(`✅ Selected payment method: ${selectedPaymentMethod.value}`);
  } else {
    console.warn('⚠️ No payment method selected');
  }

  console.log('\n🎯 ===== SYNC TEST COMPLETE =====');

  return {
    step1Data,
    globalDataManager: window.globalInstallmentManager,
    step3Integration: window.step3Integration,
    paymentMethod: selectedPaymentMethod?.value || null
  };
}

async function testBackendConnection() {
  try {
    // ทดสอบเชื่อมต่อ API
    const response = await fetch('/api/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log('✅ Backend connection: OK');
    } else {
      console.warn(`⚠️ Backend response: ${response.status}`);
    }
  } catch (error) {
    console.warn('❌ Backend connection failed:', error.message);
  }

  // ทดสอบ installment API
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const response = await fetch('/api/installment/test', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Installment API: OK');
      } else {
        console.warn(`⚠️ Installment API: ${response.status}`);
      }
    } else {
      console.warn('⚠️ No auth token found');
    }
  } catch (error) {
    console.warn('❌ Installment API failed:', error.message);
  }
}

// Quick fix functions
function fixDataSync() {
  console.log('🔧 Attempting to fix data sync issues...');

  // 1. Reload Step 3 Integration
  if (typeof window.step3Integration !== 'undefined') {
    console.log('🔄 Reloading Step 3 data...');
    window.step3Integration.loadOrderData();
    window.step3Integration.updateInstallmentInputs();
    window.step3Integration.generateRecommendedPlans();
  }

  // 2. Check Global Data Manager
  if (typeof window.globalInstallmentManager === 'undefined') {
    console.log('🔄 Reinitializing Global Data Manager...');
    // Attempt to reinitialize
    if (typeof GlobalInstallmentDataManager !== 'undefined') {
      window.globalInstallmentManager = new GlobalInstallmentDataManager();
    }
  }

  // 3. Clear and reload
  console.log('🧹 Clearing cached data...');
  const keysToKeep = ['token', 'userProfile', 'cartData', 'step1_selectedProducts'];
  const allKeys = Object.keys(localStorage);

  allKeys.forEach(key => {
    if (key.includes('installment') && !keysToKeep.includes(key)) {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed: ${key}`);
    }
  });

  console.log('✅ Data sync fix complete. Please refresh the page.');
}

// Export functions globally
window.testDataSync = testDataSync;
window.fixDataSync = fixDataSync;

console.log('📋 Data Sync Test loaded. Use:');
console.log('🔍 testDataSync() - ตรวจสอบการ sync ข้อมูล');
console.log('🔧 fixDataSync() - แก้ไขปัญหา sync');