import { CommentController } from '../../src/controllers/comment.controller.js';
import { corsMiddleware } from '../../src/middleware/cors.js';

// Vercel serverless function handler for GET /api/comments/by-event?eventId=xxx
export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, () => {});

  // Get eventId from query params
  req.params = { eventId: req.query.eventId };
  
  return await CommentController.getByEventId(req, res);
}
