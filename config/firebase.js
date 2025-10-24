/**
 * Firebase Configuration - Secure Firebase setup
 * การกำหนดค่า Firebase แบบปลอดภัย
 */

const { AppError } = require('../utils/error-handler');

// Firebase configuration from environment variables
const getFirebaseConfig = () => {
  const requiredEnvVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_DATABASE_URL',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID'
  ];

  // Check if all required environment variables are present
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new AppError(
      `Missing Firebase environment variables: ${missingVars.join(', ')}`,
      500,
      'CONFIG_ERROR'
    );
  }

  return {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID // Optional
  };
};

// Validate Firebase configuration
const validateFirebaseConfig = (config) => {
  // Basic validation patterns
  const validations = {
    apiKey: /^[A-Za-z0-9_-]+$/,
    authDomain: /^[a-zA-Z0-9-]+\.firebaseapp\.com$/,
    databaseURL: /^https:\/\/[a-zA-Z0-9-]+-default-rtdb\.[a-zA-Z0-9-]+\.firebasedatabase\.app$/,
    projectId: /^[a-z0-9-]+$/,
    storageBucket: /^[a-z0-9-]+\.appspot\.com$/,
    messagingSenderId: /^\d+$/,
    appId: /^1:\d+:web:[a-f0-9]+$/
  };

  for (const [key, pattern] of Object.entries(validations)) {
    if (config[key] && !pattern.test(config[key])) {
      throw new AppError(
        `Invalid Firebase configuration for ${key}`,
        500,
        'CONFIG_VALIDATION_ERROR'
      );
    }
  }

  return true;
};

// Get Firebase config for client-side use (excluding sensitive data)
const getClientFirebaseConfig = () => {
  const config = getFirebaseConfig();

  // Validate configuration
  validateFirebaseConfig(config);

  // Return config for client-side use
  // Note: These values are safe to expose to client-side
  return {
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    databaseURL: config.databaseURL,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
    measurementId: config.measurementId
  };
};

// Middleware to inject Firebase config into templates
const injectFirebaseConfig = (req, res, next) => {
  try {
    // Add Firebase config to response locals so it's available in templates
    res.locals.firebaseConfig = getClientFirebaseConfig();

    // Also make it available as JSON for script tags
    res.locals.firebaseConfigJSON = JSON.stringify(res.locals.firebaseConfig);

    next();
  } catch (error) {
    console.error('❌ Firebase config injection failed:', error.message);
    next(error);
  }
};

// Firebase config endpoint (for AJAX requests)
const getFirebaseConfigEndpoint = (req, res) => {
  try {
    const config = getClientFirebaseConfig();

    res.json({
      success: true,
      config: config
    });
  } catch (error) {
    console.error('❌ Firebase config endpoint error:', error.message);
    res.status(500).json({
      success: false,
      message: 'ไม่สามารถโหลดการกำหนดค่า Firebase ได้',
      code: 'FIREBASE_CONFIG_ERROR'
    });
  }
};

// Check Firebase connection health
const checkFirebaseHealth = async () => {
  try {
    const config = getFirebaseConfig();

    // Basic health check - validate config exists and is properly formatted
    validateFirebaseConfig(config);

    return {
      status: 'healthy',
      service: 'firebase',
      timestamp: new Date().toISOString(),
      projectId: config.projectId
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      service: 'firebase',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = {
  getFirebaseConfig,
  getClientFirebaseConfig,
  validateFirebaseConfig,
  injectFirebaseConfig,
  getFirebaseConfigEndpoint,
  checkFirebaseHealth
};