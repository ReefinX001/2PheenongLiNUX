// controllers/userController.js
const path     = require('path');
const User     = require('../models/User/User');
const Employee = require('../models/HR/Employee');
const UserRole = require('../models/User/UserRole');
const Branch   = require('../models/Account/Branch');
const Zone     = require('../models/HR/zoneModel');
const Attendance = require('../models/HR/Attendance');
const jwt      = require('jsonwebtoken');
const SECRET   = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';
const LoginRequest = require('../models/LoginRequest');
const AutoApprovalSettings = require('../models/AutoApprovalSettings');
const AutoApprovalService = require('../services/autoApprovalService');

// Helper function to get real IP address (considering proxy/load balancer)
function getRealIP(req) {
  // Check for various proxy headers
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const cfIP = req.headers['cf-connecting-ip']; // Cloudflare
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwarded.split(',')[0].trim();
  }
  if (realIP) return realIP;
  if (cfIP) return cfIP;
  
  // Fallback to direct connection
  return req.ip || req.socket.remoteAddress || 'Unknown';
}

// Helper to normalize IP addresses (remove IPv6 prefix if present)
function normalizeIP(ip) {
  if (!ip) return 'Unknown';
  // Remove IPv6 prefix for IPv4 addresses
  if (ip.substr(0, 7) === "::ffff:") {
    return ip.substr(7);
  }
  // Handle localhost variations
  if (ip === '::1') return '127.0.0.1';
  return ip;
}

// ตรวจสอบว่าข้อความเป็น ObjectId หรือไม่
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// helper: สร้าง host URL
function getHost(req) {
  return `${req.protocol}://${req.get('host')}`;
}

// helper: สร้าง full photoUrl จาก employee.imageUrl
function buildPhotoUrl(imageUrl, req) {
  if (!imageUrl) return null;
  
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  const filename = path.basename(imageUrl);
  return `${getHost(req)}/uploads/employees/${filename}`;
}

// ============ LOGIN REQUEST SECTION START ============

// ตรวจสอบสถานะ check-in ของผู้ใช้
async function checkUserAttendanceStatus(userId, branch) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // หา attendance session ล่าสุดของวันนี้
    const attendance = await Attendance.findOne({
      user: userId,
      checkIn: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ checkIn: -1 });

    // กรณี 1: ยังไม่มีการเช็คอินวันนี้เลย
    if (!attendance) {
      return {
        isCheckedIn: false,
        isCheckedOut: false,
        requireApproval: false,
        message: 'ยังไม่ได้เช็คอินวันนี้ กรุณาเช็คอินผ่านแอพก่อนเข้าสู่ระบบ'
      };
    }

    // กรณี 2: เช็คอินแล้วและเช็คเอาท์แล้ว
    if (attendance.checkOut) {
      return {
        isCheckedIn: false,
        isCheckedOut: true,
        requireApproval: true,
        message: 'คุณได้เช็คเอาท์แล้ว ต้องขออนุมัติเพื่อเข้าสู่ระบบ',
        checkOutTime: attendance.checkOut,
        checkInTime: attendance.checkIn
      };
    }

    // กรณี 3: เช็คอินแล้วแต่ยังไม่เช็คเอาท์
    return {
      isCheckedIn: true,
      isCheckedOut: false,
      requireApproval: false,
      attendance,
      message: 'เช็คอินแล้ว สามารถเข้าสู่ระบบได้',
      checkInTime: attendance.checkIn
    };

  } catch (err) {
    console.error('Check attendance error:', err);
    return {
      isCheckedIn: false,
      isCheckedOut: false,
      requireApproval: false,
      error: true,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบการเช็คอิน'
    };
  }
}

// สร้าง login request สำหรับขออนุมัติ
exports.createLoginRequest = async (req, res) => {
  try {
    const { username, password, reason } = req.body;
    const device = req.headers['user-agent'] || 'Unknown';
    const ipAddress = normalizeIP(getRealIP(req));

    // ตรวจสอบ credentials ก่อน
    const user = await User.findOne({ username }).lean()
      .populate('employee', 'name email imageUrl')
      .populate('role', 'name permissions');

    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ 
        success: false, 
        error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' 
      });
    }

    const requestId = 'REQ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const loginRequest = new LoginRequest({
      requestId,
      userId: user._id,
      username: user.username,
      employeeName: user.employee?.name || user.username,
      reason: reason || 'ขออนุมัติเข้าสู่ระบบหลังเช็คเอาท์',
      device,
      ipAddress,
      userAgent: device,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      photoUrl: buildPhotoUrl(user.employee?.imageUrl, req)
    });
    
    // เพิ่ม audit log สำหรับการสร้างคำขอ
    loginRequest.auditLog.push({
      action: 'created',
      performedBy: user._id.toString(),
      details: `Login request created: ${reason || 'ขออนุมัติเข้าสู่ระบบหลังเช็คเอาท์'}`,
      ipAddress: ipAddress,
      performedAt: new Date()
    });
    
    await loginRequest.save();

    // ส่งแจ้งเตือนไปยัง admin/HR ผ่าน Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('loginRequestCreated', {
        requestId,
        username: user.username,
        employeeName: user.employee?.name,
        reason: reason || 'ขออนุมัติเข้าสู่ระบบหลังเช็คเอาท์',
        timestamp: new Date()
      });
    }

    // console.log(`📋 Login request created: ${requestId} for user ${user.username}`);

    // 🤖 ตรวจสอบและอนุมัติอัตโนมัติ (ถ้าเปิดใช้งาน)
    try {
      const autoApprovalResult = await AutoApprovalService.processAutoApproval(loginRequest);
      
      if (autoApprovalResult.approved) {
        // console.log(`✅ Auto-approved: ${requestId}`);
        
        // ส่งแจ้งเตือนการอนุมัติอัตโนมัติ
        if (io) {
          io.emit('loginRequestUpdated', {
            requestId,
            status: 'approved',
            username: user.username,
            approverName: 'ระบบอนุมัติอัตโนมัติ',
            autoApproved: true
          });
        }
        
        return res.json({
          success: true,
          requestId,
          autoApproved: true,
          token: autoApprovalResult.token,
          message: 'คำขอได้รับการอนุมัติอัตโนมัติแล้ว กำลังเข้าสู่ระบบ...',
          user: {
            _id: user._id,
            username: user.username,
            name: user.employee?.name || '',
            email: user.employee?.email || '',
            photoUrl: buildPhotoUrl(user.employee?.imageUrl, req),
            role: {
              _id: user.role?._id,
              name: user.role?.name || '',
              allowedPages: user.role?.allowedPages || []
            },
            allowedPages: user.role?.allowedPages || []
          }
        });
      } else {
        // console.log(`⏳ Manual approval required: ${requestId} - ${autoApprovalResult.reason}`);
      }
      
    } catch (autoApprovalError) {
      console.error('🚨 Auto-approval error:', autoApprovalError);
      // ไม่ return error เพราะคำขอยังคงถูกสร้างแล้ว
    }

    // กรณีไม่ได้รับการอนุมัติอัตโนมัติ
    return res.json({
      success: true,
      requestId,
      autoApproved: false,
      message: 'ส่งคำขออนุมัติเรียบร้อย กรุณารอการอนุมัติจากผู้ดูแลระบบ'
    });

  } catch (err) {
    console.error('Create login request error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการส่งคำขอ' 
    });
  }
};

// ตรวจสอบสถานะ login request
exports.checkLoginRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await LoginRequest.findOne({ requestId }).lean();
    if (!request) return res.status(404).json({ success:false, error:'ไม่พบคำขอนี้' });

    if (new Date() > request.expiresAt && request.status==='pending') {
      request.status = 'expired';
      await request.save();
    }

    return res.json({
      success: true,
      status: request.status,
      message: request.status==='approved' ? 'คำขอได้รับการอนุมัติแล้ว'
             : request.status==='rejected' ? 'คำขอถูกปฏิเสธ'
             : request.status==='expired' ? 'คำขอหมดอายุแล้ว'
             : 'รอการอนุมัติ'
    });
  } catch (err) {
    console.error('Check login request error:', err);
    return res.status(500).json({ success:false, error:'เกิดข้อผิดพลาด' });
  }
};

// อนุมัติ/ปฏิเสธ login request (สำหรับ admin/HR)
exports.approveLoginRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approved, approverNote } = req.body;
    const approverId = req.user.id;
    const approverIP = normalizeIP(getRealIP(req));

    // console.log(`Processing login request: ${requestId}, approved: ${approved}`);

    const request = await LoginRequest.findOne({ requestId, status: 'pending' }).lean();
    if (!request) {
      // console.log(`Request not found or not pending: ${requestId}`);
      return res.status(404).json({ success: false, error: 'ไม่พบคำขอ' });
    }

    // ดึงข้อมูลผู้อนุมัติ
    const approver = await User.findById(approverId).lean().populate('employee', 'name');
    const approverName = approver?.employee?.name || approver?.username || 'Unknown';

    // console.log(`Approver: ${approverName} (${approverId})`);

    // อัปเดตสถานะด้วย method ใหม่
    try {
      await request.updateStatus(
        approved ? 'approved' : 'rejected',
        approverId,
        approverName,
        approverNote,
        approverIP
      );
    } catch (updateError) {
      console.error('Error updating request status:', updateError);
      return res.status(500).json({ 
        success: false, 
        error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะคำขอ',
        details: process.env.NODE_ENV === 'development' ? updateError.message : undefined
      });
    }

    if (approved) {
      try {
        const user = await User.findById(request.userId).lean()
          .select('+currentSession') // เพิ่ม select currentSession
          .populate('employee', 'name email imageUrl')
          .populate('role', 'name permissions allowedPages')
          .populate('allowedBranches', 'name branch_code')
          .populate('defaultBranches', 'name branch_code');

        if (!user) {
          return res.status(404).json({ success: false, error: 'ไม่พบผู้ใช้' });
        }

        // console.log(`Creating token for user: ${user.username}`);

        // ✅ สร้าง token ไม่หมดอายุ
        const payload = {
          userId: user._id.toString(),
          username: user.username,
          role: user.role?.name || '',
          approvedLogin: true,
          requestId: requestId  // เพิ่ม requestId เพื่อติดตาม
        };
        const token = jwt.sign(payload, SECRET); // ไม่ใส่ expiresIn
        
        // ✅ สร้าง session ใหม่
        try {
          await user.createSession(
            token,
            normalizeIP(request.ipAddress || getRealIP(req)),
            'Web (Approved)',
            request.userAgent || 'Approved Login'
          );
          // console.log(`Session created for user: ${user.username}`);
        } catch (sessionError) {
          console.error('Error creating session:', sessionError);
          return res.status(500).json({ 
            success: false, 
            error: 'เกิดข้อผิดพลาดในการสร้าง session',
            details: process.env.NODE_ENV === 'development' ? sessionError.message : undefined
          });
        }
        
        request.token = token;
        await request.save();
        
        // console.log(`Login request ${requestId} approved for user ${user.username} by ${approverName}`);
        
        // เพิ่ม audit log สำหรับการสร้าง token (แก้ไขให้ใช้ await)
        try {
          await request.addAuditLog(
            'token_created',
            approverId,
            `Token created for approved login`,
            approverIP
          );
        } catch (auditError) {
          console.error('Error adding audit log:', auditError);
          // ไม่ return error เพราะไม่ใช่ critical error
        }

      } catch (approvalError) {
        console.error('Error in approval process:', approvalError);
        return res.status(500).json({ 
          success: false, 
          error: 'เกิดข้อผิดพลาดในกระบวนการอนุมัติ',
          details: process.env.NODE_ENV === 'development' ? approvalError.message : undefined
        });
      }
    }

    // ส่งแจ้งเตือนผ่าน Socket.IO
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('loginRequestUpdated', {
          requestId,
          status: request.status,
          username: request.username,
          approverName: approverName
        });
      }
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
      // ไม่ return error เพราะไม่ใช่ critical error
    }

    return res.json({
      success: true,
      message: approved ? 'อนุมัติคำขอเรียบร้อย' : 'ปฏิเสธคำขอเรียบร้อย'
    });

  } catch (err) {
    console.error('Approve login request error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาด',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ดึงรายการ login requests ทั้งหมด (สำหรับ admin/HR)
exports.getLoginRequests = async (req, res) => {
  try {
    const query = { status: 'pending', expiresAt: { $gt: new Date() } };
    const requests = await LoginRequest.find(query).lean()
      .populate('userId', 'username employee')
      .populate('approverId', 'username')
      .sort({ createdAt: -1 })
      .limit(100);

    const formatted = requests.map(r => ({
      requestId: r.requestId,
      username: r.username,
      employeeName: r.employeeName,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      device: r.device,
      ipAddress: r.ipAddress,
      photoUrl: r.photoUrl,
      approver: r.approverId?.username || null
    }));
    
    return res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('Get login requests error:', err);
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอ' });
  }
};

// ดึงประวัติคำขอ login (สำหรับ admin/HR)
exports.getLoginRequestHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    // สร้าง query filter
    const filter = {};
    
    // กรองตามสถานะ
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // กรองตามวันที่
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }
    
    // กรองตามการค้นหา
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { employeeName: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // ดึงข้อมูลประวัติ
    const [requests, totalCount] = await Promise.all([
      LoginRequest.find(filter).lean()
        .populate('userId', 'username employee')
        .populate('approverId', 'username employee')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LoginRequest.countDocuments(filter)
    ]);

    // จัดรูปแบบข้อมูล
    const formatted = requests.map(r => ({
      requestId: r.requestId,
      username: r.username,
      employeeName: r.employeeName,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      processedAt: r.processedAt,
      approvedAt: r.approvedAt,
      device: r.device,
      ipAddress: r.ipAddress,
      photoUrl: r.photoUrl,
      approver: r.approverId ? {
        username: r.approverId.username,
        name: r.approverId.employee?.name || r.approverId.username
      } : null,
      approverName: r.approverName,
      approverNote: r.approverNote,
      loginSuccessAt: r.loginSuccessAt,
      logoutAt: r.logoutAt,
      sessionDuration: r.sessionDuration,
      usageCount: r.usageCount,
      lastUsedAt: r.lastUsedAt,
      auditLog: r.auditLog || []
    }));

    // คำนวณสถิติ
    const stats = await getLoginRequestStats();
    
    return res.json({
      success: true,
      data: formatted,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      },
      stats
    });
  } catch (err) {
    console.error('Get login request history error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการดึงประวัติคำขอ' 
    });
  }
};

// ฟังก์ชันช่วยสำหรับคำนวณสถิติ
async function getLoginRequestStats() {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const [
      pendingCount,
      todayStats,
      totalStats
    ] = await Promise.all([
      // คำขอที่รออนุมัติ
      LoginRequest.countDocuments({ 
        status: 'pending', 
        expiresAt: { $gt: new Date() } 
      }),
      
      // สถิติวันนี้
      LoginRequest.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart, $lte: todayEnd }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // สถิติรวม
      LoginRequest.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // จัดรูปแบบสถิติ
    const todayStatsMap = {};
    todayStats.forEach(stat => {
      todayStatsMap[stat._id] = stat.count;
    });

    const totalStatsMap = {};
    totalStats.forEach(stat => {
      totalStatsMap[stat._id] = stat.count;
    });

    return {
      pending: pendingCount,
      today: {
        total: Object.values(todayStatsMap).reduce((sum, count) => sum + count, 0),
        approved: todayStatsMap.approved || 0,
        rejected: todayStatsMap.rejected || 0,
        expired: todayStatsMap.expired || 0,
        used: todayStatsMap.used || 0
      },
      overall: {
        total: Object.values(totalStatsMap).reduce((sum, count) => sum + count, 0),
        approved: totalStatsMap.approved || 0,
        rejected: totalStatsMap.rejected || 0,
        expired: totalStatsMap.expired || 0,
        used: totalStatsMap.used || 0
      }
    };
  } catch (err) {
    console.error('Get login request stats error:', err);
    return {
      pending: 0,
      today: { total: 0, approved: 0, rejected: 0, expired: 0, used: 0 },
      overall: { total: 0, approved: 0, rejected: 0, expired: 0, used: 0 }
    };
  }
}

// สำหรับตรวจสอบ token ที่ได้จากการอนุมัติ
exports.loginWithApprovedToken = async (req, res) => {
  try {
    const { requestId } = req.body;
    
    // Add validation
    if (!requestId) {
      return res.status(400).json({ 
        success: false, 
        error: 'กรุณาระบุ requestId' 
      });
    }
    
    // console.log('Looking for approved request:', requestId);
    
    const request = await LoginRequest.findOne({
      requestId,
      status: 'approved',
      expiresAt: { $gt: new Date() }
    });
    
    if (!request) {
      // console.log('Request not found or invalid:', {
        requestId,
        currentTime: new Date()
      });
      
      // Check if request exists but with different status
      const anyRequest = await LoginRequest.findOne({ requestId }).lean();
      if (anyRequest) {
        // console.log('Request found with status:', anyRequest.status);
        if (anyRequest.status === 'used') {
          return res.status(400).json({ 
            success: false, 
            error: 'คำขอนี้ถูกใช้งานไปแล้ว' 
          });
        }
        if (anyRequest.status === 'expired' || anyRequest.expiresAt < new Date()) {
          return res.status(400).json({ 
            success: false, 
            error: 'คำขอนี้หมดอายุแล้ว' 
          });
        }
      }
      
      return res.status(404).json({ 
        success: false, 
        error: 'ไม่พบคำขอที่อนุมัติแล้ว หรือหมดอายุ' 
      });
    }

    // Check if token exists
    if (!request.token) {
      console.error('Approved request has no token:', requestId);
      return res.status(500).json({ 
        success: false, 
        error: 'คำขอไม่มี token กรุณาติดต่อผู้ดูแลระบบ' 
      });
    }

    // Update status to used และเพิ่ม audit log
    request.status = 'used';
    request.loginSuccessAt = new Date();
    request.usageCount = (request.usageCount || 0) + 1;
    request.lastUsedAt = new Date();
    
    // เพิ่ม audit log
    await request.addAuditLog(
      'used',
      request.userId,
      'Token used for successful login',
      normalizeIP(getRealIP(req))
    );
    
    await request.save();

    // Get user data
    const user = await User.findById(request.userId).lean()
      .populate('employee', 'name email imageUrl')
      .populate('role', 'name permissions allowedPages')
      .populate('allowedBranches', 'name branch_code')
      .populate('defaultBranches', 'name branch_code');

    if (!user) {
      console.error('User not found for request:', requestId, request.userId);
      return res.status(404).json({ 
        success: false, 
        error: 'ไม่พบข้อมูลผู้ใช้' 
      });
    }

    const userData = {
      _id:             user._id,
      username:        user.username,
      name:            user.employee?.name || '',
      email:           user.employee?.email || '',
      photoUrl:        buildPhotoUrl(user.employee?.imageUrl, req),
      role:            {
        _id: user.role?._id,
        name: user.role?.name || '',
        allowedPages: user.role?.allowedPages || []
      },
      allowedPages:    user.role?.allowedPages || [],
      allowedBranches: user.allowedBranches,
      checkinBranches: user.checkinBranches,
      defaultBranches: user.defaultBranches,
      defaultBranch:
        (user.defaultBranches[0]?._id || user.defaultBranches[0]?.id)
        || (user.allowedBranches[0]?._id || user.allowedBranches[0]?.id)
        || null
    };

    // console.log('Login with approved token successful:', user.username);

    return res.json({
      success: true,
      token: request.token,
      user: userData
    });

  } catch (err) {
    console.error('Login with approved token error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Cleanup ฟังก์ชันสำหรับ expired requests
async function cleanupExpiredRequests() {
  try {
    const result = await LoginRequest.updateMany(
      { status:'pending', expiresAt:{ $lt: new Date() } },
      { $set:{ status:'expired' } }
    );
    // console.log(`Cleaned up ${result.modifiedCount} expired login requests`);
  } catch (err) {
    console.error('Cleanup expired requests error:', err);
  }
}
setInterval(cleanupExpiredRequests, 5*60*1000);

// ============ LOGIN REQUEST SECTION END ============

// ===== QR LOGIN SECTION START =====
const pendingSessions = new Map();

exports.checkQRLoginStatus = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ success:false, error:'Session ID is required' });
    const session = pendingSessions.get(sessionId);
    if (!session) return res.json({ success:true, status:'pending' });
    if (session.status === 'completed') {
      pendingSessions.delete(sessionId);
      return res.json({ success:true, status:'completed', token:session.token, user:session.user });
    }
    if (Date.now() - session.timestamp > 5*60*1000) {
      pendingSessions.delete(sessionId);
      return res.json({ success:true, status:'expired' });
    }
    return res.json({ success:true, status:'pending' });
  } catch (err) {
    console.error('QR login status error:', err);
    res.status(500).json({ success:false, error:'Server error' });
  }
};

exports.confirmQRLogin = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { sessionId, userId, timestamp } = req.body;
    if (!sessionId || !userId) {
      return res.status(400).json({ success:false, error:'Missing required fields' });
    }
    if (req.user.id.toString() !== userId) {
      return res.status(401).json({ success:false, error:'Unauthorized' });
    }
    if (timestamp && Math.abs(Date.now() - timestamp) > 30000) {
      return res.status(400).json({ success:false, error:'Request expired' });
    }
    
    const user = await User.findById(req.user.id).lean()
      .select('-password +currentSession')
      .populate('employee','name email imageUrl')
      .populate('role','name permissions allowedPages')
      .populate('allowedBranches','name branch_code')
      .populate('defaultBranches','name branch_code');
      
    if (!user) return res.status(404).json({ success:false, error:'User not found' });

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been blocked'
      });
    }

    // ✅ สร้าง token แบบไม่หมดอายุ
    const payload = {
      userId:       user._id.toString(),
      username:     user.username,
      role:         user.role?.name || '',
      sessionType:  'qr-login'
    };
    const token = jwt.sign(payload, SECRET); // ไม่ใส่ expiresIn

    // ✅ สร้าง session ใหม่ (จะเด้ง session เก่าออก)
    const qrIP = normalizeIP(getRealIP(req)); // ใช้ IP จริงแทน hardcode
    await user.createSession(token, qrIP, 'QR Login', 'QR Scanner');

    const userInfo = {
      _id:              user._id,
      username:         user.username,
      name:             user.employee?.name || '',
      email:            user.employee?.email || '',
      photoUrl:         buildPhotoUrl(user.employee?.imageUrl, req) || null,
      role:             user.role?.name || '',
      allowedPages:     user.role?.allowedPages || [],
      allowedBranches:  user.allowedBranches || [],
      defaultBranches:  user.defaultBranches || [],
      department:       user.employee?.department || '',
      position:         user.employee?.position || ''
    };

    pendingSessions.set(sessionId, {
      status: 'completed',
      timestamp: Date.now(),
      token,
      user: userInfo
    });

    io.to(sessionId).emit('qrLoginSuccess', { sessionId, token, user: userInfo });

    return res.json({ success:true, message:'Login confirmed successfully' });
  } catch (err) {
    console.error('QR login confirm error:', err);
    return res.status(500).json({ success:false, error:'Server error' });
  }
};

// Cleanup expired sessions
const cleanupExpiredSessions = () => {
  const now = Date.now();
  for (const [id, session] of pendingSessions) {
    if (now - session.timestamp > 5*60*1000) {
      pendingSessions.delete(id);
    }
  }
};
setInterval(cleanupExpiredSessions, 60000);

exports.pendingSessions = pendingSessions;
// ===== QR LOGIN SECTION END =====

/**
 * POST /signup
 * สร้างผู้ใช้ใหม่ พร้อมกำหนดสาขาและสาขาเริ่มต้นเช็คอิน
 */
exports.createUser = async (req, res) => {
  const io = req.app.get('io');
  try {
    const {
      employee,
      username,
      password,
      role,
      allowedPages = [],
      allowedBranches = [],
      checkinBranches = [],
      defaultBranches = [],
      defaultBranch = null
    } = req.validatedBody;

    // console.log('📝 Create User Payload:', {
      employee,
      username,
      role,
      allowedPages,
      allowedBranches,
      checkinBranches,
      defaultBranches,
      defaultBranch
    });

    const emp = await Employee.findOne({ _id: employee, deleted_at: null }).lean();
    if (!emp) {
      return res.status(404).json({ success: false, error: 'ไม่พบพนักงานที่เลือก' });
    }

    const userRole = await UserRole.findById(role).lean();
    if (!userRole) {
      return res.status(400).json({ success: false, error: 'Role ไม่ถูกต้อง' });
    }

    if (await User.findOne({ employee: emp._id }).lean()) {
      return res.status(400).json({ success: false, error: 'พนักงานนี้สมัครไปแล้ว' });
    }
    if (await User.findOne({ username }).lean()) {
      return res.status(409).json({ success: false, error: 'Username นี้ถูกใช้งานแล้ว' });
    }

    // อัปเดต role ให้มี allowedPages (ถ้าไม่ใช่ admin)
    const isAdmin = userRole.name.toLowerCase() === 'admin';
    if (!isAdmin && allowedPages.length > 0) {
      // อัปเดต allowedPages ใน role
      userRole.allowedPages = allowedPages;
      await userRole.save();
      // console.log('✅ Updated role allowedPages:', userRole.allowedPages);
    }

    // จัดการ allowedBranches
    const branchIds = [];
    const branchesToProcess = allowedBranches.length > 0 ? allowedBranches : checkinBranches;
    
    for (const b of branchesToProcess) {
      if (b === '*') {
        branchIds.push('*');
        break;
      }
      if (objectIdPattern.test(b)) {
        branchIds.push(b);
      } else {
        const br = await Branch.findOne({ branch_code: b, deleted_at: null }).lean();
        if (br) branchIds.push(br._id);
      }
    }

    // จัดการ defaultBranches
    const defaultBranchIds = [];
    const defaultBranchesToProcess = defaultBranches.length > 0 ? defaultBranches : 
                                   (defaultBranch ? [defaultBranch] : checkinBranches.slice(0, 1));
    
    for (const db of defaultBranchesToProcess) {
      if (objectIdPattern.test(db)) {
        defaultBranchIds.push(db);
      } else {
        let br =
          await Branch.findOne({ branch_code: db, deleted_at: null }).lean() ||
          await Branch.findOne({ name: db, deleted_at: null }).lean();
        if (br) defaultBranchIds.push(br._id);
      }
    }

    const newUser = new User({
      employee:        emp._id,
      username,
      password,
      role:            userRole._id,
      allowedBranches: branchIds,
      checkinBranches: branchIds, // ใช้ค่าเดียวกันกับ allowedBranches
      defaultBranches: defaultBranchIds
    });
    const savedUser = await newUser.save();

    // console.log('✅ User created successfully:', {
      id: savedUser._id,
      username: savedUser.username,
      role: userRole.name,
      allowedBranches: savedUser.allowedBranches,
      checkinBranches: savedUser.checkinBranches
    });

    io.emit('newuserCreated', {
      id: savedUser._id,
      data: savedUser
    });

    const user = await User.findById(savedUser._id).lean()
      .select('-password -__v')
      .populate('employee', 'name email imageUrl')
      .populate('role', 'name permissions allowedPages')
      .populate('allowedBranches', 'name branch_code')
      .populate('defaultBranches', 'name branch_code');

    const userData = user.toObject();
    userData.photoUrl = buildPhotoUrl(user.employee?.imageUrl, req);

    return res.status(201).json({
      success: true,
      data: userData
    });
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// POST /login - เพิ่มการตรวจสอบ attendance
exports.loginUser = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { username, password } = req.validatedBody;
    const user = await User.findOne({ username }).lean()
      .select('+currentSession') // เพิ่ม select currentSession
      .populate('employee', 'name email imageUrl')
      .populate('role', 'name permissions allowedPages')
      .populate('allowedBranches', 'name branch_code')
      .populate('defaultBranches', 'name branch_code');
      
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        error: 'Your account has been blocked. Reason: ' + (user.blockReason || 'No reason provided')
      });
    }

    // ============ ตรวจสอบ Attendance Status ============
    const attendanceStatus = await checkUserAttendanceStatus(user._id);

    // debug log for attendance status
    // console.log('Attendance Status:', {
      userId: user._id,
      username: user.username,
      isCheckedIn: attendanceStatus.isCheckedIn,
      isCheckedOut: attendanceStatus.isCheckedOut,
      message: attendanceStatus.message,
      checkOutTime: attendanceStatus.checkOutTime
    });

    // ถ้ายังไม่ได้เช็คอิน หรือ เช็คเอาท์แล้ว
    if (!attendanceStatus.isCheckedIn) {
      const isAdmin = user.role?.name === 'admin' || 
                      user.role?.name === 'Super Admin' || 
                      user.role?.name === 'CEO' || 
                      user.role?.allowedPages?.includes('*');

      // debug log for admin check
      // console.log('Admin Check:', {
        username: user.username,
        roleName: user.role?.name,
        allowedPages: user.role?.allowedPages,
        isAdmin: isAdmin
      });

      // debug log before sending attendance_required response
      // console.log('Sending attendance_required response:', {
        requireApproval: attendanceStatus.isCheckedOut,
        isCheckedOut: attendanceStatus.isCheckedOut
      });

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'attendance_required',
          message: attendanceStatus.isCheckedOut
            ? 'คุณได้เช็คเอาท์แล้ว ต้องขออนุมัติเพื่อเข้าสู่ระบบ'
            : 'กรุณาเช็คอินผ่านแอพก่อนเข้าสู่ระบบ',
          requireApproval: attendanceStatus.isCheckedOut || false,
          attendanceStatus
        });
      }
    }

    // ============ Continue normal login flow ============
    // ✅ ดึง IP และ device info
    const clientIP = normalizeIP(getRealIP(req));
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const device = /mobile/i.test(userAgent) ? 'Mobile' : 'Desktop';

    // Log IP for debugging (optional)
    if (process.env.NODE_ENV === 'development') {
      // console.log('Login IP:', {
        username: user.username,
        clientIP,
        headers: {
          'x-forwarded-for': req.headers['x-forwarded-for'],
          'x-real-ip': req.headers['x-real-ip'],
          'cf-connecting-ip': req.headers['cf-connecting-ip'],
          'req.ip': req.ip
        }
      });
    }

    // ✅ ถ้ามี session เก่าจาก IP อื่น -> ส่ง notification
    if (user.currentSession && user.currentSession.ip !== clientIP) {
      io.emit('session_terminated', {
        userId: user._id,
        username: user.username,
        message: 'บัญชีของคุณถูก login จากที่อื่น',
        oldIP: user.currentSession.ip,
        newIP: clientIP,
        timestamp: new Date()
      });
    }

    // ✅ สร้าง token ไม่มีวันหมดอายุ
    const payload = {
      userId:   user._id.toString(),
      username: user.username,
      role:     user.role?.name || ''
    };
    const token = jwt.sign(payload, SECRET); // ไม่ใส่ expiresIn

    // ✅ สร้าง session ใหม่ (จะเด้ง session เก่าออก)
    await user.createSession(token, clientIP, device, userAgent);

    io.emit('userLoggedIn', {
      id: user._id,
      username: user.username,
      name: user.employee?.name || user.username,
      ip: clientIP,
      timestamp: new Date()
    });

    const userData = {
      _id:             user._id,
      username:        user.username,
      name:            user.employee?.name || '',
      email:           user.employee?.email || '',
      photoUrl:        buildPhotoUrl(user.employee?.imageUrl, req),
      role:            {
        _id: user.role?._id,
        name: user.role?.name || '',
        allowedPages: user.role?.allowedPages || []
      },
      allowedPages:    user.role?.allowedPages || [],
      allowedBranches: user.allowedBranches,
      checkinBranches: user.checkinBranches,
      defaultBranches: user.defaultBranches,
      defaultBranch:
        (user.defaultBranches[0]?._id || user.defaultBranches[0]?.id)
        || (user.allowedBranches[0]?._id || user.allowedBranches[0]?.id)
        || null
    };

    return res.json({
      success: true,
      token,
      user: userData,
      message: `Login สำเร็จจาก IP: ${clientIP}`
    });

  } catch (err) {
    console.error('loginUser error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * GET /me
 * คืนข้อมูลผู้ใช้ที่ล็อกอิน พร้อมสาขาและสาขาที่อนุญาต
 */
exports.getLoggedInUser = async (req, res) => {
  const io = req.app.get('io');
  try {
    const user = await User.findById(req.user.id).lean()
      .select('-password')
      .populate('employee', 'name email imageUrl')
      .populate('role', 'name permissions allowedPages')
      .populate('allowedBranches', 'name branch_code')
      .populate('checkinBranches', 'name branch_code')
      .populate('defaultBranches', 'name branch_code');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = {
      _id:             user._id,
      username:        user.username,
      name:            user.employee?.name || '',
      email:           user.employee?.email || '',
      photoUrl:        buildPhotoUrl(user.employee?.imageUrl, req),
      role:            user.role?.name || '',
      allowedPages:    user.role?.allowedPages || [],
      allowedBranches: user.allowedBranches,
      checkinBranches: user.checkinBranches,
      defaultBranches: user.defaultBranches,
      defaultBranch:
        (user.defaultBranches[0]?._id || user.defaultBranches[0]?.id)
        || (user.allowedBranches[0]?._id || user.allowedBranches[0]?.id)
        || null
    };

    return res.json({ success: true, data: userData });
  } catch (err) {
    console.error('getLoggedInUser error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * GET /
 * ดึงรายชื่อผู้ใช้ทั้งหมด
 */
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const users = await User.find().lean()
      .populate('employee', 'name email imageUrl')
      .populate('role', 'name permissions allowedPages')
      .populate('allowedBranches', 'name branch_code')
      .populate('checkinBranches', 'name branch_code')
      .populate('defaultBranches', 'name branch_code')
      .select('-password +isBlocked')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const data = users.map(u => ({
      ...u,
      photoUrl: buildPhotoUrl(u.employee?.imageUrl, req)
    }));

    const total = await User.countDocuments();

    return res.json({ 
      success: true, 
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('getAllUsers error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * GET /:id
 * ดึงข้อมูลผู้ใช้ตาม id
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean()
      .populate('employee', 'name email imageUrl')
      .populate('role', 'name permissions allowedPages')
      .populate('allowedBranches', 'name branch_code')
      .populate('checkinBranches', 'name branch_code')
      .populate('defaultBranches', 'name branch_code')
      .select('-password +isBlocked')
      .lean();
      
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const data = {
      ...user,
      photoUrl: buildPhotoUrl(user.employee?.imageUrl, req)
    };

    return res.json({ success: true, data });
  } catch (err) {
    console.error('getUserById error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * PATCH /:id
 * อัปเดตข้อมูลผู้ใช้ (รวมสาขา, สาขาเริ่มต้น)
 */
exports.updateUser = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { username, password, role, allowedPages, allowedBranches, checkinBranches, defaultBranches, isBlocked } = req.validatedBody;
    
    const user = await User.findById(req.params.id).lean().select('+isBlocked');
    
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // จัดการ role และ allowedPages
    let currentRole;
    if (role && role.toString() !== user.role.toString()) {
      // กรณีเปลี่ยน role
      const newRole = await UserRole.findById(role).lean();
      if (!newRole) return res.status(400).json({ success: false, error: 'Role ไม่ถูกต้อง' });
      user.role = newRole._id;
      currentRole = newRole;
    } else {
      // กรณีไม่เปลี่ยน role แต่อาจเปลี่ยน allowedPages
      currentRole = await UserRole.findById(user.role).lean();
    }
    
    // อัปเดต allowedPages ใน role (ถ้าไม่ใช่ admin)
    if (currentRole && allowedPages !== undefined) {
      const isAdmin = currentRole.name.toLowerCase().includes('admin') || 
                     currentRole.name.toLowerCase().includes('ceo') ||
                     currentRole.name.toLowerCase().includes('super') ||
                     currentRole.name.toLowerCase().includes('นักพัฒนา');
      
      if (!isAdmin) {
        currentRole.allowedPages = allowedPages;
        await currentRole.save();
      }
    }

    if (username && username !== user.username) {
      if (await User.findOne({ username }).lean()) {
        return res.status(409).json({ success: false, error: 'Username นี้ถูกใช้งานแล้ว' });
      }
      user.username = username;
    }
    if (password) user.password = password;
    if (allowedBranches !== undefined && Array.isArray(allowedBranches)) user.allowedBranches = allowedBranches;
    if (checkinBranches !== undefined && Array.isArray(checkinBranches)) user.checkinBranches = checkinBranches;
    if (defaultBranches !== undefined && Array.isArray(defaultBranches)) user.defaultBranches = defaultBranches;
    
    // จัดการสถานะ isBlocked
    if (typeof isBlocked === 'boolean') {
      user.isBlocked = isBlocked;
      if (isBlocked) {
        // ถ้าบล็อก ให้ force logout
        user.isOnline = false;
        user.blockedAt = new Date();
        user.blockedBy = req.user?.id;
        user.blockReason = 'Blocked by admin';
      } else {
        // ถ้าปลดบล็อก ให้ล้างข้อมูลการบล็อก
        user.blockedAt = null;
        user.blockedBy = null;
        user.blockReason = null;
      }
    }

    const updatedUser = await user.save();

    // Query user ใหม่พร้อม populate เพื่อส่งกลับ response
    const populatedUser = await User.findById(updatedUser._id).lean()
      .populate('employee', 'name email imageUrl')
      .populate('role', 'name permissions allowedPages')
      .populate('allowedBranches', 'name branch_code')
      .populate('checkinBranches', 'name branch_code')
      .populate('defaultBranches', 'name branch_code')
      .select('+isBlocked');

    const updated = populatedUser.toObject();
    updated.photoUrl = buildPhotoUrl(populatedUser.employee?.imageUrl, req);

    io.emit('userUpdated', {
      id: updatedUser._id,
      data: updated
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * DELETE /:id
 * ลบผู้ใช้
 */
exports.deleteUser = async (req, res) => {
  const io = req.app.get('io');
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    io.emit('userDeleted', {
      id: user._id,
      data: user
    });

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// logout
exports.logoutUser = async (req, res) => {
  const io = req.app.get('io');
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // ✅ ใช้ method logout() แทน
    await user.logout('manual');

    io.emit('userLoggedOut', {
      id: user._id,
      username: user.username,
      timestamp: new Date()
    });

    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('logoutUser error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// alias deleteUser เป็น forceDeleteUser
exports.forceDeleteUser = exports.deleteUser;

exports.getOnlineUsers = async (req, res) => {
  try {
    const users = await User.find({ isOnline: true }).lean()
      .populate('employee', 'name imageUrl')
      .select('username employee currentSession');
      
    const data = users.map(u => ({
      _id: u._id,
      username: u.username,
      name: u.employee?.name || u.username,
      photoUrl: buildPhotoUrl(u.employee?.imageUrl, req),
      sessionInfo: u.currentSession ? {
        loginTime: u.currentSession.loginAt,
        device: u.currentSession.device,
        ipAddress: u.currentSession.ip,
        lastActivity: u.currentSession.lastActivity
      } : null
    }));
    
    res.json({ success: true, data });
  } catch (err) {
    console.error('getOnlineUsers error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getBlockedUsers = async (req, res) => {
  try {
    const users = await User.find({ isBlocked: true }).lean()
      .populate('employee', 'name imageUrl')
      .select('username employee blockReason blockedAt');
    const data = users.map(u => ({
      _id: u._id,
      username: u.username,
      name: u.employee?.name || u.username,
      photoUrl: buildPhotoUrl(u.employee?.imageUrl, req),
      blockReason: u.blockReason,
      blockedAt:   u.blockedAt
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('getBlockedUsers error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * POST /heartbeat
 * อัปเดตเวลาล่าสุดของ session (keep-alive)
 */
// exports.heartbeatUser ถูกลบออก

/**
 * POST /api/users/:id/kick
 * เตะ user ออกจากระบบ (ยกเลิก session ปัจจุบัน)
 */
exports.kickUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const byUser   = req.user.id;

    const user = await User.findById(targetId).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Force logout
    await user.logout('admin_force');

    const io = req.app.get('io');
    io.to(`user-${targetId}`).emit('kicked', {
      reason: 'You have been kicked by admin',
      kickedBy: byUser
    });

    const sockets = await io.in(`user-${targetId}`).fetchSockets();
    for (const s of sockets) {
      s.disconnect(true);
    }

    return res.json({ success: true, message: 'User kicked successfully' });
  } catch (err) {
    console.error('kickUser error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// บล็อกผู้ใช้
exports.blockUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'ไม่พบผู้ใช้' });
    }
    if (user.isBlocked) {
      return res.status(400).json({ success: false, error: 'ผู้ใช้นี้ถูกบล็อกอยู่แล้ว' });
    }
    const adminRole = await UserRole.findById(user.role).lean();
    if (adminRole?.name === 'admin') {
      return res.status(403).json({ success: false, error: 'ไม่สามารถบล็อกผู้ดูแลระบบได้' });
    }
    
    // บล็อกและ logout
    user.isBlocked = true;
    user.blockReason = reason || 'ไม่ระบุเหตุผล';
    user.blockedAt = new Date();
    user.blockedBy = req.user.id;
    await user.save();
    
    // Force logout
    await user.logout('blocked');
    
    const io = req.app.get('io');
    io.emit('userBlocked', { userId: user._id, username: user.username, reason });
    io.to(`user-${user._id}`).emit('forceLogout', {
      reason: 'คุณถูกบล็อกโดยผู้ดูแลระบบ',
      blockReason: reason
    });
    
    const sockets = await io.in(`user-${user._id}`).fetchSockets();
    for (const s of sockets) s.disconnect(true);
    
    // console.log(`User ${user.username} blocked by ${req.user.username} - Reason: ${reason}`);
    res.json({ success: true, message: 'บล็อกผู้ใช้เรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Block user error:', err);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการบล็อกผู้ใช้' });
  }
};

// ปลดบล็อกผู้ใช้
exports.unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'ไม่พบผู้ใช้' });
    }
    if (!user.isBlocked) {
      return res.status(400).json({ success: false, error: 'ผู้ใช้นี้ไม่ได้ถูกบล็อก' });
    }
    user.isBlocked = false;
    user.blockReason = null;
    user.blockedAt = null;
    await user.save();
    const io = req.app.get('io');
    io.emit('userUnblocked', { userId: user._id, username: user.username });
    // console.log(`User ${user.username} unblocked by ${req.user.username}`);
    res.json({ success: true, message: 'ปลดบล็อกผู้ใช้เรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Unblock user error:', err);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการปลดบล็อกผู้ใช้' });
  }
};

// ดู sessions ของผู้ใช้
exports.getUserSessions = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean()
      .select('username currentSession loginHistory');
      
    if (!user) {
      return res.status(404).json({ success: false, error: 'ไม่พบผู้ใช้' });
    }
    
    const sessions = [];
    
    // Current session
    if (user.currentSession) {
      sessions.push({
        sessionId: 'current',
        device: user.currentSession.device,
        ipAddress: user.currentSession.ip,
        loginTime: user.currentSession.loginAt,
        lastActivity: user.currentSession.lastActivity,
        active: true,
        userAgent: user.currentSession.userAgent,
        status: 'active'
      });
    }
    
    // Login history (past sessions)
    user.loginHistory.forEach(history => {
      sessions.push({
        sessionId: `history-${history._id}`,
        device: history.device,
        ipAddress: history.ip,
        loginTime: history.loginAt,
        logoutTime: history.logoutAt,
        active: false,
        userAgent: history.userAgent,
        status: 'terminated',
        logoutReason: history.logoutReason
      });
    });
    
    res.json({
      success: true,
      data: {
        username: user.username,
        sessions: sessions.sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime)),
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => s.active).length
      }
    });
  } catch (err) {
    console.error('Get user sessions error:', err);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล sessions' });
  }
};

// ✅ GET /api/users/current-session - เพิ่มใหม่
exports.getCurrentSession = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    
    if (!user.currentSession) {
      return res.json({ 
        success: false, 
        message: 'ไม่มี session ที่ active' 
      });
    }
    
    res.json({
      success: true,
      session: {
        ip: user.currentSession.ip,
        device: user.currentSession.device,
        loginAt: user.currentSession.loginAt,
        lastActivity: user.currentSession.lastActivity
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล session' 
    });
  }
};

// ✅ GET /api/users/login-history - เพิ่มใหม่
exports.getLoginHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    
    res.json({
      success: true,
      history: user.loginHistory
        .sort((a, b) => b.loginAt - a.loginAt)
        .slice(0, 10) // แสดง 10 รายการล่าสุด
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการดึงประวัติ' 
    });
  }
};

// ============ AUTO-APPROVAL SETTINGS SECTION START ============

// ดึงการตั้งค่าอนุมัติอัตโนมัติ
exports.getAutoApprovalSettings = async (req, res) => {
  try {
    const settings = await AutoApprovalSettings.getSettings();
    
    return res.json({
      success: true,
      data: {
        enabled: settings.enabled,
        conditions: settings.conditions,
        stats: settings.stats,
        approvalNote: settings.approvalNote,
        lastModifiedAt: settings.lastModifiedAt,
        lastModifiedBy: settings.lastModifiedBy
      }
    });
  } catch (err) {
    console.error('Get auto-approval settings error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการดึงการตั้งค่า' 
    });
  }
};

// อัปเดตการตั้งค่าอนุมัติอัตโนมัติ
exports.updateAutoApprovalSettings = async (req, res) => {
  try {
    const { enabled, conditions, approvalNote } = req.body;
    const userId = req.user.id;
    
    const settings = await AutoApprovalSettings.getSettings();
    
    // อัปเดตการตั้งค่า
    if (typeof enabled === 'boolean') {
      settings.enabled = enabled;
    }
    
    if (conditions) {
      if (typeof conditions.approveAll === 'boolean') {
        settings.conditions.approveAll = conditions.approveAll;
      }
      
      if (conditions.timeBasedApproval) {
        Object.assign(settings.conditions.timeBasedApproval, conditions.timeBasedApproval);
      }
      
      if (conditions.roleBasedApproval) {
        Object.assign(settings.conditions.roleBasedApproval, conditions.roleBasedApproval);
      }
      
      if (conditions.dailyLimit) {
        Object.assign(settings.conditions.dailyLimit, conditions.dailyLimit);
      }
    }
    
    if (approvalNote) {
      settings.approvalNote = approvalNote;
    }
    
    settings.lastModifiedBy = userId;
    settings.lastModifiedAt = new Date();
    
    await settings.save();
    
    // console.log(`🤖 Auto-approval settings updated by user ${userId}:`, {
      enabled: settings.enabled,
      conditions: settings.conditions
    });
    
    // ถ้าเปิดใช้งานอนุมัติอัตโนมัติ ให้อนุมัติคำขอที่รออนุมัติทั้งหมด
    if (settings.enabled) {
      try {
        const result = await AutoApprovalService.approveAllPendingRequests();
        
        // ส่งแจ้งเตือนผ่าน Socket.IO
        const io = req.app.get('io');
        if (io && result.approvedCount > 0) {
          io.emit('autoApprovalEnabled', {
            approvedCount: result.approvedCount,
            totalRequests: result.totalRequests,
            message: `อนุมัติอัตโนมัติ: อนุมัติคำขอ ${result.approvedCount} รายการ`
          });
        }
        
        return res.json({
          success: true,
          message: `บันทึกการตั้งค่าเรียบร้อย${result.approvedCount > 0 ? ` และอนุมัติคำขอ ${result.approvedCount} รายการ` : ''}`,
          autoApprovalResult: result
        });
        
      } catch (autoApprovalError) {
        console.error('Error in auto-approval after settings update:', autoApprovalError);
        return res.json({
          success: true,
          message: 'บันทึกการตั้งค่าเรียบร้อย แต่เกิดข้อผิดพลาดในการอนุมัติอัตโนมัติ',
          autoApprovalError: autoApprovalError.message
        });
      }
    }
    
    return res.json({
      success: true,
      message: 'บันทึกการตั้งค่าเรียบร้อย'
    });
    
  } catch (err) {
    console.error('Update auto-approval settings error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า' 
    });
  }
};

// เปิด/ปิดอนุมัติอัตโนมัติ (สำหรับ toggle ง่ายๆ)
exports.toggleAutoApproval = async (req, res) => {
  try {
    const { enabled } = req.body;
    const userId = req.user.id;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุสถานะการเปิด/ปิด (enabled: true/false)'
      });
    }
    
    const settings = await AutoApprovalSettings.getSettings();
    settings.enabled = enabled;
    settings.lastModifiedBy = userId;
    settings.lastModifiedAt = new Date();
    
    await settings.save();
    
    // console.log(`🤖 Auto-approval ${enabled ? 'enabled' : 'disabled'} by user ${userId}`);
    
    // ถ้าเปิดใช้งาน ให้อนุมัติคำขอที่รออนุมัติทั้งหมด
    if (enabled) {
      try {
        const result = await AutoApprovalService.approveAllPendingRequests();
        
        return res.json({
          success: true,
          enabled: true,
          message: `เปิดใช้งานอนุมัติอัตโนมัติแล้ว${result.approvedCount > 0 ? ` และอนุมัติคำขอ ${result.approvedCount} รายการ` : ''}`,
          autoApprovalResult: result
        });
        
      } catch (autoApprovalError) {
        console.error('Error in auto-approval after toggle:', autoApprovalError);
        return res.json({
          success: true,
          enabled: true,
          message: 'เปิดใช้งานอนุมัติอัตโนมัติแล้ว แต่เกิดข้อผิดพลาดในการอนุมัติ',
          autoApprovalError: autoApprovalError.message
        });
      }
    }
    
    return res.json({
      success: true,
      enabled: false,
      message: 'ปิดใช้งานอนุมัติอัตโนมัติแล้ว'
    });
    
  } catch (err) {
    console.error('Toggle auto-approval error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการเปิด/ปิดอนุมัติอัตโนมัติ' 
    });
  }
};

// รันอนุมัติอัตโนมัติแบบ manual (สำหรับทดสอบหรือ force run)
exports.runAutoApproval = async (req, res) => {
  try {
    const result = await AutoApprovalService.approveAllPendingRequests();
    
    return res.json({
      success: true,
      message: result.message,
      data: result
    });
    
  } catch (err) {
    console.error('Manual auto-approval error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'เกิดข้อผิดพลาดในการรันอนุมัติอัตโนมัติ' 
    });
  }
};

// ============ AUTO-APPROVAL SETTINGS SECTION END ============
