const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');
const auth = require('../middleware/auth');

// Get notifications for a user (sorted newest first)
router.get('/:userId', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.params.userId }).sort({ createdAt: -1 });
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

// (Optional) Mark ALL notifications as read for a user now I need 3 more changes in the software,
//  while seeing the notifications "Task assignes to 'hgvvcxjs1231d' has been completed", instead 
// of name or username the user id shows in like I showed in the "" now and tehn the tasks in the my 
// tasks section show in an order of when they are assigned, but they should be arrange according to priority, 
// there shows that lastly I need to deploy this software, so 

router.patch('/all/:userId/read', auth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.params.userId, isRead: false }, { isRead: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
