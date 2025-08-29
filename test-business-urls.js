// Test script for businessUrls functionality
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/business';

// Test data
const testBusinessData = {
  businessName: 'Test Business with URLs',
  category: 'Technology',
  phoneNumber: '+1234567890',
  email: 'test@business.com',
  metaTitle: 'Test Business Meta Title',
  metaDescription: 'Test business meta description',
  focusKeywords: ['technology', 'services'],
  businessUrls: [
    'https://example.com',
    'https://linkedin.com/company/test-business',
    'https://twitter.com/testbusiness'
  ],
  about: 'This is a test business with URLs',
  serviceOffer: 'We offer test services',
  plan: 'bronze'
};

// Test business URLs functionality
async function testBusinessUrls() {
  try {
    console.log('🧪 Testing Business URLs Functionality\n');

    // 1. Test creating business with URLs
    console.log('1. Testing business creation with URLs...');
    const createResponse = await axios.post(`${BASE_URL}/business`, testBusinessData);
    
    if (createResponse.data.success) {
      console.log('✅ Business created successfully with URLs');
      console.log('Business URLs:', createResponse.data.data.businessUrls);
      
      const businessId = createResponse.data.data._id;
      
      // 2. Test getting business by ID (should include URLs)
      console.log('\n2. Testing get business by ID...');
      const getResponse = await axios.get(`${BASE_URL}/business/${businessId}`);
      
      if (getResponse.data.success) {
        console.log('✅ Business retrieved successfully');
        console.log('Retrieved URLs:', getResponse.data.data.businessUrls);
      } else {
        console.log('❌ Failed to retrieve business');
      }
      
      // 3. Test updating business URLs
      console.log('\n3. Testing business URLs update...');
      const updatedUrls = [
        'https://updated-example.com',
        'https://linkedin.com/company/updated-business'
      ];
      
      const updateResponse = await axios.put(`${BASE_URL}/business/${businessId}`, {
        businessUrls: updatedUrls
      });
      
      if (updateResponse.data.success) {
        console.log('✅ Business URLs updated successfully');
        console.log('Updated URLs:', updateResponse.data.data.businessUrls);
      } else {
        console.log('❌ Failed to update business URLs');
      }
      
      // 4. Test validation - try to add more than 5 URLs
      console.log('\n4. Testing URL limit validation...');
      const tooManyUrls = [
        'https://url1.com',
        'https://url2.com',
        'https://url3.com',
        'https://url4.com',
        'https://url5.com',
        'https://url6.com' // This should fail
      ];
      
      try {
        const validationResponse = await axios.put(`${BASE_URL}/business/${businessId}`, {
          businessUrls: tooManyUrls
        });
        console.log('❌ Should have failed validation for too many URLs');
      } catch (error) {
        if (error.response && error.response.status === 400) {
          console.log('✅ Validation correctly rejected too many URLs');
        } else {
          console.log('❌ Unexpected error:', error.message);
        }
      }
      
      // 5. Test invalid URL format
      console.log('\n5. Testing invalid URL format...');
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid-protocol.com',
        'https://valid-url.com'
      ];
      
      try {
        const invalidResponse = await axios.put(`${BASE_URL}/business/${businessId}`, {
          businessUrls: invalidUrls
        });
        console.log('❌ Should have failed validation for invalid URLs');
      } catch (error) {
        if (error.response && error.response.status === 400) {
          console.log('✅ Validation correctly rejected invalid URLs');
        } else {
          console.log('❌ Unexpected error:', error.message);
        }
      }
      
      // 6. Clean up - delete test business
      console.log('\n6. Cleaning up test data...');
      try {
        await axios.delete(`${BASE_URL}/business/${businessId}`);
        console.log('✅ Test business deleted successfully');
      } catch (error) {
        console.log('❌ Failed to delete test business:', error.message);
      }
      
    } else {
      console.log('❌ Failed to create business');
      console.log('Error:', createResponse.data);
    }
    
    console.log('\n🎉 Business URLs functionality test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testBusinessUrls();
