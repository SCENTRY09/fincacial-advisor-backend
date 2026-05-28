const router = require('express').Router();
const passport = require('passport');
const authController = require('../controllers/AuthController');
const { ensureAuthenticated, requireAuth } = require('../middlewares/AuthMiddleware');

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

// User management routes - use ensureAuthenticated + requireAuth for consistency
router.get('/user',
  ensureAuthenticated,
  requireAuth,
  authController.getUser
);

router.post('/logout', authController.logout);

router.get('/verify',
  authController.verifyToken
);

// Profile update route - use ensureAuthenticated + requireAuth for consistency
router.put('/profile',
  ensureAuthenticated,
  requireAuth,
  authController.updateProfile
);

module.exports = router;
