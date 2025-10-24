const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

console.log('📁 Loading document routes...');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/documents');

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const { documentType, customerId } = req.body;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);

    // Extract document type from filename if not provided
    let finalDocumentType = documentType;
    if (!finalDocumentType || finalDocumentType === 'undefined') {
      // Try to extract from filename
      if (file.originalname.includes('idCard')) finalDocumentType = 'idCard';
      else if (file.originalname.includes('selfie')) finalDocumentType = 'selfie';
      else if (file.originalname.includes('salarySlip')) finalDocumentType = 'salarySlip';
      else if (file.originalname.includes('signature')) finalDocumentType = 'signature';
      else finalDocumentType = 'document';
    }

    // Use a default customer ID if not provided
    const finalCustomerId = customerId && customerId !== 'undefined' ? customerId : 'temp';

    const filename = `${finalDocumentType}_${finalCustomerId}_${timestamp}${ext}`;
    console.log(`📝 Generated filename: ${filename} (type: ${finalDocumentType}, customer: ${finalCustomerId})`);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('ประเภทไฟล์ไม่ถูกต้อง รองรับเฉพาะ JPG, PNG, PDF'), false);
    }
  }
});

/**
 * POST /api/documents/upload
 * อัปโหลดเอกสารประกอบการสมัครผ่อน
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { documentType, customerId, metadata } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบไฟล์ที่อัปโหลด'
      });
    }

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุประเภทเอกสาร'
      });
    }

    console.log('📤 Document uploaded:', {
      documentType,
      customerId,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Create file URL
    const fileUrl = `/uploads/documents/${req.file.filename}`;

    // Prepare response data
    const responseData = {
      uploadId: `doc_${Date.now()}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: fileUrl,
      size: req.file.size,
      type: req.file.mimetype,
      documentType,
      customerId,
      uploadedAt: new Date().toISOString()
    };

    // Add metadata if provided
    if (metadata) {
      try {
        responseData.metadata = JSON.parse(metadata);
      } catch (e) {
        responseData.metadata = metadata;
      }
    }

    res.json({
      success: true,
      message: 'อัปโหลดเอกสารสำเร็จ',
      data: responseData
    });

  } catch (error) {
    console.error('❌ Document upload error:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'ไฟล์ใหญ่เกินไป สูงสุด 10MB'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการอัปโหลดเอกสาร'
    });
  }
});

/**
 * GET /api/documents/:documentId
 * ดึงเอกสารตาม ID
 */
router.get('/:documentId', (req, res) => {
  try {
    const { documentId } = req.params;
    const filePath = path.join(__dirname, '../uploads/documents', documentId);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบเอกสาร'
      });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const ext = path.extname(documentId).toLowerCase();

    // Set content type based on extension
    let contentType = 'application/octet-stream';
    if (['.jpg', '.jpeg'].includes(ext)) {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.pdf') {
      contentType = 'application/pdf';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);

    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Document retrieve error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงเอกสาร'
    });
  }
});

/**
 * DELETE /api/documents/:documentId
 * ลบเอกสาร
 */
router.delete('/:documentId', (req, res) => {
  try {
    const { documentId } = req.params;
    const filePath = path.join(__dirname, '../uploads/documents', documentId);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบเอกสาร'
      });
    }

    // Delete file
    fs.unlinkSync(filePath);

    console.log('🗑️ Document deleted:', documentId);

    res.json({
      success: true,
      message: 'ลบเอกสารสำเร็จ'
    });

  } catch (error) {
    console.error('❌ Document delete error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบเอกสาร'
    });
  }
});

/**
 * GET /api/documents/customer/:customerId
 * ดึงเอกสารทั้งหมดของลูกค้า
 */
router.get('/customer/:customerId', (req, res) => {
  try {
    const { customerId } = req.params;
    const documentsDir = path.join(__dirname, '../uploads/documents');

    if (!fs.existsSync(documentsDir)) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Read directory and filter files by customer ID
    const files = fs.readdirSync(documentsDir);
    const customerFiles = files.filter(file => file.includes(`_${customerId}_`));

    const documents = customerFiles.map(filename => {
      const filePath = path.join(documentsDir, filename);
      const stats = fs.statSync(filePath);

      // Parse filename to extract document type
      const parts = filename.split('_');
      const documentType = parts[0] || 'unknown';
      const timestamp = parts[2] ? parts[2].split('.')[0] : Date.now();

      return {
        filename,
        documentType,
        url: `/uploads/documents/${filename}`,
        size: stats.size,
        uploadedAt: new Date(parseInt(timestamp) || stats.ctime).toISOString(),
        type: filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
      };
    });

    res.json({
      success: true,
      data: documents
    });

  } catch (error) {
    console.error('❌ Customer documents retrieve error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงเอกสารลูกค้า'
    });
  }
});

/**
 * POST /api/documents/validate
 * ตรวจสอบความถูกต้องของเอกสาร
 */
router.post('/validate', (req, res) => {
  try {
    const { documents, customerId } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุรายการเอกสาร'
      });
    }

    const requiredDocuments = ['idCard', 'selfie', 'customerSignature'];
    const validationResults = [];

    // Check each required document
    requiredDocuments.forEach(docType => {
      const hasDocument = documents.some(doc => doc.documentType === docType);

      validationResults.push({
        documentType: docType,
        required: true,
        present: hasDocument,
        valid: hasDocument,
        message: hasDocument ? 'พร้อมใช้งาน' : 'ยังไม่ได้อัปโหลด'
      });
    });

    // Check optional documents
    const optionalDocuments = ['salarySlip', 'salespersonSignature'];
    optionalDocuments.forEach(docType => {
      const hasDocument = documents.some(doc => doc.documentType === docType);

      validationResults.push({
        documentType: docType,
        required: false,
        present: hasDocument,
        valid: true, // Optional documents are always valid
        message: hasDocument ? 'พร้อมใช้งาน' : 'ไม่บังคับ'
      });
    });

    const allRequiredPresent = validationResults
      .filter(result => result.required)
      .every(result => result.present);

    res.json({
      success: true,
      data: {
        isValid: allRequiredPresent,
        validationResults,
        summary: {
          totalRequired: requiredDocuments.length,
          completedRequired: validationResults.filter(r => r.required && r.present).length,
          totalOptional: optionalDocuments.length,
          completedOptional: validationResults.filter(r => !r.required && r.present).length
        }
      }
    });

  } catch (error) {
    console.error('❌ Document validation error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบเอกสาร'
    });
  }
});

console.log('📁 Document routes configured - POST /upload endpoint ready');
module.exports = router;