const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // use bcryptjs for better cross-platform support
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Organization = require('../models/organization');

// Register Route
router.post('/register', async (req, res) => {
  const { name, userId, email, password } = req.body; // <-- Add userId
  try {
    if (!name || !userId || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const existingUser = await User.findOne({ userId });
    if (existingUser) return res.status(400).json({ message: 'User ID already in use.' });

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'Email already in use.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, userId, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});


// Login Route
router.post('/login', async (req, res) => {
  const { userId, password } = req.body;
  try {
    if (!userId || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    
    console.log('🔍 Login attempt for:', userId);
    const user = await User.findOne({ userId }).populate('organizationId');
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    console.log('👤 User found:', user.name);
    console.log('🏢 Organization data:', user.organizationId);
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Password mismatch for:', userId);
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Create token with or without organization
    const tokenPayload = { id: user._id };
    if (user.organizationId) {
      tokenPayload.organizationId = user.organizationId._id;
      tokenPayload.isOrgAdmin = user.isOrgAdmin;
    }
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1d' });

    const response = { 
      token, 
      user: { 
        _id: user._id, 
        name: user.name, 
        userId: user.userId, 
        email: user.email, 
        role: user.role,
        isOrgAdmin: user.isOrgAdmin || false,
        organization: user.organizationId || { name: 'Default Organization', type: 'individual' }
      } 
    };
    
    console.log('📤 Sending response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (err) {
    console.error('❌ Login error:', err);
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

// Get users (organization-scoped)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching users for organization:', req.user.organizationId);
    
    // Get current user to find their organization
    const currentUser = await User.findById(req.user.id).populate('organizationId');
    
    let users;
    if (currentUser && currentUser.organizationId) {
      // Return users from same organization
      users = await User.find(
        { organizationId: currentUser.organizationId._id }, 
        'name email _id role userId'
      ).populate('organizationId', 'name type').sort({ name: 1 });
      console.log('📊 Found org users:', users.length, users.map(u => u.name));
    } else {
      // Fallback: return all users if no organization
      users = await User.find(
        {}, 
        'name email _id role userId'
      ).sort({ name: 1 });
      console.log('📊 Found all users:', users.length, users.map(u => u.name));
    }
    
    res.json(users);
  } catch (err) {
    console.error('❌ Error fetching users:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.get('/ping', (req, res) => {
  res.send('pong');
})

module.exports = router;
