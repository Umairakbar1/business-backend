# Category-Based Boost Queue System

## Overview

The Category-Based Boost Queue System ensures that businesses are only queued for boost if they belong to the same category. If businesses belong to different categories, they can be boosted simultaneously without any queue restrictions.

## Key Features

1. **Category-Based Queueing**: Only businesses in the same category are queued
2. **Immediate Activation**: First business in a category is activated immediately
3. **Queue Management**: Subsequent businesses in the same category are queued
4. **Cross-Category Independence**: Different categories can have active boosts simultaneously

## Business Rules

### Queue Logic

1. **Same Category**: If two businesses belong to the same category:
   - First business: Activated immediately
   - Second business: Added to queue
   - Third business: Added to queue
   - And so on...

2. **Different Categories**: If businesses belong to different categories:
   - Each business can be activated immediately
   - No queue restrictions between different categories

### Activation Rules

1. **Immediate Activation**: Business is activated immediately if:
   - No other business is currently active in the same category
   - No other business is pending in the queue for the same category

2. **Queue Addition**: Business is added to queue if:
   - Another business is currently active in the same category, OR
   - Another business is pending in the queue for the same category

## Implementation Details

### Subscription Controller Logic

The `subscribeToBoostPlan` method in `src/controllers/business/subscription.controller.js` implements the category-based logic:

```javascript
// Check if there's already a business in queue or currently active for this category
const hasActiveOrQueuedBusiness = boostQueue.currentlyActive.business || 
                                 boostQueue.queue.some(item => item.status === 'pending');

if (hasActiveOrQueuedBusiness) {
  // Add business to queue since there's already a business in this category
  await boostQueue.addToQueue(queueData);
} else {
  // No business in queue or currently active, activate this business immediately
  // Set as currently active and add to queue as active
}
```

### Payment Confirmation Logic

The `confirmPayment` method handles both immediate activation and queue activation:

```javascript
// Check if this business is already active (immediately activated)
const activeBusiness = boostQueue.queue.find(item => 
  item.business.toString() === businessId && item.status === 'active'
);

if (activeBusiness) {
  // Business is already active, update subscription info
} else {
  // Check if this business is next in queue
  const nextBusiness = boostQueue.queue.find(item => item.status === 'pending');
  if (nextBusiness && nextBusiness.business.toString() === businessId) {
    // Activate this business's boost
    await boostQueue.activateNext();
  }
}
```

## API Response Examples

### Immediate Activation Response

```json
{
  "success": true,
  "message": "Boost subscription activated immediately. Your business is now boosted!",
  "data": {
    "subscription": { /* subscription details */ },
    "clientSecret": "stripe_client_secret",
    "paymentIntentId": "stripe_payment_intent_id",
    "queueInfo": {
      "position": 1,
      "estimatedStartTime": "2024-01-15T10:00:00.000Z",
      "estimatedEndTime": "2024-01-16T10:00:00.000Z",
      "categoryName": "Restaurant",
      "isCurrentlyActive": true,
      "status": "active"
    }
  }
}
```

### Queued Response

```json
{
  "success": true,
  "message": "Boost subscription created successfully. Please complete payment.",
  "data": {
    "subscription": { /* subscription details */ },
    "clientSecret": "stripe_client_secret",
    "paymentIntentId": "stripe_payment_intent_id",
    "queueInfo": {
      "position": 2,
      "estimatedStartTime": "2024-01-16T10:00:00.000Z",
      "estimatedEndTime": "2024-01-17T10:00:00.000Z",
      "categoryName": "Restaurant",
      "isCurrentlyActive": false,
      "status": "pending"
    }
  }
}
```

## Use Cases

### Scenario 1: Same Category Businesses

**Restaurant Category:**
- Restaurant A subscribes to boost → **Immediately Activated**
- Restaurant B subscribes to boost → **Added to Queue (Position 2)**
- Restaurant C subscribes to boost → **Added to Queue (Position 3)**

**Result:** Only Restaurant A is boosted. Restaurant B and C wait in queue.

### Scenario 2: Different Category Businesses

**Restaurant Category:**
- Restaurant A subscribes to boost → **Immediately Activated**

**Fashion Category:**
- Fashion Store A subscribes to boost → **Immediately Activated**

**Result:** Both Restaurant A and Fashion Store A are boosted simultaneously.

### Scenario 3: Mixed Scenario

**Restaurant Category:**
- Restaurant A subscribes to boost → **Immediately Activated**
- Restaurant B subscribes to boost → **Added to Queue**

**Fashion Category:**
- Fashion Store A subscribes to boost → **Immediately Activated**

**Result:** Restaurant A and Fashion Store A are both boosted. Restaurant B waits in queue.

## Testing

Use the test script `test-category-queue-logic.js` to verify the category-based queue logic:

```bash
node test-category-queue-logic.js
```

This test script:
1. Creates test categories (Restaurant, Fashion)
2. Creates test businesses in different categories
3. Tests the queue logic for same and different categories
4. Verifies that businesses are activated or queued correctly
5. Cleans up test data

## Benefits

1. **Fair Competition**: Only businesses in the same category compete for boost slots
2. **Increased Revenue**: Multiple categories can have active boosts simultaneously
3. **Better User Experience**: Users see diverse boosted businesses from different categories
4. **Efficient Resource Usage**: No unnecessary queuing for different categories

## Future Enhancements

1. **Priority Queue**: Allow businesses to pay more for priority placement within their category
2. **Category-Specific Limits**: Set different boost limits per category
3. **Cross-Category Boosts**: Allow businesses to boost in multiple categories
4. **Analytics**: Provide category-specific boost analytics and insights
