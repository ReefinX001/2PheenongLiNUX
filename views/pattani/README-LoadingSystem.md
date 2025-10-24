# LoadingSystem v2.0.0 - คู่มือการใช้งาน

**ระบบแสดงสถานะการโหลดมาตรฐาน สำหรับ 2 พี่น้อง โมบาย - POS System**

## 📁 ไฟล์ในโฟลเดอร์นี้

```
views/pattani/
├── loading-system.css       # CSS สไตล์สำหรับ Loading System
├── loading-system.js        # JavaScript สำหรับ Loading System
├── frontstore_pattani.html  # ไฟล์หลัก POS System (ใช้งาน LoadingSystem)
└── README-LoadingSystem.md  # คู่มือนี้
```

## 🚀 การติดตั้ง

### 1. การใช้งานในไฟล์ HTML

```html
<!DOCTYPE html>
<html>
<head>
  <!-- CSS -->
  <link rel="stylesheet" href="loading-system.css">
</head>
<body>
  <!-- เนื้อหาของคุณ -->
  
  <!-- JavaScript -->
  <script src="loading-system.js"></script>
</body>
</html>
```

### 2. ตรวจสอบการโหลด

```javascript
// ตรวจสอบว่า LoadingSystem โหลดสำเร็จหรือไม่
if (window.LoadingSystem) {
  console.log('✅ LoadingSystem พร้อมใช้งาน');
} else {
  console.error('❌ LoadingSystem ไม่สามารถโหลดได้');
}
```

## 📖 การใช้งานพื้นฐาน

### แสดง Loading

```javascript
// แสดง loading พื้นฐาน
const loaderId = LoadingSystem.show({
  message: 'กำลังโหลดข้อมูล...'
});

// แสดง loading พร้อม progress bar
const loaderId2 = LoadingSystem.show({
  message: 'กำลังประมวลผล...',
  showProgress: true,
  autoProgress: true
});

// แสดง loading แบบมี timeout
const loaderId3 = LoadingSystem.show({
  message: 'กำลังโหลด...',
  timeout: 5000 // ซ่อนอัตโนมัติหลังจาก 5 วินาที
});
```

### ซ่อน Loading

```javascript
// ซ่อน loading ตาม ID
LoadingSystem.hide(loaderId);

// ซ่อน loading ทั้งหมด
LoadingSystem.hideAll();

// ทำ progress เต็มแล้วซ่อน
LoadingSystem.completeProgress(loaderId);
```

### อัปเดต Loading

```javascript
// เปลี่ยนข้อความ
LoadingSystem.updateMessage(loaderId, 'กำลังบันทึกข้อมูล...');

// อัปเดต progress bar
LoadingSystem.updateProgress(loaderId, 75); // 75%
```

## 🎨 Theme และ Style

### Theme Options

```javascript
// Success theme (สีเขียว)
LoadingSystem.show({
  message: 'บันทึกสำเร็จ!',
  type: 'success'
});

// Warning theme (สีเหลือง)
LoadingSystem.show({
  message: 'กำลังตรวจสอบ...',
  type: 'warning'
});

// Error theme (สีแดง)
LoadingSystem.show({
  message: 'เกิดข้อผิดพลาด!',
  type: 'error'
});
```

### Enhanced Dark Mode Support

LoadingSystem รองรับ Dark Mode แบบ **Real-time** และ **Auto-detection**:

#### 🎨 วิธีการตรวจจับ Theme (3 วิธี):
1. **OS Preference** - `prefers-color-scheme: dark` (อัตโนมัติ)
2. **Tailwind CSS** - class `.dark` ใน `<html>` 
3. **DaisyUI Theme** - `data-theme="dark"` attribute

#### 🔄 Real-time Theme Switching:
```javascript
// LoadingSystem จะเปลี่ยนสีทันทีเมื่อ:
document.documentElement.classList.toggle('dark');           // Tailwind
document.documentElement.setAttribute('data-theme', 'dark'); // DaisyUI
```

#### 🎨 Theme Colors:
- **Light Mode**: พื้นหลังขาว, ข้อความดำ, **spinner สีขาว**
- **Dark Mode**: พื้นหลังเทาเข้ม (#1f2937), ข้อความขาว, **spinner สีขาว**
- **Progress Bar**: สีขาวทั้ง Light และ Dark Mode

#### ⚪ White Theme Design:
LoadingSystem ใช้ **สีขาวเป็นหลัก** เพื่อให้เข้ากับทุก background:

```css
/* Spinner Colors */
.loading-spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);  /* ขอบโปร่งใส */
  border-top-color: #ffffff;                    /* ส่วนหมุนสีขาว */
}

/* Progress Bar Colors */
.loading-progress {
  background: rgba(255, 255, 255, 0.3);        /* พื้นโปร่งใส */
}
.loading-progress-fill {
  background: linear-gradient(90deg, #ffffff, #f0f0f0); /* ไล่โทนขาว */
}
```

**ข้อดี:**
- ✅ เข้ากับ background ทุกสี
- ✅ ดูชัดเจนทั้ง Light และ Dark Mode
- ✅ สวยงามและทันสมัย

#### 🔧 Manual Theme Update:
```javascript
// บังคับอัปเดต theme (ไม่จำเป็นต้องใช้ ระบบทำอัตโนมัติ)
LoadingSystem.updateAllThemes();
```

## 🔧 API Reference

### LoadingSystem.show(options)

แสดง loading overlay

**Parameters:**
- `options.message` (string) - ข้อความที่แสดง (default: 'กำลังโหลด...')
- `options.showProgress` (boolean) - แสดง progress bar (default: false)
- `options.autoProgress` (boolean) - เริ่ม auto progress (default: false)
- `options.timeout` (number) - ปิดอัตโนมัติหลังจาก (ms, default: 0)
- `options.type` (string) - ประเภท ('default', 'success', 'warning', 'error')

**Returns:** `string` - loaderId

### LoadingSystem.hide(loaderId)

ซ่อน loading overlay ตาม ID

### LoadingSystem.hideAll()

ซ่อน loading overlay ทั้งหมด

### LoadingSystem.updateMessage(loaderId, message)

อัปเดตข้อความ

### LoadingSystem.updateProgress(loaderId, progress)

อัปเดต progress bar (0-100)

### LoadingSystem.completeProgress(loaderId)

ทำ progress เต็มและซ่อน

### LoadingSystem.isActive(loaderId)

ตรวจสอบสถานะ loader

**Returns:** `boolean`

### LoadingSystem.getActiveCount()

ดูจำนวน loader ที่แสดงอยู่

**Returns:** `number`

### LoadingSystem.debug()

ข้อมูล debug

**Returns:** `Object`

## 🔄 Advanced Usage

### ใช้กับ Promise

```javascript
// Wrap Promise ด้วย LoadingSystem
const result = await LoadingSystem.trackPromise(
  fetch('/api/data').then(res => res.json()),
  { message: 'กำลังดาวน์โหลดข้อมูล...' }
);
```

### ใช้กับ Button

```javascript
const button = document.getElementById('myButton');

button.addEventListener('click', async () => {
  const result = await LoadingSystem.loadingButton(
    button,
    doSomethingAsync(),
    { loadingText: 'กำลังบันทึก...' }
  );
});
```

### ใช้กับ async/await

```javascript
async function saveData() {
  const loaderId = LoadingSystem.show({
    message: 'กำลังบันทึกข้อมูล...',
    showProgress: true,
    autoProgress: true
  });
  
  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    LoadingSystem.updateMessage(loaderId, 'กำลังประมวลผล...');
    
    const result = await response.json();
    
    LoadingSystem.completeProgress(loaderId);
    return result;
    
  } catch (error) {
    LoadingSystem.hide(loaderId);
    throw error;
  }
}
```

## ⚡ Performance Tips

1. **ใช้ ID เพื่อจัดการ loading หลายตัว**
   ```javascript
   const loader1 = LoadingSystem.show({ message: 'โหลด 1' });
   const loader2 = LoadingSystem.show({ message: 'โหลด 2' });
   
   // ซ่อนแค่ loader1
   LoadingSystem.hide(loader1);
   ```

2. **ใช้ timeout เพื่อป้องกัน loading ค้าง**
   ```javascript
   LoadingSystem.show({
     message: 'กำลังโหลด...',
     timeout: 10000 // 10 วินาที
   });
   ```

3. **ใช้ cleanup เมื่อออกจากหน้า**
   ```javascript
   window.addEventListener('beforeunload', () => {
     LoadingSystem.cleanup();
   });
   ```

## 🎯 ตัวอย่างการใช้งานใน POS System

```javascript
// เมื่อโหลดสินค้า
async function loadProducts() {
  const loaderId = LoadingSystem.show({
    message: 'กำลังโหลดสินค้า...',
    showProgress: true,
    autoProgress: true
  });
  
  try {
    const products = await fetch('/api/products').then(r => r.json());
    LoadingSystem.updateMessage(loaderId, 'กำลังแสดงผล...');
    renderProducts(products);
    LoadingSystem.completeProgress(loaderId);
  } catch (error) {
    LoadingSystem.hide(loaderId);
    showError(error);
  }
}

// เมื่อชำระเงิน
async function checkout() {
  const loaderId = LoadingSystem.show({
    message: 'กำลังประมวลผลการชำระเงิน...',
    showProgress: true,
    type: 'warning'
  });
  
  try {
    LoadingSystem.updateProgress(loaderId, 25);
    await validateCart();
    
    LoadingSystem.updateMessage(loaderId, 'กำลังคำนวณภาษี...');
    LoadingSystem.updateProgress(loaderId, 50);
    await calculateTax();
    
    LoadingSystem.updateMessage(loaderId, 'กำลังบันทึกรายการ...');
    LoadingSystem.updateProgress(loaderId, 75);
    await saveTransaction();
    
    LoadingSystem.updateMessage(loaderId, 'สำเร็จ!');
    LoadingSystem.updateProgress(loaderId, 100);
    
    setTimeout(() => LoadingSystem.hide(loaderId), 1000);
    
  } catch (error) {
    LoadingSystem.hide(loaderId);
    showError(error);
  }
}
```

## 🛡️ Fallback System

LoadingSystem มี **Enhanced Fallback System** ที่ทำงานได้แม้ไฟล์ภายนอกโหลดไม่สำเร็จ:

### ⚡ การทำงานของ Fallback:
1. **Auto Detection** - ตรวจจับไฟล์ภายนอกใน 5 วินาที
2. **Fallback Creation** - สร้าง LoadingSystem แบบ inline หากล้มเหลว
3. **Full Compatibility** - API เหมือนกับไฟล์ภายนอกทุกประการ

### 🔧 ฟีเจอร์ใน Fallback:
- ✅ ทุกฟังก์ชัน API (show, hide, updateProgress, etc.)
- ✅ Dark Mode Support แบบ real-time
- ✅ Progress Bar พร้อม animation
- ✅ Auto timeout (30 วินาที default)
- ✅ Error handling ครบถ้วน

### 🚨 การตรวจสอบ Fallback:
```javascript
// ตรวจสอบว่าใช้ไฟล์ภายนอกหรือ fallback
console.log(LoadingSystem.debug());
// Output: { type: 'external' } หรือ { type: 'fallback' }
```

## 🛠️ การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

1. **Loading ไม่แสดง**
   - ✅ **Fallback จะแก้ไขอัตโนมัติ** - ไม่ต้องกังวล!
   - ตรวจสอบข้อผิดพลาดใน Console
   - ตรวจสอบ `window.LoadingSystem` ว่ามีหรือไม่

2. **Loading ไม่หายไป**
   - ใช้ `LoadingSystem.hideAll()` เพื่อซ่อนทั้งหมด
   - ตรวจสอบ error ใน try/catch
   - **Fallback มี auto-timeout** ป้องกันการค้าง

3. **Progress bar ไม่เคลื่อนไหว**
   - ตรวจสอบว่าเรียก `showProgress: true`
   - ใช้ `autoProgress: true` หรือ `updateProgress()` manual
   - **Fallback รองรับ progress ครบ**

4. **ไฟล์ CSS/JS โหลดไม่ได้ (404 Error)**
   - ✅ **Fallback จะทำงานแทนอัตโนมัติ**
   - ตรวจสอบ path ไฟล์ใน HTML
   - ใช้ `/views/pattani/loading-system.css|js`

### Debug Commands

```javascript
// ดูสถานะ LoadingSystem
console.log(LoadingSystem.debug());

// ดูจำนวน loading ที่เปิดอยู่
console.log('Active loaders:', LoadingSystem.getActiveCount());

// ทดสอบ LoadingSystem
const testId = LoadingSystem.show({ message: 'ทดสอบ', timeout: 3000 });
```

## 📝 การบำรุงรักษา

### การอัปเดต LoadingSystem

1. แก้ไขไฟล์ `loading-system.css` สำหรับ style
2. แก้ไขไฟล์ `loading-system.js` สำหรับ functionality
3. อัปเดต version number ในไฟล์ JavaScript

### การเพิ่มฟีเจอร์ใหม่

1. เพิ่ม CSS class ใหม่ใน `loading-system.css`
2. เพิ่ม method ใหม่ใน LoadingSystem object
3. อัปเดตคู่มือนี้

---

## 🔗 การใช้งานในไฟล์อื่น

หากต้องการใช้ LoadingSystem ในไฟล์ HTML อื่น:

```html
<!-- คัดลอกไฟล์ไปยังโฟลเดอร์เดียวกัน -->
<link rel="stylesheet" href="loading-system.css">
<script src="loading-system.js"></script>
```

หรือ

```html
<!-- ใช้ path แบบ relative -->
<link rel="stylesheet" href="../pattani/loading-system.css">
<script src="../pattani/loading-system.js"></script>
```

---

---

## 🌟 สรุปฟีเจอร์ LoadingSystem v2.0.0

### ✨ Enhanced Features:
- 🎨 **Dark Mode Support** - รองรับ 3 วิธี + Real-time switching
- ⚪ **White Theme Design** - Spinner และ Progress Bar สีขาวทั้ง Light/Dark Mode
- 🛡️ **Fallback System** - ทำงานได้แม้ไฟล์ภายนอกล้มเหลว  
- 📱 **Responsive Design** - รองรับทุกขนาดหน้าจอ
- ♿ **Accessibility** - รองรับ screen readers และ reduced motion
- 🎯 **Performance** - เบาและเร็ว ไม่กระทบประสิทธิภาพ
- 🔧 **Developer Friendly** - API ง่าย พร้อม error handling

### 🚀 การใช้งานง่าย:
```javascript
// 1 บรรทัดเดียวแสดง loading (สีขาวอัตโนมัติ)
const id = LoadingSystem.show({ message: 'กำลังโหลด...' });

// Loading พร้อม progress bar สีขาว
const id2 = LoadingSystem.show({ 
  message: 'กำลังประมวลผล...', 
  showProgress: true,
  autoProgress: true 
});

// 1 บรรทัดเดียวซ่อน loading  
LoadingSystem.hide(id);
```

---

**เวอร์ชัน:** 2.0.0 Enhanced (White Theme)  
**ผู้พัฒนา:** 2 พี่น้อง โมบาย  
**อัปเดตล่าสุด:** ธันวาคม 2024  
**ฟีเจอร์ใหม่:** Dark Mode + Fallback System + **สีขาวสำหรับ Spinner และ Progress Bar** 