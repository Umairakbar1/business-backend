// Test script for Business Authentication API
// Run this script to test the business authentication endpoints

const BASE_URL = 'http://localhost:3000/api/business/auth';

// Test data
const testBusiness = {
  ownerFirstName: 'John',
  ownerLastName: 'Doe',
  email: 'john.doe@testbusiness.com',
  phoneNumber: '+1234567890'
};

const testCredentials = {
  email: 'john.doe@testbusiness.com',
  password: 'TestPassword123!',
  username: 'johndoe_test'
};

const testGoogleAuth = {
  googleId: 'google_test_user_123',
  ownerFirstName: 'Jane',
  ownerLastName: 'Smith',
  email: 'jane.smith@gmail.com',
  profilePhoto: 'https://lh3.googleusercontent.com/test-photo.jpg'
};

// Helper function to make API requests
async function makeRequest(endpoint, method = 'GET', data = null, token = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const result = await response.json();
    return { status: response.status, data: result };
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

// Test functions
async function testBusinessSignup() {
  console.log('\n=== Testing Business Signup ===');
  const result = await makeRequest('/signup', 'POST', testBusiness);
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  return result;
}

async function testVerifyOtp() {
  console.log('\n=== Testing OTP Verification ===');
  const otpData = {
    email: testBusiness.email,
    otp: '123456', // Test OTP
    username: testCredentials.username,
    password: testCredentials.password
  };
  const result = await makeRequest('/verify-otp', 'POST', otpData);
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  return result;
}

async function testBusinessLogin() {
  console.log('\n=== Testing Business Login ===');
  const loginData = {
    email: testCredentials.email,
    password: testCredentials.password
  };
  const result = await makeRequest('/login', 'POST', loginData);
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  return result;
}

async function testGoogleAuth() {
  console.log('\n=== Testing Google Authentication ===');
  const result = await makeRequest('/google', 'POST', testGoogleAuth);
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  return result;
}

async function testSendOtp() {
  console.log('\n=== Testing Send OTP ===');
  const otpData = { email: testBusiness.email };
  const result = await makeRequest('/send-otp', 'POST', otpData);
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  return result;
}

async function testForgotPassword() {
  console.log('\n=== Testing Forgot Password ===');
  const forgotData = { email: testBusiness.email };
  const result = await makeRequest('/forgot-password', 'POST', forgotData);
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  return result;
}

async function testGetProfile(token) {
  console.log('\n=== Testing Get Profile ===');
  const result = await makeRequest('/profile', 'GET', null, token);
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  return result;
}

async function testUpdatePassword(token) {
  console.log('\n=== Testing Update Password ===');
  const passwordData = {
    currentPassword: testCredentials.password,
    newPassword: 'NewTestPassword123!'
  };
  const result = await makeRequest('/update-password', 'PUT', passwordData, token);
  console.log('Status:', result.status);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  return result;
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Business Authentication API Tests...\n');

  try {
    // Test 1: Business Signup
    await testBusinessSignup();

    // Test 2: Verify OTP
    await testVerifyOtp();

    // Test 3: Business Login
    const loginResult = await testBusinessLogin();
    let token = null;
    if (loginResult.data.success && loginResult.data.data.token) {
      token = loginResult.data.data.token;
    }

    // Test 4: Google Authentication
    await testGoogleAuth();

    // Test 5: Send OTP
    await testSendOtp();

    // Test 6: Forgot Password
    await testForgotPassword();

    // Test 7: Get Profile (requires token)
    if (token) {
      await testGetProfile(token);
    } else {
      console.log('\n⚠️  Skipping profile test - no valid token available');
    }

    // Test 8: Update Password (requires token)
    if (token) {
      await testUpdatePassword(token);
    } else {
      console.log('\n⚠️  Skipping password update test - no valid token available');
    }

    console.log('\n✅ All tests completed!');
    console.log('\n📝 Note: Some tests may fail if the business account is not approved by admin.');
    console.log('📝 Note: OTP verification may fail in development environment.');

  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  global.fetch = fetch;
  runTests();
} else {
  // Browser environment
  console.log('Run this script in Node.js environment for testing');
}

// Export for use in other files
export {
  testBusinessSignup,
  testVerifyOtp,
  testBusinessLogin,
  testGoogleAuth,
  testSendOtp,
  testForgotPassword,
  testGetProfile,
  testUpdatePassword,
  runTests
}; 