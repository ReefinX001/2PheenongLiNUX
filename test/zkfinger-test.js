/**
 * ZKFinger Test Script
 * สคริปต์ทดสอบการเชื่อมต่อและการทำงานของระบบสแกนลายนิ้วมือ ZK9500
 */

const ZKFingerService = require('../services/zkfinger/ZKFingerService');
const mongoose = require('mongoose');
require('dotenv').config();

console.log('🧪 เริ่มการทดสอบระบบ ZKFinger Scanner');
console.log('=' .repeat(50));

async function testZKFingerConnection() {
    const zkFingerService = new ZKFingerService();

    try {
        console.log('1️⃣ ทดสอบการเริ่มต้น ZKFinger Service');
        const initResult = await zkFingerService.initialize();
        console.log('✅ เริ่มต้น Service สำเร็จ:', initResult);

        console.log('\n2️⃣ ทดสอบการเชื่อมต่อกับเครื่อง ZK9500');
        const connectResult = await zkFingerService.connectDevice('100.106.108.57');
        console.log('✅ เชื่อมต่อเครื่องสแกนสำเร็จ:', connectResult);

        console.log('\n3️⃣ ทดสอบการสแกนลายนิ้วมือ (รอ 10 วินาที)');
        console.log('📍 กรุณาวางนิ้วลงบนเครื่องสแกน...');

        try {
            const scanResult = await zkFingerService.scanFingerprint({
                timeout: 10000,
                quality: 'high'
            });
            console.log('✅ สแกนลายนิ้วมือสำเร็จ:', {
                timestamp: scanResult.timestamp,
                imagePath: scanResult.imagePath,
                templateLength: scanResult.template ? scanResult.template.length : 0,
                quality: scanResult.quality
            });
        } catch (scanError) {
            console.log('⚠️ การสแกนลายนิ้วมือไม่สำเร็จ (อาจเป็นเพราะไม่มีนิ้วบนเครื่องสแกน):', scanError.message);
        }

        console.log('\n4️⃣ ทดสอบการตัดการเชื่อมต่อ');
        const disconnectResult = await zkFingerService.disconnect();
        console.log('✅ ตัดการเชื่อมต่อสำเร็จ:', disconnectResult);

        console.log('\n5️⃣ ทำลาย Service');
        await zkFingerService.destroy();
        console.log('✅ ทำลาย Service สำเร็จ');

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);

        // แสดงรายละเอียดข้อผิดพลาด
        if (error.message.includes('SDK not found')) {
            console.log('\n💡 แนะนำ: ตรวจสอบว่า ZKFinger SDK อยู่ในโฟลเดอร์ที่ถูกต้อง');
            console.log('   Path ที่คาดหวัง: ZKFinger SDK V10.0-Windows-Lite/');
        } else if (error.message.includes('device')) {
            console.log('\n💡 แนะนำ: ตรวจสอบการเชื่อมต่อเครื่อง ZK9500');
            console.log('   - ตรวจสอบ IP Address: 100.106.108.57');
            console.log('   - ตรวจสอบการเชื่อมต่อ Tailscale');
            console.log('   - ตรวจสอบว่าเครื่องสแกนเปิดอยู่');
        }

        // พยายามปิด Service ถ้ามีการเปิดไว้
        try {
            await zkFingerService.destroy();
        } catch (cleanupError) {
            console.warn('⚠️ ไม่สามารถปิด Service ได้:', cleanupError.message);
        }
    }
}

async function testAPIEndpoints() {
    console.log('\n🌐 ทดสอบ API Endpoints');
    console.log('=' .repeat(30));

    // ทดสอบการเชื่อมต่อ MongoDB สำหรับ API testing
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting-app', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ เชื่อมต่อ MongoDB สำเร็จ');

        // ทดสอบ API status
        const axios = require('axios');
        const baseURL = process.env.SERVER_URL || 'http://localhost:3000';

        try {
            const statusResponse = await axios.get(`${baseURL}/api/fingerprint/status`);
            console.log('✅ API Status สำเร็จ:', statusResponse.data);
        } catch (apiError) {
            console.log('⚠️ ไม่สามารถเชื่อมต่อ API ได้:', apiError.message);
            console.log('💡 แนะนำ: ตรวจสอบว่า server กำลังรันอยู่ที่ port 3000');
        }

        await mongoose.disconnect();
        console.log('✅ ปิดการเชื่อมต่อ MongoDB');

    } catch (dbError) {
        console.log('⚠️ ไม่สามารถเชื่อมต่อ MongoDB ได้:', dbError.message);
    }
}

async function runAllTests() {
    console.log('🚀 เริ่มการทดสอบระบบ ZKFinger Scanner');
    console.log(`📅 เวลา: ${new Date().toLocaleString('th-TH')}`);
    console.log('=' .repeat(50));

    // ทดสอบ ZKFinger Service
    await testZKFingerConnection();

    // ทดสอบ API Endpoints
    await testAPIEndpoints();

    console.log('\n' + '=' .repeat(50));
    console.log('🏁 การทดสอบเสร็จสิ้น');
    console.log('=' .repeat(50));
}

// รันการทดสอบ
if (require.main === module) {
    runAllTests()
        .then(() => {
            console.log('\n✅ การทดสอบทั้งหมดเสร็จสิ้น');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
            process.exit(1);
        });
}

module.exports = {
    testZKFingerConnection,
    testAPIEndpoints,
    runAllTests
};