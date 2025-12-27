const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authRequired } = require('../middleware/auth');

// Get all notifications for current user
router.get('/', authRequired, async (req, res) => {
  try {
    // Strict privacy: only user's own notifications
    const query = { recipient: req.user._id };

    // Optional filters
    if (req.query.isRead !== undefined) {
      query.isRead = req.query.isRead === 'true';
    }

    if (req.query.type) {
      query.type = req.query.type;
    }

    const notifications = await Notification.find(query)
      .populate('relatedTask', 'title status priority')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 })
      .limit(req.query.limit ? parseInt(req.query.limit) : 50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    res.json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications,
        count: notifications.length,
        unreadCount
      },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve notifications',
      data: null,
      errors: [error.message]
    });
  }
});

// Mark notification as read
router.post('/:id/read', authRequired, async (req, res) => {
  try {
    // Strict privacy: only user can mark their own notifications as read
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
        data: null,
        errors: ['Notification does not exist or you do not have access']
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification },
      errors: null
    });
  } catch (error) {
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID',
        data: null,
        errors: ['Invalid ID format']
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to mark notification as read',
      data: null,
      errors: [error.message]
    });
  }
});

module.exports = router;

