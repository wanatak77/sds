const chapaService = require('./chapaService');

async function testChapaIntegration() {
  console.log('=== CHAPA INTEGRATION TEST ===\n');
  
  try {
    // Test 1: Check environment setup
    console.log('1. Testing environment setup...');
    console.log('CHAPA_SECRET_KEY exists:', !!process.env.CHAPA_SECRET_KEY);
    console.log('CHAPA_SECRET_KEY length:', process.env.CHAPA_SECRET_KEY?.length || 0);
    
    // Test 2: Generate transaction reference
    console.log('\n2. Testing transaction reference generation...');
    const txRef = chapaService.generateTxRef();
    console.log('Generated tx_ref:', txRef);
    console.log('tx_ref format valid:', /^sds-\d+-[a-z0-9]{6}$/.test(txRef));
    
    // Test 3: Test payment verification with invalid tx_ref (should fail gracefully)
    console.log('\n3. Testing payment verification with invalid tx_ref...');
    try {
      await chapaService.verifyPayment('invalid-tx-ref');
    } catch (error) {
      console.log('Expected error for invalid tx_ref:', error.message);
    }
    
    // Test 4: Test payment verification with empty tx_ref (should fail gracefully)
    console.log('\n4. Testing payment verification with empty tx_ref...');
    try {
      await chapaService.verifyPayment('');
    } catch (error) {
      console.log('Expected error for empty tx_ref:', error.message);
    }
    
    // Test 5: Test payment initialization with mock data
    console.log('\n5. Testing payment initialization with mock data...');
    const mockPaymentData = {
      amount: 100,
      currency: 'ETB',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      tx_ref: txRef,
      callbackUrl: 'http://localhost:3000/api/payment/callback',
      returnUrl: 'http://localhost:3000/dashboard?payment=success',
      title: 'Test Payment',
      description: 'Test payment description'
    };
    
    try {
      const result = await chapaService.initializePayment(mockPaymentData);
      console.log('Payment initialization successful:', result);
    } catch (error) {
      console.log('Payment initialization error:', error.message);
      
      // If it's a 404 error, it might be due to incorrect URL structure
      if (error.message.includes('404') || error.message.includes('not found')) {
        console.log('\n=== POSSIBLE URL STRUCTURE ISSUES ===');
        console.log('Current base URL:', chapaService.baseUrl);
        console.log('Expected initialization URL:', `${chapaService.baseUrl}/transaction/initialize`);
        console.log('Expected verification URL:', `${chapaService.baseUrl}/transaction/verify/{tx_ref}`);
        console.log('\nPlease check:');
        console.log('1. Base URL is correct: https://api.chapa.co/v1');
        console.log('2. Chapa secret key is valid');
        console.log('3. Network connection is working');
        console.log('4. Chapa API is accessible');
      }
    }
    
    console.log('\n=== TEST COMPLETED ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testChapaIntegration();
}

module.exports = testChapaIntegration;
