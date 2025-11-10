import dotenv from 'dotenv';
import { getCustomMetric } from '../config/actuator.js';

dotenv.config();

/**
 * OpenAI API Service
 */
export class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = 'gpt-4.1-nano';
    this.maxTokens = parseInt(process.env.OPENAI_TOKEN) || 1000;
    this.baseTemperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.8;

    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
  }

  /**
   * Extract selected text option from user message
   * @param {string} userMessage - User's message
   * @returns {string} - Selected text option
   */
  extractSelectedText(userMessage) {
    if (userMessage.includes('from EACH of the following:')) {
      return 'ALL';
    } else if (userMessage.includes('Bhagavad Gita')) {
      return 'BHAGAVAD_GITA';
    } else if (userMessage.includes('Vedas')) {
      return 'VEDAS';
    } else if (userMessage.includes('Quran')) {
      return 'QURAN';
    } else if (userMessage.includes('Bible')) {
      return 'BIBLE';
    } else if (userMessage.includes('Guru Granth Sahib')) {
      return 'GURU_GRANTH_SAHIB';
    }
    return 'ALL';
  }

  /**
   * Generate randomized temperature for diversity
   * @returns {number} - Randomized temperature value
   */
  generateRandomizedTemperature() {
    const temperatureVariance = 0.15;
    return Math.min(1.0, Math.max(0.6,
      this.baseTemperature + (Math.random() - 0.5) * temperatureVariance * 2
    ));
  }

  /**
   * Add diversity instruction to prevent repetitive quotes
   * @param {Array} messages - Original messages array
   * @returns {Array} - Modified messages with diversity instruction
   */
  addDiversityInstruction(messages) {
    const diversityInstruction =
      'IMPORTANT: Provide diverse quotes from different chapters and verses. ' +
      'Avoid repeating the same quotes. Each response should include quotes from ' +
      'various parts of the scripture to provide comprehensive guidance.';

    return messages.map((msg) => {
      if (msg.role === 'system') {
        return {
          ...msg,
          content: `${msg.content}\n\n${diversityInstruction}`
        };
      }
      return msg;
    });
  }

  /**
   * Make API call to OpenAI with retry logic
   * @param {Object} requestData - Request data
   * @param {number} retries - Number of retries
   * @returns {Promise<Object>} - OpenAI API response
   */
  async makeAPICall(requestData, retries = 3) {
    const startTime = Date.now();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();

        // Record metrics
        this.recordMetrics(startTime, data);

        return data;
      } catch (error) {
        console.error(`❌ OpenAI API attempt ${attempt} failed:`, error.message);

        if (attempt === retries) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Record metrics for monitoring
   * @param {number} startTime - Start time of the request
   * @param {Object} _data - Response data
   */
  recordMetrics(startTime, _data) {
    try {
      const responseTime = (Date.now() - startTime) / 1000;

      // Record response time
      const responseTimeHistogram = getCustomMetric('epic_response_time_seconds');
      if (responseTimeHistogram) {
        responseTimeHistogram.observe(responseTime);
        console.log(`✅ Recorded response time: ${responseTime.toFixed(3)}s`);
      }

      // Record conversation count
      const conversationsCounter = getCustomMetric('epic_conversations_total');
      if (conversationsCounter) {
        conversationsCounter.inc();
        console.log('✅ Incremented epic_conversations_total');
      }
    } catch (error) {
      console.error('❌ Error recording metrics:', error.message);
    }
  }

  /**
   * Generate chat completion
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Optional parameters to override defaults
   * @returns {Promise<Object>} - Generated response
   */
  async generateChatCompletion(messages, options = {}) {
    try {
      // Extract user message for analysis
      const userMessage = messages.find((msg) => msg.role === 'user')?.content || '';
      const selectedText = this.extractSelectedText(userMessage);

      // Prepare request data with options override
      const requestData = {
        model: options.model || this.model,
        messages: options.skipDiversityInstruction ? messages : this.addDiversityInstruction(messages),
        temperature: options.temperature || this.generateRandomizedTemperature(),
        max_tokens: options.maxTokens || this.maxTokens,
        top_p: options.topP || 0.85,
        frequency_penalty: options.frequencyPenalty || 0.4,
        presence_penalty: options.presencePenalty || 0.2,
        stop: options.stop || null
      };

      console.log('🚀 Making OpenAI API request...');
      const data = await this.makeAPICall(requestData);

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response generated from OpenAI API');
      }

      return {
        data,
        metadata: {
          selectedText,
          model: requestData.model,
          temperature: requestData.temperature,
          maxTokens: requestData.max_tokens,
          usage: data.usage || {},
          requestId: data.id,
          customOptions: options
        }
      };
    } catch (error) {
      console.error('❌ Error generating chat completion:', error.message);

      // Record error metric
      const errorsCounter = getCustomMetric('epic_errors_total');
      if (errorsCounter) {
        errorsCounter.inc();
      }

      throw error;
    }
  }

  /**
   * Generate streaming chat completion
   * @param {Array} messages - Array of messages
   * @param {Object} res - Express response object
   * @param {Object} options - Optional parameters for customization
   * @returns {Promise<void>} - Streams response to client
   */
  async generateStreamingChatCompletion(messages, res, options = {}) {
    try {
      const selectedText = this.extractSelectedText(
        messages.find(msg => msg.role === 'user')?.content || ''
      );

      // Record API call metric
      const apiCallsCounter = getCustomMetric('epic_api_calls_total');
      if (apiCallsCounter) {
        apiCallsCounter.inc();
      }

      // Add diversity instruction
      const diversifiedMessages = this.addDiversityInstruction(messages);

      // Prepare request data for streaming
      const requestData = {
        model: options.model || this.model,
        messages: diversifiedMessages,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.generateRandomizedTemperature(),
        stream: true, // Enable streaming
        stream_options: {
          include_usage: true
        }
      };

      console.log(`🚀 Starting streaming request to OpenAI API...`);

      // Make streaming API call
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      console.log(`✅ Streaming response received, processing chunks...`);

      // Send initial metadata
      res.write(`event: start\n`);
      res.write(`data: ${JSON.stringify({
        selectedText,
        model: requestData.model,
        temperature: requestData.temperature,
        maxTokens: requestData.max_tokens
      })}\n\n`);

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let totalTokens = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                // Send completion event
                res.write(`event: done\n`);
                res.write(`data: ${JSON.stringify({
                  totalTokens,
                  selectedText,
                  timestamp: new Date().toISOString()
                })}\n\n`);
                res.end();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.choices && parsed.choices[0]) {
                  const delta = parsed.choices[0].delta;
                  
                  if (delta.content) {
                    // Send content chunk
                    res.write(`event: chunk\n`);
                    res.write(`data: ${JSON.stringify({
                      content: delta.content,
                      timestamp: new Date().toISOString()
                    })}\n\n`);
                  }

                  // Track usage if available
                  if (parsed.usage) {
                    totalTokens = parsed.usage.total_tokens;
                  }
                }
              } catch (parseError) {
                console.warn('⚠️ Failed to parse streaming chunk:', parseError.message);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Record success metric
      const successCounter = getCustomMetric('epic_successful_requests_total');
      if (successCounter) {
        successCounter.inc();
      }

    } catch (error) {
      console.error('❌ Error in streaming chat completion:', error.message);

      // Record error metric
      const errorsCounter = getCustomMetric('epic_errors_total');
      if (errorsCounter) {
        errorsCounter.inc();
      }

      // Send error event
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({
        error: 'Stream processing failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })}\n\n`);
      
      res.end();
    }
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();
