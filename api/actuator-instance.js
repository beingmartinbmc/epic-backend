import { LightweightActuator } from 'node-actuator-lite';
import { connectToMongoDB } from './mongodb.js';

// Shared actuator instance for the entire application
export const actuator = new LightweightActuator({
  serverless: true, // Enable serverless mode
  enableHealth: true,
  enableMetrics: true,
  enablePrometheus: true,
  enableInfo: true,
  enableEnv: true,
  enableThreadDump: true,
  enableHeapDump: true,
  envOptions: {
    // 🔒 SECURITY: Mask sensitive environment variables
    maskPatterns: ['PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'CREDENTIAL', 'AUTH', 'COMMIT', 'DEPLOYMENT_ID', 'ID', 'Deployment', 'id', 'deployment'],
    maskCustomVariables: [
      'mongodb_username', 
      'mongodb_password', 
      'OPENAI_API_KEY', 
      'OPENAI_TOKEN',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_SESSION_TOKEN'
    ],
    maskValue: '[HIDDEN]',
    showMaskedCount: true
  },
  customHealthChecks: [
    {
      name: 'mongodb',
      check: async () => {
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
    },
    {
      name: 'epic-app',
      check: async () => {
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

// Initialize the actuator once
let isInitialized = false;
export async function initializeActuator() {
  if (!isInitialized) {
    await actuator.start();
    isInitialized = true;
  }
  return actuator;
}
