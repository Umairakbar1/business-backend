# Dual Subscription System Documentation

## Overview

The business platform now supports two distinct types of subscriptions:

1. **Business Subscription** - Lifetime subscription for business features
2. **Boost Subscription** - Temporary boost for enhanced visibility

## Business Model Changes

### Business Model Fields

```javascript
// Two types of subscriptions: business and boost
businessSubscriptionId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Subscription',
  default: null
},
boostSubscriptionId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Subscription',
  default: null
},
isBoosted: {
  type: Boolean,
  default: false
},
isBoostActive: {
  type: Boolean,
  default: false
},
boostExpiryAt: {
  type: Date,
  default: null
}
```

### Key Changes

- **Removed**: `activeSubscriptionId` (replaced with specific subscription IDs)
- **Added**: `businessSubscriptionId` and `boostSubscriptionId` for separate tracking
- **Added**: `isBoostActive` flag to track active boost status
- **Enhanced**: Boost status management with automatic expiry

## Subscription Types

### 1. Business Subscription

- **Type**: `'business'`
- **Duration**: Lifetime (no expiration)
- **Features**: Query ticketing, review management, review embed
- **Storage**: Stored in `businessSubscriptionId`

### 2. Boost Subscription

- **Type**: `'boost'`
- **Duration**: Temporary (24 hours or custom duration)
- **Features**: Enhanced visibility in search results
- **Storage**: Stored in `boostSubscriptionId`
- **Queue System**: Managed through boost queue for fair rotation

## Boost Status Management

### Automatic Status Updates

The system automatically manages boost status through:

1. **Boost Expiry Service**: Checks and updates expired boosts every 5 minutes
2. **Queue Management**: Automatically activates next business in queue when current boost expires
3. **Status Flags**: Updates `isBoosted` and `isBoostActive` flags

### Status Flags

- **`isBoosted`**: Indicates if business has ever been boosted
- **`isBoostActive`**: Indicates if business is currently actively boosted
- **`boostExpiryAt`**: Timestamp when current boost expires

## API Endpoints

### Business Subscription Management

```http
POST /api/business/subscriptions/:businessId/subscribe
POST /api/business/subscriptions/:businessId/upgrade
GET /api/business/subscriptions/:businessId
```

### Boost Subscription Management

```http
POST /api/business/subscriptions/:businessId/boost/subscribe
GET /api/business/subscriptions/:businessId/boost/queue-status
GET /api/business/subscriptions/:businessId/boost/queue-position
PATCH /api/business/subscriptions/:businessId/boost/cancel
```

### Admin Boost Management

```http
POST /api/admin/boost-expiry/check
POST /api/admin/boost-expiry/activate-next/:categoryId
GET /api/admin/boost-expiry/status/:businessId
POST /api/admin/boost-expiry/start-scheduler
```

## Boost Queue System

### Queue Management

1. **Category-based Queues**: Each category has its own boost queue
2. **Fair Rotation**: Businesses rotate through 24-hour boost periods
3. **Automatic Activation**: Next business activates when current boost expires
4. **Position Tracking**: Businesses can see their position in queue

### Queue States

- **`pending`**: Waiting in queue
- **`active`**: Currently boosted
- **`expired`**: Boost period completed
- **`cancelled`**: Manually cancelled

## Payment Flow

### Business Subscription

1. Business selects business plan
2. Payment processed through Stripe
3. Subscription created with `subscriptionType: 'business'`
4. Business features activated immediately
5. `businessSubscriptionId` updated

### Boost Subscription

1. Business selects boost plan
2. Payment processed through Stripe
3. Subscription created with `subscriptionType: 'boost'`
4. Business added to category queue
5. `boostSubscriptionId` updated
6. Boost activates when turn comes

## Webhook Handling

### Payment Confirmation

```javascript
// Update business with subscription details based on type
if (subscription.subscriptionType === 'business') {
  business.businessSubscriptionId = subscription._id;
} else if (subscription.subscriptionType === 'boost') {
  business.boostSubscriptionId = subscription._id;
}
```

### Boost Activation

When boost becomes active:
```javascript
business.isBoosted = true;
business.isBoostActive = true;
business.boostExpiryAt = boostEndTime;
```

## Scheduled Tasks

### Boost Expiry Check

Runs every 5 minutes to:
1. Check for expired boosts
2. Update business status flags
3. Activate next business in queue
4. Update subscription status

### Implementation

```javascript
// Start scheduler
BoostExpiryService.scheduleBoostExpiryCheck();

// Manual check
const updatedCount = await BoostExpiryService.checkAndUpdateExpiredBoosts();
```

## Migration Notes

### Existing Data

- Existing `activeSubscriptionId` references will be mapped to `businessSubscriptionId`
- Legacy subscription data preserved for backward compatibility
- Boost status automatically calculated from current queue state

### Backward Compatibility

- `activeSubscriptionId` still populated for API compatibility
- Existing subscription endpoints continue to work
- New endpoints provide enhanced functionality

## Error Handling

### Common Scenarios

1. **Expired Boost**: Automatically deactivated and next business activated
2. **Payment Failure**: Subscription marked as inactive
3. **Queue Position**: Real-time updates provided to businesses
4. **Category Changes**: Queue position recalculated

### Monitoring

- Boost expiry service logs all activities
- Queue position changes tracked
- Payment failures logged for investigation
- System health monitored through admin endpoints

## Best Practices

### For Businesses

1. Monitor queue position regularly
2. Plan boost timing for maximum impact
3. Understand category-specific queue dynamics
4. Use business subscription for core features

### For Administrators

1. Monitor boost queue health
2. Review expired boosts regularly
3. Adjust queue parameters as needed
4. Monitor payment success rates

## Future Enhancements

1. **Priority Queue**: Premium boost options
2. **Scheduled Boosts**: Pre-schedule boost periods
3. **Analytics**: Boost performance metrics
4. **Notifications**: Real-time status updates
5. **Mobile App**: Queue position tracking
