const BranchStock = require('../models/POS/BranchStock');
const Branch = require('../models/Account/Branch');

/**
 * ค้นหาสต๊อกของสินค้าภายในสาขา โดยใช้ `branch_code`
 * @param {string} branch_code - รหัสสาขา เช่น "PTN01"
 * @param {string} product_id - `_id` ของสินค้าที่ต้องการค้นหา
 * @returns {Promise<object|null>}
 */
async function findStockByBranch(branch_code, product_id) {
  try {
    console.log(`🔍 ค้นหา branch_id จาก branch_code: ${branch_code}`);

    // ✅ แปลง `branch_code` เป็น `_id`
    const branch = await Branch.findOne({ branch_code: branch_code });

    if (!branch) {
      console.log(`❌ ไม่พบสาขา branch_code (${branch_code})`);
      return null;
    }

    console.log(`✅ พบ branch_id: ${branch._id}`);

    // ✅ ค้นหาสต๊อกของสินค้าสำหรับสาขานั้น
    const stock = await BranchStock.findOne({
      branch_id: branch._id,
      product_id: product_id
    });

    if (!stock) {
      console.log(`❌ ไม่พบสินค้านี้ (${product_id}) ในสต๊อกของสาขา (${branch_code})`);
      return null;
    }

    console.log(`✅ พบสินค้า: ${stock.product_id} ในสต๊อกของสาขา (${branch_code})`);
    return stock;

  } catch (error) {
    console.error('❌ Error ในการค้นหาสต๊อก:', error);
    return null;
  }
}

module.exports = { findStockByBranch };
