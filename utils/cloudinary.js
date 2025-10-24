// utils/cloudinary.js

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// กำหนดค่า Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ฟังก์ชันสำหรับอัพโหลดไฟล์ไปยัง Cloudinary
const uploadToCloudinary = async (file, folder = 'customers') => {
  try {
    // ถ้าเป็น base64
    if (typeof file === 'string' && file.startsWith('data:')) {
      const result = await cloudinary.uploader.upload(file, {
        folder: folder,
        resource_type: 'auto'
      });
      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes
      };
    }

    // ถ้าเป็น file path หรือ buffer
    const result = await cloudinary.uploader.upload(file.path || file, {
      folder: folder,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' }, // จำกัดขนาดรูป
        { quality: 'auto:good' } // ปรับคุณภาพอัตโนมัติ
      ]
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`ไม่สามารถอัพโหลดไฟล์ได้: ${error.message}`);
  }
};

// ฟังก์ชันสำหรับลบไฟล์จาก Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error('ไม่พบ publicId');
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== 'ok') {
      throw new Error('ไม่สามารถลบไฟล์ได้');
    }

    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`ไม่สามารถลบไฟล์ได้: ${error.message}`);
  }
};

// ฟังก์ชันสำหรับอัพโหลดหลายไฟล์
const uploadMultipleToCloudinary = async (files, folder = 'customers') => {
  try {
    const uploadPromises = files.map(file => uploadToCloudinary(file, folder));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Multiple upload error:', error);
    throw new Error(`ไม่สามารถอัพโหลดไฟล์ได้: ${error.message}`);
  }
};

// ฟังก์ชันสำหรับลบหลายไฟล์
const deleteMultipleFromCloudinary = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(publicId => deleteFromCloudinary(publicId));
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error('Multiple delete error:', error);
    throw new Error(`ไม่สามารถลบไฟล์ได้: ${error.message}`);
  }
};

// กำหนดค่า multer storage สำหรับ Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // กำหนด folder ตามประเภทไฟล์
    let folder = 'customers';
    if (file.fieldname === 'idCard') {
      folder = 'customers/id-cards';
    } else if (file.fieldname === 'documents') {
      folder = 'customers/documents';
    } else if (file.fieldname === 'profile') {
      folder = 'customers/profiles';
    }

    return {
      folder: folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto:good' }
      ]
    };
  }
});

// สร้าง multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // จำกัดขนาดไฟล์ 5MB
  },
  fileFilter: (req, file, cb) => {
    // ตรวจสอบประเภทไฟล์
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('ประเภทไฟล์ไม่ถูกต้อง รองรับเฉพาะ jpg, jpeg, png, pdf, doc, docx'));
    }
  }
});

// ฟังก์ชันสำหรับสร้าง URL ที่ปรับขนาดแล้ว
const getOptimizedUrl = (url, options = {}) => {
  const { width = 300, height = 300, quality = 'auto' } = options;

  // แปลง URL เพื่อใส่ transformation
  const urlParts = url.split('/upload/');
  if (urlParts.length === 2) {
    const transformation = `w_${width},h_${height},c_limit,q_${quality}`;
    return `${urlParts[0]}/upload/${transformation}/${urlParts[1]}`;
  }

  return url;
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadMultipleToCloudinary,
  deleteMultipleFromCloudinary,
  upload,
  getOptimizedUrl
};
