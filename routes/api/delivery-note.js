const express = require('express');
const router = express.Router();
const DeliveryNote = require('../../models/DeliveryNote');
const BranchStock = require('../../models/POS/BranchStock');
const DepositReceipt = require('../../models/DepositReceipt'); // เพิ่ม import DepositReceipt
const { authenticate, optionalAuth } = require('../../middleware/auth');

// ฟังก์ชันสำหรับตัดสต็อก
async function deductStock(items, branchCode) {
  const stockDeductions = [];

  for (const item of items) {
    try {
      // หากมี IMEI ให้ค้นหาและตัดสต็อกตาม IMEI
      if (item.imei) {
        const stock = await BranchStock.findOne({
          branch_code: branchCode,
          imei: item.imei
        });

        if (!stock) {
          throw new Error(`ไม่พบสต็อกสำหรับ IMEI: ${item.imei}`);
        }

        if (stock.quantity < 1) {
          throw new Error(`สต็อกไม่เพียงพอสำหรับ ${item.name} (IMEI: ${item.imei})`);
        }

        stock.quantity -= 1;
        stock.status = 'inactive'; // เปลี่ยนจาก 'sold' เป็น 'inactive' เพราะ BranchStock model ไม่มี 'sold' ใน enum
        stock.soldDate = new Date();
        await stock.save();

        stockDeductions.push({
          productId: stock._id,
          name: item.name,
          imei: item.imei,
          quantityDeducted: 1,
          method: 'imei'
        });
      }
      // หากไม่มี IMEI ให้ตัดสต็อกตามชื่อและจำนวน
      else {
        const stock = await BranchStock.findOne({
          branch_code: branchCode,
          name: item.name,
          quantity: { $gte: item.quantity }
        });

        if (!stock) {
          throw new Error(`ไม่พบสต็อกหรือสต็อกไม่เพียงพอสำหรับ ${item.name}`);
        }

        stock.quantity -= item.quantity;
        if (stock.quantity === 0) {
          stock.status = 'out_of_stock';
        }
        await stock.save();

        stockDeductions.push({
          productId: stock._id,
          name: item.name,
          quantityDeducted: item.quantity,
          method: 'quantity'
        });
      }
    } catch (error) {
      console.error(`❌ Error deducting stock for ${item.name}:`, error);
      throw error;
    }
  }

  return stockDeductions;
}

// สร้างใบส่งของจากการขายหน้าร้าน
router.post('/create-from-sale', optionalAuth, async (req, res) => {
  try {
    console.log('📦 Creating delivery note from sale...');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const {
      items,
      customerInfo,
      corporateInfo,
      customerType,
      branchCode,
      branchName,
      staffId,
      staffName,
      paymentMethod,
      paymentInfo,
      summary,
      notes,
      depositReceiptId // รับ depositReceiptId จาก frontend
    } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ไม่พบรายการสินค้า'
      });
    }

    if (!branchCode) {
      return res.status(400).json({
        success: false,
        error: 'ไม่พบรหัสสาขา'
      });
    }

    // สร้างเลขที่เอกสารใบส่งของ
    const documentNumber = await DeliveryNote.generateNextDocumentNumber();

    // จัดรูปแบบข้อมูลลูกค้า
    let customerData = {};
    if (customerType === 'individual') {
      // จัดการที่อยู่ - รองรับทั้ง string และ object
      let addressString = '';
      if (customerInfo.address) {
        if (typeof customerInfo.address === 'string') {
          // ถ้าเป็น string แล้ว ใช้เลย
          addressString = customerInfo.address;
        } else if (typeof customerInfo.address === 'object') {
          // ถ้าเป็น object สร้าง string
          addressString = `${customerInfo.address.houseNo || ''} หมู่ ${customerInfo.address.moo || ''} ต.${customerInfo.address.subDistrict || ''} อ.${customerInfo.address.district || ''} จ.${customerInfo.address.province || ''} ${customerInfo.address.zipcode || ''}`.trim();
        }
      }

      customerData = {
        name: `${customerInfo.prefix || ''} ${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim(),
        address: addressString,
        taxId: customerInfo.taxId || '',
        phone: customerInfo.phone || customerInfo.phoneNumber || '',
        email: customerInfo.email || ''
      };
    } else {
      customerData = {
        name: corporateInfo.companyName || '',
        address: corporateInfo.companyAddress || '',
        taxId: corporateInfo.companyTaxId || '',
        phone: corporateInfo.corporatePhone || '',
        email: corporateInfo.corporateEmail || ''
      };
    }

    // แปลงข้อมูลสินค้าเป็นรูปแบบของใบส่งของ
    const deliveryItems = items.map(item => ({
      productId: item.productId || null,
      name: item.name || item.productName || '',
      brand: item.brand || '',
      model: item.model || '',
      imei: item.imei || item.serial || '',
      serialNumber: item.serial || item.imei || '',
      quantity: item.qty || item.quantity || 1,
      unitPrice: item.price || 0,
      totalPrice: (item.price || 0) * (item.qty || item.quantity || 1),
      description: item.description || `${item.brand || ''} ${item.model || ''}`.trim()
    }));

    // คำนวณยอดรวม
    const subtotal = deliveryItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // คำนวณภาษี VAT 7% ถ้า frontend ส่งมาเป็น 0 (สินค้าแยกภาษี)
    let taxAmount = summary?.vatAmount || 0;
    if (taxAmount === 0 && subtotal > 0) {
      // คำนวณ VAT 7% จาก subtotal
      taxAmount = subtotal * 0.07;
      console.log(`🧮 คำนวณภาษี VAT 7% จาก subtotal ${subtotal}: ${taxAmount}`);
    }

    const totalAmount = summary?.total || (subtotal + taxAmount);

    // สร้างใบส่งของ
    const deliveryNote = new DeliveryNote({
      documentNumber,
      documentDate: new Date(),
      branchCode: branchCode || 'UNKNOWN',
      branchName: branchName || 'สาขาหลัก',
      customer: customerData,
      delivery: {
        address: customerData.address,
        contactPerson: customerData.name,
        contactPhone: customerData.phone,
        deliveryDate: new Date(),
        specialInstructions: notes || ''
      },
      items: deliveryItems,
      relatedDocuments: {
        orderId: null,
        depositReceiptId: depositReceiptId || null, // บันทึก depositReceiptId ที่ได้รับมา
        installmentId: null
      },
      summary: {
        subtotal: subtotal,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        depositApplied: 0,
        remainingAmount: totalAmount
      },
      status: 'delivered', // ขายหน้าร้านถือว่าส่งของแล้ว
      tracking: {
        deliveredAt: new Date(),
        deliveredBy: staffName || 'พนักงานขาย',
        receivedBy: customerData.name
      },
      notes: {
        internalNotes: `สร้างจากการขายหน้าร้าน (${paymentMethod || 'CASH'})`,
        deliveryNotes: notes || '',
        customerNotes: ''
      },
      staff: {
        preparedBy: {
          id: staffId || '',
          name: staffName || 'พนักงานขาย'
        },
        deliveredBy: {
          id: staffId || '',
          name: staffName || 'พนักงานขาย'
        }
      },
      sourceType: 'direct_sale',
      createdBy: staffId || req.user?.id || 'system',
      updatedBy: staffId || req.user?.id || 'system'
    });

    // บันทึกใบส่งของ
    await deliveryNote.save();
    console.log('✅ Delivery note created:', documentNumber);

    // ตัดสต็อก
    let stockDeductions = [];
    try {
      stockDeductions = await deductStock(deliveryItems, branchCode);
      console.log('✅ Stock deducted successfully:', stockDeductions);
    } catch (stockError) {
      console.error('❌ Stock deduction failed:', stockError);
      // ลบใบส่งของที่สร้างไว้
      await DeliveryNote.findByIdAndDelete(deliveryNote._id);
      return res.status(400).json({
        success: false,
        error: `การตัดสต็อกล้มเหลว: ${stockError.message}`,
        details: stockError.message
      });
    }

    // อัพเดทสถานะใบมัดจำเป็น 'completed' หลังตัดสต็อกสำเร็จ
    if (depositReceiptId) {
      try {
        const depositReceipt = await DepositReceipt.findById(depositReceiptId);
        if (depositReceipt) {
          depositReceipt.status = 'completed';
          depositReceipt.completedAt = new Date();
          depositReceipt.deliveryNoteId = deliveryNote._id; // บันทึก reference ไปยังใบส่งของ
          await depositReceipt.save();
          console.log(`✅ Deposit receipt ${depositReceipt.receiptNumber} status updated to 'completed'`);
        } else {
          console.warn(`⚠️ Deposit receipt ${depositReceiptId} not found, skipping status update`);
        }
      } catch (updateError) {
        console.error('❌ Error updating deposit receipt status:', updateError);
        // ไม่ให้ error นี้หยุดการทำงาน เพราะใบส่งของและการตัดสต็อกสำเร็จแล้ว
      }
    }

    // ส่งข้อมูลกลับ
    res.status(201).json({
      success: true,
      message: 'สร้างใบส่งของและตัดสต็อกสำเร็จ',
      data: {
        deliveryNote: {
          id: deliveryNote._id,
          documentNumber: deliveryNote.documentNumber,
          documentDate: deliveryNote.documentDate,
          customer: deliveryNote.customer,
          items: deliveryNote.items,
          summary: deliveryNote.summary,
          status: deliveryNote.status
        },
        stockDeductions: stockDeductions
      }
    });

  } catch (error) {
    console.error('❌ Error creating delivery note:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างใบส่งของ',
      details: error.message
    });
  }
});

// ดึงข้อมูลใบส่งของตาม ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const deliveryNote = await DeliveryNote.findById(req.params.id);

    if (!deliveryNote) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบใบส่งของ'
      });
    }

    res.json({
      success: true,
      data: deliveryNote
    });

  } catch (error) {
    console.error('Error fetching delivery note:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบส่งของ',
      details: error.message
    });
  }
});

// ดึงรายการใบส่งของทั้งหมด
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { branchCode, status, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};
    if (branchCode) query.branchCode = branchCode;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.documentDate = {};
      if (startDate) query.documentDate.$gte = new Date(startDate);
      if (endDate) query.documentDate.$lte = new Date(endDate);
    }

    const deliveryNotes = await DeliveryNote.find(query)
      .sort({ documentDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await DeliveryNote.countDocuments(query);

    res.json({
      success: true,
      data: {
        deliveryNotes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching delivery notes:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบส่งของ',
      details: error.message
    });
  }
});

module.exports = router;