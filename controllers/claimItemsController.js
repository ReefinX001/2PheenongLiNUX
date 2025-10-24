const ClaimItem = require('../models/ClaimItem');

// GET /api/loan/claim-items/list
exports.getClaimItems = async (req, res) => {
  try {
    const items = await ClaimItem.find().lean();
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};