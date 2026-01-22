import { CommentController } from '../../src/controllers/comment.controller.js';
import { corsMiddleware } from '../../src/middleware/cors.js';

// Vercel serverless function handler for POST /api/comments/create
export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, () => {});
  
  return await CommentController.create(req, res);
}
