# 🧪 POS API Testing Script สำหรับระบบ Front Store

สคริปต์นี้ใช้สำหรับทดสอบ API endpoints ของระบบ POS ตามที่แนะนำใน `Test.md`

## 📋 การทดสอบที่รวมอยู่

### 1. Branch Stock API
- ✅ **Happy Path**: ดึงข้อมูล stock สำเร็จ
- ❌ **Error Path**: ใช้ branch code ผิด

### 2. Checkout API
- ✅ **Success**: Checkout สำเร็จพร้อม documentId
- ❌ **Error**: Checkout ด้วย body ว่าง/ไม่ครบ

### 3. Member Search API
- ✅ **Found**: ค้นหาลูกค้าเจอ
- ✅ **Not Found**: ค้นหาลูกค้าไม่เจอ

### 4. Authentication
- ❌ **Invalid Token**: ทดสอบ 401 Unauthorized

## 🚀 วิธีใช้งาน

### ขั้นตอนที่ 1: ติดตั้ง Dependencies
```bash
npm install axios
```

### ขั้นตอนที่ 2: ตั้งค่า Configuration
แก้ไขตัวแปรในไฟล์ `api-test-script.js`:

```javascript
const BASE_URL = 'http://localhost:3000'; // เปลี่ยนเป็น URL เซิร์ฟเวอร์ของคุณ
const VALID_TOKEN = 'Bearer your_valid_token_here'; // ใส่ token จริง
const BRANCH_CODE = 'PATTANI'; // รหัสสาขาของคุณ
```

### ขั้นตอนที่ 3: รันการทดสอบ
```bash
# รันการทดสอบทั้งหมด
node api-test-script.js
```

### ขั้นตอนที่ 4: ตัวอย่างผลลัพธ์
```
🧪 POS System API Testing Started
Base URL: http://localhost:3000
Branch Code: PATTANI
================================================================================

1. GET /api/branch-stock/taxType (Happy Path)
Status: ✅ PASS
Response: {
  "products": [...],
  "total": 25
}
────────────────────────────────────────────────────────────────────────────────

2. GET /api/branch-stock/taxType (Wrong Branch)
Status: ✅ PASS
Error: Request failed with status code 404
Status Code: 404
Response: {
  "error": "Branch not found"
}
────────────────────────────────────────────────────────────────────────────────

📊 Test Summary
========================================
✅ Passed: 7
❌ Failed: 0
📈 Success Rate: 100.0%

🎉 All tests passed!
```

## 📝 คำแนะนำการใช้งาน

### สำหรับ Development
1. **เริ่มจาก Mock API**: ใช้ `json-server` สร้าง mock API ก่อน
2. **ทดสอบทีละส่วน**: รัน function แยกสำหรับทดสอบ endpoint เฉพาะ
3. **ตรวจสอบ logs**: ดู response และ error messages อย่างละเอียด

### สำหรับ Production Testing
1. **เปลี่ยน BASE_URL**: ชี้ไปที่เซิร์ฟเวอร์จริง
2. **ใช้ Token จริง**: ขอ JWT token จาก authentication endpoint
3. **ระวังข้อมูล**: ใช้ข้อมูลทดสอบไม่ใช่ข้อมูลจริง

## 🔧 Customization

### เพิ่มการทดสอบใหม่
```javascript
async function testNewEndpoint() {
    try {
        const response = await axios.get(`${BASE_URL}/api/new-endpoint`, {
            headers: { 'Authorization': VALID_TOKEN }
        });

        logResult('New Endpoint Test', true, response.data);
        return true;
    } catch (error) {
        logResult('New Endpoint Test', false, null, error);
        return false;
    }
}
```

### รันการทดสอบเฉพาะ
```javascript
// ทดสอบเฉพาะ checkout
testCheckoutSuccess().then(result => {
    console.log('Checkout test result:', result);
});
```

## 🚨 การแก้ไขปัญหา

### ECONNREFUSED
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```
**แก้ไข**: ตรวจสอบว่าเซิร์ฟเวอร์ API รันอยู่และ URL ถูกต้อง

### 401 Unauthorized
```
Status Code: 401
Response: {"error": "Invalid token"}
```
**แก้ไข**: ขอ token ใหม่หรือตรวจสอบ authentication endpoint

### 404 Not Found
```
Status Code: 404
Response: {"error": "Endpoint not found"}
```
**แก้ไข**: ตรวจสอบ URL endpoint และ routing ในเซิร์ฟเวอร์

### JSON Parse Error
```
SyntaxError: Unexpected token < in JSON
```
**แก้ไข**: เซิร์ฟเวอร์ return HTML แทน JSON (อาจเป็น error page)

## 📊 การตีความผลลัพธ์

- **✅ PASS**: การทดสอบสำเร็จตามที่คาดหวัง
- **❌ FAIL**: การทดสอบไม่สำเร็จ ต้องแก้ไข API หรือการทดสอบ
- **Success Rate**: เปอร์เซ็นต์การทดสอบที่ผ่าน (เป้าหมาย 100%)

## 🔄 Integration กับ CI/CD

### GitHub Actions Example
```yaml
name: POS API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install axios
      - run: node api-test-script.js
```

### เพิ่มใน package.json
```json
{
  "scripts": {
    "test:pos": "node api-test-script.js",
    "test:pos:prod": "BASE_URL=https://api.yourdomain.com node api-test-script.js"
  }
}
```