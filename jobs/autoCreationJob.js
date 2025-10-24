// jobs/autoCreationJob.js
const cron = require('node-cron');
const AutoCreationService = require('../services/autoCreationService');
const AutoCreationConfig = require('../models/POS/AutoCreationConfig');
const Branch = require('../models/Account/Branch');
const config = require('../config/receiptVoucherConfig');

class AutoCreationJob {
    constructor() {
        this.isStarted = false;
        this.jobs = [];
    }

    async start() {
        if (this.isStarted) {
            console.log('⚠️  AutoCreationJob is already started');
            return;
        }

        console.log('🚀 Starting AutoCreationJob...');

        // ตรวจสอบว่าเปิดใช้งานใน config หรือไม่
        if (!config.AUTO_CREATION_ENABLED) {
            console.log('⚠️  Auto Creation is DISABLED in config');
            return;
        }

        // Job 1: รันทุก 5 นาที สำหรับ immediate mode
        const immediateJob = cron.schedule('*/5 * * * *', async () => {
            console.log('\n⏰ Running auto creation check (immediate mode)...');

            try {
                // ดึง configs ที่เปิดใช้งาน
                const configs = await AutoCreationConfig.find({
                    enabled: true,
                    timing: 'immediate'
                }).populate('branchId');

                if (configs.length > 0) {
                    console.log(`📋 Processing ${configs.length} branch configs...`);

                    for (const config of configs) {
                        if (config.branchId) {
                            await AutoCreationService.runAutoCreation(
                                config.branchId._id,
                                config
                            );
                        }
                    }
                } else {
                    // ถ้าไม่มี config ให้รันทุกสาขาด้วย default config
                    console.log('📋 No configs found, running for all branches with default settings...');
                    await this.runForAllBranches();
                }
            } catch (error) {
                console.error('❌ Auto creation job error:', error);
            }
        });

        // Job 2: รันทุกชั่วโมง สำหรับ scheduled mode
        const scheduledJob = cron.schedule('0 * * * *', async () => {
            const now = new Date();
            const currentTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

            console.log(`\n⏰ Checking scheduled auto creation for ${currentTime}...`);

            try {
                const configs = await AutoCreationConfig.find({
                    enabled: true,
                    timing: 'scheduled',
                    scheduledTime: currentTime
                }).populate('branchId');

                console.log(`📋 Found ${configs.length} scheduled configs for ${currentTime}`);

                for (const config of configs) {
                    if (config.branchId) {
                        await AutoCreationService.runAutoCreation(
                            config.branchId._id,
                            config
                        );
                    }
                }
            } catch (error) {
                console.error('❌ Scheduled job error:', error);
            }
        });

        // เก็บ job references
        this.jobs.push(immediateJob);
        this.jobs.push(scheduledJob);

        this.isStarted = true;
        console.log('✅ AutoCreationJob started successfully');

        // รันทันทีเมื่อเริ่ม (ไม่ต้องรอ 5 นาที)
        this.runImmediateCheck();
    }

    // รันทันทีโดยไม่ต้องรอ cron
    async runImmediateCheck() {
        console.log('\n🚀 Running immediate check on startup...');

        try {
            const configs = await AutoCreationConfig.find({
                enabled: true,
                timing: 'immediate'
            }).populate('branchId');

            if (configs.length > 0) {
                for (const config of configs) {
                    if (config.branchId) {
                        await AutoCreationService.runAutoCreation(
                            config.branchId._id,
                            config
                        );
                    }
                }
            } else {
                // รันทุกสาขาด้วย default config
                await this.runForAllBranches();
            }
        } catch (error) {
            console.error('❌ Immediate check error:', error);
        }
    }

    // รันสำหรับทุกสาขาเมื่อไม่มี config
    async runForAllBranches() {
        try {
            const branches = await Branch.find({ isActive: true });
            const allBranches = branches.length > 0 ? branches : await Branch.find({});

            console.log(`🏢 Running for ${allBranches.length} branches with default config...`);

            const defaultConfig = {
                enabled: true,
                timing: 'immediate',
                types: {
                    cashSale: true,
                    creditSale: true,
                    debtPayment: true,
                    deposit: true,
                    return: true
                },
                batchSize: config.AUTO_CREATE_BATCH_LIMIT || 50
            };

            for (const branch of allBranches) {
                await AutoCreationService.runAutoCreation(
                    branch._id,
                    defaultConfig
                );
            }
        } catch (error) {
            console.error('❌ Error running for all branches:', error);
        }
    }

    stop() {
        if (!this.isStarted) {
            console.log('⚠️  AutoCreationJob is not running');
            return;
        }

        console.log('🛑 Stopping AutoCreationJob...');

        // หยุดทุก cron jobs
        this.jobs.forEach(job => job.stop());
        this.jobs = [];

        this.isStarted = false;
        console.log('✅ AutoCreationJob stopped');
    }

    // ดึงสถานะการทำงาน
    getStatus() {
        return {
            isStarted: this.isStarted,
            jobsCount: this.jobs.length,
            config: {
                enabled: config.AUTO_CREATION_ENABLED,
                interval: '*/5 * * * * (every 5 minutes)',
                reasons: config.AUTO_CREATE_REASONS
            }
        };
    }
}

module.exports = new AutoCreationJob();
