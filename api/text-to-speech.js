import { TextToSpeechController } from '../src/controllers/text-to-speech.controller.js';
import { corsMiddleware } from '../src/middleware/cors.js';

// Vercel serverless function handler for text-to-speech API
export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, () => {});
  
  return await TextToSpeechController.handleTextToSpeech(req, res);
}