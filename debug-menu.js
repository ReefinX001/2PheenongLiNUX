// Debug script to test menu loading
console.log('=== DEBUG MENU SCRIPT START ===');

// Check if container exists
setTimeout(() => {
  const container = document.getElementById('mainMenuContainer');
  console.log('Container element:', container);
  console.log('Container innerHTML length:', container ? container.innerHTML.length : 'N/A');
  console.log('Container innerHTML:', container ? container.innerHTML.substring(0, 500) : 'N/A');

  // Check if AccountMenu exists
  console.log('AccountMenu object:', typeof window.AccountMenu);

  // Check if menu was injected
  const menuElements = document.querySelectorAll('.menu-horizontal');
  console.log('Menu elements found:', menuElements.length);

  // Check if DOMContentLoaded already fired
  console.log('Document ready state:', document.readyState);

  // Check CSS loaded
  const cssLink = document.querySelector('link[href*="account-menu.css"]');
  console.log('CSS link element:', cssLink);

  // Check JS loaded
  const jsScript = document.querySelector('script[src*="account-menu.js"]');
  console.log('JS script element:', jsScript);

}, 3000);

console.log('=== DEBUG MENU SCRIPT END ===');
