const axios = require('axios');
const { cacheService } = require('../config/cache');

class CacheWarmingService {
  constructor() {
    this.baseURL = process.env.API_BASE_URL || 'http://localhost:3000/api';
    this.isWarming = false;
  }

  // Common endpoints that should be pre-warmed
  getWarmupEndpoints() {
    return [
      // Master data - อัพเดตน้อย แต่ใช้บ่อย
      { url: '/branches', priority: 'high', interval: 1800000 }, // 30 minutes
      { url: '/categories', priority: 'high', interval: 1800000 },
      { url: '/chart-of-accounts', priority: 'high', interval: 1800000 },
      { url: '/provinces', priority: 'medium', interval: 3600000 }, // 1 hour
      { url: '/user-roles', priority: 'medium', interval: 1800000 },

      // Dashboard data - ใช้บ่อยมาก
      { url: '/dashboard/stats', priority: 'critical', interval: 300000 }, // 5 minutes
      { url: '/sales-dashboard/today-summary', priority: 'critical', interval: 60000 }, // 1 minute
      { url: '/sales-dashboard/branch-stats', priority: 'high', interval: 300000 },

      // Frequently accessed data
      { url: '/products?limit=50', priority: 'high', interval: 600000 }, // 10 minutes
      { url: '/suppliers', priority: 'medium', interval: 1800000 },
      { url: '/stock/summary', priority: 'medium', interval: 300000 },

      // Reports
      { url: '/sales-dashboard/top-sales-staff', priority: 'medium', interval: 600000 },
      { url: '/sales-dashboard/product-distribution', priority: 'medium', interval: 600000 }
    ];
  }

  /**
   * Warm up a single endpoint
   */
  async warmEndpoint(endpoint, headers = {}) {
    try {
      console.log(`🔥 Warming cache: ${endpoint.url}`);

      const response = await axios.get(`${this.baseURL}${endpoint.url}`, {
        headers: {
          'User-Agent': 'CacheWarmer/1.0',
          'X-Cache-Warmer': 'true',
          ...headers
        },
        timeout: 10000
      });

      if (response.status === 200) {
        console.log(`✅ Warmed: ${endpoint.url} (${response.headers['x-cache'] || 'MISS'})`);
        return { success: true, endpoint: endpoint.url, status: response.status };
      } else {
        console.log(`⚠️  Warning: ${endpoint.url} returned ${response.status}`);
        return { success: false, endpoint: endpoint.url, status: response.status };
      }

    } catch (error) {
      console.log(`❌ Failed to warm ${endpoint.url}:`, error.message);
      return { success: false, endpoint: endpoint.url, error: error.message };
    }
  }

  /**
   * Warm up all critical endpoints
   */
  async warmCriticalEndpoints(authHeaders = {}) {
    if (this.isWarming) {
      console.log('🔥 Cache warming already in progress...');
      return;
    }

    this.isWarming = true;
    console.log('🚀 Starting cache warming for critical endpoints...');

    const endpoints = this.getWarmupEndpoints();
    const criticalEndpoints = endpoints.filter(e => e.priority === 'critical');
    const results = [];

    for (const endpoint of criticalEndpoints) {
      const result = await this.warmEndpoint(endpoint, authHeaders);
      results.push(result);

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isWarming = false;
    console.log(`🎯 Cache warming completed: ${results.filter(r => r.success).length}/${results.length} successful`);

    return results;
  }

  /**
   * Warm up all endpoints by priority
   */
  async warmAllEndpoints(authHeaders = {}) {
    if (this.isWarming) {
      return { message: 'Cache warming already in progress' };
    }

    this.isWarming = true;
    console.log('🔥 Starting comprehensive cache warming...');

    const endpoints = this.getWarmupEndpoints();
    const priorities = ['critical', 'high', 'medium'];
    const results = { total: 0, success: 0, failed: 0, details: [] };

    for (const priority of priorities) {
      const priorityEndpoints = endpoints.filter(e => e.priority === priority);
      console.log(`\n🎯 Warming ${priority} priority endpoints (${priorityEndpoints.length} endpoints):`);

      for (const endpoint of priorityEndpoints) {
        const result = await this.warmEndpoint(endpoint, authHeaders);
        results.details.push(result);
        results.total++;

        if (result.success) {
          results.success++;
        } else {
          results.failed++;
        }

        // Delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, priority === 'critical' ? 50 : 200));
      }
    }

    this.isWarming = false;
    console.log(`\n🎉 Cache warming completed!`);
    console.log(`   ✅ Success: ${results.success}/${results.total}`);
    console.log(`   ❌ Failed: ${results.failed}/${results.total}`);

    return results;
  }

  /**
   * Schedule automatic warming
   */
  scheduleWarming(authHeadersProvider = null) {
    const endpoints = this.getWarmupEndpoints();

    endpoints.forEach(endpoint => {
      setInterval(async () => {
        const headers = authHeadersProvider ? await authHeadersProvider() : {};
        await this.warmEndpoint(endpoint, headers);
      }, endpoint.interval);
    });

    console.log(`⏰ Scheduled cache warming for ${endpoints.length} endpoints`);
  }

  /**
   * Smart warming based on usage patterns
   */
  async smartWarm(usageStats = {}) {
    const popularEndpoints = [
      // Add endpoints based on actual usage
      '/dashboard/stats',
      '/sales-dashboard/today-summary',
      '/branches',
      '/products?limit=20'
    ];

    console.log('🧠 Starting smart cache warming...');
    const results = [];

    for (const url of popularEndpoints) {
      const endpoint = { url, priority: 'smart' };
      const result = await this.warmEndpoint(endpoint);
      results.push(result);
    }

    return results;
  }

  /**
   * Pre-warm cache with specific data patterns
   */
  async preWarmPatterns() {
    const patterns = [
      // Common pagination patterns
      { url: '/products?page=1&limit=20', weight: 'high' },
      { url: '/products?page=1&limit=50', weight: 'medium' },

      // Common search patterns
      { url: '/branches?active=true', weight: 'high' },
      { url: '/categories?type=product', weight: 'medium' },

      // Dashboard patterns
      { url: '/dashboard/stats?period=today', weight: 'critical' },
      { url: '/dashboard/stats?period=week', weight: 'high' }
    ];

    console.log('📊 Pre-warming common usage patterns...');
    const results = [];

    for (const pattern of patterns) {
      const result = await this.warmEndpoint(pattern);
      results.push(result);

      // Adjust delay based on weight
      const delay = pattern.weight === 'critical' ? 50 :
                   pattern.weight === 'high' ? 100 : 200;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return results;
  }
}

// Export singleton instance
const cacheWarmingService = new CacheWarmingService();

module.exports = cacheWarmingService;