import { EventController } from '../src/controllers/event.controller.js';
import { corsMiddleware } from '../src/middleware/cors.js';

// Vercel serverless function handler for all /api/events operations
// Uses query param 'action' to route: create, update, delete, upcoming, range
// Uses query param 'id' for specific event operations
export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, () => {});

  const { action, id } = req.query;

  // Set params for controllers that expect req.params
  req.params = { id };

  try {
    switch (action) {
      case 'create':
        return await EventController.create(req, res);
      case 'update':
        if (!id) {
          return res.status(400).json({ error: 'id is required for update' });
        }
        return await EventController.update(req, res);
      case 'delete':
        if (!id) {
          return res.status(400).json({ error: 'id is required for delete' });
        }
        return await EventController.delete(req, res);
      case 'upcoming':
        return await EventController.getUpcoming(req, res);
      case 'range':
        return await EventController.getByDateRange(req, res);
      case 'get':
        if (!id) {
          return res.status(400).json({ error: 'id is required for get' });
        }
        return await EventController.getById(req, res);
      default:
        // Default: list all events
        return await EventController.getAll(req, res);
    }
  } catch (error) {
    console.error('❌ Error in events handler:', error.message);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
