const pcsc = require('pcsclite');
const iconv = require('iconv-lite');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');

class CardReaderService extends EventEmitter {
  constructor() {
    super();
    this.pcsc = pcsc();
    this.readers = new Map();
    this.currentReader = null;
    this.isReading = false;
    this.DELAY_MS = 200;
    this.init();
  }

  init() {
    this.pcsc.on('reader', (reader) => {
      logger.info(`Found reader: ${reader.name}`);
      this.readers.set(reader.name, reader);

      // ถ้าเป็น uTrust 2700 R ให้ตั้งเป็น currentReader
      if (reader.name.includes('uTrust 2700') || reader.name.includes('Identiv')) {
        this.currentReader = reader;
        logger.info(`Set current reader: ${reader.name}`);
        this.emit('reader_connected', reader.name);
      }

      reader.on('end', () => {
        logger.info(`Reader removed: ${reader.name}`);
        this.readers.delete(reader.name);
        if (this.currentReader === reader) {
          this.currentReader = null;
          this.emit('reader_disconnected', reader.name);
        }
      });

      reader.on('error', (err) => {
        logger.error(`Reader error: ${err.message}`);
        this.emit('reader_error', err);
      });
    });

    this.pcsc.on('error', (err) => {
      logger.error(`PCSC error: ${err.message}`);
      this.emit('pcsc_error', err);
    });
  }

  // ฟังก์ชันหน่วงเวลา
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ฟังก์ชันส่งคำสั่ง APDU แบบ Promise
  transmitPromise(reader, protocol, apdu) {
    return new Promise((resolve, reject) => {
      reader.transmit(apdu, 4096, protocol, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
  }

  // สร้างคำสั่ง GET RESPONSE
  apduGetResponse(le) {
    return Buffer.from([0x00, 0xc0, 0x00, 0x00, le]);
  }

  // อ่านฟิลด์ข้อมูลจากบัตร
  async readField(reader, protocol, apdu, decodeText = false, trimResult = false) {
    let resp = await this.transmitPromise(reader, protocol, apdu);

    // ถ้าตอบด้วย SW1=0x61 => GET RESPONSE
    if (resp.length >= 2 && resp[resp.length - 2] === 0x61) {
      const le = resp[resp.length - 1];
      await this.delay(this.DELAY_MS);
      const getResp = await this.transmitPromise(reader, protocol, this.apduGetResponse(le));
      resp = Buffer.concat([
        resp.slice(0, resp.length - 2),
        getResp.slice(0, getResp.length - 2),
      ]);
    }

    // ตัด SW1/SW2 ถ้าเป็น 0x90 0x00
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

  // อ่านข้อมูลจากบัตรจริง
  async readCard() {
    if (!this.currentReader) {
      throw new Error('ไม่พบเครื่องอ่านบัตร');
    }

    if (this.isReading) {
      throw new Error('กำลังอ่านบัตรอยู่');
    }

    this.isReading = true;
    logger.info('Starting card reading...');
    this.emit('reading_started');

    try {
      return await new Promise((resolve, reject) => {
        this.currentReader.connect({ share_mode: this.currentReader.SCARD_SHARE_SHARED }, async (err, protocol) => {
          if (err) {
            reject(new Error(`Connect error: ${err.message}`));
            return;
          }

          try {
            const data = await this.readAllData(this.currentReader, protocol);
            logger.info('อ่านบัตรสำเร็จ', data);
            this.emit('reading_success', data);

            // Disconnect
            this.currentReader.disconnect(this.currentReader.SCARD_LEAVE_CARD, (derr) => {
              if (derr) logger.error('Disconnect error:', derr.message);
              resolve(data);
            });
          } catch (ex) {
            logger.error('Reading error:', ex.message);
            this.emit('reading_error', ex);
            reject(ex);
          }
        });
      });
    } finally {
      this.isReading = false;
      this.emit('reading_finished');
    }
  }

  // อ่านข้อมูลทั้งหมดจากบัตร
  async readAllData(reader, protocol) {
    // SELECT AID
    const APDU_SELECT_AID = Buffer.from([
      0x00, 0xa4, 0x04, 0x00, 0x08,
      0xa0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01,
    ]);

    await this.transmitPromise(reader, protocol, APDU_SELECT_AID);

    // อ่านเลขบัตร
    const apduCID = Buffer.from([0x80, 0xb0, 0x00, 0x04, 0x02, 0x00, 0x0d]);
    const cidText = await this.readField(reader, protocol, apduCID, true, true);

    // อ่านเพศ
    const apduGender = Buffer.from([0x80, 0xb0, 0x00, 0xe1, 0x02, 0x00, 0x01]);
    const genderText = await this.readField(reader, protocol, apduGender, true, true);
    const gender = genderText.startsWith('1') ? 'ชาย' : 'หญิง';

    // อ่านชื่อ-นามสกุล (ภาษาไทย)
    const apduThFull = Buffer.from([0x80, 0xb0, 0x00, 0x11, 0x02, 0x00, 0x64]);
    const thFullText = await this.readField(reader, protocol, apduThFull, true, true);
    const thParts = thFullText.substring(0, 35).split('#');
    const titleTh = thParts[0]?.trim() || '';
    const firstNameTh = thParts[1]?.trim() || '';
    const lastNameTh = thParts[3]?.trim() || '';

    // อ่านชื่อ-นามสกุล (ภาษาอังกฤษ)
    const apduEngFull = Buffer.from([0x80, 0xb0, 0x00, 0x75, 0x02, 0x00, 0x64]);
    const engFullText = await this.readField(reader, protocol, apduEngFull, true, true);
    const engParts = engFullText.substring(0, 35).split('#');
    const titleEng = engParts[0]?.trim() || '';
    const firstNameEng = engParts[1]?.trim() || '';
    const lastNameEng = engParts[3]?.trim() || '';

    // อ่านที่อยู่
    const apduAddr = Buffer.from([0x80, 0xb0, 0x15, 0x79, 0x02, 0x00, 0x64]);
    const addrText = await this.readField(reader, protocol, apduAddr, true, true);

    // อ่านวันเกิด
    const apduDOB = Buffer.from([0x80, 0xb0, 0x00, 0xd9, 0x02, 0x00, 0x08]);
    const dobText = await this.readField(reader, protocol, apduDOB, true, true);
    const yearTh = dobText.substring(0, 4);
    const month = dobText.substring(4, 6);
    const day = dobText.substring(6, 8);
    const yearEn = parseInt(yearTh, 10) - 543;
    const dobFormattedTh = `${day}/${month}/${yearTh}`;
    const dobFormattedEn = `${day}/${month}/${yearEn}`;

    // คำนวณอายุ
    const dobDate = new Date(yearEn, parseInt(month, 10) - 1, parseInt(day, 10));
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const mDiff = today.getMonth() - dobDate.getMonth();
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }

    return {
      citizenId: cidText,
      gender: gender,
      titleTh: titleTh,
      firstNameTh: firstNameTh,
      lastNameTh: lastNameTh,
      titleEng: titleEng,
      firstNameEng: firstNameEng,
      lastNameEng: lastNameEng,
      address: addrText,
      birthdayTh: dobFormattedTh,
      birthdayEn: dobFormattedEn,
      age: age,
      fullNameTh: `${titleTh}${firstNameTh} ${lastNameTh}`.trim(),
      fullNameEng: `${titleEng}${firstNameEng} ${lastNameEng}`.trim(),
      readTime: new Date().toISOString()
    };
  }

  // ตรวจสอบเครื่องอ่านบัตร
  async checkReader() {
    const readers = Array.from(this.readers.keys());
    return {
      availableReaders: readers,
      currentReader: this.currentReader ? this.currentReader.name : null,
      isReading: this.isReading,
      status: this.currentReader ? 'connected' : 'disconnected'
    };
  }

  // ยกเลิกการอ่านบัตร
  async cancelRead() {
    if (this.isReading) {
      this.isReading = false;
      logger.info('Card reading cancelled');
      this.emit('reading_cancelled');
    }
  }

  // ปิด service
  async close() {
    this.pcsc.close();
    this.readers.clear();
    this.currentReader = null;
    logger.info('Card reader service closed');
  }
}

module.exports = CardReaderService;