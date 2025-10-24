// printer-service.js - ระบบจัดการเครื่องพิมพ์แบบ Real-time Multi-Branch
class PrinterService {
    constructor() {
        // ป้องกัน multiple instances
        if (window.PrinterServiceInstance) {
            console.warn('⚠️ PrinterService already initialized, reusing existing instance');
            return window.PrinterServiceInstance;
        }

        this.isInitialized = false;
        this.branchData = null;
        this.printerURL = null;
        this.currentBranch = null;

        // Real-time monitoring (ไม่บล็อกการขาย)
        this.printerStatus = {
            status: 'unknown',
            message: 'ยังไม่ได้ตรวจสอบ',
            lastCheck: null,
            isOnline: false
        };

        this.statusCheckInterval = null;
        this.statusCheckFrequency = 60000; // ⚡ เปลี่ยนเป็น 60 วินาที เพื่อลดการเรียกใช้

        // Callbacks สำหรับ status change events
        this.statusChangeCallbacks = [];

        // เก็บ reference ไว้ป้องกัน multiple instances
        window.PrinterServiceInstance = this;

        // 🔧 ไม่ auto-initialize ใน constructor แล้ว
        console.log('🔧 PrinterService instance created (manual initialization required)');
    }

    /**
     * เริ่มต้นระบบ - ดึงข้อมูลสาขาและ setup printer
     */
    async init() {
        if (this.isInitialized) {
            console.log('✅ PrinterService already initialized, skipping...');
            return;
        }

        try {
            console.log('🔧 Initializing PrinterService with Real-time Monitoring...');
            await this.detectBranch();
            await this.setupPrinter();

            // เริ่ม real-time monitoring
            this.startRealtimeMonitoring();

            this.isInitialized = true;
            console.log('✅ PrinterService initialized successfully with real-time monitoring');
        } catch (error) {
            console.error('❌ PrinterService initialization failed:', error);
        }
    }

    /**
     * ตรวจจับสาขาจาก URL parameter หรือ localStorage
     */
    async detectBranch() {
        // วิธีที่ 1: ดึงจาก URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        let branchCode = urlParams.get('branch');

        // วิธีที่ 2: ดึงจาก localStorage
        if (!branchCode) {
            branchCode = localStorage.getItem('currentBranch');
        }

        // วิธีที่ 3: ดึงจาก global variable (ถ้ามี)
        if (!branchCode && typeof window.BRANCH_CODE !== 'undefined') {
            branchCode = window.BRANCH_CODE;
        }

        if (branchCode) {
            this.currentBranch = branchCode;
            console.log(`📍 Detected branch: ${branchCode}`);

            // บันทึกลง localStorage สำหรับครั้งต่อไป
            localStorage.setItem('currentBranch', branchCode);

            // ดึงข้อมูลสาขาจาก API
            await this.loadBranchData(branchCode);
        } else {
            console.warn('⚠️ No branch detected, using default settings');
        }
    }

    /**
     * โหลดข้อมูลสาขาจาก API
     */
    async loadBranchData(branchCode) {
        try {
            console.log(`🔍 Loading branch data for: ${branchCode}`);

            const response = await fetch('/api/branch');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to load branch data');
            }

            // หาสาขาที่ตรงกับ branch_code
            this.branchData = result.data.find(branch => branch.branch_code === branchCode);

            if (this.branchData) {
                console.log(`✅ Branch data loaded: ${this.branchData.name}`);
            } else {
                console.warn(`⚠️ Branch ${branchCode} not found in database`);
            }

        } catch (error) {
            console.error('❌ Error loading branch data:', error);
            throw error;
        }
    }

    /**
     * ตั้งค่า printer URL ตามข้อมูลสาขา
     */
    async setupPrinter() {
        if (this.branchData && this.branchData.printerServerUrl) {
            this.printerURL = this.branchData.printerServerUrl;
            console.log(`🖨️ Printer URL configured: ${this.printerURL}`);

            // ทดสอบการเชื่อมต่อ
            await this.testConnection();
        } else {
            console.warn('⚠️ No printer URL configured for this branch');
        }
    }

    /**
     * ทดสอบการเชื่อมต่อกับ printer server
     */
    async testConnection() {
        if (!this.printerURL) {
            return false;
        }

        try {
            console.log(`🔍 Testing printer connection: ${this.printerURL}`);
            console.log('🔄 Using proxy endpoint for printer test');

            const response = await fetch('/api/printer/print', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: 'test-connection',
                    printerURL: this.printerURL
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('✅ Printer connection successful via proxy');
                    return true;
                } else {
                    console.warn(`⚠️ Printer proxy test failed: ${result.error}`);
                    return false;
                }
            } else {
                console.warn(`⚠️ Printer proxy responded with status: ${response.status}`);
                return false;
            }

        } catch (error) {
            console.warn(`⚠️ Printer connection test failed: ${error.message}`);
            return false;
        }
    }

    /**
     * เริ่มการตรวจสอบสถานะแบบ real-time
     */
    startRealtimeMonitoring() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }

        console.log('🕐 Starting real-time printer monitoring (60s intervals)...');

        // รอสักครู่ก่อนเริ่มตรวจสอบ (หลีกเลี่ยงการ cache)
        setTimeout(() => {
            this.checkPrinterStatus();
        }, 2000);

        // ตั้งค่าการตรวจสอบแบบ interval
        this.statusCheckInterval = setInterval(() => {
            // ⚡ ตรวจสอบว่าหน้าเป็น visible หรือไม่
            if (document.visibilityState === 'visible') {
                this.checkPrinterStatus();
            } else {
                console.log('📱 Page not visible, skipping printer status check');
            }
        }, this.statusCheckFrequency);

        // เพิ่ม Page Visibility API event listener
        this.setupPageVisibilityListener();
    }

    /**
     * ตั้งค่า Page Visibility API listener
     */
    setupPageVisibilityListener() {
        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
        }

        this.visibilityChangeHandler = () => {
            if (document.visibilityState === 'visible') {
                console.log('📱 Page became visible, resuming printer monitoring...');
                // ตรวจสอบสถานะทันทีเมื่อหน้ากลับมา visible
                this.checkPrinterStatus();
            } else {
                console.log('📱 Page became hidden, printer monitoring will pause...');
            }
        };

        document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }

    /**
     * หยุดการตรวจสอบ real-time
     */
    stopRealtimeMonitoring() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
            console.log('🛑 Real-time printer monitoring stopped');
        }

        // ลบ event listener
        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
            this.visibilityChangeHandler = null;
        }
    }

    /**
     * ตรวจสอบสถานะเครื่องพิมพ์
     */
    async checkPrinterStatus() {
        if (!this.printerURL) {
            this.updatePrinterStatus('no_printer', 'ไม่มีเครื่องพิมพ์สำหรับสาขานี้', false);
            return;
        }

        try {
            // 🔧 ใช้ GET /api/printer/status แทน POST /api/printer/print
            const response = await fetch('/api/printer/status', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.updatePrinterStatus('online', 'เครื่องพิมพ์พร้อมใช้งาน', true);
                } else {
                    this.updatePrinterStatus('error', `เครื่องพิมพ์ตอบสนองด้วยข้อผิดพลาด: ${result.error}`, false);
                }
            } else {
                this.updatePrinterStatus('error', `เครื่องพิมพ์ตอบสนองด้วย status: ${response.status}`, false);
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                this.updatePrinterStatus('timeout', 'เครื่องพิมพ์ไม่ตอบสนอง (timeout)', false);
            } else {
                this.updatePrinterStatus('offline', `เครื่องพิมพ์ออฟไลน์: ${error.message}`, false);
            }
        }
    }

    /**
     * อัพเดทสถานะเครื่องพิมพ์และแจ้งเตือน
     */
    updatePrinterStatus(status, message, isOnline) {
        const previousStatus = this.printerStatus.status;
        const previousOnline = this.printerStatus.isOnline;

        this.printerStatus = {
            status: status,
            message: message,
            lastCheck: new Date(),
            isOnline: isOnline
        };

        // Log การเปลี่ยนแปลงสถานะ
        if (previousStatus !== status) {
            if (isOnline) {
                console.log(`✅ Printer status changed: ${message}`);
            } else {
                console.warn(`⚠️ Printer status changed: ${message}`);
            }
        }

        // เรียก callbacks สำหรับ status change
        this.statusChangeCallbacks.forEach(callback => {
            try {
                callback(this.printerStatus, { previousStatus, previousOnline });
            } catch (error) {
                console.error('❌ Status change callback error:', error);
            }
        });

        // อัพเดท UI indicators
        this.updateStatusUI();
    }

    /**
     * อัพเดท UI แสดงสถานะเครื่องพิมพ์ (แสดงสถานะเท่านั้น ไม่บล็อกการขาย)
     */
    updateStatusUI() {
        // อัพเดท indicator หลักใน UI
        const statusIndicator = document.getElementById('printer-status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `printer-status-indicator ${this.printerStatus.isOnline ? 'online' : 'offline'}`;
            statusIndicator.textContent = this.printerStatus.message;
        }

        // อัพเดท badge
        const statusBadge = document.getElementById('printer-status-badge');
        if (statusBadge) {
            statusBadge.className = `badge ${this.printerStatus.isOnline ? 'badge-success' : 'badge-error'}`;
            statusBadge.textContent = this.printerStatus.isOnline ? '🟢 Online' : '🔴 Offline';
        }

        // อัพเดท status dot
        const printerStatusDot = document.getElementById('printerStatus');
        if (printerStatusDot) {
            printerStatusDot.className = `w-2 h-2 rounded-full ${this.printerStatus.isOnline ? 'online' : 'offline'}`;
        }

        // แสดงแจ้งเตือนเมื่อสถานะเปลี่ยน (แต่ไม่บล็อกการขาย)
        if (window.showToast && typeof window.showToast === 'function') {
            const previousStatus = this.printerStatus.status;
            if (previousStatus !== this.printerStatus.status) {
                if (this.printerStatus.isOnline) {
                    window.showToast('🖨️ เครื่องพิมพ์พร้อมใช้งาน', 'success');
                } else {
                    window.showToast('⚠️ เครื่องพิมพ์ไม่พร้อมใช้งาน (ยังคงขายได้)', 'warning');
                }
            }
        }
    }

    /**
     * พิมพ์เอกสาร (ไม่มีการตรวจสอบบล็อกการขาย)
     */
    async print(imageData, options = {}) {
        if (!this.isInitialized) {
            console.log('⏳ PrinterService not ready, initializing...');
            await this.init();
        }

        if (!imageData) {
            throw new Error('Image data is required');
        }

        // เตือนผู้ใช้หากเครื่องพิมพ์ไม่พร้อม แต่ยังคงพิมพ์ได้
        if (!this.printerStatus.isOnline) {
            console.warn('⚠️ Printer is offline but proceeding with print job...');
            if (window.showToast && typeof window.showToast === 'function') {
                window.showToast('⚠️ เครื่องพิมพ์อาจไม่พร้อม กำลังลองพิมพ์...', 'warning');
            }
        }

        console.log('🖨️ Starting print job...');

        const printData = {
            image: imageData,
            branchCode: this.currentBranch,
            printerURL: this.printerURL,
            ...options
        };

        try {
            const response = await fetch('/api/printer/print', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(printData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            if (result.success) {
                console.log('✅ Print job completed successfully');
                return result;
            } else {
                throw new Error(result.error || 'Print job failed');
            }

        } catch (error) {
            console.error('❌ Print job failed:', error);
            throw error;
        }
    }

    /**
     * เพิ่ม callback สำหรับการเปลี่ยนแปลงสถานะ
     */
    onStatusChange(callback) {
        if (typeof callback === 'function') {
            this.statusChangeCallbacks.push(callback);
        }
    }

    /**
     * ลบ callback
     */
    removeStatusChange(callback) {
        const index = this.statusChangeCallbacks.indexOf(callback);
        if (index > -1) {
            this.statusChangeCallbacks.splice(index, 1);
        }
    }

    /**
     * ตรวจสอบสถานะ printer แบบ manual
     */
    async manualStatusCheck() {
        console.log('🔄 Manual printer status check requested...');
        await this.checkPrinterStatus();
        return this.printerStatus;
    }

    /**
     * ดึงสถานะปัจจุบัน
     */
    getCurrentStatus() {
        return {
            ...this.printerStatus,
            monitoringActive: !!this.statusCheckInterval
        };
    }

    /**
     * เปลี่ยนสาขา
     */
    async switchBranch(branchCode) {
        // หยุดการ monitor ชั่วคราว
        this.stopRealtimeMonitoring();

        this.currentBranch = branchCode;
        this.branchData = null;
        this.printerURL = null;
        this.isInitialized = false;

        localStorage.setItem('currentBranch', branchCode);

        await this.init(); // จะเริ่ม monitoring ใหม่อัตโนมัติ
    }

    /**
     * ทำลายระบบ
     */
    destroy() {
        this.stopRealtimeMonitoring();
        this.statusChangeCallbacks = [];

        // เคลียร์ global reference
        if (window.PrinterServiceInstance === this) {
            window.PrinterServiceInstance = null;
        }

        console.log('🗑️ PrinterService destroyed');
    }

    /**
     * ดึงข้อมูลสาขาปัจจุบัน
     */
    getCurrentBranch() {
        return {
            code: this.currentBranch,
            data: this.branchData,
            printerURL: this.printerURL,
            status: this.printerStatus
        };
    }
}

// 🌟 Global PrinterService Management
(function() {
    'use strict';

    // สร้าง global instance
    if (!window.PrinterService) {
        window.PrinterService = new PrinterService();
        console.log('🔧 Global PrinterService instance created');

        // Auto-initialize เมื่อหน้าโหลดเสร็จ
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('📄 DOM loaded, initializing PrinterService...');
                window.PrinterService.init();
            });
        } else {
            // หากโหลดเสร็จแล้ว ให้เริ่มต้นเลย
            console.log('📄 DOM already loaded, initializing PrinterService...');
            window.PrinterService.init();
        }
    }

    // ป้องกัน multiple initialization
    window.initializePrinterService = function() {
        if (window.PrinterService) {
            return window.PrinterService.init();
        } else {
            console.error('❌ PrinterService not available');
            return Promise.reject(new Error('PrinterService not available'));
        }
    };

    // Cleanup function สำหรับ page unload
    window.addEventListener('beforeunload', () => {
        if (window.PrinterService && typeof window.PrinterService.destroy === 'function') {
            window.PrinterService.destroy();
        }
    });

    console.log('✅ PrinterService global setup completed');
})();

// Export สำหรับ module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrinterService;
}
