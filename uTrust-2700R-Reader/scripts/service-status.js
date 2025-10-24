/**
 * Check Status of uTrust 2700 R Smart Card Reader Windows Service
 *
 * @author 2 Pheenong Mobile Co., Ltd.
 * @version 1.0.0
 */

const CardReaderWindowsService = require('./service-wrapper');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

async function checkServiceStatus() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('📊 uTrust 2700 R Smart Card Reader - Service Status');
    console.log('🏢 2 Pheenong Mobile Co., Ltd.');
    console.log('='.repeat(60));

    // Create service instance
    const serviceManager = new CardReaderWindowsService();

    // Get service status
    const status = serviceManager.getStatus();
    console.log('📋 Windows Service Status:');
    console.log(`   Service Name: ${status.serviceName}`);
    console.log(`   Display Name: ${status.displayName}`);
    console.log(`   Exists: ${status.exists ? '✅ Yes' : '❌ No'}`);
    console.log(`   State: ${getStatusIcon(status.state)} ${status.state}`);
    console.log(`   PID: ${status.pid || 'N/A'}`);
    console.log(`   Description: ${status.description}`);
    console.log('');

    if (!status.exists) {
      console.log('❌ Service is not installed');
      console.log('');
      console.log('🎯 To install the service:');
      console.log('   npm run install-service');
      return;
    }

    // Check API accessibility if service is running
    let apiStatus = null;
    if (status.state === 'running') {
      console.log('🌐 API Server Status:');
      try {
        const response = await axios.get('http://localhost:3999/health', {
          timeout: 5000
        });

        if (response.status === 200) {
          apiStatus = response.data;
          console.log('   📡 API Server: ✅ Accessible');
          console.log('   🔍 Health Check: ✅ Passed');
          console.log('   🌐 URL: http://localhost:3999');
          console.log('   📝 Version:', apiStatus.data?.version || 'Unknown');
        } else {
          console.log('   📡 API Server: ⚠️ Unexpected response');
        }
      } catch (error) {
        console.log('   📡 API Server: ❌ Not accessible');
        console.log('   🔍 Health Check: ❌ Failed');
        console.log('   💡 Reason:', error.code || error.message);
      }
      console.log('');
    }

    // Check log files
    console.log('📄 Log Files:');
    const logDir = path.join(__dirname, '../logs');

    if (fs.existsSync(logDir)) {
      const logFiles = fs.readdirSync(logDir).filter(file => file.endsWith('.log'));

      if (logFiles.length > 0) {
        logFiles.forEach(file => {
          const filePath = path.join(logDir, file);
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024);
          console.log(`   📄 ${file}: ${sizeKB}KB (${stats.mtime.toLocaleString()})`);
        });
      } else {
        console.log('   📄 No log files found');
      }
    } else {
      console.log('   📄 Log directory not found');
    }
    console.log('');

    // Check configuration
    console.log('⚙️ Configuration:');
    try {
      const configPath = path.join(__dirname, '../config/default.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(`   🔧 Service Port: ${config.service.port}`);
        console.log(`   🔧 Host: ${config.service.host}`);
        console.log(`   🔧 Card Reader: ${config.cardReader.model}`);
        console.log(`   🔧 Auto Connect: ${config.cardReader.autoConnect ? '✅ Yes' : '❌ No'}`);
      } else {
        console.log('   ⚠️ Configuration file not found');
      }
    } catch (error) {
      console.log('   ❌ Failed to read configuration:', error.message);
    }
    console.log('');

    // Show available endpoints if service is running
    if (status.state === 'running' && apiStatus) {
      console.log('🎯 Available Endpoints:');
      console.log('   GET|POST /read-card     # Read Thai ID card');
      console.log('   GET /health            # Service health check');
      console.log('   GET /api/status        # Reader status');
      console.log('   GET /api/config        # Service configuration');
      console.log('');
    }

    // Service management commands
    console.log('📋 Service Management Commands:');
    if (status.state === 'running') {
      console.log('   npm run stop-service       # Stop the service');
      console.log('   npm run restart-service    # Restart the service');
    } else if (status.state === 'stopped') {
      console.log('   npm run start-service      # Start the service');
    }
    console.log('   npm run service-status     # Check service status');
    console.log('   npm run uninstall-service  # Uninstall the service');
    console.log('   services.msc              # Open Windows Services Manager');
    console.log('');

    // Show service recommendations
    if (status.state === 'stopped') {
      console.log('💡 Recommendations:');
      console.log('   • Start the service to begin accepting card reader requests');
      console.log('   • Verify the card reader is connected and drivers are installed');
    } else if (status.state === 'running' && !apiStatus) {
      console.log('💡 Recommendations:');
      console.log('   • Check if port 3999 is blocked by firewall');
      console.log('   • Verify no other process is using port 3999');
      console.log('   • Check service logs for error details');
    }

  } catch (error) {
    console.error('❌ Failed to check service status:', error.message);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  }
}

function getStatusIcon(state) {
  switch (state) {
    case 'running':
      return '🟢';
    case 'stopped':
      return '🔴';
    case 'starting':
      return '🟡';
    case 'stopping':
      return '🟠';
    case 'not_installed':
      return '❌';
    default:
      return '❓';
  }
}

// Run the status check
if (require.main === module) {
  checkServiceStatus();
}

module.exports = { checkServiceStatus };