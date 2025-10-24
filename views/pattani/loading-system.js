/**
 * LoadingSystem v2.0.0 - Enhanced Implementation
 * ระบบแสดงสถานะการโหลดมาตรฐาน
 * สำหรับ: 2 พี่น้อง โมบาย - POS System
 * 
 * Features:
 * - Basic loading overlay
 * - Progress bar with auto progress
 * - Custom messages
 * - Dark mode support
 * - Multiple loading states
 * - Auto cleanup
 * - Accessibility support
 */

(function(window) {
  'use strict';

  console.log('🚀 LoadingSystem v2.0.0 initializing...');

  // ตัวแปรสำหรับเก็บ loading instances
  let activeLoaders = new Map();
  let loaderCounter = 0;
  let defaultContainer = null;

  /**
   * สร้าง container หลักสำหรับ loading overlays
   */
  function createDefaultContainer() {
    if (defaultContainer && document.body.contains(defaultContainer)) {
      return defaultContainer;
    }

    defaultContainer = document.createElement('div');
    defaultContainer.id = 'loading-system-container';
    defaultContainer.className = 'loading-system-container';
    document.body.appendChild(defaultContainer);
    return defaultContainer;
  }

  /**
   * สร้าง unique ID สำหรับ loader
   */
  function generateLoaderId() {
    return `loader-${Date.now()}-${++loaderCounter}`;
  }

  /**
   * สร้าง loading overlay element
   * @param {Object} options - ตัวเลือกการแสดงผล
   */
  function createLoadingOverlay(options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.style.pointerEvents = 'all';
    
    // Set ARIA attributes for accessibility
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-labelledby', 'loading-message');

    const content = document.createElement('div');
    content.className = 'loading-content';

    // Create spinner
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-label', 'Loading');

    // Create message
    const message = document.createElement('div');
    message.className = 'loading-message';
    message.id = 'loading-message';
    message.textContent = options.message || 'กำลังโหลด...';

    // Create progress bar (if needed)
    let progressBar = null;
    if (options.showProgress) {
      progressBar = document.createElement('div');
      progressBar.className = 'loading-progress';
      progressBar.setAttribute('role', 'progressbar');
      progressBar.setAttribute('aria-valuemin', '0');
      progressBar.setAttribute('aria-valuemax', '100');
      progressBar.setAttribute('aria-valuenow', '0');

      const progressFill = document.createElement('div');
      progressFill.className = 'loading-progress-fill';
      progressBar.appendChild(progressFill);
    }

    // Assemble elements
    content.appendChild(spinner);
    content.appendChild(message);
    if (progressBar) {
      content.appendChild(progressBar);
    }
    overlay.appendChild(content);

    return { overlay, progressBar };
  }

  /**
   * อัปเดต progress bar
   * @param {string} loaderId - ID ของ loader
   * @param {number} progress - เปอร์เซ็นต์ความคืบหน้า (0-100)
   */
  function updateProgress(loaderId, progress) {
    const loaderData = activeLoaders.get(loaderId);
    if (loaderData && loaderData.progressBar) {
      const fill = loaderData.progressBar.querySelector('.loading-progress-fill');
      const progressValue = Math.min(100, Math.max(0, progress));
      
      if (fill) {
        fill.style.width = `${progressValue}%`;
      }
      
      // Update ARIA attributes
      loaderData.progressBar.setAttribute('aria-valuenow', progressValue);
    }
  }

  /**
   * Auto progress simulation
   * @param {string} loaderId - ID ของ loader
   */
  function startAutoProgress(loaderId) {
    const loaderData = activeLoaders.get(loaderId);
    if (!loaderData || !loaderData.autoProgress) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 95) {
        progress = 95;
        clearInterval(interval);
      }
      updateProgress(loaderId, progress);
    }, 200);

    loaderData.progressInterval = interval;
  }

  /**
   * Main LoadingSystem object
   */
  const LoadingSystem = {
    /**
     * แสดง loading overlay
     * @param {Object} options - ตัวเลือกการแสดงผล
     * @param {string} options.message - ข้อความที่แสดง (default: 'กำลังโหลด...')
     * @param {boolean} options.showProgress - แสดง progress bar (default: false)
     * @param {boolean} options.autoProgress - เริ่ม auto progress (default: false)
     * @param {number} options.timeout - ปิดอัตโนมัติหลังจาก (ms, default: 0 = ไม่ปิดอัตโนมัติ)
     * @param {string} options.type - ประเภท loading ('default', 'success', 'warning', 'error')
     * @returns {string} loaderId - ID ของ loader instance
     */
    show: function(options = {}) {
      try {
        const loaderId = generateLoaderId();
        const container = createDefaultContainer();

        const { overlay, progressBar } = createLoadingOverlay(options);
        overlay.setAttribute('data-loader-id', loaderId);

        // Add type class if specified
        if (options.type && options.type !== 'default') {
          overlay.classList.add(`loading-${options.type}`);
        }

        // Add to container
        container.appendChild(overlay);

        // Store loader data
        const loaderData = {
          overlay: overlay,
          progressBar: progressBar,
          options: options,
          createdAt: Date.now(),
          autoProgress: options.autoProgress,
          progressInterval: null,
          timeout: null
        };

        activeLoaders.set(loaderId, loaderData);

        // Start auto progress if needed
        if (options.autoProgress && progressBar) {
          startAutoProgress(loaderId);
        }

        // Set timeout if specified
        if (options.timeout && options.timeout > 0) {
          loaderData.timeout = setTimeout(() => {
            this.hide(loaderId);
          }, options.timeout);
        }

        // Show overlay with animation
        requestAnimationFrame(() => {
          overlay.classList.add('loading-visible');
        });

        console.log(`✅ LoadingSystem.show() - ID: ${loaderId}`, options);
        return loaderId;

      } catch (error) {
        console.error('❌ LoadingSystem.show() error:', error);
        return null;
      }
    },

    /**
     * ซ่อน loading overlay ตาม ID
     * @param {string} loaderId - ID ของ loader ที่ต้องการซ่อน
     */
    hide: function(loaderId) {
      try {
        if (!loaderId) {
          console.warn('⚠️ LoadingSystem.hide() - ไม่มี loaderId');
          return;
        }

        const loaderData = activeLoaders.get(loaderId);
        if (!loaderData) {
          console.warn(`⚠️ LoadingSystem.hide() - ไม่พบ loader ID: ${loaderId}`);
          return;
        }

        // Complete progress if has progress bar
        if (loaderData.progressBar) {
          updateProgress(loaderId, 100);
        }

        // Stop auto progress
        if (loaderData.progressInterval) {
          clearInterval(loaderData.progressInterval);
        }

        // Stop timeout
        if (loaderData.timeout) {
          clearTimeout(loaderData.timeout);
        }

        // Set ARIA hidden
        loaderData.overlay.setAttribute('aria-hidden', 'true');

        // Hide overlay
        loaderData.overlay.classList.remove('loading-visible');
        loaderData.overlay.classList.add('loading-hiding');

        // Remove element after animation
        setTimeout(() => {
          if (loaderData.overlay && loaderData.overlay.parentNode) {
            loaderData.overlay.parentNode.removeChild(loaderData.overlay);
          }
          activeLoaders.delete(loaderId);
        }, 300);

        console.log(`✅ LoadingSystem.hide() - ID: ${loaderId}`);

      } catch (error) {
        console.error('❌ LoadingSystem.hide() error:', error);
      }
    },

    /**
     * ซ่อน loading overlay ทั้งหมด
     */
    hideAll: function() {
      try {
        const loaderIds = Array.from(activeLoaders.keys());
        loaderIds.forEach(loaderId => this.hide(loaderId));
        console.log(`✅ LoadingSystem.hideAll() - ซ่อน ${loaderIds.length} loaders`);
      } catch (error) {
        console.error('❌ LoadingSystem.hideAll() error:', error);
      }
    },

    /**
     * อัปเดต progress bar
     * @param {string} loaderId - ID ของ loader
     * @param {number} progress - เปอร์เซ็นต์ความคืบหน้า (0-100)
     */
    updateProgress: function(loaderId, progress) {
      updateProgress(loaderId, progress);
    },

    /**
     * ทำ progress เต็มและซ่อน
     * @param {string} loaderId - ID ของ loader (ถ้าไม่ระบุจะทำทั้งหมด)
     */
    completeProgress: function(loaderId = null) {
      if (loaderId) {
        updateProgress(loaderId, 100);
        setTimeout(() => this.hide(loaderId), 500);
      } else {
        // Complete all loaders
        activeLoaders.forEach((loaderData, id) => {
          if (loaderData.progressBar) {
            updateProgress(id, 100);
            setTimeout(() => this.hide(id), 500);
          }
        });
      }
    },

    /**
     * อัปเดตข้อความ loading
     * @param {string} loaderId - ID ของ loader
     * @param {string} message - ข้อความใหม่
     */
    updateMessage: function(loaderId, message) {
      try {
        const loaderData = activeLoaders.get(loaderId);
        if (loaderData) {
          const messageEl = loaderData.overlay.querySelector('.loading-message');
          if (messageEl) {
            messageEl.textContent = message;
          }
        }
      } catch (error) {
        console.error('❌ LoadingSystem.updateMessage() error:', error);
      }
    },

    /**
     * ตรวจสอบสถานะ loader
     * @param {string} loaderId - ID ของ loader
     * @returns {boolean} - true ถ้ายังแสดงอยู่
     */
    isActive: function(loaderId) {
      return activeLoaders.has(loaderId);
    },

    /**
     * ดูจำนวน loader ที่แสดงอยู่
     * @returns {number} - จำนวน active loaders
     */
    getActiveCount: function() {
      return activeLoaders.size;
    },

    /**
     * ล้างข้อมูลทั้งหมด (สำหรับ debugging)
     */
    cleanup: function() {
      this.hideAll();
      if (defaultContainer && document.body.contains(defaultContainer)) {
        document.body.removeChild(defaultContainer);
        defaultContainer = null;
      }
      activeLoaders.clear();
      loaderCounter = 0;
      console.log('🧹 LoadingSystem.cleanup() - ล้างข้อมูลทั้งหมดแล้ว');
    },

    /**
     * ข้อมูล debug
     * @returns {Object} - ข้อมูลสถานะระบบ
     */
    debug: function() {
      return {
        activeLoaders: activeLoaders.size,
        loaderIds: Array.from(activeLoaders.keys()),
        containerExists: !!defaultContainer,
        version: '2.0.0'
      };
    },

    /**
     * แสดง loading สำหรับ async operation
     * @param {Promise} promise - Promise ที่ต้องการติดตาม
     * @param {Object} options - ตัวเลือก loading
     * @returns {Promise} - Promise ที่ wrap แล้ว
     */
    trackPromise: async function(promise, options = {}) {
      const loaderId = this.show(options);
      
      try {
        const result = await promise;
        return result;
      } finally {
        if (loaderId) {
          this.hide(loaderId);
        }
      }
    },

    /**
     * สร้าง loading button
     * @param {HTMLElement} button - Element ปุ่ม
     * @param {Promise} promise - Promise ที่ต้องการติดตาม
     * @param {Object} options - ตัวเลือก
     * @returns {Promise} - Promise ที่ wrap แล้ว
     */
    loadingButton: async function(button, promise, options = {}) {
      const originalText = button.innerHTML;
      const originalDisabled = button.disabled;
      const { loadingText = 'กำลังโหลด...' } = options;
      
      // Disable button และแสดง loading
      button.disabled = true;
      button.innerHTML = `
        <span class="loading-spinner loading-mini" style="display: inline-block; margin-right: 0.5rem;"></span>
        ${loadingText}
      `;
      button.classList.add('loading');

      try {
        const result = await promise;
        return result;
      } finally {
        // Restore button
        button.disabled = originalDisabled;
        button.innerHTML = originalText;
        button.classList.remove('loading');
      }
    }
  };

  // Backward compatibility functions
  LoadingSystem.start = LoadingSystem.show;
  LoadingSystem.stop = LoadingSystem.hide;
  LoadingSystem.open = LoadingSystem.show;
  LoadingSystem.close = LoadingSystem.hide;

  // Export to global scope
  window.LoadingSystem = LoadingSystem;

  // Fallback function for compatibility
  window.showLoading = function(show = true, message = 'กำลังโหลด...') {
    if (show) {
      return LoadingSystem.show({ message });
    } else {
      LoadingSystem.hideAll();
    }
  };

  // Auto cleanup on page unload
  window.addEventListener('beforeunload', () => {
    LoadingSystem.cleanup();
  });

  // Auto cleanup on page hide (mobile compatibility)
  window.addEventListener('pagehide', () => {
    LoadingSystem.cleanup();
  });

  // Handle visibility change (when user switches tabs)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && activeLoaders.size > 0) {
      console.log('⚠️ Page hidden with active loaders, scheduling cleanup...');
      // ล้าง loaders เก่าหลังจาก 30 วินาที ถ้าหน้ายังซ่อนอยู่
      setTimeout(() => {
        if (document.hidden) {
          LoadingSystem.cleanup();
        }
      }, 30000);
    }
  });

  console.log('🚀 LoadingSystem v2.0.0 initialized successfully');

})(window); 7 / 7 / 2 0 2 5   1 1 : 5 6 : 4 9   P M  
 