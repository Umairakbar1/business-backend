# Payment Plan System

This system provides two types of payment plans: **Business Plans** (lifetime) and **Boost Plans** (temporary with configurable validity).

## Features

### Business Plans (Lifetime)
- One-time payment
- Never expires
- Includes features like review management, query tickets, etc.
- No auto-renewal

### Boost Plans (Temporary)
- One-time payment
- Configurable validity period (1-168 hours, maximum 7 days)
- Daily boost usage limits
- No auto-renewal

## Models

### PaymentPlan
- `name`: Plan name
- `description`: Plan description
- `planType`: Either 'business' or 'boost'
- `price`: Plan price
- `currency`: USD, EUR, or GBP
- `features`: Array of included features (business plans only)
- `maxBoostPerDay`: Maximum boosts per day (business plans only)
- `validityHours`: Validity period in hours (boost plans only, 1-168 hours)
- `discount`: Discount percentage (0-7%)
- `isActive`: Whether the plan is active
- `isPopular`: Whether the plan is marked as popular
- `sortOrder`: Display order for the plan

### Plan Type Constraints

#### Business Plans (Lifetime)
- ✅ Must have business features (query, review, embeded)
- ✅ Cannot have validity hours (lifetime access)
- ✅ Can have daily boost usage limits (maxBoostPerDay)
- ✅ One-time payment model

#### Boost Plans (Temporary)
- ✅ Must have validity hours (1-168 hours)
- ✅ Cannot have business features
- ✅ Cannot have daily boost limits (they are the boost themselves)
- ✅ One-time payment model

### Subscription
- `business`: Reference to business
- `paymentPlan`: Reference to payment plan
- `subscriptionType`: 'business' or 'boost'
- `status`: 'active', 'inactive', etc.
- `isLifetime`: Boolean for business plans
- `expiresAt`: Expiration date for boost plans
- `boostUsage`: Daily boost usage tracking
- `featureUsage`: Feature usage tracking

## API Endpoints

### Payment Plans
- `POST /admin/payment-plans` - Create payment plan
- `GET /admin/payment-plans` - Get all payment plans
- `GET /admin/payment-plans/business` - Get business plans (public)
- `GET /admin/payment-plans/boost` - Get boost plans (public)
- `GET /admin/payment-plans/:id` - Get plan by ID
- `PUT /admin/payment-plans/:id` - Update plan
- `DELETE /admin/payment-plans/:id` - Delete plan
- `PATCH /admin/payment-plans/:id/status` - Toggle plan status

### Admin Subscriptions
- `POST /admin/subscriptions` - Create subscription
- `GET /admin/subscriptions` - Get all subscriptions
- `GET /admin/subscriptions/stats` - Get subscription statistics
- `GET /admin/subscriptions/:id` - Get subscription by ID
- `GET /admin/subscriptions/business/:businessId` - Get business subscriptions
- `PATCH /admin/subscriptions/:id/cancel` - Cancel subscription
- `PATCH /admin/subscriptions/:id/reactivate` - Reactivate subscription
- `GET /admin/subscriptions/boost/:businessId/availability` - Check boost availability
- `POST /admin/subscriptions/boost/:businessId/use` - Use boost

### Business Subscriptions
- `POST /business/subscriptions/:businessId/subscribe` - Subscribe to a payment plan
- `POST /business/subscriptions/:businessId/upgrade` - Upgrade business plan
- `GET /business/subscriptions/:businessId/subscriptions` - Get business subscriptions (separated by type)
- `GET /business/subscriptions/:businessId/business-plan` - Get active business plan
- `GET /business/subscriptions/:businessId/boost-plan` - Get active boost plan
- `GET /business/subscriptions/:businessId/boost/availability` - Check boost availability
- `POST /business/subscriptions/:businessId/boost/use` - Use boost
- `PATCH /business/subscriptions/:businessId/subscriptions/:subscriptionId/cancel` - Cancel subscription
- `GET /business/subscriptions/:businessId/plans` - Get available payment plans
- `POST /business/subscriptions/:businessId/confirm-payment` - Confirm payment success

### Webhooks
- `POST /admin/webhooks/stripe` - Stripe webhook endpoint

## Environment Variables

```env
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
FRONTEND_URL=your_frontend_url
```

## Usage Examples

### Creating a Business Plan
```json
{
  "name": "Premium Business Plan",
  "description": "Full access to all business features",
  "planType": "business",
  "price": 99.99,
  "currency": "USD",
  "features": [
    {
      "name": "Review Management",
      "description": "Manage customer reviews",
      "included": true
    },
    {
      "name": "Query Tickets",
      "description": "Handle customer queries",
      "included": true
    }
  ],
  "maxBusinesses": 5,
  "maxReviews": null
}
```

### Creating a Boost Plan
```json
{
  "name": "Daily Boost Pack",
  "description": "Boost your business visibility daily",
  "planType": "boost",
  "price": 9.99,
  "currency": "USD",
  "features": [
    {
      "name": "Daily Boost",
      "description": "Boost business visibility",
      "included": true,
      "limit": 3
    }
  ],
  "maxBoostPerDay": 3
}
```

### Creating a Subscription (Admin)
```json
{
  "businessId": "business_id_here",
  "paymentPlanId": "plan_id_here",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe"
}
```

### Subscribing to a Plan (Business)
```json
POST /business/subscriptions/:businessId/subscribe
{
  "paymentPlanId": "plan_id_here"
}
```

### Upgrading Business Plan
```json
POST /business/subscriptions/:businessId/upgrade
{
  "newPaymentPlanId": "new_plan_id_here"
}
```

### Confirming Payment
```json
POST /business/subscriptions/:businessId/confirm-payment
{
  "subscriptionId": "subscription_id_here",
  "paymentIntentId": "pi_xxx"
}
```

## Stripe Integration

- All plans are created as one-time payments
- Business plans have no expiration
- Boost plans automatically expire after 24 hours
- Webhooks handle payment confirmations
- No recurring subscriptions

## Business Subscription Workflow

### 1. Subscribe to a Plan
1. Business calls `POST /business/subscriptions/:businessId/subscribe` with `paymentPlanId`
2. System creates Stripe customer (if doesn't exist)
3. System creates payment intent for one-time payment
4. System creates subscription with status 'pending'
5. Frontend uses `clientSecret` to complete payment with Stripe
6. After successful payment, frontend calls `POST /business/subscriptions/:businessId/confirm-payment`
7. System verifies payment with Stripe and activates subscription

### 2. Upgrade Business Plan
1. Business calls `POST /business/subscriptions/:businessId/upgrade` with `newPaymentPlanId`
2. System verifies current active business subscription exists
3. System creates new payment intent for upgrade
4. System creates new subscription with status 'pending'
5. After payment confirmation, new subscription becomes active
6. Old subscription can be marked as inactive or kept for history

### 3. Boost Plan Usage
1. Business purchases boost plan (24-hour expiration)
2. System tracks daily usage with `boostUsage.currentDay`
3. Business can check availability with `GET /business/subscriptions/:businessId/boost/availability`
4. Business uses boost with `POST /business/subscriptions/:businessId/boost/use`
5. System increments usage and checks daily limits
6. Boost plan automatically expires after 24 hours

## Database Indexes

- Payment plans: `planType`, `isActive`, `stripeProductId`, `stripePriceId`
- Subscriptions: `business`, `subscriptionType`, `stripeCustomerId`, `status`, `expiresAt`

## Notes

- Business plans are lifetime and never expire
- Business plans set daily boost usage limits (maxBoostPerDay)
- Boost plans expire after their validity period and need to be repurchased
- Daily boost limits reset at midnight
- All payments are one-time (no recurring billing)
- Stripe webhooks automatically update subscription status

## Subscription Management

### For Businesses
- View all subscriptions (business and boost plans separately)
- Check active business plan features and limits
- Monitor boost plan usage and expiration
- Upgrade to higher-tier business plans
- Purchase additional boost plans as needed

### For Admins
- Create and manage payment plans
- Monitor all business subscriptions
- View subscription statistics and analytics
- Handle subscription cancellations and reactivations
- Manage Stripe webhook events

## Security Features

- Business authorization middleware ensures only business owners can access their subscriptions
- Stripe payment verification prevents fake payment confirmations
- Subscription status validation prevents unauthorized usage
- Boost usage tracking prevents abuse of daily limits

## Business Logic

- **Business plans** provide permanent access to business features and set daily boost usage limits
- **Boost plans** provide temporary visibility enhancement (they are the boost themselves)
- Both plan types are one-time purchases (no recurring billing)
- Plan types cannot be mixed or converted between each other
- Each plan type serves a distinct business purpose
- Business plans control how many boosts a business can use per day
