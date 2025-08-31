import Business from '../models/business/business.js';
import Subscription from '../models/admin/subscription.js';
import BoostQueue from '../models/business/boostQueue.js';
import BoostQueueManager from '../utils/boostQueueManager.js';

/**
 * Boost Expiry Service
 * 
 * Handles automatic checking and updating of expired boost subscriptions
 * This service should be run periodically (e.g., every hour) to ensure
 * business boost status is kept up to date
 */
class BoostExpiryService {
  /**
   * Check and update expired boosts for all businesses
   */
  static async checkAndUpdateExpiredBoosts() {
    try {
      console.log('Starting boost expiry check...');
      
      // Find all businesses with active boosts
      const businessesWithBoosts = await Business.find({
        isBoosted: true,
        isBoostActive: true,
        boostExpiryAt: { $ne: null }
      });

      const now = new Date();
      let updatedCount = 0;

      for (const business of businessesWithBoosts) {
        if (business.boostExpiryAt && now > business.boostExpiryAt) {
          console.log(`Expiring boost for business: ${business.businessName} (${business._id})`);
          
          // Update business boost status
          business.isBoosted = false;
          business.isBoostActive = false;
          business.boostExpiryAt = null;
          
          await business.save();
          updatedCount++;

          // Update subscription status if exists
          if (business.boostSubscriptionId) {
            const subscription = await Subscription.findById(business.boostSubscriptionId);
            if (subscription) {
              subscription.status = 'inactive';
              subscription['boostQueueInfo.isCurrentlyActive'] = false;
              subscription['boostQueueInfo.boostStartTime'] = null;
              subscription['boostQueueInfo.boostEndTime'] = null;
              await subscription.save();
            }
          }

          // Update boost queue if this business was active
          const boostQueue = await BoostQueue.findOne({
            'currentlyActive.business': business._id
          });
          
          if (boostQueue) {
            await boostQueue.expireCurrentBoost();
            console.log(`Boost queue updated for business: ${business.businessName}`);
          }
        }
      }

      // Also check boost queues for any expired boosts
      await BoostQueueManager.checkAndExpireBoosts();

      console.log(`Boost expiry check completed. Updated ${updatedCount} businesses.`);
      return updatedCount;
    } catch (error) {
      console.error('Error checking boost expiry:', error);
      throw error;
    }
  }

  /**
   * Activate next business in boost queue for a specific category
   */
  static async activateNextBusinessInQueue(categoryId) {
    try {
      const boostQueue = await BoostQueue.findOne({ category: categoryId });
      if (!boostQueue) {
        console.log(`No boost queue found for category: ${categoryId}`);
        return null;
      }

      // Check if current boost has expired
      if (boostQueue.currentlyActive.business && boostQueue.currentlyActive.boostEndTime) {
        const now = new Date();
        const endTime = new Date(boostQueue.currentlyActive.boostEndTime);
        
        if (now > endTime) {
          console.log(`Current boost expired for category: ${categoryId}`);
          await boostQueue.expireCurrentBoost();
          
          // Update business status
          if (boostQueue.currentlyActive.business) {
            await Business.findByIdAndUpdate(boostQueue.currentlyActive.business, {
              isBoosted: false,
              isBoostActive: false,
              boostExpiryAt: null
            });
          }
        }
      }

      // Activate next business if available
      const nextBusiness = boostQueue.queue.find(item => item.status === 'pending');
      if (nextBusiness) {
        await boostQueue.activateNext();
        
        // Update new active business
        if (boostQueue.currentlyActive.business) {
          await Business.findByIdAndUpdate(boostQueue.currentlyActive.business, {
            isBoosted: true,
            isBoostActive: true,
            boostExpiryAt: boostQueue.currentlyActive.boostEndTime
          });

          // Update subscription
          if (boostQueue.currentlyActive.subscription) {
            await Subscription.findByIdAndUpdate(boostQueue.currentlyActive.subscription, {
              'boostQueueInfo.isCurrentlyActive': true,
              'boostQueueInfo.boostStartTime': boostQueue.currentlyActive.boostStartTime,
              'boostQueueInfo.boostEndTime': boostQueue.currentlyActive.boostEndTime,
              'boostQueueInfo.queuePosition': 0
            });
          }
        }

        console.log(`Activated next business in queue for category: ${categoryId}`);
        return boostQueue.currentlyActive.business;
      }

      return null;
    } catch (error) {
      console.error('Error activating next business in queue:', error);
      throw error;
    }
  }

  /**
   * Get boost status for a business
   */
  static async getBusinessBoostStatus(businessId) {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        return null;
      }

      const boostSubscription = business.boostSubscriptionId ? 
        await Subscription.findById(business.boostSubscriptionId) : null;

      return {
        business: {
          _id: business._id,
          businessName: business.businessName,
          isBoosted: business.isBoosted,
          isBoostActive: business.isBoostActive,
          boostExpiryAt: business.boostExpiryAt
        },
        subscription: boostSubscription ? {
          _id: boostSubscription._id,
          status: boostSubscription.status,
          expiresAt: boostSubscription.expiresAt,
          boostQueueInfo: boostSubscription.boostQueueInfo
        } : null
      };
    } catch (error) {
      console.error('Error getting business boost status:', error);
      return null;
    }
  }

  /**
   * Schedule boost expiry check (to be called by cron job)
   */
  static scheduleBoostExpiryCheck() {
    // This should be called every minute or every 5 minutes
    setInterval(async () => {
      try {
        await this.checkAndUpdateExpiredBoosts();
      } catch (error) {
        console.error('Scheduled boost expiry check failed:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
}

export default BoostExpiryService;
