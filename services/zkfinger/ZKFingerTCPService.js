/**
 * ZKFinger TCP Service - เชื่อมต่อกับ Windows Service ผ่าน TCP
 * รองรับการสแกนลายนิ้วมือผ่าน ZK9500 via TCP connection
 */

const net = require('net');
const path = require('path');
const fs = require('fs').promises;

class ZKFingerTCPService {
    constructor(options = {}) {
        this.host = options.host || '100.106.108.57';
        this.port = options.port || 8890;  // เปลี่ยน default เป็น 8890
        this.timeout = options.timeout || 30000;
        this.isInitialized = false;
        this.isConnected = false;
        this.deviceHandle = null;
        this.lastStatus = null;
    }

    /**
     * เริ่มต้นการเชื่อมต่อกับ ZKTeco Service
     */
    async initialize() {
        try {
            console.log(`🔄 Initializing ZKFinger TCP Service...`);
            console.log(`📡 Target: ${this.host}:${this.port}`);

            // ทดสอบการเชื่อมต่อ
            const pingResult = await this.ping();
            if (!pingResult.success) {
                throw new Error('Cannot connect to ZKTeco Service');
            }

            // ใช้ข้อมูลจาก initialize แทน getStatus เพราะ status command ไม่รองรับ
            const initResult = await this.initializeSDK();
            this.lastStatus = {
                serviceRunning: initResult.success || initResult.status === 'success',
                deviceConnected: initResult.data?.deviceHandle > 0,
                deviceHandle: initResult.data?.deviceHandle,
                deviceCount: initResult.data?.deviceCount,
                timestamp: new Date()
            };

            // เริ่มต้น SDK ถ้าจำเป็น
            await this.initializeSDK();

            this.isInitialized = true;
            this.isConnected = true;

            console.log(`✅ ZKFinger TCP Service initialized successfully`);
            console.log(`📊 Device Status: ${this.lastStatus.deviceConnected ? 'Connected' : 'Not Connected'}`);
            if (this.lastStatus.deviceCount) {
                console.log(`📱 Devices Found: ${this.lastStatus.deviceCount}`);
            }

            return {
                success: true,
                host: this.host,
                port: this.port,
                deviceConnected: this.lastStatus.deviceConnected,
                deviceCount: this.lastStatus.deviceCount,
                deviceHandle: this.lastStatus.deviceHandle,
                timestamp: new Date()
            };

        } catch (error) {
            console.error('❌ ZKFinger TCP Service initialization failed:', error);
            this.isInitialized = false;
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * ส่งคำสั่งไปยัง TCP Server
     */
    async sendCommand(command, data = {}) {
        return new Promise((resolve, reject) => {
            const client = new net.Socket();
            let responseReceived = false;
            let buffer = '';  // Buffer สำหรับเก็บข้อมูลที่ยาว

            const timeout = setTimeout(() => {
                if (!responseReceived) {
                    client.destroy();
                    reject(new Error(`Command timeout: ${command}`));
                }
            }, this.timeout);

            client.connect(this.port, this.host, () => {
                const request = { command, ...data };
                const jsonData = JSON.stringify(request);

                console.log(`📤 Sending command: ${command}`);
                client.write(jsonData);
            });

            client.on('data', (chunk) => {
                buffer += chunk.toString();

                // ตรวจสอบว่าได้รับข้อมูลครบแล้วหรือไม่ (มี closing brace)
                if (buffer.includes('}\n') || buffer.includes('}')) {
                    responseReceived = true;
                    clearTimeout(timeout);

                    try {
                        // ลบ newline หรือ whitespace ที่อาจมีต่อท้าย
                        const cleanedBuffer = buffer.trim();
                        const response = JSON.parse(cleanedBuffer);

                        // แสดงข้อมูลที่สั้นกว่าสำหรับ log
                        const responseStatus = response.status === 'success' || response.success ? 'Success' : 'Failed';
                        console.log(`📥 Response: ${command} - ${responseStatus}`);

                        // สำหรับ scan command ให้แสดงข้อมูลเพิ่มเติม
                        if (command === 'scan' && response.data?.template) {
                            console.log(`📊 Template size: ${response.data.template.length} chars`);
                        }

                        resolve(response);
                    } catch (error) {
                        // แสดงข้อมูลที่ตัดแล้วสำหรับ debugging
                        const previewData = buffer.length > 200 ? buffer.substring(0, 200) + '...' : buffer;
                        reject(new Error(`Invalid JSON response for ${command}: ${previewData}`));
                    }

                    client.end();
                }
            });

            client.on('error', (error) => {
                clearTimeout(timeout);
                console.error(`❌ TCP Error for ${command}:`, error.message);
                reject(new Error(`TCP connection failed: ${error.message}`));
            });

            client.on('close', () => {
                if (!responseReceived) {
                    clearTimeout(timeout);
                    reject(new Error(`Connection closed before receiving response for ${command}`));
                }
            });
        });
    }

    /**
     * ทดสอบการเชื่อมต่อ
     */
    async ping() {
        try {
            const response = await this.sendCommand('ping');
            // รองรับ format ที่แท้จริงจาก ZKTeco Service
            const isSuccess = response.status === 'success' || response.success === true;
            return {
                success: isSuccess,
                timestamp: response.data?.timestamp || new Date().toISOString(),
                service: response.data?.service,
                version: response.data?.version
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ตรวจสอบสถานะ service และอุปกรณ์
     */
    async getStatus() {
        try {
            // ใช้ ping เพื่อตรวจสอบการเชื่อมต่อแทน status command ที่ไม่รองรับ
            const pingResult = await this.ping();

            this.lastStatus = {
                serviceRunning: pingResult.success,
                deviceConnected: this.deviceHandle && this.deviceHandle > 0,
                timestamp: new Date(),
                deviceHandle: this.deviceHandle,
                error: pingResult.success ? null : pingResult.error
            };

            return this.lastStatus;
        } catch (error) {
            this.lastStatus = {
                serviceRunning: false,
                deviceConnected: false,
                error: error.message,
                timestamp: new Date()
            };
            return this.lastStatus;
        }
    }

    /**
     * เริ่มต้น ZK SDK
     */
    async initializeSDK() {
        try {
            const response = await this.sendCommand('initialize');

            // รองรับ format ที่แท้จริงจาก service
            const isSuccess = response.status === 'success' || response.success === true;

            if (isSuccess) {
                console.log(`✅ ZK SDK initialized successfully`);
                // เก็บ device handle สำหรับการใช้งานต่อไป
                this.deviceHandle = response.data?.deviceHandle;
                if (response.data?.deviceCount) {
                    console.log(`📱 Found ${response.data.deviceCount} device(s)`);
                }
                return response;
            } else {
                console.warn(`⚠️ ZK SDK initialization warning: ${response.message}`);
                // ไม่ throw error เพราะ service ยังใช้งานได้
                return response;
            }
        } catch (error) {
            console.warn(`⚠️ ZK SDK initialization failed: ${error.message}`);
            // ไม่ throw error เพราะ service อาจยังใช้งานได้
            return { success: false, message: error.message };
        }
    }

    /**
     * สแกนลายนิ้วมือ
     */
    async scanFingerprint(options = {}) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const {
                timeout = 30000,
                quality = 'high'
            } = options;

            console.log(`🔍 Starting fingerprint scan (timeout: ${timeout}ms)...`);

            const response = await this.sendCommand('scan', { timeout });

            // ตรวจสอบ success condition - รองรับ format ใหม่จาก service
            const isSuccess = response.status === 'success' ||
                             response.success === true ||
                             (response.message && response.message.includes('Fingerprint scanned successfully'));

            if (isSuccess) {
                console.log(`✅ Fingerprint scan successful`);

                const result = {
                    success: true,
                    template: response.data?.template,
                    imagePath: response.data?.imagePath,
                    imageData: response.data?.imageData, // เพิ่ม imageData สำหรับ Base64
                    timestamp: response.data?.timestamp || new Date().toISOString(),
                    quality: response.data?.quality || 'high',
                    width: response.data?.width,
                    height: response.data?.height,
                    templateSize: response.data?.templateSize || response.data?.template?.length
                };

                // แสดงข้อมูลเพิ่มเติมสำหรับการ debug
                if (response.data?.template) {
                    console.log(`📋 Template Length: ${response.data.template.length}`);
                }
                if (response.data?.imageData) {
                    console.log(`🖼️ Image Data Length: ${response.data.imageData.length}`);
                }

                return result;

            } else {
                console.error(`❌ Fingerprint scan failed: ${response.message}`);
                throw new Error(response.message || 'Scan failed');
            }

        } catch (error) {
            console.error(`❌ Fingerprint scan error:`, error);
            throw new Error(`Scan failed: ${error.message}`);
        }
    }


    /**
     * เชื่อมต่อกับอุปกรณ์ (ตรวจสอบการเชื่อมต่อ)
     */
    async connectDevice(deviceIP = null) {
        if (deviceIP && deviceIP !== this.host) {
            this.host = deviceIP;
            this.isInitialized = false;
            this.isConnected = false;
        }

        return await this.initialize();
    }

    /**
     * ตัดการเชื่อมต่อ
     */
    async disconnect() {
        try {
            console.log(`🔄 Disconnecting from ZKTeco Service...`);

            this.isInitialized = false;
            this.isConnected = false;
            this.deviceHandle = null;
            this.lastStatus = null;

            console.log(`✅ Disconnected successfully`);

            return {
                success: true,
                message: 'Disconnected successfully',
                timestamp: new Date()
            };

        } catch (error) {
            console.error(`❌ Disconnect error:`, error);
            return {
                success: false,
                message: error.message,
                timestamp: new Date()
            };
        }
    }

    /**
     * ทำลาย service instance
     */
    async destroy() {
        await this.disconnect();
        console.log(`🗑️ ZKFinger TCP Service destroyed`);
    }

    /**
     * ตรวจสอบว่า service พร้อมใช้งานหรือไม่
     */
    get isReady() {
        return this.isInitialized && this.isConnected;
    }

    /**
     * ข้อมูลสถานะปัจจุบัน
     */
    get currentStatus() {
        return {
            isInitialized: this.isInitialized,
            isConnected: this.isConnected,
            host: this.host,
            port: this.port,
            lastStatus: this.lastStatus,
            timestamp: new Date()
        };
    }
}

module.exports = ZKFingerTCPService;