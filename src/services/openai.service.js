import dotenv from 'dotenv';
import { getCustomMetric } from '../config/actuator.js';

dotenv.config();

/**
 * OpenAI API Service
 */
export class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.maxTokens = parseInt(process.env.OPENAI_TOKEN) || 1000;

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
        // temperature: options.temperature || this.generateRandomizedTemperature(),
          max_completion_tokens: options.maxTokens || this.maxTokens,
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
          // temperature: requestData.temperature,
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
}

// Export singleton instance
export const openAIService = new OpenAIService();
