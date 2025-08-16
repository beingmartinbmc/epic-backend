import { LightweightActuator } from 'node-actuator-lite';
import { connectToMongoDB } from '../mongodb.js';

const actuator = new LightweightActuator({
  serverless: true, // Enable serverless mode
  enableHealth: true,
  enableMetrics: true,
  enablePrometheus: true,
  enableInfo: true,
  enableEnv: true,
  enableThreadDump: true,
  enableHeapDump: true,
  envOptions: {
    // Filter out sensitive environment variables
    excludePatterns: [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /credential/i,
      /auth/i,
      /mongodb_username/i,
      /mongodb_password/i,
      /openai_api_key/i,
      /openai_token/i
    ],
    // Only show safe environment variables
    includePatterns: [
      /node_env/i,
      /npm_package/i,
      /vercel/i,
      /port/i,
      /host/i
    ]
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

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Initialize actuator if not already done
    await actuator.start();
    
    // Get the path from the query parameters (Vercel dynamic routing)
    // Vercel passes the dynamic route as "...path" not "path"
    const path = req.query['...path'];
    const pathString = Array.isArray(path) ? path.join('/') : path || '';
    
    // Route to appropriate actuator endpoint using direct data access methods
    switch (pathString) {
      case 'health':
        const health = await actuator.getHealth();
        return res.status(200).json(health);
        
      case 'metrics':
        const metrics = await actuator.getMetrics();
        return res.status(200).json(metrics);
        
      case 'prometheus':
        const prometheus = await actuator.getPrometheusMetrics();
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(prometheus);
        
      case 'info':
        const info = await actuator.getInfo();
        return res.status(200).json(info);
        
      case 'env':
        // Custom environment endpoint with additional security
        const env = await actuator.getEnvironment();
        
        // Additional filtering for sensitive data
        const safeEnv = {};
        Object.keys(env).forEach(key => {
          const lowerKey = key.toLowerCase();
          // More comprehensive filtering
          if (!lowerKey.includes('password') && 
              !lowerKey.includes('secret') && 
              !lowerKey.includes('key') && 
              !lowerKey.includes('token') && 
              !lowerKey.includes('credential') && 
              !lowerKey.includes('auth') &&
              !lowerKey.includes('mongodb_username') &&
              !lowerKey.includes('mongodb_password') &&
              !lowerKey.includes('openai_api_key') &&
              !lowerKey.includes('openai_token') &&
              !lowerKey.includes('aws_access_key') &&
              !lowerKey.includes('aws_secret') &&
              !lowerKey.includes('session_token')) {
            safeEnv[key] = env[key];
          }
        });
        
        // Also filter nested objects
        if (safeEnv.processEnv) {
          const safeProcessEnv = {};
          Object.keys(safeEnv.processEnv).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (!lowerKey.includes('password') && 
                !lowerKey.includes('secret') && 
                !lowerKey.includes('key') && 
                !lowerKey.includes('token') && 
                !lowerKey.includes('credential') && 
                !lowerKey.includes('auth') &&
                !lowerKey.includes('mongodb_username') &&
                !lowerKey.includes('mongodb_password') &&
                !lowerKey.includes('openai_api_key') &&
                !lowerKey.includes('openai_token') &&
                !lowerKey.includes('aws_access_key') &&
                !lowerKey.includes('aws_secret') &&
                !lowerKey.includes('session_token')) {
              safeProcessEnv[key] = safeEnv.processEnv[key];
            }
          });
          safeEnv.processEnv = safeProcessEnv;
        }
        
        if (safeEnv.environment) {
          const safeEnvironment = {};
          Object.keys(safeEnv.environment).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (!lowerKey.includes('password') && 
                !lowerKey.includes('secret') && 
                !lowerKey.includes('key') && 
                !lowerKey.includes('token') && 
                !lowerKey.includes('credential') && 
                !lowerKey.includes('auth') &&
                !lowerKey.includes('mongodb_username') &&
                !lowerKey.includes('mongodb_password') &&
                !lowerKey.includes('openai_api_key') &&
                !lowerKey.includes('openai_token') &&
                !lowerKey.includes('aws_access_key') &&
                !lowerKey.includes('aws_secret') &&
                !lowerKey.includes('session_token')) {
              safeEnvironment[key] = safeEnv.environment[key];
            }
          });
          safeEnv.environment = safeEnvironment;
        }
        
        return res.status(200).json(safeEnv);
        
      case 'threaddump':
        const threadDump = actuator.getThreadDump();
        return res.status(200).json(threadDump);
        
      case 'heapdump':
        if (req.method === 'POST') {
          const heapDump = await actuator.getHeapDump();
          return res.status(200).json(heapDump);
        } else {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        
      case '':
        // Root endpoint with available links
        const rootData = {
          _links: {
            health: { href: '/api/actuator/health' },
            metrics: { href: '/api/actuator/metrics' },
            prometheus: { href: '/api/actuator/prometheus' },
            info: { href: '/api/actuator/info' },
            env: { href: '/api/actuator/env' },
            threaddump: { href: '/api/actuator/threaddump' },
            heapdump: { href: '/api/actuator/heapdump' }
          }
        };
        return res.status(200).json(rootData);
        
      default:
        return res.status(404).json({ 
          error: 'Endpoint not found',
          path: pathString,
          availableEndpoints: [
            '/api/actuator/health',
            '/api/actuator/metrics',
            '/api/actuator/prometheus',
            '/api/actuator/info',
            '/api/actuator/env',
            '/api/actuator/threaddump',
            '/api/actuator/heapdump'
          ]
        });
    }
  } catch (error) {
    console.error('Actuator endpoint error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
