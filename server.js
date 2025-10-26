// File: server.js

// Fix Node.js UTF-8 encoding for Thai characters using iconv-lite
const iconv = require('iconv-lite');

// Configure iconv-lite for Windows Thai encoding support
iconv.skipDecodeWarning = true;

// Force UTF-8 encoding for Thai characters
process.env.LANG = 'th_TH.UTF-8';
process.env.LC_ALL = 'th_TH.UTF-8';

// Configure console output for Thai characters on Windows
if (process.platform === 'win32') {
  // Set console to use UTF-8 encoding
  process.stdout.setDefaultEncoding && process.stdout.setDefaultEncoding('utf8');
  process.stderr.setDefaultEncoding && process.stderr.setDefaultEncoding('utf8');

  // Override console.log to properly handle Thai characters
  const originalLog = console.log;
  console.log = function(...args) {
    const processedArgs = args.map(arg => {
      if (typeof arg === 'string') {
        // Ensure proper UTF-8 encoding for Thai characters
        const buffer = Buffer.from(arg, 'utf8');
        return iconv.decode(buffer, 'utf8');
      }
      return arg;
    });
    originalLog.apply(console, processedArgs);
  };
}

const express = require('express');
const cors = require('cors'); // ← เพิ่มบรรทัดนี้
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer'); // เพิ่ม multer สำหรับ file upload
const mongoose = require('mongoose'); // เพิ่ม mongoose สำหรับ connection management
// Port for server (ใช้ 3001 สำหรับ dev เพื่อไม่ชนกับ production)
const PORT = process.env.PORT || 3000;
const { connectDB } = require('./config/db');
const xss = require('xss-clean'); // นำเข้า xss-clean
const sanitizeHtml = require('sanitize-html'); // นำเข้า sanitize-html
require('dotenv').config();

// แยก view routes ไปที่ไฟล์ routes/viewRoutes.js
const viewRoutes = require('./routes/viewRoutes');

// Health check routes
const healthRoutes = require('./routes/healthRoutes');

// Employee App Routes
const employeeAuthRoutes = require('./routes/employeeAuthRoutes');

// เพิ่มระบบบริการหลังการขาย - ใช้ข้อมูลจริง
const serviceRoutes = require('./routes/serviceRoutes');
const cashSaleRoutes = require('./routes/cashSaleRoutes');
const installmentOrderRoutes = require('./routes/installmentOrderRoutes');

// เพิ่มระบบสะสมแต้ม
const pointsRoutes = require('./routes/pointsRoutes');

// เพิ่มระบบชำระค่างวดผ่อน
const installmentPaymentRoutes = require('./routes/installmentPaymentRoutes');
const stockReservationRoutes = require('./routes/stockReservationRoutes');
const creditNoteRoutes = require('./routes/creditNoteRoutes');

// เพิ่ม Loan Integration Routes
const loanIntegrationRoutes = require('./routes/loan/loanIntegrationRoutes');
const loanRoutes = require('./routes/loanRoutes');

// Logging: นำเข้า Morgan และ Winston logger
const morgan = require('morgan');
const logger = require('./logger'); // logger.js ที่ตั้งค่าไว้ด้วย Winston

// เพิ่ม Helmet สำหรับ Security Headers
const helmet = require('helmet');

// Import security configuration
const securityConfig = require('./config/security');

// เพิ่ม Rate Limit
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: securityConfig.rateLimiting.windowMs || 15 * 60 * 1000, // 15 นาที
  max: securityConfig.rateLimiting.maxRequests || 100, // จำกัด requests ต่อ IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Login rate limiter (more strict)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: securityConfig.rateLimiting.loginAttempts.maxAttempts || 5,
  message: 'Too many login attempts from this IP, please try again later.',
  skipSuccessfulRequests: true,
});

// เพิ่ม Compression
const compression = require('compression');

// เพิ่ม Cookie Parser (ถ้าต้องการใช้ cookie)
const cookieParser = require('cookie-parser');

// เพิ่ม Session Middleware
const session = require('express-session');

// เพิ่ม Redis Store (แก้ไข import issue)
let RedisStore;
try {
  const connectRedis = require('connect-redis');
  RedisStore = connectRedis.RedisStore; // ใช้ .RedisStore แทน .default
  console.log('✅ RedisStore loaded successfully');
} catch (err) {
  console.warn('⚠️ connect-redis not available:', err.message);
}

// เพิ่ม Redis (ioredis) (ถ้าใช้งาน Redis) - แก้ไขการจัดการ error
const Redis = require('ioredis');

let redis = null;
const isProd = process.env.NODE_ENV === 'production';

// เฉพาะเมื่อมี REDIS_URL ใน environment variables
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    // tls: {}, // ปิด TLS ไปก่อน เพราะใช้ redis:// แทน rediss://
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    lazyConnect: false, // ต่อทันทีตอนสร้าง client
  });

  // จัดการ error events
  redis.on('error', (err) => {
    console.warn('⚠️ Redis connection error (non-critical):', err.message);
  });

  redis.on('ready', () => {
    console.log('✅ Redis ready and connected successfully');
  });

  redis.on('connect', () => {
    console.log('🔗 Redis connection established');
  });

  redis.on('disconnect', () => {
    console.log('🔄 Redis disconnected');
  });

  // ทดสอบการเชื่อมต่อ Redis ด้วย async IIFE
  (async () => {
    try {
      await redis.connect();
      await redis.set('test_key', 'test_value', 'EX', 60);
      const val = await redis.get('test_key');
      console.log('✅ Redis test successful:', val);
    } catch (err) {
      console.warn(
        '⚠️ Redis not available (running without Redis):',
        err.message
      );
      redis = null; // ตั้งค่า redis เป็น null หากไม่สามารถเชื่อมต่อได้
    }
  })();
} else {
  console.log(
    '📋 Redis not configured (REDIS_URL not found), running without Redis'
  );
}

// โหลดโมเดล/ไฟล์อื่น ๆ (ถ้ามี)
require('./models/HR/Category');
require('./models/POS/BranchStock');
require('./models/POS/BranchStockHistory');
// New Payroll System Models
require('./models/HR/BasicEmployee');
require('./models/HR/MonthlyPayroll');
require('./models/HR/Bonus');

// Global Error Handler
const { errorHandler } = require('./middlewares/errorHandler');

// Middlewares
const apiMiddlewares = require('./middlewares/api'); // รวม rate-limit, body-parser ฯลฯ
const authJWT = require('./middlewares/authJWT'); // ตรวจสอบ JWT
const authMiddleware = require('./middlewares/authMiddleware'); // ตรวจสอบ token แบบง่าย (ถ้ามี)
const hasPermission = require('./middlewares/permission'); // ตรวจสอบ permission จาก req.user

// Routes อื่นๆ (ตัวอย่าง)
const cardRoutes = require('./routes/cardRoutes');
const cardReaderRoutes = require('./routes/cardReaderRoutes');
const posRoutes = require('./routes/posRoutes');
const homeRoutes = require('./routes/homeRoutes');
const accountingRoutes = require('./routes/AccountingRoutes');
const assetRoutes = require('./routes/assetRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const commissionRoutes = require('./routes/commissionRoutes');
const employeeSalaryRoutes = require('./routes/employeeSalaryRoutes');
const contactsRoutes = require('./routes/contactsRoutes');

// HR Routes
const hrEmployeesRoutes = require('./routes/hr/employeesRoutes');
const hrSalaryRoutes = require('./routes/hr/salaryRoutes');
const hrAttendanceRoutes = require('./routes/hr/attendanceRoutes');
const hrLeaveRoutes = require('./routes/hr/leaveRoutes');
const hrLeavePolicyRoutes = require('./routes/hr/leavePolicyRoutes');
const hrAnnouncementRoutes = require('./routes/hr/announcementRoutes');
const hrCommissionRoutes = require('./routes/hr/commissionRoutes');
const hrBonusRoutes = require('./routes/hr/bonusRoutes');
const hrWorkScheduleRoutes = require('./routes/hr/workScheduleRoutes');
const hrOvertimeRoutes = require('./routes/hr/overtimeRoutes');
const basicEmployeeRoutes = require('./routes/hr/basicEmployeeRoutes');
const monthlyPayrollRoutes = require('./routes/hr/monthlyPayrollRoutes');
const bonusRoutes = require('./routes/bonusRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const pdfInstallmentRoutes = require('./routes/pdfInstallmentRoutes');

// Tax Invoice and Receipt Routes (New TaxInvoice/Receipt Models)
const newTaxInvoiceRoutes = require('./routes/api/taxinvoice');
const newReceiptRoutes = require('./routes/api/receipt');
// Legacy routes (keeping for backward compatibility)
const taxInvoiceRoutes = require('./routes/taxInvoice');
const receiptRoutes = require('./routes/receipt');
const receiptPdfRoutes = require('./routes/receiptPdfRoutes');
const receiptValidationRoutes = require('./routes/receiptValidationRoutes');

// Document Number Generation Routes
const documentNumberRoutes = require('./routes/documentNumberRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
// const billingInvoiceRoutes = require("./routes/billingInvoiceRoutes"); // ลบแล้ว - ไม่ใช่ส่วนหนึ่งของ main flow
const billingCorrectionRoutes = require('./routes/billingCorrectionRoutes');
const billingLogRoutes = require('./routes/billingLogRoutes');

// Deposit Receipt and Credit Note Routes
// const depositReceiptRoutes = require("./routes/depositReceipt"); // File doesn't exist - use depositReceiptRoutes instead
// const creditNoteRoutes = require("./routes/creditNote"); // File doesn't exist - use POS/creditNoteRoutes instead
const branchRoutes = require('./routes/branchRoutes');
// const periodicFifoRoutes = require('./routes/periodicFifoRoutes'); // File doesn't exist
const leaveRoutes = require('./routes/leaveRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const setupCronJobs = require('./cron');
const bankAccountsRouter = require('./routes/bankAccounts');
// const billingInvoicesRouter = require("./routes/billingInvoices"); // ลบแล้ว - ซ้ำกับ billingInvoiceRoutes
const transferRoutes = require('./routes/transfer');
const installmentCustomersRoutes = require('./routes/installmentCustomers'); // Enabled for comprehensive customer integration
const notificationsRouter = require('./routes/notifications');
const eventRoutes = require('./routes/eventRoutes');
const apiRoutes = require('./routes/api');
const expenseRt = require('./routes/Acc/expenseRoutes');
const qrSignatureRoutes = require('./routes/api/qr-signature');
const servicesRoutes = require('./routes/services'); // New services API routes
const posCreditNoteRoutes = require('./routes/POS/creditNoteRoutes');
const receiptVoucherRoutes = require('./routes/POS/receiptVoucherRoutes');
const quickSaleRoutes = require('./routes/POS/quickSaleRoutes');
const posPaymentVoucherRoutes = require('./routes/POS/paymentVoucherRoutes');
const backdatedPORoutes = require('./routes/backdatedPORoutes');
const promotionRoutes = require('./routes/marketing/promotionRoutes');
const financePartnerRoutes = require('./routes/MKT/financePartnerRoutes');
const payoffApprovalRoutes = require('./routes/payoffApprovalRoutes');
// const accountsRoute = require('./routes/accounting/accountsRoute'); // File doesn't exist
const auditRoutes = require('./routes/system/auditRoutes');
const authRoutes = require('./routes/system/authRoutes');
const configRoutes = require('./routes/system/configRoutes');
const maintenanceRoutes = require('./routes/system/maintenanceRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const onlineUsersRoutes = require('./routes/system/onlineUsersRoutes');
// const viewRoutes = require('./routes/viewRoutes'); // Already declared on line 14

// Activity tracker middleware
const activityTracker = require('./middlewares/activityTracker');

// ===== สำคัญ: เส้นทางสำหรับสต๊อก =====
const branchStockRoutes = require('./routes/branchStockRoutes');
const branchStockHistoryRoutes = require('./routes/branchStockHistoryRoutes');
const boxsetRoutes = require('./routes/POS/boxsetRoutes');
const branchSupplierRoutes = require('./routes/branchSupplierRoutes');
const branchTransferRoutes = require('./routes/branchTransferRoutes');
const leaveQuotaRoutes = require('./routes/leaveQuotaRoutes');

const contractRoutes = require('./routes/contractRoutes');
const contractAdjustmentRoutes = require('./routes/contractAdjustmentRoutes');
const contractAttachmentRoutes = require('./routes/contractAttachmentRoutes');
const contractNotificationRoutes = require('./routes/contractNotificationRoutes');
const contractOverdueNotificationRoutes = require('./routes/contractOverdueNotificationRoutes');
const contractPaymentLogRoutes = require('./routes/contractPaymentLogRoutes');
const uploadSignatureRoutes = require('./routes/uploadSignature');

const customerRoutes = require('./routes/Customers/customerRoutes');
// const unifiedCustomerRoutes = require("./routes/unifiedCustomerRoutes"); // ไม่ใช้ UnifiedCustomer แล้ว
// const customerLogRoutes = require('./routes/customerLogRoutes'); // File doesn't exist
// const customerPointRoutes = require('./routes/customerPointRoutes'); // File doesn't exist
// const customerPointsTransactionRoutes = require('./routes/customerPointsTransactionRoutes'); // File doesn't exist
// const customerPreferenceRoutes = require('./routes/customerPreferenceRoutes'); // File doesn't exist
// const customerReportRoutes = require('./routes/customerReportRoutes'); // File doesn't exist
const fulfillmentRoutes = require('./routes/fulfillmentRoutes');
// console.log('🔍 Loading installmentRoutes...'); // ลบแล้ว
const installmentRoutes = require('./routes/installmentRoutes'); // ✅ เพิ่มกลับมาสำหรับระบบผ่อนชำระ
const purchaseNotesRoutes = require('./routes/purchaseNotesRoutes'); // ✅ Purchase notes management
// console.log('✅ installmentRoutes loaded:', typeof installmentRoutes); // ลบแล้ว
const invoiceRoutes = require('./routes/invoiceRoutes');
const orderRoutes = require('./routes/orderRoutes');
const orderItemRoutes = require('./routes/orderItemRoutes');
const orderLogRoutes = require('./routes/orderLogRoutes');
const paymentLogRoutes = require('./routes/paymentLogRoutes');
const paymentMethodRoutes = require('./routes/paymentMethodRoutes');
const paymentTransactionRoutes = require('./routes/paymentTransactionRoutes');
const productAttributeRoutes = require('./routes/productAttributeRoutes');
const productCategoryRoutes = require('./routes/productCategoryRoutes');
const productImageRoutes = require('./routes/productImageRoutes');
const productReviewRoutes = require('./routes/productReviewRoutes');
const productVariantRoutes = require('./routes/productVariantRoutes');
// const refundRoutes = require('./routes/refundRoutes'); // File doesn't exist
const saleRoutes = require('./routes/saleRoutes');
const salesReportRoutes = require('./routes/salesReportRoutes');
const salesDashboardRoutes = require('./routes/salesDashboardRoutes');
// const settingLogRoutes = require('./routes/settingLogRoutes'); // File doesn't exist
// const settingPaymentRoutes = require('./routes/settingPaymentRoutes'); // File doesn't exist
// const settingSystemRoutes = require('./routes/settingSystemRoutes'); // File doesn't exist
const stockRoutes = require('./routes/stockRoutes');
const stockAuditRoutes = require('./routes/stockAuditRoutes');
const stockHistoryRoutes = require('./routes/stockHistoryRoutes');
const stockReportRoutes = require('./routes/stockReportRoutes');
const stockUnitRoutes = require('./routes/stockUnitRoutes');
const stockValuationRoutes = require('./routes/stockValuationRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const supplierMappingRoutes = require('./routes/supplierMappingRoutes');
const userRoutes = require('./routes/userRoutes');
// const userAuditLogRoutes = require('./routes/userAuditLogRoutes'); // File doesn't exist
// const userLogRoutes = require('./routes/userLogRoutes'); // File doesn't exist
// const userPermissionRoutes = require('./routes/userPermissionRoutes'); // File doesn't exist
const userRoleRoutes = require('./routes/userRoleRoutes');
// const userRolePermissionRoutes = require('./routes/userRolePermissionRoutes'); // File doesn't exist
const chartOfAccountsRoutes = require('./routes/chartOfAccountsRoutes');
const journalRoutes = require('./routes/journalRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const otherIncomeRoutes = require('./routes/otherIncomeRoutes');
// newReceiptRoutes และ newTaxInvoiceRoutes ได้ประกาศไว้แล้วข้างบน (บรรทัด 118-119)
// === ENHANCED PDF ROUTES FOR STEP1-4 DATA ===
// enhancedPdfRoutes removed - not used in frontend

const quotationController = require('./controllers/quotationController');
const quotationApiRoutes = require('./routes/api/quotation');
const depositReceiptApiRoutes = require('./routes/depositReceiptRoutes');
const depositReceiptPdfRoutes = require('./routes/depositReceiptPdfRoutes');
const goodsReceiptRoutes = require('./routes/goodsReceiptRoutes');
const badDebtRoutes = require('./routes/badDebtRoutes');
const productRoutes = require('./routes/productRoutes');
const receiptsRoutes = require('./routes/receipts');
const combinedReceiptsRoutes = require('./routes/combinedReceiptsRoutes');
// Loan system routes
const loanDashboardRoutes = require('./routes/loanDashboardRoutes');
const claimItemsRoutes = require('./routes/claimItemsRoutes');
const costsExpensesRoutes = require('./routes/costsExpensesRoutes');
const creditApprovalRoutes = require('./routes/creditApprovalRoutes');
// const receiptInstallmentRoutes = require("./routes/receipt_installment"); // ลบแล้ว - ไม่ใช่ main flow
const categoryGroupRoutes = require('./routes/categoryGroupRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const uploadDocuments = require('./routes/uploadDocuments');
const reviewRoutes = require('./routes/reviewRoutes');
const performanceReviewsRouter = require('./routes/performanceReviews');
const attendanceRoutes = require('./routes/attendanceRoutes');
const iOSAttendanceRoutes = require('./routes/hr/iOSAttendanceRoutes');
const employeesRoutes = require('./routes/employeesRoutes');
// const userBranchRoutes = require('./routes/userBranchRoutes'); // File doesn't exist
const newsRoutes = require('./routes/newsRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const commentRoutes = require('./routes/commentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const emailRoutes = require('./routes/emailRoutes');
const enhancedEmailRoutes = require('./routes/enhancedEmailRoutes'); // Enhanced email with correct PDF controllers
const documentGenerationRoutes = require('./routes/documentGenerationRoutes'); // Document generation for installment system
// const costsExpensesRoutes = require("./routes/costsExpensesRoutes"); // Duplicate - already declared at line 280
const provinceRoutes = require('./routes/provinceRoutes');
const printerRoutes = require('./routes/printerRoutes');
const addressRoutes = require('./routes/addressRoutes');
const deliveryNoteRoutes = require('./routes/api/delivery-note'); // ใช้ API ใหม่สำหรับใบส่งของ

// New additional routes for comprehensive API coverage
const taxRoutes = require('./routes/taxRoutes');
// const claimItemsRoutes = require("./routes/claimItemsRoutes"); // Duplicate - already declared at line 279
// const creditApprovalRoutes = require("./routes/creditApprovalRoutes"); // Duplicate - already declared at line 281

// FrontStore Management Routes
const frontStoreCategoryRoutes = require('./routes/FrontStore/categoryRoutes');
const frontStorePromotionRoutes = require('./routes/FrontStore/promotionRoutes');
const frontStoreProductRoutes = require('./routes/FrontStore/productRoutes');
const frontStoreVideoRoutes = require('./routes/FrontStore/videoRoutes');
const frontStoreContactLocationRoutes = require('./routes/FrontStore/contactLocationRoutes');
const frontStoreJobRoutes = require('./routes/FrontStore/jobRoutes');

// TikTok OAuth Routes
const tiktokAuthRoutes = require('./routes/api/tiktokAuth');

// Image Proxy Route
const imageProxyRoutes = require('./routes/imageProxy');

// ** Route FIFO สำคัญ **
// const fifoRoutes = require('./routes/fifo'); // File doesn't exist

// Use unified sync service instead of separate services to prevent connection pool exhaustion
const { startUnifiedSync } = require('./services/unifiedSync');

const inventoryRoutes = require('./routes/inventoryRoutes');

const app = express();

// ตั้ง CORS ทันที หลังสร้าง app แต่ก่อน middleware/route ตัวอื่นใด
app.use(
  cors({
    origin: [
      'https://api.2pheenong.com',
      'https://www.2pheenong.com',
      'http://localhost:3000',
      'http://100.68.196.106:3999', // Card Reader สาขา 00007 (Khok Pho)
      'http://100.92.113.92:3000',
      'https://100.68.196.106:3999', // Card Reader สาขา 00007 (Khok Pho) HTTPS
      'http://100.78.250.73:3999', // ✅ Card Reader สาขาโดย อุไร ร่าหมาน (HTTP)
      'https://100.78.250.73:3999', // ✅ Card Reader สาขาโดย อุไร ร่าหมาน (HTTPS)
    ],
  })
);

// ถัดไปค่อยเป็น server, io, xss, helmet, etc.
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});
app.set('io', io);

// ใช้ xss-clean เป็น middleware เพื่อ sanitize input
app.use(xss());
app.set('trust proxy', 1);

// ปิดการส่ง Header X-Powered-By เพื่อลดการเปิดเผยว่าใช้ Express
app.disable('x-powered-by');

/* 1) เชื่อมต่อฐานข้อมูลและเริ่มระบบ */
async function boot() {
  try {
    // เชื่อมต่อ MongoDB
    await connectDB();

    // ตรวจสอบ Redis connection (ถ้ามี)
    if (redis) {
      await redis.ping();
      console.log('✅ Redis connection verified');
    }

    // เริ่ม cron jobs
    setupCronJobs();

    // เริ่มระบบ Auto Creation สำหรับใบสำคัญรับเงิน
    const autoCreationService = require('./services/autoCreationService');
    autoCreationService.start();

    // Unified sync is already started above, no need for separate call

    console.log('🎯 All systems initialized successfully');
  } catch (error) {
    console.error('❌ Boot process failed:', error);
    process.exit(1);
  }
}

// เริ่มระบบ
boot();

/*
   2) Configure CORS - อนุญาตให้ทุก origin เข้าถึง API
*/
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    // Allow all origins for now (you can restrict this later)
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

/*
   3) ใช้ express.json() และ express.urlencoded()
   โดยเพิ่ม limit เพื่อรองรับไฟล์ใหญ่ (เช่น 50MB)
*/
// Configure Express to handle UTF-8 encoding properly
app.use(express.json({
  limit: '100mb',
  type: 'application/json',
  reviver: (key, value) => {
    // Handle Thai characters properly
    if (typeof value === 'string' && /[\u0E00-\u0E7F]/.test(value)) {
      console.log('🔍 [THAI DEBUG] Processing Thai text:', value);
      return value; // Keep as UTF-8
    }
    return value;
  }
}));

app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Add middleware to debug parsed body for Thai characters
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const checkThaiInObject = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof value === 'string' && /[\u0E00-\u0E7F]/.test(value)) {
          console.log(`🇹🇭 Thai text at ${currentPath}:`, value);
          console.log(`🔍 Character codes:`, value.split('').map(c => c.charCodeAt(0)));
        } else if (typeof value === 'object' && value !== null) {
          checkThaiInObject(value, currentPath);
        }
      }
    };
    checkThaiInObject(req.body);
  }
  next();
});

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('กรุณาอัปโหลดไฟล์รูปภาพหรือวิดีโอเท่านั้น'));
    }
  }
});

// Make upload middleware available globally
app.locals.upload = upload;

// ใช้ express-mongo-sanitize เพื่อลบ operator injection
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize({ replaceWith: '_' }));

// Middleware สำหรับ sanitize input ด้วย sanitize-html
function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj, {
      allowedTags: [],
      allowedAttributes: {},
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
  }
  return obj;
}

app.use((req, res, next) => {
  // Skip sanitization for image proxy to preserve URL parameters
  if (req.path.startsWith('/api/image-proxy')) {
    return next();
  }

  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
});

// Enhanced security headers configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        // อนุญาต external <script> และ inline scripts
        'script-src-elem': [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.tailwindcss.com',
          'https://cdn.jsdelivr.net',
          'https://cdn.socket.io',
          'https://cdnjs.cloudflare.com',
          'https://cdn.sheetjs.com',
          'https://code.jquery.com',
          'https://maxcdn.bootstrapcdn.com',
          'https://cdn.datatables.net',
          'https://unpkg.com',
          'https://maps.googleapis.com', // ← เพิ่ม Google Maps API
          'https://maps.gstatic.com', // ← เพิ่ม Maps GStatic
          'https://www.gstatic.com', // ← เพิ่ม Firebase CDN
          'https://www.googleapis.com', // ← เพิ่ม Firebase APIs
          'https://*.googleapis.com', // ← เพิ่ม Firebase subdomain APIs
          'https://*.firebaseio.com', // ← เพิ่ม Firebase Realtime Database
          'https://*.firebasedatabase.app', // ← เพิ่ม Firebase Realtime Database
        ],
        'script-src': [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://maps.googleapis.com', // ← เพิ่ม Google Maps API
          'https://maps.gstatic.com', // ← เพิ่ม Maps GStatic
          'https://www.gstatic.com', // ← เพิ่ม Firebase CDN
          'https://www.googleapis.com', // ← เพิ่ม Firebase APIs
          'https://*.googleapis.com', // ← เพิ่ม Firebase subdomain APIs
          'https://*.firebaseio.com', // ← เพิ่ม Firebase Realtime Database
          'https://*.firebasedatabase.app', // ← เพิ่ม Firebase Realtime Database
        ],
        'script-src-attr': ["'self'", "'unsafe-inline'"],

        // AJAX / WebSocket
        'connect-src': [
          "'self'",
          'data:',
          'https://cdn.socket.io',
          'wss://cdn.socket.io',
          'https://www.gstatic.com', // ← เพิ่ม Firebase CDN สำหรับ source maps
          'https://www.2pheenong.com', // ← ใช้โดเมนหลักแทน localhost
          'wss://www.2pheenong.com', // ← ใช้ WebSocket Secure แทน localhost
          'https://www.2pheenong.com/socket.io/*', // ✅ Production Socket.IO endpoint
          'wss://www.2pheenong.com/socket.io/*', // ✅ Production Socket.IO WebSocket endpoint
          'https://api.2pheenong.com/socket.io/*', // ✅ API Socket.IO endpoint
          'wss://api.2pheenong.com/socket.io/*', // ✅ API Socket.IO WebSocket endpoint
          'http://localhost:3000', // ✅ Local Server for Socket.IO
          'ws://localhost:3000', // ✅ Local Server WebSocket
          'wss://localhost:3000', // ✅ Local Server WebSocket Secure
          'http://localhost:3000/socket.io/*', // ✅ Socket.IO specific endpoint
          'ws://localhost:3000/socket.io/*', // ✅ Socket.IO WebSocket endpoint
          'http://localhost:3999',
          'http://localhost:4000',
          'http://localhost:8080', // ✅ Card Reader WebSocket Server (HTTP)
          'ws://localhost:8080', // ✅ Card Reader WebSocket Server (WebSocket)
          'wss://localhost:8080', // ✅ Card Reader WebSocket Server (WebSocket Secure)

          'http://100.92.184.115:4001', // ✅ Tailscale Printer Server (HTTP) - เก่า
          'https://100.92.184.115:4001', // ✅ Tailscale Printer Server (HTTPS) - เก่า
          'ws://100.92.184.115:4001', // ✅ ZK9500 WebSocket (HTTP) - เก่า
          'wss://100.92.184.115:4001', // ✅ ZK9500 WebSocket (HTTPS) - เก่า
          'http://100.106.108.57:4001', // ✅ Tailscale Printer Server (HTTP) - ใหม่
          'https://100.106.108.57:4001', // ✅ Tailscale Printer Server (HTTPS) - ใหม่
          'ws://100.106.108.57:4001', // ✅ ZK9500 WebSocket (HTTP) - ใหม่
          'wss://100.106.108.57:4001', // ✅ ZK9500 WebSocket (HTTPS) - ใหม่
          'http://100.110.180.13:*', // ✅ Tailscale Cloud Server (all ports)
          'https://100.110.180.13:*', // ✅ Tailscale Cloud Server HTTPS (all ports)
          'ws://100.110.180.13:*', // ✅ Tailscale Cloud Server WebSocket (all ports)
          'wss://100.110.180.13:*', // ✅ Tailscale Cloud Server WebSocket HTTPS (all ports)
          'http://100.92.184.115:*', // ✅ Tailscale Printer Server (all ports) - เก่า
          'https://100.92.184.115:*', // ✅ Tailscale Printer Server HTTPS (all ports) - เก่า
          'ws://100.92.184.115:*', // ✅ ZK9500 WebSocket (all ports) - เก่า
          'wss://100.92.184.115:*', // ✅ ZK9500 WebSocket HTTPS (all ports) - เก่า
          'http://100.106.108.57:*', // ✅ Tailscale Printer Server (all ports) - ใหม่
          'https://100.106.108.57:*', // ✅ Tailscale Printer Server HTTPS (all ports) - ใหม่
          'ws://100.106.108.57:*', // ✅ ZK9500 WebSocket (all ports) - ใหม่
          'wss://100.106.108.57:*', // ✅ ZK9500 WebSocket HTTPS (all ports) - ใหม่
          'http://100.90.200.114:*', // ✅ Card Reader Multi-IP Support (all ports) - NEW
          'https://100.90.200.114:*', // ✅ Card Reader Multi-IP Support HTTPS (all ports) - NEW
          'ws://100.90.200.114:*', // ✅ Card Reader Multi-IP WebSocket (all ports) - NEW
          'wss://100.90.200.114:*', // ✅ Card Reader Multi-IP WebSocket HTTPS (all ports) - NEW
          'http://100.68.196.106:*', // ✅ Card Reader สาขา 00007 (Khok Pho) - ALL PORTS
          'https://100.68.196.106:*', // ✅ Card Reader สาขา 00007 (Khok Pho) HTTPS - ALL PORTS
          'ws://100.68.196.106:*', // ✅ Card Reader สาขา 00007 (Khok Pho) WebSocket - ALL PORTS
          'wss://100.68.196.106:*', // ✅ Card Reader สาขา 00007 (Khok Pho) WebSocket HTTPS - ALL PORTS
          'http://100.78.250.73:*', // ✅ Card Reader สาขาโดย อุไร ร่าหมาน (all ports) - NEW
          'https://100.78.250.73:*', // ✅ Card Reader สาขาโดย อุไร ร่าหมาน HTTPS (all ports) - NEW
          'ws://100.78.250.73:*', // ✅ Card Reader สาขาโดย อุไร ร่าหมาน WebSocket (all ports) - NEW
          'wss://100.78.250.73:*', // ✅ Card Reader สาขาโดย อุไร ร่าหมาน WebSocket HTTPS (all ports) - NEW
          'http://100.92.113.92:*', // ✅ Card Reader สาขาปัตตานี (สุไหง-โกลก) (all ports) - NEW
          'https://100.92.113.92:*', // ✅ Card Reader สาขาปัตตานี HTTPS (all ports) - NEW
          'ws://100.92.113.92:*', // ✅ Card Reader สาขาปัตตานี WebSocket (all ports) - NEW
          'wss://100.92.113.92:*', // ✅ Card Reader สาขาปัตตานี WebSocket HTTPS (all ports) - NEW

                    'http://100.84.132.71:*', // ✅ Card Reader สำนักงานใหญ่  (all ports) - NEW
          'https://100.84.132.71:*', // ✅ Card Reader สำนักงานใหญ่ HTTPS (all ports) - NEW
          'ws://100.84.132.71:*', // ✅ Card Reader สำนักงานใหญ่ WebSocket (all ports) - NEW
          'wss://100.84.132.71:*', // ✅ Card Reader สำนักงานใหญ่ WebSocket HTTPS (all ports) - NEW
          'http://100.84.132.71:3999', // ✅ Card Reader สำนักงานใหญ่ Port 3999 (HTTP)
          'https://100.84.132.71:3999', // ✅ Card Reader สำนักงานใหญ่ Port 3999 (HTTPS)

           'http://100.92.184.115:*', // ✅ Card Reader สำนักงานใหญ่  (all ports) - NEW
          'https://100.92.184.115:*', // ✅ Card Reader สำนักงานใหญ่ HTTPS (all ports) - NEW
          'ws://100.92.184.115:*', // ✅ Card Reader สำนักงานใหญ่ WebSocket (all ports) - NEW
          'wss://100.92.184.115:*', // ✅ Card Reader สำนักงานใหญ่ WebSocket HTTPS (all ports) - NEW
          'http://100.92.184.115:3999', // ✅ Card Reader สำนักงานใหญ่ Port 3999 (HTTP)
          'https://100.92.184.115:3999', // ✅ Card Reader สำนักงานใหญ่ Port 3999 (HTTPS)

          'http://100.115.94.1:*', // ✅ Card Reader สาขายะลา  (all ports) - NEW
          'https://100.115.94.1:*', // ✅ Card Reader สาขายะลา HTTPS (all ports) - NEW
          'ws://100.115.94.1:*', // ✅ Card Reader สาขายะลา WebSocket (all ports) - NEW
          'wss://100.115.94.1:*', // ✅ Card Reader สาขายะลา WebSocket HTTPS (all ports) - NEW

                    'http://100.64.32.55:*', // ✅ Card Reader สาขายะลา  (all ports) - NEW
          'https://100.64.32.55:*', // ✅ Card Reader สาขายะลา HTTPS (all ports) - NEW
          'ws://100.64.32.55:*', // ✅ Card Reader สาขายะลา WebSocket (all ports) - NEW
          'wss://100.64.32.55:*', // ✅ Card Reader สาขายะลา WebSocket HTTPS (all ports) - NEW

          'http://100.127.38.117:*', // ✅ Card Reader สาขากรือเสาะ
          'https://100.127.38.117:*', // ✅ Card Reader สาขากรือเสาะ HTTPS (all ports) - NEW
          'ws://100.127.38.117:*', // ✅ Card Reader สาขากรือเสาะ WebSocket (all ports) - NEW
          'wss://100.127.38.117:*', // ✅ Card Reader สาขากรือเสาะ WebSocket HTTPS (all ports) - NEW

           'http://100.88.190.88:*', // ✅ Card Reader หาดใหญ่
          'https://100.88.190.88:*', // ✅ Card Reader หาดใหญ่ HTTPS (all ports) - NEW
          'ws://100.88.190.88:*', // ✅ Card Reader หาดใหญ่ WebSocket (all ports) - NEW
          'wss://100.88.190.88:*', // ✅ Card Reader หาดใหญ่ WebSocket HTTPS (all ports) - NEW

            'http://100.119.4.117:*', // ✅ Card Reader สตูล
          'https://100.119.4.117:*', // ✅ Card Reader สตูล HTTPS (all ports) - NEW
          'ws://100.119.4.117:*', // ✅ Card Reader สตูล WebSocket (all ports) - NEW
          'wss://100.119.4.117:*', // ✅ Card Reader สตูล WebSocket HTTPS (all ports) - NEW

          'http://100.67.134.56:*', // ✅ Card Reader นคร
          'https://100.67.134.56:*', // ✅ Card Reader นคร HTTPS (all ports) - NEW
          'ws://100.67.134.56:*', // ✅ Card Reader นคร WebSocket (all ports) - NEW
          'wss://100.67.134.56:*', // ✅ Card Reader นคร WebSocket HTTPS (all ports) - NEW

                    'http://100.116.208.41:*', // ✅ Card Reader พัทลุง
    'https://100.116.208.41:*', // ✅ Card Reader พัทลุง HTTPS (all ports) - NEW
    'ws://100.116.208.41:*', // ✅ Card Reader พัทลุง WebSocket (all ports) - NEW
    'wss://100.116.208.41:*', // ✅ Card Reader พัทลุง WebSocket HTTPS (all ports) - NEW
    'https://100.116.208.41:3999', // ✅ Card Reader พัทลุง Port 3999 (HTTPS) - เฉพาะ fetch

          'https://maps.googleapis.com', // ← เพิ่มสำหรับเรียก Maps REST APIs
          'https://maps.gstatic.com', // ← เพิ่มสำหรับ tile/images
          'https://www.googleapis.com', // ← เพิ่ม Firebase APIs
          'https://*.googleapis.com', // ← เพิ่ม Firebase subdomain APIs
          'https://*.firebaseio.com', // ← เพิ่ม Firebase Realtime Database
          'https://*.firebasedatabase.app', // ← เพิ่ม Firebase Database connections
          'wss://*.firebaseio.com', // ← เพิ่ม Firebase WebSocket connections
          'wss://*.firebasedatabase.app', // ← เพิ่ม Firebase WebSocket connections
          'https://api.bigdatacloud.net', // ← เพิ่มสำหรับ reverse geocoding API
          'https://api-bdc.io', // ← เพิ่มสำหรับ reverse geocoding API (fallback)
          'https://*.tiktok.com', // ← เพิ่ม TikTok APIs
          'https://www.tiktokv.com', // ← เพิ่ม TikTok video APIs
          'https://*.tiktokcdn.com', // ← เพิ่ม TikTok CDN APIs
          'https://cdn.jsdelivr.net', // ← เพิ่ม Chart.js source maps และ CDN resources
          'https://cdnjs.cloudflare.com', // ← เพิ่ม html2pdf.js และ CDN resources อื่นๆ
        ],

        // CSS
        'style-src': [
          "'self'",
          'https://cdn.jsdelivr.net',
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com',
          'https://unpkg.com',
          "'unsafe-inline'",
        ],

        // Images: tile จาก OSM, static maps, placeholder
        'img-src': [
          "'self'",
          'data:',
          'blob:',
          'https:',
          'https://via.placeholder.com',
          'https://img.daisyui.com',
          'https://maps.googleapis.com',
          'https://*.tile.openstreetmap.org',
          'https://randomuser.me',
          'https://*.tiktok.com', // ← เพิ่ม TikTok images
          'https://www.tiktokv.com', // ← เพิ่ม TikTok video thumbnails
          'https://*.tiktokcdn.com', // ← เพิ่ม TikTok CDN images
        ],

        // Media (video/audio)
        'media-src': [
          "'self'",
          'data:',
          'blob:',
          'https:',
          'https://*.tiktok.com',
          'https://*.tiktokcdn.com',
        ],

        // Fonts
        'font-src': [
          "'self'",
          'data:',
          'https://cdn.jsdelivr.net',
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com',
        ],

        // Iframes
        'frame-src': [
          "'self'",
          'blob:',
          'https://www.openstreetmap.org',
          'https://*.openstreetmap.org',
          'https://maps.google.com',
          'https://www.google.com/maps',
          'https://www.google.com', // ← Add root Google domain for Maps API redirects
          'https://*.firebaseapp.com', // ← เพิ่ม Firebase hosted apps
          'https://*.firebaseio.com', // ← เพิ่ม Firebase iframes
          'https://*.firebasedatabase.app', // ← เพิ่ม Firebase Realtime Database
          'https://*.tiktok.com', // ← เพิ่ม TikTok embeds
          'https://www.tiktokv.com', // ← เพิ่ม TikTok video embeds
          'https://*.tiktokcdn.com', // ← เพิ่ม TikTok CDN
        ],
        'child-src': [
          "'self'",
          'blob:',
          'https://www.openstreetmap.org',
          'https://*.openstreetmap.org',
          'https://maps.google.com',
          'https://www.google.com/maps',
          'https://www.google.com', // ← Add root Google domain for Maps API redirects
          'https://*.firebaseapp.com', // ← เพิ่ม Firebase hosted apps
          'https://*.firebaseio.com', // ← เพิ่ม Firebase iframes
          'https://*.firebasedatabase.app', // ← เพิ่ม Firebase Realtime Database
          'https://*.tiktok.com', // ← เพิ่ม TikTok embeds
          'https://www.tiktokv.com', // ← เพิ่ม TikTok video embeds
          'https://*.tiktokcdn.com', // ← เพิ่ม TikTok CDN
        ],

        'object-src': ["'none'"],
      },
    },
  })
);

// Additional security headers
app.use((req, res, next) => {
  // Strict Transport Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS Protection (for older browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy - Allow camera for installment photo capture
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(self)');

  next();
});

// Apply rate limiting
if (securityConfig.rateLimiting.enabled) {
  app.use('/api/', limiter);
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/users/login', loginLimiter);
}

/* 4) ใช้ Cookie Parser */
app.use(cookieParser());

/* 4.1) ใช้ express-session สำหรับ Session Cookie โดยใช้ Redis Store */
app.use(
  session({
    store: (redis && RedisStore)
      ? new RedisStore({
          client: redis,
          prefix: 'sess:',
          ttl: 60 * 60 * 24 // 1 วัน
        })
      : undefined, // ถ้าไม่มี Redis จะ fallback เป็น MemoryStore (dev เท่านั้น)
    secret: securityConfig.session.secret || process.env.SESSION_SECRET,
    resave: securityConfig.session.resave,
    saveUninitialized: securityConfig.session.saveUninitialized,
    rolling: true,
    cookie: {
      maxAge: securityConfig.session.cookie.maxAge,
      httpOnly: securityConfig.session.cookie.httpOnly,
      secure: isProd || securityConfig.session.cookie.secure,
      sameSite: securityConfig.session.cookie.sameSite,
    },
  })
);

/* 5) ใช้ Compression */
app.use(compression());

// เพิ่ม Redis client ให้ app ใช้ได้ (สำหรับ cache อื่น ๆ)
if (redis) {
  app.set('redis', redis);
}

// --- เพิ่ม serving uploads ทั้งสองโฟลเดอร์ ---
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), { maxAge: '30d', etag: true })
);
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'public', 'uploads'), {
    maxAge: '30d',
    etag: true,
  })
);

// Serve Logo directory
app.use(
  '/Logo',
  express.static(path.join(__dirname, 'Logo'), { maxAge: '30d', etag: true })
);

// -----------------------------------------
// ต่อไปเป็น static อื่น ๆ (js, assets, dist, public) - ไม่รวม views เพื่อป้องกันการเข้าถึงโดยตรง
// -----------------------------------------
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use(
  '/assets',
  express.static(path.join(__dirname, 'assets'), { maxAge: '30d', etag: true })
);
app.use(
  '/dist',
  express.static(path.join(__dirname, 'dist'), { maxAge: '7d', etag: true })
);
// Serve the Thai address data JSON file
app.get('/api_province_with_amphure_tambon.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'api_province_with_amphure_tambon.json'));
});

// ✅ เฉพาะ public directory และ account directory เท่านั้น
app.use(express.static(path.join(__dirname, 'public')));
app.use('/account', express.static(path.join(__dirname, 'views/account')));

// ✅ Serve favicon.ico from public/favicon directory
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon', 'favicon.ico'));
});

// ✅ เพิ่ม Loading directory สำหรับ Lottie animations
app.use('/Loading', express.static(path.join(__dirname, 'Loading'), {
  maxAge: '1d',
  etag: true
}));

// Serve HTML files from root directory for testing
app.use(express.static(__dirname, {
  index: false,
  redirect: false
}));

// Specific route for register_supplier.html to avoid trailing slash issue
app.get('/register_supplier.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'register_supplier.html'));
});

// ✅ Employee App route
app.use('/employeeApp', express.static(path.join(__dirname, 'employeeApp'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    }
  }
}));

// ✅ เพิ่ม specific routes สำหรับ CSS/JS files ใน views directories
app.use('/views', express.static(path.join(__dirname, 'views'), {
  setHeaders: (res, filePath) => {
    // Set correct MIME types for CSS and JS files
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    }
  },
  // Allow serving all files including HTML
  index: false,
  // Remove extensions filter to allow all file types
  dotfiles: 'allow'
}));

// ✅ Add route for shared resources in pattani directory
app.use('/shared', express.static(path.join(__dirname, 'views/pattani/shared'), {
  setHeaders: (res, filePath) => {
    // Set correct MIME types
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    }
  },
  index: false
}));

/* 7) ใช้ Rate Limiter */
app.use(limiter);

/* 7.5) Printer Proxy Endpoint - ✅ เวอร์ชันแก้ไขแล้ว */
app.post('/api/printer/print', async (req, res) => {
  console.log('🖨️ ✅ Printer proxy endpoint called (FIXED VERSION)');
  console.log('📥 Request body:', JSON.stringify(req.body, null, 2));

  try {
    const { image, branchCode, printerURL } = req.body;

    //  ปฏิเสธ mock data - ไม่ให้พิมพ์จริง
    const mockDataTypes = [
      'status-check',
      'test-connection',
      'health-check',
      'test-print',
    ];
    if (mockDataTypes.includes(image)) {
      console.log(' Rejected mock data:', image);
      console.log(
        ' Mock data blocked from printing - returning success without printing'
      );
      return res.json({
        success: true,
        data: {
          success: true,
          method: 'Mock Blocked',
          timestamp: new Date().toISOString(),
          contentLength: image.length,
          contentType: 'mock-data',
          printerName: 'Mock-Blocked',
          branchCode: '00000',
          message: 'Mock data blocked from real printing',
        },
      });
    }

    if (!image) {
      console.error('❌ Missing image data in request');
      return res
        .status(400)
        .json({ success: false, error: 'Missing image data' });
    }

    let targetURL = printerURL;

    // ถ้าไม่ได้ส่ง printerURL มา ให้ดึงจาก branch database
    if (!targetURL && branchCode) {
      const Branch = require('./models/Account/Branch');
      const branch = await Branch.findOne({
        branch_code: branchCode,
        deleted_at: null,
      }).lean();

      if (branch && branch.printerServerUrl) {
        targetURL = branch.printerServerUrl;
        console.log(
          `📍 Found printer URL for branch ${branchCode}: ${targetURL}`
        );
      } else {
        console.log(`⚠️ No printer URL configured for branch ${branchCode}`);
      }
    }

    // ✅ ใช้ Tailscale IP ที่ถูกต้อง
    if (!targetURL) {
      targetURL = 'http://100.106.108.57:4001'; // ✅ Tailscale IP ใหม่
      console.log(`🔧 Using default printer URL: ${targetURL}`);
    }

    // ✅ แก้ไข endpoint ให้ถูกต้อง
    const printEndpoint = `${targetURL}/api/printer/print`;

    console.log(`🖨️ Target printer URL: ${targetURL}`);
    console.log(`🖨️ Full print endpoint: ${printEndpoint}`);
    console.log(`📊 Image data size: ${image ? image.length : 0} characters`);

    // ใช้ built-in fetch (Node 18+) หรือ native http module
    let response, result;

    if (typeof fetch !== 'undefined') {
      // ใช้ built-in fetch (Node.js 18+)
      console.log('Using built-in fetch for printing');

      // สร้าง AbortController สำหรับ timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        console.log(`🚀 Sending PRINT request to: ${printEndpoint}`);

        const startTime = Date.now();

        // ✅ ส่ง POST request ไปยัง print endpoint จริง
        response = await fetch(printEndpoint, {
          method: 'POST', // ✅ เปลี่ยนเป็น POST
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'printer-server-key-2024',
          },
          body: JSON.stringify({ content: image }), // ✅ ส่ง image data
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseTime = Date.now() - startTime;
        console.log(`⏱️ Print request completed in ${responseTime}ms`);
        console.log(`📋 Response status: ${response.status}`);

        // ตรวจสอบ content type ก่อนที่จะ parse JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const textResult = await response.text();
          console.log(
            `📊 Non-JSON response:`,
            textResult.substring(0, 200) + '...'
          );
          result = {
            success: true,
            message: 'Print request sent successfully',
            status: response.status,
            data: { printed: true },
          };
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Print request timeout (30 seconds)');
        } else if (fetchError.code === 'ECONNREFUSED') {
          throw new Error(
            `Cannot connect to printer server at ${targetURL}. Please check if the printer server is running.`
          );
        } else if (
          fetchError.code === 'ENOTFOUND' ||
          fetchError.code === 'EAI_NONAME'
        ) {
          throw new Error(
            `Cannot resolve hostname: ${targetURL}. Please check the printer server address.`
          );
        } else {
          throw new Error(`Network error: ${fetchError.message}`);
        }
      }
    } else {
      // ใช้ native http module (รองรับ Node.js เวอร์ชันเก่า)
      console.log('Using native http module for printing');
      const http = require('http');
      const url = require('url');

      const parsedUrl = url.parse(printEndpoint);
      const postData = JSON.stringify({ content: image }); // ✅ ส่ง content แทน image

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'X-API-Key': 'printer-server-key-2024',
        },
        timeout: 30000,
      };

      result = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const parsedData = JSON.parse(data);
              response = {
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
              };
              resolve(parsedData);
            } catch (e) {
              // ถ้าไม่สามารถ parse JSON ได้ ให้ถือว่าสำเร็จ
              response = {
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
              };
              resolve({
                success: true,
                message: 'Print request sent',
                data: data,
              });
            }
          });
        });

        req.on('error', (error) => {
          if (error.code === 'ECONNREFUSED') {
            reject(
              new Error(
                `Cannot connect to printer server at ${targetURL}. Please check if the printer server is running.`
              )
            );
          } else if (
            error.code === 'ENOTFOUND' ||
            error.code === 'EAI_NONAME'
          ) {
            reject(
              new Error(
                `Cannot resolve hostname: ${targetURL}. Please check the printer server address.`
              )
            );
          } else {
            reject(
              new Error(
                `Network error: ${error.message} (${error.code || 'unknown'})`
              )
            );
          }
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Print request timeout (30 seconds)'));
        });

        req.write(postData);
        req.end();
      });
    }

    if (!response.ok) {
      throw new Error(
        result.error || result.message || `HTTP ${response.status}`
      );
    }

    console.log('✅ Print request successful');
    console.log('📄 Print result:', result);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Print proxy error details:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error type:', error.constructor.name);

    res.status(500).json({
      success: false,
      error: error.message || 'Print request failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/* 8) ใช้ apiMiddlewares */
app.use(apiMiddlewares);

// ========== เพิ่ม Activity Tracker Middleware ==========
app.use(activityTracker);

/* 9) ตั้งค่า Morgan ให้ส่ง HTTP request logs ไปยัง Winston */
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// ✅ API endpoint สำหรับ Client IP detection
app.get('/api/ip', (req, res) => {
  // ดึง Client IP จากหลายแหล่งที่เป็นไปได้
  const clientIP = req.headers['x-client-ip'] ||
                   req.headers['x-real-ip'] ||
                   req.headers['x-forwarded-for'] ||
                   req.ip ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   'unknown';

  // ทำความสะอาด IP (ลบ ::ffff: prefix)
  const cleanIP = clientIP.replace(/::ffff:/, '').replace(/::1/, '127.0.0.1');

  console.log('🌐 Client IP Request:', {
    original: clientIP,
    cleaned: cleanIP,
    headers: {
      'x-client-ip': req.headers['x-client-ip'],
      'x-real-ip': req.headers['x-real-ip'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    },
    req_ip: req.ip
  });

  res.json({
    success: true,
    ip: cleanIP,
    original: clientIP,
    timestamp: new Date().toISOString()
  });
});

//* 10) ตั้งค่า Routes สำหรับแต่ง API */

// Employee App Authentication Routes
app.use('/api/employee', employeeAuthRoutes);

// New Payroll System Routes (placed early to avoid auth conflicts)
app.use('/api/basic-employees', basicEmployeeRoutes);
app.use('/api/monthly-payrolls', monthlyPayrollRoutes);
app.use('/api/bonuses', bonusRoutes);

app.use('/api/salaries', salaryRoutes);
app.use('/api/read-card', cardRoutes);
app.use('/api/cardreader', cardReaderRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/users/online', onlineUsersRoutes);
app.use('/api/users', userRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/quotation', quotationApiRoutes);
app.use('/api/deposit-receipts', depositReceiptApiRoutes);
app.use('/api/deposit-receipt-pdf', depositReceiptPdfRoutes);
app.use('/api/goods-receipts', goodsReceiptRoutes);
// app.use("/api/credit-note", creditNoteRoutes); // Use /api/pos/credit-note instead
app.use('/api/product', productRoutes);
app.use('/api/products', productRoutes); // Alias for deposits.html compatibility
app.use('/api/chart-of-accounts', chartOfAccountsRoutes);
app.use('/api/journals', journalRoutes);
// app.use("/api/quotation", quotationRoutes); // Replaced by quotationApiRoutes (line 1319)
app.use('/api/other-income', otherIncomeRoutes);
// New TaxInvoice and Receipt API endpoints (with Receipt Voucher & Firebase sync)
app.use('/api/taxinvoice', newTaxInvoiceRoutes);
app.use('/api/receipt', newReceiptRoutes);
// Legacy Tax Invoice API endpoint (keeping for backward compatibility)
app.use('/api/tax-invoice', taxInvoiceRoutes);
app.use('/api/product-variant', productVariantRoutes);
// app.use('/api/refund', refundRoutes); // Route doesn't exist
app.use('/api/sale', saleRoutes);
app.use('/api/sales-report', salesReportRoutes);
app.use('/api/sales-dashboard', salesDashboardRoutes);
// app.use('/api/setting-log', settingLogRoutes); // Route doesn't exist
// app.use('/api/setting-payment', settingPaymentRoutes); // Route doesn't exist
// app.use('/api/setting-system', settingSystemRoutes); // Route doesn't exist
app.use('/api/stock', stockRoutes);
app.use('/api/stock-audit', stockAuditRoutes);
app.use('/api/stock-history', stockHistoryRoutes);
app.use('/api/stock-report', stockReportRoutes);
app.use('/api/stock-unit', stockUnitRoutes);
app.use('/api/stock-valuation', stockValuationRoutes);
app.use('/api/supplier', supplierRoutes);
app.use('/api/suppliers', supplierRoutes); // Alias for goods_receipt.html
app.use('/api/supplier-mapping', supplierMappingRoutes);
// app.use('/api/user-audit-log', userAuditLogRoutes); // Route doesn't exist
// app.use('/api/user-log', userLogRoutes); // Route doesn't exist
// app.use('/api/user-permission', userPermissionRoutes); // Route doesn't exist
app.use('/api/user-role', userRoleRoutes);
// app.use('/api/user-role-permission', userRolePermissionRoutes); // Route doesn't exist
app.use('/api/product-attribute', productAttributeRoutes);
app.use('/api/product-category', productCategoryRoutes);
app.use('/api/product-image', productImageRoutes);
app.use('/api/product-review', productReviewRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/order-item', orderItemRoutes);
app.use('/api/order-log', orderLogRoutes);
app.use('/api/payment-log', paymentLogRoutes);
app.use('/api/payment-method', paymentMethodRoutes);
app.use('/api/payment-transaction', paymentTransactionRoutes);
app.use('/api/fulfillment', fulfillmentRoutes);
// console.log('🔗 Registering /api/installment routes...'); // ลบแล้ว
// app.use("/api/installment", installmentRoutes); // ลบแล้ว - ไม่ใช่ main flow
// console.log('✅ /api/installment routes registered'); // ลบแล้ว
app.use('/api/invoice', invoiceRoutes);
// app.use("/api/receipt", require('./routes/invoiceReceiptRoutes')); // ลบแล้ว - ไม่ใช่ main flow

// Legacy Receipt API routes (keeping for backward compatibility)
app.use('/api/receipt-legacy', receiptRoutes);
app.use('/api/receipt-legacy', receiptPdfRoutes); // Receipt PDF generation from database
app.use('/api/receipt-legacy', receiptValidationRoutes); // Receipt data validation

// เพิ่ม root level routes สำหรับ customers
// app.use("/api/customers", unifiedCustomerRoutes); // ไม่ใช้ UnifiedCustomer แล้ว
app.use('/api/customers', customerRoutes); // ใช้ customer routes ปกติ

// app.use('/api/customer-log', customerLogRoutes); // Route doesn't exist
// app.use('/api/customer-point', customerPointRoutes); // Route doesn't exist
// app.use('/api/customer-points-transaction', customerPointsTransactionRoutes); // Route doesn't exist
// app.use('/api/customer-preference', customerPreferenceRoutes); // Route doesn't exist
// app.use('/api/customer-report', customerReportRoutes); // Route doesn't exist
app.use('/api/home', homeRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/assets/pdf', require('./routes/assetsPDFRoutes')); // PDF generation for assets (must be before main assets route)
app.use('/api/assets', assetRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/incomes', incomeRoutes); // Alias with 's' for frontend compatibility
app.use('/api/payment', paymentRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/commission', commissionRoutes);
app.use('/api/employee-salaries', employeeSalaryRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/pdf/installment', pdfInstallmentRoutes);

// ─── เพิ่มระบบผ่อนชำระ ───────────────────────────
// ─── เพิ่มระบบผ่อนชำระ ───────────────────────────

// Add timeout middleware specifically for installment APIs
const installmentTimeoutMiddleware = (req, res, next) => {
  // Set a timeout for installment operations (150 seconds for complex operations)
  req.setTimeout(150000, () => {
    console.error(`❌ Request timeout for ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        message: 'เซิร์ฟเวอร์ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง',
        error: 'REQUEST_TIMEOUT',
        retryable: true
      });
    }
  });
  next();
};

app.use('/api/installment', installmentTimeoutMiddleware, installmentRoutes); // ✅ Main installmentRoutes (includes all dashboard endpoints)

// ✅ เพิ่ม public contract endpoint สำหรับ repayment.html
const LoanIntegrationController = require('./controllers/loanIntegrationController');
app.get('/api/loan/installment/contract/:contractId', LoanIntegrationController.getContractById);

// ✅ เพิ่ม loan routes สำหรับ dashboard ที่ต้องการ /api/loan/* endpoints
// const loanDashboardRoutes = require('./routes/installmentDashboardRoutes'); // Already using loanDashboardRoutes from line 278
app.use('/api/loan', loanRoutes); // Complete loan routes with all dashboard endpoints

// Tax Invoice and Receipt APIs
app.use('/api/expense', expenseRoutes);
app.use('/api/expenses', expenseRoutes); // Alias with 's' for frontend compatibility
app.use('/api/expense-records', require('./routes/expenseRecordRoutes')); // New expense record management
app.use('/api/purchase-order', purchaseOrderRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes); // Alias for goods_receipt.html
app.use('/api/audit-log', auditLogRoutes);
// app.use("/api/billing-invoice", billingInvoiceRoutes); // ลบแล้ว - ไม่ใช่ main flow
app.use('/api/billing-correction', billingCorrectionRoutes);
app.use('/api/billing-log', billingLogRoutes);
app.use('/api/branch', branchRoutes);
app.use('/api/branches', branchRoutes); // Alias for deposits.html compatibility
// app.use('/api/periodic-fifo', periodicFifoRoutes); // Route doesn't exist
app.use('/api/leave', leaveRoutes);
app.use('/api/bank-accounts', bankAccountsRouter);
// app.use("/api/billing-invoices", billingInvoicesRouter); // ลบแล้ว - ซ้ำกับ /api/billing-invoice
console.log('🛣️ Loading transfer routes...');
app.use('/api/transfers', transferRoutes);
console.log('✅ Transfer routes loaded successfully');
app.use('/api/installment/customers', installmentCustomersRoutes); // Enhanced customer management with integrated data
app.use('/api/notifications', notificationsRouter);
app.use('/api/events', eventRoutes);
app.use('/api/qr-signature', qrSignatureRoutes);

// Firebase Config API (secure)
app.get('/api/firebase-config', authJWT, (req, res) => {
  try {
    // ส่งเฉพาะ config ที่ปลอดภัยสำหรับ client
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || 'demo-api-key',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://demo-project-default-rtdb.firebaseio.com',
      projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '123456789',
      appId: process.env.FIREBASE_APP_ID || '1:123456789:web:abcdef'
    };

    res.json(firebaseConfig);
  } catch (error) {
    console.error('❌ Firebase config error:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถโหลดการตั้งค่า Firebase ได้'
    });
  }
});

app.use('/api', apiRoutes);

// Document Number Generation API
app.use('/api', documentNumberRoutes);
app.use('/api/expense-rt', expenseRt);
app.use('/api/service', servicesRoutes); // เก่า - อาจจะใช้ในที่อื่น
// app.use("/api/services", servicesRoutes); // ลบออก - ใช้ serviceRoutes แทน
app.use('/api/pos/credit-note', posCreditNoteRoutes);
app.use('/api/pos/payment-vouchers', posPaymentVoucherRoutes);
app.use('/api/receipt-voucher', receiptVoucherRoutes);
// Add alias for compatibility with frontend calls
app.use('/api/receipt-vouchers', receiptVoucherRoutes);
app.use('/api/quick-sale', quickSaleRoutes);
app.use('/api/backdated-purchase-orders', backdatedPORoutes);
app.use('/api/promotion', promotionRoutes);
app.use('/api/finance-partners', financePartnerRoutes);
app.use('/api/payoff-approval', payoffApprovalRoutes);
// app.use('/api/accounts', accountsRoute); // Route doesn't exist
app.use('/api/audit', auditRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/system', maintenanceRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/customer', customerRoutes);
// === ENHANCED PDF SYSTEM ===
// app.use('/api/installment/pdf', enhancedPdfRoutes); // removed - not used
// === BAD DEBT MANAGEMENT ===
app.use('/api/bad-debt', badDebtRoutes);

app.use('/api/receipts', receiptsRoutes);
app.use('/api/combined-receipts', combinedReceiptsRoutes);
// app.use("/api/receipt-installment", receiptInstallmentRoutes); // ลบแล้ว - ไม่ใช่ main flow
app.use('/api/category-group', categoryGroupRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/upload-documents', uploadDocuments);
app.use('/api/review', reviewRoutes);
app.use('/api/performance_reviews', performanceReviewsRouter);
console.log('✅ Registering attendance routes at /api/attendance');
app.use('/api/attendance', attendanceRoutes);
app.use('/api/hr/ios-attendance', iOSAttendanceRoutes);
// HR API Routes
app.use('/api/hr/employees', hrEmployeesRoutes);
app.use('/api/hr/salaries', hrSalaryRoutes);
app.use('/api/hr/attendance', hrAttendanceRoutes);
app.use('/api/hr/leaves', hrLeaveRoutes);
app.use('/api/hr/leave-policy', hrLeavePolicyRoutes);
app.use('/api/hr/announcements', hrAnnouncementRoutes);
app.use('/api/hr/commission', hrCommissionRoutes);
app.use('/api/hr/bonus', hrBonusRoutes);
app.use('/api/hr/work-schedules', hrWorkScheduleRoutes);
app.use('/api/hr/overtime', hrOvertimeRoutes);
// Legacy employee routes (keeping for backward compatibility)
app.use('/api/employees', employeesRoutes);
app.use('/api/employee', employeesRoutes);
// app.use('/api/user-branch', userBranchRoutes); // Route doesn't exist
app.use('/api/news', newsRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/comment', commentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/zone', zoneRoutes);
// Fallback zone route for troubleshooting permission issues
const fallbackZoneRoutes = require('./routes/fallback-zoneRoutes');
app.use('/api/zone-fallback', fallbackZoneRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/enhanced-email', enhancedEmailRoutes); // Enhanced email service with correct PDF controllers
app.use('/api/document', documentGenerationRoutes); // Document generation for installment system
app.use('/api/inventory', inventoryRoutes); // Inventory management routes
app.use('/api/purchase-notes', purchaseNotesRoutes); // Purchase credit and debit notes management

// เพิ่มระบบบริการหลังการขาย - ใช้ข้อมูลจริงจาก CashSale และ InstallmentOrder
app.use('/api/services', serviceRoutes);  // ใช้ serviceRoutes ที่สร้างใหม่
app.use('/api/cash-sales', cashSaleRoutes);
app.use('/api/installment-orders', installmentOrderRoutes);

// เพิ่มระบบสะสมแต้ม
app.use('/api/points', pointsRoutes);

// เพิ่มระบบชำระค่างวดผ่อน
app.use('/api/installment-payment', installmentPaymentRoutes);
app.use('/api/installment-orders', installmentPaymentRoutes); // เพิ่ม route alias สำหรับ orders

// เพิ่มระบบจองสต็อกจากมัดจำ
app.use('/api/stock-reservation', stockReservationRoutes);

// เพิ่มระบบใบลดหนี้
app.use('/api/credit-note', creditNoteRoutes);

// เพิ่มระบบใบเพิ่มหนี้และใบลดหนี้การขาย
const salesDebitNoteRoutes = require('./routes/salesDebitNoteRoutes');

// เพิ่ม Fingerprint API routes สำหรับ ZK9500
const fingerprintRoutes = require('./routes/api/fingerprint');
const salesCreditNoteRoutes = require('./routes/salesCreditNoteRoutes');
app.use('/api/sales-debit-notes', salesDebitNoteRoutes);
app.use('/api/sales-credit-notes', salesCreditNoteRoutes);

// เพิ่มระบบ repayment สำหรับ repayment.html
const repaymentRoutes = require('./routes/repaymentRoutes');
app.use('/api/repayment', repaymentRoutes);

// เพิ่ม Fingerprint API routes สำหรับการสแกนลายนิ้วมือ ZK9500
const fingerprintEncryptedRoutes = require('./routes/api/fingerprint-encrypted');
app.use('/api/fingerprint', fingerprintRoutes);
app.use('/api/fingerprint', fingerprintEncryptedRoutes);

// เพิ่มระบบจัดการสินเชื่อ (Loan Management System)
// Note: Order matters! More specific routes should come first
// Loan system additional routes (these are more specific, won't conflict)
app.use('/api/loan/claim-items', claimItemsRoutes);
app.use('/api/costs-expenses', costsExpensesRoutes);
app.use('/api/loan/credit-approval', creditApprovalRoutes);
// Loan integration routes (handles installment/contract endpoints)
app.use('/api/loan', loanIntegrationRoutes);

// ======= DEBUG & TROUBLESHOOTING ENDPOINTS =======

// เพิ่มการ debug สำหรับ installment routes
app.get('/api/installment-debug', (req, res) => {
  res.json({
    success: true,
    message: 'Installment API is working',
    availableRoutes: [
      'GET /api/installment/dashboard/summary',
      'GET /api/installment/dashboard/trends',
      'GET /api/installment/dashboard/status-distribution',
      'GET /api/installment/dashboard/proportions',
      'GET /api/installment/dashboard/recent-loans',
      'GET /api/installment/dashboard/daily-stats',
      'GET /api/installment/dashboard/debt-trends',
      'GET /api/installment/dashboard/branch-status',
      'GET /api/installment/notifications/unread-count',
      'GET /api/installment/reports/dashboard-summary',
      'GET /api/installment/summary',
      'GET /api/loan/dashboard',
      'GET /api/loan/summary'
    ],
    registeredRoutes: {
      '/api/installment': 'installmentRoutes (main file with all endpoints)',
      '/api/loan': 'loanDashboardRoutes + loanRoutes'
    },
    timestamp: new Date().toISOString()
  });
});

// เพิ่ม debug endpoint สำหรับตรวจสอบ route registration
app.get('/api/debug/routes', (req, res) => {
  const routes = [];

  // Function to extract routes from app
  function extractRoutes(stack, prefix = '') {
    stack.forEach((layer) => {
      if (layer.route) {
        // Regular route
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        routes.push({
          path: prefix + layer.route.path,
          methods: methods,
          type: 'route'
        });
      } else if (layer.name === 'router' && layer.regexp) {
        // Router middleware
        const match = layer.regexp.toString().match(/^\/\^\\?(.+?)\\\?\$/);
        const routerPath = match ? match[1].replace(/\\\//g, '/') : 'unknown';
        if (layer.handle && layer.handle.stack) {
          extractRoutes(layer.handle.stack, prefix + routerPath);
        }
      }
    });
  }

  try {
    extractRoutes(app._router.stack);

    res.json({
      success: true,
      message: 'Route analysis complete',
      totalRoutes: routes.length,
      installmentRoutes: routes.filter(r => r.path.includes('/installment')),
      loanRoutes: routes.filter(r => r.path.includes('/loan')),
      allRoutes: routes.slice(0, 50), // Limit to first 50 routes
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      message: 'Could not analyze routes',
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint สำหรับตรวจสอบ installment routes โดยไม่ต้อง auth
app.get('/api/test/installment', (req, res) => {
  res.json({
    success: true,
    message: 'Installment test endpoint working',
    server: {
      status: 'running',
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000
    },
    middleware: {
      cors: 'enabled',
      helmet: 'enabled',
      compression: 'enabled',
      authentication: 'JWT required for protected routes'
    },
    timestamp: new Date().toISOString()
  });
});

// Raster receipt endpoint for installment system
app.post('/api/print-raster-receipt', async (req, res) => {
  try {
    console.log('🖨️ Processing raster receipt request...');

    const PDFoooRasterController = require('./controllers/pdf/PDFoooRasterController');
    const receiptData = req.body;

    if (!receiptData) {
      return res.status(400).json({
        success: false,
        error: 'ไม่พบข้อมูลใบเสร็จ'
      });
    }

    // Generate receipt using PDFoooRasterController
    const result = await PDFoooRasterController.printReceipt(receiptData);

    if (!result || !result.base64) {
      return res.status(500).json({
        success: false,
        error: 'ไม่สามารถสร้างใบเสร็จได้'
      });
    }

    console.log('✅ Raster receipt generated successfully');

    res.json({
      success: true,
      data: {
        base64: result.base64,
        fileName: result.fileName || 'receipt-installment.png',
        format: 'image/png'
      },
      message: 'สร้างใบเสร็จสำเร็จ'
    });

  } catch (error) {
    console.error('❌ Error generating raster receipt:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการสร้างใบเสร็จ'
    });
  }
});

// Helper function to extract Google Drive file ID
const APPS_SCRIPT_BASE = 'https://script.google.com/macros/s/AKfycbx4G_7lRmZkNkJZYVmcUNJy6kUJNTUTHpQlW3_qXm0_0KHa4bfj8BGOznTGlD4CzRA/exec';

function extractDriveId(u = '') {
    const m1 = u.match(/[?&]id=([^&]+)/);
    if (m1) return m1[1];
    const m2 = u.match(/\/d\/([^/]+)\//);
    if (m2) return m2[1];
    return null;
}

// Proxy for Google Apps Script (to avoid CORS)
app.get('/api/reviews', async (req, res) => {
    try {
        const response = await fetch(`${APPS_SCRIPT_BASE}?t=${Date.now()}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📋 Fetched reviews from Google Apps Script:', data.length, 'items');

        // Process URLs and add proxy path
        const processedReviews = data.map((item) => {
            let src = item.url || item.image || '';

            return {
                url: `/api/image-proxy?url=${encodeURIComponent(src)}`,
                name: item.name || '',
                text: item.text || ''
            };
        });

        res.json(processedReviews);
    } catch (error) {
        console.error('❌ Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// app.use("/api/costs-expenses", costsExpensesRoutes); // Duplicate - already registered at line 1367
app.use('/api/provinces', provinceRoutes);
app.use('/api/printer', printerRoutes);
// Alias for print routes to support frontend calls to /api/print/installment
app.use('/api/print', printerRoutes);
app.use('/api/delivery-note', deliveryNoteRoutes); // API สำหรับใบส่งของ

// New comprehensive API routes
app.use('/api/tax', taxRoutes);
app.use('/api/claim-items', claimItemsRoutes);
app.use('/api/credit-approval', creditApprovalRoutes);

// (Removed duplicate - already registered above)

// FrontStore Management API Routes
app.use('/api/frontstore/categories', frontStoreCategoryRoutes);
app.use('/api/frontstore/promotions', frontStorePromotionRoutes);
app.use('/api/frontstore/products', frontStoreProductRoutes);
app.use('/api/frontstore/video', frontStoreVideoRoutes);
app.use('/api/frontstore/contact-locations', frontStoreContactLocationRoutes);
app.use('/api/frontstore/jobs', frontStoreJobRoutes);

// TikTok OAuth API Routes
app.use('/api/tiktok', tiktokAuthRoutes);

// Image Proxy API Route
app.use('/api/image-proxy', imageProxyRoutes);

// สำคัญ: เส้นทางสำหรับระบบสต๊อกสาขา
app.use('/api/branch-stock', branchStockRoutes);
app.use('/api/branch-stock-history', branchStockHistoryRoutes);
app.use('/api/boxset', boxsetRoutes);
app.use('/api/branch-supplier', branchSupplierRoutes);
app.use('/api/branch-transfer', branchTransferRoutes);
app.use('/api/leave-quota', leaveQuotaRoutes);

app.use('/api/contract', contractRoutes);
app.use('/api/contract-adjustment', contractAdjustmentRoutes);
app.use('/api/contract-attachment', contractAttachmentRoutes);
app.use('/api/contract-notification', contractNotificationRoutes);
app.use(
  '/api/contract-overdue-notification',
  contractOverdueNotificationRoutes
);
app.use('/api/contract-payment-log', contractPaymentLogRoutes);
app.use('/api/upload-signature', uploadSignatureRoutes);

// ** Route FIFO **
// app.use('/api/fifo', fifoRoutes); // Route doesn't exist

/* 11) ตั้งค่าเส้นทางหน้าเว็บต่างๆ */
app.use('/', viewRoutes);

// Enhanced Socket.IO with comprehensive error handling
const SocketErrorHandler = require('./socket/enhancedErrorHandling');
const socketErrorHandler = new SocketErrorHandler();

// Initialize enhanced error handling
socketErrorHandler.initializeServerErrorHandling(io);

// Legacy user tracking (keeping for backward compatibility)
const onlineUsers = {};

// Additional connection handler for legacy user tracking
io.on('connection', (socket) => {
  socket.on('user_join', (data) => {
    try {
      const { userID, branchCode } = data;

      // Validate input
      if (!userID || !branchCode) {
        socket.emit('error_notification', {
          type: 'validation_error',
          message: 'ข้อมูลผู้ใช้ไม่ครบถ้วน กรุณาลองเข้าใหม่',
          timestamp: new Date().toISOString()
        });
        return;
      }

      onlineUsers[socket.id] = { userID, branchCode, connectedAt: new Date() };
      console.log(`✅ User ${userID} from branch ${branchCode} joined (${socket.id})`);

      // Join branch room for targeted updates
      socket.join(`branch-${branchCode}`);
      socket.join(`user-${userID}`);

      // แจ้งให้คนอื่นรู้ว่ามี user ใหม่เข้ามา
      socket.broadcast.to(`branch-${branchCode}`).emit('user_joined', {
        userID,
        branchCode,
        timestamp: new Date().toISOString()
      });

      // Send user success confirmation
      socket.emit('user_join_success', {
        message: 'เข้าสู่ระบบสำเร็จ',
        userID,
        branchCode,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in user_join handler:', {
        error: error.message,
        socketId: socket.id,
        data: data
      });

      socket.emit('error_notification', {
        type: 'server_error',
        message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่',
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', (reason) => {
    try {
      const user = onlineUsers[socket.id];
      if (user) {
        console.log(
          `👋 User ${user.userID} from branch ${user.branchCode} disconnected (${reason})`
        );

        socket.broadcast.to(`branch-${user.branchCode}`).emit('user_left', {
          userID: user.userID,
          branchCode: user.branchCode,
          reason: reason,
          timestamp: new Date().toISOString()
        });

        delete onlineUsers[socket.id];
      }
    } catch (error) {
      logger.error('Error in disconnect handler:', {
        error: error.message,
        socketId: socket.id,
        reason: reason
      });
    }
  });

  // Stock-specific event handlers with enhanced error handling
  socket.on('stock_subscribe', (data) => {
    try {
      const { branchCode, productTypes } = data;

      if (branchCode) {
        socket.join(`stock-${branchCode}`);
        console.log(`📦 Socket ${socket.id} subscribed to stock updates for branch ${branchCode}`);
      }

      if (productTypes && Array.isArray(productTypes)) {
        productTypes.forEach(type => {
          socket.join(`product-${type}`);
        });
      }

      socket.emit('stock_subscribe_success', {
        message: 'ติดตามข้อมูลสต็อกสำเร็จ',
        branchCode,
        productTypes,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in stock_subscribe:', {
        error: error.message,
        socketId: socket.id,
        data: data
      });

      socket.emit('error_notification', {
        type: 'subscription_error',
        message: 'ไม่สามารถติดตามข้อมูลสต็อกได้ กรุณาลองใหม่',
        timestamp: new Date().toISOString()
      });
    }
  });
});

/* 12) Error Handler ต้องอยู่หลังสุด */
app.use(errorHandler);

// ประกาศพอร์ต และ route ควรอยู่ใน connectDB() เดียว
// ...existing code...

// เริ่มการเชื่อมต่อ MongoDB และเริ่มระบบซิงค์
connectDB()
  .then(async () => {
    logger.info('✅ Connected to MongoDB');

    // ตรวจสอบ Redis connection อีกครั้ง (สำหรับ double-check)
    if (redis) {
      try {
        await redis.ping();
        console.log('✅ Redis verified for session store');
      } catch (redisErr) {
        console.warn('⚠️ Redis verification failed:', redisErr.message);
      }
    }

    // ระบบบริการหลังการขายพร้อมใช้งานแล้ว
    console.log('✅ Service Management System ready (using CashSale & InstallmentOrder)');

    // เริ่มระบบซิงค์แบบรวม (Unified Sync) - ใช้ change streams เดียวเพื่อป้องกัน connection pool exhaustion
    startUnifiedSync(io).catch(err => {
      logger.error('❌ Error starting Unified Sync System:', err);
    });

    // 🤖 เริ่มต้นระบบอนุมัติอัตโนมัติ
    console.log('🤖 Starting Auto-Approval System...');
    try {
      const AutoApprovalJob = require('./jobs/autoApprovalJob');
      const AutoApprovalSettings = require('./models/AutoApprovalSettings');
      const { isConnected, waitForConnection } = require('./config/db');
      const mongoose = require('mongoose');

      // รอให้การเชื่อมต่อพร้อมใช้งานและรอเพิ่มเติมเล็กน้อยเพื่อให้แน่ใจ
      await waitForConnection(10000);

      // รอเพิ่มเติม 1 วินาทีเพื่อให้ connection พร้อมสมบูรณ์
      await new Promise(resolve => setTimeout(resolve, 1000));

      // ตรวจสอบการเชื่อมต่ออีกครั้ง
      if (!isConnected()) {
        console.warn('⚠️ MongoDB not ready, skipping auto-approval setup');
        return;
      }

      // เปิดใช้งาน auto-approval โดยอัตโนมัติ
      try {
        // เพิ่มการตรวจสอบ readyState อีกครั้งก่อนทำ query
        if (mongoose.connection.readyState !== 1) {
          console.warn('⚠️ MongoDB connection not ready (readyState:', mongoose.connection.readyState, '), skipping auto-approval setup');
          return;
        }

        const settings = await AutoApprovalSettings.findOne({});
        if (!settings) {
          // สร้างการตั้งค่าเริ่มต้น
          const newSettings = new AutoApprovalSettings({
            enabled: true,
            rules: [],
            lastUpdated: new Date(),
            updatedBy: 'system'
          });
          await newSettings.save();
          console.log('🤖 Auto-approval enabled by default');
        } else if (!settings.enabled) {
          // เปิดใช้งานถ้ายังไม่เปิด
          settings.enabled = true;
          settings.lastUpdated = new Date();
          settings.updatedBy = 'system';
          await settings.save();
          console.log('🤖 Auto-approval enabled automatically');
        } else {
          console.log('🤖 Auto-approval already enabled');
        }
      } catch (dbError) {
        console.error('❌ Error setting up auto-approval settings:', dbError);
      }

      // เริ่มต้น AutoApprovalJob
      const autoApprovalJob = AutoApprovalJob.start();
      console.log('✅ Auto-Approval System started successfully');

      // เก็บ reference สำหรับการปิดระบบ
      global.autoApprovalJob = autoApprovalJob;

    } catch (error) {
      console.error('❌ Error starting Auto-Approval System:', error);
    }

    // Start User Online Status Cleanup Job
    try {
      const User = require('./models/User/User');

      // Run cleanup every 15 minutes to set offline inactive users
      const onlineCleanupJob = setInterval(async () => {
        try {
          const cleanedCount = await User.cleanupInactiveSessions();
          if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} inactive user sessions`);
          }
        } catch (error) {
          console.error('❌ Error in online cleanup job:', error);
        }
      }, 15 * 60 * 1000); // 15 minutes

      console.log('✅ User Online Status Cleanup Job started (every 15 minutes)');
      global.onlineCleanupJob = onlineCleanupJob;

    } catch (error) {
      console.error('❌ Error starting Online Cleanup System:', error);
    }

    // Start server with timeout configuration
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server is running on port ${PORT} and listening on all interfaces`);
    });

    // Configure server timeouts to prevent 504 errors - เพิ่มขึ้นสำหรับ installment operations
    server.timeout = 180000; // 3 minutes - increased for complex installment operations
    server.keepAliveTimeout = 75000; // 75 seconds
    server.headersTimeout = 80000; // 80 seconds (should be higher than keepAliveTimeout)
  })
  .catch((err) => {
    logger.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// 🔄 Graceful Shutdown
async function shutdown(signal) {
  console.log(`\n📋 Received ${signal}. Starting graceful shutdown...`);

  try {
    // ปิด auto-approval jobs (แก้ไข method ที่ไม่มี)
    if (global.autoApprovalJob) {
      try {
        // ตรวจสอบว่ามี method stop หรือไม่
        if (typeof global.autoApprovalJob.stop === 'function') {
          await global.autoApprovalJob.stop();
          console.log('✅ Auto-approval jobs stopped');
        } else if (typeof global.autoApprovalJob.destroy === 'function') {
          global.autoApprovalJob.destroy();
          console.log('✅ Auto-approval jobs stopped');
        } else {
          console.log('⚠️ Auto-approval job cleanup method not available');
        }
      } catch (jobError) {
        console.warn('⚠️ Error stopping auto-approval jobs:', jobError.message);
      }
    }

    // ปิด MongoDB connection
    try {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
    } catch (dbError) {
      console.warn('⚠️ Error closing MongoDB connection:', dbError.message);
    }

    // ปิด Redis connection
    if (redis) {
      try {
        await redis.quit();
        console.log('✅ Redis connection closed');
      } catch (redisError) {
        console.warn('⚠️ Error closing Redis connection:', redisError.message);
      }
    }

    // ปิด HTTP server
    server.close(() => {
      console.log('✅ HTTP server closed');
      console.log('👋 Graceful shutdown completed');
      process.exit(0);
    });

    // Force close หลัง 15 วินาทีถ้ายังไม่ปิด (เพิ่มเวลาให้มากขึ้น)
    setTimeout(() => {
      console.error('❌ Force closing server after timeout');
      process.exit(1);
    }, 15000);

  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Register signal handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Enhanced error handling for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    type: 'uncaught_exception',
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack
    }
  };

  console.log('🔥 Application Error:', errorInfo);
  console.error('🚨 Uncaught Exception:', error);

  // แยกการจัดการตาม error type
  if (error.message.includes('EADDRINUSE')) {
    console.error('💡 Port already in use. Kill existing process or use different port.');
    process.exit(1);
  } else if (error.message.includes('ECONNRESET') || error.code === 'ECONNRESET') {
    console.error('💡 Connection reset detected - this is usually temporary network issue');
    console.warn('⚠️ Continuing operation - MongoDB will auto-reconnect');
    // ไม่ shutdown สำหรับ connection reset - ให้ mongoose auto-reconnect ทำงาน
    return;
  } else if (error.message.includes('MongoDB') || error.message.includes('connection')) {
    console.error('💡 Database connection issue - allowing auto-reconnect to handle');
    console.warn('⚠️ Continuing operation - MongoDB should auto-reconnect');
    // ไม่ shutdown ทันที - ให้ auto-reconnect ทำงาน
    return;
  } else {
    console.error('🔄 Shutting down gracefully due to uncaught exception...');
    shutdown('UNCAUGHT_EXCEPTION');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    type: 'unhandled_rejection',
    reason: reason?.toString() || 'Unknown reason',
    stack: reason?.stack || 'No stack trace available',
    promise: promise.toString()
  };

  console.log('🔥 Application Error:', errorInfo);
  console.error('🚨 Unhandled Promise Rejection at:', promise, 'reason:', reason);

  // แยกการจัดการตาม rejection type
  if (reason?.message?.includes('MongoDB') || reason?.message?.includes('connection') || reason?.name?.includes('Mongo') ||
      reason?.message?.includes('ECONNRESET') || reason?.code === 'ECONNRESET' ||
      reason?.message?.includes('ETIMEDOUT') || reason?.message?.includes('timeout') ||
      reason?.message?.includes('PoolClearedOnNetworkError')) {
    console.error('💡 Database connection rejection - this is usually temporary');
    console.warn('⚠️ Continuing operation - MongoDB auto-reconnect will handle this');
    // ไม่ shutdown ทันที สำหรับ MongoDB connection errors - ให้ auto-reconnect ทำงาน
  } else {
    console.error('🔄 Shutting down gracefully due to unhandled rejection...');
    shutdown('UNHANDLED_REJECTION');
  }
});

// Handle MongoDB connection errors specifically
if (require('mongoose').connection) {
  require('mongoose').connection.on('error', (error) => {
    if (error.code === 'ECONNRESET' || error.syscall === 'read') {
      console.error('🔌 MongoDB connection reset detected, attempting reconnection...');
      // Don't shutdown on connection reset, let mongoose handle reconnection
    } else {
      console.error('📊 MongoDB connection error:', error);
    }
  });
}

module.exports = app;
