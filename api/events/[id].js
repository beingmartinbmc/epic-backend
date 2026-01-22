import { EventController } from '../../src/controllers/event.controller.js';
import { corsMiddleware } from '../../src/middleware/cors.js';

// Vercel serverless function handler for /api/events/[id]
export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, () => {});

  // Get id from query params (Vercel puts dynamic route params in query)
  req.params = { id: req.query.id };
  
  return await EventController.getById(req, res);
}
