/**
 * FrontStore Integration Script
 * This script integrates the optimized modules with the existing HTML
 * Add this script to your HTML file to enable optimizations
 */

(function() {
  'use strict';

  console.log('🚀 FrontStore Integration Script Loading...');

  // ============================================
  // Performance Optimization Configuration
  // ============================================
  const CONFIG = {
    enableCache: true,
    cacheTimeout: 300000, // 5 minutes
    enableLazyLoading: true,
    enableVirtualScrolling: true,
    batchSize: 50,
    debounceDelay: 300,
    throttleDelay: 100,
    enableWebWorkers: true,
    enableDebugMode: window.location.hash === '#debug'
  };

  // ============================================
  // Replace slow functions with optimized versions
  // ============================================
  function replaceSlowFunctions() {
    console.log('🔧 Replacing slow functions with optimized versions...');

    // Replace the original renderCart with optimized version
    if (typeof window.renderCart === 'function') {
      const originalRenderCart = window.renderCart;
      window.renderCart = function() {
        if (window.RenderManager) {
          window.RenderManager.renderCart();
        } else {
          originalRenderCart.apply(this, arguments);
        }
      };
    }

    // Replace the original searchItems with optimized version
    if (typeof window.searchItems === 'function') {
      const originalSearchItems = window.searchItems;
      window.searchItems = async function() {
        if (window.SearchManager) {
          const query = document.getElementById('searchQuery')?.value || '';
          await window.SearchManager.search(query);
        } else {
          return originalSearchItems.apply(this, arguments);
        }
      };
    }

    // Optimize forEach loops
    optimizeLoops();

    // Optimize innerHTML usage
    optimizeInnerHTML();
  }

  // ============================================
  // Optimize Array Operations
  // ============================================
  function optimizeLoops() {
    // Cache frequently accessed DOM elements
    const domCache = new Map();

    // Override getElementById to use cache
    const originalGetElementById = document.getElementById;
    document.getElementById = function(id) {
      if (!domCache.has(id)) {
        const element = originalGetElementById.call(document, id);
        if (element) {
          domCache.set(id, element);
        }
        return element;
      }
      return domCache.get(id);
    };

    // Optimize array filter/map/reduce chains
    if (Array.prototype.filter) {
      const originalFilter = Array.prototype.filter;
      Array.prototype.filter = function(callback, thisArg) {
        // For large arrays, use optimized filtering
        if (this.length > 1000) {
          console.log('🚀 Using optimized filter for large array:', this.length);
          const result = [];
          for (let i = 0; i < this.length; i++) {
            if (callback.call(thisArg, this[i], i, this)) {
              result.push(this[i]);
            }
          }
          return result;
        }
        return originalFilter.call(this, callback, thisArg);
      };
    }
  }

  // ============================================
  // Optimize innerHTML Usage
  // ============================================
  function optimizeInnerHTML() {
    // Track innerHTML usage
    const innerHTMLUsage = new Map();

    // Create a wrapper for innerHTML that uses DocumentFragment
    Object.defineProperty(Element.prototype, '_innerHTML', {
      get: function() {
        return this.innerHTML;
      },
      set: function(html) {
        // Track usage
        const id = this.id || this.className || 'unknown';
        innerHTMLUsage.set(id, (innerHTMLUsage.get(id) || 0) + 1);

        // For frequent updates, use optimized approach
        if (innerHTMLUsage.get(id) > 10) {
          console.warn(`⚠️ Frequent innerHTML updates on ${id}. Consider using DOM methods.`);
        }

        // If setting empty string, use textContent for better performance
        if (html === '') {
          while (this.firstChild) {
            this.removeChild(this.firstChild);
          }
          return;
        }

        // For complex HTML, use template and cloneNode
        if (html.length > 1000) {
          const template = document.createElement('template');
          template.innerHTML = html;
          this.innerHTML = '';
          this.appendChild(template.content);
        } else {
          this.innerHTML = html;
        }
      }
    });
  }

  // ============================================
  // Setup Request Interceptor for Caching
  // ============================================
  function setupRequestInterceptor() {
    const cache = new Map();
    const originalFetch = window.fetch;

    window.fetch = async function(url, options = {}) {
      // Only cache GET requests
      if (options.method && options.method !== 'GET') {
        return originalFetch(url, options);
      }

      // Generate cache key
      const cacheKey = `${url}:${JSON.stringify(options.headers || {})}`;

      // Check cache
      if (CONFIG.enableCache && cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CONFIG.cacheTimeout) {
          console.log(`📦 Cache hit: ${url}`);
          return Promise.resolve(cached.response.clone());
        }
      }

      // Make request
      const response = await originalFetch(url, options);

      // Cache successful responses
      if (CONFIG.enableCache && response.ok) {
        cache.set(cacheKey, {
          response: response.clone(),
          timestamp: Date.now()
        });

        // Limit cache size
        if (cache.size > 50) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
      }

      return response;
    };
  }

  // ============================================
  // Setup Performance Observer
  // ============================================
  function setupPerformanceObserver() {
    if (!CONFIG.enableDebugMode) return;

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              console.warn(`⚠️ Long task detected: ${entry.duration.toFixed(2)}ms`, entry);
            }
          }
        });

        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // LongTask API might not be available
      }
    }

    // Monitor FPS
    let lastTime = performance.now();
    let frames = 0;

    function measureFPS() {
      frames++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));

        if (fps < 30) {
          console.warn(`⚠️ Low FPS detected: ${fps}`);
        }

        frames = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    }

    if (CONFIG.enableDebugMode) {
      measureFPS();
    }
  }

  // ============================================
  // Memory Management
  // ============================================
  function setupMemoryManagement() {
    // Clear caches periodically
    setInterval(() => {
      if ('memory' in performance) {
        const usage = performance.memory;
        const usedPercent = (usage.usedJSHeapSize / usage.jsHeapSizeLimit) * 100;

        if (usedPercent > 80) {
          console.warn(`⚠️ High memory usage: ${usedPercent.toFixed(2)}%`);

          // Clear caches
          if (window.optimizer) {
            window.optimizer.apiService.clearCache();
          }

          // Force garbage collection if available
          if (window.gc) {
            window.gc();
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  // ============================================
  // Lazy Load Images
  // ============================================
  function setupLazyLoading() {
    if (!CONFIG.enableLazyLoading) return;

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;

          if (src) {
            // Create new image to preload
            const newImg = new Image();
            newImg.onload = () => {
              img.src = src;
              img.classList.add('lazy-loaded');
              delete img.dataset.src;
            };
            newImg.src = src;
          }

          imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px'
    });

    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });

    // Setup for dynamically added images
    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function(child) {
      const result = originalAppendChild.call(this, child);

      if (child.tagName === 'IMG' && child.dataset.src) {
        imageObserver.observe(child);
      }

      return result;
    };
  }

  // ============================================
  // Initialize Everything
  // ============================================
  async function initialize() {
    try {
      console.log('📋 Configuration:', CONFIG);

      // Replace slow functions
      replaceSlowFunctions();

      // Setup request interceptor
      setupRequestInterceptor();

      // Setup performance monitoring
      setupPerformanceObserver();

      // Setup memory management
      setupMemoryManagement();

      // Setup lazy loading
      setupLazyLoading();

      // Load optimizer module if available
      if (window.FrontStoreOptimizer) {
        console.log('✅ FrontStore Optimizer module detected');

        // Wait for DOM ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', async () => {
            const optimizer = new window.FrontStoreOptimizer();
            await optimizer.init();
            window.optimizer = optimizer;
          });
        } else {
          const optimizer = new window.FrontStoreOptimizer();
          await optimizer.init();
          window.optimizer = optimizer;
        }
      }

      console.log('✅ FrontStore Integration Complete');

      // Show performance report in debug mode
      if (CONFIG.enableDebugMode) {
        setInterval(() => {
          if (window.optimizer) {
            console.log('📊 Performance Report:', window.optimizer.getPerformanceReport());
          }
        }, 10000);
      }

    } catch (error) {
      console.error('❌ Integration failed:', error);
    }
  }

  // Start initialization
  initialize();

  // Export config for external access
  window.FrontStoreConfig = CONFIG;

})();