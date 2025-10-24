const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

// ข้อมูลจากไฟล์ .env
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URL || 'https://developers.google.com/oauthplayground';

// สร้าง OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// สิทธิ์ที่ต้องการ
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://mail.google.com/'
];

async function getRefreshToken() {
  try {
    console.log('🔧 กำลังตั้งค่า Gmail API สำหรับส่งอีเมล...\n');

    // สร้าง authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });

    console.log('📋 ขั้นตอนการตั้งค่า:');
    console.log('1. เปิด URL นี้ในเบราว์เซอร์:');
    console.log('   ' + authUrl);
    console.log('');
    console.log('2. ล็อกอินด้วย Gmail ที่ต้องการใช้ส่งอีเมล');
    console.log('3. อนุญาติให้แอปพลิเคชันเข้าถึง Gmail');
    console.log('4. คัดลอก authorization code ที่ได้มา');
    console.log('');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('กรุณาใส่ authorization code: ', async (code) => {
      try {
        const { tokens } = await oauth2Client.getToken(code);

        console.log('\n✅ สำเร็จ! ได้รับ refresh token แล้ว');
        console.log('');
        console.log('📝 เพิ่มข้อมูลเหล่านี้ลงในไฟล์ .env:');
        console.log('');
        console.log('# Gmail API Configuration');
        console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
        console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
        console.log(`GMAIL_REDIRECT_URI=${REDIRECT_URI}`);
        console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('GMAIL_USER=your-email@gmail.com');
        console.log('');
        console.log('# Company Information');
        console.log('COMPANY_NAME=Your Company Name');
        console.log('COMPANY_PHONE=02-xxx-xxxx');
        console.log('COMPANY_EMAIL=your-email@gmail.com');
        console.log('');
        console.log('⚠️ อย่าลืมเปลี่ยน GMAIL_USER เป็นอีเมลของคุณ!');

      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
      }

      rl.close();
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

// เรียกใช้ function
getRefreshToken();