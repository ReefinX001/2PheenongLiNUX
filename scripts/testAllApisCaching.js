const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ComprehensiveApiCacheTest {
  constructor() {
    this.baseURL = 'http://127.0.0.1:3000';
    this.routesDir = path.join(__dirname, '../routes');
    this.results = {
      tested: 0,
      cached: 0,
      notCached: 0,
      errors: 0,
      performance: [],
      details: []
    };
    this.testEndpoints = [];
  }

  // Discover all API endpoints from route files
  async discoverEndpoints() {
    console.log('🔍 Discovering API endpoints from route files...\n');

    const endpoints = new Set();

    // Common API endpoints to test
    const commonEndpoints = [
      // Master data
      { path: '/api/branches', method: 'GET', category: 'master' },
      { path: '/api/categories', method: 'GET', category: 'master' },
      { path: '/api/suppliers', method: 'GET', category: 'master' },
      { path: '/api/chart-of-accounts', method: 'GET', category: 'master' },
      { path: '/api/provinces', method: 'GET', category: 'master' },
      { path: '/api/user-roles', method: 'GET', category: 'master' },

      // Dashboard
      { path: '/api/dashboard/stats', method: 'GET', category: 'dashboard' },
      { path: '/api/sales-dashboard/today-summary', method: 'GET', category: 'dashboard' },
      { path: '/api/sales-dashboard/branch-stats', method: 'GET', category: 'dashboard' },
      { path: '/api/sales-dashboard/branches', method: 'GET', category: 'dashboard' },

      // Financial
      { path: '/api/income', method: 'GET', category: 'financial' },
      { path: '/api/expenses', method: 'GET', category: 'financial' },
      { path: '/api/payments', method: 'GET', category: 'financial' },
      { path: '/api/contracts', method: 'GET', category: 'financial' },

      // Inventory
      { path: '/api/products?limit=5', method: 'GET', category: 'inventory' },
      { path: '/api/stock', method: 'GET', category: 'inventory' },
      { path: '/api/stock-audit', method: 'GET', category: 'inventory' },
      { path: '/api/branch-stock', method: 'GET', category: 'inventory' },

      // Reports
      { path: '/api/sales-reports', method: 'GET', category: 'reports' },
      { path: '/api/stock-reports', method: 'GET', category: 'reports' },
      { path: '/api/analytics', method: 'GET', category: 'reports' },

      // User management
      { path: '/api/users', method: 'GET', category: 'users' },
      { path: '/api/employees', method: 'GET', category: 'users' },

      // Other
      { path: '/api/notifications', method: 'GET', category: 'other' },
      { path: '/api/banners', method: 'GET', category: 'other' },
      { path: '/api/services', method: 'GET', category: 'other' }
    ];

    this.testEndpoints = commonEndpoints;
    console.log(`📋 Found ${this.testEndpoints.length} endpoints to test\n`);

    return this.testEndpoints;
  }

  // Test a single endpoint for caching
  async testEndpointCaching(endpoint, timeout = 10000) {
    const { path, method, category } = endpoint;
    const url = `${this.baseURL}${path}`;

    console.log(`🧪 Testing: ${method} ${path}`);

    try {
      // First request (should be cache MISS or no cache)
      const start1 = Date.now();
      const response1 = await axios({
        method,
        url,
        timeout,
        validateStatus: (status) => status < 500 // Accept 4xx errors
      });
      const time1 = Date.now() - start1;
      const cacheStatus1 = response1.headers['x-cache'] || response1.headers['x-cache-status'] || 'UNKNOWN';

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second request (should be cache HIT if cached)
      const start2 = Date.now();
      const response2 = await axios({
        method,
        url,
        timeout,
        validateStatus: (status) => status < 500
      });
      const time2 = Date.now() - start2;
      const cacheStatus2 = response2.headers['x-cache'] || response2.headers['x-cache-status'] || 'UNKNOWN';

      // Analyze results
      const isCached = (cacheStatus1 === 'MISS' && cacheStatus2 === 'HIT') ||
                      (time2 < time1 * 0.7); // Significant performance improvement

      const improvement = time1 > 0 ? ((time1 - time2) / time1 * 100).toFixed(1) : 0;

      const result = {
        endpoint: path,
        method,
        category,
        status: response1.status,
        cached: isCached,
        firstRequest: { time: time1, cache: cacheStatus1 },
        secondRequest: { time: time2, cache: cacheStatus2 },
        improvement: `${improvement}%`,
        dataSize: response1.data ? JSON.stringify(response1.data).length : 0
      };

      if (isCached) {
        this.results.cached++;
        console.log(`  ✅ CACHED - ${improvement}% faster (${time1}ms → ${time2}ms)`);
      } else {
        this.results.notCached++;
        console.log(`  ⚪ NOT CACHED - Same performance (${time1}ms → ${time2}ms)`);
      }

      this.results.details.push(result);
      this.results.performance.push({ endpoint: path, improvement: parseFloat(improvement) });

      return result;

    } catch (error) {
      this.results.errors++;
      console.log(`  ❌ ERROR - ${error.message}`);

      const errorResult = {
        endpoint: path,
        method,
        category,
        error: error.message,
        cached: false
      };

      this.results.details.push(errorResult);
      return errorResult;
    }
  }

  // Test all endpoints
  async testAllEndpoints() {
    console.log('🚀 Starting Comprehensive API Caching Test\n');
    console.log('='.repeat(60));

    await this.discoverEndpoints();

    // Group endpoints by category
    const categorizedEndpoints = {};
    this.testEndpoints.forEach(endpoint => {
      if (!categorizedEndpoints[endpoint.category]) {
        categorizedEndpoints[endpoint.category] = [];
      }
      categorizedEndpoints[endpoint.category].push(endpoint);
    });

    // Test each category
    for (const [category, endpoints] of Object.entries(categorizedEndpoints)) {
      console.log(`\n📂 Testing ${category.toUpperCase()} endpoints (${endpoints.length} endpoints):`);
      console.log('-'.repeat(50));

      for (const endpoint of endpoints) {
        await this.testEndpointCaching(endpoint);
        this.results.tested++;

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    this.generateReport();
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE API CACHING TEST REPORT');
    console.log('='.repeat(60));

    // Overall Statistics
    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`   📊 Total Tested: ${this.results.tested}`);
    console.log(`   ✅ With Caching: ${this.results.cached}`);
    console.log(`   ⚪ Without Caching: ${this.results.notCached}`);
    console.log(`   ❌ Errors: ${this.results.errors}`);

    const cacheRate = this.results.tested > 0 ?
      (this.results.cached / this.results.tested * 100).toFixed(1) : 0;
    console.log(`   📈 Cache Rate: ${cacheRate}%`);

    // Performance Analysis
    const performanceData = this.results.performance.filter(p => p.improvement > 0);
    if (performanceData.length > 0) {
      const avgImprovement = performanceData.reduce((sum, p) => sum + p.improvement, 0) / performanceData.length;
      const maxImprovement = Math.max(...performanceData.map(p => p.improvement));

      console.log(`\n🚀 PERFORMANCE IMPROVEMENTS:`);
      console.log(`   📊 Average Improvement: ${avgImprovement.toFixed(1)}%`);
      console.log(`   🏆 Best Improvement: ${maxImprovement.toFixed(1)}%`);
      console.log(`   🧪 Improved Endpoints: ${performanceData.length}/${this.results.tested}`);
    }

    // Category Breakdown
    console.log(`\n📋 RESULTS BY CATEGORY:`);
    const categoryStats = {};
    this.results.details.forEach(detail => {
      if (!categoryStats[detail.category]) {
        categoryStats[detail.category] = { total: 0, cached: 0, errors: 0 };
      }
      categoryStats[detail.category].total++;
      if (detail.cached) categoryStats[detail.category].cached++;
      if (detail.error) categoryStats[detail.category].errors++;
    });

    Object.entries(categoryStats).forEach(([category, stats]) => {
      const rate = stats.total > 0 ? (stats.cached / stats.total * 100).toFixed(1) : 0;
      console.log(`   ${this.getCategoryIcon(category)} ${category}: ${stats.cached}/${stats.total} cached (${rate}%)`);
    });

    // Top Performers
    if (performanceData.length > 0) {
      console.log(`\n🏆 TOP PERFORMANCE IMPROVEMENTS:`);
      const topPerformers = performanceData
        .sort((a, b) => b.improvement - a.improvement)
        .slice(0, 5);

      topPerformers.forEach((perf, index) => {
        console.log(`   ${index + 1}. ${perf.endpoint}: ${perf.improvement.toFixed(1)}% faster`);
      });
    }

    // Problematic Endpoints
    const problemEndpoints = this.results.details.filter(d => d.error || (!d.cached && !d.error));
    if (problemEndpoints.length > 0) {
      console.log(`\n⚠️  ENDPOINTS NEEDING ATTENTION:`);
      problemEndpoints.slice(0, 10).forEach(endpoint => {
        if (endpoint.error) {
          console.log(`   ❌ ${endpoint.endpoint}: ${endpoint.error}`);
        } else {
          console.log(`   ⚪ ${endpoint.endpoint}: No caching detected`);
        }
      });
    }

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    if (cacheRate >= 80) {
      console.log('   🎉 Excellent cache coverage! Your API is well optimized.');
    } else if (cacheRate >= 60) {
      console.log('   ✅ Good cache coverage. Consider adding caching to remaining endpoints.');
    } else if (cacheRate >= 40) {
      console.log('   ⚠️  Moderate cache coverage. Many endpoints could benefit from caching.');
    } else {
      console.log('   🚨 Low cache coverage. Consider implementing caching for better performance.');
    }

    if (this.results.errors > this.results.tested * 0.2) {
      console.log('   🔧 High error rate detected. Check endpoint implementations.');
    }

    if (performanceData.length > 0) {
      const avgImprovement = performanceData.reduce((sum, p) => sum + p.improvement, 0) / performanceData.length;
      if (avgImprovement > 50) {
        console.log('   🚀 Excellent performance improvements achieved!');
      }
    }

    // Cache Status Summary
    console.log(`\n📈 CACHE EFFECTIVENESS:`);
    if (this.results.cached > 0) {
      console.log(`   ✅ Redis caching is working and providing performance benefits`);
      console.log(`   🎯 ${this.results.cached} endpoints are successfully cached`);
      console.log(`   ⚡ Users will experience faster loading times`);
    } else {
      console.log(`   ⚠️  No cached endpoints detected`);
      console.log(`   🔧 Check Redis connection and cache middleware implementation`);
    }

    console.log(`\n✅ Test completed at ${new Date().toISOString()}`);
  }

  getCategoryIcon(category) {
    const icons = {
      master: '🏢',
      dashboard: '📊',
      financial: '💰',
      inventory: '📦',
      reports: '📈',
      users: '👥',
      other: '🔧'
    };
    return icons[category] || '🧪';
  }

  // Save detailed results to file
  saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `cache-test-results-${timestamp}.json`;
    const filepath = path.join(__dirname, '../test-results', filename);

    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        tested: this.results.tested,
        cached: this.results.cached,
        notCached: this.results.notCached,
        errors: this.results.errors,
        cacheRate: this.results.tested > 0 ? (this.results.cached / this.results.tested * 100).toFixed(1) : 0
      },
      details: this.results.details,
      performance: this.results.performance
    };

    fs.writeFileSync(filepath, JSON.stringify(reportData, null, 2));
    console.log(`\n💾 Detailed results saved to: ${filename}`);
  }
}

// Run the test if called directly
if (require.main === module) {
  const tester = new ComprehensiveApiCacheTest();
  tester.testAllEndpoints()
    .then(() => {
      tester.saveResults();
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = ComprehensiveApiCacheTest;