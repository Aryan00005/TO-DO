require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.disable('x-powered-by');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Import and use auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Import and use task routes
const taskRoutes = require('./routes/task');
app.use('/api/tasks', taskRoutes);

// Import and use notification routes
const notificationRoutes = require('./routes/notification');
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

