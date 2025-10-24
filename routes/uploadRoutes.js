const express = require('express');
const router = express.Router();
const employeeImageUpload = require('../middlewares/employeeImageUpload');
const authJWT = require('../middlewares/authJWT');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create directories for installment images
const installmentDir = path.join(__dirname, '..', 'public', 'uploads', 'installments');
const idCardDir = path.join(installmentDir, 'id-cards');
const selfieDir = path.join(installmentDir, 'selfies');
const salarySlipDir = path.join(installmentDir, 'salary-slips');
const signatureDir = path.join(installmentDir, 'signatures');

[installmentDir, idCardDir, selfieDir, salarySlipDir, signatureDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helper function to extract type from filename
function extractTypeFromFilename(originalname) {
  if (originalname.startsWith('idCard_')) return 'idCard';
  if (originalname.startsWith('selfie_')) return 'selfie';
  if (originalname.startsWith('salarySlip_')) return 'salarySlip';
  if (originalname.startsWith('customerSignature_')) return 'customerSignature';
  if (originalname.startsWith('salespersonSignature_')) return 'salespersonSignature';
  if (originalname.startsWith('witnessPhoto_')) return 'witnessPhoto';
  if (originalname.startsWith('witnessIdCard_')) return 'witnessIdCard';

  // Check for undefined patterns
  if (originalname.includes('undefined_undefined')) {
    console.warn('⚠️ Detected undefined in filename, defaulting to general');
    return 'general';
  }

  return 'general';
}

// Installment image storage configuration
const installmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Extract type from filename since req.body is not available yet
    const type = extractTypeFromFilename(file.originalname);
    let destDir = installmentDir;

    console.log(`📁 Determining destination for type: ${type}, filename: ${file.originalname}`);

    switch(type) {
      case 'idCard':
        destDir = idCardDir;
        break;
      case 'selfie':
        destDir = selfieDir;
        break;
      case 'salarySlip':
        destDir = salarySlipDir;
        break;
      case 'customerSignature':
      case 'salespersonSignature':
        destDir = signatureDir;
        break;
      case 'witnessPhoto':
      case 'witnessIdCard':
        destDir = installmentDir; // Store witness images in main installment folder
        break;
      default:
        destDir = installmentDir;
    }

    console.log(`📁 Selected destination: ${destDir}`);
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    // Extract type from filename since req.body is not available yet
    const type = extractTypeFromFilename(file.originalname);
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.jpg';

    // We'll get branchCode from req.body later in the route handler
    const filename = `${type}_temp_${timestamp}${ext}`;

    console.log(`📝 Generated filename: ${filename} for type: ${type}`);
    cb(null, filename);
  }
});

// File filter for installment images
const installmentFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
  }
};

// Create installment upload middleware
const installmentUpload = multer({
  storage: installmentStorage,
  fileFilter: installmentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).single('file');

// Route สำหรับอัปโหลดรูปภาพในระบบผ่อน
router.post('/installment-image', authJWT, (req, res) => {
  installmentUpload(req, res, (err) => {
    if (err) {
      console.error('Installment image upload error:', err);
      return res.status(400).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
        error: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบไฟล์ที่อัปโหลด'
      });
    }

    try {
      const type = req.body.type || extractTypeFromFilename(req.file.originalname);
      const branchCode = req.body.branchCode || '00000';

      console.log(`📋 Processing upload - Type: ${type}, Branch: ${branchCode}, Original: ${req.file.originalname}, Saved: ${req.file.filename}`);
      console.log(`📋 Request body:`, req.body);
      console.log(`📋 File info:`, {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      });

      // Rename file to include proper branchCode
      const oldPath = req.file.path;
      const ext = path.extname(req.file.filename);
      const timestamp = Date.now();
      const newFilename = `${type}_${branchCode}_${timestamp}${ext}`;
      const newPath = path.join(path.dirname(oldPath), newFilename);

      // Rename the file
      fs.renameSync(oldPath, newPath);
      console.log(`📝 File renamed from ${req.file.filename} to ${newFilename}`);

      // Generate URL based on type
      let imageUrl;
      switch(type) {
        case 'idCard':
          imageUrl = `/uploads/installments/id-cards/${newFilename}`;
          break;
        case 'selfie':
          imageUrl = `/uploads/installments/selfies/${newFilename}`;
          break;
        case 'salarySlip':
          imageUrl = `/uploads/installments/salary-slips/${newFilename}`;
          break;
        case 'customerSignature':
        case 'salespersonSignature':
          imageUrl = `/uploads/installments/signatures/${newFilename}`;
          break;
        case 'witnessPhoto':
        case 'witnessIdCard':
          imageUrl = `/uploads/installments/${newFilename}`;
          break;
        default:
          imageUrl = `/uploads/installments/${newFilename}`;
      }

      console.log(`✅ Installment image uploaded: ${type} for branch ${branchCode} -> ${imageUrl}`);

      res.json({
        success: true,
        message: 'อัปโหลดรูปภาพสำเร็จ',
        url: imageUrl,
        filename: newFilename,
        type: type,
        size: req.file.size,
        branchCode: branchCode
      });

    } catch (error) {
      console.error('Installment image processing error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ',
        error: error.message
      });
    }
  });
});

// Route สำหรับอัปโหลดรูปภาพพนักงาน
router.post('/employee-images', authJWT, employeeImageUpload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'idCardImage', maxCount: 1 }
]), (req, res) => {
  try {
    const uploadedFiles = req.files;
    const result = {
      profileImagePath: null,
      idCardImagePath: null
    };

    if (uploadedFiles.profileImage && uploadedFiles.profileImage[0]) {
      result.profileImagePath = uploadedFiles.profileImage[0].path;
    }

    if (uploadedFiles.idCardImage && uploadedFiles.idCardImage[0]) {
      result.idCardImagePath = uploadedFiles.idCardImage[0].path;
    }

    res.json({
      success: true,
      message: 'อัปโหลดรูปภาพสำเร็จ',
      data: result
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
      error: error.message
    });
  }
});

module.exports = router;
