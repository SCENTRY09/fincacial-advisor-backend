/**
 * Runtime Configuration
 * This file is loaded at runtime and can be updated without rebuilding
 * Useful for changing backend URL in production
 * 
 * NOTE: Environment variables take priority over this config
 * Set REACT_APP_BACKEND_URL in .env to override
 */

window.APP_CONFIG = {
  // Default to localhost for development
  // Override with REACT_APP_BACKEND_URL environment variable
  BACKEND_URL: 'http://localhost:5000',
  API_TIMEOUT: 30000,
  ENVIRONMENT: 'development'
};

console.log('✅ Runtime config loaded:', window.APP_CONFIG);
