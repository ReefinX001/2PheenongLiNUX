/**
 * Install uTrust 2700 R Smart Card Reader as Windows Service
 *
 * @author 2 Pheenong Mobile Co., Ltd.
 * @version 1.0.0
 */

const CardReaderWindowsService = require('./service-wrapper');
const path = require('path');
const fs = require('fs');

async function installService() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 uTrust 2700 R Smart Card Reader - Service Installation');
    console.log('🏢 2 Pheenong Mobile Co., Ltd.');
    console.log('='.repeat(60));

    // Check if running as administrator
    if (!isRunningAsAdmin()) {
      console.error('❌ This script must be run as Administrator');
      console.log('📋 Please:');
      console.log('   1. Right-click on Command Prompt');
      console.log('   2. Select "Run as Administrator"');
      console.log('   3. Navigate to this directory');
      console.log('   4. Run "npm run install-service" again');
      process.exit(1);
    }

    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`📋 Node.js Version: ${nodeVersion}`);

    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 16) {
      console.error('❌ Node.js version 16 or higher is required');
      console.log('📋 Please upgrade Node.js and try again');
      process.exit(1);
    }

    // Check if package.json exists
    const packageJsonPath = path.join(__dirname, '../package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.error('❌ package.json not found');
      console.log('📋 Please ensure you are running this from the correct directory');
      process.exit(1);
    }

    // Check if main server script exists
    const serverScriptPath = path.join(__dirname, '../src/server.js');
    if (!fs.existsSync(serverScriptPath)) {
      console.error('❌ Server script not found:', serverScriptPath);
      console.log('📋 Please ensure all files are properly installed');
      process.exit(1);
    }

    // Check if node_modules exists
    const nodeModulesPath = path.join(__dirname, '../node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.error('❌ node_modules not found');
      console.log('📋 Please run "npm install" first');
      process.exit(1);
    }

    // Check if node-windows is installed
    const nodeWindowsPath = path.join(__dirname, '../node_modules/node-windows');
    if (!fs.existsSync(nodeWindowsPath)) {
      console.error('❌ node-windows package not found');
      console.log('📋 Please run "npm install" to install dependencies');
      process.exit(1);
    }

    console.log('✅ Pre-installation checks passed');
    console.log('');

    // Create service instance
    const serviceManager = new CardReaderWindowsService();

    // Display service information
    console.log('📋 Service Information:');
    console.log(`   Name: ${serviceManager.serviceName}`);
    console.log(`   Display Name: ${serviceManager.displayName}`);
    console.log(`   Description: ${serviceManager.description}`);
    console.log(`   Script Path: ${serviceManager.scriptPath}`);
    console.log('');

    // Install the service
    console.log('🔧 Installing Windows Service...');
    await serviceManager.install();

    // Wait for installation to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check installation status
    const status = serviceManager.getStatus();
    console.log('');
    console.log('📊 Installation Status:');
    console.log(`   Exists: ${status.exists ? '✅ Yes' : '❌ No'}`);
    console.log(`   State: ${status.state}`);

    if (status.exists) {
      console.log('');
      console.log('✅ Service installed successfully!');
      console.log('');
      console.log('🎯 Next Steps:');
      console.log('   1. Start the service:');
      console.log('      npm run start-service');
      console.log('');
      console.log('   2. Check service status:');
      console.log('      npm run service-status');
      console.log('');
      console.log('   3. Open Windows Services Manager:');
      console.log('      services.msc');
      console.log('');
      console.log('   4. Test the API:');
      console.log('      http://localhost:3999/health');
      console.log('');
      console.log('📋 Service Management Commands:');
      console.log('   npm run start-service      # Start the service');
      console.log('   npm run stop-service       # Stop the service');
      console.log('   npm run restart-service    # Restart the service');
      console.log('   npm run service-status     # Check service status');
      console.log('   npm run uninstall-service  # Uninstall the service');

    } else {
      console.error('❌ Service installation failed');
      console.log('📋 Check the logs for more details');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Installation failed:', error.message);
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

// Run the installation
if (require.main === module) {
  installService();
}

module.exports = { installService };