const multer = require('multer');
const path = require('path');
const fs = require('fs');

// สร้างโฟลเดอร์ถ้ายังไม่มี
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// กำหนด storage ของ multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;

    if (file.fieldname === 'profileImage') {
      uploadPath = 'uploads/employees/profiles';
    } else if (file.fieldname === 'idCardImage') {
      uploadPath = 'uploads/employees/id-cards';
    } else {
      uploadPath = 'uploads/employees';
    }

    // สร้างโฟลเดอร์ถ้ายังไม่มี
    ensureDirectoryExists(uploadPath);

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // ตั้งชื่อไฟล์: <fieldname>-<timestamp>-<random>.<ext>
    const ext = path.extname(file.originalname); // เช่น .jpg
    const fileName = file.fieldname + '-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, fileName);
  }
});

// สร้าง upload object ของ multer
const upload = multer({
  storage: storage,
  // จำกัดขนาดไฟล์ 5MB
  limits: { fileSize: 5 * 1024 * 1024 },
  // กรองไฟล์เฉพาะรูปภาพ (JPEG/PNG/GIF)
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('อนุญาตเฉพาะไฟล์รูป JPEG, PNG, GIF เท่านั้น'), false);
    }
    cb(null, true);
  }
});

module.exports = upload;
