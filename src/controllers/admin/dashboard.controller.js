import User from '../../models/user/user.js';
import Business from '../../models/business/business.js';
import Subscription from '../../models/admin/subscription.js';
import Payment from '../../models/admin/payment.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';

/**
 * Get comprehensive dashboard statistics
 * Includes total users, businesses, subscriptions, earnings, and month-over-month comparisons
 */
export const getDashboardStats = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    
    // Get current month stats
    const [
      totalUsers,
      totalBusinesses,
      totalPaidSubscriptions,
      activeBoosts,
      totalEarnings,
      currentMonthUsers,
      currentMonthBusinesses,
      currentMonthSubscriptions,
      currentMonthBoosts,
      currentMonthEarnings
    ] = await Promise.all([
      // Total counts
      User.countDocuments({ status: 'Active' }),
      Business.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ 
        status: 'active', 
        subscriptionType: 'business' 
      }),
      Subscription.countDocuments({ 
        status: 'active', 
        subscriptionType: 'boost',
        expiresAt: { $gt: currentDate }
      }),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } }
      ]),
      
      // Current month counts
      User.countDocuments({ 
        status: 'Active',
        createdAt: { $gte: currentMonth }
      }),
      Business.countDocuments({ 
        status: 'Active',
        createdAt: { $gte: currentMonth }
      }),
      Subscription.countDocuments({ 
        status: 'active',
        subscriptionType: 'business',
        createdAt: { $gte: currentMonth }
      }),
      Subscription.countDocuments({ 
        status: 'active',
        subscriptionType: 'boost',
        createdAt: { $gte: currentMonth },
        expiresAt: { $gt: currentDate }
      }),
      Payment.aggregate([
        { 
          $match: { 
            status: 'completed',
            createdAt: { $gte: currentMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } }
      ])
    ]);

    // Get previous month stats for comparison
    const [
      previousMonthUsers,
      previousMonthBusinesses,
      previousMonthSubscriptions,
      previousMonthBoosts,
      previousMonthEarnings
    ] = await Promise.all([
      User.countDocuments({ 
        status: 'Active',
        createdAt: { $gte: previousMonth, $lt: currentMonth }
      }),
      Business.countDocuments({ 
        status: 'Active',
        createdAt: { $gte: previousMonth, $lt: currentMonth }
      }),
      Subscription.countDocuments({ 
        status: 'active',
        subscriptionType: 'business',
        createdAt: { $gte: previousMonth, $lt: currentMonth }
      }),
      Subscription.countDocuments({ 
        status: 'active',
        subscriptionType: 'boost',
        createdAt: { $gte: previousMonth, $lt: currentMonth }
      }),
      Payment.aggregate([
        { 
          $match: { 
            status: 'completed',
            createdAt: { $gte: previousMonth, $lt: currentMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } }
      ])
    ]);

    // Calculate month-over-month changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const userChange = calculateChange(currentMonthUsers, previousMonthUsers);
    const businessChange = calculateChange(currentMonthBusinesses, previousMonthBusinesses);
    const subscriptionChange = calculateChange(currentMonthSubscriptions, previousMonthSubscriptions);
    const boostChange = calculateChange(currentMonthBoosts, previousMonthBoosts);
    const earningsChange = calculateChange(
      currentMonthEarnings[0]?.total || 0, 
      previousMonthEarnings[0]?.total || 0
    );

    // Get recent activity (last 7 days)
    const lastWeek = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [
      recentUsers,
      recentBusinesses,
      recentPayments
    ] = await Promise.all([
      User.countDocuments({ 
        status: 'Active',
        createdAt: { $gte: lastWeek }
      }),
      Business.countDocuments({ 
        status: 'Active',
        createdAt: { $gte: lastWeek }
      }),
      Payment.countDocuments({ 
        status: 'completed',
        createdAt: { $gte: lastWeek }
      })
    ]);

    // Get subscription status breakdown
    const subscriptionStatusBreakdown = await Subscription.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get payment status breakdown
    const paymentStatusBreakdown = await Payment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get top earning months (last 6 months)
    const monthlyEarnings = await Payment.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: '$finalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const dashboardStats = {
      overview: {
        totalUsers: totalUsers || 0,
        totalBusinesses: totalBusinesses || 0,
        totalPaidSubscriptions: totalPaidSubscriptions || 0,
        activeBoosts: activeBoosts || 0,
        totalEarnings: totalEarnings[0]?.total || 0
      },
      currentMonth: {
        users: currentMonthUsers || 0,
        businesses: currentMonthBusinesses || 0,
        subscriptions: currentMonthSubscriptions || 0,
        boosts: currentMonthBoosts || 0,
        earnings: currentMonthEarnings[0]?.total || 0
      },
      previousMonth: {
        users: previousMonthUsers || 0,
        businesses: previousMonthBusinesses || 0,
        subscriptions: previousMonthSubscriptions || 0,
        boosts: previousMonthBoosts || 0,
        earnings: previousMonthEarnings[0]?.total || 0
      },
      monthOverMonth: {
        users: {
          change: userChange,
          trend: userChange >= 0 ? 'increase' : 'decrease'
        },
        businesses: {
          change: businessChange,
          trend: businessChange >= 0 ? 'increase' : 'decrease'
        },
        subscriptions: {
          change: subscriptionChange,
          trend: subscriptionChange >= 0 ? 'increase' : 'decrease'
        },
        boosts: {
          change: boostChange,
          trend: boostChange >= 0 ? 'increase' : 'decrease'
        },
        earnings: {
          change: earningsChange,
          trend: earningsChange >= 0 ? 'increase' : 'decrease'
        }
      },
      recentActivity: {
        last7Days: {
          users: recentUsers || 0,
          businesses: recentBusinesses || 0,
          payments: recentPayments || 0
        }
      },
      breakdowns: {
        subscriptionStatus: subscriptionStatusBreakdown,
        paymentStatus: paymentStatusBreakdown
      },
      monthlyTrends: monthlyEarnings.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        earnings: item.total,
        transactions: item.count
      }))
    };

    return successResponseHelper(res, {
      message: 'Dashboard statistics fetched successfully',
      data: dashboardStats
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return errorResponseHelper(res, { 
      message: 'Failed to fetch dashboard statistics', 
      code: '00500' 
    });
  }
};

/**
 * Get simplified dashboard stats (for quick overview)
 */
export const getQuickStats = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const [
      totalUsers,
      totalBusinesses,
      totalPaidSubscriptions,
      activeBoosts,
      totalEarnings,
      currentMonthEarnings
    ] = await Promise.all([
      User.countDocuments({ status: 'Active' }),
      Business.countDocuments({ status: 'Active' }),
      Subscription.countDocuments({ 
        status: 'active', 
        subscriptionType: 'business' 
      }),
      Subscription.countDocuments({ 
        status: 'active', 
        subscriptionType: 'boost',
        expiresAt: { $gt: currentDate }
      }),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } }
      ]),
      Payment.aggregate([
        { 
          $match: { 
            status: 'completed',
            createdAt: { $gte: currentMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } }
      ])
    ]);

    const quickStats = {
      totalUsers: totalUsers || 0,
      totalBusinesses: totalBusinesses || 0,
      totalPaidSubscriptions: totalPaidSubscriptions || 0,
      activeBoosts: activeBoosts || 0,
      totalEarnings: totalEarnings[0]?.total || 0,
      currentMonthEarnings: currentMonthEarnings[0]?.total || 0
    };

    return successResponseHelper(res, {
      message: 'Quick statistics fetched successfully',
      data: quickStats
    });

  } catch (error) {
    console.error('Quick stats error:', error);
    return errorResponseHelper(res, { 
      message: 'Failed to fetch quick statistics', 
      code: '00500' 
    });
  }
};
