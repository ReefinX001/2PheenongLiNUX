# Account Menu Refactoring Documentation

## สรุปการเปลี่ยนแปลง

ได้ทำการแยกส่วนของเมนู (Menu), CSS และ JavaScript ออกจากไฟล์ HTML แต่ละไฟล์ เพื่อให้ง่ายต่อการจัดการและแก้ไข

## ไฟล์ที่สร้างขึ้นใหม่

### 1. `/public/css/account-menu.css`
ไฟล์ CSS สำหรับจัดการสไตล์ของเมนูทั้งหมด รวมถึง:
- Navbar styling
- Dropdown menu styling (รองรับ multi-level dropdown)
- Dark mode support
- User profile badge
- Responsive design

### 2. `/public/js/account-menu.js`
ไฟล์ JavaScript สำหรับจัดการฟังก์ชันการทำงานของเมนู:
- **Menu Injection**: แทรกเมนูเข้าไปในหน้าอัตโนมัติ
- **Dark Mode Toggle**: เปลี่ยนธีมระหว่าง Light/Dark mode พร้อมบันทึกการตั้งค่า
- **User Profile**: แสดงข้อมูลผู้ใช้และรูปโปรไฟล์
- **Logout Function**: จัดการการออกจากระบบ

### 3. `/public/templates/account-navbar.html`
Template HTML สำหรับ Navbar ที่สามารถนำกลับมาใช้ได้

### 4. `/root/my-accounting-app/update-account-menu.js`
สคริปต์สำหรับอัพเดทไฟล์ HTML ทั้งหมดในโฟลเดอร์ `/views/account`

## โครงสร้างเมนู

เมนูถูกแบ่งออกเป็น 8 หมวดหลัก:

1. **ซื้อ (Purchase)** - สีเขียว
   - ใบสั่งซื้อ, ซื้อสินค้า, ซื้อสินทรัพย์, ใบรับสินค้า, ฯลฯ

2. **ขาย (Sales)** - สีแดง
   - ใบเสนอราคา, ใบแจ้งหนี้, ใบเสร็จรับเงิน, ใบกำกับภาษีขาย, ฯลฯ

3. **บัญชี (Accounting)** - สีน้ำเงิน
   - ผังบัญชี, ลงประจำวัน (Nested), งบกระแสเงินสด, สินทรัพย์, ทุน

4. **การเงิน (Finance)** - สีฟ้าเขียว
   - การจัดการเงินสด, กระทบยอดธนาคาร, การจัดการเงินกู้, เช็ครับ/จ่าย

5. **สินค้า (Products)** - สีเหลืองอำพัน
   - รายละเอียดสินค้า, รายละเอียดบริการ, รายการเคลื่อนไหวสินค้า

6. **รายงาน (Reports)** - สีฟ้าสด
   - รายงานต่างๆ รวมถึงรายงานภาษี (Nested 2 ระดับ)

7. **ตั้งค่า (Settings)** - สีเทา
   - ตั้งค่าองค์กร, ผู้ใช้งาน, สาขา, เอกสาร

## คุณสมบัติพิเศษ

### Multi-level Dropdown
เมนูรองรับการแสดง dropdown หลายระดับ (Nested Dropdown):
- บัญชี > ลงประจำวัน > สมุดรายวันต่างๆ
- รายงาน > รายงานภาษี > ภาษีมูลค่าเพิ่ม > ภาษีซื้อ/ภาษีขาย

### Dark Mode
- รองรับธีม Dark/Light Mode
- บันทึกการตั้งค่าใน localStorage
- ไอคอนเปลี่ยนตามธีม (พระจันทร์/พระอาทิตย์)

### Responsive
- เมนูปรับตัวตามขนาดหน้าจอ
- รองรับการใช้งานบนอุปกรณ์มือถือ

## วิธีการใช้งาน

### สำหรับหน้า HTML ใหม่

เพิ่มโค้ดต่อไปนี้ในไฟล์ HTML:

```html
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ชื่อหน้า</title>

  <!-- เพิ่มฟอนต์และไอคอน -->
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Account Menu CSS -->
  <link rel="stylesheet" href="/css/account-menu.css">

  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Prompt', 'sans-serif'],
          }
        }
      }
    }
  </script>
</head>
<body class="bg-white dark:bg-gray-900 dark:text-white">

  <!-- Navbar และ Menu จะถูกแทรกที่นี่โดยอัตโนมัติ -->
  <div id="mainContent" class="container mx-auto px-4 py-6">
    <!-- Navbar Template -->
    <div class="navbar bg-white dark:bg-gray-800 shadow-md sticky top-0">
      <div class="flex-1 flex items-center space-x-6">
        <img src="/uploads/Logo2.png" alt="Logo" class="rounded-full shadow-lg" style="width: 40px; height: 40px;">
        <span class="text-lg font-semibold" id="pageTitle">ระบบบัญชี</span>
        <div id="mainMenuContainer" class="ml-auto"></div>
      </div>
      <div class="flex-none flex items-center space-x-2">
        <div class="flex items-center space-x-3 mr-4">
          <img id="employeePhoto" alt="Profile" class="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600" src="/img/default-avatar.svg">
          <span id="employeeName" class="text-sm font-medium text-gray-700 dark:text-gray-300">Loading...</span>
        </div>
        <button id="btnToggleDark" class="btn btn-rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
          <i id="themeIcon" class="bi bi-moon-stars-fill mr-2 text-gray-700 dark:text-yellow-300"></i>
          <span id="darkModeLabel">Dark Mode</span>
        </button>
        <button id="btnLogout" class="btn btn-outline btn-primary btn-sm btn-rounded btn-fancy">
          <i class="bi bi-box-arrow-right mr-1"></i> ออกจากระบบ
        </button>
      </div>
    </div>

    <!-- เนื้อหาของหน้า -->
    <div class="content-area">
      <!-- ใส่เนื้อหาตรงนี้ -->
    </div>
  </div>

  <!-- Account Menu Script -->
  <script src="/js/account-menu.js"></script>
</body>
</html>
```

## การอัพเดทไฟล์เดิม

หากต้องการอัพเดทไฟล์ HTML ใหม่อีกครั้ง:

```bash
node update-account-menu.js
```

## ผลลัพธ์

✅ **91 ไฟล์** ถูกอัพเดทสำเร็จ
⏭️ **7 ไฟล์** ถูกข้าม (อัพเดทไปแล้ว)
❌ **0 ไฟล์** มีข้อผิดพลาด

## ไฟล์ที่ถูกอัพเดท

ไฟล์ HTML ทั้งหมดในโฟลเดอร์ `/views/account` ได้รับการอัพเดทให้ใช้:
- ✅ CSS แยกไฟล์ (`/css/account-menu.css`)
- ✅ JavaScript แยกไฟล์ (`/js/account-menu.js`)
- ✅ Navbar template ที่เป็นมาตรฐาน
- ✅ ลบเมนู template เก่าออก
- ✅ ลบ CSS ที่ซ้ำซ้อนออก

## ข้อดีของการแยกไฟล์

1. **ง่ายต่อการบำรุงรักษา**: แก้ไขเมนูที่เดียว ทุกหน้าอัพเดทพร้อมกัน
2. **ลดขนาดไฟล์**: ไม่ต้องซ้ำโค้ดเมนูในทุกไฟล์
3. **Cache ได้ดีกว่า**: Browser สามารถ cache CSS และ JS ได้
4. **แก้ไขง่าย**: แยกความรับผิดชอบชัดเจน (Separation of Concerns)
5. **สม่ำเสมอ**: เมนูทุกหน้าเหมือนกัน ไม่มีความแตกต่าง

## การแก้ไขเมนู

หากต้องการเพิ่ม/ลด/แก้ไขรายการเมนู:

1. แก้ไขใน `/public/js/account-menu.js` ที่ตัวแปร `MENU_HTML`
2. Refresh หน้าเว็บ - เมนูจะอัพเดททุกหน้าทันที

## หมายเหตุ

- ไฟล์ `menuuu.html`, `test-menu.html`, `menu-inline.html` ถูกข้ามไม่อัพเดท (เป็นไฟล์ทดสอบ)
- Dark mode ใช้ Tailwind CSS class `dark:`
- เมนูใช้ Bootstrap Icons สำหรับไอคอน

## การทดสอบ

1. เปิดหน้าใดก็ได้ใน `/views/account`
2. ตรวจสอบว่าเมนูแสดงผลถูกต้อง
3. ทดสอบ Dark Mode toggle
4. ทดสอบ Dropdown menu (hover เพื่อเปิด submenu)
5. ทดสอบการ Logout

---

**สร้างเมื่อ**: 2025-10-24
**อัพเดทล่าสุด**: 2025-10-24
