import NotificationService from '../../services/notificationService.js';
import Admin from '../../models/admin/admin.js';
import Business from '../../models/business/business.js';

/**
 * Admin Notification Controller
 * Handles FCM token management, notification retrieval, and sending notifications to users
 */

// Update FCM token for admin
export const updateFCMToken = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { fcmToken } = req.body;

    // Validate required fields
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required',
        code: 'MISSING_FCM_TOKEN'
      });
    }

    // Verify admin exists and user has access
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Update FCM token
    const result = await NotificationService.updateFCMToken(adminId, 'admin', fcmToken);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update FCM token',
        code: 'FCM_TOKEN_UPDATE_FAILED'
      });
    }

    res.status(200).json({
      success: true,
      message: 'FCM token updated successfully',
      data: {
        adminId,
        fcmToken
      }
    });

  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Remove FCM token for admin
export const removeFCMToken = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Verify admin exists and user has access
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Remove FCM token
    const result = await NotificationService.removeFCMToken(adminId, 'admin');
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to remove FCM token',
        code: 'FCM_TOKEN_REMOVE_FAILED'
      });
    }

    res.status(200).json({
      success: true,
      message: 'FCM token removed successfully',
      data: {
        adminId
      }
    });

  } catch (error) {
    console.error('Error removing FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Get admin notifications
export const getNotifications = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { page = 1, limit = 20, status, type, category } = req.query;

    // Verify admin exists and user has access
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Get notifications
    const result = await NotificationService.getUserNotifications(adminId, 'admin', {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      type,
      category
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get notifications',
        code: 'NOTIFICATIONS_FETCH_FAILED'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { adminId, notificationId } = req.params;

    // Verify admin exists and user has access
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Mark notification as read
    const result = await NotificationService.markAsRead(notificationId, adminId, 'admin');
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to mark notification as read',
        code: 'MARK_AS_READ_FAILED'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: {
        notification: result.notification
      }
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Verify admin exists and user has access
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Mark all notifications as read
    const result = await NotificationService.markAllAsRead(adminId, 'admin');
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
        code: 'MARK_ALL_AS_READ_FAILED'
      });
    }

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        result: result.result
      }
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { adminId, notificationId } = req.params;

    // Verify admin exists and user has access
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Delete notification
    const result = await NotificationService.deleteNotification(notificationId, adminId, 'admin');
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to delete notification',
        code: 'DELETE_NOTIFICATION_FAILED'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Get notification statistics
export const getNotificationStats = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Verify admin exists and user has access
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    // Get notification statistics
    const result = await NotificationService.getNotificationStats(adminId, 'admin');
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get notification statistics',
        code: 'NOTIFICATION_STATS_FAILED'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification statistics retrieved successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Error getting notification statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Send notification to specific business
export const sendToBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { title, body, type, category, actionUrl, data, priority, image } = req.body;

    // Validate required fields
    if (!title || !body || !type || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, body, type, and category are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verify business exists
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        code: 'BUSINESS_NOT_FOUND'
      });
    }

    // Send notification
    const result = await NotificationService.sendToUser(businessId, 'business', {
      title,
      body,
      type,
      category,
      actionUrl,
      data,
      priority: priority || 'normal',
      image
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send notification',
        code: 'NOTIFICATION_SEND_FAILED',
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      data: {
        messageId: result.messageId,
        notificationId: result.notificationId
      }
    });

  } catch (error) {
    console.error('Error sending notification to business:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Send notification to all businesses
export const sendToAllBusinesses = async (req, res) => {
  try {
    const { title, body, type, category, actionUrl, data, priority, image } = req.body;

    // Validate required fields
    if (!title || !body || !type || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, body, type, and category are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Send notification to all businesses
    const result = await NotificationService.sendToAllUsers('business', {
      title,
      body,
      type,
      category,
      actionUrl,
      data,
      priority: priority || 'normal',
      image
    });

    res.status(200).json({
      success: true,
      message: 'Notifications sent to all businesses',
      data: {
        results: result
      }
    });

  } catch (error) {
    console.error('Error sending notification to all businesses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Send notification to topic
export const sendToTopic = async (req, res) => {
  try {
    const { topic } = req.params;
    const { title, body, type, category, actionUrl, data, priority, image } = req.body;

    // Validate required fields
    if (!title || !body || !type || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, body, type, and category are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Send notification to topic
    const result = await NotificationService.sendToTopic(topic, {
      title,
      body,
      type,
      category,
      actionUrl,
      data,
      priority: priority || 'normal',
      image
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send topic notification',
        code: 'TOPIC_NOTIFICATION_FAILED',
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      message: 'Topic notification sent successfully',
      data: {
        messageId: result.messageId
      }
    });

  } catch (error) {
    console.error('Error sending topic notification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Subscribe user to topic
export const subscribeToTopic = async (req, res) => {
  try {
    const { fcmToken, topic } = req.body;

    // Validate required fields
    if (!fcmToken || !topic) {
      return res.status(400).json({
        success: false,
        message: 'FCM token and topic are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Subscribe to topic
    const result = await NotificationService.subscribeToTopic(fcmToken, topic);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to subscribe to topic',
        code: 'TOPIC_SUBSCRIPTION_FAILED',
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subscribed to topic successfully',
      data: {
        response: result.response
      }
    });

  } catch (error) {
    console.error('Error subscribing to topic:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Unsubscribe user from topic
export const unsubscribeFromTopic = async (req, res) => {
  try {
    const { fcmToken, topic } = req.body;

    // Validate required fields
    if (!fcmToken || !topic) {
      return res.status(400).json({
        success: false,
        message: 'FCM token and topic are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Unsubscribe from topic
    const result = await NotificationService.unsubscribeFromTopic(fcmToken, topic);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to unsubscribe from topic',
        code: 'TOPIC_UNSUBSCRIPTION_FAILED',
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      message: 'Unsubscribed from topic successfully',
      data: {
        response: result.response
      }
    });

  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};
