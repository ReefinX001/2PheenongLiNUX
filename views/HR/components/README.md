# HR Sidebar Component

ระบบ Sidebar แยกส่วนสำหรับระบบ HR ที่สามารถใช้งานร่วมกันได้ในทุกหน้าของโฟลเดอร์ HR

## ไฟล์ที่เกี่ยวข้อง

- `sidebar.html` - โครงสร้าง HTML ของ sidebar
- `sidebar.css` - CSS styles สำหรับ sidebar
- `sidebar.js` - JavaScript functions สำหรับจัดการ sidebar

## วิธีการใช้งาน

### 1. เพิ่ม CSS ใน `<head>`

```html
<!-- HR Sidebar Component CSS -->
<link rel="stylesheet" href="/HR/components/sidebar.css" />
```

### 2. เพิ่ม Container สำหรับ Sidebar ใน `<body>`

```html
<body class="bg-white text-gray-700 dark:bg-gray-700 dark:text-gray-200">
  <!-- HR Sidebar Component Container -->
  <div id="sidebar-container"></div>
  
  <div class="min-h-screen">
    <!-- Main Content -->
    <main class="ml-64 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-all duration-300" id="mainContent">
      <!-- เนื้อหาหลักของหน้า -->
    </main>
  </div>
</body>
```

### 3. เพิ่ม JavaScript ก่อน closing `</body>`

```html
<!-- HR Sidebar Component JavaScript -->
<script src="/HR/components/sidebar.js"></script>
```

### 4. ปรับปรุง JavaScript ของหน้า (ถ้ามี)

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // ตรวจสอบ authentication
  if (!localStorage.getItem('authToken')) {
    return window.location.href = 'login.html';
  }

  // รอให้ sidebar component โหลดเสร็จก่อน
  setTimeout(() => {
    // เรียกฟังก์ชันอื่นๆ ของหน้า
    initPageFunctions();
  }, 100);
});
```

## Features

### ✅ ฟีเจอร์ที่มี

- **Auto Authentication Check** - ตรวจสอบ token อัตโนมัติ
- **User Profile Loading** - โหลดข้อมูลผู้ใช้อัตโนมัติ
- **Active Menu Highlighting** - ไฮไลท์เมนูที่กำลังใช้งาน
- **Dark Mode Toggle** - สลับโหมดมืด/สว่าง
- **Responsive Design** - รองรับทุกขนาดหน้าจอ
- **Smooth Animations** - แอนิเมชันที่ลื่นไหล
- **Logout Function** - ฟังก์ชันออกจากระบบ

### 🎨 Styling Features

- **Hover Effects** - เอฟเฟกต์เมื่อ hover
- **Active State Indicators** - แสดงสถานะเมนูที่ active
- **Custom Scrollbar** - scrollbar ที่ปรับแต่งแล้ว
- **Loading States** - แสดงสถานะ loading
- **Status Indicators** - แสดงสถานะออนไลน์/ออฟไลน์

## เมนูที่มี

1. **แดชบอร์ด** (`hr_dashboard`) - หน้าหลัก HR
2. **พนักงาน** (`employee_directory`) - จัดการข้อมูลพนักงาน
3. **บันทึกเวลาเข้า-ออก** (`attendance`) - ระบบลงเวลา
4. **การลา** (`leave_requests`) - จัดการคำขอลา
5. **เงินเดือน** (`payroll`) - ระบบเงินเดือน
6. **ประเมินผลงาน** (`performance_reviews`) - ประเมินผลงาน
7. **รายการโบนัส** (`bonus_list`) - จัดการโบนัส
8. **การฝึกอบรม** (`training`) - ระบบฝึกอบรม
9. **รายงาน** (`reports`) - รายงานต่างๆ
10. **ประกาศ** (`announcements`) - ประกาศองค์กร
11. **การแจ้งเตือน** (`notifications`) - การแจ้งเตือน
12. **ปฏิทิน** (`calendar`) - ปฏิทินกิจกรรม
13. **การตั้งค่า** (`role_management`) - ตั้งค่าระบบ

## API ที่ใช้

- `GET /api/users/me` - ดึงข้อมูลผู้ใช้ปัจจุบัน

## การปรับแต่ง

### เปลี่ยนเมนู

แก้ไขไฟล์ `sidebar.html` เพื่อเพิ่ม/ลด/แก้ไขเมนู

### เปลี่ยน Styles

แก้ไขไฟล์ `sidebar.css` เพื่อปรับแต่งสีสัน และ effects

### เพิ่มฟังก์ชัน

แก้ไขไฟล์ `sidebar.js` เพื่อเพิ่มฟังก์ชันใหม่ๆ

## ข้อกำหนด

- **Tailwind CSS** - สำหรับ styling
- **DaisyUI** - UI components
- **Bootstrap Icons** - ไอคอน
- **Google Fonts (Prompt)** - ฟอนต์ภาษาไทย

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## ตัวอย่างการใช้งาน

ดูตัวอย่างการใช้งานได้ที่ `HR_Dashboard.html` ที่ได้รับการอัปเดตแล้ว
