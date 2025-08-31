# Payment Plan System Usage Guide

## Quick Start

### 1. Environment Setup

Ensure you have the following environment variables set in your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
MONGODB_URI=mongodb://localhost:27017/your_database

# Frontend URL (for Stripe redirects)
FRONTEND_URL=http://localhost:3000
```

### 2. Create Payment Plans (Admin)

#### Business Plan Example
```javascript
// Create a business plan via admin API
POST /admin/payment-plans
{
  "name": "Gold Business Plan",
  "description": "Premium business features with daily boost allowance",
  "planType": "business",
  "price": 4999, // $49.99
  "currency": "USD",
  "features": ["query", "review", "embeded"],
  "maxBoostPerDay": 10,
  "isPopular": true
}
```

#### Boost Plan Example
```javascript
// Create a boost plan via admin API
POST /admin/payment-plans
{
  "name": "24-Hour Boost",
  "description": "24-hour visibility boost",
  "planType": "boost",
  "price": 999, // $9.99
  "currency": "USD",
  "validityHours": 24
}
```

### 3. Business Subscription Flow

#### Step 1: Subscribe to Plan
```javascript
// Business subscribes to a payment plan
POST /business/subscriptions/:businessId/subscribe
{
  "paymentPlanId": "plan_id_here"
}

// Response includes payment intent for Stripe
{
  "success": true,
  "data": {
    "paymentIntent": { ... },
    "subscription": { ... },
    "clientSecret": "pi_..."
  }
}
```

#### Step 2: Process Payment (Frontend)
```javascript
// Frontend processes payment using Stripe
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('pk_test_...');
const { error } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'Business Name' }
  }
});

if (error) {
  console.error('Payment failed:', error);
} else {
  // Payment successful, confirm with backend
  await confirmPayment(businessId, paymentIntentId, subscriptionId);
}
```

#### Step 3: Confirm Payment
```javascript
// Confirm payment success with backend
POST /business/subscriptions/:businessId/confirm-payment
{
  "paymentIntentId": "pi_...",
  "subscriptionId": "sub_..."
}

// Response confirms subscription activation
{
  "success": true,
  "data": {
    "subscription": { ... },
    "business": {
      "isBoosted": true,
      "boostExpiryAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

### 4. Boost Management

#### Check Boost Status
```javascript
// Get business boost status
GET /business/subscriptions/:businessId/details

// Response shows current boost status
{
  "success": true,
  "data": {
    "business": {
      "isBoosted": true,
      "boostExpiryAt": "2024-01-15T10:00:00.000Z"
    },
    "subscription": {
      "subscriptionType": "boost",
      "status": "active",
      "expiresAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

#### Handle Boost Expiry
```javascript
// Check and handle boost expiry
POST /business/subscriptions/:businessId/boost/expiry

// Response shows updated status
{
  "success": true,
  "data": {
    "business": {
      "isBoosted": false,
      "boostExpiryAt": null
    }
  }
}
```

### 5. Admin Management

#### Monitor Boost Expiry
```javascript
// Check for expired boosts across all businesses
POST /admin/subscriptions/boost/expiry/check

// Get boost expiry statistics
GET /admin/subscriptions/boost/expiry/stats

// Manually expire a business boost
POST /admin/subscriptions/boost/:businessId/expire
```

#### View Subscription Analytics
```javascript
// Get subscription statistics
GET /admin/subscriptions/stats

// Get business subscription history
GET /admin/subscriptions/business/:businessId
```

## API Reference

### Business Subscription Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/business/subscriptions/:businessId/subscribe` | Subscribe to a payment plan |
| POST | `/business/subscriptions/:businessId/confirm-payment` | Confirm payment success |
| GET | `/business/subscriptions/:businessId/details` | Get subscription details |
| POST | `/business/subscriptions/:businessId/boost/expiry` | Handle boost expiry |

### Admin Subscription Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/subscriptions/boost/expiry/check` | Check all expired boosts |
| GET | `/admin/subscriptions/boost/expiry/stats` | Get boost expiry statistics |
| POST | `/admin/subscriptions/boost/:businessId/expire` | Manually expire boost |

### Payment Plan Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/payment-plans` | Create payment plan |
| GET | `/admin/payment-plans` | List all payment plans |
| PUT | `/admin/payment-plans/:id` | Update payment plan |
| DELETE | `/admin/payment-plans/:id` | Delete payment plan |

## Database Schema

### Business Model Updates
```javascript
{
  // ... existing fields ...
  stripeCustomerId: String,        // Stripe customer ID
  activeSubscriptionId: ObjectId,  // Reference to active subscription
  isBoosted: Boolean,              // Current boost status
  boostExpiryAt: Date             // Boost expiry timestamp
}
```

### Subscription Model
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

## Testing

### Run Test Suite
```bash
# Test the payment plan system
node test-payment-plan-system.js
```

### Test Scenarios
1. **Payment Plan Creation**: Test business and boost plan validation
2. **Subscription Management**: Test subscription creation and updates
3. **Boost Expiry**: Test automatic and manual boost expiry
4. **Business Updates**: Test business model field updates

## Monitoring

### Key Metrics to Track
- Total active subscriptions
- Revenue by plan type
- Boost usage patterns
- Payment success rates
- Feature adoption rates

### Logging
The system logs all important events:
- Payment intent creation
- Payment confirmation
- Subscription status changes
- Boost expiry events
- Error occurrences

## Troubleshooting

### Common Issues

#### Payment Intent Creation Fails
- Check Stripe API key configuration
- Verify payment plan exists and is active
- Ensure business has valid email address

#### Subscription Not Activating
- Verify payment intent status is 'succeeded'
- Check subscription ID matches payment intent
- Ensure business ownership verification

#### Boost Not Expiring
- Check boost expiry service is running
- Verify boost expiry timestamps are set correctly
- Check database indexes for performance

### Debug Endpoints
```javascript
// Get detailed subscription information
GET /business/subscriptions/:businessId/details

// Check boost expiry service status
GET /admin/subscriptions/boost/expiry/stats

// Verify payment intent status
GET /admin/subscriptions/:id/payment-status
```

## Best Practices

### Security
- Always verify business ownership before operations
- Validate payment intent status before confirmation
- Use HTTPS for all API calls
- Implement rate limiting for payment endpoints

### Performance
- Use database indexes for subscription queries
- Implement caching for frequently accessed data
- Batch boost expiry checks for large datasets
- Monitor database query performance

### Error Handling
- Implement comprehensive error logging
- Provide meaningful error messages to users
- Handle Stripe API failures gracefully
- Implement retry logic for transient failures

## Support

For technical support or questions about the payment plan system:
- Check the API documentation
- Review error logs for specific issues
- Test with the provided test suite
- Contact the development team with specific error details
