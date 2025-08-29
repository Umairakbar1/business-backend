// Comprehensive test to debug businessUrls issue
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/business';

// Test data with businessUrls
const testData = {
  businessName: 'Test Business Debug',
  category: 'Technology',
  phoneNumber: '+1234567890',
  email: 'test@business.com',
  businessUrls: [
    'https://example.com',
    'https://linkedin.com/company/test-business'
  ]
};

async function testBusinessUrlsDebug() {
  try {
    console.log('🧪 Testing Business URLs Debug\n');
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
    
    // Test the main business endpoint
    console.log('\n2. Testing main business endpoint...');
    try {
      const response = await axios.post(`${BASE_URL}/business`, testData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
        }
      });
      
      console.log('✅ Main business endpoint successful:');
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
      console.error('❌ Main business endpoint failed:');
      console.error('Error message:', error.response?.data?.message || error.message);
      console.error('Error code:', error.response?.data?.code);
      console.error('Full error response:', JSON.stringify(error.response?.data, null, 2));
    }
    
    // Test with different data formats
    console.log('\n3. Testing different businessUrls formats...');
    
    // Test 1: Empty array
    const testDataEmpty = { ...testData, businessUrls: [] };
    console.log('\n3a. Testing with empty array:', testDataEmpty.businessUrls);
    
    // Test 2: Single string
    const testDataSingle = { ...testData, businessUrls: 'https://example.com' };
    console.log('\n3b. Testing with single string:', testDataSingle.businessUrls);
    
    // Test 3: Null value
    const testDataNull = { ...testData, businessUrls: null };
    console.log('\n3c. Testing with null:', testDataNull.businessUrls);
    
    // Test 4: Undefined value
    const testDataUndefined = { ...testData };
    delete testDataUndefined.businessUrls;
    console.log('\n3d. Testing with undefined:', testDataUndefined.businessUrls);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testBusinessUrlsDebug();
