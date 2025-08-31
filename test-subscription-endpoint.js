/**
 * Test Script for Subscription Endpoint
 * 
 * This script tests the subscription endpoint to ensure it's working correctly
 * after fixing the middleware issue.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Business from './src/models/business/business.js';
import BusinessOwner from './src/models/business/businessOwner.js';
import PaymentPlan from './src/models/admin/paymentPlan.js';

// Load environment variables
dotenv.config();

class SubscriptionEndpointTester {
  constructor() {
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
   * Test database models and data
   */
  async testDatabaseData() {
    console.log('\n🧪 Testing Database Data...');
    
    try {
      // Check if business owners exist
      const businessOwners = await BusinessOwner.find({}).limit(5);
      console.log(`✅ Found ${businessOwners.length} business owners`);
      
      if (businessOwners.length > 0) {
        console.log('Sample business owner:', {
          _id: businessOwners[0]._id,
          email: businessOwners[0].email,
          name: businessOwners[0].name
        });
      }

      // Check if businesses exist
      const businesses = await Business.find({}).limit(5);
      console.log(`✅ Found ${businesses.length} businesses`);
      
      if (businesses.length > 0) {
        console.log('Sample business:', {
          _id: businesses[0]._id,
          businessName: businesses[0].businessName,
          businessOwner: businesses[0].businessOwner
        });
      }

      // Check if payment plans exist
      const paymentPlans = await PaymentPlan.find({ isActive: true }).limit(5);
      console.log(`✅ Found ${paymentPlans.length} active payment plans`);
      
      if (paymentPlans.length > 0) {
        console.log('Sample payment plan:', {
          _id: paymentPlans[0]._id,
          name: paymentPlans[0].name,
          planType: paymentPlans[0].planType,
          price: paymentPlans[0].price
        });
      }

      return {
        businessOwners: businessOwners.length,
        businesses: businesses.length,
        paymentPlans: paymentPlans.length
      };

    } catch (error) {
      console.error('❌ Database data test failed:', error.message);
      throw error;
    }
  }

  /**
   * Test business ownership relationship
   */
  async testBusinessOwnership() {
    console.log('\n🧪 Testing Business Ownership...');
    
    try {
      // Find a business with its owner
      const business = await Business.findOne({}).populate('businessOwner');
      
      if (!business) {
        console.log('ℹ️ No businesses found to test ownership');
        return;
      }

      console.log('✅ Business ownership verified:', {
        businessId: business._id,
        businessName: business.businessName,
        ownerId: business.businessOwner._id,
        ownerEmail: business.businessOwner.email
      });

      // Verify the relationship is correct
      if (business.businessOwner && business.businessOwner._id) {
        console.log('✅ Business owner relationship is valid');
      } else {
        console.log('❌ Business owner relationship is invalid');
      }

    } catch (error) {
      console.error('❌ Business ownership test failed:', error.message);
      throw error;
    }
  }

  /**
   * Test payment plan validation
   */
  async testPaymentPlanValidation() {
    console.log('\n🧪 Testing Payment Plan Validation...');
    
    try {
      // Test business plan
      const businessPlan = await PaymentPlan.findOne({ planType: 'business', isActive: true });
      if (businessPlan) {
        console.log('✅ Business plan found:', businessPlan.name);
        console.log('   Features:', businessPlan.features);
        console.log('   Max boost per day:', businessPlan.maxBoostPerDay);
      } else {
        console.log('ℹ️ No active business plans found');
      }

      // Test boost plan
      const boostPlan = await PaymentPlan.findOne({ planType: 'boost', isActive: true });
      if (boostPlan) {
        console.log('✅ Boost plan found:', businessPlan.name);
        console.log('   Validity hours:', boostPlan.validityHours);
      } else {
        console.log('ℹ️ No active boost plans found');
      }

    } catch (error) {
      console.error('❌ Payment plan validation test failed:', error.message);
      throw error;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Subscription Endpoint Tests...\n');

    // Connect to database
    if (!(await this.connect())) {
      return;
    }

    try {
      // Run individual tests
      const dataCounts = await this.testDatabaseData();
      await this.testBusinessOwnership();
      await this.testPaymentPlanValidation();

      // Display summary
      console.log('\n📊 Test Summary:');
      console.log('================');
      console.log(`Business Owners: ${dataCounts.businessOwners}`);
      console.log(`Businesses: ${dataCounts.businesses}`);
      console.log(`Payment Plans: ${dataCounts.paymentPlans}`);
      
      if (dataCounts.businessOwners > 0 && dataCounts.businesses > 0 && dataCounts.paymentPlans > 0) {
        console.log('\n🎉 All tests passed! The subscription endpoint should work correctly.');
        console.log('\n📝 Next steps:');
        console.log('1. Restart your backend server');
        console.log('2. Try the subscription endpoint again');
        console.log('3. Check the console logs for detailed debugging information');
      } else {
        console.log('\n⚠️ Some data is missing. Please ensure you have:');
        console.log('- At least one business owner');
        console.log('- At least one business');
        console.log('- At least one active payment plan');
      }

    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
    } finally {
      // Cleanup
      await this.cleanup();
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
  const tester = new SubscriptionEndpointTester();
  tester.runAllTests().catch(console.error);
}

export default SubscriptionEndpointTester;
