import { connectToMongoDB } from '../mongodb.js';

// Simple health check function
async function checkMongoDBHealth() {
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
        indexes: stats.indexes
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

// Application health check
async function checkApplicationHealth() {
  try {
    // Check if required environment variables are set
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'OPENAI_MODEL',
      'OPENAI_TOKEN',
      'mongodb_username',
      'mongodb_password'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return {
        status: 'DOWN',
        details: {
          missingEnvironmentVariables: missingVars,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    return {
      status: 'UP',
      details: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
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

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const mongodbHealth = await checkMongoDBHealth();
    const appHealth = await checkApplicationHealth();
    
    const healthData = {
      status: mongodbHealth.status === 'UP' && appHealth.status === 'UP' ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      details: {
        mongodb: mongodbHealth,
        'epic-app': appHealth
      }
    };
    
    return res.status(200).json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
