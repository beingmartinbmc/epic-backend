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
   * Find natural break points in text for better audio chunking
   * @param {string} text - Text to analyze
   * @param {number} targetLength - Target chunk length
   * @returns {number} - Position of break point, or -1 if none found
   */
  findNaturalBreakPoint(text, targetLength) {
    const words = text.split(' ');
    if (words.length < targetLength) return -1;

    // Look for sentence endings first
    const sentenceEndings = /[.!?]\s+/g;
    let match;
    let bestBreak = -1;

    while ((match = sentenceEndings.exec(text)) !== null) {
      const wordCountAtBreak = text.substring(0, match.index).split(' ').length;
      if (wordCountAtBreak >= targetLength * 0.7 && wordCountAtBreak <= targetLength * 1.3) {
        return match.index + match[0].length;
      }
      if (wordCountAtBreak <= targetLength) {
        bestBreak = match.index + match[0].length;
      }
    }

    // If no sentence ending found, look for commas, semicolons, or other breaks
    if (bestBreak === -1) {
      const pausePoints = /[,;:]\s+/g;
      while ((match = pausePoints.exec(text)) !== null) {
        const wordCountAtBreak = text.substring(0, match.index).split(' ').length;
        if (wordCountAtBreak >= targetLength * 0.8 && wordCountAtBreak <= targetLength * 1.2) {
          return match.index + match[0].length;
        }
        if (wordCountAtBreak <= targetLength) {
          bestBreak = match.index + match[0].length;
        }
      }
    }

    return bestBreak;
  }

  /**
   * Estimate audio duration based on text length and speaking rate
   * @param {string} text - Text to estimate duration for
   * @returns {number} - Estimated duration in milliseconds
   */
  estimateAudioDuration(text) {
    // Average speaking rate: ~150 words per minute, ~2.5 words per second
    const wordCount = text.split(' ').length;
    const wordsPerSecond = 2.5;
    return Math.round((wordCount / wordsPerSecond) * 1000);
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
        messages.find((msg) => msg.role === 'user')?.content || ''
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

      console.log('🚀 Starting streaming request to OpenAI API...');

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

      console.log('✅ Streaming response received, processing chunks...');

      // Send initial metadata
      res.write('event: start\n');
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
        // eslint-disable-next-line no-constant-condition
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
                res.write('event: done\n');
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
                  const { delta } = parsed.choices[0];

                  if (delta.content) {
                    // Send content chunk
                    res.write('event: chunk\n');
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
      res.write('event: error\n');
      res.write(`data: ${JSON.stringify({
        error: 'Stream processing failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })}\n\n`);

      res.end();
    }
  }

  /**
   * Generate streaming voice completion (OpenAI + Deepgram TTS)
   * @param {Array} messages - Array of messages
   * @param {Object} res - Express response object
   * @param {Object} voiceSettings - Voice configuration options
   * @returns {Promise<void>} - Streams voice response to client
   */
  async generateStreamingVoiceCompletion(messages, res, voiceSettings = {}) {
    try {
      const selectedText = this.extractSelectedText(
        messages.find((msg) => msg.role === 'user')?.content || ''
      );

      // Voice configuration with enhanced chunking
      const {
        model = 'aura-2-draco-en',
        chunkSize = 30, // Reduced for lower latency
        minChunkSize = 15, // Minimum words before forcing chunk
        maxChunkSize = 60, // Maximum to prevent memory issues
        audioFormat = 'mp3', // Default format
        sampleRate = 24000, // Higher quality
        naturalBreaks = true // Enable natural speech breaks
      } = voiceSettings;

      // Record API call metric
      const apiCallsCounter = getCustomMetric('epic_api_calls_total');
      if (apiCallsCounter) {
        apiCallsCounter.inc();
      }

      // Add diversity instruction
      const diversifiedMessages = this.addDiversityInstruction(messages);

      // Prepare request data for streaming
      const requestData = {
        model: this.model,
        messages: diversifiedMessages,
        max_tokens: this.maxTokens,
        temperature: this.generateRandomizedTemperature(),
        stream: true,
        stream_options: {
          include_usage: true
        }
      };

      console.log('🎤 Starting streaming voice request...');

      // Send initial metadata with enhanced voice configuration
      res.write('event: start\n');
      res.write(`data: ${JSON.stringify({
        selectedText,
        model: requestData.model,
        voiceModel: model,
        voiceSettings: {
          chunkSize,
          minChunkSize,
          maxChunkSize,
          audioFormat,
          sampleRate,
          naturalBreaks
        },
        timestamp: new Date().toISOString()
      })}\n\n`);

      // Make streaming API call to OpenAI
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

      // Process streaming response and convert to voice
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let textBuffer = '';
      let totalTokens = 0;
      let chunkIndex = 0;
      const streamStartTime = Date.now();
      let firstChunkTime = null;
      const audioChunkTimes = [];

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Process any remaining text in buffer
            if (textBuffer.trim()) {
              if (!firstChunkTime) {
                firstChunkTime = Date.now();
              }

              const finalChunkStartTime = Date.now();

              await this.convertTextToSpeech(
                textBuffer.trim(),
                res,
                chunkIndex,
                model,
                {
                  audioFormat,
                  sampleRate,
                  estimatedDuration: this.estimateAudioDuration(textBuffer.trim()),
                  streamingLatency: finalChunkStartTime - streamStartTime
                }
              );

              // Record final chunk timing
              audioChunkTimes.push({
                chunkIndex,
                startTime: finalChunkStartTime,
                processingTime: Date.now() - finalChunkStartTime,
                wordCount: textBuffer.trim().split(' ').length
              });

              chunkIndex++;
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                const streamEndTime = Date.now();
                const totalStreamingTime = streamEndTime - streamStartTime;
                const avgChunkProcessingTime = audioChunkTimes.length > 0
                  ? audioChunkTimes.reduce((sum, chunk) => sum + chunk.processingTime, 0) / audioChunkTimes.length
                  : 0;

                // Send completion event with comprehensive timing data
                res.write('event: done\n');
                res.write(`data: ${JSON.stringify({
                  totalTokens,
                  totalChunks: chunkIndex,
                  selectedText,
                  timing: {
                    totalStreamingTime,
                    timeToFirstChunk: firstChunkTime ? firstChunkTime - streamStartTime : null,
                    averageChunkProcessingTime: Math.round(avgChunkProcessingTime),
                    totalAudioDuration: audioChunkTimes.reduce((sum, chunk) =>
                      sum + this.estimateAudioDuration(chunk.wordCount * 5), 0), // Rough estimate
                    chunkTimings: audioChunkTimes
                  },
                  performance: {
                    wordsPerSecond: totalTokens > 0 ? Math.round((totalTokens * 0.75) / (totalStreamingTime / 1000)) : 0,
                    chunksPerSecond: chunkIndex > 0 ? Math.round(chunkIndex / (totalStreamingTime / 1000)) : 0
                  },
                  timestamp: new Date().toISOString()
                })}\n\n`);
                res.end();
                return;
              }

              try {
                const parsed = JSON.parse(data);

                if (parsed.choices && parsed.choices[0]) {
                  const { delta } = parsed.choices[0];

                  if (delta.content) {
                    textBuffer += delta.content;

                    // Send text chunk for real-time display
                    res.write('event: text\n');
                    res.write(`data: ${JSON.stringify({
                      content: delta.content,
                      timestamp: new Date().toISOString()
                    })}\n\n`);

                    // Check if we have enough text for audio conversion
                    const words = textBuffer.split(' ');
                    let shouldCreateChunk = false;
                    let chunkText = '';

                    if (naturalBreaks && words.length >= minChunkSize) {
                      // Look for natural break points (sentence endings, commas, etc.)
                      const breakIndex = this.findNaturalBreakPoint(textBuffer, chunkSize);
                      if (breakIndex > 0) {
                        chunkText = textBuffer.substring(0, breakIndex).trim();
                        textBuffer = textBuffer.substring(breakIndex).trim();
                        shouldCreateChunk = true;
                      }
                    }

                    // Fallback to word-count based chunking
                    if (!shouldCreateChunk) {
                      if (words.length >= chunkSize ||
                          (words.length >= maxChunkSize)) {
                        const actualChunkSize = Math.min(words.length, chunkSize);
                        chunkText = words.slice(0, actualChunkSize).join(' ');
                        textBuffer = words.slice(actualChunkSize).join(' ');
                        shouldCreateChunk = true;
                      }
                    }

                    if (shouldCreateChunk && chunkText) {
                      // Record timing for first chunk
                      if (!firstChunkTime) {
                        firstChunkTime = Date.now();
                      }

                      const chunkStartTime = Date.now();

                      // Convert to speech asynchronously with enhanced metadata
                      await this.convertTextToSpeech(
                        chunkText,
                        res,
                        chunkIndex,
                        model,
                        {
                          audioFormat,
                          sampleRate,
                          estimatedDuration: this.estimateAudioDuration(chunkText),
                          streamingLatency: chunkStartTime - streamStartTime
                        }
                      );

                      // Record chunk processing time
                      audioChunkTimes.push({
                        chunkIndex,
                        startTime: chunkStartTime,
                        processingTime: Date.now() - chunkStartTime,
                        wordCount: chunkText.split(' ').length
                      });

                      chunkIndex++;
                    }
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
      console.error('❌ Error in streaming voice completion:', error.message);

      // Record error metric
      const errorsCounter = getCustomMetric('epic_errors_total');
      if (errorsCounter) {
        errorsCounter.inc();
      }

      // Send error event
      res.write('event: error\n');
      res.write(`data: ${JSON.stringify({
        error: 'Voice streaming failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })}\n\n`);

      res.end();
    }
  }

  /**
   * Convert text to speech using Deepgram and stream as base64
   * @param {string} text - Text to convert
   * @param {Object} res - Response object
   * @param {number} chunkIndex - Audio chunk index
   * @param {string} voiceModel - Deepgram voice model
   * @param {Object} options - Additional options for TTS
   */
  async convertTextToSpeech(text, res, chunkIndex, voiceModel, options = {}) {
    try {
      const voiceKey = process.env.VOICE_KEY;
      if (!voiceKey) {
        console.warn('⚠️ VOICE_KEY not configured, skipping TTS');
        return;
      }

      const {
        audioFormat = 'mp3',
        sampleRate = 24000,
        estimatedDuration = 0,
        streamingLatency = 0
      } = options;

      console.log(`🎵 Converting chunk ${chunkIndex} to speech: "${text.substring(0, 50)}..."`);

      // Build Deepgram URL with enhanced parameters
      const deepgramUrl = new URL('https://api.deepgram.com/v1/speak');
      deepgramUrl.searchParams.append('model', voiceModel);
      deepgramUrl.searchParams.append('encoding', audioFormat === 'wav' ? 'linear16' : 'mp3');
      if (audioFormat === 'wav' && sampleRate) {
        deepgramUrl.searchParams.append('sample_rate', sampleRate);
      }

      const response = await fetch(deepgramUrl.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Token ${voiceKey}`,
          'Content-Type': 'text/plain'
        },
        body: text
      });

      if (!response.ok) {
        console.warn(`⚠️ Deepgram TTS failed for chunk ${chunkIndex}:`, response.status);
        // Send error event but continue processing
        res.write('event: audio-error\n');
        res.write(`data: ${JSON.stringify({
          chunkIndex,
          text,
          error: `TTS API error: ${response.status}`,
          timestamp: new Date().toISOString()
        })}\n\n`);
        return;
      }

      // Get audio buffer and convert to base64
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const base64Audio = audioBuffer.toString('base64');

      // Determine MIME type based on format
      const mimeType = audioFormat === 'wav' ? 'audio/wav' : 'audio/mpeg';

      // Send enhanced audio chunk with metadata
      res.write('event: audio\n');
      res.write(`data: ${JSON.stringify({
        chunkIndex,
        audio: base64Audio,
        text,
        mimeType,
        audioFormat,
        sampleRate: audioFormat === 'wav' ? sampleRate : undefined,
        estimatedDuration,
        actualSize: audioBuffer.length,
        streamingLatency,
        timing: {
          queuedAt: Date.now(),
          processingStarted: Date.now() - streamingLatency
        },
        timestamp: new Date().toISOString(),
        wordCount: text.split(' ').length
      })}\n\n`);

      console.log(`✅ Audio chunk ${chunkIndex} sent (${audioBuffer.length} bytes, ~${estimatedDuration}ms)`);

    } catch (error) {
      console.error(`❌ TTS conversion failed for chunk ${chunkIndex}:`, error.message);

      // Send error for this specific chunk, but continue processing
      res.write('event: audio-error\n');
      res.write(`data: ${JSON.stringify({
        chunkIndex,
        text,
        error: error.message,
        timestamp: new Date().toISOString()
      })}\n\n`);
    }
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();
