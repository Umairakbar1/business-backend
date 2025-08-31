import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class StripeHelper {
  /**
   * Create a product in Stripe
   */
  static async createProduct(productData) {
    try {
      const product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
        metadata: {
          planType: productData.planType,
          features: JSON.stringify(productData.features)
        }
      });
      return product;
    } catch (error) {
      throw new Error(`Failed to create Stripe product: ${error.message}`);
    }
  }

  /**
   * Update a product in Stripe
   */
  static async updateProduct(productId, updateData) {
    try {
      const product = await stripe.products.update(productId, updateData);
      return product;
    } catch (error) {
      throw new Error(`Failed to update Stripe product: ${error.message}`);
    }
  }

  /**
   * Create a price in Stripe
   */
  static async createPrice(priceData) {
    try {
      const price = await stripe.prices.create({
        product: priceData.productId,
        unit_amount: Math.round(priceData.amount * 100), // Convert to cents
        currency: priceData.currency.toLowerCase(),
        // One-time payment for both business and boost plans
        metadata: {
          planType: priceData.planType
        }
      });
      return price;
    } catch (error) {
      throw new Error(`Failed to create Stripe price: ${error.message}`);
    }
  }

  /**
   * Create a customer in Stripe
   */
  static async createCustomer(customerData) {
    try {
      const customer = await stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        metadata: {
          businessId: customerData.businessId,
          userId: customerData.userId
        }
      });
      return customer;
    } catch (error) {
      throw new Error(`Failed to create Stripe customer: ${error.message}`);
    }
  }

  /**
   * Create a subscription in Stripe
   */
  static async createSubscription(subscriptionData) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: subscriptionData.customerId,
        items: [{
          price: subscriptionData.priceId
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          businessId: subscriptionData.businessId,
          planType: subscriptionData.planType
        }
      });
      return subscription;
    } catch (error) {
      throw new Error(`Failed to create Stripe subscription: ${error.message}`);
    }
  }

  /**
   * Cancel a subscription in Stripe
   */
  static async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd
      });
      return subscription;
    } catch (error) {
      throw new Error(`Failed to cancel Stripe subscription: ${error.message}`);
    }
  }

  /**
   * Retrieve a subscription from Stripe
   */
  static async getSubscription(subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      throw new Error(`Failed to retrieve Stripe subscription: ${error.message}`);
    }
  }

  /**
   * Update subscription in Stripe
   */
  static async updateSubscription(subscriptionId, updateData) {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, updateData);
      return subscription;
    } catch (error) {
      throw new Error(`Failed to update Stripe subscription: ${error.message}`);
    }
  }

  /**
   * Create a payment intent for one-time payments
   */
  static async createPaymentIntent(paymentData) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: paymentData.currency.toLowerCase(),
        customer: paymentData.customerId,
        metadata: {
          businessId: paymentData.businessId,
          planType: paymentData.planType
        }
      });
      return paymentIntent;
    } catch (error) {
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Retrieve a customer from Stripe
   */
  static async getCustomer(customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      return customer;
    } catch (error) {
      throw new Error(`Failed to retrieve Stripe customer: ${error.message}`);
    }
  }

  /**
   * Retrieve a payment intent from Stripe
   */
  static async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      throw new Error(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  /**
   * List all products from Stripe
   */
  static async listProducts(limit = 100) {
    try {
      const products = await stripe.products.list({ limit });
      return products;
    } catch (error) {
      throw new Error(`Failed to list Stripe products: ${error.message}`);
    }
  }

  /**
   * List all prices for a product
   */
  static async listPrices(productId) {
    try {
      const prices = await stripe.prices.list({
        product: productId,
        active: true
      });
      return prices;
    } catch (error) {
      throw new Error(`Failed to list Stripe prices: ${error.message}`);
    }
  }

  /**
   * Delete a product from Stripe
   */
  static async deleteProduct(productId) {
    try {
      const product = await stripe.products.del(productId);
      return product;
    } catch (error) {
      throw new Error(`Failed to delete Stripe product: ${error.message}`);
    }
  }

  /**
   * Delete a Stripe price (deactivate it)
   */
  static async deletePrice(priceId) {
    try {
      await stripe.prices.update(priceId, { active: false });
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete Stripe price: ${error.message}`);
    }
  }

  /**
   * Create a payment intent for subscription payments
   */
  static async createPaymentIntent(paymentIntentData) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(paymentIntentData.amount * 100), // Convert to cents
        currency: paymentIntentData.currency.toLowerCase(),
        customer: paymentIntentData.customerId,
        metadata: {
          businessId: paymentIntentData.businessId,
          planType: paymentIntentData.planType,
          planId: paymentIntentData.planId || '',
          subscriptionType: paymentIntentData.subscriptionType || 'one_time'
        },
        automatic_payment_methods: {
          enabled: true,
        },
        description: `Payment for ${paymentIntentData.planType} plan`,
        receipt_email: paymentIntentData.receiptEmail
      });
      return paymentIntent;
    } catch (error) {
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Create a Stripe checkout session for one-time payments
   */
  static async createStripeCheckoutSession(sessionData) {
    try {
      const sessionConfig = {
        payment_method_types: ['card'],
        line_items: [{
          price: sessionData.priceId,
          quantity: 1,
        }],
        mode: 'payment', // One-time payment
        success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/cancel`,
        metadata: {
          businessId: sessionData.businessId,
          planType: sessionData.planType,
          planId: sessionData.planId
        }
      };

      // Only add customer if customerId is provided
      if (sessionData.customerId) {
        sessionConfig.customer = sessionData.customerId;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);
      return session;
    } catch (error) {
      throw new Error(`Failed to create Stripe checkout session: ${error.message}`);
    }
  }

  /**
   * Alias for createStripeCheckoutSession for backward compatibility
   */
  static async createCheckoutSession(sessionData) {
    return StripeHelper.createStripeCheckoutSession(sessionData);
  }

  /**
   * Cancel a payment intent in Stripe
   */
  static async cancelPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      throw new Error(`Failed to cancel payment intent: ${error.message}`);
    }
  }

  /**
   * Create a refund for a payment
   */
  static async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason: reason
      };

      // If amount is specified, add it to refund data
      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await stripe.refunds.create(refundData);
      return refund;
    } catch (error) {
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }

  /**
   * Get refund details
   */
  static async getRefund(refundId) {
    try {
      const refund = await stripe.refunds.retrieve(refundId);
      return refund;
    } catch (error) {
      throw new Error(`Failed to retrieve refund: ${error.message}`);
    }
  }
}

export default StripeHelper;