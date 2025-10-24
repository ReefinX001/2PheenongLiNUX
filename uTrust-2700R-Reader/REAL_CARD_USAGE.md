# การใช้งานกับบัตรประชาชนจริง

## ขั้นตอนการเตรียมระบบ

### 1. ตรวจสอบ Driver เครื่องอ่านบัตร
- ตรวจสอบว่าติดตั้ง Driver สำหรับ uTrust 2700 R แล้ว
- เปิด Device Manager และตรวจสอบใน "Smart card readers"
- ควรเห็น "uTrust 2700 R Smart Card Reader" หรือชื่อที่คล้ายกัน

### 2. ตรวจสอบ Windows Smart Card Service
```powershell
# ตรวจสอบสถานะ Smart Card Service
sc query SCardSvr

# เริ่มต้น Smart Card Service หากไม่ได้รัน
sc start SCardSvr
```

### 3. เชื่อมต่อเครื่องอ่านบัตร
- เสียบ uTrust 2700 R เข้า USB port
- รอให้ Windows ติดตั้ง driver อัตโนมัติ
- ตรวจสอบใน Device Manager ว่าเครื่องอ่านบัตรแสดงสถานะ "Working properly"

## การทดสอบการอ่านบัตร

### ขั้นตอนการทดสอบ:

1. **เริ่มต้นเซอร์วิส**
   ```bash
   npm start
   # หรือ
   $env:PORT=4000; node src/server.js
   ```

2. **ใส่บัตรประชาชน**
   - ใส่บัตรประชาชนลงในเครื่องอ่านบัตร
   - รอให้เซอร์วิสตรวจจับบัตร (ประมาณ 2-3 วินาที)

3. **ทดสอบการอ่านบัตร**
   ```bash
   # ใช้ test script
   node test-card-reader-alt.js
   
   # หรือเรียกใช้ API โดยตรง
   curl -X POST http://localhost:4000/read-card
   ```

### API Endpoints:

- `GET /health` - ตรวจสอบสถานะเซอร์วิส
- `POST /read-card` - อ่านข้อมูลบัตรประชาชน
- `GET /api/status` - สถานะเครื่องอ่านบัตร
- `GET /api/config` - การตั้งค่าเซอร์วิส

## ข้อมูลที่อ่านได้จากบัตรประชาชน

เมื่ออ่านบัตรสำเร็จ จะได้ข้อมูลดังนี้:

```json
{
  "success": true,
  "data": {
    "Citizenid": "1234567890123",
    "TitleTh": "นาย",
    "FirstNameTh": "สมชาย",
    "LastNameTh": "ใจดี", 
    "TitleEn": "Mr.",
    "FirstNameEn": "Somchai",
    "LastNameEn": "Jaidee",
    "Address": "บ้านเลขที่ 123 หมู่ 1 ตำบลในเมือง อำเภอเมือง จังหวัดกรุงเทพฯ 10110",
    "BirthDate": "19900101",
    "Gender": "M",
    "IssueDate": "20200101",
    "ExpireDate": "20270101",
    "Issuer": "สำนักงานจดทะเบียน",
    "Nationality": "ไทย"
  }
}
```

## การแก้ไขปัญหา

### ปัญหาที่พบบ่อย:

1. **"No card reader device available"**
   - ตรวจสอบการเชื่อมต่อ USB
   - ตรวจสอบ Driver ใน Device Manager
   - รีสตาร์ท Smart Card Service

2. **"Failed to select Thai ID card applet"**
   - ตรวจสอบว่าใส่บัตรประชาชนแล้ว
   - ลองใส่บัตรใหม่
   - ตรวจสอบว่าบัตรไม่เสียหาย

3. **"Card read timeout"**
   - ทำความสะอาดบัตรและเครื่องอ่าน
   - ตรวจสอบการเชื่อมต่อ USB
   - ลองใส่บัตรใหม่

### Log Files:
- ดู log ในโฟลเดอร์ `logs/` เพื่อวิเคราะห์ปัญหา
- Log level สามารถปรับได้ในไฟล์ config

## ข้อกำหนดระบบ

- **OS**: Windows 10/11
- **Node.js**: 18+
- **Memory**: 512MB+
- **USB**: USB 2.0 ขึ้นไป
- **Driver**: uTrust 2700 R Driver
- **Service**: Windows Smart Card Service

## การใช้งานใน Production

1. **ติดตั้งเป็น Windows Service**
   ```bash
   npm run install-service
   npm run start-service
   ```

2. **การตั้งค่า Security**
   - กำหนด IP ที่อนุญาตในไฟล์ config
   - ใช้ HTTPS ใน production
   - ตั้งค่า Firewall ให้เหมาะสม

3. **Monitoring**
   - ตรวจสอบ health check endpoint
   - ตั้งค่า logging ที่เหมาะสม
   - ติดตาม performance metrics

## การสนับสนุน

หากพบปัญหาในการใช้งาน:
1. ตรวจสอบ log files
2. ทดสอบด้วย test script
3. ติดต่อทีมสนับสนุนพร้อมข้อมูล log 