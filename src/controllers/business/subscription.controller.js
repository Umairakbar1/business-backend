import Subscription from '../../models/admin/subscription.js';
import PaymentPlan from '../../models/admin/paymentPlan.js';
import Business from '../../models/business/business.js';
import StripeHelper from '../../helpers/stripeHelper.js';

class BusinessSubscriptionController {
  /**
   * Subscribe to a payment plan
   */
  static async subscribeToPlan(req, res) {
    try {
      const { businessId } = req.params;
      const { paymentPlanId } = req.body;

      // Verify business exists and user has access
      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      // Get payment plan
      const paymentPlan = await PaymentPlan.findById(paymentPlanId);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      if (!paymentPlan.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Payment plan is not active'
        });
      }

      // Check if business already has an active subscription of the same type
      const existingSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: paymentPlan.planType,
        status: 'active'
      });

      if (existingSubscription) {
        return res.status(400).json({
          success: false,
          message: `Business already has an active ${paymentPlan.planType} subscription`
        });
      }

      // Create or get Stripe customer
      let stripeCustomer;
      try {
        if (business.stripeCustomerId) {
          stripeCustomer = await StripeHelper.getCustomer(business.stripeCustomerId);
        } else {
          // Create new customer
          stripeCustomer = await StripeHelper.createCustomer({
            email: business.email,
            name: business.businessName,
            businessId: business._id.toString(),
            userId: business.owner.toString()
          });
          
          // Update business with Stripe customer ID
          business.stripeCustomerId = stripeCustomer.id;
          await business.save();
        }
      } catch (error) {
        // Create new customer if retrieval fails
        stripeCustomer = await StripeHelper.createCustomer({
          email: business.email,
          name: business.businessName,
          businessId: business._id.toString(),
          userId: business.owner.toString()
        });
        
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
        status: 'pending', // Will be updated to 'active' after payment confirmation
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
        message: 'Subscription created successfully. Please complete payment.',
        data: {
          subscription,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id
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
   * Upgrade business plan
   */
  static async upgradeBusinessPlan(req, res) {
    try {
      const { businessId } = req.params;
      const { newPaymentPlanId } = req.body;

      // Verify business exists
      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      // Get new payment plan
      const newPaymentPlan = await PaymentPlan.findById(newPaymentPlanId);
      if (!newPaymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      if (newPaymentPlan.planType !== 'business') {
        return res.status(400).json({
          success: false,
          message: 'Can only upgrade to business plans'
        });
      }

      // Check if business has an active business subscription
      const currentSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'business',
        status: 'active'
      });

      if (!currentSubscription) {
        return res.status(400).json({
          success: false,
          message: 'No active business subscription found to upgrade'
        });
      }

      // Create payment intent for upgrade
      const paymentIntent = await StripeHelper.createPaymentIntent({
        amount: newPaymentPlan.price,
        currency: newPaymentPlan.currency,
        customerId: currentSubscription.stripeCustomerId,
        businessId: business._id.toString(),
        planType: 'business'
      });

      // Create new subscription (will replace old one after payment)
      const newSubscription = new Subscription({
        business: businessId,
        paymentPlan: newPaymentPlanId,
        subscriptionType: 'business',
        stripeCustomerId: currentSubscription.stripeCustomerId,
        status: 'pending',
        amount: newPaymentPlan.price,
        currency: newPaymentPlan.currency,
        isLifetime: true,
        metadata: {
          planName: newPaymentPlan.name,
          businessName: business.businessName,
          upgradeFrom: currentSubscription.paymentPlan.toString()
        }
      });

      await newSubscription.save();

      res.status(200).json({
        success: true,
        message: 'Business plan upgrade initiated. Please complete payment.',
        data: {
          currentSubscription,
          newSubscription,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id
        }
      });
    } catch (error) {
      console.error('Error upgrading business plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upgrade business plan',
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

      // Verify business exists
      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      const subscriptions = await Subscription.find({ business: businessId })
        .populate('paymentPlan', 'name planType price features maxBusinesses maxReviews maxBoostPerDay')
        .sort({ createdAt: -1 });

      // Separate business and boost subscriptions
      const businessSubscriptions = subscriptions.filter(sub => sub.subscriptionType === 'business');
      const boostSubscriptions = subscriptions.filter(sub => sub.subscriptionType === 'boost');

      res.status(200).json({
        success: true,
        message: 'Business subscriptions retrieved successfully',
        data: {
          business: businessSubscriptions,
          boost: boostSubscriptions,
          all: subscriptions
        }
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
   * Get active business plan
   */
  static async getActiveBusinessPlan(req, res) {
    try {
      const { businessId } = req.params;

      const activeSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'business',
        status: 'active'
      }).populate('paymentPlan', 'name planType price features maxBusinesses maxReviews');

      if (!activeSubscription) {
        return res.status(200).json({
          success: true,
          hasActivePlan: false,
          message: 'No active business plan found'
        });
      }

      res.status(200).json({
        success: true,
        hasActivePlan: true,
        data: activeSubscription
      });
    } catch (error) {
      console.error('Error fetching active business plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active business plan',
        error: error.message
      });
    }
  }

  /**
   * Get active boost plan
   */
  static async getActiveBoostPlan(req, res) {
    try {
      const { businessId } = req.params;

      const activeSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'active'
      }).populate('paymentPlan', 'name planType price features maxBoostPerDay');

      if (!activeSubscription) {
        return res.status(200).json({
          success: true,
          hasActivePlan: false,
          message: 'No active boost plan found'
        });
      }

      // Check if boost plan is expired
      const isExpired = activeSubscription.expiresAt && new Date() > activeSubscription.expiresAt;
      if (isExpired) {
        activeSubscription.status = 'inactive';
        await activeSubscription.save();
        
        return res.status(200).json({
          success: true,
          hasActivePlan: false,
          message: 'Boost plan has expired'
        });
      }

      res.status(200).json({
        success: true,
        hasActivePlan: true,
        data: activeSubscription
      });
    } catch (error) {
      console.error('Error fetching active boost plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active boost plan',
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

      // Check if expired
      if (boostSubscription.expiresAt && new Date() > boostSubscription.expiresAt) {
        boostSubscription.status = 'inactive';
        await boostSubscription.save();
        
        return res.status(200).json({
          success: true,
          canUseBoost: false,
          message: 'Boost plan has expired'
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
          resetDate: boostSubscription.boostUsage.lastResetDate,
          expiresAt: boostSubscription.expiresAt
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
      });

      if (!boostSubscription) {
        return res.status(404).json({
          success: false,
          message: 'No active boost subscription found'
        });
      }

      // Check if expired
      if (boostSubscription.expiresAt && new Date() > boostSubscription.expiresAt) {
        boostSubscription.status = 'inactive';
        await boostSubscription.save();
        
        return res.status(400).json({
          success: false,
          message: 'Boost plan has expired'
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
          currentUsage: boostSubscription.boostUsage.currentDay,
          maxBoosts: boostSubscription.paymentPlan.maxBoostPerDay
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
   * Cancel subscription
   */
  static async cancelSubscription(req, res) {
    try {
      const { businessId, subscriptionId } = req.params;

      const subscription = await Subscription.findOne({
        _id: subscriptionId,
        business: businessId
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

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
   * Get available payment plans
   */
  static async getAvailablePlans(req, res) {
    try {
      const { businessId } = req.params;
      const { planType } = req.query;

      // Verify business exists
      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      const filter = { isActive: true };
      if (planType) filter.planType = planType;

      const paymentPlans = await PaymentPlan.find(filter)
        .sort({ sortOrder: 1, price: 1 });

      // Get current subscriptions to show upgrade options
      const currentSubscriptions = await Subscription.find({
        business: businessId,
        status: 'active'
      }).populate('paymentPlan', 'name planType price');

      res.status(200).json({
        success: true,
        message: 'Available payment plans retrieved successfully',
        data: {
          plans: paymentPlans,
          currentSubscriptions
        }
      });
    } catch (error) {
      console.error('Error fetching available plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available plans',
        error: error.message
      });
    }
  }

  /**
   * Get all business payment plans
   */
  static async getAllBusinessPaymentPlans(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists
      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      // Get all active business payment plans
      const businessPlans = await PaymentPlan.find({
        planType: 'business',
        isActive: true
      }).sort({ sortOrder: 1, price: 1 });

      // Get current business subscription if any
      const currentBusinessSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'business',
        status: 'active'
      }).populate('paymentPlan', 'name planType price features maxBusinesses maxReviews');

      // Get all business subscriptions for this business
      const allBusinessSubscriptions = await Subscription.find({
        business: businessId,
        subscriptionType: 'business'
      }).populate('paymentPlan', 'name planType price features maxBusinesses maxReviews')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        message: 'Business payment plans retrieved successfully',
        data: {
          plans: businessPlans,
          currentSubscription: currentBusinessSubscription,
          allSubscriptions: allBusinessSubscriptions,
          totalPlans: businessPlans.length
        }
      });
    } catch (error) {
      console.error('Error fetching business payment plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch business payment plans',
        error: error.message
      });
    }
  }

  /**
   * Get all boost payment plans
   */
  static async getAllBoostPaymentPlans(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists
      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      // Get all active boost payment plans
      const boostPlans = await PaymentPlan.find({
        planType: 'boost',
        isActive: true
      }).sort({ sortOrder: 1, price: 1 });

      // Get current boost subscription if any
      const currentBoostSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'active'
      }).populate('paymentPlan', 'name planType price features maxBoostPerDay');

      // Get all boost subscriptions for this business
      const allBoostSubscriptions = await Subscription.find({
        business: businessId,
        subscriptionType: 'boost'
      }).populate('paymentPlan', 'name planType price features maxBoostPerDay')
        .sort({ createdAt: -1 });

      // Check if any boost plans are available for purchase
      const availablePlans = boostPlans.map(plan => {
        const planObj = plan.toObject();
        
        // Check if this plan is currently active for the business
        const isCurrentlyActive = currentBoostSubscription && 
          currentBoostSubscription.paymentPlan._id.toString() === plan._id.toString();
        
        // Check if plan is expired
        const isExpired = currentBoostSubscription && 
          currentBoostSubscription.expiresAt && 
          new Date() > currentBoostSubscription.expiresAt;

        return {
          ...planObj,
          isCurrentlyActive,
          isExpired,
          canPurchase: !isCurrentlyActive || isExpired
        };
      });

      res.status(200).json({
        success: true,
        message: 'Boost payment plans retrieved successfully',
        data: {
          plans: availablePlans,
          currentSubscription: currentBoostSubscription,
          allSubscriptions: allBoostSubscriptions,
          totalPlans: boostPlans.length,
          hasActiveBoost: !!currentBoostSubscription && 
            (!currentBoostSubscription.expiresAt || new Date() <= currentBoostSubscription.expiresAt)
        }
      });
    } catch (error) {
      console.error('Error fetching boost payment plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch boost payment plans',
        error: error.message
      });
    }
  }

  /**
   * Get all payment plans (both business and boost)
   */
  static async getAllPaymentPlans(req, res) {
    try {
      const { businessId } = req.params;

      // Verify business exists
      const business = await Business.findById(businessId);
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      // Get all active payment plans
      const allPlans = await PaymentPlan.find({ isActive: true })
        .sort({ planType: 1, sortOrder: 1, price: 1 });

      // Separate plans by type
      const businessPlans = allPlans.filter(plan => plan.planType === 'business');
      const boostPlans = allPlans.filter(plan => plan.planType === 'boost');

      // Get current subscriptions
      const currentBusinessSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'business',
        status: 'active'
      }).populate('paymentPlan', 'name planType price features maxBusinesses maxReviews');

      const currentBoostSubscription = await Subscription.findOne({
        business: businessId,
        subscriptionType: 'boost',
        status: 'active'
      }).populate('paymentPlan', 'name planType price features maxBoostPerDay');

      // Get all subscriptions for this business
      const allSubscriptions = await Subscription.find({
        business: businessId
      }).populate('paymentPlan', 'name planType price features maxBusinesses maxReviews maxBoostPerDay')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        message: 'All payment plans retrieved successfully',
        data: {
          business: {
            plans: businessPlans,
            currentSubscription: currentBusinessSubscription,
            totalPlans: businessPlans.length
          },
          boost: {
            plans: boostPlans,
            currentSubscription: currentBoostSubscription,
            totalPlans: boostPlans.length
          },
          allSubscriptions,
          summary: {
            totalPlans: allPlans.length,
            hasActiveBusinessPlan: !!currentBusinessSubscription,
            hasActiveBoostPlan: !!currentBoostSubscription && 
              (!currentBoostSubscription.expiresAt || new Date() <= currentBoostSubscription.expiresAt)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching all payment plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch all payment plans',
        error: error.message
      });
    }
  }

  /**
   * Confirm payment success (called from frontend after successful payment)
   */
  static async confirmPayment(req, res) {
    try {
      const { businessId, subscriptionId, paymentIntentId } = req.body;

      const subscription = await Subscription.findOne({
        _id: subscriptionId,
        business: businessId
      });

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
          subscription.status = 'active';
          await subscription.save();

          res.status(200).json({
            success: true,
            message: 'Payment confirmed and subscription activated',
            data: subscription
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Payment not completed successfully'
          });
        }
      } catch (stripeError) {
        console.error('Stripe verification error:', stripeError);
        res.status(500).json({
          success: false,
          message: 'Failed to verify payment with Stripe'
        });
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm payment',
        error: error.message
      });
    }
  }
}

export default BusinessSubscriptionController;
