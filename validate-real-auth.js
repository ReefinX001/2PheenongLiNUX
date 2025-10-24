// Real Authentication Data Validator
// Copy-paste ใน Browser Console เมื่ออยู่ที่หน้า step4.html
// ไม่มี hardcode data - ตรวจสอบข้อมูลจริงเท่านั้น

console.log('🔍 === REAL AUTHENTICATION DATA VALIDATOR ===');

// 1. ตรวจสอบ JWT Token
console.log('🔑 JWT Token Analysis:');
const authToken = localStorage.getItem('authToken');
if (authToken) {
  try {
    const tokenParts = authToken.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log('   ✅ JWT Token found and valid');
      console.log('   📋 Payload data:', {
        id: payload.id || payload.user_id || payload.userId || payload.sub || 'Missing',
        name: payload.name || payload.fullName || payload.displayName || 'Missing',
        username: payload.username || payload.user_name || 'Missing',
        branch: payload.branch_code || payload.branchCode || 'Missing',
        exp: new Date(payload.exp * 1000).toLocaleString() || 'Missing'
      });
    } else {
      console.log('   ❌ JWT Token format invalid');
    }
  } catch (e) {
    console.log('   ❌ JWT Token decode failed:', e.message);
  }
} else {
  console.log('   ❌ No JWT Token found - user not authenticated');
}

// 2. ตรวจสอบ localStorage
console.log('💾 LocalStorage Analysis:');
const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
const branchInfo = JSON.parse(localStorage.getItem('branchInfo') || '{}');

console.log('   userInfo keys:', Object.keys(userInfo));
console.log('   branchInfo keys:', Object.keys(branchInfo));

if (Object.keys(userInfo).length > 0) {
  console.log('   ✅ userInfo found:', {
    id: userInfo.id || userInfo.user_id || 'Missing',
    name: userInfo.name || userInfo.fullName || 'Missing',
    username: userInfo.username || 'Missing'
  });
} else {
  console.log('   ❌ userInfo is empty');
}

if (Object.keys(branchInfo).length > 0) {
  console.log('   ✅ branchInfo found:', {
    code: branchInfo.code || branchInfo.branch_code || 'Missing',
    name: branchInfo.name || branchInfo.branch_name || 'Missing'
  });
} else {
  console.log('   ❌ branchInfo is empty');
}

// 3. ทดสอบ API endpoint
console.log('🌐 API Connectivity Test:');
async function testAuthAPI() {
  if (!authToken) {
    console.log('   ❌ Cannot test API - no auth token');
    return;
  }

  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const userData = await response.json();
      console.log('   ✅ API call successful:', userData);
    } else {
      console.log('   ❌ API call failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('   ❌ API call error:', error.message);
  }
}

// 4. ทดสอบฟังก์ชัน getStep4Payment()
console.log('💳 Testing getStep4Payment():');
if (typeof getStep4Payment === 'function') {
  try {
    getStep4Payment().then(paymentData => {
      console.log('   ✅ Payment data retrieved:', {
        salesperson_id: paymentData.salesperson_id || 'NULL',
        salesperson_name: paymentData.salesperson_name || 'NULL',
        branch_code: paymentData.branch_code || 'NULL',
        created_by: paymentData.created_by || 'NULL'
      });

      // วิเคราะห์ผลลัพธ์
      const issues = [];
      if (!paymentData.salesperson_id) issues.push('salesperson_id is null');
      if (!paymentData.salesperson_name) issues.push('salesperson_name is null');
      if (!paymentData.branch_code) issues.push('branch_code is null');

      if (issues.length === 0) {
        console.log('   ✅ SUCCESS: All required data found');
      } else {
        console.log('   ❌ ISSUES FOUND:', issues);
      }
    }).catch(error => {
      console.log('   ❌ Function error:', error.message);
    });
  } catch (error) {
    console.log('   ❌ Function call failed:', error.message);
  }
} else {
  console.log('   ❌ getStep4Payment function not found');
}

// 5. รายงานสรุป
console.log('📊 Authentication Status Summary:');

const authStatus = {
  hasValidToken: !!authToken,
  hasUserData: Object.keys(userInfo).length > 0,
  hasBranchData: Object.keys(branchInfo).length > 0
};

if (authStatus.hasValidToken && authStatus.hasUserData) {
  console.log('   ✅ GOOD: User is properly authenticated');
} else {
  console.log('   ❌ PROBLEM: Authentication is incomplete');
  console.log('   💡 Recommended actions:');
  if (!authStatus.hasValidToken) {
    console.log('      - User needs to login again');
  }
  if (!authStatus.hasUserData) {
    console.log('      - Login process needs to save userInfo to localStorage');
  }
  if (!authStatus.hasBranchData) {
    console.log('      - Branch selection needs to save branchInfo to localStorage');
  }
}

// รัน API test
testAuthAPI();

console.log('🎯 === VALIDATION COMPLETE (NO HARDCODE DATA) ===');
