// routes/uploadSignature.js

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Customer = require('../models/Customer/Customer');
const router  = express.Router();

// 1) Ensure the uploads/signatures folder exists
const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'signatures');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2) Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // keep original extension
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

// 3) Create the `upload` middleware
const upload = multer({ storage });

// 4) POST /api/upload/signature
//    Expects form-data: { signature: <file>, customerId?: string, sigType?: 'customer'|'employee' }
router.post(
  '/signature',
  upload.single('signature'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      // Build the public URL (assumes you serve `public` as static at `/`)
      const url = `/uploads/signatures/${req.file.filename}`;

      // Optionally update the Customer record
      const { customerId, sigType } = req.body;
      if (customerId && sigType) {
        const fieldName = sigType === 'employee'
          ? 'employeeSignature'
          : 'customerSignature';

        await Customer.findByIdAndUpdate(
          customerId,
          { [fieldName]: url },
          { new: true }
        );
      }

      return res.json({ success: true, url });
    } catch (err) {
      console.error(err);
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, error: err.message });
      }
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// 5) Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
  next();
});

module.exports = router;
