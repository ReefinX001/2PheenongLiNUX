# 🏢 Branch Management Guide
## การจัดการสาขาและ IP Configuration สำหรับระบบเครื่องอ่านบัตร uTrust 2700 R

### 📋 Table of Contents
- [🔧 การอัพเดท Client IP และ Server IP](#การอัพเดท-client-ip-และ-server-ip)
- [➕ การเพิ่มสาขาใหม่](#การเพิ่มสาขาใหม่)
- [📁 ไฟล์ Configuration หลัก](#ไฟล์-configuration-หลัก)
- [🌐 Tailscale Network Setup](#tailscale-network-setup)
- [🧪 การทดสอบระบบ](#การทดสอบระบบ)
- [🔍 Troubleshooting](#troubleshooting)
- [📖 ตัวอย่างการใช้งาน](#ตัวอย่างการใช้งาน)

---

## 🔧 การอัพเดท Client IP และ Server IP

### ไฟล์หลักที่ต้องแก้ไข

**📄 `config/branches.json`** - Configuration หลักของระบบ

```json
{
  "branches": {
    "branch_name": {
      "branch_code": "00001",
      "name": "ชื่อสาขา",
      "clientIP": "100.106.108.57",              // 🔧 IP ของเครื่องที่มี card reader
      "serverIP": "100.110.180.13",              // 🔧 IP ของ web server หลัก
      "port": 3999,
      "cardReaderServerUrl": "http://100.106.108.57:3999", // 🔧 URL ของ card reader service
      "active": true,
      "features": {
        "pos": true,
        "installment": true,
        "cardReader": true
      },
      "cardReaderSettings": {
        "model": "uTrust 2700 R",
        "enabled": true,
        "autoConnect": true,
        "timeout": 30000
      }
    }
  }
}
```

### ขั้นตอนการอัพเดท IP

1. **เปิดไฟล์ configuration:**
   ```bash
   cd uTrust-2700R-Reader
   notepad config/branches.json
   # หรือ
   vim config/branches.json
   ```

2. **แก้ไขค่า IP สำหรับสาขาที่ต้องการ:**
   - `clientIP`: IP ของเครื่องที่ติดตั้ง card reader
   - `serverIP`: IP ของ web server หลัก (มักจะเป็น 100.110.180.13)
   - `cardReaderServerUrl`: URL เต็มของ card reader service

3. **บันทึกไฟล์และ restart service**

---

## ➕ การเพิ่มสาขาใหม่

### Template สำหรับสาขาใหม่

```json
"new_branch_name": {
  "branch_code": "00005",                    // รหัสสาขาใหม่ (ต้องไม่ซ้ำ)
  "name": "สาขาหาดใหญ่",                     // ชื่อสาขา
  "clientIP": "100.106.108.61",             // IP ของเครื่อง card reader
  "serverIP": "100.110.180.13",             // IP ของ web server
  "port": 3999,
  "cardReaderServerUrl": "http://100.106.108.61:3999",
  "active": true,                           // เปิดใช้งาน
  "features": {
    "pos": true,
    "installment": true,
    "cardReader": true
  },
  "cardReaderSettings": {
    "model": "uTrust 2700 R",
    "enabled": true,
    "autoConnect": true,
    "timeout": 30000
  }
}
```

### ขั้นตอนการเพิ่มสาขา

1. **เพิ่ม branch configuration ใน `branches.json`**
2. **อัพเดท Tailscale network list**
3. **ติดตั้ง card reader service ในเครื่องใหม่**
4. **ทดสอบการเชื่อมต่อ**

---

## 📁 ไฟล์ Configuration หลัก

### Structure ของ branches.json

```json
{
  "branches": {
    // สาขาต่างๆ
  },
  "currentBranch": {
    "auto": true,
    "method": "ip-detection",           // วิธีการตรวจจับสาขา
    "fallback": "headquarters"          // สาขา default
  },
  "networking": {
    "tailscale": {
      "meshNetwork": "100.x.x.x",
      "serverNode": "100.110.180.13",    // Web server หลัก
      "clientNodes": [                   // รายการ IP ของ card reader clients
        "100.106.108.57",               // ปัตตานี
        "100.106.108.58",               // สงขลา
        "100.106.108.59",               // ยะลา
        "100.106.108.60",               // นราธิวาส
        "100.106.108.61"                // สาขาใหม่
      ]
    },
    "connectivity": {
      "pingInterval": 30000,            // ตรวจสอบการเชื่อมต่อทุก 30 วินาที
      "timeout": 5000,                  // Timeout 5 วินาที
      "retryAttempts": 3                // ลองใหม่ 3 ครั้ง
    }
  }
}
```

### สาขาที่มีอยู่ปัจจุบัน

| Branch Code | Name | Client IP | Status |
|-------------|------|-----------|---------|
| 00000 | สำนักงานใหญ่ | 100.110.180.13 | ✅ Active |
| 00001 | สาขาปัตตานี | 100.106.108.57 | ✅ Active |
| 00002 | สาขาสงขลา | 100.106.108.58 | ❌ Inactive |
| 00003 | สาขายะลา | 100.106.108.59 | ❌ Inactive |
| 00004 | สาขานราธิวาส | 100.106.108.60 | ❌ Inactive |

---

## 🌐 Tailscale Network Setup

### การเพิ่ม Client Node ใหม่

1. **อัพเดท clientNodes list:**
   ```json
   "clientNodes": [
     "100.106.108.57",
     "100.106.108.58", 
     "100.106.108.59",
     "100.106.108.60",
     "100.106.108.61"  // ← เพิ่ม IP ใหม่
   ]
   ```

2. **ติดตั้ง Tailscale ในเครื่องใหม่:**
   ```bash
   # Windows
   # Download และติดตั้ง Tailscale จาก https://tailscale.com/download
   
   # ลงทะเบียนเข้า network
   tailscale login
   ```

3. **ตรวจสอบการเชื่อมต่อ:**
   ```bash
   # ตรวจสอบ IP ที่ได้รับ
   tailscale ip
   
   # ทดสอบ ping ไปยัง server หลัก
   ping 100.110.180.13
   ```

---

## 🧪 การทดสอบระบบ

### 1. ทดสอบ Card Reader Service

```bash
# ในเครื่อง card reader client
cd uTrust-2700R-Reader
node start-server.js

# ทดสอบ API
curl http://localhost:3999/api/status
curl http://localhost:3999/api/read-card
```

### 2. ทดสอบจาก Web Server

```bash
# ทดสอบเชื่อมต่อไปยังสาขาเฉพาะ
curl http://100.106.108.61:3999/api/status

# ทดสอบผ่าน main API
curl -X POST http://localhost:3000/api/read-card \
  -H "Content-Type: application/json" \
  -H "X-Branch-Code: 00005"
```

### 3. ทดสอบผ่าน Browser

```javascript
// ในเว็บแอพพลิเคชัน
fetch('/api/read-card', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Branch-Code': '00005'  // รหัสสาขาที่ต้องการ
  }
})
.then(response => response.json())
.then(data => console.log(data));

// ตรวจสอบสถานะทุกสาขา
fetch('/api/read-card/branches')
  .then(response => response.json())
  .then(data => console.log(data));
```

---

## 🔍 Troubleshooting

### ปัญหาที่พบบ่อย

#### 1. ❌ Card Reader Service ไม่ตอบสนอง

**สาเหตุ:**
- Service ไม่ทำงาน
- Firewall block port 3999
- Tailscale ไม่เชื่อมต่อ

**วิธีแก้:**
```bash
# ตรวจสอบ service
netstat -an | findstr 3999

# เช็ค firewall (Windows)
netsh advfirewall firewall show rule name=all | findstr 3999

# เพิ่ม firewall rule
netsh advfirewall firewall add rule name="uTrust Card Reader" dir=in action=allow protocol=TCP localport=3999

# ตรวจสอบ Tailscale
tailscale status
tailscale ping 100.110.180.13
```

#### 2. ❌ Branch ไม่ถูกตรวจจับ

**สาเหตุ:**
- IP ไม่ตรงกับ configuration
- Branch ถูกปิดใช้งาน (active: false)
- Cache ยังไม่ expire

**วิธีแก้:**
```bash
# ตรวจสอบ IP ปัจจุบัน
ipconfig
tailscale ip

# ตรวจสอบ branch config
node -e "console.log(JSON.stringify(require('./config/branches.json'), null, 2))"

# Clear cache (restart web server)
```

#### 3. ❌ การเชื่อมต่อ Timeout

**สาเหตุ:**
- Network latency สูง
- Card reader หลุดจาก USB
- Service busy

**วิธีแก้:**
```json
// เพิ่ม timeout ใน cardReaderSettings
"cardReaderSettings": {
  "timeout": 60000  // เพิ่มเป็น 60 วินาที
}
```

---

## 📖 ตัวอย่างการใช้งาน

### Example 1: เพิ่มสาขาหาดใหญ่

1. **แก้ไข `config/branches.json`:**
```json
"hatyai": {
  "branch_code": "00005",
  "name": "สาขาหาดใหญ่",
  "clientIP": "100.106.108.61",
  "serverIP": "100.110.180.13",
  "port": 3999,
  "cardReaderServerUrl": "http://100.106.108.61:3999",
  "active": true,
  "features": {
    "pos": true,
    "installment": true,
    "cardReader": true
  },
  "cardReaderSettings": {
    "model": "uTrust 2700 R",
    "enabled": true,
    "autoConnect": true,
    "timeout": 30000
  }
}
```

2. **อัพเดท networking section:**
```json
"networking": {
  "tailscale": {
    "clientNodes": [
      "100.106.108.57",
      "100.106.108.58", 
      "100.106.108.59",
      "100.106.108.60",
      "100.106.108.61"  // ← เพิ่มใหม่
    ]
  }
}
```

### Example 2: เปลี่ยน IP ของสาขาปัตตานี

```json
"pattani": {
  "branch_code": "00001",
  "name": "สาขาปัตตานี",
  "clientIP": "100.106.108.70",              // ← เปลี่ยน IP ใหม่
  "serverIP": "100.110.180.13",
  "cardReaderServerUrl": "http://100.106.108.70:3999", // ← อัพเดท URL
  // ... ส่วนอื่นเหมือนเดิม
}
```

### Example 3: การทดสอบแบบเฉพาะสาขา

```bash
# ทดสอบสาขาหาดใหญ่โดยเฉพาะ
curl -X POST http://localhost:3000/api/read-card/branch/00005

# ดูสถานะทุกสาขา
curl http://localhost:3000/api/read-card/branches
```

---

## 🚀 การ Deploy สาขาใหม่

### Checklist สำหรับ Deploy

- [ ] ติดตั้ง Tailscale ในเครื่อง client
- [ ] ได้รับ Tailscale IP ใหม่
- [ ] อัพเดท `branches.json` ใน web server
- [ ] Copy โฟลเดอร์ `uTrust-2700R-Reader` ไปเครื่องใหม่
- [ ] ติดตั้ง Node.js และ dependencies
- [ ] เชื่อมต่อเครื่องอ่านบัตร uTrust 2700 R
- [ ] รัน `node start-server.js`
- [ ] ทดสอบ `/api/status` และ `/api/read-card`
- [ ] ทดสอบจาก web application
- [ ] ตั้งค่า Windows Service (ถ้าต้องการ)

### Files ที่ต้อง Deploy

```
uTrust-2700R-Reader/
├── package.json
├── start-server.js
├── src/
│   └── services/
│       └── card-reader-service.js
├── config/
│   └── branches.json
└── scripts/
```

---

## 📞 Contact & Support

หากพบปัญหาในการ setup หรือมีคำถามเพิ่มเติม:

1. ตรวจสอบ log files ใน `logs/` directory
2. ดู troubleshooting section ข้างต้น
3. ทดสอบการเชื่อมต่อ network และ Tailscale
4. ตรวจสอบว่าเครื่องอ่านบัตรเสียบ USB อยู่

---

## 📝 Notes

- การแก้ไข `branches.json` จะมีผลทันทีโดยไม่ต้อง restart web server (มี caching 5 นาที)
- รหัสสาขาต้องไม่ซ้ำกัน และควรเป็นตัวเลข 5 หลัก
- IP addresses ต้องอยู่ใน Tailscale network (100.x.x.x)
- Port 3999 ต้องเปิดใน firewall ทั้งเครื่อง client และ server

---

**Last Updated:** 2025-01-09  
**Version:** 1.0.0  
**Author:** System Administrator 