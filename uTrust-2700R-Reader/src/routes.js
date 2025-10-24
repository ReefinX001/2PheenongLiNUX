const express = require('express');
const router = express.Router();

// Import services
const cardReaderService = require('./services/card-reader-service');

/**
 * API Routes for uTrust 2700 R Card Reader Service
 */

// Get reader status
router.get('/status', async (req, res) => {
  try {
    const status = cardReaderService.getStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Read card data
router.post('/read-card', async (req, res) => {
  try {
    const cardData = await cardReaderService.readCard();
    res.json({
      success: true,
      data: cardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get service configuration
router.get('/config', async (req, res) => {
  try {
    const config = require('./config/config-manager');
    const configData = {
      service: {
        name: config.get('service.name'),
        port: config.get('service.port'),
        version: require('../package.json').version
      },
      cardReader: {
        model: config.get('cardReader.model'),
        manufacturer: config.get('cardReader.manufacturer'),
        supportedCards: config.get('cardReader.supportedCards')
      },
      branch: config.getCurrentBranch()
    };

    res.json({
      success: true,
      data: configData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Reset metrics
router.post('/metrics/reset', async (req, res) => {
  try {
    cardReaderService.resetMetrics();
    res.json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get metrics
router.get('/metrics', async (req, res) => {
  try {
    const metrics = cardReaderService.getMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;