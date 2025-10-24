// Customer Search Manager
console.log('🔍 Customer Search Manager loaded');

const CustomerSearchManager = {
  searchTimeout: null,
  currentRequest: null,

  // Initialize
  init: function() {
    console.log('🔧 Initializing Customer Search Manager');
    this.bindEvents();
  },

  // Bind events
  bindEvents: function() {
    const searchInputs = document.querySelectorAll('[data-customer-search]');
    searchInputs.forEach(input => {
      input.addEventListener('input', (e) => this.handleSearch(e));
      input.addEventListener('focus', (e) => this.showSuggestions(e));
    });

    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-customer-search]')) {
        this.closeSuggestions();
      }
    });
  },

  // Handle search input
  handleSearch: function(event) {
    const query = event.target.value.trim();

    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce search
    this.searchTimeout = setTimeout(() => {
      if (query.length >= 2) {
        this.searchCustomers(query, event.target);
      } else {
        this.closeSuggestions();
      }
    }, 300);
  },

  // Search customers
  searchCustomers: async function(query, inputElement) {
    try {
      // Cancel previous request
      if (this.currentRequest) {
        this.currentRequest.abort();
      }

      const controller = new AbortController();
      this.currentRequest = controller;

      const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const customers = await response.json();
      this.displaySuggestions(customers, inputElement);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('❌ Customer search error:', error);
      }
    }
  },

  // Display suggestions
  displaySuggestions: function(customers, inputElement) {
    // Remove existing suggestions
    this.closeSuggestions();

    if (!customers || customers.length === 0) {
      return;
    }

    // Create suggestions container
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'customer-suggestions';
    suggestionsDiv.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;

    customers.forEach(customer => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.style.cssText = `
        padding: 10px;
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;
      `;

      item.innerHTML = `
        <div style="font-weight: bold;">${customer.name}</div>
        <div style="font-size: 12px; color: #666;">
          ${customer.id_card || customer.phone || ''}
        </div>
      `;

      item.addEventListener('click', () => {
        this.selectCustomer(customer, inputElement);
      });

      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f5f5f5';
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'white';
      });

      suggestionsDiv.appendChild(item);
    });

    // Position relative to input
    const inputRect = inputElement.getBoundingClientRect();
    const wrapper = inputElement.parentElement;
    wrapper.style.position = 'relative';
    wrapper.appendChild(suggestionsDiv);
  },

  // Select customer
  selectCustomer: function(customer, inputElement) {
    console.log('✅ Customer selected:', customer);

    // Fill input
    inputElement.value = customer.name;

    // Store customer data
    if (window.GlobalDataManager) {
      window.GlobalDataManager.setCustomerData(customer);
    }

    // Fill other fields if they exist
    this.fillCustomerFields(customer);

    // Close suggestions
    this.closeSuggestions();

    // Trigger custom event
    const event = new CustomEvent('customerSelected', { detail: customer });
    document.dispatchEvent(event);
  },

  // Fill customer fields
  fillCustomerFields: function(customer) {
    const fields = {
      'customerName': customer.name,
      'customerPhone': customer.phone,
      'customerIdCard': customer.id_card,
      'customerAddress': customer.address,
      'customerEmail': customer.email
    };

    Object.entries(fields).forEach(([id, value]) => {
      const field = document.getElementById(id);
      if (field && value) {
        field.value = value;
      }
    });
  },

  // Show suggestions
  showSuggestions: function(event) {
    const query = event.target.value.trim();
    if (query.length >= 2) {
      this.searchCustomers(query, event.target);
    }
  },

  // Close suggestions
  closeSuggestions: function() {
    const suggestions = document.querySelectorAll('.customer-suggestions');
    suggestions.forEach(s => s.remove());
  }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    CustomerSearchManager.init();
  });
} else {
  CustomerSearchManager.init();
}

// Export
window.CustomerSearchManager = CustomerSearchManager;