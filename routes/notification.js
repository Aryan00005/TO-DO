const express = require('express');
const router = express.Router();
const Notification = require('../models/notification.js');
const User = require('../models/user.js');
const auth = require('../middleware/auth');

// Get notifications for a user (sorted newest first, show name in message if possible)
router.get('/:userId', auth, async (req, res) => {
  try {
    const notifications = await Notification.findByUserId(req.params.userId);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark a single notification as read
router.patch('/:notificationId/read', auth, async (req, res) => {
  try {
    const notification = await Notification.markAsRead(req.params.notificationId);
    res.json({ message: "Notification marked as read", notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark ALL notifications as read for a user
router.patch('/all/:userId/read', auth, async (req, res) => {
  try {
    await Notification.markAllAsRead(req.params.userId);
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
