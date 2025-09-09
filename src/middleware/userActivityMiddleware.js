import { trackUserActivity, updateUserLastActivity } from '../helpers/userActivityHelper.js';

/**
 * Middleware to track user activities automatically
 * This middleware should be used on protected routes where user is authenticated
 */
export const trackUserActivityMiddleware = (action, description, additionalDetails = {}) => {
  return async (req, res, next) => {
    try {
      // Only track if user is authenticated
      if (req.user && req.user._id) {
        const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        const userAgent = req.get('User-Agent') || 'Unknown';

        // Track the activity
        await trackUserActivity({
          userId: req.user._id,
          action,
          description,
          details: {
            endpoint: req.originalUrl,
            method: req.method,
            ...additionalDetails
          },
          ipAddress,
          userAgent,
          sessionId: req.sessionID,
          metadata: {
            timestamp: new Date(),
            requestBody: req.body ? Object.keys(req.body) : []
          }
        });
      }
      
      next();
    } catch (error) {
      console.error('Error in trackUserActivityMiddleware:', error);
      // Don't fail the request if tracking fails
      next();
    }
  };
};

/**
 * Middleware to track page visits
 */
export const trackPageVisitMiddleware = (pageName) => {
  return trackUserActivityMiddleware('page_visited', `User visited ${pageName}`, {
    pageName
  });
};

/**
 * Middleware to track API calls
 */
export const trackApiCallMiddleware = (endpoint) => {
  return trackUserActivityMiddleware('api_call', `User made API call to ${endpoint}`, {
    endpoint
  });
};

/**
 * Middleware to track profile updates
 */
export const trackProfileUpdateMiddleware = () => {
  return trackUserActivityMiddleware('profile_update', 'User updated profile', {
    updateFields: 'profile_data'
  });
};

/**
 * Middleware to track password changes
 */
export const trackPasswordChangeMiddleware = () => {
  return trackUserActivityMiddleware('password_change', 'User changed password', {
    securityAction: true
  });
};

/**
 * Middleware to track review activities
 */
export const trackReviewActivityMiddleware = (action) => {
  const descriptions = {
    'review_posted': 'User posted a review',
    'review_updated': 'User updated a review',
    'review_deleted': 'User deleted a review',
    'review_comment_posted': 'User added a comment to a review',
    'review_reply_posted': 'User added a reply to a review comment'
  };

  return trackUserActivityMiddleware(action, descriptions[action] || 'User performed review action', {
    reviewAction: action
  });
};

/**
 * Middleware to track business viewing
 */
export const trackBusinessViewMiddleware = () => {
  return trackUserActivityMiddleware('business_viewed', 'User viewed a business', {
    businessId: 'from_params'
  });
};

/**
 * Middleware to track search activities
 */
export const trackSearchMiddleware = () => {
  return trackUserActivityMiddleware('search_performed', 'User performed a search', {
    searchQuery: 'from_query_params'
  });
};

/**
 * Simple middleware to just update last activity time
 * Use this for routes where you don't need detailed tracking
 */
export const updateLastActivityMiddleware = async (req, res, next) => {
  try {
    if (req.user && req.user._id) {
      await updateUserLastActivity(req.user._id);
    }
    next();
  } catch (error) {
    console.error('Error in updateLastActivityMiddleware:', error);
    next();
  }
};
