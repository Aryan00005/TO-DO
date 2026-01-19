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
        authProvider: user.auth_provider,
        role: user.role || 'user',
        company: user.company,
        isSuperAdmin: user.is_super_admin || false
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
  (req, res, next) => {
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`
    })(req, res, (err) => {
      if (err) {
        console.error('🔥 Passport authentication error:', err);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const user = req.user;

      if (!user) {
        console.error('❌ No user returned from Google OAuth');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
      }

      console.log('🔍 Google callback - User data:', {
        id: user.id,
        email: user.email,
        accountStatus: user.account_status,
        requiresCompletion: user.requiresCompletion,
        userId: user.user_id,
        hasPassword: !!user.password
      });

      // FORCE all Google users to complete account setup
      // Check if user has no userId or password (needs completion)
      const needsCompletion = !user.user_id || !user.password || user.account_status === 'incomplete';

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
      console.error('💥 Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=login_failed`);
    }
  }
);

// Admin registration route
router.post('/admin/register', async (req, res) => {
  const { name, userId, email, password, company } = req.body;
  try {
    console.log('📝 Admin registration attempt:', { name, userId, email, company });

    if (!name || !userId || !email || !password || !company) {
      console.log('❌ Missing fields');
      return res.status(400).json({ message: 'All fields including company are required.' });
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

    console.log('💾 Creating admin user...');
    const user = await User.create({ 
      name, 
      userId, 
      email, 
      password: password,
      authProvider: 'local',
      role: 'admin',
      company,
      accountStatus: 'pending'
    });
    
    console.log('✅ Admin registered successfully - PENDING APPROVAL');
    res.status(201).json({ message: 'Admin registration submitted. Awaiting super admin approval.' });
  } catch (err) {
    console.error('❌ Admin registration error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Admin login route
router.post('/admin/login', async (req, res) => {
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
    
    console.log('🔍 Admin login attempt for:', userId, 'User found:', !!user);
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      console.log('❌ User is not admin');
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    console.log('🔑 User auth provider:', user.auth_provider, 'Has password:', !!user.password);

    if (!user.password) {
      return res.status(400).json({ 
        message: 'This account uses Google login. Please sign in with Google.',
        requiresGoogleLogin: true
      });
    }
    
    const isMatch = await User.verifyPassword(password, user.password);
    console.log('🔐 Password match:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Password mismatch');
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Check account status
    if (user.account_status === 'pending') {
      return res.status(403).json({ message: 'Account pending approval. Please wait for super admin approval.' });
    }
    
    if (user.account_status === 'rejected') {
      return res.status(403).json({ message: 'Account has been rejected. Contact support.' });
    }

    const loginData = await handleLoginSuccess(user, res);
    res.json(loginData);
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Register Route (requires company code)
router.post('/register', async (req, res) => {
  const { name, userId, email, password, companyCode } = req.body;
  try {
    console.log('📝 Registration attempt:', { name, userId, email, companyCode });
    
    if (!name || !userId || !email || !password || !companyCode) {
      console.log('❌ Missing fields');
      return res.status(400).json({ message: 'All fields including company code are required.' });
    }
    
    // Verify company code exists
    const { data: companyUsers, error: companyError } = await supabase
      .from('users')
      .select('company')
      .eq('company', companyCode)
      .limit(1);
    
    if (companyError || !companyUsers || companyUsers.length === 0) {
      return res.status(400).json({ message: 'Invalid company code.' });
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

    console.log('💾 Creating user...');
    const user = await User.create({ 
      name, 
      userId, 
      email, 
      password: password,
      authProvider: 'local',
      company: companyCode
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
    
    console.log('🔍 Login attempt for:', userId, 'User found:', !!user);
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    console.log('🔑 User auth provider:', user.auth_provider, 'Has password:', !!user.password);

    if (!user.password) {
      return res.status(400).json({ 
        message: 'This account uses Google login. Please sign in with Google.',
        requiresGoogleLogin: true
      });
    }
    
    const isMatch = await User.verifyPassword(password, user.password);
    console.log('🔐 Password match:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Password mismatch');
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

// Get users (filtered by company unless super admin)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Super admin sees all users
    if (currentUser.is_super_admin) {
      const users = await User.findAll();
      return res.json(users);
    }
    
    // Admin sees all users in their company
    if (currentUser.role === 'admin' && currentUser.company) {
      const users = await User.findByCompany(currentUser.company);
      return res.json(users);
    }
    
    // Regular users with company see company users
    if (currentUser.company) {
      const users = await User.findByCompany(currentUser.company);
      return res.json(users);
    }
    
    // Users without company see all users (for now)
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
      role: user.role || 'user',
      company: user.company,
      isSuperAdmin: user.is_super_admin || false,
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

// Super Admin: Create Company Admin
router.post('/superadmin/create-company-admin', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser || !currentUser.is_super_admin) {
      return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
    }
    
    const { name, userId, email, password, company, companyCode } = req.body;
    
    if (!name || !userId || !email || !password || !company) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    
    const existingUser = await User.findByUserId(userId);
    if (existingUser) {
      return res.status(400).json({ message: 'User ID already in use.' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    const user = await User.create({ 
      name, 
      userId, 
      email, 
      password,
      authProvider: 'local',
      role: 'admin',
      company: companyCode || company
    });
    
    res.status(201).json({ 
      message: 'Company admin created successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        userId: user.user_id,
        company: user.company,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Create company admin error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Super Admin: Get All Companies with Stats
router.get('/superadmin/companies', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser || !currentUser.is_super_admin) {
      return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('company, role, account_status')
      .not('company', 'is', null)
      .order('company');
    
    if (error) throw error;
    
    // Group by company and count users/admins
    const companyStats = data.reduce((acc, user) => {
      if (!acc[user.company]) {
        acc[user.company] = { name: user.company, userCount: 0, adminCount: 0 };
      }
      if (user.role === 'admin' && user.account_status === 'active') {
        acc[user.company].adminCount++;
      } else if (user.role !== 'admin') {
        acc[user.company].userCount++;
      }
      return acc;
    }, {});
    
    res.json(Object.values(companyStats));
  } catch (err) {
    console.error('Get companies error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Super Admin: Get Pending Admin Requests
router.get('/superadmin/pending-admins', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser || !currentUser.is_super_admin) {
      return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, user_id, company, created_at')
      .eq('role', 'admin')
      .eq('account_status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(data || []);
  } catch (err) {
    console.error('Get pending admins error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Super Admin: Approve/Reject Admin
router.post('/superadmin/admin-action', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser || !currentUser.is_super_admin) {
      return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
    }
    
    const { adminId, action } = req.body;
    
    if (!adminId || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Admin ID and valid action (approve/reject) required.' });
    }
    
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin not found.' });
    }
    
    const newStatus = action === 'approve' ? 'active' : 'rejected';
    
    await User.updateById(adminId, {
      account_status: newStatus
    });
    
    res.json({ 
      message: `Admin ${action}d successfully.`,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        status: newStatus
      }
    });
  } catch (err) {
    console.error('Admin action error:', err);
    res.status(500).json({ message: 'Server error.' });
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
