import admin from '../config/firebase.js';
import Notification from '../models/admin/notification.js';
import Business from '../models/business/business.js';
import Admin from '../models/admin/admin.js';

class NotificationService {
  constructor() {
    this.messaging = admin ? admin.messaging() : null;
  }

  /**
   * Send notification to a single user
   */
  async sendToUser(recipientId, recipientType, notificationData) {
    try {
      if (!this.messaging) {
        console.warn('Firebase not initialized, skipping notification');
        return { success: false, error: 'Firebase not initialized' };
      }

      // Get recipient's FCM token
      const fcmToken = await this.getFCMToken(recipientId, recipientType);
      if (!fcmToken) {
        console.warn(`No FCM token found for ${recipientType} ${recipientId}`);
        return { success: false, error: 'No FCM token found' };
      }

      // Create notification message
      const message = {
        token: fcmToken,
        notification: {
          title: notificationData.title,
          body: notificationData.body,
          image: notificationData.image || null
        },
        data: {
          type: notificationData.type,
          category: notificationData.category,
          actionUrl: notificationData.actionUrl || '',
          ...notificationData.data
        },
        android: {
          priority: notificationData.priority || 'normal',
          notification: {
            channelId: 'default',
            priority: notificationData.priority || 'normal',
            defaultSound: true,
            defaultVibrateTimings: true
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        },
        webpush: {
          notification: {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true
          }
        }
      };

      // Send the message
      const response = await this.messaging.send(message);

      // Save notification to database
      const notification = new Notification({
        recipient: recipientId,
        recipientType: recipientType,
        recipientModel: recipientType === 'business' ? 'Business' : 'Admin',
        title: notificationData.title,
        body: notificationData.body,
        image: notificationData.image,
        type: notificationData.type,
        category: notificationData.category,
        actionUrl: notificationData.actionUrl,
        actionData: notificationData.data || {},
        priority: notificationData.priority || 'normal',
        fcmToken: fcmToken,
        fcmMessageId: response,
        status: 'sent',
        metadata: notificationData.metadata || {}
      });

      await notification.save();

      console.log(`✅ Notification sent to ${recipientType} ${recipientId}: ${response}`);
      return { success: true, messageId: response, notificationId: notification._id };

    } catch (error) {
      console.error(`❌ Failed to send notification to ${recipientType} ${recipientId}:`, error.message);
      
      // Save failed notification
      try {
        const notification = new Notification({
          recipient: recipientId,
          recipientType: recipientType,
          recipientModel: recipientType === 'business' ? 'Business' : 'Admin',
          title: notificationData.title,
          body: notificationData.body,
          image: notificationData.image,
          type: notificationData.type,
          category: notificationData.category,
          actionUrl: notificationData.actionUrl,
          actionData: notificationData.data || {},
          priority: notificationData.priority || 'normal',
          status: 'failed',
          metadata: {
            ...notificationData.metadata,
            error: error.message
          }
        });
        await notification.save();
      } catch (saveError) {
        console.error('Failed to save failed notification:', saveError.message);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToMultipleUsers(recipients, notificationData) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await this.sendToUser(
        recipient.recipientId, 
        recipient.recipientType, 
        notificationData
      );
      results.push({ ...recipient, result });
    }

    return results;
  }

  /**
   * Send notification to all users of a specific type
   */
  async sendToAllUsers(recipientType, notificationData) {
    try {
      const Model = recipientType === 'business' ? Business : Admin;
      const users = await Model.find({ fcmToken: { $exists: true, $ne: null } });
      
      const recipients = users.map(user => ({
        recipientId: user._id,
        recipientType: recipientType
      }));

      return await this.sendToMultipleUsers(recipients, notificationData);
    } catch (error) {
      console.error(`❌ Failed to send to all ${recipientType} users:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to topic subscribers
   */
  async sendToTopic(topic, notificationData) {
    try {
      if (!this.messaging) {
        console.warn('Firebase not initialized, skipping topic notification');
        return { success: false, error: 'Firebase not initialized' };
      }

      const message = {
        topic: topic,
        notification: {
          title: notificationData.title,
          body: notificationData.body,
          image: notificationData.image || null
        },
        data: {
          type: notificationData.type,
          category: notificationData.category,
          actionUrl: notificationData.actionUrl || '',
          ...notificationData.data
        },
        android: {
          priority: notificationData.priority || 'normal',
          notification: {
            channelId: 'default',
            priority: notificationData.priority || 'normal'
          }
        }
      };

      const response = await this.messaging.send(message);
      console.log(`✅ Topic notification sent to ${topic}: ${response}`);
      return { success: true, messageId: response };

    } catch (error) {
      console.error(`❌ Failed to send topic notification to ${topic}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe user to a topic
   */
  async subscribeToTopic(fcmToken, topic) {
    try {
      if (!this.messaging) {
        console.warn('Firebase not initialized, skipping topic subscription');
        return { success: false, error: 'Firebase not initialized' };
      }

      const response = await this.messaging.subscribeToTopic([fcmToken], topic);
      console.log(`✅ Subscribed to topic ${topic}: ${response.successCount}/${response.failureCount}`);
      return { success: true, response };

    } catch (error) {
      console.error(`❌ Failed to subscribe to topic ${topic}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unsubscribe user from a topic
   */
  async unsubscribeFromTopic(fcmToken, topic) {
    try {
      if (!this.messaging) {
        console.warn('Firebase not initialized, skipping topic unsubscription');
        return { success: false, error: 'Firebase not initialized' };
      }

      const response = await this.messaging.unsubscribeFromTopic([fcmToken], topic);
      console.log(`✅ Unsubscribed from topic ${topic}: ${response.successCount}/${response.failureCount}`);
      return { success: true, response };

    } catch (error) {
      console.error(`❌ Failed to unsubscribe from topic ${topic}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get FCM token for a user
   */
  async getFCMToken(recipientId, recipientType) {
    try {
      const Model = recipientType === 'business' ? Business : Admin;
      const user = await Model.findById(recipientId);
      return user?.fcmToken || null;
    } catch (error) {
      console.error(`❌ Failed to get FCM token for ${recipientType} ${recipientId}:`, error.message);
      return null;
    }
  }

  /**
   * Update FCM token for a user
   */
  async updateFCMToken(recipientId, recipientType, fcmToken) {
    try {
      const Model = recipientType === 'business' ? Business : Admin;
      await Model.findByIdAndUpdate(recipientId, { fcmToken });
      console.log(`✅ FCM token updated for ${recipientType} ${recipientId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to update FCM token for ${recipientType} ${recipientId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove FCM token for a user
   */
  async removeFCMToken(recipientId, recipientType) {
    try {
      const Model = recipientType === 'business' ? Business : Admin;
      await Model.findByIdAndUpdate(recipientId, { $unset: { fcmToken: 1 } });
      console.log(`✅ FCM token removed for ${recipientType} ${recipientId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to remove FCM token for ${recipientType} ${recipientId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(recipientId, recipientType, options = {}) {
    try {
      const { page = 1, limit = 20, status, type, category } = options;
      const skip = (page - 1) * limit;

      const query = { recipient: recipientId, recipientType: recipientType };
      if (status) query.status = status;
      if (type) query.type = type;
      if (category) query.category = category;

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Notification.countDocuments(query);

      return {
        success: true,
        data: {
          notifications,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      console.error(`❌ Failed to get notifications for ${recipientType} ${recipientId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, recipientId, recipientType) {
    try {
      const notification = await Notification.findOneAndUpdate(
        {
          _id: notificationId,
          recipient: recipientId,
          recipientType: recipientType
        },
        {
          status: 'read',
          readAt: new Date()
        },
        { new: true }
      );

      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      return { success: true, notification };
    } catch (error) {
      console.error(`❌ Failed to mark notification as read:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(recipientId, recipientType) {
    try {
      const result = await Notification.markAllAsRead(recipientId, recipientType);
      return { success: true, result };
    } catch (error) {
      console.error(`❌ Failed to mark all notifications as read:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, recipientId, recipientType) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: recipientId,
        recipientType: recipientType
      });

      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to delete notification:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(recipientId, recipientType) {
    try {
      const stats = await Notification.aggregate([
        { $match: { recipient: recipientId, recipientType: recipientType } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const total = await Notification.countDocuments({ recipient: recipientId, recipientType: recipientType });
      const unread = await Notification.countDocuments({ 
        recipient: recipientId, 
        recipientType: recipientType, 
        status: { $in: ['sent', 'delivered'] } 
      });

      return {
        success: true,
        data: {
          total,
          unread,
          byStatus: stats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {})
        }
      };
    } catch (error) {
      console.error(`❌ Failed to get notification stats:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

export default new NotificationService();
