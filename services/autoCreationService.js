// services/autoCreationService.js
const mongoose = require('mongoose');
const { isConnected, waitForConnection } = require('../config/db');
const BranchStockHistory = require('../models/POS/BranchStockHistory');
const Branch = require('../models/Account/Branch');
const ReceiptVoucherAutoCreate = require('../controllers/Services/receiptVoucherAutoCreate');
const config = require('../config/receiptVoucherConfig');

class AutoCreationService {
    constructor() {
        this.isRunning = false;
        this.interval = null;
        this.lastRunTime = null;
        this.stats = {
            totalCreated: 0,
            totalFailed: 0,
            totalSkipped: 0,
            lastRun: null,
            byBranch: {}
        };
    }

    // เริ่มระบบ Auto Creation
    start() {
        if (!config.AUTO_CREATION_ENABLED) {
            console.log('⚠️  Backend Auto Creation is DISABLED in config');
            return;
        }

        if (this.isRunning) {
            console.log('⚠️  Backend Auto Creation is already running');
            return;
        }

        console.log('🚀 Starting Backend Auto Creation Service...');
        console.log(`⏰ Will run every ${config.AUTO_CREATE_INTERVAL / 1000} seconds`);
        console.log(`📋 Auto create reasons: ${config.AUTO_CREATE_REASONS.join(', ')}`);
        console.log(`🔢 Batch limit: ${config.AUTO_CREATE_BATCH_LIMIT || 50} items per run`);

        this.isRunning = true;

        // รันทันทีเมื่อเริ่ม
        this.runAutoCreation();

        // ตั้งเวลารันตาม interval
        this.interval = setInterval(() => {
            this.runAutoCreation();
        }, config.AUTO_CREATE_INTERVAL);

        console.log('✅ Backend Auto Creation Service started successfully');
    }

    // หยุดระบบ
    stop() {
        if (!this.isRunning) {
            console.log('⚠️  Backend Auto Creation is not running');
            return;
        }

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.isRunning = false;
        console.log('🛑 Backend Auto Creation Service stopped');
    }

    // รันการสร้างอัตโนมัติสำหรับทุกสาขา
    async runAutoCreation() {
        try {
            // Check MongoDB connection first
            if (!isConnected()) {
                console.warn('⚠️ MongoDB not connected, skipping auto creation');
                return;
            }

            // Wait for connection to be ready
            try {
                await waitForConnection(5000);
            } catch (connectionError) {
                console.warn('⚠️ MongoDB connection not ready, skipping auto creation');
                return;
            }

            console.log('\n⏰ Running backend auto creation check...');
            this.lastRunTime = new Date();

            // ดึงรายการสาขาทั้งหมด
            const branches = await Branch.find({}).lean();
            console.log(`🏢 Processing ${branches.length} branches...`);

            let totalSuccess = 0;
            let totalFailed = 0;
            let totalSkipped = 0;

            // ประมวลผลแต่ละสาขา
            for (const branch of branches) {
                const branchCode = branch.code || branch.branch_code;
                const branchName = branch.name || branch.branch_name;

                console.log(`\n📍 Processing branch: ${branchName} (${branchCode})`);

                try {
                    const result = await this.processItemsForBranch(branchCode, branch._id);

                    totalSuccess += result.success;
                    totalFailed += result.failed;
                    totalSkipped += result.skipped;

                    // อัพเดทสถิติรายสาขา
                    if (!this.stats.byBranch[branchCode]) {
                        this.stats.byBranch[branchCode] = {
                            name: branchName,
                            created: 0,
                            failed: 0,
                            skipped: 0
                        };
                    }

                    this.stats.byBranch[branchCode].created += result.success;
                    this.stats.byBranch[branchCode].failed += result.failed;
                    this.stats.byBranch[branchCode].skipped += result.skipped;

                } catch (error) {
                    console.error(`❌ Error processing branch ${branchCode}:`, error.message);
                }
            }

            // อัพเดทสถิติรวม
            this.stats.totalCreated += totalSuccess;
            this.stats.totalFailed += totalFailed;
            this.stats.totalSkipped += totalSkipped;
            this.stats.lastRun = new Date();

            console.log(`\n📊 Auto creation cycle completed:`);
            console.log(`   ✅ Success: ${totalSuccess}`);
            console.log(`   ⏭️  Skipped: ${totalSkipped}`);
            console.log(`   ❌ Failed: ${totalFailed}`);
            console.log(`   📈 Total created (all time): ${this.stats.totalCreated}`);

            // ส่ง Socket event สรุป
            if (global.io) {
                global.io.emit('autoCreationSummary', {
                    timestamp: new Date(),
                    cycleStats: {
                        success: totalSuccess,
                        failed: totalFailed,
                        skipped: totalSkipped
                    },
                    totalStats: this.stats
                });
            }

        } catch (error) {
            console.error('❌ Error in auto creation cycle:', error);
        }
    }

    // ประมวลผลรายการสำหรับแต่ละสาขา
    async processItemsForBranch(branchCode, branchId) {
        try {
            // Query หารายการที่รอสร้าง
            const query = {
                branch_code: branchCode,
                change_type: 'OUT',
                $or: [
                    { hasReceiptVoucher: { $ne: true } },
                    { hasReceiptVoucher: { $exists: false } },
                    { hasReceiptVoucher: false },
                    { hasReceiptVoucher: null }
                ],
                reason: { $in: config.AUTO_CREATE_REASONS }
            };

            // ดึงข้อมูลจำกัดจำนวน
            const pendingItems = await BranchStockHistory.find(query)
                .limit(config.AUTO_CREATE_BATCH_LIMIT || 50)
                .sort({ performed_at: 1 }) // เรียงจากเก่าไปใหม่
                .lean();

            if (pendingItems.length === 0) {
                console.log(`   ✅ No pending items for branch ${branchCode}`);
                return { success: 0, failed: 0, skipped: 0 };
            }

            console.log(`   📋 Found ${pendingItems.length} pending items`);

            // ประมวลผลทีละรายการ
            let successCount = 0;
            let failCount = 0;
            let skipCount = 0;

            for (const item of pendingItems) {
                try {
                    // ตรวจสอบซ้ำในฐานข้อมูลล่าสุด (ป้องกัน race condition)
                    const currentItem = await BranchStockHistory.findById(item._id);
                    if (!currentItem || currentItem.hasReceiptVoucher) {
                        skipCount++;
                        console.log(`   ⏭️  Skipping ${item.invoice_no} - Already processed or not found`);
                        continue;
                    }

                    // ตรวจสอบว่ามีใบสำคัญรับเงินในระบบแล้วหรือไม่
                    const ReceiptVoucher = require('../models/POS/ReceiptVoucher');
                    const existingReceipt = await ReceiptVoucher.findOne({
                        $or: [
                            { 'reference.branchStockHistoryId': item._id },
                            { 'reference.invoiceNumber': item.invoice_no },
                            { notes: { $regex: item.invoice_no || '', $options: 'i' } }
                        ]
                    });

                    if (existingReceipt) {
                        skipCount++;
                        console.log(`   ⏭️  Receipt already exists for ${item.invoice_no} - ${existingReceipt.documentNumber}`);

                        // อัพเดท hasReceiptVoucher
                        await BranchStockHistory.findByIdAndUpdate(item._id, {
                            hasReceiptVoucher: true,
                            receiptVoucherId: existingReceipt._id
                        });
                        continue;
                    }

                    // แปลงข้อมูล
                    const saleData = ReceiptVoucherAutoCreate.convertHistoryToSaleData(item);

                    // เพิ่ม branch ID
                    saleData.branchId = branchId;

                    // ใช้ ObjectId จาก performed_by หรือสร้างใหม่
                    if (!saleData.staffId) {
                        saleData.staffId = item.performed_by || new mongoose.Types.ObjectId();
                    }

                    console.log(`   🔄 Processing: ${item.invoice_no} - Amount: ฿${(item.net_amount || 0).toLocaleString()}`);

                    // สร้างใบสำคัญรับเงิน
                    const result = await ReceiptVoucherAutoCreate.createFromSale(saleData);

                    if (result.success) {
                        successCount++;
                        console.log(`   ✅ Created ${result.data.documentNumber} for ${item.invoice_no}`);

                        // ส่ง Socket event
                        if (global.io) {
                            global.io.emit('receiptVoucherCreated', {
                                success: true,
                                data: result.data,
                                branchCode: branchCode,
                                invoiceNo: item.invoice_no
                            });
                        }
                                            } else {
                            // ถ้ามีเอกสารอยู่แล้ว ให้นับเป็น skip
                            if (result.existingDocument || result.alreadyExists) {
                                skipCount++;
                                console.log(`   ⏭️  Already exists: ${item.invoice_no} - ${result.existingDocument || 'Document exists'}`);
                            } else {
                                failCount++;
                                console.warn(`   ⚠️  Failed: ${item.invoice_no} - ${result.message}`);
                            }
                        }
                } catch (error) {
                    failCount++;
                    console.error(`   ❌ Error: ${item.invoice_no} - ${error.message}`);
                }

                // หน่วงเวลาเล็กน้อย
                await this.delay(100);
            }

            return {
                success: successCount,
                failed: failCount,
                skipped: skipCount
            };

        } catch (error) {
            console.error(`Error processing branch ${branchCode}:`, error);
            return { success: 0, failed: 0, skipped: 0 };
        }
    }

    // ดึงสถิติการทำงาน
    getStats() {
        return {
            isRunning: this.isRunning,
            lastRunTime: this.lastRunTime,
            nextRunTime: this.lastRunTime && this.isRunning
                ? new Date(this.lastRunTime.getTime() + config.AUTO_CREATE_INTERVAL)
                : null,
            stats: this.stats,
            config: {
                enabled: config.AUTO_CREATION_ENABLED,
                interval: config.AUTO_CREATE_INTERVAL,
                batchLimit: config.AUTO_CREATE_BATCH_LIMIT,
                reasons: config.AUTO_CREATE_REASONS
            }
        };
    }

    // รีเซ็ตสถิติ
    resetStats() {
        this.stats = {
            totalCreated: 0,
            totalFailed: 0,
            totalSkipped: 0,
            lastRun: null,
            byBranch: {}
        };
        console.log('📊 Stats reset successfully');
    }

    // Helper function สำหรับหน่วงเวลา
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Static method สำหรับ compatibility กับโค้ดเดิม
    static async runAutoCreation(branchId, autoConfig = {}) {
        const instance = new AutoCreationService();

        // หา branch code จาก branch ID
        let branchCode = '00000';
        if (branchId) {
            const branch = await Branch.findById(branchId);
            if (branch) {
                branchCode = branch.code || branch.branch_code;
            }
        }

        // รันสำหรับสาขาที่ระบุ
        const result = await instance.processItemsForBranch(branchCode, branchId);

        return {
            success: true,
            branchId,
            branchCode,
            totalPending: result.success + result.failed + result.skipped,
            processed: result.success,
            failed: result.failed,
            skipped: result.skipped
        };
    }
}

// สร้าง instance เดียวเพื่อใช้ทั่วทั้ง app
const autoCreationService = new AutoCreationService();

module.exports = autoCreationService;
