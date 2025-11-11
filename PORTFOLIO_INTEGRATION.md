# Portfolio App Integration Guide

## Enhanced Voice Streaming API for 3D Model Chat

This document provides comprehensive integration instructions for connecting your Portfolio app's 3D model chat feature with the enhanced voice streaming backend.

## Overview

The enhanced backend now provides:
- ✅ Optimized audio chunking with natural speech breaks
- ✅ Multiple audio format support (MP3, WAV)
- ✅ Enhanced error handling and graceful degradation
- ✅ Comprehensive timing metadata for 3D model animation sync
- ✅ SSE-optimized CORS configuration

## API Endpoints

### Primary Endpoint: `/api/stream-voice`
**Method:** POST  
**Type:** Server-Sent Events (SSE)  
**Purpose:** Streaming text + voice responses

## Frontend Integration Example

### 1. Basic SSE Connection

```javascript
// Portfolio app implementation
class VoiceStreamClient {
  constructor(backendUrl, options = {}) {
    this.backendUrl = backendUrl;
    this.options = {
      audioFormat: 'mp3', // or 'wav'
      voiceModel: 'aura-2-draco-en',
      sampleRate: 24000,
      naturalBreaks: true,
      ...options
    };
    this.audioQueue = [];
    this.isPlaying = false;
    this.currentAudio = null;
  }

  async startVoiceChat(prompt, context = "You are a helpful 3D model assistant.") {
    // Create POST request that returns SSE stream
    try {
      const response = await fetch(this.backendUrl + '/api/stream-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          prompt,
          context,
          voiceSettings: this.options
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read the SSE stream manually
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                const eventType = line.slice(7);
                const dataLine = lines[lines.indexOf(line) + 1];
                if (dataLine && dataLine.startsWith('data: ')) {
                  const eventData = dataLine.slice(6);
                  this.handleSSEEvent(eventType, eventData);
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream reading error:', error);
        }
      };

      processStream();
      return { reader, close: () => reader.cancel() };

    } catch (error) {
      console.error('Failed to start voice chat:', error);
      throw error;
    }
  }

  handleSSEEvent(eventType, data) {
    try {
      const parsedData = JSON.parse(data);
      
      switch (eventType) {
        case 'start':
          this.handleStart({ data });
          break;
        case 'text':
          this.handleText({ data });
          break;
        case 'audio':
          this.handleAudio({ data });
          break;
        case 'done':
          this.handleComplete({ data });
          break;
        case 'error':
          this.handleError({ data });
          break;
        case 'fallback':
          this.handleFallback({ data });
          break;
      }
    } catch (error) {
      console.error('Error parsing SSE event:', error);
    }
  }

  handleStart(event) {
    const data = JSON.parse(event.data);
    console.log('🎤 Voice streaming started:', data);
    
    // Initialize 3D model for speaking
    this.prepare3DModelForSpeech(data.voiceSettings);
  }

  handleText(event) {
    const data = JSON.parse(event.data);
    
    // Display text in real-time (typewriter effect)
    this.updateChatDisplay(data.content);
  }

  handleAudio(event) {
    const data = JSON.parse(event.data);
    
    // Queue audio for seamless playback
    this.queueAudioChunk({
      chunkIndex: data.chunkIndex,
      audioData: data.audio,
      mimeType: data.mimeType,
      estimatedDuration: data.estimatedDuration,
      text: data.text,
      timing: data.timing
    });
  }

  handleComplete(event) {
    const data = JSON.parse(event.data);
    console.log('✅ Voice streaming completed:', data);
    
    // Use timing data for 3D model animation coordination
    this.finalize3DModelAnimation(data.timing, data.performance);
  }

  handleError(event) {
    const data = JSON.parse(event.data);
    console.error('❌ Voice streaming error:', data);
    
    if (data.retryable) {
      // Implement retry logic
      setTimeout(() => this.retryRequest(), 2000);
    }
  }

  handleFallback(event) {
    const data = JSON.parse(event.data);
    console.log('🔄 Falling back to text-only mode:', data);
    
    // Switch to text-only endpoint
    this.switchToTextOnlyMode(data.endpoint);
  }
}
```

// Alternative: Using a custom EventSource-like helper
class SSEPostClient {
  static async connect(url, postData) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      throw new Error(`SSE connection failed: ${response.status}`);
    }

    const eventTarget = new EventTarget();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let eventType = 'message';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7);
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6);
              
              // Dispatch the event
              const event = new CustomEvent(eventType, {
                detail: { data: eventData }
              });
              eventTarget.dispatchEvent(event);
            }
          }
        }
      } catch (error) {
        const errorEvent = new CustomEvent('error', {
          detail: { error }
        });
        eventTarget.dispatchEvent(errorEvent);
      }
    };

    processStream();

    // Return EventSource-like interface
    return {
      addEventListener: (type, listener) => {
        eventTarget.addEventListener(type, (e) => {
          listener({ data: e.detail.data });
        });
      },
      close: () => reader.cancel()
    };
  }
}

// Usage with the helper
async startVoiceChatSimple(prompt, context) {
  const sseClient = await SSEPostClient.connect(
    this.backendUrl + '/api/stream-voice',
    { prompt, context, voiceSettings: this.options }
  );

  sseClient.addEventListener('start', this.handleStart.bind(this));
  sseClient.addEventListener('text', this.handleText.bind(this));
  sseClient.addEventListener('audio', this.handleAudio.bind(this));
  sseClient.addEventListener('done', this.handleComplete.bind(this));
  sseClient.addEventListener('error', this.handleError.bind(this));

  return sseClient;
}
```

### 2. Audio Queue Management

```javascript
class AudioQueueManager {
  constructor() {
    this.queue = [];
    this.isPlaying = false;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  queueAudio(audioChunk) {
    this.queue.push(audioChunk);
    this.queue.sort((a, b) => a.chunkIndex - b.chunkIndex);
    
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const chunk = this.queue.shift();
    
    try {
      // Decode base64 audio
      const audioData = atob(chunk.audioData);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      // Play audio
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      // Trigger 3D model mouth animation
      this.animate3DModelMouth(chunk.text, chunk.estimatedDuration);
      
      source.onended = () => {
        this.playNext(); // Play next chunk
      };
      
      source.start();
      
    } catch (error) {
      console.error('Audio playback error:', error);
      this.playNext(); // Skip this chunk and continue
    }
  }

  animate3DModelMouth(text, duration) {
    // Implement your 3D model mouth animation here
    // Use the text and duration for lip-sync approximation
    console.log(`🎭 Animating 3D model for: "${text}" (${duration}ms)`);
    
    // Example: Start mouth animation
    this.start3DMouthAnimation(duration);
  }
}
```

### 3. Complete Integration Example

```javascript
class Portfolio3DChatInterface {
  constructor() {
    this.voiceClient = new VoiceStreamClient('https://your-backend-url.vercel.app');
    this.audioManager = new AudioQueueManager();
    this.model3D = null; // Your 3D model reference
  }

  async initializeChat() {
    // Initialize your 3D model
    this.model3D = this.load3DModel();
    
    // Set up chat interface
    this.setupChatUI();
  }

  async sendMessage(userMessage) {
    try {
      // Show user message
      this.displayMessage('user', userMessage);
      
      // Start voice streaming with correct POST + SSE pattern
      const streamConnection = await this.voiceClient.startVoiceChat(
        userMessage,
        "You are an AI assistant embedded in a 3D portfolio. Be helpful and engaging while discussing my work and skills."
      );
      
      // Handle cleanup after timeout
      setTimeout(() => {
        streamConnection.close();
      }, 30000); // 30-second timeout
      
    } catch (error) {
      console.error('Chat error:', error);
      this.handleChatError(error);
    }
  }

  updateChatDisplay(content) {
    // Update chat UI with streaming text
    this.appendToCurrentMessage(content);
  }

  prepare3DModelForSpeech(voiceSettings) {
    // Prepare 3D model for speaking animation
    this.model3D.startSpeakingPreparation();
  }

  queueAudioChunk(audioChunk) {
    this.audioManager.queueAudio(audioChunk);
  }

  finalize3DModelAnimation(timing, performance) {
    // Use comprehensive timing data for smooth animation completion
    console.log('Animation timing data:', {
      totalDuration: timing.totalStreamingTime,
      averageChunkTime: timing.averageChunkProcessingTime,
      performance: performance
    });
    
    this.model3D.finalizeSpeakingAnimation();
  }
}
```

## Error Handling & Fallbacks

```javascript
class RobustVoiceChat {
  constructor() {
    this.maxRetries = 3;
    this.retryCount = 0;
  }

  async handleError(error) {
    if (error.retryable && this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`🔄 Retrying request (${this.retryCount}/${this.maxRetries})`);
      
      // Exponential backoff
      const delay = Math.pow(2, this.retryCount) * 1000;
      setTimeout(() => this.retryLastRequest(), delay);
      
    } else {
      // Fall back to text-only mode
      this.switchToTextOnlyMode();
    }
  }

  switchToTextOnlyMode() {
    console.log('🔄 Switching to text-only chat mode');
    
    // Use the regular streaming text endpoint
    this.useTextOnlyEndpoint('/api/stream');
    
    // Disable 3D model voice animations
    this.disable3DVoiceAnimations();
  }
}
```

## Backend Configuration

### Environment Variables Required

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_TOKEN=1000
OPENAI_TEMPERATURE=0.8

# Deepgram Configuration  
VOICE_KEY=your_deepgram_api_key

# Optional: Custom voice settings
DEFAULT_VOICE_MODEL=aura-2-draco-en
```

### Deployment Notes

1. **CORS Configuration:** Backend automatically allows your Portfolio app domains
2. **Rate Limiting:** Consider implementing rate limiting for production
3. **Error Monitoring:** Monitor the timing metrics for performance optimization
4. **Audio Quality:** Adjust `sampleRate` and `audioFormat` based on your needs

## Performance Optimization Tips

1. **Audio Format Choice:**
   - Use MP3 for smaller file sizes and faster streaming
   - Use WAV for higher quality (larger files)

2. **Chunk Size Optimization:**
   - Smaller chunks = lower latency, more requests
   - Larger chunks = higher latency, fewer requests
   - Default: 30 words (optimized for natural speech)

3. **3D Model Animation:**
   - Use `estimatedDuration` for animation timing
   - Implement audio visualization for better lip-sync
   - Cache common animations for better performance

## Testing

```bash
# Test the enhanced endpoint
curl -X POST https://your-backend-url.vercel.app/api/stream-voice \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello! Tell me about this portfolio.",
    "context": "You are a 3D AI assistant in a portfolio.",
    "voiceSettings": {
      "audioFormat": "mp3",
      "naturalBreaks": true,
      "chunkSize": 25
    }
  }'
```

## Next Steps

1. Implement the frontend integration in your Portfolio app
2. Test with your 3D model animations
3. Optimize chunk sizes and audio quality for your use case
4. Add visual feedback and loading states
5. Implement analytics and error tracking

The enhanced backend is now ready for seamless integration with your Portfolio app's 3D model chat feature! 🚀