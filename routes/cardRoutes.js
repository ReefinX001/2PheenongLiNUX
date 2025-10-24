// routes/cardRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Cache สำหรับ branch config และ health status
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Performance settings
const PARALLEL_LIMIT = 5; // ตรวจสอบพร้อมกันได้สูงสุด 5 สาขา
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

// ตรวจสอบ health status พร้อม caching
async function checkCardReaderService(cardReaderUrl, branchCode) {
  const cacheKey = `health_${branchCode}`;
  const cached = cache.get(cacheKey);

  // ใช้ cache ถ้ายังไม่หมดอายุ
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch(`${cardReaderUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'X-Branch-Code': branchCode
      }
    });

    clearTimeout(timeoutId);

    let result;
    if (response.ok) {
      try {
        const data = await response.json();
        result = {
          running: true,
          status: 'healthy',
          data: data.data || null
        };
      } catch (jsonError) {
        result = {
          running: true,
          status: 'healthy-no-json'
        };
      }
    } else {
      result = {
        running: false,
        status: 'unhealthy',
        statusCode: response.status,
        statusText: response.statusText
      };
    }

    // Cache the result
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;

  } catch (error) {
    const result = {
      running: false,
      status: 'not-running',
      error: error.name === 'AbortError' ? 'timeout' : error.message
    };

    // Cache failed result for shorter time
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
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
      const status = await checkCardReaderService(branch.cardReaderServerUrl, branch.branch_code);
      return { key, branch, status };
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

// 🔧 ฟังก์ชันค้นหา Card Reader ที่ใช้งานได้ (รองรับ IP detection)
async function getAvailableCardReader(branch, req = null) {
  // ตรวจสอบว่ามี cardReaderNodes หรือไม่
  if (branch.cardReaderNodes && Array.isArray(branch.cardReaderNodes)) {
    console.log(`🔍 Checking ${branch.cardReaderNodes.length} card readers for branch ${branch.name}`);

    const activeReaders = branch.cardReaderNodes.filter(reader => reader.active);

    // ดึง client IP จากหลายแหล่งที่เป็นไปได้ (รวมทั้งจาก body ที่ส่งมาจาก frontend)
    let clientIP = 'unknown';

    if (req) {
      // ลำดับความสำคัญ: body > headers > request properties
      if (req.body && req.body.clientIP) {
        clientIP = req.body.clientIP;
        console.log('🎯 Using Client IP from body:', clientIP);
      } else {
        clientIP = req.headers['x-client-ip'] ||
                   req.headers['x-real-ip'] ||
                   req.headers['x-forwarded-for'] ||
                   req.ip ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   'unknown';
        console.log('🌐 Using Client IP from headers/req:', clientIP);
      }
    }

    const cleanClientIP = clientIP.replace(/::ffff:/, '').replace(/::1/, '127.0.0.1');

    // เพิ่ม debug log สำหรับ requested reader
    if (req && req.body && req.body.requestedReader) {
      console.log(`🎯 Frontend requested specific reader: ${req.body.requestedReader} for IP: ${cleanClientIP}`);
    }

    // 🎯 Priority 0: ถ้า frontend ระบุ reader มาชัดเจน และ IP ตรงกัน ให้ใช้ reader นั้นเลย
    if (req && req.body && req.body.requestedReader) {
      const requestedReader = activeReaders.find(reader =>
        reader.nodeId === req.body.requestedReader && reader.clientIP === cleanClientIP
      );

      if (requestedReader) {
        console.log(`🎯 Using frontend-requested reader: ${requestedReader.name} (${requestedReader.clientIP})`);

        try {
          const healthCheck = await checkCardReaderService(requestedReader.cardReaderServerUrl, branch.branch_code);

          if (healthCheck.running) {
            console.log(`✅ Frontend-requested reader is available: ${requestedReader.name}`);
            return requestedReader;
          } else {
            console.log(`❌ Frontend-requested reader unavailable: ${requestedReader.name} - ${healthCheck.status}`);
            console.log(`🔄 Falling back to standard IP matching`);
          }
        } catch (error) {
          console.log(`❌ Error checking frontend-requested reader ${requestedReader.name}: ${error.message}`);
          console.log(`🔄 Falling back to standard IP matching`);
        }
      } else {
        console.log(`⚠️ Frontend-requested reader ${req.body.requestedReader} not found or IP mismatch`);
      }
    }

    // เสมอพยายาม exact IP match ก่อน
    console.log('🎯 Attempting exact IP match for card reader selection');
    console.log(`🔍 Client IP: ${cleanClientIP}`);

    // ค้นหาเครื่องอ่านบัตรที่ match กับ client IP
    const ipMatchedReader = activeReaders.find(reader => {
      const match = reader.clientIP === cleanClientIP;
      console.log(`   🔍 Checking ${reader.name} (${reader.clientIP}) - Match: ${match}`);
      return match;
    });

    if (ipMatchedReader && req) {
      console.log(`🎯 Found IP-matched card reader: ${ipMatchedReader.name} (${ipMatchedReader.clientIP})`);

      // ตรวจสอบว่าเครื่องอ่านบัตรที่ match ทำงานอยู่หรือไม่
      try {
        const healthCheck = await checkCardReaderService(ipMatchedReader.cardReaderServerUrl, branch.branch_code);

        if (healthCheck.running) {
          console.log(`✅ IP-matched card reader available: ${ipMatchedReader.name} at ${ipMatchedReader.location}`);
          return ipMatchedReader;
        } else {
          console.log(`❌ IP-matched card reader unavailable: ${ipMatchedReader.name} - ${healthCheck.status}`);
          console.log(`🔄 Falling back to priority-based selection`);
          // ไม่ return ให้ไปต่อที่ fallback logic
        }
      } catch (error) {
        console.log(`❌ Error checking IP-matched card reader ${ipMatchedReader.name}: ${error.message}`);
        console.log(`🔄 Falling back to priority-based selection`);
        // ไม่ return ให้ไปต่อที่ fallback logic
      }
    } else {
      console.log(`⚠️ No card reader found matching client IP: ${cleanClientIP}`);
      console.log(`🔄 Falling back to priority-based selection`);
    }

    // Smart Fallback: เฉพาะเมื่อจำเป็น
    console.log('⚠️ No exact IP match found, using smart fallback');
    console.log(`🔄 Client IP ${cleanClientIP} does not match any card readers, trying priority-based selection`);
    console.log('📋 Available readers:');
    activeReaders.forEach(reader => {
      console.log(`   - ${reader.name}: ${reader.clientIP} (priority ${reader.priority})`);
    });

    // Final fallback: เรียงลำดับตาม priority
    console.log('🔄 Using priority-based card reader selection as smart fallback');
    const sortedReaders = activeReaders.sort((a, b) => a.priority - b.priority);

    // ตรวจสอบแต่ละเครื่องตาม priority
    for (const reader of sortedReaders) {
      try {
        console.log(`🔍 Checking card reader: ${reader.name} (${reader.clientIP}) - Priority: ${reader.priority}`);

        const healthCheck = await checkCardReaderService(reader.cardReaderServerUrl, branch.branch_code);

        if (healthCheck.running) {
          console.log(`✅ Card reader available: ${reader.name} at ${reader.location}`);
          return reader;
        } else {
          console.log(`❌ Card reader unavailable: ${reader.name} - ${healthCheck.status}`);
        }
      } catch (error) {
        console.log(`❌ Error checking card reader ${reader.name}: ${error.message}`);
      }
    }

    console.log('❌ No available card readers found');
    return null;

  }

  // Fallback ใช้ cardReaderServerUrl แบบเดิม
  console.log(`🔄 Using fallback single card reader for branch ${branch.name}`);
  const healthCheck = await checkCardReaderService(branch.cardReaderServerUrl, branch.branch_code);

  if (!healthCheck.running) {
    throw new Error(`Card reader service is not running at ${branch.cardReaderServerUrl}. Status: ${healthCheck.status}`);
  }

  return {
    nodeId: 'default',
    name: 'Default Card Reader',
    clientIP: branch.clientIP,
    cardReaderServerUrl: branch.cardReaderServerUrl,
    location: branch.name
  };
}

// 🔧 ฟังก์ชัน readCardFromBranch (ปรับปรุงให้รองรับหลาย Card Reader)
async function readCardFromBranch(branch, req = null) {
  try {
    if (!branch.features || !branch.features.cardReader) {
      throw new Error(`Card reader is not enabled for branch ${branch.name}`);
    }

    if (!branch.cardReaderServerUrl && (!branch.cardReaderNodes || branch.cardReaderNodes.length === 0)) {
      throw new Error(`Card reader URL is not configured for branch ${branch.name}`);
    }

    // ค้นหา Card Reader ที่ใช้งานได้ (ส่ง req เพื่อใช้ IP detection)
    const availableReader = await getAvailableCardReader(branch, req);

    if (!availableReader) {
      throw new Error(`No card reader available for your IP address. Please ensure:\n1. You are accessing from a registered client IP\n2. The card reader service is running\n3. Your IP is configured in branches.json`);
    }

    console.log(`🌐 Connecting to: ${availableReader.cardReaderServerUrl}/read-card`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), branch.cardReaderSettings?.timeout || 30000);

    try {
      const response = await fetch(`${availableReader.cardReaderServerUrl}/read-card`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Branch-Code': branch.branch_code,
          'X-Source': 'main-server',
          'X-Reader-Node': availableReader.nodeId
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Card reading failed');
      }

      // เพิ่มข้อมูล branch และ reader ลงในผลลัพธ์
      result.data.branch_code = branch.branch_code;
      result.data.branch_name = branch.name;
      result.data.card_reader_url = availableReader.cardReaderServerUrl;
      result.data.card_reader_node = availableReader.nodeId;
      result.data.card_reader_name = availableReader.name;
      result.data.card_reader_location = availableReader.location;

      // ส่งข้อมูลครบถ้วนกลับไป
      return {
        cardData: result.data,
        selectedReader: availableReader.name,
        cardReaderUsed: {
          nodeId: availableReader.nodeId,
          name: availableReader.name,
          location: availableReader.location,
          clientIP: availableReader.clientIP,
          url: availableReader.cardReaderServerUrl
        }
      };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Card reading timeout for branch ${branch.name}`);
    }

    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch')) {
      throw new Error(`Cannot connect to card reader service. Please ensure:\n1. Card reader service is running\n2. Tailscale network is connected\n3. Firewall allows port 3999`);
    }

    throw error;
  }
}

// 🔌 Main POST endpoint
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
      throw new Error('Cannot detect branch configuration');
    }

    console.log(`📍 Branch detected: ${branch.name} (${branch.branch_code})`);
    console.log(`🌐 Card Reader URL: ${branch.cardReaderServerUrl}`);

    // เรียกใช้ Card Reader service ผ่าน network (ส่ง req เพื่อใช้ IP detection)
    const cardReaderResult = await readCardFromBranch(branch, req);

    // ดึง client IP เพื่อส่งกลับใน response
    const clientIP = req.headers['x-client-ip'] ||
                     req.headers['x-real-ip'] ||
                     req.headers['x-forwarded-for'] ||
                     req.body?.clientIP ||
                     req.ip ||
                     req.connection.remoteAddress ||
                     req.socket.remoteAddress ||
                     'unknown';
    const cleanClientIP = clientIP.replace(/::ffff:/, '').replace(/::1/, '127.0.0.1');

    return res.json({
      success: true,
      message: `อ่านบัตรจาก ${branch.name} สำเร็จ`,
      data: cardReaderResult.cardData || cardReaderResult,
      source: 'uTrust 2700 R',
      branch: {
        code: branch.branch_code,
        name: branch.name,
        cardReaderUrl: branch.cardReaderServerUrl
      },
      selectedReader: cardReaderResult.selectedReader || 'unknown',
      clientIP: cleanClientIP,
      cardReaderUsed: cardReaderResult.cardReaderUsed || null
    });

  } catch (error) {
    console.error('❌ Card reading error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      source: 'uTrust 2700 R'
    });
  }
});

// 🔍 GET endpoint
router.get('/', async (req, res) => {
  try {
    const branch = detectCurrentBranch(req);
    if (!branch) {
      throw new Error('Cannot detect branch configuration');
    }

    const cardReaderResult = await readCardFromBranch(branch, req);

    // ดึง client IP เพื่อส่งกลับใน response
    const clientIP = req.headers['x-client-ip'] ||
                     req.headers['x-real-ip'] ||
                     req.headers['x-forwarded-for'] ||
                     req.body?.clientIP ||
                     req.ip ||
                     req.connection.remoteAddress ||
                     req.socket.remoteAddress ||
                     'unknown';
    const cleanClientIP = clientIP.replace(/::ffff:/, '').replace(/::1/, '127.0.0.1');

    return res.json({
      success: true,
      message: `อ่านบัตรจาก ${branch.name} สำเร็จ`,
      data: cardReaderResult.cardData || cardReaderResult,
      source: 'uTrust 2700 R',
      branch: {
        code: branch.branch_code,
        name: branch.name,
        cardReaderUrl: branch.cardReaderServerUrl
      },
      selectedReader: cardReaderResult.selectedReader || 'unknown',
      clientIP: cleanClientIP,
      cardReaderUsed: cardReaderResult.cardReaderUsed || null
    });

  } catch (error) {
    console.error('❌ Card reading error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 📊 Status endpoint - ตรวจสอบสถานะ branch ปัจจุบัน
router.get('/status', async (req, res) => {
  try {
    const branch = detectCurrentBranch(req);
    if (!branch) {
      return res.status(400).json({
        success: false,
        error: 'Cannot detect branch configuration'
      });
    }

    const serviceStatus = await checkCardReaderService(branch.cardReaderServerUrl, branch.branch_code);

    return res.json({
      success: true,
      message: 'Card Reader service status',
      data: {
        ...serviceStatus,
        branch: {
          code: branch.branch_code,
          name: branch.name,
          cardReaderUrl: branch.cardReaderServerUrl
        }
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🏢 Branches endpoint - ดูสถานะทุกสาขา
router.get('/branches', async (req, res) => {
  try {
    console.log('🔍 Checking all branches health status...');

    const branchStatus = await checkAllBranchesHealth();

    const summary = {
      totalBranches: Object.keys(branchStatus).length,
      activeBranches: Object.values(branchStatus).filter(b => b.active).length,
      healthyServices: Object.values(branchStatus).filter(b => b.serviceStatus?.running).length,
      unhealthyServices: Object.values(branchStatus).filter(b => !b.serviceStatus?.running).length
    };

    return res.json({
      success: true,
      message: 'All branches card reader status',
      data: branchStatus,
      summary
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🎯 Branch specific endpoint - อ่านบัตรจากสาขาที่ระบุ
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
      throw new Error(`Branch ${branchCode} not found or not active`);
    }

    console.log(`🎯 Reading card from specific branch: ${branch.name} (${branch.branch_code})`);

    const cardReaderData = await readCardFromBranch(branch, req);

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
      error: error.message
    });
  }
});

// 🖥️ Card Reader Nodes endpoint - ดูสถานะ Card Reader ทั้งหมดในสาขาปัจจุบัน
router.get('/nodes', async (req, res) => {
  try {
    const branch = detectCurrentBranch(req);
    if (!branch) {
      return res.status(400).json({
        success: false,
        error: 'Cannot detect branch configuration'
      });
    }

    console.log(`🔍 Checking card reader nodes for branch: ${branch.name}`);

    // ตรวจสอบว่ามี cardReaderNodes หรือไม่
    if (!branch.cardReaderNodes || !Array.isArray(branch.cardReaderNodes)) {
      return res.json({
        success: true,
        message: `Branch ${branch.name} uses single card reader`,
        data: {
          multiNodeSupport: false,
          singleReader: {
            nodeId: 'default',
            name: 'Default Card Reader',
            clientIP: branch.clientIP,
            cardReaderServerUrl: branch.cardReaderServerUrl,
            location: branch.name
          }
        },
        branch: {
          code: branch.branch_code,
          name: branch.name
        }
      });
    }

    // ตรวจสอบสถานะ Card Reader แต่ละเครื่อง
    const nodeStatuses = [];

    for (const reader of branch.cardReaderNodes) {
      try {
        const healthCheck = await checkCardReaderService(reader.cardReaderServerUrl, branch.branch_code);

        nodeStatuses.push({
          ...reader,
          serviceStatus: healthCheck,
          lastChecked: new Date().toISOString(),
          isAvailable: healthCheck.running && reader.active
        });

      } catch (error) {
        nodeStatuses.push({
          ...reader,
          serviceStatus: {
            running: false,
            status: 'error',
            error: error.message
          },
          lastChecked: new Date().toISOString(),
          isAvailable: false
        });
      }
    }

    // หา Card Reader ที่ใช้งานได้
    const availableReaders = nodeStatuses.filter(node => node.isAvailable);
    const priorityReader = availableReaders.sort((a, b) => a.priority - b.priority)[0];

    return res.json({
      success: true,
      message: `Card reader nodes status for ${branch.name}`,
      data: {
        multiNodeSupport: true,
        totalNodes: nodeStatuses.length,
        availableNodes: availableReaders.length,
        priorityReader: priorityReader || null,
        nodes: nodeStatuses
      },
      branch: {
        code: branch.branch_code,
        name: branch.name
      }
    });

  } catch (error) {
    console.error('❌ Card reader nodes error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🎯 Specific Card Reader endpoint - อ่านบัตรจาก Card Reader ที่ระบุ
router.post('/node/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const branch = detectCurrentBranch(req);

    if (!branch) {
      return res.status(400).json({
        success: false,
        error: 'Cannot detect branch configuration'
      });
    }

    // ตรวจสอบว่ามี cardReaderNodes หรือไม่
    if (!branch.cardReaderNodes || !Array.isArray(branch.cardReaderNodes)) {
      return res.status(400).json({
        success: false,
        error: `Branch ${branch.name} does not support multiple card readers`
      });
    }

    // ค้นหา Card Reader ที่ระบุ
    const targetReader = branch.cardReaderNodes.find(reader => reader.nodeId === nodeId);

    if (!targetReader) {
      return res.status(404).json({
        success: false,
        error: `Card reader node ${nodeId} not found in branch ${branch.name}`
      });
    }

    if (!targetReader.active) {
      return res.status(400).json({
        success: false,
        error: `Card reader node ${nodeId} is not active`
      });
    }

    console.log(`🎯 Reading card from specific node: ${targetReader.name} (${targetReader.nodeId})`);

    // ตรวจสอบสถานะ Card Reader
    const healthCheck = await checkCardReaderService(targetReader.cardReaderServerUrl, branch.branch_code);

    if (!healthCheck.running) {
      return res.status(503).json({
        success: false,
        error: `Card reader ${targetReader.name} is not running. Status: ${healthCheck.status}`
      });
    }

    // อ่านบัตรจาก Card Reader ที่ระบุ
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), branch.cardReaderSettings?.timeout || 30000);

    try {
      const response = await fetch(`${targetReader.cardReaderServerUrl}/read-card`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Branch-Code': branch.branch_code,
          'X-Source': 'main-server',
          'X-Reader-Node': targetReader.nodeId
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Card reading failed');
      }

      // เพิ่มข้อมูล branch และ reader ลงในผลลัพธ์
      result.data.branch_code = branch.branch_code;
      result.data.branch_name = branch.name;
      result.data.card_reader_url = targetReader.cardReaderServerUrl;
      result.data.card_reader_node = targetReader.nodeId;
      result.data.card_reader_name = targetReader.name;
      result.data.card_reader_location = targetReader.location;

      return res.json({
        success: true,
        message: `อ่านบัตรจาก ${targetReader.name} สำเร็จ`,
        data: result.data,
        source: 'uTrust 2700 R',
        branch: {
          code: branch.branch_code,
          name: branch.name
        },
        cardReader: {
          nodeId: targetReader.nodeId,
          name: targetReader.name,
          location: targetReader.location,
          clientIP: targetReader.clientIP
        }
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Specific card reader error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔧 Debug endpoint - ดูข้อมูลที่ backend ได้รับ
router.get('/debug', async (req, res) => {
  try {
    const branch = detectCurrentBranch(req);
    const branchConfig = loadBranchConfig();

    // ดึง client IP จากหลายแหล่งที่เป็นไปได้
    const clientIP = req.headers['x-client-ip'] ||
                     req.headers['x-real-ip'] ||
                     req.headers['x-forwarded-for'] ||
                     req.ip ||
                     req.connection.remoteAddress ||
                     req.socket.remoteAddress ||
                     'unknown';
    const cleanClientIP = clientIP.replace(/::ffff:/, '').replace(/::1/, '127.0.0.1');

    // ตรวจสอบการใช้ IP detection
    const useIPDetection = req.headers['x-use-ip-detection'] === 'true' ||
                          req.body?.useIPDetection === true ||
                          branch?.cardReaderSettings?.nodeSelectionStrategy === 'client-ip-match';

    // ค้นหาเครื่องอ่านบัตรที่ match กับ client IP
    let ipMatchedReader = null;
    if (branch?.cardReaderNodes && Array.isArray(branch.cardReaderNodes)) {
      ipMatchedReader = branch.cardReaderNodes.find(reader =>
        reader.active && reader.clientIP === cleanClientIP
      );
    }

    return res.json({
      success: true,
      message: 'Debug information',
      data: {
        detectedBranch: branch,
        clientInfo: {
          originalIP: clientIP,
          cleanIP: cleanClientIP,
          ip: req.ip,
          remoteAddress: req.connection?.remoteAddress,
          socketRemoteAddress: req.socket?.remoteAddress,
          headers: {
            'x-client-ip': req.headers['x-client-ip'],
            'x-real-ip': req.headers['x-real-ip'],
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-use-ip-detection': req.headers['x-use-ip-detection'],
            'x-branch-code': req.headers['x-branch-code'],
            'x-request-source': req.headers['x-request-source']
          }
        },
        ipDetection: {
          useIPDetection,
          ipMatchedReader: ipMatchedReader ? {
            nodeId: ipMatchedReader.nodeId,
            name: ipMatchedReader.name,
            clientIP: ipMatchedReader.clientIP,
            location: ipMatchedReader.location,
            active: ipMatchedReader.active
          } : null
        },
        branchConfig: branchConfig?.branches ?
          Object.keys(branchConfig.branches).map(key => ({
            key,
            name: branchConfig.branches[key].name,
            active: branchConfig.branches[key].active,
            cardReaderNodes: branchConfig.branches[key].cardReaderNodes?.map(reader => ({
              nodeId: reader.nodeId,
              name: reader.name,
              clientIP: reader.clientIP,
              active: reader.active
            })) || []
          })) : null
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

// ✅ Health Check Endpoint สำหรับ Main Card Reader API
router.get('/health', async (req, res) => {
  try {
    console.log('💊 Main Card Reader API Health Check called');

    const healthStatus = {
      service: 'Main Card Reader API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      endpoints: {
        '/': 'read-card endpoint',
        '/health': 'health check',
        '/debug': 'debug information'
      }
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('❌ Main Card Reader API health check error:', error);
    res.status(500).json({
      service: 'Main Card Reader API',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ Main Card Reader Endpoint (แทน endpoint เก่าที่ให้ HTTP 500)
router.get('/', async (req, res) => {
  try {
    console.log('🆔 Main Card Reader API called');
    console.log('📥 Query params:', req.query);
    console.log('📥 Headers:', req.headers);

    // ตรวจสอบ branch
    const branch = detectCurrentBranch(req);

    if (!branch) {
      return res.status(400).json({
        success: false,
        error: 'Branch detection failed',
        message: 'Unable to determine branch from request',
        availableEndpoints: [
          'POST /api/cardreader/card-proxy/read-card - HTTPS Safe Proxy',
          'GET /api/read-card/health - Health Check',
          'GET /api/read-card/debug - Debug Information'
        ]
      });
    }

    // สำหรับ main API endpoint นี้ เราจะให้คำแนะนำแทนการอ่านบัตรจริง
    // เพราะ card reader ต้องเชื่อมต่อผ่าน hardware specific endpoints
    res.status(200).json({
      success: false,
      error: 'Direct card reading not supported',
      message: 'Please use Card Reader Service or Proxy endpoints',
      branch: {
        name: branch.name,
        code: branch.branch_code,
        location: branch.location
      },
      recommendations: [
        'Use CardReaderService.readCard() in frontend',
        'Use /api/cardreader/card-proxy/read-card for HTTPS environments',
        'Check card reader proxy services on configured IPs',
        'Use manual entry fallback if card reader is unavailable'
      ],
      endpoints: {
        cardReaderProxies: branch.cardReaderNodes?.map(node => ({
          name: node.name,
          ip: node.clientIP,
          port: node.port || 3999,
          url: `http://${node.clientIP}:${node.port || 3999}/read-card`
        })) || [],
        proxyEndpoint: '/api/cardreader/card-proxy/read-card',
        healthCheck: '/api/read-card/health'
      }
    });

  } catch (error) {
    console.error('❌ Main Card Reader API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error in main card reader API',
      timestamp: new Date().toISOString(),
      recommendations: [
        'Check server logs for detailed error information',
        'Verify branch configuration file exists',
        'Use alternative endpoints if available'
      ]
    });
  }
});

module.exports = router;
