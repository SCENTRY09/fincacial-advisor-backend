/**
 * Centralized API Service
 * All API calls should go through this service to ensure:
 * - Consistent baseURL handling
 * - Automatic Bearer token injection
 * - Proper error handling
 * - Environment variable usage
 */

import axios from 'axios';

// Get backend URL with priority:
// 1. Runtime config (window.APP_CONFIG) - set in public/config.js
// 2. Environment variable (REACT_APP_BACKEND_URL)
// 3. localStorage (fallback)
// 4. Deployed backend URL (final fallback - NOT localhost)

let BACKEND_URL = null;

// Check runtime config first (loaded from public/config.js)
if (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) {
  BACKEND_URL = window.APP_CONFIG.BACKEND_URL;
  console.log('✅ Using runtime config BACKEND_URL:', BACKEND_URL);
}

// Check environment variable
if (!BACKEND_URL || BACKEND_URL === 'undefined') {
  BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  if (BACKEND_URL && BACKEND_URL !== 'undefined') {
    console.log('✅ Using environment variable REACT_APP_BACKEND_URL:', BACKEND_URL);
  }
}

// Check localStorage
if (!BACKEND_URL || BACKEND_URL === 'undefined') {
  BACKEND_URL = localStorage.getItem('BACKEND_URL');
  if (BACKEND_URL && BACKEND_URL !== 'undefined') {
    console.log('✅ Using localStorage BACKEND_URL:', BACKEND_URL);
  }
}

// Use deployed backend URL as final fallback (NOT localhost)
if (!BACKEND_URL || BACKEND_URL === 'undefined') {
  BACKEND_URL = 'https://fincacial-advisor-backend-1.onrender.com';
  console.log('⚠️ Using fallback deployed BACKEND_URL:', BACKEND_URL);
}

console.log('🔧 API Service initialized with backend URL:', BACKEND_URL);

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token to ALL requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    // ALWAYS set Authorization header if token exists
    if (token && token !== 'undefined' && token !== '') {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🔐 [${config.method.toUpperCase()}] ${config.url} - Bearer token attached (${token.substring(0, 20)}...)`);
    } else {
      console.log(`📤 [${config.method.toUpperCase()}] ${config.url} - No token in localStorage`);
      // Don't set Authorization header if no token
      delete config.headers.Authorization;
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
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

// API Service with all endpoints
const apiService = {
  // Auth endpoints
  auth: {
    login: (credentials) => apiClient.post('/api/auth/login', credentials),
    register: (userData) => apiClient.post('/api/auth/register', userData),
    logout: () => apiClient.post('/api/auth/logout'),
    verify: () => apiClient.get('/api/auth/verify'),
    getUser: () => apiClient.get('/api/auth/user'),
    updateProfile: (profileData) => apiClient.put('/api/auth/profile', profileData),
  },

  // Financial advice endpoints
  financialAdvice: {
    generate: (profileData) => apiClient.post('/api/financial-advice/generate', profileData),
    chat: (message, conversationHistory) => 
      apiClient.post('/api/financial-advice/chat', { message, conversationHistory }),
    getHistory: () => apiClient.get('/api/financial-advice/history'),
    updateFeedback: (adviceId, feedback) => 
      apiClient.patch(`/api/financial-advice/history/${adviceId}/feedback`, { feedback }),
  },

  // Success stories endpoints
  successStories: {
    getAll: () => apiClient.get('/api/success-stories'),
    create: (storyData) => apiClient.post('/api/success-stories', storyData),
    delete: (storyId) => apiClient.delete(`/api/success-stories/${storyId}`),
  },

  // Schemes endpoints
  schemes: {
    getSchemes: (filters) => apiClient.post('/api/schemes', filters),
  },

  // Meetings endpoints
  meetings: {
    getUpcoming: () => apiClient.get('/api/meetings/upcoming'),
    getArchived: () => apiClient.get('/api/meetings/archived'),
    getLive: () => apiClient.get('/api/meetings/live'),
    getUserRegistrations: () => apiClient.get('/api/meetings/user/registrations'),
    create: (meetingData) => apiClient.post('/api/meetings', meetingData),
    register: (meetingId) => apiClient.post(`/api/meetings/${meetingId}/register`),
    getAttendees: (meetingId) => apiClient.get(`/api/meetings/${meetingId}/attendees`),
    update: (meetingId, meetingData) => apiClient.put(`/api/meetings/${meetingId}`, meetingData),
    delete: (meetingId) => apiClient.delete(`/api/meetings/${meetingId}`),
    setLive: (meetingId) => apiClient.post(`/api/meetings/${meetingId}/live`),
  },

  // Transactions endpoints
  transactions: {
    getAll: () => apiClient.get('/api/transactions'),
    getStats: () => apiClient.get('/api/transactions/stats'),
    getCategories: () => apiClient.get('/api/transactions/categories'),
    create: (transactionData) => apiClient.post('/api/transactions', transactionData),
    update: (transactionId, transactionData) => 
      apiClient.put(`/api/transactions/${transactionId}`, transactionData),
    delete: (transactionId) => apiClient.delete(`/api/transactions/${transactionId}`),
    createFromReceipt: (receiptData) => apiClient.post('/api/transactions/receipt', receiptData),
    createBatchFromReceipt: (batchData) => 
      apiClient.post('/api/transactions/receipt/batch', batchData),
  },

  // Communities endpoints
  communities: {
    getAll: () => apiClient.get('/api/communities'),
    create: (communityData) => apiClient.post('/api/communities', communityData),
    getById: (communityId) => apiClient.get(`/api/communities/${communityId}`),
    update: (communityId, communityData) => 
      apiClient.put(`/api/communities/${communityId}`, communityData),
    delete: (communityId) => apiClient.delete(`/api/communities/${communityId}`),
  },

  // OCR endpoints
  ocr: {
    processDocument: (formData) => 
      apiClient.post('/api/ocr/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
  },

  // Budget endpoints
  budgets: {
    getAll: () => apiClient.get('/api/budgets'),
    create: (budgetData) => apiClient.post('/api/budgets', budgetData),
    update: (budgetId, budgetData) => apiClient.put(`/api/budgets/${budgetId}`, budgetData),
    delete: (budgetId) => apiClient.delete(`/api/budgets/${budgetId}`),
  },

  // Khata endpoints
  khata: {
    getAll: () => apiClient.get('/api/khata'),
    create: (khataData) => apiClient.post('/api/khata', khataData),
    update: (khataId, khataData) => apiClient.put(`/api/khata/${khataId}`, khataData),
    delete: (khataId) => apiClient.delete(`/api/khata/${khataId}`),
  },

  // Voice navigation endpoints
  voiceNavigation: {
    process: (audioData) => apiClient.post('/api/voice-navigation/process', audioData),
  },

  // Voice analytics endpoints
  voiceAnalytics: {
    getAnalytics: () => apiClient.get('/api/voice-analytics'),
  },
};

export default apiService;
export { apiClient, BACKEND_URL };
