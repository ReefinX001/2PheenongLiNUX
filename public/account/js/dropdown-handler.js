// Dropdown Handler for Account Menu
// เพิ่มการจัดการ dropdown events สำหรับเมนูระบบบัญชี

(function() {
  'use strict';

  console.log('📋 Dropdown Handler Loading...');

  function initDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');

    console.log('🎯 Found dropdowns:', dropdowns.length);

    dropdowns.forEach((dropdown, index) => {
      const toggle = dropdown.querySelector('a');
      const submenu = dropdown.querySelector('ul');

      if (!toggle || !submenu) {
        console.warn(`Dropdown ${index} missing toggle or submenu`);
        return;
      }

      // Mouse events
      dropdown.addEventListener('mouseenter', function() {
        submenu.style.opacity = '1';
        submenu.style.visibility = 'visible';
        submenu.style.transform = 'translateY(0)';
      });

      dropdown.addEventListener('mouseleave', function() {
        submenu.style.opacity = '0';
        submenu.style.visibility = 'hidden';
        submenu.style.transform = 'translateY(10px)';
      });

      // Keyboard support
      toggle.addEventListener('focus', function() {
        submenu.style.opacity = '1';
        submenu.style.visibility = 'visible';
        submenu.style.transform = 'translateY(0)';
      });

      console.log(`✅ Dropdown ${index} initialized`);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDropdowns);
  } else {
    initDropdowns();
  }

})();
