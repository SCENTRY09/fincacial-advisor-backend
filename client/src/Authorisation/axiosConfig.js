import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 Adding Authorization header with Bearer token');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Only clear auth on specific 401 errors from verify endpoint
    // Don't clear on other 401 errors (they might be temporary)
    if (error.response?.status === 401) {
      const isVerifyEndpoint = error.config?.url?.includes('/api/auth/verify');
      
      if (isVerifyEndpoint) {
        console.log('❌ Token verification failed - clearing auth');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        // Dispatch custom event to notify AuthProvider
        window.dispatchEvent(new CustomEvent('authFailed'));
      } else {
        console.log('⚠️ 401 error on non-verify endpoint - not clearing auth');
      }
    }
    return Promise.reject(error);
  }
);

export default api;