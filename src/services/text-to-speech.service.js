/**
 * Text-to-Speech Service using Deepgram API
 * Serverless-friendly version that works entirely in memory
 */
class TextToSpeechService {
  constructor() {
    this.voiceKey = process.env.VOICE_KEY;
    this.deepgramApiUrl = 'https://api.deepgram.com/v1/speak';
  }

  /**
   * Generate speech from text using Deepgram API
   * @param {string} text - Text to convert to speech
   * @returns {Buffer} - Audio buffer
   */
  async generateSpeech(text) {
    if (!this.voiceKey) {
      throw new Error('VOICE_KEY environment variable is not set');
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Invalid text input');
    }

    try {
      console.log('🎵 Generating speech with Deepgram...');

      // Make request to Deepgram API
      const response = await fetch(`${this.deepgramApiUrl}?model=aura-2-draco-en`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.voiceKey}`,
          'Content-Type': 'text/plain'
        },
        body: text
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deepgram API error (${response.status}): ${errorText}`);
      }

      // Get audio buffer directly from response
      const audioBuffer = Buffer.from(await response.arrayBuffer());

      console.log(`✅ Speech generated successfully (${audioBuffer.length} bytes)`);

      return audioBuffer;

    } catch (error) {
      console.error('❌ Text-to-speech generation failed:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const textToSpeechService = new TextToSpeechService();
