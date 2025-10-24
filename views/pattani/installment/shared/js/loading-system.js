/**
 * LoadingSystem v2.0.0 - Shared Version
 * Enhanced loading system for installment pages
 * @version 2.0.0
 */

(function(window) {
  'use strict';

  console.log('🚀 LoadingSystem v2.0.0 (Shared) initializing...');

  let activeLoaders = new Map();
  let loaderCounter = 0;
  let defaultContainer = null;

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

  function generateLoaderId() {
    return `loader-${Date.now()}-${++loaderCounter}`;
  }

  function createLoadingOverlay(options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';

    const content = document.createElement('div');
    content.className = 'loading-content';

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';

    const message = document.createElement('div');
    message.className = 'loading-message';
    message.textContent = options.message || 'กำลังโหลด...';

    let progressBar = null;
    if (options.showProgress) {
      progressBar = document.createElement('div');
      progressBar.className = 'loading-progress';

      const progressFill = document.createElement('div');
      progressFill.className = 'loading-progress-fill';
      progressBar.appendChild(progressFill);
    }

    content.appendChild(spinner);
    content.appendChild(message);
    if (progressBar) {
      content.appendChild(progressBar);
    }
    overlay.appendChild(content);

    return { overlay, progressBar };
  }

  function updateProgress(loaderId, progress) {
    const loaderData = activeLoaders.get(loaderId);
    if (loaderData && loaderData.progressBar) {
      const fill = loaderData.progressBar.querySelector('.loading-progress-fill');
      if (fill) {
        fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
      }
    }
  }

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

  const LoadingSystem = {
    show: function(options = {}) {
      try {
        const loaderId = generateLoaderId();
        const container = createDefaultContainer();

        const { overlay, progressBar } = createLoadingOverlay(options);
        overlay.setAttribute('data-loader-id', loaderId);

        if (options.type && options.type !== 'default') {
          overlay.classList.add(`loading-${options.type}`);
        }

        container.appendChild(overlay);

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

        if (options.autoProgress && progressBar) {
          startAutoProgress(loaderId);
        }

        if (options.timeout && options.timeout > 0) {
          loaderData.timeout = setTimeout(() => {
            this.hide(loaderId);
          }, options.timeout);
        }

        requestAnimationFrame(() => {
          overlay.classList.add('loading-visible');
        });

        console.log(`✅ LoadingSystem.show() - ID: ${loaderId}`);
        return loaderId;

      } catch (error) {
        console.error('❌ LoadingSystem.show() error:', error);
        return null;
      }
    },

    hide: function(loaderId) {
      try {
        if (!loaderId) return;

        const loaderData = activeLoaders.get(loaderId);
        if (!loaderData) return;

        if (loaderData.progressBar) {
          updateProgress(loaderId, 100);
        }

        if (loaderData.progressInterval) {
          clearInterval(loaderData.progressInterval);
        }

        if (loaderData.timeout) {
          clearTimeout(loaderData.timeout);
        }

        loaderData.overlay.classList.remove('loading-visible');
        loaderData.overlay.classList.add('loading-hiding');

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

    hideAll: function() {
      try {
        const loaderIds = Array.from(activeLoaders.keys());
        loaderIds.forEach(loaderId => this.hide(loaderId));
        console.log(`✅ LoadingSystem.hideAll() - ซ่อน ${loaderIds.length} loaders`);
      } catch (error) {
        console.error('❌ LoadingSystem.hideAll() error:', error);
      }
    },

    updateProgress: function(loaderId, progress) {
      updateProgress(loaderId, progress);
    },

    completeProgress: function(loaderId = null) {
      if (loaderId) {
        updateProgress(loaderId, 100);
        setTimeout(() => this.hide(loaderId), 500);
      } else {
        activeLoaders.forEach((loaderData, id) => {
          if (loaderData.progressBar) {
            updateProgress(id, 100);
            setTimeout(() => this.hide(id), 500);
          }
        });
      }
    },

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

    isActive: function(loaderId) {
      return activeLoaders.has(loaderId);
    },

    getActiveCount: function() {
      return activeLoaders.size;
    },

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

    debug: function() {
      return {
        activeLoaders: activeLoaders.size,
        loaderIds: Array.from(activeLoaders.keys()),
        containerExists: !!defaultContainer,
        version: '2.0.0-shared'
      };
    }
  };

  // Export LoadingSystem to global scope
  window.LoadingSystem = LoadingSystem;

  // Auto cleanup เมื่อออกจากหน้า
  window.addEventListener('beforeunload', () => {
    LoadingSystem.cleanup();
  });

  console.log('✅ LoadingSystem v2.0.0 (Shared) initialized successfully');

})(window);