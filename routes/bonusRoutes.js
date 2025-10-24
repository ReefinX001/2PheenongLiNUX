// routes/bonusRoutes.js
const express = require('express');
const router = express.Router();
const bonusController = require('../controllers/hr/bonusController');
const auth = require('../middlewares/authJWT');
const hasPermission = require('../middlewares/permission');

// Add debug middleware
router.use((req, res, next) => {
  console.log(`📍 Bonus Route: ${req.method} ${req.path}`);
  next();
});

// Routes for bonus management (no auth for testing)
router.get('/', bonusController.getAllBonuses);
router.get('/summary', bonusController.getBonusSummary);
router.get('/:id', bonusController.getBonusById);
router.post('/', bonusController.createBonus);
router.put('/:id', bonusController.updateBonus);
router.delete('/:id', bonusController.deleteBonus);

module.exports = router;
