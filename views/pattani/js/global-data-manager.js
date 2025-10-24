// Global Data Manager
console.log('🌐 Global Data Manager initialized');

const GlobalDataManager = {
  // Storage keys
  KEYS: {
    CART_DATA: 'cartData',
    CART_ITEMS: 'cartItems',
    CUSTOMER_DATA: 'customerData',
    BRANCH_DATA: 'branchData',
    SELECTED_PRODUCTS: 'selectedProducts',
    STEP1_PRODUCTS: 'step1_selectedProducts',
    DEPOSIT_NAV_DATA: 'depositNavigationData',
    SESSION_DATA: 'sessionData'
  },

  // Initialize
  init: function() {
    console.log('🔧 Initializing Global Data Manager');
    this.checkDataIntegrity();
  },

  // Check data integrity
  checkDataIntegrity: function() {
    const keys = Object.values(this.KEYS);
    keys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          JSON.parse(data); // Test if parseable
          console.log(`✅ ${key}: Valid`);
        }
      } catch (error) {
        console.error(`❌ ${key}: Corrupted, removing...`);
        localStorage.removeItem(key);
      }
    });
  },

  // Get data with fallback
  getData: function(key, fallback = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return fallback;
    }
  },

  // Set data
  setData: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      console.log(`✅ Saved ${key}`);
      return true;
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      return false;
    }
  },

  // Remove data
  removeData: function(key) {
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed ${key}`);
      return true;
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      return false;
    }
  },

  // Clear all data
  clearAll: function() {
    const keys = Object.values(this.KEYS);
    keys.forEach(key => {
      this.removeData(key);
    });
    console.log('🗑️ All data cleared');
  },

  // Get cart data
  getCartData: function() {
    return this.getData(this.KEYS.CART_DATA, []);
  },

  // Set cart data
  setCartData: function(data) {
    return this.setData(this.KEYS.CART_DATA, data);
  },

  // Get customer data
  getCustomerData: function() {
    return this.getData(this.KEYS.CUSTOMER_DATA, {});
  },

  // Set customer data
  setCustomerData: function(data) {
    return this.setData(this.KEYS.CUSTOMER_DATA, data);
  },

  // Get branch data
  getBranchData: function() {
    return this.getData(this.KEYS.BRANCH_DATA, {});
  },

  // Set branch data
  setBranchData: function(data) {
    return this.setData(this.KEYS.BRANCH_DATA, data);
  },

  // Get selected products
  getSelectedProducts: function() {
    return this.getData(this.KEYS.SELECTED_PRODUCTS, []) ||
           this.getData(this.KEYS.STEP1_PRODUCTS, []);
  },

  // Set selected products
  setSelectedProducts: function(products) {
    this.setData(this.KEYS.SELECTED_PRODUCTS, products);
    this.setData(this.KEYS.STEP1_PRODUCTS, products);
  },

  // Sync data across tabs
  syncAcrossTabs: function() {
    window.addEventListener('storage', (e) => {
      if (Object.values(this.KEYS).includes(e.key)) {
        console.log(`📡 Data synced from another tab: ${e.key}`);
        // Trigger custom event for data change
        const event = new CustomEvent('dataChanged', {
          detail: {
            key: e.key,
            oldValue: e.oldValue,
            newValue: e.newValue
          }
        });
        document.dispatchEvent(event);
      }
    });
  },

  // Export all data
  exportAllData: function() {
    const data = {};
    Object.entries(this.KEYS).forEach(([name, key]) => {
      data[name] = this.getData(key);
    });
    return data;
  },

  // Import data
  importData: function(data) {
    Object.entries(data).forEach(([name, value]) => {
      if (this.KEYS[name]) {
        this.setData(this.KEYS[name], value);
      }
    });
    console.log('✅ Data imported successfully');
  }
};

// Initialize and make globally available
GlobalDataManager.init();
GlobalDataManager.syncAcrossTabs();
window.GlobalDataManager = GlobalDataManager;