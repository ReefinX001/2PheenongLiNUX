// loadProvinces.js
require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const Province = require('./models/Province');
const connectDB = require('./config/db');

async function main() {
  try {
    // ใช้ connectDB จาก config/db.js
    await connectDB();

    const raw = fs.readFileSync('api_province_with_amphure_tambon.json', 'utf8');
    const data = JSON.parse(raw);
    console.log(`พบข้อมูล ${data.length} จังหวัด`);

    await Province.deleteMany({});
    console.log('ลบข้อมูลเก่าเรียบร้อย');

    let count = 0;
    for (const prov of data) {
      try {
        // ตรวจสอบโครงสร้างข้อมูล
        if (!prov.amphure) {
          console.log(`⚠️ จังหวัด ${prov.name_th} ไม่มีข้อมูลอำเภอ`);
          continue;
        }

        await Province.create({
          province_id: prov.id,          // ใช้ id แทน province_id
          name_th:     prov.name_th,
          amphures:    prov.amphure.map(a => ({  // ใช้ amphure แทน amphures
            amphure_id: a.id,            // ใช้ id แทน amphure_id
            name_th:    a.name_th
          }))
        });
        count++;
        console.log(`${count}. นำเข้า ${prov.name_th} สำเร็จ`);
      } catch (innerErr) {
        console.error(`❌ Error processing province ${prov.name_th}:`, innerErr.message);
      }
    }

    console.log(`✅ นำเข้าข้อมูลสำเร็จ ${count}/${data.length} จังหวัด`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

main();