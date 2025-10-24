// Marketing User Profile Manager
// ไฟล์สำหรับจัดการการแสดงข้อมูลผู้ใช้ใน sidebar

// ฟังก์ชันดึง token จาก localStorage
function getAuthToken() {
  return localStorage.getItem('authToken') || localStorage.getItem('token');
}

// ฟังก์ชันตรวจสอบความถูกต้องของ token
function isTokenValid(token) {
  if (!token) return false;

  try {
    // Parse JWT token to check expiration (basic check)
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);

    // Check if token is expired
    if (payload.exp && payload.exp < currentTime) {
      console.warn('Token is expired');
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Error validating token:', error);
    return false;
  }
}

// ฟังก์ชันโหลดข้อมูลผู้ใช้ (ใช้ API เดียวกับ PO.html)
async function loadUserProfile() {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn('No auth token found');
      setFallbackUserInfo();
      return;
    }

    // Check if token is valid before making API call
    if (!isTokenValid(token)) {
      console.warn('Token is invalid or expired');
      // Clear invalid token
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      showAuthenticationError();
      return;
    }

    // ใช้ API endpoint เดียวกับ PO.html ที่ทำงานได้
    const response = await fetch('/api/users/me', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });

    // ตรวจสอบ Content-Type ก่อน parse JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // ถ้าไม่ใช่ JSON (เช่น HTML error page) ให้ throw error
      const text = await response.text();
      console.warn('API returned non-JSON response:', text.substring(0, 100) + '...');
      throw new Error('API returned HTML instead of JSON (likely server error)');
    }

    const result = await response.json();

    if (!response.ok) {
      // Handle 401 Unauthorized specifically
      if (response.status === 401) {
        console.warn('Authentication expired, clearing tokens...');
        // Clear all authentication data
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userProfile');

        // Show user-friendly message
        throw new Error('เซสชันไม่ถูกต้องหรือหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่');
      }
      throw new Error(result.error || 'Load profile failed');
    }

    if (!result.success) {
      throw new Error(result.error || 'Load profile failed');
    }

    const userData = result.data;
    console.log('✅ Successfully loaded user data from /api/users/me:', userData);

    if (userData) {
      updateUserInterface(userData);
      // บันทึกข้อมูลลง localStorage สำหรับการใช้งานครั้งต่อไป
      localStorage.setItem('userProfile', JSON.stringify(userData));
    } else {
      console.warn('No user data received');
      setFallbackUserInfo();
    }

  } catch (error) {
    console.error('Error in loadUserProfile:', error);

    // Handle authentication errors specifically
    if (error.message.includes('เซสชันไม่ถูกต้องหรือหมดอายุแล้ว')) {
      // Show authentication error to user
      showAuthenticationError();
    }

    setFallbackUserInfo();
  }
}

// ฟังก์ชันอัพเดท UI
function updateUserInterface(userData) {
  // อัพเดทชื่อผู้ใช้
  const employeeNameElement = document.getElementById('employeeName');
  if (employeeNameElement) {
    const displayName = userData.name ||
                       userData.fullName ||
                       userData.firstName ||
                       userData.username ||
                       userData.email?.split('@')[0] ||
                       'ผู้ใช้';
    employeeNameElement.textContent = displayName;
  }

  // อัพเดทรูปผู้ใช้
  const employeePhotoElement = document.getElementById('employeePhoto');
  if (employeePhotoElement && userData.photoUrl) {
    employeePhotoElement.src = userData.photoUrl;
    employeePhotoElement.onerror = function() {
      this.src = generateAvatarUrl(userData.name || userData.fullName || userData.username || 'User');
    };
  } else if (employeePhotoElement) {
    // สร้าง avatar URL จากชื่อ
    employeePhotoElement.src = generateAvatarUrl(userData.name || userData.fullName || userData.username || 'User');
  }
}

// ฟังก์ชันสำหรับข้อมูล fallback
function setFallbackUserInfo() {
  // พยายามใช้ข้อมูลจาก localStorage
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  const userData = { ...userInfo, ...userProfile };

  if (userData && Object.keys(userData).length > 0) {
    updateUserInterface(userData);
  } else {
    // ใช้ข้อมูลเริ่มต้น
    const employeeNameElement = document.getElementById('employeeName');
    if (employeeNameElement) {
      employeeNameElement.textContent = 'ผู้ใช้';
    }

    const employeePhotoElement = document.getElementById('employeePhoto');
    if (employeePhotoElement) {
      employeePhotoElement.src = generateAvatarUrl('ผู้ใช้');
    }
  }
}

// ฟังก์ชันสร้าง avatar URL
function generateAvatarUrl(name) {
  const encodedName = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encodedName}&size=36&background=3B82F6&color=fff&rounded=true`;
}

// ฟังก์ชันแสดงข้อผิดพลาดการยืนยันตัวตน
function showAuthenticationError() {
  // Try to show a user-friendly notification
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'warning',
      title: 'เซสชันหมดอายุ',
      text: 'เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่',
      confirmButtonText: 'เข้าสู่ระบบ',
      allowOutsideClick: false
    }).then((result) => {
      if (result.isConfirmed) {
        // Redirect to login page
        window.location.href = '/login.html';
      }
    });
  } else {
    // Fallback to alert if SweetAlert is not available
    const userConfirm = confirm('เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่\n\nกดตกลงเพื่อไปยังหน้าเข้าสู่ระบบ');
    if (userConfirm) {
      window.location.href = '/login.html';
    }
  }
}

// ฟังก์ชันเริ่มต้น - เรียกใช้เมื่อโหลดหน้า
function initializeUserProfile() {
  // เรียกใช้ทันทีเมื่อ DOM พร้อม
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadUserProfile);
  } else {
    loadUserProfile();
  }
}

// Export functions สำหรับใช้ในหน้าอื่น
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadUserProfile,
    updateUserInterface,
    setFallbackUserInfo,
    generateAvatarUrl,
    initializeUserProfile
  };
}

// เริ่มต้นการทำงาน
initializeUserProfile();