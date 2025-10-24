// File: routes/employeeAuthRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User/User');
const Employee = require('../models/HR/Employee');

// Employee login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
            });
        }

        // Find user by username
        const user = await User.findOne({ username }).populate('employee');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        // Check if employee exists and is active
        if (!user.employee) {
            return res.status(403).json({
                success: false,
                message: 'ไม่พบข้อมูลพนักงาน กรุณาติดต่อฝ่ายบุคคล'
            });
        }

        if (user.employee.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'บัญชีผู้ใช้ของคุณถูกระงับ กรุณาติดต่อฝ่ายบุคคล'
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        // Return employee data (exclude sensitive fields)
        const employeeData = {
            id: user.employee._id,
            username: user.username,
            name: user.employee.name,
            email: user.employee.email,
            position: user.employee.position,
            department: user.employee.department,
            branch: user.employee.branch
        };

        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            employee: employeeData
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง'
        });
    }
});

// Verify token/session (for future use)
router.get('/verify', (req, res) => {
    // This endpoint can be used to verify if user is still logged in
    // For now, we're using localStorage on the client side
    res.json({
        success: true,
        message: 'Token verification endpoint'
    });
});

// Logout (for future use)
router.post('/logout', (req, res) => {
    // This endpoint can be used to invalidate tokens/sessions
    // For now, we're handling logout on the client side
    res.json({
        success: true,
        message: 'ออกจากระบบสำเร็จ'
    });
});

module.exports = router;
