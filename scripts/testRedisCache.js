const { cacheService } = require('../config/cache');
const axios = require('axios');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TEST_ENDPOINTS = [
  '/branches',
  '/products',
  '/sales-dashboard/today-summary',
  '/sales-dashboard/branch-stats',
  '/dashboard/stats'
];

class CacheTestSuite {
  constructor() {
    this.results = {
      redis: { pass: 0, fail: 0 },
      api: { pass: 0, fail: 0 },
      performance: { tests: [] }
    };
  }

  async testRedisConnection() {
    console.log('🔗 Testing Redis connection...');

    try {
      // Test basic connection
      await cacheService.set('test:connection', { timestamp: Date.now() }, 10);
      const result = await cacheService.get('test:connection');

      if (result && result.timestamp) {
        console.log('✅ Redis connection: PASSED');
        this.results.redis.pass++;
        return true;
      } else {
        console.log('❌ Redis connection: FAILED - Data not retrieved');
        this.results.redis.fail++;
        return false;
      }
    } catch (error) {
      console.log('❌ Redis connection: FAILED -', error.message);
      this.results.redis.fail++;
      return false;
    }
  }

  async testCacheOperations() {
    console.log('\n🧪 Testing cache operations...');

    const tests = [
      {
        name: 'Set and Get',
        test: async () => {
          const testData = { id: 1, name: 'Test Data', timestamp: Date.now() };
          await cacheService.set('test:setget', testData, 10);
          const result = await cacheService.get('test:setget');
          return JSON.stringify(result) === JSON.stringify(testData);
        }
      },
      {
        name: 'TTL Expiration',
        test: async () => {
          await cacheService.set('test:ttl', { data: 'expire' }, 1);
          await new Promise(resolve => setTimeout(resolve, 1100));
          const result = await cacheService.get('test:ttl');
          return result === null;
        }
      },
      {
        name: 'Delete Operation',
        test: async () => {
          await cacheService.set('test:delete', { data: 'delete' }, 10);
          await cacheService.del('test:delete');
          const result = await cacheService.get('test:delete');
          return result === null;
        }
      },
      {
        name: 'Pattern Invalidation',
        test: async () => {
          await cacheService.set('test:pattern:1', { data: '1' }, 10);
          await cacheService.set('test:pattern:2', { data: '2' }, 10);
          await cacheService.set('test:other', { data: 'other' }, 10);

          const invalidated = await cacheService.invalidatePattern('test:pattern:*');

          const result1 = await cacheService.get('test:pattern:1');
          const result2 = await cacheService.get('test:pattern:2');
          const resultOther = await cacheService.get('test:other');

          return invalidated >= 2 && !result1 && !result2 && resultOther;
        }
      }
    ];

    for (const test of tests) {
      try {
        const passed = await test.test();
        if (passed) {
          console.log(`✅ ${test.name}: PASSED`);
          this.results.redis.pass++;
        } else {
          console.log(`❌ ${test.name}: FAILED`);
          this.results.redis.fail++;
        }
      } catch (error) {
        console.log(`❌ ${test.name}: ERROR -`, error.message);
        this.results.redis.fail++;
      }
    }
  }

  async testApiCaching() {
    console.log('\n🌐 Testing API caching...');

    for (const endpoint of TEST_ENDPOINTS) {
      try {
        console.log(`\n📊 Testing ${endpoint}`);

        // First request (cache MISS)
        const start1 = Date.now();
        const response1 = await axios.get(`${API_BASE_URL}${endpoint}`);
        const time1 = Date.now() - start1;

        if (response1.headers['x-cache'] === 'MISS' || response1.headers['x-cache-status'] === 'MISS') {
          console.log(`✅ First request: CACHE MISS (${time1}ms)`);
        } else {
          console.log(`⚠️  First request: Expected MISS, got ${response1.headers['x-cache'] || response1.headers['x-cache-status'] || 'unknown'}`);
        }

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 100));

        // Second request (cache HIT)
        const start2 = Date.now();
        const response2 = await axios.get(`${API_BASE_URL}${endpoint}`);
        const time2 = Date.now() - start2;

        if (response2.headers['x-cache'] === 'HIT' || response2.headers['x-cache-status'] === 'HIT') {
          console.log(`✅ Second request: CACHE HIT (${time2}ms)`);
          console.log(`🚀 Performance improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}%`);

          this.results.api.pass++;
          this.results.performance.tests.push({
            endpoint,
            missTime: time1,
            hitTime: time2,
            improvement: ((time1 - time2) / time1 * 100).toFixed(1)
          });
        } else {
          console.log(`❌ Second request: Expected HIT, got ${response2.headers['x-cache'] || response2.headers['x-cache-status'] || 'unknown'}`);
          this.results.api.fail++;
        }

      } catch (error) {
        console.log(`❌ ${endpoint}: ERROR -`, error.message);
        this.results.api.fail++;
      }
    }
  }

  async generateReport() {
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(50));

    console.log(`\n🔗 Redis Tests:`);
    console.log(`   ✅ Passed: ${this.results.redis.pass}`);
    console.log(`   ❌ Failed: ${this.results.redis.fail}`);
    console.log(`   📈 Success Rate: ${(this.results.redis.pass / (this.results.redis.pass + this.results.redis.fail) * 100).toFixed(1)}%`);

    console.log(`\n🌐 API Caching Tests:`);
    console.log(`   ✅ Passed: ${this.results.api.pass}`);
    console.log(`   ❌ Failed: ${this.results.api.fail}`);
    console.log(`   📈 Success Rate: ${(this.results.api.pass / (this.results.api.pass + this.results.api.fail) * 100).toFixed(1)}%`);

    if (this.results.performance.tests.length > 0) {
      console.log(`\n🚀 Performance Improvements:`);
      this.results.performance.tests.forEach(test => {
        console.log(`   ${test.endpoint}: ${test.improvement}% faster (${test.missTime}ms → ${test.hitTime}ms)`);
      });

      const avgImprovement = this.results.performance.tests.reduce((sum, test) => sum + parseFloat(test.improvement), 0) / this.results.performance.tests.length;
      console.log(`   📊 Average improvement: ${avgImprovement.toFixed(1)}%`);
    }

    // Overall status
    const totalTests = this.results.redis.pass + this.results.redis.fail + this.results.api.pass + this.results.api.fail;
    const totalPassed = this.results.redis.pass + this.results.api.pass;
    const successRate = (totalPassed / totalTests * 100).toFixed(1);

    console.log(`\n🎯 Overall Success Rate: ${successRate}%`);

    if (successRate >= 90) {
      console.log('🎉 Redis caching is working excellently!');
    } else if (successRate >= 70) {
      console.log('✅ Redis caching is working well with minor issues');
    } else {
      console.log('⚠️  Redis caching needs attention');
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Redis Cache Test Suite');
    console.log('='.repeat(50));

    await this.testRedisConnection();
    await this.testCacheOperations();
    await this.testApiCaching();
    await this.generateReport();

    console.log('\n✅ Test suite completed!');
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new CacheTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = CacheTestSuite;