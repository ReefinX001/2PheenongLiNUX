# uTrust 2700 R Smart Card Reader Client Service

ระบบเชื่อมต่อเครื่องอ่านบัตรประชาชน uTrust 2700 R สำหรับใช้งานกับระบบ POS และ Installment ผ่าน Tailscale Network

## ภาพรวมระบบ

```
┌─────────────────┐    Tailscale     ┌──────────────────┐
│   Client PC     │◄────────────────►│  Windows Server  │
│ 100.106.108.57  │                  │ 100.110.180.13   │
│                 │                  │                  │
│ ┌─────────────┐ │                  │ ┌──────────────┐ │
│ │Card Reader  │ │                  │ │Main App      │ │
│ │Service      │ │                  │ │my-accounting │ │
│ │:3999        │ │                  │ │-app          │ │
│ └─────────────┘ │                  │ └──────────────┘ │
│ ┌─────────────┐ │                  │                  │
│ │uTrust 2700R │ │                  │                  │
│ │Smart Card   │ │                  │                  │
│ │Reader       │ │                  │                  │
│ └─────────────┘ │                  │                  │
└─────────────────┘                  └──────────────────┘
```

## คุณสมบัติ

- 🔌 เชื่อมต่อ uTrust 2700 R Smart Card Reader โดยตรง
- 🌐 Web API ที่ browser เรียกใช้ได้ (localhost:3999)
- 🔐 รองรับการอ่านบัตรประชาชนไทย
- 🏢 รองรับการใช้งานหลายสาขา
- 🔗 เชื่อมต่อผ่าน Tailscale Network
- 📊 Logging และ Monitoring
- 🛡️ Security และ Error Handling

## IP Configuration สาขาต่างๆ

| สาขา | Client IP (Tailscale) | Server IP | Port |
|------|---------------------|-----------|------|
| สำนักงานใหญ่ | 100.110.180.13 | 100.110.180.13 | 3999 |
| ปัตตานี | 100.106.108.57 | 100.110.180.13 | 3999 |
| สงขลา | 100.106.108.58 | 100.110.180.13 | 3999 |
| ยะลา | 100.106.108.59 | 100.110.180.13 | 3999 |
| นราธิวาส | 100.106.108.60 | 100.110.180.13 | 3999 |

## การติดตั้ง

### 1. ข้อกำหนดระบบ
- Windows 10/11
- Node.js 18+ 
- uTrust 2700 R Smart Card Reader + Driver
- Tailscale Client

### 2. ติดตั้ง Driver เครื่องอ่านบัตร
1. ติดตั้ง uTrust 2700 R Driver จากเว็บไซต์ผู้ผลิต
2. เสียบเครื่องอ่านบัตรและตรวจสอบใน Device Manager

### 3. ติดตั้งและตั้งค่า
```bash
# คัดลอกโฟลเดอร์ไปยัง C:\SmartCardReader\
cd C:\SmartCardReader
npm install
```

### 4. การตั้งค่า
แก้ไขไฟล์ `config/branches.json` ตามสาขาของคุณ

### 5. เลือกวิธีการรัน

#### A. รันเป็น Windows Service (แนะนำ)
```bash
# วิธีที่ 1: ใช้ Batch File (ง่ายที่สุด)
# Right-click บน install-windows-service.bat → Run as Administrator

# วิธีที่ 2: ใช้ npm commands
npm run install-service    # ติดตั้ง service
npm run start-service      # เริ่ม service
npm run service-status     # ตรวจสอบสถานะ
```

#### B. รันแบบปกติ (สำหรับทดสอบ)
```bash
npm start
# หรือ
npm run dev
```

## การจัดการ Windows Service

### คำสั่งการจัดการ Service
```bash
# ติดตั้ง/ถอนการติดตั้ง
npm run install-service      # ติดตั้งเป็น Windows Service
npm run uninstall-service    # ถอนการติดตั้ง Service

# การควบคุม Service
npm run start-service        # เริ่ม Service
npm run stop-service         # หยุด Service
npm run restart-service      # รีสตาร์ท Service
npm run service-status       # ตรวจสอบสถานะ Service

# ไฟล์ Batch สำหรับ Administrator
install-windows-service.bat    # ติดตั้ง Service (Run as Admin)
uninstall-windows-service.bat  # ถอนการติดตั้ง Service (Run as Admin)
```

### การจัดการผ่าน Windows Services Manager
1. กด `Win + R` แล้วพิมพ์ `services.msc`
2. ค้นหา "uTrust 2700 R Smart Card Reader Service"
3. Right-click เพื่อ Start/Stop/Restart
4. Properties → Startup type เพื่อเปลี่ยนแปลงการเริ่มต้นอัตโนมัติ

### ข้อดีของ Windows Service
- ✅ เริ่มต้นอัตโนมัติเมื่อเปิดเครื่อง
- ✅ ทำงานใน Background ไม่ต้องเปิด Command Prompt
- ✅ มีระบบ Auto-restart เมื่อเกิดข้อผิดพลาด
- ✅ จัดการผ่าน Windows Services Manager ได้
- ✅ Log ระบบครบถ้วน

## การใช้งาน

### จาก Web Browser
```javascript
// อ่านข้อมูลบัตรประชาชน
const response = await fetch('http://localhost:3999/read-card');
const data = await response.json();

if (data.success) {
    console.log('ข้อมูลบัตร:', data.data);
    // data.data.Citizenid - เลขบัตรประชาชน
    // data.data.TitleTh - คำนำหน้า
    // data.data.FirstNameTh - ชื่อ
    // data.data.LastNameTh - นามสกุล
    // data.data.Address - ที่อยู่
}
```

### API Endpoints
- `GET /health` - ตรวจสอบสถานะบริการ
- `POST /read-card` - อ่านข้อมูลบัตรประชาชน
- `GET /reader-status` - สถานะเครื่องอ่านบัตร
- `GET /config` - ข้อมูลการตั้งค่า

## Troubleshooting

### ปัญหาที่พบบ่อย
1. **ไม่พบเครื่องอ่านบัตร**
   - ตรวจสอบการเชื่อมต่อ USB
   - ตรวจสอบ Driver ใน Device Manager

2. **ไม่สามารถเชื่อมต่อ API ได้**
   - ตรวจสอบ Windows Firewall
   - ตรวจสอบว่าบริการรันอยู่หรือไม่

3. **Tailscale Connection Issues**
   - ตรวจสอบ Tailscale Client
   - ตรวจสอบ Network connectivity

### Log Files
- `logs/service.log` - Service logs
- `logs/card-reader.log` - Card reader specific logs
- `logs/error.log` - Error logs
- `logs/service-error.log` - Windows Service specific errors

### Windows Service Troubleshooting
1. **Service ไม่เริ่มต้น**
   - ตรวจสอบ Event Viewer → Windows Logs → Application
   - ดู logs ใน `logs/service-error.log`
   - ตรวจสอบ port 3999 ว่าถูกใช้งานแล้วหรือไม่

2. **Service ติดตั้งไม่สำเร็จ**
   - รันใน Command Prompt as Administrator
   - ตรวจสอบ Node.js version (ต้อง 16+)
   - ตรวจสอบว่า node-windows package ติดตั้งแล้ว

3. **Service หยุดทำงานเอง**
   - ตรวจสอบ logs ใน `logs/` folder
   - ตรวจสอบ Memory usage
   - เช็ค Windows Services Manager

## การอัพเดท

```bash
cd C:\SmartCardReader
git pull origin main
npm install
npm run restart
```

## การสนับสนุน

สำหรับการสนับสนุนและแก้ไขปัญหา:
- 📧 Email: support@2pheenong.com
- 📞 Tel: 073-xxx-xxxx
- 🐛 GitHub Issues: [Repository]/issues

---

**หมายเหตุ**: ระบบนี้ออกแบบมาเพื่อใช้งานกับ uTrust 2700 R Smart Card Reader โดยเฉพาะ และต้องการ Driver ที่เหมาะสม 