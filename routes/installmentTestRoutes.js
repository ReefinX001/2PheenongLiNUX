
// Debug route for installment testing
const express = require('express');
const router = express.Router();

// Test endpoint - no auth required
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Installment API is working',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/installment/create',
      'GET /api/installment/test'
    ]
  });
});

// Simple create endpoint for testing
router.post('/create', async (req, res) => {
  console.log('📥 Received installment create request');
  console.log('Body:', JSON.stringify(req.body, null, 2));

  // Return success for testing
  res.json({
    success: true,
    message: 'Installment contract created (test mode)',
    data: {
      contractNumber: 'INST' + Date.now(),
      status: 'created'
    }
  });
});

module.exports = router;
