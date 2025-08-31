import BoostQueue from '../../models/business/boostQueue.js';
import Business from '../../models/business/business.js';
import Subscription from '../../models/admin/subscription.js';
import BoostQueueManager from '../../utils/boostQueueManager.js';
import ScheduledTasks from '../../utils/scheduledTasks.js';

class BoostQueueController {
  /**
   * Get all boost queues
   */
  static async getAllBoostQueues(req, res) {
    try {
      const boostQueues = await BoostQueue.find({})
        .populate('category', 'name')
        .populate('queue.business', 'businessName email')
        .populate('queue.businessOwner', 'firstName lastName email')
        .populate('currentlyActive.business', 'businessName email')
        .sort({ categoryName: 1 });

      res.status(200).json({
        success: true,
        message: 'All boost queues retrieved successfully',
        data: boostQueues
      });
    } catch (error) {
      console.error('Error getting all boost queues:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get boost queues',
        error: error.message
      });
    }
  }

  /**
   * Get boost queue for specific category
   */
  static async getBoostQueueByCategory(req, res) {
    try {
      const { categoryId } = req.params;

      const boostQueue = await BoostQueue.findOne({ category: categoryId })
        .populate('category', 'name')
        .populate('queue.business', 'businessName email phoneNumber')
        .populate('queue.businessOwner', 'firstName lastName email')
        .populate('currentlyActive.business', 'businessName email phoneNumber');

      if (!boostQueue) {
        return res.status(404).json({
          success: false,
          message: 'Boost queue not found for this category'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Boost queue retrieved successfully',
        data: boostQueue
      });
    } catch (error) {
      console.error('Error getting boost queue by category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get boost queue',
        error: error.message
      });
    }
  }

  /**
   * Get boost queue statistics
   */
  static async getBoostQueueStats(req, res) {
    try {
      const boostQueues = await BoostQueue.find({});
      
      const stats = {
        totalCategories: boostQueues.length,
        totalQueues: 0,
        totalPending: 0,
        totalActive: 0,
        totalExpired: 0,
        categoriesWithActiveBoosts: 0
      };

      boostQueues.forEach(queue => {
        const pendingCount = queue.queue.filter(item => item.status === 'pending').length;
        const activeCount = queue.queue.filter(item => item.status === 'active').length;
        const expiredCount = queue.queue.filter(item => item.status === 'expired').length;

        stats.totalQueues += queue.queue.length;
        stats.totalPending += pendingCount;
        stats.totalActive += activeCount;
        stats.totalExpired += expiredCount;

        if (queue.currentlyActive.business) {
          stats.categoriesWithActiveBoosts += 1;
        }
      });

      res.status(200).json({
        success: true,
        message: 'Boost queue statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('Error getting boost queue stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get boost queue statistics',
        error: error.message
      });
    }
  }

  /**
   * Get all active boosts across categories
   */
  static async getAllActiveBoosts(req, res) {
    try {
      const activeBoosts = await BoostQueueManager.getAllActiveBoosts();

      res.status(200).json({
        success: true,
        message: 'Active boosts retrieved successfully',
        data: activeBoosts
      });
    } catch (error) {
      console.error('Error getting all active boosts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active boosts',
        error: error.message
      });
    }
  }

  /**
   * Manually trigger boost expiry check
   */
  static async triggerExpiryCheck(req, res) {
    try {
      await ScheduledTasks.triggerBoostExpiryCheck();

      res.status(200).json({
        success: true,
        message: 'Boost expiry check triggered successfully'
      });
    } catch (error) {
      console.error('Error triggering boost expiry check:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger boost expiry check',
        error: error.message
      });
    }
  }

  /**
   * Get business queue status (admin view)
   */
  static async getBusinessQueueStatus(req, res) {
    try {
      const { businessId } = req.params;

      const business = await Business.findById(businessId).populate('category');
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      const queueStatus = await BoostQueueManager.getBusinessQueueStatus(businessId);
      
      if (!queueStatus) {
        return res.status(404).json({
          success: false,
          message: 'Business not found in any boost queue'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Business queue status retrieved successfully',
        data: {
          business: {
            _id: business._id,
            businessName: business.businessName,
            email: business.email,
            category: business.category
          },
          queueStatus
        }
      });
    } catch (error) {
      console.error('Error getting business queue status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get business queue status',
        error: error.message
      });
    }
  }

  /**
   * Remove business from queue (admin action)
   */
  static async removeBusinessFromQueue(req, res) {
    try {
      const { businessId } = req.params;

      const business = await Business.findById(businessId).populate('category');
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      // Find boost queue for this category
      const boostQueue = await BoostQueue.findOne({ category: business.category._id });
      if (!boostQueue) {
        return res.status(404).json({
          success: false,
          message: 'No boost queue found for this category'
        });
      }

      // Remove business from queue
      const removed = await boostQueue.removeFromQueue(businessId);
      if (!removed) {
        return res.status(404).json({
          success: false,
          message: 'Business not found in queue or already active/expired'
        });
      }

      // Update subscription status
      await Subscription.findOneAndUpdate(
        { business: businessId, subscriptionType: 'boost' },
        { 
          status: 'canceled',
          'boostQueueInfo.queuePosition': null,
          'boostQueueInfo.estimatedStartTime': null,
          'boostQueueInfo.estimatedEndTime': null
        }
      );

      res.status(200).json({
        success: true,
        message: 'Business removed from boost queue successfully',
        data: {
          business: {
            _id: business._id,
            businessName: business.businessName,
            category: business.category
          },
          queuePosition: null
        }
      });
    } catch (error) {
      console.error('Error removing business from queue:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove business from queue',
        error: error.message
      });
    }
  }

  /**
   * Get queue details for a specific business
   */
  static async getBusinessQueueDetails(req, res) {
    try {
      const { businessId } = req.params;

      const business = await Business.findById(businessId).populate('category');
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      // Find boost subscription
      const subscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost'
      });

      // Find boost queue
      const boostQueue = await BoostQueue.findOne({ category: business.category._id })
        .populate('queue.business', 'businessName email')
        .populate('queue.businessOwner', 'firstName lastName email');

      if (!boostQueue) {
        return res.status(404).json({
          success: false,
          message: 'No boost queue found for this category'
        });
      }

      // Find business in queue
      const queueItem = boostQueue.queue.find(item => 
        item.business.toString() === businessId
      );

      const queuePosition = boostQueue.getQueuePosition(businessId);
      const estimatedStartTime = boostQueue.getEstimatedStartTime(businessId);
      const isCurrentlyActive = boostQueue.isBusinessActive(businessId);

      res.status(200).json({
        success: true,
        message: 'Business queue details retrieved successfully',
        data: {
          business: {
            _id: business._id,
            businessName: business.businessName,
            email: business.email,
            category: business.category
          },
          subscription: subscription ? {
            _id: subscription._id,
            status: subscription.status,
            boostQueueInfo: subscription.boostQueueInfo
          } : null,
          queueDetails: {
            position: queuePosition,
            estimatedStartTime,
            estimatedEndTime: estimatedStartTime ? new Date(estimatedStartTime.getTime() + 24 * 60 * 60 * 1000) : null,
            isCurrentlyActive,
            totalInQueue: boostQueue.queue.filter(item => item.status === 'pending').length,
            queueItem: queueItem ? {
              status: queueItem.status,
              createdAt: queueItem.createdAt,
              boostStartTime: queueItem.boostStartTime,
              boostEndTime: queueItem.boostEndTime
            } : null
          },
          queueInfo: {
            categoryName: business.category.name,
            currentlyActive: boostQueue.currentlyActive.business ? {
              business: boostQueue.currentlyActive.business,
              startTime: boostQueue.currentlyActive.boostStartTime,
              endTime: boostQueue.currentlyActive.boostEndTime
            } : null
          }
        }
      });
    } catch (error) {
      console.error('Error getting business queue details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get business queue details',
        error: error.message
      });
    }
  }
}

export default BoostQueueController;
