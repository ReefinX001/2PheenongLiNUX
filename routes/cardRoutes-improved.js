// routes/cardRoutes-improved.js
// ปรับปรุงการจัดการข้อผิดพลาดของ Card Reader Service
// Created: 2025-07-08 เพื่อแก้ไขปัญหา HTTP 500 Error

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Import Error Handler
const { CardReaderErrorHandler } = require('../card-reader-error-handler');
const errorHandler = new CardReaderErrorHandler();

// Cache สำหรับ branch config และ health status
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Performance settings
const PARALLEL_LIMIT = 3; // ลดจาก 5 เหลือ 3 เพื่อลดโหลด
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds timeout

// โหลด branch configuration พร้อม caching
function loadBranchConfig() {
  const cacheKey = 'branch_config';
  const cached = cache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  try {
    const branchPath = path.join(__dirname, '../uTrust-2700R-Reader/config/branches.json');
    if (fs.existsSync(branchPath)) {
      const config = JSON.parse(fs.readFileSync(branchPath, 'utf8'));

      // Cache the result
      cache.set(cacheKey, {
        data: config,
        timestamp: Date.now()
      });

      console.log(`✅ Loaded ${Object.keys(config.branches).length} branches from config`);
      return config;
    }

    throw new Error('Branch configuration file not found');

  } catch (error) {
    console.error('❌ Error loading branch config:', error.message);
    return null;
  }
}

// ตรวจสอบ Branch จาก IP, branch code, หรือ session
function detectCurrentBranch(req) {
  try {
    const branchConfig = loadBranchConfig();
    if (!branchConfig) return null;

    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const branchCode = req.headers['x-branch-code'] || req.query.branch_code || req.body.branch_code;

    console.log(`🔍 Client IP: ${clientIP}, Branch Code: ${branchCode}`);

    // Priority 1: Branch code ที่ระบุมาชัดเจน
    if (branchCode) {
      const branch = Object.values(branchConfig.branches).find(b =>
        b.branch_code === branchCode
      );
      if (branch && branch.active) {
        console.log(`🎯 Branch detected by code: ${branch.name} (${branch.branch_code})`);
        return branch;
      }
    }

    // Priority 2: IP Address matching
    if (clientIP) {
      const cleanIP = clientIP.replace(/::ffff:/, '').replace(/::1/, '127.0.0.1');
      const branch = Object.values(branchConfig.branches).find(b =>
        b.clientIP === cleanIP || b.serverIP === cleanIP
      );
      if (branch && branch.active) {
        console.log(`🌐 Branch detected by IP: ${branch.name} (${cleanIP})`);
        return branch;
      }
    }

    // Priority 3: Default fallback
    const fallbackBranch = branchConfig.branches[branchConfig.currentBranch?.fallback || 'headquarters'];
    if (fallbackBranch && fallbackBranch.active) {
      console.log(`🏠 Using fallback branch: ${fallbackBranch.name}`);
      return fallbackBranch;
    }

    // Priority 4: First active branch
    const firstActiveBranch = Object.values(branchConfig.branches).find(b => b.active);
    if (firstActiveBranch) {
      console.log(`⚡ Using first active branch: ${firstActiveBranch.name}`);
      return firstActiveBranch;
    }

    return null;

  } catch (error) {
    console.error('❌ Error detecting branch:', error.message);
    return null;
  }
}

// ❤️ ฟังก์ชันตรวจสอบ health ทุกสาขาพร้อมกัน (parallel processing)
async function checkAllBranchesHealth() {
  const branchConfig = loadBranchConfig();
  if (!branchConfig) return {};

  const activeBranches = Object.entries(branchConfig.branches)
    .filter(([_, branch]) => branch.active && branch.features?.cardReader);

  const results = {};

  // แบ่งเป็น batch เพื่อไม่ให้ overwhelm network
  for (let i = 0; i < activeBranches.length; i += PARALLEL_LIMIT) {
    const batch = activeBranches.slice(i, i + PARALLEL_LIMIT);

    const batchPromises = batch.map(async ([key, branch]) => {
      try {
        const status = await errorHandler.checkCardReaderHealth(branch.cardReaderServerUrl, branch.branch_code);
        return { key, branch, status };
      } catch (error) {
        console.error(`❌ Health check failed for ${branch.name}:`, error.message);
        return {
          key,
          branch,
          status: {
            running: false,
            status: 'error',
            error: error.message
          }
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach(({ key, branch, status }) => {
      results[key] = {
        ...branch,
        serviceStatus: status,
        lastChecked: new Date().toISOString()
      };
    });
  }

  return results;
}

// 🔧 ฟังก์ชัน readCardFromBranch ด้วย Error Handler
async function readCardFromBranchImproved(branch) {
  try {
    if (!branch.features || !branch.features.cardReader) {
      throw new Error(`Card reader is not enabled for branch ${branch.name}`);
    }

    if (!branch.cardReaderServerUrl) {
      throw new Error(`Card reader URL is not configured for branch ${branch.name}`);
    }

    console.log(`🔄 Reading card from ${branch.name} (${branch.branch_code})`);
    console.log(`🌐 Card Reader URL: ${branch.cardReaderServerUrl}`);

    // ใช้ Error Handler แทนการเรียก fetch โดยตรง
    const cardData = await errorHandler.readCardWithErrorHandling(
      branch.cardReaderServerUrl,
      branch.branch_code
    );

    // เพิ่มข้อมูล branch ลงในผลลัพธ์
    if (cardData) {
      cardData.branch_code = branch.branch_code;
      cardData.branch_name = branch.name;
      cardData.card_reader_url = branch.cardReaderServerUrl;
      cardData.read_timestamp = new Date().toISOString();
    }

    return cardData;

  } catch (error) {
    console.error(`❌ Card reading failed for ${branch.name}:`, error.message);

    // ให้ error message ที่ชัดเจนขึ้น
    if (error.message.includes('cooldown')) {
      throw new Error(`Card reader service for ${branch.name} is temporarily unavailable due to recent errors. Please try again in a few minutes.`);
    }

    if (error.message.includes('in progress')) {
      throw new Error(`Another card reading operation is in progress for ${branch.name}. Please wait and try again.`);
    }

    if (error.message.includes('not running')) {
      throw new Error(`Card reader service for ${branch.name} is not running. Please check:\n1. Card reader service is started on ${branch.clientIP}:${branch.port}\n2. Tailscale network is connected\n3. Card reader hardware is connected`);
    }

    throw error;
  }
}

// 🔌 Main POST endpoint - ปรับปรุงแล้ว
router.post('/', async (req, res) => {
  try {
    const cardData = req.body;

    // ถ้ามีข้อมูลบัตรจาก body (วิธีเดิม - รองรับ Local App)
    if (cardData && Object.keys(cardData).length > 0 && cardData.Citizenid) {
      console.log('📱 Server ได้รับข้อมูลบัตรจาก Local App');

      return res.json({
        success: true,
        message: 'รับข้อมูลบัตรเรียบร้อย (POST)',
        data: cardData,
        source: 'Local App'
      });
    }

    // ตรวจสอบ branch และเรียกอ่านบัตรจาก client ที่มี card reader
    console.log('🔌 Reading card from uTrust 2700 R across network...');

    const branch = detectCurrentBranch(req);
    if (!branch) {
      return res.status(400).json({
        success: false,
        error: 'Cannot detect branch configuration. Please ensure you are connected from a registered IP address or specify branch_code parameter.',
        availableBranches: Object.values(loadBranchConfig()?.branches || {})
          .filter(b => b.active)
          .map(b => ({ code: b.branch_code, name: b.name }))
      });
    }

    console.log(`📍 Branch detected: ${branch.name} (${branch.branch_code})`);

    // เรียกใช้ Card Reader service ผ่าน Error Handler
    const cardReaderData = await readCardFromBranchImproved(branch);

    return res.json({
      success: true,
      message: `อ่านบัตรจาก ${branch.name} สำเร็จ`,
      data: cardReaderData,
      source: 'uTrust 2700 R',
      branch: {
        code: branch.branch_code,
        name: branch.name,
        cardReaderUrl: branch.cardReaderServerUrl
      }
    });

  } catch (error) {
    console.error('❌ Card reading error:', error.message);

    // ส่ง error response ที่มีข้อมูลมากขึ้น
    return res.status(500).json({
      success: false,
      error: error.message,
      source: 'uTrust 2700 R',
      timestamp: new Date().toISOString(),
      errorType: error.message.includes('timeout') ? 'timeout' :
                 error.message.includes('cooldown') ? 'cooldown' :
                 error.message.includes('in progress') ? 'concurrent' :
                 error.message.includes('not running') ? 'service_down' : 'unknown'
    });
  }
});

// 🔍 GET endpoint - ปรับปรุงแล้ว
router.get('/', async (req, res) => {
  try {
    const branch = detectCurrentBranch(req);
    if (!branch) {
      return res.status(400).json({
        success: false,
        error: 'Cannot detect branch configuration'
      });
    }

    const cardReaderData = await readCardFromBranchImproved(branch);

    return res.json({
      success: true,
      message: `อ่านบัตรจาก ${branch.name} สำเร็จ`,
      data: cardReaderData,
      source: 'uTrust 2700 R',
      branch: {
        code: branch.branch_code,
        name: branch.name,
        cardReaderUrl: branch.cardReaderServerUrl
      }
    });

  } catch (error) {
    console.error('❌ Card reading error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 📊 Status endpoint - ปรับปรุงแล้ว
router.get('/status', async (req, res) => {
  try {
    const branch = detectCurrentBranch(req);
    if (!branch) {
      return res.status(400).json({
        success: false,
        error: 'Cannot detect branch configuration'
      });
    }

    const serviceStatus = await errorHandler.checkCardReaderHealth(branch.cardReaderServerUrl, branch.branch_code);
    const errorSummary = errorHandler.getErrorSummary();

    return res.json({
      success: true,
      message: 'Card Reader service status',
      data: {
        ...serviceStatus,
        branch: {
          code: branch.branch_code,
          name: branch.name,
          cardReaderUrl: branch.cardReaderServerUrl
        },
        errorSummary: errorSummary.details[branch.branch_code] || null
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🏢 Branches endpoint - ปรับปรุงแล้ว
router.get('/branches', async (req, res) => {
  try {
    console.log('🔍 Checking all branches health status...');

    const branchStatus = await checkAllBranchesHealth();
    const errorSummary = errorHandler.getErrorSummary();

    const summary = {
      totalBranches: Object.keys(branchStatus).length,
      activeBranches: Object.values(branchStatus).filter(b => b.active).length,
      healthyServices: Object.values(branchStatus).filter(b => b.serviceStatus?.running).length,
      unhealthyServices: Object.values(branchStatus).filter(b => !b.serviceStatus?.running).length,
      branchesWithErrors: errorSummary.branchesWithErrors,
      branchesInCooldown: errorSummary.branchesInCooldown
    };

    return res.json({
      success: true,
      message: 'All branches card reader status',
      data: branchStatus,
      summary,
      errorSummary: errorSummary.details
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🎯 Branch specific endpoint - ปรับปรุงแล้ว
router.post('/branch/:branchCode', async (req, res) => {
  try {
    const { branchCode } = req.params;
    const branchConfig = loadBranchConfig();

    if (!branchConfig) {
      throw new Error('Cannot load branch configuration');
    }

    const branch = Object.values(branchConfig.branches).find(b =>
      b.branch_code === branchCode && b.active
    );

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: `Branch ${branchCode} not found or not active`,
        availableBranches: Object.values(branchConfig.branches)
          .filter(b => b.active)
          .map(b => ({ code: b.branch_code, name: b.name }))
      });
    }

    console.log(`🎯 Reading card from specific branch: ${branch.name} (${branch.branch_code})`);

    const cardReaderData = await readCardFromBranchImproved(branch);

    return res.json({
      success: true,
      message: `อ่านบัตรจาก ${branch.name} สำเร็จ`,
      data: cardReaderData,
      source: 'uTrust 2700 R',
      branch: {
        code: branch.branch_code,
        name: branch.name,
        cardReaderUrl: branch.cardReaderServerUrl
      }
    });

  } catch (error) {
    console.error('❌ Specific branch card reading error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🔧 Debug endpoint - ใหม่
router.get('/debug', async (req, res) => {
  try {
    const branch = detectCurrentBranch(req);
    const errorSummary = errorHandler.getErrorSummary();
    const branchConfig = loadBranchConfig();

    return res.json({
      success: true,
      message: 'Debug information',
      data: {
        detectedBranch: branch,
        errorSummary,
        branchConfig: branchConfig?.branches || null,
        clientInfo: {
          ip: req.ip,
          headers: req.headers,
          userAgent: req.get('User-Agent')
        }
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;