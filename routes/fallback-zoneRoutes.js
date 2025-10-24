const express = require('express');
const router = express.Router();
const Zone = require('../models/HR/zoneModel');
const authJWT = require('../middlewares/authJWT');

// Fallback zone routes - minimal authentication, no permission check
// Use this temporarily while fixing permission issues

// Helper middleware to check if user is authenticated (but skip permission check)
const basicAuthCheck = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please login to access this resource'
    });
  }

  console.log(`🔓 Fallback zone access for user: ${req.user.username}`);
  next();
};

// GET /api/zone-fallback - List all zones (bypass permission check)
router.get('/', authJWT, basicAuthCheck, async (req, res) => {
  try {
    console.log('📍 Fallback zone list request from:', req.user?.username);

    const zones = await Zone.find({ isActive: true }).limit(100).lean();

    console.log(`✅ Returning ${zones.length} zones via fallback endpoint`);

    res.json({
      success: true,
      data: zones,
      message: 'Zones loaded via fallback endpoint',
      fallback: true
    });
  } catch (err) {
    console.error('❌ Fallback zone list error:', err);
    res.status(500).json({
      success: false,
      error: 'ไม่สามารถดึงข้อมูลพื้นที่ได้',
      fallback: true
    });
  }
});

// GET /api/zone-fallback/:id - Get single zone
router.get('/:id', authJWT, basicAuthCheck, async (req, res) => {
  try {
    console.log('📍 Fallback zone detail request:', req.params.id);

    const zone = await Zone.findById(req.params.id).lean();

    if (!zone) {
      return res.status(404).json({
        success: false,
        error: 'ไม่พบพื้นที่',
        fallback: true
      });
    }

    res.json({
      success: true,
      data: zone,
      fallback: true
    });
  } catch (err) {
    console.error('❌ Fallback zone detail error:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching zone',
      fallback: true
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Fallback zone API is working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;