import Subscription from '../../models/admin/subscription.js';
import BoostQueue from '../../models/business/boostQueue.js';
import Payment from '../../models/admin/payment.js';
import Business from '../../models/business/business.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';

/**
 * Get comprehensive boost statistics
 * Includes active boosts, scheduled boosts, total views, and performance metrics
 */
export const getBoostStats = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

    // Get boost statistics
    const [
      activeBoosts,
      scheduledBoosts,
      totalViews,
      currentMonthBoosts,
      currentMonthViews,
      previousMonthBoosts,
      previousMonthViews,
      boostRevenue,
      boostQueueStats,
      categoryBreakdown
    ] = await Promise.all([
      // Active boosts (currently running)
      Subscription.countDocuments({
        subscriptionType: 'boost',
        status: 'active',
        expiresAt: { $gt: currentDate },
        'boostQueueInfo.isCurrentlyActive': true
      }),

      // Scheduled boosts (in queue but not active)
      Subscription.countDocuments({
        subscriptionType: 'boost',
        status: 'active',
        expiresAt: { $gt: currentDate },
        'boostQueueInfo.isCurrentlyActive': false,
        'boostQueueInfo.queuePosition': { $exists: true, $ne: null }
      }),

      // Total views (estimated based on boost duration and position)
      Subscription.aggregate([
        {
          $match: {
            subscriptionType: 'boost',
            status: 'active',
            'boostQueueInfo.isCurrentlyActive': true
          }
        },
        {
          $group: {
            _id: null,
            totalViews: {
              $sum: {
                $multiply: [
                  { $ifNull: ['$boostUsage.currentDay', 0] },
                  100 // Estimated views per boost hour
                ]
              }
            }
          }
        }
      ]),

      // Current month boosts
      Subscription.countDocuments({
        subscriptionType: 'boost',
        status: 'active',
        createdAt: { $gte: currentMonth },
        expiresAt: { $gt: currentDate }
      }),

      // Current month views
      Subscription.aggregate([
        {
          $match: {
            subscriptionType: 'boost',
            status: 'active',
            createdAt: { $gte: currentMonth },
            'boostQueueInfo.isCurrentlyActive': true
          }
        },
        {
          $group: {
            _id: null,
            totalViews: {
              $sum: {
                $multiply: [
                  { $ifNull: ['$boostUsage.currentDay', 0] },
                  100
                ]
              }
            }
          }
        }
      ]),

      // Previous month boosts
      Subscription.countDocuments({
        subscriptionType: 'boost',
        status: 'active',
        createdAt: { $gte: previousMonth, $lt: currentMonth },
        expiresAt: { $gt: currentDate }
      }),

      // Previous month views
      Subscription.aggregate([
        {
          $match: {
            subscriptionType: 'boost',
            status: 'active',
            createdAt: { $gte: previousMonth, $lt: currentMonth },
            'boostQueueInfo.isCurrentlyActive': true
          }
        },
        {
          $group: {
            _id: null,
            totalViews: {
              $sum: {
                $multiply: [
                  { $ifNull: ['$boostUsage.currentDay', 0] },
                  100
                ]
              }
            }
          }
        }
      ]),

      // Boost revenue
      Payment.aggregate([
        {
          $match: {
            status: 'completed',
            'subscription.subscriptionType': 'boost'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$finalAmount' },
            totalTransactions: { $sum: 1 }
          }
        }
      ]),

      // Boost queue statistics
      BoostQueue.aggregate([
        {
          $group: {
            _id: null,
            totalQueues: { $sum: 1 },
            totalInQueue: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$queue',
                    cond: { $eq: ['$$this.status', 'pending'] }
                  }
                }
              }
            },
            totalActive: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$queue',
                    cond: { $eq: ['$$this.status', 'active'] }
                  }
                }
              }
            }
          }
        }
      ]),

      // Category breakdown
      BoostQueue.aggregate([
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        {
          $unwind: '$categoryInfo'
        },
        {
          $group: {
            _id: '$categoryInfo.name',
            activeBoosts: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$queue',
                    cond: { $eq: ['$$this.status', 'active'] }
                  }
                }
              }
            },
            pendingBoosts: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$queue',
                    cond: { $eq: ['$$this.status', 'pending'] }
                  }
                }
              }
            }
          }
        },
        {
          $sort: { activeBoosts: -1 }
        },
        {
          $limit: 10
        }
      ])
    ]);

    // Calculate performance percentages
    const calculatePerformancePercentage = (current, total) => {
      if (total === 0) return 0;
      return Math.round((current / total) * 100);
    };

    // Get total boost subscriptions for percentage calculation
    const totalBoostSubscriptions = await Subscription.countDocuments({
      subscriptionType: 'boost',
      status: 'active'
    });

    const activePercentage = calculatePerformancePercentage(activeBoosts, totalBoostSubscriptions);
    const scheduledPercentage = calculatePerformancePercentage(scheduledBoosts, totalBoostSubscriptions);

    // Calculate month-over-month changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const boostChange = calculateChange(currentMonthBoosts, previousMonthBoosts);
    const viewsChange = calculateChange(
      currentMonthViews[0]?.totalViews || 0,
      previousMonthViews[0]?.totalViews || 0
    );

    // Get recent boost activity (last 7 days)
    const lastWeek = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentBoosts = await Subscription.countDocuments({
      subscriptionType: 'boost',
      status: 'active',
      createdAt: { $gte: lastWeek }
    });

    const boostStats = {
      overview: {
        activeBoosts: activeBoosts || 0,
        scheduledBoosts: scheduledBoosts || 0,
        totalViews: Math.round((totalViews[0]?.totalViews || 0) / 1000) + 'k', // Convert to k format
        totalRevenue: boostRevenue[0]?.totalRevenue || 0,
        totalTransactions: boostRevenue[0]?.totalTransactions || 0
      },
      performance: {
        activePercentage: activePercentage,
        scheduledPercentage: scheduledPercentage,
        utilizationRate: calculatePerformancePercentage(activeBoosts + scheduledBoosts, totalBoostSubscriptions)
      },
      currentMonth: {
        boosts: currentMonthBoosts || 0,
        views: Math.round((currentMonthViews[0]?.totalViews || 0) / 1000) + 'k',
        revenue: 0 // Will be calculated separately if needed
      },
      previousMonth: {
        boosts: previousMonthBoosts || 0,
        views: Math.round((previousMonthViews[0]?.totalViews || 0) / 1000) + 'k'
      },
      monthOverMonth: {
        boosts: {
          change: boostChange,
          trend: boostChange >= 0 ? 'increase' : 'decrease'
        },
        views: {
          change: viewsChange,
          trend: viewsChange >= 0 ? 'increase' : 'decrease'
        }
      },
      queueStats: {
        totalQueues: boostQueueStats[0]?.totalQueues || 0,
        totalInQueue: boostQueueStats[0]?.totalInQueue || 0,
        totalActive: boostQueueStats[0]?.totalActive || 0,
        averageQueueLength: boostQueueStats[0]?.totalQueues > 0 
          ? Math.round(boostQueueStats[0].totalInQueue / boostQueueStats[0].totalQueues) 
          : 0
      },
      recentActivity: {
        last7Days: {
          newBoosts: recentBoosts || 0
        }
      },
      categoryBreakdown: categoryBreakdown.map(item => ({
        category: item._id,
        activeBoosts: item.activeBoosts,
        pendingBoosts: item.pendingBoosts,
        totalBoosts: item.activeBoosts + item.pendingBoosts
      }))
    };

    return successResponseHelper(res, {
      message: 'Boost statistics fetched successfully',
      data: boostStats
    });

  } catch (error) {
    console.error('Boost stats error:', error);
    return errorResponseHelper(res, { 
      message: 'Failed to fetch boost statistics', 
      code: '00500' 
    });
  }
};

/**
 * Get boost performance by category
 */
export const getBoostPerformanceByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const categoryStats = await BoostQueue.aggregate([
      {
        $match: { category: new mongoose.Types.ObjectId(categoryId) }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $unwind: '$categoryInfo'
      },
      {
        $project: {
          categoryName: '$categoryInfo.name',
          activeBoosts: {
            $size: {
              $filter: {
                input: '$queue',
                cond: { $eq: ['$$this.status', 'active'] }
              }
            }
          },
          pendingBoosts: {
            $size: {
              $filter: {
                input: '$queue',
                cond: { $eq: ['$$this.status', 'pending'] }
              }
            }
          },
          totalBoosts: { $size: '$queue' }
        }
      }
    ]);

    if (categoryStats.length === 0) {
      return errorResponseHelper(res, { 
        message: 'Category not found', 
        code: '00404' 
      });
    }

    return successResponseHelper(res, {
      message: 'Category boost performance fetched successfully',
      data: categoryStats[0]
    });

  } catch (error) {
    console.error('Category boost performance error:', error);
    return errorResponseHelper(res, { 
      message: 'Failed to fetch category boost performance', 
      code: '00500' 
    });
  }
};

/**
 * Get boost trends over time
 */
export const getBoostTrends = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);

    const trends = await Subscription.aggregate([
      {
        $match: {
          subscriptionType: 'boost',
          status: 'active',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: {
            $sum: '$amount'
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    const formattedTrends = trends.map(item => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      boosts: item.count,
      revenue: item.revenue
    }));

    return successResponseHelper(res, {
      message: 'Boost trends fetched successfully',
      data: {
        period: `${period} days`,
        trends: formattedTrends
      }
    });

  } catch (error) {
    console.error('Boost trends error:', error);
    return errorResponseHelper(res, { 
      message: 'Failed to fetch boost trends', 
      code: '00500' 
    });
  }
};
