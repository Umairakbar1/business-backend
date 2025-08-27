import mongoose from 'mongoose';

const paymentPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  planType: {
    type: String,
    enum: ['business', 'boost'],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP']
  },

  features: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    included: {
      type: Boolean,
      default: true
    },
    limit: {
      type: Number,
      default: null // null means unlimited
    }
  }],
  stripeProductId: {
    type: String,
    required: true
  },
  stripePriceId: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  maxBusinesses: {
    type: Number,
    default: null // null means unlimited
  },
  maxReviews: {
    type: Number,
    default: null // null means unlimited
  },
  maxBoostPerDay: {
    type: Number,
    default: 0 // for boost plans
  }
}, {
  timestamps: true
});

// Index for efficient queries
paymentPlanSchema.index({ planType: 1, isActive: 1 });
paymentPlanSchema.index({ stripeProductId: 1 });
paymentPlanSchema.index({ stripePriceId: 1 });

export default mongoose.model('PaymentPlan', paymentPlanSchema);
