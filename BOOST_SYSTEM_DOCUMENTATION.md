# Business Boost System Documentation

## Overview

The Business Boost System is a queue-based system that allows businesses to purchase boost plans to appear at the top of user search results within their category. The system ensures that only one business per category can be boosted at a time, with a queue system managing multiple boost requests.

## Key Features

1. **Category-based Queue Management**: Each business category has its own boost queue
2. **24-hour Boost Duration**: Each boost lasts exactly 24 hours
3. **Automatic Queue Progression**: When one boost expires, the next business in queue automatically becomes active
4. **Real-time Status Tracking**: Businesses can check their queue position and estimated start time
5. **Admin Management**: Admins can view and manage all boost queues
6. **Stripe Integration**: Secure payment processing for boost purchases

## System Architecture

### Models

#### 1. BoostQueue Model (`src/models/business/boostQueue.js`)
- Manages the queue for each business category
- Tracks currently active business and pending businesses
- Handles queue position calculations and estimated start times

#### 2. Enhanced Subscription Model (`src/models/admin/subscription.js`)
- Added `boostQueueInfo` field to track queue-related information
- Stores queue position, estimated times, and active status

#### 3. Business Model (`src/models/business/business.js`)
- Contains boost-related fields (`isBoosted`, `boostExpiryAt`, etc.)
- Tracks boost status and expiry times

### Utilities

#### 1. BoostQueueManager (`src/utils/boostQueueManager.js`)
- Handles boost expiry checks
- Manages queue progression
- Provides utility functions for queue management

#### 2. ScheduledTasks (`src/utils/scheduledTasks.js`)
- Runs automated tasks using node-cron
- Checks for expired boosts every minute
- Automatically activates next business in queue

## API Endpoints

### Business Endpoints

#### 1. Subscribe to Boost Plan
```http
POST /api/business/subscriptions/:businessId/boost/subscribe
```

**Request Body:**
```json
{
  "paymentPlanId": "boost_plan_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Boost subscription created successfully. Please complete payment.",
  "data": {
    "subscription": { /* subscription details */ },
    "clientSecret": "stripe_client_secret",
    "paymentIntentId": "stripe_payment_intent_id",
    "queueInfo": {
      "position": 3,
      "estimatedStartTime": "2024-01-15T10:00:00.000Z",
      "estimatedEndTime": "2024-01-16T10:00:00.000Z",
      "categoryName": "Fashion"
    }
  }
}
```

#### 2. Get Boost Queue Status
```http
GET /api/business/subscriptions/:businessId/boost/queue-status
```

**Response:**
```json
{
  "success": true,
  "message": "Boost queue status retrieved successfully",
  "data": {
    "business": { /* business details */ },
    "subscription": { /* subscription details */ },
    "queueStatus": {
      "position": 2,
      "estimatedStartTime": "2024-01-15T10:00:00.000Z",
      "estimatedEndTime": "2024-01-16T10:00:00.000Z",
      "isCurrentlyActive": false,
      "timeRemaining": null,
      "totalInQueue": 5,
      "currentlyActiveBusiness": {
        "_id": "business_id",
        "boostStartTime": "2024-01-14T10:00:00.000Z",
        "boostEndTime": "2024-01-15T10:00:00.000Z"
      }
    }
  }
}
```

#### 3. Get Boost Queue Position
```http
GET /api/business/subscriptions/:businessId/boost/queue-position
```

**Response:**
```json
{
  "success": true,
  "message": "Boost queue position retrieved successfully",
  "data": {
    "position": 2,
    "estimatedStartTime": "2024-01-15T10:00:00.000Z",
    "estimatedEndTime": "2024-01-16T10:00:00.000Z",
    "isCurrentlyActive": false,
    "totalInQueue": 5,
    "categoryName": "Fashion"
  }
}
```

#### 4. Cancel Boost Subscription
```http
PATCH /api/business/subscriptions/:businessId/boost/cancel
```

**Response:**
```json
{
  "success": true,
  "message": "Boost subscription canceled successfully",
  "data": {
    "subscription": { /* subscription details */ },
    "business": {
      "_id": "business_id",
      "businessName": "Business Name",
      "isBoosted": false,
      "boostExpiryAt": null
    }
  }
}
```

### Admin Endpoints

#### 1. Get All Boost Queues
```http
GET /api/admin/boost-queue/all
```

#### 2. Get Boost Queue by Category
```http
GET /api/admin/boost-queue/category/:categoryId
```

#### 3. Get Boost Queue Statistics
```http
GET /api/admin/boost-queue/stats
```

#### 4. Get All Active Boosts
```http
GET /api/admin/boost-queue/active-boosts
```

#### 5. Trigger Manual Expiry Check
```http
POST /api/admin/boost-queue/trigger-expiry-check
```

#### 6. Get Business Queue Status (Admin View)
```http
GET /api/admin/boost-queue/business/:businessId/status
```

#### 7. Remove Business from Queue
```http
DELETE /api/admin/boost-queue/business/:businessId/remove
```

#### 8. Get Business Queue Details
```http
GET /api/admin/boost-queue/business/:businessId/details
```

## Queue Management Logic

### Queue Position Calculation
1. When a business subscribes to a boost plan, they are added to the end of the queue
2. Queue positions are recalculated when businesses are removed or become active
3. Only pending businesses are considered for position calculation

### Estimated Start Time Calculation
1. If no business is currently active, the first business starts immediately
2. For subsequent businesses, start time = previous business's end time
3. Each boost lasts exactly 24 hours

### Automatic Queue Progression
1. A scheduled task runs every minute to check for expired boosts
2. When a boost expires, the current business is marked as expired
3. The next business in the queue automatically becomes active
4. All remaining businesses' estimated times are recalculated

## Payment Flow

1. **Business subscribes to boost plan**
   - Creates Stripe payment intent
   - Adds business to queue
   - Returns payment details to client

2. **Payment confirmation**
   - Client completes payment with Stripe
   - Calls confirm payment endpoint
   - If business is next in queue, boost becomes active immediately
   - Otherwise, business remains in queue with updated position

3. **Queue progression**
   - When current boost expires, next business automatically becomes active
   - Business boost status is updated
   - Subscription status is updated

## Business Rules

1. **One Active Boost Per Category**: Only one business can be boosted per category at a time
2. **24-Hour Duration**: Each boost lasts exactly 24 hours from start time
3. **Queue Order**: Businesses are served in the order they subscribed (FIFO)
4. **Automatic Progression**: Queue automatically progresses when boosts expire
5. **Cancellation**: Businesses can cancel their boost subscription and be removed from queue
6. **Payment Required**: Boost subscription requires successful payment before activation

## Error Handling

### Common Error Codes
- `MISSING_PAYMENT_PLAN_ID`: Payment plan ID not provided
- `BUSINESS_NOT_FOUND`: Business not found
- `ACCESS_DENIED`: Business owner doesn't have access
- `PAYMENT_PLAN_NOT_FOUND`: Payment plan not found
- `INVALID_PLAN_TYPE`: Plan is not a boost plan
- `PAYMENT_PLAN_INACTIVE`: Payment plan is not active

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "error": "Detailed error message"
}
```

## Scheduled Tasks

### Boost Expiry Check
- **Schedule**: Every minute (`* * * * *`)
- **Function**: `BoostQueueManager.checkAndExpireBoosts()`
- **Purpose**: Checks for expired boosts and activates next business in queue

### Manual Trigger
- **Endpoint**: `POST /api/admin/boost-queue/trigger-expiry-check`
- **Purpose**: Allows admins to manually trigger expiry check for testing

## Database Indexes

### BoostQueue Indexes
- `{ category: 1 }` - For finding queues by category
- `{ 'queue.business': 1 }` - For finding businesses in queue
- `{ 'queue.status': 1 }` - For filtering by status
- `{ 'currentlyActive.business': 1 }` - For finding active businesses

### Subscription Indexes
- `{ business: 1, subscriptionType: 1 }` - For finding business subscriptions
- `{ status: 1 }` - For filtering by status
- `{ expiresAt: 1 }` - For finding expired subscriptions

## Security Considerations

1. **Authentication**: All endpoints require proper authentication
2. **Authorization**: Business owners can only manage their own businesses
3. **Admin Access**: Admin endpoints require admin authentication
4. **Payment Security**: Stripe handles all payment processing
5. **Data Validation**: All inputs are validated before processing

## Monitoring and Logging

1. **Queue Status Logging**: All queue changes are logged
2. **Payment Tracking**: All payment attempts and confirmations are tracked
3. **Error Logging**: All errors are logged with detailed information
4. **Performance Monitoring**: Queue operations are monitored for performance

## Future Enhancements

1. **Priority Queue**: Allow businesses to pay more for priority placement
2. **Multiple Categories**: Allow businesses to boost in multiple categories
3. **Boost Scheduling**: Allow businesses to schedule boosts for specific times
4. **Analytics Dashboard**: Provide detailed analytics on boost performance
5. **Notification System**: Send notifications when boost is about to start/end
