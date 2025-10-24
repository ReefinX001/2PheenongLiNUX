// controllers/userController.js
const mongoose = require('mongoose');
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
  if (ip.substr(0, 7) === '::ffff:') {
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
    const user = await User.findOne({ username })
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

    // ✅ แก้ไข: เอา .lean() ออกเพื่อให้ได้ mongoose document ที่มี methods
    const request = await LoginRequest.findOne({ requestId, status: 'pending' });
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
          return res.status(500).json({
            success: false,
            error: 'ไม่พบข้อมูลผู้ใช้หลังจากอัปเดตสถานะแล้ว'
          });
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

        // ✅ สร้าง session ใหม่ - ใช้ User.findById โดยไม่ใช้ .lean()
        const userForSession = await User.findById(request.userId);
        if (userForSession) {
          try {
            await userForSession.createSession(
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
        }

        // ✅ บันทึก token ใน request document
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
      //   requestId,
      //   currentTime: new Date()
      // });

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
    //   employee,
    //   username,
    //   role,
    //   allowedPages,
    //   allowedBranches,
    //   checkinBranches,
    //   defaultBranches,
    //   defaultBranch
    // });

    const emp = await Employee.findOne({ _id: employee, deleted_at: null }).lean();
    if (!emp) {
      return res.status(404).json({ success: false, error: 'ไม่พบพนักงานที่เลือก' });
    }

    // ดึง role เป็น Mongoose document ไม่ใช้ .lean() เพื่อให้แก้ไขและ save() ได้
    const userRole = await UserRole.findById(role);
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
    //   id: savedUser._id,
    //   username: savedUser.username,
    //   role: userRole.name,
    //   allowedBranches: savedUser.allowedBranches,
    //   checkinBranches: savedUser.checkinBranches
    // });

    io.emit('newuserCreated', {
      id: savedUser._id,
      data: savedUser
    });

    const user = await User.findById(savedUser._id)
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
    console.log('🔍 Login attempt for username:', username);

    // ค้นหาผู้ใช้โดยไม่ populate ก่อน
    const user = await User.findOne({ username }).select('+currentSession');
    console.log('👤 User found:', !!user);

    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    console.log('🔑 Checking password for user:', user.username);
    if (!(await user.checkPassword(password))) {
      console.log('❌ Password check failed for user:', user.username);
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    console.log('✅ Password verified, populating user data...');

    // Populate ทีละส่วนเพื่อระบุว่าส่วนไหนเกิดข้อผิดพลาด
    try {
      await user.populate('employee', 'name email imageUrl');
      console.log('✅ Employee populated:', !!user.employee);
    } catch (err) {
      console.error('❌ Error populating employee:', err.message);
      user.employee = null;
    }

    try {
      await user.populate('role', 'name permissions allowedPages');
      console.log('✅ Role populated:', !!user.role);
    } catch (err) {
      console.error('❌ Error populating role:', err.message);
      user.role = null;
    }

    try {
      await user.populate('allowedBranches', 'name branch_code');
      console.log('✅ AllowedBranches populated:', user.allowedBranches?.length || 0);
    } catch (err) {
      console.error('❌ Error populating allowedBranches:', err.message);
      user.allowedBranches = [];
    }

    try {
      await user.populate('defaultBranches', 'name branch_code');
      console.log('✅ DefaultBranches populated:', user.defaultBranches?.length || 0);
    } catch (err) {
      console.error('❌ Error populating defaultBranches:', err.message);
      user.defaultBranches = [];
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
    //   userId: user._id,
    //   username: user.username,
    //   isCheckedIn: attendanceStatus.isCheckedIn,
    //   isCheckedOut: attendanceStatus.isCheckedOut,
    //   message: attendanceStatus.message,
    //   checkOutTime: attendanceStatus.checkOutTime
    // });

    // ถ้ายังไม่ได้เช็คอิน หรือ เช็คเอาท์แล้ว
    if (!attendanceStatus.isCheckedIn) {
      const isAdmin = user.role?.name === 'admin' ||
                      user.role?.name === 'Super Admin' ||
                      user.role?.name === 'CEO' ||
                      user.role?.allowedPages?.includes('*');

      // debug log for admin check
      // console.log('Admin Check:', {
      //   username: user.username,
      //   roleName: user.role?.name,
      //   allowedPages: user.role?.allowedPages,
      //   isAdmin: isAdmin
      // });

      // debug log before sending attendance_required response
      // console.log('Sending attendance_required response:', {
      //   requireApproval: attendanceStatus.isCheckedOut,
      //   isCheckedOut: attendanceStatus.isCheckedOut
      // });

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
      //   username: user.username,
      //   clientIP,
      //   headers: {
      //     'x-forwarded-for': req.headers['x-forwarded-for'],
      //     'x-real-ip': req.headers['x-real-ip'],
      //     'cf-connecting-ip': req.headers['cf-connecting-ip'],
      //     'req.ip': req.ip
      //   }
      // });
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
    // req.user มาจาก authJWT middleware ซึ่งเป็น Mongoose document ที่มี _id
    // ใช้ _id โดยตรงจาก req.user ที่ผ่าน authJWT middleware มา
    const userId = req.user._id || req.user.id;

    console.log('[getLoggedInUser] User ID from authJWT:', userId);
    console.log('[getLoggedInUser] User object:', {
      _id: req.user._id,
      username: req.user.username,
      hasEmployee: !!req.user.employee,
      hasRole: !!req.user.role
    });

    // ตรวจสอบว่ามี user ID หรือไม่
    if (!userId) {
      console.error('[getLoggedInUser] No user ID found in req.user');
      return res.status(400).json({ success: false, error: 'ไม่พบข้อมูลผู้ใช้ในระบบ' });
    }

    // ใช้ข้อมูลจาก authJWT ที่ populate มาแล้ว แทนการ query ใหม่
    // ถ้า authJWT ไม่ได้ populate บางส่วน ให้ query เพิ่ม
    let user = req.user;

    // ตรวจสอบว่า populate ครบหรือไม่ ถ้าไม่ครบให้ query ใหม่
    const needsFullQuery = !user.employee || !user.role || !user.allowedBranches;

    if (needsFullQuery) {
      console.log('[getLoggedInUser] Need full query - fetching complete user data...');
      user = await User.findById(userId).lean()
        .select('-password')
        .populate('employee', 'name email imageUrl')
        .populate('role', 'name permissions allowedPages')
        .populate('allowedBranches', 'name branch_code')
        .populate('checkinBranches', 'name branch_code')
        .populate('defaultBranches', 'name branch_code');

      if (!user) {
        console.error('[getLoggedInUser] User not found for ID:', userId);
        return res.status(404).json({ success: false, error: 'ไม่พบผู้ใช้ในระบบ' });
      }
    } else {
      console.log('[getLoggedInUser] Using data from authJWT middleware');
      // Convert Mongoose document to plain object if needed
      if (user.toObject) {
        user = user.toObject();
      }
    }

    // ตรวจสอบว่ามี employee reference หรือไม่
    if (!user.employee) {
      console.warn('[getLoggedInUser] ⚠️ Employee reference missing for user:', user.username);
      console.warn('[getLoggedInUser] This user may not have an employee record linked');
    }

    if (!user.role) {
      console.warn('[getLoggedInUser] ⚠️ Role reference missing for user:', user.username);
    }

    // สร้าง response data
    const userData = {
      _id:             user._id,
      username:        user.username,
      name:            user.employee?.name || user.username || 'ผู้ใช้',
      email:           user.employee?.email || '',
      photoUrl:        buildPhotoUrl(user.employee?.imageUrl, req),
      role:            user.role?.name || '',
      allowedPages:    user.role?.allowedPages || [],
      allowedBranches: user.allowedBranches || [],
      checkinBranches: user.checkinBranches || [],
      defaultBranches: user.defaultBranches || [],
      defaultBranch:
        (user.defaultBranches?.[0]?._id || user.defaultBranches?.[0]?.id)
        || (user.allowedBranches?.[0]?._id || user.allowedBranches?.[0]?.id)
        || null
    };

    console.log('[getLoggedInUser] ✅ Successfully returning user data:', {
      username: userData.username,
      name: userData.name,
      role: userData.role,
      hasPhoto: !!userData.photoUrl
    });

    return res.json({ success: true, data: userData });
  } catch (err) {
    console.error('[getLoggedInUser] ❌ Error:', err);

    // Provide more specific error messages
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'รูปแบบ ID ผู้ใช้ไม่ถูกต้อง' });
    }
    if (err.name === 'MongoNetworkError') {
      return res.status(503).json({ success: false, error: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้' });
    }

    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * GET /
 * ดึงรายชื่อผู้ใช้ทั้งหมด พร้อมระบบกรองและ pagination
 */
// Get users by branch ID - ดึงผู้ใช้ที่มีสิทธิ์เข้าถึงสาขาเฉพาะ
exports.getUsersByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    console.log('🔍 Getting users for branch:', branchId);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID is required'
      });
    }

    // Validate if branchId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format'
      });
    }

    // Get branch info for logging
    const branchInfo = await Branch.findById(branchId).select('name branch_code').lean();
    console.log(`🔍 Searching users for branch: ${branchInfo?.name || 'Unknown'} (${branchInfo?.branch_code || 'Unknown'}) - ID: ${branchId}`);

    // Find users who have access to this branch
    const users = await User.find({
      $and: [
        { isActive: true }, // Only active users
        {
          $or: [
            { allowedBranches: branchId },
            { checkinBranches: branchId },
            { defaultBranches: branchId }
          ]
        }
      ]
    })
    .populate('role', 'name permissions')
    .populate('employee', 'name position department')
    .populate('checkinBranches', 'name branch_code address')
    .populate('allowedBranches', 'name branch_code address')
    .populate('defaultBranches', 'name branch_code address')
    .select('-password -refreshToken')
    .sort({ 'employee.name': 1, fullName: 1, firstName: 1, username: 1 })
    .lean();

    console.log(`✅ Found ${users.length} users with access to branch ${branchInfo?.name || branchId}`);

    // Log which users were found
    if (users.length > 0) {
      console.log('👥 Users found:', users.map(u => ({
        name: u.employee?.name || u.fullName || `${u.firstName} ${u.lastName}`.trim() || u.username,
        role: u.role?.name,
        allowedBranches: u.allowedBranches?.map(b => b.name || b.branch_code),
        checkinBranches: u.checkinBranches?.map(b => b.name || b.branch_code)
      })));
    } else {
      console.log('⚠️ No users found for this branch. Checking total active users...');
      const totalActiveUsers = await User.countDocuments({ isActive: true });
      console.log(`📊 Total active users in system: ${totalActiveUsers}`);
    }

    // Log sample user for debugging
    if (users.length > 0) {
      console.log('📋 Sample user structure:', {
        id: users[0]._id,
        username: users[0].username,
        fullName: users[0].fullName,
        firstName: users[0].firstName,
        lastName: users[0].lastName,
        employee: users[0].employee,
        role: users[0].role?.name,
        checkinBranches: users[0].checkinBranches?.map(b => ({ name: b.name, code: b.branch_code })),
        allowedBranches: users[0].allowedBranches?.map(b => ({ name: b.name, code: b.branch_code }))
      });
    }

    return res.status(200).json({
      success: true,
      data: users,
      total: users.length,
      message: `Found ${users.length} users with access to this branch`
    });

  } catch (error) {
    console.error('❌ Error getting users by branch:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    console.log('🔍 getAllUsers called with query:', req.query);

    const page = parseInt(req.query.page) || 1;
    // If no limit specified, use large default for payroll/dropdown usage
    // If limit=0 is sent, remove limit entirely
    let limit = parseInt(req.query.limit);
    if (isNaN(limit)) {
      limit = 1000; // Default high limit
    } else if (limit === 0) {
      limit = null; // No limit
    }

    const skip = limit ? (page - 1) * limit : 0;

    console.log(`📊 Pagination settings: page=${page}, limit=${limit || 'unlimited'}, skip=${skip}`);

    // ระบบกรองข้อมูล
    const { role, branch, status, search } = req.query;
    const filter = {};

    // กรองตาม role
    if (role && role !== 'all') {
      filter.role = role;
    }

    // กรองตาม branch
    if (branch && branch !== 'all') {
      try {
        console.log(`Branch filter requested: ${branch}`);

        // Always look up branch by code first since frontend sends branch_code
        let branchDoc = null;
        try {
          branchDoc = await Branch.findOne({
            $or: [
              { branch_code: branch },
              { name: branch }
            ]
          });
        } catch (findError) {
          console.error('Error finding branch:', findError);
        }

        if (branchDoc) {
          console.log(`Branch found: ${branchDoc.name} (${branchDoc.branch_code})`);

          // Now filter users by the branch's ObjectId
          filter['$and'] = filter['$and'] || [];
          filter['$and'].push({
            $or: [
              { allowedBranches: branchDoc._id },
              { checkinBranches: branchDoc._id },
              { defaultBranches: branchDoc._id }
            ]
          });
        } else {
          // Check if it's a valid ObjectId (for backward compatibility)
          if (mongoose.Types.ObjectId.isValid(branch) && branch.length === 24) {
            console.log(`Using branch as ObjectId directly: ${branch}`);
            filter['$and'] = filter['$and'] || [];
            filter['$and'].push({
              $or: [
                { allowedBranches: branch },
                { checkinBranches: branch },
                { defaultBranches: branch }
              ]
            });
          } else {
            console.log(`Branch not found: ${branch}`);
            // Return empty result if branch not found
            filter._id = new mongoose.Types.ObjectId(); // Non-existent ID
          }
        }
      } catch (branchError) {
        console.error('Branch filtering error:', branchError);
        console.error('Branch parameter was:', branch);
        // Return empty result on error
        filter._id = new mongoose.Types.ObjectId();
      }
    }

    // กรองตามสถานะ
    if (status && status !== 'all') {
      if (status === 'active') {
        filter.isBlocked = false;
      } else if (status === 'inactive') {
        filter.isBlocked = true;
      }
    }

    // กรองตามการค้นหา
    if (search) {
      filter['$and'] = filter['$and'] || [];
      filter['$and'].push({
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { 'employee.name': { $regex: search, $options: 'i' } },
          { 'employee.email': { $regex: search, $options: 'i' } }
        ]
      });
    }

    let query = User.find(filter)
      .populate('employee', 'name email imageUrl position department branch salary employeeId')
      .populate('role', 'name permissions allowedPages')
      .populate('allowedBranches', 'name branch_code')
      .populate('checkinBranches', 'name branch_code')
      .populate('defaultBranches', 'name branch_code')
      .select('username role employee allowedBranches checkinBranches defaultBranches isBlocked isOnline lastSeen createdAt updatedAt')
      .sort({ createdAt: -1 });

    // Apply limit and skip only if limit is specified
    if (limit) {
      query = query.limit(limit).skip(skip);
    }

    const users = await query.lean();

    const data = users.map(u => ({
      ...u,
      photoUrl: buildPhotoUrl(u.employee?.imageUrl, req)
    }));

    const total = await User.countDocuments(filter);

    console.log(`✅ getAllUsers returning ${data.length} users out of ${total} total (page ${page}, limit ${limit || 'unlimited'})`);

    const response = {
      success: true,
      data,
      filters: {
        role,
        branch,
        status,
        search
      }
    };

    // Add pagination info only if limit is specified
    if (limit) {
      response.pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      };
    } else {
      response.total = total;
    }

    return res.json(response);
  } catch (err) {
    console.error('getAllUsers error:', err);
    console.error('Query parameters:', req.query);

    // ตรวจสอบว่า filter ถูกกำหนดหรือไม่
    try {
      if (typeof filter !== 'undefined') {
        console.error('Filter object:', JSON.stringify(filter, null, 2));
      } else {
        console.error('Filter object: undefined');
      }
    } catch (filterLogError) {
      console.error('Cannot log filter object:', filterLogError.message);
    }

    // More detailed error response for debugging
    const errorMessage = process.env.NODE_ENV === 'development'
      ? `Error fetching users: ${err.message}`
      : 'ไม่สามารถดึงข้อมูลผู้ใช้ได้';

    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/**
 * GET /:id
 * ดึงข้อมูลผู้ใช้ตาม id
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('employee', 'name email imageUrl position department branch salary employeeId')
      .populate('role', 'name permissions allowedPages')
      .populate('allowedBranches', 'name branch_code')
      .populate('checkinBranches', 'name branch_code')
      .populate('defaultBranches', 'name branch_code')
      .select('username role employee allowedBranches checkinBranches defaultBranches isBlocked isOnline lastSeen createdAt updatedAt')
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

    const user = await User.findById(req.params.id).select('+isBlocked');

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // จัดการ role และ allowedPages
    let currentRole;
    if (role && role.toString() !== user.role.toString()) {
      // กรณีเปลี่ยน role
      const newRole = await UserRole.findById(role);
      if (!newRole) return res.status(400).json({ success: false, error: 'Role ไม่ถูกต้อง' });
      user.role = newRole._id;
      currentRole = newRole;
    } else {
      // กรณีไม่เปลี่ยน role แต่อาจเปลี่ยน allowedPages
      currentRole = await UserRole.findById(user.role);
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
    const populatedUser = await User.findById(updatedUser._id)
      .populate('employee', 'name email imageUrl position department branch salary employeeId')
      .populate('role', 'name permissions allowedPages')
      .populate('allowedBranches', 'name branch_code')
      .populate('checkinBranches', 'name branch_code')
      .populate('defaultBranches', 'name branch_code')
      .select('username role employee allowedBranches checkinBranches defaultBranches isBlocked isOnline lastSeen createdAt updatedAt')
      .lean();

    const updated = { ...populatedUser };
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
    const user = await User.findById(req.user.id);
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
    const users = await User.find({ isOnline: true })
      .populate('employee', 'name imageUrl position department branch employeeId')
      .select('username employee currentSession isOnline lastSeen')
      .lean();

    const data = users.map(u => ({
      _id: u._id,
      username: u.username,
      name: u.employee?.name || u.username,
      position: u.employee?.position,
      department: u.employee?.department,
      isOnline: u.isOnline,
      lastSeen: u.lastSeen,
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
    const users = await User.find({ isBlocked: true })
      .populate('employee', 'name imageUrl position department branch employeeId')
      .select('username employee blockReason blockedAt isBlocked isOnline lastSeen')
      .lean();
    const data = users.map(u => ({
      _id: u._id,
      username: u.username,
      name: u.employee?.name || u.username,
      position: u.employee?.position,
      department: u.employee?.department,
      isBlocked: u.isBlocked,
      isOnline: u.isOnline,
      lastSeen: u.lastSeen,
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

    const user = await User.findById(targetId); // ไม่ใช้ .lean() เพื่อให้ได้ methods
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
    const user = await User.findById(req.params.id).select('+isBlocked'); // ไม่ใช้ .lean() เพื่อให้ได้ methods
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

    return res.json({ success: true, message: 'User blocked successfully' });
  } catch (err) {
    console.error('blockUser error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ปลดบล็อกผู้ใช้
exports.unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('+isBlocked');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (!user.isBlocked) {
      return res.status(400).json({ success: false, error: 'User is not blocked' });
    }

    user.isBlocked = false;
    user.blockedAt = null;
    user.blockedBy = null;
    user.blockReason = null;
    await user.save();

    const io = req.app.get('io');
    io.emit('userUnblocked', { userId: user._id, username: user.username });
    io.to(`user-${user._id}`).emit('forceLogout', {
      reason: 'คุณถูกปลดบล็อกโดยผู้ดูแลระบบ',
      blockReason: null
    });

    return res.json({ success: true, message: 'User unblocked successfully' });
  } catch (err) {
    console.error('unblockUser error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ดูรายชื่อ sessions ของผู้ใช้
exports.getUserSessions = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('currentSession username');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const sessions = user.currentSession ? [user.currentSession] : [];
    return res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('getUserSessions error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ดูข้อมูล session ปัจจุบัน
exports.getCurrentSession = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('currentSession username');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({
      success: true,
      data: user.currentSession || null
    });
  } catch (err) {
    console.error('getCurrentSession error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ดูประวัติการเข้าสู่ระบบ
exports.getLoginHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('loginHistory username');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const history = user.loginHistory || [];
    return res.json({ success: true, data: history });
  } catch (err) {
    console.error('getLoginHistory error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ดึงการตั้งค่าอนุมัติอัตโนมัติ
exports.getAutoApprovalSettings = async (req, res) => {
  try {
    let settings = await AutoApprovalSettings.findOne({});

    // สร้างการตั้งค่าเริ่มต้นหากไม่มี
    if (!settings) {
      settings = new AutoApprovalSettings({
        enabled: false,
        conditions: {
          approveAll: true,
          timeBasedApproval: {
            enabled: false,
            startTime: '08:00',
            endTime: '18:00',
            timezone: 'Asia/Bangkok'
          },
          roleBasedApproval: {
            enabled: false,
            allowedRoles: []
          },
          dailyLimit: {
            enabled: false,
            maxApprovals: 50
          }
        },
        approvalNote: 'อนุมัติอัตโนมัติโดยระบบ',
        stats: {
          totalAutoApprovals: 0,
          dailyCount: 0,
          lastResetDate: new Date()
        }
      });
      await settings.save();
    }

    return res.json({
      success: true,
      data: settings.toObject()
    });
  } catch (err) {
    console.error('Get auto-approval settings error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// อัปเดตการตั้งค่าอนุมัติอัตโนมัติ
exports.updateAutoApprovalSettings = async (req, res) => {
  try {
    const { enabled, rules } = req.body;

    let settings = await AutoApprovalSettings.findOne({});
    if (!settings) {
      settings = new AutoApprovalSettings({
        enabled: enabled || false,
        rules: rules || [],
        lastUpdated: new Date(),
        updatedBy: req.user.id
      });
    } else {
      settings.enabled = enabled !== undefined ? enabled : settings.enabled;
      settings.rules = rules || settings.rules;
      settings.lastUpdated = new Date();
      settings.updatedBy = req.user.id;
    }

    await settings.save();

    return res.json({
      success: true,
      data: settings,
      message: 'อัปเดตการตั้งค่าเรียบร้อย'
    });
  } catch (err) {
    console.error('updateAutoApprovalSettings error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// เปิด/ปิดอนุมัติอัตโนมัติ
exports.toggleAutoApproval = async (req, res) => {
  try {
    const { enabled } = req.body;
    const userId = req.user?.id || req.userId;

    let settings = await AutoApprovalSettings.findOne({});
    if (!settings) {
      settings = new AutoApprovalSettings({
        enabled: enabled !== undefined ? enabled : true,
        conditions: {
          approveAll: true,
          timeBasedApproval: { enabled: false },
          roleBasedApproval: { enabled: false, allowedRoles: [] }
        },
        lastUpdated: new Date(),
        updatedBy: userId
      });
    } else {
      // ถ้ามี enabled parameter ให้ใช้ค่านั้น ถ้าไม่มีให้ toggle
      settings.enabled = enabled !== undefined ? enabled : !settings.enabled;
      settings.lastUpdated = new Date();
      settings.updatedBy = userId;
    }

    await settings.save();

    // ส่ง Socket.IO event เมื่อสถานะเปลี่ยน
    const io = req.app.get('socketio');
    if (io) {
      io.emit('autoApprovalStatusChanged', {
        enabled: settings.enabled,
        timestamp: new Date(),
        updatedBy: userId
      });
    }

    // ถ้าเปิดใช้งาน ให้รันอนุมัติอัตโนมัติทันที
    if (settings.enabled) {
      try {
        const AutoApprovalService = require('../services/autoApprovalService');
        const pendingRequests = await LoginRequest.find({
          status: 'pending',
          expiresAt: { $gt: new Date() }
        });

        let approvedCount = 0;
        for (const request of pendingRequests) {
          try {
            const result = await AutoApprovalService.processAutoApproval(request);
            if (result.approved) {
              approvedCount++;
            }
          } catch (autoApprovalError) {
            console.error('Error in auto-approval after toggle:', autoApprovalError);
          }
        }

                 // ส่ง Socket.IO event สำหรับการอนุมัติอัตโนมัติ
         if (io && approvedCount > 0) {
           io.emit('autoApprovalExecuted', {
             approvedCount,
             timestamp: new Date(),
             triggeredBy: 'toggle'
           });
         }

         // ส่งผลลัพธ์พร้อมจำนวนที่อนุมัติ
         return res.json({
           success: true,
           data: { ...settings.toObject(), approvedCount },
           message: `อนุมัติอัตโนมัติ${settings.enabled ? 'เปิด' : 'ปิด'}แล้ว${approvedCount > 0 ? ` และอนุมัติ ${approvedCount} คำขอ` : ''}`
         });
      } catch (autoApprovalError) {
        console.error('Error in auto-approval after toggle:', autoApprovalError);
      }
    }

    return res.json({
      success: true,
      data: settings,
      message: `อนุมัติอัตโนมัติ${settings.enabled ? 'เปิด' : 'ปิด'}แล้ว`
    });
  } catch (err) {
    console.error('Toggle auto-approval error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// รันอนุมัติอัตโนมัติแบบ manual
exports.runAutoApproval = async (req, res) => {
  try {
    // ดึงคำขอที่รอการอนุมัติ
    const pendingRequests = await LoginRequest.find({
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (pendingRequests.length === 0) {
      return res.json({
        success: true,
        message: 'ไม่มีคำขอที่รอการอนุมัติ',
        processed: 0
      });
    }

    let processed = 0;

    // ประมวลผลแต่ละคำขอ
    for (const request of pendingRequests) {
      try {
        const result = await AutoApprovalService.processAutoApproval(request);
        if (result.approved) {
          processed++;
        }
      } catch (error) {
        console.error(`Error processing request ${request.requestId}:`, error);
      }
    }

    // ส่ง Socket.IO event สำหรับการอนุมัติอัตโนมัติ manual
    const io = req.app.get('socketio');
    if (io && processed > 0) {
      io.emit('autoApprovalExecuted', {
        approvedCount: processed,
        totalProcessed: pendingRequests.length,
        timestamp: new Date(),
        triggeredBy: 'manual'
      });
    }

    return res.json({
      success: true,
      message: `ประมวลผลเสร็จสิ้น อนุมัติ ${processed} คำขอ จากทั้งหมด ${pendingRequests.length} คำขอ`,
      approvedCount: processed,
      processed,
      total: pendingRequests.length
    });
  } catch (err) {
    console.error('runAutoApproval error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get users by checkin branches specifically
exports.getUsersByCheckinBranches = async (req, res) => {
  try {
    const { branchId } = req.params;

    console.log('🔍 Getting users by checkin branches for:', branchId);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID is required'
      });
    }

    // Validate if branchId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID format'
      });
    }

    // Get branch info for logging
    const branchInfo = await Branch.findById(branchId).select('name branch_code').lean();
    console.log(`🔍 Searching users specifically by checkinBranches for: ${branchInfo?.name || 'Unknown'} (${branchInfo?.branch_code || 'Unknown'}) - ID: ${branchId}`);

    // Find users who have this branch in their checkinBranches specifically
    const users = await User.find({
      $and: [
        { isActive: { $ne: false } }, // Only active users (consistent with database scripts)
        { checkinBranches: branchId } // Only users with this branch in checkinBranches
      ]
    })
    .populate('role', 'name permissions')
    .populate('employee', 'name position department')
    .populate('checkinBranches', 'name branch_code address')
    .populate('allowedBranches', 'name branch_code address')
    .populate('defaultBranches', 'name branch_code address')
    .select('-password -refreshToken')
    .sort({ 'employee.name': 1, fullName: 1, firstName: 1, username: 1 })
    .lean();

    console.log(`✅ Found ${users.length} users with checkinBranches access to branch ${branchInfo?.name || branchId}`);

    // Log which users were found
    if (users.length > 0) {
      console.log('👥 Users found:', users.map(u => ({
        name: u.employee?.name || u.fullName || `${u.firstName} ${u.lastName}`.trim() || u.username,
        role: u.role?.name,
        checkinBranches: u.checkinBranches?.map(b => b.name || b.branch_code)
      })));
    } else {
      console.log('⚠️ No users found with checkinBranches for this branch.');
    }

    return res.status(200).json({
      success: true,
      data: users,
      total: users.length,
      message: `Found ${users.length} users with checkinBranches access to this branch`
    });
  } catch (error) {
    console.error('❌ Error getting users by checkin branches:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};