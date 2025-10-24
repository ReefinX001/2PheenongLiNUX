require('dotenv').config();
const mongoose = require('mongoose');
const Receipt = require('../models/Receipt');

async function createSampleReceipts() {
  try {
    console.log('🔄 เชื่อมต่อ MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 20000,
      socketTimeoutMS: 30000
    });
    console.log('✅ เชื่อมต่อ MongoDB Atlas สำเร็จ!');

    // ตรวจสอบข้อมูลที่มีอยู่
    const existingCount = await Receipt.countDocuments();
    console.log(`📊 มีใบเสร็จในฐานข้อมูล: ${existingCount} รายการ`);

    if (existingCount === 0) {
      console.log('🆕 สร้างข้อมูลใบเสร็จตัวอย่าง...');

      const sampleReceipts = [
        {
          receiptNumber: 'RE-680101-001',
          receiptType: 'down_payment_receipt',
          saleType: 'installment',
          issueDate: new Date('2025-01-01'),
          contractNo: 'CT-680101-001',
          quotationNumber: 'QT-680101-001',
          customer: {
            name: 'นายสมชาย ใจดี',
            taxId: '1234567890123',
            phone: '081-234-5678',
            address: '123 ถนนสุขุมวิท กรุงเทพฯ 10110'
          },
          items: [
            {
              product: 'iPhone 15 Pro 128GB',
              name: 'iPhone 15 Pro 128GB Natural Titanium',
              brand: 'Apple',
              imei: '123456789012345',
              quantity: 1,
              unitPrice: 39900,
              totalPrice: 39900,
              description: 'iPhone 15 Pro 128GB Natural Titanium'
            }
          ],
          downPaymentAmount: 15000,
          totalAmount: 39900,
          documentFee: 500,
          vatAmount: 0,
          netTotal: 39900,
          taxType: 'inclusive',
          paymentMethod: 'cash',
          paymentDate: new Date('2025-01-01'),
          branchCode: '00000',
          employeeName: 'พนักงานขาย A'
        },
        {
          receiptNumber: 'RE-680102-002',
          receiptType: 'full_payment_receipt',
          saleType: 'cash',
          issueDate: new Date('2025-01-02'),
          customer: {
            name: 'นางสาวสมหญิง รักดี',
            taxId: '9876543210987',
            phone: '082-345-6789',
            address: '456 ถนนรัชดาภิเษก กรุงเทพฯ 10400'
          },
          items: [
            {
              product: 'Samsung Galaxy S24',
              name: 'Samsung Galaxy S24 256GB Phantom Black',
              brand: 'Samsung',
              imei: '987654321098765',
              quantity: 1,
              unitPrice: 28900,
              totalPrice: 28900,
              description: 'Samsung Galaxy S24 256GB Phantom Black'
            }
          ],
          totalAmount: 28900,
          documentFee: 0,
          vatAmount: 0,
          netTotal: 28900,
          taxType: 'inclusive',
          paymentMethod: 'bank_transfer',
          paymentDate: new Date('2025-01-02'),
          branchCode: '00000',
          employeeName: 'พนักงานขาย B'
        },
        {
          receiptNumber: 'RE-680415-003',
          receiptType: 'installment_receipt',
          saleType: 'installment',
          issueDate: new Date('2025-04-15'),
          contractNo: 'CT-680415-003',
          customer: {
            name: 'นายอานนท์ มีสุข',
            taxId: '5555666677778',
            phone: '083-456-7890',
            address: '789 ถนนพหลโยธิน กรุงเทพฯ 10900'
          },
          items: [
            {
              product: 'iPad Pro 11-inch',
              name: 'iPad Pro 11-inch M4 256GB Wi-Fi Space Black',
              brand: 'Apple',
              imei: '111222333444555',
              quantity: 1,
              unitPrice: 35900,
              totalPrice: 35900,
              description: 'iPad Pro 11-inch M4 256GB Wi-Fi Space Black'
            }
          ],
          downPaymentAmount: 8000,
          totalAmount: 35900,
          documentFee: 500,
          vatAmount: 0,
          netTotal: 35900,
          taxType: 'inclusive',
          paymentMethod: 'credit_card',
          paymentDate: new Date('2025-04-15'),
          branchCode: '00000',
          employeeName: 'พนักงานขาย C'
        }
      ];

      for (const receiptData of sampleReceipts) {
        const receipt = new Receipt(receiptData);
        await receipt.save();
        console.log(`✅ สร้างใบเสร็จ: ${receipt.receiptNumber} - ${receipt.customer.name}`);
      }

      console.log(`🎉 สร้างข้อมูลใบเสร็จตัวอย่างสำเร็จ: ${sampleReceipts.length} รายการ`);
    } else {
      console.log('📋 มีข้อมูลใบเสร็จในฐานข้อมูลแล้ว');

      // แสดงข้อมูลที่มีอยู่
      const receipts = await Receipt.find().sort({ createdAt: -1 }).limit(5);
      console.log('📄 ใบเสร็จล่าสุด:');
      receipts.forEach((receipt, index) => {
        console.log(`  ${index + 1}. ${receipt.receiptNumber} - ${receipt.customer?.name} - ฿${receipt.totalAmount}`);
      });
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 ตัดการเชื่อมต่อ MongoDB');
  }
}

createSampleReceipts();
