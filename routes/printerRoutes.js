const express = require('express');
const router = express.Router();
const authJWT = require('../middlewares/authJWT');
const axios = require('axios');

// Printer configuration สำหรับแต่ละสาขา
const PRINTER_CONFIG = {
    '00000': {
        url: 'http://100.106.108.57:4001', //  Tailscale IP สำนักงานใหญ่
        name: 'สำนักงานใหญ่',
        apiKey: 'printer-server-key-2024'
    },
    '00001': {
        url: 'http://192.168.1.121:4001',
        name: 'สาขาหาดใหญ่',
        apiKey: 'printer-server-key-2024'
    },
    '00002': {
        url: 'http://192.168.1.122:4001',
        name: 'สาขาสตูล',
        apiKey: 'printer-server-key-2024'
    },
    '00003': {
        url: 'http://192.168.1.123:4001',
        name: 'สาขาพัทลุง',
        apiKey: 'printer-server-key-2024'
    },
    '00004': {
        url: 'http://192.168.1.124:4001',
        name: 'สาขานครศรีธรรมราช',
        apiKey: 'printer-server-key-2024'
    }
};

// Helper function to get printer config
function getPrinterConfig(branchCode) {
    const config = PRINTER_CONFIG[branchCode] || PRINTER_CONFIG['00000'];
    return config;
}

// Helper function to make printer request
async function makePrinterRequest(config, endpoint, method = 'GET', data = null) {
    const url = `${config.url}${endpoint}`;

    const options = {
        method,
        url,
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.apiKey
        },
        timeout: 10000, // 10 seconds timeout
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.data = data;
    }

    try {
        const response = await axios(options);

        if (response.status >= 400) {
            throw new Error(response.data?.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response.data;
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            throw new Error(`ไม่สามารถเชื่อมต่อกับเครื่องพิมพ์ที่ ${config.name} (${config.url})`);
        }
        throw error;
    }
}

//  POST /api/printer/print - Print via proxy
router.post('/print', authJWT, async (req, res) => {
    try {
        const { image, content, text, branchCode, documentType, historyId } = req.body;

        if (!image && !content && !text) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุข้อมูลที่จะพิมพ์ (image, content, หรือ text)'
            });
        }

        // ใช้ branch code จาก user หรือจาก request
        const targetBranch = branchCode || req.user?.branchCode || '00000';
        const config = getPrinterConfig(targetBranch);

        console.log(`[PrinterProxy] Printing to branch ${targetBranch} (${config.name})`);

        // เตรียมข้อมูลส่งไป printer server
        const printData = {
            content: image || content || text,
            branchCode: targetBranch,
            documentType: documentType || 'pos_receipt',
            historyId: historyId,
            timestamp: new Date().toISOString(),
            requestedBy: req.user?.username || 'unknown'
        };

        // ส่งคำสั่งพิมพ์
        const result = await makePrinterRequest(config, '/api/printer/print', 'POST', printData);

        // Log สำเร็จ
        console.log(`[PrinterProxy] Print success for branch ${targetBranch}:`, result.data);

        res.json({
            success: true,
            data: {
                ...result.data,
                branch: {
                    code: targetBranch,
                    name: config.name,
                    printerUrl: config.url
                }
            },
            message: `พิมพ์สำเร็จที่ ${config.name}`
        });

    } catch (error) {
        console.error('[PrinterProxy] Print error:', error);

        res.status(500).json({
            success: false,
            error: error.message,
            details: {
                endpoint: 'printer/print',
                timestamp: new Date().toISOString()
            }
        });
    }
});

//  GET /api/printer/status - Check printer status
router.get('/status', authJWT, async (req, res) => {
    try {
        const branchCode = req.query.branch || req.user?.branchCode || '00000';
        const config = getPrinterConfig(branchCode);

        console.log(`[PrinterProxy] Checking status for branch ${branchCode}`);

        const result = await makePrinterRequest(config, '/api/printer/status');

        res.json({
            success: true,
            data: {
                ...result.data,
                branch: {
                    code: branchCode,
                    name: config.name,
                    printerUrl: config.url
                }
            }
        });

    } catch (error) {
        console.error('[PrinterProxy] Status check error:', error);

        res.status(500).json({
            success: false,
            error: error.message,
            branch: {
                code: req.query.branch || '00000',
                name: 'Unknown'
            }
        });
    }
});

//  POST /api/printer/test - Test printer
router.post('/test', authJWT, async (req, res) => {
    try {
        const branchCode = req.body.branchCode || req.user?.branchCode || '00000';
        const config = getPrinterConfig(branchCode);

        console.log(`[PrinterProxy] Testing printer for branch ${branchCode}`);

        const result = await makePrinterRequest(config, '/api/printer/test', 'POST');

        res.json({
            success: true,
            data: {
                ...result.data,
                branch: {
                    code: branchCode,
                    name: config.name,
                    printerUrl: config.url
                }
            },
            message: `ทดสอบเครื่องพิมพ์สำเร็จที่ ${config.name}`
        });

    } catch (error) {
        console.error('[PrinterProxy] Test error:', error);

        res.status(500).json({
            success: false,
            error: error.message,
            branch: {
                code: req.body.branchCode || '00000',
                name: 'Unknown'
            }
        });
    }
});

//  POST /api/printer/installment/:documentType - Print installment documents
router.post('/installment/:documentType', authJWT, async (req, res) => {
    try {
        const { documentType } = req.params;
        const { documentData, branchCode, options } = req.body;

        console.log(`[PrinterProxy] Printing installment document: ${documentType}`);

        if (!documentData) {
            return res.status(400).json({
                success: false,
                error: 'ข้อมูลเอกสารไม่ถูกต้อง'
            });
        }

        // ใช้ branch code จาก user หรือจาก request
        const targetBranch = branchCode || req.user?.branchCode || '00000';
        const config = getPrinterConfig(targetBranch);

        // เตรียมข้อมูลส่งไป printer server
        const printData = {
            documentType,
            documentData,
            branchCode: targetBranch,
            options: options || {},
            timestamp: new Date().toISOString(),
            requestedBy: req.user?.username || 'unknown'
        };

        // ส่งคำสั่งพิมพ์
        const result = await makePrinterRequest(config, `/api/printer/installment/${documentType}`, 'POST', printData);

        res.json({
            success: true,
            data: result.data || {},
            message: `พิมพ์เอกสาร${documentType}สำเร็จที่ ${config.name}`
        });

    } catch (error) {
        console.error(`[PrinterProxy] Installment ${documentType} print error:`, error);

        res.status(500).json({
            success: false,
            error: error.message,
            details: {
                documentType: req.params.documentType,
                endpoint: `printer/installment/${req.params.documentType}`,
                timestamp: new Date().toISOString()
            }
        });
    }
});

//  POST /api/printer/pdf/installment - Generate and return installment contract PDF
router.post('/pdf/installment', authJWT, async (req, res) => {
    try {
        const { installmentData, documentType = 'contract', options = {} } = req.body;

        console.log(`[PrinterProxy] Generating installment PDF: ${documentType}`);

        if (!installmentData) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุข้อมูลสัญญาผ่อนชำระ'
            });
        }

        // Import the InstallmentPDFController
        const InstallmentPDFController = require('../controllers/pdf/InstallmentPDFController');

        let pdfBuffer, fileName;

        // Generate PDF based on document type
        switch (documentType) {
            case 'contract':
                const contractResult = await InstallmentPDFController.createInstallmentContract(installmentData);
                pdfBuffer = contractResult.buffer;
                fileName = contractResult.fileName;
                break;

            case 'quotation':
                const quotationResult = await InstallmentPDFController.createInstallmentQuotation(installmentData);
                pdfBuffer = quotationResult.buffer;
                fileName = quotationResult.fileName || `quotation_${Date.now()}.pdf`;
                break;

            case 'invoice':
                const invoiceResult = await InstallmentPDFController.createInstallmentInvoice(installmentData);
                pdfBuffer = invoiceResult.buffer;
                fileName = invoiceResult.fileName || `invoice_${Date.now()}.pdf`;
                break;

            case 'receipt':
                const receiptResult = await InstallmentPDFController.createDownPaymentReceipt(installmentData);
                pdfBuffer = receiptResult.buffer;
                fileName = receiptResult.fileName || `receipt_${Date.now()}.pdf`;
                break;

            default:
                return res.status(400).json({
                    success: false,
                    error: 'ประเภทเอกสารไม่ถูกต้อง (contract, quotation, invoice, receipt)'
                });
        }

        // Handle response based on options
        if (options.returnBase64) {
            // Return as base64 string
            const base64 = pdfBuffer.toString('base64');
            res.json({
                success: true,
                data: {
                    base64: `data:application/pdf;base64,${base64}`,
                    fileName: fileName,
                    documentType: documentType
                },
                message: `สร้าง PDF ${documentType} สำเร็จ`
            });
        } else {
            // Return as file download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);
        }

    } catch (error) {
        console.error('[PrinterProxy] PDF generation error:', error);

        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการสร้าง PDF',
            message: error.message,
            details: {
                documentType: req.body.documentType || 'unknown',
                timestamp: new Date().toISOString()
            }
        });
    }
});

module.exports = router;
