import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Recipient information
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'recipientModel',
    required: true
  },
  recipientModel: {
    type: String,
    enum: ['Business', 'Admin'],
    required: true
  },
  recipientType: {
    type: String,
    enum: ['business', 'admin'],
    required: true
  },

  // Notification content
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  body: {
    type: String,
    required: true,
    maxlength: 500
  },
  image: {
    type: String,
    default: null
  },

  // Notification type and category
  type: {
    type: String,
    enum: [
      'subscription', 
      'boost', 
      'payment', 
      'review', 
      'query', 
      'system', 
      'promotion',
      'security',
      'update'
    ],
    required: true
  },
  category: {
    type: String,
    enum: [
      'business_subscription',
      'boost_subscription', 
      'payment_success',
      'payment_failed',
      'review_received',
      'query_assigned',
      'query_resolved',
      'system_maintenance',
      'security_alert',
      'feature_update',
      'promotion_offer',
      // New categories
      'business_registration',
      'business_update',
      'business_status_change',
      'owner_registration',
      'subscription_purchase',
      'subscription_upgrade',
      'boost_purchase',
      'boost_cancel',
      'query_created',
      'query_updated',
      'query_status_change'
    ],
    required: true
  },

  // Action data
  actionUrl: {
    type: String,
    default: null
  },
  actionData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Status tracking
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  readAt: {
    type: Date,
    default: null
  },

  // Firebase specific
  fcmToken: {
    type: String,
    default: null
  },
  fcmMessageId: {
    type: String,
    default: null
  },

  // Priority and scheduling
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  sentAt: {
    type: Date,
    default: Date.now
  },

  // Metadata
  metadata: {
    type: Map,
    of: String,
    default: {}
  },

  // Expiration
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ recipient: 1, recipientType: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ type: 1, category: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ scheduledAt: 1 });
notificationSchema.index({ expiresAt: 1 });

// Virtual for checking if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual for checking if notification is read
notificationSchema.virtual('isRead').get(function() {
  return this.status === 'read';
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Method to mark as delivered
notificationSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  return this.save();
};

// Method to mark as failed
notificationSchema.methods.markAsFailed = function() {
  this.status = 'failed';
  return this.save();
};

// Static method to get unread notifications
notificationSchema.statics.getUnreadNotifications = function(recipientId, recipientType, limit = 50) {
  return this.find({
    recipient: recipientId,
    recipientType: recipientType,
    status: { $in: ['sent', 'delivered'] }
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to get notifications by type
notificationSchema.statics.getNotificationsByType = function(recipientId, recipientType, type, limit = 20) {
  return this.find({
    recipient: recipientId,
    recipientType: recipientType,
    type: type
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to mark all notifications as read
notificationSchema.statics.markAllAsRead = function(recipientId, recipientType) {
  return this.updateMany(
    {
      recipient: recipientId,
      recipientType: recipientType,
      status: { $in: ['sent', 'delivered'] }
    },
    {
      status: 'read',
      readAt: new Date()
    }
  );
};

// Static method to delete expired notifications
notificationSchema.statics.deleteExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

export default mongoose.model('Notification', notificationSchema);
