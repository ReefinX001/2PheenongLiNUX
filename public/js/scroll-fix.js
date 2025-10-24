/**
 * Scroll Fix - แก้ปัญหาการ scroll ซ้ำและกระตุก
 * Version: 1.0.0
 */

(function() {
  'use strict';

  console.log('🔧 Loading Scroll Fix...');

  // ============================================
  // CRITICAL: ป้องกันการ scroll ซ้ำ
  // ============================================
  const ScrollManager = {
    isScrolling: false,
    scrollTimeout: null,
    lastScrollTop: 0,
    scrollDirection: null,

    init() {
      this.removeAllScrollListeners();
      this.setupSingleScrollHandler();
      this.fixScrollBehavior();
    },

    // ลบ scroll listeners ทั้งหมดที่มีอยู่
    removeAllScrollListeners() {
      // Clone และ replace element เพื่อลบ listeners ทั้งหมด
      const elementsWithScroll = [
        window,
        document,
        document.body,
        document.documentElement
      ];

      // ลบ event listeners จาก window
      const oldScrollListeners = getEventListeners(window);
      if (oldScrollListeners && oldScrollListeners.scroll) {
        console.log(`🗑️ Removing ${oldScrollListeners.scroll.length} scroll listeners from window`);
      }

      // Override addEventListener เพื่อป้องกัน scroll listeners ซ้ำ
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        // ถ้าเป็น scroll event ให้ ignore
        if (type === 'scroll' && this !== window) {
          console.warn('⚠️ Blocked duplicate scroll listener');
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    },

    // Setup single controlled scroll handler
    setupSingleScrollHandler() {
      let ticking = false;

      const handleScroll = (e) => {
        if (ticking) return;

        ticking = true;

        requestAnimationFrame(() => {
          const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;

          // ตรวจสอบทิศทาง
          if (currentScrollTop > this.lastScrollTop) {
            this.scrollDirection = 'down';
          } else if (currentScrollTop < this.lastScrollTop) {
            this.scrollDirection = 'up';
          }

          // ป้องกันการกระโดด
          const scrollDiff = Math.abs(currentScrollTop - this.lastScrollTop);
          if (scrollDiff > 500) {
            console.warn('⚠️ Prevented scroll jump:', scrollDiff);
            window.scrollTo(0, this.lastScrollTop);
            ticking = false;
            return;
          }

          this.lastScrollTop = currentScrollTop;

          // Clear previous timeout
          clearTimeout(this.scrollTimeout);

          // Set scrolling flag
          this.isScrolling = true;
          document.body.classList.add('is-scrolling');

          // Reset flag after scroll ends
          this.scrollTimeout = setTimeout(() => {
            this.isScrolling = false;
            document.body.classList.remove('is-scrolling');
          }, 150);

          ticking = false;
        });
      };

      // Add single optimized scroll listener
      window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    },

    // แก้ไข scroll behavior
    fixScrollBehavior() {
      // ปิด smooth scroll ที่อาจทำให้กระตุก
      document.documentElement.style.scrollBehavior = 'auto';
      document.body.style.scrollBehavior = 'auto';

      // ป้องกัน overscroll
      document.body.style.overscrollBehavior = 'contain';

      // ปิด scroll anchoring ที่อาจทำให้กระโดด
      document.body.style.overflowAnchor = 'none';
    }
  };

  // ============================================
  // แก้ไข Virtual Scroll ที่มีปัญหา
  // ============================================
  function disableVirtualScroll() {
    // หา virtual scroll instances ทั้งหมด
    const grids = document.querySelectorAll('[data-virtual-scroll], .virtual-scroll-viewport');

    grids.forEach(grid => {
      if (grid.virtualScroll) {
        console.log('🗑️ Destroying virtual scroll instance');
        grid.virtualScroll.destroy();
        delete grid.virtualScroll;
      }

      // คืนค่า style เดิม
      grid.style.height = '';
      grid.style.overflow = '';
      grid.style.position = '';
    });

    // Disable VirtualScroll class
    if (window.VirtualScroll) {
      window.VirtualScroll = class {
        constructor() {
          console.warn('⚠️ VirtualScroll disabled');
        }
        setItems() {}
        destroy() {}
      };
    }
  }

  // ============================================
  // แก้ไข Infinite Scroll ที่อาจมีปัญหา
  // ============================================
  function fixInfiniteScroll() {
    // หา infinite scroll elements
    const infiniteScrollElements = document.querySelectorAll('[data-infinite-scroll]');

    infiniteScrollElements.forEach(element => {
      // Remove infinite scroll
      element.removeAttribute('data-infinite-scroll');

      // Remove observers
      if (element._observer) {
        element._observer.disconnect();
        delete element._observer;
      }
    });
  }

  // ============================================
  // Optimize Scroll Performance
  // ============================================
  function optimizeScrollPerformance() {
    // Add CSS for better scroll performance
    const style = document.createElement('style');
    style.innerHTML = `
      /* Optimize scroll performance */
      * {
        scroll-behavior: auto !important;
      }
      
      body {
        overflow-anchor: none !important;
        overscroll-behavior: contain !important;
      }
      
      /* Disable smooth scrolling during scroll */
      body.is-scrolling * {
        pointer-events: none !important;
        user-select: none !important;
      }
      
      /* GPU acceleration for scrollable elements */
      .product-grid,
      #cartTable,
      #imeiResultGrid,
      #level3Grid {
        transform: translateZ(0);
        will-change: transform;
        backface-visibility: hidden;
      }
      
      /* Prevent layout shifts */
      img {
        aspect-ratio: attr(width) / attr(height);
        height: auto;
      }
      
      /* Optimize large lists */
      .product-grid > *,
      #imeiResultGrid > *,
      #level3Grid > * {
        contain: layout style paint;
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================
  // Fix Duplicate Event Handlers
  // ============================================
  function removeDuplicateHandlers() {
    // Get all elements with onclick attributes
    const elementsWithOnclick = document.querySelectorAll('[onclick]');

    elementsWithOnclick.forEach(element => {
      const onclickValue = element.getAttribute('onclick');

      // Remove inline onclick
      element.removeAttribute('onclick');

      // Add single event listener
      element.addEventListener('click', function(e) {
        try {
          // Execute original onclick code
          new Function('event', onclickValue).call(this, e);
        } catch (error) {
          console.error('Error in onclick handler:', error);
        }
      }, { once: false });
    });
  }

  // ============================================
  // Debounce All Scroll-triggered Functions
  // ============================================
  function debounceScrollFunctions() {
    // Find and replace functions that might be called on scroll
    const functionsToDebounce = [
      'loadLevel1',
      'loadLevel2',
      'loadLevel3',
      'searchItems',
      'renderCart',
      'checkAvailablePromotions'
    ];

    functionsToDebounce.forEach(funcName => {
      if (typeof window[funcName] === 'function') {
        const original = window[funcName];
        window[funcName] = debounce(original, 300);
        console.log(`✅ Debounced ${funcName}`);
      }
    });
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

  function getEventListeners(element) {
    // Try to get event listeners (Chrome DevTools API)
    if (typeof getEventListeners !== 'undefined') {
      return getEventListeners(element);
    }
    return {};
  }

  // ============================================
  // Main Fix Application
  // ============================================
  function applyScrollFix() {
    console.log('🚀 Applying scroll fixes...');

    // 1. Initialize scroll manager
    ScrollManager.init();

    // 2. Disable problematic virtual scroll
    disableVirtualScroll();

    // 3. Fix infinite scroll
    fixInfiniteScroll();

    // 4. Optimize scroll performance
    optimizeScrollPerformance();

    // 5. Remove duplicate handlers
    removeDuplicateHandlers();

    // 6. Debounce scroll functions
    debounceScrollFunctions();

    // 7. Fix scroll position on page load
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);

    console.log('✅ Scroll fixes applied!');
  }

  // ============================================
  // Initialize
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyScrollFix);
  } else {
    // Apply immediately
    applyScrollFix();

    // Re-apply after a delay to catch dynamically added content
    setTimeout(applyScrollFix, 2000);
  }

  // Export for debugging
  window.ScrollFix = {
    ScrollManager,
    applyScrollFix,
    disable: disableVirtualScroll
  };

  console.log('✅ Scroll Fix loaded!');

})();