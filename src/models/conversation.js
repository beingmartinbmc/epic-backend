import { getDB } from '../config/database.js';

/**
 * Conversation model for MongoDB operations
 */
export class ConversationModel {
  /**
   * Store a new conversation
   * @param {Object} conversationData - The conversation data
   * @param {string} conversationData.userInput - User's input message
   * @param {Object} conversationData.aiResponse - AI's response
   * @param {Object} conversationData.metadata - Additional metadata
   * @returns {Promise<string>} - The inserted document ID
   */
  static async create(conversationData) {
    try {
      const db = await getDB();
      const collection = db.collection('conversations');
      
      // Extract the actual user question from the combined prompt
      let actualUserInput = conversationData.userInput;
      if (conversationData.userInput.includes("User's situation:")) {
        actualUserInput = conversationData.userInput.split("User's situation:")[1]?.trim() || conversationData.userInput;
      }
      
      const conversation = {
        userInput: actualUserInput,
        aiResponse: conversationData.aiResponse.content,
        timestamp: new Date(),
        optionChosen: conversationData.metadata.selectedText || 'ALL',
        model: conversationData.metadata.model,
        temperature: conversationData.metadata.temperature,
        maxTokens: conversationData.metadata.maxTokens,
        usage: conversationData.metadata.usage || {},
        requestId: conversationData.metadata.requestId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(conversation);
      console.log('✅ Conversation stored with ID:', result.insertedId);
      return result.insertedId;
    } catch (error) {
      console.error('❌ Error storing conversation:', error.message);
      throw new Error(`Failed to store conversation: ${error.message}`);
    }
  }

  /**
   * Get all conversations with pagination
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of documents to return
   * @param {number} options.skip - Number of documents to skip
   * @param {Object} options.sort - Sort criteria
   * @returns {Promise<Array>} - Array of conversations
   */
  static async findAll(options = {}) {
    try {
      const { limit = 100, skip = 0, sort = { timestamp: -1 } } = options;
      const db = await getDB();
      const collection = db.collection('conversations');
      
      return await collection.find({})
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('❌ Error fetching conversations:', error.message);
      throw new Error(`Failed to fetch conversations: ${error.message}`);
    }
  }

  /**
   * Get conversation by ID
   * @param {string} id - Conversation ID
   * @returns {Promise<Object|null>} - Conversation object or null
   */
  static async findById(id) {
    try {
      const db = await getDB();
      const collection = db.collection('conversations');
      
      return await collection.findOne({ _id: id });
    } catch (error) {
      console.error('❌ Error fetching conversation by ID:', error.message);
      throw new Error(`Failed to fetch conversation: ${error.message}`);
    }
  }

  /**
   * Get conversations by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of conversations
   */
  static async findByDateRange(startDate, endDate, options = {}) {
    try {
      const { limit = 100, skip = 0 } = options;
      const db = await getDB();
      const collection = db.collection('conversations');
      
      return await collection.find({
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('❌ Error fetching conversations by date range:', error.message);
      throw new Error(`Failed to fetch conversations by date range: ${error.message}`);
    }
  }

  /**
   * Get conversation statistics
   * @returns {Promise<Object>} - Statistics object
   */
  static async getStats() {
    try {
      const db = await getDB();
      const collection = db.collection('conversations');
      
      const stats = await collection.aggregate([
        {
          $group: {
            _id: null,
            totalConversations: { $sum: 1 },
            totalTokens: { $sum: '$usage.total_tokens' },
            avgTokens: { $avg: '$usage.total_tokens' },
            uniqueModels: { $addToSet: '$model' },
            uniqueOptions: { $addToSet: '$optionChosen' }
          }
        }
      ]).toArray();
      
      const result = stats[0] || {
        totalConversations: 0,
        totalTokens: 0,
        avgTokens: 0,
        uniqueModels: [],
        uniqueOptions: []
      };
      
      return {
        ...result,
        uniqueModelsCount: result.uniqueModels.length,
        uniqueOptionsCount: result.uniqueOptions.length
      };
    } catch (error) {
      console.error('❌ Error fetching conversation stats:', error.message);
      throw new Error(`Failed to fetch conversation stats: ${error.message}`);
    }
  }

  /**
   * Delete conversation by ID
   * @param {string} id - Conversation ID
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteById(id) {
    try {
      const db = await getDB();
      const collection = db.collection('conversations');
      
      const result = await collection.deleteOne({ _id: id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('❌ Error deleting conversation:', error.message);
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }
  }
}
