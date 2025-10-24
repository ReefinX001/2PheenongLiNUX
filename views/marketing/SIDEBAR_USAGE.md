# 📋 วิธีใช้งาน Marketing Sidebar

## ภาพรวม
Marketing Module มี sidebar แบบมาตรฐานที่ใช้ร่วมกันในทุกหน้า เพื่อความสอดคล้องและง่ายต่อการบำรุงรักษา

## ไฟล์ Sidebar ที่มีอยู่

### 📁 `includes/sidebar.html`
- HTML structure ของ sidebar
- รวมเมนูทั้งหมดของ Marketing module
- มี Dark Mode toggle และ Logout
- User profile display

### 📁 `js/sidebar.js`
- JavaScript สำหรับจัดการ sidebar functionality
- จัดการ active menu items
- จัดการ dark mode toggle
- จัดการ logout functionality

### 📁 `js/user-profile.js`
- จัดการการโหลดและแสดงข้อมูล user profile

## เมนูที่มีใน Sidebar

✅ **เมนูที่มีอยู่:**
- 🏠 **แดชบอร์ด** (`marketing_dashboard`)
- 📢 **แคมเปญ** (`campaigns`)
- 📊 **วิเคราะห์ข้อมูล** (`analytics`)
- 📝 **จัดการเนื้อหา** (`content_management`)
- 📱 **สื่อสังคม** (`social_media`)
- 🎁 **Popup โปรโมชั่น** (`popup_management`) ← **ใหม่!**
- 👥 **ข้อมูลลูกค้า** (`customer_data`)
- 💰 **งบประมาณและรายงาน** (`budget_reports`)
- ⚙️ **การตั้งค่า** (`marketing_settings`)

## วิธีใช้งานใน HTML File

### 1. เพิ่ม Scripts ใน `<head>`
```html
<!-- Sidebar Scripts -->
<script src="js/user-profile.js"></script>
<script src="js/sidebar.js"></script>
```

### 2. เปลี่ยน Body Structure
```html
<body class="bg-gray-50 dark:bg-gray-900">
    <div class="min-h-screen flex">
        
        <!-- Sidebar Container -->
        <div id="sidebar-container">
            <!-- Sidebar content will be loaded here -->
        </div>
        
        <!-- Main Content -->
        <main class="flex-1 pt-16">
            <!-- Your page content here -->
        </main>
        
    </div>
</body>
```

### 3. เพิ่ม JavaScript Initialization
```javascript
document.addEventListener('DOMContentLoaded', function() {
    // Load sidebar first
    loadSidebar().then(() => {
        // Your page initialization code here
        initializePage();
    }).catch(error => {
        console.error('Error loading sidebar:', error);
        // Continue with page initialization even if sidebar fails
        initializePage();
    });
});
```

## ตัวอย่างการใช้งานแบบเต็ม

```html
<!DOCTYPE html>
<html lang="th" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Page Title - Marketing Dashboard</title>
    
    <!-- Favicon -->
    <link rel="icon" href="/favicon/favicon.ico" type="image/x-icon" />
    
    <!-- Tailwind + DaisyUI -->
    <link href="https://cdn.jsdelivr.net/npm/daisyui@4.4.19/dist/full.min.css" rel="stylesheet" type="text/css" />
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css">
    
    <!-- Sidebar Scripts -->
    <script src="js/user-profile.js"></script>
    <script src="js/sidebar.js"></script>
</head>

<body class="bg-gray-50 dark:bg-gray-900">
    <div class="min-h-screen flex">
        
        <!-- Sidebar Container -->
        <div id="sidebar-container">
            <!-- Sidebar content will be loaded here -->
        </div>
        
        <!-- Main Content -->
        <main class="flex-1 p-6">
            <h1 class="text-2xl font-bold mb-6">Your Page Title</h1>
            
            <!-- Your content here -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p>Your page content goes here...</p>
            </div>
        </main>
        
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Load sidebar first
            loadSidebar().then(() => {
                console.log('Sidebar loaded successfully');
                // Your page initialization code here
            }).catch(error => {
                console.error('Error loading sidebar:', error);
            });
        });
    </script>
</body>
</html>
```

## การปรับแต่ง Active Menu

Sidebar จะ auto-detect หน้าปัจจุบันและ highlight menu ที่ถูกต้องโดยอัตโนมัติ โดยใช้:

1. **URL pathname matching**
2. **data-page attributes** ใน menu links

### ตัวอย่าง:
- หน้า `/popup_management` → เมนู `data-page="popup_management"` จะถูก highlight
- หน้า `/campaigns` → เมนู `data-page="campaigns"` จะถูก highlight

## ฟีเจอร์ของ Sidebar

### 🌙 **Dark Mode Toggle**
- บันทึกสถานะใน localStorage
- เปลี่ยนไอคอนและข้อความอัตโนมัติ
- รองรับ Tailwind dark mode classes

### 👤 **User Profile Display**
- โหลดข้อมูล user จาก API `/api/users/me`
- แสดงรูปโปรไฟล์และชื่อ
- Fallback เป็น avatar placeholder

### 🚪 **Logout Functionality**
- ยืนยันก่อน logout
- ล้างข้อมูล authentication ทั้งหมด
- Redirect ไป `/login`

### 📱 **Responsive Design**
- รองรับ mobile และ desktop
- Collapsible sidebar สำหรับหน้าจอเล็ก

## การแก้ไขปัญหา

### ❌ **Sidebar ไม่แสดง**
1. ตรวจสอบ path ของ `includes/sidebar.html`
2. ตรวจสอบ console errors
3. ตรวจสอบ `sidebar-container` element มีอยู่หรือไม่

### ❌ **Menu ไม่ highlight ถูกต้อง**
1. ตรวจสอบ `data-page` attributes ใน sidebar.html
2. ตรวจสอบ URL pathname matching logic
3. เพิ่ม console.log ใน `getCurrentPageName()` function

### ❌ **User profile ไม่แสดง**
1. ตรวจสอบ `js/user-profile.js` โหลดก่อน sidebar
2. ตรวจสอบ API endpoint `/api/users/me` ทำงานได้
3. ตรวจสอบ authentication token ใน localStorage

### ❌ **Dark mode ไม่ทำงาน**
1. ตรวจสอบ Tailwind CSS dark mode configuration
2. ตรวจสอบ localStorage สำหรับ `darkMode` key
3. ตรวจสอบ `document.documentElement.classList`

## ไฟล์ที่ใช้ Sidebar แล้ว

✅ **อัปเดตแล้ว:**
- `popup_management.html` ← **ใหม่!**
- `marketing_dashboard.html`
- `campaigns.html`
- `Promotion.html`

⏳ **ยังต้องอัปเดต:**
- `analytics.html`
- `content_management.html`
- `social_media.html`
- `email_marketing.html`
- `seo_tools.html`
- `customer_data.html`
- `budget_reports.html`
- `marketing_settings.html`
- `Products_marketing.html`
- `Customers_marketing.html`

## การพัฒนาต่อ

### 🚀 **ฟีเจอร์ที่สามารถเพิ่ม:**
1. **Notification badges** ใน menu items
2. **Search functionality** ใน sidebar
3. **Breadcrumb navigation**
4. **User permissions-based** menu visibility
5. **Keyboard shortcuts** สำหรับ navigation
6. **Recent pages** history
7. **Favorites/Bookmarks** menu items

### 📱 **Mobile Enhancements:**
- Swipe gestures
- Touch-friendly menu
- Overlay mode สำหรับ mobile

---

## 📞 Support

หากมีปัญหาหรือต้องการความช่วยเหลือเกี่ยวกับ sidebar กรุณาติดต่อทีมพัฒนา

**Happy Coding! 🎉**
