import mongoose from 'mongoose';
import { GLOBAL_ENUMS } from '../../config/globalConfig.js';

/**
 * Payment Model (Admin side)
 * 
 * Tracks all payment transactions for business subscriptions and boosts
 * Admins can view payment history, status, and analytics
 */
const paymentSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },
  paymentPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentPlan',
    required: true
  },
  subscriptionType: {
    type: String,
    enum: ['business', 'boost'],
    required: true
  },
  paymentType: {
    type: String,
    enum: ['subscription', 'boost', 'renewal', 'upgrade'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  // Payment amounts
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  discount: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number,
    required: true
  },
  // Stripe payment details
  stripePaymentIntentId: {
    type: String,
    required: true
  },
  stripeCustomerId: {
    type: String,
    required: true
  },
  stripeChargeId: {
    type: String,
    default: null
  },
  // Payment method
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'wallet'],
    default: 'card'
  },
  // Business details at time of payment
  businessName: {
    type: String,
    required: true
  },
  businessEmail: {
    type: String,
    required: true
  },
  // Plan details at time of payment
  planName: {
    type: String,
    required: true
  },
  planDescription: {
    type: String,
    required: true
  },
  // Features and limits at time of payment
  features: [{
    type: String,
    enum: [GLOBAL_ENUMS.features.QUERY, GLOBAL_ENUMS.features.REVIEW, GLOBAL_ENUMS.features.EMBEDDED, GLOBAL_ENUMS.features.BOOST]
  }],
  maxBoostPerDay: {
    type: Number,
    default: 0
  },
  validityHours: {
    type: Number,
    min: 1,
    max: 168
  },
  // Payment metadata
  invoiceNumber: {
    type: String,
    unique: true
  },
  receiptUrl: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    trim: true
  },
  // Error tracking
  errorMessage: {
    type: String,
    default: null
  },
  retryCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
paymentSchema.index({ businessId: 1, createdAt: -1 });
paymentSchema.index({ subscriptionId: 1 });
paymentSchema.index({ paymentPlanId: 1 });
paymentSchema.index({ subscriptionType: 1, status: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ invoiceNumber: 1 });

// Pre-save middleware to generate invoice number and calculate final amount
paymentSchema.pre('save', function(next) {
  // Generate invoice number if not exists
  if (!this.invoiceNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    this.invoiceNumber = `INV-${timestamp}-${random}`;
  }
  
  // Calculate final amount after discount
  if (this.discount > 0) {
    this.finalAmount = this.amount - (this.amount * (this.discount / 100));
  } else {
    this.finalAmount = this.amount;
  }
  
  next();
});

// Virtual for payment status display
paymentSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'pending': 'Payment Pending',
    'completed': 'Payment Successful',
    'failed': 'Payment Failed',
    'refunded': 'Payment Refunded',
    'cancelled': 'Payment Cancelled'
  };
  return statusMap[this.status] || this.status;
});

// Virtual for payment type display
paymentSchema.virtual('paymentTypeDisplay').get(function() {
  const typeMap = {
    'subscription': 'Business Subscription',
    'boost': 'Visibility Boost',
    'renewal': 'Plan Renewal',
    'upgrade': 'Plan Upgrade'
  };
  return typeMap[this.paymentType] || this.paymentType;
});

// Method to mark payment as completed
paymentSchema.methods.markCompleted = function(stripeChargeId) {
  this.status = 'completed';
  this.stripeChargeId = stripeChargeId;
  this.receiptUrl = `https://receipt.stripe.com/${stripeChargeId}`;
  return this.save();
};

// Method to mark payment as failed
paymentSchema.methods.markFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.retryCount += 1;
  return this.save();
};

// Method to mark payment as refunded
paymentSchema.methods.markRefunded = function() {
  this.status = 'refunded';
  return this.save();
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = async function(businessId = null) {
  const matchStage = businessId ? { businessId: new mongoose.Types.ObjectId(businessId) } : {};
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$finalAmount' }
      }
    }
  ]);
  
  return stats;
};

export default mongoose.model('Payment', paymentSchema);
