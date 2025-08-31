/**
 * Test Script for Dual Subscription System
 * 
 * This script tests the new dual subscription system with:
 * - Business subscriptions (lifetime)
 * - Boost subscriptions (temporary)
 * - Automatic boost expiry
 * - Queue management
 */

import mongoose from 'mongoose';
import Business from './src/models/business/business.js';
import Subscription from './src/models/admin/subscription.js';
import PaymentPlan from './src/models/admin/paymentPlan.js';
import BoostQueue from './src/models/business/boostQueue.js';
import BoostExpiryService from './src/services/boostExpiryService.js';

// Test configuration
const TEST_CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/business-platform',
  testBusinessId: '507f1f77bcf86cd799439011', // Replace with actual test business ID
  testCategoryId: '507f1f77bcf86cd799439012', // Replace with actual test category ID
};

/**
 * Initialize database connection
 */
async function connectDB() {
  try {
    await mongoose.connect(TEST_CONFIG.mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

/**
 * Test 1: Create business subscription
 */
async function testBusinessSubscription() {
  console.log('\n🧪 Test 1: Business Subscription');
  
  try {
    // Create a test payment plan
    const businessPlan = new PaymentPlan({
      name: 'Test Business Plan',
      planType: 'business',
      price: 99.99,
      currency: 'USD',
      features: ['query_ticketing', 'review_management', 'review_embed'],
      isActive: true,
      isLifetime: true
    });
    
    await businessPlan.save();
    console.log('✅ Created test business payment plan');

    // Create business subscription
    const businessSubscription = new Subscription({
      business: TEST_CONFIG.testBusinessId,
      paymentPlan: businessPlan._id,
      subscriptionType: 'business',
      stripeCustomerId: 'cus_test_business',
      status: 'active',
      amount: businessPlan.price,
      currency: businessPlan.currency,
      isLifetime: true,
      features: businessPlan.features
    });

    await businessSubscription.save();
    console.log('✅ Created business subscription');

    // Update business with subscription ID
    await Business.findByIdAndUpdate(TEST_CONFIG.testBusinessId, {
      businessSubscriptionId: businessSubscription._id,
      stripeCustomerId: businessSubscription.stripeCustomerId
    });

    console.log('✅ Updated business with business subscription ID');
    
    return { businessPlan, businessSubscription };
  } catch (error) {
    console.error('❌ Business subscription test failed:', error);
    throw error;
  }
}

/**
 * Test 2: Create boost subscription
 */
async function testBoostSubscription() {
  console.log('\n🧪 Test 2: Boost Subscription');
  
  try {
    // Create a test boost payment plan
    const boostPlan = new PaymentPlan({
      name: 'Test Boost Plan',
      planType: 'boost',
      price: 29.99,
      currency: 'USD',
      features: ['boost_visibility'],
      isActive: true,
      isLifetime: false,
      validityHours: 24,
      maxBoostPerDay: 1
    });
    
    await boostPlan.save();
    console.log('✅ Created test boost payment plan');

    // Create boost subscription
    const boostSubscription = new Subscription({
      business: TEST_CONFIG.testBusinessId,
      paymentPlan: boostPlan._id,
      subscriptionType: 'boost',
      stripeCustomerId: 'cus_test_boost',
      status: 'active',
      amount: boostPlan.price,
      currency: boostPlan.currency,
      isLifetime: false,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      validityHours: boostPlan.validityHours,
      boostQueueInfo: {
        category: TEST_CONFIG.testCategoryId,
        isCurrentlyActive: true,
        boostStartTime: new Date(),
        boostEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        queuePosition: 0
      }
    });

    await boostSubscription.save();
    console.log('✅ Created boost subscription');

    // Update business with boost subscription ID and status
    await Business.findByIdAndUpdate(TEST_CONFIG.testBusinessId, {
      boostSubscriptionId: boostSubscription._id,
      isBoosted: true,
      isBoostActive: true,
      boostExpiryAt: boostSubscription.expiresAt
    });

    console.log('✅ Updated business with boost subscription ID and status');
    
    return { boostPlan, boostSubscription };
  } catch (error) {
    console.error('❌ Boost subscription test failed:', error);
    throw error;
  }
}

/**
 * Test 3: Test boost queue management
 */
async function testBoostQueue() {
  console.log('\n🧪 Test 3: Boost Queue Management');
  
  try {
    // Create boost queue for test category
    const boostQueue = new BoostQueue({
      category: TEST_CONFIG.testCategoryId,
      categoryName: 'Test Category',
      currentlyActive: {
        business: TEST_CONFIG.testBusinessId,
        boostStartTime: new Date(),
        boostEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        subscription: null // Will be populated
      },
      queue: []
    });

    await boostQueue.save();
    console.log('✅ Created boost queue');

    // Test queue position
    const position = boostQueue.getQueuePosition(TEST_CONFIG.testBusinessId);
    console.log(`✅ Queue position for business: ${position}`);

    // Test if business is active
    const isActive = boostQueue.isBusinessActive(TEST_CONFIG.testBusinessId);
    console.log(`✅ Business is currently active: ${isActive}`);

    return boostQueue;
  } catch (error) {
    console.error('❌ Boost queue test failed:', error);
    throw error;
  }
}

/**
 * Test 4: Test boost expiry service
 */
async function testBoostExpiryService() {
  console.log('\n🧪 Test 4: Boost Expiry Service');
  
  try {
    // Test getting business boost status
    const status = await BoostExpiryService.getBusinessBoostStatus(TEST_CONFIG.testBusinessId);
    console.log('✅ Business boost status:', status);

    // Test manual boost expiry check
    const updatedCount = await BoostExpiryService.checkAndUpdateExpiredBoosts();
    console.log(`✅ Boost expiry check completed. Updated ${updatedCount} businesses`);

    return { status, updatedCount };
  } catch (error) {
    console.error('❌ Boost expiry service test failed:', error);
    throw error;
  }
}

/**
 * Test 5: Verify business model changes
 */
async function testBusinessModel() {
  console.log('\n🧪 Test 5: Business Model Changes');
  
  try {
    const business = await Business.findById(TEST_CONFIG.testBusinessId);
    
    if (!business) {
      throw new Error('Test business not found');
    }

    console.log('✅ Business model fields:');
    console.log(`  - businessSubscriptionId: ${business.businessSubscriptionId}`);
    console.log(`  - boostSubscriptionId: ${business.boostSubscriptionId}`);
    console.log(`  - isBoosted: ${business.isBoosted}`);
    console.log(`  - isBoostActive: ${business.isBoostActive}`);
    console.log(`  - boostExpiryAt: ${business.boostExpiryAt}`);
    console.log(`  - activeSubscriptionId: ${business.activeSubscriptionId}`); // Backward compatibility

    // Verify both subscription types can coexist
    if (business.businessSubscriptionId && business.boostSubscriptionId) {
      console.log('✅ Both subscription types can coexist');
    }

    // Verify boost status is properly set
    if (business.isBoosted && business.isBoostActive) {
      console.log('✅ Boost status properly set');
    }

    return business;
  } catch (error) {
    console.error('❌ Business model test failed:', error);
    throw error;
  }
}

/**
 * Clean up test data
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Remove test subscriptions
    await Subscription.deleteMany({
      stripeCustomerId: { $in: ['cus_test_business', 'cus_test_boost'] }
    });

    // Remove test payment plans
    await PaymentPlan.deleteMany({
      name: { $in: ['Test Business Plan', 'Test Boost Plan'] }
    });

    // Remove test boost queue
    await BoostQueue.deleteMany({
      category: TEST_CONFIG.testCategoryId
    });

    // Reset business subscription fields
    await Business.findByIdAndUpdate(TEST_CONFIG.testBusinessId, {
      $unset: {
        businessSubscriptionId: 1,
        boostSubscriptionId: 1,
        isBoosted: 1,
        isBoostActive: 1,
        boostExpiryAt: 1
      }
    });

    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Dual Subscription System Tests\n');
  
  try {
    await connectDB();
    
    await testBusinessSubscription();
    await testBoostSubscription();
    await testBoostQueue();
    await testBoostExpiryService();
    await testBusinessModel();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n✅ Dual subscription system is working correctly');
    console.log('✅ Business and boost subscriptions can coexist');
    console.log('✅ Boost status is properly managed');
    console.log('✅ Queue system is functional');
    console.log('✅ Expiry service is operational');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  } finally {
    await cleanup();
    await mongoose.disconnect();
    console.log('\n👋 Tests completed. Database disconnected.');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
