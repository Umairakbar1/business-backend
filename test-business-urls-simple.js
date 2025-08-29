// Simple test to check businessUrls processing
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/business';

// Test data with businessUrls
const testData = {
  businessName: 'Test Business Simple',
  category: 'Technology',
  phoneNumber: '+1234567890',
  email: 'test@business.com',
  businessUrls: [
    'https://example.com',
    'https://linkedin.com/company/test-business'
  ]
};

async function testBusinessUrlsSimple() {
  try {
    console.log('🧪 Testing Business URLs Simple\n');
    console.log('Request data:', JSON.stringify(testData, null, 2));
    
    // Test the register-business endpoint
    console.log('\n1. Testing register-business endpoint...');
    try {
      const response = await axios.post(`${BASE_URL}/auth/register-business`, testData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
        }
      });
      
      console.log('✅ Register-business endpoint successful:');
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
      // Check if businessUrls is in the response
      if (response.data.data && response.data.data.businessUrls) {
        console.log('✅ businessUrls found in response:', response.data.data.businessUrls);
        console.log('businessUrls type:', typeof response.data.data.businessUrls);
        console.log('businessUrls length:', response.data.data.businessUrls.length);
      } else {
        console.log('❌ businessUrls NOT found in response');
        console.log('Available fields:', Object.keys(response.data.data || {}));
      }
      
    } catch (error) {
      console.error('❌ Register-business endpoint failed:');
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
testBusinessUrlsSimple();
