const pcsclite = require('pcsclite');
const iconv = require('iconv-lite');

// Configuration
const DELAY_MS = 200;
let currentReader = null;

// Helper functions
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function transmitPromise(reader, protocol, apdu) {
  return new Promise((resolve, reject) => {
    reader.transmit(apdu, 4096, protocol, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

function apduGetResponse(le) {
  return Buffer.from([0x00, 0xc0, 0x00, 0x00, le]);
}

// APDU Commands
const APDU_SELECT_AID = Buffer.from([
  0x00, 0xa4, 0x04, 0x00, 0x08,
  0xa0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01,
]);

async function readField(reader, protocol, apdu, decodeText = false, trimResult = false) {
  let resp = await transmitPromise(reader, protocol, apdu);

  // Handle GET RESPONSE (SW1=0x61)
  if (resp.length >= 2 && resp[resp.length - 2] === 0x61) {
    const le = resp[resp.length - 1];
    await delay(DELAY_MS);
    const getResp = await transmitPromise(reader, protocol, apduGetResponse(le));
    resp = Buffer.concat([
      resp.slice(0, resp.length - 2),
      getResp.slice(0, getResp.length - 2),
    ]);
  }

  // Remove SW1/SW2 if success (0x90 0x00)
  if (resp.length >= 2) {
    const sw1 = resp[resp.length - 2];
    const sw2 = resp[resp.length - 1];
    if (sw1 === 0x90 && sw2 === 0x00) {
      resp = resp.slice(0, resp.length - 2);
    }
  }

  let result = decodeText ? iconv.decode(resp, 'TIS-620') : resp.toString('hex');
  if (trimResult) result = result.trim();
  return result;
}

async function readAllData(reader, protocol) {
  console.log('🔄 กำลังอ่านข้อมูลจากบัตร...');

  // 1. SELECT AID
  await transmitPromise(reader, protocol, APDU_SELECT_AID);
  console.log('✅ เชื่อมต่อกับบัตรแล้ว');

  // 2. อ่านเลขบัตรประชาชน
  const apduCID = Buffer.from([0x80, 0xb0, 0x00, 0x04, 0x02, 0x00, 0x0d]);
  const citizenId = await readField(reader, protocol, apduCID, true, true);

  // 3. อ่านเพศ
  const apduGender = Buffer.from([0x80, 0xb0, 0x00, 0xe1, 0x02, 0x00, 0x01]);
  const genderText = await readField(reader, protocol, apduGender, true, true);
  const gender = genderText.startsWith('1') ? 'ชาย' : 'หญิง';

  // 4. อ่านชื่อ-นามสกุล (ภาษาไทย)
  const apduThFull = Buffer.from([0x80, 0xb0, 0x00, 0x11, 0x02, 0x00, 0x64]);
  const thFullText = await readField(reader, protocol, apduThFull, true, true);
  const thParts = thFullText.substring(0, 35).split('#');
  const titleTh = thParts[0]?.trim() || '';
  const firstNameTh = thParts[1]?.trim() || '';
  const lastNameTh = thParts[3]?.trim() || '';

  // 5. อ่านชื่อ-นามสกุล (ภาษาอังกฤษ)
  const apduEngFull = Buffer.from([0x80, 0xb0, 0x00, 0x75, 0x02, 0x00, 0x64]);
  const engFullText = await readField(reader, protocol, apduEngFull, true, true);
  const engParts = engFullText.substring(0, 35).split('#');
  const titleEng = engParts[0]?.trim() || '';
  const firstNameEng = engParts[1]?.trim() || '';
  const lastNameEng = engParts[3]?.trim() || '';

  // 6. อ่านที่อยู่
  const apduAddr = Buffer.from([0x80, 0xb0, 0x15, 0x79, 0x02, 0x00, 0x64]);
  const address = await readField(reader, protocol, apduAddr, true, true);

  // 7. อ่านวันเกิด
  const apduDOB = Buffer.from([0x80, 0xb0, 0x00, 0xd9, 0x02, 0x00, 0x08]);
  const dobText = await readField(reader, protocol, apduDOB, true, true);
  const yearTh = dobText.substring(0, 4);
  const month = dobText.substring(4, 6);
  const day = dobText.substring(6, 8);
  const yearEn = parseInt(yearTh, 10) - 543;
  const birthdayTh = `${day}/${month}/${yearTh}`;
  const birthdayEn = `${day}/${month}/${yearEn}`;

  // 8. คำนวณอายุ
  const dobDate = new Date(yearEn, parseInt(month, 10) - 1, parseInt(day, 10));
  const today = new Date();
  let age = today.getFullYear() - dobDate.getFullYear();
  const mDiff = today.getMonth() - dobDate.getMonth();
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < dobDate.getDate())) {
    age--;
  }

  return {
    citizenId,
    gender,
    titleTh,
    firstNameTh,
    lastNameTh,
    titleEng,
    firstNameEng,
    lastNameEng,
    address,
    birthdayTh,
    birthdayEn,
    age,
    fullNameTh: `${titleTh}${firstNameTh} ${lastNameTh}`.trim(),
    fullNameEng: `${titleEng}${firstNameEng} ${lastNameEng}`.trim(),
  };
}

function displayCardData(data) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 ข้อมูลบัตรประจำตัวประชาชน');
  console.log('='.repeat(80));

  // แสดงข้อมูลหลัก
  console.log(`🆔 เลขบัตรประชาชน: ${data.citizenId}`);
  console.log(`👤 ชื่อ-นามสกุล (ไทย): ${data.fullNameTh}`);
  console.log(`🔤 ชื่อ-นามสกุล (อังกฤษ): ${data.fullNameEng}`);
  console.log(`⚧️  เพศ: ${data.gender}`);
  console.log(`🎂 วันเกิด: ${data.birthdayTh} (${data.birthdayEn})`);
  console.log(`🎯 อายุ: ${data.age} ปี`);
  console.log(`🏠 ที่อยู่: ${data.address}`);
  console.log(`⏰ เวลาที่อ่าน: ${new Date().toLocaleString('th-TH')}`);

  console.log('='.repeat(80));

  // แสดงข้อมูลดิบเพื่อตรวจสอบ
  console.log('\n🔍 ข้อมูลดิบ (Raw Data):');
  console.log('-'.repeat(50));
  console.log(`เลขบัตรประชาชน (raw): "${data.citizenId}"`);
  console.log(`ชื่อไทย (raw): "${data.titleTh}|${data.firstNameTh}|${data.lastNameTh}"`);
  console.log(`ชื่ออังกฤษ (raw): "${data.titleEng}|${data.firstNameEng}|${data.lastNameEng}"`);
  console.log(`เพศ (raw): "${data.gender}"`);
  console.log(`ที่อยู่ (raw): "${data.address}"`);
  console.log('-'.repeat(50));

  console.log('✅ อ่านบัตรสำเร็จ!');
}

async function readCard() {
  if (!currentReader) {
    console.log('❌ ไม่พบเครื่องอ่านบัตร กรุณาเสียบเครื่องอ่านบัตร');
    return;
  }

  console.log('🔍 กำลังอ่านบัตร กรุณาใส่บัตรประชาชน...');

  return new Promise((resolve, reject) => {
    currentReader.connect({ share_mode: currentReader.SCARD_SHARE_SHARED }, async (err, protocol) => {
      if (err) {
        console.log('❌ ไม่สามารถเชื่อมต่อกับบัตรได้:', err.message);
        reject(err);
        return;
      }

      try {
        const data = await readAllData(currentReader, protocol);
        displayCardData(data);

        // Disconnect
        currentReader.disconnect(currentReader.SCARD_LEAVE_CARD, (derr) => {
          if (derr) console.log('⚠️ Disconnect warning:', derr.message);
          resolve(data);
        });
      } catch (ex) {
        console.log('❌ เกิดข้อผิดพลาดในการอ่านบัตร:', ex.message);
        reject(ex);
      }
    });
  });
}

// Main program
console.log('🚀 กำลังเริ่มต้นโปรแกรมอ่านบัตรประชาชน...');
console.log('🔌 กำลังรอเครื่องอ่านบัตร...');

const pcsc = pcsclite();

pcsc.on('reader', (reader) => {
  console.log(`✅ พบเครื่องอ่านบัตร: ${reader.name}`);
  currentReader = reader;

  // เมื่อพบเครื่องอ่าน ให้อ่านบัตรทันที
  setTimeout(async () => {
    try {
      await readCard();
    } catch (error) {
      console.log('❌ เกิดข้อผิดพลาด:', error.message);
    }

    // หยุดโปรแกรม
    process.exit(0);
  }, 1000);

  reader.on('end', () => {
    console.log(`❌ เครื่องอ่านบัตรถูกถอดออก: ${reader.name}`);
    currentReader = null;
  });

  reader.on('error', (err) => {
    console.log('❌ เกิดข้อผิดพลาดกับเครื่องอ่านบัตร:', err.message);
  });
});

pcsc.on('error', (err) => {
  console.log('❌ เกิดข้อผิดพลาดกับ PCSC:', err.message);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 ปิดโปรแกรม...');
  pcsc.close();
  process.exit(0);
});

// เพิ่ม timeout หากไม่พบเครื่องอ่าน
setTimeout(() => {
  if (!currentReader) {
    console.log('⏰ หมดเวลารอเครื่องอ่านบัตร กรุณาตรวจสอบการเชื่อมต่อ');
    process.exit(1);
  }
}, 10000);