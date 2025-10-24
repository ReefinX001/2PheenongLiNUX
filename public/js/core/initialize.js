// Application initialization
export function initializeApp(config) {
  // Setup API defaults
  if (window.axios) {
    window.axios.defaults.baseURL = config.apiUrl || '/api';
    window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
  }
  
  // Initialize features
  console.log('App initialized with config:', config);
}