require("dotenv").config();
const jwt = require("jsonwebtoken");

const ensureAuthenticated = (req, res, next) => {
  console.log('🔍 [Auth.js] Checking authentication...');
  const authHeader = req.headers["authorization"];
  
  console.log('🔍 [Auth.js] Authorization header:', authHeader ? 'Present' : 'Missing');

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log('❌ [Auth.js] No Bearer token found');
    return res
      .status(403)
      .json({ message: "Unauthorized, JWT token is required" });
  }

  const token = authHeader.split(" ")[1];
  console.log('✅ [Auth.js] Extracted Bearer token');

  try {
    console.log('🔍 [Auth.js] Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ [Auth.js] JWT verified, user ID:', decoded.sub);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ [Auth.js] JWT verification failed:', err.message);
    return res
      .status(403)
      .json({ message: "Unauthorized, JWT token is invalid or expired" });
  }
};

module.exports = ensureAuthenticated;
