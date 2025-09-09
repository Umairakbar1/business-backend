import { UserActivity } from '../models/index.js';
import { asyncWrapper } from './utilityHelper.js';

/**
 * Track user activity
 * @param {Object} params - Activity parameters
 * @param {string} params.userId - User ID
 * @param {string} params.action - Action type
 * @param {string} params.description - Activity description
 * @param {Object} params.details - Additional details
 * @param {string} params.ipAddress - User's IP address
 * @param {string} params.userAgent - User's user agent
 * @param {string} params.sessionId - Session ID
 * @param {Object} params.location - Location data
 * @param {Object} params.deviceInfo - Device information
 * @param {number} params.duration - Activity duration in seconds
 * @param {Object} params.metadata - Additional metadata
 */
export const trackUserActivity = async (params) => {
  try {
    const {
      userId,
      action,
      description,
      details = {},
      ipAddress,
      userAgent,
      sessionId,
      location = {},
      deviceInfo = {},
      duration = null,
      metadata = {}
    } = params;

    if (!userId || !action || !description || !ipAddress || !userAgent) {
      console.warn('Missing required parameters for user activity tracking');
      return null;
    }

    const activityData = {
      userId,
      action,
      description,
      details,
      ipAddress,
      userAgent,
      sessionId,
      location,
      deviceInfo,
      duration,
      metadata
    };

    const [activity, error] = await asyncWrapper(() => 
      UserActivity.create(activityData)
    );

    if (error) {
      console.error('Error tracking user activity:', error);
      return null;
    }

    // Update user's last activity time
    await updateUserLastActivity(userId);

    return activity;
  } catch (error) {
    console.error('Error in trackUserActivity:', error);
    return null;
  }
};

/**
 * Update user's last activity time and visit count
 * @param {string} userId - User ID
 */
export const updateUserLastActivity = async (userId) => {
  try {
    const { User } = await import('../models/index.js');
    
    const [user, error] = await asyncWrapper(() =>
      User.findByIdAndUpdate(
        userId,
        {
          $set: { lastActivityTime: new Date() },
          $inc: { visitCount: 1 }
        },
        { new: true }
      )
    );

    if (error) {
      console.error('Error updating user last activity:', error);
    }

    return user;
  } catch (error) {
    console.error('Error in updateUserLastActivity:', error);
  }
};

/**
 * Track user login activity
 * @param {Object} req - Express request object
 * @param {Object} user - User object
 * @param {string} sessionId - Session ID
 */
export const trackLoginActivity = async (req, user, sessionId) => {
  const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';

  return await trackUserActivity({
    userId: user._id,
    action: 'login',
    description: `User ${user.name} logged in successfully`,
    details: {
      loginMethod: 'email_password',
      userEmail: user.email,
      userName: user.userName
    },
    ipAddress,
    userAgent,
    sessionId,
    metadata: {
      loginTime: new Date(),
      userAgent: userAgent
    }
  });
};

/**
 * Track user logout activity
 * @param {Object} req - Express request object
 * @param {Object} user - User object
 * @param {string} sessionId - Session ID
 */
export const trackLogoutActivity = async (req, user, sessionId) => {
  const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';

  return await trackUserActivity({
    userId: user._id,
    action: 'logout',
    description: `User ${user.name} logged out`,
    details: {
      userEmail: user.email,
      userName: user.userName
    },
    ipAddress,
    userAgent,
    sessionId,
    metadata: {
      logoutTime: new Date()
    }
  });
};

/**
 * Track page visit activity
 * @param {Object} req - Express request object
 * @param {Object} user - User object
 * @param {string} pageName - Page name
 * @param {Object} additionalDetails - Additional details
 */
export const trackPageVisit = async (req, user, pageName, additionalDetails = {}) => {
  const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';

  return await trackUserActivity({
    userId: user._id,
    action: 'page_visited',
    description: `User ${user.name} visited ${pageName}`,
    details: {
      pageName,
      url: req.originalUrl,
      method: req.method,
      ...additionalDetails
    },
    ipAddress,
    userAgent,
    sessionId: req.sessionID,
    metadata: {
      visitTime: new Date(),
      referer: req.get('Referer')
    }
  });
};

/**
 * Track API call activity
 * @param {Object} req - Express request object
 * @param {Object} user - User object
 * @param {string} endpoint - API endpoint
 * @param {Object} additionalDetails - Additional details
 */
export const trackApiCall = async (req, user, endpoint, additionalDetails = {}) => {
  const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';

  return await trackUserActivity({
    userId: user._id,
    action: 'api_call',
    description: `User ${user.name} made API call to ${endpoint}`,
    details: {
      endpoint,
      method: req.method,
      statusCode: req.statusCode || 200,
      ...additionalDetails
    },
    ipAddress,
    userAgent,
    sessionId: req.sessionID,
    metadata: {
      callTime: new Date(),
      requestBody: req.body ? Object.keys(req.body) : []
    }
  });
};

/**
 * Get user activity summary for admin
 * @param {string} userId - User ID
 * @param {number} days - Number of days to look back
 */
export const getUserActivitySummary = async (userId, days = 30) => {
  try {
    const [summary, error] = await asyncWrapper(() =>
      UserActivity.getUserActivitySummary(userId, days)
    );

    if (error) {
      console.error('Error getting user activity summary:', error);
      return null;
    }

    return summary;
  } catch (error) {
    console.error('Error in getUserActivitySummary:', error);
    return null;
  }
};

/**
 * Get activities for multiple users (for admin dashboard)
 * @param {Array} userIds - Array of user IDs
 * @param {number} days - Number of days to look back
 * @param {number} limit - Limit number of results
 */
export const getUsersActivities = async (userIds, days = 30, limit = 50) => {
  try {
    const [activities, error] = await asyncWrapper(() =>
      UserActivity.getUsersActivities(userIds, days, limit)
    );

    if (error) {
      console.error('Error getting users activities:', error);
      return [];
    }

    return activities;
  } catch (error) {
    console.error('Error in getUsersActivities:', error);
    return [];
  }
};

/**
 * Get activity counts for multiple users (for admin users list)
 * @param {Array} userIds - Array of user IDs
 */
export const getUsersActivityCounts = async (userIds) => {
  try {
    const [counts, error] = await asyncWrapper(() =>
      UserActivity.getUsersActivityCounts(userIds)
    );

    if (error) {
      console.error('Error getting users activity counts:', error);
      return [];
    }

    return counts;
  } catch (error) {
    console.error('Error in getUsersActivityCounts:', error);
    return [];
  }
};
