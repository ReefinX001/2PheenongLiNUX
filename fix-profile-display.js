// Script to fix profile display in all HTML files
// แก้ไขการแสดงผล Profile ผู้ใช้งานในไฟล์ HTML ทั้งหมด

const fs = require('fs');
const path = require('path');

// New fetchUserProfile/loadUserProfile function
const NEW_FUNCTION = `    // โหลดข้อมูลผู้ใช้จาก API
    async function loadUserProfile() {
      try {
        const token = localStorage.getItem('authToken');

        // ตรวจสอบว่ามี token หรือไม่
        if (!token) {
          console.error('❌ No auth token found');
          alert('ไม่พบข้อมูลการเข้าสู่ระบบ กรุณา login ใหม่');
          window.location.href = '/login.html';
          return;
        }

        console.log('🔍 Fetching user profile from API...');

        const res = await fetch('/api/users/me', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Cache-Control': 'no-cache' // บังคับไม่ใช้ cache
          }
        });

        const json = await res.json();
        console.log('📦 API Response:', json);

        // ตรวจสอบ response status
        if (!res.ok) {
          console.error('❌ API Error:', res.status, json);

          // ถ้า token หมดอายุหรือไม่ถูกต้อง
          if (res.status === 401 || res.status === 403) {
            console.log('🚫 Unauthorized - clearing cache and redirecting');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userName');
            localStorage.removeItem('userPhoto');
            localStorage.removeItem('userInfo');
            alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
            window.location.href = '/login.html';
            return;
          }

          throw new Error(json.error || json.message || 'Failed to load profile');
        }

        if (!json.success || !json.data) {
          throw new Error('Invalid response from server');
        }

        // ดึงข้อมูลจาก response
        const userName = json.data.name || json.data.username || 'ผู้ใช้';
        const photoUrl = json.data.photoUrl || json.data.employee?.imageUrl || null;

        console.log('✅ User Profile Loaded:', { userName, photoUrl });

        // อัพเดท UI
        const nameEl = document.getElementById('employeeName');
        const photoEl = document.getElementById('employeePhoto');

        if (nameEl) {
          nameEl.textContent = userName;
          console.log('✅ Updated employeeName to:', userName);
        }

        if (photoEl) {
          if (photoUrl) {
            // แปลง photoUrl ให้ถูกต้อง
            let finalPhotoUrl = photoUrl;
            if (!photoUrl.startsWith('http://') && !photoUrl.startsWith('https://') && !photoUrl.startsWith('data:')) {
              if (!photoUrl.startsWith('/uploads/')) {
                finalPhotoUrl = '/uploads/employees/' + photoUrl;
              }
            }
            photoEl.src = finalPhotoUrl;
          } else {
            photoEl.src = '/img/default-avatar.svg';
          }
          console.log('✅ Updated employeePhoto to:', photoEl.src);
        }

        // บันทึกข้อมูลใหม่ใน localStorage (เขียนทับข้อมูลเก่า)
        localStorage.setItem('userName', userName);
        if (photoUrl) {
          localStorage.setItem('userPhoto', photoUrl);
        } else {
          localStorage.removeItem('userPhoto'); // ลบถ้าไม่มีรูป
        }

        console.log('✅ Profile update completed successfully');
      } catch (err) {
        console.error('❌ loadUserProfile error:', err);

        // แสดง error ที่ชัดเจนขึ้น
        const errorMessage = err.message || 'Unknown error';
        console.error('Error details:', errorMessage);

        // ถ้าเป็น network error หรือ server error ให้ลอง fallback แต่แสดงคำเตือน
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
          console.warn('⚠️ Network error - using cached data as fallback');

          const fallbackName = localStorage.getItem('userName') || 'ผู้ใช้';
          const fallbackPhoto = localStorage.getItem('userPhoto');

          const nameEl = document.getElementById('employeeName');
          const photoEl = document.getElementById('employeePhoto');

          if (nameEl) nameEl.textContent = fallbackName + ' (Offline)';
          if (photoEl) {
            if (fallbackPhoto) {
              photoEl.src = fallbackPhoto;
            } else {
              photoEl.src = '/img/default-avatar.svg';
            }
          }
        } else {
          // ถ้าเป็น error อื่นๆ ให้ clear cache และ redirect
          console.error('🚫 Critical error - clearing cache and redirecting');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userName');
          localStorage.removeItem('userPhoto');
          localStorage.removeItem('userInfo');
          alert('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้: ' + errorMessage);
          window.location.href = '/login.html';
        }
      }
    }`;

// Files to fix (exclude backups)
const filesToFix = [
  'views/account/sales_credit_notee.html',
  'views/pattani/payment_vouchers.html',
  'views/marketing/campaigns.html',
  'views/marketing/Promotion.html',
  'views/account/assets.html',
  'views/account/purchase_asset.html',
  'views/account/purchase_product.html',
  'views/HR/performance_reviews.html',
  'views/HR/attendance.html',
  'views/HR/employee_directory.html',
  'views/HR/leave_requests.html',
  'views/HR/notifications.html',
  'views/HR/App/New/dashboard.html',
  'views/HR/HR_Dashboard.html'
];

console.log('🚀 Starting profile display fix...\n');

let successCount = 0;
let errorCount = 0;
let skippedCount = 0;

for (const file of filesToFix) {
  const filePath = path.join(__dirname, file);

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipped: ${file} (not found)`);
      skippedCount++;
      continue;
    }

    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if already has API call (new version)
    if (content.includes('fetch(\'/api/users/me\'') || content.includes('fetch(`${API_BASE}/users/me`')) {
      console.log(`✅ Already fixed: ${file}`);
      skippedCount++;
      continue;
    }

    // Check if has old loadUserProfile function
    const hasOldLoadUserProfile = content.includes('function loadUserProfile()');

    if (!hasOldLoadUserProfile) {
      console.log(`⏭️  Skipped: ${file} (no loadUserProfile function)`);
      skippedCount++;
      continue;
    }

    // Find and replace old function
    // Pattern to match old loadUserProfile function
    const oldFunctionPattern = /function loadUserProfile\(\) \{[\s\S]*?\n    \}/;

    if (oldFunctionPattern.test(content)) {
      content = content.replace(oldFunctionPattern, NEW_FUNCTION);

      // Write back to file
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${file}`);
      successCount++;
    } else {
      console.log(`⚠️  Warning: ${file} - Could not find exact pattern to replace`);
      errorCount++;
    }

  } catch (error) {
    console.error(`❌ Error fixing ${file}:`, error.message);
    errorCount++;
  }
}

console.log('\n📊 Summary:');
console.log(`  ✅ Successfully fixed: ${successCount}`);
console.log(`  ⏭️  Skipped: ${skippedCount}`);
console.log(`  ❌ Errors: ${errorCount}`);
console.log(`  📝 Total processed: ${filesToFix.length}`);
