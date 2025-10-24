/**
 * Configuration Manager for uTrust 2700 R Smart Card Reader Service
 *
 * @author 2 Pheenong Mobile Co., Ltd.
 * @version 1.0.0
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

class ConfigManager {
  constructor() {
    this.config = {};
    this.branchConfig = {};
    this.currentBranch = null;
    this.configDir = path.join(process.cwd(), 'config');
  }

  /**
   * Initialize configuration
   */
  async initialize() {
    try {
      console.log('🔧 Loading configuration...');

      // Load default configuration
      await this.loadDefaultConfig();

      // Load branch configuration
      await this.loadBranchConfig();

      // Detect current branch
      await this.detectCurrentBranch();

      // Apply environment overrides
      this.applyEnvironmentOverrides();

      console.log(`✅ Configuration loaded for branch: ${this.currentBranch?.name || 'Unknown'}`);

    } catch (error) {
      console.error('❌ Failed to initialize configuration:', error.message);
      throw error;
    }
  }

  /**
   * Load default configuration
   */
  async loadDefaultConfig() {
    const defaultConfigPath = path.join(this.configDir, 'default.json');

    if (fs.existsSync(defaultConfigPath)) {
      const defaultConfig = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'));
      this.config = { ...defaultConfig };
      console.log('📋 Default configuration loaded');
    } else {
      throw new Error('Default configuration file not found');
    }
  }

  /**
   * Load branch configuration
   */
  async loadBranchConfig() {
    const branchConfigPath = path.join(this.configDir, 'branches.json');

    if (fs.existsSync(branchConfigPath)) {
      this.branchConfig = JSON.parse(fs.readFileSync(branchConfigPath, 'utf8'));
      console.log('🏢 Branch configuration loaded');
    } else {
      console.warn('⚠️ Branch configuration file not found, using defaults');
      this.branchConfig = { branches: {} };
    }
  }

  /**
   * Detect current branch based on IP address
   */
  async detectCurrentBranch() {
    try {
      // Get local IP addresses
      const networkInterfaces = os.networkInterfaces();
      const localIPs = [];

      for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
          if (!iface.internal && iface.family === 'IPv4') {
            localIPs.push(iface.address);
          }
        }
      }

      console.log('🌐 Detected local IPs:', localIPs);

      // Match with branch configuration
      for (const [branchKey, branchData] of Object.entries(this.branchConfig.branches || {})) {
        if (localIPs.includes(branchData.clientIP) || localIPs.includes(branchData.serverIP)) {
          this.currentBranch = { key: branchKey, ...branchData };
          console.log(`🎯 Detected branch: ${branchData.name} (${branchData.clientIP})`);
          return;
        }
      }

      // Fallback to headquarters or manual configuration
      const fallback = this.branchConfig.currentBranch?.fallback || 'headquarters';
      if (this.branchConfig.branches[fallback]) {
        this.currentBranch = {
          key: fallback,
          ...this.branchConfig.branches[fallback],
          detected: false
        };
        console.log(`⚠️ Branch auto-detection failed, using fallback: ${this.currentBranch.name}`);
      } else {
        console.warn('⚠️ Could not detect branch, using default configuration');
      }

    } catch (error) {
      console.error('❌ Branch detection failed:', error.message);
    }
  }

  /**
   * Apply environment variable overrides
   */
  applyEnvironmentOverrides() {
    // Port override
    if (process.env.PORT) {
      this.config.service.port = parseInt(process.env.PORT);
    }

    // Host override
    if (process.env.HOST) {
      this.config.service.host = process.env.HOST;
    }

    // Log level override
    if (process.env.LOG_LEVEL) {
      this.config.logging.level = process.env.LOG_LEVEL;
    }

    // Branch override
    if (process.env.BRANCH) {
      const branchOverride = this.branchConfig.branches[process.env.BRANCH];
      if (branchOverride) {
        this.currentBranch = { key: process.env.BRANCH, ...branchOverride };
        console.log(`🔧 Branch overridden by environment: ${this.currentBranch.name}`);
      }
    }

    console.log('🔧 Environment overrides applied');
  }

  /**
   * Get configuration value by path
   */
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let current = this.config;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * Set configuration value by path
   */
  set(path, value) {
    const keys = path.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Get current branch information
   */
  getCurrentBranch() {
    return this.currentBranch;
  }

  /**
   * Get branch by key
   */
  getBranch(branchKey) {
    return this.branchConfig.branches[branchKey] || null;
  }

  /**
   * Get all branches
   */
  getAllBranches() {
    return this.branchConfig.branches || {};
  }

  /**
   * Check if feature is enabled for current branch
   */
  isFeatureEnabled(featureName) {
    if (!this.currentBranch || !this.currentBranch.features) {
      return false;
    }
    return this.currentBranch.features[featureName] === true;
  }

  /**
   * Get allowed IPs including current branch IPs
   */
  getAllowedIPs() {
    const defaultIPs = this.get('network.security.allowedIPs', []);
    const branchIPs = [];

    // Add current branch IPs
    if (this.currentBranch) {
      if (this.currentBranch.clientIP) branchIPs.push(this.currentBranch.clientIP);
      if (this.currentBranch.serverIP) branchIPs.push(this.currentBranch.serverIP);
    }

    // Add all active branch IPs
    for (const branch of Object.values(this.branchConfig.branches || {})) {
      if (branch.active) {
        if (branch.clientIP) branchIPs.push(branch.clientIP);
        if (branch.serverIP) branchIPs.push(branch.serverIP);
      }
    }

    return [...new Set([...defaultIPs, ...branchIPs])];
  }

  /**
   * Get CORS origins including branch URLs
   */
  getCORSOrigins() {
    const defaultOrigins = this.get('service.cors.origin', []);
    const branchOrigins = [];

    // Add current branch origins
    if (this.currentBranch) {
      const port = this.get('service.port', 3999);
      if (this.currentBranch.clientIP) {
        branchOrigins.push(`http://${this.currentBranch.clientIP}:${port}`);
        branchOrigins.push(`http://${this.currentBranch.clientIP}:3000`);
        branchOrigins.push(`http://${this.currentBranch.clientIP}:8080`);
      }
      if (this.currentBranch.serverIP) {
        branchOrigins.push(`http://${this.currentBranch.serverIP}:${port}`);
        branchOrigins.push(`http://${this.currentBranch.serverIP}:3000`);
        branchOrigins.push(`http://${this.currentBranch.serverIP}:8080`);
      }
    }

    return [...new Set([...defaultOrigins, ...branchOrigins])];
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];

    // Check required fields
    if (!this.get('service.port')) {
      errors.push('service.port is required');
    }

    if (!this.get('service.host')) {
      errors.push('service.host is required');
    }

    if (!this.get('cardReader.model')) {
      errors.push('cardReader.model is required');
    }

    // Check port range
    const port = this.get('service.port');
    if (port < 1 || port > 65535) {
      errors.push('service.port must be between 1 and 65535');
    }

    // Check timeouts
    const timeout = this.get('cardReader.timeout');
    if (timeout < 1000 || timeout > 300000) {
      errors.push('cardReader.timeout must be between 1000 and 300000ms');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Save current configuration to file
   */
  async saveConfig() {
    try {
      const configPath = path.join(this.configDir, 'runtime.json');
      const runtimeConfig = {
        ...this.config,
        currentBranch: this.currentBranch,
        savedAt: new Date().toISOString()
      };

      fs.writeFileSync(configPath, JSON.stringify(runtimeConfig, null, 2));
      console.log('💾 Configuration saved to runtime.json');

    } catch (error) {
      console.error('❌ Failed to save configuration:', error.message);
      throw error;
    }
  }

  /**
   * Get configuration summary for debugging
   */
  getSummary() {
    return {
      service: {
        name: this.get('service.name'),
        port: this.get('service.port'),
        host: this.get('service.host')
      },
      branch: this.currentBranch ? {
        key: this.currentBranch.key,
        name: this.currentBranch.name,
        clientIP: this.currentBranch.clientIP,
        active: this.currentBranch.active
      } : null,
      cardReader: {
        model: this.get('cardReader.model'),
        manufacturer: this.get('cardReader.manufacturer'),
        timeout: this.get('cardReader.timeout')
      },
      features: this.currentBranch?.features || {},
      allowedIPs: this.getAllowedIPs(),
      corsOrigins: this.getCORSOrigins()
    };
  }
}

// Create singleton instance
const configManager = new ConfigManager();

module.exports = configManager;