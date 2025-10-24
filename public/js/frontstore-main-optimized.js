/**
 * FrontStore Main Script - Optimized Version
 * This script integrates the optimizer module with the existing frontstore functionality
 */

(function() {
  'use strict';

  // Global variables
  let optimizer = null;
  let cartItems = [];
  let approvedStocks = [];
  let hiddenProductIds = new Set();

  // Performance metrics
  const metrics = {
    startTime: performance.now(),
    apiCalls: 0,
    domUpdates: 0,
    cacheHits: 0
  };

  // ============================================
  // Initialize Optimizer
  // ============================================
  async function initializeOptimizer() {
    console.log('🚀 Initializing FrontStore Optimizer...');

    try {
      // Create optimizer instance
      optimizer = new window.FrontStoreOptimizer();

      // Initialize with performance monitoring
      const startTime = performance.now();
      await optimizer.init();
      const initTime = performance.now() - startTime;

      console.log(`✅ Optimizer initialized in ${initTime.toFixed(2)}ms`);

      // Load cart from localStorage
      loadCartFromStorage();

      // Setup optimized event handlers
      setupOptimizedEventHandlers();

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize optimizer:', error);
      return false;
    }
  }

  // ============================================
  // Optimized Cart Management
  // ============================================
  const CartManager = {
    items: [],
    listeners: new Set(),

    init() {
      this.loadFromStorage();
      this.setupAutoSave();
    },

    loadFromStorage() {
      try {
        const stored = localStorage.getItem('cartItems');
        this.items = stored ? JSON.parse(stored) : [];
        cartItems = this.items; // Update global variable
      } catch (error) {
        console.error('Error loading cart:', error);
        this.items = [];
      }
    },

    saveToStorage: window.FrontStoreUtils.debounce(function() {
      try {
        localStorage.setItem('cartItems', JSON.stringify(this.items));
        localStorage.setItem('cartLastUpdated', Date.now().toString());
      } catch (error) {
        console.error('Error saving cart:', error);
      }
    }, 500),

    setupAutoSave() {
      // Auto-save on changes
      this.addListener(() => this.saveToStorage());

      // Sync across tabs
      window.addEventListener('storage', (e) => {
        if (e.key === 'cartItems' && e.newValue) {
          this.items = JSON.parse(e.newValue);
          this.notifyListeners();
        }
      });
    },

    add(item) {
      const existingIndex = this.items.findIndex(i =>
        i.id === item.id && i.imei === item.imei
      );

      if (existingIndex !== -1) {
        // For quantity items, increase qty
        if (!item.imei) {
          this.items[existingIndex].qty += item.qty || 1;
        }
      } else {
        this.items.push({
          ...item,
          addedAt: Date.now()
        });
      }

      cartItems = this.items; // Update global
      this.notifyListeners();
    },

    remove(index) {
      if (index >= 0 && index < this.items.length) {
        const removed = this.items.splice(index, 1)[0];

        // Remove from hidden products if IMEI
        if (removed.imei && hiddenProductIds.has(removed.id)) {
          hiddenProductIds.delete(removed.id);
        }

        cartItems = this.items; // Update global
        this.notifyListeners();
      }
    },

    clear() {
      this.items = [];
      cartItems = [];
      hiddenProductIds.clear();
      this.notifyListeners();
    },

    getTotals() {
      // Use memoized calculation if available
      if (optimizer && optimizer.calculateTotalsMemo) {
        return optimizer.calculateTotalsMemo(this.items);
      }

      // Fallback calculation
      return this.items.reduce((acc, item) => {
        acc.subtotal += item.price * item.qty;
        acc.count += item.qty;
        return acc;
      }, { subtotal: 0, count: 0 });
    },

    addListener(callback) {
      this.listeners.add(callback);
    },

    removeListener(callback) {
      this.listeners.delete(callback);
    },

    notifyListeners() {
      this.listeners.forEach(callback => {
        try {
          callback(this.items);
        } catch (error) {
          console.error('Cart listener error:', error);
        }
      });
    }
  };

  // ============================================
  // Optimized Stock Loading
  // ============================================
  async function loadStocksOptimized() {
    const branchCode = localStorage.getItem('branchCode') || 'HQ';
    const cacheKey = `stocks:${branchCode}`;

    try {
      metrics.apiCalls++;

      // Use optimizer's API service with caching
      const data = await optimizer.apiService.fetchWithCache(
        `/api/branchstock?branch=${branchCode}&purchaseType=cash`,
        {},
        cacheKey,
        600000 // 10 minutes cache
      );

      if (data?.data) {
        // Process in chunks for better performance
        const processed = await window.FrontStoreUtils.processInChunks(
          data.data,
          processStockItem,
          50,
          0
        );

        approvedStocks = processed.filter(item =>
          item.stock_value > 0 && item.verified
        );

        // Update optimizer's data store
        optimizer.dataStore.setStocks(approvedStocks);

        console.log(`✅ Loaded ${approvedStocks.length} stocks`);
        return approvedStocks;
      }
    } catch (error) {
      console.error('Error loading stocks:', error);
      return [];
    }
  }

  function processStockItem(item) {
    // Add computed properties
    item.originalStockValue = item.stock_value;
    item.displayName = extractProductName(item.name);
    item.category = determineCategory(item);
    return item;
  }

  function extractProductName(fullName) {
    const match = fullName.match(/^([^(\[]+)/);
    return match ? match[1].trim() : fullName;
  }

  function determineCategory(item) {
    return optimizer ?
      optimizer.dataStore.determineCategory(item) :
      'อื่นๆ';
  }

  // ============================================
  // Optimized Rendering
  // ============================================
  const RenderManager = {
    renderQueue: [],
    isRendering: false,

    queueRender(fn) {
      this.renderQueue.push(fn);
      this.processQueue();
    },

    processQueue: window.FrontStoreUtils.throttle(async function() {
      if (this.isRendering || this.renderQueue.length === 0) return;

      this.isRendering = true;

      while (this.renderQueue.length > 0) {
        const fn = this.renderQueue.shift();
        try {
          await fn();
        } catch (error) {
          console.error('Render error:', error);
        }
      }

      this.isRendering = false;
    }, 16), // 60fps

    renderCart() {
      this.queueRender(() => this._renderCartOptimized());
    },

    async _renderCartOptimized() {
      metrics.domUpdates++;

      const tbody = document.querySelector('#cartTable tbody');
      if (!tbody) return;

      // Use DocumentFragment for batch DOM updates
      const fragment = document.createDocumentFragment();

      if (CartManager.items.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
          <td colspan="4" class="text-center text-gray-500 py-6">
            <i class="bi bi-cart-x text-3xl mb-2 block"></i>
            ไม่มีสินค้าในตะกร้า
          </td>
        `;
        fragment.appendChild(emptyRow);
      } else {
        // Build rows efficiently
        CartManager.items.forEach((item, idx) => {
          const row = this.createCartRow(item, idx);
          fragment.appendChild(row);
        });
      }

      // Single DOM update
      tbody.innerHTML = '';
      tbody.appendChild(fragment);

      // Update totals
      this.updateTotals();
    },

    createCartRow(item, idx) {
      const row = document.createElement('tr');
      const lineTotal = item.qty * item.price;

      // Create cells
      const nameCell = document.createElement('td');
      nameCell.innerHTML = `
        ${item.name}
        <div class="text-xs text-gray-500">
          จำนวน: ${item.qty}
          ${item.imei ? `<br>IMEI: <span class="font-mono text-blue-600">${item.imei}</span>` : ''}
        </div>
      `;

      const priceCell = document.createElement('td');
      priceCell.textContent = `฿${formatPrice(item.price)}`;

      const totalCell = document.createElement('td');
      totalCell.textContent = `฿${formatPrice(lineTotal)}`;

      const actionCell = document.createElement('td');
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-sm btn-error';
      removeBtn.innerHTML = '<i class="bi bi-trash"></i>';
      removeBtn.dataset.idx = idx;
      removeBtn.addEventListener('click', () => CartManager.remove(idx));
      actionCell.appendChild(removeBtn);

      row.appendChild(nameCell);
      row.appendChild(priceCell);
      row.appendChild(totalCell);
      row.appendChild(actionCell);

      return row;
    },

    updateTotals() {
      const totals = CartManager.getTotals();

      // Update DOM elements
      const elements = {
        cartCount: document.getElementById('cartCount'),
        subTotal: document.getElementById('subTotal'),
        totalPrice: document.getElementById('totalPrice')
      };

      if (elements.cartCount) {
        elements.cartCount.textContent = CartManager.items.length;
      }

      if (elements.subTotal) {
        elements.subTotal.textContent = formatPrice(totals.subtotal);
      }

      if (elements.totalPrice) {
        elements.totalPrice.textContent = formatPrice(totals.subtotal);
      }
    }
  };

  // ============================================
  // Optimized Search
  // ============================================
  const SearchManager = {
    searchCache: new Map(),
    searchTimeout: null,

    search: window.FrontStoreUtils.debounce(async function(query) {
      if (!query || query.length < 2) {
        this.clearResults();
        return;
      }

      // Check cache
      if (this.searchCache.has(query)) {
        const cached = this.searchCache.get(query);
        if (Date.now() - cached.timestamp < 30000) { // 30 seconds cache
          metrics.cacheHits++;
          this.displayResults(cached.results);
          return;
        }
      }

      try {
        // Show loading
        if (window.LoadingSystem) {
          const loaderId = window.LoadingSystem.show({
            message: 'กำลังค้นหา...',
            showProgress: true
          });

          // Perform search
          const results = await this.performSearch(query);

          // Cache results
          this.searchCache.set(query, {
            results,
            timestamp: Date.now()
          });

          // Display results
          this.displayResults(results);

          // Hide loading
          window.LoadingSystem.hide(loaderId);
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 300),

    async performSearch(query) {
      const isImei = /^\d+$/.test(query);
      const lowerQuery = query.toLowerCase();

      // Use optimizer's data store for fast searching
      if (optimizer && optimizer.dataStore.stocks.length > 0) {
        // Filter from memory (much faster than API call)
        return optimizer.dataStore.stocks.filter(item => {
          if (isImei) {
            return item.imei && item.imei.includes(query);
          } else {
            return item.name.toLowerCase().includes(lowerQuery);
          }
        });
      }

      // Fallback to API search
      metrics.apiCalls++;
      const token = localStorage.getItem('authToken') || '';
      const branchCode = localStorage.getItem('branchCode') || 'HQ';

      const url = `/api/branchstock/search?branch=${branchCode}&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      return data.data || [];
    },

    displayResults(results) {
      const container = document.getElementById('searchResults');
      if (!container) return;

      metrics.domUpdates++;

      // Group results for better display
      const grouped = this.groupResults(results);

      // Use optimizer's DOM builder
      if (optimizer) {
        const elements = grouped.map(group =>
          optimizer.domBuilder.buildProductCard(group)
        );
        optimizer.domBuilder.batchUpdate(container, elements);
      } else {
        // Fallback rendering
        container.innerHTML = results.map(item => `
          <div class="search-result-item">
            <span>${item.name}</span>
            <span>฿${formatPrice(item.price)}</span>
          </div>
        `).join('');
      }
    },

    groupResults(results) {
      // Group by product name for better UX
      const grouped = new Map();

      results.forEach(item => {
        const key = item.displayName || item.name;
        if (!grouped.has(key)) {
          grouped.set(key, {
            name: key,
            items: [],
            minPrice: Infinity,
            maxPrice: 0,
            totalStock: 0
          });
        }

        const group = grouped.get(key);
        group.items.push(item);
        group.minPrice = Math.min(group.minPrice, item.price);
        group.maxPrice = Math.max(group.maxPrice, item.price);
        group.totalStock += item.stock_value || 0;
      });

      return Array.from(grouped.values());
    },

    clearResults() {
      const container = document.getElementById('searchResults');
      if (container) {
        container.innerHTML = '';
      }
    }
  };

  // ============================================
  // Setup Event Handlers
  // ============================================
  function setupOptimizedEventHandlers() {
    // Search input
    const searchInput = document.getElementById('searchQuery');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        SearchManager.search(e.target.value);
      });
    }

    // Cart listeners
    CartManager.addListener(() => {
      RenderManager.renderCart();
    });

    // Add to cart events
    window.addEventListener('addToCart', (e) => {
      const { product } = e.detail;
      CartManager.add({
        id: product._id,
        name: product.name,
        price: product.price,
        qty: 1,
        imei: product.imei,
        taxType: product.taxType || 'ไม่มีภาษี'
      });
    });

    // Remove from cart events
    window.addEventListener('removeFromCart', (e) => {
      const { index } = e.detail;
      CartManager.remove(index);
    });

    // Performance monitoring
    if (window.location.hash === '#debug') {
      setInterval(() => {
        console.log('📊 Performance Metrics:', {
          ...metrics,
          uptime: `${((performance.now() - metrics.startTime) / 1000).toFixed(1)}s`,
          cacheStats: optimizer?.apiService?.getCacheStats(),
          cartItems: CartManager.items.length
        });
      }, 5000);
    }
  }

  // ============================================
  // Helper Functions
  // ============================================
  function loadCartFromStorage() {
    CartManager.init();
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }

  function getImageUrl(image) {
    if (!image) return '/images/no-image.png';
    if (image.startsWith('http')) return image;
    return `/uploads/${image}`;
  }

  // ============================================
  // Initialization
  // ============================================
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Starting optimized FrontStore...');

    // Initialize optimizer
    const success = await initializeOptimizer();

    if (success) {
      // Load initial data
      await loadStocksOptimized();

      // Render initial cart
      RenderManager.renderCart();

      console.log('✅ FrontStore ready!');

      // Show ready notification
      if (typeof showToast === 'function') {
        showToast('ระบบพร้อมใช้งาน', 'success');
      }
    } else {
      console.error('❌ Failed to initialize FrontStore');

      if (typeof showToast === 'function') {
        showToast('เกิดข้อผิดพลาดในการเริ่มระบบ', 'error');
      }
    }
  });

  // Export for global access
  window.CartManager = CartManager;
  window.SearchManager = SearchManager;
  window.RenderManager = RenderManager;

})();