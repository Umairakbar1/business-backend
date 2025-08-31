# Complete Payment Plan System Implementation

## Overview

This document describes the complete implementation of a payment plan system that supports both business subscriptions (lifetime) and boost plans (temporary) with Stripe integration.

## System Architecture

### 1. Payment Plan Types

#### Business Plans (Lifetime)
- **Purpose**: Provide permanent access to business features
- **Features**: Query ticketing, review management, review embedding
- **Duration**: Lifetime (no expiration)
- **Boost Limits**: Daily boost usage limits based on plan
- **Examples**: Bronze, Silver, Gold plans

#### Boost Plans (Temporary)
- **Purpose**: Provide temporary visibility boosts
- **Features**: No business features, just boost functionality
- **Duration**: Configurable (1-168 hours, max 7 days)
- **Boost Limits**: No daily limits (the plan itself is the boost)
- **Examples**: 24-hour boost, 72-hour boost, 1-week boost

### 2. Database Models

#### PaymentPlan Model
```javascript
{
  name: String,                    // Plan name
  description: String,             // Plan description
  planType: 'business' | 'boost', // Plan type
  price: Number,                   // Price in cents
  currency: String,                // Currency (USD, EUR, GBP)
  features: [String],              // Business features (business plans only)
  stripeProductId: String,         // Stripe product ID
  stripePriceId: String,           // Stripe price ID
  isActive: Boolean,               // Plan availability
  maxBoostPerDay: Number,          // Daily boost limit (business plans only)
  validityHours: Number,           // Validity period (boost plans only)
  discount: Number                 // Discount percentage (0-7%)
}
```

#### Subscription Model
```javascript
{
  business: ObjectId,              // Reference to Business
  paymentPlan: ObjectId,           // Reference to PaymentPlan
  subscriptionType: 'business' | 'boost',
  stripeCustomerId: String,        // Stripe customer ID
  status: String,                  // active, inactive, expired, etc.
  expiresAt: Date,                 // Expiry date (boost plans only)
  isLifetime: Boolean,             // Lifetime flag (business plans)
  amount: Number,                  // Payment amount
  currency: String,                // Payment currency
  paymentId: String,               // Stripe payment intent ID
  features: [String],              // Features from payment plan
  validityHours: Number,           // Validity hours (boost plans)
  boostUsage: {                    // Daily boost usage tracking
    currentDay: Number,
    lastResetDate: Date
  },
  maxBoostPerDay: Number           // Daily boost limit
}
```

#### Business Model Updates
```javascript
{
  // ... existing fields ...
  stripeCustomerId: String,        // Stripe customer ID
  activeSubscriptionId: ObjectId,  // Reference to active subscription
  isBoosted: Boolean,              // Current boost status
  boostExpiryAt: Date             // Boost expiry timestamp
}
```

### 3. API Endpoints

#### Business Subscription Routes

##### Subscribe to Plan
```
POST /business/subscriptions/:businessId/subscribe
Body: { paymentPlanId: string }
Response: { paymentIntent, subscription, clientSecret }
```

##### Confirm Payment
```
POST /business/subscriptions/:businessId/confirm-payment
Body: { paymentIntentId: string, subscriptionId: string }
Response: { subscription, business }
```

##### Get Subscription Details
```
GET /business/subscriptions/:businessId/details
Response: { business, subscription }
```

##### Handle Boost Expiry
```
POST /business/subscriptions/:businessId/boost/expiry
Response: { business }
```

#### Admin Subscription Routes

##### Check Expired Boosts
```
POST /admin/subscriptions/boost/expiry/check
Response: { totalExpired, updatedCount }
```

##### Get Boost Expiry Stats
```
GET /admin/subscriptions/boost/expiry/stats
Response: { totalBoosted, expiringSoon, expired, active }
```

##### Manually Expire Boost
```
POST /admin/subscriptions/boost/:businessId/expire
Response: { business }
```

### 4. Payment Flow

#### Business Plan Subscription
1. **Create Payment Intent**: Generate Stripe payment intent
2. **Create Subscription**: Create subscription record with 'pending' status
3. **Process Payment**: Client completes payment using Stripe
4. **Confirm Payment**: Update subscription status to 'active'
5. **Update Business**: Set activeSubscriptionId and features

#### Boost Plan Subscription
1. **Create Payment Intent**: Generate Stripe payment intent
2. **Create Subscription**: Create subscription record with 'pending' status
3. **Process Payment**: Client completes payment using Stripe
4. **Confirm Payment**: Update subscription status to 'active' and set expiry
5. **Update Business**: Set isBoosted=true and boostExpiryAt

### 5. Boost Expiry Management

#### Automatic Expiry
- **Service**: `BoostExpiryService.checkAndUpdateExpiredBoosts()`
- **Frequency**: Should be run periodically (recommended: every hour)
- **Process**: 
  1. Find businesses with expired boosts
  2. Update business boost status
  3. Update subscription status
  4. Log changes

#### Manual Expiry
- **Endpoint**: `POST /admin/subscriptions/boost/:businessId/expire`
- **Use Case**: Admin needs to manually expire a boost
- **Process**: Same as automatic expiry but for specific business

### 6. Stripe Integration

#### Payment Intent Creation
```javascript
const paymentIntent = await StripeHelper.createPaymentIntent({
  amount: paymentPlan.price,
  currency: paymentPlan.currency,
  customerId: stripeCustomer.id,
  businessId: business._id.toString(),
  planType: paymentPlan.planType,
  planId: paymentPlanId,
  receiptEmail: business.email
});
```

#### Webhook Handling
- **Payment Success**: Update subscription status
- **Payment Failure**: Mark subscription as failed
- **Refund**: Handle subscription cancellation

### 7. Business Features Management

#### Feature Assignment
- **Bronze Plan**: query_ticketing
- **Silver Plan**: query_ticketing, review_management
- **Gold Plan**: query_ticketing, review_management, review_embed

#### Feature Validation
- Check subscription status before allowing feature usage
- Track feature usage for analytics
- Enforce daily limits for boost usage

### 8. Implementation Notes

#### Database Indexes
```javascript
// Business model
BusinessSchema.index({ 'location.lat': 1, 'location.lng': 1 });
BusinessSchema.index({ location: '2dsphere' });

// Subscription model
subscriptionSchema.index({ business: 1, subscriptionType: 1 });
subscriptionSchema.index({ stripeCustomerId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ expiresAt: 1 });

// PaymentPlan model
paymentPlanSchema.index({ planType: 1, isActive: 1 });
paymentPlanSchema.index({ stripeProductId: 1 });
paymentPlanSchema.index({ stripePriceId: 1 });
```

#### Error Handling
- Validate payment plan existence and status
- Check business ownership and access
- Handle Stripe API errors gracefully
- Log all payment and subscription events

#### Security Considerations
- Verify business ownership before subscription operations
- Validate payment intent status before confirmation
- Use middleware for authentication and authorization
- Sanitize all input data

### 9. Testing

#### Test Scenarios
1. **Business Plan Subscription**: Complete flow from payment to activation
2. **Boost Plan Subscription**: Complete flow with expiry handling
3. **Payment Failure**: Handle failed payments gracefully
4. **Boost Expiry**: Automatic and manual expiry scenarios
5. **Feature Access**: Verify feature availability based on plan
6. **Daily Limits**: Test boost usage limits

#### Test Data
- Create test payment plans in Stripe test mode
- Use test business accounts
- Verify webhook handling with Stripe CLI

### 10. Monitoring and Analytics

#### Key Metrics
- Total active subscriptions
- Revenue by plan type
- Boost usage patterns
- Feature adoption rates
- Payment success rates

#### Logging
- Payment intent creation
- Payment confirmation
- Subscription status changes
- Boost expiry events
- Error occurrences

## Conclusion

This implementation provides a robust, scalable payment plan system that handles both business subscriptions and boost plans with proper Stripe integration, automatic expiry management, and comprehensive business feature control.
