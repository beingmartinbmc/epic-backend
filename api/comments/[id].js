import { CommentController } from '../../src/controllers/comment.controller.js';
import { corsMiddleware } from '../../src/middleware/cors.js';

// Vercel serverless function handler for GET /api/comments/[id]
export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, () => {});

  // Get id from query params (Vercel puts dynamic route params in query)
  req.params = { id: req.query.id };
  
  return await CommentController.getById(req, res);
}
