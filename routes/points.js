// Points System API Routes - Complete Version
// ระบบสะสมแต้ม - API สำหรับการจัดการข้อมูลแบบสมบูรณ์

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Import database connection
const { pointsDB } = require('../config/pointsDatabase');

// Initialize database connection
let dbReady = false;
pointsDB.init().then(() => {
    dbReady = true;
    console.log('✅ Points System Database ready');
}).catch(error => {
    console.error('❌ Points System Database initialization failed:', error);
});

// Middleware to check database readiness
const checkDbReady = (req, res, next) => {
    if (!dbReady) {
        return res.status(503).json({ success: false, message: 'ระบบยังไม่พร้อม กรุณาลองใหม่อีกครั้ง' });
    }
    next();
};

// Helper Functions
function generateMembershipId() {
    return 'M' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 3).toUpperCase();
}

function generateQRCode(memberId) {
    return `MEMBER_${memberId}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function generateTransactionId() {
    return 'T' + Date.now().toString() + Math.random().toString(36).substr(2, 4).toUpperCase();
}

// ===========================================
// MEMBER MANAGEMENT ROUTES
// ===========================================

// Search member by barcode/QR code
router.post('/member/search-by-code', checkDbReady, async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.json({ success: false, message: 'กรุณาระบุรหัส' });
        }

        const member = await pointsDB.findMemberByCode(code.trim());

        if (member) {
            res.json({ success: true, member: member });
        } else {
            res.json({ success: false, message: 'ไม่พบสมาชิกจากรหัสที่ระบุ' });
        }
    } catch (error) {
        console.error('Error searching member by code:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการค้นหา' });
    }
});

// Search member by phone number
router.post('/member/search-by-phone', checkDbReady, async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.json({ success: false, message: 'กรุณาระบุเบอร์โทรศัพท์' });
        }

        const member = await pointsDB.findMemberByPhone(phone.trim());

        if (member) {
            res.json({ success: true, member: member });
        } else {
            res.json({ success: false, message: 'ไม่พบสมาชิกจากเบอร์โทรที่ระบุ' });
        }
    } catch (error) {
        console.error('Error searching member by phone:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการค้นหา' });
    }
});

// Search members (general search)
router.post('/member/search', checkDbReady, async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.json({ success: true, members: [] });
        }

        const members = await pointsDB.searchMembers(query.trim());
        res.json({ success: true, members: members });
    } catch (error) {
        console.error('Error searching members:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการค้นหา' });
    }
});

// Create new member
router.post('/member/create', checkDbReady, async (req, res) => {
    try {
        const { name, phone, member_level, initial_points, has_box_set } = req.body;

        if (!name || !phone) {
            return res.json({ success: false, message: 'กรุณากรอกชื่อและเบอร์โทรศัพท์' });
        }

        // Check if phone already exists
        const existingMember = await pointsDB.findMemberByPhone(phone.trim());
        if (existingMember) {
            return res.json({ success: false, message: 'เบอร์โทรศัพท์นี้มีในระบบแล้ว' });
        }

        const membershipId = generateMembershipId();
        const qrCode = generateQRCode(membershipId);
        const startingPoints = initial_points || 0;

        const memberData = {
            membership_id: membershipId,
            name: name.trim(),
            phone: phone.trim(),
            member_level: member_level || 'Member',
            point_balance: startingPoints,
            qr_code: qrCode,
            barcode: qrCode,
            created_by: req.user?.username || 'system'
        };

        await pointsDB.createMember(memberData);

        // Add initial points log if any
        if (startingPoints > 0) {
            const description = has_box_set ? 'แต้มเริ่มต้นจากการซื้อ Box Set' : 'แต้มเริ่มต้น';
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 12); // 12 months from now

            await pointsDB.addPointLog({
                member_id: membershipId,
                point_change: startingPoints,
                description: description,
                transaction_type: 'initial',
                balance_before: 0,
                balance_after: startingPoints,
                expires_date: expiryDate.toISOString().split('T')[0],
                created_by: req.user?.username || 'system'
            });
        }

        // Get the created member
        const newMember = await pointsDB.findMemberByCode(membershipId);
        res.json({ success: true, member: newMember });
    } catch (error) {
        console.error('Error creating member:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างสมาชิก' });
    }
});

// Get member history
router.get('/member/:memberId/history', checkDbReady, async (req, res) => {
    try {
        const { memberId } = req.params;

        const history = await pointsDB.getMemberHistory(memberId, 50);
        res.json({ success: true, history: history });
    } catch (error) {
        console.error('Error getting member history:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงประวัติ' });
    }
});

// ===========================================
// TRANSACTION PROCESSING ROUTES
// ===========================================

// Process transaction
router.post('/transaction/process', checkDbReady, async (req, res) => {
    try {
        const { member_id, purchase_type, total_amount, has_box_set, referrer_phone, points_used, points_earned } = req.body;

        if (!member_id || !purchase_type || !total_amount) {
            return res.json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
        }

        const member = await pointsDB.findMemberByCode(member_id);
        if (!member) {
            return res.json({ success: false, message: 'ไม่พบข้อมูลสมาชิก' });
        }

        // Get current system settings
        const settings = await pointsDB.getSettings();

        let transactionDescription = '';
        let earnedPoints = 0;
        let usedPoints = points_used || 0;

        // Check if member has enough points to use
        if (usedPoints > member.point_balance) {
            return res.json({ success: false, message: 'แต้มไม่เพียงพอ' });
        }

        // Calculate earned points based on purchase type
        switch (purchase_type) {
            case 'installment':
                if (has_box_set) {
                    earnedPoints = settings.box_set_points || 100;
                    transactionDescription = 'ซื้อเครื่องผ่อน + Box Set';
                } else {
                    transactionDescription = 'ซื้อเครื่องผ่อน';
                }
                break;

            case 'cash':
                if (has_box_set) {
                    earnedPoints = settings.box_set_points || 100;
                    transactionDescription = 'ซื้อสด + Box Set';
                } else {
                    transactionDescription = 'ซื้อสด';
                }
                break;

            case 'accessories':
                const accessoriesRate = settings.accessories_rate_amount || 20;
                const accessoriesPoints = settings.accessories_rate_points || 1;
                earnedPoints = Math.floor(total_amount / accessoriesRate) * accessoriesPoints;
                transactionDescription = 'ซื้อ Accessories/Gadget';
                break;
        }

        const balanceBefore = member.point_balance;
        let newBalance = balanceBefore;
        const transactionId = generateTransactionId();
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + (settings.points_expiry_months || 12));

        // Deduct used points first
        if (usedPoints > 0) {
            newBalance -= usedPoints;

            await pointsDB.addPointLog({
                member_id: member_id,
                point_change: -usedPoints,
                description: `ใช้แต้ม - ${transactionDescription}`,
                transaction_type: 'redeem',
                balance_before: balanceBefore,
                balance_after: newBalance,
                reference_id: transactionId,
                created_by: req.user?.username || 'system'
            });
        }

        // Add earned points
        if (earnedPoints > 0) {
            const balanceBeforeEarn = newBalance;
            newBalance += earnedPoints;

            await pointsDB.addPointLog({
                member_id: member_id,
                point_change: earnedPoints,
                description: `ได้รับแต้ม - ${transactionDescription}`,
                transaction_type: 'earn',
                balance_before: balanceBeforeEarn,
                balance_after: newBalance,
                reference_id: transactionId,
                expires_date: expiryDate.toISOString().split('T')[0],
                created_by: req.user?.username || 'system'
            });
        }

        // Handle referrer bonus
        if (referrer_phone && (purchase_type === 'installment' || (purchase_type === 'cash' && has_box_set))) {
            const referrer = await pointsDB.findMemberByPhone(referrer_phone.trim());
            if (referrer && referrer.membership_id !== member_id) {
                const referrerPoints = settings.referrer_points || 1000;
                const referredPoints = settings.referred_points || 100;

                // Give points to referrer
                const referrerBalanceBefore = referrer.point_balance;
                const referrerNewBalance = referrerBalanceBefore + referrerPoints;

                await pointsDB.updateMemberBalance(referrer.membership_id, referrerNewBalance);
                await pointsDB.addPointLog({
                    member_id: referrer.membership_id,
                    point_change: referrerPoints,
                    description: `แนะนำเพื่อน - ${member.name}`,
                    transaction_type: 'referral',
                    balance_before: referrerBalanceBefore,
                    balance_after: referrerNewBalance,
                    reference_id: transactionId,
                    expires_date: expiryDate.toISOString().split('T')[0],
                    created_by: req.user?.username || 'system'
                });

                // Give additional points to new member
                newBalance += referredPoints;
                await pointsDB.addPointLog({
                    member_id: member_id,
                    point_change: referredPoints,
                    description: `ได้รับการแนะนำจาก - ${referrer.name}`,
                    transaction_type: 'referred',
                    balance_before: newBalance - referredPoints,
                    balance_after: newBalance,
                    reference_id: transactionId,
                    expires_date: expiryDate.toISOString().split('T')[0],
                    created_by: req.user?.username || 'system'
                });
            }
        }

        // Update member balance
        await pointsDB.updateMemberBalance(member_id, newBalance);

        // Create transaction record
        const discountAmount = usedPoints * (settings.redeem_rate_baht || 1);
        const finalAmount = total_amount - discountAmount;

        const transactionData = [
            transactionId,
            member_id,
            purchase_type,
            total_amount,
            earnedPoints,
            usedPoints,
            discountAmount,
            finalAmount,
            has_box_set || false,
            referrer_phone ? (await pointsDB.findMemberByPhone(referrer_phone.trim()))?.membership_id : null,
            req.user?.username || 'system',
            req.body.branch_id || 'main',
            req.body.pos_terminal || 'pos01'
        ];

        await pointsDB.createTransaction(transactionData);

        // Get updated member data
        const updatedMember = await pointsDB.findMemberByCode(member_id);
        res.json({ success: true, member: updatedMember });
    } catch (error) {
        console.error('Error processing transaction:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการทำรายการ' });
    }
});

// ===========================================
// ADMIN ROUTES
// ===========================================

// Add points to member (Admin)
router.post('/admin/add-points', checkDbReady, async (req, res) => {
    try {
        const { member_id, points, description, type } = req.body;

        if (!member_id || !points || points <= 0) {
            return res.json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
        }

        const member = await pointsDB.findMemberByCode(member_id);
        if (!member) {
            return res.json({ success: false, message: 'ไม่พบข้อมูลสมาชิก' });
        }

        const balanceBefore = member.point_balance;
        const newBalance = balanceBefore + points;

        // Set expiry date for manually added points
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 12);

        // Update member balance
        await pointsDB.updateMemberBalance(member_id, newBalance);

        // Add point log
        await pointsDB.addPointLog({
            member_id: member_id,
            point_change: points,
            description: description || 'เพิ่มแต้มโดย Admin',
            transaction_type: type || 'admin_add',
            balance_before: balanceBefore,
            balance_after: newBalance,
            expires_date: expiryDate.toISOString().split('T')[0],
            created_by: req.user?.username || 'admin'
        });

        // Get updated member
        const updatedMember = await pointsDB.findMemberByCode(member_id);
        res.json({ success: true, member: updatedMember });
    } catch (error) {
        console.error('Error adding points:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มแต้ม' });
    }
});

// Remove points from member (Admin)
router.post('/admin/remove-points', checkDbReady, async (req, res) => {
    try {
        const { member_id, points, description, type } = req.body;

        if (!member_id || !points || points <= 0) {
            return res.json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
        }

        const member = await pointsDB.findMemberByCode(member_id);
        if (!member) {
            return res.json({ success: false, message: 'ไม่พบข้อมูลสมาชิก' });
        }

        if (member.point_balance < points) {
            return res.json({ success: false, message: 'แต้มไม่เพียงพอ' });
        }

        const balanceBefore = member.point_balance;
        const newBalance = balanceBefore - points;

        // Update member balance
        await pointsDB.updateMemberBalance(member_id, newBalance);

        // Add point log
        await pointsDB.addPointLog({
            member_id: member_id,
            point_change: -points,
            description: description || 'ลดแต้มโดย Admin',
            transaction_type: type || 'admin_remove',
            balance_before: balanceBefore,
            balance_after: newBalance,
            created_by: req.user?.username || 'admin'
        });

        // Get updated member
        const updatedMember = await pointsDB.findMemberByCode(member_id);
        res.json({ success: true, member: updatedMember });
    } catch (error) {
        console.error('Error removing points:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลดแต้ม' });
    }
});

// ===========================================
// SETTINGS ROUTES
// ===========================================

// Get system settings
router.get('/settings', checkDbReady, async (req, res) => {
    try {
        const settings = await pointsDB.getSettings();

        // Format settings for frontend
        const formattedSettings = {
            boxSetPoints: settings.box_set_points || 100,
            referrerPoints: settings.referrer_points || 1000,
            referredPoints: settings.referred_points || 100,
            accessoriesRate: {
                points: settings.accessories_rate_points || 1,
                amount: settings.accessories_rate_amount || 20
            },
            redeemRate: {
                points: settings.redeem_rate_points || 1,
                baht: settings.redeem_rate_baht || 1
            },
            maxRedeemPercent: settings.max_redeem_percent || 50,
            minAmountForRedeem: settings.min_amount_for_redeem || 1000,
            pointsExpiry: settings.points_expiry_months || 12
        };

        res.json({ success: true, settings: formattedSettings });
    } catch (error) {
        console.error('Error getting settings:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงการตั้งค่า' });
    }
});

// Update system settings
router.post('/settings/update', checkDbReady, async (req, res) => {
    try {
        const newSettings = req.body;

        // Validate required fields
        if (!newSettings.boxSetPoints || !newSettings.referrerPoints || !newSettings.referredPoints) {
            return res.json({ success: false, message: 'ข้อมูลการตั้งค่าไม่ครบถ้วน' });
        }

        // Update individual settings
        const settingsToUpdate = [
            ['box_set_points', newSettings.boxSetPoints],
            ['referrer_points', newSettings.referrerPoints],
            ['referred_points', newSettings.referredPoints],
            ['accessories_rate_points', newSettings.accessoriesRate?.points || 1],
            ['accessories_rate_amount', newSettings.accessoriesRate?.amount || 20],
            ['redeem_rate_points', newSettings.redeemRate?.points || 1],
            ['redeem_rate_baht', newSettings.redeemRate?.baht || 1],
            ['max_redeem_percent', newSettings.maxRedeemPercent],
            ['min_amount_for_redeem', newSettings.minAmountForRedeem],
            ['points_expiry_months', newSettings.pointsExpiry]
        ];

        for (const [key, value] of settingsToUpdate) {
            await pointsDB.updateSetting(key, value, req.user?.username || 'admin');
        }

        res.json({ success: true, settings: newSettings });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า' });
    }
});

// ===========================================
// STATISTICS AND REPORTING ROUTES
// ===========================================

// Dashboard statistics
router.get('/stats/dashboard', checkDbReady, async (req, res) => {
    try {
        const stats = await pointsDB.getDashboardStats();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงสถิติ' });
    }
});

// Monthly report
router.post('/reports/monthly', checkDbReady, async (req, res) => {
    try {
        const { month, year } = req.body;

        if (!month || !year) {
            return res.json({ success: false, message: 'กรุณาระบุเดือนและปี' });
        }

        const report = await pointsDB.getMonthlyReport(month, year);
        res.json({ success: true, report });
    } catch (error) {
        console.error('Error generating monthly report:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างรายงาน' });
    }
});

// ===========================================
// EXPORT ROUTES
// ===========================================

// Export expiring points
router.get('/export/expiring', checkDbReady, async (req, res) => {
    try {
        const expiringData = await pointsDB.getExpiringPoints();

        // Convert to CSV format
        let csv = 'รหัสสมาชิก,ชื่อ,เบอร์โทร,แต้มใกล้หมดอายุ,วันหมดอายุ\n';
        expiringData.forEach(row => {
            csv += `${row.membership_id},${row.name},${row.phone},${row.expiring_points},${row.earliest_expiry}\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="expiring_points.csv"');
        res.send('\ufeff' + csv); // BOM for proper Thai character display
    } catch (error) {
        console.error('Error exporting expiring points:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล' });
    }
});

// Export all members
router.get('/export/members', checkDbReady, async (req, res) => {
    try {
        const members = await pointsDB.getAllMembers();

        let csv = 'รหัสสมาชิก,ชื่อ,เบอร์โทร,ระดับสมาชิก,แต้มคงเหลือ,วันสมัครสมาชิก\n';

        members.forEach(member => {
            csv += `${member.membership_id},${member.name},${member.phone},${member.member_level},${member.point_balance},${member.created_date}\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="all_members.csv"');
        res.send('\ufeff' + csv); // BOM for proper Thai character display
    } catch (error) {
        console.error('Error exporting members:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล' });
    }
});

// ===========================================
// SAMPLE DATA CREATION (for testing)
// ===========================================

// Create sample data
router.post('/create-sample-data', checkDbReady, async (req, res) => {
    try {
        // Create sample members
        const sampleMembers = [
            { name: 'สมชาย ใจดี', phone: '0812345678', level: 'Diamond', points: 2500 },
            { name: 'สมหญิง สวยใส', phone: '0823456789', level: 'Member', points: 450 },
            { name: 'วิชัย มั่งมี', phone: '0834567890', level: 'Member', points: 120 },
            { name: 'นิรันดร์ รุ่งเรือง', phone: '0845678901', level: 'Diamond', points: 3200 },
            { name: 'อัญชลี สุขสำราญ', phone: '0856789012', level: 'Member', points: 880 }
        ];

        let createdCount = 0;

        for (const sample of sampleMembers) {
            // Check if member already exists
            const existing = await pointsDB.findMemberByPhone(sample.phone);
            if (existing) continue;

            const membershipId = generateMembershipId();
            const qrCode = generateQRCode(membershipId);

            const memberData = {
                membership_id: membershipId,
                name: sample.name,
                phone: sample.phone,
                member_level: sample.level,
                point_balance: sample.points,
                qr_code: qrCode,
                barcode: qrCode,
                created_by: 'sample_data'
            };

            await pointsDB.createMember(memberData);

            // Add initial points log
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 12);

            await pointsDB.addPointLog({
                member_id: membershipId,
                point_change: sample.points,
                description: 'แต้มเริ่มต้น (ข้อมูลตัวอย่าง)',
                transaction_type: 'initial',
                balance_before: 0,
                balance_after: sample.points,
                expires_date: expiryDate.toISOString().split('T')[0],
                created_by: 'sample_data'
            });

            createdCount++;
        }

        res.json({
            success: true,
            message: 'สร้างข้อมูลตัวอย่างสำเร็จ',
            created_members: createdCount
        });
    } catch (error) {
        console.error('Error creating sample data:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างข้อมูลตัวอย่าง' });
    }
});

module.exports = router;
