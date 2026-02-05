const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Simple in-memory cache for user data (5 minute TTL)
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedUser = (userId) => {
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.user;
  }
  return null;
};

const setCachedUser = (userId, user) => {
  userCache.set(userId, {
    user,
    timestamp: Date.now()
  });
};

module.exports = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    // Try cache first
    let user = getCachedUser(decoded.id);
    
    if (!user) {
      // Fetch from database if not cached
      user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      setCachedUser(decoded.id, user);
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};