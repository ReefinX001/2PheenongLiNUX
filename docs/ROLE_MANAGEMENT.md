# การจัดการบทบาท (Role Management)

## ภาพรวม

ระบบจัดการบทบาทได้รับการปรับปรุงให้ใช้ฐานข้อมูล MongoDB แทนการเก็บข้อมูลใน JavaScript เท่านั้น

## โครงสร้างไฟล์

```
├── models/User/UserRole.js          # Model สำหรับบทบาท
├── controllers/userRoleController.js # Controller จัดการ API
├── routes/userRoleRoutes.js         # Routes สำหรับ API endpoints
├── seeders/roleSeeder.js           # Seeder สำหรับข้อมูลเริ่มต้น
└── views/HR/register_user.html     # Frontend ที่ใช้ API
```

## การติดตั้งและ Setup

### 1. Seed ข้อมูลบทบาทเริ่มต้น

```bash
# Seed ข้อมูลบทบาทครั้งแรก
npm run seed:roles

# Force reset และ seed ใหม่ (ลบข้อมูลเก่าก่อน)
npm run seed:roles:force
```

### 2. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/user-role` | ดึงรายการบทบาททั้งหมด |
| `GET` | `/api/user-role/:id` | ดึงข้อมูลบทบาทตาม ID |
| `POST` | `/api/user-role` | สร้างบทบาทใหม่ |
| `PATCH` | `/api/user-role/:id` | อัปเดตข้อมูลบทบาท |
| `DELETE` | `/api/user-role/:id` | ลบบทบาท (Soft Delete) |
| `GET` | `/api/user-role/stats` | ดึงสถิติบทบาท |
| `POST` | `/api/user-role/seed` | Seed ข้อมูลเริ่มต้น |

### 3. สิทธิ์การเข้าถึง

- **view_roles**: ดูข้อมูลบทบาท
- **manage_roles**: จัดการบทบาท (สร้าง, แก้ไข, ลบ)

## บทบาทเริ่มต้น

ระบบมีบทบาทเริ่มต้น 20 บทบาท:

### 1. บทบาทผู้ดูแลระบบ
- **Admin**: เข้าถึงทุกระบบ
- **CEO**: เข้าถึงทุกระบบ

### 2. บทบาทตามแผนก
#### ฝ่ายบุคคล (HR)
- **HR Manager**: ผู้จัดการฝ่ายบุคคล
- **HR Staff**: พนักงานฝ่ายบุคคล

#### ฝ่ายบัญชี (Accounting)
- **Accounting Manager**: ผู้จัดการฝ่ายบัญชี
- **Accounting Staff**: พนักงานฝ่ายบัญชี

#### คลังสินค้า (Stock)
- **Stock Manager**: ผู้จัดการคลังสินค้า
- **Stock Staff**: พนักงานคลังสินค้า

#### การตลาด (Marketing)
- **Marketing Manager**: ผู้จัดการการตลาด
- **Marketing Staff**: พนักงานการตลาด

#### สินเชื่อ (Loan)
- **Loan Manager**: ผู้จัดการสินเชื่อ
- **Loan Staff**: พนักงานสินเชื่อ

#### ขายหน้าร้าน (POS)
- **POS Manager**: ผู้จัดการขายหน้าร้าน
- **POS Staff**: พนักงานขายหน้าร้าน

#### ของแถม (Gifts)
- **Gifts Manager**: ผู้จัดการของแถม
- **Gifts Staff**: พนักงานของแถม

### 3. บทบาทพิเศษ
- **Multi Department**: พนักงานหลายแผนก (บัญชี, HR, คลังสินค้า)
- **Supervisor**: หัวหน้างาน (บัญชี, HR, คลังสินค้า, การตลาด)
- **Branch Manager**: ผู้จัดการสาขา (POS, คลังสินค้า, บัญชี)
- **Guest**: ผู้เยี่ยมชม (ไม่สามารถเข้าถึงระบบได้)

## โครงสร้างข้อมูลบทบาท

```javascript
{
  _id: ObjectId,
  name: String,           // ชื่อบทบาท (unique)
  description: String,    // คำอธิบาย
  allowedPages: [String], // ระบบที่เข้าถึงได้ ['*'] = ทุกระบบ
  allowedBranches: [ObjectId], // สาขาที่เข้าถึงได้
  permissions: [String],  // สิทธิ์เฉพาะ
  deleted_at: Date,       // สำหรับ Soft Delete
  createdAt: Date,
  updatedAt: Date
}
```

## การใช้งานใน Frontend

### 1. จัดการบทบาทผ่าน Modal

```javascript
// เปิด Modal จัดการบทบาท
openRoleManagementModal()

// เพิ่มบทบาทใหม่
openAddRoleModal()

// แก้ไขบทบาท
editRole(roleId)

// ลบบทบาท
deleteRole(roleId)
```

### 2. โหลดข้อมูลบทบาท

```javascript
// โหลดจาก API
await loadRoles()

// บังคับโหลดใหม่
await loadRoles(true)

// ใช้บทบาทเริ่มต้นและ seed ลงฐานข้อมูล
await loadRoles(false, true)
```

## การ Troubleshooting

### 1. ไม่พบข้อมูลบทบาท

```bash
# ตรวจสอบฐานข้อมูล
mongosh
use your_database_name
db.userroles.find({deleted_at: null}).count()

# Seed ข้อมูลใหม่
npm run seed:roles:force
```

### 2. API ไม่ทำงาน

- ตรวจสอบ JWT Token
- ตรวจสอบสิทธิ์ `view_roles` และ `manage_roles`
- ตรวจสอบ route registration ใน `server.js`

### 3. Frontend ไม่แสดงข้อมูล

- ตรวจสอบ Console เพื่อดู error messages
- ตรวจสอบ API endpoint ใน `API_ENDPOINTS.roles`
- ลองกดปุ่ม "โหลดใหม่" ในหน้า UI

## สคริปต์ที่เพิ่มใน package.json

```json
{
  "scripts": {
    "seed:roles": "node seeders/roleSeeder.js",
    "seed:roles:force": "node seeders/roleSeeder.js --force"
  }
}
```

## การ Development

### เพิ่มบทบาทใหม่

1. แก้ไขไฟล์ `seeders/roleSeeder.js`
2. เพิ่มข้อมูลในอาเรย์ `defaultRoles`
3. รัน `npm run seed:roles:force`

### เพิ่ม Permission ใหม่

1. อัปเดต `permissions` ในบทบาทที่ต้องการ
2. อัปเดต middleware `hasPermission`
3. ทดสอบการทำงาน

## การ Backup และ Restore

### Backup

```bash
# Export ข้อมูลบทบาท
mongoexport --db=your_db --collection=userroles --out=roles_backup.json
```

### Restore

```bash
# Import ข้อมูลบทบาท
mongoimport --db=your_db --collection=userroles --file=roles_backup.json
```

## ความปลอดภัย

1. **Authentication**: ทุก API ต้องมี JWT Token
2. **Authorization**: ตรวจสอบสิทธิ์ `view_roles` และ `manage_roles`
3. **Soft Delete**: ไม่ลบข้อมูลจริงในฐานข้อมูล
4. **Validation**: ตรวจสอบข้อมูลก่อนบันทึก
5. **Role Usage Check**: ตรวจสอบว่าบทบาทถูกใช้งานก่อนลบ 