const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/user');
// const Organization = require('../models/organization');
const { sendLoginEmail } = require('../utils/emailService');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Helper function to generate JWT
const generateToken = (user) => {
  const tokenPayload = { id: user.id };
  return jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Helper function to handle login success
const handleLoginSuccess = async (user, res) => {
  try {
    const token = generateToken(user);
    const response = {
      token,
      user: {
        _id: user.id,
        name: user.name,
        userId: user.user_id,
        email: user.email,
        authProvider: user.auth_provider
      }
    };
    return response;
  } catch (error) {
    console.error('Login success handler error:', error);
    throw error;
  }
};

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working' });
});

// Google OAuth Routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`
  }),
  async (req, res) => {
    try {
      const user = req.user;
      
      console.log('🔍 Google callback - User data:', {
        id: user._id,
        email: user.email,
        accountStatus: user.accountStatus,
        requiresCompletion: user.requiresCompletion,
        userId: user.userId,
        hasPassword: !!user.password
      });
      
      // FORCE all Google users to complete account setup
      // Check if user has no userId or password (needs completion)
      const needsCompletion = !user.userId || !user.password || user.accountStatus === 'incomplete';
      
      if (needsCompletion) {
        console.log('🔄 User needs to complete account setup');
        // Create temporary token for account completion (short-lived)
        const tempToken = jwt.sign(
          { id: user.id, purpose: 'account_completion' },
          process.env.JWT_SECRET,
          { expiresIn: '30m' } // 30 minutes to complete account
        );
        
        // Redirect to account completion page (NOT logged in)
        const redirectUrl = `${process.env.FRONTEND_URL}/complete-account?token=${tempToken}`;
        console.log('🔗 Redirect URL:', redirectUrl);
        res.redirect(redirectUrl);
      } else {
        console.log('✅ User has complete credentials - normal login');
        // Active account - proceed with normal login
        const loginData = await handleLoginSuccess(user, res);
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${loginData.token}`;
        res.redirect(redirectUrl);
      }
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=login_failed`);
    }
  }
);

// Register Route
router.post('/register', async (req, res) => {
  const { name, userId, email, password } = req.body;
  try {
    console.log('📝 Registration attempt:', { name, userId, email });
    
    if (!name || !userId || !email || !password) {
      console.log('❌ Missing fields');
      return res.status(400).json({ message: 'All fields are required.' });
    }
    
    console.log('🔍 Checking existing user...');
    const existingUser = await User.findByUserId(userId);
    if (existingUser) {
      console.log('❌ User ID already exists');
      return res.status(400).json({ message: 'User ID already in use.' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      console.log('❌ Email already exists');
      return res.status(400).json({ message: 'Email already in use.' });
    }

    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('💾 Creating user...');
    const user = await User.create({ 
      name, 
      userId, 
      email, 
      password: hashedPassword,
      authProvider: 'local'
    });
    
    console.log('✅ User registered successfully');
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { userId, password } = req.body;
  try {
    if (!userId || !password) {
      return res.status(400).json({ message: 'Email/UserID and password are required.' });
    }
    
    // Find user by userId OR email
    let user = await User.findByUserId(userId);
    if (!user) {
      user = await User.findByEmail(userId);
    }
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    if (!user.password) {
      return res.status(400).json({ 
        message: 'This account uses Google login. Please sign in with Google.',
        requiresGoogleLogin: true
      });
    }
    
    const isMatch = await User.verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const loginData = await handleLoginSuccess(user, res);
    res.json(loginData);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Get users
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.get('/ping', (req, res) => {
  res.send('pong');
});

// Delete user by email (for testing)
router.delete('/delete-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete user (Supabase doesn't have findOneAndDelete)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('email', email);
    
    if (error) throw error;
    
    res.json({ 
      message: 'User deleted successfully',
      deletedUser: {
        name: user.name,
        email: user.email,
        userId: user.user_id
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password for authenticated users (requires old password)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old password and new password are required.' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    if (user.account_status !== 'active') {
      return res.status(400).json({ message: 'Account must be active to change password.' });
    }
    
    // Verify old password
    if (!user.password) {
      return res.status(400).json({ message: 'No password set. Use forgot password to set initial password.' });
    }
    
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }
    
    await User.updateById(user.id, {
      password: newPassword,
      auth_provider: user.auth_provider === 'google' ? 'hybrid' : user.auth_provider
    });
    
    res.json({ 
      message: 'Password updated successfully.',
      authProvider: user.authProvider
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      userId: user.user_id,
      authProvider: user.auth_provider,
      emailVerified: user.email_verified,
      canUsePasswordLogin: !!user.password,
      loginMethods: {
        google: !!user.google_id,
        password: !!user.password,
        email: user.email,
        userId: user.user_id
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete account for Google users (mandatory step)
router.post('/complete-account', async (req, res) => {
  try {
    const { token, userId, password } = req.body;
    
    // Validation
    if (!token || !userId || !password) {
      return res.status(400).json({ message: 'Token, User ID, and password are required.' });
    }
    
    if (userId.length < 3) {
      return res.status(400).json({ message: 'User ID must be at least 3 characters long.' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }
    
    // Verify temporary token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.purpose !== 'account_completion') {
        return res.status(403).json({ message: 'Invalid token purpose.' });
      }
    } catch (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    
    // Check if userId is already taken
    const existingUser = await User.findByUserId(userId);
    if (existingUser && existingUser.id !== decoded.id) {
      return res.status(400).json({ message: 'User ID is already taken. Please choose another.' });
    }
    
    // Get user and verify they need completion
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Allow completion if user doesn't have userId or password
    if (user.user_id && user.password && user.account_status === 'active') {
      return res.status(400).json({ message: 'Account is already complete.' });
    }
    
    // Complete the account
    const hashedPassword = await bcrypt.hash(password, 12);
    await User.updateById(user.id, {
      user_id: userId,
      password: password,
      account_status: 'active',
      auth_provider: 'hybrid'
    });
    
    const updatedUser = await User.findById(user.id);
    
    // Now create actual login session
    const loginData = await handleLoginSuccess(updatedUser, res);
    
    res.json({ 
      message: 'Account completed successfully. You are now logged in.',
      ...loginData
    });
  } catch (error) {
    console.error('Complete account error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Forgot password - send reset token
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    
    const user = await User.findByEmail(email);
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }
    
    // Rate limiting - max 3 attempts per hour
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    if (user.lastResetAttempt && user.lastResetAttempt > oneHourAgo && user.resetAttempts >= 3) {
      return res.status(429).json({ message: 'Too many reset attempts. Please try again later.' });
    }
    
    // Generate reset token (6-digit OTP)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
    
    await User.updateById(user.id, {
      reset_token: await bcrypt.hash(resetToken, 10),
      reset_token_expiry: resetTokenExpiry,
      reset_attempts: (user.last_reset_attempt && user.last_reset_attempt > oneHourAgo) ? user.reset_attempts + 1 : 1,
      last_reset_attempt: now
    });
    
    // Send reset email
    if (process.env.SEND_LOGIN_EMAILS === 'true') {
      const { sendResetEmail } = require('../utils/emailService');
      sendResetEmail(user.email, resetToken, user.name).catch(err => 
        console.error('Reset email failed:', err.message)
      );
    }
    
    res.json({ message: 'If an account with that email exists, a reset code has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ message: 'Email, reset code, and new password are required.' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }
    
    const user = await User.findByEmail(email);
    if (!user || !user.reset_token || !user.reset_token_expiry) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }
    
    // Check if token expired
    if (new Date() > user.reset_token_expiry) {
      return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
    }
    
    // Verify reset token
    const isTokenValid = await bcrypt.compare(resetToken, user.reset_token);
    if (!isTokenValid) {
      return res.status(400).json({ message: 'Invalid reset code.' });
    }
    
    await User.updateById(user.id, {
      password: newPassword,
      reset_token: null,
      reset_token_expiry: null,
      reset_attempts: 0,
      auth_provider: user.auth_provider === 'google' ? 'hybrid' : user.auth_provider
    });
    
    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
