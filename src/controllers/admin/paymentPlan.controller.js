import PaymentPlan from '../../models/admin/paymentPlan.js';
import StripeHelper from '../../helpers/stripeHelper.js';

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
        maxBusinesses,
        maxReviews,
        maxBoostPerDay
      } = req.body;

      // Create product in Stripe
      const stripeProduct = await StripeHelper.createProduct({
        name,
        description,
        planType,
        features
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
        features,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        isPopular,
        sortOrder,
        maxBusinesses,
        maxReviews,
        maxBoostPerDay
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

      res.status(200).json({
        success: true,
        message: 'Payment plans retrieved successfully',
        data: paymentPlans
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
        await stripe.products.update(paymentPlan.stripeProductId, {
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

      // Delete from Stripe
      await StripeHelper.deleteProduct(paymentPlan.stripeProductId);

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
   * Get business plans
   */
  static async getBusinessPlans(req, res) {
    try {
      const businessPlans = await PaymentPlan.find({
        planType: 'business',
        isActive: true
      }).sort({ sortOrder: 1, price: 1 });

      res.status(200).json({
        success: true,
        message: 'Business plans retrieved successfully',
        data: businessPlans
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
   * Get boost plans
   */
  static async getBoostPlans(req, res) {
    try {
      const boostPlans = await PaymentPlan.find({
        planType: 'boost',
        isActive: true
      }).sort({ sortOrder: 1, price: 1 });

      res.status(200).json({
        success: true,
        message: 'Boost plans retrieved successfully',
        data: boostPlans
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
}

export default PaymentPlanController;
