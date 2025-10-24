// config/db.js
const mongoose = require('mongoose');

// ตั้งค่า Mongoose global settings
mongoose.set('bufferCommands', false); // Disable mongoose buffering

async function connectDB() {
  try {
    // ใช้ URI จาก environment variable
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/myAccountingDB';

    // ตั้งค่า connection options ที่เสถียร - ปรับลดเพื่อความเสถียร
    const options = {
      // Timeout Settings - เพิ่มขึ้นเพื่อรองรับ operations ที่ซับซ้อน
      serverSelectionTimeoutMS: 90000, // 90 seconds - เพิ่มขึ้นสำหรับ complex operations
      socketTimeoutMS: 120000, // 120 seconds - เพิ่มขึ้นเพื่อป้องกัน timeout ระหว่าง operation
      connectTimeoutMS: 60000, // 60 seconds for initial connection
      heartbeatFrequencyMS: 20000, // Check connection every 20 seconds (เพิ่มจาก 10)

      // Connection Pool Settings - เพิ่มขนาด pool สำหรับ change streams
      maxPoolSize: 25, // เพิ่มเป็น 25 เพื่อรองรับ change streams (4 streams + regular operations)
      minPoolSize: 5, // เพิ่มเป็น 5 เพื่อเตรียมพร้อมสำหรับ change streams
      maxIdleTimeMS: 60000, // เพิ่มกลับเป็น 60 วินาที เพื่อให้ change streams ทำงานได้นาน
      waitQueueTimeoutMS: 30000, // เพิ่มเป็น 30 วินาที เพื่อลด MongoWaitQueueTimeoutError

      // Network Settings
      family: 4, // Use IPv4, skip trying IPv6 (ปัญหา DNS บางครั้ง)

      // Retry Settings
      retryWrites: true, // Retry write operations
      retryReads: true, // Retry read operations

      // Write Concern
      w: 'majority', // Wait for majority acknowledgment

      // Compression
      compressors: ['zstd', 'zlib', 'snappy'], // Enable compression

      // Buffering
      bufferCommands: false, // Disable mongoose buffering

      // UTF-8 encoding for Thai characters
      useUnifiedTopology: true,
      useNewUrlParser: true,

      // Force UTF-8 encoding
      forceServerObjectId: false,

      // อื่นๆ
      autoIndex: process.env.NODE_ENV !== 'production' // ปิด auto index ใน production
    };

    console.log('🔗 Connecting to MongoDB...');
    console.log('📍 Database URI:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials

    // Force UTF-8 encoding for Thai characters
    mongoose.set('strictQuery', false);

    await mongoose.connect(mongoUri, options);

    console.log('✅ MongoDB connected successfully!');

    // เพิ่ม event listeners สำหรับ connection events
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    mongoose.connection.on('error', (err) => {
      // แยกประเภท error และจัดการแตกต่างกัน
      if (err.message.includes('ECONNRESET') || err.code === 'ECONNRESET') {
        console.warn('⚠️ MongoDB connection reset - this is normal for Atlas connections');
        // ไม่ต้อง log stack trace สำหรับ connection reset
      } else if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
        console.warn('⏰ MongoDB connection timeout - network may be slow');
      } else {
        console.error('❌ MongoDB connection error:', err.message);
      }
      // Don't exit process on connection errors - let auto-reconnect handle it
    });

    mongoose.connection.on('disconnected', () => {
      reconnectAttempts++;
      if (reconnectAttempts <= maxReconnectAttempts) {
        console.warn(`⚠️ MongoDB disconnected! Auto-reconnect attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
      } else {
        console.error(`❌ MongoDB disconnected after ${maxReconnectAttempts} attempts - manual intervention may be needed`);
      }
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully!');
      reconnectAttempts = 0; // Reset counter on successful connection
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected successfully!');
      reconnectAttempts = 0; // Reset counter on successful reconnection
    });

    mongoose.connection.on('close', () => {
      console.log('🔌 MongoDB connection closed');
    });

    // ลด log noise จาก replica set events
    mongoose.connection.on('fullsetup', () => {
      console.log('🔧 MongoDB replica set ready');
    });

    // เพิ่ม graceful handling สำหรับ process signals
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed through app termination');
      } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
      }
    });

  } catch (err) {
    console.error('❌ DB connection error:', err.message);

    // ให้คำแนะนำตามประเภทของ error
    if (err.message.includes('ETIMEOUT') || err.message.includes('timeout')) {
      console.error('💡 Connection Timeout - Check your internet connection and MongoDB Atlas whitelist');
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      console.error('💡 DNS Resolution Error - Check your DNS settings or try different network');
    } else if (err.message.includes('authentication') || err.message.includes('unauthorized')) {
      console.error('💡 Authentication Error - Check your MongoDB credentials');
    }

    console.error('⚠️ Application will exit due to database connection failure');
    process.exit(1);
  }
}

// ฟังก์ชันตรวจสอบสถานะการเชื่อมต่อ
function isConnected() {
  return mongoose.connection.readyState === 1;
}

// ฟังก์ชันรอการเชื่อมต่อ
async function waitForConnection(timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (isConnected()) {
      resolve(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, timeout);

    mongoose.connection.once('connected', () => {
      clearTimeout(timeoutId);
      resolve(true);
    });

    mongoose.connection.once('error', (err) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

module.exports = {
  connectDB,
  isConnected,
  waitForConnection
};
