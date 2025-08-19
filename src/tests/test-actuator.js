import { initializeActuator, getCustomMetric } from '../config/actuator.js';

/**
 * Test actuator functionality
 */
async function testActuator() {
  try {
    console.log('🧪 Testing Actuator Integration...\n');

    // Initialize actuator
    console.log('1. Initializing actuator...');
    const actuator = await initializeActuator();
    console.log('✅ Actuator initialized successfully\n');

    // Test health endpoint
    console.log('2. Testing health endpoint...');
    const health = await actuator.getHealth();
    console.log('Health Status:', health.status);
    console.log('Health Details:', JSON.stringify(health.details, null, 2));
    console.log('✅ Health check completed\n');

    // Test metrics endpoint
    console.log('3. Testing metrics endpoint...');
    const metrics = await actuator.getMetrics();
    console.log('Metrics:', JSON.stringify(metrics, null, 2));
    console.log('✅ Metrics retrieved successfully\n');

    // Test custom metrics
    console.log('4. Testing custom metrics...');
    const conversationsCounter = getCustomMetric('epic_conversations_total');
    const responseTimeHistogram = getCustomMetric('epic_response_time_seconds');
    const errorsCounter = getCustomMetric('epic_errors_total');

    if (conversationsCounter) {
      conversationsCounter.inc();
      console.log('✅ Incremented conversations counter');
    }

    if (responseTimeHistogram) {
      responseTimeHistogram.observe(0.5);
      console.log('✅ Recorded response time metric');
    }

    if (errorsCounter) {
      errorsCounter.inc();
      console.log('✅ Incremented errors counter');
    }

    console.log('✅ Custom metrics test completed\n');

    // Test Prometheus metrics
    console.log('5. Testing Prometheus metrics...');
    const prometheus = await actuator.getPrometheusMetrics();
    console.log('Prometheus metrics length:', prometheus.length);
    console.log('✅ Prometheus metrics retrieved\n');

    // Test info endpoint
    console.log('6. Testing info endpoint...');
    const info = await actuator.getInfo();
    console.log('Info:', JSON.stringify(info, null, 2));
    console.log('✅ Info endpoint test completed\n');

    // Test environment endpoint
    console.log('7. Testing environment endpoint...');
    const env = await actuator.getEnvironment();
    console.log('Environment variables count:', env.activeProfiles?.length || 0);
    console.log('✅ Environment endpoint test completed\n');

    console.log('🎉 All actuator tests passed successfully!');

    return true;
  } catch (error) {
    console.error('❌ Actuator test failed:', error.message);
    return false;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testActuator()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export { testActuator };
