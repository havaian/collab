const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken, authenticateJWT } = require('../middleware/auth');
const { userValidation, handleValidationErrors } = require('../middleware/validation');
const { auth: authRateLimit } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply auth rate limiting to all routes
router.use(authRateLimit);

// Local registration (optional - if not using OAuth only)
router.post('/register', 
  userValidation.create,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, email, password, displayName } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });
      
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          message: existingUser.email === email 
            ? 'Email is already registered' 
            : 'Username is already taken',
          field: existingUser.email === email ? 'email' : 'username'
        });
      }
      
      // Create new user
      const user = new User({
        username,
        email,
        password,
        displayName: displayName || username,
        isVerified: false // Require email verification
      });
      
      await user.save();
      
      // Generate token
      const token = generateToken(user);
      
      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatar: user.avatar,
          isVerified: user.isVerified
        },
        token,
        requiresVerification: !user.isVerified
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'Unable to create account. Please try again.'
      });
    }
  }
);

// Local login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }
    
    // Check password
    const isValidPassword = await user.comparePassword(password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support.'
      });
    }
    
    // Update last active
    user.updateLastActive();
    
    // Generate token
    const token = generateToken(user);
    
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        isVerified: user.isVerified,
        preferences: user.preferences
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Unable to log in. Please try again.'
    });
  }
});

// GitHub OAuth
router.get('/github',
  passport.authenticate('github', { 
    scope: ['user:email'],
    session: false 
  })
);

router.get('/github/callback',
  passport.authenticate('github', { 
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
    session: false 
  }),
  (req, res) => {
    try {
      const token = generateToken(req.user);
      
      // Redirect to client with token
      res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}&provider=github`);
    } catch (error) {
      console.error('GitHub callback error:', error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_callback_failed`);
    }
  }
);

// Google OAuth
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
    session: false 
  }),
  (req, res) => {
    try {
      const token = generateToken(req.user);
      
      // Redirect to client with token
      res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}&provider=google`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_callback_failed`);
    }
  }
);

// Get current user
router.get('/user', authenticateJWT, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      displayName: req.user.displayName,
      avatar: req.user.avatar,
      isVerified: req.user.isVerified,
      preferences: req.user.preferences,
      usage: req.user.usage
    }
  });
});

// Update user profile
router.put('/user',
  authenticateJWT,
  userValidation.update,
  handleValidationErrors,
  async (req, res) => {
    try {
      const updates = req.body;
      const user = req.user;
      
      // Handle username change
      if (updates.username && updates.username !== user.username) {
        const existingUser = await User.findOne({ username: updates.username });
        if (existingUser) {
          return res.status(409).json({
            error: 'Username taken',
            message: 'This username is already in use'
          });
        }
      }
      
      // Handle email change
      if (updates.email && updates.email !== user.email) {
        const existingUser = await User.findOne({ email: updates.email });
        if (existingUser) {
          return res.status(409).json({
            error: 'Email taken',
            message: 'This email is already in use'
          });
        }
        // Mark as unverified if email changed
        updates.isVerified = false;
      }
      
      // Update user
      Object.assign(user, updates);
      await user.save();
      
      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatar: user.avatar,
          isVerified: user.isVerified,
          preferences: user.preferences
        }
      });
      
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        error: 'Update failed',
        message: 'Unable to update profile. Please try again.'
      });
    }
  }
);

// Change password
router.put('/password',
  authenticateJWT,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Missing passwords',
          message: 'Current and new passwords are required'
        });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({
          error: 'Password too short',
          message: 'New password must be at least 6 characters'
        });
      }
      
      const user = await User.findById(req.user._id).select('+password');
      
      // Verify current password
      const isValid = await user.comparePassword(currentPassword);
      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid password',
          message: 'Current password is incorrect'
        });
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      res.json({
        message: 'Password changed successfully'
      });
      
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({
        error: 'Password change failed',
        message: 'Unable to change password. Please try again.'
      });
    }
  }
);

// Set API key
router.put('/api-key',
  authenticateJWT,
  userValidation.apiKey,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { service, apiKey } = req.body;
      const user = req.user;
      
      // Validate API key format (basic validation)
      if (service === 'openai' && !apiKey.startsWith('sk-')) {
        return res.status(400).json({
          error: 'Invalid API key',
          message: 'OpenAI API key must start with sk-'
        });
      }
      
      // Set encrypted API key
      user.setApiKey(service, apiKey);
      await user.save();
      
      res.json({
        message: `${service.toUpperCase()} API key saved successfully`,
        service,
        hasKey: true
      });
      
    } catch (error) {
      console.error('API key save error:', error);
      res.status(500).json({
        error: 'API key save failed',
        message: 'Unable to save API key. Please try again.'
      });
    }
  }
);

// Get API key status
router.get('/api-keys', authenticateJWT, (req, res) => {
  const user = req.user;
  
  res.json({
    apiKeys: {
      openai: !!user.apiKeys.openai
    }
  });
});

// Delete API key
router.delete('/api-key/:service', authenticateJWT, async (req, res) => {
  try {
    const { service } = req.params;
    const user = req.user;
    
    if (!['openai'].includes(service)) {
      return res.status(400).json({
        error: 'Invalid service',
        message: 'Service must be openai'
      });
    }
    
    user.setApiKey(service, null);
    await user.save();
    
    res.json({
      message: `${service.toUpperCase()} API key removed successfully`,
      service
    });
    
  } catch (error) {
    console.error('API key delete error:', error);
    res.status(500).json({
      error: 'API key delete failed',
      message: 'Unable to delete API key. Please try again.'
    });
  }
});

// Logout (client-side token invalidation)
router.post('/logout', authenticateJWT, (req, res) => {
  // In a stateless JWT system, logout is primarily client-side
  // You could implement token blacklisting here if needed
  
  res.json({
    message: 'Logged out successfully'
  });
});

// Delete account
router.delete('/account',
  authenticateJWT,
  async (req, res) => {
    try {
      const { password } = req.body;
      const user = await User.findById(req.user._id).select('+password');
      
      // Verify password for account deletion
      if (user.password) {
        if (!password) {
          return res.status(400).json({
            error: 'Password required',
            message: 'Password is required to delete account'
          });
        }
        
        const isValid = await user.comparePassword(password);
        if (!isValid) {
          return res.status(401).json({
            error: 'Invalid password',
            message: 'Password is incorrect'
          });
        }
      }
      
      // Instead of deleting, deactivate the account
      user.isActive = false;
      user.email = `deleted_${Date.now()}_${user.email}`;
      user.username = `deleted_${Date.now()}_${user.username}`;
      await user.save();
      
      res.json({
        message: 'Account deleted successfully'
      });
      
    } catch (error) {
      console.error('Account deletion error:', error);
      res.status(500).json({
        error: 'Account deletion failed',
        message: 'Unable to delete account. Please try again.'
      });
    }
  }
);

module.exports = router;