import mongoose from 'mongoose';
import BoostQueue from './src/models/business/boostQueue.js';
import Business from './src/models/business/business.js';
import Subscription from './src/models/admin/subscription.js';
import BoostQueueManager from './src/utils/boostQueueManager.js';

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database';

async function testBoostSystem() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test 1: Create a test boost queue
    console.log('\n=== Test 1: Creating Boost Queue ===');
    const testQueue = new BoostQueue({
      category: new mongoose.Types.ObjectId(),
      categoryName: 'Test Category',
      queue: [],
      currentlyActive: {
        business: null,
        boostStartTime: null,
        boostEndTime: null,
        subscription: null
      }
    });

    await testQueue.save();
    console.log('✅ Boost queue created successfully');

    // Test 2: Add businesses to queue
    console.log('\n=== Test 2: Adding Businesses to Queue ===');
    const business1 = new mongoose.Types.ObjectId();
    const business2 = new mongoose.Types.ObjectId();
    const business3 = new mongoose.Types.ObjectId();

    const queueData1 = {
      business: business1,
      businessName: 'Test Business 1',
      businessOwner: new mongoose.Types.ObjectId(),
      subscription: new mongoose.Types.ObjectId(),
      paymentIntentId: 'pi_test_1'
    };

    const queueData2 = {
      business: business2,
      businessName: 'Test Business 2',
      businessOwner: new mongoose.Types.ObjectId(),
      subscription: new mongoose.Types.ObjectId(),
      paymentIntentId: 'pi_test_2'
    };

    const queueData3 = {
      business: business3,
      businessName: 'Test Business 3',
      businessOwner: new mongoose.Types.ObjectId(),
      subscription: new mongoose.Types.ObjectId(),
      paymentIntentId: 'pi_test_3'
    };

    await testQueue.addToQueue(queueData1);
    await testQueue.addToQueue(queueData2);
    await testQueue.addToQueue(queueData3);

    console.log('✅ Added 3 businesses to queue');
    console.log('Queue length:', testQueue.queue.length);

    // Test 3: Check queue positions
    console.log('\n=== Test 3: Checking Queue Positions ===');
    const position1 = testQueue.getQueuePosition(business1);
    const position2 = testQueue.getQueuePosition(business2);
    const position3 = testQueue.getQueuePosition(business3);

    console.log(`Business 1 position: ${position1}`);
    console.log(`Business 2 position: ${position2}`);
    console.log(`Business 3 position: ${position3}`);

    // Test 4: Activate first business
    console.log('\n=== Test 4: Activating First Business ===');
    await testQueue.activateNext();
    
    console.log('✅ First business activated');
    console.log('Currently active business:', testQueue.currentlyActive.business);
    console.log('Active business start time:', testQueue.currentlyActive.boostStartTime);
    console.log('Active business end time:', testQueue.currentlyActive.boostEndTime);

    // Test 5: Check remaining queue positions
    console.log('\n=== Test 5: Checking Remaining Queue Positions ===');
    const newPosition2 = testQueue.getQueuePosition(business2);
    const newPosition3 = testQueue.getQueuePosition(business3);

    console.log(`Business 2 new position: ${newPosition2}`);
    console.log(`Business 3 new position: ${newPosition3}`);

    // Test 6: Test boost expiry
    console.log('\n=== Test 6: Testing Boost Expiry ===');
    console.log('Simulating boost expiry...');
    
    // Manually set the end time to past
    testQueue.currentlyActive.boostEndTime = new Date(Date.now() - 1000); // 1 second ago
    await testQueue.save();

    // Trigger expiry check
    await BoostQueueManager.checkAndExpireBoosts();

    // Reload the queue
    const updatedQueue = await BoostQueue.findById(testQueue._id);
    console.log('✅ Boost expiry processed');
    console.log('New active business:', updatedQueue.currentlyActive.business);
    console.log('Remaining in queue:', updatedQueue.queue.filter(item => item.status === 'pending').length);

    // Test 7: Test queue removal
    console.log('\n=== Test 7: Testing Queue Removal ===');
    const removed = await updatedQueue.removeFromQueue(business2);
    console.log(`Business 2 removed: ${removed}`);

    const finalPosition3 = updatedQueue.getQueuePosition(business3);
    console.log(`Business 3 final position: ${finalPosition3}`);

    // Test 8: Test utility functions
    console.log('\n=== Test 8: Testing Utility Functions ===');
    const isActive = updatedQueue.isBusinessActive(business1);
    const timeRemaining = updatedQueue.getCurrentBoostTimeRemaining();
    const estimatedStartTime = updatedQueue.getEstimatedStartTime(business3);

    console.log(`Business 1 is active: ${isActive}`);
    console.log(`Time remaining: ${timeRemaining}ms`);
    console.log(`Business 3 estimated start: ${estimatedStartTime}`);

    console.log('\n=== All Tests Completed Successfully! ===');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testBoostSystem();
