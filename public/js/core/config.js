// Application configuration
export function loadConfiguration() {
  return {
    apiUrl: window.API_URL || '/api',
    environment: window.ENV || 'production',
    debug: window.DEBUG || false
  };
}