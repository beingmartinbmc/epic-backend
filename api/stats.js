import { OpenAIController } from '../src/controllers/openai.controller.js';
import { corsMiddleware } from '../src/middleware/cors.js';

// Vercel serverless function handler for stats API
export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, () => {});
  
  return await OpenAIController.getStats(req, res);
}
