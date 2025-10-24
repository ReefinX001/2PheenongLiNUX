# ระบบเอกสารประกอบการสมัครผ่อน - Step 2

## ภาพรวมระบบ

ระบบเอกสารประกอบการสมัครผ่อนได้รับการพัฒนาให้ใช้งานได้จริงแล้ว มีฟีเจอร์ครบถ้วนสำหรับการถ่ายรูป อัปโหลดไฟล์ และลายเซ็นดิจิทัล

## ฟีเจอร์หลัก

### 📸 การถ่ายรูปเอกสาร
- **บัตรประชาชน** (จำเป็น)
- **รูปเซลฟี่พร้อมบัตร** (จำเป็น)
- **สลิปเงินเดือน** (ไม่บังคับ)

### 📁 การอัปโหลดไฟล์
- รองรับไฟล์ประเภท: JPG, PNG, PDF
- ขนาดไฟล์สูงสุด: 10MB
- การตรวจสอบไฟล์อัตโนมัติ

### ✍️ ลายเซ็นดิจิทัล
- **ลายเซ็นลูกค้า** (จำเป็น)
- **ลายเซ็นพนักงานขาย** (จำเป็น)
- Canvas-based signature pad
- รองรับ touch และ mouse

## ไฟล์ที่เกี่ยวข้อง

### JavaScript Modules
```
├── js/
│   ├── document-manager.js           # จัดการเอกสารหลัก
│   ├── document-upload-handler.js    # จัดการการอัปโหลด
│   ├── customer-search.js           # ค้นหาลูกค้า
│   └── form-progress.js             # ติดตามความคืบหน้า
```

### Backend Routes
```
├── routes/
│   └── documentRoutes.js            # API เอกสาร
└── controllers/
    └── installmentController.js     # ระบบผ่อนหลัก
```

### Storage
```
├── uploads/
│   └── documents/                   # เก็บไฟล์อัปโหลด
└── localStorage                     # เก็บข้อมูลชั่วคราว
```

## การทำงานของระบบ

### 1. การถ่ายรูป/อัปโหลด
```javascript
// เปิดกล้องถ่ายรูป
documentManager.openCamera('idCard');

// หรือเลือกไฟล์
documentManager.openFileSelect('idCard');
```

### 2. การบันทึกลายเซ็น
```javascript
// เปิด signature modal
documentManager.openSignatureModal('customer');

// บันทึกลายเซ็น
documentManager.saveSignature();
```

### 3. การอัปโหลดไปยัง Server
```javascript
// อัปโหลดไฟล์
await documentUploadHandler.uploadDocument(file, 'idCard', metadata);

// เตรียมข้อมูลสำหรับส่งฟอร์ม
const attachments = documentUploadHandler.prepareDocumentsForSubmission();
```

## API Endpoints

### POST /api/documents/upload
อัปโหลดเอกสาร
```javascript
FormData:
- file: File object
- documentType: string
- customerId: string
- metadata: JSON string
```

### GET /api/documents/:documentId
ดึงเอกสารตาม ID

### GET /api/documents/customer/:customerId
ดึงเอกสารทั้งหมดของลูกค้า

### POST /api/documents/validate
ตรวจสอบความถูกต้องของเอกสาร

## เอกสารที่จำเป็น

### บังคับ (Required)
1. **รูปบัตรประชาชน** (`idCard`)
   - ถ่ายให้เห็นข้อมูลชัดเจน
   - ไม่มีแสงสะท้อน

2. **รูปเซลฟี่พร้อมบัตร** (`selfie`)
   - ลูกค้าถือบัตรประชาชนข้างหน้า
   - เห็นหน้าและบัตรชัดเจน

3. **ลายเซ็นลูกค้า** (`customerSignature`)
   - ลายเซ็นจริงของลูกค้า
   - ใช้ในการยืนยันตัวตน

### ไม่บังคับ (Optional)
1. **สลิปเงินเดือน** (`salarySlip`)
   - ช่วยในการประเมินฐานะทางการเงิน
   - สลิปล่าสุด (ไม่เกิน 3 เดือน)

2. **ลายเซ็นพนักงานขาย** (`salespersonSignature`)
   - ยืนยันการทำรายการ
   - รับผิดชอบโดยพนักงาน

## การตรวจสอบและ Validation

### ระดับ Frontend
```javascript
// ตรวจสอบไฟล์
const validation = documentUploadHandler.validateFile(file);
if (!validation.isValid) {
  throw new Error(validation.error);
}

// ตรวจสอบเอกสารครบถ้วน
const docValidation = documentManager.validateDocuments();
if (!docValidation.isValid) {
  console.log('Missing:', docValidation.missingDocuments);
}
```

### ระดับ Backend
```javascript
// ตรวจสอบประเภทไฟล์
const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

// ตรวจสอบขนาดไฟล์
const maxSize = 10 * 1024 * 1024; // 10MB
```

## การเชื่อมต่อกับ installmentController

### การเตรียมข้อมูลสำหรับส่งฟอร์ม
```javascript
// เตรียม attachments สำหรับ installmentController
const attachments = {
  id_card_image: documentData.idCard.url,
  selfie_image: documentData.selfie.url,
  income_slip: documentData.salarySlip?.url || '',
  customer_signature: documentData.customerSignature.url,
  salesperson_signature: documentData.salespersonSignature?.url || ''
};

// ส่งไปยัง API
await fetch('/api/installment', {
  method: 'POST',
  body: JSON.stringify({
    attachments,
    // ... ข้อมูลอื่นๆ
  })
});
```

## Storage Strategy

### Local Storage (Fallback)
เมื่อไม่สามารถอัปโหลดไปยัง server ได้:
```javascript
// บันทึกเป็น base64
const base64Data = await fileToBase64(file);
localStorage.setItem(`document_${documentType}_${customerId}`, JSON.stringify({
  data: base64Data,
  type: file.type,
  size: file.size,
  uploadedAt: new Date().toISOString()
}));
```

### Server Storage
ไฟล์ถูกเก็บใน `uploads/documents/` ตามรูปแบบ:
```
{documentType}_{customerId}_{timestamp}.{ext}
```

## Error Handling

### การจัดการข้อผิดพลาด
```javascript
try {
  await documentManager.handleFileUpload(documentType, file);
} catch (error) {
  if (error.message.includes('ไฟล์ใหญ่เกินไป')) {
    // แสดงข้อความเตือนขนาดไฟล์
  } else if (error.message.includes('ประเภทไฟล์ไม่ถูกต้อง')) {
    // แสดงข้อความเตือนประเภทไฟล์
  } else {
    // ข้อผิดพลาดทั่วไป
  }
  documentManager.updateDocumentStatus(documentType, 'error');
}
```

## Performance Optimization

### การจัดการ Memory
```javascript
// ทำความสะอาด Object URLs
URL.revokeObjectURL(documentUrl);

// ล้างข้อมูลเมื่อออกจากหน้า
window.addEventListener('beforeunload', () => {
  documentUploadHandler.cleanup();
});
```

### การบีบอัดรูปภาพ
```javascript
// บีบอัดรูปภาพก่อนอัปโหลด
canvas.toBlob(callback, 'image/jpeg', 0.8); // คุณภาพ 80%
```

## การใช้งาน

### 1. เริ่มต้นใช้งาน
```javascript
// ระบบจะ initialize อัตโนมัติเมื่อโหลดหน้า
console.log('Document Manager:', window.documentManager);
console.log('Upload Handler:', window.documentUploadHandler);
```

### 2. การตรวจสอบสถานะ
```javascript
// ตรวจสอบความคืบหน้า
const progress = documentUploadHandler.getUploadProgress();
console.log(`Progress: ${progress.percentage}%`);

// ตรวจสอบเอกสารที่จำเป็น
const validation = documentManager.validateDocuments();
if (validation.isValid) {
  // พร้อมไปขั้นตอนถัดไป
}
```

### 3. การนำทางไป Step 3
```javascript
// ระบบจะตรวจสอบอัตโนมัติก่อนนำทาง
document.getElementById('btnStep2ToStep3').click();
```

## การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

1. **กล้องไม่ทำงาน**
   - ตรวจสอบ permission ของ browser
   - ใช้ HTTPS สำหรับ camera access

2. **อัปโหลดไม่สำเร็จ**
   - ตรวจสอบ network connection
   - ระบบจะใช้ localStorage เป็น fallback

3. **ลายเซ็นไม่ทำงาน**
   - ตรวจสอบว่า SignaturePad library โหลดแล้ว
   - ตรวจสอบ touch events บน mobile

### Debug Commands
```javascript
// ตรวจสอบสถานะเอกสาร
console.table(window.documentManager.documents);

// ตรวจสอบการอัปโหลด
console.table(window.documentUploadHandler.uploadedDocuments);

// ทดสอบการตรวจสอบ
window.documentManager.validateDocuments();
```

## สรุป

ระบบเอกสารประกอบการสมัครผ่อนใน Step 2 ได้รับการพัฒนาให้ใช้งานได้จริงแล้ว มีฟีเจอร์ครบถ้วนและการจัดการข้อผิดพลาดที่ดี รองรับทั้งการทำงานออนไลน์และออฟไลน์ พร้อมเชื่อมต่อกับ installmentController สำหรับการสร้างสัญญาผ่อน 