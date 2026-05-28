import { useState, useEffect } from 'react';

// Global state for authentication
let globalAuthState = {
  isAuthenticated: false,
  user: null,
  loading: true
};

// Listeners for state changes
const listeners = new Set();

// Function to update global state and notify all listeners
const updateAuthState = (newState) => {
  globalAuthState = { ...globalAuthState, ...newState };
  listeners.forEach(listener => listener(globalAuthState));
};

// Function to get current auth state
export const getAuthState = () => globalAuthState;

// Custom hook to use authentication state
export const useAuthState = () => {
  const [state, setState] = useState(globalAuthState);

  useEffect(() => {
    const listener = (newState) => setState(newState);
    listeners.add(listener);
    
    // Check localStorage on mount and update global state if needed
    const checkLocalStorage = () => {
      const user = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      
      if (user && token) {
        try {
          const parsedUser = JSON.parse(user);
          if (parsedUser && parsedUser.name && parsedUser.email) {
            const newState = {
              isAuthenticated: true,
              user: parsedUser,
              loading: false
            };
            updateAuthState(newState);
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    };
    
    checkLocalStorage();
    
    return () => listeners.delete(listener);
  }, []);

  return state;
};

// Functions to update auth state
export const setAuthState = (updates) => {
  updateAuthState(updates);
};

export const clearAuthState = () => {
  updateAuthState({
    isAuthenticated: false,
    user: null,
    loading: false
  });
  localStorage.removeItem('user');
  localStorage.removeItem('token');
};

// Function to manually sync global state with localStorage
export const syncAuthStateFromStorage = () => {
  console.log('🔄 Manually syncing auth state from localStorage...');
  const user = localStorage.getItem("user");
  const token = localStorage.getItem("token");
  
  if (user && token) {
    try {
      const parsedUser = JSON.parse(user);
      if (parsedUser && parsedUser.name && parsedUser.email) {
        // Only sync if we're not on the login page
        if (window.location.pathname !== '/login') {
          updateAuthState({
            isAuthenticated: true,
            user: parsedUser,
            loading: false
          });
          console.log('✅ Auth state synced - logged in as:', parsedUser.name);
          return true;
        } else {
          console.log('⚠️ On login page - not syncing auth state');
          return false;
        }
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }
  
  updateAuthState({
    isAuthenticated: false,
    user: null,
    loading: false
  });
  console.log('❌ Auth state synced - logged out');
  return false;
};

// Initialize global state from localStorage
const initializeGlobalState = () => {
  if (typeof window === 'undefined') return;
  
  const user = localStorage.getItem("user");
  const token = localStorage.getItem("token");
  
  console.log('🔍 Initializing global state:', { user: !!user, token: !!token });
  
  if (user && token) {
    try {
      const parsedUser = JSON.parse(user);
      if (parsedUser && parsedUser.name && parsedUser.email) {
        // Set as authenticated if we have valid stored data
        globalAuthState = {
          isAuthenticated: true,
          user: parsedUser,
          loading: true  // Still loading to verify with server
        };
        console.log('✅ Found stored auth data, loading: true for server verification');
      } else {
        globalAuthState = {
          isAuthenticated: false,
          user: null,
          loading: false
        };
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      globalAuthState = {
        isAuthenticated: false,
        user: null,
        loading: false
      };
    }
  } else {
    globalAuthState = {
      isAuthenticated: false,
      user: null,
      loading: false
    };
    console.log('❌ No valid auth data found in localStorage');
  }
};

// Initialize when window is available
if (typeof window !== 'undefined') {
  // Initialize immediately
  initializeGlobalState();
  
  // Also initialize on DOMContentLoaded to be safe
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGlobalState);
  }
  
  // Add storage event listener for cross-tab synchronization
  window.addEventListener('storage', (e) => {
    console.log('🔄 Storage event detected:', e.key);
    if (e.key === 'user' || e.key === 'token') {
      const user = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      
      if (user && token) {
        try {
          const parsedUser = JSON.parse(user);
          if (parsedUser && parsedUser.name && parsedUser.email) {
            updateAuthState({
              isAuthenticated: true,
              user: parsedUser,
              loading: false
            });
            console.log('✅ Auth state updated from storage event');
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      } else {
        updateAuthState({
          isAuthenticated: false,
          user: null,
          loading: false
        });
        console.log('❌ Auth state cleared from storage event');
      }
    }
  });
}
