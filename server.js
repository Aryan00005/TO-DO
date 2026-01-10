require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('./config/passport');
const { testConnection } = require('./config/database');

const app = express();

// Trust proxy for Render
app.set('trust proxy', 1);

app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.disable('x-powered-by');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Initialize Passport
app.use(passport.initialize());

// Test PostgreSQL connection
testConnection();

// Debug: Log environment variables
console.log('🔍 Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing');
console.log('BACKEND_URL:', process.env.BACKEND_URL);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

// Import and use superadmin routes
const superadminRoutes = require('./routes/superadmin.js');
app.use('/api/superadmin', superadminRoutes);

// Import and use auth routes
try {
  const authRoutes = require('./routes/auth.js');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
}

// Import and use task routes
const taskRoutes = require('./routes/task.js');
app.use('/api/tasks', taskRoutes);

// Import and use notification routes
const notificationRoutes = require('./routes/notification.js');
app.use('/api/notifications', notificationRoutes);

// 404 handler (should be after all real routes)
app.use((req, res, next) => {
  res.status(404).send("Sorry, can't find that!");
});

// Global error handler (should be last)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
