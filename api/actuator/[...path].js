import { initializeActuator } from '../../src/config/actuator.js';

// Vercel serverless function handler for actuator endpoints
export default async function handler(req, res) {
  try {
    // Initialize actuator
    const actuator = await initializeActuator();
    
    // Get the actuator's Express app
    const app = actuator.getApp();
    
    // Forward the request to the actuator app
    return new Promise((resolve, reject) => {
      // Create a mock request object that the actuator can handle
      const actuatorReq = {
        ...req,
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body,
        query: req.query
      };
      
      const actuatorRes = {
        ...res,
        setHeader: (name, value) => {
          res.setHeader(name, value);
          return actuatorRes;
        },
        status: (code) => {
          res.status(code);
          return actuatorRes;
        },
        json: (data) => {
          res.json(data);
          resolve();
        },
        end: (data) => {
          res.end(data);
          resolve();
        }
      };
      
      // Handle the request through the actuator
      app(actuatorReq, actuatorRes, (error) => {
        if (error) {
          console.error('Actuator error:', error);
          res.status(500).json({ error: 'Actuator error' });
          resolve();
        }
      });
    });
    
  } catch (error) {
    console.error('Failed to handle actuator request:', error);
    res.status(500).json({ 
      error: 'Actuator initialization failed',
      message: error.message 
    });
  }
}
