# 📋 คู่มือการคัดลอกฐานข้อมูล

## 🚨 ปัญหาที่พบ
การเชื่อมต่อไปยัง production database มีปัญหาเรื่อง SSL/TLS:
```
SSL routines:ssl3_read_bytes:tlsv1 alert internal error
```

## ✅ วิธีแก้ไขที่แนะนำ

### วิธีที่ 1: ใช้ MongoDB Compass (แนะนำมากที่สุด)

1. **ดาวน์โหลด MongoDB Compass**: https://www.mongodb.com/try/download/compass

2. **เชื่อมต่อ Production Database**:
   ```
   mongodb+srv://bisyrunn:1941001330617Fin@2pheenong.afoq1rc.mongodb.net/?retryWrites=true&w=majority&appName=2Pheenong
   ```

3. **Export Collections**:
   - เลือก Database ที่ต้องการ
   - ไปที่แต่ละ Collection
   - คลิก Export Collection → Export Full Collection
   - เลือกประเภทไฟล์ JSON
   - บันทึกไฟล์

4. **เชื่อมต่อ Development Database**:
   ```
   mongodb+srv://bisyrunn1:5611279Fin.@dev-pos.qfdzbnx.mongodb.net/?retryWrites=true&w=majority&appName=Dev-pos
   ```

5. **Import Collections**:
   - เลือก Database ปลายทาง
   - ไปที่ Collection ที่ต้องการ (หรือสร้างใหม่)
   - คลิก Import Data
   - เลือกไฟล์ JSON ที่ export ไว้
   - คลิก Import

### วิธีที่ 2: ใช้ MongoDB Atlas Interface

1. **เข้า MongoDB Atlas Console**: https://cloud.mongodb.com/

2. **ไปที่ Production Cluster**:
   - เลือก Cluster "2pheenong"
   - คลิก "Browse Collections"

3. **Export Data**:
   - เลือก Collection ที่ต้องการ
   - คลิก "Export Collection"
   - ดาวน์โหลดไฟล์ JSON

4. **ไปที่ Development Cluster**:
   - เลือก Cluster "dev-pos"
   - คลิก "Browse Collections"

5. **Import Data**:
   - เลือก Collection ปลายทาง
   - คลิก "Insert Document" → "Import JSON file"
   - อัปโหลดไฟล์ที่ export ไว้

### วิธีที่ 3: ใช้ Command Line Tools (ถ้ามี MongoDB Tools)

1. **Export จาก Production**:
   ```bash
   mongodump --uri="mongodb+srv://bisyrunn:1941001330617Fin@2pheenong.afoq1rc.mongodb.net/?retryWrites=true&w=majority&appName=2Pheenong" --out=./db_backup
   ```

2. **Import ไป Development**:
   ```bash
   mongorestore --uri="mongodb+srv://bisyrunn1:5611279Fin.@dev-pos.qfdzbnx.mongodb.net/?retryWrites=true&w=majority&appName=Dev-pos" --drop ./db_backup
   ```

## 📊 Collections ที่ต้องคัดลอก (ลำดับความสำคัญ)

### ⭐ สำคัญมาก (ต้องคัดลอกก่อน)
1. `users` - ข้อมูลผู้ใช้งาน
2. `employees` - ข้อมูลพนักงาน
3. `branches` - ข้อมูลสาขา
4. `roles` - บทบาทผู้ใช้
5. `zones` - พื้นที่เช็คอิน

### 🟡 สำคัญปานกลาง
6. `work_schedules` - ตารางงาน
7. `attendances` - การเข้างาน
8. `leaves` - การลา
9. `overtime` - ทำงานล่วงเวลา
10. `categories` - หมวดหมู่

### 🟢 อื่นๆ (ตามต้องการ)
- `products` - สินค้า
- `customers` - ลูกค้า
- `orders` - คำสั่งซื้อ
- `invoices` - ใบแจ้งหนี้
- และอื่นๆ

## 🔧 การตรวจสอบหลังคัดลอก

หลังจากคัดลอกเสร็จแล้ว ให้รันคำสั่งนี้เพื่อตรวจสอบ:

```bash
node check-production-users.js
```

## 🎯 เป้าหมาย

เมื่อคัดลอกเสร็จแล้ว คุณจะมี:
- ✅ ข้อมูลผู้ใช้และพนักงานครบถ้วน
- ✅ ข้อมูลสาขาและโซนเช็คอิน
- ✅ ระบบพร้อมใช้งานในโหมด Development
- ✅ สามารถทดสอบฟีเจอร์ต่างๆ ได้อย่างสมบูรณ์

## 💡 หมายเหตุ

- ไฟล์ .env ถูกตั้งค่าให้ใช้ development database แล้ว
- หลังจากคัดลอกเสร็จ ให้ restart แอปพลิเคชัน
- ตรวจสอบให้แน่ใจว่าข้อมูลครบถ้วนก่อนใช้งานจริง