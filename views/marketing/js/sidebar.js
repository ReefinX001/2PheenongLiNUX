// Marketing Sidebar Management
// ไฟล์สำหรับจัดการ Sidebar ของ Marketing Module

// Function to load sidebar into page
function loadSidebar() {
  return fetch('/views/marketing/includes/sidebar.html')
    .then(response => response.text())
    .then(html => {
      const sidebarContainer = document.getElementById('sidebar-container');
      if (sidebarContainer) {
        sidebarContainer.innerHTML = html;
        initializeSidebar();
        return true;
      }
      return false;
    })
    .catch(error => {
      console.error('Error loading sidebar:', error);
      return false;
    });
}

// Initialize sidebar functionality
function initializeSidebar() {
  try {
    // Set active menu item based on current page
    setActiveMenuItem();

    // Initialize dark mode toggle
    initializeDarkMode();

    // Initialize logout functionality
    initializeLogout();

    console.log('✅ Sidebar initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing sidebar:', error);
  }
}

// Set active menu item
function setActiveMenuItem() {
  const currentPage = getCurrentPageName();
  const menuItems = document.querySelectorAll('aside a[data-page]');

  menuItems.forEach(item => {
    const pageName = item.getAttribute('data-page');
    const isActive = pageName === currentPage ||
                     (currentPage === '' && pageName === 'marketing_dashboard') ||
                     (currentPage === 'marketing' && pageName === 'marketing_dashboard');

    if (isActive) {
      item.classList.add('bg-gray-100', 'dark:bg-gray-700');
      item.classList.remove('hover:bg-gray-100', 'dark:hover:bg-gray-700');
    } else {
      item.classList.remove('bg-gray-100', 'dark:bg-gray-700');
      item.classList.add('hover:bg-gray-100', 'dark:hover:bg-gray-700');
    }
  });
}

// Get current page name
function getCurrentPageName() {
  const path = window.location.pathname;
  let pageName = path.split('/').pop();

  // Handle special cases
  if (!pageName || pageName === 'marketing') {
    pageName = 'marketing_dashboard';
  }

  // Remove file extensions
  pageName = pageName.replace(/\.(html|php)$/, '');

  return pageName;
}

// Initialize dark mode functionality
function initializeDarkMode() {
  const btnToggleDark = document.getElementById('btnToggleDark');
  const darkModeLabel = document.getElementById('darkModeLabel');

  if (!btnToggleDark || !darkModeLabel) return;

  // Initialize from localStorage
  const savedDarkMode = localStorage.getItem('darkMode') === 'true';
  applyDarkMode(savedDarkMode);

  // Add click event
  btnToggleDark.addEventListener('click', () => {
    const isDark = !document.documentElement.classList.contains('dark');
    localStorage.setItem('darkMode', isDark);
    applyDarkMode(isDark);
  });
}

// Apply dark mode
function applyDarkMode(isDark) {
  const darkModeLabel = document.getElementById('darkModeLabel');
  const btnToggleDark = document.getElementById('btnToggleDark');

  if (isDark) {
    document.documentElement.classList.add('dark');
    if (darkModeLabel) darkModeLabel.textContent = 'Light Mode';

    // Update icon and full button content
    if (btnToggleDark) {
      btnToggleDark.innerHTML = '<i class="bi bi-brightness-high text-xl text-yellow-500 dark:text-yellow-400"></i><span class="ml-3">Light Mode</span>';
    }
  } else {
    document.documentElement.classList.remove('dark');
    if (darkModeLabel) darkModeLabel.textContent = 'Dark Mode';

    // Update icon and full button content
    if (btnToggleDark) {
      btnToggleDark.innerHTML = '<i class="bi bi-moon text-xl text-slate-600 dark:text-slate-300"></i><span class="ml-3" id="darkModeLabel">Dark Mode</span>';
    }
  }
}

// Initialize logout functionality
function initializeLogout() {
  const btnLogoutSidebar = document.getElementById('btnLogoutSidebar');

  if (btnLogoutSidebar) {
    btnLogoutSidebar.addEventListener('click', handleLogout);
  }
}

// Handle logout
function handleLogout() {
  if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
    try {
      // Clear all authentication data
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      localStorage.removeItem('userProfile');
      localStorage.removeItem('currentBranch');

      // Clear session storage
      sessionStorage.clear();

      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during logout:', error);
      // Force redirect anyway
      window.location.href = '/login';
    }
  }
}

// Toggle sidebar (for mobile)
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('hidden');
  }
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadSidebar,
    initializeSidebar,
    setActiveMenuItem,
    toggleSidebar,
    getCurrentPageName
  };
}

// Auto-initialize if sidebar exists on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('sidebar')) {
      initializeSidebar();
    }
  });
} else {
  if (document.getElementById('sidebar')) {
    initializeSidebar();
  }
}