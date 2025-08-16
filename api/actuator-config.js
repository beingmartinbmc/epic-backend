import { LightweightActuator } from 'node-actuator-lite';
import { connectToMongoDB } from './mongodb.js';

// Configure the actuator for the Epic Religious Guidance Application
const actuator = new LightweightActuator({
  port: process.env.PORT || 0, // Use serverless port for Vercel
  basePath: '/actuator',
  enableHealth: true,
  enableMetrics: true,
  enablePrometheus: true,
  enableInfo: true,
  enableEnv: true,
  enableThreadDump: true,
  enableHeapDump: process.env.NODE_ENV !== 'production', // Disable heap dumps in production
  heapDumpOptions: {
    outputDir: './heapdumps',
    includeTimestamp: true,
    compress: false
  },
  customHealthChecks: [
    // MongoDB health check
    async () => {
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
    },
    
    // Application-specific health check
    async () => {
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
  ],
  customMetrics: [
    { name: 'epic_conversations_total', help: 'Total number of conversations processed', type: 'counter' },
    { name: 'epic_response_time_seconds', help: 'Response time for OpenAI API calls', type: 'histogram' }
  ],
  healthOptions: {
    includeDiskSpace: true,
    includeProcess: true,
    diskSpaceThreshold: 100 * 1024 * 1024, // 100MB
    healthCheckTimeout: 5000
  }
});

// Export the actuator instance
export { actuator };

// Initialize actuator
export async function initializeActuator() {
  try {
    await actuator.start();
    console.log(`✅ Actuator running on port ${actuator.getPort()}`);
    return actuator;
  } catch (error) {
    console.error('❌ Failed to start actuator:', error);
    throw error;
  }
}

// Graceful shutdown
export async function shutdownActuator() {
  try {
    await actuator.stop();
    console.log('✅ Actuator stopped gracefully');
  } catch (error) {
    console.error('❌ Error stopping actuator:', error);
  }
}
