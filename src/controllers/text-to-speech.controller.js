import { textToSpeechService } from '../services/text-to-speech.service.js';

/**
 * Text-to-Speech Controller
 */
export class TextToSpeechController {
  /**
   * Handle text-to-speech API requests
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async handleTextToSpeech(req, res) {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Validate request method
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed',
        message: 'Only POST requests are allowed'
      });
    }

    try {
      const { text } = req.body;

      // Validate request structure
      if (!text || typeof text !== 'string') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Text is required and must be a string'
        });
      }

      // Validate text length (reasonable limit)
      if (text.length > 5000) {
        return res.status(400).json({
          error: 'Text too long',
          message: 'Text must be less than 5000 characters'
        });
      }

      console.log('🎤 Processing text-to-speech request...');

      // Generate speech using Deepgram
      const audioBuffer = await textToSpeechService.generateSpeech(text);

      // Set appropriate headers for MP3 response
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', 'inline; filename="speech.mp3"');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      // Send the audio buffer directly
      return res.status(200).send(audioBuffer);

    } catch (error) {
      console.error('❌ Text-to-speech error:', error.message);
      
      if (error.message.includes('VOICE_KEY')) {
        return res.status(500).json({
          error: 'Configuration error',
          message: 'Voice API key not configured'
        });
      }

      if (error.message.includes('Deepgram')) {
        return res.status(502).json({
          error: 'External service error',
          message: 'Failed to generate speech'
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process text-to-speech request'
      });
    }
  }
}