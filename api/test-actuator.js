import { initializeActuator, shutdownActuator } from './actuator-config.js';

// Test the actuator integration
async function testActuator() {
  try {
    console.log('🚀 Testing actuator integration...');
    
    // Initialize actuator
    const actuator = await initializeActuator();
    console.log('✅ Actuator initialized successfully');
    
    // Debug: Check what methods are available
    console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(actuator)));
    
    // Test if we can access the server directly
    console.log('✅ Actuator port:', actuator.getPort());
    console.log('✅ Actuator base path:', actuator.getBasePath());
    
    // Test custom metrics
    const conversationCounter = actuator.getCustomMetric('epic_conversations_total');
    if (conversationCounter) {
      conversationCounter.inc();
      console.log('✅ Custom metric incremented');
    }
    
    // Test thread dump
    const threadDump = await actuator.generateThreadDump();
    console.log('✅ Thread dump generated:', threadDump ? 'success' : 'failed');
    
    // Shutdown actuator
    await shutdownActuator();
    console.log('✅ Actuator test completed successfully');
    
  } catch (error) {
    console.error('❌ Actuator test failed:', error);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testActuator();
}

export { testActuator };
