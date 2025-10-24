# 🔐 Fingerprint System Setup
## Windows Client → Windows Server Configuration

### 🏗️ **Architecture Overview**

```
Windows Server (www.2pheenong.com)
├── IP: 143.14.9.165 (Public)
├── Tailscale: 100.110.180.13
├── fingerprint-server.js (Port 8891) ← รับภาพลายนิ้วมือ
├── routes/api/fingerprint.js (Main API)
└── public/uploads/fingerprints/ ← เก็บภาพลายนิ้วมือ

         ⬇️ ส่งภาพลายนิ้วมือ

Windows Client (100.106.108.57)
├── ZK Service (8889) ← สแกนลายนิ้วมือ
├── fingerprint-api.js (8891) ← ส่งภาพไป Server
└── ZK9500 Fingerprint Scanner
```

### 🚀 **Setup Instructions**

#### 1. **Windows Server Setup**
```bash
# 1. Start Fingerprint Server
start-fingerprint-server.bat

# 2. Verify server is running
curl http://100.110.180.13:8891/health
```

#### 2. **Windows Client Setup**
```bash
# 1. Start ZK Service และ API
cd ZKT
start-api.bat

# 2. Verify client is running
curl http://100.106.108.57:8891/health
```

### 📡 **Data Flow**

1. **User scans fingerprint** on Receipt page
2. **Windows Server** → sends scan command → **Windows Client (8889)**
3. **ZK9500 Scanner** → captures fingerprint → **Windows Client**
4. **Windows Client (8891)** → sends image → **Windows Server (8891)**
5. **Windows Server** → saves image in `/public/uploads/fingerprints/`
6. **Windows Server** → returns image URL: `https://www.2pheenong.com/uploads/fingerprints/`

### 🛠️ **Testing Commands**

```bash
# Test Windows Server fingerprint receiver
curl -X POST http://100.110.180.13:8891/api/fingerprint/upload-base64 \
  -H "Content-Type: application/json" \
  -d '{"imageData":"iVBORw0KGgoAAAA...","receiptId":"DR-123","signatureType":"customer"}'

# Test complete fingerprint scan
curl -X POST https://www.2pheenong.com/api/fingerprint/scan \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiptId":"DR-123","signatureType":"customer"}'

# List fingerprint images on server
curl http://100.110.180.13:8891/api/fingerprint/images
```

### 📋 **Endpoints**

#### **Windows Server (100.110.180.13:8891)**
- `POST /api/fingerprint/upload-base64` - รับภาพจาก Client
- `GET /api/fingerprint/images` - ดูรายการภาพทั้งหมด
- `DELETE /api/fingerprint/images/:filename` - ลบภาพ
- `GET /health` - ตรวจสอบสถานะ

#### **Windows Client (100.106.108.57:8891)**
- `POST /api/fingerprint/upload-base64` - รับภาพแล้วส่งต่อไป Server
- `GET /health` - ตรวจสอบสถานะ

#### **Main Server (www.2pheenong.com)**
- `POST /api/fingerprint/scan` - สแกนลายนิ้วมือ
- `GET /api/fingerprint/status` - ตรวจสอบสถานะเครื่องสแกน
- `GET /uploads/fingerprints/:filename` - ดูภาพลายนิ้วมือ

### 🔧 **Configuration Files**

- `fingerprint-server.js` - Server receiver (Port 8891)
- `routes/api/fingerprint.js` - Main API (updated to use 100.110.180.13)
- `ZKT/fingerprint-api.js` - Client forwarder (updated to send to Server)

### ✅ **Success Indicators**

1. **Fingerprint Server Running**: `🚀 Fingerprint Server running on Windows Server`
2. **Client Connected**: `📡 Server IP: 100.110.180.13:8891`
3. **Image Saved**: `✅ Fingerprint image saved on Windows Server: fingerprint_*.bmp`
4. **URL Generated**: `🔗 Image URL: https://www.2pheenong.com/uploads/fingerprints/...`

### 🚨 **Troubleshooting**

| Error | Solution |
|-------|----------|
| `ECONNREFUSED 100.110.180.13:8891` | Start fingerprint server: `start-fingerprint-server.bat` |
| `Server upload failed` | Check Tailscale connection between servers |
| `Images not displayed` | Verify `public/uploads/fingerprints/` permissions |
| `Fallback: saved locally` | Windows Server not reachable, using Client storage |

### 🎯 **Final Result**

- ✅ **Fingerprint images stored on Windows Server**
- ✅ **Accessible via domain**: `https://www.2pheenong.com/uploads/fingerprints/`
- ✅ **Fallback to Client storage** if Server unavailable
- ✅ **Complete audit trail** with source tracking