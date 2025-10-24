# uTrust 2700 R Smart Card Reader - Windows Service คู่มือการใช้งาน

## สารบัญ
- [ข้อกำหนดเบื้องต้น](#ข้อกำหนดเบื้องต้น)
- [การติดตั้ง Windows Service](#การติดตั้ง-windows-service)
- [การจัดการ Service](#การจัดการ-service)
- [การตรวจสอบสถานะ](#การตรวจสอบสถานะ)
- [การแก้ไขปัญหา](#การแก้ไขปัญหา)
- [การอัพเดท](#การอัพเดท)

---

## ข้อกำหนดเบื้องต้น

### ระบบปฏิบัติการ
- Windows 10 (version 1809 หรือใหม่กว่า)
- Windows 11
- Windows Server 2019/2022

### Software Requirements
- **Node.js 18.0.0 หรือใหม่กว่า** (LTS แนะนำ)
- **npm 8.0.0 หรือใหม่กว่า**
- **Administrator privileges** สำหรับการติดตั้ง Service

### Hardware Requirements
- uTrust 2700 R Smart Card Reader
- USB Port สำหรับเชื่อมต่อ Card Reader
- RAM 2GB ขึ้นไป
- พื้นที่ Hard Disk 500MB ขึ้นไป

---

## การติดตั้ง Windows Service

### วิธีที่ 1: ใช้ Batch File (แนะนำสำหรับผู้ใช้ทั่วไป)

1. **เปิด File Explorer และไปที่โฟลเดอร์ uTrust-2700R-Reader**

2. **Right-click บนไฟล์ `install-windows-service.bat`**

3. **เลือก "Run as Administrator"**

4. **ตามขั้นตอนในหน้าจอ**
   ```
   ============================================================
   uTrust 2700 R Smart Card Reader - Windows Service Installer
   2 Pheenong Mobile Co., Ltd.
   ============================================================
   
   [INFO] Running with Administrator privileges ✓
   [INFO] Node.js Version: v18.17.0
   [INFO] npm is available ✓
   [INFO] package.json found ✓
   [INFO] Dependencies installed ✓
   [INFO] node-windows package found ✓
   
   [INFO] Installing Windows Service...
   ```

5. **รอจนติดตั้งเสร็จสิ้น**

### วิธีที่ 2: ใช้ Command Line

1. **เปิด Command Prompt as Administrator**
   - กด `Win + X` เลือก "Windows PowerShell (Admin)" หรือ "Command Prompt (Admin)"

2. **ไปที่โฟลเดอร์ที่ติดตั้ง**
   ```cmd
   cd "C:\uTrust-2700R-Reader"
   ```

3. **ติดตั้ง Dependencies (ถ้ายังไม่ได้ทำ)**
   ```cmd
   npm install
   ```

4. **ติดตั้ง Windows Service**
   ```cmd
   npm run install-service
   ```

5. **เริ่ม Service**
   ```cmd
   npm run start-service
   ```

---

## การจัดการ Service

### คำสั่ง npm สำหรับจัดการ Service

```bash
# การติดตั้งและถอนการติดตั้ง
npm run install-service      # ติดตั้งเป็น Windows Service
npm run uninstall-service    # ถอนการติดตั้ง Service

# การควบคุม Service
npm run start-service        # เริ่ม Service
npm run stop-service         # หยุด Service  
npm run restart-service      # รีสตาร์ท Service
npm run service-status       # ตรวจสอบสถานะ Service
```

### การจัดการผ่าน Windows Services Manager

1. **เปิด Services Manager**
   - กด `Win + R` พิมพ์ `services.msc` แล้วกด Enter
   - หรือใน Start Menu ค้นหา "Services"

2. **ค้นหา Service**
   - ค้นหา "uTrust 2700 R Smart Card Reader Service"
   - หรือเรียงตามชื่อ และหา "uTrust"

3. **การจัดการ Service**
   - **Start**: Right-click → Start
   - **Stop**: Right-click → Stop  
   - **Restart**: Right-click → Restart
   - **Properties**: Right-click → Properties

4. **การตั้งค่า Startup Type**
   - Right-click → Properties → General Tab
   - Startup type:
     - **Automatic**: เริ่มอัตโนมัติเมื่อเปิดเครื่อง (แนะนำ)
     - **Manual**: เริ่มเมื่อมีการเรียกใช้
     - **Disabled**: ปิดการใช้งาน

---

## การตรวจสอบสถานะ

### คำสั่ง npm run service-status

```cmd
npm run service-status
```

ผลลัพธ์ที่ได้:
```
============================================================
uTrust 2700 R Smart Card Reader - Service Status  
2 Pheenong Mobile Co., Ltd.
============================================================

📋 Windows Service Status:
   Service Name: uTrust-2700R-CardReader-Service
   Display Name: uTrust 2700 R Smart Card Reader Service
   Exists: ✅ Yes
   State: 🟢 running
   PID: 1234
   Description: Service for reading Thai ID cards using uTrust 2700 R Smart Card Reader

🌐 API Server Status:
   📡 API Server: ✅ Accessible
   🔍 Health Check: ✅ Passed
   🌐 URL: http://localhost:3999
   📝 Version: 1.0.0

📄 Log Files:
   📄 service.log: 245KB (12/21/2024, 10:30:00 AM)
   📄 card-reader.log: 12KB (12/21/2024, 10:29:45 AM)
   📄 error.log: 1KB (12/21/2024, 10:25:12 AM)

⚙️ Configuration:
   🔧 Service Port: 3999
   🔧 Host: localhost
   🔧 Card Reader: uTrust 2700 R
   🔧 Auto Connect: ✅ Yes

🎯 Available Endpoints:
   GET|POST /read-card     # Read Thai ID card
   GET /health            # Service health check
   GET /api/status        # Reader status
   GET /api/config        # Service configuration
```

### การตรวจสอบผ่าน Web Browser

1. **เปิด Web Browser**
2. **ไปที่ URL:**
   - Health Check: `http://localhost:3999/health`
   - API Documentation: `http://localhost:3999/`

---

## การแก้ไขปัญหา

### 1. Service ติดตั้งไม่สำเร็จ

**สาเหตุที่เป็นไปได้:**
- ไม่ได้รันเป็น Administrator
- Node.js version ไม่ถูกต้อง
- node-windows package หายไป

**วิธีแก้ไข:**
```cmd
# 1. ตรวจสอบ Administrator privileges
net session

# 2. ตรวจสอบ Node.js version
node --version

# 3. ลง node-windows ใหม่
npm install node-windows --save

# 4. ลองติดตั้งใหม่
npm run install-service
```

### 2. Service ไม่เริ่มต้น

**สาเหตุที่เป็นไปได้:**
- Port 3999 ถูกใช้งานแล้ว
- uTrust 2700 R driver ไม่ได้ติดตั้ง
- Configuration ผิดพลาด

**วิธีแก้ไข:**
```cmd
# 1. ตรวจสอบ port ที่ใช้งานอยู่
netstat -an | findstr 3999

# 2. ตรวจสอบ service logs  
npm run service-status

# 3. ตรวจสอบ Event Viewer
# Win + X → Event Viewer → Windows Logs → Application
# ค้นหา error จาก "uTrust" หรือ "Node.js"
```

### 3. API ไม่ตอบสนอง

**สาเหตุที่เป็นไปได้:**
- Windows Firewall บล็อก port 3999
- Service หยุดทำงาน
- Card Reader ไม่ได้เชื่อมต่อ

**วิธีแก้ไข:**
```cmd
# 1. เช็คสถานะ service
npm run service-status

# 2. เช็ค Windows Firewall
# Control Panel → System and Security → Windows Defender Firewall
# → Allow an app through firewall
# ค้นหา "Node.js" และอนุญาต

# 3. ทดสอบ API
curl http://localhost:3999/health
```

### 4. Card Reader ไม่ทำงาน

**วิธีตรวจสอบ:**
1. **Device Manager**
   - Win + X → Device Manager
   - ค้นหาใน "Smart card readers" หรือ "USB devices"
   - ต้องมี uTrust 2700 R หรือ Identiv device

2. **Services**
   - ตรวจสอบ "Smart Card" service ใน services.msc
   - ต้องเป็น "Running"

3. **Log Files**
   ```cmd
   # ดู log ของ card reader
   type logs\card-reader.log
   ```

### 5. Service หยุดทำงานเอง

**วิธีตรวจสอบ:**
```cmd
# 1. ดู error logs
type logs\error.log
type logs\service-error.log

# 2. ตรวจสอบ memory usage
tasklist /fi "imagename eq node.exe"

# 3. ตรวจสอบ Event Viewer
# Application logs มองหา Node.js crashes
```

---

## การอัพเดท

### อัพเดท Service ใหม่

1. **หยุด Service**
   ```cmd
   npm run stop-service
   ```

2. **ถอนการติดตั้ง Service เก่า**
   ```cmd
   npm run uninstall-service
   ```

3. **อัพเดทไฟล์ใหม่**
   - Copy ไฟล์ใหม่ทับของเก่า
   - หรือ `git pull` ถ้าใช้ Git

4. **ติดตั้ง dependencies ใหม่**
   ```cmd
   npm install
   ```

5. **ติดตั้ง Service ใหม่**
   ```cmd
   npm run install-service
   ```

6. **เริ่ม Service**
   ```cmd
   npm run start-service
   ```

### การ Backup Configuration

**ก่อนอัพเดท ควร backup:**
- `config/branches.json`
- `config/default.json` (ถ้ามีการแก้ไข)
- `logs/` folder (ถ้าต้องการเก็บ logs เก่า)

---

## Log Files และ Monitoring

### ตำแหน่ง Log Files
```
logs/
├── service.log              # General service logs
├── card-reader.log          # Card reader specific logs  
├── error.log               # Application errors
└── service-error.log       # Windows Service errors
```

### การดู Logs แบบ Real-time
```cmd
# Windows PowerShell
Get-Content logs\service.log -Wait -Tail 10

# Command Prompt  
tail -f logs\service.log   # ต้องติดตั้ง tail utility
```

### Log Rotation
- Logs จะ rotate อัตโนมัติทุกวัน
- เก็บไฟล์ logs สูงสุด 14 วัน
- ไฟล์ logs เก่าจะถูกลบอัตโนมัติ

---

## ข้อควรระวัง

### Security
- Service จะรันด้วย Local System account
- อนุญาต firewall เฉพาะ localhost เท่านั้น
- ไม่เปิด port 3999 ให้ external access

### Performance  
- Service ใช้ memory ประมาณ 50-100MB
- CPU usage ปกติ < 1%
- เมื่ออ่านบัตร CPU อาจพุ่งขึ้น 10-20% ชั่วคราว

### การใช้งานร่วมกับ Firewall/Antivirus
- อาจต้องเพิ่ม exception สำหรับ Node.js
- หาก Antivirus บล็อกต้องเพิ่มใน whitelist

---

## การสนับสนุน

### ติดต่อสนับสนุน
- 📧 Email: support@2pheenong.com  
- 📞 Tel: 073-xxx-xxxx
- 🐛 GitHub Issues: [Repository]/issues

### การรายงานปัญหา
กรุณาแนบข้อมูลต่อไปนี้:
1. Windows version
2. Node.js version  
3. ผลลัพธ์จาก `npm run service-status`
4. Log files จาก `logs/` folder
5. Screenshots หรือ error messages

---

**หมายเหตุ**: คู่มือนี้อัพเดทล่าสุด เดือน ธันวาคม 2024 สำหรับ uTrust 2700 R Smart Card Reader Service v1.0.0 