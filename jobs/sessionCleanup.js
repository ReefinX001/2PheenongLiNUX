// jobs/sessionCleanup.js
const cron = require('node-cron');
const User = require('../models/User/User');

// Run cleanup every 5 minutes
const startSessionCleanupJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('Running session cleanup job...');

      // Find users with inactive sessions (no activity for 30 minutes)
      const inactiveThreshold = new Date(Date.now() - 30 * 60 * 1000);

      const users = await User.find({
        $or: [
          { 'currentSession.lastActivity': { $lt: inactiveThreshold } },
          { isOnline: true, lastSeen: { $lt: inactiveThreshold } }
        ]
      });

      let cleanedCount = 0;

      for (const user of users) {
        let hasChanges = false;

        // Check if current session is inactive
        if (user.currentSession && user.currentSession.lastActivity < inactiveThreshold) {
          // Log out user with timeout reason
          await user.logout('timeout');
          hasChanges = true;
        }

        // Check if user has been offline for too long but still marked as online
        if (user.isOnline && user.lastSeen < inactiveThreshold && !user.currentSession) {
          user.isOnline = false;
          user.lastSeen = new Date();
          hasChanges = true;
        }

        if (hasChanges) {
          await user.save();
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} users with inactive sessions`);
      }

    } catch (err) {
      console.error('Session cleanup job error:', err);
    }
  });

  console.log('Session cleanup job started (runs every 5 minutes)');
};

// Export for use in main app
module.exports = { startSessionCleanupJob };
