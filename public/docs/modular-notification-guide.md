# 📢 คู่มือระบบแจ้งเตือนแบบโมดูลาร์

## 🎯 ภาพรวม

ระบบแจ้งเตือนแบบโมดูลาร์ที่แยกตามระบบงานต่างๆ

### โมดูลที่รองรับ:
- 💼 **Accounting** - งานบัญชี
- 👥 **HR** - ฝ่ายบุคคล  
- 📦 **Stock** - คลังสินค้า
- 📢 **Marketing** - การตลาด
- 💳 **Loan** - สินเชื่อ
- 🏪 **POS** - ขายหน้าร้าน
- 🎁 **Gifts** - ของแถม
- 🔍 **Audit** - ตรวจสอบ

## 🚀 การติดตั้ง

### 1. เพิ่มไฟล์ CSS และ JS

```html
<!-- CSS -->
<link rel="stylesheet" href="/css/notification-modules.css">

<!-- JavaScript -->
<script src="/js/notification-modules.js"></script>
```

### 2. เพิ่มโครงสร้าง HTML

```html
<div class="relative" id="notificationWrapper">
  <button id="notificationButton" class="notification-button">
    <i class="bi bi-bell-fill text-lg"></i>
  </button>
  <span id="notificationDot" class="notification-dot hidden"></span>
  <span id="notificationBadge" class="notification-badge hidden">0</span>
  
  <div id="notificationDropdown" class="notification-dropdown hidden">
    <div class="notification-dropdown-header">
      <h3 class="notification-dropdown-title">การแจ้งเตือน</h3>
      <button class="mark-all-read">อ่านทั้งหมดแล้ว</button>
    </div>
    <div class="notification-dropdown-content"></div>
    <div class="notification-dropdown-footer">
      <a href="#">ดูการแจ้งเตือนทั้งหมด</a>
    </div>
  </div>
</div>
```

## 📖 การใช้งาน

### การแสดง Toast

```javascript
// แสดง Toast แบบง่าย
showModuleToast('บันทึกข้อมูลสำเร็จ', 'success');

// แสดง Toast พร้อมตัวเลือก
showModuleToast('เกิดข้อผิดพลาด', 'error', {
  duration: 5000,
  module: 'accounting'
});
```

### การเพิ่มการแจ้งเตือน

```javascript
addModuleNotification({
  title: 'มีคำสั่งซื้อใหม่',
  message: 'คำสั่งซื้อ #12345 รอการดำเนินการ',
  type: 'info'
});
```

### การจัดการโมดูล

```javascript
// เปลี่ยนโมดูลปัจจุบัน
window.moduleNotificationSystem.setCurrentModule('hr');

// ทดสอบระบบ
window.moduleNotificationSystem.test();
```

## 🎨 สไตล์แต่ละโมดูล

| โมดูล | สี | ไอคอน | CSS Class |
|-------|-----|--------|-----------|
| Accounting | 🔵 `#3b82f6` | `bi-journal-text` | `.toast-accounting` |
| HR | 🟢 `#10b981` | `bi-people-fill` | `.toast-hr` |
| Stock | 🟡 `#f59e0b` | `bi-box-fill` | `.toast-stock` |
| Marketing | 🟣 `#8b5cf6` | `bi-megaphone-fill` | `.toast-marketing` |
| Loan | 🔴 `#ef4444` | `bi-credit-card-fill` | `.toast-loan` |
| POS | 🐝 `#06b6d4` | `bi-shop-window` | `.toast-pos` |
| Gifts | 🩷 `#ec4899` | `bi-gift-fill` | `.toast-gifts` |
| Audit | ⚫ `#64748b` | `bi-shield-check` | `.toast-audit` |

## 🧪 การทดสอบ

```javascript
// ทดสอบโมดูลปัจจุบัน
window.moduleNotificationSystem.test();

// ทดสอบแบบ manual
showModuleToast('ทดสอบ Success', 'success');
showModuleToast('ทดสอบ Warning', 'warning');
showModuleToast('ทดสอบ Error', 'error');
```

## 🔧 API Reference

### Methods:
- `showToast(message, options)` - แสดง Toast
- `addNotification(notification)` - เพิ่มการแจ้งเตือน
- `setCurrentModule(module)` - เปลี่ยนโมดูล
- `test()` - ทดสอบระบบ

### Global Functions:
- `showModuleToast(message, type, options)`
- `addModuleNotification(notification)`

## 📱 Responsive & Dark Mode

ระบบรองรับ Responsive Design และ Dark Mode อัตโนมัติ

```css
@media (max-width: 640px) {
  .toast-container {
    top: 10px;
    right: 10px;
    left: 10px;
  }
}

.dark .notification-toast {
  background: #374151;
  color: #f9fafb;
}
```

## 🌐 Socket.IO Integration

```javascript
socket.on('module_notification', (data) => {
  showModuleToast(data.message, data.type, {
    module: data.module
  });
});
```

## ⚡ ตัวอย่างการใช้งาน

### หน้า Accounting:
```javascript
window.moduleNotificationSystem.setCurrentModule('accounting');
showModuleToast('บันทึกรายการบัญชีสำเร็จ', 'success');
```

### หน้า Stock:
```javascript
window.moduleNotificationSystem.setCurrentModule('stock');
showModuleToast('สินค้าใกล้หมด', 'warning');
```

### หน้า POS:
```javascript
window.moduleNotificationSystem.setCurrentModule('pos');
showModuleToast('ขายสำเร็จ ฿1,500', 'success');
```

## 🛠️ Troubleshooting

1. **Toast ไม่แสดง:** ตรวจสอบ container และ CSS
2. **Dropdown ไม่ทำงาน:** ตรวจสอบ event listeners
3. **การแจ้งเตือนไม่บันทึก:** ตรวจสอบ localStorage

**🎉 ระบบแจ้งเตือนแบบโมดูลาร์พร้อมใช้งาน!** 