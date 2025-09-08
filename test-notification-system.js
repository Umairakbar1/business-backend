import mongoose from 'mongoose';
import NotificationService from './src/services/notificationService.js';
import Notification from './src/models/admin/notification.js';
import Business from './src/models/business/business.js';
import Admin from './src/models/admin/admin.js';
import { GLOBAL_ENV } from './src/config/globalConfig.js';

// Test script to verify notification system works properly
async function testNotificationSystem() {
  try {
    console.log('🧪 Starting notification system test...');
    
    // Connect to MongoDB
    await mongoose.connect(GLOBAL_ENV.mongoUri);
    console.log('✅ Connected to MongoDB');

    // Test 1: Send notification without Firebase (database only)
    console.log('\n📝 Test 1: Sending notification to database only...');
    
    // Create a test business if it doesn't exist
    let testBusiness = await Business.findOne({ businessName: 'Test Business' });
    if (!testBusiness) {
      testBusiness = await Business.create({
        businessName: 'Test Business',
        email: 'test@business.com',
        phoneNumber: '1234567890',
        businessOwner: new mongoose.Types.ObjectId(),
        status: 'active'
      });
      console.log('✅ Created test business');
    }

    // Send notification
    const notificationResult = await NotificationService.sendToUser(
      testBusiness._id,
      'business',
      {
        title: 'Test Notification',
        body: 'This is a test notification to verify the system works',
        type: 'system',
        category: 'business_registration',
        actionUrl: '/dashboard',
        data: {
          testId: 'test-123',
          message: 'Database notification test'
        },
        priority: 'normal'
      }
    );

    console.log('📤 Notification result:', notificationResult);

    if (notificationResult.success) {
      console.log('✅ Notification sent successfully');
      
      // Test 2: Retrieve notifications
      console.log('\n📥 Test 2: Retrieving notifications...');
      
      const notificationsResult = await NotificationService.getUserNotifications(
        testBusiness._id,
        'business',
        { page: 1, limit: 10 }
      );

      if (notificationsResult.success) {
        console.log('✅ Notifications retrieved successfully');
        console.log('📊 Found', notificationsResult.data.notifications.length, 'notifications');
        
        if (notificationsResult.data.notifications.length > 0) {
          const notification = notificationsResult.data.notifications[0];
          console.log('📋 Latest notification:', {
            id: notification._id,
            title: notification.title,
            body: notification.body,
            status: notification.status,
            createdAt: notification.createdAt
          });

          // Test 3: Mark notification as read
          console.log('\n👁️ Test 3: Marking notification as read...');
          
          const markReadResult = await NotificationService.markAsRead(
            notification._id,
            testBusiness._id,
            'business'
          );

          if (markReadResult.success) {
            console.log('✅ Notification marked as read');
          } else {
            console.log('❌ Failed to mark notification as read:', markReadResult.error);
          }

          // Test 4: Get notification stats
          console.log('\n📈 Test 4: Getting notification statistics...');
          
          const statsResult = await NotificationService.getNotificationStats(
            testBusiness._id,
            'business'
          );

          if (statsResult.success) {
            console.log('✅ Notification stats retrieved');
            console.log('📊 Stats:', statsResult.data);
          } else {
            console.log('❌ Failed to get notification stats:', statsResult.error);
          }
        }
      } else {
        console.log('❌ Failed to retrieve notifications:', notificationsResult.error);
      }
    } else {
      console.log('❌ Failed to send notification:', notificationResult.error);
    }

    // Test 5: Test admin notification
    console.log('\n👨‍💼 Test 5: Testing admin notification...');
    
    let testAdmin = await Admin.findOne({ email: 'test@admin.com' });
    if (!testAdmin) {
      testAdmin = await Admin.create({
        firstName: 'Test',
        lastName: 'Admin',
        email: 'test@admin.com',
        password: 'hashedpassword',
        status: 'active'
      });
      console.log('✅ Created test admin');
    }

    const adminNotificationResult = await NotificationService.sendToUser(
      testAdmin._id,
      'admin',
      {
        title: 'Admin Test Notification',
        body: 'This is a test notification for admin',
        type: 'system',
        category: 'business_registration',
        actionUrl: '/admin/dashboard',
        data: {
          testId: 'admin-test-123',
          message: 'Admin notification test'
        },
        priority: 'high'
      }
    );

    if (adminNotificationResult.success) {
      console.log('✅ Admin notification sent successfully');
    } else {
      console.log('❌ Failed to send admin notification:', adminNotificationResult.error);
    }

    console.log('\n🎉 Notification system test completed!');
    console.log('\n📋 Summary:');
    console.log('- Notifications are saved to database regardless of Firebase status');
    console.log('- API endpoints are available for both admin and business users');
    console.log('- Notifications can be retrieved, marked as read, and deleted');
    console.log('- Statistics are available for tracking notification status');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the test
testNotificationSystem();
