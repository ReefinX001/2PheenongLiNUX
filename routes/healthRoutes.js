// routes/healthRoutes.js
const express = require('express');
const router = express.Router();

// Simple health check endpoint
router.get('/', (req, res) => {
  try {
    // Basic health check - just return OK status
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'Server is running normally'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check with database status (optional)
router.get('/detailed', async (req, res) => {
  try {
    const mongoose = require('mongoose');

    const healthStatus = {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        server: 'healthy',
        database: mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy'
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    };

    // If database is not connected, mark as unhealthy
    if (mongoose.connection.readyState !== 1) {
      healthStatus.success = false;
      healthStatus.status = 'unhealthy';
    }

    res.status(healthStatus.success ? 200 : 503).json(healthStatus);

  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
