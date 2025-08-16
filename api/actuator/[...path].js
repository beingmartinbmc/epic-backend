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
    // 🔒 SECURITY: Mask sensitive environment variables
    maskPatterns: ['PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'CREDENTIAL', 'AUTH'],
    maskCustomVariables: [
      'MONGODB_USERNAME', 
      'MONGODB_PASSWORD', 
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
        const env = await actuator.getEnvironment();
        return res.status(200).json(env);
        
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
