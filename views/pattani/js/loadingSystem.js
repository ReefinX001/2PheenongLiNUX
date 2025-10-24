/**
 * LoadingSystem v2.1.0 - Optimized Version
 * Enhanced loading system with better performance and memory management
 */

class LoadingSystem {
  constructor() {
    this.activeLoadings = new Map();
    this.config = {
      defaultSpinner: 'default',
      defaultDuration: 0,
      showProgress: false,
      autoProgress: false,
      theme: 'auto'
    };
    this.version = '2.1.0-optimized';
  }

  /**
   * Generate unique ID for loading instances
   */
  generateId() {
    return 'loading_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Create loading overlay element
   */
  createOverlay(options) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-system-overlay';

    const content = document.createElement('div');
    content.className = 'loading-system-content';

    // Spinner
    const spinner = document.createElement('div');
    spinner.className = `loading-system-spinner ${options.spinnerType || this.config.defaultSpinner}`;
    content.appendChild(spinner);

    // Message
    if (options.message) {
      const message = document.createElement('div');
      message.className = 'loading-system-message';
      message.textContent = options.message;
      content.appendChild(message);
    }

    // Sub message
    if (options.subMessage) {
      const subMessage = document.createElement('div');
      subMessage.className = 'loading-system-submessage';
      subMessage.textContent = options.subMessage;
      content.appendChild(subMessage);
    }

    // Progress bar
    if (options.showProgress) {
      const progressContainer = document.createElement('div');
      progressContainer.className = 'loading-system-progress';

      const progressBar = document.createElement('div');
      progressBar.className = 'loading-system-progress-bar';

      if (options.autoProgress) {
        progressBar.className += ' animated';
      }

      progressContainer.appendChild(progressBar);
      content.appendChild(progressContainer);

      // Show progress container
      setTimeout(() => {
        progressContainer.classList.add('visible');
      }, 100);
    }

    overlay.appendChild(content);
    return overlay;
  }

  /**
   * Show loading overlay
   */
  show(options = {}) {
    const id = this.generateId();
    const config = { ...this.config, ...options };

    const overlay = this.createOverlay(config);
    overlay.setAttribute('data-loading-id', id);

    document.body.appendChild(overlay);

    // Trigger animation
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    // Store reference
    this.activeLoadings.set(id, {
      overlay: overlay,
      startTime: Date.now(),
      config: config
    });

    // Auto hide if duration is set
    if (config.duration > 0) {
      setTimeout(() => {
        this.hide(id);
      }, config.duration);
    }

    return id;
  }

  /**
   * Hide loading overlay
   */
  hide(id) {
    if (!this.activeLoadings.has(id)) {
      console.warn('LoadingSystem: Trying to hide non-existent loading with id:', id);
      return false;
    }

    const loading = this.activeLoadings.get(id);
    const overlay = loading.overlay;

    overlay.classList.remove('active');

    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      this.activeLoadings.delete(id);
    }, 300);

    return true;
  }

  /**
   * Update loading message
   */
  updateMessage(id, newMessage, newSubMessage = null) {
    if (!this.activeLoadings.has(id)) {
      console.warn('LoadingSystem: Trying to update non-existent loading with id:', id);
      return false;
    }

    const loading = this.activeLoadings.get(id);
    const overlay = loading.overlay;

    const messageEl = overlay.querySelector('.loading-system-message');
    if (messageEl && newMessage) {
      messageEl.textContent = newMessage;
    }

    const subMessageEl = overlay.querySelector('.loading-system-submessage');
    if (subMessageEl && newSubMessage) {
      subMessageEl.textContent = newSubMessage;
    }

    return true;
  }

  /**
   * Update progress bar
   */
  updateProgress(id, percentage) {
    if (!this.activeLoadings.has(id)) {
      console.warn('LoadingSystem: Trying to update progress for non-existent loading with id:', id);
      return false;
    }

    const loading = this.activeLoadings.get(id);
    const overlay = loading.overlay;
    const progressBar = overlay.querySelector('.loading-system-progress-bar');

    if (progressBar) {
      progressBar.style.width = Math.min(100, Math.max(0, percentage)) + '%';
      return true;
    }

    return false;
  }

  /**
   * Complete progress and hide
   */
  completeProgress(id) {
    return new Promise((resolve) => {
      if (this.updateProgress(id, 100)) {
        setTimeout(() => {
          this.hide(id);
          resolve(true);
        }, 500);
      } else {
        this.hide(id);
        resolve(false);
      }
    });
  }

  /**
   * Hide all active loadings
   */
  hideAll() {
    const ids = Array.from(this.activeLoadings.keys());
    ids.forEach(id => this.hide(id));
    return ids.length;
  }

  /**
   * Check if loading is active
   */
  isActive(id) {
    return this.activeLoadings.has(id);
  }

  /**
   * Get count of active loadings
   */
  getActiveCount() {
    return this.activeLoadings.size;
  }

  /**
   * Configure global settings
   */
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Show button loading state
   */
  showButtonLoading(buttonElement, options = {}) {
    if (!buttonElement) return null;

    const config = {
      spinnerType: options.spinnerType || 'default',
      preserveWidth: options.preserveWidth !== false,
      ...options
    };

    // Store original state
    const originalText = buttonElement.textContent;
    const originalHTML = buttonElement.innerHTML;
    const originalDisabled = buttonElement.disabled;
    const originalWidth = buttonElement.offsetWidth;

    // Apply loading state
    buttonElement.classList.add('loading');
    if (config.spinnerType === 'dots') {
      buttonElement.classList.add('loading-dots');
    }

    buttonElement.disabled = true;

    if (config.preserveWidth && originalWidth) {
      buttonElement.style.width = originalWidth + 'px';
    }

    const id = this.generateId();
    this.activeLoadings.set(id, {
      type: 'button',
      element: buttonElement,
      originalText,
      originalHTML,
      originalDisabled,
      originalWidth,
      config
    });

    return id;
  }

  /**
   * Hide button loading state
   */
  hideButtonLoading(id) {
    if (!this.activeLoadings.has(id)) {
      console.warn('LoadingSystem: Trying to hide non-existent button loading with id:', id);
      return false;
    }

    const loading = this.activeLoadings.get(id);
    if (loading.type !== 'button') {
      console.warn('LoadingSystem: ID does not correspond to button loading:', id);
      return false;
    }

    const element = loading.element;

    // Restore original state
    element.classList.remove('loading', 'loading-dots');
    element.disabled = loading.originalDisabled;
    element.style.width = '';

    this.activeLoadings.delete(id);
    return true;
  }

  /**
   * Cleanup all loadings (useful for page unload)
   */
  cleanup() {
    this.hideAll();
    this.activeLoadings.clear();
  }
}

// Initialize global LoadingSystem instance
window.LoadingSystem = new LoadingSystem();
console.log('✅ LoadingSystem initialized and ready');

// Safe wrapper functions for backward compatibility
function safeShowLoading(options = {}) {
  try {
    if (typeof window.LoadingSystem !== 'undefined' && typeof window.LoadingSystem.show === 'function') {
      return window.LoadingSystem.show(options);
    } else {
      console.warn('⚠️ LoadingSystem not available yet, skipping loading display. Available:', typeof window.LoadingSystem);
      return null;
    }
  } catch (error) {
    console.error('❌ Error showing loading:', error);
    return null;
  }
}

function safeHideLoading(id) {
  try {
    if (id && typeof window.LoadingSystem !== 'undefined' && typeof window.LoadingSystem.hide === 'function') {
      return window.LoadingSystem.hide(id);
    }
    return false;
  } catch (error) {
    console.error('❌ Error hiding loading:', error);
    return false;
  }
}

function safeUpdateMessage(id, message, subMessage = null) {
  try {
    if (id && typeof window.LoadingSystem !== 'undefined' && typeof window.LoadingSystem.updateMessage === 'function') {
      return window.LoadingSystem.updateMessage(id, message, subMessage);
    }
    return false;
  } catch (error) {
    console.error('❌ Error updating loading message:', error);
    return false;
  }
}

function safeUpdateProgress(id, percentage) {
  try {
    if (id && typeof window.LoadingSystem !== 'undefined' && typeof window.LoadingSystem.updateProgress === 'function') {
      return window.LoadingSystem.updateProgress(id, percentage);
    }
    return false;
  } catch (error) {
    console.error('❌ Error updating loading progress:', error);
    return false;
  }
}

function safeCompleteProgress(id) {
  try {
    if (id && typeof window.LoadingSystem !== 'undefined' && typeof window.LoadingSystem.completeProgress === 'function') {
      return window.LoadingSystem.completeProgress(id);
    }
    return Promise.resolve(false);
  } catch (error) {
    console.error('❌ Error completing loading progress:', error);
    return Promise.resolve(false);
  }
}

// Enhanced button loading with multiple states
function enhanceButtonWithLoading(buttonElement, options = {}) {
  if (!buttonElement) return;

  const originalClickHandler = buttonElement.onclick;
  let loadingId = null;

  buttonElement.onclick = async function(event) {
    if (loadingId) return; // Prevent double-click

    // Show loading
    loadingId = window.LoadingSystem.showButtonLoading(buttonElement, {
      spinnerType: options.spinnerType || 'default'
    });

    try {
      // Call original handler if it exists
      if (originalClickHandler) {
        await originalClickHandler.call(this, event);
      }

      // Show success state briefly
      if (options.showSuccess !== false) {
        safeUpdateMessage(loadingId, options.successMessage || 'สำเร็จ');
        await new Promise(resolve => setTimeout(resolve, 800));
      }

    } catch (error) {
      console.error('Button action failed:', error);

      // Show error state briefly
      if (options.showError !== false) {
        safeUpdateMessage(loadingId, options.errorMessage || 'เกิดข้อผิดพลาด');
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    } finally {
      // Hide loading
      if (loadingId) {
        window.LoadingSystem.hideButtonLoading(loadingId);
        loadingId = null;
      }
    }
  };
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.LoadingSystem) {
    window.LoadingSystem.cleanup();
  }
});

// Export functions globally for backward compatibility
window.safeShowLoading = safeShowLoading;
window.safeHideLoading = safeHideLoading;
window.safeUpdateMessage = safeUpdateMessage;
window.safeUpdateProgress = safeUpdateProgress;
window.safeCompleteProgress = safeCompleteProgress;
window.enhanceButtonWithLoading = enhanceButtonWithLoading;