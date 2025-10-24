/**
 * Loan Sidebar Management JavaScript
 * ระบบจัดการ Sidebar สำหรับระบบสินเชื่อ
 */

// ตัวแปร global สำหรับ sidebar
let sidebarState = {
  isCollapsed: false,
  isDarkMode: false
};

/**
 * ฟังก์ชันสร้าง HTML ของ sidebar สำหรับระบบสินเชื่อ
 */
function createLoanSidebarHTML() {
  return `
    <!-- Toggle Button -->
    <button id="btnToggleMenu"
            title="Toggle Menu"
            aria-label="Toggle Menu"
            class="fixed left-0 top-1/2 transform -translate-y-1/2 
                   bg-blue-600 text-white p-2 rounded-r-full shadow-lg z-50 
                   hover:bg-blue-700 transition">
      <i class="bi bi-chevron-left"></i>
    </button>

    <!-- Static Sidebar -->
    <aside id="sidebar"
           class="fixed inset-y-0 left-0 w-56 bg-white dark:bg-gray-800 shadow flex flex-col
                  transform transition-transform duration-300 z-20">
      
      <!-- Logo -->
      <a href="loan_dashboard" class="p-4 border-b border-gray-200 dark:border-gray-700">
        <img src="/uploads/Logo2.png" alt="Logo" class="w-full h-auto object-cover"/>
      </a>
      
      <!-- Menu Items -->
      <div class="flex-1 p-4 overflow-y-auto">
        <ul class="flex flex-col w-full">
          <li class="my-px">
            <a href="loan_dashboard" class="flex flex-row items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <span class="flex items-center justify-center text-lg text-blue-500 dark:text-blue-400">
                <i class="bi bi-house-door text-xl"></i>
              </span>
              <span class="ml-3">หน้าแรก</span>
            </a>
          </li>
          <li class="my-px">
            <a href="repayment" class="flex flex-row items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <span class="flex items-center justify-center text-lg text-green-500 dark:text-green-400">
                <i class="bi bi-wallet2 text-xl"></i>
              </span>
              <span class="ml-3">ผ่อนชำระ</span>
            </a>
          </li>
          <li class="my-px">
            <a href="installment_history" class="flex flex-row items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <span class="flex items-center justify-center text-lg text-amber-500 dark:text-amber-400">
                <i class="bi bi-clock-history text-xl"></i>
              </span>
              <span class="ml-3">ประวัติการผ่อน</span>
            </a>
          </li>
          <li class="my-px">
            <a href="customer" class="flex flex-row items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <span class="flex items-center justify-center text-lg text-purple-500 dark:text-purple-400">
                <i class="bi bi-people text-xl"></i>
              </span>
              <span class="ml-3">จัดการลูกค้า</span>
            </a>
          </li>
          
          <!-- เมนูตัดสต๊อก -->
          <li class="my-px">
            <a href="stock_deduction" class="flex flex-row items-center h-12 px-4 rounded-lg text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 transition-all duration-300">
              <span class="flex items-center justify-center text-lg text-emerald-500 dark:text-emerald-400">
                <i class="bi bi-box-seam text-xl"></i>
              </span>
              <span class="ml-3">ตัดสต๊อก</span>
              <span class="ml-auto" id="stockPendingBadge">
                <span class="badge badge-error badge-sm badge-pulse">24</span>
              </span>
            </a>
          </li>

          <!-- เมนูลูกหนี้ -->
          <li class="my-px">
            <a href="/debtors" class="flex flex-row items-center h-12 px-4 rounded-lg text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 transition-all duration-300">
              <span class="flex items-center justify-center text-lg text-indigo-500 dark:text-indigo-400">
                <i class="bi bi-receipt text-xl"></i>
              </span>
              <span class="ml-3">ลูกหนี้</span>
              <span class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <i class="bi bi-chevron-right text-sm"></i>
              </span>
            </a>
          </li>
          
          <!-- เมนูเงินมัดจำ -->
          <li class="my-px">
            <a href="/deposits" class="flex flex-row items-center h-12 px-4 rounded-lg text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 transition-all duration-300">
              <span class="flex items-center justify-center text-lg text-amber-500 dark:text-amber-400">
                <i class="bi bi-piggy-bank text-xl"></i>
              </span>
              <span class="ml-3">เงินมัดจำ</span>
              <span class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <i class="bi bi-chevron-right text-sm"></i>
              </span>
            </a>
          </li>
          
          <!-- เมนูเกณฑ์หนี้สูญ -->
          <li class="my-px">
            <a href="/bad_debt_criteria" class="flex flex-row items-center h-12 px-4 rounded-lg text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
              <span class="flex items-center justify-center text-lg text-cyan-500 dark:text-cyan-400">
                <i class="bi bi-clipboard2-check text-xl"></i>
              </span>
              <span class="ml-3">เกณฑ์หนี้สูญ</span>
            </a>
          </li>
          
          <!-- เมนูต้นทุนและค่าใช้จ่าย -->
          <li class="my-px">
            <a href="/costs_expenses" class="flex flex-row items-center h-12 px-4 rounded-lg text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
              <span class="flex items-center justify-center text-lg text-teal-500 dark:text-teal-400">
                <i class="bi bi-calculator text-xl"></i>
              </span>
              <span class="ml-3">ต้นทุนและค่าใช้จ่าย</span>
            </a>
          </li>

          <!-- เมนูภาษี -->
          <li class="my-px">
            <a href="/tax" class="flex flex-row items-center h-12 px-4 rounded-lg text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
              <span class="flex items-center justify-center text-lg text-orange-500 dark:text-orange-400">
                <i class="bi bi-receipt-cutoff text-xl"></i>
              </span>
              <span class="ml-3">ภาษี</span>
            </a>
          </li>
          
          <!-- Divider -->
          <li class="mt-6 border-t border-gray-200 dark:border-gray-700 pt-2">
            <button id="btnToggleDark"
                    class="flex items-center h-12 px-4 w-full rounded-lg text-gray-600 dark:text-gray-200 
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
              <i class="bi bi-moon-stars text-xl text-indigo-600 dark:text-indigo-300"></i>
              <span class="ml-3" id="darkModeLabel">Dark Mode</span>
            </button>
          </li>
          
          <!-- Logout -->
          <li class="my-px">
            <button id="btnLogout"
                    class="flex items-center h-12 px-4 w-full rounded-lg text-red-500 
                           hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
              <i class="bi bi-box-arrow-right text-xl"></i>
              <span class="ml-3">ออกจากระบบ</span>
            </button>
          </li>
          
          <!-- Profile -->
          <li class="my-px mt-2">
            <div id="profile"
                 class="flex items-center h-16 px-4 w-full rounded-lg bg-gray-50 dark:bg-gray-800/50 transition-colors">
              <div class="avatar mr-3">
                <div class="w-10 h-10 rounded-full ring-2 ring-primary-500/30 overflow-hidden">
                  <img id="employeePhoto" src="data:image/svg+xml;charset=UTF-8,%3Csvg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23E5E7EB'/%3E%3Cpath d='M20 12c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 14c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z' fill='%236B7280'/%3E%3C/svg%3E" alt="Profile" class="w-full h-full object-cover" />
                </div>
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-medium" id="employeeName">Loading…</span>
                <span class="text-xs text-gray-500 dark:text-gray-400" id="employeeRole">พนักงาน</span>
                <span class="text-xs text-blue-500">ระบบสินเชื่อ</span>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </aside>`;
}

/**
 * ฟังก์ชันแทรก sidebar HTML เข้าในหน้า
 */
function initializeLoanSidebar() {
  // Insert sidebar HTML into container
  const sidebarContainer = document.getElementById('sidebarContainer');
  if (sidebarContainer) {
    sidebarContainer.innerHTML = createLoanSidebarHTML();
  } else {
    // If no container, insert at beginning of body
    document.body.insertAdjacentHTML('afterbegin', createLoanSidebarHTML());
  }

  // Initialize event listeners และ load profile
  setupLoanSidebarEventListeners();

  // Set immediate fallback values
  const employeeNameEl = document.getElementById('employeeName');
  const employeeRoleEl = document.getElementById('employeeRole');

  if (employeeNameEl) {
    employeeNameEl.textContent = 'พนักงานขาย Pattani';
  }
  if (employeeRoleEl) {
    employeeRoleEl.textContent = 'พนักงานขาย';
  }

  // Try to load real profile data (will override fallback if successful)
  loadEmployeeProfile();
  restoreStates();

  console.log('✅ Loan Sidebar initialized successfully');
}

/**
 * ฟังก์ชัน toggle sidebar แสดง/ซ่อน
 */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const icon = document.querySelector('#btnToggleMenu i');

  if (!sidebar || !mainContent || !icon) {
    console.error('Sidebar elements not found');
    return;
  }

  sidebar.classList.toggle('-translate-x-full');

  if (sidebar.classList.contains('-translate-x-full')) {
    // Sidebar ถูกซ่อน
    mainContent.classList.remove('ml-64');
    mainContent.classList.add('ml-0');
    icon.classList.remove('bi-chevron-left');
    icon.classList.add('bi-chevron-right');
    sidebarState.isCollapsed = true;
  } else {
    // Sidebar แสดง
    mainContent.classList.remove('ml-0');
    mainContent.classList.add('ml-64');
    icon.classList.remove('bi-chevron-right');
    icon.classList.add('bi-chevron-left');
    sidebarState.isCollapsed = false;
  }

  // Save state to localStorage
  localStorage.setItem('sidebarCollapsed', sidebarState.isCollapsed);

  // Log audit event if function exists
  if (typeof logAuditEvent === 'function') {
    logAuditEvent('SIDEBAR_TOGGLE', {
      collapsed: sidebarState.isCollapsed,
      system: 'loan'
    }, 'INFO');
  }
}

/**
 * ฟังก์ชัน toggle Dark Mode
 */
function toggleDarkMode() {
  const htmlEl = document.documentElement;
  const darkModeLabel = document.getElementById('darkModeLabel');

  htmlEl.classList.toggle('dark');
  const isDark = htmlEl.classList.contains('dark');

  // Update data-theme attribute
  htmlEl.setAttribute('data-theme', isDark ? 'dark' : 'light');

  // Update button text
  if (darkModeLabel) {
    darkModeLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  }

  // Save state
  sidebarState.isDarkMode = isDark;
  localStorage.setItem('darkMode', isDark);

  // Log audit event if function exists
  if (typeof logAuditEvent === 'function') {
    logAuditEvent('DARK_MODE_TOGGLE', {
      darkMode: isDark,
      system: 'loan'
    }, 'INFO');
  }
}

/**
 * ฟังก์ชัน logout
 */
function logout() {
  // Audit Log - Logout
  if (typeof logAuditEvent === 'function') {
    logAuditEvent('USER_LOGOUT', {
      system: 'loan',
      sessionDuration: Date.now() - (typeof lastActionTime !== 'undefined' ? lastActionTime : 0),
      reason: 'manual_logout'
    }, 'INFO');
  }

  // ส่ง audit logs ที่เหลือก่อน logout
  if (typeof flushAuditBuffer === 'function') {
    flushAuditBuffer();
  }

  // Clear localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');

  // Redirect to login
  window.location.href = '/login';
}

/**
 * ฟังก์ชัน highlight active menu
 */
function highlightActiveMenu(menuItem) {
  if (!menuItem) return;

  // Remove highlight from all menus
  document.querySelectorAll('#sidebar ul li a').forEach(link => {
    link.classList.remove('active');
    link.style.backgroundColor = '';
    link.querySelectorAll('span, i').forEach(el => {
      el.classList.remove('text-white');
    });
  });

  // Add highlight to clicked menu
  const iconElement = menuItem.querySelector('i');
  if (iconElement) {
    // Get computed color of icon
    const iconColor = window.getComputedStyle(iconElement).color;

    // Apply highlight
    menuItem.classList.add('active');
    menuItem.style.backgroundColor = iconColor;

    // Make text and icon white
    menuItem.querySelectorAll('span, i').forEach(el => {
      el.classList.add('text-white');
    });
  }
}

/**
 * ฟังก์ชันทดสอบการเชื่อมต่อ API
 */
async function testApiConnection() {
  try {
    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000'
      : '';

    console.log('🔍 Testing API connection to:', baseUrl + '/api/health');

    // Create timeout controller for better browser compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(baseUrl + '/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('✅ API connection successful');
      return true;
    } else {
      console.warn('⚠️ API connection failed:', response.status);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('❌ API connection timeout after 5 seconds');
    } else {
      console.warn('❌ API connection test failed:', error.message);
    }
    return false;
  }
}

/**
 * ฟังก์ชันโหลดโปรไฟล์พนักงาน
 */
async function loadEmployeeProfile() {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('No auth token found, keeping fallback values');
      return;
    }

    // Test API connection first
    const apiConnected = await testApiConnection();
    if (!apiConnected) {
      console.log('API connection failed, keeping fallback values');
      return;
    }

    // Create a timeout promise with longer timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API timeout')), 15000); // 15 second timeout
    });

    // Create the fetch promise with correct base URL
    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000'
      : '';

    console.log('🔄 Loading employee profile from:', baseUrl + '/api/users/me');

    // Create abort controller for better browser compatibility
    const controller = new AbortController();
    const fetchTimeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

    const fetchPromise = fetch(baseUrl + '/api/users/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      signal: controller.signal
    });

    // Race between fetch and timeout
    const res = await Promise.race([fetchPromise, timeoutPromise]);
    clearTimeout(fetchTimeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ API Response Error:', res.status, errorText);
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    const js = await res.json();

    if (!js.success) {
      console.error('❌ API Success False:', js);
      throw new Error(js.error || js.message || 'API returned success: false');
    }

    const user = js.data;

    // Save userId and userName to localStorage
    if (user._id) {
      localStorage.setItem('userId', user._id);
    }
    if (user.name) {
      localStorage.setItem('userName', user.name);
    }

    // Update employee name
    const employeeNameEl = document.getElementById('employeeName');
    if (employeeNameEl) {
      employeeNameEl.textContent = user.name || 'พนักงานขาย Pattani';
      console.log('✅ Employee name loaded:', user.name || 'พนักงานขาย Pattani');
    }

    // Update employee role
    const employeeRoleEl = document.getElementById('employeeRole');
    if (employeeRoleEl) {
      const roleName = user.role?.name || user.position || 'พนักงานขาย';
      employeeRoleEl.textContent = roleName;
      console.log('✅ Employee role loaded:', roleName);
    }

    // Update profile image
    let img = user.imageUrl || user.photoUrl || user.image || '';
    if (img && !/^https?:\/\//.test(img)) {
      img = img.startsWith('/') ? img : '/uploads/' + img;
    }

    const photoElement = document.getElementById('employeePhoto');
    if (photoElement) {
      // ใช้ SVG placeholder แทนไฟล์ที่ไม่มีอยู่
      photoElement.src = img || 'data:image/svg+xml;charset=UTF-8,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'20\' fill=\'%23E5E7EB\'/%3E%3Cpath d=\'M20 12c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 14c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z\' fill=\'%236B7280\'/%3E%3C/svg%3E';

      // เพิ่ม error handler เพื่อป้องกัน infinite loop
      photoElement.onerror = function() {
        this.onerror = null; // ป้องกัน infinite loop
        this.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'20\' fill=\'%23E5E7EB\'/%3E%3Cpath d=\'M20 12c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 14c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z\' fill=\'%236B7280\'/%3E%3C/svg%3E';
      };
    }
  } catch (err) {
    // Provide more detailed error information
    if (err.message === 'API timeout' || err.name === 'AbortError') {
      console.warn('⏱️ Load Employee Profile Timeout (keeping fallback):', err.message);
      console.log('💡 Suggestion: Check server performance or network connection');
    } else if (err.message.includes('HTTP 401')) {
      console.warn('🔐 Authentication Error (keeping fallback):', err.message);
      console.log('💡 Suggestion: Token may be expired, consider re-login');
    } else if (err.message.includes('HTTP 404')) {
      console.warn('🔍 API Endpoint Not Found (keeping fallback):', err.message);
      console.log('💡 Suggestion: Check if /api/users/me endpoint exists');
    } else {
      console.warn('❌ Load Employee Profile Error (keeping fallback):', err.message);
    }

    // Ensure fallback values are set (in case they weren't set during initialization)
    const employeeNameEl = document.getElementById('employeeName');
    if (employeeNameEl && (employeeNameEl.textContent === 'Loading…' || employeeNameEl.textContent === '')) {
      employeeNameEl.textContent = 'พนักงานขาย Pattani';
    }

    const employeeRoleEl = document.getElementById('employeeRole');
    if (employeeRoleEl && (employeeRoleEl.textContent === 'Loading…' || employeeRoleEl.textContent === '' || employeeRoleEl.textContent === 'พนักงาน')) {
      employeeRoleEl.textContent = 'พนักงานขาย';
    }

    console.log('💼 Using fallback employee name: พนักงานขาย Pattani');
  }
}

/**
 * ฟังก์ชันกู้คืนสถานะ sidebar และ dark mode
 */
function restoreStates() {
  // Restore sidebar state
  const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  if (sidebarCollapsed) {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const icon = document.querySelector('#btnToggleMenu i');

    if (sidebar && mainContent && icon) {
      sidebar.classList.add('-translate-x-full');
      mainContent.classList.remove('ml-64');
      mainContent.classList.add('ml-0');
      icon.classList.replace('bi-chevron-left', 'bi-chevron-right');
      sidebarState.isCollapsed = true;
    }
  }

  // Restore dark mode
  const darkMode = localStorage.getItem('darkMode') === 'true';
  if (darkMode) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    const darkModeLabel = document.getElementById('darkModeLabel');
    if (darkModeLabel) {
      darkModeLabel.textContent = 'Light Mode';
    }
    sidebarState.isDarkMode = true;
  }

  // Highlight active menu based on current URL
  const currentPath = window.location.pathname;
  const currentPage = currentPath.split('/').pop().split('?')[0]; // Remove query params

  document.querySelectorAll('#sidebar ul li a').forEach(link => {
    const href = link.getAttribute('href');
    const hrefPath = href.split('?')[0]; // Remove query params for comparison

    if (hrefPath === currentPage || currentPath.includes(hrefPath)) {
      highlightActiveMenu(link);
    }
  });
}

/**
 * ตั้งค่า Event Listeners สำหรับ sidebar
 */
function setupLoanSidebarEventListeners() {
  // Toggle sidebar button
  const btnToggleMenu = document.getElementById('btnToggleMenu');
  if (btnToggleMenu) {
    btnToggleMenu.addEventListener('click', toggleSidebar);
  }

  // Dark mode toggle button
  const btnToggleDark = document.getElementById('btnToggleDark');
  if (btnToggleDark) {
    btnToggleDark.addEventListener('click', toggleDarkMode);
  }

  // Logout button
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }

  // Menu item click events
  document.querySelectorAll('#sidebar ul li a').forEach(link => {
    link.addEventListener('click', () => {
      // Log navigation if audit function exists
      if (typeof logAuditEvent === 'function') {
        logAuditEvent('MENU_NAVIGATION', {
          menuItem: link.href,
          system: 'loan'
        }, 'INFO');
      }
      highlightActiveMenu(link);
    });
  });
}

/**
 * ฟังก์ชันสำหรับ responsive behavior
 */
function handleResponsiveSidebar() {
  const mediaQuery = window.matchMedia('(max-width: 768px)');

  function handleMediaQueryChange(e) {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');

    if (e.matches) {
      // Mobile view - always hide sidebar
      if (sidebar) sidebar.classList.add('-translate-x-full');
      if (mainContent) {
        mainContent.classList.remove('ml-64');
        mainContent.classList.add('ml-0');
      }
    } else {
      // Desktop view - restore saved state
      restoreStates();
    }
  }

  // Initial check
  handleMediaQueryChange(mediaQuery);

  // Listen for changes
  mediaQuery.addListener(handleMediaQueryChange);
}

/**
 * ฟังก์ชัน update stock badge
 */
function updateStockBadge(count) {
  const stockBadge = document.getElementById('stockPendingBadge');
  if (stockBadge) {
    const badge = stockBadge.querySelector('.badge');
    if (badge) {
      badge.textContent = count;
      if (count > 0) {
        badge.classList.add('badge-pulse');
      } else {
        badge.classList.remove('badge-pulse');
      }
    }
  }
}

/**
 * ฟังก์ชัน show notification
 */
function showNotification(message, type = 'info') {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'แจ้งเตือน',
      text: message,
      icon: type,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    });
  } else {
    // Fallback notification
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded text-white ${
      type === 'success' ? 'bg-green-500' :
      type === 'error' ? 'bg-red-500' :
      type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

/**
 * Auto-initialize เมื่อ DOM โหลดเสร็จ
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    initializeLoanSidebar();
    handleResponsiveSidebar();
  });
} else {
  // DOM อาจโหลดเสร็จแล้ว
  initializeLoanSidebar();
  handleResponsiveSidebar();
}

// Export functions สำหรับใช้ภายนอก
if (typeof window !== 'undefined') {
  window.loanSidebarManager = {
    toggleSidebar,
    toggleDarkMode,
    logout,
    highlightActiveMenu,
    loadEmployeeProfile,
    restoreStates,
    initializeLoanSidebar,
    updateStockBadge,
    showNotification,
    getSidebarState: () => ({ ...sidebarState })
  };
}