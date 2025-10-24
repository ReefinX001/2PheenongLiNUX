# 🎯 คำแนะนำการใช้งาน UserRole Seeding

## 📋 ภาพรวม

ไฟล์ `seedUserRoles.js` ใช้สำหรับเพิ่มบทบาทผู้ใช้งาน (UserRole) ใหม่ลงในฐานข้อมูล รองรับบทบาทใหม่ที่เพิ่มเข้ามา เช่น กราฟิกดีไซน์, นักพัฒนา, คอนเทนต์ครีเอเตอร์, ครีเอทีฟ และการตลาด

## 🚀 วิธีการรัน Script

### 1. รันผ่าน Command Line

```bash
# เข้าไปยัง root directory ของโปรเจค
cd /path/to/your-accounting-app

# รัน script
node scripts/seedUserRoles.js
```

### 2. รันผ่าน npm script (ถ้ามีการตั้งค่าใน package.json)

```bash
npm run seed:roles
```

## 📊 บทบาทที่จะถูกเพิ่ม

| บทบาท | คำอธิบาย | สิทธิ์การเข้าถึง |
|--------|----------|------------------|
| **Super Admin** | ผู้ดูแลระบบสูงสุด | ทุกระบบ (*) |
| **Admin** | ผู้ดูแลระบบ | ระบบหลักทั้งหมด |
| **CEO** | ผู้บริหารสูงสุด | ทุกระบบ (*) |
| **กราฟิกดีไซน์** | งานออกแบบกราฟิก | graphic, creative, report |
| **นักพัฒนา** | งานพัฒนาระบบ | dev, report |
| **คอนเทนต์ครีเอเตอร์** | งานสร้างเนื้อหา | content, marketing, creative, report |
| **ครีเอทีฟ** | งานสร้างสรรค์ | creative, marketing, graphic, content, report |
| **การตลาด** | งานการตลาด | marketing, content, creative, report |
| **บัญชี** | งานบัญชีการเงิน | accounting, report |
| **HR** | งานบุคคล | hr, report |
| **คลังสินค้า** | งานจัดการสต็อก | stock, report |
| **POS** | งานขายหน้าร้าน | pos, report |
| **สินเชื่อ** | งานสินเชื่อ | loan, report |
| **พนักงานทั่วไป** | พนักงานทั่วไป | none |
| **ดูรายงานอย่างเดียว** | สิทธิ์ดูรายงาน | report |

## 🔧 ระบบที่รองรับ

- `accounting` - งานบัญชี
- `hr` - ฝ่ายบุคคล  
- `stock` - คลังสินค้า
- `marketing` - การตลาด
- `loan` - สินเชื่อ
- `pos` - POS ขายหน้าร้าน
- `report` - รายงาน
- `graphic` - กราฟิกดีไซน์ ⭐ **ใหม่**
- `dev` - พัฒนาระบบ ⭐ **ใหม่**
- `content` - คอนเทนต์ครีเอเตอร์ ⭐ **ใหม่**
- `creative` - ครีเอทีฟ ⭐ **ใหม่**
- `none` - ไม่กำหนด ⭐ **ใหม่**

## ⚠️ ข้อควรระวัง

1. **ตรวจสอบการเชื่อมต่อฐานข้อมูล** - ให้แน่ใจว่า MongoDB กำลังทำงาน
2. **ตั้งค่า Environment Variables** - ตรวจสอบ `MONGODB_URI` 
3. **Backup ข้อมูล** - แนะนำให้สำรองข้อมูลก่อนรัน script
4. **ไม่ซ้ำซ้อน** - Script จะตรวจสอบและไม่สร้างบทบาทที่มีอยู่แล้ว

## 📝 ตัวอย่างผลลัพธ์

```bash
✅ Connected to MongoDB
🚀 Starting UserRole seeding...
✅ Created role: กราฟิกดีไซน์
✅ Created role: นักพัฒนา
✅ Created role: คอนเทนต์ครีเอเตอร์
✅ Created role: ครีเอทีฟ
✅ Created role: การตลาด
⚠️  Role already exists: Admin
⚠️  Role already exists: Super Admin

📊 Seeding Summary:
✅ Created: 5 roles
⚠️  Already existed: 2 roles
📝 Total processed: 16 roles

🎉 UserRole seeding completed successfully!
```

## 🔄 การแก้ไขหรือเพิ่มบทบาทใหม่

หากต้องการเพิ่มบทบาทใหม่ ให้แก้ไขในไฟล์ `scripts/seedUserRoles.js`:

```javascript
const roles = [
  // ... บทบาทเดิม
  {
    name: 'บทบาทใหม่',
    description: 'คำอธิบายบทบาท',
    permissions: ['READ_SOMETHING', 'CREATE_SOMETHING'],
    allowedPages: ['module1', 'module2', 'report']
  }
];
```

## 🆘 การแก้ไขปัญหา

### ปัญหา: ไม่สามารถเชื่อมต่อฐานข้อมูล
```bash
❌ MongoDB connection failed: MongoNetworkError
```
**วิธีแก้:** ตรวจสอบว่า MongoDB กำลังทำงานและ connection string ถูกต้อง

### ปัญหา: UserRole model ไม่พบ
```bash
Error: Cannot find module '../models/User/UserRole'
```
**วิธีแก้:** ตรวจสอบ path ของ model และให้แน่ใจว่ารันจาก root directory

### ปัญหา: Permission denied
```bash
Error: EACCES: permission denied
```
**วิธีแก้:** รันด้วย `sudo` หรือตรวจสอบสิทธิ์ในการเขียนไฟล์

## 📞 ติดต่อสอบถาม

หากมีปัญหาในการใช้งาน สามารถติดต่อทีมพัฒนาได้ที่:
- Email: dev@company.com
- Line: @devteam
- Phone: 02-xxx-xxxx 