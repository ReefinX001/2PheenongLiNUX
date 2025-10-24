const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const config = {
    port: 4001,
    host: '0.0.0.0',
    printerName: 'EPSON TM-T82X',
    tailscaleIP: '100.106.108.57', //  แก้ไข IP ให้ถูกต้อง
    apiKey: 'printer-server-key-2024',
    // เพิ่ม whitelist สำหรับ web server
    allowedOrigins: [
        'http://100.110.180.13',         // Web Server
        'http://100.110.180.13:3000',    // Web Server with port
        'http://100.110.180.13:4000',    // Web Server with port
        'http://100.106.108.57',         // Local server
        'http://localhost:3000',         // Local development
        'http://localhost:4000',         // Local development
        'http://127.0.0.1:3000',         // Local development
        'http://127.0.0.1:4000',         // Local development
        'http://192.168.1.100',          // Local network
        'http://192.168.1.101',          // Local network
        'http://192.168.1.102',          // Local network
        'http://192.168.1.103',          // Local network
        'http://192.168.1.104',          // Local network
        'http://192.168.1.105',          // Local network
        'http://192.168.1.106',          // Local network
        'http://192.168.1.107',          // Local network
        'http://192.168.1.108',          // Local network
        'http://192.168.1.109',          // Local network
        'http://192.168.1.110',          // Local network
    ]
};

class ProductionPrinterServer {
    constructor() {
        this.startTime = new Date();
        this.printJobs = 0;
        this.errors = 0;
        this.server = null;
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level}] ${message}`);
    }

    // Check if origin is allowed
    isOriginAllowed(origin) {
        if (!origin) return false;

        // Check exact match
        if (config.allowedOrigins.includes(origin)) return true;

        // Check if origin starts with allowed patterns
        const allowedPatterns = [
            'http://100.110.180.13',
            'http://100.106.108.57',
            'http://localhost',
            'http://127.0.0.1',
            'http://192.168.1.'
        ];

        return allowedPatterns.some(pattern => origin.startsWith(pattern));
    }

    // Set CORS headers
    setCorsHeaders(res, origin) {
        if (this.isOriginAllowed(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400');
    }

    // Verify API key
    verifyApiKey(req) {
        const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
        return apiKey === config.apiKey;
    }

    async checkPrinterStatus() {
        try {
            const { stdout } = await execAsync(`powershell -Command "Get-Printer -Name '${config.printerName}' -ErrorAction SilentlyContinue | ConvertTo-Json"`);
            const printer = JSON.parse(stdout);
            return {
                available: true,
                status: printer.PrinterStatus,
                name: printer.Name,
                location: printer.Location,
                driverName: printer.DriverName
            };
        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }

    async testPrint() {
        try {
            const testContent = `TEST PRINT
====================
Date: ${new Date().toLocaleDateString('th-TH')}
Time: ${new Date().toLocaleTimeString('th-TH')}
Printer: ${config.printerName}
Method: Windows API
Tailscale IP: ${config.tailscaleIP}
Server Port: ${config.port}
====================
Test Successful!
`;

            const tempFile = path.join(__dirname, 'test-print.txt');
            fs.writeFileSync(tempFile, testContent, 'utf8');

            await execAsync(`powershell -Command "Get-Content '${tempFile}' | Out-Printer -Name '${config.printerName}'"`);

            // Clean up
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }

            this.printJobs++;
            return {
                success: true,
                method: 'Windows API',
                timestamp: new Date().toISOString(),
                message: 'Test print completed successfully'
            };
        } catch (error) {
            this.errors++;
            throw new Error(`Test print failed: ${error.message}`);
        }
    }

    async print(content, options = {}) {
        try {
            const tempFile = path.join(__dirname, `print-${Date.now()}.txt`);
            fs.writeFileSync(tempFile, content, 'utf8');

            await execAsync(`powershell -Command "Get-Content '${tempFile}' | Out-Printer -Name '${config.printerName}'"`);

            // Clean up
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }

            this.printJobs++;
            return {
                success: true,
                method: 'Windows API',
                timestamp: new Date().toISOString(),
                contentLength: content.length,
                options: options
            };
        } catch (error) {
            this.errors++;
            throw new Error(`Print failed: ${error.message}`);
        }
    }

    getMetrics() {
        const uptime = Date.now() - this.startTime.getTime();
        return {
            server: {
                startTime: this.startTime.toISOString(),
                uptime: uptime,
                uptimeHours: Math.floor(uptime / (1000 * 60 * 60)),
                tailscaleIP: config.tailscaleIP,
                port: config.port
            },
            printer: {
                name: config.printerName,
                printJobs: this.printJobs,
                errors: this.errors,
                errorRate: this.printJobs > 0 ? (this.errors / this.printJobs * 100).toFixed(2) + '%' : '0%'
            }
        };
    }

    async handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        const method = req.method;
        const origin = req.headers.origin;

        // Set CORS headers
        this.setCorsHeaders(res, origin);

        // Handle preflight requests
        if (method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        // Verify API key for POST requests
        if (method === 'POST' && !this.verifyApiKey(req)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Unauthorized - Invalid API key'
            }));
            return;
        }

        this.log(`${method} ${pathname} - Origin: ${origin || 'none'}`);

        try {
            if (pathname === '/health' || pathname === '/') {
                // Health check
                const health = {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    server: {
                        tailscaleIP: config.tailscaleIP,
                        port: config.port
                    },
                    printer: await this.checkPrinterStatus()
                };

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: health }));

            } else if (pathname === '/api/printer/status') {
                // Check printer status
                const status = await this.checkPrinterStatus();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    data: status,
                    timestamp: new Date().toISOString()
                }));

            } else if (pathname === '/api/printer/test' && method === 'POST') {
                // Test print
                const result = await this.testPrint();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    data: result,
                    message: 'Test print completed successfully'
                }));

            } else if (pathname === '/api/printer/print' && method === 'POST') {
                // Print content
                let body = '';
                req.on('data', chunk => body += chunk.toString());
                req.on('end', async () => {
                    try {
                        const data = JSON.parse(body);
                        const { content, branchCode, documentType, historyId } = data;

                        if (!content) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: false,
                                error: 'Content is required'
                            }));
                            return;
                        }

                        this.log(`Print request - Branch: ${branchCode}, Document: ${documentType}, History: ${historyId}`);

                        const result = await this.print(content, {
                            branchCode,
                            documentType,
                            historyId
                        });

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            data: result,
                            message: 'Print completed successfully'
                        }));

                    } catch (error) {
                        this.log(`Print error: ${error.message}`, 'ERROR');
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: false,
                            error: error.message
                        }));
                    }
                });

            } else if (pathname === '/api/printer/metrics') {
                // Get metrics
                const metrics = this.getMetrics();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    data: metrics,
                    timestamp: new Date().toISOString()
                }));

            } else {
                // 404 Not Found
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Not Found',
                    availableEndpoints: [
                        'GET /health',
                        'GET /api/printer/status',
                        'POST /api/printer/test',
                        'POST /api/printer/print',
                        'GET /api/printer/metrics'
                    ]
                }));
            }

        } catch (error) {
            this.log(`Server error: ${error.message}`, 'ERROR');
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Internal Server Error'
            }));
        }
    }

    start() {
        this.server = http.createServer(this.handleRequest.bind(this));

        this.server.listen(config.port, config.host, () => {
            this.log(`  Production Printer Server started successfully!`);
            this.log(` Server running on: http://${config.host}:${config.port}`);
            this.log(` Tailscale IP: ${config.tailscaleIP}:${config.port}`);
            this.log(`  Printer: ${config.printerName}`);
            this.log(` API Key: ${config.apiKey}`);
            this.log(` Ready to accept print jobs!`);
        });

        this.server.on('error', (err) => {
            this.log(` Server error: ${err.message}`, 'ERROR');
        });

        // Graceful shutdown
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());
    }

    shutdown() {
        this.log(' Shutting down server...');

        if (this.server) {
            this.server.close(() => {
                this.log(' Server stopped gracefully');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    }
}

// Start server
const printerServer = new ProductionPrinterServer();
printerServer.start();

// Export for testing
module.exports = { ProductionPrinterServer, config };
