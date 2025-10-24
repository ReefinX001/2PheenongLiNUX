// routes/system/configRoutes.js
const express = require('express');
const router = express.Router();
const authJWT = require('../../middlewares/authJWT');

/**
 * GET /api/config/firebase
 * Returns Firebase configuration for authenticated users only
 * Implements security best practices:
 * - Authentication required
 * - Minimal config exposure (only client-safe values)
 * - No sensitive server-side keys
 */
router.get('/firebase', authJWT, (req, res) => {
  try {
    // Only return client-safe Firebase configuration
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };

    // Check if Firebase is configured
    const isConfigured = Object.values(firebaseConfig).every(value => value && value.trim());

    if (!isConfigured) {
      return res.status(503).json({
        success: false,
        error: 'Firebase configuration incomplete',
        firebase: {
          enabled: false,
          reason: 'Configuration missing or incomplete'
        }
      });
    }

    res.json({
      success: true,
      firebase: {
        enabled: true,
        config: firebaseConfig
      }
    });

  } catch (error) {
    console.error('Firebase config error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      firebase: {
        enabled: false,
        reason: 'Server configuration error'
      }
    });
  }
});

/**
 * GET /api/config/client
 * Returns general client configuration
 */
router.get('/client', authJWT, (req, res) => {
  try {
    const clientConfig = {
      features: {
        firebase: !!(process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID),
        googleMaps: !!process.env.GOOGLE_MAPS_API_KEY,
        emailNotifications: process.env.ENABLE_EMAIL_AUTOMATION === 'true'
      },
      company: {
        name: process.env.COMPANY_NAME || 'บริษัท 2พี่น้อง โมบายจำกัด',
        phone: process.env.COMPANY_PHONE || '09-2427-0769',
        email: process.env.COMPANY_EMAIL || '2brother94000@gmail.com'
      },
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({
      success: true,
      config: clientConfig
    });

  } catch (error) {
    console.error('Client config error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;