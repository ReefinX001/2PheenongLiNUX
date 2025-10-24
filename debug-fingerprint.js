/**
 * Fingerprint System Diagnostic Tool
 * ใช้สำหรับ debug ปัญหาการเชื่อมต่อระหว่าง Node.js และ Windows Service
 */

const ZKFingerTCPService = require('./services/zkfinger/ZKFingerTCPService');
const net = require('net');

class FingerprintDiagnostic {
    constructor() {
        this.host = '100.106.108.57';
        this.port = 8890;
        this.zkService = new ZKFingerTCPService({
            host: this.host,
            port: this.port,
            timeout: 10000
        });
    }

    async runFullDiagnostic() {
        console.log('🔍 เริ่มการวินิจฉัยระบบลายนิ้วมือ');
        console.log('=' .repeat(60));

        // 1. ตรวจสอบการเชื่อมต่อเครือข่าย
        await this.testNetworkConnection();

        // 2. ทดสอบ TCP Connection
        await this.testTcpConnection();

        // 3. ทดสอบ ZKFinger Service
        await this.testZKFingerService();

        // 4. ทดสอบการสแกน
        await this.testScanOperation();

        console.log('\n' + '=' .repeat(60));
        console.log('🏁 การวินิจฉัยเสร็จสิ้น');
    }

    async testNetworkConnection() {
        console.log('\n1️⃣ ทดสอบการเชื่อมต่อเครือข่าย');
        console.log(`📡 Host: ${this.host}:${this.port}`);

        return new Promise((resolve) => {
            const socket = new net.Socket();
            const timeout = setTimeout(() => {
                socket.destroy();
                console.log('❌ Network connection timeout');
                console.log('   🔧 ตรวจสอบ: IP address, firewall, network connectivity');
                resolve(false);
            }, 5000);

            socket.connect(this.port, this.host, () => {
                clearTimeout(timeout);
                console.log('✅ Network connection successful');
                socket.end();
                resolve(true);
            });

            socket.on('error', (error) => {
                clearTimeout(timeout);
                console.log('❌ Network connection failed:', error.code);
                if (error.code === 'ECONNREFUSED') {
                    console.log('   🔧 Windows Service ไม่ได้ทำงานหรือ port ไม่ถูกต้อง');
                } else if (error.code === 'EHOSTUNREACH') {
                    console.log('   🔧 ไม่สามารถเข้าถึง host ได้ ตรวจสอบ network');
                }
                resolve(false);
            });
        });
    }

    async testTcpConnection() {
        console.log('\n2️⃣ ทดสอบ TCP Communication');

        try {
            const pingResult = await this.zkService.ping();
            if (pingResult.success) {
                console.log('✅ TCP ping successful');
                console.log(`   📅 Response time: ${pingResult.timestamp}`);
            } else {
                console.log('❌ TCP ping failed');
                console.log('   🔧 Service ทำงานแต่ไม่ตอบสนอง ping command');
            }
        } catch (error) {
            console.log('❌ TCP communication error:', error.message);
            console.log('   🔧 ตรวจสอบ Windows Service logs');
        }
    }

    async testZKFingerService() {
        console.log('\n3️⃣ ทดสอบ ZKFinger Service Status');

        try {
            const status = await this.zkService.getStatus();
            console.log('📊 Service Status:');
            console.log(`   - Service Running: ${status.serviceRunning ? '✅' : '❌'}`);
            console.log(`   - Device Connected: ${status.deviceConnected ? '✅' : '❌'}`);
            console.log(`   - Device Handle: ${status.deviceHandle || 'N/A'}`);
            console.log(`   - Device Count: ${status.deviceCount || 'N/A'}`);

            if (!status.deviceConnected) {
                console.log('\n⚠️ ZK9500 Device Issues:');
                console.log('   🔧 ตรวจสอบ USB connection');
                console.log('   🔧 ตรวจสอบ ZK SDK drivers');
                console.log('   🔧 ตรวจสอบ device permissions');
            }

            // ทดสอบการเริ่มต้น SDK
            console.log('\n🔧 ทดสอบ SDK Initialization...');
            const initResult = await this.zkService.initializeSDK();
            if (initResult.success) {
                console.log('✅ SDK initialized successfully');
            } else {
                console.log('❌ SDK initialization failed:', initResult.message);
            }

        } catch (error) {
            console.log('❌ Service status check failed:', error.message);
        }
    }

    async testScanOperation() {
        console.log('\n4️⃣ ทดสอบการสแกนลายนิ้วมือ');
        console.log('⏰ Timeout: 10 วินาที (ไม่ต้องใส่นิ้ว)');

        try {
            const scanResult = await this.zkService.scanFingerprint({
                timeout: 10000,
                quality: 'high',
                saveImage: true
            });

            if (scanResult.success) {
                console.log('✅ Scan operation ready');
                console.log(`   📸 Image path: ${scanResult.imagePath || 'N/A'}`);
                console.log(`   🧬 Template size: ${scanResult.templateSize || 'N/A'}`);
            } else {
                console.log('❌ Scan failed:', scanResult.message);
            }
        } catch (error) {
            if (error.message.includes('timeout')) {
                console.log('⏰ Scan timeout (expected - no finger placed)');
                console.log('✅ Scan mechanism is working');
            } else {
                console.log('❌ Scan error:', error.message);
                console.log('   🔧 Device อาจไม่พร้อมสำหรับการสแกน');
            }
        }
    }

    async checkWindowsServiceLogs() {
        console.log('\n📋 Windows Service Logs Location:');
        console.log('   File: C:\\ZKTecoService\\logs\\service.log');
        console.log('   Images: C:\\ZKTecoService\\images\\');
        console.log('\n💡 Commands to check logs:');
        console.log('   type "C:\\ZKTecoService\\logs\\service.log"');
        console.log('   sc query "ZKTecoService"');
        console.log('   sc stop "ZKTecoService" && sc start "ZKTecoService"');
    }

    async generateReport() {
        console.log('\n📊 System Configuration Report:');
        console.log(`   Node.js TCP Host: ${this.host}`);
        console.log(`   Node.js TCP Port: ${this.port}`);
        console.log(`   Windows Service Port: ${this.port} (should match)`);
        console.log(`   Expected ZK Device: ZK9500 Fingerprint Scanner`);
        console.log(`   Service Name: ZKTecoService`);
        console.log(`   API Endpoint: /api/fingerprint/scan`);
    }
}

// รันการวินิจฉัย
async function main() {
    const diagnostic = new FingerprintDiagnostic();

    try {
        await diagnostic.runFullDiagnostic();
        await diagnostic.checkWindowsServiceLogs();
        await diagnostic.generateReport();
    } catch (error) {
        console.error('\n❌ Diagnostic failed:', error.message);
    }
}

// รันถ้าเรียกไฟล์นี้โดยตรง
if (require.main === module) {
    main()
        .then(() => {
            console.log('\n✅ Diagnostic completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Diagnostic error:', error);
            process.exit(1);
        });
}

module.exports = FingerprintDiagnostic;