import Stripe from "stripe";
import { GLOBAL_ENV } from "../config/globalConfig.js";
import { purchaseCourseWebhookCall } from "../controllers/user/course.controller.js";

const {
  stripeSecretKey,
  stripePublishableKey,
  stripeWebhookSecret,
} = GLOBAL_ENV;
const stripe = Stripe(stripeSecretKey);

const getStripeOAuthUrl = async (callbackUrl) => {
  const authorizeUrl = await stripe.oauth.authorizeUrl({
    client_id: stripeClientId,
    redirect_uri: callbackUrl,
    scope: "read_write",
  });
  return authorizeUrl;
};

const oAuthGetStripeCustomer = async (code) => {
  const customerData = await stripe.oauth.token({
    grant_type: "authorization_code",
    code,
  });
  return customerData;
};

const createStripeCustomer = async (phone, name) => {
  let customer = await stripe.customers.create({
    phone,
    name,
  });
  return customer;
};

const createStripePaymentIntent = async (
  amount,
  customer,
  metadata,
  currency = 'usd',
) => {

  console.log(amount,
    customer,
    metadata, " amount,customer,metadata, ")
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    customer,
    metadata,
    currency: 'usd',
    automatic_payment_methods: {
      enabled: true,
    },
    // payment_method_types: ['affirm', 'card'],

    transfer_group: metadata.orderId,
  });
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer, },
    { apiVersion: '2022-08-01' }
  );
  return { paymentIntent, stripePublishableKey, ephemeralKey };
};

const createStripeCheckoutSession = async (
  title,
  amount,
  currency,
  customer,
  metadata
) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: title,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata,
    payment_intent_data: {
      metadata,
      // capture_method: "manual",
      transfer_group: metadata.orderId,
    },
    success_url: `https://soberin40-admin-react.vercel.app/Purchase/${metadata.orderId}`,
    cancel_url: `https://soberin40-admin-react.vercel.app/Error`,
  });
  return session;
};

const retrieveStripePaymentSession = async (sessionId) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return session;
};

const retrieveStripePaymentIntentSession = async (sessionId) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  let paymentIntent = null;
  if (session && session.payment_intent) {
    paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent
    );
  }

  return { session, paymentIntent };
};

const retrieveStripePaymentIntent = async (intentId) => {
  const paymentIntent = await stripe.paymentIntents.retrieve(intentId);
  return paymentIntent;
};

const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event = req.body;
    console.log(JSON.stringify(event), 'event-------')
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const { metadata } = event.data.object;
      console.log(`charge success 001  ${event.type}`, metadata);
      try {
      await purchaseCourseWebhookCall(metadata, res)
      return res
      .status(200)
      .send({ message: `Webhook Scceeded` });
      } catch (error) {
        return res
  .status(400)
  .send({ message: `Webhook Error: ${error?.message}` }); 
      }
      // Then define and call a function to handle the event payment_intent.succeeded

      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
      res.send();

  }

  // Return a 200 response to acknowledge receipt of the event
};

const createStripeSetupIntent = async (customerId) => {
  const setupIntent = await stripe.setupIntents.create({
    payment_method_types: ["card"],
    customer: customerId,
  });
  return { setupIntent, stripePublishableKey };
};

const updateStripeSetupIntent = async (setupId) => {
  const setupIntent = await stripe.setupIntents.update(setupId);
  return { setupIntent, stripePublishableKey };
};

const getAllStripePaymentMethods = async (customer) => {
  const paymentMethods = await stripe.paymentMethods.list({
    customer,
    type: "card",
  });
  return { paymentMethods, stripePublishableKey };
};

const deleteStripePaymentMethod = async (paymentMethodId) => {
  await stripe.paymentMethods.detach(paymentMethodId);
  return { message: "card deleted successfully" };
};

const createStripeTransfer = async (
  amountInDollars,
  currency,
  destination,
  orderId
) => {
  let amount = Math.round(amountInDollars * 100); // amount in cents
  let createTransfer = await stripe.transfers.create({
    amount,
    currency,
    destination,
    transfer_group: orderId,
  });
  return createTransfer;
};

const captureStripePaymentIntent = async (paymentIntentId) => {
  const capturedIntent = await stripe.paymentIntents.capture(paymentIntentId);
  return capturedIntent;
};

export {
  getStripeOAuthUrl,
  oAuthGetStripeCustomer,
  createStripeTransfer,
  createStripeCheckoutSession,
  retrieveStripePaymentSession,
  retrieveStripePaymentIntent,
  retrieveStripePaymentIntentSession,
  createStripePaymentIntent,
  createStripeCustomer,
  handleStripeWebhook,
  updateStripeSetupIntent,
  createStripeSetupIntent,
  getAllStripePaymentMethods,
  deleteStripePaymentMethod,
  captureStripePaymentIntent,
};
