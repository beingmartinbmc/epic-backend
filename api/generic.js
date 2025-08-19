import { OpenAIController } from '../src/controllers/openai.controller.js';

// Vercel serverless function handler for generic API
export default async function handler(req, res) {
  return await OpenAIController.handleGenericRequest(req, res);
} 