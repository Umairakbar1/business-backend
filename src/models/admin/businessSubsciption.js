import mongoose from "mongoose";
const { Schema, model } = mongoose;

const BusinessSubscriptionSchema = new mongoose.Schema({
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentPlan',
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired', 'cancelled'],
      default: 'active'
    },
    subscriptionType: {
      type: String,
      enum: ['business', 'boost'],
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiredAt: {
      type: Date,
      required: true
    },
    paymentId: String,
    stripeCustomerId: String
  });
  
  const BusinessSubscription = model('BusinessSubscription', BusinessSubscriptionSchema);
  export default BusinessSubscription;
  