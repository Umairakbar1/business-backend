// Test to verify businessUrls validation fix
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/business';

// Test data with businessUrls
const testData = {
  businessName: 'Test Business Fix',
  category: 'Technology',
  phoneNumber: '+1234567890',
  email: 'test@business.com',
  businessUrls: [
    'https://example.com',
    'https://linkedin.com/company/test-business'
  ]
};

async function testBusinessUrlsFix() {
  try {
    console.log('🧪 Testing Business URLs Fix\n');
    console.log('Request data:', JSON.stringify(testData, null, 2));
    
    // Test the register-business endpoint (which was causing the error)
    console.log('\n1. Testing register-business endpoint...');
    try {
      const response = await axios.post(`${BASE_URL}/auth/register-business`, testData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
        }
      });
      
      console.log('✅ Register-business endpoint successful:', response.data);
      
    } catch (error) {
      console.error('❌ Register-business endpoint failed:');
      console.error('Error message:', error.response?.data?.message || error.message);
      console.error('Error code:', error.response?.data?.code);
      console.error('Full error response:', JSON.stringify(error.response?.data, null, 2));
    }
    
    // Test the main business endpoint
    console.log('\n2. Testing main business endpoint...');
    try {
      const response = await axios.post(`${BASE_URL}/business`, testData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
        }
      });
      
      console.log('✅ Main business endpoint successful:', response.data);
      
    } catch (error) {
      console.error('❌ Main business endpoint failed:');
      console.error('Error message:', error.response?.data?.message || error.message);
      console.error('Error code:', error.response?.data?.code);
      console.error('Full error response:', JSON.stringify(error.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testBusinessUrlsFix();
