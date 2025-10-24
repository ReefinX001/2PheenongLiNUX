/**
 * HR Sidebar Component JavaScript
 * ไฟล์นี้จัดการฟังก์ชันการทำงานของ sidebar สำหรับระบบ HR
 */

class HRSidebar {
  constructor() {
    this.API_BASE = '/api';
    this.token = localStorage.getItem('authToken');
    this.currentPage = this.getCurrentPage();

    this.init();
  }

  // ตรวจสอบหน้าปัจจุบัน
  getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().replace('.html', '');
    return filename || 'hr_dashboard';
  }

  // เริ่มต้นการทำงาน
  async init() {
    await this.loadSidebar();
    this.setupEventListeners();
    this.setActiveMenuItem();
    this.checkDarkMode();
    await this.fetchUserProfile();
  }

  // โหลด sidebar HTML
  async loadSidebar() {
    try {
      const response = await fetch('components/sidebar.html');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const sidebarHTML = await response.text();

      // แทรก sidebar ลงในหน้า
      const sidebarContainer = document.getElementById('sidebar-container');
      if (sidebarContainer) {
        sidebarContainer.innerHTML = sidebarHTML;
      } else {
        // ถ้าไม่มี container ให้สร้างใหม่
        document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
      }
    } catch (error) {
      console.error('Error loading sidebar:', error);
      console.warn('Falling back to inline sidebar HTML');
      // Fallback: สร้าง sidebar แบบ inline ถ้าโหลดไฟล์ไม่ได้
      this.createFallbackSidebar();
    }
  }

  // สร้าง sidebar แบบ fallback ถ้าโหลดไฟล์ไม่ได้
  createFallbackSidebar() {
    const sidebarHTML = `
      <!-- HR Sidebar Component -->
      <aside id="sidebar" class="fixed top-0 left-0 w-64 h-full bg-white dark:bg-gray-800 flex flex-col transition-all duration-300 z-40">
        <a href="hr_dashboard">
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <img src="/uploads/Logo2.png" alt="Logo" class="w-full h-auto"/>
          </div>
        </a>
        <div class="flex-1 p-4 overflow-y-auto">
          <ul class="flex flex-col w-full space-y-1">
            <li>
              <a href="hr_dashboard" class="flex items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" data-page="hr_dashboard">
                <i class="bi bi-speedometer2 text-xl text-indigo-600 dark:text-indigo-400"></i>
                <span class="ml-3">แดชบอร์ด</span>
              </a>
            </li>
            <li>
              <a href="employee_directory" class="flex items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" data-page="employee_directory">
                <i class="bi bi-people-fill text-xl text-blue-500 dark:text-blue-400"></i>
                <span class="ml-3">พนักงาน</span>
              </a>
            </li>
            <li>
              <a href="attendance" class="flex items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" data-page="attendance">
                <i class="bi bi-clock text-xl text-green-500 dark:text-green-400"></i>
                <span class="ml-3">บันทึกเวลาเข้า-ออก</span>
              </a>
            </li>
            <li>
              <a href="leave_requests" class="flex items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" data-page="leave_requests">
                <i class="bi bi-file-earmark-text text-xl text-yellow-500 dark:text-yellow-300"></i>
                <span class="ml-3">การลา</span>
              </a>
            </li>
            <li>
              <a href="payroll" class="flex items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" data-page="payroll">
                <i class="bi bi-cash-stack text-xl text-emerald-500 dark:text-emerald-400"></i>
                <span class="ml-3">เงินเดือน</span>
              </a>
            </li>
            <li>
              <a href="performance_reviews" class="flex items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" data-page="performance_reviews">
                <i class="bi bi-award text-xl text-purple-500 dark:text-purple-400"></i>
                <span class="ml-3">ประเมินผลงาน</span>
              </a>
            </li>
            <li>
              <a href="bonus_list" class="flex items-center px-4 h-12 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" data-page="bonus_list">
                <i class="bi bi-gift text-xl text-pink-500 dark:text-pink-400 mr-3"></i>
                <span>รายการโบนัส</span>
              </a>
            </li>
            <li class="mt-4">
              <a href="role_management" class="flex items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" data-page="role_management">
                <i class="bi bi-gear text-xl text-gray-600 dark:text-gray-300"></i>
                <span class="ml-3">การตั้งค่า</span>
              </a>
            </li>
            <li class="mt-6">
              <button id="btnToggleDark" class="flex items-center h-12 px-4 rounded-lg w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <i class="bi bi-moon text-xl text-slate-600 dark:text-slate-300"></i>
                <span class="ml-3" id="darkModeLabel">Dark Mode</span>
              </button>
            </li>
            <li>
              <button id="btnLogoutSidebar" class="flex items-center h-12 px-4 rounded-lg w-full text-left text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <i class="bi bi-box-arrow-right text-xl"></i>
                <span class="ml-3">ออกจากระบบ</span>
              </button>
            </li>
            <li>
              <a href="employee_directory.html" id="profile" class="flex items-center h-12 px-4 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                <img id="employeePhoto" src="/api/placeholder/36/36" alt="Employee Photo" class="w-10 h-10 rounded-full mr-3"/>
                <span id="employeeName">Loading...</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      <!-- Toggle Sidebar Button -->
      <button id="btnToggleMenu" class="fixed left-0 top-1/2 bg-blue-600 text-white p-2 rounded-r-full shadow-lg z-50 hover:bg-blue-700">
        <i class="bi bi-chevron-left"></i>
      </button>
    `;

    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
      sidebarContainer.innerHTML = sidebarHTML;
    } else {
      document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    }
  }

  // ตั้งค่า Event Listeners
  setupEventListeners() {
    const sidebar = document.getElementById('sidebar');
    const btnToggleMenu = document.getElementById('btnToggleMenu');
    const btnToggleDark = document.getElementById('btnToggleDark');
    const btnLogoutSidebar = document.getElementById('btnLogoutSidebar');

    // Toggle sidebar
    if (btnToggleMenu) {
      btnToggleMenu.addEventListener('click', () => this.toggleSidebar());
    }

    // Dark mode toggle
    if (btnToggleDark) {
      btnToggleDark.addEventListener('click', () => this.toggleDarkMode());
    }

    // Logout
    if (btnLogoutSidebar) {
      btnLogoutSidebar.addEventListener('click', () => this.logout());
    }

    // Menu toggle สำหรับ responsive
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => this.toggleSidebar());
    }
  }

  // ตั้งค่าเมนูที่ active
  setActiveMenuItem() {
    // ลบ active class จากทุกเมนู
    const menuItems = document.querySelectorAll('#sidebar a[data-page]');
    menuItems.forEach(item => {
      item.classList.remove('bg-gray-100', 'dark:bg-gray-700');
    });

    // เพิ่ม active class ให้เมนูปัจจุบัน
    const activeItem = document.querySelector(`#sidebar a[data-page="${this.currentPage}"]`);
    if (activeItem) {
      activeItem.classList.add('bg-gray-100', 'dark:bg-gray-700');
    }
  }

  // Toggle sidebar
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const btnToggleMenu = document.getElementById('btnToggleMenu');

    if (sidebar) {
      sidebar.classList.toggle('-translate-x-64');

      if (mainContent) {
        mainContent.classList.toggle('ml-64');
        mainContent.classList.toggle('ml-0');
      }
    }

    // เปลี่ยนไอคอนปุ่ม toggle
    if (btnToggleMenu) {
      const icon = btnToggleMenu.querySelector('i');
      if (icon) {
        icon.classList.toggle('bi-chevron-left');
        icon.classList.toggle('bi-chevron-right');
      }
    }
  }

  // Toggle Dark Mode
  toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);

    const label = document.getElementById('darkModeLabel');
    if (label) {
      label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }
  }

  // ตรวจสอบ Dark Mode
  checkDarkMode() {
    const dark = localStorage.getItem('darkMode') === 'true';
    document.documentElement.classList.toggle('dark', dark);

    const label = document.getElementById('darkModeLabel');
    if (label) {
      label.textContent = dark ? 'Light Mode' : 'Dark Mode';
    }
  }

  // ช่วยแปลง photoUrl
  resolvePhotoUrl(raw) {
    if (!raw) return '/uploads/employees/default.png';
    if (/^https?:\/\//.test(raw)) return raw;
    if (raw.startsWith('/uploads/employees/')) return raw;
    if (raw.startsWith('/uploads/')) return raw.replace(/^\/uploads\//, '/uploads/employees/');
    return '/uploads/employees/' + raw;
  }

  // ดึงโปรไฟล์ผู้ใช้
  async fetchUserProfile() {
    try {
      const res = await fetch(`${this.API_BASE}/users/me`, {
        headers: { 'Authorization': 'Bearer ' + this.token }
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to load profile');
      }

      const userName = json.data.name || 'ผู้ใช้';
      const employeeNameEl = document.getElementById('employeeName');
      const employeePhotoEl = document.getElementById('employeePhoto');

      if (employeeNameEl) {
        employeeNameEl.textContent = userName;
      }

      if (employeePhotoEl) {
        employeePhotoEl.src = this.resolvePhotoUrl(json.data.photoUrl);
      }

      // อัปเดต user initial ถ้ามี
      const initialEl = document.getElementById('userInitial');
      if (initialEl) {
        initialEl.textContent = userName.charAt(0).toUpperCase();
      }

    } catch (err) {
      console.error('fetchUserProfile:', err);

      if (err.message.includes('401') || err.message.includes('unauthorized')) {
        this.logout(false);
      }
    }
  }

  // Logout
  logout(showAlert = true) {
    const btnLogoutSidebar = document.getElementById('btnLogoutSidebar');

    // แสดง loading
    if (btnLogoutSidebar) {
      btnLogoutSidebar.innerHTML = '<span class="loading loading-spinner loading-sm mx-auto"></span>';
    }

    setTimeout(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');

      if (showAlert) {
        alert('ออกจากระบบแล้ว');
      }

      window.location.href = 'login.html';
    }, 500);
  }

  // ฟังก์ชันสำหรับการนำทาง
  static navigateTo(page) {
    window.location.href = page;
  }

  // ฟังก์ชันสำหรับเช็คสิทธิ์การเข้าถึง
  static checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }
}

// ฟังก์ชันสำหรับเริ่มต้น sidebar
function initHRSidebar() {
  // ตรวจสอบการ authentication ก่อน
  if (!HRSidebar.checkAuth()) {
    return;
  }

  // สร้าง instance ของ sidebar
  window.hrSidebar = new HRSidebar();
}

// เริ่มต้นเมื่อ DOM โหลดเสร็จ
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHRSidebar);
} else {
  initHRSidebar();
}

// Export สำหรับใช้งานใน module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HRSidebar;
}
