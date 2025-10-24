// Test script for payment validation debugging
// ใช้ในคอนโซลของเบราว์เซอร์เพื่อทดสอบการแก้ไข

console.log('🧪 Payment Validation Test Script');

// ฟังก์ชันทดสอบหลัก
window.testPaymentValidation = function() {
  console.log('🧪 === PAYMENT VALIDATION TEST ===');

  // ตรวจสอบข้อมูลปัจจุบัน
  console.log('1. Current cart items:', window.InstallmentProduct?.cartItems || []);
  console.log('2. Current plan:', window._autoPlan);

  // ทดสอบการคำนวณยอดรวม
  const cartItems = window.InstallmentProduct?.cartItems || [];
  const totalAmount = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price || 0);
    const quantity = parseInt(item.quantity || item.qty || 1);
    return sum + (price * quantity);
  }, 0);

  console.log('3. Calculated total:', totalAmount);

  // ทดสอบการตรวจสอบเงินดาวน์
  const downPayment = window._autoPlan?.down || window._autoPlan?.downPayment || 0;
  const isValid = downPayment <= totalAmount;

  console.log('4. Validation result:', {
    downPayment: downPayment,
    totalAmount: totalAmount,
    isValid: isValid,
    difference: downPayment - totalAmount
  });

  // แสดงข้อเสนอแนะ
  if (!isValid) {
    const suggestedDown = Math.floor(totalAmount * 0.8);
    console.log('5. 🔧 Suggested fix: Set down payment to', suggestedDown);

    // ทดสอบ auto-fix
    if (window.fixPaymentPlans) {
      console.log('6. 🔧 Running auto-fix...');
      window.fixPaymentPlans();
    }
  } else {
    console.log('5. ✅ Validation passed!');
  }

  return {
    totalAmount,
    downPayment,
    isValid
  };
};

// ฟังก์ชันสำหรับดู debug ข้อมูลทั้งหมด
window.debugAllData = function() {
  console.log('🔍 === COMPLETE DEBUG DATA ===');
  console.log('CartItems:', window.InstallmentProduct?.cartItems);
  console.log('AutoPlan:', window._autoPlan);
  console.log('ManualInst:', window._manualInst);
  console.log('SelectedManualOption:', window.selectedManualOption);
  console.log('Available functions:', {
    fixPaymentPlans: typeof window.fixPaymentPlans,
    validateBeforeSubmit: typeof window.validateBeforeSubmit,
    debugPaymentPlan: typeof window.debugPaymentPlan,
    saveInstallmentData: typeof window.saveInstallmentData
  });

  // ตรวจสอบ InstallmentBusiness module
  console.log('InstallmentBusiness:', {
    exists: !!window.InstallmentBusiness,
    methods: window.InstallmentBusiness ? Object.keys(window.InstallmentBusiness) : [],
    saveMethod: !!(window.InstallmentBusiness && window.InstallmentBusiness.saveInstallmentData)
  });

  return 'Debug complete - check console output above';
};

// ฟังก์ชันสำหรับทดสอบการส่งข้อมูล (แบบจำลอง)
window.testSubmission = function() {
  console.log('🚀 Testing submission validation...');

  try {
    // ทดสอบ validateBeforeSubmit
    if (window.validateBeforeSubmit) {
      window.validateBeforeSubmit();
      console.log('✅ Validation passed');
    } else {
      console.log('⚠️ validateBeforeSubmit function not found');
    }

    // ทดสอบ saveInstallmentData (จำลอง)
    console.log('📤 Would call saveInstallmentData here...');

    return true;
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return false;
  }
};

// Auto-run basic test
setTimeout(() => {
  console.log('🎯 Running auto-test...');
  window.testPaymentValidation();
}, 2000);

console.log('📋 Available test functions:');
console.log('- window.testPaymentValidation()');
console.log('- window.debugAllData()');
console.log('- window.testSubmission()');
console.log('- window.fixPaymentPlans()');
console.log('- window.validateBeforeSubmit()');
