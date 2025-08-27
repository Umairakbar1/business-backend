import mongoose from 'mongoose';

/**
 * Payment Plan Schema
 * 
 * Supports two plan types:
 * 1. Business Plans: Lifetime subscriptions with business features and daily boost limits
 * 2. Boost Plans: Temporary plans with validity period (no business features)
 * 
 * The pre-save middleware ensures plan type constraints are enforced.
 */
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
    type: String,
    enum: ['query', 'review', 'embeded'],
    required: true
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

  // Daily boost usage limit for business plans only
  maxBoostPerDay: {
    type: Number,
    default: undefined, // No default - only set for business plans
    min: 0,
    required: function() {
      return this.planType === 'business';
    }
  },
  
  // Validity period for boost plans (in hours) - only applicable for boost plans
  validityHours: {
    type: Number,
    default: undefined, // No default - only set for boost plans
    min: 1,
    max: 168, // Maximum 7 days (168 hours)
    required: function() {
      return this.planType === 'boost';
    }
  },
  
  discount: {
    type: Number,
    min: 0,
    max: 7, // Maximum 7% discount
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save middleware to ensure plan type constraints
paymentPlanSchema.pre('save', function(next) {
  if (this.planType === 'business') {
    // Business plans: no validity hours, can have maxBoostPerDay
    this.validityHours = undefined;
    if (this.maxBoostPerDay === undefined) {
      this.maxBoostPerDay = 0; // Default to 0 if not specified
    }
  } else if (this.planType === 'boost') {
    // Boost plans: must have validity hours, no maxBoostPerDay
    this.maxBoostPerDay = undefined;
    if (this.validityHours === undefined) {
      this.validityHours = 24; // Default to 24 hours if not specified
    }
  }
  next();
});

// Index for efficient queries
paymentPlanSchema.index({ planType: 1, isActive: 1 });
paymentPlanSchema.index({ stripeProductId: 1 });
paymentPlanSchema.index({ stripePriceId: 1 });

export default mongoose.model('PaymentPlan', paymentPlanSchema);
