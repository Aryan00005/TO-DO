const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // use bcryptjs for better cross-platform support
const jwt = require('jsonwebtoken');
const User = require('../models/user');

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
  const { userId, password } = req.body; // <-- Use userId
  try {
    if (!userId || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const user = await User.findOne({ userId }); // <-- Use userId
    if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1d' });

    res.json({ token, user: { _id: user._id, name: user.name, userId: user.userId, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});


// Get all users 
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name email _id role');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.get('/ping', (req, res) => {
  res.send('pong');
})

module.exports = router;
