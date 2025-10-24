// scripts/seedChartOfAccounts.js
const mongoose = require('mongoose');
const ChartOfAccount = require('../models/Account/ChartOfAccount');
require('dotenv').config();

// ผังบัญชีมาตรฐานสำหรับธุรกิจทั่วไป (Thai Standard)
const chartOfAccountsData = [
  // ========== 1. สินทรัพย์ (Assets) ==========
  { code: '1000', name: 'สินทรัพย์', type: 'Asset', category: 'Asset', level: 1, isMainCategory: true },

  // สินทรัพย์หมุนเวียน
  { code: '1100', name: 'สินทรัพย์หมุนเวียน', type: 'Asset', category: 'Asset', level: 2 },
  { code: '1101', name: 'เงินสด', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1102', name: 'เงินสดย่อย', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1103', name: 'เงินฝากธนาคาร - ออมทรัพย์', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1104', name: 'เงินฝากธนาคาร - กระแสรายวัน', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1105', name: 'เงินฝากประจำ', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1106', name: 'เช็ครับรอการฝาก', type: 'Asset', category: 'Asset', level: 3 },

  // ลูกหนี้
  { code: '1200', name: 'ลูกหนี้การค้าและตั๋วเงินรับ', type: 'Asset', category: 'Asset', level: 2 },
  { code: '1201', name: 'ลูกหนี้การค้า', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1202', name: 'ตั๋วเงินรับ', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1203', name: 'ลูกหนี้อื่น', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1204', name: 'ค่าเผื่อหนี้สงสัยจะสูญ', type: 'Asset', category: 'Asset', level: 3 },

  // สินค้าคงเหลือ
  { code: '1300', name: 'สินค้าคงเหลือ', type: 'Asset', category: 'Asset', level: 2 },
  { code: '1301', name: 'สินค้าสำเร็จรูป', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1302', name: 'งานระหว่างทำ', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1303', name: 'วัตถุดิบ', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1304', name: 'วัสดุสิ้นเปลือง', type: 'Asset', category: 'Asset', level: 3 },

  // สินทรัพย์ไม่หมุนเวียน
  { code: '1500', name: 'ที่ดิน อาคารและอุปกรณ์', type: 'Asset', category: 'Asset', level: 2 },
  { code: '1501', name: 'ที่ดิน', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1502', name: 'อาคารและสิ่งปลูกสร้าง', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1503', name: 'เครื่องจักรและอุปกรณ์', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1504', name: 'เครื่องตกแต่งและเครื่องใช้สำนักงาน', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1505', name: 'ยานพาหนะ', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1506', name: 'คอมพิวเตอร์และอุปกรณ์', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1507', name: 'ค่าเสื่อมราคาสะสม - อาคาร', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1508', name: 'ค่าเสื่อมราคาสะสม - เครื่องจักร', type: 'Asset', category: 'Asset', level: 3 },
  { code: '1509', name: 'ค่าเสื่อมราคาสะสม - ยานพาหนะ', type: 'Asset', category: 'Asset', level: 3 },

  // ========== 2. หนี้สิน (Liabilities) ==========
  { code: '2000', name: 'หนี้สิน', type: 'Liabilities', category: 'Liabilities', level: 1, isMainCategory: true },

  // หนี้สินหมุนเวียน
  { code: '2100', name: 'หนี้สินหมุนเวียน', type: 'Liabilities', category: 'Liabilities', level: 2 },
  { code: '2101', name: 'เจ้าหนี้การค้า', type: 'Liabilities', category: 'Liabilities', level: 3 },
  { code: '2102', name: 'ตั๋วเงินจ่าย', type: 'Liabilities', category: 'Liabilities', level: 3 },
  { code: '2103', name: 'เจ้าหนี้อื่น', type: 'Liabilities', category: 'Liabilities', level: 3 },
  { code: '2104', name: 'ค่าใช้จ่ายค้างจ่าย', type: 'Liabilities', category: 'Liabilities', level: 3 },
  { code: '2105', name: 'ภาษีเงินได้ค้างจ่าย', type: 'Liabilities', category: 'Liabilities', level: 3 },
  { code: '2106', name: 'ภาษีขายรอนำส่ง', type: 'Liabilities', category: 'Liabilities', level: 3 },
  { code: '2107', name: 'ภาษีหัก ณ ที่จ่ายรอนำส่ง', type: 'Liabilities', category: 'Liabilities', level: 3 },
  { code: '2108', name: 'เงินรับล่วงหน้าจากลูกค้า', type: 'Liabilities', category: 'Liabilities', level: 3 },
  { code: '2109', name: 'เงินประกันสังคมรอนำส่ง', type: 'Liabilities', category: 'Liabilities', level: 3 },

  // หนี้สินไม่หมุนเวียน
  { code: '2200', name: 'หนี้สินไม่หมุนเวียน', type: 'Liabilities', category: 'Liabilities', level: 2 },
  { code: '2201', name: 'เงินกู้ยืมระยะยาว', type: 'Liabilities', category: 'Liabilities', level: 3 },
  { code: '2202', name: 'หนี้สินตามสัญญาเช่าการเงิน', type: 'Liabilities', category: 'Liabilities', level: 3 },
  { code: '2203', name: 'ภาระผูกพันผลประโยชน์พนักงาน', type: 'Liabilities', category: 'Liabilities', level: 3 },

  // ========== 3. ส่วนของเจ้าของ (Equity) ==========
  { code: '3000', name: 'ส่วนของเจ้าของ', type: 'Equity', category: 'Equity', level: 1, isMainCategory: true },
  { code: '3001', name: 'ทุนจดทะเบียน', type: 'Equity', category: 'Equity', level: 2 },
  { code: '3002', name: 'ทุนที่ออกและชำระแล้ว', type: 'Equity', category: 'Equity', level: 2 },
  { code: '3003', name: 'ส่วนเกินมูลค่าหุ้น', type: 'Equity', category: 'Equity', level: 2 },
  { code: '3004', name: 'กำไรสะสม - ยังไม่ได้จัดสรร', type: 'Equity', category: 'Equity', level: 2 },
  { code: '3005', name: 'กำไรสะสม - จัดสรรแล้ว', type: 'Equity', category: 'Equity', level: 2 },
  { code: '3006', name: 'สำรองตามกฎหมาย', type: 'Equity', category: 'Equity', level: 2 },
  { code: '3007', name: 'เงินปันผลจ่าย', type: 'Equity', category: 'Equity', level: 2 },
  { code: '3008', name: 'ถอนใช้ส่วนตัว', type: 'Equity', category: 'Equity', level: 2 },

  // ========== 4. รายได้ (Income) ==========
  { code: '4000', name: 'รายได้', type: 'Income', category: 'Income', level: 1, isMainCategory: true },

  // รายได้จากการขายและบริการ
  { code: '4100', name: 'รายได้จากการขาย', type: 'Income', category: 'Income', level: 2 },
  { code: '4101', name: 'รายได้จากการขายสินค้า', type: 'Income', category: 'Income', level: 3 },
  { code: '4102', name: 'รายได้จากการให้บริการ', type: 'Income', category: 'Income', level: 3 },
  { code: '4103', name: 'รายได้ค่านายหน้า', type: 'Income', category: 'Income', level: 3 },
  { code: '4104', name: 'รายได้ค่าขนส่ง', type: 'Income', category: 'Income', level: 3 },
  { code: '4105', name: 'ส่วนลดจ่าย', type: 'Income', category: 'Income', level: 3 },
  { code: '4106', name: 'รับคืนสินค้า', type: 'Income', category: 'Income', level: 3 },

  // รายได้อื่น
  { code: '4200', name: 'รายได้อื่น', type: 'Income', category: 'Income', level: 2 },
  { code: '4201', name: 'ดอกเบี้ยรับ', type: 'Income', category: 'Income', level: 3 },
  { code: '4202', name: 'เงินปันผลรับ', type: 'Income', category: 'Income', level: 3 },
  { code: '4203', name: 'กำไรจากการขายสินทรัพย์', type: 'Income', category: 'Income', level: 3 },
  { code: '4204', name: 'รายได้ค่าเช่า', type: 'Income', category: 'Income', level: 3 },
  { code: '4205', name: 'รายได้ค่าบริการอื่น', type: 'Income', category: 'Income', level: 3 },
  { code: '4206', name: 'กำไรจากอัตราแลกเปลี่ยน', type: 'Income', category: 'Income', level: 3 },
  { code: '4207', name: 'รายได้เบ็ดเตล็ด', type: 'Income', category: 'Income', level: 3 },
  { code: '4208', name: 'รายได้จากการขายเศษวัสดุ', type: 'Income', category: 'Income', level: 3 },
  { code: '4209', name: 'รายได้อื่นๆ', type: 'Income', category: 'Income', level: 3 },

  // ========== 5. ค่าใช้จ่าย (Expenses) ==========
  { code: '5000', name: 'ค่าใช้จ่าย', type: 'Expense', category: 'Expense', level: 1, isMainCategory: true },

  // ต้นทุนขาย
  { code: '5100', name: 'ต้นทุนขาย', type: 'Expense', category: 'Expense', level: 2 },
  { code: '5101', name: 'ต้นทุนสินค้าที่ขาย', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5102', name: 'ต้นทุนวัตถุดิบใช้ไป', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5103', name: 'ค่าแรงงานทางตรง', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5104', name: 'ค่าใช้จ่ายการผลิต', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5105', name: 'ค่าขนส่งสินค้า', type: 'Expense', category: 'Expense', level: 3 },

  // ค่าใช้จ่ายในการขาย
  { code: '5200', name: 'ค่าใช้จ่ายในการขาย', type: 'Expense', category: 'Expense', level: 2 },
  { code: '5201', name: 'เงินเดือนพนักงานขาย', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5202', name: 'ค่าคอมมิชชั่น', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5203', name: 'ค่าโฆษณาและประชาสัมพันธ์', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5204', name: 'ค่าส่งเสริมการขาย', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5205', name: 'ค่าขนส่งออก', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5206', name: 'ค่าเดินทางพนักงานขาย', type: 'Expense', category: 'Expense', level: 3 },

  // ค่าใช้จ่ายในการบริหาร
  { code: '5300', name: 'ค่าใช้จ่ายในการบริหาร', type: 'Expense', category: 'Expense', level: 2 },
  { code: '5301', name: 'เงินเดือนผู้บริหาร', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5302', name: 'เงินเดือนพนักงานสำนักงาน', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5303', name: 'ค่าเช่าสำนักงาน', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5304', name: 'ค่าน้ำ ค่าไฟฟ้า', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5305', name: 'ค่าโทรศัพท์และอินเตอร์เน็ต', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5306', name: 'ค่าวัสดุสำนักงาน', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5307', name: 'ค่าเสื่อมราคา', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5308', name: 'ค่าซ่อมแซมและบำรุงรักษา', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5309', name: 'ค่าประกันภัย', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5310', name: 'ค่าธรรมเนียมธนาคาร', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5311', name: 'ค่าที่ปรึกษาและวิชาชีพ', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5312', name: 'ค่าภาษีและใบอนุญาต', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5313', name: 'ค่ารับรอง', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5314', name: 'ค่าเดินทาง', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5315', name: 'ค่าฝึกอบรมและสัมมนา', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5316', name: 'หนี้สูญ', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5317', name: 'ขาดทุนจากการขายสินทรัพย์', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5318', name: 'ขาดทุนจากอัตราแลกเปลี่ยน', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5319', name: 'ค่าใช้จ่ายเบ็ดเตล็ด', type: 'Expense', category: 'Expense', level: 3 },

  // ต้นทุนทางการเงิน
  { code: '5400', name: 'ต้นทุนทางการเงิน', type: 'Expense', category: 'Expense', level: 2 },
  { code: '5401', name: 'ดอกเบี้ยจ่าย', type: 'Expense', category: 'Expense', level: 3 },
  { code: '5402', name: 'ค่าธรรมเนียมเงินกู้', type: 'Expense', category: 'Expense', level: 3 },

  // ภาษีเงินได้
  { code: '5500', name: 'ภาษีเงินได้', type: 'Expense', category: 'Expense', level: 2 },
  { code: '5501', name: 'ภาษีเงินได้นิติบุคคล', type: 'Expense', category: 'Expense', level: 3 }
];

async function seedChartOfAccounts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    const deleteResult = await ChartOfAccount.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing accounts`);

    // Insert new data
    const insertResult = await ChartOfAccount.insertMany(chartOfAccountsData);
    console.log(`Successfully inserted ${insertResult.length} chart of accounts`);

    // Verify the data
    const count = await ChartOfAccount.countDocuments();
    console.log(`Total accounts in database: ${count}`);

    // Show sample income accounts
    const incomeAccounts = await ChartOfAccount.find({
      code: { $regex: '^4' }
    }).select('code name').sort('code');

    console.log('\nIncome accounts (รายได้):');
    incomeAccounts.forEach(acc => {
      console.log(`  ${acc.code} - ${acc.name}`);
    });

    console.log('\n✅ Chart of Accounts seeded successfully!');

  } catch (error) {
    console.error('Error seeding chart of accounts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedChartOfAccounts();