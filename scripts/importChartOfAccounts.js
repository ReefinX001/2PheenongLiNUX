// scripts/importChartOfAccounts.js
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const connectDB = require('../config/db');
const ChartOfAccount = require('../models/Account/ChartOfAccount');

async function run() {
  await connectDB();

  const html = fs.readFileSync(
    path.join(__dirname, 'chart_of_accounts.html'),
    'utf-8'
  );
  const $ = cheerio.load(html);

  const rows = $('.account-table tbody tr');
  const docs = [];
  const seenCodes = new Set();
  const parentStack = []; // เก็บ parent ตาม level

  rows.each((_, tr) => {
    const $tr = $(tr);
    const cols = $tr.find('td');
    if (cols.length < 3) return;

    // ดึงข้อมูลจากคอลัมน์แรก (ชื่อบัญชี)
    const $firstCol = $(cols[0]);
    let name = '';
    let level = parseInt($tr.attr('data-level') || '0', 10);

    // ตรวจสอบว่ามี div.flex หรือไม่ (สำหรับบัญชีที่มีเมนูย่อย)
    const $flexDiv = $firstCol.find('div.flex');
    if ($flexDiv.length > 0) {
      // บัญชีที่มีเมนูย่อย - ดึงชื่อจาก span ทั้งหมด
      const spans = $flexDiv.find('span');
      name = spans.map((i, span) => $(span).text().trim()).get().join(' ');
    } else {
      // บัญชีที่ไม่มีเมนูย่อย - ดึงจาก span หรือ text โดยตรง
      const $span = $firstCol.find('span');
      if ($span.length > 0) {
        name = $span.text().trim();
      } else {
        name = $firstCol.text().trim();
      }
    }

    // ดึงรหัสบัญชี
    const code = $(cols[1]).text().trim();

    // ตรวจสอบรหัสซ้ำ
    if (seenCodes.has(code)) {
      console.warn(`⏩ Skipping duplicate code ${code}`);
      return;
    }
    seenCodes.add(code);

    // ดึงประเภทบัญชี
    const $badge = $(cols[2]).find('span');
    const badgeText = $badge.text().trim().toLowerCase();
    const enumValue =
      badgeText === 'asset' ? 'Asset' :
      badgeText === 'liabilities' ? 'Liabilities' :
      badgeText === 'equity' ? 'Equity' :
      badgeText === 'income' ? 'Income' :
      badgeText === 'expense' ? 'Expense' :
      'Asset';

    // ตรวจสอบว่าเป็นหมวดหลักหรือไม่
    const isMainCategory = name.includes('สินทรัพย์') ||
                         name.includes('หนี้สิน') ||
                         name.includes('ส่วนของเจ้าของ') ||
                         name.includes('รายได้') ||
                         name.includes('ค่าใช้จ่าย');

    // สร้าง document
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      code,
      name,
      type: enumValue,
      category: enumValue,
      level,
      isMainCategory,
      parent: null
    };

    // กำหนด parent ตาม level
    if (level > 0 && parentStack[level - 1]) {
      doc.parent = parentStack[level - 1]._id;
    }

    // อัพเดท parentStack
    parentStack[level] = doc;
    // ล้าง level ที่สูงกว่า
    for (let i = level + 1; i < parentStack.length; i++) {
      parentStack[i] = null;
    }

    docs.push(doc);
  });

  // แสดงข้อมูลตัวอย่างเพื่อตรวจสอบ
  console.log('\n📊 ตัวอย่างข้อมูลที่จะ import:');
  console.log('จำนวนทั้งหมด:', docs.length, 'รายการ\n');

  // แสดงตัวอย่างแต่ละระดับ
  const sampleByLevel = {};
  docs.forEach(doc => {
    if (!sampleByLevel[doc.level] || sampleByLevel[doc.level].length < 3) {
      if (!sampleByLevel[doc.level]) sampleByLevel[doc.level] = [];
      sampleByLevel[doc.level].push({
        code: doc.code,
        name: doc.name,
        level: doc.level,
        parentCode: docs.find(d => d._id === doc.parent)?.code || 'none'
      });
    }
  });

  Object.keys(sampleByLevel).sort().forEach(level => {
    console.log(`\nLevel ${level}:`);
    sampleByLevel[level].forEach(item => {
      console.log(`  ${item.code} - ${item.name} (parent: ${item.parentCode})`);
    });
  });

  // ลบข้อมูลเดิมและ import ข้อมูลใหม่
  try {
    await ChartOfAccount.deleteMany({});
    await ChartOfAccount.insertMany(docs);
    console.log(`\n✅ Imported ${docs.length} unique accounts successfully!`);

    // ตรวจสอบข้อมูลที่ import
    const count = await ChartOfAccount.countDocuments();
    console.log(`📊 Total accounts in database: ${count}`);

    // แสดงตัวอย่างการเชื่อมโยง parent-child
    console.log('\n🔗 ตัวอย่างความสัมพันธ์ parent-child:');
    const sample = await ChartOfAccount.findOne({ code: '55131' })
      .populate('parent')
      .lean();

    if (sample) {
      console.log(`บัญชี: ${sample.code} - ${sample.name}`);
      console.log(`Parent: ${sample.parent?.code} - ${sample.parent?.name}`);
    }

  } catch (error) {
    console.error('❌ Error importing data:', error);
    throw error;
  }

  process.exit(0);
}

run().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
