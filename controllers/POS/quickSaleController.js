const Product = require('../../models/Stock/Product');
const BranchStock = require('../../models/POS/BranchStock');
const BranchStockHistory = require('../../models/POS/BranchStockHistory');
const PurchaseOrder = require('../../models/Stock/purchaseOrderModel');
const AuditLog = require('../../models/Account/AuditLog');
const Supplier = require('../../models/Stock/Supplier');
const ProductImage = require('../../models/Stock/ProductImage'); // เพิ่มเพื่อดึงข้อมูล price, purchaseType, productType
const Counter = require('../../models/POS/Counter'); // เพิ่มเพื่อสร้าง poNumber อัตโนมัติ

/**
 * Quick Sale Controller - สำหรับการขายด่วนในกรณีฉุกเฉิน
 * เพิ่มสินค้าเข้าสต็อกและขายได้ทันทีโดยไม่ต้องรอกระบวนการ PO ปกติ
 */

/**
 * ฟังก์ชันสร้างเลข PO อัตโนมัติสำหรับ Quick Sale (เหมือน PO.html)
 * รูปแบบ: QS-YYYYMM-NNNN
 */
async function generateQuickSalePONumber() {
  const prefix = 'QS-';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;

  try {
    // ใช้ Counter model เพื่อสร้างหมายเลขต่อเนื่อง
    const counter = await Counter.findOneAndUpdate(
      { key: 'quick_sale_po', reference_value: yearMonth },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const runningNumber = String(counter.seq).padStart(4, '0');
    return `${prefix}${yearMonth}-${runningNumber}`;
  } catch (error) {
    console.error('Error generating PO number:', error);
    // Fallback: ใช้ timestamp
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}${yearMonth}-${timestamp}`;
  }
}

/**
 * ฟังก์ชันดึงข้อมูล ProductImage จากชื่อสินค้า
 * เพื่อใช้ข้อมูล price, purchaseType, productType
 */
async function getProductImageData(productName, brand) {
  try {
    // ค้นหาโดยใช้ชื่อสินค้าและแบรนด์
    const productImage = await ProductImage.findOne({
      name: { $regex: productName, $options: 'i' }, // case-insensitive search
      brand: { $regex: brand, $options: 'i' }
    }).lean();

    if (productImage) {
      console.log(`✅ Found ProductImage for ${productName} (${brand}):`, {
        price: productImage.price,
        purchaseType: productImage.purchaseType,
        productType: productImage.productType,
        stockType: productImage.stockType
      });
      return productImage;
    } else {
      console.log(`⚠️ No ProductImage found for ${productName} (${brand}), using defaults`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching ProductImage data:', error);
    return null;
  }
}

/**
 * เพิ่มสินค้าโหมดขายด่วน
 * POST /api/quick-sale
 */
exports.createQuickSale = async (req, res) => {
  try {
    const { imei, name, brand, cost, supplierId, supplier, branchCode, urgentSale, timestamp } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.employee?.name || req.user?.username;
    const userRole = req.user?.role;

    // ตรวจสอบ authentication ก่อน
    if (!userId || !userName) {
      return res.status(401).json({
        success: false,
        error: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    // Validation - สำหรับโหมดขายด่วน จำเป็นเฉพาะข้อมูลพื้นฐาน
    if (!imei || !name || !brand || !branchCode) {
      return res.status(400).json({
        success: false,
        error: 'ข้อมูลไม่ครบถ้วน กรุณากรอกข้อมูลให้ครบ',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // ตรวจสอบ IMEI ซ้ำ - ปรับปรุงการตรวจสอบให้ละเอียดขึ้น
    const existingProduct = await Product.findOne({ imei: imei });
    if (existingProduct) {
      // ตรวจสอบว่าสินค้านี้อยู่ในสาขาไหน
      const branchStock = await BranchStock.findOne({
        imei: imei,
        branchCode: branchCode,
        status: { $in: ['available', 'reserved'] }
      });

      if (branchStock) {
        return res.status(400).json({
          success: false,
          error: `IMEI ${imei} มีในสาขานี้แล้ว (${branchStock.status})`,
          code: 'DUPLICATE_IMEI_IN_BRANCH',
          existingProduct: {
            id: existingProduct._id,
            name: existingProduct.name,
            brand: existingProduct.brand,
            branchCode: branchStock.branchCode,
            status: branchStock.status
          }
        });
      }

      // ถ้าสินค้าอยู่ในสาขาอื่นหรือเป็น pending/unverified ให้เพิ่มลงสาขานี้ได้
      console.log(`[Quick Sale] IMEI ${imei} exists but not in branch ${branchCode}, allowing addition to this branch`);
    }

    // ผ่อนผันการตรวจสอบ IMEI format สำหรับโหมดขายด่วน (รองรับ Serial Number อื่นๆ)
    if (imei.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'IMEI/Serial Number ต้องมีอย่างน้อย 5 ตัวอักษร',
        code: 'INVALID_IMEI_FORMAT'
      });
    }

    // 🔥 ดึงข้อมูลจาก ProductImage API สำหรับ price, purchaseType, productType
    console.log(`[Quick Sale] Fetching ProductImage data for: ${name} (${brand})`);
    const productImageData = await getProductImageData(name, brand);

    // สร้าง poNumber อัตโนมัติ (เหมือน PO.html)
    const poNumber = await generateQuickSalePONumber();
    console.log(`[Quick Sale] Generated PO Number: ${poNumber}`);

    // กำหนดค่าเริ่มต้นสำหรับโหมดขายด่วน
    const defaultCost = cost || 0; // จะให้กรอกทีหลังใน PO

    // ดึงข้อมูลราคาครบถ้วนจาก ProductImage
    const priceData = {
      // ราคาสด (ขายสด)
      cashPrice: productImageData?.price || (defaultCost > 0 ? defaultCost * 1.2 : 0),
      // ราคาผ่อน (ขายผ่อน)
      installmentPrice: productImageData?.pricePayOff || (productImageData?.price ? productImageData.price + 2590 : (defaultCost > 0 ? (defaultCost * 1.2) + 2590 : 2590)),
      // ข้อมูลผ่อนเพิ่มเติม
      downAmount: productImageData?.downAmount || 0,
      downInstallmentCount: productImageData?.downInstallmentCount || 0,
      downInstallment: productImageData?.downInstallment || 0,
      creditThreshold: productImageData?.creditThreshold || 0,
      payUseInstallmentCount: productImageData?.payUseInstallmentCount || 0,
      payUseInstallment: productImageData?.payUseInstallment || 0,
      docFee: productImageData?.docFee || 0
    };

    // ราคาหลักที่ใช้ในระบบ (ราคาสด)
    const productPrice = priceData.cashPrice;
    const purchaseType = productImageData?.purchaseType || ['installment'];
    const productType = productImageData?.productType || 'mobile';
    const stockType = productImageData?.stockType || 'imei';

    const defaultSupplierId = supplierId || null; // จะต้องหา supplier default
    const defaultSupplier = supplier || {
      name: 'รอระบุซัพพลายเออร์',
      phone: '',
      address: '',
      note: 'สร้างจากระบบขายด่วน รอการอัพเดทข้อมูล'
    };

    console.log(`[Quick Sale] Using pricing data:`, {
      cashPrice: priceData.cashPrice,
      installmentPrice: priceData.installmentPrice,
      cost: defaultCost,
      purchaseType,
      productType,
      stockType,
      poNumber,
      additionalPricing: {
        downAmount: priceData.downAmount,
        downInstallment: priceData.downInstallment,
        payUseInstallment: priceData.payUseInstallment,
        docFee: priceData.docFee
      }
    });

    // หา default supplier หรือสร้างใหม่หากจำเป็น
    let supplierObjectId = defaultSupplierId;
    if (!supplierObjectId) {
      let quickSaleSupplier = await Supplier.findOne({ name: 'ขายด่วนฉุกเฉิน' });
      if (!quickSaleSupplier) {
        quickSaleSupplier = new Supplier({
          name: 'ขายด่วนฉุกเฉิน',
          code: 'QUICK_SALE',
          phone: '',
          address: '',
          note: 'ซัพพลายเออร์สำหรับระบบขายด่วนฉุกเฉิน'
        });
        await quickSaleSupplier.save();
      }
      supplierObjectId = quickSaleSupplier._id;
    }

    let savedProduct;

    // ถ้าสินค้ามีอยู่แล้ว ใช้ข้อมูลเดิม
    if (existingProduct) {
      savedProduct = existingProduct;
      console.log(`[Quick Sale] Using existing product ${imei} for branch ${branchCode}`);

      // อัพเดทข้อมูลสินค้าถ้าจำเป็น
      if (!existingProduct.barcode) {
        existingProduct.barcode = imei; // ใช้ IMEI เป็น barcode ถ้าไม่มี
        await existingProduct.save();
      }
    } else {
      // สร้างสินค้าใหม่ - ปรับปรุงให้มีข้อมูลครบถ้วน
      const productSku = `QS-${branchCode}-${imei.slice(-8)}`;
      const productPrice = defaultCost > 0 ? defaultCost * 1.2 : 0;

      const product = new Product({
        name: name,
        brand: brand,
        model: '', // เพิ่ม model field
        imei: imei,
        barcode: imei, // ใช้ IMEI เป็น barcode
        sku: productSku, // ใช้ SKU เดียวกับ BranchStock
        cost: defaultCost,
        price: priceData.cashPrice, // ราคาสด
        purchasePrice: defaultCost,

        // ข้อมูลราคาผ่อนครบถ้วน (จาก ProductImage)
        pricePayOff: priceData.installmentPrice,
        downAmount: priceData.downAmount,
        downInstallmentCount: priceData.downInstallmentCount,
        downInstallment: priceData.downInstallment,
        creditThreshold: priceData.creditThreshold,
        payUseInstallmentCount: priceData.payUseInstallmentCount,
        payUseInstallment: priceData.payUseInstallment,
        docFee: priceData.docFee,

        // ข้อมูลซัพพลายเออร์และสาขา
        supplier: supplierObjectId,
        branch_code: branchCode,

        // ข้อมูลหมวดหมู่และประเภท (ใช้ข้อมูลจาก ProductImage)
        category: productType === 'mobile' ? 'มือถือ' : 'อุปกรณ์เสริม',
        productType: productType,
        stockType: stockType,

        // ข้อมูลภาษี
        taxType: 'แยกภาษี',
        taxRate: 0,

        // สถานะ
        status: 'active',
        verified: true,
        pending: false,

        // ข้อมูลการขาย (ใช้ข้อมูลจาก ProductImage)
        purchaseType: purchaseType,

        // ข้อมูลโหมดขายด่วน
        quickSale: true,
        urgentSale: urgentSale || true,
        description: `สินค้าขายด่วน - ${name}`,

        // ข้อมูลระบบ
        createdBy: userId,
        created_at: new Date(),
        updated_at: new Date()
      });

      savedProduct = await product.save();
      console.log(`[Quick Sale] Created new product ${imei} for branch ${branchCode}`);
    }

    // สร้าง Stock Entry ทันที (ไม่ต้องรอ PO) - สำคัญมาก
    // ใช้ productPrice ที่ได้จาก ProductImage หรือคำนวณจาก cost

    const branchStock = new BranchStock({
      product_id: savedProduct._id,
      name: savedProduct.name,
      brand: savedProduct.brand,
      model: savedProduct.model || '',
      imei: savedProduct.imei,
      barcode: savedProduct.barcode || imei,
      sku: `QS-${branchCode}-${imei.slice(-8)}`, // สร้าง SKU จาก Quick Sale
      branch_code: branchCode,
      status: 'active',

      // เพิ่ม categoryGroup เป็น null เหมือน PO.html
      categoryGroup: req.body.categoryGroup || null,

      // ข้อมูลราคาและต้นทุน (ใช้ข้อมูลครบถ้วนจาก ProductImage)
      price: priceData.cashPrice, // ราคาสด
      cost: defaultCost,
      purchasePrice: defaultCost,
      stock_value: 1, // สำคัญ: ตั้งเป็น 1 เพื่อให้แสดงใน POS

      // ข้อมูลราคาผ่อนครบถ้วน (จาก ProductImage)
      pricePayOff: priceData.installmentPrice, // ราคาผ่อน (ขายผ่อน)
      downAmount: priceData.downAmount,
      downInstallmentCount: priceData.downInstallmentCount,
      downInstallment: priceData.downInstallment,
      creditThreshold: priceData.creditThreshold,
      payUseInstallmentCount: priceData.payUseInstallmentCount,
      payUseInstallment: priceData.payUseInstallment,
      docFee: priceData.docFee,

      // ข้อมูล PO และเอกสาร (ใช้ poNumber ที่สร้างอัตโนมัติ)
      poNumber: poNumber,
      documentNumber: poNumber,
      description: `สินค้าขายด่วน - ${savedProduct.name}`,

      // ข้อมูลซัพพลายเออร์
      supplier: supplierObjectId,

      // เพิ่มข้อมูลผู้สร้าง
      addedBy: userId,
      addedByName: req.body.addedByName || userName || 'ขายด่วนฉุกเฉิน',
      timestamp: req.body.timestamp || new Date().toISOString(),

      // ข้อมูลการขาย (ใช้ข้อมูลจาก ProductImage)
      purchaseType: purchaseType,
      productType: productType,
      stockType: stockType,
      taxType: 'แยกภาษี',
      taxRate: 0,

      // สถานะการอนุมัติ - สำคัญ!
      verified: true, // ต้องเป็น true เพื่อให้แสดงใน POS
      pending: false, // ต้องเป็น false เพื่อให้แสดงใน POS

      // ข้อมูลระบบ
      productModel: 'Product',
      updated_by: userId,
      last_updated: new Date()
    });

    const savedStock = await branchStock.save();

    // ส่ง socket.io event เพื่อแจ้งการสร้าง BranchStock
    const io = req.app.get('io');
    if (io) {
      io.emit('branchstockCreated', {
        data: savedStock,
        type: 'quick_sale',
        branchCode: branchCode,
        message: `เพิ่มสต็อกขายด่วน: ${name} (IMEI: ${imei})`
      });
    }

    // บันทึกประวัติการเข้าสินค้าใน BranchStockHistory
    try {
      const stockHistory = new BranchStockHistory({
        branch_code: branchCode,
        change_type: 'IN',
        reason: 'ขายด่วนฉุกเฉิน',
        performed_by: userId,

        items: [{
          product_id: savedProduct._id,
          productImageId: null,
          image: savedProduct.image || '',
          poNumber: poNumber, // เพิ่ม poNumber
          documentNumber: poNumber, // เพิ่ม documentNumber
          barcode: savedProduct.barcode || imei,
          sku: `QS-${branchCode}-${imei.slice(-8)}`, // เพิ่ม SKU
          imei: imei,
          category: productType === 'mobile' ? 'มือถือ' : 'อุปกรณ์เสริม', // ใช้ข้อมูลจาก ProductImage
          name: name,
          brand: brand,
          status: 'active',
          qty: 1,
          price: priceData.cashPrice, // ราคาสด (ใช้ข้อมูลจาก ProductImage)
          cost: defaultCost,

          // ข้อมูลราคาผ่อนครบถ้วน (จาก ProductImage)
          pricePayOff: priceData.installmentPrice, // ราคาผ่อน
          downAmount: priceData.downAmount,
          downInstallmentCount: priceData.downInstallmentCount,
          downInstallment: priceData.downInstallment,
          creditThreshold: priceData.creditThreshold,
          payUseInstallmentCount: priceData.payUseInstallmentCount,
          payUseInstallment: priceData.payUseInstallment,
          docFee: priceData.docFee,
          unit: 'เครื่อง', // หน่วยที่เหมาะสม
          remainQty: 1 // สินค้าเข้า 1 ชิ้น
        }],

        // ข้อมูลการเงิน
        quantity: 1,
        stock_value: 1,
        sub_total: defaultCost,
        vat_amount: 0,
        discount: 0,
        total_amount: defaultCost,
        net_amount: defaultCost,

        // ข้อมูลเอกสาร
        invoiceNumber: '',
        invoice_no: '',

        // ข้อมูลซัพพลายเออร์
        supplier: supplierObjectId,

        // ข้อมูลลูกค้า (สำหรับระบบขายด่วน)
        customerType: 'individual',
        customerInfo: {
          prefix: '',
          firstName: 'ระบบขายด่วนฉุกเฉิน',
          lastName: '',
          phone: '',
          taxId: '',
          birthDate: null,
          age: null,
          address: {
            houseNo: '',
            moo: '',
            subDistrict: '',
            district: '',
            province: '',
            zipcode: ''
          }
        },

        // ข้อมูลภาษี
        taxType: 'แยกภาษี',

        // ข้อมูลการดำเนินการ
        performed_at: new Date(),
        performed_by: userId,
        scanned_by: userId,
        verified_by: userId,
        staff_name: userName,

        // ข้อมูลโหมดขายด่วน
        quickSale: true,
        urgentSale: urgentSale || true,

        notes: `สินค้าเข้าจากระบบขายด่วนฉุกเฉิน\nIMEI: ${imei}\nPO Number: ${poNumber}\nดำเนินการโดย: ${userName}\nเวลา: ${timestamp || new Date().toISOString()}`,

        // ข้อมูลอื่นๆ ที่จำเป็น
        sale_date: null, // ยังไม่ขาย
        categoryGroup: null, // อาจเพิ่มภายหลัง
        installment_id: null, // ไม่เกี่ยวกับผ่อน ณ ตอนนี้
        contract_no: '', // ไม่มีสัญญา
        order_id: null, // ไม่มี order
        customer: null // ไม่มีลูกค้า
      });

      const savedHistory = await stockHistory.save();
      console.log(`[Quick Sale] Created stock history for IMEI ${imei} in branch ${branchCode}`);

      // ส่ง socket.io event เพื่อแจ้งการสร้าง BranchStockHistory
      const io = req.app.get('io');
      if (io) {
        io.emit('branchstockhistoryCreated', {
          data: savedHistory,
          type: 'quick_sale_in',
          branchCode: branchCode,
          message: `เพิ่มสินค้าขายด่วน: ${name} (IMEI: ${imei})`
        });
      }
    } catch (historyError) {
      console.error('Failed to create stock history:', historyError);
      // ไม่ให้ history error หยุดกระบวนการหลัก
    }

    // สร้าง Purchase Order ย้อนหลัง (สำหรับการติดตาม) - ใช้ poNumber เดียวกัน
    const purchaseOrder = new PurchaseOrder({
      poNumber: poNumber, // ใช้ poNumber เดียวกับ BranchStock
      supplier: supplierObjectId,
      branch_code: branchCode,
      documentNumber: poNumber, // ใช้หมายเลขเดียวกัน

      items: [{
        productId: savedProduct._id,
        name: savedProduct.name,
        brand: savedProduct.brand,
        imei: savedProduct.imei,
        barcode: savedProduct.barcode || imei,
        sku: `QS-${branchCode}-${imei.slice(-8)}`,
        category: productType === 'mobile' ? 'มือถือ' : 'อุปกรณ์เสริม', // ใช้ข้อมูลจาก ProductImage
        qty: 1,
        cost: defaultCost,
        discount: 0,
        taxRate: 0,
        taxType: 'แยกภาษี',
        stockType: stockType, // ใช้ข้อมูลจาก ProductImage
        netAmount: defaultCost,
        taxAmount: 0,
        totalItemAmount: defaultCost,
        poNumber: poNumber
      }],

      totalAmount: defaultCost,

      // ข้อมูลผู้สร้างและอนุมัติ
      createdBy: userId,
      createdByName: userName,
      status: 'ขายด่วนจากสาขา', // สถานะพิเศษ

      // ข้อมูลโหมดขายด่วน
      quickSale: true,
      urgentSale: urgentSale,
      actualReceiveDate: new Date(), // รับของทันที

      orderDate: new Date(),
      createdBy: userId,
      createdAt: new Date(),

      notes: `โหมดขายด่วน - เพิ่มสินค้าเข้าสต็อกทันทีเพื่อการขาย\nIMEI: ${imei}\nผู้ดำเนินการ: ${userName} (${userRole})\nเวลา: ${timestamp}`
    });

    const savedPO = await purchaseOrder.save();

    // สร้าง Audit Log
    try {
      const auditLog = new AuditLog({
        action: 'QUICK_SALE_PRODUCT_CREATED',
        resource: 'QuickSale',
        resourceId: savedProduct._id,
        resourceName: savedProduct.name,
        userId: userId,
        userName: userName,
        userRole: userRole,

        details: {
          imei: imei,
          productName: name,
          brand: brand,
          cost: cost,
          supplierId: supplierId,
          supplierName: supplier?.name,
          branchCode: branchCode,
          poNumber: savedPO.poNumber,
          stockId: savedStock._id,
          urgentSale: urgentSale,
          timestamp: timestamp
        },

        severity: 'HIGH', // ระดับสูงเพราะเป็นการขายด่วน
        category: 'QUICK_SALE',
        branchCode: branchCode,
        timestamp: new Date()
      });

      await auditLog.save();
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
      // ไม่ให้ audit error หยุดกระบวนการหลัก
    }

    // ส่งผลลัพธ์กลับ
    res.status(201).json({
      success: true,
      message: 'เพิ่มสินค้าเข้าสต็อกเรียบร้อย พร้อมขายทันที (รวมบันทึกประวัติการเข้าสินค้า)',
      data: {
        product: {
          _id: savedProduct._id,
          name: savedProduct.name,
          brand: savedProduct.brand,
          imei: savedProduct.imei,
          barcode: savedProduct.barcode,
          cost: savedProduct.cost,
          price: savedProduct.price,
          quickSale: true
        },
        stock: {
          _id: savedStock._id,
          branchCode: savedStock.branchCode,
          status: savedStock.status,
          receiveDate: savedStock.receiveDate,
          receiveType: 'quick_sale'
        },
        purchaseOrder: {
          _id: savedPO._id,
          poNumber: savedPO.poNumber,
          status: savedPO.status,
          totalAmount: savedPO.totalAmount
        },
        stockHistory: {
          recorded: true,
          reason: 'ขายด่วนฉุกเฉิน',
          changeType: 'IN',
          note: 'สินค้าเข้าจากระบบขายด่วนฉุกเฉิน'
        },
        supplier: supplier,
        metadata: {
          quickSale: true,
          urgentSale: urgentSale,
          createdBy: userName,
          createdAt: new Date(),
          branchCode: branchCode,
          historyRecorded: true
        }
      }
    });

  } catch (error) {
    console.error('Quick Sale Error:', error);

    // สร้าง Audit Log สำหรับ Error
    try {
      // ตรวจสอบว่ามีข้อมูล user หรือไม่ก่อนสร้าง audit log
      if (req.user?.id && (req.user?.employee?.name || req.user?.username)) {
        const auditLog = new AuditLog({
          action: 'QUICK_SALE_ERROR',
          resource: 'QuickSale',
          userId: req.user.id,
          userName: req.user.employee?.name || req.user.username,
          userRole: req.user.role || 'ไม่ระบุ',

          details: {
            error: error.message,
            stack: error.stack,
            requestBody: req.body,
            timestamp: new Date()
          },

          severity: 'CRITICAL', // ใช้ CRITICAL แทน ERROR
          category: 'QUICK_SALE',
          branchCode: req.body?.branchCode,
          timestamp: new Date()
        });

        await auditLog.save();
      } else {
        console.log('Skipping audit log creation - no valid user data');
      }
    } catch (auditError) {
      console.error('Failed to create error audit log:', auditError);
    }

    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง',
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * ดึงรายการสินค้าที่ขายด่วน
 * GET /api/quick-sale
 */
exports.getQuickSaleProducts = async (req, res) => {
  try {
    const { branchCode, page = 1, limit = 100 } = req.query;

    // ดึงข้อมูลจาก BranchStock เพื่อให้ได้ข้อมูลครบถ้วน
    const query = {
      poNumber: { $regex: /^QS-/ }, // สินค้าขายด่วนจะมี poNumber ขึ้นต้นด้วย QS-
      verified: true,
      pending: false
    };

    if (branchCode) {
      query.branch_code = branchCode;
    }

    const branchStocks = await BranchStock.find(query)
      .populate('supplier', 'name code type')
      .populate('product_id', 'name brand cost categoryGroup')
      .sort({ last_updated: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await BranchStock.countDocuments(query);

    // แปลงข้อมูลให้เหมาะสมกับ backdated_purchase_order.html
    const formattedData = branchStocks.map(stock => ({
      _id: stock._id,
      name: stock.name,
      brand: stock.brand,
      imei: stock.imei,
      cost: stock.cost || 0,
      price: stock.price || 0,
      branchCode: stock.branch_code,
      categoryGroup: stock.categoryGroup,
      timestamp: stock.timestamp || stock.createdAt,
      addedBy: stock.addedBy,
      addedByName: stock.addedByName || 'ขายด่วนฉุกเฉิน',
      supplier: stock.supplier,
      poNumber: stock.poNumber,
      productType: stock.productType,
      stockType: stock.stockType,
      taxType: stock.taxType || 'แยกภาษี',
      status: 'pending_po',
      urgentSale: true,
      type: 'backdated'
    }));

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get Quick Sale Products Error:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลสินค้าขายด่วนได้',
      code: 'FETCH_ERROR'
    });
  }
};

/**
 * ดึงรายการสินค้าขายด่วนที่รอการอนุมัติ (pending: true)
 */
exports.getQuickSalePendingProducts = async (req, res) => {
  try {
    const { branchCode, page = 1, limit = 100 } = req.query;

    // ดึงข้อมูลจาก BranchStock สำหรับสินค้าที่รอการอนุมัติ
    const query = {
      poNumber: { $regex: /^QS-/ }, // สินค้าขายด่วนจะมี poNumber ขึ้นต้นด้วย QS-
      pending: true,  // รอการอนุมัติ
      verified: false // ยังไม่ได้รับการตรวจสอบ
    };

    if (branchCode) {
      query.branch_code = branchCode;
    }

    const branchStocks = await BranchStock.find(query)
      .populate('supplier', 'name code type')
      .populate('product_id', 'name brand cost categoryGroup')
      .sort({ createdAt: -1 }) // เรียงตามวันที่สร้างล่าสุด
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await BranchStock.countDocuments(query);

    // แปลงข้อมูลให้เหมาะสมกับ frontend
    const formattedData = branchStocks.map(stock => ({
      _id: stock._id,
      name: stock.name,
      brand: stock.brand,
      imei: stock.imei,
      cost: stock.cost || 0,
      price: stock.price || 0,
      branchCode: stock.branch_code,
      categoryGroup: stock.categoryGroup,
      timestamp: stock.createdAt,
      addedBy: stock.addedBy,
      addedByName: stock.addedByName || 'ขายด่วนฉุกเฉิน',
      supplier: stock.supplier,
      poNumber: stock.poNumber,
      productType: stock.productType,
      stockType: stock.stockType,
      taxType: stock.taxType || 'แยกภาษี',
      status: 'pending_approval', // สถานะรอการอนุมัติ
      urgentSale: true,
      type: 'backdated',
      note: stock.note || '',
      sku: stock.sku,
      barcode: stock.barcode,
      stock_value: stock.stock_value,
      pending: stock.pending,
      verified: stock.verified
    }));

    console.log(`✅ Found ${formattedData.length} pending quick sale products for branch ${branchCode || 'all branches'}`);

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get Quick Sale Pending Products Error:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลสินค้าขายด่วนที่รอการอนุมัติได้',
      code: 'FETCH_PENDING_ERROR'
    });
  }
};

/**
 * ดึงสถิติการขายด่วน
 * GET /api/quick-sale/stats
 */
exports.getQuickSaleStats = async (req, res) => {
  try {
    const { branchCode, startDate, endDate } = req.query;

    const matchQuery = { quickSale: true };

    if (branchCode) {
      matchQuery.branchCode = branchCode;
    }

    if (startDate && endDate) {
      matchQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Product.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalQuickSales: { $sum: 1 },
          totalValue: { $sum: '$cost' },
          avgCost: { $avg: '$cost' },
          maxCost: { $max: '$cost' },
          minCost: { $min: '$cost' }
        }
      }
    ]);

    const branchStats = await Product.aggregate([
      { $match: { quickSale: true } },
      {
        $group: {
          _id: '$branchCode',
          count: { $sum: 1 },
          totalValue: { $sum: '$cost' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalQuickSales: 0,
          totalValue: 0,
          avgCost: 0,
          maxCost: 0,
          minCost: 0
        },
        byBranch: branchStats
      }
    });

  } catch (error) {
    console.error('Get Quick Sale Stats Error:', error);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงสถิติการขายด่วนได้',
      code: 'STATS_ERROR'
    });
  }
};