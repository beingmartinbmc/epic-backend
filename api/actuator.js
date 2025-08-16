import { actuator } from './actuator-config.js';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Initialize actuator if needed
    if (!actuator.getPort()) {
      await actuator.start();
    }
    
    // Extract the path from the request
    const path = req.url.replace('/api/actuator', '');
    const actuatorPort = actuator.getPort();
    const basePath = actuator.getBasePath();
    
    // Route to appropriate actuator endpoint by making HTTP requests
    switch (path) {
      case '/health':
        const healthResponse = await fetch(`http://localhost:${actuatorPort}${basePath}/health`);
        const healthData = await healthResponse.json();
        return res.status(200).json(healthData);
        
      case '/metrics':
        const metricsResponse = await fetch(`http://localhost:${actuatorPort}${basePath}/metrics`);
        const metricsData = await metricsResponse.json();
        return res.status(200).json(metricsData);
        
      case '/prometheus':
        const prometheusResponse = await fetch(`http://localhost:${actuatorPort}${basePath}/prometheus`);
        const prometheusData = await prometheusResponse.text();
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(prometheusData);
        
      case '/info':
        const infoResponse = await fetch(`http://localhost:${actuatorPort}${basePath}/info`);
        const infoData = await infoResponse.json();
        return res.status(200).json(infoData);
        
      case '/env':
        const envResponse = await fetch(`http://localhost:${actuatorPort}${basePath}/env`);
        const envData = await envResponse.json();
        return res.status(200).json(envData);
        
      case '/threaddump':
        const threadDumpResponse = await fetch(`http://localhost:${actuatorPort}${basePath}/threaddump`);
        const threadDumpData = await threadDumpResponse.json();
        return res.status(200).json(threadDumpData);
        
      case '/heapdump':
        if (req.method === 'POST') {
          const heapDumpResponse = await fetch(`http://localhost:${actuatorPort}${basePath}/heapdump`, {
            method: 'POST'
          });
          const heapDumpData = await heapDumpResponse.json();
          return res.status(200).json(heapDumpData);
        } else {
          return res.status(405).json({ error: 'Method not allowed' });
        }
        
      case '/':
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