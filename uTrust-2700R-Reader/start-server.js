const express = require('express');
const cors = require('cors');
const CardReaderService = require('./src/services/card-reader-service');

const app = express();
const PORT = 3999;

// Middleware
app.use(cors());
app.use(express.json());

// สร้าง instance ของ CardReaderService
const readerService = new CardReaderService();

// Event listeners
readerService.on('reader_connected', (readerName) => {
  console.log(`✅ เครื่องอ่านบัตรเชื่อมต่อแล้ว: ${readerName}`);
});

readerService.on('reader_disconnected', (readerName) => {
  console.log(`❌ เครื่องอ่านบัตรถูกถอดออก: ${readerName}`);
});

// API Routes
app.get('/api/status', async (req, res) => {
  try {
    const status = await readerService.checkReader();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/read-card', async (req, res) => {
  try {
    const cardData = await readerService.readCard();
    res.json({
      success: true,
      data: cardData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/cancel-read', async (req, res) => {
  try {
    await readerService.cancelRead();
    res.json({
      success: true,
      message: 'การอ่านบัตรถูกยกเลิก'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// หน้าเว็บทดสอบ
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>uTrust 2700 R Card Reader</title>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #f5f5f5;
        }
        .container { 
          background: white; 
          padding: 30px; 
          border-radius: 10px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { 
          color: #333; 
          text-align: center; 
          margin-bottom: 30px;
        }
        .button { 
          background-color: #007bff; 
          color: white; 
          padding: 12px 24px; 
          border: none; 
          border-radius: 5px; 
          cursor: pointer; 
          font-size: 16px; 
          margin: 10px;
        }
        .button:hover { 
          background-color: #0056b3; 
        }
        .button:disabled { 
          background-color: #ccc; 
          cursor: not-allowed; 
        }
        .result { 
          background-color: #f8f9fa; 
          padding: 20px; 
          border-radius: 5px; 
          margin: 20px 0; 
          border-left: 4px solid #007bff;
        }
        .error { 
          background-color: #f8d7da; 
          color: #721c24; 
          border-left-color: #dc3545;
        }
        .success { 
          background-color: #d4edda; 
          color: #155724; 
          border-left-color: #28a745;
        }
        .status { 
          display: flex; 
          justify-content: space-between; 
          margin: 20px 0;
        }
        .status-item { 
          text-align: center; 
          padding: 10px; 
          background: #e9ecef; 
          border-radius: 5px; 
          flex: 1; 
          margin: 0 5px;
        }
        .card-data { 
          margin: 10px 0; 
          padding: 10px; 
          background: #f8f9fa; 
          border-radius: 5px;
        }
        .card-data strong { 
          color: #495057; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔒 uTrust 2700 R Card Reader</h1>
        
        <div class="status">
          <div class="status-item">
            <strong>สถานะ:</strong>
            <div id="status">กำลังตรวจสอบ...</div>
          </div>
          <div class="status-item">
            <strong>เครื่องอ่านบัตร:</strong>
            <div id="reader">กำลังโหลด...</div>
          </div>
          <div class="status-item">
            <strong>กำลังอ่าน:</strong>
            <div id="reading">ไม่</div>
          </div>
        </div>

        <div style="text-align: center;">
          <button class="button" onclick="checkStatus()">ตรวจสอบสถานะ</button>
          <button class="button" onclick="readCard()" id="readBtn">อ่านบัตร</button>
          <button class="button" onclick="cancelRead()">ยกเลิก</button>
        </div>

        <div id="result"></div>
      </div>

      <script>
        let reading = false;

        function showResult(html, type = 'result') {
          document.getElementById('result').innerHTML = '<div class="result ' + type + '">' + html + '</div>';
        }

        function updateStatus(status) {
          document.getElementById('status').textContent = status.status === 'connected' ? 'เชื่อมต่อ' : 'ไม่เชื่อมต่อ';
          document.getElementById('reader').textContent = status.currentReader || 'ไม่พบ';
          document.getElementById('reading').textContent = status.isReading ? 'ใช่' : 'ไม่';
          reading = status.isReading;
          document.getElementById('readBtn').disabled = reading;
        }

        async function checkStatus() {
          try {
            const response = await fetch('/api/status');
            const result = await response.json();
            
            if (result.success) {
              updateStatus(result.data);
              showResult('สถานะอัพเดทแล้ว', 'success');
            } else {
              showResult('ไม่สามารถตรวจสอบสถานะได้: ' + result.error, 'error');
            }
          } catch (error) {
            showResult('เกิดข้อผิดพลาด: ' + error.message, 'error');
          }
        }

        async function readCard() {
          if (reading) return;
          
          reading = true;
          document.getElementById('readBtn').disabled = true;
          document.getElementById('reading').textContent = 'ใช่';
          
          showResult('กำลังอ่านบัตร... กรุณาใส่บัตรประชาชน', 'result');
          
          try {
            const response = await fetch('/api/read-card');
            const result = await response.json();
            
            if (result.success) {
              const data = result.data;
              let html = '<h3>✅ อ่านบัตรสำเร็จ!</h3>';
              html += '<div class="card-data"><strong>เลขบัตรประชาชน:</strong> ' + data.citizenId + '</div>';
              html += '<div class="card-data"><strong>ชื่อ-นามสกุล (ไทย):</strong> ' + data.fullNameTh + '</div>';
              html += '<div class="card-data"><strong>ชื่อ-นามสกุล (อังกฤษ):</strong> ' + data.fullNameEng + '</div>';
              html += '<div class="card-data"><strong>เพศ:</strong> ' + data.gender + '</div>';
              html += '<div class="card-data"><strong>วันเกิด:</strong> ' + data.birthdayTh + ' (' + data.birthdayEn + ')</div>';
              html += '<div class="card-data"><strong>อายุ:</strong> ' + data.age + ' ปี</div>';
              html += '<div class="card-data"><strong>ที่อยู่:</strong> ' + data.address + '</div>';
              html += '<div class="card-data"><strong>เวลาอ่านบัตร:</strong> ' + data.readTime + '</div>';
              
              showResult(html, 'success');
            } else {
              showResult('ไม่สามารถอ่านบัตรได้: ' + result.error, 'error');
            }
          } catch (error) {
            showResult('เกิดข้อผิดพลาด: ' + error.message, 'error');
          } finally {
            reading = false;
            document.getElementById('readBtn').disabled = false;
            document.getElementById('reading').textContent = 'ไม่';
          }
        }

        async function cancelRead() {
          try {
            const response = await fetch('/api/cancel-read');
            const result = await response.json();
            
            if (result.success) {
              showResult('ยกเลิกการอ่านบัตรแล้ว', 'success');
              reading = false;
              document.getElementById('readBtn').disabled = false;
              document.getElementById('reading').textContent = 'ไม่';
            } else {
              showResult('ไม่สามารถยกเลิกได้: ' + result.error, 'error');
            }
          } catch (error) {
            showResult('เกิดข้อผิดพลาด: ' + error.message, 'error');
          }
        }

        // เรียกใช้ทันทีเมื่อโหลดหน้า
        checkStatus();
        
        // อัพเดทสถานะทุก 5 วินาที
        setInterval(checkStatus, 5000);
      </script>
    </body>
    </html>
  `);
});

// เริ่มเซอร์วิส
app.listen(PORT, () => {
  console.log(`🚀 uTrust 2700 R Card Reader Service running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to test card reading`);
  console.log(`🔗 API Endpoints:`);
  console.log(`   - GET /api/status - ตรวจสอบสถานะ`);
  console.log(`   - GET /api/read-card - อ่านบัตร`);
  console.log(`   - GET /api/cancel-read - ยกเลิก`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await readerService.close();
  process.exit(0);
});