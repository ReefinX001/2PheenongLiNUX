// Main Application Bundle
// This file will be bundled by webpack

// Core application modules
import { initializeApp } from './core/initialize';
import { setupEventListeners } from './core/events';
import { loadConfiguration } from './core/config';

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  console.log('Application initializing...');
  
  // Load configuration
  const config = loadConfiguration();
  
  // Initialize app with config
  initializeApp(config);
  
  // Setup global event listeners
  setupEventListeners();
  
  console.log('Application ready');
});

// Export for use in other modules
export default {
  version: '1.0.0',
  initialized: true
};