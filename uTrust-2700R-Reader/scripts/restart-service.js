/**
 * Restart uTrust 2700 R Smart Card Reader Windows Service
 *
 * @author 2 Pheenong Mobile Co., Ltd.
 * @version 1.0.0
 */

const CardReaderWindowsService = require('./service-wrapper');

async function restartService() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 uTrust 2700 R Smart Card Reader - Restart Service');
    console.log('🏢 2 Pheenong Mobile Co., Ltd.');
    console.log('='.repeat(60));

    // Create service instance
    const serviceManager = new CardReaderWindowsService();

    // Check current status
    const currentStatus = serviceManager.getStatus();
    console.log('📋 Current Service Status:');
    console.log(`   Exists: ${currentStatus.exists ? '✅ Yes' : '❌ No'}`);
    console.log(`   State: ${currentStatus.state}`);
    console.log(`   PID: ${currentStatus.pid || 'N/A'}`);
    console.log('');

    if (!currentStatus.exists) {
      console.error('❌ Service is not installed');
      console.log('📋 Please install the service first:');
      console.log('   npm run install-service');
      process.exit(1);
    }

    // Restart the service
    console.log('🔄 Restarting Windows Service...');
    await serviceManager.restart();

    // Wait for service to restart
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check final status
    const finalStatus = serviceManager.getStatus();
    console.log('');
    console.log('📊 Service Status After Restart:');
    console.log(`   Exists: ${finalStatus.exists ? '✅ Yes' : '❌ No'}`);
    console.log(`   State: ${finalStatus.state}`);
    console.log(`   PID: ${finalStatus.pid || 'N/A'}`);

    if (finalStatus.state === 'running') {
      console.log('');
      console.log('✅ Service restarted successfully!');
      console.log('');
      console.log('🌐 Service Information:');
      console.log(`   📡 API Server: http://localhost:3999`);
      console.log(`   🔍 Health Check: http://localhost:3999/health`);
      console.log(`   📖 API Documentation: http://localhost:3999/`);
      console.log('');
      console.log('🎯 Available Endpoints:');
      console.log('   GET|POST /read-card     # Read Thai ID card');
      console.log('   GET /health            # Service health check');
      console.log('   GET /api/status        # Reader status');
      console.log('   GET /api/config        # Service configuration');
      console.log('');
      console.log('📋 Service Management:');
      console.log('   npm run service-status     # Check service status');
      console.log('   npm run stop-service       # Stop the service');
      console.log('   npm run restart-service    # Restart the service');

    } else {
      console.error('❌ Service failed to restart');
      console.log('📋 Current state:', finalStatus.state);
      console.log('💡 Try:');
      console.log('   1. Check the service logs');
      console.log('   2. Verify all dependencies are installed');
      console.log('   3. Ensure no other process is using port 3999');
      console.log('   4. Run "npm run service-status" for more details');
      console.log('   5. Manual restart: npm run stop-service && npm run start-service');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Failed to restart service:', error.message);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the restart
if (require.main === module) {
  restartService();
}

module.exports = { restartService };