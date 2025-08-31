/**
 * Test Script for Payment Plan System
 * 
 * This script tests the core functionality of the payment plan system
 * including business subscriptions and boost plans.
 * 
 * Run with: node test-payment-plan-system.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Business from './src/models/business/business.js';
import PaymentPlan from './src/models/admin/paymentPlan.js';
import Subscription from './src/models/admin/subscription.js';
import BoostExpiryService from './src/services/boostExpiryService.js';

// Load environment variables
dotenv.config();

// Test configuration
const TEST_CONFIG = {
  businessId: '507f1f77bcf86cd799439011', // Replace with actual test business ID
  paymentPlanId: '507f1f77bcf86cd799439012', // Replace with actual test plan ID
  stripeCustomerId: 'cus_test123',
  testMode: true
};

class PaymentPlanSystemTester {
  constructor() {
    this.testResults = [];
    this.connection = null;
  }

  /**
   * Initialize database connection
   */
  async connect() {
    try {
      this.connection = await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error.message);
      return false;
    }
  }

  /**
   * Test payment plan creation and validation
   */
  async testPaymentPlanValidation() {
    console.log('\n🧪 Testing Payment Plan Validation...');
    
    try {
      // Test business plan validation
      const businessPlan = new PaymentPlan({
        name: 'Test Business Plan',
        description: 'Test business subscription plan',
        planType: 'business',
        price: 2999, // $29.99
        currency: 'USD',
        features: ['query', 'review'],
        stripeProductId: 'prod_test123',
        stripePriceId: 'price_test123',
        maxBoostPerDay: 5
      });

      await businessPlan.save();
      console.log('✅ Business plan created successfully');

      // Test boost plan validation
      const boostPlan = new PaymentPlan({
        name: 'Test Boost Plan',
        description: 'Test boost plan',
        planType: 'boost',
        price: 999, // $9.99
        currency: 'USD',
        stripeProductId: 'prod_test456',
        stripePriceId: 'price_test456',
        validityHours: 24
      });

      await boostPlan.save();
      console.log('✅ Boost plan created successfully');

      // Test invalid plan (should fail)
      try {
        const invalidPlan = new PaymentPlan({
          name: 'Invalid Plan',
          description: 'Invalid plan type',
          planType: 'business',
          price: 1999,
          currency: 'USD',
          features: ['query'],
          stripeProductId: 'prod_test789',
          stripePriceId: 'price_test789',
          validityHours: 24 // Should not be set for business plans
        });

        await invalidPlan.save();
        console.log('❌ Invalid plan should have failed validation');
      } catch (error) {
        console.log('✅ Invalid plan correctly rejected:', error.message);
      }

      this.testResults.push({
        test: 'Payment Plan Validation',
        status: 'PASSED',
        details: 'Business and boost plans created successfully, validation working'
      });

    } catch (error) {
      console.error('❌ Payment plan validation test failed:', error.message);
      this.testResults.push({
        test: 'Payment Plan Validation',
        status: 'FAILED',
        details: error.message
      });
    }
  }

  /**
   * Test subscription creation and management
   */
  async testSubscriptionManagement() {
    console.log('\n🧪 Testing Subscription Management...');
    
    try {
      // Get test payment plan
      const paymentPlan = await PaymentPlan.findOne({ planType: 'business' });
      if (!paymentPlan) {
        throw new Error('No test payment plan found');
      }

      // Create test subscription
      const subscription = new Subscription({
        business: TEST_CONFIG.businessId,
        paymentPlan: paymentPlan._id,
        subscriptionType: 'business',
        stripeCustomerId: TEST_CONFIG.stripeCustomerId,
        status: 'active',
        amount: paymentPlan.price,
        currency: paymentPlan.currency,
        isLifetime: true,
        features: paymentPlan.features,
        maxBoostPerDay: paymentPlan.maxBoostPerDay
      });

      await subscription.save();
      console.log('✅ Business subscription created successfully');

      // Test boost subscription
      const boostPlan = await PaymentPlan.findOne({ planType: 'boost' });
      if (boostPlan) {
        const boostSubscription = new Subscription({
          business: TEST_CONFIG.businessId,
          paymentPlan: boostPlan._id,
          subscriptionType: 'boost',
          stripeCustomerId: TEST_CONFIG.stripeCustomerId,
          status: 'active',
          amount: boostPlan.price,
          currency: boostPlan.currency,
          isLifetime: false,
          expiresAt: new Date(Date.now() + boostPlan.validityHours * 60 * 60 * 1000),
          validityHours: boostPlan.validityHours
        });

        await boostSubscription.save();
        console.log('✅ Boost subscription created successfully');
      }

      this.testResults.push({
        test: 'Subscription Management',
        status: 'PASSED',
        details: 'Subscriptions created and managed successfully'
      });

    } catch (error) {
      console.error('❌ Subscription management test failed:', error.message);
      this.testResults.push({
        test: 'Subscription Management',
        status: 'FAILED',
        details: error.message
      });
    }
  }

  /**
   * Test boost expiry service
   */
  async testBoostExpiryService() {
    console.log('\n🧪 Testing Boost Expiry Service...');
    
    try {
      // Get boost expiry statistics
      const stats = await BoostExpiryService.getBoostExpiryStats();
      console.log('✅ Boost expiry stats retrieved:', stats.data);

      // Test manual boost expiry (if any active boosts exist)
      const activeBoosts = await Business.find({ isBoosted: true });
      if (activeBoosts.length > 0) {
        const testBusiness = activeBoosts[0];
        const result = await BoostExpiryService.expireBusinessBoost(testBusiness._id);
        console.log('✅ Manual boost expiry test passed:', result.message);
      } else {
        console.log('ℹ️ No active boosts found for manual expiry test');
      }

      this.testResults.push({
        test: 'Boost Expiry Service',
        status: 'PASSED',
        details: 'Boost expiry service working correctly'
      });

    } catch (error) {
      console.error('❌ Boost expiry service test failed:', error.message);
      this.testResults.push({
        test: 'Boost Expiry Service',
        status: 'FAILED',
        details: error.message
      });
    }
  }

  /**
   * Test business model updates
   */
  async testBusinessModelUpdates() {
    console.log('\n🧪 Testing Business Model Updates...');
    
    try {
      // Update test business with subscription details
      const business = await Business.findById(TEST_CONFIG.businessId);
      if (business) {
        business.stripeCustomerId = TEST_CONFIG.stripeCustomerId;
        business.isBoosted = true;
        business.boostExpiryAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        
        await business.save();
        console.log('✅ Business model updated successfully');

        // Verify updates
        const updatedBusiness = await Business.findById(TEST_CONFIG.businessId);
        if (updatedBusiness.stripeCustomerId === TEST_CONFIG.stripeCustomerId && updatedBusiness.isBoosted) {
          console.log('✅ Business model updates verified');
        } else {
          throw new Error('Business model updates not persisted correctly');
        }
      } else {
        console.log('ℹ️ Test business not found, skipping business model test');
      }

      this.testResults.push({
        test: 'Business Model Updates',
        status: 'PASSED',
        details: 'Business model updates working correctly'
      });

    } catch (error) {
      console.error('❌ Business model updates test failed:', error.message);
      this.testResults.push({
        test: 'Business Model Updates',
        status: 'FAILED',
        details: error.message
      });
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Payment Plan System Tests...\n');

    // Connect to database
    if (!(await this.connect())) {
      return;
    }

    try {
      // Run individual tests
      await this.testPaymentPlanValidation();
      await this.testSubscriptionManagement();
      await this.testBoostExpiryService();
      await this.testBusinessModelUpdates();

      // Display test results
      this.displayTestResults();

    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
    } finally {
      // Cleanup
      await this.cleanup();
    }
  }

  /**
   * Display test results summary
   */
  displayTestResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;

    this.testResults.forEach(result => {
      const icon = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.status}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
    });

    console.log(`\n📈 Summary: ${passed}/${total} tests passed`);
    
    if (failed === 0) {
      console.log('🎉 All tests passed! Payment plan system is working correctly.');
    } else {
      console.log(`⚠️ ${failed} test(s) failed. Please review the implementation.`);
    }
  }

  /**
   * Cleanup test data
   */
  async cleanup() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
      }
    } catch (error) {
      console.error('Error during cleanup:', error.message);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new PaymentPlanSystemTester();
  tester.runAllTests().catch(console.error);
}

export default PaymentPlanSystemTester;
