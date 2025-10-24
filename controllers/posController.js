// File: controllers/posController.js

const mongoose = require('mongoose');
const Order = require('../models/POS/Order');
// const Customer = require('../models/Customer'); // ไม่ใช้อีก
const BranchStock = require('../models/POS/BranchStock');
const BranchStockHistory = require('../models/POS/BranchStockHistory');
const Branch = require('../models/Account/Branch');
const PDFoooRasterController = require('./PDFoooRasterController');
const Counter = require('../models/POS/Counter');
const User = require('../models/User/User');
const ProductImage = require('../models/Stock/ProductImage');
const CashSale = require('../models/POS/CashSale');
const Customer = require('../models/Customer/Customer'); // Ensure this is correct
const Promotion = require('../models/MKT/Promotion');
// เพิ่ม import CustomerService
const CustomerService = require('../services/customerService');

// แก้ไข getNextInvoiceNo ให้ใช้ Counter model
async function getNextInvoiceNo() {
  const now = new Date();
  const yearBE = now.getFullYear() + 543;
  const month = now.getMonth() + 1;
  const reference_value = `${yearBE}${String(month).padStart(2,'0')}`;

  const doc = await Counter.findOneAndUpdate(
    { key: 'invoice', reference_value },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const seqStr = String(doc.seq).padStart(4, '0');
  const invoiceNo = `RE${reference_value}${seqStr}`;  // เปลี่ยนจาก RV เป็น RE
  return invoiceNo;
}

class posController {
  // (1) getLevel1
  static async getLevel1(req, res) {
    try {
      const { branch_code } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const skip = (page - 1) * limit;

      const filter = {
        verified: true,
        stock_value: { $gt: 0 },
      };
      if (branch_code) filter.branch_code = branch_code;

      const stocks = await BranchStock.find(filter).lean()
        .limit(limit)
        .skip(skip)
        .lean();
      const brandMap = {};

      for (const st of stocks) {
        const brand = (st.brand || '').trim();
        if (!brand) continue;
        const brandKey = brand.toLowerCase();
        if (!brandMap[brandKey]) {
          brandMap[brandKey] = { key: brandKey, label: brand, stock: 0 };
        }
        brandMap[brandKey].stock += (st.stock_value || 0);
      }

      const data = Object.values(brandMap);
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // (2) getLevel2
  static async getLevel2(req, res) {
    try {
      const parent = (req.query.parent || '').trim().toLowerCase();
      const { branch_code } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const skip = (page - 1) * limit;

      const filter = {
        verified: true,
        stock_value: { $gt: 0 },
      };
      if (branch_code) filter.branch_code = branch_code;

      const stocks = await BranchStock.find(filter).lean()
        .limit(limit)
        .skip(skip)
        .lean();

      // กรองเฉพาะ brand ที่ตรงกับ parent
      const filtered = stocks.filter(st =>
        (st.brand || '').trim().toLowerCase() === parent
      );
      const list = filtered.map(st => ({
        _id: st._id,
        name: st.name.length > 12 ? `${st.name.substring(0, 12)}...` : st.name,
        brand: st.brand || '-',
        model: st.model || '-',
        price: st.price || 0,
        image: st.image || '',
        stock: st.stock_value || 0,
        imei: st.imei || '',
      }));

      return res.json({ success: true, data: list });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // (3) getLevel3
  static async getLevel3(req, res) {
    try {
      const { productId } = req.query;
      if (!productId) {
        return res.status(400).json({ success: false, error: 'Missing productId' });
      }

      const stock = await BranchStock.findById(productId).lean();
      if (!stock) {
        return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลสินค้า' });
      }
      // หา ProductImage เพื่อใช้ราคา (fallback เป็น stock.price ถ้าไม่มี)
      const imgRecord = await ProductImage.findOne({ name: stock.name }).lean();
      const finalPrice = Number(imgRecord?.price ?? stock.price ?? 0);

      const details = {
        _id: stock._id,
        name: stock.name || '-',
        brand: stock.brand || '-',
        model: stock.model || '-',
        price: finalPrice,
        image: imgRecord?.image || stock.image || 'https://via.placeholder.com/150?text=No+Image',
        stock: stock.stock_value || 0,
        imei: stock.imei || '-',
      };
      return res.json({ success: true, data: details });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // (4) checkout
  static async checkout(req, res) {
    let customer;
    try {
      const {
        items,
        customerType,
        customerInfo,
        corporateInfo,
        customerTaxId,
        companyTaxId,
        total,
        discount,
        promotionDiscount,    // ← เพิ่ม field นี้
        appliedPromotions,     // ← เพิ่ม field นี้
        paymentMethod,
        branch_code,
        netAmount,
        subTotal,
        vatAmount,
        transactionType
      } = req.body;

      // 1) Validate items
      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, error: 'ไม่มีสินค้าในตะกร้า' });
      }

      // 2) Branch logic
      let realBranchCode = null;
      let branchObjectId = req.user?.branch || null;
      let branchName = '(ไม่ทราบชื่อสาขา)';

      if (!branchObjectId && branch_code) {
        const foundBranch = await Branch.findOne({ branch_code }).lean();
        if (!foundBranch) {
          return res.status(404).json({
            success: false,
            error: `ไม่พบสาขาด้วย branch_code=${branch_code}`
          });
        }
        branchObjectId = foundBranch._id;
        realBranchCode = foundBranch.branch_code;
        branchName = foundBranch.name || branchName;
      } else if (branchObjectId) {
        const foundBranch = await Branch.findById(branchObjectId).lean();
        if (!foundBranch) {
          return res.status(404).json({
            success: false,
            error: `ไม่พบสาขาด้วย _id=${branchObjectId}`
          });
        }
        realBranchCode = foundBranch.branch_code;
        branchName = foundBranch.name || branchName;
      }
      if (!realBranchCode) {
        return res.status(400).json({ success: false, error: 'ไม่ทราบสาขาของผู้ใช้งาน' });
      }
      const branchRecord = await Branch.findOne({ branch_code: realBranchCode }).lean();
      const branchAddress = branchRecord?.address || '';

      // 3) Invoice number
      const invoiceNo = await getNextInvoiceNo();

      // 4.5) บันทึกการใช้โปรโมชั่น
      const usedPromotionIds = [];  // ← ประกาศตรงนี้
      if (Array.isArray(appliedPromotions)) {
        for (const promo of appliedPromotions) {
          try {
            const p = await Promotion.findById(promo.id).lean();
            if (p && p.isActive) {  // ใช้ isActive แทน isValid
              await Promotion.findByIdAndUpdate(promo.id, { $inc: { usageCount: 1 } });
              usedPromotionIds.push(promo.id);
            }
          } catch (e) {
            console.error('Error updating promotion usage:', e);
          }
        }
      }

      // 4) Tax and document type
      const finalTaxType = items.every(i => i.taxType === 'ไม่มีภาษี')
        ? 'ไม่มีภาษี'
        : items.some(i => i.taxType === 'รวมภาษี') ? 'รวมภาษี' : 'แยกภาษี';
      const invoiceType = finalTaxType === 'ไม่มีภาษี' ? 'RECEIPT_ONLY' : 'TAX_INVOICE';

      // --- Upsert Customer ---
      const idCard = customerType === 'individual' ? customerTaxId : companyTaxId;
      // ตรวจสอบสถานะลูกค้า (เพิ่มก่อน upsert)
      const customerStatus = await CustomerService.checkCustomerStatus(idCard);
      if (!idCard) {
        return res.status(400).json({ success: false, error: 'Missing customer Tax ID or company Tax ID' });
      }

      const custFilter = customerType === 'individual'
        ? { 'individual.taxId': idCard }
        : { 'corporate.companyTaxId': idCard };

      // Prepare data, ensuring nested objects exist and taxId is set
      const custData = { customerType };
if (customerType === 'individual') {
  // ตรวจสอบและแก้ไขค่า prefix ที่เป็นค่าว่าง
      const prefix = customerInfo?.prefix?.trim() || 'นาย';
  
  custData.individual = { 
    ...customerInfo,
    prefix: prefix, // บังคับให้มีค่า prefix เสมอ
    taxId: idCard 
  };
} else {
  custData.corporate = { ...corporateInfo, companyTaxId: idCard };
}

      try {
        customer = await Customer.findOneAndUpdate(
          custFilter,
          { $set: custData }, // Use $set for update part of upsert
          { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true } // runValidators is important for upsert
        );
      } catch (customerError) {
        // Catch validation or DB errors during upsert
        console.error('Customer upsert error:', customerError);
        // Provide specific feedback if it's a validation error
        if (customerError.name === 'ValidationError') {
          return res.status(400).json({ success: false, error: `Customer validation failed: ${customerError.message}` });
        }
        throw new Error(`Failed to upsert customer: ${customerError.message}`); // Rethrow general errors
      }

      // !!! CRITICAL CHECK !!!
      if (!customer || !customer._id) {
        console.error("Customer upsert failed unexpectedly or did not return a valid document. Filter:", custFilter, "Data:", custData, "Result:", customer);
        throw new Error("Customer record could not be created.");
      }
      // --- End Customer Upsert ---

      // 5) Create Order FIRST (ย้ายขึ้นมาก่อน addPurchaseHistory)
      const newOrder = new Order({
        customer_id: customer._id, // Use validated customer ID
        order_number: invoiceNo,
        total_amount: total,
        tax_amount: vatAmount || 0,
        discount,
        payment_status: 'paid',
        status: 'pending',
        taxType: finalTaxType,
        invoiceType,
        transactionType: transactionType
      });
      await newOrder.save(); // This should now pass validation regarding customer_id

      // 6) หลังจากสร้าง Order แล้ว ค่อยเพิ่มประวัติการซื้อ
      customer.addPurchaseHistory({
        type: 'cash_sale',
        orderId: newOrder._id,  // ← ตอนนี้ newOrder._id มีค่าแล้ว
        orderModel: 'CashSale',  // ← เปลี่ยนเป็น 'CashSale' ตาม enum
        purchaseDate: new Date(),
        amount: total,
        branchCode: realBranchCode,
        saleDetails: {
          pickupMethod: 'store',
          deliveryStatus: 'delivered',
          completionDate: new Date()
        },
        items: items.map(it => ({
          productId: it.id,
          name: it.name,
          imei: it.imei || '',
          qty: it.qty,
          unitPrice: it.price,
          totalPrice: it.price * it.qty
        }))
      });

      // อัพเดทสถิติลูกค้า
      await customer.updateStatistics();

      // บันทึกข้อมูลลูกค้าครั้งเดียว (แก้ไข version conflict)
      await customer.save();

      // 7) Create CashSale - เพิ่ม fields โปรโมชั่น
      // --- Add salesperson check (use fallback) ---
      const userId = req.user && (req.user._id || req.user.id);
      if (!userId) {
        console.error('Checkout error: Missing salesperson ID in request. req.user=', req.user);
        return res.status(401).json({
          success: false,
          error: 'ไม่สามารถระบุพนักงานขายได้ กรุณาตรวจสอบการเข้าสู่ระบบ'
        });
      }
      // --- End salesperson check ---

      await CashSale.create({
  customer: customer._id,
  customerType,
  individual: customerType === 'individual' ? {
    ...custData.individual,
            prefix: custData.individual?.prefix?.trim() || 'นาย' // ตรวจสอบอีกครั้ง
  } : undefined,
  corporate: customerType === 'corporate' ? custData.corporate : undefined,
  products: items.map(it => ({
    productId: it.id,
    salePrice: it.price,
    quantity: it.qty,
    appliedPromotion: appliedPromotions?.find(p => p.productIds?.includes(it.id).lean()) || null
  })),
        subTotal,
        vatAmount,
        discount,
        promotionDiscount: promotionDiscount || 0,
        appliedPromotions: usedPromotionIds,
        paymentMethod,
        invoiceNo,
        salesperson: userId,
        branchCode: realBranchCode,
        purchaseType: 'cash',
        hasWarranty: true,
        warrantyStartDate: new Date(),
        warrantyEndDate: new Date(Date.now() + 365*24*60*60*1000),
        eligibleServices: ['phone-film','ipad-film','phone-warranty','ipad-warranty'],
        serviceUsageCount: { 'phone-film':0,'ipad-film':0,'phone-warranty':0,'ipad-warranty':0 }
      });

      // 8) Update stock และ create history
      const finalItems = [];
      let totalQty = 0;
      // ใช้ชื่อพนักงานที่ส่งมาจาก frontend ก่อน หากไม่มีค่อยใช้จาก req.user
      const staffName = req.body.staffName || req.user?.name || req.user?.fullName || 'พนักงาน';
      
      // Debug log เพื่อตรวจสอบ
      console.log('🔍 Staff Name Resolution in API:', {
        fromBody: req.body.staffName,
        fromUser: req.user?.name,
        fromUserFullName: req.user?.fullName,
        finalStaffName: staffName
      });

      for (const it of items) {
        const stock = await BranchStock.findOne({
          _id: it.id,
          branch_code: realBranchCode
        });
        if (!stock) {
          throw new Error(`ไม่พบสต๊อกสำหรับสินค้า ${it.id}`);
        }
        // ตัดสต๊อกตามประเภทสินค้า
        const isImeiType = Boolean(stock.imei) || (stock.productType === 'imei' || stock.stockType === 'imei');
        if (isImeiType) {
          // IMEI: ลบรายการออก 1 ชิ้นต่อ 1 เอกสาร
          await BranchStock.deleteOne({ _id: it.id, branch_code: realBranchCode });
        } else {
          const currentQty = Number(stock.stock_value || 0);
          const deductQty = Number(it.qty || 1);
          const newQty = currentQty - deductQty;
          if (newQty > 0) {
            await BranchStock.updateOne(
              { _id: it.id, branch_code: realBranchCode },
              { $set: { stock_value: newQty } }
            );
          } else {
            await BranchStock.deleteOne({ _id: it.id, branch_code: realBranchCode });
          }
        }


        finalItems.push({
          name: it.name || stock.name,
          model: it.model || stock.model || '',
          imei: it.imei || stock.imei || '',
          qty: it.qty,
          price: it.price,
          cost: stock.cost || 0
        });
        totalQty += it.qty;
      }

      await BranchStockHistory.create({
        branch_code: realBranchCode,
        change_type: 'OUT',
        reason: 'ขาย POS',
        performed_by: userId,
        performed_at: new Date(),
        order_id: newOrder._id,
        invoice_no: invoiceNo,
        items: finalItems,
        quantity: totalQty,
        stock_value: 0,
        sale_date: new Date(),
        staff_name: staffName,
        sub_total: subTotal,
        vat_amount: vatAmount,
        discount,
        promotion_discount: promotionDiscount || 0,
        applied_promotions: usedPromotionIds,
        total_amount: total,
        net_amount: netAmount,
        customerType,
        customerInfo: custData.individual, // Use prepared custData
        corporateInfo: custData.corporate, // Use prepared custData
        taxType: finalTaxType,
        invoiceType,
        transactionType: transactionType,
        paymentMethod: paymentMethod,  // ← เพิ่มบรรทัดนี้
        paymentInfo: req.body.paymentInfo || {  // ← เพิ่มบรรทัดนี้
          received: true,
          method: paymentMethod,
          bankAccount: req.body.bankAccount || '',
          referenceDoc: ''
        }
      });

      // ** เพิ่มข้อมูลโปรโมชั่นในใบเสร็จ **
      const orderDataForPrint = {
        order_number: invoiceNo,  // ส่ง invoiceNo
        invoiceNo:    invoiceNo,  // ส่งทั้ง 2 field
        saleDate:     new Date(),
        staffName,
        branchName,
        branchAddress,
        // เพิ่มข้อมูล branch และ company สำหรับใบเสร็จ
        branch: {
          name: branchName,
          code: realBranchCode,
          address: branchAddress,
          taxId: branchRecord?.taxId || '0945566000616',
          tel: branchRecord?.phone || branchRecord?.tel || '09-2427-0769'
        },
        company: {
          name: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
        },
        customerType,
        customer: customerType === 'individual' ? custData.individual : custData.corporate,
        items: finalItems,
        discount,
        vat: vatAmount,
        subTotal,
        total,
        netAmount,
        vatAmount,
        taxType:     finalTaxType,
        invoiceType,
        promotionDiscount: promotionDiscount || 0,
        appliedPromotions: appliedPromotions || []
      };
      const { base64: receiptImage } = await PDFoooRasterController.printReceipt(orderDataForPrint);

      return res.json({
        success: true,
        message: 'ชำระเงินและพิมพ์ใบเสร็จสำเร็จ',
        data: {
          order_id: newOrder._id,
          customer_id: customer._id,
          invoice_no: invoiceNo,
          taxType: finalTaxType,
          invoiceType,
          branch_code: realBranchCode,
          branchName,
          branchAddress,
          receiptImage,
          // เพิ่มข้อมูลลูกค้า
          customerInfo: {
            isNewCustomer: customerStatus.isNewCustomer,
            displayName: customer.displayName
          }
        }
      });
    } catch (error) {
      console.error('Error in checkout:', error);
      // Check if it's a Mongoose validation error
      if (error.name === 'ValidationError') {
         // Provide more specific validation error message
         const messages = Object.values(error.errors).map(val => val.message);
         return res.status(400).json({ success: false, error: `Validation Failed: ${messages.join(', ')}` });
      }
      // General error
      return res.status(500).json({ success: false, error: error.message || 'An unexpected error occurred during checkout.' });
    }
  }

  // (5) getHistoryReceiptImage
  static async getHistoryReceiptImage(req, res) {
    try {
      const { historyId } = req.query;
      if (!historyId) {
        return res.status(400).json({ success: false, error: 'Missing historyId' });
      }
      const history = await BranchStockHistory.findById(historyId).lean();
      if (!history) {
        return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล BranchStockHistory' });
      }
      if (history.change_type !== 'OUT') {
        return res.status(400).json({ success: false, error: 'ไม่ใช่รายการสินค้าออก (OUT)' });
      }

      const branchRecord = await Branch.findOne({ branch_code: history.branch_code }).lean();
      const branchName = branchRecord?.name || '(ไม่ทราบชื่อสาขา)';
      const branchAddress = branchRecord?.address || '';
      const saleDate = history.sale_date || new Date();
      // ปรับปรุงการดึงชื่อพนักงาน - ตรวจสอบหลายแหล่ง
      const staffName = history.staff_name || history.staffName || history.performed_by || 'พนักงาน';
      
      // Debug สำหรับ staff name
      console.log('🔍 Staff Name Resolution in getHistoryReceiptImage:', {
        'history.staff_name': history.staff_name,
        'history.staffName': history.staffName,
        'history.performed_by': history.performed_by,
        'final staffName': staffName
      });

      const {
        customerType = 'individual',
        customerInfo = {},
        corporateInfo = {},
        discount = 0,
        vat_amount = 0,
        sub_total = 0,
        total_amount = 0,
        net_amount = 0,
        taxType = 'ไม่มีภาษี'
      } = history;

      const items = (history.items || []).map(it => ({
        name: it.name || '',
        model: it.model || '',
        imei: it.imei || '',
        qty: it.qty || 1,
        price: it.price || 0,
        cost: it.cost || 0
      }));

      const orderDataForPrint = {
        order_number: history.invoice_no || `HIS-${historyId}`,
        invoiceNo:    history.invoice_no,  // เพิ่มบรรทัดนี้
        saleDate,
        staffName,
        branchName,
        branchAddress,
        // เพิ่มข้อมูล branch และ company สำหรับใบเสร็จ
        branch: {
          name: branchRecord?.name || branchName,
          code: branchRecord?.branch_code || history.branch_code,
          address: branchRecord?.address || '',
          taxId: branchRecord?.taxId || '0945566000616',
          tel: branchRecord?.phone || branchRecord?.tel || '09-2427-0769'
        },
        company: {
          name: 'บริษัท 2 พี่น้อง โมบาย จำกัด'
        },
        customerType,
        customer:    customerType === 'individual' ? customerInfo : {},
        corporate:   customerType === 'corporate'  ? corporateInfo : {},
        items,
        discount,
        vat:        vat_amount,
        subTotal:   sub_total,
        total:      total_amount,
        netAmount:  net_amount,
        vatAmount:  vat_amount,
        taxType,
        invoiceType: history.invoiceType || 'RECEIPT_ONLY'
      };

      const { base64: receiptImage } = await PDFoooRasterController.printReceipt(orderDataForPrint);
      return res.json({ success:true, data:{ receiptImage } });
    } catch (err) {
      console.error('getHistoryReceiptImage error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ตรวจสอบโปรโมชั่นที่ใช้ได้
  static async checkAvailablePromotions(req, res) {
    try {
      const { productIds, branchCode } = req.body;
      
      // console.log('=== CHECK AVAILABLE PROMOTIONS ===');
      // console.log('Request body:', req.body);
      // console.log('Product IDs:', productIds);
      // console.log('Branch Code:', branchCode);
      
      if (!Array.isArray(productIds)) {
        return res.status(400).json({ 
          status: 'fail', 
          message: 'productIds must be an array' 
        });
      }
  
      const available = {};
      
      // ตรวจสอบว่า Promotion model มีอยู่หรือไม่
      // console.log('Promotion model exists:', !!Promotion);
      
      // Query promotions
      const query = {
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
        $or: [
          { applicableBranches: { $size: 0 } },
          { applicableBranches: branchCode }
        ]
      };
      
      // console.log('Query:', JSON.stringify(query, null, 2));
      
      const activePromotions = await Promotion.find(query).lean();
      
      // console.log('Found promotions count:', activePromotions.length);
      if (activePromotions.length > 0) {
        // console.log('First promotion:', activePromotions[0]);
      }
  
      // ตรวจสอบแต่ละ product
      for (const productId of productIds) {
        available[productId] = [];
        
        // หา product
        // console.log(`Checking product: ${productId}`);
        
        let product = await BranchStock.findById(productId).lean();
        if (!product) {
          product = await ProductImage.findById(productId).lean();
        }
        
        if (!product) {
          // console.log(`Product ${productId} not found in both collections`);
          continue;
        }
        
        // console.log(`Found product:`, {
        //   id: product._id,
        //   name: product.name,
        //   brand: product.brand,
        //   productType: product.productType,
        //   category: product.category
        // });
  
        // ตรวจสอบโปรโมชั่นแต่ละตัว
        for (const promo of activePromotions) {
          let applicable = false;
          
          // console.log(`\nChecking promotion: ${promo.name}`);
          // console.log('Applicable products:', promo.applicableProducts);
          // console.log('Applicable categories:', promo.applicableCategories);
  
          // 1. ตรวจสอบว่าโปรโมชั่นนี้ใช้กับสินค้านี้ได้หรือไม่
          if (!promo.applicableProducts || promo.applicableProducts.length === 0) {
            // console.log('No specific products - applicable to all');
            applicable = true;
          } else {
            // ตรวจสอบว่าสินค้านี้อยู่ในรายการหรือไม่
            const productInList = promo.applicableProducts.some(p => {
              const id = typeof p === 'string' ? p : (p._id ? p._id.toString() : p.toString());
              const matches = id === productId.toString();
              // console.log(`Comparing ${id} with ${productId}: ${matches}`);
              return matches;
            });
            
            if (productInList) {
              // console.log('Product found in applicable products');
              applicable = true;
            }
          }
  
          // 2. ตรวจสอบหมวดหมู่ (ถ้ามี)
          if (!applicable && promo.applicableCategories && promo.applicableCategories.length > 0) {
            const productCategory = product.productType || product.category || product.brand;
            // console.log(`Product category: ${productCategory}`);
            
            if (productCategory && promo.applicableCategories.includes(productCategory)) {
              // console.log('Category matches');
              applicable = true;
            }
          }
  
          // 3. ตรวจสอบ usage limit
          if (applicable && promo.usageLimit) {
            const usageLeft = promo.usageLimit - (promo.usageCount || 0);
            // console.log(`Usage: ${promo.usageCount || 0}/${promo.usageLimit} (${usageLeft} left)`);
            
            if (usageLeft <= 0) {
              // console.log('Usage limit reached');
              applicable = false;
            }
          }
  
          if (applicable) {
            // console.log(`✓ Promotion "${promo.name}" is applicable`);
            
            available[productId].push({
              id: promo._id,
              name: promo.name,
              description: promo.description || '',
              type: promo.type,
              discount: promo.discountValue || promo.specialPrice || 0,
              discountType: promo.type
            });
          } else {
            // console.log(`✗ Promotion "${promo.name}" is NOT applicable`);
          }
        }
      }
  
      // console.log('\n=== FINAL RESULT ===');
      // console.log('Available promotions:', JSON.stringify(available, null, 2));
  
      return res.json({ 
        status: 'success', 
        data: available 
      });
  
    } catch (err) {
      console.error('❌ checkAvailablePromotions error:', err);
      console.error('Stack trace:', err.stack);
      
      return res.status(400).json({ 
        status: 'fail', 
        message: err.message 
      });
    }
  }

  // บันทึกการใช้โปรโมชั่น
  static async usePromotion(req, res) {
    try {
      const { promotionId } = req.body;
      if (!promotionId) {
        return res.status(400).json({ status:'fail', message:'promotionId is required' });
      }
      const promo = await Promotion.findById(promotionId).lean();
      if (!promo) {
        return res.status(404).json({ status:'fail', message:'ไม่พบโปรโมชั่น' });
      }
      // ตรวจสอบช่วงเวลา
      const now = new Date();
      if (now < promo.startDate || now > promo.endDate) {
        return res.status(400).json({ status:'fail', message:'โปรโมชั่นนี้ไม่อยู่ในช่วงเวลาที่ใช้ได้' });
      }
      if (!promo.isActive) {
        return res.status(400).json({ status:'fail', message:'โปรโมชั่นนี้ถูกปิดการใช้งาน' });
      }
      if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
        return res.status(400).json({ status:'fail', message:'โปรโมชั่นนี้ถูกใช้เต็มจำนวนแล้ว' });
      }
      promo.usageCount = (promo.usageCount||0) + 1;
      await promo.save();
      res.json({
        status:'success',
        message:'บันทึกการใช้โปรโมชั่นเรียบร้อย',
        data:{ remainingUsage: promo.usageLimit ? promo.usageLimit - promo.usageCount : 'unlimited' }
      });
    } catch (err) {
      console.error('usePromotion error:', err);
      res.status(400).json({ status:'fail', message: err.message });
    }
  }
}

// สร้างลูกค้าใหม่ หรือ อัปเดตถ้ามีอยู่แล้ว (upsert)
exports.createCustomer = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { customerType, individual, corporate } = req.body;

    // ตรวจสอบ customerType
    if (!['individual', 'corporate'].includes(customerType)) {
      return res
        .status(400)
        .json({ success: false, error: 'customerType ต้องเป็น individual หรือ corporate' });
    }

    // เตรียมข้อมูลสำหรับสร้างหรืออัปเดต
    const data = { customerType };
    if (customerType === 'individual') {
      data.individual = {
        prefix: individual.prefix,
        firstName: individual.firstName,
        lastName: individual.lastName,
        phone: individual.phone,
        email: individual.email,
        address: {
          houseNo: individual.address.houseNo,
          moo: individual.address.moo,
          subDistrict: individual.address.subDistrict,
          district: individual.address.district,
          province: individual.address.province,
          zipcode: individual.address.zipcode,
        },
        taxId: individual.taxId
      };
    } else {
      data.corporate = {
        companyName: corporate.companyName,
        companyTaxId: corporate.companyTaxId,
        contactPerson: corporate.contactPerson,
        corporatePhone: corporate.corporatePhone,
        corporateEmail: corporate.corporateEmail,
        companyAddress: corporate.companyAddress
      };
    }

    // upsert: ถ้ามี taxId/companyTaxId เดิมก็อัปเดต ไม่งั้นก็สร้างใหม่
    const filter = customerType === 'individual'
      ? { 'individual.taxId': individual.taxId }
      : { 'corporate.companyTaxId': corporate.companyTaxId };

    const customer = await Customer.findOneAndUpdate(
      filter,
      data,
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    );

    io.emit('customerUpdated', {
      id: customer._id,
      data: customer
    });

    return res.json({ success: true, data: customer });
  } catch (err) {
    console.error('createCustomer error:', err);
    // กรณี validation error
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ค้นหาลูกค้าตาม taxId หรือ companyTaxId
exports.searchCustomer = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { key } = req.query;
    if (!key) {
      return res.status(400).json({ success: false, error: 'Missing key parameter' });
    }

    const customers = await Customer.find({
      $or: [
        { 'individual.taxId': key },
        { 'corporate.companyTaxId': key }
      ],
      deleted_at: null
    }).lean();

    return res.json({ success: true, data: customers });
  } catch (err) {
    console.error('createCustomer error:', err);
    // กรณี validation error
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'Server error' });
  }
  }

// ค้นหาลูกค้าตาม taxId หรือ companyTaxId
exports.searchCustomer = async (req, res) => {
    const io = req.app.get('io');
    try {
      const { key } = req.query;
      if (!key) {
        return res.status(400).json({ success: false, error: 'กรุณาระบุเลขบัตรประชาชนหรือเลขประจำตัวผู้เสียภาษี' });
      }

      const customers = await Customer.find({
        $or: [
          { 'individual.taxId': key },
          { 'corporate.companyTaxId': key }
        ],
        deleted_at: null
      }).lean();

      return res.json({ success: true, data: customers });
    } catch (err) {
      console.error('searchCustomer error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ✅ เพิ่มฟังก์ชัน generateReceiptImage ที่หายไป พร้อม email functionality
  static async generateReceiptImage(req, res) {
    try {
      console.log('🖼️ Generating receipt image with data:', req.body);
      
      const { 
        orderId, 
        documentType = 'receipt',
        sendEmail = false,
        emailData = null 
      } = req.body;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: 'Missing orderId parameter'
        });
      }

      // ใช้ A4PDFController สร้าง PDF และแปลงเป็นรูป
      const A4PDFController = require('./pdf/A4PDFController');
      
      // สร้าง PDF buffer
      const pdfResult = await A4PDFController.generateA4PDF({
        body: { 
          order_id: orderId,
          documentType: documentType,
          outputFormat: 'buffer' // ขอ buffer แทนไฟล์
        }
      });

      if (!pdfResult.success) {
        throw new Error(pdfResult.error || 'Failed to generate PDF');
      }

      // ข้อมูลผลลัพธ์พื้นฐาน
      const responseData = {
        imageUrl: pdfResult.pdfUrl || null,
        pdfBuffer: pdfResult.pdfBuffer ? pdfResult.pdfBuffer.toString('base64') : null,
        documentType: documentType,
        orderId: orderId,
        emailSent: false
      };

      // 📧 ส่งอีเมลถ้าร้องขอ
      if (sendEmail && emailData && emailData.to) {
        console.log('📧 Attempting to send email...');
        
        try {
          const emailResult = await A4PDFController.sendPDFByEmail(
            emailData,
            pdfResult.pdfBuffer,
            `receipt_${orderId}_${new Date().toISOString().split('T')[0]}.pdf`
          );

          responseData.emailSent = emailResult.success;
          responseData.emailResult = emailResult;
          
          if (emailResult.success) {
            console.log('✅ Email sent successfully:', emailResult.messageId);
          } else {
            console.error('❌ Email sending failed:', emailResult.error);
          }
          
        } catch (emailError) {
          console.error('❌ Email error:', emailError);
          responseData.emailError = emailError.message;
        }
      }

      // ส่งกลับผลลัพธ์
      return res.json({
        success: true,
        data: responseData
      });

    } catch (error) {
      console.error('❌ Error in generateReceiptImage:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate receipt image'
      });
    }
  }
}

module.exports = posController;
