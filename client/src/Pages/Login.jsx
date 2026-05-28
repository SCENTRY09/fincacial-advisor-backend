import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import AuthContext from '../Authorisation/AuthProvider';
import { clearAuthData, getAuthData } from '../utils/authUtils';
import { useAuthState } from '../hooks/useAuthState';
import apiService, { BACKEND_URL } from '../services/apiService';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const { } = useAuthState();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Check if user is already authenticated and redirect to dashboard
  useEffect(() => {
    // Check if we're coming from Google OAuth (URL contains access_token)
    const urlParams = new URLSearchParams(window.location.search);
    const hasAccessToken = urlParams.get('access_token');
    
    // If we have an access token, we're in the middle of Google OAuth flow
    // Don't show the "already logged in" message or clear auth data
    if (hasAccessToken) {
      console.log('🔄 Google OAuth flow detected, skipping auth check');
      return;
    }
    
    // Check if we're on the success-login page (Google OAuth callback)
    if (window.location.pathname === '/success-login') {
      console.log('🔄 On success-login page, skipping auth check');
      return;
    }
    
    // Check if we just came from Google OAuth (check referrer or session storage)
    const fromGoogleOAuth = sessionStorage.getItem('fromGoogleOAuth');
    if (fromGoogleOAuth) {
      console.log('🔄 Recently completed Google OAuth, skipping auth check');
      sessionStorage.removeItem('fromGoogleOAuth');
      return;
    }
    
    // Add a longer delay to prevent race conditions with Google OAuth
    const timer = setTimeout(() => {
      const authData = getAuthData();
      if (authData.isAuthenticated && authData.user) {
        console.log('🔐 User already authenticated, redirecting to dashboard');
        toast.info('You are already logged in! Redirecting to dashboard...', {
          position: "top-center",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        navigate('/financialAdvisior');
        return;
      }
      
      // Only clear auth data if user is not authenticated
      console.log('🧹 Clearing stale auth data on login page entry');
      clearAuthData();
    }, 500); // Longer delay to prevent race conditions
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed navigate from dependencies to prevent multiple executions

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGoogleLogin = () => {
    try {
      setIsLoading(true);
      
      // Set a flag to indicate we're in Google OAuth flow
      sessionStorage.setItem('fromGoogleOAuth', 'true');
      
      const googleLoginUrl = `${BACKEND_URL}/api/auth/google`;
      window.location.href = googleLoginUrl;
    } catch (error) {
      console.error('Error initiating Google login:', error);
      toast.error('Failed to initiate Google login. Please try again.', {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields', {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address', {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    // Password validation
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long', {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    try {
      setIsLoading(true);

      const response = await apiService.auth.login(formData);

      if (response.data.success) {
        // Show success toast
        toast.success(`Welcome back, ${response.data.user.name}! 🎉`, {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        login(response.data.user, response.data.token);
        
        // Navigate after a short delay to show the success message
        setTimeout(() => {
          navigate('/financialAdvisior');
        }, 1000);
      }
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        switch (status) {
          case 400:
            errorMessage = data.message || 'Please check your input and try again.';
            break;
          case 401:
            errorMessage = 'Invalid email or password. Please check your credentials.';
            break;
          case 404:
            errorMessage = 'User not found. Please check your email or sign up.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          default:
            errorMessage = data.message || 'Something went wrong. Please try again.';
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      toast.error(errorMessage, {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-20 left-20 w-40 h-40 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full border border-green-100/50 relative z-10 transform hover:scale-105 transition-all duration-500">
        <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-6 text-center relative overflow-hidden">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 transform hover:rotate-12 transition-transform duration-300 shadow-lg">
              <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white drop-shadow-lg mb-1">Welcome Back!</h1>
            <p className="text-green-100 text-sm">Sign in to access your financial advisor</p>
          </div>
        </div>

        <div className="p-6 bg-white/90 backdrop-blur-sm">
          {/* Google Login Button */}
          <div className="mb-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border-2 border-green-200 rounded-xl shadow-lg text-sm font-semibold text-gray-700 bg-white hover:bg-green-50 hover:border-green-400 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer disabled:opacity-50 group"
            >
              <div className="mr-3 flex items-center justify-center">
                <div className="relative h-5 w-5">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-white group-hover:scale-110 transition-transform duration-300">
                      <span className="h-3 w-3 rounded-full border-2 border-t-blue-500 border-r-red-500 border-b-yellow-500 border-l-green-500"></span>
                    </span>
                  </div>
                </div>
              </div>
              <span className="group-hover:text-green-600 transition-colors duration-300">Sign in with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-green-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-green-600 font-semibold text-sm">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="group">
              <label htmlFor="email" className="block text-xs font-bold text-gray-700 mb-2 group-hover:text-green-600 transition-colors duration-300">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 placeholder-gray-500 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md text-sm"
                  placeholder="Enter your email"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="group">
              <label htmlFor="password" className="block text-xs font-bold text-gray-700 mb-2 group-hover:text-green-600 transition-colors duration-300">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 placeholder-gray-500 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md text-sm"
                  placeholder="Enter your password"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white py-3 px-4 rounded-xl hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-base shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-sm">Signing in...</span>
                </div>
              ) : (
                <span className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </span>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-green-600 hover:text-green-500 font-bold transition-all duration-300 hover:underline">
                Sign up now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
