const mongoose = require('mongoose');
const AutoApprovalSettings = require('../models/AutoApprovalSettings');

async function setupAutoApproval() {
  try {
    console.log('🚀 Setting up Auto-Approval System...');

    // เชื่อมต่อฐานข้อมูล
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/my-accounting-app');
    console.log('✅ Connected to MongoDB');

    // ตรวจสอบว่ามีการตั้งค่าอยู่แล้วหรือไม่
    let settings = await AutoApprovalSettings.findOne();

    if (!settings) {
      // สร้างการตั้งค่าเริ่มต้น
      settings = new AutoApprovalSettings({
        enabled: false, // เริ่มต้นปิดไว้
        conditions: {
          timeBasedApproval: {
            enabled: false,
            startTime: '08:00',
            endTime: '18:00',
            timezone: 'Asia/Bangkok'
          },
          roleBasedApproval: {
            enabled: false,
            allowedRoles: []
          },
          dailyLimit: {
            enabled: false,
            maxApprovals: 50
          }
        },
        approvalNote: 'อนุมัติอัตโนมัติโดยระบบ',
        stats: {
          totalApprovals: 0,
          dailyCount: 0,
          lastResetDate: new Date()
        }
      });

      await settings.save();
      console.log('✅ Created default Auto-Approval settings');
    } else {
      console.log('✅ Auto-Approval settings already exist');
    }

    console.log('🎉 Auto-Approval System setup completed!');
    console.log(`   • Enabled: ${settings.enabled}`);
    console.log(`   • Time-based: ${settings.conditions.timeBasedApproval.enabled}`);
    console.log(`   • Role-based: ${settings.conditions.roleBasedApproval.enabled}`);
    console.log(`   • Daily limit: ${settings.conditions.dailyLimit.enabled}`);

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// รันการตั้งค่า
setupAutoApproval();
