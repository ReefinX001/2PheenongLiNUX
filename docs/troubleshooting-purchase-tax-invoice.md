# Troubleshooting Guide - Purchase Tax Invoice System

## ปัญหาที่พบและการแก้ไข

### 1. API Endpoints ไม่พบ (404 Errors)

#### ปัญหา:
```
GET https://www.2pheenong.com/api/purchase_order 404 (Not Found)
GET https://www.2pheenong.com/api/tax-invoices 404 (Not Found)
```

#### สาเหตุ:
- API endpoints ที่ใช้ในโค้ดไม่ตรงกับที่มีจริงในระบบ
- บางเส้นทาง API อาจยังไม่ได้สร้างหรือไม่พร้อมใช้งาน

#### การแก้ไข:

1. **ตรวจสอบ API endpoints ที่ถูกต้อง:**
   ```javascript
   // แก้ไขจาก
   '/api/tax-invoices' 
   // เป็น
   '/api/tax-invoice'
   ```

2. **เพิ่มการจัดการ error ที่ดีขึ้น:**
   ```javascript
   // ใช้ Promise.allSettled แทน Promise.all
   const results = await Promise.allSettled([
     this.fetchPurchaseOrdersWithTax(),
     this.fetchAssetsWithTax(),
     this.fetchExpenseRecordsWithTax(),
     this.fetchTaxInvoices()
   ]);
   ```

3. **เพิ่มข้อมูลตัวอย่างเป็น fallback:**
   ```javascript
   if (this.allTaxInvoiceData.length === 0) {
     this.allTaxInvoiceData = this.getSampleData();
     this.showDemoNotice(true);
   }
   ```

### 2. Tailwind CSS Warning

#### ปัญหา:
```
cdn.tailwindcss.com should not be used in production
```

#### สาเหตุ:
- ใช้ Tailwind CSS จาก CDN ซึ่งไม่เหมาะสำหรับ production

#### การแก้ไข:

1. **เพิ่มข้อความเตือนสำหรับ development:**
   ```javascript
   if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
     console.warn('⚠️ Tailwind CSS CDN should not be used in production.');
   }
   ```

2. **สำหรับ production ควร:**
   - ติดตั้ง Tailwind CSS แบบ local
   - ใช้ PostCSS plugin
   - Build CSS file แยกต่างหาก

### 3. การแสดงข้อมูลเมื่อ API ไม่พร้อม

#### ฟีเจอร์ที่เพิ่ม:

1. **Demo Notice:**
   ```html
   <div id="demoNotice" class="bg-yellow-50 border-l-4 border-yellow-400 p-4 hidden">
     <p>กำลังแสดงข้อมูลตัวอย่างเนื่องจากไม่สามารถเชื่อมต่อกับ API ได้</p>
   </div>
   ```

2. **Sample Data:**
   ```javascript
   getSampleData() {
     return [
       {
         id: 'sample-1',
         type: 'purchase_order',
         date: new Date('2024-12-15'),
         taxInvoiceNumber: 'PP-680500020',
         // ... more fields
       }
     ];
   }
   ```

## API Endpoints ที่ถูกต้อง

### ตามที่พบในระบบ:

1. **Purchase Orders:**
   ```
   GET /api/purchase_order
   ```

2. **Assets:**
   ```
   GET /api/assets
   ```

3. **Expense Records:**
   ```
   GET /api/expense-records
   ```

4. **Tax Invoices:**
   ```
   GET /api/tax-invoice
   ```

## การทดสอบ API

### ใช้ Browser Console:
```javascript
// ทดสอบ API endpoint
fetch('/api/purchase_order', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('authToken'),
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

### ใช้ curl:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     https://www.2pheenong.com/api/purchase_order
```

## การปรับปรุงในอนาคต

### 1. Environment Configuration
```javascript
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://api.2pheenong.com' 
  : 'http://localhost:3000';
```

### 2. Retry Mechanism
```javascript
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 3. Caching
```javascript
class APICache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.ttl) {
      return item.data;
    }
    return null;
  }
  
  set(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}
```

## การ Monitor และ Debug

### 1. Console Logging
```javascript
console.group('🔍 API Fetch Results');
console.log('Purchase Orders:', purchaseOrders.length);
console.log('Assets:', assets.length);
console.log('Expense Records:', expenseRecords.length);
console.log('Tax Invoices:', taxInvoices.length);
console.groupEnd();
```

### 2. Performance Monitoring
```javascript
const startTime = performance.now();
await this.fetchTaxInvoiceData();
const endTime = performance.now();
console.log(`Data fetch took ${endTime - startTime} milliseconds`);
```

### 3. Error Tracking
```javascript
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  // Send to error tracking service
});
```

## สรุป

ระบบได้รับการปรับปรุงให้:
- ทำงานได้แม้ว่า API บางตัวจะไม่พร้อมใช้งาน
- แสดงข้อมูลตัวอย่างเมื่อไม่มีข้อมูลจริง
- มีการจัดการ error ที่ดีขึ้น
- แสดงข้อความแจ้งเตือนที่เหมาะสม
- รองรับการ debug และ troubleshooting
