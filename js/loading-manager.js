/**
 * Centralized Loading Manager for Thai Accounting System
 * Prevents duplicate loading states and manages UI consistency
 */
class LoadingManager {
  constructor() {
    this.activeLoaders = new Set();
    this.lottieAnimation = null;
    this.currentOverlay = null;
    this.isInitialized = false;
  }

  /**
   * Show loading overlay with specific ID and message
   * @param {string} loaderId - Unique identifier for the loading operation
   * @param {string} message - Thai message to display
   */
  show(loaderId = 'default', message = 'กำลังโหลด...') {
    // Prevent duplicate loading for same ID
    if (this.activeLoaders.has(loaderId)) {
      console.warn(`Loading ${loaderId} already active`);
      return;
    }

    this.activeLoaders.add(loaderId);

    if (!this.currentOverlay) {
      this.createOverlay();
    }

    this.updateLoadingMessage(message);
    this.showOverlay();

    console.log(`Loading started: ${loaderId} - ${message}`);
  }

  /**
   * Hide loading overlay for specific ID
   * @param {string} loaderId - Unique identifier for the loading operation
   */
  hide(loaderId = 'default') {
    this.activeLoaders.delete(loaderId);

    console.log(`Loading finished: ${loaderId}`);

    // Only hide when no active loaders
    if (this.activeLoaders.size === 0) {
      this.hideOverlay();
    }
  }

  /**
   * Force hide all loading states (emergency cleanup)
   */
  hideAll() {
    this.activeLoaders.clear();
    this.hideOverlay();
    console.log('All loading states cleared');
  }

  /**
   * Create the loading overlay element
   */
  createOverlay() {
    // Remove existing overlay if any
    const existingOverlay = document.getElementById('globalLoadingOverlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'globalLoadingOverlay';
    overlay.className = 'loading-overlay animate__animated';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(2px);
    `;

    overlay.innerHTML = `
      <div class="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md mx-4">
        <div id="globalLottieContainer" class="w-32 h-32 mx-auto flex items-center justify-center mb-4"></div>
        <div id="globalLoadingMessage" class="text-lg font-medium text-gray-800 dark:text-gray-200">กำลังโหลด...</div>
        <div id="globalLoadingProgress" class="text-sm text-gray-600 dark:text-gray-400 mt-2"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.currentOverlay = overlay;
  }

  /**
   * Show the loading overlay with animation
   */
  async showOverlay() {
    if (!this.currentOverlay) return;

    this.currentOverlay.style.display = 'flex';
    this.currentOverlay.classList.remove('animate__fadeOut');
    this.currentOverlay.classList.add('animate__fadeIn');

    // Disable body scroll
    document.body.style.overflow = 'hidden';

    await this.loadLottieAnimation();
  }

  /**
   * Hide the loading overlay with animation
   */
  hideOverlay() {
    if (!this.currentOverlay) return;

    if (this.lottieAnimation) {
      this.lottieAnimation.pause();
    }

    this.currentOverlay.classList.remove('animate__fadeIn');
    this.currentOverlay.classList.add('animate__fadeOut');

    // Re-enable body scroll
    document.body.style.overflow = '';

    setTimeout(() => {
      if (this.currentOverlay) {
        this.currentOverlay.style.display = 'none';
      }
    }, 300);
  }

  /**
   * Load and display Lottie animation
   */
  async loadLottieAnimation() {
    if (this.lottieAnimation) {
      this.lottieAnimation.play();
      return;
    }

    const container = document.getElementById('globalLottieContainer');
    if (!container) return;

    try {
      // Try to load Lottie animation
      const response = await fetch('/Loading/Loading.json');
      if (!response.ok) throw new Error('Lottie file not found');

      const animationData = await response.json();

      // Check if lottie library is available
      if (typeof lottie === 'undefined') {
        throw new Error('Lottie library not loaded');
      }

      this.lottieAnimation = lottie.loadAnimation({
        container: container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: animationData
      });

    } catch (error) {
      console.warn('Lottie animation failed, using fallback:', error);
      // Fallback to DaisyUI spinner
      container.innerHTML = `
        <div class="loading loading-spinner loading-lg text-primary"></div>
      `;
    }
  }

  /**
   * Update loading message
   * @param {string} message - Thai message to display
   */
  updateLoadingMessage(message) {
    const messageEl = document.getElementById('globalLoadingMessage');
    if (messageEl) {
      messageEl.textContent = message;
    }
  }

  /**
   * Update progress information
   * @param {string} progress - Progress text to display
   */
  updateProgress(progress) {
    const progressEl = document.getElementById('globalLoadingProgress');
    if (progressEl) {
      progressEl.textContent = progress;
    }
  }

  /**
   * Get list of active loaders
   */
  getActiveLoaders() {
    return Array.from(this.activeLoaders);
  }

  /**
   * Check if any loader is active
   */
  isLoading() {
    return this.activeLoaders.size > 0;
  }

  /**
   * Cleanup method - destroy all resources
   */
  destroy() {
    if (this.lottieAnimation) {
      this.lottieAnimation.destroy();
      this.lottieAnimation = null;
    }

    if (this.currentOverlay) {
      this.currentOverlay.remove();
      this.currentOverlay = null;
    }

    // Re-enable body scroll
    document.body.style.overflow = '';

    this.activeLoaders.clear();
    console.log('LoadingManager destroyed');
  }
}

// Initialize global instance
if (typeof window !== 'undefined') {
  window.LoadingManager = new LoadingManager();

  // Convenience methods for backward compatibility
  window.showGlobalLoading = (id, message) => window.LoadingManager.show(id, message);
  window.hideGlobalLoading = (id) => window.LoadingManager.hide(id);

  // Emergency cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (window.LoadingManager) {
      window.LoadingManager.destroy();
    }
  });

  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.LoadingManager) {
      // Pause animations when page is hidden
      if (window.LoadingManager.lottieAnimation) {
        window.LoadingManager.lottieAnimation.pause();
      }
    } else if (!document.hidden && window.LoadingManager) {
      // Resume animations when page is visible
      if (window.LoadingManager.lottieAnimation && window.LoadingManager.isLoading()) {
        window.LoadingManager.lottieAnimation.play();
      }
    }
  });

  console.log('LoadingManager initialized successfully');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoadingManager;
}