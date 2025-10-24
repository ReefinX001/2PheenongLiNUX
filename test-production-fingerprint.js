/**
 * Production Test Script for Encrypted Fingerprint System
 * ทดสอบระบบลายนิ้วมือเข้ารหัสด้วย production configuration
 */

const crypto = require('crypto');
const fetch = require('node-fetch');

class ProductionFingerprintTester {
    constructor() {
        this.serverUrl = 'http://127.0.0.1:3000/api/fingerprint/upload-encrypted';
        // Production configuration ตรงกับ Windows Service
        this.encryptionKey = 'ZKT3co2025SecretKeyForEncryption';
        this.apiKey = 'ZKTeco-2pheenong-API-Key-2025-Production';
    }

    /**
     * เข้ารหัสข้อมูลด้วย AES-256-CBC (ตรงกับ Windows Service)
     */
    encryptData(data) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);

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
    calculateChecksum(data) {
        return crypto.createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }

    /**
     * สร้างข้อมูลลายนิ้วมือจำลองแบบ production
     */
    createProductionFingerprintData() {
        // สร้าง mock template (Base64) ที่เหมือนจริง
        const mockTemplate = Buffer.from('ZK_FINGERPRINT_TEMPLATE_' + 'X'.repeat(500)).toString('base64');

        // สร้าง mock image data (grayscale 256x360)
        const width = 256;
        const height = 360;
        const imageSize = width * height;

        // สร้างภาพจำลองที่มีลวดลาย
        const mockImageBuffer = Buffer.alloc(imageSize);
        for (let i = 0; i < imageSize; i++) {
            // สร้างลวดลายที่เหมือนลายนิ้วมือ
            mockImageBuffer[i] = Math.floor(Math.sin(i / 50) * 127 + 128);
        }
        const mockImageData = mockImageBuffer.toString('base64');

        const fingerprintData = {
            template: mockTemplate,
            imageData: mockImageData,
            width: width,
            height: height,
            quality: 'high',
            timestamp: new Date().toISOString(),
            deviceId: 'WORKSTATION-01',
            scanId: crypto.randomUUID()
        };

        // คำนวณ checksum
        const checksum = this.calculateChecksum(fingerprintData);
        fingerprintData.checksum = checksum;

        return fingerprintData;
    }

    /**
     * ทดสอบการส่งข้อมูลแบบเข้ารหัส production
     */
    async testProductionEncryptedUpload(receiptId = null) {
        try {
            console.log('🏭 Testing Production Encrypted Fingerprint Upload...');
            console.log('=' .repeat(60));

            // สร้างข้อมูล production
            const fingerprintData = this.createProductionFingerprintData();
            console.log(`📊 Production Mock Data:`);
            console.log(`   Template Size: ${fingerprintData.template.length} chars`);
            console.log(`   Image Size: ${fingerprintData.imageData.length} chars`);
            console.log(`   Dimensions: ${fingerprintData.width}x${fingerprintData.height}`);
            console.log(`   Scan ID: ${fingerprintData.scanId}`);
            console.log(`   Receipt ID: ${receiptId || 'No receipt (standalone test)'}`);

            // เข้ารหัสข้อมูล
            const encrypted = this.encryptData(fingerprintData);
            console.log(`🔐 Production Encryption:`);
            console.log(`   Encrypted Length: ${encrypted.encryptedData.length} chars`);
            console.log(`   IV: ${encrypted.iv}`);

            // เตรียม payload
            const payload = {
                encryptedData: encrypted.encryptedData,
                iv: encrypted.iv,
                deviceId: fingerprintData.deviceId,
                scanId: fingerprintData.scanId,
                timestamp: fingerprintData.timestamp,
                checksum: fingerprintData.checksum,
                receiptId: receiptId,
                signatureType: 'customer'
            };

            console.log(`📤 Sending to Production Server: ${this.serverUrl}`);

            // ส่งข้อมูลไปยัง server
            const response = await fetch(this.serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey,
                    'User-Agent': 'ZKTeco-Production-Test/1.0',
                    'X-Device-ID': fingerprintData.deviceId,
                    'X-Client-IP': '100.106.108.57'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            console.log(`📥 Production Server Response (${response.status}):`);
            console.log(JSON.stringify(result, null, 2));

            if (response.ok && result.success) {
                console.log('✅ Production Test PASSED - Encrypted upload successful!');
                console.log(`📸 Image URL: ${result.data?.imageUrl}`);
                console.log(`📁 File Path: ${result.data?.imagePath}`);
                console.log(`📏 File Size: ${result.data?.fileSize} bytes`);
                console.log(`🆔 Fingerprint ID: ${result.data?.fingerprintId || 'N/A'}`);
                console.log(`🧾 Receipt ID: ${result.data?.receiptId || 'N/A'}`);
                return result;
            } else {
                console.log('❌ Production Test FAILED - Server returned error');
                return null;
            }

        } catch (error) {
            console.error('❌ Production Test ERROR:', error.message);
            console.error('Stack:', error.stack);
            return null;
        }
    }

    /**
     * ทดสอบ Server Health Check
     */
    async testServerHealth() {
        try {
            console.log('🏥 Testing Production Server Health...');
            console.log('=' .repeat(60));

            const healthUrl = this.serverUrl.replace('/upload-encrypted', '/scans');
            const response = await fetch(healthUrl, {
                headers: {
                    'Authorization': `Bearer dummy-token`
                }
            });

            console.log(`📊 Server Status: ${response.status}`);

            if (response.status === 401) {
                console.log('✅ Server is running (401 = auth required, expected)');
                return true;
            } else if (response.status === 200) {
                console.log('✅ Server is running and accessible');
                return true;
            } else {
                console.log('⚠️ Server response:', response.status);
                return false;
            }

        } catch (error) {
            console.log('❌ Server not reachable:', error.message);
            return false;
        }
    }

    /**
     * ทดสอบการทำงานของการเข้ารหัส/ถอดรหัส
     */
    async testEncryptionDecryption() {
        try {
            console.log('🔐 Testing Production Encryption/Decryption...');
            console.log('=' .repeat(60));

            const testData = {
                test: 'production_data',
                timestamp: new Date().toISOString(),
                deviceId: 'WORKSTATION-01'
            };

            console.log('📝 Original Data:', testData);

            // เข้ารหัส
            const encrypted = this.encryptData(testData);
            console.log('🔒 Encrypted:', encrypted.encryptedData.substring(0, 50) + '...');

            // ถอดรหัส (simulated server-side)
            const decrypted = this.decryptData(encrypted.encryptedData, encrypted.iv);
            console.log('🔓 Decrypted:', decrypted);

            const isMatch = JSON.stringify(testData) === JSON.stringify(decrypted);
            console.log(`✅ Production Encryption Test: ${isMatch ? 'PASSED' : 'FAILED'}`);

            return isMatch;

        } catch (error) {
            console.error('❌ Encryption Test ERROR:', error.message);
            return false;
        }
    }

    /**
     * ถอดรหัสข้อมูล (จำลอง server-side)
     */
    decryptData(encryptedData, iv) {
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), Buffer.from(iv, 'hex'));

        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    }

    /**
     * รันการทดสอบ production ทั้งหมด
     */
    async runProductionTests() {
        console.log('🏭 Starting Production Encrypted Fingerprint Tests');
        console.log('⏰ ' + new Date().toISOString());
        console.log('🔧 Production Configuration:');
        console.log(`   Server: ${this.serverUrl}`);
        console.log(`   Encryption Key: ${this.encryptionKey.substring(0, 8)}...`);
        console.log(`   API Key: ${this.apiKey.substring(0, 15)}...`);
        console.log('\n');

        const results = {};

        // 1. Test Server Health
        results.serverHealth = await this.testServerHealth();

        // 2. Test Encryption/Decryption
        results.encryption = await this.testEncryptionDecryption();

        // 3. Test Standalone Upload
        console.log('\n');
        results.standaloneUpload = await this.testProductionEncryptedUpload();

        // 4. Test Upload with Receipt ID
        console.log('\n');
        results.receiptUpload = await this.testProductionEncryptedUpload('DR-PROD-TEST-001');

        console.log('\n' + '=' .repeat(60));
        console.log('📋 Production Test Results Summary:');
        console.log(`   Server Health: ${results.serverHealth ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Encryption: ${results.encryption ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Standalone Upload: ${results.standaloneUpload ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Receipt Upload: ${results.receiptUpload ? '✅ PASS' : '❌ FAIL'}`);

        const allPassed = Object.values(results).every(result => result !== false && result !== null);
        console.log(`\n🎯 Production Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

        if (allPassed) {
            console.log('\n🚀 Production System Ready for Deployment!');
            console.log('📋 Next Steps:');
            console.log('   1. Windows Service is already configured and running');
            console.log('   2. Server endpoint is ready to receive encrypted data');
            console.log('   3. Images will be stored in /public/uploads/fingerprints/');
            console.log('   4. Ready for real fingerprint scans from ZK9500');
        }

        return results;
    }
}

// รันการทดสอบ production
async function main() {
    const tester = new ProductionFingerprintTester();

    try {
        const results = await tester.runProductionTests();
        process.exit(0);
    } catch (error) {
        console.error('❌ Production test runner error:', error);
        process.exit(1);
    }
}

// รันถ้าเรียกไฟล์นี้โดยตรง
if (require.main === module) {
    main();
}

module.exports = ProductionFingerprintTester;