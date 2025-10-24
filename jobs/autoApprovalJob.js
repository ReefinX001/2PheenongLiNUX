const cron = require('node-cron');
const AutoApprovalService = require('../services/autoApprovalService');

class AutoApprovalJob {

  static start() {
    console.log('🤖 Starting Auto-Approval cron job...');

    // รันทุก 30 วินาที - ตรวจสอบคำขอที่รออนุมัติ (ลดความถี่)
    const periodicCheck = cron.schedule('*/30 * * * * *', async () => {
      try {
        const startTime = Date.now();
        const result = await AutoApprovalService.approveAllPendingRequests();
        const duration = Date.now() - startTime;

        // อัปเดตสถิติ
        if (result.totalRequests > 0) {
          totalChecks++;
          totalApproved += result.approvedCount;
        }

        if (result.approvedCount > 0) {
          console.log(`🤖 Periodic check: อนุมัติอัตโนมัติ ${result.approvedCount} คำขอ (${duration}ms)`);

          // ส่งแจ้งเตือนผ่าน Socket.IO
          if (global.io) {
            global.io.emit('autoApprovalCompleted', {
              source: 'periodic',
              approvedCount: result.approvedCount,
              totalRequests: result.totalRequests,
              duration: duration,
              timestamp: new Date()
            });
          }
        } else if (result.totalRequests > 0) {
          // มีคำขอแต่ไม่ได้อนุมัติ
          console.log(`🤖 Periodic check: ${result.totalRequests} คำขอรออยู่ แต่ไม่อนุมัติ (${duration}ms)`);
        }
      } catch (error) {
        console.error('🚨 Auto-approval periodic error:', error.message);
        // Don't log full stack trace for connection errors to reduce noise
        if (!error.message.includes('MongoServerSelectionError') && !error.message.includes('MongoNetworkTimeoutError')) {
          console.error('Full error:', error);
        }
      }
    }, {
      scheduled: false // ไม่เริ่มทันที
    });

    // รันทุก 5 นาที - ตรวจสอบคำขอที่อาจพลาด (ลดความถี่)
    const fallbackCheck = cron.schedule('*/5 * * * *', async () => {
      try {
        console.log('🤖 Running fallback auto-approval check...');
        const startTime = Date.now();
        const result = await AutoApprovalService.approveAllPendingRequests();
        const duration = Date.now() - startTime;

        // อัปเดตสถิติ (รวมกับ periodic)
        if (result.totalRequests > 0) {
          totalChecks++;
          totalApproved += result.approvedCount;
        }

        if (result.approvedCount > 0) {
          console.log(`✅ Fallback check: อนุมัติ ${result.approvedCount} คำขอ (${duration}ms)`);

          // ส่งแจ้งเตือนผ่าน Socket.IO
          if (global.io) {
            global.io.emit('autoApprovalCompleted', {
              source: 'fallback',
              approvedCount: result.approvedCount,
              totalRequests: result.totalRequests,
              duration: duration,
              timestamp: new Date()
            });
          }
        } else {
          console.log(`🤖 Fallback check: ไม่มีคำขอที่ต้องอนุมัติ (${duration}ms)`);
        }
      } catch (error) {
        console.error('🚨 Auto-approval fallback error:', error.message);
        // Don't log full stack trace for connection errors to reduce noise
        if (!error.message.includes('MongoServerSelectionError') && !error.message.includes('MongoNetworkTimeoutError')) {
          console.error('Full error:', error);
        }
      }
    }, {
      scheduled: false
    });

    // เริ่มการทำงาน
    periodicCheck.start();
    fallbackCheck.start();

    console.log('✅ Auto-approval cron jobs started');
    console.log('   • Periodic check: every 30 seconds (ตรวจสอบคำขอใหม่)');
    console.log('   • Fallback check: every 5 minutes (ตรวจสอบคำขอที่พลาด)');

    // สถิติการทำงาน
    let totalApproved = 0;
    let totalChecks = 0;
    const startTimestamp = Date.now();

    // รายงานสถิติทุก 10 นาที
    const statsReport = cron.schedule('*/10 * * * *', () => {
      const uptime = Math.round((Date.now() - startTimestamp) / 1000 / 60); // minutes
      console.log(`📊 Auto-Approval Stats Report:`);
      console.log(`   • Uptime: ${uptime} minutes`);
      console.log(`   • Total checks: ${totalChecks}`);
      console.log(`   • Total approved: ${totalApproved}`);
      console.log(`   • Average: ${totalChecks > 0 ? (totalApproved / totalChecks * 100).toFixed(1) : 0}% approval rate`);

      // ส่งสถิติผ่าน Socket.IO
      if (global.io) {
        global.io.emit('autoApprovalStats', {
          uptime: uptime,
          totalChecks: totalChecks,
          totalApproved: totalApproved,
          approvalRate: totalChecks > 0 ? (totalApproved / totalChecks * 100) : 0,
          timestamp: new Date()
        });
      }
    }, { scheduled: false });

    statsReport.start();

    return {
      periodicCheck,
      fallbackCheck,
      statsReport,
      getStats: () => ({
        uptime: Math.round((Date.now() - startTimestamp) / 1000 / 60),
        totalChecks,
        totalApproved,
        approvalRate: totalChecks > 0 ? (totalApproved / totalChecks * 100) : 0
      }),
      incrementStats: (approved = 0) => {
        totalChecks++;
        totalApproved += approved;
      },
      stop: () => {
        periodicCheck.stop();
        fallbackCheck.stop();
        statsReport.stop();
        console.log('🛑 Auto-approval cron jobs stopped');
      }
    };
  }
}

module.exports = AutoApprovalJob;
