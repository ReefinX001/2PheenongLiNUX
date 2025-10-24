// Marketing Sidebar Template
(function() {
  'use strict';

  // Sidebar menu items configuration
  const menuItems = [
    {
      href: 'marketing_dashboard',
      icon: 'bi-graph-up-arrow',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      text: 'แดชบอร์ด',
      page: 'marketing_dashboard'
    },
    {
      href: 'campaigns',
      icon: 'bi-megaphone-fill',
      iconColor: 'text-orange-500 dark:text-orange-400',
      text: 'แคมเปญ',
      page: 'campaigns'
    },
    {
      href: 'analytics',
      icon: 'bi-bar-chart-line',
      iconColor: 'text-blue-500 dark:text-blue-400',
      text: 'วิเคราะห์ข้อมูล',
      page: 'analytics'
    },
    {
      href: 'content_management',
      icon: 'bi-file-earmark-richtext',
      iconColor: 'text-teal-500 dark:text-teal-400',
      text: 'จัดการเนื้อหา',
      page: 'content_management'
    },
    {
      href: 'social_media',
      icon: 'bi-share-fill',
      iconColor: 'text-purple-500 dark:text-purple-400',
      text: 'สื่อสังคม',
      page: 'social_media'
    },
    {
      href: 'customer_data',
      icon: 'bi-people',
      iconColor: 'text-pink-500 dark:text-pink-400',
      text: 'ข้อมูลลูกค้า',
      page: 'customer_data'
    },
    {
      href: 'budget_reports',
      icon: 'bi-bar-chart',
      iconColor: 'text-cyan-500 dark:text-cyan-400',
      text: 'รายงานงบประมาณ',
      page: 'budget_reports'
    },
    {
      href: 'Promotion',
      icon: 'bi-gift',
      iconColor: 'text-red-500 dark:text-red-400',
      text: 'โปรโมชั่น',
      page: 'Promotion'
    },
    {
      href: 'Products_marketing',
      icon: 'bi-box-seam',
      iconColor: 'text-brown-500 dark:text-brown-400',
      text: 'ผลิตภัณฑ์',
      page: 'Products_marketing'
    },
    {
      href: 'Customers_marketing',
      icon: 'bi-person-badge',
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      text: 'ลูกค้า',
      page: 'Customers_marketing'
    },
    {
      href: 'marketing_settings',
      icon: 'bi-gear',
      iconColor: 'text-gray-500 dark:text-gray-400',
      text: 'ตั้งค่า',
      page: 'marketing_settings'
    }
  ];

  // Get current page from URL
  function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop().split('.')[0];
    return filename || 'marketing_dashboard';
  }

  // Generate sidebar HTML
  function generateSidebar() {
    const currentPage = getCurrentPage();

    return `
      <aside id="sidebar" class="w-64 bg-white dark:bg-gray-800 flex flex-col transition-all duration-300">
        <a href="marketing_dashboard">
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <img src="/uploads/Logo2.png" alt="Logo" class="w-full h-auto"/>
          </div>
        </a>
        <div class="flex-1 p-4 overflow-y-auto">
          <ul class="flex flex-col w-full space-y-1">
            ${menuItems.map(item => {
              const isActive = currentPage === item.page;
              const activeClass = isActive ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700 transition';

              return `
                <li>
                  <a href="${item.href}" class="flex items-center h-12 px-4 rounded-lg ${activeClass}">
                    <i class="bi ${item.icon} text-xl ${item.iconColor}"></i>
                    <span class="ml-3">${item.text}</span>
                  </a>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      </aside>
    `;
  }

  // Initialize sidebar when DOM is loaded
  function initSidebar() {
    const sidebarContainer = document.getElementById('sidebarContainer');
    if (sidebarContainer) {
      sidebarContainer.innerHTML = generateSidebar();
    }
  }

  // Initialize sidebar toggle functionality
  function initSidebarToggle() {
    const btnToggleMenu = document.getElementById('btnToggleMenu');
    const sidebar = document.getElementById('sidebar');

    if (btnToggleMenu && sidebar) {
      btnToggleMenu.addEventListener('click', function() {
        if (sidebar.classList.contains('w-64')) {
          sidebar.classList.remove('w-64');
          sidebar.classList.add('w-0');
          this.innerHTML = '<i class="bi bi-chevron-right"></i>';
        } else {
          sidebar.classList.remove('w-0');
          sidebar.classList.add('w-64');
          this.innerHTML = '<i class="bi bi-chevron-left"></i>';
        }
      });
    }
  }

  // Export functions to global scope
  window.MarketingSidebar = {
    init: function() {
      document.addEventListener('DOMContentLoaded', function() {
        initSidebar();
        initSidebarToggle();
      });
    },
    generateSidebar: generateSidebar,
    getCurrentPage: getCurrentPage
  };

})();

// Auto-initialize
window.MarketingSidebar.init();