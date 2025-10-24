/**
 * Fingerprint API Routes - สำหรับการจัดการลายนิ้วมือ
 * API endpoints สำหรับการสแกน, บันทึก, และจัดการลายนิ้วมือ
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Import middleware - ใช้ middleware เดียวกับระบบหลัก
const authJWT = require('../../middlewares/authJWT');
const { rateLimits } = require('../../middleware/security');
const { asyncHandler } = require('../../utils/error-handler');

// Import services
const ZKFingerTCPService = require('../../services/zkfinger/ZKFingerTCPService');

// Import models
const DepositReceipt = require('../../models/DepositReceipt');

// ฟังก์ชันสำหรับส่งภาพไปยัง API Server
async function uploadImageToApiServer(imageData) {
  const fetch = (await import('node-fetch')).default;

  // URL ของ API Server บน Windows Server
  const apiUrl = 'https://www.2pheenong.com/api/fingerprint/upload-base64';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(imageData),
      timeout: 30000, // 30 second timeout
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error('❌ API Server upload error:', error.message);
    throw error;
  }
}

// Import error classes
const {
  NotFoundError,
  ValidationError,
  DatabaseError
} = require('../../utils/error-handler');

// Memory cache สำหรับเก็บ imageUrl จากการ upload (TTL: 60 seconds)
// Structure: { timestamp_signatureType: { imageUrl, fileName, uploadedAt } }
const uploadCache = new Map();

// Create ZKFinger TCP service instance
const zkFingerService = new ZKFingerTCPService({
  host: '100.106.108.57',  // IP ของ Windows Server
  port: 8890,              // ใช้ port 8890 เท่านั้น
  timeout: 60000           // เพิ่ม timeout เป็น 60 วินาทีสำหรับการสแกน
});

// Apply rate limiting
router.use(rateLimits.general);

/**
 * POST /api/fingerprint/initialize
 * เริ่มต้นการใช้งาน ZKFinger Service
 */
router.post('/initialize',
  authJWT,
  asyncHandler(async (req, res) => {
    try {
      // ลองเชื่อมต่อแบบ graceful fallback
      let result;
      let connectionDetails = {
        host: zkFingerService.host,
        port: zkFingerService.port,
        timeout: zkFingerService.timeout
      };

      result = await zkFingerService.initialize();

      res.status(200).json({
        success: true,
        message: 'ZKFinger Service initialized successfully',
        data: {
          ...result,
          connectionDetails
        }
      });
    } catch (error) {
      console.error('❌ Initialize fingerprint service error:', error);
      console.error('Error stack:', error.stack);

      // ให้ข้อมูลที่มีประโยชน์สำหรับการแก้ไขปัญหา
      const errorDetails = {
        type: error.name || 'Unknown',
        message: error.message,
        host: zkFingerService.host,
        port: zkFingerService.port,
        timeout: zkFingerService.timeout,
        timestamp: new Date().toISOString()
      };

      // ตรวจสอบประเภทของ error
      let statusCode = 500;
      let userMessage = 'Failed to initialize fingerprint service';

      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        statusCode = 503;
        userMessage = `Connection timeout to ${zkFingerService.host}:${zkFingerService.port}. Please check if Windows Service is running.`;
      } else if (error.message.includes('ECONNREFUSED')) {
        statusCode = 503;
        userMessage = `Cannot connect to ${zkFingerService.host}:${zkFingerService.port}. Please check if ZKTeco Service is running.`;
      } else if (error.message.includes('Cannot connect to ZKTeco Service')) {
        statusCode = 503;
        userMessage = 'ZKTeco Windows Service is not responding. Please check service status.';
      }

      res.status(statusCode).json({
        success: false,
        message: userMessage,
        error: {
          type: errorDetails.type,
          details: errorDetails
        },
        troubleshooting: {
          steps: [
            `1. Check if ZKTeco Service is running on ${zkFingerService.host}`,
            `2. Verify port ${zkFingerService.port} is accessible`,
            '3. Check Windows Firewall settings',
            '4. Verify network connectivity'
          ]
        }
      });
    }
  })
);

/**
 * POST /api/fingerprint/connect
 * เชื่อมต่อกับเครื่องสแกนลายนิ้วมือ
 */
router.post('/connect',
  authJWT,
  asyncHandler(async (req, res) => {
    try {
      const { deviceIP } = req.body;

      // ใช้ IP เริ่มต้นหากไม่มีการระบุ
      const targetIP = deviceIP || '100.106.108.57';

      // ตรวจสอบว่า service initialize แล้วหรือไม่
      if (!zkFingerService.isInitialized) {
        console.log('🔄 Service not initialized, initializing first...');
        await zkFingerService.initialize();
      }

      const result = await zkFingerService.connectDevice(targetIP);

      res.status(200).json({
        success: true,
        message: 'Connected to fingerprint scanner successfully',
        data: {
          deviceIP: targetIP,
          serviceHost: zkFingerService.host,
          servicePort: zkFingerService.port,
          connectionTime: new Date(),
          ...result
        }
      });
    } catch (error) {
      console.error('❌ Connect fingerprint device error:', error);
      console.error('Error stack:', error.stack);

      // ให้ข้อมูลที่มีประโยชน์สำหรับการแก้ไขปัญหา
      const errorDetails = {
        type: error.name || 'Unknown',
        message: error.message,
        targetIP: req.body.deviceIP || '100.106.108.57',
        serviceHost: zkFingerService.host,
        servicePort: zkFingerService.port,
        isInitialized: zkFingerService.isInitialized,
        isConnected: zkFingerService.isConnected,
        timestamp: new Date().toISOString()
      };

      // ตรวจสอบประเภทของ error
      let statusCode = 500;
      let userMessage = 'Failed to connect to fingerprint scanner';

      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        statusCode = 503;
        userMessage = `Connection timeout to Windows Service at ${zkFingerService.host}:${zkFingerService.port}`;
      } else if (error.message.includes('ECONNREFUSED')) {
        statusCode = 503;
        userMessage = `Windows Service not running at ${zkFingerService.host}:${zkFingerService.port}`;
      } else if (error.message.includes('Cannot connect to ZKTeco Service')) {
        statusCode = 503;
        userMessage = 'ZKTeco Windows Service is not responding';
      } else if (error.message.includes('Device not connected')) {
        statusCode = 502;
        userMessage = 'ZK9500 fingerprint scanner is not connected to Windows Service';
      }

      res.status(statusCode).json({
        success: false,
        message: userMessage,
        error: {
          type: errorDetails.type,
          details: errorDetails
        },
        troubleshooting: {
          windowsService: [
            `Check ZKTeco Service on ${zkFingerService.host}`,
            `Verify port ${zkFingerService.port} is accessible`,
            'Check Windows Service status'
          ],
          hardware: [
            'Verify ZK9500 scanner is connected via USB',
            'Check device power and LED status',
            'Try reconnecting the scanner'
          ]
        }
      });
    }
  })
);

/**
 * POST /api/fingerprint/scan
 * สแกนลายนิ้วมือ
 */
router.post('/scan',
  authJWT,
  asyncHandler(async (req, res) => {
    try {
      const {
        receiptId,
        signatureType = 'customer',
        timeout = 30000,
        quality = 'high'
      } = req.body;

      // ตรวจสอบว่ามี receiptId
      if (!receiptId) {
        throw new ValidationError('Receipt ID is required');
      }

      // ตรวจสอบว่ามีใบเสร็จอยู่จริง
      const receipt = await DepositReceipt.findOne({ receiptNumber: receiptId });
      if (!receipt) {
        throw new NotFoundError('Receipt not found');
      }

      // ตรวจสอบสิทธิ์การเข้าถึงข้อมูลสาขา (admin สามารถเข้าถึงทุกสาขาได้)
      if (req.user.role !== 'admin' && receipt.branchCode !== req.user.branchCode) {
        throw new ValidationError('Access denied to this receipt');
      }

      console.log(`🔄 เริ่มการสแกนลายนิ้วมือสำหรับใบเสร็จ: ${receipt.receiptNumber}`);

      // ตรวจสอบสถานะการเชื่อมต่อก่อนสแกน
      if (!zkFingerService.isReady) {
        console.log('⚠️ ZKFinger Service ยังไม่พร้อม, กำลังเริ่มต้นใหม่...');
        await zkFingerService.initialize();
      }

      // สแกนลายนิ้วมือ
      const scanResult = await zkFingerService.scanFingerprint({
        timeout,
        quality,
        saveImage: true
      });

      // บันทึกผลลัพธ์การสแกนลงฐานข้อมูล
      const fingerprintData = await saveFingerprintToDatabase(
        receiptId,
        signatureType,
        scanResult,
        req.user
      );

      res.status(200).json({
        success: true,
        message: 'Fingerprint scanned and saved successfully',
        data: {
          receiptId,
          signatureType,
          scanTime: scanResult.timestamp,
          fingerprintId: fingerprintData._id,
          imageUrl: fingerprintData.imageUrl,
          imageData: scanResult.imageData, // เพิ่ม Base64 image data สำหรับแสดงผลใน frontend
          imageNote: fingerprintData.imageUrl?.startsWith('/api/fingerprint/image/')
            ? 'Image stored on Windows Server (access restricted)'
            : 'Image available',
          quality: scanResult.quality,
          template: scanResult.template ? 'Available' : 'Not available'
        }
      });

    } catch (error) {
      console.error('❌ Scan fingerprint error:', error);
      console.error('Error stack:', error.stack);

      // ตรวจสอบประเภทของ error เพื่อให้ข้อมูลที่เฉพาะเจาะจงมากขึ้น
      let errorMessage = 'Failed to scan fingerprint';
      let statusCode = 500;

      if (error instanceof ValidationError || error instanceof NotFoundError) {
        errorMessage = error.message;
        statusCode = 400;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Connection timeout to fingerprint service. Please check if Windows Service is running on 100.106.108.57:8890';
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to fingerprint service. Please ensure ZKTeco Service is running on 100.106.108.57:8890';
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('Device not connected')) {
        errorMessage = 'ZK9500 fingerprint scanner is not connected or initialized';
        statusCode = 502; // Bad Gateway
      } else {
        // Log detailed error for debugging
        console.error('Detailed error information:');
        console.error('- Message:', error.message);
        console.error('- TCP Host:', zkFingerService.host);
        console.error('- TCP Port:', zkFingerService.port);
        console.error('- Service Ready:', zkFingerService.isReady);
        console.error('- Last Status:', zkFingerService.lastStatus);
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: error.message,
        debug: {
          tcpHost: zkFingerService.host,
          tcpPort: zkFingerService.port,
          serviceReady: zkFingerService.isReady,
          timestamp: new Date().toISOString()
        }
      });
    }
  })
);

/**
 * GET /api/fingerprint/status
 * ตรวจสอบสถานะเครื่องสแกนลายนิ้วมือ
 */
router.get('/status',
  authJWT,
  asyncHandler(async (req, res) => {
    try {
      // ลองเรียกหลายฟังก์ชันเพื่อให้ข้อมูลครบถ้วน
      let status = null;
      let pingResult = null;
      let errors = [];

      // ทดสอบ ping ก่อน
      try {
        pingResult = await zkFingerService.ping();
      } catch (pingError) {
        errors.push({ operation: 'ping', error: pingError.message });
      }

      // ทดสอบ getStatus
      try {
        status = await zkFingerService.getStatus();
      } catch (statusError) {
        errors.push({ operation: 'getStatus', error: statusError.message });
      }

      const responseData = {
        service: {
          isInitialized: zkFingerService.isInitialized,
          isConnected: zkFingerService.isConnected,
          host: zkFingerService.host,
          port: zkFingerService.port,
          timeout: zkFingerService.timeout
        },
        connection: {
          ping: pingResult,
          status: status
        },
        timestamp: new Date().toISOString()
      };

      if (errors.length > 0) {
        responseData.errors = errors;
      }

      // ถ้ามี error หลักให้ส่ง 503, แต่ถ้าบางส่วนใช้งานได้ให้ส่ง 200
      const statusCode = (errors.length === 2) ? 503 : 200;

      res.status(statusCode).json({
        success: errors.length < 2,
        message: errors.length === 0 ? 'Service status retrieved successfully' : 'Partial service status available',
        data: responseData
      });

    } catch (error) {
      console.error('❌ Get fingerprint status error:', error);

      res.status(503).json({
        success: false,
        message: 'Failed to get service status',
        error: {
          type: error.name || 'Unknown',
          message: error.message
        },
        data: {
          service: {
            isInitialized: zkFingerService.isInitialized,
            isConnected: zkFingerService.isConnected,
            host: zkFingerService.host,
            port: zkFingerService.port,
            timeout: zkFingerService.timeout
          },
          timestamp: new Date().toISOString()
        }
      });
    }
  })
);

/**
 * GET /api/fingerprint/receipt/:receiptId
 * ดึงข้อมูลลายนิ้วมือของใบเสร็จ
 */
router.get('/receipt/:receiptId',
  authJWT,
  asyncHandler(async (req, res) => {
    try {
      const { receiptId } = req.params;

      const receipt = await DepositReceipt.findById(receiptId);
      if (!receipt) {
        throw new NotFoundError('Receipt not found');
      }

      // ตรวจสอบสิทธิ์การเข้าถึงข้อมูลสาขา (admin สามารถเข้าถึงทุกสาขาได้)
      if (req.user.role !== 'admin' && receipt.branchCode !== req.user.branchCode) {
        throw new ValidationError('Access denied to this receipt');
      }

      const fingerprintData = {
        receiptId,
        receiptNumber: receipt.receiptNumber,
        signatures: receipt.signatures || {},
        fingerprints: receipt.fingerprints || {}
      };

      res.status(200).json({
        success: true,
        data: fingerprintData
      });

    } catch (error) {
      console.error('❌ Get fingerprint data error:', error);

      if (error instanceof NotFoundError || error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve fingerprint data',
          error: error.message
        });
      }
    }
  })
);

/**
 * POST /api/fingerprint/disconnect
 * ตัดการเชื่อมต่อกับเครื่องสแกน
 */
router.post('/disconnect',
  authJWT,
  asyncHandler(async (req, res) => {
    try {
      const result = await zkFingerService.disconnect();

      res.status(200).json({
        success: true,
        message: 'Disconnected from fingerprint scanner successfully',
        data: result
      });
    } catch (error) {
      console.error('❌ Disconnect fingerprint device error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect from fingerprint scanner',
        error: error.message
      });
    }
  })
);

/**
 * GET /api/fingerprint/image/:filename
 * เข้าถึงภาพลายนิ้วมือจาก remote server
 */
router.get('/image/:filename',
  asyncHandler(async (req, res) => {
    try {
      const { filename } = req.params;

      // ตรวจสอบว่าเป็นไฟล์ภาพลายนิ้วมือที่ถูกต้อง
      if (!filename.match(/^fingerprint_\d+_\d+\.(jpg|jpeg|png|bmp)$/i)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filename format'
        });
      }

      // Path ของไฟล์บน local server
      const localPath = `D:\\ZKT3\\images\\${filename}`;
      // Fallback path if file is in different location
      const remotePath = `\\\\100.106.108.57\\D$\\ZKT3\\images\\${filename}`;

      console.log(`📷 Request for fingerprint image: ${filename}`);
      console.log(`📍 Remote path: ${remotePath}`);

      // ตรวจสอบไฟล์และส่งกลับ
      const fs = require('fs');
      const path = require('path');

      try {
        // ลองเข้าถึงไฟล์จาก network path
        if (fs.existsSync(remotePath)) {
          // อ่านไฟล์และส่งกลับเป็น binary
          const fileBuffer = fs.readFileSync(remotePath);

          // กำหนด content type ตาม extension
          const ext = path.extname(filename).toLowerCase();
          let contentType = 'image/jpeg';
          switch(ext) {
            case '.png': contentType = 'image/png'; break;
            case '.bmp': contentType = 'image/bmp'; break;
            case '.jpg':
            case '.jpeg':
            default: contentType = 'image/jpeg'; break;
          }

          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', fileBuffer.length);
          res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1 ชั่วโมง
          res.send(fileBuffer);

          console.log(`✅ Image served successfully: ${filename} (${fileBuffer.length} bytes)`);

        } else {
          // ไฟล์ไม่พบ
          res.status(404).json({
            success: false,
            message: 'Fingerprint image not found',
            data: {
              filename: filename,
              remotePath: remotePath,
              note: 'File not accessible from this server'
            }
          });
          console.log(`❌ Image not found: ${remotePath}`);
        }

      } catch (fileError) {
        // ไม่สามารถเข้าถึงไฟล์ได้
        console.log(`⚠️ Cannot access file: ${fileError.message}`);

        // ส่งกลับ placeholder image หรือข้อมูลสถานะ
        res.status(200).json({
          success: false,
          message: 'Image access restricted',
          data: {
            filename: filename,
            remotePath: remotePath,
            note: 'Image stored on remote server',
            accessible: false,
            reason: fileError.message
          }
        });
      }

    } catch (error) {
      console.error('❌ Fingerprint image access error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to access fingerprint image',
        error: error.message
      });
    }
  })
);

/**
 * POST /api/fingerprint/upload-base64
 * รับภาพลายนิ้วมือจาก Client และบันทึกลงเซิร์ฟเวอร์
 */
router.post('/upload-base64',
  asyncHandler(async (req, res) => {
    try {
      const { imageData, receiptId, signatureType, fileExtension = 'jpg' } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!imageData) {
        return res.status(400).json({
          success: false,
          message: 'Image data is required'
        });
      }

      if (!receiptId) {
        return res.status(400).json({
          success: false,
          message: 'Receipt ID is required'
        });
      }

      // สร้างโฟลเดอร์สำหรับเก็บไฟล์ลายนิ้วมือ
      const fingerprintDir = path.join(__dirname, '../../public/uploads/fingerprints');
      await fs.mkdir(fingerprintDir, { recursive: true });

      // สร้างชื่อไฟล์
      const timestamp = Date.now();
      const fileName = `fingerprint_${receiptId}_${signatureType || 'unknown'}_${timestamp}.${fileExtension}`;
      const filePath = path.join(fingerprintDir, fileName);

      // แปลง Base64 เป็น Buffer และบันทึกไฟล์
      const imageBuffer = Buffer.from(imageData, 'base64');
      await fs.writeFile(filePath, imageBuffer);

      // สร้าง URL สำหรับเข้าถึงไฟล์
      const imageUrl = `/uploads/fingerprints/${fileName}`;

      console.log(`✅ บันทึกภาพลายนิ้วมือสำเร็จ: ${fileName} (${Math.round(imageBuffer.length / 1024)}KB)`);

      // เก็บ imageUrl ไว้ใน cache โดยใช้ signatureType และ timestamp
      // เนื่องจาก Windows Service ส่ง receiptId เป็น "SERVICE" ไม่ตรงกับ receiptId จริง
      // เราจึงใช้ signatureType + uploadedAt เป็น key แทน
      const cacheKey = `${signatureType}_${timestamp}`;

      uploadCache.set(cacheKey, {
        imageUrl,
        fileName,
        receiptId,
        signatureType,
        uploadedAt: timestamp
      });

      console.log(`💾 Cached imageUrl with key: ${cacheKey}`);

      // Auto-clean cache หลัง 60 วินาที
      setTimeout(() => {
        uploadCache.delete(cacheKey);
      }, 60000);

      res.status(200).json({
        success: true,
        message: 'Fingerprint image uploaded successfully',
        data: {
          imageUrl,
          fileName,
          filePath: filePath,
          fileSize: imageBuffer.length,
          receiptId,
          signatureType,
          uploadedAt: new Date()
        }
      });

    } catch (error) {
      console.error('❌ Upload fingerprint image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload fingerprint image',
        error: error.message
      });
    }
  })
);

/**
 * Helper function: บันทึกข้อมูลลายนิ้วมือลงฐานข้อมูล
 */
async function saveFingerprintToDatabase(receiptId, signatureType, scanResult, user) {
  try {
    // สร้างโฟลเดอร์สำหรับเก็บไฟล์ลายนิ้วมือ
    const fingerprintDir = path.join(__dirname, '../../public/uploads/fingerprints');
    await fs.mkdir(fingerprintDir, { recursive: true });

    // สร้างข้อมูลไฟล์ภาพ
    const fileName = `fingerprint_${receiptId}_${signatureType}_${Date.now()}.jpg`;
    const finalPath = path.join(fingerprintDir, fileName);
    let imageUrl = null;

    // ส่งภาพไปยัง API Server ที่ Windows Server
    if (scanResult.imageData) {
      try {
        console.log('🔄 ส่งภาพลายนิ้วมือไปยัง API Server...');

        // ส่งภาพ Base64 ไปยัง API Server
        const uploadResponse = await uploadImageToApiServer({
          imageData: scanResult.imageData,
          receiptId: receiptId,
          signatureType: signatureType,
          fileExtension: 'jpg'
        });

        if (uploadResponse.success) {
          imageUrl = uploadResponse.data.imageUrl;
          console.log(`✅ ส่งภาพไปยัง API Server สำเร็จ: ${imageUrl}`);
        } else {
          throw new Error(uploadResponse.message || 'Failed to upload to API server');
        }

      } catch (uploadError) {
        console.error(`❌ ไม่สามารถส่งภาพไปยัง API Server: ${uploadError.message}`);

        // Fallback: บันทึกภาพใน client
        try {
          const imageBuffer = Buffer.from(scanResult.imageData, 'base64');
          await fs.writeFile(finalPath, imageBuffer);
          imageUrl = `/uploads/fingerprints/${fileName}`;
          console.log(`✅ Fallback: บันทึกภาพลายนิ้วมือในเครื่อง: ${finalPath}`);
        } catch (saveError) {
          console.error(`❌ ไม่สามารถบันทึกภาพ: ${saveError.message}`);
          imageUrl = null;
        }
      }
    } else if (scanResult.imageUrl) {
      imageUrl = scanResult.imageUrl;  // HTTP URL จาก Windows Server
      console.log(`✅ ใช้ภาพจาก Windows Server: ${imageUrl}`);
    } else if (scanResult.imagePath) {
      // กรณีที่ภาพถูก upload ไปยัง API Server โดย Windows Service แล้ว
      // ค้นหา imageUrl จาก cache โดยใช้ signatureType และ timestamp ล่าสุด
      console.log(`🔍 Searching for cached upload with signatureType: ${signatureType}`);
      console.log(`📍 Original path: ${scanResult.imagePath}`);

      // หา cache entry ล่าสุดที่ตรงกับ signatureType (ภายใน 10 วินาที)
      const now = Date.now();
      const maxAge = 10000; // 10 seconds
      let latestCache = null;
      let latestKey = null;

      for (const [key, data] of uploadCache.entries()) {
        if (data.signatureType === signatureType && (now - data.uploadedAt) < maxAge) {
          if (!latestCache || data.uploadedAt > latestCache.uploadedAt) {
            latestCache = data;
            latestKey = key;
          }
        }
      }

      if (latestCache && latestCache.imageUrl) {
        // พบ imageUrl จาก cache (ที่ Windows Service upload ไว้)
        imageUrl = `https://www.2pheenong.com${latestCache.imageUrl}`;
        console.log(`✅ Found imageUrl in upload cache: ${imageUrl}`);
        console.log(`📝 Cache age: ${now - latestCache.uploadedAt}ms`);
        console.log(`🔑 Cache key: ${latestKey}`);

        // ลบ cache ทันทีหลังใช้งาน
        uploadCache.delete(latestKey);
      } else {
        // ไม่พบ imageUrl ใน cache
        console.warn(`⚠️ No imageData or imageUrl in scanResult, and no cache found.`);
        console.log(`📊 Current cache size: ${uploadCache.size}`);
        console.log(`⏰ Searched for uploads within ${maxAge}ms`);
        imageUrl = null;
      }
    }

    // อัพเดทข้อมูลในฐานข้อมูล
    const updateData = {
      [`fingerprints.${signatureType}Fingerprint`]: {
        template: scanResult.template,
        imageUrl: imageUrl || null,
        remotePath: scanResult.imagePath || null,  // เก็บ path จาก remote server
        scannedAt: scanResult.timestamp,
        scannedBy: user._id,
        scannedByName: user.username,
        quality: scanResult.quality,
        deviceInfo: {
          deviceIP: zkFingerService.host,
          deviceModel: 'ZK9500',
          sdkVersion: '10.0',
          connectionType: 'TCP'
        },
        ipAddress: user.lastLoginIP || 'unknown'
      }
    };

    const updatedReceipt = await DepositReceipt.findOneAndUpdate(
      { receiptNumber: receiptId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedReceipt) {
      throw new DatabaseError('Failed to update receipt with fingerprint data');
    }

    console.log(`✅ บันทึกลายนิ้วมือสำเร็จ: ${updatedReceipt.receiptNumber}`);

    return {
      _id: updatedReceipt._id,
      imageUrl: imageUrl,
      template: scanResult.template
    };

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการบันทึกลายนิ้วมือ:', error);
    throw new DatabaseError(`Failed to save fingerprint: ${error.message}`);
  }
}

/**
 * Cleanup on process exit
 */
process.on('SIGINT', async () => {
  console.log('🔄 กำลังปิดการเชื่อมต่อ ZKFinger Service...');
  try {
    await zkFingerService.destroy();
    console.log('✅ ZKFinger Service ปิดสำเร็จ');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการปิด ZKFinger Service:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 กำลังปิดการเชื่อมต่อ ZKFinger Service...');
  try {
    await zkFingerService.destroy();
    console.log('✅ ZKFinger Service ปิดสำเร็จ');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการปิด ZKFinger Service:', error);
  }
  process.exit(0);
});

module.exports = router;