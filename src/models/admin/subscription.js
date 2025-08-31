import mongoose from 'mongoose';
import { GLOBAL_ENUMS } from '../../config/globalConfig.js';

const subscriptionSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  paymentPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentPlan',
    required: true
  },
  subscriptionType: {
    type: String,
    enum: ['business', 'boost'],
    required: true
  },
  // stripeSubscriptionId removed - not using Stripe subscriptions anymore
  stripeCustomerId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'canceled', 'past_due', 'unpaid', 'trialing', 'pending', 'upgraded'],
    default: 'active'
  },
  // For business plans (lifetime) - no expiration
  // For boost plans - expires after 24 hours
  expiresAt: {
    type: Date,
    default: null // null means lifetime (business plans)
  },
  isLifetime: {
    type: Boolean,
    default: false
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  // For boost plans - track daily usage
  boostUsage: {
    currentDay: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  // Daily boost limit from payment plan
  maxBoostPerDay: {
    type: Number,
    default: 0
  },
  // Boost queue information
  boostQueueInfo: {
    queueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BoostQueue',
      default: null
    },
    queuePosition: {
      type: Number,
      default: null
    },
    estimatedStartTime: {
      type: Date,
      default: null
    },
    estimatedEndTime: {
      type: Date,
      default: null
    },
    isCurrentlyActive: {
      type: Boolean,
      default: false
    },
    boostStartTime: {
      type: Date,
      default: null
    },
    boostEndTime: {
      type: Date,
      default: null
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    }
  },
  // Payment tracking
  paymentId: {
    type: String,
    required: true
  },
  // Features from payment plan (for business plans)
  features: [{
    type: String,
    enum: [GLOBAL_ENUMS.features.QUERY, GLOBAL_ENUMS.features.REVIEW, GLOBAL_ENUMS.features.EMBEDDED, GLOBAL_ENUMS.features.BOOST]
  }],
  // Validity hours for boost plans
  validityHours: {
    type: Number,
    min: 1,
    max: 168
  },
  // For business plans - track features usage
  featureUsage: {
    reviewsPosted: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
subscriptionSchema.index({ business: 1, subscriptionType: 1 });
subscriptionSchema.index({ stripeCustomerId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ expiresAt: 1 });

// Virtual for checking if subscription is active
subscriptionSchema.virtual('isActive').get(function() {
  if (this.status !== 'active') return false;
  
  // Business plans are lifetime (always active)
  if (this.isLifetime) return true;
  
  // Boost plans expire after 24 hours
  if (this.expiresAt) {
    return this.expiresAt > new Date();
  }
  
  return false;
});

// Method to check if boost is available
subscriptionSchema.methods.canUseBoost = function() {
  if (this.subscriptionType !== 'boost') return false;
  if (!this.isActive) return false;
  
  const now = new Date();
  const lastReset = new Date(this.boostUsage.lastResetDate);
  const currentDay = now.getDate();
  const lastResetDay = lastReset.getDate();
  
  // Reset counter if new day
  if (currentDay !== lastResetDay || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.boostUsage.currentDay = 0;
    this.boostUsage.lastResetDate = now;
    this.save();
  }
  
  // Note: This method should be called after populating the paymentPlan field
  // The maxBoosts will be available from the populated document
  return true; // Will be overridden by the controller logic
};

// Method to increment boost usage
subscriptionSchema.methods.incrementBoostUsage = function() {
  this.boostUsage.currentDay += 1;
  return this.save();
};

// Method to check if review can be posted
subscriptionSchema.methods.canPostReview = function() {
  if (this.subscriptionType !== 'business') return false;
  if (!this.isActive) return false;
  
  // Note: This method should be called after populating the paymentPlan field
  // The maxReviews will be available from the populated document
  return true; // Will be overridden by the controller logic
};

// Method to increment review usage
subscriptionSchema.methods.incrementReviewUsage = function() {
  this.featureUsage.reviewsPosted += 1;
  return this.save();
};

// Virtual for days remaining (boost plans only)
subscriptionSchema.virtual('daysRemaining').get(function() {
  if (this.subscriptionType === 'business' || !this.expiresAt) {
    return null;
  }
  const now = new Date();
  const end = new Date(this.expiresAt);
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Virtual for checking if subscription is expired
subscriptionSchema.virtual('isExpired').get(function() {
  if (this.subscriptionType === 'business') {
    return false; // Business plans never expire
  }
  if (this.expiresAt) {
    return new Date() > this.expiresAt;
  }
  return false;
});

// Method to check if business can use boost today (for business plans)
subscriptionSchema.methods.canUseBoostToday = function() {
  if (this.subscriptionType !== 'business') {
    return false; // Only business plans have daily boost limits
  }
  
  if (this.maxBoostPerDay === 0) {
    return false; // No boost allowance
  }
  
  const today = new Date().toDateString();
  const lastBoostDay = this.boostUsage.lastResetDate ? new Date(this.boostUsage.lastResetDate).toDateString() : null;
  
  if (lastBoostDay !== today) {
    return true; // First boost of the day
  }
  
  return this.boostUsage.currentDay < this.maxBoostPerDay;
};

export default mongoose.model('Subscription', subscriptionSchema);
