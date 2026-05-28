import React, { createContext, useState, useEffect, useCallback } from "react";
import { toast } from 'react-toastify';
import { clearAuthData, setAuthData, getAuthData } from "../utils/authUtils";
import { useAuthState, setAuthState, clearAuthState } from "../hooks/useAuthState";
import apiService from "../services/apiService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Use the global auth state
  const globalState = useAuthState();
  const [isAuthenticated, setIsAuthenticated] = useState(globalState.isAuthenticated);
  const [user, setUser] = useState(globalState.user);
  const [loading, setLoading] = useState(globalState.loading);
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  // Sync local state with global state
  useEffect(() => {
    const wasAuthenticated = isAuthenticated;
    
    setIsAuthenticated(globalState.isAuthenticated);
    setUser(globalState.user);
    setLoading(globalState.loading);
    
    // Show welcome message only once when user becomes authenticated
    if (!wasAuthenticated && globalState.isAuthenticated && globalState.user) {
      const welcomeMessageShown = sessionStorage.getItem('welcomeMessageShown');
      
      // Only show welcome message if it hasn't been shown yet and we're not on the login page
      if (!welcomeMessageShown && window.location.pathname !== '/login') {
        sessionStorage.setItem('welcomeMessageShown', 'true');
        
        // Small delay to ensure it's not shown multiple times
        setTimeout(() => {
          toast.success(`Welcome back, ${globalState.user.name}! 🎉`, {
            position: "top-center",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }, 100);
      }
    }
  }, [globalState, isAuthenticated]);

  const login = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
    setAuthData(userData, token);
    // Update global state
    setAuthState({
      user: userData,
      isAuthenticated: true,
      loading: false
    });
    
    // Clear any existing welcome message flags
    sessionStorage.removeItem('welcomeMessageShown');
  };

  const clearAuth = () => {
    setUser(null);
    setIsAuthenticated(false);
    setLoading(false);
    clearAuthData();
    // Update global state
    clearAuthState();
    
    // Clear welcome message flag
    sessionStorage.removeItem('welcomeMessageShown');
  };

  const logout = async () => {
    try {
      // Show loading toast
      const loadingToast = toast.loading('Logging you out...', {
        position: "top-center",
        closeOnClick: false,
        pauseOnHover: false,
        draggable: false,
      });

      await apiService.auth.logout();

      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Show success toast
      toast.success('Logged out successfully! 👋', {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

    } catch (error) {
      console.error("Logout error:", error);
      toast.dismiss();
      toast.error('Logout failed. Please try again.', {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      // Clear all authentication data immediately
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      
      // Update global state
      clearAuthState();
      
      // Clear welcome message flag
      sessionStorage.removeItem('welcomeMessageShown');
      
      // Force a complete page reload to ensure all components reset
      setTimeout(() => {
        window.location.replace('/');
      }, 1000);
    }
  };

  const verifyAuth = useCallback(async () => {
    try {
      console.log('🔍 Verifying authentication with server...');
      const response = await apiService.auth.verify();
      
      if (response.data.success) {
        console.log('✅ Server verification successful');
        setUser(response.data.user);
        setIsAuthenticated(true);
        setLoading(false);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        // Update global state
        setAuthState({
          user: response.data.user,
          isAuthenticated: true,
          loading: false
        });
      } else {
        console.log('❌ Server verification failed - clearing auth state');
        // Clear authentication state if verification fails
        clearAuth();
      }
    } catch (error) {
      console.error("Auth verification failed:", error.message);
      // Only clear auth on 401 errors, not on network errors
      if (error.response?.status === 401) {
        console.log('❌ 401 Unauthorized - clearing auth state');
        clearAuth();
      } else {
        console.log('⚠️ Network or server error - keeping auth state intact, setting loading to false');
        // Keep auth state intact on network errors but stop loading
        setLoading(false);
        // Update global state to stop loading
        setAuthState({
          user: user,
          isAuthenticated: isAuthenticated,
          loading: false
        });
      }
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    // Only verify once on initial mount
    if (verificationAttempted) return;
    
    setVerificationAttempted(true);
    
    const authData = getAuthData();
    
    if (authData.isAuthenticated) {
      // We have stored data, verify with server
      console.log('🔍 Found stored auth data, verifying with server...');
      verifyAuth();
    } else {
      // No stored data, ensure we're logged out
      console.log('❌ No stored auth data found');
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      // Update global state
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false
      });
    }
  }, [verificationAttempted, verifyAuth]);

  // Add listeners for auth state changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'user' || e.key === 'token') {
        const authData = getAuthData();
        if (authData.isAuthenticated) {
          setUser(authData.user);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    };

    const handleAuthStateChange = (e) => {
      setUser(e.detail.user);
      setIsAuthenticated(e.detail.isAuthenticated);
    };

    const handleAuthFailed = () => {
      console.log('🔴 Auth failed event received - clearing auth state');
      clearAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChanged', handleAuthStateChange);
    window.addEventListener('authFailed', handleAuthFailed);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthStateChange);
      window.removeEventListener('authFailed', handleAuthFailed);
    };
  }, []);

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    clearAuth,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;