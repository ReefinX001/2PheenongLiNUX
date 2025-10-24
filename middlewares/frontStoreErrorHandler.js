// Error Handler Middleware สำหรับ FrontStore API
const errorHandler = (err, req, res, next) => {
    console.error('API Error:', err);

    // Multer file upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 200MB)',
            error: 'FILE_TOO_LARGE'
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: 'จำนวนไฟล์เกินที่กำหนด',
            error: 'TOO_MANY_FILES'
        });
    }

    if (err.message && err.message.includes('รองรับเฉพาะไฟล์')) {
        return res.status(400).json({
            success: false,
            message: err.message,
            error: 'INVALID_FILE_TYPE'
        });
    }

    // MongoDB validation errors
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: 'ข้อมูลไม่ถูกต้อง',
            errors: errors,
            error: 'VALIDATION_ERROR'
        });
    }

    // MongoDB cast errors (invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'รหัสสินค้าไม่ถูกต้อง',
            error: 'INVALID_ID'
        });
    }

    // MongoDB duplicate key errors
    if (err.code === 11000) {
        return res.status(409).json({
            success: false,
            message: 'ข้อมูลซ้ำ',
            error: 'DUPLICATE_DATA'
        });
    }

    // JSON parsing errors
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            message: 'รูปแบบข้อมูล JSON ไม่ถูกต้อง',
            error: 'INVALID_JSON'
        });
    }

    // Body parser errors (request too large)
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            message: 'ข้อมูลมีขนาดใหญ่เกินไป',
            error: 'REQUEST_TOO_LARGE'
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: 'INTERNAL_SERVER_ERROR',

    });
};

module.exports = errorHandler;
