// Customer Data Manager for Marketing Dashboard

class CustomerDataManager {
  constructor() {
    this.baseUrl = '/api/marketing-customers';
    this.currentPage = 1;
    this.currentFilters = {};
    this.isLoading = false;
    this.init();
  }

  // Initialize the Customer Data Manager
  async init() {
    console.log('Initializing Customer Data Manager...');

    try {
      // Load initial data
      await this.loadDashboardData();
      await this.loadCustomersList();

      // Initialize event listeners
      this.setupEventListeners();

      // Initialize charts
      this.initializeCharts();

      console.log('Customer Data Manager initialized successfully');
    } catch (error) {
      console.error('Error initializing Customer Data Manager:', error);
      this.showError('Error loading customer data');
    }
  }

  // Load dashboard statistics
  async loadDashboardData() {
    try {
      console.log('Loading dashboard data...');

      const response = await fetch(`${this.baseUrl}/dashboard`);
      const result = await response.json();

      if (result.success) {
        this.updateDashboardStats(result.data);
      } else {
        throw new Error(result.message || 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      throw error;
    }
  }

  // Update dashboard statistics display
  updateDashboardStats(data) {
    // Update total customers
    this.updateElementText('[data-stat="totalCustomers"]', data.totalCustomers?.toLocaleString() || '0');

    // Update average lifetime value
    this.updateElementText('[data-stat="avgLifetimeValue"]', `฿${data.avgLifetimeValue?.toLocaleString() || '0'}`);

    // Update repeat purchase rate
    this.updateElementText('[data-stat="repeatPurchaseRate"]', `${data.repeatPurchaseRate || '0'}%`);

    // Update satisfaction rating
    this.updateElementText('[data-stat="avgSatisfactionRating"]', `${data.avgSatisfactionRating || '0'}/5`);

    // Update new customers this month
    this.updateElementText('[data-stat="newCustomersThisMonth"]', data.newCustomersThisMonth?.toLocaleString() || '0');

    console.log('Dashboard stats updated:', data);
  }

  // Load customers list with pagination and filters
  async loadCustomersList(page = 1, filters = {}) {
    try {
      if (this.isLoading) return;
      this.isLoading = true;

      // Show loading indicator
      this.showLoadingIndicator();

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...filters
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      const result = await response.json();

      if (result.success) {
        this.currentPage = page;
        this.currentFilters = filters;
        this.updateCustomersTable(result.data.customers);
        this.updatePagination(result.data.pagination);
      } else {
        throw new Error(result.message || 'Failed to load customers');
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      this.showError('Error loading customers list');
    } finally {
      this.isLoading = false;
      this.hideLoadingIndicator();
    }
  }

  // Update customers table
  updateCustomersTable(customers) {
    const tableBody = document.querySelector('#customersTable tbody');
    if (!tableBody) {
      console.warn('Customers table body not found');
      return;
    }

    // Clear existing rows
    tableBody.innerHTML = '';

    if (!customers || customers.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">ไม่พบข้อมูลลูกค้า</td></tr>';
      return;
    }

    // Create table rows
    customers.forEach(customer => {
      const row = this.createCustomerRow(customer);
      tableBody.appendChild(row);
    });
  }

  // Create a customer table row
  createCustomerRow(customer) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <div class="flex-shrink-0 h-10 w-10">
            <img class="h-10 w-10 rounded-full" src="https://ui-avatars.com/api/?name=${encodeURIComponent(customer.fullName)}&background=FF66AA&color=fff" alt="">
          </div>
          <div class="ml-4">
            <div class="text-sm font-medium">${customer.fullName || ''}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">${customer.customerId || ''}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm">${customer.email || ''}</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">${customer.phone || ''}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="customer-badge ${this.getSegmentBadgeClass(customer.segment)}">${this.getSegmentDisplayName(customer.segment)}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <div class="font-semibold">฿${(customer.lifetimeValue || 0).toLocaleString()}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400">${customer.totalOrders || 0} รายการ</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <span class="flex items-center">
          <span class="status-indicator ${customer.status === 'active' ? 'status-active' : 'status-inactive'}"></span>
          <span>${customer.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}</span>
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        ${this.formatDate(customer.registrationDate)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mr-3" onclick="customerDataManager.viewCustomer('${customer._id}')">
          <i class="bi bi-eye"></i>
        </button>
        <button class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mr-3" onclick="customerDataManager.editCustomer('${customer._id}')">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" onclick="customerDataManager.deleteCustomer('${customer._id}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    return row;
  }

  // Get segment badge CSS class
  getSegmentBadgeClass(segment) {
    const classes = {
      'vip': 'badge-vip',
      'loyal': 'badge-loyal',
      'new': 'badge-new',
      'at-risk': 'badge-at-risk',
      'regular': 'badge-new'
    };
    return classes[segment] || 'badge-new';
  }

  // Get segment display name
  getSegmentDisplayName(segment) {
    const names = {
      'vip': 'VIP',
      'loyal': 'ลูกค้าประจำ',
      'new': 'ลูกค้าใหม่',
      'at-risk': 'มีความเสี่ยง',
      'regular': 'ลูกค้าทั่วไป'
    };
    return names[segment] || segment;
  }

  // Format date for display
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Update pagination
  updatePagination(pagination) {
    const paginationContainer = document.querySelector('[data-pagination]');
    if (!paginationContainer) return;

    const { currentPage, totalPages, totalCount } = pagination;

    // Update pagination info
    const paginationInfo = document.querySelector('[data-pagination-info]');
    if (paginationInfo) {
      const start = ((currentPage - 1) * 10) + 1;
      const end = Math.min(currentPage * 10, totalCount);
      paginationInfo.textContent = `แสดง ${start}-${end} จาก ${totalCount.toLocaleString()} รายการ`;
    }

    // Update pagination buttons (simplified)
    const prevBtn = document.querySelector('[data-pagination-prev]');
    const nextBtn = document.querySelector('[data-pagination-next]');

    if (prevBtn) {
      prevBtn.disabled = currentPage <= 1;
      prevBtn.onclick = () => currentPage > 1 && this.loadCustomersList(currentPage - 1, this.currentFilters);
    }

    if (nextBtn) {
      nextBtn.disabled = currentPage >= totalPages;
      nextBtn.onclick = () => currentPage < totalPages && this.loadCustomersList(currentPage + 1, this.currentFilters);
    }
  }

  // Initialize charts
  async initializeCharts() {
    try {
      // Load segment data
      const response = await fetch(`${this.baseUrl}/segments`);
      const result = await response.json();

      if (result.success && result.data.segments) {
        this.initializeSegmentChart(result.data.segments);
      }
    } catch (error) {
      console.error('Error initializing charts:', error);
    }
  }

  // Initialize customer segmentation chart
  initializeSegmentChart(segments) {
    const ctx = document.getElementById('customerSegmentationChart');
    if (!ctx) {
      console.warn('Customer segmentation chart canvas not found');
      return;
    }

    const labels = segments.map(s => this.getSegmentDisplayName(s.segment));
    const data = segments.map(s => s.percentage);
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#9333ea', '#ef4444'];

    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(tooltipItem) {
                return `${tooltipItem.label}: ${tooltipItem.raw}%`;
              }
            }
          }
        }
      }
    });
  }

  // View customer details
  async viewCustomer(customerId) {
    try {
      console.log('Loading customer details:', customerId);

      const response = await fetch(`${this.baseUrl}/${customerId}`);
      const result = await response.json();

      if (result.success) {
        this.showCustomerModal(result.data.customer, result.data.activities);
      } else {
        throw new Error(result.message || 'Failed to load customer details');
      }
    } catch (error) {
      console.error('Error loading customer details:', error);
      this.showError('Error loading customer details');
    }
  }

  // Show customer details modal
  showCustomerModal(customer, activities) {
    const modal = document.getElementById('customerProfileModal');
    if (!modal) return;

    // Update customer info in modal
    this.updateCustomerModalContent(customer, activities);

    // Show modal
    modal.classList.remove('hidden');
  }

  // Update customer modal content
  updateCustomerModalContent(customer, activities) {
    // Update basic info
    const avatarImg = document.querySelector('#customerProfileModal .customer-avatar');
    if (avatarImg) {
      avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.fullName)}&background=FF66AA&color=fff`;
    }

    // Update customer details
    this.updateElementText('#customerProfileModal h3', customer.fullName);
    this.updateElementText('#customerProfileModal [data-field="customerId"]', customer.customerId);
    this.updateElementText('#customerProfileModal [data-field="email"]', customer.email);
    this.updateElementText('#customerProfileModal [data-field="phone"]', customer.phone);
    this.updateElementText('#customerProfileModal [data-field="lifetimeValue"]', `฿${(customer.lifetimeValue || 0).toLocaleString()}`);
    this.updateElementText('#customerProfileModal [data-field="totalOrders"]', customer.totalOrders || 0);
    this.updateElementText('#customerProfileModal [data-field="averageOrderValue"]', `฿${(customer.averageOrderValue || 0).toLocaleString()}`);

    // Update activities timeline
    this.updateActivitiesTimeline(activities);
  }

  // Update activities timeline
  updateActivitiesTimeline(activities) {
    const timeline = document.querySelector('#customerProfileModal .timeline');
    if (!timeline || !activities) return;

    timeline.innerHTML = '';

    activities.slice(0, 5).forEach(activity => {
      const timelineItem = document.createElement('div');
      timelineItem.className = 'timeline-item';
      timelineItem.innerHTML = `
        <div class="timeline-dot activity-${activity.activityType}"></div>
        <div class="timeline-content">
          <div class="flex justify-between mb-1">
            <span class="font-medium">${activity.title}</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">${this.formatDate(activity.activityDate)}</span>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-300">${activity.description}</p>
        </div>
      `;
      timeline.appendChild(timelineItem);
    });
  }

  // Setup event listeners
  setupEventListeners() {
    // Search functionality
    const searchInput = document.querySelector('input[type="text"][placeholder*="ค้นหา"]');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.handleSearch(e.target.value);
        }, 500);
      });
    }

    // Filter dropdowns
    const segmentFilter = document.querySelector('select[option*="กลุ่ม"]');
    if (segmentFilter) {
      segmentFilter.addEventListener('change', (e) => {
        this.handleFilter('segment', e.target.value);
      });
    }

    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = btn.getAttribute('data-tab');
        this.switchTab(target);
      });
    });
  }

  // Handle search
  handleSearch(query) {
    const filters = { ...this.currentFilters, search: query };
    this.loadCustomersList(1, filters);
  }

  // Handle filter
  handleFilter(filterType, value) {
    const filters = { ...this.currentFilters };
    if (value && value !== 'all') {
      filters[filterType] = value;
    } else {
      delete filters[filterType];
    }
    this.loadCustomersList(1, filters);
  }

  // Switch tabs
  switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    // Show/hide tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.add('hidden');
    });

    const targetContent = document.getElementById(`${tabName}Tab`);
    if (targetContent) {
      targetContent.classList.remove('hidden');
    }

    // Load tab-specific data
    if (tabName === 'segments') {
      this.initializeCharts();
    }
  }

  // Edit customer (placeholder)
  editCustomer(customerId) {
    console.log('Edit customer:', customerId);
    // TODO: Implement edit functionality
    alert('Edit customer functionality will be implemented');
  }

  // Delete customer (placeholder)
  deleteCustomer(customerId) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลลูกค้านี้?')) {
      console.log('Delete customer:', customerId);
      // TODO: Implement delete functionality
      alert('Delete customer functionality will be implemented');
    }
  }

  // Utility methods
  updateElementText(selector, text) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = text;
    }
  }

  showLoadingIndicator() {
    const indicator = document.querySelector('[data-loading]');
    if (indicator) indicator.classList.remove('hidden');
  }

  hideLoadingIndicator() {
    const indicator = document.querySelector('[data-loading]');
    if (indicator) indicator.classList.add('hidden');
  }

  showError(message) {
    console.error('Customer Data Manager Error:', message);
    // TODO: Implement proper error display
    alert(message);
  }
}

// Initialize the Customer Data Manager when the page loads
let customerDataManager;

document.addEventListener('DOMContentLoaded', () => {
  customerDataManager = new CustomerDataManager();
});

// Export for global access
window.customerDataManager = customerDataManager;