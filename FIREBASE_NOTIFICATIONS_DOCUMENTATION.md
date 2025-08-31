# Firebase Notifications System Documentation

## Overview

This document describes the implementation of Firebase Cloud Messaging (FCM) notifications for both the business and admin platforms. The system provides real-time push notifications for various business events including subscriptions, payments, reviews, and system updates.

## Architecture

### Backend Components

1. **Firebase Configuration** (`src/config/firebase.js`)
   - Firebase Admin SDK initialization
   - Service account configuration
   - Environment variable management

2. **Notification Model** (`src/models/admin/notification.js`)
   - MongoDB schema for storing notifications
   - Status tracking (sent, delivered, read, failed)
   - Metadata and action data storage

3. **Notification Service** (`src/services/notificationService.js`)
   - Core notification sending logic
   - FCM token management
   - Topic subscription management
   - Error handling and retry logic

4. **Notification Controllers**
   - **Business Controller** (`src/controllers/business/notification.controller.js`)
   - **Admin Controller** (`src/controllers/admin/notification.controller.js`)

5. **Notification Helper** (`src/helpers/notificationHelper.js`)
   - Predefined notification templates
   - Business event integration
   - Bulk notification utilities

### Frontend Components

1. **Firebase Configuration** (`src/lib/firebase.js`)
   - Firebase client SDK initialization
   - Service worker registration
   - FCM token management

2. **Notification Service** (`src/lib/notificationService.js`)
   - API communication with backend
   - Token management
   - Notification CRUD operations

3. **React Hook** (`src/lib/hooks/useNotifications.js`)
   - State management for notifications
   - Real-time updates
   - Background refresh

4. **UI Components**
   - **NotificationBell** (`src/components/notifications/NotificationBell.jsx`)
   - **NotificationPanel** (`src/components/notifications/NotificationPanel.jsx`)

## Setup Instructions

### Backend Setup

1. **Install Dependencies**
   ```bash
   npm install firebase-admin
   ```

2. **Environment Variables**
   Add the following to your `.env` file:
   ```env
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_PRIVATE_KEY_ID=your_firebase_private_key_id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your_firebase_client_id
   FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
   FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
   FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
   FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com
   ```

3. **Database Schema Updates**
   - Add `fcmToken` field to Business and Admin models
   - Create Notification collection

### Frontend Setup

1. **Environment Variables**
   Add the following to your `.env.local` file:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
   ```

2. **Service Worker**
   - Place `firebase-messaging-sw.js` in the `public` directory
   - Update Firebase configuration in the service worker

## API Endpoints

### Business Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/business/notifications/:businessId/fcm-token` | Update FCM token |
| DELETE | `/business/notifications/:businessId/fcm-token` | Remove FCM token |
| GET | `/business/notifications/:businessId` | Get notifications |
| PATCH | `/business/notifications/:businessId/:notificationId/read` | Mark as read |
| PATCH | `/business/notifications/:businessId/mark-all-read` | Mark all as read |
| DELETE | `/business/notifications/:businessId/:notificationId` | Delete notification |
| GET | `/business/notifications/:businessId/stats` | Get statistics |

### Admin Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/notifications/:adminId/fcm-token` | Update FCM token |
| DELETE | `/admin/notifications/:adminId/fcm-token` | Remove FCM token |
| GET | `/admin/notifications/:adminId` | Get notifications |
| PATCH | `/admin/notifications/:adminId/:notificationId/read` | Mark as read |
| PATCH | `/admin/notifications/:adminId/mark-all-read` | Mark all as read |
| DELETE | `/admin/notifications/:adminId/:notificationId` | Delete notification |
| GET | `/admin/notifications/:adminId/stats` | Get statistics |
| POST | `/admin/notifications/send/business/:businessId` | Send to business |
| POST | `/admin/notifications/send/all-businesses` | Send to all businesses |
| POST | `/admin/notifications/send/topic/:topic` | Send to topic |
| POST | `/admin/notifications/subscribe-topic` | Subscribe to topic |
| POST | `/admin/notifications/unsubscribe-topic` | Unsubscribe from topic |

## Notification Types

### Subscription Notifications
- **businessSubscriptionCreated**: New business subscription activated
- **businessSubscriptionUpgraded**: Subscription upgraded to higher plan
- **businessSubscriptionCanceled**: Subscription canceled with refund info
- **boostSubscriptionCreated**: Boost subscription activated
- **boostSubscriptionExpired**: Boost subscription expired

### Payment Notifications
- **paymentSuccessful**: Payment processed successfully
- **paymentFailed**: Payment failed with error details
- **refundProcessed**: Refund processed with amount and reason

### Review Notifications
- **newReviewReceived**: New review received from customer
- **reviewReplyReceived**: Reply added to review

### Query Ticket Notifications
- **queryTicketAssigned**: Ticket assigned to support team
- **queryTicketResolved**: Ticket resolved with resolution details

### System Notifications
- **systemMaintenance**: Scheduled maintenance notifications
- **securityAlert**: Security alerts and warnings
- **featureUpdate**: New feature announcements

### Promotion Notifications
- **promotionOffer**: Special offers and discounts

## Usage Examples

### Backend Usage

1. **Send Notification to Business**
   ```javascript
   import { sendSubscriptionNotifications } from '../helpers/notificationHelper.js';

   // Send subscription created notification
   await sendSubscriptionNotifications.businessSubscriptionCreated(businessId, {
     subscriptionId: subscription._id.toString(),
     planName: paymentPlan.name,
     amount: subscription.amount,
     currency: subscription.currency
   });
   ```

2. **Send Bulk Notifications**
   ```javascript
   import { sendBulkNotifications } from '../helpers/notificationHelper.js';

   // Send to all businesses
   await sendBulkNotifications.toAllBusinesses({
     title: 'System Maintenance',
     body: 'Scheduled maintenance on Sunday 2-4 AM',
     type: 'system',
     category: 'system_maintenance',
     priority: 'high'
   });
   ```

3. **Send to Topic**
   ```javascript
   import NotificationService from '../services/notificationService.js';

   await NotificationService.sendToTopic('premium_users', {
     title: 'Premium Feature Available',
     body: 'New premium feature is now available!',
     type: 'update',
     category: 'feature_update'
   });
   ```

### Frontend Usage

1. **Initialize Notifications**
   ```javascript
   import { useNotifications } from '../lib/hooks/useNotifications.js';

   function Dashboard() {
     const { notifications, unreadCount, markAsRead } = useNotifications(businessId);
     
     return (
       <div>
         <NotificationBell businessId={businessId} />
         {/* Rest of dashboard */}
       </div>
     );
   }
   ```

2. **Handle Notification Click**
   ```javascript
   const handleNotificationClick = async (notification) => {
     if (notification.status !== 'read') {
       await markAsRead(notification._id);
     }
     
     if (notification.actionUrl) {
       window.location.href = notification.actionUrl;
     }
   };
   ```

## Notification Flow

1. **Event Trigger**: Business event occurs (subscription, payment, etc.)
2. **Notification Creation**: Backend creates notification record
3. **FCM Send**: Notification sent via Firebase Cloud Messaging
4. **Client Reception**: Frontend receives notification
5. **UI Update**: Notification displayed in UI
6. **User Interaction**: User clicks notification
7. **Status Update**: Notification marked as read
8. **Action Execution**: Navigate to relevant page

## Error Handling

### Backend Errors
- **Firebase not initialized**: Graceful fallback, log warning
- **FCM token not found**: Skip notification, log warning
- **Network errors**: Retry logic with exponential backoff
- **Invalid tokens**: Remove invalid tokens from database

### Frontend Errors
- **Permission denied**: Show permission request dialog
- **Service worker not supported**: Fallback to polling
- **Network errors**: Retry with exponential backoff
- **Token refresh failed**: Re-initialize Firebase

## Security Considerations

1. **Token Management**
   - Store FCM tokens securely
   - Validate tokens before sending
   - Remove invalid tokens

2. **Permission Handling**
   - Request notification permission explicitly
   - Handle permission denial gracefully
   - Provide fallback for blocked notifications

3. **Data Validation**
   - Validate notification content
   - Sanitize user input
   - Rate limit notification sending

4. **Access Control**
   - Verify user ownership before operations
   - Validate business/admin access
   - Implement proper authentication

## Performance Optimization

1. **Database Indexing**
   - Index on recipient and status
   - Index on creation date
   - Index on notification type

2. **Caching**
   - Cache recent notifications
   - Cache user preferences
   - Cache FCM tokens

3. **Batch Operations**
   - Batch notification sends
   - Batch status updates
   - Batch token updates

4. **Cleanup**
   - Delete expired notifications
   - Remove old FCM tokens
   - Archive old notifications

## Monitoring and Analytics

1. **Metrics to Track**
   - Notification delivery rate
   - Click-through rate
   - Error rates
   - Token validity rate

2. **Logging**
   - Log all notification sends
   - Log errors with context
   - Log user interactions
   - Log performance metrics

3. **Alerts**
   - High error rates
   - Low delivery rates
   - Token refresh failures
   - Service worker issues

## Troubleshooting

### Common Issues

1. **Notifications not showing**
   - Check notification permissions
   - Verify service worker registration
   - Check FCM token validity
   - Verify Firebase configuration

2. **Background notifications not working**
   - Check service worker file
   - Verify Firebase configuration in service worker
   - Check browser console for errors
   - Verify HTTPS requirement

3. **FCM token issues**
   - Check Firebase project settings
   - Verify VAPID key configuration
   - Check token refresh logic
   - Verify service account permissions

4. **Database connection issues**
   - Check MongoDB connection
   - Verify schema compatibility
   - Check index creation
   - Verify data validation

### Debug Tools

1. **Firebase Console**
   - Monitor FCM delivery
   - Check token registration
   - View error logs
   - Test notifications

2. **Browser DevTools**
   - Check service worker status
   - Monitor network requests
   - View console logs
   - Test notification permissions

3. **Backend Logs**
   - Monitor API requests
   - Check error logs
   - Verify database operations
   - Monitor performance metrics

## Future Enhancements

1. **Advanced Features**
   - Rich notifications with images
   - Action buttons in notifications
   - Notification scheduling
   - Notification templates

2. **Analytics**
   - Detailed engagement metrics
   - A/B testing for notifications
   - User behavior analysis
   - Performance optimization

3. **Integration**
   - Email fallback
   - SMS notifications
   - Slack integration
   - Webhook support

4. **Personalization**
   - User preferences
   - Notification frequency
   - Content customization
   - Time-based delivery

## Support and Maintenance

1. **Regular Maintenance**
   - Clean up expired notifications
   - Update Firebase SDK
   - Monitor performance
   - Review error logs

2. **Updates**
   - Security patches
   - Feature updates
   - Bug fixes
   - Performance improvements

3. **Documentation**
   - Keep documentation updated
   - Add new examples
   - Update troubleshooting guide
   - Maintain API documentation
