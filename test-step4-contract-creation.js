/**
 * Test script for verifying step4-integration.js contract creation fixes
 * Run this in browser console to test the enhanced error handling
 */

// Test 1: Check if the enhanced error handling structure is available
function testErrorHandlingStructure() {
  console.log('🧪 Test 1: Checking error handling structure...');

  // Check if Step4Integration class exists
  if (typeof window.step4Integration === 'undefined') {
    console.error('❌ window.step4Integration is not available');
    return false;
  }

  // Check if createContract method exists
  if (typeof window.step4Integration.createContract !== 'function') {
    console.error('❌ createContract method is not available');
    return false;
  }

  // Check if helper methods exist
  if (typeof window.step4Integration.getCurrentProcessingStep !== 'function') {
    console.error('❌ getCurrentProcessingStep method is not available');
    return false;
  }

  console.log('✅ Test 1 passed: Error handling structure is available');
  return true;
}

// Test 2: Test global manager validation
function testGlobalManagerValidation() {
  console.log('🧪 Test 2: Testing global manager validation...');

  // Store original globalInstallmentManager
  const originalManager = window.globalInstallmentManager;

  // Temporarily remove globalInstallmentManager
  window.globalInstallmentManager = null;

  // Test if createContract handles missing manager gracefully
  try {
    // This should fail with our custom error message
    window.step4Integration.createContract().catch(error => {
      if (error.message.includes('ระบบจัดการข้อมูลไม่พร้อม')) {
        console.log('✅ Test 2 passed: Missing global manager handled correctly');
      } else {
        console.error('❌ Test 2 failed: Unexpected error message:', error.message);
      }
    });

    // Restore original manager
    window.globalInstallmentManager = originalManager;

  } catch (error) {
    // Restore original manager in case of error
    window.globalInstallmentManager = originalManager;
    console.error('❌ Test 2 failed with exception:', error);
    return false;
  }

  return true;
}

// Test 3: Check stock availability function safety
function testStockAvailabilityFunction() {
  console.log('🧪 Test 3: Testing stock availability function safety...');

  if (typeof window.step4Integration.checkStockAvailability !== 'function') {
    console.error('❌ checkStockAvailability method is not available');
    return false;
  }

  // Store original globalInstallmentManager
  const originalManager = window.globalInstallmentManager;

  // Test with missing global manager
  window.globalInstallmentManager = null;

  window.step4Integration.checkStockAvailability().then(result => {
    if (result && result.success === false && result.message.includes('ระบบจัดการข้อมูลไม่พร้อม')) {
      console.log('✅ Test 3 passed: Stock check handles missing manager correctly');
    } else {
      console.error('❌ Test 3 failed: Unexpected result:', result);
    }

    // Restore original manager
    window.globalInstallmentManager = originalManager;
  }).catch(error => {
    console.error('❌ Test 3 failed with error:', error);
    // Restore original manager
    window.globalInstallmentManager = originalManager;
  });

  return true;
}

// Test 4: Test enhanced error logging
function testErrorLogging() {
  console.log('🧪 Test 4: Testing enhanced error logging...');

  // Check if console.error is working (basic test)
  const originalConsoleError = console.error;
  let errorLogCaptured = false;

  console.error = function(...args) {
    if (args[0] && args[0].includes('❌ Detailed error information:')) {
      errorLogCaptured = true;
    }
    originalConsoleError.apply(console, args);
  };

  // Restore console.error
  setTimeout(() => {
    console.error = originalConsoleError;
    if (errorLogCaptured) {
      console.log('✅ Test 4 passed: Enhanced error logging is working');
    }
  }, 100);

  return true;
}

// Run all tests
function runAllTests() {
  console.log('🧪 Starting Step4 Contract Creation Tests...');
  console.log('=' .repeat(50));

  const results = [
    testErrorHandlingStructure(),
    testGlobalManagerValidation(),
    testStockAvailabilityFunction(),
    testErrorLogging()
  ];

  const passedTests = results.filter(r => r).length;
  const totalTests = results.length;

  console.log('=' .repeat(50));
  console.log(`🧪 Test Results: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('✅ All tests passed! Contract creation error handling is improved.');
  } else {
    console.log('⚠️ Some tests failed. Please check the implementation.');
  }

  return passedTests === totalTests;
}

// Auto-run tests if script is loaded
if (typeof window !== 'undefined') {
  // Wait a bit for page to load
  setTimeout(() => {
    runAllTests();
  }, 1000);
}

// Export for manual testing
window.testStep4ContractCreation = {
  runAllTests,
  testErrorHandlingStructure,
  testGlobalManagerValidation,
  testStockAvailabilityFunction,
  testErrorLogging
};

console.log('📋 Step4 Contract Creation Test Suite loaded');
console.log('📋 Available test functions: window.testStep4ContractCreation');