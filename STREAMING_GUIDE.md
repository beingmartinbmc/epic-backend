# 🎤🌊 Streaming APIs Integration Guide

## Overview

Your backend now provides three powerful streaming endpoints that can be combined in different ways:

1. **Text Streaming**: `/api/stream` - Real-time text generation
2. **Voice Generation**: `/api/text-to-speech` - Convert text to MP3
3. **Streaming Voice**: `/api/stream-voice` - Combined real-time text + voice

## API Endpoints

### 1. Text Streaming API
**Endpoint**: `POST /api/stream`
```javascript
// Request
{
  "prompt": "Tell me about courage",
  "context": "You are a wise teacher"
}

// Response Events
event: start     // Metadata
event: chunk     // Text pieces
event: done      // Completion
event: error     // Error handling
```

### 2. Text-to-Speech API
**Endpoint**: `POST /api/text-to-speech`
```javascript
// Request
{
  "text": "Hello, this will be converted to speech"
}

// Response: MP3 audio file (binary)
```

### 3. Streaming Voice API (NEW!)
**Endpoint**: `POST /api/stream-voice`
```javascript
// Request
{
  "prompt": "Tell me a story",
  "context": "You are a storyteller",
  "voiceSettings": {
    "model": "aura-2-draco-en",
    "chunkSize": 30,
    "bufferAudio": true
  }
}

// Response Events
event: start       // Metadata
event: text        // Real-time text chunks
event: audio       // Base64 audio chunks
event: audio-error // Audio conversion errors
event: done        // Completion
event: error       // General errors
```

## Usage Examples

### 1. Simple Text Streaming
```javascript
const response = await fetch('/api/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Write a poem about nature",
    context: "You are a creative poet"
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // Process Server-Sent Events here
  console.log(chunk);
}
```

### 2. Text + Voice (Manual Combination)
```javascript
// Step 1: Get streaming text
const textResponse = await fetch('/api/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: "Tell me about AI" })
});

let fullText = '';
// Collect text chunks...

// Step 2: Convert to voice
const voiceResponse = await fetch('/api/text-to-speech', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: fullText })
});

const audioBlob = await voiceResponse.blob();
const audioUrl = URL.createObjectURL(audioBlob);
const audio = new Audio(audioUrl);
audio.play();
```

### 3. Real-time Streaming Voice
```javascript
const response = await fetch('/api/stream-voice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Explain quantum physics simply",
    context: "You are a science teacher",
    voiceSettings: {
      model: "aura-2-draco-en",
      chunkSize: 25
    }
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
const audioQueue = [];

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\\n');
  buffer = lines.pop();
  
  for (const line of lines) {
    if (line.startsWith('event: audio\\n')) {
      const dataLine = lines[lines.indexOf(line) + 1];
      if (dataLine?.startsWith('data: ')) {
        const audioData = JSON.parse(dataLine.slice(6));
        
        // Convert base64 to audio and play
        const audioBlob = base64ToBlob(audioData.audio, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        audioQueue.push(audioUrl);
        playNextInQueue();
      }
    }
  }
}
```

## Deepgram Voice Models

Available voice models for `voiceSettings.model`:
- `aura-2-draco-en` (default) - Deep, authoritative
- `aura-2-luna-en` - Warm, conversational
- `aura-2-stella-en` - Bright, energetic
- `aura-2-zeus-en` - Rich, commanding

## Configuration Options

### Voice Settings
```javascript
{
  "voiceSettings": {
    "model": "aura-2-draco-en",    // Deepgram voice model
    "chunkSize": 30,               // Words per audio chunk
    "bufferAudio": true            // Buffer for smoother playback
  }
}
```

### OpenAI Options
The streaming voice API inherits all OpenAI customization options:
- Temperature randomization for diversity
- Scripture text detection and categorization
- Token usage tracking and metrics

## Error Handling

### Event Types
- `audio-error`: Individual audio chunk failed (continues processing)
- `error`: Fatal error (stops stream)

### Example Error Handler
```javascript
function handleStreamEvent(eventType, data) {
  switch (eventType) {
    case 'audio-error':
      console.warn(`Audio failed for chunk ${data.chunkIndex}:`, data.error);
      // Continue processing other chunks
      break;
      
    case 'error':
      console.error('Stream failed:', data.message);
      // Stop processing
      break;
  }
}
```

## Performance Tips

1. **Chunk Size**: Smaller chunks = faster first audio, larger chunks = better audio quality
2. **Buffering**: Enable `bufferAudio` for smoother playback
3. **Error Recovery**: Handle individual audio chunk failures gracefully
4. **Memory Management**: Use `URL.revokeObjectURL()` to clean up audio blobs

## Live Demo

**Streaming Voice Endpoint**: https://epic-backend-82b9dbzwq-beingmartinbmcs-projects.vercel.app/api/stream-voice

**Test it with curl**:
```bash
curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Tell me a short joke", "voiceSettings": {"chunkSize": 20}}' \\
  "https://epic-backend-82b9dbzwq-beingmartinbmcs-projects.vercel.app/api/stream-voice"
```

This creates a powerful real-time conversational AI with voice that can be used for:
- Virtual assistants
- Educational applications
- Interactive storytelling
- Accessibility tools
- Voice-enabled chat bots