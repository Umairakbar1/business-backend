import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Test configuration
const TEST_CONFIG = {
  businessId: 'your-test-business-id',
  paymentPlanId: 'your-test-payment-plan-id',
  boostPlanId: 'your-test-boost-plan-id',
  categoryId: 'your-test-category-id'
};

// Helper function to make API calls
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
}

// Test scenarios
async function testSubscriptionLogic() {
  console.log('🧪 Testing Subscription and Boost Plan Logic\n');

  // Test 1: Subscribe to business plan
  console.log('1. Testing Business Plan Subscription...');
  const businessSubscription = await makeRequest(
    'POST',
    `/api/business/subscriptions/${TEST_CONFIG.businessId}/subscribe`,
    { paymentPlanId: TEST_CONFIG.paymentPlanId }
  );
  
  if (businessSubscription.success) {
    console.log('✅ Business plan subscription created successfully');
    console.log('   Status:', businessSubscription.data.data.subscription.status);
  } else {
    console.log('❌ Business plan subscription failed:', businessSubscription.error.message);
  }

  // Test 2: Try to subscribe again (should update existing pending)
  console.log('\n2. Testing Duplicate Business Plan Subscription...');
  const duplicateBusinessSubscription = await makeRequest(
    'POST',
    `/api/business/subscriptions/${TEST_CONFIG.businessId}/subscribe`,
    { paymentPlanId: TEST_CONFIG.paymentPlanId }
  );
  
  if (duplicateBusinessSubscription.success) {
    console.log('✅ Duplicate subscription handled correctly (updated existing)');
    console.log('   Is Updated:', duplicateBusinessSubscription.data.data.isUpdated);
  } else {
    console.log('❌ Duplicate subscription handling failed:', duplicateBusinessSubscription.error.message);
  }

  // Test 3: Subscribe to boost plan
  console.log('\n3. Testing Boost Plan Subscription...');
  const boostSubscription = await makeRequest(
    'POST',
    `/api/business/subscriptions/${TEST_CONFIG.businessId}/boost/subscribe`,
    { paymentPlanId: TEST_CONFIG.boostPlanId }
  );
  
  if (boostSubscription.success) {
    console.log('✅ Boost plan subscription created successfully');
    console.log('   Status:', boostSubscription.data.data.subscription.status);
    console.log('   Queue Position:', boostSubscription.data.data.queueInfo?.position);
    console.log('   Is Currently Active:', boostSubscription.data.data.queueInfo?.isCurrentlyActive);
  } else {
    console.log('❌ Boost plan subscription failed:', boostSubscription.error.message);
  }

  // Test 4: Try to subscribe to boost plan again (should update existing pending)
  console.log('\n4. Testing Duplicate Boost Plan Subscription...');
  const duplicateBoostSubscription = await makeRequest(
    'POST',
    `/api/business/subscriptions/${TEST_CONFIG.businessId}/boost/subscribe`,
    { paymentPlanId: TEST_CONFIG.boostPlanId }
  );
  
  if (duplicateBoostSubscription.success) {
    console.log('✅ Duplicate boost subscription handled correctly (updated existing)');
    console.log('   Is Updated:', duplicateBoostSubscription.data.data.isUpdated);
  } else {
    console.log('❌ Duplicate boost subscription handling failed:', duplicateBoostSubscription.error.message);
  }

  // Test 5: Get queue status
  console.log('\n5. Testing Queue Status...');
  const queueStatus = await makeRequest(
    'GET',
    `/api/business/subscriptions/${TEST_CONFIG.businessId}/boost/queue-status`
  );
  
  if (queueStatus.success) {
    console.log('✅ Queue status retrieved successfully');
    console.log('   Subscription Status:', queueStatus.data.data.subscription.status);
    console.log('   Queue Position:', queueStatus.data.data.queueInfo?.position);
    console.log('   Is Currently Active:', queueStatus.data.data.queueInfo?.isCurrentlyActive);
    console.log('   Total in Queue:', queueStatus.data.data.queueInfo?.totalInQueue);
  } else {
    console.log('❌ Queue status retrieval failed:', queueStatus.error.message);
  }

  // Test 6: Test boost queue management
  console.log('\n6. Testing Boost Queue Management...');
  const queueManagement = await makeRequest(
    'POST',
    '/api/business/subscriptions/boost-queue-management'
  );
  
  if (queueManagement.success) {
    console.log('✅ Boost queue management executed successfully');
    console.log('   Processed Queues:', queueManagement.data.data.processedQueues);
    if (queueManagement.data.data.results.length > 0) {
      console.log('   Actions Performed:', queueManagement.data.data.results[0].actions.length);
    }
  } else {
    console.log('❌ Boost queue management failed:', queueManagement.error.message);
  }

  // Test 7: Get business subscriptions
  console.log('\n7. Testing Get Business Subscriptions...');
  const businessSubscriptions = await makeRequest(
    'GET',
    `/api/business/subscriptions/${TEST_CONFIG.businessId}/subscriptions`
  );
  
  if (businessSubscriptions.success) {
    console.log('✅ Business subscriptions retrieved successfully');
    console.log('   Business Plans:', businessSubscriptions.data.data.business.length);
    console.log('   Boost Plans:', businessSubscriptions.data.data.boost.length);
  } else {
    console.log('❌ Business subscriptions retrieval failed:', businessSubscriptions.error.message);
  }

  console.log('\n🎉 Testing completed!');
}

// Test boost queue management specifically
async function testBoostQueueManagement() {
  console.log('🧪 Testing Boost Queue Management Specifically\n');

  // Test 1: Get all boost queues
  console.log('1. Testing Get All Boost Queues...');
  const allQueues = await makeRequest(
    'GET',
    '/api/business/subscriptions/all-boost-plans'
  );
  
  if (allQueues.success) {
    console.log('✅ All boost queues retrieved successfully');
    console.log('   Total Businesses:', allQueues.data.data.totalBusinesses);
    console.log('   Total Subscriptions:', allQueues.data.data.summary.totalSubscriptions);
    console.log('   Active Boost Plans:', allQueues.data.data.summary.totalActiveBoostSubscriptions);
    console.log('   Pending Boost Plans:', allQueues.data.data.summary.totalPendingBoostSubscriptions);
  } else {
    console.log('❌ All boost queues retrieval failed:', allQueues.error.message);
  }

  // Test 2: Run queue management
  console.log('\n2. Testing Queue Management Execution...');
  const queueManagement = await makeRequest(
    'POST',
    '/api/business/subscriptions/boost-queue-management'
  );
  
  if (queueManagement.success) {
    console.log('✅ Queue management executed successfully');
    console.log('   Processed Queues:', queueManagement.data.data.processedQueues);
    
    if (queueManagement.data.data.results.length > 0) {
      queueManagement.data.data.results.forEach((result, index) => {
        console.log(`   Queue ${index + 1}: ${result.categoryName}`);
        console.log(`     Actions: ${result.actions.length}`);
        result.actions.forEach(action => {
          console.log(`       - ${action.action}: ${action.message}`);
        });
      });
    }
  } else {
    console.log('❌ Queue management failed:', queueManagement.error.message);
  }

  console.log('\n🎉 Boost Queue Management Testing completed!');
}

// Main execution
async function main() {
  console.log('🚀 Starting Subscription and Boost Plan Logic Tests\n');
  
  try {
    await testSubscriptionLogic();
    console.log('\n' + '='.repeat(50) + '\n');
    await testBoostQueueManagement();
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { testSubscriptionLogic, testBoostQueueManagement };
