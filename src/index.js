import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { initializeActuator, shutdownActuator } from './config/actuator.js';
import { corsMiddleware } from './middleware/cors.js';
import { OpenAIController } from './controllers/openai.controller.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrc: ['\'self\''],
      imgSrc: ['\'self\'', 'data:', 'https:']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware
app.use(corsMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', OpenAIController.healthCheck);

// API routes
app.post('/api/openai-proxy', OpenAIController.handleChatCompletion);
app.post('/api/generic', OpenAIController.handleGenericRequest);
app.get('/api/stats', OpenAIController.getStats);
app.get('/api/conversations', OpenAIController.getConversations);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Epic Religious Guidance Backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      openai: '/api/openai-proxy',
      stats: '/api/stats',
      conversations: '/api/conversations',
      actuator: '/actuator'
    },
    documentation: 'See README.md for API documentation'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/openai-proxy',
      'GET /api/stats',
      'GET /api/conversations'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, _next) => {
  console.error('❌ Unhandled error:', error);

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

/**
 * Start the server
 */
async function startServer() {
  try {
    // Initialize actuator
    await initializeActuator();

    // Get actuator port or use default
    const port = process.env.PORT || 3000;

    // Start server
    const server = app.listen(port, () => {
      console.log(`🚀 Epic Backend running on http://localhost:${port}`);
      console.log(`📊 Actuator available at http://localhost:${port}/actuator`);
      console.log(`🏥 Health check at http://localhost:${port}/health`);
      console.log(`📈 Metrics at http://localhost:${port}/actuator/metrics`);
      console.log(`📊 Prometheus at http://localhost:${port}/actuator/prometheus`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

      server.close(async () => {
        console.log('✅ HTTP server closed');

        try {
          await shutdownActuator();
          console.log('✅ Actuator shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
