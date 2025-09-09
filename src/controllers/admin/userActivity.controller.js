import { User, UserActivity } from "../../models/index.js";
import {
  serverErrorHelper,
  asyncWrapper,
  errorResponseHelper,
  successResponseHelper,
} from "../../helpers/utilityHelper.js";
import {
  getUserActivitySummary,
  getUsersActivities,
  getUsersActivityCounts
} from "../../helpers/userActivityHelper.js";

// Get all users with their activity data
const getAllUsersWithActivity = async (req, res) => {
  try {
    const { page = 1, limit = 10, days = 30, includeActivity = true } = req.query;
    const skip = (page - 1) * limit;

    // Get users with pagination
    const [users, usersError] = await asyncWrapper(() =>
      User.find({ status: 'active' })
        .select('-password -otp')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
    );

    if (usersError) return serverErrorHelper(req, res, 500, usersError);

    // Get total count
    const [totalUsers, totalError] = await asyncWrapper(() =>
      User.countDocuments({ status: 'active' })
    );
    if (totalError) return serverErrorHelper(req, res, 500, totalError);

    let usersWithActivity = users;

    // If includeActivity is true, get activity data for each user
    if (includeActivity === 'true') {
      const userIds = users.map(user => user._id);
      
      // Get activity counts for all users
      const [activityCounts, activityError] = await asyncWrapper(() =>
        getUsersActivityCounts(userIds)
      );

      if (activityError) {
        console.error('Error getting activity counts:', activityError);
        // Continue without activity data rather than failing
      } else {
        // Map activity data to users
        const activityMap = {};
        activityCounts.forEach(activity => {
          activityMap[activity.userId.toString()] = activity;
        });

        usersWithActivity = users.map(user => {
          const userObj = user.toObject();
          const activityData = activityMap[user._id.toString()] || {
            totalActivities: 0,
            lastActivity: null,
            uniqueSessions: 0,
            topActions: []
          };

          return {
            ...userObj,
            activity: {
              totalActivities: activityData.totalActivities,
              lastActivity: activityData.lastActivity,
              uniqueSessions: activityData.uniqueSessions,
              topActions: activityData.topActions,
              visitCount: user.visitCount || 0,
              lastVisit: user.lastVisit,
              lastActivityTime: user.lastActivityTime
            }
          };
        });
      }
    }

    return successResponseHelper(res, {
      message: "Users retrieved successfully",
      data: {
        users: usersWithActivity,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNextPage: page < Math.ceil(totalUsers / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Get specific user's activity details
const getUserActivityDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Verify user exists
    const [user, userError] = await asyncWrapper(() =>
      User.findById(userId).select('-password -otp')
    );
    if (userError) return serverErrorHelper(req, res, 500, userError);
    if (!user) return errorResponseHelper(res, { message: "User not found" });

    // Get user activity summary
    const [summary, summaryError] = await asyncWrapper(() =>
      getUserActivitySummary(userId, parseInt(days))
    );
    if (summaryError) return serverErrorHelper(req, res, 500, summaryError);

    // Get detailed activities
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [activities, activitiesError] = await asyncWrapper(() =>
      UserActivity.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
    );
    if (activitiesError) return serverErrorHelper(req, res, 500, activitiesError);

    // Get total activity count for pagination
    const [totalActivities, totalError] = await asyncWrapper(() =>
      UserActivity.countDocuments({ userId })
    );
    if (totalError) return serverErrorHelper(req, res, 500, totalError);

    return successResponseHelper(res, {
      message: "User activity details retrieved successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          userName: user.userName,
          visitCount: user.visitCount || 0,
          lastVisit: user.lastVisit,
          lastActivityTime: user.lastActivityTime,
          createdAt: user.createdAt
        },
        activitySummary: summary,
        activities: activities.map(activity => ({
          _id: activity._id,
          action: activity.action,
          description: activity.description,
          details: activity.details,
          ipAddress: activity.ipAddress,
          userAgent: activity.userAgent,
          location: activity.location,
          deviceInfo: activity.deviceInfo,
          sessionId: activity.sessionId,
          duration: activity.duration,
          metadata: activity.metadata,
          createdAt: activity.createdAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalActivities / limit),
          totalActivities,
          hasNextPage: page < Math.ceil(totalActivities / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Get admin dashboard activity data
const getAdminActivityDashboard = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Get dashboard data
    const [dashboardData, dashboardError] = await asyncWrapper(() =>
      UserActivity.getAdminDashboardData(parseInt(days))
    );
    if (dashboardError) return serverErrorHelper(req, res, 500, dashboardError);

    // Get recent activities
    const [recentActivities, recentError] = await asyncWrapper(() =>
      UserActivity.find()
        .populate('userId', 'name email userName')
        .sort({ createdAt: -1 })
        .limit(20)
    );
    if (recentError) return serverErrorHelper(req, res, 500, recentError);

    // Get user statistics
    const [userStats, statsError] = await asyncWrapper(() =>
      User.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    );
    if (statsError) return serverErrorHelper(req, res, 500, statsError);

    return successResponseHelper(res, {
      message: "Admin dashboard data retrieved successfully",
      data: {
        dashboard: dashboardData,
        recentActivities: recentActivities.map(activity => ({
          _id: activity._id,
          action: activity.action,
          description: activity.description,
          user: activity.userId ? {
            _id: activity.userId._id,
            name: activity.userId.name,
            email: activity.userId.email,
            userName: activity.userId.userName
          } : null,
          ipAddress: activity.ipAddress,
          createdAt: activity.createdAt
        })),
        userStats: userStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Get user activity analytics
const getUserActivityAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    // Verify user exists
    const [user, userError] = await asyncWrapper(() =>
      User.findById(userId).select('name email userName')
    );
    if (userError) return serverErrorHelper(req, res, 500, userError);
    if (!user) return errorResponseHelper(res, { message: "User not found" });

    // Get activity analytics
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const pipeline = [
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            action: '$action',
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.action',
          totalCount: { $sum: '$count' },
          dailyBreakdown: {
            $push: {
              date: '$_id.date',
              count: '$count'
            }
          }
        }
      },
      {
        $sort: { totalCount: -1 }
      }
    ];

    const [analytics, analyticsError] = await asyncWrapper(() =>
      UserActivity.aggregate(pipeline)
    );
    if (analyticsError) return serverErrorHelper(req, res, 500, analyticsError);

    // Get session data
    const [sessionData, sessionError] = await asyncWrapper(() =>
      UserActivity.aggregate([
        {
          $match: {
            userId: user._id,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$sessionId',
            firstActivity: { $min: '$createdAt' },
            lastActivity: { $max: '$createdAt' },
            activityCount: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            avgSessionDuration: {
              $avg: {
                $subtract: ['$lastActivity', '$firstActivity']
              }
            },
            avgActivitiesPerSession: { $avg: '$activityCount' }
          }
        }
      ])
    );
    if (sessionError) return serverErrorHelper(req, res, 500, sessionError);

    return successResponseHelper(res, {
      message: "User activity analytics retrieved successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          userName: user.userName
        },
        period: `${days} days`,
        analytics: analytics,
        sessionData: sessionData[0] || {
          totalSessions: 0,
          avgSessionDuration: 0,
          avgActivitiesPerSession: 0
        }
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Search user activities
const searchUserActivities = async (req, res) => {
  try {
    const { 
      query = '', 
      action = '', 
      userId = '', 
      startDate = '', 
      endDate = '', 
      page = 1, 
      limit = 20 
    } = req.query;
    const skip = (page - 1) * limit;

    // Build search criteria
    const searchCriteria = {};

    if (query) {
      searchCriteria.$or = [
        { description: { $regex: query, $options: 'i' } },
        { 'details.userEmail': { $regex: query, $options: 'i' } },
        { 'details.userName': { $regex: query, $options: 'i' } }
      ];
    }

    if (action) {
      searchCriteria.action = action;
    }

    if (userId) {
      searchCriteria.userId = userId;
    }

    if (startDate || endDate) {
      searchCriteria.createdAt = {};
      if (startDate) searchCriteria.createdAt.$gte = new Date(startDate);
      if (endDate) searchCriteria.createdAt.$lte = new Date(endDate);
    }

    // Get activities
    const [activities, activitiesError] = await asyncWrapper(() =>
      UserActivity.find(searchCriteria)
        .populate('userId', 'name email userName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
    );
    if (activitiesError) return serverErrorHelper(req, res, 500, activitiesError);

    // Get total count
    const [totalActivities, totalError] = await asyncWrapper(() =>
      UserActivity.countDocuments(searchCriteria)
    );
    if (totalError) return serverErrorHelper(req, res, 500, totalError);

    return successResponseHelper(res, {
      message: "User activities search completed successfully",
      data: {
        activities: activities.map(activity => ({
          _id: activity._id,
          action: activity.action,
          description: activity.description,
          details: activity.details,
          user: activity.userId ? {
            _id: activity.userId._id,
            name: activity.userId.name,
            email: activity.userId.email,
            userName: activity.userId.userName
          } : null,
          ipAddress: activity.ipAddress,
          userAgent: activity.userAgent,
          location: activity.location,
          deviceInfo: activity.deviceInfo,
          sessionId: activity.sessionId,
          createdAt: activity.createdAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalActivities / limit),
          totalActivities,
          hasNextPage: page < Math.ceil(totalActivities / limit),
          hasPrevPage: page > 1
        },
        searchCriteria: {
          query,
          action,
          userId,
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

export {
  getAllUsersWithActivity,
  getUserActivityDetails,
  getAdminActivityDashboard,
  getUserActivityAnalytics,
  searchUserActivities
};
