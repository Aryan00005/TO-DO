const express = require('express');
const cors = require('cors');
const authRoutes = require('../routes/auth');

const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://to-doapp01-git-main-vrund-patels-projects-881710aa.vercel.app',
  credentials: true
}));

app.use('/api/auth', authRoutes);

module.exports = app;