import NotificationService from '../services/notificationService.js';

/**
 * Notification Helper
 * Provides utility functions to send notifications for various business events
 */

// Subscription-related notifications
export const sendSubscriptionNotifications = {
  // Business subscription created
  async businessSubscriptionCreated(businessId, subscriptionData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Business Subscription Activated',
      body: `Your ${subscriptionData.planName} subscription has been successfully activated.`,
      type: 'subscription',
      category: 'business_subscription',
      actionUrl: '/dashboard/subscriptions',
      data: {
        subscriptionId: subscriptionData.subscriptionId,
        planName: subscriptionData.planName,
        amount: subscriptionData.amount,
        currency: subscriptionData.currency
      },
      priority: 'high'
    });
  },

  // Business subscription upgraded
  async businessSubscriptionUpgraded(businessId, subscriptionData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Business Subscription Upgraded',
      body: `Your subscription has been upgraded to ${subscriptionData.newPlanName}.`,
      type: 'subscription',
      category: 'business_subscription',
      actionUrl: '/dashboard/subscriptions',
      data: {
        subscriptionId: subscriptionData.subscriptionId,
        oldPlanName: subscriptionData.oldPlanName,
        newPlanName: subscriptionData.newPlanName,
        priceDifference: subscriptionData.priceDifference
      },
      priority: 'high'
    });
  },

  // Business subscription canceled
  async businessSubscriptionCanceled(businessId, subscriptionData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Business Subscription Canceled',
      body: `Your ${subscriptionData.planName} subscription has been canceled.`,
      type: 'subscription',
      category: 'business_subscription',
      actionUrl: '/dashboard/subscriptions',
      data: {
        subscriptionId: subscriptionData.subscriptionId,
        planName: subscriptionData.planName,
        refundAmount: subscriptionData.refundAmount
      },
      priority: 'normal'
    });
  },

  // Boost subscription created
  async boostSubscriptionCreated(businessId, subscriptionData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Boost Subscription Activated',
      body: `Your ${subscriptionData.planName} boost has been activated for ${subscriptionData.validityHours} hours.`,
      type: 'boost',
      category: 'boost_subscription',
      actionUrl: '/dashboard/boost',
      data: {
        subscriptionId: subscriptionData.subscriptionId,
        planName: subscriptionData.planName,
        validityHours: subscriptionData.validityHours,
        categoryName: subscriptionData.categoryName
      },
      priority: 'high'
    });
  },

  // Boost subscription expired
  async boostSubscriptionExpired(businessId, subscriptionData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Boost Subscription Expired',
      body: `Your ${subscriptionData.planName} boost has expired. You can purchase a new boost anytime.`,
      type: 'boost',
      category: 'boost_subscription',
      actionUrl: '/dashboard/boost',
      data: {
        subscriptionId: subscriptionData.subscriptionId,
        planName: subscriptionData.planName,
        categoryName: subscriptionData.categoryName
      },
      priority: 'normal'
    });
  }
};

// Payment-related notifications
export const sendPaymentNotifications = {
  // Payment successful
  async paymentSuccessful(businessId, paymentData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Payment Successful',
      body: `Payment of ${paymentData.amount} ${paymentData.currency} has been processed successfully.`,
      type: 'payment',
      category: 'payment_success',
      actionUrl: '/dashboard/payments',
      data: {
        paymentId: paymentData.paymentId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        planName: paymentData.planName
      },
      priority: 'high'
    });
  },

  // Payment failed
  async paymentFailed(businessId, paymentData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Payment Failed',
      body: `Payment of ${paymentData.amount} ${paymentData.currency} failed. Please try again.`,
      type: 'payment',
      category: 'payment_failed',
      actionUrl: '/dashboard/payments',
      data: {
        paymentId: paymentData.paymentId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        error: paymentData.error
      },
      priority: 'high'
    });
  },

  // Refund processed
  async refundProcessed(businessId, refundData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Refund Processed',
      body: `Refund of ${refundData.amount} ${refundData.currency} has been processed.`,
      type: 'payment',
      category: 'payment_success',
      actionUrl: '/dashboard/payments',
      data: {
        refundId: refundData.refundId,
        amount: refundData.amount,
        currency: refundData.currency,
        reason: refundData.reason
      },
      priority: 'normal'
    });
  }
};

// Review-related notifications
export const sendReviewNotifications = {
  // New review received
  async newReviewReceived(businessId, reviewData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'New Review Received',
      body: `You have received a new ${reviewData.rating}-star review from ${reviewData.reviewerName}.`,
      type: 'review',
      category: 'review_received',
      actionUrl: '/dashboard/reviews',
      data: {
        reviewId: reviewData.reviewId,
        rating: reviewData.rating,
        reviewerName: reviewData.reviewerName,
        comment: reviewData.comment
      },
      priority: 'normal'
    });
  },

  // Review reply received
  async reviewReplyReceived(businessId, replyData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Review Reply Received',
      body: `A reply has been added to your review by ${replyData.replierName}.`,
      type: 'review',
      category: 'review_received',
      actionUrl: '/dashboard/reviews',
      data: {
        reviewId: replyData.reviewId,
        replyId: replyData.replyId,
        replierName: replyData.replierName,
        replyText: replyData.replyText
      },
      priority: 'normal'
    });
  }
};

// Query ticket notifications
export const sendQueryTicketNotifications = {
  // Query ticket assigned
  async queryTicketAssigned(businessId, ticketData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Query Ticket Assigned',
      body: `Your query ticket "${ticketData.subject}" has been assigned to our support team.`,
      type: 'query',
      category: 'query_assigned',
      actionUrl: '/dashboard/support',
      data: {
        ticketId: ticketData.ticketId,
        subject: ticketData.subject,
        priority: ticketData.priority,
        assignedTo: ticketData.assignedTo
      },
      priority: 'normal'
    });
  },

  // Query ticket resolved
  async queryTicketResolved(businessId, ticketData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Query Ticket Resolved',
      body: `Your query ticket "${ticketData.subject}" has been resolved.`,
      type: 'query',
      category: 'query_resolved',
      actionUrl: '/dashboard/support',
      data: {
        ticketId: ticketData.ticketId,
        subject: ticketData.subject,
        resolution: ticketData.resolution
      },
      priority: 'normal'
    });
  }
};

// System notifications
export const sendSystemNotifications = {
  // System maintenance
  async systemMaintenance(recipientId, recipientType, maintenanceData) {
    return await NotificationService.sendToUser(recipientId, recipientType, {
      title: 'System Maintenance',
      body: `Scheduled maintenance on ${maintenanceData.date} from ${maintenanceData.startTime} to ${maintenanceData.endTime}.`,
      type: 'system',
      category: 'system_maintenance',
      actionUrl: '/status',
      data: {
        date: maintenanceData.date,
        startTime: maintenanceData.startTime,
        endTime: maintenanceData.endTime,
        description: maintenanceData.description
      },
      priority: 'high'
    });
  },

  // Security alert
  async securityAlert(recipientId, recipientType, securityData) {
    return await NotificationService.sendToUser(recipientId, recipientType, {
      title: 'Security Alert',
      body: `Security alert: ${securityData.description}`,
      type: 'security',
      category: 'security_alert',
      actionUrl: '/dashboard/security',
      data: {
        alertType: securityData.alertType,
        description: securityData.description,
        actionRequired: securityData.actionRequired
      },
      priority: 'high'
    });
  },

  // Feature update
  async featureUpdate(recipientId, recipientType, updateData) {
    return await NotificationService.sendToUser(recipientId, recipientType, {
      title: 'New Feature Available',
      body: `New feature: ${updateData.featureName} - ${updateData.description}`,
      type: 'update',
      category: 'feature_update',
      actionUrl: '/dashboard/features',
      data: {
        featureName: updateData.featureName,
        description: updateData.description,
        version: updateData.version
      },
      priority: 'normal'
    });
  }
};

// Promotion notifications
export const sendPromotionNotifications = {
  // Promotion offer
  async promotionOffer(recipientId, recipientType, promotionData) {
    return await NotificationService.sendToUser(recipientId, recipientType, {
      title: 'Special Promotion',
      body: `${promotionData.discount}% off on ${promotionData.offerName}. Valid until ${promotionData.expiryDate}.`,
      type: 'promotion',
      category: 'promotion_offer',
      actionUrl: '/promotions',
      data: {
        discount: promotionData.discount,
        offerName: promotionData.offerName,
        expiryDate: promotionData.expiryDate,
        promoCode: promotionData.promoCode
      },
      priority: 'normal'
    });
  }
};

// Bulk notifications
export const sendBulkNotifications = {
  // Send to all businesses
  async toAllBusinesses(notificationData) {
    return await NotificationService.sendToAllUsers('business', notificationData);
  },

  // Send to all admins
  async toAllAdmins(notificationData) {
    return await NotificationService.sendToAllUsers('admin', notificationData);
  },

  // Send to topic subscribers
  async toTopic(topic, notificationData) {
    return await NotificationService.sendToTopic(topic, notificationData);
  }
};

// Utility functions
export const notificationUtils = {
  // Send notification with retry logic
  async sendWithRetry(recipientId, recipientType, notificationData, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await NotificationService.sendToUser(recipientId, recipientType, notificationData);
        if (result.success) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error.message;
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw new Error(`Failed to send notification after ${maxRetries} attempts: ${lastError}`);
  },

  // Send notification with delay
  async sendWithDelay(recipientId, recipientType, notificationData, delayMs) {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const result = await NotificationService.sendToUser(recipientId, recipientType, notificationData);
        resolve(result);
      }, delayMs);
    });
  },

  // Send notification at scheduled time
  async sendScheduled(recipientId, recipientType, notificationData, scheduledTime) {
    const now = new Date();
    const scheduled = new Date(scheduledTime);
    const delayMs = scheduled.getTime() - now.getTime();
    
    if (delayMs <= 0) {
      return await NotificationService.sendToUser(recipientId, recipientType, notificationData);
    }
    
    return await this.sendWithDelay(recipientId, recipientType, notificationData, delayMs);
  }
};

export default {
  sendSubscriptionNotifications,
  sendPaymentNotifications,
  sendReviewNotifications,
  sendQueryTicketNotifications,
  sendSystemNotifications,
  sendPromotionNotifications,
  sendBulkNotifications,
  notificationUtils
};
