/**
 * Sidebar Management JavaScript
 * ระบบจัดการ Sidebar สำหรับ POS System
 */

// ตัวแปร global สำหรับ sidebar
let sidebarState = {
  isCollapsed: false,
  isDarkMode: false
};

// เพิ่มฟังก์ชันสำหรับอ่าน branch parameters
function getBranchParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const branchCode = urlParams.get('branch') || localStorage.getItem('activeBranch') || '';
  const branchName = urlParams.get('name') || localStorage.getItem('activeBranchName') || '';

  // บันทึกลง localStorage สำหรับใช้ในหน้าอื่นๆ
  if (branchCode) {
    localStorage.setItem('activeBranch', branchCode);
  }
  if (branchName) {
    localStorage.setItem('activeBranchName', branchName);
  }

  return { branchCode, branchName };
}

// ฟังก์ชันสร้าง URL พร้อม branch parameters
function createBranchUrl(path) {
  const { branchCode, branchName } = getBranchParams();
  if (!branchCode) return path;

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}branch=${encodeURIComponent(branchCode)}&name=${encodeURIComponent(branchName)}`;
}

/**
 * ฟังก์ชันสร้าง HTML ของ sidebar
 */
function createSidebarHTML() {
  // อ่าน branch parameters
  const { branchCode, branchName } = getBranchParams();

  return `
    <!-- Static Sidebar -->
    <aside id="sidebar"
           class="fixed inset-y-0 left-0 w-56 bg-white dark:bg-gray-800 shadow flex flex-col
                  transform transition-transform duration-300 z-30">
      
      <!-- Logo -->
      <a href="${createBranchUrl('/pattani_home')}" class="p-4 border-b border-gray-200 dark:border-gray-700">
        <img src="/uploads/Logo2.png" alt="Logo" class="w-full h-auto object-cover"/>
      </a>
      
      <!-- Menu Items -->
      <div class="flex-1 p-4 overflow-y-auto">
        <ul class="flex flex-col w-full">
          <li class="my-px">
            <a href="${createBranchUrl('/frontstore_pattani')}" class="flex flex-row items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <span class="flex items-center justify-center text-lg text-blue-500 dark:text-blue-400">
                <i class="bi bi-cash-stack text-xl"></i>
              </span>
              <span class="ml-3 text-gray-700 dark:text-gray-300">ขายสด</span>
            </a>
          </li>
          <li class="my-px">
            <a href="${createBranchUrl('/step1')}" class="flex flex-row items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <span class="flex items-center justify-center text-lg text-indigo-500 dark:text-indigo-400">
                <i class="bi bi-credit-card text-xl"></i>
              </span>
              <span class="ml-3 text-gray-700 dark:text-gray-300">ขายผ่อน</span>
            </a>
          </li>
         
          <li class="my-px">
            <a href="${createBranchUrl('/Quotationn')}" class="flex flex-row items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <span class="flex items-center justify-center text-lg text-purple-500 dark:text-purple-400">
                <i class="bi bi-file-earmark-text text-xl"></i>
              </span>
              <span class="ml-3 text-gray-700 dark:text-gray-300">ใบเสนอราคา</span>
            </a>
          </li>

          <li class="my-px">
            <a href="${createBranchUrl('/DepositReceipt')}" class="flex flex-row items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <span class="flex items-center justify-center text-lg text-teal-500 dark:text-teal-400">
                <i class="bi bi-receipt-cutoff text-xl"></i>
              </span>
              <span class="ml-3 text-gray-700 dark:text-gray-300">ใบรับเงินมัดจำ</span>
            </a>
          </li>

          <li class="my-px">
            <a href="${createBranchUrl('/voucher_menu')}" class="flex flex-row items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <span class="flex items-center justify-center text-lg text-red-500 dark:text-red-400">
                <i class="bi bi-receipt text-xl"></i>
              </span>
              <span class="ml-3 text-gray-700 dark:text-gray-300">ใบสำคัญรับ</span>
            </a>
          </li>
          
          <!-- เพิ่มเมนูผ่อนชำระ -->
          <li class="my-px">
            <a href="${createBranchUrl('/payment_installments_Pattani')}" class="flex flex-row items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <span class="flex items-center justify-center text-lg text-amber-500 dark:text-amber-400">
                <i class="bi bi-cash-coin text-xl"></i>
              </span>
              <span class="ml-3 text-gray-700 dark:text-gray-300">ผ่อนชำระ</span>
            </a>
          </li>
          <li class="my-px">
            <a href="${createBranchUrl('/Addproduct_pattani')}" class="flex flex-row items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <span class="flex items-center justify-center text-lg text-green-500 dark:text-green-400">
                <i class="bi bi-speedometer2 text-xl"></i>
              </span>
              <span class="ml-3 text-gray-700 dark:text-gray-300">เพิ่มเติม</span>
            </a>
          </li>
          <li class="my-px">
            <a href="${createBranchUrl('/services')}" class="flex flex-row items-center h-12 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <span class="flex items-center justify-center text-lg text-orange-500 dark:text-orange-400">
                <i class="bi bi-tools text-xl"></i>
              </span>
              <span class="ml-3 text-gray-700 dark:text-gray-300">บริการ</span>
            </a>
          </li>

          
          
          
          
          <!-- Divider -->
          <li class="mt-6 border-t border-gray-200 dark:border-gray-700 pt-2">
            <button id="btnToggleDark"
                    class="flex items-center h-12 px-4 w-full rounded-lg text-gray-600 dark:text-gray-200 
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
              <i class="bi bi-moon-stars text-xl text-indigo-600 dark:text-indigo-300"></i>
              <span class="ml-3 text-gray-700 dark:text-gray-300" id="darkModeLabel">Dark Mode</span>
            </button>
          </li>

          <!-- เปลี่ยนรหัสผ่าน -->
          <li class="my-px">
            <button id="btnChangePassword"
                    class="flex items-center h-12 px-4 w-full rounded-lg text-gray-600 dark:text-gray-200 
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
              <i class="bi bi-shield-lock text-xl text-pink-500 dark:text-pink-400"></i>
              <span class="ml-3 text-gray-700 dark:text-gray-300">เปลี่ยนรหัสผ่าน</span>
            </button>
          </li>
          
          <!-- Logout -->
          <li class="my-px">
            <button id="btnLogout"
                    class="flex items-center h-12 px-4 w-full rounded-lg text-red-500 
                           hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
              <i class="bi bi-box-arrow-right text-xl"></i>
              <span class="ml-3 text-red-500 dark:text-red-400">ออกจากระบบ</span>
            </button>
          </li>
          
          <!-- Profile -->
          <li class="my-px mt-2">
            <div id="profile"
                 class="flex items-center h-16 px-4 w-full rounded-lg bg-gray-50 dark:bg-gray-800/50 transition-colors">
              <div class="avatar mr-3">
                <div class="w-10 h-10 rounded-full ring-2 ring-primary-500/30 overflow-hidden">
                  <img id="employeePhoto" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzk3QTNBRiIvPgo8cGF0aCBkPSJNMzIgMzBjMC02LjYyNy01LjM3My0xMi0xMi0xMnMtMTIgNS4zNzMtMTIgMTJoMjR6IiBmaWxsPSIjOTdBM0FGIi8+Cjwvc3ZnPg==" alt="Profile" class="w-full h-full object-cover" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzk3QTNBRiIvPgo8cGF0aCBkPSJNMzIgMzBjMC02LjYyNy01LjM3My0xMi0xMi0xMnMtMTIgNS4zNzMtMTIgMTJoMjR6IiBmaWxsPSIjOTdBM0FGIi8+Cjwvc3ZnPg=='" />
                </div>
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-medium text-gray-800 dark:text-gray-200" id="employeeName">Loading…</span>
                <span class="text-xs text-gray-500 dark:text-gray-400" id="employeeRole">พนักงาน</span>
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
function initializeSidebar() {
  // Insert sidebar HTML into container
  const sidebarContainer = document.getElementById('sidebarContainer');
  if (sidebarContainer) {
    sidebarContainer.innerHTML = createSidebarHTML();
  } else {
    // If no container, insert at beginning of body
    document.body.insertAdjacentHTML('afterbegin', createSidebarHTML());
  }

  // Initialize event listeners และ load profile
  setupSidebarEventListeners();
  loadEmployeeProfile();
  restoreStates();

  // 🔥 Force dark mode update after initialization
  setTimeout(() => {
    const isDark = document.documentElement.classList.contains('dark');
    const darkModeLabel = document.getElementById('darkModeLabel');
    if (darkModeLabel && isDark) {
      darkModeLabel.textContent = 'Light Mode';
    } else if (darkModeLabel) {
      darkModeLabel.textContent = 'Dark Mode';
    }
    console.log('🎨 Sidebar dark mode state:', isDark);
  }, 100);

  console.log('✅ Sidebar initialized successfully');
}

/**
 * ฟังก์ชัน toggle sidebar แสดง/ซ่อน
 */
function toggleSidebar() {
  // Sidebar is always visible - no toggle functionality
  console.log('Sidebar toggle disabled - sidebar is always visible');
}

/**
 * ฟังก์ชัน toggle Dark Mode
 */
function toggleDarkMode() {
  const htmlEl = document.documentElement;
  const bodyEl = document.body;
  const darkModeLabel = document.getElementById('darkModeLabel');

  htmlEl.classList.toggle('dark');
  bodyEl.classList.toggle('dark');
  const isDark = htmlEl.classList.contains('dark');

  // Update data-theme attribute
  htmlEl.setAttribute('data-theme', isDark ? 'dark' : 'light');

  // Update button text
  if (darkModeLabel) {
    darkModeLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  }

  // Save state - sync both localStorage keys
  sidebarState.isDarkMode = isDark;
  localStorage.setItem('darkMode', isDark);
  localStorage.setItem('theme-preference', isDark ? 'dark' : 'light');

  // 🔥 Sync with main theme manager if available
  if (typeof window.themeManager !== 'undefined') {
    window.themeManager.currentTheme = isDark ? 'dark' : 'light';
    window.themeManager.setStoredTheme(isDark ? 'dark' : 'light');
    window.themeManager.applyTheme(isDark ? 'dark' : 'light');
    window.themeManager.updateThemeIcon();
  }

  // 🔥 Trigger theme change event for other components
  window.dispatchEvent(new CustomEvent('themeChanged', {
    detail: { theme: isDark ? 'dark' : 'light', source: 'sidebar' }
  }));

  console.log('🔄 Sidebar theme toggled to:', isDark ? 'dark' : 'light');

  // Log audit event if function exists
  if (typeof logAuditEvent === 'function') {
    const { branchCode } = getBranchParams();
    logAuditEvent('DARK_MODE_TOGGLE', {
      darkMode: isDark,
      branchCode: branchCode || 'unknown'
    }, 'INFO');
  }
}

/**
 * ฟังก์ชันเปลี่ยนรหัสผ่าน
 */
function changePassword() {
  // Log audit event if function exists
  if (typeof logAuditEvent === 'function') {
    const { branchCode } = getBranchParams();
    logAuditEvent('PASSWORD_CHANGE_NAVIGATE', {
      branchCode: branchCode || 'unknown'
    }, 'INFO');
  }

  // Navigate to password change page with branch parameters
  const url = createBranchUrl('/views/BOSS/password_change.html');
  window.location.href = url;
}

/**
 * ฟังก์ชัน logout
 */
function logout() {
  // Audit Log - Logout
  if (typeof logAuditEvent === 'function') {
    const { branchCode } = getBranchParams();
    logAuditEvent('USER_LOGOUT', {
      branchCode: branchCode || 'unknown',
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
  localStorage.removeItem('activeBranch');
  localStorage.removeItem('activeBranchName');

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
 * ฟังก์ชันโหลดโปรไฟล์พนักงาน
 */
async function loadEmployeeProfile() {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const res = await fetch('/api/users/me', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    });

    const js = await res.json();
    if (!res.ok || !js.success) throw new Error(js.error || js.message || res.status);

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
      employeeNameEl.textContent = user.name || '(ไม่พบชื่อ)';
    }

    // Update employee role
    const employeeRoleEl = document.getElementById('employeeRole');
    if (employeeRoleEl) {
      const roleName = user.role?.name || user.position || 'พนักงาน';
      employeeRoleEl.textContent = roleName;
    }

    // Update profile image
    let img = user.imageUrl || user.photoUrl || user.image || '';
    if (img && !/^https?:\/\//.test(img)) {
      img = img.startsWith('/') ? img : '/uploads/' + img;
    }

    const photoElement = document.getElementById('employeePhoto');
    if (photoElement) {
      if (img) {
        photoElement.src = img;
        photoElement.onerror = function() {
          this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzk3QTNBRiIvPgo8cGF0aCBkPSJNMzIgMzBjMC02LjYyNy01LjM3My0xMi0xMi0xMnMtMTIgNS4zNzMtMTIgMTJoMjR6IiBmaWxsPSIjOTdBM0FGIi8+Cjwvc3ZnPg==';
          this.onerror = null;
        };
      } else {
        // Use default SVG avatar
        photoElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzk3QTNBRiIvPgo8cGF0aCBkPSJNMzIgMzBjMC02LjYyNy01LjM3My0xMi0xMi0xMnMtMTIgNS4zNzMtMTIgMTJoMjR6IiBmaWxsPSIjOTdBM0FGIi8+Cjwvc3ZnPg==';
        photoElement.onerror = null;
      }
    }
  } catch (err) {
    console.error('Load Employee Profile Error:', err);
  }
}

/**
 * ฟังก์ชันกู้คืนสถานะ sidebar และ dark mode
 */
function restoreStates() {
  // Force sidebar to always be visible
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const mainHeader = document.getElementById('mainHeader');

  if (sidebar) {
    // Remove hide class if exists
    sidebar.classList.remove('-translate-x-full');
  }

  if (mainContent) {
    // Always apply margin for sidebar
    mainContent.classList.remove('ml-0');
    mainContent.classList.add('ml-64');
  }

  if (mainHeader) {
    // Always apply margin for header
    mainHeader.classList.remove('ml-0');
    mainHeader.classList.add('ml-64');
  }

  // Set sidebar state to always visible
  sidebarState.isCollapsed = false;

  // Restore dark mode - check both sidebar and main theme keys
  const darkModeFromSidebar = localStorage.getItem('darkMode') === 'true';
  const themeFromMain = localStorage.getItem('theme-preference') === 'dark';
  const shouldUseDarkMode = darkModeFromSidebar || themeFromMain;

  if (shouldUseDarkMode) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    const darkModeLabel = document.getElementById('darkModeLabel');
    if (darkModeLabel) {
      darkModeLabel.textContent = 'Light Mode';
    }
    sidebarState.isDarkMode = true;

    // 🔥 Sync localStorage keys
    localStorage.setItem('darkMode', 'true');
    localStorage.setItem('theme-preference', 'dark');
  } else {
    // 🔥 Ensure light mode is properly set
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    const darkModeLabel = document.getElementById('darkModeLabel');
    if (darkModeLabel) {
      darkModeLabel.textContent = 'Dark Mode';
    }
    sidebarState.isDarkMode = false;
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
 * ฟังก์ชันเริ่มต้น sidebar
 */
function initSidebar() {
  // กู้คืนสถานะ
  restoreStates();

  // โหลดโปรไฟล์พนักงาน
  loadEmployeeProfile();

  // ตั้งค่า event listeners
  setupSidebarEventListeners();

  console.log('✅ Sidebar initialized successfully');
}

/**
 * ตั้งค่า Event Listeners สำหรับ sidebar
 */
function setupSidebarEventListeners() {
  // Toggle button removed - sidebar is always visible

  // Dark mode toggle button
  const btnToggleDark = document.getElementById('btnToggleDark');
  if (btnToggleDark) {
    btnToggleDark.addEventListener('click', toggleDarkMode);
  }

  // 🔥 Listen for theme changes from main theme manager
  window.addEventListener('themeChanged', function(event) {
    // Only update if the change came from outside sidebar
    if (event.detail && event.detail.source !== 'sidebar') {
      const newTheme = event.detail.theme;
      const isDark = newTheme === 'dark';

      console.log('📡 Sidebar received theme change:', newTheme);

      // Update sidebar state without triggering another event
      sidebarState.isDarkMode = isDark;
      const darkModeLabel = document.getElementById('darkModeLabel');
      if (darkModeLabel) {
        darkModeLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode';
      }
    }
  });

  // Change password button
  const btnChangePassword = document.getElementById('btnChangePassword');
  if (btnChangePassword) {
    btnChangePassword.addEventListener('click', changePassword);
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
        const { branchCode } = getBranchParams();
        logAuditEvent('MENU_NAVIGATION', {
          menuItem: link.href,
          branchCode: branchCode || 'unknown'
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
 * Auto-initialize เมื่อ DOM โหลดเสร็จ
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    initializeSidebar();
    handleResponsiveSidebar();
  });
} else {
  // DOM อาจโหลดเสร็จแล้ว
  initializeSidebar();
  handleResponsiveSidebar();
}

// Export functions สำหรับใช้ภายนอก
if (typeof window !== 'undefined') {
  window.sidebarManager = {
    toggleSidebar,
    toggleDarkMode,
    changePassword,
    logout,
    highlightActiveMenu,
    loadEmployeeProfile,
    restoreStates,
    initializeSidebar,
    getSidebarState: () => ({ ...sidebarState })
  };
}