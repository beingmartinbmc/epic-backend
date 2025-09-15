import { OpenAIController } from '../src/controllers/openai.controller.js';

// Vercel serverless function handler for conversations API
export default async function handler(req, res) {
  return await OpenAIController.getConversations(req, res);
}
