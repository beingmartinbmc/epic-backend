import { CommentController } from '../src/controllers/comment.controller.js';
import { corsMiddleware } from '../src/middleware/cors.js';

// Vercel serverless function handler for all /api/comments operations
// Uses query param 'action' to route: create, update, delete, by-event
// Uses query param 'id' for specific comment operations
// Uses query param 'eventId' for by-event action
export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, () => {});

  const { action, id, eventId } = req.query;

  // Set params for controllers that expect req.params
  req.params = { id, eventId };

  try {
    switch (action) {
      case 'create':
        return await CommentController.create(req, res);
      case 'update':
        if (!id) {
          return res.status(400).json({ error: 'id is required for update' });
        }
        return await CommentController.update(req, res);
      case 'delete':
        if (!id) {
          return res.status(400).json({ error: 'id is required for delete' });
        }
        return await CommentController.delete(req, res);
      case 'by-event':
        if (!eventId) {
          return res.status(400).json({ error: 'eventId is required for by-event' });
        }
        return await CommentController.getByEventId(req, res);
      case 'get':
        if (!id) {
          return res.status(400).json({ error: 'id is required for get' });
        }
        return await CommentController.getById(req, res);
      default:
        // Default: list all comments
        return await CommentController.getAll(req, res);
    }
  } catch (error) {
    console.error('❌ Error in comments handler:', error.message);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
