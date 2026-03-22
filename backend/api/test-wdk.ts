/**
 * WDK Wallet Test Script
 * Tests the WDK wallet creation and basic functionality
 */

import { WDKManager } from './src/services/wdk/WDKManager';
import { logger } from './src/lib/logger';

async function testWDKWallet() {
  try {
    console.log('🧪 Testing WDK Wallet Creation...\n');

    // Initialize WDK Manager with test configuration
    const wdkManager = new WDKManager({
      network: 'testnet',
      apiKey: process.env.WDK_API_KEY || 'test-key',
      rpcUrl: process.env.WDK_RPC_URL || 'https://testnet.wdk.tether.io'
    });

    // Test 1: Create a new wallet
    console.log('📝 Test 1: Creating new wallet...');
    const testUserId = 'test-user-' + Date.now();
    const wallet = await wdkManager.createUserWallet(testUserId);
    
    console.log('✅ Wallet created successfully!');
    console.log(`   Address: ${wallet.address}`);
    console.log(`   Network: ${wallet.network}`);
    console.log(`   Has backup: ${!!wallet.encryptedBackup}\n`);

    // Test 2: Get vault balances
    console.log('💼 Test 2: Getting vault balances...');
    const vaultBalances = await wdkManager.getVaultBalances(testUserId);
    
    console.log('✅ Vault balances retrieved successfully!');
    console.log(`   Number of vaults: ${vaultBalances.length}`);
    vaultBalances.forEach((vault, index) => {
      console.log(`   Vault ${index + 1}: ${vault.name} (${vault.type})`);
      console.log(`     Balance: ${vault.balance}`);
      console.log(`     USDT: ${vault.tokens.USDT}`);
      console.log(`     XAUT: ${vault.tokens.XAUT}`);
    });
    console.log();

    // Test 3: Handle a deposit
    console.log('💰 Test 3: Processing deposit...');
    const depositResult = await wdkManager.handleDeposit(testUserId, '500.00', 'USDT');
    
    console.log('✅ Deposit processed successfully!');
    console.log(`   Transaction: ${depositResult.transaction.hash}`);
    console.log(`   Status: ${depositResult.transaction.status}`);
    console.log(`   Confirmations: ${depositResult.transaction.confirmations}\n`);

    // Test 4: Health check
    console.log('🏥 Test 4: WDK health check...');
    const health = await wdkManager.healthCheck();
    
    console.log('✅ Health check completed!');
    console.log(`   WDK Status: ${health.wdk?.status}`);
    console.log(`   Network: ${health.wdk?.network}`);
    console.log(`   Connected: ${health.wdk?.connected}\n`);

    console.log('🎉 All WDK tests passed successfully!');
    
    return {
      success: true,
      wallet: wallet.address,
      vaults: vaultBalances.length,
      deposit: depositResult.transaction.hash,
      health: health.wdk?.status
    };

  } catch (error) {
    console.error('❌ WDK Test failed:', error);
    logger.error('WDK test failed', { error });
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (require.main === module) {
  testWDKWallet()
    .then((result) => {
      console.log('\n📋 Test Results:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test script failed:', error);
      process.exit(1);
    });
}

export { testWDKWallet };
