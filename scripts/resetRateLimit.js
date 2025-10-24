// scripts/resetRateLimit.js
// Script สำหรับ reset rate limiter ในกรณีที่ถูก block

const Redis = require('ioredis');

async function resetRateLimit() {
  try {
    // ถ้าใช้ Redis
    if (process.env.REDIS_URL) {
      const redis = new Redis(process.env.REDIS_URL);

      // ลบ rate limit keys
      const keys = await redis.keys('rl:*');
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`✅ Deleted ${keys.length} rate limit keys from Redis`);
      } else {
        console.log('ℹ️ No rate limit keys found in Redis');
      }

      await redis.quit();
    } else {
      console.log('ℹ️ No Redis configured - rate limits are in memory and will reset on server restart');
    }

    console.log('✅ Rate limit reset completed');
  } catch (error) {
    console.error('❌ Error resetting rate limit:', error);
  }
}

// เรียกใช้ถ้า run โดยตรง
if (require.main === module) {
  resetRateLimit();
}

module.exports = resetRateLimit;
