import { OpenAIController } from '../src/controllers/openai.controller.js';
import { sseCorsMiddleware } from '../src/middleware/cors.js';

// Vercel serverless function handler for streaming voice responses
export default async function handler(req, res) {
  // Apply SSE-optimized CORS middleware
  sseCorsMiddleware(req, res, () => {});
  
  return await OpenAIController.handleStreamingVoiceRequest(req, res);
}