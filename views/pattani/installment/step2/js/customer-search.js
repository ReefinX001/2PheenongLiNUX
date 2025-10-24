/**
 * Customer Search Manager
 * จัดการการค้นหาลูกค้าเก่าและเติมข้อมูลลงในฟอร์ม
 */
class CustomerSearchManager {
  constructor() {
    this.searchInput = null;
    this.searchButton = null;
    this.resultsContainer = null;
    this.resultsList = null;
    this.debounceTimer = null;
    this.isSearching = false;
    this.lastSearchQuery = '';
    this.searchResults = [];
  }

  initialize() {
    console.log('🔍 Initializing Customer Search Manager...');

    this.setupElements();
    this.setupEventListeners();
    this.setupKeyboardNavigation();

    console.log('✅ Customer Search Manager initialized');
  }

  setupElements() {
    this.searchInput = document.getElementById('customerSearch');
    this.searchButton = document.getElementById('btnSearchCustomer');
    this.resultsContainer = document.getElementById('customerSearchResults');
    this.resultsList = document.getElementById('customerResultsList');

    if (!this.searchInput || !this.searchButton || !this.resultsContainer || !this.resultsList) {
      console.warn('⚠️ Some customer search elements not found');
    }
  }

  setupEventListeners() {
    if (!this.searchInput || !this.searchButton) return;

    // Input event for auto-search when typing ID card (13 digits)
    this.searchInput.addEventListener('input', (e) => {
      this.handleInputChange(e.target.value);
    });

    // Button click event
    this.searchButton.addEventListener('click', () => {
      this.performSearch(this.searchInput.value);
    });

    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.resultsContainer.contains(e.target) &&
          !this.searchInput.contains(e.target) &&
          !this.searchButton.contains(e.target)) {
        this.hideResults();
      }
    });
  }

  setupKeyboardNavigation() {
    if (!this.searchInput) return;

    this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
        this.performSearch(e.target.value);
      } else if (e.key === 'Escape') {
        this.hideResults();
        }
      });
    }

  handleInputChange(value) {
    // Clear previous timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Format ID card number
    const cleanValue = value.replace(/\D/g, '');
    const formattedValue = this.formatIdCard(cleanValue);

    if (this.searchInput.value !== formattedValue) {
      this.searchInput.value = formattedValue;
    }

    // Auto-search when 13 digits are entered
    if (cleanValue.length === 13) {
      this.debounceTimer = setTimeout(() => {
        this.performSearch(cleanValue);
      }, 500);
    } else if (cleanValue.length < 13) {
      this.hideResults();
    }
  }

  formatIdCard(value) {
    if (value.length <= 1) return value;
    if (value.length <= 5) return `${value.slice(0, 1)}-${value.slice(1)}`;
    if (value.length <= 10) return `${value.slice(0, 1)}-${value.slice(1, 5)}-${value.slice(5)}`;
    if (value.length <= 12) return `${value.slice(0, 1)}-${value.slice(1, 5)}-${value.slice(5, 10)}-${value.slice(10)}`;
    return `${value.slice(0, 1)}-${value.slice(1, 5)}-${value.slice(5, 10)}-${value.slice(10, 12)}-${value.slice(12, 13)}`;
  }

  async performSearch(query) {
    if (!query || query.length < 3) {
      this.showToast('กรุณาใส่เลขบัตรประชาชนอย่างน้อย 3 หลัก', 'warning');
      return;
    }

    // Prevent duplicate searches
    if (this.isSearching || query === this.lastSearchQuery) {
      return;
    }

    this.isSearching = true;
    this.lastSearchQuery = query;
    this.searchButton.disabled = true;
    this.searchButton.innerHTML = '<i class="bi bi-search animate-spin"></i>';

    try {
      console.log(`🔍 Searching for customer: ${query}`);

      // Mock search - replace with actual API call
      const results = await this.mockCustomerSearch(query);

      this.searchResults = results;
      this.displayResults(results);

    } catch (error) {
      console.error('❌ Customer search error:', error);
      this.showToast('เกิดข้อผิดพลาดในการค้นหาลูกค้า', 'error');
      this.hideResults();
    } finally {
      this.isSearching = false;
      this.searchButton.disabled = false;
      this.searchButton.innerHTML = '<i class="bi bi-search"></i>';
    }
  }

  async mockCustomerSearch(query) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock customer data - replace with actual API call
    const mockCustomers = [
      {
        id: '1234567890123',
        prefix: 'นาย',
        firstName: 'สมชาย',
        lastName: 'ใจดี',
        phone: '081-234-5678',
        email: 'somchai@email.com',
        birthDate: '1990-01-15',
        age: 34,
        occupation: 'พนักงานบริษัท',
        income: 25000,
        address: {
          houseNo: '123',
          moo: '5',
          province: 'ปัตตานี',
          district: 'เมืองปัตตานี',
          subDistrict: 'สไบ',
          zipcode: '94000'
        }
      },
      {
        id: '1234567890124',
        prefix: 'นาง',
        firstName: 'สมหญิง',
        lastName: 'ดีใจ',
        phone: '081-234-5679',
        email: 'somying@email.com',
        birthDate: '1985-05-20',
        age: 39,
        occupation: 'ข้าราชการ',
        income: 30000,
        address: {
          houseNo: '456',
          moo: '3',
          province: 'ปัตตานี',
          district: 'หนองจิก',
          subDistrict: 'หนองจิก',
          zipcode: '94170'
        }
      }
    ];

    // Filter by ID card (simulate search)
    const cleanQuery = query.replace(/\D/g, '');
    return mockCustomers.filter(customer =>
      customer.id.includes(cleanQuery)
    );
  }

  displayResults(results) {
    if (!results || results.length === 0) {
      this.showNoResults();
      return;
    }

    let html = '';
    results.forEach((customer, index) => {
      html += `
        <div class="customer-result-item p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0" 
             onclick="window.customerSearchManager.selectCustomer(${index})">
          <div class="flex items-start justify-between">
          <div class="flex-1">
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">
                ${customer.prefix}${customer.firstName} ${customer.lastName}
              </h4>
              <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <div>📱 ${customer.phone}</div>
                <div>🆔 ${this.formatIdCard(customer.id)}</div>
                <div>📍 ${customer.address.province}, ${customer.address.district}</div>
              </div>
            </div>
            <div class="text-right text-sm">
              <div class="text-blue-600 dark:text-blue-400 font-medium">อายุ ${customer.age} ปี</div>
              <div class="text-gray-500">${customer.occupation}</div>
            </div>
          </div>
        </div>
      `;
    });

    this.resultsList.innerHTML = html;
    this.showResults();

    console.log(`✅ Found ${results.length} customer(s)`);
  }

  showNoResults() {
    this.resultsList.innerHTML = `
      <div class="p-4 text-center text-gray-500 dark:text-gray-400">
        <i class="bi bi-search text-2xl mb-2 block"></i>
        <p>ไม่พบข้อมูลลูกค้า</p>
        <p class="text-xs mt-1">ลองใส่เลขบัตรประชาชนที่ถูกต้อง</p>
      </div>
    `;
    this.showResults();
  }

  showResults() {
    if (this.resultsContainer) {
      this.resultsContainer.classList.remove('hidden');
    }
  }

  hideResults() {
    if (this.resultsContainer) {
      this.resultsContainer.classList.add('hidden');
    }
  }

  selectCustomer(index) {
    const customer = this.searchResults[index];
    if (!customer) return;

    console.log('👤 Selecting customer:', customer.firstName, customer.lastName);

    // Fill form with customer data
    this.fillCustomerForm(customer);

    // Hide results
    this.hideResults();

    // Show success message
    this.showToast(`เลือกลูกค้า: ${customer.prefix}${customer.firstName} ${customer.lastName}`, 'success');
  }

  fillCustomerForm(customer) {
    // Basic information
    this.setFormValue('customerPrefix', customer.prefix);
    this.setFormValue('customerFirstName', customer.firstName);
    this.setFormValue('customerLastName', customer.lastName);
    this.setFormValue('customerIdCard', this.formatIdCard(customer.id));
    this.setFormValue('customerPhone', customer.phone);
    this.setFormValue('customerEmail', customer.email);
    this.setFormValue('customerBirthDate', customer.birthDate);
    this.setFormValue('customerAge', customer.age);
    this.setFormValue('customerOccupation', customer.occupation);
    this.setFormValue('customerIncome', customer.income);

    // Address information
    if (customer.address) {
      this.setFormValue('houseNo', customer.address.houseNo);
      this.setFormValue('moo', customer.address.moo);
      this.setFormValue('province', customer.address.province);
      this.setFormValue('district', customer.address.district);
      this.setFormValue('subDistrict', customer.address.subDistrict);
      this.setFormValue('zipcode', customer.address.zipcode);
    }

    // Trigger form validation update
    this.updateFormProgress();
  }

  setFormValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element && value !== undefined && value !== null) {
      element.value = value;

      // Trigger change event for validation
      const event = new Event('change', { bubbles: true });
      element.dispatchEvent(event);
    }
  }

  updateFormProgress() {
    // Trigger form progress update if available
    if (typeof window.updateFormProgress === 'function') {
      setTimeout(() => {
        window.updateFormProgress();
      }, 500);
    }
  }

  showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log(`Toast: ${message}`);
    }
  }
}

// Make it globally available
window.CustomerSearchManager = CustomerSearchManager;