import { ObjectId } from 'mongodb';
import { getDB } from '../config/database.js';

/**
 * Comment model for MongoDB operations
 * Used for date counter app to store comments on events
 */
export class CommentModel {
  static COLLECTION_NAME = 'comments';

  /**
   * Create a new comment
   * @param {Object} commentData - The comment data
   * @param {string} commentData.eventId - Associated event ID
   * @param {string} commentData.content - Comment content
   * @param {string} commentData.author - Comment author (optional)
   * @param {Object} commentData.metadata - Additional metadata (optional)
   * @returns {Promise<Object>} - The inserted document
   */
  static async create(commentData) {
    try {
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      const comment = {
        eventId: new ObjectId(commentData.eventId),
        content: commentData.content,
        author: commentData.author || 'Anonymous',
        metadata: commentData.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await collection.insertOne(comment);
      console.log('✅ Comment created with ID:', result.insertedId);
      
      return { _id: result.insertedId, ...comment };
    } catch (error) {
      console.error('❌ Error creating comment:', error.message);
      throw new Error(`Failed to create comment: ${error.message}`);
    }
  }

  /**
   * Get all comments with pagination
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of documents to return
   * @param {number} options.skip - Number of documents to skip
   * @param {Object} options.sort - Sort criteria
   * @returns {Promise<Array>} - Array of comments
   */
  static async findAll(options = {}) {
    try {
      const { limit = 100, skip = 0, sort = { createdAt: -1 } } = options;
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      return await collection.find({})
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('❌ Error fetching comments:', error.message);
      throw new Error(`Failed to fetch comments: ${error.message}`);
    }
  }

  /**
   * Get comment by ID
   * @param {string} id - Comment ID
   * @returns {Promise<Object|null>} - Comment object or null
   */
  static async findById(id) {
    try {
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      return await collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error('❌ Error fetching comment by ID:', error.message);
      throw new Error(`Failed to fetch comment: ${error.message}`);
    }
  }

  /**
   * Get comments by event ID
   * @param {string} eventId - Event ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of comments for the event
   */
  static async findByEventId(eventId, options = {}) {
    try {
      const { limit = 100, skip = 0, sort = { createdAt: -1 } } = options;
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      return await collection.find({ eventId: new ObjectId(eventId) })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('❌ Error fetching comments by event ID:', error.message);
      throw new Error(`Failed to fetch comments by event ID: ${error.message}`);
    }
  }

  /**
   * Update comment by ID
   * @param {string} id - Comment ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - Updated comment or null
   */
  static async updateById(id, updateData) {
    try {
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      // Don't allow updating eventId
      const { eventId, ...safeUpdateData } = updateData;

      const update = {
        ...safeUpdateData,
        updatedAt: new Date()
      };

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: update },
        { returnDocument: 'after' }
      );

      return result;
    } catch (error) {
      console.error('❌ Error updating comment:', error.message);
      throw new Error(`Failed to update comment: ${error.message}`);
    }
  }

  /**
   * Delete comment by ID
   * @param {string} id - Comment ID
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteById(id) {
    try {
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('❌ Error deleting comment:', error.message);
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  }

  /**
   * Delete all comments for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<number>} - Number of deleted comments
   */
  static async deleteByEventId(eventId) {
    try {
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      const result = await collection.deleteMany({ eventId: new ObjectId(eventId) });
      console.log(`✅ Deleted ${result.deletedCount} comments for event ${eventId}`);
      return result.deletedCount;
    } catch (error) {
      console.error('❌ Error deleting comments by event ID:', error.message);
      throw new Error(`Failed to delete comments: ${error.message}`);
    }
  }

  /**
   * Get total count of comments
   * @param {Object} filter - Optional filter criteria
   * @returns {Promise<number>} - Total count
   */
  static async getTotalCount(filter = {}) {
    try {
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      return await collection.countDocuments(filter);
    } catch (error) {
      console.error('❌ Error getting total count:', error.message);
      throw new Error(`Failed to get total count: ${error.message}`);
    }
  }

  /**
   * Get comment count for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<number>} - Comment count
   */
  static async getCountByEventId(eventId) {
    try {
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      return await collection.countDocuments({ eventId: new ObjectId(eventId) });
    } catch (error) {
      console.error('❌ Error getting comment count:', error.message);
      throw new Error(`Failed to get comment count: ${error.message}`);
    }
  }
}
