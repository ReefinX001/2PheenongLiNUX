/**
 * Test Script for Encrypted Fingerprint System
 * ทดสอบการส่งข้อมูลลายนิ้วมือแบบเข้ารหัสจาก Windows Service ไปยัง Server
 */

const crypto = require('crypto');
const fetch = require('node-fetch');

class FingerprintEncryptedTester {
    constructor() {
        this.serverUrl = 'http://127.0.0.1:3000/api/fingerprint/upload-encrypted';
        this.encryptionKey = 'MySecretEncryptionKey12345678901';
        this.apiKey = 'fingerprint-api-key-secure-2025';
    }

    /**
     * เข้ารหัสข้อมูลด้วย AES-256-CBC (เหมือนกับ Windows Service)
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
     * สร้างข้อมูลลายนิ้วมือจำลอง
     */
    createMockFingerprintData() {
        // สร้าง mock template (Base64)
        const mockTemplate = Buffer.from('MOCK_FINGERPRINT_TEMPLATE_DATA_256_BYTES_' + 'X'.repeat(200)).toString('base64');

        // สร้าง mock image data (grayscale 256x360)
        const width = 256;
        const height = 360;
        const imageSize = width * height;
        const mockImageBuffer = Buffer.alloc(imageSize, 128); // สี gray
        const mockImageData = mockImageBuffer.toString('base64');

        const fingerprintData = {
            template: mockTemplate,
            imageData: mockImageData,
            width: width,
            height: height,
            quality: 'high',
            timestamp: new Date().toISOString(),
            deviceId: 'TEST-WORKSTATION',
            scanId: crypto.randomUUID()
        };

        // คำนวณ checksum
        const checksum = this.calculateChecksum(fingerprintData);
        fingerprintData.checksum = checksum;

        return fingerprintData;
    }

    /**
     * ทดสอบการส่งข้อมูลแบบเข้ารหัส
     */
    async testEncryptedUpload(options = {}) {
        try {
            console.log('🧪 Testing Encrypted Fingerprint Upload...');
            console.log('=' .repeat(60));

            // สร้างข้อมูลจำลอง
            const fingerprintData = this.createMockFingerprintData();
            console.log(`📊 Mock Data Created:`);
            console.log(`   Template Size: ${fingerprintData.template.length} chars`);
            console.log(`   Image Size: ${fingerprintData.imageData.length} chars`);
            console.log(`   Dimensions: ${fingerprintData.width}x${fingerprintData.height}`);
            console.log(`   Scan ID: ${fingerprintData.scanId}`);

            // เข้ารหัสข้อมูล
            const encrypted = this.encryptData(fingerprintData);
            console.log(`🔒 Data Encrypted:`);
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
                receiptId: options.receiptId || null,
                signatureType: options.signatureType || 'customer'
            };

            console.log(`📤 Sending to Server: ${this.serverUrl}`);

            // ส่งข้อมูลไปยัง server
            const response = await fetch(this.serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey,
                    'User-Agent': 'ZKTeco-Test-Client/1.0',
                    'X-Device-ID': fingerprintData.deviceId,
                    'X-Client-IP': '100.106.108.57'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            console.log(`📥 Server Response (${response.status}):`);
            console.log(JSON.stringify(result, null, 2));

            if (response.ok && result.success) {
                console.log('✅ Test PASSED - Encrypted upload successful!');
                console.log(`📸 Image URL: ${result.data?.imageUrl}`);
                console.log(`📁 File Path: ${result.data?.imagePath}`);
                console.log(`📏 File Size: ${result.data?.fileSize} bytes`);
                return true;
            } else {
                console.log('❌ Test FAILED - Server returned error');
                return false;
            }

        } catch (error) {
            console.error('❌ Test ERROR:', error.message);
            console.error('Stack:', error.stack);
            return false;
        }
    }

    /**
     * ทดสอบการถอดรหัสข้อมูล
     */
    async testDecryption() {
        try {
            console.log('\n🔓 Testing Decryption Process...');
            console.log('=' .repeat(60));

            // สร้างข้อมูลทดสอบ
            const originalData = { test: 'data', number: 123, array: [1, 2, 3] };
            console.log('📝 Original Data:', originalData);

            // เข้ารหัส
            const encrypted = this.encryptData(originalData);
            console.log('🔒 Encrypted:', encrypted.encryptedData.substring(0, 50) + '...');

            // ถอดรหัส
            const decrypted = this.decryptData(encrypted.encryptedData, encrypted.iv);
            console.log('🔓 Decrypted:', decrypted);

            // ตรวจสอบ
            const isMatch = JSON.stringify(originalData) === JSON.stringify(decrypted);
            console.log(`✅ Decryption Test: ${isMatch ? 'PASSED' : 'FAILED'}`);

            return isMatch;

        } catch (error) {
            console.error('❌ Decryption Test ERROR:', error.message);
            return false;
        }
    }

    /**
     * ถอดรหัสข้อมูล (สำหรับทดสอบ)
     */
    decryptData(encryptedData, iv) {
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), Buffer.from(iv, 'hex'));

        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    }

    /**
     * ทดสอบ API endpoint status
     */
    async testServerStatus() {
        try {
            console.log('\n🏥 Testing Server Health...');
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
     * รันการทดสอบทั้งหมด
     */
    async runAllTests() {
        console.log('🚀 Starting Encrypted Fingerprint System Tests');
        console.log('⏰ ' + new Date().toISOString());
        console.log('🔧 Configuration:');
        console.log(`   Server: ${this.serverUrl}`);
        console.log(`   Encryption Key: ${this.encryptionKey.substring(0, 8)}...`);
        console.log(`   API Key: ${this.apiKey.substring(0, 8)}...`);
        console.log('\n');

        const results = {
            serverStatus: await this.testServerStatus(),
            decryption: await this.testDecryption(),
            encryptedUpload: await this.testEncryptedUpload(),
            encryptedUploadWithReceipt: await this.testEncryptedUpload({
                receiptId: 'DR-TEST-001',
                signatureType: 'customer'
            })
        };

        console.log('\n' + '=' .repeat(60));
        console.log('📋 Test Results Summary:');
        console.log(`   Server Status: ${results.serverStatus ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Decryption: ${results.decryption ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Encrypted Upload: ${results.encryptedUpload ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Upload with Receipt: ${results.encryptedUploadWithReceipt ? '✅ PASS' : '❌ FAIL'}`);

        const allPassed = Object.values(results).every(result => result === true);
        console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

        return results;
    }
}

// รันการทดสอบ
async function main() {
    const tester = new FingerprintEncryptedTester();

    try {
        const results = await tester.runAllTests();
        process.exit(results ? 0 : 1);
    } catch (error) {
        console.error('❌ Test runner error:', error);
        process.exit(1);
    }
}

// รันถ้าเรียกไฟล์นี้โดยตรง
if (require.main === module) {
    main();
}

module.exports = FingerprintEncryptedTester;