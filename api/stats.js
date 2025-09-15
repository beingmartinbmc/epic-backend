import { OpenAIController } from '../src/controllers/openai.controller.js';

// Vercel serverless function handler for stats API
export default async function handler(req, res) {
  return await OpenAIController.getStats(req, res);
}
