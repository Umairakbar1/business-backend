import Subscription from '../../models/admin/subscription.js';
import PaymentPlan from '../../models/admin/paymentPlan.js';
import Business from '../../models/business/business.js';
import StripeHelper from '../../helpers/stripeHelper.js';

class SubscriptionController {
  /**
   * Create a new subscription
   */
  static async createSubscription(req, res) {
    try {

      const {
        businessId,
        paymentPlanId,
        customerEmail,
        customerName
      } = req.body;

      // Get payment plan
      const paymentPlan = await PaymentPlan.findById(paymentPlanId);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      // Get business
      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      // Create or get Stripe customer
      let stripeCustomer;
      try {
        stripeCustomer = await StripeHelper.getCustomer(business.stripeCustomerId);
      } catch (error) {
        // Create new customer if doesn't exist
        stripeCustomer = await StripeHelper.createCustomer({
          email: customerEmail,
          name: customerName,
          businessId: business._id.toString(),
          userId: business.owner.toString()
        });
        
        // Update business with Stripe customer ID
        business.stripeCustomerId = stripeCustomer.id;
        await business.save();
      }

      // Create payment intent for one-time payment
      const paymentIntent = await StripeHelper.createPaymentIntent({
        amount: paymentPlan.price,
        currency: paymentPlan.currency,
        customerId: stripeCustomer.id,
        businessId: business._id.toString(),
        planType: paymentPlan.planType
      });

      // Create subscription in database
      const subscription = new Subscription({
        business: businessId,
        paymentPlan: paymentPlanId,
        subscriptionType: paymentPlan.planType,
        stripeCustomerId: stripeCustomer.id,
        status: 'active',
        amount: paymentPlan.price,
        currency: paymentPlan.currency,
        isLifetime: paymentPlan.planType === 'business', // Business plans are lifetime
        expiresAt: paymentPlan.planType === 'boost' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null, // Boost plans expire in 24 hours
        metadata: {
          planName: paymentPlan.name,
          businessName: business.businessName
        }
      });

      await subscription.save();

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: {
          subscription,
          clientSecret: paymentIntent.client_secret
        }
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create subscription',
        error: error.message
      });
    }
  }

  /**
   * Get all subscriptions
   */
  static async getAllSubscriptions(req, res) {
    try {
      const { businessId, subscriptionType, status } = req.query;
      
      const filter = {};
      if (businessId) filter.business = businessId;
      if (subscriptionType) filter.subscriptionType = subscriptionType;
      if (status) filter.status = status;

      const subscriptions = await Subscription.find(filter)
        .populate('business', 'businessName email')
        .populate('paymentPlan', 'name planType price features')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        message: 'Subscriptions retrieved successfully',
        data: subscriptions
      });
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscriptions',
        error: error.message
      });
    }
  }

  /**
   * Get subscription by ID
   */
  static async getSubscriptionById(req, res) {
    try {
      const { id } = req.params;
      
      const subscription = await Subscription.findById(id)
        .populate('business', 'businessName email')
        .populate('paymentPlan', 'name planType price features');
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Subscription retrieved successfully',
        data: subscription
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription',
        error: error.message
      });
    }
  }

  /**
   * Get business subscriptions
   */
  static async getBusinessSubscriptions(req, res) {
    try {
      const { businessId } = req.params;

      const subscriptions = await Subscription.find({ business: businessId })
        .populate('paymentPlan', 'name planType price features')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        message: 'Business subscriptions retrieved successfully',
        data: subscriptions
      });
    } catch (error) {
      console.error('Error fetching business subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch business subscriptions',
        error: error.message
      });
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findById(id);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      // Update in database
      subscription.status = 'inactive';
      await subscription.save();

      res.status(200).json({
        success: true,
        message: 'Subscription canceled successfully',
        data: subscription
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel subscription',
        error: error.message
      });
    }
  }

  /**
   * Reactivate subscription
   */
  static async reactivateSubscription(req, res) {
    try {
      const { id } = req.params;

      const subscription = await Subscription.findById(id);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      // Update in database
      subscription.status = 'active';
      
      // For boost plans, extend expiration by 24 hours
      if (subscription.subscriptionType === 'boost') {
        subscription.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
      
      await subscription.save();

      res.status(200).json({
        success: true,
        message: 'Subscription reactivated successfully',
        data: subscription
      });
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reactivate subscription',
        error: error.message
      });
    }
  }

  /**
   * Update subscription from Stripe webhook
   */
  static async updateSubscriptionFromWebhook(req, res) {
    try {
      const { subscriptionId, status, currentPeriodStart, currentPeriodEnd } = req.body;

      const subscription = await Subscription.findOne({
        _id: subscriptionId
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      // Update subscription
      subscription.status = status;
      subscription.currentPeriodStart = new Date(currentPeriodStart * 1000);
      subscription.currentPeriodEnd = new Date(currentPeriodEnd * 1000);
      await subscription.save();

      res.status(200).json({
        success: true,
        message: 'Subscription updated successfully'
      });
    } catch (error) {
      console.error('Error updating subscription from webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update subscription',
        error: error.message
      });
    }
  }

  /**
   * Check if business can use boost
   */
  static async checkBoostAvailability(req, res) {
    try {
      const { businessId } = req.params;

      const boostSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'active'
      }).populate('paymentPlan');

      if (!boostSubscription) {
        return res.status(200).json({
          success: true,
          canUseBoost: false,
          message: 'No active boost subscription found'
        });
      }

      // Check if boost is available (daily limit)
      const now = new Date();
      const lastReset = new Date(boostSubscription.boostUsage.lastResetDate);
      const currentDay = now.getDate();
      const lastResetDay = lastReset.getDate();
      
      // Reset counter if new day
      if (currentDay !== lastResetDay || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        boostSubscription.boostUsage.currentDay = 0;
        boostSubscription.boostUsage.lastResetDate = now;
        await boostSubscription.save();
      }
      
      const maxBoosts = boostSubscription.paymentPlan.maxBoostPerDay || 0;
      const canUse = boostSubscription.boostUsage.currentDay < maxBoosts;

      res.status(200).json({
        success: true,
        canUseBoost: canUse,
        data: {
          currentUsage: boostSubscription.boostUsage.currentDay,
          maxBoosts: maxBoosts,
          resetDate: boostSubscription.boostUsage.lastResetDate
        }
      });
    } catch (error) {
      console.error('Error checking boost availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check boost availability',
        error: error.message
      });
    }
  }

  /**
   * Use boost
   */
  static async useBoost(req, res) {
    try {
      const { businessId } = req.params;

      const boostSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'active'
      }).populate('paymentPlan');

      if (!boostSubscription) {
        return res.status(404).json({
          success: false,
          message: 'No active boost subscription found'
        });
      }

      // Check if boost is available (daily limit)
      const now = new Date();
      const lastReset = new Date(boostSubscription.boostUsage.lastResetDate);
      const currentDay = now.getDate();
      const lastResetDay = lastReset.getDate();
      
      // Reset counter if new day
      if (currentDay !== lastResetDay || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        boostSubscription.boostUsage.currentDay = 0;
        boostSubscription.boostUsage.lastResetDate = now;
        await boostSubscription.save();
      }
      
      const maxBoosts = boostSubscription.paymentPlan.maxBoostPerDay || 0;
      const canUse = boostSubscription.boostUsage.currentDay < maxBoosts;
      
      if (!canUse) {
        return res.status(400).json({
          success: false,
          message: 'Daily boost limit reached'
        });
      }

      await boostSubscription.incrementBoostUsage();

      res.status(200).json({
        success: true,
        message: 'Boost used successfully',
        data: {
          currentUsage: boostSubscription.boostUsage.currentDay
        }
      });
    } catch (error) {
      console.error('Error using boost:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to use boost',
        error: error.message
      });
    }
  }

  /**
   * Get subscription statistics
   */
  static async getSubscriptionStats(req, res) {
    try {
      const totalSubscriptions = await Subscription.countDocuments();
      const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
      const businessSubscriptions = await Subscription.countDocuments({ subscriptionType: 'business' });
      const boostSubscriptions = await Subscription.countDocuments({ subscriptionType: 'boost' });

      const stats = {
        total: totalSubscriptions,
        active: activeSubscriptions,
        business: businessSubscriptions,
        boost: boostSubscriptions,
        inactive: totalSubscriptions - activeSubscriptions
      };

      res.status(200).json({
        success: true,
        message: 'Subscription statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription statistics',
        error: error.message
      });
    }
  }
}

export default SubscriptionController;
