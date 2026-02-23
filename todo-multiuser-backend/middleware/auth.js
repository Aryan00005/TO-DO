const jwt = require('jsonwebtoken');
const User = require('../models/user');

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

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', {
      message: err.message,
      details: err.stack,
      hint: err.code === 'ECONNREFUSED' ? 'Database connection refused' : 
            err.code === 'ETIMEDOUT' ? 'Database connection timeout' : '',
      code: err.code || ''
    });
    res.status(401).json({ message: 'Authentication failed', error: err.message });
  }
};
