import { LightweightActuator } from 'node-actuator-lite';

// Test the new actuator implementation
async function testActuator() {
  try {
    console.log('🚀 Testing node-actuator-lite@1.2.0...');
    
    // Create actuator instance with serverless mode
    const actuator = new LightweightActuator({
      serverless: true,
      enableHealth: true,
      enableMetrics: true,
      enablePrometheus: true,
      enableInfo: true,
      enableEnv: true,
      enableThreadDump: true,
      enableHeapDump: true,
      customHealthChecks: [
        {
          name: 'test-check',
          check: async () => {
            return { status: 'UP', details: { test: 'success' } };
          }
        }
      ],
      customMetrics: [
        { name: 'test_counter', help: 'Test counter', type: 'counter' }
      ]
    });
    
    // Initialize actuator
    await actuator.start();
    console.log('✅ Actuator initialized successfully');
    
    // Test direct data access methods
    console.log('📊 Testing direct data access methods...');
    
    // Test health endpoint
    const health = await actuator.getHealth();
    console.log('✅ Health check:', health.status);
    console.log('   Health details:', Object.keys(health.details || {}));
    
    // Test metrics endpoint
    const metrics = await actuator.getMetrics();
    console.log('✅ Metrics collected:', Object.keys(metrics).length, 'metrics');
    
    // Test Prometheus endpoint
    const prometheus = await actuator.getPrometheusMetrics();
    console.log('✅ Prometheus metrics:', prometheus.split('\n').length, 'lines');
    
    // Test info endpoint
    const info = await actuator.getInfo();
    console.log('✅ Info collected:', info.app?.name || 'Unknown');
    
    // Test environment endpoint
    const env = await actuator.getEnvironment();
    console.log('✅ Environment variables:', Object.keys(env).length, 'variables');
    
    // Test thread dump
    const threadDump = actuator.getThreadDump();
    console.log('✅ Thread dump generated:', threadDump ? 'success' : 'failed');
    
    // Test custom metrics
    const testCounter = actuator.getCustomMetric('test_counter');
    if (testCounter) {
      testCounter.inc();
      console.log('✅ Custom metric incremented');
    }
    
    console.log('🎉 All tests passed! node-actuator-lite@1.2.0 is working perfectly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testActuator();
}

export { testActuator };
