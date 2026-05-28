const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to ensure user is authenticated
const ensureAuthenticated = async (req, res, next) => {
  try {
    console.log('🔍 [ensureAuthenticated] Checking authentication...');
    console.log('🔍 [ensureAuthenticated] Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('🔍 [ensureAuthenticated] Cookies:', req.cookies?.token ? 'Present' : 'Missing');
    
    // Check for token in cookies first (primary method)
    let token = req.cookies?.token;
    
    // If no token in cookies, check Authorization header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      console.log('🔍 [ensureAuthenticated] Authorization header value:', authHeader.substring(0, 20) + '...');
      
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('✅ [ensureAuthenticated] Extracted Bearer token');
      }
    }
    
    // If no token found, reject the request
    if (!token) {
      console.log('❌ [ensureAuthenticated] No token found in cookies or Authorization header');
      req.user = null;
      return next();
    }
    
    try {
      // Verify JWT token
      console.log('🔍 [ensureAuthenticated] Verifying JWT token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ [ensureAuthenticated] JWT verified, user ID:', decoded.sub);
      
      // Find user
      const user = await User.findById(decoded.sub);
      if (!user) {
        console.log('❌ [ensureAuthenticated] User not found in database');
        req.user = null;
        return next();
      }
      
      console.log('✅ [ensureAuthenticated] User found:', user.email);
      // Set user in request
      req.user = user;
      next();
    } catch (jwtError) {
      console.error('❌ [ensureAuthenticated] JWT verification failed:', jwtError.message);
      req.user = null;
      next();
    }
  } catch (error) {
    console.error('❌ [ensureAuthenticated] Middleware error:', error);
    req.user = null;
    next();
  }
};

// Middleware to require authentication - MUST be called after ensureAuthenticated
const requireAuth = (req, res, next) => {
  console.log('🔍 [requireAuth] Checking if user is authenticated...');
  console.log('🔍 [requireAuth] req.user exists:', !!req.user);
  
  if (!req.user) {
    console.log('❌ [requireAuth] User not authenticated - returning 401');
    return res.status(401).json({ 
      success: false,
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  
  console.log('✅ [requireAuth] User authenticated:', req.user.email);
  next();
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

module.exports = {
  ensureAuthenticated,
  requireAuth,
  requireAdmin
};
