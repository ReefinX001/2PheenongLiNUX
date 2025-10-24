const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// เพิ่ม Sharp สำหรับจัดการรูปภาพ
const sharp = require('sharp');

// Configuration
const config = {
    port: 4001,
    host: '0.0.0.0',
    printerName: 'TM-T82X',
    tailscaleIP: '100.106.108.57', // แก้ไข IP ให้ถูกต้อง
    apiKey: 'printer-server-key-2024',
    // เพิ่ม whitelist สำหรับ web server
    allowedOrigins: [
        'http://100.110.180.13',      // Web Server
        'http://100.110.180.13:3000', // Web Server with port
        'http://100.110.180.13:8080', // Web Server with port
        'http://100.106.108.57',      // Local Tailscale IP
        'http://localhost:3000',      // Local development
        'http://localhost:8080',      // Local development
        'http://127.0.0.1:3000',      // Local development
        'http://127.0.0.1:8080'       // Local development
    ],
    // Branch information
    branchInfo: {
        code: '00000',
        name: 'สำนักงานใหญ่',
        location: 'ปัตตานี'
    }
};

class ProductionPrinterServer {
    constructor() {
        this.startTime = new Date();
        this.printJobs = 0;
        this.errors = 0;
        this.lastPrintTime = null;
        this.connectionLog = [];
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = '[' + timestamp + '] [' + level + '] ' + message;
        console.log(logEntry);

        // Keep connection log (last 100 entries)
        this.connectionLog.push({ timestamp, level, message });
        if (this.connectionLog.length > 100) {
            this.connectionLog.shift();
        }
    }

    // Check if origin is allowed
    isAllowedOrigin(origin) {
        if (!origin) return true; // Allow requests without origin (like Postman)
        return config.allowedOrigins.includes(origin);
    }

    async checkPrinterStatus() {
        try {
            const { stdout } = await execAsync('powershell -Command "Get-Printer -Name \'' + config.printerName + '\' -ErrorAction SilentlyContinue | ConvertTo-Json"');
            const printer = JSON.parse(stdout);
            return {
                available: true,
                status: printer.PrinterStatus,
                name: printer.Name,
                driverName: printer.DriverName || 'Unknown',
                portName: printer.PortName || 'Unknown'
            };
        } catch (error) {
            this.log('Printer check failed: ' + error.message, 'WARN');
            return {
                available: false,
                error: error.message
            };
        }
    }

    async testPrint() {
        try {
            const testContent = 'TEST PRINT\n' +
                '====================\n' +
                'Date: ' + new Date().toLocaleDateString('th-TH') + '\n' +
                'Time: ' + new Date().toLocaleTimeString('th-TH') + '\n' +
                'Branch: ' + config.branchInfo.name + ' (' + config.branchInfo.code + ')\n' +
                'Printer: ' + config.printerName + '\n' +
                'Method: Out-Printer (Receipt)\n' +
                'Tailscale IP: ' + config.tailscaleIP + '\n' +
                '====================\n' +
                'Test Successful!\n\n';

            const tempFile = path.join(__dirname, 'test-print.txt');
            fs.writeFileSync(tempFile, testContent, 'utf8');

            // Use Out-Printer with proper service configuration for thermal receipt printers
            await execAsync("powershell -Command \"& {Get-Content '" + tempFile + "' | Out-Printer -Name '" + config.printerName + "'}\"");

            // Clean up temp file after a short delay
            setTimeout(() => {
                try {
                    if (fs.existsSync(tempFile)) {
                        fs.unlinkSync(tempFile);
                    }
                } catch (cleanupError) {
                    this.log('Cleanup warning: ' + cleanupError.message, 'WARN');
                }
            }, 1000);

            this.printJobs++;
            this.lastPrintTime = new Date();

            this.log('Test print successful', 'INFO');

            return {
                success: true,
                method: 'Out-Printer (Receipt)',
                timestamp: new Date().toISOString(),
                printerName: config.printerName,
                branchCode: config.branchInfo.code
            };
        } catch (error) {
            this.errors++;
            this.log('Test print failed: ' + error.message, 'ERROR');
            throw new Error('Test print failed: ' + error.message);
        }
    }

    // เพิ่ม method ใหม่สำหรับพิมพ์รูปภาพ
    async printImage(base64ImageData, options = {}) {
        try {
            this.log('🖼️ Processing base64 image for printing...', 'INFO');

            // แปลง base64 เป็น buffer
            const base64Data = base64ImageData.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');

            // แปลงเป็น PNG และปรับขนาดให้เหมาะกับเครื่องพิมพ์ thermal (576px width)
            const processedImageBuffer = await sharp(imageBuffer)
                .resize(576, null, {
                    fit: 'inside',
                    withoutEnlargement: false
                })
                .png()
                .toBuffer();

            // สร้างไฟล์ temporary สำหรับพิมพ์
            const tempImageFile = path.join(__dirname, 'temp-print-' + Date.now() + '.png');
            fs.writeFileSync(tempImageFile, processedImageBuffer);

            this.log('💾 Saved temporary image: ' + tempImageFile, 'INFO');
            this.log('📏 Image size: ' + processedImageBuffer.length + ' bytes', 'INFO');

            // ใช้ Windows Print API ที่เหมาะกับ thermal printer
            const printCommand = 'powershell -Command "' +
                'Add-Type -AssemblyName System.Drawing; ' +
                'Add-Type -AssemblyName System.Windows.Forms; ' +
                "$img = [System.Drawing.Image]::FromFile('" + tempImageFile + "'); " +
                '$pd = New-Object System.Drawing.Printing.PrintDocument; ' +
                "$pd.PrinterSettings.PrinterName = '" + config.printerName + "'; " +
                "$pd.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize('Custom', 226, [int]($img.Height * 226 / $img.Width)); " +
                '$pd.add_PrintPage({ ' +
                    'param($sender, $e); ' +
                    '$e.Graphics.DrawImage($img, 0, 0, 226, [int]($img.Height * 226 / $img.Width)); ' +
                '}); ' +
                '$pd.Print(); ' +
                '$img.Dispose();"';

            this.log('🖨️ Sending image to thermal printer...', 'INFO');
            await execAsync(printCommand);

            // ลบไฟล์ temporary หลังจากพิมพ์เสร็จ
            setTimeout(() => {
                try {
                    if (fs.existsSync(tempImageFile)) {
                        fs.unlinkSync(tempImageFile);
                        this.log('🗑️ Cleaned up temporary file: ' + tempImageFile, 'INFO');
                    }
                } catch (cleanupError) {
                    this.log('⚠️ Cleanup warning: ' + cleanupError.message, 'WARN');
                }
            }, 2000);

            this.printJobs++;
            this.lastPrintTime = new Date();

            this.log('✅ Image print completed successfully', 'INFO');

            return {
                success: true,
                method: 'Windows Print API (Image)',
                timestamp: new Date().toISOString(),
                imageSize: processedImageBuffer.length,
                printerName: config.printerName,
                branchCode: config.branchInfo.code
            };

        } catch (error) {
            this.errors++;
            this.log('❌ Image print failed: ' + error.message, 'ERROR');
            throw new Error('Image print failed: ' + error.message);
        }
    }

    // แก้ไข method print() ให้เรียกใช้ printImage() เมื่อได้รับ base64
    async print(content, options = {}) {
        try {
            // เพิ่ม logging สำหรับการ debug
            this.log('🎯 Print request received - Content type: ' + typeof content + ', Length: ' + (typeof content === 'string' ? content.length : 'N/A'), 'INFO');

            let printContent = content;

            // แก้ไข: ตรวจจับ base64 image ได้หลายรูปแบบ
            if (typeof content === 'string') {
                // ตรวจจับ data URI format
                if (content.startsWith('data:image/')) {
                    this.log('🖼️ Detected data URI image, using image printing method', 'INFO');
                    return await this.printImage(content, options);
                }

                // ตรวจจับ base64 ธรรมดา (ความยาวมาก และมีลักษณะของ base64)
                if (content.length > 100 &&
                    /^[A-Za-z0-9+/]+=*$/.test(content) &&
                    content.length % 4 === 0) {
                    this.log('🖼️ Detected raw base64 image, using image printing method', 'INFO');
                    // เพิ่ม data URI prefix เพื่อให้ printImage() ประมวลผลได้
                    const dataURI = 'data:image/png;base64,' + content;
                    return await this.printImage(dataURI, options);
                }

                // รองรับ test commands พิเศษ (ถ้าไม่ใช่ base64 image)
                // รองรับคำสั่งทดสอบพิเศษ
                if (content === 'PAPER_FEED_TEST') {
                    printContent = '\n\n' +
                        '***************************\n' +
                        '    PAPER FEED TEST\n' +
                        '***************************\n' +
                        'Date: ' + new Date().toLocaleDateString('th-TH') + '\n' +
                        'Time: ' + new Date().toLocaleTimeString('th-TH') + '\n' +
                        'Branch: ' + config.branchInfo.name + '\n' +
                        'Printer: ' + config.printerName + '\n\n' +
                        'กระดาษควรออกมาจากเครื่องพิมพ์\n' +
                        'หากเห็นข้อความนี้แสดงว่า\n' +
                        'เครื่องพิมพ์ทำงานปกติ\n\n' +
                        '***************************\n\n\n';
                }
                // Mock test calls removed for production use
                else {
                    // ใช้ content ตามที่ส่งมา
                    printContent = content;
                }
            }
            // แก้ไข: รองรับ object format
            else if (typeof content === 'object' && content !== null) {
                // รองรับ object ที่มี base64 data
                if (content.base64) {
                    this.log('Detected structured base64 image data', 'INFO');
                    return await this.printImage(content.base64, options);
                }
                // รองรับ object ที่มี image data
                else if (content.image) {
                    this.log('Detected object with image field', 'INFO');
                    return await this.printImage(content.image, options);
                }
                // รองรับ object ที่มี content field
                else if (content.content) {
                    this.log('Detected object with content field', 'INFO');
                    return await this.print(content.content, options);
                }
                // ถ้าไม่มี field ที่รู้จัก ให้แปลงเป็น JSON แล้วพิมพ์
                else {
                    this.log('Received unknown object format, converting to JSON', 'INFO');
                    printContent = JSON.stringify(content, null, 2);
                }
            }

            // ป้องกัน Base64 data ไม่ให้ไปถึง text printer
            if (printContent && printContent.length > 100) {
                if (/^[A-Za-z0-9+\/]/.test(printContent) &&
                    (printContent.includes('iVBORw0') ||
                     printContent.includes('/9j/') ||
                     printContent.includes('R0lGOD') ||
                     printContent.includes('UklGR'))) {
                    this.log('🚨 BLOCKED: Base64 detected - using image printer', 'WARN');
                    const dataURI = 'data:image/png;base64,' + printContent;
                    return await this.printImage(dataURI, options);
                }
            }

            const tempFile = path.join(__dirname, 'print-' + Date.now() + '.txt');
            fs.writeFileSync(tempFile, printContent, 'utf8');

            // Use Out-Printer with proper service configuration for thermal receipt printers
            await execAsync("powershell -Command \"& {Get-Content '" + tempFile + "' | Out-Printer -Name '" + config.printerName + "'}\"");

            // Clean up temp file after a short delay
            setTimeout(() => {
                try {
                    if (fs.existsSync(tempFile)) {
                        fs.unlinkSync(tempFile);
                    }
                } catch (cleanupError) {
                    this.log('Cleanup warning: ' + cleanupError.message, 'WARN');
                }
            }, 1000);

            this.printJobs++;
            this.lastPrintTime = new Date();

            this.log('✅ Text print successful - Length: ' + printContent.length, 'INFO');

            return {
                success: true,
                method: 'Out-Printer (Text)',
                timestamp: new Date().toISOString(),
                contentLength: printContent.length,
                contentType: typeof content,
                printerName: config.printerName,
                branchCode: config.branchInfo.code
            };
        } catch (error) {
            this.errors++;
            this.log('Print job failed: ' + error.message, 'ERROR');
            throw new Error('Print failed: ' + error.message);
        }
    }

    getMetrics() {
        const uptime = Date.now() - this.startTime.getTime();
        const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
        const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

        return {
            uptime: uptime,
            uptimeFormatted: uptimeHours + 'h ' + uptimeMinutes + 'm',
            startTime: this.startTime.toISOString(),
            printJobs: this.printJobs,
            errors: this.errors,
            lastPrintTime: this.lastPrintTime ? this.lastPrintTime.toISOString() : null,
            successRate: this.printJobs > 0 ? ((this.printJobs / (this.printJobs + this.errors)) * 100).toFixed(2) + '%' : 'N/A',
            branch: config.branchInfo,
            tailscale: {
                ip: config.tailscaleIP,
                enabled: true
            },
            system: {
                platform: process.platform,
                nodeVersion: process.version,
                memory: process.memoryUsage()
            }
        };
    }

    createResponse(data, statusCode = 200, contentType = 'application/json', origin = null) {
        const response = JSON.stringify(data, null, 2);
        const allowedOrigin = this.isAllowedOrigin(origin) ? origin : '*';

        return {
            statusCode,
            headers: {
                'Content-Type': contentType,
                'Content-Length': Buffer.byteLength(response),
                'Access-Control-Allow-Origin': allowedOrigin,
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
                'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization, Origin, Accept',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Max-Age': '86400', // 24 hours
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block'
            },
            body: response
        };
    }

    authenticateRequest(req) {
        const urlObj = url.parse(req.url, true);
        const apiKey = req.headers['x-api-key'] ||
                      req.headers['authorization']?.replace('Bearer ', '') ||
                      urlObj.query.apiKey;

        if (!apiKey) {
            this.log('Authentication failed: No API key provided', 'WARN');
            return false;
        }

        if (apiKey !== config.apiKey) {
            this.log('Authentication failed: Invalid API key', 'WARN');
            return false;
        }

        return true;
    }

    async handleRequest(req, res) {
        const urlObj = url.parse(req.url, true);
        const pathname = urlObj.pathname;
        const method = req.method;
        const origin = req.headers.origin;
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const clientIP = req.socket.remoteAddress || req.connection.remoteAddress;

        this.log(method + ' ' + pathname + ' from ' + clientIP + ' (Origin: ' + (origin || 'N/A') + ') Agent: ' + userAgent, 'INFO');

        // Enhanced CORS preflight
        if (method === 'OPTIONS') {
            const allowedOrigin = this.isAllowedOrigin(origin) ? origin : '*';
            res.writeHead(200, {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
                'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization, Origin, Accept',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Max-Age': '86400'
            });
            res.end();
            return;
        }

        // Health check (no auth required)
        if (pathname === '/health') {
            const uptime = Date.now() - this.startTime.getTime();
            const response = this.createResponse({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: uptime,
                version: '1.1.0',
                branch: config.branchInfo,
                tailscale: {
                    ip: config.tailscaleIP,
                    enabled: true
                },
                server: {
                    platform: process.platform,
                    nodeVersion: process.version
                }
            }, 200, 'application/json', origin);
            res.writeHead(response.statusCode, response.headers);
            res.end(response.body);
            return;
        }

        // Check origin for API routes
        if (pathname.startsWith('/api/') && !this.isAllowedOrigin(origin)) {
            this.log('Origin not allowed: ' + origin, 'WARN');
            const response = this.createResponse({
                success: false,
                error: 'Origin not allowed'
            }, 403, 'application/json', origin);
            res.writeHead(response.statusCode, response.headers);
            res.end(response.body);
            return;
        }

        // API routes require authentication
        if (pathname.startsWith('/api/')) {
            if (!this.authenticateRequest(req)) {
                const response = this.createResponse({
                    success: false,
                    error: 'Authentication required. Please provide valid API key.'
                }, 401, 'application/json', origin);
                res.writeHead(response.statusCode, response.headers);
                res.end(response.body);
                return;
            }
        }

        try {
            switch (pathname) {
                case '/':
                    // API info endpoint
                    const response = this.createResponse({
                        message: 'Printer Server API',
                        version: '1.1.0',
                        branch: config.branchInfo,
                        tailscale: config.tailscaleIP,
                        endpoints: {
                            health: '/health',
                            status: '/api/printer/status',
                            test: '/api/printer/test',
                            print: '/api/printer/print',
                            metrics: '/api/printer/metrics',
                            logs: '/api/printer/logs'
                        },
                        authentication: {
                            required: true,
                            methods: ['X-API-Key header', 'Authorization Bearer', 'apiKey query parameter']
                        }
                    }, 200, 'application/json', origin);
                    res.writeHead(response.statusCode, response.headers);
                    res.end(response.body);
                    break;

                case '/api/printer/status':
                    const status = await this.checkPrinterStatus();
                    const statusResponse = this.createResponse({
                        success: true,
                        data: {
                            ready: status.available,
                            connected: status.available,
                            printer: {
                                name: config.printerName,
                                type: 'windows',
                                method: 'Windows API',
                                driver: status.driverName || 'Unknown',
                                port: status.portName || 'Unknown'
                            },
                            branch: config.branchInfo,
                            tailscale: {
                                ip: config.tailscaleIP,
                                enabled: true
                            },
                            timestamp: new Date().toISOString()
                        }
                    }, 200, 'application/json', origin);
                    res.writeHead(statusResponse.statusCode, statusResponse.headers);
                    res.end(statusResponse.body);
                    break;

                case '/api/printer/test':
                    if (method === 'POST') {
                        const result = await this.testPrint();
                        const testResponse = this.createResponse({
                            success: true,
                            data: result
                        }, 200, 'application/json', origin);
                        res.writeHead(testResponse.statusCode, testResponse.headers);
                        res.end(testResponse.body);
                    } else {
                        const methodResponse = this.createResponse({
                            success: false,
                            error: 'Method not allowed. Use POST.'
                        }, 405, 'application/json', origin);
                        res.writeHead(methodResponse.statusCode, methodResponse.headers);
                        res.end(methodResponse.body);
                    }
                    break;

                case '/api/printer/print':
                    if (method === 'POST') {
                        let body = '';
                        req.on('data', chunk => {
                            body += chunk.toString();
                        });
                        req.on('end', async () => {
                            try {
                                const requestData = JSON.parse(body);
                                const { content, image, text } = requestData;

                                // Support multiple content formats
                                let printContent = content || image || text;

                                if (!printContent) {
                                    const errorResponse = this.createResponse({
                                        success: false,
                                        error: 'Content is required. Provide content, image, or text field.'
                                    }, 400, 'application/json', origin);
                                    res.writeHead(errorResponse.statusCode, errorResponse.headers);
                                    res.end(errorResponse.body);
                                    return;
                                }

                                const result = await this.print(printContent, requestData);
                                const printResponse = this.createResponse({
                                    success: true,
                                    data: result
                                }, 200, 'application/json', origin);
                                res.writeHead(printResponse.statusCode, printResponse.headers);
                                res.end(printResponse.body);
                            } catch (error) {
                                this.log('Print request error: ' + error.message, 'ERROR');
                                const errorResponse = this.createResponse({
                                    success: false,
                                    error: error.message,
                                    timestamp: new Date().toISOString()
                                }, 500, 'application/json', origin);
                                res.writeHead(errorResponse.statusCode, errorResponse.headers);
                                res.end(errorResponse.body);
                            }
                        });
                    } else {
                        const methodResponse = this.createResponse({
                            success: false,
                            error: 'Method not allowed. Use POST.'
                        }, 405, 'application/json', origin);
                        res.writeHead(methodResponse.statusCode, methodResponse.headers);
                        res.end(methodResponse.body);
                    }
                    break;

                case '/api/printer/metrics':
                    const metrics = this.getMetrics();
                    const metricsResponse = this.createResponse({
                        success: true,
                        data: metrics
                    }, 200, 'application/json', origin);
                    res.writeHead(metricsResponse.statusCode, metricsResponse.headers);
                    res.end(metricsResponse.body);
                    break;

                case '/api/printer/logs':
                    const logs = this.connectionLog.slice(-50); // Last 50 entries
                    const logsResponse = this.createResponse({
                        success: true,
                        data: {
                            logs: logs,
                            total: this.connectionLog.length,
                            showing: logs.length
                        }
                    }, 200, 'application/json', origin);
                    res.writeHead(logsResponse.statusCode, logsResponse.headers);
                    res.end(logsResponse.body);
                    break;

                default:
                    const notFoundResponse = this.createResponse({
                        success: false,
                        error: 'Endpoint not found',
                        availableEndpoints: [
                            '/health',
                            '/api/printer/status',
                            '/api/printer/test',
                            '/api/printer/print',
                            '/api/printer/metrics',
                            '/api/printer/logs'
                        ]
                    }, 404, 'application/json', origin);
                    res.writeHead(notFoundResponse.statusCode, notFoundResponse.headers);
                    res.end(notFoundResponse.body);
            }
        } catch (error) {
            this.log('Error handling request: ' + error.message, 'ERROR');
            const errorResponse = this.createResponse({
                success: false,
                error: 'Internal server error',
                message: error.message,
                timestamp: new Date().toISOString()
            }, 500, 'application/json', origin);
            res.writeHead(errorResponse.statusCode, errorResponse.headers);
            res.end(errorResponse.body);
        }
    }

    start() {
        const server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        server.listen(config.port, config.host, () => {
            this.log('🖨️  Production Printer Server Started!', 'INFO');
            this.log('📍 Branch: ' + config.branchInfo.name + ' (' + config.branchInfo.code + ')', 'INFO');
            this.log('🌐 Server: http://' + config.host + ':' + config.port, 'INFO');
            this.log('🔗 Tailscale: http://' + config.tailscaleIP + ':' + config.port, 'INFO');
            this.log('🔑 API Key: ' + config.apiKey, 'INFO');
            this.log('🖨️  Printer: ' + config.printerName, 'INFO');
            this.log('✅ Allowed Origins: ' + config.allowedOrigins.length + ' configured', 'INFO');
            this.log('🔄 Ready to accept requests!', 'INFO');
            this.log('Press Ctrl+C to stop', 'INFO');
        });

        // Error handling
        server.on('error', (error) => {
            this.log('Server error: ' + error.message, 'ERROR');
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            this.log('Received SIGINT, shutting down gracefully...', 'INFO');
            server.close(() => {
                this.log('Server stopped', 'INFO');
                process.exit(0);
            });
        });

        process.on('SIGTERM', () => {
            this.log('Received SIGTERM, shutting down gracefully...', 'INFO');
            server.close(() => {
                this.log('Server stopped', 'INFO');
                process.exit(0);
            });
        });
    }
}

// Start the server
const server = new ProductionPrinterServer();
server.start();
