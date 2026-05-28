import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token to ALL requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🔐 [${config.method.toUpperCase()}] ${config.url} - Adding Bearer token`);
    } else {
      console.log(`📤 [${config.method.toUpperCase()}] ${config.url} - No token available`);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [${response.status}] ${response.config.url}`);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    
    console.error(`❌ [${status}] ${url} - ${error.message}`);
    
    // Only clear auth on 401 from verify endpoint
    if (status === 401) {
      const isVerifyEndpoint = url?.includes('/api/auth/verify');
      
      if (isVerifyEndpoint) {
        console.log('🔴 Token verification failed (401) - clearing auth');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        // Dispatch custom event to notify AuthProvider
        window.dispatchEvent(new CustomEvent('authFailed'));
      } else {
        console.log(`⚠️ 401 error on ${url} - NOT clearing auth (might be temporary)`);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;