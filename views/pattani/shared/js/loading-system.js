// Loading System Module
const LoadingSystem = (function() {
  let loadingCount = 0;
  let loadingOverlay = null;
  let loadingText = null;

  // Initialize loading overlay
  function init() {
    if (loadingOverlay) return;

    // Create overlay element
    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div class="loading-text">กำลังโหลด...</div>
      </div>
    `;

    document.body.appendChild(loadingOverlay);
    loadingText = loadingOverlay.querySelector('.loading-text');
  }

  // Show loading overlay
  function show(message = 'กำลังโหลด...') {
    init();
    loadingCount++;

    if (loadingCount === 1) {
      loadingOverlay.classList.add('active');
    }

    if (message) {
      loadingText.textContent = message;
    }

    console.log('🔄 Loading started:', message);
  }

  // Hide loading overlay
  function hide() {
    if (!loadingOverlay) return;

    loadingCount = Math.max(0, loadingCount - 1);

    if (loadingCount === 0) {
      loadingOverlay.classList.remove('active');
      loadingText.textContent = 'กำลังโหลด...';
    }

    console.log('✅ Loading completed');
  }

  // Force hide (reset counter)
  function forceHide() {
    loadingCount = 0;
    if (loadingOverlay) {
      loadingOverlay.classList.remove('active');
      loadingText.textContent = 'กำลังโหลด...';
    }
  }

  // Create inline loading spinner
  function createInlineSpinner() {
    const spinner = document.createElement('span');
    spinner.className = 'inline-loading';
    return spinner;
  }

  // Wrap async function with loading
  function wrapAsync(asyncFunc, message) {
    return async function(...args) {
      show(message);
      try {
        const result = await asyncFunc.apply(this, args);
        hide();
        return result;
      } catch (error) {
        hide();
        throw error;
      }
    };
  }

  // Wrap promise with loading
  function wrapPromise(promise, message) {
    show(message);
    return promise
      .then(result => {
        hide();
        return result;
      })
      .catch(error => {
        hide();
        throw error;
      });
  }

  // Show loading for specific element
  function showForElement(element, message = 'Loading...') {
    if (!element) return;

    const originalContent = element.innerHTML;
    element.dataset.originalContent = originalContent;
    element.disabled = true;

    const spinner = createInlineSpinner();
    element.innerHTML = '';
    element.appendChild(document.createTextNode(message + ' '));
    element.appendChild(spinner);
  }

  // Hide loading for specific element
  function hideForElement(element) {
    if (!element || !element.dataset.originalContent) return;

    element.innerHTML = element.dataset.originalContent;
    element.disabled = false;
    delete element.dataset.originalContent;
  }

  // Show progress
  function showProgress(current, total, message = 'Processing') {
    init();

    if (!loadingOverlay.classList.contains('active')) {
      show();
    }

    const percentage = Math.round((current / total) * 100);
    loadingText.textContent = `${message}... ${percentage}% (${current}/${total})`;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  return {
    show,
    hide,
    forceHide,
    createInlineSpinner,
    wrapAsync,
    wrapPromise,
    showForElement,
    hideForElement,
    showProgress,
    init
  };
})();

// Make available globally
window.LoadingSystem = LoadingSystem;

// Auto-attach to AJAX requests if jQuery is available
if (typeof $ !== 'undefined') {
  $(document).ajaxStart(function() {
    LoadingSystem.show('กำลังดำเนินการ...');
  }).ajaxStop(function() {
    LoadingSystem.hide();
  });
}

// Auto-attach to fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  const shouldShowLoading = !url.includes('no-loading');

  if (shouldShowLoading) {
    LoadingSystem.show('กำลังโหลดข้อมูล...');
  }

  return originalFetch.apply(this, args)
    .then(response => {
      if (shouldShowLoading) {
        LoadingSystem.hide();
      }
      return response;
    })
    .catch(error => {
      if (shouldShowLoading) {
        LoadingSystem.hide();
      }
      throw error;
    });
};