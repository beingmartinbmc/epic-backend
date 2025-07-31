import { MongoClient } from 'mongodb';

// MongoDB connection configuration
const MONGODB_USERNAME = process.env.mongodb_username;
const MONGODB_PASSWORD = process.env.mongodb_password;
const MONGODB_CLUSTER = 'epic.kcjssht.mongodb.net';
const MONGODB_DATABASE = 'religious-guide';

// Debug logging
console.log('MongoDB Config:', {
  username: MONGODB_USERNAME ? '***' : 'undefined',
  password: MONGODB_PASSWORD ? '***' : 'undefined',
  cluster: MONGODB_CLUSTER,
  database: MONGODB_DATABASE
});

// Construct MongoDB connection string with credentials from environment variables
const MONGODB_URI = `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/${MONGODB_DATABASE}?retryWrites=true&w=majority`;

let client = null;
let db = null;

// Initialize MongoDB connection
export async function connectToMongoDB() {
  if (client) {
    return { client, db };
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    
    // Simplified MongoDB connection options
    const options = {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
    };
    
    client = new MongoClient(MONGODB_URI, options);
    await client.connect();
    db = client.db(MONGODB_DATABASE);
    console.log('Connected to MongoDB successfully');
    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.error('Connection string (without credentials):', `mongodb+srv://***:***@${MONGODB_CLUSTER}/${MONGODB_DATABASE}?retryWrites=true&w=majority`);
    throw error;
  }
}

// Get database instance
export async function getDB() {
  if (!db) {
    await connectToMongoDB();
  }
  return db;
}

// Close MongoDB connection
export async function closeMongoDBConnection() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

// Store conversation in MongoDB
export async function storeConversation(userInput, modelOutput, metadata = {}) {
  try {
    const db = await getDB();
    const collection = db.collection('conversations');
    
    // Extract the actual user question from the combined prompt
    let actualUserInput = userInput;
    if (userInput.includes("User's situation:")) {
      actualUserInput = userInput.split("User's situation:")[1]?.trim() || userInput;
    }
    
    const conversation = {
      userInput: actualUserInput,
      aiResponse: modelOutput.content,
      timestamp: new Date(),
      optionChosen: metadata.selectedText || 'ALL',
      model: metadata.model,
      temperature: metadata.temperature,
      maxTokens: metadata.maxTokens,
      usage: metadata.usage || {},
      requestId: metadata.requestId
    };
    
    const result = await collection.insertOne(conversation);
    console.log('Conversation stored with ID:', result.insertedId);
    return result.insertedId;
  } catch (error) {
    console.error('Error storing conversation:', error);
    throw error;
  }
}

// Get all conversations (for monitoring/debugging)
export async function getAllConversations(limit = 100) {
  try {
    const db = await getDB();
    const collection = db.collection('conversations');
    
    return await collection.find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
} 