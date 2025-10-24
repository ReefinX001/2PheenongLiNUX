// socket/receiptVoucherSocket.js
const ReceiptVoucherAutoCreate = require('../services/receiptVoucherAutoCreate');
const config = require('../config/receiptVoucherConfig');

module.exports = function(io) {
    console.log('🔌 Initializing Receipt Voucher Socket Handlers...');

    // Listen for new sales from BranchStockHistory
    io.on('connection', (socket) => {
        console.log('👤 Client connected:', socket.id);

        // Listen for historyCreated event
        socket.on('historyCreated', async (data) => {
            console.log('📦 New history created:', data);

            // ตรวจสอบว่าเปิด auto creation หรือไม่
            if (!config.AUTO_CREATION_ENABLED) {
                console.log('⚠️ Auto creation is disabled');
                return;
            }

            // ตรวจสอบว่าเป็น reason ที่ต้องสร้างหรือไม่
            if (!config.AUTO_CREATE_REASONS.includes(data.reason)) {
                console.log(`⏭️ Skipping reason: ${data.reason}`);
                return;
            }

            // Delay 2 วินาทีเพื่อให้ transaction เสร็จสมบูรณ์
            setTimeout(async () => {
                try {
                    console.log('🤖 Auto creating receipt voucher for:', data.invoiceNo);

                    // สร้าง sale data จาก history
                    const saleData = {
                        saleType: config.SALE_TYPE_MAPPING[data.reason] || 'cash_sale',
                        branchCode: data.branchCode,
                        staffId: data.staffId,
                        customerInfo: data.customerInfo || { name: 'ลูกค้าทั่วไป' },
                        items: data.items || [],
                        totalAmount: data.totalAmount,
                        subtotal: data.subtotal || data.totalAmount,
                        vat: data.vat || 0,
                        discount: data.discount || 0,
                        paymentMethod: data.paymentMethod || 'cash',
                        reference: {
                            branchStockHistoryId: data.historyId,
                            invoiceNumber: data.invoiceNo
                        },
                        taxType: data.taxType || 'ไม่มีภาษี',
                        changeType: data.changeType,
                        reason: data.reason
                    };

                    const result = await ReceiptVoucherAutoCreate.createFromSale(saleData);

                    if (result.success) {
                        // Emit success event
                        io.emit('receiptVoucherCreated', {
                            success: true,
                            message: `สร้างใบสำคัญรับเงิน ${result.data.documentNumber} อัตโนมัติสำเร็จ`,
                            data: result.data,
                            branchStockHistoryId: data.historyId,
                            receiptType: saleData.saleType,
                            branch: data.branchCode
                        });

                        console.log('✅ Auto created:', result.data.documentNumber);
                    } else {
                        console.error('❌ Auto creation failed:', result.message);

                        io.emit('receiptVoucherError', {
                            error: result.message,
                            historyId: data.historyId
                        });
                    }
                } catch (error) {
                    console.error('❌ Socket handler error:', error);

                    io.emit('receiptVoucherError', {
                        error: error.message,
                        historyId: data.historyId
                    });
                }
            }, 2000);
        });

        socket.on('disconnect', () => {
            console.log('👤 Client disconnected:', socket.id);
        });
    });
};
