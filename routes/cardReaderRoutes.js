const express = require('express');
const router = express.Router();

// ✅ Health Check Endpoint สำหรับ Diagnostic Tool
router.get('/health', async (req, res) => {
  try {
    console.log('💊 Card Reader Health Check called');

    const healthStatus = {
      service: 'Card Reader Proxy',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      endpoints: {
        'card-proxy/read-card': 'available',
        'health': 'available'
      }
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      service: 'Card Reader Proxy',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ Card Reader Proxy สำหรับ HTTPS environments
router.post('/card-proxy/read-card', async (req, res) => {
  try {
    console.log('🔐 Card Reader Proxy called (HTTPS Safe Mode)');
    console.log('📥 Request body:', req.body);

    const { branchCode } = req.body;

    // ✅ แก้ไข encoding error โดย decode branchCode
    const decodedBranchCode = branchCode ? decodeURIComponent(branchCode) : branchCode;
    console.log(`🏪 Original branchCode: ${branchCode}`);
    console.log(`🏪 Decoded branchCode: ${decodedBranchCode}`);

    // กำหนด IP ตาม branchCode 100.67.134.56
    const cardReaderIPs = {
      // '00000': '100.92.184.115:3999',
      '00000': '100.84.132.71:3999',
      '00007': '100.68.196.106:3999',
      '00002': '100.119.4.117:3000',
            '00003': '100.106.108.57:3999',
      '00004': '100.67.134.56:3002',
      '00005': '100.92.113.92:3000',
      '00008': '100.127.38.117:3000',
      '00010': '100.115.94.1:3999',
      'ยะลา': '100.64.32.55:4000',
      '00001': '100.88.190.88:4000',
      'โดย อุไร ร่าหมาน': '100.78.250.73:3000' // ✅ เพิ่มสาขาโดย อุไร ร่าหมาน
    };

    const cardReaderIP = cardReaderIPs[decodedBranchCode];

    if (!cardReaderIP) {
      return res.status(400).json({
        success: false,
        error: `No card reader configured for branch ${decodedBranchCode}`,
        availableBranches: Object.keys(cardReaderIPs),
        originalBranchCode: branchCode,
        decodedBranchCode: decodedBranchCode
      });
    }

    const cardReaderUrl = `http://${cardReaderIP}/read-card`;
    console.log(`🌐 Proxying to: ${cardReaderUrl}`);

    // สร้าง timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(cardReaderUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Server-Proxy/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Card reader responded with ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      console.log('✅ Card reader proxy successful');
      console.log('📄 Result:', result);

      return res.json({
        success: true,
        message: `Card read successful via proxy (branch: ${decodedBranchCode})`,
        data: result.data || result,
        source: 'Card Reader Proxy',
        cardReaderUrl: cardReaderUrl,
        branchCode: decodedBranchCode,
        originalBranchCode: branchCode
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        throw new Error(`Card reader timeout at ${cardReaderIP}`);
      } else if (fetchError.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to card reader at ${cardReaderIP}. Service may be down.`);
      } else {
        throw new Error(`Card reader error: ${fetchError.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Card Reader Proxy error:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      source: 'Card Reader Proxy',
      timestamp: new Date().toISOString(),
      suggestions: [
        'Check if card reader service is running',
        'Verify network connectivity',
        'Ensure card is properly inserted'
      ]
    });
  }
});

// ✅ Health check endpoint
router.get('/status', async (req, res) => {
  try {
    const branchCode = req.query.branch || '00007';

    const cardReaderIPs = {
      // '00000': '100.92.184.115:3999',
      '00000': '100.84.132.71:3999',
      '00007': '100.68.196.106:3999',
      '00002': '100.119.4.117:3000',
      '00004': '100.67.134.56:3002',
      '00005': '100.92.113.92:3000',
      '00008': '100.127.38.117:3000',
      '00010': '100.115.94.1:3999',
      '00003': '100.106.108.57:3999',
      'ยะลา': '100.64.32.55:4000',
      '00001': '100.88.190.88:4000',
      'โดย อุไร ร่าหมาน': '100.78.250.73:3000' // ✅ เพิ่มสาขาโดย อุไร ร่าหมาน
    };

    const cardReaderIP = cardReaderIPs[branchCode];

    if (!cardReaderIP) {
      return res.status(400).json({
        success: false,
        error: `No card reader configured for branch ${branchCode}`
      });
    }

    const healthUrl = `http://${cardReaderIP}/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const isHealthy = response.ok;

      return res.json({
        success: true,
        data: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          cardReaderUrl: `http://${cardReaderIP}`,
          branchCode: branchCode,
          responseStatus: response.status,
          timestamp: new Date().toISOString()
        }
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);

      return res.json({
        success: true,
        data: {
          status: 'unreachable',
          cardReaderUrl: `http://${cardReaderIP}`,
          branchCode: branchCode,
          error: fetchError.message,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;