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

// Business registration and management notifications
export const sendBusinessNotifications = {
  // Business registration completed
  async businessRegistrationCompleted(businessId, businessData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Business Registration Successful',
      body: `Welcome! Your business "${businessData.businessName}" has been successfully registered.`,
      type: 'system',
      category: 'business_registration',
      actionUrl: '/dashboard',
      data: {
        businessId: businessId,
        businessName: businessData.businessName,
        category: businessData.category,
        registrationDate: businessData.registrationDate
      },
      priority: 'high'
    });
  },

  // Business registration notification for admin
  async businessRegistrationAdminNotification(adminId, businessData) {
    return await NotificationService.sendToUser(adminId, 'admin', {
      title: 'New Business Registration',
      body: `New business "${businessData.businessName}" has been registered and requires review.`,
      type: 'system',
      category: 'business_registration',
      actionUrl: '/admin/businesses',
      data: {
        businessId: businessData.businessId,
        businessName: businessData.businessName,
        ownerName: businessData.ownerName,
        category: businessData.category,
        registrationDate: businessData.registrationDate
      },
      priority: 'normal'
    });
  },

  // Business profile updated
  async businessProfileUpdated(businessId, businessData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Business Profile Updated',
      body: `Your business profile has been successfully updated.`,
      type: 'system',
      category: 'business_update',
      actionUrl: '/dashboard/profile',
      data: {
        businessId: businessId,
        businessName: businessData.businessName,
        updatedFields: businessData.updatedFields,
        updateDate: businessData.updateDate
      },
      priority: 'normal'
    });
  },

  // Business profile update notification for admin
  async businessProfileUpdateAdminNotification(adminId, businessData) {
    return await NotificationService.sendToUser(adminId, 'admin', {
      title: 'Business Profile Updated',
      body: `Business "${businessData.businessName}" has updated their profile.`,
      type: 'system',
      category: 'business_update',
      actionUrl: '/admin/businesses',
      data: {
        businessId: businessData.businessId,
        businessName: businessData.businessName,
        updatedFields: businessData.updatedFields,
        updateDate: businessData.updateDate
      },
      priority: 'low'
    });
  },

  // Business status changed
  async businessStatusChanged(businessId, statusData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Business Status Updated',
      body: `Your business status has been changed to "${statusData.newStatus}".`,
      type: 'system',
      category: 'business_status_change',
      actionUrl: '/dashboard/profile',
      data: {
        businessId: businessId,
        businessName: statusData.businessName,
        oldStatus: statusData.oldStatus,
        newStatus: statusData.newStatus,
        reason: statusData.reason,
        changeDate: statusData.changeDate
      },
      priority: 'high'
    });
  },

  // Business status change notification for admin
  async businessStatusChangeAdminNotification(adminId, statusData) {
    return await NotificationService.sendToUser(adminId, 'admin', {
      title: 'Business Status Changed',
      body: `Business "${statusData.businessName}" status changed from "${statusData.oldStatus}" to "${statusData.newStatus}".`,
      type: 'system',
      category: 'business_status_change',
      actionUrl: '/admin/businesses',
      data: {
        businessId: statusData.businessId,
        businessName: statusData.businessName,
        oldStatus: statusData.oldStatus,
        newStatus: statusData.newStatus,
        reason: statusData.reason,
        changeDate: statusData.changeDate
      },
      priority: 'normal'
    });
  }
};

// Owner signup notifications
export const sendOwnerNotifications = {
  // New owner signup notification for admin
  async newOwnerSignupAdminNotification(adminId, ownerData) {
    return await NotificationService.sendToUser(adminId, 'admin', {
      title: 'New Business Owner Registration',
      body: `New business owner "${ownerData.ownerName}" has registered and requires verification.`,
      type: 'system',
      category: 'owner_registration',
      actionUrl: '/admin/users',
      data: {
        ownerId: ownerData.ownerId,
        ownerName: ownerData.ownerName,
        email: ownerData.email,
        businessName: ownerData.businessName,
        registrationDate: ownerData.registrationDate
      },
      priority: 'normal'
    });
  }
};

// Enhanced review notifications
export const sendEnhancedReviewNotifications = {
  // New review received (enhanced)
  async newReviewReceived(businessId, reviewData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'New Review Received',
      body: `You received a ${reviewData.rating}-star review from ${reviewData.reviewerName}.`,
      type: 'review',
      category: 'review_received',
      actionUrl: '/dashboard/reviews',
      data: {
        reviewId: reviewData.reviewId,
        rating: reviewData.rating,
        reviewerName: reviewData.reviewerName,
        comment: reviewData.comment,
        businessName: reviewData.businessName
      },
      priority: 'normal'
    });
  },

  // New review notification for admin
  async newReviewAdminNotification(adminId, reviewData) {
    return await NotificationService.sendToUser(adminId, 'admin', {
      title: 'New Review Posted',
      body: `A ${reviewData.rating}-star review was posted for "${reviewData.businessName}".`,
      type: 'review',
      category: 'review_received',
      actionUrl: '/admin/reviews',
      data: {
        reviewId: reviewData.reviewId,
        rating: reviewData.rating,
        reviewerName: reviewData.reviewerName,
        businessName: reviewData.businessName,
        comment: reviewData.comment
      },
      priority: 'low'
    });
  }
};

// Enhanced subscription notifications
export const sendEnhancedSubscriptionNotifications = {
  // Subscription purchased
  async subscriptionPurchased(businessId, subscriptionData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Subscription Purchased',
      body: `Your ${subscriptionData.planName} subscription has been successfully purchased.`,
      type: 'subscription',
      category: 'subscription_purchase',
      actionUrl: '/dashboard/subscriptions',
      data: {
        subscriptionId: subscriptionData.subscriptionId,
        planName: subscriptionData.planName,
        amount: subscriptionData.amount,
        currency: subscriptionData.currency,
        duration: subscriptionData.duration
      },
      priority: 'high'
    });
  },

  // Subscription purchase notification for admin
  async subscriptionPurchaseAdminNotification(adminId, subscriptionData) {
    return await NotificationService.sendToUser(adminId, 'admin', {
      title: 'New Subscription Purchase',
      body: `Business "${subscriptionData.businessName}" purchased ${subscriptionData.planName} subscription.`,
      type: 'subscription',
      category: 'subscription_purchase',
      actionUrl: '/admin/subscriptions',
      data: {
        subscriptionId: subscriptionData.subscriptionId,
        businessId: subscriptionData.businessId,
        businessName: subscriptionData.businessName,
        planName: subscriptionData.planName,
        amount: subscriptionData.amount,
        currency: subscriptionData.currency
      },
      priority: 'normal'
    });
  },

  // Subscription upgraded
  async subscriptionUpgraded(businessId, subscriptionData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Subscription Upgraded',
      body: `Your subscription has been upgraded from ${subscriptionData.oldPlanName} to ${subscriptionData.newPlanName}.`,
      type: 'subscription',
      category: 'subscription_upgrade',
      actionUrl: '/dashboard/subscriptions',
      data: {
        subscriptionId: subscriptionData.subscriptionId,
        oldPlanName: subscriptionData.oldPlanName,
        newPlanName: subscriptionData.newPlanName,
        priceDifference: subscriptionData.priceDifference,
        upgradeDate: subscriptionData.upgradeDate
      },
      priority: 'high'
    });
  },

  // Subscription upgrade notification for admin
  async subscriptionUpgradeAdminNotification(adminId, subscriptionData) {
    return await NotificationService.sendToUser(adminId, 'admin', {
      title: 'Subscription Upgraded',
      body: `Business "${subscriptionData.businessName}" upgraded from ${subscriptionData.oldPlanName} to ${subscriptionData.newPlanName}.`,
      type: 'subscription',
      category: 'subscription_upgrade',
      actionUrl: '/admin/subscriptions',
      data: {
        subscriptionId: subscriptionData.subscriptionId,
        businessId: subscriptionData.businessId,
        businessName: subscriptionData.businessName,
        oldPlanName: subscriptionData.oldPlanName,
        newPlanName: subscriptionData.newPlanName,
        priceDifference: subscriptionData.priceDifference
      },
      priority: 'normal'
    });
  }
};

// Enhanced boost notifications
export const sendEnhancedBoostNotifications = {
  // Boost purchased
  async boostPurchased(businessId, boostData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Boost Purchased',
      body: `Your ${boostData.boostType} boost has been successfully purchased and activated.`,
      type: 'boost',
      category: 'boost_purchase',
      actionUrl: '/dashboard/boost',
      data: {
        boostId: boostData.boostId,
        boostType: boostData.boostType,
        category: boostData.category,
        duration: boostData.duration,
        amount: boostData.amount,
        currency: boostData.currency
      },
      priority: 'high'
    });
  },

  // Boost purchase notification for admin
  async boostPurchaseAdminNotification(adminId, boostData) {
    return await NotificationService.sendToUser(adminId, 'admin', {
      title: 'New Boost Purchase',
      body: `Business "${boostData.businessName}" purchased ${boostData.boostType} boost.`,
      type: 'boost',
      category: 'boost_purchase',
      actionUrl: '/admin/boosts',
      data: {
        boostId: boostData.boostId,
        businessId: boostData.businessId,
        businessName: boostData.businessName,
        boostType: boostData.boostType,
        category: boostData.category,
        amount: boostData.amount,
        currency: boostData.currency
      },
      priority: 'normal'
    });
  },

  // Boost canceled
  async boostCanceled(businessId, boostData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Boost Canceled',
      body: `Your ${boostData.boostType} boost has been canceled. Refund will be processed within 3-5 business days.`,
      type: 'boost',
      category: 'boost_cancel',
      actionUrl: '/dashboard/boost',
      data: {
        boostId: boostData.boostId,
        boostType: boostData.boostType,
        refundAmount: boostData.refundAmount,
        currency: boostData.currency,
        cancelDate: boostData.cancelDate
      },
      priority: 'normal'
    });
  },

  // Boost cancel notification for admin
  async boostCancelAdminNotification(adminId, boostData) {
    return await NotificationService.sendToUser(adminId, 'admin', {
      title: 'Boost Canceled',
      body: `Business "${boostData.businessName}" canceled their ${boostData.boostType} boost.`,
      type: 'boost',
      category: 'boost_cancel',
      actionUrl: '/admin/boosts',
      data: {
        boostId: boostData.boostId,
        businessId: boostData.businessId,
        businessName: boostData.businessName,
        boostType: boostData.boostType,
        refundAmount: boostData.refundAmount,
        currency: boostData.currency
      },
      priority: 'normal'
    });
  }
};

// Enhanced query ticket notifications
export const sendEnhancedQueryTicketNotifications = {
  // Query ticket created
  async queryTicketCreated(businessId, ticketData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Support Ticket Created',
      body: `Your support ticket "${ticketData.subject}" has been created successfully. Ticket ID: ${ticketData.ticketId}`,
      type: 'query',
      category: 'query_created',
      actionUrl: '/dashboard/support',
      data: {
        ticketId: ticketData.ticketId,
        subject: ticketData.subject,
        priority: ticketData.priority,
        category: ticketData.category,
        createdDate: ticketData.createdDate
      },
      priority: 'normal'
    });
  },

  // Query ticket created notification for admin
  async queryTicketCreatedAdminNotification(adminId, ticketData) {
    return await NotificationService.sendToUser(adminId, 'admin', {
      title: 'New Support Ticket',
      body: `New support ticket from "${ticketData.businessName}": "${ticketData.subject}"`,
      type: 'query',
      category: 'query_created',
      actionUrl: '/admin/support',
      data: {
        ticketId: ticketData.ticketId,
        businessId: ticketData.businessId,
        businessName: ticketData.businessName,
        subject: ticketData.subject,
        priority: ticketData.priority,
        category: ticketData.category
      },
      priority: 'normal'
    });
  },

  // Query ticket updated
  async queryTicketUpdated(businessId, ticketData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Support Ticket Updated',
      body: `Your support ticket "${ticketData.subject}" has been updated.`,
      type: 'query',
      category: 'query_updated',
      actionUrl: '/dashboard/support',
      data: {
        ticketId: ticketData.ticketId,
        subject: ticketData.subject,
        updateType: ticketData.updateType,
        updatedBy: ticketData.updatedBy,
        updateDate: ticketData.updateDate
      },
      priority: 'normal'
    });
  },

  // Query ticket updated notification for admin
  async queryTicketUpdatedAdminNotification(adminId, ticketData) {
    return await NotificationService.sendToUser(adminId, 'admin', {
      title: 'Support Ticket Updated',
      body: `Support ticket "${ticketData.subject}" has been updated by ${ticketData.updatedBy}.`,
      type: 'query',
      category: 'query_updated',
      actionUrl: '/admin/support',
      data: {
        ticketId: ticketData.ticketId,
        businessId: ticketData.businessId,
        businessName: ticketData.businessName,
        subject: ticketData.subject,
        updateType: ticketData.updateType,
        updatedBy: ticketData.updatedBy
      },
      priority: 'low'
    });
  },

  // Query ticket status changed
  async queryTicketStatusChanged(businessId, ticketData) {
    return await NotificationService.sendToUser(businessId, 'business', {
      title: 'Support Ticket Status Updated',
      body: `Your support ticket "${ticketData.subject}" status has been changed to "${ticketData.newStatus}".`,
      type: 'query',
      category: 'query_status_change',
      actionUrl: '/dashboard/support',
      data: {
        ticketId: ticketData.ticketId,
        subject: ticketData.subject,
        oldStatus: ticketData.oldStatus,
        newStatus: ticketData.newStatus,
        updatedBy: ticketData.updatedBy,
        updateDate: ticketData.updateDate
      },
      priority: 'normal'
    });
  },

  // Query ticket status change notification for admin
  async queryTicketStatusChangeAdminNotification(adminId, ticketData) {
    return await NotificationService.sendToUser(adminId, 'admin', {
      title: 'Support Ticket Status Changed',
      body: `Support ticket "${ticketData.subject}" status changed to "${ticketData.newStatus}" by ${ticketData.updatedBy}.`,
      type: 'query',
      category: 'query_status_change',
      actionUrl: '/admin/support',
      data: {
        ticketId: ticketData.ticketId,
        businessId: ticketData.businessId,
        businessName: ticketData.businessName,
        subject: ticketData.subject,
        oldStatus: ticketData.oldStatus,
        newStatus: ticketData.newStatus,
        updatedBy: ticketData.updatedBy
      },
      priority: 'low'
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
  notificationUtils,
  // New notification categories
  sendBusinessNotifications,
  sendOwnerNotifications,
  sendEnhancedReviewNotifications,
  sendEnhancedSubscriptionNotifications,
  sendEnhancedBoostNotifications,
  sendEnhancedQueryTicketNotifications
};
