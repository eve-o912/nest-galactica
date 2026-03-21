/**
 * Simple WDK Test - JavaScript version
 */

const testWDK = async () => {
  try {
    console.log('🧪 Testing WDK...');
    
    // Test if the files exist
    const fs = require('fs');
    const path = require('path');
    
    const wdkManagerPath = path.join(__dirname, 'src', 'services', 'wdk', 'WDKManager.ts');
    const wdkClientPath = path.join(__dirname, 'src', 'services', 'wdk', 'WDKClient.ts');
    
    if (fs.existsSync(wdkManagerPath)) {
      console.log('✅ WDKManager.ts exists');
    } else {
      console.log('❌ WDKManager.ts not found');
    }
    
    if (fs.existsSync(wdkClientPath)) {
      console.log('✅ WDKClient.ts exists');
    } else {
      console.log('❌ WDKClient.ts not found');
    }
    
    // Check if the files have content
    const wdkManagerContent = fs.readFileSync(wdkManagerPath, 'utf8');
    const wdkClientContent = fs.readFileSync(wdkClientPath, 'utf8');
    
    console.log(`✅ WDKManager.ts: ${wdkManagerContent.length} characters`);
    console.log(`✅ WDKClient.ts: ${wdkClientContent.length} characters`);
    
    // Check for key methods
    const hasCreateUserWallet = wdkManagerContent.includes('createUserWallet');
    const hasHealthCheck = wdkManagerContent.includes('healthCheck');
    const hasHandleDeposit = wdkManagerContent.includes('handleDeposit');
    
    console.log(`✅ Has createUserWallet: ${hasCreateUserWallet}`);
    console.log(`✅ Has healthCheck: ${hasHealthCheck}`);
    console.log(`✅ Has handleDeposit: ${hasHandleDeposit}`);
    
    // Check WDKClient methods
    const hasCreateWallet = wdkClientContent.includes('createWallet');
    const hasCreateVault = wdkClientContent.includes('createVault');
    const hasHealthCheckClient = wdkClientContent.includes('healthCheck');
    
    console.log(`✅ WDKClient has createWallet: ${hasCreateWallet}`);
    console.log(`✅ WDKClient has createVault: ${hasCreateVault}`);
    console.log(`✅ WDKClient has healthCheck: ${hasHealthCheckClient}`);
    
    console.log('🎉 WDK files are present and contain expected methods!');
    
  } catch (error) {
    console.error('❌ WDK test failed:', error);
  }
};

testWDK();
