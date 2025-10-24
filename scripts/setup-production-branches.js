const mongoose = require('mongoose');
require('dotenv').config();

// ใช้ configuration เดียวกับโปรเจ็คหลัก
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/myAccountingDB';

console.log(`🔌 Connecting to MongoDB: ${mongoURI.replace(/\/\/.*@/, '//***:***@')}`);

// เชื่อมต่อ MongoDB
mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 30000,  // รอการเชื่อมต่อ 30 วินาที
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('💡 Please check:');
    console.error('   1. MongoDB server is running (mongod)');
    console.error('   2. MongoDB is listening on port 27017');
    console.error('   3. Database "myAccountingDB" exists');
    console.error('   4. Network connectivity');
    console.error('');
    console.error('🔧 To start MongoDB:');
    console.error('   Windows: net start MongoDB');
    console.error('   macOS/Linux: sudo systemctl start mongod');
    process.exit(1);
  });

const Branch = require('../models/Account/Branch');

// กำหนดเฉพาะ branch_code และ printerServerUrl
// ข้อมูลอื่นๆ จะดึงจากฐานข้อมูลที่มีอยู่แล้ว
const PRINTER_SETTINGS = [
  {
    branch_code: '00000',
    printerServerUrl: 'http://100.84.132.71:4004' // ✅ Tailscale IP for Main Office Printer Server
  },
  {
    branch_code: '00001',
    printerServerUrl: 'http://192.168.1.121:4001' // Other branches (not yet on Tailscale)
  },
  {
    branch_code: '00002',
    printerServerUrl: 'http://192.168.1.122:4001'
  },
  {
    branch_code: '00003',
    printerServerUrl: 'http://192.168.1.123:4001'
  },
  {
    branch_code: '00004',
    printerServerUrl: 'http://192.168.1.124:4001'
  }
];

/**
 * อัปเดต printerServerUrl สำหรับสาขาที่มีอยู่ในฐานข้อมูล
 */
async function updatePrinterSettings() {
  try {
    console.log('🖨️  Updating printer settings for existing branches...\n');

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (const setting of PRINTER_SETTINGS) {
      try {
        console.log(`🔍 Looking for branch: ${setting.branch_code}`);

        // หาสาขาในฐานข้อมูล (ใช้ deleted_at: null แทน isActive)
        const existingBranch = await Branch.findOne({
          branch_code: setting.branch_code,
          deleted_at: null
        });

        if (existingBranch) {
          // อัปเดต printerServerUrl เท่านั้น
          await Branch.updateOne(
            { branch_code: setting.branch_code, deleted_at: null },
            {
              $set: {
                printerServerUrl: setting.printerServerUrl,
                updatedAt: new Date()
              }
            }
          );

          console.log(`✅ Updated printer URL for: ${existingBranch.name} (${setting.branch_code})`);
          console.log(`   📍 ${existingBranch.address || 'ไม่ได้ระบุที่อยู่'}`);
          console.log(`   🖨️  ${setting.printerServerUrl}`);
          console.log('');
          updated++;
        } else {
          console.log(`❌ Branch not found: ${setting.branch_code}`);
          console.log('   💡 This branch may need to be created in the database first.');
          console.log('');
          notFound++;
        }

      } catch (error) {
        console.error(`❌ Error processing branch ${setting.branch_code}:`, error.message);
        errors++;
      }
    }

    console.log('📊 Update Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Not Found: ${notFound}`);
    console.log(`   💥 Errors: ${errors}`);
    console.log(`   📝 Total Processed: ${PRINTER_SETTINGS.length}`);

  } catch (error) {
    console.error('❌ Error updating printer settings:', error);
  }
}

/**
 * แสดงรายการสาขาทั้งหมดจากฐานข้อมูล
 */
async function listAllBranches() {
  try {
    console.log('📋 Fetching all branches from database...\n');

    const branches = await Branch.find({ deleted_at: null })
      .sort({ branch_code: 1 })
      .lean();

    if (branches.length === 0) {
      console.log('⚠️  No branches found in database.');
      return;
    }

    console.log(`📊 Found ${branches.length} active branch(es):\n`);

    branches.forEach((branch, index) => {
      console.log(`${index + 1}. ${branch.name} (${branch.branch_code})`);
      console.log(`   📍 Address: ${branch.address || 'ไม่ได้ระบุ'}`);
      console.log(`   📞 Phone: ${branch.phone || 'ไม่ได้ระบุ'}`);
      console.log(`   🖨️  Printer: ${branch.printerServerUrl || 'ไม่ได้ตั้งค่า'}`);

      // แสดงสถานะการตั้งค่า
      const setting = PRINTER_SETTINGS.find(p => p.branch_code === branch.branch_code);
      if (setting) {
        const isApplied = branch.printerServerUrl === setting.printerServerUrl ? '✅' : '⚠️';
        console.log(`   📋 Config Status: ${isApplied} ${isApplied === '✅' ? 'Applied' : 'Not Applied'}`);
      }

      console.log(`   🏷️  Status: ${branch.status || 'active'}`);
      console.log(`   📅 Created: ${new Date(branch.createdAt).toLocaleDateString('th-TH')}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error listing branches:', error);
  }
}

/**
 * ทดสอบการเชื่อมต่อเครื่องพิมพ์ทั้งหมด
 */
async function testAllPrinterConnections() {
  try {
    console.log('🖨️  Testing printer connections for all branches...\n');

    const branches = await Branch.find({
      deleted_at: null,
      printerServerUrl: { $exists: true, $ne: null }
    }).sort({ branch_code: 1 });

    if (branches.length === 0) {
      console.log('⚠️  No branches with printer configuration found.');
      return;
    }

    console.log(`Found ${branches.length} branch(es) with printer configuration:\n`);

    // ตรวจสอบว่ามี node-fetch หรือไม่
    let fetch;
    try {
      fetch = require('node-fetch');
    } catch (e) {
      console.log('📦 Installing node-fetch for printer testing...');
      const { execSync } = require('child_process');
      execSync('npm install node-fetch@2', { stdio: 'inherit' });
      fetch = require('node-fetch');
    }

    for (const branch of branches) {
      try {
        console.log(`Testing: ${branch.name} (${branch.branch_code})`);
        console.log(`URL: ${branch.printerServerUrl}`);

        const response = await fetch(`${branch.printerServerUrl}/printer/status`, {
          method: 'GET',
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const status = data.printer?.connected ? 'Connected ✅' : 'Disconnected ❌';
          const model = data.printer?.model || 'Unknown';
          console.log(`Result: ${status} - ${model}`);
        } else {
          console.log(`Result: HTTP ${response.status} ⚠️`);
        }
      } catch (error) {
        console.log(`Result: Connection Failed ❌ - ${error.message}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error testing printer connections:', error);
  }
}

// ================== COMMAND LINE INTERFACE ==================

async function main() {
  const command = process.argv[2];
  const arg1 = process.argv[3];

  try {
    switch (command) {
      case 'setup':
        await updatePrinterSettings();
        break;

      case 'list':
        await listAllBranches();
        break;

      case 'test-printers':
        await testAllPrinterConnections();
        break;

      case 'find':
        if (!arg1) {
          console.log('Usage: node setup-production-branches.js find BRANCH_CODE');
          break;
        }
        const branch = await Branch.findOne({
          branch_code: arg1,
          deleted_at: null
        }).lean();

        if (branch) {
          console.log('📋 Branch found:');
          console.log(`   Code: ${branch.branch_code}`);
          console.log(`   Name: ${branch.name}`);
          console.log(`   Address: ${branch.address}`);
          console.log(`   Phone: ${branch.phone}`);
          console.log(`   Email: ${branch.email}`);
          console.log(`   Manager: ${branch.manager_id ? 'กำหนดแล้ว' : 'ไม่ได้กำหนด'}`);
          console.log(`   Printer: ${branch.printerServerUrl || 'ไม่ได้ตั้งค่า'}`);
          console.log(`   Status: ${branch.status}`);

          // แสดงการตั้งค่าที่กำหนดไว้
          const setting = PRINTER_SETTINGS.find(s => s.branch_code === branch.branch_code);
          if (setting) {
            console.log(`\n🖨️  Configured Printer Setting:`);
            console.log(`   URL: ${setting.printerServerUrl}`);
            console.log(`   Status: ${branch.printerServerUrl === setting.printerServerUrl ? '✅ Applied' : '⚠️  Not Applied'}`);
          }
        } else {
          console.log(`❌ Branch with code '${arg1}' not found in database.`);
        }
        break;

      default:
        console.log('📝 Available commands:');
        console.log('');
        console.log('🔧 Setup & Management:');
        console.log('   setup                            - อัปเดต printer URL สำหรับสาขาที่มีในฐานข้อมูล');
        console.log('   list                             - แสดงรายการสาขาทั้งหมดพร้อมสถานะเครื่องพิมพ์');
        console.log('   find BRANCH_CODE                 - ค้นหาสาขาตามรหัส');
        console.log('');
        console.log('🖨️  Printer Testing:');
        console.log('   test-printers                    - ทดสอบเครื่องพิมพ์ทั้งหมด');
        console.log('');
        console.log('💡 Examples:');
        console.log('   node setup-production-branches.js setup');
        console.log('   node setup-production-branches.js list');
        console.log('   node setup-production-branches.js find 00000');
        console.log('   node setup-production-branches.js test-printers');
        console.log('');
        console.log('📋 Current Configured Branches:');
        PRINTER_SETTINGS.forEach(setting => {
          console.log(`   • ${setting.branch_code} → ${setting.printerServerUrl}`);
        });
        process.exit(0);
    }
  } catch (error) {
    console.error('❌ Command execution error:', error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

// รันคำสั่ง
main().catch(console.error);
