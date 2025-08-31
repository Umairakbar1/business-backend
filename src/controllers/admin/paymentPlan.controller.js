import PaymentPlan from '../../models/admin/paymentPlan.js';
import Subscription from '../../models/admin/subscription.js';
import Payment from '../../models/admin/payment.js';
import StripeHelper from '../../helpers/stripeHelper.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';


/**
 * Payment Plan Controller
 * 
 * Handles two types of payment plans:
 * 1. Business Plans: Lifetime subscriptions with no expiration, include business features
 * 2. Boost Plans: Temporary plans with validity period (1-168 hours), include boost limits
 * 
 * Business plans are one-time purchases that provide permanent access to business features.
 * Boost plans are temporary purchases that provide temporary visibility boosts.
 */
class PaymentPlanController {
  /**
   * Create a new payment plan
   */
  static async createPaymentPlan(req, res) {
    try {

      const {
        name,
        description,
        planType,
        price,
        currency,
        features,
        isPopular,
        sortOrder,
        maxBoostPerDay,
        validityHours,
        discount
      } = req.body;

      // Validate business plan constraints
      if (planType === 'business') {
        if (validityHours) {
          return res.status(400).json({
            success: false,
            message: 'Business plans are lifetime plans and cannot have validity hours'
          });
        }
        if (!features || features.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Business plans must have features defined'
          });
        }
        // maxBoostPerDay is allowed for business plans (limits daily boost usage)
      }

      // Validate boost plan constraints
      if (planType === 'boost') {
        if (features && features.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Boost plans cannot have business features'
          });
        }
        if (!validityHours || validityHours < 1 || validityHours > 168) {
          return res.status(400).json({
            success: false,
            message: 'Boost plans must have validity hours between 1 and 168 hours (7 days)'
          });
        }
        if (maxBoostPerDay) {
          return res.status(400).json({
            success: false,
            message: 'Boost plans cannot have daily boost limits (they are the boost themselves)'
          });
        }
      }

      // Create product in Stripe
      const stripeProduct = await StripeHelper.createProduct({
        name,
        description,
        planType,
        features: planType === 'business' ? features : undefined
      });

      // Create price in Stripe (one-time payment for both plan types)
      const stripePrice = await StripeHelper.createPrice({
        productId: stripeProduct.id,
        amount: price,
        currency,
        planType
      });

      // Create payment plan in database
      const paymentPlan = new PaymentPlan({
        name,
        description,
        planType,
        price,
        currency,
        features: planType === 'business' ? features : undefined,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        isPopular,
        sortOrder,
        // Business plans: can have daily boost limits, no validity period
        // Boost plans: must have validity period, no daily boost limits
        maxBoostPerDay: planType === 'business' ? (maxBoostPerDay || 0) : undefined,
        validityHours: planType === 'boost' ? (validityHours || 24) : undefined,
        discount
      });

      await paymentPlan.save();

      res.status(201).json({
        success: true,
        message: 'Payment plan created successfully',
        data: paymentPlan
      });
    } catch (error) {
      console.error('Error creating payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment plan',
        error: error.message
      });
    }
  }

  /**
   * Get all payment plans
   */
  static async getAllPaymentPlans(req, res) {
    try {
      const { planType, isActive } = req.query;
      
      const filter = {};
      if (planType) filter.planType = planType;
      if (isActive !== undefined) filter.isActive = isActive === 'true';

      const paymentPlans = await PaymentPlan.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 });

      // Enhance plans with type-specific information
      const enhancedPlans = paymentPlans.map(plan => {
        const planData = plan.toObject();
        
        if (plan.planType === 'business') {
          planData.planDuration = 'Lifetime (No expiration)';
          planData.planCategory = 'Business Subscription';
          // maxBoostPerDay shows how many boosts per day this business plan allows
        } else if (plan.planType === 'boost') {
          planData.planDuration = `${plan.validityHours} hours`;
          planData.planCategory = 'Temporary Boost';
        }
        
        return planData;
      });

      res.status(200).json({
        success: true,
        message: 'Payment plans retrieved successfully',
        data: enhancedPlans
      });
    } catch (error) {
      console.error('Error fetching payment plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment plans',
        error: error.message
      });
    }
  }

  /**
   * Get payment plan by ID
   */
  static async getPaymentPlanById(req, res) {
    try {
      const { id } = req.params;
      
      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Payment plan retrieved successfully',
        data: paymentPlan
      });
    } catch (error) {
      console.error('Error fetching payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment plan',
        error: error.message
      });
    }
  }

  /**
   * Update payment plan
   */
  static async updatePaymentPlan(req, res) {
    try {

      const { id } = req.params;
      const updateData = req.body;

      // Get current payment plan to validate plan type constraints
      const currentPlan = await PaymentPlan.findById(id);
      if (!currentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      // Validate business plan constraints
      if (currentPlan.planType === 'business') {
        if (updateData.validityHours) {
          return res.status(400).json({
            success: false,
            message: 'Business plans are lifetime plans and cannot have validity hours'
          });
        }
        // maxBoostPerDay is allowed for business plans (limits daily boost usage)
        if (updateData.features !== undefined && (!updateData.features || updateData.features.length === 0)) {
          return res.status(400).json({
            success: false,
            message: 'Business plans must have features defined'
          });
        }
      }

      // Validate boost plan constraints
      if (currentPlan.planType === 'boost') {
        if (updateData.features && updateData.features.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Boost plans cannot have business features'
          });
        }
        if (updateData.validityHours !== undefined && (updateData.validityHours < 1 || updateData.validityHours > 168)) {
          return res.status(400).json({
            success: false,
            message: 'Boost plans must have validity hours between 1 and 168 hours (7 days)'
          });
        }
        if (updateData.maxBoostPerDay) {
          return res.status(400).json({
            success: false,
            message: 'Boost plans cannot have daily boost limits (they are the boost themselves)'
          });
        }
      }

      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      // If price is being updated, create new price in Stripe
      if (updateData.price && updateData.price !== paymentPlan.price) {
        const newStripePrice = await StripeHelper.createPrice({
          productId: paymentPlan.stripeProductId,
          amount: updateData.price,
          currency: updateData.currency || paymentPlan.currency,
          // billingCycle removed - not using recurring billing anymore
          planType: paymentPlan.planType
        });
        updateData.stripePriceId = newStripePrice.id;
      }

      // Update product in Stripe if name or description changed
      if (updateData.name || updateData.description) {
        await StripeHelper.updateProduct(paymentPlan.stripeProductId, {
          name: updateData.name || paymentPlan.name,
          description: updateData.description || paymentPlan.description
        });
      }

      const updatedPaymentPlan = await PaymentPlan.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: 'Payment plan updated successfully',
        data: updatedPaymentPlan
      });
    } catch (error) {
      console.error('Error updating payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update payment plan',
        error: error.message
      });
    }
  }

  /**
   * Delete payment plan
   */
  static async deletePaymentPlan(req, res) {
    try {
      const { id } = req.params;

      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      // Delete Stripe prices first, then the product
      try {
        // Delete the price associated with this plan
        if (paymentPlan.stripePriceId) {
          await StripeHelper.deletePrice(paymentPlan.stripePriceId);
        }
        
        // Now delete the product
        await StripeHelper.deleteProduct(paymentPlan.stripeProductId);
      } catch (stripeError) {
        console.error('Stripe deletion error:', stripeError);
        // Continue with database deletion even if Stripe deletion fails
      }

      // Delete from database
      await PaymentPlan.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'Payment plan deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete payment plan',
        error: error.message
      });
    }
  }

  /**
   * Toggle payment plan status
   */
  static async togglePaymentPlanStatus(req, res) {
    try {
      const { id } = req.params;

      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      paymentPlan.isActive = !paymentPlan.isActive;
      await paymentPlan.save();

      res.status(200).json({
        success: true,
        message: `Payment plan ${paymentPlan.isActive ? 'activated' : 'deactivated'} successfully`,
        data: paymentPlan
      });
    } catch (error) {
      console.error('Error toggling payment plan status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle payment plan status',
        error: error.message
      });
    }
  }

  /**
   * Activate payment plan
   */
  static async activatePaymentPlan(req, res) {
    try {
      const { id } = req.params;

      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      if (paymentPlan.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Payment plan is already active'
        });
      }

      paymentPlan.isActive = true;
      await paymentPlan.save();

      res.status(200).json({
        success: true,
        message: 'Payment plan activated successfully',
        data: paymentPlan
      });
    } catch (error) {
      console.error('Error activating payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate payment plan',
        error: error.message
      });
    }
  }

  /**
   * Deactivate payment plan
   */
  static async deactivatePaymentPlan(req, res) {
    try {
      const { id } = req.params;

      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      if (!paymentPlan.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Payment plan is already inactive'
        });
      }

      paymentPlan.isActive = false;
      await paymentPlan.save();

      res.status(200).json({
        success: true,
        message: 'Payment plan deactivated successfully',
        data: paymentPlan
      });
    } catch (error) {
      console.error('Error deactivating payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate payment plan',
        error: error.message
      });
    }
  }

  /**
   * Get business plans (lifetime plans with no expiration)
   */
  static async getBusinessPlans(req, res) {
    try {
      const businessPlans = await PaymentPlan.find({
        planType: 'business',
        isActive: true
      }).sort({ sortOrder: 1, price: 1 });

      // Enhance business plans with lifetime information
      const enhancedBusinessPlans = businessPlans.map(plan => {
        const planData = plan.toObject();
        planData.planDuration = 'Lifetime (No expiration)';
        planData.planCategory = 'Business Subscription';
        // maxBoostPerDay shows daily boost limit for this business plan
        return planData;
      });

      res.status(200).json({
        success: true,
        message: 'Business plans (lifetime) retrieved successfully',
        data: enhancedBusinessPlans
      });
    } catch (error) {
      console.error('Error fetching business plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch business plans',
        error: error.message
      });
    }
  }

  /**
   * Get boost plans (temporary plans with validity period)
   */
  static async getBoostPlans(req, res) {
    try {
        const { isActive, sortBy = 'sortOrder', sortOrder = 'asc', page = 1, limit = 10, queryText = '' } = req.query;
      
      const filter = { planType: 'boost' };
      if (isActive !== undefined && isActive !== '') filter.isActive = isActive === 'true';
      
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      if (queryText && queryText.trim()) {
        filter.name = { $regex: queryText.trim(), $options: 'i' };
      }

      const skip = (page - 1) * limit;

      const boostPlans = await PaymentPlan.find(filter)
        .sort(sortOptions)
        .populate('features', 'name description')
        .skip(skip)
        .limit(parseInt(limit));

      const total = await PaymentPlan.countDocuments(filter);

      // Enhance boost plans with validity information
      const enhancedBoostPlans = boostPlans.map(plan => {
        const planData = plan.toObject();
        planData.planDuration = `${plan.validityHours} hours`;
        planData.planCategory = 'Temporary Boost';
        return planData;
      });

      res.status(200).json({
        success: true,
        message: 'Boost plans retrieved successfully',
        data: enhancedBoostPlans,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          pageSize: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching boost plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch boost plans',
        error: error.message
      });
    }
  }

  /**
   * Get plan features
   */
  static async getPlanFeatures(req, res) {
    try {
      const { id } = req.params;
      
      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Plan features retrieved successfully',
        data: paymentPlan.features || []
      });
    } catch (error) {
      console.error('Error fetching plan features:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch plan features',
        error: error.message
      });
    }
  }

  /**
   * Update plan features
   */
  static async updatePlanFeatures(req, res) {
    try {
      const { id } = req.params;
      const { features } = req.body;

      // Validate features array
      if (!Array.isArray(features)) {
        return res.status(400).json({
          success: false,
          message: 'Features must be an array'
        });
      }

      // Validate feature values
      const validFeatures = ['query', 'review', 'embeded'];
      const invalidFeatures = features.filter(feature => !validFeatures.includes(feature));
      if (invalidFeatures.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid features: ${invalidFeatures.join(', ')}`
        });
      }

      const paymentPlan = await PaymentPlan.findByIdAndUpdate(
        id,
        { features },
        { new: true, runValidators: true }
      );

      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Plan features updated successfully',
        data: paymentPlan
      });
    } catch (error) {
      console.error('Error updating plan features:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update plan features',
        error: error.message
      });
    }
  }

  /**
   * Get plan pricing
   */
  static async getPlanPricing(req, res) {
    try {
      const { id } = req.params;
      
      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      // Calculate discounted price
      const originalPrice = paymentPlan.price;
      const discountPercentage = paymentPlan.discount || 0;
      const discountedPrice = originalPrice - (originalPrice * (discountPercentage / 100));

      res.status(200).json({
        success: true,
        message: 'Plan pricing retrieved successfully',
        data: {
          originalPrice: paymentPlan.price,
          discount: paymentPlan.discount,
          discountedPrice: Math.round(discountedPrice * 100) / 100, // Round to 2 decimal places
          currency: paymentPlan.currency,
          stripePriceId: paymentPlan.stripePriceId
        }
      });
    } catch (error) {
      console.error('Error fetching plan pricing:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch plan pricing',
        error: error.message
      });
    }
  }

  /**
   * Update plan pricing
   */
  static async updatePlanPricing(req, res) {
    try {
      const { id } = req.params;
      const { price, currency } = req.body;

      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      // Create new price in Stripe if price changed
      if (price && price !== paymentPlan.price) {
        const newStripePrice = await StripeHelper.createPrice({
          productId: paymentPlan.stripeProductId,
          amount: price,
          currency: currency || paymentPlan.currency,
          planType: paymentPlan.planType
        });

        // Update payment plan with new price and Stripe price ID
        const updatedPaymentPlan = await PaymentPlan.findByIdAndUpdate(
          id,
          { 
            price, 
            currency: currency || paymentPlan.currency,
            stripePriceId: newStripePrice.id 
          },
          { new: true, runValidators: true }
        );

        res.status(200).json({
          success: true,
          message: 'Plan pricing updated successfully',
          data: updatedPaymentPlan
        });
      } else {
        res.status(200).json({
          success: true,
          message: 'No pricing changes detected',
          data: paymentPlan
        });
      }
    } catch (error) {
      console.error('Error updating plan pricing:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update plan pricing',
        error: error.message
      });
    }
  }

  /**
   * Get payment plan statistics
   */
  static async getPaymentPlanStats(req, res) {
    try {
      const totalPlans = await PaymentPlan.countDocuments();
      const totalActivePlans = await PaymentPlan.countDocuments({ isActive: true });
      const totalInactivePlans = await PaymentPlan.countDocuments({ isActive: false });
      const totalBusinessPlans = await PaymentPlan.countDocuments({ planType: 'business' });
      const totalBoostPlans = await PaymentPlan.countDocuments({ planType: 'boost' });

      res.status(200).json({
        success: true,
        message: 'Payment plan statistics retrieved successfully',
        data: {
          totalPlans,
          totalActivePlans,
          totalInactivePlans,
          totalBusinessPlans,
          totalBoostPlans
        }
      });
    } catch (error) {
      console.error('Error fetching payment plan statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment plan statistics',
        error: error.message
      });
    }
  }

  /**
   * Bulk update payment plan status
   */
  static async bulkUpdateStatus(req, res) {
    try {
      const { planIds, isActive } = req.body;

      if (!Array.isArray(planIds) || planIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Plan IDs array is required'
        });
      }

      const result = await PaymentPlan.updateMany(
        { _id: { $in: planIds } },
        { isActive }
      );

      res.status(200).json({
        success: true,
        message: `Successfully updated ${result.modifiedCount} payment plans`,
        data: { modifiedCount: result.modifiedCount }
      });
    } catch (error) {
      console.error('Error bulk updating payment plan status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk update payment plan status',
        error: error.message
      });
    }
  }

  /**
   * Bulk delete payment plans
   */
  static async bulkDelete(req, res) {
    try {
      const { planIds } = req.body;

      if (!Array.isArray(planIds) || planIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Plan IDs array is required'
        });
      }

      // Get payment plans to delete Stripe products
      const paymentPlans = await PaymentPlan.find({ _id: { $in: planIds } });
      
      // Delete from Stripe
      for (const plan of paymentPlans) {
        try {
          // Delete prices first, then products
          if (plan.stripePriceId) {
            await StripeHelper.deletePrice(plan.stripePriceId);
          }
          await StripeHelper.deleteProduct(plan.stripeProductId);
        } catch (stripeError) {
          console.error(`Error deleting Stripe product ${plan.stripeProductId}:`, stripeError);
        }
      }

      // Delete from database
      const result = await PaymentPlan.deleteMany({ _id: { $in: planIds } });

      res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} payment plans`,
        data: { deletedCount: result.deletedCount }
      });
    } catch (error) {
      console.error('Error bulk deleting payment plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk delete payment plans',
        error: error.message
      });
    }
  }

  /**
   * Get plan subscriptions
   */
  static async getPlanSubscriptions(req, res) {
    try {
      const { id } = req.params;
      
      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Plan subscriptions retrieved successfully',
        data: [] // TODO: Implement actual subscription data
      });
    } catch (error) {
      console.error('Error fetching plan subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch plan subscriptions',
        error: error.message
      });
    }
  }

  /**
   * Get active subscriptions
   */
  static async getActiveSubscriptions(req, res) {
    try {
      const { id } = req.params;
      
      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Active subscriptions retrieved successfully',
        data: [] // TODO: Implement actual active subscription data
      });
    } catch (error) {
      console.error('Error fetching active subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active subscriptions',
        error: error.message
      });
    }
  }

  /**
   * Get plan details with type-specific information
   */
  static async getPlanDetails(req, res) {
    try {
      const { id } = req.params;
      
      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      // Prepare plan details based on type
      let planDetails = {
        id: paymentPlan._id,
        name: paymentPlan.name,
        description: paymentPlan.description,
        planType: paymentPlan.planType,
        price: paymentPlan.price,
        currency: paymentPlan.currency,
        isActive: paymentPlan.isActive,
        isPopular: paymentPlan.isPopular,
        sortOrder: paymentPlan.sortOrder,
        discount: paymentPlan.discount,
        stripeProductId: paymentPlan.stripeProductId,
        stripePriceId: paymentPlan.stripePriceId,
        createdAt: paymentPlan.createdAt,
        updatedAt: paymentPlan.updatedAt
      };

      // Add type-specific information
      if (paymentPlan.planType === 'business') {
        planDetails.features = paymentPlan.features;
        planDetails.maxBoostPerDay = paymentPlan.maxBoostPerDay;
        planDetails.planDuration = 'Lifetime (No expiration)';
        planDetails.planCategory = 'Business Subscription';
      } else if (paymentPlan.planType === 'boost') {
        planDetails.validityHours = paymentPlan.validityHours;
        planDetails.planDuration = `${paymentPlan.validityHours} hours`;
        planDetails.planCategory = 'Temporary Boost';
      }

      res.status(200).json({
        success: true,
        message: 'Plan details retrieved successfully',
        data: planDetails
      });
    } catch (error) {
      console.error('Error fetching plan details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch plan details',
        error: error.message
      });
    }
  }

  /**
   * Get plan analytics
   */
  static async getPlanAnalytics(req, res) {
    try {
      const { id } = req.params;
      
      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Plan analytics retrieved successfully',
        data: {
          planId: id,
          planName: paymentPlan.name,
          totalPurchases: 0, // TODO: Implement actual analytics
          revenue: 0,
          activeSubscriptions: 0
        }
      });
    } catch (error) {
      console.error('Error fetching plan analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch plan analytics',
        error: error.message
      });
    }
  }

  /**
   * Update plan validity (boost plans only)
   */
  static async updatePlanValidity(req, res) {
    try {
      const { id } = req.params;
      const { validityHours } = req.body;

      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      // Only boost plans can have validity hours
      if (paymentPlan.planType !== 'boost') {
        return res.status(400).json({
          success: false,
          message: 'Validity hours can only be set for boost plans'
        });
      }

      // Validate validity hours
      if (validityHours < 1 || validityHours > 168) {
        return res.status(400).json({
          success: false,
          message: 'Validity hours must be between 1 and 168 hours (7 days)'
        });
      }

      const updatedPaymentPlan = await PaymentPlan.findByIdAndUpdate(
        id,
        { validityHours },
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: 'Plan validity updated successfully',
        data: updatedPaymentPlan
      });
    } catch (error) {
      console.error('Error updating plan validity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update plan validity',
        error: error.message
      });
    }
  }

  /**
   * Update plan discount
   */
  static async updatePlanDiscount(req, res) {
    try {
      const { id } = req.params;
      const { discount } = req.body;

      // Validate discount percentage
      if (discount < 0 || discount > 7) {
        return res.status(400).json({
          success: false,
          message: 'Discount must be between 0 and 7 percent'
        });
      }

      const paymentPlan = await PaymentPlan.findByIdAndUpdate(
        id,
        { discount },
        { new: true, runValidators: true }
      );

      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Plan discount updated successfully',
        data: paymentPlan
      });
    } catch (error) {
      console.error('Error updating plan discount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update plan discount',
        error: error.message
      });
    }
  }

  /**
   * Get revenue stats
   */
  static async getRevenueStats(req, res) {
    try {
      const { id } = req.params;
      
      const paymentPlan = await PaymentPlan.findById(id);
      if (!paymentPlan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Revenue stats retrieved successfully',
        data: {
          planId: id,
          planName: paymentPlan.name,
          totalRevenue: 0, // TODO: Implement actual revenue calculation
          monthlyRevenue: 0,
          yearlyRevenue: 0
        }
      });
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch revenue stats',
        error: error.message
      });
    }
  }

  /**
   * Get all boost plans with detailed information
   */
  static async getAllBoostPlans(req, res) {
    try {
      const { isActive, sortBy = 'sortOrder', sortOrder = 'asc', page = 1, limit = 10, queryText = '' } = req.query;
      
      const filter = { planType: 'boost' };
      if (isActive !== undefined && isActive !== '') filter.isActive = isActive === 'true';

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      if (queryText && queryText.trim()) {
        filter.name = { $regex: queryText.trim(), $options: 'i' };
      }

      const skip = (page - 1) * limit;

      const boostPlans = await PaymentPlan.find(filter)
        .sort(sortOptions)
        .populate('features', 'name description')
        .skip(skip)
        .limit(parseInt(limit));

      // Enhance boost plans with additional information
      const enhancedBoostPlans = boostPlans.map(plan => {
        const planData = plan.toObject();
        planData.planDuration = `${plan.validityHours} hours`;
        planData.planCategory = 'Temporary Boost';
        planData.validityDays = Math.round(plan.validityHours / 24 * 10) / 10; // Convert to days with 1 decimal
        return planData;
      });

      const total = await PaymentPlan.countDocuments(filter);

      res.status(200).json({
        success: true,
        message: 'Boost plans retrieved successfully',
        data: enhancedBoostPlans,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          pageSize: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching boost plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch boost plans',
        error: error.message
      });
    }
  }

  /**
   * Get all business plans with detailed information
   */
  static async getAllBusinessPlans(req, res) {
    try {
      const { page = 1, limit = 10, queryText = '', isActive, sortBy = 'sortOrder', sortOrder = 'asc' } = req.query;
      
      const filter = { planType: 'business' };
      if (isActive !== undefined && isActive !== '') filter.isActive = isActive === 'true';
      
      // Add text search filter for plan name
      if (queryText && queryText.trim()) {
        filter.name = { $regex: queryText.trim(), $options: 'i' };
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit ;

      const businessPlans = await PaymentPlan.find(filter)
        .sort(sortOptions)
        .populate('features', 'name description')
        .skip(skip)
        .limit(parseInt(limit));
        

      const total = await PaymentPlan.countDocuments(filter);

      // Enhance business plans with additional information
      const enhancedBusinessPlans = businessPlans.map(plan => {
        const planData = plan.toObject();
        planData.planDuration = 'Lifetime (No expiration)';
        planData.planCategory = 'Business Subscription';
        planData.boostLimitInfo = plan.maxBoostPerDay > 0 
          ? `${plan.maxBoostPerDay} boosts per day`
          : 'No boost allowance';
        return planData;
      });

      res.status(200).json({
        success: true,
        message: 'Business plans retrieved successfully',
        data: enhancedBusinessPlans,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          pageSize: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching business plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch business plans',
        error: error.message
      });
    }
  }

  /**
   * Get business subscription history
   */
  static async getBusinessSubscriptionHistory(req, res) {
    try {
      const {queryText, businessId, planType, status, page = 1, limit = 10 } = req.query;

      const filter = {};
      
      if (businessId) filter.business = businessId;
      if (planType) filter.subscriptionType = planType; // Changed from planType to subscriptionType
      if (status) {
        // Handle both 'canceled' and 'cancelled' spellings
        if (status === 'canceled' || status === 'cancelled') {
          filter.status = { $in: ['canceled', 'cancelled'] };
        } else {
          filter.status = status;
        }
      }

      // If queryText is provided, we need to use aggregation to search in populated fields
      if (queryText && queryText.trim()) {
        const searchTerm = queryText.trim();
        
        // Use aggregation to search in populated business fields
        const aggregationPipeline = [
          { $match: filter },
          {
            $lookup: {
              from: 'businesses', // Assuming the business collection name
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
              from: 'categories', // Populate business category
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
            $lookup: {
              from: 'categories', // Populate boost category
              localField: 'boostQueueInfo.category',
              foreignField: '_id',
              as: 'boostCategory'
            }
          },
          {
            $unwind: {
              path: '$boostCategory',
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
              from: 'paymentplans', // Assuming the payment plan collection name
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
            $lookup: {
              from: 'categories', // Populate boost category
              localField: 'boostQueueInfo.category',
              foreignField: '_id',
              as: 'boostCategory'
            }
          },
          {
            $unwind: {
              path: '$boostCategory',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $sort: { createdAt: -1 }
          },
          {
            $skip: (page - 1) * limit
          },
          {
            $limit: parseInt(limit)
          }
        ];

        const subscriptions = await Subscription.aggregate(aggregationPipeline);

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
        const total = totalResult.length > 0 ? totalResult[0].total : 0;

        // Enhance subscriptions with additional information
        const enhancedSubscriptions = subscriptions.map(sub => {
          const subData = { ...sub };
          
          // Add status information
          if (sub.subscriptionType === 'business') {
            subData.statusInfo = 'Lifetime subscription';
            subData.isExpired = false;
            subData.daysRemaining = null;
          } else {
            subData.statusInfo = sub.isExpired ? 'Expired' : 'Active';
            subData.isExpired = sub.isExpired;
            subData.daysRemaining = sub.daysRemaining;
          }

                     // Add boost usage information for business plans
           if (sub.subscriptionType === 'business') {
             // Calculate boost usage manually since we're dealing with plain objects
             const today = new Date().toDateString();
             const lastResetDate = sub.boostUsage?.lastResetDate ? new Date(sub.boostUsage.lastResetDate).toDateString() : null;
             const canUseBoost = lastResetDate !== today || !sub.boostUsage?.lastResetDate;
             
             subData.canUseBoost = canUseBoost;
             subData.boostUsageInfo = `${sub.boostUsage?.currentDay || 0}/${sub.maxBoostPerDay || 0} used today`;
           }

           // Add category information
           if (sub.boostQueueInfo?.category) {
             subData.categoryName = sub.boostQueueInfo.category.name;
             subData.categoryDescription = sub.boostQueueInfo.category.description;
           } else if (sub.boostCategory) {
             subData.categoryName = sub.boostCategory.name;
             subData.categoryDescription = sub.boostCategory.description;
           }

                       // Add business category information
            if (sub.business?.category && typeof sub.business.category === 'object') {
              subData.businessCategoryName = sub.business.category.name || sub.business.category.title;
              subData.businessCategoryDescription = sub.business.category.description;
            } else if (sub.businessCategory) {
              subData.businessCategoryName = sub.businessCategory.name || sub.businessCategory.title;
              subData.businessCategoryDescription = sub.businessCategory.description;
            }

          return subData;
        });

        successResponseHelper(res, {
          success: true,
          message: 'Business subscription history retrieved successfully',
          data: enhancedSubscriptions,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            pageSize: parseInt(limit)
          }
        });
      } else {
        // No search term, use regular find with populate
        const skip = (page - 1) * limit;

        const subscriptions = await Subscription.find(filter)
          .populate({
            path: 'business',
            select: 'businessName businessEmail businessPhone category boostCategory',
            populate: {
              path: 'category',
              select: 'name title description'
            }
          })
          .populate('paymentPlan', 'name description price currency features maxBoostPerDay validityHours')
          .populate({
            path: 'boostQueueInfo.category',
            select: 'name description'
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit));

        const total = await Subscription.countDocuments(filter);

        // Enhance subscriptions with additional information
        const enhancedSubscriptions = subscriptions.map(sub => {
          const subData = sub.toObject();
          
          // Add status information
          if (sub.subscriptionType === 'business') {
            subData.statusInfo = 'Lifetime subscription';
            subData.isExpired = false;
            subData.daysRemaining = null;
          } else {
            subData.statusInfo = sub.isExpired ? 'Expired' : 'Active';
            subData.isExpired = sub.isExpired;
            subData.daysRemaining = sub.daysRemaining;
          }

          // Add boost usage information for business plans
          if (sub.subscriptionType === 'business') {
            subData.canUseBoost = sub.canUseBoostToday();
            subData.boostUsageInfo = `${sub.boostUsage.currentDay}/${sub.maxBoostPerDay} used today`;
          }

          // Add category information
          if (sub.boostQueueInfo?.category) {
            subData.categoryName = sub.boostQueueInfo.category.name;
            subData.categoryDescription = sub.boostQueueInfo.category.description;
          } else if (sub.boostCategory) {
            subData.categoryName = sub.boostCategory.name;
            subData.categoryDescription = sub.boostCategory.description;
          }

          // Add business category information
          if (sub.business?.category && typeof sub.business.category === 'object') {
            subData.businessCategoryName = sub.business.category.name || sub.business.category.title;
            subData.businessCategoryDescription = sub.business.category.description;
          } else if (sub.businessCategory) {
            subData.businessCategoryName = sub.businessCategory.name || sub.businessCategory.title;
            subData.businessCategoryDescription = sub.businessCategory.description;
          }

          return subData;
        });

        successResponseHelper(res, {
          success: true,
          message: 'Business subscription history retrieved successfully',
          data: enhancedSubscriptions,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            pageSize: parseInt(limit)
          }
        });
      }
    } catch (error) {
      console.error('Error fetching business subscription history:', error);
      errorResponseHelper(res, {
        success: false,
        message: 'Failed to fetch business subscription history',
        error: error.message
      });
    }
  }

  /**
   * Get payment history for all businesses
   */
  static async getPaymentHistory(req, res) {
    try {
      const { 
        queryText,
        businessId, 
        planType, 
        paymentType, 
        status, 
        startDate, 
        endDate,
        page = 1, 
        limit = 10 
      } = req.query;
      
      const filter = {};
      if (queryText && queryText.trim()) {
        filter.$or.push(
          { businessName: { $regex: queryText.trim(), $options: 'i' } },
          { businessEmail: { $regex: queryText.trim(), $options: 'i' } },
          { businessPhone: { $regex: queryText.trim(), $options: 'i' } }
        );
      }
      if (businessId) filter.businessId = businessId;
      if (planType) filter.planType = planType;
      if (paymentType) filter.paymentType = paymentType;
      if (status) filter.status = status;
      
      // Date range filter
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const payments = await Payment.find(filter)
        .populate('businessId', 'businessName businessEmail')
        .populate('paymentPlanId', 'name description planType')
        .populate('subscriptionId', 'status startDate endDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Payment.countDocuments(filter);

      // Enhance payments with additional information
      const enhancedPayments = payments.map(payment => {
        const paymentData = payment.toObject();
        
        // Add payment status display
        paymentData.statusDisplay = payment.statusDisplay;
        paymentData.paymentTypeDisplay = payment.paymentTypeDisplay;
        
        // Add subscription status
        if (payment.subscriptionId) {
          paymentData.subscriptionStatus = payment.subscriptionId.status;
          paymentData.subscriptionStartDate = payment.subscriptionId.startDate;
          paymentData.subscriptionEndDate = payment.subscriptionId.endDate;
        }

        return paymentData;
      });

      res.status(200).json({
        success: true,
        message: 'Payment history retrieved successfully',
        data: {
          payments: enhancedPayments,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalPayments: total,
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching payment history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment history',
        error: error.message
      });
    }
  }

  /**
   * Get comprehensive business subscription and payment overview
   */
  static async getBusinessOverview(req, res) {
    try {
      const { businessId } = req.params;
      
      if (!businessId) {
        return res.status(400).json({
          success: false,
          message: 'Business ID is required'
        });
      }

      // Get active subscriptions
      const activeSubscriptions = await Subscription.find({
        businessId,
        status: 'active'
      }).populate('paymentPlanId', 'name description planType price currency features maxBoostPerDay validityHours');

      // Get expired/cancelled subscriptions
      const inactiveSubscriptions = await Subscription.find({
        businessId,
        status: { $in: ['expired', 'cancelled'] }
      }).populate('paymentPlanId', 'name description planType price currency');

      // Get payment history
      const payments = await Payment.find({ businessId })
        .populate('paymentPlanId', 'name planType')
        .sort({ createdAt: -1 })
        .limit(20);

      // Get payment statistics
      const paymentStats = await Payment.getPaymentStats(businessId);

      // Calculate totals
      const totalSpent = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.finalAmount, 0);

      const totalPending = payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.finalAmount, 0);

      // Group subscriptions by type
      const businessPlans = activeSubscriptions.filter(sub => sub.subscriptionType === 'business');
      const boostPlans = activeSubscriptions.filter(sub => sub.subscriptionType === 'boost');

      // Calculate boost usage for business plans
      const boostUsage = businessPlans.map(plan => ({
        planName: plan.paymentPlan.name,
        maxBoostPerDay: plan.maxBoostPerDay,
        usedToday: plan.boostUsage.currentDay,
        canUseBoost: plan.canUseBoostToday(),
        lastBoostDate: plan.boostUsage.lastResetDate
      }));

      res.status(200).json({
        success: true,
        message: 'Business overview retrieved successfully',
        data: {
          businessId,
          // Active subscriptions
          activeSubscriptions: {
            businessPlans: businessPlans.length,
            boostPlans: boostPlans.length,
            total: activeSubscriptions.length
          },
          // Inactive subscriptions
          inactiveSubscriptions: {
            expired: inactiveSubscriptions.filter(sub => sub.status === 'expired').length,
            cancelled: inactiveSubscriptions.filter(sub => sub.status === 'cancelled').length,
            total: inactiveSubscriptions.length
          },
          // Payment information
          payments: {
            total: payments.length,
            completed: payments.filter(p => p.status === 'completed').length,
            pending: payments.filter(p => p.status === 'pending').length,
            failed: payments.filter(p => p.status === 'failed').length,
            totalSpent,
            totalPending
          },
          // Boost usage
          boostUsage,
          // Recent payments
          recentPayments: payments.slice(0, 10),
          // Payment statistics
          paymentStats
        }
      });
    } catch (error) {
      console.error('Error fetching business overview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch business overview',
        error: error.message
      });
    }
  }

  /**
   * Get subscription analytics and statistics
   */
  static async getSubscriptionAnalytics(req, res) {
    try {
      const { startDate, endDate, planType } = req.query;
      
      const dateFilter = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
      }

      if (planType) dateFilter.subscriptionType = planType;

      // Get subscription statistics
      const subscriptionStats = await Subscription.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              planType: '$subscriptionType',
              status: '$status'
            },
            count: { $sum: 1 }
          }
        }
      ]);

      // Get payment statistics
      const paymentStats = await Payment.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              planType: '$planType',
              status: '$status'
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$finalAmount' }
          }
        }
      ]);

      // Get monthly trends
      const monthlyTrends = await Subscription.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              planType: '$subscriptionType'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      // Get top performing plans
      const topPlans = await Subscription.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$paymentPlan',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Populate plan names for top plans
      const populatedTopPlans = await Subscription.populate(topPlans, {
        path: '_id',
        select: 'name description planType price'
      });

      res.status(200).json({
        success: true,
        message: 'Subscription analytics retrieved successfully',
        data: {
          subscriptionStats,
          paymentStats,
          monthlyTrends,
          topPlans: populatedTopPlans,
          dateRange: {
            startDate: startDate || 'All time',
            endDate: endDate || 'All time'
          }
        }
      });
    } catch (error) {
      console.error('Error fetching subscription analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription analytics',
        error: error.message
      });
    }
  }
}

export default PaymentPlanController;
