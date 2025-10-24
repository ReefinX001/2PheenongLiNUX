// Security Headers Middleware
// ตั้งค่า security headers ที่ server-side (วิธีที่ถูกต้อง)

module.exports = function securityHeaders(req, res, next) {
    // Headers ที่ต้องตั้งค่าที่ server-side เท่านั้น
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Content Security Policy (updated to support media and blob)
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
        "img-src 'self' data: blob: https: http:; " +
        "media-src 'self' blob: data:; " +
        "connect-src 'self' data: https://graph.facebook.com https://graph.instagram.com https://api.instagram.com https://basic-display.api.instagram.com https:; " +
        "frame-src 'self';"
    );

    // Remove powered by header
    res.removeHeader('X-Powered-By');

    next();
};

/* วิธีใช้งานใน server.js:

const securityHeaders = require('./middlewares/securityHeaders');

// ใส่ก่อน routes ทั้งหมด
app.use(securityHeaders);

// หรือใช้ helmet package (แนะนำ):
const helmet = require('helmet');
app.use(helmet({
    frameguard: { action: 'deny' },
    contentSecurityPolicy: false, // ตั้งค่าเองตามความต้องการ
}));

*/
