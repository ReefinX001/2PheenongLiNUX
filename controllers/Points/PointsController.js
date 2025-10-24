/**
 * controllers/Points/PointsController.js - Controller หลักสำหรับระบบสะสมแต้ม
 */

const mongoose = require('mongoose');
const Member = require('../../models/Points/Member');
const PointTransaction = require('../../models/Points/PointTransaction');
const PointsSettings = require('../../models/Points/PointsSettings');
const CashSale = require('../../models/POS/CashSale');
const InstallmentOrder = require('../../models/Installment/InstallmentOrder');

class PointsController {

  // สร้างสมาชิกใหม่
  static async createMember(req, res) {
    try {
      console.log('🆕 Creating new member:', req.body);

      const {
        firstName,
        lastName,
        phone,
        email,
        branchCode,
        branchName,
        hasBoxSet,
        referrerPhone
      } = req.body;

      // ตรวจสอบว่ามีสมาชิกที่ใช้เบอร์นี้แล้วหรือไม่
      const existingMember = await Member.findByPhone(phone);
      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'เบอร์โทรศัพท์นี้ได้สมัครสมาชิกแล้ว'
        });
      }

      // สร้างรหัสสมาชิก
      const memberCode = await Member.generateMemberCode(branchCode);

      // ค้นหาผู้แนะนำ
      let referrer = null;
      if (referrerPhone) {
        referrer = await Member.findByPhone(referrerPhone);
        if (!referrer) {
          return res.status(400).json({
            success: false,
            message: 'ไม่พบผู้แนะนำในระบบ'
          });
        }
      }

      // สร้างสมาชิกใหม่
      const member = new Member({
        memberId: memberCode,
        memberCode: memberCode,
        personalInfo: {
          firstName,
          lastName,
          phone,
          email: email || ''
        },
        branch: {
          code: branchCode || '00000',
          name: branchName || 'สำนักงานใหญ่'
        },
        referral: {
          referredBy: referrer?._id || null,
          referredByPhone: referrerPhone || '',
          referralCode: memberCode
        },
        createdBy: req.user?._id || new mongoose.Types.ObjectId()
      });

      await member.save();

      // ให้แต้มเริ่มต้น
      const settings = await PointsSettings.getSettings();
      let initialPoints = 0;

      // แต้มจาก Box Set
      if (hasBoxSet && settings.earning.boxSet.enabled) {
        initialPoints += settings.earning.boxSet.points;

        await member.addPoints(
          settings.earning.boxSet.points,
          'แต้มโบนัสจากการซื้อ Box Set',
          `BOXSET_${member.memberCode}`
        );
      }

      // แต้มสำหรับผู้ถูกแนะนำ
      if (referrer && settings.earning.referral.enabled) {
        initialPoints += settings.earning.referral.referredPoints;

        await member.addPoints(
          settings.earning.referral.referredPoints,
          'แต้มโบนัสสำหรับสมาชิกใหม่ที่ถูกแนะนำ',
          `REFERRED_${member.memberCode}`
        );

        // ให้แต้มผู้แนะนำ
        await referrer.addPoints(
          settings.earning.referral.referrerPoints,
          `แต้มแนะนำเพื่อน: ${member.fullName}`,
          `REFERRER_${member.memberCode}`
        );

        referrer.referral.referredCount += 1;
        await referrer.save();
      }

      await member.save();

      res.json({
        success: true,
        message: 'สร้างสมาชิกเรียบร้อยแล้ว',
        data: {
          member: {
            id: member._id,
            memberCode: member.memberCode,
            name: member.fullName,
            phone: member.personalInfo.phone,
            points: member.points.current,
            memberLevel: member.memberLevel
          },
          initialPoints
        }
      });

    } catch (error) {
      console.error('❌ Create member error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างสมาชิก',
        error: error.message
      });
    }
  }

  // ค้นหาสมาชิก
  static async findMember(req, res) {
    try {
      const { q, type = 'all' } = req.query;

      if (!q || q.length < 2) {
        return res.json({
          success: true,
          data: [],
          message: 'กรุณาใส่ข้อมูลค้นหาอย่างน้อย 2 ตัวอักษร'
        });
      }

      let query = { status: 'active' };

      // ค้นหาตามประเภท
      if (/^\d+$/.test(q)) {
        // ถ้าเป็นตัวเลข ค้นหาเป็นเบอร์โทรหรือรหัสสมาชิก
        query.$or = [
          { 'personalInfo.phone': { $regex: q, $options: 'i' } },
          { memberCode: { $regex: q, $options: 'i' } }
        ];
      } else {
        // ค้นหาเป็นชื่อ
        query.$or = [
          { 'personalInfo.firstName': { $regex: q, $options: 'i' } },
          { 'personalInfo.lastName': { $regex: q, $options: 'i' } }
        ];
      }

      const members = await Member.find(query)
        .limit(10)
        .sort({ lastActiveAt: -1 })
        .lean();

      const formattedMembers = members.map(member => ({
        id: member._id,
        memberCode: member.memberCode,
        name: `${member.personalInfo.firstName} ${member.personalInfo.lastName}`.trim(),
        phone: member.personalInfo.phone,
        email: member.personalInfo.email,
        points: member.points.current,
        memberLevel: member.memberLevel,
        lastActiveAt: member.lastActiveAt,
        branchCode: member.branch.code
      }));

      res.json({
        success: true,
        data: formattedMembers,
        count: formattedMembers.length
      });

    } catch (error) {
      console.error('❌ Find member error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการค้นหาสมาชิก',
        error: error.message
      });
    }
  }

  // ดูข้อมูลสมาชิก
  static async getMemberDetails(req, res) {
    try {
      const { id } = req.params;

      const member = await Member.findById(id)
        .populate('referral.referredBy', 'memberCode personalInfo')
        .lean();

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลสมาชิก'
        });
      }

      // ดึงประวัติการทำรายการ
      const transactions = await PointTransaction.getMemberTransactions(id, 20);

      res.json({
        success: true,
        data: {
          member: {
            id: member._id,
            memberCode: member.memberCode,
            name: `${member.personalInfo.firstName} ${member.personalInfo.lastName}`.trim(),
            phone: member.personalInfo.phone,
            email: member.personalInfo.email,
            points: member.points,
            memberLevel: member.memberLevel,
            status: member.status,
            branch: member.branch,
            referral: member.referral,
            purchaseHistory: member.purchaseHistory,
            createdAt: member.createdAt,
            lastActiveAt: member.lastActiveAt
          },
          transactions: transactions.map(tx => ({
            id: tx._id,
            transactionId: tx.transactionId,
            type: tx.type,
            displayType: tx.displayType,
            points: tx.points,
            balanceAfter: tx.balanceAfter,
            reason: tx.reason,
            createdAt: tx.createdAt,
            expiresAt: tx.expiresAt,
            isExpiringSoon: tx.isExpiringSoon
          }))
        }
      });

    } catch (error) {
      console.error('❌ Get member details error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสมาชิก',
        error: error.message
      });
    }
  }

  // บันทึกการซื้อและให้แต้ม
  static async recordPurchase(req, res) {
    try {
      const {
        memberId,
        purchaseType, // 'cash', 'installment', 'accessories'
        orderId,
        orderNumber,
        amount,
        items,
        hasBoxSet,
        branchCode,
        branchName,
        staffName
      } = req.body;

      const member = await Member.findById(memberId);
      if (!member || member.status !== 'active') {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสมาชิกหรือสมาชิกไม่ได้ใช้งาน'
        });
      }

      const settings = await PointsSettings.getSettings();

      // คำนวณแต้มที่ได้รับ
      const earnedPoints = settings.calculateEarnedPoints(purchaseType, amount, hasBoxSet);

      if (earnedPoints > 0) {
        // บันทึกการได้รับแต้ม
        await member.addPoints(
          earnedPoints,
          `แต้มจากการซื้อ ${purchaseType === 'cash' ? 'สด' : purchaseType === 'installment' ? 'ผ่อน' : 'อุปกรณ์เสริม'} ${amount.toLocaleString()} บาท`,
          orderNumber
        );

        // อัปเดตประวัติการซื้อ
        member.purchaseHistory.totalPurchases += 1;
        member.purchaseHistory.totalAmount += amount;
        member.purchaseHistory.lastPurchaseDate = new Date();

        if (!member.purchaseHistory.firstPurchaseDate) {
          member.purchaseHistory.firstPurchaseDate = new Date();

          // ให้แต้มโบนัสการซื้อครั้งแรก
          if (settings.earning.firstPurchase.enabled) {
            await member.addPoints(
              settings.earning.firstPurchase.points,
              'แต้มโบนัสการซื้อครั้งแรก',
              `FIRST_${orderNumber}`
            );
          }
        }

        await member.save();
      }

      res.json({
        success: true,
        message: 'บันทึกการซื้อเรียบร้อยแล้ว',
        data: {
          earnedPoints,
          currentPoints: member.points.current,
          memberLevel: member.memberLevel
        }
      });

    } catch (error) {
      console.error('❌ Record purchase error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการบันทึกการซื้อ',
        error: error.message
      });
    }
  }

  // ใช้แต้มแลกส่วนลด
  static async redeemPoints(req, res) {
    try {
      const {
        memberId,
        points,
        purchaseAmount,
        orderNumber,
        branchCode,
        branchName,
        staffName
      } = req.body;

      const member = await Member.findById(memberId);
      if (!member || member.status !== 'active') {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบสมาชิกหรือสมาชิกไม่ได้ใช้งาน'
        });
      }

      const settings = await PointsSettings.getSettings();

      // ตรวจสอบเงื่อนไขการใช้แต้ม
      if (!settings.redemption.enabled) {
        return res.status(400).json({
          success: false,
          message: 'ระบบแลกแต้มยังไม่เปิดใช้งาน'
        });
      }

      if (points < settings.redemption.minPoints) {
        return res.status(400).json({
          success: false,
          message: `ต้องใช้แต้มอย่างน้อย ${settings.redemption.minPoints} แต้ม`
        });
      }

      if (purchaseAmount < settings.redemption.minPurchaseAmount) {
        return res.status(400).json({
          success: false,
          message: `ยอดซื้อขั้นต่ำสำหรับการใช้แต้มคือ ${settings.redemption.minPurchaseAmount} บาท`
        });
      }

      const maxRedeemablePoints = settings.getMaxRedeemablePoints(purchaseAmount);
      if (points > maxRedeemablePoints) {
        return res.status(400).json({
          success: false,
          message: `สามารถใช้แต้มได้สูงสุด ${maxRedeemablePoints} แต้ม`
        });
      }

      if (!member.canUsePoints(points)) {
        return res.status(400).json({
          success: false,
          message: 'แต้มไม่เพียงพอหรือบัญชีไม่ได้ใช้งาน'
        });
      }

      // คำนวณส่วนลด
      const discountAmount = settings.calculateRedemptionValue(points);

      // ใช้แต้ม
      await member.usePoints(
        points,
        `แลกส่วนลด ${discountAmount} บาท จากการซื้อ ${purchaseAmount} บาท`,
        orderNumber
      );

      await member.save();

      res.json({
        success: true,
        message: 'ใช้แต้มเรียบร้อยแล้ว',
        data: {
          usedPoints: points,
          discountAmount,
          remainingPoints: member.points.current,
          memberLevel: member.memberLevel
        }
      });

    } catch (error) {
      console.error('❌ Redeem points error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการใช้แต้ม',
        error: error.message
      });
    }
  }

  // ดึงการตั้งค่าระบบ
  static async getSettings(req, res) {
    try {
      const settings = await PointsSettings.getSettings();

      res.json({
        success: true,
        data: settings
      });

    } catch (error) {
      console.error('❌ Get settings error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงการตั้งค่า',
        error: error.message
      });
    }
  }

  // อัปเดตการตั้งค่าระบบ
  static async updateSettings(req, res) {
    try {
      const updates = req.body;
      const updatedBy = req.user?._id || new mongoose.Types.ObjectId();

      const settings = await PointsSettings.updateSettings(updates, updatedBy);

      res.json({
        success: true,
        message: 'อัปเดตการตั้งค่าเรียบร้อยแล้ว',
        data: settings
      });

    } catch (error) {
      console.error('❌ Update settings error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า',
        error: error.message
      });
    }
  }

  // รายงานสถิติ
  static async getStatistics(req, res) {
    try {
      const { branchCode, startDate, endDate } = req.query;

      // สร้าง query สำหรับกรองตามสาขาและวันที่
      let memberQuery = { status: 'active' };
      let transactionQuery = { status: 'completed' };

      if (branchCode) {
        memberQuery['branch.code'] = branchCode;
        transactionQuery['branch.code'] = branchCode;
      }

      if (startDate || endDate) {
        transactionQuery.createdAt = {};
        if (startDate) transactionQuery.createdAt.$gte = new Date(startDate);
        if (endDate) transactionQuery.createdAt.$lte = new Date(endDate);
      }

      // รวบรวมสถิติ
      const [
        totalMembers,
        diamondMembers,
        totalPointsInSystem,
        expiringPoints,
        recentTransactions
      ] = await Promise.all([
        Member.countDocuments(memberQuery),
        Member.countDocuments({ ...memberQuery, memberLevel: 'Diamond' }),
        Member.aggregate([
          { $match: memberQuery },
          { $group: { _id: null, total: { $sum: '$points.current' } } }
        ]),
        PointTransaction.getExpiringPoints(30),
        PointTransaction.find(transactionQuery)
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('member', 'memberCode personalInfo')
      ]);

      res.json({
        success: true,
        data: {
          totalMembers,
          diamondMembers,
          totalPoints: totalPointsInSystem[0]?.total || 0,
          expiringPoints: expiringPoints.length,
          recentTransactions: recentTransactions.map(tx => ({
            id: tx._id,
            transactionId: tx.transactionId,
            memberName: tx.member ? `${tx.member.personalInfo.firstName} ${tx.member.personalInfo.lastName}`.trim() : 'ไม่ระบุ',
            memberCode: tx.member?.memberCode || 'ไม่ระบุ',
            type: tx.displayType,
            points: tx.points,
            reason: tx.reason,
            createdAt: tx.createdAt
          }))
        }
      });

    } catch (error) {
      console.error('❌ Get statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงสถิติ',
        error: error.message
      });
    }
  }
}

module.exports = PointsController;
