/**
 * FrontStore Performance Fix - Ultimate Optimization
 * Version: 3.0.0
 * Description: Aggressive performance optimizations to eliminate lag
 */

(function() {
  'use strict';

  console.log('🚀 Loading Ultimate Performance Fix...');

  // ============================================
  // CRITICAL: Disable Animations During Operations
  // ============================================
  const DisableAnimations = {
    active: false,

    disable() {
      if (this.active) return;

      const style = document.createElement('style');
      style.id = 'no-animations';
      style.innerHTML = `
        * {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head.appendChild(style);
      this.active = true;
    },

    enable() {
      const style = document.getElementById('no-animations');
      if (style) {
        style.remove();
        this.active = false;
      }
    }
  };

  // ============================================
  // Request Queue with Priority System
  // ============================================
  class RequestQueue {
    constructor() {
      this.queue = [];
      this.processing = false;
      this.maxConcurrent = 2;
      this.activeRequests = 0;
    }

    add(request, priority = 5) {
      return new Promise((resolve, reject) => {
        this.queue.push({
          request,
          priority,
          resolve,
          reject,
          timestamp: Date.now()
        });

        // Sort by priority
        this.queue.sort((a, b) => b.priority - a.priority);

        this.process();
      });
    }

    async process() {
      if (this.processing || this.activeRequests >= this.maxConcurrent) return;

      this.processing = true;

      while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
        const item = this.queue.shift();
        this.activeRequests++;

        try {
          const result = await item.request();
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        } finally {
          this.activeRequests--;
        }
      }

      this.processing = false;

      if (this.queue.length > 0) {
        setTimeout(() => this.process(), 10);
      }
    }

    clear() {
      this.queue = [];
    }
  }

  const requestQueue = new RequestQueue();

  // ============================================
  // Virtual DOM Implementation
  // ============================================
  class VirtualDOM {
    constructor() {
      this.vdom = new Map();
      this.pendingUpdates = [];
      this.updateScheduled = false;
    }

    diff(oldNode, newNode) {
      const patches = [];

      if (!oldNode) {
        patches.push({ type: 'CREATE', node: newNode });
      } else if (!newNode) {
        patches.push({ type: 'REMOVE' });
      } else if (oldNode.tagName !== newNode.tagName) {
        patches.push({ type: 'REPLACE', node: newNode });
      } else {
        // Check attributes
        const oldAttrs = oldNode.attributes || {};
        const newAttrs = newNode.attributes || {};

        for (const key in newAttrs) {
          if (oldAttrs[key] !== newAttrs[key]) {
            patches.push({ type: 'SET_ATTR', key, value: newAttrs[key] });
          }
        }

        // Check children
        const maxLength = Math.max(
          (oldNode.children || []).length,
          (newNode.children || []).length
        );

        for (let i = 0; i < maxLength; i++) {
          const childPatches = this.diff(
            oldNode.children?.[i],
            newNode.children?.[i]
          );
          if (childPatches.length > 0) {
            patches.push({ type: 'UPDATE_CHILD', index: i, patches: childPatches });
          }
        }
      }

      return patches;
    }

    scheduleUpdate(element, vnode) {
      this.pendingUpdates.push({ element, vnode });

      if (!this.updateScheduled) {
        this.updateScheduled = true;
        requestIdleCallback(() => this.flushUpdates());
      }
    }

    flushUpdates() {
      const updates = this.pendingUpdates.splice(0);

      // Disable animations during update
      DisableAnimations.disable();

      updates.forEach(({ element, vnode }) => {
        const oldVnode = this.vdom.get(element);
        const patches = this.diff(oldVnode, vnode);
        this.applyPatches(element, patches);
        this.vdom.set(element, vnode);
      });

      // Re-enable animations
      setTimeout(() => DisableAnimations.enable(), 100);

      this.updateScheduled = false;
    }

    applyPatches(element, patches) {
      // Apply patches to real DOM
      patches.forEach(patch => {
        switch (patch.type) {
          case 'CREATE':
            element.appendChild(this.createElement(patch.node));
            break;
          case 'REMOVE':
            element.removeChild(element.lastChild);
            break;
          case 'REPLACE':
            element.replaceChild(
              this.createElement(patch.node),
              element.lastChild
            );
            break;
          case 'SET_ATTR':
            element.setAttribute(patch.key, patch.value);
            break;
          case 'UPDATE_CHILD':
            this.applyPatches(
              element.children[patch.index],
              patch.patches
            );
            break;
        }
      });
    }

    createElement(vnode) {
      const element = document.createElement(vnode.tagName);

      // Set attributes
      for (const [key, value] of Object.entries(vnode.attributes || {})) {
        element.setAttribute(key, value);
      }

      // Add children
      (vnode.children || []).forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else {
          element.appendChild(this.createElement(child));
        }
      });

      return element;
    }
  }

  const virtualDOM = new VirtualDOM();

  // ============================================
  // Memory Pool for Reusable Objects
  // ============================================
  class ObjectPool {
    constructor(factory, reset, maxSize = 100) {
      this.factory = factory;
      this.reset = reset;
      this.maxSize = maxSize;
      this.pool = [];
    }

    acquire() {
      if (this.pool.length > 0) {
        return this.pool.pop();
      }
      return this.factory();
    }

    release(obj) {
      if (this.pool.length < this.maxSize) {
        this.reset(obj);
        this.pool.push(obj);
      }
    }
  }

  // Pool for DOM elements
  const divPool = new ObjectPool(
    () => document.createElement('div'),
    (div) => {
      div.className = '';
      div.innerHTML = '';
      div.removeAttribute('data-id');
    },
    50
  );

  // ============================================
  // Optimize Heavy Functions
  // ============================================

  // Replace heavy forEach loops with optimized versions
  function optimizeArrayMethods() {
    // Store original methods
    const originalForEach = Array.prototype.forEach;
    const originalMap = Array.prototype.map;
    const originalFilter = Array.prototype.filter;

    // Optimized forEach for large arrays
    Array.prototype.forEach = function(callback, thisArg) {
      const length = this.length;

      // For very large arrays, use chunked processing
      if (length > 1000) {
        const chunkSize = 100;
        let index = 0;

        const processChunk = () => {
          const end = Math.min(index + chunkSize, length);

          for (let i = index; i < end; i++) {
            callback.call(thisArg, this[i], i, this);
          }

          index = end;

          if (index < length) {
            // Process next chunk in next frame
            requestAnimationFrame(processChunk);
          }
        };

        processChunk();
      } else {
        // Use regular loop for better performance
        for (let i = 0; i < length; i++) {
          callback.call(thisArg, this[i], i, this);
        }
      }
    };

    // Optimized map
    Array.prototype.map = function(callback, thisArg) {
      const length = this.length;
      const result = new Array(length);

      // Use for loop instead of forEach
      for (let i = 0; i < length; i++) {
        result[i] = callback.call(thisArg, this[i], i, this);
      }

      return result;
    };

    // Optimized filter
    Array.prototype.filter = function(callback, thisArg) {
      const result = [];
      const length = this.length;

      // Use for loop with pre-allocated array
      for (let i = 0; i < length; i++) {
        if (callback.call(thisArg, this[i], i, this)) {
          result.push(this[i]);
        }
      }

      return result;
    };
  }

  // ============================================
  // Debounce ALL Input Events
  // ============================================
  function optimizeInputEvents() {
    const inputs = document.querySelectorAll('input, textarea, select');

    inputs.forEach(input => {
      const events = ['input', 'change', 'keyup', 'keydown'];

      events.forEach(eventType => {
        const originalListeners = input.listeners?.[eventType] || [];

        // Remove all listeners
        const clone = input.cloneNode(true);
        input.parentNode.replaceChild(clone, input);

        // Add debounced version
        clone.addEventListener(eventType, debounce(function(e) {
          originalListeners.forEach(listener => listener.call(this, e));
        }, 150));
      });
    });
  }

  // ============================================
  // Optimize Image Loading
  // ============================================
  function optimizeImages() {
    // Convert all images to lazy loading
    const images = document.querySelectorAll('img:not([data-optimized])');

    images.forEach(img => {
      if (!img.src) return;

      // Store original src
      img.dataset.src = img.src;

      // Set placeholder
      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"%3E%3C/svg%3E';

      // Mark as optimized
      img.dataset.optimized = 'true';

      // Setup intersection observer
      lazyImageObserver.observe(img);
    });
  }

  const lazyImageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;

        if (src) {
          // Load image
          const tempImg = new Image();
          tempImg.onload = () => {
            img.src = src;
            delete img.dataset.src;
          };
          tempImg.src = src;

          lazyImageObserver.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px'
  });

  // ============================================
  // Main Performance Fix
  // ============================================
  function applyPerformanceFix() {
    console.log('⚡ Applying aggressive performance fixes...');

    // 1. Optimize array methods
    optimizeArrayMethods();

    // 2. Optimize input events
    setTimeout(() => optimizeInputEvents(), 1000);

    // 3. Optimize images
    optimizeImages();

    // 4. Replace fetch with queued version
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      return requestQueue.add(() => originalFetch(...args), 5);
    };

    // 5. Optimize setTimeout/setInterval
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;

    window.setTimeout = function(fn, delay, ...args) {
      // Minimum delay to prevent blocking
      const minDelay = Math.max(delay, 4);
      return originalSetTimeout(fn, minDelay, ...args);
    };

    window.setInterval = function(fn, delay, ...args) {
      // Minimum interval to prevent blocking
      const minDelay = Math.max(delay, 100);
      return originalSetInterval(fn, minDelay, ...args);
    };

    // 6. Optimize scroll events
    let scrollTimeout;
    window.addEventListener('scroll', function(e) {
      // Disable animations during scroll
      DisableAnimations.disable();

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        DisableAnimations.enable();
      }, 150);
    }, { passive: true });

    // 7. Force hardware acceleration
    document.body.style.transform = 'translateZ(0)';

    // 8. Reduce reflows
    const readWriteBatcher = new ReadWriteBatcher();

    // 9. Memory cleanup interval
    setInterval(() => {
      // Clear unused objects
      if (typeof gc !== 'undefined') {
        gc();
      }

      // Clear image cache
      const images = document.querySelectorAll('img[src^="data:"]');
      images.forEach(img => {
        if (!img.dataset.src) {
          img.src = '';
        }
      });
    }, 30000);

    console.log('✅ Performance fixes applied!');
  }

  // ============================================
  // Read/Write Batching
  // ============================================
  class ReadWriteBatcher {
    constructor() {
      this.reads = [];
      this.writes = [];
      this.scheduled = false;
    }

    read(fn) {
      this.reads.push(fn);
      this.schedule();
    }

    write(fn) {
      this.writes.push(fn);
      this.schedule();
    }

    schedule() {
      if (!this.scheduled) {
        this.scheduled = true;
        requestAnimationFrame(() => this.flush());
      }
    }

    flush() {
      const reads = this.reads.splice(0);
      const writes = this.writes.splice(0);

      // Execute all reads first
      reads.forEach(fn => fn());

      // Then execute all writes
      writes.forEach(fn => fn());

      this.scheduled = false;
    }
  }

  // ============================================
  // Utility Functions
  // ============================================
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // ============================================
  // Initialize on DOM Ready
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPerformanceFix);
  } else {
    applyPerformanceFix();
  }

  // Export for debugging
  window.PerformanceFix = {
    DisableAnimations,
    requestQueue,
    virtualDOM,
    divPool,
    applyPerformanceFix
  };

  console.log('✅ Ultimate Performance Fix loaded!');

})();