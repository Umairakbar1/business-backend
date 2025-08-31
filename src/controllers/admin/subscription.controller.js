import Subscription from '../../models/admin/subscription.js';
import PaymentPlan from '../../models/admin/paymentPlan.js';
import Business from '../../models/business/business.js';
import StripeHelper from '../../helpers/stripeHelper.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';

/**
 * Subscription Controller
 * 
 * Handles two types of subscriptions:
 * 
 * 1. BUSINESS SUBSCRIPTIONS (planType: 'business'):
 *    - Lifetime subscriptions with no expiry date
 *    - Include business features (query, review, embedded)
 *    - Have daily boost limits (maxBoostPerDay)
 *    - No need to update boost functionality on purchase
 * 
 * 2. BOOST SUBSCRIPTIONS (planType: 'boost'):
 *    - Temporary subscriptions with expiry time (validityHours)
 *    - No business features, only boost functionality
 *    - No daily limits, just active until expiry
 *    - Include queue management and expiry handling
 */

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

      // Check for existing pending subscription for this business
      const existingPendingSubscription = await Subscription.findOne({
        business: businessId,
        status: 'pending',
        subscriptionType: paymentPlan.planType
      }).populate('paymentPlan');

      if (existingPendingSubscription) {
        // Return existing pending subscription with updated payment intent
        try {
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

          // Create new payment intent for the existing pending subscription
          const paymentIntent = await StripeHelper.createPaymentIntent({
            amount: paymentPlan.price,
            currency: paymentPlan.currency,
            customerId: stripeCustomer.id,
            businessId: business._id.toString(),
            planType: paymentPlan.planType
          });

          // Update existing subscription with new payment plan details
          existingPendingSubscription.paymentPlan = paymentPlanId;
          existingPendingSubscription.amount = paymentPlan.price;
          existingPendingSubscription.currency = paymentPlan.currency;
          existingPendingSubscription.isLifetime = paymentPlan.planType === 'business';
          existingPendingSubscription.expiresAt = paymentPlan.planType === 'boost' ? new Date(Date.now() + (paymentPlan.validityHours || 24) * 60 * 60 * 1000) : null;
          existingPendingSubscription.maxBoostPerDay = paymentPlan.planType === 'business' ? (paymentPlan.maxBoostPerDay || 0) : 0;
          existingPendingSubscription.validityHours = paymentPlan.planType === 'boost' ? (paymentPlan.validityHours || 24) : null;
          existingPendingSubscription.features = paymentPlan.features;
          existingPendingSubscription.metadata = {
            planName: paymentPlan.name,
            businessName: business.businessName
          };
          existingPendingSubscription.stripeCustomerId = stripeCustomer.id;

          await existingPendingSubscription.save();

          return res.status(200).json({
            success: true,
            message: 'Existing pending subscription found and updated',
            data: {
              subscription: existingPendingSubscription,
              clientSecret: paymentIntent.client_secret,
              isExisting: true
            }
          });
        } catch (error) {
          console.error('Error updating existing pending subscription:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to update existing pending subscription',
            error: error.message
          });
        }
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

      // Create subscription in database with pending status initially
      const subscription = new Subscription({
        business: businessId,
        paymentPlan: paymentPlanId,
        subscriptionType: paymentPlan.planType,
        stripeCustomerId: stripeCustomer.id,
        status: 'pending', // Start with pending status
        amount: paymentPlan.price,
        currency: paymentPlan.currency,
        isLifetime: paymentPlan.planType === 'business', // Business plans are lifetime
        expiresAt: paymentPlan.planType === 'boost' ? new Date(Date.now() + (paymentPlan.validityHours || 24) * 60 * 60 * 1000) : null, // Boost plans expire based on validityHours
        maxBoostPerDay: paymentPlan.planType === 'business' ? (paymentPlan.maxBoostPerDay || 0) : 0, // Only business plans have daily boost limits
        validityHours: paymentPlan.planType === 'boost' ? (paymentPlan.validityHours || 24) : null, // Only boost plans have validity hours
        features: paymentPlan.features, // Copy features from payment plan
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
          clientSecret: paymentIntent.client_secret,
          isExisting: false
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
      
      // For boost plans, extend expiration based on validity hours
      if (subscription.subscriptionType === 'boost') {
        const validityHours = subscription.validityHours || 24;
        subscription.expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);
      }
      
      // For business plans, no expiration date needed (lifetime)
      if (subscription.subscriptionType === 'business') {
        subscription.expiresAt = null;
        subscription.isLifetime = true;
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
   * Handle payment success and activate subscription
   */
  static async handlePaymentSuccess(req, res) {
    try {
      const { subscriptionId, paymentIntentId } = req.body;

      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      // Verify payment intent with Stripe
      try {
        const paymentIntent = await StripeHelper.getPaymentIntent(paymentIntentId);
        
        if (paymentIntent.status === 'succeeded') {
          // Update subscription status from pending to active
          subscription.status = 'active';
          subscription.paymentIntentId = paymentIntentId;
          subscription.activatedAt = new Date();
          
          // For boost subscriptions, set expiration date
          if (subscription.subscriptionType === 'boost') {
            const validityHours = subscription.validityHours || 24;
            subscription.expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);
          }
          
          // For business subscriptions, ensure it's lifetime
          if (subscription.subscriptionType === 'business') {
            subscription.isLifetime = true;
            subscription.expiresAt = null;
          }
          
          await subscription.save();

          return res.status(200).json({
            success: true,
            message: 'Subscription activated successfully',
            data: {
              subscription,
              paymentStatus: 'succeeded'
            }
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Payment not completed',
            data: {
              paymentStatus: paymentIntent.status
            }
          });
        }
      } catch (stripeError) {
        console.error('Error verifying payment with Stripe:', stripeError);
        return res.status(500).json({
          success: false,
          message: 'Failed to verify payment with Stripe',
          error: stripeError.message
        });
      }
    } catch (error) {
      console.error('Error handling payment success:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to handle payment success',
        error: error.message
      });
    }
  }

  /**
   * Get pending subscriptions for a business
   */
  static async getPendingSubscriptions(req, res) {
    try {
      const { businessId } = req.params;

      const pendingSubscriptions = await Subscription.find({
        business: businessId,
        status: 'pending'
      }).populate('paymentPlan', 'name planType price features');

      res.status(200).json({
        success: true,
        message: 'Pending subscriptions retrieved successfully',
        data: pendingSubscriptions
      });
    } catch (error) {
      console.error('Error fetching pending subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending subscriptions',
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

      // First check for business subscription (lifetime with daily boost limits)
      const businessSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'business',
        status: 'active'
      }).populate('paymentPlan');

      if (businessSubscription) {
        // Business plans have lifetime access with daily boost limits
        const now = new Date();
        const lastReset = new Date(businessSubscription.boostUsage.lastResetDate);
        const currentDay = now.getDate();
        const lastResetDay = lastReset.getDate();
        
        // Reset counter if new day
        if (currentDay !== lastResetDay || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
          businessSubscription.boostUsage.currentDay = 0;
          businessSubscription.boostUsage.lastResetDate = now;
          await businessSubscription.save();
        }
        
        const maxBoosts = businessSubscription.maxBoostPerDay || 0;
        const canUse = businessSubscription.boostUsage.currentDay < maxBoosts;

        return res.status(200).json({
          success: true,
          canUseBoost: canUse,
          subscriptionType: 'business',
          data: {
            currentUsage: businessSubscription.boostUsage.currentDay,
            maxBoosts: maxBoosts,
            resetDate: businessSubscription.boostUsage.lastResetDate,
            isLifetime: true
          }
        });
      }

      // Check for boost subscription (temporary with expiry)
      const boostSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'active'
      }).populate('paymentPlan');

      if (!boostSubscription) {
        return res.status(200).json({
          success: true,
          canUseBoost: false,
          message: 'No active subscription found'
        });
      }

      // Check if boost subscription is expired
      if (boostSubscription.expiresAt && new Date() > boostSubscription.expiresAt) {
        return res.status(200).json({
          success: true,
          canUseBoost: false,
          message: 'Boost subscription has expired'
        });
      }

      // Boost subscriptions don't have daily limits, they just need to be active and not expired
      return res.status(200).json({
        success: true,
        canUseBoost: true,
        subscriptionType: 'boost',
        data: {
          expiresAt: boostSubscription.expiresAt,
          validityHours: boostSubscription.validityHours,
          isLifetime: false
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

      // First check for business subscription (lifetime with daily boost limits)
      const businessSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'business',
        status: 'active'
      }).populate('paymentPlan');

      if (businessSubscription) {
        // Business plans have lifetime access with daily boost limits
        const now = new Date();
        const lastReset = new Date(businessSubscription.boostUsage.lastResetDate);
        const currentDay = now.getDate();
        const lastResetDay = lastReset.getDate();
        
        // Reset counter if new day
        if (currentDay !== lastResetDay || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
          businessSubscription.boostUsage.currentDay = 0;
          businessSubscription.boostUsage.lastResetDate = now;
          await businessSubscription.save();
        }
        
        const maxBoosts = businessSubscription.maxBoostPerDay || 0;
        const canUse = businessSubscription.boostUsage.currentDay < maxBoosts;
        
        if (!canUse) {
          return res.status(400).json({
            success: false,
            message: 'Daily boost limit reached for business subscription'
          });
        }

        await businessSubscription.incrementBoostUsage();

        return res.status(200).json({
          success: true,
          message: 'Boost used successfully (business subscription)',
          subscriptionType: 'business',
          data: {
            currentUsage: businessSubscription.boostUsage.currentDay,
            maxBoosts: maxBoosts
          }
        });
      }

      // Check for boost subscription (temporary with expiry)
      const boostSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'active'
      }).populate('paymentPlan');

      if (!boostSubscription) {
        return res.status(404).json({
          success: false,
          message: 'No active subscription found'
        });
      }

      // Check if boost subscription is expired
      if (boostSubscription.expiresAt && new Date() > boostSubscription.expiresAt) {
        return res.status(400).json({
          success: false,
          message: 'Boost subscription has expired'
        });
      }

      // Boost subscriptions don't have daily limits, they just need to be active and not expired
      // For boost subscriptions, we don't increment usage since they don't have daily limits
      return res.status(200).json({
        success: true,
        message: 'Boost used successfully (boost subscription)',
        subscriptionType: 'boost',
        data: {
          expiresAt: boostSubscription.expiresAt,
          validityHours: boostSubscription.validityHours
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
   * Check and update expired boosts for all businesses
   */
  static async checkAndUpdateExpiredBoosts(req, res) {
    try {
      const BoostExpiryService = (await import('../../services/boostExpiryService.js')).default;
      const result = await BoostExpiryService.checkAndUpdateExpiredBoosts();
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error checking and updating expired boosts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check and update expired boosts',
        error: error.message
      });
    }
  }

  /**
   * Get boost expiry statistics
   */
  static async getBoostExpiryStats(req, res) {
    try {
      const BoostExpiryService = (await import('../../services/boostExpiryService.js')).default;
      const result = await BoostExpiryService.getBoostExpiryStats();
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting boost expiry stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get boost expiry statistics',
        error: error.message
      });
    }
  }

  /**
   * Manually expire a specific business boost
   */
  static async expireBusinessBoost(req, res) {
    try {
      const { businessId } = req.params;
      const BoostExpiryService = (await import('../../services/boostExpiryService.js')).default;
      const result = await BoostExpiryService.expireBusinessBoost(businessId);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error manually expiring business boost:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to manually expire business boost',
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

  /**
   * Get all business boost subscriptions
   */
  static async getAllBusinessBoostSubscriptions(req, res) {
    try {
      const { status, businessId, page = 1, limit = 10 } = req.query;
      
      const filter = { subscriptionType: 'boost' };
      if (status) filter.status = status;
      if (businessId) filter.business = businessId;

      const skip = (page - 1) * limit;

      const boostSubscriptions = await Subscription.find(filter)
        .populate('business', 'businessName email phone')
        .populate('paymentPlan', 'name planType price features validityHours')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalCount = await Subscription.countDocuments(filter);

      res.status(200).json({
        success: true,
        message: 'Business boost subscriptions retrieved successfully',
        data: {
          subscriptions: boostSubscriptions,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            hasNextPage: page * limit < totalCount,
            hasPrevPage: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching business boost subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch business boost subscriptions',
        error: error.message
      });
    }
  }

  /**
   * Get all paid subscriptions (both business and boost)
   */
  static async getAllPaidSubscriptions(req, res) {
    try {
      const {queryText, subscriptionType, status, businessId, page = 1, limit = 10 } = req.query;

      const filter = { 
        status: { $in: ['active', 'pending'] } // Only paid/active subscriptions
      };
      
      if (subscriptionType) filter.subscriptionType = subscriptionType;
      if (status) filter.status = status;
      if (businessId) filter.business = businessId;

      const skip = (page - 1) * limit;

      // If queryText is provided, use aggregation to search in populated fields
      if (queryText && queryText.trim()) {
        const searchTerm = queryText.trim();
        
        const aggregationPipeline = [
          { $match: filter },
          {
            $lookup: {
              from: 'businesses',
              localField: 'business',
              foreignField: '_id',
              as: 'business'
            }
          },
          {
            $unwind: {
              path: '$business',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'categories',
              localField: 'business.category',
              foreignField: '_id',
              as: 'businessCategory'
            }
          },
          {
            $unwind: {
              path: '$businessCategory',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: {
              $or: [
                { 'business.businessName': { $regex: searchTerm, $options: 'i' } },
                { 'business.businessEmail': { $regex: searchTerm, $options: 'i' } },
                { 'business.businessPhone': { $regex: searchTerm, $options: 'i' } }
              ]
            }
          },
          {
            $lookup: {
              from: 'paymentplans',
              localField: 'paymentPlan',
              foreignField: '_id',
              as: 'paymentPlan'
            }
          },
          {
            $unwind: {
              path: '$paymentPlan',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $sort: { createdAt: -1 }
          },
          {
            $skip: skip
          },
          {
            $limit: parseInt(limit)
          }
        ];

        const paidSubscriptions = await Subscription.aggregate(aggregationPipeline);

        // Get total count for pagination
        const totalCountPipeline = [
          { $match: filter },
          {
            $lookup: {
              from: 'businesses',
              localField: 'business',
              foreignField: '_id',
              as: 'business'
            }
          },
          {
            $unwind: {
              path: '$business',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: {
              $or: [
                { 'business.businessName': { $regex: searchTerm, $options: 'i' } },
                { 'business.businessEmail': { $regex: searchTerm, $options: 'i' } },
                { 'business.businessPhone': { $regex: searchTerm, $options: 'i' } }
              ]
            }
          },
          {
            $count: 'total'
          }
        ];

        const totalResult = await Subscription.aggregate(totalCountPipeline);
        const totalCount = totalResult.length > 0 ? totalResult[0].total : 0;

        // Enhance subscriptions with additional information
        const enhancedSubscriptions = paidSubscriptions.map(sub => {
          const subData = { ...sub };
          
          // Add business category information
          if (sub.businessCategory) {
            subData.businessCategoryName = sub.businessCategory.name || sub.businessCategory.title;
            subData.businessCategoryDescription = sub.businessCategory.description;
          }

          return subData;
        });

        // Calculate summary statistics
        const summaryStats = await Subscription.aggregate([
          { $match: filter },
          {
            $group: {
              _id: '$subscriptionType',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
              avgAmount: { $avg: '$amount' }
            }
          }
        ]);

        const stats = {
          total: totalCount,
          business: summaryStats.find(s => s._id === 'business') || { count: 0, totalAmount: 0, avgAmount: 0 },
          boost: summaryStats.find(s => s._id === 'boost') || { count: 0, totalAmount: 0, avgAmount: 0 }
        };

        successResponseHelper(res, {
          success: true,
          message: 'Paid subscriptions retrieved successfully',
          data: {
            subscriptions: enhancedSubscriptions,
            summary: stats,
            pagination: {
              currentPage: parseInt(page),
              totalPages: Math.ceil(totalCount / limit),
              totalCount,
              hasNextPage: page * limit < totalCount,
              hasPrevPage: page > 1
            }
          }
        });
      } else {
        // No search term, use regular find with populate
        const paidSubscriptions = await Subscription.find(filter)
          .populate({
            path: 'business',
            select: 'businessName businessEmail businessPhone category boostCategory',
            populate: {
              path: 'category',
              select: 'name title description'
            }
          })
          .populate('paymentPlan', 'name planType price features validityHours maxBoostPerDay')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit));

        const totalCount = await Subscription.countDocuments(filter);

        // Enhance subscriptions with additional information
        const enhancedSubscriptions = paidSubscriptions.map(sub => {
          const subData = sub.toObject();
          
          // Add business category information
          if (sub.business?.category && typeof sub.business.category === 'object') {
            subData.businessCategoryName = sub.business.category.name || sub.business.category.title;
            subData.businessCategoryDescription = sub.business.category.description;
          }

          return subData;
        });

        // Calculate summary statistics
        const summaryStats = await Subscription.aggregate([
          { $match: filter },
          {
            $group: {
              _id: '$subscriptionType',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
              avgAmount: { $avg: '$amount' }
            }
          }
        ]);

        const stats = {
          total: totalCount,
          business: summaryStats.find(s => s._id === 'business') || { count: 0, totalAmount: 0, avgAmount: 0 },
          boost: summaryStats.find(s => s._id === 'boost') || { count: 0, totalAmount: 0, avgAmount: 0 }
        };

        successResponseHelper(res, {
          success: true,
          message: 'Paid subscriptions retrieved successfully',
          data: {
            subscriptions: enhancedSubscriptions,
            summary: stats,
            pagination: {
              currentPage: parseInt(page),
              totalPages: Math.ceil(totalCount / limit),
              totalCount,
              hasNextPage: page * limit < totalCount,
              hasPrevPage: page > 1
            }
          }
        });
      }
    } catch (error) {
      console.error('Error fetching paid subscriptions:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch paid subscriptions',
        error: error.message
      });
    }
  }
}

export default SubscriptionController;
