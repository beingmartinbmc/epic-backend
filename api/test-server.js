import express from 'express';
import { actuator, conversationCounter, responseTimeHistogram } from './actuator.js';
import openaiProxy from './openai-proxy.js';

// Start server
async function startServer() {
  try {
    // Start the actuator first
    await actuator.start();
    const actuatorPort = actuator.getPort();
    
    // Get the actuator's Express app
    const app = actuator.getApp();
    
    // Add middleware to the actuator's app
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Add your application routes to the actuator's app
    app.use('/api/openai-proxy', async (req, res) => {
      return await openaiProxy(req, res);
    });

    // Test endpoint
    app.get('/api/test', (req, res) => {
      res.json({ 
        message: 'Epic Backend is running!',
        timestamp: new Date().toISOString(),
        actuator: 'Available at /actuator'
      });
    });

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        message: 'Epic Religious Guidance Backend',
        version: '1.0.0',
        endpoints: {
          test: '/api/test',
          openai: '/api/openai-proxy',
          actuator: '/actuator',
          health: '/actuator/health',
          metrics: '/actuator/metrics',
          prometheus: '/actuator/prometheus',
          mappings: '/actuator/mappings'
        }
      });
    });

    // Error handling
    app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    console.log(`🚀 Epic Backend running on http://localhost:${actuatorPort}`);
    console.log(`📊 Actuator available at http://localhost:${actuatorPort}/actuator`);
    console.log(`🏥 Health check at http://localhost:${actuatorPort}/actuator/health`);
    console.log(`📈 Metrics at http://localhost:${actuatorPort}/actuator/metrics`);
    console.log(`📊 Prometheus at http://localhost:${actuatorPort}/actuator/prometheus`);
    console.log(`🗺️  Mappings at http://localhost:${actuatorPort}/actuator/mappings`);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await actuator.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await actuator.shutdown();
  process.exit(0);
});

startServer(); 