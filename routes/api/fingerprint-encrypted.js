/**
 * Encrypted Fingerprint API - รับข้อมูลลายนิ้วมือที่เข้ารหัสจาก Windows Service
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

// Import middleware
const authJWT = require('../../middlewares/authJWT');
const { rateLimits } = require('../../middleware/security');
const { asyncHandler } = require('../../utils/error-handler');

// Import models
const DepositReceipt = require('../../models/DepositReceipt');

// Configuration
const ENCRYPTION_KEY = process.env.FINGERPRINT_ENCRYPTION_KEY || 'your-32-character-secret-key-here!';
const API_KEY = process.env.FINGERPRINT_API_KEY || 'your-production-api-key';
const IMAGES_DIR = path.join(__dirname, '../../public/uploads/fingerprints');

// Apply rate limiting
router.use(rateLimits.general);

/**
 * POST /api/fingerprint/upload-encrypted
 * รับข้อมูลลายนิ้วมือที่เข้ารหัสจาก Windows Service
 */
router.post('/upload-encrypted',
  asyncHandler(async (req, res) => {
    try {
      // ตรวจสอบ API Key
      const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
      if (apiKey !== API_KEY) {
        return res.status(401).json({
          success: false,
          message: 'Invalid API key'
        });
      }

      const {
        encryptedData,
        iv,
        deviceId,
        scanId,
        timestamp,
        checksum,
        receiptId,
        signatureType = 'customer'
      } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!encryptedData || !iv || !checksum || !scanId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required encrypted data fields'
        });
      }

      console.log(`🔒 Received encrypted fingerprint data from device: ${deviceId}`);
      console.log(`🆔 Scan ID: ${scanId}`);

      // ถอดรหัสข้อมูล
      const decryptedData = await decryptFingerprintData(encryptedData, iv);

      // ตรวจสอบ checksum
      const calculatedChecksum = crypto.createHash('sha256')
        .update(JSON.stringify(decryptedData))
        .digest('hex');

      if (calculatedChecksum !== checksum) {
        throw new Error('Checksum verification failed - data integrity compromised');
      }

      console.log(`✅ Data decrypted and verified successfully`);

      // แปลงภาพจาก raw data เป็น JPG
      const imageResult = await convertRawImageToJPG(
        decryptedData.imageData,
        decryptedData.width,
        decryptedData.height,
        scanId
      );

      // บันทึกข้อมูลลงฐานข้อมูล (ถ้ามี receiptId)
      let fingerprintRecord = null;
      if (receiptId) {
        fingerprintRecord = await saveFingerprintToDatabase(
          receiptId,
          signatureType,
          {
            template: decryptedData.template,
            imageData: decryptedData.imageData,
            imageUrl: imageResult.imageUrl,
            imagePath: imageResult.filePath,
            timestamp: timestamp,
            quality: 'high',
            scanId: scanId,
            deviceId: deviceId,
            checksum: checksum
          }
        );
      }

      // บันทึก metadata ลง fingerprint_scans table
      await saveFingerprintScan({
        scanId,
        deviceId,
        template: decryptedData.template,
        imagePath: imageResult.filePath,
        imageUrl: imageResult.imageUrl,
        checksum,
        scanTimestamp: new Date(timestamp),
        receiptId,
        signatureType,
        width: decryptedData.width,
        height: decryptedData.height
      });

      res.status(200).json({
        success: true,
        message: 'Encrypted fingerprint data received and processed successfully',
        data: {
          scanId: scanId,
          deviceId: deviceId,
          imageUrl: imageResult.imageUrl,
          imagePath: imageResult.filePath,
          fingerprintId: fingerprintRecord?._id,
          receiptId: receiptId,
          signatureType: signatureType,
          processedAt: new Date().toISOString(),
          fileSize: imageResult.fileSize,
          dimensions: `${decryptedData.width}x${decryptedData.height}`,
          templateSize: decryptedData.template?.length || 0
        }
      });

    } catch (error) {
      console.error('❌ Encrypted fingerprint processing error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to process encrypted fingerprint data',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  })
);

/**
 * ถอดรหัสข้อมูลลายนิ้วมือ
 */
async function decryptFingerprintData(encryptedData, iv) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(iv, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * แปลง raw image data เป็น JPG file
 */
async function convertRawImageToJPG(imageDataBase64, width, height, scanId) {
  try {
    // สร้างโฟลเดอร์ถ้าไม่มี
    await fs.mkdir(IMAGES_DIR, { recursive: true });

    // แปลง Base64 เป็น Buffer
    const imageBuffer = Buffer.from(imageDataBase64, 'base64');

    // สร้างชื่อไฟล์ JPG
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
    const filename = `fingerprint_${scanId}_${timestamp}.jpg`;
    const filePath = path.join(IMAGES_DIR, filename);

    // แปลง raw grayscale data เป็น JPG ด้วย Sharp
    await sharp(imageBuffer, {
      raw: {
        width: width,
        height: height,
        channels: 1 // grayscale
      }
    })
    .jpeg({ quality: 90 })
    .toFile(filePath);

    const stats = await fs.stat(filePath);
    const imageUrl = `/uploads/fingerprints/${filename}`;

    console.log(`📸 Image converted to JPG: ${filename} (${Math.round(stats.size / 1024)}KB)`);

    return {
      filename: filename,
      filePath: filePath,
      imageUrl: imageUrl,
      fileSize: stats.size
    };

  } catch (error) {
    throw new Error(`Image conversion failed: ${error.message}`);
  }
}

/**
 * บันทึกข้อมูลลายนิ้วมือลงฐานข้อมูล (สำหรับ receipt)
 */
async function saveFingerprintToDatabase(receiptId, signatureType, scanData) {
  try {
    const updateData = {
      [`fingerprints.${signatureType}Fingerprint`]: {
        template: scanData.template,
        imageUrl: scanData.imageUrl,
        imagePath: scanData.imagePath,
        scannedAt: scanData.timestamp,
        scannedBy: 'system',
        scannedByName: 'Windows Service',
        quality: scanData.quality,
        scanId: scanData.scanId,
        deviceId: scanData.deviceId,
        checksum: scanData.checksum,
        deviceInfo: {
          deviceIP: '100.106.108.57',
          deviceModel: 'ZK9500',
          sdkVersion: '10.0',
          connectionType: 'Encrypted TCP'
        }
      }
    };

    const updatedReceipt = await DepositReceipt.findOneAndUpdate(
      { receiptNumber: receiptId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedReceipt) {
      throw new Error('Receipt not found');
    }

    console.log(`✅ Fingerprint saved to receipt: ${receiptId}`);
    return updatedReceipt;

  } catch (error) {
    console.error(`❌ Database save error: ${error.message}`);
    throw error;
  }
}

/**
 * บันทึก fingerprint scan metadata
 */
async function saveFingerprintScan(scanData) {
  try {
    // สร้าง fingerprint_scans collection ถ้าไม่มี
    const mongoose = require('mongoose');

    const FingerprintScanSchema = new mongoose.Schema({
      scanId: { type: String, unique: true, required: true },
      deviceId: String,
      template: String,
      imagePath: String,
      imageUrl: String,
      checksum: String,
      scanTimestamp: Date,
      receivedTimestamp: { type: Date, default: Date.now },
      receiptId: String,
      signatureType: String,
      width: Number,
      height: Number
    });

    const FingerprintScan = mongoose.models.FingerprintScan ||
      mongoose.model('FingerprintScan', FingerprintScanSchema);

    const scanRecord = new FingerprintScan(scanData);
    await scanRecord.save();

    console.log(`📝 Scan metadata saved: ${scanData.scanId}`);
    return scanRecord;

  } catch (error) {
    console.error(`❌ Scan metadata save error: ${error.message}`);
    // ไม่ throw error เพราะไม่ใช่ critical
  }
}

/**
 * GET /api/fingerprint/scans
 * ดูประวัติการสแกนทั้งหมด
 */
router.get('/scans',
  authJWT,
  asyncHandler(async (req, res) => {
    try {
      const mongoose = require('mongoose');
      const FingerprintScan = mongoose.models.FingerprintScan;

      if (!FingerprintScan) {
        return res.json({ success: true, data: [] });
      }

      const scans = await FingerprintScan.find()
        .sort({ receivedTimestamp: -1 })
        .limit(100);

      res.json({
        success: true,
        data: scans,
        count: scans.length
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve scan history',
        error: error.message
      });
    }
  })
);

module.exports = router;