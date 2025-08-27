# Payment Plans API Documentation

This document outlines the API endpoints for retrieving payment plans for business subscriptions and boost subscriptions separately.

## Overview

The payment plans API provides three main endpoints to retrieve payment plans:
1. **Business Payment Plans** - For business subscription plans
2. **Boost Payment Plans** - For boost subscription plans  
3. **All Payment Plans** - Combined view of both types

## API Endpoints

### Base URL
```
GET /business/subscription/:businessId/plans/{type}
```

### Authentication
All endpoints require business owner authentication via `authorizedAccessBusiness` middleware.

---

## 1. Get All Business Payment Plans

### Endpoint
```
GET /business/subscription/:businessId/plans/business
```

### Description
Retrieves all active business payment plans along with the current business subscription status and history.

### Parameters
- `businessId` (path parameter): The ID of the business

### Response Format
```json
{
  "success": true,
  "message": "Business payment plans retrieved successfully",
  "data": {
    "plans": [
      {
        "_id": "plan_id",
        "name": "Basic Business Plan",
        "description": "Basic business features",
        "planType": "business",
        "price": 99.99,
        "currency": "USD",
        "features": [
          {
            "name": "Max Businesses",
            "description": "Maximum number of businesses allowed",
            "included": true,
            "limit": 5
          },
          {
            "name": "Max Reviews",
            "description": "Maximum number of reviews allowed",
            "included": true,
            "limit": 1000
          }
        ],
        "stripeProductId": "prod_xxx",
        "stripePriceId": "price_xxx",
        "isActive": true,
        "isPopular": false,
        "sortOrder": 1,
        "maxBusinesses": 5,
        "maxReviews": 1000
      }
    ],
    "currentSubscription": {
      "_id": "subscription_id",
      "business": "business_id",
      "paymentPlan": {
        "_id": "plan_id",
        "name": "Premium Business Plan",
        "planType": "business",
        "price": 199.99,
        "features": [...],
        "maxBusinesses": 10,
        "maxReviews": 5000
      },
      "subscriptionType": "business",
      "status": "active",
      "amount": 199.99,
      "currency": "USD",
      "isLifetime": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "allSubscriptions": [...],
    "totalPlans": 3
  }
}
```

### Use Cases
- Display available business plans for new subscriptions
- Show upgrade options for existing business subscribers
- Compare different business plan features and pricing

---

## 2. Get All Boost Payment Plans

### Endpoint
```
GET /business/subscription/:businessId/plans/boost
```

### Description
Retrieves all active boost payment plans with enhanced information about current boost status, expiration, and purchase availability.

### Parameters
- `businessId` (path parameter): The ID of the business

### Response Format
```json
{
  "success": true,
  "message": "Boost payment plans retrieved successfully",
  "data": {
    "plans": [
      {
        "_id": "plan_id",
        "name": "Daily Boost Plan",
        "description": "Boost your business visibility daily",
        "planType": "boost",
        "price": 9.99,
        "currency": "USD",
        "features": [
          {
            "name": "Daily Boosts",
            "description": "Maximum boosts per day",
            "included": true,
            "limit": 5
          }
        ],
        "stripeProductId": "prod_xxx",
        "stripePriceId": "price_xxx",
        "isActive": true,
        "isPopular": true,
        "sortOrder": 1,
        "maxBoostPerDay": 5,
        "isCurrentlyActive": false,
        "isExpired": false,
        "canPurchase": true
      }
    ],
    "currentSubscription": {
      "_id": "subscription_id",
      "business": "business_id",
      "paymentPlan": {
        "_id": "plan_id",
        "name": "Weekly Boost Plan",
        "planType": "boost",
        "price": 49.99,
        "features": [...],
        "maxBoostPerDay": 10
      },
      "subscriptionType": "boost",
      "status": "active",
      "amount": 49.99,
      "currency": "USD",
      "isLifetime": false,
      "expiresAt": "2024-01-08T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "allSubscriptions": [...],
    "totalPlans": 4,
    "hasActiveBoost": true
  }
}
```

### Enhanced Plan Information
Each boost plan includes additional fields:
- `isCurrentlyActive`: Whether this plan is currently active for the business
- `isExpired`: Whether the current boost subscription has expired
- `canPurchase`: Whether this plan can be purchased (not active or expired)

### Use Cases
- Display available boost plans for purchase
- Show current boost status and expiration
- Prevent duplicate boost purchases
- Display boost usage limits and features

---

## 3. Get All Payment Plans (Combined)

### Endpoint
```
GET /business/subscription/:businessId/plans/all
```

### Description
Retrieves all payment plans (both business and boost) in a structured format with comprehensive subscription information.

### Parameters
- `businessId` (path parameter): The ID of the business

### Response Format
```json
{
  "success": true,
  "message": "All payment plans retrieved successfully",
  "data": {
    "business": {
      "plans": [...],
      "currentSubscription": {...},
      "totalPlans": 3
    },
    "boost": {
      "plans": [...],
      "currentSubscription": {...},
      "totalPlans": 4
    },
    "allSubscriptions": [...],
    "summary": {
      "totalPlans": 7,
      "hasActiveBusinessPlan": true,
      "hasActiveBoostPlan": true
    }
  }
}
```

### Use Cases
- Dashboard overview of all available plans
- Comprehensive subscription management
- Plan comparison across types
- Business status overview

---

## Data Models

### PaymentPlan Schema
```javascript
{
  name: String,                    // Plan name
  description: String,             // Plan description
  planType: String,               // 'business' or 'boost'
  price: Number,                  // Plan price
  currency: String,               // Currency (USD, EUR, GBP)
  features: [Feature],            // Array of features
  stripeProductId: String,        // Stripe product ID
  stripePriceId: String,          // Stripe price ID
  isActive: Boolean,              // Whether plan is active
  isPopular: Boolean,             // Whether plan is marked as popular
  sortOrder: Number,              // Display order
  maxBusinesses: Number,          // Max businesses allowed (business plans)
  maxReviews: Number,             // Max reviews allowed (business plans)
  maxBoostPerDay: Number          // Max boosts per day (boost plans)
}
```

### Feature Schema
```javascript
{
  name: String,                   // Feature name
  description: String,            // Feature description
  included: Boolean,              // Whether feature is included
  limit: Number                   // Feature limit (null = unlimited)
}
```

### Subscription Schema
```javascript
{
  business: ObjectId,             // Business reference
  paymentPlan: ObjectId,          // Payment plan reference
  subscriptionType: String,       // 'business' or 'boost'
  status: String,                 // 'pending', 'active', 'inactive'
  amount: Number,                 // Subscription amount
  currency: String,               // Currency
  isLifetime: Boolean,            // Whether subscription is lifetime
  expiresAt: Date,                // Expiration date (boost plans)
  metadata: Object                // Additional metadata
}
```

---

## Error Responses

### Business Not Found (404)
```json
{
  "success": false,
  "message": "Business not found"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Failed to fetch [type] payment plans",
  "error": "Error details"
}
```

---

## Usage Examples

### Frontend Implementation

#### React Component Example
```jsx
import React, { useState, useEffect } from 'react';

const PaymentPlans = ({ businessId }) => {
  const [businessPlans, setBusinessPlans] = useState([]);
  const [boostPlans, setBoostPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Fetch business plans
        const businessResponse = await fetch(`/business/subscription/${businessId}/plans/business`);
        const businessData = await businessResponse.json();
        
        // Fetch boost plans
        const boostResponse = await fetch(`/business/subscription/${businessId}/plans/boost`);
        const boostData = await boostResponse.json();

        setBusinessPlans(businessData.data.plans);
        setBoostPlans(boostData.data.plans);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [businessId]);

  if (loading) return <div>Loading plans...</div>;

  return (
    <div>
      <h2>Business Plans</h2>
      {businessPlans.map(plan => (
        <div key={plan._id}>
          <h3>{plan.name}</h3>
          <p>${plan.price} {plan.currency}</p>
          <ul>
            {plan.features.map(feature => (
              <li key={feature.name}>
                {feature.name}: {feature.limit || 'Unlimited'}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h2>Boost Plans</h2>
      {boostPlans.map(plan => (
        <div key={plan._id}>
          <h3>{plan.name}</h3>
          <p>${plan.price} {plan.currency}</p>
          <p>Max boosts per day: {plan.maxBoostPerDay}</p>
          {plan.canPurchase && <button>Purchase</button>}
        </div>
      ))}
    </div>
  );
};

export default PaymentPlans;
```

#### JavaScript Fetch Example
```javascript
// Fetch business payment plans
const getBusinessPlans = async (businessId) => {
  try {
    const response = await fetch(`/business/subscription/${businessId}/plans/business`, {
      headers: {
        'Authorization': `Bearer ${businessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Business plans:', data.data.plans);
      console.log('Current subscription:', data.data.currentSubscription);
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error fetching business plans:', error);
    throw error;
  }
};

// Fetch boost payment plans
const getBoostPlans = async (businessId) => {
  try {
    const response = await fetch(`/business/subscription/${businessId}/plans/boost`, {
      headers: {
        'Authorization': `Bearer ${businessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Boost plans:', data.data.plans);
      console.log('Has active boost:', data.data.hasActiveBoost);
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error fetching boost plans:', error);
    throw error;
  }
};
```

---

## Best Practices

### 1. Caching
- Cache payment plans data as they don't change frequently
- Implement cache invalidation when plans are updated

### 2. Error Handling
- Always handle API errors gracefully
- Show user-friendly error messages
- Implement retry logic for failed requests

### 3. Loading States
- Show loading indicators while fetching plans
- Implement skeleton loading for better UX

### 4. Plan Comparison
- Use the structured data to build comparison tables
- Highlight current subscription vs. available plans
- Show upgrade/downgrade paths clearly

### 5. Responsive Design
- Ensure plan displays work on all device sizes
- Use appropriate UI components for different screen sizes

---

## Testing

### Test Cases
1. **Authentication**: Verify unauthorized access is blocked
2. **Business Validation**: Ensure invalid business IDs return 404
3. **Plan Filtering**: Verify only active plans are returned
4. **Subscription Status**: Check current subscription data accuracy
5. **Boost Expiration**: Test expired boost plan handling
6. **Data Population**: Ensure all referenced data is properly populated

### Sample Test Data
```javascript
// Test business
const testBusiness = {
  _id: 'business123',
  businessName: 'Test Business',
  email: 'test@business.com'
};

// Test payment plans
const testBusinessPlan = {
  name: 'Test Business Plan',
  planType: 'business',
  price: 99.99,
  isActive: true
};

const testBoostPlan = {
  name: 'Test Boost Plan',
  planType: 'boost',
  price: 9.99,
  isActive: true,
  maxBoostPerDay: 5
};
```

---

## Conclusion

These API endpoints provide comprehensive access to payment plan information, enabling businesses to:
- View all available subscription options
- Understand current subscription status
- Make informed decisions about upgrades and purchases
- Manage both business and boost subscriptions effectively

The structured responses and enhanced data make it easy to build intuitive user interfaces for subscription management.
