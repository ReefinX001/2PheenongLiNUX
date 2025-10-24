/**
 * FrontStore Performance Optimizer
 * Version: 2.0.0
 * Description: Optimized module for frontstore operations with caching and performance improvements
 */

(function(window) {
  'use strict';

  // ============================================
  // Performance Monitoring
  // ============================================
  const PerformanceMonitor = {
    marks: new Map(),
    measures: new Map(),

    start(label) {
      this.marks.set(label, performance.now());
    },

    end(label) {
      if (!this.marks.has(label)) return;
      const duration = performance.now() - this.marks.get(label);
      this.measures.set(label, duration);

      if (duration > 100) {
        console.warn(`⚠️ Slow operation: ${label} took ${duration.toFixed(2)}ms`);
      }

      this.marks.delete(label);
      return duration;
    },

    report() {
      const report = {};
      this.measures.forEach((value, key) => {
        report[key] = `${value.toFixed(2)}ms`;
      });
      return report;
    }
  };

  // ============================================
  // Cache Manager with LRU and TTL
  // ============================================
  class CacheManager {
    constructor(maxSize = 100, defaultTTL = 300000) { // 5 minutes default
      this.cache = new Map();
      this.maxSize = maxSize;
      this.defaultTTL = defaultTTL;
      this.hits = 0;
      this.misses = 0;
    }

    set(key, value, ttl = this.defaultTTL) {
      // LRU: Remove oldest if cache is full
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      this.cache.set(key, {
        value,
        expires: Date.now() + ttl,
        hits: 0
      });
    }

    get(key) {
      const item = this.cache.get(key);

      if (!item) {
        this.misses++;
        return null;
      }

      if (Date.now() > item.expires) {
        this.cache.delete(key);
        this.misses++;
        return null;
      }

      // Update LRU order
      this.cache.delete(key);
      this.cache.set(key, item);

      item.hits++;
      this.hits++;
      return item.value;
    }

    clear() {
      this.cache.clear();
      this.hits = 0;
      this.misses = 0;
    }

    getStats() {
      const hitRate = this.hits + this.misses > 0
        ? (this.hits / (this.hits + this.misses) * 100).toFixed(2)
        : 0;
      return {
        size: this.cache.size,
        hits: this.hits,
        misses: this.misses,
        hitRate: `${hitRate}%`
      };
    }
  }

  // ============================================
  // Optimized Data Store with Indexing
  // ============================================
  class DataStore {
    constructor() {
      this.stocks = [];
      this.stocksById = new Map();
      this.stocksByName = new Map();
      this.stocksByCategory = new Map();
      this.categories = new Set();
      this.lastUpdated = null;
    }

    setStocks(stocks) {
      PerformanceMonitor.start('DataStore.setStocks');

      this.stocks = stocks;
      this.stocksById.clear();
      this.stocksByName.clear();
      this.stocksByCategory.clear();
      this.categories.clear();

      // Build indexes
      stocks.forEach(stock => {
        // Index by ID
        this.stocksById.set(stock._id, stock);

        // Index by name
        const name = this.extractProductName(stock.name);
        if (!this.stocksByName.has(name)) {
          this.stocksByName.set(name, []);
        }
        this.stocksByName.get(name).push(stock);

        // Index by category
        const category = this.determineCategory(stock);
        if (!this.stocksByCategory.has(category)) {
          this.stocksByCategory.set(category, []);
        }
        this.stocksByCategory.get(category).push(stock);
        this.categories.add(category);
      });

      this.lastUpdated = Date.now();
      PerformanceMonitor.end('DataStore.setStocks');
    }

    extractProductName(fullName) {
      // Optimized product name extraction
      const match = fullName.match(/^([^(\[]+)/);
      return match ? match[1].trim() : fullName;
    }

    determineCategory(item) {
      const name = item.name.toLowerCase();
      const productType = item.product_id?.productType || item.productType || '';

      // Use Map for O(1) lookup instead of multiple if statements
      const categoryMap = new Map([
        ['โทรศัพท์', ['phone', 'smartphone', 'iphone', 'samsung', 'oppo', 'vivo', 'xiaomi']],
        ['แท็บเล็ต', ['tablet', 'ipad', 'tab']],
        ['นาฬิกา', ['watch', 'smart watch', 'apple watch']],
        ['หูฟัง', ['airpods', 'หูฟัง', 'earphone', 'headphone']],
        ['อุปกรณ์เสริม', ['case', 'cable', 'charger', 'adapter', 'power bank']]
      ]);

      for (const [category, keywords] of categoryMap) {
        if (keywords.some(keyword => name.includes(keyword))) {
          return category;
        }
      }

      return 'อื่นๆ';
    }

    getStockById(id) {
      return this.stocksById.get(id);
    }

    getStocksByName(name) {
      return this.stocksByName.get(name) || [];
    }

    getStocksByCategory(category) {
      return this.stocksByCategory.get(category) || [];
    }

    getAvailableStock(stockId) {
      const stock = this.stocksById.get(stockId);
      if (!stock) return 0;

      // Calculate from cart items (needs to be passed in)
      const cartQty = window.cartItems
        ?.filter(item => item.id === stockId)
        ?.reduce((sum, item) => sum + item.qty, 0) || 0;

      return Math.max(0, (stock.stock_value || 0) - cartQty);
    }
  }

  // ============================================
  // Optimized DOM Builder with Virtual DOM
  // ============================================
  class DOMBuilder {
    constructor() {
      this.fragment = null;
      this.templates = new Map();
    }

    createTemplate(id, html) {
      const template = document.createElement('template');
      template.innerHTML = html;
      this.templates.set(id, template);
      return template;
    }

    getTemplate(id) {
      return this.templates.get(id);
    }

    startBatch() {
      this.fragment = document.createDocumentFragment();
      return this.fragment;
    }

    createElement(tag, attributes = {}, children = []) {
      const element = document.createElement(tag);

      // Set attributes
      Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
          element.className = value;
        } else if (key === 'innerHTML') {
          element.innerHTML = value;
        } else if (key.startsWith('data-')) {
          element.dataset[key.slice(5)] = value;
        } else {
          element.setAttribute(key, value);
        }
      });

      // Add children
      children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
          element.appendChild(child);
        }
      });

      return element;
    }

    buildProductCard(product, options = {}) {
      const card = this.createElement('div', {
        className: 'product-card',
        'data-id': product._id
      });

      const content = this.createElement('div', { className: 'product-content' });

      // Name
      const name = this.createElement('h3', { className: 'product-name' }, [product.name]);
      content.appendChild(name);

      // Price
      const price = this.createElement('div', { className: 'product-price' }, [
        `฿${this.formatPrice(product.price)}`
      ]);
      content.appendChild(price);

      // Stock
      if (product.stock_value > 0) {
        const stock = this.createElement('div', { className: 'product-stock' }, [
          `คงเหลือ: ${product.stock_value}`
        ]);
        content.appendChild(stock);
      }

      // Add to cart button
      const button = this.createElement('button', {
        className: 'btn btn-primary add-to-cart',
        'data-id': product._id
      }, ['เพิ่มลงตะกร้า']);

      content.appendChild(button);
      card.appendChild(content);

      return card;
    }

    formatPrice(price) {
      return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price);
    }

    batchUpdate(container, elements) {
      PerformanceMonitor.start('DOMBuilder.batchUpdate');

      const fragment = document.createDocumentFragment();
      elements.forEach(el => fragment.appendChild(el));

      // Clear and append in one operation
      container.innerHTML = '';
      container.appendChild(fragment);

      PerformanceMonitor.end('DOMBuilder.batchUpdate');
    }
  }

  // ============================================
  // API Service with Request Batching
  // ============================================
  class APIService {
    constructor() {
      this.cache = new CacheManager(50, 300000); // 5 min TTL
      this.pendingRequests = new Map();
      this.requestQueue = [];
      this.processing = false;
    }

    async fetchWithCache(url, options = {}, cacheKey = null, ttl = 300000) {
      const key = cacheKey || `${url}:${JSON.stringify(options)}`;

      // Check cache first
      const cached = this.cache.get(key);
      if (cached) {
        console.log(`📦 Cache hit for: ${url}`);
        return cached;
      }

      // Check if request is already pending
      if (this.pendingRequests.has(key)) {
        console.log(`⏳ Waiting for pending request: ${url}`);
        return this.pendingRequests.get(key);
      }

      // Make the request
      const requestPromise = this.makeRequest(url, options)
        .then(data => {
          this.cache.set(key, data, ttl);
          this.pendingRequests.delete(key);
          return data;
        })
        .catch(error => {
          this.pendingRequests.delete(key);
          throw error;
        });

      this.pendingRequests.set(key, requestPromise);
      return requestPromise;
    }

    async makeRequest(url, options = {}) {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      };

      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    }

    async batchRequest(requests) {
      // Batch multiple requests and execute in parallel
      const promises = requests.map(req =>
        this.fetchWithCache(req.url, req.options, req.cacheKey, req.ttl)
      );

      return Promise.all(promises);
    }

    clearCache() {
      this.cache.clear();
    }

    getCacheStats() {
      return this.cache.getStats();
    }
  }

  // ============================================
  // Lazy Loader with Intersection Observer
  // ============================================
  class LazyLoader {
    constructor(options = {}) {
      this.options = {
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.01,
        batchSize: options.batchSize || 20
      };

      this.observer = null;
      this.loadedItems = new Set();
      this.initObserver();
    }

    initObserver() {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadItem(entry.target);
          }
        });
      }, {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      });
    }

    observe(element) {
      if (this.observer && element) {
        this.observer.observe(element);
      }
    }

    unobserve(element) {
      if (this.observer && element) {
        this.observer.unobserve(element);
      }
    }

    loadItem(element) {
      const id = element.dataset.lazyId;

      if (this.loadedItems.has(id)) {
        return;
      }

      this.loadedItems.add(id);

      // Trigger custom event for lazy load
      element.dispatchEvent(new CustomEvent('lazyload', {
        detail: { id },
        bubbles: true
      }));

      this.unobserve(element);
    }

    disconnect() {
      if (this.observer) {
        this.observer.disconnect();
      }
    }
  }

  // ============================================
  // Debounce and Throttle Utilities
  // ============================================
  const Utils = {
    debounce(func, delay = 300) {
      let timeoutId;
      return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    },

    throttle(func, limit = 100) {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    memoize(func, keyGenerator) {
      const cache = new Map();
      return function(...args) {
        const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

        if (cache.has(key)) {
          return cache.get(key);
        }

        const result = func.apply(this, args);
        cache.set(key, result);

        // Limit cache size
        if (cache.size > 100) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }

        return result;
      };
    },

    chunkArray(array, size = 50) {
      const chunks = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    },

    async processInChunks(items, processor, chunkSize = 50, delayMs = 10) {
      const chunks = this.chunkArray(items, chunkSize);
      const results = [];

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(item => processor(item))
        );
        results.push(...chunkResults);

        // Allow UI to update
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      return results;
    }
  };

  // ============================================
  // Web Worker Manager for Heavy Computations
  // ============================================
  class WorkerManager {
    constructor() {
      this.worker = null;
      this.callbacks = new Map();
      this.messageId = 0;
    }

    init() {
      const workerCode = `
        self.addEventListener('message', function(e) {
          const { id, type, data } = e.data;
          
          let result;
          switch(type) {
            case 'calculateTotals':
              result = calculateTotals(data);
              break;
            case 'filterProducts':
              result = filterProducts(data);
              break;
            case 'sortProducts':
              result = sortProducts(data);
              break;
            default:
              result = { error: 'Unknown operation' };
          }
          
          self.postMessage({ id, result });
        });

        function calculateTotals(items) {
          return items.reduce((acc, item) => {
            acc.total += item.price * item.qty;
            acc.count += item.qty;
            return acc;
          }, { total: 0, count: 0 });
        }

        function filterProducts(data) {
          const { products, criteria } = data;
          return products.filter(p => {
            if (criteria.minPrice && p.price < criteria.minPrice) return false;
            if (criteria.maxPrice && p.price > criteria.maxPrice) return false;
            if (criteria.category && p.category !== criteria.category) return false;
            if (criteria.inStock && p.stock_value <= 0) return false;
            return true;
          });
        }

        function sortProducts(data) {
          const { products, sortBy, order } = data;
          return products.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            return order === 'asc' ? aVal - bVal : bVal - aVal;
          });
        }
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      this.worker.addEventListener('message', (e) => {
        const { id, result } = e.data;
        const callback = this.callbacks.get(id);

        if (callback) {
          callback(result);
          this.callbacks.delete(id);
        }
      });
    }

    async execute(type, data) {
      if (!this.worker) {
        this.init();
      }

      return new Promise((resolve) => {
        const id = ++this.messageId;
        this.callbacks.set(id, resolve);
        this.worker.postMessage({ id, type, data });
      });
    }

    terminate() {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
    }
  }

  // ============================================
  // Main FrontStore Optimizer
  // ============================================
  class FrontStoreOptimizer {
    constructor() {
      this.dataStore = new DataStore();
      this.domBuilder = new DOMBuilder();
      this.apiService = new APIService();
      this.lazyLoader = new LazyLoader();
      this.workerManager = new WorkerManager();

      // Memoized functions
      this.calculateTotalsMemo = Utils.memoize(
        this.calculateTotals.bind(this),
        (items) => JSON.stringify(items.map(i => ({ id: i.id, qty: i.qty, price: i.price })))
      );

      // Debounced functions
      this.searchDebounced = Utils.debounce(this.search.bind(this), 300);
      this.renderDebounced = Utils.debounce(this.render.bind(this), 100);

      console.log('✅ FrontStore Optimizer initialized');
    }

    async init() {
      PerformanceMonitor.start('FrontStoreOptimizer.init');

      try {
        // Load initial data with caching
        await this.loadInitialData();

        // Setup event listeners
        this.setupEventListeners();

        // Initialize worker
        this.workerManager.init();

        const duration = PerformanceMonitor.end('FrontStoreOptimizer.init');
        console.log(`✅ Initialization completed in ${duration.toFixed(2)}ms`);

        return true;
      } catch (error) {
        console.error('❌ Initialization failed:', error);
        return false;
      }
    }

    async loadInitialData() {
      const branchCode = localStorage.getItem('branchCode') || 'HQ';

      // Batch API requests
      const requests = [
        {
          url: `/api/branchstock?branch=${branchCode}&purchaseType=cash`,
          cacheKey: `stocks:${branchCode}`,
          ttl: 600000 // 10 minutes
        },
        {
          url: '/api/promotion/active',
          cacheKey: 'promotions:active',
          ttl: 300000 // 5 minutes
        }
      ];

      const [stocksData, promotionsData] = await this.apiService.batchRequest(requests);

      // Process stocks in chunks
      if (stocksData?.data) {
        await Utils.processInChunks(
          stocksData.data,
          (stock) => this.processStock(stock),
          100,
          0
        );

        this.dataStore.setStocks(stocksData.data);
      }

      return { stocks: stocksData, promotions: promotionsData };
    }

    processStock(stock) {
      // Add computed properties
      stock.originalStockValue = stock.stock_value;
      stock.displayName = this.dataStore.extractProductName(stock.name);
      stock.category = this.dataStore.determineCategory(stock);
      return stock;
    }

    async search(query) {
      PerformanceMonitor.start('search');

      if (!query || query.length < 2) {
        return [];
      }

      // Use worker for filtering
      const results = await this.workerManager.execute('filterProducts', {
        products: this.dataStore.stocks,
        criteria: {
          name: query.toLowerCase(),
          inStock: true
        }
      });

      PerformanceMonitor.end('search');
      return results;
    }

    render(container, items) {
      PerformanceMonitor.start('render');

      // Build elements in batch
      const elements = items.map(item =>
        this.domBuilder.buildProductCard(item)
      );

      // Update DOM in single operation
      this.domBuilder.batchUpdate(container, elements);

      // Setup lazy loading for images
      elements.forEach(el => {
        const img = el.querySelector('img[data-lazy]');
        if (img) {
          this.lazyLoader.observe(img);
        }
      });

      PerformanceMonitor.end('render');
    }

    calculateTotals(items) {
      // This will be memoized
      const result = {
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        itemCount: items.length
      };

      items.forEach(item => {
        const lineTotal = item.price * item.qty;
        result.subtotal += lineTotal;

        // Calculate tax if applicable
        if (item.taxType === 'รวมภาษี') {
          const netAmount = lineTotal / 1.07;
          result.tax += lineTotal - netAmount;
        } else if (item.taxType === 'แยกภาษี') {
          result.tax += lineTotal * 0.07;
        }
      });

      result.total = result.subtotal + result.tax - result.discount;

      return result;
    }

    setupEventListeners() {
      // Use event delegation for better performance
      document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-cart')) {
          this.handleAddToCart(e.target);
        } else if (e.target.classList.contains('remove-from-cart')) {
          this.handleRemoveFromCart(e.target);
        }
      });

      // Search input with debouncing
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchDebounced(e.target.value);
        });
      }
    }

    handleAddToCart(button) {
      const productId = button.dataset.id;
      const product = this.dataStore.getStockById(productId);

      if (product && this.dataStore.getAvailableStock(productId) > 0) {
        // Trigger add to cart event
        window.dispatchEvent(new CustomEvent('addToCart', {
          detail: { product }
        }));
      }
    }

    handleRemoveFromCart(button) {
      const index = parseInt(button.dataset.idx);

      // Trigger remove from cart event
      window.dispatchEvent(new CustomEvent('removeFromCart', {
        detail: { index }
      }));
    }

    // Cleanup method
    destroy() {
      this.lazyLoader.disconnect();
      this.workerManager.terminate();
      this.apiService.clearCache();
      console.log('🧹 FrontStore Optimizer destroyed');
    }

    // Get performance report
    getPerformanceReport() {
      return {
        performance: PerformanceMonitor.report(),
        cache: this.apiService.getCacheStats(),
        dataStore: {
          totalProducts: this.dataStore.stocks.length,
          categories: this.dataStore.categories.size,
          lastUpdated: this.dataStore.lastUpdated
        }
      };
    }
  }

  // Export to global scope
  window.FrontStoreOptimizer = FrontStoreOptimizer;
  window.FrontStoreUtils = Utils;

  console.log('✅ FrontStore Optimizer module loaded');

})(window);