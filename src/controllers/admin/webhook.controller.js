import Subscription from '../../models/admin/subscription.js';
import PaymentPlan from '../../models/admin/paymentPlan.js';
import Business from '../../models/business/business.js';
import StripeHelper from '../../helpers/stripeHelper.js';

class WebhookController {
  /**
   * Handle Stripe webhook events
   */
  static async handleStripeWebhook(req, res) {
    try {
      const sig = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      switch (event.type) {
        case 'customer.subscription.created':
          await WebhookController.handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.updated':
          await WebhookController.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await WebhookController.handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await WebhookController.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await WebhookController.handlePaymentFailed(event.data.object);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Webhook handling failed',
        error: error.message
      });
    }
  }

  /**
   * Handle subscription created event
   */
  static async handleSubscriptionCreated(subscription) {
    try {
      console.log('Subscription created:', subscription.id);
      
      // Find existing subscription or create new one
      let dbSubscription = await Subscription.findOne({
        stripeCustomerId: subscription.customer
      });

      if (!dbSubscription) {
        // Get business from metadata
        const businessId = subscription.metadata.businessId;
        const planType = subscription.metadata.planType;

        if (!businessId) {
          console.error('No business ID in subscription metadata');
          return;
        }

        // Find payment plan by Stripe price ID
        const paymentPlan = await PaymentPlan.findOne({
          stripePriceId: subscription.items.data[0].price.id
        });

        if (!paymentPlan) {
          console.error('Payment plan not found for price ID:', subscription.items.data[0].price.id);
          return;
        }

        // Create subscription in database
        dbSubscription = new Subscription({
          business: businessId,
          paymentPlan: paymentPlan._id,
          subscriptionType: planType,
          stripeCustomerId: subscription.customer,
          status: 'active',
          amount: subscription.items.data[0].price.unit_amount / 100,
          currency: subscription.items.data[0].price.currency.toUpperCase(),
          isLifetime: planType === 'business', // Business plans are lifetime
          expiresAt: planType === 'boost' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null // Boost plans expire in 24 hours
        });

        await dbSubscription.save();
        console.log('Subscription created in database:', dbSubscription._id);
      }
    } catch (error) {
      console.error('Error handling subscription created:', error);
    }
  }

  /**
   * Handle subscription updated event
   */
  static async handleSubscriptionUpdated(subscription) {
    try {
      console.log('Subscription updated:', subscription.id);
      
      const dbSubscription = await Subscription.findOne({
        stripeCustomerId: subscription.customer
      });

      if (dbSubscription) {
        // For boost plans, check if expired
        if (dbSubscription.subscriptionType === 'boost' && dbSubscription.expiresAt) {
          if (new Date() > dbSubscription.expiresAt) {
            dbSubscription.status = 'inactive';
          }
        }
        
        await dbSubscription.save();
        console.log('Subscription updated in database:', dbSubscription._id);
      }
    } catch (error) {
      console.error('Error handling subscription updated:', error);
    }
  }

  /**
   * Handle subscription deleted event
   */
  static async handleSubscriptionDeleted(subscription) {
    try {
      console.log('Subscription deleted:', subscription.id);
      
      const dbSubscription = await Subscription.findOne({
        stripeCustomerId: subscription.customer
      });

      if (dbSubscription) {
        dbSubscription.status = 'inactive';
        await dbSubscription.save();
        console.log('Subscription marked as inactive in database:', dbSubscription._id);
      }
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
    }
  }

  /**
   * Handle payment succeeded event
   */
  static async handlePaymentSucceeded(invoice) {
    try {
      console.log('Payment succeeded for invoice:', invoice.id);
      
      if (invoice.subscription) {
        // Find subscription by customer ID since we don't have subscription ID
        const dbSubscription = await Subscription.findOne({
          stripeCustomerId: invoice.customer
        });

        if (dbSubscription) {
          dbSubscription.status = 'active';
          await dbSubscription.save();
          console.log('Subscription activated after successful payment:', dbSubscription._id);
        }
      }
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
    }
  }

  /**
   * Handle payment failed event
   */
  static async handlePaymentFailed(invoice) {
    try {
      console.log('Payment failed for invoice:', invoice.id);
      
      if (invoice.subscription) {
        // Find subscription by customer ID since we don't have subscription ID
        const dbSubscription = await Subscription.findOne({
          stripeCustomerId: invoice.customer
        });

        if (dbSubscription) {
          dbSubscription.status = 'inactive';
          await dbSubscription.save();
          console.log('Subscription marked as inactive after failed payment:', dbSubscription._id);
        }
      }
    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }
}

export default WebhookController;
