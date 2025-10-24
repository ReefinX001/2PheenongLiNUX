const fs = require('fs');
const path = require('path');

/**
 * Middleware to ensure upload directories exist
 * @param {string} subDir - Subdirectory name (e.g., 'popups', 'campaigns')
 */
const ensureUploadsDir = (subDir = '') => {
    return (req, res, next) => {
        const baseUploadPath = path.join(__dirname, '../public/uploads');
        const fullUploadPath = subDir ? path.join(baseUploadPath, subDir) : baseUploadPath;

        try {
            // Create base uploads directory if it doesn't exist
            if (!fs.existsSync(baseUploadPath)) {
                fs.mkdirSync(baseUploadPath, { recursive: true });
                console.log(`Created uploads directory: ${baseUploadPath}`);
            }

            // Create subdirectory if specified and doesn't exist
            if (subDir && !fs.existsSync(fullUploadPath)) {
                fs.mkdirSync(fullUploadPath, { recursive: true });
                console.log(`Created uploads subdirectory: ${fullUploadPath}`);
            }

            next();
        } catch (error) {
            console.error('Error creating upload directories:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการเตรียมโฟลเดอร์สำหรับอัปโหลดไฟล์'
            });
        }
    };
};

module.exports = ensureUploadsDir;
