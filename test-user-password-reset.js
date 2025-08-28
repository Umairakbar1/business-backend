// Test file for User Password Reset functionality
// Run with: node test-user-password-reset.js

const BASE_URL = 'http://localhost:5000/user/auth';

// Test data
const testEmail = 'testuser@example.com';
let passwordResetToken = '';
let finalPasswordResetToken = '';

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

// Test 1: Request Password Reset
async function testRequestPasswordReset() {
  console.log('\n=== Test 1: Request Password Reset ===');
  
  const data = { email: testEmail };
  const result = await makeRequest('/forgot-password', data);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ Password reset request successful');
    console.log('Message:', result.data.message);
    console.log('Email:', result.data.data.email);
    passwordResetToken = result.data.data.passwordResetToken;
    console.log('Password Reset Token received');
  } else {
    console.log('❌ Password reset request failed');
    console.log('Status:', result.status);
    console.log('Response:', result.data);
  }
}

// Test 2: Verify OTP
async function testVerifyOtp() {
  console.log('\n=== Test 2: Verify OTP ===');
  
  if (!passwordResetToken) {
    console.log('❌ No password reset token available. Run Test 1 first.');
    return;
  }
  
  const data = {
    email: testEmail,
    otp: '775511', // Test OTP
    passwordResetToken: passwordResetToken
  };
  
  const result = await makeRequest('/verify-reset-otp', data);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ OTP verification successful');
    console.log('Message:', result.data.message);
    finalPasswordResetToken = result.data.data.finalPasswordResetToken;
    console.log('Final Password Reset Token received');
  } else {
    console.log('❌ OTP verification failed');
    console.log('Status:', result.status);
    console.log('Response:', result.data);
  }
}

// Test 3: Reset Password
async function testResetPassword() {
  console.log('\n=== Test 3: Reset Password ===');
  
  if (!finalPasswordResetToken) {
    console.log('❌ No final password reset token available. Run Test 2 first.');
    return;
  }
  
  const data = {
    email: testEmail,
    newPassword: 'NewPassword123!',
    confirmPassword: 'NewPassword123!',
    finalPasswordResetToken: finalPasswordResetToken
  };
  
  const result = await makeRequest('/reset-password', data);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ Password reset successful');
    console.log('Message:', result.data.message);
    console.log('Email:', result.data.data.email);
  } else {
    console.log('❌ Password reset failed');
    console.log('Status:', result.status);
    console.log('Response:', result.data);
  }
}

// Test 4: Test with invalid OTP
async function testInvalidOtp() {
  console.log('\n=== Test 4: Test Invalid OTP ===');
  
  if (!passwordResetToken) {
    console.log('❌ No password reset token available. Run Test 1 first.');
    return;
  }
  
  const data = {
    email: testEmail,
    otp: '123456', // Invalid OTP
    passwordResetToken: passwordResetToken
  };
  
  const result = await makeRequest('/verify-reset-otp', data);
  
  if (result.status === 400 && !result.data.success) {
    console.log('✅ Invalid OTP correctly rejected');
    console.log('Message:', result.data.message);
  } else {
    console.log('❌ Invalid OTP test failed');
    console.log('Status:', result.status);
    console.log('Response:', result.data);
  }
}

// Test 5: Test with invalid token
async function testInvalidToken() {
  console.log('\n=== Test 5: Test Invalid Token ===');
  
  const data = {
    email: testEmail,
    otp: '775511',
    passwordResetToken: 'invalid.token.here'
  };
  
  const result = await makeRequest('/verify-reset-otp', data);
  
  if (result.status === 401 && !result.data.success) {
    console.log('✅ Invalid token correctly rejected');
    console.log('Message:', result.data.message);
  } else {
    console.log('❌ Invalid token test failed');
    console.log('Status:', result.status);
    console.log('Response:', result.data);
  }
}

// Test 6: Test password validation
async function testPasswordValidation() {
  console.log('\n=== Test 6: Test Password Validation ===');
  
  if (!finalPasswordResetToken) {
    console.log('❌ No final password reset token available. Run Test 2 first.');
    return;
  }
  
  // Test weak password
  const weakPasswordData = {
    email: testEmail,
    newPassword: 'weak',
    confirmPassword: 'weak',
    finalPasswordResetToken: finalPasswordResetToken
  };
  
  const weakResult = await makeRequest('/reset-password', weakPasswordData);
  
  if (weakResult.status === 400 && !weakResult.data.success) {
    console.log('✅ Weak password correctly rejected');
    console.log('Message:', weakResult.data.message);
  } else {
    console.log('❌ Weak password test failed');
    console.log('Status:', weakResult.status);
    console.log('Response:', weakResult.data);
  }
  
  // Test password mismatch
  const mismatchData = {
    email: testEmail,
    newPassword: 'NewPassword123!',
    confirmPassword: 'DifferentPassword123!',
    finalPasswordResetToken: finalPasswordResetToken
  };
  
  const mismatchResult = await makeRequest('/reset-password', mismatchData);
  
  if (mismatchResult.status === 400 && !mismatchResult.data.success) {
    console.log('✅ Password mismatch correctly rejected');
    console.log('Message:', mismatchResult.data.message);
  } else {
    console.log('❌ Password mismatch test failed');
    console.log('Status:', mismatchResult.status);
    console.log('Response:', mismatchResult.data);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting User Password Reset Tests');
  console.log('=====================================');
  
  try {
    await testRequestPasswordReset();
    await testVerifyOtp();
    await testResetPassword();
    await testInvalidOtp();
    await testInvalidToken();
    await testPasswordValidation();
    
    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testRequestPasswordReset,
  testVerifyOtp,
  testResetPassword,
  testInvalidOtp,
  testInvalidToken,
  testPasswordValidation,
  runAllTests
};
