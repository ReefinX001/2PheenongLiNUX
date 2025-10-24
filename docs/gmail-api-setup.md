# 📧 คู่มือติดตั้ง Gmail API สำหรับระบบส่งอีเมลอัตโนมัติ

## 📋 ภาพรวม

คู่มือนี้จะแนะนำการติดตั้งและใช้งาน Gmail API เพื่อส่งอีเมลอัตโนมัติพร้อมเอกสารแนบ (ใบเสนอราคา, ใบแจ้งหนี้, สัญญาผ่อนชำระ)

## 🎯 ขั้นตอนการติดตั้ง

### 1. สร้าง Google Cloud Project

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้างโปรเจคใหม่หรือเลือกโปรเจคที่มีอยู่
3. เปิดใช้งาน Gmail API:
   - ไปที่ **APIs & Services** > **Library**
   - ค้นหา "Gmail API"
   - คลิก **Enable**

### 2. สร้าง OAuth 2.0 Credentials

1. ไปที่ **APIs & Services** > **Credentials**
2. คลิก **Create Credentials** > **OAuth client ID**
3. เลือก **Application type**: **Web application**
4. ตั้งชื่อ: `Gmail API for Installment System`
5. เพิ่ม **Authorized redirect URIs**:
   ```
   http://localhost:3000/auth/google/callback
   https://yourdomain.com/auth/google/callback
   ```
6. คลิก **Create**
7. **บันทึก Client ID และ Client Secret**

### 3. ตั้งค่า OAuth Consent Screen

1. ไปที่ **APIs & Services** > **OAuth consent screen**
2. เลือก **External** (สำหรับการใช้งานทั่วไป)
3. กรอกข้อมูลที่จำเป็น:
   - **App name**: ระบบผ่อนชำระ
   - **User support email**: อีเมลของคุณ
   - **Developer contact information**: อีเมลของคุณ
4. เพิ่ม **Scopes**:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.compose`

### 4. รับ Refresh Token

สร้างไฟล์ `get-refresh-token.js` เพื่อรับ refresh token:

```javascript
const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = 'your-client-id';
const CLIENT_SECRET = 'your-client-secret';
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const scopes = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('เปิด URL นี้ในเบราว์เซอร์:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('ป้อนรหัสที่ได้จาก callback URL: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('Access Token:', tokens.access_token);
  } catch (error) {
    console.error('Error:', error);
  }
  rl.close();
});
```

รันสคริปต์:
```bash
node get-refresh-token.js
```

### 5. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` และเพิ่มข้อมูลต่อไปนี้:

```env
# Gmail API Configuration
GMAIL_CLIENT_ID=your-google-client-id
GMAIL_CLIENT_SECRET=your-google-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/auth/google/callback
GMAIL_REFRESH_TOKEN=your-refresh-token
GMAIL_USER=your-gmail-address@gmail.com

# SMTP Fallback (สำรอง)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-app-password

# Company Information
COMPANY_NAME=บริษัท ABC จำกัด
COMPANY_PHONE=02-xxx-xxxx
COMPANY_EMAIL=contact@yourcompany.com

# App Settings
NODE_ENV=development
```

### 6. ติดตั้ง Dependencies

```bash
npm install googleapis nodemailer
```

## 🔧 การใช้งาน

### API Endpoints ที่สามารถใช้งานได้

#### 1. ส่งอีเมลเอกสารผ่อนชำระ
```http
POST /api/email/send-installment-documents
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "customer": {
    "name": "นายสมชาย ใจดี",
    "email": "customer@example.com",
    "phone": "0812345678",
    "idCard": "1234567890123"
  },
  "documents": ["quotation", "invoice", "contract"],
  "customMessage": "ขอบคุณที่ไว้วางใจบริการของเรา",
  "quotationId": "QT-2024-001",
  "invoiceId": "IV-2024-001",
  "contractId": "CT-2024-001",
  "branchCode": "00000"
}
```

## 🚨 การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

#### 1. "Token has been expired or revoked"
**วิธีแก้:**
- รัน `get-refresh-token.js` ใหม่
- อัพเดท `GMAIL_REFRESH_TOKEN` ใน `.env`

#### 2. "Authentication failed"
**วิธีแก้:**
- ตรวจสอบ `GMAIL_CLIENT_ID` และ `GMAIL_CLIENT_SECRET`
- ตรวจสอบว่าเปิดใช้งาน Gmail API แล้ว

## ✅ Checklist การติดตั้ง

- [ ] สร้าง Google Cloud Project
- [ ] เปิดใช้งาน Gmail API
- [ ] สร้าง OAuth 2.0 Credentials
- [ ] ตั้งค่า OAuth Consent Screen
- [ ] รับ Refresh Token
- [ ] ตั้งค่า Environment Variables
- [ ] ติดตั้ง Dependencies
- [ ] ทดสอบการส่งอีเมล

**�� ระบบพร้อมใช้งาน!** 