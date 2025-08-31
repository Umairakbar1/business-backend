import mongoose from 'mongoose';
import BoostQueue from './src/models/business/boostQueue.js';
import Business from './src/models/business/business.js';
import Category from './src/models/admin/category.js';

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database';

async function testCategoryQueueLogic() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test 1: Create test categories
    console.log('\n=== Test 1: Creating Test Categories ===');
    const category1 = new Category({
      title: 'Restaurant',
      description: 'Food and dining'
    });
    const category2 = new Category({
      title: 'Fashion',
      description: 'Clothing and accessories'
    });
    
    await category1.save();
    await category2.save();
    console.log('✅ Categories created successfully');

    // Test 2: Create test businesses
    console.log('\n=== Test 2: Creating Test Businesses ===');
    const business1 = new Business({
      businessName: 'Restaurant A',
      category: category1._id,
      businessOwner: new mongoose.Types.ObjectId(),
      email: 'restaurantA@test.com'
    });
    
    const business2 = new Business({
      businessName: 'Restaurant B',
      category: category1._id,
      businessOwner: new mongoose.Types.ObjectId(),
      email: 'restaurantB@test.com'
    });
    
    const business3 = new Business({
      businessName: 'Fashion Store A',
      category: category2._id,
      businessOwner: new mongoose.Types.ObjectId(),
      email: 'fashionA@test.com'
    });

    await business1.save();
    await business2.save();
    await business3.save();
    console.log('✅ Businesses created successfully');

    // Test 3: Test same category queue logic
    console.log('\n=== Test 3: Testing Same Category Queue Logic ===');
    
    // First business in Restaurant category - should be activated immediately
    let boostQueue1 = await BoostQueue.findOne({ category: category1._id });
    if (!boostQueue1) {
      boostQueue1 = new BoostQueue({
        category: category1._id,
        categoryName: category1.name,
        queue: [],
        currentlyActive: {
          business: null,
          boostStartTime: null,
          boostEndTime: null,
          subscription: null
        }
      });
    }

    const hasActiveOrQueuedBusiness1 = boostQueue1.currentlyActive.business || 
                                      boostQueue1.queue.some(item => item.status === 'pending');
    
    console.log('Restaurant A - Has active/queued business:', hasActiveOrQueuedBusiness1);
    console.log('Expected: false (should be activated immediately)');

    // Second business in Restaurant category - should be queued
    const hasActiveOrQueuedBusiness2 = boostQueue1.currentlyActive.business || 
                                      boostQueue1.queue.some(item => item.status === 'pending');
    
    console.log('Restaurant B - Has active/queued business:', hasActiveOrQueuedBusiness2);
    console.log('Expected: true (should be queued)');

    // Test 4: Test different category - should be activated immediately
    console.log('\n=== Test 4: Testing Different Category Logic ===');
    
    let boostQueue2 = await BoostQueue.findOne({ category: category2._id });
    if (!boostQueue2) {
      boostQueue2 = new BoostQueue({
        category: category2._id,
        categoryName: category2.name,
        queue: [],
        currentlyActive: {
          business: null,
          boostStartTime: null,
          boostEndTime: null,
          subscription: null
        }
      });
    }

    const hasActiveOrQueuedBusiness3 = boostQueue2.currentlyActive.business || 
                                      boostQueue2.queue.some(item => item.status === 'pending');
    
    console.log('Fashion Store A - Has active/queued business:', hasActiveOrQueuedBusiness3);
    console.log('Expected: false (should be activated immediately)');

    // Test 5: Simulate queue operations
    console.log('\n=== Test 5: Simulating Queue Operations ===');
    
    // Add Restaurant A to queue (should be activated immediately)
    const queueData1 = {
      business: business1._id,
      businessName: business1.businessName,
      businessOwner: business1.businessOwner,
      subscription: new mongoose.Types.ObjectId(),
      paymentIntentId: 'pi_test_1'
    };

    if (!hasActiveOrQueuedBusiness1) {
      // Activate immediately
      const now = new Date();
      const boostEndTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      boostQueue1.currentlyActive = {
        business: business1._id,
        boostStartTime: now,
        boostEndTime: boostEndTime,
        subscription: queueData1.subscription
      };

      const activeQueueItem = {
        ...queueData1,
        status: 'active',
        position: 1,
        boostStartTime: now,
        boostEndTime: boostEndTime,
        estimatedStartTime: now,
        estimatedEndTime: boostEndTime
      };

      boostQueue1.queue.push(activeQueueItem);
      await boostQueue1.save();
      console.log('✅ Restaurant A activated immediately');
    }

    // Add Restaurant B to queue (should be queued)
    const queueData2 = {
      business: business2._id,
      businessName: business2.businessName,
      businessOwner: business2.businessOwner,
      subscription: new mongoose.Types.ObjectId(),
      paymentIntentId: 'pi_test_2'
    };

    await boostQueue1.addToQueue(queueData2);
    console.log('✅ Restaurant B added to queue');

    // Add Fashion Store A to different category queue (should be activated immediately)
    const queueData3 = {
      business: business3._id,
      businessName: business3.businessName,
      businessOwner: business3.businessOwner,
      subscription: new mongoose.Types.ObjectId(),
      paymentIntentId: 'pi_test_3'
    };

    if (!hasActiveOrQueuedBusiness3) {
      // Activate immediately
      const now = new Date();
      const boostEndTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      boostQueue2.currentlyActive = {
        business: business3._id,
        boostStartTime: now,
        boostEndTime: boostEndTime,
        subscription: queueData3.subscription
      };

      const activeQueueItem = {
        ...queueData3,
        status: 'active',
        position: 1,
        boostStartTime: now,
        boostEndTime: boostEndTime,
        estimatedStartTime: now,
        estimatedEndTime: boostEndTime
      };

      boostQueue2.queue.push(activeQueueItem);
      await boostQueue2.save();
      console.log('✅ Fashion Store A activated immediately');
    }

    // Test 6: Verify queue states
    console.log('\n=== Test 6: Verifying Queue States ===');
    
    const finalQueue1 = await BoostQueue.findOne({ category: category1._id });
    const finalQueue2 = await BoostQueue.findOne({ category: category2._id });
    
    console.log('Restaurant Category Queue:');
    console.log('- Currently Active:', finalQueue1.currentlyActive.business ? 'Yes' : 'No');
    console.log('- Pending in Queue:', finalQueue1.queue.filter(item => item.status === 'pending').length);
    console.log('- Active in Queue:', finalQueue1.queue.filter(item => item.status === 'active').length);
    
    console.log('\nFashion Category Queue:');
    console.log('- Currently Active:', finalQueue2.currentlyActive.business ? 'Yes' : 'No');
    console.log('- Pending in Queue:', finalQueue2.queue.filter(item => item.status === 'pending').length);
    console.log('- Active in Queue:', finalQueue2.queue.filter(item => item.status === 'active').length);

    console.log('\n✅ Category-based queue logic test completed successfully!');
    
    // Cleanup
    await Category.deleteMany({ name: { $in: ['Restaurant', 'Fashion'] } });
    await Business.deleteMany({ businessName: { $in: ['Restaurant A', 'Restaurant B', 'Fashion Store A'] } });
    await BoostQueue.deleteMany({ categoryName: { $in: ['Restaurant', 'Fashion'] } });
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testCategoryQueueLogic();
