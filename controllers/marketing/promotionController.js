// controllers/promotionController.js
const Promotion = require('../../models/MKT/Promotion');
const ProductImage = require('../../models/Stock/ProductImage');
const BranchStock = require('../../models/POS/BranchStock'); // Added import

// สร้างโปรโมชั่นใหม่
exports.createPromotion = async (req, res) => {
  try {
    const promotionData = req.body;
    
    // Validate dates
    if (new Date(promotionData.startDate) >= new Date(promotionData.endDate)) {
      return res.status(400).json({
        status: 'fail',
        message: 'วันเริ่มต้นต้องน้อยกว่าวันสิ้นสุด'
      });
    }

    // Set discountType based on type
    if (promotionData.type === 'discount_percentage') {
      promotionData.discountType = 'percentage';
    } else if (promotionData.type === 'discount_amount') {
      promotionData.discountType = 'amount';
    }

    // สร้างโปรโมชั่น
    const promotion = await Promotion.create({
      ...promotionData,
      createdBy: req.user?._id
    });

    // Populate before sending
    await promotion.populate('applicableProducts', 'name price productType');
    await promotion.populate('createdBy', 'name');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('promotionCreated', promotion);
    }

    res.status(201).json({
      status: 'success',
      data: promotion
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// ดูโปรโมชั่นทั้งหมด
exports.getAllPromotions = async (req, res) => {
  try {
    const { active, branch, startDate, endDate } = req.query;
    const filter = {};

    // Filter active only
    if (active === 'true') {
      const now = new Date();
      filter.isActive = true;
      filter.startDate = { $lte: now };
      filter.endDate = { $gte: now };
    }

    // Filter by branch
    if (branch) {
      filter.$or = [
        { applicableBranches: { $size: 0 } },
        { applicableBranches: branch }
      ];
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.$and = filter.$and || [];
      if (startDate) {
        filter.$and.push({ endDate: { $gte: new Date(startDate) } });
      }
      if (endDate) {
        filter.$and.push({ startDate: { $lte: new Date(endDate) } });
      }
      // Remove empty $and
      if (filter.$and.length === 0) delete filter.$and;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const promotions = await Promotion.find(filter).lean()
      .populate('applicableProducts', 'name price productType')
      .populate('createdBy', 'name')
      .sort({ priority: 1, createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Promotion.countDocuments(filter);

    res.json({
      status: 'success',
      results: promotions.length,
      total,
      data: promotions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
};

// ดูโปรโมชั่นตาม ID
exports.getPromotionById = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id).lean()
      .populate('applicableProducts')
      .populate('createdBy', 'name');

    if (!promotion) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบโปรโมชั่น'
      });
    }

    res.json({
      status: 'success',
      data: promotion
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// อัพเดทโปรโมชั่น
exports.updatePromotion = async (req, res) => {
  try {
    const updateData = req.body;
    
    // Validate dates if both provided
    if (updateData.startDate && updateData.endDate) {
      if (new Date(updateData.startDate) >= new Date(updateData.endDate)) {
        return res.status(400).json({
          status: 'fail',
          message: 'วันเริ่มต้นต้องน้อยกว่าวันสิ้นสุด'
        });
      }
    }

    // Update discountType based on type
    if (updateData.type === 'discount_percentage') {
      updateData.discountType = 'percentage';
    } else if (updateData.type === 'discount_amount') {
      updateData.discountType = 'amount';
    }

    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('applicableProducts', 'name price productType')
    .populate('createdBy', 'name');

    if (!promotion) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบโปรโมชั่น'
      });
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('promotionUpdated', promotion);
    }

    res.json({
      status: 'success',
      data: promotion
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// ลบโปรโมชั่น
exports.deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);

    if (!promotion) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบโปรโมชั่น'
      });
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('promotionDeleted', { id: req.params.id });
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// คำนวณราคาหลังหักโปรโมชั่น
exports.calculatePrice = async (req, res) => {
  try {
    const { productId, branchCode, quantity = 1, customerId } = req.body;

    // หาสินค้า
    const product = await ProductImage.findById(productId).lean();
    if (!product) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบสินค้า'
      });
    }

    // หาโปรโมชั่นที่ใช้ได้
    const promotions = await Promotion.findActivePromotions({
      branchCode,
      productId,
      category: product.productType
    });

    // คำนวณส่วนลดจากแต่ละโปร
    let bestPromotion = null;
    let maxDiscount = 0;
    let originalPrice = product.price * quantity;
    let finalPrice = originalPrice;

    for (const promo of promotions) {
      // ตรวจสอบเงื่อนไขเพิ่มเติม
      if (promo.conditions?.minPurchaseAmount > originalPrice) continue;
      
      const discount = promo.calculateDiscount(product.price, quantity);
      if (discount > maxDiscount) {
        maxDiscount = discount;
        bestPromotion = promo;
      }
    }

    finalPrice = originalPrice - maxDiscount;

    res.json({
      status: 'success',
      data: {
        originalPrice,
        discount: maxDiscount,
        finalPrice,
        appliedPromotion: bestPromotion ? {
          id: bestPromotion._id,
          name: bestPromotion.name,
          type: bestPromotion.type
        } : null
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// ตรวจสอบโปรโมชั่นที่ใช้ได้กับสินค้า
// แก้ไขฟังก์ชัน checkAvailablePromotions ในไฟล์ promotionController.js
// ให้แทนที่ฟังก์ชันเดิมด้วยโค้ดนี้

exports.checkAvailablePromotions = async (req, res) => {
  try {
    const { productIds, branchCode } = req.body;
    // console.log('📥 Request:', { productIds, branchCode });
    
    const now = new Date();
    
    // ดึงโปรโมชั่นที่ active พร้อม populate ชื่อสินค้า
    const promotions = await Promotion.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { applicableBranches: { $size: 0 } },
        { applicableBranches: branchCode }
      ]
    })
    .populate('applicableProducts', '_id name price') // ต้อง populate name
    .lean();
    
    // console.log('📋 Found promotions:', promotions.length);
    
    const result = {};
    
    // สำหรับแต่ละ branchStockId
    for (const branchStockId of productIds) {
      // ดึง BranchStock
      const stock = await BranchStock.findById(branchStockId).lean();
      if (!stock) {
        // console.log('❌ Stock not found:', branchStockId);
        continue;
      }
      
      // console.log('📦 Stock:', {
        _id: stock._id,
        name: stock.name,
        product_id: stock.product_id,
        productModel: stock.productModel
      });
      
      // กรองโปรโมชั่นที่ใช้ได้ - เช็คด้วยชื่อเป็นหลัก
      const applicable = promotions.filter(p => {
        // ถ้าไม่ระบุสินค้า = ใช้ได้กับทุกสินค้า
        if (!p.applicableProducts || p.applicableProducts.length === 0) {
          // console.log(`✅ Promotion "${p.name}" applies to all products.`);
          return true;
        }
        
        // เช็คด้วยชื่อสินค้าเป็นหลัก
        if (stock.name) {
          const hasProductByName = p.applicableProducts.some(prod => {
            // เปรียบเทียบชื่อแบบ case-insensitive และ trim ช่องว่าง
            const stockName = stock.name.trim().toLowerCase();
            const prodName = prod.name ? prod.name.trim().toLowerCase() : '';
            const match = stockName === prodName;
            
            if (match) {
              // console.log(`✅ Promotion "${p.name}" matched by name: "${stock.name}" === "${prod.name}"`);
            }
            return match;
          });
          
          if (hasProductByName) {
            return true;
          }
        }
        
        // Fallback: เช็คด้วย product_id (ถ้ามี)
        if (stock.product_id && stock.productModel === 'ProductImage') {
          const hasProduct = p.applicableProducts.some(prod => {
            const match = prod._id.toString() === stock.product_id.toString();
            if (match) {
              // console.log(`✅ Promotion "${p.name}" matched by product_id: ${stock.product_id}`);
            }
            return match;
          });
          if (hasProduct) {
            return true;
          }
        }
        
        // console.log(`🚫 Promotion "${p.name}" does not apply to: "${stock.name}"`);
        return false;
      });
      
      if (applicable.length) {
        result[branchStockId] = applicable.map(promo => ({
          id: promo._id,
          name: promo.name,
          type: promo.type,
          discount: promo.discountValue ?? promo.specialPrice ?? 0,
          discountType: promo.discountType
        }));
      }
    }
    
    // console.log('📤 Result:', JSON.stringify(result, null, 2));
    return res.json({ status: 'success', data: result });
    
  } catch (err) {
    console.error('Error in checkAvailablePromotions:', err);
    return res.status(500).json({ status: 'fail', message: err.message });
  }
};

// อัพเดทการใช้งานโปรโมชั่น
exports.usePromotion = async (req, res) => {
  try {
    const { promotionId } = req.body;
    
    if (!promotionId) {
      return res.status(400).json({
        status: 'fail',
        message: 'promotionId is required'
      });
    }

    const promotion = await Promotion.findById(promotionId).lean();
    if (!promotion) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบโปรโมชั่น'
      });
    }

    // ตรวจสอบว่ายังใช้ได้อยู่
    if (!promotion.isValid) {
      return res.status(400).json({
        status: 'fail',
        message: 'โปรโมชั่นนี้ไม่สามารถใช้ได้แล้ว'
      });
    }

    // Check usage limit
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      return res.status(400).json({
        status: 'fail',
        message: 'โปรโมชั่นนี้ถูกใช้เต็มจำนวนแล้ว'
      });
    }

    // เพิ่ม usage count
    promotion.usageCount += 1;
    await promotion.save();

    res.json({
      status: 'success',
      message: 'บันทึกการใช้โปรโมชั่นเรียบร้อย',
      data: {
        remainingUsage: promotion.usageLimit ? promotion.usageLimit - promotion.usageCount : 'unlimited'
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// ดูสถิติโปรโมชั่น
exports.getPromotionStatistics = async (req, res) => {
  try {
    const { startDate, endDate, branchCode } = req.query;
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate)   filter.createdAt.$lte = new Date(endDate);
    }
    if (branchCode) {
      filter.$or = [
        { applicableBranches: { $size: 0 } },
        { applicableBranches: branchCode }
      ];
    }
    const [ total, activeCount, expiredCount, upcomingCount, topUsed, agg ] = await Promise.all([
      Promotion.countDocuments(filter),
      Promotion.countDocuments({ ...filter, isActive: true, startDate: { $lte: new Date() }, endDate: { $gte: new Date() } }),
      Promotion.countDocuments({ ...filter, endDate: { $lt: new Date() } }),
      Promotion.countDocuments({ ...filter, startDate: { $gt: new Date() } }),
      Promotion.find(filter).lean().sort({ usageCount: -1 }).limit(5).select('name usageCount usageLimit type'),
      Promotion.aggregate([ { $match: filter }, { $group: { _id: null, totalUsage: { $sum: '$usageCount' } } } ])
    ]);
    const totalUsage = agg[0]?.totalUsage || 0;
    res.json({
      status: 'success',
      data: {
        ภาพรวม: { ทั้งหมด: total, กำลังใช้งาน: activeCount, หมดอายุแล้ว: expiredCount, กำลังจะมา: upcomingCount, การใช้งานรวม: totalUsage },
        โปรโมชั่นยอดนิยม: topUsed
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};

// เปิด/ปิดโปรโมชั่นหลายรายการพร้อมกัน
exports.bulkTogglePromotions = async (req, res) => {
  try {
    const { promotionIds, isActive } = req.body;
    if (!Array.isArray(promotionIds) || promotionIds.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'กรุณาระบุรายการโปรโมชั่นที่ต้องการเปลี่ยนสถานะ' });
    }
    const result = await Promotion.updateMany(
      { _id: { $in: promotionIds } },
      { isActive: Boolean(isActive) }
    );
    const io = req.app.get('io');
    if (io) io.emit('promotionsBulkUpdated', { promotionIds, isActive: Boolean(isActive), modifiedCount: result.modifiedCount });
    res.json({
      status: 'success',
      message: `อัปเดตสถานะโปรโมชั่นเรียบร้อย ${result.modifiedCount} รายการ`,
      data: { แก้ไขแล้ว: result.modifiedCount, พบแล้ว: result.matchedCount }
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// ส่งออกข้อมูลโปรโมชั่น
exports.exportPromotions = async (req, res) => {
  try {
    const { format='csv', status, type, branch } = req.query;
    const filter = {};
    if (status && status!=='all') {
      const now = new Date();
      if (status==='active') {
        filter.isActive = true; filter.startDate={ $lte:now }; filter.endDate={ $gte:now };
      } else if (status==='expired') filter.endDate={ $lt:now };
      else if (status==='upcoming') filter.startDate={ $gt:now };
    }
    if (type && type!=='all') filter.type=type;
    if (branch && branch!=='all') filter.$or=[{ applicableBranches: { $size:0 }},{ applicableBranches:branch }];
    const promotions = await Promotion.find(filter).lean()
      .populate('applicableProducts','name')
      .populate('createdBy','name')
      .sort({ createdAt:-1 });
    const labels = {
      discount_percentage:'ส่วนลดเปอร์เซ็นต์',
      discount_amount:'ส่วนลดเงิน',
      special_price:'ราคาพิเศษ',
      buy_x_get_y:'ซื้อ X แถม Y',
      bundle:'จัดชุดสินค้า'
    };
    const statusLabel = promo=> {
      const now=new Date();
      if (!promo.isActive) return 'ปิดใช้งาน';
      if (now< promo.startDate) return 'กำลังจะมา';
      if (now> promo.endDate) return 'หมดอายุแล้ว';
      return 'กำลังใช้งาน';
    };
    if (format==='csv') {
      const data = promotions.map(p=>({
        'ชื่อโปรโมชั่น':p.name,
        'ประเภท':labels[p.type]||p.type,
        'สถานะ': statusLabel(p),
        'วันเริ่มต้น':p.startDate.toLocaleDateString('th-TH'),
        'วันสิ้นสุด':p.endDate.toLocaleDateString('th-TH'),
        'จำนวนการใช้':p.usageCount||0,
        'จำกัดการใช้':p.usageLimit||'ไม่จำกัด',
        'ผู้สร้าง':p.createdBy?.name||'-',
        'วันที่สร้าง':p.createdAt.toLocaleDateString('th-TH')
      }));
      const hdr=Object.keys(data[0]||{}).join(',');
      const rows=data.map(r=>Object.values(r).join(',')).join('\n');
      const csv=hdr+'\n'+rows;
      res.setHeader('Content-Type','text/csv; charset=utf-8');
      res.setHeader('Content-Disposition',`attachment; filename=promotions_${new Date().toISOString().split('T')[0]}.csv`);
      return res.send('\uFEFF'+csv);
    }
    res.json({ status:'success', data:promotions, exported_at:new Date().toISOString(), total_records:promotions.length });
  } catch(err){
    res.status(500).json({ status:'fail', message:err.message });
  }
};

// ตรวจสอบกฎของโปรโมชั่น
exports.validatePromotionRules = async (req,res)=>{
  try {
    const { type,startDate,endDate,applicableProducts,applicableBranches,discountValue,specialPrice,bundleProducts,bundlePrice } = req.body;
    const errors=[], warnings=[];
    if (new Date(startDate)>=new Date(endDate)) errors.push('วันเริ่มต้นต้องน้อยกว่าวันสิ้นสุด');
    if (new Date(startDate)<new Date()) warnings.push('วันเริ่มต้นเป็นอดีต โปรโมชั่นจะเริ่มทันที');
    switch(type){
      case 'discount_percentage':
        if (!discountValue||discountValue<=0||discountValue>100) errors.push('ส่วนลดเปอร์เซ็นต์ต้องอยู่ระหว่าง 1-100%');
        break;
      case 'discount_amount':
        if (!discountValue||discountValue<=0) errors.push('จำนวนส่วนลดต้องมากกว่า 0');
        break;
      case 'special_price':
        if (!specialPrice||specialPrice<=0) errors.push('ราคาพิเศษต้องมากกว่า 0');
        break;
      case 'bundle':
        if (!bundleProducts||bundleProducts.length<2) errors.push('ชุดสินค้าต้องมีอย่างน้อย 2 รายการ');
        if (!bundlePrice||bundlePrice<=0) warnings.push('ราคาชุดต้องมากกว่า 0');
        break;
    }
    const conflicts = await Promotion.find({
      $or:[{ startDate:{ $lte:new Date(endDate) }, endDate:{ $gte:new Date(startDate) } }],
      applicableProducts:{ $in: applicableProducts||[] },
      isActive:true
    }).select('name type startDate endDate');
    if (conflicts.length) warnings.push(`พบโปรโมชั่นขัดแย้ง: ${conflicts.map(p=>p.name).join(', ')}`);
    res.json({ status:'success', data:{ isValid: errors.length===0, errors, warnings, conflictingPromotions: conflicts } });
  } catch(err){
    res.status(500).json({ status:'fail', message:err.message });
  }
};

// คัดลอกโปรโมชั่น
exports.clonePromotion = async (req,res)=>{
  try {
    const orig = await Promotion.findById(req.params.id).lean();
    if (!orig) return res.status(404).json({ status:'fail', message:'ไม่พบโปรโมชั่นที่ต้องการคัดลอก' });
    const obj = orig.toObject();
    delete obj._id; delete obj.createdAt; delete obj.updatedAt; delete obj.__v;
    obj.name = `${orig.name} (สำเนา)`; obj.usageCount=0; obj.isActive=false; obj.createdBy = req.user?._id;
    const dur = new Date(orig.endDate) - new Date(orig.startDate);
    const start = new Date(Date.now()+24*60*60*1000);
    obj.startDate = start;
    obj.endDate = new Date(start.getTime()+dur);
    const cloned = await Promotion.create(obj);
    await cloned.populate('applicableProducts','name price productType');
    await cloned.populate('createdBy','name');
    const io = req.app.get('io');
    if (io) io.emit('promotionCloned',{ original:orig._id, cloned:cloned._id });
    res.status(201).json({ status:'success', message:'คัดลอกโปรโมชั่นเรียบร้อย', data:cloned });
  } catch(err){
    res.status(400).json({ status:'fail', message:err.message });
  }
};

// ใช้โปรโมชั่นกับตะกร้า
exports.applyPromotionToCart = async (req,res)=>{
  try {
    const { cartItems, branchCode } = req.body;
    const promotion = await Promotion.findById(req.params.id).lean();
    if (!promotion) return res.status(404).json({ status:'fail', message:'ไม่พบโปรโมชั่น' });
    if (!promotion.isValid) return res.status(400).json({ status:'fail', message:'โปรโมชั่นไม่สามารถใช้ได้' });
    if (promotion.applicableBranches.length>0 && !promotion.applicableBranches.includes(branchCode)) {
      return res.status(400).json({ status:'fail', message:'โปรโมชั่นนี้ไม่รองรับสาขา' });
    }
    let totalDiscount=0, applicableItems=[];
    cartItems.forEach(it=>{
      const ok = !promotion.applicableProducts.length || promotion.applicableProducts.includes(it.productId);
      if (ok) {
        const d = promotion.calculateDiscount(it.price, it.quantity);
        totalDiscount += d;
        applicableItems.push({ ...it, discount:d, finalPrice:it.price*it.quantity-d });
      }
    });
    res.json({
      status:'success',
      data:{
        promotion:{ id:promotion._id, name:promotion.name, type:promotion.type },
        totalDiscount, applicableItems,
        summary:{
          itemsAffected:applicableItems.length,
          totalItemsInCart:cartItems.length,
          discountPercentage:((totalDiscount/cartItems.reduce((s,i)=>s+i.price*i.quantity,0))*100).toFixed(2)
        }
      }
    });
  } catch(err){
    res.status(400).json({ status:'fail', message:err.message });
  }
};

// ตัวช่วย Debug สำหรับการคำนวณส่วนลดโปรโมชั่น
exports.debugCalculatePrice = async (req, res) => {
  try {
    const { productId, branchCode, quantity = 1, customerId } = req.body;
    
    // console.log('=== DEBUG: คำขอคำนวณราคา ===');
    // console.log('รหัสสินค้า:', productId);
    // console.log('รหัสสาขา:', branchCode);
    // console.log('จำนวน:', quantity);
    
    // ค้นหาสินค้า
    const product = await ProductImage.findById(productId).lean();
    if (!product) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบสินค้า',
        debug: { productId, ผลการค้นหา: null }
      });
    }
    
    // console.log('พบสินค้า:', {
      ชื่อ: product.name,
      ราคา: product.price,
      ประเภท: product.productType
    });
    
    // ค้นหาโปรโมชั่นที่ใช้งานอยู่พร้อม log รายละเอียด
    const promotions = await Promotion.findActivePromotions({
      branchCode,
      productId,
      category: product.productType
    });
    
    // console.log('พบโปรโมชั่นที่ใช้งานอยู่:', promotions.length, 'รายการ');
    
    // คำนวณส่วนลดแต่ละโปรโมชั่นพร้อม debug
    let bestPromotion = null;
    let maxDiscount = 0;
    let originalPrice = product.price * quantity;
    let debugInfo = [];
    
    for (const promo of promotions) {
      // console.log(`\n--- ตรวจสอบโปรโมชั่น: ${promo.name} ---`);
      // console.log('ประเภท:', promo.type);
      // console.log('เงื่อนไข:', promo.conditions);
      
      // ตรวจสอบยอดซื้อขั้นต่ำ
      if (promo.conditions?.minPurchaseAmount > originalPrice) {
        // console.log(`ข้าม: ยอดซื้อขั้นต่ำ ${promo.conditions.minPurchaseAmount} > ${originalPrice}`);
        debugInfo.push({
          ชื่อโปรโมชั่น: promo.name,
          ข้าม: true,
          เหตุผล: `ยอดซื้อขั้นต่ำ ${promo.conditions.minPurchaseAmount} บาท`
        });
        continue;
      }
      
      // Debug การคำนวณส่วนลด
      // console.log('กำลังคำนวณส่วนลด...');
      // console.log('ประเภทส่วนลด:', promo.discountType);
      // console.log('มูลค่าส่วนลด:', promo.discountValue);
      // console.log('ราคาพิเศษ:', promo.specialPrice);
      // console.log('ซื้อ/แถม:', promo.buyQuantity, '/', promo.getQuantity);
      
      const discount = promo.calculateDiscount(product.price, quantity);
      // console.log('ส่วนลดที่คำนวณได้:', discount);
      
      debugInfo.push({
        ชื่อโปรโมชั่น: promo.name,
        ประเภท: promo.type,
        มูลค่าส่วนลด: promo.discountValue,
        ส่วนลดที่คำนวณได้: discount,
        รายละเอียด: {
          ประเภทส่วนลด: promo.discountType,
          ราคาพิเศษ: promo.specialPrice,
          จำนวนซื้อ: promo.buyQuantity,
          จำนวนแถม: promo.getQuantity
        }
      });
      
      if (discount > maxDiscount) {
        maxDiscount = discount;
        bestPromotion = promo;
      }
    }
    
    let finalPrice = originalPrice - maxDiscount;
    
    // console.log('\n=== ผลลัพธ์สุดท้าย ===');
    // console.log('ราคาเดิม:', originalPrice);
    // console.log('ส่วนลดสูงสุด:', maxDiscount);
    // console.log('ราคาสุทธิ:', finalPrice);
    // console.log('โปรโมชั่นที่ดีที่สุด:', bestPromotion?.name || 'ไม่มี');
    
    res.json({
      status: 'success',
      data: {
        ราคาเดิม: originalPrice,
        ส่วนลด: maxDiscount,
        ราคาสุทธิ: finalPrice,
        โปรโมชั่นที่ใช้: bestPromotion ? {
          id: bestPromotion._id,
          ชื่อ: bestPromotion.name,
          ประเภท: bestPromotion.type
        } : null
      },
      debug: {
        สินค้า: {
          ชื่อ: product.name,
          ราคา: product.price,
          ประเภท: product.productType
        },
        โปรโมชั่นทั้งหมด: debugInfo,
        จำนวนโปรโมชั่นที่พบ: promotions.length
      }
    });
  } catch (err) {
    console.error('ERROR in debugCalculatePrice:', err);
    res.status(400).json({
      status: 'fail',
      message: err.message,
      stack: err.stack
    });
  }
};

// ฟังก์ชันตรวจสอบว่าโปรโมชั่นตั้งค่าถูกต้องหรือไม่
exports.validatePromotionSetup = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id).lean()
      .populate('applicableProducts')
      .populate('bundleProducts');
    
    if (!promotion) {
      return res.status(404).json({
        status: 'fail',
        message: 'ไม่พบโปรโมชั่น'
      });
    }
    
    const issues = [];
    const warnings = [];
    
    // ตรวจสอบการตั้งค่าพื้นฐาน
    if (!promotion.name) issues.push('ไม่มีชื่อโปรโมชั่น');
    if (!promotion.type) issues.push('ไม่มีประเภทโปรโมชั่น');
    
    // ตรวจสอบตามประเภทโปรโมชั่น
    switch(promotion.type) {
      case 'discount_percentage':
        if (!promotion.discountValue || promotion.discountValue <= 0) {
          issues.push('ไม่ได้ตั้งค่าเปอร์เซ็นต์ส่วนลด หรือค่าเป็น 0');
        }
        if (promotion.discountValue > 100) {
          issues.push('เปอร์เซ็นต์ส่วนลดเกิน 100%');
        }
        break;
        
      case 'discount_amount':
        if (!promotion.discountValue || promotion.discountValue <= 0) {
          issues.push('ไม่ได้ตั้งค่าจำนวนเงินส่วนลด หรือค่าเป็น 0');
        }
        break;
        
      case 'special_price':
        if (!promotion.specialPrice || promotion.specialPrice <= 0) {
          issues.push('ไม่ได้ตั้งค่าราคาพิเศษ หรือค่าเป็น 0');
        }
        break;
        
      case 'buy_x_get_y':
        if (!promotion.buyQuantity || promotion.buyQuantity <= 0) {
          issues.push('ไม่ได้ตั้งค่าจำนวนที่ต้องซื้อ');
        }
        if (!promotion.getQuantity || promotion.getQuantity <= 0) {
          issues.push('ไม่ได้ตั้งค่าจำนวนที่แถม');
        }
        break;
        
      case 'bundle':
        if (!promotion.bundleProducts || promotion.bundleProducts.length < 2) {
          issues.push('ชุดสินค้าต้องมีอย่างน้อย 2 รายการ');
        }
        if (!promotion.bundlePrice || promotion.bundlePrice <= 0) {
          issues.push('ไม่ได้ตั้งค่าราคาชุดสินค้า หรือค่าเป็น 0');
        }
        break;
    }
    
    // ตรวจสอบวันที่
    const now = new Date();
    if (promotion.startDate > promotion.endDate) {
      issues.push('วันเริ่มต้นมากกว่าวันสิ้นสุด');
    }
    if (promotion.endDate < now) {
      warnings.push('โปรโมชั่นหมดอายุแล้ว');
    }
    
    // ตรวจสอบการตั้งค่าสินค้า/สาขา
    if (promotion.applicableProducts.length === 0 && 
        promotion.applicableCategories.length === 0) {
      warnings.push('โปรโมชั่นใช้ได้กับทุกสินค้า');
    }
    
    if (promotion.applicableBranches.length === 0) {
      warnings.push('โปรโมชั่นใช้ได้กับทุกสาขา');
    }
    
    res.json({
      status: 'success',
      data: {
        โปรโมชั่น: {
          id: promotion._id,
          ชื่อ: promotion.name,
          ประเภท: promotion.type,
          สถานะ: promotion.status,
          ใช้งานได้: promotion.isValid
        },
        ปัญหาที่พบ: issues,
        คำเตือน: warnings,
        สถานะการตั้งค่า: issues.length === 0 ? 'ถูกต้อง' : 'มีปัญหา'
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: err.message
    });
  }
};

// ฟังก์ชันแก้ไขปัญหาโปรโมชั่นที่มีค่า 0
async function fixZeroDiscountPromotions() {
  try {
    const promotions = await Promotion.find({
      $or: [
        { discountValue: 0 },
        { discountValue: null },
        { discountValue: { $exists: false } }
      ]
    });
    
    // console.log(`พบโปรโมชั่นที่มีส่วนลด 0: ${promotions.length} รายการ`);
    
    for (const promo of promotions) {
      // console.log(`\nตรวจสอบ: ${promo.name}`);
      // console.log(`ประเภท: ${promo.type}`);
      // console.log(`ค่าส่วนลด: ${promo.discountValue}`);
      
      if (promo.type === 'discount_percentage' || promo.type === 'discount_amount') {
        // console.log('>>> ต้องตั้งค่า discountValue ให้มากกว่า 0');
      }
    }
    
    return promotions;
  } catch (err) {
    console.error('Error fixing promotions:', err);
  }
}
