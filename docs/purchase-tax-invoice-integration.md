# Purchase Tax Invoice Integration

## ภาพรวม
ระบบใบกำกับภาษีซื้อ (Purchase Tax Invoice) ที่ดึงข้อมูลที่มีภาษีจากฐานข้อมูล MongoDB และแสดงผลใน frontend

## Schema หลักที่ใช้

### 1. PurchaseOrder Schema
- เก็บข้อมูลใบสั่งซื้อ
- รายการสินค้า (items array) ที่มี taxType และ taxAmount
- สถานะการอนุมัติ
- ข้อมูลผู้จำหน่าย (supplier)

### 2. Asset Schema  
- เก็บข้อมูลสินทรัพย์
- ราคา, จำนวน, ส่วนลด
- ประเภทภาษี (VAT) - taxType และ vatAmount
- วันที่ซื้อ (purchaseDate)

### 3. ExpenseRecord Schema
- เก็บข้อมูลค่าใช้จ่าย
- ประเภทค่าใช้จ่าย
- สถานะการอนุมัติ
- ภาษีมูลค่าเพิ่ม (vat field)

### 4. TaxInvoice Schema
- เก็บข้อมูลใบกำกับภาษี
- ข้อมูลลูกค้า/ผู้จำหน่าย
- รายการสินค้า (items)
- การคำนวณภาษี (calculation และ summary)

## ไฟล์ที่เกี่ยวข้อง

### Frontend
- `views/account/purchase_tax_invoice.html` - หน้าแสดงใบกำกับภาษีซื้อ
- `public/account/js/purchase-tax-invoice.js` - JavaScript สำหรับจัดการข้อมูล

### Backend API Endpoints
- `/api/purchase_order` - ดึงข้อมูลใบสั่งซื้อ
- `/api/assets` - ดึงข้อมูลสินทรัพย์
- `/api/expense-records` - ดึงข้อมูลค่าใช้จ่าย
- `/api/tax-invoices` - ดึงข้อมูลใบกำกับภาษี

## คุณสมบัติหลัก

### 1. การดึงข้อมูล
- ดึงข้อมูลจาก 4 sources พร้อมกัน (parallel fetching)
- กรองเฉพาะรายการที่มีภาษี
- รวมข้อมูลและเรียงตามวันที่

### 2. การแสดงผล
- ตารางแสดงข้อมูลใบกำกับภาษีซื้อ
- แสดงประเภทข้อมูล (ใบสั่งซื้อ, สินทรัพย์, ค่าใช้จ่าย, ใบกำกับภาษี)
- จัดรูปแบบวันที่และตัวเลขให้เป็นภาษาไทย

### 3. การค้นหาและกรอง
- ค้นหาตามเลขที่ใบกำกับภาษี, ชื่อผู้จำหน่าย, รายละเอียด
- กรองตามช่วงวันที่
- กรองตามสถานะ

### 4. สรุปยอดรวม
- รวมราคาสินค้า/บริการ
- รวมยอดยกเว้น/0%
- รวมภาษี
- จำนวนรายการทั้งหมด

## การทำงานของ JavaScript

### PurchaseTaxInvoiceManager Class
```javascript
class PurchaseTaxInvoiceManager {
  // Properties
  currentPage, itemsPerPage, totalItems
  allTaxInvoiceData, filteredData
  
  // Methods
  fetchTaxInvoiceData() // ดึงข้อมูลจาก API
  renderTable() // แสดงผลตาราง
  updateSummary() // อัพเดตสรุปยอดรวม
  searchTaxInvoices() // ค้นหา
  filterDataByDateRange() // กรองตามวันที่
}
```

### การกรองข้อมูลที่มีภาษี

#### PurchaseOrder
```javascript
.filter(po => po.items && po.items.some(item => 
  item.taxType !== 'ไม่มีภาษี' && (item.taxAmount > 0 || item.taxRate > 0)
))
```

#### Asset
```javascript
.filter(asset => asset.taxType !== 'no_tax' && asset.vatAmount > 0)
```

#### ExpenseRecord
```javascript
.filter(expense => expense.vat > 0)
```

#### TaxInvoice
```javascript
// ใบกำกับภาษีทุกใบถือว่ามีภาษี
```

## การจัดรูปแบบข้อมูล

### วันที่
```javascript
formatDate(dateString) {
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  });
}
```

### ตัวเลข/เงิน
```javascript
formatCurrency(amount) {
  return parseFloat(amount).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
```

### เลขประจำตัวผู้เสียภาษี
```javascript
formatTaxId(taxId) {
  return taxId.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5');
}
```

## การใช้งาน

1. เปิดหน้า `purchase_tax_invoice.html`
2. ระบบจะดึงข้อมูลจากฐานข้อมูลอัตโนมัติ
3. แสดงรายการใบกำกับภาษีซื้อที่มีภาษี
4. สามารถค้นหา กรอง และดูรายละเอียดได้

## การปรับแต่ง

### เพิ่ม Data Source ใหม่
1. เพิ่มฟังก์ชัน `fetchNewDataSource()` ใน PurchaseTaxInvoiceManager
2. เพิ่มการเรียกใน `fetchTaxInvoiceData()`
3. กำหนดรูปแบบข้อมูลให้ตรงกับ interface

### เพิ่มฟิลด์ในตาราง
1. แก้ไข HTML table header
2. อัพเดต `renderTable()` method
3. เพิ่มการคำนวณใน `updateSummary()` ถ้าจำเป็น

## ความปลอดภัย

- ใช้ Authorization Bearer token
- Sanitize input ก่อนแสดงผล
- Rate limiting สำหรับ API calls
- XSS protection

## Performance

- Parallel API calls
- Client-side pagination
- Debounced search (300ms)
- Efficient DOM updates
