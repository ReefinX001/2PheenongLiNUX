/**
 * Global Error Handler for Loading States
 * Ensures loading states are properly cleared even when errors occur
 */
class LoadingErrorHandler {
  constructor() {
    this.setupGlobalErrorHandlers();
    this.setupPromiseRejectionHandler();
    this.setupWindowErrorHandler();
  }

  /**
   * Setup global error handlers to ensure loading states are cleared
   */
  setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    this.setupPromiseRejectionHandler();

    // Handle general window errors
    this.setupWindowErrorHandler();

    // Handle fetch errors specifically
    this.setupFetchErrorHandler();
  }

  /**
   * Handle unhandled promise rejections
   */
  setupPromiseRejectionHandler() {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);

      // Clear all loading states on unhandled promise rejection
      this.clearAllLoadingStates();

      // Show user-friendly error message
      this.showErrorNotification('เกิดข้อผิดพลาดไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้ง');
    });
  }

  /**
   * Handle general window errors
   */
  setupWindowErrorHandler() {
    window.addEventListener('error', (event) => {
      console.error('Window error:', event.error);

      // Clear loading states on script errors
      this.clearAllLoadingStates();

      // Don't show notification for minor script errors
      if (event.error && event.error.message &&
          !event.error.message.includes('Script error') &&
          !event.error.message.includes('Non-Error promise rejection')) {
        this.showErrorNotification('เกิดข้อผิดพลาดในระบบ กรุณาโหลดหน้าใหม่');
      }
    });
  }

  /**
   * Setup fetch error handler with retry mechanism
   */
  setupFetchErrorHandler() {
    const originalFetch = window.fetch;

    window.fetch = async function(...args) {
      try {
        const response = await originalFetch.apply(this, args);

        // Handle HTTP error status codes
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        console.error('Fetch error:', error);

        // Clear loading states on fetch errors
        if (window.LoadingManager) {
          window.LoadingManager.hideAll();
        }

        // Rethrow the error for handling by the calling code
        throw error;
      }
    };
  }

  /**
   * Clear all loading states across the application
   */
  clearAllLoadingStates() {
    if (window.LoadingManager) {
      window.LoadingManager.hideAll();
    }

    // Clear any remaining loading overlays
    const loadingOverlays = document.querySelectorAll('[id*="loading"], [id*="Loading"], .loading-overlay');
    loadingOverlays.forEach(overlay => {
      if (overlay.style) {
        overlay.style.display = 'none';
      }
    });

    // Re-enable body scroll
    document.body.style.overflow = '';

    console.log('All loading states cleared by error handler');
  }

  /**
   * Show error notification to user
   */
  showErrorNotification(message) {
    // Try different notification methods in order of preference

    // 1. Try SweetAlert2
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: message,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    // 2. Try custom notification function
    if (typeof showNotification === 'function') {
      showNotification('ข้อผิดพลาด', message, 'error');
      return;
    }

    // 3. Fallback to browser alert
    alert(`ข้อผิดพลาด: ${message}`);
  }

  /**
   * Wrap async functions with automatic loading state management
   */
  wrapAsyncFunction(asyncFn, loadingId, loadingMessage) {
    return async function(...args) {
      try {
        if (window.LoadingManager) {
          window.LoadingManager.show(loadingId, loadingMessage);
        }

        const result = await asyncFn.apply(this, args);
        return result;

      } catch (error) {
        console.error(`Error in ${loadingId}:`, error);

        // Show appropriate error message based on error type
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          this.showErrorNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
        } else if (error.message.includes('401')) {
          this.showErrorNotification('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
          setTimeout(() => window.location.href = '/login', 2000);
        } else if (error.message.includes('403')) {
          this.showErrorNotification('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
        } else if (error.message.includes('404')) {
          this.showErrorNotification('ไม่พบข้อมูลที่ต้องการ');
        } else if (error.message.includes('500')) {
          this.showErrorNotification('เกิดข้อผิดพลาดในเซิร์ฟเวอร์ กรุณาลองใหม่ในภายหลัง');
        } else {
          this.showErrorNotification('เกิดข้อผิดพลาดไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้ง');
        }

        throw error; // Re-throw for additional handling if needed

      } finally {
        if (window.LoadingManager) {
          window.LoadingManager.hide(loadingId);
        }
      }
    }.bind(this);
  }

  /**
   * Auto-retry mechanism for failed operations
   */
  async withRetry(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.log(`Attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          throw error; // Final attempt failed
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
}

// Initialize global error handler
if (typeof window !== 'undefined') {
  window.LoadingErrorHandler = new LoadingErrorHandler();

  // Export helper functions for easy use
  window.wrapAsyncWithLoading = (asyncFn, loadingId, loadingMessage) => {
    return window.LoadingErrorHandler.wrapAsyncFunction(asyncFn, loadingId, loadingMessage);
  };

  window.withRetry = (operation, maxRetries, delay) => {
    return window.LoadingErrorHandler.withRetry(operation, maxRetries, delay);
  };

  console.log('Loading Error Handler initialized successfully');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoadingErrorHandler;
}