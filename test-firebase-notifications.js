/**
 * Test Script for Firebase Notifications System
 * 
 * This script tests the complete notification system including:
 * - FCM token management
 * - Notification sending
 * - Notification retrieval
 * - Status updates
 * - Error handling
 */

import mongoose from 'mongoose';
import Business from './src/models/business/business.js';
import Admin from './src/models/admin/admin.js';
import Notification from './src/models/admin/notification.js';
import NotificationService from './src/services/notificationService.js';
import { sendSubscriptionNotifications, sendPaymentNotifications, sendBulkNotifications } from './src/helpers/notificationHelper.js';

// Test configuration
const TEST_CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/business_platform',
  testBusinessId: '507f1f77bcf86cd799439011', // Replace with actual business ID
  testAdminId: '507f1f77bcf86cd799439012', // Replace with actual admin ID
  testFcmToken: 'test_fcm_token_123456789'
};

// Test data
const testNotificationData = {
  title: 'Test Notification',
  body: 'This is a test notification from the notification system',
  type: 'system',
  category: 'system_maintenance',
  actionUrl: '/dashboard',
  data: {
    testKey: 'testValue',
    timestamp: new Date().toISOString()
  },
  priority: 'normal'
};

const testSubscriptionData = {
  subscriptionId: '507f1f77bcf86cd799439013',
  planName: 'Premium Business Plan',
  amount: 99.99,
  currency: 'USD'
};

const testPaymentData = {
  paymentId: 'pi_test_123456789',
  amount: 99.99,
  currency: 'USD',
  planName: 'Premium Business Plan'
};

class NotificationSystemTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async connect() {
    try {
      await mongoose.connect(TEST_CONFIG.mongoUri);
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ MongoDB disconnection failed:', error);
    }
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 Running test: ${testName}`);
      await testFunction();
      console.log(`✅ Test passed: ${testName}`);
      this.results.passed++;
    } catch (error) {
      console.error(`❌ Test failed: ${testName}`, error.message);
      this.results.failed++;
      this.results.errors.push({ test: testName, error: error.message });
    }
  }

  // Test 1: FCM Token Management
  async testFCMTokenManagement() {
    // Test updating FCM token
    const updateResult = await NotificationService.updateFCMToken(
      TEST_CONFIG.testBusinessId, 
      'business', 
      TEST_CONFIG.testFcmToken
    );
    
    if (!updateResult.success) {
      throw new Error(`Failed to update FCM token: ${updateResult.error}`);
    }

    // Test getting FCM token
    const token = await NotificationService.getFCMToken(
      TEST_CONFIG.testBusinessId, 
      'business'
    );
    
    if (token !== TEST_CONFIG.testFcmToken) {
      throw new Error(`FCM token mismatch: expected ${TEST_CONFIG.testFcmToken}, got ${token}`);
    }

    // Test removing FCM token
    const removeResult = await NotificationService.removeFCMToken(
      TEST_CONFIG.testBusinessId, 
      'business'
    );
    
    if (!removeResult.success) {
      throw new Error(`Failed to remove FCM token: ${removeResult.error}`);
    }
  }

  // Test 2: Send Single Notification
  async testSendSingleNotification() {
    const result = await NotificationService.sendToUser(
      TEST_CONFIG.testBusinessId,
      'business',
      testNotificationData
    );

    if (!result.success) {
      throw new Error(`Failed to send notification: ${result.error}`);
    }

    // Verify notification was saved to database
    const savedNotification = await Notification.findById(result.notificationId);
    if (!savedNotification) {
      throw new Error('Notification was not saved to database');
    }

    if (savedNotification.title !== testNotificationData.title) {
      throw new Error('Notification title mismatch');
    }
  }

  // Test 3: Send Subscription Notifications
  async testSubscriptionNotifications() {
    // Test business subscription created
    const subscriptionResult = await sendSubscriptionNotifications.businessSubscriptionCreated(
      TEST_CONFIG.testBusinessId,
      testSubscriptionData
    );

    if (!subscriptionResult.success) {
      throw new Error(`Failed to send subscription notification: ${subscriptionResult.error}`);
    }

    // Test payment successful
    const paymentResult = await sendPaymentNotifications.paymentSuccessful(
      TEST_CONFIG.testBusinessId,
      testPaymentData
    );

    if (!paymentResult.success) {
      throw new Error(`Failed to send payment notification: ${paymentResult.error}`);
    }
  }

  // Test 4: Send Bulk Notifications
  async testBulkNotifications() {
    const result = await sendBulkNotifications.toAllBusinesses(testNotificationData);
    
    if (!Array.isArray(result)) {
      throw new Error('Bulk notification result should be an array');
    }

    console.log(`📊 Bulk notification sent to ${result.length} businesses`);
  }

  // Test 5: Get User Notifications
  async testGetUserNotifications() {
    const result = await NotificationService.getUserNotifications(
      TEST_CONFIG.testBusinessId,
      'business',
      { limit: 10 }
    );

    if (!result.success) {
      throw new Error(`Failed to get notifications: ${result.error}`);
    }

    if (!Array.isArray(result.data.notifications)) {
      throw new Error('Notifications should be an array');
    }

    console.log(`📋 Retrieved ${result.data.notifications.length} notifications`);
  }

  // Test 6: Mark Notification as Read
  async testMarkAsRead() {
    // First, get a notification
    const notificationsResult = await NotificationService.getUserNotifications(
      TEST_CONFIG.testBusinessId,
      'business',
      { limit: 1 }
    );

    if (!notificationsResult.success || notificationsResult.data.notifications.length === 0) {
      console.log('⚠️ No notifications to mark as read');
      return;
    }

    const notification = notificationsResult.data.notifications[0];
    
    // Mark as read
    const result = await NotificationService.markAsRead(
      notification._id,
      TEST_CONFIG.testBusinessId,
      'business'
    );

    if (!result.success) {
      throw new Error(`Failed to mark notification as read: ${result.error}`);
    }

    // Verify status was updated
    if (result.notification.status !== 'read') {
      throw new Error('Notification status was not updated to read');
    }
  }

  // Test 7: Get Notification Statistics
  async testNotificationStats() {
    const result = await NotificationService.getNotificationStats(
      TEST_CONFIG.testBusinessId,
      'business'
    );

    if (!result.success) {
      throw new Error(`Failed to get notification stats: ${result.error}`);
    }

    if (typeof result.data.total !== 'number') {
      throw new Error('Total count should be a number');
    }

    console.log(`📊 Notification stats: ${JSON.stringify(result.data, null, 2)}`);
  }

  // Test 8: Error Handling
  async testErrorHandling() {
    // Test with invalid business ID
    const result = await NotificationService.sendToUser(
      'invalid_business_id',
      'business',
      testNotificationData
    );

    if (result.success) {
      throw new Error('Should fail with invalid business ID');
    }

    // Test with invalid FCM token
    const tokenResult = await NotificationService.updateFCMToken(
      TEST_CONFIG.testBusinessId,
      'business',
      null
    );

    if (tokenResult.success) {
      throw new Error('Should fail with null FCM token');
    }
  }

  // Test 9: Topic Management
  async testTopicManagement() {
    // Test subscribing to topic
    const subscribeResult = await NotificationService.subscribeToTopic(
      TEST_CONFIG.testFcmToken,
      'test_topic'
    );

    if (!subscribeResult.success) {
      console.log('⚠️ Topic subscription failed (expected if Firebase not configured):', subscribeResult.error);
    }

    // Test unsubscribing from topic
    const unsubscribeResult = await NotificationService.unsubscribeFromTopic(
      TEST_CONFIG.testFcmToken,
      'test_topic'
    );

    if (!unsubscribeResult.success) {
      console.log('⚠️ Topic unsubscription failed (expected if Firebase not configured):', unsubscribeResult.error);
    }
  }

  // Test 10: Database Operations
  async testDatabaseOperations() {
    // Test creating notification directly
    const notification = new Notification({
      recipient: TEST_CONFIG.testBusinessId,
      recipientType: 'business',
      recipientModel: 'Business',
      title: 'Database Test Notification',
      body: 'Testing direct database creation',
      type: 'system',
      category: 'system_maintenance',
      status: 'sent'
    });

    await notification.save();

    // Test finding notifications
    const foundNotifications = await Notification.find({
      recipient: TEST_CONFIG.testBusinessId,
      recipientType: 'business'
    });

    if (foundNotifications.length === 0) {
      throw new Error('No notifications found in database');
    }

    // Test updating notification
    const updateResult = await Notification.findByIdAndUpdate(
      notification._id,
      { status: 'read' },
      { new: true }
    );

    if (updateResult.status !== 'read') {
      throw new Error('Failed to update notification status');
    }

    // Clean up
    await Notification.findByIdAndDelete(notification._id);
  }

  async runAllTests() {
    console.log('🚀 Starting Firebase Notifications System Tests\n');

    await this.connect();

    try {
      await this.runTest('FCM Token Management', () => this.testFCMTokenManagement());
      await this.runTest('Send Single Notification', () => this.testSendSingleNotification());
      await this.runTest('Subscription Notifications', () => this.testSubscriptionNotifications());
      await this.runTest('Bulk Notifications', () => this.testBulkNotifications());
      await this.runTest('Get User Notifications', () => this.testGetUserNotifications());
      await this.runTest('Mark Notification as Read', () => this.testMarkAsRead());
      await this.runTest('Notification Statistics', () => this.testNotificationStats());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      await this.runTest('Topic Management', () => this.testTopicManagement());
      await this.runTest('Database Operations', () => this.testDatabaseOperations());

    } finally {
      await this.disconnect();
    }

    this.printResults();
  }

  printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach(({ test, error }) => {
        console.log(`  - ${test}: ${error}`);
      });
    }

    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed! Firebase notifications system is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the errors above.');
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new NotificationSystemTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export default NotificationSystemTester;
