const express = require('express');
const router = express.Router();
const Notification = require('../models/notification.js');
const User = require('../models/user.js');
const auth = require('../middleware/auth');

// Get notifications for a user (sorted newest first, show name in message if possible)
router.get('/:userId', auth, async (req, res) => {
  try {
    let notifications = await Notification.find({ user: req.params.userId }).sort({ createdAt: -1 });

    // Replace userId with username in the message, if present
    notifications = await Promise.all(notifications.map(async (notif) => {
      // If message contains a user ID, try to replace with the user's name
      const userIdMatch = notif.message.match(/assigned to ([a-f\d]{24}) has been completed/i);
      if (userIdMatch) {
        const user = await User.findById(userIdMatch[1]);
        if (user) {
          notif.message = notif.message.replace(userIdMatch[1], user.name || user.userId);
        }
      }
      return notif;
    }));

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark a single notification as read
router.patch('/:notificationId/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.notificationId,
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Notification marked as read", notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark ALL notifications as read for a user
router.patch('/all/:userId/read', auth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.params.userId, isRead: false }, { isRead: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
