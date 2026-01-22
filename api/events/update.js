import { EventController } from '../../src/controllers/event.controller.js';
import { corsMiddleware } from '../../src/middleware/cors.js';

// Vercel serverless function handler for PUT /api/events/update?id=xxx
export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, () => {});

  // Get id from query params
  req.params = { id: req.query.id };
  
  return await EventController.update(req, res);
}
