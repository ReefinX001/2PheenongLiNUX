const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Customer = require('../models/Customer/Customer');
const router  = express.Router();

// ฟังก์ชันสำหรับตรวจสอบและสร้างเลขต่อท้าย
async function getCustomerFolderName(citizenId) {
  try {
    if (!citizenId) {
      throw new Error('ไม่พบเลขบัตรประชาชน');
    }

    // ค้นหาลูกค้าจากเลขบัตรประชาชนเท่านั้น (ไม่ใช่ folderName)
    const existingCustomers = await Customer.find({
      $or: [
        { citizenId: citizenId },
        { taxId: citizenId }
      ]
    }).sort({ createdAt: 1 });

    let folderName = citizenId;

    // ถ้าเป็นลูกค้าเก่า ให้เพิ่มเลขต่อท้าย
    if (existingCustomers.length > 0) {
      // หาเลขต่อท้ายที่ใช้ไปแล้วจาก folderName ที่มีอยู่
      const usedNumbers = [];
      let hasOriginalFolder = false;

      for (const customer of existingCustomers) {
        if (customer.folderName) {
          // ตรวจสอบว่า folderName นั้นเริ่มต้นด้วยเลขบัตรประชาชนหรือไม่
          if (customer.folderName.startsWith(citizenId)) {
            const parts = customer.folderName.split('-');
            if (parts.length > 1 && parts[0] === citizenId) {
              // มี suffix เช่น 1234567890123-0001
              const num = parseInt(parts[parts.length - 1]);
              if (!isNaN(num)) {
                usedNumbers.push(num);
              }
            } else if (customer.folderName === citizenId) {
              // ไม่มี suffix (ลูกค้าครั้งแรก) เช่น 1234567890123
              hasOriginalFolder = true;
            }
          }
        }
      }

      // หาเลขต่อท้ายที่ยังไม่ถูกใช้
      let nextNumber = 1;

      // ถ้ามีโฟลเดอร์ต้นฉบับอยู่แล้ว เริ่มจาก 0001
      if (hasOriginalFolder) {
        while (usedNumbers.includes(nextNumber)) {
          nextNumber++;
        }
        folderName = `${citizenId}-${nextNumber.toString().padStart(4, '0')}`;
      } else {
        // ถ้าไม่มีโฟลเดอร์ต้นฉบับ ใช้เลขบัตรประชาชนเปล่าๆ
        folderName = citizenId;
      }
    }

    return folderName;
  } catch (error) {
    console.error('Error getting customer folder name:', error);
    throw error;
  }
}

// ฟังก์ชันสำหรับสร้างโฟลเดอร์ตามเลขบัตรประชาชน
function createCustomerFolder(citizenId, folderName) {
  try {
    const baseDir = path.join(__dirname, '..', 'public', 'uploads', 'customers');
    const customerDir = path.join(baseDir, folderName);

    // สร้างโฟลเดอร์หลัก
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    // สร้างโฟลเดอร์ลูกค้า
    if (!fs.existsSync(customerDir)) {
      fs.mkdirSync(customerDir, { recursive: true });
    }

    // สร้างโฟลเดอร์ย่อยสำหรับแต่ละประเภทเอกสาร
    const subFolders = ['id-cards', 'selfies', 'salary-slips', 'signatures', 'documents'];
    subFolders.forEach(folder => {
      const subDir = path.join(customerDir, folder);
      if (!fs.existsSync(subDir)) {
        fs.mkdirSync(subDir, { recursive: true });
      }
    });

    return customerDir;
  } catch (error) {
    console.error('Error creating customer folder:', error);
    throw error;
  }
}

// middleware สำหรับประมวลผลโฟลเดอร์ก่อนอัปโหลด
async function preprocessCustomerFolder(req, res, next) {
  try {
    // 🔧 FINAL FIX: Read citizenId ONLY from a custom header.
    // This avoids all issues with multer body parsing order.
    const citizenId = req.headers['x-citizen-id'];

    console.log('🛂 [Preprocess] Reading citizenId from header "x-citizen-id":', citizenId);

    if (!citizenId || citizenId === '0000000000000' || citizenId === 'null' || citizenId === 'undefined') {
      return res.status(400).json({
        success: false,
        error: 'X-Citizen-Id header is required and cannot be empty.'
      });
    }

    // ดึงชื่อโฟลเดอร์และสร้างโฟลเดอร์
    const folderName = await getCustomerFolderName(citizenId);
    createCustomerFolder(citizenId, folderName);

    // เก็บข้อมูลใน request object
    req.customerFolderName = folderName;
    req.citizenId = citizenId;

    next();
  } catch (error) {
    console.error('Error preprocessing customer folder:', error);
    res.status(500).json({
      success: false,
      error: `ไม่สามารถเตรียมโฟลเดอร์ลูกค้าได้: ${error.message}`
    });
    }
}

// สร้าง storage ของ multer (แบบปกติไม่ใช้ async)
const createStorageForCustomer = (docType) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        if (!req.customerFolderName) {
          return cb(new Error('Customer folder name not found'));
        }

        const baseDir = path.join(__dirname, '..', 'public', 'uploads', 'customers');
        const docDir = path.join(baseDir, req.customerFolderName, docType);

        // ตรวจสอบว่าโฟลเดอร์มีอยู่จริง
        if (!fs.existsSync(docDir)) {
          fs.mkdirSync(docDir, { recursive: true });
        }

        cb(null, docDir);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      try {
      const ext = path.extname(file.originalname);
        const timestamp = Date.now();
        const folderName = req.customerFolderName || 'unknown';
        const sanitizedDocType = docType.replace(/[^a-zA-Z0-9-]/g, '');
        cb(null, `${folderName}-${sanitizedDocType}-${timestamp}${ext}`);
      } catch (error) {
        cb(error);
      }
    }
  });
};

// middleware สำหรับแต่ละประเภทเอกสาร
const uploadFactory = (docType) => {
  return multer({
    storage: createStorageForCustomer(docType),
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // ตรวจสอบประเภทไฟล์
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
      }
    }
  }).single('file');
};

const upload = multer();

// REORDER: Ensure preprocessCustomerFolder runs before uploadFactory
// POST /api/upload-documents/id-card
router.post('/id-card', preprocessCustomerFolder, uploadFactory('id-cards'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
}

    const folderName = req.customerFolderName;
    const url = `/uploads/customers/${folderName}/id-cards/${req.file.filename}`;

    // อัปเดตข้อมูลลูกค้า
    if (req.body.customerId) {
      await Customer.findByIdAndUpdate(
        req.body.customerId,
        {
          idCardImage: url,
          folderName: folderName
        },
        { new: true }
      );
    }

    res.json({ success: true, url, folderName });
  } catch (error) {
    console.error('Error uploading ID card:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/upload-documents/selfie
router.post('/selfie', preprocessCustomerFolder, uploadFactory('selfies'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const folderName = req.customerFolderName;
    const url = `/uploads/customers/${folderName}/selfies/${req.file.filename}`;

    // อัปเดตข้อมูลลูกค้า
    if (req.body.customerId) {
      await Customer.findByIdAndUpdate(
        req.body.customerId,
        {
          selfieImage: url,
          folderName: folderName
        },
        { new: true }
      );
    }

    res.json({ success: true, url, folderName });
  } catch (error) {
    console.error('Error uploading selfie:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/upload-documents/salary-slip
router.post('/salary-slip', preprocessCustomerFolder, uploadFactory('salary-slips'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const folderName = req.customerFolderName;
    const url = `/uploads/customers/${folderName}/salary-slips/${req.file.filename}`;

    // อัปเดตข้อมูลลูกค้า
    if (req.body.customerId) {
      await Customer.findByIdAndUpdate(
        req.body.customerId,
        {
          incomeSlip: url,
          folderName: folderName
        },
        { new: true }
      );
    }

    res.json({ success: true, url, folderName });
  } catch (error) {
    console.error('Error uploading salary slip:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/upload-documents/signature
router.post('/signature', preprocessCustomerFolder, uploadFactory('signatures'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const folderName = req.customerFolderName;
    const url = `/uploads/customers/${folderName}/signatures/${req.file.filename}`;

    // อัปเดตข้อมูลลูกค้า
    if (req.body.customerId) {
      await Customer.findByIdAndUpdate(
        req.body.customerId,
        {
          signatureImage: url,
          folderName: folderName
        },
        { new: true }
      );
    }

    res.json({ success: true, url, folderName });
  } catch (error) {
    console.error('Error uploading signature:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/upload-documents/document (สำหรับเอกสารทั่วไป)
router.post('/document', preprocessCustomerFolder, uploadFactory('documents'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

    const folderName = req.customerFolderName;
    const docType = req.body.type || 'general';
    const url = `/uploads/customers/${folderName}/documents/${req.file.filename}`;

    // อัปเดตข้อมูลลูกค้า
    if (req.body.customerId) {
      const updateData = { folderName: folderName };

      // อัปเดต field ที่เหมาะสมตามประเภทเอกสาร
      switch (docType) {
        case 'idCard':
          updateData.idCardImage = url;
          break;
        case 'selfie':
          updateData.selfieImage = url;
          break;
        case 'salarySlip':
          updateData.incomeSlip = url;
          break;
        case 'signature':
          updateData.signatureImage = url;
          break;
        default:
          // สำหรับเอกสารทั่วไป สามารถเก็บในอาร์เรย์
          if (!updateData.documents) updateData.documents = [];
          updateData.documents.push({ type: docType, url: url, uploadedAt: new Date() });
          break;
      }

      await Customer.findByIdAndUpdate(
        req.body.customerId,
        updateData,
        { new: true }
      );
    }

    res.json({ success: true, url, folderName, docType });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// error handler
router.use((err, req, res, next) => {
  console.error('Upload error:', err);

  if (err instanceof multer.MulterError) {
    let message = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'ประเภทไฟล์ไม่ถูกต้อง';
    }
    return res.status(400).json({ success: false, error: message });
  }

  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: 'ประเภทไฟล์ไม่ถูกต้อง อนุญาตเฉพาะ JPEG, PNG, WebP เท่านั้น'
    });
  }

  return res.status(500).json({
    success: false,
    error: err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์'
  });
});

module.exports = router;
