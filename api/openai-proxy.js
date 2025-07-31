import { storeConversation } from './mongodb.js';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', 'https://beingmartinbmc.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', 'https://beingmartinbmc.github.io');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract user input from the request - get the actual user message
    const messages = req.body.messages;
    const userMessage = messages.find(msg => msg.role === 'user')?.content || 'No user message found';
    
    // Extract selected text option from the user message
    let selectedText = 'ALL'; // default
    if (userMessage.includes('from EACH of the following:')) {
      // This indicates "All Sacred Texts" was selected
      selectedText = 'ALL';
    } else if (userMessage.includes('Bhagavad Gita')) {
      selectedText = 'BHAGAVAD_GITA';
    } else if (userMessage.includes('Vedas')) {
      selectedText = 'VEDAS';
    } else if (userMessage.includes('Quran')) {
      selectedText = 'QURAN';
    } else if (userMessage.includes('Bible')) {
      selectedText = 'BIBLE';
    } else if (userMessage.includes('Guru Granth Sahib')) {
      selectedText = 'GURU_GRANTH_SAHIB';
    }
    
    // Use a higher temperature for more diverse responses
    // Optimized for base temperature of 0.7 with enhanced randomization
    const baseTemperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.8;
    
    // Enhanced randomization: add more variance while keeping it reasonable
    // For base temp 0.7, this will range from 0.6 to 0.9
    const temperatureVariance = 0.15; // Increased from 0.1 to 0.15
    const randomizedTemperature = Math.min(1.0, Math.max(0.6, baseTemperature + (Math.random() - 0.5) * temperatureVariance * 2));
    
    // Add diversity instruction to prevent repetitive quotes
    const diversityInstruction = "IMPORTANT: Provide diverse quotes from different chapters and verses. Avoid repeating the same quotes. Each response should include quotes from various parts of the scripture to provide comprehensive guidance.";
    
    // Modify the system message to include diversity instruction
    const modifiedMessages = messages.map(msg => {
      if (msg.role === 'system') {
        return {
          ...msg,
          content: `${msg.content}\n\n${diversityInstruction}`
        };
      }
      return msg;
    });
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL,
        messages: modifiedMessages,
        temperature: randomizedTemperature,
        max_tokens: parseInt(process.env.OPENAI_TOKEN),
        top_p: 0.85, // Slightly lower for more focused diversity
        frequency_penalty: 0.4, // Increased to reduce repetition
        presence_penalty: 0.2, // Increased to encourage new content
        stop: null // Allow full response generation
      })
    });

    const data = await response.json();
    
    // Store conversation in MongoDB if the API call was successful
    if (data.choices && data.choices.length > 0) {
      try {
        const modelOutput = data.choices[0].message;
        const metadata = {
          selectedText: selectedText,
          model: process.env.OPENAI_MODEL,
          temperature: randomizedTemperature,
          maxTokens: parseInt(process.env.OPENAI_TOKEN),
          usage: data.usage || {},
          requestId: data.id
        };
        
        await storeConversation(userMessage, modelOutput, metadata);
      } catch (mongoError) {
        console.error('Failed to store conversation in MongoDB:', mongoError);
        // Don't fail the request if MongoDB storage fails
      }
    }
    
    res.setHeader('Access-Control-Allow-Origin', 'https://beingmartinbmc.github.io');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).json(data);
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.setHeader('Access-Control-Allow-Origin', 'https://beingmartinbmc.github.io');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(500).json({ error: 'Failed to fetch from OpenAI' });
  }
} 