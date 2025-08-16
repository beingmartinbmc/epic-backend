import { initializeActuator } from '../actuator-instance.js';

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
    const actuator = await initializeActuator();
    
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
