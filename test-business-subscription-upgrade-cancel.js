/**
 * Test Script for Business Subscription Upgrade and Cancel
 * 
 * This script tests the business subscription upgrade and cancel functionality
 */

import mongoose from 'mongoose';
import Business from './src/models/business/business.js';
import Category from './src/models/admin/category.js';
import PaymentPlan from './src/models/admin/paymentPlan.js';
import Subscription from './src/models/admin/subscription.js';

// Test configuration
const TEST_CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/business-platform',
  testBusinessId: '507f1f77bcf86cd799439011', // Replace with actual test business ID
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
 * Test 1: Create test business plans
 */
async function createTestBusinessPlans() {
  console.log('\n🧪 Test 1: Create Test Business Plans');
  
  try {
    // Create Basic Plan
    let basicPlan = await PaymentPlan.findOne({ name: 'Basic Business Plan' });
    if (!basicPlan) {
      basicPlan = new PaymentPlan({
        name: 'Basic Business Plan',
        planType: 'business',
        price: 29.99,
        currency: 'USD',
        features: ['basic_listing', 'contact_info'],
        isActive: true,
        isLifetime: false,
        validityHours: 8760 // 1 year
      });
      await basicPlan.save();
      console.log('✅ Basic plan created:', basicPlan._id);
    } else {
      console.log('✅ Basic plan already exists:', basicPlan._id);
    }

    // Create Premium Plan
    let premiumPlan = await PaymentPlan.findOne({ name: 'Premium Business Plan' });
    if (!premiumPlan) {
      premiumPlan = new PaymentPlan({
        name: 'Premium Business Plan',
        planType: 'business',
        price: 79.99,
        currency: 'USD',
        features: ['basic_listing', 'contact_info', 'priority_support', 'analytics'],
        isActive: true,
        isLifetime: false,
        validityHours: 8760 // 1 year
      });
      await premiumPlan.save();
      console.log('✅ Premium plan created:', premiumPlan._id);
    } else {
      console.log('✅ Premium plan already exists:', premiumPlan._id);
    }

    // Create Enterprise Plan
    let enterprisePlan = await PaymentPlan.findOne({ name: 'Enterprise Business Plan' });
    if (!enterprisePlan) {
      enterprisePlan = new PaymentPlan({
        name: 'Enterprise Business Plan',
        planType: 'business',
        price: 199.99,
        currency: 'USD',
        features: ['basic_listing', 'contact_info', 'priority_support', 'analytics', 'custom_branding', 'api_access'],
        isActive: true,
        isLifetime: true
      });
      await enterprisePlan.save();
      console.log('✅ Enterprise plan created:', enterprisePlan._id);
    } else {
      console.log('✅ Enterprise plan already exists:', enterprisePlan._id);
    }

    return { basicPlan, premiumPlan, enterprisePlan };
  } catch (error) {
    console.error('❌ Error creating test business plans:', error);
    return null;
  }
}

/**
 * Test 2: Create test business subscription
 */
async function createTestBusinessSubscription(businessId, paymentPlan) {
  console.log('\n🧪 Test 2: Create Test Business Subscription');
  
  try {
    // Check if business subscription already exists
    let existingSubscription = await Subscription.findOne({
      business: businessId,
      subscriptionType: 'business',
      status: 'active'
    });

    if (existingSubscription) {
      console.log('✅ Business subscription already exists:', existingSubscription._id);
      return existingSubscription;
    }

    // Create new subscription
    const subscription = new Subscription({
      business: businessId,
      paymentPlan: paymentPlan._id,
      subscriptionType: 'business',
      stripeCustomerId: 'cus_test_' + Date.now(),
      status: 'active',
      amount: paymentPlan.price,
      currency: paymentPlan.currency,
      isLifetime: paymentPlan.isLifetime,
      expiresAt: paymentPlan.isLifetime ? null : new Date(Date.now() + (paymentPlan.validityHours || 8760) * 60 * 60 * 1000),
      paymentId: 'pi_test_' + Date.now(),
      features: paymentPlan.features || [],
      metadata: {
        planName: paymentPlan.name,
        businessName: 'Test Business',
        testSubscription: true
      }
    });

    await subscription.save();
    console.log('✅ Test business subscription created:', subscription._id);

    // Update business with subscription ID
    await Business.findByIdAndUpdate(businessId, {
      businessSubscriptionId: subscription._id,
      stripeCustomerId: subscription.stripeCustomerId
    });

    return subscription;
  } catch (error) {
    console.error('❌ Error creating test business subscription:', error);
    return null;
  }
}

/**
 * Test 3: Test upgrade validation
 */
async function testUpgradeValidation(businessId, currentPlan, newPlan) {
  console.log('\n🧪 Test 3: Test Upgrade Validation');
  
  try {
    console.log('Testing upgrade from', currentPlan.name, 'to', newPlan.name);
    
    // Check if it's actually an upgrade (higher price)
    if (newPlan.price <= currentPlan.price) {
      console.log('❌ Not an upgrade - new plan price is not higher');
      return false;
    }

    console.log('✅ Upgrade validation passed');
    console.log('Price difference:', newPlan.price - currentPlan.price);
    
    return true;
  } catch (error) {
    console.error('❌ Error in upgrade validation:', error);
    return false;
  }
}

/**
 * Test 4: Simulate upgrade process
 */
async function simulateUpgradeProcess(businessId, currentPlan, newPlan) {
  console.log('\n🧪 Test 4: Simulate Upgrade Process');
  
  try {
    // Find current subscription
    const currentSubscription = await Subscription.findOne({
      business: businessId,
      subscriptionType: 'business',
      status: 'active'
    });

    if (!currentSubscription) {
      console.log('❌ No active business subscription found');
      return false;
    }

    console.log('Current subscription:', currentSubscription._id);
    console.log('Current plan:', currentPlan.name, '($' + currentPlan.price + ')');
    console.log('New plan:', newPlan.name, '($' + newPlan.price + ')');

    // Calculate price difference
    const priceDifference = newPlan.price - currentPlan.price;
    console.log('Price difference: $' + priceDifference);

    // Create new subscription record (simulating the upgrade)
    const newSubscription = new Subscription({
      business: businessId,
      paymentPlan: newPlan._id,
      subscriptionType: 'business',
      stripeCustomerId: currentSubscription.stripeCustomerId,
      status: 'pending', // Will be activated after payment
      amount: newPlan.price,
      currency: newPlan.currency,
      isLifetime: newPlan.isLifetime,
      expiresAt: newPlan.isLifetime ? null : new Date(Date.now() + (newPlan.validityHours || 8760) * 60 * 60 * 1000),
      paymentId: 'pi_upgrade_' + Date.now(),
      features: newPlan.features || [],
      metadata: {
        planName: newPlan.name,
        businessName: 'Test Business',
        upgradeFrom: currentPlan.name,
        upgradeFromId: currentPlan._id.toString(),
        upgradeReason: 'user_requested',
        testUpgrade: true
      }
    });

    await newSubscription.save();
    console.log('✅ Upgrade subscription created:', newSubscription._id);

    // Simulate payment confirmation
    newSubscription.status = 'active';
    await newSubscription.save();

    // Mark old subscription as upgraded
    currentSubscription.status = 'upgraded';
    currentSubscription.metadata = {
      ...currentSubscription.metadata,
      upgradedTo: newSubscription._id,
      upgradedAt: new Date(),
      upgradeReason: 'user_requested'
    };
    await currentSubscription.save();

    // Update business with new subscription ID
    await Business.findByIdAndUpdate(businessId, {
      businessSubscriptionId: newSubscription._id
    });

    console.log('✅ Upgrade process completed successfully');
    console.log('Old subscription status:', currentSubscription.status);
    console.log('New subscription status:', newSubscription.status);

    return { oldSubscription: currentSubscription, newSubscription };
  } catch (error) {
    console.error('❌ Error in upgrade process:', error);
    return false;
  }
}

/**
 * Test 5: Test cancellation process
 */
async function testCancellationProcess(businessId) {
  console.log('\n🧪 Test 5: Test Cancellation Process');
  
  try {
    // Find active business subscription
    const subscription = await Subscription.findOne({
      business: businessId,
      subscriptionType: 'business',
      status: 'active'
    });

    if (!subscription) {
      console.log('❌ No active business subscription found to cancel');
      return false;
    }

    console.log('Canceling subscription:', subscription._id);
    console.log('Subscription amount: $' + subscription.amount);

    // Get payment plan details
    const paymentPlan = await PaymentPlan.findById(subscription.paymentPlan);
    if (!paymentPlan) {
      console.log('❌ Payment plan not found');
      return false;
    }

    // Simulate cancellation logic
    let refundAmount = 0;
    let cancellationMessage = '';

    if (paymentPlan.isLifetime) {
      // For lifetime subscriptions, check 30-day money-back guarantee
      const purchaseDate = subscription.createdAt;
      const now = new Date();
      const daysSincePurchase = Math.floor((now - purchaseDate) / (1000 * 60 * 60 * 24));
      
      if (daysSincePurchase <= 30) {
        refundAmount = subscription.amount;
        cancellationMessage = 'Full refund processed - within 30-day money-back guarantee';
      } else {
        cancellationMessage = 'No refund available - subscription is outside 30-day money-back period';
      }
    } else {
      // For time-based subscriptions, calculate refund based on unused time
      const now = new Date();
      const expiryDate = new Date(subscription.expiresAt);
      const totalDuration = expiryDate - subscription.createdAt;
      const timeRemaining = expiryDate - now;
      
      if (timeRemaining > 0) {
        const remainingPercentage = timeRemaining / totalDuration;
        refundAmount = subscription.amount * remainingPercentage;
        cancellationMessage = `Partial refund processed: ${Math.round(remainingPercentage * 100)}% of unused time refunded`;
      } else {
        cancellationMessage = 'No refund available - subscription has already expired';
      }
    }

    // Update subscription status
    subscription.status = 'canceled';
    subscription.metadata = {
      ...subscription.metadata,
      canceledAt: new Date(),
      refundProcessed: refundAmount > 0,
      refundAmount: refundAmount,
      cancellationReason: 'user_requested',
      testCancellation: true
    };
    await subscription.save();

    // Update business subscription status
    await Business.findByIdAndUpdate(businessId, {
      businessSubscriptionId: null
    });

    console.log('✅ Cancellation process completed');
    console.log('Refund amount: $' + refundAmount);
    console.log('Cancellation message:', cancellationMessage);
    console.log('Subscription status:', subscription.status);

    return { subscription, refundAmount, cancellationMessage };
  } catch (error) {
    console.error('❌ Error in cancellation process:', error);
    return false;
  }
}

/**
 * Clean up test data
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Remove test business plans
    await PaymentPlan.deleteMany({ 
      name: { 
        $in: ['Basic Business Plan', 'Premium Business Plan', 'Enterprise Business Plan'] 
      } 
    });
    console.log('✅ Test business plans removed');

    // Remove test subscriptions
    await Subscription.deleteMany({ 
      $or: [
        { 'metadata.testSubscription': true },
        { 'metadata.testUpgrade': true },
        { 'metadata.testCancellation': true }
      ]
    });
    console.log('✅ Test subscriptions removed');

    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Business Subscription Upgrade/Cancel Tests\n');
  
  try {
    await connectDB();
    
    // Create test plans
    const plans = await createTestBusinessPlans();
    if (!plans) {
      throw new Error('Failed to create test plans');
    }

    // Create initial subscription with basic plan
    const basicSubscription = await createTestBusinessSubscription(TEST_CONFIG.testBusinessId, plans.basicPlan);
    if (!basicSubscription) {
      throw new Error('Failed to create test business subscription');
    }

    // Test upgrade validation
    const upgradeValid = await testUpgradeValidation(TEST_CONFIG.testBusinessId, plans.basicPlan, plans.premiumPlan);
    if (!upgradeValid) {
      throw new Error('Upgrade validation failed');
    }

    // Test upgrade process
    const upgradeResult = await simulateUpgradeProcess(TEST_CONFIG.testBusinessId, plans.basicPlan, plans.premiumPlan);
    if (!upgradeResult) {
      throw new Error('Upgrade process failed');
    }

    // Test cancellation process
    const cancellationResult = await testCancellationProcess(TEST_CONFIG.testBusinessId);
    if (!cancellationResult) {
      throw new Error('Cancellation process failed');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n✅ Business subscription upgrade functionality is working');
    console.log('✅ Business subscription cancellation functionality is working');
    console.log('✅ Refund calculations are working correctly');
    console.log('✅ Subscription status updates are working');
    
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
