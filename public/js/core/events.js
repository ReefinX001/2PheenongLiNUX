// Global event handlers
export function setupEventListeners() {
  // Handle form submissions
  document.addEventListener('submit', (e) => {
    if (e.target.classList.contains('ajax-form')) {
      e.preventDefault();
      handleAjaxForm(e.target);
    }
  });
}

function handleAjaxForm(form) {
  console.log('Handling ajax form submission');
}