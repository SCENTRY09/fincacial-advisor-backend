const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const User = require('../../models/User');

// Custom extractor that checks both cookies and Authorization header
const customExtractor = (req) => {
  // First check cookies
  if (req.cookies?.token) {
    console.log('🔍 [JWT Strategy] Token found in cookies');
    return req.cookies.token;
  }
  
  // Then check Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const token = req.headers.authorization.substring(7);
    console.log('🔍 [JWT Strategy] Token found in Authorization header');
    return token;
  }
  
  console.log('🔍 [JWT Strategy] No token found in cookies or Authorization header');
  return null;
};

module.exports = (passport) => {
  passport.use(new JwtStrategy({
    jwtFromRequest: customExtractor,
    secretOrKey: process.env.JWT_SECRET
  }, async (payload, done) => {
    try {
      console.log('🔍 [JWT Strategy] Verifying payload with sub:', payload.sub);
      const user = await User.findById(payload.sub);
      if (user) {
        console.log('✅ [JWT Strategy] User found:', user.email);
        return done(null, user);
      } else {
        console.log('❌ [JWT Strategy] User not found for ID:', payload.sub);
        return done(null, false);
      }
    } catch (error) {
      console.error('❌ [JWT Strategy] Error:', error.message);
      return done(error, false);
    }
  }));
};
