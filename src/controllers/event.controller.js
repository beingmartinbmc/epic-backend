import { EventModel } from '../models/event.js';
import { CommentModel } from '../models/comment.js';

/**
 * Event Controller - CRUD operations for events
 */
export class EventController {
  /**
   * Create a new event
   * POST /api/events
   */
  static async create(req, res) {
    try {
      const { title, description, eventDate, category, metadata } = req.body;

      if (!title) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Title is required'
        });
      }

      if (!eventDate) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Event date is required'
        });
      }

      const event = await EventModel.create({
        title,
        description,
        eventDate,
        category,
        metadata
      });

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event
      });
    } catch (error) {
      console.error('❌ Error in EventController.create:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get all events with pagination
   * GET /api/events
   */
  static async getAll(req, res) {
    try {
      const { limit = 100, skip = 0, category, sortBy = 'eventDate', sortOrder = 'desc' } = req.query;

      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const events = await EventModel.findAll({
        limit: parseInt(limit),
        skip: parseInt(skip),
        sort,
        category
      });

      const total = await EventModel.getTotalCount(category ? { category } : {});

      res.json({
        success: true,
        data: events,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: parseInt(skip) + events.length < total
        }
      });
    } catch (error) {
      console.error('❌ Error in EventController.getAll:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get event by ID
   * GET /api/events/:id
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const event = await EventModel.findById(id);

      if (!event) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Event not found'
        });
      }

      res.json({
        success: true,
        data: event
      });
    } catch (error) {
      console.error('❌ Error in EventController.getById:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Update event by ID
   * PUT /api/events/:id
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { title, description, eventDate, category, metadata } = req.body;

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (eventDate !== undefined) updateData.eventDate = eventDate;
      if (category !== undefined) updateData.category = category;
      if (metadata !== undefined) updateData.metadata = metadata;

      const event = await EventModel.updateById(id, updateData);

      if (!event) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Event not found'
        });
      }

      res.json({
        success: true,
        message: 'Event updated successfully',
        data: event
      });
    } catch (error) {
      console.error('❌ Error in EventController.update:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Delete event by ID
   * DELETE /api/events/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      // First delete all comments associated with this event
      const deletedCommentsCount = await CommentModel.deleteByEventId(id);

      const deleted = await EventModel.deleteById(id);

      if (!deleted) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Event not found'
        });
      }

      res.json({
        success: true,
        message: 'Event deleted successfully',
        deletedCommentsCount
      });
    } catch (error) {
      console.error('❌ Error in EventController.delete:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get events by date range
   * GET /api/events/range
   */
  static async getByDateRange(req, res) {
    try {
      const { startDate, endDate, limit = 100, skip = 0 } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'startDate and endDate are required'
        });
      }

      const events = await EventModel.findByDateRange(startDate, endDate, {
        limit: parseInt(limit),
        skip: parseInt(skip)
      });

      res.json({
        success: true,
        data: events,
        count: events.length
      });
    } catch (error) {
      console.error('❌ Error in EventController.getByDateRange:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get upcoming events
   * GET /api/events/upcoming
   */
  static async getUpcoming(req, res) {
    try {
      const { limit = 10 } = req.query;

      const events = await EventModel.findUpcoming({
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: events,
        count: events.length
      });
    } catch (error) {
      console.error('❌ Error in EventController.getUpcoming:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}
