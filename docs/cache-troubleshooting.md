# Cache Troubleshooting Guide

## ปัญหา Browser Cache

### อาการ:
- ยังเห็น error `/api/tax-invoices` แม้ว่าโค้ดได้แก้ไขเป็น `/api/tax-invoice` แล้ว
- JavaScript ไม่อัปเดตตามการแก้ไข
- ยังใช้ `Promise.all` แทน `Promise.allSettled`

### สาเหตุ:
Browser cache ยังเก็บไฟล์ JavaScript เวอร์ชันเก่าไว้

## วิธีแก้ไข

### 1. Hard Refresh (แนะนำ)
```
Windows/Linux: Ctrl + F5 หรือ Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### 2. Clear Browser Cache
```
Chrome: F12 → Network tab → ✓ Disable cache
Firefox: F12 → Network tab → ⚙️ Settings → ✓ Disable cache
```

### 3. Private/Incognito Mode
เปิดหน้าเว็บในโหมด Private/Incognito

### 4. Developer Tools Method
```
1. เปิด F12 (Developer Tools)
2. ไปที่ Application/Storage tab
3. ลบ Cache Storage และ Local Storage
4. Refresh หน้าเว็บ
```

## การป้องกัน Cache ในอนาคต

### 1. Version Parameter (ใช้แล้ว)
```html
<script src="/account/js/purchase-tax-invoice.js?v=1.1"></script>
```

### 2. Cache-Control Headers (ใช้แล้ว)
```javascript
headers: {
  'Cache-Control': 'no-cache'
}
```

### 3. Timestamp Parameter
```javascript
const timestamp = Date.now();
const url = `/api/data?t=${timestamp}`;
```

### 4. Service Worker Update
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.update());
  });
}
```

## การตรวจสอบว่าไฟล์อัปเดตแล้ว

### 1. Console Log
ดูใน Browser Console ว่ามี log messages ใหม่หรือไม่:
```
🔄 Fetching Purchase Orders from /api/purchase_order
✅ Successfully fetched Assets (3 items)
❌ Failed to fetch Purchase Orders from /api/purchase_order: 404
```

### 2. Network Tab
ตรวจสอบใน F12 → Network tab ว่า:
- JavaScript file โหลดใหม่หรือไม่
- API calls ไปที่ endpoint ที่ถูกต้องหรือไม่

### 3. Sources Tab
ดูใน F12 → Sources tab ว่าโค้ดในไฟล์ตรงกับที่แก้ไขหรือไม่

## Debug Commands

### ตรวจสอบ API Endpoints
```javascript
// ใน Browser Console
console.log('Current endpoints being used:');
console.log('Purchase Orders:', '/api/purchase_order');
console.log('Assets:', '/api/assets');
console.log('Expense Records:', '/api/expense-records');
console.log('Tax Invoices:', '/api/tax-invoice');
```

### ทดสอบ API Manual
```javascript
// ทดสอบแต่ละ endpoint
fetch('/api/purchase_order', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('authToken'),
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(d => console.log('PO Result:', d))
.catch(e => console.error('PO Error:', e));
```

### Force Reload JavaScript
```javascript
// ใน Browser Console
location.reload(true); // Force reload
```

## การตั้งค่า Development Environment

### 1. Disable Cache ใน Development
```javascript
if (window.location.hostname === 'localhost') {
  // Add no-cache headers for all requests
  const originalFetch = window.fetch;
  window.fetch = function(url, options = {}) {
    options.headers = {
      ...options.headers,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
    return originalFetch(url, options);
  };
}
```

### 2. Auto-reload on File Changes
```javascript
// Simple auto-reload for development
if (window.location.hostname === 'localhost') {
  setInterval(() => {
    fetch(window.location.href, { method: 'HEAD' })
      .then(response => {
        if (response.headers.get('last-modified') !== lastModified) {
          location.reload();
        }
      });
  }, 5000);
}
```

## สรุป

หลังจากแก้ไขโค้ดแล้ว:
1. ✅ Hard refresh (Ctrl+F5)
2. ✅ ตรวจสอบ Console logs
3. ✅ ตรวจสอบ Network requests
4. ✅ ทดสอบฟังก์ชันการทำงาน

หากยังมีปัญหา:
- ลองใช้ Incognito mode
- Clear browser data ทั้งหมด
- ตรวจสอบ Service Workers
- ตรวจสอบ Proxy/CDN settings
