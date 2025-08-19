import { LightweightActuator } from 'node-actuator-lite';
import { checkMongoDBHealth } from './database.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Application health check
 * @returns {Promise<Object>}
 */
const checkAppHealth = async () => {
  try {
    // Check if required environment variables are set
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'OPENAI_MODEL',
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
        version: process.env.npm_package_version || '1.0.0',
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
};

/**
 * OpenAI API health check
 * @returns {Promise<Object>}
 */
const checkOpenAIHealth = async () => {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      status: 'UP',
      details: {
        availableModels: data.data?.length || 0,
        responseTime: `${response.headers.get('x-response-time') || 'unknown'}`,
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
};

// Shared actuator instance for the entire application
export const actuator = new LightweightActuator({
  serverless: true, // Enable serverless mode
  enableHealth: true,
  enableMetrics: true,
  enablePrometheus: true,
  enableInfo: true,
  enableEnv: true,
  enableThreadDump: true,
  enableHeapDump: process.env.NODE_ENV !== 'production', // Disable in production
  envOptions: {
    // 🔒 SECURITY: Mask sensitive environment variables
    maskPatterns: [
      'PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'CREDENTIAL', 
      'AUTH', 'COMMIT', 'DEPLOYMENT_ID', 'ID', 'Deployment', 
      'id', 'deployment', 'PRIVATE', 'SIGNATURE'
    ],
    maskCustomVariables: [
      'mongodb_username', 
      'mongodb_password', 
      'OPENAI_API_KEY', 
      'OPENAI_TOKEN',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_SESSION_TOKEN',
      'JWT_SECRET',
      'SESSION_SECRET'
    ],
    maskValue: '[HIDDEN]',
    showMaskedCount: true
  },
  customHealthChecks: [
    {
      name: 'mongodb',
      check: checkMongoDBHealth
    },
    {
      name: 'openai-api',
      check: checkOpenAIHealth
    },
    {
      name: 'epic-app',
      check: checkAppHealth
    }
  ],
  customMetrics: [
    { 
      name: 'epic_conversations_total', 
      help: 'Total number of conversations processed', 
      type: 'counter' 
    },
    { 
      name: 'epic_response_time_seconds', 
      help: 'Response time for OpenAI API calls', 
      type: 'histogram',
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    },
    {
      name: 'epic_errors_total',
      help: 'Total number of errors encountered',
      type: 'counter'
    }
  ],
  healthOptions: {
    includeDiskSpace: true,
    includeProcess: true,
    diskSpaceThreshold: 100 * 1024 * 1024, // 100MB
    healthCheckTimeout: 10000 // 10 seconds
  }
});

// Initialize the actuator once
let isInitialized = false;

/**
 * Initialize the actuator
 * @returns {Promise<LightweightActuator>}
 */
export async function initializeActuator() {
  if (!isInitialized) {
    try {
      await actuator.start();
      isInitialized = true;
      console.log('✅ Actuator initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize actuator:', error.message);
      throw error;
    }
  }
  return actuator;
}

/**
 * Get custom metric by name
 * @param {string} metricName 
 * @returns {Object|null}
 */
export function getCustomMetric(metricName) {
  return actuator.getCustomMetric(metricName);
}

/**
 * Shutdown actuator gracefully
 */
export async function shutdownActuator() {
  if (isInitialized) {
    try {
      await actuator.shutdown();
      isInitialized = false;
      console.log('✅ Actuator shutdown successfully');
    } catch (error) {
      console.error('❌ Error shutting down actuator:', error.message);
    }
  }
}
