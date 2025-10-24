/**
 * 🧪 Step 4 Payment Plan Debug Script
 * เปิดคอนโซลแล้วรันฟังก์ชันนี้เพื่อทดสอบการแสดงแผนการผ่อนชำระใน Step 4
 */

console.log('🧪 Step 4 Payment Plan Debug Script Loading...');

// ✅ Test function to debug Step 4 payment plan display
window.testStep4PaymentPlan = function() {
  console.log('🔍 Testing Step 4 Payment Plan Display...');
  console.log('==========================================');

  // 1. Check if we have cart items
  const cartItems = window.InstallmentProduct?.cartItems || window.cartItems || [];
  console.log('🛒 Cart Items:', cartItems.length, cartItems);

  // 2. Check selected payment plan
  const selectedPlan = window.getSelectedPlan ? window.getSelectedPlan() : null;
  console.log('📋 Selected Plan:', selectedPlan);

  // 3. Check customer data
  const customerData = window.InstallmentBusiness?.getCustomerFormData ?
    window.InstallmentBusiness.getCustomerFormData() :
    (window.getCustomerFormData ? window.getCustomerFormData() : {});
  console.log('👤 Customer Data:', customerData);

  // 4. Check total amount
  const totalAmount = window.InstallmentBusiness?.calculateTotalAmount ?
    window.InstallmentBusiness.calculateTotalAmount() :
    (window.calculateTotalAmount ? window.calculateTotalAmount() : 0);
  console.log('💰 Total Amount:', totalAmount);

  // 5. Test renderStep4Summary manually
  if (window.InstallmentBusiness?.renderStep4Summary) {
    console.log('📊 Testing InstallmentBusiness.renderStep4Summary...');
    try {
      window.InstallmentBusiness.renderStep4Summary({
        customerName: `${customerData.firstName || 'ทดสอบ'} ${customerData.lastName || 'ระบบ'}`,
        totalAmount: totalAmount,
        timestamp: new Date().toISOString()
      });
      console.log('✅ renderStep4Summary executed successfully');
    } catch (error) {
      console.error('❌ renderStep4Summary failed:', error);
    }
  } else if (window.renderStep4Summary) {
    console.log('📊 Testing global renderStep4Summary...');
    try {
      window.renderStep4Summary({
        customerName: `${customerData.firstName || 'ทดสอบ'} ${customerData.lastName || 'ระบบ'}`,
        totalAmount: totalAmount,
        timestamp: new Date().toISOString()
      });
      console.log('✅ renderStep4Summary executed successfully');
    } catch (error) {
      console.error('❌ renderStep4Summary failed:', error);
    }
  } else {
    console.error('❌ renderStep4Summary function not found!');
  }

  // 6. Force go to Step 4
  console.log('🔄 Force navigating to Step 4...');
  if (window.InstallmentMain?.goToStep) {
    window.InstallmentMain.goToStep(4);
  } else if (window.goToStep) {
    window.goToStep(4);
  } else {
    console.error('❌ goToStep function not found!');
  }

  console.log('==========================================');
  console.log('✅ Step 4 test completed');
};

// ✅ Function to create mock data for testing
window.createStep4MockData = function() {
  console.log('🔧 Creating mock data for Step 4 testing...');

  // Add mock cart items if empty
  if (!window.cartItems || window.cartItems.length === 0) {
    window.cartItems = [{
      _id: 'mock-1',
      name: 'iPhone 15 Pro',
      model: '256GB',
      brand: 'Apple',
      price: 45900,
      quantity: 1,
      total: 45900,
      imei: '123456789012345'
    }];
    console.log('✅ Mock cart items added');
  }

  // Set mock customer data
  const customerFields = {
    'customerFirstName': 'สมชาย',
    'customerLastName': 'ใจดี',
    'customerIdCard': '1234567890123',
    'customerPhone': '0812345678',
    'customerEmail': 'somchai@example.com'
  };

  Object.entries(customerFields).forEach(([fieldId, value]) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = value;
      console.log(`✅ Set ${fieldId}: ${value}`);
    }
  });

  // Set mock payment plan
  const plan1Radio = document.querySelector('input[name="installmentPlan"][value*="plan1"]');
  if (plan1Radio) {
    plan1Radio.checked = true;
    console.log('✅ Mock payment plan selected');
  }

  console.log('✅ Mock data creation completed');
  return true;
};

// ✅ Complete Step 4 test with mock data
window.fullStep4Test = function() {
  console.log('🚀 Running complete Step 4 test...');

  // Create mock data
  window.createStep4MockData();

  // Wait a bit for data to settle
  setTimeout(() => {
    // Run Step 4 test
    window.testStep4PaymentPlan();
  }, 500);
};

console.log('✅ Step 4 Debug Functions Ready!');
console.log('📋 Available functions:');
console.log('  - testStep4PaymentPlan() - Test Step 4 display');
console.log('  - createStep4MockData() - Create mock test data');
console.log('  - fullStep4Test() - Complete test with mock data');
console.log('');
console.log('🔧 Quick Start: Run fullStep4Test() to test everything');
