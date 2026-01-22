import { EventController } from '../../src/controllers/event.controller.js';
import { corsMiddleware } from '../../src/middleware/cors.js';

// Vercel serverless function handler for GET /api/events/range
export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, () => {});
  
  return await EventController.getByDateRange(req, res);
}
