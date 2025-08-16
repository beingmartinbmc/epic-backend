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

// System metrics
function getSystemMetrics() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    system: {
      uptime: process.uptime(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform
    },
    process: {
      title: process.title,
      argv: process.argv,
      execPath: process.execPath,
      cwd: process.cwd()
    }
  };
}

// Environment info (filtered for security)
function getEnvironmentInfo() {
  const env = { ...process.env };
  
  // Filter out sensitive information
  const sensitiveKeys = [
    'OPENAI_API_KEY',
    'mongodb_username',
    'mongodb_password',
    'MONGODB_URI',
    'JWT_SECRET',
    'API_KEY',
    'SECRET',
    'PASSWORD',
    'TOKEN'
  ];
  
  sensitiveKeys.forEach(key => {
    if (env[key]) {
      env[key] = '[HIDDEN]';
    }
  });
  
  return env;
}

// Application info
function getApplicationInfo() {
  return {
    app: {
      name: 'Epic Religious Guidance Backend',
      version: '1.0.0',
      description: 'Backend API for Epic Religious Guidance Application'
    },
    build: {
      time: new Date().toISOString(),
      version: '1.0.0'
    },
    git: {
      commit: {
        time: new Date().toISOString()
      }
    }
  };
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
    // Get the path from the query parameters (Vercel dynamic routing)
    const { path } = req.query;
    const pathString = Array.isArray(path) ? path.join('/') : path || '';
    
    // Route to appropriate actuator endpoint
    switch (pathString) {
      case 'health':
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
        
      case 'metrics':
        const metricsData = getSystemMetrics();
        return res.status(200).json(metricsData);
        
      case 'prometheus':
        const memUsage = process.memoryUsage();
        const prometheusData = `# HELP nodejs_memory_rss_bytes Resident set size in bytes.
# TYPE nodejs_memory_rss_bytes gauge
nodejs_memory_rss_bytes ${memUsage.rss}

# HELP nodejs_memory_heap_total_bytes Process heap size from node.js in bytes.
# TYPE nodejs_memory_heap_total_bytes gauge
nodejs_memory_heap_total_bytes ${memUsage.heapTotal}

# HELP nodejs_memory_heap_used_bytes Process heap size used from node.js in bytes.
# TYPE nodejs_memory_heap_used_bytes gauge
nodejs_memory_heap_used_bytes ${memUsage.heapUsed}

# HELP nodejs_memory_external_bytes Node.js external memory size in bytes.
# TYPE nodejs_memory_external_bytes gauge
nodejs_memory_external_bytes ${memUsage.external}

# HELP nodejs_process_cpu_seconds_total Total user and system CPU time spent in seconds.
# TYPE nodejs_process_cpu_seconds_total counter
nodejs_process_cpu_seconds_total ${(process.cpuUsage().user + process.cpuUsage().system) / 1000000}

# HELP nodejs_process_start_time_seconds Start time of the process since unix epoch in seconds.
# TYPE nodejs_process_start_time_seconds gauge
nodejs_process_start_time_seconds ${process.uptime()}`;
        
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(prometheusData);
        
      case 'info':
        const infoData = getApplicationInfo();
        return res.status(200).json(infoData);
        
      case 'env':
        const envData = getEnvironmentInfo();
        return res.status(200).json(envData);
        
      case 'threaddump':
        const threadDumpData = {
          timestamp: new Date().toISOString(),
          threads: [
            {
              threadId: 1,
              threadName: 'main',
              threadState: 'RUNNABLE',
              stackTrace: process.version
            }
          ]
        };
        return res.status(200).json(threadDumpData);
        
      case '':
        // Root endpoint with available links
        const rootData = {
          _links: {
            health: { href: '/api/actuator/health' },
            metrics: { href: '/api/actuator/metrics' },
            prometheus: { href: '/api/actuator/prometheus' },
            info: { href: '/api/actuator/info' },
            env: { href: '/api/actuator/env' },
            threaddump: { href: '/api/actuator/threaddump' }
          }
        };
        return res.status(200).json(rootData);
        
      default:
        return res.status(404).json({ 
          error: 'Endpoint not found',
          availableEndpoints: [
            '/api/actuator/health',
            '/api/actuator/metrics',
            '/api/actuator/prometheus',
            '/api/actuator/info',
            '/api/actuator/env',
            '/api/actuator/threaddump'
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
