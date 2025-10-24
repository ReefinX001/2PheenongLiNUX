# 🔔 ระบบแจ้งเตือนมาตรฐาน (Notification System)

ระบบแจ้งเตือนที่ใช้เป็นมาตรฐานเดียวกันทั่วทั้งระบบ รองรับทั้ง Toast notifications และ Dropdown notifications พร้อม Socket.IO real-time integration

## 📁 ไฟล์ที่เกี่ยวข้อง

- **CSS**: `/public/css/notification-system.css`
- **JavaScript**: `/public/js/notification-system.js`

## 🚀 การติดตั้งใช้งาน

### 1. เพิ่ม CSS และ JavaScript ใน HTML head

```html
<!-- Notification System CSS -->
<link rel="stylesheet" href="/css/notification-system.css" />

<!-- Notification System JavaScript -->
<script src="/js/notification-system.js"></script>
```

### 2. เพิ่ม HTML Structure สำหรับ Notification Dropdown

```html
<!-- Notifications ใน header หรือ navbar -->
<div class="relative" id="notificationWrapper">
  <button id="notificationButton" class="notification-button">
    <i class="bi bi-bell-fill text-lg"></i>
  </button>
  <span id="notificationDot" class="notification-dot hidden"></span>
  <span id="notificationBadge" class="notification-badge hidden">0</span>
  
  <!-- Notification Dropdown -->
  <div id="notificationDropdown" class="notification-dropdown hidden">
    <div class="notification-dropdown-header">
      <h3 class="notification-dropdown-title">การแจ้งเตือน</h3>
      <button class="mark-all-read text-sm text-blue-600 dark:text-blue-400 hover:underline">อ่านทั้งหมดแล้ว</button>
    </div>
    <div class="notification-dropdown-content">
      <div class="notification-loading">
        <div class="notification-loading-spinner"></div>
        กำลังโหลด...
      </div>
    </div>
    <div class="notification-dropdown-footer">
      <a href="#" class="text-sm">ดูการแจ้งเตือนทั้งหมด</a>
    </div>
  </div>
</div>
```

## 📖 การใช้งาน

### Toast Notifications

```javascript
// แสดง toast notification พื้นฐาน
showToast('ข้อความแจ้งเตือน', 'success'); // success, error, warning, info

// แสดง toast พร้อมระบุเวลา
showToast('บันทึกข้อมูลสำเร็จ', 'success', 5000); // 5 วินาที

// แสดง toast ที่ไม่สามารถปิดได้
showToast('กำลังประมวลผล...', 'info', 0, false);
```

### การจัดการ Notification Dropdown

```javascript
// เข้าถึง NotificationSystem instance
const notificationSystem = NotificationSystem.instance;

// เพิ่ม notification ใหม่
notificationSystem.addNotification({
  id: Date.now(),
  title: 'หัวข้อแจ้งเตือน',
  message: 'รายละเอียดข้อความ',
  type: 'success',
  timestamp: new Date().toISOString(),
  read: false
});

// ทำเครื่องหมายว่าอ่านแล้ว
notificationSystem.markAsRead('notification_id');

// ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว
notificationSystem.markAllAsRead();

// ล้าง notifications ทั้งหมด
notificationSystem.clearAllNotifications();
```

### Socket.IO Integration

ระบบจะเชื่อมต่อ Socket.IO อัตโนมัติและฟัง events ต่อไปนี้:

```javascript
// Events ที่ระบบฟัง
socket.on('notification', (data) => {
  // แจ้งเตือนทั่วไป
});

socket.on('broadcast_notification', (data) => {
  // ประกาศทั่วไป
});

socket.on('system_notification', (data) => {
  // แจ้งเตือนระบบ
});

socket.on('forceLogout', (data) => {
  // บังคับออกจากระบบ
});
```

## 🎨 ประเภท Toast Notifications

| ประเภท | คลาส CSS | ไอคอน | สี |
|--------|----------|--------|-----|
| `success` | `toast-success` | `bi-check-circle-fill` | เขียว |
| `error` | `toast-error` | `bi-x-circle-fill` | แดง |
| `warning` | `toast-warning` | `bi-exclamation-triangle-fill` | เหลือง |
| `info` | `toast-info` | `bi-info-circle-fill` | น้ำเงิน |

## 🔧 การปรับแต่ง

### CSS Variables

สามารถปรับแต่งสีและขนาดได้ที่ไฟล์ CSS:

```css
/* ปรับแต่งสีพื้นฐาน */
.toast-success {
  background-color: rgba(34, 197, 94, 0.95);
  border-color: #16a34a;
}

/* ปรับแต่งขนาด notification badge */
.notification-badge {
  min-width: 16px;
  font-size: 10px;
}
```

### Dark Mode Support

ระบบรองรับ dark mode อัตโนมัติผ่าน CSS class `.dark`:

```css
.dark .toast {
  backdrop-filter: blur(15px);
}

.dark .notification-dropdown {
  background-color: #1f2937;
  border: 1px solid #374151;
}
```

## 📱 Responsive Design

ระบบปรับขนาดอัตโนมัติสำหรับอุปกรณ์ต่างๆ:

- **Desktop**: แสดงเต็มขนาด
- **Tablet**: ลดขนาด dropdown
- **Mobile**: ขยายเต็มความกว้าง

## 🔄 Local Storage

ระบบจัดเก็บ notifications ใน localStorage:

- `notifications`: รายการ notifications (สูงสุด 50 รายการ)
- `notificationUnreadCount`: จำนวนที่ยังไม่ได้อ่าน

## ⚡ Performance

- **Debouncing**: ป้องกันการเรียก API บ่อยเกินไป
- **Caching**: เก็บ notifications ใน memory
- **Lazy Loading**: โหลด dropdown เมื่อจำเป็น
- **Auto Cleanup**: ลบ toast เก่าอัตโนมัติ

## 🧪 การทดสอบ

### วิธีที่ 1: ใช้ฟังก์ชันทดสอบแบบง่าย (แนะนำ)

```javascript
// ทดสอบทั้งระบบ (สร้าง 4 แจ้งเตือนตัวอย่าง)
testNotifications();

// เพิ่มแจ้งเตือนทีละรายการ
addTestNotification('success');  // สำเร็จ
addTestNotification('error');    // ข้อผิดพลาด
addTestNotification('warning');  // แจ้งเตือน
addTestNotification('info');     // ข้อมูล
```

### วิธีที่ 2: ทดสอบ Toast

```javascript
// ทดสอบ toast แต่ละประเภท
showToast('สำเร็จ!', 'success');
showToast('เกิดข้อผิดพลาด!', 'error');
showToast('คำเตือน!', 'warning');
showToast('ข้อมูล', 'info');
```

### วิธีที่ 3: ทดสอบ Notification System แบบละเอียด

```javascript
// ทดสอบการเพิ่ม notification
NotificationSystem.instance.addNotification({
  id: 'test_' + Date.now(),
  title: 'ทดสอบระบบ',
  message: 'ข้อความทดสอบ',
  type: 'info',
  timestamp: new Date().toISOString(),
  read: false
});
```

### วิธีการทดสอบผ่าน Browser Console

1. เปิด Chrome DevTools (กด **F12**)
2. ไปที่แท็บ **Console**
3. พิมพ์คำสั่ง: `testNotifications()`
4. กด **Enter**
5. คลิกที่ไอคอน 🔔 เพื่อดู notifications

### ผลลัพธ์ที่ควรได้รับ

✅ **Toast Notifications**: แสดงทางด้านขวาบน  
✅ **Notification Badge**: แสดงจำนวนข้อความใหม่  
✅ **Dropdown Notifications**: สามารถคลิกอ่านได้  
✅ **Mark as Read**: คลิกแล้วหายไปจาก unread

## 🐛 การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

1. **ข้อผิดพลาด "Cannot read properties of null (reading 'appendChild')"**
   
   **สาเหตุ**: เกิดจาก `document.body` ยังไม่พร้อมเมื่อสร้าง NotificationSystem
   
   **✅ ระบบใหม่แก้ไขปัญหานี้อัตโนมัติด้วย:**
   - Auto-retry mechanism ทุก 100ms จนกว่า document.body พร้อม
   - Enhanced DOM readiness detection
   - Automatic instance recovery เมื่อ showToast() ถูกเรียก
   
   ```javascript
   // ตรวจสอบว่า document.body พร้อมหรือไม่
   console.log('Document body exists:', !!document.body);
   console.log('Document ready state:', document.readyState);
   
   // ระบบใหม่จะแก้ไขอัตโนมัติ แต่หากต้องการแก้ไขด้วยตนเอง:
   if (document.body) {
     window.createNotificationInstance();
   } else {
     console.log('Waiting for document.body to be ready...');
     // ระบบจะลองสร้าง instance ใหม่อัตโนมัติ
   }
   ```

2. **Toast ไม่แสดง**
   
   **✅ ระบบมี Auto-recovery mechanisms:**
   - หาก `showToast()` ถูกเรียกแต่ instance ไม่พร้อม ระบบจะสร้าง instance ใหม่อัตโนมัติ
   - Toast จะแสดงใน console หาก UI ไม่พร้อม
   - Automatic retry เมื่อ DOM พร้อม
   
   ```javascript
   // ตรวจสอบสถานะระบบ
   console.log('NotificationSystem class:', !!window.NotificationSystem);
   console.log('Instance exists:', !!NotificationSystem.instance);
   console.log('Toast container exists:', !!document.getElementById('toastContainer'));
   
   // ระบบจะพยายามแก้ไขอัตโนมัติ แต่หากต้องการแก้ไขด้วยตนเอง:
   if (!NotificationSystem.instance) {
     console.log('Creating new instance...');
     window.createNotificationInstance();
   }
   
   // ทดสอบ auto-recovery
   showToast('Test auto-recovery', 'info');
   ```

3. **Instance ไม่ถูกสร้าง**
   ```javascript
   // วิธีการแก้ไขแบบ manual
   if (!NotificationSystem.instance && document.body) {
     window.createNotificationInstance();
   }
   
   // หรือรอให้ระบบสร้างเอง
   setTimeout(() => {
     if (!NotificationSystem.instance) {
       window.createNotificationInstance();
     }
   }, 1000);
   ```

4. **Dropdown ไม่ทำงาน**
   ```javascript
   // ตรวจสอบว่ามี HTML elements หรือไม่
   console.log(document.getElementById('notificationButton'));
   console.log(document.getElementById('notificationDropdown'));
   ```

5. **Socket.IO ไม่เชื่อมต่อ**
   ```javascript
   // ตรวจสอบสถานะ Socket.IO
   console.log(NotificationSystem.instance?.socket?.connected);
   ```

### Enhanced Debug Commands

```javascript
// ตรวจสอบสถานะระบบทั้งหมด
console.log('=== Enhanced Debug Info ===');
console.log('Document ready state:', document.readyState);
console.log('Document body exists:', !!document.body);
console.log('NotificationSystem class:', !!window.NotificationSystem);
console.log('Instance exists:', !!NotificationSystem.instance);
console.log('Toast container exists:', !!document.getElementById('toastContainer'));
console.log('Notification dropdown exists:', !!document.getElementById('notificationDropdown'));

// รีเซ็ต instance (กรณีเสียหาย)
NotificationSystem.instance = null;
window.createNotificationInstance();

// ทดสอบ auto-recovery
showToast('Testing auto-recovery', 'success');

// ทดสอบ error handling
try {
  showToast('Error test', 'error');
} catch (e) {
  console.log('Error caught:', e.message);
}
```

### Debug Mode

เปิด console ใน browser เพื่อดู enhanced logs:

```
📄 Document ready state: interactive
✅ Document body is ready, creating instance immediately  
🔔 Creating NotificationSystem instance...
✅ Toast container created successfully
🔗 Notification system connected to Socket.IO
✅ Notification dropdown setup complete
✅ Notification System instance created successfully
🔔 Notification System loaded successfully
📖 Available functions: showToast(), hideNotificationDot(), showNotificationDot()
📖 Test functions: testNotifications(), addTestNotification(type)
📖 Available classes: NotificationSystem
📖 Global instance: NotificationSystem.instance
🔍 Document state: interactive
🔍 Document body exists: true
🔍 Current URL: /views/pattani/frontstore_pattani.html
```

### วิธีการแก้ไขปัญหาอย่างเป็นระบบ

1. **ตรวจสอบพื้นฐาน**
   ```javascript
   // ตรวจสอบสถานะระบบ
   console.log('=== Notification System Debug ===');
   console.log('Document ready:', document.readyState);
   console.log('Body exists:', !!document.body);
   console.log('NotificationSystem class:', !!window.NotificationSystem);
   console.log('Instance exists:', !!NotificationSystem.instance);
   ```

2. **ลองแก้ไขปัญหา**
   ```javascript
   // ถ้า instance ไม่มี ลองสร้างใหม่
   if (!NotificationSystem.instance) {
     console.log('Creating new instance...');
     window.createNotificationInstance();
   }
   
   // ทดสอบ toast
   if (NotificationSystem.instance) {
     showToast('Test successful!', 'success');
   } else {
     console.error('Instance still not created');
   }
   ```

3. **แก้ไขปัญหาถาวร**
   ```javascript
   // เพิ่มในส่วนท้ายของ script ในหน้า HTML
   document.addEventListener('DOMContentLoaded', () => {
     // ให้แน่ใจว่า notification system พร้อม
     setTimeout(() => {
       if (!NotificationSystem.instance) {
         console.warn('Auto-creating NotificationSystem instance...');
         window.createNotificationInstance();
       }
     }, 500);
   });
   ```

## 🔗 Integration Examples

### ตัวอย่างการใช้กับ POS System

```javascript
// เมื่อเพิ่มสินค้าสำเร็จ
function addToCart(item) {
  // ... logic การเพิ่มสินค้า
  showToast(`✅ เพิ่ม ${item.name} ลงในตะกร้าแล้ว`, 'success');
}

// เมื่อชำระเงินสำเร็จ
function checkout() {
  // ... logic การชำระเงิน
  showToast('💰 ชำระเงินสำเร็จ!', 'success', 5000);
  
  // เพิ่ม notification ลงใน dropdown
  NotificationSystem.instance.addNotification({
    id: 'checkout_' + Date.now(),
    title: '💰 ชำระเงินสำเร็จ',
    message: `ใบเสร็จเลขที่ ${invoiceNo}`,
    type: 'success',
    timestamp: new Date().toISOString(),
    read: false
  });
}
```

## 📋 Checklist การใช้งาน

- [ ] เพิ่ม CSS file ใน HTML head
- [ ] เพิ่ม JavaScript file ใน HTML head  
- [ ] เพิ่ม HTML structure สำหรับ notification dropdown
- [ ] ทดสอบการแสดง toast notifications
- [ ] ทดสอบการทำงานของ dropdown
- [ ] ตรวจสอบการเชื่อมต่อ Socket.IO
- [ ] ทดสอบ responsive design บนอุปกรณ์ต่างๆ
- [ ] ทดสอบ dark mode support

---

**หมายเหตุ**: ระบบนี้ใช้ Bootstrap Icons สำหรับไอคอน หากไม่มีให้เพิ่ม:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
``` 