// middlewares/productImageUpload.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products'); // โฟลเดอร์ที่ต้องการเก็บรูป
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, fileName);
  }
});

const upload = multer({ storage });

// ตรงนี้สำคัญมาก ต้อง export ออกมา
module.exports = upload;
