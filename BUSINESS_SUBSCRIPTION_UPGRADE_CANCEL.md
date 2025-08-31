# Business Subscription Upgrade and Cancel System

## Overview

This document describes the implementation of business subscription upgrade and cancellation functionality with proper Stripe integration, refund handling, and subscription management.

## Features

### 🔄 Business Subscription Upgrade/Downgrade/Switch
- **Flexible Plan Changes**: Allows upgrading to more expensive plans, downgrading to cheaper plans, or switching to same-price plans
- **Price Difference Payment**: Only charges the difference when upgrading to more expensive plans
- **No Additional Payment**: For downgrades or same-price switches, no additional payment is required
- **Validation**: Prevents upgrading to the same plan (no change)
- **Stripe Integration**: Creates payment intent for price differences or tracking purposes
- **Subscription Management**: Properly handles old and new subscription states
- **Metadata Tracking**: Records upgrade/downgrade history and reasons

### ❌ Business Subscription Cancellation
- **Refund Policies**: Different policies for lifetime vs time-based subscriptions
- **30-Day Money-Back**: Full refund for lifetime subscriptions within 30 days
- **Proportional Refunds**: Partial refunds for time-based subscriptions based on unused time
- **Stripe Integration**: Handles payment cancellation and refunds
- **Status Management**: Properly updates subscription and business status

## API Endpoints

### Upgrade Business Subscription
```http
POST /api/business/subscription/:businessId/upgrade
```

**Request Body:**
```json
{
  "newPaymentPlanId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Business subscription upgrade initiated. Please complete payment.",
  "data": {
    "subscription": {
      "_id": "507f1f77bcf86cd799439011",
      "status": "pending",
      "amount": 79.99,
      "currency": "USD",
      "paymentPlan": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Premium Business Plan",
        "description": "Premium features for your business",
        "price": 79.99,
        "currency": "USD",
        "features": ["basic_listing", "contact_info", "priority_support", "analytics"]
      }
    },
    "payment": {
      "clientSecret": "pi_xxx_secret_xxx",
      "paymentIntentId": "pi_xxx",
      "amount": 50.00,
      "currency": "USD"
    },
          "upgrade": {
        "type": "upgrade",
        "from": {
          "planName": "Basic Business Plan",
          "price": 29.99,
          "currency": "USD"
        },
        "to": {
          "planName": "Premium Business Plan",
          "price": 79.99,
          "currency": "USD"
        },
        "priceDifference": 50.00,
        "requiresPayment": true
      }
  }
}
```

### Cancel Business Subscription
```http
PATCH /api/business/subscription/:businessId/business/cancel
```

**Request Body:**
```json
{
  "reason": "switching_to_competitor"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Business subscription canceled successfully. Full refund processed - within 30-day money-back guarantee",
  "data": {
    "subscription": {
      "_id": "507f1f77bcf86cd799439011",
      "status": "canceled",
      "refundProcessed": true,
      "refundAmount": 79.99,
      "cancellationMessage": "Full refund processed - within 30-day money-back guarantee",
      "canceledAt": "2024-01-15T10:30:00.000Z"
    },
    "business": {
      "_id": "507f1f77bcf86cd799439011",
      "businessName": "Test Business",
      "businessSubscriptionId": null
    }
  }
}
```

## Implementation Details

### Upgrade Process Flow

1. **Validation**
   - Verify business exists and user has access
   - Check if new payment plan exists and is active
   - Ensure new plan is more expensive than current plan
   - Verify current subscription exists

2. **Price Calculation**
    - Calculate price difference: `newPlan.price - currentPlan.price`
    - For upgrades (positive difference): Create payment intent for the difference amount
    - For downgrades (negative difference): Create tracking payment intent with $0 amount
    - For same-price switches: Create tracking payment intent with $0 amount

3. **Subscription Creation**
   - Create new subscription with `pending` status
   - Include upgrade metadata (from plan, to plan, reason)
   - Link to existing Stripe customer

4. **Payment Confirmation**
   - When payment is confirmed, activate new subscription
   - Mark old subscription as `upgraded`
   - Update business with new subscription ID

### Cancellation Process Flow

1. **Validation**
   - Verify business exists and user has access
   - Check if active subscription exists
   - Get payment plan details

2. **Refund Calculation**
   - **Lifetime Subscriptions**: 30-day money-back guarantee
   - **Time-based Subscriptions**: Proportional refund based on unused time

3. **Payment Processing**
   - Cancel pending payment intents
   - Process refunds through Stripe
   - Update subscription status to `canceled`

4. **Cleanup**
   - Remove subscription ID from business
   - Update metadata with cancellation details

## Refund Policies

### Lifetime Subscriptions
- **30-Day Money-Back**: Full refund if canceled within 30 days of purchase
- **After 30 Days**: No refund available

### Time-Based Subscriptions
- **Proportional Refund**: Refund based on percentage of unused time
- **Calculation**: `(remainingTime / totalDuration) * subscriptionAmount`
- **Minimum Refund**: $0 (no negative refunds)

### Boost Subscriptions
- **Before Activation**: Full refund
- **During Active Period**: Partial refund based on usage
  - < 50% used: 50% refund
  - 50-75% used: 25% refund
  - > 75% used: No refund

## Database Schema Updates

### Subscription Model
```javascript
{
  // ... existing fields ...
  metadata: {
    // Upgrade tracking
    upgradeFrom: String,
    upgradeFromId: String,
    upgradeReason: String,
    upgradedTo: String,
    upgradedAt: Date,
    
    // Cancellation tracking
    canceledAt: Date,
    refundProcessed: Boolean,
    refundAmount: Number,
    cancellationReason: String
  }
}
```

### Business Model
```javascript
{
  // ... existing fields ...
  businessSubscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  },
  boostSubscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  }
}
```

## Error Handling

### Common Error Codes
- `MISSING_PAYMENT_PLAN_ID`: New payment plan ID not provided
- `BUSINESS_NOT_FOUND`: Business doesn't exist
- `ACCESS_DENIED`: User doesn't own the business
- `PAYMENT_PLAN_NOT_FOUND`: Payment plan doesn't exist
- `INVALID_PLAN_TYPE`: Plan type is not 'business'
- `PAYMENT_PLAN_INACTIVE`: Payment plan is not active
- `NO_ACTIVE_SUBSCRIPTION`: No active subscription to upgrade/cancel
- `SAME_PLAN_UPGRADE`: Cannot upgrade to the same plan

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "error": "Detailed error message"
}
```

## Stripe Integration

### Payment Intent Creation
```javascript
const paymentIntent = await StripeHelper.createPaymentIntent({
  amount: priceDifference,
  currency: newPaymentPlan.currency,
  customerId: stripeCustomer.id,
  businessId: business._id.toString(),
  planType: 'business',
  planId: newPaymentPlanId,
  receiptEmail: business.email,
  metadata: {
    upgradeFrom: currentPaymentPlan.name,
    upgradeTo: newPaymentPlan.name,
    originalSubscriptionId: currentSubscription._id.toString()
  }
});
```

### Refund Processing
```javascript
// Full refund
await StripeHelper.createRefund(subscription.paymentId);

// Partial refund
await StripeHelper.createRefund(subscription.paymentId, refundAmount);
```

## Testing

### Test Scripts
- `test-business-subscription-upgrade-cancel.js`: Comprehensive test suite
- Tests upgrade validation, process simulation, and cancellation logic
- Verifies refund calculations and status updates

### Manual Testing
1. **Upgrade Flow**
   - Create business subscription with basic plan
   - Attempt upgrade to premium plan
   - Verify price difference calculation
   - Complete payment and verify status updates

2. **Cancellation Flow**
   - Cancel active subscription
   - Verify refund calculations
   - Check status updates and cleanup

## Security Considerations

### Access Control
- Business owners can only manage their own subscriptions
- Admin-level access required for system-wide operations
- JWT token validation on all endpoints

### Payment Security
- Stripe handles all payment processing
- No sensitive payment data stored locally
- Webhook verification for payment confirmations

### Data Integrity
- Transactional updates for subscription changes
- Proper error handling and rollback mechanisms
- Audit trail through metadata tracking

## Monitoring and Logging

### Key Metrics
- Upgrade success rate
- Cancellation rate
- Refund processing time
- Payment failure rate

### Logging
- All subscription changes logged
- Payment processing events tracked
- Error conditions recorded with context

## Future Enhancements

### Planned Features
- **Downgrade Support**: Allow downgrading to cheaper plans
- **Proration**: More sophisticated proration calculations
- **Trial Periods**: Free trial support for new subscriptions
- **Bulk Operations**: Admin tools for bulk subscription management
- **Analytics**: Subscription performance analytics

### Integration Opportunities
- **Email Notifications**: Automated emails for subscription changes
- **Webhook Notifications**: Real-time updates to external systems
- **Analytics Dashboard**: Subscription metrics and insights
- **Customer Support**: Integration with support ticket system

## Troubleshooting

### Common Issues

1. **Upgrade Fails**
   - Check if new plan is more expensive
   - Verify current subscription is active
   - Ensure Stripe customer exists

2. **Cancellation Issues**
   - Verify subscription exists and is active
   - Check refund policy applicability
   - Ensure Stripe integration is working

3. **Payment Problems**
   - Check Stripe API keys and configuration
   - Verify webhook endpoints are accessible
   - Monitor Stripe dashboard for payment status

### Debug Steps
1. Check server logs for detailed error messages
2. Verify database state and subscription records
3. Test Stripe API connectivity
4. Review payment intent status in Stripe dashboard

## Support

For technical support or questions about the upgrade/cancel system:
- Check server logs for error details
- Review Stripe dashboard for payment status
- Contact development team with specific error codes
- Provide business ID and subscription ID for troubleshooting
