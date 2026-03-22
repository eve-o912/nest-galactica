/**
 * Simple WDK Test
 */

async function testWDK() {
  try {
    console.log('🧪 Testing WDK...');
    
    // Test import
    const { WDKManager } = await import('./src/services/wdk/WDKManager');
    console.log('✅ WDKManager imported successfully');
    
    // Test instantiation
    const wdkManager = new WDKManager({
      network: 'testnet',
      apiKey: 'test-key',
      rpcUrl: 'https://testnet.wdk.tether.io'
    });
    console.log('✅ WDKManager instantiated successfully');
    
    // Test health check
    const health = await wdkManager.healthCheck();
    console.log('✅ Health check successful:', health);
    
    console.log('🎉 WDK is working!');
    
  } catch (error) {
    console.error('❌ WDK test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testWDK();
