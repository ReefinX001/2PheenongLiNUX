# Deposit Receipt API Testing Script

## Overview
สคริปต์ทดสอบ API สำหรับระบบใบเสร็จรับเงินมัดจำที่สร้างขึ้นตามการวิเคราะห์ `DepositReceipt.html`

## Features
- ✅ ทดสอบการสร้างใบเสร็จรับเงินมัดจำที่ถูกต้อง
- ❌ ทดสอบการป้องกันข้อมูลไม่ถูกต้อง (Validation)
- 📋 ทดสอบการดึงรายการใบเสร็จ
- 👥 ทดสอบการดึงรายชื่อพนักงาน
- 🔐 ทดสอบ Authentication และ Authorization
- 🏢 ทดสอบ Branch Code validation

## Installation

1. **ติดตั้ง dependencies:**
```bash
# ใช้ package.json ที่สร้างไว้
cp test-package.json package.json
npm install
```

2. **หรือติดตั้งแบบ manual:**
```bash
npm init -y
npm install axios
```

## Configuration

แก้ไข configuration ใน `test-deposit-api.js`:

```javascript
const BASE_URL = 'http://localhost:3000'; // URL ของ API server
const BRANCH_CODE = 'pattani'; // รหัสสาขาที่ต้องการทดสอบ
```

## Usage

### วิธีที่ 1: รันทดสอบทั้งหมด
```bash
node test-deposit-api.js
```

### วิธีที่ 2: ใช้ npm script
```bash
npm test
```

### วิธีที่ 3: Development mode (auto-reload)
```bash
npm run test:dev
```

## Test Cases ที่รวมอยู่

### 1. Create Valid Deposit Receipt
```javascript
POST /api/deposit-receipts
✅ ต้องได้ status 200/201
✅ ต้องมี receiptNumber ใน response
✅ ต้องมีข้อมูลที่สมบูรณ์
```

### 2. Create Invalid Deposit Receipt
```javascript
POST /api/deposit-receipts (with invalid data)
❌ ต้องได้ status 400
❌ ต้องมี error message
```

### 3. Get Deposit Receipts List
```javascript
GET /api/deposit-receipts?branchCode={branch}&limit=50
📋 ต้องได้รายการใบเสร็จ
📋 ต้องพบใบเสร็จที่เพิ่งสร้าง
```

### 4. Get Users/Staff List
```javascript
GET /api/users?branch={branchCode}
👥 ต้องได้รายชื่อพนักงาน
```

### 5. Authentication Edge Cases
```javascript
POST /api/deposit-receipts (with invalid token)
🔐 ต้องได้ status 401/403
```

### 6. Invalid Branch Code
```javascript
GET /api/deposit-receipts?branchCode=invalid
🏢 ต้องจัดการได้อย่างเหมาะสม (404 หรือ empty list)
```

## Sample Output

```
🚀 Starting Deposit Receipt API Tests...
📡 Base URL: http://localhost:3000
🏢 Branch Code: pattani

============================================================
🧪 Test 1: Create Valid Deposit Receipt
============================================================
ℹ️  Status: 201
ℹ️  Response: {
  "success": true,
  "data": {
    "_id": "67...",
    "receiptNumber": "DP2024001",
    "customer": {...}
  }
}
✅ Deposit receipt created successfully!
✅ Receipt Number: DP2024001

============================================================
📊 TEST SUMMARY
============================================================
PASS     | Create Valid Deposit
PASS     | Create Invalid Deposit
PASS     | Get Deposit Receipts
PASS     | Get Users
PASS     | Invalid Auth Token
PASS     | Invalid Branch Code

--------------------------------------------------------------------------------
Total: 6 | Passed: 6 | Failed: 0 | Partial: 0
✅ 🎉 All critical tests passed!
```

## Customization

### เพิ่ม Test Cases
```javascript
async function testCustomCase() {
  logTestHeader('Custom Test');
  try {
    // Your test logic here
    testResults.push({ test: 'Custom Test', status: 'PASS' });
  } catch (error) {
    testResults.push({ test: 'Custom Test', status: 'FAIL', error: error.message });
  }
}
```

### แก้ไข Test Data
```javascript
const CUSTOM_PAYLOAD = {
  customer: {
    name: 'ชื่อลูกค้าใหม่',
    phone: '0987654321',
    address: 'ที่อยู่ใหม่'
  },
  // ... rest of data
};
```

## Troubleshooting

### ❌ Connection Refused
```bash
Error: connect ECONNREFUSED 127.0.0.1:3000
```
**แก้ไข:** ตรวจสอบว่า API server ทำงานอยู่และ PORT ถูกต้อง

### ❌ 404 Not Found
```bash
Request failed with status code 404
```
**แก้ไข:** ตรวจสอบ API endpoints ใน server

### ❌ Authentication Failed
```bash
Request failed with status code 401
```
**แก้ไข:** ตรวจสอบ authentication middleware และ token handling

## Dependencies
- **axios**: HTTP client สำหรับทำ API requests
- **Node.js**: Runtime environment (version 14+)

## Notes
- สคริปต์นี้สร้างขึ้นจากการวิเคราะห์ `DepositReceipt.html`
- Test data ตรงกับโครงสร้างที่ใช้ใน frontend
- รองรับการทดสอบแบบ comprehensive รวมถึง edge cases
- ใช้สีในการแสดงผลเพื่อให้เข้าใจง่าย