// Test file to demonstrate fresh token behavior for password reset
// This test shows how each new request generates fresh tokens and prevents conflicts
// Run with: node test-fresh-token-behavior.js

const BASE_URL = 'http://localhost:5000/user/auth';

// Test data
const wrongEmail = 'wrong@example.com';
const correctEmail = 'testuser@example.com';
let firstToken = '';
let secondToken = '';

// Helper function to make HTTP requests
async function makeRequest(endpoint, data) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    return { status: response.status, data: result };
  } catch (error) {
    console.error('Request failed:', error.message);
    return { status: 0, error: error.message };
  }
}

// Test 1: Request password reset with wrong email (should fail)
async function testWrongEmailRequest() {
  console.log('\n=== Test 1: Request Password Reset with Wrong Email ===');
  
  const data = { email: wrongEmail };
  const result = await makeRequest('/forgot-password', data);
  
  if (result.status === 404 && !result.data.success) {
    console.log('✅ Wrong email correctly rejected');
    console.log('Message:', result.data.message);
    console.log('No token generated for wrong email');
  } else {
    console.log('❌ Wrong email test failed');
    console.log('Status:', result.status);
    console.log('Response:', result.data);
  }
}

// Test 2: Request password reset with correct email (should succeed)
async function testCorrectEmailRequest() {
  console.log('\n=== Test 2: Request Password Reset with Correct Email ===');
  
  const data = { email: correctEmail };
  const result = await makeRequest('/forgot-password', data);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ Correct email password reset request successful');
    console.log('Message:', result.data.message);
    console.log('Email:', result.data.data.email);
    firstToken = result.data.data.passwordResetToken;
    console.log('First Token received:', firstToken.substring(0, 20) + '...');
  } else {
    console.log('❌ Correct email request failed');
    console.log('Status:', result.status);
    console.log('Response:', result.data);
  }
}

// Test 3: Request password reset again with correct email (should get fresh token)
async function testSecondRequest() {
  console.log('\n=== Test 3: Second Password Reset Request (Fresh Token) ===');
  
  const data = { email: correctEmail };
  const result = await makeRequest('/forgot-password', data);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ Second password reset request successful');
    console.log('Message:', result.data.message);
    secondToken = result.data.data.passwordResetToken;
    console.log('Second Token received:', secondToken.substring(0, 20) + '...');
    
    // Check if tokens are different
    if (firstToken !== secondToken) {
      console.log('✅ Fresh token generated - tokens are different');
    } else {
      console.log('❌ Same token generated - this should not happen');
    }
  } else {
    console.log('❌ Second request failed');
    console.log('Status:', result.status);
    console.log('Response:', result.data);
  }
}

// Test 4: Try to use first token with OTP (should fail due to email mismatch or invalid token)
async function testFirstTokenWithOtp() {
  console.log('\n=== Test 4: Test First Token with OTP (Should Fail) ===');
  
  if (!firstToken) {
    console.log('❌ No first token available. Run Test 2 first.');
    return;
  }
  
  const data = {
    email: correctEmail,
    otp: '775511',
    passwordResetToken: firstToken
  };
  
  const result = await makeRequest('/verify-reset-otp', data);
  
  if (result.status === 401 && !result.data.success) {
    console.log('✅ First token correctly rejected');
    console.log('Message:', result.data.message);
    console.log('This prevents the email mismatch issue!');
  } else {
    console.log('❌ First token test failed');
    console.log('Status:', result.status);
    console.log('Response:', result.data);
  }
}

// Test 5: Use second (fresh) token with OTP (should succeed)
async function testSecondTokenWithOtp() {
  console.log('\n=== Test 5: Test Second Token with OTP (Should Succeed) ===');
  
  if (!secondToken) {
    console.log('❌ No second token available. Run Test 3 first.');
    return;
  }
  
  const data = {
    email: correctEmail,
    otp: '775511',
    passwordResetToken: secondToken
  };
  
  const result = await makeRequest('/verify-reset-otp', data);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ Second token works correctly');
    console.log('Message:', result.data.message);
    console.log('Final token received for password reset');
  } else {
    console.log('❌ Second token test failed');
    console.log('Status:', result.status);
    console.log('Response:', result.data);
  }
}

// Test 6: Demonstrate the problem that was fixed
async function demonstrateProblem() {
  console.log('\n=== Test 6: Demonstrate the Problem That Was Fixed ===');
  
  console.log('🔍 SCENARIO: User requests password reset with wrong email, then correct email');
  console.log('📧 Wrong email: wrong@example.com (no account exists)');
  console.log('📧 Correct email: testuser@example.com (account exists)');
  console.log('');
  console.log('❌ PROBLEM (Before Fix):');
  console.log('   - Wrong email request fails but might generate token');
  console.log('   - Correct email request generates new token');
  console.log('   - Old token from wrong email still valid');
  console.log('   - Using old token causes "email does not match" error');
  console.log('');
  console.log('✅ SOLUTION (After Fix):');
  console.log('   - Each new request clears previous OTP and generates fresh token');
  console.log('   - Previous tokens are invalidated');
  console.log('   - No more email mismatch errors');
  console.log('   - Fresh start every time');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Testing Fresh Token Behavior for Password Reset');
  console.log('==================================================');
  
  try {
    await testWrongEmailRequest();
    await testCorrectEmailRequest();
    await testSecondRequest();
    await testFirstTokenWithOtp();
    await testSecondTokenWithOtp();
    await demonstrateProblem();
    
    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Summary:');
    console.log('- Each password reset request generates a fresh token');
    console.log('- Previous tokens are invalidated');
    console.log('- No more email mismatch errors from old tokens');
    console.log('- Fresh start policy prevents conflicts');
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testWrongEmailRequest,
  testCorrectEmailRequest,
  testSecondRequest,
  testFirstTokenWithOtp,
  testSecondTokenWithOtp,
  demonstrateProblem,
  runAllTests
};
