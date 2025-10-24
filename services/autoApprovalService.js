const mongoose = require('mongoose');
const { isConnected, waitForConnection } = require('../config/db');
const AutoApprovalSettings = require('../models/AutoApprovalSettings');
const LoginRequest = require('../models/LoginRequest');
const User = require('../models/User/User');

class AutoApprovalService {

  /**
   * ตรวจสอบและอนุมัติคำขอโดยอัตโนมัติ
   * @param {Object} loginRequest - คำขอเข้าสู่ระบบ
   * @returns {Promise<Object>} ผลลัพธ์การอนุมัติ
   */
  static async processAutoApproval(loginRequest) {
    try {
      console.log(`🤖 AutoApproval: Processing request ${loginRequest.requestId}`);

      // ตรวจสอบว่าเปิดใช้งานอนุมัติอัตโนมัติหรือไม่
      const isEnabled = await AutoApprovalSettings.isAutoApprovalEnabled();
      if (!isEnabled) {
        console.log('🤖 AutoApproval: Disabled');
        return { approved: false, reason: 'Auto-approval is disabled' };
      }

      // ตรวจสอบเงื่อนไขต่างๆ
      const shouldApprove = await AutoApprovalSettings.shouldAutoApprove(loginRequest);
      if (!shouldApprove) {
        console.log('🤖 AutoApproval: Conditions not met');
        return { approved: false, reason: 'Auto-approval conditions not met' };
      }

      // ตรวจสอบ role-based approval หากเปิดใช้งาน
      const settings = await AutoApprovalSettings.getSettings();
      if (settings.conditions.roleBasedApproval.enabled) {
        const user = await User.findById(loginRequest.userId).populate('role', 'name');
        if (!user || !user.role) {
          console.log('🤖 AutoApproval: User or role not found');
          return { approved: false, reason: 'User or role not found' };
        }

        const userRole = user.role.name;
        const allowedRoles = settings.conditions.roleBasedApproval.allowedRoles;

        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
          console.log(`🤖 AutoApproval: Role ${userRole} not in allowed roles`);
          return { approved: false, reason: `Role ${userRole} not allowed for auto-approval` };
        }
      }

      // อนุมัติคำขอ
      const result = await this.approveRequest(loginRequest, settings);

      if (result.success) {
        // อัปเดตสถิติ
        await settings.incrementStats();
        console.log(`✅ AutoApproval: Request ${loginRequest.requestId} approved automatically`);

        return {
          approved: true,
          token: result.token,
          message: 'Request approved automatically'
        };
      } else {
        console.log(`❌ AutoApproval: Failed to approve ${loginRequest.requestId}: ${result.error}`);
        return { approved: false, reason: result.error };
      }

    } catch (error) {
      console.error('🚨 AutoApproval Error:', error);
      return { approved: false, reason: error.message };
    }
  }

  /**
   * อนุมัติคำขอและสร้าง token
   * @param {Object} loginRequest - คำขอเข้าสู่ระบบ
   * @param {Object} settings - การตั้งค่าอนุมัติอัตโนมัติ
   * @returns {Promise<Object>} ผลลัพธ์การอนุมัติ
   */
  static async approveRequest(loginRequest, settings) {
    try {
      const jwt = require('jsonwebtoken');
      const SECRET = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';

      // ดึงข้อมูลผู้ใช้
      const user = await User.findById(loginRequest.userId)
        .select('+currentSession')
        .populate('employee', 'name email imageUrl')
        .populate('role', 'name permissions allowedPages')
        .populate('allowedBranches', 'name branch_code')
        .populate('defaultBranches', 'name branch_code');

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // อัปเดตสถานะคำขอ
      await loginRequest.updateStatus(
        'approved',
        null, // ใช้ null สำหรับ auto-approval เพราะ approverId ต้องเป็น ObjectId
        'ระบบอนุมัติอัตโนมัติ',
        settings.approvalNote,
        'auto-system'
      );

      // สร้าง token
      const payload = {
        userId: user._id.toString(),
        username: user.username,
        role: user.role?.name || '',
        approvedLogin: true,
        autoApproved: true, // เพิ่ม flag สำหรับอนุมัติอัตโนมัติ
        requestId: loginRequest.requestId
      };
      const token = jwt.sign(payload, SECRET);

      // สร้าง session
      const normalizeIP = (ip) => {
        if (!ip) return 'auto-system';
        if (ip.substr(0, 7) === '::ffff:') return ip.substr(7);
        if (ip === '::1') return '127.0.0.1';
        return ip;
      };

      await user.createSession(
        token,
        normalizeIP(loginRequest.ipAddress || 'auto-system'),
        'Web (Auto-Approved)',
        loginRequest.userAgent || 'Auto-Approval System'
      );

      // บันทึก token ในคำขอ
      loginRequest.token = token;
      await loginRequest.save();

      // เพิ่ม audit log
      await loginRequest.addAuditLog(
        'auto_approved',
        'system',
        `Auto-approved by system at ${new Date().toISOString()}`,
        'auto-system'
      );

      return { success: true, token };

    } catch (error) {
      console.error('Error in approveRequest:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * อนุมัติคำขอที่รออนุมัติทั้งหมด (สำหรับเมื่อเปิดใช้งานอนุมัติอัตโนมัติ)
   * @returns {Promise<Object>} ผลลัพธ์การอนุมัติ
   */
  static async approveAllPendingRequests() {
    try {
      // Check MongoDB connection first
      if (!isConnected()) {
        console.warn('⚠️ MongoDB not connected, skipping auto-approval');
        return { success: false, message: 'Database not available', approvedCount: 0, totalRequests: 0 };
      }

      // Wait for connection to be ready (with timeout)
      try {
        await waitForConnection(5000);
      } catch (connectionError) {
        console.warn('⚠️ MongoDB connection not ready, skipping auto-approval');
        return { success: false, message: 'Database connection not ready', approvedCount: 0, totalRequests: 0 };
      }

      // Add timeout for the entire operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auto-approval operation timeout')), 25000); // 25 seconds
      });

      const operationPromise = this._performAutoApproval();

      return await Promise.race([operationPromise, timeoutPromise]);
    } catch (error) {
      console.error('🚨 AutoApproval: Error in approveAllPendingRequests:', error.message);
      return { success: false, message: error.message, approvedCount: 0, totalRequests: 0 };
    }
  }

  static async _performAutoApproval() {
    console.log('🤖 AutoApproval: Processing all pending requests...');

    const isEnabled = await AutoApprovalSettings.isAutoApprovalEnabled();
    if (!isEnabled) {
      return { success: false, message: 'Auto-approval is disabled', approvedCount: 0, totalRequests: 0 };
    }

    // ดึงคำขอที่รออนุมัติทั้งหมด
    const pendingRequests = await LoginRequest.find({
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: 1 }); // เรียงตามเวลาเก่าสุดก่อน

    if (pendingRequests.length === 0) {
      return { success: true, message: 'No pending requests to approve', approvedCount: 0, totalRequests: 0 };
    }

    let approvedCount = 0;
    let errors = [];

    for (const request of pendingRequests) {
      try {
        const result = await this.processAutoApproval(request);
        if (result.approved) {
            approvedCount++;
          } else {
            console.log(`🤖 AutoApproval: Skipped ${request.requestId}: ${result.reason}`);
          }

          // หน่วงเวลาเล็กน้อยเพื่อไม่ให้ server รับภาระมากเกินไป
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`🚨 AutoApproval: Error processing ${request.requestId}:`, error);
          errors.push(`${request.requestId}: ${error.message}`);
        }
      }

      console.log(`✅ AutoApproval: Approved ${approvedCount}/${pendingRequests.length} requests`);

    return {
      success: true,
      message: `Auto-approved ${approvedCount} out of ${pendingRequests.length} pending requests`,
      approvedCount,
      totalRequests: pendingRequests.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * รันการตรวจสอบเป็นระยะ ๆ (สำหรับ cron job)
   * @returns {Promise<Object>} ผลลัพธ์การตรวจสอบ
   */
  static async runPeriodicCheck() {
    try {
      console.log('🤖 AutoApproval: Running periodic check...');

      const isEnabled = await AutoApprovalSettings.isAutoApprovalEnabled();
      if (!isEnabled) {
        return { success: false, message: 'Auto-approval is disabled' };
      }

      // ดึงคำขอที่รออนุมัติ
      const pendingRequests = await LoginRequest.find({
        status: 'pending',
        expiresAt: { $gt: new Date() },
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // ใน 5 นาทีที่ผ่านมา
      }).limit(10); // จำกัดไว้ที่ 10 รายการต่อรอบ

      if (pendingRequests.length === 0) {
        return { success: true, message: 'No pending requests to check', checkedCount: 0 };
      }

      let approvedCount = 0;
      let checkedCount = 0;

      for (const request of pendingRequests) {
        checkedCount++;

        try {
          const result = await this.processAutoApproval(request);
          if (result.approved) {
            approvedCount++;
            console.log(`✅ Periodic check: Auto-approved ${request.requestId}`);
          } else {
            console.log(`⏳ Periodic check: Skipped ${request.requestId}: ${result.reason}`);
          }

          // หน่วงเวลาเล็กน้อยเพื่อไม่ให้ระบบรับภาระมากเกินไป
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`🚨 Periodic check error for ${request.requestId}:`, error);
        }
      }

      if (approvedCount > 0) {
        console.log(`✅ Periodic check: Approved ${approvedCount}/${checkedCount} requests`);
      }

      return {
        success: true,
        message: `Periodic check completed`,
        approvedCount,
        checkedCount,
        totalRequests: pendingRequests.length
      };

    } catch (error) {
      console.error('🚨 Periodic check error:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = AutoApprovalService;
