/**
 * Network Service for uTrust 2700 R Card Reader
 * Handles network configuration and monitoring
 */

const { exec } = require('child_process');
const logger = require('../utils/logger');
const config = require('../config/config-manager');

class NetworkService {
  constructor() {
    this.isInitialized = false;
    this.tailscaleStatus = null;
    this.networkInfo = null;
  }

  /**
   * Initialize network service
   */
  async initialize() {
    try {
      logger.info('Initializing network service...');

      // Check Tailscale status
      await this.checkTailscaleStatus();

      // Get network information
      await this.getNetworkInfo();

      this.isInitialized = true;
      logger.info('Network service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize network service', { error: error.message });
      // Don't throw error, allow service to continue without network features
    }
  }

  /**
   * Check Tailscale status
   */
  async checkTailscaleStatus() {
    return new Promise((resolve) => {
      if (!config.get('network.tailscale.enabled')) {
        this.tailscaleStatus = { enabled: false, connected: false };
        resolve();
        return;
      }

             exec('tailscale status', (error, stdout) => {
         if (error) {
           logger.warn('Tailscale not available or not running', { error: error.message });
           this.tailscaleStatus = { enabled: false, connected: false, error: error.message };
         } else {
          this.tailscaleStatus = {
            enabled: true,
            connected: !stdout.includes('not running'),
            output: stdout
          };
          logger.info('Tailscale status checked', { connected: this.tailscaleStatus.connected });
        }
        resolve();
      });
    });
  }

  /**
   * Get network information
   */
  async getNetworkInfo() {
    return new Promise((resolve) => {
             exec('ipconfig', (error, stdout) => {
         if (error) {
           logger.warn('Failed to get network info', { error: error.message });
           this.networkInfo = { error: error.message };
         } else {
          this.networkInfo = {
            timestamp: new Date().toISOString(),
            raw: stdout
          };
          logger.info('Network information retrieved');
        }
        resolve();
      });
    });
  }

  /**
   * Get network status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      tailscale: this.tailscaleStatus,
      networkInfo: this.networkInfo,
      configuration: {
        enabled: config.get('network.tailscale.enabled'),
        serverIP: config.get('network.tailscale.serverIP'),
        allowedIPs: config.get('network.security.allowedIPs')
      }
    };
  }

  /**
   * Cleanup network service
   */
  async cleanup() {
    logger.info('Cleaning up network service...');
    this.isInitialized = false;
    this.tailscaleStatus = null;
    this.networkInfo = null;
  }
}

// Create singleton instance
const networkService = new NetworkService();

module.exports = networkService;