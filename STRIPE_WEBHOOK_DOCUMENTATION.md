# Stripe Webhook Implementation for Business Subscriptions

## Overview
This document describes the Stripe webhook implementation for handling business subscription payments and plan upgrades.

## Webhook Endpoint
- **URL**: `/api/business/webhook/stripe`
- **Method**: `POST`
- **Authentication**: None (Stripe calls this endpoint directly)

## Environment Variables Required
```env
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Your Stripe webhook signing secret
```

## Supported Events

### 1. checkout.session.completed
Triggered when a customer completes a checkout session.

**Handled by**: `handleCheckoutSessionCompleted()`

**Actions**:
- Updates business plan based on metadata
- Assigns features based on plan (silver/gold)
- Generates embed token for gold plan
- Creates subscription record
- Sets business status to 'active'

### 2. payment_intent.succeeded
Triggered when a payment intent succeeds.

**Handled by**: `handlePaymentIntentSucceeded()`

**Actions**:
- Updates business plan and features
- Creates or updates subscription record
- Handles both new subscriptions and plan upgrades

### 3. payment_intent.payment_failed
Triggered when a payment intent fails.

**Handled by**: `handlePaymentIntentFailed()`

**Actions**:
- Logs failed payment
- Optionally sends notification to business owner

### 4. invoice.payment_succeeded
Triggered when an invoice payment succeeds (for recurring subscriptions).

**Handled by**: `handleInvoicePaymentSucceeded()`

### 5. invoice.payment_failed
Triggered when an invoice payment fails (for recurring subscriptions).

**Handled by**: `handleInvoicePaymentFailed()`

### 6. customer.subscription.created
Triggered when a new subscription is created.

**Handled by**: `handleSubscriptionCreated()`

### 7. customer.subscription.updated
Triggered when a subscription is updated.

**Handled by**: `handleSubscriptionUpdated()`

### 8. customer.subscription.deleted
Triggered when a subscription is cancelled.

**Handled by**: `handleSubscriptionDeleted()`

## Plan Features

### Bronze Plan (Free)
- Features: `['query_ticketing']`

### Silver Plan ($20/month)
- Features: `['query_ticketing', 'review_management']`

### Gold Plan ($30/month)
- Features: `['query_ticketing', 'review_management', 'review_embed']`
- Includes embed token generation

## Metadata Requirements

When creating checkout sessions or payment intents, include the following metadata:

```javascript
{
  businessId: "business_id_here",
  plan: "silver" // or "gold"
}
```

## Database Models

### Business Model Updates
The webhook updates the following fields in the Business model:
- `plan`: The subscription plan (bronze/silver/gold)
- `features`: Array of available features
- `embedToken`: Generated for gold plans
- `status`: Set to 'active' on successful payment

### BusinessSubscription Model
Creates subscription records with:
- `businessId`: Reference to the business
- `status`: 'active'
- `subscriptionType`: Plan type (silver/gold)
- `createdAt`: Subscription start date
- `expiredAt`: Subscription end date (30 days from creation)

## Security

### Webhook Signature Verification
The webhook verifies the Stripe signature using:
```javascript
stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
```

### Raw Body Parsing
The webhook endpoint uses raw body parsing to ensure proper signature verification:
```javascript
app.use('/api/business/webhook/stripe', express.raw({ type: 'application/json' }));
```

## Error Handling

### Webhook Signature Verification
- Returns 400 status if signature verification fails
- Logs error details for debugging

### Business Not Found
- Logs error when business ID is not found
- Continues processing other webhooks

### Database Errors
- Logs detailed error information
- Returns 500 status for webhook handler failures

## Testing

### Using Stripe CLI
1. Install Stripe CLI
2. Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:3000/api/business/webhook/stripe
```

### Test Events
You can trigger test events using Stripe Dashboard or CLI:
```bash
stripe trigger checkout.session.completed
```

## Monitoring

### Logs
The webhook logs the following events:
- Webhook signature verification failures
- Business plan updates
- Payment processing results
- Database operation errors

### Response Codes
- `200`: Webhook processed successfully
- `400`: Signature verification failed
- `500`: Internal server error

## Integration with Frontend

### Creating Payment Sessions
Use the existing `createPlanPaymentSession` endpoint:
```javascript
POST /api/business/plans/payment-session
{
  "plan": "silver",
  "businessId": "business_id"
}
```

### Checking Subscription Status
Use the existing `getCurrentPlan` endpoint:
```javascript
GET /api/business/plans/current
```

## Future Enhancements

1. **Recurring Subscriptions**: Implement monthly/yearly billing cycles
2. **Trial Periods**: Add free trial functionality
3. **Plan Downgrades**: Handle plan downgrade scenarios
4. **Email Notifications**: Send confirmation emails on successful payments
5. **Analytics**: Track subscription metrics and revenue
6. **Refund Handling**: Process refunds and update subscription status

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check webhook endpoint URL in Stripe Dashboard
   - Verify webhook secret in environment variables
   - Ensure server is accessible from internet

2. **Signature verification failing**
   - Verify `STRIPE_WEBHOOK_SECRET` is correct
   - Check that raw body parsing is enabled for webhook route
   - Ensure no middleware is modifying the request body

3. **Business not found errors**
   - Verify `businessId` is included in payment metadata
   - Check that business exists in database
   - Ensure business ID format is correct

4. **Database errors**
   - Check database connection
   - Verify model schemas are correct
   - Check for required field validation errors

### Debug Mode
Enable detailed logging by adding console.log statements in webhook handlers for debugging purposes. 