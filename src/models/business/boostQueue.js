import mongoose from 'mongoose';

const boostQueueSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  categoryName: {
    type: String,
    required: true
  },
  queue: [{
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true
    },
    businessName: {
      type: String,
      required: true
    },
    businessOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessOwner',
      required: true
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true
    },
    paymentIntentId: {
      type: String,
      required: true
    },
    boostStartTime: {
      type: Date,
      default: null
    },
    boostEndTime: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'expired', 'cancelled'],
      default: 'pending'
    },
    position: {
      type: Number,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    estimatedStartTime: {
      type: Date,
      default: null
    },
    estimatedEndTime: {
      type: Date,
      default: null
    }
  }],
  currentlyActive: {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null
    },
    boostStartTime: {
      type: Date,
      default: null
    },
    boostEndTime: {
      type: Date,
      default: null
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
boostQueueSchema.index({ category: 1 });
boostQueueSchema.index({ 'queue.business': 1 });
boostQueueSchema.index({ 'queue.status': 1 });
boostQueueSchema.index({ 'currentlyActive.business': 1 });

// Method to add business to queue
boostQueueSchema.methods.addToQueue = async function(businessData) {
  const position = this.queue.length + 1;
  
  // Calculate estimated start time based on current queue
  let estimatedStartTime = new Date();
  if (this.currentlyActive.business) {
    estimatedStartTime = new Date(this.currentlyActive.boostEndTime);
  }
  
  // Add 24 hours for each business in queue before this one
  const queuePosition = this.queue.filter(item => item.status === 'pending').length;
  estimatedStartTime.setHours(estimatedStartTime.getHours() + (queuePosition * 24));
  
  const estimatedEndTime = new Date(estimatedStartTime);
  estimatedEndTime.setHours(estimatedEndTime.getHours() + 24);
  
  const queueItem = {
    ...businessData,
    position,
    estimatedStartTime,
    estimatedEndTime
  };
  
  this.queue.push(queueItem);
  this.lastUpdated = new Date();
  
  return this.save();
};

// Method to remove business from queue
boostQueueSchema.methods.removeFromQueue = async function(businessId) {
  const index = this.queue.findIndex(item => 
    item.business.toString() === businessId.toString() && 
    item.status === 'pending'
  );
  
  if (index !== -1) {
    this.queue.splice(index, 1);
    
    // Recalculate positions
    this.queue.forEach((item, idx) => {
      if (item.status === 'pending') {
        item.position = idx + 1;
      }
    });
    
    this.lastUpdated = new Date();
    return this.save();
  }
  
  return false;
};

// Method to activate next business in queue
boostQueueSchema.methods.activateNext = async function() {
  const nextBusiness = this.queue.find(item => item.status === 'pending');
  
  if (!nextBusiness) {
    // No pending businesses, clear currently active
    this.currentlyActive = {
      business: null,
      boostStartTime: null,
      boostEndTime: null,
      subscription: null
    };
    this.lastUpdated = new Date();
    return this.save();
  }
  
  const now = new Date();
  const boostEndTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  
  // Update currently active
  this.currentlyActive = {
    business: nextBusiness.business,
    boostStartTime: now,
    boostEndTime: boostEndTime,
    subscription: nextBusiness.subscription
  };
  
  // Update queue item
  nextBusiness.status = 'active';
  nextBusiness.boostStartTime = now;
  nextBusiness.boostEndTime = boostEndTime;
  
  // Recalculate estimated times for remaining pending items
  let currentTime = new Date(boostEndTime);
  this.queue.forEach(item => {
    if (item.status === 'pending') {
      item.estimatedStartTime = new Date(currentTime);
      item.estimatedEndTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
      currentTime = new Date(item.estimatedEndTime);
    }
  });
  
  this.lastUpdated = new Date();
  return this.save();
};

// Method to expire current boost
boostQueueSchema.methods.expireCurrentBoost = async function() {
  if (this.currentlyActive.business) {
    // Mark current boost as expired
    const currentItem = this.queue.find(item => 
      item.business.toString() === this.currentlyActive.business.toString() &&
      item.status === 'active'
    );
    
    if (currentItem) {
      currentItem.status = 'expired';
    }
    
    // Activate next business
    await this.activateNext();
  }
};

// Method to get queue position for a business
boostQueueSchema.methods.getQueuePosition = function(businessId) {
  const item = this.queue.find(item => 
    item.business.toString() === businessId.toString() &&
    item.status === 'pending'
  );
  
  return item ? item.position : null;
};

// Method to get estimated start time for a business
boostQueueSchema.methods.getEstimatedStartTime = function(businessId) {
  const item = this.queue.find(item => 
    item.business.toString() === businessId.toString() &&
    item.status === 'pending'
  );
  
  return item ? item.estimatedStartTime : null;
};

// Method to check if business is currently active
boostQueueSchema.methods.isBusinessActive = function(businessId) {
  return this.currentlyActive.business && 
         this.currentlyActive.business.toString() === businessId.toString();
};

// Method to get time remaining for current boost
boostQueueSchema.methods.getCurrentBoostTimeRemaining = function() {
  if (!this.currentlyActive.business || !this.currentlyActive.boostEndTime) {
    return null;
  }
  
  const now = new Date();
  const endTime = new Date(this.currentlyActive.boostEndTime);
  const remaining = endTime - now;
  
  return remaining > 0 ? remaining : 0;
};

export default mongoose.model('BoostQueue', boostQueueSchema);
