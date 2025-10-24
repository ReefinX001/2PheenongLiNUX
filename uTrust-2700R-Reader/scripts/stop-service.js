/**
 * Stop uTrust 2700 R Smart Card Reader Windows Service
 *
 * @author 2 Pheenong Mobile Co., Ltd.
 * @version 1.0.0
 */

const CardReaderWindowsService = require('./service-wrapper');

async function stopService() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('⏹️ uTrust 2700 R Smart Card Reader - Stop Service');
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

    if (currentStatus.state === 'stopped') {
      console.log('ℹ️ Service is already stopped');
      console.log('💡 To start the service:');
      console.log('   npm run start-service');
      return;
    }

    if (currentStatus.state !== 'running') {
      console.log(`ℹ️ Service is in ${currentStatus.state} state`);
      console.log('💡 Service is not running, nothing to stop');
      return;
    }

    // Stop the service
    console.log('⏹️ Stopping Windows Service...');
    await serviceManager.stop();

    // Wait for service to stop
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check final status
    const finalStatus = serviceManager.getStatus();
    console.log('');
    console.log('📊 Service Status After Stop:');
    console.log(`   Exists: ${finalStatus.exists ? '✅ Yes' : '❌ No'}`);
    console.log(`   State: ${finalStatus.state}`);
    console.log(`   PID: ${finalStatus.pid || 'N/A'}`);

    if (finalStatus.state === 'stopped') {
      console.log('');
      console.log('✅ Service stopped successfully!');
      console.log('');
      console.log('📋 Service Management:');
      console.log('   npm run start-service      # Start the service');
      console.log('   npm run service-status     # Check service status');
      console.log('   npm run restart-service    # Restart the service');

    } else {
      console.error('❌ Service failed to stop');
      console.log('📋 Current state:', finalStatus.state);
      console.log('💡 Try:');
      console.log('   1. Force stop using Windows Services Manager (services.msc)');
      console.log('   2. Check if the process is still running');
      console.log('   3. Restart the system if necessary');
      console.log('   4. Run "npm run service-status" for more details');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Failed to stop service:', error.message);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the stop
if (require.main === module) {
  stopService();
}

module.exports = { stopService };