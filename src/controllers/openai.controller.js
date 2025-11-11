import { openAIService } from '../services/openai.service.js';
import { ConversationModel } from '../models/conversation.js';
import { corsMiddleware } from '../middleware/cors.js';

/**
 * OpenAI Proxy Controller
 */
export class OpenAIController {
  /**
   * Handle custom prompt API requests
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async handleGenericRequest(req, res) {
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
      const { prompt, context } = req.body;

      // Validate request structure
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Prompt is required and must be a string'
        });
      }

      console.log('🔄 Processing custom prompt request...');

      return await OpenAIController.handleCustomPrompt({ prompt, context }, res);

    } catch (error) {
      console.error('❌ Custom prompt request error:', error.message);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process request'
      });
    }
  }


  /**
   * Handle custom prompt requests
   * @param {Object} data - Request data
   * @param {Object} res - Express response object
   */
  static async handleCustomPrompt(data, res) {
    try {
      const { prompt, context } = data;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
          error: 'Invalid prompt',
          message: 'Prompt is required and must be a string'
        });
      }

      // Create messages array from prompt and context
      const messages = [
        {
          role: 'system',
          content: context || 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      console.log('📝 Processing custom prompt request...');

      // Generate response using environment variables for options
      const { data: responseData, metadata } = await openAIService.generateChatCompletion(messages);

      return res.status(200).json({
        success: true,
        data: responseData,
        metadata
      });

    } catch (error) {
      console.error('❌ Custom prompt error:', error.message);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process custom prompt'
      });
    }
  }

  /**
   * Handle streaming chat completion request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async handleStreamingRequest(req, res) {
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
      const { prompt, context } = req.body;

      // Validate request structure
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Prompt is required and must be a string'
        });
      }

      console.log('🌊 Processing streaming request...');

      // Set up Server-Sent Events headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

      // Create messages array from prompt and context
      const messages = [
        {
          role: 'system',
          content: context || 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      // Generate streaming response using OpenAI service
      await openAIService.generateStreamingChatCompletion(messages, res);

    } catch (error) {
      console.error('❌ Streaming request error:', error.message);
      
      // Send error event
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process streaming request'
      })}\n\n`);
      
      res.end();
    }
  }

  /**
   * Handle streaming voice response request (combines OpenAI streaming + Deepgram TTS)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async handleStreamingVoiceRequest(req, res) {
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
      const { prompt, context, voiceSettings = {} } = req.body;

      // Validate request structure
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Prompt is required and must be a string'
        });
      }

      console.log('🎤🌊 Processing streaming voice request...');

      // Set up Server-Sent Events headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

      // Create messages array from prompt and context
      const messages = [
        {
          role: 'system',
          content: context || 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      // Generate streaming voice response using both services
      await openAIService.generateStreamingVoiceCompletion(messages, res, voiceSettings);

    } catch (error) {
      console.error('❌ Streaming voice request error:', error.message);
      
      // Send error event
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process streaming voice request'
      })}\n\n`);
      
      res.end();
    }
  }

  /**
   * Handle chat completion request (legacy method for backward compatibility)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async handleChatCompletion(req, res) {
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
      // Validate request body
      const { messages } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          error: 'Invalid request body',
          message: 'Messages array is required and must not be empty'
        });
      }

      // Validate message structure
      const validMessages = messages.every((msg) =>
        msg && typeof msg === 'object' &&
        msg.role && typeof msg.role === 'string' &&
        msg.content && typeof msg.content === 'string'
      );

      if (!validMessages) {
        return res.status(400).json({
          error: 'Invalid message format',
          message: 'Each message must have role and content properties'
        });
      }

      // Check for user message
      const userMessage = messages.find((msg) => msg.role === 'user');
      if (!userMessage) {
        return res.status(400).json({
          error: 'Missing user message',
          message: 'At least one user message is required'
        });
      }

      console.log('📝 Processing chat completion request...');

      // Generate chat completion
      const { data, metadata } = await openAIService.generateChatCompletion(messages);

      // Store conversation in database
      try {
        await ConversationModel.create({
          userInput: userMessage.content,
          aiResponse: data.choices[0].message,
          metadata
        });
        console.log('✅ Conversation stored in database');
      } catch (dbError) {
        console.error('❌ Failed to store conversation in database:', dbError.message);
        // Don't fail the request if database storage fails
      }

      // Return response
      return res.status(200).json(data);

    } catch (error) {
      console.error('❌ OpenAI controller error:', error.message);

      // Return appropriate error response
      if (error.message.includes('OpenAI API error')) {
        return res.status(502).json({
          error: 'OpenAI API error',
          message: error.message
        });
      }

      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process request'
      });
    }
  }


  /**
   * Health check endpoint (legacy method for backward compatibility)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async healthCheck(req, res) {
    try {
      const health = {
        status: 'UP',
        timestamp: new Date().toISOString(),
        service: 'OpenAI Proxy',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      return res.status(200).json(health);
    } catch (error) {
      return res.status(500).json({
        status: 'DOWN',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get conversation statistics (legacy method for backward compatibility)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getStats(req, res) {
    try {
      const stats = await ConversationModel.getStats();
      return res.status(200).json(stats);
    } catch (error) {
      console.error('❌ Error fetching stats:', error.message);
      return res.status(500).json({
        error: 'Failed to fetch statistics',
        message: error.message
      });
    }
  }

  /**
   * Get conversations with pagination (legacy method for backward compatibility)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getConversations(req, res) {
    try {
      // Parse query parameters with validation
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const sort = req.query.sort || 'timestamp';
      const sortOrder = req.query.order === 'asc' ? 1 : -1;

      // Calculate skip value
      const skip = (page - 1) * limit;

      const options = {
        limit,
        skip,
        sort: { [sort]: sortOrder }
      };

      // Get conversations and total count in parallel
      const [conversations, totalCount] = await Promise.all([
        ConversationModel.findAll(options),
        ConversationModel.getTotalCount()
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return res.status(200).json({
        conversations,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          skip,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null
        }
      });
    } catch (error) {
      console.error('❌ Error fetching conversations:', error.message);
      return res.status(500).json({
        error: 'Failed to fetch conversations',
        message: error.message
      });
    }
  }
}
