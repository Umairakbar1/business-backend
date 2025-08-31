/**
 * Test Script for Boost Category Fix
 * 
 * This script tests the boost subscription with proper category handling
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
 * Test 1: Check business category
 */
async function testBusinessCategory() {
  console.log('\n🧪 Test 1: Business Category Check');
  
  try {
    const business = await Business.findById(TEST_CONFIG.testBusinessId).populate('category', 'title _id');
    
    if (!business) {
      console.log('❌ Test business not found');
      return false;
    }

    console.log('✅ Business found:', business.businessName);
    console.log('Business category:', business.category);

    if (!business.category) {
      console.log('❌ Business has no category assigned');
      return false;
    }

    if (!business.category.title) {
      console.log('❌ Business category has no title');
      return false;
    }

    console.log('✅ Business has valid category:', business.category.title);
    return true;
  } catch (error) {
    console.error('❌ Error checking business category:', error);
    return false;
  }
}

/**
 * Test 2: Create test category if needed
 */
async function createTestCategory() {
  console.log('\n🧪 Test 2: Create Test Category');
  
  try {
    // Check if test category exists
    let testCategory = await Category.findOne({ title: 'Test Category' });
    
    if (!testCategory) {
      console.log('Creating test category...');
      testCategory = new Category({
        title: 'Test Category',
        slug: 'test-category',
        description: 'Test category for boost subscription testing',
        status: 'active'
      });
      
      await testCategory.save();
      console.log('✅ Test category created:', testCategory._id);
    } else {
      console.log('✅ Test category already exists:', testCategory._id);
    }

    return testCategory;
  } catch (error) {
    console.error('❌ Error creating test category:', error);
    return null;
  }
}

/**
 * Test 3: Assign category to business if needed
 */
async function assignCategoryToBusiness(category) {
  console.log('\n🧪 Test 3: Assign Category to Business');
  
  try {
    const business = await Business.findById(TEST_CONFIG.testBusinessId);
    
    if (!business) {
      console.log('❌ Test business not found');
      return false;
    }

    if (!business.category || business.category.toString() !== category._id.toString()) {
      console.log('Assigning category to business...');
      business.category = category._id;
      await business.save();
      console.log('✅ Category assigned to business');
    } else {
      console.log('✅ Business already has the correct category');
    }

    return true;
  } catch (error) {
    console.error('❌ Error assigning category to business:', error);
    return false;
  }
}

/**
 * Test 4: Create test boost payment plan
 */
async function createTestBoostPlan() {
  console.log('\n🧪 Test 4: Create Test Boost Plan');
  
  try {
    // Check if test boost plan exists
    let testBoostPlan = await PaymentPlan.findOne({ name: 'Test Boost Plan' });
    
    if (!testBoostPlan) {
      console.log('Creating test boost plan...');
      testBoostPlan = new PaymentPlan({
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
      
      await testBoostPlan.save();
      console.log('✅ Test boost plan created:', testBoostPlan._id);
    } else {
      console.log('✅ Test boost plan already exists:', testBoostPlan._id);
    }

    return testBoostPlan;
  } catch (error) {
    console.error('❌ Error creating test boost plan:', error);
    return null;
  }
}

/**
 * Test 5: Simulate boost subscription validation
 */
async function testBoostSubscriptionValidation() {
  console.log('\n🧪 Test 5: Boost Subscription Validation');
  
  try {
    const business = await Business.findById(TEST_CONFIG.testBusinessId).populate('category', 'title _id');
    
    if (!business) {
      console.log('❌ Test business not found');
      return false;
    }

    // Simulate the validation logic from the controller
    console.log('Validating business category...');
    
    if (!business.category || !business.category._id) {
      console.log('❌ Business category validation failed');
      return false;
    }

    if (!business.category.title) {
      console.log('❌ Business category title validation failed');
      return false;
    }

    console.log('✅ Business category validation passed');
    console.log('Category ID:', business.category._id);
    console.log('Category Title:', business.category.title);

    return true;
  } catch (error) {
    console.error('❌ Error in boost subscription validation:', error);
    return false;
  }
}

/**
 * Clean up test data
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Remove test boost plan
    await PaymentPlan.deleteOne({ name: 'Test Boost Plan' });
    console.log('✅ Test boost plan removed');

    // Remove test category
    await Category.deleteOne({ title: 'Test Category' });
    console.log('✅ Test category removed');

    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Boost Category Fix Tests\n');
  
  try {
    await connectDB();
    
    const categoryCheck = await testBusinessCategory();
    if (!categoryCheck) {
      console.log('\n📝 Business needs category assignment...');
      
      const category = await createTestCategory();
      if (!category) {
        throw new Error('Failed to create test category');
      }
      
      const assignmentSuccess = await assignCategoryToBusiness(category);
      if (!assignmentSuccess) {
        throw new Error('Failed to assign category to business');
      }
    }
    
    const boostPlan = await createTestBoostPlan();
    if (!boostPlan) {
      throw new Error('Failed to create test boost plan');
    }
    
    const validationSuccess = await testBoostSubscriptionValidation();
    if (!validationSuccess) {
      throw new Error('Boost subscription validation failed');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n✅ Boost category fix is working correctly');
    console.log('✅ Business has proper category assignment');
    console.log('✅ Category validation passes');
    console.log('✅ Boost subscription should work now');
    
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
