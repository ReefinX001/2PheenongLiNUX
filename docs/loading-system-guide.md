# LoadingSystem Guide 🔄

**ระบบแสดงสถานะการโหลดมาตรฐาน สำหรับ 2 พี่น้อง โมบาย**

Version: 2.0.0  
Author: 2 พี่น้อง โมบาย

---

## 📋 สารบัญ

1. [การติดตั้ง](#การติดตั้ง)
2. [การใช้งานพื้นฐาน](#การใช้งานพื้นฐาน)
3. [API Reference](#api-reference)
4. [ตัวเลือกการกำหนดค่า](#ตัวเลือกการกำหนดค่า)
5. [Theme Variants](#theme-variants)
6. [ตัวอย่างการใช้งาน](#ตัวอย่างการใช้งาน)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 การติดตั้ง

### วิธีที่ 1: ใช้ไฟล์ในโปรเจค

1. **เพิ่มไฟล์ CSS ใน `<head>`:**
```html
<link rel="stylesheet" href="/css/loading-system.css">
```

2. **เพิ่มไฟล์ JS ก่อน `</body>`:**
```html
<script src="/js/loading-system.js"></script>
```

### วิธีที่ 2: CDN (หากมี)

```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdn.example.com/loading-system/2.0.0/loading-system.css">

<!-- JavaScript -->
<script src="https://cdn.example.com/loading-system/2.0.0/loading-system.js"></script>
```

### โครงสร้างไฟล์
```
project/
├── css/
│   └── loading-system.css
├── js/
│   └── loading-system.js
├── examples/
│   └── loading-system-demo.html
└── docs/
    └── loading-system-guide.md
```

---

## 🎯 การใช้งานพื้นฐาน

### แสดง Loading

```javascript
// แสดง loading พื้นฐาน
const loaderId = LoadingSystem.show({
  message: 'กำลังโหลด...'
});

// ซ่อน loading
LoadingSystem.hide(loaderId);
```

### Loading พร้อม Progress Bar

```javascript
const loaderId = LoadingSystem.show({
  message: 'กำลังประมวลผล...',
  showProgress: true
});

// อัปเดต progress
LoadingSystem.updateProgress(loaderId, 50); // 50%
LoadingSystem.updateProgress(loaderId, 100); // 100%

// ซ่อน
LoadingSystem.hide(loaderId);
```

### Auto Progress

```javascript
const loaderId = LoadingSystem.show({
  message: 'กำลังอัปโหลด...',
  showProgress: true,
  autoProgress: true  // จะเพิ่ม progress อัตโนมัติ
});

// เสร็จสิ้นและซ่อน
LoadingSystem.completeProgress(loaderId);
```

---

## 📚 API Reference

### LoadingSystem.show(options)

แสดง loading overlay

**Parameters:**
- `options` (Object) - ตัวเลือกการแสดงผล

**Returns:**
- `string` - loaderId สำหรับการอ้างอิง

**Example:**
```javascript
const loaderId = LoadingSystem.show({
  message: 'กำลังโหลด...',
  showProgress: true,
  autoProgress: false,
  timeout: 5000,
  type: 'success'
});
```

### LoadingSystem.hide(loaderId)

ซ่อน loading overlay ตาม ID

**Parameters:**
- `loaderId` (string) - ID ของ loader ที่ต้องการซ่อน

**Example:**
```javascript
LoadingSystem.hide(loaderId);
```

### LoadingSystem.hideAll()

ซ่อน loading overlay ทั้งหมด

**Example:**
```javascript
LoadingSystem.hideAll();
```

### LoadingSystem.updateProgress(loaderId, progress)

อัปเดต progress bar

**Parameters:**
- `loaderId` (string) - ID ของ loader
- `progress` (number) - เปอร์เซ็นต์ความคืบหน้า (0-100)

**Example:**
```javascript
LoadingSystem.updateProgress(loaderId, 75);
```

### LoadingSystem.completeProgress(loaderId)

ทำ progress เต็มและซ่อน

**Parameters:**
- `loaderId` (string, optional) - ID ของ loader (ถ้าไม่ระบุจะทำทั้งหมด)

**Example:**
```javascript
LoadingSystem.completeProgress(loaderId);
```

### LoadingSystem.updateMessage(loaderId, message)

อัปเดตข้อความ loading

**Parameters:**
- `loaderId` (string) - ID ของ loader
- `message` (string) - ข้อความใหม่

**Example:**
```javascript
LoadingSystem.updateMessage(loaderId, 'กำลังส่งอีเมล...');
```

### LoadingSystem.isActive(loaderId)

ตรวจสอบสถานะ loader

**Parameters:**
- `loaderId` (string) - ID ของ loader

**Returns:**
- `boolean` - true ถ้ายังแสดงอยู่

**Example:**
```javascript
if (LoadingSystem.isActive(loaderId)) {
  console.log('Loading ยังทำงานอยู่');
}
```

### LoadingSystem.getActiveCount()

ดูจำนวน loader ที่แสดงอยู่

**Returns:**
- `number` - จำนวน active loaders

**Example:**
```javascript
const count = LoadingSystem.getActiveCount();
console.log(`มี loading ${count} ตัว`);
```

### LoadingSystem.debug()

ข้อมูล debug

**Returns:**
- `Object` - ข้อมูลสถานะระบบ

**Example:**
```javascript
const info = LoadingSystem.debug();
console.log(info);
// {
//   activeLoaders: 2,
//   loaderIds: ['loader-123', 'loader-456'],
//   containerExists: true,
//   version: '2.0.0'
// }
```

### LoadingSystem.cleanup()

ล้างข้อมูลทั้งหมด

**Example:**
```javascript
LoadingSystem.cleanup();
```

---

## ⚙️ ตัวเลือกการกำหนดค่า

### Options Object

```javascript
{
  message: 'กำลังโหลด...',     // ข้อความที่แสดง
  showProgress: false,        // แสดง progress bar
  autoProgress: false,        // เริ่ม auto progress
  timeout: 0,                 // ปิดอัตโนมัติ (ms, 0 = ไม่ปิด)
  type: 'default'             // theme type
}
```

### Message

ข้อความที่จะแสดงใน loading

```javascript
LoadingSystem.show({
  message: 'กำลังโหลดข้อมูลผู้ใช้...'
});
```

### Show Progress

แสดง progress bar

```javascript
LoadingSystem.show({
  message: 'กำลังอัปโหลด...',
  showProgress: true
});
```

### Auto Progress

progress bar จะเพิ่มขึ้นอัตโนมัติ

```javascript
LoadingSystem.show({
  message: 'กำลังประมวลผล...',
  showProgress: true,
  autoProgress: true
});
```

### Timeout

ปิดอัตโนมัติหลังจากเวลาที่กำหนด

```javascript
LoadingSystem.show({
  message: 'จะปิดใน 5 วินาที',
  timeout: 5000  // 5 วินาที
});
```

---

## 🎨 Theme Variants

### Default Theme

```javascript
LoadingSystem.show({
  message: 'กำลังโหลด...',
  type: 'default'  // หรือไม่ระบุ
});
```

### Success Theme

```javascript
LoadingSystem.show({
  message: 'บันทึกข้อมูลสำเร็จ!',
  type: 'success'
});
```

### Warning Theme

```javascript
LoadingSystem.show({
  message: 'กำลังตรวจสอบข้อมูล...',
  type: 'warning'
});
```

### Error Theme

```javascript
LoadingSystem.show({
  message: 'เกิดข้อผิดพลาด กำลังแก้ไข...',
  type: 'error'
});
```

---

## 💡 ตัวอย่างการใช้งาน

### 1. การบันทึกข้อมูล

```javascript
async function saveData(data) {
  const loaderId = LoadingSystem.show({
    message: 'กำลังบันทึกข้อมูล...',
    type: 'success',
    showProgress: true
  });
  
  try {
    // จำลองการบันทึก
    LoadingSystem.updateProgress(loaderId, 25);
    LoadingSystem.updateMessage(loaderId, 'กำลังตรวจสอบข้อมูล...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    LoadingSystem.updateProgress(loaderId, 50);
    LoadingSystem.updateMessage(loaderId, 'กำลังบันทึกลงฐานข้อมูล...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    LoadingSystem.updateProgress(loaderId, 100);
    LoadingSystem.updateMessage(loaderId, 'บันทึกสำเร็จ! ✅');
    
    setTimeout(() => {
      LoadingSystem.hide(loaderId);
    }, 1000);
    
  } catch (error) {
    LoadingSystem.updateMessage(loaderId, 'เกิดข้อผิดพลาด!');
    setTimeout(() => {
      LoadingSystem.hide(loaderId);
    }, 2000);
  }
}
```

### 2. การส่งอีเมล PDF

```javascript
async function sendEmailPDF(emailData) {
  const loaderId = LoadingSystem.show({
    message: 'กำลังสร้าง PDF...',
    showProgress: true
  });
  
  try {
    // Step 1: สร้าง PDF
    LoadingSystem.updateProgress(loaderId, 20);
    LoadingSystem.updateMessage(loaderId, 'กำลังสร้าง PDF...');
    
    // Step 2: เตรียมอีเมล
    LoadingSystem.updateProgress(loaderId, 40);
    LoadingSystem.updateMessage(loaderId, 'กำลังเตรียมข้อมูลอีเมล...');
    
    // Step 3: ส่งอีเมล
    LoadingSystem.updateProgress(loaderId, 60);
    LoadingSystem.updateMessage(loaderId, 'กำลังส่งอีเมล...');
    
    // Step 4: ตรวจสอบ
    LoadingSystem.updateProgress(loaderId, 80);
    LoadingSystem.updateMessage(loaderId, 'กำลังตรวจสอบการส่ง...');
    
    // เสร็จสิ้น
    LoadingSystem.updateProgress(loaderId, 100);
    LoadingSystem.updateMessage(loaderId, 'ส่งอีเมล PDF สำเร็จ! 📧');
    
    setTimeout(() => {
      LoadingSystem.hide(loaderId);
    }, 2000);
    
  } catch (error) {
    LoadingSystem.updateMessage(loaderId, 'ส่งอีเมลไม่สำเร็จ!');
    // เปลี่ยนเป็น error theme
    LoadingSystem.hide(loaderId);
    
    // แสดง error loading
    const errorId = LoadingSystem.show({
      message: 'เกิดข้อผิดพลาด: ' + error.message,
      type: 'error',
      timeout: 3000
    });
  }
}
```

### 3. การอัปโหลดไฟล์

```javascript
async function uploadFile(file) {
  const loaderId = LoadingSystem.show({
    message: 'กำลังเตรียมไฟล์...',
    showProgress: true
  });
  
  // จำลองการอัปโหลด
  const uploadSteps = [
    { progress: 10, message: 'กำลังบีบอัดไฟล์...' },
    { progress: 30, message: 'กำลังอัปโหลด... (30%)' },
    { progress: 60, message: 'กำลังอัปโหลด... (60%)' },
    { progress: 90, message: 'กำลังอัปโหลด... (90%)' },
    { progress: 100, message: 'อัปโหลดเสร็จสิ้น! 🎉' }
  ];
  
  for (const [index, step] of uploadSteps.entries()) {
    await new Promise(resolve => setTimeout(resolve, 800));
    LoadingSystem.updateProgress(loaderId, step.progress);
    LoadingSystem.updateMessage(loaderId, step.message);
  }
  
  setTimeout(() => {
    LoadingSystem.hide(loaderId);
  }, 1500);
}
```

### 4. การใช้งานในฟอร์ม

```javascript
// ใน frontstore_pattani.html
async function doCheckout() {
  const loaderId = LoadingSystem.show({
    message: 'กำลังประมวลผลการชำระเงิน...',
    showProgress: true
  });
  
  try {
    // ตรวจสอบข้อมูล
    LoadingSystem.updateProgress(loaderId, 25);
    LoadingSystem.updateMessage(loaderId, 'กำลังตรวจสอบข้อมูล...');
    
    // ส่งข้อมูลไปเซิร์ฟเวอร์
    LoadingSystem.updateProgress(loaderId, 50);
    LoadingSystem.updateMessage(loaderId, 'กำลังส่งข้อมูล...');
    
    const result = await fetch('/api/pos/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkoutData)
    });
    
    // ประมวลผลผลลัพธ์
    LoadingSystem.updateProgress(loaderId, 75);
    LoadingSystem.updateMessage(loaderId, 'กำลังประมวลผลผลลัพธ์...');
    
    const response = await result.json();
    
    if (response.success) {
      LoadingSystem.updateProgress(loaderId, 100);
      LoadingSystem.updateMessage(loaderId, 'ชำระเงินสำเร็จ! ✅');
      
      setTimeout(() => {
        LoadingSystem.hide(loaderId);
        // ทำงานต่อไป...
      }, 1500);
    } else {
      throw new Error(response.message);
    }
    
  } catch (error) {
    LoadingSystem.hide(loaderId);
    
    // แสดง error
    LoadingSystem.show({
      message: 'เกิดข้อผิดพลาด: ' + error.message,
      type: 'error',
      timeout: 5000
    });
  }
}
```

---

## 🏆 Best Practices

### 1. การจัดการ Loader IDs

```javascript
// ❌ ไม่ดี - อาจสูญหาย loaderId
function badExample() {
  LoadingSystem.show({ message: 'Loading...' });
  // ไม่มีการเก็บ loaderId
}

// ✅ ดี - เก็บ loaderId ไว้
function goodExample() {
  const loaderId = LoadingSystem.show({ message: 'Loading...' });
  
  setTimeout(() => {
    LoadingSystem.hide(loaderId);
  }, 3000);
}
```

### 2. การใช้ Progress Bar

```javascript
// ✅ ใช้ progress bar สำหรับงานที่ใช้เวลานาน
async function longRunningTask() {
  const loaderId = LoadingSystem.show({
    message: 'กำลังประมวลผล...',
    showProgress: true  // แสดง progress
  });
  
  // อัปเดต progress ตามความคืบหน้าจริง
  for (let i = 0; i <= 100; i += 10) {
    LoadingSystem.updateProgress(loaderId, i);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  LoadingSystem.hide(loaderId);
}
```

### 3. การจัดการ Error

```javascript
async function apiCall() {
  const loaderId = LoadingSystem.show({
    message: 'กำลังโหลดข้อมูล...'
  });
  
  try {
    const result = await fetch('/api/data');
    const data = await result.json();
    
    LoadingSystem.hide(loaderId);
    return data;
    
  } catch (error) {
    LoadingSystem.hide(loaderId);
    
    // แสดง error loading
    LoadingSystem.show({
      message: 'เกิดข้อผิดพลาด: ' + error.message,
      type: 'error',
      timeout: 3000
    });
    
    throw error;
  }
}
```

### 4. การใช้ Theme ที่เหมาะสม

```javascript
// ✅ เลือก theme ตามสถานการณ์

// สำหรับการบันทึกข้อมูล
LoadingSystem.show({
  message: 'กำลังบันทึก...',
  type: 'success'
});

// สำหรับการตรวจสอบ
LoadingSystem.show({
  message: 'กำลังตรวจสอบ...',
  type: 'warning'
});

// สำหรับการแก้ไขข้อผิดพลาด
LoadingSystem.show({
  message: 'กำลังแก้ไข...',
  type: 'error'
});
```

### 5. การใช้ Timeout

```javascript
// ✅ ใช้ timeout สำหรับ notification
LoadingSystem.show({
  message: 'บันทึกข้อมูลสำเร็จ!',
  type: 'success',
  timeout: 3000  // ปิดอัตโนมัติ
});

// ❌ ไม่ใช้ timeout สำหรับงานที่ไม่รู้เวลา
LoadingSystem.show({
  message: 'กำลังประมวลผล...',
  // ไม่ใส่ timeout เพราะไม่รู้ว่าจะเสร็จเมื่อไหร่
});
```

### 6. การทำความสะอาด

```javascript
// ทำความสะอาดเมื่อออกจากหน้า
window.addEventListener('beforeunload', () => {
  LoadingSystem.cleanup();
});

// หรือใน React/Vue component
componentWillUnmount() {
  LoadingSystem.hideAll();
}
```

---

## 🔧 Troubleshooting

### ปัญหา: Loading ไม่แสดง

**สาเหตุ:**
- ไม่ได้โหลด CSS/JS
- มี z-index ต่ำกว่า element อื่น
- มี CSS conflict

**วิธีแก้:**
```javascript
// ตรวจสอบว่า LoadingSystem โหลดแล้วหรือไม่
if (typeof LoadingSystem !== 'undefined') {
  console.log('LoadingSystem พร้อมใช้งาน');
} else {
  console.error('LoadingSystem ไม่ได้โหลด');
}

// ตรวจสอบ CSS
const container = document.getElementById('loading-system-container');
if (container) {
  console.log('Container พร้อม');
} else {
  console.error('Container ไม่พบ');
}
```

### ปัญหา: Loading ไม่หายไป

**สาเหตุ:**
- ไม่ได้เรียก hide()
- loaderId ผิด
- JavaScript error

**วิธีแก้:**
```javascript
// ใช้ hideAll() เพื่อปิดทั้งหมด
LoadingSystem.hideAll();

// ตรวจสอบ active loaders
console.log('Active loaders:', LoadingSystem.getActiveCount());

// ล้างข้อมูลทั้งหมด
LoadingSystem.cleanup();
```

### ปัญหา: Progress ไม่อัปเดต

**สาเหตุ:**
- ไม่ได้ส่ง showProgress: true
- loaderId ไม่ถูกต้อง

**วิธีแก้:**
```javascript
// ตรวจสอบว่าได้เปิด progress หรือไม่
const loaderId = LoadingSystem.show({
  message: 'Loading...',
  showProgress: true  // ต้องมี
});

// ตรวจสอบว่า loader ยังทำงานอยู่หรือไม่
if (LoadingSystem.isActive(loaderId)) {
  LoadingSystem.updateProgress(loaderId, 50);
} else {
  console.warn('Loader ไม่ทำงานอยู่');
}
```

### ปัญหา: Multiple Loading ทับกัน

**วิธีแก้:**
```javascript
// จัดการ loading หลายตัว
let currentLoaderId = null;

function showLoading(message) {
  // ปิดตัวเก่าก่อน
  if (currentLoaderId) {
    LoadingSystem.hide(currentLoaderId);
  }
  
  // เปิดตัวใหม่
  currentLoaderId = LoadingSystem.show({ message });
  return currentLoaderId;
}

function hideLoading() {
  if (currentLoaderId) {
    LoadingSystem.hide(currentLoaderId);
    currentLoaderId = null;
  }
}
```

### ปัญหา: Dark Mode ไม่ทำงาน

**วิธีแก้:**
```css
/* เพิ่ม CSS สำหรับ dark mode */
.dark .loading-overlay {
  background: rgba(0, 0, 0, 0.8);
}

.dark .loading-content {
  background: #1f2937;
  color: #f9fafb;
}
```

```javascript
// หรือใช้ prefers-color-scheme
@media (prefers-color-scheme: dark) {
  .loading-overlay {
    background: rgba(0, 0, 0, 0.8);
  }
}
```

---

## 📝 Changelog

### Version 2.0.0
- ✨ เขียนใหม่ทั้งหมดด้วย Modern JavaScript
- 🎨 เพิ่ม Theme Variants (success, warning, error)
- 📊 เพิ่ม Progress Bar พร้อม Auto Progress
- 🔧 เพิ่ม Timeout และ Message Update
- 🌙 รองรับ Dark Mode
- 📱 Responsive Design
- ♿ เพิ่ม Accessibility Support
- 🧹 ระบบ Cleanup ที่ดีขึ้น
- 🔍 เพิ่ม Debug Tools

### Version 1.x
- เวอร์ชันเก่า (Legacy)

---

## 📞 Support

หากมีปัญหาหรือข้อสงสัย กรุณาติดต่อ:

- **บริษัท:** 2 พี่น้อง โมบาย จำกัด
- **อีเมล:** support@2pheenoong.com
- **เว็บไซต์:** https://2pheenoong.com

---

## 📄 License

© 2025 บริษัท 2 พี่น้อง โมบาย จำกัด. สงวนลิขสิทธิ์.

---

**สร้างด้วย ❤️ โดยทีม 2 พี่น้อง โมบาย** 