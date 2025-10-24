// darkmode.js
(function () {
  // ฟังก์ชันอัปเดตข้อความบนปุ่ม toggle
  function updateDarkModeLabel(isDark) {
    const darkModeLabel = document.getElementById('darkModeLabel');
    if (darkModeLabel) {
      darkModeLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }
  }

  // โหลดสถานะ dark mode จาก localStorage และปรับ class บน <html>
  function loadDarkMode() {
    const savedDark = localStorage.getItem('darkMode') === 'true';
    if (savedDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    updateDarkModeLabel(savedDark);
  }

  // สลับ dark mode และบันทึกสถานะลง localStorage
  function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('darkMode', isDark);
    updateDarkModeLabel(isDark);
  }

  // เมื่อ DOM โหลดเสร็จ ให้เรียกใช้งานฟังก์ชัน loadDarkMode และตั้ง event listener ให้ปุ่ม toggle
  document.addEventListener('DOMContentLoaded', () => {
    loadDarkMode();
    const btnToggleDark = document.getElementById('btnToggleDark');
    if (btnToggleDark) {
      btnToggleDark.addEventListener('click', toggleDarkMode);
    }
  });
})();
