const router = require('express').Router();
const passport = require('passport');
const authController = require('../controllers/AuthController');

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  authController.googleCallback
);

// Email/Password authentication routes
router.post('/login', authController.login);

router.post('/register', authController.register);

// User management routes
router.get('/user',
  passport.authenticate('jwt', { session: false }),
  authController.getUser
);

router.post('/logout', authController.logout);

router.get('/verify',
  authController.verifyToken
);

// Profile update route
router.put('/profile',
  passport.authenticate('jwt', { session: false }),
  authController.updateProfile
);

// Temporarily comment out error handling to see actual errors
// router.use((error, req, res, next) => {
//   console.error('❌ Auth route error:', error);
//   res.status(500).json({ message: 'Internal server error' });
// });

module.exports = router;
