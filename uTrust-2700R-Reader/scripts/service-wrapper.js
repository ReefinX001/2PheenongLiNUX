/**
 * Windows Service Wrapper for uTrust 2700 R Smart Card Reader
 *
 * @author 2 Pheenong Mobile Co., Ltd.
 * @version 1.0.0
 */

const Service = require('node-windows').Service;
const path = require('path');
const fs = require('fs');
const config = require('../config/default.json');

class CardReaderWindowsService {
  constructor() {
    this.serviceName = config.service.name || 'uTrust-2700R-CardReader-Service';
    this.displayName = config.service.displayName || 'uTrust 2700 R Smart Card Reader Service';
    this.description = config.service.description || 'Service for reading Thai ID cards using uTrust 2700 R Smart Card Reader';
    this.scriptPath = path.join(__dirname, '../src/server.js');
    this.nodeOptions = [];
    this.env = [
      {
        name: 'NODE_ENV',
        value: process.env.NODE_ENV || 'production'
      },
      {
        name: 'SERVICE_MODE',
        value: 'true'
      }
    ];

    this.service = new Service({
      name: this.serviceName,
      description: this.description,
      script: this.scriptPath,
      nodeOptions: this.nodeOptions,
      env: this.env,
      workingDirectory: path.dirname(this.scriptPath),
      allowServiceLogon: true,
      startType: 'Automatic',
      wait: 2,
      grow: 0.5,
      maxRestarts: 5,
      maxRestartDelay: 60000,
      abortOnError: false
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Service installation events
    this.service.on('install', () => {
      console.log('✅ Service installed successfully');
      console.log(`📋 Service Name: ${this.serviceName}`);
      console.log(`📄 Display Name: ${this.displayName}`);
      console.log(`📝 Description: ${this.description}`);
      console.log('\n🎯 Next steps:');
      console.log('   npm run start-service    # Start the service');
      console.log('   npm run service-status   # Check service status');
      console.log('   services.msc             # Open Windows Services Manager');
    });

    this.service.on('uninstall', () => {
      console.log('✅ Service uninstalled successfully');
      console.log('📋 Service removed from Windows Services');
    });

    // Service runtime events
    this.service.on('start', () => {
      console.log('🚀 Service started successfully');
      console.log(`📡 API Server: http://localhost:${config.service.port}`);
    });

    this.service.on('stop', () => {
      console.log('⏹️ Service stopped');
    });

    this.service.on('restart', () => {
      console.log('🔄 Service restarted');
    });

    // Error handling
    this.service.on('error', (error) => {
      console.error('❌ Service error:', error);
      this.logError('Service Error', error);
    });

    this.service.on('invalidinstallation', () => {
      console.error('❌ Invalid installation detected');
      this.logError('Invalid Installation', 'Service installation is corrupted or invalid');
    });

    this.service.on('alreadyinstalled', () => {
      console.warn('⚠️ Service is already installed');
      console.log('💡 Use "npm run uninstall-service" to remove it first');
    });

    this.service.on('alreadyuninstalled', () => {
      console.warn('⚠️ Service is already uninstalled');
    });
  }

  async install() {
    try {
      console.log('🔧 Installing uTrust 2700 R Card Reader Service...');
      console.log(`📂 Script Path: ${this.scriptPath}`);

      // Check if script exists
      if (!fs.existsSync(this.scriptPath)) {
        throw new Error(`Server script not found: ${this.scriptPath}`);
      }

      // Check if service is already installed
      if (this.service.exists) {
        console.log('⚠️ Service already exists. Uninstalling first...');
        await this.uninstall();
        // Wait for uninstall to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Install the service
      this.service.install();

    } catch (error) {
      console.error('❌ Service installation failed:', error.message);
      this.logError('Installation Failed', error);
      throw error;
    }
  }

  async uninstall() {
    try {
      console.log('🗑️ Uninstalling uTrust 2700 R Card Reader Service...');

      if (!this.service.exists) {
        console.log('ℹ️ Service is not installed');
        return;
      }

      // Stop service first if running
      if (this.service.status === 'running') {
        console.log('⏹️ Stopping service before uninstall...');
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      this.service.uninstall();

    } catch (error) {
      console.error('❌ Service uninstall failed:', error.message);
      this.logError('Uninstall Failed', error);
      throw error;
    }
  }

  async start() {
    try {
      console.log('🚀 Starting uTrust 2700 R Card Reader Service...');

      if (!this.service.exists) {
        throw new Error('Service is not installed. Run "npm run install-service" first.');
      }

      if (this.service.status === 'running') {
        console.log('ℹ️ Service is already running');
        return;
      }

      this.service.start();

      // Wait for service to start
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if service started successfully
      const status = this.getStatus();
      if (status.state === 'running') {
        console.log('✅ Service started successfully');
        console.log(`📡 API Server: http://localhost:${config.service.port}`);
      } else {
        console.log('⚠️ Service may not have started properly. Check logs for details.');
      }

    } catch (error) {
      console.error('❌ Service start failed:', error.message);
      this.logError('Start Failed', error);
      throw error;
    }
  }

  async stop() {
    try {
      console.log('⏹️ Stopping uTrust 2700 R Card Reader Service...');

      if (!this.service.exists) {
        console.log('ℹ️ Service is not installed');
        return;
      }

      if (this.service.status === 'stopped') {
        console.log('ℹ️ Service is already stopped');
        return;
      }

      this.service.stop();

      // Wait for service to stop
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Service stopped successfully');

    } catch (error) {
      console.error('❌ Service stop failed:', error.message);
      this.logError('Stop Failed', error);
      throw error;
    }
  }

  async restart() {
    try {
      console.log('🔄 Restarting uTrust 2700 R Card Reader Service...');

      await this.stop();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.start();

      console.log('✅ Service restarted successfully');

    } catch (error) {
      console.error('❌ Service restart failed:', error.message);
      this.logError('Restart Failed', error);
      throw error;
    }
  }

  getStatus() {
    try {
      const exists = this.service.exists;
      const status = exists ? this.service.status : 'not_installed';
      const pid = exists ? this.service.pid : null;

      return {
        serviceName: this.serviceName,
        displayName: this.displayName,
        exists,
        state: status,
        pid,
        description: this.description,
        scriptPath: this.scriptPath
      };

    } catch (error) {
      console.error('❌ Failed to get service status:', error.message);
      return {
        serviceName: this.serviceName,
        displayName: this.displayName,
        exists: false,
        state: 'unknown',
        pid: null,
        error: error.message
      };
    }
  }

  logError(title, error) {
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const errorLog = path.join(logDir, 'service-error.log');
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.stack : error;

    const logEntry = `[${timestamp}] ${title}: ${errorMessage}\n`;

    try {
      fs.appendFileSync(errorLog, logEntry);
    } catch (logError) {
      console.error('Failed to write to error log:', logError.message);
    }
  }
}

module.exports = CardReaderWindowsService;