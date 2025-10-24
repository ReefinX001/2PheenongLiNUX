# 🎁 ระบบจัดการ Popup โปรโมชั่น

## ภาพรวมระบบ

ระบบจัดการ Popup โปรโมชั่นที่ครบครันสำหรับแสดงโปรโมชั่นให้ลูกค้าแบบ real-time พร้อมระบบ analytics และการจัดการที่ละเอียด

## ฟีเจอร์หลัก

### 🎨 **Admin Panel**
- **สร้างและแก้ไข Popup** - อัปโหลดรูปภาพ, กำหนดข้อความ, คูปอง
- **ตัวอย่าง Real-time** - ดูตัวอย่าง popup ขณะสร้าง
- **จัดการสถานะ** - เปิด/ปิด/กำหนดเวลา popup
- **Analytics Dashboard** - สถิติ views, clicks, conversion rate
- **การกรอง** - ค้นหาและกรองตามสถานะ

### 🎯 **ระบบแสดงผล**
- **Auto Display** - แสดง popup อัตโนมัติตามเวลาที่กำหนด
- **Animation Effects** - Scale, Fade, Slide, Bounce
- **Responsive Design** - รองรับทุกขนาดหน้าจอ
- **User Targeting** - แสดงตามกลุ่มเป้าหมาย

### 📊 **Analytics & Tracking**
- **View Tracking** - นับจำนวนการแสดง popup
- **Click Tracking** - นับจำนวนการคลิก
- **Conversion Tracking** - ติดตามการแปลงผล
- **CTR Calculation** - คำนวณ Click Through Rate

## โครงสร้างไฟล์

```
📁 views/marketing/
├── popup_management.html          # หน้า Admin Panel
└── README_POPUP.md               # เอกสารนี้

📁 models/Marketing/
└── Popup.js                      # MongoDB Model

📁 controllers/
└── popupController.js            # Business Logic

📁 routes/
└── popupRoutes.js               # API Routes

📁 middlewares/
└── ensureUploadsDir.js          # Upload Directory Middleware

📁 public/
├── js/popup-display.js          # Frontend Display Script
└── uploads/popups/              # รูปภาพ Popup
```

## API Endpoints

### 🔓 **Public APIs** (ไม่ต้อง Authentication)
```
GET    /api/popups/active              # ดึง popup ที่เปิดใช้งาน
POST   /api/popups/:id/view           # บันทึกการดู popup
POST   /api/popups/:id/click          # บันทึกการคลิก popup  
POST   /api/popups/:id/conversion     # บันทึกการแปลงผล
```

### 🔒 **Protected APIs** (ต้อง Authentication)
```
GET    /api/popups                    # ดึงรายการ popup ทั้งหมด
GET    /api/popups/:id               # ดึง popup ตาม ID
POST   /api/popups                   # สร้าง popup ใหม่
PUT    /api/popups/:id               # แก้ไข popup
PATCH  /api/popups/:id/status        # เปลี่ยนสถานะ popup
DELETE /api/popups/:id               # ลบ popup
GET    /api/popups/analytics         # ดึงข้อมูล analytics
```

## การใช้งาน

### 1. **เข้าสู่ Admin Panel**
```
http://localhost:3000/popup_management
```

### 2. **สร้าง Popup ใหม่**
1. คลิก "สร้าง Popup ใหม่"
2. กรอกข้อมูล:
   - ชื่อ Popup
   - หัวข้อหลัก/รอง
   - คำอธิบาย
   - รหัสคูปอง
   - จำนวนส่วนลด
   - ขั้นต่ำการใช้งาน
3. อัปโหลดรูปภาพ (ถ้าต้องการ)
4. กำหนดการแสดงผล:
   - เวลาแสดง (วินาที)
   - สถานะ
5. ดูตัวอย่างและบันทึก

### 3. **เพิ่ม Script ในหน้าเว็บ**
```html
<!-- เพิ่มใน <head> หรือก่อน </body> -->
<script src="/js/popup-display.js"></script>
```

### 4. **Track Conversion (ถ้าต้องการ)**
```javascript
// เรียกเมื่อลูกค้าซื้อสินค้าสำเร็จ
window.trackPopupConversion('popup_id_here');
```

## การตั้งค่า Permissions

ในไฟล์ `middlewares/permission.js` เพิ่ม permissions:
```javascript
const marketingPermissions = [
    'marketing:read',    // ดูข้อมูล popup
    'marketing:write',   // สร้าง/แก้ไข popup  
    'marketing:delete'   // ลบ popup
];
```

## Database Schema

### Popup Model
```javascript
{
    name: String,              // ชื่อ popup
    title: String,             // หัวข้อหลัก
    subtitle: String,          // หัวข้อรอง
    description: String,       // คำอธิบาย
    couponCode: String,        // รหัสคูปอง (unique)
    discountAmount: Number,    // จำนวนส่วนลด
    minimumAmount: Number,     // ขั้นต่ำการใช้งาน
    buttonText: String,        // ข้อความปุ่ม
    showDelay: Number,         // เวลาแสดง (วินาที)
    status: String,            // active/inactive/scheduled
    image: String,             // path รูปภาพ
    
    // Analytics
    views: Number,             // จำนวนการดู
    clicks: Number,            // จำนวนการคลิก
    conversions: Number,       // จำนวนการแปลงผล
    
    // Targeting
    targetAudience: String,    // กลุ่มเป้าหมาย
    showOnPages: [String],     // หน้าที่แสดง
    
    // Display Settings
    displaySettings: {
        position: String,      // ตำแหน่งแสดง
        animation: String,     // รูปแบบ animation
        backgroundColor: String,
        borderRadius: Number
    },
    
    // Scheduling
    scheduledStart: Date,      // เวลาเริ่มแสดง
    scheduledEnd: Date,        // เวลาสิ้นสุด
    
    // Limits
    maxDisplaysPerUser: Number,
    maxDisplaysPerDay: Number,
    
    createdBy: ObjectId,
    updatedBy: ObjectId,
    timestamps: true
}
```

## การปรับแต่ง

### 1. **เปลี่ยนสี Popup**
แก้ไขใน `public/js/popup-display.js`:
```javascript
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### 2. **เพิ่ม Animation ใหม่**
เพิ่มใน CSS animations:
```css
@keyframes customAnimation {
    0% { transform: rotateY(-90deg); }
    100% { transform: rotateY(0deg); }
}
```

### 3. **กำหนด User Type**
แก้ไขใน `detectUserType()` method:
```javascript
// ตัวอย่าง: ตรวจจาก cookie หรือ session
if (document.cookie.includes('premium_user')) {
    this.userType = 'premium_users';
}
```

## Troubleshooting

### ❌ **Popup ไม่แสดง**
1. ตรวจสอบ console errors
2. ตรวจสอบ API `/api/popups/active`
3. ตรวจสอบ popup status = 'active'
4. ตรวจสอบ localStorage limits

### ❌ **รูปภาพไม่แสดง**
1. ตรวจสอบโฟลเดอร์ `public/uploads/popups/`
2. ตรวจสอบ file permissions
3. ตรวจสอบ path ใน database

### ❌ **Analytics ไม่อัปเดต**
1. ตรวจสอบ network requests
2. ตรวจสอบ API endpoints
3. ตรวจสอบ database connection

## การพัฒนาต่อ

### 🚀 **ฟีเจอร์ที่สามารถเพิ่ม**
- **A/B Testing** - ทดสอบ popup หลายแบบ
- **Geo-targeting** - แสดงตามพื้นที่
- **Time-based Rules** - แสดงตามเวลา/วัน
- **Exit Intent** - แสดงเมื่อจะออกจากเว็บ
- **Scroll Trigger** - แสดงเมื่อ scroll ถึงจุดหนึ่ง
- **Integration** - เชื่อมต่อ email marketing
- **Templates** - เทมเพลต popup สำเร็จรูป

### 📱 **Mobile Optimization**
- Touch gestures
- Swipe to dismiss
- Mobile-specific animations
- Push notifications integration

---

## 📞 Support

หากมีปัญหาหรือต้องการความช่วยเหลือ กรุณาติดต่อทีมพัฒนา

**Happy Marketing! 🎉**
