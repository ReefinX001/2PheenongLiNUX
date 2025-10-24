/**
 * Card Reader Service สำหรับหลายสาขา (รองรับหลาย IP ต่อสาขา)
 * รองรับ Dynamic Configuration และ Fallback Mechanism แบบ Multi-IP
 */

window.CardReaderService = {

  // ✅ อ่านบัตรประชาชนตาม configuration สาขา (รองรับหลาย IP)
  readCard: async function(options = {}) {
    const branchCode = options.branchCode || window.CardReaderConfig?.getCurrentBranchCode() || '00000';
    const source = options.source || 'unknown';

    console.log(`🆔 Starting card read for branch: ${branchCode} (${source})`);

    // ตรวจสอบว่าสาขานี้เปิดใช้เครื่องอ่านบัตรหรือไม่
    if (!window.CardReaderConfig?.isCardReaderEnabled(branchCode)) {
      console.warn(`⚠️ Card reader disabled for branch: ${branchCode}`);
      return {
        success: false,
        error: 'เครื่องอ่านบัตรประชาชนไม่ได้เปิดใช้งานสำหรับสาขานี้'
      };
    }

    // ดึง URLs สำหรับสาขานี้ (รองรับหลาย IP)
    const urlConfig = window.CardReaderConfig.getCardProxyUrls(branchCode);
    console.log(`📡 Card Proxy URLs for branch ${branchCode}:`, urlConfig);

    // ✅ ตรวจสอบ Protocol เพื่อเลือกกลยุทธ์ที่เหมาะสม
    const isHTTPS = location.protocol === 'https:';
    console.log(`🔐 Protocol check: ${location.protocol} (HTTPS: ${isHTTPS})`);

    // สร้าง attempts สำหรับทุก IP + Main Server API
    const attempts = [];

    // เพิ่ม local IPs ตามลำดับ priority (เฉพาะ HTTP mode)
    if (!isHTTPS) {
      urlConfig.all.forEach((proxy, index) => {
        attempts.push({
          name: `${proxy.name} (${proxy.host})`,
          url: proxy.http,
          timeout: 5000,
          priority: proxy.priority,
          type: 'local'
        });
      });
    }

    if (isHTTPS) {
      // ✅ สำหรับ HTTPS: ใช้ Proxy Server เพื่อหลีกเลี่ยง Mixed Content Policy
      console.log(`🔐 HTTPS Mode: Using server proxy to avoid Mixed Content Policy`);
      attempts.unshift({
        name: 'Card Reader Proxy (HTTPS Safe)',
        url: '/api/cardreader/card-proxy/read-card', // ✅ แก้ไข path ให้ถูกต้อง
        timeout: 8000,
        useAuth: true,
        priority: 0, // ความสำคัญสูงสุดสำหรับ HTTPS
        type: 'proxy',
        branchCode: branchCode
      });

      // ✅ สำหรับ HTTPS: เปลี่ยน HTTP endpoints เป็น HTTPS หรือใช้ proxy
      urlConfig.all.forEach((proxy, index) => {
        // เปลี่ยน HTTP เป็น HTTPS หรือใช้ proxy endpoint
        const httpsUrl = proxy.http.replace('http://', 'https://');
        attempts.push({
          name: `${proxy.name} (HTTPS - ${proxy.host})`,
          url: httpsUrl,
          timeout: 5000,
          priority: proxy.priority + 1,
          type: 'local-https'
        });
      });
    }

    // เพิ่ม Main Server API เป็น fallback สุดท้าย
    attempts.push({
      name: 'Main Server API',
      url: '/api/read-card',
      timeout: 8000,
      useAuth: true,
      priority: 999,
      type: 'server'
    });

    // เรียงตาม priority (น้อยไปมาก)
    attempts.sort((a, b) => a.priority - b.priority);

    console.log(`🔄 Will try ${attempts.length} endpoints:`, attempts.map(a => a.name));

    // ลองเชื่อมต่อทีละ endpoint ตามลำดับ
    let connectionErrors = [];

    for (const [index, attempt] of attempts.entries()) {
        try {
        console.log(`🔄 Attempt ${index + 1}/${attempts.length}: ${attempt.name}`);
        console.log(`📍 URL: ${attempt.url}`);

        const result = await this._makeCardRequest(attempt.url, {
          timeout: attempt.timeout,
          useAuth: attempt.useAuth,
          branchCode: attempt.branchCode || branchCode,
          attemptName: attempt.name,
          isProxy: attempt.type === 'proxy'
        });

        if (result.success) {
          console.log(`✅ Card read successful via: ${attempt.name} (${attempt.type})`);

          // เพิ่มข้อมูล endpoint ที่ใช้งานสำเร็จ
          result.usedEndpoint = {
            name: attempt.name,
            url: attempt.url,
            type: attempt.type,
            priority: attempt.priority,
            attemptNumber: index + 1,
            totalAttempts: attempts.length
          };

          return result;
        }

      } catch (error) {
        const errorInfo = {
          name: attempt.name,
          url: attempt.url,
          type: attempt.type,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        connectionErrors.push(errorInfo);

        console.warn(`❌ ${attempt.name} failed:`, error.message);

        // เพิ่ม debugging information สำหรับ development
        if (attempt.type === 'local' || attempt.type === 'local-https') {
          console.debug(`🔍 [${attempt.name}] Network Debug:`, {
            url: attempt.url,
            timeout: attempt.timeout,
            protocol: location.protocol,
            origin: location.origin,
            userAgent: navigator.userAgent.substring(0, 50) + '...'
          });
        }

        continue;
        }
    }

    // ถ้าทุกวิธีล้มเหลว
    console.error(`💥 All ${attempts.length} endpoints failed for branch ${branchCode}`);
    console.error('🔍 Failed endpoints details:', connectionErrors);

    // สร้าง detailed error message
    const errorSummary = connectionErrors.map(err => `${err.name}: ${err.error}`).join('\n');

    return {
      success: false,
      error: `ไม่สามารถเชื่อมต่อเครื่องอ่านบัตรได้ (ลองแล้ว ${attempts.length} endpoint) กรุณาลองใหม่อีกครั้งหรือกรอกข้อมูลด้วยตนเอง`,
      failedEndpoints: attempts.map(a => ({ name: a.name, url: a.url, type: a.type })),
      connectionErrors: connectionErrors,
      debugInfo: {
        branchCode: branchCode,
        totalAttempts: attempts.length,
        protocol: location.protocol,
        timestamp: new Date().toISOString()
      }
    };
  },

  // ✅ ทำ HTTP Request สำหรับอ่านบัตร (เพิ่ม logging ละเอียด)
  _makeCardRequest: async function(url, options = {}) {
    const { timeout = 5000, useAuth = false, branchCode, attemptName = 'Unknown', isProxy = false } = options;

    const headers = {
      'Content-Type': 'application/json'
    };

    if (useAuth) {
      const token = localStorage.getItem('authToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (branchCode) {
        // ✅ แก้ไข encoding error โดยใช้ encodeURIComponent
        headers['X-Branch-Code'] = encodeURIComponent(branchCode);
      }
    }

            const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

        console.log(`🌐 [${attemptName}] Making request to: ${url} (timeout: ${timeout}ms)`);

    try {
      // ✅ Force HTTP for local Card Reader endpoints to prevent HTTPS upgrade
      let requestBody = undefined;

      if (useAuth) {
        requestBody = JSON.stringify({
          branchCode: branchCode,
          // ✅ เพิ่มข้อมูลสำหรับ proxy endpoint
          ...(isProxy && {
            action: 'read-card',
            source: 'frontend'
          })
        });
      }

      const requestOptions = {
        method: useAuth ? 'POST' : 'GET',
        headers: headers,
        signal: controller.signal,
        body: requestBody,
        // ✅ Add options to prevent HTTPS upgrade for local IPs
        mode: 'cors',
        credentials: 'omit' // ป้องกัน HTTPS upgrade
      };

      // ✅ แสดง warning ถ้า Browser พยายาม upgrade เป็น HTTPS
      if (url.startsWith('http://') && location.protocol === 'https:') {
        console.warn(`⚠️ [${attemptName}] Mixed content warning: HTTPS page calling HTTP endpoint`);
      }

      const response = await fetch(url, requestOptions);

            clearTimeout(timeoutId);

      console.log(`📡 [${attemptName}] Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📋 [${attemptName}] Response data:`, data.success ? '✅ Success' : '❌ Failed');

      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout after ${timeout}ms`);
        console.error(`⏰ [${attemptName}] ${timeoutError.message}`);
        throw timeoutError;
      }

      console.error(`❌ [${attemptName}] Error: ${error.message}`);
      throw error;
    }
  },

  // ✅ เชื่อมต่อ WebSocket สำหรับ real-time card reading (รองรับหลาย IP)
  connectWebSocket: function(branchCode, callbacks = {}) {
    const { onConnect, onData, onError, onClose } = callbacks;

    if (!window.CardReaderConfig?.isCardReaderEnabled(branchCode)) {
      console.warn(`⚠️ WebSocket disabled for branch: ${branchCode}`);
      return null;
        }

    const urlConfig = window.CardReaderConfig.getCardProxyUrls(branchCode);
    console.log(`🔌 Connecting WebSocket for branch ${branchCode}:`, urlConfig);

    // ลองเชื่อมต่อ WebSocket ตามลำดับ priority
    let wsConnection = null;
    let currentAttempt = 0;

    const tryConnectWebSocket = (proxyIndex = 0) => {
      if (proxyIndex >= urlConfig.all.length) {
        console.error(`❌ All WebSocket endpoints failed for branch ${branchCode}`);
        if (onError) onError(new Error('All WebSocket endpoints failed'));
        return null;
            }

      const proxy = urlConfig.all[proxyIndex];
      currentAttempt = proxyIndex + 1;

      console.log(`🔌 WebSocket attempt ${currentAttempt}/${urlConfig.all.length}: ${proxy.name} (${proxy.ws})`);

      try {
        const ws = new WebSocket(proxy.ws);

        ws.onopen = function(event) {
          console.log(`✅ WebSocket connected via: ${proxy.name} (${proxy.host})`);
          wsConnection = ws;

          if (onConnect) {
            onConnect({
              ...event,
              endpoint: {
                name: proxy.name,
                url: proxy.ws,
                host: proxy.host,
                priority: proxy.priority,
                attemptNumber: currentAttempt
              }
            });
            }
        };

        ws.onmessage = function(event) {
            try {
            const data = JSON.parse(event.data);
            console.log(`📨 WebSocket data via ${proxy.name}:`, data);
            if (onData) onData(data);
            } catch (error) {
            console.error(`❌ Failed to parse WebSocket message from ${proxy.name}:`, error);
        }
        };

        ws.onerror = function(error) {
          console.error(`❌ WebSocket error from ${proxy.name}:`, error);

          // ลองเชื่อมต่อ endpoint ถัดไป
          setTimeout(() => {
            tryConnectWebSocket(proxyIndex + 1);
          }, 2000);
        };

        ws.onclose = function(event) {
          console.log(`🔌 WebSocket closed from ${proxy.name}:`, event.code, event.reason);

          if (onClose) {
            onClose({
              ...event,
              endpoint: {
                name: proxy.name,
                url: proxy.ws,
                host: proxy.host,
                priority: proxy.priority
              }
            });
          }

          // ถ้าไม่ใช่การปิดแบบปกติ และยังมี endpoint อื่น ให้ลองใหม่
          if (event.code !== 1000 && proxyIndex + 1 < urlConfig.all.length) {
            console.log(`🔄 Trying next WebSocket endpoint...`);
            setTimeout(() => {
              tryConnectWebSocket(proxyIndex + 1);
            }, 3000);
                }
        };

        return ws;

        } catch (error) {
        console.error(`❌ Failed to create WebSocket for ${proxy.name}:`, error);

        // ลองเชื่อมต่อ endpoint ถัดไป
        setTimeout(() => {
          tryConnectWebSocket(proxyIndex + 1);
        }, 1000);

        return null;
        }
    };

    // เริ่มลองเชื่อมต่อจาก endpoint แรก
    return tryConnectWebSocket(0);
  },

  // ✅ ตรวจสอบสถานะเครื่องอ่านบัตร (รองรับหลาย IP)
  checkStatus: async function(branchCode) {
    if (!branchCode) {
      branchCode = window.CardReaderConfig?.getCurrentBranchCode() || '00000';
    }

    console.log(`🏥 Checking card reader status for branch: ${branchCode}`);

    if (!window.CardReaderConfig?.isCardReaderEnabled(branchCode)) {
        return {
        success: false,
        status: 'disabled',
        message: 'เครื่องอ่านบัตรไม่ได้เปิดใช้งานสำหรับสาขานี้'
      };
    }

    const cardProxyConfig = window.CardReaderConfig.getCardProxyUrls(branchCode);
    const zkConfig = window.CardReaderConfig.getZKDeviceUrls(branchCode);

    const allChecks = [];

    // เพิ่ม Card Proxy checks
    cardProxyConfig.all.forEach(proxy => {
      allChecks.push({
        name: `Card Proxy - ${proxy.name}`,
        url: proxy.http.replace('/read-card', '/status'),
        type: 'cardProxy',
        priority: proxy.priority,
        host: proxy.host
      });
    });

    // เพิ่ม ZK Device checks
    zkConfig.all.forEach(device => {
      allChecks.push({
        name: `ZK Device - ${device.name}`,
        url: device.status,
        type: 'zkDevice',
        priority: device.priority,
        host: device.host
      });
    });

    console.log(`🔍 Will check ${allChecks.length} endpoints for status...`);

    const results = {};
    let onlineCount = 0;
    let totalCount = allChecks.length;

    // ตรวจสอบทุก endpoint แบบ parallel
    const checkPromises = allChecks.map(async (check) => {
      try {
        console.log(`🔍 Checking: ${check.name} (${check.url})`);

        const response = await fetch(check.url, {
          method: 'GET',
          timeout: 3000
        });

        const result = {
          status: response.ok ? 'online' : 'error',
          code: response.status,
          message: response.ok ? 'พร้อมใช้งาน' : `HTTP ${response.status}`,
          host: check.host,
          priority: check.priority,
          type: check.type
        };

        if (response.ok) onlineCount++;

        results[check.name] = result;
        console.log(`${response.ok ? '✅' : '❌'} ${check.name}: ${result.message}`);

      } catch (error) {
        results[check.name] = {
          status: 'offline',
          message: error.message,
          host: check.host,
          priority: check.priority,
          type: check.type
        };

        console.log(`❌ ${check.name}: ${error.message}`);
                }
            });

    await Promise.all(checkPromises);

    // คำนวณสถานะรวม
    let overallStatus = 'offline';
    let overallMessage = '';

    if (onlineCount === totalCount) {
      overallStatus = 'online';
      overallMessage = `เครื่องอ่านบัตรพร้อมใช้งาน (${onlineCount}/${totalCount} endpoints online)`;
    } else if (onlineCount > 0) {
      overallStatus = 'partial';
      overallMessage = `เครื่องอ่านบัตรพร้อมใช้งานบางส่วน (${onlineCount}/${totalCount} endpoints online)`;
            } else {
      overallStatus = 'offline';
      overallMessage = `เครื่องอ่านบัตรไม่พร้อมใช้งาน (0/${totalCount} endpoints online)`;
    }

    console.log(`📊 Overall status for branch ${branchCode}: ${overallStatus} - ${overallMessage}`);

    return {
      success: onlineCount > 0,
      status: overallStatus,
      message: overallMessage,
      details: results,
      summary: {
        onlineCount,
        totalCount,
        offlineCount: totalCount - onlineCount,
        cardProxyCount: cardProxyConfig.totalCount,
        zkDeviceCount: zkConfig.totalCount
      }
    };
  },

  // ✅ แสดงข้อมูล debug (รองรับหลาย IP)
  showDebugInfo: function() {
    const branchCode = window.CardReaderConfig?.getCurrentBranchCode() || '00000';
    const config = window.CardReaderConfig?.showDebugInfo();

    console.group('🔍 Card Reader Service Debug (Multi-IP Support)');
    console.log('Current Branch:', branchCode);
    console.log('Configuration:', config);
    console.log('Service Methods:', Object.keys(this));

    if (config && config.cardProxyUrls) {
      console.log(`\n📡 Available Endpoints Summary:`);
      console.log(`  - Card Proxy: ${config.cardProxyUrls.totalCount} endpoints`);
      console.log(`  - ZK Device: ${config.zkUrls.totalCount} endpoints`);
      console.log(`  - Total: ${config.cardProxyUrls.totalCount + config.zkUrls.totalCount} endpoints`);
        }

    console.groupEnd();

    return config;
    }
};

// ✅ Auto-initialize
document.addEventListener('DOMContentLoaded', function() {
  console.log('🆔 Card Reader Service initialized (Multi-IP Support)');

  // แสดง debug info ใน development
  if (window.location.hostname === 'localhost' || window.location.search.includes('debug=1')) {
    setTimeout(() => {
      window.CardReaderService.showDebugInfo();
    }, 1500);
    }
});

// ✅ Export สำหรับ Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.CardReaderService;
}