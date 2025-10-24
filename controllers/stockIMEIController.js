const BranchStock = require('../models/POS/BranchStock');

/**
 * ตรวจสอบและอัพเดทสต๊อกสำหรับสินค้าประเภท IMEI
 * สำหรับสินค้าประเภท IMEI จะไม่มีการนับจำนวน แต่จะเปลี่ยน status เป็น inactive แทน
 */
exports.checkAndUpdateIMEIStock = async (req, res) => {
  const io = req.app.get('io');

  try {
    console.log('🔍 IMEI Stock Update Request:', new Date().toISOString());
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

    const { items, branch_code, checkOnly = false } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุรายการสินค้า'
      });
    }

    if (!branch_code) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุรหัสสาขา'
      });
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;
    const failedItems = [];

    for (const item of items) {
      const { product_id, imei, quantity } = item;

      if (!product_id) {
        results.push({
          product_id,
          imei,
          success: false,
          error: 'ไม่ระบุ product_id'
        });
        failedCount++;
        continue;
      }

      try {
        // ค้นหาสินค้าด้วย IMEI หรือ product_id
        let query = {
          branch_code,
          status: 'active'
        };

        if (imei) {
          // ถ้ามี IMEI ให้ค้นหาด้วย IMEI หรือ barcode
          query.$or = [
            { imei: imei },
            { barcode: imei }
          ];
        } else {
          // ถ้าไม่มี IMEI ให้ค้นหาด้วย product_id
          query._id = product_id;
        }

        console.log(`🔍 Searching BranchStock with query:`, query);

        const stock = await BranchStock.findOne(query);

        if (!stock) {
          const errorMsg = imei
            ? `ไม่พบสินค้า IMEI: ${imei} ในสต๊อก`
            : `ไม่พบสินค้า ID: ${product_id} ในสต๊อก`;

          results.push({
            product_id,
            imei,
            success: false,
            error: errorMsg
          });
          failedCount++;
          failedItems.push({
            product_id,
            imei,
            error: errorMsg
          });
          continue;
        }

        // ตรวจสอบว่าสินค้าพร้อมขายหรือไม่
        if (stock.status !== 'active') {
          const errorMsg = `สินค้า ${stock.name} (${stock.imei || stock.barcode}) ไม่พร้อมขาย (status: ${stock.status})`;
          results.push({
            product_id: stock._id,
            imei: stock.imei || stock.barcode,
            name: stock.name,
            success: false,
            error: errorMsg
          });
          failedCount++;
          failedItems.push({
            product_id: stock._id,
            imei: stock.imei || stock.barcode,
            error: errorMsg
          });
          continue;
        }

        // ถ้าเป็น checkOnly ไม่ต้องอัพเดท
        if (checkOnly) {
          results.push({
            product_id: stock._id,
            imei: stock.imei || stock.barcode,
            name: stock.name,
            success: true,
            available: true,
            message: 'สินค้าพร้อมขาย'
          });
          successCount++;
        } else {
          // อัพเดท status เป็น inactive (ขายแล้ว)
          stock.status = 'inactive';
          stock.pending = false;
          stock.verified = true;
          stock.last_updated = new Date();

          await stock.save();

          console.log(`✅ Updated stock status to inactive for: ${stock.name} (${stock.imei || stock.barcode})`);

          results.push({
            product_id: stock._id,
            imei: stock.imei || stock.barcode,
            name: stock.name,
            success: true,
            message: 'ตัดสต๊อกสำเร็จ'
          });
          successCount++;

          // ส่งข้อมูลผ่าน Socket.IO
          if (io) {
            io.emit('stockUpdated', {
              id: stock._id,
              product_id: stock._id,
              imei: stock.imei || stock.barcode,
              name: stock.name,
              status: 'inactive'
            });
          }
        }

      } catch (itemError) {
        console.error(`Error processing item ${product_id}:`, itemError);
        results.push({
          product_id,
          imei,
          success: false,
          error: 'เกิดข้อผิดพลาดในการประมวลผล'
        });
        failedCount++;
      }
    }

    // ถ้ามีรายการที่ล้มเหลวและไม่ใช่ checkOnly mode
    if (failedCount > 0 && !checkOnly) {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถตัดสต๊อกได้',
        data: {
          summary: {
            total: results.length,
            success: successCount,
            failed: failedCount,
            checkOnly: checkOnly
          },
          results: results,
          failedItems: failedItems
        },
        message: failedItems.map(item => `• สินค้า ID: ${item.product_id}${item.imei ? ` (${item.imei})` : ''} - ${item.error}`).join('\n')
      });
    }

    return res.json({
      success: true,
      data: {
        summary: {
          total: results.length,
          success: successCount,
          failed: failedCount,
          checkOnly: checkOnly
        },
        results: results
      },
      message: checkOnly
        ? `ตรวจสอบสต๊อกสำเร็จ ${successCount} รายการ${failedCount > 0 ? ` (ล้มเหลว ${failedCount} รายการ)` : ' (พร้อมขาย)'}`
        : `ตัดสต๊อกสำเร็จทั้งหมด ${successCount} รายการ`
    });

  } catch (err) {
    console.error('❌ checkAndUpdateIMEIStock error:', err);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบสต๊อก',
      details: err.message
    });
  }
};