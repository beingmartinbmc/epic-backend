import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB configuration
const MONGODB_CONFIG = {
  username: process.env.mongodb_username,
  password: process.env.mongodb_password,
  cluster: process.env.MONGODB_CLUSTER || 'epic.kcjssht.mongodb.net',
  database: process.env.MONGODB_DATABASE || 'religious-guide',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    w: 'majority'
  }
};

// Construct MongoDB connection string
const getMongoUri = () => {
  const { username, password, cluster, database } = MONGODB_CONFIG;
  
  if (!username || !password) {
    throw new Error('MongoDB credentials not found in environment variables');
  }
  
  return `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority`;
};

// Database connection instance
let client = null;
let db = null;

/**
 * Connect to MongoDB
 * @returns {Promise<{client: MongoClient, db: Db}>}
 */
export async function connectToMongoDB() {
  if (client && db) {
    return { client, db };
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    
    const uri = getMongoUri();
    client = new MongoClient(uri, MONGODB_CONFIG.options);
    
    await client.connect();
    db = client.db(MONGODB_CONFIG.database);
    
    // Test the connection
    await db.admin().ping();
    
    console.log('✅ Connected to MongoDB successfully');
    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  }
}

/**
 * Get database instance
 * @returns {Promise<Db>}
 */
export async function getDB() {
  if (!db) {
    await connectToMongoDB();
  }
  return db;
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDBConnection() {
  if (client) {
    try {
      await client.close();
      client = null;
      db = null;
      console.log('🔌 MongoDB connection closed');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error.message);
    }
  }
}

/**
 * Health check for MongoDB
 * @returns {Promise<Object>}
 */
export async function checkMongoDBHealth() {
  try {
    const { db } = await connectToMongoDB();
    const adminDb = db.admin();
    
    // Test database connectivity
    await adminDb.ping();
    
    // Get database stats
    const stats = await db.stats();
    
    return {
      status: 'UP',
      details: {
        database: stats.db,
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        connections: stats.connections
      }
    };
  } catch (error) {
    return {
      status: 'DOWN',
      details: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeMongoDBConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeMongoDBConnection();
  process.exit(0);
});
