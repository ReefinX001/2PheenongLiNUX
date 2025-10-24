const express             = require('express');
const router              = express.Router();
const invoiceController   = require('../controllers/invoiceController');
const repaymentController = require('../controllers/repaymentController');
const authJWT            = require('../middlewares/authJWT');

// HR Controllers
const userController              = require('../controllers/userController');
const employeeController          = require('../controllers/hr/employeeController');
const eventController             = require('../controllers/eventController');
const announcementController      = require('../controllers/hr/announcementController');
const leaveController             = require('../controllers/hr/leaveController');
const leaveAllocationController   = require('../controllers/hr/leaveAllocationController');
const leavePolicyController       = require('../controllers/hr/leavePolicyController');
const http               = require('http');

// รายการใบแจ้งหนี้
router.get('/invoice',           invoiceController.listInvoices);
// ดู Invoice ทีละเลข
router.get('/invoice/:invoiceNumber', invoiceController.getInvoice);

// User profile endpoints
router.get('/users/me', authJWT, async (req, res) => {
  try {
    const user = req.user;

    // Transform user data for frontend
    const userData = {
      _id: user._id,
      username: user.username,
      name: user.employee?.name || user.username,
      email: user.email,
      role: user.role?.name || 'User',
      photo: user.employee?.imageUrl || null,
      photoUrl: user.employee?.imageUrl || null,
      permissions: user.role?.permissions || [],
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      lastLogin: user.lastLogin
    };

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้'
    });
  }
});

// Logout endpoint
router.post('/auth/logout', authJWT, async (req, res) => {
  try {
    const User = require('../models/User/User');
    const user = await User.findById(req.user._id);

    if (user) {
      // Set user offline
      await user.logout('manual');
    }

    res.json({
      success: true,
      message: 'ออกจากระบบสำเร็จ'
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถออกจากระบบได้'
    });
  }
});

// Repayment system endpoints
router.get('/repayment/stats', authJWT, repaymentController.getDashboardStats);
router.get('/repayment/contracts', authJWT, repaymentController.getContracts);
router.get('/repayment/contracts/:id', authJWT, repaymentController.getContractById);

// Record payment
router.post('/repayment/payment', authJWT, repaymentController.recordPayment);

// Stock management for pay-in-full contracts
router.get('/repayment/check-stock/:contractId', authJWT, async (req, res) => {
  try {
    // Mock stock check implementation
    res.json({
      success: true,
      data: {
        contractNo: req.params.contractId,
        allSufficient: true,
        items: [],
        summary: { availableItems: 0, totalItems: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/repayment/deduct-stock/:contractId', authJWT, async (req, res) => {
  try {
    // Mock stock deduction implementation
    res.json({
      success: true,
      message: 'ตัดสต๊อกเรียบร้อย',
      data: { deductedItems: 0, totalItems: 0 }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================================================
// ZK9500 Fingerprint Scanner Proxy Endpoints
// =============================================================================
// This proxy allows HTTPS web pages to communicate with HTTP-only ZK9500 service
// without triggering Mixed Content errors in browsers

const ZK9500_HOST = '100.106.108.57';
const ZK9500_PORT = 4002;

// Helper function to make HTTP requests to ZK9500 service
function proxyToZK9500(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: ZK9500_HOST,
      port: ZK9500_PORT,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ZK9500-Proxy/1.0'
      }
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data: parsedData,
            headers: res.headers
          });
        } catch (e) {
          // If not JSON, return as text
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data: { message: data },
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`ZK9500 connection failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('ZK9500 request timeout'));
    });

    req.setTimeout(10000); // 10 second timeout

    if (body && (method === 'POST' || method === 'PUT')) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      req.write(bodyStr);
    }

    req.end();
  });
}

// ZK9500 Test Connection
router.get('/zk9500-proxy/test', async (req, res) => {
  try {
    console.log('🔄 ZK9500 Proxy: Testing connection...');
    const result = await proxyToZK9500('/test');

    console.log(`✅ ZK9500 Test successful: ${result.status}`);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error('❌ ZK9500 Test failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'ZK9500 service unavailable',
      details: error.message
    });
  }
});

// ZK9500 Status Check
router.get('/zk9500-proxy/status', async (req, res) => {
  try {
    console.log('🔄 ZK9500 Proxy: Checking status...');
    const result = await proxyToZK9500('/status');

    console.log(`✅ ZK9500 Status check successful: ${result.status}`);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error('❌ ZK9500 Status check failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'ZK9500 service unavailable',
      details: error.message
    });
  }
});

// ZK9500 Connect Device
router.post('/zk9500-proxy/connect', async (req, res) => {
  try {
    console.log('🔄 ZK9500 Proxy: Connecting device...');
    const result = await proxyToZK9500('/connect', 'POST', req.body);

    console.log(`✅ ZK9500 Connect successful: ${result.status}`);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error('❌ ZK9500 Connect failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'ZK9500 connection failed',
      details: error.message
    });
  }
});

// ZK9500 Capture Fingerprint
router.post('/zk9500-proxy/capture', async (req, res) => {
  try {
    console.log('🔄 ZK9500 Proxy: Capturing fingerprint...');
    const result = await proxyToZK9500('/capture', 'POST', req.body);

    console.log(`✅ ZK9500 Capture successful: ${result.status}`);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error('❌ ZK9500 Capture failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'ZK9500 capture failed',
      details: error.message
    });
  }
});

// ZK9500 Health Check
router.get('/zk9500-proxy/health', async (req, res) => {
  try {
    console.log('🔄 ZK9500 Proxy: Health check...');
    const result = await proxyToZK9500('/health');

    console.log(`✅ ZK9500 Health check successful: ${result.status}`);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error('❌ ZK9500 Health check failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'ZK9500 service health check failed',
      details: error.message,
      proxy_info: {
        target_host: ZK9500_HOST,
        target_port: ZK9500_PORT,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Generic ZK9500 proxy endpoint for any other requests
router.all('/zk9500-proxy/*', async (req, res) => {
  try {
    const endpoint = req.path.replace('/api/zk9500-proxy', '');
    console.log(`🔄 ZK9500 Proxy: ${req.method} ${endpoint}`);

    const result = await proxyToZK9500(endpoint, req.method, req.body);

    console.log(`✅ ZK9500 Generic proxy successful: ${result.status}`);
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error(`❌ ZK9500 Generic proxy failed:`, error.message);
    res.status(500).json({
      success: false,
      error: 'ZK9500 proxy request failed',
      details: error.message
    });
  }
});

// =============================================================================
// HR API Endpoints
// =============================================================================

// HR Employees endpoints
router.get('/hr/employees', authJWT, async (req, res) => {
  console.log('🎯 HR Employees endpoint called!'); // Debug log
  try {
    // ดึงข้อมูล User ที่มี employee ข้อมูลจริงแทนข้อมูล Employee
    const User = require('../models/User/User');
    const { limit = 100 } = req.query;

    console.log('📊 Fetching users with limit:', limit); // Debug log

    // ดึง Users ที่มี employee data พร้อมข้อมูล online status จริง
    const users = await User.find()
      .populate('employee', 'name email imageUrl position department phone startDate salary branch deleted_at')
      .populate('role', 'name permissions')
      .select('username email isOnline isBlocked lastSeen lastLogin createdAt updatedAt currentSession')
      .limit(parseInt(limit))
      .sort('-createdAt');

    console.log('👥 Found users:', users.length); // Debug log

    // กรองเฉพาะ User ที่มี employee data และไม่ถูกลบ
    const validUsers = users.filter(user =>
      user.employee &&
      !user.employee.deleted_at
    );

    console.log('👥 Valid users with employee data:', validUsers.length); // Debug log

    // แปลงข้อมูลให้เหมือนเดิมแต่ใช้ข้อมูลจริง
    const transformedData = validUsers.map(user => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      isBlocked: user.isBlocked || false,
      isOnline: user.isOnline || false, // ใช้ข้อมูลจริงจาก User model
      lastSeen: user.lastSeen,
      lastLogin: user.lastLogin,
      employee: {
        _id: user.employee._id,
        name: user.employee.name,
        position: user.employee.position || 'ไม่ระบุตำแหน่ง',
        department: user.employee.department || 'ไม่ระบุแผนก',
        email: user.employee.email,
        phone: user.employee.phone,
        imageUrl: user.employee.imageUrl,
        startDate: user.employee.startDate,
        salary: user.employee.salary,
        branch: user.employee.branch
      },
      role: {
        name: user.role?.name || 'User',
        permissions: user.role?.permissions || []
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    console.log('✅ Transformed data sample:', transformedData[0]); // Debug log

    // คำนวณสถิติสำหรับ Dashboard ด้วยข้อมูลจริง
    const onlineUsers = transformedData.filter(user => user.isOnline === true);
    console.log('📊 Online users debug:', onlineUsers.map(u => ({
      username: u.username,
      name: u.employee?.name,
      isOnline: u.isOnline,
      lastSeen: u.lastSeen,
      lastLogin: u.lastLogin
    })));

    const stats = {
      total: transformedData.length,
      active: transformedData.filter(user => !user.isBlocked && user.employee).length,
      resigned: transformedData.filter(user => user.isBlocked || !user.employee).length,
      online: onlineUsers.length
    };

    console.log('📊 Real stats calculated:', stats); // Debug log

    return res.json({
      success: true,
      data: transformedData,
      stats: stats,
      pagination: {
        total: transformedData.length,
        limit: parseInt(limit),
        page: 1
      }
    });
  } catch (error) {
    console.error('HR employees endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลพนักงานได้'
    });
  }
});

// Events endpoints
router.get('/events', authJWT, eventController.getAll);
router.post('/events', authJWT, eventController.create);
router.patch('/events/:id', authJWT, eventController.update);
router.delete('/events/:id', authJWT, eventController.remove);

// Announcements endpoints
router.get('/announcements', authJWT, async (req, res) => {
  try {
    // ใช้ static method จาก announcementController
    return await announcementController.getLatestAnnouncements(req, res);
  } catch (error) {
    console.error('Announcements endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลประกาศได้'
    });
  }
});

// HR Leaves endpoints - Complete CRUD operations
router.get('/hr/leaves', authJWT, leaveController.getAllLeaves);
router.post('/hr/leaves', authJWT, leaveController.createLeave);
router.patch('/hr/leaves/:id', authJWT, leaveController.updateLeaveStatus);
router.delete('/hr/leaves/:id', authJWT, leaveController.deleteLeave);
router.get('/hr/leaves/me', authJWT, leaveController.getUserLeaves);
router.get('/hr/leaves/balance', authJWT, leaveController.getUserLeaveBalance);

// Leave approval endpoints (backward compatibility)
router.put('/leave/:id/approve', authJWT, leaveController.approveLeave);
router.put('/leave/:id/reject', authJWT, leaveController.rejectLeave);

// Alternative leave endpoints (for compatibility)
router.get('/leave', authJWT, leaveController.getAllLeaves);
router.post('/leave', authJWT, leaveController.createLeave);

// Leave Policy Management endpoints (HR Admin)
router.get('/hr/leave-policy', authJWT, leavePolicyController.getCurrentPolicy);
router.get('/hr/leave-policies', authJWT, leavePolicyController.getAllPolicies);
router.get('/hr/leave-policy/history', authJWT, leavePolicyController.getPolicyHistory);
router.get('/hr/leave-policy/stats', authJWT, leavePolicyController.getPolicyStats);
router.post('/hr/leave-policy', authJWT, leavePolicyController.createPolicy);
router.put('/hr/leave-policy/:id', authJWT, leavePolicyController.updatePolicy);
router.delete('/hr/leave-policy/:id', authJWT, leavePolicyController.deletePolicy);
router.post('/hr/leave-policy/activate/:id', authJWT, leavePolicyController.activatePolicy);
router.post('/hr/leave-policy/duplicate/:id', authJWT, leavePolicyController.duplicatePolicy);

// Employee management endpoints
// Employee endpoints moved to /api/hr/employees for consistency
// Legacy endpoints - redirect to new HR endpoints
router.use('/employees', (req, res) => {
  const newUrl = `/api/hr/employees${req.path}`;
  console.log(`Legacy endpoint accessed: ${req.originalUrl} -> Redirecting to: ${newUrl}`);
  res.redirect(301, newUrl);
});

// Leave Allocation Management endpoints (HR Admin) - Deprecated, use Policy instead
router.get('/hr/leave-allocations', authJWT, leaveAllocationController.getAllAllocations);
router.get('/hr/leave-allocations/:userId', authJWT, leaveAllocationController.getUserAllocation);
router.post('/hr/leave-allocations', authJWT, leaveAllocationController.createAllocation);
router.put('/hr/leave-allocations/:id', authJWT, leaveAllocationController.updateAllocation);
router.delete('/hr/leave-allocations/:id', authJWT, leaveAllocationController.deleteAllocation);
router.post('/hr/leave-allocations/bulk', authJWT, leaveAllocationController.createBulkAllocations);

// HR Employee Statistics endpoint
router.get('/hr/employee-stats', authJWT, async (req, res) => {
  try {
    const User = require('../models/User/User');
    const { period = 'daily' } = req.query;

    console.log('📊 Employee stats endpoint called with period:', period);

    // Get employee data with creation dates
    const users = await User.find()
      .populate('employee', 'name email startDate department position')
      .select('username email isOnline lastSeen createdAt')
      .lean();

    const validUsers = users.filter(user => user.employee);

    console.log('📊 Valid users for stats:', validUsers.length);

    // Calculate stats by period
    let stats = {};

    if (period === 'daily') {
      // Get stats for last 7 days
      const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
      const today = new Date();

      stats = days.map((dayName, index) => {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - (6 - index));

        // Count users created on this day
        const dayUsers = validUsers.filter(user => {
          const userDate = new Date(user.createdAt);
          return userDate.toDateString() === targetDate.toDateString();
        });

        // Count online users (mock data based on day)
        const onlineCount = Math.floor(Math.random() * validUsers.length * 0.3) + 1;

        return {
          day: dayName,
          date: targetDate.toISOString().split('T')[0],
          newEmployees: dayUsers.length,
          onlineEmployees: onlineCount,
          percentage: Math.min(100, (onlineCount / validUsers.length) * 100)
        };
      });
    } else if (period === 'weekly') {
      // Get stats for last 4 weeks
      const weeks = [];
      const today = new Date();

      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (i * 7) - today.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekUsers = validUsers.filter(user => {
          const userDate = new Date(user.createdAt);
          return userDate >= weekStart && userDate <= weekEnd;
        });

        weeks.push({
          day: `สัปดาห์ ${4 - i}`,
          date: weekStart.toISOString().split('T')[0],
          newEmployees: weekUsers.length,
          onlineEmployees: Math.floor(Math.random() * validUsers.length * 0.4),
          percentage: Math.min(100, (weekUsers.length / validUsers.length) * 100)
        });
      }
      stats = weeks;
    } else if (period === 'monthly') {
      // Get stats for last 6 months
      const months = [];
      const today = new Date();

      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

        const monthUsers = validUsers.filter(user => {
          const userDate = new Date(user.createdAt);
          return userDate >= monthStart && userDate <= monthEnd;
        });

        const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                           'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

        months.push({
          day: monthNames[monthStart.getMonth()],
          date: monthStart.toISOString().split('T')[0],
          newEmployees: monthUsers.length,
          onlineEmployees: Math.floor(Math.random() * validUsers.length * 0.5),
          percentage: Math.min(100, (monthUsers.length / validUsers.length) * 100)
        });
      }
      stats = months;
    }

    console.log('📊 Generated stats:', stats);

    res.json({
      success: true,
      period,
      data: stats,
      summary: {
        totalEmployees: validUsers.length,
        avgOnline: Math.floor(validUsers.filter(u => u.isOnline).length),
        period
      }
    });
  } catch (error) {
    console.error('Employee stats endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงสถิติพนักงานได้'
    });
  }
});

module.exports = router;
