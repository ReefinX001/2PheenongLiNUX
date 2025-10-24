// Cron jobs setup for the application
const cron = require('node-cron');

function setupCronJobs() {
  console.log('⏰ Setting up cron jobs...');

  // Example: Run every day at 2 AM to clean up old logs
  cron.schedule('0 2 * * *', () => {
    console.log('🧹 Running daily cleanup job at 2 AM');
    // Add cleanup logic here
  });

  // Example: Run every hour to sync data
  cron.schedule('0 * * * *', () => {
    console.log('🔄 Running hourly sync job');
    // Add sync logic here
  });

  // Example: Run every 5 minutes for health checks
  cron.schedule('*/5 * * * *', () => {
    console.log('💓 Health check - Server is running');
  });

  console.log('✅ Cron jobs initialized successfully');
}

module.exports = setupCronJobs;
