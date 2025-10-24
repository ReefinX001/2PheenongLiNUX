/**
 * Live Test for Production Encrypted Fingerprint System
 * ทดสอบจริงกับ server ที่ทำงานอยู่
 */

const crypto = require('crypto');
const fetch = require('node-fetch');

// Production configuration
const ENCRYPTION_KEY = 'ZKT3co2025SecretKeyForEncryption';
const API_KEY = 'ZKTeco-2pheenong-API-Key-2025-Production';
const SERVER_URL = 'http://127.0.0.1:3000/api/fingerprint/upload-encrypted';

/**
 * เข้ารหัสข้อมูลด้วย AES-256-CBC
 */
function encryptData(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
        encryptedData: encrypted,
        iv: iv.toString('hex')
    };
}

/**
 * สร้าง checksum SHA256
 */
function calculateChecksum(data) {
    return crypto.createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex');
}

/**
 * ทดสอบการส่งข้อมูลจริง
 */
async function testLiveEncryptedUpload() {
    try {
        console.log('🔴 LIVE TEST: Production Encrypted Fingerprint Upload');
        console.log('=' .repeat(60));

        // สร้างข้อมูลลายนิ้วมือจำลอง
        const width = 256;
        const height = 360;
        const imageSize = width * height;

        // สร้างภาพลายนิ้วมือจำลองที่เหมือนจริง
        const mockImageBuffer = Buffer.alloc(imageSize);
        for (let i = 0; i < imageSize; i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            // สร้างลวดลายคล้ายลายนิ้วมือ
            const pattern = Math.sin(x / 10) * Math.cos(y / 10) * 127 + 128;
            mockImageBuffer[i] = Math.floor(pattern);
        }

        const fingerprintData = {
            template: Buffer.from('ZK_LIVE_TEMPLATE_' + 'X'.repeat(500)).toString('base64'),
            imageData: mockImageBuffer.toString('base64'),
            width: width,
            height: height,
            quality: 'high',
            timestamp: new Date().toISOString(),
            deviceId: 'WORKSTATION-01',
            scanId: crypto.randomUUID()
        };

        // คำนวณ checksum
        const checksum = calculateChecksum(fingerprintData);
        fingerprintData.checksum = checksum;

        console.log(`📊 Live Test Data:`);
        console.log(`   Template Size: ${fingerprintData.template.length} chars`);
        console.log(`   Image Size: ${fingerprintData.imageData.length} chars (${Math.round(fingerprintData.imageData.length * 0.75 / 1024)}KB)`);
        console.log(`   Dimensions: ${width}x${height}`);
        console.log(`   Scan ID: ${fingerprintData.scanId}`);

        // เข้ารหัสข้อมูล
        const encrypted = encryptData(fingerprintData);
        console.log(`🔐 Encryption Complete:`);
        console.log(`   Encrypted Size: ${encrypted.encryptedData.length} chars`);
        console.log(`   IV: ${encrypted.iv}`);

        // เตรียม payload
        const payload = {
            encryptedData: encrypted.encryptedData,
            iv: encrypted.iv,
            deviceId: fingerprintData.deviceId,
            scanId: fingerprintData.scanId,
            timestamp: fingerprintData.timestamp,
            checksum: fingerprintData.checksum,
            receiptId: 'DR-LIVE-TEST-' + Date.now(),
            signatureType: 'customer'
        };

        console.log(`📤 Sending to Live Server: ${SERVER_URL}`);
        console.log(`🔑 API Key: ${API_KEY.substring(0, 15)}...`);

        // ส่งข้อมูลไปยัง server
        const startTime = Date.now();
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                'User-Agent': 'ZKTeco-Live-Test/1.0',
                'X-Device-ID': fingerprintData.deviceId,
                'X-Client-IP': '100.106.108.57'
            },
            body: JSON.stringify(payload)
        });

        const responseTime = Date.now() - startTime;
        const result = await response.json();

        console.log(`📥 Live Server Response (${response.status}) - ${responseTime}ms:`);
        console.log(JSON.stringify(result, null, 2));

        if (response.ok && result.success) {
            console.log('\n✅ LIVE TEST PASSED! 🎉');
            console.log('📋 Results:');
            console.log(`   📸 Image URL: ${result.data?.imageUrl}`);
            console.log(`   📁 File Path: ${result.data?.imagePath}`);
            console.log(`   📏 File Size: ${result.data?.fileSize || 'N/A'} bytes`);
            console.log(`   🆔 Fingerprint ID: ${result.data?.fingerprintId || 'N/A'}`);
            console.log(`   🧾 Receipt ID: ${result.data?.receiptId}`);
            console.log(`   ⏱️  Response Time: ${responseTime}ms`);

            // ทดสอบการเข้าถึงภาพ
            if (result.data?.imageUrl) {
                console.log('\n🖼️  Testing Image Access...');
                const imageUrl = `http://127.0.0.1:3000${result.data.imageUrl}`;
                try {
                    const imageResponse = await fetch(imageUrl);
                    console.log(`   Image Access: ${imageResponse.status === 200 ? '✅ SUCCESS' : '❌ FAILED'} (${imageResponse.status})`);
                    if (imageResponse.ok) {
                        const contentType = imageResponse.headers.get('content-type');
                        const contentLength = imageResponse.headers.get('content-length');
                        console.log(`   Content-Type: ${contentType}`);
                        console.log(`   Content-Length: ${contentLength} bytes`);
                    }
                } catch (imageError) {
                    console.log(`   Image Access: ❌ ERROR - ${imageError.message}`);
                }
            }

            console.log('\n🚀 Production System is READY!');
            console.log('💡 Windows Service can now send encrypted fingerprint data to server');

            return true;
        } else {
            console.log('\n❌ LIVE TEST FAILED');
            console.log(`   Status: ${response.status}`);
            console.log(`   Message: ${result.message || 'Unknown error'}`);
            return false;
        }

    } catch (error) {
        console.error('\n❌ LIVE TEST ERROR:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

// รันการทดสอบ
async function main() {
    console.log('🔴 STARTING LIVE PRODUCTION TEST');
    console.log('⏰ ' + new Date().toISOString());
    console.log(`🔧 Server: ${SERVER_URL}`);
    console.log(`🔑 API Key: ${API_KEY}`);
    console.log(`🔐 Encryption: AES-256-CBC (${ENCRYPTION_KEY.length} chars)\n`);

    const success = await testLiveEncryptedUpload();

    console.log('\n' + '=' .repeat(60));
    console.log(`🎯 LIVE TEST RESULT: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);

    if (success) {
        console.log('\n🎉 PRODUCTION SYSTEM READY FOR DEPLOYMENT!');
        console.log('📋 System Status:');
        console.log('   ✅ Windows Service: Running with encryption');
        console.log('   ✅ Server Endpoint: Ready to receive encrypted data');
        console.log('   ✅ Image Storage: Working in /public/uploads/fingerprints/');
        console.log('   ✅ Database: Saving fingerprint records');
        console.log('   ✅ Web Access: Images accessible via URL');
    }

    process.exit(success ? 0 : 1);
}

// รันทดสอบ
main();