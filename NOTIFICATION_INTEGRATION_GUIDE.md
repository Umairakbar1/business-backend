# Comprehensive Notification Integration Guide

## Overview

This guide provides step-by-step instructions for integrating notifications into all business-related activities. The notification system has been enhanced to cover all the requested scenarios with proper business owner and admin notifications.

## ✅ Implemented Notification Categories

### 1. Business Registration & Management
- ✅ Business registration completed (business owner + admin)
- ✅ Business profile updated (business owner + admin)
- ✅ Business status changed (business owner + admin)

### 2. Owner Management
- ✅ New owner signup (admin notification)

### 3. Reviews
- ✅ New review received (business owner + admin)
- ✅ Review reply received (business owner)

### 4. Subscriptions
- ✅ Subscription purchased (business owner + admin)
- ✅ Subscription upgraded (business owner + admin)
- ✅ Subscription canceled (business owner + admin)

### 5. Boost Management
- ✅ Boost purchased (business owner + admin)
- ✅ Boost canceled (business owner + admin)
- ✅ Boost expired (business owner)

### 6. Query Tickets
- ✅ Query ticket created (business owner + admin)
- ✅ Query ticket updated (business owner + admin)
- ✅ Query ticket status changed (business owner + admin)

### 7. Payments
- ✅ Payment successful (business owner)
- ✅ Payment failed (business owner)
- ✅ Refund processed (business owner)

## 🔧 Integration Examples

### Business Registration Integration

```javascript
// In business controller createBusiness function
import NotificationHelper from '../../helpers/notificationHelper.js';
import Admin from '../../models/admin/admin.js';

// After successful business creation
try {
  // Send notification to business owner
  await NotificationHelper.sendBusinessNotifications.businessRegistrationCompleted(
    businessObj._id,
    {
      businessName: businessObj.businessName,
      category: businessObj.category,
      registrationDate: new Date()
    }
  );

  // Send notification to all admins
  const admins = await Admin.find({ status: 'active' });
  for (const admin of admins) {
    await NotificationHelper.sendBusinessNotifications.businessRegistrationAdminNotification(
      admin._id,
      {
        businessId: businessObj._id,
        businessName: businessObj.businessName,
        ownerName: `${req.user.firstName} ${req.user.lastName}`,
        category: businessObj.category,
        registrationDate: new Date()
      }
    );
  }
} catch (notificationError) {
  console.error('Error sending business registration notifications:', notificationError);
  // Don't fail the request if notifications fail
}
```

### Review Integration

```javascript
// In review controller createReview function
import NotificationHelper from '../../helpers/notificationHelper.js';
import Admin from '../../models/admin/admin.js';

// After successful review creation
try {
  // Send notification to business owner
  await NotificationHelper.sendEnhancedReviewNotifications.newReviewReceived(
    businessId,
    {
      reviewId: review._id,
      rating: review.rating,
      reviewerName: `${req.user.firstName} ${req.user.lastName}`,
      comment: review.comment,
      businessName: business.businessName
    }
  );

  // Send notification to all admins
  const admins = await Admin.find({ status: 'active' });
  for (const admin of admins) {
    await NotificationHelper.sendEnhancedReviewNotifications.newReviewAdminNotification(
      admin._id,
      {
        reviewId: review._id,
        rating: review.rating,
        reviewerName: `${req.user.firstName} ${req.user.lastName}`,
        businessName: business.businessName,
        comment: review.comment
      }
    );
  }
} catch (notificationError) {
  console.error('Error sending review notifications:', notificationError);
}
```

### Subscription Integration

```javascript
// In subscription controller or Stripe webhook
import NotificationHelper from '../../helpers/notificationHelper.js';
import Admin from '../../models/admin/admin.js';

// After successful subscription purchase
try {
  // Send notification to business owner
  await NotificationHelper.sendEnhancedSubscriptionNotifications.subscriptionPurchased(
    businessId,
    {
      subscriptionId: subscription._id,
      planName: planName,
      amount: amount,
      currency: currency,
      duration: duration
    }
  );

  // Send notification to all admins
  const admins = await Admin.find({ status: 'active' });
  for (const admin of admins) {
    await NotificationHelper.sendEnhancedSubscriptionNotifications.subscriptionPurchaseAdminNotification(
      admin._id,
      {
        subscriptionId: subscription._id,
        businessId: businessId,
        businessName: business.businessName,
        planName: planName,
        amount: amount,
        currency: currency
      }
    );
  }
} catch (notificationError) {
  console.error('Error sending subscription notifications:', notificationError);
}
```

### Boost Integration

```javascript
// In boost controller purchaseBoost function
import NotificationHelper from '../../helpers/notificationHelper.js';
import Admin from '../../models/admin/admin.js';

// After successful boost purchase
try {
  // Send notification to business owner
  await NotificationHelper.sendEnhancedBoostNotifications.boostPurchased(
    businessId,
    {
      boostId: boost._id,
      boostType: boostType,
      category: category,
      duration: duration,
      amount: amount,
      currency: currency
    }
  );

  // Send notification to all admins
  const admins = await Admin.find({ status: 'active' });
  for (const admin of admins) {
    await NotificationHelper.sendEnhancedBoostNotifications.boostPurchaseAdminNotification(
      admin._id,
      {
        boostId: boost._id,
        businessId: businessId,
        businessName: business.businessName,
        boostType: boostType,
        category: category,
        amount: amount,
        currency: currency
      }
    );
  }
} catch (notificationError) {
  console.error('Error sending boost notifications:', notificationError);
}
```

### Query Ticket Integration

```javascript
// In query ticket controller createTicket function
import NotificationHelper from '../../helpers/notificationHelper.js';
import Admin from '../../models/admin/admin.js';

// After successful ticket creation
try {
  // Send notification to business owner
  await NotificationHelper.sendEnhancedQueryTicketNotifications.queryTicketCreated(
    businessId,
    {
      ticketId: ticket._id,
      subject: ticket.subject,
      priority: ticket.priority,
      category: ticket.category,
      createdDate: new Date()
    }
  );

  // Send notification to all admins
  const admins = await Admin.find({ status: 'active' });
  for (const admin of admins) {
    await NotificationHelper.sendEnhancedQueryTicketNotifications.queryTicketCreatedAdminNotification(
      admin._id,
      {
        ticketId: ticket._id,
        businessId: businessId,
        businessName: business.businessName,
        subject: ticket.subject,
        priority: ticket.priority,
        category: ticket.category
      }
    );
  }
} catch (notificationError) {
  console.error('Error sending query ticket notifications:', notificationError);
}
```

## 📋 Remaining Integration Tasks

### 1. Owner Signup Integration
**Location**: User registration controller
**Function**: `registerUser` or `createUser`
**Notifications**:
- `sendOwnerNotifications.newOwnerSignupAdminNotification`

### 2. Subscription Upgrade Integration
**Location**: Subscription controller or Stripe webhook
**Function**: `upgradeSubscription` or `handleSubscriptionUpdated`
**Notifications**:
- `sendEnhancedSubscriptionNotifications.subscriptionUpgraded`
- `sendEnhancedSubscriptionNotifications.subscriptionUpgradeAdminNotification`

### 3. Boost Cancel Integration
**Location**: Boost controller
**Function**: `cancelBoost`
**Notifications**:
- `sendEnhancedBoostNotifications.boostCanceled`
- `sendEnhancedBoostNotifications.boostCancelAdminNotification`

### 4. Query Ticket Update Integration
**Location**: Query ticket controller
**Function**: `updateTicket`
**Notifications**:
- `sendEnhancedQueryTicketNotifications.queryTicketUpdated`
- `sendEnhancedQueryTicketNotifications.queryTicketUpdatedAdminNotification`

### 5. Query Ticket Status Change Integration
**Location**: Query ticket controller
**Function**: `changeTicketStatus`
**Notifications**:
- `sendEnhancedQueryTicketNotifications.queryTicketStatusChanged`
- `sendEnhancedQueryTicketNotifications.queryTicketStatusChangeAdminNotification`

### 6. Business Status Change Integration
**Location**: Admin business controller
**Function**: `updateBusinessStatus`
**Notifications**:
- `sendBusinessNotifications.businessStatusChanged`
- `sendBusinessNotifications.businessStatusChangeAdminNotification`

## 🚀 Quick Integration Steps

1. **Import Required Modules**:
```javascript
import NotificationHelper from '../../helpers/notificationHelper.js';
import Admin from '../../models/admin/admin.js';
```

2. **Add Notification Logic**:
```javascript
try {
  // Send notification to business owner
  await NotificationHelper.[CATEGORY].[FUNCTION](
    businessId,
    notificationData
  );

  // Send notification to all admins
  const admins = await Admin.find({ status: 'active' });
  for (const admin of admins) {
    await NotificationHelper.[CATEGORY].[FUNCTION]AdminNotification(
      admin._id,
      adminNotificationData
    );
  }
} catch (notificationError) {
  console.error('Error sending notifications:', notificationError);
  // Don't fail the request if notifications fail
}
```

3. **Test Notifications**:
- Ensure Firebase is properly configured
- Test with real devices/browsers
- Check notification delivery in Firebase console
- Verify database records are created

## 🔧 Configuration Requirements

### Environment Variables
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

### Database Setup
- Ensure `Notification` model is properly configured
- Verify `Admin` model exists and is accessible
- Check FCM token storage mechanism

### Frontend Integration
- Ensure notification service is initialized
- Verify FCM token registration
- Test notification display components

## 📊 Notification Categories Reference

| Category | Business Owner | Admin | Priority |
|----------|---------------|-------|----------|
| Business Registration | ✅ | ✅ | High |
| Business Update | ✅ | ✅ | Normal |
| Business Status Change | ✅ | ✅ | High |
| Owner Signup | ❌ | ✅ | Normal |
| Review Received | ✅ | ✅ | Normal |
| Subscription Purchase | ✅ | ✅ | High |
| Subscription Upgrade | ✅ | ✅ | High |
| Boost Purchase | ✅ | ✅ | High |
| Boost Cancel | ✅ | ✅ | Normal |
| Query Created | ✅ | ✅ | Normal |
| Query Updated | ✅ | ✅ | Normal |
| Query Status Change | ✅ | ✅ | Normal |

## 🎯 Next Steps

1. Complete remaining controller integrations
2. Test all notification flows
3. Implement notification preferences
4. Add notification analytics
5. Create admin notification dashboard
6. Implement notification templates customization

## 📞 Support

For questions or issues with notification integration:
1. Check Firebase console for delivery status
2. Verify FCM token registration
3. Check database notification records
4. Review error logs for notification failures
