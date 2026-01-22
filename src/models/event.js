import { ObjectId } from 'mongodb';
import { getDB } from '../config/database.js';

/**
 * Event model for MongoDB operations
 * Used for date counter app to store events
 */
export class EventModel {
  static COLLECTION_NAME = 'events';

  /**
   * Create a new event
   * @param {Object} eventData - The event data
   * @param {string} eventData.title - Event title
   * @param {string} eventData.description - Event description
   * @param {Date} eventData.eventDate - The date of the event
   * @param {string} eventData.category - Event category (optional)
   * @param {Object} eventData.metadata - Additional metadata (optional)
   * @returns {Promise<Object>} - The inserted document
   */
  static async create(eventData) {
    try {
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      const event = {
        title: eventData.title,
        description: eventData.description || '',
        eventDate: new Date(eventData.eventDate),
        category: eventData.category || 'general',
        metadata: eventData.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await collection.insertOne(event);
      console.log('✅ Event created with ID:', result.insertedId);
      
      return { _id: result.insertedId, ...event };
    } catch (error) {
      console.error('❌ Error creating event:', error.message);
      throw new Error(`Failed to create event: ${error.message}`);
    }
  }

  /**
   * Get all events with pagination
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of documents to return
   * @param {number} options.skip - Number of documents to skip
   * @param {Object} options.sort - Sort criteria
   * @param {string} options.category - Filter by category
   * @returns {Promise<Array>} - Array of events
   */
  static async findAll(options = {}) {
    try {
      const { limit = 100, skip = 0, sort = { eventDate: -1 }, category } = options;
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      const query = {};
      if (category) {
        query.category = category;
      }

      return await collection.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('❌ Error fetching events:', error.message);
      throw new Error(`Failed to fetch events: ${error.message}`);
    }
  }

  /**
   * Get event by ID
   * @param {string} id - Event ID
   * @returns {Promise<Object|null>} - Event object or null
   */
  static async findById(id) {
    try {
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      return await collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error('❌ Error fetching event by ID:', error.message);
      throw new Error(`Failed to fetch event: ${error.message}`);
    }
  }

  /**
   * Update event by ID
   * @param {string} id - Event ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} - Updated event or null
   */
  static async updateById(id, updateData) {
    try {
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      const update = {
        ...updateData,
        updatedAt: new Date()
      };

      // Convert eventDate to Date object if provided
      if (update.eventDate) {
        update.eventDate = new Date(update.eventDate);
      }

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: update },
        { returnDocument: 'after' }
      );

      return result;
    } catch (error) {
      console.error('❌ Error updating event:', error.message);
      throw new Error(`Failed to update event: ${error.message}`);
    }
  }

  /**
   * Delete event by ID
   * @param {string} id - Event ID
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteById(id) {
    try {
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('❌ Error deleting event:', error.message);
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }

  /**
   * Get events by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of events
   */
  static async findByDateRange(startDate, endDate, options = {}) {
    try {
      const { limit = 100, skip = 0 } = options;
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      return await collection.find({
        eventDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      })
        .sort({ eventDate: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('❌ Error fetching events by date range:', error.message);
      throw new Error(`Failed to fetch events by date range: ${error.message}`);
    }
  }

  /**
   * Get total count of events
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
   * Get upcoming events (events with date >= today)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of upcoming events
   */
  static async findUpcoming(options = {}) {
    try {
      const { limit = 10 } = options;
      const db = await getDB();
      const collection = db.collection(this.COLLECTION_NAME);

      return await collection.find({
        eventDate: { $gte: new Date() }
      })
        .sort({ eventDate: 1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('❌ Error fetching upcoming events:', error.message);
      throw new Error(`Failed to fetch upcoming events: ${error.message}`);
    }
  }
}
