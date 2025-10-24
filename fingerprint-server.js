/**
 * Fingerprint Image API Server for Windows Server
 * รับและเก็บภาพลายนิ้วมือจาก Windows Client
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');

const app = express();
const PORT = process.env.FINGERPRINT_PORT || 8891;
const HTTP_PORT = process.env.FINGERPRINT_HTTP_PORT || 8890;

// สร้าง Express app สำหรับให้บริการ static files
const staticApp = express();

// เปิด CORS
app.use(cors());
staticApp.use(cors());

// Parse JSON
app.use(express.json({ limit: '10mb' }));

// กำหนดโฟลเดอร์เก็บภาพ
const IMAGES_DIR = path.join(__dirname, 'public/uploads/fingerprints');

// สร้างโฟลเดอร์ถ้ายังไม่มี
async function ensureImagesDir() {
    try {
        await fs.mkdir(IMAGES_DIR, { recursive: true });
        console.log(`📁 Fingerprint images directory ready: ${IMAGES_DIR}`);
    } catch (error) {
        console.error('❌ Failed to create images directory:', error.message);
    }
}

/**
 * POST /api/fingerprint/upload-base64
 * รับภาพลายนิ้วมือจาก Windows Client
 */
app.post('/api/fingerprint/upload-base64', async (req, res) => {
    try {
        const { imageData, receiptId, signatureType, fileExtension = 'bmp' } = req.body;

        if (!imageData || !receiptId || !signatureType) {
            return res.status(400).json({
                success: false,
                message: 'imageData, receiptId, and signatureType are required'
            });
        }

        // ลบ data URL prefix ถ้ามี
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

        // สร้างชื่อไฟล์
        const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
        const filename = `fingerprint_${receiptId}_${signatureType}_${timestamp}.${fileExtension}`;
        const filepath = path.join(IMAGES_DIR, filename);

        // บันทึกไฟล์
        await fs.writeFile(filepath, base64Data, 'base64');

        // สร้าง URL สำหรับเข้าถึงภาพ (ใช้ domain หลัก)
        const imageUrl = `https://www.2pheenong.com/uploads/fingerprints/${filename}`;

        console.log(`✅ Fingerprint image saved on Windows Server: ${filename}`);
        console.log(`📄 Receipt: ${receiptId}, Type: ${signatureType}`);
        console.log(`🔗 Image URL: ${imageUrl}`);

        res.json({
            success: true,
            data: {
                imageUrl: imageUrl,
                filename: filename,
                receiptId: receiptId,
                signatureType: signatureType,
                uploadTime: new Date().toISOString(),
                serverIP: '100.110.180.13',
                domain: 'www.2pheenong.com'
            }
        });

    } catch (error) {
        console.error('❌ Fingerprint image upload error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to save fingerprint image on Windows Server',
            error: error.message
        });
    }
});

/**
 * GET /api/fingerprint/images
 * ดูรายการภาพลายนิ้วมือทั้งหมด
 */
app.get('/api/fingerprint/images', async (req, res) => {
    try {
        const files = await fs.readdir(IMAGES_DIR);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.bmp'].includes(ext);
        });

        const images = imageFiles.map(file => ({
            filename: file,
            url: `https://www.2pheenong.com/uploads/fingerprints/${file}`,
            localPath: path.join(IMAGES_DIR, file),
            uploadTime: file.match(/fingerprint_.*?_.*?_(\d+)/)?.[1] || 'unknown'
        }));

        res.json({
            success: true,
            data: {
                count: images.length,
                images: images,
                serverInfo: {
                    serverIP: '100.110.180.13',
                    domain: 'www.2pheenong.com',
                    imagesDir: IMAGES_DIR
                }
            }
        });

    } catch (error) {
        console.error('❌ List fingerprint images error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to list fingerprint images',
            error: error.message
        });
    }
});

/**
 * DELETE /api/fingerprint/images/:filename
 * ลบภาพลายนิ้วมือ
 */
app.delete('/api/fingerprint/images/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filepath = path.join(IMAGES_DIR, filename);

        // ตรวจสอบว่าไฟล์มีอยู่จริง
        try {
            await fs.access(filepath);
        } catch {
            return res.status(404).json({
                success: false,
                message: 'Fingerprint image not found'
            });
        }

        // ลบไฟล์
        await fs.unlink(filepath);

        console.log(`🗑️ Fingerprint image deleted: ${filename}`);

        res.json({
            success: true,
            message: 'Fingerprint image deleted successfully',
            filename: filename
        });

    } catch (error) {
        console.error('❌ Delete fingerprint image error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete fingerprint image',
            error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Fingerprint Server on Windows Server is running',
        timestamp: new Date().toISOString(),
        server: {
            ip: '100.110.180.13',
            domain: 'www.2pheenong.com',
            imagesDir: IMAGES_DIR,
            port: PORT
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Fingerprint server error:', error.message);
    res.status(500).json({
        success: false,
        message: 'Internal fingerprint server error',
        error: error.message
    });
});

// Start server
async function startFingerprintServer() {
    try {
        await ensureImagesDir();

        // Start API server
        app.listen(PORT, () => {
            console.log(`🚀 Fingerprint Server running on Windows Server`);
            console.log(`📡 Server IP: 100.110.180.13:${PORT}`);
            console.log(`🌍 Domain: https://www.2pheenong.com:${PORT}`);
            console.log(`📁 Images stored in: ${IMAGES_DIR}`);
            console.log(`📋 Available endpoints:`);
            console.log(`   POST /api/fingerprint/upload-base64`);
            console.log(`   GET  /api/fingerprint/images`);
            console.log(`   DELETE /api/fingerprint/images/:filename`);
            console.log(`   GET  /health`);
            console.log(`💡 Receiving fingerprint images from Windows Client (100.106.108.57)`);
        });

    } catch (error) {
        console.error('❌ Failed to start Fingerprint Server:', error.message);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Fingerprint Server...');
    process.exit(0);
});

// Start if run directly
if (require.main === module) {
    startFingerprintServer();
}

module.exports = { app };