/**
 * Uninstall uTrust 2700 R Smart Card Reader Windows Service
 *
 * @author 2 Pheenong Mobile Co., Ltd.
 * @version 1.0.0
 */

const CardReaderWindowsService = require('./service-wrapper');
const path = require('path');
const fs = require('fs');

async function uninstallService() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🗑️ uTrust 2700 R Smart Card Reader - Service Uninstallation');
    console.log('🏢 2 Pheenong Mobile Co., Ltd.');
    console.log('='.repeat(60));

    // Check if running as administrator
    if (!isRunningAsAdmin()) {
      console.error('❌ This script must be run as Administrator');
      console.log('📋 Please:');
      console.log('   1. Right-click on Command Prompt');
      console.log('   2. Select "Run as Administrator"');
      console.log('   3. Navigate to this directory');
      console.log('   4. Run "npm run uninstall-service" again');
      process.exit(1);
    }

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
      console.log('ℹ️ Service is not installed');
      console.log('✅ Nothing to uninstall');
      return;
    }

    // Confirm uninstallation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('❓ Are you sure you want to uninstall the service? (y/N): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase().trim());
      });
    });

    if (answer !== 'y' && answer !== 'yes') {
      console.log('❌ Uninstallation cancelled');
      return;
    }

    console.log('🗑️ Uninstalling Windows Service...');
    await serviceManager.uninstall();

    // Wait for uninstallation to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check uninstallation status
    const finalStatus = serviceManager.getStatus();
    console.log('');
    console.log('📊 Uninstallation Status:');
    console.log(`   Exists: ${finalStatus.exists ? '❌ Still exists' : '✅ Successfully removed'}`);
    console.log(`   State: ${finalStatus.state}`);

    if (!finalStatus.exists) {
      console.log('');
      console.log('✅ Service uninstalled successfully!');
      console.log('');
      console.log('📋 Service has been completely removed from Windows Services');
      console.log('');
      console.log('💡 To reinstall the service:');
      console.log('   npm run install-service');

    } else {
      console.error('❌ Service uninstallation failed');
      console.log('📋 The service may still be running or locked');
      console.log('💡 Try:');
      console.log('   1. Stop the service first: npm run stop-service');
      console.log('   2. Wait a few seconds');
      console.log('   3. Try uninstalling again');
      console.log('   4. Or manually remove it from services.msc');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Uninstallation failed:', error.message);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  }
}

function isRunningAsAdmin() {
  try {
    // Try to access a system directory that requires admin rights
    const testDir = 'C:\\Windows\\System32\\config\\systemprofile';
    fs.accessSync(testDir, fs.constants.R_OK);
    return true;
  } catch (error) {
    return false;
  }
}

// Run the uninstallation
if (require.main === module) {
  uninstallService();
}

module.exports = { uninstallService };