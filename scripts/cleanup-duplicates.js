const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
const connectDB = require('../config/db');

async function cleanupDuplicates() {
  try {
    console.log('🧹 เริ่มทำความสะอาดรายการซ้ำและ sync hasReceiptVoucher flag...\n');

    // เชื่อมต่อฐานข้อมูล
    await connectDB();
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ\n');

    const ReceiptVoucher = require('../models/POS/ReceiptVoucher');
    const BranchStockHistory = require('../models/POS/BranchStockHistory');

    // 1. หาใบสำคัญรับเงินที่ซ้ำกัน
    console.log('🔍 ตรวจสอบใบสำคัญรับเงินที่ซ้ำกัน...');
    const duplicateGroups = await ReceiptVoucher.aggregate([
      {
        $group: {
          _id: '$reference.invoiceNumber',
          count: { $sum: 1 },
          docs: { $push: { id: '$_id', docNumber: '$documentNumber', createdAt: '$createdAt' } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    if (duplicateGroups.length > 0) {
      console.log(`📋 พบใบสำคัญรับเงินซ้ำ ${duplicateGroups.length} กลุ่ม:`);

      let deletedCount = 0;
      for (const group of duplicateGroups) {
        console.log(`\n   Invoice: ${group._id}`);
        // เรียงตาม createdAt แล้วเก็บอันแรก ลบอันที่เหลือ
        const sortedDocs = group.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const keepDoc = sortedDocs[0];
        const deleteIds = sortedDocs.slice(1).map(doc => doc.id);

        console.log(`   - เก็บ: ${keepDoc.docNumber} (${new Date(keepDoc.createdAt).toLocaleString('th-TH')})`);

        for (const deleteId of deleteIds) {
          const deleteDoc = sortedDocs.find(d => d.id.toString() === deleteId.toString());
          console.log(`   - ลบ: ${deleteDoc.docNumber} (${new Date(deleteDoc.createdAt).toLocaleString('th-TH')})`);
          await ReceiptVoucher.findByIdAndDelete(deleteId);
          deletedCount++;
        }
      }

      console.log(`\n✅ ลบใบสำคัญรับเงินซ้ำ ${deletedCount} รายการ`);
    } else {
      console.log('✅ ไม่พบใบสำคัญรับเงินซ้ำ');
    }

    // 2. Sync hasReceiptVoucher flag
    console.log('\n🔄 Sync hasReceiptVoucher flag...');

    // หา BranchStockHistory ที่ยังไม่มี flag แต่มีใบสำคัญรับเงินแล้ว
    const historyWithoutFlag = await BranchStockHistory.find({
      $or: [
        { hasReceiptVoucher: { $ne: true } },
        { hasReceiptVoucher: { $exists: false } }
      ]
    }).limit(100);

    console.log(`📋 ตรวจสอบ ${historyWithoutFlag.length} รายการ...`);

    let syncCount = 0;
    for (const history of historyWithoutFlag) {
      // หาใบสำคัญรับเงินที่เกี่ยวข้อง
      const receipt = await ReceiptVoucher.findOne({
        $or: [
          { 'reference.branchStockHistoryId': history._id },
          { 'reference.invoiceNumber': history.invoice_no },
          { notes: { $regex: history.invoice_no || '', $options: 'i' } }
        ]
      });

      if (receipt) {
        // อัพเดท flag
        await BranchStockHistory.findByIdAndUpdate(history._id, {
          hasReceiptVoucher: true,
          receiptVoucherId: receipt._id,
          receiptVoucherCreatedAt: receipt.createdAt
        });

        console.log(`   ✅ Synced ${history.invoice_no} -> ${receipt.documentNumber}`);
        syncCount++;
      }
    }

    console.log(`\n✅ Sync ${syncCount} รายการสำเร็จ`);

    // 3. หารายการที่มี flag แต่ไม่มีใบสำคัญรับเงิน
    console.log('\n🔍 ตรวจสอบรายการที่มี flag แต่ไม่มีใบสำคัญรับเงิน...');
    const historyWithFlag = await BranchStockHistory.find({
      hasReceiptVoucher: true
    }).limit(50);

    let cleanupCount = 0;
    for (const history of historyWithFlag) {
      const receipt = await ReceiptVoucher.findOne({
        $or: [
          { _id: history.receiptVoucherId },
          { 'reference.branchStockHistoryId': history._id },
          { 'reference.invoiceNumber': history.invoice_no }
        ]
      });

      if (!receipt) {
        // ไม่พบใบสำคัญรับเงิน ให้รีเซ็ต flag
        await BranchStockHistory.findByIdAndUpdate(history._id, {
          $unset: {
            hasReceiptVoucher: 1,
            receiptVoucherId: 1,
            receiptVoucherCreatedAt: 1
          }
        });

        console.log(`   🔄 Reset flag for ${history.invoice_no} (no receipt found)`);
        cleanupCount++;
      }
    }

    console.log(`\n✅ รีเซ็ต flag ${cleanupCount} รายการ`);

    // 4. สรุปผล
    console.log('\n📊 สรุปผลการทำความสะอาด:');
    const totalReceipts = await ReceiptVoucher.countDocuments({});
    const totalHistory = await BranchStockHistory.countDocuments({});
    const historyWithReceipts = await BranchStockHistory.countDocuments({ hasReceiptVoucher: true });

    console.log(`   - ใบสำคัญรับเงินทั้งหมด: ${totalReceipts} ใบ`);
    console.log(`   - BranchStockHistory ทั้งหมด: ${totalHistory} รายการ`);
    console.log(`   - มี hasReceiptVoucher: ${historyWithReceipts} รายการ`);
    console.log(`   - ยังไม่มี hasReceiptVoucher: ${totalHistory - historyWithReceipts} รายการ`);

    console.log('\n🎉 การทำความสะอาดเสร็จสิ้น!');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    process.exit(0);
  }
}

// เรียกใช้
if (require.main === module) {
  cleanupDuplicates();
}

module.exports = cleanupDuplicates;
