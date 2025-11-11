# 💬 Chat Integration Guide

## Quick Integration for Your Chat App

Here's how to integrate the streaming voice API into your existing chat interface:

### 1. Basic Setup

```javascript
// Configuration
const API_BASE = 'https://epic-backend-82b9dbzwq-beingmartinbmcs-projects.vercel.app';
let isVoiceEnabled = false;
let isStreaming = false;

// Toggle voice feature
function toggleVoice() {
    isVoiceEnabled = !isVoiceEnabled;
    // Update your UI to show voice is enabled/disabled
}
```

### 2. Send Message Function

Replace your existing send message function with this:

```javascript
async function sendMessage(userMessage) {
    // Add user message to your chat UI
    addMessageToChat('user', userMessage);
    
    // Choose API based on voice setting
    if (isVoiceEnabled) {
        await sendStreamingVoiceMessage(userMessage);
    } else {
        await sendStreamingTextMessage(userMessage);
    }
}
```

### 3. Text-Only Streaming

```javascript
async function sendStreamingTextMessage(message) {
    // Create placeholder for bot response
    const botMessageElement = addMessageToChat('bot', '');
    const textContainer = botMessageElement.querySelector('.message-text');
    
    isStreaming = true;
    updateSendButton(false); // Disable send button
    
    try {
        const response = await fetch(`${API_BASE}/api/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: message,
                context: "You are a helpful assistant."
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('event: chunk\\ndata: ')) {
                    try {
                        const data = JSON.parse(line.slice('event: chunk\\ndata: '.length));
                        fullText += data.content;
                        textContainer.textContent = fullText;
                        scrollToBottom();
                    } catch (e) {
                        console.warn('Parse error:', e);
                    }
                }
            }
        }
    } catch (error) {
        textContainer.textContent = 'Sorry, there was an error.';
    } finally {
        isStreaming = false;
        updateSendButton(true); // Re-enable send button
    }
}
```

### 4. Voice + Text Streaming

```javascript
async function sendStreamingVoiceMessage(message) {
    // Create bot message with voice controls
    const botMessageElement = addMessageToChat('bot', '', true); // true = has voice
    const textContainer = botMessageElement.querySelector('.message-text');
    const playButton = botMessageElement.querySelector('.play-button');
    const audioProgress = botMessageElement.querySelector('.audio-progress');
    
    const audioChunks = [];
    let fullText = '';
    isStreaming = true;
    updateSendButton(false);
    
    try {
        const response = await fetch(`${API_BASE}/api/stream-voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: message,
                context: "You are a helpful assistant.",
                voiceSettings: {
                    model: "aura-2-draco-en",
                    chunkSize: 25
                }
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let eventType = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    eventType = line.slice(7);
                } else if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (eventType === 'text') {
                            // Update text in real-time
                            fullText += data.content;
                            textContainer.textContent = fullText;
                            scrollToBottom();
                        } else if (eventType === 'audio') {
                            // Collect audio chunks
                            audioChunks.push(data);
                            audioProgress.textContent = `${audioChunks.length} audio chunks ready`;
                        } else if (eventType === 'done') {
                            // Enable play button
                            playButton.disabled = false;
                            audioProgress.textContent = `Ready to play`;
                        }
                    } catch (e) {
                        console.warn('Parse error:', e);
                    }
                }
            }
        }
        
        // Store audio data for playback
        botMessageElement.audioChunks = audioChunks;
        
    } catch (error) {
        textContainer.textContent = 'Sorry, there was an error.';
    } finally {
        isStreaming = false;
        updateSendButton(true);
    }
}
```

### 5. Audio Playback

```javascript
function playVoiceMessage(messageElement) {
    const audioChunks = messageElement.audioChunks;
    if (!audioChunks || audioChunks.length === 0) return;
    
    const playButton = messageElement.querySelector('.play-button');
    const progress = messageElement.querySelector('.audio-progress');
    
    playButton.disabled = true;
    playButton.textContent = '⏸️ Playing...';
    
    let chunkIndex = 0;
    
    function playNextChunk() {
        if (chunkIndex >= audioChunks.length) {
            playButton.disabled = false;
            playButton.textContent = '▶️ Play';
            progress.textContent = 'Completed';
            return;
        }
        
        const chunk = audioChunks[chunkIndex];
        progress.textContent = `Playing ${chunkIndex + 1}/${audioChunks.length}`;
        
        // Convert base64 to audio and play
        const audioBlob = base64ToBlob(chunk.audio, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            chunkIndex++;
            setTimeout(playNextChunk, 100); // Small delay between chunks
        };
        
        audio.onerror = () => {
            chunkIndex++; // Skip failed chunk
            setTimeout(playNextChunk, 100);
        };
        
        audio.play();
    }
    
    playNextChunk();
}

// Helper function to convert base64 to blob
function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}
```

### 6. HTML Structure for Chat Messages

Update your chat message HTML to support voice:

```html
<!-- Text-only message -->
<div class="message bot">
    <div class="message-content">
        <div class="message-text"></div>
    </div>
</div>

<!-- Voice-enabled message -->
<div class="message bot voice-message">
    <div class="message-content">
        <div class="message-text"></div>
        <div class="voice-controls">
            <button class="play-button" onclick="playVoiceMessage(this.closest('.message'))" disabled>
                ▶️ Play
            </button>
            <span class="audio-progress">Preparing audio...</span>
        </div>
    </div>
</div>
```

### 7. CSS for Voice Controls

```css
.voice-controls {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.play-button {
    background: #28a745;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 11px;
}

.play-button:disabled {
    background: #6c757d;
    cursor: not-allowed;
}

.audio-progress {
    font-size: 11px;
    color: #666;
}

.voice-toggle {
    background: #007bff;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 15px;
    cursor: pointer;
}

.voice-toggle.enabled {
    background: #28a745;
}
```

### 8. Integration Steps

1. **Add voice toggle button** to your chat header
2. **Replace your send function** with the streaming versions above
3. **Update your addMessageToChat function** to support voice controls
4. **Add the CSS** for voice controls styling
5. **Test with simple messages** first, then complex ones

### 9. Error Handling

```javascript
// Add to your error handling
function handleStreamingError(error, messageElement) {
    console.error('Streaming error:', error);
    
    const textContainer = messageElement.querySelector('.message-text');
    textContainer.textContent = 'Sorry, there was a connection error. Please try again.';
    
    // Hide voice controls if they exist
    const voiceControls = messageElement.querySelector('.voice-controls');
    if (voiceControls) {
        voiceControls.style.display = 'none';
    }
}
```

### 10. Performance Tips

- Set `chunkSize` to 20-30 words for balance between speed and quality
- Use `bufferAudio: true` for smoother playback
- Handle audio errors gracefully (some chunks might fail)
- Clean up audio URLs with `URL.revokeObjectURL()` to prevent memory leaks

This integration gives your users both real-time text streaming and optional voice responses, creating a more engaging chat experience! 🚀