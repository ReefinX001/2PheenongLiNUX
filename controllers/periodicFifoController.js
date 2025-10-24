// File: controllers/periodicFifoController.js

const mongoose = require('mongoose');
const BranchStockHistory = require('../models/POS/BranchStockHistory');

/**
 * GET /api/periodic-fifo/report
 *  - กรองตาม start, end, branch_code, item_id
 *  - ทำ Periodic FIFO จริง ๆ (รวมยอด OUT ทั้งงวด, ตัดทีเดียว)
 *  - ส่ง movements เป็น 4 แถว (Beginning, Purchases, Out, Ending)
 */
exports.getPeriodicFifoReport = async (req, res) => {
  const io = req.app.get('io');
  try {
    const { start, end, branch_code, item_id } = req.query;

    // 1) ตรวจสอบพารามิเตอร์
    if (!start || !end || !item_id) {
      return res.status(400).json({
        success: false,
        error: 'ต้องระบุ start, end, และ item_id (ObjectId ของ product_id)'
      });
    }
    if (!mongoose.isValidObjectId(item_id)) {
      return res.status(400).json({
        success: false,
        error: 'item_id ไม่ใช่ ObjectId ที่ถูกต้อง'
      });
    }

    const startDate = new Date(start + 'T00:00:00');
    const endDate   = new Date(end   + 'T23:59:59');
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบวันที่ไม่ถูกต้อง'
      });
    }

    // 2) สร้าง filter สำหรับดึงเอกสาร IN/OUT
    const filter = {
      performed_at: { $gte: startDate, $lte: endDate },
      'items.product_id': new mongoose.Types.ObjectId(item_id)
    };
    if (branch_code && branch_code !== 'all') {
      filter.branch_code = branch_code;
    }

    // 3) ดึง BranchStockHistory (IN/OUT) ทั้งหมดในงวด
    const histories = await BranchStockHistory.find(filter).limit(100).lean()
      .sort({ performed_at: 1 })
      .lean();

    // 4) รวมยอดซื้อ (IN) และยอดขาย (OUT) ทั้งหมดในงวด
    let totalInQty  = 0;
    let totalInCost = 0; // รวม (qty * cost)
    let totalOutQty = 0; // ไม่สน cost ระหว่างงวด

    histories.forEach(doc => {
      const items = doc.items || [];
      items.forEach(it => {
        if (String(it.product_id) === String(item_id)) {
          const qty  = it.qty  || 0;
          const cost = it.cost || 0;
          if (doc.change_type === 'IN') {
            totalInQty  += qty;
            totalInCost += (qty * cost);
          } else if (doc.change_type === 'OUT') {
            totalOutQty += qty;
          }
        }
      });
    });

    // 5) สมมติ Beginning = 0 (ถ้ามีข้อมูลงวดก่อนจริง ให้ดึงมาแทน)
    let beginningQty   = 0;
    let beginningCost  = 0; // cost/หน่วย (ถ้ารู้)
    let beginningValue = beginningQty * beginningCost;

    // 6) คำนวณ Goods Available
    const goodsAvailableQty   = beginningQty + totalInQty;
    const goodsAvailableValue = beginningValue + totalInCost;

    // 7) หาจำนวน “Ending Qty” = Goods Available - totalOutQty
    let endingQty = goodsAvailableQty - totalOutQty;
    if (endingQty < 0) endingQty = 0; // กันติดลบ

    // 8) ทำ FIFO ทีเดียวตอนปิดงวด => หาค่า endingValue
    //    สร้าง batch: [ (beginningQty, beginningCost), (totalInQty, costAvgPurchases) ]
    const allBatches = [];
    if (beginningQty > 0) {
      allBatches.push({ qty: beginningQty, cost: beginningCost });
    }
    // cost เฉลี่ยของทั้งหมดที่ซื้อ
    let costAvgPurchases = 0;
    if (totalInQty > 0) {
      costAvgPurchases = totalInCost / totalInQty;
    }
    if (totalInQty > 0) {
      allBatches.push({ qty: totalInQty, cost: costAvgPurchases });
    }

    // ตัด totalOutQty ตาม FIFO
    let remainOut = totalOutQty;
    for (let i = 0; i < allBatches.length && remainOut > 0; i++) {
      const batch = allBatches[i];
      if (batch.qty > remainOut) {
        batch.qty -= remainOut;
        remainOut = 0;
      } else {
        remainOut -= batch.qty;
        batch.qty = 0;
      }
    }

    // รวม endingValue
    let endingValue = 0;
    allBatches.forEach(b => {
      if (b.qty > 0) {
        endingValue += (b.qty * b.cost);
      }
    });

    // 9) คำนวณ COGS
    const cogs = goodsAvailableValue - endingValue;

    // 10) สร้าง movements แบบ 4 แถว (Periodic)
    //     1) Beginning
    //     2) Purchases
    //     3) Out
    //     4) Ending
    const movements = [
      {
        date: null,
        activity: 'ยอดยกมา (Beginning)',
        purchaseQty: beginningQty,
        purchaseUnitCost: beginningCost,
        purchaseTotalCost: beginningValue,

        salesQty: 0,
        salesUnitCost: 0,
        salesTotalCost: 0,

        balanceQty: beginningQty,
        balanceTotalCost: beginningValue,

        note: ''
      },
      {
        date: null,
        activity: 'ซื้อ/รับเข้ารวมทั้งงวด',
        purchaseQty: totalInQty,
        purchaseUnitCost: costAvgPurchases,
        purchaseTotalCost: totalInCost,

        salesQty: 0,
        salesUnitCost: 0,
        salesTotalCost: 0,

        balanceQty: goodsAvailableQty,
        balanceTotalCost: goodsAvailableValue,

        note: ''
      },
      {
        date: null,
        activity: 'ขาย/จ่ายออกรวมทั้งงวด',
        purchaseQty: 0,
        purchaseUnitCost: 0,
        purchaseTotalCost: 0,

        salesQty: totalOutQty,
        salesUnitCost: 0,  // Periodic ไม่ track cost/unit ระหว่างงวด
        salesTotalCost: 0,

        balanceQty: endingQty,
        balanceTotalCost: endingValue,

        note: ''
      },
      {
        date: null,
        activity: 'ยอดคงเหลือ (Ending)',
        purchaseQty: 0,
        purchaseUnitCost: 0,
        purchaseTotalCost: 0,

        salesQty: 0,
        salesUnitCost: 0,
        salesTotalCost: 0,

        balanceQty: endingQty,
        balanceTotalCost: endingValue,

        note: `COGS = ${cogs}`
      }
    ];

    // 11) ส่งผลลัพธ์
    const result = {
      beginningQty,
      totalInQty,
      totalOutQty,
      goodsAvailableQty,
      endingQty,
      endingValue,
      cogs,
      movements
    };

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('getPeriodicFifoReport (Periodic) error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/periodic-fifo/report-all => Periodic FIFO (ไม่กรอง)
 * รวมทุกสินค้า => (ไม่แนะนำถ้ามีหลายสินค้า)
 * แต่ตัวอย่าง: สร้าง 4 แถว Periodic เช่นกัน
 */
exports.getAllPeriodicFifoReport = async (req, res) => {
  const io = req.app.get('io');
  try {
    const histories = await BranchStockHistory.find({}).limit(100).sort({ performed_at: 1 }).lean();

    let totalInQty  = 0;
    let totalInCost = 0;
    let totalOutQty = 0;

    // รวม Purchases / Out ทั้งหมด
    histories.forEach(doc => {
      const items = doc.items || [];
      items.forEach(it => {
        const qty  = it.qty  || 0;
        const cost = it.cost || 0;
        if (doc.change_type === 'IN') {
          totalInQty  += qty;
          totalInCost += (qty * cost);
        } else if (doc.change_type === 'OUT') {
          totalOutQty += qty;
        }
      });
    });

    // Beginning (สมมติ=0)
    let beginningQty   = 0;
    let beginningCost  = 0;
    let beginningValue = 0;

    // Goods Available
    const goodsAvailableQty   = beginningQty + totalInQty;
    const goodsAvailableValue = beginningValue + totalInCost;

    // Ending Qty
    let endingQty = goodsAvailableQty - totalOutQty;
    if (endingQty < 0) endingQty = 0;

    // ตัด totalOutQty ทีเดียวตาม FIFO
    const allBatches = [];
    if (beginningQty > 0) {
      allBatches.push({ qty: beginningQty, cost: beginningCost });
    }
    let costAvgPurchases = (totalInQty > 0) ? (totalInCost / totalInQty) : 0;
    if (totalInQty > 0) {
      allBatches.push({ qty: totalInQty, cost: costAvgPurchases });
    }

    let remainOut = totalOutQty;
    for (let i = 0; i < allBatches.length && remainOut > 0; i++) {
      const batch = allBatches[i];
      if (batch.qty > remainOut) {
        batch.qty -= remainOut;
        remainOut = 0;
      } else {
        remainOut -= batch.qty;
        batch.qty = 0;
      }
    }

    let endingValue = 0;
    allBatches.forEach(b => {
      if (b.qty > 0) {
        endingValue += (b.qty * b.cost);
      }
    });

    const cogs = goodsAvailableValue - endingValue;

    // สร้าง movements 4 แถว
    const movements = [
      {
        date: null,
        activity: 'ยอดยกมา (Beginning)',
        purchaseQty: beginningQty,
        purchaseUnitCost: beginningCost,
        purchaseTotalCost: beginningValue,

        salesQty: 0,
        salesUnitCost: 0,
        salesTotalCost: 0,

        balanceQty: beginningQty,
        balanceTotalCost: beginningValue,
        note: ''
      },
      {
        date: null,
        activity: 'ซื้อ/รับเข้ารวมทั้งงวด',
        purchaseQty: totalInQty,
        purchaseUnitCost: costAvgPurchases,
        purchaseTotalCost: totalInCost,

        salesQty: 0,
        salesUnitCost: 0,
        salesTotalCost: 0,

        balanceQty: goodsAvailableQty,
        balanceTotalCost: goodsAvailableValue,
        note: ''
      },
      {
        date: null,
        activity: 'ขาย/จ่ายออกรวมทั้งงวด',
        purchaseQty: 0,
        purchaseUnitCost: 0,
        purchaseTotalCost: 0,

        salesQty: totalOutQty,
        salesUnitCost: 0,
        salesTotalCost: 0,

        balanceQty: endingQty,
        balanceTotalCost: endingValue,
        note: ''
      },
      {
        date: null,
        activity: 'ยอดคงเหลือ (Ending)',
        purchaseQty: 0,
        purchaseUnitCost: 0,
        purchaseTotalCost: 0,

        salesQty: 0,
        salesUnitCost: 0,
        salesTotalCost: 0,

        balanceQty: endingQty,
        balanceTotalCost: endingValue,
        note: `COGS = ${cogs}`
      }
    ];

    const result = {
      beginningQty,
      totalInQty,
      totalOutQty,
      goodsAvailableQty,
      endingQty,
      endingValue,
      cogs,
      movements
    };

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('getAllPeriodicFifoReport error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
