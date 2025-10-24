/**
 * thai-id-reader-final.js
 *
 * โค้ด Node.js + pcsclite + iconv-lite
 * เพื่ออ่านข้อมูลบัตรประชาชนไทย (เลขบัตรประชาชน, เพศ, ชื่อ-นามสกุล (ไทย/อังกฤษ),
 * ที่อยู่, วันเกิด, อายุ, รูปภาพ)
 *
 * โดยใช้ชุด APDU:
 *   SELECT AID (ตามตัวอย่าง Java) -> (GET RESPONSE) ->
 *   READ BINARY (CLA 0x80) สำหรับฟิลด์ต่าง ๆ ->
 *   SELECT EF PHOTO โดยลองใช้ CLA=0x80 ก่อน หากล้มเหลวให้ลอง CLA=0x00/P2=0x0C แล้ว READ BINARY สำหรับรูปภาพ
 *
 * หมายเหตุ: หากไม่สามารถเลือกไฟล์รูปได้ จะไม่อ่านรูป (PhotoBuffer จะเป็น Buffer ว่าง)
 */

const pcsclite = require('pcsclite');
const iconv = require('iconv-lite');
const fs = require('fs');

const DELAY_MS = 200;
const EF_PHOTO = [0x01, 0x06];
const PHOTO_CHUNK_SIZE = 16;
const MAX_PHOTO_SIZE = 20000;

/* ------------------------------------------
   Helper Functions & APDU Configuration
-------------------------------------------*/
// ส่งคำสั่ง APDU แบบ Promise
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function transmitPromise(reader, protocol, apdu) {
  return new Promise((resolve, reject) => {
    console.log('>>> APDU TX:', apdu.toString('hex'));
    reader.transmit(apdu, 4096, protocol, (err, data) => {
      if (err) {
        console.error('transmit error:', err);
        return reject(err);
      }
      console.log('<<< APDU RX:', data.toString('hex'));
      resolve(data);
    });
  });
}

// สร้างคำสั่ง GET RESPONSE (ISO7816-4)
function apduGetResponse(le) {
  return Buffer.from([0x00, 0xC0, 0x00, 0x00, le]);
}

// APDU สำหรับ SELECT AID
const APDU_SELECT_AID = Buffer.from([
  0x00, 0xA4, 0x04, 0x00, 0x08,
  0xA0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00,
  0x01
]);

// ฟังก์ชันสร้าง APDU สำหรับ SELECT EF (สำหรับข้อมูลทั่วไป)
function apduSelectEF(efHigh, efLow) {
  return Buffer.from([0x00, 0xA4, 0x00, 0x0C, 0x02, efHigh, efLow]);
}

// ฟังก์ชันสร้าง APDU สำหรับ SELECT EF สำหรับรูป (PHOTO)
// เริ่มต้นด้วย CLA=0x80, P2=0x00
function apduSelectEFPhoto(efHigh, efLow) {
  return Buffer.from([0x80, 0xA4, 0x00, 0x00, 0x02, efHigh, efLow]);
}

// สร้าง APDU สำหรับ READ BINARY
function apduReadBinary(offset, length) {
  const offHi = (offset >> 8) & 0xff;
  const offLo = offset & 0xff;
  return Buffer.from([0x00, 0xB0, offHi, offLo, length]);
}

/**
 * ฟังก์ชันอ่านฟิลด์ข้อมูลทั่วไปจากบัตร
 * @param {Object} reader - object ของเครื่องอ่าน
 * @param {number} protocol - โปรโตคอลที่ใช้ในการเชื่อมต่อ
 * @param {Buffer} apdu - คำสั่ง APDU ที่จะส่งไปยังบัตร
 * @param {boolean} decodeText - ถ้าเป็น true จะ decode ด้วย TIS-620
 * @param {boolean} trimResult - ถ้าเป็น true จะตัดช่องว่างรอบ ๆ ผลลัพธ์ออก
 * @param {string} label - ชื่อฟิลด์สำหรับ log
 * @returns {Promise<string>} - ผลลัพธ์ที่ได้จากการอ่านข้อมูล
 */
async function readField(reader, protocol, apdu, decodeText, trimResult, label) {
  let resp = await transmitPromise(reader, protocol, apdu);
  // หากตอบกลับด้วย SW1 = 0x61 (ต้อง GET RESPONSE)
  if (resp.length >= 2 && resp[resp.length - 2] === 0x61) {
    const le = resp[resp.length - 1];
    console.log(`--- GET RESPONSE for ${label}, le=${le}`);
    await delay(DELAY_MS);
    const getResp = await transmitPromise(reader, protocol, apduGetResponse(le));
    resp = Buffer.concat([resp.slice(0, resp.length - 2), getResp.slice(0, getResp.length - 2)]);
  }
  // ตัด SW1/SW2 ที่ท้ายข้อมูลออก (ถ้าเป็น 90 00)
  if (resp.length >= 2) {
    const lastTwo = resp.slice(resp.length - 2);
    if (lastTwo[0] === 0x90 && lastTwo[1] === 0x00) {
      resp = resp.slice(0, resp.length - 2);
    }
  }
  let result = decodeText ? iconv.decode(resp, 'TIS-620') : resp.toString('hex');
  if (trimResult) result = result.trim();
  console.log(`--- ${label}: ${result}`);
  return result;
}

/* ------------------------------------------
   ฟังก์ชันหลักในการอ่านข้อมูลบัตร
-------------------------------------------*/
async function readAllData(reader, protocol) {
  // 1) SELECT AID
  console.log('=== SELECT AID');
  let aidResp = await transmitPromise(reader, protocol, APDU_SELECT_AID);
  if (aidResp.length >= 2 && aidResp[aidResp.length - 2] === 0x61) {
    const le = aidResp[aidResp.length - 1];
    console.log('--- GET RESPONSE for AID, le=', le);
    await delay(DELAY_MS * 2);
    try {
      const getAid = await transmitPromise(reader, protocol, apduGetResponse(le));
      console.log('GET RESPONSE AID:', getAid.toString('hex'));
    } catch (e) {
      console.warn('GET RESPONSE for AID failed, proceeding without it:', e.message);
    }
  }

  // 2) อ่านเลขบัตรประชาชน (CID)
  const apduCID = Buffer.from([0x80, 0xB0, 0x00, 0x04, 0x02, 0x00, 0x0d]);
  const cidText = await readField(reader, protocol, apduCID, true, true, 'Citizen ID');

  // 3) อ่านข้อมูลเพศ
  const apduGender = Buffer.from([0x80, 0xB0, 0x00, 0xE1, 0x02, 0x00, 0x01]);
  let genderText = await readField(reader, protocol, apduGender, true, true, 'Gender');
  const gender = (genderText.substring(0, 1) === '1') ? 'ชาย' : 'หญิง';

  // 4) อ่านชื่อ-นามสกุล (ภาษาไทย)
  const apduThFull = Buffer.from([0x80, 0xB0, 0x00, 0x11, 0x02, 0x00, 0x64]);
  const thFullText = await readField(reader, protocol, apduThFull, true, true, 'Thai Fullname');
  const thParts = thFullText.substring(0, 35).split('#');
  const titleTh = thParts[0] ? thParts[0].trim() : '';
  const firstNameTh = thParts[1] ? thParts[1].trim() : '';
  const lastNameTh = (thParts.length >= 4 && thParts[3]) ? thParts[3].trim() : '';

  // 5) อ่านชื่อ-นามสกุล (ภาษาอังกฤษ)
  const apduEngFull = Buffer.from([0x80, 0xB0, 0x00, 0x75, 0x02, 0x00, 0x64]);
  const engFullText = await readField(reader, protocol, apduEngFull, true, true, 'Eng Fullname');
  const engParts = engFullText.substring(0, 35).split('#');
  const titleEng = engParts[0] ? engParts[0].trim() : '';
  const firstNameEng = engParts[1] ? engParts[1].trim() : '';
  const lastNameEng = (engParts.length >= 4 && engParts[3]) ? engParts[3].trim() : '';

  // 6) อ่านที่อยู่
  const apduAddr = Buffer.from([0x80, 0xB0, 0x15, 0x79, 0x02, 0x00, 0x64]);
  const addrText = await readField(reader, protocol, apduAddr, true, true, 'Address');

  // 7) อ่านวันเกิด
  const apduDOB = Buffer.from([0x80, 0xB0, 0x00, 0xD9, 0x02, 0x00, 0x08]);
  const dobText = await readField(reader, protocol, apduDOB, true, true, 'Date of Birth');
  const yearTh = dobText.substring(0, 4);
  const month = dobText.substring(4, 6);
  const day = dobText.substring(6, 8);
  const yearEn = parseInt(yearTh, 10) - 543;
  const dobFormattedTh = `${day}/${month}/${yearTh}`;
  const dobFormattedEn = `${day}/${month}/${yearEn}`;

  // 8) คำนวณอายุ
  const dobDate = new Date(yearEn, parseInt(month, 10) - 1, parseInt(day, 10));
  const today = new Date();
  let age = today.getFullYear() - dobDate.getFullYear();
  const mDiff = today.getMonth() - dobDate.getMonth();
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < dobDate.getDate())) {
    age--;
  }

  // 9) อ่านรูป (PHOTO)
  console.log('=== SELECT EF PHOTO');
  let photoBuf = Buffer.alloc(0);
  let photoSelectResp, photoSelectSW;
  try {
    photoSelectResp = await transmitPromise(reader, protocol, apduSelectEFPhoto(EF_PHOTO[0], EF_PHOTO[1]));
    photoSelectSW = photoSelectResp.slice(-2).toString('hex');
  } catch (e) {
    console.warn('Error transmitting SELECT EF PHOTO (CLA=0x80):', e.message);
  }
  if (photoSelectSW !== '9000' && !photoSelectSW.startsWith('61')) {
    console.warn(`SELECT EF PHOTO (CLA=0x80) failed with SW: ${photoSelectSW} - ลองใช้คำสั่ง fallback`);
    try {
      photoSelectResp = await transmitPromise(reader, protocol, apduSelectEF(EF_PHOTO[0], EF_PHOTO[1]));
      photoSelectSW = photoSelectResp.slice(-2).toString('hex');
    } catch (e) {
      console.warn('Fallback SELECT EF PHOTO error:', e.message);
    }
  }
  if (photoSelectSW !== '9000' && !photoSelectSW.startsWith('61')) {
    console.warn('SELECT EF PHOTO failed (SW:', photoSelectSW, ') - ไม่สามารถอ่านข้อมูลรูปได้');
    photoBuf = Buffer.alloc(0);
  } else {
    let offset = 0;
    while (offset < MAX_PHOTO_SIZE) {
      const chunk = Math.min(PHOTO_CHUNK_SIZE, MAX_PHOTO_SIZE - offset);
      if (chunk <= 0) break;
      const resp = await transmitPromise(reader, protocol, apduReadBinary(offset, chunk));
      const realLen = resp.length - 2;
      if (realLen < 0) break;
      photoBuf = Buffer.concat([photoBuf, resp.slice(0, realLen)]);
      offset += realLen;
      await delay(DELAY_MS);
      const sw1 = resp[resp.length - 2];
      const sw2 = resp[resp.length - 1];
      if (sw1 === 0x90 && sw2 === 0x00) {
        break;
      }
    }
    console.log(`--- PHOTO read complete, size=${photoBuf.length}`);
  }

  return {
    Citizenid: cidText,
    Gender: gender,
    TitleTh: titleTh,
    FirstNameTh: firstNameTh,
    LastNameTh: lastNameTh,
    TitleEng: titleEng,
    FirstNameEng: firstNameEng,
    LastNameEng: lastNameEng,
    Address: addrText,
    BirthdayTh: dobFormattedTh,
    BirthdayEn: dobFormattedEn,
    Age: age,
    PhotoBuffer: photoBuf
  };
}

/* ------------------------------------------
   ฟังก์ชันหลักสำหรับอ่านบัตรประชาชนไทย
   ฟังก์ชันนี้จะเชื่อมต่อกับเครื่องอ่านและรอให้บัตรถูกใส่
-------------------------------------------*/
function readThaiIDCard() {
  return new Promise((resolve, reject) => {
    const pcscInstance = pcsclite();
    pcscInstance.on('reader', (reader) => {
      console.log('พบเครื่องอ่าน:', reader.name);
      reader.on('status', (status) => {
        const changes = reader.state ^ status.state;
        if (!changes) return;
        if ((changes & reader.SCARD_STATE_PRESENT) && (status.state & reader.SCARD_STATE_PRESENT)) {
          console.log('Card inserted');
          reader.connect({ share_mode: reader.SCARD_SHARE_SHARED }, async (err, protocol) => {
            if (err) {
              reject(err);
              return;
            }
            console.log('Protocol:', protocol);
            try {
              const data = await readAllData(reader, protocol);
              console.log('อ่านบัตรสำเร็จ =>', data);
              // บันทึกไฟล์รูปถ้ามี (ถ้าต้องการ)
              if (data.PhotoBuffer && data.PhotoBuffer.length > 0) {
                fs.writeFileSync('photo.jpg', data.PhotoBuffer);
                console.log('บันทึกไฟล์ photo.jpg แล้ว');
              }
              reader.disconnect(reader.SCARD_LEAVE_CARD, (derr) => {
                if (derr) console.error('Disconnect error:', derr.message);
                else console.log('Disconnected');
                pcscInstance.close();
                resolve(data);
              });
            } catch (ex) {
              reject(ex);
            }
          });
        }
      });
      reader.on('end', () => {
        console.log(`เครื่องอ่าน ${reader.name} ถูกถอด`);
      });
      reader.on('error', (err) => {
        console.error(`Error(${reader.name}): ${err.message}`);
      });
    });
    pcscInstance.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = { readThaiIDCard };
