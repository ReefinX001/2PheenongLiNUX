// File: routes/costsExpensesRoutes.js

const express = require('express');
const router = express.Router();
const authJWT = require('../middlewares/authJWT');
const CostsExpensesController = require('../controllers/costsExpensesController');

// —————————————— Costs & Expenses API ——————————————

// GET /api/costs-expenses - ดึงข้อมูลต้นทุนและค่าใช้จ่าย
router.get(
  '/',
  authJWT,
  (req, res, next) => CostsExpensesController.getCostsExpenses(req, res, next)
);

// POST /api/costs-expenses - เพิ่มรายการต้นทุนและค่าใช้จ่ายใหม่
router.post(
  '/',
  authJWT,
  (req, res, next) => CostsExpensesController.addCostExpense(req, res, next)
);

// DELETE /api/costs-expenses/:id - ลบรายการต้นทุนและค่าใช้จ่าย
router.delete(
  '/:id',
  authJWT,
  (req, res, next) => CostsExpensesController.deleteCostExpense(req, res, next)
);

// GET /api/costs-expenses/summary - ดึงข้อมูลสรุปต้นทุนและค่าใช้จ่าย
router.get(
  '/summary',
  authJWT,
  (req, res, next) => CostsExpensesController.getSummary(req, res, next)
);

// GET /api/costs-expenses/export - ส่งออกรายงานต้นทุนและค่าใช้จ่าย
router.get(
  '/export',
  authJWT,
  (req, res, next) => CostsExpensesController.exportCostsExpenses(req, res, next)
);

// —————————————— Debt Collection Costs API ——————————————

// GET /api/costs-expenses/debt-collection - ดึงข้อมูลต้นทุนการติดตามหนี้
router.get(
  '/debt-collection',
  authJWT,
  (req, res, next) => CostsExpensesController.getDebtCollectionCosts(req, res, next)
);

// POST /api/costs-expenses/debt-collection - เพิ่มต้นทุนการติดตามหนี้
router.post(
  '/debt-collection',
  authJWT,
  (req, res, next) => CostsExpensesController.addDebtCollectionCost(req, res, next)
);

// GET /api/costs-expenses/debt-collection/summary - สรุปต้นทุนการติดตามหนี้
router.get(
  '/debt-collection/summary',
  authJWT,
  (req, res, next) => CostsExpensesController.getDebtCollectionSummary(req, res, next)
);

// GET /api/costs-expenses/contract/:contractId - ดึงต้นทุนทั้งหมดที่เกี่ยวข้องกับสัญญา
router.get(
  '/contract/:contractId',
  authJWT,
  (req, res, next) => CostsExpensesController.getContractCosts(req, res, next)
);

module.exports = router;