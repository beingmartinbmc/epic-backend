import { CommentModel } from '../models/comment.js';
import { EventModel } from '../models/event.js';

/**
 * Comment Controller - CRUD operations for comments
 */
export class CommentController {
  /**
   * Create a new comment
   * POST /api/comments
   */
  static async create(req, res) {
    try {
      const { eventId, content, author, metadata } = req.body;

      if (!eventId) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Event ID is required'
        });
      }

      if (!content) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Content is required'
        });
      }

      // Verify event exists
      const event = await EventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Event not found'
        });
      }

      const comment = await CommentModel.create({
        eventId,
        content,
        author,
        metadata
      });

      res.status(201).json({
        success: true,
        message: 'Comment created successfully',
        data: comment
      });
    } catch (error) {
      console.error('❌ Error in CommentController.create:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get all comments with pagination
   * GET /api/comments
   */
  static async getAll(req, res) {
    try {
      const { limit = 100, skip = 0, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const comments = await CommentModel.findAll({
        limit: parseInt(limit),
        skip: parseInt(skip),
        sort
      });

      const total = await CommentModel.getTotalCount();

      res.json({
        success: true,
        data: comments,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: parseInt(skip) + comments.length < total
        }
      });
    } catch (error) {
      console.error('❌ Error in CommentController.getAll:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get comment by ID
   * GET /api/comments/:id
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const comment = await CommentModel.findById(id);

      if (!comment) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Comment not found'
        });
      }

      res.json({
        success: true,
        data: comment
      });
    } catch (error) {
      console.error('❌ Error in CommentController.getById:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get comments by event ID
   * GET /api/events/:eventId/comments
   */
  static async getByEventId(req, res) {
    try {
      const { eventId } = req.params;
      const { limit = 100, skip = 0, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      // Verify event exists
      const event = await EventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Event not found'
        });
      }

      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const comments = await CommentModel.findByEventId(eventId, {
        limit: parseInt(limit),
        skip: parseInt(skip),
        sort
      });

      const total = await CommentModel.getCountByEventId(eventId);

      res.json({
        success: true,
        data: comments,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: parseInt(skip) + comments.length < total
        }
      });
    } catch (error) {
      console.error('❌ Error in CommentController.getByEventId:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Update comment by ID
   * PUT /api/comments/:id
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { content, author, metadata } = req.body;

      const updateData = {};
      if (content !== undefined) updateData.content = content;
      if (author !== undefined) updateData.author = author;
      if (metadata !== undefined) updateData.metadata = metadata;

      const comment = await CommentModel.updateById(id, updateData);

      if (!comment) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Comment not found'
        });
      }

      res.json({
        success: true,
        message: 'Comment updated successfully',
        data: comment
      });
    } catch (error) {
      console.error('❌ Error in CommentController.update:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Delete comment by ID
   * DELETE /api/comments/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const deleted = await CommentModel.deleteById(id);

      if (!deleted) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Comment not found'
        });
      }

      res.json({
        success: true,
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error in CommentController.delete:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}
