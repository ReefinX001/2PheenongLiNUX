/**
 * Card Reader Configuration สำหรับหลายสาขา (รองรับหลาย IP ต่อสาขา)
 * ใช้สำหรับจัดการ IP, Port และ settings ของเครื่องอ่านบัตรแต่ละสาขา
 */

window.CardReaderConfig = {
  // ✅ Configuration สำหรับแต่ละสาขา (รองรับหลาย IP)
  branches: {
    // สำนักงานใหญ่ - มี 2 IP addresses
    '00000': {
      cardProxy: [
        // {
        //   host: '100.92.184.115',  // Primary IP (Tailscale/VPN)
        //   httpPort: 3999,          // ✅ แก้ไข port ให้ตรงกับ branches.json
        //   wsPort: 8080,
        //   priority: 1,
        //   name: 'Primary Card Proxy'
        // },
        {
          host: '100.84.132.71',   // Secondary IP (Local Network)
          httpPort: 3999,           // ✅ แก้ไข port ให้ตรงกับ branches.json
          wsPort: 8080,
          priority: 2,
          name: 'Secondary Card Proxy'
        }
      ],
      zkDevice: [
        {
          host: '100.92.184.115 , 100.84.132.71 ',  // Primary ZK Device
          port: 4002,
          priority: 1,
          name: 'Primary ZK Device'
        },
        {
          host: '100.92.184.115 , 100.84.132.71 ',   // Secondary ZK Device
          port: 4002,
          priority: 2,
          name: 'Secondary ZK Device'
        }
      ],
      name: 'สำนักงานใหญ่',
      enabled: true
    },

    // สาขาหาดใหญ่ - IP เดียว (ปิดใช้งานเครื่องอ่านบัตร)
    '00001': {
      cardProxy: [
        {
          host: '100.88.190.88',   // สาขาหาดใหญ่ Card Proxy (ไม่สามารถเชื่อมต่อได้)
          httpPort: 4000,
          wsPort: 8080,
          priority: 1,
          name: 'Hatyai Card Proxy (Disabled)',
          forceHttp: true
        }
      ],
      zkDevice: [
        {
          host: '100.88.190.88',   // สาขาหาดใหญ่ ZK Device (ไม่สามารถเชื่อมต่อได้)
          port: 4002,
          priority: 1,
          name: 'Hatyai ZK Device (Disabled)'
        }
      ],
      name: 'สาขาหาดใหญ่',
      enabled: false  // ❌ ปิดใช้งานเครื่องอ่านบัตรเนื่องจากไม่สามารถเชื่อมต่อได้
    },

    // สาขาโคกโพธิ์ - IP เดียว
    '00007': {
      cardProxy: [
        {
          host: '100.68.196.106',   // สาขาโคกโพธิ์ Card Proxy
          httpPort: 3999,
          wsPort: 8080,
          priority: 1,
          name: 'Pattani Card Proxy'
        }
      ],
      zkDevice: [
        {
          host: '192.168.1.101',   // สาขาโคกโพธิ์ ZK Device
          port: 4002,
          priority: 1,
          name: 'Pattani ZK Device'
        }
      ],
      name: 'สาขาโคกโพธิ์',
      enabled: true
    },

    // สาขาปาลัส - มี 2 IP addresses
    '00009': {
      cardProxy: [
        {
          host: '100.71.159.122',   // Primary สาขาปาลัส
          httpPort: 3000,
          wsPort: 8080,
          priority: 1,
          name: 'Songkhla Primary'
        },
        {
          host: '192.168.2.200',   // Secondary สาขาปาลัส
          httpPort: 3000,
          wsPort: 8080,
          priority: 2,
          name: 'Songkhla Secondary'
        }
      ],
      zkDevice: [
        {
          host: '100.71.159.122',
          port: 4002,
          priority: 1,
          name: 'Songkhla ZK Device Primary'
        },
        {
          host: '192.168.2.200',
          port: 4002,
          priority: 2,
          name: 'Songkhla ZK Device Secondary'
        }
      ],
      name: 'สาขาปาลัส',
      enabled: true
    },

    // สาขาสตูล - เปิดใช้งาน
    '00002': {
      cardProxy: [
        {
          host: '100.119.4.117',
          httpPort: 3000,
          wsPort: 8080,
          priority: 1,
          name: 'Satun Card Proxy'
        }
      ],
      zkDevice: [
        {
          host: '100.119.4.117',
          port: 4002,
          priority: 1,
          name: 'Satun ZK Device'
        }
      ],
      name: 'สาขาสตูล',
      enabled: true // ✅ เปิดใช้งานเครื่องอ่านบัตร
    },

    // สาขายะลา - IP เดียว
    'ยะลา': {
      cardProxy: [
        {
          host: '100.64.32.55',
          httpPort: 4000,
          wsPort: 8080,
          priority: 1,
          name: 'Yala Card Proxy'
        }
      ],
      zkDevice: [
        {
          host: '100.64.32.55',
          port: 4000,
          priority: 1,
          name: 'Yala ZK Device'
        }
      ],
      name: 'สาขายะลา',
      enabled: true
    },

    // สาขาเบตง - IP เดียว
    '00010': {
      cardProxy: [
        {
          host: '100.115.94.1',
          httpPort: 3999,
          wsPort: 8080,
          priority: 1,
          name: 'Betong Card Proxy'
        }
      ],
      zkDevice: [
        {
          host: '100.115.94.1',
          port: 4002,
          priority: 1,
          name: 'Betong ZK Device'
        }
      ],
      name: 'สาขาเบตง',
      enabled: true
    },

    // สาขาพัทลุง - IP เดียว
    '00003': {
      cardProxy: [
        {
          host: '100.116.208.41',
          httpPort: 3999,
          wsPort: 8080,
          priority: 1,
          name: 'Betong Card Proxy'
        }
      ],
      zkDevice: [
        {
          host: '100.116.208.41',
          port: 4002,
          priority: 1,
          name: 'nakhon ZK Device'
        }
      ],
      name: 'สาขาพัทลุง',
      enabled: true
    },

    // สาขานครศรีธรรมราช - IP เดียว
    '00004': {
      cardProxy: [
        {
          host: '100.67.134.56',
          httpPort: 3002,
          wsPort: 8080,
          priority: 1,
          name: 'Betong Card Proxy'
        }
      ],
      zkDevice: [
        {
          host: '100.67.134.56',
          port: 4002,
          priority: 1,
          name: 'nakhon ZK Device'
        }
      ],
      name: 'สาขานครศรีธรรมราช',
      enabled: true
    },

    // สาขาโดย อุไร ร่าหมาน - IP เดียว
    'โดย อุไร ร่าหมาน': {
      cardProxy: [
        {
          host: '100.78.250.73',
          httpPort: 3000,
          wsPort: 8080,
          priority: 1,
          name: 'Nara1 Card Proxy'
        }
      ],
      zkDevice: [
        {
          host: '100.78.250.73',   // แก้ไขให้ใช้ IP เดียวกันกับ cardProxy
          port: 4002,
          priority: 1,
          name: 'Nara1 ZK Device'
        }
      ],
      name: 'สาขาโดย อุไร ร่าหมาน',
      enabled: true  // ✅ เปิดใช้งานเครื่องอ่านบัตร
    },

    // สาขากรือเสาะ - IP เดียว
    '00008': {
      cardProxy: [
        {
          host: '100.127.38.117',
          httpPort: 3000,
          wsPort: 8080,
          priority: 1,
          name: 'Rueso Card Proxy'
        }
      ],
      zkDevice: [
        {
          host: '100.127.38.117',   // แก้ไขให้ใช้ IP เดียวกันกับ cardProxy
          port: 4002,
          priority: 1,
          name: 'Rueso ZK Device'
        }
      ],
      name: 'สาขากรือเสาะ',
      enabled: true  // ✅ เปิดใช้งานเครื่องอ่านบัตร
    },

    // สาขาสุไหง-โกลก (Pattani) - IP เดียว
    '00005': {
      cardProxy: [
        {
          host: '100.92.113.92',
          httpPort: 3000,
          wsPort: 8080,
          priority: 1,
          name: 'Pattani Card Proxy'
        }
      ],
      zkDevice: [
        {
          host: '100.92.113.92',   // แก้ไขให้ใช้ IP เดียวกันกับ cardProxy
          port: 4002,
          priority: 1,
          name: 'Pattani ZK Device'
        }
      ],
      name: 'สาขาปัตตานี (สุไหง-โกลก)',
      enabled: true  // ✅ เปิดใช้งานเครื่องอ่านบัตร
    }
  },

  // Default fallback configuration
  default: {
    cardProxy: [
      {
        host: 'localhost',
        httpPort: 3000,
        wsPort: 8080,
        priority: 1,
        name: 'Default Card Proxy'
      }
    ],
    zkDevice: [
      {
        host: 'localhost',
        port: 4002,
        priority: 1,
        name: 'Default ZK Device'
      }
    ],
    name: 'Default',
    enabled: false
  },

  // ✅ ดึง configuration สำหรับสาขาปัจจุบัน
  getBranchConfig: function(branchCode) {
    console.log(`🔍 DEBUG: Looking for branch ${branchCode} in:`, Object.keys(this.branches));
    console.log(`🔍 DEBUG: Branch ${branchCode} exists:`, this.branches.hasOwnProperty(branchCode));
    console.log(`🔍 DEBUG: Branch ${branchCode} config:`, this.branches[branchCode]);

    const config = this.branches[branchCode] || this.default;
    console.log(`📡 Card Reader Config for branch ${branchCode}:`, config);

    if (config === this.default) {
      console.warn(`⚠️ Using DEFAULT config for branch ${branchCode} - this might be incorrect!`);
    }

    return config;
  },

  // ✅ สร้าง URLs สำหรับสาขาปัจจุบัน (รองรับหลาย IP)
  getCardProxyUrls: function(branchCode) {
    const config = this.getBranchConfig(branchCode);

    // เรียงตาม priority และสร้าง URLs
    const sortedProxies = [...config.cardProxy].sort((a, b) => a.priority - b.priority);

    const urls = sortedProxies.map(proxy => ({
      http: `http://${proxy.host}:${proxy.httpPort}/read-card`,
      ws: `ws://${proxy.host}:${proxy.wsPort}`,
      host: proxy.host,
      port: proxy.httpPort,
      priority: proxy.priority,
      name: proxy.name,
      enabled: config.enabled
    }));

    return {
      primary: urls[0] || null,      // IP แรก (priority สูงสุด)
      all: urls,                     // ทุก IP เรียงตาม priority
      enabled: config.enabled,
      totalCount: urls.length
    };
  },

  // ✅ สร้าง ZK Device URLs สำหรับสาขาปัจจุบัน (รองรับหลาย IP)
  getZKDeviceUrls: function(branchCode) {
    const config = this.getBranchConfig(branchCode);

    // เรียงตาม priority และสร้าง URLs
    const sortedDevices = [...config.zkDevice].sort((a, b) => a.priority - b.priority);

    const urls = sortedDevices.map(device => ({
      base: `http://${device.host}:${device.port}`,
      status: `http://${device.host}:${device.port}/status`,
      capture: `http://${device.host}:${device.port}/capture`,
      host: device.host,
      port: device.port,
      priority: device.priority,
      name: device.name,
      enabled: config.enabled
    }));

    return {
      primary: urls[0] || null,      // IP แรก (priority สูงสุด)
      all: urls,                     // ทุก IP เรียงตาม priority
      enabled: config.enabled,
      totalCount: urls.length
    };
  },

  // ✅ ตรวจสอบว่าสาขามีเครื่องอ่านบัตรหรือไม่
  isCardReaderEnabled: function(branchCode) {
    const config = this.getBranchConfig(branchCode);
    return config.enabled;
  },

  // ✅ ดึงรหัสสาขาจาก URL parameters
  getCurrentBranchCode: function() {
    const urlParams = new URLSearchParams(window.location.search);
    const branchCode = urlParams.get('branch') || '00000';
    console.log(`🏪 Current branch code: ${branchCode}`);
    return branchCode;
  },

  // ✅ แสดงข้อมูล configuration ทั้งหมด (รองรับหลาย IP)
  showDebugInfo: function() {
    const branchCode = this.getCurrentBranchCode();
    const config = this.getBranchConfig(branchCode);
    const cardProxyUrls = this.getCardProxyUrls(branchCode);
    const zkUrls = this.getZKDeviceUrls(branchCode);

    console.group(`📡 Card Reader Debug Info - Branch ${branchCode}`);
    console.log('Branch Config:', config);
    console.log('Card Proxy URLs (Multiple IPs):', cardProxyUrls);
    console.log('ZK Device URLs (Multiple IPs):', zkUrls);
    console.log('Is Enabled:', this.isCardReaderEnabled(branchCode));

    // แสดงรายละเอียดแต่ละ IP
    console.log('\n📋 Card Proxy Endpoints:');
    cardProxyUrls.all.forEach((proxy, index) => {
      console.log(`  ${index + 1}. [Priority ${proxy.priority}] ${proxy.name}`);
      console.log(`     HTTP: ${proxy.http}`);
      console.log(`     WebSocket: ${proxy.ws}`);
    });

    console.log('\n🔧 ZK Device Endpoints:');
    zkUrls.all.forEach((device, index) => {
      console.log(`  ${index + 1}. [Priority ${device.priority}] ${device.name}`);
      console.log(`     Base: ${device.base}`);
      console.log(`     Status: ${device.status}`);
    });

    console.groupEnd();

    return {
      branchCode,
      config,
      cardProxyUrls,
      zkUrls,
      enabled: this.isCardReaderEnabled(branchCode)
    };
  },

  // 🔧 Debug function to check configuration status
  debugConfig: function(branchCode) {
    const targetBranch = branchCode || this.getCurrentBranchCode();
    console.group(`🔧 Card Reader Debug for Branch ${targetBranch}`);
    console.log('Available branches:', Object.keys(this.branches));
    console.log('Target branch exists:', this.branches.hasOwnProperty(targetBranch));
    console.log('Target branch config:', this.branches[targetBranch]);
    console.log('Default config:', this.default);
    console.log('Final result:', this.getBranchConfig(targetBranch));
    console.groupEnd();

    return {
      branchCode: targetBranch,
      exists: this.branches.hasOwnProperty(targetBranch),
      config: this.branches[targetBranch],
      final: this.getBranchConfig(targetBranch)
    };
  }
};

// ✅ Auto-initialize เมื่อโหลดไฟล์
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 Card Reader Config initialized (Multi-IP Support)');
  console.log('🔧 Available branches:', Object.keys(window.CardReaderConfig.branches));

  // แสดง debug info ใน development หรือเมื่อมี debug parameter
  if (window.location.hostname === 'localhost' || window.location.search.includes('debug=1')) {
    setTimeout(() => {
      window.CardReaderConfig.showDebugInfo();
    }, 1000);
  }

  // เพิ่ม global debug function เพื่อให้เรียกใช้ได้ง่าย
  window.debugCardReader = function(branchCode) {
    return window.CardReaderConfig.debugConfig(branchCode);
  };
});

// ✅ Export สำหรับ Node.js (ถ้าต้องการ)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.CardReaderConfig;
}