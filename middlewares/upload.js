// middlewares/upload.js
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// โฟลเดอร์หลักเก็บไฟล์ทั้งหมด
const BASE_UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// ช่วยสร้างโฟลเดอร์ถ้ายังไม่มี
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// กำหนด storage แบบ dynamic
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // เลือกโฟลเดอร์ย่อยตามเส้นทาง API
    // ถ้าเข้ามาจาก /api/employees → เก็บใน uploads/employees
    let subfolder = 'others';
    if (req.baseUrl.includes('/employees')) {
      subfolder = 'employees';
    } else if (req.baseUrl.includes('/users')) {
      subfolder = 'users';
    }
    const dest = path.join(BASE_UPLOAD_DIR, subfolder);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const name     = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, name);
  }
});

// กรองไฟล์เฉพาะ image MIME types
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024  // จำกัดขนาดไฟล์สูงสุด 5MB
  }
});

module.exports = upload;
