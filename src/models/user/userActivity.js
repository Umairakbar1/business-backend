import mongoose from "mongoose";
const { Schema, model } = mongoose;

const UserActivitySchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'profile_update',
      'password_change',
      'email_verification',
      'phone_verification',
      'review_posted',
      'review_updated',
      'review_deleted',
      'review_comment_posted',
      'review_reply_posted',
      'business_viewed',
      'product_viewed',
      'blog_viewed',
      'search_performed',
      'category_browsed',
      'page_visited',
      'api_call',
      'file_upload',
      'subscription_change',
      'account_deleted',
      'other'
    ]
  },
  description: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  location: {
    country: String,
    city: String,
    region: String,
    timezone: String
  },
  deviceInfo: {
    type: String, // mobile, desktop, tablet
    browser: String,
    os: String
  },
  sessionId: {
    type: String,
    index: true
  },
  duration: {
    type: Number, // in seconds, for session-based activities
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  indexes: [
    { userId: 1, createdAt: -1 },
    { action: 1, createdAt: -1 },
    { sessionId: 1 },
    { createdAt: -1 }
  ]
});

// Static method to get user activity summary
UserActivitySchema.statics.getUserActivitySummary = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const activities = await this.find({
    userId,
    createdAt: { $gte: startDate }
  }).sort({ createdAt: -1 });

  const summary = {
    totalActivities: activities.length,
    uniqueSessions: new Set(activities.map(a => a.sessionId)).size,
    actionsBreakdown: {},
    lastActivity: activities[0]?.createdAt || null,
    firstActivity: activities[activities.length - 1]?.createdAt || null,
    dailyActivity: {},
    topActions: []
  };

  // Count actions
  activities.forEach(activity => {
    summary.actionsBreakdown[activity.action] = (summary.actionsBreakdown[activity.action] || 0) + 1;
    
    // Daily activity count
    const date = activity.createdAt.toISOString().split('T')[0];
    summary.dailyActivity[date] = (summary.dailyActivity[date] || 0) + 1;
  });

  // Get top 5 actions
  summary.topActions = Object.entries(summary.actionsBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([action, count]) => ({ action, count }));

  return summary;
};

// Static method to get activities for multiple users (for admin)
UserActivitySchema.statics.getUsersActivities = async function(userIds, days = 30, limit = 50) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    {
      $match: {
        userId: { $in: userIds },
        createdAt: { $gte: startDate }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        userId: 1,
        action: 1,
        description: 1,
        details: 1,
        ipAddress: 1,
        userAgent: 1,
        location: 1,
        deviceInfo: 1,
        sessionId: 1,
        duration: 1,
        metadata: 1,
        createdAt: 1,
        updatedAt: 1,
        'user.name': 1,
        'user.email': 1,
        'user.userName': 1
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $limit: limit
    }
  ];

  return await this.aggregate(pipeline);
};

// Static method to get user activity count for admin users list
UserActivitySchema.statics.getUsersActivityCounts = async function(userIds) {
  const pipeline = [
    {
      $match: {
        userId: { $in: userIds }
      }
    },
    {
      $group: {
        _id: '$userId',
        totalActivities: { $sum: 1 },
        lastActivity: { $max: '$createdAt' },
        uniqueSessions: { $addToSet: '$sessionId' },
        actionsBreakdown: {
          $push: '$action'
        }
      }
    },
    {
      $project: {
        userId: '$_id',
        totalActivities: 1,
        lastActivity: 1,
        uniqueSessions: { $size: '$uniqueSessions' },
        topActions: {
          $slice: [
            {
              $map: {
                input: {
                  $reduce: {
                    input: '$actionsBreakdown',
                    initialValue: {},
                    in: {
                      $mergeObjects: [
                        '$$value',
                        {
                          $arrayToObject: [
                            [{
                              k: '$$this',
                              v: {
                                $add: [
                                  { $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] },
                                  1
                                ]
                              }
                            }]
                          ]
                        }
                      ]
                    }
                  }
                },
                as: 'action',
                in: {
                  action: '$$action',
                  count: { $getField: { field: '$$action', input: '$actionsBreakdown' } }
                }
              }
            },
            5
          ]
        }
      }
    }
  ];

  return await this.aggregate(pipeline);
};

// Static method to get admin dashboard data
UserActivitySchema.statics.getAdminDashboardData = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    {
      $match: {
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
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $group: {
        _id: '$_id.action',
        totalCount: { $sum: '$count' },
        uniqueUsers: { $sum: { $size: '$uniqueUsers' } },
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

  const results = await this.aggregate(pipeline);

  // Get total unique users
  const totalUniqueUsers = await this.distinct('userId', {
    createdAt: { $gte: startDate }
  });

  return {
    period: `${days} days`,
    totalActivities: results.reduce((sum, item) => sum + item.totalCount, 0),
    totalUniqueUsers: totalUniqueUsers.length,
    actionBreakdown: results,
    topActions: results.slice(0, 10)
  };
};

// Instance method to get readable action description
UserActivitySchema.methods.getReadableDescription = function() {
  const actionDescriptions = {
    'login': 'User logged in',
    'logout': 'User logged out',
    'profile_update': 'User updated profile',
    'password_change': 'User changed password',
    'email_verification': 'User verified email',
    'phone_verification': 'User verified phone',
    'review_posted': 'User posted a review',
    'review_updated': 'User updated a review',
    'review_deleted': 'User deleted a review',
    'review_comment_posted': 'User added a comment to a review',
    'review_reply_posted': 'User added a reply to a review comment',
    'business_viewed': 'User viewed a business',
    'product_viewed': 'User viewed a product',
    'blog_viewed': 'User viewed a blog',
    'search_performed': 'User performed a search',
    'category_browsed': 'User browsed a category',
    'page_visited': 'User visited a page',
    'api_call': 'User made an API call',
    'file_upload': 'User uploaded a file',
    'subscription_change': 'User changed subscription',
    'account_deleted': 'User deleted account',
    'other': 'Other activity'
  };

  return actionDescriptions[this.action] || this.description;
};

const UserActivity = model('UserActivity', UserActivitySchema);
export default UserActivity;
