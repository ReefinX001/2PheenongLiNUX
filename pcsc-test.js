// pcsc-test.js
const pcsclite = require('pcsclite');
const pcsc = pcsclite();

pcsc.on('reader', (reader) => {
  console.log(`พบเครื่องอ่าน: ${reader.name}`);

  // เมื่อ Reader มีสถานะเปลี่ยน
  reader.on('status', (status) => {
    const changes = reader.state ^ status.state;
    if (!changes) return;

    // มีการสอดบัตร
    if ((changes & reader.SCARD_STATE_PRESENT) && (status.state & reader.SCARD_STATE_PRESENT)) {
      console.log('มีบัตรถูกสอดเข้ามา');
      reader.connect({ share_mode: reader.SCARD_SHARE_SHARED }, (err, protocol) => {
        if (err) {
          console.error('เชื่อมต่อบัตรไม่สำเร็จ:', err.message);
          return;
        }
        console.log(`Protocol: ${protocol}`);

        // ตัวอย่าง APDU (สุ่ม ๆ) - ถ้าต้องการอ่านบัตรประชาชนไทย ต้องมี APDU เฉพาะ
        const APDU_EXAMPLE = Buffer.from([0x00, 0xA4, 0x04, 0x00, 0x07, 0xA0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x00]);

        reader.transmit(APDU_EXAMPLE, 256, protocol, (err, data) => {
          if (err) {
            console.error('Transmit error:', err.message);
          } else {
            console.log('รับข้อมูล:', data.toString('hex'));
          }

          // จบการใช้งาน - disconnect
          reader.disconnect(reader.SCARD_LEAVE_CARD, (err) => {
            if (err) {
              console.error('Disconnect error:', err.message);
            } else {
              console.log('Disconnect สำเร็จ');
            }
          });
        });
      });
    }

    // มีการดึงบัตรออก
    if ((changes & reader.SCARD_STATE_EMPTY) && (status.state & reader.SCARD_STATE_EMPTY)) {
      console.log('มีการดึงบัตรออก');
    }
  });

  // เมื่อ reader ถูกถอดหรือปิด
  reader.on('end', () => {
    console.log(`เครื่องอ่าน ${reader.name} ถูกถอด`);
  });

  reader.on('error', (err) => {
    console.error(`Error(${reader.name}): ${err.message}`);
  });
});

pcsc.on('error', (err) => {
  console.error('PCSC error:', err.message);
});
