const express = require('express');
const router  = express.Router();
const authJWT = require('../middlewares/authJWT');
const InstallmentCustomer = require('../models/Installment/InstallmentCustomer');

router.get('/bad-debt/stats', authJWT, async (req, res) => {
  try {
    const totalCustomers  = await InstallmentCustomer.countDocuments();
    const badCount        = await InstallmentCustomer.countDocuments({ status: 'bad' });
    const doubtfulCount   = await InstallmentCustomer.countDocuments({ status: 'doubtful' });
    const badDebtPct      = totalCustomers ? (badCount    / totalCustomers * 100).toFixed(1) : 0;
    const doubtfulDebtPct = totalCustomers ? (doubtfulCount/ totalCustomers * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        badDebtPct:      parseFloat(badDebtPct),
        doubtfulDebtPct: parseFloat(doubtfulDebtPct)
      }
    });
  } catch (err) {
    console.error('Bad debt stats error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
