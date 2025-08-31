import BoostQueue from '../models/business/boostQueue.js';
import Business from '../models/business/business.js';
import Subscription from '../models/admin/subscription.js';

class BoostQueueManager {
  /**
   * Check and expire boosts that have passed their end time
   */
  static async checkAndExpireBoosts() {
    try {
      console.log('Checking for expired boosts...');
      
      // Find all boost queues
      const boostQueues = await BoostQueue.find({});
      
      for (const boostQueue of boostQueues) {
        // Check if current boost has expired
        if (boostQueue.currentlyActive.business && boostQueue.currentlyActive.boostEndTime) {
          const now = new Date();
          const endTime = new Date(boostQueue.currentlyActive.boostEndTime);
          
          if (now > endTime) {
            console.log(`Expiring boost for business ${boostQueue.currentlyActive.business} in category ${boostQueue.categoryName}`);
            
            // Expire current boost and activate next
            await boostQueue.expireCurrentBoost();
            
            // Update business boost status
            await Business.findByIdAndUpdate(boostQueue.currentlyActive.business, {
              isBoosted: false,
              isBoostActive: false,
              boostExpiryAt: null
            });
            
            // Update subscription status
            if (boostQueue.currentlyActive.subscription) {
              await Subscription.findByIdAndUpdate(boostQueue.currentlyActive.subscription, {
                'boostQueueInfo.isCurrentlyActive': false,
                'boostQueueInfo.boostStartTime': null,
                'boostQueueInfo.boostEndTime': null
              });
            }
            
            // If there's a new active business, update its status
            if (boostQueue.currentlyActive.business) {
              await Business.findByIdAndUpdate(boostQueue.currentlyActive.business, {
                isBoosted: true,
                isBoostActive: true,
                boostExpiryAt: boostQueue.currentlyActive.boostEndTime
              });
              
              await Subscription.findByIdAndUpdate(boostQueue.currentlyActive.subscription, {
                'boostQueueInfo.isCurrentlyActive': true,
                'boostQueueInfo.boostStartTime': boostQueue.currentlyActive.boostStartTime,
                'boostQueueInfo.boostEndTime': boostQueue.currentlyActive.boostEndTime,
                'boostQueueInfo.queuePosition': 0
              });
            }
          }
        }
      }
      
      console.log('Boost expiry check completed');
    } catch (error) {
      console.error('Error checking boost expiry:', error);
    }
  }

  /**
   * Get boost queue status for a business
   */
  static async getBusinessQueueStatus(businessId) {
    try {
      const business = await Business.findById(businessId).populate('category');
      if (!business) {
        return null;
      }

      const boostQueue = await BoostQueue.findOne({ category: business.category._id });
      if (!boostQueue) {
        return null;
      }

      const position = boostQueue.getQueuePosition(businessId);
      const estimatedStartTime = boostQueue.getEstimatedStartTime(businessId);
      const isCurrentlyActive = boostQueue.isBusinessActive(businessId);
      const timeRemaining = boostQueue.getCurrentBoostTimeRemaining();

      return {
        position,
        estimatedStartTime,
        estimatedEndTime: estimatedStartTime ? new Date(estimatedStartTime.getTime() + 24 * 60 * 60 * 1000) : null,
        isCurrentlyActive,
        timeRemaining: isCurrentlyActive ? timeRemaining : null,
        totalInQueue: boostQueue.queue.filter(item => item.status === 'pending').length,
        categoryName: business.category.name
      };
    } catch (error) {
      console.error('Error getting business queue status:', error);
      return null;
    }
  }

  /**
   * Calculate time until boost activation
   */
  static calculateTimeUntilActivation(estimatedStartTime) {
    if (!estimatedStartTime) return null;
    
    const now = new Date();
    const startTime = new Date(estimatedStartTime);
    const diff = startTime - now;
    
    if (diff <= 0) return 0;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      total: diff,
      days,
      hours,
      minutes,
      formatted: `${days}d ${hours}h ${minutes}m`
    };
  }

  /**
   * Get all active boosts across all categories
   */
  static async getAllActiveBoosts() {
    try {
      const boostQueues = await BoostQueue.find({
        'currentlyActive.business': { $ne: null }
      }).populate('category');

      return boostQueues.map(queue => ({
        category: queue.category,
        categoryName: queue.categoryName,
        business: queue.currentlyActive.business,
        boostStartTime: queue.currentlyActive.boostStartTime,
        boostEndTime: queue.currentlyActive.boostEndTime,
        timeRemaining: queue.getCurrentBoostTimeRemaining()
      }));
    } catch (error) {
      console.error('Error getting all active boosts:', error);
      return [];
    }
  }

  /**
   * Get queue statistics for a category
   */
  static async getCategoryQueueStats(categoryId) {
    try {
      const boostQueue = await BoostQueue.findOne({ category: categoryId });
      if (!boostQueue) {
        return null;
      }

      const pendingCount = boostQueue.queue.filter(item => item.status === 'pending').length;
      const activeCount = boostQueue.queue.filter(item => item.status === 'active').length;
      const expiredCount = boostQueue.queue.filter(item => item.status === 'expired').length;

      return {
        categoryName: boostQueue.categoryName,
        totalInQueue: boostQueue.queue.length,
        pending: pendingCount,
        active: activeCount,
        expired: expiredCount,
        currentlyActive: boostQueue.currentlyActive.business ? {
          business: boostQueue.currentlyActive.business,
          startTime: boostQueue.currentlyActive.boostStartTime,
          endTime: boostQueue.currentlyActive.boostEndTime,
          timeRemaining: boostQueue.getCurrentBoostTimeRemaining()
        } : null
      };
    } catch (error) {
      console.error('Error getting category queue stats:', error);
      return null;
    }
  }
}

export default BoostQueueManager;
