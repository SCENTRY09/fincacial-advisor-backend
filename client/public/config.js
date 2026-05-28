/**
 * Runtime Configuration
 * This file is loaded at runtime and can be updated without rebuilding
 * Useful for changing backend URL in production
 */

window.APP_CONFIG = {
  BACKEND_URL: 'https://fincacial-advisor-backend-1.onrender.com',
  API_TIMEOUT: 30000,
  ENVIRONMENT: 'production'
};

console.log('✅ Runtime config loaded:', window.APP_CONFIG);
