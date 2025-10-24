/**
 * LoadingSystem - ระบบแสดงสถานะการโหลดมาตรฐาน
 * Version: 2.0.0
 * Author: 2 พี่น้อง โมบาย
 */

(function(window) {
  'use strict';

  // ตัวแปรสำหรับเก็บ loading instances
  let activeLoaders = new Map();
  let loaderCounter = 0;
  let defaultContainer = null;

  // สร้าง container หลักสำหรับ loading overlays
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

  // สร้าง unique ID สำหรับ loader
  function generateLoaderId() {
    return `loader-${Date.now()}-${++loaderCounter}`;
  }

  // สร้าง loading overlay element
  function createLoadingOverlay(options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';

    const content = document.createElement('div');
    content.className = 'loading-content';

    // สร้าง spinner
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';

    // สร้าง message
    const message = document.createElement('div');
    message.className = 'loading-message';
    message.textContent = options.message || 'กำลังโหลด...';

    // สร้าง progress bar (ถ้าต้องการ)
    let progressBar = null;
    if (options.showProgress) {
      progressBar = document.createElement('div');
      progressBar.className = 'loading-progress';

      const progressFill = document.createElement('div');
      progressFill.className = 'loading-progress-fill';
      progressBar.appendChild(progressFill);
    }

    // ประกอบ elements
    content.appendChild(spinner);
    content.appendChild(message);
    if (progressBar) {
      content.appendChild(progressBar);
    }
    overlay.appendChild(content);

    return { overlay, progressBar };
  }

  // อัปเดต progress bar
  function updateProgress(loaderId, progress) {
    const loaderData = activeLoaders.get(loaderId);
    if (loaderData && loaderData.progressBar) {
      const fill = loaderData.progressBar.querySelector('.loading-progress-fill');
      if (fill) {
        fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
      }
    }
  }

  // Auto progress simulation
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

  // LoadingSystem main object
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

        // เพิ่ม type class ถ้ามี
        if (options.type && options.type !== 'default') {
          overlay.classList.add(`loading-${options.type}`);
        }

        // เพิ่มลงใน container
        container.appendChild(overlay);

        // เก็บข้อมูล loader
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

        // เริ่ม auto progress ถ้าต้องการ
        if (options.autoProgress && progressBar) {
          startAutoProgress(loaderId);
        }

        // ตั้ง timeout ถ้าต้องการ
        if (options.timeout && options.timeout > 0) {
          loaderData.timeout = setTimeout(() => {
            this.hide(loaderId);
          }, options.timeout);
        }

        // แสดง overlay
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

        // ทำ progress เต็มก่อนซ่อน (ถ้ามี progress bar)
        if (loaderData.progressBar) {
          updateProgress(loaderId, 100);
        }

        // หยุด auto progress
        if (loaderData.progressInterval) {
          clearInterval(loaderData.progressInterval);
        }

        // หยุด timeout
        if (loaderData.timeout) {
          clearTimeout(loaderData.timeout);
        }

        // ซ่อน overlay
        loaderData.overlay.classList.remove('loading-visible');
        loaderData.overlay.classList.add('loading-hiding');

        // ลบ element หลังจาก animation เสร็จ
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
     * @param {string} loaderId - ID ของ loader
     */
    completeProgress: function(loaderId = null) {
      if (loaderId) {
        updateProgress(loaderId, 100);
        setTimeout(() => this.hide(loaderId), 500);
      } else {
        // Complete progress ทั้งหมด
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
     */
    debug: function() {
      return {
        activeLoaders: activeLoaders.size,
        loaderIds: Array.from(activeLoaders.keys()),
        containerExists: !!defaultContainer,
        version: '2.0.0'
      };
    }
  };

  // สร้าง backward compatibility functions
  LoadingSystem.start = LoadingSystem.show;
  LoadingSystem.stop = LoadingSystem.hide;
  LoadingSystem.open = LoadingSystem.show;
  LoadingSystem.close = LoadingSystem.hide;

  // Export LoadingSystem to global scope
  window.LoadingSystem = LoadingSystem;

  // สำหรับ fallback compatibility
  window.showLoading = function(show = true, message = 'กำลังโหลด...') {
    if (show) {
      return LoadingSystem.show({ message });
    } else {
      LoadingSystem.hideAll();
    }
  };

  // Auto cleanup เมื่อออกจากหน้า
  window.addEventListener('beforeunload', () => {
    LoadingSystem.cleanup();
  });

  console.log('🚀 LoadingSystem v2.0.0 initialized successfully');

})(window);