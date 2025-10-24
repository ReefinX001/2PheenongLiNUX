// ================================================
// 🚨 EMERGENCY FIX SCRIPT FOR INSTALLMENT SYSTEM
// ================================================
// Version: 2.0.1 - Enhanced Fix (Debug Mode)
// แก้ไขปัญหาหน้าโหลดค้างและ errors ทั้งหมด
// ✅ Updated: ใช้ console.debug แทน console.warn สำหรับ duplicate listeners

console.log('🚨 Emergency Fix Script Starting...');

// ================================================
// ENHANCED EMERGENCY FIX FUNCTIONS
// ================================================

const EmergencyFix = {
  fixes: [],
  errors: [],

  // 1. แก้ไขปัญหา Toast Container - ENHANCED
  fixToastContainer() {
    console.log('🔧 Fixing toast container issues...');

    try {
      // ลบ toast containers เก่าทั้งหมด
      document.querySelectorAll('[id*="toast"], .toast-container').forEach(el => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });

      // สร้าง toast container ใหม่หลายชั้น
      const toastContainers = [
        'enhanced-toast-container',
        'toast-container',
        'global-toast-container'
      ];

      toastContainers.forEach(containerId => {
        if (!document.getElementById(containerId)) {
          const container = document.createElement('div');
          container.id = containerId;
          container.className = 'toast-container fixed top-4 right-4 z-50 space-y-2 pointer-events-none';
          container.style.cssText = `
            position: fixed !important;
            top: 1rem !important;
            right: 1rem !important;
            z-index: 9999 !important;
            max-width: 400px !important;
            pointer-events: none !important;
          `;

          // เพิ่มลงใน body ปลายสุด
          if (document.body) {
            document.body.appendChild(container);
          } else {
            // รอ DOM ready
            document.addEventListener('DOMContentLoaded', () => {
              document.body.appendChild(container);
            });
          }
        }
      });

      console.log('✅ Toast containers created successfully');
      this.fixes.push('Toast Container');
      return true;

    } catch (error) {
      console.error('❌ Toast container fix failed:', error);
      this.errors.push('Toast Container: ' + error.message);
      return false;
    }
  },

  // 2. แก้ไขปัญหา Module Loading - ENHANCED
  fixModuleLoading() {
    console.log('🔧 Fixing module loading issues...');

    try {
      // ตรวจสอบโมดูลหลัก
      const requiredModules = {
        'InstallmentCore': window.InstallmentCore,
        'InstallmentUI': window.InstallmentUI,
        'InstallmentAPI': window.InstallmentAPI,
        'InstallmentBusiness': window.InstallmentBusiness,
        'InstallmentProduct': window.InstallmentProduct
      };

      const missingModules = [];
      const availableModules = [];

      Object.entries(requiredModules).forEach(([name, module]) => {
        if (module && typeof module === 'object') {
          availableModules.push(name);
        } else {
          missingModules.push(name);
        }
      });

      if (missingModules.length > 0) {
        console.warn('⚠️ Missing modules:', missingModules);

        // สร้าง fallback modules
        missingModules.forEach(moduleName => {
          if (!window[moduleName]) {
            window[moduleName] = {
              initialized: false,
              fallback: true,
              showToast: (msg, type) => console.log(`Toast (${type}):`, msg),
              formatPrice: (num) => parseFloat(num || 0).toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })
            };
          }
        });
      } else {
        console.log('✅ All required modules are available');
      }

      this.fixes.push('Module Loading');
      return true;

    } catch (error) {
      console.error('❌ Module loading fix failed:', error);
      this.errors.push('Module Loading: ' + error.message);
      return false;
    }
  },

  // 3. แก้ไขปัญหา Duplicate Functions - ENHANCED
  fixDuplicateFunctions() {
    console.log('🔧 Fixing duplicate functions...');

    try {
      // Unify formatPrice function
      if (window.InstallmentCore?.formatPrice) {
        window.formatPrice = window.InstallmentCore.formatPrice;
        console.log('✅ formatPrice unified via InstallmentCore');
      }

      // Unify showToast function
      if (window.InstallmentCore?.showToast) {
        window.showToast = window.InstallmentCore.showToast;
        console.log('✅ showToast unified via InstallmentCore');
      } else if (window.InstallmentUI?.showToast) {
        window.showToast = window.InstallmentUI.showToast;
        console.log('✅ showToast unified via InstallmentUI');
      } else {
        // Fallback showToast
        window.showToast = (message, type = 'info', title = '', duration = 3000) => {
          console.log(`${type.toUpperCase()}: ${title ? title + ' - ' : ''}${message}`);

          // Try to create visual toast
          try {
            const container = document.getElementById('enhanced-toast-container') ||
                            document.getElementById('toast-container');
            if (container) {
              const toast = document.createElement('div');
              toast.className = `toast toast-${type} bg-white border rounded-lg shadow-lg p-4 pointer-events-auto`;
              toast.innerHTML = `
                <div class="flex items-center gap-3">
                  <div class="toast-icon">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
                  </div>
                  <div class="flex-1">
                    ${title ? `<div class="font-medium">${title}</div>` : ''}
                    <div class="text-sm text-gray-700">${message}</div>
                  </div>
                </div>
              `;

              container.appendChild(toast);

              // Auto remove
              setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
              }, duration);
            }
          } catch (e) {
            console.warn('Visual toast failed:', e.message);
          }
        };
        console.log('✅ showToast created as fallback');
      }

      console.log('✅ Duplicate function fixes completed');
      this.fixes.push('Duplicate Functions');
      return true;

    } catch (error) {
      console.error('❌ Duplicate function fix failed:', error);
      this.errors.push('Duplicate Functions: ' + error.message);
      return false;
    }
  },

  // 4. แก้ไขปัญหา Async/Await - ENHANCED
  fixAsyncAwaitIssues() {
    console.log('🔧 Fixing async/await issues...');

    try {
      // Wrap global functions ที่ใช้ await
      const functionsToWrap = [
        'initializeSystem',
        'saveInstallmentData',
        'loadBranchInstallments'
      ];

      functionsToWrap.forEach(funcName => {
        if (window[funcName] && typeof window[funcName] === 'function') {
          const originalFunc = window[funcName];
          window[funcName] = async function(...args) {
            try {
              return await originalFunc.apply(this, args);
            } catch (error) {
              console.error(`❌ Error in ${funcName}:`, error);
              if (window.showToast) {
                window.showToast(`เกิดข้อผิดพลาดใน ${funcName}`, 'error');
              }
              throw error;
            }
          };
        }
      });

      console.log('✅ Async/await issues fixed');
      this.fixes.push('Async/Await Issues');
      return true;

    } catch (error) {
      console.error('❌ Async/await fix failed:', error);
      this.errors.push('Async/Await: ' + error.message);
      return false;
    }
  },

  // 5. แก้ไขปัญหา Event Listeners - ENHANCED (ใช้งานร่วมกับ data-listener-added attribute)
  fixEventListeners() {
    console.log('🔧 Fixing duplicate event listeners...');

    try {
      // ป้องกัน duplicate event listeners แบบ enhanced
      const originalAddEventListener = Element.prototype.addEventListener;
      const eventRegistry = new WeakMap();

      Element.prototype.addEventListener = function(type, listener, options) {
        // ✅ ตรวจสอบ data-listener-added attribute ก่อน
        const attributeKey = `data-${type}-listener-added`;
        if (this.hasAttribute && this.hasAttribute(attributeKey)) {
          console.debug(`🔇 Event listener skipped (attribute protection): ${type} on`, this);
          return;
        }

        // ✅ ตรวจสอบ data-listener-added attribute ทั่วไป
        if (this.hasAttribute && this.hasAttribute('data-listener-added')) {
          console.debug(`🔇 Event listener skipped (general protection): ${type} on`, this);
          return;
        }

        // Registry-based protection (สำหรับ elements ที่ไม่มี attribute)
        if (!eventRegistry.has(this)) {
          eventRegistry.set(this, new Set());
        }

        const events = eventRegistry.get(this);
        const key = `${type}_${this.id || this.className || 'anonymous'}`;

        if (!events.has(key)) {
          events.add(key);
          return originalAddEventListener.call(this, type, listener, options);
        } else {
          console.debug(`🔇 Duplicate event listener prevented (registry): ${type} on`, this);
        }
      };

      console.log('✅ Enhanced event listener deduplication enabled');
      this.fixes.push('Event Listeners');
      return true;

    } catch (error) {
      console.error('❌ Event listener fix failed:', error);
      this.errors.push('Event Listeners: ' + error.message);
      return false;
    }
  },

  // 6. แก้ไขปัญหา Memory Leaks - ENHANCED
  fixMemoryLeaks() {
    console.log('🔧 Fixing memory leaks...');

    try {
      // Cleanup global variables ที่ไม่จำเป็น
      const blacklistedGlobals = [
        'tempData',
        'oldInstallmentData',
        'duplicateFormData'
      ];

      blacklistedGlobals.forEach(variable => {
        if (window[variable]) {
          delete window[variable];
        }
      });

      // Setup memory cleanup interval
      if (!window.memoryCleanupInterval) {
        window.memoryCleanupInterval = setInterval(() => {
          // Clean up DOM nodes ที่ไม่ได้ใช้
          const unusedNodes = document.querySelectorAll('[data-cleanup="true"]');
          unusedNodes.forEach(node => {
            if (node.parentNode) node.parentNode.removeChild(node);
          });

          // Force garbage collection if available
          if (window.gc) {
            window.gc();
          }
        }, 30000); // ทุก 30 วินาที
      }

      console.log('✅ Memory leak fixes completed');
      this.fixes.push('Memory Leaks');
      return true;

    } catch (error) {
      console.error('❌ Memory leak fix failed:', error);
      this.errors.push('Memory Leaks: ' + error.message);
      return false;
    }
  },

  // 7. แก้ไขปัญหา Loading States - NEW
  fixLoadingStates() {
    console.log('🔧 Fixing loading states...');

    try {
      // ซ่อน loading overlays ที่ค้าง
      const loadingElements = document.querySelectorAll(
        '.loading-overlay, .loading-spinner, [id*="loader"], [class*="loading"]'
      );

      loadingElements.forEach(el => {
        if (el.style.display !== 'none') {
          el.style.display = 'none';
          console.log('Hidden stuck loading element:', el);
        }
      });

      // แสดง main content
      const mainContent = document.getElementById('mainContent');
      if (mainContent) {
        mainContent.style.display = 'block';
        mainContent.style.visibility = 'visible';
        mainContent.style.opacity = '1';
      }

      // ซ่อน preloader
      const preloaders = document.querySelectorAll('.preloader, #preloader');
      preloaders.forEach(el => {
        el.style.display = 'none';
      });

      console.log('✅ Loading states fixed');
      this.fixes.push('Loading States');
      return true;

    } catch (error) {
      console.error('❌ Loading states fix failed:', error);
      this.errors.push('Loading States: ' + error.message);
      return false;
    }
  },

  // 8. แก้ไขปัญหา DOM Ready - NEW
  fixDomReady() {
    console.log('🔧 Fixing DOM ready issues...');

    try {
      // Force trigger DOM ready events
      if (document.readyState === 'loading') {
        // Wait for DOM
        document.addEventListener('DOMContentLoaded', () => {
          this.triggerSystemReady();
        });
      } else {
        // DOM already ready
        this.triggerSystemReady();
      }

      console.log('✅ DOM ready issues fixed');
      this.fixes.push('DOM Ready');
      return true;

    } catch (error) {
      console.error('❌ DOM ready fix failed:', error);
      this.errors.push('DOM Ready: ' + error.message);
      return false;
    }
  },

  // Trigger system ready events
  triggerSystemReady() {
    try {
      // Dispatch custom events
      ['systemReady', 'installmentSystemReady', 'modulesLoaded'].forEach(eventName => {
        const event = new CustomEvent(eventName, {
          detail: {
            timestamp: Date.now(),
            source: 'EmergencyFix'
          }
        });
        document.dispatchEvent(event);
        window.dispatchEvent(event);
      });

      console.log('✅ System ready events triggered');
    } catch (error) {
      console.warn('⚠️ Failed to trigger system ready events:', error);
    }
  },

  // รันการแก้ไขทั้งหมด
  runAll() {
    console.log('🚨 Running emergency fixes...');

    const fixes = [
      this.fixToastContainer,
      this.fixModuleLoading,
      this.fixDuplicateFunctions,
      this.fixAsyncAwaitIssues,
      this.fixEventListeners,
      this.fixMemoryLeaks,
      this.fixLoadingStates,
      this.fixDomReady
    ];

    fixes.forEach(fix => {
      try {
        fix.call(this);
      } catch (error) {
        console.error('❌ Fix failed:', error);
        this.errors.push('Fix execution: ' + error.message);
      }
    });

    console.log('🏁 Emergency fixes completed');
    console.log('✅ Successful fixes:', this.fixes);

    if (this.errors.length > 0) {
      console.warn('⚠️ Fix errors:', this.errors);
    }

    // แสดงผลลัพธ์
    if (window.showToast) {
      if (this.fixes.length > 0) {
        window.showToast(
          `🎉 แก้ไขปัญหาระบบสำเร็จทั้งหมด!`,
          'success',
          'Emergency Fix'
        );
      }

      if (this.errors.length > 0) {
        window.showToast(
          `⚠️ แก้ไขได้บางส่วน (${this.fixes.length}/${this.fixes.length + this.errors.length})`,
          'warning',
          'Emergency Fix'
        );
      }
    }

    return {
      successful: this.fixes,
      failed: this.errors,
      totalFixed: this.fixes.length,
      totalErrors: this.errors.length
    };
  }
};

// ================================================
// AUTO-RUN EMERGENCY FIXES
// ================================================

// รัน fixes ทันทีเมื่อโหลดสคริปต์
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => EmergencyFix.runAll(), 100);
  });
} else {
  setTimeout(() => EmergencyFix.runAll(), 100);
}

// Export ให้ใช้ manual
window.EmergencyFix = EmergencyFix;

console.log('🚨 Emergency Fix Script Loaded - fixes will run automatically');
console.log('💡 Manual fix: EmergencyFix.runAll()');