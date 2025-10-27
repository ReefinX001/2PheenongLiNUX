# คู่มือการใช้งาน Purchase Tax Invoice (ใบกำกับภาษีซื้อ)

## สรุปการตรวจสอบและปรับปรุงระบบ

### ✅ สิ่งที่ดำเนินการเสร็จแล้ว

1. **Model (Database Schema)** ✅
   - ไฟล์: `models/PurchaseTaxInvoice.js`
   - มี Schema ครบถ้วนสมบูรณ์
   - รองรับข้อมูลผู้ขาย, รายการสินค้า, VAT, สถานะการจ่ายเงิน
   - มี auto-calculation สำหรับยอดรวมและ VAT

2. **Controller (Business Logic)** ✅ ปรับปรุงแล้ว
   - ไฟล์: `controllers/PurchaseTaxInvoiceController.js`
   - **ปรับปรุง**: เพิ่ม logic รองรับการส่งข้อมูล supplier เป็น ID
   - **ปรับปรุง**: เพิ่ม logic แปลง items structure จาก Frontend ให้ตรงกับ Model
   - ฟังก์ชันที่มี:
     - `create()` - สร้างใบกำกับภาษีซื้อใหม่
     - `getAll()` - ดึงรายการทั้งหมด (มี pagination, filter, search)
     - `getById()` - ดึงข้อมูลตาม ID
     - `getByInvoiceNumber()` - ดึงข้อมูลตามเลขที่ใบกำกับ
     - `update()` - แก้ไขข้อมูล
     - `delete()` - ลบข้อมูล (soft delete)
     - `updatePayment()` - อัพเดทสถานะการชำระเงิน
     - `approve()` - อนุมัติใบกำกับ
     - `cancel()` - ยกเลิกใบกำกับ
     - `getStatistics()` - สถิติและรายงาน

3. **Routes (API Endpoints)** ✅
   - ไฟล์: `routes/purchaseTaxInvoiceRoutes.js`
   - ถูก register ใน `server.js` แล้ว (บรรทัด 1373)
   - Base URL: `/api/purchase-tax-invoice`

4. **Frontend HTML** ✅ ปรับปรุงแล้ว
   - ไฟล์: `views/account/purchase_tax_invoice.html`
   - **ยืนยัน**: ไม่มี mock data เลย ใช้ API จริง 100%
   - **ปรับปรุง**: แก้ไข JavaScript ให้ส่งข้อมูลครบถ้วนตาม Model
   - มีฟีเจอร์:
     - แสดงรายการใบกำกับภาษีซื้อ (Table with pagination)
     - สร้างใบกำกับใหม่ (Modal form)
     - แก้ไขใบกำกับ (Modal form)
     - ดูรายละเอียด (Modal view)
     - ค้นหาและกรองข้อมูล
     - ค้นหาผู้ขาย (Autocomplete)
     - คำนวณยอดรวมและ VAT อัตโนมัติ

---

## API Endpoints ที่ใช้งาน

### 1. สร้างใบกำกับภาษีซื้อ
```
POST /api/purchase-tax-invoice
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "invoiceNumber": "PTI202500001",
  "supplier": "supplier_id_here",  // MongoDB ObjectId ของผู้ขาย
  "issueDate": "2025-10-27",
  "items": [
    {
      "name": "สินค้า A",
      "description": "รายละเอียดสินค้า A",
      "quantity": 10,
      "unitPrice": 1000,
      "unit": "ชิ้น",
      "discount": 0,
      "taxType": "vat",
      "vatRate": 7
    }
  ],
  "notes": "หมายเหตุ...",
  "status": "pending"
}
```

### 2. ดึงรายการทั้งหมด (with pagination)
```
GET /api/purchase-tax-invoice?page=1&limit=10&search=PTI&status=pending
Authorization: Bearer {token}
```

### 3. ดึงข้อมูลตาม ID
```
GET /api/purchase-tax-invoice/{id}
Authorization: Bearer {token}
```

### 4. แก้ไขใบกำกับ
```
PUT /api/purchase-tax-invoice/{id}
Authorization: Bearer {token}

Body: (same as create)
```

### 5. อนุมัติใบกำกับ
```
PUT /api/purchase-tax-invoice/{id}/approve
Authorization: Bearer {token}
```

### 6. ยกเลิกใบกำกับ
```
PUT /api/purchase-tax-invoice/{id}/cancel
Authorization: Bearer {token}

Body:
{
  "cancelReason": "เหตุผลการยกเลิก..."
}
```

### 7. อัพเดทการชำระเงิน
```
PUT /api/purchase-tax-invoice/{id}/payment
Authorization: Bearer {token}

Body:
{
  "paidAmount": 10700,
  "paymentDate": "2025-10-27",
  "paymentMethod": "bank_transfer",
  "notes": "ชำระผ่านโอนเงิน"
}
```

### 8. ดึงสถิติ
```
GET /api/purchase-tax-invoice/statistics?startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer {token}
```

### 9. API สำหรับค้นหาผู้ขาย (ใช้ร่วมกัน)
```
GET /api/contacts?search={query}&type=supplier&limit=10
Authorization: Bearer {token}
```

---

## การใช้งานผ่าน Frontend

### 1. เข้าถึงหน้าจัดการใบกำกับภาษีซื้อ
- URL: `http://localhost:3000/account/purchase_tax_invoice.html`
- ต้องล็อกอินก่อนเพื่อรับ authentication token

### 2. สร้างใบกำกับภาษีซื้อใหม่
1. คลิกปุ่ม "สร้างใบกำกับภาษีซื้อ"
2. กรอกเลขที่ใบกำกับและวันที่
3. ค้นหาและเลือกผู้ขาย (จะ auto-fill เลขผู้เสียภาษี)
4. เพิ่มรายการสินค้า/บริการ
   - กรอกรายละเอียด
   - กรอกจำนวน
   - กรอกราคาต่อหน่วย
   - ระบบจะคำนวณยอดรวมอัตโนมัติ
5. เลือกอัตรา VAT (0%, 7%, หรือค่าอื่น)
6. กรอกหมายเหตุ (ถ้ามี)
7. คลิก "บันทึก"

### 3. แก้ไขใบกำกับ
- คลิกปุ่มแก้ไข (ไอคอนดินสอ) ในรายการที่ต้องการ
- สามารถแก้ไขได้เฉพาะใบกำกับที่สถานะ "รอตรวจสอบ" เท่านั้น

### 4. อนุมัติใบกำกับ
- คลิกปุ่มอนุมัติ (ไอคอนเครื่องหมายถูก) ในรายการที่ต้องการ
- ยืนยันการอนุมัติ

### 5. ยกเลิกใบกำกับ
- คลิกปุ่มยกเลิก (ไอคอน X) ในรายการที่ต้องการ
- ยืนยันการยกเลิก

### 6. ค้นหาและกรองข้อมูล
- ใช้ช่องค้นหา: ค้นหาด้วยเลขที่ใบกำกับ, ชื่อผู้ขาย, หรือเลขผู้เสียภาษี
- เลือกสถานะ: กรองตามสถานะ (ทั้งหมด, รอตรวจสอบ, อนุมัติแล้ว, ยกเลิก)
- เลือกช่วงวันที่: กรองตามวันที่ออกใบกำกับ

---

## โครงสร้างไฟล์

```
my-accounting-app/
├── models/
│   └── PurchaseTaxInvoice.js          # Database Schema
├── controllers/
│   └── PurchaseTaxInvoiceController.js # Business Logic
├── routes/
│   └── purchaseTaxInvoiceRoutes.js    # API Routes
├── views/account/
│   └── purchase_tax_invoice.html      # Frontend UI
└── server.js                          # Main server file (routes registered)
```

---

## Data Flow

```
Frontend (HTML/JS)
    ↓
    ↓ POST /api/purchase-tax-invoice
    ↓
Routes (purchaseTaxInvoiceRoutes.js)
    ↓
    ↓ protect middleware (authentication)
    ↓
Controller (PurchaseTaxInvoiceController.js)
    ↓
    ↓ Transform data (supplier ID → supplier object)
    ↓ Transform items (add name, unit, taxType, vatRate)
    ↓
Model (PurchaseTaxInvoice.js)
    ↓
    ↓ pre-save hook (calculate totals, VAT)
    ↓
MongoDB Database
```

---

## สิ่งที่ปรับปรุง

### Controller (PurchaseTaxInvoiceController.js)
1. **ปรับปรุง create():**
   - เพิ่มการดึงข้อมูล supplier จาก Contact model เมื่อรับ supplier ID
   - เพิ่มการแปลง items structure ให้ตรงกับ Model
   - รองรับทั้ง `description` และ `name` field

2. **ปรับปรุง update():**
   - เพิ่มการดึงข้อมูล supplier จาก Contact model
   - เพิ่มการแปลง items structure

### Frontend (purchase_tax_invoice.html)
1. **ปรับปรุง handleCreatePurchaseTaxInvoice():**
   - เพิ่มการส่ง `name` field ใน items
   - เพิ่มการส่ง `unit`, `discount`, `taxType`, `vatRate` ใน items
   - ลบการส่ง `summary` object (ให้ Model คำนวณเอง)

---

## การทดสอบ

### ทดสอบการสร้างใบกำกับ
1. เปิด Browser และเข้า `http://localhost:3000/account/purchase_tax_invoice.html`
2. คลิก "สร้างใบกำกับภาษีซื้อ"
3. กรอกข้อมูลครบถ้วน
4. ตรวจสอบว่าข้อมูลถูกบันทึกลงฐานข้อมูลถูกต้อง

### ทดสอบการแก้ไข
1. คลิกปุ่มแก้ไขในรายการที่สถานะ "รอตรวจสอบ"
2. แก้ไขข้อมูล
3. บันทึก
4. ตรวจสอบว่าข้อมูลถูกอัพเดทถูกต้อง

### ทดสอบการอนุมัติ
1. คลิกปุ่มอนุมัติ
2. ยืนยัน
3. ตรวจสอบว่าสถานะเปลี่ยนเป็น "อนุมัติแล้ว"

---

## ข้อควรระวัง

1. **Authentication Required**: ทุก API ต้องมี Bearer token ใน Authorization header
2. **Supplier ID**: ต้องเป็น valid MongoDB ObjectId ที่มีอยู่ใน Contact collection
3. **Status Workflow**: ใบกำกับที่ถูกยกเลิกหรือเป็นโมฆะ (void) ไม่สามารถแก้ไขได้
4. **Auto-calculation**: ระบบจะคำนวณยอดรวม, VAT, และสถานะการชำระเงินอัตโนมัติ

---

## Next Steps (Optional Enhancements)

1. **เพิ่ม Product Search API**: สำหรับค้นหาสินค้าจาก Product collection
2. **PDF Export**: สร้าง PDF ใบกำกับภาษี
3. **Email Notification**: ส่งอีเมลแจ้งเตือนเมื่อมีการอนุมัติ/ยกเลิก
4. **Payment Integration**: เชื่อมต่อกับระบบชำระเงิน
5. **Withholding Tax**: เพิ่มฟังก์ชันภาษีหัก ณ ที่จ่าย (มีใน Model แล้ว แต่ยังไม่ได้ implement ใน Frontend)

---

## สรุป

✅ **ระบบใบกำกับภาษีซื้อพร้อมใช้งานแล้ว**

- Model, Controller, Routes สมบูรณ์
- ไม่มี mock data เลย ใช้ API จริง
- รองรับ CRUD operations ครบถ้วน
- มี pagination, search, filter
- Auto-calculation สำหรับ VAT และยอดรวม
- มี workflow การอนุมัติ

**API Endpoint**: `/api/purchase-tax-invoice`
**Frontend URL**: `/account/purchase_tax_invoice.html`
**Status**: ✅ Production Ready
