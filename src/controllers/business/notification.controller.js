import NotificationService from '../../services/notificationService.js';
import Business from '../../models/business/business.js';

/**
 * Business Notification Controller
 * Handles FCM token management and notification retrieval for business users
 */

// Update FCM token for business
export const updateFCMToken = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { fcmToken } = req.body;

    // Validate required fields
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required',
        code: 'MISSING_FCM_TOKEN'
      });
    }

    // Verify business exists and user has access
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        code: 'BUSINESS_NOT_FOUND'
      });
    }

    // Update FCM token
    const result = await NotificationService.updateFCMToken(businessId, 'business', fcmToken);
    
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
        businessId,
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

// Remove FCM token for business
export const removeFCMToken = async (req, res) => {
  try {
    const { businessId } = req.params;

    // Verify business exists and user has access
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        code: 'BUSINESS_NOT_FOUND'
      });
    }

    // Remove FCM token
    const result = await NotificationService.removeFCMToken(businessId, 'business');
    
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
        businessId
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

// Get business notifications
export const getNotifications = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 20, status, type, category } = req.query;

    // Verify business exists and user has access
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        code: 'BUSINESS_NOT_FOUND'
      });
    }

    // Get notifications
    const result = await NotificationService.getUserNotifications(businessId, 'business', {
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
    const { businessId, notificationId } = req.params;

    // Verify business exists and user has access
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        code: 'BUSINESS_NOT_FOUND'
      });
    }

    // Mark notification as read
    const result = await NotificationService.markAsRead(notificationId, businessId, 'business');
    
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
    const { businessId } = req.params;

    // Verify business exists and user has access
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        code: 'BUSINESS_NOT_FOUND'
      });
    }

    // Mark all notifications as read
    const result = await NotificationService.markAllAsRead(businessId, 'business');
    
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
    const { businessId, notificationId } = req.params;

    // Verify business exists and user has access
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        code: 'BUSINESS_NOT_FOUND'
      });
    }

    // Delete notification
    const result = await NotificationService.deleteNotification(notificationId, businessId, 'business');
    
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
    const { businessId } = req.params;

    // Verify business exists and user has access
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
        code: 'BUSINESS_NOT_FOUND'
      });
    }

    // Get notification statistics
    const result = await NotificationService.getNotificationStats(businessId, 'business');
    
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
