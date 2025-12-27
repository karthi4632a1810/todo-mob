const express = require('express');
const router = express.Router();
const Diary = require('../models/Diary');
const { authRequired } = require('../middleware/auth');

// Create diary entry
router.post('/', authRequired, async (req, res) => {
  try {
    const { title, content, isPinned, labels, backgroundColor } = req.body;

    // Validation
    const errors = [];
    if (!title || !title.trim()) {
      errors.push('Title is required');
    }
    if (!content || !content.trim()) {
      errors.push('Content is required');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: null,
        errors
      });
    }

    // Validate labels if provided
    if (labels && !Array.isArray(labels)) {
      return res.status(400).json({
        success: false,
        message: 'Labels must be an array',
        data: null,
        errors: ['Invalid labels format']
      });
    }

    // Create diary entry - owner is automatically set to current user
    const diaryData = {
      title: title.trim(),
      content: content.trim(),
      owner: req.user._id,
      isPinned: isPinned || false,
      backgroundColor: backgroundColor || '#ffffff'
    };

    // Add labels if provided
    if (labels && labels.length > 0) {
      diaryData.labels = labels.map(label => ({
        name: label.name?.trim() || '',
        color: label.color || '#6366f1'
      })).filter(label => label.name); // Remove empty labels
    }

    const diary = await Diary.create(diaryData);

    res.status(201).json({
      success: true,
      message: 'Diary entry created successfully',
      data: { diary },
      errors: null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create diary entry',
      data: null,
      errors: [error.message]
    });
  }
});

// Get today's diary entries (must be before /:id route)
router.get('/today', authRequired, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build query - strict privacy: only owner's entries from today
    const query = {
      owner: req.user._id,
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    };

    const diaries = await Diary.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Today\'s diary entries retrieved successfully',
      data: {
        diaries,
        count: diaries.length
      },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve today\'s diary entries',
      data: null,
      errors: [error.message]
    });
  }
});

// Get all diary entries (only owner's entries) with text search, label, and color filtering
router.get('/', authRequired, async (req, res) => {
  try {
    // Build query - strict privacy: only owner's entries
    let query = { owner: req.user._id };

    // Text search on title and content
    if (req.query.search && req.query.search.trim()) {
      const searchTerm = req.query.search.trim();
      // Use regex for case-insensitive search on title and content
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { content: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Filter by label name
    if (req.query.label && req.query.label.trim()) {
      query['labels.name'] = { $regex: req.query.label.trim(), $options: 'i' };
    }

    // Filter by label color
    if (req.query.labelColor && req.query.labelColor.trim()) {
      query['labels.color'] = req.query.labelColor.trim();
    }

    // Filter by background color
    if (req.query.backgroundColor && req.query.backgroundColor.trim()) {
      query.backgroundColor = req.query.backgroundColor.trim();
    }

    // Filter by pinned status
    if (req.query.isPinned !== undefined) {
      query.isPinned = req.query.isPinned === 'true';
    }

    // Date range filtering (optional)
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        const startDate = new Date(req.query.startDate);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid start date format',
            data: null,
            errors: ['startDate must be a valid date (YYYY-MM-DD)']
          });
        }
        startDate.setHours(0, 0, 0, 0);
        query.createdAt.$gte = startDate;
      }
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid end date format',
            data: null,
            errors: ['endDate must be a valid date (YYYY-MM-DD)']
          });
        }
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Sort: pinned first, then by creation date (newest first)
    const sortOptions = { isPinned: -1, createdAt: -1 };

    // Execute query
    const diaries = await Diary.find(query).sort(sortOptions);

    res.json({
      success: true,
      message: 'Diary entries retrieved successfully',
      data: {
        diaries,
        count: diaries.length
      },
      errors: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve diary entries',
      data: null,
      errors: [error.message]
    });
  }
});

// Get specific diary entry by ID (only if owner)
router.get('/:id', authRequired, async (req, res) => {
  try {
    // Strict privacy: only owner can access
    const diary = await Diary.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found',
        data: null,
        errors: ['Diary entry does not exist or you do not have access']
      });
    }

    res.json({
      success: true,
      message: 'Diary entry retrieved successfully',
      data: { diary },
      errors: null
    });
  } catch (error) {
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid diary entry ID',
        data: null,
        errors: ['Invalid ID format']
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve diary entry',
      data: null,
      errors: [error.message]
    });
  }
});

// Update diary entry (only if owner)
router.patch('/:id', authRequired, async (req, res) => {
  try {
    // Strict privacy: only owner can update
    const diary = await Diary.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found',
        data: null,
        errors: ['Diary entry does not exist or you do not have access']
      });
    }

    const { title, content, isPinned, labels, backgroundColor } = req.body;

    // Update fields
    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Title cannot be empty',
          data: null,
          errors: ['Title is required']
        });
      }
      diary.title = title.trim();
    }

    if (content !== undefined) {
      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Content cannot be empty',
          data: null,
          errors: ['Content is required']
        });
      }
      diary.content = content.trim();
    }

    if (isPinned !== undefined) {
      diary.isPinned = Boolean(isPinned);
    }

    if (backgroundColor !== undefined) {
      diary.backgroundColor = backgroundColor;
    }

    if (labels !== undefined) {
      if (!Array.isArray(labels)) {
        return res.status(400).json({
          success: false,
          message: 'Labels must be an array',
          data: null,
          errors: ['Invalid labels format']
        });
      }
      diary.labels = labels.map(label => ({
        name: label.name?.trim() || '',
        color: label.color || '#6366f1'
      })).filter(label => label.name); // Remove empty labels
    }

    await diary.save();

    res.json({
      success: true,
      message: 'Diary entry updated successfully',
      data: { diary },
      errors: null
    });
  } catch (error) {
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid diary entry ID',
        data: null,
        errors: ['Invalid ID format']
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update diary entry',
      data: null,
      errors: [error.message]
    });
  }
});

// Delete diary entry (only if owner)
router.delete('/:id', authRequired, async (req, res) => {
  try {
    // Strict privacy: only owner can delete
    const diary = await Diary.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: 'Diary entry not found',
        data: null,
        errors: ['Diary entry does not exist or you do not have access']
      });
    }

    res.json({
      success: true,
      message: 'Diary entry deleted successfully',
      data: null,
      errors: null
    });
  } catch (error) {
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid diary entry ID',
        data: null,
        errors: ['Invalid ID format']
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete diary entry',
      data: null,
      errors: [error.message]
    });
  }
});

module.exports = router;
