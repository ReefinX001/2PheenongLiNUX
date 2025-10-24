// loadProvinces-fixed.js
require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const Province = require('./models/Province');
const connectDB = require('./config/db');

async function main() {
  try {
    console.log('🔗 กำลังเชื่อมต่อ MongoDB...');
    await connectDB();
    console.log('✅ เชื่อมต่อ MongoDB สำเร็จ');

    console.log('📖 อ่านไฟล์ JSON...');
    const raw = fs.readFileSync('api_province_with_amphure_tambon.json', 'utf8');
    const data = JSON.parse(raw);
    console.log(`📊 พบข้อมูล ${data.length} จังหวัด`);

    console.log('🗑️ ลบข้อมูลเก่า...');
    await Province.deleteMany({});
    console.log('✅ ลบข้อมูลเก่าเรียบร้อย');

    let successCount = 0;
    let errorCount = 0;
    let totalAmphures = 0;
    let totalTambons = 0;

    for (let i = 0; i < data.length; i++) {
      const prov = data[i];

      try {
        // ตรวจสอบข้อมูลที่จำเป็น
        if (!prov.id || !prov.name_th) {
          console.log(`⚠️ ข้ามจังหวัดที่ ${i + 1}: ข้อมูลไม่ครบถ้วน`);
          errorCount++;
          continue;
        }

        // สร้างข้อมูลอำเภอและตำบล
        const amphures = [];
        if (prov.amphure && Array.isArray(prov.amphure)) {
          for (const amphure of prov.amphure) {
            if (amphure.id && amphure.name_th) {
              totalAmphures++;

              // สร้างข้อมูลตำบล
              const tambons = [];
              if (amphure.tambon && Array.isArray(amphure.tambon)) {
                for (const tambon of amphure.tambon) {
                  if (tambon.id && tambon.name_th && tambon.zip_code) {
                    tambons.push({
                      tambon_id: tambon.id,
                      name_th: tambon.name_th,
                      zip_code: tambon.zip_code
                    });
                    totalTambons++;
                  }
                }
              }

              amphures.push({
                amphure_id: amphure.id,
                name_th: amphure.name_th,
                tambons: tambons
              });
            }
          }
        }

        // บันทึกลง MongoDB
        await Province.create({
          province_id: prov.id,
          name_th: prov.name_th,
          amphures: amphures
        });

        successCount++;
        if (successCount % 10 === 0 || successCount === 1) {
          const amphureCount = amphures.length;
          const tambonCount = amphures.reduce((sum, a) => sum + a.tambons.length, 0);
          console.log(`📍 ${successCount}. ${prov.name_th} - ${amphureCount} อำเภอ, ${tambonCount} ตำบล`);
        }

      } catch (innerError) {
        console.error(`❌ Error กับ ${prov.name_th}:`, innerError.message);
        errorCount++;
      }
    }

    console.log('\n🎉 สรุปผลการนำเข้าข้อมูล:');
    console.log(`✅ สำเร็จ: ${successCount} จังหวัด`);
    console.log(`📍 รวมอำเภอ: ${totalAmphures} อำเภอ`);
    console.log(`🏘️ รวมตำบล: ${totalTambons} ตำบล`);
    console.log(`❌ ล้มเหลว: ${errorCount} จังหวัด`);
    console.log(`📊 รวม: ${successCount + errorCount} จังหวัด`);

    // ทดสอบข้อมูลตัวอย่าง
    console.log('\n🧪 ทดสอบข้อมูลตัวอย่าง:');
    const sampleProvince = await Province.findOne().lean();
    if (sampleProvince) {
      console.log(`- จังหวัด: ${sampleProvince.name_th}`);
      if (sampleProvince.amphures.length > 0) {
        const sampleAmphure = sampleProvince.amphures[0];
        console.log(`- อำเภอแรก: ${sampleAmphure.name_th}`);
        if (sampleAmphure.tambons && sampleAmphure.tambons.length > 0) {
          const sampleTambon = sampleAmphure.tambons[0];
          console.log(`- ตำบลแรก: ${sampleTambon.name_th} (รหัสไปรษณีย์: ${sampleTambon.zip_code})`);
        }
      }
    }

    await mongoose.disconnect();
    console.log('🔌 ปิดการเชื่อมต่อ MongoDB');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);

    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️ ไม่สามารถเชื่อมต่อ MongoDB ได้');
      console.error('💡 วิธีแก้ไข:');
      console.error('1. เปิด MongoDB (mongod)');
      console.error('2. หรือใช้ MongoDB Atlas แทน');
      console.error('3. ตรวจสอบ MONGO_URI ในไฟล์ .env');
    }

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}